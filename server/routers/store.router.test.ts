/**
 * Store Router End-to-End Tests
 * 
 * Tests the complete integration of:
 * 1. Middleware (requireStore) - Ensures storeId validation
 * 2. Zod Schemas (StoreConfigSchema) - Validates input/output
 * 3. Service Layer (storeService) - Business logic
 * 4. Router Procedures (storeRouter) - API endpoints
 * 
 * Test Strategy:
 * - Guard Clause Tests: Missing/invalid storeId (should fail at middleware)
 * - Input Validation Tests: Invalid data (should fail at Zod layer)
 * - Happy Path Tests: Valid requests (should succeed)
 * - Business Logic Tests: Service layer constraints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { appRouter } from './_app';
import type { Context } from '../context';
import {
  createValidStoreConfig,
  createStoreConfigWithName,
} from './__test-helpers__/store-test-data';
import { clearMockDatabase } from '../services/store.service';

/**
 * Helper: Create mock context for testing
 */
function createMockContext(overrides?: Partial<Context>): Context {
  return {
    storeId: undefined,
    user: null,
    session: null,
    req: new Request('http://localhost:3000'),
    resHeaders: new Headers(),
    ...overrides,
  };
}

/**
 * Helper: Create caller with custom context
 * This simulates the tRPC request flow
 */
function createCaller(ctx: Context) {
  return appRouter.createCaller(ctx);
}

