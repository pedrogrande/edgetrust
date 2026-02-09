# Pre-Implementation Review: S1-05 Member Dashboard & Trust Score

**Reviewer**: product-advisor  
**Type**: Pre-implementation spec review  
**Date**: 2026-02-09  
**Story**: S1-05  
**Documents Reviewed**: S1-05-member-dashboard.md, S1-05-HANDOFF.md, schema.sql, trust-builder.ts, S1-04 retro learnings

---

## Summary Assessment

Excellent story spec that thoughtfully applies S1-04 retrospective learnings and demonstrates strong architectural maturity. This is a **read-only, visualization-focused story** with low complexity and high user value. The event-sourced dimension breakdown approach correctly implements the ONE ontology principle that Knowledge is derived from Events.

**Zero critical issues identified.** One medium-priority optimization and one UX enhancement recommended, but neither blocks implementation.

**Pre-Implementation Grade: A-** — Ready to implement as-is. Minor recommendations below will elevate to A+.

---

## Strategic Strengths ✅

### 1. Event-Sourced Architecture Is Correct

**What's Right**: The spec correctly queries `trust.updated` events to derive dimension breakdown, not just displaying `trust_score_cached`.

```typescript
// ✅ CORRECT: Query events for dimension metadata
SELECT metadata->>'dimensions' as dimensions
FROM events
WHERE actor_id = ${memberId}
  AND event_type = 'trust.updated'
```

**Why This Matters**:
- Demonstrates Knowledge dimension: Trust score is derived from Events (verifiable, auditable)
- Matches blockchain migration model: On-chain attestations will use same dimension structure
- Provides reconciliation capability: Can verify `trust_score_cached` matches event sum
- Educational for members: "Your score comes from verified contributions, not arbitrary grants"

**Contrast with Wrong Approach**:
```typescript
// ❌ WRONG: Just query task_incentives
SELECT SUM(points) FROM task_incentives WHERE task_id IN (SELECT task_id FROM claims WHERE member_id = ...)
```
This would break if a claim is rejected after approval (rare but possible in S2) or if trust adjustments happen (slashing, bonuses).

**Lesson**: This story correctly implements "events as source of truth" principle.

---

### 2. S1-04 Retro Learnings Are Systematically Applied

The spec explicitly addresses all 3 retro action items:

| Retro Item | Implementation | Status |
|------------|---------------|--------|
| **Dimension visualization** | TrustScoreCard with Recharts BarChart | ✅ Implemented |
| **Member ID tooltip** | Founding member badge with blockchain explanation | ✅ Implemented |
| **Sanctuary messaging** | "Start Your Trust Journey" for empty state | ✅ Implemented |

**Additional Patterns Applied**:
- Smart CTAs (Browse Tasks primary, Event Log secondary) — from S1-04 UX learnings
- Status badges with icons (✓ ⏱ ✗) — from S1-04 ClaimCard patterns
- Mobile-responsive cards — from S1-03/S1-04 layouts
- SSR data fetching — from all previous stories

**Why This Matters**: The team is **learning and iterating**, not just copying previous implementations. This shows process maturity.

---

### 3. Ontology Compliance Is Crystal Clear

**Groups**: Mission names on claim cards (read-only context) ✅  
**People**: Member identity, "Welcome, {member_id}" language ✅  
**Things**: Task titles displayed (owned by missions) ✅  
**Connections**: Claims shown with member→task relationship ✅  
**Events**: Trust score derived from `trust.updated` events ✅  
**Knowledge**: Dimension breakdown aggregated from event metadata ✅

No ontology confusion. Claims correctly treated as Connections (not Things), Knowledge correctly derived from Events.

---

### 4. Sanctuary UX Is Architected Into Spec

**Empty State**:
```tsx
"You haven't claimed any tasks yet. Complete tasks to earn trust points 
and contribute to Future's Edge missions!"
```
✅ Supportive, actionable, aspirational (not "No data" or "Claims list empty")

**Status Differentiation**:
- Approved: "Points earned: 60" (celebrates achievement)
- Pending: "A reviewer will evaluate your work soon" (sets positive expectation)
- Rejected: "Rejected ✗" (factual, not punitive—S2 will add "Learn why" link)

**Founding Member Badge**:
```
"Your Member ID is your permanent identity in Future's Edge. 
When we launch on blockchain in April 2026, this ID proves your 
founding contribution and links to your wallet."
```
✅ Educational, values-aligned, creates ownership/pride

