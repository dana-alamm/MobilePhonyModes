import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, assessmentAttempts, assessments, invites, messages, officialInterviews, payments, practiceSessions, studentProfiles, users } from "../db.js";
import {
  DEFAULT_SKILL, HR_PRACTICE, LIMITS, SKILL_GROUPS, assessmentFor, bankOf, isSkill, recommendationsFor, techPracticeFor,
} from "../content.js";
import { requireRole } from "../auth.js";
import { threadFor } from "../chat.js";

export const studentRouter = Router();
studentRouter.use(requireRole("student"));

const isTrack = isSkill;

export async function getProfile(userId: number) {
  const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  if (p) {
    if (p.selectedTracks.length > 0) return p;
    const [fixed] = await db.update(studentProfiles).set({ selectedTracks: [DEFAULT_SKILL], updatedAt: new Date() }).where(eq(studentProfiles.userId, userId)).returning();
    return fixed;
  }
  const [created] = await db.insert(studentProfiles).values({ userId, selectedTracks: [DEFAULT_SKILL] }).returning();
  return created;
}

export async function practiceAllowance(userId: number) {
  const sessions = await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId));
  const paid = await db.select().from(payments).where(eq(payments.userId, userId));
  const allowed = LIMITS.freePracticeSessions + paid.length;
  const used = sessions.length;
  return { used, allowed, remaining: Math.max(0, allowed - used), freeLimit: LIMITS.freePracticeSessions };
}

// Official track = highest score among selected tracks; ties go to the role the student listed first.
async function resolveOfficialTrack(userId: number) {
  const profile = await getProfile(userId);
  const rows = await db.select().from(assessments).where(eq(assessments.userId, userId));
  const done = profile.selectedTracks.map((t) => rows.find((r) => r.track === t && r.completedAt));
  if (profile.selectedTracks.length === 0 || done.some((d) => !d)) return null;
  let best = done[0]!;
  for (const d of done) if ((d!.score ?? 0) > (best.score ?? 0)) best = d!;
  return best.track;
}

studentRouter.get("/state", async (req, res) => {
  const userId = req.user!.id;
  const profile = await getProfile(userId);
  const rows = await db.select().from(assessments).where(eq(assessments.userId, userId));
  const official = await db.select().from(officialInterviews).where(eq(officialInterviews.userId, userId));
  const sessions = await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId)).orderBy(desc(practiceSessions.id));

  const inviteRows = await db.select({ id: invites.id, createdAt: invites.createdAt, company: users.name })
    .from(invites).innerJoin(users, eq(users.id, invites.companyId)).where(eq(invites.studentId, userId)).orderBy(desc(invites.id));
  const sentInvites = inviteRows.map((i) => ({ id: i.id, company: i.company, createdAt: i.createdAt }));

  const assessmentView = profile.selectedTracks.map((track) => {
    const r = rows.find((x) => x.track === track);
    return {
      track,
      status: !r ? "not_started" : r.completedAt ? "completed" : "in_progress",
      score: r?.completedAt ? r.score : null,
      passed: r?.completedAt ? r.passed : null,
      attempts: r?.attempts ?? 0,
      questionSet: bankOf(track),
      // Retake is available only after the student confirms they reviewed the materials.
      canRetake: !!profile.reviewConfirmedAt && !!r?.completedAt && (r.score ?? 0) < LIMITS.passMark,
    };
  });
  const allDone = assessmentView.length > 0 && assessmentView.every((a) => a.status === "completed");
  const officialTrack = allDone ? profile.officialTrack : null;
  const officialRow = assessmentView.find((a) => a.track === officialTrack);
  const passed = !!officialRow && (officialRow.score ?? 0) >= LIMITS.passMark;

  res.json({
    user: { id: userId, name: req.user!.name },
    skillGroups: SKILL_GROUPS,
    reviewConfirmed: !!profile.reviewConfirmedAt,
    invites: sentInvites,
    selectedTracks: profile.selectedTracks,
    assessments: assessmentView,
    allAssessmentsDone: allDone,
    officialTrack,
    officialScore: officialRow?.score ?? null,
    passed,
    passMark: LIMITS.passMark,
    recommendations: allDone && !passed && officialTrack ? recommendationsFor(officialTrack) : [],
    practice: {
      ...(await practiceAllowance(userId)),
      priceJod: LIMITS.priceJod,
      sessions: sessions.map((s) => ({ id: s.id, status: s.status, startedAt: s.startedAt, completedAt: s.completedAt })),
    },
    official: ["hr", "tech"].map((stage) => {
      const iv = official.find((o) => o.stage === stage);
      return {
        stage,
        status: iv ? iv.status : "not_started",
        score: iv?.score ?? null,
        summary: iv?.summary ?? null,
        feedbackType: iv?.feedbackType ?? null,
        evalStatus: iv?.evalStatus ?? null,
      };
    }),
  });
});

