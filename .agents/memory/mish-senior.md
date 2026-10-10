---
name: Mish Senior decisions
description: Current product constraints, design direction, and conventions for the Mish Senior platform
---
The user initially specified no AI or paid APIs, then explicitly superseded that constraint by requesting OpenAI GPT-4o-mini interview evaluation. Mock practice and company subscriptions remain non-billing demonstrations.

**Why:** later explicit product instructions override the original cost-safe MVP brief; OpenAI usage can incur costs and transcript text leaves the app for analysis.

**How to apply:** disclose transcript transfer before the interview, use `OPENAI_API_KEY` only through Replit Secrets, validate returned JSON, and report API failures honestly. Never send or store audio.

Visual direction from the user-provided welcome and registration references: near-black background, subtle deep-green glow, dark panels, fine borders, white/gray text, neon-green actions, responsive readable forms.

**Why:** the user requested new welcome/account screens and the same reference theme across the whole app.

**How to apply:** reference visuals are style guides, not copy sources for inaccurate claims; describe hardcoded assessments honestly and reserve AI claims for implemented interview evaluation.