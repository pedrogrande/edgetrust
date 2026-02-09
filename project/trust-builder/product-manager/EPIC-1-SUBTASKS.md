# Sprint 1 — Subtask Breakdown & Implementation Order

This document decomposes each Sprint 1 story into developer-level subtasks with file paths, sequence order, and verification steps for the `fullstack-developer` agent.

---

## S1-01: Database Schema, Connection & Seed Data (3 pts)

### Subtask 1.1.1: NeonDB Connection Helper

- **File**: `src/lib/db/connection.ts`
- **Work**: Create a reusable `getDb()` function using `@neondatabase/serverless` `neon()` HTTP driver. Connection string from `DATABASE_URL` env var. Export typed query helper. Also export a `withTransaction()` helper that uses `Pool` via WebSocket for interactive multi-step transactions within a single request handler.
- **Verify**: Import and call from a test API route; confirm connection to NeonDB. Verify `withTransaction()` can run BEGIN/INSERT/COMMIT atomically.

### Subtask 1.1.2: Schema SQL

- **File**: `src/lib/db/schema.sql`
- **Work**: Write the full DDL for all 10 tables (groups, members, tasks, criteria, incentives, task_incentives, memberships, claims, proofs, events). Include:
  - UUID primary keys (use `gen_random_uuid()`)
  - Foreign key constraints with ON DELETE rules
  - Indices on: `tasks.group_id`, `tasks.state`, `claims.member_id`, `claims.task_id`, `events.entity_id`, `events.actor_id`
  - `events` table with BIGSERIAL PK and no UPDATE/DELETE grants
  - CHECK constraints: `tasks.state IN ('draft','open','in_progress','complete','expired','cancelled')`, `claims.status IN ('submitted','under_review','revision_requested','approved','rejected')`
- **Verify**: Run against NeonDB; all tables created, constraints enforced.

### Subtask 1.1.3: Seed Data SQL

- **File**: `src/lib/db/seed.sql`
- **Work**: Insert Colony group, Season 0 mission, 5 incentive types, 2 starter tasks with criteria and task_incentives. Use deterministic UUIDs for seed data so tests can reference them.
- **Verify**: After running seed, `SELECT * FROM tasks` returns 2 rows; `SELECT * FROM incentives` returns 5 rows.

### Subtask 1.1.4: TypeScript Types & EventType Enum

- **File**: `src/types/trust-builder.ts`
- **Work**: Define interfaces: `Group`, `Member`, `Task`, `Criterion`, `Incentive`, `TaskIncentive`, `Membership`, `Claim`, `Proof`, `TrustEvent`. Match column names exactly. Export enums for task states, claim statuses, proof types, verification methods. **Also export `EventType` enum** with canonical event types: `member.created`, `claim.submitted`, `claim.approved`, `claim.rejected` (placeholder), `trust.updated`, plus S2 placeholders (`task.created`, `task.published`, `task.cancelled`, `membership.joined`, `claim.revision_requested`). All stories must import `EventType` — never use raw strings.
- **Verify**: Types importable from `@/types/trust-builder`. `EventType.CLAIM_SUBMITTED === 'claim.submitted'`.

### Subtask 1.1.5: Query Helpers

- **File**: `src/lib/db/queries.ts`
- **Work**: Typed functions for common queries: `getOpenTasks()`, `getTaskById(id)`, `getMemberByEmail(email)`, `createMember(data)`, `getClaimsByMember(memberId)`, `getApprovedPointsByMember(memberId)` (includes dimension breakdown via `claims → task_incentives → incentives` join). Each returns typed results.
- **Verify**: Each query compiles and returns correct types.

### Subtask 1.1.6: Event Logger Utility

- **File**: `src/lib/events/logger.ts`
- **Work**: Export `logEvent({ sql, actorId, entityType, entityId, eventType, metadata })` that inserts into the events table. Must accept `EventType` enum values for `eventType` parameter. This is the cross-cutting foundation used by S1-02 through S1-05.
- **Verify**: Calling `logEvent()` with test data creates a row in `events` table.

