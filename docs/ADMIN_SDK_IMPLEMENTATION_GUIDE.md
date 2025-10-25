# Admin SDK Implementation Guide

## Overview

This guide provides practical implementation examples for using the Admin JS SDK for store retrieval while maintaining proper separation from tenant-scoped data operations.

## Environment Setup

### 1. Install Dependencies

```bash
npm install @medusajs/medusa @medusajs/framework
```

### 2. Environment Variables

```env
# .env.local
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_API_KEY=your-admin-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

## Admin SDK Implementation

### 1. Admin SDK Client Setup

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

  // Store retrieval methods
  async getStores() {
    return await this.sdk.admin.store.list();
  }

  async getStore(storeId: string) {
    return await this.sdk.admin.store.retrieve(storeId);
  }

  async updateStore(storeId: string, updates: any) {
    return await this.sdk.admin.store.update(storeId, updates);
  }

  // Store module service methods
  async getStoreModuleService() {
    // This would be used in Medusa workflows
    // const storeModuleService = container.resolve(Modules.STORE);
    // return storeModuleService;
    throw new Error("Use in Medusa workflow context");
  }
}

export const adminSDK = new AdminSDKClient();
```

### 2. Admin Dashboard Implementation

```typescript
// app/admin/stores/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { adminSDK } from '@/lib/admin-sdk';

interface Store {
  id: string;
  name: string;
  default_sales_channel_id?: string;
  default_region_id?: string;
  supported_currencies?: any[];
  created_at: string;
  updated_at: string;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStores() {
      try {
        setLoading(true);
        const { stores } = await adminSDK.getStores();
        setStores(stores);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stores');
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, []);

  if (loading) return <div>Loading stores...</div>;
  if (error) return <div>Error: {error}</div>;

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

function StoreCard({ store }: { store: Store }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{store.name}</h3>
      <p className="text-sm text-gray-600">ID: {store.id}</p>
      <p className="text-sm text-gray-600">
        Created: {new Date(store.created_at).toLocaleDateString()}
      </p>
      <div className="mt-2">
        <a 
          href={`/admin/stores/${store.id}`}
          className="text-blue-600 hover:underline"
        >
          View Details
        </a>
      </div>
    </div>
  );
}
```

### 3. Store Details Page

