/**
 * Store Configuration Schema Definitions
 * 
 * Schemas for dynamic store configuration and UI assembly.
 * These schemas enable JSON-driven store customization and theming.
 */

import { z } from 'zod';

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

/**
 * Color palette configuration
 */
export const ColorPaletteSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color'),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Accent color must be a valid hex color'),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color'),
  surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Surface color must be a valid hex color'),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Text color must be a valid hex color'),
  textSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary text color must be a valid hex color'),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Border color must be a valid hex color'),
  error: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Error color must be a valid hex color'),
  warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Warning color must be a valid hex color'),
  success: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Success color must be a valid hex color'),
  info: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Info color must be a valid hex color'),
});

/**
 * Typography configuration
 */
export const TypographySchema = z.object({
  fontFamily: z.object({
    heading: z.string().min(1, 'Heading font family is required'),
    body: z.string().min(1, 'Body font family is required'),
    mono: z.string().min(1, 'Monospace font family is required'),
  }),
  fontSize: z.object({
    xs: z.string().default('0.75rem'),
    sm: z.string().default('0.875rem'),
    base: z.string().default('1rem'),
    lg: z.string().default('1.125rem'),
    xl: z.string().default('1.25rem'),
    '2xl': z.string().default('1.5rem'),
    '3xl': z.string().default('1.875rem'),
    '4xl': z.string().default('2.25rem'),
    '5xl': z.string().default('3rem'),
    '6xl': z.string().default('3.75rem'),
  }),
  fontWeight: z.object({
    light: z.string().default('300'),
    normal: z.string().default('400'),
    medium: z.string().default('500'),
    semibold: z.string().default('600'),
    bold: z.string().default('700'),
    extrabold: z.string().default('800'),
  }),
  lineHeight: z.object({
    tight: z.string().default('1.25'),
    snug: z.string().default('1.375'),
    normal: z.string().default('1.5'),
    relaxed: z.string().default('1.625'),
    loose: z.string().default('2'),
  }),
});

/**
 * Spacing configuration
 */
export const SpacingSchema = z.object({
  xs: z.string().default('0.25rem'),
  sm: z.string().default('0.5rem'),
  md: z.string().default('1rem'),
  lg: z.string().default('1.5rem'),
  xl: z.string().default('2rem'),
  '2xl': z.string().default('3rem'),
  '3xl': z.string().default('4rem'),
  '4xl': z.string().default('6rem'),
});

/**
 * Border radius configuration
 */
export const BorderRadiusSchema = z.object({
  none: z.string().default('0'),
  sm: z.string().default('0.125rem'),
  md: z.string().default('0.375rem'),
  lg: z.string().default('0.5rem'),
  xl: z.string().default('0.75rem'),
  '2xl': z.string().default('1rem'),
  '3xl': z.string().default('1.5rem'),
  full: z.string().default('9999px'),
});

/**
 * Complete theme configuration
 */
export const ThemeConfigSchema = z.object({
  colors: ColorPaletteSchema,
  typography: TypographySchema,
  spacing: SpacingSchema,
  borderRadius: BorderRadiusSchema,
  shadows: z.object({
    sm: z.string().default('0 1px 2px 0 rgb(0 0 0 / 0.05)'),
    md: z.string().default('0 4px 6px -1px rgb(0 0 0 / 0.1)'),
    lg: z.string().default('0 10px 15px -3px rgb(0 0 0 / 0.1)'),
    xl: z.string().default('0 20px 25px -5px rgb(0 0 0 / 0.1)'),
    '2xl': z.string().default('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
  }),
});

// ============================================================================
// LAYOUT CONFIGURATION
// ============================================================================

/**
 * Component configuration for layout elements
 * Using z.lazy for recursive type
 */
export const ComponentConfigSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string().min(1, 'Component ID is required'),
    type: z.string().min(1, 'Component type is required'),
    props: z.record(z.unknown()).default({}),
    children: z.array(ComponentConfigSchema).optional(),
    visibility: z.object({
      mobile: z.boolean().default(true),
      tablet: z.boolean().default(true),
      desktop: z.boolean().default(true),
    }).default({}),
    styling: z.record(z.unknown()).optional(),
  })
);

/**
 * Header configuration
 */
export const HeaderConfigSchema = z.object({
  components: z.array(ComponentConfigSchema).default([]),
  height: z.string().default('4rem'),
  fixed: z.boolean().default(true),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color').optional(),
  transparent: z.boolean().default(false),
});

/**
 * Footer configuration
 */
