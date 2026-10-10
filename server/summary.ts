import { HR_KEYWORDS, TRACK_KEYWORDS, type Track } from "./content.js";

export interface SummaryInput {
  stage: "hr" | "tech";
  track: Track;
  total: number;
  responses: { transcript: string | null; skipped: boolean; inputMode: string | null }[];
  expired?: boolean;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9\u0600-\u06FF']+/g) ?? [];
}

// Strict rule-based logic. This is NOT AI analysis and never claims to be.
export function buildRuleBasedSummary(input: SummaryInput): { summary: string; score: number } {
  const answered = input.responses.filter((r) => !r.skipped && r.transcript && words(r.transcript).length > 0);
  const label = input.stage === "hr" ? "HR" : "technical";
  const typed = answered.filter((r) => r.inputMode === "typed").length;

  if (answered.length === 0) {
    return {
      score: 0,
      summary: `Insufficient transcript data: no answers were captured in the ${label} interview (0/${input.total}), so no reliable content evaluation could be produced. Basic automated rule-based feedback, not AI analysis.`,
    };
  }

  const joined = answered.map((r) => r.transcript!).join(" ");
  const tokens = new Set(words(joined));
  const keywordList = input.stage === "hr" ? HR_KEYWORDS : TRACK_KEYWORDS[input.track];
  const found = keywordList.filter((k) => tokens.has(k));
  const avgWords = Math.round(answered.reduce((n, r) => n + words(r.transcript!).length, 0) / answered.length);
  const communication = avgWords >= 40 ? "Fluent" : avgWords >= 15 ? "Adequate" : "Brief";

  const score = Math.round(
    10 * (0.5 * (answered.length / input.total) + 0.3 * Math.min(found.length / 5, 1) + 0.2 * Math.min(avgWords / 40, 1)),
  );

  const parts = [
    `Candidate answered ${answered.length}/${input.total} ${label} questions`,
    found.length
      ? input.stage === "hr"
        ? `mentioning [${found.join(", ")}]`
        : `demonstrating knowledge of [${found.join(", ")}]`
      : "without mentioning any expected track keywords",
  ];
  let text = `${parts.join(", ")}. Communication was ${communication} based on answer length (average ${avgWords} words per answer).`;
  if (typed > 0) text += ` ${typed} answer(s) were typed, not spoken, because voice capture was unavailable.`;
  if (input.expired) text += " The interview time limit was reached before all questions were completed.";
  text += " Basic automated rule-based feedback, not AI analysis.";
  return { summary: text, score };
}
