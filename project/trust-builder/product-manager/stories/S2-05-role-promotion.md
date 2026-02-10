# Story: Trust-Threshold Role Promotion

## Goal

Automatically promote member roles when trust score thresholds are crossed.

## Complexity (for AI)

Moderate

## Ontology Mapping

- Groups: None
- People: Member role updates
- Things: None
- Connections: None
- Events: `member.role_promoted` event with old/new role
- Knowledge: Trust score drives role progression

## User Story (Gherkin)

Given a member earns approved points
When their trust score crosses a role threshold
Then the system updates their role automatically
And a role promotion event is recorded

## Acceptance Criteria

- [ ] Role thresholds follow rules in `06-incentive-and-trust-score-rules.md`
- [ ] Role updates occur when trust score crosses thresholds
- [ ] Promotions are idempotent (no repeated events at same role)
- [ ] `member.role_promoted` event includes old/new role and score
- [ ] Admin and reviewer permissions respect updated roles
- [ ] Mobile and basic accessibility checks pass

## Implementation Notes (AI-facing)

- Update `src/lib/contracts/claim-engine.ts` to check thresholds after trust updates.
- Add `EventType.MEMBER_ROLE_PROMOTED` (new enum value).
- Store role on `members.role` (already in schema).
- Ensure role upgrade does not downgrade members.

## Definition of Done (DoD)

- All acceptance criteria met
- QA report: PASS
- Product Advisor review: Grade B+ or higher
- Retro file created in `/trust-builder/retros/`
