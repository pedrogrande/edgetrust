# Sprint 4 Planning Notes

**Date**: 2026-02-12  
**Context**: Sprint 3 complete (20/20 points, Grade A, State Machine Complete)  
**Planning Status**: Integrating process improvements from S3 retros + meta-coach recommendations

---

## Key Process Changes for Sprint 4

### 1. UI Layout as First-Class Quality Dimension ✅

**What Changed**: Layout quality moved from implicit "UX" to explicit validation at every stage.

**Agent Updates**:

- ✅ **product-owner**: Story template includes Layout & UX acceptance criteria section
- ✅ **fullstack-developer**: Instructions reference UI-layout-pattern.md for composition guidance
- ✅ **qa-engineer**: Dedicated "Layout & UX validation" checklist with 6 explicit checks
- ✅ **product-advisor**: Review lens includes "6. Layout & information hierarchy"
- ✅ **retro-facilitator**: Questions include layout-specific reflection

**Story Writing Impact**:

When writing Sprint 4 stories:

1. **Acceptance Criteria**: Now include dedicated Layout & UX section with 5 standard checks:
   - One clear primary action per screen
   - Related elements visually grouped
   - Information hierarchy obvious (key content visible without scrolling)
   - Mobile responsive (375px stacks gracefully)
   - Sanctuary feel (comfortable spacing, warnings with breathing room)

2. **Implementation Notes**: Reference specific layout patterns from UI-layout-pattern.md:
   - List + detail: For selection workflows (tasks, claims, reviews)
   - Single-column form: For focused input (submit claim, edit profile)
   - Wizard: For multi-step flows (guided task creation)

3. **Complexity Estimation**: Add layout complexity as a dimension:
   - Simple: Existing pattern with minor adaptation
   - Moderate: New pattern or complex responsive behavior
   - Complex: Novel interaction model or multiple coordinated patterns

**Expected Outcomes**:

- Earlier layout feedback (QA cycle vs Advisor review)
- Reduced layout-related grade reductions
- Consistent visual quality across stories
- Better member experience (clear actions, calm hierarchy)

---

### 2. S3-03 Action Items (From Retrospective)

**Immediate** (Can be completed before S4 stories):

1. **Pre-commit TypeScript validation hook** (15 min)
   - Catches import typos and function signature errors before commit
   - Prevents runtime-only type errors

2. **Neon SQL patterns documentation** (30 min)
   - Document SQL template limitations (no `${}` in string literals)
   - PostgreSQL type casting examples for complex CTEs
   - Create `/project/trust-builder/patterns/neon-sql-patterns.md`

3. **Test data seed scripts** (30 min)
   - Create `/scripts/test-data/seed-dev-claims.sh` for reproducible test environments
   - Scripts for orphaned claims, pending reviews, role transitions

4. **Database connection indicator** (20 min, 1 point story option)
   - Add footer to admin pages showing active database (dev vs production)
   - Prevents confusion about which environment is being tested

**Sprint 4+ Candidates** (Full stories):

5. **Config table migration for thresholds** (3 points)
   - Move hardcoded values (7-day timeout, Trust Score thresholds) to `system_config` table
   - Enables admin configuration without code changes
   - 95% → 100% migration readiness

6. **Scheduled cron job for auto-release** (5 points)
   - Convert manual admin action to scheduled background job
   - Runs daily, releases orphaned claims automatically
   - Includes admin notification of released claims

7. **Email reminders at Day 5 before timeout** (3 points)
   - Sanctuary-aligned: Gentle nudge before timeout
   - "Hey [reviewer], just a heads up: [Claim #123] needs attention by [Date]"
   - No penalties, just helpful reminder

---

## S3 Learnings to Integrate

### Strategic Review ROI Confirmed

- 45-minute pre-implementation review prevents 2+ hours of pivots
- Mandatory for **Moderate+ complexity** stories going forward
- S3-03 forecast: A- → Actual: A (exceeded expectations)

### Documentation as Knowledge Transfer

- S3-03: 2,643 lines of documentation (3 reports + challenges + retro)
- Comprehensive docs = faster velocity for future related stories
- Prevention measures captured = process improvements realized

### Sanctuary Culture as Architecture

