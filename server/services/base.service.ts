/**
 * Base Service Layer
 * 
 * Provides shared utilities and patterns for database query isolation.
 * All service classes should extend this base class to ensure consistent
 * multi-tenant data isolation.
 * 
 * Key Features:
 * - Mandatory storeid validation and injection
 * - Defensive coding patterns with guard clauses
 * - Centralized error handling and logging
 * - Query builder utilities for isolation
 * 
 * Architecture:
 * - Base class for all service implementations
 * - Shared isolation patterns and utilities
 * - Consistent error handling across services
 * 
 * Security:
 * - All queries MUST include storeid in WHERE clause
 * - Input validation with early returns
 * - Audit logging for security events
 * 
 * @module base.service
 */

import { TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
// Mock Database type for now
type Database = any;

/**
 * Store ID Validation Pattern
 * 
 * Validates Medusa Store ID format and provides consistent error handling.
 * Used across all service methods to ensure data isolation.
 */
export class StoreIdValidator {
  /**
   * Validate store ID format
   * 
   * @param storeId - Store ID to validate
   * @param context - Context for error messages (e.g., "ProductService")
   * @throws {TRPCError} BAD_REQUEST if store ID is invalid
   */
  static validate(storeId: string, context: string = 'Service'): void {
    // Guard clause: Check if storeId is provided
    if (!storeId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${context}: Store ID is required`,
        cause: 'MISSING_STORE_ID',
      });
    }

    // Guard clause: Validate store ID format (Medusa format)
    if (!storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${context}: Invalid store ID format. Expected format: store_[alphanumeric]`,
        cause: 'INVALID_STORE_ID_FORMAT',
      });
    }
  }

  /**
   * Validate and return store ID
   * 
   * @param storeId - Store ID to validate
   * @param context - Context for error messages
   * @returns Validated store ID
   * @throws {TRPCError} BAD_REQUEST if store ID is invalid
   */
  static validateAndReturn(storeId: string, context: string = 'Service'): string {
    this.validate(storeId, context);
    return storeId;
  }
}

/**
 * Query Isolation Utilities
 * 
 * Provides utilities for building isolated database queries.
 * Ensures all queries include mandatory storeid filtering.
 */
export class QueryIsolation {
  /**
   * Create base query with store isolation
   * 
   * @param supabase - Supabase client instance
   * @param table - Table name
   * @param storeId - Store ID for isolation
   * @param context - Context for error messages
   * @returns Base query with store_id filter applied
   */
  static createBaseQuery(
    supabase: ReturnType<typeof createClient<Database>>,
    table: string,
    storeId: string,
    context: string = 'QueryIsolation'
  ) {
    // Validate store ID before building query
    StoreIdValidator.validate(storeId, context);

    // Return query with mandatory store_id filter
    return supabase
      .from(table)
      .select('*')
      .eq('store_id', storeId);
  }

  /**
   * Create base query with store isolation and count
   * 
   * @param supabase - Supabase client instance
   * @param table - Table name
   * @param storeId - Store ID for isolation
   * @param context - Context for error messages
   * @returns Base query with store_id filter and count applied
   */
  static createBaseQueryWithCount(
    supabase: ReturnType<typeof createClient<Database>>,
    table: string,
    storeId: string,
    context: string = 'QueryIsolation'
  ) {
    // Validate store ID before building query
    StoreIdValidator.validate(storeId, context);

    // Return query with mandatory store_id filter and count
    return supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq('store_id', storeId);
  }

  /**
   * Merge client filters with store isolation
   * 
   * @param baseQuery - Base query with store isolation
   * @param filters - Client-provided filters
   * @returns Query with merged filters
   */
  static mergeFilters<T extends Record<string, any>>(
    baseQuery: any,
    filters: T
  ) {
    let query = baseQuery;

    // Apply each filter if provided
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array filters (e.g., category_ids)
          if (value.length > 0) {
            query = query.overlaps(key, value);
          }
        } else if (typeof value === 'string' && value.includes(',')) {
          // Handle comma-separated values
          const values = value.split(',').map(v => v.trim()).filter(v => v);
          if (values.length > 0) {
            query = query.overlaps(key, values);
          }
        } else {
          // Handle single value filters
          query = query.eq(key, value);
        }
      }
    });

    return query;
  }
}

