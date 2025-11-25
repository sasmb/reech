# Bidirectional Store ID Translation System

**Status:** ✅ Complete  
**Date:** October 10, 2025  
**Version:** 1.0.0

---

## 📋 Overview

The **Bidirectional Store ID Translation System** enables seamless communication between the Reech Platform (UUID-based) and Medusa Commerce Platform (store_XXX format) while maintaining architectural independence for both systems.

### **Key Benefits**

- ✅ **Flexibility:** Clients can use EITHER UUID or Medusa Store ID format
- ✅ **Independence:** Reech and Medusa maintain separate ID formats
- ✅ **Security:** Authorization always uses UUID (consistent with store_members table)
- ✅ **Compatibility:** Works with existing Medusa integrations
- ✅ **Future-proof:** Easy to add more external system mappings

---

## 🏗️ Architecture

### **Two Independent Systems**

```
┌────────────────────────────────────────────────────────────────┐
│              REECH PLATFORM (Internal - UUID)                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Tenants table: id UUID                                      │
│  ✅ Store configs: store_id UUID                                │
│  ✅ Store members: store_id UUID (authorization)                │
│  ✅ All internal operations use UUID                            │
│                                                                 │
│  Mapping stored in: tenants.metadata.medusaStoreId              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│            MEDUSA PLATFORM (External - store_XXX)               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Medusa stores: id "store_01HQWE..."                         │
│  ✅ Products: store_id "store_01HQWE..."                        │
│  ✅ Orders: store_id "store_01HQWE..."                          │
│  ✅ All commerce operations use Medusa format                   │
│                                                                 │
│  Mapping stored in: store.metadata.tenantId                     │
└────────────────────────────────────────────────────────────────┘

                    BRIDGE: Translation Service
```

### **Translation Bridge**

The **Store ID Translator Service** acts as a bridge:
- Accepts BOTH ID formats from clients
- Normalizes to UUID for internal authorization
- Maintains bidirectional mapping via metadata
- Translates on-the-fly when needed

---

## 🔄 How It Works

### **Flow Diagram**

```
CLIENT REQUEST
    │
    │  x-store-id: "123e4567-..." (UUID)
    │  OR
    │  x-store-id: "store_01HQWE..." (Medusa)
    │
    ▼
┌────────────────────────────────────────┐
│  CONTEXT EXTRACTION                    │
│  - Extracts raw value from header      │
│  - No validation yet                   │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│  MIDDLEWARE: requireStore              │
│  1. Check authentication               │
│  2. Check x-store-id exists            │
│  3. Normalize & translate              │
│  4. Authorize (UUID-based)             │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│  TRANSLATOR SERVICE                    │
│  normalizeAndValidate()                │
│                                        │
│  If UUID:                              │
│    - Use directly                      │
│    - Lookup Medusa ID (optional)       │
│                                        │
│  If Medusa:                            │
│    - Translate to UUID (required)      │
│    - Keep Medusa ID                    │
│                                        │
│  Then:                                 │
│    - Authorize via store_members       │
│    - Return both IDs                   │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│  CONTEXT (Enriched)                    │
│  - storeid: UUID (always present)      │
│  - medusaStoreId: string|null          │
│  - user: authenticated user            │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│  PROCEDURE HANDLER                     │
│  - Use storeid for internal ops        │
│  - Use medusaStoreId for commerce      │
└────────────────────────────────────────┘
```

---

## 💻 Usage Examples

### **Example 1: Client Sends UUID (Reech Operations)**

```typescript
// Client request
fetch('/api/trpc/store.getConfig', {
  headers: {
    'x-store-id': '123e4567-e89b-12d3-a456-426614174000'  // ← UUID format
  }
});

// Middleware processes
// 1. Detects UUID format
// 2. Uses UUID directly for authorization
// 3. Optionally looks up Medusa ID from tenants.metadata

// Procedure receives
function handler({ ctx }) {
  console.log(ctx.storeid);       // "123e4567-e89b-12d3-a456-..."
  console.log(ctx.medusaStoreId); // "store_01HQWE..." or null
}
```

### **Example 2: Client Sends Medusa ID (Commerce Operations)**

