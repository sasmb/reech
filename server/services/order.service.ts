/**
 * Order Service Layer
 * 
 * This service provides business logic for order management operations.
 * All methods enforce multi-tenancy by requiring storeId parameter.
 * 
 * Architecture:
 * - Service Layer (this file) → Database (Supabase)
 * - Called by tRPC procedures → Order Router → This Service
 * 
 * Multi-Tenancy:
 * - Every method requires storeId parameter
 * - All queries automatically filter by store_id column
 * - Prevents cross-tenant data access
 * 
 * Error Handling:
 * - Uses guard clauses for input validation
 * - Returns descriptive error messages
 * - Throws TRPCError with appropriate codes
 * 
 * Prompt 3.2: Enhanced with BaseService for consistent isolation patterns
 * - Extends BaseService for shared isolation utilities
 * - Mandatory storeid validation in all methods
 * - Defensive coding with guard clauses and early returns
 * 
 * @module order.service
 */

import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
// Mock Database type for now
type Database = any;
import { BaseService } from './base.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Order status types from database
 */
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
type FinancialStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded';
type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'partially_shipped' | 'shipped' | 'partially_delivered' | 'delivered' | 'partially_returned' | 'returned' | 'canceled' | 'requires_action';

/**
 * Order interface matching database schema
 */
export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  display_id: string;
  customer_id?: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  status: OrderStatus;
  financial_status: FinancialStatus;
  fulfillment_status: FulfillmentStatus;
  total_amount: number;
  subtotal_amount: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  currency_code: string;
  shipping_address?: any;
  billing_address?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Order list response interface
 */
