/**
 * Order Schema Definitions
 * 
 * Zod schemas for order-related operations with robust runtime validation.
 * 
 * Security Design:
 * - storeId is NEVER included in client-facing schemas
 * - storeId is exclusively derived from authenticated API context (ctx.storeId)
 * - This prevents tenant spoofing and ensures proper multi-tenancy isolation
 * 
 * Architecture:
 * - Client provides filters (status, date range, customer, etc.)
 * - Server injects storeId from authenticated context
 * - Combined filters ensure users only see orders from their store
 * 
 * @module order.schema
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
 * Order Search Query Schema
 * 
 * Validates search terms for order queries.
 * Min length: 2 (prevent single character searches)
 * Max length: 100 (reasonable search term limit)
 */
export const OrderSearchQuerySchema = z
  .string()
  .min(2, 'Search query must be at least 2 characters')
  .max(100, 'Search query cannot exceed 100 characters')
  .trim()
  .describe('Search term for order number, customer name, or email');

/**
 * Order Amount Schema
 * 
 * Validates monetary values for order filtering.
 * Must be non-negative and use reasonable precision.
 */
export const OrderAmountSchema = z
  .number()
  .nonnegative('Amount cannot be negative')
  .finite('Amount must be a valid number')
  .describe('Amount value in the smallest currency unit (e.g., cents for USD)');

/**
 * Order Status Schema
 * 
 * Validates order status values.
 * Aligns with the order_status_type enum from database migration.
 */
export const OrderStatusSchema = z
  .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], {
    errorMap: () => ({ message: 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled, refunded' }),
  })
  .describe('Order lifecycle status');

/**
 * Financial Status Schema
 * 
 * Validates financial status values.
 * Aligns with the financial_status_type enum from database migration.
 */
export const FinancialStatusSchema = z
  .enum(['pending', 'paid', 'partially_paid', 'refunded', 'partially_refunded', 'voided'], {
    errorMap: () => ({ message: 'Financial status must be one of: pending, paid, partially_paid, refunded, partially_refunded, voided' }),
  })
  .describe('Order financial status');

/**
 * Fulfillment Status Schema
 * 
 * Validates fulfillment status values.
 * Aligns with the fulfillment_status_type enum from database migration.
 */
export const FulfillmentStatusSchema = z
  .enum(['unfulfilled', 'partial', 'fulfilled', 'restocked'], {
    errorMap: () => ({ message: 'Fulfillment status must be one of: unfulfilled, partial, fulfilled, restocked' }),
  })
  .describe('Order fulfillment status');

/**
 * Sort Order Schema
 * 
 * Validates sort direction for ordering results.
 */
export const SortOrderSchema = z
  .enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' }),
  })
  .default('desc')
  .describe('Sort direction for ordering results');

/**
 * Order Sort Field Schema
 * 
 * Validates which field to sort by.
 */
export const OrderSortFieldSchema = z
  .enum(['created_at', 'updated_at', 'order_number', 'total_amount', 'status'], {
    errorMap: () => ({ message: 'Sort field must be one of: created_at, updated_at, order_number, total_amount, status' }),
  })
  .default('created_at')
  .describe('Field to sort orders by');

// ============================================================================
// FILTERABLE ORDER PROPS SCHEMA (Prompt 2.2)
// ============================================================================

/**
 * Filterable Order Props Schema
 * 
 * Defines the client-facing schema for filtering order lists.
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
 *   status: 'confirmed',
 *   financial_status: 'paid',
 *   limit: 20
 * };
 * 
 * // Server augments with storeId from context
 * const serverFilters = {
 *   ...clientFilters,
 *   store_id: ctx.storeId  // ← Injected server-side
 * };
 * 
 * // Query orders with combined filters
 * const orders = await orderService.listOrders(serverFilters);
 * ```
 * 
 * Filter Categories:
 * 1. Status Filters: status, financial_status, fulfillment_status
 * 2. Customer Filters: customer_email, customer_id
 * 3. Date Filters: created_after, updated_after, paid_after
 * 4. Amount Filters: min_total, max_total
 * 5. Search Filters: q (search query)
 * 6. Pagination: limit, offset
 * 7. Sorting: order_by, sort_order
 * 8. Tracking Filters: tracking_number
 * 
 * @see Database migration 002_add_orders_table.sql
 */
