/**
 * Claim Submission API Integration Tests
 *
 * Tests: POST /api/trust-builder/claims
 * - Validates claim submission workflow
 * - Tests event logging (quasi-smart contract)
 * - Verifies business logic constraints (duplicate claims, max completions)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set environment before any imports
vi.hoisted(() => {
  Object.defineProperty(globalThis, 'import', {
    value: {
      meta: {
        env: {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
        },
      },
    },
    writable: true,
    configurable: true,
  });
});

// Mock modules BEFORE importing API handlers
vi.mock('@/lib/auth');
vi.mock('@/lib/db/connection', () => ({
  sql: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock('@/lib/contracts/claim-engine');

// Import after mocking
import { POST } from '@/pages/api/trust-builder/claims';
import * as auth from '@/lib/auth';
import * as dbConnection from '@/lib/db/connection';
import * as claimEngine from '@/lib/contracts/claim-engine';

describe('POST /api/trust-builder/claims', () => {
  const mockMember = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
    member_id: 'FE-M-99999',
    role: 'explorer',
    trust_score_cached: 100,
  };

  const mockTaskId = '00000000-0000-4000-8000-000000000010';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment
    vi.stubGlobal('import', {
      meta: {
        env: {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
        },
      },
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed the task' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toContain('signed in');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockMember as any);
    });

    it('should return 400 if task_id is missing', async () => {
      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofs: [{ text: 'Completed' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields');
    });

    it('should return 400 if proofs is missing', async () => {
      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields');
    });

    it('should return 400 if proofs is not an array', async () => {
      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: 'not an array',
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields');
    });

    it('should return 400 if task_id is not a valid UUID', async () => {
      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: 'not-a-uuid',
          proofs: [{ text: 'Completed' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid task_id');
    });

    it('should return 400 if request body is invalid JSON', async () => {
      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid request body');
    });
  });

  describe('Successful Claim Submission', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockMember as any);
    });

    it('should submit claim and return success response', async () => {
      const claimId = '00000000-0000-0000-0000-000000000030';

      const mockClaimResult = {
        claimId: claimId, // API expects result.claimId
        status: 'submitted',
        message: 'Claim submitted successfully',
        pointsEarned: 50,
        newTrustScore: 150,
      };

      vi.mocked(claimEngine.processClaimSubmission).mockResolvedValue(
        mockClaimResult as any
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const proofs = [
        { text: 'Completed all criteria', criterion_id: 'crit-1' },
      ];

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs,
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.claim_id).toBe(claimId);
      expect(body.status).toBe('submitted');
      expect(body.points_earned).toBe(50);

      // Verify processClaimSubmission was called with correct args
      expect(claimEngine.processClaimSubmission).toHaveBeenCalledWith(
        expect.any(Object), // client
        mockMember.id,
        mockTaskId,
        proofs
      );
    });
  });

  describe('Business Logic Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockMember as any);
    });

    it('should return 404 if task not found', async () => {
      vi.mocked(claimEngine.processClaimSubmission).mockRejectedValue(
        new Error('TASK_NOT_FOUND')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('TASK_NOT_FOUND');
      expect(body.message).toBe('Task not found');
    });

    it('should return 409 if duplicate claim', async () => {
      vi.mocked(claimEngine.processClaimSubmission).mockRejectedValue(
        new Error('DUPLICATE_CLAIM')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe('DUPLICATE_CLAIM');
      expect(body.message).toBe('You have already claimed this task');
    });

    it('should return 410 if task not open', async () => {
      vi.mocked(claimEngine.processClaimSubmission).mockRejectedValue(
        new Error('TASK_NOT_OPEN')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(410);
      expect(body.error).toBe('TASK_NOT_OPEN');
      expect(body.message).toBe('This task is no longer accepting claims');
    });

    it('should return 410 if max completions reached', async () => {
      vi.mocked(claimEngine.processClaimSubmission).mockRejectedValue(
        new Error('MAX_COMPLETIONS_REACHED')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed' }],
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(410);
      expect(body.error).toBe('MAX_COMPLETIONS_REACHED');
      expect(body.message).toBe('This task has reached its completion limit');
    });
  });

  describe('Quasi-Smart Contract Validation', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockMember as any);
    });

    it('should use atomic transaction for claim submission', async () => {
      const mockClaimResult = {
        success: true,
        claim: {
          id: 'claim-id',
          status: 'submitted',
        },
      };

      vi.mocked(claimEngine.processClaimSubmission).mockResolvedValue(
        mockClaimResult as any
      );

      const transactionCallback = vi.fn().mockResolvedValue(mockClaimResult);
      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed' }],
        }),
      });

      await POST({ request } as any);

      // Verify withTransaction was called
      expect(dbConnection.withTransaction).toHaveBeenCalledWith(
        'postgresql://test:test@localhost:5432/testdb',
        expect.any(Function)
      );
    });

    it('should verify processClaimSubmission logs events (integration point)', async () => {
      // This test validates that the API calls the claim engine
      // The claim engine itself is responsible for logging events
      // (tested in claim-engine.test.ts)

      const mockClaimResult = {
        success: true,
        claim: { id: 'claim-id', status: 'submitted' },
      };

      vi.mocked(claimEngine.processClaimSubmission).mockResolvedValue(
        mockClaimResult as any
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: mockTaskId,
          proofs: [{ text: 'Completed task successfully' }],
        }),
      });

      await POST({ request } as any);

      // Verify claim engine was called (which handles event logging)
      expect(claimEngine.processClaimSubmission).toHaveBeenCalled();
    });
  });
});
