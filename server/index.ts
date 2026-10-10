import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "./db.js";
import { clearSession, loadUser, setSession } from "./auth.js";
import { studentRouter } from "./routes/student.js";
import { interviewRouter } from "./routes/interviews.js";
import { companyRouter } from "./routes/company.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

app.use(express.json({ limit: "200kb" }));
app.use(loadUser);

// DEMO login: pick a role and a name. This is not LinkedIn or any real identity provider.
app.post("/api/auth/demo", async (req, res) => {
  const body = z.object({
    role: z.enum(["student", "company"]),
    name: z.string().trim().min(2).max(60),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Enter a name (2-60 characters)." });
  const demoKey = `${body.data.role}:${body.data.name.toLowerCase()}`;
  let [u] = await db.select().from(users).where(eq(users.demoKey, demoKey));
  if (!u) {
    [u] = await db.insert(users).values({ role: body.data.role, name: body.data.name, demoKey }).onConflictDoNothing().returning();
    if (!u) [u] = await db.select().from(users).where(eq(users.demoKey, demoKey));
  }
  if (u.isSample) return res.status(400).json({ error: "That name belongs to a sample profile. Choose another name." });
  setSession(res, u.id);
  res.json({ user: { id: u.id, name: u.name, role: u.role } });
});

app.post("/api/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null });
});

app.use("/api/student", studentRouter);
app.use("/api/interviews", interviewRouter);
app.use("/api/company", companyRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

if (isProd) {
  const dist = path.join(root, "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: path.join(root, "client"),
    configFile: path.join(root, "vite.config.ts"),
    server: { middlewareMode: true, allowedHosts: true, hmr: { clientPort: 443 } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT ?? 5000);
app.listen(port, "0.0.0.0", () => console.log(`Mish Senior listening on ${port}`));
