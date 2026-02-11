/**
 * Claim Review API Integration Tests
 *
 * Tests: PATCH /api/trust-builder/claims/[id]/review
 * - Validates claim review decisions (approve, reject, revision)
 * - Tests Trust Score update events (quasi-smart contract)
 * - Verifies reviewer authorization and feedback requirements
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
import { PATCH } from '@/pages/api/trust-builder/claims/[id]/review';
import * as auth from '@/lib/auth';
import * as dbConnection from '@/lib/db/connection';
import * as claimEngine from '@/lib/contracts/claim-engine';

describe('PATCH /api/trust-builder/claims/[id]/review', () => {
  const mockReviewer = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'steward@example.com',
    member_id: 'FE-M-99998',
    role: 'steward',
    trust_score_cached: 500,
  };

  const mockClaimId = '00000000-0000-0000-0000-000000000030';

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

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'approve',
        }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockReviewer as any);
    });

    it('should return 400 if claim ID is missing', async () => {
      const request = new Request('http://localhost/api/claims//review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });

      const response = await PATCH({
        request,
        params: { id: undefined },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing claim ID');
    });

    it('should return 400 if decision is missing', async () => {
      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Invalid decision');
    });

    it('should return 400 if decision is invalid', async () => {
      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'invalid' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Invalid decision');
    });

    it('should return 400 if reject decision has no feedback', async () => {
      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'reject' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('feedback');
    });

    it('should return 400 if reject feedback is too short (sanctuary culture)', async () => {
      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'reject',
          feedback: 'Too short',
        }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('minimum 20 characters');
      expect(body.error).toContain('support their growth'); // Sanctuary message
    });

    it('should return 400 if revision decision has no feedback', async () => {
      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'revision' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('feedback');
    });
  });

  describe('Approve Decision', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockReviewer as any);
    });

    it('should approve claim and return success', async () => {
      const mockApprovalResult = {
        success: true,
        pointsAwarded: 50,
        newTrustScore: 150,
        oldTrustScore: 100,
        claim: {
          id: mockClaimId,
          status: 'approved',
        },
      };

      vi.mocked(claimEngine.approveClaimWithReview).mockResolvedValue(
        mockApprovalResult as any
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'approve',
          feedback: 'Excellent work!',
        }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.pointsAwarded).toBe(50);

      // Verify approveClaimWithReview was called with correct args
      expect(claimEngine.approveClaimWithReview).toHaveBeenCalledWith(
        expect.any(Object), // client
        mockClaimId,
        mockReviewer.id,
        'Excellent work!'
      );
    });

    it('should approve claim without feedback', async () => {
      const mockApprovalResult = {
        success: true,
        pointsAwarded: 50,
        claim: { id: mockClaimId, status: 'approved' },
      };

      vi.mocked(claimEngine.approveClaimWithReview).mockResolvedValue(
        mockApprovalResult as any
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);

      expect(response.status).toBe(200);
      expect(claimEngine.approveClaimWithReview).toHaveBeenCalledWith(
        expect.any(Object),
        mockClaimId,
        mockReviewer.id,
        undefined // No feedback
      );
    });
  });

  describe('Reject Decision', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockReviewer as any);
    });

    it('should reject claim with feedback', async () => {
      vi.mocked(claimEngine.rejectClaim).mockResolvedValue(undefined);

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const feedback = 'Please provide more detailed evidence of completion';

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'reject',
          feedback,
        }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('needing more information');

      // Verify rejectClaim was called
      expect(claimEngine.rejectClaim).toHaveBeenCalledWith(
        expect.any(Object),
        mockClaimId,
        mockReviewer.id,
        feedback
      );
    });
  });

  describe('Revision Request', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockReviewer as any);
    });

    it('should request revision with feedback', async () => {
      vi.mocked(claimEngine.requestRevision).mockResolvedValue(undefined);

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const feedback = 'Please add screenshots showing the completed steps';

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'revision',
          feedback,
        }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Revision requested');

      // Verify requestRevision was called
      expect(claimEngine.requestRevision).toHaveBeenCalledWith(
        expect.any(Object),
        mockClaimId,
        mockReviewer.id,
        feedback
      );
    });
  });

  describe('Authorization Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockReviewer as any);
    });

    it('should return 403 if user is not the assigned reviewer', async () => {
      vi.mocked(claimEngine.approveClaimWithReview).mockRejectedValue(
        new Error('UNAUTHORIZED_REVIEWER')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain('not the assigned reviewer');
    });

    it('should return 400 if claim is not under review', async () => {
      vi.mocked(claimEngine.approveClaimWithReview).mockRejectedValue(
        new Error('CLAIM_NOT_UNDER_REVIEW')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('not currently under review');
    });

    it('should return 400 if max revisions reached', async () => {
      vi.mocked(claimEngine.requestRevision).mockRejectedValue(
        new Error('MAX_REVISIONS_REACHED: 2 revisions already requested')
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'revision',
          feedback: 'Please revise this claim again',
        }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('maximum revision limit');
      expect(body.revisionLimit).toBe(2);
    });
  });

  describe('Quasi-Smart Contract Validation', () => {
    beforeEach(() => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(mockReviewer as any);
    });

    it('should use atomic transaction for review decisions', async () => {
      vi.mocked(claimEngine.approveClaimWithReview).mockResolvedValue({
        success: true,
        pointsAwarded: 50,
      } as any);

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });

      await PATCH({ request, params: { id: mockClaimId } } as any);

      // Verify withTransaction was called
      expect(dbConnection.withTransaction).toHaveBeenCalledWith(
        'postgresql://test:test@localhost:5432/testdb',
        expect.any(Function)
      );
    });

    it('should verify Trust Score update events are logged (integration point)', async () => {
      // This test validates that the API calls approveClaimWithReview
      // The claim engine is responsible for logging Trust Score update events
      // with before/after metadata (tested in claim-engine.test.ts)

      const mockApprovalResult = {
        success: true,
        pointsAwarded: 50,
        newTrustScore: 150,
        oldTrustScore: 100,
      };

      vi.mocked(claimEngine.approveClaimWithReview).mockResolvedValue(
        mockApprovalResult as any
      );

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback({});
        }
      );

      const request = new Request('http://localhost/api/claims/123/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });

      const response = await PATCH({
        request,
        params: { id: mockClaimId },
      } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.pointsAwarded).toBe(50);

      // Verify claim engine was called (which handles event logging)
      expect(claimEngine.approveClaimWithReview).toHaveBeenCalled();

      // In a real database integration test, we would verify:
      // - Event logged to events table with event_type: 'claim:approved'
      // - Event metadata includes trust_score_before: 100, trust_score_after: 150
      // - Event is append-only (no UPDATE/DELETE on events table)
    });
  });
});
