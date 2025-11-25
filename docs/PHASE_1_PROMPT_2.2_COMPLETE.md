# Prompt 2.2: Order Router Implementation - COMPLETE

## Overview

**Prompt 2.2** has been successfully implemented, extending the multi-tenant architecture to order management operations. This implementation creates a parallel protected tRPC procedure for listing orders (`listOrders`), ensuring it utilizes the `requireStore` middleware and appropriate Zod validation for input filters.

## Implementation Summary

### ✅ **Core Requirements Met**

1. **Protected tRPC Procedure**: Created `listOrders` procedure with `requireStore` middleware
2. **Multi-Tenancy Enforcement**: `storeId` is derived from authenticated context, not client input
3. **Zod Validation**: Comprehensive `FilterableOrderPropsSchema` for type-safe filtering
4. **Service Layer Isolation**: Order service enforces tenant isolation at database level
5. **Parallel Architecture**: Mirrors the product router implementation pattern

### ✅ **Files Created/Modified**

#### **New Files Created:**
- `packages/shared/schemas/order.schema.ts` - Order filtering schemas and validation
- `server/services/order.service.ts` - Order service layer with database operations
- `server/routers/order.router.ts` - Order tRPC router with protected procedures

#### **Files Modified:**
- `server/routers/_app.ts` - Integrated order router into main application router

## Detailed Implementation

### 1. Order Schema (`packages/shared/schemas/order.schema.ts`)

**Purpose**: Defines Zod schemas for order filtering with robust runtime validation.

**Key Features**:
- **Security Design**: `storeId` is NEVER included in client-facing schemas
- **Comprehensive Filtering**: Status, customer, date, amount, search, and tracking filters
- **Type Safety**: Full TypeScript support with inferred types
- **Validation Helpers**: Helper functions for server-side filter creation

**Filter Categories**:
```typescript
// Status Filters
status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
financial_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded' | 'voided'
fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked'

// Customer Filters
customer_email: string (email format)
customer_id: string (UUID format)

// Date Filters
created_after: string (ISO 8601 datetime)
created_before: string (ISO 8601 datetime)
updated_after: string (ISO 8601 datetime)
paid_after: string (ISO 8601 datetime)

// Amount Filters
min_total: number (non-negative)
max_total: number (non-negative)

// Search & Tracking
q: string (search query)
tracking_number: string
payment_method: string
currency: string (3 characters)

// Pagination & Sorting
limit: number (1-100, default: 15)
offset: number (non-negative, default: 0)
order_by: 'created_at' | 'updated_at' | 'order_number' | 'total_amount' | 'status'
sort_order: 'asc' | 'desc' (default: 'desc')
```

**Security Pattern**:
```typescript
// Client-facing schema (NO storeId)
export const FilterableOrderPropsSchema = z.object({
  status: OrderStatusSchema.optional(),
  // ... other filters
});

// Server-side schema (WITH storeId from context)
export type ServerSideOrderFilterProps = FilterableOrderProps & {
  store_id: string; // ← Injected from authenticated context
};

// Helper function for secure filter creation
export function createServerSideOrderFilters(
  clientFilters: FilterableOrderProps,
  storeId: string // ← From ctx.storeId
): ServerSideOrderFilterProps {
  return { ...clientFilters, store_id: storeId };
}
```

### 2. Order Service (`server/services/order.service.ts`)

**Purpose**: Provides business logic for order management operations with multi-tenancy enforcement.

**Key Features**:
- **Guard Clauses**: Input validation with early returns
- **Multi-Tenancy**: All queries filtered by `store_id` column
- **Error Handling**: TRPCError with appropriate codes and messages
- **Database Integration**: Supabase client with type safety

**Core Methods**:

#### `findOrdersForStore(storeId, filters)`
```typescript
// Guard clauses for input validation
if (!this.supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
if (!storeId.match(/^store_[a-zA-Z0-9]+$/)) throw new TRPCError({ code: 'BAD_REQUEST' });

// Create server-side filters
const serverFilters = createServerSideOrderFilters(filters, storeId);

// Build query with tenant isolation
let query = this.supabase
  .from('orders')
  .select('*', { count: 'exact' })
  .eq('store_id', storeId)  // ← Tenant isolation
  .is('deleted_at', null);  // ← Exclude soft-deleted

// Apply client filters
if (serverFilters.status) query = query.eq('status', serverFilters.status);
if (serverFilters.customer_email) query = query.eq('customer_email', serverFilters.customer_email);
// ... other filters

// Execute with pagination and sorting
const { data, error, count } = await query
  .order(serverFilters.order_by, { ascending: serverFilters.sort_order === 'asc' })
  .range(serverFilters.offset, serverFilters.offset + serverFilters.limit - 1);

return {
  orders: data || [],
  count: count || 0,
  limit: serverFilters.limit,
  offset: serverFilters.offset,
  hasMore: count ? serverFilters.offset + serverFilters.limit < count : false,
};
```

