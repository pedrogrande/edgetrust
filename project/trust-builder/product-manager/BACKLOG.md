# Trust Builder — Season 0 Backlog ✅

## Overview

Trust Builder is the Season 0 "living lab" to validate the task-as-contract model, the Trust Score mechanics, and the end-to-end verification workflows. This backlog captures prioritized epics, Gherkin user stories (Season 0 scope), acceptance criteria, **Safety Checks**, and **Values Alignment** markers to ensure safety-first and youth-led principles.

---

## Requirements (mapped from docs)

- Groups: Missions and Colony scoping, mission metadata, filtering
- People & Auth: Member ID, email-based magic-link auth, role-based permissions, Trust-threshold role promotion
- Things: Task model, Criteria, Incentives, Proof artifacts, Task states
- Connections: Memberships, Claims, Verifications, Reward distribution
- Events: Append-only immutable Event log, content hashing, exportability
- Knowledge: Trust Score aggregation, analytics, leaderboards, personalized suggestions
- Non-functional: Performance (200ms UI), Security (SHA-256 hashing, file scanning), Availability, Accessibility (WCAG AA), Mobile-first, Localization-ready

---

## Prioritized Epics (Season 0)

1. Core Task lifecycle & Claim verification (MVP) 🔧
2. Event ledger & export (Genesis audit readiness) 📜
3. Trust score calculation & progression rules (roles unlocking) ⭐
4. Admin & Reviewer workflows (ops guide automation) 🛠️
5. Data model + REST API (developer contract) 🔗
6. Auth, roles & permissions (incl. Trust-threshold) 🔐
7. Migration & Season-0 freeze + exports (Web3 bridge) 🌉
8. Nonfunctional & security (performance, file hashing, malware scan) ⚠️
9. UX, accessibility, and mobile optimizations 📱
10. Tests, auditing, and red-team safety checks 🧪

---

## User Stories & Tasks (Gherkin-style)

### Epic: Core Task lifecycle & Claim verification ✅

Story: Publish a Task as a contract

Given an Admin has created a Task in Draft with clear Acceptance Criteria and Incentives
When the Admin clicks `Publish`
Then the Task becomes `Open`, the core fields are locked, and an Event is appended to the log

Safety Checks:
- Publishing generates a locked-snapshot Event entry with old/new values recorded
- UI warns about immutability before publishing

Values Alignment: **Transparency**, **Legibility of work**, **Equity of opportunity**

DoD:
- Publish API endpoint implemented and validated
- UI shows publish confirmation and immutability hint
- Event record is written and exportable

---

Story: Member submits a Claim with proofs

Given a Member views an `Open` Task
When they submit a Claim with required proofs (text or file)
Then the Claim is saved as `Submitted`, content hash generated, and a `Submitted` Event is recorded

Safety Checks:
- File uploads generate SHA-256 hash and are virus-scanned before being accepted
- Maximum file size enforced

Values Alignment: **Human-centered design**, **Privacy**

DoD:
- Claim submission endpoint verifies proof format and stores proof metadata
- Hash stored in Event log
- Uploads scanned and encrypted in storage

---

Story: Peer or Steward reviews a Claim

Given a Claim is `Submitted` and assigned to a Reviewer with enough Trust Score
When the Reviewer Approves/Requests Revision/Rejects
Then the Claim state transitions accordingly and an Event is recorded; approvals update Trust Score atomically

Safety Checks:
- Reviewers cannot review their own claims
- Two independent sign-offs for high-value claims (configurable)
- Reviewer actions are audited in Events

Values Alignment: **Safety-first**, **Fairness**, **Collective verification**

DoD:
- Review assignment and verification APIs in place
- UI reviewer flows implemented with clear feedback templates
- Trust score updates occur atomically and are visible in member dashboard

---

Story: Mission Joining (Membership connection)

Given an Open Mission is visible to Members
When a Member clicks `Join Mission`
Then a `Membership` connection is recorded in the Events log and the Member is added to the Mission's membership list

Safety Checks:
- Joining records an Event with timestamp and actor
- Joining does not grant elevated privileges until role thresholds are met

Values Alignment: **Equity of opportunity**, **Legibility**

DoD:
- `Join Mission` API and UI implemented
- Membership Events are recorded and exportable
- Mission filters reflect joined members

---

Story: Role Promotion (Trust-threshold automation)

Given a Member's Trust Score reaches a promotion threshold (e.g., 500)
When the scheduled background job runs
Then the Member's role is automatically updated (e.g., to `Steward`) and an Event is recorded documenting the promotion

Safety Checks:
- Promotions are logged in Events with before/after roles
- Promotions are reversible via Admin review (with audit trail)

Values Alignment: **Fairness**, **Transparency**

DoD:
- Background job for promotions implemented and tested
- Automated promotion writes Event and notifies the Member
- Admin override flow exists for disputes

---

Refinement Story: Dynamic Proof Forms (Criterion-level proof types)

