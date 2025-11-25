/**
 * Order Schema Definitions
 * 
 * Schemas for order management within tenant contexts.
 * All order operations must be scoped to a specific store/tenant.
 */

import { z } from 'zod';

// ============================================================================
// ORDER IDENTIFICATION
// ============================================================================

/**
 * Base order schema with tenant isolation
 */
export const OrderSchema = z.object({
  id: z.string().uuid('Invalid order ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderNumber: z.string().min(1, 'Order number is required').max(50, 'Order number too long'),
  customerId: z.string().uuid('Invalid customer ID format').optional(),
  email: z.string().email('Invalid email format'),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).default('pending'),
  financialStatus: z.enum(['pending', 'paid', 'partially_paid', 'refunded', 'partially_refunded', 'voided']).default('pending'),
  fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled', 'restocked']).default('unfulfilled'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
  tax: z.number().min(0, 'Tax cannot be negative').default(0),
  shipping: z.number().min(0, 'Shipping cannot be negative').default(0),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  total: z.number().min(0, 'Total cannot be negative'),
  weight: z.number().positive('Weight must be positive').optional(),
  weightUnit: z.enum(['g', 'kg', 'oz', 'lb']).default('kg'),
  note: z.string().max(2000, 'Note too long').optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Order creation schema
 */
export const CreateOrderSchema = OrderSchema.omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Order update schema
 */
export const UpdateOrderSchema = OrderSchema.partial({
  status: true,
  financialStatus: true,
  fulfillmentStatus: true,
  note: true,
  tags: true,
}).required({
  storeId: true,
});

// ============================================================================
// ORDER LINE ITEMS
// ============================================================================

/**
 * Order line item schema
 */
export const OrderLineItemSchema = z.object({
  id: z.string().uuid('Invalid line item ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderId: z.string().uuid('Invalid order ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  variantId: z.string().uuid('Invalid variant ID format').optional(),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  title: z.string().min(1, 'Product title is required').max(200, 'Title too long'),
  variantTitle: z.string().max(100, 'Variant title too long').optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  total: z.number().positive('Total must be positive'),
  tax: z.number().min(0, 'Tax cannot be negative').default(0),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  weight: z.number().positive('Weight must be positive').optional(),
  requiresShipping: z.boolean().default(true),
  taxable: z.boolean().default(true),
  fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled', 'restocked']).default('unfulfilled'),
  properties: z.array(z.object({
    name: z.string().min(1, 'Property name is required'),
    value: z.string().optional(),
  })).default([]),
});

/**
 * Create order line item schema
 */
export const CreateOrderLineItemSchema = OrderLineItemSchema.omit({
  id: true,
});

// ============================================================================
// ORDER ADDRESSES
// ============================================================================

/**
 * Order address schema
 */
export const OrderAddressSchema = z.object({
  id: z.string().uuid('Invalid address ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderId: z.string().uuid('Invalid order ID format'),
  type: z.enum(['shipping', 'billing']),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  address1: z.string().min(1, 'Address line 1 is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(2, 'Country code is required').max(2),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
});

/**
 * Create order address schema
 */
export const CreateOrderAddressSchema = OrderAddressSchema.omit({
  id: true,
});

// ============================================================================
// ORDER FULFILLMENTS
// ============================================================================

/**
 * Order fulfillment schema
 */
export const OrderFulfillmentSchema = z.object({
  id: z.string().uuid('Invalid fulfillment ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderId: z.string().uuid('Invalid order ID format'),
  status: z.enum(['pending', 'open', 'success', 'cancelled', 'error']).default('pending'),
  trackingCompany: z.string().max(100, 'Tracking company name too long').optional(),
  trackingNumber: z.string().max(100, 'Tracking number too long').optional(),
  trackingUrl: z.string().url('Invalid tracking URL').optional(),
  locationId: z.string().uuid('Invalid location ID format').optional(),
  service: z.string().max(100, 'Service name too long').optional(),
  note: z.string().max(500, 'Note too long').optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Create order fulfillment schema
 */
export const CreateOrderFulfillmentSchema = OrderFulfillmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Fulfillment line item schema
 */
export const FulfillmentLineItemSchema = z.object({
  id: z.string().uuid('Invalid fulfillment line item ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  fulfillmentId: z.string().uuid('Invalid fulfillment ID format'),
  lineItemId: z.string().uuid('Invalid line item ID format'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

// ============================================================================
// ORDER TRANSACTIONS
// ============================================================================

/**
 * Order transaction schema
 */
export const OrderTransactionSchema = z.object({
  id: z.string().uuid('Invalid transaction ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderId: z.string().uuid('Invalid order ID format'),
  kind: z.enum(['sale', 'capture', 'authorization', 'refund', 'void']),
  status: z.enum(['pending', 'success', 'failure', 'error', 'cancelled']),
  amount: z.number(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  gateway: z.string().min(1, 'Payment gateway is required'),
  gatewayId: z.string().optional(),
  authorization: z.string().optional(),
  parentId: z.string().uuid('Invalid parent transaction ID format').optional(),
  message: z.string().max(500, 'Message too long').optional(),
  createdAt: z.string().datetime(),
});

/**
 * Create order transaction schema
 */
export const CreateOrderTransactionSchema = OrderTransactionSchema.omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// ORDER REFUNDS
// ============================================================================

/**
 * Order refund schema
 */
export const OrderRefundSchema = z.object({
  id: z.string().uuid('Invalid refund ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderId: z.string().uuid('Invalid order ID format'),
  amount: z.number().positive('Refund amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  reason: z.enum(['customer_request', 'defective', 'wrong_item', 'damaged', 'other']),
  note: z.string().max(500, 'Note too long').optional(),
  status: z.enum(['pending', 'success', 'failure', 'cancelled']).default('pending'),
  processedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

/**
 * Create order refund schema
 */
export const CreateOrderRefundSchema = OrderRefundSchema.omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// ORDER DISCOUNTS
// ============================================================================

/**
 * Order discount schema
 */
export const OrderDiscountSchema = z.object({
  id: z.string().uuid('Invalid discount ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  orderId: z.string().uuid('Invalid order ID format'),
  type: z.enum(['fixed_amount', 'percentage']),
  value: z.number().positive('Discount value must be positive'),
  title: z.string().min(1, 'Discount title is required').max(100, 'Title too long'),
  code: z.string().max(50, 'Discount code too long').optional(),
  amount: z.number().positive('Discount amount must be positive'),
  createdAt: z.string().datetime(),
});

/**
 * Create order discount schema
 */
export const CreateOrderDiscountSchema = OrderDiscountSchema.omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// ORDER QUERIES & FILTERING
// ============================================================================

/**
 * Order query schema for filtering and searching
 */
export const OrderQuerySchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  search: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  financialStatus: z.enum(['pending', 'paid', 'partially_paid', 'refunded', 'partially_refunded', 'voided']).optional(),
  fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled', 'restocked']).optional(),
  customerId: z.string().uuid('Invalid customer ID format').optional(),
  email: z.string().email('Invalid email format').optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  totalMin: z.number().positive('Minimum total must be positive').optional(),
  totalMax: z.number().positive('Maximum total must be positive').optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Order sorting options
 */
export const OrderSortSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'orderNumber', 'total', 'status']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// ORDER STATISTICS
// ============================================================================

/**
 * Order statistics schema
 */
export const OrderStatsSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  totalOrders: z.number().int().min(0, 'Total orders cannot be negative'),
  totalRevenue: z.number().min(0, 'Total revenue cannot be negative'),
  averageOrderValue: z.number().min(0, 'Average order value cannot be negative'),
  conversionRate: z.number().min(0).max(1, 'Conversion rate must be between 0 and 1'),
  topProducts: z.array(z.object({
    productId: z.string().uuid('Invalid product ID format'),
    title: z.string(),
    quantity: z.number().int().positive('Quantity must be positive'),
    revenue: z.number().positive('Revenue must be positive'),
  })),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Order = z.infer<typeof OrderSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;
export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;
export type CreateOrderLineItem = z.infer<typeof CreateOrderLineItemSchema>;
export type OrderAddress = z.infer<typeof OrderAddressSchema>;
export type CreateOrderAddress = z.infer<typeof CreateOrderAddressSchema>;
export type OrderFulfillment = z.infer<typeof OrderFulfillmentSchema>;
export type CreateOrderFulfillment = z.infer<typeof CreateOrderFulfillmentSchema>;
export type FulfillmentLineItem = z.infer<typeof FulfillmentLineItemSchema>;
export type OrderTransaction = z.infer<typeof OrderTransactionSchema>;
export type CreateOrderTransaction = z.infer<typeof CreateOrderTransactionSchema>;
export type OrderRefund = z.infer<typeof OrderRefundSchema>;
export type CreateOrderRefund = z.infer<typeof CreateOrderRefundSchema>;
export type OrderDiscount = z.infer<typeof OrderDiscountSchema>;
export type CreateOrderDiscount = z.infer<typeof CreateOrderDiscountSchema>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;
export type OrderSort = z.infer<typeof OrderSortSchema>;
export type OrderStats = z.infer<typeof OrderStatsSchema>;
