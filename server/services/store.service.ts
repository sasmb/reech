/**
 * Store Service Layer
 * 
 * Handles business logic for store configuration management.
 * This service acts as the bridge between the tRPC API layer and the Supabase database.
 * 
 * Responsibilities:
 * - Fetch store configurations by storeId from Supabase
 * - Update store configurations with validation
 * - Handle database interactions via Supabase client
 * - Apply business rules and transformations
 * 
 * Security:
 * - All methods require a valid storeId (UUID)
 * - Data isolation enforced at service layer
 * - Input validation handled by Zod schemas before reaching this layer
 * - Uses Supabase client for all database operations
 * 
 * Phase D, Step 3: Redis Dependency Removed
 * - All data now fetched exclusively from Supabase
 * - No Redis fallback logic
 * - Centralized error handling with proper error codes
 * 
 * Prompt 3.2: Enhanced with BaseService for consistent isolation patterns
 * - Extends BaseService for shared isolation utilities
 * - Mandatory storeid validation in all methods
 * - Defensive coding with guard clauses and early returns
 */

import { TRPCError } from '@trpc/server';
import type { StoreConfig } from '@/packages/shared/schemas/store-config';
import { getSupabaseClient } from '@/lib/supabase-server';
import { BaseService } from './base.service';

/**
 * Map database row to StoreConfig
 * 
 * Transforms the database row structure to match the canonical StoreConfig schema.
 * 
 * @param row - Database row from store_configs table
 * @returns StoreConfig object
 */
