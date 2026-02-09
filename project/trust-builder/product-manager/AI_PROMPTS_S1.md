# AI Agent Prompts — Sprint 1

Use these prompts to run focused implementation sessions for each Sprint 1 story. Each prompt is designed for a specific AI agent and contains:

- Context files to read
- Exact file paths to create/modify
- Acceptance tests to validate
- Handoff instructions to the next agent

**Important**: All paths are relative to the workspace root `/Users/peteargent/apps/000_fe_new/edgetrust/`.

---

## Pre-Sprint: Architecture Context

Before starting any story, the implementing agent should read these files to understand the full context:

```
# Product & ontology context
project/trust-builder/00-product-vision-and-goals.md
project/trust-builder/02-functional-requirements.md
project/trust-builder/04-data-model-and-api-design.md
project/trust-builder/05-smart-contract-behaviour-spec.md
project/trust-builder/06-incentive-and-trust-score-rules.md

# Sprint planning
project/trust-builder/product-manager/BACKLOG.md
project/trust-builder/product-manager/SPRINT-1-TICKETS.md
project/trust-builder/product-manager/EPIC-1-SUBTASKS.md

# Tech stack & conventions
CLAUDE.md
astro.config.mjs
tsconfig.json
package.json
src/styles/global.css
src/config/site.ts
```

### Key Conventions

- **Framework**: Astro 5 with `output: 'server'` and Cloudflare adapter
- **Package manager**: `bun` (not npm/yarn)
- **Database**: NeonDB via `@neondatabase/serverless` — HTTP driver (`neon()`) for one-shot queries; `sql.transaction([...])` for non-interactive batched transactions; `Pool` via WebSocket for interactive transactions within request handlers
- **UI**: React 19 + shadcn/ui. Use `client:load` for interactive islands
- **Styling**: Tailwind v4 with HSL colors in `@theme` blocks. Use semantic tokens (`bg-background`, `text-foreground`)
- **Types**: Strict TypeScript. Path aliases: `@/*` = `src/*`
- **API routes**: Astro server endpoints in `src/pages/api/` — export `GET`, `POST`, etc.
- **State**: Nanostores for client-side reactivity
- **Charts**: Recharts (already installed)
- **Auth**: Server-side sessions via signed cookies. No JWT for S1.
- **Events**: Every state change must call `logEvent()` from `src/lib/events/logger.ts` using `EventType` enum values from `src/types/trust-builder.ts` — never raw strings

---

## S1-01: Database Schema, Connection & Seed Data

**Agent**: `fullstack-developer`
**Points**: 3
**Depends on**: None (start here)

### Prompt

