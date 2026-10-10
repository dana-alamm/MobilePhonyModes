import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// gemini-1.5-flash and 2.5-flash return 404 for this API key (retired for new users), so current flash models are used.
// If one is overloaded (503) or unavailable (404), the next is tried.
// Override with GEMINI_MODELS (comma-separated, in order of preference).
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
function loadModels(): string[] {
  const list = (process.env.GEMINI_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_MODELS;
}
export const AI_MODELS = loadModels();
export const AI_MODEL = AI_MODELS[0];

export interface EvalInput {
  stage: "hr" | "tech";
  skill: string;
  responses: { question: string; transcript: string; inputMode: string }[];
}
export type EvalResult = { ok: true; score: number; summary: string; model: string } | { ok: false; error: string };

const resultSchema = z.object({ score: z.number().min(0).max(10), summary: z.string().trim().min(10) });

const SYSTEM_PROMPT = `You are an expert Technical Recruiter evaluating a junior IT candidate's interview answers.
Judge the answers on (1) accuracy and relevance to the questions and (2) communication clarity.
Answers may be in English, Arabic, or a mix of both, and may contain speech-recognition errors; evaluate the meaning, not spelling or language choice.
Unanswered questions are marked "(no answer)" and should lower the score.
Return ONLY a JSON object with exactly two keys:
"score": a number from 0 to 10 (10 = excellent), and
"summary": a professional feedback summary of exactly 2 sentences, written in English.`;

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

// Only question text and answer transcripts are sent. No name, email or audio.
export async function evaluateInterview(input: EvalInput): Promise<EvalResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "AI evaluation is unavailable because the Gemini API key is not configured." };

  const transcript = input.responses
    .map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.transcript.trim() || "(no answer)"}`)
    .join("\n\n");
  const prompt = `Interview type: ${input.stage === "hr" ? "HR / behavioral" : "Technical"}\nCandidate skill area: ${input.skill}\n\n${transcript}`;

  try {
    const client = new GoogleGenerativeAI(key);
    const request = { contents: [{ role: "user" as const, parts: [{ text: prompt }] }] };
    let result;
    let used = "";
    let lastErr: unknown;
    for (const name of AI_MODELS) {
      const model = client.getGenerativeModel({
        model: name,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      });
      try {
        result = await model.generateContent(request, { timeout: 30_000 });
        used = name;
        if (name !== AI_MODELS[0]) console.warn(`[ai] Evaluation completed with fallback model "${name}" (primary: "${AI_MODELS[0]}").`);
        break;
      } catch (err) {
        lastErr = err;
        const st = (err as { status?: number }).status;
        if (st !== 503 && st !== 404) throw err;
        const next = AI_MODELS[AI_MODELS.indexOf(name) + 1];
        console.warn(
          `[ai] Gemini model "${name}" failed (HTTP ${st}); ` +
            (next ? `falling back to "${next}".` : "no more fallback models available."),
        );
      }
    }
    if (!result) throw lastErr;
    const content = result.response.text();
    if (!content) return { ok: false, error: "Gemini returned an empty response." };
    const parsed = resultSchema.safeParse(parseJson(content));
    if (!parsed.success) return { ok: false, error: "Gemini returned an invalid evaluation format." };
    const sentences = parsed.data.summary.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    return { ok: true, score: Math.round(parsed.data.score), summary: sentences, model: used };
  } catch (e) {
    const status = (e as { status?: number }).status;
    console.error("Gemini call failed", status ?? (e instanceof Error ? e.name : "error"));
    if (status === 400 || status === 401 || status === 403) return { ok: false, error: "Gemini rejected the request or API key." };
    if (status === 404) return { ok: false, error: `Gemini model ${AI_MODEL} is not available for this API key.` };
    if (status === 503) return { ok: false, error: "Gemini is busy right now. Please retry in a moment." };
    if (status === 429) return { ok: false, error: "Gemini rate limit or quota reached." };
    if (e instanceof SyntaxError) return { ok: false, error: "Gemini returned an invalid evaluation format." };
    return { ok: false, error: "The AI evaluation could not be completed." };
  }
}