```typescript
// Client request
fetch('/api/trpc/store.getProducts', {
  headers: {
    'x-store-id': 'store_01HQWE1234567890'  // ← Medusa format
  }
});

// Middleware processes
// 1. Detects Medusa format
// 2. Translates to UUID (queries tenants.metadata)
// 3. Uses UUID for authorization
// 4. Keeps Medusa ID for commerce operations

// Procedure receives
function handler({ ctx }) {
  console.log(ctx.storeid);       // "123e4567-e89b-12d3-a456-..."
  console.log(ctx.medusaStoreId); // "store_01HQWE1234567890"
}
```

### **Example 3: Using Both IDs in Procedures**

```typescript
export const getProducts = protectedProcedure
  .query(async ({ ctx }) => {
    // Option A: Use Reech internal database
    const reechProducts = await db.products
      .findMany({ where: { storeId: ctx.storeid } });  // ← UUID
    
    // Option B: Use Medusa commerce API
    if (ctx.medusaStoreId) {
      const medusaProducts = await medusaClient.products.list({
        store_id: ctx.medusaStoreId  // ← Medusa format
      });
      return medusaProducts;
    }
    
    return reechProducts;
  });
```

---

## 🔧 API Reference

### **StoreIdTranslatorService**

#### **normalizeAndValidate(storeId, userId)**

Primary function used by middleware to normalize and authorize store access.

```typescript
const { reechTenantId, medusaStoreId } = await storeIdTranslator.normalizeAndValidate(
  storeIdFromHeader,  // Either UUID or Medusa format
  userId              // Authenticated user's UUID
);
```

**Parameters:**
- `storeId: string` - Store ID from x-store-id header (either format)
- `userId: string` - Authenticated user's UUID

**Returns:**
```typescript
{
  reechTenantId: string;      // UUID (always present)
  medusaStoreId: string|null; // Medusa ID (may be null)
}
```

**Throws:**
- `UNAUTHORIZED` - User not authenticated
- `BAD_REQUEST` - Invalid ID format
- `FORBIDDEN` - User doesn't have access
- `NOT_FOUND` - Store doesn't exist

---

#### **reechToMedusa(reechTenantId)**

Translate Reech UUID → Medusa Store ID

```typescript
const medusaId = await storeIdTranslator.reechToMedusa(
  "123e4567-e89b-12d3-a456-426614174000"
);
// Returns: "store_01HQWE1234567890"
```

---

#### **medusaToReech(medusaStoreId)**

Translate Medusa Store ID → Reech UUID

```typescript
const reechId = await storeIdTranslator.medusaToReech(
  "store_01HQWE1234567890"
);
// Returns: "123e4567-e89b-12d3-a456-426614174000"
```

---

#### **createMapping(reechTenantId, medusaStoreId)**

Create bidirectional mapping between Reech and Medusa

```typescript
await storeIdTranslator.createMapping(
  "123e4567-e89b-12d3-a456-426614174000",
  "store_01HQWE1234567890"
);
```

---

#### **removeMapping(reechTenantId)**

Remove mapping between Reech and Medusa

```typescript
await storeIdTranslator.removeMapping(
  "123e4567-e89b-12d3-a456-426614174000"
);
```

---

#### **getFormat(storeId)**

Detect ID format type

```typescript
const format = storeIdTranslator.getFormat(storeId);
// Returns: 'uuid' | 'medusa' | 'unknown'
```

---

## 🗄️ Database Schema

### **Mapping Storage**

#### **Reech → Medusa** (Forward Mapping)

Stored in `tenants.metadata.medusaStoreId`:

```sql
-- tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  subdomain TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  ...
);

-- Example metadata
{
  "medusaStoreId": "store_01HQWE1234567890",
  "linkedAt": "2025-10-10T12:00:00.000Z"
}
```

#### **Index for Reverse Lookup**

```sql
-- GIN index enables fast Medusa → Reech translation
CREATE INDEX idx_tenants_metadata_medusa_store_id 
  ON tenants USING GIN ((metadata -> 'medusaStoreId'));
```

This index allows efficient queries like:
```sql
SELECT id FROM tenants 
WHERE metadata @> '{"medusaStoreId": "store_01HQWE1234567890"}';
```

---

## 🔐 Security

### **Authorization Always Uses UUID**

```typescript
// Regardless of which format client sends,
// authorization ALWAYS uses UUID

// Query store_members table
SELECT EXISTS (
  SELECT 1 FROM store_members
  WHERE user_id = $userId
    AND store_id = $reechTenantId  -- ← Always UUID
    AND is_active = true
);
```

### **Why This Matters**

