/**
 * tRPC Initialization and Procedure Definitions
 * 
 * This file initializes tRPC with context and defines reusable procedures:
 * 1. publicProcedure - No requirements (open to all)
 * 2. protectedProcedure - Requires valid storeId (UUID)
 * 3. authedProcedure - Requires storeId + authenticated user
 */

import { initTRPC } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';
import { z } from 'zod';

/**
 * Initialize tRPC with context type
 * 
 * Options:
 * - transformer: Use superjson to handle Date, Map, Set, etc.
 * - errorFormatter: Customize error response format
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export router, base procedure, and middleware builder
 * 
 * IMPORTANT: Export these BEFORE importing _middleware to avoid circular dependency
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Import middleware guards from dedicated file (after exports to avoid circular dependency)
 */
import { requireStore, requireAuth } from './router/_middleware';

/**
 * Protected Procedure
 * 
 * Requires: Valid storeId (UUID)
 * Use for: All tenant-scoped operations
 * 
 * Middleware: requireStore
 * - Validates x-store-id header is present
 * - Validates storeId is valid UUID format
 * - Early returns with TRPCError if validation fails
 * - Propagates validated storeId in context
 * 
 * Example:
 * ```ts
 * export const getProducts = protectedProcedure
 *   .query(({ ctx }) => {
 *     // ctx.storeId is guaranteed to be valid UUID
 *     return db.products.findMany({ where: { storeId: ctx.storeId } });
 *   });
 * ```
 */
export const protectedProcedure = publicProcedure.use(requireStore);

/**
 * Authenticated Procedure
 * 
 * Requires: Valid storeId + authenticated user
 * Use for: User-specific operations within a tenant
 * 
 * Middleware Chain:
 * 1. requireStore - Validates storeId
 * 2. requireAuth - Validates user authentication
 * 
 * Example:
 * ```ts
 * export const createOrder = authedProcedure
 *   .input(z.object({ productId: z.string() }))
 *   .mutation(({ ctx, input }) => {
 *     // ctx.storeId and ctx.user are guaranteed to exist
 *     return db.orders.create({
 *       data: {
 *         storeId: ctx.storeId,
 *         userId: ctx.user.id,
 *         productId: input.productId,
 *       },
 *     });
 *   });
 * ```
 */
export const authedProcedure = protectedProcedure.use(requireAuth);

/**
 * Re-export middleware for custom use cases
 * 
 * Use these when you need to compose custom middleware chains:
 * ```ts
 * import { requireStore, requireAuth, requireRole } from './server/trpc';
 * 
 * const adminProcedure = publicProcedure
 *   .use(requireStore)
 *   .use(requireAuth)
 *   .use(requireRole(['admin', 'owner']));
 * ```
 */
export { requireStore, requireAuth };


