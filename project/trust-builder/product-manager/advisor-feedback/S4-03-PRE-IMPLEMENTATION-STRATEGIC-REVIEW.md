# Strategic Review: S4-03 Mission Joining Workflow (Pre-Implementation)

**Reviewer**: product-advisor  
**Date**: 2026-02-12 (90-minute pre-implementation review)  
**Story**: S4-03 Mission Joining Workflow (8 points, Complex)  
**Review Type**: Mandatory pre-implementation architecture validation  
**Status**: 🚨 **MAJOR REVISIONS REQUIRED** 🚨

---

## Executive Summary

S4-03 proposes creating **duplicate schema tables** (`missions`, `mission_members`) that **already exist** in the database schema (`groups` with `type='mission'`, `memberships`). This represents a **critical ontology violation** that would fragment the data model and break the ONE 6-dimension framework.

**Grade**: **D (Major Architectural Issues)**

**Decision**: 🛑 **DO NOT IMPLEMENT AS WRITTEN** — Scope revision required before implementation.

---

## Critical Issues (Must Fix Before Implementation)

### 🚨 ISSUE 1: Schema Duplication Violates ONE Ontology

**Problem**: Story proposes new tables that duplicate existing Groups dimension entities:

**Proposed (S4-03)**:

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  mission_id TEXT UNIQUE,  -- FE-M-XXXXX
  name TEXT,
  description TEXT,
  min_trust_score INTEGER,
  ...
)

CREATE TABLE mission_members (
  id UUID PRIMARY KEY,
  mission_id UUID REFERENCES missions,
  member_id UUID REFERENCES members,
  role TEXT,
  ...
)
```

**Already Exists (schema.sql)**:

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50) CHECK (type IN ('colony', 'mission')),
  description TEXT,
  ...
)

CREATE TABLE memberships (
  member_id UUID REFERENCES members,
  group_id UUID REFERENCES groups,
  role VARCHAR(50),
  joined_at TIMESTAMPTZ,
  ...
)
```

**Ontology Violation**:

- **Groups dimension**: Missions ARE Groups entities (`type='mission'`)
- **Connections dimension**: Mission membership IS already modeled via `memberships` table
- Creating separate `missions` table **fragments the ontology** (some groups in `groups`, some in `missions`)
- Future queries require `UNION` across two tables (anti-pattern)

**Impact**:

- Migration readiness drops from 85% → 60% (dual data models = complex export)
- Analytics queries break (trust score by mission would miss `memberships` data)
- Future mission features (sub-missions, mission hierarchies) blocked by schema split

**Required Fix**:
Use `groups` table with `type='mission'` + `memberships` table. Add mission-specific columns to `groups`:

```sql
ALTER TABLE groups
ADD COLUMN min_trust_score INTEGER DEFAULT 0,
ADD COLUMN stable_id TEXT UNIQUE; -- FE-M-XXXXX format

UPDATE groups SET stable_id = 'FE-G-00001' WHERE type = 'colony';
UPDATE groups SET stable_id = 'FE-M-00001' WHERE type = 'mission' AND name = 'Webinar Series Season 0';
```

---

### 🚨 ISSUE 2: Missing Stable IDs for Existing Groups

**Problem**: Current `groups` table has no stable identifier (FE-M-XXXXX format). Story proposes `missions.mission_id` but ignores existing groups.

**Evidence** (schema.sql line 13-24):

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,  -- UUID only, no stable_id
  name VARCHAR(255),
  ...
)
```

**Migration Impact**:

- Existing Colony group (root) has no FE-G-00001 stable ID
- Existing Webinar Mission has no FE-M-00001 stable ID
- Migration to blockchain requires stable IDs for ALL groups (not just new missions)

**Required Fix**:

1. Add `stable_id TEXT UNIQUE` column to `groups` table
2. Backfill existing groups:
   - Colony → `FE-G-00001`
   - Webinar Mission → `FE-M-00001`
3. Update seed script to include stable_id for new missions

---

### 🚨 ISSUE 3: Missing Leave Workflow in Existing Memberships Table

**Problem**: Story proposes `mission_members.left_at` and `mission_members.status` to track leave events. Current `memberships` table has no leave tracking.

**Evidence** (schema.sql line 120-129):

```sql
CREATE TABLE memberships (
  member_id UUID,
  group_id UUID,
  role VARCHAR(50),
  joined_at TIMESTAMPTZ,
  PRIMARY KEY (member_id, group_id)
)
```

**Missing**:

- `left_at TIMESTAMPTZ` (when member left)
- `status TEXT` (active/left)
- Constraint to prevent re-joining while active

**Impact on Story Goals**:

- AC8 "Member can leave mission voluntarily" → Cannot be implemented without schema change
- AC12 Event metadata includes `days_active` → Cannot calculate without `left_at`
- AC9 "Member cannot join same mission twice" → Cannot enforce without `status` field

**Required Fix**:

```sql
ALTER TABLE memberships
ADD COLUMN left_at TIMESTAMPTZ,
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left'));

