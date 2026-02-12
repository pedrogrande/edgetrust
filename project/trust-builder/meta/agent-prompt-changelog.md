# Agent Prompt Changelog

**Purpose**: Track iterative improvements to agent instructions based on retrospective learnings  
**Owner**: meta-coach  
**Updated**: After each sprint retrospective analysis

---

## [2026-02-12] UI Layout Made First-Class Quality Dimension

**Analysis Source**: ImprovingUILayout.md recommendations + S3-03 retrospective review  
**Key Insight**: Layout quality currently implied under "UX" but not operationalized with explicit checks  
**Status**: ✅ IMPLEMENTED (4 agent specs updated)

### Rationale

While sanctuary culture, ontology correctness, and migration readiness are explicitly validated at every stage, UI layout and information hierarchy have been evaluated implicitly. This creates risk of:

- Developers delivering functionally correct but visually confusing interfaces
- QA passing stories with unclear primary actions or poor visual grouping
- Product Advisor catching layout issues only at final review (late feedback)
- Inconsistent application of layout patterns across stories

### Changes Applied

**Agents affected**:

- **product-advisor**: Added new section "6. Layout & information hierarchy" to review lens:
  - Check for one clear primary action per screen
  - Verify related elements are visually grouped
  - Assess whether layout supports calm decision-making (not dense/overwhelming)
  - Validate information hierarchy (most important is visually primary)
  - Confirm warnings/errors appear near relevant content with breathing room
  - Reference `/project/trust-builder/patterns/UI-layout-pattern.md` for standards

- **qa-engineer**: Added "Layout & UX validation" section to validation checklist:
  - Primary action clarity (one obvious Button variant="default")
  - Visual grouping (Cards, sections, consistent spacing)
  - Information hierarchy (key content visible without scrolling)
  - Responsive behavior (375px stacking, no awkward scroll)
  - Sanctuary feel (comfortable spacing, dedicated warning areas)
  - Keyboard & focus order
  - Record layout issues under "Layout/UX" subheading even if functionality passes
  - Reference `/project/trust-builder/patterns/UI-layout-pattern.md` for detailed checks

- **fullstack-developer**: Added "UI Layout composition" subsection to React UI patterns:
  - Follow `/project/trust-builder/patterns/UI-layout-pattern.md` for:
    - Standard page patterns (list+detail, single-column form, wizard)
    - One primary action per screen (Button variant="default")
    - Comfortable spacing (container max-w-2xl or max-w-6xl, space-y-4/6)
    - Visual grouping (Cards, sections, consistent spacing)
    - Sanctuary-aligned information hierarchy (calm, not dense)

- **retro-facilitator**: Added layout-specific reflection question:
  - "Where did UI layout or information hierarchy slow us down or confuse users?"

### Expected Impact

- **Earlier detection**: QA catches layout issues before strategic review
- **Clearer guidance**: Developer has concrete layout patterns to follow during implementation
- **Consistent quality**: Layout validated at same rigor as ontology, events, migration readiness
- **Faster iterations**: Layout feedback in QA cycle (1-2 hours) vs strategic review (end of story)
- **Better documentation**: Layout issues captured in retros for pattern extraction

### Metrics to Watch (Sprint 4+)

- % of strategic reviews mentioning layout concerns (expect decrease from ~40% baseline)
- % of QA reports with "Layout/UX" findings (expect increase initially as awareness grows)
- Retro mentions of "confusing layout" or "hard to find primary action" (expect decrease)
- Time from implementation → strategic approval (expect decrease if layout feedback shifts left)

### Documentation Context

This change operationalizes the existing `/project/trust-builder/patterns/UI-layout-pattern.md` (created earlier) by explicitly requiring all agents to reference and validate against it. The pattern doc provides concrete examples, checklists, and standard compositions.

---

## [2026-02-11] Sprint 2 Pattern Analysis → Sprint 3 Improvements

**Analysis Source**: 10 story retros (S1-01 through S2-04) + 2 sprint retros  
**Key Patterns**: 4 persistent blockers, 4 resolved patterns, 2 gold standards identified  
**Status**: ✅ IMPLEMENTED (all 8 changes applied to 5 agent files)

