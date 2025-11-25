/**
 * Product Router - Protected tRPC Procedures (Prompt 2.1)
 * 
 * This router implements protected product operations with multi-tenancy enforcement.
 * 
 * Architecture:
 * 1. Middleware: requireStore validates storeId from x-store-id header
 * 2. Validation: Zod validates client input (FilterableProductPropsSchema)
 * 3. Service Layer: productService handles business logic and database queries
 * 4. Context: storeId is guaranteed to be valid Medusa Store ID after middleware
 * 
 * Security:
 * - All procedures protected by requireStore middleware
 * - storeId NEVER accepted from client input
 * - storeId ALWAYS derived from authenticated context (ctx.storeId)
 * - Prevents cross-tenant data access
 * 
 * Medusa Store ID Format:
 * - Prefix: "store_"
 * - Followed by: Alphanumeric characters
 * - Example: "store_01HQWE..." (from Medusa createStoresWorkflow)
 * 
 * @module product.router
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { productService } from '../services/product.service';
import { FilterableProductPropsSchema } from '@/packages/shared/schemas/product.schema';

/**
 * Product Router
 * 
 * Provides product operations with:
 * - Tenant isolation (via requireStore middleware)
 * - Input validation (via Zod schemas)
 * - Business logic (via productService)
 * 
 * All procedures require a valid x-store-id header.
 */
