Here is the Product Requirements Document (PRD) that aligns the "Contract-Driven" vision with the modern "ONE Ontology" architecture.

Key elements:

- **Architecture:**: **AstroJS SSR/React/NeonDB + ONE Ontology** (Graph + Event Sourcing).
- **Data Model:**: All models based on the 6 Dimensions (`Things`, `Connections`, `Events`, etc.).
- **Authorization:**: **Graph-Based Authorization** (Connections determine access).
- **Workflow:** Added the "Agentic Development" layer, explicitly mentioning the Director Agent workflow we defined.

---

# Product Requirements Document (PRD)

**Project:** EdgeTrust Platform (Future's Edge)
**Version:** 3.0 (ONE Ontology Alignment)
**Date:** February 9, 2026
**Status:** Draft

---

## 1. Executive Summary

The Future's Edge platform is a decentralized, youth-led ecosystem for learning, governance, and innovation. This architecture validates the core "Contract-Driven" philosophy: every action is verifiable, every relationship is explicit, and every outcome is immutable.

By adopting the **ONE Ontology**, we move from a rigid "Document Chain" model to a **Semantic Knowledge Graph** where "Trust" is not just a database field but a calculation derived from a verifiable history of Events and Connections.

## 2. Problem Statement

Current platforms lack the flexibility to evolve data structures organically and fail to provide immutable proof of contribution. Future's Edge requires a system where:

- **Trust is verifiable:** Trust Scores are calculated from an immutable event log, not an editable user profile.
- **Structure is fluid:** Field Offices and Squads can define new entity types (e.g., "Climate Mission") without global schema changes.
- **Relationships are Contracts:** Access to a mission or funds is granted only via explicit, verifiable connections (e.g., "Approved By" or "Holds Skill Proof").

## 3. Core Technical Architecture

The system uses a **ONE Tech Stack** (Astro, React, NeonDB, Effect TS) driven by a **6-Dimension Ontology**.

### 3.1. The 6-Dimension Ontology (The "Reality Model")

Instead of generic "Documents," all data maps to six distinct dimensions:

1.  **Groups:** Boundaries for tenancy and scope (e.g., `melbourne-field-office`, `climate-squad`).
2.  **People:** Actors with identity and agency (e.g., `member`, `org_owner`, `AI_agent`).
3.  **Things:** Discrete entities with state (e.g., `mission`, `proposal`, `token`, `skill_proof`).
4.  **Connections:** First-class relationships that carry logic (e.g., `assigned_to`, `verified_by`, `governed_by`).
5.  **Events:** Immutable log of actions for audit and analytics (e.g., `mission_completed`, `vote_cast`).
6.  **Knowledge:** Semantic context for AI agents (e.g., `skill:blockchain`, `topic:sustainability`).

### 3.2. Event Sourcing & Immutability

- **Write Model:** We do not "Update" a Thing directly. We **Record an Event** (e.g., `MissionUpdated`) and **Patch the Thing**.
- **Audit Trail:** The `Events` table serves as the "Chain of Custody," replacing the previous "Linked Hash Chain" design.
- **Replayability:** Any entity's state at any point in time can be reconstructed by replaying its Event stream.

### 3.3. Graph-Based Authorization (The "Contract")

- **No "Admin" Role:** Authorization is a path through the graph.
- **Example:** A user can _Approve_ a `Mission` only if:
  - User `IS_CONNECTED_TO` `GovernanceCouncil` (Type: `member_of`)
  - AND `GovernanceCouncil` `IS_CONNECTED_TO` `Mission` (Type: `governs`)

---

## 4. Functional Requirements

### 4.1. User & Identity

- **Identity:** Users are `People` entities.
- **Reputation:** "Trust Score" is a computed property derived from `Events` (e.g., +10 for `mission_completed`, +5 for `peer_review_submitted`).
- **Privacy:** PII is stored in `People` properties with field-level encryption (Convex).

### 4.2. Agentic Development Workflow

- **The Architect Agent:** We use a VS Code "Future's Edge Architect" agent to validate all new features against this PRD.
- **The Ontology Director:** A specialized agent ensures no "Schema Pollution" occurs—every feature must map to the 6 dimensions before code is written.

### 4.3. Flexible Entity Management

- **Type Creation:** Instead of a "Schema Builder" for JSON blobs, Architects define new `Thing Types` via the DSL (e.g., `CREATE THING TYPE "climate_mission"`).
- **Scoping:** A Field Office `Group` can define its own unique Types that don't leak into the global namespace.

### 4.4. Governance & Smart Contracts

- **Smart Policies:** Logic is enforced by **Effect TS** services that check `Connection` constraints before allowing an action.
- **Escrow/Rewards:** Value transfer (Trust Points or Tokens) is an `Event` triggered automatically when specific `Connections` (e.g., "Verified By") are established.

---

## 5. Data Dictionary (The Ontology Schema)

### 5.1. `things` (Replaces `documents`)

| Field        | Type   | Description                                   |
| :----------- | :----- | :-------------------------------------------- |
| `_id`        | ID     | Unique Identifier (Convex ID)                 |
| `type`       | String | e.g., "mission", "skill_proof"                |
| `groupId`    | ID     | The `Group` this belongs to (Scope)           |
| `properties` | JSON   | Flexible data (Budget, Title, Status)         |
| `state`      | String | Current lifecycle state (Draft, Active, Done) |

### 5.2. `connections` (Replaces Reference Fields)

| Field      | Type   | Description                                             |
| :--------- | :----- | :------------------------------------------------------ |
| `fromId`   | ID     | Source Entity (Person/Group/Thing)                      |
| `toId`     | ID     | Target Entity                                           |
| `type`     | String | e.g., "assigned_to", "verified_by"                      |
| `metadata` | JSON   | e.g., `{ "role": "lead", "valid_until": "2026-12-31" }` |

### 5.3. `events` (The Immutable Log)

| Field       | Type   | Description                   |
| :---------- | :----- | :---------------------------- |
| `type`      | String | e.g., "mission_started"       |
| `actorId`   | ID     | Who did it (`Person`)         |
| `targetId`  | ID     | What was acted upon (`Thing`) |
| `payload`   | JSON   | Context (Diff, IP, Reason)    |
| `timestamp` | Int    | Unix Timestamp (Immutable)    |

---

## 6. User Experience (UX) Flow (Updated)

1.  **Intent (The Contract):**
    - Member proposes a Mission.
    - System creates a `Thing` (Type: `mission`) in "Draft" state.
2.  **Commitment (The Connection):**
    - Member clicks "Start."
    - System checks requirements (e.g., "Has Skill Proof?").
    - System creates `assigned_to` Connection between Member and Mission.
    - System records `mission_started` Event.
3.  **Proof (The Event):**
    - Member submits work.
    - System records `proof_submitted` Event with evidence link.
4.  **Verification (The Settlement):**
    - Peer Reviewer clicks "Verify."
    - System creates `verified_by` Connection.
    - Once 2 verifications exist, System moves Mission state to "Completed" and distributes Trust Points (Event).

## 7. Roadmap & Phasing

- **Phase 1 (The Kernel):** Deploy ONE Stack (Astro/NeonDB). Implement `People` and `Groups`. Basic Trust Score calculation.
- **Phase 2 (The Economy):** Implement `Things` (Missions) and `Connections` (Smart Policies).
- **Phase 3 (The Brain):** Implement `Knowledge` dimension. Vector search for "Find me a mission that matches my skills."

## 8. Success Metrics

- **Traceability:** Can we reconstruct the entire history of a "Trust Score" from the `events` table?
- **Flexibility:** Can a Field Office launch a custom "Local Event" type without Engineering support?
- **Performance:** Dashboard loads in < 200ms