function mapDatabaseRowToStoreConfig(row: any): StoreConfig {
  return {
    storeId: row.store_id,
    version: row.version,
    metadata: row.metadata,
    theme: row.theme,
    layout: row.layout,
    features: row.features,
    integrations: row.integrations,
    seo: row.seo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as StoreConfig;
}

/**
 * Map StoreConfig to database row structure
 * 
 * Transforms the StoreConfig schema to match the database table structure.
 * 
 * @param config - StoreConfig object
 * @returns Database row structure
 */
function mapStoreConfigToDatabaseRow(config: Partial<StoreConfig>) {
  return {
    store_id: config.storeId,
    version: config.version,
    config: config.metadata || {}, // Store metadata as config for compatibility
    metadata: config.metadata,
    theme: config.theme,
    layout: config.layout,
    features: config.features,
    integrations: config.integrations,
    seo: config.seo,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Store Service Class
 * 
 * Encapsulates all store-related business logic and database operations
 */
export class StoreService extends BaseService {
  /**
   * Get store configuration by storeId
   * 
   * Implementation follows defensive coding principles:
   * 1. Guard Clause: Validate storeId is provided
   * 2. Database Query: Fetch from Supabase store_configs table
   * 3. Guard Clause: Check if store exists (centralized error)
   * 4. Happy Path: Return store configuration
   * 
   * Phase D, Step 3: Supabase-Only Implementation
   * - Fetches data exclusively from Supabase
   * - No Redis fallback logic
   * - Returns centralized STORE_NOT_FOUND error if not found
   * 
   * @param storeId - UUID of the store
   * @returns Store configuration from Supabase
   * @throws {TRPCError} NOT_FOUND if store doesn't exist (STORE_NOT_FOUND)
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR for database errors
   */
  async getConfig(storeId: string): Promise<StoreConfig> {
    // ============================================================================
    // GUARD CLAUSE: Validate storeId and ensure service is initialized
    // ============================================================================
    this.validateStoreId(storeId, 'StoreService');

    // ============================================================================
    // DATABASE QUERY: Fetch from Supabase with mandatory store isolation
    // ============================================================================
    try {
      // Initialize Supabase client for this operation
      const supabase = getSupabaseClient();
      
      // Create isolated query with mandatory store_id filter
      const { data, error } = await supabase
        .from('store_configs')
        .select('*')
        .eq('store_id', storeId)
        .single();

      // ============================================================================
      // GUARD CLAUSE: Handle database errors
      // ============================================================================
      if (error) {
        this.handleDatabaseError(error, 'StoreService', 'getConfig');
      }

      // ============================================================================
      // GUARD CLAUSE: Check if data exists (defensive programming)
      // ============================================================================
      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Store configuration not found for storeId: ${storeId}`,
          cause: 'STORE_NOT_FOUND', // Centralized error shape
        });
      }

      // ============================================================================
      // HAPPY PATH: Map database row to StoreConfig and return
      // ============================================================================
      return mapDatabaseRowToStoreConfig(data);
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'StoreService', 'getConfig');
    }
  }

  /**
   * Update store configuration
   * 
   * Implementation follows defensive coding principles:
   * 1. Guard Clause: Validate storeId is provided
   * 2. Guard Clause: Validate input data is provided
   * 3. Guard Clause: Ensure storeId matches authenticated storeId
   * 4. Database Operation: Upsert to Supabase (creates if not exists)
   * 5. Happy Path: Return updated configuration
   * 
   * Phase D, Step 3: Supabase-Only Implementation
   * - Updates data exclusively in Supabase
   * - No Redis operations
   * - Uses upsert for create-or-update semantics
   * 
   * @param storeId - UUID of the store (authenticated)
   * @param input - Validated store configuration (already validated by Zod)
   * @returns Updated store configuration from Supabase
   * @throws {TRPCError} BAD_REQUEST if storeId or input is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR for database errors
   */
  async updateConfig(
    storeId: string,
    input: Partial<StoreConfig>
  ): Promise<StoreConfig> {
    // ============================================================================
    // GUARD CLAUSES: Input validation and service state
    // ============================================================================
    
    // Guard clause: Validate storeId and ensure service is initialized
    this.validateStoreId(storeId, 'StoreService');

    // Guard clause: Validate input data is provided
    if (!input || Object.keys(input).length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Configuration data is required',
        cause: 'MISSING_CONFIG_DATA',
      });
    }

    // Guard clause: Ensure storeId in input matches authenticated storeId
    if (input.storeId && input.storeId !== storeId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Store ID mismatch: authenticated storeId does not match input storeId',
        cause: 'STORE_ID_MISMATCH',
      });
    }

    // ============================================================================
    // DATABASE OPERATION: Upsert to Supabase with mandatory store isolation
    // ============================================================================
    try {
      const supabase = getSupabaseClient();

      // Map input to database row structure
      const updateData = mapStoreConfigToDatabaseRow({
        ...input,
        storeId, // Ensure storeId is always set to authenticated value
      });

      // TODO: Fix type issues with upsert
      const { data, error } = await (supabase as any)
        .from('store_configs')
        .upsert(updateData, {
          onConflict: 'store_id', // Update if store_id already exists
        })
        .select()
        .single();

      // ============================================================================
      // GUARD CLAUSE: Handle database errors
      // ============================================================================
      if (error) {
        this.handleDatabaseError(error, 'StoreService', 'updateConfig');
      }

      if (!data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database update succeeded but returned no data',
          cause: 'MISSING_RESPONSE_DATA',
        });
      }

      // ============================================================================
      // HAPPY PATH: Map and return updated configuration
      // ============================================================================
      return mapDatabaseRowToStoreConfig(data);
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      this.handleDatabaseError(error, 'StoreService', 'updateConfig');
    }
  }

  /**
   * Create a new store configuration
   * 
   * Phase D, Step 3: Supabase-Only Implementation
   * - Creates configuration exclusively in Supabase
   * - No Redis operations
   * - Returns centralized error if store already exists
   * 
   * @param storeId - UUID of the store
   * @param input - Complete store configuration
   * @returns Created store configuration from Supabase
   * @throws {TRPCError} BAD_REQUEST if storeId or input is invalid
   * @throws {TRPCError} CONFLICT if store already exists
   * @throws {TRPCError} INTERNAL_SERVER_ERROR for database errors
   */
  async createConfig(
    storeId: string,
    input: Omit<StoreConfig, 'storeId' | 'createdAt' | 'updatedAt'>
  ): Promise<StoreConfig> {
    // GUARD CLAUSE 1: Validate storeId
    if (!storeId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Store ID is required',
        cause: 'MISSING_STORE_ID',
      });
    }

    // DATABASE OPERATION: Insert new configuration
    const supabase = getSupabaseClient();

    const newConfigData = mapStoreConfigToDatabaseRow({
      ...input,
      storeId,
    } as StoreConfig);

    // TODO: Fix type issues with insert
    const { data, error } = await (supabase as any)
      .from('store_configs')
      .insert(newConfigData)
      .select()
      .single();

    // GUARD CLAUSE 2: Handle database errors
    if (error) {
      // PostgreSQL unique constraint violation (23505)
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Store configuration already exists for storeId: ${storeId}`,
          cause: 'STORE_ALREADY_EXISTS',
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create store configuration in database',
        cause: error,
      });
    }

    if (!data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database insert succeeded but returned no data',
        cause: 'MISSING_RESPONSE_DATA',
      });
    }

    // HAPPY PATH: Map and return created configuration
    return mapDatabaseRowToStoreConfig(data);
  }

  /**
   * Delete store configuration
   * 
   * Phase D, Step 3: Supabase-Only Implementation
   * - Deletes configuration exclusively from Supabase
   * - No Redis operations
   * - Returns centralized STORE_NOT_FOUND error if not exists
   * 
   * @param storeId - UUID of the store
   * @returns Success message
   * @throws {TRPCError} BAD_REQUEST if storeId is invalid
   * @throws {TRPCError} NOT_FOUND if store doesn't exist (STORE_NOT_FOUND)
   * @throws {TRPCError} INTERNAL_SERVER_ERROR for database errors
   */
  async deleteConfig(storeId: string): Promise<{ success: boolean; message: string }> {
    // GUARD CLAUSE 1: Validate storeId
    if (!storeId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Store ID is required',
        cause: 'MISSING_STORE_ID',
      });
    }

    // DATABASE OPERATION: Delete from Supabase
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('store_configs')
      .delete()
      .eq('store_id', storeId)
      .select();

    // GUARD CLAUSE 2: Handle database errors
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete store configuration from database',
        cause: error,
      });
    }

    // GUARD CLAUSE 3: Check if store existed (no rows deleted means not found)
    if (!data || data.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Store configuration not found for storeId: ${storeId}`,
        cause: 'STORE_NOT_FOUND', // Centralized error shape
      });
    }

    // HAPPY PATH: Return success message
    return {
      success: true,
      message: `Store configuration deleted for storeId: ${storeId}`,
    };
  }
}

/**
 * Singleton instance of StoreService
 * Export for use in tRPC routers
 */
export const storeService = new StoreService();