export const productRouter = router({
  /**
   * List Products (Prompt 2.1)
   * 
   * Protected Procedure: ✅ requireStore middleware
   * - Validates x-store-id header is present
   * - Validates storeId is valid Medusa Store ID format (store_XXXXX)
   * - Extracts authenticated storeId from context
   * 
   * Flow:
   * 1. Client sends request with x-store-id header
   * 2. requireStore middleware validates storeId
   * 3. FilterableProductPropsSchema validates input filters
   * 4. storeId extracted from context (guaranteed valid)
   * 5. productService.findProductsForStore called with storeId + filters
   * 6. Database query filters by store_id column
   * 7. Results returned to client
   * 
   * Input Validation:
   * - Client provides: category_id, min_price, status, q, limit, offset, etc.
   * - Server injects: store_id from ctx.storeId (NEVER from client)
   * 
   * Example Request:
   * ```typescript
   * // Client code
   * const { products, count } = await trpc.product.listProducts.query({
   *   category_id: 'cat_123',
   *   min_price: 1000,
   *   status: 'published',
   *   limit: 20,
   *   offset: 0
   * });
   * ```
   * 
   * Example cURL:
   * ```bash
   * curl -X GET "http://localhost:3000/api/trpc/product.listProducts" \
   *   -H "x-store-id: store_01HQWE123" \
   *   -H "Content-Type: application/json" \
   *   -d '{"category_id":"cat_123","limit":20}'
   * ```
   * 
   * Security:
   * - ✅ Multi-tenant isolation enforced by requireStore middleware
   * - ✅ storeId derived from authenticated context (never from client)
   * - ✅ Database queries automatically filter by store_id
   * - ✅ Cross-tenant access prevented at database level
   * 
   * @returns Product list with pagination metadata
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is missing or invalid (from middleware)
   * @throws {TRPCError} BAD_REQUEST if input validation fails (from Zod)
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   * 
   * @example
   * ```typescript
   * // Simple query: Get first 15 published products
   * const { products } = await trpc.product.listProducts.query({
   *   status: 'published',
   *   limit: 15
   * });
   * 
   * // Advanced query: Search with filters
   * const { products, count, hasMore } = await trpc.product.listProducts.query({
   *   q: 'laptop',
   *   category_id: 'cat_electronics_123',
   *   min_price: 50000, // $500.00 in cents
   *   max_price: 200000, // $2000.00 in cents
   *   in_stock: true,
   *   status: 'published',
   *   order_by: 'price',
   *   sort_order: 'asc',
   *   limit: 20,
   *   offset: 0
   * });
   * 
   * // Pagination
   * const page2 = await trpc.product.listProducts.query({
   *   status: 'published',
   *   limit: 20,
   *   offset: 20 // Skip first 20 products
   * });
   * ```
   */
  listProducts: protectedProcedure
    .input(FilterableProductPropsSchema)
    .query(async ({ ctx, input }) => {
      // ======================================================================
      // CONTEXT EXTRACTION (Prompt 2.1 - Requirement 4)
      // ======================================================================
      // After requireStore middleware, ctx.storeid is guaranteed to be:
      // - Present (not undefined)
      // - Valid string
      // - Medusa Store ID format (store_XXXXX)
      
      const { storeid } = ctx;

      // ======================================================================
      // SERVICE LAYER CALL (Prompt 2.1 - Requirement 4)
      // ======================================================================
      // Pass validated storeid and client filters to service layer
      // Service layer will:
      // 1. Combine storeid with client filters
      // 2. Query database with store_id filter
      // 3. Apply all client-provided filters
      // 4. Return filtered, paginated results
      
      return await productService.findProductsForStore(storeid, input);
    }),

  /**
   * Get Product by ID
   * 
   * Fetches a single product by ID for the authenticated store.
   * 
   * Protected Procedure: ✅ requireStore middleware
   * 
   * @param productId - UUID of the product to fetch
   * @returns Single product or throws NOT_FOUND
   * 
   * @example
   * ```typescript
   * const product = await trpc.product.getById.query({
   *   productId: '123e4567-e89b-12d3-a456-426614174000'
   * });
   * ```
   */
  getById: protectedProcedure
    .input(
      z.object({
        productId: z
          .string()
          .uuid('Product ID must be a valid UUID')
          .describe('Product ID (UUID)'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeid } = ctx;
      
      return await productService.getProductById(storeid, input.productId);
    }),
});

/**
 * Type Export
 * 
 * Export the router type for client-side type safety.
 * DO NOT export the router instance itself.
 */
export type ProductRouter = typeof productRouter;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: List Published Products (Storefront)
 * 
 * Query products visible on the storefront.
 * 
 * ```typescript
 * const { products, count } = await trpc.product.listProducts.query({
 *   status: 'published',
 *   limit: 12,
 *   offset: 0
 * });
 * ```
 */

/**
 * Example 2: Search Products with Price Filter
 * 
 * Search for products by name/description within a price range.
 * 
 * ```typescript
 * const { products } = await trpc.product.listProducts.query({
 *   q: 'wireless headphones',
 *   min_price: 2000, // $20.00
 *   max_price: 10000, // $100.00
 *   status: 'published',
 *   limit: 20
 * });
 * ```
 */

/**
 * Example 3: Filter by Category and Sort
 * 
 * Get products in a specific category, sorted by price.
 * 
 * ```typescript
 * const { products } = await trpc.product.listProducts.query({
 *   category_id: 'cat_electronics_123',
 *   status: 'published',
 *   order_by: 'price',
 *   sort_order: 'asc',
 *   limit: 20
 * });
 * ```
 */

/**
 * Example 4: Admin View - All Products with Status Filter
 * 
 * Admin dashboard showing all products by status.
 * 
 * ```typescript
 * const { products, count } = await trpc.product.listProducts.query({
 *   status: 'draft',
 *   order_by: 'updated_at',
 *   sort_order: 'desc',
 *   limit: 50,
 *   offset: 0
 * });
 * ```
 */

/**
 * Example 5: In-Stock Products Only
 * 
 * Filter to show only products currently in stock.
 * 
 * ```typescript
 * const { products } = await trpc.product.listProducts.query({
 *   in_stock: true,
 *   status: 'published',
 *   limit: 20
 * });
 * ```
 */

/**
 * Example 6: Pagination
 * 
 * Implement pagination for large product lists.
 * 
 * ```typescript
 * // Page 1
 * const page1 = await trpc.product.listProducts.query({
 *   status: 'published',
 *   limit: 20,
 *   offset: 0
 * });
 * 
 * // Page 2
 * const page2 = await trpc.product.listProducts.query({
 *   status: 'published',
 *   limit: 20,
 *   offset: 20
 * });
 * 
 * // Check if more pages available
 * if (page2.hasMore) {
 *   // Load next page...
 * }
 * ```
 */

