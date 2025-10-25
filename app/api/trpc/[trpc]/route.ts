/**
 * tRPC API Route Handler for Next.js App Router
 * 
 * This file handles all tRPC requests at /api/trpc/*
 * 
 * Supports:
 * - GET requests (queries)
 * - POST requests (mutations)
 * - Batch requests
 * - Error handling with development logging
 * 
 * Security:
 * - Context creation extracts storeId from headers
 * - Middleware validates storeId before business logic
 * - All errors are properly formatted and logged
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

/**
 * Handler for all tRPC requests
 * 
 * Flow:
 * 1. Request received by Next.js
 * 2. createContext extracts storeId from headers
 * 3. Router executes with context
 * 4. Middleware validates storeId (requireStore)
 * 5. Procedure handler executes business logic
 * 6. Response returned to client
 * 
 * @param req - Incoming HTTP request
 * @returns Response from tRPC procedure
 */
const handler = (req: Request) => {
  const options = {
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    ...(process.env['NODE_ENV'] === 'development' && {
      onError: ({ path, error }: { path: string | undefined; error: Error }) => {
        console.error(
          `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
        );
        console.error('Error details:', error);
      },
    }),
  };

  return fetchRequestHandler(options);
};

/**
 * Export as GET and POST handlers
 * 
 * Next.js will automatically route requests to these handlers:
 * - GET: /api/trpc/[procedure] for queries
 * - POST: /api/trpc/[procedure] for mutations
 */
export { handler as GET, handler as POST };

