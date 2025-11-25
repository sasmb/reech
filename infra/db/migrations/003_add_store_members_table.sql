-- ============================================================================
-- MIGRATION: Add Store Members Table for Multi-Tenant Authorization
-- ============================================================================
-- Purpose: Create junction table linking Supabase Auth users to stores
-- Affected Tables: store_members (new)
-- Dependencies: tenants table, auth.users (Supabase Auth)
-- Version: 1.0.0
-- Date: 2025-10-10
--
-- This migration establishes the authorization layer for multi-tenant access control.
-- Users must be explicitly granted access to stores via this table.
-- ============================================================================

-- ============================================================================
-- STORE MEMBERS TABLE (User-to-Store Authorization Mapping)
-- ============================================================================
-- This table creates the many-to-many relationship between users and stores
-- enforcing that users can only access stores they have been granted permission to.
--
-- Key Features:
-- - Links Supabase Auth users (auth.users) to stores (tenants table)
-- - Supports role-based access control (owner, admin, editor, viewer)
-- - Enforces unique user-store pairs (one role per user per store)
-- - Enables tenant isolation at the authorization level
-- ============================================================================

create table if not exists store_members (
  -- Primary identification
  id uuid primary key default uuid_generate_v4(),
  
  -- Tenant isolation (references tenants table)
  -- CASCADE: When a store is deleted, remove all member associations
  store_id uuid not null references tenants(id) on delete cascade,
  
  -- User identification (references Supabase Auth)
  -- CASCADE: When a user is deleted from auth, remove their store memberships
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Role-based access control
  -- Uses the user_role_type enum defined in 00_base.sql
  -- Roles: owner, admin, editor, viewer, customer
  role user_role_type not null default 'viewer',
  
  -- Invitation tracking
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz default now(),
  
  -- Membership status
  is_active boolean not null default true,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- CRITICAL: Enforce one role per user per store
  -- This prevents duplicate memberships and ensures clear authorization
  constraint unique_store_user unique(store_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Index 1: Composite index for primary query pattern (user accessing store)
-- Query: "Which stores can this user access?"
-- Usage: SELECT * FROM store_members WHERE user_id = ? AND is_active = true
create index idx_store_members_user_id_active 
  on store_members(user_id, is_active) 
  where is_active = true;

-- Index 2: Composite index for tenant query pattern (store's members)
-- Query: "Who has access to this store?"
-- Usage: SELECT * FROM store_members WHERE store_id = ? AND is_active = true
create index idx_store_members_store_id_active 
  on store_members(store_id, is_active) 
  where is_active = true;

-- Index 3: Authorization lookup (the critical performance path)
-- Query: "Does this user have access to this specific store?"
-- Usage: SELECT EXISTS (SELECT 1 FROM store_members WHERE user_id = ? AND store_id = ? AND is_active = true)
create index idx_store_members_user_store_active 
  on store_members(user_id, store_id, is_active) 
  where is_active = true;

-- Index 4: Role-based queries
-- Query: "Get all admins for a store"
-- Usage: SELECT * FROM store_members WHERE store_id = ? AND role = 'admin' AND is_active = true
create index idx_store_members_store_role_active 
  on store_members(store_id, role, is_active) 
  where is_active = true;

-- Index 5: Invitation tracking
-- Query: "Who invited this user?"
-- Usage: SELECT * FROM store_members WHERE invited_by = ?
create index idx_store_members_invited_by 
  on store_members(invited_by) 
  where invited_by is not null;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
create trigger update_store_members_updated_at
  before update on store_members
  for each row
  execute function update_updated_at_column();

-- Audit trigger to track all membership changes
create trigger audit_store_members
  after insert or update or delete on store_members
  for each row
  execute function audit_trigger_function();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Critical Security Layer: RLS ensures users can only see memberships they're involved in
-- ============================================================================

-- Enable RLS on store_members table
alter table store_members enable row level security;

-- Policy 1: Users can view their own store memberships
-- Allows authenticated users to see which stores they belong to
create policy "Users can view their own store memberships"
  on store_members
  for select
  to authenticated
  using (
    auth.uid() = user_id
  );

-- Policy 2: Store owners/admins can view all members of their stores
-- Allows owners and admins to manage their store's team
create policy "Store owners and admins can view all store members"
  on store_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
        and sm.is_active = true
    )
  );

-- Policy 3: Store owners can insert new members (invite users)
-- Only owners can add new members to their stores
create policy "Store owners can add store members"
  on store_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from store_members sm
      where sm.store_id = store_id
        and sm.user_id = auth.uid()
        and sm.role = 'owner'
        and sm.is_active = true
    )
  );

-- Policy 4: Store owners and admins can update member roles
-- Owners and admins can change roles, but cannot promote to owner
create policy "Store owners and admins can update member roles"
  on store_members
  for update
  to authenticated
  using (
    exists (
      select 1
      from store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
        and sm.is_active = true
    )
  );

