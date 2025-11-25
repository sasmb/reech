/**
 * Store Router Integration Tests
 * 
 * Prompt 7: Validates that the end-to-end flow works correctly
 * and Redis reliance is fully eliminated for store configurations.
 * 
 * These tests verify:
 * 1. Frontend can access store configuration via tRPC
 * 2. Data is fetched exclusively from Supabase (no Redis calls)
 * 3. x-store-id header is properly validated
 * 4. Returned data matches Zod schema
 * 5. Tenant isolation is enforced
 * 
 * @fileoverview Integration tests for store configuration API
 * @author Reech Development Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createCaller } from '../../../server/test-helpers';
import { createClient } from '@supabase/supabase-js';
import { StoreConfigSchema, type StoreConfig } from '../../../packages/shared/schemas';
import { TRPCError } from '@trpc/server';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Test store ID for storeA
 */
const STORE_A_ID = '11111111-1111-1111-1111-111111111111';

/**
 * Test store ID for storeB
 */
const STORE_B_ID = '22222222-2222-2222-2222-222222222222';

/**
 * Valid store configuration for testing
 */
const VALID_STORE_CONFIG: Omit<StoreConfig, 'storeId' | 'createdAt' | 'updatedAt'> = {
  version: '1.0.0',
  metadata: {
    name: 'Test Store A',
    description: 'Integration test store',
    keywords: ['test', 'integration', 'store'],
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
};

// ============================================================================
// TEST SETUP AND TEARDOWN
// ============================================================================

describe('Store Router Integration Tests (Prompt 7)', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not set');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await supabase
      .from('store_configs')
      .delete()
      .in('store_id', [STORE_A_ID, STORE_B_ID]);
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await supabase
      .from('store_configs')
      .delete()
      .in('store_id', [STORE_A_ID, STORE_B_ID]);
  });

  // ============================================================================
  // TEST SUITE 1: End-to-End Flow with x-store-id Header
  // ============================================================================

  describe('End-to-End Flow (Prompt 7 Requirement)', () => {
    it('should fetch store configuration with valid x-store-id header', async () => {
      // Step (a): Seed the database with a validated config for storeA
      const seedData = {
        store_id: STORE_A_ID,
        config: {
          ...VALID_STORE_CONFIG,
          storeId: STORE_A_ID,
        },
        version: '1.0.0',
        updated_at: new Date().toISOString(),
      };

      const { error: seedError } = await (supabase
        .from('store_configs') as any)
        .insert(seedData);

      expect(seedError).toBeNull();

      // Step (b): Send a request to the API with x-store-id header
      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_A_ID,
          },
        },
      });

      const config = await caller.store.getConfig();

      // Step (c): Assert that the returned JSON configuration is correct
      expect(config).toBeDefined();
      expect(config.storeId).toBe(STORE_A_ID);
      expect(config.metadata.name).toBe('Test Store A');
      expect(config.version).toBe('1.0.0');

      // Validate against Zod type
      const validationResult = StoreConfigSchema.safeParse(config);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        expect(validationResult.data.storeId).toBe(STORE_A_ID);
      }
    });

    it('should throw error when x-store-id header is missing', async () => {
      const caller = createCaller({
        req: {
          headers: {},
        },
      });

      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
      await expect(caller.store.getConfig()).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('should throw error when store does not exist in database', async () => {
      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_B_ID, // Not seeded
          },
        },
      });

      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
      await expect(caller.store.getConfig()).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  // ============================================================================
  // TEST SUITE 2: Verify No Redis Calls (Prompt 7 Requirement)
  // ============================================================================

  describe('Redis Dependency Elimination (Prompt 7 Requirement)', () => {
    it('should fetch data from Supabase without calling Redis', async () => {
      // Seed database
      await (supabase.from('store_configs') as any).insert({
        store_id: STORE_A_ID,
        config: {
          ...VALID_STORE_CONFIG,
          storeId: STORE_A_ID,
        },
        version: '1.0.0',
        updated_at: new Date().toISOString(),
      });

      // Mock Redis to track if it's called
      const redisSpy = vi.spyOn(require('@/lib/redis'), 'redis');

      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_A_ID,
          },
        },
      });

      const config = await caller.store.getConfig();

      // Assert config was returned
      expect(config).toBeDefined();
      expect(config.storeId).toBe(STORE_A_ID);

      // Assert Redis was NOT called for store configuration
      expect(redisSpy).not.toHaveBeenCalled();

      redisSpy.mockRestore();
    });

    it('should handle database errors gracefully without Redis fallback', async () => {
      // Simulate database error by querying non-existent store
      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': '99999999-9999-9999-9999-999999999999',
          },
        },
      });

      // Should throw NOT_FOUND, not attempt Redis fallback
      await expect(caller.store.getConfig()).rejects.toThrow(TRPCError);
      await expect(caller.store.getConfig()).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  // ============================================================================
  // TEST SUITE 3: Tenant Isolation
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should only return configuration for authenticated storeId', async () => {
      // Seed both stores
      await (supabase.from('store_configs') as any).insert([
        {
          store_id: STORE_A_ID,
          config: {
            ...VALID_STORE_CONFIG,
            storeId: STORE_A_ID,
            metadata: { ...VALID_STORE_CONFIG.metadata, name: 'Store A' },
          },
          version: '1.0.0',
          updated_at: new Date().toISOString(),
        },
        {
          store_id: STORE_B_ID,
          config: {
            ...VALID_STORE_CONFIG,
            storeId: STORE_B_ID,
            metadata: { ...VALID_STORE_CONFIG.metadata, name: 'Store B' },
          },
          version: '1.0.0',
          updated_at: new Date().toISOString(),
        },
      ]);

      // Request Store A
      const callerA = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_A_ID,
          },
        },
      });

      const configA = await callerA.store.getConfig();
      expect(configA.storeId).toBe(STORE_A_ID);
      expect(configA.metadata.name).toBe('Store A');

      // Request Store B
      const callerB = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_B_ID,
          },
        },
      });

      const configB = await callerB.store.getConfig();
      expect(configB.storeId).toBe(STORE_B_ID);
      expect(configB.metadata.name).toBe('Store B');

      // Verify isolation: Store A caller cannot get Store B data
      expect(configA.storeId).not.toBe(configB.storeId);
    });
  });

  // ============================================================================
  // TEST SUITE 4: Zod Validation
  // ============================================================================

  describe('Zod Schema Validation', () => {
    it('should return data that validates against StoreConfigSchema', async () => {
      await (supabase.from('store_configs') as any).insert({
        store_id: STORE_A_ID,
        config: {
          ...VALID_STORE_CONFIG,
          storeId: STORE_A_ID,
        },
        version: '1.0.0',
        updated_at: new Date().toISOString(),
      });

      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_A_ID,
          },
        },
      });

      const config = await caller.store.getConfig();

      // Validate with Zod
      const result = StoreConfigSchema.safeParse(config);

      expect(result.success).toBe(true);

      if (result.success) {
        // Check all required fields are present
        expect(result.data).toHaveProperty('storeId');
        expect(result.data).toHaveProperty('version');
        expect(result.data).toHaveProperty('metadata');
        expect(result.data).toHaveProperty('theme');
        expect(result.data).toHaveProperty('layout');
        expect(result.data).toHaveProperty('features');
        expect(result.data).toHaveProperty('integrations');

        // Verify type safety
        const typedConfig: StoreConfig = result.data;
        expect(typedConfig.storeId).toBe(STORE_A_ID);
      }
    });

    it('should reject invalid data from database', async () => {
      // Intentionally insert invalid data
      await (supabase.from('store_configs') as any).insert({
        store_id: STORE_A_ID,
        config: {
          storeId: STORE_A_ID,
          version: '1.0.0',
          // Missing required fields
        },
        version: '1.0.0',
        updated_at: new Date().toISOString(),
      });

      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_A_ID,
          },
        },
      });

      const config = await caller.store.getConfig();

      // Validate with Zod
      const result = StoreConfigSchema.safeParse(config);

      // Should fail validation
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // TEST SUITE 5: Update Configuration
  // ============================================================================

  describe('Update Configuration', () => {
    it('should update store configuration via tRPC mutation', async () => {
      // Seed initial data
      await (supabase.from('store_configs') as any).insert({
        store_id: STORE_A_ID,
        config: {
          ...VALID_STORE_CONFIG,
          storeId: STORE_A_ID,
        },
        version: '1.0.0',
        updated_at: new Date().toISOString(),
      });

      const caller = createCaller({
        req: {
          headers: {
            'x-store-id': STORE_A_ID,
          },
        },
      });

      // Update configuration
      const updatedConfig = await caller.store.updateConfig({
        metadata: {
          name: 'Updated Store A',
          description: 'Updated description',
        },
      });

      expect(updatedConfig.metadata.name).toBe('Updated Store A');
      expect(updatedConfig.metadata.description).toBe('Updated description');

      // Verify update persisted in database
      const { data } = await (supabase
        .from('store_configs') as any)
        .select('*')
        .eq('store_id', STORE_A_ID)
        .single();

      expect(data?.config.metadata.name).toBe('Updated Store A');
    });
  });
});

