# Pre-Implementation Review: S1-04 Claim Submission with Auto-Approve Engine

**Reviewer**: product-advisor  
**Type**: Pre-implementation spec review  
**Date**: 2026-02-09  
**Story**: S1-04  
**Documents Reviewed**: S1-04-claim-submission.md, S1-04-HANDOFF.md, schema.sql, trust-builder.ts, logger.ts, connection.ts, 05-smart-contract-behaviour-spec.md, 06-incentive-and-trust-score-rules.md

---

## Summary Assessment

Strong story spec with comprehensive Gherkin scenarios, thorough error handling, and excellent quasi-smart contract understanding. However, there are **2 critical issues** that must be corrected before implementation begins to prevent ontological debt and transaction bugs.

**Pre-Implementation Grade: B+** — Fix the critical issues below, then this becomes an A-tier story.

---

## Critical Issues (Must Fix Before Implementation)

### 1. Ontology Misclassification in Acceptance Criteria

**Problem**: OC-1 says *"Claims are Things"* and OC-2 says *"Proofs are child Things."*

**Reality**: Both `schema.sql` and `trust-builder.ts` explicitly classify Claims and Proofs under the **CONNECTIONS** dimension — not Things.

```
-- schema.sql line 132:
-- CONNECTIONS DIMENSION: Task Completion Claims

-- trust-builder.ts:
-- CONNECTIONS dimension: Task completion claims
-- CONNECTIONS dimension: Evidence per criterion
```

**Why This Matters**: Claims *connect* Members to Tasks. Proofs *connect* Claims to Criteria. They are relationship records, not standalone entities. Getting this wrong would mean the developer starts thinking about claims as independent objects rather than as the bridge between People and Things — which affects how they model future features (claim disputes, claim transfers, etc.).

**Required Fix**:
- OC-1 → "Claims are Connections (linking Members to Tasks, with lifecycle state)"
- OC-2 → "Proofs are Connection details (linking Claims to Criteria with evidence)"

**Note**: The ontology mapping section at the top of the story actually gets this right (it lists Claims under Connections). The contradiction is only in the AC section — likely a copy error.

---

### 2. Event Logger Transaction Incompatibility

**Problem**: The pseudocode in the story calls `logEvent(client, {...})` but the existing `logger.ts` has two functions with different signatures:

- `logEvent({sql, ...})` — uses the **HTTP driver** (cannot participate in transactions)
- `logEventBatch(client, [...])` — uses **PoolClient** (transaction-safe)

The story's `processClaimSubmission` runs inside `withTransaction()`, meaning all event logging **must** use the client-based approach. Calling the HTTP-based `logEvent` inside a transaction would bypass the transaction boundary — events could persist even if the claim rolls back.

**Required Fix**: Direct the developer to either:
1. **Use `logEventBatch(client, events)`** for all event logging inside the transaction (preferred — already exists and tested), or
2. Create a `logEventWithClient(client, params)` helper that mirrors `logEvent` but takes a PoolClient

This is a **correctness issue**, not a style preference. Events logged outside the transaction boundary would violate the quasi-smart contract principle of atomic execution.

---

## High Priority Issues (Should Fix)

### 3. Event Metadata Missing Dimension Breakdown

**Current spec** for `trust.updated`:
```typescript
metadata: { claim_id: claim.id, points_added: pointsEarned }
```

**Problem**: `pointsEarned` is a total number (e.g., 60). But for blockchain migration, we need to know *which dimensions* contributed:

```typescript
// RECOMMENDED metadata shape:
metadata: { 
  claim_id: claim.id, 
  points_added: 60,
  dimensions: { participation: 50, innovation: 10 }
}
```

**Why This Matters**: The migration spec (doc 08) requires dimension-level attestations on-chain. If we only store totals in events, we cannot reconstruct the `DimensionBreakdown` from the Genesis Trail alone — we'd have to reverse-engineer it from `task_incentives` joins, which breaks the "events as source of truth" principle.

Similarly, `claim.approved` should include the dimension breakdown in its metadata, not just `points_earned`.

**Required Fix**: The `calculateTaskPoints` function should return `{ total: number, dimensions: Record<string, number> }` instead of just a number. Include the `dimensions` object in both `claim.approved` and `trust.updated` event metadata.

---

### 4. Auto-Approved `reviewed_at` Timestamp

The `claims` table has `reviewed_at` and `reviewer_id` columns. The story doesn't specify what happens to these fields for auto-approved claims.

**Recommendation**: When auto-approved, set:
- `reviewed_at = NOW()` (marks when the system reviewed it)
- `reviewer_id = NULL` (no human reviewer — system action)
- `review_notes = 'Auto-approved: all criteria use auto-approve verification method'`

