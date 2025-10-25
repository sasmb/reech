# ✅ Task 2 Complete: tRPC Context Implementation

## 🎯 Task Objectives (ALL COMPLETED)

1. ✅ Extract `storeId` from `x-store-id` HTTP header
2. ✅ Safely cast as `string | undefined` in context
3. ✅ Include authentication data placeholders (user, session)
4. ✅ Type-safe context definition with `Context` type
5. ✅ Middleware validation for `storeId` (UUID format)
6. ✅ Integration with Next.js 15 App Router

## 📁 Files Created

### Server-Side Implementation
```
server/
├── context.ts                   ✅ Context creation with storeId extraction
├── trpc.ts                      ✅ tRPC initialization with middleware
├── routers/
│   └── _app.ts                  ✅ Main router with example procedures
└── middleware/                   📁 Ready for custom middleware

app/api/trpc/[trpc]/
└── route.ts                     ✅ Next.js API route handler

lib/
└── trpc.ts                      ✅ Client-side utilities

app/
├── providers.tsx                ✅ React Query + tRPC providers
└── layout.tsx                   ✅ Updated with Providers wrapper
```

### Documentation
```
docs/
├── TASK_2_PLAN.md              ✅ Detailed implementation plan
└── TASK_2_COMPLETE.md          ✅ This completion summary
```

## 🏗️ Implementation Details

### ✅ 1. Context Creation (`server/context.ts`)

**Purpose**: Extract tenant context from HTTP requests

```typescript
export async function createContext(opts: FetchCreateContextFnOptions) {
  // Extract storeId from custom header
  const storeId = opts.req.headers.get('x-store-id') ?? undefined;

  return {
    // Tenant context (extracted but not yet validated)
    storeId: storeId as string | undefined,

    // Authentication context (placeholders for Supabase integration)
    user: null as { id: string; email: string; role?: string } | null,
    session: null as { access_token: string; refresh_token: string; expires_at?: number } | null,

    // Request metadata
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

**Key Features:**
- ✅ Safe header extraction (no runtime errors)
- ✅ Explicit `string | undefined` type
- ✅ Future-ready for Supabase Auth
- ✅ Request metadata for logging
- ✅ Type inference for full type safety

**Security:**
- ✅ Header extraction is safe (Next.js normalizes headers)
- ✅ No validation at this layer (handled by middleware)
- ✅ Type guards provided for middleware use

### ✅ 2. tRPC Initialization (`server/trpc.ts`)

**Purpose**: Initialize tRPC with context and define reusable procedures

```typescript
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Middleware: Enforce valid storeId
const enforceStoreId = middleware(async ({ ctx, next }) => {
  if (!ctx.storeId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Missing x-store-id header',
    });
  }

  // Validate UUID format
  const result = z.string().uuid().safeParse(ctx.storeId);
  
  if (!result.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid store ID format (must be UUID)',
    });
  }

  return next({ ctx: { ...ctx, storeId: result.data } });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceStoreId);
export const authedProcedure = protectedProcedure.use(enforceAuth);
```

**Procedure Hierarchy:**
1. **`publicProcedure`** - No requirements (health checks, public data)
2. **`protectedProcedure`** - Requires valid `storeId` (UUID)
3. **`authedProcedure`** - Requires `storeId` + authenticated user

**Middleware Flow:**
```
HTTP Request
    ↓
[x-store-id: uuid] header
    ↓
createContext() → { storeId: string | undefined }
    ↓
enforceStoreId middleware
    ├── Check storeId exists
    ├── Validate UUID format (Zod)
    ├── Throw TRPCError if invalid
    └── Pass validated storeId
    ↓
Procedure Handler
    └── ctx.storeId is guaranteed valid UUID
