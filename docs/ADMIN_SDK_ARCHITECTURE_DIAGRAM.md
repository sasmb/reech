# Admin SDK vs Protected API Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-TENANT COMMERCE SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │        ADMIN LAYER              │    │        TENANT LAYER                 │ │
│  │                                 │    │                                     │ │
│  │  ┌─────────────────────────┐    │    │  ┌─────────────────────────────┐    │ │
│  │  │   Admin JS SDK          │    │    │  │   Protected tRPC API        │    │ │
│  │  │                         │    │    │  │                             │    │ │
│  │  │  • sdk.admin.store      │    │    │  │  • trpc.store.getConfig     │    │ │
│  │  │  • sdk.admin.product    │    │    │  │  • trpc.product.listProducts│    │ │
│  │  │  • sdk.admin.order      │    │    │  │  • trpc.order.listOrders    │    │ │
│  │  │                         │    │    │  │                             │    │ │
│  │  │  Authentication:        │    │    │  │  Authentication:             │    │ │
│  │  │  • Admin API Key        │    │    │  │  • x-store-id header        │    │ │
│  │  │  • Global permissions   │    │    │  │  • Store-specific context   │    │ │
│  │  └─────────────────────────┘    │    │  └─────────────────────────────┘    │ │
│  │                                 │    │                                     │ │
│  │  ┌─────────────────────────┐    │    │  ┌─────────────────────────────┐    │ │
│  │  │   IStoreModuleService   │    │    │  │   Service Layer             │    │ │
│  │  │                         │    │    │  │                             │    │ │
│  │  │  • listStores()         │    │    │  │  • StoreService             │    │ │
│  │  │  • retrieveStore()      │    │    │  │  • ProductService           │    │ │
│  │  │  • updateStores()       │    │    │  │  • OrderService             │    │ │
│  │  │                         │    │    │  │                             │    │ │
│  │  │  Scope: Global          │    │    │  │  Scope: Tenant-isolated     │    │ │
│  │  └─────────────────────────┘    │    │  └─────────────────────────────┘    │ │
│  └─────────────────────────────────┘    └─────────────────────────────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              DATABASE LAYER                                    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           SUPABASE DATABASE                                 │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │ │
│  │  │   stores        │  │   products      │  │         orders              │ │ │
│  │  │                 │  │                 │  │                             │ │ │
│  │  │  • id           │  │  • id           │  │  • id                       │ │ │
│  │  │  • name         │  │  • store_id     │  │  • store_id                 │ │ │
│  │  │  • metadata     │  │  • title        │  │  • order_number             │ │ │
│  │  │  • created_at   │  │  • price        │  │  • customer_email           │ │ │
│  │  │  • updated_at   │  │  • is_published │  │  • total_amount             │ │ │
│  │  │                 │  │  • created_at   │  │  • status                   │ │ │
│  │  │                 │  │  • updated_at   │  │  • created_at               │ │ │
│  │  │                 │  │                 │  │  • updated_at               │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │ │
│  │                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    store_configs                                       │ │ │
│  │  │                                                                       │ │ │
│  │  │  • store_id (FK to stores.id)                                        │ │ │
│  │  │  • config (JSONB)                                                    │ │ │
│  │  │  • version                                                           │ │ │
│  │  │  • created_at                                                        │ │ │
│  │  │  • updated_at                                                        │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Patterns

### 1. Admin Store Retrieval (Global Access)

```
Admin Dashboard
       │
       ▼
┌─────────────────┐
│  Admin JS SDK   │
│                 │
│  sdk.admin.store│
│  .list()        │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ IStoreModule    │
│ Service         │
│                 │
│ listStores()    │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│   Supabase      │
│                 │
│ SELECT * FROM   │
│ stores          │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  All Stores     │
│  (Global)       │
└─────────────────┘
```

### 2. Tenant-Scoped Data Retrieval (Isolated Access)

