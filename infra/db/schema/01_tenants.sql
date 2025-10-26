-- ============================================================================
-- TENANT MANAGEMENT SCHEMA
-- ============================================================================
-- ⚠️  NOTE: This schema file has been superseded by the consolidated migration
-- ⚠️  Use: infra/db/migrations/001_base_and_tenants_schema.sql instead
-- ⚠️  
-- ⚠️  This file is kept for reference only. Do NOT execute it separately
-- ⚠️  as it depends on enum types that must be created first.
-- ============================================================================
-- This file contains:
-- 1. Tenants table (global registry - NO store_id)
-- 2. Store configurations table (1:1 with tenant - HAS store_id)
-- 3. Tenant metadata and settings
--
-- CRITICAL: store_configs enforces one configuration per tenant via UNIQUE constraint
-- ============================================================================

-- ============================================================================
-- TENANTS TABLE (Global - No store_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
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
  
  -- Status and subscription
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

-- Ensure soft-delete column exists for filtered indexes
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes for tenant queries
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends_at ON tenants(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenants_updated_at') THEN
    CREATE TRIGGER update_tenants_updated_at
      BEFORE UPDATE ON tenants
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- STORE CONFIGURATIONS TABLE (1:1 with tenant)
-- ============================================================================
-- CRITICAL: This table enforces the one-to-one relationship between
-- tenant and configuration via UNIQUE constraint on store_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_configs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tenant isolation (REQUIRED, UNIQUE for 1:1 relationship)
  -- This is the critical constraint that enforces one config per tenant
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
-- This is the key performance optimization for tenant-scoped queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_configs_store_id ON store_configs(store_id);

-- Index for configuration queries
CREATE INDEX IF NOT EXISTS idx_store_configs_created_at ON store_configs(store_id, created_at DESC);

-- Trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_configs_updated_at') THEN
    CREATE TRIGGER update_store_configs_updated_at
      BEFORE UPDATE ON store_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- Audit trigger (track all configuration changes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_store_configs') THEN
    CREATE TRIGGER audit_store_configs
      AFTER INSERT OR UPDATE OR DELETE ON store_configs
      FOR EACH ROW
      EXECUTE FUNCTION audit_trigger_function();
  END IF;
END;
$$;

-- ============================================================================
-- TENANT DOMAINS TABLE (Custom domain support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_domains (
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

-- Composite index for tenant domain queries
CREATE INDEX IF NOT EXISTS idx_tenant_domains_store_id_id ON tenant_domains(store_id, id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_store_id_primary ON tenant_domains(store_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary domain per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_domains_store_id_primary_unique 
  ON tenant_domains(store_id) 
  WHERE is_primary = true;

-- Trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_domains_updated_at') THEN
    CREATE TRIGGER update_tenant_domains_updated_at
      BEFORE UPDATE ON tenant_domains
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- TENANT SETTINGS TABLE (Additional tenant-level settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
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

-- Index for settings queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_store_id ON tenant_settings(store_id);

-- Trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_settings_updated_at') THEN
    CREATE TRIGGER update_tenant_settings_updated_at
      BEFORE UPDATE ON tenant_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- HELPER FUNCTIONS
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
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tenants IS 'Global tenant registry - each tenant represents a separate store/organization';
COMMENT ON COLUMN tenants.subdomain IS 'Unique subdomain for tenant routing (e.g., tenant.reech.com)';
COMMENT ON COLUMN tenants.subscription_status IS 'Current subscription status for billing';

COMMENT ON TABLE store_configs IS 'Store configuration (1:1 with tenant) - stores dynamic JSON configuration';
COMMENT ON COLUMN store_configs.store_id IS 'CRITICAL: UNIQUE constraint enforces one config per tenant';
COMMENT ON COLUMN store_configs.config IS 'Complete store configuration as validated JSON';
COMMENT ON INDEX idx_store_configs_store_id IS 'CRITICAL: Ensures 1:1 relationship and optimal query performance';

COMMENT ON TABLE tenant_domains IS 'Custom domain mappings for tenants';
COMMENT ON TABLE tenant_settings IS 'Additional tenant-level settings and preferences';

COMMENT ON FUNCTION create_tenant(TEXT, TEXT, TEXT) IS 'Creates a new tenant with default configuration and settings';
COMMENT ON FUNCTION soft_delete_tenant(UUID) IS 'Soft deletes a tenant by setting deleted_at timestamp';

-- ============================================================================
-- TENANT SCHEMA COMPLETE
-- ============================================================================
-- Key achievements:
-- ✅ Tenants table created (global, no store_id)
-- ✅ store_configs table with UNIQUE constraint on store_id (enforces 1:1)
-- ✅ Composite indexes for performance
-- ✅ Soft delete support
-- ✅ Helper functions for tenant management
--
-- Next file: 02_products.sql (Product catalog with store_id)
-- ============================================================================
