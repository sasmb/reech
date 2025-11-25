-- ============================================================================
-- VERIFICATION SCRIPT: Enum Types and Tables
-- ============================================================================
-- Run this script after executing 001_base_and_tenants_schema.sql
-- to verify that all database objects were created successfully
-- ============================================================================

-- ============================================================================
-- TEST 1: Verify All Enum Types Exist
-- ============================================================================
-- Expected: 6 rows

SELECT 
  typname AS enum_name,
  enumtypid::regtype AS type_info
FROM pg_type 
WHERE typname IN (
  'status_type',
  'subscription_status_type', 
  'user_role_type',
  'order_status_type',
  'financial_status_type',
  'fulfillment_status_type'
)
ORDER BY typname;

-- Expected output:
-- enum_name                   | type_info
-- ---------------------------+----------------------------
-- financial_status_type       | financial_status_type
-- fulfillment_status_type     | fulfillment_status_type
-- order_status_type           | order_status_type
-- status_type                 | status_type
-- subscription_status_type    | subscription_status_type
-- user_role_type              | user_role_type

-- ============================================================================
-- TEST 2: Verify All Tables Exist
-- ============================================================================
-- Expected: 5 rows

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'audit_logs',
  'tenants', 
  'store_configs', 
  'tenant_settings',
  'tenant_domains'
)
ORDER BY table_name;

-- Expected output:
-- table_name       | table_type
-- ----------------+-----------
-- audit_logs       | BASE TABLE
-- store_configs    | BASE TABLE
-- tenant_domains   | BASE TABLE
-- tenant_settings  | BASE TABLE
-- tenants          | BASE TABLE

-- ============================================================================
-- TEST 3: Verify Enum Columns in Tenants Table
-- ============================================================================
-- This is the KEY test - verifying subscription_status uses the enum type
-- Expected: 2 rows

SELECT 
  column_name,
  data_type,
  udt_name AS underlying_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('status', 'subscription_status')
ORDER BY column_name;

-- Expected output:
-- column_name         | data_type     | underlying_type          | column_default | is_nullable
-- -------------------+--------------+-------------------------+----------------+-------------
-- status              | USER-DEFINED | status_type              | 'pending'...   | NO
-- subscription_status | USER-DEFINED | subscription_status_type | 'trial'...     | NO

-- ============================================================================
-- TEST 4: Verify Foreign Key Constraints
-- ============================================================================
-- Expected: 4 rows (store_configs, tenant_domains, tenant_settings reference tenants)

SELECT
  tc.constraint_name,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'tenants'
ORDER BY tc.table_name;

-- Expected output shows store_configs, tenant_domains, tenant_settings all reference tenants(id)

-- ============================================================================
-- TEST 5: Verify Indexes
-- ============================================================================
-- Expected: Multiple rows showing indexes on key columns

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('tenants', 'store_configs', 'tenant_settings', 'tenant_domains')
ORDER BY tablename, indexname;

-- ============================================================================
-- TEST 6: Verify Triggers
-- ============================================================================
-- Expected: 5 triggers (one for each table with updated_at)

SELECT
  trigger_name,
  event_object_table AS table_name,
  action_statement AS trigger_function
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('tenants', 'store_configs', 'tenant_settings', 'tenant_domains')
ORDER BY event_object_table, trigger_name;

-- Expected output shows update_*_updated_at triggers

-- ============================================================================
-- TEST 7: Verify Extensions
-- ============================================================================
-- Expected: 3 rows

SELECT 
  extname AS extension_name,
  extversion AS version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm')
ORDER BY extname;

-- Expected output:
-- extension_name | version
-- --------------+--------
-- pg_trgm        | 1.x
-- pgcrypto       | 1.x
-- uuid-ossp      | 1.x

-- ============================================================================
-- TEST 8: Test Enum Value Insertion
-- ============================================================================
-- This tests that the enum types actually work
-- Expected: Success (no error)

DO $$
DECLARE
  test_tenant_id UUID;
BEGIN
  -- Try creating a test tenant using enum values
  INSERT INTO tenants (subdomain, name, slug, status, subscription_status)
  VALUES ('test-verification', 'Test Tenant', 'test-tenant', 'active', 'trial')
  RETURNING id INTO test_tenant_id;
  
  -- Clean up test data
  DELETE FROM tenants WHERE id = test_tenant_id;
  
  RAISE NOTICE 'SUCCESS: Enum types are working correctly!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'FAILED: Enum test failed with error: %', SQLERRM;
END;
$$;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================
-- If all tests pass:
-- ✅ All 6 enum types exist
-- ✅ All 5 tables exist
-- ✅ Enum columns use correct types
-- ✅ Foreign keys properly reference tenants
-- ✅ Indexes created for performance
-- ✅ Triggers active for updated_at
-- ✅ Extensions enabled
-- ✅ Enum values can be inserted
--
-- You are now ready to:
-- 1. Execute 003_add_store_members_table.sql
-- 2. Proceed with Supabase auth package migration
-- ============================================================================