**Why This Matters**: This creates a clear audit trail distinguishing three states:
1. "Not yet reviewed" → `reviewed_at IS NULL`
2. "System reviewed instantly" → `reviewed_at = submitted_at, reviewer_id IS NULL`
3. "Human reviewed" → `reviewed_at > submitted_at, reviewer_id IS NOT NULL`

Without this, queries for "unreviewed claims" can't distinguish auto-approved from pending.

---

## Medium Priority Issues (Nice to Have)

### 5. SSR Self-Fetch Anti-Pattern

The `claim.astro` page makes an SSR self-fetch to `/api/trust-builder/claims?task_id={id}` for eligibility checking. This creates an unnecessary HTTP round-trip within the same server process.

**Better approach**:
```typescript
// Instead of:
const response = await fetch(`${Astro.url.origin}/api/trust-builder/claims?task_id=${id}`, ...);

// Do:
import { getClaimByMemberAndTask } from '@/lib/db/queries';
const existingClaim = await getClaimByMemberAndTask(user.id, id);
```

This is faster, simpler, and avoids cookie-forwarding complexity. Same recommendation applies to the task detail page update.

### 6. Unused `ClaimSuccessMessage.tsx`

The file list includes `ClaimSuccessMessage.tsx` but the success flow redirects to dashboard via `window.location.href`. Either:
- **Remove it from S1-04 scope** (redirect is sufficient for now), or
- **Defer to S1-05** where the dashboard page can check for `?claim=...&status=...` query params and show a contextual success banner

Recommendation: Skip for S1-04, implement on the dashboard in S1-05 for better UX.

---

## What the Spec Gets Right ✅

1. **Transaction atomicity** is correctly identified as non-negotiable — the `withTransaction` pattern is well-specified
2. **Auto-approve strictness** (ALL criteria, not majority) prevents accidental approval of peer-review tasks
3. **Duplicate prevention** uses both API-level checks (better UX) and DB constraint (safety net) — defense in depth
4. **Error handling table** is comprehensive with specific HTTP codes and actionable messages — follows sanctuary design principles
5. **Modular architecture** (`claim-engine.ts` separated from API endpoint) enables independent testing of business logic
6. **S1-03 retro learnings** are explicitly incorporated (UUID validation, smart UX, component reuse) — shows team learning velocity
7. **Race condition awareness** (max_completions checked inside transaction) demonstrates mature understanding of concurrent access patterns
8. **Gherkin scenarios cover all paths**: auto-approve, peer-review, duplicate, max-completions — thorough specification

---

## Recommended Changes Summary

| # | Priority | Issue | Required Fix |
|---|----------|-------|-------------|
| 1 | **Critical** | OC-1/OC-2 say Claims/Proofs are "Things" | Change to "Connections" to match schema and types |
| 2 | **Critical** | `logEvent()` uses HTTP driver, unusable in transactions | Use `logEventBatch(client, [...])` inside transactions |
| 3 | High | Event metadata lacks dimension breakdown | Add `dimensions` object to claim.approved and trust.updated metadata |
| 4 | High | Auto-approve doesn't set `reviewed_at` | Set reviewed_at=NOW(), reviewer_id=NULL, add review_notes |
| 5 | Medium | SSR self-fetch for eligibility check | Import query function directly instead of HTTP fetch |
| 6 | Medium | Unused ClaimSuccessMessage component | Remove from S1-04 scope, defer to S1-05 dashboard |

---

## Handoff Decision

### ⚠️ FIX ISSUES #1 AND #2 BEFORE IMPLEMENTATION

Issues #3-4 should be incorporated during implementation (update the story spec or handoff doc).  
Issues #5-6 are at developer discretion.

Once the ontology classification and event logger issues are corrected in the story doc, this is **ready for fullstack-developer to execute**.

---

## Strategic Context

S1-04 is the **most important story in Sprint 1**. It:
- Closes the core engagement loop (Browse → Sign In → Claim → Earn Points)
- Demonstrates quasi-smart contract execution (atomic, auditable, immutable)
- Creates the first entries in the Genesis Trail (events that migrate to blockchain)
- Generates the first trust scores (members see progress for the first time)

Getting the transaction semantics and event metadata right here is **foundational** — every future feature (peer review, slashing, governance) builds on these patterns.

---

**Reviewed by**: product-advisor  
**Date**: 2026-02-09  
**Confidence Level**: High (reviewed story spec, handoff doc, schema, types, logger, smart contract spec, and incentive rules)
