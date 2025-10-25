/**
 * Main tRPC App Router
 * 
 * This file defines the main router that combines all feature-specific routers.
 * All procedures inherit type safety from the context and middleware.
 */

import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { storeRouter } from './store.router';
import { productRouter } from './product.router';
import { orderRouter } from './order.router';

/**
 * Main application router
 * 
 * Combines all feature routers:
 * - health: Public health check
 * - store: Store configuration operations (complete implementation with service layer)
 * - product: Product catalog operations (Prompt 2.1 - IMPLEMENTED)
 * - order: Order management operations (Prompt 2.2 - IMPLEMENTED)
 * - echo: Test procedure for validation
 * 
 * Future routers:
 * - user: User management operations
 */
export const appRouter = router({
  /**
   * Health Check
   * 
   * Public procedure - no authentication or storeId required
   * Use for: Monitoring, uptime checks, API status
   */
  health: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date(),
      version: '1.0.0',
    };
  }),

  /**
   * Store Configuration Router
   * 
   * Complete implementation with:
   * - Service layer for business logic
   * - Zod validation for input/output
   * - requireStore middleware for tenant isolation
   * - CRUD operations (Create, Read, Update, Delete)
   * 
   * All routes require valid storeId via x-store-id header
   */
  store: storeRouter,

  /**
   * Product Catalog Router (Prompt 2.1)
   * 
   * Implements protected product operations with:
   * - Service layer for database queries
   * - Zod validation (FilterableProductPropsSchema)
   * - requireStore middleware for multi-tenancy enforcement
   * - List products with filtering, pagination, and sorting
   * - Get product by ID
   * 
   * All routes require valid storeId via x-store-id header.
   * storeId is NEVER accepted from client; always derived from authenticated context.
   * 
   * Security:
   * - Multi-tenant isolation enforced at database level
   * - All queries filter by store_id column
   * - Cross-tenant access prevented
   */
  product: productRouter,

  /**
   * Order Management Router (Prompt 2.2)
   * 
   * Implements protected order operations with:
   * - Service layer for database queries
   * - Zod validation (FilterableOrderPropsSchema)
   * - requireStore middleware for multi-tenancy enforcement
   * - List orders with filtering, pagination, and sorting
   * - Get order by ID or order number
   * - Order statistics and analytics
   * 
   * All routes require valid storeId via x-store-id header.
   * storeId is NEVER accepted from client; always derived from authenticated context.
   * 
   * Security:
   * - Multi-tenant isolation enforced at database level
   * - All queries filter by store_id column
   * - Cross-tenant access prevented
   * 
   * Filtering Support:
   * - Status filters (status, financial_status, fulfillment_status)
   * - Customer filters (email, customer_id)
   * - Date filters (created_after, updated_after, paid_after)
   * - Amount filters (min_total, max_total)
   * - Search filters (order number, customer name, email)
   * - Tracking filters (tracking_number)
   * - Payment filters (payment_method, currency)
   */
  order: orderRouter,

  /**
   * Example: Echo procedure for testing
   * 
   * Demonstrates input validation and type safety
   */
  echo: publicProcedure
    .input(
      z.object({
        message: z.string().min(1),
      })
    )
    .query(({ input }) => {
      return {
        message: input.message,
        timestamp: new Date(),
      };
    }),
});

/**
 * Export type definition (NOT the router itself)
 * 
 * This type is imported by the client for end-to-end type safety
 */
export type AppRouter = typeof appRouter;