**Developer Standards Formalized** (2026-02-11):

- ✅ Created comprehensive [developer-standards-checklist.md](developer-standards-checklist.md)
- ✅ Documents 9 coding patterns from Sprint 1-2 learnings
- ✅ Includes pre-implementation checklist, QA handoff checklist, common pitfalls
- ✅ Strategic review recommendations from S3-01 integrated
- ✅ Success metrics defined for Sprint 3+ tracking

- Sprint 2 learnings doc: Pre-commit hook recommended

**Agents affected**:

- **fullstack-developer**: Added pre-implementation checklist item:
  - "Before first commit: Ensure pre-commit hook is installed (detects non-ASCII characters in .ts/.tsx files)"
- **qa-engineer**: Added validation checklist item:
  - "Check for character encoding issues (smart quotes, en-dashes) in string literals"

**Expected impact**: 100% prevention of character encoding bugs (automated gate vs manual reminder)

---

### Change 2: Institutionalize Testing Schedules

**Reason**: Manual testing occurred 0% systematically across Sprint 1-2 (10 stories). Impact: 6 ACs marked "NEEDS TEST", grade reductions from A → A-. Root cause: Testing appears in ACs but no owner/timeline/resources allocated.

**Evidence**:

- Sprint 1: 6 stories, 0 scheduled testing
- Sprint 2: 4 stories, 0 scheduled testing
- S2-03 retro: "Mobile testing not completed" (NEEDS TEST)
- S2-04 retro: "Accessibility testing missing" (NEEDS TEST)
- Sprint 2 learnings doc: Testing schedule now required in story template

**Agents affected**:

- **product-owner**: Added to story template section:
  - "## Testing Schedule (REQUIRED)\n\n- **Day**: [Day 5 or before handoff]\n- **Duration**: [1-2 hours]\n- **Owner**: qa-engineer\n- **Devices/browsers**: [Specify: iOS Safari 375px, Android Chrome, desktop]\n- **Focus areas**: [List ACs requiring manual validation]"
- **qa-engineer**: Added validation checklist item:
  - "Verify testing schedule was followed (check story file for schedule, confirm all devices/browsers tested)"

**Expected impact**: 100% systematic manual testing coverage (vs 0% ad-hoc)

---

### Change 3: Mandate Strategic Review Based on ROI Evidence

**Reason**: Strategic review adoption went from 0% (S1 inconsistent) → 100% (S2 consistent) with proven 3-4x ROI. Need clear policy on when it's mandatory vs optional to preserve efficiency gains.

**Evidence**:

- S2-01: Prevented 3 production safety gaps (45 min review saved 2-3 hours rework)
- S2-03: Prevented R2 vendor lock-in, saved 2-3 hours
- S2-04: Defense-in-depth pattern identified upfront, achieved 95% migration readiness
- Sprint 2 final grade: A (4.0 GPA), up from S1 B+ (3.3)

**Agents affected**:

- **product-owner**: Added to story planning section:
  - "## Strategic Review Policy\n\n**Mandatory** (product-advisor review before implementation):\n- Complex stories (6+ points, 3+ ontology dimensions)\n- Moderate stories (3-5 points, new patterns)\n- Infrastructure changes (schema migrations, external services)\n\n**Optional**:\n- Simple stories (1-2 points, proven patterns)\n- Bug fixes\n- UI polish\n\n**ROI**: Proven 3-4x (45 min prevents 2-3 hours rework + improves migration readiness)"

- **fullstack-developer**: Added to implementation workflow:
  - "1a. Check user story complexity: If Medium/Complex, wait for product-advisor strategic review before implementation"

**Expected impact**: Maintain 95%+ migration readiness, reduce rework cycles, preserve A-grade trajectory

---

### Change 4: Document and Reference Gold Standard Patterns

**Reason**: Two reusable patterns emerged in Sprint 2 that should be explicitly referenced to reduce discovery time and improve consistency: (1) Atomic assignment with `UPDATE...RETURNING`, (2) Defense-in-depth (constraints + sanctuary messages).

**Evidence**:

