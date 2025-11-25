/**
 * Store ID Translator Service
 * 
 * Handles bidirectional translation between:
 * - Reech Tenant IDs (UUID format: "123e4567-e89b-12d3-a456-426614174000")
 * - Medusa Store IDs (Medusa format: "store_01HQWE1234567890")
 * 
 * Architecture Philosophy:
 * - Reech platform uses UUIDs internally for all authorization and core operations
 * - Medusa commerce platform uses store_XXX format for e-commerce operations
 * - Both systems remain independent but communicate via metadata mapping
 * - Authorization ALWAYS uses UUID (via store_members table)
 * - Translation happens transparently at the middleware layer
 * 
 * Mapping Storage:
 * - Reech → Medusa: tenants.metadata.medusaStoreId (UUID → store_XXX)
 * - Medusa → Reech: Medusa store.metadata.tenantId (store_XXX → UUID)
 * 
 * Benefits:
 * - ✅ Clients can use EITHER ID format
 * - ✅ Internal systems remain consistent (UUID-based)
 * - ✅ External Medusa integration works seamlessly
 * - ✅ Authorization layer is simplified (single UUID check)
 * - ✅ Future-proof for additional external system mappings
 */

import { TRPCError } from '@trpc/server';
import { getSupabaseClient } from '@/lib/supabase-server';

/**
 * Normalized Store IDs Result
 * 
 * Contains both ID formats after normalization:
 * - reechTenantId: Always present (UUID) - used for authorization
 * - medusaStoreId: Optional (store_XXX) - used for commerce operations
 */
export interface NormalizedStoreIds {
  /** Reech Tenant UUID - always present, used for authorization */
  reechTenantId: string;
  
  /** Medusa Store ID (store_XXX format) - may be null if no Medusa mapping exists */
  medusaStoreId: string | null;
}

/**
 * Store ID Translator Service Class
 * 
 * Singleton service that handles all store ID translation operations
 */
export class StoreIdTranslatorService {
  /**
   * Translate Reech UUID → Medusa Store ID
   * 
   * Looks up the Medusa Store ID associated with a Reech tenant UUID
   * via the tenants.metadata.medusaStoreId field.
   * 
   * @param reechTenantId - UUID from Reech platform (e.g., "123e4567-e89b-12d3-a456-426614174000")
   * @returns Medusa Store ID (e.g., "store_01HQWE1234567890")
   * @throws {TRPCError} BAD_REQUEST if UUID format is invalid
   * @throws {TRPCError} NOT_FOUND if tenant doesn't exist or has no Medusa mapping
   * 
   * @example
   * const medusaId = await translator.reechToMedusa("123e4567-...");
   * // Returns: "store_01HQWE1234567890"
   */
  async reechToMedusa(reechTenantId: string): Promise<string> {
    // GUARD CLAUSE 1: Validate UUID format
    if (!this.isValidUUID(reechTenantId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Reech tenant ID format (must be UUID)',
        cause: 'INVALID_UUID_FORMAT',
      });
    }

    const supabase = getSupabaseClient();
    