```
You are implementing the database foundation for Trust Builder, a task-based
activity tracking app built with Astro 5 + NeonDB.

READ THESE FILES FIRST:
- project/trust-builder/04-data-model-and-api-design.md (schema spec)
- project/trust-builder/product-manager/EPIC-1-SUBTASKS.md (subtasks 1.1.1–1.1.5)
- CLAUDE.md (tech conventions)

CREATE THESE FILES:

1. src/lib/db/connection.ts
   - Use `import { neon } from '@neondatabase/serverless'`
   - Export `sql` instance from `neon(import.meta.env.DATABASE_URL)`
   - Export a typed `query<T>()` helper that wraps sql with proper typing
   - Export a `withTransaction<T>()` helper using `Pool` from `@neondatabase/serverless`:
     Creates a Pool, connects a client, runs BEGIN/fn/COMMIT (or ROLLBACK),
     then releases client and ends pool. This enables interactive multi-step
     transactions (needed by claim-engine in S1-04).
   - Handle edge runtime constraints (no Node.js APIs)
   - WebSocket Pool/Client connections work on Cloudflare Workers within a
     single request handler

2. src/lib/db/schema.sql
   - Full DDL for 10 tables per the data model doc:
     groups, members, tasks, criteria, incentives, task_incentives,
     memberships, claims, proofs, events
   - Use gen_random_uuid() for UUID defaults
   - events table: BIGSERIAL PK, TIMESTAMPTZ DEFAULT NOW()
   - Add indices on foreign keys and common query columns
   - Add CHECK constraints for state/status enums
   - Add comment at bottom: REVOKE UPDATE, DELETE ON events FROM app_user

3. src/lib/db/seed.sql
   - Colony: "Future's Edge" (type: 'colony')
   - Mission: "Webinar Series Season 0" (type: 'mission', parent = colony)
   - 5 Incentive types: Participation, Collaboration, Innovation, Leadership, Impact
   - Task 1: "Attend Live Webinar" — simple, auto-approve, unlimited completions
     - 1 criterion: "Confirm attendance" (proof_type: 'text', verification: 'auto_approve')
     - task_incentive: Participation = 50 points
   - Task 2: "Basic Webinar Reflection" — simple, auto-approve, unlimited
     - 1 criterion: "Write 200-500 word reflection" (proof_type: 'text', verification: 'auto_approve')
     - task_incentives: Participation = 15, Innovation = 10
   - Both tasks in state 'open' with published_at set

4. src/lib/db/queries.ts
   - Typed query functions using the sql connection
   - getOpenTasks(groupId?: string): Task with group name and incentives
   - getTaskById(id: string): Full task with criteria and incentives
   - getMemberByEmail(email: string): Member or null
   - createMember(email, displayName): Member with generated member_id
   - getClaimsByMember(memberId): Claims with task info
   - getApprovedPointsByMember(memberId): { total, dimensions: {...} }
   - createClaim(memberId, taskId, proofs[]): Claim
   - approveClaim(claimId): void (updates status + trust_score_cached)

5. src/types/trust-builder.ts
   - TypeScript interfaces matching all 10 tables
   - Enums: TaskState, ClaimStatus, ProofType, VerificationMethod, IncentiveDimension
   - EventType enum with canonical event types:
     S1: member.created, claim.submitted, claim.approved, claim.rejected (placeholder),
     trust.updated
     S2 placeholders: task.created, task.published, task.cancelled, membership.joined,
     claim.revision_requested
   - All stories MUST import EventType — never use raw event type strings
   - Utility types: TaskWithIncentives, ClaimWithTask, DimensionBreakdown

6. src/lib/events/logger.ts
   - Export `logEvent({ sql, actorId, entityType, entityId, eventType, metadata })`
   - Inserts into events table
   - `eventType` parameter must accept `EventType` enum values
   - This is the cross-cutting foundation used by S1-02 through S1-05

VERIFY:
- Schema SQL runs without errors on a fresh NeonDB database
- Seed SQL populates all tables correctly
- TypeScript types compile without errors
- All query functions are properly typed
- EventType enum values match expected strings (e.g. EventType.CLAIM_SUBMITTED === 'claim.submitted')
- logEvent() successfully inserts a test event into the events table
- withTransaction() can run a multi-statement INSERT atomically
```

### Handoff

After implementation, hand to `qa-engineer` to verify schema creation and seed data.

---

## S1-02: Email Auth & Member Identity

**Agent**: `fullstack-developer`
**Points**: 5
**Depends on**: S1-01

### Prompt

