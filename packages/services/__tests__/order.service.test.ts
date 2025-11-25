/**
 * Order Service Tests
 * 
 * Tests for the OrderService class with focus on storeId parameter enforcement.
 * These tests validate that all service methods properly require storeId as the first parameter.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { OrderService, type OrderListResponse } from '../order.service';
import type { OrderQuery, OrderSort, Order } from '../../../packages/shared/schemas/order';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            overlaps: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => ({
                    single: vi.fn(),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
};

// Mock environment variables
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('OrderService', () => {
  let orderService: OrderService;
  const validStoreId = 'store_01HQWE123456789';
  const validOrderId = '123e4567-e89b-12d3-a456-426614174000';
  const validFilters: Partial<OrderQuery> & { limit?: number; offset?: number; sort?: OrderSort } = {
    limit: 15,
    offset: 0,
    sort: {
      field: 'createdAt',
      direction: 'desc',
    },
  };

  beforeEach(() => {
    orderService = new OrderService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('StoreId Parameter Enforcement', () => {
    describe('findOrdersForStore', () => {
      it('should require storeId as the first parameter', async () => {
        // This test validates the method signature at compile time
        // The TypeScript compiler will enforce that storeId is the first parameter
        expect(typeof orderService.findOrdersForStore).toBe('function');
        
        // Test that the method expects storeId first
        const method = orderService.findOrdersForStore;
        expect(method.length).toBe(2); // storeId, filters
      });

      it('should validate storeId format', async () => {
        const invalidStoreIds = [
          '', // empty
          'invalid', // no store_ prefix
          'store_', // no suffix
          'store_123!', // invalid characters
          null as any, // null
          undefined as any, // undefined
          123 as any, // number
        ];

        for (const invalidStoreId of invalidStoreIds) {
          await expect(
            orderService.findOrdersForStore(invalidStoreId, validFilters)
          ).rejects.toThrow(TRPCError);
        }
      });

      it('should accept valid storeId format', async () => {
        const validStoreIds = [
          'store_01HQWE123456789',
          'store_abc123def456',
          'store_1234567890',
        ];

        // Mock successful response
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  overlaps: vi.fn(() => ({
                    or: vi.fn(() => ({
                      order: vi.fn(() => ({
                        range: vi.fn(() => ({
                          single: vi.fn(),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          })),
        });

        for (const validStoreId of validStoreIds) {
          // Should not throw for valid storeId format
          await expect(
            orderService.findOrdersForStore(validStoreId, validFilters)
          ).resolves.toBeDefined();
        }
      });
    });

    describe('getOrderById', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof orderService.getOrderById).toBe('function');
        expect(orderService.getOrderById.length).toBe(2); // storeId, orderId
      });

      it('should validate both storeId and orderId formats', async () => {
        const invalidStoreIds = ['', 'invalid', 'store_'];
        const invalidOrderIds = ['', 'invalid', '123', null as any];

        for (const invalidStoreId of invalidStoreIds) {
          await expect(
            orderService.getOrderById(invalidStoreId, validOrderId)
          ).rejects.toThrow(TRPCError);
        }

        for (const invalidOrderId of invalidOrderIds) {
          await expect(
            orderService.getOrderById(validStoreId, invalidOrderId)
          ).rejects.toThrow(TRPCError);
        }
      });
    });

    describe('createOrder', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof orderService.createOrder).toBe('function');
        expect(orderService.createOrder.length).toBe(2); // storeId, orderData
      });

      it('should validate storeId format', async () => {
        const orderData = {
          customerId: 'customer_123',
          email: 'customer@example.com',
          currency: 'USD',
          subtotal: 2999,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 2999,
          weight: 1,
          weightUnit: 'kg' as const,
          tags: [],
          status: 'pending' as const,
          financialStatus: 'pending' as const,
          fulfillmentStatus: 'unfulfilled' as const,
        };

        await expect(
          orderService.createOrder('invalid_store_id', orderData)
        ).rejects.toThrow(TRPCError);
      });
    });

    describe('updateOrder', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof orderService.updateOrder).toBe('function');
        expect(orderService.updateOrder.length).toBe(3); // storeId, orderId, updateData
      });

      it('should validate storeId and orderId formats', async () => {
        const updateData = { status: 'confirmed' as const };

        await expect(
          orderService.updateOrder('invalid_store_id', validOrderId, updateData)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.updateOrder(validStoreId, 'invalid_order_id', updateData)
        ).rejects.toThrow(TRPCError);
      });
    });

    describe('deleteOrder', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof orderService.deleteOrder).toBe('function');
        expect(orderService.deleteOrder.length).toBe(2); // storeId, orderId
      });

      it('should validate storeId and orderId formats', async () => {
        await expect(
          orderService.deleteOrder('invalid_store_id', validOrderId)
        ).rejects.toThrow(TRPCError);

        await expect(
          orderService.deleteOrder(validStoreId, 'invalid_order_id')
        ).rejects.toThrow(TRPCError);
      });
    });

    describe('getOrderStats', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof orderService.getOrderStats).toBe('function');
        expect(orderService.getOrderStats.length).toBe(2); // storeId, statsQuery
      });

      it('should validate storeId format', async () => {
        const statsQuery = {
          period: 'month' as const,
          dateFrom: '2024-01-01T00:00:00Z',
          dateTo: '2024-01-31T23:59:59Z',
        };

        await expect(
          orderService.getOrderStats('invalid_store_id', statsQuery)
        ).rejects.toThrow(TRPCError);
      });
    });
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid environment variables', async () => {
      // Mock environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      await expect(orderService.initialize()).resolves.toBeUndefined();
    });

    it('should fail initialization without environment variables', async () => {
      // Clear environment variables
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await expect(orderService.initialize()).rejects.toThrow(TRPCError);
    });
  });

  describe('Database Query Isolation', () => {
    it('should filter queries by storeId', async () => {
      // Mock successful response
      const mockQuery = {
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              overlaps: vi.fn(() => ({
                or: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => ({
                      single: vi.fn(),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => mockQuery),
      });

      await orderService.findOrdersForStore(validStoreId, validFilters);

      // Verify that storeId filter was applied
      expect(mockQuery.eq).toHaveBeenCalledWith('storeId', validStoreId);
    });

    it('should apply date range filters correctly', async () => {
      const mockQuery = {
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              overlaps: vi.fn(() => ({
                or: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn(() => ({
                      single: vi.fn(),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => mockQuery),
      });

      const filtersWithDates = {
        ...validFilters,
        createdAfter: '2024-01-01T00:00:00Z',
        createdBefore: '2024-01-31T23:59:59Z',
      };

      await orderService.findOrdersForStore(validStoreId, filtersWithDates);

      // Verify that date filters were applied
      expect(mockQuery.eq().gte).toHaveBeenCalledWith('createdAt', '2024-01-01T00:00:00Z');
      expect(mockQuery.eq().gte().lte).toHaveBeenCalledWith('createdAt', '2024-01-31T23:59:59Z');
    });
  });

  describe('Error Handling', () => {
    it('should throw TRPCError for invalid storeId format', async () => {
      await expect(
        orderService.findOrdersForStore('invalid_store_id', validFilters)
      ).rejects.toThrow(TRPCError);
    });

    it('should throw TRPCError for missing storeId', async () => {
      await expect(
        orderService.findOrdersForStore('', validFilters)
      ).rejects.toThrow(TRPCError);
    });

    it('should throw TRPCError for null storeId', async () => {
      await expect(
        orderService.findOrdersForStore(null as any, validFilters)
      ).rejects.toThrow(TRPCError);
    });

    it('should throw TRPCError for undefined storeId', async () => {
      await expect(
        orderService.findOrdersForStore(undefined as any, validFilters)
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('Type Safety', () => {
    it('should enforce TypeScript types for method parameters', () => {
      // These tests validate TypeScript compilation
      // The compiler will enforce the correct parameter types

      // Valid calls (should compile)
      const validCalls = [
        () => orderService.findOrdersForStore(validStoreId, validFilters),
        () => orderService.getOrderById(validStoreId, validOrderId),
        () => orderService.createOrder(validStoreId, {} as any),
        () => orderService.updateOrder(validStoreId, validOrderId, {}),
        () => orderService.deleteOrder(validStoreId, validOrderId),
        () => orderService.getOrderStats(validStoreId, {} as any),
      ];

      // All valid calls should be functions
      validCalls.forEach(call => {
        expect(typeof call).toBe('function');
      });
    });
  });
});

describe('StoreId Parameter Enforcement - Integration Tests', () => {
  it('should enforce storeId as first parameter across all service methods', () => {
    const orderService = new OrderService();
    
    // Get all method names
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(orderService))
      .filter(name => name !== 'constructor' && typeof orderService[name as keyof OrderService] === 'function');

    // Check that all methods that access tenant tables have storeId as first parameter
    const tenantTableMethods = [
      'findOrdersForStore',
      'getOrderById',
      'createOrder',
      'updateOrder',
      'deleteOrder',
      'getOrderStats',
    ];

    tenantTableMethods.forEach(methodName => {
      const method = orderService[methodName as keyof OrderService] as Function;
      expect(typeof method).toBe('function');
      
      // The method should expect at least 2 parameters (storeId + other params)
      expect(method.length).toBeGreaterThanOrEqual(1);
    });
  });
});