#### `getOrderById(storeId, orderId)`
- Fetches single order by UUID
- Validates both storeId and orderId formats
- Returns NOT_FOUND if order doesn't exist for the store

#### `getOrderByNumber(storeId, orderNumber)`
- Fetches single order by human-readable order number
- Validates order number format
- Returns NOT_FOUND if order doesn't exist for the store

### 3. Order Router (`server/routers/order.router.ts`)

**Purpose**: tRPC router for order operations with protected procedures and multi-tenancy enforcement.

**Key Features**:
- **Protected Procedures**: All procedures use `protectedProcedure` with `requireStore` middleware
- **Input Validation**: Zod schemas for type-safe input validation
- **Context Usage**: Extracts `storeId` from authenticated context
- **Service Integration**: Calls order service with validated parameters

**Core Procedures**:

#### `listOrders`
```typescript
listOrders: protectedProcedure
  .input(FilterableOrderPropsSchema)
  .query(async ({ ctx, input }) => {
    // Extract storeId from authenticated context
    const { storeid } = ctx; // ← Guaranteed by requireStore middleware

    // Call service layer with storeId and client filters
    return await orderService.findOrdersForStore(storeid, input);
  })
```

#### `getById`
```typescript
getById: protectedProcedure
  .input(z.object({
    orderId: z.string().uuid('Order ID must be a valid UUID')
  }))
  .query(async ({ ctx, input }) => {
    const { storeid } = ctx;
    return await orderService.getOrderById(storeid, input.orderId);
  })
```

#### `getByNumber`
```typescript
getByNumber: protectedProcedure
  .input(z.object({
    orderNumber: z.string().min(1).max(50)
  }))
  .query(async ({ ctx, input }) => {
    const { storeid } = ctx;
    return await orderService.getOrderByNumber(storeid, input.orderNumber);
  })
```

#### `getStats`
```typescript
getStats: protectedProcedure
  .input(z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month')
  }))
  .query(async ({ ctx, input }) => {
    const { storeid } = ctx;
    // TODO: Implement order statistics service method
    return { /* placeholder response */ };
  })
```

### 4. App Router Integration (`server/routers/_app.ts`)

**Changes Made**:
- Added import for `orderRouter`
- Integrated `order: orderRouter` into main app router
- Updated documentation comments

**Router Structure**:
```typescript
export const appRouter = router({
  health: publicProcedure.query(/* ... */),
  store: storeRouter,      // Store configuration operations
  product: productRouter,  // Product catalog operations (Prompt 2.1)
  order: orderRouter,      // Order management operations (Prompt 2.2)
  echo: publicProcedure.input(/* ... */).query(/* ... */),
});
```

## Security Implementation

### ✅ **Multi-Tenancy Enforcement**

1. **Middleware Protection**: All procedures use `protectedProcedure` with `requireStore` middleware
2. **Context-Based StoreId**: `storeId` is derived from `x-store-id` header, never from client input
3. **Database Filtering**: All queries automatically filter by `store_id` column
4. **Input Validation**: Zod schemas prevent invalid data from reaching the service layer

### ✅ **Tenant Isolation Pattern**

```typescript
// ❌ NEVER accept storeId from client
const badFilters = { storeId: 'store_123', status: 'confirmed' }; // Security risk

// ✅ ALWAYS derive storeId from authenticated context
export const listOrders = protectedProcedure
  .input(FilterableOrderPropsSchema) // ← No storeId in schema
  .query(async ({ ctx, input }) => {
    const { storeid } = ctx; // ← From x-store-id header
    return await orderService.findOrdersForStore(storeid, input);
  });
```

### ✅ **Database Security**

```sql
-- All order queries automatically filtered by store_id
SELECT * FROM orders 
WHERE store_id = 'store_01HQWE123'  -- ← Injected from context
  AND deleted_at IS NULL             -- ← Exclude soft-deleted
  AND status = 'confirmed';          -- ← Client filter
```

## Usage Examples

### Client-Side Usage

```typescript
// List orders with filters
const { data: orders } = await trpc.order.listOrders.useQuery({
  status: 'confirmed',
  financial_status: 'paid',
  created_after: '2025-01-01T00:00:00Z',
  limit: 20,
  offset: 0,
  order_by: 'created_at',
  sort_order: 'desc'
});

// Get order by ID
const { data: order } = await trpc.order.getById.useQuery({
  orderId: '123e4567-e89b-12d3-a456-426614174000'
});

// Get order by number
const { data: order } = await trpc.order.getByNumber.useQuery({
  orderNumber: 'ORD-2025-001'
});

// Get order statistics
const { data: stats } = await trpc.order.getStats.useQuery({
  dateFrom: '2025-01-01T00:00:00Z',
  dateTo: '2025-01-31T23:59:59Z',
  groupBy: 'month'
});
```