```
You are implementing email-based authentication for Trust Builder.
The database schema and types from S1-01 are already in place.

READ THESE FILES FIRST:
- project/trust-builder/02-functional-requirements.md (People dimension)
- project/trust-builder/product-manager/EPIC-1-SUBTASKS.md (subtasks 1.2.1–1.2.5)
- src/lib/db/connection.ts (DB connection)
- src/lib/db/queries.ts (existing query helpers)
- src/types/trust-builder.ts (types)
- CLAUDE.md (conventions)

CREATE THESE FILES:

1. src/lib/auth/index.ts
   - generateCode(): string — 6-digit numeric code
   - storeVerificationCode(email, code): void — store in DB (create a
     simple verification_codes table or use a temp approach)
   - validateCode(email, code): boolean — check and expire code
   - createSession(memberId): string — sign a cookie value using a
     SECRET env var (use Web Crypto API, not Node.js crypto)
   - validateSession(cookieValue): string | null — returns memberId
   - getCurrentUser(request: Request): Promise<Member | null>
   - IMPORTANT: Must work on Cloudflare Workers (no Node.js APIs)

2. src/pages/api/trust-builder/auth/signin.ts
   - POST: Accept { email }, generate code, store it, log to console
     (email sending is stubbed for S1). Return { success: true }.
   - Rate limit: max 3 attempts per email per 5 minutes (simple in-memory)

3. src/pages/api/trust-builder/auth/verify.ts
   - POST: Accept { email, code }, validate code.
   - If valid: find or create Member record.
     - New member: assign member_id = "FE-M-" + zero-padded count
       (SELECT COUNT(*) + 1 FROM members, padded to 5 digits)
     - New member: log 'member.created' Event via logEvent()
   - Set session cookie (HttpOnly, Secure, SameSite=Lax, 14-day expiry)
   - Return member profile

4. src/pages/api/trust-builder/auth/me.ts
   - GET: Return current member from session, or 401

5. src/pages/api/trust-builder/auth/signout.ts
   - POST: Clear session cookie, return { success: true }

6. src/pages/trust-builder/signin.astro
   - Astro page using the main Layout
   - React component with client:load for the sign-in form
   - Two steps: email input → code input
   - On success: redirect to /trust-builder/dashboard
   - Clean, mobile-friendly UI using shadcn Card, Input, Button

7. src/components/trust-builder/SignInForm.tsx
   - React component for the two-step sign-in
   - Step 1: email field + "Send Code" button
   - Step 2: 6-digit code input + "Verify" button
   - Error handling and loading states
   - Uses shadcn/ui components

ALSO UPDATE:
- src/lib/events/logger.ts — already created in S1-01. Import and use it.
  Use EventType enum values — never raw strings.
  Call: logEvent({ sql, actorId: member.id, entityType: 'member',
  entityId: member.id, eventType: EventType.MEMBER_CREATED, metadata: { member_id: member.member_id } })

VERIFY:
- Full sign-in flow: enter email → receive code (console) → enter code
  → session set → /auth/me returns member
- First sign-in creates member with FE-M-00001 format
- Second sign-in for same email finds existing member (no duplicate)
- member.created Event logged for new members only
- Unauthenticated /auth/me returns 401
- Sign-out clears session
```

### Handoff

After implementation, hand to `qa-engineer` to test auth flow edge cases.

---

## S1-03: Public Task List & Mission Pages

**Agent**: `fullstack-developer`
**Points**: 3
**Depends on**: S1-01

### Prompt

