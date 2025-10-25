-- ============================================================================
-- MIGRATION 001: Products Table with Multi-Tenancy Support
-- ============================================================================
-- Phase 1: Data Association and Schema Enforcement (Prompt 1.1)
-- 
-- This migration creates the products table with:
-- 1. Mandatory store_id column (TEXT, indexed) for Medusa Store ID
-- 2. Composite indexes for optimized multi-tenant queries
-- 3. Full product catalog schema
-- 
-- Medusa Store ID Format: "store_XXXXX" (e.g., "store_01HQWE...")
-- ============================================================================

-- ============================================================================
-- PRODUCTS TABLE (Multi-Tenant Commerce Resource)
-- ============================================================================

CREATE TABLE products (
  -- ========================================================================
  -- PRIMARY IDENTIFICATION
  -- ========================================================================
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- ========================================================================
  -- MULTI-TENANCY: Medusa Store ID (Prompt 1.1 - Requirement 1)
  -- ========================================================================
  -- CRITICAL: This column associates the product with a specific store
  -- Format: Medusa Store ID (e.g., "store_01HQWE...")
  -- NOT NULL: Every product MUST belong to a store (mandatory)
  -- Will be indexed for optimal query performance (see indexes section)
  store_id TEXT NOT NULL CHECK (store_id ~ '^store_[a-zA-Z0-9]+$'),
  
  -- ========================================================================
  -- PRODUCT INFORMATION
  -- ========================================================================
  
  -- Product identifiers
  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 500),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  sku TEXT CHECK (length(sku) <= 100),
  barcode TEXT CHECK (length(barcode) <= 100),
  
  -- Product description
  description TEXT,
  short_description TEXT CHECK (length(short_description) <= 500),
  
  -- Product status and visibility
  status status_type NOT NULL DEFAULT 'active',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  
  -- ========================================================================
  -- PRICING
  -- ========================================================================
  
  -- Base pricing (in cents to avoid floating point issues)
  price_amount BIGINT NOT NULL CHECK (price_amount >= 0),
  price_currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(price_currency) = 3),
  
  -- Compare at price (for sale pricing display)
  compare_at_price BIGINT CHECK (compare_at_price >= 0),
  
  -- Cost of goods (for profit margin calculations)
  cost_price BIGINT CHECK (cost_price >= 0),
  
  -- ========================================================================
  -- INVENTORY
  -- ========================================================================
  
  -- Inventory tracking
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  low_stock_threshold INTEGER CHECK (low_stock_threshold >= 0),
  
  -- Stock management
  allow_backorder BOOLEAN NOT NULL DEFAULT false,
  requires_shipping BOOLEAN NOT NULL DEFAULT true,
  
  -- ========================================================================
  -- PRODUCT ATTRIBUTES
  -- ========================================================================
  
  -- Physical attributes
  weight DECIMAL(10, 2) CHECK (weight >= 0), -- in grams
  length DECIMAL(10, 2) CHECK (length >= 0), -- in cm
  width DECIMAL(10, 2) CHECK (width >= 0), -- in cm
  height DECIMAL(10, 2) CHECK (height >= 0), -- in cm
  
  -- Digital attributes
  is_digital BOOLEAN NOT NULL DEFAULT false,
  download_url TEXT,
  download_limit INTEGER CHECK (download_limit > 0),
  
  -- ========================================================================
  -- MEDIA
  -- ========================================================================
  
  -- Product images (array of URLs/paths)
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  featured_image TEXT,
  
  -- ========================================================================
  -- ORGANIZATION
  -- ========================================================================
  
  -- Categorization
  category_ids UUID[] DEFAULT ARRAY[]::UUID[],
  tag_ids UUID[] DEFAULT ARRAY[]::UUID[],
  collection_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Vendor/Brand
  vendor TEXT,
  brand TEXT,
  
  -- ========================================================================
  -- SEO & METADATA
  -- ========================================================================
  
  -- SEO fields
  seo_title TEXT CHECK (length(seo_title) <= 70),
  seo_description TEXT CHECK (length(seo_description) <= 160),
  seo_keywords TEXT[],
  
  -- Custom metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Custom fields (extensible)
  custom_fields JSONB DEFAULT '{}'::JSONB,
  
  -- ========================================================================
  -- OPTIONS & VARIANTS
  -- ========================================================================
  
  -- Product options configuration
  has_variants BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]'::JSONB, -- e.g., [{"name": "Size", "values": ["S", "M", "L"]}]
  
  -- ========================================================================
  -- DISPLAY & SORTING
  -- ========================================================================
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  
  -- ========================================================================
  -- TIMESTAMPS
  -- ========================================================================
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

