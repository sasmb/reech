/**
 * Cross-Tenant Isolation Integration Tests
 * 
 * Verifies that storeid isolation logic functions correctly across the entire service layer.
 * This is crucial for MVP quality assurance and security compliance.
 * 
 * Test Strategy:
 * 1. Seed test database with Store A and Store B, each with distinct products
 * 2. Verify Store A can only access its own products (Happy Path)
 * 3. Verify missing storeid returns BAD_REQUEST (Unauthorized Access)
 * 4. Verify Store A cannot access Store B's products by direct ID (Direct ID Retrieval)
 * 
 * Prompt 4.1: DoD Verification Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { ProductService } from '../product.service';
import { OrderService } from '../order.service';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  // Test Store IDs
  STORE_A_ID: 'store_test_a123',
  STORE_B_ID: 'store_test_b456',
  
  // Test Product IDs (will be generated during test)
  PRODUCT_A_ID: '',
  PRODUCT_B_ID: '',
  
  // Test Order IDs (will be generated during test)
  ORDER_A_ID: '',
  ORDER_B_ID: '',
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Initialize Supabase client for testing
 */
function getTestSupabaseClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for testing');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Seed test database with Store A and Store B products
 */
async function seedTestData() {
  const supabase = getTestSupabaseClient();

  // Clean up any existing test data first
  await cleanupTestData();

  // Create Product A for Store A
  const { data: productA, error: errorA } = await supabase
    .from('products')
    .insert({
      store_id: TEST_CONFIG.STORE_A_ID,
      title: 'Product A - Store A',
      slug: 'product-a-store-a',
      status: 'active',
      is_published: true,
      price_amount: 10000,
      price_currency: 'USD',
      quantity_available: 100,
    })
    .select()
    .single();

  if (errorA || !productA) {
    throw new Error(`Failed to seed Product A: ${errorA?.message}`);
  }
  TEST_CONFIG.PRODUCT_A_ID = productA.id;

  // Create Product B for Store B
  const { data: productB, error: errorB } = await supabase
    .from('products')
    .insert({
      store_id: TEST_CONFIG.STORE_B_ID,
      title: 'Product B - Store B',
      slug: 'product-b-store-b',
      status: 'active',
      is_published: true,
      price_amount: 20000,
      price_currency: 'USD',
      quantity_available: 200,
    })
    .select()
    .single();

  if (errorB || !productB) {
    throw new Error(`Failed to seed Product B: ${errorB?.message}`);
  }
  TEST_CONFIG.PRODUCT_B_ID = productB.id;

  // Create Order A for Store A
  const { data: orderA, error: errorOrderA } = await supabase
    .from('orders')
    .insert({
      store_id: TEST_CONFIG.STORE_A_ID,
      order_number: 'ORD-A-001',
      display_id: '#A001',
      customer_email: 'customer-a@test.com',
      status: 'pending',
      financial_status: 'pending',
      fulfillment_status: 'unfulfilled',
      total_amount: 10000,
      subtotal_amount: 10000,
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      currency_code: 'USD',
    })
    .select()
    .single();

  if (errorOrderA || !orderA) {
    throw new Error(`Failed to seed Order A: ${errorOrderA?.message}`);
  }
  TEST_CONFIG.ORDER_A_ID = orderA.id;

  // Create Order B for Store B
  const { data: orderB, error: errorOrderB } = await supabase
    .from('orders')
    .insert({
      store_id: TEST_CONFIG.STORE_B_ID,
      order_number: 'ORD-B-001',
      display_id: '#B001',
      customer_email: 'customer-b@test.com',
      status: 'pending',
      financial_status: 'pending',
      fulfillment_status: 'unfulfilled',
      total_amount: 20000,
      subtotal_amount: 20000,
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      currency_code: 'USD',
    })
    .select()
    .single();

  if (errorOrderB || !orderB) {
    throw new Error(`Failed to seed Order B: ${errorOrderB?.message}`);
  }
  TEST_CONFIG.ORDER_B_ID = orderB.id;

  console.log('✅ Test data seeded successfully');
  console.log('  - Product A:', TEST_CONFIG.PRODUCT_A_ID, '(Store A)');
  console.log('  - Product B:', TEST_CONFIG.PRODUCT_B_ID, '(Store B)');
  console.log('  - Order A:', TEST_CONFIG.ORDER_A_ID, '(Store A)');
  console.log('  - Order B:', TEST_CONFIG.ORDER_B_ID, '(Store B)');
}