**Why This Matters**: UX tone is treated as a technical requirement, not an afterthought. This is the correct mindset for sanctuary design.

---

## Issues Found

### High Priority: DimensionBreakdown Type Mismatch

**Issue**: The S1-05 spec defines dimension breakdown using `Record<string, number>`, but `trust-builder.ts` line 248 defines `DimensionBreakdown` with explicit fields:

```typescript
// Existing type (trust-builder.ts)
export interface DimensionBreakdown {
  participation: number;
  collaboration: number;
  innovation: number;
  leadership: number;
  impact: number;
}

// S1-05 spec expects (line 189)
const breakdown: Record<string, number> = {};
```

**Problem**: 
1. TypeScript will throw error if `getDimensionBreakdown()` returns `{ total, dimensions: Record<string, number> }` but declares return type `DimensionBreakdown`
2. The existing type has 5 specific dimensions, but S1-05 spec loops through whatever dimensions exist in event metadata (more flexible)
3. If S1-04 event metadata uses different dimension keys (e.g., "group_admin" instead of "leadership"), existing type won't match

**Root Cause**: Type was likely created in S1-01 schema setup, but S1-04 claim engine creates dimensions dynamically from task incentives. There's a disconnect between the static type and dynamic event structure.

**Two Solutions**:

**Option A: Use Dynamic Type** (Recommended for S1)
```typescript
// In trust-builder.ts, replace existing DimensionBreakdown with:
export interface DimensionBreakdown {
  total: number;
  dimensions: Record<string, number>;
}
```
**Pros**: Flexible, matches actual event structure, works with any dimension names  
**Cons**: Less type-safe (can't autocomplete dimension names)

**Option B: Enforce Static Dimensions** (Better for S2+)
```typescript
// Keep existing type, but getDimensionBreakdown ensures all 5 keys exist:
export async function getDimensionBreakdown(memberId: string): Promise<DimensionBreakdown> {
  // ... aggregate from events
  return {
    participation: breakdown.participation || 0,
    collaboration: breakdown.collaboration || 0,
    innovation: breakdown.innovation || 0,
    leadership: breakdown.leadership || 0,
    impact: breakdown.impact || 0,
  };
}
```
**Pros**: Type-safe, forces canonical dimension names  
**Cons**: Tight coupling to dimension list (hard to add new dimensions)

**Recommendation**: 
1. **For S1-05**: Use Option A (dynamic type). Update `DimensionBreakdown` interface in `trust-builder.ts` to match spec.
2. **For S2**: Standardize dimension taxonomy (decide canonical 5-6 dimensions), then migrate to Option B.

**Priority**: High—this will cause TypeScript compilation errors if not fixed.

**Impact**: Blocks implementation until resolved.

---

### Medium Priority: Dimension Breakdown Query Efficiency

**Issue**: The `getDimensionBreakdown()` function loops through all `trust.updated` events for a member and aggregates in application code:

```typescript
// Current spec
for (const row of result) {
  const dims = JSON.parse(row.dimensions);
  for (const [key, value] of Object.entries(dims)) {
    breakdown[key] = (breakdown[key] || 0) + (value as number);
  }
}
```

**Problem**: For a member with 50 approved claims, this:
1. Fetches 50 rows from database
2. Parses 50 JSON objects in Node.js
3. Loops through dimension keys 50 times

**More Efficient Approach** (PostgreSQL-native aggregation):

```sql
SELECT 
  jsonb_object_agg(dimension, total_points) as dimensions,
  SUM(total_points) as total
FROM (
  SELECT 
    dimension_key as dimension,
    SUM((metadata->'dimensions'->>dimension_key)::integer) as total_points
  FROM events,
    jsonb_object_keys(metadata->'dimensions') as dimension_key
  WHERE actor_id = $1
    AND event_type = 'trust.updated'
    AND metadata ? 'dimensions'
  GROUP BY dimension_key
) dimension_totals;
```

**Benefits**:
- Database does aggregation (faster than Node.js loops)
- Single row returned (not N rows)
- Less bandwidth between DB and server
- More idiomatic PostgreSQL (JSONB operators are optimized)

**Impact**: 
- **Low impact for S1** (members have 1-5 claims, negligible difference)
- **Medium impact for S2+** (members with 50+ claims, 5-10ms saved per query)
- **Good architectural practice** (leverage DB for what it's best at)

**Priority**: Medium—nice to have for S1, more important for scale.

**Recommendation**: Implement efficient version if developer is comfortable with JSONB operators. Otherwise, current approach is acceptable for S1 MVP.

---

### Low Priority: Success Alert Accessibility

**Issue**: Success alert uses emoji (🎉) which may not render on all devices or be announced correctly by screen readers.

**Current**:
```tsx
<AlertDescription>
  🎉 Claim approved! You earned {pointsEarned} points.
</AlertDescription>
```

**More Accessible**:
```tsx
<AlertDescription>
  <span aria-label="Celebration">🎉</span>
  Claim approved! You earned {pointsEarned} points.
</AlertDescription>
```

Or use icon component:
```tsx
<CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Success" />
Claim approved! You earned {pointsEarned} points.
```

**Impact**: Minor—most users will see emoji fine, but screen reader users may hear "emoji 1F389" instead of "celebration."

**Priority**: Low—doesn't block S1, consider for S2 accessibility pass.

---

## What Could Be Enhanced (Optional)

### 1. "View Claim Details" Link Not Yet Implemented

**Observation**: Scenario 4 mentions:
```gherkin
And I see a "View Details" link to see my submitted proof
```

But the ClaimCard component pseudocode doesn't include this link.

**Gap**: Members can't revisit their submitted proof text after claiming.

**S1 Decision**: Acceptable to defer to S1-06 or S2. Dashboard focus is "status overview," not "proof review."

**S2 Enhancement**: Add `/trust-builder/claims/{claim_id}` page showing:
- Task details
- Submitted proof text per criterion
- Review notes (if approved/rejected by human)
- Submission timestamp
- Approval/rejection timestamp

**Recommendation**: Note this as a known limitation in DoD. Not blocking for S1-05.

---

### 2. Dimension Chart Could Use Data Table Fallback

**Observation**: AC UX-5 mentions "data table alternative" for accessibility, but spec only provides chart.

**Current**: Recharts only (visual-only representation).

**Accessible Enhancement**:
```tsx
{totalScore > 0 && (
  <>
    <ResponsiveContainer>
      <BarChart>...</BarChart>
    </ResponsiveContainer>
    
    {/* Data table for screen readers */}
    <table className="sr-only">
      <caption>Trust score breakdown by dimension</caption>
      <thead>
        <tr>
          <th>Dimension</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(dimensions).map(([name, points]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
)}
```

**Priority**: Low—Recharts generates SVG with ARIA labels (partially accessible). Full data table is a nice-to-have.

**Recommendation**: Safe to defer to S2 accessibility audit.

---

### 3. No Loading State for Slow Queries

**Observation**: Dashboard fetches data via SSR, which blocks page render.

**Scenario**: If Neon database is cold-starting or under load, member waits 2-3 seconds for page.

**Current Behavior**: Blank screen until SSR completes.

**Better UX** (defer to S2):
1. **Skeleton states**: Show card placeholders while loading (requires client-side fetch)
2. **Streaming SSR**: Astro 5 supports streaming, could render shell then stream data
3. **Loading spinner**: Simple fallback for slow connections

**S1 Decision**: Acceptable—database queries are fast (<100ms typical), SSR is simpler than client hydration.

**S2 Enhancement**: If dashboard becomes slow, add skeleton loaders or streaming.

**Recommendation**: Monitor dashboard load times in production. If >500ms consistently, optimize in S2.

---

## Dimensional Analysis

### Groups

**Finding**: Mission names displayed on claim cards as read-only context.

**Assessment**: ✅ Correct. Dashboard doesn't manage groups, just displays mission context for claims. This is ontologically appropriate—missions are Things that own Tasks, claims reference missions transitively.

**Grade**: A — Proper read-only relationship

---

### People

**Finding**: Member identity central to every view. "Welcome, {member_id}" greeting, "You" language throughout.

**What Works**:
- Member ID prominently displayed with educational tooltip
- Founding member badge creates sense of ownership and pride
- Dashboard is member-scoped (can't see other members' dashboards)
- Auth guard ensures only authenticated members can access

**Sanctuary Alignment**:
- Empty state addresses member directly: "You haven't claimed any tasks yet"
- Success alert celebrates achievement: "You earned 60 points!"
- Tooltip educates about migration: "this ID proves your founding contribution"

**Grade**: A — Member-centric design with sanctuary values

---

### Things

**Finding**: Tasks displayed on claim cards (title, mission association).

**Assessment**: ✅ Correct read-only relationship. Dashboard shows which Tasks member has engaged with (via Claims), but doesn't manage Tasks themselves.

**Note**: Task state isn't shown on dashboard (could be enhancement: "Task now Complete" if max_completions reached).

**Grade**: A — Appropriate Thing reference

---

### Connections

**Finding**: Claims are the primary Connection displayed.

**What Works**:
- Claims shown as member→task relationship with status lifecycle
- ClaimCard displays connection metadata: submission date, approval date
- Status badges communicate connection state (submitted, approved, rejected)
- Empty state acknowledges zero connections: "You haven't claimed any tasks yet"

**Ontology Correctness**: Claims correctly treated as Connections (linking member to task), not standalone Things.

**Grade**: A — Clean Connection modeling

---

### Events

**Finding**: Trust score derived from `trust.updated` events.

**What Works**:

1. **Event-Sourced Dimension Breakdown**:
```sql
SELECT metadata->>'dimensions' as dimensions
FROM events
WHERE event_type = 'trust.updated' AND actor_id = ${memberId}
```
This queries the immutable event ledger, not derived tables.

2. **Demonstrates Verifiability**:
- Member's trust score can be independently verified by summing event metadata
- Dashboard shows "where your score comes from" (dimension breakdown)
- If trust_score_cached ever diverges, events are authoritative source

3. **Migration-Ready Structure**:
- Dimension metadata in events matches on-chain attestation format
- Each event represents a verifiable contribution (claim approval)
- Event timestamps enable historical trust score reconstruction

**Why This Is Excellent**:
- Most dashboards would just query `SELECT trust_score_cached FROM members`
- This spec correctly implements "events as source of truth" principle
- Demonstrates to members that trust is earned (visible contributions), not granted arbitrarily

**Grade**: A+ — Exemplary event-sourced architecture

---

### Knowledge

**Finding**: Trust score and dimension analytics are derived Knowledge.

**What Works**:

1. **Derived, Not Arbitrary**:
- Trust score = SUM(events where event_type='trust.updated')
- Dimension breakdown = Aggregate of event metadata dimensions
- Always reconstructible from event log

2. **Cached for Performance**:
- `trust_score_cached` on members table speeds up leaderboard queries
- Dashboard shows both cached total AND event-derived breakdown
- If cache is stale, events are authoritative

3. **Insights from Aggregation**:
- Dimension chart shows members which areas they've contributed to
- Empty state for new members (0 points) is informative, not punitive
- Future: Dimension diversity metric ("You're strongest in Participation")

**Migration Readiness**:
- On-chain trust score will be Merkle root of dimension attestations
- Dashboard already displays dimension-level detail (educates members for migration)
- Cache reconciliation script can verify: `trust_score_cached = SUM(events.metadata->points_added)`

**Grade**: A — Knowledge correctly modeled as derived truth

---

## Migration Readiness

### Genesis Trail Compatibility: ✅ A

**What's Already Right**:
1. Dashboard shows trust score derived from events (matches on-chain model)
2. Dimension breakdown from event metadata (enables per-dimension attestations)
3. Member ID prominently displayed (will link to wallet address)
4. Founding member badge educates about migration (sets expectation)

**No Migration Blockers**: Dashboard is read-only view of existing data structures. No new tables, no new event types.

**Educational Value**: The tooltip explaining Member ID significance and blockchain migration is **strategic communication**:
```
"When we launch on blockchain in April 2026, this ID proves your 
founding contribution and links to your wallet."
```

This prepares members psychologically for the migration, making it feel like a natural evolution rather than a disruptive change.

**Grade**: A — Dashboard supports migration narrative

---

## Technical Quality

### SSR Architecture: ✅ Correct

**Pattern**:
```astro
const dimensionBreakdown = await getDimensionBreakdown(currentUser.id);
const recentClaims = await getRecentClaims(currentUser.id);
```

**Benefits**:
- Data fetched server-side (no client API calls)
- Faster initial render (no loading spinners)
- SEO-friendly (though dashboard is auth-gated)
- Simpler error handling (catch in SSR, show error page)

**Trade-off**: Page blocks on slow queries. Acceptable for S1 (queries are fast).

**Grade**: A — SSR pattern is correct for this use case

---

### TypeScript Types: ⚠️ Type Mismatch Found

**Spec Expects**:
```typescript
const breakdown: Record<string, number> = {};
return { total, dimensions: breakdown };
```

**Actual Type Definition** (trust-builder.ts:248):
```typescript
export interface DimensionBreakdown {
  participation: number;
  collaboration: number;
  innovation: number;
  leadership: number;
  impact: number;
}
```

**Problem**: Spec's dynamic `Record<string, number>` doesn't match existing static interface with 5 named fields. This will cause TypeScript compilation errors.

**Solution**: Update `DimensionBreakdown` type to:
```typescript
export interface DimensionBreakdown {
  total: number;
  dimensions: Record<string, number>;
}
```

This matches the spec's flexible approach and works with dynamic dimension names from event metadata.

**Grade**: B — Type mismatch needs resolution before implementation

---

### Component Architecture: ✅ Clean Separation

**Modularity**:
- TrustScoreCard: Trust score + dimension chart (reusable for leaderboard)
- ClaimCard: Individual claim display (reusable for full claims list page)
- DashboardEmptyState: Empty state handling (reusable for other empty states)

**Client Hydration**:
- Interactive components use `client:load` (Recharts, auto-dismiss alert)
- Static content server-rendered (faster initial paint)

**Props Are Well-Typed**:
```typescript
interface ClaimCardProps {
  claimId: string;
  taskTitle: string;
  status: 'submitted' | 'approved' | 'rejected';
  // .**High** | DimensionBreakdown type mismatch | Update type in `trust-builder.ts` to `{ total: number; dimensions: Record<string, number> }` before implementation (BLOCKS compilation) |
| 2 | Medium | Dimension query efficiency | Use PostgreSQL JSONB aggregation instead of Node.js loops (nice-to-have for S1, important for scale) |
| 3 | Low | Success alert accessibility | Add `aria-label` to emoji or use icon component (defer to S2 accessibility audit) |
| 4 | Low | View claim details link mentioned but not implemented | Note as known limitation, defer to S2 (dashboard is "status overview" not "proof review") |
| 5 | Low | Data table fallback for chart | Add `sr-only` table for screen readers (defer to S2 accessibility audit) |

**Critical Path**: Issue #1 (type mismatch) must be resolved before implementation. The type update is a 30-second fix but will prevent TypeScript compilation error
---

## Recommendations Summary

| # | Priority | Issue | Recommendation |
|---|----------|-------|----------------|
| 1 | Medium | Dimension query efficiency | Use PostgreSQL JSONB aggregation instead of Node.js loops (nice-to-have for S1, important for scale) |
| 2 | Low | Success alert accessibility | Add `aria-label` to emoji or use icon component (defer to S2 accessibility audit) |
| 3 | Low | View claim details link mentioned but not implemented | Note as known limitation, defer to S2 (dashboard is "status overview" not "proof review") |
| 4 | Low | Data table fallback for chart | Add `sr-only` table for screen readers (defer to S2 accessibility audit) |

**None of these block S1-05 implementation.** They're all enhancements for future iterations.

---

## Risk Assessment

**Technical Risks**: 🟢 LOW
- All queries are read-only (no data corruption risk)
- No transactions (no atomicity concerns)
- Recharts already installed (no new dependencies)
- Patterns reused from S1-03/S1-04 (proven stable)

**UX Risks**: 🟢 LOW
- Empty state messaging is supportive (sanctuary-aligned)
- Status badges are clear (icons + text)
- Mobile responsive (Tailwind utilities)
- Success alert timeout (5 seconds) is reasonable

**Performance Risks**: 🟡 MEDIUM (for scale, not S1)
- Dimension query loops through events in Node.js (acceptable for <10 claims, suboptimal for 50+)
- Recharts bundle size (~50KB gzipped, only on dashboard page)
- SSR blocks on slow queries (rare with Neon, but possible on cold start)

**Mitigation**: Monitor dashboard load times in production. Optimize queries if >500ms.

**Ontology Risks**: 🟢 NONE
- Event-soB+

**Rationale**:

S1-05 is a **well-architected, strategically strong story** that thoughtfully applies S1-04 retrospective learnings and correctly implements event-sourced Knowledge derivation. The sanctuary UX patterns are strong, the ontology compliance is clear, and the migration readiness is excellent.

**However**, there is one **High Priority** issue that must be resolved before implementation: the `DimensionBreakdown` type mismatch between the spec (dynamic `Record<string, number>`) and the existing type definition (static 5 fields). This will cause TypeScript compilation errors.

**Why B+ (not A- or A)**:
- **A** requires zero blocking issues
- **A-** allows minor optimizations but no technical blockers
- **B+** reflects "excellent strategic thinking with one critical technical oversight"

The type mismatch is a simple 30-second fix (update one interface definition), but it's a **blocker** that prevents the spec from being implementation-ready as written.

**What Elevates This to B+** (vs B or lower):
1. ✅ Event-sourced dimension breakdown (demonstrates architectural maturity)
2. ✅ All S1-04 retro learnings systematically applied (shows learning velocity)
3. ✅ Sanctuary UX patterns architected into spec (not afterthought)
4. ✅ Migration-ready structure (educates members about blockchain)
5. ✅ Clean component architecture (reusable, testable)

**What Would Elevate to A-**:
- ✅ Fix `DimensionBreakdown` type mismatch (30 seconds)
- Implement efficient dimension query (PostgreSQL aggregation)

**Confidence Level**: Very High

This spec has excellent strategic thinking and strong architecture. Once the type mismatch is resolved (trivial fix), it will be A- quality and ready for implementation
2. ✅ All S1-04 retro learnings systematically applied (shows learning velocity)
3. ✅ Sanctuary UX patterns architected into spec (not afterthought)
4. ✅ Migration-ready structure (educates members about blockchain)
5. ✅ Clean component architecture (reusable, testable)

**What Would Elevate to A**:
- Implement efficient dimension query (PostgreSQL aggregation)
- Add data table fallback for chart (accessibility)
- Pre-implement "View Details" link (reduces S2 scope)

**Confidence Level**: Very High

This spec is ready for implementation. The only recommendation is the dimension query optimization, which is nice-to-have for S1 but becomes more important as claims scale.

---⚠️ **CONDITIONAL APPROVAL - REQUIRES TYPE FIX**

**Blocker**: `DimensionBreakdown` type mismatch must be resolved before implementation begins.

**Two Options**:

### Option 1: Product-Owner Fixes Type (Recommended)
1. Product-owner updates `trust-builder.ts` line 248-254:
```typescript
export interface DimensionBreakdown {
  total: number;
  dimensions: Record<string, number>;
}
```
2. After fix, **APPROVE FOR IMPLEMENTATION** immediately
3. No other changes needed to S1-05 spec

**Time**: 30 seconds  
**Risk**: None (simple type update)

### Option 2: Developer Fixes Type During Implementation
1. Include type fix as first task in implementation
2. Developer updates type before writing dashboard code
3. Proceed with rest of spec as written

**Time**: 1 minute  
**Risk**: Low (developer might forget and hit compilation error mid-implementation)

**Recommendation**: Option 1 (product-owner fixes now). Keeps spec and types in sync before handoff.

### After Type Fix:
1. Developer implements dashboard using handoff doc patterns
2. QA validates against 20 acceptance criteria
3. product-advisor conducts post-implementation review (expecting Grade A-
**Next Steps**:
1. Developer implements dashboard using handoff doc patterns
2. QA validates against 20 acceptance criteria
3. product-advisor conducts post-implementation review (expecting Grade A)
4. Retro captures learnings for S1-06 and Sprint 2

**Sprint 1 Status**: S1-05 is the final user-facing feature. After this, only S1-06 (Event Ledger UI) remains, which is a simple read-only view of the events table.

---

**Strategic Notes for Product Owner**

S1-05 demonstrates the team has **internalized the ONE ontology**:
- Knowledge is derived from Events (not arbitrary)
- Claims are Connections (relationships, not standalone entities)
- Trust is earned through verifiable contributions (not granted)

When Future's Edge leadership asks "Will members understand the blockchain migration?", point to the founding member badge tooltip—we're educating members about their portable identity **before** migration happens.

The dimension breakdown visualization is also strategic: it shows members **where** they're contributing (Participation vs. Innovation vs. Governance), which will map directly to on-chain attestation categories. This makes the April 2026 migration feel like a natural evolution, not a disruptive change.

**Well-designed story.** Ready to build.

---

**Reviewed by**: product-advisor  
**Date**: 2026-02-09  
**Confidence Level**: Very High  
**Next Step**: fullstack-developer implementation
