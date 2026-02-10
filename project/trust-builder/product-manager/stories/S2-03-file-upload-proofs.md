# Story S2-03: File Upload Proofs with SHA-256 Hashing

> **Strategic Review Complete**: See [S2-03-strategic-review-pre-implementation.md](../advisor-feedback/S2-03-strategic-review-pre-implementation.md) for dimensional analysis and migration readiness assessment (Grade: B+ → A- with adjustments applied).

## Goal

Enable members to submit file-based proofs (screenshots, documents, photos) when claiming tasks, with cryptographic hashing for immutability verification. This provides richer proof types beyond text and establishes the technical foundation for migration to Web3 storage systems.

**Strategic Adjustments Applied** (from pre-implementation review):

- ✅ Added `ipfs_cid` column for future migration readiness (92% → Web3 ready)
- ✅ Using NeonDB bytea storage for Season 0 simplicity (not R2)
- ✅ Added Content-Type validation via magic bytes (security hardening)
- ✅ Clarified `proof_type` lifecycle (set during task creation, immutable after publish)
- ✅ Added member education tooltip explaining hashing purpose
- ✅ Deferred drag-and-drop to S2-04 (ship file input button first)

## Complexity (for AI)

**Moderate**

- New file handling infrastructure (upload, storage, retrieval)
- SHA-256 hashing and metadata tracking
- Security considerations (file size, type validation, signed URLs)
- Integration with existing claim submission flow

## Ontology Mapping

- **Groups**: _(No change — tasks still belong to missions)_
- **People**: _(No change — members submit file proofs)_
- **Things**: Tasks with `proof_type = 'file'` | `proof_type = 'text_or_file'`
- **Connections**: Proofs table extended with `file_url`, `file_hash`, `file_size`, `mime_type`
- **Events**: `claim.submitted` events include file metadata (`file_hash`, `file_size`, `mime_type`)
- **Knowledge**: _(Unchanged — trust scores derive from approved claims regardless of proof type)_

## User Story (Gherkin)

```gherkin
Given a signed-in Member views an Open task with proof_type = 'file' or 'text_or_file'
When they select a file (image, PDF, or document) and submit their claim
Then the file is uploaded to secure storage
And a SHA-256 hash is computed from the file contents
And a Proof record is created with file_url, file_hash, file_size, and mime_type
And a Claim is created linking to the Proof
And a "claim.submitted" Event is logged with file metadata in the JSONB payload
And the Member receives confirmation with a masked file URL
```

## Acceptance Criteria

### Functional Behavior

- [ ] **AC1**: Member can upload files when claiming tasks with `proof_type = 'file'` or `proof_type = 'text_or_file'`
- [ ] **AC2**: Supported file types: JPEG, PNG, GIF, PDF, DOCX, TXT (expand as needed)
- [ ] **AC3**: File size limit enforced: 10MB maximum
- [ ] **AC4**: SHA-256 hash computed before storage and stored in `proofs.file_hash`
- [ ] **AC5**: File stored with unique filename (UUID or similar) to prevent collisions
- [ ] **AC6**: File retrieval uses signed URLs (time-limited, not publicly accessible)
- [ ] **AC7**: Upload progress indicator shown during file transmission
- [ ] **AC8**: Validation errors display for invalid file type or oversized files

### Ontology & Events

- [ ] **AC9**: `claim.submitted` event includes `file_hash`, `file_size`, `mime_type` in metadata
- [ ] **AC10**: Proofs table columns: `file_url` (TEXT), `file_hash` (VARCHAR(64)), `file_size` (INTEGER), `mime_type` (VARCHAR(100)), `ipfs_cid` (VARCHAR(100), nullable)
- [ ] **AC11**: Task definitions support `proof_type` enum: `'text'` | `'file'` | `'text_or_file'`
- [ ] **AC12**: `proof_type` is set during task creation (Guardian decision in S2-02 task creation UI)
- [ ] **AC13**: Existing tasks default to `proof_type = 'text'` (backward compatible)

### Security & Migration Readiness

- [ ] **AC14**: File hash is cryptographically verifiable (SHA-256)
- [ ] **AC15**: Files stored in database (NeonDB bytea) for Season 0 simplicity
- [ ] **AC16**: File access controlled via authenticated API route (not publicly accessible)
- [ ] **AC17**: File metadata (hash, size, mime_type) included in event log for audit trail
- [ ] **AC18**: Content-Type validation uses magic bytes (not just header inspection)

### Mobile & Accessibility

- [ ] **AC19**: File upload works on mobile browsers (iOS Safari, Android Chrome)
- [ ] **AC20**: File input labeled with clear instructions ("Upload proof: image, PDF, or document, max 10MB")
- [ ] **AC21**: Upload errors shown with sanctuary-aligned language (e.g., "This file is a bit too large—let's keep it under 10MB to ensure smooth sailing")
- [ ] **AC22**: Member education tooltip explains hashing: "Why do we hash your file? When you upload proof, we compute a unique 'fingerprint' (SHA-256 hash) that mathematically proves this exact file was submitted at this moment. This fingerprint becomes part of your permanent record and will enable Trust Builder to migrate your contributions to blockchain storage in the future."
- [ ] **AC23**: Usability tested with 3 youth members (age 16–25) to confirm file upload UX is clear

