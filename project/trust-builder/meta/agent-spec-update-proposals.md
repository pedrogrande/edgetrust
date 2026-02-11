# Agent Spec Update Proposals

**Date**: 2026-02-11  
**Source**: Sprint 2 pattern analysis + agent-prompt-changelog.md  
**Status**: Awaiting approval before implementation

---

## Summary

Based on analysis of 10 story retrospectives and 2 sprint retrospectives, I propose **8 targeted improvements** across 4 agent spec files. All changes are **additive** (checklist items, clarifications, references) — no rewrites of core instructions.

**Key principles**:

- ✅ Automate over remind (pre-commit > manual checklist)
- ✅ Reference shared docs over repeating content (token efficiency)
- ✅ Add examples to clarify thresholds (grade criteria, review triggers)
- ✅ Close improvement loops (retro → meta-coach handoff)

---

## 1. Product Owner (product-owner.agent.md)

### Change 1A: Add Strategic Review Policy Reference

**Location**: After "Responsibilities" section, before "Sprint and story planning"

**Insert**:

```markdown
## Before Planning Each Sprint

Review these documents to incorporate latest learnings:

- Latest sprint retrospective in `/trust-builder/retros/`
- Agent prompt changelog in `/trust-builder/meta/agent-prompt-changelog.md`
- Sprint learnings doc in `/trust-builder/retros/sprint-X-learnings-and-guidance.md`

This 10-minute review prevents repeating solved problems and ensures process improvements are applied.
```

**Reason**: Sprint 1 → 2 estimation improved from 87% error to near-perfect because PO reviewed retros. Make this explicit.

**Token impact**: +150 tokens (~6 lines), saves 500+ tokens by preventing rework explanations

---

### Change 1B: Clarify Strategic Review Policy

**Location**: In existing "Story template" section, add subsection after "## Implementation Notes"

**Insert**:

```markdown
## Strategic Review Requirement

Based on story complexity, determine if pre-implementation strategic review is required:

**Mandatory** (product-advisor review before fullstack-developer begins):

- Complex stories: 6+ points, 3+ ontology dimensions touched, new architectural patterns
- Moderate stories: 3-5 points, first implementation of a pattern type
- Infrastructure: Schema migrations, external service integrations, auth changes

**Optional** (can proceed directly to implementation):

- Simple stories: 1-2 points, proven/repetitive patterns
- Bug fixes, UI polish, documentation updates

**ROI evidence**: Sprint 2 showed 3-4x ROI (45 min review prevents 2-3 hours rework, improves migration readiness 85% → 95%)
```

**Reason**: Strategic review 0% → 100% adoption with proven ROI, but policy was implicit. Make it explicit with evidence.

**Token impact**: +200 tokens, justifies itself via faster decision-making

---

### Change 1C: Add Testing Schedule Requirement to Template

**Location**: In existing "Story template" section, add after "## Implementation Notes"

**Insert**:

```markdown
## Testing Schedule (REQUIRED for all stories)

- **Day**: [Day 5 or before QA handoff]
- **Duration**: [1-2 hours]
- **Owner**: qa-engineer
- **Devices/browsers**: [Specify: e.g., iOS Safari 375px, Android Chrome, desktop Firefox]
- **Focus areas**: [List specific ACs requiring manual validation, e.g., mobile responsive, keyboard navigation, error states]

**Why required**: Sprint 1-2 had 0% systematic manual testing, causing 6 ACs marked "NEEDS TEST" and grade reductions.
```

**Reason**: Manual testing occurred 0% systematically. Testing appeared in ACs but no schedule = not done.

**Token impact**: +150 tokens, prevents grade reductions (A → A-) worth more than token cost

---

### Product Owner Total Impact

- **Additions**: 3 new subsections (500 tokens)
- **Benefits**: Prevents retro review omission, clarifies strategic review triggers, ensures testing is scheduled
- **Priority**: HIGH (addresses 2 persistent blockers: testing gaps, inconsistent strategic review)

---

## 2. Fullstack Developer (fullstack-developer.agent.md)

### Change 2A: Add Gold Standard Patterns Reference

