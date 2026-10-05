# Demo and Pitch — Gardenia 2K26 v2

## Round 1 message

The core line is:

> **We are building a research collaboration layer where contributions are protected, AI use is accountable, confidential data stays on the right AI path, and contributors keep credit even when a project stops.**

## 60-second concept demo

Use only the parts that help explain the innovation.

### 0–10s — Post

Show the seeded diabetic-retinopathy project.

### 10–18s — Scope

Run public-data AI scoping.

Badge:
`PUBLIC DATA → CLOUD AI`

### 18–28s — Join + protected brief

Arjun accepts the charter.

Open confidential brief.

Show:
`CONFIDENTIAL DATA → LOCAL AI`

Show viewer watermark.

### 28–38s — Contribution

Run ResearchCopilot for a confidential task.

Show:
- Local AI
- Human owner: Arjun
- AI-assisted contribution

### 38–50s — Credits/reward

Show contribution review → Research Credits → reward explanation.

### 50–60s — Commitment + audit

Show sponsor withdrawal protection or ledger verification/tamper result.

Close:
> “The platform doesn't just record work. It protects the person who did it.”

# Full 5-minute final demo

The handout's fixed Section 6 scenario remains the order of the live demo.

## 0:00–0:35 — Post

Sponsor posts:
**Low-cost detection of diabetic retinopathy from fundus images on edge devices — ₹1,00,000.**

Show charter and sensitivity classification.

## 0:35–1:00 — Public AI scope + matching

Run scope.

Say:
> “Public project information can use our cloud LLM.”

Show candidate ranking and conflict-of-interest exclusion.

## 1:00–1:35 — Join + confidential access

Switch to Arjun.

Accept charter.

Open private brief.

Show watermark.

Say:
> “This information is confidential, so it is not sent to the cloud model.”

## 1:35–2:00 — Confidential local AI

Ask ResearchCopilot a question about the private brief.

Show:
`LOCAL AI`

Show agent owner:
`Human owner: Arjun`

If local model is unavailable, demonstrate the deterministic local fallback instead of routing to cloud.

## 2:00–2:25 — Fund + work

Fund Milestone 1.

Show:
`Escrow: FUNDED`

Then submit contribution.

## 2:25–3:10 — Integrity + contribution review

Show seeded similarity flag.

Reviewer scores contribution.

Show:
`Impact 5/5 → +5 Research Credits`

Say:
> “Credits come from reviewed contribution, not commit count.”

## 3:10–3:45 — Accept + reward

Accept milestone.

Show:
`Escrow: RELEASED`

Open reward calculation.

Explain one contributor's amount from the contribution weight.

## 3:45–4:10 — Sponsor abandonment protection

Open sponsor withdrawal control on a seeded demonstration state.

Show:

```text
Sponsor withdrew
New work: STOPPED
Accepted credits: PROTECTED
```

Say:
> “Stopping the project should not erase work that was already accepted.”

## 4:10–4:35 — Non-monetary project

Show second project.

Issue credential/credit without payment.

## 4:35–5:00 — Audit + tamper

Show:
`Ledger: VERIFIED`

Open Demo Tamper Lab.

Simulate change to an old entry.

Show:
`VERIFICATION FAILED`

End:
> “Our goal is simple: make every contribution provable, protectable and fairly credited.”

# Round 1 — 5-slide outline

## Slide 1 — The problem

Research collaboration has a trust problem:
- work is fragmented across different tools;
- credit is hard to prove;
- AI creates new credit/privacy questions.

## Slide 2 — Users + journey

Sponsor → Expert → Student

Sponsor posts → AI scopes → Match → Charter → Work → Review → Credit/reward

## Slide 3 — Our core idea

**Proof of Contribution + Protected Collaboration**

Highlight:
- human-owned AI work;
- reviewed contribution credits;
- agreed terms before work.

## Slide 4 — Our innovations

1. Public data → cloud AI; confidential data → local AI.
2. Contribution-based Research Credits.
3. Watermark for leakage traceability.
4. Charter-based sponsor-abandonment protection.

Mention fallback only as resilience, not as the headline innovation.

## Slide 5 — 24-hour plan

Build the mandatory spine first.

Then go deep on Fair Rewards & Governance:

`Contribution scoring → Research Credits → Transparent reward → Dispute/commitment evidence`

# Judge questions

### Why two LLMs?
Because confidentiality changes the allowed processing path. Public data can use cloud AI; confidential or uncertain data stays local.

### What happens if the local model fails?
We fail closed for confidential data. We never send it to the cloud as a fallback.

### Is watermarking your plagiarism detector?
No. Watermarking deters and traces unauthorized sharing. Similarity checking is a separate integrity mechanism.

### Can local storage change someone's credits?
No. Local fallback stores a pending action, not authoritative credit. The server validates and calculates final state.

### What if the sponsor abandons the project?
The charter defines the protection. New work stops, but accepted contributions and Research Credits remain protected; funded milestone handling follows the agreed acceptance/escrow process.

### Is this a legal contract?
No. It is a versioned project charter with explicit commitment and exit terms. A production system would integrate enforceable agreements where required.

### Why not just use blockchain?
The MVP needs auditability, not blockchain. A cryptographic append-only ledger is smaller and easier to demonstrate.

### How do you stop AI from receiving credit?
AI is treated as a tool. The human who directs and reviews the AI-assisted output is the contribution owner.

### What if someone tries prompt injection?
User content is treated as data. The agent is scoped to one project and has no payout, ledger or access-control side effects.

### What if the database is down?
Recoverable user actions enter a local pending outbox. On recovery, the server validates them and becomes the source of truth. Final credits, rewards and ledger state are never trusted from local storage.

## Demo failure plan

### Gemini fails
Use cached public-task result.

### Local model fails
Use deterministic local fallback; never send confidential input to cloud.

### Supabase fails
Queue a contribution action locally; use recorded demo if the live backend cannot recover quickly.

### No internet
Run the local UI/local model where possible and switch to the required recorded ≤3-minute demo for the full cloud story.
