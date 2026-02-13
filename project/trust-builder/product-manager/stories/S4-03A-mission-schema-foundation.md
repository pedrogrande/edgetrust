# Story S4-03A: Mission Schema Foundation

**Epic**: Foundation & Infrastructure - Mission Lifecycle  
**Priority**: HIGH (unblocks S4-03B UI implementation)  
**Sprint**: 4  
**Estimated Points**: 3  
**Complexity**: Simple  
**Assigned To**: fullstack-developer  
**Strategic Review**: Optional (schema validation in strategic pre-review already completed)

---

## Goal

Enhance existing `groups` and `memberships` tables to support mission joining workflow. Add stable identifiers (FE-M-XXXXX format), eligibility thresholds, and leave tracking. This establishes the schema foundation for S4-03B (Mission Joining UI) while maintaining ONE ontology correctness.

**Value for Organization**: Ontology-aligned schema, stable IDs for migration readiness, leave workflow support  
**Value for S4-03B**: Clean foundation with zero schema uncertainty  
**Value for Migration**: 90%+ readiness (stable IDs on all groups, portable membership events)

---

## Complexity (for AI)

**Simple** (4-6 hours)

**Rationale**:

- ALTER TABLE operations only (no new tables)
- Backfill existing mission with stable ID
- Create 2 additional seed missions
- Write helper functions for mission queries
- No UI work, pure schema + SQL

**Why Not Complex**:

- Uses existing `groups` table (no schema design from scratch)
- Uses existing `memberships` table (no new Connection entity)
- Seed data pattern established in prior stories

---

## Context: Strategic Review Decision

This story was created by splitting S4-03 (Mission Joining Workflow) per product-advisor strategic review. The original story proposed duplicate tables (`missions`, `mission_members`) that violated ONE ontology by fragmenting the Groups and Connections dimensions.

**Strategic Review Finding**: Use existing `groups` (with `type='mission'`) and `memberships` tables instead of creating duplicates.

**Benefits of Split**:

- Schema changes validated separately from UI
- Lower risk (no schema uncertainty during UI implementation)
- Ontology correctness maintained (all Groups in one table, all Connections in one table)

---

## Ontology Mapping

### Primary Dimensions

- **Groups**: Missions as `groups` entities with `type='mission'` (existing pattern)
- **Connections**: Mission membership as `memberships` (existing pattern, enhanced with leave tracking)
- **Knowledge**: Configuration values (min_trust_score thresholds per mission)

### Secondary Dimensions

- **Things**: Mission status remains in `groups.status` (active/archived)
- **Events**: No new event types (schema-only story)

### Data Impact

**Before** (current schema):