**Location**: After "Quasi-smart contract rules" section, before "Git workflow responsibilities"

**Insert**:

````markdown
## Gold Standard Patterns (Reuse Before Inventing)

Before implementing, check if these proven patterns apply:

**Atomic Assignment** (race-proof resource claiming):

```typescript
// Use UPDATE...RETURNING with WHERE conditions
const [claim] = await db
  .update(claims)
  .set({ reviewer_id: memberId, status: 'in_review' })
  .where(
    and(
      eq(claims.id, claimId),
      eq(claims.status, 'submitted'),
      isNull(claims.reviewer_id)
    )
  )
  .returning();

if (!claim) {
  return { error: 'Someone else claimed this first' }; // Race lost, immediate feedback
}
```
````

**Applications**: Claim assignment, mission leader election, task claiming, voting, resource reservation

**Defense-in-Depth** (constraints + sanctuary culture):

- Layer 1: Database constraint (uncheateable) — e.g., `CHECK (revision_count <= 2)`
- Layer 2: Sanctuary message (educational) — e.g., "You've reached the maximum of 2 revisions"
- **Migration**: Constraints map directly to Solidity `require()` statements

**Transaction Boundaries**:

- Pass `PoolClient` to functions, caller manages transaction scope
- Write events in same transaction as state changes
- Event writes are part of the contract, not an afterthought

See `/trust-builder/retros/sprint-2-learnings-and-guidance.md` for full details.

````

**Reason**: S2-04 discovered atomic assignment; S2-03/04 used defense-in-depth consistently. Documenting them saves rediscovery time.

**Token impact**: +400 tokens, saves 1,000+ tokens in dev-advisor clarification cycles

---

### Change 2B: Add Character Encoding Prevention

**Location**: In existing "Implementation workflow" section, before step 1

**Insert**:
```markdown
## Pre-Implementation Setup (First Story Only)

Before your first commit:
- [ ] Verify pre-commit hook is installed (`.husky/pre-commit` or equivalent)
- [ ] Test it: Try committing a .ts file with a smart quote — should block with helpful message
- [ ] Purpose: Prevents character encoding bugs (curved quotes, en-dashes) that recurred in S2-03, S2-04

````

**Reason**: Character encoding RECURRED despite S2-03 identification. Manual reminder failed; automated gate succeeds.

**Token impact**: +100 tokens, prevents 2 bugs per sprint (10 min each)

---

### Change 2C: Strengthen Event Writing Reminder

**Location**: In existing "Implementation workflow", between steps 3 and 4

**Insert**:

```markdown
### 3a. Event Logging Checklist

For every database state change, write an event entry **in the same transaction**:

- [ ] INSERT/UPDATE/DELETE → corresponding event entry
- [ ] Event metadata includes: `actor_id`, `entity_id`, `before`/`after` state in JSONB
- [ ] Trust Score changes include `trust_score_before` and `trust_score_after` in metadata
- [ ] Edge cases logged: rejections, timeouts, cancellations (not just happy path)

**Why**: Trust Score and entities must be fully derivable from events (95% migration readiness target).
```

**Reason**: Event sourcing is 95% ready but relies on comprehensive capture. Make the checklist explicit.

**Token impact**: +150 tokens, maintains 90%+ migration readiness

---

### Change 2D: Add Strategic Review Wait Step

**Location**: In existing "Implementation workflow", make step 1 → step 1a + 1b

**Replace**:

```markdown
1. Read user story from handoff
```

**With**:

```markdown
1. Read user story from handoff
   1a. Check story complexity tag (Simple/Moderate/Complex) - If Moderate or Complex: Wait for product-advisor strategic review before implementation - If Simple: Proceed to implementation
   1b. Review gold standard patterns (see section above) — can any be reused?