-- ============================================================================
-- INDEXES (Prompt 1.1 - Requirement 2)
-- ============================================================================

-- ============================================================================
-- CRITICAL INDEX 1: store_id (Basic Tenant Isolation)
-- ============================================================================
-- Purpose: Optimize all tenant-scoped queries
-- Pattern: WHERE store_id = 'store_XXXXX'
CREATE INDEX idx_products_store_id ON products(store_id) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- CRITICAL INDEX 2: store_id + is_published (Most Common Query Pattern)
-- ============================================================================
-- Purpose: Optimize queries for published products in a store
-- Pattern: WHERE store_id = 'store_XXXXX' AND is_published = true
-- This is the most common query pattern for storefront display
CREATE INDEX idx_products_store_id_published ON products(store_id, is_published) 
WHERE deleted_at IS NULL AND is_published = true;

-- ============================================================================
-- CRITICAL INDEX 3: store_id + status (Admin Queries)
-- ============================================================================
-- Purpose: Optimize admin queries filtering by status
-- Pattern: WHERE store_id = 'store_XXXXX' AND status = 'active'
CREATE INDEX idx_products_store_id_status ON products(store_id, status) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- CRITICAL INDEX 4: store_id + created_at (Recent Products)
-- ============================================================================
-- Purpose: Optimize queries for recently created products
-- Pattern: WHERE store_id = 'store_XXXXX' ORDER BY created_at DESC
CREATE INDEX idx_products_store_id_created_at ON products(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- COMPOSITE INDEX 5: store_id + slug (Product Detail Page)
-- ============================================================================
-- Purpose: Optimize product detail page lookups by slug
-- Pattern: WHERE store_id = 'store_XXXXX' AND slug = 'product-slug'
CREATE UNIQUE INDEX idx_products_store_id_slug ON products(store_id, slug) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- COMPOSITE INDEX 6: store_id + sku (Inventory Management)
-- ============================================================================
-- Purpose: Optimize SKU lookups within a store
-- Pattern: WHERE store_id = 'store_XXXXX' AND sku = 'SKU123'
CREATE UNIQUE INDEX idx_products_store_id_sku ON products(store_id, sku) 
WHERE deleted_at IS NULL AND sku IS NOT NULL;

-- ============================================================================
-- INDEX 7: store_id + is_featured (Featured Products)
-- ============================================================================
-- Purpose: Optimize queries for featured products
-- Pattern: WHERE store_id = 'store_XXXXX' AND is_featured = true
CREATE INDEX idx_products_store_id_featured ON products(store_id, is_featured) 
WHERE deleted_at IS NULL AND is_featured = true;

-- ============================================================================
-- INDEX 8: store_id + track_inventory + quantity_available (Stock Queries)
-- ============================================================================
-- Purpose: Optimize low stock/out of stock queries
-- Pattern: WHERE store_id = 'store_XXXXX' AND track_inventory = true AND quantity_available < threshold
CREATE INDEX idx_products_store_id_inventory ON products(store_id, track_inventory, quantity_available) 
WHERE deleted_at IS NULL AND track_inventory = true;

-- ============================================================================
-- FULL-TEXT SEARCH INDEX
-- ============================================================================
-- Purpose: Enable full-text search on product title and description
CREATE INDEX idx_products_search ON products 
USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Audit trail for all product changes
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Trigger: Auto-generate slug from title if not provided
CREATE OR REPLACE FUNCTION products_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_slug_trigger
  BEFORE INSERT OR UPDATE OF title, slug ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_generate_slug();

-- Trigger: Set published_at timestamp when is_published changes to true
CREATE OR REPLACE FUNCTION products_set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    NEW.published_at := NOW();
  ELSIF NEW.is_published = false THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_published_at_trigger
  BEFORE INSERT OR UPDATE OF is_published ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_set_published_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Calculate available quantity (total - reserved)
CREATE OR REPLACE FUNCTION products_available_quantity(product_row products)
RETURNS INTEGER AS $$
BEGIN
  RETURN product_row.quantity_available - product_row.quantity_reserved;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if product is low stock
CREATE OR REPLACE FUNCTION products_is_low_stock(product_row products)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT product_row.track_inventory THEN
    RETURN false;
  END IF;
  
  IF product_row.low_stock_threshold IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN products_available_quantity(product_row) <= product_row.low_stock_threshold;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if product is in stock
CREATE OR REPLACE FUNCTION products_is_in_stock(product_row products)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT product_row.track_inventory THEN
    RETURN true;
  END IF;
  
  IF product_row.allow_backorder THEN
    RETURN true;
  END IF;
  
  RETURN products_available_quantity(product_row) > 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE products IS 'Multi-tenant product catalog - each product belongs to a specific store via store_id';
COMMENT ON COLUMN products.store_id IS 'CRITICAL: Medusa Store ID for multi-tenancy (format: store_XXXXX) - MANDATORY for all products';
COMMENT ON COLUMN products.price_amount IS 'Price in cents to avoid floating point precision issues';
COMMENT ON COLUMN products.quantity_reserved IS 'Quantity reserved by pending orders (not yet fulfilled)';
COMMENT ON COLUMN products.slug IS 'URL-safe identifier for product (unique within store)';
COMMENT ON COLUMN products.is_published IS 'Whether product is visible on storefront';
COMMENT ON COLUMN products.metadata IS 'Extensible JSON field for custom data';

COMMENT ON INDEX idx_products_store_id IS 'Basic tenant isolation index';
COMMENT ON INDEX idx_products_store_id_published IS 'CRITICAL: Optimizes storefront product listing queries';
COMMENT ON INDEX idx_products_store_id_status IS 'Optimizes admin status filtering queries';
COMMENT ON INDEX idx_products_store_id_created_at IS 'Optimizes "recent products" queries';
COMMENT ON INDEX idx_products_store_id_slug IS 'UNIQUE: Ensures slug uniqueness within store';
COMMENT ON INDEX idx_products_store_id_sku IS 'UNIQUE: Ensures SKU uniqueness within store (when provided)';

COMMENT ON FUNCTION products_available_quantity(products) IS 'Calculates available quantity (total - reserved)';
COMMENT ON FUNCTION products_is_low_stock(products) IS 'Checks if product is below low stock threshold';
COMMENT ON FUNCTION products_is_in_stock(products) IS 'Checks if product is available for purchase';

-- ============================================================================
-- MIGRATION COMPLETE: Products Table
-- ============================================================================
-- Achievements:
-- ✅ Products table created with mandatory store_id column (TEXT)
-- ✅ store_id validated against Medusa Store ID format (store_XXXXX)
-- ✅ 9 indexes created for optimal multi-tenant query performance
-- ✅ Composite indexes on store_id + frequently filtered fields
-- ✅ Full-text search support
-- ✅ Auto-generated slugs and timestamps
-- ✅ Audit trail for all changes
-- ✅ Helper functions for stock management
--
-- Next migration: 002_add_orders_table.sql
-- ============================================================================

