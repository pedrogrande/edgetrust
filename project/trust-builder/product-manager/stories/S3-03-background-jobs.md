# Story S3-03: Background Jobs & Automated Workflows

**Epic**: System Automation  
**Priority**: HIGH (addresses action item from S2-04)  
**Sprint**: 3  
**Estimated Points**: 5  
**Assigned To**: fullstack-developer  
**Strategic Review**: **MANDATORY** (Moderate complexity, 45 min with product-advisor)

---

## Goal

Implement **automated workflow** for releasing orphaned claims (claims under review for >7 days). This addresses accountability gaps and prevents reviewer bottlenecks. Phase 1 ships **manual trigger** (admin endpoint); Phase 2 (post-deployment) adds **scheduled cron job**.

**Value for Members**: Unblocks waiting claimants, redistributes stalled reviews  
**Value for Organization**: Reduces admin burden, maintains review velocity

---

## Complexity (for AI)

**Moderate** (1 day)

**Rationale**:
- 2 ontology dimensions (Connections + Events)
- New background workflow pattern (first implementation)
- State machine path completion (timeout path)
- Admin UI required (orphaned claim count, confirmation dialog)
- Moderate business logic (identify orphaned, transition state, log events)

---

## Ontology Mapping

### Primary Dimensions

- **Connections**: Claim-to-reviewer assignment (cleared on timeout)
- **Events**: `claim.timeout_released` event logged with metadata

### Secondary Dimensions

- **Things**: Claim state transition (`under_review` → `submitted`)
- **People**: Reviewer (freed from stalled review)

### Data Flow

```
Claims table (status = 'under_review', updated_at >7 days ago)
  → Identify orphaned claims (query)
  → UPDATE claims SET status = 'submitted', reviewer_id = NULL
  → INSERT events (claim.timeout_released, metadata)
  → Return affected claim_ids
  → Admin UI displays count, confirmation dialog
```

---

## User Story (Gherkin)

```gherkin
Given I am an Admin
And there are claims with status='under_review' and updated_at >7 days ago
When I navigate to /trust-builder/admin/claims
Then I see a badge showing count of orphaned claims
When I click "Release Orphaned Claims" button
Then I see a confirmation dialog listing affected claims
When I confirm the action
Then all orphaned claims transition to status='submitted'
And reviewer_id is cleared (claim returns to queue)
And event log records 'claim.timeout_released' with metadata
And I see success message: "X claims released back to queue"
And affected members receive no Trust Score penalty (Season 0 learning environment)
```

---

## Acceptance Criteria

### Functional Behavior

- [ ] **AC1**: Manual API endpoint identifies claims with `status = 'under_review'` AND `updated_at > NOW() - INTERVAL '7 days'`
- [ ] **AC2**: Endpoint transitions orphaned claims to `status = 'submitted'`
- [ ] **AC3**: Endpoint clears `reviewer_id` (returns claim to queue)
- [ ] **AC4**: Endpoint logs `claim.timeout_released` event for each affected claim
- [ ] **AC5**: Endpoint returns list of affected claims (id, title, reviewer_name, days_orphaned)
- [ ] **AC6**: Transaction atomic (state update + event log in same tx)
- [ ] **AC7**: No Trust Score penalty applied (Season 0 grace period)

### Admin UI

- [ ] **AC8**: `/trust-builder/admin/claims` page displays orphaned claim count (badge notation)
- [ ] **AC9**: "Release Orphaned Claims" button visible (only if count > 0)
- [ ] **AC10**: Confirmation dialog lists affected claims (title, reviewer, days orphaned)
- [ ] **AC11**: Dialog explains action: "These claims will return to the review queue. No penalties applied."
- [ ] **AC12**: Success toast message after release: "X claims released successfully"
- [ ] **AC13**: Page refreshes to show updated queue (orphaned claims now available)

### Event Logging

- [ ] **AC14**: Event metadata includes:
  - `claim_id` (affected claim)
  - `reviewer_id` (who had the claim)
  - `days_orphaned` (calculated: NOW() - updated_at)
  - `timeout_threshold` (7 days)
  - `admin_id` (who triggered release)
- [ ] **AC15**: Event logged inside transaction (atomic with state change)
- [ ] **AC16**: Event metadata sufficient for audit ("Why was this claim released?")

