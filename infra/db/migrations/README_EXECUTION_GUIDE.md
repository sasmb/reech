# Database Migration Execution Guide

This guide provides step-by-step instructions for executing the database migrations to fix the enum type issues.

## Problem Summary

The original schema files (`00_base.sql` and `01_tenants.sql`) were failing because:
1. DO blocks for enum creation didn't persist across separate file executions
2. The `subscription_status_type` enum wasn't available when `tenants` table tried to use it
3. Result: `ERROR: 42703: column "subscription_status" does not exist`

## Solution

We've created a consolidated migration file that combines all schema definitions in a single execution, ensuring enum types are available when tables reference them.

## Execution Steps

### Step 1: Check Current Database State

Before running any migrations, check what already exists:

```sql
-- Run this in Supabase SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT typname FROM pg_type WHERE typtype = 'e';
```

### Step 2: Clean Up (If Needed)

**⚠️ WARNING: This will delete ALL data in these tables!**

If you have partial schema objects or need to start fresh, run:

```sql
-- Execute: 000_cleanup.sql
-- This drops all tables, types, and functions
```

Only do this if:
- You have conflicting partial schema
- You're starting fresh in development
- You've backed up any important data

### Step 3: Execute Main Migration

Now run the consolidated migration:

```sql
-- Execute: 001_base_and_tenants_schema.sql
-- Copy the ENTIRE file contents into Supabase SQL Editor
-- Click "Run" (or Cmd/Ctrl + Enter)
```

**What this creates:**
- ✅ All 6 enum types (status_type, subscription_status_type, etc.)
- ✅ All utility functions (update_updated_at_column, generate_slug, etc.)
- ✅ audit_logs table
- ✅ tenants table (with enum columns)
- ✅ store_configs table
- ✅ tenant_domains table
- ✅ tenant_settings table
- ✅ All indexes and triggers
- ✅ Helper functions (create_tenant, soft_delete_tenant)

**Expected result:**
```
Success. No rows returned.
(or)
Success. Rows affected: X
```

### Step 4: Verify Migration Success

Run the verification script:

```sql
-- Execute: verify_types.sql
-- This runs 8 tests to confirm everything is working
```

**Expected results:**
- Test 1: 6 enum types found
- Test 2: 5 tables exist
- Test 3: 2 columns using enum types correctly
- Test 4: Foreign keys properly configured
- Test 5: Indexes created
- Test 6: Triggers active
- Test 7: Extensions enabled
- Test 8: "SUCCESS: Enum types are working correctly!"

### Step 5: Execute Store Members Migration

Once the base schema is verified, run the store members migration:

```sql
-- Execute: 003_add_store_members_table.sql
-- This creates the store_members table for authorization
```

This depends on:
- `user_role_type` enum ✅ (created in step 3)
- `tenants` table ✅ (created in step 3)

## File Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `000_cleanup.sql` | Drop all schema objects | Only if you need to start fresh |
| `001_base_and_tenants_schema.sql` | **Main migration** - Creates all base schema | Execute this FIRST |
| `verify_types.sql` | Verification tests | Run after main migration to confirm success |
| `003_add_store_members_table.sql` | Store members table | Run AFTER main migration succeeds |

## Troubleshooting

### Issue: "Type already exists" error

**Solution:** Run `000_cleanup.sql` first to drop existing types, then run `001_base_and_tenants_schema.sql` again.

### Issue: "Table already exists" error

**Solution:** Run `000_cleanup.sql` first to drop existing tables, then run `001_base_and_tenants_schema.sql` again.

### Issue: SQL Editor size limit exceeded

**Backup Solution 1:** Use Supabase CLI instead:
```bash
cd /Users/realsamogb/Desktop/reech/reech-saas
supabase db push --file infra/db/migrations/001_base_and_tenants_schema.sql
```

**Backup Solution 2:** Split execution into chunks:
1. Execute lines 1-100 (extensions + enums)
2. Verify enums exist: `SELECT typname FROM pg_type WHERE typtype = 'e';`
3. Execute lines 101-end (functions + tables)

### Issue: Foreign key constraint violation

**Cause:** Tables created out of order.

**Solution:** The migration file already handles this by creating tables in dependency order:
1. audit_logs (no dependencies)
2. tenants (no dependencies)
3. store_configs (depends on tenants)
4. tenant_domains (depends on tenants)
5. tenant_settings (depends on tenants)

### Issue: Still getting "subscription_status does not exist"

**Diagnosis steps:**
```sql
-- 1. Check if enum type exists
SELECT typname FROM pg_type WHERE typname = 'subscription_status_type';
-- Expected: 1 row

-- 2. Check if tenants table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'tenants';
-- Expected: 1 row

-- 3. Check column type
SELECT column_name, udt_name 
FROM information_schema.columns 
WHERE table_name = 'tenants' AND column_name = 'subscription_status';
-- Expected: udt_name = 'subscription_status_type'
```

If enum exists but column doesn't use it, you may have a stale table. Run `000_cleanup.sql` and start over.

## Execution via Supabase Dashboard

### Method 1: SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `001_base_and_tenants_schema.sql`
5. Paste into the editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success" message
8. Run `verify_types.sql` to confirm

### Method 2: Supabase CLI

```bash
# From project root
cd /Users/realsamogb/Desktop/reech/reech-saas

# Initialize (if not already done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push --file infra/db/migrations/001_base_and_tenants_schema.sql

# Verify
supabase db execute --file infra/db/migrations/verify_types.sql
```

## Next Steps After Successful Migration

Once the database schema is fixed and verified:

1. ✅ Database schema is complete
2. ⏭️ Proceed to **Supabase Auth Package Migration**
   - Install `@supabase/ssr`
   - Remove `@supabase/auth-helpers-nextjs`
   - Update all auth client code
   - Fix dashboard home page

See the main project plan for auth migration details.

## Support

If you encounter issues not covered here:

1. Check the verification queries in `verify_types.sql`
2. Review the plan document: `fix-database-schema.plan.md`
3. Check Supabase logs in Dashboard → Database → Logs
4. Ensure you're using PostgreSQL 13+ (Supabase default)

## Migration History

- `000_cleanup.sql` - Optional cleanup script
- `001_base_and_tenants_schema.sql` - **Main migration (EXECUTE THIS)**
- `verify_types.sql` - Verification queries
- `003_add_store_members_table.sql` - Store members (execute after main migration)

