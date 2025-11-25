/**
 * Base Service Tests
 * 
 * Tests for the BaseService class and query isolation utilities.
 * Ensures that all services properly enforce multi-tenant data isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { BaseService, StoreIdValidator, QueryIsolation, ServiceInitializer } from '../base.service';
// Mock Database type for testing
type Database = any;

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      })),
      is: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      order: vi.fn(() => ({
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      })),
    })),
    update: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
} as any;

// Test service class that extends BaseService
class TestService extends BaseService {
  async testMethod(storeId: string) {
    this.validateStoreId(storeId, 'TestService');
    return this.createIsolatedQuery('test_table', storeId, 'TestService');
  }

  async testMethodWithCount(storeId: string) {
    this.validateStoreId(storeId, 'TestService');
    return this.createIsolatedQueryWithCount('test_table', storeId, 'TestService');
  }
}

describe('BaseService', () => {
  let testService: TestService;

  beforeEach(() => {
    testService = new TestService();
    vi.clearAllMocks();
  });

  describe('StoreIdValidator', () => {
    describe('validate', () => {
      it('should validate correct Medusa store ID format', () => {
        expect(() => {
          StoreIdValidator.validate('store_123abc', 'TestService');
        }).not.toThrow();
      });

      it('should throw BAD_REQUEST for missing store ID', () => {
        expect(() => {
          StoreIdValidator.validate('', 'TestService');
        }).toThrow(TRPCError);

        expect(() => {
          StoreIdValidator.validate('', 'TestService');
        }).toThrow('Store ID is required');
      });

      it('should throw BAD_REQUEST for null store ID', () => {
        expect(() => {
          StoreIdValidator.validate(null as any, 'TestService');
        }).toThrow(TRPCError);

        expect(() => {
          StoreIdValidator.validate(null as any, 'TestService');
        }).toThrow('Store ID is required');
      });

      it('should throw BAD_REQUEST for invalid store ID format', () => {
        const invalidIds = [
          'invalid_store_id',
          'store123', // missing underscore
          'store_', // empty suffix
          'store_123-abc', // invalid characters
          'STORE_123', // uppercase
          '123_store', // wrong prefix
        ];

        invalidIds.forEach(invalidId => {
          expect(() => {
            StoreIdValidator.validate(invalidId, 'TestService');
          }).toThrow(TRPCError);

          expect(() => {
            StoreIdValidator.validate(invalidId, 'TestService');
          }).toThrow('Invalid store ID format');
        });
      });

      it('should include context in error messages', () => {
        expect(() => {
          StoreIdValidator.validate('', 'MyService');
        }).toThrow('MyService: Store ID is required');

        expect(() => {
          StoreIdValidator.validate('invalid', 'MyService');
        }).toThrow('MyService: Invalid store ID format');
      });
    });

    describe('validateAndReturn', () => {
      it('should return valid store ID', () => {
        const storeId = 'store_123abc';
        const result = StoreIdValidator.validateAndReturn(storeId, 'TestService');
        expect(result).toBe(storeId);
      });

      it('should throw for invalid store ID', () => {
        expect(() => {
          StoreIdValidator.validateAndReturn('invalid', 'TestService');
        }).toThrow(TRPCError);
      });
    });
  });

  describe('QueryIsolation', () => {
    describe('createBaseQuery', () => {
      it('should create query with mandatory store_id filter', () => {
        const storeId = 'store_123abc';
        const query = QueryIsolation.createBaseQuery(mockSupabaseClient, 'products', storeId, 'TestService');
        
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
        expect(query).toBeDefined();
      });

      it('should throw for invalid store ID', () => {
        expect(() => {
          QueryIsolation.createBaseQuery(mockSupabaseClient, 'products', 'invalid', 'TestService');
        }).toThrow(TRPCError);
      });
    });

    describe('createBaseQueryWithCount', () => {
      it('should create query with count and mandatory store_id filter', () => {
        const storeId = 'store_123abc';
        const query = QueryIsolation.createBaseQueryWithCount(mockSupabaseClient, 'products', storeId, 'TestService');
        
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
        expect(query).toBeDefined();
      });
    });

    describe('mergeFilters', () => {
      it('should merge array filters correctly', () => {
        const baseQuery = {
          overlaps: vi.fn().mockReturnThis(),
        };

        const filters = {
          category_ids: ['cat1', 'cat2'],
          tags: ['tag1', 'tag2'],
        };

        const result = QueryIsolation.mergeFilters(baseQuery, filters);
        
        expect(baseQuery.overlaps).toHaveBeenCalledWith('category_ids', ['cat1', 'cat2']);
        expect(baseQuery.overlaps).toHaveBeenCalledWith('tags', ['tag1', 'tag2']);
      });

      it('should merge single value filters correctly', () => {
        const baseQuery = {
          eq: vi.fn().mockReturnThis(),
        };

        const filters = {
          status: 'active',
          is_published: true,
        };

        const result = QueryIsolation.mergeFilters(baseQuery, filters);
        
        expect(baseQuery.eq).toHaveBeenCalledWith('status', 'active');
        expect(baseQuery.eq).toHaveBeenCalledWith('is_published', true);
      });

      it('should handle comma-separated values', () => {
        const baseQuery = {
          overlaps: vi.fn().mockReturnThis(),
        };

        const filters = {
          category_ids: 'cat1,cat2,cat3',
        };

        const result = QueryIsolation.mergeFilters(baseQuery, filters);
        
        expect(baseQuery.overlaps).toHaveBeenCalledWith('category_ids', ['cat1', 'cat2', 'cat3']);
      });

      it('should ignore undefined and null values', () => {
        const baseQuery = {
          eq: vi.fn().mockReturnThis(),
        };

        const filters = {
          status: 'active',
          category_id: undefined,
          tags: null,
        };

        const result = QueryIsolation.mergeFilters(baseQuery, filters);
        
        expect(baseQuery.eq).toHaveBeenCalledTimes(1);
        expect(baseQuery.eq).toHaveBeenCalledWith('status', 'active');
      });
    });
  });

  describe('BaseService', () => {
    beforeEach(() => {
      testService.initialize(mockSupabaseClient);
    });

    describe('ensureInitialized', () => {
      it('should throw if service is not initialized', () => {
        const uninitializedService = new TestService();
        
        expect(() => {
          uninitializedService.testMethod('store_123');
        }).toThrow(TRPCError);

        expect(() => {
          uninitializedService.testMethod('store_123');
        }).toThrow('Service is not initialized');
      });

      it('should not throw if service is initialized', () => {
        expect(() => {
          testService.testMethod('store_123');
        }).not.toThrow();
      });
    });

    describe('validateStoreId', () => {
      it('should validate store ID and ensure service is initialized', () => {
        expect(() => {
          testService.testMethod('store_123abc');
        }).not.toThrow();
      });

      it('should throw for invalid store ID', () => {
        expect(() => {
          testService.testMethod('invalid');
        }).toThrow(TRPCError);
      });
    });

    describe('createIsolatedQuery', () => {
      it('should create isolated query with store_id filter', () => {
        const storeId = 'store_123abc';
        const query = testService.testMethod(storeId);
        
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_table');
        expect(query).toBeDefined();
      });
    });

    describe('createIsolatedQueryWithCount', () => {
      it('should create isolated query with count and store_id filter', () => {
        const storeId = 'store_123abc';
        const query = testService.testMethodWithCount(storeId);
        
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_table');
        expect(query).toBeDefined();
      });
    });

    describe('handleDatabaseError', () => {
      it('should handle PGRST116 error as NOT_FOUND', () => {
        const error = { code: 'PGRST116', message: 'No rows returned' };
        
        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow(TRPCError);

        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow('NOT_FOUND');
      });

      it('should handle unique constraint violation as CONFLICT', () => {
        const error = { code: '23505', message: 'Unique constraint violation' };
        
        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow(TRPCError);

        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow('CONFLICT');
      });

      it('should handle foreign key constraint violation as BAD_REQUEST', () => {
        const error = { code: '23503', message: 'Foreign key constraint violation' };
        
        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow(TRPCError);

        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow('BAD_REQUEST');
      });

      it('should handle generic database error as INTERNAL_SERVER_ERROR', () => {
        const error = { code: 'UNKNOWN', message: 'Generic database error' };
        
        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow(TRPCError);

        expect(() => {
          (testService as any).handleDatabaseError(error, 'TestService', 'testMethod');
        }).toThrow('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('ServiceInitializer', () => {
    describe('initialize', () => {
      it('should initialize service successfully', () => {
        const service = new TestService();
        
        expect(() => {
          ServiceInitializer.initialize(service, mockSupabaseClient, 'TestService');
        }).not.toThrow();
      });

      it('should handle initialization errors', () => {
        const service = new TestService();
        const errorService = {
          initialize: vi.fn().mockImplementation(() => {
            throw new Error('Initialization failed');
          }),
        } as any;
        
        expect(() => {
          ServiceInitializer.initialize(errorService, mockSupabaseClient, 'TestService');
        }).toThrow(TRPCError);

        expect(() => {
          ServiceInitializer.initialize(errorService, mockSupabaseClient, 'TestService');
        }).toThrow('Failed to initialize TestService');
      });
    });
  });
});
