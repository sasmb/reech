/**
 * Test Data Helpers for Store Router Tests
 * 
 * Provides factory functions to generate valid test data that conforms to
 * the StoreConfigSchema.
 */

import type { CreateStoreConfig } from '@/packages/shared/schemas/store-config';

/**
 * Generate a valid store configuration for testing
 * 
 * This function creates a complete, valid store configuration that passes
 * all Zod schema validations. Use this as the base for your tests.
 * 
 * @param overrides - Partial config to override defaults
 * @returns Complete valid store configuration
 */
export function createValidStoreConfig(
  overrides?: Partial<CreateStoreConfig>
): CreateStoreConfig {
  const defaultConfig: CreateStoreConfig = {
    version: '1.0.0',
    theme: {
      colors: {
        primary: '#FF5733',
        secondary: '#33FF57',
        accent: '#3357FF',
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textSecondary: '#666666',
        border: '#CCCCCC',
        error: '#FF0000',
        warning: '#FFA500',
        success: '#00FF00',
        info: '#0000FF',
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
      header: {
        components: [],
        height: '4rem',
        fixed: true,
        transparent: false,
      },
      footer: {
        components: [],
        height: 'auto',
        borderTop: true,
      },
      sidebar: {
        components: [],
        width: '16rem',
        position: 'left',
        collapsible: true,
        defaultCollapsed: false,
      },
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
      heroBanner: true,
      promotions: true,
      newsletter: false,
      chatSupport: true,
      searchBar: true,
      wishlist: false,
      compareProducts: false,
      productReviews: true,
      socialSharing: true,
      multiCurrency: false,
    },
    integrations: {},
    metadata: {
      name: 'Test Store',
      description: 'A test store configuration',
      keywords: ['test', 'store'],
      locale: 'en-US',
      currency: 'USD',
      timezone: 'UTC',
    },
  };

  return {
    ...defaultConfig,
    ...overrides,
  };
}

/**
 * Generate minimal valid store configuration
 * Uses all default values where possible
 */
export function createMinimalStoreConfig(): CreateStoreConfig {
  return createValidStoreConfig({
    metadata: {
      name: 'Minimal Store',
      keywords: [],
      locale: 'en-US',
      currency: 'USD',
      timezone: 'UTC',
    },
  });
}

/**
 * Generate store configuration with custom name
 */
export function createStoreConfigWithName(name: string): CreateStoreConfig {
  return createValidStoreConfig({
    metadata: {
      name,
      keywords: [],
      locale: 'en-US',
      currency: 'USD',
      timezone: 'UTC',
    },
  });
}

