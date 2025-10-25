# Admin JS SDK Store Retrieval Documentation

## Overview

This document explains how to use the Admin JS SDK for retrieving store information and clarifies the distinction between global store retrieval and tenant-scoped data retrieval. Understanding this distinction is crucial for implementing proper multi-tenancy and security in the application.

## Key Concepts

### 1. Global Store Retrieval (Admin SDK)
- **Purpose**: Retrieve store metadata and configuration at the admin level
- **Scope**: Global access across all stores (based on admin permissions)
- **Use Case**: Admin operations, store management, system configuration
- **Security**: Based on admin authentication and permissions

### 2. Tenant-Scoped Data Retrieval (Protected API)
- **Purpose**: Retrieve business data (products, orders, customers) within a specific store
- **Scope**: Limited to a single store/tenant
- **Use Case**: Store-specific operations, customer-facing functionality
- **Security**: Based on store authentication and multi-tenancy enforcement

## Admin JS SDK Store Retrieval Methods

### 1. IStoreModuleService Methods

The `IStoreModuleService` provides core store management functionality:

#### `listStores(filters?, config?, sharedContext?)`
```typescript
import { Modules } from "@medusajs/framework/utils";

// Get all stores
const stores = await storeModuleService.listStores();

// Get stores with filters
const stores = await storeModuleService.listStores({
  name: ["Acme Store", "Demo Store"]
});

// Get stores with pagination
const stores = await storeModuleService.listStores(
  {}, // filters
  {
    take: 10,
    skip: 0
  }
);
```

#### `listAndCountStores(filters?, config?, sharedContext?)`
```typescript
// Get stores with total count
const [stores, count] = await storeModuleService.listAndCountStores({
  name: ["Acme Store"]
});

console.log(`Found ${count} stores`);
console.log(stores);
```

#### `retrieveStore(id, config?, sharedContext?)`
```typescript
// Get a specific store by ID
const store = await storeModuleService.retrieveStore("store_123");
```

### 2. Admin JS SDK Methods

The Admin JS SDK provides high-level store retrieval methods:

#### `sdk.admin.store.retrieve(id, query?, headers?)`
```typescript
import { Medusa } from "@medusajs/medusa";

const sdk = new Medusa({
  baseUrl: "http://localhost:9000",
  apiKey: "your-admin-api-key"
});

// Retrieve a specific store
const { store } = await sdk.admin.store.retrieve("store_123");

// Retrieve with specific fields and relations
const { store } = await sdk.admin.store.retrieve("store_123", {
  fields: "id,*supported_currencies"
});
```

#### `sdk.admin.store.list(query?, headers?)`
```typescript
// List all stores
const { stores, count, limit, offset } = await sdk.admin.store.list();

// List with pagination
const { stores } = await sdk.admin.store.list({
  limit: 10,
  offset: 10
});

// List with field selection
const { stores } = await sdk.admin.store.list({
  fields: "id,*supported_currencies"
});
```

## Usage Examples

### 1. Admin Store Management

```typescript
// Admin dashboard - list all stores
export async function getAdminStores() {
  const sdk = new Medusa({
    baseUrl: process.env.MEDUSA_BACKEND_URL,
    apiKey: process.env.MEDUSA_ADMIN_API_KEY
  });

  try {
    const { stores, count } = await sdk.admin.store.list({
      limit: 50,
      offset: 0
    });

    return {
      stores,
      totalCount: count,
      hasMore: stores.length === 50
    };
  } catch (error) {
    console.error('Failed to retrieve stores:', error);
    throw new Error('Store retrieval failed');
  }
}

// Admin store details page
export async function getAdminStoreDetails(storeId: string) {
  const sdk = new Medusa({
    baseUrl: process.env.MEDUSA_BACKEND_URL,
    apiKey: process.env.MEDUSA_ADMIN_API_KEY
  });

  try {
    const { store } = await sdk.admin.store.retrieve(storeId, {
      fields: "id,name,default_sales_channel_id,default_region_id,*supported_currencies"
    });

    return store;
  } catch (error) {
    console.error(`Failed to retrieve store ${storeId}:`, error);
    throw new Error('Store not found');
  }
}
```

### 2. Store Configuration Management

```typescript
// Update store configuration
export async function updateStoreConfiguration(storeId: string, updates: any) {
  const sdk = new Medusa({
    baseUrl: process.env.MEDUSA_BACKEND_URL,
    apiKey: process.env.MEDUSA_ADMIN_API_KEY
  });

  try {
    const { store } = await sdk.admin.store.update(storeId, updates);
    return store;
  } catch (error) {
    console.error(`Failed to update store ${storeId}:`, error);
    throw new Error('Store update failed');
  }
}
```

## Critical Distinction: Global vs Tenant-Scoped Data

### ❌ **WRONG: Using Admin SDK for Tenant-Scoped Data**

```typescript
// ❌ NEVER do this - bypasses multi-tenancy
const sdk = new Medusa({ baseUrl: "...", apiKey: "..." });

// This would give admin access to ALL products across ALL stores
const { products } = await sdk.admin.product.list(); // ❌ Security risk
```

### ✅ **CORRECT: Using Protected API for Tenant-Scoped Data**

```typescript
// ✅ ALWAYS use protected API procedures for tenant-scoped data
import { trpc } from '@/lib/trpc';

// This enforces store isolation through x-store-id header
const { data: products } = await trpc.product.listProducts.useQuery({
  status: 'published',
  limit: 20
});

// This enforces store isolation through x-store-id header
const { data: orders } = await trpc.order.listOrders.useQuery({
  status: 'confirmed',
  limit: 20
});
```

