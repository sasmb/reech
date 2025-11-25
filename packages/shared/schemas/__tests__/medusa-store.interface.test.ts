/**
 * Medusa Store Interface Tests
 * 
 * Tests for the MedusaStoreCreateInput interface and related schemas.
 * Ensures validation, helper functions, and type guards work correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  type MedusaStoreCreateInput,
  type MedusaStoreCurrency,
  MedusaStoreCreateInputSchema,
  MedusaStoreCurrencySchema,
  CurrencyCodeSchema,
  validateMedusaStoreCreateInput,
  createMedusaStoreInput,
  convertToMedusaCurrencies,
  hasMetadata,
  hasTypedMetadata,
} from '../medusa-store.interface';

describe('MedusaStoreCreateInput Interface & Schema', () => {
  describe('CurrencyCodeSchema', () => {
    it('should validate valid currency codes', () => {
      const validCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
      
      validCodes.forEach(code => {
        const result = CurrencyCodeSchema.safeParse(code);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid currency codes', () => {
      const invalidCodes = [
        'US',      // Too short
        'USDD',    // Too long
        'usd',     // Lowercase
        'US1',     // Contains number
        '123',     // All numbers
        '',        // Empty
      ];

      invalidCodes.forEach(code => {
        const result = CurrencyCodeSchema.safeParse(code);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('MedusaStoreCurrencySchema', () => {
    it('should validate valid currency configuration', () => {
      const currency: MedusaStoreCurrency = {
        currency_code: 'USD',
        is_default: true,
      };

      const result = MedusaStoreCurrencySchema.safeParse(currency);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency_code).toBe('USD');
        expect(result.data.is_default).toBe(true);
      }
    });

    it('should apply default value for is_default', () => {
      const currency = {
        currency_code: 'EUR',
      };

      const result = MedusaStoreCurrencySchema.safeParse(currency);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_default).toBe(false); // Default value
      }
    });

    it('should reject unknown properties in strict mode', () => {
      const currency = {
        currency_code: 'GBP',
        is_default: true,
        unknown_field: 'test',
      };

      const result = MedusaStoreCurrencySchema.safeParse(currency);
      expect(result.success).toBe(false);
    });
  });

  describe('MedusaStoreCreateInputSchema', () => {
    it('should validate minimal valid input', () => {
      const input: MedusaStoreCreateInput = {
        name: 'Acme Store',
        currencies: ['USD'],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Acme Store');
        expect(result.data.currencies).toEqual(['USD']);
      }
    });

    it('should validate input with metadata', () => {
      const input: MedusaStoreCreateInput = {
        name: 'Acme Store',
        currencies: ['USD', 'EUR'],
        metadata: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          legacyExternalId: 'old-store-123',
        },
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toBeDefined();
        expect(result.data.metadata?.tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('should validate input with all optional fields', () => {
      const input: MedusaStoreCreateInput = {
        name: 'Complete Store',
        currencies: ['USD', 'EUR', 'GBP'],
        metadata: { key: 'value' },
        default_sales_channel_id: 'sc_123',
        default_region_id: 'reg_123',
        default_location_id: 'loc_123',
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.default_sales_channel_id).toBe('sc_123');
        expect(result.data.default_region_id).toBe('reg_123');
        expect(result.data.default_location_id).toBe('loc_123');
      }
    });

    it('should reject empty store name', () => {
      const input = {
        name: '',
        currencies: ['USD'],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject store name with only whitespace', () => {
      const input = {
        name: '   ',
        currencies: ['USD'],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject store name exceeding 255 characters', () => {
      const input = {
        name: 'a'.repeat(256),
        currencies: ['USD'],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty currencies array', () => {
      const input = {
        name: 'Acme Store',
        currencies: [],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency codes in array', () => {
      const input = {
        name: 'Acme Store',
        currencies: ['USD', 'invalid'],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow duplicate currency codes', () => {
      const input = {
        name: 'Acme Store',
        currencies: ['USD', 'USD', 'EUR'],
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true); // Medusa handles deduplication
    });

    it('should reject unknown properties in strict mode', () => {
      const input = {
        name: 'Acme Store',
        currencies: ['USD'],
        unknown_field: 'test',
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    describe('validateMedusaStoreCreateInput', () => {
      it('should return success for valid input', () => {
        const input = {
          name: 'Acme Store',
          currencies: ['USD', 'EUR'],
          metadata: { key: 'value' },
        };

        const result = validateMedusaStoreCreateInput(input);
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(input);
        expect(result.errors).toBe(null);
      });

      it('should return detailed errors for invalid input', () => {
        const input = {
          name: '',
          currencies: [],
        };

        const result = validateMedusaStoreCreateInput(input);
        
        expect(result.success).toBe(false);
        expect(result.data).toBe(null);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
      });

      it('should provide error path and message', () => {
        const input = {
          name: 'Acme Store',
          currencies: ['invalid'],
        };

        const result = validateMedusaStoreCreateInput(input);
        
        expect(result.success).toBe(false);
        expect(result.errors?.[0]?.path).toContain('currencies');
        expect(result.errors?.[0]?.message).toBeDefined();
      });
    });

    describe('createMedusaStoreInput', () => {
      it('should create valid input with minimal params', () => {
        const input = createMedusaStoreInput('Acme Store');
        
        expect(input.name).toBe('Acme Store');
        expect(input.currencies).toEqual(['USD']); // Default
        expect(input.metadata).toBeUndefined();
      });

      it('should create valid input with custom currencies', () => {
        const input = createMedusaStoreInput('Acme Store', ['EUR', 'GBP']);
        
        expect(input.name).toBe('Acme Store');
        expect(input.currencies).toEqual(['EUR', 'GBP']);
      });

      it('should create valid input with metadata', () => {
        const metadata = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          legacyExternalId: 'old-store-123',
        };

        const input = createMedusaStoreInput('Acme Store', ['USD'], metadata);
        
        expect(input.name).toBe('Acme Store');
        expect(input.metadata).toEqual(metadata);
      });

      it('should convert currencies to uppercase', () => {
        const input = createMedusaStoreInput('Acme Store', ['usd', 'eur']);
        
        expect(input.currencies).toEqual(['USD', 'EUR']);
      });

      it('should throw error for invalid input', () => {
        expect(() => {
          createMedusaStoreInput('', ['USD']);
        }).toThrow();
      });

      it('should throw error for invalid currency code', () => {
        expect(() => {
          createMedusaStoreInput('Acme Store', ['INVALID']);
        }).toThrow();
      });
    });

    describe('convertToMedusaCurrencies', () => {
      it('should convert single currency with is_default true', () => {
        const result = convertToMedusaCurrencies(['USD']);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          currency_code: 'USD',
          is_default: true,
        });
      });

      it('should convert multiple currencies with first as default', () => {
        const result = convertToMedusaCurrencies(['USD', 'EUR', 'GBP']);
        
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ currency_code: 'USD', is_default: true });
        expect(result[1]).toEqual({ currency_code: 'EUR', is_default: false });
        expect(result[2]).toEqual({ currency_code: 'GBP', is_default: false });
      });

      it('should convert currencies to uppercase', () => {
        const result = convertToMedusaCurrencies(['usd', 'eur']);
        
        expect(result[0]?.currency_code).toBe('USD');
        expect(result[1]?.currency_code).toBe('EUR');
      });

      it('should throw error for empty array', () => {
        expect(() => {
          convertToMedusaCurrencies([]);
        }).toThrow('At least one currency is required');
      });
    });
  });

  describe('Type Guards', () => {
    describe('hasMetadata', () => {
      it('should return true for input with metadata', () => {
        const input: MedusaStoreCreateInput = {
          name: 'Acme Store',
          currencies: ['USD'],
          metadata: { key: 'value' },
        };

        expect(hasMetadata(input)).toBe(true);
      });

      it('should return false for input without metadata', () => {
        const input: MedusaStoreCreateInput = {
          name: 'Acme Store',
          currencies: ['USD'],
        };

        expect(hasMetadata(input)).toBe(false);
      });

      it('should return false for input with empty metadata', () => {
        const input: MedusaStoreCreateInput = {
          name: 'Acme Store',
          currencies: ['USD'],
          metadata: {},
        };

        expect(hasMetadata(input)).toBe(false);
      });
    });

    describe('hasTypedMetadata', () => {
      it('should return true for input with valid typed metadata', () => {
        const input: MedusaStoreCreateInput = {
          name: 'Acme Store',
          currencies: ['USD'],
          metadata: {
            tenantId: '123e4567-e89b-12d3-a456-426614174000',
            legacyExternalId: 'old-store-123',
            syncEnabled: false,
          },
        };

        expect(hasTypedMetadata(input)).toBe(true);
      });

      it('should return false for input without metadata', () => {
        const input: MedusaStoreCreateInput = {
          name: 'Acme Store',
          currencies: ['USD'],
        };

        expect(hasTypedMetadata(input)).toBe(false);
      });

      it('should return false for input with invalid typed metadata', () => {
        const input: MedusaStoreCreateInput = {
          name: 'Acme Store',
          currencies: ['USD'],
          metadata: {
            tenantId: 'not-a-uuid', // Invalid UUID
          },
        };

        expect(hasTypedMetadata(input)).toBe(false);
      });
    });
  });

  describe('Integration with MedusaStoreMetadataSchema', () => {
    it('should validate typed metadata correctly', () => {
      const input = {
        name: 'Acme Store',
        currencies: ['USD'],
        metadata: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          legacyExternalId: 'shopify-store-12345',
          externalSystemName: 'Shopify',
          syncEnabled: true,
          lastSyncedAt: '2025-10-02T19:30:00.000Z',
        },
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow flexible metadata structure', () => {
      const input = {
        name: 'Acme Store',
        currencies: ['USD'],
        metadata: {
          customField1: 'value1',
          customField2: 123,
          nested: {
            data: 'value',
          },
        },
      };

      const result = MedusaStoreCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should handle migration from Shopify', () => {
      const input = createMedusaStoreInput(
        'Acme Store',
        ['USD', 'EUR'],
        {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          legacyExternalId: 'shopify-store-12345',
          externalSystemName: 'Shopify',
          syncEnabled: false,
        }
      );

      expect(input.name).toBe('Acme Store');
      expect(input.currencies).toEqual(['USD', 'EUR']);
      expect(input.metadata?.legacyExternalId).toBe('shopify-store-12345');
    });

    it('should handle new store creation without legacy data', () => {
      const input = createMedusaStoreInput('New Store', ['USD']);

      expect(input.name).toBe('New Store');
      expect(input.currencies).toEqual(['USD']);
      expect(input.metadata).toBeUndefined();
    });

    it('should handle multi-currency store with complete metadata', () => {
      const metadata = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        legacyExternalId: 'woocommerce-site-789',
        externalSystemName: 'WooCommerce',
        syncEnabled: true,
        lastSyncedAt: new Date().toISOString(),
        integrationVersion: '1.0.0',
        notes: 'Migrated from WooCommerce on 2025-10-02',
      };

      const input = createMedusaStoreInput(
        'Multi-Currency Store',
        ['USD', 'EUR', 'GBP', 'CAD'],
        metadata
      );

      expect(input.currencies).toHaveLength(4);
      expect(input.metadata?.externalSystemName).toBe('WooCommerce');
    });
  });
});

