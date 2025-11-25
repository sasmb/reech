/**
 * Product Schema Definitions
 * 
 * Zod schemas for product-related operations with robust runtime validation.
 * 
 * Security Design:
 * - storeId is NEVER included in client-facing schemas
 * - storeId is exclusively derived from authenticated API context (ctx.storeId)
 * - This prevents tenant spoofing and ensures proper multi-tenancy isolation
 * 
 * Architecture:
 * - Client provides filters (category, price, search, etc.)
 * - Server injects storeId from authenticated context
 * - Combined filters ensure users only see products from their store
 * 
 * @module product.schema
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATION PRIMITIVES
// ============================================================================

/**
 * Pagination Limit Schema
 * 
 * Controls the number of items returned per page.
 * Default: 15 (Medusa default)
 * Max: 100 (prevents excessive load)
 */
export const PaginationLimitSchema = z
  .number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit cannot exceed 100 items per page')
  .default(15)
  .describe('Number of items to return per page');

/**
 * Pagination Offset Schema
 * 
 * Controls the starting point for pagination.
 * Default: 0 (start from beginning)
 */
export const PaginationOffsetSchema = z
  .number()
  .int('Offset must be an integer')
  .min(0, 'Offset cannot be negative')
  .default(0)
  .describe('Number of items to skip before starting to return results');

/**
 * Product Search Query Schema
 * 
 * Validates search terms for product queries.
 * Min length: 2 (prevent single character searches)
 * Max length: 100 (reasonable search term limit)
 */
export const ProductSearchQuerySchema = z
  .string()
  .min(2, 'Search query must be at least 2 characters')
  .max(100, 'Search query cannot exceed 100 characters')
  .trim()
  .describe('Search term for product name, description, or SKU');

/**
 * Price Range Schema
 * 
 * Validates monetary values for price filtering.
 * Must be non-negative and use reasonable precision.
 */
export const PriceSchema = z
  .number()
  .nonnegative('Price cannot be negative')
  .finite('Price must be a valid number')
  .describe('Price value in the smallest currency unit (e.g., cents for USD)');

/**
 * Product Status Schema
 * 
 * Validates product status values.
 * Aligns with Medusa product status conventions.
 */
export const ProductStatusSchema = z
  .enum(['draft', 'published', 'proposed', 'rejected'], {
    errorMap: () => ({ message: 'Status must be one of: draft, published, proposed, rejected' }),
  })
  .describe('Product publication status');

/**
 * Sort Order Schema
 * 
 * Validates sort direction for ordering results.
 */
export const SortOrderSchema = z
  .enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' }),
  })
  .default('asc')
  .describe('Sort direction for ordering results');

/**
 * Product Sort Field Schema
 * 
 * Validates which field to sort by.
 */
export const ProductSortFieldSchema = z
  .enum(['created_at', 'updated_at', 'title', 'price'], {
    errorMap: () => ({ message: 'Sort field must be one of: created_at, updated_at, title, price' }),
  })
  .default('created_at')
  .describe('Field to sort products by');

// ============================================================================
// FILTERABLE PRODUCT PROPS SCHEMA (Prompt 1.2)
// ============================================================================

/**
 * Filterable Product Props Schema
 * 
 * Defines the client-facing schema for filtering product lists.
 * 
 * CRITICAL SECURITY REQUIREMENT:
 * - storeId is EXCLUDED from this schema
 * - storeId MUST be derived from authenticated API context (ctx.storeId)
 * - This prevents tenant spoofing and ensures multi-tenancy isolation
 * 
 * Usage Pattern:
 * ```typescript
 * // Client sends these filters
 * const clientFilters = {
 *   category_id: 'cat_123',
 *   min_price: 1000,
 *   limit: 20
 * };
 * 
 * // Server augments with storeId from context
 * const serverFilters = {
 *   ...clientFilters,
 *   store_id: ctx.storeId  // ← Injected server-side
 * };
 * 
 * // Query products with combined filters
 * const products = await productService.listProducts(serverFilters);
 * ```
 * 
 * Filter Categories:
 * 1. Categorical Filters: category_id, collection_id, type_id, tags
 * 2. Price Filters: min_price, max_price
 * 3. Status Filters: status, is_giftcard
 * 4. Search Filters: q (search query)
 * 5. Pagination: limit, offset
 * 6. Sorting: order_by, sort_order
 * 7. Date Filters: created_after, updated_after
 * 
 * @see Medusa Product Module: https://docs.medusajs.com/modules/products
 */
