/**
 * Product Service Layer
 * 
 * This service provides business logic for product management operations.
 * All methods enforce multi-tenancy by requiring storeId parameter.
 * 
 * Architecture:
 * - Service Layer (this file) → Database (Supabase)
 * - Called by tRPC procedures → Product Router → This Service
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
 * @module product.service
 */

import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
// Mock types for now - will be replaced with actual schema imports
interface FilterableProductProps {
  status?: string;
  category_id?: string;
  category_ids?: string[];
  collection_id?: string;
  min_price?: number;
  max_price?: number;
  tags?: string[];
  in_stock?: boolean;
  is_giftcard?: boolean;
  created_after?: string;
  updated_after?: string;
  q?: string;
  order_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

function createServerSideProductFilters(filters: FilterableProductProps, _storeId: string) {
  return filters; // Mock implementation
}
import { BaseService } from './base.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Product Type
 * 
 * Represents a product in the database.
 * Aligns with the products table schema from migration 001.
 */
export interface Product {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  short_description: string | null;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'archived';
  is_published: boolean;
  published_at: string | null;
  price_amount: number;
  price_currency: string;
  compare_at_price: number | null;
  cost_price: number | null;
  track_inventory: boolean;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
  requires_shipping: boolean;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  is_digital: boolean;
  download_url: string | null;
  download_limit: number | null;
  images: string[];
  featured_image: string | null;
  category_ids: string[];
  tag_ids: string[];
  collection_ids: string[];
  vendor: string | null;
  brand: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  metadata: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  has_variants: boolean;
  options: unknown;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Product List Response
 * 
 * Response format for product listing queries.
 * Includes products, count, and pagination metadata.
 */
export interface ProductListResponse {
  products: Product[];
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
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'store_id'>>;
      };
    };
  };
}

// ============================================================================
// PRODUCT SERVICE CLASS
// ============================================================================

/**
 * Product Service
 * 
 * Main service class for product operations.
 * Provides methods for CRUD operations and product queries.
 */