/**
 * Clean up test data from database
 */
async function cleanupTestData() {
  const supabase = getTestSupabaseClient();

  // Delete test products
  await supabase
    .from('products')
    .delete()
    .in('store_id', [TEST_CONFIG.STORE_A_ID, TEST_CONFIG.STORE_B_ID]);

  // Delete test orders
  await supabase
    .from('orders')
    .delete()
    .in('store_id', [TEST_CONFIG.STORE_A_ID, TEST_CONFIG.STORE_B_ID]);

  console.log('✅ Test data cleaned up');
}

// ============================================================================
// TEST SUITE: CROSS-TENANT ISOLATION
// ============================================================================

describe('Cross-Tenant Isolation Integration Tests (Prompt 4.1)', () => {
  let productService: ProductService;
  let orderService: OrderService;

  // Setup: Initialize services and seed test data
  beforeAll(async () => {
    console.log('\n🚀 Setting up cross-tenant isolation tests...\n');
    
    // Initialize services
    productService = new ProductService();
    await productService.initialize();

    orderService = new OrderService();
    await orderService.initialize();

    // Seed test database
    await seedTestData();
  }, 30000); // 30 second timeout for setup

  // Cleanup: Remove test data after all tests
  afterAll(async () => {
    console.log('\n🧹 Cleaning up test data...\n');
    await cleanupTestData();
  }, 30000);

  // ============================================================================
  // TEST CASE 1: HAPPY PATH - Store A retrieves only its products
  // ============================================================================

  describe('Test Case 1: Happy Path - Store Isolation Works Correctly', () => {
    it('should retrieve Product A when querying with Store A context', async () => {
      // Arrange: Query for all products in Store A
      const filters = {
        limit: 100,
        offset: 0,
      };

      // Act: Execute query with Store A context
      const result = await productService.findProductsForStore(
        TEST_CONFIG.STORE_A_ID,
        filters
      );

      // Assert: Should find Product A
      expect(result.products).toBeDefined();
      expect(result.products.length).toBeGreaterThan(0);
      
      const productIds = result.products.map(p => p.id);
      expect(productIds).toContain(TEST_CONFIG.PRODUCT_A_ID);
      
      // Verify all products belong to Store A
      result.products.forEach(product => {
        expect(product.store_id).toBe(TEST_CONFIG.STORE_A_ID);
      });

      console.log(`✅ Store A retrieved ${result.products.length} product(s) correctly`);
    });

    it('should NOT retrieve Product B when querying with Store A context', async () => {
      // Arrange: Query for all products in Store A
      const filters = {
        limit: 100,
        offset: 0,
      };

      // Act: Execute query with Store A context
      const result = await productService.findProductsForStore(
        TEST_CONFIG.STORE_A_ID,
        filters
      );

      // Assert: Should NOT find Product B
      const productIds = result.products.map(p => p.id);
      expect(productIds).not.toContain(TEST_CONFIG.PRODUCT_B_ID);

      console.log('✅ Store A correctly isolated from Product B');
    });

    it('should retrieve Product B when querying with Store B context', async () => {
      // Arrange: Query for all products in Store B
      const filters = {
        limit: 100,
        offset: 0,
      };

      // Act: Execute query with Store B context
      const result = await productService.findProductsForStore(
        TEST_CONFIG.STORE_B_ID,
        filters
      );

      // Assert: Should find Product B
      expect(result.products).toBeDefined();
      expect(result.products.length).toBeGreaterThan(0);
      
      const productIds = result.products.map(p => p.id);
      expect(productIds).toContain(TEST_CONFIG.PRODUCT_B_ID);
      
      // Verify all products belong to Store B
      result.products.forEach(product => {
        expect(product.store_id).toBe(TEST_CONFIG.STORE_B_ID);
      });

      console.log(`✅ Store B retrieved ${result.products.length} product(s) correctly`);
    });

    it('should NOT retrieve Product A when querying with Store B context', async () => {
      // Arrange: Query for all products in Store B
      const filters = {
        limit: 100,
        offset: 0,
      };

      // Act: Execute query with Store B context
      const result = await productService.findProductsForStore(
        TEST_CONFIG.STORE_B_ID,
        filters
      );

      // Assert: Should NOT find Product A
      const productIds = result.products.map(p => p.id);
      expect(productIds).not.toContain(TEST_CONFIG.PRODUCT_A_ID);

      console.log('✅ Store B correctly isolated from Product A');
    });

    it('should isolate orders between Store A and Store B', async () => {
      // Act: Query orders for Store A
      const resultA = await orderService.findOrdersForStore(
        TEST_CONFIG.STORE_A_ID,
        { limit: 100, offset: 0 }
      );

      // Act: Query orders for Store B
      const resultB = await orderService.findOrdersForStore(
        TEST_CONFIG.STORE_B_ID,
        { limit: 100, offset: 0 }
      );

      // Assert: Store A should only see Order A
      const orderIdsA = resultA.orders.map(o => o.id);
      expect(orderIdsA).toContain(TEST_CONFIG.ORDER_A_ID);
      expect(orderIdsA).not.toContain(TEST_CONFIG.ORDER_B_ID);

      // Assert: Store B should only see Order B
      const orderIdsB = resultB.orders.map(o => o.id);
      expect(orderIdsB).toContain(TEST_CONFIG.ORDER_B_ID);
      expect(orderIdsB).not.toContain(TEST_CONFIG.ORDER_A_ID);

      console.log('✅ Orders correctly isolated between Store A and Store B');
    });
  });

  // ============================================================================
  // TEST CASE 2: UNAUTHORIZED ACCESS - Missing storeid returns BAD_REQUEST
  // ============================================================================

  describe('Test Case 2: Unauthorized Access - Missing or Invalid Store ID', () => {
    it('should throw BAD_REQUEST when storeid is empty string', async () => {
      // Arrange: Empty store ID
      const emptyStoreId = '';
      const filters = { limit: 10, offset: 0 };

      // Act & Assert: Should throw BAD_REQUEST
      await expect(
        productService.findProductsForStore(emptyStoreId, filters)
      ).rejects.toThrow(TRPCError);

      await expect(
        productService.findProductsForStore(emptyStoreId, filters)
      ).rejects.toThrow(/Store ID is required/i);

      console.log('✅ Empty store ID correctly rejected');
    });

    it('should throw BAD_REQUEST when storeid is null', async () => {
      // Arrange: Null store ID
      const nullStoreId = null as any;
      const filters = { limit: 10, offset: 0 };

      // Act & Assert: Should throw BAD_REQUEST
      await expect(
        productService.findProductsForStore(nullStoreId, filters)
      ).rejects.toThrow(TRPCError);

      await expect(
        productService.findProductsForStore(nullStoreId, filters)
      ).rejects.toThrow(/Store ID is required/i);

      console.log('✅ Null store ID correctly rejected');
    });

    it('should throw BAD_REQUEST when storeid is undefined', async () => {
      // Arrange: Undefined store ID
      const undefinedStoreId = undefined as any;
      const filters = { limit: 10, offset: 0 };

      // Act & Assert: Should throw BAD_REQUEST
      await expect(
        productService.findProductsForStore(undefinedStoreId, filters)
      ).rejects.toThrow(TRPCError);

      await expect(
        productService.findProductsForStore(undefinedStoreId, filters)
      ).rejects.toThrow(/Store ID is required/i);

      console.log('✅ Undefined store ID correctly rejected');
    });

    it('should throw BAD_REQUEST when storeid has invalid format', async () => {
      // Arrange: Invalid store ID formats
      const invalidStoreIds = [
        'invalid_store_id',
        'store123', // missing underscore
        'store_', // empty suffix
        'store_123-abc', // invalid characters
        'STORE_123', // uppercase
        '123_store', // wrong prefix
      ];

      const filters = { limit: 10, offset: 0 };

      // Act & Assert: Each invalid ID should be rejected
      for (const invalidId of invalidStoreIds) {
        await expect(
          productService.findProductsForStore(invalidId, filters)
        ).rejects.toThrow(TRPCError);

        await expect(
          productService.findProductsForStore(invalidId, filters)
        ).rejects.toThrow(/Invalid store ID format/i);
      }

      console.log(`✅ All ${invalidStoreIds.length} invalid store ID formats correctly rejected`);
    });

    it('should throw BAD_REQUEST for orders when storeid is missing', async () => {
      // Arrange: Empty store ID
      const emptyStoreId = '';
      const filters = { limit: 10, offset: 0 };

      // Act & Assert: Should throw BAD_REQUEST
      await expect(
        orderService.findOrdersForStore(emptyStoreId, filters)
      ).rejects.toThrow(TRPCError);

      await expect(
        orderService.findOrdersForStore(emptyStoreId, filters)
      ).rejects.toThrow(/Store ID is required/i);

      console.log('✅ Empty store ID correctly rejected for orders');
    });
  });

  // ============================================================================
  // TEST CASE 3: DIRECT ID RETRIEVAL - Store A cannot access Store B's product
  // ============================================================================

  describe('Test Case 3: Direct ID Retrieval - Cross-Tenant Access Prevention', () => {
    it('should retrieve Product A when using Store A context and Product A ID', async () => {
      // Arrange: Store A context, Product A ID
      const storeId = TEST_CONFIG.STORE_A_ID;
      const productId = TEST_CONFIG.PRODUCT_A_ID;

      // Act: Retrieve product by ID
      const product = await productService.getProductById(storeId, productId);

      // Assert: Should successfully retrieve Product A
      expect(product).toBeDefined();
      expect(product.id).toBe(TEST_CONFIG.PRODUCT_A_ID);
      expect(product.store_id).toBe(TEST_CONFIG.STORE_A_ID);
      expect(product.title).toContain('Product A');

      console.log('✅ Store A successfully retrieved its own product by ID');
    });

    it('should FAIL to retrieve Product B when using Store A context and Product B ID', async () => {
      // Arrange: Store A context, Product B ID (cross-tenant access attempt)
      const storeId = TEST_CONFIG.STORE_A_ID;
      const productId = TEST_CONFIG.PRODUCT_B_ID;

      // Act & Assert: Should throw NOT_FOUND error
      await expect(
        productService.getProductById(storeId, productId)
      ).rejects.toThrow(TRPCError);

      // The service layer should return NOT_FOUND (not exposing that it exists in another store)
      await expect(
        productService.getProductById(storeId, productId)
      ).rejects.toThrow(/NOT_FOUND|not found/i);

      console.log('✅ Store A correctly prevented from accessing Product B by direct ID');
    });

    it('should retrieve Product B when using Store B context and Product B ID', async () => {
      // Arrange: Store B context, Product B ID
      const storeId = TEST_CONFIG.STORE_B_ID;
      const productId = TEST_CONFIG.PRODUCT_B_ID;

      // Act: Retrieve product by ID
      const product = await productService.getProductById(storeId, productId);

      // Assert: Should successfully retrieve Product B
      expect(product).toBeDefined();
      expect(product.id).toBe(TEST_CONFIG.PRODUCT_B_ID);
      expect(product.store_id).toBe(TEST_CONFIG.STORE_B_ID);
      expect(product.title).toContain('Product B');

      console.log('✅ Store B successfully retrieved its own product by ID');
    });

    it('should FAIL to retrieve Product A when using Store B context and Product A ID', async () => {
      // Arrange: Store B context, Product A ID (cross-tenant access attempt)
      const storeId = TEST_CONFIG.STORE_B_ID;
      const productId = TEST_CONFIG.PRODUCT_A_ID;

      // Act & Assert: Should throw NOT_FOUND error
      await expect(
        productService.getProductById(storeId, productId)
      ).rejects.toThrow(TRPCError);

      await expect(
        productService.getProductById(storeId, productId)
      ).rejects.toThrow(/NOT_FOUND|not found/i);

      console.log('✅ Store B correctly prevented from accessing Product A by direct ID');
    });

    it('should prevent cross-tenant order access by direct ID', async () => {
      // Arrange: Store A context, Order B ID (cross-tenant access attempt)
      const storeId = TEST_CONFIG.STORE_A_ID;
      const orderId = TEST_CONFIG.ORDER_B_ID;

      // Act & Assert: Should throw NOT_FOUND error
      await expect(
        orderService.getOrderById(storeId, orderId)
      ).rejects.toThrow(TRPCError);

      await expect(
        orderService.getOrderById(storeId, orderId)
      ).rejects.toThrow(/NOT_FOUND|not found/i);

      console.log('✅ Store A correctly prevented from accessing Order B by direct ID');
    });

    it('should prevent cross-tenant order access when retrieving by order number', async () => {
      // Arrange: Store A context, Order B number (cross-tenant access attempt)
      const storeId = TEST_CONFIG.STORE_A_ID;
      const orderNumber = 'ORD-B-001';

      // Act & Assert: Should throw NOT_FOUND error
      await expect(
        orderService.getOrderByNumber(storeId, orderNumber)
      ).rejects.toThrow(TRPCError);

      await expect(
        orderService.getOrderByNumber(storeId, orderNumber)
      ).rejects.toThrow(/NOT_FOUND|not found/i);

      console.log('✅ Store A correctly prevented from accessing Order B by order number');
    });
  });

  // ============================================================================
  // ADDITIONAL SECURITY TESTS
  // ============================================================================

  describe('Additional Security Tests', () => {
    it('should ensure store_id filter cannot be bypassed with SQL injection', async () => {
      // Arrange: Malicious store ID attempting SQL injection
      const maliciousStoreIds = [
        "store_123' OR '1'='1",
        "store_123'; DROP TABLE products; --",
        "store_123' UNION SELECT * FROM products WHERE store_id='store_test_b456",
      ];

      const filters = { limit: 10, offset: 0 };

      // Act & Assert: All injection attempts should be rejected
      for (const maliciousId of maliciousStoreIds) {
        await expect(
          productService.findProductsForStore(maliciousId, filters)
        ).rejects.toThrow(TRPCError);

        await expect(
          productService.findProductsForStore(maliciousId, filters)
        ).rejects.toThrow(/Invalid store ID format/i);
      }

      console.log('✅ SQL injection attempts correctly prevented');
    });

    it('should maintain isolation under concurrent requests', async () => {
      // Arrange: Concurrent requests for different stores
      const filters = { limit: 10, offset: 0 };

      // Act: Execute concurrent requests
      const [resultA, resultB] = await Promise.all([
        productService.findProductsForStore(TEST_CONFIG.STORE_A_ID, filters),
        productService.findProductsForStore(TEST_CONFIG.STORE_B_ID, filters),
      ]);

      // Assert: Each result should only contain its own store's products
      resultA.products.forEach(product => {
        expect(product.store_id).toBe(TEST_CONFIG.STORE_A_ID);
      });

      resultB.products.forEach(product => {
        expect(product.store_id).toBe(TEST_CONFIG.STORE_B_ID);
      });

      console.log('✅ Isolation maintained under concurrent requests');
    });

    it('should not leak store existence information through error messages', async () => {
      // Arrange: Non-existent store ID
      const nonExistentStoreId = 'store_nonexistent999';
      const filters = { limit: 10, offset: 0 };

      // Act: Query with non-existent store
      const result = await productService.findProductsForStore(
        nonExistentStoreId,
        filters
      );

      // Assert: Should return empty list, not error
      // (This prevents information leakage about store existence)
      expect(result.products).toEqual([]);
      expect(result.count).toBe(0);

      console.log('✅ Non-existent store returns empty results without information leakage');
    });
  });
});

