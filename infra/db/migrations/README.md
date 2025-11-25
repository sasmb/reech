# Database Migrations

This directory contains SQL migration files for the multi-tenant commerce platform.

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| `001_add_products_table.sql` | Creates products table with store_id | ✅ Ready |
| `002_add_orders_table.sql` | Creates orders table with store_id | ✅ Ready |

## Migration Overview

These migrations implement **Phase 1: Data Association and Schema Enforcement** (Prompt 1.1), establishing the foundation for multi-tenant commerce operations.

### Key Features

1. **Multi-Tenancy via Medusa Store ID**
   - All commerce resources (products, orders) are associated with a `store_id`
   - Format: `store_XXXXX` (e.g., `store_01HQWE...`)
   - Type: `TEXT` (to accommodate Medusa's ID format)
   - Constraint: `NOT NULL` and validated via CHECK constraint

2. **Optimized Indexing Strategy**
   - Primary index on `store_id` for basic tenant isolation
   - Composite indexes on `store_id + frequently_filtered_columns`
   - Full-text search indexes for product/order search
   - Unique constraints on `store_id + slug/sku/order_number`

3. **Performance-First Design**
   - All indexes include `WHERE deleted_at IS NULL` for soft-delete optimization
   - Composite indexes align with common query patterns
   - Partial indexes for published products, paid orders, etc.

## How to Run Migrations

### Prerequisites

1. **Supabase Project Setup**
   ```bash
   # Ensure you have Supabase CLI installed
   npm install -g supabase
   
   # Or using your package manager
   pnpm add -g supabase
   ```

2. **Environment Variables**
   Ensure the following are set in your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Option 1: Using Supabase Dashboard (Recommended for Development)

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of each migration file in order:
   - First: `001_add_products_table.sql`
   - Second: `002_add_orders_table.sql`
4. Execute each migration by clicking "Run"

### Option 2: Using Supabase CLI

```bash
# From the reech-saas directory
cd /Users/realsamogb/Desktop/reech/reech-saas

# Initialize Supabase project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Or apply individually
supabase db execute --file infra/db/migrations/001_add_products_table.sql
supabase db execute --file infra/db/migrations/002_add_orders_table.sql
```

### Option 3: Using Node.js Script

```bash
# From the reech-saas directory
cd /Users/realsamogb/Desktop/reech/reech-saas

# Run the migration script
pnpm tsx infra/db/migrations/run-migrations.ts
```

## Validation Steps

After running the migrations, validate the setup:

### 1. Verify Tables Created

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'orders');

-- Check store_id column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('products', 'orders') 
AND column_name = 'store_id';
```

**Expected Output:**
- Tables: `products`, `orders`
- Column: `store_id`, Type: `text`, Nullable: `NO`

### 2. Verify Indexes Created

```sql
-- Check products indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'products' 
AND indexname LIKE 'idx_products%';

-- Check orders indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE 'idx_orders%';
```

**Expected Output:**
- Products: 9 indexes including `idx_products_store_id`, `idx_products_store_id_published`, etc.
- Orders: 11 indexes including `idx_orders_store_id`, `idx_orders_store_id_status`, etc.

### 3. Test Constraint Enforcement

```sql
-- Test 1: Verify store_id NOT NULL constraint
-- This should FAIL with error
INSERT INTO products (title, slug, price_amount, price_currency) 
VALUES ('Test Product', 'test-product', 1000, 'USD');

-- Test 2: Verify store_id format validation
-- This should FAIL with CHECK constraint violation
INSERT INTO products (store_id, title, slug, price_amount, price_currency) 
VALUES ('invalid_format', 'Test Product', 'test-product', 1000, 'USD');

-- Test 3: Valid insertion
-- This should SUCCEED
INSERT INTO products (store_id, title, slug, price_amount, price_currency) 
VALUES ('store_01HQWE1234567890', 'Test Product', 'test-product', 1000, 'USD');
```

### 4. Verify Index Performance

```sql
-- Explain query plan (should use index)
EXPLAIN ANALYZE 
SELECT * FROM products 
WHERE store_id = 'store_01HQWE1234567890' 
AND is_published = true;

