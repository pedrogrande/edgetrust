# S1-05 Implementation Handoff

**Story**: Member Dashboard & Trust Score  
**From**: product-owner  
**To**: fullstack-developer  
**Date**: 2026-02-09  
**Priority**: High (final S1 user-facing feature)

---

## Quick Summary

Build a member dashboard that displays trust score with dimension breakdown chart, recent claims with status badges, and supportive empty states for new members. This is a **read-heavy story** (no transactions) that aggregates data from events and claims tables.

**Estimated Time**: 2-3 hours  
**Complexity**: Moderate (visualization + aggregation)

---

## Files to Create

```
src/pages/trust-builder/dashboard.astro        (~150 lines, SSR page)
src/components/trust-builder/TrustScoreCard.tsx  (~80 lines, chart component)
src/components/trust-builder/ClaimCard.tsx      (~60 lines, status display)
src/components/trust-builder/DashboardEmptyState.tsx  (~30 lines, empty state)
```

## Files to Modify

```
src/lib/db/queries.ts
  - Add getDimensionBreakdown(memberId) → { total, dimensions }
  - Add getRecentClaims(memberId, limit=5) → claim[]
```

---

## Core Queries

### 1. Dimension Breakdown from Events

**Goal**: Aggregate points by dimension from `trust.updated` events.

```typescript
// src/lib/db/queries.ts
export async function getDimensionBreakdown(
  memberId: string
): Promise<{ total: number; dimensions: Record<string, number> }> {
  const result = await sql`
    SELECT 
      metadata->>'dimensions' as dimensions
    FROM events
    WHERE actor_id = ${memberId}
      AND event_type = 'trust.updated'
    ORDER BY timestamp DESC
  `;

  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const row of result) {
    if (!row.dimensions) continue;
    const dims = JSON.parse(row.dimensions as string);
    for (const [key, value] of Object.entries(dims)) {
      breakdown[key] = (breakdown[key] || 0) + (value as number);
      total += value as number;
    }
  }

  return { total, dimensions: breakdown };
}
```

**Why Events, Not trust_score_cached**:
- Demonstrates event-sourced architecture (Knowledge from Events)
- Shows dimension breakdown (cached score is just a total)
- Verifiable against ledger (matches blockchain migration model)

**Fallback**: If no events exist (new member), return `{ total: 0, dimensions: {} }`.

---

### 2. Recent Claims with Task Details

**Goal**: Fetch member's 5 most recent claims with task/mission context.

```typescript
// src/lib/db/queries.ts
export async function getRecentClaims(memberId: string, limit: number = 5) {
  return await sql`
    SELECT 
      c.id,
      c.status,
      c.submitted_at,
      c.reviewed_at,
      t.id as task_id,
      t.title as task_title,
      m.name as mission_name,
      COALESCE(
        (SELECT SUM(ti.points) 
         FROM task_incentives ti 
         WHERE ti.task_id = t.id),
        0
      ) as points_earned
    FROM claims c
    INNER JOIN tasks t ON c.task_id = t.id
    INNER JOIN missions m ON t.mission_id = m.id
    WHERE c.member_id = ${memberId}
    ORDER BY c.submitted_at DESC
    LIMIT ${limit}
  `;
}
```

**Note**: `points_earned` is calculated from task_incentives sum. For approved claims, this is the actual points. For submitted/rejected, it's "potential points."

---

## Component Architecture

### Dashboard Page (dashboard.astro)

**SSR Data Fetching**:
```astro
---
import { getCurrentUser } from '@/lib/auth';
import { getDimensionBreakdown, getRecentClaims } from '@/lib/db/queries';

const currentUser = await getCurrentUser(Astro.request);
if (!currentUser) {
  return Astro.redirect('/trust-builder/signin?redirect=/trust-builder/dashboard');
}

const dimensionData = await getDimensionBreakdown(currentUser.id);
const claims = await getRecentClaims(currentUser.id, 5);

// Check for success message (from claim approval redirect)
const successMessage = Astro.url.searchParams.get('success');
const pointsEarned = Astro.url.searchParams.get('points');
---
```

**Layout Structure**:
```astro
<Layout title="My Dashboard">
  <div class="max-w-5xl mx-auto py-8 px-4">
    <!-- Success Alert (if query param) -->
    {successMessage && <SuccessAlert client:load points={pointsEarned} />}

    <!-- Member ID Header with Tooltip -->
    <MemberHeader memberId={currentUser.member_id} />

    <!-- Trust Score Card -->
    <TrustScoreCard 
      client:load 
      totalScore={dimensionData.total} 
      dimensions={dimensionData.dimensions} 
    />

    <!-- Recent Claims or Empty State -->
    {claims.length === 0 ? (
      <DashboardEmptyState client:load />
    ) : (
      <RecentClaimsSection claims={claims} />
    )}

    <!-- CTAs -->
    <div class="mt-8 flex gap-4">
      <Button href="/trust-builder/tasks">Browse Tasks</Button>
      <Button variant="outline" href="/trust-builder/events">Event Log</Button>
    </div>
  </div>
</Layout>
```