studentRouter.put("/tracks", async (req, res) => {
  const body = z.object({ tracks: z.array(z.string()).min(1).max(2) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Choose one or two skills." });
  const tracks = [...new Set(body.data.tracks)];
  if (!tracks.every(isTrack)) return res.status(400).json({ error: "Choose skills from the list." });
  const userId = req.user!.id;
  const existing = await db.select().from(assessments).where(eq(assessments.userId, userId));
  if (existing.length > 0) {
    return res.status(409).json({ error: "Skills are locked once an assessment has been started." });
  }
  await getProfile(userId);
  await db.update(studentProfiles).set({ selectedTracks: tracks, officialTrack: null, updatedAt: new Date() }).where(eq(studentProfiles.userId, userId));
  res.json({ ok: true });
});

// ---------- Assessments (text only, graded on the server) ----------

studentRouter.post("/assessments/:track/start", async (req, res) => {
  const track = req.params.track;
  const userId = req.user!.id;
  if (!isTrack(track)) return res.status(404).json({ error: "Unknown skill." });
  const profile = await getProfile(userId);
  if (!profile.selectedTracks.includes(track)) return res.status(403).json({ error: "You did not select this skill." });

  let [row] = await db.select().from(assessments).where(and(eq(assessments.userId, userId), eq(assessments.track, track)));
  if (row?.completedAt) return res.status(409).json({ error: "This assessment is already completed and can only be retaken after reviewing the recommended materials." });
  if (!row) {
    [row] = await db.insert(assessments).values({ userId, track }).onConflictDoNothing().returning();
    if (!row) [row] = await db.select().from(assessments).where(and(eq(assessments.userId, userId), eq(assessments.track, track)));
  }
  const deadline = new Date(row.startedAt.getTime() + LIMITS.assessmentMinutes * 60_000);
  res.json({
    track,
    startedAt: row.startedAt,
    deadlineAt: deadline,
    serverNow: new Date(),
    questionSet: bankOf(track),
    questions: assessmentFor(track).map((q) => ({ q: q.q, options: q.options })),
  });
});

studentRouter.post("/assessments/:track/submit", async (req, res) => {
  const track = req.params.track;
  const userId = req.user!.id;
  if (!isTrack(track)) return res.status(404).json({ error: "Unknown skill." });
  const bank = assessmentFor(track);
  const body = z.object({ answers: z.array(z.number().int().min(-1).max(3)).length(bank.length) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Submit exactly one answer slot per question." });

  const [row] = await db.select().from(assessments).where(and(eq(assessments.userId, userId), eq(assessments.track, track)));
  if (!row) return res.status(409).json({ error: "Start the assessment first." });
  if (row.completedAt) return res.status(409).json({ error: "This assessment was already submitted." });

  // Late submissions (after the timer + grace) are scored only on answers the client holds, but never extend time:
  // answers are accepted once; the score is computed here, never trusted from the client.
  const late = Date.now() > row.startedAt.getTime() + (LIMITS.assessmentMinutes * 60 + LIMITS.assessmentGraceSeconds) * 1000;
  const score = late ? 0 : body.data.answers.reduce((n, a, i) => n + (a === bank[i].answer ? 1 : 0), 0);
  const passed = score >= LIMITS.passMark;

  const updated = await db.update(assessments)
    .set({ answers: body.data.answers, score, passed, completedAt: new Date(), attempts: row.attempts + 1 })
    .where(and(eq(assessments.id, row.id), eq(assessments.userId, userId)))
    .returning();
  if (updated.length === 0) return res.status(409).json({ error: "Already submitted." });

  await db.insert(assessmentAttempts).values({ userId, track, score, passed });
  const official = await resolveOfficialTrack(userId);
  // The review confirmation is consumed once every assessment has a result again.
  if (official) await db.update(studentProfiles).set({ officialTrack: official, reviewConfirmedAt: null, updatedAt: new Date() }).where(eq(studentProfiles.userId, userId));
  res.json({ score, total: bank.length, passed, passMark: LIMITS.passMark, late });
});

// Skill-based retake: confirm review of the recommended materials, then reset the failed assessment.
studentRouter.post("/review-confirm", async (req, res) => {
  const userId = req.user!.id;
  const profile = await getProfile(userId);
  const official = await resolveOfficialTrack(userId);
  if (!official) return res.status(409).json({ error: "Finish your assessments first." });
  const unlocked = await requireUnlocked(userId, official);
  if (unlocked.ok) return res.status(409).json({ error: "You already passed, so no retake is needed." });
  if (!profile.reviewConfirmedAt) {
    await db.update(studentProfiles).set({ reviewConfirmedAt: new Date() }).where(eq(studentProfiles.userId, userId));
  }
  res.json({ ok: true });
});

studentRouter.post("/assessments/:track/retake", async (req, res) => {
  const track = req.params.track;
  const userId = req.user!.id;
  if (!isTrack(track)) return res.status(404).json({ error: "Unknown skill." });
  const profile = await getProfile(userId);
  if (!profile.selectedTracks.includes(track)) return res.status(403).json({ error: "You did not select this skill." });
  if (!profile.reviewConfirmedAt) return res.status(403).json({ error: "Confirm that you reviewed the recommended materials first." });
  const [row] = await db.select().from(assessments).where(and(eq(assessments.userId, userId), eq(assessments.track, track)));
  if (!row?.completedAt || (row.score ?? 0) >= LIMITS.passMark) return res.status(409).json({ error: "This assessment does not need a retake." });

  await db.update(assessments)
    .set({ answers: null, score: null, passed: null, completedAt: null, startedAt: new Date() })
    .where(and(eq(assessments.id, row.id), eq(assessments.userId, userId)));
  await db.update(studentProfiles).set({ officialTrack: null, updatedAt: new Date() }).where(eq(studentProfiles.userId, userId));
  res.json({ ok: true });
});

// ---------- Practice interviews ----------

studentRouter.post("/practice/start", async (req, res) => {
  const userId = req.user!.id;
  const profile = await getProfile(userId);
  const state = await requireUnlocked(userId, profile.officialTrack);
  if (!state.ok) return res.status(403).json({ error: state.error });

  const [open] = await db.select().from(practiceSessions).where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.status, "in_progress")));
  if (open && open.deadlineAt.getTime() > Date.now()) {
    return res.json(practiceView(open));
  }
  if (open) await db.update(practiceSessions).set({ status: "expired" }).where(eq(practiceSessions.id, open.id));

  const allowance = await practiceAllowance(userId);
  if (allowance.remaining <= 0) return res.status(402).json({ error: "No practice sessions left. Unlock one more with the simulated payment." });

  const track = profile.officialTrack as string;
  const questions = [...HR_PRACTICE, ...techPracticeFor(track)];
  const [session] = await db.insert(practiceSessions).values({
    userId, track, questions,
    deadlineAt: new Date(Date.now() + LIMITS.practiceMinutes * 60_000),
  }).returning();
  res.json(practiceView(session));
});

function practiceView(s: typeof practiceSessions.$inferSelect) {
  return { id: s.id, track: s.track, questions: s.questions, deadlineAt: s.deadlineAt, serverNow: new Date() };
}

const practiceBody = z.object({
  responses: z.array(z.object({
    transcript: z.string().max(5000),
    inputMode: z.enum(["voice", "typed", "none"]),
    skipped: z.boolean(),
    answerSeconds: z.number().min(0).max(LIMITS.answerSeconds),
  })),
});

studentRouter.post("/practice/:id/complete", async (req, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const body = practiceBody.safeParse(req.body);
  if (!body.success || !Number.isInteger(id)) return res.status(400).json({ error: "Invalid practice submission." });
  const [s] = await db.select().from(practiceSessions).where(and(eq(practiceSessions.id, id), eq(practiceSessions.userId, userId)));
  if (!s) return res.status(404).json({ error: "Practice session not found." });
  if (s.status !== "in_progress") return res.status(409).json({ error: "This practice session is already finished." });
  const expired = Date.now() > s.deadlineAt.getTime() + LIMITS.questionGraceSeconds * 1000;
  const responses = s.questions.map((question, i) => {
    const r = body.data.responses[i];
    return r && !expired
      ? { question, ...r, transcript: r.skipped ? "" : r.transcript }
      : { question, transcript: "", inputMode: "none" as const, skipped: true, answerSeconds: 0 };
  });
  await db.update(practiceSessions)
    .set({ responses, status: expired ? "expired" : "completed", completedAt: new Date() })
    .where(eq(practiceSessions.id, id));
  res.json({ ok: true, expired, responses });
});

// ---------- Simulated payment ----------

studentRouter.post("/payments/mock", async (req, res) => {
  const userId = req.user!.id;
  const body = z.object({ idempotencyKey: z.string().min(8).max(100) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Missing payment key." });
  const key = `${userId}:${body.data.idempotencyKey}`;

  const existing = await db.select().from(payments).where(eq(payments.idempotencyKey, key));
  if (existing.length) return res.json({ ok: true, duplicate: true, message: "Payment Successful (already recorded)." });

  const profile = await getProfile(userId);
  const unlocked = await requireUnlocked(userId, profile.officialTrack);
  if (!unlocked.ok) return res.status(403).json({ error: unlocked.error });
  const allowance = await practiceAllowance(userId);
  if (allowance.remaining > 0) return res.status(409).json({ error: "You still have practice sessions available." });

  await db.insert(payments).values({
    userId, amountJod: LIMITS.priceJod, status: "simulated_success", idempotencyKey: key,
  }).onConflictDoNothing();
  res.json({ ok: true, message: "Payment Successful (simulated). One more practice session unlocked." });
});

export async function requireUnlocked(userId: number, officialTrack: string | null) {
  if (!officialTrack) return { ok: false as const, error: "Complete your assessments first." };
  const rows = await db.select().from(assessments).where(and(eq(assessments.userId, userId), eq(assessments.track, officialTrack)));
  const a = rows[0];
  if (!a?.completedAt || (a.score ?? 0) < LIMITS.passMark) {
    return { ok: false as const, error: "You need at least 5/10 in your assessment to unlock interviews." };
  }
  return { ok: true as const };
}

// ---- Messages (invite chat). Stored in the database; no real-time delivery. ----
studentRouter.get("/invites", async (req, res) => {
  const rows = await db.select({ id: invites.id, createdAt: invites.createdAt, company: users.name })
    .from(invites).innerJoin(users, eq(users.id, invites.companyId)).where(eq(invites.studentId, req.user!.id)).orderBy(desc(invites.id));
  res.json({ invites: rows });
});

async function ownInvite(userId: number, id: number) {
  if (!Number.isInteger(id)) return null;
  const [row] = await db.select({ id: invites.id, company: users.name })
    .from(invites).innerJoin(users, eq(users.id, invites.companyId))
    .where(and(eq(invites.id, id), eq(invites.studentId, userId)));
  return row ?? null;
}

studentRouter.get("/invites/:id/messages", async (req, res) => {
  const inv = await ownInvite(req.user!.id, Number(req.params.id));
  if (!inv) return res.status(404).json({ error: "Conversation not found." });
  res.json({ company: inv.company, messages: await threadFor(inv.id) });
});

studentRouter.post("/invites/:id/messages", async (req, res) => {
  const inv = await ownInvite(req.user!.id, Number(req.params.id));
  if (!inv) return res.status(404).json({ error: "Conversation not found." });
  const parsed = z.object({ body: z.string().trim().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message must be 1 to 1000 characters." });
  const [row] = await db.insert(messages).values({ inviteId: inv.id, sender: "student", body: parsed.data.body }).returning();
  res.json({ message: row });
});
