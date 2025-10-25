/**
 * Store Router - Protected tRPC Procedures
 * 
 * This router bridges:
 * 1. Validated Canonical Schema (StoreConfigSchema from Step 1)
 * 2. Data Isolation Middleware (requireStore from Task 3)
 * 3. Service Layer (storeService business logic)
 * 
 * All procedures in this router are protected by the requireStore middleware,
 * ensuring that storeId is validated before any business logic executes.
 * 
 * Security Architecture:
 * Request → Middleware (requireStore) → Zod Validation → Service Layer → Database
 *           ↓
 *        Validates storeId (UUID)
 *           ↓
 *        Ensures tenant isolation
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { storeService } from '../services/store.service';
import { 
  StoreConfigSchema, 
  UpdateStoreConfigSchema,
  CreateStoreConfigSchema,
} from '@/packages/shared/schemas/store-config';

/**
 * Store Router
 * 
 * Provides CRUD operations for store configurations with:
 * - Tenant isolation (via requireStore middleware)
 * - Input validation (via Zod schemas)
 * - Business logic (via storeService)
 * 
 * All procedures require a valid x-store-id header.
 */
export const storeRouter = router({
  /**
   * Get Store Configuration (READ)
   * 
   * Protected Procedure: ✅ requireStore middleware
   * - Validates x-store-id header is present
   * - Validates storeId is valid UUID format
   * - Extracts authenticated storeId from context
   * 
   * Flow:
   * 1. Client sends request with x-store-id header
   * 2. requireStore middleware validates storeId
   * 3. Procedure extracts ctx.storeId (guaranteed valid UUID)
   * 4. Service layer fetches configuration from database
   * 5. Returns store configuration or throws NOT_FOUND
   * 
   * @returns StoreConfig object
   * @throws {TRPCError} BAD_REQUEST if x-store-id header missing
   * @throws {TRPCError} NOT_FOUND if store doesn't exist
   * 
   * @example
   * ```typescript
   * // Client usage:
   * const config = await trpc.store.getConfig.query();
   * // x-store-id header is automatically included from client setup
   * ```
   */
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      // ctx.storeId is guaranteed to be a valid UUID by requireStore middleware
      // No additional validation needed here - defensive programming at work!
      
      return storeService.getConfig(ctx.storeId);
    }),

  /**
   * Update Store Configuration (WRITE)
   * 
   * Protected Procedure: ✅ requireStore middleware
   * Input Validation: ✅ UpdateStoreConfigSchema (Zod)
   * 
   * This procedure demonstrates the complete validation bridge:
   * 1. Middleware validates storeId (tenant isolation)
   * 2. Zod validates input structure (data integrity)
   * 3. Service layer applies business rules (business logic)
   * 
   * Flow:
   * 1. Client sends mutation with x-store-id header + input data
   * 2. requireStore middleware validates storeId
   * 3. Zod validates input against UpdateStoreConfigSchema
   * 4. Procedure passes validated data to service layer
   * 5. Service layer updates database with validated data
   * 6. Returns updated configuration
   * 
   * Security:
   * - storeId from context (authenticated) is used, NOT from input
   * - This prevents privilege escalation attacks
   * - Input is validated before reaching business logic
   * 
   * @input UpdateStoreConfigSchema - Partial store configuration
   * @returns Updated StoreConfig object
   * @throws {TRPCError} BAD_REQUEST if validation fails
   * @throws {TRPCError} NOT_FOUND if store doesn't exist
   * 
   * @example
   * ```typescript
   * // Client usage:
   * const updated = await trpc.store.updateConfig.mutate({
   *   metadata: {
   *     name: "My Updated Store",
   *     description: "New description"
   *   },
   *   theme: {
   *     colors: { primary: "#FF5733" }
   *   }
   * });
   * ```
   */
  updateConfig: protectedProcedure
    .input(UpdateStoreConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // CRITICAL SECURITY: Use authenticated storeId from context, NOT from input
      // This ensures users can only update their own store's configuration
      const authenticatedStoreId = ctx.storeId;

      // Pass validated input and authenticated storeId to service layer
      return storeService.updateConfig(authenticatedStoreId, input);
    }),

  /**
   * Create Store Configuration (CREATE)
   * 
   * Protected Procedure: ✅ requireStore middleware
   * Input Validation: ✅ CreateStoreConfigSchema (Zod)
   * 
   * Creates a new store configuration.
   * Note: In production, this would typically be called during tenant onboarding.
   * 
   * @input CreateStoreConfigSchema - Complete store configuration (without storeId)
   * @returns Created StoreConfig object
   * @throws {TRPCError} BAD_REQUEST if validation fails
   * @throws {TRPCError} CONFLICT if store already exists
   */
  createConfig: protectedProcedure
    .input(CreateStoreConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Use authenticated storeId from context
      return storeService.createConfig(ctx.storeId, input);
    }),

  /**
   * Delete Store Configuration (DELETE)
   * 
   * Protected Procedure: ✅ requireStore middleware
   * 
   * Deletes the store configuration.
   * Note: In production, this would require additional authorization (e.g., admin role).
   * 
   * @returns Success message
   * @throws {TRPCError} NOT_FOUND if store doesn't exist
   */
  deleteConfig: protectedProcedure
    .mutation(async ({ ctx }) => {
      return storeService.deleteConfig(ctx.storeId);
    }),

  /**
   * Validate Configuration (UTILITY)
   * 
   * Protected Procedure: ✅ requireStore middleware
   * 
   * Validates a configuration object without saving it.
   * Useful for client-side validation feedback before submission.
   * 
   * @input StoreConfigSchema - Complete store configuration
   * @returns Validation result with errors/warnings
   */
  validateConfig: protectedProcedure
    .input(StoreConfigSchema)
    .query(async ({ input }) => {
      // Validate the input using the schema
      const result = StoreConfigSchema.safeParse(input);

      if (result.success) {
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }

      return {
        isValid: false,
        errors: result.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        warnings: [],
      };
    }),
});

/**
 * Type Export for Client-Side Usage
 * 
 * Export the router type for type-safe client access
 */
export type StoreRouter = typeof storeRouter;

