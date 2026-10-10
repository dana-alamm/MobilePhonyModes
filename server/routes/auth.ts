import crypto from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users, studentProfiles } from "../db.js";
import { clearSession, setSession } from "../auth.js";
import { DEFAULT_SKILL, isSkill } from "../content.js";

export const authRouter = Router();

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password: string, stored: string | null): boolean {
  const [, salt, hash] = (stored ?? "scrypt$00$00").split("$");
  const actual = crypto.scryptSync(password, salt ?? "00", 64);
  const expected = Buffer.from(hash ?? "00", "hex");
  return stored !== null && expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

// Simple in-memory login throttle: 10 failures per 15 minutes per IP + email.
const failures = new Map<string, { n: number; resetAt: number }>();
const throttled = (k: string) => {
  const f = failures.get(k);
  return !!f && f.resetAt > Date.now() && f.n >= 10;
};
const recordFailure = (k: string) => {
  const f = failures.get(k);
  if (!f || f.resetAt <= Date.now()) failures.set(k, { n: 1, resetAt: Date.now() + 15 * 60_000 });
  else f.n++;
};

export function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id, name: u.name, role: u.role, email: u.email,
    subscriptionStatus: u.subscriptionStatus, subscriptionPlan: u.subscriptionPlan,
  };
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(160);

authRouter.post("/register", async (req, res) => {
  const body = z.object({
    role: z.enum(["student", "company"]),
    name: z.string().trim().min(2, "Enter a name (at least 2 characters).").max(80),
    email,
    password: z.string().min(8, "Use at least 8 characters for your password.").max(100),
    skills: z.array(z.string()).max(2).optional(),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid details." });
  const d = body.data;

  let skills: string[] = [];
  if (d.role === "student") {
    skills = [...new Set(d.skills?.length ? d.skills : [DEFAULT_SKILL])];
    if (skills.length < 1 || skills.length > 2 || !skills.every(isSkill)) {
      return res.status(400).json({ error: "Choose one or two specializations from the list." });
    }
  }
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email));
  if (taken) return res.status(409).json({ error: "An account with this email already exists. Try signing in." });

  const [u] = await db.insert(users).values({
    role: d.role, name: d.name, email: d.email, demoKey: `account:${d.email}`, passwordHash: hashPassword(d.password),
  }).onConflictDoNothing().returning();
  if (!u) return res.status(409).json({ error: "An account with this email already exists. Try signing in." });
  if (d.role === "student") await db.insert(studentProfiles).values({ userId: u.id, selectedTracks: skills });
  setSession(res, u.id);
  res.json({ user: publicUser(u) });
});

authRouter.post("/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(100), role: z.enum(["student", "company"]).optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Enter your email and password." });
  const key = `${req.ip}|${body.data.email}`;
  if (throttled(key)) return res.status(429).json({ error: "Too many failed attempts. Try again in a few minutes." });

  const [u] = await db.select().from(users).where(eq(users.email, body.data.email));
  const ok = verifyPassword(body.data.password, u?.passwordHash ?? null);
  if (!u || !ok || (body.data.role && u.role !== body.data.role)) {
    recordFailure(key);
    return res.status(401).json({ error: "Invalid email or password." });
  }
  failures.delete(key);
  setSession(res, u.id);
  res.json({ user: publicUser(u) });
});

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});
