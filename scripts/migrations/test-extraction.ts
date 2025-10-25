/**
 * Test/Demo Script for Data Extraction and Transformation
 * 
 * This script demonstrates the extraction and mapping functionality
 * using mock Redis data. It can be used for testing and validation
 * before running the actual migration.
 * 
 * @fileoverview Test harness for Phase B Step 1 implementation
 * @author Reech Development Team
 * @version 1.0.0
 * 
 * Usage:
 *   pnpm tsx scripts/migrations/test-extraction.ts
 */

import { 
  extractAndMapStoreConfigs,
  validateStoreIdConsistency,
  validateStoreConfiguration,
  validateAllConfigurations,
  logValidationFailure,
  type RawStoreConfigData,
} from './migrate-redis-configs';

// ============================================================================
// MOCK REDIS CLIENT FOR TESTING
// ============================================================================

/**
 * Mock Redis client that simulates Redis operations
 * This allows testing without a real Redis connection
 */
class MockRedisClient {
  private data: Map<string, unknown>;

  constructor() {
    this.data = new Map();
    this.seedTestData();
  }

  /**
   * Seed the mock Redis with test data
   */
  private seedTestData(): void {
    // Valid configuration 1
    this.data.set('store:123e4567-e89b-12d3-a456-426614174000:config', {
      storeId: '123e4567-e89b-12d3-a456-426614174000',
      version: '1.0.0',
      metadata: {
        name: 'Test Store 1',
        description: 'A test store configuration',
        locale: 'en-US',
        currency: 'USD',
        timezone: 'UTC',
      },
      theme: {
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          accent: '#10B981',
          background: '#FFFFFF',
          surface: '#F3F4F6',
          text: '#1F2937',
          textSecondary: '#6B7280',
          border: '#D1D5DB',
          error: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
          info: '#3B82F6',
        },
        typography: {
          fontFamily: {
            heading: 'Inter, sans-serif',
            body: 'Inter, sans-serif',
            mono: 'Fira Code, monospace',
          },
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            '5xl': '3rem',
            '6xl': '3.75rem',
          },
          fontWeight: {
            light: '300',
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
            extrabold: '800',
          },
          lineHeight: {
            tight: '1.25',
            snug: '1.375',
            normal: '1.5',
            relaxed: '1.625',
            loose: '2',
          },
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem',
          '3xl': '4rem',
          '4xl': '6rem',
        },
        borderRadius: {
          none: '0',
          sm: '0.125rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          '2xl': '1rem',
          '3xl': '1.5rem',
          full: '9999px',
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        },
      },
      layout: {
        content: {
          components: [],
          maxWidth: '7xl',
          padding: '1rem',
        },
        grid: {
          columns: 12,
          gap: '1rem',
          breakpoints: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
          },
        },
      },
      features: {
        checkout: true,
        inventory: true,
        analytics: false,
        multiLanguage: false,
        darkMode: false,
        socialLogin: false,
        wishlist: true,
        reviews: true,
        recommendations: false,
        liveChat: false,
      },
      integrations: {
        payment: {
          stripe: false,
          paypal: false,
          applePay: false,
          googlePay: false,
        },
        analytics: {
          googleAnalytics: false,
          facebookPixel: false,
          hotjar: false,
        },
        marketing: {
          mailchimp: false,
          klaviyo: false,
          sendgrid: false,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Valid configuration 2 (missing storeId - will be added during extraction)
    this.data.set('store:234e5678-e89b-12d3-a456-426614174001:config', {
      version: '1.0.0',
      metadata: {
        name: 'Test Store 2',
        locale: 'en-US',
        currency: 'USD',
        timezone: 'UTC',
      },
      theme: {
        colors: {
          primary: '#EF4444',
          secondary: '#F59E0B',
          accent: '#10B981',
          background: '#FFFFFF',
          surface: '#F3F4F6',
          text: '#1F2937',
          textSecondary: '#6B7280',
          border: '#D1D5DB',
          error: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
          info: '#3B82F6',
        },
        typography: {
          fontFamily: {
            heading: 'Roboto, sans-serif',
            body: 'Roboto, sans-serif',
            mono: 'Courier New, monospace',
          },
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            '5xl': '3rem',
            '6xl': '3.75rem',
          },
          fontWeight: {
            light: '300',
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
            extrabold: '800',
          },
          lineHeight: {
            tight: '1.25',
            snug: '1.375',
            normal: '1.5',
            relaxed: '1.625',
            loose: '2',
          },
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem',
          '3xl': '4rem',
          '4xl': '6rem',
        },
        borderRadius: {
          none: '0',
          sm: '0.125rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          '2xl': '1rem',
          '3xl': '1.5rem',
          full: '9999px',
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        },
      },
      layout: {
        content: {
          components: [],
          maxWidth: '7xl',
          padding: '1rem',
        },
        grid: {
          columns: 12,
          gap: '1rem',
          breakpoints: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
          },
        },
      },
      features: {
        checkout: true,
        inventory: true,
        analytics: false,
        multiLanguage: false,
        darkMode: true,
        socialLogin: true,
        wishlist: true,
        reviews: true,
        recommendations: true,
        liveChat: true,
      },
      integrations: {
        payment: {
          stripe: true,
          paypal: true,
          applePay: false,
          googlePay: false,
        },
        analytics: {
          googleAnalytics: true,
          facebookPixel: false,
          hotjar: false,
        },
        marketing: {
          mailchimp: true,
          klaviyo: false,
          sendgrid: false,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Invalid configuration (mismatched storeId)
    this.data.set('store:345e6789-e89b-12d3-a456-426614174002:config', {
      storeId: 'wrong-store-id',
      version: '1.0.0',
      metadata: {
        name: 'Invalid Store',
        locale: 'en-US',
        currency: 'USD',
        timezone: 'UTC',
      },
    });

    // Empty data case
    this.data.set('store:456e7890-e89b-12d3-a456-426614174003:config', null);

    // Invalid data type (primitive instead of object)
    this.data.set('store:567e8901-e89b-12d3-a456-426614174004:config', 'invalid-string-data');
  }

  /**
   * Mock keys() method - returns all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  /**
   * Mock get() method - returns value for a key
   */
  async get(key: string): Promise<unknown> {
    return this.data.get(key);
  }
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

/**
 * Main test function
 */
async function runExtractionTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 DATA EXTRACTION TEST');
  console.log('='.repeat(60));
  console.log('Testing Phase B: Step 1 - Data Extraction and Transformation');
  console.log('='.repeat(60) + '\n');

  try {
    // Create mock Redis client
    const mockRedis = new MockRedisClient();

    // Test extraction
    console.log('🔍 Testing extractAndMapStoreConfigs...\n');
    const result = await extractAndMapStoreConfigs(mockRedis as any);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Keys Scanned:        ${result.totalScanned}`);
    console.log(`Successful Extractions:    ${result.configurations.length}`);
    console.log(`Failed Extractions:        ${result.failedKeys.length}`);
    console.log('='.repeat(60) + '\n');

    // Test validateStoreIdConsistency
    console.log('🔍 Testing validateStoreIdConsistency...\n');
    
    const testCases = [
      {
        name: 'Matching storeId',
        storeId: 'test-id',
        data: { storeId: 'test-id', name: 'Test' },
        expected: true,
      },
      {
        name: 'Mismatched storeId',
        storeId: 'test-id',
        data: { storeId: 'wrong-id', name: 'Test' },
        expected: false,
      },
      {
        name: 'Missing storeId (will be added)',
        storeId: 'test-id',
        data: { name: 'Test' },
        expected: true,
      },
      {
        name: 'Null data',
        storeId: 'test-id',
        data: null,
        expected: false,
      },
      {
        name: 'Primitive data',
        storeId: 'test-id',
        data: 'string',
        expected: false,
      },
    ];

    testCases.forEach(({ name, storeId, data, expected }) => {
      const result = validateStoreIdConsistency(storeId, data);
      const status = result === expected ? '✅' : '❌';
      console.log(`   ${status} ${name}: ${result === expected ? 'PASS' : 'FAIL'}`);
    });

    // Test validateStoreConfiguration
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Testing validateStoreConfiguration (Prompt 3)...\n');
    
    // Create test configurations
    const testConfigs: RawStoreConfigData[] = result.configurations;
    
    if (testConfigs.length > 0) {
      console.log(`   Testing individual validation on ${testConfigs.length} configurations:\n`);
      
      testConfigs.forEach((config, index) => {
        const validationResult = validateStoreConfiguration(config);
        const status = validationResult.success ? '✅' : '❌';
        console.log(`   ${status} Config ${index + 1} (${config.storeId}): ${validationResult.success ? 'VALID' : 'INVALID'}`);
        
        if (!validationResult.success && validationResult.errors) {
          console.log(`      Errors: ${validationResult.errors.length}`);
          validationResult.errors.slice(0, 2).forEach(err => {
            console.log(`        - ${err.path}: ${err.message}`);
          });
        }
      });
    }

    // Test validateAllConfigurations
    console.log('\n' + '-'.repeat(60));
    console.log('🔍 Testing validateAllConfigurations (Batch Validation)...\n');
    
    if (testConfigs.length > 0) {
      const validationReport = validateAllConfigurations(testConfigs);
      
      console.log('\n   Validation Report Summary:');
      console.log(`   - Total:          ${validationReport.total}`);
      console.log(`   - Successful:     ${validationReport.summary.successCount}`);
      console.log(`   - Failed:         ${validationReport.summary.failureCount}`);
      console.log(`   - Success Rate:   ${validationReport.summary.successRate}%`);
      
      // Test logValidationFailure with first failed validation
      if (validationReport.failed.length > 0) {
        console.log('\n' + '-'.repeat(60));
        console.log('🔍 Testing logValidationFailure (Error Reporting)...\n');
        console.log('   Displaying first validation failure in detail:');
        const firstFailure = validationReport.failed[0];
        if (firstFailure) {
          logValidationFailure(firstFailure);
        }
      }
    } else {
      console.log('   ⚠️  No configurations available for validation testing');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runExtractionTest().catch((error) => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

export { MockRedisClient, runExtractionTest };

