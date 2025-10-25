-- ============================================================================
-- BASE SCHEMA: Extensions, Types, and Foundation
-- ============================================================================
-- This file contains:
-- 1. Required PostgreSQL extensions
-- 2. Common types and enums
-- 3. Utility functions
-- 4. Audit infrastructure
-- 
-- All tenant-specific tables will build upon this foundation
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- COMMON TYPES AND ENUMS
-- ============================================================================

-- Status types used across multiple tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_type') THEN
    CREATE TYPE status_type AS ENUM ('active', 'inactive', 'pending', 'suspended', 'archived');
  END IF;
END;
$$;

-- Order status progression
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_type') THEN
    CREATE TYPE order_status_type AS ENUM (
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    );
  END IF;
END;
$$;

-- Financial status for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_status_type') THEN
    CREATE TYPE financial_status_type AS ENUM (
      'pending',
      'paid',
      'partially_paid',
      'refunded',
      'partially_refunded',
      'voided'
    );
  END IF;
END;
$$;

-- Fulfillment status for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_status_type') THEN
    CREATE TYPE fulfillment_status_type AS ENUM (
      'unfulfilled',
      'partial',
      'fulfilled',
      'restocked'
    );
  END IF;
END;
$$;

-- User roles within a tenant
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE user_role_type AS ENUM (
      'owner',
      'admin',
      'editor',
      'viewer',
      'customer'
    );
  END IF;
END;
$$;

-- Subscription status for tenants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_type') THEN
    CREATE TYPE subscription_status_type AS ENUM (
      'trial',
      'active',
      'past_due',
      'canceled',
      'unpaid'
    );
  END IF;
END;
$$;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a random slug
CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(
    regexp_replace(text_input, '[^a-zA-Z0-9\s-]', '', 'g'),
    '[\s]+', '-', 'g'
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- AUDIT LOG INFRASTRUCTURE
-- ============================================================================

-- Audit log table (global - tracks all changes across all tenants)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID, -- Nullable for global operations
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying audit logs by store
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  store_id_value UUID;
  user_id_value UUID;
BEGIN
  -- Extract store_id if it exists in the table
  IF TG_OP = 'DELETE' THEN
    store_id_value := OLD.store_id;
  ELSE
    store_id_value := NEW.store_id;
  END IF;

  -- Get current user (if available from session)
  BEGIN
    user_id_value := current_setting('app.current_user_id')::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      user_id_value := NULL;
  END;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      store_id,
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id
    ) VALUES (
      store_id_value,
      TG_TABLE_NAME,
      OLD.id,
      TG_OP,
      row_to_json(OLD)::JSONB,
      NULL,
      user_id_value
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      store_id,
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id
    ) VALUES (
      store_id_value,
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      row_to_json(OLD)::JSONB,
      row_to_json(NEW)::JSONB,
      user_id_value
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      store_id,
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id
    ) VALUES (
      store_id_value,
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      NULL,
      row_to_json(NEW)::JSONB,
      user_id_value
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TENANT CONTEXT FUNCTIONS
-- ============================================================================

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_store_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_store_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_store_context(store_uuid UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_store_id', store_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON EXTENSION "uuid-ossp" IS 'Provides UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Provides cryptographic functions';
COMMENT ON EXTENSION "pg_trgm" IS 'Provides trigram matching for text search';

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp on row changes';
COMMENT ON FUNCTION generate_slug(TEXT) IS 'Generates a URL-safe slug from input text';
COMMENT ON FUNCTION audit_trigger_function() IS 'Generic trigger function to log all changes to audit_logs table';
COMMENT ON FUNCTION get_current_store_id() IS 'Returns the current tenant store_id from session context';
COMMENT ON FUNCTION set_store_context(UUID) IS 'Sets the tenant context for the current session';

COMMENT ON TABLE audit_logs IS 'System-wide audit log tracking all data changes';

-- ============================================================================
-- BASE SCHEMA COMPLETE
-- ============================================================================
-- Next file: 01_tenants.sql (Tenant management tables)
-- ============================================================================