- Automation CAN demonstrate cultural values through language, messaging, absence of punitive code
- S3-03 gold standard: "Life happens!" messaging, no Trust Score deduction
- Pattern reusable for future automated workflows

### Database Environment Best Practices

- Astro reads from `.env` (not `.dev.vars`)
- Always verify connection string precedence, don't assume
- Connection indicator in UI prevents confusion (action item #4)

---

## Sprint 4 Story Candidates (Prioritization TBD)

### High Priority

1. **Mission Joining Workflow** (5-8 points, Moderate-Complex)
   - Deferred from S1-S2
   - Blocking: Members can't formally join missions yet
   - Layout: List + detail pattern (browse missions → view details → join)
   - Ontology: Groups + People + Connections + Events

2. **Reviewer Dashboard Improvements** (5 points, Moderate)
   - Apply new layout patterns to existing review queue
   - Address any UX friction discovered in testing
   - Layout: List + detail pattern refinement, primary action clarity
   - Ontology: People + Things + Connections + Knowledge

### Medium Priority

3. **Admin Configuration UI** (3 points, Simple)
   - Implements action item #5 (config table)
   - Admins can adjust timeout thresholds, Trust Score thresholds without code
   - Layout: Single-column form pattern
   - Ontology: Knowledge + Events (configuration changes logged)

4. **Email Notification System** (3 points, Simple)
   - Implements action item #7 (Day 5 reminders)
   - Sanctuary-aligned gentle nudges
   - Technical: Cron job + email templates
   - Ontology: Events (notifications logged)

5. **Database Connection Indicator** (1 point, Trivial)
   - Implements action item #4
   - Quick win for developer experience
   - Layout: Footer indicator on admin pages

### Nice to Have

6. **Scheduled Auto-Release Job** (5 points, Moderate)
   - Implements action item #6
   - Converts S3-03 manual workflow to fully automated
   - Requires config table (story #3) as prerequisite
   - Ontology: Events + Things + Connections

7. **Mobile Testing Schedule & Device Allocation** (Infrastructure)
   - Not a story, but process improvement
   - Allocate 1 hour on Day 5 of each story with UI changes
   - iOS (Safari), Android (Chrome), desktop (375px emulation)

---

## Sprint 4 Sizing Guidance

**Target**: 18-22 points (4-5 stories, AI-optimized for 1-2 days each)

**Complexity Distribution**:

- 1-2 Simple stories (2-3 points each): Quick wins, confidence builders
- 2-3 Moderate stories (5-8 points each): Core value delivery
- 0-1 Complex stories (8-13 points): Only if foundational and well-understood

**Layout Complexity Overlay**:

- Simple layout: Existing pattern (list+detail, form) with minor adaptation → No point increase
- Moderate layout: New pattern or complex responsive → +1 point
- Complex layout: Novel interaction or multiple coordinated patterns → +2 points

---

## Sprint 4 Success Metrics

**Quality Targets**:

- 🎯 Grade A average (maintain S2-S3 trend)
- 🎯 95%+ migration readiness (all stories)
- 🎯 100% git workflow compliance (pre-push hooks working)
- 🎯 Zero layout issues in strategic reviews (shifted left to QA)

**Process Targets**:

- 🎯 100% strategic reviews for Moderate+ stories
- 🎯 100% manual testing schedules followed
- 🎯 100% stories use layout AC template
- 🎯 QA reports include "Layout/UX" subheading

**Documentation Targets**:

- 🎯 All retros capture layout learnings
- 🎯 Neon SQL patterns doc created
- 🎯 Test data seed scripts operational

---

## Next Steps for Product Owner

1. **Review S3 retros** for additional story candidates (Done: S3-03 reviewed)
2. **Prioritize S4 stories** from candidates list above
3. **Write first S4 story** using updated template with Layout & UX ACs
4. **Schedule strategic pre-review** for any Moderate+ complexity stories
5. **Confirm testing schedule** for each story (Day 5, 1 hour, devices)

---

## Questions for Team Discussion

- Should Mission Joining be S4 or deferred to S5?
- Should we do all 4 immediate action items before S4 stories, or interleave?
- Do we need a dedicated "Polish & Refinement" story for existing workflows?
- Should email notification wait for transactional email service setup?

---

**Status**: Ready for story writing. Layout quality dimension integrated. S3 learnings captured.
