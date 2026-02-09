# Data model and API design: Trust builder

This document translates the **ONE 6-dimension ontology** into a technical schema and API specification. For the Trust Builder prototype, we map the dimensions to a traditional relational structure that can be easily implemented by developers.

***

## 1. Data model (relational schema)

The schema is designed to be "migration-ready," using stable identifiers and append-only event logging.

### Dimension 1 & 3: Groups and things (entities)
Everything in Trust Builder is a `Thing` that belongs to a `Group`.

| Table | Fields | Description |
| :--- | :--- | :--- |
| **Groups** | `id` (UUID), `name`, `type`, `parent_group_id` | Missions, field offices, or the Colony itself. |
| **Members** | `id` (UUID), `email`, `member_id` (FE-M-XXXX), `wallet_address` (optional) | The People (Actors) in the system. |
| **Tasks** | `id` (UUID), `group_id`, `title`, `description`, `state`, `max_completions`, `version` | The primary Things (Contracts) members interact with. |
| **Criteria** | `id` (UUID), `task_id`, `description`, `proof_type`, `verification_method` | Requirements tied to a Task. |
| **Incentives** | `id` (UUID), `name`, `description` | Predefined types (e.g., Participation, Innovation). |

### Dimension 4: Connections (relationships)
Connections define how value and authority move between entities.

| Table | Fields | Description |
| :--- | :--- | :--- |
| **TaskIncentives** | `task_id`, `incentive_id`, `points` | Links Tasks to reward types with specific weights. |
| **Memberships** | `member_id`, `group_id`, `role`, `joined_at` | Links People to Missions/Colony. |
| **Claims** | `id` (UUID), `member_id`, `task_id`, `status`, `submitted_at` | The primary connection representing "work in progress." |
| **Proofs** | `id` (UUID), `claim_id`, `criterion_id`, `content_hash`, `content_url` | Metadata for the evidence provided. |

### Dimension 5: Events (audit log)
The immutable record of all state changes. This is the "quasi-smart contract" ledger.

| Table | Fields | Description |
| :--- | :--- | :--- |
| **Events** | `id` (BIGINT), `timestamp`, `actor_id`, `entity_type`, `entity_id`, `event_type`, `metadata` (JSONB) | Append-only history of every creation, claim, and approval. |

***

## 2. API design (RESTful)

The API follows the ontology's hierarchical structure, ensuring that human intent (requests) flows through organizational scope (Groups).

### Group and task management
*   `GET /groups` - List all Missions/Colonies.
*   `GET /groups/{id}/tasks` - List all Tasks within a specific Mission.
*   `POST /groups/{id}/tasks` - [Admin] Create a new Task contract (state: Draft).
*   `PATCH /tasks/{id}/publish` - [Admin] Move task to Open state (becomes immutable).

### Member operations
*   `GET /members/me` - Retrieve authenticated member's profile and Trust Score.
*   `GET /members/me/dashboard` - Get aggregated data (Knowledge) including incentive breakdown.
*   `GET /members/{id}/history` - View public contribution history and Event log.

### Claims and verification
*   `POST /tasks/{id}/claims` - Initiate a claim for a specific Task contract.
*   `POST /claims/{id}/proofs` - Submit proof (text or file) for a specific criterion.
*   `PATCH /claims/{id}/verify` - [Steward/Peer] Approve or reject a claim.
*   `GET /claims/pending` - [Steward] List claims awaiting review within authorized Missions.

### System-wide intelligence (Knowledge)
*   `GET /analytics/missions/{id}` - Get completion velocity and incentive distribution.
*   `GET /ledger/export` - [Admin] Export complete Event log for Season 0 (JSON/CSV).

***

## 3. Implementation rules

*   **Stable IDs**: Use UUIDs for all primary keys to ensure that records remain unique when merged during future migrations.
*   **Immutable Events**: The `Events` table should have no `UPDATE` or `DELETE` permissions for the application user.
*   **Calculated State**: Trust Scores should not be stored as static numbers. They should be recalculated (or cached) by summing all `Approved` claims in the `Events` or `Claims` tables to ensure auditability.
*   **Stateless Auth**: Use JWT (JSON Web Tokens) containing the `member_id` and `role` to ensure the API can scale across multiple servers if needed.
*   **Content Hashing**: Every file upload must be processed by the API to generate a SHA-256 hash *before* it is saved to storage, ensuring the hash matches the initial intent.