export const FilterableOrderPropsSchema = z
  .object({
    // ========================================================================
    // STATUS FILTERS
    // ========================================================================

    /**
     * Order Status Filter
     * 
     * Filter orders by lifecycle status.
     */
    status: OrderStatusSchema.optional().describe('Filter by order status'),

    /**
     * Financial Status Filter
     * 
     * Filter orders by payment status.
     */
    financial_status: FinancialStatusSchema.optional().describe('Filter by financial status'),

    /**
     * Fulfillment Status Filter
     * 
     * Filter orders by fulfillment status.
     */
    fulfillment_status: FulfillmentStatusSchema.optional().describe('Filter by fulfillment status'),

    // ========================================================================
    // CUSTOMER FILTERS
    // ========================================================================

    /**
     * Customer Email Filter
     * 
     * Filter orders by customer email address.
     */
    customer_email: z
      .string()
      .email('Invalid email format')
      .optional()
      .describe('Filter by customer email address'),

    /**
     * Customer ID Filter
     * 
     * Filter orders by customer ID (UUID).
     */
    customer_id: z
      .string()
      .uuid('Customer ID must be a valid UUID')
      .optional()
      .describe('Filter by customer ID'),

    // ========================================================================
    // DATE FILTERS
    // ========================================================================

    /**
     * Created After Filter
     * 
     * Show orders created after this date (ISO 8601).
     */
    created_after: z
      .string()
      .datetime({ offset: true, message: 'Invalid date format. Use ISO 8601 with timezone.' })
      .optional()
      .describe('Filter orders created after this date'),

    /**
     * Created Before Filter
     * 
     * Show orders created before this date (ISO 8601).
     */
    created_before: z
      .string()
      .datetime({ offset: true, message: 'Invalid date format. Use ISO 8601 with timezone.' })
      .optional()
      .describe('Filter orders created before this date'),

    /**
     * Updated After Filter
     * 
     * Show orders updated after this date (ISO 8601).
     */
    updated_after: z
      .string()
      .datetime({ offset: true, message: 'Invalid date format. Use ISO 8601 with timezone.' })
      .optional()
      .describe('Filter orders updated after this date'),

    /**
     * Paid After Filter
     * 
     * Show orders paid after this date (ISO 8601).
     */
    paid_after: z
      .string()
      .datetime({ offset: true, message: 'Invalid date format. Use ISO 8601 with timezone.' })
      .optional()
      .describe('Filter orders paid after this date'),

    // ========================================================================
    // AMOUNT FILTERS
    // ========================================================================

    /**
     * Minimum Total Filter
     * 
     * Show orders with total >= min_total.
     * Amount is in smallest currency unit (cents for USD).
     */
    min_total: OrderAmountSchema.optional().describe('Minimum order total filter'),

    /**
     * Maximum Total Filter
     * 
     * Show orders with total <= max_total.
     * Amount is in smallest currency unit (cents for USD).
     */
    max_total: OrderAmountSchema.optional().describe('Maximum order total filter'),

    // ========================================================================
    // SEARCH FILTERS
    // ========================================================================

    /**
     * Search Query Filter
     * 
     * Full-text search across order number, customer name, and email.
     */
    q: OrderSearchQuerySchema.optional().describe('Search query for order search'),

    // ========================================================================
    // TRACKING FILTERS
    // ========================================================================

    /**
     * Tracking Number Filter
     * 
     * Filter orders by shipping tracking number.
     */
    tracking_number: z
      .string()
      .min(1, 'Tracking number cannot be empty')
      .max(100, 'Tracking number too long')
      .optional()
      .describe('Filter by shipping tracking number'),

    // ========================================================================
    // PAGINATION
    // ========================================================================

    /**
     * Pagination Limit
     * 
     * Number of orders to return per page.
     * Default: 15, Max: 100
     */
    limit: PaginationLimitSchema,

    /**
     * Pagination Offset
     * 
     * Number of orders to skip before returning results.
     * Default: 0
     */
    offset: PaginationOffsetSchema,

    // ========================================================================
    // SORTING
    // ========================================================================

    /**
     * Sort Field
     * 
     * Field to sort orders by (created_at, updated_at, order_number, total_amount, status).
     */
    order_by: OrderSortFieldSchema,

    /**
     * Sort Direction
     * 
     * Direction to sort (asc, desc).
     */
    sort_order: SortOrderSchema,

    // ========================================================================
    // ADDITIONAL FILTERS
    // ========================================================================

    /**
     * Tags Filter
     * 
     * Filter orders by tags.
     */
    tags: z
      .array(z.string().min(1))
      .min(1, 'At least one tag is required')
      .optional()
      .describe('Filter by order tags'),

    /**
     * Payment Method Filter
     * 
     * Filter orders by payment method.
     */
    payment_method: z
      .string()
      .min(1, 'Payment method cannot be empty')
      .max(50, 'Payment method too long')
      .optional()
      .describe('Filter by payment method'),

    /**
     * Currency Filter
     * 
     * Filter orders by currency.
     */
    currency: z
      .string()
      .length(3, 'Currency must be 3 characters')
      .optional()
      .describe('Filter by order currency'),
  })
  .strict()
  .refine(
    (data) => {
      // Validation: If both min_total and max_total are provided, min must be <= max
      if (data.min_total !== undefined && data.max_total !== undefined) {
        return data.min_total <= data.max_total;
      }
      return true;
    },
    {
      message: 'Minimum total cannot be greater than maximum total',
      path: ['min_total'],
    }
  )
  .refine(
    (data) => {
      // Validation: If both created_after and created_before are provided, after must be <= before
      if (data.created_after && data.created_before) {
        return new Date(data.created_after) <= new Date(data.created_before);
      }
      return true;
    },
    {
      message: 'Created after date cannot be later than created before date',
      path: ['created_after'],
    }
  );

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Filterable Order Props Type
 * 
 * TypeScript type inferred from FilterableOrderPropsSchema.
 * Use this type for type-safe order filtering in your application.
 */
