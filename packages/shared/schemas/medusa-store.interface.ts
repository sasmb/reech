/**
 * Medusa Store Creation Interface & Schema
 * 
 * Defines the TypeScript interfaces and Zod schemas for creating Medusa stores.
 * This file establishes the data contract for Medusa Store Module interactions,
 * ensuring type safety and runtime validation.
 * 
 * Purpose:
 * - Provide type-safe interfaces for Medusa store creation
 * - Validate store creation input at runtime with Zod
 * - Support metadata mapping for external system integration
 * - Enable currency configuration for multi-currency stores
 * 
 * Integration:
 * - Uses Medusa Store Module's createStores API
 * - Integrates with MedusaStoreMetadataSchema for metadata validation
 * - Follows Medusa's supported_currencies pattern
 * 
 * Documentation Reference:
 * @see https://docs.medusajs.com/resources/references/store/IStoreModuleService
 */

import { z } from 'zod';
import { MedusaStoreMetadataSchema, type IMedusaStoreMetadata } from './medusa-store-metadata.schema';

// ============================================================================
// TYPESCRIPT INTERFACES (Preferred for Object Shapes)
// ============================================================================

/**
 * Medusa Store Creation Input Interface
 * 
 * Defines the foundational structure for creating a Medusa store.
 * This interface follows Medusa's Store Module conventions and includes
 * all necessary fields for store initialization.
 * 
 * Convention: Prefer interfaces over types for object shapes
 * 
 * Required Fields:
 * - name: Store display name
 * - currencies: Array of 3-letter ISO 4217 currency codes
 * 
 * Optional Fields:
 * - metadata: Custom key-value data for external system mapping
 * - default_sales_channel_id: Default sales channel for the store
 * - default_region_id: Default region for the store
 * - default_location_id: Default stock location for the store
 * 
 * Usage:
 * ```typescript
 * const storeInput: MedusaStoreCreateInput = {
 *   name: "Acme Store",
 *   currencies: ["USD", "EUR", "GBP"],
 *   metadata: {
 *     tenantId: "123e4567-e89b-12d3-a456-426614174000",
 *     legacyExternalId: "shopify-store-12345"
 *   }
 * };
 * ```
 */
export interface MedusaStoreCreateInput {
  /**
   * Store Name
   * 
   * Display name for the Medusa store.
   * This will be shown in the admin panel and can be used in customer communications.
   * 
   * @example "Acme Store"
   * @example "My E-commerce Shop"
   */
  name: string;

  /**
   * Supported Currencies
   * 
   * Array of 3-letter ISO 4217 currency codes that the store will support.
   * At least one currency must be specified.
   * 
   * The first currency in the array will be set as the default currency.
   * 
   * @example ["USD", "EUR", "GBP"]
   * @example ["USD"]
   * 
   * @see https://en.wikipedia.org/wiki/ISO_4217
   */
  currencies: string[];

  /**
   * Metadata for External Mapping
   * 
   * Flexible key-value pairs to store custom data, including:
   * - External system identifiers (legacyExternalId)
   * - Reech tenant mapping (tenantId)
   * - Integration settings
   * - Custom business logic data
   * 
   * This fulfills the requirement for complex mapping or external identifiers.
   * 
   * For type-safe metadata, use IMedusaStoreMetadata from medusa-store-metadata.schema.ts
   * 
   * @example
   * ```typescript
   * {
   *   tenantId: "123e4567-e89b-12d3-a456-426614174000",
   *   legacyExternalId: "old-store-456",
   *   externalSystemName: "Shopify"
   * }
   * ```
   */
  metadata?: Record<string, unknown>;

  /**
   * Default Sales Channel ID
   * 
   * The ID of the default sales channel for this store.
   * If not provided, Medusa will create a default sales channel.
   * 
   * @optional
   */
  default_sales_channel_id?: string;

  /**
   * Default Region ID
   * 
   * The ID of the default region for this store.
   * Regions define shipping zones, payment providers, and tax settings.
   * 
   * @optional
   */
  default_region_id?: string;

  /**
   * Default Location ID
   * 
   * The ID of the default stock location for this store.
   * Stock locations are used for inventory management.
   * 
   * @optional
   */
  default_location_id?: string;
}

