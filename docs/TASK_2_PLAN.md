# Task 2: tRPC Context Implementation - Detailed Plan

## 🎯 Goal
Implement tRPC context to safely extract `storeId` from request headers, preparing it for validation by middleware and ensuring automatic tenant context injection across all API calls.

## 📋 Requirements

### Core Requirements
1. ✅ Extract `storeId` from `x-store-id` HTTP header
2. ✅ Safely cast as `string | undefined`
3. ✅ Include authentication data (user, session)
4. ✅ Type-safe context definition
5. ✅ Integration with Next.js 15 App Router

### Security Requirements
- ✅ Validate `storeId` format (UUID)
- ✅ Handle missing/invalid `storeId` gracefully
- ✅ Prevent header injection attacks
- ✅ Integrate with Supabase Auth

## 🏗️ Architecture Overview

```
tRPC Setup Structure
├── server/
│   ├── context.ts          # Extract storeId, user, session
│   ├── trpc.ts             # Initialize tRPC, define procedures
│   ├── routers/
│   │   ├── _app.ts         # Main app router
│   │   ├── store.ts        # Store configuration routes
│   │   ├── product.ts      # Product routes
│   │   └── order.ts        # Order routes
│   └── middleware/
│       └── tenant.ts       # Validate storeId middleware
├── app/api/trpc/[trpc]/
│   └── route.ts            # Next.js API route handler
└── lib/
    └── trpc.ts             # Client-side tRPC utilities
```

## 📝 Implementation Steps

### Step 1: Install Dependencies ⏳

```bash
pnpm add @trpc/server@next @trpc/client@next @trpc/react-query@next @trpc/next@next
pnpm add @tanstack/react-query@^5.0.0
pnpm add superjson
pnpm add zod  # Already installed in shared package
```

**Why these packages:**
- `@trpc/server` - Server-side tRPC setup
- `@trpc/client` - Client-side tRPC integration
- `@trpc/react-query` - React hooks for tRPC
- `@trpc/next` - Next.js adapter
- `@tanstack/react-query` - Required for tRPC client
- `superjson` - Serialize dates, Maps, Sets, etc.
- `zod` - Input validation (already available)

### Step 2: Create Context (`server/context.ts`) ⏳

**Purpose**: Extract tenant context from request

```typescript
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { inferAsyncReturnType } from '@trpc/server';

export async function createContext(opts: CreateNextContextOptions) {
  const { req, res } = opts;
  
  // Extract storeId from header
  const storeId = req.headers['x-store-id'] as string | undefined;
  
  // TODO: Extract user from Supabase session
  // const session = await getServerSession(req, res);
  
  return {
    req,
    res,
    storeId,
    user: null, // Will be populated by auth middleware
    session: null,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

**Security Considerations:**
- ✅ Header extraction is safe (Next.js normalizes headers)
- ✅ Cast to `string | undefined` (no runtime errors)
- ✅ Middleware will validate UUID format
- ✅ User authentication handled separately

### Step 3: Initialize tRPC (`server/trpc.ts`) ⏳

**Purpose**: Create tRPC instance with context and middleware

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';
import { z } from 'zod';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

// Export router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware: Validate storeId is present and valid UUID
const enforceStoreId = t.middleware(async ({ ctx, next }) => {
  // Validate storeId exists
  if (!ctx.storeId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Missing x-store-id header',
    });
  }

  // Validate storeId format (UUID)
  const uuidSchema = z.string().uuid();
  const result = uuidSchema.safeParse(ctx.storeId);
  
  if (!result.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid store ID format (must be UUID)',
    });
  }

  // Pass validated storeId to next middleware/procedure
  return next({
    ctx: {
      ...ctx,
      storeId: result.data, // Now guaranteed to be valid UUID
    },
  });
});

// Protected procedure: Requires valid storeId
export const protectedProcedure = t.procedure.use(enforceStoreId);

// Middleware: Require authentication
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now guaranteed to exist
    },
  });
});

// Authenticated procedure: Requires user + storeId
export const authedProcedure = protectedProcedure.use(enforceAuth);
```

**Middleware Flow:**
1. `publicProcedure` - No requirements
2. `protectedProcedure` - Requires valid `storeId` (UUID)
3. `authedProcedure` - Requires `storeId` + authenticated user

### Step 4: Create App Router (`server/routers/_app.ts`) ⏳

**Purpose**: Define main router with example procedures

