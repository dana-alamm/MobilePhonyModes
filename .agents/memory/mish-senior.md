---
name: Mish Senior decisions
description: Governing constraints and conventions for the Mish Senior hackathon MVP
---
Spec: 100% cost-safe. No OpenAI or paid/Replit AI. Web Speech API in browser, rule-based summaries, mock demo login, simulated 1 JOD payment.

**Why:** the user explicitly cleared earlier briefs and set the cost-safe spec as the governing one.

**How to apply:**
- Label demo auth, simulated payment and rule-based feedback in the UI. Never claim AI analysis or audio storage; typed fallback is stored as typed.
- Timing, pass mark (5/10), repeat limit and one-attempt rules are enforced on the server, not the client.
- Companies see only passed candidates, scores and summaries, never transcripts.
- Sample candidates come from `npx tsx server/seed.ts` (isSample flag, "Sample" badge). Schema changes: `npm run db:push`; no startup DDL.
- Single Express app on port 5000 with Vite middleware in dev.
