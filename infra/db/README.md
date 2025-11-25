# Database Schema - Reech SaaS

## 📁 Directory Structure

```
infra/db/
├── migrations/          # Supabase SQL migrations (timestamped)
├── schema/             # Schema definition files
│   ├── 00_base.sql    # Base tables, types, and extensions
│   ├── 01_tenants.sql # Tenant management tables
│   ├── 02_products.sql# Product-related tables
│   ├── 03_orders.sql  # Order-related tables
│   ├── 04_users.sql   # User and customer tables
│   └── 05_rls.sql     # Row Level Security policies
├── seed/               # Development seed data
└── README.md          # This file
```

## 🎯 Multi-Tenant Isolation Model

### Architecture: **Shared Tables with Mandatory `store_id`**

All tenant-specific tables include a mandatory `store_id` column (UUID) that:
1. References the `tenants` table
2. Is part of composite indexes for performance
3. Is enforced by Row Level Security (RLS) policies
4. Prevents cross-tenant data access at database level

### Key Principles

1. **Every tenant table has `store_id`** (NON-NULLABLE)
2. **Composite indexes** start with `(store_id, ...)`
3. **RLS policies** enforce tenant boundaries
4. **Foreign keys** respect tenant context
5. **All queries** include `store_id` in WHERE clause

## 🔧 Schema Files

### `00_base.sql` - Foundation
- UUID extension
- Timestamp functions
- Common types and enums
- Audit log infrastructure

### `01_tenants.sql` - Tenant Management
- `tenants` table (global, no `store_id`)
- `store_configs` table (1:1 with tenant)
- Tenant metadata and settings

### `02_products.sql` - Product Catalog
- `products` table
- `product_variants` table
- `product_images` table
- `product_categories` table
- `product_tags` table
- `inventory` table

### `03_orders.sql` - Order Management
- `orders` table
- `order_line_items` table
- `order_addresses` table
- `order_fulfillments` table
- `order_transactions` table

### `04_users.sql` - User Management
- `users` table (tenant-scoped)
- `user_preferences` table
- `user_addresses` table
- Integration with Supabase Auth

### `05_rls.sql` - Security Policies
- RLS enable statements
- Tenant isolation policies
- Admin access policies
- Audit policies

## 🚀 Usage

### Local Development (Supabase CLI)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Reset database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/database.types.ts
```

### Creating Migrations

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Seeding Data

```bash
# Run seed script
psql $DATABASE_URL < infra/db/seed/development.sql
```

## 📊 Table Structure Template

Every tenant table follows this pattern:

```sql
CREATE TABLE table_name (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant isolation (REQUIRED)
  store_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Business columns
  name TEXT NOT NULL,
  status TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for tenant queries (REQUIRED)
CREATE INDEX idx_table_name_store_id_id 
  ON table_name(store_id, id);

-- Additional indexes for common queries
CREATE INDEX idx_table_name_store_id_created_at 
  ON table_name(store_id, created_at DESC);

-- Enable RLS (REQUIRED)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "tenant_isolation_policy" ON table_name
  FOR ALL
  USING (store_id = current_setting('app.current_store_id')::uuid);
```

## 🔐 Security

### Row Level Security (RLS)

All tenant tables have RLS enabled with policies that:
1. Check `store_id` matches authenticated tenant context
2. Prevent cross-tenant data access
3. Allow admin access for system operations

### Setting Tenant Context

```sql
-- Set current tenant context
SET LOCAL app.current_store_id = 'uuid-here';

-- All queries will be filtered by this store_id
SELECT * FROM products; -- Only returns this tenant's products
```

### Bypassing RLS (Admin Only)

```sql
-- Only for admin operations with extreme caution
SET LOCAL row_security = off;
```

## 📈 Performance

### Index Strategy

1. **Primary Index**: `(store_id, id)` on all tenant tables
2. **Query Index**: `(store_id, created_at DESC)` for time-based queries
3. **Status Index**: `(store_id, status)` for filtering
4. **Search Index**: GIN index on searchable text columns

### Query Patterns

```sql
-- ✅ GOOD - Uses composite index
SELECT * FROM products 
WHERE store_id = $1 AND status = 'active'
ORDER BY created_at DESC;

-- ❌ BAD - Missing store_id
SELECT * FROM products WHERE id = $1;

-- ✅ GOOD - Always include store_id
SELECT * FROM products 
WHERE store_id = $1 AND id = $2;
```

## 🧪 Testing

### Verify RLS

```sql
-- Set tenant A context
SET app.current_store_id = 'tenant-a-uuid';
SELECT COUNT(*) FROM products; -- Should only count tenant A products

-- Set tenant B context  
SET app.current_store_id = 'tenant-b-uuid';
SELECT COUNT(*) FROM products; -- Should only count tenant B products
```

### Verify Indexes

```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE store_id = $1 AND status = 'active'
LIMIT 20;

-- Should show "Index Scan using idx_products_store_id_id"
```

## 📝 Migration Workflow

1. **Write SQL** in `schema/` files during development
2. **Create migration** when ready to deploy: `supabase migration new feature_name`
3. **Copy SQL** from schema files to migration
4. **Test locally**: `supabase db reset && supabase db push`
5. **Review migration** for safety (no DROP statements in production)
6. **Deploy**: Migrations auto-apply on push to main

## 🚨 Critical Rules

1. **NEVER** create a tenant table without `store_id`
2. **ALWAYS** create composite index starting with `store_id`
3. **ALWAYS** enable RLS on tenant tables
4. **NEVER** query without `store_id` in WHERE clause
5. **ALWAYS** use foreign keys that respect tenant boundaries

## 📚 References

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security#multi-tenancy)

---

**Last Updated**: December 2024  
**Schema Version**: 1.0.0
