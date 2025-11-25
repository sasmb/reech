# Database Architecture Plan - Multi-Tenant Data Isolation

## 📋 Overview

This document outlines the implementation plan for enforcing tenant data isolation at the database layer using Supabase (PostgreSQL) with Row Level Security (RLS).

## 🎯 Goals

1. **Structural Prevention**: Database schema prevents cross-tenant data access
2. **Performance Optimization**: Efficient queries with proper indexing for multi-tenant workloads
3. **Security Enforcement**: RLS policies enforce tenant boundaries at database level
4. **Scalability**: Architecture supports unlimited tenant growth

## 🏗️ Architecture Model

### Isolation Strategy: **Shared Tables with Mandatory `store_id`**

**Why this approach:**
- ✅ Cost-effective (single database, shared infrastructure)
- ✅ Simpler operations (single schema, unified backups)
- ✅ Better resource utilization
- ✅ Easier to add features across all tenants
- ✅ Supabase RLS provides excellent security isolation

**Alternatives considered:**
- ❌ Separate database per tenant (expensive, complex operations)
- ❌ Separate schema per tenant (still complex, migration overhead)

## 📊 Database Schema Structure

### Core Principles

1. **Every tenant table MUST have `store_id` column**
2. **`store_id` is NON-NULLABLE (UUID)**
3. **Composite indexes start with `store_id`**
4. **RLS policies enforce `store_id` filtering**
5. **Foreign keys respect tenant boundaries**

### Table Categories

#### 1. Tenant Tables (require `store_id`)
- `store_configs` - Store configuration (1:1 with tenant)
- `products` - Product catalog
- `product_variants` - Product variations
- `product_images` - Product media
- `product_categories` - Category hierarchy
- `orders` - Customer orders
- `order_line_items` - Order details
- `users` - Tenant-specific users
- `customers` - Customer data

#### 2. Global Tables (no `store_id`)
- `tenants` - Tenant registry
- `auth.users` - Supabase auth users (shared)
- `audit_logs` - System-wide audit trail

## 🔧 Implementation Tasks

### Task 1: Create Directory Structure ✅
```
infra/
└── db/
    ├── migrations/          # Supabase SQL migrations
    ├── schema/              # Schema definitions
    │   ├── 00_base.sql     # Base tables and types
    │   ├── 01_tenants.sql  # Tenant management
    │   ├── 02_products.sql # Product tables
    │   ├── 03_orders.sql   # Order tables
    │   └── 04_rls.sql      # RLS policies
    ├── seed/                # Seed data for development
    └── README.md            # Database documentation
```

### Task 2: Define Base Schema
```sql
-- All tenant tables follow this pattern:
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- ... other columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for efficient tenant queries
CREATE INDEX idx_table_name_store_id_id ON table_name(store_id, id);

-- Additional indexes
CREATE INDEX idx_table_name_created_at ON table_name(store_id, created_at DESC);
```

### Task 3: Implement RLS Policies
```sql
-- Enable RLS on all tenant tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their store's data
CREATE POLICY "tenant_isolation_policy" ON table_name
  FOR ALL
  USING (store_id = auth.uid()::uuid OR store_id = current_setting('app.current_store_id')::uuid);
```

### Task 4: Indexing Strategy

#### Primary Indexes (MUST HAVE)
```sql
-- Composite index on (store_id, id) for every tenant table
CREATE INDEX idx_{table}_store_id_id ON {table}(store_id, id);
```

#### Performance Indexes (RECOMMENDED)
```sql
-- Common query patterns
CREATE INDEX idx_{table}_store_id_created_at ON {table}(store_id, created_at DESC);
CREATE INDEX idx_{table}_store_id_status ON {table}(store_id, status) WHERE status IS NOT NULL;
CREATE INDEX idx_{table}_store_id_search ON {table}(store_id, (name || ' ' || description)) 
  USING GIN (to_tsvector('english', name || ' ' || description));
```

### Task 5: Unique Constraints

#### Store Configs (1:1 relationship)
```sql
CREATE TABLE store_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one config per store
CREATE UNIQUE INDEX idx_store_configs_store_id ON store_configs(store_id);
```

## 🔐 Security Considerations

### 1. RLS Enforcement
- ✅ All tenant tables have RLS enabled
- ✅ Policies check `store_id` matches authenticated context
- ✅ No queries bypass RLS (even from service role in production)

### 2. Foreign Key Constraints
```sql
-- Bad: Can reference data from other tenants
FOREIGN KEY (product_id) REFERENCES products(id)

-- Good: Ensures FK stays within tenant
FOREIGN KEY (store_id, product_id) 
  REFERENCES products(store_id, id)
```

### 3. Audit Trail
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger on all tenant tables
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON {table}
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
```

## 📈 Performance Considerations

### Query Patterns
All queries MUST include `store_id` in WHERE clause:

```sql
-- ✅ GOOD - Uses composite index efficiently
SELECT * FROM products 
WHERE store_id = $1 AND status = 'active'
ORDER BY created_at DESC;

-- ❌ BAD - Missing store_id, could leak data
SELECT * FROM products WHERE id = $1;

-- ✅ GOOD - Even for single record
SELECT * FROM products 
WHERE store_id = $1 AND id = $2;
```

### Index Usage Monitoring
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

## 🧪 Testing Strategy

### 1. Isolation Tests
```sql
-- Verify RLS prevents cross-tenant access
SET app.current_store_id = 'store-a-uuid';
SELECT * FROM products; -- Should only return store A products

SET app.current_store_id = 'store-b-uuid';
SELECT * FROM products; -- Should only return store B products
```

### 2. Performance Tests
```sql
-- Verify indexes are used
EXPLAIN ANALYZE
SELECT * FROM products
WHERE store_id = $1 AND status = 'active'
LIMIT 20;

-- Should show "Index Scan" using composite index
```

### 3. Constraint Tests
```sql
-- Verify foreign keys enforce tenant boundaries
INSERT INTO order_line_items (store_id, order_id, product_id)
VALUES ('store-a-uuid', 'order-a-uuid', 'product-b-uuid');
-- Should fail: product_b belongs to store B
```

## 📝 Migration Strategy

### Initial Setup (New Project)
1. Create base tables with `store_id` from the start
2. Add RLS policies immediately
3. Seed test data for multiple tenants

### Existing Project (If Applicable)
1. Add `store_id` column (nullable initially)
2. Backfill `store_id` from existing data
3. Make `store_id` NOT NULL
4. Add indexes and constraints
5. Enable RLS
6. Test thoroughly
7. Deploy

## 🚀 Deployment Checklist

- [ ] All tenant tables have `store_id` column (NOT NULL, UUID)
- [ ] Composite indexes created on (store_id, id)
- [ ] RLS enabled on all tenant tables
- [ ] RLS policies test and verified
- [ ] Foreign keys respect tenant boundaries
- [ ] Audit logging configured
- [ ] Performance tested with realistic data volumes
- [ ] Migration scripts reviewed and tested
- [ ] Documentation updated
- [ ] Rollback plan prepared

## 📚 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [Multi-Tenant Database Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/sharding)

---

**Next Steps**: Begin implementation with Task 1 - Create directory structure and base schema definitions.

