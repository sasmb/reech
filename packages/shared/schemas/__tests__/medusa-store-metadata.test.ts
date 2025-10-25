/**
 * Medusa Store Metadata Schema Tests
 * 
 * Tests for the MedusaStoreMetadataSchema to ensure:
 * - Validation works correctly
 * - Helper functions behave as expected
 * - Type guards function properly
 * - JSON compatibility is maintained
 */

import { describe, it, expect } from 'vitest';
import {
  MedusaStoreMetadataSchema,
  type IMedusaStoreMetadata,
  PartialMedusaStoreMetadataSchema,
  validateMedusaStoreMetadata,
  createEmptyMedusaStoreMetadata,
  createMedusaStoreMetadataWithTenant,
  hasTenantId,
  hasLegacyExternalId,
  isSyncEnabled,
} from '../medusa-store-metadata.schema';

describe('MedusaStoreMetadataSchema', () => {
  describe('Schema Validation', () => {
    it('should validate empty metadata object', () => {
      const result = MedusaStoreMetadataSchema.safeParse({});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('should validate metadata with only legacyExternalId', () => {
      const metadata = {
        legacyExternalId: 'shopify-store-12345',
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.legacyExternalId).toBe('shopify-store-12345');
      }
    });

    it('should validate metadata with tenantId', () => {
      const metadata = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('should reject invalid UUID for tenantId', () => {
      const metadata = {
        tenantId: 'not-a-uuid',
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.path).toEqual(['tenantId']);
      }
    });

    it('should validate complete metadata object', () => {
      const metadata: IMedusaStoreMetadata = {
        legacyExternalId: 'old-store-123',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        externalSystemName: 'Shopify',
        syncEnabled: true,
        lastSyncedAt: '2025-10-02T19:30:00.000Z',
        integrationVersion: '1.0.0',
        customData: {
          apiKey: 'encrypted-key',
          settings: { theme: 'dark' },
        },
        notes: 'Migrated from Shopify',
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(metadata);
      }
    });

    it('should reject invalid datetime for lastSyncedAt', () => {
      const metadata = {
        lastSyncedAt: 'not-a-datetime',
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 1000 characters', () => {
      const metadata = {
        notes: 'a'.repeat(1001),
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(false);
    });

    it('should reject unknown keys in strict mode', () => {
      const metadata = {
        legacyExternalId: 'test',
        unknownField: 'should-fail',
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(false);
    });

    it('should allow syncEnabled default value', () => {
      const metadata = {
        syncEnabled: false,
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.syncEnabled).toBe(false);
      }
    });
  });

  describe('PartialMedusaStoreMetadataSchema', () => {
    it('should allow partial updates', () => {
      const partialMetadata = {
        syncEnabled: true,
        lastSyncedAt: '2025-10-02T19:30:00.000Z',
      };

      const result = PartialMedusaStoreMetadataSchema.safeParse(partialMetadata);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.syncEnabled).toBe(true);
        expect(result.data.lastSyncedAt).toBe('2025-10-02T19:30:00.000Z');
      }
    });
  });

  describe('Helper Functions', () => {
    describe('validateMedusaStoreMetadata', () => {
      it('should return success for valid metadata', () => {
        const metadata = {
          legacyExternalId: 'test-123',
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        };

        const result = validateMedusaStoreMetadata(metadata);
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(metadata);
        expect(result.errors).toBe(null);
      });

      it('should return errors for invalid metadata', () => {
        const metadata = {
          tenantId: 'not-a-uuid',
        };

        const result = validateMedusaStoreMetadata(metadata);
        
        expect(result.success).toBe(false);
        expect(result.data).toBe(null);
        expect(result.errors).toBeDefined();
        expect(result.errors?.[0]?.path).toBe('tenantId');
      });
    });

    describe('createEmptyMedusaStoreMetadata', () => {
      it('should create valid empty metadata', () => {
        const metadata = createEmptyMedusaStoreMetadata();
        
        expect(metadata).toEqual({
          syncEnabled: false,
        });
      });
    });

    describe('createMedusaStoreMetadataWithTenant', () => {
      it('should create metadata with tenantId only', () => {
        const tenantId = '123e4567-e89b-12d3-a456-426614174000';
        const metadata = createMedusaStoreMetadataWithTenant(tenantId);
        
        expect(metadata.tenantId).toBe(tenantId);
        expect(metadata.syncEnabled).toBe(false);
        expect(metadata.legacyExternalId).toBeUndefined();
      });

      it('should create metadata with tenantId and legacyExternalId', () => {
        const tenantId = '123e4567-e89b-12d3-a456-426614174000';
        const legacyId = 'old-store-456';
        const metadata = createMedusaStoreMetadataWithTenant(tenantId, legacyId);
        
        expect(metadata.tenantId).toBe(tenantId);
        expect(metadata.legacyExternalId).toBe(legacyId);
        expect(metadata.syncEnabled).toBe(false);
      });

      it('should throw error for invalid tenantId', () => {
        const invalidTenantId = 'not-a-uuid';
        
        expect(() => {
          createMedusaStoreMetadataWithTenant(invalidTenantId);
        }).toThrow();
      });
    });
  });

  describe('Type Guards', () => {
    describe('hasTenantId', () => {
      it('should return true for metadata with tenantId', () => {
        const metadata: IMedusaStoreMetadata = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        };
        
        expect(hasTenantId(metadata)).toBe(true);
      });

      it('should return false for metadata without tenantId', () => {
        const metadata: IMedusaStoreMetadata = {
          legacyExternalId: 'test',
        };
        
        expect(hasTenantId(metadata)).toBe(false);
      });

      it('should return false for metadata with empty tenantId', () => {
        const metadata = {
          tenantId: '',
        } as IMedusaStoreMetadata;
        
        expect(hasTenantId(metadata)).toBe(false);
      });
    });

    describe('hasLegacyExternalId', () => {
      it('should return true for metadata with legacyExternalId', () => {
        const metadata: IMedusaStoreMetadata = {
          legacyExternalId: 'old-store-123',
        };
        
        expect(hasLegacyExternalId(metadata)).toBe(true);
      });

      it('should return false for metadata without legacyExternalId', () => {
        const metadata: IMedusaStoreMetadata = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
        };
        
        expect(hasLegacyExternalId(metadata)).toBe(false);
      });
    });

    describe('isSyncEnabled', () => {
      it('should return true when syncEnabled is true', () => {
        const metadata: IMedusaStoreMetadata = {
          syncEnabled: true,
        };
        
        expect(isSyncEnabled(metadata)).toBe(true);
      });

      it('should return false when syncEnabled is false', () => {
        const metadata: IMedusaStoreMetadata = {
          syncEnabled: false,
        };
        
        expect(isSyncEnabled(metadata)).toBe(false);
      });

      it('should return false when syncEnabled is undefined', () => {
        const metadata: IMedusaStoreMetadata = {};
        
        expect(isSyncEnabled(metadata)).toBe(false);
      });
    });
  });

  describe('JSON Compatibility', () => {
    it('should serialize and deserialize correctly', () => {
      const original: IMedusaStoreMetadata = {
        legacyExternalId: 'test-123',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        externalSystemName: 'Shopify',
        syncEnabled: true,
        lastSyncedAt: '2025-10-02T19:30:00.000Z',
        customData: {
          nested: { data: 'value' },
        },
      };

      // Serialize to JSON
      const jsonString = JSON.stringify(original);
      
      // Deserialize from JSON
      const parsed = JSON.parse(jsonString);
      
      // Validate the parsed data
      const result = MedusaStoreMetadataSchema.safeParse(parsed);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(original);
      }
    });

    it('should work with nested customData', () => {
      const metadata: IMedusaStoreMetadata = {
        customData: {
          level1: {
            level2: {
              level3: 'deep-value',
            },
          },
          array: [1, 2, 3],
          boolean: true,
        },
      };

      const result = MedusaStoreMetadataSchema.safeParse(metadata);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customData).toEqual(metadata.customData);
      }
    });
  });

  describe('Type Safety', () => {
    it('should provide correct TypeScript types', () => {
      const metadata: IMedusaStoreMetadata = {
        legacyExternalId: 'test',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        syncEnabled: false,
      };

      // TypeScript should not complain about these operations
      const legacyId: string | undefined = metadata.legacyExternalId;
      const tenantId: string | undefined = metadata.tenantId;
      const syncEnabled: boolean | undefined = metadata.syncEnabled;

      expect(legacyId).toBe('test');
      expect(tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(syncEnabled).toBe(false);
    });

    it('should narrow type with type guards', () => {
      const metadata: IMedusaStoreMetadata = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      if (hasTenantId(metadata)) {
        // TypeScript knows tenantId is defined here
        const upperTenantId: string = metadata.tenantId.toUpperCase();
        expect(upperTenantId).toBe('123E4567-E89B-12D3-A456-426614174000');
      }
    });
  });
});

