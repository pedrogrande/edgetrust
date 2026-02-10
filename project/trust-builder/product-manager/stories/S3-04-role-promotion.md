# Story S3-04: Trust-Threshold Role Promotion

**Epic**: Member Experience  
**Priority**: MEDIUM (builds on S3-02 dashboard)  
**Sprint**: 3  
**Estimated Points**: 4  
**Assigned To**: fullstack-developer  
**Strategic Review**: Optional (Simple story, pattern established)

---

## Goal

Implement **automated role promotion** from Member → Steward when Trust Score reaches 250 points. This fulfills a functional requirement (trust-threshold roles) and creates motivational progression. Members unlock review privileges through contribution, not gatekeeping.

**Value for Members**: Clear progression path, earned privileges, recognition  
**Value for Organization**: Automated reviewer capacity scaling, merit-based permissions

---

## Complexity (for AI)

**Simple** (6-8 hours)

**Rationale**:
- Single ontology dimension (People, with Knowledge dependency)
- Reuses existing patterns (role attribute, event logging)
- Minimal new UI (badge, progress bar)
- No new database schema (role column exists)
- Clear business logic (threshold check, conditional promotion)

---

## Ontology Mapping

### Primary Dimensions

- **People**: Member role attribute (`Member` → `Steward`)
- **Knowledge**: Trust Score threshold (250 points)
- **Events**: `member.role_promoted` event logged with metadata

### Secondary Dimensions

- **Connections**: Unlocks reviewer privileges (can review claims from others)

### Data Flow

```
Claim approval transaction
  → UPDATE members SET trust_score_cached = trust_score_cached + points
  → IF trust_score_cached >= 250 AND role = 'Member'
     THEN UPDATE members SET role = 'Steward'
     AND INSERT events (member.role_promoted)
  → Dashboard displays Steward badge
```

---

## User Story (Gherkin)

```gherkin
Given I am a Member with 240 Trust Score
When an admin approves my claim worth 10+ points
Then my Trust Score increases to 250+
And my role automatically promotes to "Steward"
And an event is logged (member.role_promoted)
When I visit my dashboard
Then I see a "🌟 Steward" badge
And I see a congratulations message (dismissible)
And I can now access /trust-builder/review page (claim queue)

Given I am a Member with <250 Trust Score
When I visit my dashboard
Then I see a progress bar: "180/250 to Steward"
And I see a tooltip: "At 250 points, you unlock review privileges"
```

---

## Acceptance Criteria

### Functional Behavior

- [ ] **AC1**: Member promoted to Steward when `trust_score_cached >= 250` AND `role = 'Member'`
- [ ] **AC2**: Promotion happens atomically with claim approval (same transaction)
- [ ] **AC3**: Promotion triggers only once (not on every subsequent approval)
- [ ] **AC4**: Manual promotion still possible (admin can promote at any score)
- [ ] **AC5**: Promotion threshold (250) stored in config table (not hardcoded)

### Event Logging

- [ ] **AC6**: Event `member.role_promoted` logged with metadata:
  - `member_id` (who was promoted)
  - `old_role` ('Member')
  - `new_role` ('Steward')
  - `trust_score` (current score at promotion)
  - `threshold` (250, for audit if threshold changes)
  - `promoted_by` ('system' for automatic, admin_id for manual)
- [ ] **AC7**: Event logged inside transaction (atomic with role update)

### Dashboard UI

- [ ] **AC8**: Steward badge displayed for promoted members ("🌟 Steward")
- [ ] **AC9**: Progress bar shown for Members <250 points: "180/250 to Steward (72%)"
- [ ] **AC10**: Tooltip on progress bar: "At 250 Trust Score, you unlock Steward abilities (claim review)"
- [ ] **AC11**: Congratulations message on first dashboard visit after promotion:
  - "Congratulations! You've earned the Steward role!"
  - "You can now review claims from other members. Your role is to help them succeed."
  - Dismissible (localStorage flag: `steward_promo_seen`)

### Steward Permissions

- [ ] **AC12**: Stewards can access `/trust-builder/review` page (claim queue)
- [ ] **AC13**: Stewards see "Review Claims" link in navigation
- [ ] **AC14**: Members (<250 score) redirected if they try to access review page
- [ ] **AC15**: Redirect message: "You need 250 Trust Score to review claims. Keep contributing!"

### Sanctuary Culture

