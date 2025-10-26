-- ============================================================================
-- CLEANUP SCRIPT: Drop All Schema Objects
-- ============================================================================
-- ⚠️  WARNING: This script will DROP ALL tables, types, and functions
-- ⚠️  Use this ONLY if you need to start completely fresh
-- ⚠️  ALL DATA WILL BE LOST
--
-- Run this BEFORE executing 001_base_and_tenants_schema.sql
-- if you have partial schema objects that are causing conflicts
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop All Tables (in reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS tenant_settings CASCADE;
DROP TABLE IF EXISTS tenant_domains CASCADE;
DROP TABLE IF EXISTS store_configs CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ============================================================================
-- STEP 2: Drop All Enum Types
-- ============================================================================

DROP TYPE IF EXISTS fulfillment_status_type CASCADE;
DROP TYPE IF EXISTS financial_status_type CASCADE;
DROP TYPE IF EXISTS order_status_type CASCADE;
DROP TYPE IF EXISTS user_role_type CASCADE;
DROP TYPE IF EXISTS subscription_status_type CASCADE;
DROP TYPE IF EXISTS status_type CASCADE;

-- ============================================================================
-- STEP 3: Drop All Functions
-- ============================================================================

DROP FUNCTION IF EXISTS soft_delete_tenant(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_tenant(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_store_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_current_store_id() CASCADE;
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS generate_slug(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- VERIFICATION: Check Everything is Cleaned Up
-- ============================================================================

-- Check for remaining tables (should return 0 rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('tenants', 'store_configs', 'tenant_settings', 'tenant_domains', 'audit_logs');

-- Check for remaining enum types (should return 0 rows)
SELECT typname 
FROM pg_type 
WHERE typname IN (
  'status_type',
  'subscription_status_type',
  'user_role_type',
  'order_status_type',
  'financial_status_type',
  'fulfillment_status_type'
);

-- Check for remaining functions (should return 0 rows)
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'update_updated_at_column',
  'generate_slug',
  'audit_trigger_function',
  'get_current_store_id',
  'set_store_context',
  'create_tenant',
  'soft_delete_tenant'
);

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================
-- ✅ All tables dropped
-- ✅ All enum types dropped
-- ✅ All functions dropped
--
-- You can now run: 001_base_and_tenants_schema.sql
-- ============================================================================