    // GUARD CLAUSE 2: Query tenants table for Medusa Store ID in metadata
    const { data, error } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', reechTenantId)
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No tenant found with ID: ${reechTenantId}`,
        cause: 'TENANT_NOT_FOUND',
      });
    }

    // GUARD CLAUSE 3: Check if Medusa mapping exists
    const medusaStoreId = data.metadata?.medusaStoreId;

    if (!medusaStoreId || typeof medusaStoreId !== 'string') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Tenant ${reechTenantId} has no linked Medusa store`,
        cause: 'NO_MEDUSA_MAPPING',
      });
    }

    // HAPPY PATH: Return Medusa Store ID
    return medusaStoreId;
  }

  /**
   * Translate Medusa Store ID → Reech UUID
   * 
   * Performs reverse lookup to find the Reech tenant UUID associated with
   * a Medusa Store ID by querying tenants where metadata contains the Medusa ID.
   * 
   * @param medusaStoreId - Medusa Store ID (e.g., "store_01HQWE1234567890")
   * @returns Reech Tenant UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")
   * @throws {TRPCError} BAD_REQUEST if Medusa format is invalid
   * @throws {TRPCError} NOT_FOUND if no Reech tenant is linked to this Medusa store
   * 
   * @example
   * const reechId = await translator.medusaToReech("store_01HQWE...");
   * // Returns: "123e4567-e89b-12d3-a456-426614174000"
   */
  async medusaToReech(medusaStoreId: string): Promise<string> {
    // GUARD CLAUSE 1: Validate Medusa Store ID format
    if (!this.isValidMedusaStoreId(medusaStoreId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Medusa Store ID format (must be store_XXX)',
        cause: 'INVALID_MEDUSA_FORMAT',
      });
    }

    const supabase = getSupabaseClient();
    
    // GUARD CLAUSE 2: Query tenants table where metadata contains this Medusa ID
    // Note: This uses JSONB containment operator (@>)
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .contains('metadata', { medusaStoreId })
      .maybeSingle();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database error during Medusa→Reech lookup',
        cause: error,
      });
    }

    // GUARD CLAUSE 3: Check if mapping was found
    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No Reech tenant linked to Medusa store: ${medusaStoreId}`,
        cause: 'NO_REECH_MAPPING',
      });
    }

    // HAPPY PATH: Return Reech Tenant UUID
    return data.id;
  }

  /**
   * Normalize and Validate Store ID (Key Middleware Function)
   * 
   * This is the primary function used by middleware to:
   * 1. Accept EITHER UUID or Medusa Store ID format
   * 2. Normalize to internal UUID for authorization
   * 3. Validate user has access to the store
   * 4. Return both IDs for downstream use
   * 
   * Flow:
   * - If UUID provided → Use directly, optionally lookup Medusa ID
   * - If Medusa ID provided → Translate to UUID, keep Medusa ID
   * - Always authorize using UUID against store_members table
   * 
   * @param storeIdFromHeader - ID from x-store-id header (either format)
   * @param userId - Authenticated user's UUID
   * @returns Normalized IDs object with both reechTenantId and medusaStoreId
   * @throws {TRPCError} BAD_REQUEST if format is invalid
   * @throws {TRPCError} FORBIDDEN if user doesn't have access
   * @throws {TRPCError} NOT_FOUND if store doesn't exist
   * 
   * @example
   * // Client sends UUID
   * const ids = await translator.normalizeAndValidate("123e4567-...", userId);
   * // Returns: { reechTenantId: "123e4567-...", medusaStoreId: "store_01HQWE..." }
   * 
   * // Client sends Medusa ID
   * const ids = await translator.normalizeAndValidate("store_01HQWE...", userId);
   * // Returns: { reechTenantId: "123e4567-...", medusaStoreId: "store_01HQWE..." }
   */
  async normalizeAndValidate(
    storeIdFromHeader: string,
    userId: string
  ): Promise<NormalizedStoreIds> {
    let reechTenantId: string;
    let medusaStoreId: string | null = null;

    // ========================================================================
    // STEP 1: Detect format and translate to UUID
    // ========================================================================
    
    if (this.isValidUUID(storeIdFromHeader)) {
      // Scenario A: Client sent Reech UUID (internal operations)
      reechTenantId = storeIdFromHeader;
      
      // Try to get Medusa ID if mapping exists (optional)
      // This is useful if downstream code needs to make Medusa API calls
      try {
        medusaStoreId = await this.reechToMedusa(reechTenantId);
      } catch (error) {
        // No Medusa mapping - that's okay for pure Reech operations
        // Many tenants may not have Medusa stores linked
        medusaStoreId = null;
      }
      
    } else if (this.isValidMedusaStoreId(storeIdFromHeader)) {
      // Scenario B: Client sent Medusa Store ID (commerce operations)
      medusaStoreId = storeIdFromHeader;
      
      // Translate to Reech UUID (required for authorization)
      reechTenantId = await this.medusaToReech(medusaStoreId);
      
    } else {
      // Scenario C: Invalid format
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 
          'Invalid store ID format. Must be either:\n' +
          '  - UUID format: "123e4567-e89b-12d3-a456-426614174000"\n' +
          '  - Medusa format: "store_01HQWE1234567890"',
        cause: 'INVALID_STORE_ID_FORMAT',
      });
    }

    // ========================================================================
    // STEP 2: Authorize user access using UUID
    // ========================================================================
    // Authorization ALWAYS uses UUID via store_members table
    // This ensures consistent security regardless of which ID format client used
    
    const supabase = getSupabaseClient();
    const { data: hasAccess, error } = await supabase
      .rpc('has_store_access', {
        p_user_id: userId,
        p_store_id: reechTenantId, // Always UUID
      });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check store access',
        cause: error,
      });
    }

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `User does not have access to store`,
        cause: 'STORE_ACCESS_DENIED',
      });
    }

    // ========================================================================
    // HAPPY PATH: Return normalized IDs
    // ========================================================================
    return {
      reechTenantId,
      medusaStoreId,
    };
  }

  /**
   * Create Bidirectional Mapping
   * 
   * Links a Reech tenant to a Medusa store by storing the mapping in metadata.
   * This creates the bridge that enables translation in both directions.
   * 
   * @param reechTenantId - Reech Tenant UUID
   * @param medusaStoreId - Medusa Store ID (store_XXX format)
   * @throws {TRPCError} if mapping creation fails
   * 
   * @example
   * await translator.createMapping(
   *   "123e4567-e89b-12d3-a456-426614174000",
   *   "store_01HQWE1234567890"
   * );
   */
  async createMapping(reechTenantId: string, medusaStoreId: string): Promise<void> {
    // GUARD CLAUSE 1: Validate formats
    if (!this.isValidUUID(reechTenantId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Reech tenant ID format',
      });
    }

    if (!this.isValidMedusaStoreId(medusaStoreId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Medusa Store ID format',
      });
    }

    const supabase = getSupabaseClient();

    // Update Reech tenant metadata with Medusa store ID
    const { error } = await supabase
      .from('tenants')
      .update({
        metadata: {
          medusaStoreId: medusaStoreId,
          linkedAt: new Date().toISOString(),
        }
      })
      .eq('id', reechTenantId);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create store ID mapping',
        cause: error,
      });
    }

    // TODO: Also update Medusa store.metadata.tenantId via Medusa SDK
    // This creates the reverse mapping for bidirectional synchronization
    // Example:
    // await medusaAdminClient.stores.update(medusaStoreId, {
    //   metadata: { tenantId: reechTenantId }
    // });
  }

  /**
   * Remove Mapping
   * 
   * Removes the link between a Reech tenant and Medusa store.
   * 
   * @param reechTenantId - Reech Tenant UUID
   */
  async removeMapping(reechTenantId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('tenants')
      .update({
        metadata: {
          medusaStoreId: null,
          unlinkedAt: new Date().toISOString(),
        }
      })
      .eq('id', reechTenantId);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove store ID mapping',
        cause: error,
      });
    }
  }

  // ========================================================================
  // VALIDATION HELPERS
  // ========================================================================

  /**
   * Check if string is a valid UUID (v4)
   * 
   * @param id - String to validate
   * @returns true if valid UUID format
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Check if string is a valid Medusa Store ID
   * 
   * Format: "store_" prefix followed by alphanumeric characters
   * 
   * @param id - String to validate
   * @returns true if valid Medusa Store ID format
   */
  private isValidMedusaStoreId(id: string): boolean {
    const medusaRegex = /^store_[a-zA-Z0-9]+$/;
    return medusaRegex.test(id);
  }

  /**
   * Get ID format type
   * 
   * @param id - Store ID string
   * @returns Format type: 'uuid', 'medusa', or 'unknown'
   */
  getFormat(id: string): 'uuid' | 'medusa' | 'unknown' {
    if (this.isValidUUID(id)) return 'uuid';
    if (this.isValidMedusaStoreId(id)) return 'medusa';
    return 'unknown';
  }
}

/**
 * Singleton instance of StoreIdTranslatorService
 * 
 * Export for use in middleware and other services
 */
export const storeIdTranslator = new StoreIdTranslatorService();



