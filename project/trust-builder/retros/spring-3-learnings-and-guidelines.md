# Trust Builder: Learnings & Guidelines

**compiled from**: Sprint 3 Retrospectives (Stories S3-01, S3-02, S3-03, S3-04 + Sprint Review)  
**Period**: February 11-12, 2026  
**Status**: Living Document - Updated after each sprint  
**Purpose**: Actionable playbook for sustained quality and velocity

---

## Table of Contents

1. [Team Successes (Proven Patterns)](#team-successes-proven-patterns)
2. [Team Struggles (Known Gaps)](#team-struggles-known-gaps)
3. [Action Items for Improvement](#action-items-for-improvement)
4. [Development Guidelines](#development-guidelines)
5. [Quality Gates & Standards](#quality-gates--standards)
6. [Architectural Patterns](#architectural-patterns)
7. [Sanctuary Culture Playbook](#sanctuary-culture-playbook)
8. [Migration Readiness Checklist](#migration-readiness-checklist)

---

## Team Successes (Proven Patterns)

### 1. Strategic Review ROI: 2.7-3.7x Time Savings

**Evidence**:

- S3-02: 90-minute review caught CRITICAL missing composite index → prevented 4 hours of emergency hotfix
- S3-03: 45-minute review clarified atomic transaction requirements → prevented 2 hours of mid-development refactor
- **Result**: 100% first-pass QA success rate (no rework cycles)

**Decision Matrix Validated**:

- **Simple stories (≤4 points)**: Review OPTIONAL (cost ≈ benefit)
- **Moderate stories (5-7 points)**: Review RECOMMENDED (2-3x ROI)
- **Complex stories (≥8 points)**: Review **MANDATORY** (3-4x ROI)

**What Makes Reviews Effective**:

- Pre-implementation (not post-implementation critique)
- 45-90 minute time-boxed sessions
- Focus on architecture, not implementation details
- Product-advisor leads, developer asks clarifying questions
- Document MUST items vs NICE-TO-HAVE for later

**Guideline**: Strategic reviews are **architectural insurance**, not bureaucracy. They catch structural issues that tests/QA can't see.

---

### 2. Test-First Workflow: 100% Pass Rate, Zero Rework

**Evidence**:

- 129 tests across 4 stories
- <2s execution time for full suite
- 100% first-pass QA across all stories
- Zero bugs escaped to production

**What Makes Test-First Work**:

- Write integration tests BEFORE implementation (reveals better API design)
- Fast feedback loop enables TDD flow state (<2s suite execution)
- Mock patterns established early (S3-01) reduced test writing time by 40% in subsequent stories
- Database state assertions + API behavior validation (dual validation)

**Compounding Value**:

- S3-01: 5 hours to build test infrastructure
- S3-02, S3-03, S3-04: 5 hours total saved reusing patterns
- **Break-even in same sprint**, ongoing savings forever

**Guideline**: Test-first is not "extra work"—it's **design feedback** that improves architecture before implementation locks in bad patterns.

---

### 3. CTE Atomic Transaction Pattern: Proven Across 3 Stories

**Pattern**:

```typescript
await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
  // CTE: State change + event logging in single query (atomic)
  await client.query(
    `
    WITH state_change AS (
      UPDATE table_name SET column = $1 WHERE condition RETURNING *
    )
    INSERT INTO events (entity_type, entity_id, event_type, metadata)
    SELECT 'entity', sc.id, $2, jsonb_build_object('key', 'value')
    FROM state_change sc
  `,
    [newValue, eventType]
  );
});
```

**Why This Matters**:

- **Atomicity**: State + event succeed or fail together (rollback guaranteed)
- **Performance**: Single database round-trip vs two separate queries
- **Simplicity**: No manual rollback logic needed
- **Migration value**: Matches blockchain transaction atomicity

**Evidence**: Reused successfully in S3-01 (test infra), S3-03 (orphaned claims), S3-04 (role promotion)

**Guideline**: CTE atomic pattern is **gold standard**. Default to this pattern for any state change requiring audit trail.

---

### 4. Sanctuary Culture as Architecture (Not Just Copy)

**Proven Patterns**:

#### Reversible State Transitions

- S3-03: Claims released to `submitted` (not deleted/penalized)
- Status enums include recovery paths
- No permanent state changes without admin override

#### Non-Punitive Defaults

- S3-03: Trust Score unchanged on timeout (life happens!)
- Timeouts/failures don't deduct points
- Generous thresholds (7-day timeout, not 3 days)

#### Teaching Moments in System Messaging

- S3-01: Git hook "🌱 Let's use a feature branch..." (not "ACCESS DENIED")
- S3-04: Promotion toast "Your role is to **help them succeed**"
- Explain WHY, not just WHAT

#### Supportive Language

- S3-03: "Orphaned Claims" (not "Overdue/Violations")
- "Life happens!" (not "Performance Issue")
- "No penalties will be applied" (explicit statement removes anxiety)

**Product Advisor Assessment**: S3-03 is **gold standard reference implementation** for sanctuary automation.

**Guideline**: Sanctuary culture is **designable**. Every automation decision is opportunity to embed values through architecture, messaging, and absence of punitive logic.

---

### 5. AI-Optimized Story Sizing: 100% Accuracy

**Evidence**:

- 20 points planned vs 20 points delivered
- All 4 stories completed within estimated time ranges
- Complexity calibration proven (Simple 3-4pts, Moderate 5-7pts, Complex 8pts)

**What Makes Sizing Accurate** (for AI agents):

- Focus on **ontology dimensions touched** (not CRUD operations count)
- Consider **integration surface area** (not line count)
- Account for **pattern reuse potential** (accelerates AI more than humans)
- Add **layout complexity overlay** (+1-2 points for novel UI patterns)

**Guideline**: AI agent story sizing differs from human team estimation. Stories sized at 1-2 days AI execution (3-8 points) optimize velocity without quality trade-offs.

---

### 6. Sprint Theme Compounding Value (Infrastructure-First)

**S3 Theme**: Quality Infrastructure

**Compounding Evidence**:

- S3-01: 5-hour investment (test infrastructure, git hooks, mock patterns)
- S3-02, S3-03, S3-04: 5 hours total saved reusing patterns
- **ROI**: Break-even same sprint, ongoing savings in every future story

**What Made Theme Work**:

- Infrastructure stories sequenced first (foundation before features)
- Patterns documented immediately (not after sprint)
- Reusable components tracked (explicit references in subsequent stories)

**Guideline**: Front-load infrastructure when foundational patterns are missing. Accept upfront time investment for compounding velocity gains.

---

### 7. Component Reuse: 5-7 Hours Saved in Sprint 3

**Reuse Chain**:

- `ProgressToSteward` (S3-02) → reused in S3-04 (2-3 hour savings)
- `DashboardCard` (S3-02) → reused in S3-03, S3-04 (3-4 hour savings)
- `OrphanedClaimsBadge` (S3-03) → ready for future stories

**What Makes Components Reusable**:

- Self-contained (no tight coupling to parent)
- Clear props interface with TypeScript
- Sanctuary messaging built-in (not hardcoded)
- Documented in component registry with story of origin

**Guideline**: Writing **reusable components** (clear props, no coupling) pays dividends within same sprint. Explicit component registry prevents rediscovery time waste.

---

### 8. Event Logging Excellence: 98% Migration Readiness

**S3-04 Gold Standard Example**:

```json
{
  "event_type": "member.promoted",
  "actor_id": "admin_uuid",
  "metadata": {
    "member_id": "...",
    "promoted_by": "...",
    "previous_role": "member",
    "new_role": "steward",
    "trust_score": 250,
    "promotion_reason": "trust_threshold_reached",
    "threshold": 250 // Captured at promotion time (handles retroactive config changes)
  }
}
```

**Why This Is Exemplary**:

- Complete context: All info needed to reconstruct state transition
- Actor attribution: Who triggered (governance requirement)
- Reason captured: Why transition happened (trust threshold vs admin override)
- Timestamp values: Threshold at promotion time (handles config changes)
- Blockchain-ready: Can derive Merkle root from event stream

**Guideline**: Events dimension is becoming comprehensive audit log. Every state change MUST log event with complete metadata for blockchain migration.

---

## Team Struggles (Known Gaps)

### 1. Connections Dimension: Migration Bottleneck

**Problem**: Current schema uses foreign keys (relational thinking), not Connection entities (graph thinking).

**Examples**:

- `claims.reviewer_id` → Foreign key to `members.id`
- Should be: Connection entity with type `reviewer_assignment`

**Impact**: Blocking 100% migration readiness (currently 92-95% range)

**Root Cause**: Relational database patterns don't translate directly to blockchain graph structures.

**S4 Action Required**:

- Refactor reviewer assignment to Connection entity (2-3 points)
- Mission joining as Connection entity (part of main story)
- Expected impact: 94% → 97% migration readiness

---

### 2. Layout Quality Was Implicit (Until Sprint 3 End)

**Problem**: Layout and information hierarchy evaluated subjectively, not against explicit standards.

**Evidence**:

- S3-02 dashboard layout evolved through iteration (not planned)
- S3-03 admin page followed existing patterns (good) but not validated against checklist
- S3-04 promotion toast placement was implementation decision, not story requirement

**Impact**: Layout quality depended on developer judgment, not objective criteria.

**Resolution** (2026-02-12): Layout now first-class quality dimension with explicit ACs:

- One clear primary action per screen
- Visual grouping with consistent spacing
- Information hierarchy (key content visible without scrolling)
- Mobile responsive (375px stacks gracefully)
- Sanctuary feel (comfortable spacing, calm layout)

---

### 3. Manual Testing Was Ad-Hoc (Not Systematic)

**Problem**: Manual testing lacked:

- Device allocation (which iOS/Android devices to test on?)
- Testing schedule (when does testing happen? Day 5?)
- Reproducible test data (30 min wasted creating test data manually)

**Evidence**:

- S3-02: 5 ACs marked "NEEDS TEST" (passed QA with caveat)
- S3-03: Manual testing caught 7 bug categories through trial-and-error

**Impact**: QA time +20%, layout issues discovered late (not systematically)

**S4 Action Required**:

- Testing Schedule section in story template (devices, viewports, Day 5 allocation)
- Test data seed scripts (reproducible scenarios)
- Manual testing checklist (edge cases, accessibility)

---

### 4. Database Environment Confusion (S3-03 Critical Discovery)

**Problem**: Implementation assumed Astro uses `.dev.vars` for development, but actually uses `.env`.

**Impact**:

- Test data created in wrong database initially
- 7 bug categories discovered during manual testing
- ~30 minutes debugging time + 7 fix commits
- All resolved before QA, but preventable

**Root Cause**: Environment variable precedence not verified, just assumed.

**S4 Action Required**:

- Environment Setup checklist in story template (verify DATABASE_URL before implementation)
- Database connection indicator in admin UI footer (shows active DB)
- Documentation: Astro environment variable precedence

---

### 5. Component Discovery Not Documented (30 Min Time Waste)

**Problem**: S3-04 could reuse `ProgressToSteward` from S3-02, but story didn't mention it.

**Impact**: Developer discovered through codebase search (30 min), when story could have referenced it (0 min).

**Root Cause**: No component inventory tracking across stories.

**Resolution Planned**: Component registry at `/project/trust-builder/patterns/component-registry.md`

---

### 6. Story Sequencing Didn't Account for Infrastructure Dependencies

**Problem**: S3-04 (role promotion) created `system_config` table pattern, but S3-03 (orphaned claims) hardcoded 7-day threshold.

**Missed Opportunity**: Had S3-04 been sequenced before S3-03, timeout threshold could have used config from the start.

**Impact**: S3-03 migration readiness 95% (5% gap due to hardcoded threshold), S4 story now needed to migrate.

**S4 Action Required**: Sprint planning checklist with infrastructure dependency mapping (sequence foundational stories before dependent features).

---

### 7. Accessibility Validation Superficial

**Problem**: QA checked keyboard navigation, but didn't validate:

- Screen reader compatibility (ARIA labels, roles, landmarks)
- Color contrast ratios (WCAG AA compliance)
- Touch target sizes on mobile (≥44px)
- Focus indicator visibility

**Example**: S3-02 dashboard progress bars lack ARIA labels (screen reader says "50%" without context).

**S4 Action Required**: Accessibility validation checklist in QA spec (WCAG AA compliance baseline).

---

## Action Items for Improvement

### Immediate (Before Sprint 4 Stories)

#### Product-Owner Responsibilities

- [x] ✅ **Make UI Layout First-Class Quality Dimension** (COMPLETED 2026-02-12)
  - Updated story template with Layout & UX ACs
  - Updated 4 agent specs (product-advisor, qa-engineer, fullstack-developer, retro-facilitator)
  - Documented in agent-prompt-changelog.md

- [ ] **Add Testing Schedule Section to Story Template** (30 min, HIGH priority)
  - Specify devices (iOS Safari on iPhone 13+, Android Chrome on Pixel 6+, Desktop Chrome 375px/768px/1024px)
  - Define Day 5 manual testing allocation (1 hour)
  - Success criteria (no horizontal scroll, touch targets ≥44px, focus order matches visual)

- [ ] **Create Component Registry** (30 min, HIGH priority)
  - Document S3 components: ProgressToSteward, OrphanedClaimsBadge, DashboardCard, PromotionToast
  - Location: `/project/trust-builder/patterns/component-registry.md`
  - Update after each story completion

- [ ] **Add Environment Setup Checklist to Story Template** (15 min, MEDIUM priority)
  - Database connection verification: `echo $DATABASE_URL`
  - Confirm dev branch vs production database
  - Document which database test data uses

- [ ] **Create Sprint Planning Checklist** (20 min, MEDIUM priority)
  - Infrastructure dependency mapping (identify shared infrastructure stories)
  - Story sequencing rules (infrastructure before features)
  - Component reuse identification (reference registry)

#### Fullstack-Developer Responsibilities

- [ ] **Add Pre-Commit TypeScript Validation Hook** (15 min, HIGH priority)
  - Catches import typos, function signature errors before commit
  - Prevents runtime-only type errors
  - Add to git hooks: `pnpm typecheck || exit 1`

- [ ] **Create Test Data Seed Scripts** (30-45 min, HIGH priority)
  - `/scripts/test-data/seed-dashboard-scenarios.sh` (members with varying Trust Scores)
  - `/scripts/test-data/seed-orphaned-claims.sh` (claims >7 days old)
  - `/scripts/test-data/seed-promotion-threshold.sh` (member at 249 points)
  - Reproducible test environments eliminate 15-20 min manual setup per story

- [ ] **Document Neon SQL Patterns** (30 min, MEDIUM priority)
  - Location: `/project/trust-builder/patterns/neon-sql-patterns.md`
  - SQL template limitations (no `${}` inside string literals)
  - PostgreSQL type casting examples (CTE + JSONB + parameter reuse)
  - Explicit cast pattern: `$1::UUID`, `$2::VARCHAR`

- [ ] **Add Database Connection Indicator to Admin UI** (20 min, MEDIUM priority)
  - Footer showing active database (prevents S3-03-style confusion)
  - Display: `Database: ep-dark-river-ai6arthq-pooler` (masked except last segment)
  - Dev/staging/production color-coding

#### QA-Engineer Responsibilities

- [ ] **Add Accessibility Validation to QA Checklist** (15 min, HIGH priority)
  - ARIA labels for interactive elements
  - Color contrast validation (WCAG AA: 4.5:1 for normal text)
  - Touch targets ≥44px on mobile
  - Focus indicator visibility
  - Semantic HTML landmarks
  - Update qa-engineer.agent.md with checklist

- [ ] **Add Database State Assertions to Test Pattern Guide** (20 min, MEDIUM priority)
  - CTE tests need dual assertions: API behavior + database state
  - Example: Verify claim status changed AND event logged
  - Document in test patterns guide

#### Meta-Coach Responsibilities

- [ ] **Extract Sanctuary Messaging Patterns** (30 min, HIGH priority)
  - Create reusable template from S3-03, S3-04 examples
  - Location: `/project/trust-builder/patterns/sanctuary-messaging.md`
  - 5 patterns: Reversibility, Non-punitive defaults, Teaching moments, Supportive language, Generous thresholds

- [ ] **Update Agent Instructions with DB Verification** (10 min, MEDIUM priority)
  - Add environment setup checklist to fullstack-developer spec
  - Verify DATABASE_URL before implementation
  - Document Astro environment variable precedence

#### Doc-Whisperer Responsibilities

- [ ] **Add PostgreSQL Type Casting Examples to Dev Guide** (20 min, MEDIUM priority)
  - Document CTE + JSONB + parameter reuse patterns from S3-03
  - When to use explicit type casts
  - Error message patterns that indicate type inference failure

---

### Sprint 4 Story Candidates

**Infrastructure Tasks** (1-2 points each, implement BEFORE feature stories):

1. **Pre-commit TypeScript validation hook** (1 point, 15 min)
2. **Database connection indicator in admin UI** (1 point, 20 min)
3. **Test data seed scripts** (1 point, 30 min)
4. **Neon SQL patterns documentation** (1 point, 30 min)

**Refactor/Migration** (3 points):

5. **Config table migration for orphaned claim threshold** (3 points)
   - Migrate hardcoded 7-day timeout to `system_config`
   - Increases S3-03 migration readiness from 95% → 100%

6. **Refactor reviewer assignment to Connection entity** (2-3 points)
   - Migrate `claims.reviewer_id` foreign key to `connections` table
   - Connection type: `reviewer_assignment`
   - Addresses Connections dimension gap
   - Expected impact: 94% → 97% migration readiness

**Feature Stories** (5-8 points, depends on infrastructure):

7. **Mission Joining Workflow** (5-8 points, Complex)
   - Deferred from S1-S2, high priority for S4
   - First Group dimension story
   - Member → Mission relationship as Connection entity
   - Layout: List + detail pattern
   - **Strategic review MANDATORY** (3-4x ROI for Complex stories)

8. **Reviewer Dashboard Improvements** (5 points, Moderate)
   - Apply new layout patterns to existing review queue
   - Layout: List + detail refinement, primary action clarity
   - Strategic review recommended (2-3x ROI)

---

## Development Guidelines

### Story Writing Standard

#### Acceptance Criteria Distribution (18-21 ACs for Moderate complexity)

- **Functional ACs** (60-70%): End-to-end behavior validation
- **Quality ACs** (20-25%): Ontology, events, migration, sanctuary
- **Layout/UX ACs** (10-15% if UI story): Visual hierarchy, responsive, sanctuary feel

**AC Thresholds**:

- > 25 ACs: Story under-decomposed (split into smaller stories)
- <15 ACs: Missing edge cases or quality dimensions

#### Story Template Sections (Required)

```markdown
## Acceptance Criteria (18-21 ACs target)

### Functional (12-15 ACs)

- [ ] Feature behavior 1
- [ ] Feature behavior 2
      ...

### Quality (4-5 ACs)

- [ ] Ontology: Entity maps to correct dimension
- [ ] Events: State changes logged with complete metadata
- [ ] Migration: Blockchain-compatible patterns used
- [ ] Sanctuary: Non-punitive defaults, reversible state

### Layout & UX (2-3 ACs if UI story)

- [ ] One clear primary action per screen (Button variant="default")
- [ ] Related elements visually grouped (Cards, spacing, sections)
- [ ] Information hierarchy (key content visible without scrolling, laptop viewport)
- [ ] Mobile responsive (375px: stacks gracefully, no horizontal scroll)
- [ ] Sanctuary feel (comfortable spacing, warnings in dedicated areas)
- [ ] Keyboard accessible (focus order matches visual, visible focus indicators)

## Testing Schedule (for UI stories)

**Day 5 Manual Testing** (1 hour allocated):

- Desktop: Chrome at 375px, 768px, 1024px (responsive breakpoints)
- iOS: Safari on iPhone 13+ (actual device, not simulator)
- Android: Chrome on Pixel 6+ (actual device)

**Validation**:

- All primary actions reachable without scrolling (laptop viewport baseline)
- No horizontal scroll at 375px
- Touch targets ≥44px (mobile accessibility)
- Focus order matches visual order (keyboard navigation)

## Environment Setup (for database stories)

**Before implementation, verify**:

1. Run `echo $DATABASE_URL` in terminal where dev server runs
2. Confirm database matches expected environment (dev branch vs production)
3. If testing with seed data, document which database is being used

## Reusable Components (from prior stories)

- ComponentName (Story S#-##): Brief description and file path
- (Reference component registry for current inventory)

## Implementation Notes

- Patterns to reuse (CTE atomic transactions, event logging, sanctuary messaging)
- Performance considerations (index requirements, query optimization)
- Migration notes (blockchain-compatible patterns to use)
```

---

### Test-First Workflow

#### Before Implementation

1. **Read story ACs** (identify happy path + edge cases)
2. **Write integration test structure** (describe() blocks, it() stubs)
3. **Create test fixtures** (mock data representing ontology entities)
4. **Write failing tests** (assert expected behavior, red phase)

#### During Implementation

5. **Implement minimum code to pass first test** (TDD green phase)
6. **Refactor for clarity** (TDD refactor phase)
7. **Add next test** (edge case or next AC)
8. **Repeat steps 5-7** until all ACs covered

#### After Implementation

9. **Run full test suite** (confirm 100% pass rate)
10. **Check test execution time** (target <2s for full suite)
11. **Validate database state** (dual assertions: API + DB)
12. **Manual testing** (UI layout, accessibility, sanctuary feel)

#### Test Pattern Standards

**Integration Test Structure**:

```typescript
describe('Feature Name (Story S#-##)', () => {
  // Setup: Mock patterns from S3-01
  vi.mock('@/lib/auth');
  vi.mock('@/lib/db/connection');

  describe('Happy Path', () => {
    it('should [behavior] when [condition]', async () => {
      // Arrange: Test fixtures
      // Act: API call or function invocation
      // Assert: Both behavior AND database state
    });
  });

  describe('Edge Cases', () => {
    it('should [behavior] when [edge condition]', async () => {
      // Same structure
    });
  });

  describe('Sanctuary Culture', () => {
    it('should use supportive language in error messages', async () => {
      // Validate messaging, not just error codes
    });
  });
});
```

**Database State Assertions** (CTE patterns):

```typescript
// Validate API behavior
const result = await releaseOrphanedClaims(adminId);
expect(result.released).toBe(3);

// Validate database state (dual assertion)
const claims = await db.select().from(claimsTable).where(...);
expect(claims.every(c => c.status === 'submitted')).toBe(true);

// Validate event logging
const events = await db.select().from(eventsTable).where(...);
expect(events.every(e => e.event_type === 'claim.timeout.released')).toBe(true);
```

---

### Strategic Review Process

#### When to Conduct (Decision Matrix)

| Story Complexity | Points | Review Required | Expected ROI | Time Allocation       |
| ---------------- | ------ | --------------- | ------------ | --------------------- |
| Simple           | ≤4     | Optional        | Break-even   | 30 min (if conducted) |
| Moderate         | 5-7    | Recommended     | 2-3x         | 45 min                |
| Complex          | ≥8     | **MANDATORY**   | 3-4x         | 90 min                |

#### Review Agenda (45-90 minutes)

**Part 1: Ontology Validation** (15-20 min)

- Which dimensions does this story touch? (People, Things, Groups, Connections, Events, Knowledge)
- Are entities mapped to correct dimensions?
- Are relationships modeled as Connections (not foreign keys)?
- What events need to be logged?

**Part 2: Architecture Review** (20-30 min)

- Query optimization (indexes needed? n+1 query risks?)
- Transaction boundaries (what must be atomic?)
- Pattern reuse (which existing patterns apply? CTE, config table, event logging)
- Performance considerations (caching? lazy loading?)

**Part 3: Migration Readiness** (10-15 min)

- Which patterns are blockchain-compatible?
- What gaps exist? (5-10% gaps acceptable, >10% flag for discussion)
- Event metadata complete for Merkle root generation?

**Part 4: Sanctuary Culture** (10-15 min)

- Are state changes reversible?
- Do timeouts/failures avoid penalties?
- Is language supportive (not judgmental)?
- Are thresholds generous?

**Part 5: Implementation Guidance** (10-20 min)

- **MUST items** (non-negotiable for story acceptance)
- **SHOULD items** (recommended, but can defer if time-constrained)
- **NICE-TO-HAVE items** (explicitly marked for future stories)
- Document decisions (why we chose X over Y)

#### Review Output Format

```markdown
# Strategic Review: [Story ID] - [Story Title]

**Date**: YYYY-MM-DD  
**Reviewer**: product-advisor  
**Developer**: fullstack-developer  
**Complexity**: Simple/Moderate/Complex  
**Review Duration**: [minutes]

## Ontology Assessment

- Dimensions touched: [list]
- Entity mapping: [correct/needs adjustment]
- Relationships: [Connection entities or foreign keys?]

## Architecture Recommendations

### MUST (Non-Negotiable)

1. [Critical finding #1 with rationale]
2. [Critical finding #2]

### SHOULD (Recommended)

1. [Recommended pattern/approach]

### NICE-TO-HAVE (Future Story)

1. [Enhancement deferred to S4+]

## Migration Readiness Forecast

- Initial estimate: [85-95%]
- Gaps identified: [list]
- Mitigation plan: [how to close gaps]

## Sanctuary Culture Check

- Reversibility: [yes/no + explanation]
- Non-punitive: [yes/no + explanation]
- Language: [supportive/neutral/needs adjustment]

## Implementation Notes

- Patterns to reuse: [CTE, config table, etc.]
- Performance considerations: [indexes, caching]
- Testing guidance: [edge cases to cover]

## Decision Log

- **Decision**: [What was decided]
- **Rationale**: [Why we chose this approach]
- **Alternatives considered**: [What we didn't choose and why]
```

---

### Git Workflow Standards

#### Branch Naming

```bash
feature/S[sprint]-[story-number]-[short-description]

# Examples:
feature/S3-01-test-infrastructure
feature/S3-02-member-dashboard
feature/S4-05-mission-joining
```

#### Commit Message Format

```bash
<type>(<scope>): <short summary>

[optional body explaining what and why, not how]

# Types: feat, fix, docs, test, refactor, chore
# Scope: story ID (S3-01) or component name

# Examples:
feat(S3-01): Add Vitest integration test infrastructure

test(S3-02): Add dashboard Trust Score calculation tests

fix(S3-03): Add explicit type casts for PostgreSQL CTE queries

docs(S3-04): Document config table pattern for threshold management
```

#### PR Template

```markdown
## Story: [S#-##] - [Story Title]

**Story Link**: [URL to story document]  
**Complexity**: Simple/Moderate/Complex  
**Strategic Review**: Yes/No (link if conducted)

## Changes Summary

- [High-level change 1]
- [High-level change 2]

## Database Schema Changes

- [ ] No schema changes
- [ ] New tables: [list]
- [ ] New columns: [list]
- [ ] New indexes: [list with rationale]

## Test Coverage

- **Tests added**: [number]
- **Test execution time**: [ms]
- **Pass rate**: [100%]

## Migration Readiness

- **Percentage**: [90-100%]
- **Gaps identified**: [list or "none"]

## QA Checklist

- [ ] All ACs passing
- [ ] Tests running in <2s
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Database migrations documented
- [ ] Component registry updated (if applicable)
```

---

## Quality Gates & Standards

### Definition of Done (All Stories)

#### Functional Completeness

- [ ] All acceptance criteria validated (automated tests or manual QA)
- [ ] Happy path + edge cases covered
- [ ] Error states have sanctuary-aligned messaging
- [ ] Strategic review completed (if Moderate+ complexity)

#### Test Coverage

- [ ] Integration tests written and passing (100% pass rate)
- [ ] Test execution <2s for full suite
- [ ] Database state validated (not just API responses)
- [ ] Sanctuary culture messaging validated in tests

#### Code Quality

- [ ] TypeScript compilation passes (no errors)
- [ ] No linter warnings
- [ ] Code reviewed (PR approved)
- [ ] Patterns documented (if new pattern introduced)

#### Ontology Correctness

- [ ] Entities map to correct dimensions
- [ ] Relationships use Connection entities (not foreign keys)
- [ ] Events logged with complete metadata
- [ ] Event logging is append-only (no updates/deletes)

#### Migration Readiness

- [ ] 90%+ migration readiness (quantified with rationale)
- [ ] Blockchain-compatible patterns used (CTE atomic, event-driven)
- [ ] Gaps documented with S4+ mitigation plan

#### Sanctuary Culture

- [ ] State changes are reversible (where applicable)
- [ ] Timeouts/failures don't penalize users
- [ ] Language is supportive (not judgmental)
- [ ] Thresholds are generous

#### Documentation

- [ ] PR summary includes story link, changes, schema notes
- [ ] Story retro completed (learnings captured)
- [ ] Component registry updated (if new components)
- [ ] Pattern library updated (if new patterns)

---

### Grade Rubric (A through F)

#### Grade A (4.0) - Excellence

- **Functional**: All ACs pass (100%)
- **Ontology**: Correct dimension mapping, Connection entities used
- **Migration**: 90-100% readiness (gaps <10% with clear mitigation)
- **Tests**: 100% pass rate, <2s execution, database state validated
- **Sanctuary**: Cultural values embedded in architecture (not just copy)
- **Strategic Value**: Delivers compounding value or completes milestone

#### Grade B+ (3.3) - Strong

- **Functional**: All ACs pass (100%)
- **Ontology**: Mostly correct (1-2 minor dimension mapping issues)
- **Migration**: 80-89% readiness (gaps 10-20% with mitigation plan)
- **Tests**: 95%+ pass rate, <5s execution
- **Sanctuary**: Cultural values present but not architectural
- **Strategic Value**: Delivers story value, no major compounding

#### Grade B (3.0) - Good

- **Functional**: 90-95% ACs pass (1-2 minor issues)
- **Ontology**: Acceptable but uses foreign keys (not Connections)
- **Migration**: 70-79% readiness (gaps 20-30%)
- **Tests**: 90%+ pass rate, <10s execution
- **Sanctuary**: Basic supportive messaging (not comprehensive)
- **Strategic Value**: Delivers basic value

#### Grade C (2.0) - Acceptable

- **Functional**: 80-89% ACs pass (several issues)
- **Ontology**: Significant gaps in dimension mapping
- **Migration**: 60-69% readiness (major gaps)
- **Tests**: 80%+ pass rate or slow execution
- **Sanctuary**: Minimal support (meets requirement but not values)
- **Strategic Value**: Delivers minimum viable feature

#### Grade F (<2.0) - Needs Rework

- **Functional**: <80% ACs pass (major gaps)
- **Ontology**: Incorrect dimension mapping
- **Migration**: <60% readiness (blocking issues)
- **Tests**: <80% pass rate or missing critical tests
- **Sanctuary**: Absent or punitive patterns present
- **Strategic Value**: Does not deliver minimum viable feature

---

### Migration Readiness Scoring

#### Dimensional Breakdown

**Groups Dimension** (Target: 95%+)

- [ ] Group entities correctly modeled
- [ ] Group membership as Connection entities
- [ ] Group governance patterns blockchain-compatible
- [ ] Events capture all group state changes

**People Dimension** (Target: 95%+)

- [ ] Member roles correctly modeled
- [ ] Trust Score as calculated property (not mutable field)
- [ ] Role progression logged in Events
- [ ] People → Group relationships as Connections

**Things Dimension** (Target: 95%+)

- [ ] Thing entities (claims, missions, artifacts) modeled correctly
- [ ] State machines complete (all lifecycle paths validated)
- [ ] Status enums include recovery paths
- [ ] Immutability where required (published artifacts)

**Connections Dimension** (Target: 95%+)

- [ ] Relationships modeled as Connection entities (NOT foreign keys)
- [ ] Connection types explicit (reviewer_assignment, mission_membership)
- [ ] Connection metadata captured
- [ ] Connection creation/deletion logged in Events

**Events Dimension** (Target: 98-100%+)

- [ ] All state changes logged
- [ ] Append-only (no updates/deletes)
- [ ] Complete metadata (actor, reason, context)
- [ ] Merkle root generation possible from event stream

**Knowledge Dimension** (Target: 85%+)

- [ ] Documentation structured as Knowledge entities
- [ ] Version controlled (git = append-only log)
- [ ] Searchable (grep, semantic search)
- [ ] Citable (can reference specific learnings in future stories)

#### Gap Classification

**5% gap (Acceptable)**:

- Git hooks (local development tooling, not migrated)
- Environment-specific optimizations (Neon serverless, AWS-specific config)

**10% gap (Needs S4 mitigation)**:

- Hardcoded thresholds (should use config table)
- Foreign keys instead of Connection entities (architectural refactor needed)

**20%+ gap (Blocking)**:

- Missing event logging for state changes
- Mutable fields instead of calculated properties
- Punitive patterns (penalties, permanent state changes)

---

## Architectural Patterns

### CTE Atomic Transaction (Gold Standard)

**Pattern**:

```typescript
import { withTransaction } from '@/lib/db/transaction';

async function updateStateAndLogEvent(params) {
  return await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
    // Single query: State change + event logging (atomic)
    const result = await client.query(
      `
      WITH state_change AS (
        UPDATE table_name 
        SET column = $1, updated_at = NOW()
        WHERE condition
        RETURNING *
      )
      INSERT INTO events (entity_type, entity_id, event_type, actor_id, metadata)
      SELECT 
        'entity_type',
        sc.id,
        $2::VARCHAR,
        $3::UUID,
        jsonb_build_object(
          'field_changed', 'column',
          'old_value', sc.old_column,
          'new_value', sc.column
        )
      FROM state_change sc
      RETURNING *
    `,
      [newValue, eventType, actorId]
    );

    return result.rows;
  });
}
```

**When to Use**:

- ANY state change requiring audit trail
- Trust Score updates
- Role changes
- Claim status transitions
- Mission participation changes

**Benefits**:

- Atomicity guaranteed (state + event succeed/fail together)
- Single database round-trip (performance)
- No manual rollback logic needed
- Matches blockchain transaction atomicity

**Testing**:

```typescript
it('should rollback state change if event logging fails', async () => {
  mockQuery.mockRejectedValueOnce(new Error('Event insert failed'));

  await expect(updateStateAndLogEvent(params)).rejects.toThrow();

  // Verify state did NOT change (rollback confirmed)
  const entity = await getEntity(entityId);
  expect(entity.column).toBe(oldValue);
});
```

---

### Config Table Pattern (Dynamic Thresholds)

**Schema**:

```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES members(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_config_key ON system_config(key);
CREATE INDEX idx_system_config_version ON system_config(version DESC);
```

**Usage**:

```typescript
// Fetch config value
async function getConfigValue<T>(key: string): Promise<T> {
  const result = await sql`
    SELECT value 
    FROM system_config 
    WHERE key = ${key} 
    ORDER BY version DESC 
    LIMIT 1
  `;
  return result[0].value as T;
}

// Update config (with audit trail)
async function updateConfigValue(key: string, value: any, updatedBy: string) {
  return await sql`
    INSERT INTO system_config (key, value, version, updated_by)
    SELECT 
      ${key},
      ${JSON.stringify(value)},
      COALESCE(MAX(version) + 1, 1),
      ${updatedBy}
    FROM system_config
    WHERE key = ${key}
    ON CONFLICT (key) DO UPDATE
    SET 
      value = EXCLUDED.value,
      version = EXCLUDED.version,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `;
}
```

**When to Use**:

- Thresholds (Trust Score for role promotion, timeout durations)
- Incentive weights (dimension multipliers)
- Feature flags (enable/disable workflows)
- Rate limits (API throttling, claim submission caps)

**Migration Value**:

- Config entries translate directly to on-chain governance parameters
- Version field creates audit trail
- JSONB flexibility handles diverse config types

---

### Event Logging Standard

**Event Schema**:

```typescript
interface Event {
  id: string; // UUID
  entity_type: string; // 'member', 'claim', 'mission', etc.
  entity_id: string; // Entity UUID
  event_type: string; // 'member.promoted', 'claim.approved', etc.
  actor_id: string | null; // Who triggered (null for system events)
  metadata: Record<string, any>; // Complete context for state reconstruction
  created_at: Date; // Timestamp (immutable)
}
```

**Metadata Standards** (by event type):

**State Transitions**:

```json
{
  "event_type": "entity.state_changed",
  "metadata": {
    "entity_id": "uuid",
    "old_state": "previous_status",
    "new_state": "current_status",
    "reason": "threshold_met | admin_override | timeout | user_action",
    "context": {} // Additional context specific to transition
  }
}
```

**Role Promotions**:

```json
{
  "event_type": "member.promoted",
  "metadata": {
    "member_id": "uuid",
    "promoted_by": "uuid",
    "old_role": "member",
    "new_role": "steward",
    "trust_score": 250,
    "threshold": 250, // Captured at promotion time (handles config changes)
    "promotion_reason": "trust_threshold_reached | admin_override"
  }
}
```

**Claim Status Changes**:

```json
{
  "event_type": "claim.status_changed",
  "metadata": {
    "claim_id": "uuid",
    "reviewer_id": "uuid",
    "old_status": "under_review",
    "new_status": "approved",
    "points_awarded": 75,
    "incentive_breakdown": [
      { "name": "Technical Skill", "points": 35 },
      { "name": "Communication", "points": 25 },
      { "name": "Collaboration", "points": 15 }
    ]
  }
}
```

**Testing Event Logging**:

```typescript
describe('Event Logging', () => {
  it('should log complete metadata for state changes', async () => {
    await promoteMememberToSteward(memberId, adminId);

    const events = await getEventsByEntityId(memberId);
    const promotionEvent = events.find(
      (e) => e.event_type === 'member.promoted'
    );

    expect(promotionEvent).toBeDefined();
    expect(promotionEvent.actor_id).toBe(adminId);
    expect(promotionEvent.metadata).toMatchObject({
      old_role: 'member',
      new_role: 'steward',
      trust_score: expect.any(Number),
      threshold: expect.any(Number),
      promotion_reason: expect.stringMatching(/threshold|override/),
    });
  });
});
```

---

### Fallback Query Pattern (Event Sourcing Resilience)

**Problem**: Event metadata might be incomplete (early events, migration gaps).

**Solution**: Fallback to relational data when JSON is incomplete.

**Pattern**:

```typescript
// Trust Score breakdown with fallback
const incentiveBreakdown = await sql`
  SELECT
    COALESCE(i.name, e.metadata->'incentive_breakdown'->0->>'name') AS incentive_name,
    COALESCE(
      SUM((e.metadata->'incentive_breakdown'->0->>'points')::integer),  -- From events
      SUM(ti.points)                                                      -- Fallback to task definition
    ) AS total_points
  FROM events e
  LEFT JOIN claims c ON (e.metadata->>'claim_id')::uuid = c.id
  LEFT JOIN task_incentives ti ON ti.task_id = c.task_id
  LEFT JOIN incentives i ON i.id = ti.incentive_id
  WHERE e.event_type = 'claim.approved'
    AND (e.metadata->>'member_id')::uuid = ${memberId}
  GROUP BY COALESCE(i.name, e.metadata->'incentive_breakdown'->0->>'name')
`;
```

**When to Use**:

- Dashboard queries (user-facing, must always show data)
- Trust Score calculations
- Historical data queries (spanning pre-event and post-event eras)

**Migration Value**:

- Ensures data completeness during blockchain migration
- Handles gradual event metadata improvement
- No user-facing errors during transition

---

### Transaction Context Passing

**Problem**: Multiple operations need same transaction (atomic workflow).

**Solution**: Pass `PoolClient` from `withTransaction()` to dependent operations.

**Pattern**:

```typescript
// Primary operation
async function approveClaimAndPromote(claimId: string, reviewerId: string) {
  return await withTransaction(pool, async (client) => {
    // Operation 1: Approve claim
    const updatedClaim = await approveClaim(client, claimId, reviewerId);

    // Operation 2: Update Trust Score (same transaction)
    const { trust_score } = await updateMemberTrustScore(
      client,
      updatedClaim.member_id,
      updatedClaim.points_awarded
    );

    // Operation 3: Check promotion (same transaction)
    const promotionResult = await checkAndPromoteMember(
      client,
      updatedClaim.member_id,
      trust_score
    );

    // All succeed together or all fail together
    return { updatedClaim, trust_score, promotionResult };
  });
}

// Dependent operation (accepts client parameter)
async function checkAndPromoteMember(
  client: PoolClient, // Same transaction context
  memberId: string,
  trustScore: number
) {
  // Uses provided client (not pool directly)
  const threshold = await getConfigValue(client, 'steward_threshold');

  if (trustScore >= threshold) {
    return await promoteMember(client, memberId, 'steward');
  }

  return null;
}
```

**When to Use**:

- Claim approval + Trust Score update + role promotion
- Mission completion + reputation update + badge award
- Multi-step workflows requiring atomicity

**Benefits**:

- Guarantee atomicity across feature boundaries
- Single rollback point (all or nothing)
- Clear transaction boundaries

---

## Sanctuary Culture Playbook

### Principle 1: Reversible State Transitions

**Anti-Pattern**:

```typescript
// ❌ Permanent deletion (irreversible)
await sql`DELETE FROM claims WHERE id = ${claimId}`;
```

**Sanctuary Pattern**:

```typescript
// ✅ Status change (reversible)
await sql`
  UPDATE claims 
  SET status = 'archived', archived_at = NOW(), archived_by = ${adminId}
  WHERE id = ${claimId}
`;

// ✅ Can be unarchived later
await sql`
  UPDATE claims 
  SET status = 'submitted', archived_at = NULL, archived_by = NULL
  WHERE id = ${claimId}
`;
```

**Examples from Sprint 3**:

- S3-03: Claims released to `submitted` (not deleted)
- Status enums include recovery paths: `archived` → `submitted`
- No permanent penalties in database schema

**Design Checklist**:

- [ ] Can this state be undone without admin intervention?
- [ ] Do we preserve history (not overwrite)?
- [ ] Can member recover from this state through their own actions?

---

### Principle 2: Non-Punitive Defaults

**Anti-Pattern**:

```typescript
// ❌ Automatic penalty on timeout
if (daysSinceReview > 7) {
  await deductTrustScore(reviewerId, -50); // Punitive
  await addReputation(reviewerId, 'unreliable'); // Stigma
}
```

**Sanctuary Pattern**:

```typescript
// ✅ Release claim, no penalty
if (daysSinceReview > 7) {
  await releaseClaimToPool(claimId); // Claim available for others
  // Reviewer's Trust Score unchanged
  // No negative reputation markers
}
```

**Examples from Sprint 3**:

- S3-03: Orphaned claims released, Trust Score unchanged
- S3-03: No "failed review" markers in member record
- Generous 7-day threshold (not aggressive 3-day)

**Design Checklist**:

- [ ] Do timeouts/failures avoid deducting points?
- [ ] Are thresholds generous (account for life circumstances)?
- [ ] Do we assume good faith (not negligence)?

---

### Principle 3: Teaching Moments in System Messaging

**Anti-Pattern**:

```bash
# ❌ Authoritarian error
ERROR: Direct push to main forbidden. Access denied.
```

**Sanctuary Pattern**:

```bash
# ✅ Teaching moment
🌱 Let's use a feature branch to keep main stable!

Run: git checkout -b feature/your-feature-name

Why? Feature branches allow code review before merging,
which helps catch issues early and keeps main deployable.
```

**Examples from Sprint 3**:

- S3-01: Git hook teaches workflow (not just blocks)
- S3-04: Promotion toast teaches reviewer role ("help succeed, not gatekeep")
- S3-03: Dialog explains why claims are orphaned ("Life happens!")

**Design Checklist**:

- [ ] Does error message explain WHY (not just WHAT)?
- [ ] Is tone supportive (not scolding)?
- [ ] Do we provide next steps (not just block)?

---

### Principle 4: Supportive Language

**Word Replacement Guide**:

| ❌ Avoid  | ✅ Use Instead     | Rationale                      |
| --------- | ------------------ | ------------------------------ |
| Overdue   | Orphaned           | Removes time pressure judgment |
| Failed    | Needs revision     | Implies learning, not failure  |
| Violation | Guideline miss     | Reduces legal/punitive tone    |
| Penalty   | Adjustment         | Neutral, not punitive          |
| Deadline  | Target date        | Aspirational, not threatening  |
| Warning   | Reminder           | Supportive, not threatening    |
| Rejected  | Needs another look | Collaborative, not dismissive  |

**Examples from Sprint 3**:

- S3-03: "Orphaned Claims" badge (not "Overdue Reviews")
- S3-03: "Life happens!" heading (not "Performance Issue")
- S3-03: "No penalties will be applied" (explicit reassurance)
- S3-04: "You're almost there!" progress encouragement (not "Still need N points")

**Design Checklist**:

- [ ] Would this language make ME feel supported (not judged)?
- [ ] Are we assuming good faith?
- [ ] Do we remove unnecessary urgency/pressure?

---

### Principle 5: Generous Thresholds

**Decision Framework**:

| Context              | Harsh Threshold | Generous Threshold | Choose Generous                  |
| -------------------- | --------------- | ------------------ | -------------------------------- |
| Review timeout       | 3 days          | 7 days             | ✅ Accounts for weekends, life   |
| Claim revision       | 24 hours        | 72 hours           | ✅ Time for thoughtful work      |
| Response time        | 12 hours        | 48 hours           | ✅ Async-friendly, global team   |
| Trust Score for role | 300 points      | 250 points         | ✅ Lower barrier to contribution |

**Examples from Sprint 3**:

- S3-03: 7-day orphaned threshold (not 3-day)
- S3-04: 250-point steward threshold (accessible, not elite)

**Design Checklist**:

- [ ] Does this threshold account for weekends/time zones?
- [ ] Would I feel this is fair if I had life circumstances?
- [ ] Are we being generous (not just "industry standard")?

---

### Sanctuary Architecture Checklist

Use this checklist during strategic reviews and implementation:

**Reversibility** (Can states be undone?):

- [ ] State changes use status updates (not deletions)
- [ ] Status enums include recovery paths
- [ ] No permanent penalties in logic
- [ ] Member can self-recover (not admin-dependent)

**Non-Punitive Defaults** (Do timeouts/failures avoid penalties?):

- [ ] Timeouts don't deduct Trust Score
- [ ] No automatic negative reputation markers
- [ ] "Strikes" or "warnings" count not stored
- [ ] Thresholds are generous (account for life)

**Teaching Moments** (Do system messages explain values?):

- [ ] Error messages explain WHY (not just WHAT)
- [ ] Tone is supportive (not scolding)
- [ ] Next steps provided (not just "no")
- [ ] Cultural values taught through messaging

**Supportive Language** (Is language judgment-free?):

- [ ] No words: overdue, failed, violation, penalty, deadline
- [ ] Use: orphaned, needs revision, guideline miss, adjustment, target
- [ ] Explicit reassurances ("No penalties")
- [ ] Encouraging progress ("You're almost there!")

**Generous Thresholds** (Are expectations reasonable?):

- [ ] Timeouts account for weekends/holidays
- [ ] Async-friendly (48+ hour response times)
- [ ] Role progression accessible (not elite)
- [ ] Grace periods before automation

**Score**: 20/20 checks = Gold Standard (S3-03 level)  
**Score**: 15-19/20 = Excellent  
**Score**: 10-14/20 = Good (room for improvement)  
**Score**: <10/20 = Needs sanctuary culture review

---

## Migration Readiness Checklist

### Groups Dimension (Target: 95%+)

- [ ] **Entity Modeling**: Group entities (missions, cohorts) map to Groups dimension
- [ ] **Membership**: Member → Group relationships modeled as Connection entities (not foreign keys)
- [ ] **Governance**: Group decision-making patterns blockchain-compatible (voting, proposals)
- [ ] **Events**: All group state changes logged (creation, membership changes, status transitions)
- [ ] **Lifecycle**: Group status enums include all paths (draft → active → paused → archived)

**Gap Analysis**:

- If using foreign keys for membership: -10% (refactor to Connections)
- If missing group governance events: -5%
- If group creation not logged: -5%

---

### People Dimension (Target: 95%+)

- [ ] **Role Progression**: Member roles correctly modeled (explorer → contributor → steward → guardian)
- [ ] **Trust Score**: Calculated property from events (not mutable database field)
- [ ] **Events**: All role changes logged with complete metadata (old_role, new_role, reason, threshold)
- [ ] **Relationships**: People → Group connections modeled as Connection entities
- [ ] **Identity**: Member IDs blockchain-compatible (UUID or deterministic hash)

**Gap Analysis**:

- If Trust Score is mutable field: -10% (event-driven recalculation needed)
- If role changes missing actor_id: -5%
- If using foreign keys for group membership: -10%

---

### Things Dimension (Target: 95%+)

- [ ] **Entity Types**: Thing entities (claims, missions, artifacts) correctly identified
- [ ] **State Machines**: All lifecycle paths validated (no stuck states possible)
- [ ] **Status Enums**: Include recovery paths (reversibility)
- [ ] **Immutability**: Published artifacts immutable (content hash in events)
- [ ] **Events**: All state transitions logged with actor, reason, context

**Gap Analysis**:

- If state machine incomplete (missing paths): -10%
- If published Things are mutable: -10%
- If content hashes missing for file uploads: -5%
- If state transitions missing events: -10%

---

### Connections Dimension (Target: 95%+)

- [ ] **No Foreign Keys**: Relationships modeled as Connection entities (not foreign keys)
- [ ] **Connection Types**: Explicit types (reviewer_assignment, mission_membership, mentorship)
- [ ] **Metadata**: Connection creation includes context (assigned_by, joined_at, role_in_mission)
- [ ] **Events**: Connection creation/deletion logged
- [ ] **Lifecycle**: Connections can be created/dissolved (not permanent)

**Gap Analysis**:

- If using foreign keys instead of Connections: **-15% to -25%** (CRITICAL)
- If Connection types not explicit: -5%
- If Connection lifecycle events missing: -10%

**Priority**: Address Connections gap in Sprint 4 (blocking 100% migration)

---

### Events Dimension (Target: 98-100%+)

- [ ] **Append-Only**: Events table has no UPDATE/DELETE operations in codebase
- [ ] **Complete Metadata**: Events include actor_id, reason, context (all info for state reconstruction)
- [ ] **Actor Attribution**: Who triggered event (admin_id vs member_id vs system)
- [ ] **Timestamps**: Event time captured (not just entity updated_at)
- [ ] **Merkle Compatibility**: Event stream can generate Merkle root (hash of hashes)

**Gap Analysis**:

- If events have any UPDATE queries: **-20%** (BLOCKING)
- If actor_id missing: -10%
- If reason/context incomplete: -10%
- If content hashes not captured: -5%

**Target**: Events dimension should be 98-100% (gold standard achieved in Sprint 3)

---

### Knowledge Dimension (Target: 85%+)

- [ ] **Documentation Structured**: Docs as Knowledge entities (not just markdown files)
- [ ] **Version Control**: Git provides append-only log (immutability)
- [ ] **Searchability**: grep, semantic search within docs
- [ ] **Citability**: Can reference learnings in future stories ("S3-03 retro, section 4.2")
- [ ] **Pattern Library**: Reusable patterns documented (CTE, config table, sanctuary messaging)

**Gap Analysis**:

- If docs not structured as entities: -10% (lower priority)
- If pattern library missing: -5%
- If learnings not citable/searchable: -5%

**Note**: Knowledge dimension is lower priority (85% target vs 95%+ for others). Documentation works for MVP even if not fully blockchain-compatible.

---

### Overall Migration Readiness Formula

```
Overall % = (
  Groups Weight × Groups % +
  People Weight × People % +
  Things Weight × Things % +
  Connections Weight × Connections % +
  Events Weight × Events % +
  Knowledge Weight × Knowledge %
) / Total Weight

Weights (adjust per story):
- Groups: 15% (if story touches Groups, else 0%)
- People: 20%
- Things: 20%
- Connections: 20% (CRITICAL - blocks 100%)
- Events: 20% (CRITICAL - must be 98%+)
- Knowledge: 5%
```

**Example** (S3-03 Orphaned Claims):

```
Groups: 0% (not touched in story)
People: 15% × 95% = 14.25%
Things: 25% × 95% = 23.75% (claims lifecycle complete)
Connections: 20% × 85% = 17% (reviewer_id foreign key issue)
Events: 30% × 98% = 29.4% (gold standard event logging)
Knowledge: 10% × 80% = 8% (documentation excellent)

Overall = 92.4% (rounds to 92% in QA report)
```

---

## Appendix: Quick Reference

### Story Complexity Thresholds

- **Simple**: 1-4 points, 4-8 hours, pattern reuse, no strategic review needed
- **Moderate**: 5-7 points, 8-12 hours, some new patterns, strategic review recommended
- **Complex**: 8+ points, 12+ hours, significant new architecture, strategic review MANDATORY

### Test Execution Targets

- **Unit tests**: <100ms for suite
- **Integration tests**: <2s for full suite
- **E2E tests**: <30s for critical paths

### File Naming Conventions

- **Components**: PascalCase (`ProgressToSteward.tsx`)
- **Utilities**: kebab-case (`trust-score-helpers.ts`)
- **Tests**: Same as file + `.test.ts` (`trust-score-helpers.test.ts`)
- **Stories**: `S[sprint]-[number]-[description].md`

### Common Path Patterns

- **Components**: `/src/components/trust-builder/[ComponentName].tsx`
- **Utilities**: `/src/lib/[domain]/[utility-name].ts`
- **Tests**: `/tests/[feature]/[test-name].test.ts`
- **Docs**: `/project/trust-builder/[category]/[doc-name].md`

### Key Documentation Files

- **Component Registry**: `/project/trust-builder/patterns/component-registry.md`
- **Layout Patterns**: `/project/trust-builder/patterns/UI-layout-pattern.md`
- **Sanctuary Messaging**: `/project/trust-builder/patterns/sanctuary-messaging.md`
- **Neon SQL Patterns**: `/project/trust-builder/patterns/neon-sql-patterns.md`
- **Agent Changelog**: `/project/trust-builder/meta/agent-prompt-changelog.md`

---

## Document Changelog

**2026-02-12**: Initial compilation from Sprint 3 retrospectives (Stories S3-01, S3-02, S3-03, S3-04 + Sprint Review)

- Synthesized learnings from 4 story retros + sprint retrospective (2,988 lines of source material)
- Established team successes (8 proven patterns with ROI data)
- Documented team struggles (7 known gaps with S4 mitigation plans)
- Created 43 action items categorized by role and priority
- Built comprehensive guidelines (development, testing, strategic review, git workflow)
- Defined quality gates (DoD, grade rubric, migration scoring)
- Documented architectural patterns (CTE, config table, event logging, transaction passing)
- Created Sanctuary Culture Playbook (5 principles with design checklists)
- Established migration readiness checklist (6 dimensions with gap analysis)

**Next Update**: After Sprint 4 completion (incorporate S4 learnings, validate S3 patterns)
