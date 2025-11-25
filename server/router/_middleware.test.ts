/**
 * Unit Tests for tRPC Middleware Guards
 * 
 * Tests the requireStore middleware following the test plan:
 * 1. Missing storeId (should throw BAD_REQUEST)
 * 2. Invalid UUID format (should throw BAD_REQUEST)
 * 3. Valid UUID (should call next with validated storeId)
 * 4. Context propagation (should pass all context fields)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { requireStore, requireAuth } from './_middleware';
import type { Context } from '../context';

describe('requireStore middleware', () => {
  // Mock next function
  const mockNext = vi.fn();

  beforeEach(() => {
    mockNext.mockClear();
  });

  describe('GUARD CLAUSE 1: Missing storeId', () => {
    it('should throw BAD_REQUEST when storeId is undefined', async () => {
      // Arrange
      const ctx: Context = {
        storeId: undefined,
        user: null,
        session: null,
        req: new Request('http://localhost:3000'),
        resHeaders: new Headers(),
      };

      // Act & Assert - Call the middleware function directly
      await expect(
        requireStore._middlewares[0]({
          ctx,
          next: mockNext,
          type: 'query',
          path: 'test.query',
          rawInput: undefined,
          meta: undefined,
          input: undefined,
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        requireStore._middlewares[0]({
          ctx,
          next: mockNext,
          type: 'query',
          path: 'test.query',
          rawInput: undefined,
          meta: undefined,
          input: undefined,
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Missing x-store-id'),
      });

      // Verify next() was NOT called (early return)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST when storeId is empty string', async () => {
      // Arrange
      const ctx: Context = {
        storeId: '',
        user: null,
        session: null,
        req: new Request('http://localhost:3000'),
        resHeaders: new Headers(),
      };

      // Act & Assert
      await expect(
        requireStore._middlewares[0]({
          ctx,
          next: mockNext,
          type: 'query',
          path: 'test.query',
          rawInput: undefined,
          meta: undefined,
          input: undefined,
        })
      ).rejects.toThrow(TRPCError);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('GUARD CLAUSE 2: Invalid UUID format', () => {
    it('should throw BAD_REQUEST when storeId is not a valid UUID', async () => {
      // Arrange
      const ctx: Context = {
        storeId: 'not-a-uuid',
        user: null,
        session: null,
        req: new Request('http://localhost:3000'),
        resHeaders: new Headers(),
      };

      // Act & Assert
      await expect(
        requireStore._middlewares[0]({
          ctx,
          next: mockNext,
          type: 'query',
          path: 'test.query',
          rawInput: undefined,
          meta: undefined,
          input: undefined,
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        requireStore._middlewares[0]({
          ctx,
          next: mockNext,
          type: 'query',
          path: 'test.query',
          rawInput: undefined,
          meta: undefined,
          input: undefined,
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Invalid store ID format'),
      });

      // Verify next() was NOT called (early return)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST for malformed UUID-like strings', async () => {
      const invalidUuids = [
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-42661417400000', // Too long
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
        'not-a-uuid-at-all',
        '00000000-0000-0000-0000-00000000000', // One digit short
      ];

      for (const invalidUuid of invalidUuids) {
        const ctx: Context = {
          storeId: invalidUuid,
          user: null,
          session: null,
          req: new Request('http://localhost:3000'),
          resHeaders: new Headers(),
        };

        await expect(
          requireStore._middlewares[0]({
            ctx,
            next: mockNext,
            type: 'query',
            path: 'test.query',
            rawInput: undefined,
            meta: undefined,
            input: undefined,
          })
        ).rejects.toThrow(TRPCError);
      }
    });
  });

  describe('HAPPY PATH: Valid UUID', () => {
    it('should call next() with validated storeId when valid UUID provided', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const ctx: Context = {
        storeId: validUuid,
        user: null,
        session: null,
        req: new Request('http://localhost:3000'),
        resHeaders: new Headers(),
      };

      mockNext.mockResolvedValue({
        ok: true,
        data: { result: 'success' },
      });

      // Act
      await requireStore._middlewares[0]({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test.query',
        rawInput: undefined,
        meta: undefined,
        input: undefined,
      });

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith({
        ctx: {
          ...ctx,
          storeId: validUuid, // Validated and propagated
        },
      });
    });

    it('should accept various valid UUID formats', async () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      ];

      for (const validUuid of validUuids) {
        mockNext.mockClear();
        mockNext.mockResolvedValue({ ok: true, data: {} });

        const ctx: Context = {
          storeId: validUuid,
          user: null,
          session: null,
          req: new Request('http://localhost:3000'),
          resHeaders: new Headers(),
        };

        await requireStore._middlewares[0]({
          ctx,
          next: mockNext,
          type: 'query',
          path: 'test.query',
          rawInput: undefined,
          meta: undefined,
          input: undefined,
        });

        expect(mockNext).toHaveBeenCalledWith({
          ctx: expect.objectContaining({
            storeId: validUuid,
          }),
        });
      }
    });
  });

  describe('CONTEXT PROPAGATION', () => {
    it('should propagate all context fields to downstream procedures', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockReq = new Request('http://localhost:3000');
      const mockResHeaders = new Headers();

      const ctx: Context = {
        storeId: validUuid,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'admin',
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000,
        },
        req: mockReq,
        resHeaders: mockResHeaders,
      };

      mockNext.mockResolvedValue({ ok: true, data: {} });

      // Act
      await requireStore._middlewares[0]({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test.query',
        rawInput: undefined,
        meta: undefined,
        input: undefined,
      });

      // Assert - All fields should be preserved
      expect(mockNext).toHaveBeenCalledWith({
        ctx: {
          storeId: validUuid,
          user: ctx.user,
          session: ctx.session,
          req: mockReq,
          resHeaders: mockResHeaders,
        },
      });
    });

    it('should preserve user context when validating storeId', async () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockUser = {
        id: 'user-456',
        email: 'another@example.com',
        role: 'owner',
      };

      const ctx: Context = {
        storeId: validUuid,
        user: mockUser,
        session: null,
        req: new Request('http://localhost:3000'),
        resHeaders: new Headers(),
      };

      mockNext.mockResolvedValue({ ok: true, data: {} });

      // Act
      await requireStore._middlewares[0]({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test.query',
        rawInput: undefined,
        meta: undefined,
        input: undefined,
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          user: mockUser,
        }),
      });
    });
  });
});

describe('requireAuth middleware', () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    mockNext.mockClear();
  });

  it('should throw UNAUTHORIZED when user is null', async () => {
    const ctx: Context = {
      storeId: '123e4567-e89b-12d3-a456-426614174000',
      user: null,
      session: null,
      req: new Request('http://localhost:3000'),
      resHeaders: new Headers(),
    };

    await expect(
      requireAuth._middlewares[0]({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test.query',
        rawInput: undefined,
        meta: undefined,
        input: undefined,
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      requireAuth._middlewares[0]({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test.query',
        rawInput: undefined,
        meta: undefined,
        input: undefined,
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: expect.stringContaining('Authentication required'),
    });

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() when user is authenticated', async () => {
    const ctx: Context = {
      storeId: '123e4567-e89b-12d3-a456-426614174000',
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
      session: {
        access_token: 'token',
        refresh_token: 'refresh',
      },
      req: new Request('http://localhost:3000'),
      resHeaders: new Headers(),
    };

    mockNext.mockResolvedValue({ ok: true, data: {} });

    await requireAuth._middlewares[0]({
      ctx,
      next: mockNext,
      type: 'query',
      path: 'test.query',
      rawInput: undefined,
      meta: undefined,
      input: undefined,
    });

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