```typescript
// app/admin/stores/[storeId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { adminSDK } from '@/lib/admin-sdk';

interface StoreDetails {
  id: string;
  name: string;
  default_sales_channel_id?: string;
  default_region_id?: string;
  supported_currencies?: any[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export default function StoreDetailsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        setLoading(true);
        const { store } = await adminSDK.getStore(storeId);
        setStore(store);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch store');
      } finally {
        setLoading(false);
      }
    }

    if (storeId) {
      fetchStore();
    }
  }, [storeId]);

  if (loading) return <div>Loading store details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!store) return <div>Store not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Store Details: {store.name}</h1>
      
      <div className="grid gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store ID</label>
              <p className="text-sm text-gray-900">{store.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <p className="text-sm text-gray-900">{store.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="text-sm text-gray-900">
                {new Date(store.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Updated</label>
              <p className="text-sm text-gray-900">
                {new Date(store.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Sales Channel</label>
              <p className="text-sm text-gray-900">
                {store.default_sales_channel_id || 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Region</label>
              <p className="text-sm text-gray-900">
                {store.default_region_id || 'Not set'}
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Supported Currencies</h2>
          {store.supported_currencies && store.supported_currencies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {store.supported_currencies.map((currency, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                >
                  {currency.currency_code}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No currencies configured</p>
          )}
        </div>

        <div className="flex gap-4">
          <a 
            href={`/admin/stores/${store.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Store
          </a>
          <a 
            href={`/stores/${store.id}`}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            View Store Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
```

## Tenant-Scoped Data Implementation

### 1. Protected API Client Setup

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

### 2. Store Dashboard Implementation

```typescript
// app/stores/[storeId]/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createStoreClient } from '@/lib/trpc-client';

export default function StoreDashboard() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStoreData() {
      try {
        setLoading(true);
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
        setError(err instanceof Error ? err.message : 'Failed to fetch store data');
      } finally {
        setLoading(false);
      }
    }

    if (storeId) {
      fetchStoreData();
    }
  }, [storeId]);

  if (loading) return <div>Loading store dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Store Dashboard: {storeConfig?.metadata?.name || 'Unknown Store'}
      </h1>
      
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Recent Products</h2>
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex justify-between">
                    <span className="text-sm">{product.title}</span>
                    <span className="text-sm text-gray-600">
                      ${(product.price_amount / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No products found</p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
            {orders.length > 0 ? (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex justify-between">
                    <span className="text-sm">{order.order_number}</span>
                    <span className="text-sm text-gray-600">
                      ${(order.total_amount / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No orders found</p>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Store Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <p className="text-sm text-gray-900">{storeConfig?.metadata?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <p className="text-sm text-gray-900">{storeConfig?.metadata?.currency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Locale</label>
              <p className="text-sm text-gray-900">{storeConfig?.metadata?.locale}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <p className="text-sm text-gray-900">{storeConfig?.metadata?.timezone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Hybrid Implementation (Admin + Store Context)

### 1. Admin Managing Specific Store

```typescript
// app/admin/stores/[storeId]/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { adminSDK } from '@/lib/admin-sdk';
import { createStoreClient } from '@/lib/trpc-client';

export default function AdminStoreManagement() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [store, setStore] = useState<any>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Use Admin SDK for store metadata
        const { store: storeMetadata } = await adminSDK.getStore(storeId);
        setStore(storeMetadata);

        // Use Protected API for store-specific business data
        const caller = createStoreClient(storeId);
        const [config, products, orders] = await Promise.all([
          caller.store.getConfig(),
          caller.product.listProducts({ limit: 20 }),
          caller.order.listOrders({ limit: 20 }),
        ]);

        setStoreData({ config, products, orders });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    if (storeId) {
      fetchData();
    }
  }, [storeId]);

  if (loading) return <div>Loading store management...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Admin - Store Management: {store?.name}
      </h1>
      
      <div className="grid gap-6">
        {/* Store metadata from Admin SDK */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Store Metadata (Admin SDK)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store ID</label>
              <p className="text-sm text-gray-900">{store?.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <p className="text-sm text-gray-900">{store?.name}</p>
            </div>
          </div>
        </div>

        {/* Business data from Protected API */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Products (Protected API)</h2>
            <p className="text-sm text-gray-600">
              Total: {storeData?.products?.count || 0} products
            </p>
            <div className="mt-2 space-y-1">
              {storeData?.products?.orders?.slice(0, 5).map((product: any) => (
                <div key={product.id} className="text-sm">
                  {product.title} - ${(product.price_amount / 100).toFixed(2)}
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Orders (Protected API)</h2>
            <p className="text-sm text-gray-600">
              Total: {storeData?.orders?.count || 0} orders
            </p>
            <div className="mt-2 space-y-1">
              {storeData?.orders?.orders?.slice(0, 5).map((order: any) => (
                <div key={order.id} className="text-sm">
                  {order.order_number} - ${(order.total_amount / 100).toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Store configuration from Protected API */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Store Configuration (Protected API)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <p className="text-sm text-gray-900">{storeData?.config?.metadata?.currency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Locale</label>
              <p className="text-sm text-gray-900">{storeData?.config?.metadata?.locale}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Best Practices

### 1. **Security Guidelines**

```typescript
// ✅ Correct: Use Admin SDK for store metadata only
const { store } = await adminSDK.getStore(storeId);
console.log(store.name, store.id); // Store metadata

// ❌ Incorrect: Never use Admin SDK for business data
const { products } = await adminSDK.getProducts(); // Security risk!

// ✅ Correct: Use Protected API for business data
const caller = createStoreClient(storeId);
const { data: products } = await caller.product.listProducts();
```

### 2. **Error Handling**

```typescript
// Admin SDK error handling
try {
  const { store } = await adminSDK.getStore(storeId);
  return store;
} catch (error) {
  if (error.status === 404) {
    throw new Error('Store not found');
  }
  throw new Error('Failed to retrieve store');
}

// Protected API error handling
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

### 3. **Type Safety**

```typescript
// Define types for Admin SDK responses
interface AdminStore {
  id: string;
  name: string;
  default_sales_channel_id?: string;
  default_region_id?: string;
  supported_currencies?: Array<{
    currency_code: string;
    is_default: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

// Define types for Protected API responses
interface StoreProducts {
  orders: Array<{
    id: string;
    title: string;
    price_amount: number;
    is_published: boolean;
  }>;
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

## Conclusion

This implementation guide demonstrates:

1. **Proper separation** between Admin SDK and Protected API usage
2. **Security best practices** for multi-tenant operations
3. **Practical examples** for common use cases
4. **Error handling** and type safety considerations

The key principle is: **Admin SDK for store metadata, Protected API for business data**. This ensures proper tenant isolation while allowing administrative operations.