---

## S1-02: Email Auth & Member Identity (5 pts)

### Subtask 1.2.1: Auth Utilities

- **File**: `src/lib/auth/index.ts`
- **Work**: Implement `generateCode()` (6-digit numeric), `sendVerificationEmail(email, code)` (stub for S1 — log to console), `createSession(memberId)` → signed cookie, `validateSession(request)` → member or null, `getCurrentUser(request)` → Member.
- **Verify**: Unit-testable functions.

### Subtask 1.2.2: Sign-In API

- **File**: `src/pages/api/trust-builder/auth/signin.ts`
- **Work**: POST handler — accept `{ email }`, generate code, store in DB or temp table, send (stub). Return 200.
- **Verify**: POST with valid email returns 200.

### Subtask 1.2.3: Verify API

- **File**: `src/pages/api/trust-builder/auth/verify.ts`
- **Work**: POST handler — accept `{ email, code }`, validate, find-or-create Member (assign FE-M-XXXXX), set session cookie, log `member.created` Event if new. Return member profile.
- **Verify**: Valid code → session set, member created with FE-M-00001 format.

### Subtask 1.2.4: Me API + Sign-Out

- **Files**: `src/pages/api/trust-builder/auth/me.ts`, `src/pages/api/trust-builder/auth/signout.ts`
- **Work**: GET /me returns current member from session or 401. POST /signout clears cookie.
- **Verify**: Authenticated request returns member; unauthenticated returns 401.

### Subtask 1.2.5: Sign-In Page

- **File**: `src/pages/trust-builder/signin.astro`
- **Work**: Astro page with React form (`client:load`). Two steps: enter email → enter code. On success, redirect to `/trust-builder/dashboard`.
- **Verify**: Full sign-in flow works in browser.

---

## S1-03: Public Task List & Mission Pages (3 pts)

### Subtask 1.3.1: Tasks API

- **File**: `src/pages/api/trust-builder/tasks.ts`
- **Work**: GET handler — return all tasks with `state = 'open'`, joined with group name, incentives, and total points. Support `?mission=<group_id>` filter.
- **Verify**: Returns correct JSON with task details and incentive badges.

### Subtask 1.3.2: Missions API

- **File**: `src/pages/api/trust-builder/missions.ts`
- **Work**: GET handler — return all groups with `type = 'mission'` and `status = 'active'`.
- **Verify**: Returns seeded mission.

### Subtask 1.3.3: Task List Page + Components

- **Files**: `src/pages/trust-builder/tasks.astro`, `src/components/trust-builder/TaskList.tsx`, `src/components/trust-builder/TaskCard.tsx`, `src/components/trust-builder/TaskFilter.tsx`
- **Work**: SSR page fetches tasks on server. TaskCard shows title, mission badge, incentive pills, total points. TaskFilter dropdown for missions. Mobile-responsive grid.
- **Verify**: `/trust-builder/tasks` renders tasks without auth. Filter works. Mobile layout correct.

### Subtask 1.3.4: Trust Builder Hub Page

- **File**: `src/pages/trust-builder/index.astro`
- **Work**: Landing page with hero section explaining Trust Builder, links to tasks page and sign-in. Show mission count and task count from DB.
- **Verify**: Page renders with correct counts.

---

## S1-04: Claim Submission (5 pts)

### Subtask 1.4.1: Task Detail API

- **File**: `src/pages/api/trust-builder/tasks/[id].ts`
- **Work**: GET handler — return full task detail with criteria, incentives, completion count. Include whether current user has already claimed.
- **Verify**: Returns task with all criteria and incentives.

### Subtask 1.4.2: Claim Engine (Business Logic)

- **File**: `src/lib/contracts/claim-engine.ts`
- **Work**: `submitClaim(memberId, taskId, proofs[])` — validates eligibility, creates Claim + Proofs in transaction, handles auto-approve flow (approve + update trust score + log events — all atomic). Returns claim with status.
- **Verify**: Auto-approve task → claim approved, trust score incremented, 3 events logged.

