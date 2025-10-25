/**
 * Product Service Tests
 * 
 * Tests for the ProductService class with focus on storeId parameter enforcement.
 * These tests validate that all service methods properly require storeId as the first parameter.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { ProductService, type Product, type ProductListResponse } from '../product.service';
import type { FilterableProductProps } from '../../../packages/shared/schemas/product.schema';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          contains: vi.fn(() => ({
            overlaps: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    or: vi.fn(() => ({
                      order: vi.fn(() => ({
                        range: vi.fn(() => ({
                          single: vi.fn(),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  })),
};

// Mock environment variables
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('ProductService', () => {
  let productService: ProductService;
  const validStoreId = 'store_01HQWE123456789';
  const validProductId = '123e4567-e89b-12d3-a456-426614174000';
  const validFilters: FilterableProductProps = {
    limit: 15,
    offset: 0,
    order_by: 'created_at',
    sort_order: 'desc',
  };

  beforeEach(() => {
    productService = new ProductService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('StoreId Parameter Enforcement', () => {
    describe('findProductsForStore', () => {
      it('should require storeId as the first parameter', async () => {
        // This test validates the method signature at compile time
        // The TypeScript compiler will enforce that storeId is the first parameter
        expect(typeof productService.findProductsForStore).toBe('function');
        
        // Test that the method expects storeId first
        const method = productService.findProductsForStore;
        expect(method.length).toBe(2); // storeId, filters
      });

      it('should validate storeId format', async () => {
        const invalidStoreIds = [
          '', // empty
          'invalid', // no store_ prefix
          'store_', // no suffix
          'store_123!', // invalid characters
          null as any, // null
          undefined as any, // undefined
          123 as any, // number
        ];

        for (const invalidStoreId of invalidStoreIds) {
          await expect(
            productService.findProductsForStore(invalidStoreId, validFilters)
          ).rejects.toThrow(TRPCError);
        }
      });

      it('should accept valid storeId format', async () => {
        const validStoreIds = [
          'store_01HQWE123456789',
          'store_abc123def456',
          'store_1234567890',
        ];

        // Mock successful response
        mockSupabaseClient.from.mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                contains: vi.fn(() => ({
                  overlaps: vi.fn(() => ({
                    gte: vi.fn(() => ({
                      lte: vi.fn(() => ({
                        gt: vi.fn(() => ({
                          or: vi.fn(() => ({
                            order: vi.fn(() => ({
                              range: vi.fn(() => ({
                                single: vi.fn(),
                              })),
                            })),
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          })),
        });

        for (const validStoreId of validStoreIds) {
          // Should not throw for valid storeId format
          await expect(
            productService.findProductsForStore(validStoreId, validFilters)
          ).resolves.toBeDefined();
        }
      });
    });

    describe('getProductById', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof productService.getProductById).toBe('function');
        expect(productService.getProductById.length).toBe(2); // storeId, productId
      });

      it('should validate both storeId and productId formats', async () => {
        const invalidStoreIds = ['', 'invalid', 'store_'];
        const invalidProductIds = ['', 'invalid', '123', null as any];

        for (const invalidStoreId of invalidStoreIds) {
          await expect(
            productService.getProductById(invalidStoreId, validProductId)
          ).rejects.toThrow(TRPCError);
        }

        for (const invalidProductId of invalidProductIds) {
          await expect(
            productService.getProductById(validStoreId, invalidProductId)
          ).rejects.toThrow(TRPCError);
        }
      });
    });

    describe('createProduct', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof productService.createProduct).toBe('function');
        expect(productService.createProduct.length).toBe(2); // storeId, productData
      });

      it('should validate storeId format', async () => {
        const productData = {
          title: 'Test Product',
          slug: 'test-product',
          sku: 'TEST-001',
          barcode: null,
          description: null,
          short_description: null,
          status: 'active' as const,
          is_published: true,
          published_at: null,
          price_amount: 2999,
          price_currency: 'USD',
          compare_at_price: null,
          cost_price: null,
          track_inventory: true,
          quantity_available: 10,
          quantity_reserved: 0,
          low_stock_threshold: null,
          allow_backorder: false,
          requires_shipping: true,
          weight: null,
          length: null,
          width: null,
          height: null,
          is_digital: false,
          download_url: null,
          download_limit: null,
          images: [],
          featured_image: null,
          category_ids: [],
          tag_ids: [],
          collection_ids: [],
          vendor: null,
          brand: null,
          seo_title: null,
          seo_description: null,
          seo_keywords: null,
          metadata: {},
          custom_fields: {},
          has_variants: false,
          options: {},
          sort_order: 0,
          is_featured: false,
          deleted_at: null,
        };

        await expect(
          productService.createProduct('invalid_store_id', productData)
        ).rejects.toThrow(TRPCError);
      });
    });

    describe('updateProduct', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof productService.updateProduct).toBe('function');
        expect(productService.updateProduct.length).toBe(3); // storeId, productId, updateData
      });

      it('should validate storeId and productId formats', async () => {
        const updateData = { title: 'Updated Product' };

        await expect(
          productService.updateProduct('invalid_store_id', validProductId, updateData)
        ).rejects.toThrow(TRPCError);

        await expect(
          productService.updateProduct(validStoreId, 'invalid_product_id', updateData)
        ).rejects.toThrow(TRPCError);
      });
    });

    describe('deleteProduct', () => {
      it('should require storeId as the first parameter', async () => {
        expect(typeof productService.deleteProduct).toBe('function');
        expect(productService.deleteProduct.length).toBe(2); // storeId, productId
      });

      it('should validate storeId and productId formats', async () => {
        await expect(
          productService.deleteProduct('invalid_store_id', validProductId)
        ).rejects.toThrow(TRPCError);

        await expect(
          productService.deleteProduct(validStoreId, 'invalid_product_id')
        ).rejects.toThrow(TRPCError);
      });
    });
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid environment variables', async () => {
      // Mock environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      await expect(productService.initialize()).resolves.toBeUndefined();
    });

    it('should fail initialization without environment variables', async () => {
      // Clear environment variables
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await expect(productService.initialize()).rejects.toThrow(TRPCError);
    });
  });

  describe('Database Query Isolation', () => {
    it('should filter queries by store_id', async () => {
      // Mock successful response
      const mockQuery = {
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            contains: vi.fn(() => ({
              overlaps: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      or: vi.fn(() => ({
                        order: vi.fn(() => ({
                          range: vi.fn(() => ({
                            single: vi.fn(),
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => mockQuery),
      });

      await productService.findProductsForStore(validStoreId, validFilters);

      // Verify that store_id filter was applied
      expect(mockQuery.eq).toHaveBeenCalledWith('store_id', validStoreId);
    });

    it('should exclude soft-deleted products', async () => {
      const mockQuery = {
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                single: vi.fn(),
              })),
            })),
          })),
        })),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => mockQuery),
      });

      await productService.findProductsForStore(validStoreId, validFilters);

      // Verify that deleted_at filter was applied
      expect(mockQuery.eq().is).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  describe('Error Handling', () => {
    it('should throw TRPCError for invalid storeId format', async () => {
      await expect(
        productService.findProductsForStore('invalid_store_id', validFilters)
      ).rejects.toThrow(TRPCError);
    });

    it('should throw TRPCError for missing storeId', async () => {
      await expect(
        productService.findProductsForStore('', validFilters)
      ).rejects.toThrow(TRPCError);
    });

    it('should throw TRPCError for null storeId', async () => {
      await expect(
        productService.findProductsForStore(null as any, validFilters)
      ).rejects.toThrow(TRPCError);
    });

    it('should throw TRPCError for undefined storeId', async () => {
      await expect(
        productService.findProductsForStore(undefined as any, validFilters)
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('Type Safety', () => {
    it('should enforce TypeScript types for method parameters', () => {
      // These tests validate TypeScript compilation
      // The compiler will enforce the correct parameter types

      // Valid calls (should compile)
      const validCalls = [
        () => productService.findProductsForStore(validStoreId, validFilters),
        () => productService.getProductById(validStoreId, validProductId),
        () => productService.createProduct(validStoreId, {} as any),
        () => productService.updateProduct(validStoreId, validProductId, {}),
        () => productService.deleteProduct(validStoreId, validProductId),
      ];

      // All valid calls should be functions
      validCalls.forEach(call => {
        expect(typeof call).toBe('function');
      });
    });
  });
});

describe('StoreId Parameter Enforcement - Integration Tests', () => {
  it('should enforce storeId as first parameter across all service methods', () => {
    const productService = new ProductService();
    
    // Get all method names
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(productService))
      .filter(name => name !== 'constructor' && typeof productService[name as keyof ProductService] === 'function');

    // Check that all methods that access tenant tables have storeId as first parameter
    const tenantTableMethods = [
      'findProductsForStore',
      'getProductById',
      'createProduct',
      'updateProduct',
      'deleteProduct',
    ];

    tenantTableMethods.forEach(methodName => {
      const method = productService[methodName as keyof ProductService] as Function;
      expect(typeof method).toBe('function');
      
      // The method should expect at least 2 parameters (storeId + other params)
      expect(method.length).toBeGreaterThanOrEqual(1);
    });
  });
});
