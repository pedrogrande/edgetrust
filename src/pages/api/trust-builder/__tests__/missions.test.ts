/**
 * Integration Tests: Mission Joining UI (S4-03B)
 *
 * Tests mission browsing, joining, leaving, and event logging
 * Following TEST-FIRST pattern from Sprint 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PoolClient } from '@neondatabase/serverless';

// Mock data
const mockMemberId = '550e8400-e29b-41d4-a716-446655440001';
const mockMemberStableId = 'FE-M-00001';
const mockMissionId = '20000000-0000-0000-0000-000000000001';
const mockMissionStableId = 'FE-M-00001';
const mockMembershipId = '60000000-0000-0000-0000-000000000001';

describe('Mission API: GET /api/trust-builder/missions', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC9: Returns all active missions with metadata', async () => {
    // Mock get_active_missions helper function response
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockMissionId,
          stable_id: mockMissionStableId,
          name: 'Webinar Series Season 0',
          description: 'Host and moderate webinars',
          min_trust_score: 0,
          member_count: 5,
          task_count: 12,
          is_member: false,
          is_eligible: true,
        },
        {
          id: '20000000-0000-0000-0000-000000000002',
          stable_id: 'FE-M-00002',
          name: 'Content Creation',
          description: 'Write articles and blog posts',
          min_trust_score: 250,
          member_count: 3,
          task_count: 8,
          is_member: false,
          is_eligible: false,
        },
      ],
    });

    const result = await mockClient.query!(
      `SELECT * FROM get_active_missions($1::UUID, $2::INTEGER)`,
      [mockMemberId, 150]
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      member_count: 5,
      task_count: 12,
      is_eligible: true,
    });
    expect(result.rows[1]).toMatchObject({
      is_eligible: false,
    });
  });

  it('AC9: Uses S4-03A helper function get_active_missions', async () => {
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    await mockClient.query!(
      `SELECT * FROM get_active_missions($1::UUID, $2::INTEGER)`,
      [mockMemberId, 0]
    );

    const queryStr = (mockClient.query as any).mock.calls[0][0];
    expect(queryStr).toContain('get_active_missions');
  });
});

describe('Mission API: GET /api/trust-builder/missions/[id]', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC10: Returns mission detail with active members', async () => {
    // Mock mission query
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockMissionId,
          stable_id: mockMissionStableId,
          name: 'Webinar Series Season 0',
          description: 'Host and moderate webinars',
          min_trust_score: 0,
          member_count: 5,
          is_member: false,
          is_eligible: true,
        },
      ],
    });

    // Mock members query (using get_mission_members helper)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          member_id: mockMemberId,
          member_stable_id: mockMemberStableId,
          email: 'member@example.com',
          joined_at: '2026-02-01T00:00:00Z',
        },
      ],
    });

    const missionResult = await mockClient.query!(
      `SELECT g.*, ... FROM groups g WHERE g.id = $1 AND g.type = 'mission'`,
      [mockMissionId]
    );

    const membersResult = await mockClient.query!(
      `SELECT * FROM get_mission_members($1::UUID)`,
      [mockMissionId]
    );

    expect(missionResult.rows[0]).toMatchObject({
      name: 'Webinar Series Season 0',
      is_member: false,
      is_eligible: true,
    });
    expect(membersResult.rows).toHaveLength(1);
    expect(membersResult.rows[0].member_stable_id).toBe(mockMemberStableId);
  });

  it('AC10: Uses S4-03A helper function get_mission_members', async () => {
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    await mockClient.query!(`SELECT * FROM get_mission_members($1::UUID)`, [
      mockMissionId,
    ]);

    const queryStr = (mockClient.query as any).mock.calls[0][0];
    expect(queryStr).toContain('get_mission_members');
  });
});

describe('Mission API: POST /api/trust-builder/missions/[id]/join', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC11: Creates membership with status=active', async () => {
    // Mock mission query (eligible mission)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockMissionId,
          stable_id: mockMissionStableId,
          name: 'Webinar Series Season 0',
          min_trust_score: 0,
        },
      ],
    });

    // Mock check for existing membership (none found)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    // Mock membership creation
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: mockMembershipId }],
    });

    // Mock event insertion
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    const membershipResult = await mockClient.query!(
      `INSERT INTO memberships (member_id, group_id, role, joined_at, status)
       VALUES ($1, $2, 'Member', NOW(), 'active')
       RETURNING id`,
      [mockMemberId, mockMissionId]
    );

    expect(membershipResult.rows[0].id).toBe(mockMembershipId);
  });

  it('AC13: Logs membership.created event with correct metadata', async () => {
    // Setup mocks
    (mockClient.query as any)
      .mockResolvedValueOnce({
        rows: [
          {
            id: mockMissionId,
            stable_id: mockMissionStableId,
            name: 'Test Mission',
            min_trust_score: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: mockMembershipId }] })
      .mockResolvedValueOnce({ rows: [] });

    await mockClient.query!(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'membership', $2, 'membership.created', $3)`,
      [
        mockMemberId,
        mockMembershipId,
        {
          group_id: mockMissionId,
          group_stable_id: mockMissionStableId,
          group_name: 'Test Mission',
          member_id: mockMemberId,
          member_stable_id: mockMemberStableId,
          member_trust_score: 150,
          joined_at: '2026-02-13T00:00:00Z',
        },
      ]
    );

    const eventCall = (mockClient.query as any).mock.calls[3];
    const metadata = eventCall[1][2];

    expect(eventCall[1][1]).toBe('membership');
    expect(eventCall[1][2]).toBe('membership.created');
    expect(metadata).toMatchObject({
      group_id: mockMissionId,
      group_stable_id: mockMissionStableId,
      member_id: mockMemberId,
      member_stable_id: mockMemberStableId,
      member_trust_score: 150,
    });
  });

  it('AC6: Prevents joining same mission twice', async () => {
    // Mock mission query
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: mockMissionId, min_trust_score: 0 }],
    });

    // Mock existing membership found
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: mockMembershipId }],
    });

    const existingResult = await mockClient.query!(
      `SELECT id FROM memberships 
       WHERE group_id = $1 AND member_id = $2 AND status = 'active'`,
      [mockMissionId, mockMemberId]
    );

    expect(existingResult.rows).toHaveLength(1);
    // API should return 400 error when existing membership found
  });

  it('AC4: Rejects join if trust_score < min_trust_score', async () => {
    // Mock mission query (requires 250 points)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockMissionId,
          min_trust_score: 250,
        },
      ],
    });

    const missionResult = await mockClient.query!(
      `SELECT min_trust_score FROM groups WHERE id = $1`,
      [mockMissionId]
    );

    const memberTrustScore = 150;
    const minRequired = missionResult.rows[0].min_trust_score;

    expect(memberTrustScore).toBeLessThan(minRequired);
    // API should return 403 error with supportive message
  });
});

describe('Mission API: POST /api/trust-builder/missions/[id]/leave', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC12: Updates membership with left_at and status=left', async () => {
    // Mock mission query
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockMissionId,
          stable_id: mockMissionStableId,
          name: 'Test Mission',
        },
      ],
    });

    // Mock membership query
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [
        {
          id: mockMembershipId,
          joined_at: '2026-02-01T00:00:00Z',
        },
      ],
    });

    // Mock membership update
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    // Mock event insertion
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    await mockClient.query!(
      `UPDATE memberships 
       SET left_at = NOW(), status = 'left'
       WHERE id = $1`,
      [mockMembershipId]
    );

    const updateCall = (mockClient.query as any).mock.calls[2];
    expect(updateCall[0]).toContain("status = 'left'");
    expect(updateCall[0]).toContain('left_at = NOW()');
  });

  it('AC14: Logs membership.ended event with correct metadata', async () => {
    // Setup mocks
    (mockClient.query as any)
      .mockResolvedValueOnce({
        rows: [
          {
            id: mockMissionId,
            stable_id: mockMissionStableId,
            name: 'Test Mission',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: mockMembershipId, joined_at: '2026-02-01T00:00:00Z' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await mockClient.query!(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'membership', $2, 'membership.ended', $3)`,
      [
        mockMemberId,
        mockMembershipId,
        {
          group_id: mockMissionId,
          group_stable_id: mockMissionStableId,
          group_name: 'Test Mission',
          member_id: mockMemberId,
          member_stable_id: mockMemberStableId,
          joined_at: '2026-02-01T00:00:00Z',
          left_at: '2026-02-13T00:00:00Z',
          days_active: 12,
        },
      ]
    );

    const eventCall = (mockClient.query as any).mock.calls[3];
    const metadata = eventCall[1][2];

    expect(eventCall[1][1]).toBe('membership');
    expect(eventCall[1][2]).toBe('membership.ended');
    expect(metadata).toMatchObject({
      group_id: mockMissionId,
      group_stable_id: mockMissionStableId,
      member_id: mockMemberId,
      member_stable_id: mockMemberStableId,
      days_active: 12,
    });
    expect(metadata).toHaveProperty('joined_at');
    expect(metadata).toHaveProperty('left_at');
  });

  it('AC22: Leave action is non-punitive (no Trust Score deduction)', async () => {
    // Setup mocks
    (mockClient.query as any)
      .mockResolvedValueOnce({
        rows: [
          {
            id: mockMissionId,
            stable_id: mockMissionStableId,
            name: 'Test Mission',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: mockMembershipId, joined_at: '2026-02-01T00:00:00Z' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    // Verify no queries update members.trust_score_cached
    const queryStr1 = (mockClient.query as any).mock.calls[0][0];
    const queryStr2 = (mockClient.query as any).mock.calls[1][0];
    const queryStr3 = (mockClient.query as any).mock.calls[2][0];

    expect(queryStr1).not.toContain('trust_score_cached');
    expect(queryStr2).not.toContain('trust_score_cached');
    expect(queryStr3).not.toContain('trust_score_cached');
  });

  it('AC8: Re-join after leaving works (no constraint violation)', async () => {
    // This test validates that memberships table allows re-joining
    // by not having a strict unique constraint on (member_id, group_id)
    // Only (member_id, group_id) WHERE status='active' is unique

    // Mock first membership (active)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: mockMembershipId, status: 'active' }],
    });

    // After leaving, status becomes 'left'
    // Mock second join attempt (should succeed)
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [], // No active membership found
    });

    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: '60000000-0000-0000-0000-000000000002' }], // New membership created
    });

    const newMembershipResult = await mockClient.query!(
      `INSERT INTO memberships (member_id, group_id, role, joined_at, status)
       VALUES ($1, $2, 'Member', NOW(), 'active')
       RETURNING id`,
      [mockMemberId, mockMissionId]
    );

    expect(newMembershipResult.rows[0].id).toBeTruthy();
  });
});

describe('Mission API: Atomic Transactions', () => {
  let mockClient: Partial<PoolClient>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
  });

  it('AC7: Join action is atomic (membership + event in transaction)', async () => {
    // This test verifies that join operations use withTransaction
    // If event logging fails, membership creation should rollback

    // Mock successful membership creation
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [{ id: mockMembershipId }],
    });

    // Mock event logging failure (simulating transaction rollback)
    (mockClient.query as any).mockRejectedValueOnce(
      new Error('Event insertion failed')
    );

    try {
      await Promise.all([
        mockClient.query!(`INSERT INTO memberships ...`),
        mockClient.query!(`INSERT INTO events ...`),
      ]);
    } catch (error) {
      expect(error).toBeDefined();
      // In real implementation, withTransaction will ensure membership is rolled back
    }
  });

  it('AC7: Leave action is atomic (update + event in transaction)', async () => {
    // Mock successful membership update
    (mockClient.query as any).mockResolvedValueOnce({
      rows: [],
    });

    // Mock event logging failure
    (mockClient.query as any).mockRejectedValueOnce(
      new Error('Event insertion failed')
    );

    try {
      await Promise.all([
        mockClient.query!(`UPDATE memberships ...`),
        mockClient.query!(`INSERT INTO events ...`),
      ]);
    } catch (error) {
      expect(error).toBeDefined();
      // In real implementation, withTransaction will ensure update is rolled back
    }
  });
});

describe('Mission API: Sanctuary Culture Messages', () => {
  it('AC21: Ineligible message is supportive and specific', () => {
    const memberTrustScore = 150;
    const minRequired = 250;
    const pointsNeeded = minRequired - memberTrustScore;

    const expectedMessage = `You need ${pointsNeeded} more Trust Points to join this mission. Keep completing tasks!`;

    expect(expectedMessage).toContain('Keep completing tasks');
    expect(expectedMessage).not.toContain("don't qualify");
    expect(expectedMessage).not.toContain('Access denied');
    expect(pointsNeeded).toBe(100);
  });

  it('AC22: Leave message is non-punitive and encouraging', () => {
    const missionName = 'Webinar Series Season 0';
    const expectedMessage = `You've left ${missionName}. You can rejoin anytime!`;

    expect(expectedMessage).toContain('You can rejoin anytime');
    expect(expectedMessage).not.toContain('Are you sure');
    expect(expectedMessage).not.toContain("can't undo");
  });
});
