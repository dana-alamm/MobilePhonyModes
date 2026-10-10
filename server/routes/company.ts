import { Router, type NextFunction, type Request, type Response } from "express";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, assessments, invites, officialInterviews, studentProfiles, users } from "../db.js";
import { LIMITS, SKILL_GROUPS, isSkill } from "../content.js";
import { requireRole } from "../auth.js";
import { publicUser } from "./auth.js";

export const companyRouter = Router();
companyRouter.use(requireRole("company"));

// Mock plans. No payment gateway is involved anywhere.
export const PLANS = [
  { id: "basic", name: "Basic", priceJod: 10, features: ["Browse verified candidates", "Filter by skill and score", "View assessment scores and interview evaluations", `Up to ${LIMITS.basicInviteLimit} interview invites`] },
  { id: "premium", name: "Premium", priceJod: 25, features: ["Everything in Basic", "Unlimited interview invites", "Priority access to new candidates"] },
] as const;

export const INVITE_MESSAGE =
  "We are impressed by your verified assessment and voice interview results. We would like to schedule a formal interview.";

companyRouter.get("/subscription", (req, res) => {
  res.json({ user: publicUser(req.user!), plans: PLANS });
});

companyRouter.post("/subscribe", async (req, res) => {
  const body = z.object({ plan: z.enum(["basic", "premium"]) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Choose a plan." });
  const [u] = await db.update(users)
    .set({ subscriptionPlan: body.data.plan, subscriptionStatus: "active", subscribedAt: new Date() })
    .where(eq(users.id, req.user!.id)).returning();
  res.json({ ok: true, user: publicUser(u) });
});

// Everything below requires an active (simulated) subscription.
function requireSubscription(req: Request, res: Response, next: NextFunction) {
  if (req.user!.subscriptionStatus !== "active") {
    return res.status(402).json({ error: "Choose a plan to access candidates.", code: "subscription_required" });
  }
  next();
}
companyRouter.use(requireSubscription);

async function loadCandidates() {
  const profiles = await db.select().from(studentProfiles);
  const people = await db.select().from(users).where(eq(users.role, "student"));
  const rows = await db.select().from(assessments);
  const interviews = await db.select().from(officialInterviews);

  return profiles.flatMap((p) => {
    if (!p.officialTrack) return [];
    const user = people.find((u) => u.id === p.userId);
    if (!user) return [];
    const mine = rows.filter((r) => r.userId === p.userId && r.completedAt);
    const official = mine.find((r) => r.track === p.officialTrack);
    // Only candidates who passed their assessment are listed to companies.
    if (!official || (official.score ?? 0) < LIMITS.passMark) return [];
    const hr = interviews.find((i) => i.userId === p.userId && i.stage === "hr");
    const tech = interviews.find((i) => i.userId === p.userId && i.stage === "tech");
    const view = (i: typeof hr) => i ? {
      status: i.status, score: i.score, summary: i.summary, feedbackType: i.feedbackType, evalStatus: i.evalStatus,
    } : null;
    return [{
      id: user.id,
      name: user.name,
      isSample: user.isSample,
      officialTrack: p.officialTrack,
      assessmentScore: official.score ?? 0,
      assessments: mine.map((r) => ({ track: r.track, score: r.score, passed: r.passed })),
      hr: view(hr),
      tech: view(tech),
    }];
  });
}

companyRouter.get("/candidates", async (req, res) => {
  const track = typeof req.query.track === "string" ? req.query.track : "";
  const minScore = Number(req.query.minScore ?? 0) || 0;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "score_desc";

  let list = await loadCandidates();
  if (track && isSkill(track)) list = list.filter((c) => c.officialTrack === track);
  list = list.filter((c) => c.assessmentScore >= minScore);
  if (q) {
    list = list.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.officialTrack.toLowerCase().includes(q) ||
      (c.tech?.summary ?? "").toLowerCase().includes(q) ||
      (c.hr?.summary ?? "").toLowerCase().includes(q));
  }
  list.sort((a, b) =>
    sort === "score_asc" ? a.assessmentScore - b.assessmentScore
    : sort === "name" ? a.name.localeCompare(b.name)
    : b.assessmentScore - a.assessmentScore);

  const sent = await db.select({ studentId: invites.studentId }).from(invites).where(eq(invites.companyId, req.user!.id));
  res.json({
    skillGroups: SKILL_GROUPS,
    candidates: list.map(({ hr, tech, ...c }) => ({
      ...c,
      invited: sent.some((s) => s.studentId === c.id),
      hrStatus: hr?.status ?? "not_started",
      techStatus: tech?.status ?? "not_started",
      techScore: tech?.score ?? null,
    })),
  });
});

async function inviteState(companyId: number, studentId: number) {
  const [row] = await db.select({ id: invites.id }).from(invites).where(and(eq(invites.companyId, companyId), eq(invites.studentId, studentId)));
  return !!row;
}

companyRouter.get("/candidates/:id", async (req, res) => {
  const id = Number(req.params.id);
  const c = (await loadCandidates()).find((x) => x.id === id);
  if (!c) return res.status(404).json({ error: "Candidate not found." });
  // Transcripts and contact details are intentionally not exposed to companies.
  res.json({ candidate: { ...c, invited: await inviteState(req.user!.id, id) }, passMark: LIMITS.passMark, inviteMessage: INVITE_MESSAGE });
});

// Mock invite: stores a record only. Nothing is emailed or delivered in real time.
companyRouter.post("/candidates/:id/invite", async (req, res) => {
  const id = Number(req.params.id);
  const c = (await loadCandidates()).find((x) => x.id === id);
  if (!c) return res.status(404).json({ error: "Candidate not found." });
  const companyId = req.user!.id;
  if (await inviteState(companyId, id)) return res.json({ ok: true, duplicate: true });

  if (req.user!.subscriptionPlan !== "premium") {
    const [{ n }] = await db.select({ n: count() }).from(invites).where(eq(invites.companyId, companyId));
    if (n >= LIMITS.basicInviteLimit) {
      return res.status(403).json({ error: `The Basic plan includes ${LIMITS.basicInviteLimit} invites. Upgrade to Premium for unlimited invites.` });
    }
  }
  await db.insert(invites).values({ companyId, studentId: id, message: INVITE_MESSAGE }).onConflictDoNothing();
  res.json({ ok: true });
});
