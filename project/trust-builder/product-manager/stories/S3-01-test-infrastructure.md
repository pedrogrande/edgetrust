# Story S3-01: Test Infrastructure & Git Enforcement

**Epic**: Quality Foundations  
**Priority**: CRITICAL (HIGH-priority action item from Sprint 2)  
**Sprint**: 3  
**Estimated Points**: 3  
**Assigned To**: fullstack-developer  
**Strategic Review**: Optional (infrastructure, pattern well-established)

---

## Goal

Establish **automated test infrastructure** to catch regressions early and enable faster development cycles. Implement **git workflow enforcement** to prevent direct commits to main and character encoding bugs. This foundation unblocks future velocity and addresses the #1 gap from Sprint 2.

**Value for Members**: None directly (infrastructure)  
**Value for Organization**: Reduced QA time, faster releases, higher code quality

---

## Complexity (for AI)

**Simple** (2 hours setup + 2 hours initial tests)

**Rationale**:

- Standard Vitest setup (well-documented)
- Reusing existing code (tests wrap existing functions)
- Minimal new infrastructure (hooks are npm packages)
- No new database schema or UI components

---

## Ontology Mapping

**N/A** - This is infrastructure work, not feature delivery. No direct impact on Groups, People, Things, Connections, Events, or Knowledge dimensions.

**Indirect Impact**: Tests validate ontology correctness in future stories.

---

## User Story (Gherkin)

```gherkin
Given the Trust Builder codebase has 0 automated tests
And git workflow violations occurred in Sprint 2 (S2-03 direct commit to main)
And character encoding bugs recurred twice (S2-03, S2-04)
When the fullstack-developer sets up test infrastructure
Then all existing API endpoints have integration tests
And business logic functions have unit tests
And pre-push hooks prevent commits to main
And pre-commit hooks catch TypeScript and character encoding errors
And the test suite runs in <5 seconds
And future stories can add tests incrementally
```

---

## Acceptance Criteria

### Functional Behavior

- [ ] **AC1**: Vitest configured and runs successfully (`pnpm test`)
- [ ] **AC2**: Integration tests cover 3+ existing API endpoints:
  - `/api/trust-builder/auth/verify-code`
  - `/api/trust-builder/tasks/[id]/claim`
  - `/api/trust-builder/claims/[id]/review`
- [ ] **AC3**: Unit tests cover 2+ business logic modules:
  - `src/lib/claim-engine.ts` (state machine transitions)
  - `src/lib/trust-score-calculator.ts` (points aggregation)
- [ ] **AC4**: Test coverage report generated (`pnpm test:coverage`)
- [ ] **AC5**: All tests pass (green) on current codebase
- [ ] **AC6**: Tests fail appropriately when bugs introduced (validated with intentional breakage)

### Git Workflow Enforcement

- [ ] **AC7**: Pre-push hook installed (Husky + lint-staged or similar)
- [ ] **AC8**: Direct commit to `main` rejected with clear error message
- [ ] **AC9**: Feature branch commits allowed (`git push origin S3-01-test-infrastructure`)
- [ ] **AC10**: Pre-commit hook runs `tsc --noEmit` (catches TypeScript errors)
- [ ] **AC11**: Pre-commit hook detects non-ASCII characters (smart quotes, en-dashes)
- [ ] **AC12**: Hooks bypass available for emergencies (`git push --no-verify` documented)

### Documentation

- [ ] **AC13**: `README.md` updated with testing instructions
- [ ] **AC14**: Test file naming convention documented (`*.test.ts`)
- [ ] **AC15**: Mock data helpers created (`src/lib/__tests__/fixtures/`)
- [ ] **AC16**: Git hooks documented (how to install, how to bypass)

### Performance

- [ ] **AC17**: Test suite completes in <5 seconds (fast feedback loop)
- [ ] **AC18**: Individual test files run in <1 second

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**Testing Framework**: Vitest (fast, TypeScript-native, Vite-compatible)

**Installation**:

```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom happy-dom
```

