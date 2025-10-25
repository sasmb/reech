/**
 * tRPC and React Query Providers
 * 
 * This file wraps the application with necessary providers for tRPC and React Query.
 * It must be imported in the root layout as a Client Component.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, getTRPCClient } from '@/lib/trpc';
import { useState } from 'react';

/**
 * Providers component
 * 
 * Usage in app/layout.tsx:
 * ```tsx
 * import { Providers } from './providers';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Providers>{children}</Providers>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 * 
 * @param children - React children to wrap with providers
 * @param storeId - Optional storeId for tenant-scoped operations
 */
export function Providers({
  children,
  storeId,
}: {
  children: React.ReactNode;
  storeId?: string;
}) {
  /**
   * Create QueryClient instance
   * 
   * Options:
   * - defaultOptions: Configure default behavior for all queries
   * - staleTime: How long data is considered fresh (5 seconds)
   * - refetchOnWindowFocus: Refetch when tab regains focus
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  /**
   * Create tRPC client instance
   * 
   * Includes storeId in all requests if provided
   */
  const [trpcClient] = useState(() => getTRPCClient(storeId));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}


