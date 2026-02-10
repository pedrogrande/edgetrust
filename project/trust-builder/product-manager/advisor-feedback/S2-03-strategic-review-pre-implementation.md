# Strategic Review: S2-03 File Upload Proofs with SHA-256 Hashing

**Story**: S2-03 — File Upload Proofs  
**Reviewer**: product-advisor  
**Review Date**: 2026-02-10  
**Review Type**: Pre-implementation strategic assessment

---

## Summary Assessment

This story is **architecturally sound** with excellent migration readiness (90%+). The SHA-256 hashing pattern correctly anticipates Web3 storage requirements, and the event log design maintains the high standard established in S2-02. However, there are **strategic concerns** around complexity management, storage vendor lock-in, and member education that require attention before implementation.

**Primary Strengths**:

- Superior migration readiness via cryptographic hashing
- Clean ontology mapping (Connections + Events)
- Strong security posture (signed URLs, type validation, size limits)

**Primary Risks**:

- Storage infrastructure introduces new failure modes
- Member confusion about "why hashing matters" before blockchain context is visible
- R2 vendor dependency may complicate future IPFS migration

---

## Dimensional Analysis

### Groups: A

**Finding**: No changes to Groups dimension — tasks still belong to missions. The addition of `proof_type` to tasks table correctly extends the Thing schema without disrupting Group hierarchies.

**Recommendation**: None. Groups dimension is stable.

---

### People: A-

**Finding**: Members gain new capability (file upload) but no schema changes to `members` table. The story correctly treats file upload as a **capability extension**, not an identity change.

**Minor Concern**: No discussion of role-based file size limits (e.g., Explorers: 5MB, Contributors: 10MB, Stewards: 50MB). This could be a future optimization but isn't critical for S2-03.

**Recommendation**: Document file upload as a universal capability (no role gates) in the implementation. This aligns with sanctuary values (equal access for all members).

---

### Things: B+

**Finding**: The addition of `proof_type` enum (`'text'` | `'file'` | `'text_or_file'`) correctly extends tasks. However, the story lacks clarity on **how** tasks acquire this property.

**Gaps Identified**:

1. **Task Creation Flow**: Does Guardian choose `proof_type` during task creation (S2-02)? If so, S2-02 needs retroactive update.
2. **Seed Data**: Do existing tasks default to `proof_type = 'text'`? Story says "DEFAULT 'text'" but doesn't address migration for existing tasks.
3. **Task Editing**: Can proof_type be changed after publish? (Likely no, per immutability rules, but not stated.)

**Recommendation**:

- Clarify in S2-03 that `proof_type` is set during task creation (Guardian decision)
- Add migration note: Existing tasks default to `'text'` (backward compatible)
- Confirm `proof_type` is immutable after publish (lock with other core fields)

**Grade Justification**: Loses points for incomplete specification of proof_type lifecycle. Otherwise solid.

---

### Connections: A

**Finding**: The extension of the `proofs` table is **textbook ontology modeling**:

- `file_url` (Thing reference)
- `file_hash` (immutability anchor)
- `file_size` (resource metadata)
- `mime_type` (type safety)

This correctly models file proofs as **connection metadata** between Claims and stored artifacts. The foreign key relationships are implicit but correct:

- `claims` → `proofs` (one-to-many)
- `proofs` → file storage (URI reference)

**Migration Excellence**: The `file_hash` column is a **migration superpower**. When moving to IPFS:

1. Upload file to IPFS → receive CIDv1
2. Recompute SHA-256 from IPFS-retrieved file
3. Compare against `proofs.file_hash`
4. If match, update `proofs.ipfs_cid`
5. Event log proves hash was recorded **before** IPFS migration (tamper-proof)

**Recommendation**: Add a comment in the migration SQL noting future `ipfs_cid` column for forward compatibility.

---

### Events: A+

**Finding**: The event log design for `claim.submitted` is **outstanding**:

```json
{
  "event_type": "claim.submitted",
  "metadata": {
    "claim_id": "uuid",
    "task_id": "uuid",
    "member_id": "FE-M-XXXXX",
    "proof_type": "file",
    "file_hash": "abc123...",
    "file_size": 245760,
    "mime_type": "image/png"
  }
}
```

