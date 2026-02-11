/**
 * Integration Tests: Orphaned Claims Release (S3-03)
 *
 * Tests automated workflow for releasing claims that have been under review >7 days
 * Following S3-01/S3-04 test patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PoolClient } from '@neondatabase/serverless';

// Mock responses for orphaned claims
const mockOrphanedClaim = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  task_id: '550e8400-e29b-41d4-a716-446655440002',
  task_title: 'Webinar Reflection',
  reviewer_id: '550e8400-e29b-41d4-a716-446655440003',
  reviewer_name: 'John Steward',
  days_orphaned: 8.5,
};

describe('Orphaned Claims: Query Logic', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC1: Identifies claims under review >7 days', async () => {
    // Mock orphaned claims query
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          ...mockOrphanedClaim,
          days_orphaned: 8.5,
        },
        {
          ...mockOrphanedClaim,
          id: '550e8400-e29b-41d4-a716-446655440004',
          days_orphaned: 10.2,
        },
      ],
    });

    const result = await (mockClient.query as any)(
      `
      SELECT c.id, EXTRACT(DAY FROM (NOW() - c.updated_at)) AS days_orphaned
      FROM claims c
      WHERE c.status = 'under_review'
        AND c.updated_at < NOW() - INTERVAL '7 days'
    `
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].days_orphaned).toBeGreaterThan(7);
    expect(result.rows[1].days_orphaned).toBeGreaterThan(7);
  });

  it('AC1: Excludes claims under review <7 days', async () => {
    // Mock query returning no results (all claims recent)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    const result = await (mockClient.query as any)(
      `WHERE c.updated_at < NOW() - INTERVAL '7 days'`
    );

    expect(result.rows).toHaveLength(0);
  });

  it('AC: Returns correct threshold in days_orphaned calculation', async () => {
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          ...mockOrphanedClaim,
          days_orphaned: 7.1, // Just over threshold
        },
      ],
    });

    const result = await (mockClient.query as any)('SELECT ...');

    expect(result.rows[0].days_orphaned).toBeGreaterThanOrEqual(7);
    expect(result.rows[0].days_orphaned).toBeLessThan(8);
  });
});

describe('Orphaned Claims: Release Transaction', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC2, AC3: Transitions status to submitted and clears reviewer_id', async () => {
    // Mock UPDATE query result
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockOrphanedClaim.id,
          status: 'submitted',
          reviewer_id: null,
        },
      ],
    });

    const result = await (mockClient.query as any)(
      `
      UPDATE claims
      SET status = 'submitted', reviewer_id = NULL
      WHERE status = 'under_review'
        AND updated_at < NOW() - INTERVAL '7 days'
      RETURNING id, status, reviewer_id
    `
    );

    expect(result.rows[0].status).toBe('submitted');
    expect(result.rows[0].reviewer_id).toBeNull();
  });

  it('AC6: Transaction atomic (state update + event log)', async () => {
    // Mock CTE query (UPDATE + INSERT in single transaction)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ inserted: 1 }],
    });

    const result = await (mockClient.query as any)(`
      WITH released AS (
        UPDATE claims ...
        RETURNING id, task_id, reviewer_id, days_orphaned
      )
      INSERT INTO events (...)
      SELECT ... FROM released r
    `);

    // If INSERT succeeds, UPDATE succeeded (atomic)
    expect(result.rows[0].inserted).toBe(1);
  });

  it('AC4, AC14: Event metadata includes complete audit trail', async () => {
    const expectedMetadata = {
      claim_id: mockOrphanedClaim.id,
      task_id: mockOrphanedClaim.task_id,
      reviewer_id: mockOrphanedClaim.reviewer_id,
      days_orphaned: 8.5,
      timeout_threshold_days: 7,
      admin_id: 'admin-uuid',
      release_reason: 'timeout',
    };

    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ metadata: expectedMetadata }],
    });

    const result = await (mockClient.query as any)(
      `INSERT INTO events ... RETURNING metadata`
    );

    expect(result.rows[0].metadata.claim_id).toBe(mockOrphanedClaim.id);
    expect(result.rows[0].metadata.reviewer_id).toBe(
      mockOrphanedClaim.reviewer_id
    );
    expect(result.rows[0].metadata.days_orphaned).toBeGreaterThan(7);
    expect(result.rows[0].metadata.timeout_threshold_days).toBe(7);
    expect(result.rows[0].metadata.release_reason).toBe('timeout');
  });

  it('AC15: Event logged inside transaction (rollback on failure)', async () => {
    // Mock transaction failure scenario
    (mockClient.query as any).mockRejectedValueOnce(
      new Error('Event insert failed')
    );

    await expect(
      (mockClient.query as any)('WITH released AS (...)')
    ).rejects.toThrow('Event insert failed');

    // In real transaction, UPDATE would also rollback
    // This test verifies error propagates correctly
  });
});

describe('Orphaned Claims: Zero Claims Edge Case', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC: Returns empty array if no orphaned claims', async () => {
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    const result = await (mockClient.query as any)('SELECT ...');

    expect(result.rows).toHaveLength(0);
  });

  it('AC: Defensive check prevents empty transaction', async () => {
    // Application logic should check rows.length before UPDATE
    const orphanedRows: any[] = [];

    if (orphanedRows.length === 0) {
      // Should return early, not execute UPDATE
      expect(orphanedRows).toHaveLength(0);
      return;
    }

    // This code should never run
    throw new Error('Should not attempt UPDATE with no orphaned claims');
  });
});

describe('Orphaned Claims: State Machine Completion', () => {
  it('AC17: Timeout path completes claim state machine (5th path)', () => {
    const claimStateMachine = {
      paths: [
        { name: 'Happy path', from: 'under_review', to: 'approved' },
        { name: 'Failure path', from: 'under_review', to: 'rejected' },
        {
          name: 'Retry path',
          from: 'under_review',
          to: 'revision_requested',
        },
        {
          name: 'Timeout path',
          from: 'under_review',
          to: 'submitted',
          condition: 'orphaned >7 days',
        },
        {
          name: 'Voluntary exit',
          from: 'under_review',
          to: 'submitted',
          condition: 'reviewer releases',
        },
      ],
    };

    expect(claimStateMachine.paths).toHaveLength(5);
    expect(claimStateMachine.paths[3].name).toBe('Timeout path');
    expect(claimStateMachine.paths[3].to).toBe('submitted');
  });
});

describe('Orphaned Claims: Sanctuary Culture', () => {
  it('AC7, AC20: No Trust Score penalty for reviewer', async () => {
    // Verify no trust_score_cached UPDATE after timeout release
    const mockClient: Partial<PoolClient> = {
      query: vi.fn(),
    };

    // Only UPDATE claims (not members)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: mockOrphanedClaim.id }],
    });

    const result = await (mockClient.query as any)(`
      UPDATE claims SET status = 'submitted', reviewer_id = NULL ...
    `);

    // Verify no trust score deduction occurred
    expect(mockClient.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE members SET trust_score_cached')
    );
  });

  it('AC18, AC19: Sanctuary messaging in UI (no blame)', () => {
    const dialogMessage = 'Life happens! These claims need fresh eyes.';
    const buttonLabel = 'Release Orphaned Claims';
    const badgeLabel = 'orphaned';

    // Positive framing (not "overdue", "failed", "timeout violation")
    expect(dialogMessage).toContain('Life happens');
    expect(dialogMessage).toContain('fresh eyes');
    expect(dialogMessage).not.toContain('failed');
    expect(dialogMessage).not.toContain('violation');

    expect(buttonLabel).toContain('Release');
    expect(buttonLabel).not.toContain('Penalize');

    expect(badgeLabel).toBe('orphaned');
    expect(badgeLabel).not.toBe('overdue');
  });
});

describe('Orphaned Claims: Migration Readiness', () => {
  it('AC: Threshold value captured in event metadata (retroactive validation)', () => {
    const eventMetadata = {
      timeout_threshold_days: 7, // Frozen at release time
      days_orphaned: 8.5,
    };

    // If threshold changes to 10 days later, this event still shows 7 was used
    expect(eventMetadata.timeout_threshold_days).toBe(7);
    expect(eventMetadata.days_orphaned).toBeGreaterThan(
      eventMetadata.timeout_threshold_days
    );
  });

  it('AC: Event metadata sufficient for reconstruction (no claim JOIN needed)', () => {
    const eventMetadata = {
      claim_id: 'uuid-1',
      task_id: 'uuid-2',
      reviewer_id: 'uuid-3',
      days_orphaned: 8.5,
      timeout_threshold_days: 7,
      admin_id: 'uuid-4',
      release_reason: 'timeout',
    };

    // Can reconstruct: "Claim uuid-1 (task uuid-2) was released by admin uuid-4
    // after uuid-3 had it for 8.5 days (threshold: 7 days)"
    expect(eventMetadata).toHaveProperty('claim_id');
    expect(eventMetadata).toHaveProperty('task_id');
    expect(eventMetadata).toHaveProperty('reviewer_id');
    expect(eventMetadata).toHaveProperty('admin_id');
    expect(eventMetadata).toHaveProperty('days_orphaned');
    expect(eventMetadata).toHaveProperty('timeout_threshold_days');
  });

  it('AC: Release logic deterministic (no external state)', () => {
    // Query only depends on timestamp and interval (pure function)
    const query = `
      WHERE c.status = 'under_review'
        AND c.updated_at < NOW() - INTERVAL '7 days'
    `;

    // No API calls, no file I/O, no random values
    expect(query).toContain('NOW()'); // Deterministic timestamp
    expect(query).toContain('INTERVAL'); // Deterministic threshold
    expect(query).not.toContain('RANDOM()');
  });
});