export const FilterableProductPropsSchema = z
  .object({
    // ========================================================================
    // CATEGORICAL FILTERS
    // ========================================================================

    /**
     * Category ID Filter
     * 
     * Filter products by category (e.g., "Clothing", "Electronics").
     * Supports single category filtering.
     */
    category_id: z
      .string()
      .min(1, 'Category ID cannot be empty')
      .optional()
      .describe('Filter by product category ID'),

    /**
     * Category IDs Filter
     * 
     * Filter products by multiple categories.
     * Useful for "show products in any of these categories" queries.
     */
    category_ids: z
      .array(z.string().min(1))
      .min(1, 'At least one category ID is required')
      .optional()
      .describe('Filter by multiple product category IDs'),

    /**
     * Collection ID Filter
     * 
     * Filter products by collection (e.g., "Summer Sale", "New Arrivals").
     */
    collection_id: z
      .string()
      .min(1, 'Collection ID cannot be empty')
      .optional()
      .describe('Filter by product collection ID'),

    /**
     * Product Type ID Filter
     * 
     * Filter products by type (e.g., "Physical", "Digital").
     */
    type_id: z
      .string()
      .min(1, 'Type ID cannot be empty')
      .optional()
      .describe('Filter by product type ID'),

    /**
     * Tags Filter
     * 
     * Filter products by tags (e.g., ["bestseller", "featured"]).
     */
    tags: z
      .array(z.string().min(1))
      .min(1, 'At least one tag is required')
      .optional()
      .describe('Filter by product tags'),

    // ========================================================================
    // PRICE FILTERS
    // ========================================================================

    /**
     * Minimum Price Filter
     * 
     * Show products with price >= min_price.
     * Price is in smallest currency unit (cents for USD).
     */
    min_price: PriceSchema.optional().describe('Minimum product price filter'),

    /**
     * Maximum Price Filter
     * 
     * Show products with price <= max_price.
     * Price is in smallest currency unit (cents for USD).
     */
    max_price: PriceSchema.optional().describe('Maximum product price filter'),

    // ========================================================================
    // STATUS FILTERS
    // ========================================================================

    /**
     * Product Status Filter
     * 
     * Filter by publication status (draft, published, proposed, rejected).
     */
    status: ProductStatusSchema.optional().describe('Filter by product status'),

    /**
     * Gift Card Filter
     * 
     * Filter to show only gift cards or exclude them.
     */
    is_giftcard: z
      .boolean()
      .optional()
      .describe('Filter for gift card products'),

    // ========================================================================
    // SEARCH FILTERS
    // ========================================================================

    /**
     * Search Query Filter
     * 
     * Full-text search across product name, description, SKU.
     */
    q: ProductSearchQuerySchema.optional().describe('Search query for product search'),

    // ========================================================================
    // PAGINATION
    // ========================================================================

    /**
     * Pagination Limit
     * 
     * Number of products to return per page.
     * Default: 15, Max: 100
     */
    limit: PaginationLimitSchema,

    /**
     * Pagination Offset
     * 
     * Number of products to skip before returning results.
     * Default: 0
     */
    offset: PaginationOffsetSchema,

    // ========================================================================
    // SORTING
    // ========================================================================

    /**
     * Sort Field
     * 
     * Field to sort products by (created_at, updated_at, title, price).
     */
    order_by: ProductSortFieldSchema,

    /**
     * Sort Direction
     * 
     * Direction to sort (asc, desc).
     */
    sort_order: SortOrderSchema,

    // ========================================================================
    // DATE FILTERS
    // ========================================================================

    /**
     * Created After Filter
     * 
     * Show products created after this date (ISO 8601).
     */
    created_after: z
      .string()
      .datetime({ offset: true, message: 'Invalid date format. Use ISO 8601 with timezone.' })
      .optional()
      .describe('Filter products created after this date'),

    /**
     * Updated After Filter
     * 
     * Show products updated after this date (ISO 8601).
     */
    updated_after: z
      .string()
      .datetime({ offset: true, message: 'Invalid date format. Use ISO 8601 with timezone.' })
      .optional()
      .describe('Filter products updated after this date'),

    // ========================================================================
    // INVENTORY FILTERS
    // ========================================================================

    /**
     * In Stock Filter
     * 
     * Show only products that are in stock.
     */
    in_stock: z
      .boolean()
      .optional()
      .describe('Filter for products in stock'),

    /**
     * Variant IDs Filter
     * 
     * Filter products by specific variant IDs.
     */
    variant_ids: z
      .array(z.string().min(1))
      .min(1, 'At least one variant ID is required')
      .optional()
      .describe('Filter by product variant IDs'),
  })
  .strict()
  .refine(
    (data) => {
      // Validation: If both min_price and max_price are provided, min must be <= max
      if (data.min_price !== undefined && data.max_price !== undefined) {
        return data.min_price <= data.max_price;
      }
      return true;
    },
    {
      message: 'Minimum price cannot be greater than maximum price',
      path: ['min_price'],
    }
  )
  .refine(
    (data) => {
      // Validation: Cannot use both category_id and category_ids
      if (data.category_id && data.category_ids) {
        return false;
      }
      return true;
    },
    {
      message: 'Cannot use both category_id and category_ids. Choose one.',
      path: ['category_id'],
    }
  );

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Filterable Product Props Type
 * 
 * TypeScript type inferred from FilterableProductPropsSchema.
 * Use this type for type-safe product filtering in your application.
 */