-- Should show: Index Scan using idx_products_store_id_published
```

## Migration Rollback

If you need to rollback the migrations:

### Rollback Orders Table

```sql
-- Remove orders table and all related objects
DROP TABLE IF EXISTS orders CASCADE;
DROP FUNCTION IF EXISTS orders_generate_display_id() CASCADE;
DROP FUNCTION IF EXISTS orders_validate_total() CASCADE;
DROP FUNCTION IF EXISTS orders_set_status_timestamps() CASCADE;
DROP FUNCTION IF EXISTS orders_balance_due(orders) CASCADE;
DROP FUNCTION IF EXISTS orders_is_paid(orders) CASCADE;
DROP FUNCTION IF EXISTS orders_is_fulfilled(orders) CASCADE;
DROP FUNCTION IF EXISTS orders_can_cancel(orders) CASCADE;
```

### Rollback Products Table

```sql
-- Remove products table and all related objects
DROP TABLE IF EXISTS products CASCADE;
DROP FUNCTION IF EXISTS products_generate_slug() CASCADE;
DROP FUNCTION IF EXISTS products_set_published_at() CASCADE;
DROP FUNCTION IF EXISTS products_available_quantity(products) CASCADE;
DROP FUNCTION IF EXISTS products_is_low_stock(products) CASCADE;
DROP FUNCTION IF EXISTS products_is_in_stock(products) CASCADE;
```

## Index Performance Optimization

### Query Patterns and Index Usage

**Products Table:**
- Storefront listing: `idx_products_store_id_published`
- Product detail: `idx_products_store_id_slug`
- Admin management: `idx_products_store_id_status`
- Recent products: `idx_products_store_id_created_at`
- SKU lookup: `idx_products_store_id_sku`
- Search: `idx_products_search` (full-text)

**Orders Table:**
- Order management: `idx_orders_store_id_status`
- Payment tracking: `idx_orders_store_id_financial_status`
- Fulfillment: `idx_orders_store_id_fulfillment_status`
- Order lookup: `idx_orders_store_id_order_number`
- Customer history: `idx_orders_store_id_customer_email`
- Revenue reports: `idx_orders_store_id_paid_at`

### Monitoring Index Usage

```sql
-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('products', 'orders')
ORDER BY idx_scan DESC;
```

## Next Steps

After completing these migrations:

1. ✅ **Phase 1 Complete** - Data association schema is ready
2. ⏭️ **Phase 2** - Implement Row Level Security (RLS) policies
3. ⏭️ **Phase 3** - Create API endpoints for product/order management
4. ⏭️ **Phase 4** - Build frontend components for multi-tenant access

## Troubleshooting

### Error: `relation "products" already exists`

**Solution:** The table already exists. Either:
1. Drop the existing table and re-run (if safe to do so)
2. Skip this migration if the schema matches

### Error: `function update_updated_at_column() does not exist`

**Solution:** Run the base schema first:
```bash
supabase db execute --file infra/db/schema/00_base.sql
```

### Error: `type "status_type" does not exist`

**Solution:** Run the base schema first (see above). It defines all enum types.

### Performance Issues

If queries are slow:
1. Check if indexes are being used: `EXPLAIN ANALYZE your_query`
2. Verify statistics are up to date: `ANALYZE products; ANALYZE orders;`
3. Check for missing indexes: Review query plans for sequential scans

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Multi-Tenant Best Practices](https://www.citusdata.com/blog/2017/03/09/multi-tenant-sharding-tutorial/)
- [Medusa Store Module](https://docs.medusajs.com/resources/commerce-modules/store)

## Support

For issues or questions:
- Check existing documentation in `/docs`
- Review Phase 1 completion docs: `docs/PHASE_1_PROMPT_1.1_COMPLETE.md`
- Consult the database architecture plan: `docs/DATABASE_ARCHITECTURE_PLAN.md`

