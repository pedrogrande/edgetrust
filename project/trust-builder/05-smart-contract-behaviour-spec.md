# Quasi-smart contract behavior spec: Trust builder

This document defines the logic, state transitions, and immutability rules that allow Trust Builder tasks to function as "quasi-smart contracts." While the system is not yet on-chain, it mimics the rigorous behavior of a decentralized platform to prepare the community for future migration.

***

## 1. Contract lifecycle (Task states)

A Task represents a published agreement between the organization and a potential contributor. It must follow a strict state machine to maintain trust.

*   **Draft**: The initial state where an Admin creates the task. Requirements and incentives can be edited freely. The task is not visible to members.
*   **Open**: The task is "deployed" to the public list. It is now available for claims. **Immutability rule**: Once Open, the title, rationale, criteria, and incentives are locked and cannot be edited.
*   **In progress**: At least one member has initiated a claim. The task remains open for others unless the `max_completions` limit has been reached.
*   **Partially complete**: For complex tasks, some acceptance criteria have been verified, but the full contract is not yet fulfilled.
*   **Complete**: The maximum number of completions has been reached and all claims are verified. The task is archived.
*   **Expired**: The `deadline` has passed. No further claims can be submitted.
*   **Cancelled**: An Admin has withdrawn the task. A reason must be logged in the Events dimension.

***

## 2. Claim lifecycle (Submission states)

A Claim is a member’s attempt to fulfill the contract. Each claim follows its own workflow.

*   **Submitted**: The member has provided proof (text or file) for the required criteria.
*   **Under review**: A Steward or Peer is currently evaluating the proof.
*   **Revision requested**: The reviewer has asked for more information or a change. The member can update their proof and re-submit.
*   **Approved**: The proof meets the acceptance criteria. This state change triggers the reward execution.
*   **Rejected**: The proof does not meet the criteria and the reviewer has closed the claim. No rewards are issued.

***

## 3. Immutability and versioning rules

To simulate the reliability of blockchain code, Trust Builder enforces strict rules on "published" data.

*   **Publication as deployment**: Clicking "Publish" is a one-way action. It moves a task from Draft to Open and locks its core parameters.
*   **Locked fields**: Title, Mission, Rationale, Acceptance Criteria, and Incentive Values cannot be changed once a task is Open.
*   **Error handling (v2 approach)**: If a published task contains a significant error, the Admin must **Cancel** the current task and create a new version (e.g., "Webinar Reflection v2").
*   **Append-only edits**: Minor administrative changes (like extending a deadline) are allowed but must be recorded as an Event, documenting the old value, new value, and the actor responsible.

***

## 4. Verification logic (Oracles)

The "Verification Method" defined in the task acts as the oracle that determines if the contract conditions have been met.

*   **Auto-approve**: Upon submission, the system immediately moves the claim to "Approved" and executes the reward. This is used for low-stakes, verifiable actions (e.g., "Attend webinar").
*   **Admin review**: A designated founding admin must manually sign off on the proof.
*   **Peer review**: A member with a Trust Score above a specific threshold (e.g., 250 points) must review the claim. To prevent collusion, the system may assign reviewers randomly or require two independent sign-offs.

***

## 5. Reward execution

When a claim moves to the "Approved" state, the system executes a "Virtual Transaction."

*   **Atomic updates**: The Member's trust score must be updated in a single operation that includes the point increase for all associated incentive types (Participation, Innovation, etc.).
*   **Derivation rule**: A member’s "Total Trust Score" is never a simple editable field. It must be a derived value calculated by summing all "Approved" claims in the audit log.
*   **Transparency**: The reward event must be visible in the public Event log, showing the Task ID, Member ID, and the specific points awarded.

***

## 6. The ledger (Event logging)

The "Events" dimension serves as the single source of truth for the organization.

*   **Mandatory logging**: Every state change (Task State, Claim Status, Trust Update) must generate an entry in the Events table.
*   **Timestamping**: All events must use server-side timestamps to prevent members from spoofing activity times.
*   **Actor attribution**: Every event must be linked to a Person (Member ID).
*   **Proof hashing**: When a file is submitted as proof, the system generates a SHA-256 hash. This hash is stored in the Event record. If the file is later moved or changed, the hash provides proof of the original submission.
*   **Immutable storage**: The Events table should be technically restricted so that no "Update" or "Delete" operations are possible once a record is written.

***

## 7. Access control rules

*   **Claiming**: A member can only claim an "Open" task. They cannot claim the same task multiple times unless specifically allowed by the `max_completions_per_member` field.
*   **Reviewing**: A member cannot review their own claim or a task they created. 
*   **Visibility**: While Task descriptions are public, the Proof artifacts (files/text) are only visible to the submitter, the assigned reviewer, and founding admins to protect privacy. Summary data (e.g., "FE-M-00042 completed Task-101") is public.