- [ ] **AC16**: Progress bar feels motivational (not gatekeeping)
- [ ] **AC17**: Congratulations message emphasizes helping (not status)
- [ ] **AC18**: Redirect message encouraging (not punitive)

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**Database Table**: `members` (role column already exists)  
**Config Table**: `system_config` (new, stores thresholds)  
**React Components**:
- `<RoleBadge />` (displays role with appropriate styling)
- `<ProgressToSteward />` (progress bar + tooltip)
- `<PromotionToast />` (congratulations message)

### Promotion Logic (Transaction)

**In Claim Approval Transaction** (extend existing S2-04 code):
```typescript
// src/lib/claim-engine.ts
export async function approveClaim(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  feedback: string
): Promise<{ claim: Claim; promoted?: boolean }> {
  // 1. Approve claim (existing logic)
  const { rows: [claim] } = await client.query(/* ... */);

  // 2. Update Trust Score (existing logic)
  const { rows: [member] } = await client.query(`
    UPDATE members
    SET trust_score_cached = trust_score_cached + $1
    WHERE id = $2
    RETURNING id, trust_score_cached, role
  `, [pointsEarned, claim.member_id]);

  // 3. Check for promotion (NEW)
  let promoted = false;
  if (member.role === 'Member' && member.trust_score_cached >= 250) {
    await client.query(`
      UPDATE members
      SET role = 'Steward'
      WHERE id = $1
    `, [member.id]);

    // Log promotion event
    await client.query(`
      INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
      VALUES ($1, 'member', $2, 'member.role_promoted', $3)
    `, ['system', member.id, {
      member_id: member.id,
      old_role: 'Member',
      new_role: 'Steward',
      trust_score: member.trust_score_cached,
      threshold: 250,
      promoted_by: 'system'
    }]);

    promoted = true;
  }

  // 4. Log claim approval event (existing logic)
  await client.query(/* ... */);

  return { claim, promoted };
}
```

### Config Table (New)

**Migration** (`src/lib/db/migrations/007_system_config.sql`):
```sql
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed promotion threshold
INSERT INTO system_config (key, value, description)
VALUES (
  'role_promotion_thresholds',
  '{"steward": 250, "guardian": 1000}',
  'Trust Score thresholds for automatic role promotion'
);
```

**Query Threshold** (dynamic, not hardcoded):
```typescript
export async function getStewardThreshold(client: PoolClient): Promise<number> {
  const { rows: [config] } = await client.query(`
    SELECT value FROM system_config WHERE key = 'role_promotion_thresholds'
  `);
  return config.value.steward; // 250
}
```

### Dashboard Components

**Role Badge** (`src/components/trust-builder/RoleBadge.tsx`):
```typescript
import { Badge } from '@/components/ui/badge';

export function RoleBadge({ role }: { role: string }) {
  const styles = {
    Member: 'bg-gray-100 text-gray-800',
    Steward: 'bg-blue-100 text-blue-800',
    Guardian: 'bg-purple-100 text-purple-800',
    Admin: 'bg-red-100 text-red-800'
  };

  const icons = {
    Member: '',
    Steward: '🌟',
    Guardian: '🛡️',
    Admin: '⚙️'
  };

  return (
    <Badge className={styles[role]}>
      {icons[role]} {role}
    </Badge>
  );
}
```

**Progress to Steward** (`src/components/trust-builder/ProgressToSteward.tsx`):
```typescript
'use client';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ProgressToSteward({ currentScore }: { currentScore: number }) {
  const threshold = 250;
  const progress = Math.min((currentScore / threshold) * 100, 100);

  if (currentScore >= threshold) return null; // Already promoted

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground">
              Path to Steward
            </TooltipTrigger>
            <TooltipContent>
              <p>At 250 Trust Score, you unlock Steward abilities (claim review).</p>
              <p className="text-xs mt-1">Your role is to help members succeed, not to gatekeep.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="font-medium">{currentScore}/{threshold} ({Math.round(progress)}%)</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
```

**Promotion Toast** (`src/components/trust-builder/PromotionToast.tsx`):
```typescript
'use client';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PromotionToast({ role, justPromoted }: { role: string; justPromoted: boolean }) {
  const { toast } = useToast();

  useEffect(() => {
    if (role === 'Steward' && justPromoted) {
      const hasSeenPromotion = localStorage.getItem('steward_promo_seen');
      
      if (!hasSeenPromotion) {
        toast({
          title: "Congratulations! You've earned the Steward role!",
          description: "You can now review claims from other members. Your role is to help them succeed, not to gatekeep.",
          duration: 8000
        });
        
        localStorage.setItem('steward_promo_seen', 'true');
      }
    }
  }, [role, justPromoted, toast]);

  return null; // Render nothing, just side effect
}
```

### Navigation Update