describe('Store Router - End-to-End Tests', () => {
  const validStoreId = '123e4567-e89b-12d3-a456-426614174000';
  const validStoreId2 = '987e6543-e21b-43d2-b654-321098765432';

  beforeEach(() => {
    // Clear mock database between tests to ensure test isolation
    clearMockDatabase();
  });

  // ============================================================================
  // GUARD CLAUSE TESTS: Middleware Validation
  // ============================================================================

  describe('Middleware Validation - requireStore', () => {
    it('should throw BAD_REQUEST when x-store-id header is missing (getConfig)', async () => {
      // Arrange: Create context WITHOUT storeId
      const ctx = createMockContext({ storeId: undefined });
      const caller = createCaller(ctx);

      // Act & Assert: Should fail at middleware level
      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
      await expect(caller.store.getConfig()).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Missing x-store-id'),
      });
    });

    it('should throw BAD_REQUEST when x-store-id header is missing (updateConfig)', async () => {
      // Arrange
      const ctx = createMockContext({ storeId: undefined });
      const caller = createCaller(ctx);

      const validInput = {
        storeId: validStoreId,
        metadata: {
          name: 'Test Store',
          currency: 'USD',
          locale: 'en-US',
          keywords: [],
          timezone: 'UTC',
        },
      };

      // Act & Assert: Should fail at middleware level BEFORE Zod validation
      await expect(caller.store.updateConfig(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.store.updateConfig(validInput)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Missing x-store-id'),
      });
    });

    it('should throw BAD_REQUEST when storeId is not a valid UUID', async () => {
      // Arrange: Invalid UUID format
      const ctx = createMockContext({ storeId: 'not-a-uuid' });
      const caller = createCaller(ctx);

      // Act & Assert: Should fail at middleware UUID validation
      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
      await expect(caller.store.getConfig()).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Invalid store ID format'),
      });
    });

    it('should throw BAD_REQUEST when storeId is empty string', async () => {
      // Arrange
      const ctx = createMockContext({ storeId: '' });
      const caller = createCaller(ctx);

      // Act & Assert
      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
    });
  });

  // ============================================================================
  // INPUT VALIDATION TESTS: Zod Schema Validation
  // ============================================================================

  describe('Zod Input Validation', () => {
    it('should throw validation error for invalid metadata structure', async () => {
      // Arrange: Valid storeId, invalid input
      const ctx = createMockContext({ storeId: validStoreId });
      const caller = createCaller(ctx);

      const invalidInput = {
        storeId: validStoreId,
        metadata: {
          name: '', // Invalid: min 1 character required
          currency: 'US', // Invalid: should be 3 characters
        },
      };

      // Act & Assert: Should fail at Zod validation
      await expect(caller.store.updateConfig(invalidInput as any)).rejects.toThrow();
    });

    it('should throw validation error for invalid theme colors', async () => {
      // Arrange
      const ctx = createMockContext({ storeId: validStoreId });
      const caller = createCaller(ctx);

      const invalidInput = {
        storeId: validStoreId,
        theme: {
          colors: {
            primary: 'not-a-hex-color', // Invalid format
          },
        },
      };

      // Act & Assert: Zod should reject invalid hex color
      await expect(caller.store.updateConfig(invalidInput as any)).rejects.toThrow();
    });
  });

  // ============================================================================
  // HAPPY PATH TESTS: Valid Requests
  // ============================================================================

  describe('Happy Path - Valid Requests', () => {
    it('should successfully create a store configuration', async () => {
      // Arrange
      const ctx = createMockContext({ storeId: validStoreId });
      const caller = createCaller(ctx);

      const validConfig = createValidStoreConfig();

      // Act
      const result = await caller.store.createConfig(validConfig);

      // Assert
      expect(result).toBeDefined();
      expect(result.storeId).toBe(validStoreId);
      expect(result.metadata.name).toBe('Test Store');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should successfully get store configuration after creation', async () => {
      // Arrange: Create a store first
      const ctx = createMockContext({ storeId: validStoreId2 });
      const caller = createCaller(ctx);

      const validConfig = createStoreConfigWithName('Another Test Store');

      await caller.store.createConfig(validConfig);

      // Act: Get the configuration
      const result = await caller.store.getConfig();

      // Assert
      expect(result).toBeDefined();
      expect(result.storeId).toBe(validStoreId2);
      expect(result.metadata.name).toBe('Another Test Store');
    });

    it('should successfully update store configuration', async () => {
      // Arrange: Create store first
      const ctx = createMockContext({ storeId: validStoreId });
      const caller = createCaller(ctx);

      const initialConfig = createStoreConfigWithName('Original Name');
      await caller.store.createConfig(initialConfig);

      // Act: Update configuration (partial update)
      const updateInput = {
        storeId: validStoreId,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          name: 'Updated Store Name',
          description: 'Updated description',
          keywords: ['updated', 'test'],
          locale: 'en-US',
          currency: 'USD',
          timezone: 'America/New_York',
        },
      };

      const result = await caller.store.updateConfig(updateInput);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.name).toBe('Updated Store Name');
      expect(result.metadata.description).toBe('Updated description');
      expect(result.metadata.timezone).toBe('America/New_York');
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ============================================================================
  // BUSINESS LOGIC TESTS: Service Layer Constraints
  // ============================================================================

  describe('Business Logic - Service Layer', () => {
    it('should throw NOT_FOUND when getting non-existent store', async () => {
      // Arrange: Valid UUIDv4 storeId but store doesn't exist
      // Using a proper UUIDv4 format (version 4, variant 1)
      const nonExistentStoreId = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
      const ctx = createMockContext({ storeId: nonExistentStoreId });
      const caller = createCaller(ctx);

      // Act & Assert: Should fail at service layer
      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
      await expect(caller.store.getConfig()).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found'),
      });
    });

    it('should throw CONFLICT when creating duplicate store configuration', async () => {
      // Arrange: Create store first
      const ctx = createMockContext({ storeId: validStoreId });
      const caller = createCaller(ctx);

      const config = createStoreConfigWithName('Duplicate Test');

      // Create first time (should succeed)
      await caller.store.createConfig(config);

      // Act & Assert: Try to create again (should fail)
      await expect(caller.store.createConfig(config)).rejects.toThrow(TRPCError);
      await expect(caller.store.createConfig(config)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: expect.stringContaining('already exists'),
      });
    });
  });

  // ============================================================================
  // SECURITY TESTS: Tenant Isolation
  // ============================================================================

  describe('Security - Tenant Isolation', () => {
    it('should use authenticated storeId from context, not from input', async () => {
      // Arrange: Authenticated as store A, but try to update store B
      const authenticatedStoreId = validStoreId;
      const attackerStoreId = validStoreId2;

      const ctx = createMockContext({ storeId: authenticatedStoreId });
      const caller = createCaller(ctx);

      // Create config for authenticated store
      const config = createStoreConfigWithName('Security Test Store');
      await caller.store.createConfig(config);

      // Act: Try to update with different storeId in input
      const maliciousInput = {
        storeId: attackerStoreId, // Trying to modify different store
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          name: 'Hacked Store',
          keywords: [],
          locale: 'en-US',
          currency: 'USD',
          timezone: 'UTC',
        },
      };

      // Assert: Should throw BAD_REQUEST due to storeId mismatch
      await expect(caller.store.updateConfig(maliciousInput)).rejects.toThrow(TRPCError);
      await expect(caller.store.updateConfig(maliciousInput)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });
});

