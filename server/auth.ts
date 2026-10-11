import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, users } from "./db.js";

// DEMO authentication only: no real identity provider (no LinkedIn, no passwords).
const COOKIE = "ms_session";
const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET is not set");

function sign(value: string) {
  return crypto.createHmac("sha256", secret!).update(value).digest("hex");
}

export function setSession(res: Response, userId: number) {
  const value = `${userId}.${sign(String(userId))}`;
  res.cookie(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export type AuthedUser = typeof users.$inferSelect;
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const raw = readCookie(req, COOKIE);
    if (raw) {
      const [id, sig] = raw.split(".");
      const expected = sign(id);
      const ok =
        sig && sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (ok) {
        const [u] = await db.select().from(users).where(eq(users.id, Number(id)));
        if (u) req.user = u;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(role: "student" | "company") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Please sign in first." });
    if (req.user.role !== role) return res.status(403).json({ error: "This area is not available for your account type." });
    next();
  };
}
