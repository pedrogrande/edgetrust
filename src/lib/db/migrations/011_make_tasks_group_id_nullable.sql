-- Migration 011: Make tasks.group_id Nullable for Optional Missions
-- Story: S4-03C (Schema Foundation for Optional Missions)
-- Date: 2026-02-13
-- Purpose: Support both mission-scoped and general tasks

-- ============================================================================
-- CRITICAL FIX: Make group_id nullable for backward compatibility
-- ============================================================================

-- Step 1: Drop NOT NULL constraint on tasks.group_id
ALTER TABLE tasks ALTER COLUMN group_id DROP NOT NULL;

-- Step 2: Add partial index for efficient mission task queries
-- Only indexes tasks that ARE part of missions (where group_id IS NOT NULL)
CREATE INDEX idx_tasks_group_null ON tasks(group_id) WHERE group_id IS NOT NULL;

-- Step 3: Add index for general tasks (group_id IS NULL)
-- Helps with queries that specifically look for non-mission tasks
CREATE INDEX idx_tasks_general ON tasks(state) WHERE group_id IS NULL AND state = 'open';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify migration succeeded
DO $$
BEGIN
  -- Check that group_id is now nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'group_id'
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'SUCCESS: tasks.group_id is now nullable';
  ELSE
    RAISE EXCEPTION 'FAILED: tasks.group_id is still NOT NULL';
  END IF;

  -- Check that new indexes exist
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tasks'
    AND indexname = 'idx_tasks_group_null'
  ) THEN
    RAISE NOTICE 'SUCCESS: idx_tasks_group_null created';
  ELSE
    RAISE EXCEPTION 'FAILED: idx_tasks_group_null not created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tasks'
    AND indexname = 'idx_tasks_general'
  ) THEN
    RAISE NOTICE 'SUCCESS: idx_tasks_general created';
  ELSE
    RAISE EXCEPTION 'FAILED: idx_tasks_general not created';
  END IF;
END $$;

-- ============================================================================
-- BACKWARD COMPATIBILITY NOTES
-- ============================================================================

-- This migration preserves all existing functionality:
-- 1. Existing mission tasks (group_id NOT NULL) continue to work
-- 2. New mission tasks can be created with group_id set
-- 3. General tasks can be created with group_id = NULL
-- 4. Existing queries that filter by group_id are unaffected
-- 5. New partial indexes improve query performance for both cases

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- 1. Assign all NULL group_id tasks to a default "General Tasks" group
-- 2. ALTER TABLE tasks ALTER COLUMN group_id SET NOT NULL;
-- 3. DROP INDEX idx_tasks_group_null;
-- 4. DROP INDEX idx_tasks_general;