```typescript
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const appRouter = router({
  // Public procedure - no storeId required
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date() };
  }),

  // Protected procedure - requires storeId
  store: router({
    getConfig: protectedProcedure.query(({ ctx }) => {
      // ctx.storeId is guaranteed to be valid UUID here
      return {
        storeId: ctx.storeId,
        message: 'Store config would be fetched from database',
      };
    }),
  }),
});

// Export type definition (NOT the router itself)
export type AppRouter = typeof appRouter;
```

### Step 5: Create API Route Handler (`app/api/trpc/[trpc]/route.ts`) ⏳

**Purpose**: Handle tRPC requests in Next.js App Router

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

### Step 6: Create Client Utilities (`lib/trpc.ts`) ⏳

**Purpose**: Client-side tRPC setup with React Query

```typescript
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/routers/_app';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function getTRPCClient(storeId?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers() {
          return {
            // Include storeId in all requests
            'x-store-id': storeId ?? '',
          };
        },
      }),
    ],
  });
}
```

### Step 7: Provider Setup (`app/providers.tsx`) ⏳

**Purpose**: Wrap app with tRPC and React Query providers

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, getTRPCClient } from '@/lib/trpc';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => getTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## 🔐 Security Implementation

### Header Extraction Security
```typescript
// ✅ SAFE: Next.js normalizes headers
const storeId = req.headers['x-store-id'] as string | undefined;

// ❌ UNSAFE: Direct access without type checking
const storeId = req.headers['x-store-id'];
```

### UUID Validation
```typescript
// Middleware validates UUID format
const uuidSchema = z.string().uuid();
const result = uuidSchema.safeParse(ctx.storeId);

if (!result.success) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Invalid store ID format',
  });
}
```

### Error Handling
```typescript
// Client-side error handling
const { data, error } = trpc.store.getConfig.useQuery();

if (error) {
  // Handle errors appropriately
  if (error.data?.code === 'BAD_REQUEST') {
    // Invalid storeId
  }
  if (error.data?.code === 'UNAUTHORIZED') {
    // Not authenticated
  }
}
```

## 🧪 Testing Strategy

### Test 1: Context Creation
```typescript
// Verify storeId extraction
const ctx = await createContext({
  req: { headers: { 'x-store-id': 'valid-uuid' } },
  res: {},
});

expect(ctx.storeId).toBe('valid-uuid');
```

### Test 2: Middleware Validation
```typescript
// Test missing storeId
await expect(
  protectedProcedure.query({ ctx: { storeId: undefined } })
).rejects.toThrow('Missing x-store-id header');

// Test invalid UUID
await expect(
  protectedProcedure.query({ ctx: { storeId: 'not-a-uuid' } })
).rejects.toThrow('Invalid store ID format');
```

### Test 3: End-to-End
```typescript
// Test API call with valid header
const response = await fetch('/api/trpc/store.getConfig', {
  headers: { 'x-store-id': validUuid },
});

expect(response.ok).toBe(true);
```

## 📊 Context Flow Diagram

```
HTTP Request
    ↓
[x-store-id: uuid] header
    ↓
createContext()
    ├── Extract storeId (string | undefined)
    ├── Extract user (from Supabase)
    └── Return Context { storeId, user, session }
    ↓
Middleware: enforceStoreId
    ├── Validate storeId exists
    ├── Validate UUID format (Zod)
    ├── Throw TRPCError if invalid
    └── Pass validated storeId to procedure
    ↓
Procedure Handler
    └── ctx.storeId is guaranteed valid UUID
    ↓
Database Query
    └── WHERE store_id = ctx.storeId
```

## ✅ Success Criteria

- [ ] tRPC dependencies installed
- [ ] Context extracts `storeId` from `x-store-id` header
- [ ] Context type includes `storeId: string | undefined`
- [ ] Middleware validates `storeId` is valid UUID
- [ ] Protected procedures require valid `storeId`
- [ ] Client automatically includes `storeId` in headers
- [ ] Error handling for missing/invalid `storeId`
- [ ] Integration with Supabase Auth (future)
- [ ] Type safety end-to-end

## 📚 References

- [tRPC v11 Documentation](https://trpc.io/docs/v11)
- [Next.js 15 + tRPC Integration](https://trpc.io/docs/v11/nextjs)
- [Zod Validation](https://zod.dev/)
- [React Query](https://tanstack.com/query/latest)

---

**Status**: Ready for implementation  
**Next Step**: Install tRPC dependencies

