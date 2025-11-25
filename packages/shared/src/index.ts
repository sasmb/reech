/**
 * @reech/shared - Shared Types, Schemas, and Utilities
 * 
 * This package contains all shared types, Zod schemas, and utilities
 * used across the Reech SaaS application. It serves as the single
 * source of truth for data validation and type definitions.
 * 
 * @fileoverview Main entry point for shared package
 * @author Reech Development Team
 * @version 1.0.0
 */

// ============================================================================
// SCHEMA EXPORTS
// ============================================================================

// Re-export all schemas for easy access
export * from '../schemas';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Re-export common utilities
export * from './utils/validation';
export * from './utils/formatting';
export * from './utils/constants';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Note: Some types in ./types overlap with schema-derived types
// We only re-export non-conflicting types to avoid ambiguity
// Import specific types directly from their modules when needed
export type {
  // API types (non-conflicting)
  ApiErrorResponse,
  PaginatedApiResponse,
  ApiRequestMeta,
  ValidationErrorResponse,
  SortParams,
  MultiSortParams,
  DateRangeFilter,
  NumericRangeFilter,
  TextSearchFilter,
  TenantScopedRequest,
  AuthContext,
  JwtPayload,
  MiddlewareContext,
  ErrorHandler,
  RateLimitInfo,
  CacheEntry,
  WebhookPayload,
  WebhookSignature,
  FileUploadMeta,
  ImageFileMeta,
} from './types/api';

export type {
  // Database types (non-conflicting)
  BaseEntity,
  TenantScopedEntity,
  SoftDeletableEntity,
  AuditableEntity,
  TenantEntity,
  StoreConfigEntity,
  UserEntity,
  UserPreferencesEntity,
  UserAddressEntity,
  ProductEntity,
  ProductVariantEntity,
  ProductOptionEntity,
  ProductImageEntity,
  ProductCategoryEntity,
  ProductTagEntity,
  InventoryEntity,
  OrderEntity,
  OrderLineItemEntity,
  OrderAddressEntity,
  OrderFulfillmentEntity,
  OrderTransactionEntity,
  QueryOptions,
  FilterOptions,
  TransactionOptions,
  MigrationOptions,
  OneToOneRelation,
  OneToManyRelation,
  ManyToManyRelation,
  DatabaseIndex,
  DatabaseConstraint,
} from './types/database';

export type {
  // Config types (non-conflicting)
  AppConfig,
  DatabaseConfig,
  RedisConfig,
  AuthConfig,
  EmailConfig,
  StorageConfig,
  PaymentConfig,
  AnalyticsConfig,
  MonitoringConfig,
  SecurityConfig,
  FeatureFlagsConfig,
  Config,
  EnvironmentVariables,
  ConfigValidationResult,
  ConfigLoaderOptions,
} from './types/config';

// ============================================================================
// PACKAGE METADATA
// ============================================================================

export const PACKAGE_VERSION = '1.0.0';
export const PACKAGE_NAME = '@reech/shared';

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Validates that all required exports are available
 */
export function validateExports(): void {
  if (process.env['NODE_ENV'] !== 'development') {
    return;
  }
    const requiredExports = [
      // Schema exports
      'TenantSchema',
      'StoreConfigSchema',
      'UserSchema',
      'ProductSchema',
      'OrderSchema',
      // Common utilities
      'createTenantScopedSchema',
      'validateTenantContext',
      'PaginationSchema',
      'ApiResponseSchema',
    ];
    
    const missingExports = requiredExports.filter(
      exportName => !(exportName in exports)
    );
    
    if (missingExports.length > 0) {
      console.warn('Missing required exports:', missingExports);
  } else {
    console.log('✅ All required exports are available');
  }
}
