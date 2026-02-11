# QA Engineer Quick Reference

**Purpose**: Fast validation checklist (5 min read)  
**Full Details**: [Sprint 2 Learnings](../retros/sprint-2-learnings-and-guidance.md) | [QA Reports](../product-manager/stories/)  
**Last Updated**: 11 February 2026

---

## ⚡ Quick Validation Workflow

### 1. Pre-Validation Setup

```bash
# Pull latest code
git checkout feature/S3-XX-story-name
git pull origin feature/S3-XX-story-name

# Install dependencies (if package.json changed)
pnpm install

# Run full test suite
pnpm test

# Generate coverage report
pnpm test:coverage
```

**Expected**: All tests green, coverage >40% overall (>60% critical path)

---

### 2. Acceptance Criteria Validation

**For Each AC**:

- [ ] Read AC from story file: `product-manager/stories/S3-XX-*.md`
- [ ] Manual test (if UI/API): Follow AC steps exactly
- [ ] Code inspection: Verify implementation matches intent
- [ ] Edge cases: Test failure scenarios (invalid input, unauthorized access)
- [ ] Document result: `✅ PASS` or `❌ FAIL` with reproduction steps

**Use Template**: Copy from [previous QA report](../product-manager/stories/)

---

### 3. Migration Readiness Checklist

#### Event Sourcing (CRITICAL)

- [ ] **Append-only events**: No UPDATE/DELETE in events table
- [ ] **Transaction atomicity**: Events logged inside `withTransaction`
- [ ] **Metadata completeness**: Events include before/after state
- [ ] **Actor tracking**: `actor_id` present on all events

#### Trust Score Integrity

- [ ] **Derived not stored**: Trust Scores calculated from events
- [ ] **Verification possible**: Events include `trust_score_before` + `trust_score_after`
- [ ] **Test coverage**: Trust Score calculation has unit tests

#### Immutability Rules

- [ ] **Published tasks locked**: Core fields cannot be edited after publication
- [ ] **Approved claims locked**: Status changes only (no content edits)
- [ ] **Database constraints**: CHECK constraints enforce rules

---

### 4. Sanctuary Culture Validation

#### Error Messages

- [ ] Educational (explain why, not just what)
- [ ] Actionable (tell user how to fix)
- [ ] Non-punitive ("Please upload PDF" not "ERROR: INVALID_FILE")
- [ ] Specific (no generic "Something went wrong")

**Example Bad**: `Error: INVALID_INPUT`  
**Example Good**: `Please upload a file under 10MB. Large files may take longer for reviewers to evaluate.`

#### UI Language

- [ ] Inviting tone ("Let's..." not "You must...")
- [ ] Supportive feedback (rejection includes 20+ char guidance)
- [ ] Clear next steps (button labels are action-oriented)

---

### 5. Code Quality Checks

#### TypeScript

```bash
# Verify compilation
pnpm build
```

**Expected**: No errors

#### Character Encoding

```bash
# Check for smart quotes/dashes
grep -rn "[''""\u2013\u2014]" src/ --include="*.ts" --include="*.tsx" --include="*.astro"
```

**Expected**: No matches (or only in comments/strings)

#### Git Hooks

```bash
# Verify hooks installed
ls -la .husky/

# Test pre-commit (should catch smart quotes)
echo "const test = 'smart quote';" > test.ts
git add test.ts
git commit -m "test"  # Should fail
rm test.ts
```

---

## 📊 QA Report Template

### Executive Summary

```markdown
**Status**: ✅ PASS | ❌ FAIL | ⚠️ CONDITIONAL PASS  
**ACs Passing**: X/Y  
**Migration Readiness**: Z%  
**Critical Issues**: N
```

### Acceptance Criteria Table

```markdown
| AC  | Criterion | Status  | Evidence                             |
| --- | --------- | ------- | ------------------------------------ |
| AC1 | ...       | ✅ PASS | Tested manually, screenshot attached |
| AC2 | ...       | ❌ FAIL | Reproduction: ...                    |
```

### Migration Readiness

- **Event Sourcing**: ✅/❌/⚠️ (reason)
- **Trust Score Integrity**: ✅/❌/⚠️
- **Immutability Rules**: ✅/❌/⚠️

### Recommendation

- ✅ **APPROVE FOR MERGE** (all ACs pass)
- ❌ **RETURN TO DEVELOPER** (AC failures documented)
- ⚠️ **CONDITIONAL PASS** (minor issues, non-blocking)

---

## 🔍 Infrastructure Story Quick-Check

For infrastructure stories (tests, git hooks, CI/CD):

- [ ] Tests pass (green)
- [ ] Coverage >40% overall
- [ ] Git hooks installed
- [ ] README updated with new commands
- [ ] Performance <5s test suite time

**Time Budget**: 10-15 minutes (vs. 30-60 for feature stories)

---

## 🚨 Common Failure Patterns

### 1. Missing Integration Tests (AC2 in S3-01)

**Check**: `ls src/lib/api/__tests__/*.test.ts`  
**Expected**: Test file for each API endpoint

### 2. Events Outside Transactions

**Check**: Search `INSERT INTO events` not inside `withTransaction`  
**Impact**: Orphaned events (state updates but event fails)

### 3. Missing Before/After State

**Check**: Event metadata includes `trust_score_before`, `trust_score_after`  
**Impact**: Cannot reconstruct Trust Scores

### 4. Smart Quotes in Code

**Check**: `grep -rn "[''""]" src/`  
**Impact**: TypeScript compilation error

### 5. Insufficient Error Messages

**Check**: Errors include "why" + "how to fix"  
**Impact**: Poor member experience

---

## 📋 Full Validation Checklist

### Functional

- [ ] All ACs passing (manual + automated tests)
- [ ] Edge cases tested (invalid input, unauthorized access, race conditions)
- [ ] Performance acceptable (<3s page load, <1s API response)

### Technical

- [ ] Tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm build`)
- [ ] No character encoding issues
- [ ] Code follows patterns (transactions, events, auth)

### Migration

- [ ] Events append-only
- [ ] Trust Scores derivable
- [ ] Immutability enforced
- [ ] Database constraints present

### Sanctuary

- [ ] Error messages educational
- [ ] UI language inviting
- [ ] Feedback requirements enforced

---

## ⏱️ Time Budget

- **Feature Stories**: 30-60 min (validation + report)
- **Infrastructure Stories**: 10-15 min (quick-check)
- **Report Writing**: 15-20 min

**Total**: 45-80 min per story (vs. 2-3 hours without this quickref)

---

## 📚 Full References

**Detailed Validation**:

- [Smart Contract Spec](../05-smart-contract-behaviour-spec.md) - Quasi-smart contract requirements
- [Migration Strategy](../08-migration-and-audit-strategy.md) - Blockchain readiness checks

**Past QA Reports** (templates):

- [S3-01 QA Report](../product-manager/stories/S3-01-QA-REPORT.md) - Perfect example (18/18 ACs pass)
- [S2-04 QA Report](../product-manager/stories/S2-04-QA-REPORT.md) - Complex feature example

**Questions?** Check [PATTERN-ANALYSIS.md](../meta/PATTERN-ANALYSIS.md) for recurring issues.