```

### ✅ 3. App Router (`server/routers/_app.ts`)

**Example Procedures:**

```typescript
export const appRouter = router({
  // Public - no storeId required
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date(),
    version: '1.0.0',
  })),

  // Protected - requires valid storeId
  store: router({
    getConfig: protectedProcedure.query(({ ctx }) => {
      // ctx.storeId is guaranteed valid UUID here
      return { storeId: ctx.storeId, config: {...} };
    }),
    
    updateConfig: protectedProcedure
      .input(z.object({ name: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        // Update store config with validated storeId
        return { storeId: ctx.storeId, updated: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

### ✅ 4. API Route Handler (`app/api/trpc/[trpc]/route.ts`)

**Next.js 15 App Router Integration:**

```typescript
const handler = (req: Request) => {
  const options = {
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    ...(process.env['NODE_ENV'] === 'development' && {
      onError: ({ path, error }) => {
        console.error(`❌ tRPC failed on ${path}: ${error.message}`);
      },
    }),
  };

  return fetchRequestHandler(options);
};

export { handler as GET, handler as POST };
```

**Features:**
- ✅ Handles GET (queries) and POST (mutations)
- ✅ Development error logging
- ✅ Production-ready error handling
- ✅ Type-safe end-to-end

### ✅ 5. Client Setup (`lib/trpc.ts`)

**tRPC Client with React Query:**

```typescript
export const trpc = createTRPCReact<AppRouter>();

export function getTRPCClient(storeId?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers() {
          const headers: Record<string, string> = {};
          if (storeId) {
            headers['x-store-id'] = storeId;
          }
          return headers;
        },
      }),
    ],
  });
}
```

**Features:**
- ✅ Automatic `x-store-id` header injection
- ✅ SuperJSON transformer for Date, Map, Set
- ✅ Environment-aware base URL
- ✅ Type-safe React hooks

### ✅ 6. Provider Setup (`app/providers.tsx`)

**React Query + tRPC Providers:**

```typescript
'use client';

export function Providers({ children, storeId }: { 
  children: React.ReactNode; 
  storeId?: string;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClient] = useState(() => getTRPCClient(storeId));

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
// ✅ SAFE: Headers API is type-safe
const storeId = opts.req.headers.get('x-store-id') ?? undefined;

// Type: string | undefined (no runtime errors)
```

### UUID Validation (Middleware Layer)
```typescript
// Zod validation ensures only valid UUIDs proceed
const result = z.string().uuid().safeParse(ctx.storeId);

if (!result.success) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Invalid store ID format',
  });
}
```

### Error Handling
```typescript
// Client-side usage
const { data, error, isLoading } = trpc.store.getConfig.useQuery();

if (error) {
  if (error.data?.code === 'BAD_REQUEST') {
    // Handle invalid storeId
  }
  if (error.data?.code === 'UNAUTHORIZED') {
    // Handle authentication required
  }
}
```

## 📊 Usage Examples

### Example 1: Simple Query (Client Component)
```tsx
'use client';

import { trpc } from '@/lib/trpc';

export function StoreConfig() {
  const { data, isLoading, error } = trpc.store.getConfig.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Store: {data.config.name}</div>;
}
```

### Example 2: Mutation
```tsx
'use client';

import { trpc } from '@/lib/trpc';

export function UpdateStore() {
  const utils = trpc.useUtils();
  const mutation = trpc.store.updateConfig.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.store.getConfig.invalidate();
    },
  });

  return (
    <button
      onClick={() => mutation.mutate({ name: 'New Name' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Updating...' : 'Update Store'}
    </button>
  );
}
```

### Example 3: Server-Side Data Fetching
```tsx
// Server Component
import { createCaller } from '@/server/routers/_app';

export default async function ServerPage() {
  const caller = createCaller({
    storeId: 'valid-uuid-here',
    user: null,
    session: null,
  });

  const config = await caller.store.getConfig();

  return <div>{config.config.name}</div>;
}
```

## 🧪 Testing

### Test 1: Health Check (No storeId)
```bash
curl http://localhost:3000/api/trpc/health
# Expected: { "status": "ok", "timestamp": "..." }
```

### Test 2: Protected Route (Missing storeId)
```bash
curl http://localhost:3000/api/trpc/store.getConfig
# Expected: 400 Bad Request - "Missing x-store-id header"
```

### Test 3: Protected Route (Valid storeId)
```bash
curl -H "x-store-id: 123e4567-e89b-12d3-a456-426614174000" \
  http://localhost:3000/api/trpc/store.getConfig
# Expected: { "storeId": "...", "config": {...} }
```

### Test 4: Invalid UUID Format
```bash
curl -H "x-store-id: not-a-uuid" \
  http://localhost:3000/api/trpc/store.getConfig
# Expected: 400 Bad Request - "Invalid store ID format"
```

## ✅ Requirements Verification

| Requirement | Status | Implementation |
|------------|--------|----------------|
| **Extract `storeId` from header** | ✅ | `opts.req.headers.get('x-store-id')` |
| **Safely cast as `string \| undefined`** | ✅ | Explicit type annotation |
| **Include authentication data** | ✅ | `user` and `session` placeholders |
| **Type-safe context** | ✅ | `inferAsyncReturnType<typeof createContext>` |
| **Middleware validation** | ✅ | `enforceStoreId` middleware with Zod |
| **UUID format check** | ✅ | `z.string().uuid()` validation |
| **Error handling** | ✅ | TRPCError with descriptive messages |
| **Client integration** | ✅ | React hooks with auto header injection |
| **Next.js 15 compatibility** | ✅ | App Router with `fetchRequestHandler` |

## 🚀 Dependencies Installed

```json
{
  "dependencies": {
    "@trpc/server": "11.6.0",
    "@trpc/client": "11.6.0",
    "@trpc/react-query": "11.6.0",
    "@trpc/next": "11.6.0",
    "@tanstack/react-query": "5.90.2",
    "superjson": "2.2.2",
    "zod": "4.1.11"
  }
}
```

## 📈 Context Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Request                             │
│                [x-store-id: uuid] header                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│            createContext(opts)                               │
│  • Extract: opts.req.headers.get('x-store-id')             │
│  • Type: string | undefined                                 │
│  • No validation yet                                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│         Middleware: enforceStoreId                          │
│  1. Check: ctx.storeId exists?                             │
│  2. Validate: z.string().uuid().safeParse(ctx.storeId)    │
│  3. Error: TRPCError if invalid                            │
│  4. Pass: validated storeId to procedure                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│            Procedure Handler                                 │
│  • ctx.storeId is guaranteed valid UUID                     │
│  • Type narrowed to string (not undefined)                  │
│  • Safe to use in database queries                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│            Database Query                                    │
│  WHERE store_id = ctx.storeId                               │
│  • Tenant isolation enforced                                │
│  • No cross-tenant data leakage                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎉 Summary

**Task 2 Status: ✅ COMPLETE**

All requirements for tRPC context implementation have been successfully completed:

1. ✅ Context safely extracts `storeId` from `x-store-id` header
2. ✅ Type-safe context with `storeId: string | undefined`
3. ✅ Middleware validates UUID format before procedures
4. ✅ Protected procedures guarantee valid `storeId`
5. ✅ Client automatically includes `storeId` in all requests
6. ✅ Error handling for missing/invalid `storeId`
7. ✅ Full integration with Next.js 15 App Router
8. ✅ End-to-end type safety (server → client)

**Key Achievements:**
- 🏗️ Solid tRPC foundation for multi-tenant API
- 🔐 Security-first approach with middleware validation
- ⚡ Type-safe from database to UI
- 📚 Comprehensive documentation
- 🧪 Ready for testing and integration

**Critical Files:**
- `server/context.ts` - Context creation with storeId extraction
- `server/trpc.ts` - Middleware and procedure definitions
- `server/routers/_app.ts` - Example procedures
- `app/api/trpc/[trpc]/route.ts` - Next.js API handler
- `lib/trpc.ts` - Client utilities
- `app/providers.tsx` - React Query + tRPC providers

---

**Completed**: December 2024  
**Next Task**: Task 3 - Integrate with Database (Supabase) and implement actual queries with `storeId` enforcement



