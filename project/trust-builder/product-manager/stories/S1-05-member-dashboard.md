# Story S1-05: Member Dashboard & Trust Score

**Sprint**: 1  
**Story ID**: S1-05  
**Depends on**: S1-01 (Schema), S1-02 (Auth), S1-04 (Claims data)  
**Blocks**: None (final S1 user-facing feature)  
**Created**: 2026-02-09

---

## Goal

Give authenticated members visibility into their trust-building progress by displaying their trust score with dimension breakdown, recent claims with status, and actionable next steps—demonstrating that contributions are tracked, recognized, and rewarded in the Future's Edge ecosystem.

---

## Complexity (for AI)

**Moderate** — This story involves:

- Read-heavy queries (no writes except page views)
- Aggregation (trust score from events, claims grouped by status)
- Data visualization (dimension breakdown chart)
- Responsive layout (mobile-first card grid)
- Empty states (new member with no claims yet)

**Not Complex Because**:

- No transactions (all read-only)
- No business logic (display data, don't calculate)
- Reuses existing queries (getApprovedPointsByMember exists from S1-04)

**Estimated Time**: 2-3 hours for AI implementation

---

## Ontology Mapping

- **Groups**: Mission names displayed on claim cards (read-only context)
- **People**: Member identity (current user), "You" language throughout
- **Things**: Task titles and descriptions on claim cards
- **Connections**: Claims displayed with status and relationship to tasks
- **Events**: Trust score derived from `trust.updated` events, dimension breakdown from event metadata
- **Knowledge**: Trust score visualization, dimension analytics, progress insights

---

## User Story (Gherkin)

### Scenario 1: Member with Claims Sees Dashboard

```gherkin
Given I am authenticated as FE-M-00001
And I have submitted 2 claims:
  - "Attend Live Webinar" (approved, 60 points)
  - "Design Values Workshop" (submitted, pending review)
When I navigate to /trust-builder/dashboard
Then I see my Member ID: "FE-M-00001" with a founding member badge tooltip
And I see my Trust Score: "60 points"
And I see a dimension breakdown chart showing:
  - Participation: 50 points (83%)
  - Innovation: 10 points (17%)
And I see my Recent Claims section with 2 cards:
  - "Attend Live Webinar" - Status: Approved ✓ - Points earned: 60
  - "Design Values Workshop" - Status: Pending Review ⏱ - Points: TBD
And I see a "Browse Available Tasks" CTA button
And I see a "View Full Event Log" link (for S1-06)
```

### Scenario 2: New Member with No Claims Sees Empty State

```gherkin
Given I am authenticated as FE-M-00042 (new member)
And I have submitted 0 claims
When I navigate to /trust-builder/dashboard
Then I see my Member ID: "FE-M-00042" with founding member tooltip
And I see my Trust Score: "0 points"
And I see a dimension chart placeholder (all dimensions at 0)
And I see an empty state message:
  "You haven't claimed any tasks yet. Start building trust by completing tasks!"
And I see a prominent "Browse Tasks" button
And I do NOT see a claims section (no empty list)
```

### Scenario 3: Member Arrives After Claim Approval (Success Flow)

```gherkin
Given I just submitted an auto-approved claim on "Attend Live Webinar"
And ClaimForm redirected me to /trust-builder/dashboard
When the dashboard loads
Then I see a success alert at the top:
  "🎉 Claim approved! You earned 60 points."
And the alert auto-dismisses after 5 seconds
And my Trust Score shows the updated total
And the newly approved claim appears in Recent Claims
```

### Scenario 4: Member Checks Pending Claim Status

```gherkin
Given I submitted a peer-review claim 2 days ago
And the claim is still "submitted" status
When I view my dashboard
Then I see the claim card with:
  - Status badge: "Pending Review ⏱"
  - Submit date: "2 days ago"
  - Message: "A reviewer will evaluate your work soon"
And I see a "View Details" link to see my submitted proof
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC-1 (Trust Score Display)**: Dashboard shows member's `trust_score_cached` with clear label and point unit
- [ ] **AC-2 (Dimension Breakdown)**: Chart visualizes points by dimension (Participation, Collaboration, Innovation, Leadership, Governance) derived from `trust.updated` event metadata
- [ ] **AC-3 (Claims List)**: Recent claims displayed (max 5) with task title, status badge, points earned, submission date
- [ ] **AC-4 (Empty State)**: New members see supportive message + Browse Tasks CTA (not empty claims list)
- [ ] **AC-5 (Member ID Tooltip)**: Founding member badge explains Member ID significance for blockchain migration
- [ ] **AC-6 (Success Alert)**: Claims approved via auto-approve show success message on dashboard redirect (5-second auto-dismiss)
- [ ] **AC-7 (Status Differentiation)**: Approved claims show points earned, pending claims show "TBD" or "Under Review"

### Ontology Compliance

- [ ] **OC-1**: Trust score is Knowledge (derived from events ledger, not arbitrary)
- [ ] **OC-2**: Dimension breakdown is Knowledge (aggregated from `trust.updated` event metadata)
- [ ] **OC-3**: Claims displayed as Connections (linking member to tasks with status)
- [ ] **OC-4**: Member identity is People (authenticated user context throughout)

### Technical Quality

- [ ] **TQ-1**: Use existing `getCurrentUser()` for authentication
- [ ] **TQ-2**: Query dimension breakdown from events table (not hardcoded from task_incentives)
- [ ] **TQ-3**: Use TypeScript types from `trust-builder.ts` (ClaimStatus enum, DimensionBreakdown type)
- [ ] **TQ-4**: SSR page load (no client-side data fetching for initial render)

### User Experience

- [ ] **UX-1**: Mobile-responsive layout (cards stack vertically on small screens)
- [ ] **UX-2**: Sanctuary messaging for empty states ("Start building trust..." not "No data")
- [ ] **UX-3**: Visual hierarchy: Trust score most prominent, claims secondary, CTAs tertiary
- [ ] **UX-4**: Status badges use color + icon (approved ✓ green, pending ⏱ yellow, rejected ✗ red)
- [ ] **UX-5**: Accessible chart (color-blind safe palette, axis labels, data table alternative)

---

## Implementation Notes (AI-Facing)

### File Structure

Create/modify these files:

```
src/
  pages/
    trust-builder/
      dashboard.astro          # ← Main dashboard page (SSR)
  components/
    trust-builder/
      TrustScoreCard.tsx       # ← Trust score + dimension chart component
      ClaimCard.tsx            # ← Individual claim display component
      DashboardEmptyState.tsx  # ← Empty state for new members
  lib/
    db/
      queries.ts               # ← Add getDimensionBreakdown(), getRecentClaims()
```

### Data Queries Needed

**1. Get Member's Dimension Breakdown**

```typescript
// Query events table for trust.updated events
export async function getDimensionBreakdown(
  memberId: string
): Promise<DimensionBreakdown> {
  const result = await sql`
    SELECT 
      metadata->>'dimensions' as dimensions
    FROM events
    WHERE actor_id = ${memberId}
      AND event_type = 'trust.updated'
    ORDER BY timestamp DESC
  `;

  // Aggregate dimensions from all events
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const row of result) {
    const dims = JSON.parse(row.dimensions);
    for (const [key, value] of Object.entries(dims)) {
      breakdown[key] = (breakdown[key] || 0) + (value as number);
      total += value as number;
    }
  }

  return { total, dimensions: breakdown };
}
```

**2. Get Member's Recent Claims**

```typescript
export async function getRecentClaims(memberId: string, limit = 5) {
  return await sql`
    SELECT 
      c.id,
      c.status,
      c.submitted_at,
      c.reviewed_at,
      t.id as task_id,
      t.title as task_title,
      m.name as mission_name,
      -- Calculate points from task_incentives
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

**3. Check for Success Alert (Query Parameter)**

```typescript
// In dashboard.astro
const successMessage = Astro.url.searchParams.get('success');
// If ClaimForm redirects with ?success=true&points=60, show alert
```

---

### UI Component Patterns

**Trust Score Card** (TrustScoreCard.tsx):

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface TrustScoreCardProps {
  memberId: string;
  totalScore: number;
  dimensions: Record<string, number>;
}

export function TrustScoreCard({
  memberId,
  totalScore,
  dimensions,
}: TrustScoreCardProps) {
  const chartData = Object.entries(dimensions).map(([name, points]) => ({
    dimension: name.charAt(0).toUpperCase() + name.slice(1),
    points,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Your Trust Score</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{totalScore}</span>
            <span className="text-muted-foreground">points</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalScore === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Complete tasks to start earning trust points!
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="dimension" />
              <YAxis />
              <Bar dataKey="points" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

**Claim Card** (ClaimCard.tsx):

```tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface ClaimCardProps {
  claimId: string;
  taskTitle: string;
  missionName: string;
  status: 'submitted' | 'approved' | 'rejected';
  pointsEarned?: number;
  submittedAt: string;
}

export function ClaimCard({
  status,
  taskTitle,
  pointsEarned,
  submittedAt,
}: ClaimCardProps) {
  const statusConfig = {
    approved: {
      icon: CheckCircle2,
      color: 'bg-green-500',
      label: 'Approved',
      points: true,
    },
    submitted: {
      icon: Clock,
      color: 'bg-yellow-500',
      label: 'Pending Review',
      points: false,
    },
    rejected: {
      icon: XCircle,
      color: 'bg-red-500',
      label: 'Rejected',
      points: false,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{taskTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {formatRelativeTime(submittedAt)}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>
      {config.points && pointsEarned && (
        <p className="text-sm mt-2 text-muted-foreground">
          Points earned:{' '}
          <span className="font-semibold text-foreground">{pointsEarned}</span>
        </p>
      )}
    </Card>
  );
}
```

**Empty State** (DashboardEmptyState.tsx):

```tsx
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function DashboardEmptyState() {
  return (
    <Card className="p-8 text-center">
      <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Start Your Trust Journey</h3>
      <p className="text-muted-foreground mb-6">
        You haven't claimed any tasks yet. Complete tasks to earn trust points
        and contribute to Future's Edge missions!
      </p>
      <Button asChild>
        <a href="/trust-builder/tasks">Browse Available Tasks</a>
      </Button>
    </Card>
  );
}
```

---

### Dashboard Page Structure (dashboard.astro)

```astro
---
import Layout from '@/layouts/Layout.astro';
import { getCurrentUser } from '@/lib/auth';
import { getDimensionBreakdown, getRecentClaims } from '@/lib/db/queries';
import { TrustScoreCard } from '@/components/trust-builder/TrustScoreCard';
import { ClaimCard } from '@/components/trust-builder/ClaimCard';
import { DashboardEmptyState } from '@/components/trust-builder/DashboardEmptyState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

// Auth guard
const currentUser = await getCurrentUser(Astro.request);
if (!currentUser) {
  return Astro.redirect(
    '/trust-builder/signin?redirect=/trust-builder/dashboard'
  );
}

// Fetch dashboard data
const dimensionBreakdown = await getDimensionBreakdown(currentUser.id);
const recentClaims = await getRecentClaims(currentUser.id);

// Check for success alert (from claim approval redirect)
const successMessage = Astro.url.searchParams.get('success');
const pointsEarned = Astro.url.searchParams.get('points');
---

<Layout title="My Dashboard">
  <div class="max-w-5xl mx-auto py-8 px-4">
    <!-- Success Alert (auto-dismiss via client:load) -->
    {
      successMessage && (
        <Alert variant="default" class="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            🎉 Claim approved! You earned {pointsEarned || '0'} points.
          </AlertDescription>
        </Alert>
      )
    }

    <!-- Member ID + Founding Badge -->
    <div class="flex items-center gap-2 mb-6">
      <h1 class="text-2xl font-bold">Welcome, {currentUser.member_id}</h1>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline">Founding Member 🌟</Badge>
          </TooltipTrigger>
          <TooltipContent>
            Your Member ID is your permanent identity in Future's Edge. When we
            launch on blockchain in April 2026, this ID proves your founding
            contribution and links to your wallet.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- Trust Score Card -->
    <TrustScoreCard
      client:load
      memberId={currentUser.id}
      totalScore={dimensionBreakdown.total}
      dimensions={dimensionBreakdown.dimensions}
    />

    <!-- Recent Claims Section -->
    <section class="mt-8">
      <h2 class="text-xl font-semibold mb-4">Recent Claims</h2>
      {
        recentClaims.length === 0 ? (
          <DashboardEmptyState client:load />
        ) : (
          <div class="grid gap-4">
            {recentClaims.map((claim) => (
              <ClaimCard
                client:load
                claimId={claim.id}
                taskTitle={claim.task_title}
                missionName={claim.mission_name}
                status={claim.status}
                pointsEarned={claim.points_earned}
                submittedAt={claim.submitted_at}
              />
            ))}
          </div>
        )
      }
    </section>

    <!-- CTAs -->
    <div class="mt-8 flex gap-4">
      <Button asChild size="lg">
        <a href="/trust-builder/tasks">Browse Available Tasks</a>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href="/trust-builder/events">View Full Event Log</a>
      </Button>
    </div>
  </div>
</Layout>
```

---

### Apply S1-04 Retro Learnings

**From Retro Action Items**:

1. ✅ **Dimension breakdown visualization** — TrustScoreCard includes BarChart component
2. ✅ **Member ID tooltip** — Explains founding member badge and blockchain link
3. ✅ **Sanctuary messaging** — Empty state says "Start Your Trust Journey" not "No claims found"
4. ✅ **Smart CTAs** — "Browse Tasks" primary, "View Event Log" secondary
5. ✅ **Mobile-responsive** — Card grid stacks vertically, Recharts responsive container

**From S1-03/S1-04 Patterns**:

- Reuse shadcn/ui components (Card, Badge, Alert, Button, Tooltip)
- Use `client:load` for interactive React components
- SSR data fetching (no client-side API calls for initial render)
- Sanctuary error handling (if queries fail, show helpful message)

---

## Error Handling

| Scenario               | Handling                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| Unauthenticated user   | Redirect to `/trust-builder/signin?redirect=/trust-builder/dashboard`   |
| Member not found       | Should never happen (session exists), but show error + signout link     |
| Database query fails   | Show error alert: "Unable to load dashboard. [Retry] [Contact Support]" |
| No claims data         | Show DashboardEmptyState (not an error—expected for new members)        |
| Dimension data missing | Show 0 points with chart placeholder (not an error for new members)     |

---

## Definition of Done (DoD)

- [ ] Dashboard page loads for authenticated members
- [ ] Trust score displays correctly (matches `trust_score_cached`)
- [ ] Dimension breakdown chart shows data from events metadata
- [ ] Recent claims list shows up to 5 claims with correct status badges
- [ ] Empty state displays for new members (0 claims)
- [ ] Success alert shows after claim approval (query parameter)
- [ ] Member ID tooltip explains founding member significance
- [ ] Mobile responsive (tested on 375px width)
- [ ] All acceptance criteria validated by QA
- [ ] No TypeScript compilation errors
- [ ] product-advisor review: Grade B+ or higher
- [ ] Retro file created

---

## Migration Readiness

**Blockchain Considerations**:

- Dashboard shows trust score derived from events (verifiable on-chain)
- Dimension breakdown aggregated from `trust.updated` metadata (matches future on-chain attestations)
- Member ID displayed prominently (will link to wallet address)
- Tooltip educates members about April 2026 migration (sets expectations)

**No Migration Blockers**: Dashboard is a read-only view—no new data structures needed.

---

## Success Metrics (Season 0)

**Engagement Indicators**:

- % of members who visit dashboard within 24h of signup (target: >80%)
- Average time on dashboard page (target: >30 seconds)
- Click-through rate to "Browse Tasks" from empty state (target: >60%)
- Click-through rate to "Browse Tasks" from claims view (target: >30%)

**Trust Building Indicators**:

- Average trust score after 1 week (target: >100 points)
- Dimension diversity (% of members earning points in 3+ dimensions, target: >40%)
- Claim approval rate (target: >85% for auto-approve tasks)

---

## Notes for Developers

### Recharts vs. Custom Chart

**Recommendation**: Use Recharts (already installed) for dimension breakdown:

- BarChart for horizontal comparison
- ResponsiveContainer for mobile scaling
- Built-in accessibility (SVG with ARIA labels)

**Alternative**: If Recharts bundle size is concern, use CSS grid bars:

```tsx
<div className="grid gap-2">
  {Object.entries(dimensions).map(([name, points]) => (
    <div key={name}>
      <div className="flex justify-between text-sm mb-1">
        <span>{name}</span>
        <span>{points} pts</span>
      </div>
      <div className="w-full bg-secondary h-2 rounded">
        <div
          className="bg-primary h-2 rounded"
          style={{ width: `${(points / total) * 100}%` }}
        />
      </div>
    </div>
  ))}
</div>
```

### Success Alert Auto-Dismiss

Implement client-side timeout:

```tsx
import { useEffect, useState } from 'react';

export function SuccessAlert({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <Alert>...</Alert>;
}
```

### Relative Time Formatting

```typescript
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString();
}
```

---

**Created by**: product-owner  
**Date**: 2026-02-09  
**Ready for**: fullstack-developer implementation  
**Estimated Completion**: 2-3 hours
