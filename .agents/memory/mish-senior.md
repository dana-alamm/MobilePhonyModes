---
name: Mish Senior decisions
description: Current product constraints, design direction, and conventions for the Mish Senior platform
---
The user initially specified no AI or paid APIs, then explicitly superseded that constraint by requesting OpenAI (GPT-4o-mini) interview evaluation. Mock practice and company subscriptions remain non-billing demonstrations.

**Why:** later explicit product instructions override the original cost-safe MVP brief; OpenAI usage can incur costs and transcript text leaves the app for analysis.

**How to apply:** disclose transcript transfer before the interview, use `OPENAI_API_KEY` only through Replit Secrets, validate returned JSON, and report API failures honestly. Never send or store audio.

Visual direction from the user-provided welcome and registration references: near-black background, subtle deep-green glow, dark panels, fine borders, white/gray text, neon-green actions, responsive readable forms.

**Why:** the user requested new welcome/account screens and the same reference theme across the whole app.

**How to apply:** reference visuals are style guides, not copy sources for inaccurate claims; describe hardcoded assessments honestly and reserve AI claims for implemented interview evaluation.

Seeding and behavior: demo accounts are created by `seedDemoData` at dev startup (prod only with `SEED_DEMO_ACCOUNTS=true`). Demo student starts with no skills; demo company starts unsubscribed, so the combobox and paywall can be demonstrated. Reset those states if testing mutates them.

Skills catalog (7 groups) maps to shared question-bank families, so assessments test family fundamentals, not each skill. Pass mark 5/10 enforced server-side. AI failures are shown with a retry; no rule-based fallback. Company paywall and interview invites are mock (no real payment, no email); Basic plan caps invites at 5.

**Why:** user wanted demo-able flows without real payments; honesty about what is real.

**How to apply:** keep labels honest (Sample vs AI), never claim per-skill assessments.
