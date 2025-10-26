-- ============================================================================
-- MIGRATION: Fix Infinite Recursion in store_members RLS Policies
-- ============================================================================
-- Purpose: Resolve infinite recursion error in store_members RLS policies
-- Problem: Policies were querying store_members table from within themselves
-- Solution: Create a security definer view that bypasses RLS
-- Version: 1.0.0
-- Date: 2025-10-26
-- Error Fixed: 42P17 - infinite recursion detected in policy for relation "store_members"
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop Problematic RLS Policies
-- ============================================================================
-- These policies cause infinite recursion by querying store_members from within
-- the policy check. We'll recreate them using a security definer view instead.
-- ============================================================================

DROP POLICY IF EXISTS "Store owners and admins can view all store members" ON store_members;
DROP POLICY IF EXISTS "Store owners can add store members" ON store_members;
DROP POLICY IF EXISTS "Store owners and admins can update member roles" ON store_members;
DROP POLICY IF EXISTS "Store owners can remove store members" ON store_members;

-- Note: We keep the policy "Users can view their own store memberships" because
-- it doesn't cause recursion (it only checks auth.uid() = user_id)

-- ============================================================================
-- STEP 2: Create Security Definer View
-- ============================================================================
-- This view bypasses RLS on store_members, allowing policies to query
-- membership data without triggering recursive policy checks.
--
-- Key Feature: security_invoker=false (equivalent to SECURITY DEFINER)
-- This means the view executes with the privileges of the view owner,
-- bypassing RLS policies on the underlying table.
-- ============================================================================

CREATE OR REPLACE VIEW user_store_permissions 
WITH (security_invoker=false)
AS
SELECT 
  store_id,
  user_id,
  role,
  is_active
FROM store_members;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON user_store_permissions TO authenticated;

COMMENT ON VIEW user_store_permissions IS 
  'Security definer view that bypasses RLS on store_members. Used by RLS policies to prevent infinite recursion.';

-- ============================================================================
-- STEP 3: Recreate RLS Policies Using the View
-- ============================================================================
-- These policies now query user_store_permissions view instead of store_members
-- table directly, preventing infinite recursion.
-- ============================================================================

-- Policy 1: Store owners/admins can view all members of their stores
-- Allows owners and admins to see the full team roster
CREATE POLICY "Store owners and admins can view all store members"
  ON store_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_store_permissions usp
      WHERE usp.store_id = store_members.store_id
        AND usp.user_id = auth.uid()
        AND usp.role IN ('owner', 'admin')
        AND usp.is_active = true
    )
  );

-- Policy 2: Store owners can add new members (invite users)
-- Only owners can invite new team members to their stores
CREATE POLICY "Store owners can add store members"
  ON store_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_store_permissions usp
      WHERE usp.store_id = store_id
        AND usp.user_id = auth.uid()
        AND usp.role = 'owner'
        AND usp.is_active = true
    )
  );

-- Policy 3: Store owners and admins can update member roles
-- Owners and admins can change team member roles and status
CREATE POLICY "Store owners and admins can update member roles"
  ON store_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_store_permissions usp
      WHERE usp.store_id = store_members.store_id
        AND usp.user_id = auth.uid()
        AND usp.role IN ('owner', 'admin')
        AND usp.is_active = true
    )
  );

-- Policy 4: Store owners can delete members (revoke access)
-- Only owners can remove team members from stores
CREATE POLICY "Store owners can remove store members"
  ON store_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_store_permissions usp
      WHERE usp.store_id = store_members.store_id
        AND usp.user_id = auth.uid()
        AND usp.role = 'owner'
        AND usp.is_active = true
    )
  );

-- ============================================================================
-- VERIFICATION QUERY (Optional - for testing)
-- ============================================================================
-- Run this query to verify the policies are working correctly:
-- 
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE tablename = 'store_members'
-- ORDER BY policyname;
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✅ Dropped 4 problematic RLS policies that caused infinite recursion
-- ✅ Created user_store_permissions view with security_invoker=false
-- ✅ Recreated 4 RLS policies using the view instead of direct table queries
-- ✅ Granted SELECT permission on view to authenticated users
--
-- Result: Users can now query store_members without infinite recursion errors
-- ============================================================================

