/**
 * tRPC Middleware Guards
 * 
 * This file contains reusable middleware for enforcing:
 * - Tenant isolation (requireStore)
 * - Authentication (requireAuth)
 * - Authorization (requireRole)
 * 
 * All middleware follows defensive coding principles with guard clauses
 * and early returns for invalid states.
 * 
 * ARCHITECTURE: Middleware functions are created using the experimental_standaloneMiddleware
 * to avoid circular dependencies with trpc.ts
 */

import { TRPCError } from '@trpc/server';
import { experimental_standaloneMiddleware } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../context';
import { storeIdTranslator } from '../services/store-id-translator.service';

/**
 * requireStore Middleware (Enhanced with Bidirectional Translation)
 * 
 * CRITICAL GUARD: Ensures user is authenticated and authorized to access the requested store.
 * 
 * NEW: Accepts BOTH ID formats via bidirectional translation:
 * - Reech Platform format: UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")
 * - Medusa Commerce format: store_XXX (e.g., "store_01HQWE1234567890")
 * 
 * Implementation follows defensive coding with guard clauses:
 * 1. Guard Clause 1: Check user authentication (MUST be first)
 * 2. Guard Clause 2: Check if storeid header exists
 * 3. Guard Clause 3: Normalize and validate storeid (accepts both formats)
 * 4. Guard Clause 4: Check user authorization via database
 * 5. Happy Path: Propagate normalized IDs to downstream procedures
 * 
 * Multi-Tenancy Architecture:
 * - Accepts EITHER UUID or Medusa Store ID from client
 * - Normalizes to UUID internally for authorization
 * - Validates against store_members table (UUID-based)
 * - Propagates BOTH IDs in context for downstream use
 * 
 * Authorization Flow:
 * ```
 * Client Request (x-store-id header)
 *     ↓
 * Detect Format (UUID or Medusa)
 *     ↓
 * Translate to UUID (if needed)
 *     ↓
 * Check store_members table (has_store_access)
 *     ↓
 * Return normalized IDs in context
 * ```
 * 
 * Context Output:
 * - ctx.storeid → Reech Tenant UUID (always present)
 * - ctx.medusaStoreId → Medusa Store ID (may be null)
 * - ctx.user → Authenticated user (guaranteed)
 * 
 * Usage:
 * ```typescript
 * export const protectedProcedure = publicProcedure.use(requireStore);
 * 
 * export const getProducts = protectedProcedure.query(({ ctx }) => {
 *   // ctx.storeid is guaranteed valid UUID (Reech tenant ID)
 *   // ctx.medusaStoreId may be available for Medusa operations
 *   // ctx.user is guaranteed authenticated
 *   
 *   // Use Reech ID for internal operations
 *   return db.products.findMany({ where: { storeId: ctx.storeid } });
 *   
 *   // Use Medusa ID for commerce operations (if available)
 *   if (ctx.medusaStoreId) {
 *     return medusaClient.products.list({ store_id: ctx.medusaStoreId });
 *   }
 * });
 * ```
 * 
 * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
 * @throws {TRPCError} BAD_REQUEST if storeid is missing or invalid format
 * @throws {TRPCError} FORBIDDEN if user doesn't have access to the store
 * @throws {TRPCError} NOT_FOUND if store doesn't exist
 * @returns {Promise} Context with validated storeid, medusaStoreId, and user
 */
