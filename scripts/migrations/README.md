# Store Configuration Migration

This directory contains the migration scripts for safely transferring store configurations from Redis to the database.

## Overview

The migration system provides a robust, safe environment for migrating store configurations with:

- ✅ **Schema Validation**: All configurations validated against Zod schemas before migration
- 🔄 **Transaction Support**: Track all operations with rollback capabilities
- 🔍 **Dry Run Mode**: Test migrations without making changes
- 📊 **Detailed Statistics**: Comprehensive migration reports
- 🛡️ **Error Handling**: Graceful error recovery with detailed logging

## Directory Structure

```
scripts/
├── migrations/
│   ├── README.md                      # This file
│   └── migrate-redis-configs.ts       # Main migration execution script
└── services/
    └── migration.service.ts           # Migration service layer
```

## Prerequisites

Before running migrations, ensure you have:

1. **Environment Variables** configured:
   ```bash
   # Required for Redis connection
   KV_REST_API_URL=your_redis_url
   KV_REST_API_TOKEN=your_redis_token
   
   # Will be required once database is integrated
   # NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

2. **Dependencies** installed:
   ```bash
   pnpm install
   ```

3. **TypeScript** execution capability:
   ```bash
   pnpm add -D tsx
   ```

## Usage

### Dry Run (Recommended First Step)

Always start with a dry run to validate your data without making changes:

```bash
pnpm tsx scripts/migrations/migrate-redis-configs.ts --dry-run
```

This will:
- Connect to Redis
- Scan for all store configurations
- Validate each configuration against the schema
- Report what would be migrated
- **NOT** write any data to the database

### Live Migration

Once you're satisfied with the dry run results:

```bash
pnpm tsx scripts/migrations/migrate-redis-configs.ts
```

This will:
- Connect to Redis and database
- Migrate all valid configurations
- Skip invalid or problematic configurations
- Provide detailed success/failure statistics

## Output Example

```
============================================================
🚀 STARTING REDIS → DATABASE MIGRATION
============================================================
Mode: 🔍 DRY RUN
Timestamp: 2025-10-02T10:30:00.000Z
============================================================

📋 Step 1: Scanning Redis for store configurations...
   Found 15 configurations

📦 Step 2: Processing configurations...

   Processing: 123e4567-e89b-12d3-a456-426614174000
   ✅ Valid: Configuration would be migrated
   
   Processing: 234e5678-e89b-12d3-a456-426614174001
   ❌ Failed: Schema validation error

✅ Migration process completed

============================================================
📊 MIGRATION SUMMARY
============================================================
Total Configurations Found: 15
✅ Successfully Migrated:   14
❌ Failed:                  1
⏭️  Skipped:                 0

------------------------------------------------------------
❌ ERRORS ENCOUNTERED:
------------------------------------------------------------

1. Store ID: 234e5678-e89b-12d3-a456-426614174001
   Error: Schema validation failed
   Data: [
     {
       "path": ["theme", "colors", "primary"],
       "message": "Primary color must be a valid hex color"
     }
   ]

============================================================
```

## Architecture

### 1. Migration Script (`migrate-redis-configs.ts`)

**Responsibilities:**
- Environment validation
- Redis connection management
- Migration orchestration
- Statistics tracking and reporting
- CLI argument parsing

**Key Features:**
- Early returns for invalid data
- Comprehensive error logging
- Transaction tracking
- Graceful cleanup

### 2. Migration Service (`migration.service.ts`)

**Responsibilities:**
- Database connection management
- Store configuration persistence
- Transaction management
- Health checks and verification

**Key Features:**
- Guard clauses for safety
- Operation recording for rollback
- Connection verification
- Resource cleanup

## Development Notes

### Current Implementation Status

✅ **Completed:**
- Migration script scaffolding
- Environment validation
- Redis data retrieval
- Schema validation with Zod
- Statistics tracking
- Error handling and reporting
- Dry run mode

⏳ **Pending (Database Integration):**
- Supabase client initialization
- Actual database write operations
- Connection verification
- Rollback implementation

### Testing the Migration

Before the database is connected, you can test the migration logic:

1. **Validate Environment:**
   ```bash
   # Ensure Redis environment variables are set
   echo $KV_REST_API_URL
   echo $KV_REST_API_TOKEN
   ```

2. **Run Dry Mode:**
   ```bash
   pnpm tsx scripts/migrations/migrate-redis-configs.ts --dry-run
   ```

3. **Check Output:**
   - Verify all configurations are found
   - Review validation errors
   - Ensure expected success rate

### Adding Database Integration

When ready to integrate the database, update:

1. **`migration.service.ts`:**
   ```typescript
   // In initialize()
   this.dbClient = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   
   // In saveStoreConfig()
   const { error } = await this.dbClient
     .from('store_configs')
     .upsert({
       store_id: storeId,
       config: config,
       version: config.version,
       updated_at: new Date().toISOString(),
     });
   ```

2. **`migrate-redis-configs.ts`:**
   ```typescript
   // Add to EnvSchema
   NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
   NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
   ```

## Error Recovery

### Common Issues and Solutions

**Issue: "Environment validation failed"**
- **Solution:** Ensure all required environment variables are set
- **Check:** `.env.local` file contains `KV_REST_API_URL` and `KV_REST_API_TOKEN`

**Issue: "Schema validation failed"**
- **Solution:** Fix the invalid configuration in Redis or update the schema
- **Check:** Review the detailed error output for specific validation failures

**Issue: "Migration service not initialized"**
- **Solution:** Ensure `initialize()` is called before any operations
- **Check:** Migration script properly awaits service initialization

**Issue: "Invalid key format"**
- **Solution:** Ensure Redis keys follow the format `store:{storeId}:config`
- **Check:** Verify key naming convention in Redis

## Best Practices

1. **Always run dry-run first** before live migration
2. **Backup Redis data** before migration
3. **Review error logs** carefully
4. **Test with small datasets** first
5. **Monitor database performance** during migration
6. **Keep transaction logs** for audit trails

## Rollback Strategy

If migration fails or data corruption is detected:

1. **Stop the migration** immediately
2. **Review error logs** in the transaction summary
3. **Identify problematic configurations**
4. **Fix data issues** in Redis or database
5. **Re-run migration** with `--dry-run` to validate fixes

## Support

For issues or questions:
1. Check error logs in the console output
2. Review validation errors in the summary
3. Verify environment configuration
4. Check database connection and permissions

## Future Enhancements

Potential improvements to consider:

- [ ] Batch processing for large datasets
- [ ] Progress bar for long-running migrations
- [ ] Email notifications on completion
- [ ] Automatic rollback on critical failures
- [ ] Migration history tracking in database
- [ ] Parallel processing for faster migrations
- [ ] Resume capability for interrupted migrations

---

**Last Updated:** October 2, 2025  
**Version:** 1.0.0  
**Maintainer:** Reech Development Team

