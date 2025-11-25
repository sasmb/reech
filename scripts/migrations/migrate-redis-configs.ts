/**
 * Redis Store Configuration Migration Script
 * 
 * This script migrates store configurations from Redis to the database.
 * It ensures data integrity through Zod schema validation before persisting
 * to the new storage layer.
 * 
 * @fileoverview Safe migration execution for store configurations
 * @author Reech Development Team
 * @version 1.0.0
 * 
 * Usage:
 *   pnpm tsx scripts/migrations/migrate-redis-configs.ts [--dry-run]
 */

import { Redis } from '@upstash/redis';
import { StoreConfigSchema, type StoreConfig } from '../../packages/shared/schemas';
import { MigrationService } from '../services/migration.service';
import { z } from 'zod';

// ============================================================================
// CONFIGURATION & ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Environment variable schema for migration script
 */
const EnvSchema = z.object({
  KV_REST_API_URL: z.string().url('Invalid Redis URL'),
  KV_REST_API_TOKEN: z.string().min(1, 'Redis token is required'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase key is required'),
});

/**
 * Validates and returns environment variables
 * Ensures early failure if required environment variables are missing
 */
function validateEnvironment() {
  try {
    return EnvSchema.parse({
      KV_REST_API_URL: process.env['KV_REST_API_URL'],
      KV_REST_API_TOKEN: process.env['KV_REST_API_TOKEN'],
      NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// ============================================================================
// MIGRATION STATISTICS TRACKING
// ============================================================================

/**
 * Tracks migration progress and results
 */
interface MigrationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    storeId: string;
    error: string;
    data?: unknown;
  }>;
}

/**
 * Initialize migration statistics
 */
function createMigrationStats(): MigrationStats {
  return {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };
}

/**
 * Display formatted migration statistics
 */
function displayStats(stats: MigrationStats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Configurations Found: ${stats.total}`);
  console.log(`✅ Successfully Migrated:   ${stats.successful}`);
  console.log(`❌ Failed:                  ${stats.failed}`);
  console.log(`⏭️  Skipped:                 ${stats.skipped}`);
  
  if (stats.errors.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('❌ ERRORS ENCOUNTERED:');
    console.log('-'.repeat(60));
    stats.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. Store ID: ${error.storeId}`);
      console.log(`   Error: ${error.error}`);
      if (error.data) {
        console.log(`   Data: ${JSON.stringify(error.data, null, 2)}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================================================
// DATA EXTRACTION AND TRANSFORMATION
// ============================================================================

/**
 * Represents a raw store configuration extracted from Redis
 * This is the temporary structure used before validation
 */
interface RawStoreConfigData {
  /** The unique store identifier extracted from the Redis key */
  storeId: string;
  /** The Redis key from which this configuration was extracted */
  redisKey: string;
  /** The raw configuration data (unparsed JSON) */
  rawData: unknown;
  /** Timestamp when this data was extracted */
  extractedAt: Date;
}

/**
 * Result of the extraction process
 */
interface ExtractionResult {
  /** Successfully extracted configurations */
  configurations: RawStoreConfigData[];
  /** Keys that failed extraction */
  failedKeys: Array<{
    key: string;
    error: string;
  }>;
  /** Total number of keys scanned */
  totalScanned: number;
}

/**
 * Extracts and maps store configurations from Redis
 * 
 * This function is responsible for:
 * 1. Retrieving all store configuration keys from Redis
 * 2. Extracting the storeId from each key
 * 3. Fetching the raw configuration data
 * 4. Mapping to a temporary object structure for validation
 * 
 * @param redisClient - Configured Redis client
 * @returns Promise resolving to extraction result with all configurations
 * 
 * @example
 * ```typescript
 * const result = await extractAndMapStoreConfigs(redisClient);
 * console.log(`Extracted ${result.configurations.length} configurations`);
 * ```
 */
async function extractAndMapStoreConfigs(
  redisClient: Redis
): Promise<ExtractionResult> {
  console.log('📋 Step 1: Extracting store configurations from Redis...');
  
  const result: ExtractionResult = {
    configurations: [],
    failedKeys: [],
    totalScanned: 0,
  };

  try {
    // Step 1: Scan Redis for all store configuration keys
    // Pattern: store:{storeId}:config
    const configKeys = await redisClient.keys('store:*:config');
    result.totalScanned = configKeys.length;
    
    console.log(`   Found ${result.totalScanned} configuration keys\n`);

    // Guard clause: Early return if no configurations found
    if (result.totalScanned === 0) {
      console.log('   ℹ️  No store configurations found in Redis');
      return result;
    }

    console.log('📦 Step 2: Extracting and mapping configuration data...\n');

    // Step 2: Iterate through each key and extract data
    for (const redisKey of configKeys) {
      try {
        // Step 2a: Extract storeId from Redis key
        // Example: "store:123e4567-e89b-12d3-a456-426614174000:config" → "123e4567..."
        const storeId = extractStoreIdFromKey(redisKey);
        console.log(`   Extracting: ${storeId} from ${redisKey}`);

        // Step 2b: Retrieve raw configuration data from Redis
        const rawData = await redisClient.get(redisKey);

        // Guard clause: Skip if no data found for this key
        if (!rawData) {
          console.log(`   ⚠️  Warning: No data found for key ${redisKey}`);
          result.failedKeys.push({
            key: redisKey,
            error: 'No data found',
          });
          continue;
        }

        // Guard clause: Validate that data is an object (not a primitive)
        if (typeof rawData !== 'object' || rawData === null) {
          console.log(`   ❌ Error: Invalid data type for ${redisKey}`);
          result.failedKeys.push({
            key: redisKey,
            error: 'Data is not an object',
          });
          continue;
        }

        // Step 2c: Map to temporary structure for validation
        const mappedConfig: RawStoreConfigData = {
          storeId,
          redisKey,
          rawData,
          extractedAt: new Date(),
        };

        // Step 2d: Add to results
        result.configurations.push(mappedConfig);
        console.log(`   ✅ Extracted: ${storeId}`);

      } catch (error) {
        // Handle extraction errors for individual keys
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`   ❌ Failed to extract ${redisKey}: ${errorMessage}`);
        
        result.failedKeys.push({
          key: redisKey,
          error: errorMessage,
        });
      }
    }

    // Summary
    console.log('\n' + '-'.repeat(60));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('-'.repeat(60));
    console.log(`Total Keys Scanned:        ${result.totalScanned}`);
    console.log(`Successful Extractions:    ${result.configurations.length}`);
    console.log(`Failed Extractions:        ${result.failedKeys.length}`);
    console.log('-'.repeat(60) + '\n');

    return result;
    
  } catch (error) {
    // Handle fatal errors in the extraction process
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Fatal error during extraction: ${errorMessage}`);
    throw new Error(`Configuration extraction failed: ${errorMessage}`);
  }
}

/**
 * Validates that a storeId is present in the raw configuration data
 * This ensures data integrity before migration
 * 
 * @param storeId - Store ID extracted from Redis key
 * @param rawData - Raw configuration data
 * @returns True if storeId matches, false otherwise
 */
function validateStoreIdConsistency(
  storeId: string,
  rawData: unknown
): boolean {
  // Guard clause: Ensure rawData is an object
  if (typeof rawData !== 'object' || rawData === null) {
    return false;
  }

  // Check if storeId exists in the data
  const data = rawData as Record<string, unknown>;
  
  // If storeId exists in data, it must match the extracted storeId
  if ('storeId' in data) {
    return data['storeId'] === storeId;
  }

  // If storeId doesn't exist in data, we'll add it during validation
  return true;
}

// ============================================================================
// DATA VALIDATION AND ERROR HANDLING
// ============================================================================

/**
 * Detailed validation error information
 */
interface ValidationError {
  /** The path in the object where validation failed */
  path: string;
  /** The validation error message */
  message: string;
  /** The Zod error code */
  code: string;
  /** The expected type or value */
  expected?: string;
  /** The received value */
  received?: unknown;
}

/**
 * Result of validating a single configuration
 */
interface ValidationResult {
  /** Whether validation was successful */
  success: boolean;
  /** The store ID being validated */
  storeId: string;
  /** The original Redis key */
  redisKey: string;
  /** The validated configuration (if successful) */
  validatedConfig?: StoreConfig;
  /** Validation errors (if failed) */
  errors?: ValidationError[];
  /** Raw input data (for debugging failed validations) */
  rawInput?: unknown;
}

/**
 * Aggregated validation results for all configurations
 */
interface ValidationReport {
  /** Total configurations validated */
  total: number;
  /** Successfully validated configurations */
  successful: ValidationResult[];
  /** Failed validations */
  failed: ValidationResult[];
  /** Summary of validation */
  summary: {
    successCount: number;
    failureCount: number;
    successRate: number;
  };
}

/**
 * Validates a single store configuration using Zod schema
 * 
 * This function provides comprehensive validation with detailed error reporting.
 * It transforms Zod errors into a more readable format for debugging.
 * 
 * @param rawConfig - Raw configuration data from extraction phase
 * @returns Validation result with detailed error information
 * 
 * @example
 * ```typescript
 * const result = validateStoreConfiguration(rawConfig);
 * if (result.success) {
 *   console.log('Valid config:', result.validatedConfig);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
function validateStoreConfiguration(
  rawConfig: RawStoreConfigData
): ValidationResult {
  const { storeId, rawData, redisKey } = rawConfig;

  // Step 1: Validate storeId consistency
  if (!validateStoreIdConsistency(storeId, rawData)) {
    return {
      success: false,
      storeId,
      redisKey,
      errors: [{
        path: 'storeId',
        message: 'storeId in data does not match the storeId extracted from Redis key',
        code: 'STOREID_MISMATCH',
        expected: storeId,
        received: typeof rawData === 'object' && rawData !== null 
          ? (rawData as Record<string, unknown>)['storeId'] 
          : undefined,
      }],
      rawInput: rawData,
    };
  }

  // Step 2: Ensure storeId is present in data
  const dataWithStoreId = {
    ...(typeof rawData === 'object' && rawData !== null ? rawData : {}),
    storeId,
  };

  // Step 3: Validate against StoreConfigSchema using safeParse
  const zodResult = StoreConfigSchema.safeParse(dataWithStoreId);

  // Step 4: Handle validation result
  if (zodResult.success) {
    // Validation successful - return validated, fully-typed configuration
    return {
      success: true,
      storeId,
      redisKey,
      validatedConfig: zodResult.data,
    };
  }

  // Step 5: Transform Zod errors into detailed, readable format
  const validationErrors: ValidationError[] = zodResult.error.issues.map((issue) => {
    const error: ValidationError = {
      path: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    };

    // Add expected/received information based on error type
    if (issue.code === 'invalid_type') {
      error.expected = (issue as any).expected;
      error.received = (issue as any).received;
    } else if (issue.code === 'invalid_string' || issue.code === 'invalid_enum_value') {
      error.received = (issue as any).received;
    } else if (issue.code === 'too_small' || issue.code === 'too_big') {
      error.expected = `${(issue as any).type} ${issue.code === 'too_small' ? '>=' : '<='} ${(issue as any).minimum || (issue as any).maximum}`;
      error.received = (issue as any).received;
    }

    return error;
  });

  return {
    success: false,
    storeId,
    redisKey,
    errors: validationErrors,
    rawInput: dataWithStoreId,
  };
}

/**
 * Validates multiple store configurations and generates a comprehensive report
 * 
 * This function implements the validation loop from Prompt 3, processing
 * all extracted configurations and collecting detailed results.
 * 
 * @param extractedConfigs - Array of raw configurations from extraction phase
 * @returns Comprehensive validation report
 * 
 * @example
 * ```typescript
 * const report = validateAllConfigurations(extractedConfigs);
 * console.log(`Success rate: ${report.summary.successRate}%`);
 * ```
 */
function validateAllConfigurations(
  extractedConfigs: RawStoreConfigData[]
): ValidationReport {
  console.log('🔍 Step 3: Validating configurations against StoreConfigSchema...\n');

  const report: ValidationReport = {
    total: extractedConfigs.length,
    successful: [],
    failed: [],
    summary: {
      successCount: 0,
      failureCount: 0,
      successRate: 0,
    },
  };

  // Guard clause: Handle empty input
  if (extractedConfigs.length === 0) {
    console.log('   ⚠️  No configurations to validate\n');
    return report;
  }

  // Validate each configuration
  for (const rawConfig of extractedConfigs) {
    const { storeId } = rawConfig;
    
    try {
      console.log(`   Validating: ${storeId}`);
      
      // Perform validation
      const validationResult = validateStoreConfiguration(rawConfig);

      if (validationResult.success) {
        // Success: Add to successful results
        report.successful.push(validationResult);
        console.log(`   ✅ Valid: Configuration conforms to schema`);
      } else {
        // Failure: Add to failed results and log detailed errors
        report.failed.push(validationResult);
        console.log(`   ❌ Invalid: Schema validation failed`);
        
        // Log each validation error in detail
        validationResult.errors?.forEach((error, index) => {
          console.log(`      Error ${index + 1}:`);
          console.log(`        Path: ${error.path}`);
          console.log(`        Message: ${error.message}`);
          console.log(`        Code: ${error.code}`);
          
          if (error.expected) {
            console.log(`        Expected: ${error.expected}`);
          }
          if (error.received !== undefined) {
            console.log(`        Received: ${JSON.stringify(error.received)}`);
          }
        });
      }
    } catch (error) {
      // Handle unexpected errors during validation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Error: Unexpected validation error - ${errorMessage}`);
      
      report.failed.push({
        success: false,
        storeId,
        redisKey: rawConfig.redisKey,
        errors: [{
          path: 'validation',
          message: `Unexpected error during validation: ${errorMessage}`,
          code: 'VALIDATION_ERROR',
        }],
        rawInput: rawConfig.rawData,
      });
    }
  }

  // Calculate summary statistics
  report.summary.successCount = report.successful.length;
  report.summary.failureCount = report.failed.length;
  report.summary.successRate = report.total > 0
    ? Math.round((report.summary.successCount / report.total) * 100)
    : 0;

  // Display validation summary
  console.log('\n' + '-'.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('-'.repeat(60));
  console.log(`Total Configurations:      ${report.total}`);
  console.log(`✅ Valid Configurations:   ${report.summary.successCount}`);
  console.log(`❌ Invalid Configurations: ${report.summary.failureCount}`);
  console.log(`Success Rate:              ${report.summary.successRate}%`);
  console.log('-'.repeat(60) + '\n');

  return report;
}

/**
 * Logs detailed validation failure information
 * Used for comprehensive error reporting and debugging
 * 
 * @param failedValidation - A failed validation result
 */
function logValidationFailure(failedValidation: ValidationResult): void {
  console.log('\n' + '─'.repeat(60));
  console.log(`❌ VALIDATION FAILURE DETAILS`);
  console.log('─'.repeat(60));
  console.log(`Store ID:    ${failedValidation.storeId}`);
  console.log(`Redis Key:   ${failedValidation.redisKey}`);
  console.log(`Error Count: ${failedValidation.errors?.length || 0}`);
  console.log('─'.repeat(60));
  
  if (failedValidation.errors && failedValidation.errors.length > 0) {
    console.log('\nValidation Errors:');
    failedValidation.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.path}`);
      console.log(`   Message:  ${error.message}`);
      console.log(`   Code:     ${error.code}`);
      
      if (error.expected) {
        console.log(`   Expected: ${error.expected}`);
      }
      if (error.received !== undefined) {
        const receivedStr = typeof error.received === 'object'
          ? JSON.stringify(error.received, null, 2)
          : String(error.received);
        console.log(`   Received: ${receivedStr}`);
      }
    });
  }
  
  if (failedValidation.rawInput) {
    console.log('\nRaw Input (for debugging):');
    console.log(JSON.stringify(failedValidation.rawInput, null, 2));
  }
  
  console.log('─'.repeat(60) + '\n');
}

// ============================================================================
// MIGRATION EXECUTION LOGIC
// ============================================================================

/**
 * Main migration orchestration function
 * Coordinates the migration process with proper error handling and rollback
 * 
 * @param options - Migration execution options
 */
async function executeMigration(options: {
  dryRun: boolean;
  redisClient: Redis;
  migrationService: MigrationService;
}) {
  const { dryRun, redisClient, migrationService } = options;
  const stats = createMigrationStats();

  console.log('\n' + '='.repeat(60));
  console.log('🚀 STARTING REDIS → DATABASE MIGRATION');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '✍️  LIVE MIGRATION'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Phase B: Step 1 - Extract and Map configurations from Redis
    const extractionResult = await extractAndMapStoreConfigs(redisClient);
    
    // Update statistics with extraction results
    stats.total = extractionResult.totalScanned;
    stats.skipped = extractionResult.failedKeys.length;

    // Guard clause: Early return if no configurations found
    if (extractionResult.configurations.length === 0) {
      console.log('ℹ️  No valid configurations to migrate.\n');
      
      // Record extraction failures as skipped
      extractionResult.failedKeys.forEach(({ key, error }) => {
        stats.errors.push({
          storeId: 'unknown',
          error: `Extraction failed: ${error}`,
          data: { key },
        });
      });
      
      return stats;
    }

    // Phase B: Step 3 - Validate configurations using Zod schema
    const validationReport = validateAllConfigurations(extractionResult.configurations);

    // Guard clause: Early return if no valid configurations
    if (validationReport.successful.length === 0) {
      console.log('ℹ️  No valid configurations to migrate.\n');
      
      // Record validation failures
      validationReport.failed.forEach((failed) => {
        stats.failed++;
        stats.errors.push({
          storeId: failed.storeId,
          error: 'Schema validation failed',
          data: {
            redisKey: failed.redisKey,
            errors: failed.errors,
            rawInput: failed.rawInput,
          },
        });
      });
      
      return stats;
    }

    // Phase C: Step 2 (Prompt 5) - Execute Transactional Ingestion
    console.log('💾 Step 4: Ingesting validated configurations to Supabase...\n');
    
    // Progress tracking variables
    const totalToIngest = validationReport.successful.length;
    let ingestedCount = 0;
    let ingestionErrorCount = 0;
    const startTime = Date.now();
    
    console.log(`   Configurations to ingest: ${totalToIngest}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no database writes)' : 'LIVE INGESTION'}`);
    console.log('   ' + '-'.repeat(58) + '\n');
    
    // Ingestion loop - iterate over successfully validated configurations
    for (let index = 0; index < validationReport.successful.length; index++) {
      const validatedResult = validationReport.successful[index];
      
      // Guard: Ensure validatedResult exists
      if (!validatedResult) {
        continue;
      }
      
      const { storeId, redisKey } = validatedResult;
      const validatedConfig = validatedResult.validatedConfig;
      
      // Calculate progress
      const progress = Math.round(((index + 1) / totalToIngest) * 100);
      const elapsed = Date.now() - startTime;
      const rate = (index + 1) / (elapsed / 1000); // configs per second
      
      // Guard: Ensure we have a validated config
      if (!validatedConfig) {
        console.log(`   [${index + 1}/${totalToIngest}] ⚠️  Skipping ${storeId}: No validated configuration`);
        stats.skipped++;
        continue;
      }
      
      try {
        // Display progress
        console.log(`   [${index + 1}/${totalToIngest}] (${progress}%) Ingesting: ${storeId}`);

        // Execute migration if not in dry-run mode
        if (!dryRun) {
          // Call upsertStoreConfig with storeId and validated config
          const upsertResult = await migrationService.upsertStoreConfig(
            validatedConfig.storeId,  // Use storeId from config
            validatedConfig            // Validated StoreConfig from Zod
          );
          
          if (upsertResult.success) {
            ingestedCount++;
            console.log(`   ✅ Success: Ingested to database (${rate.toFixed(2)}/s)`);
            stats.successful++;
          } else {
            ingestionErrorCount++;
            console.log(`   ❌ Failed: ${upsertResult.error}`);
            stats.failed++;
            stats.errors.push({
              storeId,
              error: `Ingestion failed: ${upsertResult.error || 'Unknown error'}`,
              data: { redisKey, phase: 'ingestion' },
            });
          }
        } else {
          // Dry run - just count as successful
          ingestedCount++;
          console.log(`   ✅ Valid: Would be ingested to database`);
          stats.successful++;
        }
      } catch (error) {
        ingestionErrorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`   ❌ Failed: Unexpected ingestion error - ${errorMessage}`);
        stats.failed++;
        stats.errors.push({
          storeId,
          error: `Unexpected ingestion error: ${errorMessage}`,
          data: { redisKey, phase: 'ingestion' },
        });
      }
      
      // Display periodic progress summary
      if ((index + 1) % 10 === 0 || (index + 1) === totalToIngest) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        console.log(`   📊 Progress: ${index + 1}/${totalToIngest} | Success: ${ingestedCount} | Errors: ${ingestionErrorCount} | Time: ${elapsedSeconds.toFixed(1)}s\n`);
      }
    }
    
    // Calculate final ingestion metrics
    const totalIngestionTime = (Date.now() - startTime) / 1000;
    const avgRate = ingestedCount / totalIngestionTime;

    // Record validation failures in stats
    validationReport.failed.forEach((failed) => {
      stats.failed++;
      stats.errors.push({
        storeId: failed.storeId,
        error: 'Schema validation failed',
        data: {
          redisKey: failed.redisKey,
          errors: failed.errors,
          rawInput: failed.rawInput,
        },
      });
    });

    // Display comprehensive migration summary (Prompt 5 requirement)
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY - COMPLETE REPORT');
    console.log('='.repeat(60));
    console.log('');
    
    // Extraction Phase
    console.log('📋 EXTRACTION PHASE:');
    console.log(`   Total Keys Scanned:        ${extractionResult.totalScanned}`);
    console.log(`   Successfully Extracted:    ${extractionResult.configurations.length}`);
    console.log(`   Failed Extraction:         ${extractionResult.failedKeys.length}`);
    console.log('');
    
    // Validation Phase
    console.log('🔍 VALIDATION PHASE:');
    console.log(`   Configurations Validated:  ${validationReport.total}`);
    console.log(`   Passed Validation:         ${validationReport.summary.successCount}`);
    console.log(`   Failed Validation:         ${validationReport.summary.failureCount}`);
    console.log(`   Validation Success Rate:   ${validationReport.summary.successRate}%`);
    console.log('');
    
    // Ingestion Phase
    console.log('💾 INGESTION PHASE:');
    console.log(`   Configurations to Ingest:  ${totalToIngest}`);
    console.log(`   Successfully Ingested:     ${ingestedCount}`);
    console.log(`   Failed Ingestion:          ${ingestionErrorCount}`);
    console.log(`   Ingestion Success Rate:    ${totalToIngest > 0 ? Math.round((ingestedCount / totalToIngest) * 100) : 0}%`);
    console.log(`   Average Ingestion Rate:    ${avgRate.toFixed(2)} configs/second`);
    console.log(`   Total Ingestion Time:      ${totalIngestionTime.toFixed(2)} seconds`);
    console.log('');
    
    // Overall Statistics
    console.log('📈 OVERALL STATISTICS:');
    console.log(`   Total Processed:           ${stats.total}`);
    console.log(`   ✅ Total Successful:       ${stats.successful}`);
    console.log(`   ❌ Total Failed:           ${stats.failed}`);
    console.log(`   ⏭️  Total Skipped:          ${stats.skipped}`);
    console.log(`   Overall Success Rate:      ${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%`);
    console.log('');
    
    // Mode indicator
    if (dryRun) {
      console.log('ℹ️  MODE: DRY RUN - No data was written to the database');
    } else {
      console.log('✅ MODE: LIVE MIGRATION - Data has been written to Supabase');
    }
    
    console.log('='.repeat(60));
    console.log('');
    
    // Error details if any
    if (stats.errors.length > 0) {
      console.log('⚠️  ERRORS ENCOUNTERED: ' + stats.errors.length);
      console.log('');
      console.log('Run with detailed logging to see full error information.');
      console.log('First 5 errors:');
      stats.errors.slice(0, 5).forEach((error, index) => {
        console.log(`\n${index + 1}. Store ID: ${error.storeId}`);
        console.log(`   Error: ${error.error}`);
        if (error.data && typeof error.data === 'object' && 'phase' in error.data) {
          console.log(`   Phase: ${(error.data as { phase: string }).phase}`);
        }
      });
      console.log('');
    }

    console.log('✅ Migration process completed\n');
    return stats;
  } catch (error) {
    console.error('\n❌ Fatal error during migration:');
    console.error(error);
    throw error;
  }
}

