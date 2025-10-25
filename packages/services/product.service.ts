/**
 * Product Service Layer
 * 
 * Provides business logic for product management operations with strict multi-tenancy enforcement.
 * All methods require storeId as the first parameter to ensure tenant isolation.
 * 
 * Architecture:
 * - Service Layer (this file) → Database (Supabase)
 * - Called by tRPC procedures → Product Router → This Service
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
 * @module product.service
 */

import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { 
  FilterableProductProps,
} from '@/packages/shared/schemas/product.schema';
import { createServerSideProductFilters } from '@/packages/shared/schemas/product.schema';

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
 * Main service class for product operations with strict multi-tenancy enforcement.
 * All methods require storeId as the first parameter.
 */
export class ProductService {
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
   * Find Products for Store
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
   * - Excludes soft-deleted products (deleted_at IS NULL)
   * - Applies client filters (category, price, status, etc.)
   * - Supports pagination (limit/offset)
   * - Supports sorting (order_by/sort_order)
   * - Full-text search support (q parameter)
   * 
   * @param storeId - Medusa Store ID from authenticated context (FIRST PARAMETER)
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
   *   'store_01HQWE123',  // ← storeId FIRST
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
    // GUARD CLAUSE 1: Check if service is initialized
    // ========================================================================
    
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Product service is not initialized. Call initialize() first.',
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

    // ========================================================================
    // GUARD CLAUSE 3: Validate filters
    // ========================================================================
    
    // Create server-side filters with storeId
    const serverFilters = createServerSideProductFilters(filters, storeId);

    try {
      // ======================================================================
      // BUILD QUERY: Start with base query filtered by store_id
      // ======================================================================
      
      let query = this.supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
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
   * Get Product by ID for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param productId - Product UUID
   * @returns Product or throws error if not found
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if product doesn't exist
   * 
   * @example
   * ```typescript
   * const product = await productService.getProductById(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   'prod_123e4567-e89b-12d3-a456-426614174000'
   * );
   * ```
   */
  async getProductById(storeId: string, productId: string): Promise<Product> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Product service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    if (!productId || !productId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid product ID format',
      });
    }

    // Query database
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', productId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Product not found: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product not found',
      });
    }

    return data as Product;
  }

  /**
   * Create Product for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param productData - Product creation data
   * @returns Created product
   * 
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if creation fails
   * 
   * @example
   * ```typescript
   * const product = await productService.createProduct(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   {
   *     title: 'New Product',
   *     price_amount: 2999,
   *     price_currency: 'USD',
   *     // ... other product data
   *   }
   * );
   * ```
   */
  async createProduct(storeId: string, productData: Omit<Product, 'id' | 'store_id' | 'created_at' | 'updated_at'>): Promise<Product> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Product service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    // Prepare product data with store_id
    const productToCreate = {
      ...productData,
      store_id: storeId,
    };

    // Insert product
    const { data, error } = await this.supabase
      .from('products')
      .insert(productToCreate as any)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create product: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Product creation succeeded but returned no data',
      });
    }

    return data as Product;
  }

  /**
   * Update Product for Store
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param productId - Product UUID
   * @param updateData - Product update data
   * @returns Updated product
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if product doesn't exist
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if update fails
   * 
   * @example
   * ```typescript
   * const product = await productService.updateProduct(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   'prod_123e4567-e89b-12d3-a456-426614174000',
   *   {
   *     title: 'Updated Product Title',
   *     price_amount: 3999,
   *     // ... other update data
   *   }
   * );
   * ```
   */
  async updateProduct(storeId: string, productId: string, updateData: Partial<Omit<Product, 'id' | 'store_id' | 'created_at' | 'updated_at'>>): Promise<Product> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Product service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    if (!productId || !productId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid product ID format',
      });
    }

    // Update product
    const { data, error } = await this.supabase
      .from('products')
      .update(updateData as any)
      .eq('store_id', storeId)
      .eq('id', productId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to update product: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product not found or update failed',
      });
    }

    return data as Product;
  }

  /**
   * Delete Product for Store (Soft Delete)
   * 
   * CRITICAL: storeId is the FIRST parameter to enforce multi-tenancy.
   * This signature pattern must be followed by all service methods.
   * 
   * @param storeId - Medusa Store ID (FIRST PARAMETER)
   * @param productId - Product UUID
   * @returns Success message
   * 
   * @throws {TRPCError} BAD_REQUEST if IDs are invalid
   * @throws {TRPCError} NOT_FOUND if product doesn't exist
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if deletion fails
   * 
   * @example
   * ```typescript
   * const result = await productService.deleteProduct(
   *   'store_01HQWE123',  // ← storeId FIRST
   *   'prod_123e4567-e89b-12d3-a456-426614174000'
   * );
   * ```
   */
  async deleteProduct(storeId: string, productId: string): Promise<{ success: boolean; message: string }> {
    // Guard clauses
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Product service is not initialized',
      });
    }

    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    if (!productId || !productId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid product ID format',
      });
    }

    // Soft delete product
    const { data, error } = await this.supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('store_id', storeId)
      .eq('id', productId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete product: ${error.message}`,
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product not found or already deleted',
      });
    }

    return {
      success: true,
      message: `Product ${productId} deleted successfully`,
    };
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
