-- ============================================================================
-- CONSOLIDATED MIGRATION: Base Schema + Tenants
-- ============================================================================
-- This migration combines 00_base.sql and 01_tenants.sql into a single file
-- to ensure all enum types are available when tables reference them.
--
-- Key Change: Using DROP IF EXISTS + CREATE TYPE instead of DO blocks
-- for reliable enum creation in Supabase SQL Editor.
--
-- Execution: Run this entire file in Supabase SQL Editor as a single query
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- SECTION 2: ENUM TYPES
-- ============================================================================
-- Using DROP + CREATE pattern for clean slate
-- CASCADE ensures dependent objects are handled gracefully
-- ============================================================================

-- Status types used across multiple tables
DROP TYPE IF EXISTS status_type CASCADE;
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'pending', 'suspended', 'archived');

-- Subscription status for tenants
DROP TYPE IF EXISTS subscription_status_type CASCADE;
CREATE TYPE subscription_status_type AS ENUM ('trial', 'active', 'past_due', 'canceled', 'unpaid');

-- User roles within a tenant
DROP TYPE IF EXISTS user_role_type CASCADE;
CREATE TYPE user_role_type AS ENUM ('owner', 'admin', 'editor', 'viewer', 'customer');

-- Order status progression
DROP TYPE IF EXISTS order_status_type CASCADE;
CREATE TYPE order_status_type AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- Financial status for orders
DROP TYPE IF EXISTS financial_status_type CASCADE;
CREATE TYPE financial_status_type AS ENUM (
  'pending',
  'paid',
  'partially_paid',
  'refunded',
  'partially_refunded',
  'voided'
);

-- Fulfillment status for orders
DROP TYPE IF EXISTS fulfillment_status_type CASCADE;
CREATE TYPE fulfillment_status_type AS ENUM (
  'unfulfilled',
  'partial',
  'fulfilled',
  'restocked'
);

-- ============================================================================
-- SECTION 3: UTILITY FUNCTIONS
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
-- SECTION 4: TABLES (In dependency order)
-- ============================================================================

-- ============================================================================
-- 4A: AUDIT LOGS TABLE (No dependencies)
-- ============================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
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
CREATE INDEX idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- ============================================================================
-- 4B: TENANTS TABLE (No dependencies)
-- ============================================================================

