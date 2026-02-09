# Sprint 1 — Trust Builder (Season 0)

**Sprint window**: February 10–23, 2026 (2 weeks)
**Velocity target**: 22 story points
**Goal**: Ship the minimum end-to-end "contract" loop — a member can sign in, browse tasks, submit a claim, see it auto-approved, and view their Trust Score on a dashboard. All actions logged to the Genesis audit trail.

---

## Dependency Graph

```
S1-01 Schema & Seed ──┬──► S1-02 Auth & Identity ──┬──► S1-04 Claim Submission ──► S1-05 Dashboard
                       │                            │
                       ├──► S1-03 Public Task List ──┘
                       │
                       └──► S1-06 Event Ledger (woven through all stories)
```

S1-01 is the foundation. S1-02, S1-03, and S1-06 can begin once S1-01 merges. S1-04 needs both auth and task list. S1-05 needs claims flowing.

---

## Tickets

### S1-01: Database Schema, Connection & Seed Data

- **Points**: 3
- **Agent**: `fullstack-developer`
- **Ontology**: Groups + Things + Connections (schema)

**Scope**:

- Create `src/lib/db/connection.ts` — NeonDB serverless connection using `@neondatabase/serverless` AND `withTransaction()` helper using `Pool` for interactive atomic operations
- Create `src/lib/db/schema.sql` — Full schema per doc 04:
  - `groups` (id UUID, name, type, description, status, parent_group_id, created_at)
  - `members` (id UUID, email, member_id FE-M-XXXXX, display_name, role, trust_score_cached, created_at)
  - `tasks` (id UUID, group_id FK, title, description, state, task_type, max_completions, version, created_by, created_at, published_at)
  - `criteria` (id UUID, task_id FK, description, proof_type, verification_method, sort_order)
  - `incentives` (id UUID, name, description) — seeded with 5 dimensions
  - `task_incentives` (task_id FK, incentive_id FK, points)
  - `memberships` (member_id FK, group_id FK, role, joined_at)
  - `claims` (id UUID, member_id FK, task_id FK, status, submitted_at, reviewed_at, reviewer_id)
  - `proofs` (id UUID, claim_id FK, criterion_id FK, content_text, content_url, content_hash, created_at)
  - `events` (id BIGSERIAL, timestamp TIMESTAMPTZ DEFAULT NOW(), actor_id UUID, entity_type, entity_id UUID, event_type, metadata JSONB)
- Create `src/lib/db/seed.sql` — Seed data:
  - Colony group: "Future's Edge"
  - Mission: "Webinar Series Season 0"
  - 5 Incentive types: Participation, Collaboration, Innovation, Leadership, Impact
  - Task: "Attend Live Webinar" (Simple, auto-approve, 50 Participation pts, unlimited completions)
  - Task: "Basic Webinar Reflection" (Simple, auto-approve, 15 Participation + 10 Innovation pts)
- Create `src/lib/db/queries.ts` — Typed query helpers (incl. dimension breakdown aggregation)
- Create `src/types/trust-builder.ts` — TypeScript interfaces matching all tables + `EventType` enum (canonical event type taxonomy)
- Create `src/lib/events/logger.ts` — `logEvent()` utility used by all subsequent stories

**DoD**:

- [ ] Schema runs clean on NeonDB
- [ ] Seed data populates correctly
- [ ] TypeScript types exported and importable
- [ ] `EventType` enum includes all S1 event types + S2 placeholders
- [ ] `logEvent()` inserts correctly into events table
- [ ] `withTransaction()` helper works for multi-statement atomic operations
- [ ] Connection helper handles serverless edge runtime

---

### S1-02: Email Auth & Member Identity

- **Points**: 5
- **Agent**: `fullstack-developer`
- **Ontology**: People + Events

**Scope**:

- `src/lib/auth/` — Auth utilities:
  - Email-based sign-in (magic link or simple email/code flow)
  - Session management (cookie-based, 14-day expiry)
  - Member ID generation: `FE-M-` + zero-padded sequential number
  - `getCurrentUser(request)` helper for API routes
- `src/pages/api/trust-builder/auth/signin.ts` — POST: initiate sign-in
- `src/pages/api/trust-builder/auth/verify.ts` — GET/POST: verify token/code, set session
- `src/pages/api/trust-builder/auth/signout.ts` — POST: clear session
- `src/pages/api/trust-builder/auth/me.ts` — GET: return current member profile
- `src/pages/trust-builder/signin.astro` — Sign-in page with email form
- Event: log `member.created` on first sign-in

**DoD**:

- [ ] Sign-in flow works end-to-end
- [ ] Member ID assigned on first sign-in (FE-M-00001, FE-M-00002, etc.)
- [ ] Session persists across page loads
- [ ] `getCurrentUser()` returns null for unauthenticated requests
- [ ] `member.created` Event logged

---

### S1-03: Public Task List & Mission Pages

- **Points**: 3
- **Agent**: `fullstack-developer`
- **Ontology**: Groups + Things (read-only)

**Scope**:

- `src/pages/api/trust-builder/tasks.ts` — GET: list Open tasks with mission, incentives, total value
- `src/pages/api/trust-builder/missions.ts` — GET: list active missions
- `src/pages/trust-builder/index.astro` — Trust Builder landing/hub page
- `src/pages/trust-builder/tasks.astro` — Task list page (SSR, no auth required)
- `src/components/trust-builder/TaskCard.tsx` — Card showing task title, mission, incentives, value
- `src/components/trust-builder/TaskFilter.tsx` — Filter by mission (dropdown)
- `src/components/trust-builder/TaskList.tsx` — List/grid of TaskCards

