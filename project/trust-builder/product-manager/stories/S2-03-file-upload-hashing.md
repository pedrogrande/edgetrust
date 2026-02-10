# Story: File Upload Proofs with SHA-256 Hashing

## Goal

Enable file uploads as proof artifacts with SHA-256 hashing and immutable event logging.

## Complexity (for AI)

Complex

## Ontology Mapping

- Groups: None
- People: Member submits proof
- Things: Proof artifact (file)
- Connections: Proof links Claim to Criterion
- Events: `proof.submitted` (new) and `trust.updated` metadata includes hashes
- Knowledge: None

## User Story (Gherkin)

Given a task criterion requires a file upload
When a member submits a claim with a file proof
Then the file is uploaded securely
And a SHA-256 hash is generated before storage
And the hash is stored in the proof record and event log

## Acceptance Criteria

- [ ] File upload is available for criteria marked `proof_type = 'file'`
- [ ] SHA-256 hash is generated before storage and saved to `proofs.content_hash`
- [ ] Proof file is stored in private storage and accessed via signed URLs
- [ ] A `proof.submitted` event is logged with hash metadata
- [ ] File size limit is enforced (max 10MB)
- [ ] Allowed types are restricted (PDF, JPG, PNG, MP4)
- [ ] Errors are sanctuary-aligned and actionable
- [ ] Mobile and basic accessibility checks pass

## Implementation Notes (AI-facing)

- Use Cloudflare R2 or equivalent storage (define in env vars).
- Add API endpoint for upload: `POST /api/trust-builder/proofs/upload`.
- Update ClaimForm to render file input for file criteria.
- Store file metadata (name, size, mime type) in `proofs` table if not already present.
- Add `EventType.PROOF_SUBMITTED` (new enum value).

## Definition of Done (DoD)

- All acceptance criteria met
- QA report: PASS
- Product Advisor review: Grade B+ or higher
- Retro file created in `/trust-builder/retros/`