**Why This Is Migration-Ready**:

- Hash recorded at submission time (proves file existed in this form at this moment)
- Size + MIME type enable deduplication analysis during migration
- Event sequence can prove "File X was submitted before File Y" for dispute resolution
- Future Merkle root derivation includes file hashes in leaf nodes

**Crypto Theory Validation**: SHA-256 is the correct choice:

- Industry standard (Bitcoin, Ethereum use SHA-256 or Keccak-256)
- 64-character hex string fits neatly in VARCHAR(64)
- Collision-resistant (2^256 possible hashes)
- Fast to compute client-side (Web Crypto API)

**Recommendation**: This is reference-quality event design. No changes needed.

---

### Knowledge: B

**Finding**: Trust Scores derive from approved claims "regardless of proof type" (correct), but the story lacks guidance on whether **file proofs should be weighted differently** from text proofs.

**Strategic Question**: Should a task requiring file proof carry higher incentive values due to increased effort?

**Current State**: Trust Score calculation is claim-agnostic (doesn't inspect proof_type). This is technically correct but may miss a product opportunity.

**Future Consideration** (not blocking for S2-03):

- Tasks requiring file proof might naturally carry higher incentive values (Guardian decision during task creation)
- Leaderboards could filter by "claims with file proofs" (demonstrates high effort)
- Analytics query: "% of claims using file vs text proof" (product insight)

**Recommendation**: Accept current design (proof-type agnostic scores). Note in retro as future enhancement opportunity.

**Grade Justification**: Loses points for missing strategic exploration of proof-type weighting. Otherwise sound.

---

## Strategic Recommendations

### 1. Storage Strategy: Reduce R2 Dependency Risk

**Issue**: The story recommends Cloudflare R2 as the primary storage backend. While technically sound, this creates vendor lock-in that complicates IPFS migration.

**Alternative Approach** (consider for implementation):

**Option A (Recommended)**: **NeonDB Bytea for Season 0**

- Store files directly in Postgres `bytea` column (simple, no new infra)
- Pros: Zero vendor lock-in, works with existing NeonDB setup, easy to export
- Cons: 10MB files → Postgres bloat (but acceptable for Season 0 scale)
- Migration path: Bulk export bytea → IPFS in one operation (no R2 intermediary)

**Option B**: **Keep R2 but add IPFS from day 1**

- Upload to R2 **and** IPFS simultaneously (dual write)
- Store both `r2_url` and `ipfs_cid` in proofs table
- Pros: Migration-ready from the start, R2 as fallback for IPFS gateway failures
- Cons: More complexity, IPFS costs (but negligible for 10MB files)

**Option C (Story's Current Approach)**: **R2 now, IPFS later**

- Risk: Two-step migration (database → R2 → IPFS) vs one-step (database → IPFS)
- Benefit: Simpler initial implementation

**Recommendation**: For Season 0 (Feb–March 2026), use **NeonDB bytea storage**. Reevaluate in Season 1 when transaction volume justifies CDN costs. This reduces moving parts during the critical launch window.

---

### 2. Member Education: Explain Hashing in Sanctuary Language

**Issue**: Members will see "SHA-256 hash computed" but may not understand **why** this matters until blockchain migration is visible.

**Risk**: Feature feels like technical overhead rather than empowerment.

**Recommendation**: Add educational tooltips in the UI:

> **Why do we hash your file?**  
> When you upload proof, we compute a unique "fingerprint" (SHA-256 hash) that mathematically proves this exact file was submitted at this moment. This fingerprint becomes part of your permanent record and will enable Trust Builder to migrate your contributions to blockchain storage in the future—ensuring your work is truly yours, forever.

**Key Messaging**:

- **Fingerprint** (not "hash") — more human
- **Belongs to you** — ownership framing
- **Future-proof** — sets expectation for blockchain migration
- **Permanent record** — aligns with immutability values

**Placement**: Tooltip next to "Upload proof" button (opt-in education, not forced)

---

### 3. Security: Add Content-Type Enforcement

**Issue**: Story specifies MIME type whitelist but doesn't discuss **Content-Type header validation**.

**Attack Vector**: Malicious user uploads `malware.exe` but sets MIME type to `image/png` in the multipart form.

**Recommendation**: Implement **dual validation**:

1. Check `Content-Type` header in multipart upload
2. Recompute MIME type server-side using magic bytes (first 512 bytes of file)
3. Reject if mismatch

**Library**: Use `file-type` npm package for magic byte detection:

```typescript
import { fileTypeFromBuffer } from 'file-type';

const detectedType = await fileTypeFromBuffer(buffer);
if (detectedType?.mime !== uploadedMimeType) {
  throw new Error('File type mismatch');
}
```

**Rationale**: Protects reviewers (who will view files in S2-04) from embedded malware in "image" files.

---

### 4. Migration Readiness: Add `ipfs_cid` Column Now

**Issue**: Story defers IPFS column to "future enhancement," but adding it later requires another migration.

**Recommendation**: Add `ipfs_cid` column during S2-03 migration (nullable, populate later):

```sql
ALTER TABLE proofs
ADD COLUMN file_url TEXT,
ADD COLUMN file_hash VARCHAR(64),
ADD COLUMN file_size INTEGER,
ADD COLUMN mime_type VARCHAR(100),
ADD COLUMN ipfs_cid VARCHAR(100);  -- Add now, populate in Season 1
```

**Benefit**: Single migration event, table schema is "blockchain-ready" from day 1.

**Cost**: Zero (nullable column, no logic required yet).

---

### 5. Complexity Management: Defer Drag-and-Drop to S2-04

**Issue**: Story mentions "drag-and-drop support" in implementation notes. This adds UI complexity that may delay S2-03 completion.

**Recommendation**: S2-03 MVP → **file input button only**. Add drag-and-drop in S2-04 (Peer Review) when reviewers need bulk file viewing. This reduces S2-03 scope and ships file upload capability faster.

**Rationale**: Sanctuary values = ship working features, not feature creep. Members can click "Choose File" button easily enough.

---

## Migration Readiness Assessment

**Score: 92%** (Excellent, with minor gaps)

### What's Already Migration-Ready ✅

1. **SHA-256 hashing** — Direct mapping to IPFS CID verification
2. **Event log metadata** — Hash + size + MIME type captured immutably
3. **Signed URLs** — Time-limited access pattern mirrors IPFS gateway access
4. **Transaction atomicity** — Claim + proof + event always consistent

### What's Missing (Address in S2-03) ⚠️

1. **IPFS column placeholder** — Add now, populate later (4% gap)
2. **Storage abstraction** — Current design couples to R2 implementation (4% gap)

### What's Acceptable as Future Work ✓

1. **Bulk export** — Season 0 → Web3 migration tooling (planned for S3)
2. **Virus scanning** — Pre-blockchain quality gate (planned for S3)
3. **Deduplication** — Optimize storage costs (Season 1 optimization)

**Verdict**: This story is **85%+ migration-ready out of the box** if storage strategy is adjusted per Recommendation #1. With IPFS column added (Recommendation #4), increases to **92% ready**.

---

## Values Alignment Review

### Sanctuary Principles: A-

**Strengths**:

- ✅ Sanctuary-aligned error messages ("This file is a bit too large—let's keep it under 10MB to ensure smooth sailing")
- ✅ Clear instructions ("Upload proof: image, PDF, or document, max 10MB")
- ✅ Educational framing opportunity (Recommendation #2)

**Gaps**:

- File upload failure = frustration. Need gentle retry UX: "Looks like the upload didn't quite make it. Want to try again?"
- No visibility into "why this task requires file proof" (Guardian reasoning not captured)

**Recommendation**: Add optional `proof_type_rationale` field to tasks table (Guardian explains why file proof required). Display to members during claim submission: "This task asks for file proof because [Guardian's explanation]."

---

### Empowerment: B+

**Strengths**:

- ✅ Members gain new proof capability (richer expression)
- ✅ Hashing makes member contributions tamper-evident (ownership)

**Gaps**:

- Members can't **verify their own hash** post-submission (trust-in-system, not trustless)
- No "download my proofs" button (data portability missing)

**Recommendation** (not blocking for S2-03, but note for S2-04):

- Add "Verify File Integrity" button on member dashboard
- Lets member re-upload file, system recomputes hash, confirms match
- Educational moment: "Your file's fingerprint matches! This proves your proof hasn't changed since submission."

---

### Transparency: A

**Strengths**:

- ✅ File metadata visible in events (full audit trail)
- ✅ Hash captured at submission (tamper-evident)
- ✅ Signed URLs ensure access control (not public)

**No gaps identified**. This is exemplary transparency design.

---

## UX & Human-Centeredness

### Will Members Understand This Feature?

**Hypothesis**: Most members (age 16–25) have uploaded files to Google Drive, Instagram, Discord. File upload is familiar. **Hashing is not.**

**Risk**: Members see "Computing file hash..." progress message and think "Is this slow? Am I doing something wrong?"

**Mitigation** (implement in S2-03):

1. **Progress stages**: "Uploading file... ✓" → "Computing fingerprint... ✓" → "Saving proof... ✓"
2. **Time estimates**: "This usually takes 2-3 seconds"
3. **Success confirmation**: "Your proof is secured! Here's your unique fingerprint: `abc123...` (click to learn more)"

**Testing Requirement** (add to AC):

- [ ] **AC19**: Usability test with 3 youth members (age 16–25) confirms file upload UX is clear

---

## Grade: B+

### Rationale

**Strengths** (A-level aspects):

- Event log design (A+)
- Ontology modeling (A across 5/6 dimensions)
- Migration readiness (92% with adjustments)
- Security posture (strong)

**Weaknesses** (deductions):

- Storage strategy introduces vendor dependency (-5 points)
- Incomplete proof_type lifecycle specification (-5 points)
- Missing member education on hashing purpose (-5 points)
- Drag-and-drop adds unnecessary complexity (-5 points)

**Final Score**: 80/100 = **B+**

**Adjusted Score with Recommendations Applied**: 92/100 = **A-**

---

## Handoff Decision

### ✅ APPROVE FOR IMPLEMENTATION

**With conditions**:

1. **MUST address before coding begins**:
   - [ ] Clarify `proof_type` lifecycle (add to S2-02 retro as missed requirement)
   - [ ] Add `ipfs_cid` column to proofs table migration
   - [ ] Add Content-Type validation (magic bytes)

2. **SHOULD address during implementation**:
   - [ ] Use NeonDB bytea storage (not R2) for Season 0 simplicity
   - [ ] Add member education tooltip about hashing
   - [ ] Defer drag-and-drop to S2-04

3. **MAY address in future stories**:
   - [ ] "Verify my file" feature (S2-04 or later)
   - [ ] proof_type_rationale field (S3)
   - [ ] Role-based file size limits (Season 1)

---

## Next Steps

1. **Product Owner**: Update S2-03 acceptance criteria with MUST address items
2. **Fullstack Developer**: Review recommendations, ask clarifying questions if needed
3. **Proceed to implementation** once MUST items are clarified

**Estimated Complexity Adjustment**: Story remains **7 points** if using NeonDB bytea. Increases to **9 points** if implementing R2 integration (infrastructure overhead).

---

## Dimensional Summary Card

| Dimension       | Grade | Status                                   |
| --------------- | ----- | ---------------------------------------- |
| **Groups**      | A     | Stable, no changes needed                |
| **People**      | A-    | Minor documentation gap                  |
| **Things**      | B+    | proof_type lifecycle unclear             |
| **Connections** | A     | Textbook ontology modeling               |
| **Events**      | A+    | Reference-quality design                 |
| **Knowledge**   | B     | Missing proof-type weighting exploration |

**Overall Ontology Grade**: **A-** (86%)

**Migration Readiness**: **92%** (with recommended adjustments)

**Values Alignment**: **A-** (minor UX education gaps)

**Final Story Grade**: **B+** (approve with conditions)

---

**Strategic Review Status**: ✅ COMPLETE  
**Recommendation**: APPROVE FOR IMPLEMENTATION (with MUST address items clarified)  
**Next Agent**: fullstack-developer (pending clarifications)

---

_Strategic review conducted by: product-advisor_  
_Date: 2026-02-10_
_Review Duration: 45 minutes (thorough dimensional analysis)_