export type FilterableOrderProps = z.infer<typeof FilterableOrderPropsSchema>;

/**
 * Server-Side Order Filter Props
 * 
 * Extended type that includes storeId (injected server-side).
 * This type is used internally by the server to query orders.
 * 
 * SECURITY NOTE:
 * - storeId is NEVER accepted from client
 * - storeId is ALWAYS derived from authenticated context (ctx.storeId)
 */
export type ServerSideOrderFilterProps = FilterableOrderProps & {
  /**
   * Store ID
   * 
   * CRITICAL: This field is NEVER accepted from client input.
   * It is exclusively derived from the authenticated API context.
   * 
   * Purpose:
   * - Ensures multi-tenancy isolation
   * - Prevents cross-tenant data access
   * - Guarantees users only see orders from their store
   */
  store_id: string;
};

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate Order Filters
 * 
 * Validates client-provided order filters against the schema.
 * Returns validation result with parsed data or errors.
 * 
 * @param input - Raw input from client
 * @returns Validation result with parsed data or errors
 * 
 * @example
 * ```typescript
 * const result = validateOrderFilters({
 *   status: 'confirmed',
 *   financial_status: 'paid',
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
export function validateOrderFilters(input: unknown): {
  success: boolean;
  data?: FilterableOrderProps;
  errors?: z.ZodError;
} {
  const result = FilterableOrderPropsSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Create Server-Side Order Filters
 * 
 * Helper function to combine client filters with server-injected storeId.
 * This is the recommended pattern for building order queries.
 * 
 * @param clientFilters - Validated filters from client
 * @param storeId - Store ID from authenticated context (ctx.storeId)
 * @returns Combined filters for server-side order query
 * 
 * @example
 * ```typescript
 * // In tRPC procedure
 * export const listOrders = protectedProcedure
 *   .input(FilterableOrderPropsSchema)
 *   .query(async ({ input, ctx }) => {
 *     // Combine client filters with server context
 *     const serverFilters = createServerSideOrderFilters(
 *       input,
 *       ctx.storeId  // ← Injected from authenticated context
 *     );
 * 
 *     // Query orders with combined filters
 *     const orders = await orderService.listOrders(serverFilters);
 *     return orders;
 *   });
 * ```
 */
export function createServerSideOrderFilters(
  clientFilters: FilterableOrderProps,
  storeId: string
): ServerSideOrderFilterProps {
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
 * Create Default Order Filters
 * 
 * Helper to create default order filters with sensible defaults.
 * Useful for initial page loads or when no filters are provided.
 * 
 * @param overrides - Optional overrides for default values
 * @returns Default order filters
 * 
 * @example
 * ```typescript
 * const defaultFilters = createDefaultOrderFilters({
 *   limit: 20,
 *   status: 'confirmed'
 * });
 * ```
 */
export function createDefaultOrderFilters(
  overrides?: Partial<FilterableOrderProps>
): FilterableOrderProps {
  const defaults: FilterableOrderProps = {
    limit: 15,
    offset: 0,
    order_by: 'created_at',
    sort_order: 'desc',
    ...overrides,
  };

  return FilterableOrderPropsSchema.parse(defaults);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type Guard: Is Valid Order Filter
 * 
 * Checks if an object is a valid FilterableOrderProps.
 * 
 * @param value - Value to check
 * @returns True if value is valid order filter
 */
export function isValidOrderFilter(value: unknown): value is FilterableOrderProps {
  return FilterableOrderPropsSchema.safeParse(value).success;
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
  value: FilterableOrderProps | ServerSideOrderFilterProps
): value is ServerSideOrderFilterProps {
  return 'store_id' in value && typeof value.store_id === 'string';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FilterableOrderPropsSchema;
