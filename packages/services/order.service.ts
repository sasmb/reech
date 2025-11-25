/**
 * Order Service Layer
 * 
 * Provides business logic for order management operations with strict multi-tenancy enforcement.
 * All methods require storeId as the first parameter to ensure tenant isolation.
 * 
 * Architecture:
 * - Service Layer (this file) → Database (Supabase)
 * - Called by tRPC procedures → Order Router → This Service
 * 
 * Multi-Tenancy Enforcement:
 * - Every method requires storeId as the FIRST parameter
 * - All queries automatically filter by store_id column
 * - Prevents cross-tenant data access
 * - storeId format validation (Medusa Store ID: store_XXXXX)
 * 
 * Error Handling:
 * - Uses guard clauses for input validation
 * - Returns descriptive error messages
 * - Throws TRPCError with appropriate codes
 * 
 * @module order.service
 */

import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { 
  Order,
  CreateOrder,
  UpdateOrder,
  OrderQuery,
  OrderSort,
  OrderStats,
  OrderLineItem,
  CreateOrderLineItem,
  OrderAddress,
  CreateOrderAddress,
  OrderFulfillment,
  CreateOrderFulfillment,
  OrderTransaction,
  CreateOrderTransaction,
  OrderRefund,
  CreateOrderRefund,
  OrderDiscount,
  CreateOrderDiscount,
} from '@/packages/shared/schemas/order';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Order List Response
 * 
 * Response format for order listing queries.
 * Includes orders, count, and pagination metadata.
 */
export interface OrderListResponse {
  orders: Order[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Supabase Database Schema
 * 
 * Type definitions for Supabase table structure.
 */
interface Database {
  public: {
    Tables: {
      orders: {
        Row: Order;
        Insert: CreateOrder;
        Update: UpdateOrder;
      };
      order_line_items: {
        Row: OrderLineItem;
        Insert: CreateOrderLineItem;
        Update: Partial<CreateOrderLineItem>;
      };
      order_addresses: {
        Row: OrderAddress;
        Insert: CreateOrderAddress;
        Update: Partial<CreateOrderAddress>;
      };
      order_fulfillments: {
        Row: OrderFulfillment;
        Insert: CreateOrderFulfillment;
        Update: Partial<CreateOrderFulfillment>;
      };
      order_transactions: {
        Row: OrderTransaction;
        Insert: CreateOrderTransaction;
        Update: Partial<CreateOrderTransaction>;
      };
      order_refunds: {
        Row: OrderRefund;
        Insert: CreateOrderRefund;
        Update: Partial<CreateOrderRefund>;
      };
      order_discounts: {
        Row: OrderDiscount;
        Insert: CreateOrderDiscount;
        Update: Partial<CreateOrderDiscount>;
      };
    };
  };
}

// ============================================================================
// ORDER SERVICE CLASS
// ============================================================================

/**
 * Order Service
 * 
 * Main service class for order operations with strict multi-tenancy enforcement.
 * All methods require storeId as the first parameter.
 */
export class OrderService {
  private supabase: ReturnType<typeof createClient<Database>> | null = null;

  /**
   * Initialize Service
   * 
   * Sets up Supabase client for database operations.
   * Must be called before using any service methods.
   */
  async initialize(): Promise<void> {
    // Guard clause: Check environment variables
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Supabase configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
        cause: 'MISSING_ENV_VARS',
      });
    }