**Configuration** (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom', // For React component tests
    globals: true,
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Setup File** (`src/lib/__tests__/setup.ts`):

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Clean up React components after each test
afterEach(() => {
  cleanup();
});
```

### Test File Structure

**Integration Test Example** (`src/lib/api/__tests__/claim.test.ts`):

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST } from '@/pages/api/trust-builder/tasks/[id]/claim';

describe('POST /api/trust-builder/tasks/[id]/claim', () => {
  let testTaskId: string;
  let testMemberId: string;

  beforeAll(async () => {
    // Set up test data
    // Use existing seed data or create test fixtures
  });

  afterAll(async () => {
    // Clean up test data if needed
  });

  it('should create a claim for an authenticated member', async () => {
    const request = new Request(
      `http://localhost:4321/api/trust-builder/tasks/${testTaskId}/claim`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Mock session context
      }
    );

    const response = await POST({
      params: { id: testTaskId },
      request,
      locals: mockLocals,
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.claim).toHaveProperty('id');
    expect(body.claim.status).toBe('submitted');
  });

  it('should reject claim if task not found', async () => {
    // Test error path
  });
});
```

**Unit Test Example** (`src/lib/__tests__/trust-score-calculator.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateTrustScore,
  aggregateByIncentive,
} from '../trust-score-calculator';

describe('calculateTrustScore', () => {
  it('should sum points from all approved claims', () => {
    const events = [
      { event_type: 'claim.approved', metadata: { points_earned: 50 } },
      { event_type: 'claim.approved', metadata: { points_earned: 25 } },
    ];

    const score = calculateTrustScore(events);
    expect(score).toBe(75);
  });

  it('should ignore rejected claims', () => {
    const events = [
      { event_type: 'claim.approved', metadata: { points_earned: 50 } },
      { event_type: 'claim.rejected', metadata: { points_earned: 25 } },
    ];

    const score = calculateTrustScore(events);
    expect(score).toBe(50);
  });
});

describe('aggregateByIncentive', () => {
  it('should group points by incentive type', () => {
    const events = [
      { metadata: { incentives: [{ name: 'Participation', points: 50 }] } },
      {
        metadata: {
          incentives: [
            { name: 'Participation', points: 25 },
            { name: 'Innovation', points: 10 },
          ],
        },
      },
    ];

    const breakdown = aggregateByIncentive(events);

    expect(breakdown).toEqual({
      Participation: 75,
      Innovation: 10,
      Collaboration: 0,
      Leadership: 0,
      Impact: 0,
    });
  });
});
```

### Git Hooks Setup

**Install Husky**:

```bash
pnpm add -D husky
npx husky init
```

**Pre-push Hook** (`.husky/pre-push`):

```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Get the current branch name
branch=$(git rev-parse --abbrev-ref HEAD)

# Reject direct pushes to main
if [ "$branch" = "main" ]; then
  echo "❌ Direct commits to main are not allowed!"
  echo "Please create a feature branch:"
  echo "  git checkout -b S3-XX-feature-name"
  exit 1
fi

# Run tests before push (optional, can comment out if too slow)
# pnpm test
```

**Pre-commit Hook** (`.husky/pre-commit`):

```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Run TypeScript type check
echo "🔍 Running TypeScript check..."
pnpm tsc --noEmit

# Check for non-ASCII characters (smart quotes, en-dashes)
echo "🔍 Checking for character encoding issues..."
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -n "[''""–—]" ; then
  echo "❌ Non-ASCII characters detected (smart quotes or en-dashes)"
  echo "Please replace with ASCII equivalents:"
  echo "  ' or ' → '"
  echo "  " or " → \""
  echo "  – or — → -"
  exit 1
fi

echo "✅ Pre-commit checks passed"
```

### Mock Data Helpers

**Fixtures** (`src/lib/__tests__/fixtures/members.ts`):

```typescript
export const testMember = {
  id: crypto.randomUUID(),
  email: 'test@example.com',
  member_id: 'FE-M-99999',
  display_name: 'Test Member',
  role: 'Member',
  trust_score_cached: 100,
  created_at: new Date().toISOString(),
};

export const testSteward = {
  ...testMember,
  id: crypto.randomUUID(),
  member_id: 'FE-M-99998',
  role: 'Steward',
  trust_score_cached: 500,
};
```

### Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky install"
  }
}
```

