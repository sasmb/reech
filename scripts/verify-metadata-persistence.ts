/**
 * Metadata Persistence Verification Script
 * Phase 3: Prompt 3.1
 * 
 * This script provides a simple way to verify that metadata (including external identifiers)
 * is correctly persisted when creating Medusa stores.
 * 
 * Usage:
 * ```bash
 * # With actual Medusa backend
 * pnpm tsx scripts/verify-metadata-persistence.ts
 * 
 * # With mock container (for testing)
 * pnpm tsx scripts/verify-metadata-persistence.ts --mock
 * ```
 */

import { createStoreWorkflowRunner, type MedusaStore } from '../packages/services/medusa-store.service';
import type { MedusaStoreCreateInputInferred } from '../packages/shared/schemas/medusa-store.interface';

// ============================================================================
// MOCK CONTAINER (for testing without Medusa backend)
// ============================================================================

function createMockContainer() {
  const stores = new Map<string, MedusaStore>();

  return {
    resolve: (moduleName: string) => {
      if (moduleName === 'STORE') {
        return {
          createStores: async (input: any): Promise<MedusaStore> => {
            const store: MedusaStore = {
              id: `store_${Math.random().toString(36).substring(2, 15)}`,
              name: input.name,
              supported_currencies: input.supported_currencies || [],
              metadata: input.metadata || null, // ← Persist metadata
              default_sales_channel_id: input.default_sales_channel_id || null,
              default_region_id: input.default_region_id || null,
              default_location_id: input.default_location_id || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            stores.set(store.id, store);
            return store;
          },
          retrieveStore: async (storeId: string) => {
            const store = stores.get(storeId);
            if (!store) throw new Error(`Store ${storeId} not found`);
            return store;
          },
          deleteStores: async (ids: string[]) => {
            ids.forEach(id => stores.delete(id));
          },
        };
      }
      throw new Error(`Unknown module: ${moduleName}`);
    },
  };
}

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

interface VerificationResult {
  testName: string;
  passed: boolean;
  details: string;
  storeId?: string;
}

/**
 * Test 1: Verify External Identifier Persistence
 */
async function testExternalIdPersistence(container: any): Promise<VerificationResult> {
  try {
    const externalId = `shopify_${Date.now()}`;
    
    const input: MedusaStoreCreateInputInferred = {
      name: 'Test Store - External ID',
      currencies: ['USD'],
      metadata: {
        external_id: externalId,
      },
    };

    const store = await createStoreWorkflowRunner(input, container);

    const passed = store.metadata?.['external_id'] === externalId;

    return {
      testName: 'External Identifier Persistence',
      passed,
      details: passed
        ? `✅ External ID correctly persisted: ${externalId}`
        : `❌ External ID not persisted. Expected: ${externalId}, Got: ${store.metadata?.['external_id']}`,
      storeId: store.id,
    };
  } catch (error) {
    return {
      testName: 'External Identifier Persistence',
      passed: false,
      details: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Test 2: Verify Complex Metadata Structure
 */
async function testComplexMetadata(container: any): Promise<VerificationResult> {
  try {
    const metadata = {
      external_id: 'woocommerce_123',
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      external_system: {
        name: 'WooCommerce',
        version: '6.0',
      },
      features: ['multi-currency', 'inventory'],
    };

    const input: MedusaStoreCreateInputInferred = {
      name: 'Test Store - Complex Metadata',
      currencies: ['USD', 'EUR'],
      metadata,
    };

    const store = await createStoreWorkflowRunner(input, container);

    const externalSystem = store.metadata?.['external_system'] as Record<string, unknown> | undefined;
    const checks = [
      store.metadata?.['external_id'] === 'woocommerce_123',
      store.metadata?.['tenant_id'] === '123e4567-e89b-12d3-a456-426614174000',
      externalSystem?.['name'] === 'WooCommerce',
      Array.isArray(store.metadata?.['features']) && (store.metadata?.['features'] as unknown[]).length === 2,
    ];

    const passed = checks.every(check => check === true);

    return {
      testName: 'Complex Metadata Structure',
      passed,
      details: passed
        ? `✅ All metadata fields persisted correctly`
        : `❌ Some metadata fields not persisted correctly`,
      storeId: store.id,
    };
  } catch (error) {
    return {
      testName: 'Complex Metadata Structure',
      passed: false,
      details: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Test 3: Verify Metadata Retrieval After Creation
 */
async function testMetadataRetrieval(container: any): Promise<VerificationResult> {
  try {
    const externalId = `retrieval_test_${Date.now()}`;
    
    const input: MedusaStoreCreateInputInferred = {
      name: 'Test Store - Retrieval',
      currencies: ['USD'],
      metadata: {
        external_id: externalId,
        test_field: 'test_value',
      },
    };

    // Create store
    const createdStore = await createStoreWorkflowRunner(input, container);

    // Retrieve store
    const storeService = container.resolve('STORE');
    const retrievedStore = await storeService.retrieveStore(createdStore.id);

    const passed = 
      retrievedStore.metadata?.external_id === externalId &&
      retrievedStore.metadata?.test_field === 'test_value';

    return {
      testName: 'Metadata Retrieval After Creation',
      passed,
      details: passed
        ? `✅ Metadata correctly persisted and retrieved`
        : `❌ Metadata not correctly persisted after retrieval`,
      storeId: createdStore.id,
    };
  } catch (error) {
    return {
      testName: 'Metadata Retrieval After Creation',
      passed: false,
      details: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Test 4: Verify Multi-Tenancy Mapping
 */
async function testMultiTenancyMapping(container: any): Promise<VerificationResult> {
  try {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    const legacyExternalId = 'shopify_store_12345';

    const input: MedusaStoreCreateInputInferred = {
      name: 'Test Store - Multi-Tenancy',
      currencies: ['USD'],
      metadata: {
        tenantId,
        legacyExternalId,
        externalSystemName: 'Shopify',
      },
    };

    const store = await createStoreWorkflowRunner(input, container);

    const passed = 
      store.metadata?.['tenantId'] === tenantId &&
      store.metadata?.['legacyExternalId'] === legacyExternalId &&
      store.id.startsWith('store_');

    return {
      testName: 'Multi-Tenancy Mapping',
      passed,
      details: passed
        ? `✅ Tenant mapping persisted, Store ID: ${store.id}`
        : `❌ Tenant mapping not persisted correctly`,
      storeId: store.id,
    };
  } catch (error) {
    return {
      testName: 'Multi-Tenancy Mapping',
      passed: false,
      details: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// MAIN VERIFICATION RUNNER
// ============================================================================

async function runVerification() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 MEDUSA STORE METADATA PERSISTENCE VERIFICATION');
  console.log('   Phase 3: Prompt 3.1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if using mock container
  const useMock = process.argv.includes('--mock') || !process.env['MEDUSA_BACKEND_URL'];
  
  if (useMock) {
    console.log('⚠️  Using MOCK container (no actual Medusa backend)');
    console.log('   To test with real Medusa, remove --mock flag and ensure backend is running\n');
  } else {
    console.log('✅ Using REAL Medusa backend');
    console.log(`   Backend URL: ${process.env['MEDUSA_BACKEND_URL'] || 'http://localhost:9000'}\n`);
  }

  // Create container
  const container = useMock 
    ? createMockContainer()
    : null; // TODO: Replace with actual Medusa container

  if (!container) {
    console.error('❌ Error: Medusa container not available');
    console.error('   Run with --mock flag to use mock container\n');
    process.exit(1);
  }

  // Run all tests
  console.log('Running verification tests...\n');

  const tests = [
    testExternalIdPersistence,
    testComplexMetadata,
    testMetadataRetrieval,
    testMultiTenancyMapping,
  ];

  const results: VerificationResult[] = [];
  const createdStoreIds: string[] = [];

  for (const test of tests) {
    const result = await test(container);
    results.push(result);
    if (result.storeId) {
      createdStoreIds.push(result.storeId);
    }

    console.log(`${result.passed ? '✅' : '❌'} ${result.testName}`);
    console.log(`   ${result.details}\n`);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}\n`);

  if (passed === total) {
    console.log('✅ All verification tests passed!');
    console.log('   Metadata persistence is working correctly.\n');
  } else {
    console.log('❌ Some tests failed!');
    console.log('   Please check the details above.\n');
  }

  // Cleanup
  if (createdStoreIds.length > 0) {
    console.log(`🧹 Cleaning up ${createdStoreIds.length} test stores...`);
    try {
      const storeService = container.resolve('STORE');
      await storeService.deleteStores(createdStoreIds);
      console.log('✅ Cleanup complete\n');
    } catch (error) {
      console.warn('⚠️  Cleanup failed (stores may remain in database)\n');
    }
  }

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// ============================================================================
// RUN VERIFICATION
// ============================================================================

if (require.main === module) {
  runVerification().catch(error => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
}

export { runVerification };

