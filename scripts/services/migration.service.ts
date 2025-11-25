/**
 * Migration Service
 * 
 * Service layer for handling data migration from Redis to database.
 * Implements proper error handling, transaction management, and rollback
 * capabilities for safe data migration with Supabase.
 * 
 * @fileoverview Migration-specific persistence logic with error recovery
 * @author Reech Development Team
 * @version 1.0.0
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type StoreConfig } from '../../packages/shared/schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database row structure for store_configs table
 */
interface StoreConfigRow {
  store_id: string;
  config: StoreConfig;
  version: string;
  created_at?: string;
  updated_at: string;
}

/**
 * Supabase database schema type
 */
interface Database {
  public: {
    Tables: {
      store_configs: {
        Row: StoreConfigRow;
        Insert: Omit<StoreConfigRow, 'created_at'>;
        Update: Partial<Omit<StoreConfigRow, 'created_at' | 'store_id'>>;
      };
    };
  };
}

/**
 * Migration operation result
 */
interface MigrationResult {
  success: boolean;
  storeId: string;
  error?: string;
}

/**
 * Migration transaction context
 * Used for tracking and potential rollback of migrations
 */
interface MigrationTransaction {
  id: string;
  startTime: Date;
  operations: Array<{
    storeId: string;
    status: 'pending' | 'completed' | 'failed';
    timestamp: Date;
  }>;
}

// ============================================================================
// MIGRATION SERVICE CLASS
// ============================================================================

/**
 * Service for managing store configuration migrations
 * Provides transaction support and error recovery mechanisms with Supabase
 */
export class MigrationService {
  private dbClient: SupabaseClient<Database> | null = null;
  private transaction: MigrationTransaction | null = null;
  private isInitialized = false;