### Testing Strategy

**Priority Order**:

1. **Integration tests for API endpoints** (highest value, catches real bugs)
2. **Unit tests for business logic** (pure functions, easy to test)
3. **Component tests** (lower priority, UI changes frequently)

**Test Coverage Goals**:

- Sprint 3: 40% baseline (this story)
- Sprint 3: 60% target (add tests in S3-02, S3-03, S3-04)
- Sprint 4+: 80% (comprehensive coverage)

**What NOT to Test** (diminishing returns):

- UI layout (visual regression tools better suited)
- Third-party library internals (trust Vitest, React, etc.)
- Generated code (Astro island hydration)

---

## Definition of Done (DoD)

### Code Quality

- [ ] All acceptance criteria met
- [ ] TypeScript compiles without errors (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] Test coverage ≥40% (`pnpm test:coverage`)
- [ ] No character encoding issues (pre-commit hook validated)

### Git Workflow

- [ ] Feature branch used (`S3-01-test-infrastructure`)
- [ ] Pre-push hook prevents commits to main (tested)
- [ ] Pre-commit hook catches TypeScript errors (tested)
- [ ] PR created (if team review desired)

### QA Validation

- [ ] QA engineer confirms:
  - Tests run successfully
  - Coverage report generated
  - Git hooks function as expected
  - Documentation clarity
- [ ] QA report: **PASS** (infrastructure, no functional testing needed)

### Documentation

- [ ] README.md updated (testing commands, git hooks)
- [ ] Test fixtures documented (how to use, how to extend)
- [ ] Character encoding pitfall documented

### Product-Advisor Review

- [ ] Grade: A- or higher expected (infrastructure, not feature)
- [ ] Migration readiness: N/A (infrastructure)
- [ ] Ontology compliance: N/A (infrastructure)

### Retrospective

- [ ] Retro file created: `/trust-builder/retros/story-S3-01-test-infrastructure-retro.md`
- [ ] Lessons learned documented (setup time, hook configuration challenges)
- [ ] Action items identified (future test patterns, coverage targets)

---

## Success Metrics

**Quantitative**:

- ✅ 40% code coverage achieved
- ✅ 5+ test files created
- ✅ 15+ test cases passing
- ✅ Test suite <5s execution time
- ✅ Git workflow violations prevented (100% from this point forward)

**Qualitative**:

- ✅ Developer confidence in refactoring (tests catch regressions)
- ✅ Faster QA cycles (automated tests supplement manual validation)
- ✅ Process discipline (git hooks prevent common mistakes)

---

## Dependencies

**Upstream**: None (foundational story)  
**Downstream**: All future stories benefit from test infrastructure

---

## Risks & Mitigations

| Risk                        | Likelihood | Impact | Mitigation                        |
| --------------------------- | ---------- | ------ | --------------------------------- |
| Vitest setup issues         | Low        | Medium | Follow official Astro+Vitest docs |
| Test database conflicts     | Medium     | Low    | Use in-memory DB or test schema   |
| Hooks break developer flow  | Medium     | Low    | Provide `--no-verify` bypass docs |
| Coverage target unrealistic | Low        | Low    | Start at 40%, adjust if needed    |

---

## Notes

**Why Vitest over Jest**:

- Faster (uses Vite's transform pipeline)
- Better TypeScript support (native, no ts-jest)
- Astro-friendly (recommended in docs)
- Modern API (compatible with Jest, easy migration)

**Character Encoding Prevention**:

- This is a **recurring issue** (S2-03, S2-04)
- Pre-commit hook catches at earliest point
- Alternative: ESLint rule (slower, less reliable)

**Git Hooks Philosophy**:

- **Pre-push**: Prevent main violations (team workflow)
- **Pre-commit**: Catch build errors (individual safety net)
- **Bypass available**: Emergencies only (documented, not encouraged)

**Test Data Strategy**:

- Use existing seed data where possible (reduces maintenance)
- Create fixtures for edge cases (invalid inputs, race conditions)
- Clean up after tests (avoids pollution)

---

_Story ready for fullstack-developer implementation. Estimated time: 4-6 hours._