1. **Consistency:** All authorization logic uses same format
2. **Performance:** Optimized indexes on UUID columns
3. **Security:** Single point of validation
4. **Maintainability:** Simpler authorization code

---

## 📊 Performance Considerations

### **Caching Strategy**

For high-traffic applications, consider caching translations:

```typescript
// Example: Redis cache for translations
const cacheKey = `store_id_mapping:${medusaStoreId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const reechId = await translator.medusaToReech(medusaStoreId);
await redis.set(cacheKey, JSON.stringify(reechId), 'EX', 3600);
```

### **Index Usage**

- **Forward lookup** (UUID → Medusa): Fast JSONB property access
- **Reverse lookup** (Medusa → UUID): Fast GIN index scan
- **Authorization**: Fast B-tree index on store_members(user_id, store_id)

---

## 🧪 Testing

### **Test Both Formats**

```typescript
describe('Store ID Translation', () => {
  it('should accept UUID format', async () => {
    const response = await fetch('/api/trpc/store.getConfig', {
      headers: { 'x-store-id': '123e4567-...' }
    });
    expect(response.status).toBe(200);
  });
  
  it('should accept Medusa format', async () => {
    const response = await fetch('/api/trpc/store.getConfig', {
      headers: { 'x-store-id': 'store_01HQWE...' }
    });
    expect(response.status).toBe(200);
  });
  
  it('should reject invalid format', async () => {
    const response = await fetch('/api/trpc/store.getConfig', {
      headers: { 'x-store-id': 'invalid-format' }
    });
    expect(response.status).toBe(400);
  });
});
```

---

## 🚀 Migration Guide

### **For Existing Projects**

If you're adding this to an existing project:

1. **Run migration** `003_add_store_members_table.sql`
2. **Create mappings** for existing tenants:

```typescript
// Script to create mappings for existing tenants
import { storeIdTranslator } from '@/server/services/store-id-translator.service';

async function migrateMappings() {
  const tenants = await db.tenants.findMany();
  
  for (const tenant of tenants) {
    // If tenant has Medusa store in legacy system
    const medusaStoreId = await getMedusaStoreForTenant(tenant.id);
    
    if (medusaStoreId) {
      await storeIdTranslator.createMapping(tenant.id, medusaStoreId);
    }
  }
}
```

3. **Update client code** to use either format
4. **Test thoroughly** with both formats

---

## 📝 Best Practices

### **When to Use Which Format**

| Use Case | Recommended Format | Reason |
|----------|-------------------|---------|
| Internal Reech operations | UUID | Native format, no translation needed |
| Medusa commerce operations | Medusa | Direct compatibility with Medusa API |
| Multi-system operations | Either | Translation is transparent |
| New tenant creation | UUID | Start with Reech format, add Medusa later |

### **Error Handling**

```typescript
try {
  const { reechTenantId, medusaStoreId } = await translator.normalizeAndValidate(
    storeId,
    userId
  );
} catch (error) {
  if (error.code === 'NO_MEDUSA_MAPPING') {
    // Tenant exists but has no Medusa store - this is OK
    // Proceed with Reech-only operations
  } else {
    // Real error - propagate
    throw error;
  }
}
```

---

## 🔮 Future Enhancements

### **Potential Improvements**

1. **Caching layer** for translation lookups
2. **Batch translation** for multiple IDs
3. **Webhook sync** to keep mappings updated
4. **Admin UI** for managing mappings
5. **Additional external systems** (Shopify, WooCommerce, etc.)

---

## 📚 Related Documentation

- [Database Migration 003](../infra/db/migrations/003_add_store_members_table.sql)
- [Store ID Translator Service](../server/services/store-id-translator.service.ts)
- [Middleware Implementation](../server/router/_middleware.ts)
- [Context Definition](../server/context.ts)

---

## ✅ Summary

The Bidirectional Store ID Translation System:

- ✅ **Accepts both UUID and Medusa Store ID formats**
- ✅ **Maintains architectural independence** for both systems
- ✅ **Ensures consistent security** via UUID-based authorization
- ✅ **Provides seamless translation** via metadata mapping
- ✅ **Scales efficiently** with proper indexing
- ✅ **Future-proof** for additional external systems

**Result:** Clients can use whichever ID format is convenient, and the system handles translation transparently!

---

**Last Updated:** October 10, 2025  
**Maintained By:** Reech Platform Team  
**Version:** 1.0.0