Given an Admin is creating or editing a Task
When they add a Criterion
Then they can choose the proof type required (e.g., `Rich Text`, `File Upload`, `Video Link`) and the Claim form enforces that constraint

Safety Checks:
- Criterion-level proof types are enforced on submission and validated server-side
- Proof-type changes after publishing require Task cancel/create v2 or an appended Event documenting the change

Values Alignment: **Human-centered**, **Legibility**

DoD:
- Task creation UI supports selecting proof types per Criterion
- Claim submission validates Criterion-level proof types
- Server-side validation and Event logging for proof-type enforcement

---

### Epic: Event ledger & export (Genesis audit readiness) 📜

Story: Append-only Events for every state change

Given any state transition (Task publish, Claim submit, Claim approve, Trust update)
When the action occurs
Then an immutable Event record is appended with timestamp, actor, before/after states, and metadata

Safety Checks:
- Events are immutable via app-level restrictions (no updates/deletes)
- Event log snapshot export reproducibly maps to on-chain Merkle roots

Values Alignment: **Transparency**, **Auditability**

DoD:
- Events table/schema defined and writes validated
- Application DB user has only `INSERT` and `SELECT` on the `Events` table (no `UPDATE`/`DELETE`)
- Export endpoints produce JSON/CSV and Merkle root derivation documented
- Automated tests validate immutability and export integrity

---

### Epic: Trust Score calculation & progression rules ⭐

Story: Trust Score is derived from approved claims

Given a member has Approved claims in the Event log
When the dashboard is requested
Then Trust Score is calculated by summing all approved incentive points across dimensions and returned

Safety Checks:
- Trust Score is derived (not editable)
- Slashing events are recorded and reversible only via Admin-reviewed Events

Values Alignment: **Equity**, **Legibility**

DoD:
- Calculation logic implemented server-side and unit-tested
- Dashboard shows incentive breakdown across five dimensions

---

### Epic: Knowledge & Member visualization 📊

Story: Member Profile Visualization

Given a Member has completed tasks across multiple dimensions
When they view their dashboard
Then they see a visualization (e.g., spider chart or bar chart) showing their contribution profile across Participation, Collaboration, Innovation, Leadership, and Impact, with the ability to export their summary as JSON

Safety Checks:
- Visualizations use aggregated, non-PII data by default; exports only include PII with explicit consent
- Charts reflect freshly-calculated Trust Scores and are consistent with Event-derived values

Values Alignment: **Member sovereignty**, **Legibility**, **Learning**

DoD:
- Dashboard chart implemented and unit-tested with sample data
- Export summary endpoint produces JSON matching migration specs

---

### Epic: Admin & Reviewer workflows 🛠️

Story: Admin cancels a problematic Task

Given a published Task has a critical error
When Admin cancels it
Then the Task is marked `Cancelled`, a reason is recorded in Events, and members are notified

Safety Checks:
- Cancellation requires Admin role and logs rationale
- Previous claims are preserved for audit and flagged

Values Alignment: **Transparency**, **Human-centered**

DoD:
- Cancel flow implemented with audit logging and member notifications

---

### Epic: Migration & Season-0 freeze (Web3 bridge) 🌉

Story: Export per-member Season 0 summary and Merkle root

Given Season 0 is complete and the ledger is frozen
When an Admin requests an export for a member
Then the system produces a JSON summary (total Trust Score, dimension breakdown, count) and a Merkle proof root for their history

Safety Checks:
- Member must be able to opt-in to wallet linking before on-chain attestation
- Export includes content hashes, not raw PII unless consented

Values Alignment: **Member sovereignty**, **Privacy**

DoD:
- Export endpoint and format documented and verified against migration strategy

---

## Non-functional acceptance criteria (selected)

- UI interactions < 200ms for standard navigation
- Handle 50 simultaneous claims in 1 minute without data loss
- 99.5% availability during Season 0, backups and 24-hour recovery
- WCAG 2.1 AA accessibility; mobile-first responsive design
- All file uploads hashed (SHA-256) and scanned

---

## Definition of Done (DoD) — release checklist ✅

- All stories for an epic have passing unit + integration tests
- Automated tests for Event immutability and hash verification
- Security checks: malware scanning on uploads, role validation, JWT-based auth
- Performance tests for target loads
- Stakeholder sign-off (founding admins + 2 youth leaders)
- Migration export validated by sample Merkle root and manual audit

---

## Next steps & sprint candidates (recommended)

Sprint 1 (1–2 weeks): Auth & Identity (magic-link sign-in, Member ID assignment), Task Publication for Webinar Attendance, Claim Submission for Webinar proofs, and Basic Event Logging (append-only table)

Sprint 2 (1–2 weeks): Reviewer workflows, Trust Score derivation and role promotion automation, Event export prototype and Merkle root proof, file hashing + scanning.

Sprint 3: Admin ops (cancel, v2 tasks), slashing & dispute flows, migration readiness (export validations), nonfunctional improvements, accessibility and UX testing.

---

*Prepared by Product Management — ready for review and handoff* ✨