**DoD**:

- [ ] `/trust-builder/tasks` renders all Open tasks from DB
- [ ] Tasks display title, mission name, incentive badges, total points
- [ ] Mission filter works
- [ ] Page loads without auth (public)
- [ ] Mobile-responsive layout

---

### S1-04: Claim Submission (Rich Text + Auto-Approve)

- **Points**: 5
- **Agent**: `fullstack-developer`
- **Ontology**: Connections + Events + Knowledge

**Scope**:

- `src/pages/api/trust-builder/claims.ts` — POST: submit claim; GET: list member's claims
- `src/pages/api/trust-builder/tasks/[id].ts` — GET: single task detail with criteria
- `src/pages/trust-builder/tasks/[id].astro` — Task detail page with "Submit Claim" button
- `src/components/trust-builder/ClaimForm.tsx` — Rich text proof entry per criterion
- `src/lib/contracts/claim-engine.ts` — Business logic:
  - Validate member can claim this task (not maxed, task is Open)
  - Create Claim + Proofs records
  - If all criteria use `auto-approve`: immediately transition to Approved
  - If auto-approved: atomically update member's `trust_score_cached` and create `claim.approved` + `trust.updated` Events
  - All within a single DB transaction

**DoD**:

- [ ] Member can submit a rich-text claim on any Open task
- [ ] Auto-approve tasks: claim approved + trust score updated instantly
- [ ] Events logged: `claim.submitted`, `claim.approved`, `trust.updated`
- [ ] Member cannot claim same task twice (unless max_completions allows)
- [ ] Auth required — unauthenticated users see "Sign in to claim"

---

### S1-05: Member Dashboard & Trust Score Display

- **Points**: 3
- **Agent**: `fullstack-developer`
- **Ontology**: Knowledge + People

**Scope**:

- `src/pages/api/trust-builder/dashboard.ts` — GET: member's trust score, dimension breakdown, claims list
- `src/pages/trust-builder/dashboard.astro` — Dashboard page (auth required)
- `src/components/trust-builder/TrustScoreCard.tsx` — Total score + rank display
- `src/components/trust-builder/IncentiveBreakdown.tsx` — Bar/radar chart using Recharts showing 5 dimensions
- `src/components/trust-builder/ClaimHistory.tsx` — Table of submitted/approved/pending claims
- Trust score calculation: `SUM(task_incentives.points) WHERE claims.status = 'approved' AND claims.member_id = ?` — derived, never manually set

**DoD**:

- [ ] Dashboard shows correct Trust Score (derived from approved claims)
- [ ] Breakdown chart renders 5 incentive dimensions
- [ ] Claim history lists all member's claims with status
- [ ] Rank label shown (Explorer/Contributor/Steward/Guardian based on score thresholds)
- [ ] Auth required — redirects to sign-in if unauthenticated

---

### S1-06: Append-Only Event Ledger

- **Points**: 3
- **Agent**: `fullstack-developer` (implementation) + `qa-engineer` (immutability validation)
- **Ontology**: Events

**Scope** (reduced — `logEvent()` already created in S1-01):

- `src/pages/api/trust-builder/events.ts` — GET: list events for a member or entity (admin only in S1)
- DB-level: document the `REVOKE UPDATE, DELETE ON events FROM app_user` command
- `src/lib/events/export.ts` — `exportMemberEvents(memberId)` → JSON array (verify no PII leakage — use member_id not email)
- `src/lib/events/verify.ts` — verification functions for trust score consistency
- `qa-engineer` validates immutability with a test that attempts UPDATE/DELETE and confirms failure

**DoD**:

- [ ] Every state change in S1 stories generates an Event record
- [ ] Event records include: timestamp, actor_id, entity_type, entity_id, event_type, metadata
- [ ] No UPDATE/DELETE possible on events table (DB permission or app-level guard)
- [ ] `qa-engineer` validates immutability with a test that attempts UPDATE/DELETE and confirms failure
- [ ] JSON export returns complete event history for a member

---

## Sprint 1 Ceremonies

| Ceremony      | When              | Agent                                                              |
| ------------- | ----------------- | ------------------------------------------------------------------ |
| Story handoff | Before each story | `product-owner` → `fullstack-developer`                            |
| Story review  | After each story  | `qa-engineer` validates AC, `product-advisor` grades ontology      |
| Sprint retro  | End of sprint     | `retro-facilitator` captures lessons in `retros/sprint-1-retro.md` |

---

## Risk Register

| Risk                                             | Mitigation                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| NeonDB transaction support on Cloudflare Workers | RESOLVED: `sql.transaction()` for batched; `Pool` via WebSocket for interactive — both work within request handlers |
| NeonDB cold start latency on Cloudflare Workers  | Use connection pooling; test latency early in S1-01                                                                 |
| Auth complexity delays S1-02                     | Fall back to simple email + 6-digit code (no magic-link provider needed)                                            |
| 22 points too ambitious for 2 weeks              | S1-05 (Dashboard) can slip to S2 start if needed — core loop is S1-01→S1-04                                         |
| Astro SSR + React hydration issues               | Minimize `client:load`; keep forms as progressive enhancement                                                       |

---

_Sprint 1 planned by Product Owner — 2026-02-09_