**Add Conditional Link** (`src/components/Navigation.astro` or similar):
```astro
{session && session.member.role === 'Steward' && (
  <a href="/trust-builder/review" class="nav-link">
    Review Claims
  </a>
)}
```

### Access Control (Review Page)

**`src/pages/trust-builder/review.astro`** (add guard):
```astro
---
import { getSession } from '@/lib/auth/session';

const session = await getSession(Astro.cookies);

if (!session) {
  return Astro.redirect('/trust-builder/auth/sign-in');
}

if (session.member.role === 'Member') {
  // Redirect with message
  return Astro.redirect('/trust-builder/dashboard?message=You need 250 Trust Score to review claims. Keep contributing!');
}

// Steward+ can proceed
---
```

### Manual Promotion (Admin)

**Admin Endpoint** (`src/pages/api/trust-builder/admin/promote-member.ts`):
```typescript
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const session = await getSession(cookies);
  if (!session || session.member.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }

  const { member_id, new_role } = await request.json();

  await withTransaction(async (client) => {
    const { rows: [member] } = await client.query(`
      UPDATE members
      SET role = $1
      WHERE id = $2
      RETURNING id, role AS old_role, trust_score_cached
    `, [new_role, member_id]);

    // Log manual promotion
    await client.query(`
      INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
      VALUES ($1, 'member', $2, 'member.role_promoted', $3)
    `, [session.member.id, member_id, {
      member_id,
      old_role: member.old_role,
      new_role,
      trust_score: member.trust_score_cached,
      threshold: null, // Manual, no threshold
      promoted_by: session.member.id // Admin ID
    }]);
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

---

## Definition of Done (DoD)

### Code Quality

- [ ] All acceptance criteria met (18 ACs)
- [ ] TypeScript compiles without errors
- [ ] Transaction completeness (promotion + event log atomic)
- [ ] Config table used (threshold not hardcoded)

### Ontology Compliance

- [ ] People dimension correctly updated (role attribute)
- [ ] Knowledge dimension used (Trust Score threshold)
- [ ] Events dimension captures promotion with complete metadata

### Migration Readiness

- [ ] Threshold stored in config table (smart contract parameter)
- [ ] Promotion event includes threshold value (auditable)
- [ ] Promotion logic deterministic (pure function, no external state)
- [ ] Migration readiness: **95%** (threshold on-chain, promotion logic migration-ready)

### Testing

- [ ] Integration test: Promotion triggered on claim approval
- [ ] Unit test: Threshold check logic
- [ ] Manual test:
  - Create test member with 240 points
  - Approve claim worth 10+ points
  - Verify promotion to Steward
  - Verify event logged
  - Verify dashboard badge appears
  - Verify review page accessible

### QA Report

- [ ] QA engineer validation: **PASS**
- [ ] Grade: A- or higher expected

### Product-Advisor Review

- [ ] Strategic review: Optional (Simple story)
- [ ] Grade: A or A- (expected)
- [ ] Migration readiness: 95%+
- [ ] Values alignment: Motivational UX, helping culture emphasized

### Retrospective

- [ ] Retro file created: `/trust-builder/retros/story-S3-04-role-promotion-retro.md`

---

## Success Metrics

**Quantitative**:
- ✅ Promotion happens atomically (0 race conditions)
- ✅ Event log 100% complete (threshold, score, timestamp)
- ✅ Migration readiness: 95%

**Qualitative**:
- ✅ Members report feeling motivated by progression
- ✅ Steward role feels earned (not given arbitrarily)
- ✅ Review culture emphasizes helping (not gatekeeping)

---

## Dependencies

**Upstream**: S3-02 (dashboard displays badge and progress bar)  
**Downstream**: None (isolated feature)

---

## Risks & Mitigations

| Risk                            | Likelihood | Impact | Mitigation                          |
| ------------------------------- | ---------- | ------ | ----------------------------------- |
| Threshold (250) too low/high    | Medium     | Low    | Config table allows easy adjustment |
| Promotion spam (every approval) | Low        | Low    | Check `role = 'Member'` before      |
| Badge not visible               | Low        | Low    | Prominent dashboard placement       |

---

## Future Enhancements

**Guardian Promotion** (S4+):
- Threshold: 1000 points (already in config table)
- Unlocks: Governance voting, slashing reviews
- Same pattern as Steward promotion

**Role Demotion** (Future):
- If trust score drops below threshold (e.g., slashing penalty)
- Event: `member.role_demoted`
- Sanctuary message: "Your score dropped below 250. Complete more tasks to regain Steward status."

---

_Story ready for implementation. Estimated time: 6-8 hours. Strategic review optional._
