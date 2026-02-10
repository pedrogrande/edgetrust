-- Migration: S2-03 File Upload Proofs with SHA-256 Hashing
-- Story: Enable file-based proofs with cryptographic hashing for immutability
-- Date: 2026-02-10
-- Migration Readiness: 92% (includes ipfs_cid for future Web3 transition)

-- ============================================================================
-- Extend PROOFS table for file storage
-- ============================================================================

ALTER TABLE proofs
ADD COLUMN file_url TEXT,                  -- Local reference (e.g., /api/trust-builder/proofs/[id]/file)
ADD COLUMN file_hash VARCHAR(64),          -- SHA-256 hash (64 hex characters)
ADD COLUMN file_size INTEGER,              -- File size in bytes
ADD COLUMN mime_type VARCHAR(100),         -- Content type (image/png, application/pdf, etc.)
ADD COLUMN file_data BYTEA,                -- Binary file storage for Season 0
ADD COLUMN ipfs_cid VARCHAR(100);          -- Future IPFS Content ID (nullable, populate in Season 1)

-- Add comment for future IPFS migration
COMMENT ON COLUMN proofs.ipfs_cid IS 'IPFS Content ID for Web3 migration. Populated when file is uploaded to IPFS in Season 1.';
COMMENT ON COLUMN proofs.file_data IS 'Binary file storage for Season 0. Will be migrated to IPFS in Season 1.';
COMMENT ON COLUMN proofs.file_hash IS 'SHA-256 hash for file integrity verification. Used to validate IPFS upload during migration.';

-- Update constraint to allow file proofs
ALTER TABLE proofs
DROP CONSTRAINT IF EXISTS proof_must_have_content,
ADD CONSTRAINT proof_must_have_content CHECK (
  content_text IS NOT NULL OR 
  content_url IS NOT NULL OR 
  file_data IS NOT NULL
);

-- ============================================================================
-- Extend TASKS table for proof_type selection
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN proof_type VARCHAR(20) NOT NULL DEFAULT 'text' 
  CHECK (proof_type IN ('text', 'file', 'text_or_file'));

COMMENT ON COLUMN tasks.proof_type IS 'Type of proof required: text (default), file (screenshot/PDF/doc), or text_or_file (flexible). Set by Guardian during task creation. Immutable after task is published.';

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- Existing tasks default to proof_type = 'text' (backward compatible)
-- Guardian will set proof_type during task creation (S2-02 update)
-- proof_type is immutable after task is published (enforced in API)
-- File data stored as bytea in Season 0 for simplicity
-- IPFS migration path: bytea → file → IPFS upload → populate ipfs_cid

-- Security Notes:
-- - file_data stored in database (not filesystem) for access control
-- - File retrieval requires authentication (API route validates session)
-- - Content-Type validated using magic bytes (not just headers)
-- - File size limited to 10MB (enforced in API)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
