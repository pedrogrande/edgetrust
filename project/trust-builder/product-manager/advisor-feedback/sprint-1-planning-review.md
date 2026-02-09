# Strategic Review: Sprint 1 Planning Artifacts

**Reviewer**: `product-advisor`
**Date**: 2026-02-09
**Files reviewed**: BACKLOG.md, SPRINT-1-TICKETS.md, EPIC-1-SUBTASKS.md, AI_PROMPTS_S1.md, stories/S1-01-schema-and-seed.md
**Grade**: B+

---

## Summary Assessment

The planning is well-structured, internally consistent, and correctly maps to the ONE 6-dimension ontology. The vertical story slicing is appropriate for AI agents and the dependency graph is sound. However, there are **five strategic recommendations** that should be addressed before implementation begins — one of which is a **blocking technical risk**.

---

## Dimensional Analysis

### Groups

- Correctly modeled as Colony → Mission hierarchy. Seed data is minimal and right for S1.
- **Gap**: No "Mission Joining" flow in S1 — members can claim tasks without formally joining a Mission. This is fine for S1 MVP, but the Connections gap should be noted in the backlog.

### People

- Member ID generation (FE-M-XXXXX) is well-specified. Auth via email + 6-digit code is pragmatic.
- **Concern**: S1-01 puts `createMember` in `queries.ts`, but member creation is actually an auth concern (S1-02). The query helper should exist, but the **story boundary is blurred** — document that S1-01 creates the helper and S1-02 is the consumer.

### Things

- Tasks and Criteria are solid. Task states and claim statuses have proper CHECK constraints.
- **Concern**: S1-01 seeds tasks in `open` state with `published_at` set, which **bypasses the Draft→Open lifecycle**. Acceptable for seed data, but should be explicitly noted as a shortcut. The quasi-smart contract spec (doc 05) says publishing is a one-way gate — seed data shouldn't set a precedent that Open tasks can be created without going through Draft.

### Connections

- Claims and Proofs are well-modeled. The `claim-engine.ts` is correctly identified as the contract engine.
- **RISK (BLOCKING)**: The atomic transaction requirement for auto-approve (create claim + create proofs + approve claim + update trust_score_cached + log 3 events — all in one transaction) is the hardest technical challenge in S1. See Recommendation #1 below.

### Events

- Append-only design is correct. The REVOKE UPDATE/DELETE is documented but only as a comment, not enforced in the schema DDL itself. The `qa-engineer` validation in S1-06 is the right place to catch this.
- **Gap**: No `event_type` taxonomy is defined. The prompts mention `member.created`, `claim.submitted`, `claim.approved`, `trust.updated` — but there's no canonical list. See Recommendation #2 below.

### Knowledge

- Trust Score derivation is correctly specified as derived-not-stored. The `trust_score_cached` vs derived comparison in the dashboard API is a smart integrity check.
- **Gap**: No aggregation query is pre-defined for the dashboard's "dimension breakdown" — it requires joining `claims → task_incentives → incentives` which is a non-trivial SQL query. Consider adding a specific query signature in S1-01's `queries.ts` spec.

---

## Strategic Recommendations

### 1. Resolve the NeonDB Transaction Strategy (BLOCKING — must fix before S1-04)

The `@neondatabase/serverless` HTTP driver (`neon()`) executes each SQL statement as an independent HTTP request. Multi-statement transactions require either:

- **Option A**: Use `neon()` with the `transaction()` method (added in recent versions — need to verify availability)
- **Option B**: Use `@neondatabase/serverless` WebSocket driver with `Pool` for transaction support (may not work on Cloudflare Workers)
- **Option C**: Wrap everything in a single `DO $$ ... END $$` PL/pgSQL block

**Why this is blocking**: The claim-engine's atomicity guarantee is the core quasi-smart contract promise. If claim submission, approval, trust score update, and event logging can't happen atomically, the contract model breaks and the Genesis audit trail becomes unreliable.

**Action for product-owner**:

- [x] Add a subtask to S1-01: "Research and document NeonDB transaction pattern for Cloudflare Workers" — **DONE**: Researched and confirmed `sql.transaction()` for non-interactive + `Pool` via WebSocket for interactive transactions
- [x] Add to S1-01 deliverables: A `transaction()` helper exported from `connection.ts` — **DONE**: `withTransaction()` helper added to S1-01 story, tickets, subtasks, and prompts
- [x] Add this to the S1-01 acceptance criteria — **DONE**
- [x] Note in S1-04 that it depends on this pattern being established — **DONE**: S1-04 prompt already references `withTransaction()`

---

### 2. Define the Event Type Taxonomy (fix in S1-01 types)

The stories reference event types inconsistently across files. A canonical enum prevents drift and ensures migration readiness (event types must be stable identifiers).

**Action for product-owner**:

- [x] Add an `EventType` enum requirement to S1-01's `src/types/trust-builder.ts` spec — **DONE**: Full enum with S1 types + S2 placeholders added to story, subtask 1.1.4, and S1-01 prompt

```typescript
export enum EventType {
  // S1: Core lifecycle
  MEMBER_CREATED = 'member.created',
  CLAIM_SUBMITTED = 'claim.submitted',
  CLAIM_APPROVED = 'claim.approved',
  CLAIM_REJECTED = 'claim.rejected', // placeholder for S2
  TRUST_UPDATED = 'trust.updated',

  // S2: Admin & reviewer workflows
  TASK_CREATED = 'task.created', // placeholder
  TASK_PUBLISHED = 'task.published', // placeholder
  TASK_CANCELLED = 'task.cancelled', // placeholder
  MEMBERSHIP_JOINED = 'membership.joined', // placeholder
  CLAIM_REVISION_REQUESTED = 'claim.revision_requested', // placeholder
}
```