-- Drop existing primary key, add unique constraint for active only
ALTER TABLE memberships DROP CONSTRAINT memberships_pkey;
CREATE UNIQUE INDEX idx_memberships_active
ON memberships (member_id, group_id) WHERE status = 'active';
```

---

## Moderate Issues (Should Fix Before Implementation)

### ⚠️ ISSUE 4: Event Type Naming Inconsistency

**Problem**: Story proposes `mission.member_joined` and `mission.member_left` event types. Existing event convention uses entity type + action.

**Existing Convention** (from schema comments and S3 retros):

- `claim.approved`
- `claim.timeout_released`
- `member.role_promoted`
- Pattern: `<entity>.<action_past_tense>`

**Proposed** (S4-03):

- `mission.member_joined` → Implies mission did the joining (wrong actor)
- `mission.member_left` → Implies mission did the leaving (wrong actor)

**Better Naming** (consistent with existing):

- `membership.created` (member joined a group)
- `membership.ended` (member left a group)
- OR `group.member_joined` (if mission-specific tracking needed)

**Impact**: Moderate (inconsistency, but won't break functionality)

**Recommendation**: Align with existing event naming convention for consistency.

---

### ⚠️ ISSUE 5: Missing Task-to-Mission Foreign Key

**Problem**: Story shows query `SELECT COUNT(*) FROM tasks t WHERE t.mission_id = m.id` but `tasks` table references `group_id`, not `mission_id`.

**Evidence** (schema.sql line 51):

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id),  -- Not mission_id
  ...
)
```

**Story Code** (S4-03, API route):

```typescript
(SELECT COUNT(*) FROM tasks t WHERE t.mission_id = m.id AND t.status = 'open') as task_count
```

**Issue**: Column name mismatch. If using `groups` table (correct approach), queries should use `group_id`.

**Required Fix**: Update story's SQL to use `t.group_id` instead of `t.mission_id`.

---

### ⚠️ ISSUE 6: Eligibility Check Event (AC13) Creates Noise

**Problem**: Story AC13 proposes logging `mission.eligibility_checked` event every time member views mission details.

**Concerns**:

- **Event log noise**: Viewing mission details 10 times = 10 events (analytics pollution)
- **Privacy concern**: Tracks every mission page view (surveillance feel, not sanctuary)
- **Migration bloat**: Event log size grows with every browse action (not value-creating events)

**Comparison**: S3 events logged **state changes** (claim approved, role promoted), not **view actions**.

**Recommendation**: Remove AC13, or change to "eligibility failed" event only (when join button clicked but ineligible). Don't log passive browsing.

---

## Dimensional Analysis

### Groups Dimension ❌ CRITICAL FAIL

**Finding**: Story proposes separate `missions` table instead of using existing `groups` table with `type='mission'`.

**Ontology Correctness**: **0/5** (violates Groups dimension by fragmenting organizational entities)

**Required Changes**:

1. Use `groups` table for missions (add `min_trust_score` column)
2. Add `stable_id` column to `groups` for FE-M-XXXXX format
3. Update seed script to create missions via `groups` table

---

### People Dimension ✅ CORRECT

**Finding**: Story correctly uses `members` table as actor for join/leave actions.

**Ontology Correctness**: **5/5** (no changes needed)

---

### Connections Dimension ❌ CRITICAL FAIL

**Finding**: Story proposes separate `mission_members` table instead of using existing `memberships` table.

**Ontology Correctness**: **1/5** (duplicates existing Connection entity)

**Required Changes**:

1. Use `memberships` table for mission joins (add `left_at`, `status` columns)
2. Update join/leave API routes to work with `memberships`
3. Ensure `status='active'` constraint prevents duplicate joins

---

### Events Dimension ⚠️ NEEDS REFINEMENT

**Finding**: Event types proposed (`mission.member_joined`) are inconsistent with existing convention. AC13 creates event log noise.

**Ontology Correctness**: **3/5** (event structure correct, naming and scope need adjustment)

**Required Changes**:

1. Rename events: `membership.created`, `membership.ended` (align with entity type)
2. Remove AC13 (eligibility check event = noise) OR change to failure-only logging
3. Event metadata structure is good (mission_id, member_id, trust_score)

---

### Knowledge Dimension ✅ MOSTLY CORRECT

**Finding**: Mission metadata (member count, task count) correctly derived from Connections and Things.

**Ontology Correctness**: **4/5** (correct approach, minor query fixes needed)

**Required Changes**:

1. Update queries to use `group_id` instead of `mission_id`
2. Filter by `type='mission'` when querying `groups` table

---

### Things Dimension ✅ CORRECT

**Finding**: Mission status (active/paused) correctly modeled as Thing state.

**Ontology Correctness**: **5/5** (no changes needed)

---

## Sanctuary Culture Assessment

### Reversibility ✅ PASS

- Members can leave and rejoin missions (per story design)
- No Trust Score deduction for leaving
- **Good**: "You can rejoin anytime" messaging

### Non-Punitive Defaults ✅ PASS

- No penalties for leaving missions
- Eligibility thresholds are supportive, not restrictive
- **Good**: Starter mission has 0 threshold (everyone can participate)

### Teaching Moments ✅ PASS

- Ineligibility messages show path forward: "You need 100 more Trust Points"
- Progress indicators motivational: "You're 80% of the way there!"
- **Good**: Clear goal visibility

### Supportive Language ✅ PASS

- "Keep completing tasks!" (encouraging)
- NOT "You don't qualify" (harsh)
- **Good**: Sanctuary-aligned copy examples

### Generous Thresholds ✅ PASS

- 0 points: Webinar Series (everyone welcome)
- 250 points: Content Creation (achievable milestone)
- 500 points: Platform Development (aspirational)
- **Good**: Graduated progression

**Sanctuary Grade**: **A** (messaging and design align with values)

---

## Migration Readiness Assessment

**Current Story Forecast**: 85-90%  
**Actual with Proposed Schema**: **60%** (dual data models create migration complexity)  
**If Fixed to Use Groups Table**: **90%** (aligned with existing ontology)

**Migration Issues with Proposed Schema**:

1. **Dual data models**: Some groups in `groups`, some in `missions` → Export requires table reconciliation
2. **Dual membership models**: Some memberships in `memberships`, some in `mission_members` → Trust Score calculations miss data
3. **Stable ID inconsistency**: New missions get FE-M-XXXXX, but existing groups lack stable IDs
4. **Event fragmentation**: Mission events reference `missions` table (UUID), but blockchain needs stable IDs

**Migration Path with Fixed Schema**:

1. All organizational entities in `groups` (Colony + Missions) → Single export query
2. All member relationships in `memberships` → Single join event export
3. Stable IDs on all groups → Direct blockchain mapping (FE-G-XXXXX, FE-M-XXXXX)
4. Event log references stable IDs → Portable attestations

**Migration Readiness Grade**: **D (as written) → A (if fixed)**

---

## Layout & Information Hierarchy

### List + Detail Pattern ✅ APPROVED

Story correctly proposes list + detail pattern from UI-layout-pattern.md:

- Mission list (left/top)
- Mission detail (right/bottom)
- Responsive stacking at 375px

**No concerns** with layout approach.

### Primary Action Clarity ✅ APPROVED

- "Join Mission" as `variant="default"` (only one per card)
- Secondary actions (if any) as `variant="outline"`

**No concerns** with action hierarchy.

### Mobile Responsive ✅ APPROVED

- 375px stacking validated in prior stories (S2-04 review queue pattern)
- Touch target sizes (≥44px) specified

**No concerns** with responsive approach.

**Layout Grade**: **A** (well-designed)

---

## Risk Assessment (Updated)

### High Risk Items

**1. Schema Duplication (CRITICAL)**

- **Risk**: Story as written creates duplicate tables, breaking ontology
- **Mitigation**: Use existing `groups` + `memberships` tables with schema enhancements
- **Fallback**: If complexity exceeds 8 points with fixes, split into 2 stories:
  - S4-03A: Schema enhancements (add stable_id, left_at, status) — 3 points
  - S4-03B: Mission joining UI — 5 points

**2. Migration Breaking Change (CRITICAL)**

- **Risk**: Dual data models make blockchain export impossible
- **Mitigation**: Fix schema alignment BEFORE implementation (no code written yet)
- **Fallback**: If dual tables created, will require expensive data reconciliation in S7

### Medium Risk Items

**3. Complexity Underestimation (MODERATE)**

