import { z } from "zod";

export const AI_MODEL = "gpt-4o-mini";

export interface EvalInput {
  stage: "hr" | "tech";
  skill: string;
  responses: { question: string; transcript: string; inputMode: string }[];
}
export type EvalResult = { ok: true; score: number; summary: string } | { ok: false; error: string };

const resultSchema = z.object({ score: z.number().min(0).max(10), summary: z.string().trim().min(10) });

const SYSTEM_PROMPT = `You are an expert Technical Recruiter evaluating a junior IT candidate's interview answers.
Judge the answers on (1) accuracy and relevance to the questions and (2) communication clarity.
Answers may be in English, Arabic, or a mix of both, and may contain speech-recognition errors; evaluate the meaning, not spelling or language choice.
Unanswered questions are marked "(no answer)" and should lower the score.
Return ONLY a JSON object with exactly two keys:
"score": a number from 0 to 10 (10 = excellent), and
"summary": a professional feedback summary of exactly 2 sentences, written in English.`;

// Only question text and answer transcripts are sent. No name, email or audio.
export async function evaluateInterview(input: EvalInput): Promise<EvalResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "AI evaluation is unavailable because the OpenAI API key is not configured." };

  const transcript = input.responses
    .map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.transcript.trim() || "(no answer)"}`)
    .join("\n\n");
  const user = `Interview type: ${input.stage === "hr" ? "HR / behavioral" : "Technical"}\nCandidate skill area: ${input.skill}\n\n${transcript}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      console.error("OpenAI error status", res.status);
      if (res.status === 401) return { ok: false, error: "OpenAI rejected the API key." };
      if (res.status === 429) return { ok: false, error: "OpenAI rate limit or quota reached." };
      return { ok: false, error: `OpenAI request failed (status ${res.status}).` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "OpenAI returned an empty response." };
    const parsed = resultSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return { ok: false, error: "OpenAI returned an invalid evaluation format." };
    const sentences = parsed.data.summary.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    return { ok: true, score: Math.round(parsed.data.score), summary: sentences };
  } catch (e) {
    console.error("OpenAI call failed", e instanceof Error ? e.name : "error");
    return { ok: false, error: e instanceof Error && e.name === "AbortError" ? "The AI evaluation timed out." : "The AI evaluation could not be completed." };
  } finally {
    clearTimeout(timer);
  }
}
