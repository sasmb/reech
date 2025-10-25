-- ============================================================================
-- MIGRATION 002: Orders Table with Multi-Tenancy Support
-- ============================================================================
-- Phase 1: Data Association and Schema Enforcement (Prompt 1.1)
-- 
-- This migration creates the orders table with:
-- 1. Mandatory store_id column (TEXT, indexed) for Medusa Store ID
-- 2. Composite indexes for optimized multi-tenant queries
-- 3. Full order management schema
-- 
-- Medusa Store ID Format: "store_XXXXX" (e.g., "store_01HQWE...")
-- ============================================================================

-- ============================================================================
-- ORDERS TABLE (Multi-Tenant Commerce Resource)
-- ============================================================================

CREATE TABLE orders (
  -- ========================================================================
  -- PRIMARY IDENTIFICATION
  -- ========================================================================
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- ========================================================================
  -- MULTI-TENANCY: Medusa Store ID (Prompt 1.1 - Requirement 1)
  -- ========================================================================
  -- CRITICAL: This column associates the order with a specific store
  -- Format: Medusa Store ID (e.g., "store_01HQWE...")
  -- NOT NULL: Every order MUST belong to a store (mandatory)
  -- Will be indexed for optimal query performance (see indexes section)
  store_id TEXT NOT NULL CHECK (store_id ~ '^store_[a-zA-Z0-9]+$'),
  
  -- ========================================================================
  -- ORDER IDENTIFICATION
  -- ========================================================================
  
  -- Human-readable order number (unique per store)
  order_number TEXT NOT NULL CHECK (length(order_number) <= 50),
  
  -- Display ID for customers (e.g., "#1001")
  display_id TEXT NOT NULL,
  
  -- ========================================================================
  -- CUSTOMER INFORMATION
  -- ========================================================================
  
  -- Customer reference (nullable for guest checkout)
  customer_id UUID,
  customer_email TEXT NOT NULL CHECK (customer_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  customer_name TEXT,
  customer_phone TEXT,
  
  -- ========================================================================
  -- ORDER STATUS
  -- ========================================================================
  
  -- Order lifecycle status
  status order_status_type NOT NULL DEFAULT 'pending',
  
  -- Financial status
  financial_status financial_status_type NOT NULL DEFAULT 'pending',
  
  -- Fulfillment status
  fulfillment_status fulfillment_status_type NOT NULL DEFAULT 'unfulfilled',
  
  -- Status timestamps
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Cancellation details
  cancel_reason TEXT,
  cancelled_by UUID, -- User ID who cancelled
  
  -- ========================================================================
  -- FINANCIAL INFORMATION
  -- ========================================================================
  
  -- Currency
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  
  -- Line items total (sum of all product prices)
  subtotal_amount BIGINT NOT NULL CHECK (subtotal_amount >= 0),
  
  -- Discounts
  discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  discount_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Shipping
  shipping_amount BIGINT NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  shipping_method TEXT,
  
  -- Tax
  tax_amount BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  tax_rate DECIMAL(5, 4), -- e.g., 0.0825 for 8.25%
  tax_included BOOLEAN NOT NULL DEFAULT false,
  
  -- Total amount (subtotal - discount + shipping + tax)
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  
  -- Refunds
  refunded_amount BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  
  -- ========================================================================
  -- ADDRESSES
  -- ========================================================================
  
  -- Shipping address
  shipping_address JSONB NOT NULL CHECK (
    shipping_address ? 'first_name' AND
    shipping_address ? 'last_name' AND
    shipping_address ? 'address1' AND
    shipping_address ? 'city' AND
    shipping_address ? 'country' AND
    shipping_address ? 'postal_code'
  ),
  
  -- Billing address (defaults to shipping if not provided)
  billing_address JSONB NOT NULL CHECK (
    billing_address ? 'first_name' AND
    billing_address ? 'last_name' AND
    billing_address ? 'address1' AND
    billing_address ? 'city' AND
    billing_address ? 'country' AND
    billing_address ? 'postal_code'
  ),
  
  -- ========================================================================
  -- PAYMENT INFORMATION
  -- ========================================================================
  
  -- Payment method
  payment_method TEXT, -- e.g., 'credit_card', 'paypal', 'stripe'
  payment_method_title TEXT, -- Display name
  
  -- Payment gateway details
  payment_gateway TEXT,
  payment_gateway_transaction_id TEXT,
  
  -- Payment metadata (e.g., last 4 digits of card)
  payment_metadata JSONB DEFAULT '{}'::JSONB,
  
  -- ========================================================================
  -- ORDER ITEMS (Denormalized for performance)
  -- ========================================================================
  
  -- Total number of items in the order
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count > 0),
  
  -- Total quantity across all items
  total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity > 0),
  
  -- Line items as JSONB for fast access (denormalized)
  line_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- ========================================================================
  -- NOTES & COMMUNICATION
  -- ========================================================================
  
  -- Customer notes
  customer_note TEXT,
  
  -- Internal staff notes
  staff_notes TEXT,
  
  -- Order tags (for organization)
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- ========================================================================
  -- TRACKING
  -- ========================================================================
  
  -- Shipping tracking
  tracking_number TEXT,
  tracking_url TEXT,
  tracking_company TEXT,
  
  -- Source tracking
  source TEXT, -- e.g., 'web', 'mobile', 'pos', 'api'
  source_identifier TEXT, -- e.g., order ID from external system
  referrer_url TEXT,
  
  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- ========================================================================
  -- METADATA
  -- ========================================================================
  
  -- Custom metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Custom fields (extensible)
  custom_fields JSONB DEFAULT '{}'::JSONB,
  
  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_score DECIMAL(5, 2) CHECK (risk_score >= 0 AND risk_score <= 100),
  
  -- ========================================================================
  -- IP & DEVICE INFORMATION
  -- ========================================================================
  
  -- Customer IP address
  ip_address INET,
  
  -- User agent
  user_agent TEXT,
  
  -- Device information
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  
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
CREATE INDEX idx_orders_store_id ON orders(store_id) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- CRITICAL INDEX 2: store_id + status (Most Common Query Pattern)
-- ============================================================================
-- Purpose: Optimize queries filtering by order status
-- Pattern: WHERE store_id = 'store_XXXXX' AND status = 'pending'
-- This is the most common query pattern for order management
CREATE INDEX idx_orders_store_id_status ON orders(store_id, status) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- CRITICAL INDEX 3: store_id + financial_status (Payment Tracking)
-- ============================================================================
-- Purpose: Optimize queries for payment status
-- Pattern: WHERE store_id = 'store_XXXXX' AND financial_status = 'paid'
CREATE INDEX idx_orders_store_id_financial_status ON orders(store_id, financial_status) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- CRITICAL INDEX 4: store_id + fulfillment_status (Fulfillment Queries)
-- ============================================================================
-- Purpose: Optimize queries for fulfillment tracking
-- Pattern: WHERE store_id = 'store_XXXXX' AND fulfillment_status = 'unfulfilled'
CREATE INDEX idx_orders_store_id_fulfillment_status ON orders(store_id, fulfillment_status) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- CRITICAL INDEX 5: store_id + created_at (Recent Orders)
-- ============================================================================
-- Purpose: Optimize queries for recently created orders
-- Pattern: WHERE store_id = 'store_XXXXX' ORDER BY created_at DESC
CREATE INDEX idx_orders_store_id_created_at ON orders(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- COMPOSITE INDEX 6: store_id + order_number (Order Lookup)
-- ============================================================================
-- Purpose: Optimize order detail page lookups
-- Pattern: WHERE store_id = 'store_XXXXX' AND order_number = '1001'
CREATE UNIQUE INDEX idx_orders_store_id_order_number ON orders(store_id, order_number) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- COMPOSITE INDEX 7: store_id + customer_email (Customer Order History)
-- ============================================================================
-- Purpose: Optimize customer order history queries
-- Pattern: WHERE store_id = 'store_XXXXX' AND customer_email = 'customer@example.com'
CREATE INDEX idx_orders_store_id_customer_email ON orders(store_id, customer_email) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- COMPOSITE INDEX 8: store_id + customer_id (Registered Customer Orders)
-- ============================================================================
-- Purpose: Optimize registered customer order queries
-- Pattern: WHERE store_id = 'store_XXXXX' AND customer_id = 'uuid'
CREATE INDEX idx_orders_store_id_customer_id ON orders(store_id, customer_id) 
WHERE deleted_at IS NULL AND customer_id IS NOT NULL;

-- ============================================================================
-- INDEX 9: store_id + paid_at (Revenue Reports)
-- ============================================================================
-- Purpose: Optimize revenue reporting queries
-- Pattern: WHERE store_id = 'store_XXXXX' AND paid_at BETWEEN date1 AND date2
CREATE INDEX idx_orders_store_id_paid_at ON orders(store_id, paid_at DESC) 
WHERE deleted_at IS NULL AND paid_at IS NOT NULL;

-- ============================================================================
-- INDEX 10: store_id + tracking_number (Tracking Lookup)
-- ============================================================================
-- Purpose: Optimize tracking number lookups
-- Pattern: WHERE store_id = 'store_XXXXX' AND tracking_number = 'TRACK123'
CREATE INDEX idx_orders_store_id_tracking_number ON orders(store_id, tracking_number) 
WHERE deleted_at IS NULL AND tracking_number IS NOT NULL;

-- ============================================================================
-- FULL-TEXT SEARCH INDEX
-- ============================================================================
-- Purpose: Enable full-text search on order number, customer name, and email
CREATE INDEX idx_orders_search ON orders 
USING gin(to_tsvector('english', 
  coalesce(order_number, '') || ' ' || 
  coalesce(customer_name, '') || ' ' || 
  coalesce(customer_email, '')
)) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Audit trail for all order changes
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Trigger: Auto-generate display_id if not provided
CREATE OR REPLACE FUNCTION orders_generate_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := '#' || NEW.order_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_display_id_trigger
  BEFORE INSERT OR UPDATE OF order_number, display_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_generate_display_id();

-- Trigger: Validate total amount calculation
CREATE OR REPLACE FUNCTION orders_validate_total()
RETURNS TRIGGER AS $$
DECLARE
  calculated_total BIGINT;
BEGIN
  -- Calculate expected total
  calculated_total := NEW.subtotal_amount - NEW.discount_amount + NEW.shipping_amount;
  
  IF NOT NEW.tax_included THEN
    calculated_total := calculated_total + NEW.tax_amount;
  END IF;
  
  -- Allow small rounding differences (1 cent)
  IF ABS(NEW.total_amount - calculated_total) > 1 THEN
    RAISE EXCEPTION 'Order total validation failed: expected %, got %', calculated_total, NEW.total_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_validate_total_trigger
  BEFORE INSERT OR UPDATE OF subtotal_amount, discount_amount, shipping_amount, tax_amount, total_amount, tax_included ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_validate_total();

-- Trigger: Set status timestamps automatically
CREATE OR REPLACE FUNCTION orders_set_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set paid_at when financial_status changes to paid
  IF NEW.financial_status = 'paid' AND (OLD IS NULL OR OLD.financial_status != 'paid') AND NEW.paid_at IS NULL THEN
    NEW.paid_at := NOW();
  END IF;
  
  -- Set confirmed_at when status changes to confirmed
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') AND NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at := NOW();
  END IF;
  
  -- Set fulfilled_at when fulfillment_status changes to fulfilled
  IF NEW.fulfillment_status = 'fulfilled' AND (OLD IS NULL OR OLD.fulfillment_status != 'fulfilled') AND NEW.fulfilled_at IS NULL THEN
    NEW.fulfilled_at := NOW();
  END IF;
  
  -- Set cancelled_at when status changes to cancelled
  IF NEW.status = 'cancelled' AND (OLD IS NULL OR OLD.status != 'cancelled') AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_status_timestamps_trigger
  BEFORE INSERT OR UPDATE OF status, financial_status, fulfillment_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_set_status_timestamps();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Calculate order balance (total - refunded)
CREATE OR REPLACE FUNCTION orders_balance_due(order_row orders)
RETURNS BIGINT AS $$
BEGIN
  RETURN order_row.total_amount - order_row.refunded_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if order is fully paid
CREATE OR REPLACE FUNCTION orders_is_paid(order_row orders)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN order_row.financial_status IN ('paid', 'refunded', 'partially_refunded');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if order is fully fulfilled
CREATE OR REPLACE FUNCTION orders_is_fulfilled(order_row orders)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN order_row.fulfillment_status = 'fulfilled';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if order can be cancelled
CREATE OR REPLACE FUNCTION orders_can_cancel(order_row orders)
RETURNS BOOLEAN AS $$
BEGIN
  -- Cannot cancel if already cancelled, delivered, or fulfilled
  IF order_row.status IN ('cancelled', 'delivered') OR order_row.fulfillment_status = 'fulfilled' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE orders IS 'Multi-tenant order management - each order belongs to a specific store via store_id';
COMMENT ON COLUMN orders.store_id IS 'CRITICAL: Medusa Store ID for multi-tenancy (format: store_XXXXX) - MANDATORY for all orders';
COMMENT ON COLUMN orders.order_number IS 'Unique order number within store (human-readable)';
COMMENT ON COLUMN orders.display_id IS 'Customer-facing order ID (e.g., #1001)';
COMMENT ON COLUMN orders.line_items IS 'Denormalized order items for fast access (JSONB array)';
COMMENT ON COLUMN orders.total_amount IS 'Final order total in cents (includes tax, shipping, discounts)';
COMMENT ON COLUMN orders.metadata IS 'Extensible JSON field for custom data';

COMMENT ON INDEX idx_orders_store_id IS 'Basic tenant isolation index';
COMMENT ON INDEX idx_orders_store_id_status IS 'CRITICAL: Optimizes order management queries by status';
COMMENT ON INDEX idx_orders_store_id_financial_status IS 'Optimizes payment tracking queries';
COMMENT ON INDEX idx_orders_store_id_fulfillment_status IS 'Optimizes fulfillment tracking queries';
COMMENT ON INDEX idx_orders_store_id_created_at IS 'Optimizes recent orders queries';
COMMENT ON INDEX idx_orders_store_id_order_number IS 'UNIQUE: Ensures order number uniqueness within store';
COMMENT ON INDEX idx_orders_store_id_customer_email IS 'Optimizes customer order history queries';

COMMENT ON FUNCTION orders_balance_due(orders) IS 'Calculates remaining balance (total - refunded)';
COMMENT ON FUNCTION orders_is_paid(orders) IS 'Checks if order is fully paid';
COMMENT ON FUNCTION orders_is_fulfilled(orders) IS 'Checks if order is fully fulfilled';
COMMENT ON FUNCTION orders_can_cancel(orders) IS 'Checks if order can be cancelled';

-- ============================================================================
-- MIGRATION COMPLETE: Orders Table
-- ============================================================================
-- Achievements:
-- ✅ Orders table created with mandatory store_id column (TEXT)
-- ✅ store_id validated against Medusa Store ID format (store_XXXXX)
-- ✅ 11 indexes created for optimal multi-tenant query performance
-- ✅ Composite indexes on store_id + frequently filtered fields
-- ✅ Full-text search support
-- ✅ Comprehensive order lifecycle management
-- ✅ Auto-generated display IDs and timestamps
-- ✅ Total amount validation
-- ✅ Status timestamp tracking
-- ✅ Audit trail for all changes
-- ✅ Helper functions for order management
--
-- Next: Apply migrations to database
-- ============================================================================