export const FooterConfigSchema = z.object({
  components: z.array(ComponentConfigSchema).default([]),
  height: z.string().default('auto'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color').optional(),
  borderTop: z.boolean().default(true),
});

/**
 * Sidebar configuration
 */
export const SidebarConfigSchema = z.object({
  components: z.array(ComponentConfigSchema).default([]),
  width: z.string().default('16rem'),
  position: z.enum(['left', 'right']).default('left'),
  collapsible: z.boolean().default(true),
  defaultCollapsed: z.boolean().default(false),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color').optional(),
});

/**
 * Main content area configuration
 */
export const ContentConfigSchema = z.object({
  components: z.array(ComponentConfigSchema).default([]),
  maxWidth: z.string().default('7xl'),
  padding: z.string().default('1rem'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color').optional(),
});

/**
 * Complete layout configuration
 */
export const LayoutConfigSchema = z.object({
  header: HeaderConfigSchema.optional(),
  footer: FooterConfigSchema.optional(),
  sidebar: SidebarConfigSchema.optional(),
  content: ContentConfigSchema,
  grid: z.object({
    columns: z.number().int().min(1).max(12).default(12),
    gap: z.string().default('1rem'),
    breakpoints: z.object({
      sm: z.string().default('640px'),
      md: z.string().default('768px'),
      lg: z.string().default('1024px'),
      xl: z.string().default('1280px'),
      '2xl': z.string().default('1536px'),
    }),
  }).default({
    columns: 12,
    gap: '1rem',
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',  
      '2xl': '1536px',
    },
  }),
});

// ============================================================================
// FEATURE CONFIGURATION
// ============================================================================

/**
 * Feature flag configuration
 */
export const FeatureFlagsSchema = z.object({
  checkout: z.boolean().default(true),
  inventory: z.boolean().default(true),
  analytics: z.boolean().default(false),
  multiLanguage: z.boolean().default(false),
  darkMode: z.boolean().default(false),
  socialLogin: z.boolean().default(false),
  wishlist: z.boolean().default(true),
  reviews: z.boolean().default(true),
  recommendations: z.boolean().default(false),
  liveChat: z.boolean().default(false),
});

/**
 * Integration configuration
 */
export const IntegrationConfigSchema = z.object({
  payment: z.object({
    stripe: z.boolean().default(false),
    paypal: z.boolean().default(false),
    applePay: z.boolean().default(false),
    googlePay: z.boolean().default(false),
  }).default({}),
  analytics: z.object({
    googleAnalytics: z.boolean().default(false),
    facebookPixel: z.boolean().default(false),
    hotjar: z.boolean().default(false),
  }).default({}),
  marketing: z.object({
    mailchimp: z.boolean().default(false),
    klaviyo: z.boolean().default(false),
    sendgrid: z.boolean().default(false),
  }).default({}),
});

// ============================================================================
// COMPLETE STORE CONFIGURATION
// ============================================================================

/**
 * Complete store configuration schema
 * This is the master schema that defines all aspects of a store's configuration
 */
export const StoreConfigSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  version: z.string().default('1.0.0'),
  theme: ThemeConfigSchema,
  layout: LayoutConfigSchema,
  features: FeatureFlagsSchema,
  integrations: IntegrationConfigSchema,
  metadata: z.object({
    name: z.string().min(1, 'Store name is required'),
    description: z.string().max(500, 'Description too long').optional(),
    logo: z.string().url('Invalid logo URL').optional(),
    favicon: z.string().url('Invalid favicon URL').optional(),
    keywords: z.array(z.string()).default([]),
    locale: z.string().default('en-US'),
    currency: z.string().default('USD'),
    timezone: z.string().default('UTC'),
  }),
  seo: z.object({
    title: z.string().max(60, 'SEO title too long').optional(),
    description: z.string().max(160, 'SEO description too long').optional(),
    keywords: z.array(z.string()).default([]),
    ogImage: z.string().url('Invalid Open Graph image URL').optional(),
    twitterCard: z.enum(['summary', 'summary_large_image']).default('summary'),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Store configuration creation schema
 */
export const CreateStoreConfigSchema = StoreConfigSchema.omit({
  storeId: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Store configuration update schema
 */
export const UpdateStoreConfigSchema = StoreConfigSchema.partial({
  theme: true,
  layout: true,
  features: true,
  integrations: true,
  metadata: true,
  seo: true,
}).required({
  storeId: true,
});

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Schema for validating configuration changes
 */
export const ConfigValidationSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  config: StoreConfigSchema,
  isValid: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string(),
  })).default([]),
  warnings: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string(),
  })).default([]),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export type Typography = z.infer<typeof TypographySchema>;
export type Spacing = z.infer<typeof SpacingSchema>;
export type BorderRadius = z.infer<typeof BorderRadiusSchema>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
export type ComponentConfig = z.infer<typeof ComponentConfigSchema>;
export type HeaderConfig = z.infer<typeof HeaderConfigSchema>;
export type FooterConfig = z.infer<typeof FooterConfigSchema>;
export type SidebarConfig = z.infer<typeof SidebarConfigSchema>;
export type ContentConfig = z.infer<typeof ContentConfigSchema>;
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
export type StoreConfig = z.infer<typeof StoreConfigSchema>;
export type CreateStoreConfig = z.infer<typeof CreateStoreConfigSchema>;
export type UpdateStoreConfig = z.infer<typeof UpdateStoreConfigSchema>;
export type ConfigValidation = z.infer<typeof ConfigValidationSchema>;