- **Risk**: Schema fixes + UI might push story beyond 8 points
- **Mitigation**: Strategic review now identifies scope (decision: keep at 8 or split)
- **Fallback**: Split story if implementation hits 12+ hours

**4. Existing Mission Data (MODERATE)**

- **Risk**: Seed data already created one mission in `groups` table
- **Mitigation**: Migration script updates existing mission with stable_id and min_trust_score
- **Fallback**: If conflicts, manually reconcile in database before implementation

---

## Recommended Scope Revision

### Option A: Fix Schema, Keep Story Intact (8 points, Complex)

**Changes Required**:

1. Replace `missions` table → Use `groups` table
2. Replace `mission_members` table → Use `memberships` table
3. Add schema enhancements:
   ```sql
   ALTER TABLE groups ADD COLUMN min_trust_score INTEGER DEFAULT 0;
   ALTER TABLE groups ADD COLUMN stable_id TEXT UNIQUE;
   ALTER TABLE memberships ADD COLUMN left_at TIMESTAMPTZ;
   ALTER TABLE memberships ADD COLUMN status TEXT DEFAULT 'active';
   ```
4. Update seed script to backfill existing mission
5. Update all API queries to use `groups` and `memberships`
6. Remove AC13 (eligibility check event logging)
7. Rename event types: `membership.created`, `membership.ended`

**Estimated Time with Fixes**: 10-12 hours (still fits 8-point estimate)

**Pros**:

- Delivers all member-facing value in one story
- Ontology-correct implementation
- 90% migration readiness achieved

**Cons**:

- Developer must understand schema changes (adds cognitive load)
- Higher risk of bugs due to schema modifications

---

### Option B: Split into Two Stories (3 + 5 = 8 points)

**Story S4-03A: Mission Schema Foundation** (3 points, Simple)

- Add `min_trust_score`, `stable_id` to `groups` table
- Add `left_at`, `status` to `memberships` table
- Backfill existing mission with stable_id (FE-M-00001)
- Create 2 additional seed missions (Content Creation, Platform Dev)
- Write helper functions for mission queries
- **No UI**, pure schema work

**Story S4-03B: Mission Joining UI** (5 points, Moderate)

- Implement list + detail UI (missions page)
- Implement join/leave API routes (using `memberships` table)
- Event logging (`membership.created`, `membership.ended`)
- Day 5 manual testing (iOS, Android, Desktop)
- **Depends on S4-03A completion**

**Estimated Time**: 4-6 hours (A) + 8-10 hours (B) = 12-16 hours total

**Pros**:

- Lower risk (schema changes validated separately before UI)
- Schema story can be tested in isolation (SQL migration testing)
- UI story has clean foundation (no schema uncertainty)

**Cons**:

- Requires 2 stories (planning overhead)
- Member-facing value delayed to S4-03B
- Longer total calendar time (2 stories vs 1)

---

## Recommendation: Option B (Split Stories)

**Rationale**:

1. **Risk mitigation**: Schema changes are CRITICAL and deserve separate validation
2. **Ontology validation**: S4-03A can be reviewed by product-advisor BEFORE UI work starts
3. **Complexity accurate**: Story as written underestimates schema work (should be 11-13 points total, not 8)
4. **Parallel potential**: If S4-03A completes early (Day 1-2), S4-03B can start immediately without blocking other stories
5. **Testing quality**: Schema changes can be tested with direct SQL queries (no UI testing noise)

**Adjusted Sprint 4 Scope**:

| Story   | Title                     | Points | Days          | Notes                              |
| ------- | ------------------------- | ------ | ------------- | ---------------------------------- |
| S4-01   | Admin Configuration UI    | 3      | Feb 12-13     | No changes                         |
| S4-02   | Pre-commit Hooks + Docs   | 2      | Feb 12        | No changes                         |
| S4-03A  | Mission Schema Foundation | 3      | Feb 13-14     | NEW (split from S4-03)             |
| S4-03B  | Mission Joining UI        | 5      | Feb 15-17     | NEW (split from S4-03)             |
| S4-04   | Reviewer Dashboard Layout | 5      | Feb 13-14     | Parallel with S4-03A               |
| **---** | **TOTAL**                 | **18** | **Feb 12-19** | Same total points, safer execution |

**Strategic Pre-Review for S4-03B**: 45 minutes (reduced from 90, since schema validated in S4-03A)

---

## Questions for Product Owner (Immediate Decisions Needed)

### Q1: Story Split Decision ⚠️ CRITICAL

