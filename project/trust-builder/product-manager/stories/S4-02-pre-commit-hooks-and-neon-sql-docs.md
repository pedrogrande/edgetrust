# Story S4-02: Pre-commit Hooks + Neon SQL Docs

## Goal

Prevent common bugs from reaching QA and document Neon-specific SQL patterns to reduce implementation friction.

## Complexity (for AI)

**Trivial**

- Reuses standard tooling (husky, lint-staged)
- Documentation task with clear examples from S4-01
- No ontology dimensions touched
- Estimated 45 minutes

## Ontology Mapping

- Groups: N/A
- People: N/A
- Things: N/A
- Connections: N/A
- Events: N/A
- Knowledge: ✅ (Developer documentation, code quality patterns)

## User Story (Gherkin)

```gherkin
Given I am a developer working on Trust Builder
When I attempt to commit code with TypeScript errors or formatting issues
Then the commit is blocked with helpful error messages
And I can reference documentation for Neon SQL parameterization patterns
```

## Acceptance Criteria

### Functional

- [ ] Pre-commit hooks validate TypeScript compilation (zero errors required)
- [ ] Pre-commit hooks validate code formatting (Prettier)
- [ ] Pre-commit hooks scope to staged files only (performance)
- [ ] Neon SQL documentation added to `/project/trust-builder/quickrefs/`
- [ ] Documentation includes interval parameterization pattern from S4-01 Bug #6
- [ ] Documentation includes JSONB parameter serialization rules from S4-01 Bug #1
- [ ] Documentation includes examples of correct vs incorrect syntax

### Quality

- [ ] Pre-commit hooks install automatically during `pnpm install`
- [ ] Pre-commit hooks provide clear, actionable error messages
- [ ] Documentation is concise (1 page max) with copy-paste ready examples
- [ ] Developers can bypass hooks with `--no-verify` flag (emergency escape hatch)

### Layout & UX

N/A (Developer tooling, no UI)

## Testing Schedule

**Immediate validation** (no Day 5 testing):

- Test pre-commit hook with intentional TypeScript error
- Test pre-commit hook with formatting issue
- Verify hooks only check staged files
- Verify bypass flag works
- Confirm documentation is clear and accurate

## Environment Setup

N/A (Repository-level tooling)

## Reusable Components (from prior stories)

N/A (New developer infrastructure)

## Implementation Notes (AI-facing)

### Part 1: Pre-commit Hooks

**Technology**: Husky + lint-staged

**Dependencies to add**:

```json
{
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

**Configuration files**:

1. `.husky/pre-commit` - Git hook script
2. `.lintstagedrc.json` - Staged file validation rules

**Validation steps**:

- TypeScript compilation: `tsc --noEmit` (scoped to staged files only)
- Prettier formatting: `prettier --check` (staged files)
- Optional: ESLint validation (if configured)

**Learning from S3-01**: Scope to staged files only to avoid blocking commits due to unrelated errors in project.

### Part 2: Neon SQL Patterns Documentation

**File**: `/project/trust-builder/quickrefs/neon-sql-patterns.md`

**Content sections**:

1. **Interval Parameterization** (from S4-01 Bug #6)
   - Incorrect: `INTERVAL '${days} days'` (SQL injection risk, syntax error)
   - Correct: `(${days} || ' days')::INTERVAL` (safe concatenation)
   - Example from production code

2. **JSONB Parameters** (from S4-01 Bug #1)
   - Incorrect: `JSON.stringify(JSON.stringify(value))` (double serialization)
   - Correct: Direct object `{value}` in neon sql`` template
   - Why: Neon SDK handles serialization automatically

3. **Array Parameters**
   - Correct: `WHERE id = ANY(${[uuid1, uuid2]})` (safe array handling)
   - Type handling: PostgreSQL array types

4. **Pattern Summary Table**
   - Common scenarios with before/after examples
   - Link to Neon documentation

**Cross-references**:

- S4-01 QA Report (Bug #1 and Bug #6 sections)
- Neon SDK documentation (external link)

### Acceptance Testing

**Pre-commit validation**:

```bash
# Create intentional error
echo "const x: string = 123;" >> src/test-error.ts
git add src/test-error.ts
git commit -m "test"
# Expected: Commit blocked with TypeScript error

# Test bypass
git commit -m "test" --no-verify
# Expected: Commit succeeds (emergency override)
```

**Documentation validation**:

- Copy-paste each example into test file
- Verify TypeScript compilation passes/fails as documented
- Confirm examples match actual production code patterns

## Definition of Done (DoD)

- All acceptance criteria met
- Pre-commit hooks tested with intentional errors (TypeScript + formatting)
- Neon SQL documentation reviewed for accuracy against S4-01 implementation
- Documentation added to quickrefs directory
- Hooks automatically install during `pnpm install` (verified on fresh clone)
- No strategic review required (Trivial complexity)
- Retro file created documenting any learnings

## Story Context & Dependencies

**Sprint**: 4  
**Priority**: High (unblocks quality improvements)  
**Estimated Time**: 45 minutes  
**Dependencies**: None (independent story)  
**Unblocks**: Future story quality (fewer QA bugs like S4-01)

**Rationale**: S4-01 had 6 QA bugs, several preventable with pre-commit validation. Neon SQL patterns caused 2 bugs (Bug #1, Bug #6) that documentation would prevent.

**Success Metrics**:

- Zero TypeScript compilation errors reach QA in future stories
- Neon SQL parameterization bugs eliminated
- Developer onboarding friction reduced

**Action Items from S4-01 Retro Addressed**:

- ✅ Document sentinel UUID pattern → Not in this story (separate doc)
- ✅ Create pre-QA testing checklist → Hooks provide automatic validation
- ✅ Add neon sql`` syntax to quickrefs → Primary deliverable

## Notes

This story combines two small deliverables (1 point each) into a single 2-point story for efficiency. Both address developer experience and quality gate improvements identified in Sprint 2, 3, and 4 retrospectives.

**Strategic Review**: Not required (Trivial complexity, standard tooling patterns)