export type FilterableProductProps = z.infer<typeof FilterableProductPropsSchema>;

/**
 * Server-Side Product Filter Props
 * 
 * Extended type that includes storeId (injected server-side).
 * This type is used internally by the server to query products.
 * 
 * SECURITY NOTE:
 * - storeId is NEVER accepted from client
 * - storeId is ALWAYS derived from authenticated context (ctx.storeId)
 */
export type ServerSideProductFilterProps = FilterableProductProps & {
  /**
   * Store ID
   * 
   * CRITICAL: This field is NEVER accepted from client input.
   * It is exclusively derived from the authenticated API context.
   * 
   * Purpose:
   * - Ensures multi-tenancy isolation
   * - Prevents cross-tenant data access
   * - Guarantees users only see products from their store
   */
  store_id: string;
};

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate Product Filters
 * 
 * Validates client-provided product filters against the schema.
 * Returns validation result with parsed data or errors.
 * 
 * @param input - Raw input from client
 * @returns Validation result with parsed data or errors
 * 
 * @example
 * ```typescript
 * const result = validateProductFilters({
 *   category_id: 'cat_123',
 *   min_price: 1000,
 *   limit: 20
 * });
 * 
 * if (result.success) {
 *   console.log('Valid filters:', result.data);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateProductFilters(input: unknown): {
  success: boolean;
  data?: FilterableProductProps;
  errors?: z.ZodError;
} {
  const result = FilterableProductPropsSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Create Server-Side Product Filters
 * 
 * Helper function to combine client filters with server-injected storeId.
 * This is the recommended pattern for building product queries.
 * 
 * @param clientFilters - Validated filters from client
 * @param storeId - Store ID from authenticated context (ctx.storeId)
 * @returns Combined filters for server-side product query
 * 
 * @example
 * ```typescript
 * // In tRPC procedure
 * export const listProducts = protectedProcedure
 *   .input(FilterableProductPropsSchema)
 *   .query(async ({ input, ctx }) => {
 *     // Combine client filters with server context
 *     const serverFilters = createServerSideProductFilters(
 *       input,
 *       ctx.storeId  // ← Injected from authenticated context
 *     );
 * 
 *     // Query products with combined filters
 *     const products = await productService.listProducts(serverFilters);
 *     return products;
 *   });
 * ```
 */
export function createServerSideProductFilters(
  clientFilters: FilterableProductProps,
  storeId: string
): ServerSideProductFilterProps {
  // Guard clause: Validate storeId
  if (!storeId || typeof storeId !== 'string' || storeId.trim().length === 0) {
    throw new Error(
      'Invalid storeId provided. Store ID must be a non-empty string derived from authenticated context.'
    );
  }

  // Combine client filters with server-injected storeId
  return {
    ...clientFilters,
    store_id: storeId,
  };
}

/**
 * Create Default Product Filters
 * 
 * Helper to create default product filters with sensible defaults.
 * Useful for initial page loads or when no filters are provided.
 * 
 * @param overrides - Optional overrides for default values
 * @returns Default product filters
 * 
 * @example
 * ```typescript
 * const defaultFilters = createDefaultProductFilters({
 *   limit: 20,
 *   status: 'published'
 * });
 * ```
 */
export function createDefaultProductFilters(
  overrides?: Partial<FilterableProductProps>
): FilterableProductProps {
  const defaults: FilterableProductProps = {
    limit: 15,
    offset: 0,
    order_by: 'created_at',
    sort_order: 'desc',
    ...overrides,
  };

  return FilterableProductPropsSchema.parse(defaults);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type Guard: Is Valid Product Filter
 * 
 * Checks if an object is a valid FilterableProductProps.
 * 
 * @param value - Value to check
 * @returns True if value is valid product filter
 */
export function isValidProductFilter(value: unknown): value is FilterableProductProps {
  return FilterableProductPropsSchema.safeParse(value).success;
}

/**
 * Type Guard: Has Store ID
 * 
 * Checks if filters include storeId (server-side filters).
 * 
 * @param value - Value to check
 * @returns True if value includes storeId
 */
export function hasStoreId(
  value: FilterableProductProps | ServerSideProductFilterProps
): value is ServerSideProductFilterProps {
  return 'store_id' in value && typeof value.store_id === 'string';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FilterableProductPropsSchema;

