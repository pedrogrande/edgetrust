# Story S3-02: Member Dashboard & Trust Score Visualization

**Epic**: Member Experience  
**Priority**: HIGH (visible value delivery)  
**Sprint**: 3  
**Estimated Points**: 8  
**Assigned To**: fullstack-developer  
**Strategic Review**: **MANDATORY** (Complex story, 90 min with product-advisor)

---

## Goal

Deliver **member-facing dashboard** that showcases Trust Score, incentive breakdown, and claim history. This is the primary "reward visibility" feature—members see the value they've created. Implements the **Knowledge** dimension (Trust Score derivation from Events).

**Value for Members**: Understand their reputation, see progress toward Steward role, track contributions  
**Value for Organization**: Motivational UX, transparency, validates Trust Score calculation

---

## Complexity (for AI)

**Complex** (1.5-2 days)

**Rationale**:

- Multiple ontology dimensions (People + Knowledge + Events)
- New UI components (dashboard page, charts, tables)
- Complex query (aggregate events by incentive type)
- Cache invalidation strategy (when to recalculate)
- Mobile responsiveness required
- Accessibility considerations (screen readers for charts)

---

## Ontology Mapping

### Primary Dimensions

- **People**: Member profile, role badge, display name
- **Knowledge**: Trust Score (derived from events), incentive breakdown
- **Events**: Query `claim.approved` events for points aggregation

### Secondary Dimensions

- **Things**: Claims (history table shows claim status)
- **Connections**: Task-to-claim relationship (displayed in history)
- **Groups**: Mission context (optional filter for claim history)

### Data Flow

```
Events table (source of truth)
  → Query: SELECT SUM(metadata->>'points_earned') WHERE event_type = 'claim.approved'
  → Trust Score (Knowledge dimension)
  → Cache in members.trust_score_cached (People dimension)
  → Display in Dashboard UI
```

---

## User Story (Gherkin)

```gherkin
Given I am a signed-in member with approved claims
When I navigate to /trust-builder/dashboard
Then I see my current Trust Score prominently displayed
And I see a radial chart of my incentive breakdown (5 dimensions)
And I see a table of my claim history (submitted/under review/approved/revised)
And I see my progress toward Steward role (if I'm a Member)
And I see a "Steward" badge (if I'm promoted)
And the page loads in <2 seconds
And the page is mobile-responsive (375px, 768px, 1024px)
And the page is keyboard-navigable (Tab through interactive elements)
And screen readers announce Trust Score and chart data labels
```

---

## Acceptance Criteria

### Functional Behavior (End-to-End)

- [ ] **AC1**: Dashboard displays member's Trust Score within 2s page load
- [ ] **AC2**: Trust Score matches sum of all `claim.approved` events (verified with test query)
- [ ] **AC3**: Radial chart visualizes 5 incentive dimensions (Participation, Collaboration, Innovation, Leadership, Impact)
- [ ] **AC4**: Chart data accurate (sums metadata.incentives[].points per type)
- [ ] **AC5**: Claim history table shows all member's claims (sortable by date, filterable by status)
- [ ] **AC6**: Clicking a claim row navigates to claim detail page (future story, link placeholder OK)
- [ ] **AC7**: "Recalculate Trust Score" button available (admin-only, rebuilds from events)
- [ ] **AC8**: Recalculated score matches current cached score (validation test passes)

### Ontology Mapping

- [ ] **AC9**: Trust Score derivable from events alone (no dependency on cached value for calculation)
- [ ] **AC10**: Cache updated atomically with claim approval (withTransaction pattern)
- [ ] **AC11**: Event metadata includes points breakdown per incentive type
- [ ] **AC12**: Member role displayed correctly (Member/Steward/Guardian badge)

### State Changes & Events

- [ ] **AC13**: Dashboard load logs `dashboard.viewed` event (metadata: member_id, timestamp, trust_score_at_view)
- [ ] **AC14**: Recalculate button logs `trust_score.recalculated` event (metadata: old_value, new_value, discrepancy_if_any)
- [ ] **AC15**: All event logging inside transactions (atomic with state changes)

### UI/UX Quality

