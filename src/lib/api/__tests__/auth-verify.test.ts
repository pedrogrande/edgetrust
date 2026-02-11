/**
 * Auth Verify API Integration Tests
 *
 * Tests:  POST /api/trust-builder/auth/verify
 * - Validates email + code verification
 * - Tests member creation and session establishment
 * - Verifies event logging for new members (quasi-smart contract)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventType } from '@/types/trust-builder';

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
vi.mock('@/lib/auth/codes');
vi.mock('@/lib/db/connection', () => ({
  sql: vi.fn(),
  withTransaction: vi.fn(),
}));

// Import after mocking
import { POST } from '@/pages/api/trust-builder/auth/verify';
import * as authCodes from '@/lib/auth/codes';
import * as dbConnection from '@/lib/db/connection';

describe('POST /api/trust-builder/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should return 400 if email is missing', async () => {
      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Email and code are required');
    });

    it('should return 400 if code is missing', async () => {
      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Email and code are required');
    });

    it('should return 401 if code is invalid', async () => {
      vi.mocked(authCodes.verifyCode).mockReturnValue(false);

      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          code: 'invalid',
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid or expired verification code');
      expect(authCodes.verifyCode).toHaveBeenCalledWith(
        'test@example.com',
        'invalid'
      );
    });
  });

  describe('Existing Member Flow', () => {
    it('should return existing member without creating event', async () => {
      vi.mocked(authCodes.verifyCode).mockReturnValue(true);

      const existingMember = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'existing@example.com',
        member_id: 'FE-M-00001',
        role: 'explorer',
        trust_score_cached: 100,
      };

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({
          // SELECT query returns existing member
          rows: [existingMember],
        }),
      };

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback(mockClient);
        }
      );

      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          code: '123456',
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.member).toEqual(existingMember);
      expect(body.isNew).toBe(false);

      // Verify no event was logged (existing members don't generate events)
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('New Member Creation (Quasi-Smart Contract)', () => {
    it('should create new member and log member.created event', async () => {
      vi.mocked(authCodes.verifyCode).mockReturnValue(true);

      const newMemberId = '00000000-0000-0000-0000-000000000002';
      const newMember = {
        id: newMemberId,
        email: 'new@example.com',
        member_id: 'FE-M-00005',
        role: 'explorer',
        trust_score_cached: 0,
      };

      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({
            // SELECT query returns no existing member
            rows: [],
          })
          .mockResolvedValueOnce({
            // COUNT query for member ID generation
            rows: [{ count: '4' }],
          })
          .mockResolvedValueOnce({
            // INSERT member query
            rows: [newMember],
          })
          .mockResolvedValueOnce({
            // INSERT event query
            rows: [
              {
                id: 'event-id',
                actor_id: newMemberId,
                entity_type: 'member',
                entity_id: newMemberId,
                event_type: EventType.MEMBER_CREATED,
              },
            ],
          }),
      };

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback(mockClient);
        }
      );

      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          code: '123456',
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(201); // 201 for new member creation
      expect(body.member.email).toBe('new@example.com');
      expect(body.member.member_id).toBe('FE-M-00005');
      expect(body.isNew).toBe(true);

      // Verify event was logged (quasi-smart contract validation)
      expect(mockClient.query).toHaveBeenCalledTimes(4);

      const eventInsertCall = mockClient.query.mock.calls[3];
      expect(eventInsertCall[0]).toContain('INSERT INTO events');
      expect(eventInsertCall[1]).toEqual([
        newMemberId,
        'member',
        newMemberId,
        EventType.MEMBER_CREATED,
        expect.stringContaining('FE-M-00005'),
      ]);
    });

    it('should generate sequential member IDs', async () => {
      vi.mocked(authCodes.verifyCode).mockReturnValue(true);

      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // No existing member
          .mockResolvedValueOnce({ rows: [{ count: '42' }] }) // 42 existing members
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'new-id',
                member_id: 'FE-M-00043',
                email: 'test@example.com',
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ id: 'event-id' }] }), // Event insert
      };

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback(mockClient);
        }
      );

      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456',
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(201); // 201 for new member creation
      expect(body.member.member_id).toBe('FE-M-00043');
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(authCodes.verifyCode).mockReturnValue(true);

      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'new-id',
                email: 'test@example.com', // Normalized
                member_id: 'FE-M-00001',
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ id: 'event-id' }] }),
      };

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback(mockClient);
        }
      );

      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'Test@EXAMPLE.com', // Mixed case
          code: '123456',
        }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(201); // 201 for new member creation

      // Verify SELECT query used normalized email
      const selectCall = mockClient.query.mock.calls[0];
      expect(selectCall[1]).toEqual(['test@example.com']);
    });
  });

  describe('Event Metadata Completeness', () => {
    it('should include member_id, email, and role in event metadata', async () => {
      vi.mocked(authCodes.verifyCode).mockReturnValue(true);

      const newMember = {
        id: 'member-id',
        email: 'member@example.com',
        member_id: 'FE-M-00001',
        role: 'explorer',
        trust_score_cached: 0,
      };

      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          .mockResolvedValueOnce({ rows: [newMember] })
          .mockResolvedValueOnce({ rows: [{ id: 'event-id' }] }),
      };

      vi.mocked(dbConnection.withTransaction).mockImplementation(
        async (dbUrl: string, callback: any) => {
          return await callback(mockClient);
        }
      );

      const request = new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'member@example.com',
          code: '123456',
        }),
      });

      await POST({ request } as any);

      // Verify event metadata includes all required fields
      const eventInsertCall = mockClient.query.mock.calls[3];
      const metadataJson = eventInsertCall[1][4];
      const metadata = JSON.parse(metadataJson);

      expect(metadata).toHaveProperty('member_id', 'FE-M-00001');
      expect(metadata).toHaveProperty('email', 'member@example.com');
      expect(metadata).toHaveProperty('role', 'explorer');
    });
  });
});