```
You are implementing the public-facing task browsing experience for
Trust Builder. This page works WITHOUT authentication.

READ THESE FILES FIRST:
- project/trust-builder/02-functional-requirements.md
- project/trust-builder/product-manager/EPIC-1-SUBTASKS.md (subtasks 1.3.1–1.3.4)
- src/lib/db/queries.ts (query helpers)
- src/types/trust-builder.ts (types)
- src/components/ui/ (available shadcn components)
- CLAUDE.md (styling conventions)

CREATE THESE FILES:

1. src/pages/api/trust-builder/tasks.ts
   - GET: Return all tasks with state='open', joined with group name,
     criteria count, incentive names + points, total_value
   - Support query param: ?mission=<group_id> for filtering
   - Return JSON array

2. src/pages/api/trust-builder/missions.ts
   - GET: Return all groups with type='mission' and status='active'
   - Include task count per mission

3. src/pages/trust-builder/index.astro
   - Trust Builder landing page
   - Hero: "Trust Builder — earn recognition for your contributions"
   - Show mission count and open task count (fetched server-side)
   - CTA buttons: "Browse Tasks" → /trust-builder/tasks,
     "Sign In" → /trust-builder/signin
   - Use existing Layout.astro wrapper
   - Clean, inviting design with shadcn Card components

4. src/pages/trust-builder/tasks.astro
   - Server-rendered task list page (no auth required)
   - Fetch tasks and missions on the server in frontmatter
   - Pass data to React components via props
   - Page title: "Available Tasks — Trust Builder"

5. src/components/trust-builder/TaskCard.tsx
   - Card component showing:
     - Task title (prominent)
     - Mission name (badge)
     - Task type badge (Simple/Complex)
     - Incentive pills with point values (color-coded by dimension)
     - Total value (bold)
     - Brief description (truncated to 2 lines)
     - "View Details" link → /trust-builder/tasks/[id]
   - Mobile-responsive
   - Use shadcn Card, Badge components

6. src/components/trust-builder/TaskFilter.tsx
   - Mission filter dropdown using shadcn Select
   - "All Missions" default option
   - Filters task list client-side

7. src/components/trust-builder/TaskList.tsx
   - Takes tasks[] and renders TaskCards in a responsive grid
   - 1 column mobile, 2 columns tablet, 3 columns desktop
   - Empty state: "No tasks available right now"
   - Integrates TaskFilter

VERIFY:
- /trust-builder renders with correct counts
- /trust-builder/tasks shows all seeded Open tasks
- Tasks display title, mission, incentives, total value
- Mission filter works client-side
- Page loads without auth
- Mobile-responsive (test at 375px width)
- Dark mode works correctly
```

### Handoff

After implementation, `product-advisor` reviews ontology alignment of the UI.

---

## S1-04: Claim Submission (Rich Text + Auto-Approve)

**Agent**: `fullstack-developer`
**Points**: 5
**Depends on**: S1-01 + S1-02

### Prompt

```
You are implementing the claim submission flow — the core "contract
fulfillment" mechanic of Trust Builder. This is the most critical story
in Sprint 1.

READ THESE FILES FIRST:
- project/trust-builder/05-smart-contract-behaviour-spec.md (contract lifecycle)
- project/trust-builder/06-incentive-and-trust-score-rules.md (point values)
- project/trust-builder/product-manager/EPIC-1-SUBTASKS.md (subtasks 1.4.1–1.4.4)
- src/lib/db/queries.ts
- src/lib/auth/index.ts (getCurrentUser)
- src/lib/events/logger.ts (logEvent)
- src/types/trust-builder.ts

CREATE THESE FILES:

1. src/pages/api/trust-builder/tasks/[id].ts
   - GET: Return full task detail with criteria, incentives, completion
     count (how many approved claims exist), and whether current user
     (if authenticated) has already claimed
   - Include: task.group name, criteria[], incentives with points

2. src/lib/contracts/claim-engine.ts
   THIS IS THE QUASI-SMART CONTRACT ENGINE. Follow doc 05 strictly.
   - export async function submitClaim(memberId, taskId, proofs[]):
     a) VALIDATE:
        - Task exists and state = 'open'
        - Member hasn't exceeded max claims for this task
        - Proofs array matches criteria count
     b) CREATE (in a single DB transaction):
        - Insert Claim record (status: 'submitted')
        - Insert Proof records (one per criterion, content_text from proofs)
        - Log 'claim.submitted' Event
     c) AUTO-APPROVE (if ALL criteria have verification_method = 'auto_approve'):
        - Update Claim status to 'approved', set reviewed_at
        - Calculate point totals from task_incentives
        - Update member.trust_score_cached (add points)
        - Log 'claim.approved' Event with point details
        - Log 'trust.updated' Event with old→new score
     d) Return claim with status
   - All DB operations must be atomic (single transaction)
   - IMPORTANT: Trust score is a cached value. The dashboard will also
     derive it from approved claims for verification.

3. src/pages/api/trust-builder/claims.ts
   - POST: Auth required. Accept { taskId, proofs: [{ criterionId, content }] }
     Call submitClaim(). Return claim.
   - GET: Auth required. Return current member's claims with task info.

4. src/pages/trust-builder/tasks/[id].astro
   - Server-rendered task detail page
   - Show: title, mission, full description/rationale, acceptance criteria,
     incentives with points, completion count
   - If authenticated: show ClaimForm
   - If not authenticated: show "Sign in to submit a claim" CTA
   - If user already claimed: show "You've already claimed this task"

5. src/components/trust-builder/ClaimForm.tsx
   - React component (client:load)
   - For each criterion: show description + textarea for proof text
   - Submit button calls POST /api/trust-builder/claims
   - On success: show success message with points earned
     (if auto-approved) or "Claim submitted — pending review"
   - Loading state during submission
   - Error handling with user-friendly messages
   - Uses shadcn Card, Textarea, Button, Alert

VERIFY:
- End-to-end flow: sign in → view task → fill proof → submit →
  claim approved → trust score updated
- Events logged: claim.submitted, claim.approved, trust.updated
- Member cannot claim same task twice
- Unauthenticated users see "Sign in" CTA, not the form
- Invalid proofs (empty text) rejected with clear error
- Trust score correctly incremented (check DB directly)
```

