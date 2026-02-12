# Story S4-01: Admin Configuration UI

**Epic**: Foundation & Infrastructure  
**Priority**: HIGH (unblocks S5 automation stories)  
**Sprint**: 4  
**Estimated Points**: 3  
**Complexity**: Simple  
**Assigned To**: fullstack-developer  
**Strategic Review**: Optional (straightforward CRUD pattern)

---

## Goal

Create admin interface for managing system configuration values (timeout thresholds, Trust Score thresholds) without code deployments. This moves hardcoded values into a database table, enabling compassionate threshold adjustments and achieving 95% → 98% migration readiness.

**Value for Admins**: Configure timeouts and thresholds without developer intervention  
**Value for Organization**: Adaptive policies, audit trail for config changes, migration readiness  
**Value for Members**: Transparent governance (config changes visible in event log)

---

## Complexity (for AI)

**Simple** (4-6 hours)

**Rationale**:

- Established pattern (CRUD + event logging from S2-02, S3-04)
- Single-column form layout (UI-layout-pattern.md established)
- Clear business logic (no complex validation)
- Minimal new schema (`system_config` table)
- Reuses existing admin authorization patterns

---

## Ontology Mapping

### Primary Dimensions

- **Knowledge**: `system_config` table as Knowledge entity (organizational intelligence)
- **Events**: Config change events logged in event ledger
- **People**: Admin as actor (existing authorization)

### Secondary Dimensions

- **Things**: Configuration keys represented as entities with states (active values)

### Data Flow

```
Admin visits /trust-builder/admin/config
  → Fetches current config values from system_config table
  → Displays editable form (single-column layout)
Admin updates threshold value (e.g., 7 days → 10 days)
  → POST /api/trust-builder/admin/config
  → UPDATE system_config SET value = $1 WHERE key = $2
  → INSERT events (config.updated, with before/after metadata)
  → Success toast: "Configuration updated"
Admin views event log
  → Sees "Config: claim_timeout_days changed from 7 → 10 by [admin name]"
```

---

## User Story (Gherkin)

```gherkin
Given I am an Admin
When I visit /trust-builder/admin/config
Then I see a configuration form with current values:
  - Claim timeout (days): 7
  - Trust Score: Steward threshold: 250
  - Trust Score: Admin threshold: 1000

When I change "Claim timeout (days)" from 7 to 10
And I click "Save Configuration"
Then the system saves the new value to system_config table
And logs an event: "config.updated" with metadata (key, old_value, new_value, admin_id)
And I see a success message: "Configuration updated successfully"

When another admin reviews the event log
Then they see: "Admin [name] changed claim_timeout_days from 7 to 10 on Feb 12, 2026"

Given I am a Member (non-admin)
When I try to access /trust-builder/admin/config
Then I am redirected to my dashboard
And I see a message: "Admin access required"
```

---

## Acceptance Criteria

### Functional

- [ ] **AC1**: `system_config` table created with columns: `key` (TEXT PRIMARY KEY), `value` (JSONB), `description` (TEXT), `updated_at` (TIMESTAMPTZ)
- [ ] **AC2**: Initial config values seeded:
  - `claim_timeout_days`: 7 (description: "Days before orphaned claim is auto-released")
  - `steward_threshold`: 250 (description: "Trust Score required for Steward role")
  - `admin_threshold`: 1000 (description: "Trust Score required for Admin role (future)")
- [ ] **AC3**: Admin can update config values via UI
- [ ] **AC4**: Config updates are atomic (transaction with event logging)
- [ ] **AC5**: All existing code updated to read from `system_config` table instead of hardcoded values
- [ ] **AC6**: Config changes logged as events with metadata: `{ key, old_value, new_value, admin_id, timestamp }`
- [ ] **AC7**: Non-admin users cannot access config page (403 or redirect)

### Layout & UX (refer to `/project/trust-builder/patterns/UI-layout-pattern.md`)

