# PRD — Gardenia 2K26 MVP v2

## Product

**Proof of Contribution + Protected Collaboration** for research projects.

Focus area: **C — Fair Rewards & Governance**.

## Primary user

Arjun, a student researcher joining a sponsor-funded project.

## Three must-have bundles

### Bundle 1 — Protected project entry

- Supabase Auth with Student/Expert/Sponsor/Admin roles.
- Sponsor posts a public project summary.
- Confidential brief stored separately.
- Versioned project charter.
- Explicit charter acceptance before confidential access/work.
- Charter contains engagement model, credit/reward terms, IP/confidentiality terms, and sponsor withdrawal/exit protection.
- Supabase RLS protects the confidential brief.
- Viewer-specific watermark on confidential content.

### Bundle 2 — Dual-AI research workspace

- Public data → cloud Gemini API.
- Confidential data → local model through a local inference runtime.
- A single routing layer decides which provider may receive the input.
- Local-model failure never reroutes confidential data to the cloud.
- AI-assisted scoping into two milestones.
- Deterministic skill/eligibility matching with an explanation.
- One project-scoped ResearchCopilot agent.
- Agent run records human owner + provider route (cloud/local) without storing confidential prompt content in cloud telemetry.

### Bundle 3 — Contribution, credit and resilience

- Contribution record with human owner and AI-assisted flag.
- Human review and 0–5 impact score.
- Research Credits derived from approved contribution scores.
- Explainable funded reward calculation.
- Hash-chained contribution ledger.
- Seeded/deterministic similarity integrity check.
- Simulated escrow.
- Non-monetary credential.
- Sponsor-abandonment protection state.
- Local pending-action outbox for recoverable database failures.

## Focus C — Fair Rewards & Governance

Depth is:

**reviewed contribution → Research Credits → transparent reward → dispute/commitment evidence**

The system does not reward commit count. It rewards reviewed contribution impact.

## Watermark scope

MVP watermark:
- semi-transparent viewer identity;
- project identifier;
- timestamp;
- repeated overlay on confidential brief/research preview.

No document-conversion pipeline is required.

Watermarking is presented as leakage deterrence/traceability. The separate integrity check handles similarity/plagiarism-style detection.

## Sponsor abandonment protection

Minimum MVP state machine:

`ACTIVE → SPONSOR_WITHDRAWN → WORK_STOPPED → PROTECTED_CREDIT`

When a sponsor withdraws:
- no new work starts;
- accepted contributions remain in the ledger;
- Research Credits remain attached to the contributor;
- funded milestone stays in the configured acceptance/escrow state;
- dispute/mediation can be recorded but full mediation is design-only.

## Failure-resilient outbox

When DB writes fail:
- create a local pending action with an idempotency ID;
- mark it `PENDING SYNC`;
- retry when the database is available;
- server revalidates authentication, charter version, membership and current project state;
- server calculates final credits/rewards.

Never trust locally stored final credits, payout values or ledger hashes.

If the charter version changed while offline, the pending action becomes `CONFLICT` and requires user confirmation/re-submission.

## AI policy

Data classification is a project/brief policy, not something a cloud model is allowed to infer for routing.

| Data | Allowed AI path |
|---|---|
| Public summary / public project metadata | Cloud Gemini |
| Confidential brief / confidential contribution context | Local model only |
| Mixed/uncertain content | Local model only |

## Should-have, only after the core demo works

1. Charter version-change/re-acceptance UI.
2. Better watermark placement and export-like preview.
3. Sponsor-withdrawal demo button.
4. Offline outbox status indicator.
5. Stronger dispute UI.
6. Local model response streaming.

## Won't-do

- Blockchain anchoring.
- W3C verifiable credentials.
- Real money or KYC.
- Real legal contracts.
- Real payment provider.
- Real document watermarking/export pipeline.
- Full production plagiarism detection.
- pgvector matching.
- Embedding API for matching.
- Realtime dependency.
- Supabase Storage artefact pipeline.
- Multiple agents.
- Complex multi-agent orchestration.
- Advanced anti-collusion reputation engine.
- Mobile app.
- Cloud processing of confidential data.

## Fixed user flow

1. Sponsor posts seeded research problem and charter.
2. AI scopes public project information using cloud LLM.
3. Match candidates; conflicted expert is excluded.
4. Student accepts charter.
5. RLS unlocks private brief.
6. Confidential question is routed to local model; show `LOCAL ONLY` indicator.
7. Confidential brief displays viewer-specific watermark.
8. Milestone is funded into simulated escrow.
9. Student uses ResearchCopilot; agent run has human owner and local/cloud route shown.
10. Student submits contribution.
11. Seeded similarity check flags copied content for review.
12. Reviewer assigns impact score.
13. Research Credits update after server acceptance.
14. Milestone is accepted; escrow releases.
15. Reward explanation shows contribution-based calculation.
16. Non-monetary project issues credential/credit.
17. Admin verifies ledger.
18. Demo Tamper Lab shows verification failure on a temporary copy.

## Wow moments

Primary:
> **“This confidential request says LOCAL ONLY — it never goes to the cloud model.”**

Secondary:
> **“Arjun's reward is traceable to reviewed contribution credits.”**

Third:
> **“Sponsor withdrawal doesn't erase accepted work; the charter protects the contributor's credit.”**

## Assumptions

- Team already has a small local model runtime or can install/test one before M1.
- Demo runs locally if needed so the local model remains on the same machine.
- Synthetic data only.
- Cloud Gemini is optional to the critical transaction path.
- Local model is used for confidential tasks even if its output quality is lower; a deterministic local fallback handles failure.
