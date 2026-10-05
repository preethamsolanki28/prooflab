# Gardenia 2K26 — Collaborative Research Ecosystem

## Problem statement

### The challenge

> Design and build a platform that connects research sponsors, domain experts and students into verified, access-controlled project teams; equips each team with a shared workspace powered by generative and agentic AI; records every human and AI contribution in a tamper-evident ledger; protects work against plagiarism, leakage and theft; and distributes monetary and non-monetary rewards fairly and transparently, according to a project charter that every participant accepted before work began.

Source: Gardenia 2K26 Participant Handout, Section 1.

### Core gap

Existing tools solve individual pieces of research collaboration, but the problem is the missing trust layer: agreed terms, confidential-data protection, human ownership of AI-assisted work, contribution proof, and fair credit/reward.

## PS ID

**Gardenia 2K26 - Collaborative Research Ecosystem**

The handout provides no numeric problem ID.

## Demo persona

**Arjun — student researcher**

Arjun wants access to meaningful research work. His main concerns are:
- his contribution must remain attributable;
- confidential project information must not leak through AI tools;
- he should receive credit for real contribution, including AI-assisted work;
- if a sponsor abandons the project, accepted work should not simply disappear.

## Problem in one sentence

**Research collaboration needs a trusted layer that protects confidential work, preserves agreed commitments, proves contribution, and explains credit/reward.**

## Our product principle

> **Proof of Contribution + Protected Collaboration:** terms are agreed before work, confidential data is routed only to an allowed AI path, every meaningful contribution has a human owner, credit is derived from reviewed contribution, and accepted work remains protected even if the project stops.

## Team innovations

### 1. Dual-AI privacy routing

- Public project information → cloud LLM/API.
- Confidential project information → locally running model.
- Routing is determined by a project/data sensitivity label, not by the model itself.
- If a confidential task cannot reach the local model, it fails closed or uses a deterministic local fallback. It is never sent to the cloud LLM.

### 2. Contribution-credit system

Each accepted/reviewed contribution receives a contribution score. A user's **Research Credits** are derived from accepted contribution scores rather than commits or raw activity. Funded rewards use the reviewed contribution weights.

### 3. Watermarking / leakage traceability

Confidential content shown to a participant carries a viewer-specific watermark such as user, project and timestamp. This is for **leak tracing/deterrence**, not the plagiarism detector itself. A separate similarity check handles plagiarism-style integrity checking.

### 4. Commitment-protection charter

The project charter includes withdrawal/exit terms. If the sponsor abandons the project:
- new work is stopped;
- accepted contributions retain credit;
- funded milestone state is preserved for the agreed acceptance/escrow process;
- contributors are not silently stripped of already-earned recognition.

This is a product governance mechanism, not a claim of legal enforceability.

### 5. Failure-resilient pending actions

When the database is temporarily unavailable, the browser may keep **non-authoritative pending actions** locally for later sync. The server remains the source of truth for credit, reward and ledger state. Local storage never becomes the authority for final credits or money.

## Judging alignment

### Round 1 — Pitch

- **Understanding — 25:** Identify fragmented trust, IP, AI-credit and confidentiality problems.
- **User need — 20:** Center the student journey while showing sponsor/expert needs.
- **Innovation — 20:** Dual-AI privacy routing, contribution credits, commitment-protection charter, and watermark-based traceability.
- **Solution/approach — 20:** Charter → gated access → correct AI route → contribution → review → credit/reward → audit/protection.
- **Clarity — 10:** One simple product principle: Proof of Contribution + Protected Collaboration.
- **Questions — 5:** Prepare for AI privacy, sponsor abandonment, watermark limitations, offline conflicts and scalability.

### Round 2 — Proof of Concept

Show the architecture, data model, AI routing, ledger, reward/credit logic, threat handling, corner cases and 24-hour cuts required by the handout.

### Round 3 — Final demo

The fixed Section 6 story remains the backbone: post, scope, match, join, fund, work, catch copied content, accept/release, non-monetary credit, verify/tamper, and handle a twist.

## Success definition

**Success = the judge can follow one project and see who could access what, which AI path processed which data, who contributed what, how many credits the contributor earned, why the reward was calculated, and what protection remains if the project is abandoned.**