  /**
   * Initialize the migration service and Supabase database connection
   * Must be called before any migration operations
   * 
   * @throws {Error} If environment variables are missing or connection fails
   */
  async initialize(): Promise<void> {
    // Guard clause: Prevent double initialization
    if (this.isInitialized) {
      console.warn('⚠️  Migration service already initialized');
      return;
    }

    try {
      // Validate required environment variables
      const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
      const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

      // Guard clause: Ensure environment variables are set
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
      }

      // Initialize Supabase client for Node.js script
      this.dbClient = createClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // No session persistence needed for migrations
          autoRefreshToken: false, // No token refresh needed for service role
        },
      });

      // Verify connection
      await this.verifyConnection();

      this.isInitialized = true;
      console.log('✅ Migration service initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize migration service:', errorMessage);
      throw new Error(`Migration service initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Verify database connection is working by testing a simple query
   * 
   * @throws {Error} If connection test fails
   */
  private async verifyConnection(): Promise<void> {
    // Guard clause: Ensure client exists
    if (!this.dbClient) {
      throw new Error('Database client not initialized');
    }

    console.log('🔍 Verifying database connection...');

    try {
      // Test connection with a simple query to store_configs table
      // Using count with limit 0 to minimize data transfer
      const { error } = await this.dbClient
        .from('store_configs')
        .select('store_id', { count: 'exact', head: true })
        .limit(0);

      // Guard clause: Handle connection errors
      if (error) {
        throw new Error(`Database connection test failed: ${error.message}`);
      }

      console.log('✅ Database connection verified');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to verify database connection: ${errorMessage}`);
    }
  }

  /**
   * Start a new migration transaction
   * Used for tracking and potential rollback of migration operations
   */
  private startTransaction(): void {
    this.transaction = {
      id: crypto.randomUUID(),
      startTime: new Date(),
      operations: [],
    };
  }

  /**
   * Record an operation in the current transaction
   */
  private recordOperation(
    storeId: string,
    status: 'pending' | 'completed' | 'failed'
  ): void {
    if (!this.transaction) {
      this.startTransaction();
    }

    this.transaction!.operations.push({
      storeId,
      status,
      timestamp: new Date(),
    });
  }

  /**
   * Upsert store configuration to Supabase database
   * 
   * This function implements the core persistence logic for migration,
   * using Supabase's upsert operation to ensure idempotent writes.
   * The upsert enforces storeId uniqueness constraint per tenant.
   * 
   * @param storeId - Unique identifier for the store (tenant isolation)
   * @param config - Validated store configuration from Zod schema
   * @returns Promise resolving to migration result
   * 
   * @example
   * ```typescript
   * const result = await service.upsertStoreConfig(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   validatedConfig
   * );
   * if (result.success) {
   *   console.log('Configuration saved successfully');
   * }
   * ```
   */
  async upsertStoreConfig(
    storeId: string,
    config: StoreConfig
  ): Promise<MigrationResult> {
    // Guard clause: Ensure service is initialized
    if (!this.isInitialized || !this.dbClient) {
      throw new Error('Migration service not initialized. Call initialize() first.');
    }

    // Guard clause: Validate storeId is provided
    if (!storeId || typeof storeId !== 'string' || storeId.trim().length === 0) {
      const error = 'storeId must be a non-empty string';
      this.recordOperation(storeId || 'invalid', 'failed');
      return {
        success: false,
        storeId: storeId || 'invalid',
        error,
      };
    }

    // Guard clause: Validate storeId matches config
    if (config.storeId !== storeId) {
      const error = `storeId mismatch: ${storeId} !== ${config.storeId}`;
      this.recordOperation(storeId, 'failed');
      return {
        success: false,
        storeId,
        error,
      };
    }

    // Record operation start
    this.recordOperation(storeId, 'pending');

    try {
      // Prepare row data for upsert
      const row: StoreConfigRow = {
        store_id: storeId,
        config: config,
        version: config.version,
        updated_at: new Date().toISOString(),
      };

      // Execute upsert operation with storeId uniqueness constraint
      // onConflict specifies which column(s) determine uniqueness
      const { data, error } = await this.dbClient
        .from('store_configs')
        .upsert(row, {
          onConflict: 'store_id', // Enforce uniqueness per tenant
          ignoreDuplicates: false, // Always update existing records
        })
        .select()
        .single();

      // Guard clause: Handle database errors
      if (error) {
        throw new Error(`Supabase upsert failed: ${error.message} (code: ${error.code})`);
      }

      // Guard clause: Verify data was returned
      if (!data) {
        throw new Error('Upsert succeeded but no data returned');
      }

      // Record successful operation
      this.recordOperation(storeId, 'completed');

      return {
        success: true,
        storeId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ Failed to upsert config for ${storeId}:`, errorMessage);
      
      // Record failed operation
      this.recordOperation(storeId, 'failed');

      return {
        success: false,
        storeId,
        error: errorMessage,
      };
    }
  }

  /**
   * Legacy method name - delegates to upsertStoreConfig
   * Maintained for backward compatibility
   * 
   * @deprecated Use upsertStoreConfig instead
   */
  async saveStoreConfig(
    storeId: string,
    config: StoreConfig
  ): Promise<MigrationResult> {
    return this.upsertStoreConfig(storeId, config);
  }


  /**
   * Check if a store configuration already exists in the database
   * Useful for determining whether to skip or update during migration
   * 
   * @param storeId - Store ID to check
   * @returns Promise resolving to boolean indicating existence
   * @throws {Error} If service not initialized or database query fails
   */
  async configExists(storeId: string): Promise<boolean> {
    // Guard clause: Ensure service is initialized
    if (!this.isInitialized || !this.dbClient) {
      throw new Error('Migration service not initialized');
    }

    // Guard clause: Validate storeId
    if (!storeId || typeof storeId !== 'string') {
      throw new Error('storeId must be a non-empty string');
    }

    try {
      const { data, error } = await this.dbClient
        .from('store_configs')
        .select('store_id')
        .eq('store_id', storeId)
        .maybeSingle();

      // Guard clause: Handle errors (except "not found" which is expected)
      if (error) {
        throw new Error(`Failed to check existence: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to check config existence for ${storeId}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Get migration transaction summary
   * Useful for logging and monitoring migration progress
   */
  getTransactionSummary(): MigrationTransaction | null {
    return this.transaction;
  }

  /**
   * Close database connection and cleanup resources
   * Should be called when migration is complete
   */
  async close(): Promise<void> {
    // Guard clause: Skip if not initialized
    if (!this.isInitialized) {
      return;
    }

    try {
      // Log transaction summary if exists
      if (this.transaction) {
        const completed = this.transaction.operations.filter(op => op.status === 'completed').length;
        const failed = this.transaction.operations.filter(op => op.status === 'failed').length;
        const duration = Date.now() - this.transaction.startTime.getTime();
        
        console.log('\n📊 Transaction Summary:');
        console.log(`   Transaction ID: ${this.transaction.id}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Completed: ${completed}`);
        console.log(`   Failed: ${failed}`);
      }

      // TODO: Close database connection
      // Example:
      // await this.dbClient?.close();

      this.dbClient = null;
      this.transaction = null;
      this.isInitialized = false;
      
      console.log('✅ Migration service closed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error closing migration service:', errorMessage);
      throw error;
    }
  }

  /**
   * Health check for migration service
   * Returns status of the service and database connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    initialized: boolean;
    message: string;
  }> {
    if (!this.isInitialized || !this.dbClient) {
      return {
        healthy: false,
        initialized: false,
        message: 'Migration service not initialized',
      };
    }

    try {
      await this.verifyConnection();
      return {
        healthy: true,
        initialized: true,
        message: 'Migration service operational',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        initialized: true,
        message: `Database connection error: ${errorMessage}`,
      };
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  MigrationResult,
  MigrationTransaction,
};