```

**Reason**: Strategic review has 3-4x ROI but workflow didn't make the wait explicit. Developers proceeded immediately in S1.

**Token impact**: +80 tokens, prevents rework

---

### Fullstack Developer Total Impact

- **Additions**: 4 new sections/checkboxes (730 tokens)
- **Benefits**: Documents gold standards, automates character encoding prevention, ensures event completeness, clarifies strategic review trigger
- **Priority**: HIGH (addresses 3 persistent blockers: character encoding, incomplete events, bypassed strategic review)

---

## 3. QA Engineer (qa-engineer.agent.md)

### Change 3A: Add Character Encoding Check

**Location**: In existing "Ontology validation" section, add as first checkbox

**Insert**:

```markdown
- [ ] **Check for character encoding issues**: Search .ts/.tsx files for smart quotes (`'` `'` `"` `"`), en-dashes (`–` `—`), other non-ASCII. Should be caught by pre-commit hook but verify manually if hook bypassed.
```

**Reason**: QA caught character encoding bugs in S2-03 and S2-04. Add explicit check until pre-commit hook is universally enforced.

**Token impact**: +50 tokens

---

### Change 3B: Add Event Completeness Check

**Location**: In existing "Ontology validation" section, expand "Confirm Events table entries..." checkbox

**Replace**:

```markdown
- [ ] Confirm Events table entries are written for all state changes
```

**With**:

```markdown
- [ ] Confirm Events table entries are written for all state changes:
  - [ ] Happy path (task created, claim submitted, review completed)
  - [ ] Edge cases (claim rejected, timeout, cancellation)
  - [ ] Trust Score changes include `trust_score_before` and `trust_score_after` in metadata JSONB
  - [ ] All events have: `actor_id`, `entity_id`, timestamp, `event_type`, metadata with before/after state
```

**Reason**: Event sourcing is 95% ready but QA needs explicit sub-checklist to verify comprehensive capture.

**Token impact**: +100 tokens, maintains 90%+ migration readiness

---

### Change 3C: Add Testing Schedule Verification

**Location**: In existing "Testing approach" section, add as step 0

**Insert**:

```markdown
### 0. Verify Testing Schedule

Before beginning QA:

- [ ] User story has "Testing Schedule" section (if missing, return to product-owner)
- [ ] Schedule specifies: day, duration, owner, devices/browsers
- [ ] Confirm you have access to specified devices (e.g., iOS Safari 375px, Android Chrome)

This ensures systematic manual testing (Sprint 1-2 had 0% scheduled testing).
```

**Reason**: Testing schedule added to story template but QA needs reminder to check it exists and follow it.

**Token impact**: +100 tokens, achieves 100% systematic testing

---

### Change 3D: Strengthen Git Workflow Checks

**Location**: In existing "PR and git workflow checks" section, add two checkboxes

**Insert after existing checkboxes**:

```markdown
- [ ] Feature branch naming convention followed (e.g., `feature/S3-01-test-infrastructure`, not `fix-stuff`)
- [ ] No commits were pushed directly to main (check `git log origin/main` for story-related commits without PR)
```

**Reason**: Git violations persist at 25% rate (S2-03 worked directly on main). Tighten QA checks while pre-push hook is implemented.

**Token impact**: +80 tokens, targets 100% compliance

---

### QA Engineer Total Impact

- **Additions**: 4 new checkboxes + 1 new step (330 tokens)
- **Benefits**: Catches character encoding, verifies event completeness, ensures testing schedule followed, strengthens git checks
- **Priority**: HIGH (addresses 4 persistent blockers: encoding, incomplete events, no testing schedule, git violations)

---

## 4. Product Advisor (product-advisor.agent.md)

### Change 4A: Add Grade Threshold Examples

**Location**: In existing "Decision matrix" section, replace with expanded version

**Replace**:

```markdown
## Decision matrix

- **Grade A or B**: Approve for retro-facilitator
- **Grade C, D, or F**: Hand back to fullstack-developer with detailed feedback
```

**With**:

```markdown
## Decision matrix

### Grade A (4.0): Approve for retro-facilitator

**Criteria**:

- 90%+ migration readiness (stable IDs, events sufficient for reconstruction, Merkle-ready)
- Gold standard patterns applied correctly (atomic assignment, defense-in-depth)
- Complete event capture (happy path + edge cases, Trust Score derivable)
- Sanctuary culture in all user-facing messages (supportive, not punitive)
- **Example**: S2-04 peer review (95% migration, atomic assignment, before/after state capture)