    // Initialize Supabase client
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Find Orders for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * Guard Clauses:
   * 1. Check if service is initialized
   * 2. Validate storeId format (Medusa Store ID: store_XXXXX)
   * 3. Validate input filters
   * 
   * Query Strategy:
   * - Filters by store_id (tenant isolation)
   * - Applies client filters (status, date range, customer, etc.)
   * - Supports pagination (limit/offset)
   * - Supports sorting (field/direction)
   * - Full-text search support (search parameter)
   * 
   * @param storeId - Medusa Store ID from authenticated context (FIRST PARAMETER)
   * @param filters - Client-provided filters for order query
   * @returns Order list with pagination metadata
   * 
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if service not initialized
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   * 
   * @example
   * ```typescript
   * const { orders, count } = await orderService.findOrdersForStore(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   {
   *     status: 'confirmed',
   *     financialStatus: 'paid',
   *     createdAfter: '2024-01-01T00:00:00Z',
   *     limit: 20,
   *     offset: 0
   *   }
   * );
   * ```
   */
  async findOrdersForStore(
    storeId: string,
    filters: Partial<OrderQuery> & { limit?: number; offset?: number; sort?: OrderSort }
  ): Promise<OrderListResponse> {
    // ========================================================================
    // GUARD CLAUSE 1: Check if service is initialized
    // ========================================================================
    
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order service is not initialized. Call initialize() first.',
        cause: 'SERVICE_NOT_INITIALIZED',
      });
    }

    // ========================================================================
    // GUARD CLAUSE 2: Validate storeId format (Medusa Store ID)
    // ========================================================================
    
    if (!storeId || typeof storeId !== 'string' || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 
          'Invalid Medusa Store ID format. Expected format: "store_XXXXX". ' +
          `Received: "${storeId}"`,
        cause: 'INVALID_STORE_ID_FORMAT',
      });
    }

    try {
      // ======================================================================
      // BUILD QUERY: Start with base query filtered by store_id
      // ======================================================================
      
      let query = this.supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('storeId', storeId);

      // ======================================================================
      // APPLY FILTERS: Add client-provided filters
      // ======================================================================

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Financial status filter
      if (filters.financialStatus) {
        query = query.eq('financialStatus', filters.financialStatus);
      }

      // Fulfillment status filter
      if (filters.fulfillmentStatus) {
        query = query.eq('fulfillmentStatus', filters.fulfillmentStatus);
      }

      // Customer filter
      if (filters.customerId) {
        query = query.eq('customerId', filters.customerId);
      }

      // Email filter
      if (filters.email) {
        query = query.eq('email', filters.email);
      }

      // Date filters
      if (filters.createdAfter) {
        query = query.gte('createdAt', filters.createdAfter);
      }

      if (filters.createdBefore) {
        query = query.lte('createdAt', filters.createdBefore);
      }

      if (filters.updatedAfter) {
        query = query.gte('updatedAt', filters.updatedAfter);
      }

      if (filters.updatedBefore) {
        query = query.lte('updatedAt', filters.updatedBefore);
      }

      // Total range filters
      if (filters.totalMin !== undefined) {
        query = query.gte('total', filters.totalMin);
      }

      if (filters.totalMax !== undefined) {
        query = query.lte('total', filters.totalMax);
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Search query (full-text search)
      if (filters.search) {
        query = query.or(
          `orderNumber.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      // ======================================================================
      // SORTING: Apply sort order
      // ======================================================================
      
      const sortField = filters.sort?.field || 'createdAt';
      const sortDirection = filters.sort?.direction || 'desc';
      
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // ======================================================================
      // PAGINATION: Apply limit and offset
      // ======================================================================
      
      const limit = filters.limit || 15;
      const offset = filters.offset || 0;
      
      query = query.range(offset, offset + limit - 1);

      // ======================================================================
      // EXECUTE QUERY: Fetch orders from database
      // ======================================================================
      
      const { data, error, count } = await query;

      // Handle database errors
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch orders from database: ${error.message}`,
          cause: error,
        });
      }

      // ======================================================================
      // RETURN RESPONSE: Format and return results
      // ======================================================================
      
      return {
        orders: (data || []) as Order[],
        count: count || 0,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      };

    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Unexpected error while fetching orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error,
      });
    }
  }

  /**
   * Get Order by ID for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param orderId - Order UUID
   * @returns Order or throws error if not found
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if order doesn't exist
   * 
   * @example
   * ```typescript
   * const order = await orderService.getOrderById(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   'order_123e4567-e89b-12d3-a456-426614174000'
   * );
   * ```
   */
  async getOrderById(storeId: string, orderId: string): Promise<Order> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    if (!orderId || !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid order ID format',
      });
    }

    // Query database
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('storeId', storeId)
      .eq('id', orderId)
      .single();

    if (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Order not found: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    return data as Order;
  }

  /**
   * Create Order for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param orderData - Order creation data
   * @returns Created order
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if creation fails
   * 
   * @example
   * ```typescript
   * const order = await orderService.createOrder(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   {
   *     customerId: 'customer_123',
   *     email: 'customer@example.com',
   *     currency: 'USD',
   *     subtotal: 2999,
   *     total: 3299,
   *     // ... other order data
   *   }
   * );
   * ```
   */
  async createOrder(storeId: string, orderData: CreateOrder): Promise<Order> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    // Prepare order data with storeId
    const orderToCreate = {
      ...orderData,
      storeId,
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Insert order
    const { data, error } = await this.supabase
      .from('orders')
      .insert(orderToCreate as any)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create order: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order creation succeeded but returned no data',
      });
    }

    return data as Order;
  }

  /**
   * Update Order for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param orderId - Order UUID
   * @param updateData - Order update data
   * @returns Updated order
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if order doesn't exist
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if update fails
   * 
   * @example
   * ```typescript
   * const order = await orderService.updateOrder(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   'order_123e4567-e89b-12d3-a456-426614174000',
   *   {
   *     status: 'confirmed',
   *     financialStatus: 'paid',
   *     // ... other update data
   *   }
   * );
   * ```
   */
  async updateOrder(storeId: string, orderId: string, updateData: UpdateOrder): Promise<Order> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    if (!orderId || !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid order ID format',
      });
    }

    // Update order
    const { data, error } = await this.supabase
      .from('orders')
      .update(updateData as any)
      .eq('storeId', storeId)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to update order: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found or update failed',
      });
    }

    return data as Order;
  }

  /**
   * Delete Order for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param orderId - Order UUID
   * @returns Success message
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if order doesn't exist
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if deletion fails
   * 
   * @example
   * ```typescript
   * const result = await orderService.deleteOrder(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   'order_123e4567-e89b-12d3-a456-426614174000'
   * );
   * ```
   */
  async deleteOrder(storeId: string, orderId: string): Promise<{ success: boolean; message: string }> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    if (!orderId || !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid order ID format',
      });
    }

    // Delete order
    const { data, error } = await this.supabase
      .from('orders')
      .delete()
      .eq('storeId', storeId)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete order: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found or already deleted',
      });
    }

    return {
      success: true,
      message: `Order ${orderId} deleted successfully`,
    };
  }

  /**
   * Get Order Statistics for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param statsQuery - Statistics query parameters
   * @returns Order statistics
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if query fails
   * 
   * @example
   * ```typescript
   * const stats = await orderService.getOrderStats(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   {
   *     period: 'month',
   *     dateFrom: '2024-01-01T00:00:00Z',
   *     dateTo: '2024-01-31T23:59:59Z'
   *   }
   * );
   * ```
   */
  async getOrderStats(storeId: string, statsQuery: Omit<OrderStats, 'storeId'>): Promise<OrderStats> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Order service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    try {
      // Build statistics query
      let query = this.supabase
        .from('orders')
        .select('*')
        .eq('storeId', storeId)
        .gte('createdAt', statsQuery.dateFrom)
        .lte('createdAt', statsQuery.dateTo);

      // Execute query
      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch order statistics: ${error.message}`,
          cause: error,
        });
      }

      const orders = data || [];

      // Calculate statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order: any) => sum + order.total, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get top products (simplified implementation)
      const topProducts: any[] = [];

      return {
        storeId,
        period: statsQuery.period,
        dateFrom: statsQuery.dateFrom,
        dateTo: statsQuery.dateTo,
        totalOrders,
        totalRevenue,
        averageOrderValue,
        conversionRate: 0, // Would need additional data to calculate
        topProducts,
      };

    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Unexpected error while fetching order statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error,
      });
    }
  }
}

// ============================================================================
// SERVICE INSTANCE EXPORT
// ============================================================================

/**
 * Order Service Instance
 * 
 * Singleton instance of OrderService for use across the application.
 * Must be initialized before use by calling orderService.initialize().
 */
export const orderService = new OrderService();

// Initialize service on module load
orderService.initialize().catch((error) => {
  console.error('Failed to initialize order service:', error);
});