- [ ] **AC16**: Mobile responsive (375px, 768px, 1024px viewports tested)
- [ ] **AC17**: Radial chart legend displays dimension names + point values
- [ ] **AC18**: Progress bar to Steward shows percentage complete (e.g., "180/250 to Steward")
- [ ] **AC19**: Claim history table includes status badges (color-coded: submitted=blue, approved=green, etc.)
- [ ] **AC20**: Empty state for new members: "Complete your first task to earn Trust Score!"

### Accessibility

- [ ] **AC21**: Keyboard navigable (Tab key cycles through all interactive elements)
- [ ] **AC22**: Focus indicators visible (1px border on focused elements)
- [ ] **AC23**: Screen reader announces Trust Score number and dimension labels
- [ ] **AC24**: Chart has `aria-label` with full data breakdown (not just visual)
- [ ] **AC25**: Color contrast meets WCAG 2.1 AA (foreground/background ≥4.5:1)

### Performance

- [ ] **AC26**: Dashboard page loads in <2s (measured with Network throttling: Fast 3G)
- [ ] **AC27**: Trust Score query optimized (indexed on member_id, event_type)
- [ ] **AC28**: Claim history query paginated (default 20 rows, "Load More" button)

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**Page**: `src/pages/trust-builder/dashboard.astro`  
**API Endpoints**:

- `GET /api/trust-builder/dashboard/me` - Returns dashboard data (Trust Score, incentive breakdown, claim history)
- `GET /api/trust-builder/members/[id]/trust-score` - Trust Score breakdown (public, for future leaderboard)
- `POST /api/trust-builder/members/[id]/recalculate-trust-score` - Admin-only, rebuilds from events

**React Components** (`src/components/trust-builder/`):

- `<MemberDashboard />` - Page wrapper, fetches data, layout
- `<TrustScoreCard />` - Big number display, trend icon (±5 from last week)
- `<IncentiveRadarChart />` - Recharts radial chart component
- `<ClaimHistoryTable />` - shadcn/ui Table with sorting, filtering
- `<ProgressToSteward />` - Progress bar (0-250 points)

### Database Queries

**Trust Score Derivation** (single query, fast):

```sql
-- Get total Trust Score from events (source of truth)
SELECT
  COALESCE(SUM((metadata->>'points_earned')::integer), 0) AS trust_score
FROM events
WHERE event_type = 'claim.approved'
  AND (metadata->>'member_id')::uuid = $1;
```

**Incentive Breakdown** (JSON aggregation):

```sql
-- Get points per incentive type
SELECT
  incentive->>'name' AS incentive_name,
  SUM((incentive->>'points')::integer) AS total_points
FROM events,
  LATERAL jsonb_array_elements(metadata->'incentives') AS incentive
WHERE event_type = 'claim.approved'
  AND (metadata->>'member_id')::uuid = $1
GROUP BY incentive->>'name'
ORDER BY total_points DESC;
```

**Claim History** (optimized with JOIN):

```sql
-- Get all claims with task context
SELECT
  c.id,
  c.status,
  c.submitted_at,
  c.reviewed_at,
  t.title AS task_title,
  m.display_name AS mission_name,
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', i.name,
        'points', ti.points
      )
    ), '[]'::jsonb)
    FROM task_incentives ti
    JOIN incentives i ON i.id = ti.incentive_id
    WHERE ti.task_id = c.task_id
  ) AS incentives
FROM claims c
JOIN tasks t ON t.id = c.task_id
JOIN groups m ON m.id = t.group_id
WHERE c.member_id = $1
ORDER BY c.submitted_at DESC
LIMIT 20;
```

**Cache Update** (atomic with claim approval, already implemented in S2-04):

```typescript
// In claim approval transaction
await client.query(
  `
  UPDATE members
  SET trust_score_cached = trust_score_cached + $1
  WHERE id = $2
`,
  [pointsEarned, memberId]
);

// Event logged inside same transaction
await client.query(
  `
  INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
  VALUES ($1, 'claim', $2, 'claim.approved', $3)
`,
  [
    reviewerId,
    claimId,
    {
      member_id: memberId,
      points_earned: pointsEarned,
      trust_score_before: currentScore,
      trust_score_after: currentScore + pointsEarned,
      incentives: [{ name: 'Participation', points: 50 }],
    },
  ]
);
```