/**
 * Medusa Store Currency Configuration Interface
 * 
 * Defines the structure for currency configuration in Medusa stores.
 * This matches Medusa's supported_currencies relation pattern.
 * 
 * Convention: Prefer interfaces over types for object shapes
 */
export interface MedusaStoreCurrency {
  /**
   * Currency Code
   * 
   * 3-letter ISO 4217 currency code (e.g., "USD", "EUR", "GBP")
   * 
   * @example "USD"
   */
  currency_code: string;

  /**
   * Is Default Currency
   * 
   * Indicates if this is the default currency for the store.
   * Only one currency should be marked as default.
   * 
   * @default false
   */
  is_default: boolean;
}

/**
 * Medusa Store Creation Input with Typed Metadata
 * 
 * Extended version of MedusaStoreCreateInput with typed metadata using
 * IMedusaStoreMetadata for better type safety.
 * 
 * Use this interface when you want compile-time validation of metadata structure.
 */
export interface MedusaStoreCreateInputTyped extends Omit<MedusaStoreCreateInput, 'metadata'> {
  /**
   * Typed Metadata
   * 
   * Metadata that conforms to the IMedusaStoreMetadata schema.
   * Provides compile-time type checking for metadata fields.
   */
  metadata?: IMedusaStoreMetadata;
}

// ============================================================================
// ZOD SCHEMAS (Runtime Validation)
// ============================================================================

/**
 * Currency Code Schema
 * 
 * Validates 3-letter ISO 4217 currency codes.
 * Uses uppercase letters only.
 */
