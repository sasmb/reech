# Prompt 4.2: Admin SDK Store Retrieval Documentation - COMPLETE

## Overview

**Prompt 4.2** has been successfully completed, documenting how the Admin JS SDK can be used to retrieve stores and clarifying the critical distinction between global store retrieval and tenant-scoped data retrieval. This documentation ensures proper understanding of multi-tenant security boundaries and implementation patterns.

## Implementation Summary

### ✅ **Core Requirements Met**

1. **Store Retrieval Documentation**: Documented available methods for retrieving stores using Admin JS SDK
2. **IStoreModuleService Methods**: Documented `listStores` and `listAndCountStores` methods with optional filters
3. **Admin JS SDK Methods**: Documented `sdk.admin.store.retrieve("store_123")` and `sdk.admin.store.list()` methods
4. **Security Clarification**: Emphasized distinction between global store retrieval and tenant-scoped data retrieval
5. **Implementation Examples**: Provided comprehensive usage examples and best practices

### ✅ **Files Created**

#### **New Documentation Files:**
- `docs/ADMIN_SDK_STORE_RETRIEVAL.md` - Comprehensive documentation of Admin SDK store retrieval methods
- `docs/ADMIN_SDK_ARCHITECTURE_DIAGRAM.md` - Visual architecture diagram showing system boundaries
- `docs/ADMIN_SDK_IMPLEMENTATION_GUIDE.md` - Practical implementation guide with code examples
- `docs/PHASE_1_PROMPT_4.2_COMPLETE.md` - This completion summary document

## Detailed Implementation

### 1. Admin SDK Store Retrieval Methods

#### **IStoreModuleService Methods**
```typescript
// List all stores
const stores = await storeModuleService.listStores();

// List stores with filters
const stores = await storeModuleService.listStores({
  name: ["Acme Store", "Demo Store"]
});

// List stores with pagination and count
const [stores, count] = await storeModuleService.listAndCountStores({
  name: ["Acme Store"]
}, {
  take: 10,
  skip: 0
});

// Retrieve specific store
const store = await storeModuleService.retrieveStore("store_123");
```

#### **Admin JS SDK Methods**
```typescript
import { Medusa } from "@medusajs/medusa";

const sdk = new Medusa({
  baseUrl: "http://localhost:9000",
  apiKey: "your-admin-api-key"
});

// Retrieve specific store
const { store } = await sdk.admin.store.retrieve("store_123");

// Retrieve with specific fields and relations
const { store } = await sdk.admin.store.retrieve("store_123", {
  fields: "id,*supported_currencies"
});

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

### 2. Critical Security Distinction

#### **Global Store Retrieval (Admin SDK)**
- **Purpose**: Retrieve store metadata and configuration at the admin level
- **Scope**: Global access across all stores (based on admin permissions)
- **Use Case**: Admin operations, store management, system configuration
- **Security**: Based on admin authentication and permissions
- **Authentication**: Admin API Key
- **Authorization**: Admin-level permissions
- **Scope**: Global access to all stores

#### **Tenant-Scoped Data Retrieval (Protected API)**
- **Purpose**: Retrieve business data (products, orders, customers) within a specific store
- **Scope**: Limited to a single store/tenant
- **Use Case**: Store operations, customer-facing functionality
- **Security**: Based on store authentication and multi-tenancy enforcement
- **Authentication**: Store ID via `x-store-id` header
- **Authorization**: Store-specific permissions
- **Scope**: Limited to single store/tenant

### 3. Security Architecture

#### **Admin Layer Security Boundary**
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

#### **Tenant Layer Security Boundary**
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

### 4. Implementation Patterns

#### **Admin Dashboard Pattern**
```typescript
// Admin dashboard - global store overview
export async function getAdminDashboard() {
  const sdk = new Medusa({
    baseUrl: process.env.MEDUSA_BACKEND_URL,
    apiKey: process.env.MEDUSA_ADMIN_API_KEY
  });

  // Get all stores for admin overview
  const { stores } = await sdk.admin.store.list();
  
  return stores;
}
```

#### **Store-Specific Operations Pattern**
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

  return { products, orders, storeConfig };
}
```

#### **Hybrid Pattern (Admin + Store Context)**
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

  return { store, products, orders };
}
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

## Best Practices

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

## Security Guidelines

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

## Implementation Examples

