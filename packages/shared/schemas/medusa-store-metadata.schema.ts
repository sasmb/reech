/**
 * Medusa Store Metadata Schema
 * 
 * Defines the structure for custom metadata stored in Medusa's store.metadata column.
 * This schema ensures type safety for mapping data between external systems and Medusa stores.
 * 
 * Purpose:
 * - Store legacy system identifiers for data migration and synchronization
 * - Maintain references to external systems (e.g., legacy e-commerce platforms)
 * - Enable bidirectional mapping between Reech tenant IDs and Medusa store IDs
 * - Provide extensible metadata storage for integration requirements
 * 
 * Usage:
 * ```typescript
 * import { MedusaStoreMetadataSchema, type IMedusaStoreMetadata } from '@/packages/shared/schemas/medusa-store-metadata.schema';
 * 
 * // Validate metadata before storing in Medusa
 * const metadata = MedusaStoreMetadataSchema.parse({
 *   legacyExternalId: "old-system-store-123",
 *   tenantId: "123e4567-e89b-12d3-a456-426614174000",
 *   syncEnabled: true
 * });
 * ```
 */

import { z } from 'zod';

// ============================================================================
// MEDUSA STORE METADATA SCHEMA
// ============================================================================

/**
 * Medusa Store Metadata Schema
 * 
 * Represents the structure of custom data stored in Medusa's store.metadata column.
 * This schema is designed to be JSON-compatible and stored as JSONB in the database.
 * 
 * Core Fields:
 * - legacyExternalId: Identifier from legacy/external systems for migration tracking
 * - tenantId: Reech tenant UUID for bidirectional mapping
 * - syncEnabled: Flag to control data synchronization
 * - externalSystemName: Name of the external system (e.g., "Shopify", "WooCommerce")
 * - lastSyncedAt: ISO timestamp of last successful sync
 * - customData: Flexible storage for additional integration-specific data
 * 
 * JSON Compatibility:
 * - All fields are optional to support gradual migration
 * - Uses standard JSON-compatible types (string, boolean, number, object)
 * - Nested objects are allowed via z.record() for flexibility
 * - ISO 8601 datetime strings for timestamps
 */
export const MedusaStoreMetadataSchema = z.object({
  /**
   * Legacy External ID
   * 
   * Identifier from legacy or external systems used for mapping during migration.
   * This field is critical for maintaining references during data migration from
   * existing e-commerce platforms or legacy systems.
   * 
   * Examples:
   * - "shopify-store-12345"
   * - "woocommerce-site-abc"
   * - "legacy-erp-store-999"
   * 
   * @optional
   */
  legacyExternalId: z.string().optional(),

  /**
   * Reech Tenant ID
   * 
   * UUID of the associated Reech tenant (from tenants table).
   * Enables bidirectional mapping between Medusa stores and Reech tenants.
   * 
   * This field creates the critical link:
   * Medusa Store (store.metadata.tenantId) ↔ Reech Tenant (tenants.id)
   * 
   * @optional - May not be set immediately during initial Medusa store creation
   */
  tenantId: z.string().uuid('Tenant ID must be a valid UUID').optional(),

  /**
   * External System Name
   * 
   * Name of the external system this store was migrated from or syncs with.
   * Useful for tracking data provenance and integration sources.
   * 
   * Examples:
   * - "Shopify"
   * - "WooCommerce"
   * - "Magento"
   * - "Custom Legacy System"
   * 
   * @optional
   */
  externalSystemName: z.string().min(1, 'External system name cannot be empty').optional(),

  /**
   * Sync Enabled Flag
   * 
   * Indicates whether bidirectional sync is enabled for this store.
   * When true, changes in Medusa should propagate to external systems and vice versa.
   * 
   * Default: false (sync disabled by default for safety)
   * 
   * @optional
   */
  syncEnabled: z.boolean().default(false).optional(),

  /**
   * Last Synced At
   * 
   * ISO 8601 timestamp of the last successful synchronization with external systems.
   * Used for tracking sync status and detecting stale data.
   * 
   * Format: "2025-10-02T19:30:00.000Z"
   * 
   * @optional
   */
  lastSyncedAt: z.string().datetime('Last synced timestamp must be a valid ISO 8601 datetime').optional(),

  /**
   * Integration Version
   * 
   * Version of the integration or migration script that created/updated this metadata.
   * Useful for tracking schema evolution and migration compatibility.
   * 
   * Examples:
   * - "1.0.0"
   * - "2.1.3"
   * - "migration-v3"
   * 
   * @optional
   */
  integrationVersion: z.string().optional(),

  /**
   * Custom Data
   * 
   * Flexible storage for additional integration-specific data that doesn't fit
   * into the structured fields above. This allows for extensibility without
   * schema changes.
   * 
   * Examples:
   * - API credentials (encrypted)
   * - Integration-specific settings
   * - Feature flags
   * - Custom mapping rules
   * 
   * Note: Keep this minimal and prefer adding structured fields when possible
   * for better type safety and validation.
   * 
   * @optional
   */
  customData: z.record(z.string(), z.any()).optional(),

  /**
   * Notes
   * 
   * Human-readable notes about this store's metadata or migration status.
   * Useful for documentation and troubleshooting.
   * 
   * Examples:
   * - "Migrated from Shopify on 2025-10-01"
   * - "Requires manual data cleanup for product variants"
   * - "Legacy store - do not sync"
   * 
   * @optional
   */
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
}).strict(); // Use strict mode to prevent unknown keys

