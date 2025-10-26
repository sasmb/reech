# Quick Start - Database Migration

## TL;DR - Execute This Now

### In Supabase SQL Editor:

**Step 1:** Copy and run this entire file:
```
📁 infra/db/migrations/001_base_and_tenants_schema.sql
```

**Step 2:** Verify it worked by running:
```
📁 infra/db/migrations/verify_types.sql
```

**Step 3:** If verification passes, run:
```
📁 infra/db/migrations/003_add_store_members_table.sql
```

✅ **Done!** Your database schema is now fixed.

---

## If You Get Errors

### Error: "Type already exists" or "Table already exists"

**Solution:** Clean up first, then try again:

1. Run: `000_cleanup.sql` (⚠️ deletes all data)
2. Then run: `001_base_and_tenants_schema.sql`
3. Then verify: `verify_types.sql`

### Error: "File too large for SQL Editor"

**Solution A:** Use Supabase CLI instead:
```bash
cd /Users/realsamogb/Desktop/reech/reech-saas
supabase db push --file infra/db/migrations/001_base_and_tenants_schema.sql
```

**Solution B:** Split into chunks and execute sequentially in SQL Editor.

---

## What This Fixes

**Before:** 
```
❌ ERROR: 42703: column "subscription_status" does not exist
❌ Failed to load store memberships
```

**After:**
```
✅ All enum types created
✅ All tables created successfully  
✅ Dashboard loads without errors
```

---

## Files You Need

| Priority | File | Action |
|----------|------|--------|
| 🔴 **REQUIRED** | `001_base_and_tenants_schema.sql` | Execute in Supabase SQL Editor |
| 🟡 Optional | `000_cleanup.sql` | Only if you need fresh start |
| 🟢 Verify | `verify_types.sql` | Confirms migration worked |
| 🔵 Next | `003_add_store_members_table.sql` | After main migration succeeds |

---

## Expected Timeline

- **Cleanup (if needed):** 5 seconds
- **Main migration:** 10-15 seconds
- **Verification:** 5 seconds
- **Store members:** 5 seconds

**Total: ~30 seconds** ⚡

---

## After Database is Fixed

Next task: **Fix Supabase Auth Package**

The dashboard error will still exist until you:
1. Install `@supabase/ssr` package
2. Remove `@supabase/auth-helpers-nextjs`
3. Update auth client code

But let's fix the database first! 🚀

