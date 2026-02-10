# Story: Peer Review Workflow

## Goal

Enable peer review for claims that require human verification, including reviewer assignment and claim state transitions.

## Complexity (for AI)

Complex

## Ontology Mapping

- Groups: Missions scope review context
- People: Reviewer and claimant roles
- Things: Claims and tasks under review
- Connections: Reviewer-to-claim assignment and verification decision
- Events: `claim.review_assigned`, `claim.revision_requested`, `claim.approved`, `claim.rejected`
- Knowledge: Trust score updates derived from approved claims

## User Story (Gherkin)

Given a claim requires peer review
When a qualified reviewer is assigned
Then the claim moves to Under Review
And the reviewer can approve, reject, or request revision
And the system logs events for each state transition

## Acceptance Criteria

- [ ] Claims requiring peer review are queued and assignable
- [ ] Reviewer eligibility respects trust threshold (Contributor or Steward per rules)
- [ ] Reviewers cannot review their own claims
- [ ] Claim status transitions follow the defined state machine
- [ ] Approval triggers trust score update and event logging
- [ ] Revision requested requires resubmission by the member
- [ ] All review actions write events with actor metadata
- [ ] Mobile and basic accessibility checks pass

## Implementation Notes (AI-facing)

- Add reviewer queue page: `src/pages/trust-builder/reviews`.
- API endpoints: `GET /api/trust-builder/reviews/queue`, `PATCH /api/trust-builder/claims/[id]/review`.
- Add `EventType.CLAIM_REVIEW_ASSIGNED` if not present.
- Update claim-engine to handle `under_review`, `revision_requested`, and `rejected` transitions.
- Consider transaction boundaries for approval and trust updates.

## Definition of Done (DoD)

- All acceptance criteria met
- QA report: PASS
- Product Advisor review: Grade B+ or higher
- Retro file created in `/trust-builder/retros/`