### Grade B+ (3.3+): Approve for retro-facilitator

**Criteria**:

- 80%+ migration readiness
- Minor improvements recommended but not blocking (e.g., richer event metadata would help)
- Events mostly complete (happy path covered, edge cases documented for future)
- **Example**: S2-02 admin tasks (85% migration, minor metadata enhancements suggested)

### Grade C (2.0): Return to fullstack-developer

**Criteria**:

- <80% migration readiness
- Missing event entries for key state changes
- Ontology dimensions incorrectly mapped (Thing classified as Connection)
- Error messages lack sanctuary culture (technical jargon, punitive tone)

### Grade D/F: Return to fullstack-developer (significant issues)

**Criteria**:

- Violates quasi-smart contract rules (Trust Score stored mutably, events can be edited/deleted)
- No event logging implemented
- Incorrect architecture (not vertical slice, missing critical layer)
```

**Reason**: Decision matrix is clear (A/B approve, C+ return) but thresholds could be more specific. Add examples from Sprint 2.

**Token impact**: +350 tokens, accelerates review decisions

---

### Change 4B: Add Pattern Reuse Check to Review Lens

**Location**: In existing "Review lens" section, add as item 6

**Insert**:

```markdown
### 6. Pattern Reuse

- Are gold standard patterns applied where appropriate?
  - Atomic assignment for race-sensitive operations (claim assignment, voting, resource allocation)?
  - Defense-in-depth for constraint validation (CHECK constraint + sanctuary message)?
  - Transaction boundaries clean (PoolClient passed, events in same tx)?
- Or is the developer reinventing solutions to solved problems?
```

**Reason**: Gold standards identified in S2 but Advisor didn't have explicit lens to check for their reuse.

**Token impact**: +100 tokens, encourages pattern consistency

---

### Product Advisor Total Impact

- **Additions**: Expanded decision matrix + new review lens item (450 tokens)
- **Benefits**: Clearer grade thresholds, faster review decisions, pattern reuse encouraged
- **Priority**: MEDIUM (improves review quality, not blocking persistent bugs)

---

## 5. Retro Facilitator (retro-facilitator.agent.md)

### Change 5A: Add Process Improvement Section to Template

**Location**: In existing retro template (under "Document" step), add new section after "## Next Story Considerations"

**Insert**:

```markdown
## Process Improvement Suggestions

**For Meta-Coach** (review after 2-3 stories or sprint completion):

- [ ] Agent instruction updates needed? (checklist items, clarifications, new handoffs)
- [ ] Recurring patterns that should be automated? (e.g., pre-commit hooks for persistent bugs)
- [ ] Documentation gaps? (missing examples, unclear thresholds)
- [ ] Handoff friction? (unclear responsibilities, missing context in handoff prompts)

**Examples**:

- "Character encoding issues recurred — should add pre-commit hook suggestion to fullstack-developer checklist"
- "Strategic review ROI is 3-4x but policy is implicit — should add explicit guidance to product-owner"
```

**Reason**: Retro facilitator captures learnings but doesn't explicitly feed them into continuous improvement loop. Close the loop.

**Token impact**: +150 tokens

---

### Change 5B: Add Ontology Confusion Question

**Location**: In existing "Facilitate reflection" section, under "### What did we learn?", add sub-question

**Insert**:

```markdown
#### About the ONE ontology implementation

- Which dimensions were touched? (Groups/People/Things/Connections/Events/Knowledge)
- Where did ontology classification cause confusion? (e.g., "Is this a Thing or Connection?")
- Did we discover new patterns for mapping domain concepts to dimensions?
```

**Reason**: Ontology confusion is subtle and doesn't appear in standard "What went well / could improve" format. Ask explicitly.

**Token impact**: +80 tokens

---

### Change 5C: Add Meta-Coach Handoff

**Location**: In existing "handoffs" frontmatter section

**Insert**:

```yaml
- label: Feed to Meta-Coach
  agent: meta-coach
  prompt: Retrospective complete for [Story ID]. Review for recurring patterns that should be incorporated into agent instructions or automated via pre-commit/pre-push hooks.
  send: false