### 1. **Admin SDK Client Setup**
```typescript
// lib/admin-sdk.ts
import { Medusa } from "@medusajs/medusa";

export class AdminSDKClient {
  private sdk: Medusa;

  constructor() {
    this.sdk = new Medusa({
      baseUrl: process.env.MEDUSA_BACKEND_URL!,
      apiKey: process.env.MEDUSA_ADMIN_API_KEY!,
    });
  }

  async getStores() {
    return await this.sdk.admin.store.list();
  }

  async getStore(storeId: string) {
    return await this.sdk.admin.store.retrieve(storeId);
  }

  async updateStore(storeId: string, updates: any) {
    return await this.sdk.admin.store.update(storeId, updates);
  }
}

export const adminSDK = new AdminSDKClient();
```

### 2. **Protected API Client Setup**
```typescript
// lib/trpc-client.ts
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          async headers() {
            return {
              // Store ID will be set by the calling component
            };
          },
        }),
      ],
    };
  },
  ssr: false,
});

// Store-specific client factory
export function createStoreClient(storeId: string) {
  return trpc.createCaller({
    req: { headers: { 'x-store-id': storeId } },
  });
}
```

### 3. **Admin Dashboard Implementation**
```typescript
// app/admin/stores/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { adminSDK } from '@/lib/admin-sdk';

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const { stores } = await adminSDK.getStores();
        setStores(stores);
      } catch (err) {
        console.error('Failed to fetch stores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, []);

  if (loading) return <div>Loading stores...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin - Store Management</h1>
      
      <div className="grid gap-4">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
}
```

### 4. **Store Dashboard Implementation**
```typescript
// app/stores/[storeId]/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createStoreClient } from '@/lib/trpc-client';

export default function StoreDashboard() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [storeConfig, setStoreConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchStoreData() {
      try {
        const caller = createStoreClient(storeId);

        // Fetch store-specific data using protected API
        const [config, productsData, ordersData] = await Promise.all([
          caller.store.getConfig(),
          caller.product.listProducts({ limit: 10 }),
          caller.order.listOrders({ limit: 10 }),
        ]);

        setStoreConfig(config);
        setProducts(productsData.orders || []);
        setOrders(ordersData.orders || []);
      } catch (err) {
        console.error('Failed to fetch store data:', err);
      }
    }

    if (storeId) {
      fetchStoreData();
    }
  }, [storeId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Store Dashboard: {storeConfig?.metadata?.name || 'Unknown Store'}
      </h1>
      
      {/* Store-specific content */}
    </div>
  );
}
```

## Error Handling

### **Admin SDK Error Handling**
```typescript
try {
  const { store } = await adminSDK.getStore(storeId);
  return store;
} catch (error) {
  if (error.status === 404) {
    throw new Error('Store not found');
  }
  throw new Error('Failed to retrieve store');
}
```

### **Protected API Error Handling**
```typescript
try {
  const caller = createStoreClient(storeId);
  const { data: products } = await caller.product.listProducts();
  return products;
} catch (error) {
  if (error.data?.code === 'UNAUTHORIZED') {
    throw new Error('Store access denied');
  }
  throw new Error('Failed to retrieve products');
}
```

## Migration Considerations

### **From Legacy to Multi-Tenant**
```typescript
// Legacy approach (single-tenant)
const products = await productService.getAllProducts();

// New approach (multi-tenant)
const caller = trpc.createCaller({
  req: { headers: { 'x-store-id': storeId } }
});
const { data: products } = await caller.product.listProducts();
```

### **Admin vs Store Context**
```typescript
// Admin context - global access
const adminStores = await sdk.admin.store.list();

// Store context - tenant isolation
const storeProducts = await caller.product.listProducts();
```

## Conclusion

Prompt 4.2 has been successfully completed, providing comprehensive documentation for:

1. **Admin SDK Store Retrieval**: Complete documentation of available methods and usage patterns
2. **Security Distinction**: Clear explanation of global vs tenant-scoped data retrieval
3. **Implementation Examples**: Practical code examples for common use cases
4. **Best Practices**: Security guidelines and error handling patterns
5. **Architecture Diagrams**: Visual representation of system boundaries

### **Key Takeaways:**

- **Admin SDK**: Use for global store management and metadata
- **Protected API**: Use for tenant-scoped business data
- **Security**: Always enforce store isolation for business data
- **Architecture**: Maintain clear separation between admin and tenant operations

This documentation ensures that while administrators can manage stores globally, all business data remains properly isolated within tenant boundaries, maintaining the security and integrity of the multi-tenant system.

## Next Steps

The documentation is complete and ready for use. Future enhancements could include:

1. **Integration Tests**: Add tests for Admin SDK and Protected API interactions
2. **Performance Optimization**: Document caching strategies for store metadata
3. **Advanced Features**: Document store creation, updates, and deletion workflows
4. **Monitoring**: Add logging and monitoring for admin operations