### Handoff

This is the critical path. After implementation, `qa-engineer` must validate the contract engine logic and event integrity.

---

## S1-05: Member Dashboard & Trust Score Display

**Agent**: `fullstack-developer`
**Points**: 3
**Depends on**: S1-04

### Prompt

```
You are implementing the member dashboard — the "reward visibility"
layer that makes contributions legible.

READ THESE FILES FIRST:
- project/trust-builder/06-incentive-and-trust-score-rules.md
- project/trust-builder/product-manager/EPIC-1-SUBTASKS.md (subtasks 1.5.1–1.5.2)
- src/lib/db/queries.ts (getApprovedPointsByMember, getClaimsByMember)
- src/types/trust-builder.ts

CREATE THESE FILES:

1. src/pages/api/trust-builder/dashboard.ts
   - GET: Auth required.
   - Return:
     {
       member: { id, member_id, display_name, email, role },
       trustScore: number, (derived: SUM of approved claim points)
       rank: string, (Explorer 0-249, Contributor 250-499,
                      Steward 500-999, Guardian 1000+)
       dimensions: {
         participation: number,
         collaboration: number,
         innovation: number,
         leadership: number,
         impact: number
       },
       claims: [{ id, task_title, status, points_earned, submitted_at }],
       stats: {
         tasksCompleted: number,
         claimsPending: number,
         availableTasks: number
       }
     }
   - IMPORTANT: trustScore must be DERIVED by querying approved claims,
     not just reading trust_score_cached. Compare both and log a warning
     if they differ (data integrity check).

2. src/pages/trust-builder/dashboard.astro
   - Auth-gated page (redirect to /trust-builder/signin if not authenticated)
   - Fetch dashboard data server-side
   - Clean layout with sections for score, chart, and history

3. src/components/trust-builder/TrustScoreCard.tsx
   - Large trust score number display
   - Rank badge (Explorer/Contributor/Steward/Guardian)
   - Member ID shown (FE-M-XXXXX)
   - Stats: tasks completed, claims pending
   - Uses shadcn Card

4. src/components/trust-builder/IncentiveBreakdown.tsx
   - Recharts BarChart showing 5 dimensions
   - Each bar color-coded:
     Participation=blue, Collaboration=green, Innovation=purple,
     Leadership=amber, Impact=red
   - Responsive sizing
   - Uses Recharts (already installed)
   - client:load for interactivity

5. src/components/trust-builder/ClaimHistory.tsx
   - Table of claims: task title, status (badge), points, date
   - Status badges: Approved=green, Pending=yellow, Rejected=red
   - Empty state: "No claims yet. Browse available tasks!"
   - Link to task detail
   - Uses shadcn Table, Badge

VERIFY:
- Dashboard shows correct Trust Score (matches sum of approved claims)
- Dimension breakdown chart renders with correct values
- Claim history shows all claims with correct statuses
- Rank label correct for score thresholds
- Unauthenticated users redirected to sign-in
- Zero-state dashboard works (new member, no claims)
- Mobile-responsive
```

