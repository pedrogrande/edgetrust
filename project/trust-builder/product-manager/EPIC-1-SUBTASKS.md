# Epic 1: Core Task lifecycle & Claim verification — Decomposed Subtasks

This file captures the decomposed subtasks for Epic 1 (Task lifecycle & Claim verification). Each entry includes the task-manager ID for traceability, a short description, DoD, uncertainty areas, estimated complexity, and sequence order.

---

## Stakeholder feedback & strategic alignment

Summary: The decomposition aligns well with the ONE 6-dimension ontology and balances the technical rigor needed for a quasi-smart-contract prototype with human-centered operations. Key feedback highlights the importance of backend-first sequencing (Tasks 1–6), DB-level immutability, clear OpenAPI/data mapping for the genesis migration, and attention to UX microcopy and reviewer feedback templates.

| Task ID | Component focus | Strategic value |
| :--- | :--- | :--- |
| `5y2wKZYCKR` | Schema & migrations | Establishes the foundation for all six dimensions in a relational structure.
| `BZCLJTHo1x` | Proof & hashing | Implements the cryptographic "oracle" layer needed for verifiable claims.
| `mtJh9q0pEI` | Atomic rewards | Ensures that trust score updates are mathematically consistent with the event log.
| `s-GCSoFfhQ` | Red-team testing | Proactively identifies gaming or fraud risks before the system is used for real rewards.

Action items from review:
- Confirm DB platform specifics and apply DB-level `INSERT`/`SELECT` only policy for `Events` (Subtask 6).
- Finalize Merkle derivation format and export performance expectations (Subtask 6, 12).
- Decide publish locking strategy (DB-level vs app-level) and document it in schema/API docs (Subtask 2, 5).
- Incorporate supportive feedback templates and UX microcopy in Reviewer and Admin UI subtasks (Subtasks 7 & 9).
- Prioritise backend contract logic (Subtasks 1–6) for Sprint 1 to minimize front-end rework.

---

---

## 1. Schema & Migrations for Tasks/Criteria/Claims/Proofs/Events
- **Task ID:** `5y2wKZYCKR`
- **Description:** Design and implement relational schema, migrations, indices, and seed data for Season 0 missions and example tasks.
- **DoD:** SQL migrations added and reviewed; indices for key queries; seed data for Season 0; schema documented and mapped to migration plan.
- **Uncertainties:** Indexing & query patterns; DB constraints vs soft deletes.
- **Complexity:** Medium
- **Story Points (Fibonacci):** 5
- **Owner:** **backend**
- **Sequence Order:** 1

---

## 2. Task & Publish API endpoints (backend)
- **Task ID:** `E9UqQgdQew`
- **Description:** Implement REST endpoints for creating Draft tasks, updating Drafts, publishing to Open (immutability enforcement), listing/filtering, and cancelling.
- **DoD:** Endpoints implemented and documented (OpenAPI); Publish enforces immutability and records Event snapshot; authorization checks; integration tests for state transitions.
- **Uncertainties:** Partial edits after publish; publish locking approach.
- **Complexity:** High
- **Story Points (Fibonacci):** 8
- **Owner:** **backend**
- **Sequence Order:** 2

---

## 3. Claim Submission & Proof handling (backend)
- **Task ID:** `BZCLJTHo1x`
- **Description:** Implement claim submission endpoints, proof upload pipeline, SHA-256 hashing, malware scanning, signed URL storage, and proof metadata recording.
- **DoD:** File upload pipeline with hashing and scanning; proofs table stores content_hash and content_url; max file size and MIME types enforced; Event recorded on `Submitted` with proof metadata.
- **Uncertainties:** Storage provider; scanning service and sync vs async handling.
- **Complexity:** High
- **Story Points (Fibonacci):** 13
- **Owner:** **infra/backend**
- **Sequence Order:** 3

---

## 4. Reviewer Assignment & Queue Service
- **Task ID:** `X8ACjPchGk`
- **Description:** Implement reviewer queue, assignment rules, randomization/options for two-signoffs, and `GET /claims/pending` with filters.
- **DoD:** Assignment algorithms implemented and configurable; pending claims endpoint filters by reviewer permissions and missions; support for two-signoff workflow; metrics emitted.
- **Uncertainties:** Assignment policy (random vs skill-based); reviewer capacity and concurrency assumptions.
- **Complexity:** Medium
- **Story Points (Fibonacci):** 5
- **Owner:** **backend**
- **Sequence Order:** 4

---

## 5. Review Actions & Atomic Reward Execution
- **Task ID:** `mtJh9q0pEI`
- **Description:** Implement Approve/RequestRevision/Reject endpoints, atomic Trust Score updates in transactions, slashing and appeal hooks.
- **DoD:** Approve/Reject/Revision endpoints implemented; Trust Score updates in atomic DB transaction with Event logs; slashing and appeal endpoints; integration tests for race/failure modes.
- **Uncertainties:** Atomicity guarantees and transaction boundaries; slashing policy.
- **Complexity:** High- **Story Points (Fibonacci):** 8
- **Owner:** **backend**- **Sequence Order:** 5

