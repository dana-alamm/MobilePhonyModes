import { eq } from "drizzle-orm";
import { db, pool, users, studentProfiles, assessments, officialInterviews } from "./db.js";

// Sample candidates so the company dashboard is not empty in a demo. They are flagged isSample and shown with a "Sample" badge.
const SAMPLES = [
  { name: "Layla Haddad", track: "Flutter Developer", score: 9, tech: 8, kw: "state, widget, dart, future", avg: "Fluent", n: 5 },
  { name: "Omar Nasser", track: "Backend Developer", score: 7, tech: 6, kw: "api, database, token", avg: "Adequate", n: 4 },
  { name: "Rana Khoury", track: "UI/UX Designer", score: 8, tech: 7, kw: "research, wireframe, contrast", avg: "Fluent", n: 5 },
  { name: "Yazan Saleh", track: "Frontend Developer", score: 5, tech: 4, kw: "react, component", avg: "Brief", n: 3 },
  { name: "Sara Mansour", track: "Frontend Developer", score: 10, tech: 9, kw: "react, hook, render, promise", avg: "Fluent", n: 5 },
];

for (const s of SAMPLES) {
  const demoKey = `sample:${s.name.toLowerCase()}`;
  const [exists] = await db.select().from(users).where(eq(users.demoKey, demoKey));
  if (exists) continue;
  const [u] = await db.insert(users).values({ role: "student", name: s.name, demoKey, isSample: true }).returning();
  await db.insert(studentProfiles).values({ userId: u.id, selectedTracks: [s.track], officialTrack: s.track });
  await db.insert(assessments).values({ userId: u.id, track: s.track, score: s.score, passed: s.score >= 5, completedAt: new Date() });
  const done = { status: "completed", completedAt: new Date(), feedbackType: "rule_based", deadlineAt: new Date(), questions: [] as string[], track: s.track, userId: u.id };
  await db.insert(officialInterviews).values({
    ...done, stage: "tech", score: s.tech,
    summary: `(Sample data) Candidate answered ${s.n}/5 technical questions, demonstrating knowledge of [${s.kw}]. Communication was ${s.avg} based on answer length. Basic automated rule-based feedback, not AI analysis.`,
  });
}
console.log("Seeded sample candidates");
await pool.end();
