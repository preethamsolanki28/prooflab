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

## M1 — Project, charter, access, watermark [PASSED & VERIFIED]

**16:00–18:00 — 2h**

### TASK-M1-01 — Auth + seeded roles [PASSED]
- Role-aware application shell with 1-click synthetic accounts (`sponsor`, `student_a`, `student_b`, `expert`, `admin`).
- Authoritative profiles fetched from `public.profiles`.

### TASK-M1-02 — Project + public/private brief split [PASSED]
- Public projects list (`/projects`) renders metadata, milestones overview, and data sensitivity badges without leaking private brief content.
- Physical row separation verified (`projects` vs `project_private_briefs`).
- Sponsor project creation (`/projects/new`) for funded and knowledge-sharing projects.

### TASK-M1-03 — Charter v1 + acceptance [PASSED]
- Full Charter v1 view with all 17 clauses displayed on project details (`/projects/[id]`).
- Explicit engagement model acknowledgement checkbox before acceptance.
- On acceptance: `charter_acceptances` inserted, `project_members` trigger updates status to `accepted`, and `CHARTER_ACCEPTED` entry recorded in ledger.

### TASK-M1-04 — RLS policies [PASSED]
- Non-members querying confidential brief receive 0 rows (blocked by PostgreSQL Row-Level Security).
- Accepted members querying confidential brief receive authorized data.
- Audit event `PRIVATE_BRIEF_ACCESSED` recorded in append-only cryptographic ledger.

### TASK-M1-05 — Viewer watermark [PASSED]
- Unlocked confidential brief renders with dynamic diagonal repeating translucent watermark:
  `[VIEWER NAME] · [PROJECT ID] · [TIME]` (e.g. `ARJUN · 40A98CF6 · 16:50`).
- Prevents screenshot/data leakage without provenance.

Done when:
- public summary visible; [PASSED]
- private brief blocked before acceptance; [PASSED]
- private brief unlocked after acceptance; [PASSED]
- watermark identifies viewer/project/time. [PASSED]
- automated suite verified: `npm run test:m1` [9/9 PASSED]

## M2 — Dual AI + scoping + matching + one agent [PASSED & VERIFIED]

**18:00–20:00 — 2h**

### TASK-M2-01 — AI routing layer [PASSED]
- Deterministic routing policy resolver: PUBLIC -> Cloud Gemini; CONFIDENTIAL/MIXED/UNKNOWN -> Local Ollama (`smollm2:135m`).
- Hard code-level guardrail throws security violation if confidential data is directed to Gemini.

### TASK-M2-02 — Gemini public scoping + Zod [PASSED]
- Generates exactly 2 milestones validated by `ScopingResultSchema`.
- Persists valid milestones into `public.milestones` table.
- Deterministic fallback for rate-limit, timeout, or malformed JSON; UI visibly indicates fallback.

### TASK-M2-03 — Local confidential question path [PASSED]
- Confidential prompts routed exclusively to local Ollama runtime.
- Fail-closed local outage behavior tested and verified (Gemini never called).

### TASK-M2-04 — Deterministic matching + COI exclusion [PASSED]
- Transparent deterministic scoring: 70% skill overlap + 20% verification + 10% eligibility base.
- Conflicted experts (`conflict_of_interest: true`) strictly excluded with score 0 and transparent reason.
- LLM only provides readable summary; does not decide score or eligibility.

### TASK-M2-05 — Single ResearchCopilot [PASSED]
- Exactly one project-scoped agent with two tools:
  - `get_project_context`: reads current project, charter, milestones only; blocks cross-project access.
  - `draft_contribution_summary`: formats draft, detects AI assistance, assigns no authoritative credits.
- Every run recorded in `public.agent_runs` with authenticated `owner_id`, `project_id`, `ai_provider`, and `data_classification`.
- Prompt injection attempts intercepted and refused.