/**
 * Base Service Class
 * 
 * Abstract base class that provides common patterns for all service implementations.
 * Ensures consistent multi-tenant data isolation across all services.
 */
export abstract class BaseService {
  protected supabase: ReturnType<typeof createClient<Database>> | null = null;

  /**
   * Initialize service with Supabase client
   * 
   * @param supabase - Supabase client instance
   */
  initialize(supabase: ReturnType<typeof createClient<Database>>): void {
    this.supabase = supabase;
  }

  /**
   * Guard clause: Check if service is initialized
   * 
   * @param context - Context for error messages
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if service is not initialized
   */
  protected ensureInitialized(context: string = 'BaseService'): void {
    if (!this.supabase) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `${context}: Service is not initialized. Call initialize() first.`,
        cause: 'SERVICE_NOT_INITIALIZED',
      });
    }
  }

  /**
   * Guard clause: Validate store ID and ensure service is initialized
   * 
   * @param storeId - Store ID to validate
   * @param context - Context for error messages
   * @returns Validated store ID
   * @throws {TRPCError} BAD_REQUEST if store ID is invalid
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if service is not initialized
   */
  protected validateStoreId(storeId: string, context: string = 'BaseService'): string {
    this.ensureInitialized(context);
    return StoreIdValidator.validateAndReturn(storeId, context);
  }

  /**
   * Create isolated query for table
   * 
   * @param table - Table name
   * @param storeId - Store ID for isolation
   * @param context - Context for error messages
   * @returns Base query with store isolation
   */
  protected createIsolatedQuery(
    table: string,
    storeId: string,
    context: string = 'BaseService'
  ) {
    this.ensureInitialized(context);
    return QueryIsolation.createBaseQuery(this.supabase!, table, storeId, context);
  }

  /**
   * Create isolated query with count for table
   * 
   * @param table - Table name
   * @param storeId - Store ID for isolation
   * @param context - Context for error messages
   * @returns Base query with store isolation and count
   */
  protected createIsolatedQueryWithCount(
    table: string,
    storeId: string,
    context: string = 'BaseService'
  ) {
    this.ensureInitialized(context);
    return QueryIsolation.createBaseQueryWithCount(this.supabase!, table, storeId, context);
  }

  /**
   * Apply filters to isolated query
   * 
   * @param baseQuery - Base query with store isolation
   * @param filters - Client-provided filters
   * @returns Query with merged filters
   */
  protected applyFilters<T extends Record<string, any>>(
    baseQuery: any,
    filters: T
  ) {
    return QueryIsolation.mergeFilters(baseQuery, filters);
  }

  /**
   * Handle database errors with consistent error handling
   * 
   * @param error - Database error
   * @param context - Context for error messages
   * @param operation - Operation being performed
   * @throws {TRPCError} Appropriate error based on error type
   */
  protected handleDatabaseError(
    error: any,
    context: string = 'BaseService',
    operation: string = 'database operation'
  ): never {
    console.error(`[${context}] Database error during ${operation}:`, error);

    // Handle specific error types
    if (error.code === 'PGRST116') {
      // No rows returned
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${context}: Resource not found`,
        cause: error,
      });
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new TRPCError({
        code: 'CONFLICT',
        message: `${context}: Resource already exists`,
        cause: error,
      });
    }

    if (error.code === '23503') {
      // Foreign key constraint violation
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${context}: Invalid reference`,
        cause: error,
      });
    }

    // Generic database error
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `${context}: Database error during ${operation}`,
      cause: error,
    });
  }
}

/**
 * Service Initialization Utility
 * 
 * Provides utilities for initializing services with proper error handling.
 */
export class ServiceInitializer {
  /**
   * Initialize service with Supabase client
   * 
   * @param service - Service instance to initialize
   * @param supabase - Supabase client instance
   * @param serviceName - Name of the service for error messages
   * @throws {TRPCError} INTERNAL_SERVER_ERROR if initialization fails
   */
  static initialize<T extends BaseService>(
    service: T,
    supabase: ReturnType<typeof createClient<Database>>,
    serviceName: string
  ): void {
    try {
      service.initialize(supabase);
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to initialize ${serviceName}`,
        cause: error,
      });
    }
  }
}