/**
 * TypeScript Interface for Medusa Store Metadata
 * 
 * Type-safe interface derived from the Zod schema.
 * Use this type for function parameters, return types, and variable declarations.
 * 
 * @example
 * ```typescript
 * function updateStoreMetadata(storeId: string, metadata: IMedusaStoreMetadata) {
 *   // metadata is fully typed and validated
 *   console.log(metadata.legacyExternalId);
 *   console.log(metadata.tenantId);
 * }
 * ```
 */
export type IMedusaStoreMetadata = z.infer<typeof MedusaStoreMetadataSchema>;

// ============================================================================
// PARTIAL SCHEMAS FOR UPDATES
// ============================================================================

/**
 * Partial Medusa Store Metadata Schema
 * 
 * For update operations where only specific fields need to be modified.
 * All fields are optional, allowing partial updates.
 * 
 * @example
 * ```typescript
 * const partialUpdate: Partial<IMedusaStoreMetadata> = {
 *   syncEnabled: false,
 *   lastSyncedAt: new Date().toISOString()
 * };
 * ```
 */
export const PartialMedusaStoreMetadataSchema = MedusaStoreMetadataSchema.partial();

/**
 * TypeScript type for partial metadata updates
 */
export type IPartialMedusaStoreMetadata = z.infer<typeof PartialMedusaStoreMetadataSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate Medusa Store Metadata
 * 
 * Validates metadata against the schema and returns a result with detailed errors.
 * 
 * @param data - Metadata to validate
 * @returns Validation result with success flag, data, or errors
 * 
 * @example
 * ```typescript
 * const result = validateMedusaStoreMetadata({
 *   legacyExternalId: "old-store-123",
 *   tenantId: "not-a-uuid" // Invalid!
 * });
 * 
 * if (result.success) {
 *   console.log("Valid metadata:", result.data);
 * } else {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export function validateMedusaStoreMetadata(data: unknown) {
  const result = MedusaStoreMetadataSchema.safeParse(data);
  
  if (result.success) {
    return {
      success: true as const,
      data: result.data,
      errors: null,
    };
  }

  return {
    success: false as const,
    data: null,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

/**
 * Create Empty Medusa Store Metadata
 * 
 * Helper function to create a valid empty metadata object.
 * Useful for initializing new Medusa stores without legacy data.
 * 
 * @returns Empty but valid metadata object
 * 
 * @example
 * ```typescript
 * const newStoreMetadata = createEmptyMedusaStoreMetadata();
 * // Returns: { syncEnabled: false }
 * ```
 */
export function createEmptyMedusaStoreMetadata(): IMedusaStoreMetadata {
  return {
    syncEnabled: false,
  };
}

/**
 * Create Medusa Store Metadata with Tenant Mapping
 * 
 * Helper function to create metadata with tenant ID mapping.
 * This is the most common use case when linking Medusa stores to Reech tenants.
 * 
 * @param tenantId - Reech tenant UUID
 * @param legacyExternalId - Optional legacy system identifier
 * @returns Validated metadata object
 * 
 * @example
 * ```typescript
 * const metadata = createMedusaStoreMetadataWithTenant(
 *   "123e4567-e89b-12d3-a456-426614174000",
 *   "old-store-456"
 * );
 * ```
 */
export function createMedusaStoreMetadataWithTenant(
  tenantId: string,
  legacyExternalId?: string
): IMedusaStoreMetadata {
  const metadata: IMedusaStoreMetadata = {
    tenantId,
    syncEnabled: false,
  };

  if (legacyExternalId) {
    metadata.legacyExternalId = legacyExternalId;
  }

  // Validate before returning
  const result = MedusaStoreMetadataSchema.parse(metadata);
  return result;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type Guard: Check if metadata has tenant ID
 * 
 * Narrows the type to include a guaranteed tenantId field.
 * 
 * @param metadata - Metadata to check
 * @returns True if metadata has a valid tenant ID
 * 
 * @example
 * ```typescript
 * if (hasTenantId(metadata)) {
 *   // TypeScript knows metadata.tenantId is defined
 *   console.log(metadata.tenantId.toUpperCase());
 * }
 * ```
 */
export function hasTenantId(
  metadata: IMedusaStoreMetadata
): metadata is IMedusaStoreMetadata & { tenantId: string } {
  return typeof metadata.tenantId === 'string' && metadata.tenantId.length > 0;
}

/**
 * Type Guard: Check if metadata has legacy external ID
 * 
 * Narrows the type to include a guaranteed legacyExternalId field.
 * 
 * @param metadata - Metadata to check
 * @returns True if metadata has a legacy external ID
 */
export function hasLegacyExternalId(
  metadata: IMedusaStoreMetadata
): metadata is IMedusaStoreMetadata & { legacyExternalId: string } {
  return typeof metadata.legacyExternalId === 'string' && metadata.legacyExternalId.length > 0;
}

/**
 * Type Guard: Check if sync is enabled
 * 
 * @param metadata - Metadata to check
 * @returns True if sync is explicitly enabled
 */
export function isSyncEnabled(metadata: IMedusaStoreMetadata): boolean {
  return metadata.syncEnabled === true;
}

// ============================================================================
// EXPORT DEFAULT SCHEMA
// ============================================================================

export default MedusaStoreMetadataSchema;

