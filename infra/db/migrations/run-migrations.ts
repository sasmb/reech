/**
 * ============================================================================
 * DATABASE MIGRATIONS RUNNER
 * ============================================================================
 * 
 * This script applies SQL migrations to the Supabase database in order.
 * 
 * Usage:
 *   pnpm tsx infra/db/migrations/run-migrations.ts
 * 
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (for admin operations)
 * 
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// ============================================================================
// CONFIGURATION
// ============================================================================

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key is required'),
});

const MIGRATIONS_DIR = join(__dirname);

const MIGRATIONS = [
  '001_add_products_table.sql',
  '002_add_orders_table.sql',
] as const;

// ============================================================================
// TYPES
// ============================================================================

interface MigrationResult {
  filename: string;
  success: boolean;
  error?: string;
  duration?: number;
}

interface MigrationSummary {
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');

  const validation = EnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
  });

  if (!validation.success) {
    console.error('❌ Environment validation failed:\n');
    validation.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  console.log('✅ Environment variables validated\n');
  return validation.data;
}

// ============================================================================
// MIGRATION EXECUTION
// ============================================================================

async function runMigration(
  client: ReturnType<typeof createClient>,
  filename: string
): Promise<MigrationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`📄 Reading migration file: ${filename}`);
    const filePath = join(MIGRATIONS_DIR, filename);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`⚙️  Executing migration: ${filename}`);
    
    // Execute the SQL migration
    // Note: Supabase doesn't have a direct .query() method in the JS client
    // We need to use the REST API or pg client directly
    // For now, we'll use rpc to execute raw SQL
    const { error } = await client.rpc('exec_sql', { sql_query: sql });

    if (error) {
      throw new Error(error.message);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Migration completed: ${filename} (${duration}ms)\n`);

    return {
      filename,
      success: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Migration failed: ${filename}`);
    console.error(`   Error: ${errorMessage}\n`);

    return {
      filename,
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       DATABASE MIGRATIONS RUNNER                          ║');
  console.log('║       Phase 1: Data Association Schema                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Validate environment
  const env = validateEnvironment();

  // Initialize Supabase client with service role key
  console.log('🔌 Connecting to Supabase...\n');
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Run migrations in order
  console.log(`📋 Running ${MIGRATIONS.length} migrations...\n`);
  const results: MigrationResult[] = [];

  for (const migration of MIGRATIONS) {
    const result = await runMigration(supabase, migration);
    results.push(result);

    // Stop on first error
    if (!result.success) {
      console.error('❌ Stopping migration process due to error.\n');
      break;
    }
  }

  // Generate summary
  const summary: MigrationSummary = {
    total: MIGRATIONS.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };

  // Print summary
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       MIGRATION SUMMARY                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`Total Migrations:    ${summary.total}`);
  console.log(`Successful:          ${summary.successful}`);
  console.log(`Failed:              ${summary.failed}\n`);

  if (summary.successful > 0) {
    console.log('✅ Successful Migrations:');
    results
      .filter((r) => r.success)
      .forEach((r) => {
        console.log(`   - ${r.filename} (${r.duration}ms)`);
      });
    console.log();
  }

  if (summary.failed > 0) {
    console.log('❌ Failed Migrations:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.filename}`);
        console.log(`     Error: ${r.error}`);
      });
    console.log();
  }

  // Exit with appropriate code
  if (summary.failed > 0) {
    console.log('❌ Migration process completed with errors.\n');
    console.log('💡 Tip: You may need to apply migrations manually using the Supabase Dashboard or CLI.');
    console.log('   See: infra/db/migrations/README.md for instructions.\n');
    process.exit(1);
  } else {
    console.log('✅ All migrations completed successfully!\n');
    console.log('Next Steps:');
    console.log('   1. Verify tables: SELECT * FROM information_schema.tables WHERE table_name IN (\'products\', \'orders\');');
    console.log('   2. Verify indexes: SELECT * FROM pg_indexes WHERE tablename IN (\'products\', \'orders\');');
    console.log('   3. Test constraints: See infra/db/migrations/README.md for validation queries.\n');
    process.exit(0);
  }
}

// ============================================================================
// NOTES & LIMITATIONS
// ============================================================================

/**
 * IMPORTANT: Direct SQL Execution Limitation
 * 
 * The Supabase JavaScript client doesn't support direct SQL execution for
 * DDL statements (CREATE TABLE, CREATE INDEX, etc.).
 * 
 * This script is provided as a reference implementation. For actual migration
 * execution, you have three options:
 * 
 * 1. **Supabase Dashboard (Recommended for Development)**
 *    - Navigate to SQL Editor in your Supabase project
 *    - Copy and paste the migration SQL
 *    - Execute manually
 * 
 * 2. **Supabase CLI (Recommended for Production)**
 *    ```bash
 *    supabase db execute --file infra/db/migrations/001_add_products_table.sql
 *    supabase db execute --file infra/db/migrations/002_add_orders_table.sql
 *    ```
 * 
 * 3. **Direct PostgreSQL Connection**
 *    - Use a PostgreSQL client (pg, psql) to connect directly
 *    - Execute the migration files
 * 
 * This script will be updated once a suitable execution method is implemented.
 */

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled rejection:', error);
  console.error('\n💡 Tip: Check your environment variables and Supabase connection.\n');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  console.error('\n💡 Tip: This may indicate a configuration or file system error.\n');
  process.exit(1);
});

// ============================================================================
// EXECUTION
// ============================================================================

// Only run if executed directly (not imported)
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as runMigrations };

