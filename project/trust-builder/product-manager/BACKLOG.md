# Trust Builder — Season 0 Backlog

**Last updated**: 2026-02-11
**Season 0 window**: February 10 – March 31, 2026
**Status**:

- Sprint 1 — Complete ✅ (22/22 points, Grade B+)
- Sprint 2 — Complete ✅ (20/20 points, Grade A)
- Sprint 3 — Ready for Kickoff 🚀 (20 points planned)

---

## Tech Stack (Confirmed)

| Layer     | Technology                            | Notes                                           |
| --------- | ------------------------------------- | ----------------------------------------------- |
| Framework | Astro 5.14+ (`output: 'server'`)      | SSR via Cloudflare adapter — already configured |
| UI        | React 19 + shadcn/ui (50+ components) | Islands architecture with `client:load`         |
| Styling   | Tailwind CSS v4                       | HSL tokens, dark mode via `.dark` class         |
| Database  | NeonDB (Postgres)                     | `@neondatabase/serverless` already installed    |
| Auth      | Neon Auth or email magic-link         | Server-side, cookie-based sessions              |
| Hosting   | Cloudflare Pages/Workers              | `@astrojs/cloudflare` adapter configured        |
| State     | Nanostores                            | Cross-component reactivity                      |
| Charts    | Recharts 2.15+                        | Already installed for dashboard visualizations  |

### Project Paths (Canonical)

```
src/
  pages/
    trust-builder/         # Trust Builder UI pages
    api/trust-builder/     # Server API endpoints
  components/
    trust-builder/         # React components for Trust Builder
  lib/
    db/                    # NeonDB connection, schema helpers, queries
    auth/                  # Auth logic (magic-link, sessions)
    contracts/             # Quasi-smart-contract business logic
    events/                # Event logging utilities
  types/
    trust-builder.ts       # Shared TypeScript types
```

---

## AI Agent Team

| Agent                 | Role     | Responsibilities                                        |
| --------------------- | -------- | ------------------------------------------------------- |
| `fullstack-developer` | Builder  | Implements vertical feature slices (schema, API, UI)    |
| `product-advisor`     | Reviewer | Grades ontology alignment, migration readiness          |
| `qa-engineer`         | Tester   | Validates acceptance criteria, tests contract integrity |
| `retro-facilitator`   | Process  | Captures lessons learned after each story/sprint        |

**Workflow**: Product Owner writes story → `fullstack-developer` implements → `qa-engineer` validates → `product-advisor` grades → `retro-facilitator` captures lessons → next story.

---

## Sprint Progress Summary

### Sprint 1 — Foundation (Complete ✅)

**Grade**: B+ (3.3 GPA)  
**Stories**: 6 delivered (Schema, Auth, Task List, Claims, Dashboard, Events)  
**Migration Readiness**: 60-70% average  
**Key Achievement**: End-to-end "contract" loop working (sign in → browse → claim → approve → see Trust Score)

### Sprint 2 — Production Hardening (Complete ✅)

**Grade**: A (4.0 GPA) — Quality improvement trend  
**Stories Delivered**:

- S2-01: Email Delivery Infrastructure (A-)
- S2-02: Admin Task Creation UI (A-)
- S2-03: File Upload Proofs + SHA-256 (A-)
- S2-04: Peer Review Workflow (A)

**Key Achievements**:

- ✅ Strategic review adoption 0% → 100% (3-4x ROI proven)
- ✅ Event sourcing architecture 95% migration-ready
- ✅ Defense-in-depth pattern established (database + application)
- ✅ Git workflow compliance 50% → 75%
- ✅ Sanctuary culture embedded in architecture

**Gaps Identified**:

- ❌ 0 automated tests (CRITICAL for Sprint 3)
- ❌ Manual testing not consistently scheduled
- ❌ 25% git workflow violations remaining

### Sprint 3 — Quality & Member Experience (Ready 🚀)

**Goal**: Test infrastructure, member dashboard, automated workflows, role promotion  
**Planned Stories** (20 points):

- S3-01: Test Infrastructure + Git Enforcement (3 points, CRITICAL)
- S3-02: Member Dashboard & Trust Score Viz (8 points, Complex)
- S3-03: Background Jobs & Orphaned Claim Release (5 points, Moderate)
- S3-04: Trust-Threshold Role Promotion (4 points, Simple)

**Sprint Targets**:

- 🎯 60% test coverage (up from 0%)
- 🎯 100% git workflow compliance (pre-push hooks)
- 🎯 100% manual testing (devices allocated)
- 🎯 90%+ migration readiness average
- 🎯 Grade A (maintain quality trend)

**Process Improvements Applied**:

- Strategic review mandatory for Complex stories (S3-02, proven 3-4x ROI)
- Testing schedule built into every story (Day 5, 1 hour allocated)
- AI-optimized story sizing (1-2 days per story)
- Pre-push hooks enforce git workflow (100% compliance)
- Character encoding checks (pre-commit hooks)

**Learnings Incorporated**:

- Event sourcing completeness (metadata sufficient for reconstruction)
- Defense-in-depth for critical rules (database constraints + sanctuary messages)
- Transaction boundaries as function signatures (PoolClient pattern)
- Atomic assignment with `UPDATE...RETURNING` (gold standard)
- Sanctuary culture as architecture (not just copy)

---

## Ontology Requirements (mapped from docs 00–08)

| Dimension       | Key Requirements                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Groups**      | Colony (root), Missions as sub-groups, mission metadata, filtering                                                                                                             |
| **People**      | Member ID (FE-M-XXXXX), email auth, roles (Explorer/Contributor/Steward/Guardian), Trust-threshold promotion                                                                   |
| **Things**      | Tasks (Draft→Open→Complete), Criteria, Incentives (5 dimensions), Proof artifacts                                                                                              |
| **Connections** | Memberships, TaskIncentives, Claims, Proofs, Verification links. **Note**: Mission Joining flow deferred to S2 — S1 members can claim tasks without formally joining a Mission |
| **Events**      | Append-only immutable ledger, SHA-256 content hashing, exportable JSON/CSV                                                                                                     |
| **Knowledge**   | Derived Trust Score, incentive breakdown charts, mission analytics, leaderboards                                                                                               |

---

## Prioritized Epics (Season 0)

| #   | Epic                                           | Sprint | Why first                                      |
| --- | ---------------------------------------------- | ------ | ---------------------------------------------- |
| 1   | **Foundation: Schema + Auth + Seed Data**      | S1     | Nothing works without a database and identity  |
| 2   | **Public Task List + Mission Browsing**        | S1     | Visible value for webinar attendees from day 1 |
| 3   | **Claim Submission (rich text, auto-approve)** | S1     | First end-to-end "contract" loop               |
| 4   | **Member Dashboard + Trust Score**             | S1     | Members see their reward immediately           |
| 5   | **Event Ledger (append-only)**                 | S1     | Genesis audit trail from the start             |
| 6   | **Admin Task Creation UI**                     | S2     | Admins can create new tasks without DB seeds   |
| 7   | **Reviewer Workflows + Peer Review**           | S2     | Complex claims need human verification         |
| 8   | **File Upload + SHA-256 Hashing**              | S2     | Rich proof types beyond text                   |
| 9   | **Trust-Threshold Role Promotion**             | S2     | Automated progression unlocks                  |
| 10  | **Admin Ops (Cancel, Slashing, Disputes)**     | S3     | Governance and error correction                |
| 11  | **Migration Export + Merkle Proofs**           | S3     | Season 0 freeze and Web3 bridge                |
| 12  | **Nonfunctional: Performance, A11y, Mobile**   | S3     | Polish and compliance                          |

---

## Sprint 1 Stories (Gherkin)

### Story 1.1: Database Schema & Seed Data

```gherkin
Given the NeonDB project is provisioned
When the fullstack-developer runs the schema migration
Then all tables (groups, members, tasks, criteria, incentives,
     task_incentives, memberships, claims, proofs, events)
     are created with correct types, constraints, and indices
And the "Webinar Series Season 0" mission is seeded
And the "Attend Live Webinar" task is seeded with auto-approve
     and 50 Participation points
And a withTransaction() helper is exported for atomic multi-step operations
And an EventType enum is exported with canonical event type taxonomy
And a logEvent() utility is exported for the append-only event ledger
```

**Ontology**: Groups + Things + Connections + Events (schema + cross-cutting foundations)
**Agent**: `fullstack-developer`
**Points**: 3

---

### Story 1.2: Email Auth & Member Identity

```gherkin
Given a visitor arrives at the Trust Builder
When they sign in with their email
Then a Member record is created (or found) with a permanent
     Member ID (FE-M-XXXXX)
And a secure session cookie is set
And a "member.created" Event is logged (first sign-in only)
```

**Ontology**: People + Events
**Agent**: `fullstack-developer`
**Points**: 5