---

### TrustScoreCard Component

**Props**:
```typescript
interface TrustScoreCardProps {
  totalScore: number;
  dimensions: Record<string, number>;
}
```

**Visualization**: Use Recharts BarChart for dimension breakdown:

```tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const chartData = Object.entries(dimensions).map(([name, points]) => ({
  dimension: name.charAt(0).toUpperCase() + name.slice(1),
  points,
}));

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={chartData}>
    <XAxis dataKey="dimension" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="points" fill="hsl(var(--primary))" />
  </BarChart>
</ResponsiveContainer>
```

**Empty State**: If `totalScore === 0`, show placeholder message instead of chart.

---

### ClaimCard Component

**Props**:
```typescript
interface ClaimCardProps {
  claimId: string;
  taskTitle: string;
  missionName: string;
  status: 'submitted' | 'approved' | 'rejected';
  pointsEarned?: number;
  submittedAt: string;
}
```

**Status Badge Configuration**:
```typescript
const statusConfig = {
  approved: { 
    icon: CheckCircle2, 
    variant: 'default', 
    label: 'Approved ✓', 
    showPoints: true 
  },
  submitted: { 
    icon: Clock, 
    variant: 'secondary', 
    label: 'Pending Review ⏱', 
    showPoints: false 
  },
  rejected: { 
    icon: XCircle, 
    variant: 'destructive', 
    label: 'Rejected ✗', 
    showPoints: false 
  },
};
```

**Relative Time**: Format `submittedAt` as "2 hours ago" or "3 days ago":

```typescript
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}
```

---

### DashboardEmptyState Component

**Message**: Supportive sanctuary tone (from S1-04 retro):

```tsx
<Card className="p-8 text-center">
  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
  <h3 className="text-lg font-semibold mb-2">Start Your Trust Journey</h3>
  <p className="text-muted-foreground mb-6">
    You haven't claimed any tasks yet. Complete tasks to earn trust points 
    and contribute to Future's Edge missions!
  </p>
  <Button asChild size="lg">
    <a href="/trust-builder/tasks">Browse Available Tasks</a>
  </Button>
</Card>
```

**Do NOT**: Show empty claims list or "No data" message.

---

## Success Alert Implementation

**Goal**: Show success message when redirected from claim approval.

**ClaimForm Redirect** (already implemented in S1-04):
```typescript
// After successful submission
window.location.href = '/trust-builder/dashboard?success=true&points=60';
```

**Dashboard Detection**:
```astro
---
const successMessage = Astro.url.searchParams.get('success');
const pointsEarned = Astro.url.searchParams.get('points');
---

{successMessage && (
  <Alert className="mb-6 bg-green-50 border-green-200">
    <CheckCircle2 className="h-4 w-4 text-green-600" />
    <AlertDescription>
      🎉 Claim approved! You earned {pointsEarned || '0'} points.
    </AlertDescription>
  </Alert>
)}
```

**Auto-Dismiss** (optional enhancement):
```tsx
// Make it a client component with useEffect timer
export function SuccessAlert({ points }: { points: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <Alert>...</Alert>;
}
```

---

## Member ID Tooltip (S1-04 Retro Action Item)

**Goal**: Explain founding member badge and blockchain significance.

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

<div className="flex items-center gap-2 mb-6">
  <h1 className="text-2xl font-bold">Welcome, {memberId}</h1>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="cursor-help">
          Founding Member 🌟
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>
          Your Member ID is your permanent identity in Future's Edge. 
          When we launch on blockchain in April 2026, this ID proves your 
          founding contribution and links to your wallet.
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

---

## Responsive Design

**Mobile-First Approach**:

```tsx
// Trust Score Card: Horizontal layout on desktop, stacked on mobile
<Card>
  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
    <CardTitle>Your Trust Score</CardTitle>
    <div className="text-3xl font-bold">{totalScore} points</div>
  </CardHeader>
</Card>

// Claims Grid: Full width cards on mobile, side-by-side on large screens
<div className="grid gap-4 lg:grid-cols-2">
  {claims.map(claim => <ClaimCard key={claim.id} {...claim} />)}
</div>
```

**Chart Responsiveness**: Recharts `ResponsiveContainer` handles this automatically.

---

## Error Handling

**Scenario 1: User not authenticated**
```astro
const currentUser = await getCurrentUser(Astro.request);
if (!currentUser) {
  return Astro.redirect('/trust-builder/signin?redirect=/trust-builder/dashboard');
}
```

