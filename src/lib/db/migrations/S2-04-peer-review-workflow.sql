-- Migration: S2-04 Peer Review Workflow
-- Adds revision tracking, review timeouts, and indexes for reviewer queue
-- Date: 2026-02-10

-- Add revision count tracking (max 2 revisions allowed)
ALTER TABLE claims 
  ADD COLUMN revision_count INTEGER DEFAULT 0 CHECK (revision_count <= 2);

-- Add review deadline for timeout mechanism (72-hour limit)
ALTER TABLE claims 
  ADD COLUMN review_deadline TIMESTAMPTZ;

-- Create index for timeout query optimization
CREATE INDEX idx_claims_review_timeout ON claims(status, review_deadline) 
  WHERE status = 'under_review';

-- Create index for reviewer queue queries (performance)
CREATE INDEX idx_claims_pending_review ON claims(status, submitted_at)
  WHERE status = 'submitted';

-- Comments for documentation
COMMENT ON COLUMN claims.revision_count IS 'Number of revision cycles (max 2). Third rejection escalates to admin.';
COMMENT ON COLUMN claims.review_deadline IS 'Auto-release deadline (NOW() + 72 hours). NULL if not under review.';