- `groups` table: No stable IDs (FE-M-XXXXX), no eligibility thresholds
- `memberships` table: No leave tracking (can't track "left" vs "active" memberships)

**After** (this story):

- `groups` table: Stable IDs for all groups, eligibility thresholds for missions
- `memberships` table: Leave timestamps and status tracking

---

## Acceptance Criteria

### Database Schema Changes

- [ ] **AC1**: `groups` table enhanced with columns:
  - `stable_id TEXT UNIQUE` (FE-G-XXXXX for colony, FE-M-XXXXX for missions)
  - `min_trust_score INTEGER DEFAULT 0` (eligibility threshold for missions, NULL or 0 for colony)

- [ ] **AC2**: `memberships` table enhanced with columns:
  - `left_at TIMESTAMPTZ` (NULL for active memberships)
  - `status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left'))`

- [ ] **AC3**: Unique constraint updated on `memberships`:
  - Drop existing PRIMARY KEY (member_id, group_id)
  - Add partial unique index: `(member_id, group_id) WHERE status='active'`
  - Allows re-joining after leaving (same member_id + group_id with status='left')

### Data Migration (Backfill Existing)

- [ ] **AC4**: Existing Colony group backfilled:
  - `stable_id = 'FE-G-00001'` (G for Group, root container)
  - `min_trust_score = NULL` (colony membership is not threshold-gated)

- [ ] **AC5**: Existing "Webinar Series Season 0" mission backfilled:
  - `stable_id = 'FE-M-00001'` (M for Mission)
  - `min_trust_score = 0` (starter mission, everyone eligible)

### Seed Data (New Missions)

- [ ] **AC6**: Two additional missions seeded:
  - **"Content Creation"**: `stable_id = 'FE-M-00002'`, `min_trust_score = 250`, `description = "Create educational content..."`
  - **"Platform Development"**: `stable_id = 'FE-M-00003'`, `min_trust_score = 500`, `description = "Contribute to Trust Builder development..."`

### Helper Functions

- [ ] **AC7**: SQL helper function `get_active_missions()` created:
  - Returns all groups WHERE type='mission' AND status='active'
  - Includes member counts, task counts, eligibility checks

- [ ] **AC8**: SQL helper function `get_mission_members(group_id)` created:
  - Returns all active memberships for a given mission
  - Filters WHERE status='active'

### Validation Queries

- [ ] **AC9**: Validation query confirms no duplicate stable IDs
- [ ] **AC10**: Validation query confirms all groups have stable_id (no NULLs)
- [ ] **AC11**: Validation query confirms memberships unique constraint works (test re-join scenario)

---

## Implementation Notes (AI-facing)

### Migration SQL (`src/lib/db/migrations/009_mission_schema_foundation.sql`)

```sql
-- ============================================================================
-- S4-03A: Mission Schema Foundation
-- Enhance existing groups and memberships tables for mission joining workflow
-- ============================================================================

-- Step 1: Add stable_id and min_trust_score to groups table
ALTER TABLE groups
ADD COLUMN stable_id TEXT UNIQUE,
ADD COLUMN min_trust_score INTEGER DEFAULT 0;

-- Validate: stable_id is unique and not null (will enforce below)
COMMENT ON COLUMN groups.stable_id IS 'Stable identifier for blockchain migration. Format: FE-G-XXXXX (groups/colony) or FE-M-XXXXX (missions)';
COMMENT ON COLUMN groups.min_trust_score IS 'Trust Score threshold required to join this mission. NULL or 0 for colony (no threshold)';

-- Step 2: Backfill existing groups with stable IDs
UPDATE groups
SET stable_id = 'FE-G-00001', min_trust_score = NULL
WHERE type = 'colony' AND name = 'Future''s Edge';

UPDATE groups
SET stable_id = 'FE-M-00001', min_trust_score = 0
WHERE type = 'mission' AND name = 'Webinar Series Season 0';

-- Validate: All existing groups now have stable_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM groups WHERE stable_id IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some groups still have NULL stable_id';
  END IF;
END $$;

-- Step 3: Make stable_id NOT NULL (after backfill)
ALTER TABLE groups ALTER COLUMN stable_id SET NOT NULL;

-- Step 4: Add leave tracking to memberships table
ALTER TABLE memberships
ADD COLUMN left_at TIMESTAMPTZ,
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left'));

-- Step 5: Update unique constraint on memberships
-- Drop old primary key constraint
ALTER TABLE memberships DROP CONSTRAINT memberships_pkey;

-- Add partial unique index (only active memberships must be unique)
CREATE UNIQUE INDEX idx_memberships_active_unique
ON memberships (member_id, group_id) WHERE status = 'active';

-- Add composite index for queries
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_group_active ON memberships(group_id, status) WHERE status = 'active';

-- Step 6: Seed additional missions
INSERT INTO groups (id, name, type, description, status, parent_group_id, stable_id, min_trust_score)
VALUES
  (
    '20000000-0000-0000-0000-000000000002',
    'Content Creation',
    'mission',
    'Create educational content for Future''s Edge. Write articles, produce videos, design graphics to share knowledge and inspire others.',
    'active',
    '10000000-0000-0000-0000-000000000001', -- Parent: Colony
    'FE-M-00002',
    250
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Platform Development',
    'mission',
    'Contribute to Trust Builder development. Write code, create tests, review pull requests, and help build the platform.',
    'active',
    '10000000-0000-0000-0000-000000000001', -- Parent: Colony
    'FE-M-00003',
    500
  )
ON CONFLICT (id) DO NOTHING;

-- Step 7: Create helper function for active missions query
CREATE OR REPLACE FUNCTION get_active_missions(member_uuid UUID, member_trust_score INTEGER)
RETURNS TABLE (
  id UUID,
  stable_id TEXT,
  name VARCHAR(255),
  description TEXT,
  min_trust_score INTEGER,
  member_count BIGINT,
  task_count BIGINT,
  is_member BOOLEAN,
  is_eligible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.stable_id,
    g.name,
    g.description,
    g.min_trust_score,
    (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'active') AS member_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.group_id = g.id AND t.state = 'open') AS task_count,
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.group_id = g.id AND m.member_id = member_uuid AND m.status = 'active'
    ) AS is_member,
    (member_trust_score >= COALESCE(g.min_trust_score, 0)) AS is_eligible
  FROM groups g
  WHERE g.type = 'mission' AND g.status = 'active'
  ORDER BY g.min_trust_score ASC, g.name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_missions IS 'S4-03A helper: Returns all active missions with member counts, task counts, and eligibility for a given member.';

-- Step 8: Create helper function for mission members query
CREATE OR REPLACE FUNCTION get_mission_members(mission_uuid UUID)
RETURNS TABLE (
  member_id UUID,
  email VARCHAR(255),
  member_stable_id VARCHAR(20),
  display_name VARCHAR(255),
  role VARCHAR(50),
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.email,
    m.member_id AS member_stable_id,
    m.display_name,
    mb.role,
    mb.joined_at
  FROM memberships mb
  JOIN members m ON mb.member_id = m.id
  WHERE mb.group_id = mission_uuid AND mb.status = 'active'
  ORDER BY mb.joined_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_mission_members IS 'S4-03A helper: Returns all active members of a mission with their profiles and join dates.';

-- ============================================================================
-- Validation Queries (Run these to verify migration success)
-- ============================================================================

-- Validation 1: All groups have stable_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM groups WHERE stable_id IS NULL) THEN
    RAISE EXCEPTION 'Validation failed: groups.stable_id contains NULL values';
  END IF;
  RAISE NOTICE 'Validation 1 PASS: All groups have stable_id';
END $$;

-- Validation 2: No duplicate stable_ids
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (SELECT stable_id, COUNT(*) as cnt FROM groups GROUP BY stable_id HAVING COUNT(*) > 1) dupes;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: Duplicate stable_ids found';
  END IF;
  RAISE NOTICE 'Validation 2 PASS: No duplicate stable_ids';
END $$;

-- Validation 3: Memberships unique constraint allows re-join
DO $$
DECLARE
  test_member_id UUID := '00000000-0000-0000-0000-000000000000';
  test_mission_id UUID := '20000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert active membership
  INSERT INTO memberships (member_id, group_id, role, joined_at, status)
  VALUES (test_member_id, test_mission_id, 'Member', NOW(), 'active');

  -- Try to insert duplicate active membership (should fail)
  BEGIN
    INSERT INTO memberships (member_id, group_id, role, joined_at, status)
    VALUES (test_member_id, test_mission_id, 'Member', NOW(), 'active');
    RAISE EXCEPTION 'Validation failed: Duplicate active membership allowed';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Validation 3a PASS: Duplicate active membership prevented';
  END;

  -- Mark as left
  UPDATE memberships
  SET status = 'left', left_at = NOW()
  WHERE member_id = test_member_id AND group_id = test_mission_id AND status = 'active';

  -- Insert same membership again (should succeed, status='active')
  INSERT INTO memberships (member_id, group_id, role, joined_at, status)
  VALUES (test_member_id, test_mission_id, 'Member', NOW(), 'active');

  RAISE NOTICE 'Validation 3b PASS: Re-join after leaving allowed';

  -- Cleanup test data
  DELETE FROM memberships
  WHERE member_id = test_member_id AND group_id = test_mission_id;
END $$;

-- Validation 4: Helper functions work
DO $$
DECLARE
  mission_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mission_count
  FROM get_active_missions('00000000-0000-0000-0000-000000000000'::UUID, 0);

  IF mission_count <> 3 THEN
    RAISE EXCEPTION 'Validation failed: Expected 3 active missions, got %', mission_count;
  END IF;
  RAISE NOTICE 'Validation 4a PASS: get_active_missions() returns 3 missions';

  SELECT COUNT(*) INTO member_count
  FROM get_mission_members('20000000-0000-0000-0000-000000000001'::UUID);

  RAISE NOTICE 'Validation 4b PASS: get_mission_members() executed successfully (% members)', member_count;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON TABLE groups IS 'ONE Ontology Groups dimension. Includes Colony (root) and Missions (organizational containers). All groups have stable_id for blockchain migration.';
COMMENT ON TABLE memberships IS 'ONE Ontology Connections dimension. Member-to-group relationships with leave tracking (status: active/left).';
```

---

## Testing & Validation

### Manual SQL Testing (Required)

Run these queries in `psql` or database client to validate migration:

**Test 1: All groups have stable_id**

```sql
SELECT stable_id, name, type, min_trust_score FROM groups ORDER BY stable_id;
```

Expected: 4 rows (1 colony + 3 missions), all with stable_id

**Test 2: Active missions query**

```sql
SELECT * FROM get_active_missions(
  '00000000-0000-0000-0000-000000000000'::UUID, -- system member
  0 -- 0 Trust Score
);
```

Expected: 3 missions (Webinar: eligible, Content: not eligible, Platform: not eligible)

**Test 3: Re-join scenario**

```sql
-- Join mission
INSERT INTO memberships (member_id, group_id, role, joined_at, status)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000001',
  'Member',
  NOW(),
  'active'
);

-- Leave mission
UPDATE memberships
SET status = 'left', left_at = NOW()
WHERE member_id = '00000000-0000-0000-0000-000000000000'
AND group_id = '20000000-0000-0000-0000-000000000001';

-- Re-join (should succeed)
INSERT INTO memberships (member_id, group_id, role, joined_at, status)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-0000-0000-000000000001',
  'Member',
  NOW(),
  'active'
);

-- Cleanup
DELETE FROM memberships
WHERE member_id = '00000000-0000-0000-0000-000000000000'
AND group_id = '20000000-0000-0000-0000-000000000001';
```

Expected: All operations succeed, no unique constraint violations

---

## Definition of Done (DoD)

- [ ] All acceptance criteria met (AC1-AC11)
- [ ] Migration SQL applied successfully (009_mission_schema_foundation.sql)
- [ ] All 4 validation queries PASS
- [ ] Manual SQL testing completed (3 test scenarios)
- [ ] Helper functions return correct results
- [ ] No NULL stable_ids in groups table
- [ ] Re-join scenario works (leave → join again)
- [ ] S4-03B unblocked (schema ready for UI implementation)
- [ ] Migration readiness: 90%+ (stable IDs on all groups)
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-03A-mission-schema-foundation-retro.md`

---

## Risk Assessment

**Low Risk** story:

- ALTER TABLE operations well-tested (S3-04 config table pattern)
- Backfill strategy proven (existing data preserved)
- Validation queries catch issues before S4-03B starts
- No UI work (no layout/responsive concerns)

**Potential Issues**:

1. **Unique constraint conflict**: If any members already in memberships table
   - **Mitigation**: Validation query catches this, manual cleanup if needed
2. **Stable ID conflicts**: If manually created groups exist
   - **Mitigation**: Migration checks for duplicates, fails loudly if found

3. **Helper function performance**: Complex queries in functions
   - **Mitigation**: Functions are STABLE (cached), query planner optimizes

**Fallback Plan**: If migration fails, revert with:

```sql
-- Rollback script (if needed)
ALTER TABLE groups DROP COLUMN stable_id, DROP COLUMN min_trust_score;
ALTER TABLE memberships DROP COLUMN left_at, DROP COLUMN status;
-- Restore original primary key
-- DELETE new missions
```

---

## Handoff to S4-03B

**What S4-03B Gets**:

- ✅ `groups` table with stable_id + min_trust_score
- ✅ `memberships` table with left_at + status tracking
- ✅ Helper functions for queries (no complex SQL in UI code)
- ✅ 3 seeded missions ready for browsing
- ✅ Re-join workflow validated (schema supports it)

**What S4-03B Builds**:

- Mission browsing UI (list + detail)
- Join/leave API routes (using enhanced schema)
- Event logging (membership.created, membership.ended)
- Mobile responsive testing

**No Schema Uncertainty**: S4-03B can implement with confidence that schema is correct and tested.

---

**Story Created**: 2026-02-12  
**Ready for Implementation**: ✅ YES (strategic review approved schema approach)  
**Prerequisites**: None (foundational, no dependencies)  
**Blocks**: S4-03B (Mission Joining UI depends on this)  
**Strategic Review**: Completed (see S4-03-PRE-IMPLEMENTATION-STRATEGIC-REVIEW.md)
