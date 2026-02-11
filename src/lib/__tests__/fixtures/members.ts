/**
 * Test Fixtures — Reusable Test Data
 *
 * Stable, minimal test data for unit and integration tests.
 * Prefer fixtures over seed data to reduce brittleness.
 */

export const testMember = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  member_id: 'FE-M-99999',
  display_name: 'Test Member',
  role: 'Member' as const,
  trust_score_cached: 100,
  created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
};

export const testSteward = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'steward@example.com',
  member_id: 'FE-M-99998',
  display_name: 'Test Steward',
  role: 'Steward' as const,
  trust_score_cached: 500,
  created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
};

export const testTask = {
  id: '00000000-0000-0000-0000-000000000010',
  title: 'Test Task: Documentation Review',
  description: 'Review the documentation for accuracy',
  state: 'open' as const,
  required_criteria_count: 2,
  max_completions: 10,
  auto_approve: true,
  incentive_breakdown: {
    Participation: 25,
    Collaboration: 25,
  },
  created_by: testSteward.id,
  created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
};

export const testCriteria = [
  {
    id: '00000000-0000-0000-0000-000000000020',
    task_id: testTask.id,
    title: 'Review completeness',
    description: 'Confirm all sections are present',
    sequence_order: 1,
    proof_required: 'text',
  },
  {
    id: '00000000-0000-0000-0000-000000000021',
    task_id: testTask.id,
    title: 'Check for errors',
    description: 'Identify any typos or inaccuracies',
    sequence_order: 2,
    proof_required: 'text',
  },
];

export const testClaim = {
  id: '00000000-0000-0000-0000-000000000030',
  member_id: testMember.id,
  task_id: testTask.id,
  status: 'submitted' as const,
  created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
};

export const testProofs = [
  {
    id: '00000000-0000-0000-0000-000000000040',
    claim_id: testClaim.id,
    criterion_id: testCriteria[0].id,
    proof_text: 'All sections are present: Introduction, Methods, Results',
    created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000041',
    claim_id: testClaim.id,
    criterion_id: testCriteria[1].id,
    proof_text: 'Found 3 typos in section 2, reported via tracking issue',
    created_at: new Date('2026-01-02T00:00:00Z').toISOString(),
  },
];