### Subtask 1.4.3: Claims API

- **File**: `src/pages/api/trust-builder/claims.ts`
- **Work**: POST — calls claim engine. GET — returns current member's claims with task info.
- **Verify**: POST creates claim; GET returns it.

### Subtask 1.4.4: Task Detail Page + Claim Form

- **Files**: `src/pages/trust-builder/tasks/[id].astro`, `src/components/trust-builder/ClaimForm.tsx`
- **Work**: SSR page shows task detail. If authenticated, show ClaimForm with a textarea per criterion. Submit button calls POST /claims. Show success/error feedback. If not authenticated, show "Sign in to claim" CTA.
- **Verify**: End-to-end: sign in → view task → submit claim → see success → trust score updated.

---

## S1-05: Member Dashboard (3 pts)

### Subtask 1.5.1: Dashboard API

- **File**: `src/pages/api/trust-builder/dashboard.ts`
- **Work**: GET — returns `{ trustScore, rank, dimensions: { participation, collaboration, innovation, leadership, impact }, claims: [...], availableTasks: count }`. Trust score derived from `SUM(task_incentives.points) JOIN claims WHERE approved`.
- **Verify**: Score matches sum of approved claims.

### Subtask 1.5.2: Dashboard Page + Components

- **Files**: `src/pages/trust-builder/dashboard.astro`, `src/components/trust-builder/TrustScoreCard.tsx`, `src/components/trust-builder/IncentiveBreakdown.tsx`, `src/components/trust-builder/ClaimHistory.tsx`
- **Work**: TrustScoreCard shows total + rank. IncentiveBreakdown uses Recharts BarChart. ClaimHistory shows table with status badges. Auth-gated page.
- **Verify**: Dashboard renders with correct data. Chart shows 5 dimensions. Unauthenticated users redirected.

---

## S1-06: Event Ledger (3 pts — validation & API layer)

### Subtask 1.6.1: Events API

- **File**: `src/pages/api/trust-builder/events.ts`
- **Work**: GET — returns events for current member (or for an entity if admin).
- **Verify**: Returns chronological event list.

### Subtask 1.6.2: Export Utility

- **File**: `src/lib/events/export.ts`
- **Work**: `exportMemberEvents(memberId)` → JSON array of all events for a member. Verify no PII leakage — use `member_id` not email in event metadata.
- **Verify**: Export matches DB records. No email addresses in output.

### Subtask 1.6.3: Verification Utility

- **File**: `src/lib/events/verify.ts`
- **Work**: `verifyTrustScoreConsistency(memberId)` — compare trust_score_cached against SUM of approved claim points from events. Report discrepancies.
- **Verify**: Returns match/mismatch status.

### Subtask 1.6.4: Immutability Verification (qa-engineer)

- **Work**: Write a test script that attempts `UPDATE events SET event_type = 'hacked' WHERE id = 1` and `DELETE FROM events WHERE id = 1` — both must fail.
- **Verify**: Confirm permission denied errors.

---

## Implementation Sequence (Recommended)

| Phase | Subtasks                                      | Can Parallelize                 |
| ----- | --------------------------------------------- | ------------------------------- |
| 1     | 1.1.1 → 1.1.2 → 1.1.3 → 1.1.4 → 1.1.5 → 1.1.6 | Sequential (foundation)         |
| 2     | 1.2.1 → 1.2.2 → 1.2.3 → 1.2.4 → 1.2.5         | Auth (uses logEvent from 1.1.6) |
| 3     | 1.3.1 → 1.3.2 → 1.3.3 → 1.3.4                 | Parallel with Phase 2           |
| 4     | 1.4.1 → 1.4.2 → 1.4.3 → 1.4.4                 | After Phase 2+3                 |
| 5     | 1.5.1 → 1.5.2                                 | After Phase 4                   |
| 6     | 1.6.1 → 1.6.2 → 1.6.3 → 1.6.4                 | After Phase 4                   |

---

_Decomposed by Product Owner — 2026-02-09_