## Implementation Notes (AI-facing)

### Database Migration

Add columns to `proofs` table:

```sql
ALTER TABLE proofs
ADD COLUMN file_url TEXT,
ADD COLUMN file_hash VARCHAR(64),  -- SHA-256 produces 64 hex characters
ADD COLUMN file_size INTEGER,      -- bytes
ADD COLUMN mime_type VARCHAR(100),
ADD COLUMN file_data BYTEA,        -- Binary file storage for Season 0
ADD COLUMN ipfs_cid VARCHAR(100);  -- Future IPFS migration (nullable, populate in Season 1)

-- Add comment for future reference
COMMENT ON COLUMN proofs.ipfs_cid IS 'IPFS Content ID for Web3 migration. Populated when file is uploaded to IPFS in Season 1.';
```

Update `tasks` table to support `proof_type`:

```sql
ALTER TABLE tasks
ADD COLUMN proof_type VARCHAR(20) DEFAULT 'text' CHECK (proof_type IN ('text', 'file', 'text_or_file'));

-- Existing tasks default to 'text' (backward compatible)
-- proof_type is set by Guardian during task creation (S2-02)
-- proof_type is immutable after task is published (locked with other core fields)
```

### File Storage Strategy for Season 0

**Selected Approach: NeonDB Bytea Storage**

**Why this choice for Season 0 (Feb–March 2026)**:

- ✅ Zero infrastructure complexity (no R2 setup, no vendor lock-in)
- ✅ Simpler IPFS migration path (single-step: database → IPFS)
- ✅ Works with existing NeonDB setup (no new services)
- ✅ Acceptable performance for 10MB files at Season 0 scale
- ✅ Easy to export (bytea → file → IPFS in one operation)

**Trade-offs**:

- ⚠️ Postgres storage costs (~$0.10/GB vs R2 $0.015/GB)
- ⚠️ No CDN distribution (but acceptable for Season 0 traffic)
- ✅ Migration-ready: File data can be bulk exported to IPFS in Season 1

**Future Evolution Path**:

- Season 0: NeonDB bytea (simplicity)
- Season 1: Dual-write to NeonDB + IPFS (transition period)
- Season 2: IPFS primary, NeonDB cache (blockchain-ready)

**Implementation Pattern**:

```typescript
// Store file as bytea in proofs table
const fileBuffer = await file.arrayBuffer();
const fileHash = await computeSHA256(file);

await db.insert({
  file_data: Buffer.from(fileBuffer),
  file_hash: fileHash,
  file_size: file.size,
  mime_type: file.type,
});
```

**Retrieval Pattern**:

```typescript
// API route: /api/trust-builder/proofs/[id]/file
// 1. Authenticate member
// 2. Verify access (claim submitter, reviewers, guardians)
// 3. Fetch file_data from database
// 4. Return with correct Content-Type header
```

### Retroactive Update Required: S2-02 Task Creation

**Context**: AC12 requires `proof_type` to be set during task creation (Guardian decision). S2-02 (Admin Task Creation) needs a minor enhancement to support this.

**Changes Needed in S2-02 Components**:

1. **Update TaskCreateForm Component** (`src/components/trust-builder/admin/TaskCreateForm.tsx`):
   - Add "Proof Type" selection field after "Verification Method"
   - Options: "Text proof only" | "File upload only" | "Text or file (flexible)"
   - Default: "Text proof only" (backward compatible)
   - Help text: "What type of proof should members submit? File uploads enable screenshots, documents, and photos."

2. **Update Task Creation API** (`src/pages/api/trust-builder/admin/tasks/index.ts`):
   - Accept `proof_type` parameter
   - Default to `'text'` if not provided
   - Include `proof_type` in `task.created` event metadata

3. **Update Database Schema** (already handled in this story):
   - The `ALTER TABLE tasks ADD COLUMN proof_type` migration (above) handles the database side
   - Default value `'text'` ensures backward compatibility with existing tasks

**Implementation Order**:

1. Run database migration (this story)
2. Update S2-02 components to expose proof_type field
3. Test: Create a new task with `proof_type = 'file'`
4. Verify: Task appears in task list, members can claim it with file upload

**Alternative**: If updating S2-02 is deemed too complex, Guardian can manually update proof_type via SQL for now:

```sql
UPDATE tasks
SET proof_type = 'text_or_file'
WHERE task_id = 'task-uuid-here' AND state = 'draft';
-- Only works on draft tasks (published tasks immutable)
```

### Tech Stack Integration