**Question**: Accept Option B recommendation (split S4-03 into S4-03A + S4-03B)?

**Options**:

- **A) Accept split** (3 + 5 points, safer execution) ← RECOMMENDED
- **B) Keep single story** (8 points, higher risk, requires schema fixes)

**Impact**: If split accepted, product owner must create S4-03A story file before S4-03 implementation starts.

---

### Q2: Existing Mission Data Handling

**Question**: How should we handle the existing "Webinar Series Season 0" mission in `groups` table?

**Options**:

- **A) Backfill with stable_id (FE-M-00001)** and min_trust_score (0) ← RECOMMENDED
- **B) Delete and recreate** (loses UUID references if any tasks already linked)
- **C) Leave as-is** and create new missions only (inconsistent data)

**Impact**: Option A preserves referential integrity, Option B breaks existing task links.

---

### Q3: Event Naming Convention

**Question**: Confirm event type naming for mission membership events?

**Options**:

- **A) `membership.created`, `membership.ended`** (consistent with entity type) ← RECOMMENDED
- **B) `mission.member_joined`, `mission.member_left`** (mission-specific tracking)
- **C) `group.member_joined`, `group.member_left`** (Groups dimension naming)

**Impact**: Option A is ontology-correct, Options B/C are mission-specific but create parallel naming.

---

### Q4: Eligibility Check Event (AC13)

**Question**: Should we log an event every time a member views mission details?

**Options**:

- **A) Remove AC13** (don't log passive browsing) ← RECOMMENDED
- **B) Log only when join fails due to ineligibility** (failure tracking)
- **C) Log on every view** (analytics data, but event log noise)

**Impact**: Option A reduces event log bloat, Option C enables analytics but feels surveillance-y.

---

## Closing Strategic Guidance

### Summary of Issues

**Critical (Must Fix)**:

1. ❌ Schema duplication (`missions`, `mission_members` vs `groups`, `memberships`)
2. ❌ Missing stable IDs on `groups` table (FE-M-XXXXX format)
3. ❌ Missing leave workflow columns on `memberships` table

**Moderate (Should Fix)**: 4. ⚠️ Event type naming inconsistency 5. ⚠️ Query column name mismatches (mission_id vs group_id) 6. ⚠️ AC13 creates event log noise

**Layout & Sanctuary Culture**: ✅ **APPROVED** (no changes needed)

---

### Grade Breakdown

| Dimension                  | Grade | Rationale                                                        |
| -------------------------- | ----- | ---------------------------------------------------------------- |
| Ontology Correctness       | D     | Critical: Duplicate tables violate Groups/Connections dimensions |
| Migration Readiness        | D     | Dual data models break export (60% readiness)                    |
| Sanctuary Culture          | A     | Excellent messaging and reversibility design                     |
| Layout & UX                | A     | List + detail pattern correctly applied                          |
| Event Structure            | B     | Good metadata, needs naming consistency                          |
| Implementation Feasibility | C     | Underestimates schema complexity (8 → 11-13 pts)                 |

**Overall Grade**: **D (Major Architectural Issues)**

---

### Decision Matrix

**If Product Owner**:

- **Accepts story split (Option B)**: Grade becomes **B+** (safer, ontology-correct execution)
- **Keeps single story with schema fixes (Option A)**: Grade becomes **C+** (higher risk, but deliverable)
- **Implements as written (no fixes)**: Grade remains **D** (breaks ontology, migration fails)

---

### Handoff Decision

🛑 **DO NOT IMPLEMENT AS WRITTEN**

**Required Next Steps**:

1. **Product Owner Decision**: Choose Option A (single story with fixes) or Option B (split stories)
2. **Schema Review**: Validate proposed schema changes with fullstack-developer (15 min discussion)
3. **Story Revision**: Update S4-03 story file with correct schema approach
4. **Re-Review** (Optional): 15-minute validation call after story revision (if Option A chosen)

**If Option B (Split) Chosen**: 5. **Create S4-03A story**: Mission Schema Foundation (3 points) 6. **Update S4-03B story**: Mission Joining UI (5 points, depends on S4-03A) 7. **Schedule S4-03B pre-review**: 45 minutes (reduced from 90, schema validated separately)

---

**Product Advisor Signature**: product-advisor (AI)  
**Date**: 2026-02-12  
**Review Duration**: 90 minutes  
**Next Review**: Post-revision validation (15-45 min, depends on option chosen)  
**Approval Status**: ❌ **REVISIONS REQUIRED** — Cannot approve implementation until schema issues resolved
