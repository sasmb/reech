# Task 3: Authorization Middleware - The `storeId` Guard

## 🎯 Goal
Create mandatory tRPC middleware that acts as a guard clause, ensuring a valid `storeId` is present before any backend business logic executes.

## 📋 Requirements

### Core Requirements
1. ✅ Create `requireStore` middleware in dedicated file
2. ✅ Implement guard clause with if-return pattern
3. ✅ Early return with TRPCError for invalid storeId
4. ✅ Propagate validated storeId in context
5. ✅ Write unit tests for middleware

### Security Requirements
- ✅ Validate storeId is not missing
- ✅ Validate storeId is valid UUID format
- ✅ Clear, descriptive error messages
- ✅ No business logic before validation

## 🏗️ Implementation Plan

### Step 1: Create Dedicated Middleware File ⏳

**File**: `server/router/_middleware.ts`

**Purpose**: Centralize all middleware guards in one location

```typescript
/**
 * tRPC Middleware Guards
 * 
 * This file contains reusable middleware for:
 * - Tenant isolation (requireStore)
 * - Authentication (requireAuth)
 * - Authorization (requireRole)
 */

import { middleware } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * requireStore Middleware
 * 
 * CRITICAL GUARD: Ensures storeId is present and valid before any business logic
 * 
 * Implementation follows defensive coding with guard clauses:
 * 1. Early return if storeId missing
 * 2. Early return if storeId invalid UUID
 * 3. Only proceed if validation passes
 * 
 * @throws {TRPCError} BAD_REQUEST if storeId missing or invalid
 */
export const requireStore = middleware(async ({ ctx, next }) => {
  // GUARD CLAUSE 1: Check if storeId exists
  if (!ctx.storeId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Missing x-store-id header. All tenant-scoped requests must include this header.',
      cause: 'MISSING_STORE_ID',
    });
  }

  // GUARD CLAUSE 2: Validate storeId format (UUID)
  const uuidSchema = z.string().uuid({
    message: 'Invalid store ID format. Must be a valid UUID.',
  });

  const result = uuidSchema.safeParse(ctx.storeId);

  if (!result.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid store ID format. Must be a valid UUID.',
      cause: result.error.flatten(),
    });
  }

  // HAPPY PATH: Validation passed, propagate validated storeId
  return next({
    ctx: {
      ...ctx,
      storeId: result.data, // Now guaranteed to be valid UUID string
    },
  });
});
```

### Step 2: Update trpc.ts to Use Middleware ⏳

**File**: `server/trpc.ts`

Refactor to import middleware from dedicated file:

```typescript
import { requireStore } from './router/_middleware';

// Protected procedure uses requireStore guard
export const protectedProcedure = publicProcedure.use(requireStore);
```

### Step 3: Recreate API Handler ⏳

**File**: `app/api/trpc/[trpc]/route.ts`

Recreate the deleted API route handler:

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) => {
  const options = {
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    ...(process.env['NODE_ENV'] === 'development' && {
      onError: ({ path, error }: { path?: string; error: Error }) => {
        console.error(`❌ tRPC failed on ${path}: ${error.message}`);
      },
    }),
  };

  return fetchRequestHandler(options);
};

export { handler as GET, handler as POST };
```

### Step 4: Write Unit Tests ⏳

**File**: `server/router/_middleware.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { requireStore } from './_middleware';