### State Machine Completion

- [ ] **AC17**: Timeout path validates all 5 state machine paths:
  1. Happy path: Reviewer approves ✅ (S2-04)
  2. Failure path: Reviewer rejects ✅ (S2-04)
  3. Retry path: Reviewer requests revision ✅ (S2-04)
  4. Timeout path: Orphaned >7 days, released ✅ (THIS STORY)
  5. Voluntary exit: Reviewer releases voluntarily ✅ (S2-04)

### Sanctuary Culture

- [ ] **AC18**: No punitive language ("timeout violation" → "released back to queue")
- [ ] **AC19**: Confirmation dialog educational: "Life happens! These claims need fresh eyes."
- [ ] **AC20**: No Trust Score deduction for reviewer (learning culture)
- [ ] **AC21**: Optional: Email reminder to reviewer at Day 5 (before timeout, if time allows)

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**API Endpoint**: `POST /api/trust-builder/admin/release-orphaned-claims`  
**Admin UI Page**: `/trust-builder/admin/claims` (existing page, add button)  
**React Components**:
- `<OrphanedClaimsBadge />` (count display)
- `<ReleaseOrphanedDialog />` (confirmation with affected claim list)

### Database Query

**Identify Orphaned Claims**:
```sql
SELECT
  c.id,
  c.task_id,
  t.title AS task_title,
  c.reviewer_id,
  m.display_name AS reviewer_name,
  EXTRACT(DAY FROM (NOW() - c.updated_at)) AS days_orphaned
FROM claims c
JOIN tasks t ON t.id = c.task_id
LEFT JOIN members m ON m.id = c.reviewer_id
WHERE c.status = 'under_review'
  AND c.updated_at < NOW() - INTERVAL '7 days'
ORDER BY c.updated_at ASC;
```

**Release Claims (Atomic Transaction)**:
```sql
BEGIN;

-- Update claim status (atomic with event log)
WITH released AS (
  UPDATE claims
  SET status = 'submitted',
      reviewer_id = NULL,
      updated_at = NOW()
  WHERE status = 'under_review'
    AND updated_at < NOW() - INTERVAL '7 days'
  RETURNING id, task_id, reviewer_id, 
    EXTRACT(DAY FROM (NOW() - updated_at)) AS days_orphaned
)
INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
SELECT
  $1, -- admin_id
  'claim',
  r.id,
  'claim.timeout_released',
  jsonb_build_object(
    'claim_id', r.id,
    'task_id', r.task_id,
    'reviewer_id', r.reviewer_id,
    'days_orphaned', r.days_orphaned,
    'timeout_threshold_days', 7,
    'admin_id', $1
  )
FROM released r;

COMMIT;
```

### API Endpoint Implementation

**`src/pages/api/trust-builder/admin/release-orphaned-claims.ts`**:
```typescript
import type { APIRoute } from 'astro';
import { getSession } from '@/lib/auth/session';
import { withTransaction } from '@/lib/db/connection';

export const POST: APIRoute = async ({ cookies }) => {
  const session = await getSession(cookies);
  
  // Admin-only endpoint
  if (!session || session.member.role !== 'Admin') {
    return new Response(
      JSON.stringify({ error: 'Admin access required to release orphaned claims' }),
      { status: 403 }
    );
  }

  try {
    const result = await withTransaction(async (client) => {
      // Identify orphaned claims
      const { rows: orphaned } = await client.query(`
        SELECT
          c.id,
          t.title AS task_title,
          m.display_name AS reviewer_name,
          EXTRACT(DAY FROM (NOW() - c.updated_at)) AS days_orphaned
        FROM claims c
        JOIN tasks t ON t.id = c.task_id
        LEFT JOIN members m ON m.id = c.reviewer_id
        WHERE c.status = 'under_review'
          AND c.updated_at < NOW() - INTERVAL '7 days'
      `);

      if (orphaned.length === 0) {
        return { released: [], count: 0 };
      }

      // Release claims + log events (atomic)
      await client.query(`
        WITH released AS (
          UPDATE claims
          SET status = 'submitted',
              reviewer_id = NULL,
              updated_at = NOW()
          WHERE status = 'under_review'
            AND updated_at < NOW() - INTERVAL '7 days'
          RETURNING id, task_id, reviewer_id,
            EXTRACT(DAY FROM (NOW() - updated_at)) AS days_orphaned
        )
        INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
        SELECT
          $1,
          'claim',
          r.id,
          'claim.timeout_released',
          jsonb_build_object(
            'claim_id', r.id,
            'task_id', r.task_id,
            'reviewer_id', r.reviewer_id,
            'days_orphaned', r.days_orphaned,
            'timeout_threshold_days', 7,
            'admin_id', $1
          )
        FROM released r
      `, [session.member.id]);

      return {
        released: orphaned,
        count: orphaned.length
      };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Release orphaned claims error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to release claims. Please try again.' }),
      { status: 500 }
    );
  }
};
```

