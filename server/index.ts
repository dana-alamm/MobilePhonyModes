import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { loadUser } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { SKILL_GROUPS } from "./content.js";
import { seedDemoData } from "./seed.js";
import { studentRouter } from "./routes/student.js";
import { interviewRouter } from "./routes/interviews.js";
import { companyRouter } from "./routes/company.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

app.use(express.json({ limit: "200kb" }));
app.use(loadUser);

app.use("/api/auth", authRouter);
app.get("/api/skills", (_req, res) => res.json({ groups: SKILL_GROUPS }));

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

if (!isProd || process.env.SEED_DEMO_ACCOUNTS === "true") await seedDemoData();

const port = Number(process.env.PORT ?? 5000);
app.listen(port, "0.0.0.0", () => console.log(`Mish Senior listening on ${port}`));