describe('requireStore middleware', () => {
  // Mock next function
  const mockNext = vi.fn();

  beforeEach(() => {
    mockNext.mockClear();
  });

  it('should throw BAD_REQUEST when storeId is missing', async () => {
    // Arrange
    const ctx = {
      storeId: undefined,
      user: null,
      session: null,
    };

    // Act & Assert
    await expect(
      requireStore({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test',
        rawInput: undefined,
        meta: undefined,
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      requireStore({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test',
        rawInput: undefined,
        meta: undefined,
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('Missing x-store-id'),
    });

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw BAD_REQUEST when storeId is not a valid UUID', async () => {
    // Arrange
    const ctx = {
      storeId: 'not-a-uuid',
      user: null,
      session: null,
    };

    // Act & Assert
    await expect(
      requireStore({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test',
        rawInput: undefined,
        meta: undefined,
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      requireStore({
        ctx,
        next: mockNext,
        type: 'query',
        path: 'test',
        rawInput: undefined,
        meta: undefined,
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('Invalid store ID format'),
    });

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() with validated storeId when valid UUID provided', async () => {
    // Arrange
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const ctx = {
      storeId: validUuid,
      user: null,
      session: null,
    };

    mockNext.mockResolvedValue({
      ok: true,
      data: { result: 'success' },
    });

    // Act
    await requireStore({
      ctx,
      next: mockNext,
      type: 'query',
      path: 'test',
      rawInput: undefined,
      meta: undefined,
    });

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith({
      ctx: {
        ...ctx,
        storeId: validUuid, // Validated and propagated
      },
    });
  });

  it('should propagate context to downstream procedures', async () => {
    // Arrange
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const ctx = {
      storeId: validUuid,
      user: { id: 'user-1', email: 'test@example.com' },
      session: { access_token: 'token', refresh_token: 'refresh' },
    };

    const expectedContext = {
      ctx: {
        storeId: validUuid,
        user: ctx.user,
        session: ctx.session,
      },
    };

    mockNext.mockResolvedValue({ ok: true, data: {} });

    // Act
    await requireStore({
      ctx,
      next: mockNext,
      type: 'query',
      path: 'test',
      rawInput: undefined,
      meta: undefined,
    });

    // Assert
    expect(mockNext).toHaveBeenCalledWith(expectedContext);
  });
});
```

### Step 5: Integration Tests ⏳

**File**: `server/router/_middleware.integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers/_app';
import { createContext } from '../context';

describe('requireStore middleware integration', () => {
  it('should reject requests without storeId header', async () => {
    // Arrange
    const caller = appRouter.createCaller(
      await createContext({
        req: new Request('http://localhost:3000/api/trpc'),
        resHeaders: new Headers(),
      })
    );

    // Act & Assert
    await expect(caller.store.getConfig()).rejects.toThrow(
      'Missing x-store-id header'
    );
  });

  it('should reject requests with invalid UUID', async () => {
    // Arrange
    const req = new Request('http://localhost:3000/api/trpc');
    req.headers.set('x-store-id', 'invalid-uuid');

    const caller = appRouter.createCaller(
      await createContext({
        req,
        resHeaders: new Headers(),
      })
    );

    // Act & Assert
    await expect(caller.store.getConfig()).rejects.toThrow(
      'Invalid store ID format'
    );
  });

  it('should allow requests with valid UUID', async () => {
    // Arrange
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const req = new Request('http://localhost:3000/api/trpc');
    req.headers.set('x-store-id', validUuid);

    const caller = appRouter.createCaller(
      await createContext({
        req,
        resHeaders: new Headers(),
      })
    );

    // Act
    const result = await caller.store.getConfig();

    // Assert
    expect(result.storeId).toBe(validUuid);
  });
});
```

## 🔐 Guard Clause Pattern

### Defensive Coding Principles

```typescript
// ✅ GOOD: Guard clauses at the top
export const requireStore = middleware(async ({ ctx, next }) => {
  // GUARD 1: Early return if missing
  if (!ctx.storeId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: '...' });
  }

  // GUARD 2: Early return if invalid
  const result = schema.safeParse(ctx.storeId);
  if (!result.success) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: '...' });
  }

  // HAPPY PATH: All validations passed
  return next({ ctx: { ...ctx, storeId: result.data } });
});

// ❌ BAD: Nested if-else (harder to read)
export const requireStore = middleware(async ({ ctx, next }) => {
  if (ctx.storeId) {
    const result = schema.safeParse(ctx.storeId);
    if (result.success) {
      return next({ ctx: { ...ctx, storeId: result.data } });
    } else {
      throw new TRPCError({ ... });
    }
  } else {
    throw new TRPCError({ ... });
  }
});
```

## 📊 Middleware Flow

```
Request
    ↓
createContext() → { storeId: string | undefined }
    ↓
requireStore middleware
    ├── GUARD 1: if (!ctx.storeId) → throw TRPCError
    ├── GUARD 2: if (!isValidUUID) → throw TRPCError
    └── HAPPY PATH: return next({ ctx: { storeId: validUUID } })
    ↓
Procedure Handler
    └── ctx.storeId is guaranteed valid UUID
```

## ✅ Success Criteria

- [ ] `_middleware.ts` file created with `requireStore` export
- [ ] Guard clauses use if-return pattern (no nested if-else)
- [ ] Early returns throw TRPCError with descriptive messages
- [ ] Validated storeId propagated in context
- [ ] Unit tests cover: missing storeId, invalid UUID, valid UUID
- [ ] Integration tests verify end-to-end behavior
- [ ] API route handler recreated
- [ ] All tests passing

## 📚 References

- [tRPC Middleware](https://trpc.io/docs/server/middlewares)
- [Guard Clauses](https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html)
- [Early Return Pattern](https://medium.com/@matryer/line-of-sight-in-code-186dd7cdea88)

---

**Status**: Ready for implementation  
**Next Step**: Create `_middleware.ts` file