```

**Reason**: Meta-coach exists but isn't explicitly triggered. Adding handoff makes the improvement loop systematic.

**Token impact**: +60 tokens (YAML)

---

### Retro Facilitator Total Impact

- **Additions**: New template section + new question + new handoff (290 tokens)
- **Benefits**: Closes continuous improvement loop, surfaces ontology confusion, triggers meta-coach systematically
- **Priority**: MEDIUM (improves process over time, not urgent)

---

## Agents NOT Modified

### meta-coach.agent.md

**Reason**: New agent role with no historical patterns yet. Will refine after Sprint 3 based on usage.

---

## Additional Agent Recommendation: NO

**Question**: Should we add new agents (e.g., observability specialist, deployment engineer)?

**Answer**: No, not yet.

**Reasoning**:

- Current 5 agents cover all core roles (plan, implement, validate, review, learn)
- Persistent blockers were **process/automation issues**, not missing roles:
  - Character encoding → pre-commit hook (not new agent)
  - Testing schedules → story template (not new agent)
  - Git violations → pre-push hook (not new agent)
- **Emerging risk** (observability gaps) is a **technical implementation**, not an agent role:
  - Will be addressed in future user stories (S4+: error tracking, monitoring dashboard)
  - Product-owner can plan it, fullstack-developer can implement it, QA/Advisor can review it

**When to reconsider**:

- If a role appears in 3+ stories that none of the current 5 agents naturally own
- If handoffs become consistently confused (e.g., "Who validates deployment?" → maybe need Deploy agent)
- If token costs spike due to repeated context-loading for a specific domain (e.g., security reviews)

**Current recommendation**: Improve existing 5 agents' instructions (as proposed above) before adding new roles.

---

## Implementation Plan

If approved, implement changes in this order:

1. **Product Owner** (changes 1A-1C) — foundational, affects story planning
2. **Fullstack Developer** (changes 2A-2D) — most changes, highest priority
3. **QA Engineer** (changes 3A-3D) — validates dev work
4. **Product Advisor** (changes 4A-4B) — reviews after QA
5. **Retro Facilitator** (changes 5A-5C) — captures learnings

**Method**: Use `multi_replace_string_in_file` for each agent file (batch all changes per agent).

**Validation**: After Sprint 3, check success metrics in agent-prompt-changelog.md (0 encoding bugs, 100% testing, 100% git compliance).

---

## Total Token Impact

| Agent               | Current Size | Added Tokens | New Size   | % Increase |
| ------------------- | ------------ | ------------ | ---------- | ---------- |
| product-owner       | ~1,800       | +500         | ~2,300     | +28%       |
| fullstack-developer | ~1,500       | +730         | ~2,230     | +49%       |
| qa-engineer         | ~1,200       | +330         | ~1,530     | +28%       |
| product-advisor     | ~1,000       | +450         | ~1,450     | +45%       |
| retro-facilitator   | ~1,100       | +290         | ~1,390     | +26%       |
| **Total**           | **~6,600**   | **+2,300**   | **~8,900** | **+35%**   |

**Cost-benefit**:

- **Cost**: +2,300 tokens per agent invocation (~$0.03-0.05 at current Claude rates)
- **Benefit**: Prevents ~500-2,000 tokens in clarification cycles, rework explanations, and bug-fixing loops
- **ROI**: Positive if changes prevent even 1 clarification cycle per sprint

**Token efficiency strategies used**:

- Reference shared docs (sprint-2-learnings-and-guidance.md) instead of repeating patterns
- Add examples inline only where critical (grade thresholds, code patterns)
- Use checklists (scannable) over prose paragraphs

---

## Next Steps

1. **Review**: User/team reviews this proposal
2. **Approve**: Confirm which changes to implement (all, subset, or modified versions)
3. **Implement**: Meta-coach applies changes via `multi_replace_string_in_file`
4. **Notify**: Update agents via handoffs about what changed and why
5. **Validate**: After Sprint 3, check success metrics and refine if needed