export interface OrderListResponse {
  orders: Order[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Filterable order properties
 */
export interface FilterableOrderProps {
  status?: OrderStatus;
  financial_status?: FinancialStatus;
  fulfillment_status?: FulfillmentStatus;
  customer_id?: string;
  customer_email?: string;
  min_total?: number;
  max_total?: number;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// ORDER SERVICE CLASS
// ============================================================================

/**
 * Order Service
 * 
 * Main service class for order operations.
 * Provides methods for CRUD operations and order queries.
 */
export class OrderService extends BaseService {

  /**
   * Initialize Service
   * 
   * Sets up Supabase client for database operations.
   * Must be called before using any service methods.
   */
  override async initialize(): Promise<void> {
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

    // Initialize Supabase client and call parent initialize
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    super.initialize(supabase);
  }

  /**
   * Find Orders for Store
   * 
   * Lists orders for a specific store with optional filtering.
   * 
   * Guard Clauses:
   * 1. Validate storeId and ensure service is initialized
   * 2. Validate input filters
   * 
   * Query Strategy:
   * - Filters by store_id (tenant isolation)
   * - Applies client-provided filters
   * - Excludes soft-deleted orders
   * - Supports pagination
   * 
   * @param storeId - Medusa Store ID
   * @param filters - Optional filters for order query
   * @returns Paginated list of orders
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR for database errors
   */
  async findOrdersForStore(
    storeId: string,
    filters: FilterableOrderProps = {}
  ): Promise<OrderListResponse> {
    
    // ========================================================================
    // GUARD CLAUSE: Validate storeId and ensure service is initialized
    // ========================================================================
    
    this.validateStoreId(storeId, 'OrderService');

    // ========================================================================
    // BUILD QUERY: Start with base query filtered by store_id
    // ========================================================================
    
    const limit = Math.min(filters.limit || 20, 100); // Max 100 items per page
    const offset = filters.offset || 0;

    try {
      // Create base query with mandatory store isolation
      let query = this.createIsolatedQueryWithCount('orders', storeId, 'OrderService')
        .is('deleted_at', null); // Exclude soft-deleted orders

      // ======================================================================
      // APPLY FILTERS: Add client-provided filters
      // ======================================================================

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Financial status filter
      if (filters.financial_status) {
        query = query.eq('financial_status', filters.financial_status);
      }

      // Fulfillment status filter
      if (filters.fulfillment_status) {
        query = query.eq('fulfillment_status', filters.fulfillment_status);
      }

      // Customer filters
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters.customer_email) {
        query = query.ilike('customer_email', `%${filters.customer_email}%`);
      }

      // Price range filters
      if (filters.min_total !== undefined) {
        query = query.gte('total_amount', filters.min_total);
      }

      if (filters.max_total !== undefined) {
        query = query.lte('total_amount', filters.max_total);
      }

      // Date range filters
      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }

      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        this.handleDatabaseError(error, 'OrderService', 'findOrdersForStore');
      }

      const orders = data || [];
      const totalCount = count || 0;
      const hasMore = offset + orders.length < totalCount;

      return {
        orders: orders as Order[],
        count: totalCount,
        limit,
        offset,
        hasMore,
      };

    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'OrderService', 'findOrdersForStore');
    }
  }

  /**
   * Get Order by ID
   * 
   * Fetches a single order by ID for a specific store.
   * 
   * @param storeId - Medusa Store ID
   * @param orderId - Order UUID
   * @returns Order or null if not found
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if order doesn't exist
   */
  async getOrderById(storeId: string, orderId: string): Promise<Order> {
    // ========================================================================
    // GUARD CLAUSES: Input validation and service state
    // ========================================================================
    
    // Guard clause: Validate storeId and ensure service is initialized
    this.validateStoreId(storeId, 'OrderService');

    // Guard clause: Validate order ID format
    if (!orderId || !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid order ID format. Expected UUID format.',
        cause: 'INVALID_ORDER_ID_FORMAT',
      });
    }

    try {
      // Query database with mandatory store isolation
      const { data, error } = await this.createIsolatedQuery('orders', storeId, 'OrderService')
        .eq('id', orderId)
        .is('deleted_at', null)
        .single();

      if (error) {
        this.handleDatabaseError(error, 'OrderService', 'getOrderById');
      }

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      return data as Order;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'OrderService', 'getOrderById');
    }
  }

  /**
   * Get Order by Order Number
   * 
   * Fetches a single order by order number for a specific store.
   * 
   * @param storeId - Medusa Store ID
   * @param orderNumber - Order number (e.g., "ORD-001")
   * @returns Order or null if not found
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} NOT_FOUND if order doesn't exist
   */
  async getOrderByNumber(storeId: string, orderNumber: string): Promise<Order> {
    // ========================================================================
    // GUARD CLAUSES: Input validation and service state
    // ========================================================================
    
    // Guard clause: Validate storeId and ensure service is initialized
    this.validateStoreId(storeId, 'OrderService');

    // Guard clause: Validate order number
    if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.trim().length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Order number is required and must be a non-empty string.',
        cause: 'INVALID_ORDER_NUMBER',
      });
    }

    try {
      // Query database with mandatory store isolation
      const { data, error } = await this.createIsolatedQuery('orders', storeId, 'OrderService')
        .eq('order_number', orderNumber.trim())
        .is('deleted_at', null)
        .single();

      if (error) {
        this.handleDatabaseError(error, 'OrderService', 'getOrderByNumber');
      }

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order with number "${orderNumber}" not found`,
        });
      }

      return data as Order;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'OrderService', 'getOrderByNumber');
    }
  }

  /**
   * Get Orders by Customer
   * 
   * Fetches orders for a specific customer within a store.
   * 
   * @param storeId - Medusa Store ID
   * @param customerId - Customer UUID
   * @param limit - Maximum number of orders to return
   * @param offset - Number of orders to skip
   * @returns Paginated list of customer orders
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR for database errors
   */
  async getOrdersByCustomer(
    storeId: string,
    customerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<OrderListResponse> {
    
    // ========================================================================
    // GUARD CLAUSES: Input validation and service state
    // ========================================================================
    
    // Guard clause: Validate storeId and ensure service is initialized
    this.validateStoreId(storeId, 'OrderService');

    // Guard clause: Validate customer ID format
    if (!customerId || !customerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid customer ID format. Expected UUID format.',
        cause: 'INVALID_CUSTOMER_ID_FORMAT',
      });
    }

    // Guard clause: Validate pagination parameters
    const safeLimit = Math.min(limit, 100); // Max 100 items per page
    const safeOffset = Math.max(offset, 0);

    try {
      // Query database with mandatory store isolation
      const { data, error, count } = await this.createIsolatedQueryWithCount('orders', storeId, 'OrderService')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1);

      if (error) {
        this.handleDatabaseError(error, 'OrderService', 'getOrdersByCustomer');
      }

      const orders = data || [];
      const totalCount = count || 0;
      const hasMore = safeOffset + orders.length < totalCount;

      return {
        orders: orders as Order[],
        count: totalCount,
        limit: safeLimit,
        offset: safeOffset,
        hasMore,
      };

    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'OrderService', 'getOrdersByCustomer');
    }
  }

  /**
   * Update Order Status
   * 
   * Updates the status of an order within a store.
   * 
   * @param storeId - Medusa Store ID
   * @param orderId - Order UUID
   * @param status - New order status
   * @returns Updated order
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if order doesn't exist
   */
  async updateOrderStatus(
    storeId: string,
    orderId: string,
    status: OrderStatus
  ): Promise<Order> {
    
    // ========================================================================
    // GUARD CLAUSES: Input validation and service state
    // ========================================================================
    
    // Guard clause: Validate storeId and ensure service is initialized
    this.validateStoreId(storeId, 'OrderService');

    // Guard clause: Validate order ID format
    if (!orderId || !orderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid order ID format. Expected UUID format.',
        cause: 'INVALID_ORDER_ID_FORMAT',
      });
    }

    // Guard clause: Validate status
    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`,
        cause: 'INVALID_ORDER_STATUS',
      });
    }

    try {
      // Update order with mandatory store isolation
      const { data, error } = await this.supabase!
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('store_id', storeId)
        .eq('id', orderId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        this.handleDatabaseError(error, 'OrderService', 'updateOrderStatus');
      }

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      return data as Order;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'OrderService', 'updateOrderStatus');
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