### Recharts Radial Chart Example

```typescript
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { dimension: 'Participation', points: 150, fullMark: 200 },
  { dimension: 'Collaboration', points: 80, fullMark: 200 },
  { dimension: 'Innovation', points: 60, fullMark: 200 },
  { dimension: 'Leadership', points: 40, fullMark: 200 },
  { dimension: 'Impact', points: 20, fullMark: 200 }
];

export function IncentiveRadarChart({ data }: { data: typeof data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data} aria-label={`Trust Score breakdown: ${data.map(d => `${d.dimension} ${d.points} points`).join(', ')}`}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" />
        <PolarRadiusAxis angle={90} domain={[0, 200]} />
        <Radar name="Your Trust Score" dataKey="points" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

### shadcn/ui Table Example

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  revision_requested: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800'
};

export function ClaimHistoryTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Complete your first task to earn Trust Score!
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((claim) => (
          <TableRow key={claim.id}>
            <TableCell className="font-medium">{claim.task_title}</TableCell>
            <TableCell>
              <Badge className={statusColors[claim.status]}>
                {claim.status.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell>{new Date(claim.submitted_at).toLocaleDateString()}</TableCell>
            <TableCell>
              {claim.incentives.reduce((sum, i) => sum + i.points, 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### API Endpoint Structure

**`src/pages/api/trust-builder/dashboard/me.ts`**:

```typescript
import type { APIRoute } from 'astro';
import { getSession } from '@/lib/auth/session';
import { query } from '@/lib/db/connection';