---

### Story 1.3: Public Task List & Mission Pages

```gherkin
Given the task list page is loaded (no auth required)
When a visitor browses /trust-builder/tasks
Then they see all Open tasks grouped by Mission
And each task shows: title, mission, incentives offered,
     total value, and brief description
And they can filter by mission
```

**Ontology**: Groups + Things (read-only)
**Agent**: `fullstack-developer`
**Points**: 3

---

### Story 1.4: Claim Submission (Rich Text + Auto-Approve)

```gherkin
Given a signed-in Member views an Open task
When they click "Submit Claim" and enter rich text proof
Then a Claim is created with status "Submitted"
And if the task's verification method is "auto-approve",
     the Claim immediately transitions to "Approved"
And the Member's Trust Score is updated atomically
And Events are logged for both "claim.submitted" and
     "claim.approved"
```

**Ontology**: Connections + Events + Knowledge
**Agent**: `fullstack-developer`
**Points**: 5

---

### Story 1.5: Member Dashboard & Trust Score

```gherkin
Given a signed-in Member navigates to /trust-builder/dashboard
When the page loads
Then they see their current Trust Score (derived from Events)
And a breakdown by incentive dimension
     (Participation, Collaboration, Innovation, Leadership, Impact)
And a list of completed tasks with approval status
And a list of pending claims
```

**Ontology**: Knowledge + People
**Agent**: `fullstack-developer`
**Points**: 3

---

### Story 1.6: Append-Only Event Ledger

```gherkin
Given any state transition occurs (member created, task published,
     claim submitted, claim approved, trust score updated)
When the action completes
Then an immutable Event record is written with:
     timestamp (UTC), actor_id, entity_type, entity_id,
     event_type, and metadata (JSONB)
And the Events table has no UPDATE or DELETE permissions
     for the application database user
```

**Note**: `logEvent()` utility is created in S1-01. This story covers the Events API endpoint, export function, verification utilities, and `qa-engineer` immutability testing.

**Ontology**: Events
**Agent**: `fullstack-developer` + `qa-engineer` (immutability test)
**Points**: 3

---

## Sprint 1 Summary

| Story                | Points | Dependency              | Status                            |
| -------------------- | ------ | ----------------------- | --------------------------------- |
| 1.1 Schema & Seed    | 3      | None                    | ✅ DONE (Grade A)                 |
| 1.2 Auth & Identity  | 5      | 1.1                     | ✅ DONE (Grade A-)                |
| 1.3 Public Task List | 3      | 1.1                     | ✅ DONE (Grade A)                 |
| 1.4 Claim Submission | 5      | 1.1, 1.2, 1.3           | ✅ DONE (Grade A, retro complete) |
| 1.5 Member Dashboard | 3      | 1.1, 1.2, 1.4           | ✅ DONE (Grade A, retro complete) |
| 1.6 Event Ledger     | 3      | 1.1 (woven through all) | ✅ DONE (Grade A, retro complete) |
| **Total**            | **22** | **Completed: 22/22**    | **100% COMPLETE** 🎉              |

**Sprint 1 Status**: COMPLETE ✅ (22/22 points, 100%)
**Final Story**: S1-06 Event Ledger UI merged to main on 2026-02-10
**Blockchain Migration Narrative**: Complete (S1-04 capture → S1-05 derive → S1-06 audit)
**Next**: Sprint 2 planning

---

## Sprint 2 Candidates (Preview)

- Email Delivery for Verification Codes (Resend integration)
- Admin Task Creation UI (Draft → Open with immutability lock)
- File Upload proofs with SHA-256 hashing
- Reviewer queue and Peer Review workflows
- Trust-threshold role promotion automation
- Mission joining (Membership connection)
- Event export (JSON/CSV) for Genesis audit

## Sprint 3 Candidates (Preview)

- Admin ops: Cancel tasks, slashing events, dispute resolution
- Migration export with Merkle root derivation
- Nonfunctional: performance testing, WCAG AA audit, mobile optimization
- Leaderboard and personalized task suggestions

---

## Definition of Done (per story)

- [ ] Acceptance criteria pass (validated by `qa-engineer`)
- [ ] Event logging implemented for all state changes
- [ ] Ontology correctly modeled (graded by `product-advisor`, target B+)
- [ ] TypeScript types match schema
- [ ] Mobile-responsive UI
- [ ] Retro completed (captured by `retro-facilitator`)

---

_Prepared by Product Owner — 2026-02-09_
