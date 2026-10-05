# Implementation Plan — Gardenia 2K26 v2

## Goal

Solo builder + AI. Build the complete mandatory spine, then go deep on Fair Rewards & Governance, while implementing the team's four practical innovations:

1. cloud/public vs local/confidential AI routing;
2. contribution-based Research Credits;
3. watermark-based leakage traceability;
4. charter-based sponsor-abandonment protection;
5. a safe local pending-action fallback.

Target: **~15.5 hours active implementation**, **2 hours sleep/rest**, and the remaining time protected for debugging, rehearsal and submission.

## Pre-build rule

Before the 3:00 PM implementation window, verify that the local model runtime is installed and a small test prompt works. Do not begin the 24-hour build without this check.

## M0 — Architecture kill tests

**15:00–16:00 — 1h**

### TASK-M0-01 — Supabase connection [COMPLETED]
**15 min**

Done when the local Next.js app can read/write a test row.
- [x] Local Supabase (Postgres 17 + PostgREST + GoTrue Auth) running
- [x] Initialized Next.js App Router with TypeScript/Tailwind and `@supabase/supabase-js`
- [x] Configured `.env.local` and admin/client connectors

### TASK-M0-02 — RLS private brief test [COMPLETED]
**20 min**

Done when:
- [x] non-member cannot read brief;
- [x] accepted member can.
- [x] Hash-chained ledger append, verification, and mutation blocks verified
- [x] Safe Tamper Lab simulation verified on in-memory copy

### TASK-M0-03 — Dual-AI router test [COMPLETED]
**15 min**

Done when:
- [x] public task reaches Gemini;
- [x] confidential task reaches local model;
- [x] provider route is visible in logs/UI.

### TASK-M0-04 — Local-model failure test [COMPLETED]
**10 min**

Stop local runtime and confirm:
- [x] confidential input is NOT sent to Gemini;
- [x] deterministic local fallback appears.
- [x] provider status says LOCAL_AI_UNAVAILABLE.

**Gate:** If the local AI path or RLS cannot be made reliable in this hour, simplify the AI feature before building UI. Do not silently route confidential data to cloud. [PASSED: Both RLS and Dual-AI router are proven]

## M1 — Project, charter, access, watermark

**16:00–18:00 — 2h**

### TASK-M1-01 — Auth + seeded roles
**25 min**

### TASK-M1-02 — Project + public/private brief split
**25 min**

### TASK-M1-03 — Charter v1 + acceptance
**30 min**

### TASK-M1-04 — RLS policies
**25 min**

### TASK-M1-05 — Viewer watermark
**15 min**

Done when:
- public summary visible;
- private brief blocked before acceptance;
- private brief unlocked after acceptance;
- watermark identifies viewer/project/time.

## M2 — Dual AI + scoping + matching + one agent

**18:00–20:00 — 2h**

### TASK-M2-01 — AI routing layer
**25 min**

### TASK-M2-02 — Gemini public scoping + Zod
**25 min**

### TASK-M2-03 — Local confidential question path
**20 min**

### TASK-M2-04 — Deterministic matching + COI exclusion
**20 min**

### TASK-M2-05 — Single ResearchCopilot
**30 min**

Only two tools:
- get_project_context;
- draft_contribution_summary.

Done when:
- two milestones generated;
- conflicted expert excluded;
- public route shows cloud;
- confidential route shows local;
- agent run has human owner + provider;
- cloud failure does not break public flow;
- local failure does not leak confidential input.

## M3 — Contributions, credits, ledger, escrow, protection

**20:00–23:30 — 3.5h**

### TASK-M3-01 — Contribution creation
**20 min**

### TASK-M3-02 — Review score 0–5
**25 min**

### TASK-M3-03 — Research Credits derived from approved impact
**25 min**

### TASK-M3-04 — Hash-chained ledger + verification
**40 min**

### TASK-M3-05 — Seeded similarity integrity check
**10 min**

### TASK-M3-06 — Escrow funded → released
**20 min**

### TASK-M3-07 — Sponsor withdrawal/protection state
**25 min**

### TASK-M3-08 — Reward explanation + credential
**25 min**