Done when:
- two milestones generated; [PASSED]
- conflicted expert excluded; [PASSED]
- public route shows cloud; [PASSED]
- confidential route shows local; [PASSED]
- agent run has human owner + provider; [PASSED]
- cloud failure does not break public flow; [PASSED]
- local failure does not leak confidential input; [PASSED]
- automated suite verified: `npm run test:m2` [11/11 PASSED]

## M3 — Contributions, credits, ledger, escrow, protection [COMPLETED]

**20:00–23:30 — 3.5h**

### TASK-M3-01 — Contribution creation [PASSED]
- Strictly derived authenticated owner (`owner_id`).
- Deterministic server-side SHA-256 content hashing (`content_hash`).
- Cryptographic ledger event: `CONTRIBUTION_SUBMITTED`.

### TASK-M3-02 — Review score 0–5 [PASSED]
- Transparent rubric: Quality (0-2) + Usefulness (0-2) + Evidence (0-1) = Impact Score (0-5).
- Decisions: `APPROVED`, `REJECTED`, `NEEDS_REVISION`.
- Cryptographic ledger event: `CONTRIBUTION_REVIEWED`.

### TASK-M3-03 — Research Credits derived from approved impact [PASSED]
- Credits derived strictly server-side from approved contribution impact scores.
- Client cannot submit or mutate credit balance.
- Cryptographic ledger event: `CREDITS_AWARDED`.

### TASK-M3-04 — Hash-chained ledger + verification [PASSED]
- Append-only hash chain linking all M3 events (`CONTRIBUTION_SUBMITTED`, `CONTRIBUTION_REVIEWED`, `CREDITS_AWARDED`, `ESCROW_FUNDED`, `MILESTONE_ACCEPTED`, `ESCROW_RELEASED`, `PROJECT_WITHDRAWN`, `DISPUTE_OPENED`, `DISPUTE_RESOLVED`, `CREDENTIAL_ISSUED`).
- Tamper Lab verifies that mutation of history fails cryptographic validation while production remains intact.

### TASK-M3-05 — Seeded similarity integrity check [PASSED]
- Deterministic SHA-256 hash detection against previously committed work units.

### TASK-M3-06 — Escrow funded → released [PASSED]
- Escrow state machine: `UNFUNDED` → `FUNDED` (by sponsor) → `RELEASED` (by sponsor upon milestone acceptance).
- Students strictly prevented from releasing escrow (`UNAUTHORIZED_ESCROW_RELEASE`).
- Cryptographic ledger events: `ESCROW_FUNDED`, `MILESTONE_ACCEPTED`, `ESCROW_RELEASED`.

### TASK-M3-07 — Sponsor withdrawal/protection state [PASSED]
- Project transitions to `SPONSOR_WITHDRAWN` / `WORK_STOPPED`.
- Future contributions strictly blocked (`PROJECT_WITHDRAWN`).
- Accepted contributions and derived Research Credits remain completely protected and intact.
- Cryptographic ledger event: `PROJECT_WITHDRAWN`.

### TASK-M3-08 — Reward explanation + credential [PASSED]
- Pure deterministic server-side formula: `student_pool × (member_credit_weight / total_credit_weight)`.
- Dedicated explainability view at `/projects/[id]/rewards` with step-by-step arithmetic provenance.
- Handout example benchmark fixture matches exact stated numbers (25,783, 18,643, 15,074, 25,500).
- Verifiable digital credentials for knowledge-sharing projects with zero monetary payout.
- Cryptographic ledger events: `DISPUTE_OPENED`, `DISPUTE_RESOLVED`, `CREDENTIAL_ISSUED`.

Done when:
- accepted contribution gains credits; [PASSED]
- reward is calculated from reviewed contribution weight; [PASSED]
- sponsor withdrawal stops new work and preserves accepted credit; [PASSED]
- ledger verifies; [PASSED]
- funded milestone reaches funded state before work and released after acceptance; [PASSED]
- automated suite verified: `npm run test:m3` [18/18 PASSED]

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