export const GET: APIRoute = async ({ request, cookies }) => {
  const session = await getSession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    // Get Trust Score from events (source of truth)
    const {
      rows: [scoreRow],
    } = await query(
      `
      SELECT COALESCE(SUM((metadata->>'points_earned')::integer), 0) AS trust_score
      FROM events
      WHERE event_type = 'claim.approved'
        AND (metadata->>'member_id')::uuid = $1
    `,
      [session.member.id]
    );

    // Get incentive breakdown
    const { rows: breakdown } = await query(
      `
      SELECT
        incentive->>'name' AS incentive_name,
        SUM((incentive->>'points')::integer) AS total_points
      FROM events,
        LATERAL jsonb_array_elements(metadata->'incentives') AS incentive
      WHERE event_type = 'claim.approved'
        AND (metadata->>'member_id')::uuid = $1
      GROUP BY incentive->>'name'
    `,
      [session.member.id]
    );

    // Get claim history (last 20)
    const { rows: claims } = await query(
      `
      SELECT c.*, t.title AS task_title, g.name AS mission_name
      FROM claims c
      JOIN tasks t ON t.id = c.task_id
      JOIN groups g ON g.id = t.group_id
      WHERE c.member_id = $1
      ORDER BY c.submitted_at DESC
      LIMIT 20
    `,
      [session.member.id]
    );

    return new Response(
      JSON.stringify({
        trust_score: scoreRow.trust_score,
        breakdown: breakdown.map((row) => ({
          dimension: row.incentive_name,
          points: row.total_points,
        })),
        claims,
        member: session.member,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load dashboard' }), {
      status: 500,
    });
  }
};
```

### Recalculate Trust Score (Admin Only)

**`src/pages/api/trust-builder/members/[id]/recalculate-trust-score.ts`**:

```typescript
export const POST: APIRoute = async ({ params, cookies }) => {
  const session = await getSession(cookies);
  if (!session || session.member.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
    });
  }

  const memberId = params.id;

  await withTransaction(dbUrl, async (client) => {
    // Calculate from events
    const {
      rows: [calculated],
    } = await client.query(
      `
      SELECT COALESCE(SUM((metadata->>'points_earned')::integer), 0) AS trust_score
      FROM events
      WHERE event_type = 'claim.approved'
        AND (metadata->>'member_id')::uuid = $1
    `,
      [memberId]
    );

    // Get current cached value
    const {
      rows: [member],
    } = await client.query(
      `
      SELECT trust_score_cached FROM members WHERE id = $1
    `,
      [memberId]
    );

    // Update cache
    await client.query(
      `
      UPDATE members SET trust_score_cached = $1 WHERE id = $2
    `,
      [calculated.trust_score, memberId]
    );

    // Log event
    await client.query(
      `
      INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
      VALUES ($1, 'member', $2, 'trust_score.recalculated', $3)
    `,
      [
        session.member.id,
        memberId,
        {
          old_value: member.trust_score_cached,
          new_value: calculated.trust_score,
          discrepancy: calculated.trust_score - member.trust_score_cached,
        },
      ]
    );

    return new Response(
      JSON.stringify({
        old_score: member.trust_score_cached,
        new_score: calculated.trust_score,
        discrepancy: calculated.trust_score - member.trust_score_cached,
      }),
      { status: 200 }
    );
  });
};
```

### Reuse Guidance

- **Layout**: Extend `<Layout>` component from `src/layouts/Layout.astro`
- **Navigation**: Add "Dashboard" link to main nav (if not present)
- **Charts**: Recharts already installed (`package.json`)
- **Tables**: shadcn/ui Table component already available
- **Auth**: Reuse `getSession()` from `src/lib/auth/session.ts`

---

## Definition of Done (DoD)

### Code Quality

- [ ] All acceptance criteria met (26 ACs)
- [ ] TypeScript compiles without errors
- [ ] No character encoding issues
- [ ] Event logging complete (metadata sufficient for reconstruction)
- [ ] Transaction completeness (cache updates atomic with events)

### Ontology Compliance

- [ ] Knowledge dimension correctly mapped (Trust Score derived from Events)
- [ ] People dimension updated (trust_score_cached reflects current state)
- [ ] No new dimensions introduced (reuses existing 6)

### Migration Readiness

- [ ] Trust Score derivable from events alone (tested with recalculate button)
- [ ] Event metadata includes incentive breakdown (per dimension)
- [ ] Cache invalidation strategy documented (when to recalculate)
- [ ] Migration readiness: **90%** (timing for cache updates not on-chain, but derivation is migration-ready)

### Testing

- [ ] Integration tests: 2 API endpoints (`/dashboard/me`, `/members/[id]/recalculate-trust-score`)
- [ ] Unit tests: Trust Score calculator, incentive aggregation
- [ ] Manual tests:
  - Mobile responsive (375px, 768px, 1024px)
  - Keyboard navigation (Tab key)
  - Screen reader (VoiceOver announces chart data)
  - Cross-browser (Chrome, Safari)

### QA Report

- [ ] QA engineer validation: **PASS** (all 26 ACs validated)
- [ ] Grade: A- or higher

### Product-Advisor Review

- [ ] Strategic review completed (90 min, pre-implementation)
- [ ] Grade: A (expected, high complexity story)
- [ ] Migration readiness: 90%+
- [ ] Values alignment: Progress bar motivational, not gatekeeping

### Retrospective

- [ ] Retro file created: `/trust-builder/retros/story-S3-02-member-dashboard-retro.md`
- [ ] Lessons learned documented (chart library issues, query optimization)

---

## Success Metrics

**Quantitative**:

- ✅ Dashboard loads in <2s (measured)
- ✅ Trust Score calculation matches events (validated with test query)
- ✅ 26 acceptance criteria passed
- ✅ Migration readiness: 90%

**Qualitative**:

- ✅ Members report feeling motivated by visible Trust Score
- ✅ Progress bar to Steward creates clear goal
- ✅ Sanctuary culture evident (encouragement, not pressure)

---

## Dependencies

**Upstream**: S3-01 (test infrastructure helps validate queries)  
**Downstream**: S3-04 (role promotion displays Steward badge on dashboard)

---

## Risks & Mitigations

| Risk                          | Likelihood | Impact | Mitigation                            |
| ----------------------------- | ---------- | ------ | ------------------------------------- |
| Recharts configuration issues | Low        | Medium | Extensive docs, fallback to bar chart |
| Query performance slow        | Medium     | Medium | Add indexes on event_type, member_id  |
| Cache desync with events      | Low        | High   | Recalculate button validates accuracy |
| Screen reader chart support   | Medium     | Low    | Use aria-label with full data text    |

---

_Story ready for strategic review. Schedule 90 min pre-implementation session with product-advisor._
