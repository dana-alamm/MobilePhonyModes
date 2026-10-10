import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, interviewResponses, officialInterviews } from "../db.js";
import { HR_OFFICIAL, LIMITS, techOfficialFor } from "../content.js";
import { requireRole } from "../auth.js";
import { evaluateInterview } from "../ai.js";
import { getProfile, requireUnlocked } from "./student.js";

export const interviewRouter = Router();
interviewRouter.use(requireRole("student"));

type Interview = typeof officialInterviews.$inferSelect;

const QUESTION_WINDOW_MS = (LIMITS.initiationSeconds + LIMITS.answerSeconds + LIMITS.questionGraceSeconds) * 1000;

// Sends the captured transcript text to OpenAI and stores the result. Failures are stored visibly (no fake fallback feedback).
async function runEvaluation(iv: Interview) {
  const rows = await db.select().from(interviewResponses).where(eq(interviewResponses.interviewId, iv.id)).orderBy(asc(interviewResponses.idx));
  const responses = iv.questions.map((question, i) => {
    const r = rows.find((x) => x.idx === i);
    return { question, transcript: r && !r.skipped ? (r.transcript ?? "") : "", inputMode: r?.inputMode ?? "none" };
  });
  if (responses.every((r) => r.transcript.trim() === "")) {
    await db.update(officialInterviews).set({
      score: 0, feedbackType: "none", evalStatus: "none", evalError: null,
      summary: "No answers were captured in this interview. No evaluation could be produced.",
    }).where(eq(officialInterviews.id, iv.id));
    return;
  }
  const result = await evaluateInterview({ stage: iv.stage as "hr" | "tech", skill: iv.track, responses });
  if (result.ok) {
    await db.update(officialInterviews).set({
      score: result.score, summary: result.summary, feedbackType: `ai_${result.model}`, evalStatus: "done", evalError: null,
    }).where(eq(officialInterviews.id, iv.id));
  } else {
    await db.update(officialInterviews).set({ evalStatus: "failed", evalError: result.error }).where(eq(officialInterviews.id, iv.id));
  }
}

async function finalize(iv: Interview, expired: boolean) {
  const [won] = await db.update(officialInterviews)
    .set({ status: expired ? "expired" : "completed", completedAt: new Date(), evalStatus: "pending" })
    .where(and(eq(officialInterviews.id, iv.id), eq(officialInterviews.status, "in_progress")))
    .returning();
  if (won) await runEvaluation(won);
  return (await db.select().from(officialInterviews).where(eq(officialInterviews.id, iv.id)))[0];
}

// Builds the current interview state. All timing decisions are made here, on the server.
async function currentState(ivIn: Interview) {
  let iv = ivIn;
  // An evaluation that never finished (e.g. server restart) is surfaced as failed so it can be retried.
  if (iv.evalStatus === "pending" && iv.completedAt && Date.now() - iv.completedAt.getTime() > 90_000) {
    [iv] = await db.update(officialInterviews)
      .set({ evalStatus: "failed", evalError: "The AI evaluation did not finish." })
      .where(and(eq(officialInterviews.id, iv.id), eq(officialInterviews.evalStatus, "pending"))).returning()
      .then((r) => (r.length ? r : [iv]));
  }
  for (let guard = 0; guard < 20; guard++) {
    if (iv.status !== "in_progress") break;
    if (Date.now() >= iv.deadlineAt.getTime()) {
      iv = await finalize(iv, true);
      break;
    }
    const rows = await db.select().from(interviewResponses).where(eq(interviewResponses.interviewId, iv.id)).orderBy(asc(interviewResponses.idx));
    const answered = rows.filter((r) => r.answeredAt).length;
    if (answered >= iv.questions.length) {
      iv = await finalize(iv, false);
      break;
    }
    let cur = rows.find((r) => r.idx === answered);
    if (!cur) {
      [cur] = await db.insert(interviewResponses)
        .values({ interviewId: iv.id, idx: answered, question: iv.questions[answered] })
        .onConflictDoNothing().returning();
      if (!cur) continue;
    }
    // A question left unanswered past its window (e.g. the tab was closed) is recorded as timed out.
    if (Date.now() - cur.presentedAt.getTime() > QUESTION_WINDOW_MS) {
      await db.update(interviewResponses)
        .set({ answeredAt: new Date(), skipped: true, inputMode: "none", transcript: "", answerSeconds: 0 })
        .where(eq(interviewResponses.id, cur.id));
      continue;
    }
    return {
      id: iv.id, stage: iv.stage, track: iv.track, status: iv.status,
      total: iv.questions.length, currentIdx: answered, question: cur.question,
      repeatCount: cur.repeatCount, maxRepeats: LIMITS.maxRepeatsPerQuestion,
      presentedAgoMs: Date.now() - cur.presentedAt.getTime(),
      startedAt: iv.startedAt, deadlineAt: iv.deadlineAt, serverNow: new Date(),
      limits: { initiationSeconds: LIMITS.initiationSeconds, answerSeconds: LIMITS.answerSeconds },
    };
  }
  return {
    id: iv.id, stage: iv.stage, track: iv.track, status: iv.status, total: iv.questions.length,
    currentIdx: iv.questions.length, question: null as string | null,
    startedAt: iv.startedAt, deadlineAt: iv.deadlineAt, serverNow: new Date(),
    score: iv.score, summary: iv.summary, feedbackType: iv.feedbackType,
    evalStatus: iv.evalStatus, evalError: iv.evalError,
  };
}