export const requireStore = experimental_standaloneMiddleware<{
  ctx: Context;
  input: unknown;
}>().create(async ({ ctx, next }) => {
  // ============================================================================
  // GUARD CLAUSE 1: Check user authentication (CRITICAL - MUST BE FIRST)
  // ============================================================================
  // Security: Always verify authentication before ANY other checks
  // This prevents information disclosure about store existence
  
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication is required to perform this action.',
      cause: 'NOT_AUTHENTICATED',
    });
  }

  // ============================================================================
  // GUARD CLAUSE 2: Check if storeid header exists
  // ============================================================================
  // Verify x-store-id header was included in the request
  
  if (!ctx.storeid) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 
        'Missing x-store-id header. All tenant-scoped requests must include this header.\n' +
        'Accepted formats:\n' +
        '  - UUID: "123e4567-e89b-12d3-a456-426614174000" (Reech platform)\n' +
        '  - Medusa: "store_01HQWE1234567890" (Medusa commerce)',
      cause: 'MISSING_STORE_ID',
    });
  }

  // ============================================================================
  // GUARD CLAUSE 3 & 4: Normalize, Translate, and Authorize
  // ============================================================================
  // This single function call:
  // 1. Detects which format was provided (UUID or Medusa)
  // 2. Translates to UUID if Medusa format was used
  // 3. Checks authorization via store_members table
  // 4. Returns both IDs for downstream use
  //
  // Throws appropriate errors if:
  // - Format is invalid
  // - Store doesn't exist
  // - User doesn't have access
  
  const { reechTenantId, medusaStoreId } = await storeIdTranslator.normalizeAndValidate(
    ctx.storeid,
    ctx.user.id
  );

  // ============================================================================
  // HAPPY PATH: All validations passed
  // ============================================================================
  // Propagate normalized IDs to downstream procedures
  // - storeid: UUID (Reech tenant ID) - guaranteed present
  // - medusaStoreId: Medusa Store ID - may be null
  // - user: Authenticated user - guaranteed present
  
  return next({
    ctx: {
      ...ctx,
      storeid: reechTenantId,       // UUID for internal operations
      medusaStoreId: medusaStoreId, // Medusa ID for commerce operations (if available)
      user: ctx.user,                // Authenticated user
    },
  });
});

/**
 * requireAuth Middleware
 * 
 * CRITICAL GUARD: Ensures user is authenticated before accessing protected resources.
 * 
 * Implementation follows same defensive pattern as requireStore:
 * 1. Guard Clause: Early return if user not authenticated
 * 2. Happy Path: Proceed with guaranteed user context
 * 
 * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
 * @returns {Promise} Context with guaranteed user and session
 */
export const requireAuth = experimental_standaloneMiddleware<{
  ctx: Context;
  input: unknown;
}>().create(async ({ ctx, next }) => {
  // GUARD CLAUSE: Check authentication
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in to access this resource.',
      cause: 'NOT_AUTHENTICATED',
    });
  }

  // HAPPY PATH: User authenticated
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Guaranteed to exist
      session: ctx.session, // Guaranteed to exist
    },
  });
});

/**
 * requireRole Middleware Factory
 * 
 * Creates middleware that checks user has required role.
 * 
 * @param allowedRoles - Array of roles that can access the resource
 * @returns Middleware that validates user role
 * 
 * @example
 * ```typescript
 * const adminProcedure = authedProcedure.use(requireRole(['admin', 'owner']));
 * ```
 */
export function requireRole(allowedRoles: string[]) {
  return experimental_standaloneMiddleware<{
    ctx: Context;
    input: unknown;
  }>().create(async ({ ctx, next }) => {
    // GUARD CLAUSE 1: Must be authenticated
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // GUARD CLAUSE 2: Must have allowed role
    if (!ctx.user.role || !allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
        cause: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // HAPPY PATH: User has required role
    return next({ ctx });
  });
}

/**
 * Type Guards for Context (Prompt 3.2)
 * 
 * These functions help TypeScript narrow context types after middleware validation.
 * Updated to use storeid property as the primary multi-tenancy identifier.
 */

/**
 * Check if context has validated storeid (Prompt 3.2)
 * 
 * @param ctx - Context object (unknown type for safety)
 * @returns True if ctx has a valid storeid property
 */
export function hasValidStore(ctx: unknown): ctx is { storeid: string } {
  return (
    typeof ctx === 'object' &&
    ctx !== null &&
    'storeid' in ctx &&
    typeof ctx.storeid === 'string' &&
    ctx.storeid.length > 0
  );
}

/**
 * Check if context has authenticated user
 */
export function hasAuthenticatedUser(
  ctx: unknown
): ctx is { user: NonNullable<{ id: string; email: string; role?: string }> } {
  return (
    typeof ctx === 'object' &&
    ctx !== null &&
    'user' in ctx &&
    ctx.user !== null &&
    typeof ctx.user === 'object'
  );
}
