# Component Registry - Trust Builder

**Purpose**: Fast lookup for reusable React components to prevent rediscovery waste  
**Last Updated**: 12 February 2026 (Sprint 3 complete)  
**Update Trigger**: After each story that introduces new reusable components

---

## 🎯 Quick Lookup

**Time savings in Sprint 3**: 5-7 hours through component reuse  
**Problem solved**: S3-04 spent 30 min searching for ProgressToSteward (now 0 min with this registry)

---

## Dashboards & Layouts

### `MemberDashboard.tsx`

**Created**: Story S3-02  
**Location**: `/src/pages/trust-builder/dashboard.astro`  
**Purpose**: Member stats overview, Trust Score, task history  
**Props**: None (fetches data via API on page load)

**Reuse when**: Building member-facing dashboard sections or extending dashboard

### `DashboardCard.tsx`

**Created**: Story S3-02  
**Location**: `/src/components/trust-builder/DashboardCard.tsx`  
**Purpose**: Card wrapper with title, description, optional actions  
**Props**:

```typescript
interface DashboardCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode; // Optional button/link in header
}
```

**Reuse when**: Any card-based layout (dashboard sections, admin panels, list views)

**Reused in**: S3-03 (admin page), S3-04 (promotion page)

---

## Progress & Status

### `ProgressToSteward.tsx`

**Created**: Story S3-02  
**Location**: `/src/components/trust-builder/ProgressToSteward.tsx`  
**Purpose**: Progress bar showing path to 250 Trust Score points  
**Props**:

```typescript
interface ProgressToStewardProps {
  currentPoints: number;
  targetPoints?: number; // Default 250
  showLabel?: boolean; // Default true
}
```

**Reuse when**: Showing member progress toward role promotion

**Reused in**: S3-04 (role promotion page)  
**Time saved**: 2-3 hours in S3-04 (no rebuild needed)

### `OrphanedClaimsBadge.tsx`

**Created**: Story S3-03  
**Location**: `/src/components/trust-builder/OrphanedClaimsBadge.tsx`  
**Purpose**: Badge with orphaned claim count + dialog launcher  
**Props**:

```typescript
interface OrphanedClaimsBadgeProps {
  count: number;
  onClick: () => void; // Opens dialog with details
}
```

**Reuse when**: Admin/reviewer workflows needing attention badges

**Future use**: Reviewer dashboard (S4 candidate)

### `PromotionToast.tsx`

**Created**: Story S3-04  
**Location**: `/src/components/trust-builder/PromotionToast.tsx`  
**Purpose**: Celebration toast for role promotions (sanctuary messaging built-in)  
**Props**:

```typescript
interface PromotionToastProps {
  memberName: string;
  oldRole: 'member' | 'steward' | 'guardian';
  newRole: 'steward' | 'guardian';
}
```

**Reuse when**: Any role promotion trigger (threshold-based or admin override)

**Sanctuary pattern**: "Your role is to **help them succeed**, not gatekeep" (cultural messaging embedded)

---

## Forms & Inputs

_No reusable form components created in Sprint 3. Future components will be documented here._

**S4 Candidates**:

- Email input with magic link validation
- Mission selection dropdown
- Claim submission form

---

## Admin & Reviewer Tools

### `OrphanedClaimsDialog.tsx`

**Created**: Story S3-03  
**Location**: `/src/components/trust-builder/OrphanedClaimsDialog.tsx` (integrated with badge)  
**Purpose**: Dialog showing orphaned claim details with bulk release action  
**Props**:

```typescript
interface OrphanedClaimsDialogProps {
  claims: OrphanedClaim[];
  onRelease: (claimIds: string[]) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Reuse when**: Admin workflows with bulk actions on claim lists

**Sanctuary pattern**: "Life happens!" messaging, release not penalize

---

## How to Use This Registry

### When Planning Stories (Product Owner)

In **Implementation Notes** section of story:

```markdown
## Reusable Components (from prior stories)

- DashboardCard (S3-02): Use for card-based admin page layout
- ProgressToSteward (S3-02): Show member progress to 250 points
- (See `/project/trust-builder/patterns/component-registry.md` for full list)
```

### When Implementing (Fullstack Developer)

1. Check this registry BEFORE building new components
2. Import and reuse if exists:
   ```typescript
   import { DashboardCard } from '@/components/trust-builder/DashboardCard';
   import { ProgressToSteward } from '@/components/trust-builder/ProgressToSteward';
   ```
3. If building new reusable component, add to this registry after story completion

### When Reviewing (QA Engineer / Product Advisor)

- Check if story references reusable components (saves 1-3 hours per story)
- Flag to product-owner if obvious reuse opportunity was missed

---

## Component Design Principles

**For a component to be "registry-worthy"**:

1. **Self-contained**: No tight coupling to parent component state
2. **Clear props interface**: TypeScript props with JSDoc comments
3. **Reusable across stories**: Not one-off implementation
4. **Sanctuary-aligned**: If messaging included, uses supportive language
5. **Documented origin**: Story ID in this registry for traceability

**Anti-pattern**: Registering components with hardcoded business logic (e.g., fetching specific API endpoints inside component)

---

## Update Checklist

After each story completion, **retro-facilitator** or **product-owner** should:

- [ ] Review story implementation for new reusable components
- [ ] Add components to appropriate section (Dashboards, Progress, Forms, Admin)
- [ ] Document props interface with TypeScript signature
- [ ] Note which story created it and which stories reused it
- [ ] Update "Last Updated" date at top of file
- [ ] Commit changes: `git commit -m "docs(registry): Add components from Story S#-##"`

---

## Metrics

**Sprint 3 Component Reuse**:

- ProgressToSteward: 1 creation + 1 reuse = **2-3 hours saved**
- DashboardCard: 1 creation + 2 reuses = **3-4 hours saved**
- **Total**: 5-7 hours saved across 4 stories

**Sprint 4 Target**: 8-10 hours saved (as pattern library grows)