- [x] Reference this enum in all AI prompts where event types are mentioned — **DONE**: Key Conventions updated, S1-01 and S1-02 prompts updated
- [x] Add this to S1-01 acceptance criteria — **DONE**

---

### 3. Clarify the Auth Session Secret Strategy (fix in S1-02)

S1-02 says "sign a cookie value using a SECRET env var" and "use Web Crypto API" but leaves too much to interpretation.

**Action for product-owner** — add to S1-02 story (when written):

- [ ] Specify signing algorithm: HMAC-SHA256 via `crypto.subtle.sign()` — TO DO when writing S1-02 story
- [ ] Specify cookie name: `tb_session` — TO DO when writing S1-02 story
- [ ] Specify cookie payload format: `{memberId}.{expiresAt}.{signature}` — TO DO when writing S1-02 story
- [ ] Specify that `SESSION_SECRET` env var must be at least 32 characters — TO DO when writing S1-02 story
- [ ] Note: `SESSION_SECRET` must be provisioned in `.dev.vars` (Cloudflare local) and Cloudflare dashboard (production) — TO DO when writing S1-02 story

---

### 4. Restructure S1-06 (Event Ledger) — split the cross-cutting concern

S1-06 is described as "woven through all stories" but also listed as a 3-point standalone ticket. This creates confusion about when the `logEvent()` function is created.

**Current problem**: S1-02 (Auth) needs `logEvent()` to log `member.created`. But S1-06 is listed as a separate story that depends on "S1-01 through S1-05."

**Action for product-owner**:

- [x] Move `logEvent()` creation into S1-01 — **DONE**: Added as subtask 1.1.6, added to S1-01 acceptance criteria, files list, and prompt
- [x] Update S1-01 acceptance criteria to include: "`src/lib/events/logger.ts` exports a working `logEvent()` function" — **DONE**
- [x] Reduce S1-06 scope to: Events API endpoint, export function, and `qa-engineer` immutability validation only — **DONE**: S1-06 subtasks rewritten, SPRINT-1-TICKETS scope updated
- [x] Update the AI prompt for S1-01 to include creating `logger.ts` — **DONE**: Item 6 added to S1-01 prompt
- [x] Update the AI prompt for S1-02 to remove "create this file if it doesn't exist yet" — **DONE**: Now says "already created in S1-01. Import and use it."

---

### 5. Add Concrete Smoke Tests to Every Story (improve DoD)

Each story's DoD says "Acceptance criteria pass (validated by `qa-engineer`)" but doesn't define a runnable script.

**Action for product-owner** — add a `## Smoke Test` section to each story file with a numbered HTTP request sequence. Example for S1-04:

```
## Smoke Test (qa-engineer runs this)

1. POST /api/trust-builder/auth/signin { email: "test@example.com" }
2. Read verification code from server logs
3. POST /api/trust-builder/auth/verify { email: "test@example.com", code: <code> }
4. GET /api/trust-builder/tasks → note first task ID and criterion ID
5. POST /api/trust-builder/claims { taskId: <id>, proofs: [{ criterionId: <id>, content: "Test reflection" }] }
6. ASSERT: Response includes status "approved" and points > 0
7. GET /api/trust-builder/dashboard
8. ASSERT: trustScore > 0 and dimensions.participation > 0
9. Query DB: SELECT COUNT(*) FROM events WHERE actor_id = <memberId>
10. ASSERT: At least 3 events (claim.submitted, claim.approved, trust.updated)
```

---

## Migration Readiness Notes

| Aspect             | Status                 | Notes                                                                                                                                                                                 |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UUID primary keys  | ✅ Ready               | All tables use gen_random_uuid()                                                                                                                                                      |
| Stable member IDs  | ✅ Ready               | FE-M-XXXXX format is portable                                                                                                                                                         |
| Append-only events | ⚠️ Partially ready     | Documented but not enforced at DB level in S1                                                                                                                                         |
| Content hashing    | 🔲 S2                  | File upload hashing deferred — correct for S1                                                                                                                                         |
| Event export       | ⚠️ S1-06               | Export function specified but needs PII scrubbing verification                                                                                                                        |
| trust_score_cached | ⚠️ Needs clarification | If Trust Score is derived, the migration only needs the events table. Document explicitly that `trust_score_cached` is **not** migrated — only event-derived scores are authoritative |
| Seed data UUIDs    | ⚠️ Needs clarification | S1-01 says "use deterministic UUIDs" — clarify whether these are hardcoded constants or generated-once-and-stored. For migration, ID stability matters                                |

---

## Grade: B+

**Rationale**: The planning is thorough, ontology-aligned, and well-structured for AI agent execution. The dependency graph is sound and the story slicing is appropriate. Points deducted for:

1. **Unresolved NeonDB transaction strategy** — blocking technical risk for the core contract engine
2. **Undefined event type taxonomy** — migration readiness gap
3. **S1-06 boundary confusion** — cross-cutting concern mixed with standalone story

All three are easily fixable before implementation begins.

---

## Handoff Decision

**APPROVED FOR IMPLEMENTATION** — product-owner has addressed all blocking items:

1. ✅ NeonDB transaction pattern added to S1-01 (Recommendation #1) — `withTransaction()` helper using `Pool` via WebSocket
2. ✅ EventType enum added to S1-01 types spec (Recommendation #2) — canonical taxonomy with S1 types + S2 placeholders
3. ✅ `logEvent()` moved from S1-06 into S1-01 (Recommendation #4) — subtask 1.1.6, all prompts updated

Recommendations #3 (auth session details) and #5 (smoke tests) will be addressed when writing S1-02 through S1-06 stories.

**S1-01 is ready for handoff to `fullstack-developer`.**

---

_Reviewed by `product-advisor` — 2026-02-09_