/**
 * Extracts store ID from Redis key
 * Example: "store:123e4567-e89b-12d3-a456-426614174000:config" → "123e4567-e89b-12d3-a456-426614174000"
 */
function extractStoreIdFromKey(key: string): string {
  const parts = key.split(':');
  // Guard clause: Ensure key has expected format
  if (parts.length < 3 || parts[0] !== 'store' || !parts[1]) {
    throw new Error(`Invalid key format: ${key}`);
  }
  return parts[1];
}

// ============================================================================
// SCRIPT ENTRY POINT
// ============================================================================

/**
 * Main entry point for migration script
 * Handles CLI arguments, initialization, and cleanup
 */
async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Validate environment
  console.log('🔍 Validating environment...');
  const env = validateEnvironment();
  console.log('✅ Environment validated\n');

  // Initialize Redis client
  console.log('🔌 Connecting to Redis...');
  const redisClient = new Redis({
    url: env['KV_REST_API_URL'],
    token: env['KV_REST_API_TOKEN'],
  });
  console.log('✅ Redis connection established\n');

  // Initialize migration service (database connection)
  console.log('🔌 Initializing migration service...');
  const migrationService = new MigrationService();
  await migrationService.initialize();
  console.log('✅ Migration service ready\n');

  try {
    // Execute migration
    const stats = await executeMigration({
      dryRun,
      redisClient,
      migrationService,
    });

    // Display results
    displayStats(stats);

    // Exit with appropriate code
    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up connections...');
    await migrationService.close();
    console.log('✅ Cleanup complete\n');
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { 
  executeMigration, 
  extractStoreIdFromKey, 
  createMigrationStats,
  extractAndMapStoreConfigs,
  validateStoreIdConsistency,
  validateStoreConfiguration,
  validateAllConfigurations,
  logValidationFailure,
  type RawStoreConfigData,
  type ExtractionResult,
  type ValidationError,
  type ValidationResult,
  type ValidationReport,
};