interviewRouter.post("/:stage/start", async (req, res) => {
  const stage = req.params.stage;
  if (stage !== "hr" && stage !== "tech") return res.status(404).json({ error: "Unknown interview stage." });
  const userId = req.user!.id;
  const profile = await getProfile(userId);
  const unlocked = await requireUnlocked(userId, profile.officialTrack);
  if (!unlocked.ok) return res.status(403).json({ error: unlocked.error });
  const track = profile.officialTrack as string;

  const all = await db.select().from(officialInterviews).where(eq(officialInterviews.userId, userId));
  let iv = all.find((o) => o.stage === stage);
  if (!iv) {
    if (stage === "tech") {
      const hr = all.find((o) => o.stage === "hr");
      if (!hr || hr.status === "in_progress") {
        return res.status(403).json({ error: "Finish the HR interview before the technical interview." });
      }
    }
    const minutes = stage === "hr" ? LIMITS.hrMinutes : LIMITS.techMinutes;
    const questions = stage === "hr" ? HR_OFFICIAL : techOfficialFor(track);
    [iv] = await db.insert(officialInterviews).values({
      userId, stage, track, questions, deadlineAt: new Date(Date.now() + minutes * 60_000),
    }).onConflictDoNothing().returning();
    if (!iv) iv = (await db.select().from(officialInterviews).where(and(eq(officialInterviews.userId, userId), eq(officialInterviews.stage, stage))))[0];
  }
  res.json(await currentState(iv));
});

async function ownInterview(userId: number, id: number) {
  const [iv] = await db.select().from(officialInterviews).where(and(eq(officialInterviews.id, id), eq(officialInterviews.userId, userId)));
  return iv;
}

interviewRouter.post("/:id/repeat", async (req, res) => {
  const iv = await ownInterview(req.user!.id, Number(req.params.id));
  if (!iv) return res.status(404).json({ error: "Interview not found." });
  const state = await currentState(iv);
  if (state.status !== "in_progress" || state.question === null) return res.status(409).json({ error: "This interview is no longer accepting actions.", state });
  const [cur] = await db.update(interviewResponses)
    .set({ repeatCount: 1 })
    .where(and(
      eq(interviewResponses.interviewId, iv.id),
      eq(interviewResponses.idx, state.currentIdx),
      eq(interviewResponses.repeatCount, 0),
    ))
    .returning();
  if (!cur) return res.status(409).json({ error: "You can only repeat each question once." });
  res.json({ ok: true, question: cur.question });
});

const answerBody = z.object({
  idx: z.number().int().min(0),
  transcript: z.string().max(6000).default(""),
  inputMode: z.enum(["voice", "typed", "none"]),
  skipped: z.boolean(),
  answerSeconds: z.number().min(0).max(120),
});

interviewRouter.post("/:id/answer", async (req, res) => {
  const body = answerBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid answer payload." });
  const iv = await ownInterview(req.user!.id, Number(req.params.id));
  if (!iv) return res.status(404).json({ error: "Interview not found." });

  const state = await currentState(iv);
  if (state.status !== "in_progress") {
    return res.status(409).json({ error: "The interview time limit has passed. Your answers so far were saved.", state });
  }
  if (state.currentIdx !== body.data.idx || state.question === null) {
    return res.status(409).json({ error: "That question is no longer active.", state });
  }

  const [cur] = await db.select().from(interviewResponses)
    .where(and(eq(interviewResponses.interviewId, iv.id), eq(interviewResponses.idx, body.data.idx)));
  const elapsed = Date.now() - cur.presentedAt.getTime();
  // Server-side limits: answers older than the allowed window, or longer than 60s, are not accepted.
  const tooLate = elapsed > QUESTION_WINDOW_MS;
  const skipped = body.data.skipped || tooLate || body.data.transcript.trim() === "";
  const seconds = Math.min(Math.round(body.data.answerSeconds), LIMITS.answerSeconds);

  await db.update(interviewResponses).set({
    answeredAt: new Date(),
    skipped,
    transcript: skipped ? "" : body.data.transcript.trim(),
    inputMode: skipped ? "none" : body.data.inputMode,
    answerSeconds: skipped ? 0 : seconds,
  }).where(and(eq(interviewResponses.id, cur.id), isNull(interviewResponses.answeredAt)));
  res.json(await currentState(iv));
});

interviewRouter.post("/:id/evaluate", async (req, res) => {
  const iv = await ownInterview(req.user!.id, Number(req.params.id));
  if (!iv) return res.status(404).json({ error: "Interview not found." });
  const [won] = await db.update(officialInterviews)
    .set({ evalStatus: "pending", evalError: null, completedAt: new Date() })
    .where(and(eq(officialInterviews.id, iv.id), eq(officialInterviews.evalStatus, "failed")))
    .returning();
  if (!won) return res.status(409).json({ error: "This interview does not need a new evaluation." });
  await runEvaluation(won);
  const [fresh] = await db.select().from(officialInterviews).where(eq(officialInterviews.id, iv.id));
  res.json(await currentState(fresh));
});

interviewRouter.get("/:id", async (req, res) => {
  const iv = await ownInterview(req.user!.id, Number(req.params.id));
  if (!iv) return res.status(404).json({ error: "Interview not found." });
  res.json(await currentState(iv));
});