- [ ] **AC8**: One clear primary action per screen: "Save Configuration" button (`variant="default"`)
- [ ] **AC9**: Related elements visually grouped: Config fields in single Card, section headers for categories
- [ ] **AC10**: Information hierarchy obvious: Page title visible without scrolling, current values displayed before edit fields
- [ ] **AC11**: Mobile responsive (375px): Form stacks gracefully, no awkward horizontal scroll
- [ ] **AC12**: Sanctuary feel: Comfortable spacing between fields, help text for each config (e.g., "This affects auto-release timing for orphaned claims")

### Quality

- [ ] **AC13**: Form validation: Numeric fields accept only positive integers, helpful error messages
- [ ] **AC14**: Success/error feedback: Toast notification on save (success or failure with specific error)
- [ ] **AC15**: Accessibility: Keyboard navigation works, focus order matches visual order, labels associated with inputs

---

## Testing Schedule

**Day 2 Manual Testing** (30 min allocated):

- Desktop: Chrome at 1024px (form layout)
- Mobile: Safari on iPhone at 375px (field stacking)

**Validation**:

- Save button reachable without scrolling
- All labels readable at 375px width
- No horizontal scroll on mobile
- Form validation messages appear near relevant fields

---

## Environment Setup

**Before implementation, verify**:

1. Run `echo $DATABASE_URL` in terminal where dev server runs
2. Confirm database connection (dev branch vs production)
3. Document which database is being used for this story

**Expected**: Production database for dev server (per S3 learnings)

---

## Reusable Components (from prior stories)

- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` (S1-05): Layout structure
- `<Button>` (S1-04): Primary action styling
- `<Input>`, `<Label>` (S2-02): Form fields
- `useToast` hook (S1-04): Success/error notifications

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**Database Migration** (`src/lib/db/migrations/008_system_config.sql`):

```sql
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial values
INSERT INTO system_config (key, value, description) VALUES
  ('claim_timeout_days', '7', 'Days before orphaned claim is auto-released'),
  ('steward_threshold', '250', 'Trust Score required for Steward role promotion'),
  ('admin_threshold', '1000', 'Trust Score required for Admin role (future use)')
ON CONFLICT (key) DO NOTHING;
```

**API Route** (`src/pages/api/trust-builder/admin/config.ts`):

GET: Fetch all config values

```typescript
export async function GET({ locals }: APIContext) {
  const member = locals.member;
  if (member.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
    });
  }

  const configs = await db.query(
    'SELECT key, value, description FROM system_config ORDER BY key'
  );
  return new Response(JSON.stringify({ configs: configs.rows }), {
    status: 200,
  });
}
```

POST: Update config value

```typescript
export async function POST({ request, locals }: APIContext) {
  const member = locals.member;
  if (member.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
    });
  }

  const { key, value } = await request.json();

  return await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
    // Fetch old value
    const {
      rows: [oldConfig],
    } = await client.query('SELECT value FROM system_config WHERE key = $1', [
      key,
    ]);

    // Update config
    await client.query(
      'UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = $2',
      [JSON.stringify(value), key]
    );

    // Log event
    await client.query(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'config', $2, 'config.updated', $3)`,
      [
        member.id,
        key,
        {
          key,
          old_value: oldConfig?.value,
          new_value: value,
          admin_id: member.id,
          admin_name: member.email,
        },
      ]
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });
}
```

**UI Component** (`src/pages/trust-builder/admin/config.astro`):

Single-column form pattern (UI-layout-pattern.md):

```astro
---
import Layout from '@/layouts/Layout.astro';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ConfigForm from '@/components/trust-builder/ConfigForm';
// ... auth check
---

<Layout title="System Configuration">
  <div class="container max-w-2xl mx-auto py-6">
    <h1 class="text-3xl font-bold mb-6">System Configuration</h1>

    <Card>
      <CardHeader>
        <CardTitle>Trust Builder Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <ConfigForm client:load />
      </CardContent>
    </Card>
  </div>
</Layout>
```

**React Component** (`src/components/trust-builder/ConfigForm.tsx`):

