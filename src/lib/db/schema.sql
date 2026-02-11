-- Trust Builder Database Schema
-- ONE Ontology: 6-Dimension Mapping
-- Migration-ready: UUIDs, append-only events, derived trust scores

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- GROUPS DIMENSION: Colony and Mission Containers
-- ============================================================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('colony', 'mission')),
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  parent_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_type ON groups(type);
CREATE INDEX idx_groups_parent ON groups(parent_group_id);
CREATE INDEX idx_groups_status ON groups(status);

-- ============================================================================
-- PEOPLE DIMENSION: Members with Portable IDs
-- ============================================================================

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  member_id VARCHAR(20) NOT NULL UNIQUE, -- FE-M-XXXXX format
  display_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'explorer' CHECK (role IN ('explorer', 'contributor', 'steward', 'guardian')),
  trust_score_cached INTEGER NOT NULL DEFAULT 0, -- Cache only — event-derived is authoritative
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_member_id ON members(member_id);
CREATE INDEX idx_members_role ON members(role);

-- ============================================================================
-- THINGS DIMENSION: Tasks (Contracts)
-- ============================================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  rationale TEXT,
  state VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'open', 'in_progress', 'complete', 'expired', 'cancelled')),
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('simple', 'complex')),
  verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN ('auto_approve', 'peer_review', 'admin_review')),
  max_completions INTEGER, -- NULL = unlimited
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_group ON tasks(group_id);
CREATE INDEX idx_tasks_state ON tasks(state);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_published_at ON tasks(published_at);

-- ============================================================================
-- THINGS DIMENSION: Task Acceptance Criteria
-- ============================================================================

CREATE TABLE criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  proof_type VARCHAR(50) NOT NULL CHECK (proof_type IN ('text', 'url', 'file')),
  verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN ('auto_approve', 'peer_review', 'admin_review')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_criteria_task ON criteria(task_id);
CREATE INDEX idx_criteria_sort ON criteria(task_id, sort_order);

-- ============================================================================
-- THINGS DIMENSION: Incentive Dimensions (5 Canonical Types)
-- ============================================================================

CREATE TABLE incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONNECTIONS DIMENSION: Task-to-Incentive Point Allocations
-- ============================================================================

CREATE TABLE task_incentives (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  incentive_id UUID NOT NULL REFERENCES incentives(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, incentive_id)
);

CREATE INDEX idx_task_incentives_task ON task_incentives(task_id);
CREATE INDEX idx_task_incentives_incentive ON task_incentives(incentive_id);

-- ============================================================================
-- CONNECTIONS DIMENSION: Member-to-Mission Memberships
-- ============================================================================

CREATE TABLE memberships (
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, group_id)
);

CREATE INDEX idx_memberships_member ON memberships(member_id);
CREATE INDEX idx_memberships_group ON memberships(group_id);

-- ============================================================================
-- CONNECTIONS DIMENSION: Task Completion Claims
-- ============================================================================

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'revision_requested', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES members(id),
  review_notes TEXT,
  CONSTRAINT no_duplicate_claims UNIQUE (member_id, task_id)
);

CREATE INDEX idx_claims_member ON claims(member_id);
CREATE INDEX idx_claims_task ON claims(task_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_reviewer ON claims(reviewer_id);

-- ============================================================================
-- CONNECTIONS DIMENSION: Evidence per Criterion
-- ============================================================================

CREATE TABLE proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  content_text TEXT,
  content_url TEXT,
  content_hash VARCHAR(64), -- SHA-256 for S2 file uploads
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proof_must_have_content CHECK (
    content_text IS NOT NULL OR content_url IS NOT NULL
  )
);

CREATE INDEX idx_proofs_claim ON proofs(claim_id);
CREATE INDEX idx_proofs_criterion ON proofs(criterion_id);

-- ============================================================================
-- EVENTS DIMENSION: Immutable Audit Ledger (Genesis Trail)
-- ============================================================================

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID NOT NULL REFERENCES members(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT event_type_format CHECK (event_type ~* '^[a-z]+\.[a-z_]+$')
);

CREATE INDEX idx_events_actor ON events(actor_id);
CREATE INDEX idx_events_entity ON events(entity_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- S3-02: Composite index for Trust Score derivation queries
-- Critical for dashboard performance (AC26: <2s load time)
-- Enables O(log n) lookups instead of O(n) table scans
CREATE INDEX idx_events_claim_approved_member 
ON events (event_type, ((metadata->>'member_id')::uuid))
WHERE event_type = 'claim.approved';

-- ============================================================================
-- SECURITY: Append-Only Event Ledger
-- ============================================================================

-- Application user should NOT have UPDATE or DELETE permissions on events table
-- This enforcement will be configured at the database role level:
-- 
-- REVOKE UPDATE, DELETE ON events FROM app_user;
-- GRANT INSERT, SELECT ON events TO app_user;
-- 
-- For S1, this is documented but not enforced. S1-06 qa-engineer will validate.

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

COMMENT ON TABLE events IS 'Immutable append-only ledger. UPDATE and DELETE should be REVOKED at role level.';
COMMENT ON COLUMN members.trust_score_cached IS 'Cache only — event-derived score is authoritative for migration.';
COMMENT ON COLUMN tasks.published_at IS 'Once set, core task fields become immutable (quasi-smart contract).';
