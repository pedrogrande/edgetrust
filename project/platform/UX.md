To make the Trust Builder feel like a cohesive, human-centered prototype, your screens should balance clear technical data (the "contract") with an encouraging, identity-building experience (the "trust").

Here are the suggested elements, actions, and states for your wireframes.

## Public task list

This is the "marketplace" of opportunities. It should feel busy and open, showing that Future’s Edge is a living organization.

- **Components**:
  - **Mission filter**: A sidebar or dropdown to filter by "Webinar Series," "Storyverse," or "Governance."
  - **Incentive filter**: Checkboxes for the five dimensions (Participation, Innovation, etc.).
  - **Task cards**: Each card shows the Title, Mission, Total Points, and a "Limited/Unlimited" badge.
  - **Availability counter**: For limited tasks, show "3 of 10 spots remaining."
  - **Global trust feed**: A small sidebar ticker showing recent public activity: "FE-M-0042 just earned +50 Innovation points."
- **Actions**:
  - Filter and Search tasks.
  - Click a card to view the full contract.
  - Sign in (prominent in the header).
- **States**:
  - **Open**: Active and available for claims.
  - **Filling**: Limited tasks with few spots left (highlighted in orange).
  - **Completed**: Task is full or expired (greyed out).
  - **Empty**: No tasks matching your specific filters.

## Task detail + “submit claim” flow

This is the "quasi-smart contract" view. It must clearly state the rules of the agreement before a member commits.

- **Components**:
  - **Contract header**: Task title, Mission name, and "Contract ID" (e.g., TASK-202).
  - **Rationale box**: A clear "The Why" section explaining the organizational value.
  - **Reward breakdown**: A visual display of points across the five dimensions (e.g., 50 Participation, 25 Innovation).
  - **Acceptance criteria**: A numbered list of "The What" requirements.
  - **Submission form**: Dynamic fields based on the proof type.
    - **Rich text**: A formatting-enabled text box.
    - **File upload**: A drag-and-drop zone with a list of accepted file types and max size.
  - **Verification oracle**: A note on how this will be verified (Auto, Admin, or Peer).
- **Actions**:
  - **Claim task**: Reserves a spot (if limited).
  - **Submit proof**: Uploads the evidence and moves the claim to pending.
  - **Cancel claim**: Releases the spot if the member decides not to do it.
- **States**:
  - **Unclaimed**: Viewing the contract before committing.
  - **In progress**: Member has claimed the task but hasn't submitted proof.
  - **Submitting**: An active loading state for file uploads.
  - **Submitted**: Confirmation that the claim is now "Pending" in the audit log.

## Member dashboard

This is the "Knowledge" dimension, showing the member’s growth and current standing.

- **Components**:
  - **Identity card**: Name, Member ID (FE-M-XXXXX), and Rank (e.g., "Explorer").
  - **Trust score summary**: Large total score with a breakdown of "Earned" vs. "Pending (Escrow)" points.
  - **Incentive profile**: A radial (spider) chart or bar chart showing the balance across the 5 dimensions.
  - **Activity feed**: A chronological list of the member's claims with status badges (Approved, Pending, Revision).
  - **Audit trail link**: A button to "View full event history" or "Export my data."
  - **Suggested missions**: 2–3 tasks that match their current profile or unlock the next rank.
- **Actions**:
  - Filter activity by status or mission.
  - Click a claim to see feedback from a reviewer.
  - Download "Genesis Contribution Report" (JSON/PDF).
- **States**:
  - **Genesis**: A new member with 0 points (show "Getting Started" tips).
  - **Pending**: Points are visible but greyed out while awaiting review.
  - **Achiever**: Milestone celebration states when a new Rank is unlocked (e.g., at 250 points).

## Admin task creation/edit

This is the "Architect" view where the contracts are designed.

- **Components**:
  - **General info**: Title, Mission selector, and Rationale text area.
  - **Availability settings**: Toggle for "Unlimited" vs. "Limited" and a "Max Completions" input.
  - **Incentive editor**: Sliders or input fields for each of the 5 dimensions.
  - **Requirements builder**: A dynamic section where admins click "Add Criterion" to define:
    - Description of what is needed.
    - Proof type selector (Text or File).
    - Verification method (Auto, Admin, or Peer).
  - **Publication toggle**: Save as Draft vs. Publish (with an "Immutable once published" warning).
- **Actions**:
  - Save as Draft.
  - Preview (to see the task as a member would).
  - Publish (executes the "deployment" event).
  - Cancel task (only for published tasks, requires a reason).
- **States**:
  - **Draft**: Editable and private.
  - **Published**: Core fields are locked/read-only.
  - **Cancelled**: Shown as archived with the cancellation reason displayed.

## Claim review screen

This is the "Steward" or "Peer" view where decisions are made.

- **Components**:
  - **Review header**: Member ID, Task Title, and Time Since Submission.
  - **Comparison view**: The task's original acceptance criteria displayed side-by-side with the member's submitted proof.
  - **File viewer**: An in-app previewer for images/PDFs or a "Download to verify" link.
  - **Evidence hash**: Display of the SHA-256 hash to show the record is integrity-checked.
  - **Review panel**:
    - "Approve" (green), "Request Revision" (yellow), "Reject" (red).
    - A mandatory "Reviewer Comment" box.
- **Actions**:
  - Execute the decision (updates the claim state and awards points).
  - Flag for "Admin Oversight" (if a peer reviewer is unsure).
- **States**:
  - **Under review**: Shown when a reviewer opens the claim to prevent double-reviews.
  - **Finalized**: Once a decision is made, the buttons are disabled and the outcome is locked.
  - **History**: View previous versions if the claim was previously sent back for "Revision."