## Security Architecture

### 1. Admin SDK Security Model

```typescript
// Admin SDK requires admin authentication
const sdk = new Medusa({
  baseUrl: process.env.MEDUSA_BACKEND_URL,
  apiKey: process.env.MEDUSA_ADMIN_API_KEY // ← Admin-level access
});

// Can access ALL stores (based on admin permissions)
const { stores } = await sdk.admin.store.list();
```

**Security Characteristics:**
- **Authentication**: Admin API key
- **Authorization**: Admin-level permissions
- **Scope**: Global access to all stores
- **Use Case**: Administrative operations, system management

### 2. Protected API Security Model

```typescript
// Protected API requires store authentication
const caller = trpc.createCaller({
  req: { headers: { 'x-store-id': 'store_123' } } // ← Store-specific access
});

// Can ONLY access data for store_123
const { data: products } = await caller.product.listProducts();
```

**Security Characteristics:**
- **Authentication**: Store ID via `x-store-id` header
- **Authorization**: Store-specific permissions
- **Scope**: Limited to single store/tenant
- **Use Case**: Store operations, customer-facing functionality

## Implementation Patterns

### 1. Admin Dashboard Pattern

```typescript
// Admin dashboard - global store overview
export async function getAdminDashboard() {
  const sdk = new Medusa({
    baseUrl: process.env.MEDUSA_BACKEND_URL,
    apiKey: process.env.MEDUSA_ADMIN_API_KEY
  });

  // Get all stores for admin overview
  const { stores } = await sdk.admin.store.list();
  
  // Get store statistics (admin-level)
  const storeStats = await Promise.all(
    stores.map(async (store) => {
      // Use admin SDK for global statistics
      const stats = await getStoreStatistics(store.id);
      return { ...store, stats };
    })
  );

  return storeStats;
}
```

### 2. Store-Specific Operations Pattern

```typescript
// Store-specific operations - tenant isolation
export async function getStoreDashboard(storeId: string) {
  // Use protected API for store-specific data
  const caller = trpc.createCaller({
    req: { headers: { 'x-store-id': storeId } }
  });

  // Get store-specific data with proper isolation
  const [products, orders, storeConfig] = await Promise.all([
    caller.product.listProducts({ limit: 10 }),
    caller.order.listOrders({ limit: 10 }),
    caller.store.getConfig()
  ]);

  return {
    products,
    orders,
    storeConfig
  };
}
```

### 3. Hybrid Pattern (Admin + Store Context)

```typescript
// Admin managing specific store - hybrid approach
export async function getAdminStoreManagement(storeId: string) {
  const sdk = new Medusa({
    baseUrl: process.env.MEDUSA_BACKEND_URL,
    apiKey: process.env.MEDUSA_ADMIN_API_KEY
  });

  // Use Admin SDK for store metadata
  const { store } = await sdk.admin.store.retrieve(storeId);
  
  // Use protected API for store-specific data (with admin context)
  const caller = trpc.createCaller({
    req: { headers: { 'x-store-id': storeId } }
  });

  const [products, orders] = await Promise.all([
    caller.product.listProducts({ limit: 50 }),
    caller.order.listOrders({ limit: 50 })
  ]);

  return {
    store, // From Admin SDK
    products, // From protected API
    orders    // From protected API
  };
}
```

## Best Practices

### 1. **Use Admin SDK for:**
- Store metadata retrieval
- Store configuration management
- Admin dashboard operations
- System-level store operations
- Cross-store analytics (admin level)

### 2. **Use Protected API for:**
- Product catalog operations
- Order management
- Customer data
- Store-specific analytics
- Tenant-isolated operations

### 3. **Security Guidelines:**
- Never use Admin SDK for tenant-scoped data
- Always use protected API procedures for business data
- Ensure `x-store-id` header is present for tenant operations
- Validate store permissions at the API level

### 4. **Error Handling:**
```typescript
// Admin SDK error handling
try {
  const { store } = await sdk.admin.store.retrieve(storeId);
  return store;
} catch (error) {
  if (error.status === 404) {
    throw new Error('Store not found');
  }
  throw new Error('Failed to retrieve store');
}

// Protected API error handling
try {
  const { data: products } = await trpc.product.listProducts.useQuery();
  return products;
} catch (error) {
  if (error.data?.code === 'UNAUTHORIZED') {
    throw new Error('Store access denied');
  }
  throw new Error('Failed to retrieve products');
}
```

## Migration Considerations

### From Legacy to Multi-Tenant

```typescript
// Legacy approach (single-tenant)
const products = await productService.getAllProducts();

// New approach (multi-tenant)
const caller = trpc.createCaller({
  req: { headers: { 'x-store-id': storeId } }
});
const { data: products } = await caller.product.listProducts();
```

### Admin vs Store Context

```typescript
// Admin context - global access
const adminStores = await sdk.admin.store.list();

// Store context - tenant isolation
const storeProducts = await caller.product.listProducts();
```

## Conclusion

Understanding the distinction between Admin SDK store retrieval and tenant-scoped data retrieval is essential for:

1. **Security**: Preventing unauthorized cross-tenant data access
2. **Architecture**: Maintaining proper separation of concerns
3. **Scalability**: Supporting multi-tenant operations efficiently
4. **Compliance**: Meeting data isolation requirements

**Key Takeaways:**
- Admin SDK: Use for global store management and metadata
- Protected API: Use for tenant-scoped business data
- Security: Always enforce store isolation for business data
- Architecture: Maintain clear separation between admin and tenant operations

This architecture ensures that while administrators can manage stores globally, all business data remains properly isolated within tenant boundaries.
