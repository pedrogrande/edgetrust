# AI Grooming Prompts — Sprint 1 (FE-S1 macros)

Use these prompts to run focused AI coding sessions for each FE-S1 macro ticket. Each section contains:
- A concise implementation brief
- Repo paths and files the agent should read & modify
- Seed data to add
- Tests to generate (unit/integration/event verification)
- Expected deliverables (PR, generated files, tests)

---

## FE-S1-01: Identity & Mission Foundation (People + Groups)

Implementation brief
- Implement magic-link/email sign-in (passwordless) and a basic Member model that assigns a permanent Member ID on first login: `FE-M-XXXXX`.
- Create Groups/Missions and Memberships models/APIs with a seeded mission: "Webinar Series Season 0".
- Provide a minimal profile page showing Member ID and a mission list page with a `Join Mission` button.
- Ensure actions write Event records (Join) to the Events API (append-only mechanism; Event write API can be a stub that appends JSON rows to a local file for MVP if DB not available).

Key repo paths (read & write)
- futures_edge_docs/trust-builder/BACKLOG.md (for requirements/context)
- futures_edge_docs/trust-builder/EPIC-1-SUBTASKS.md (subtasks & DoD)
- futures_edge_docs/trust-builder/product-manager/SPRINT-1-TICKETS.md
- backend/ — create service at `backend/trustbuilder/` (if monorepo style) or `services/trustbuilder/`
  - `backend/trustbuilder/src/models/*` (Member, Group, Membership)
  - `backend/trustbuilder/src/routes/auth.ts` (magic-link endpoints)
  - `backend/trustbuilder/src/routes/groups.ts` (missions & join)
  - `backend/trustbuilder/test/*` (unit/integration tests)
  - `backend/trustbuilder/db/migrations/*` (schema)
- web/ — create UI at `web/src/pages/trustbuilder/` or `web/src/components/trustbuilder/`
  - `web/src/pages/trustbuilder/profile.tsx` (profile page showing Member ID)
  - `web/src/pages/trustbuilder/missions.tsx` (mission list + join)
  - `web/test/*` (frontend tests)

Seed data
- `backend/trustbuilder/db/seeds/webinar-mission.json`:
  - Mission: { name: "Webinar Series Season 0", slug: "webinar-season-0", description: "Season 0: webinars" }
- Example member seed for testing

Tests to generate
- Unit tests for magic-link generation and Member ID assignment (e.g., test_member_id_assignment)
- Integration test: sign up via magic-link -> GET /members/me returns FE-M-XXXXX
- Integration test: join mission writes Event (stubs allowed) and membership appears in GET /groups/{id}/members

Deliverables
- PR with backend service files, migrations, seeds, and tests
- PR with frontend minimal pages and UI tests
- Meeting note: where Event write hook was implemented (file/API)

---

## FE-S1-02: Contract & Submission Engine (Things + Connections)

Implementation brief
- Implement Tasks and Claims end-to-end using Task as the contract entity.
- Tasks should support Acceptance Criteria and incentive dimensions (Participation, Collaboration, Innovation, Leadership, Impact) stored as metadata.
- Admin flows: create Draft tasks, `PATCH /tasks/{id}/publish` to Open (publishing locks core fields and writes Event).
- Member flows: Join mission (if not already), list tasks, Submit Claim (rich-text only for Sprint 1 MVP) for a Task. Claim state `Submitted` and triggers an Event.
- Minimal reviewer flow: Admin can mark claim as `Reviewed` and trigger Trust Score update (for now, can be a simple DB update or event that tests read).

Key repo paths
- backend/trustbuilder/ (same service as FE-S1-01)
  - `models/Task`, `models/Criterion`, `models/Claim`, `models/Proof` (rich-text proofs implemented as text fields)
  - `routes/tasks.ts` (create, update, publish, list)
  - `routes/claims.ts` (submit claim, list claims)
  - `db/migrations/*` to add Task/Criterion/Claim tables
- web/src/pages/trustbuilder/tasks.tsx
- web/src/pages/trustbuilder/claim-submit.tsx
- Add seed: `db/seeds/webinar-reflection-task.json`

Seed data
- 'Webinar Reflection' task seeded with: title, description, acceptance criteria: ["Write a 200–500 word reflection"], incentives: { Participation: 15, Innovation: 10 }

Tests to generate
- Integration test: Admin creates Draft task -> publishes -> Task is visible in GET /groups/{id}/tasks and is locked
- Integration test: Member submits rich-text claim -> Claim saved with state `Submitted` and Event logged
- Acceptance test: Admin reviews claim -> Claim state `Reviewed` and Trust Score event emitted

Deliverables
- PR with Task/Claim models, routes, migrations, and tests
- PR with frontend pages for viewing tasks and submitting claims
- Test that runs end-to-end flow and asserts Event entries exist for each state change

---

## FE-S1-03: Immutable Audit Log & Knowledge Dashboard (Events + Knowledge)

Implementation brief
- Implement an append-only Events table or file-based ledger used by Join/Publish/Claim actions.
- Each write must include: timestamp (UTC), actor_id (member_id), action_type, entity_type, entity_id, metadata (JSON). For MVP this can be a database table or an append-only JSONL file with robust write semantics.
- Enforce immutability at the app level and document DB permissions; create an automated test that tries to UPDATE/DELETE and fails or is detected.
- Build a lightweight dashboard endpoint/page that calculates a member's Trust Score by summing approved points across Events and shows a breakdown by incentive dimension.
- Add a `JSON Export` endpoint that returns a member's Events history for a date range.

Key repo paths
- backend/trustbuilder/models/Event, backend/trustbuilder/routes/events.ts
- backend/trustbuilder/db/migrations/* for Events table
- web/src/pages/trustbuilder/dashboard.tsx
- tests: backend/test/event_ledger_spec.ts, backend/test/trust_score_verify_spec.ts

Tests to generate
- Unit: Event write includes required fields and content_hash if file (none for MVP)
- Integration: A full flow (join -> publish -> submit claim -> review) writes Events for each action
- Verification test: `test_event_sum_matches_dashboard_trust_score` that queries Events for approved claims and compares sum to dashboard calculation
- Immutability test: attempt UPDATE/DELETE via test DB user and assert it's blocked

Deliverables
- PR implementing Events table and write hooks + tests
- PR implementing dashboard page and JSON Export
- Automated verification script (node/python) that asserts event-approved sums match calculated Trust Score

---

## Running the session
- Prepare the environment: ensure an AI operator has access to the repo, dev database (or local env), and can run tests locally / CI.
- Use each prompt as a single session input; ask the agent to create code, tests, and a PR, then run tests and report failures.
- Validate generated code by running the verification test that ensures event sums equal dashboard Trust Score.

---

> Note: For Sprint 1, prefer rich-text-only claims and defer file upload + virus scanning to Sprint 2 to reduce risk and accelerate the first end-to-end loop.
