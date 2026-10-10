import { eq } from "drizzle-orm";
import { db, users, studentProfiles, assessments, officialInterviews } from "./db.js";
import { hashPassword } from "./routes/auth.js";

// Presentation-only data. Runs automatically in development, and in production only when SEED_DEMO_ACCOUNTS=true.
const DEMO_PASSWORD = "123456";

const SAMPLES = [
  { name: "Layla Haddad", track: "Flutter & Dart", score: 9, tech: 8 },
  { name: "Omar Nasser", track: "Backend Development", score: 7, tech: 6 },
  { name: "Rana Khoury", track: "UI/UX Design", score: 8, tech: 7 },
  { name: "Yazan Saleh", track: "Frontend Development", score: 5, tech: 4 },
  { name: "Sara Mansour", track: "React.js", score: 10, tech: 9 },
];

export async function seedDemoData() {
  const demo = [
    { role: "student", name: "Demo Student", email: "student@test.com" },
    { role: "company", name: "Demo Company", email: "hr@company.com" },
  ];
  for (const d of demo) {
    const [exists] = await db.select().from(users).where(eq(users.email, d.email));
    if (exists) continue;
    const [u] = await db.insert(users).values({
      role: d.role, name: d.name, email: d.email, demoKey: `account:${d.email}`, passwordHash: hashPassword(DEMO_PASSWORD),
    }).onConflictDoNothing().returning();
    if (u && d.role === "student") await db.insert(studentProfiles).values({ userId: u.id });
  }

  for (const s of SAMPLES) {
    const demoKey = `sample:${s.name.toLowerCase()}`;
    const [exists] = await db.select().from(users).where(eq(users.demoKey, demoKey));
    if (exists) continue;
    const [u] = await db.insert(users).values({ role: "student", name: s.name, demoKey, isSample: true }).returning();
    await db.insert(studentProfiles).values({ userId: u.id, selectedTracks: [s.track], officialTrack: s.track });
    await db.insert(assessments).values({ userId: u.id, track: s.track, score: s.score, passed: s.score >= 5, completedAt: new Date(), attempts: 1 });
    await db.insert(officialInterviews).values({
      userId: u.id, track: s.track, stage: "tech", status: "completed", completedAt: new Date(), deadlineAt: new Date(),
      questions: [] as string[], score: s.tech, feedbackType: "sample", evalStatus: "done",
      summary: "(Sample data) This is a demonstration profile, not a real candidate. Its interview score and summary are illustrative only.",
    });
  }
}