DROP TABLE IF EXISTS tenants CASCADE;
CREATE TABLE tenants (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Subdomain for routing (must be unique)
  subdomain TEXT NOT NULL UNIQUE CHECK (
    subdomain ~ '^[a-z0-9-]+$' AND
    length(subdomain) >= 3 AND
    length(subdomain) <= 63 AND
    subdomain NOT LIKE '-%' AND
    subdomain NOT LIKE '%-'
  ),
  
  -- Tenant information
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  
  -- Status and subscription (NOW USES ENUM TYPES)
  status status_type NOT NULL DEFAULT 'pending',
  subscription_status subscription_status_type NOT NULL DEFAULT 'trial',
  
  -- Trial and subscription dates
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  
  -- Contact information
  owner_email TEXT CHECK (owner_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  owner_name TEXT,
  
  -- Plan information
  plan_id TEXT,
  plan_name TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

-- Indexes for tenant queries
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);
CREATE INDEX idx_tenants_trial_ends_at ON tenants(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4C: STORE CONFIGURATIONS TABLE (Depends on tenants)
-- ============================================================================

DROP TABLE IF EXISTS store_configs CASCADE;
CREATE TABLE store_configs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant isolation (REQUIRED, UNIQUE for 1:1 relationship)
  store_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Configuration version
  version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Dynamic configuration (JSON)
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Theme configuration
  theme JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Layout configuration
  layout JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Feature flags
  features JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Integration settings
  integrations JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Store metadata
  metadata JSONB NOT NULL DEFAULT '{
    "name": "",
    "description": "",
    "locale": "en-US",
    "currency": "USD",
    "timezone": "UTC",
    "keywords": []
  }'::JSONB,
  
  -- SEO settings
  seo JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRITICAL INDEX: Ensures one config per store
CREATE UNIQUE INDEX idx_store_configs_store_id ON store_configs(store_id);

-- Index for configuration queries
CREATE INDEX idx_store_configs_created_at ON store_configs(store_id, created_at DESC);

-- Triggers
CREATE TRIGGER update_store_configs_updated_at
  BEFORE UPDATE ON store_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_store_configs
  AFTER INSERT OR UPDATE OR DELETE ON store_configs
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- 4D: TENANT DOMAINS TABLE (Depends on tenants)
-- ============================================================================

DROP TABLE IF EXISTS tenant_domains CASCADE;
CREATE TABLE tenant_domains (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant isolation (REQUIRED)
  store_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Domain information
  domain TEXT NOT NULL UNIQUE CHECK (length(domain) <= 253),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  
  -- SSL configuration
  ssl_enabled BOOLEAN NOT NULL DEFAULT true,
  ssl_certificate TEXT,
  ssl_expires_at TIMESTAMPTZ,
  
  -- Verification
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenant_domains_store_id_id ON tenant_domains(store_id, id);
CREATE INDEX idx_tenant_domains_domain ON tenant_domains(domain) WHERE is_verified = true;
CREATE INDEX idx_tenant_domains_store_id_primary ON tenant_domains(store_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary domain per store
CREATE UNIQUE INDEX idx_tenant_domains_store_id_primary_unique 
  ON tenant_domains(store_id) 
  WHERE is_primary = true;

-- Trigger
CREATE TRIGGER update_tenant_domains_updated_at
  BEFORE UPDATE ON tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4E: TENANT SETTINGS TABLE (Depends on tenants)
-- ============================================================================

DROP TABLE IF EXISTS tenant_settings CASCADE;
CREATE TABLE tenant_settings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant isolation (REQUIRED, UNIQUE for 1:1 relationship)
  store_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Email settings
  email_from_name TEXT,
  email_from_address TEXT CHECK (email_from_address ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  email_reply_to TEXT CHECK (email_reply_to ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  
  -- Notification preferences
  notifications JSONB DEFAULT '{
    "email": {
      "orders": true,
      "marketing": false,
      "security": true,
      "updates": false
    },
    "webhooks": {
      "enabled": false,
      "urls": []
    }
  }'::JSONB,
  
  -- Localization
  default_locale TEXT DEFAULT 'en-US',
  supported_locales TEXT[] DEFAULT ARRAY['en-US'],
  default_currency TEXT DEFAULT 'USD',
  default_timezone TEXT DEFAULT 'UTC',
  
  -- Business information
  business_name TEXT,
  business_address JSONB,
  tax_id TEXT,
  
  -- Limits and quotas
  limits JSONB DEFAULT '{
    "products": 1000,
    "orders_per_month": 10000,
    "storage_gb": 10,
    "api_calls_per_day": 100000
  }'::JSONB,
  
  -- Custom settings
  custom_settings JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_tenant_settings_store_id ON tenant_settings(store_id);

-- Trigger
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new tenant with default configuration
CREATE OR REPLACE FUNCTION create_tenant(
  p_subdomain TEXT,
  p_name TEXT,
  p_owner_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug from name
  v_slug := generate_slug(p_name);
  
  -- Create tenant
  INSERT INTO tenants (subdomain, name, slug, owner_email)
  VALUES (p_subdomain, p_name, v_slug, p_owner_email)
  RETURNING id INTO v_tenant_id;
  
  -- Create default store configuration
  INSERT INTO store_configs (store_id, config, theme, layout, features, integrations, metadata)
  VALUES (
    v_tenant_id,
    '{}'::JSONB,
    '{}'::JSONB,
    '{}'::JSONB,
    '{}'::JSONB,
    '{}'::JSONB,
    jsonb_build_object(
      'name', p_name,
      'locale', 'en-US',
      'currency', 'USD',
      'timezone', 'UTC'
    )
  );
  
  -- Create default settings
  INSERT INTO tenant_settings (store_id, email_from_name)
  VALUES (v_tenant_id, p_name);
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a tenant
CREATE OR REPLACE FUNCTION soft_delete_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE tenants
  SET deleted_at = NOW(),
      status = 'suspended'
  WHERE id = p_tenant_id
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 6: COMMENTS
-- ============================================================================

COMMENT ON EXTENSION "uuid-ossp" IS 'Provides UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Provides cryptographic functions';
COMMENT ON EXTENSION "pg_trgm" IS 'Provides trigram matching for text search';

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp on row changes';
COMMENT ON FUNCTION generate_slug(TEXT) IS 'Generates a URL-safe slug from input text';
COMMENT ON FUNCTION audit_trigger_function() IS 'Generic trigger function to log all changes to audit_logs table';
COMMENT ON FUNCTION get_current_store_id() IS 'Returns the current tenant store_id from session context';
COMMENT ON FUNCTION set_store_context(UUID) IS 'Sets the tenant context for the current session';
COMMENT ON FUNCTION create_tenant(TEXT, TEXT, TEXT) IS 'Creates a new tenant with default configuration and settings';
COMMENT ON FUNCTION soft_delete_tenant(UUID) IS 'Soft deletes a tenant by setting deleted_at timestamp';

COMMENT ON TABLE audit_logs IS 'System-wide audit log tracking all data changes';
COMMENT ON TABLE tenants IS 'Global tenant registry - each tenant represents a separate store/organization';
COMMENT ON COLUMN tenants.subdomain IS 'Unique subdomain for tenant routing (e.g., tenant.reech.com)';
COMMENT ON COLUMN tenants.subscription_status IS 'Current subscription status for billing';

COMMENT ON TABLE store_configs IS 'Store configuration (1:1 with tenant) - stores dynamic JSON configuration';
COMMENT ON COLUMN store_configs.store_id IS 'CRITICAL: UNIQUE constraint enforces one config per tenant';
COMMENT ON COLUMN store_configs.config IS 'Complete store configuration as validated JSON';

COMMENT ON TABLE tenant_domains IS 'Custom domain mappings for tenants';
COMMENT ON TABLE tenant_settings IS 'Additional tenant-level settings and preferences';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- ✅ Extensions enabled
-- ✅ All enum types created
-- ✅ All utility functions created
-- ✅ All tables created in dependency order
-- ✅ All indexes created
-- ✅ All triggers created
-- ✅ Helper functions created
--
-- Next Steps:
-- 1. Run verification queries (see verify_types.sql)
-- 2. Execute store_members migration (003_add_store_members_table.sql)
-- ============================================================================