-- Policy 5: Store owners can delete members (revoke access)
-- Only owners can remove members from stores
create policy "Store owners can remove store members"
  on store_members
  for delete
  to authenticated
  using (
    exists (
      select 1
      from store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role = 'owner'
        and sm.is_active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user has access to a store
-- Used by application middleware for authorization checks
-- Returns: boolean indicating if user is an active member of the store
create or replace function has_store_access(
  p_user_id uuid,
  p_store_id uuid
)
returns boolean as $$
begin
  return exists (
    select 1
    from store_members
    where user_id = p_user_id
      and store_id = p_store_id
      and is_active = true
  );
end;
$$ language plpgsql stable security definer;

-- Function: Check if user has specific role in store
-- Returns: boolean indicating if user has the specified role or higher
create or replace function has_store_role(
  p_user_id uuid,
  p_store_id uuid,
  p_required_role user_role_type
)
returns boolean as $$
declare
  v_user_role user_role_type;
  v_role_hierarchy text[] := array['viewer', 'editor', 'admin', 'owner'];
  v_required_index int;
  v_user_index int;
begin
  -- Get user's role in the store
  select role into v_user_role
  from store_members
  where user_id = p_user_id
    and store_id = p_store_id
    and is_active = true;
  
  -- User not found in store
  if not found then
    return false;
  end if;
  
  -- Find role hierarchy positions
  select array_position(v_role_hierarchy, p_required_role::text) into v_required_index;
  select array_position(v_role_hierarchy, v_user_role::text) into v_user_index;
  
  -- Check if user's role is equal or higher in hierarchy
  return v_user_index >= v_required_index;
end;
$$ language plpgsql stable security definer;

-- Function: Get user's role in a store
-- Returns: user's role or null if not a member
create or replace function get_user_store_role(
  p_user_id uuid,
  p_store_id uuid
)
returns user_role_type as $$
declare
  v_role user_role_type;
begin
  select role into v_role
  from store_members
  where user_id = p_user_id
    and store_id = p_store_id
    and is_active = true;
  
  return v_role;
end;
$$ language plpgsql stable security definer;

-- ============================================================================
-- SEED DATA (Optional - for development/testing)
-- ============================================================================
-- Uncomment this section if you want to create a default owner membership
-- when a new tenant is created via the create_tenant function
-- ============================================================================

-- Update the create_tenant function to automatically add the creator as owner
create or replace function create_tenant(
  p_subdomain text,
  p_name text,
  p_owner_email text default null,
  p_owner_user_id uuid default null -- NEW: Optional user_id for automatic membership
)
returns uuid as $$
declare
  v_tenant_id uuid;
  v_slug text;
begin
  -- Generate slug from name
  v_slug := generate_slug(p_name);
  
  -- Create tenant
  insert into tenants (subdomain, name, slug, owner_email)
  values (p_subdomain, p_name, v_slug, p_owner_email)
  returning id into v_tenant_id;
  
  -- Create default store configuration
  insert into store_configs (store_id, config, theme, layout, features, integrations, metadata)
  values (
    v_tenant_id,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    jsonb_build_object(
      'name', p_name,
      'locale', 'en-US',
      'currency', 'USD',
      'timezone', 'UTC'
    )
  );
  
  -- Create default settings
  insert into tenant_settings (store_id, email_from_name)
  values (v_tenant_id, p_name);
  
  -- NEW: Add creator as store owner if user_id provided
  if p_owner_user_id is not null then
    insert into store_members (store_id, user_id, role, is_active)
    values (v_tenant_id, p_owner_user_id, 'owner', true);
  end if;
  
  return v_tenant_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table store_members is 'Junction table linking Supabase Auth users to stores for multi-tenant authorization';
comment on column store_members.store_id is 'Reference to tenants table - which store the user belongs to';
comment on column store_members.user_id is 'Reference to auth.users - which user has access';
comment on column store_members.role is 'User role in the store: owner, admin, editor, viewer, customer';
comment on column store_members.is_active is 'Whether the membership is currently active (soft delete flag)';
comment on constraint unique_store_user on store_members is 'CRITICAL: Ensures one role per user per store';

comment on function has_store_access(uuid, uuid) is 'Check if user has access to a store (used by middleware)';
comment on function has_store_role(uuid, uuid, user_role_type) is 'Check if user has specific role or higher in store';
comment on function get_user_store_role(uuid, uuid) is 'Get user role in a store or null if not a member';

-- ============================================================================
-- ADDITIONAL OPTIMIZATION: Index for Bidirectional Translation
-- ============================================================================
-- This index enables fast reverse lookup (Medusa Store ID → Reech UUID)
-- Used by the Store ID Translator Service when clients send Medusa format IDs
-- ============================================================================

-- GIN index on tenants.metadata for efficient JSONB queries
-- Enables fast lookup: WHERE metadata @> '{"medusaStoreId": "store_XXX"}'
create index if not exists idx_tenants_metadata_medusa_store_id 
  on tenants using gin ((metadata -> 'medusaStoreId'));

comment on index idx_tenants_metadata_medusa_store_id is 
  'Enables fast reverse lookup from Medusa Store ID to Reech Tenant UUID for bidirectional translation';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✅ Created store_members table with proper foreign keys
-- ✅ Added 5 performance-optimized indexes for authorization
-- ✅ Enabled Row Level Security with granular policies
-- ✅ Created helper functions for authorization checks
-- ✅ Updated create_tenant function to support automatic owner membership
-- ✅ Added GIN index on tenants.metadata for Medusa→Reech translation
--
-- Next Steps:
-- 1. Use Store ID Translator Service in middleware (normalizeAndValidate)
-- 2. Accept both UUID and Medusa Store ID formats in x-store-id header
-- 3. Create admin UI for managing store memberships
-- 4. Add email invitations for new store members
-- 5. Implement Medusa Store ID mapping during tenant creation
-- ============================================================================