Done when:
- accepted contribution gains credits;
- reward is calculated from reviewed contribution weight;
- sponsor withdrawal stops new work and preserves accepted credit;
- ledger verifies;
- funded milestone reaches funded state before work and released after acceptance.

## M4 — Resilient fallback + integration

**23:30–01:00 — 1.5h**

### TASK-M4-01 — Local pending-action outbox
**35 min**

Implement only one useful path first: contribution submission.

Store:
- idempotency ID;
- project ID;
- charter version;
- contribution payload;
- status.

### TASK-M4-02 — Sync endpoint
**25 min**

Server validates current authorization/project state.

### TASK-M4-03 — Conflict handling
**15 min**

If charter version changed, mark conflict and require resubmission.

### TASK-M4-04 — Full fixed-story rehearsal
**15 min**

```text
Post → Scope → Match → Join → Fund → Work → Catch → Accept → Reward → Credential → Verify → Tamper
```

## 01:00–03:00 — Sleep/rest

Do not spend this block on feature work.

## M5 — Focus C + hardening

**03:00–05:30 — 2.5h**

### TASK-M5-01 — Credits UI
**25 min**

### TASK-M5-02 — Reward explanation
**30 min**

### TASK-M5-03 — Sponsor abandonment demo state
**20 min**

### TASK-M5-04 — Charter withdrawal clause display
**20 min**

### TASK-M5-05 — AI route/privacy indicators
**20 min**

### TASK-M5-06 — Watermark polish
**15 min**

### TASK-M5-07 — Error/fallback states
**20 min**

Done when the innovations are visible without needing a verbal explanation.

## M6 — Final hardening + recording

**05:30–08:30 — 3h**

### TASK-M6-01 — Full smoke test
**45 min**

### TASK-M6-02 — Typecheck/build
**30 min**

### TASK-M6-03 — Demo seed/reset
**25 min**

### TASK-M6-04 — README + AI tool declaration
**20 min**

### TASK-M6-05 — Record ≤3-minute demo video
**30 min**

### TASK-M6-06 — Rehearse live demo twice
**30 min**

## 08:30–15:00 — Protected buffer

No planned feature development.

Use only for:
- deployment/local environment recovery;
- critical bug fixes;
- demo rehearsal;
- documentation/submission;
- fallback recording.

## Exact cut order

Cut first:
1. watermark styling polish;
2. dispute resolution UI;
3. charter version-change UI;
4. sponsor withdrawal demo polish;
5. offline conflict UI;
6. live Gemini matching explanation;
7. agent tool loop → replace with one validated model call;
8. live cloud scoping → cached public result.

Never cut:
- RLS brief gate;
- local-only confidential routing;
- contribution owner;
- Research Credits derivation;
- sponsor-abandonment protection rule;
- ledger verification;
- reward explanation;
- escrow order;
- one working agent;
- one funded + one non-monetary project.

## Manual smoke test

### Privacy
- [x] public data can use cloud LLM
- [x] confidential data uses local model
- [x] mixed/unknown data uses local model
- [x] local-model failure never calls cloud
- [x] route label visible

### Access
- [x] non-member cannot read private brief
- [x] accepted member can
- [ ] watermark visible on private brief

### Contributions/credits
- [ ] contribution has human owner
- [ ] AI-assisted flag recorded
- [ ] review creates 0–5 score
- [ ] approved score becomes Research Credits
- [ ] local client cannot author final credit amount

### Charter/protection
- [x] charter accepted before work
- [ ] sponsor withdrawal stops new work
- [ ] accepted credit survives withdrawal
- [ ] funded escrow is protected

### Ledger
- [x] hash chain verifies
- [x] UPDATE blocked
- [x] DELETE blocked
- [x] tamper lab fails verification

### Fallback
- [ ] contribution write can enter pending local outbox
- [ ] reconnect syncs it
- [ ] duplicate sync is idempotent
- [ ] charter-version conflict is detected

### Demo
- [ ] funded project seeded
- [ ] non-monetary project seeded
- [ ] conflicted expert seeded
- [ ] similarity fixture seeded
- [ ] local model works
- [ ] recorded video works