---

## S1-06: Event Ledger Validation

**Agent**: `qa-engineer`
**Points**: 3
**Depends on**: S1-01 through S1-05

### Prompt

```
You are validating the Trust Builder event ledger — the "Genesis audit
trail" that is the foundation for future blockchain migration.

NOTE: The logEvent() utility was already created in S1-01. This story
focuses on the Events API, export, verification, and immutability testing.

READ THESE FILES FIRST:
- project/trust-builder/05-smart-contract-behaviour-spec.md (section 6: ledger)
- project/trust-builder/08-migration-and-audit-strategy.md
- src/lib/events/logger.ts (already exists from S1-01)
- src/types/trust-builder.ts (EventType enum)
- src/lib/db/schema.sql (events table)

VALIDATE THESE PROPERTIES:

1. COMPLETENESS: Run through the full user journey:
   - Sign in (new member) → member.created event
   - View tasks (no event needed)
   - Submit claim → claim.submitted event
   - Auto-approve → claim.approved event + trust.updated event
   Verify ALL expected events exist with correct metadata.

2. IMMUTABILITY: Write a test (can be a script or API test):
   - Attempt UPDATE on events table → must fail
   - Attempt DELETE on events table → must fail
   - Document the DB permission setup needed if not yet applied

3. CONSISTENCY: Write a verification function:
   - For each member: SUM approved claim points from events must equal
     the dashboard trust score
   - Report any discrepancies

4. EXPORT: Verify the export function:
   - Call exportMemberEvents(memberId)
   - Confirm output includes all events with correct fields
   - Confirm no PII leakage (member email should not appear in event
     metadata — only member_id)

CREATE THESE FILES:
- src/lib/events/verify.ts — verification functions (trust score consistency check)
- src/lib/events/export.ts — export function with PII scrubbing (use member_id not email)
- src/pages/api/trust-builder/events.ts — GET events for member/entity

REPORT:
- List of all event types generated by the system
- Whether immutability is enforced at DB level or app level
- Any discrepancies found in trust score calculations
- Recommendations for Sprint 2 improvements
```

---

## Post-Sprint: Product Advisor Review

**Agent**: `product-advisor`

### Prompt

```
Review the Sprint 1 implementation of Trust Builder for ontology
alignment and migration readiness.

READ:
- All files in src/lib/db/, src/lib/contracts/, src/lib/events/
- All files in src/pages/trust-builder/ and src/pages/api/trust-builder/
- project/trust-builder/02-functional-requirements.md (6-dimension mapping)
- project/trust-builder/08-migration-and-audit-strategy.md

GRADE (A-F) on these criteria:
1. Ontology alignment: Do the 6 dimensions map correctly to code?
2. Contract integrity: Does the claim engine behave like a quasi-smart contract?
3. Event fidelity: Is the audit trail complete and migration-ready?
4. Code quality: Is the implementation clean, typed, and maintainable?
5. UX alignment: Does the UI serve the personas (Alex, Sarah, Pete)?

OUTPUT a review file at: project/trust-builder/retros/sprint-1-advisor-review.md
```

---

## Post-Sprint: Retrospective

**Agent**: `retro-facilitator`

### Prompt

```
Conduct a retrospective for Trust Builder Sprint 1.

READ:
- project/trust-builder/product-manager/SPRINT-1-TICKETS.md (planned)
- project/trust-builder/retros/sprint-1-advisor-review.md (advisor grade)
- Any test results or qa-engineer reports

CAPTURE in project/trust-builder/retros/sprint-1-retro.md:
1. What went well
2. What didn't go well
3. What we learned
4. Action items for Sprint 2
5. Velocity actual vs planned (22 points target)
6. Recommendations for story sizing and agent workflow
```

---

_AI Agent Prompts prepared by Product Owner — 2026-02-09_
