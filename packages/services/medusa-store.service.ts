/**
 * Medusa Store Creation Service
 * 
 * Provides a functional service utility for creating Medusa stores using
 * the recommended workflow pattern. This service bridges the validated
 * input from Phase 1 with Medusa's core workflows.
 * 
 * Architecture:
 * - Functional/declarative programming (no classes)
 * - Uses Medusa's createStoresWorkflow from core-flows
 * - Accepts validated Zod-inferred types
 * - Returns created store with unique prefixed ID ("store_...")
 * 
 * Purpose:
 * - Create Medusa stores with proper validation
 * - Generate unique store IDs for multi-tenancy
 * - Handle metadata mapping for external systems
 * - Provide type-safe store creation interface
 * 
 * Integration:
 * @see packages/shared/schemas/medusa-store.interface.ts - Input types
 * @see @medusajs/medusa/core-flows - Medusa workflows
 * 
 * @module medusa-store.service
 */

import { createWorkflow, createStep, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { Modules } from '@medusajs/framework/utils';
import type { 
  MedusaStoreCreateInputInferred,
  MedusaStoreCurrency 
} from '@/packages/shared/schemas/medusa-store.interface';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Medusa Store Object
 * 
 * Represents a Medusa store as returned by the Store Module.
 * The store ID is prefixed with "store_" and serves as the primary
 * identifier for all multi-tenancy operations.
 */
export interface MedusaStore {
  /**
   * Unique Store ID
   * 
   * Prefixed with "store_" (e.g., "store_01HQWE...")
   * This ID serves as the primary storeid scope identifier for
   * all subsequent multi-tenancy operations.
   */
  id: string;

  /**
   * Store Name
   */
  name: string;

  /**
   * Supported Currencies
   * 
   * Array of currency configurations with default flag
   */
  supported_currencies?: MedusaStoreCurrency[];

  /**
   * Default Sales Channel ID
   */
  default_sales_channel_id?: string | null;

  /**
   * Default Region ID
   */
  default_region_id?: string | null;

  /**
   * Default Location ID
   */
  default_location_id?: string | null;

  /**
   * Custom Metadata
   * 
   * Holds external system identifiers and mapping data
   */
  metadata?: Record<string, unknown> | null;

  /**
   * Creation Timestamp
   */
  created_at?: string;

  /**
   * Update Timestamp
   */
  updated_at?: string;
}

/**
 * Store Creation Result
 * 
 * Wrapper for the store creation result with success status
 */
export interface StoreCreationResult {
  success: boolean;
  store: MedusaStore;
  message: string;
}

/**
 * Store Creation Error
 * 
 * Structured error information for failed store creation
 */
export interface StoreCreationError {
  success: false;
  error: string;
  details?: unknown;
}

// ============================================================================
// WORKFLOW STEPS
// ============================================================================

/**
 * Create Store Step
 * 
 * This step handles the actual store creation using the Medusa Store Module.
 * It follows Medusa's workflow pattern with:
 * - Forward execution (create store)
 * - Rollback logic (delete store on failure)
 * 
 * @param input - Validated store creation input
 * @param container - Medusa container for service resolution
 * @returns Store creation result
 */
const createStoreStep = createStep(
  'create-medusa-store',
  async (
    input: {
      name: string;
      supported_currencies: MedusaStoreCurrency[];
      metadata?: Record<string, unknown>;
      default_sales_channel_id?: string;
      default_region_id?: string;
      default_location_id?: string;
    },
    { container }
  ) => {
    // Resolve the Store Module service from Medusa container
    const storeModuleService = container.resolve(Modules.STORE);

    try {
      // Create the store using Medusa's Store Module
      const store = await storeModuleService.createStores({
        name: input.name,
        supported_currencies: input.supported_currencies,
        metadata: input.metadata || null,
        default_sales_channel_id: input.default_sales_channel_id,
        default_region_id: input.default_region_id,
        default_location_id: input.default_location_id,
      });

      // Return the created store with its ID for potential rollback
      return new StepResponse(
        {
          store,
          message: `Store "${store.name}" created successfully with ID: ${store.id}`,
        },
        store.id // Compensation data for rollback
      );
    } catch (error) {
      // Handle store creation errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create store: ${errorMessage}`);
    }
  },
  /**
   * Rollback/Compensation Logic
   * 
   * If the workflow fails after store creation, this function will be called
   * to delete the created store and maintain data consistency.
   * 
   * @param storeId - ID of the store to delete
   * @param container - Medusa container for service resolution
   */
  async (storeId: string | undefined, { container }) => {
    if (!storeId) {
      // No store was created, nothing to rollback
      return;
    }

    // Resolve the Store Module service
    const storeModuleService = container.resolve(Modules.STORE);

    try {
      // Delete the store to rollback the creation
      await storeModuleService.deleteStores([storeId]);
      console.log(`Rollback: Successfully deleted store ${storeId}`);
    } catch (error) {
      // Log rollback failure but don't throw to avoid masking original error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Rollback failed for store ${storeId}: ${errorMessage}`);
    }
  }
);

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

/**
 * Create Store Workflow
 * 
 * Main workflow for creating Medusa stores. This workflow:
 * - Validates input structure
 * - Creates store using Store Module
 * - Returns created store with unique ID
 * - Provides automatic rollback on failure
 * 
 * Workflow Composition:
 * 1. createStoreStep - Creates the store
 * 2. Returns store object with WorkflowResponse
 * 
 * @param input - Validated store creation input
 * @returns Workflow response with created store
 */
export const createMedusaStoreWorkflow = createWorkflow(
  'create-medusa-store-workflow',
  (input: {
    name: string;
    supported_currencies: MedusaStoreCurrency[];
    metadata?: Record<string, unknown>;
    default_sales_channel_id?: string;
    default_region_id?: string;
    default_location_id?: string;
  }) => {
    // Execute the store creation step
    const { store, message } = createStoreStep(input);

    // Return the created store as workflow response
    return new WorkflowResponse({
      success: true,
      store,
      message,
    });
  }
);

// ============================================================================
// SERVICE FUNCTIONS (FUNCTIONAL/DECLARATIVE)
// ============================================================================

/**
 * Create Store Workflow Runner
 * 
 * Main service function for creating Medusa stores using the workflow pattern.
 * This function is the primary entry point for store creation and follows
 * functional/declarative programming patterns (no classes).
 * 
 * Flow:
 * 1. Accept validated input (Zod-inferred type from Phase 1)
 * 2. Transform currencies to Medusa format
 * 3. Execute createMedusaStoreWorkflow
 * 4. Return created store with unique prefixed ID
 * 
 * Multi-Tenancy:
 * The returned store.id (prefixed "store_...") serves as the primary
 * storeid scope identifier for all subsequent multi-tenancy operations.
 * 
 * @param input - Validated store creation input (from MedusaStoreCreateInputSchema)
 * @param container - Medusa container for workflow execution
 * @returns Created Medusa store with unique ID
 * @throws Error if store creation fails
 * 
 * @example
 * ```typescript
 * import { createStoreWorkflowRunner } from '@/packages/services/medusa-store.service';
 * 
 * const store = await createStoreWorkflowRunner(
 *   {
 *     name: "Acme Store",
 *     currencies: ["USD", "EUR"],
 *     metadata: {
 *       tenantId: "123e4567-e89b-12d3-a456-426614174000",
 *       legacyExternalId: "shopify-store-12345"
 *     }
 *   },
 *   container
 * );
 * 
 * console.log(`Store created with ID: ${store.id}`);
 * // Output: "Store created with ID: store_01HQWE..."
 * ```
 */
export async function createStoreWorkflowRunner(
  input: MedusaStoreCreateInputInferred,
  container: any // MedusaContainer type from @medusajs/framework/types
): Promise<MedusaStore> {
  // ============================================================================
  // GUARD CLAUSE 1: Validate input object exists (Prompt 2.2)
  // ============================================================================
  if (!input) {
    throw new Error(
      'Store creation failed: Input object is required but was not provided. ' +
      'Please provide a valid store configuration object with name and currencies.'
    );
  }

  // ============================================================================
  // GUARD CLAUSE 2: Validate core parameter - name (Prompt 2.2)
  // ============================================================================
  if (!input.name || typeof input.name !== 'string') {
    throw new Error(
      'Store creation failed: Store name is required and must be a non-empty string. ' +
      'Received: ' + (input.name === undefined ? 'undefined' : typeof input.name)
    );
  }

  // Additional validation: name must not be empty or only whitespace
  if (input.name.trim().length === 0) {
    throw new Error(
      'Store creation failed: Store name cannot be empty or contain only whitespace. ' +
      'Please provide a meaningful store name.'
    );
  }

  // ============================================================================
  // GUARD CLAUSE 3: Validate currencies array (Prompt 2.2)
  // ============================================================================
  if (!input.currencies || !Array.isArray(input.currencies)) {
    throw new Error(
      'Store creation failed: Currencies must be provided as an array. ' +
      'Received: ' + (input.currencies === undefined ? 'undefined' : typeof input.currencies)
    );
  }

  if (input.currencies.length === 0) {
    throw new Error(
      'Store creation failed: At least one currency is required for the store. ' +
      'Please provide a valid currency code (e.g., "USD", "EUR").'
    );
  }

  // Validate each currency code is a string
  const invalidCurrencies = input.currencies.filter(
    (code) => typeof code !== 'string' || code.trim().length === 0
  );

  if (invalidCurrencies.length > 0) {
    throw new Error(
      'Store creation failed: All currency codes must be non-empty strings. ' +
      `Found ${invalidCurrencies.length} invalid currency code(s). ` +
      'Please provide valid ISO currency codes (e.g., "USD", "EUR", "GBP").'
    );
  }

  // ============================================================================
  // GUARD CLAUSE 4: Validate container (Prompt 2.2)
  // ============================================================================
  if (!container) {
    throw new Error(
      'Store creation failed: Medusa container is required but was not provided. ' +
      'The container is needed to resolve Medusa services. ' +
      'Please ensure the container is passed from the Medusa context.'
    );
  }

  // ============================================================================
  // TRANSFORM: Convert currencies to Medusa format
  // ============================================================================
  const supportedCurrencies: MedusaStoreCurrency[] = input.currencies.map(
    (code, index) => ({
      currency_code: code.toUpperCase(),
      is_default: index === 0, // First currency is default
    })
  );

  // ============================================================================
  // PREPARE: Build workflow input
  // ============================================================================
  const workflowInput = {
    name: input.name,
    supported_currencies: supportedCurrencies,
    metadata: input.metadata,
    default_sales_channel_id: input.default_sales_channel_id,
    default_region_id: input.default_region_id,
    default_location_id: input.default_location_id,
  };

  // ============================================================================
  // EXECUTE: Run the workflow (Prompt 2.2 - Enhanced Error Propagation)
  // ============================================================================
  try {
    // Attempt to execute the workflow
    const { result } = await createMedusaStoreWorkflow(container).run({
      input: workflowInput,
    });

    // ============================================================================
    // ERROR HANDLING: Validate workflow result structure (Prompt 2.2)
    // ============================================================================
    
    // Early return: Check if result exists
    if (!result) {
      throw new Error(
        'Store creation workflow failed: No result returned from workflow execution. ' +
        'This may indicate a critical issue with the Medusa Store Module. ' +
        'Please check your Medusa configuration and ensure all services are properly initialized.'
      );
    }

    // Early return: Check if workflow succeeded
    if (!result.success) {
      throw new Error(
        'Store creation workflow failed: Workflow reported unsuccessful execution. ' +
        'The store may not have been created. Please check the workflow logs for details.'
      );
    }

    // Early return: Check if store object exists
    if (!result.store) {
      throw new Error(
        'Store creation workflow failed: No store object returned in workflow result. ' +
        'The workflow executed but did not return a valid store. ' +
        'This may indicate an issue with the store creation step.'
      );
    }

    // ============================================================================
    // VALIDATION: Verify store ID format (Prompt 2.2)
    // ============================================================================
    
    // Early return: Check if store ID exists
    if (!result.store.id) {
      throw new Error(
        'Store creation workflow failed: Created store has no ID. ' +
        'The store was created but the ID is missing, which will prevent multi-tenancy operations. ' +
        'This is a critical error that should not occur in normal operation.'
      );
    }

    // Warn if store ID doesn't have expected prefix (non-critical)
    if (!result.store.id.startsWith('store_')) {
      console.warn(
        `[WARNING] Store ID format unexpected: "${result.store.id}" does not have "store_" prefix. ` +
        'This may cause issues with multi-tenancy operations. Expected format: "store_XXXXX".'
      );
    }

    // ============================================================================
    // SUCCESS: Return the created store
    // ============================================================================
    return result.store;

  } catch (error) {
    // ============================================================================
    // ERROR PROPAGATION: Wrap and re-throw with context (Prompt 2.2)
    // ============================================================================
    
    // Extract error message with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Check if this is already our custom error (avoid double-wrapping)
    if (errorMessage.startsWith('Store creation')) {
      // Already a user-friendly error, re-throw as-is
      throw error;
    }

    // Detect specific error types for better user guidance
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connection')) {
      throw new Error(
        'Store creation failed: Unable to connect to Medusa backend. ' +
        'Please ensure the Medusa server is running and accessible. ' +
        `Original error: ${errorMessage}`
      );
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      throw new Error(
        'Store creation failed: Authentication error with Medusa backend. ' +
        'Please check your API credentials and ensure you have permission to create stores. ' +
        `Original error: ${errorMessage}`
      );
    }

    if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
      throw new Error(
        'Store creation failed: A store with this name or identifier already exists. ' +
        'Please choose a different store name and try again. ' +
        `Original error: ${errorMessage}`
      );
    }

    // Generic workflow error with helpful context
    throw new Error(
      'Store creation workflow failed unexpectedly. ' +
      'The workflow encountered an error during execution and the store was not created. ' +
      `Error details: ${errorMessage}. ` +
      'Please check the input parameters and ensure the Medusa backend is properly configured.'
    );
  }
}