### Admin UI Components

**Orphaned Claims Badge** (`src/components/trust-builder/OrphanedClaimsBadge.tsx`):
```typescript
'use client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function OrphanedClaimsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('/api/trust-builder/admin/orphaned-claims-count')
      .then(res => res.json())
      .then(data => setCount(data.count));
  }, []);

  if (count === 0) return null;

  return (
    <Badge variant="destructive" className="ml-2">
      {count} orphaned
    </Badge>
  );
}
```

**Release Dialog** (`src/components/trust-builder/ReleaseOrphanedDialog.tsx`):
```typescript
'use client';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ReleaseOrphanedDialog({ orphanedClaims }: { orphanedClaims: Claim[] }) {
  const { toast } = useToast();
  const [isReleasing, setIsReleasing] = useState(false);

  const handleRelease = async () => {
    setIsReleasing(true);
    
    try {
      const response = await fetch('/api/trust-builder/admin/release-orphaned-claims', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Release failed');

      const { count } = await response.json();

      toast({
        title: 'Claims Released',
        description: `${count} claim${count > 1 ? 's' : ''} returned to the review queue.`
      });

      // Refresh page to show updated queue
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Release Failed',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          Release Orphaned Claims ({orphanedClaims.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release {orphanedClaims.length} orphaned claim{orphanedClaims.length > 1 ? 's' : ''}?</AlertDialogTitle>
          <AlertDialogDescription>
            Life happens! These claims have been under review for more than 7 days and need fresh eyes.
            No penalties will be applied to reviewers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-60 overflow-y-auto">
          <ul className="space-y-2">
            {orphanedClaims.map((claim) => (
              <li key={claim.id} className="text-sm border-l-2 border-yellow-500 pl-2">
                <div className="font-medium">{claim.task_title}</div>
                <div className="text-muted-foreground">
                  Reviewer: {claim.reviewer_name} · {Math.floor(claim.days_orphaned)} days ago
                </div>
              </li>
            ))}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRelease} disabled={isReleasing}>
            {isReleasing ? 'Releasing...' : 'Release Claims'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Admin Page Integration

**Add to `/trust-builder/admin/claims` page**:
```astro
---
import { OrphanedClaimsBadge } from '@/components/trust-builder/OrphanedClaimsBadge';
import { ReleaseOrphanedDialog } from '@/components/trust-builder/ReleaseOrphanedDialog';

// Fetch orphaned claims for dialog
const orphanedClaims = await getOrphanedClaims(); // helper function
---

<Layout title="Admin - Claims">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold">
      Claim Queue
      <OrphanedClaimsBadge client:load />
    </h1>
    
    {orphanedClaims.length > 0 && (
      <ReleaseOrphanedDialog orphanedClaims={orphanedClaims} client:load />
    )}
  </div>

  <!-- Rest of admin claims page -->