```
Store Dashboard
       │
       ▼
┌─────────────────┐
│ Protected tRPC  │
│ API             │
│                 │
│ trpc.product    │
│ .listProducts() │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ requireStore    │
│ Middleware      │
│                 │
│ Validates       │
│ x-store-id      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ ProductService  │
│                 │
│ findProducts    │
│ ForStore()      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│   Supabase      │
│                 │
│ SELECT * FROM   │
│ products WHERE  │
│ store_id = ?    │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Store-specific  │
│ Products Only   │
│ (Isolated)      │
└─────────────────┘
```

## Security Boundaries

### Admin Layer Security
```
┌─────────────────────────────────────────────────────────┐
│                 ADMIN SECURITY BOUNDARY                 │
│                                                         │
│  • Authentication: Admin API Key                       │
│  • Authorization: Global admin permissions             │
│  • Scope: Access to ALL stores and metadata            │
│  • Use Case: System administration, store management   │
│                                                         │
│  ✅ Can access: Store metadata, configurations         │
│  ❌ Should NOT access: Tenant business data            │
└─────────────────────────────────────────────────────────┘
```

### Tenant Layer Security
```
┌─────────────────────────────────────────────────────────┐
│                TENANT SECURITY BOUNDARY                 │
│                                                         │
│  • Authentication: x-store-id header                   │
│  • Authorization: Store-specific permissions           │
│  • Scope: Access to SINGLE store's business data       │
│  • Use Case: Store operations, customer interactions   │
│                                                         │
│  ✅ Can access: Own store's products, orders, customers│
│  ❌ Cannot access: Other stores' data                  │
└─────────────────────────────────────────────────────────┘
```

## Key Differences Summary

| Aspect | Admin SDK | Protected API |
|--------|-----------|---------------|
| **Authentication** | Admin API Key | x-store-id header |
| **Scope** | Global (all stores) | Tenant (single store) |
| **Permissions** | Admin-level | Store-specific |
| **Use Case** | System administration | Business operations |
| **Data Access** | Store metadata | Business data |
| **Security Model** | Role-based | Tenant-isolated |
| **Multi-tenancy** | Bypasses isolation | Enforces isolation |

## Implementation Guidelines

### ✅ **Correct Usage Patterns**

```typescript
// 1. Admin Dashboard - Global Store Overview
const sdk = new Medusa({ apiKey: ADMIN_KEY });
const { stores } = await sdk.admin.store.list();

// 2. Store Management - Admin Operations
const { store } = await sdk.admin.store.retrieve(storeId);
const { store: updatedStore } = await sdk.admin.store.update(storeId, updates);

// 3. Tenant Operations - Business Data
const caller = trpc.createCaller({ req: { headers: { 'x-store-id': storeId } } });
const { data: products } = await caller.product.listProducts();
const { data: orders } = await caller.order.listOrders();
```

### ❌ **Incorrect Usage Patterns**

```typescript
// ❌ NEVER use Admin SDK for tenant-scoped data
const { products } = await sdk.admin.product.list(); // Security risk!

// ❌ NEVER bypass store isolation
const products = await productService.getAllProducts(); // No tenant context!

// ❌ NEVER accept storeId from client
const { data } = await trpc.product.listProducts.useQuery({ storeId: 'store_123' }); // Client can spoof!
```

## Migration Path

### From Single-Tenant to Multi-Tenant

```
Before (Single-Tenant):
┌─────────────────┐
│   Application   │
│                 │
│  getAllProducts │
│  getAllOrders   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│                 │
│  products       │
│  orders         │
└─────────────────┘

After (Multi-Tenant):
┌─────────────────┐
│   Application   │
│                 │
│  Admin SDK      │
│  Protected API  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│                 │
│  stores         │
│  products       │
│  orders         │
│  store_configs  │
└─────────────────┘
```

This architecture ensures proper separation of concerns, security, and scalability for multi-tenant commerce operations.
