/**
 * Product Schema Definitions
 * 
 * Schemas for product management within tenant contexts.
 * All product operations must be scoped to a specific store/tenant.
 */

import { z } from 'zod';

// ============================================================================
// PRODUCT IDENTIFICATION
// ============================================================================

/**
 * Base product schema with tenant isolation
 */
export const ProductSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  shortDescription: z.string().max(500, 'Short description too long').optional(),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).default('draft'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Product creation schema
 */
export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Product update schema
 */
export const UpdateProductSchema = ProductSchema.partial({
  sku: true,
  name: true,
  description: true,
  shortDescription: true,
  slug: true,
  status: true,
}).required({
  storeId: true,
});

// ============================================================================
// PRODUCT PRICING
// ============================================================================

/**
 * Product pricing schema
 */
export const ProductPricingSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive('Compare at price must be positive').optional(),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  taxIncluded: z.boolean().default(false),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1').optional(),
  discounts: z.array(z.object({
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    minQuantity: z.number().int().positive().optional(),
    maxQuantity: z.number().int().positive().optional(),
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().optional(),
  })).default([]),
});

/**
 * Product variant pricing
 */
export const VariantPricingSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  variantId: z.string().uuid('Invalid variant ID format'),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive('Compare at price must be positive').optional(),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
});

// ============================================================================
// PRODUCT INVENTORY
// ============================================================================

/**
 * Inventory tracking schema
 */
export const InventorySchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  reserved: z.number().int().min(0, 'Reserved quantity cannot be negative').default(0),
  available: z.number().int().min(0, 'Available quantity cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(0, 'Low stock threshold cannot be negative').default(10),
  trackQuantity: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  location: z.string().optional(),
  lastRestocked: z.string().datetime().optional(),
});

/**
 * Inventory adjustment schema
 */
export const InventoryAdjustmentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  adjustment: z.number().int(),
  reason: z.enum(['restock', 'sale', 'return', 'damage', 'theft', 'adjustment']),
  notes: z.string().max(500, 'Notes too long').optional(),
  userId: z.string().uuid('Invalid user ID format').optional(),
});

// ============================================================================
// PRODUCT VARIANTS
// ============================================================================

/**
 * Product variant schema
 */
export const ProductVariantSchema = z.object({
  id: z.string().uuid('Invalid variant ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  title: z.string().min(1, 'Variant title is required').max(100, 'Title too long'),
  position: z.number().int().min(1, 'Position must be positive').default(1),
  option1: z.string().optional(),
  option2: z.string().optional(),
  option3: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive('Compare at price must be positive').optional(),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  weight: z.number().positive('Weight must be positive').optional(),
  weightUnit: z.enum(['g', 'kg', 'oz', 'lb']).default('kg'),
  requiresShipping: z.boolean().default(true),
  taxable: z.boolean().default(true),
  inventoryQuantity: z.number().int().min(0, 'Inventory quantity cannot be negative').default(0),
  inventoryManagement: z.enum(['shopify', 'not_managed']).default('shopify'),
  fulfillmentService: z.string().optional(),
  inventoryPolicy: z.enum(['deny', 'continue']).default('deny'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Create product variant schema
 */
export const CreateProductVariantSchema = ProductVariantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// PRODUCT OPTIONS
// ============================================================================

/**
 * Product option schema
 */
export const ProductOptionSchema = z.object({
  id: z.string().uuid('Invalid option ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  name: z.string().min(1, 'Option name is required').max(50, 'Option name too long'),
  position: z.number().int().min(1, 'Position must be positive').default(1),
  values: z.array(z.string().min(1, 'Option value cannot be empty')).min(1, 'At least one option value is required'),
});

/**
 * Create product option schema
 */
export const CreateProductOptionSchema = ProductOptionSchema.omit({
  id: true,
});

// ============================================================================
// PRODUCT IMAGES
// ============================================================================

/**
 * Product image schema
 */
export const ProductImageSchema = z.object({
  id: z.string().uuid('Invalid image ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  variantId: z.string().uuid('Invalid variant ID format').optional(),
  src: z.string().url('Invalid image URL'),
  alt: z.string().max(200, 'Alt text too long').optional(),
  position: z.number().int().min(1, 'Position must be positive').default(1),
  width: z.number().int().positive('Width must be positive').optional(),
  height: z.number().int().positive('Height must be positive').optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

/**
 * Create product image schema
 */
export const CreateProductImageSchema = ProductImageSchema.omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// PRODUCT CATEGORIES
// ============================================================================

/**
 * Product category schema
 */
export const ProductCategorySchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000, 'Description too long').optional(),
  parentId: z.string().uuid('Invalid parent category ID format').optional(),
  position: z.number().int().min(1, 'Position must be positive').default(1),
  isActive: z.boolean().default(true),
  image: z.string().url('Invalid image URL').optional(),
  metaTitle: z.string().max(60, 'Meta title too long').optional(),
  metaDescription: z.string().max(160, 'Meta description too long').optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Product category assignment
 */
export const ProductCategoryAssignmentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  categoryId: z.string().uuid('Invalid category ID format'),
  isPrimary: z.boolean().default(false),
});

// ============================================================================
// PRODUCT QUERIES & FILTERING
// ============================================================================

/**
 * Product query schema for filtering and searching
 */
export const ProductQuerySchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  search: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  priceMin: z.number().positive('Minimum price must be positive').optional(),
  priceMax: z.number().positive('Maximum price must be positive').optional(),
  inStock: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
});

/**
 * Product sorting options
 */
export const ProductSortSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'name', 'price', 'sku', 'position']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// PRODUCT TAGS
// ============================================================================

/**
 * Product tag schema
 */
export const ProductTagSchema = z.object({
  id: z.string().uuid('Invalid tag ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  description: z.string().max(200, 'Description too long').optional(),
  productCount: z.number().int().min(0, 'Product count cannot be negative').default(0),
  createdAt: z.string().datetime(),
});

/**
 * Product tag assignment
 */
export const ProductTagAssignmentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  tagId: z.string().uuid('Invalid tag ID format'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type ProductPricing = z.infer<typeof ProductPricingSchema>;
export type VariantPricing = z.infer<typeof VariantPricingSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type InventoryAdjustment = z.infer<typeof InventoryAdjustmentSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type CreateProductVariant = z.infer<typeof CreateProductVariantSchema>;
export type ProductOption = z.infer<typeof ProductOptionSchema>;
export type CreateProductOption = z.infer<typeof CreateProductOptionSchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type CreateProductImage = z.infer<typeof CreateProductImageSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductCategoryAssignment = z.infer<typeof ProductCategoryAssignmentSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
export type ProductSort = z.infer<typeof ProductSortSchema>;
export type ProductTag = z.infer<typeof ProductTagSchema>;
export type ProductTagAssignment = z.infer<typeof ProductTagAssignmentSchema>;
