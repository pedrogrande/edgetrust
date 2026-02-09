# User stories for Future's Edge platform

## Epic 1: Identity & Authorization (People & Groups)

**US-001: Member Registration & Identity**
*   **As a** prospective member,
*   **I want to** create a profile that establishes my identity as a `Person` entity,
*   **So that** I can begin building my reputation.
*   **Acceptance Criteria:**
    *   Creates a `Person` entity in the `people` table.
    *   Records a `user_signup` Event.
    *   Automatically creates a `member_of` Connection to the "Global" Group.
    *   PII is stored in `properties` with field-level encryption.

**US-002: Field Office Membership**
*   **As a** Member,
*   **I want to** join a local Field Office `Group`,
*   **So that** I can access local missions and collaborate.
*   **Acceptance Criteria:**
    *   User requests join -> `request_to_join` Event.
    *   Field Office Lead approves -> `member_of` Connection created between User and Field Office Group.
    *   User can now see `Things` scoped to that Field Office.

## Epic 2: Entity Management (Things)

**US-003: Create a Mission (Thing)**
*   **As a** Member,
*   **I want to** instantiate a new `Mission` from the standard "Mission Type",
*   **So that** I can define a goal for myself or others.
*   **Acceptance Criteria:**
    *   System reads the "Mission" Type definition (from Ontology).
    *   Creates a new `Thing` (Type: `mission`) in "Draft" state.
    *   Creates an `owns` Connection between Creator and Mission.
    *   Records `mission_created` Event.

**US-004: Flexible Type Scoping**
*   **As a** Field Office Lead,
*   **I want to** define a custom `Thing Type` (e.g., "Beach Cleanup") for my group,
*   **So that** my squad can track specific local activities.
*   **Acceptance Criteria:**
    *   Lead uses the "Ontology Director" (or simple UI) to define the type.
    *   System registers the new Type scoped *only* to that Field Office Group.
    *   Global namespace remains unpolluted.

## Epic 3: Action & Verification (Connections & Events)

**US-005: Start a Mission (The Contract)**
*   **As a** Member,
*   **I want to** explicitly commit to a Mission,
*   **So that** the system tracks my active work.
*   **Acceptance Criteria:**
    *   User clicks "Start".
    *   System checks constraints (e.g., "Max 3 active missions").
    *   System creates `assigned_to` Connection (Member -> Mission).
    *   System records `mission_started` Event.

**US-006: Submit Proof (The Evidence)**
*   **As a** Member,
*   **I want to** submit a URL or file as proof of completion,
*   **So that** my work can be verified.
*   **Acceptance Criteria:**
    *   System creates an `Evidence` Thing (Type: `evidence`) containing the URL.
    *   System connects Evidence to Mission via `proves` Connection.
    *   System records `proof_submitted` Event.

**US-007: Peer Verification (The Settlement)**
*   **As a** Peer Reviewer,
*   **I want to** verify another member's proof,
*   **So that** they can receive their Trust Points.
*   **Acceptance Criteria:**
    *   Reviewer creates `verified_by` Connection on the Mission.
    *   Logic Check: If 2 verifications exist -> Trigger `MissionCompleted` Event.
    *   Logic Check: Update Member's Trust Score (derived property).

## Epic 4: Intelligence (Knowledge)

**US-008: Semantic Mission Search**
*   **As a** Member,
*   **I want to** search for missions using natural language (e.g., "Help with climate stuff"),
*   **So that** I find work that matches my interests.
*   **Acceptance Criteria:**
    *   All Missions are indexed into the `Knowledge` dimension (Vector Search).
    *   Search query is embedded and matched against Mission descriptions.
    *   Results respect Group scope (only show missions I have access to).