</Layout>
```

### Optional Enhancement (If Time Allows)

**Email Reminder at Day 5** (before timeout):
```typescript
// In future cron job (not S3-03, document as future enhancement)
async function sendReviewReminders() {
  const { rows: dueSoon } = await query(`
    SELECT c.id, t.title, m.email, m.display_name,
      EXTRACT(DAY FROM (NOW() - c.updated_at)) AS days_pending
    FROM claims c
    JOIN tasks t ON t.id = c.task_id
    JOIN members m ON m.id = c.reviewer_id
    WHERE c.status = 'under_review'
      AND c.updated_at BETWEEN NOW() - INTERVAL '6 days' AND NOW() - INTERVAL '5 days'
  `);

  for (const claim of dueSoon) {
    await sendEmail({
      to: claim.email,
      subject: 'Gentle reminder: Review almost due',
      body: `Hi ${claim.display_name}, your review for "${claim.title}" is due in ${7 - claim.days_pending} days. We're here if you need help!`
    });
  }
}
```

---

## Definition of Done (DoD)

### Code Quality

- [ ] All acceptance criteria met (21 ACs)
- [ ] TypeScript compiles without errors
- [ ] Transaction completeness (state update + event log atomic)
- [ ] Event metadata complete (claim_id, reviewer_id, days_orphaned, threshold)
- [ ] Sanctuary error messages (admin friendly, not punitive)

### Ontology Compliance

- [ ] Connections dimension correctly updated (claim-to-reviewer cleared)
- [ ] Events dimension captures timeout with complete metadata
- [ ] State machine timeout path validated (5th path complete)

### Migration Readiness

- [ ] Timeout threshold (7 days) extractable for smart contract config
- [ ] Event log sufficient for audit trail ("Why was claim released?")
- [ ] Release logic deterministic (no external state dependencies)
- [ ] Migration readiness: **85%** (cron timing off-chain, but logic migration-ready)

### Testing

- [ ] Integration test: `/admin/release-orphaned-claims` endpoint
- [ ] Unit test: Orphaned claim identification query
- [ ] Manual test:
  - Create test claim, set `updated_at = NOW() - INTERVAL '8 days'`
  - Click "Release Orphaned Claims" button
  - Verify state transition (`submitted`, `reviewer_id = NULL`)
  - Verify event log includes complete metadata
  - Verify claim reappears in reviewer queue

### QA Report

- [ ] QA engineer validation: **PASS**
- [ ] Grade: A- or higher expected

### Product-Advisor Review

- [ ] Strategic review completed (45 min pre-implementation)
- [ ] Grade: A- or A (expected)
- [ ] Migration readiness: 85%+
- [ ] Values alignment: No penalties, educational messaging

### Retrospective

- [ ] Retro file created: `/trust-builder/retros/story-S3-03-background-jobs-retro.md`
- [ ] Lessons learned documented

---

## Success Metrics

**Quantitative**:
- ✅ Orphaned claims released within 1 click (admin efficiency)
- ✅ Event log includes 100% metadata completeness
- ✅ Transaction atomic (0 partial writes)
- ✅ Migration readiness: 85%

**Qualitative**:
- ✅ Admins report reduced manual intervention
- ✅ Members appreciate unblocked reviews (no stale queue)
- ✅ Sanctuary culture evident (no blame, learning environment)

---

## Dependencies

**Upstream**: S3-01 (test infrastructure for integration tests)  
**Downstream**: None (isolated feature)

---

## Risks & Mitigations

| Risk                           | Likelihood | Impact | Mitigation                            |
| ------------------------------ | ---------- | ------ | ------------------------------------- |
| Threshold (7 days) too short   | Medium     | Low    | Make configurable (admin setting)     |
| Mass release overwhelms queue  | Low        | Medium | Pagination in admin UI (20 per page)  |
| Email reminder spam            | Low        | Low    | Optional feature, document future     |

---

## Future Enhancements (Post-Deployment)

**Phase 2: Scheduled Cron Job** (S4 or post-deployment):
```yaml
# vercel.json (Vercel Cron)
{
  "crons": [
    {
      "path": "/api/trust-builder/admin/release-orphaned-claims",
      "schedule": "0 0 * * *" # Daily at 00:00 UTC
    }
  ]
}
```

OR

**GitHub Actions** (alternative to Vercel Cron):
```yaml
# .github/workflows/release-orphaned-claims.yml
name: Release Orphaned Claims
on:
  schedule:
    - cron: '0 0 * * *' # Daily at 00:00 UTC
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Call API endpoint
        run: |
          curl -X POST https://edgetrust.futuresedge.org/api/trust-builder/admin/release-orphaned-claims \
            -H "Authorization: Bearer ${{ secrets.ADMIN_API_KEY }}"
```

**Email Reminders** (optional, S4):
- Day 5 reminder: "Your review is due in 2 days"
- Day 7 reminder: "Review overdue, will be released tomorrow"

---

_Story ready for strategic review. Schedule 45 min pre-implementation session with product-advisor._