/**
 * Create Store with Validation
 * 
 * Convenience function that combines input validation with store creation.
 * This function accepts raw input, validates it, and creates the store.
 * 
 * @param input - Raw store creation input (will be validated)
 * @param container - Medusa container
 * @returns Created store or validation error
 * 
 * @example
 * ```typescript
 * const result = await createStoreWithValidation(
 *   {
 *     name: "Acme Store",
 *     currencies: ["usd", "eur"], // Will be uppercased
 *     metadata: { tenantId: "..." }
 *   },
 *   container
 * );
 * 
 * if (result.success) {
 *   console.log(`Store ID: ${result.store.id}`);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 */
export async function createStoreWithValidation(
  input: unknown,
  container: any
): Promise<StoreCreationResult | StoreCreationError> {
  try {
    // Import validation function (avoiding circular dependency)
    const { validateMedusaStoreCreateInput } = await import(
      '@/packages/shared/schemas/medusa-store.interface'
    );

    // Validate input
    const validationResult = validateMedusaStoreCreateInput(input);

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: validationResult.errors,
      };
    }

    // Create store with validated input
    const store = await createStoreWorkflowRunner(validationResult.data, container);

    return {
      success: true,
      store,
      message: `Store created successfully with ID: ${store.id}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      details: error,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract Store ID from Workflow Result
 * 
 * Utility function to safely extract the store ID from workflow results.
 * Useful for type-safe access to the store identifier.
 * 
 * @param result - Workflow execution result
 * @returns Store ID or null if not found
 */
export function extractStoreId(result: StoreCreationResult | MedusaStore): string | null {
  if ('store' in result && result.store?.id) {
    return result.store.id;
  }
  if ('id' in result && result.id) {
    return result.id;
  }
  return null;
}

/**
 * Validate Store ID Format
 * 
 * Checks if a store ID follows the expected "store_" prefix pattern.
 * 
 * @param storeId - Store ID to validate
 * @returns True if ID has correct format
 */
export function isValidStoreId(storeId: string): boolean {
  return typeof storeId === 'string' && storeId.startsWith('store_') && storeId.length > 6;
}

/**
 * Create Store Metadata Payload
 * 
 * Helper to create properly structured metadata for store creation.
 * Integrates with MedusaStoreMetadataSchema for type-safe metadata.
 * 
 * @param tenantId - Reech tenant UUID
 * @param legacyExternalId - Optional legacy system ID
 * @param additionalMetadata - Additional custom metadata
 * @returns Structured metadata object
 * 
 * @example
 * ```typescript
 * const metadata = createStoreMetadataPayload(
 *   "123e4567-e89b-12d3-a456-426614174000",
 *   "shopify-store-12345",
 *   { syncEnabled: false }
 * );
 * ```
 */
export function createStoreMetadataPayload(
  tenantId: string,
  legacyExternalId?: string,
  additionalMetadata?: Record<string, unknown>
): Record<string, unknown> {
  return {
    tenantId,
    ...(legacyExternalId && { legacyExternalId }),
    ...additionalMetadata,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default export: Main workflow runner function
 */
export default createStoreWorkflowRunner;

