/**
 * Integration Tests: Mission Task Management (S4-04)
 *
 * Tests for mission-scoped task API endpoints:
 * - GET /api/trust-builder/missions/[id]/tasks
 * - GET /api/trust-builder/missions/me
 * - Mission context in claim events
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withTransaction } from '@/lib/db/connection';
import { createSessionCookie } from '@/lib/auth';

const API_BASE = 'http://localhost:4321';
const DATABASE_URL = process.env.DATABASE_URL!;

// Test fixtures
let testMemberId: string;
let testMemberEmail: string;
let testMissionId: string;
let testTaskId: string;
let testCookies: string;

describe('Mission Task Management API: GET /api/trust-builder/missions/[id]/tasks', () => {
  beforeAll(async () => {
    // Setup: Create test member, mission, membership, and task
    const result = await withTransaction(DATABASE_URL, async (client) => {
      // Generate member_id
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM members'
      );
      const count = parseInt(countResult.rows[0].count);
      const nextNumber = count + 1;
      const memberId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

      // Create test member with proper member_id
      const memberResult = await client.query(
        `INSERT INTO members (email, member_id, role) 
         VALUES ($1, $2, 'contributor') 
         RETURNING id, member_id, email`,
        [`test-${Date.now()}@example.com`, memberId]
      );
      const member = memberResult.rows[0] as {
        id: string;
        member_id: string;
        email: string;
      };

      // Create test mission with stable_id
      const missionCount = await client.query(
        `SELECT COUNT(*) as count FROM groups WHERE type = 'mission'`
      );
      const mCount = parseInt(missionCount.rows[0].count);
      const nextMissionNumber = mCount + 1;
      const stableId = `FE-M-${String(nextMissionNumber).padStart(5, '0')}`;

      const missionResult = await client.query(
        `INSERT INTO groups (name, stable_id, description, type, status) 
         VALUES ($1, $2, $3, 'mission', 'active') 
         RETURNING id, stable_id`,
        [`Test Mission ${Date.now()}`, stableId, 'Test mission for S4-04']
      );
      const mission = missionResult.rows[0] as {
        id: string;
        stable_id: string;
      };

      // Create membership (join mission)
      await client.query(
        `INSERT INTO memberships (member_id, group_id, role, status, joined_at) 
         VALUES ($1, $2, 'Member', 'active', NOW())`,
        [member.id, mission.id]
      );

      // Create task in mission
      const taskResult = await client.query(
        `INSERT INTO tasks (title, description, state, task_type, verification_method, max_completions, group_id, created_by) 
         VALUES ($1, $2, 'open', 'simple', 'peer_review', 1, $3, $4) 
         RETURNING id`,
        ['Test Task', 'Complete this task', mission.id, member.id]
      );
      const task = taskResult.rows[0] as { id: string };

      // Add criterion for claim testing
      await client.query(
        `INSERT INTO criteria (task_id, description, proof_type, verification_method, sort_order) 
         VALUES ($1, 'Test criterion', 'text', 'auto_approve', 1)`,
        [task.id]
      );

      return {
        memberId: member.id,
        memberEmail: member.email,
        missionId: mission.id,
        taskId: task.id,
      };
    });

    testMemberId = result.memberId;
    testMemberEmail = result.memberEmail;
    testMissionId = result.missionId;
    testTaskId = result.taskId;

    // Create session cookie directly for testing
    // Extract just the cookie value (name=value) from Set-Cookie format
    const cookieHeader = createSessionCookie(testMemberId);
    testCookies = cookieHeader.split(';')[0];
  });

  afterAll(async () => {
    // Cleanup
    await withTransaction(DATABASE_URL, async (client) => {
      await client.query('DELETE FROM members WHERE id = $1', [testMemberId]);
      await client.query('DELETE FROM groups WHERE id = $1', [testMissionId]);
    });
  });

  it('AC9: Returns mission tasks with claim status for members', async () => {
    const response = await fetch(
      `${API_BASE}/api/trust-builder/missions/${testMissionId}/tasks`,
      {
        method: 'GET',
        headers: { Cookie: testCookies },
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.isMember).toBe(true);
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.tasks.length).toBeGreaterThan(0);

    const task = data.tasks[0];
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('title');
    expect(task).toHaveProperty('claim_status');
    expect(['unclaimed', 'claimed_by_me', 'claimed_by_other']).toContain(
      task.claim_status
    );
    expect(task.group_id).toBe(testMissionId);
  });

  it('AC18: Returns 403 error for non-members', async () => {
    // Create non-member with proper member_id
    const nonMemberResult = await withTransaction(
      DATABASE_URL,
      async (client) => {
        // Generate member_id
        const countResult = await client.query(
          'SELECT COUNT(*) as count FROM members'
        );
        const count = parseInt(countResult.rows[0].count);
        const nextNumber = count + 1;
        const memberId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

        const result = await client.query(
          `INSERT INTO members (email, member_id, role) 
         VALUES ($1, $2, 'contributor') 
         RETURNING id, email`,
          [`nonmember-${Date.now()}@example.com`, memberId]
        );
        return result.rows[0] as { id: string; email: string };
      }
    );

    // Create session cookie for non-member
    const cookieHeader = createSessionCookie(nonMemberResult.id);
    const nonMemberCookies = cookieHeader.split(';')[0];

    // Try to access mission tasks
    const response = await fetch(
      `${API_BASE}/api/trust-builder/missions/${testMissionId}/tasks`,
      {
        method: 'GET',
        headers: { Cookie: nonMemberCookies },
      }
    );

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Not a member');
    expect(data.isMember).toBe(false);
    expect(data.message).toContain('Join this mission');

    // Cleanup non-member
    await withTransaction(DATABASE_URL, async (client) => {
      await client.query('DELETE FROM members WHERE id = $1', [
        nonMemberResult.id,
      ]);
    });
  });

  it('AC20: Returns empty array when no open tasks', async () => {
    // Create mission without tasks, with proper stable_id
    const emptyMissionResult = await withTransaction(
      DATABASE_URL,
      async (client) => {
        const missionCount = await client.query(
          `SELECT COUNT(*) as count FROM groups WHERE type = 'mission'`
        );
        const count = parseInt(missionCount.rows[0].count);
        const nextNumber = count + 1;
        const stableId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

        const missionResult = await client.query(
          `INSERT INTO groups (name, stable_id, description, type, status) 
         VALUES ($1, $2, $3, 'mission', 'active') 
         RETURNING id`,
          [`Empty Mission ${Date.now()}`, stableId, 'No tasks here']
        );
        const mission = missionResult.rows[0] as { id: string };

        // Add membership
        await client.query(
          `INSERT INTO memberships (member_id, group_id, role, status, joined_at) 
         VALUES ($1, $2, 'Member', 'active', NOW())`,
          [testMemberId, mission.id]
        );

        return mission.id;
      }
    );

    const response = await fetch(
      `${API_BASE}/api/trust-builder/missions/${emptyMissionResult}/tasks`,
      {
        method: 'GET',
        headers: { Cookie: testCookies },
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tasks).toEqual([]);

    // Cleanup
    await withTransaction(DATABASE_URL, async (client) => {
      await client.query('DELETE FROM groups WHERE id = $1', [
        emptyMissionResult,
      ]);
    });
  });
});

describe('Mission Task Management API: GET /api/trust-builder/missions/me', () => {
  it('AC14 & AC15: Returns joined missions with task progress', async () => {
    const response = await fetch(`${API_BASE}/api/trust-builder/missions/me`, {
      method: 'GET',
      headers: { Cookie: testCookies },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.missions)).toBe(true);
    expect(data.missions.length).toBeGreaterThan(0);

    const mission = data.missions[0];
    expect(mission).toHaveProperty('id');
    expect(mission).toHaveProperty('name');
    expect(mission).toHaveProperty('tasks_available');
    expect(mission).toHaveProperty('tasks_completed');
    expect(typeof mission.tasks_available).toBe('number');
    expect(typeof mission.tasks_completed).toBe('number');
    expect(mission.id).toBe(testMissionId);
  });

  it('Returns empty array for member with no missions', async () => {
    // Create member without missions, with proper member_id
    const newMemberResult = await withTransaction(
      DATABASE_URL,
      async (client) => {
        // Generate member_id
        const countResult = await client.query(
          'SELECT COUNT(*) as count FROM members'
        );
        const count = parseInt(countResult.rows[0].count);
        const nextNumber = count + 1;
        const memberId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

        const result = await client.query(
          `INSERT INTO members (email, member_id, role) 
         VALUES ($1, $2, 'contributor') 
         RETURNING id, email`,
          [`nomissions-${Date.now()}@example.com`, memberId]
        );
        return result.rows[0] as { id: string; email: string };
      }
    );

    // Get auth
    const loginResponse = await fetch(
      `${API_BASE}/api/trust-builder/auth/signin`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberResult.email }),
      }
    );
    const newMemberCookies = loginResponse.headers.get('set-cookie') || '';

    const response = await fetch(`${API_BASE}/api/trust-builder/missions/me`, {
      method: 'GET',
      headers: { Cookie: newMemberCookies },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.missions).toEqual([]);

    // Cleanup
    await withTransaction(DATABASE_URL, async (client) => {
      await client.query('DELETE FROM members WHERE id = $1', [
        newMemberResult.id,
      ]);
    });
  });

  it('Returns 401 for unauthenticated requests', async () => {
    const response = await fetch(`${API_BASE}/api/trust-builder/missions/me`, {
      method: 'GET',
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toContain('Unauthorized');
  });
});

describe('Mission Context in Claim Events (S4-04: AC16)', () => {
  it('AC16: CLAIM_SUBMITTED event includes mission context', async () => {
    // Get task criterion for proof
    const criterionResult = await withTransaction(
      DATABASE_URL,
      async (client) => {
        const result = await client.query(
          `SELECT id FROM criteria WHERE task_id = $1 LIMIT 1`,
          [testTaskId]
        );
        return result.rows[0] as { id: string };
      }
    );

    // Submit claim on mission task
    const claimResponse = await fetch(`${API_BASE}/api/trust-builder/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: testCookies,
      },
      body: JSON.stringify({
        task_id: testTaskId,
        proofs: [
          {
            criterion_id: criterionResult.id,
            proof_text: 'Test proof for mission task',
          },
        ],
      }),
    });

    expect(claimResponse.status).toBe(201);

    const claimData = await claimResponse.json();
    const claimId = claimData.claim_id;

    // Verify CLAIM_SUBMITTED event has mission context
    const eventResult = await withTransaction(DATABASE_URL, async (client) => {
      const result = await client.query(
        `SELECT metadata FROM events 
            WHERE entity_type = 'claim' 
              AND entity_id = $1
              AND event_type = 'claim.submitted'
            ORDER BY timestamp DESC 
            LIMIT 1`,
        [claimId]
      );
      return result.rows[0] as { metadata: any };
    });

    expect(eventResult.metadata).toHaveProperty('group_id');
    expect(eventResult.metadata).toHaveProperty('group_stable_id');
    expect(eventResult.metadata).toHaveProperty('group_name');
    expect(eventResult.metadata.group_id).toBe(testMissionId);
  });

  it('AC16: CLAIM_APPROVED event includes mission context', async () => {
    // Create new task for auto-approve test
    const newTaskResult = await withTransaction(
      DATABASE_URL,
      async (client) => {
        const taskResult = await client.query(
          `INSERT INTO tasks (title, description, state, task_type, verification_method, max_completions, group_id, created_by) 
         VALUES ($1, $2, 'open', 'simple', 'auto_approve', 1, $3, $4) 
         RETURNING id`,
          [
            'Auto-approve Task',
            'Auto-approved mission task',
            testMissionId,
            testMemberId,
          ]
        );
        const task = taskResult.rows[0] as { id: string };

        // Add auto-approve criterion
        const criterionResult = await client.query(
          `INSERT INTO criteria (task_id, description, proof_type, verification_method, sort_order) 
         VALUES ($1, 'Auto criterion', 'text', 'auto_approve', 1)
         RETURNING id`,
          [task.id]
        );

        return {
          taskId: task.id,
          criterionId: (criterionResult.rows[0] as { id: string }).id,
        };
      }
    );

    // Submit auto-approve claim
    const claimResponse = await fetch(`${API_BASE}/api/trust-builder/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: testCookies,
      },
      body: JSON.stringify({
        task_id: newTaskResult.taskId,
        proofs: [
          {
            criterion_id: newTaskResult.criterionId,
            proof_text: 'Test auto-approve proof',
          },
        ],
      }),
    });

    expect(claimResponse.status).toBe(201);

    const claimData = await claimResponse.json();
    expect(claimData.status).toBe('approved');
    const claimId = claimData.claim_id;

    // Verify CLAIM_APPROVED event has mission context
    const eventResult = await withTransaction(DATABASE_URL, async (client) => {
      const result = await client.query(
        `SELECT metadata FROM events 
            WHERE entity_type = 'claim' 
              AND entity_id = $1
              AND event_type = 'claim.approved'
            ORDER BY timestamp DESC 
            LIMIT 1`,
        [claimId]
      );
      return result.rows[0] as { metadata: any };
    });

    expect(eventResult.metadata).toHaveProperty('group_id');
    expect(eventResult.metadata).toHaveProperty('group_stable_id');
    expect(eventResult.metadata).toHaveProperty('group_name');
    expect(eventResult.metadata.group_id).toBe(testMissionId);
    expect(eventResult.metadata.auto_approved).toBe(true);
  });

  it('AC16: TRUST_UPDATED event includes mission context', async () => {
    // Use previous auto-approved claim to check TRUST_UPDATED event
    const eventResult = await withTransaction(DATABASE_URL, async (client) => {
      const result = await client.query(
        `SELECT metadata FROM events 
            WHERE entity_type = 'member' 
              AND actor_id = $1
              AND event_type = 'trust.updated'
            ORDER BY timestamp DESC 
            LIMIT 1`,
        [testMemberId]
      );
      return result.rows[0] as { metadata: any };
    });

    expect(eventResult.metadata).toHaveProperty('group_id');
    expect(eventResult.metadata).toHaveProperty('group_stable_id');
    expect(eventResult.metadata).toHaveProperty('group_name');
    expect(eventResult.metadata.group_id).toBe(testMissionId);
    expect(eventResult.metadata).toHaveProperty('points_added');
  });
});
