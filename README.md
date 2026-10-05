# Gardenia 2K26 — Proof of Contribution + Protected Collaboration

## What it is

A research collaboration MVP where:
- project terms are agreed before work;
- public and confidential data use different AI processing paths;
- confidential data stays on a local AI runtime;
- every contribution has a named human owner;
- reviewed contribution creates Research Credits and reward weight;
- confidential views carry a viewer-specific watermark;
- sponsor withdrawal protects accepted contribution credit;
- temporary database failures can queue recoverable user actions without making local storage authoritative.

Focus area: **C — Fair Rewards & Governance**.

## Why two LLMs

**Public data → cloud Gemini.**

**Confidential/mixed/unknown data → local model runtime.**

A routing policy enforces this. Confidential data is never sent to the cloud as an AI fallback.

## Hackathon runtime decision

For the Gardenia final demo, the safest setup is:

```text
Local Next.js
   ├── Local AI runtime for confidential data
   ├── Cloud Gemini for public data
   └── Supabase cloud database
```

A standard Vercel deployment is not the primary MVP because a Vercel function cannot reach a model running on the team's laptop without a separate trusted inference endpoint.

## Setup

```bash
npm install
```

Create `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
LOCAL_LLM_BASE_URL=http://localhost:11434
LOCAL_LLM_MODEL=<pre-tested-local-model>
```

The service-role key is server-only.

Run local model runtime, then:

```bash
npm run dev
```

Verify:

```bash
npm run typecheck
npm run build
```

## Seed/demo

Seed two projects:

1. Funded:
   **Low-cost detection of diabetic retinopathy from fundus images on edge devices**
   Budget: ₹1,00,000.

2. Non-monetary:
   **Open-source accessibility benchmark for Indian educational websites**
   Reward: credit/credential, no payment.

Also seed:
- sponsor;
- three students;
- eligible expert;
- conflicted expert;
- charter v1;
- confidential brief;
- similar/copy contribution;
- reviews and credit weights;
- withdrawal-protection example.

## Demo story

Post → Scope public data → Match → Join → Unlock confidential brief → Local AI → Fund → Work → Catch copied content → Review → Credits → Accept → Reward → Sponsor protection/twist → Credential → Verify → Tamper.

The required Section 6 story remains the backbone.

## What is mocked/simplified

### Mocked/simulated

- Identity/KYC uses synthetic users.
- Money/escrow is simulated database state.
- Similarity result is seeded/deterministic.
- Tamper Lab uses a temporary copy, not the production ledger.
- Credential is a database/card representation.
- Sponsor withdrawal/mediation is simplified to a protection state.

### Simplified

- Matching is deterministic rather than embedding-based.
- One project-scoped agent.
- Watermark is an on-screen viewer-specific overlay rather than document-export fingerprinting.
- Offline fallback is a pending-action outbox, not an offline database.

## Production replacements

- Trusted private inference gateway / self-hosted model cluster.
- Real KYC and agreement workflows where legally required.
- Real escrow/payment provider.
- Production similarity/fingerprint system.
- Document-level watermarking and leak tracing.
- Stronger anti-collusion analysis.
- Real dispute/mediation process.
- Queue/cache infrastructure for unreliable AI providers.

## AI coding-tool declaration

Before submission, list every AI coding tool actually used:

```text
- Tool: <name>
  Use: <what it helped with>
```

Do not claim tools that were not used.

## Important limitation

This is a hackathon MVP with synthetic data and simulated financial/identity flows. The charter is not presented as a legally enforceable contract. The local fallback is not authoritative for final credit, reward or ledger state.
