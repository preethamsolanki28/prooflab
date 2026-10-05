# Design — Gardenia 2K26 MVP v2

## Design direction

**Trustworthy · Private · Accountable**

The UI should feel like a serious research/governance workspace, not a flashy AI demo.

## Visual system

- Primary: deep indigo `#3730A3`
- Background: `#F8FAFC`
- Surface: `#FFFFFF`
- Text: `#0F172A`
- Muted: `#64748B`
- Border: `#E2E8F0`
- Success: `#166534`
- Warning: `#92400E`
- Danger: `#B91C1C`

## Font

Inter/system sans.

## Screens

### `/login`

Seeded synthetic accounts:
- Sponsor
- Student / Arjun
- Expert
- Admin

### `/projects`

Public project summaries.

### `/projects/[id]`

Tabs:
1. Overview
2. Charter
3. AI Workspace
4. Contributions
5. Credits & Rewards
6. Audit

### Sponsor

- Create/post project.
- Set sensitivity: Public / Confidential / Mixed.
- Add confidential brief.
- Publish charter.
- Fund milestone.
- Withdraw project (demo/controlled action).

### Student

- View public project.
- Accept charter.
- Unlock confidential brief.
- See watermark.
- Ask public/confidential AI question.
- Submit contribution.
- View Research Credits and reward.

### Expert

- Review contribution.
- Score impact.
- Declare conflict.

### Admin

- Verify users.
- Audit ledger.
- Resolve dispute.
- Open Tamper Lab.
- View sponsor withdrawal protection state.

## Key UI patterns

### AI route badge

Every AI result clearly shows:

```text
PUBLIC DATA → CLOUD AI
```

or

```text
CONFIDENTIAL DATA → LOCAL AI
```

Do not use vague “AI processing” labels.

### Private brief

Before acceptance:

> 🔒 Confidential — accept the charter to unlock.

After acceptance:

> 🔓 Confidential brief unlocked.

Overlay a viewer-specific watermark:

```text
ARJUN · RET-EDGE-001 · 12:34
```

### Research Credits

Show the current derived total:

```text
Research Credits: 14

+5  Fundus preprocessing contribution
+4  Edge evaluation notes
+5  Reviewed model-comparison result
```

### Contribution review

```text
Quality     2/2
Usefulness  2/2
Evidence    1/1
Impact      5/5
Credits     +5
```

### Reward explanation

```text
Student pool: ₹40,000
Arjun credit weight: 8
Total student weight: 20
Share: 40%
Amount: ₹16,000
```

### Sponsor withdrawal

Show a visible status card:

```text
PROJECT STATUS
Sponsor withdrew the project.

New work: STOPPED
Accepted credits: PROTECTED
Escrow: UNDER ACCEPTANCE/REVIEW
```

### Offline/fallback state

When an action cannot reach the backend:

```text
Saved locally as PENDING SYNC
It is not final until the server accepts it.
```

If charter version changed:

```text
Sync conflict
Your action was based on Charter v1.
Current version: v2.
Review and resubmit.
```

## Loading/error states

### Cloud AI

> “Cloud AI is temporarily unavailable. Using the saved public-task result.”

### Local AI

> “Local AI is unavailable. Confidential data was not sent to the cloud.”

### Database

> “Saved as pending sync. Final credit/reward will be calculated by the server.”

Never show an infinite spinner.

## Demo seed

### Funded project

**Low-cost detection of diabetic retinopathy from fundus images on edge devices**

Budget: ₹1,00,000.

Seed:
- sponsor
- 3 students
- one eligible expert
- one conflicted expert
- public summary
- confidential brief
- charter v1

### Non-monetary project

**Open-source accessibility benchmark for Indian educational websites**

Reward: credential, credit, recognition; no payment.

### Integrity seed

Two similar contribution snippets:

```text
Similarity: 0.91
Threshold: 0.85
Status: FLAGGED FOR REVIEW
```

### Withdrawal seed

A copy of the funded project can be shown as `SPONSOR_WITHDRAWN` with accepted credits preserved.

## Mobile

Basic responsive behavior only:
- one-column cards;
- horizontal table scroll;
- no critical action hidden behind desktop-only UI.

## Do not design

- fancy social feed;
- complex analytics dashboard;
- blockchain visuals;
- token/crypto UI;
- multiple agent avatars;
- elaborate admin console.
