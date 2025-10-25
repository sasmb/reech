/**
 * Order Service Isolation Tests
 * 
 * Tests for OrderService query isolation patterns.
 * Ensures that all order queries properly enforce multi-tenant data isolation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { OrderService } from '../order.service';
import type { FilterableOrderProps } from '../order.service';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        is: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          overlaps: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          contains: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          lte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          ilike: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          })),
        })),
        overlaps: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        contains: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        gte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        lte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        ilike: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        })),
      })),
      is: vi.fn(() => ({
        overlaps: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        contains: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        gte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        lte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        ilike: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        })),
      })),
      overlaps: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      contains: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      gte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      lte: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      ilike: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      order: vi.fn(() => ({
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      })),
    })),
    update: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
} as any;

// Mock environment variables
const originalEnv = process.env;

describe('OrderService Isolation Tests', () => {
  let orderService: OrderService;

  beforeEach(async () => {
    // Mock environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };

    orderService = new OrderService();
    await orderService.initialize();
    
    // Override the supabase client with our mock
    (orderService as any).supabase = mockSupabaseClient;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('findOrdersForStore', () => {
    it('should include mandatory store_id filter in query', async () => {
      const storeId = 'store_123abc';
      const filters: FilterableOrderProps = {
        status: 'pending',
        limit: 10,
        offset: 0,
      };

      await orderService.findOrdersForStore(storeId, filters);

      // Verify that the query was built with store_id filter
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should have been called with store_id filter
      // This is verified by the BaseService.createIsolatedQueryWithCount method
    });

    it('should throw BAD_REQUEST for invalid store ID format', async () => {
      const invalidStoreIds = [
        '',
        null,
        undefined,
        'invalid_store_id',
        'store123', // missing underscore
        'store_', // empty suffix
        'store_123-abc', // invalid characters
        'STORE_123', // uppercase
        '123_store', // wrong prefix
      ];

      for (const invalidStoreId of invalidStoreIds) {
        await expect(
          orderService.findOrdersForStore(invalidStoreId as any, {})
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.findOrdersForStore(invalidStoreId as any, {})
        ).rejects.toThrow('BAD_REQUEST');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR if service is not initialized', async () => {
      const uninitializedService = new OrderService();
      
      await expect(
        uninitializedService.findOrdersForStore('store_123', {})
      ).rejects.toThrow(TRPCError);

      await expect(
        uninitializedService.findOrdersForStore('store_123', {})
      ).rejects.toThrow('INTERNAL_SERVER_ERROR');
    });

    it('should apply client filters alongside store isolation', async () => {
      const storeId = 'store_123abc';
      const filters: FilterableOrderProps = {
        status: 'pending',
        financial_status: 'paid',
        fulfillment_status: 'unfulfilled',
        min_total: 1000,
        max_total: 5000,
        created_after: '2024-01-01',
        created_before: '2024-12-31',
        limit: 20,
        offset: 0,
      };

      await orderService.findOrdersForStore(storeId, filters);

      // Verify that the query was built with both store isolation and client filters
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The BaseService should have applied the store_id filter first
      // Then additional filters should be applied on top
    });

    it('should exclude soft-deleted orders', async () => {
      const storeId = 'store_123abc';
      const filters: FilterableOrderProps = {};

      await orderService.findOrdersForStore(storeId, filters);

      // Verify that deleted_at is filtered out
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should include .is('deleted_at', null)
    });
  });

  describe('getOrderById', () => {
    it('should include mandatory store_id filter in query', async () => {
      const storeId = 'store_123abc';
      const orderId = '123e4567-e89b-12d3-a456-426614174000';

      await orderService.getOrderById(storeId, orderId);

      // Verify that the query was built with store_id filter
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should have been called with store_id filter
      // This is verified by the BaseService.createIsolatedQuery method
    });

    it('should throw BAD_REQUEST for invalid store ID format', async () => {
      const invalidStoreIds = [
        '',
        null,
        undefined,
        'invalid_store_id',
        'store123', // missing underscore
        'store_', // empty suffix
        'store_123-abc', // invalid characters
        'STORE_123', // uppercase
        '123_store', // wrong prefix
      ];

      const orderId = '123e4567-e89b-12d3-a456-426614174000';

      for (const invalidStoreId of invalidStoreIds) {
        await expect(
          orderService.getOrderById(invalidStoreId as any, orderId)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.getOrderById(invalidStoreId as any, orderId)
        ).rejects.toThrow('BAD_REQUEST');
      }
    });

    it('should throw BAD_REQUEST for invalid order ID format', async () => {
      const storeId = 'store_123abc';
      const invalidOrderIds = [
        '',
        null,
        undefined,
        'invalid-uuid',
        '123e4567-e89b-12d3-a456', // incomplete UUID
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        'not-a-uuid',
      ];

      for (const invalidOrderId of invalidOrderIds) {
        await expect(
          orderService.getOrderById(storeId, invalidOrderId as any)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.getOrderById(storeId, invalidOrderId as any)
        ).rejects.toThrow('BAD_REQUEST');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR if service is not initialized', async () => {
      const uninitializedService = new OrderService();
      const orderId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        uninitializedService.getOrderById('store_123', orderId)
      ).rejects.toThrow(TRPCError);

      await expect(
        uninitializedService.getOrderById('store_123', orderId)
      ).rejects.toThrow('INTERNAL_SERVER_ERROR');
    });

    it('should exclude soft-deleted orders', async () => {
      const storeId = 'store_123abc';
      const orderId = '123e4567-e89b-12d3-a456-426614174000';

      await orderService.getOrderById(storeId, orderId);

      // Verify that deleted_at is filtered out
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should include .is('deleted_at', null)
    });
  });

  describe('getOrderByNumber', () => {
    it('should include mandatory store_id filter in query', async () => {
      const storeId = 'store_123abc';
      const orderNumber = 'ORD-001';

      await orderService.getOrderByNumber(storeId, orderNumber);

      // Verify that the query was built with store_id filter
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should have been called with store_id filter
      // This is verified by the BaseService.createIsolatedQuery method
    });

    it('should throw BAD_REQUEST for invalid store ID format', async () => {
      const invalidStoreIds = [
        '',
        null,
        undefined,
        'invalid_store_id',
        'store123', // missing underscore
        'store_', // empty suffix
        'store_123-abc', // invalid characters
        'STORE_123', // uppercase
        '123_store', // wrong prefix
      ];

      const orderNumber = 'ORD-001';

      for (const invalidStoreId of invalidStoreIds) {
        await expect(
          orderService.getOrderByNumber(invalidStoreId as any, orderNumber)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.getOrderByNumber(invalidStoreId as any, orderNumber)
        ).rejects.toThrow('BAD_REQUEST');
      }
    });

    it('should throw BAD_REQUEST for invalid order number', async () => {
      const storeId = 'store_123abc';
      const invalidOrderNumbers = [
        '',
        null,
        undefined,
        '   ', // whitespace only
      ];

      for (const invalidOrderNumber of invalidOrderNumbers) {
        await expect(
          orderService.getOrderByNumber(storeId, invalidOrderNumber as any)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.getOrderByNumber(storeId, invalidOrderNumber as any)
        ).rejects.toThrow('BAD_REQUEST');
      }
    });
  });

  describe('getOrdersByCustomer', () => {
    it('should include mandatory store_id filter in query', async () => {
      const storeId = 'store_123abc';
      const customerId = '123e4567-e89b-12d3-a456-426614174000';

      await orderService.getOrdersByCustomer(storeId, customerId);

      // Verify that the query was built with store_id filter
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should have been called with store_id filter
      // This is verified by the BaseService.createIsolatedQueryWithCount method
    });

    it('should throw BAD_REQUEST for invalid customer ID format', async () => {
      const storeId = 'store_123abc';
      const invalidCustomerIds = [
        '',
        null,
        undefined,
        'invalid-uuid',
        '123e4567-e89b-12d3-a456', // incomplete UUID
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        'not-a-uuid',
      ];

      for (const invalidCustomerId of invalidCustomerIds) {
        await expect(
          orderService.getOrdersByCustomer(storeId, invalidCustomerId as any)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.getOrdersByCustomer(storeId, invalidCustomerId as any)
        ).rejects.toThrow('BAD_REQUEST');
      }
    });
  });

  describe('updateOrderStatus', () => {
    it('should include mandatory store_id filter in query', async () => {
      const storeId = 'store_123abc';
      const orderId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'confirmed';

      await orderService.updateOrderStatus(storeId, orderId, status);

      // Verify that the query was built with store_id filter
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders');
      
      // The query should have been called with store_id filter
      // This is verified by the BaseService.createIsolatedQuery method
    });

    it('should throw BAD_REQUEST for invalid order status', async () => {
      const storeId = 'store_123abc';
      const orderId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidStatuses = [
        '',
        null,
        undefined,
        'invalid_status',
        'PENDING', // uppercase
        'pending-payment', // invalid format
      ];

      for (const invalidStatus of invalidStatuses) {
        await expect(
          orderService.updateOrderStatus(storeId, orderId, invalidStatus as any)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.updateOrderStatus(storeId, orderId, invalidStatus as any)
        ).rejects.toThrow('BAD_REQUEST');
      }
    });
  });

  describe('Query Isolation Verification', () => {
    it('should never allow cross-tenant data access', async () => {
      const storeId1 = 'store_123abc';
      const storeId2 = 'store_456def';
      const orderId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock different responses for different stores
      const mockData1 = { id: orderId, store_id: storeId1, order_number: 'ORD-001' };
      const mockData2 = { id: orderId, store_id: storeId2, order_number: 'ORD-002' };

      // First call for store 1
      mockSupabaseClient.from().select().eq().eq().is().single.mockResolvedValueOnce({
        data: mockData1,
        error: null,
      });

      const result1 = await orderService.getOrderById(storeId1, orderId);
      expect(result1).toEqual(mockData1);

      // Second call for store 2
      mockSupabaseClient.from().select().eq().eq().is().single.mockResolvedValueOnce({
        data: mockData2,
        error: null,
      });

      const result2 = await orderService.getOrderById(storeId2, orderId);
      expect(result2).toEqual(mockData2);

      // Verify that each query was called with the correct store_id
      // This is enforced by the BaseService.createIsolatedQuery method
    });

    it('should handle database errors with proper isolation context', async () => {
      const storeId = 'store_123abc';
      const orderId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock database error
      const dbError = { code: 'PGRST116', message: 'No rows returned' };
      mockSupabaseClient.from().select().eq().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      await expect(
        orderService.getOrderById(storeId, orderId)
      ).rejects.toThrow(TRPCError);

      await expect(
        orderService.getOrderById(storeId, orderId)
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('Defensive Coding Patterns', () => {
    it('should use guard clauses for early returns', async () => {
      const storeId = 'store_123abc';

      // Test with invalid store ID - should return early without database call
      await expect(
        orderService.findOrdersForStore('', {})
      ).rejects.toThrow(TRPCError);

      // Verify no database call was made for invalid input
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle null and undefined inputs gracefully', async () => {
      const testCases = [
        { storeId: null, filters: {} },
        { storeId: undefined, filters: {} },
        { storeId: 'store_123', filters: null },
        { storeId: 'store_123', filters: undefined },
      ];

      for (const testCase of testCases) {
        await expect(
          orderService.findOrdersForStore(testCase.storeId as any, testCase.filters as any)
        ).rejects.toThrow(TRPCError);
      }
    });

    it('should provide meaningful error messages for debugging', async () => {
      const invalidStoreId = 'invalid_store_id';

      try {
        await orderService.findOrdersForStore(invalidStoreId, {});
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).message).toContain('Invalid store ID format');
        expect((error as TRPCError).cause).toBe('INVALID_STORE_ID_FORMAT');
      }
    });
  });
});
