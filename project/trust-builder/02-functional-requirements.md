# Functional requirements: Trust builder

This document outlines the functional requirements for the Trust Builder application, organized according to the **ONE 6-dimension ontology framework**. This structure ensures that every requirement contributes to a coherent model of the Future’s Edge ecosystem.

***

## 1. Groups (organizational containers)

Groups provide the context and scope for all activity within the system.

*   **Colony Management**: The system shall represent "Future's Edge" as the root group.
*   **Mission Sub-groups**: The system shall allow Admins to create "Missions" as sub-groups within the Colony (e.g., "Webinar Series Season 0").
*   **Mission Metadata**: Each Mission group shall have a name, description, and status (Active/Closed).
*   **Mission-Based Filtering**: Members shall be able to filter the task list and their dashboard by specific Missions.

***

## 2. People (actors & authorization)

Actors are the entities that take action and possess intent within the system.

*   **Member Identity**: The system shall assign every authenticated user a unique, permanent Member ID (e.g., FE-M-00042).
*   **Authentication**: Users shall sign in using email-based magic links or passwordless authentication.
*   **Dashboard**: Every Member shall have a private dashboard displaying their current Trust Score, incentive breakdown, and claim history.
*   **Role-Based Permissions**:
    *   **Member**: Can view Open tasks, submit claims, and manage their own profile.
    *   **Steward/Reviewer**: Can review and approve/reject claims assigned to them.
    *   **Admin**: Can create/edit/publish tasks, manage missions, and adjust system-wide incentive types.
*   **Trust-Threshold Roles**: The system shall automatically upgrade a Member to "Steward" permissions when their Trust Score exceeds a defined threshold (e.g., 500 points).

***

## 3. Things (entities & states)

Things are the "nouns" of the system—discrete entities with defined properties and states.

*   **Task (The Contract)**:
    *   **Task Types**: Support for "Simple" (one criterion) and "Complex" (multiple criteria) tasks.
    *   **Fields**: Title, description/rationale, mission, maximum completions, and associated incentives.
    *   **States**: Draft, Open, In Progress, Partially Complete, Complete, Expired, and Cancelled.
*   **Acceptance Criteria**: Each task must contain one or more criteria defining what constitutes "completion."
*   **Incentive Types**: Predefined categories: Participation, Collaboration, Innovation, Leadership, and Impact.
*   **Proof Artifacts**: Support for two proof formats:
    *   **Rich Text**: Direct text entry for reflections or links.
    *   **File Upload**: Support for PDF, JPG, PNG, and MP4 (max 10MB).
*   **Trust Score**: A composite thing calculated as the sum of all earned incentive points.

***

## 4. Connections (relationships & verbs)

Connections describe how actors, groups, and things relate to one another.

*   **Membership**: Relates a Person (Member) to a Group (Mission).
*   **Task Ownership**: Relates a Task to a Group (Mission).
*   **Incentive Allocation**: Relates a Task to one or more Incentive Types with specific point values (weights).
*   **Claiming**: Relates a Member to a Task when a submission is started.
*   **Verification**: Relates a Reviewer to a Claim through an approval/rejection decision.
*   **Reward Distribution**: Relates a verified Claim to a Member's Trust Score update.

***

## 5. Events (immutable history)

Events are the "ledger" of the system—an append-only record of every state change.

*   **Audit Trail**: The system shall log every state transition in an immutable "Events" table.
*   **Event Metadata**: Every event must record:
    *   Timestamp (UTC/AEDT).
    *   Actor ID (who performed the action).
    *   Action type (Created, Published, Claimed, Approved, etc.).
    *   Before and after states.
*   **Public Ledger View**: Members shall be able to view the chronological event history for any specific task or mission.
*   **Cryptographic Hashing**: The system shall generate a SHA-256 hash for every uploaded file and record this hash in the Event log to prevent tampering.
*   **Exportability**: Admins shall be able to export the complete Event log as a JSON/CSV file for future blockchain migration.

***

## 6. Knowledge (insights & intelligence)

Knowledge is the intelligence derived from patterns across groups, people, things, and events.

*   **Trust Score Aggregation**: The system shall dynamically calculate a Member’s Trust Score by summing all approved Incentive connections.
*   **Incentive Breakdown**: The dashboard shall display a radial or bar chart showing the member's knowledge/contribution profile across the five incentive dimensions.
*   **Mission Analytics**: The system shall provide Admins with completion rates and velocity metrics (e.g., "Average time to verify a Leadership task").
*   **Leaderboards**: Optional display of top Trust Scores within a Mission to recognize high-impact contributors.
*   **Personalized Suggestions**: The system shall highlight tasks that align with a Member's historical incentive focus or expressed development goals.
*   **System Learning**: The system shall track "Requirement Clarity" based on the ratio of "Request Revision" events to total submissions for specific task types.