1. **Upload Component**: Extend `src/components/trust-builder/ClaimSubmissionForm.tsx`
   - Add **file input button** (defer drag-and-drop to S2-04 for simplicity)
   - Show upload progress bar during file processing
   - Display selected filename and size before submission
   - Add **education tooltip** next to upload button (see AC22 for copy)

2. **API Route**: Create `src/pages/api/trust-builder/claims/upload.ts`
   - Accept multipart/form-data
   - **Validate Content-Type using magic bytes** (use `file-type` npm package)
   - Validate file size (10MB max)
   - Compute SHA-256 hash using Web Crypto API: `crypto.subtle.digest('SHA-256', buffer)`
   - Store file as bytea in database (no external storage)
   - Return file metadata (hash, size, mime_type)

3. **Claim Submission API**: Extend `src/pages/api/trust-builder/claims/index.ts`
   - Accept either `proof_text` (existing) or `proof_file_url` + `file_hash` + `file_size` + `mime_type`
   - Insert into `proofs` table with all metadata
   - Log `claim.submitted` event with file metadata in `metadata` JSONB

4. **File Retrieval API**: Create `src/pages/api/trust-builder/proofs/[id]/file.ts`
   - Check member authentication
   - Check member has access to view the proof (claim submitter, reviewers, guardians)
   - Fetch file_data (bytea) from database
   - Return file with correct Content-Type header and Content-Disposition: inline

5. **Content-Type Security Validation**

   ```typescript
   import { fileTypeFromBuffer } from 'file-type';

   // Validate actual file type matches declared MIME type
   const detectedType = await fileTypeFromBuffer(buffer);
   if (!detectedType || detectedType.mime !== uploadedMimeType) {
     throw new Error('File type mismatch - security check failed');
   }
   ```

### SHA-256 Hashing Pattern

```typescript
// src/lib/crypto/hash.ts
export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
```

### Reuse Guidance

- **Claim Submission Flow**: Extend existing `ClaimSubmissionForm` component
- **Event Logging**: Use existing `logEvent()` utility from S1-01
- **Transaction Pattern**: Use `withTransaction()` for atomic claim + proof + event creation
- **Error Handling**: Reuse sanctuary-aligned error messages from S2-02

### Migration Readiness Notes

- File hashes enable verification when migrating to IPFS/Arweave
- `file_hash` can be compared against IPFS CIDv1 hash to prove file integrity
- Event log captures hash at submission time for tamper detection
- Future story: Add `ipfs_cid` column and sync existing files to IPFS

## Definition of Done (DoD)

- [ ] All 23 acceptance criteria met (including strategic review requirements)
- [ ] Database migration script created and tested (add columns to `proofs` including `ipfs_cid` and `file_data` bytea)
- [ ] Database migration includes `proof_type` column on `tasks` table with DEFAULT 'text'
- [ ] File upload works end-to-end (upload → hash → store in DB → retrieve from DB)
- [ ] SHA-256 hashes stored and logged in events
- [ ] Content-Type validation using magic bytes (security requirement)
- [ ] File type and size validation functional
- [ ] Member education tooltip implemented (explains hashing purpose)
- [ ] Mobile-responsive upload UI (tested iOS Safari, Android Chrome)
- [ ] Usability testing completed with 3 youth members (AC23)
- [ ] QA report: PASS
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Retro file created with lessons learned
- [ ] Security considerations documented (bytea storage, Content-Type validation, access control)

## Security Considerations

1. **File Type Validation**:
   - Whitelist-only approach (JPEG, PNG, GIF, PDF, DOCX, TXT)
   - **Magic byte validation** using `file-type` package (can't be spoofed)
   - Reject files where declared MIME type doesn't match magic bytes

2. **File Size Limits**: Hard limit at 10MB to prevent DoS attacks

3. **Filename Sanitization**: Store only in database with proof_id reference, never expose original filename

4. **Access Control**:
   - Authenticated API route checks member session
   - Role-based access: claim submitter, assigned reviewers, guardians only
   - No public file URLs

5. **Storage Isolation**: Files stored as bytea in database (not in filesystem or public URLs)

6. **Hash Verification**:
   - SHA-256 computed at upload time
   - Stored in both proofs table and events log (dual verification)
   - Future reviewers can recompute hash to verify file integrity

7. **Database Security**:
   - No direct database access from client
   - All file access through authenticated API routes
   - File data never serialized to JSON responses (streamed as binary)

## Future Enhancements (Out of Scope for S2-03)

- **Virus Scanning**: Integrate ClamAV or similar before storing files
- **Image Thumbnails**: Generate previews for image files
- **IPFS Migration**: Sync existing files to IPFS and store CIDv1 in `proofs` table
- **Bulk Export**: Include file downloads in Season 0 → Web3 migration export
- **File Deduplication**: Detect duplicate files via hash before uploading

---

**Created by**: Product Owner  
**Date**: 2026-02-10  
**Sprint**: Sprint 2  
**Story Points**: 7  
**Dependencies**: S1-04 (Claims) — Complete ✅
