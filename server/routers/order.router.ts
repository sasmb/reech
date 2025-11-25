/**
 * Order Router
 * 
 * tRPC router for order-related operations.
 * All procedures enforce multi-tenancy through requireStore middleware.
 * 
 * Architecture:
 * - Router → Service Layer → Database
 * - Middleware: requireStore (validates x-store-id header)
 * - Input Validation: Zod schemas for type safety
 * - Output: Type-safe order data
 * 
 * Multi-Tenancy:
 * - Every procedure requires authenticated store context
 * - storeId is derived from x-store-id header
 * - Prevents cross-tenant data access
 * 
 * @module order.router
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { orderService } from '../services/order.service';
import { FilterableOrderPropsSchema } from '@/packages/shared/schemas/order.schema';

// ============================================================================
// ORDER ROUTER DEFINITION
// ============================================================================

/**
 * Order Router
 * 
 * Defines tRPC procedures for order management.
 * All procedures are protected and require store authentication.
 */
export const orderRouter = router({
  /**
   * List Orders (Prompt 2.2)
   * 
   * Lists orders for the authenticated store with optional filtering.
   * 
   * Security Features:
   * - Protected by requireStore middleware
   * - storeId automatically extracted from x-store-id header
   * - Client cannot provide storeId in input (prevents tenant spoofing)
   * - All queries filtered by store_id column
   * 
   * Input Validation:
   * - FilterableOrderPropsSchema validates all filter parameters
   * - Supports status, date range, customer, amount, and search filters
   * - Pagination with limit/offset
   * - Sorting with order_by/sort_order
   * 
   * Usage:
   * ```typescript
   * // Client call
   * const orders = await trpc.order.listOrders.useQuery({
   *   status: 'confirmed',
   *   financial_status: 'paid',
   *   limit: 20,
   *   offset: 0
   * });
   * ```
   * 
   * @param input - Order filters (status, date range, customer, etc.)
   * @returns Order list with pagination metadata
   * 
   * @throws {TRPCError} BAD_REQUEST if x-store-id header is missing/invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   */
  listOrders: protectedProcedure
    .input(FilterableOrderPropsSchema)
    .query(async ({ ctx, input }) => {
      // Extract storeId from authenticated context
      // This is guaranteed to be present and valid by requireStore middleware
      const { storeid } = ctx;

      // Call service layer with storeId and client filters
      // The service layer will combine these into server-side filters
      return await orderService.findOrdersForStore(storeid, input);
    }),

  /**
   * Get Order by ID
   * 
   * Fetches a single order by ID for the authenticated store.
   * 
   * Security Features:
   * - Protected by requireStore middleware
   * - storeId automatically extracted from x-store-id header
   * - Order ID validated as UUID
   * - Queries filtered by both store_id and order ID
   * 
   * @param input - Object containing orderId (UUID)
   * @returns Single order or throws NOT_FOUND error
   * 
   * @throws {TRPCError} BAD_REQUEST if x-store-id header is missing/invalid
   * @throws {TRPCError} BAD_REQUEST if orderId is not a valid UUID
   * @throws {TRPCError} NOT_FOUND if order doesn't exist for this store
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   */
  getById: protectedProcedure
    .input(
      z.object({
        orderId: z
          .string()
          .uuid('Order ID must be a valid UUID')
          .describe('Order ID (UUID)'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Extract storeId from authenticated context
      const { storeid } = ctx;

      // Call service layer with storeId and orderId
      return await orderService.getOrderById(storeid, input.orderId);
    }),

  /**
   * Get Order by Order Number
   * 
   * Fetches a single order by order number for the authenticated store.
   * 
   * Security Features:
   * - Protected by requireStore middleware
   * - storeId automatically extracted from x-store-id header
   * - Order number validated as non-empty string
   * - Queries filtered by both store_id and order_number
   * 
   * @param input - Object containing orderNumber (string)
   * @returns Single order or throws NOT_FOUND error
   * 
   * @throws {TRPCError} BAD_REQUEST if x-store-id header is missing/invalid
   * @throws {TRPCError} BAD_REQUEST if orderNumber is empty
   * @throws {TRPCError} NOT_FOUND if order doesn't exist for this store
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   */
  getByNumber: protectedProcedure
    .input(
      z.object({
        orderNumber: z
          .string()
          .min(1, 'Order number is required')
          .max(50, 'Order number too long')
          .describe('Order number (human-readable identifier)'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Extract storeId from authenticated context
      const { storeid } = ctx;

      // Call service layer with storeId and orderNumber
      return await orderService.getOrderByNumber(storeid, input.orderNumber);
    }),

  /**
   * Get Order Statistics
   * 
   * Fetches order statistics for the authenticated store.
   * 
   * Security Features:
   * - Protected by requireStore middleware
   * - storeId automatically extracted from x-store-id header
   * - All statistics scoped to the authenticated store
   * 
   * @param input - Object containing date range and grouping options
   * @returns Order statistics (count, revenue, etc.)
   * 
   * @throws {TRPCError} BAD_REQUEST if x-store-id header is missing/invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   */
  getStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z
          .string()
          .datetime('Invalid date format. Use ISO 8601 with timezone.')
          .optional()
          .describe('Start date for statistics (ISO 8601)'),
        dateTo: z
          .string()
          .datetime('Invalid date format. Use ISO 8601 with timezone.')
          .optional()
          .describe('End date for statistics (ISO 8601)'),
        groupBy: z
          .enum(['day', 'week', 'month', 'quarter', 'year'])
          .default('month')
          .describe('Group statistics by time period'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Extract storeId from authenticated context
      const { storeid } = ctx;

      // TODO: Implement order statistics service method
      // For now, return a placeholder response
      return {
        storeId: storeid,
        period: input.groupBy,
        dateFrom: input.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: input.dateTo || new Date().toISOString(),
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        topProducts: [],
      };
    }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Order Router Type
 * 
 * TypeScript type for the order router.
 * Used for type inference in tRPC client.
 */
export type OrderRouter = typeof orderRouter;
