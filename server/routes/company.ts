import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, assessments, officialInterviews, studentProfiles, users } from "../db.js";
import { LIMITS, TRACKS } from "../content.js";
import { requireRole } from "../auth.js";

export const companyRouter = Router();
companyRouter.use(requireRole("company"));

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
    return [{
      id: user.id,
      name: user.name,
      isSample: user.isSample,
      officialTrack: p.officialTrack,
      assessmentScore: official.score ?? 0,
      assessments: mine.map((r) => ({ track: r.track, score: r.score, passed: r.passed })),
      hr: hr ? { status: hr.status, score: hr.score, summary: hr.summary } : null,
      tech: tech ? { status: tech.status, score: tech.score, summary: tech.summary } : null,
    }];
  });
}

companyRouter.get("/candidates", async (req, res) => {
  const track = typeof req.query.track === "string" ? req.query.track : "";
  const minScore = Number(req.query.minScore ?? 0) || 0;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "score_desc";

  let list = await loadCandidates();
  if (track && (TRACKS as readonly string[]).includes(track)) list = list.filter((c) => c.officialTrack === track);
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

  // List view omits long summaries.
  res.json({
    tracks: TRACKS,
    candidates: list.map(({ hr, tech, ...c }) => ({
      ...c,
      hrStatus: hr?.status ?? "not_started",
      techStatus: tech?.status ?? "not_started",
      techScore: tech?.score ?? null,
    })),
  });
});

companyRouter.get("/candidates/:id", async (req, res) => {
  const id = Number(req.params.id);
  const c = (await loadCandidates()).find((x) => x.id === id);
  if (!c) return res.status(404).json({ error: "Candidate not found." });
  // Transcripts and contact details are intentionally not exposed to companies.
  res.json({ candidate: c, passMark: LIMITS.passMark });
});