export const CurrencyCodeSchema = z.string()
  .length(3, 'Currency code must be exactly 3 characters')
  .regex(/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters (e.g., USD, EUR, GBP)')
  .describe('ISO 4217 currency code');

/**
 * Medusa Store Currency Schema
 * 
 * Validates the structure for currency configuration.
 * Matches Medusa's supported_currencies pattern.
 */
export const MedusaStoreCurrencySchema = z.object({
  currency_code: CurrencyCodeSchema,
  is_default: z.boolean().default(false),
}).strict();

/**
 * Medusa Store Creation Input Schema
 * 
 * Validates the complete store creation input payload.
 * Ensures all required fields are present and properly formatted.
 * 
 * Validation Rules:
 * - name: Non-empty string (1-255 characters)
 * - currencies: Array of valid ISO 4217 currency codes (at least one)
 * - metadata: Optional flexible key-value object
 * 
 * Usage:
 * ```typescript
 * const result = MedusaStoreCreateInputSchema.safeParse(input);
 * if (result.success) {
 *   // Create store with validated data
 *   await createMedusaStore(result.data);
 * }
 * ```
 */
export const MedusaStoreCreateInputSchema = z.object({
  /**
   * Store name
   * - Minimum 1 character
   * - Maximum 255 characters
   * - Cannot be only whitespace
   */
  name: z.string()
    .min(1, 'Store name is required')
    .max(255, 'Store name cannot exceed 255 characters')
    .regex(/\S/, 'Store name cannot be only whitespace')
    .describe('Store display name'),

  /**
   * Supported currencies
   * - At least one currency required
   * - Each must be a valid 3-letter ISO 4217 code
   * - Duplicates are allowed (Medusa handles deduplication)
   */
  currencies: z.array(CurrencyCodeSchema)
    .min(1, 'At least one currency is required')
    .describe('Array of ISO 4217 currency codes'),

  /**
   * Metadata for mapping
   * - Flexible key-value pairs
   * - Can store external identifiers, tenant mappings, etc.
   * - Optional field
   */
  metadata: z.record(z.string(), z.unknown())
    .optional()
    .describe('Custom metadata for external system mapping'),

  /**
   * Default sales channel ID
   * - Optional
   * - Must be a valid Medusa sales channel ID if provided
   */
  default_sales_channel_id: z.string()
    .optional()
    .describe('Default sales channel ID'),

  /**
   * Default region ID
   * - Optional
   * - Must be a valid Medusa region ID if provided
   */
  default_region_id: z.string()
    .optional()
    .describe('Default region ID'),

  /**
   * Default location ID
   * - Optional
   * - Must be a valid Medusa stock location ID if provided
   */
  default_location_id: z.string()
    .optional()
    .describe('Default stock location ID'),
}).strict();

/**
 * Medusa Store Creation Input Schema with Typed Metadata
 * 
 * Extended version that validates metadata against MedusaStoreMetadataSchema
 * for stricter type safety and validation.
 */
export const MedusaStoreCreateInputTypedSchema = MedusaStoreCreateInputSchema.extend({
  metadata: MedusaStoreMetadataSchema.optional(),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

/**
 * Inferred type from Zod schema (should match MedusaStoreCreateInput interface)
 */
export type MedusaStoreCreateInputInferred = z.infer<typeof MedusaStoreCreateInputSchema>;

/**
 * Inferred type for currency schema
 */
export type MedusaStoreCurrencyInferred = z.infer<typeof MedusaStoreCurrencySchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate Medusa Store Creation Input
 * 
 * Validates store creation input and returns detailed validation results.
 * 
 * @param data - Store creation input to validate
 * @returns Validation result with success flag, data, or errors
 * 
 * @example
 * ```typescript
 * const result = validateMedusaStoreCreateInput({
 *   name: "Acme Store",
 *   currencies: ["USD", "EUR"],
 *   metadata: { tenantId: "123e4567-e89b-12d3-a456-426614174000" }
 * });
 * 
 * if (result.success) {
 *   console.log("Valid store input:", result.data);
 * } else {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export function validateMedusaStoreCreateInput(data: unknown) {
  const result = MedusaStoreCreateInputSchema.safeParse(data);

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
 * Create Medusa Store Input with Defaults
 * 
 * Helper function to create a valid store creation input with sensible defaults.
 * 
 * @param name - Store name
 * @param currencies - Array of currency codes (defaults to ["USD"])
 * @param metadata - Optional metadata for external mapping
 * @returns Validated store creation input
 * 
 * @example
 * ```typescript
 * const storeInput = createMedusaStoreInput(
 *   "Acme Store",
 *   ["USD", "EUR"],
 *   {
 *     tenantId: "123e4567-e89b-12d3-a456-426614174000",
 *     legacyExternalId: "old-store-123"
 *   }
 * );
 * ```
 */
export function createMedusaStoreInput(
  name: string,
  currencies: string[] = ['USD'],
  metadata?: Record<string, unknown>
): MedusaStoreCreateInputInferred {
  // Build input object conditionally to avoid undefined values
  const input = {
    name,
    currencies: currencies.map(c => c.toUpperCase()), // Ensure uppercase
    ...(metadata && { metadata }), // Only add metadata if it exists
  };

  // Validate before returning - Zod will handle optional property types correctly
  const result = MedusaStoreCreateInputSchema.parse(input);
  return result;
}

/**
 * Convert Currencies Array to Medusa Currency Format
 * 
 * Converts a simple array of currency codes to Medusa's supported_currencies format.
 * The first currency in the array is marked as the default.
 * 
 * @param currencies - Array of ISO 4217 currency codes
 * @returns Array of MedusaStoreCurrency objects
 * 
 * @example
 * ```typescript
 * const currencies = convertToMedusaCurrencies(["USD", "EUR", "GBP"]);
 * // Returns:
 * // [
 * //   { currency_code: "USD", is_default: true },
 * //   { currency_code: "EUR", is_default: false },
 * //   { currency_code: "GBP", is_default: false }
 * // ]
 * ```
 */
export function convertToMedusaCurrencies(currencies: string[]): MedusaStoreCurrency[] {
  if (currencies.length === 0) {
    throw new Error('At least one currency is required');
  }

  return currencies.map((code, index) => ({
    currency_code: code.toUpperCase(),
    is_default: index === 0, // First currency is default
  }));
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type Guard: Check if input has metadata
 * 
 * @param input - Store creation input to check
 * @returns True if input has metadata
 */
export function hasMetadata(
  input: MedusaStoreCreateInput
): input is MedusaStoreCreateInput & { metadata: Record<string, unknown> } {
  return input.metadata !== undefined && Object.keys(input.metadata).length > 0;
}

/**
 * Type Guard: Check if input has typed metadata
 * 
 * @param input - Store creation input to check
 * @returns True if input has metadata conforming to IMedusaStoreMetadata
 */
export function hasTypedMetadata(
  input: MedusaStoreCreateInput
): input is MedusaStoreCreateInputTyped {
  if (!input.metadata) return false;

  const result = MedusaStoreMetadataSchema.safeParse(input.metadata);
  return result.success;
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export default MedusaStoreCreateInputSchema;

