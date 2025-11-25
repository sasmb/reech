/**
 * Shared Schemas - Centralized Data Definitions
 * 
 * This module serves as the single source of truth for all data schemas
 * used across the Reech SaaS application. All Zod schemas and TypeScript
 * types are exported from this centralized location to ensure consistency
 * between the API layer and frontend components.
 * 
 * @fileoverview Centralized schema definitions for multi-tenant SaaS application
 * @author Reech Development Team
 * @version 1.0.0
 */

// ============================================================================
// CORE TENANT SCHEMAS
// ============================================================================

/**
 * Tenant identification and context schemas
 * These schemas enforce the critical constraint that all operations
 * must be scoped to a specific tenant (storeId)
 */

// Re-export all schema modules for centralized access
export * from './tenant';
export * from './store-config';
export * from './user';
export * from './product';
export * from './order';
export * from './common';
export * from './medusa-store-metadata.schema';
export * from './medusa-store.interface';
export * from './product.schema';

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

/**
 * Utility functions for working with schemas across the application
 */

import { z } from 'zod';

/**
 * Creates a schema that requires a storeId for tenant isolation
 * This is a critical utility that ensures all data operations
 * include the mandatory tenant context
 */
export function createTenantScopedSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  return schema.extend({
    storeId: z.string().uuid('Invalid store ID format'),
  });
}

/**
 * Type helper for extracting TypeScript types from tenant-scoped schemas
 */
export type TenantScoped<T extends z.ZodType> = z.infer<T> & {
  storeId: string;
};

/**
 * Validation helper for ensuring storeId is present in all operations
 */
export function validateTenantContext(data: unknown): asserts data is { storeId: string } {
  if (!data || typeof data !== 'object' || !('storeId' in data)) {
    throw new Error('Tenant context (storeId) is required for all operations');
  }
  
  const storeId = (data as { storeId: unknown }).storeId;
  if (typeof storeId !== 'string' || storeId.length === 0) {
    throw new Error('storeId must be a non-empty string');
  }
}

/**
 * Schema for common pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

/**
 * Schema for common API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    meta: z.object({
      pagination: PaginationSchema.optional(),
      timestamp: z.string().datetime(),
      requestId: z.string().uuid(),
    }).optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    pagination?: PaginationParams;
    timestamp: string;
    requestId: string;
  };
};

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Development-only utilities for schema validation and testing
 */

/**
 * Validates that all exported schemas are properly defined
 * This helps catch schema definition errors early in development
 */
export function validateSchemaExports(): void {
  if (process.env['NODE_ENV'] !== 'development') {
    return;
  }
    const requiredSchemas = [
      'TenantSchema',
      'StoreConfigSchema', 
      'UserSchema',
      'ProductSchema',
      'OrderSchema',
    ];
    
    const missingSchemas = requiredSchemas.filter(
      schemaName => !(schemaName in exports)
    );
    
  if (missingSchemas.length > 0) {
    console.warn('Missing required schemas:', missingSchemas);
  }
}