```tsx
export function ConfigForm() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch current config on mount
  useEffect(() => {
    fetch('/api/trust-builder/admin/config')
      .then((res) => res.json())
      .then((data) => {
        setConfigs(data.configs);
        setLoading(false);
      });
  }, []);

  const handleSave = async (key: string, value: number) => {
    const response = await fetch('/api/trust-builder/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });

    if (response.ok) {
      toast({ title: 'Configuration updated successfully' });
    } else {
      toast({
        title: 'Failed to update configuration',
        variant: 'destructive',
      });
    }
  };

  return (
    <form className="space-y-6">
      {configs.map((config) => (
        <div key={config.key} className="space-y-2">
          <Label htmlFor={config.key}>{formatKey(config.key)}</Label>
          <Input
            id={config.key}
            type="number"
            defaultValue={config.value}
            min="1"
            onChange={(e) => handleSave(config.key, parseInt(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      ))}

      <Button type="button" variant="default" className="w-full">
        Save Configuration
      </Button>
    </form>
  );
}
```

### Code Migration (Grep Search Plan)

**Find all hardcoded references**:

```bash
# Search for hardcoded "7 days" reference
rg "INTERVAL\s*'7\s*days?'" --type sql --type ts

# Search for Trust Score thresholds
rg "(250|1000).*threshold" --type ts -i
rg "trust.*score.*>=\s*(250|1000)" --type ts -i

# Search for orphaned claim timeout logic
rg "reviewed_at.*7\s*days?" --type ts
```

**Update all references to use config table**:

```typescript
// Before (hardcoded)
const orphanedClaims = await db.query(`
  SELECT * FROM claims
  WHERE status = 'under_review'
  AND reviewed_at < NOW() - INTERVAL '7 days'
`);

// After (config-driven)
const config = await getConfig('claim_timeout_days');
const orphanedClaims = await db.query(`
  SELECT * FROM claims
  WHERE status = 'under_review'
  AND reviewed_at < NOW() - INTERVAL '${config.value} days'
`);
```

**Helper function** (`src/lib/db/config.ts`):

```typescript
export async function getConfig(
  key: string
): Promise<{ value: any; description: string }> {
  const { rows } = await db.query(
    'SELECT value, description FROM system_config WHERE key = $1',
    [key]
  );
  if (rows.length === 0) {
    throw new Error(`Config key not found: ${key}`);
  }
  return rows[0];
}

export async function getConfigValue(key: string): Promise<any> {
  const config = await getConfig(key);
  return config.value;
}
```

---

## Definition of Done (DoD)

- [ ] All acceptance criteria met (AC1-AC15)
- [ ] `system_config` table created and seeded
- [ ] All hardcoded thresholds migrated to config table (grep search validated)
- [ ] Admin UI functional (save, validation, error handling)
- [ ] Event logging works (config changes in event ledger)
- [ ] Non-admin access blocked (403 or redirect)
- [ ] Mobile responsive (375px tested)
- [ ] QA report: PASS with Layout/UX validation
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Migration readiness: 98%+ (config externalized)
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-01-admin-config-ui-retro.md`

---

## Sanctuary Culture Validation

- [ ] **Reversibility**: Config changes logged in event ledger, can be reverted by admin
- [ ] **Non-punitive defaults**: Timeout thresholds are generous (7 days), not harsh
- [ ] **Teaching moments**: Config descriptions explain impact ("This affects auto-release timing...")
- [ ] **Supportive language**: Help text is educational, not prescriptive
- [ ] **Generous thresholds**: Default values account for life circumstances (7 days is sanctuary-aligned)

---

## Risk Assessment

**Low Risk** story:

- Established CRUD pattern (S2-02 admin task creation)
- Simple form UI (single-column, no complex interactions)
- Clear migration path (grep search → update references)

**Potential Issues**:

1. **Circular dependency**: Code reading config during migration execution
   - **Mitigation**: Migration seeds default values FIRST, then code reads from table
2. **Type safety**: JSONB values require parsing
   - **Mitigation**: Helper functions with type assertions

3. **SQL injection via config values**:
   - **Mitigation**: Parameterized queries, input validation

**Fallback Plan**: Feature flag `USE_CONFIG_TABLE` (can revert to hardcoded if critical issues)

---

**Story Created**: 2026-02-12  
**Ready for Implementation**: ✅ YES  
**Prerequisites**: None (foundational story)  
**Blocks**: S5-0X (Scheduled Auto-Release), S5-0X (Email Reminders)