### Server-Side Usage

```typescript
// In tRPC procedure
export const listOrders = protectedProcedure
  .input(FilterableOrderPropsSchema)
  .query(async ({ ctx, input }) => {
    // ctx.storeId is guaranteed by requireStore middleware
    const { storeid } = ctx;
    
    // Service layer handles multi-tenancy automatically
    const result = await orderService.findOrdersForStore(storeid, input);
    
    return result;
  });
```

## Database Schema Alignment

### ✅ **Orders Table Structure**

The implementation aligns with the database schema from migration `002_add_orders_table.sql`:

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY DEFAULT 'order_' || LOWER(REPLACE(gen_random_uuid()::TEXT, '-', '')),
  store_id TEXT NOT NULL CHECK (store_id ~ '^store_[a-zA-Z0-9]+$'),
  order_number TEXT NOT NULL,
  status order_status_type NOT NULL DEFAULT 'pending',
  financial_status financial_status_type NOT NULL DEFAULT 'pending',
  fulfillment_status fulfillment_status_type NOT NULL DEFAULT 'unfulfilled',
  customer_email TEXT NOT NULL,
  total_amount BIGINT NOT NULL DEFAULT 0,
  -- ... other columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### ✅ **Indexes for Performance**

```sql
-- Multi-tenant indexes
CREATE INDEX idx_orders_store_id_status ON orders(store_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_store_id_created_at ON orders(store_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_store_id_customer_email ON orders(store_id, customer_email) WHERE deleted_at IS NULL;
```

## Error Handling

### ✅ **Comprehensive Error Handling**

1. **Service Layer**: Guard clauses with TRPCError
2. **Database Errors**: Wrapped with context and error codes
3. **Validation Errors**: Zod validation with descriptive messages
4. **Not Found Errors**: Specific error codes for missing resources

```typescript
// Service layer error handling
if (!storeId.match(/^store_[a-zA-Z0-9]+$/)) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Invalid Medusa Store ID format. Expected format: "store_XXXXX".',
    cause: 'INVALID_STORE_ID_FORMAT',
  });
}

// Database error handling
if (error) {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Failed to fetch orders from database: ${error.message}`,
    cause: error,
  });
}
```

## Testing Strategy

### ✅ **Recommended Test Cases**

1. **Multi-Tenancy Tests**:
   - Verify orders are filtered by storeId
   - Test cross-tenant access prevention
   - Validate storeId format enforcement

2. **Filtering Tests**:
   - Test all filter combinations
   - Validate date range filters
   - Test search functionality

3. **Pagination Tests**:
   - Test limit/offset combinations
   - Verify hasMore calculation
   - Test edge cases (empty results, single page)

4. **Error Handling Tests**:
   - Test invalid storeId formats
   - Test missing x-store-id header
   - Test database connection failures

## Performance Considerations

### ✅ **Optimization Strategies**

1. **Database Indexes**: Composite indexes on (store_id, status), (store_id, created_at)
2. **Query Optimization**: Efficient WHERE clauses with proper indexing
3. **Pagination**: Limit result sets to prevent large data transfers
4. **Caching**: Consider Redis caching for frequently accessed orders

### ✅ **Scalability Features**

1. **Multi-Tenant Isolation**: Efficient filtering by store_id
2. **Pagination Support**: Configurable limit/offset for large datasets
3. **Indexed Queries**: Database indexes for common filter combinations
4. **Soft Delete Support**: Exclude deleted records efficiently

## Next Steps

### ✅ **Implementation Complete**

Prompt 2.2 is fully implemented with:
- ✅ Protected tRPC procedure for listing orders
- ✅ Multi-tenancy enforcement through requireStore middleware
- ✅ Comprehensive Zod validation for input filters
- ✅ Service layer with database operations
- ✅ Integration into main app router

### 🔄 **Future Enhancements**

1. **Order Statistics**: Complete the `getStats` procedure implementation
2. **Order Creation**: Add procedures for creating new orders
3. **Order Updates**: Add procedures for updating order status
4. **Order Fulfillment**: Add procedures for fulfillment management
5. **Integration Tests**: Add comprehensive test coverage

## Conclusion

Prompt 2.2 has been successfully implemented, extending the multi-tenant architecture to order management operations. The implementation follows the same security patterns established in the product router, ensuring consistent multi-tenancy enforcement across all commerce operations.

The order router provides a solid foundation for order management with:
- **Security**: Multi-tenant isolation with context-based storeId
- **Type Safety**: Comprehensive Zod validation and TypeScript support
- **Performance**: Optimized database queries with proper indexing
- **Scalability**: Pagination and filtering support for large datasets
- **Maintainability**: Clear separation of concerns and error handling

This implementation completes the core order listing functionality and provides a template for future order management features.