export class ProductService extends BaseService {

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
   * Find Products for Store (Prompt 2.1)
   * 
   * Lists products for a specific store with optional filtering.
   * 
   * Guard Clauses:
   * 1. Check if service is initialized
   * 2. Validate storeId format (Medusa Store ID: store_XXXXX)
   * 3. Validate input filters
   * 
   * Query Strategy:
   * - Filters by store_id (tenant isolation)
   * - Excludes soft-deleted products (deleted_at IS NULL)
   * - Applies client filters (category, price, status, etc.)
   * - Supports pagination (limit/offset)
   * - Supports sorting (order_by/sort_order)
   * - Full-text search support (q parameter)
   * 
   * @param storeId - Medusa Store ID from authenticated context
   * @param filters - Client-provided filters for product query
   * @returns Product list with pagination metadata
   * 
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if service not initialized
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if database query fails
   * 
   * @example
   * ```typescript
   * const { products, count } = await productService.findProductsForStore(
   *   'store_01HQWE123',
   *   {
   *     category_id: 'cat_123',
   *     min_price: 1000,
   *     status: 'published',
   *     limit: 20,
   *     offset: 0
   *   }
   * );
   * ```
   */
  async findProductsForStore(
    storeId: string,
    filters: FilterableProductProps
  ): Promise<ProductListResponse> {
    // ========================================================================
    // GUARD CLAUSE: Validate storeId and ensure service is initialized
    // ========================================================================
    
    this.validateStoreId(storeId, 'ProductService');

    // ========================================================================
    // BUILD QUERY: Start with base query filtered by store_id
    // ========================================================================
    
    // Create server-side filters with storeId
    const serverFilters = createServerSideProductFilters(filters, storeId);

    try {
      // Create base query with mandatory store isolation
      let query = this.createIsolatedQueryWithCount('products', storeId, 'ProductService')
        .is('deleted_at', null); // Exclude soft-deleted products

      // ======================================================================
      // APPLY FILTERS: Add client-provided filters
      // ======================================================================

      // Status filter
      if (serverFilters.status) {
        // Map client status to database status
        const statusMap: Record<string, string> = {
          'draft': 'inactive',
          'published': 'active',
          'proposed': 'pending',
          'rejected': 'archived',
        };
        const dbStatus = statusMap[serverFilters.status] || serverFilters.status;
        query = query.eq('status', dbStatus);
      }

      // Published filter (for storefront queries)
      if (serverFilters.status === 'published') {
        query = query.eq('is_published', true);
      }

      // Category filter
      if (serverFilters.category_id) {
        query = query.contains('category_ids', [serverFilters.category_id]);
      }

      // Multiple categories filter
      if (serverFilters.category_ids && serverFilters.category_ids.length > 0) {
        query = query.overlaps('category_ids', serverFilters.category_ids);
      }

      // Collection filter
      if (serverFilters.collection_id) {
        query = query.contains('collection_ids', [serverFilters.collection_id]);
      }

      // Tags filter
      if (serverFilters.tags && serverFilters.tags.length > 0) {
        query = query.overlaps('tag_ids', serverFilters.tags);
      }

      // Price range filters
      if (serverFilters.min_price !== undefined) {
        query = query.gte('price_amount', serverFilters.min_price);
      }

      if (serverFilters.max_price !== undefined) {
        query = query.lte('price_amount', serverFilters.max_price);
      }

      // In stock filter
      if (serverFilters.in_stock === true) {
        query = query.gt('quantity_available', 0);
      }

      // Gift card filter
      if (serverFilters.is_giftcard !== undefined) {
        query = query.eq('is_digital', serverFilters.is_giftcard);
      }

      // Date filters
      if (serverFilters.created_after) {
        query = query.gte('created_at', serverFilters.created_after);
      }

      if (serverFilters.updated_after) {
        query = query.gte('updated_at', serverFilters.updated_after);
      }

      // Search query (full-text search)
      if (serverFilters.q) {
        query = query.or(
          `title.ilike.%${serverFilters.q}%,description.ilike.%${serverFilters.q}%,sku.ilike.%${serverFilters.q}%`
        );
      }

      // ======================================================================
      // SORTING: Apply sort order
      // ======================================================================
      
      const orderByField = serverFilters.order_by || 'created_at';
      const sortOrder = serverFilters.sort_order || 'desc';
      
      query = query.order(orderByField, { ascending: sortOrder === 'asc' });

      // ======================================================================
      // PAGINATION: Apply limit and offset
      // ======================================================================
      
      const limit = serverFilters.limit || 15;
      const offset = serverFilters.offset || 0;
      
      query = query.range(offset, offset + limit - 1);

      // ======================================================================
      // EXECUTE QUERY: Fetch products from database
      // ======================================================================
      
      const { data, error, count } = await query;

      // Handle database errors
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch products from database: ${error.message}`,
          cause: error,
        });
      }

      // ======================================================================
      // RETURN RESPONSE: Format and return results
      // ======================================================================
      
      return {
        products: (data || []) as Product[],
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
        message: `Unexpected error while fetching products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error,
      });
    }
  }

  /**
   * Get Product by ID
   * 
   * Fetches a single product by ID for a specific store.
   * 
   * @param storeId - Medusa Store ID
   * @param productId - Product UUID
   * @returns Product or null if not found
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if product doesn't exist
   */
  async getProductById(storeId: string, productId: string): Promise<Product> {
    // ========================================================================
    // GUARD CLAUSES: Input validation and service state
    // ========================================================================
    
    // Guard clause: Validate storeId and ensure service is initialized
    this.validateStoreId(storeId, 'ProductService');

    // Guard clause: Validate product ID format
    if (!productId || !productId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid product ID format. Expected UUID format.',
        cause: 'INVALID_PRODUCT_ID_FORMAT',
      });
    }

    try {
      // Query database with mandatory store isolation
      const { data, error } = await this.createIsolatedQuery('products', storeId, 'ProductService')
        .eq('id', productId)
        .is('deleted_at', null)
        .single();

      if (error) {
        this.handleDatabaseError(error, 'ProductService', 'getProductById');
      }

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      return data as Product;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'ProductService', 'getProductById');
    }
  }
}

// ============================================================================
// SERVICE INSTANCE EXPORT
// ============================================================================

/**
 * Product Service Instance
 * 
 * Singleton instance of ProductService for use across the application.
 * Must be initialized before use by calling productService.initialize().
 */
export const productService = new ProductService();

// Initialize service on module load
productService.initialize().catch((error) => {
  console.error('Failed to initialize product service:', error);
});

