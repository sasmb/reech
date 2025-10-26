/**
 * tRPC Context Creation (Enhanced with Bidirectional Translation)
 * 
 * This file defines the context that will be available to all tRPC procedures.
 * The context includes:
 * 1. storeid - Extracted from x-store-id header (accepts BOTH UUID and Medusa formats)
 * 2. medusaStoreId - Medusa Store ID (populated by middleware after translation)
 * 3. user - User session data (from Supabase Auth)
 * 4. session - Authentication session
 * 
 * MULTI-TENANCY ARCHITECTURE (Bidirectional Translation):
 * - The storeid is the PRIMARY multi-tenancy scope identifier
 * - Accepts TWO formats from clients:
 *   * UUID format: "123e4567-e89b-12d3-a456-426614174000" (Reech platform)
 *   * Medusa format: "store_01HQWE1234567890" (Medusa commerce)
 * - Extracted from x-store-id header in every request
 * - Middleware translates to internal UUID format
 * - Authorization always uses UUID (store_members table)
 * 
 * TRANSLATION FLOW:
 * 1. Client sends x-store-id header (either format)
 * 2. Context extracts raw value (no validation)
 * 3. Middleware detects format and translates to UUID
 * 4. Middleware validates authorization using UUID
 * 5. Context is enriched with both storeid (UUID) and medusaStoreId
 * 
 * SECURITY: The storeid is extracted from the request header but NOT validated here.
 * Validation, translation, and authorization happen in middleware (requireStore).
 */

import { type inferAsyncReturnType } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { Database } from '@/lib/supabase-server';
import { getSupabaseConfig } from '@/lib/supabase-server';

function createSupabaseClientForRequest(req: Request, resHeaders: Headers) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          resHeaders.append('Set-Cookie', serializeCookieHeader(name, value, options))
        );
      },
    },
  });
}

/**
 * Creates context for an incoming request (Prompt 3.2)
 * 
 * EXTRACTION LOGIC (Prompt 3.2 - Requirement 1):
 * - Explicitly extracts storeid from req.headers["x-store-id"]
 * - This header must be present for all tenant-scoped operations
 * - The extracted value serves as the primary multi-tenancy identifier
 * 
 * @param opts - Request options from Next.js/tRPC adapter
 * @returns Context object with storeid, user, and session
 * 
 * @example
 * ```typescript
 * // Client sets header:
 * fetch('/api/trpc', {
 *   headers: {
 *     'x-store-id': 'store_01HQWE...' // Medusa Store ID
 *   }
 * });
 * 
 * // Server extracts to context:
 * // ctx.storeid = 'store_01HQWE...'
 * ```
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  // ============================================================================
  // EXTRACTION LOGIC (Prompt 3.2 - Requirement 1)
  // ============================================================================
  // Explicitly attempt to extract the storeid from the request header
  // Header name: "x-store-id"
  // Expected value: Medusa Store ID (format: "store_XXXXX")
  
  const storeid = opts.req.headers.get('x-store-id') ?? undefined;

  const supabase = createSupabaseClientForRequest(opts.req, opts.resHeaders);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // ============================================================================
  // CONTEXT OBJECT (Prompt 3.2 - Requirement 2)
  // ============================================================================
  // The extracted storeid value is included in the shared context object
  // as ctx.storeid, making it available to all tRPC procedures
  
  return {
    // ========================================================================
    // MULTI-TENANCY CONTEXT (Enhanced with Bidirectional Translation)
    // ========================================================================
    // PRIMARY SCOPE IDENTIFIER: Accepts BOTH UUID and Medusa Store ID formats
    // - Property name: storeid (primary identifier)
    // - Extracted from: x-store-id header
    // - Accepted formats:
    //   * UUID: "123e4567-e89b-12d3-a456-426614174000" (Reech platform)
    //   * Medusa: "store_01HQWE1234567890" (Medusa commerce)
    // - Validation: Enforced by requireStore middleware (accepts both formats)
    // - Translation: Middleware normalizes to UUID for internal use
    // - Type: string | undefined (undefined if header not present)
    storeid: storeid as string | undefined,

    // Medusa Store ID (populated by middleware after translation)
    // This is set by requireStore middleware if a Medusa mapping exists
    medusaStoreId: undefined as string | null | undefined,

    // ========================================================================
    // AUTHENTICATION CONTEXT (Supabase Auth Integration)
    // ========================================================================
    // TODO: Extract from Supabase session
    // Example implementation:
    // const { data: { session } } = await supabase.auth.getSession();
    // user: session?.user ?? null
    user,
    session,

    // ========================================================================
    // REQUEST METADATA
    // ========================================================================
    // Useful for logging, rate limiting, debugging
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

/**
 * Context type definition (Prompt 3.2)
 * 
 * This type is inferred from the createContext function and used throughout tRPC.
 * It includes the storeid property which serves as the primary multi-tenancy scope identifier.
 */
export type Context = inferAsyncReturnType<typeof createContext>;

/**
 * Type guard to check if storeid is present and valid (Prompt 3.2)
 * 
 * MIDDLEWARE READINESS (Prompt 3.2 - Requirement 3):
 * This type guard is used by the requireStore middleware to validate
 * the storeid property is present and has a valid value.
 * 
 * @param ctx - Context object
 * @returns True if storeid is a non-empty string
 * 
 * @example
 * ```typescript
 * if (hasValidStoreId(ctx)) {
 *   // ctx.storeid is guaranteed to be string here
 *   const products = await getProducts(ctx.storeid);
 * }
 * ```
 */
export function hasValidStoreId(ctx: Context): ctx is Context & { storeid: string } {
  return typeof ctx.storeid === 'string' && ctx.storeid.length > 0;
}

/**
 * Type guard to check if user is authenticated
 * Used by middleware to protect authenticated routes
 */
export function isAuthenticated(ctx: Context): ctx is Context & { 
  user: NonNullable<Context['user']>;
  session: NonNullable<Context['session']>;
} {
  return ctx.user !== null && ctx.session !== null;
}
