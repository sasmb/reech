/**
 * tRPC Client Configuration
 * 
 * This file sets up the tRPC client for use in React components.
 * It provides type-safe hooks for making API calls.
 */

import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/routers/_app';
import superjson from 'superjson';

/**
 * Create tRPC React hooks
 * 
 * Usage in components:
 * ```tsx
 * const { data, isLoading } = trpc.store.getConfig.useQuery();
 * const mutation = trpc.store.updateConfig.useMutation();
 * ```
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get base URL for API requests
 * 
 * - Browser: Use relative path (same origin)
 * - Server (Vercel): Use VERCEL_URL environment variable
 * - Server (local): Use localhost with PORT
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser: use relative path
    return '';
  }

  if (process.env['VERCEL_URL']) {
    // SSR on Vercel: use Vercel URL
    return `https://${process.env['VERCEL_URL']}`;
  }

  // SSR locally: use localhost
  return `http://localhost:${process.env['PORT'] ?? 3000}`;
}

/**
 * Create tRPC client with configuration
 * 
 * @param storeId - Optional storeId to include in all requests
 * @returns Configured tRPC client
 */
export function getTRPCClient(storeId?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,

        /**
         * Headers to include in every request
         * 
         * CRITICAL: x-store-id header is required for all tenant-scoped operations
         */
        headers() {
          const headers: Record<string, string> = {};

          // Include storeId if provided
          if (storeId) {
            headers['x-store-id'] = storeId;
          }

          // You can add other headers here (auth tokens, etc.)
          // headers['authorization'] = `Bearer ${token}`;

          return headers;
        },

        /**
         * Enable batching for multiple requests
         * This improves performance by combining requests
         */
        // maxURLLength: 2083, // Uncomment to enable batching
      }),
    ],
  });
}