---

## 6. Events Append-only Implementation & Export Hooks
- **Task ID:** `Cppcksr8Mr`
- **Description:** Implement Event write path used by all state transitions; ensure immutability at DB/infra level; implement export hooks for JSON/CSV and Merkle root derivation.
- **DoD:** Event write API used by all flows; DB-level permissions set for application user (INSERT/SELECT only) via infra scripts; export endpoint produces reproducible JSON/CSV and Merkle root; automated tests validate immutability and export integrity.
- **Uncertainties:** Export performance at scale; exact Merkle format for migration team.
- **Complexity:** Medium
- **Story Points (Fibonacci):** 5
- **Owner:** **infra/backend**
- **Sequence Order:** 6

---

## 7. Admin UI: Task creation, publish modal & immutability UX
- **Task ID:** `iyy0vTf6NQ`
- **Description:** Implement Admin UI to create/edit Drafts and publish with clear immutability warnings and preview of locked fields.
- **DoD:** Task creation/edit UI screens implemented; publish modal displays locked snapshot and requires confirmation; client-side validation mirrors server rules; E2E tests for publish UX.
- **Uncertainties:** UX microcopy tone for youth users.
- **Complexity:** Medium- **Story Points (Fibonacci):** 3
- **Owner:** **frontend/product**- **Sequence Order:** 7

---

## 8. Member UI: Claim submission workflow & uploads
- **Task ID:** `XeKB16CbxH`
- **Description:** Implement Member-facing UI for viewing tasks, joining missions, submitting claims, uploading proofs, and viewing submission status and reviewer feedback.
- **DoD:** Claim submission UI implemented and mobile-tested; client validates proof types/sizes and shows upload progress; submitted claim appears in member dashboard with status; E2E tests for submission flow and error states.
- **Uncertainties:** Offline/low-bandwidth behavior and chunked uploads.
- **Complexity:** Medium
- **Story Points (Fibonacci):** 5
- **Owner:** **frontend**
- **Sequence Order:** 8

---

## 9. Reviewer UI: Pending queue, review actions & feedback templates
- **Task ID:** `ggLZ_Twqmc`
- **Description:** Implement Reviewer dashboard listing pending claims with filters and a review UI with inline comments and templated feedback.
- **DoD:** Reviewer dashboard lists claims with filters/search; review UI supports inline comments and templated feedback; two-signoff flows supported where configured; E2E tests for reviewer flows.
- **Uncertainties:** Feedback templates and tone guidelines for reviewers.
- **Complexity:** Medium
- **Story Points (Fibonacci):** 3
- **Owner:** **frontend**
- **Sequence Order:** 9

---

## 10. Testing: Unit, Integration, Load & Red-team for Epic 1
- **Task ID:** `s-GCSoFfhQ`
- **Description:** Implement unit tests for core logic, integration/e2e tests for flows, load tests simulating 50 claims/min, and red-team scenarios for gaming/fraud.
- **DoD:** Unit and integration tests with CI gating; load tests validate throughput and latency; red-team scenarios executed and issues triaged; test coverage thresholds met for core flows.
- **Uncertainties:** Load-test environment parity with production.
- **Complexity:** High
- **Story Points (Fibonacci):** 8
- **Owner:** **qa/backend**
- **Sequence Order:** 10

---

## 11. Monitoring, Observability & Alerting for core flows
- **Task ID:** `48Ln9Ow7mE`
- **Description:** Instrument metrics and traces for task creation, claim submission, review times, queue lengths, event writes, and failures; create alerts and SLO dashboards.
- **DoD:** Metrics and traces emitted and dashboarded; alerts for high queue time, failed Event writes, upload errors; runbook for common incidents.
- **Uncertainties:** Confirm SLO thresholds for review times and claim latency.
- **Complexity:** Medium
- **Story Points (Fibonacci):** 3
- **Owner:** **infra**
- **Sequence Order:** 11

---

## 12. Docs & Developer Handoff (API + Data mapping)
- **Task ID:** `2lCBNfOyz8`
- **Description:** Document OpenAPI, data models, Event schema, payloads for migration, and verification/runbooks for QA and security.
- **DoD:** OpenAPI spec updated and published; data model docs with Event mapping to migration formats; runbook for verifying immutability and promotion jobs; acceptance test examples included.
- **Uncertainties:** Whether migration docs should include sample Merkle roots and verification scripts.
- **Complexity:** Low
- **Story Points (Fibonacci):** 2
- **Owner:** **product**
- **Sequence Order:** 12

---

*Prepared for sprint planning and engineering handoff — Product Management* ✨