- S2-04 peer review: Atomic assignment pattern discovered (race-proof, immediate feedback)
- S2-03, S2-04: Defense-in-depth pattern used consistently (CHECK constraints + educational messages)
- Sprint 2 learnings doc: "Gold Standard Patterns" section created

**Agents affected**:

- **fullstack-developer**: Added to implementation workflow:
  - "1b. Review gold standard patterns before implementation:\n - Atomic assignment: Use `UPDATE...RETURNING` with WHERE conditions for race-proof operations\n - Defense-in-depth: Database constraints (uncheateable) + sanctuary messages (educational)\n - Transaction boundaries: Pass PoolClient, caller manages scope"

- **product-advisor**: Added to review lens:
  - "### Pattern Reuse\n- Are gold standard patterns applied where appropriate?\n- Is atomic assignment used for race-sensitive operations (claim assignment, voting, resource allocation)?\n- Does defense-in-depth appear in constraint validation (CHECK + helpful message)?"

**Expected impact**: Faster implementation (reuse vs rediscover), consistent patterns across stories

---

### Change 5: Add Event Completeness Verification

**Reason**: Event sourcing is 95% migration-ready but relies on comprehensive event capture. QA needs explicit checklist to verify events are written for all state changes, not just the happy path.

**Evidence**:

- S2-02: Rich metadata improved migration readiness (85% → 92%)
- S2-04: Perfect before/after state capture achieved 95% migration readiness
- Sprint 2 learnings doc: "Event Schema Requirements" - transaction-bounded, deterministic
- Pattern: Trust Score must be derivable from events, not stored in mutable field

**Agents affected**:

- **qa-engineer**: Added to ontology validation section:
  - "- [ ] Verify Events table entries for all state changes:\n - Happy path (task created, claim submitted, review completed)\n - Edge cases (claim rejected, timeout, cancellation)\n - Trust Score changes (increment/decrement with before/after values)\n - All events have actor_id, entity_id, before/after state in JSONB metadata"

- **fullstack-developer**: Added to implementation workflow:
  - "4a. For every database INSERT/UPDATE/DELETE, write corresponding event entry in same transaction"

**Expected impact**: Maintain 90%+ migration readiness, ensure Trust Score is fully derivable

---

### Change 6: Clarify Product Advisor Grade Thresholds

**Reason**: Product Advisor has clear A/B/C/D/F structure but could benefit from explicit examples of what triggers each grade, especially the B+/C boundary (approve vs return to dev).

**Evidence**:

- Sprint 2 grades: All stories A- or A (excellent, but thresholds not documented)
- S2-04 review: Achieved A with 95% migration readiness, atomic assignment, complete events
- S2-02 review: A- with 92% migration readiness, minor metadata improvements needed

**Agents affected**:

- **product-advisor**: Added to decision matrix section:
  - "## Grade Threshold Examples\n\n**Grade A** (4.0): Approve for retro\n- 90%+ migration readiness\n- Gold standard patterns applied\n- Complete event capture\n- Sanctuary culture in all user-facing messages\n- Example: S2-04 peer review\n\n**Grade B+** (3.3): Approve for retro (acceptable quality)\n- 80%+ migration readiness\n- Minor improvements recommended but not blocking\n- Events mostly complete\n- Example: S2-02 admin tasks (started 85%, minor metadata gaps)\n\n**Grade C** (2.0): Return to developer (rework needed)\n- <80% migration readiness\n- Missing event entries for key state changes\n- Ontology dimensions incorrectly mapped\n- No sanctuary culture in error messages\n\n**Grade D/F**: Return to developer (significant issues)\n- Violates quasi-smart contract rules (mutable Trust Score, editable events)\n- No event logging\n- Incorrect architecture (not vertical slice)"

**Expected impact**: Faster review decisions, clearer feedback to developers, consistent quality bar

---

### Change 7: Add Retro Facilitator → Meta-Coach Handoff

**Reason**: Retro facilitator captures learnings but doesn't explicitly feed them into continuous improvement loop. Adding handoff to meta-coach closes the loop and ensures patterns are identified and addressed in agent prompts.

**Evidence**:

- Pattern analysis required manual aggregation of 10 story retros
- Recurring issues (character encoding, testing schedules) took 2+ cycles to address systematically
- Meta-coach exists but not explicitly triggered by retro completion

**Agents affected**:

- **retro-facilitator**: Added new handoff:
  - Label: "Feed to Meta-Coach"
  - Agent: meta-coach
  - Prompt: "Retrospective complete for [Story ID]. Review for patterns that should be incorporated into agent instructions or process improvements."
  - Send: false (optional, triggers after 2-3 stories or sprint completion)

- **retro-facilitator**: Added to retro template:
  - "## Process Improvement Suggestions\n\n**For Meta-Coach**:\n- [ ] Agent instruction updates needed? (checklist items, clarifications, new handoffs)\n- [ ] Recurring patterns that should be automated?\n- [ ] Documentation gaps?"

**Expected impact**: Faster pattern identification (2-3 stories vs 10), proactive prompt improvements

---

### Change 8: Add Pre-Push Hook Enforcement Reminder

**Reason**: Git workflow violations persist at 25% rate despite improvement from 50% (Sprint 1) → 75% (Sprint 2). S2-03 worked directly on main (no branch, no PR, no code review). Need automated enforcement via pre-push hook (similar to character encoding solution).

**Evidence**:

- Sprint 1: 50% compliance (inconsistent branching)
- Sprint 2: 75% compliance (improved but S2-03 violated)
- S2-03 retro: "Worked directly on main" (no feature branch, no PR)
- Sprint 2 learnings doc: Pre-push hook recommended alongside pre-commit

**Agents affected**:

- **fullstack-developer**: Modified git workflow section:
  - Added bullet: "Before first push: Ensure pre-push hook is installed (rejects commits to main, enforces feature branch workflow)"

- **qa-engineer**: Added to PR/git workflow checks:
  - "[ ] Verify feature branch naming convention (e.g., `feature/S3-01-test-infrastructure`)"
  - "[ ] Confirm no commits were pushed directly to main (check git log)"

**Expected impact**: 100% git workflow compliance (vs 75%), eliminate bypassed code review

---

## Agents NOT Changed (and Why)

### meta-coach

- **Reason**: This is a new agent role; no historical patterns yet to refine
- **Future**: May need adjustments as continuous improvement loop matures

### product-owner (minimal changes)

- **Reason**: Story planning structure is solid; changes focused on adding policy clarifications (strategic review, testing schedules) not rewriting core instructions
- **Token efficiency**: Added references to existing documents vs repeating content

---

## Implementation Notes for Meta-Coach

When updating agent files:

- Use `multi_replace_string_in_file` for efficiency (batch all changes per agent)
- Update files in dependency order: product-owner → fullstack-developer → qa-engineer → product-advisor → retro-facilitator
- Keep changes minimal (add checklist items, clarify existing text, don't rewrite entire sections)
- Reference shared docs (sprint-2-learnings-and-guidance.md, PATTERN-ANALYSIS.md) to reduce token consumption

---

## Success Metrics (Track in Sprint 3+)

| Metric                    | Sprint 1 | Sprint 2 | Sprint 3 Target | Change                            |
| ------------------------- | -------- | -------- | --------------- | --------------------------------- |
| Character encoding bugs   | 0        | 2        | 0               | Change 1 (pre-commit hook)        |
| Systematic testing %      | 0%       | 0%       | 100%            | Change 2 (testing schedules)      |
| Strategic review adoption | Mixed    | 100%     | 100%            | Change 3 (policy clarity)         |
| Git workflow compliance   | 50%      | 75%      | 100%            | Change 8 (pre-push hook)          |
| Migration readiness avg   | 65%      | 90%      | 90%+            | Changes 4, 5 (patterns + events)  |
| Sprint grade              | B+ (3.3) | A (4.0)  | A (4.0)         | All changes (quality maintenance) |

---

## Next Review

- **After Sprint 3**: Validate that automated solutions (pre-commit, pre-push hooks) achieved 100% prevention
- **After Sprint 3**: Confirm testing schedules were followed and all ACs tested systematically
- **After Sprint 3**: Check if retro → meta-coach handoff improved pattern identification speed