**Scenario 2: Database query fails**
```astro
let dimensionData, claims;
try {
  dimensionData = await getDimensionBreakdown(currentUser.id);
  claims = await getRecentClaims(currentUser.id);
} catch (error) {
  console.error('Dashboard data fetch failed:', error);
  // Show error alert with retry button
  return <ErrorAlert message="Unable to load dashboard" />;
}
```

**Scenario 3: No claims (new member)**
- This is NOT an error—expected state
- Show DashboardEmptyState with positive messaging

---

## Testing Checklist

Before marking done, verify:

- [ ] Dashboard loads for authenticated member
- [ ] Trust score matches `trust_score_cached` from members table
- [ ] Dimension chart shows data from events metadata (not hardcoded)
- [ ] Claims list shows correct status badges (approved ✓, pending ⏱, rejected ✗)
- [ ] Empty state displays for member with 0 claims
- [ ] Success alert shows when URL has `?success=true&points=60`
- [ ] Member ID tooltip appears on hover/tap
- [ ] Mobile responsive (test at 375px width)
- [ ] Links work: "Browse Tasks" → /trust-builder/tasks
- [ ] TypeScript compiles without errors (`pnpm exec tsc --noEmit`)

---

## Edge Cases

**New Member (0 claims, 0 points)**:
- Show trust score as "0 points"
- Show dimension chart placeholder or "No data yet" message
- Show DashboardEmptyState (not empty claims list)
- Prominent "Browse Tasks" CTA

**Member with Only Pending Claims**:
- Trust score shows 0 (pending claims don't contribute yet)
- Dimension chart empty or placeholder
- Claims list shows all "Pending Review ⏱" badges
- Message: "Your claims are under review. You'll earn points once approved."

**Member with Rejected Claims**:
- Trust score excludes rejected claim points
- Claims list shows "Rejected ✗" badge
- Optional: Link to "Learn why" or "Resubmit" (defer to S2)

---

## Integration with S1-04

**ClaimForm already redirects to dashboard** (no changes needed):

```typescript
// src/components/trust-builder/ClaimForm.tsx (S1-04)
if (data.status === 'approved') {
  setSuccess({ 
    message: data.message, 
    points: data.points_earned 
  });
  setTimeout(() => {
    window.location.href = `/trust-builder/dashboard?success=true&points=${data.points_earned}`;
  }, 2000);
}
```

**Dashboard receives query params** and displays success alert.

---

## S1-04 Retro Learnings Applied

✅ **Dimension Visualization** — BarChart component shows breakdown  
✅ **Member ID Tooltip** — Explains founding member significance + blockchain link  
✅ **Sanctuary Messaging** — Empty state says "Start Your Trust Journey" not "No claims"  
✅ **Smart CTAs** — "Browse Tasks" primary, "Event Log" secondary  
✅ **Mobile Responsive** — Cards stack, chart scales, touch-friendly badges  
✅ **Status Differentiation** — Approved shows points, pending shows "TBD"  
✅ **Type Safety** — Use ClaimStatus enum, DimensionBreakdown type

---

## Performance Notes

**Query Optimization**:
- `getDimensionBreakdown()` scans events table (add index on `actor_id, event_type` if slow)
- `getRecentClaims()` uses `LIMIT 5` (pagination not needed for dashboard)
- Both queries are read-only (no locks, safe for concurrent access)

**Recharts Bundle Size**:
- Recharts adds ~50KB gzipped
- Already installed for Trust Builder project
- Only loads on dashboard page (not global)
- If concerned, use CSS progress bars instead

---

## Definition of Done

- [ ] Dashboard page created at `/trust-builder/dashboard`
- [ ] Auth guard redirects unauthenticated users
- [ ] Trust score displays (from events aggregate)
- [ ] Dimension breakdown chart renders
- [ ] Recent claims list (max 5) with status badges
- [ ] Empty state for new members
- [ ] Success alert for claim approvals
- [ ] Member ID tooltip with blockchain explanation
- [ ] Mobile responsive (375px width)
- [ ] TypeScript compiles (`pnpm exec tsc --noEmit`)
- [ ] All links work (Browse Tasks, Event Log)
- [ ] Sanctuary messaging throughout
- [ ] QA validation (all 20 acceptance criteria)
- [ ] product-advisor review (Grade B+)

---

## Next Steps After Implementation

1. **Self-test**: View dashboard as authenticated member with/without claims
2. **Submit to QA**: Request qa-engineer validation
3. **product-advisor review**: Wait for strategic review
4. **Retrospective**: retro-facilitator captures learnings

---

**Ready to implement**: Yes ✅  
**Blocked by**: None (S1-04 complete)  
**Estimated completion**: 2-3 hours  
**Priority**: High (final S1 user-facing feature)

---

**Questions?** Ping product-owner in Slack or check story spec: `stories/S1-05-member-dashboard.md`
