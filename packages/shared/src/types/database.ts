/**
 * Database Types
 * 
 * TypeScript type definitions for database-related structures.
 */

// ============================================================================
// BASE DATABASE TYPES
// ============================================================================

/**
 * Base database entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant-scoped database entity
 */
export interface TenantScopedEntity extends BaseEntity {
  storeId: string;
}

/**
 * Soft deletable entity
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: string;
  isDeleted: boolean;
}

/**
 * Auditable entity with user tracking
 */
export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// TENANT DATABASE TYPES
// ============================================================================

/**
 * Tenant database entity
 */
export interface TenantEntity extends TenantScopedEntity {
  subdomain: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_setup' | 'trial_expired';
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

/**
 * Store configuration database entity
 */
export interface StoreConfigEntity extends TenantScopedEntity {
  version: string;
  theme: Record<string, unknown>;
  layout: Record<string, unknown>;
  features: Record<string, boolean>;
  integrations: Record<string, unknown>;
  metadata: Record<string, unknown>;
  seo?: Record<string, unknown>;
}

// ============================================================================
// USER DATABASE TYPES
// ============================================================================

/**
 * User database entity
 */
export interface UserEntity extends TenantScopedEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'customer';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
}

/**
 * User preferences database entity
 */
export interface UserPreferencesEntity extends TenantScopedEntity {
  userId: string;
  notifications: Record<string, unknown>;
  display: Record<string, unknown>;
  privacy: Record<string, unknown>;
}

/**
 * User address database entity
 */
export interface UserAddressEntity extends TenantScopedEntity {
  userId: string;
  type: 'shipping' | 'billing' | 'both';
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// ============================================================================
// PRODUCT DATABASE TYPES
// ============================================================================

/**
 * Product database entity
 */
export interface ProductEntity extends TenantScopedEntity {
  sku: string;
  name: string;
  description?: string;
  shortDescription?: string;
  slug: string;
  status: 'draft' | 'active' | 'inactive' | 'archived';
}

/**
 * Product variant database entity
 */
export interface ProductVariantEntity extends TenantScopedEntity {
  productId: string;
  sku: string;
  title: string;
  position: number;
  option1?: string;
  option2?: string;
  option3?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight?: number;
  weightUnit: 'g' | 'kg' | 'oz' | 'lb';
  requiresShipping: boolean;
  taxable: boolean;
  inventoryQuantity: number;
  inventoryManagement: 'shopify' | 'not_managed';
  fulfillmentService?: string;
  inventoryPolicy: 'deny' | 'continue';
}

/**
 * Product option database entity
 */
export interface ProductOptionEntity extends TenantScopedEntity {
  productId: string;
  name: string;
  position: number;
  values: string[];
}

/**
 * Product image database entity
 */
export interface ProductImageEntity extends TenantScopedEntity {
  productId: string;
  variantId?: string;
  src: string;
  alt?: string;
  position: number;
  width?: number;
  height?: number;
  isDefault: boolean;
}

/**
 * Product category database entity
 */
export interface ProductCategoryEntity extends TenantScopedEntity {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  position: number;
  isActive: boolean;
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Product tag database entity
 */
export interface ProductTagEntity extends TenantScopedEntity {
  name: string;
  slug: string;
  color?: string;
  description?: string;
  productCount: number;
}

/**
 * Inventory database entity
 */
export interface InventoryEntity extends TenantScopedEntity {
  productId: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  trackQuantity: boolean;
  allowBackorder: boolean;
  sku?: string;
  barcode?: string;
  location?: string;
  lastRestocked?: string;
}

// ============================================================================
// ORDER DATABASE TYPES
// ============================================================================

/**
 * Order database entity
 */
export interface OrderEntity extends TenantScopedEntity {
  orderNumber: string;
  customerId?: string;
  email: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  financialStatus: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded' | 'voided';
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked';
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  weight?: number;
  weightUnit: 'g' | 'kg' | 'oz' | 'lb';
  note?: string;
  tags: string[];
}

/**
 * Order line item database entity
 */
export interface OrderLineItemEntity extends TenantScopedEntity {
  orderId: string;
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  total: number;
  tax: number;
  discount: number;
  weight?: number;
  requiresShipping: boolean;
  taxable: boolean;
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked';
  properties: Array<{ name: string; value?: string }>;
}

/**
 * Order address database entity
 */
export interface OrderAddressEntity extends TenantScopedEntity {
  orderId: string;
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

/**
 * Order fulfillment database entity
 */
export interface OrderFulfillmentEntity extends TenantScopedEntity {
  orderId: string;
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'error';
  trackingCompany?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  locationId?: string;
  service?: string;
  note?: string;
}

/**
 * Order transaction database entity
 */
export interface OrderTransactionEntity extends TenantScopedEntity {
  orderId: string;
  kind: 'sale' | 'capture' | 'authorization' | 'refund' | 'void';
  status: 'pending' | 'success' | 'failure' | 'error' | 'cancelled';
  amount: number;
  currency: string;
  gateway: string;
  gatewayId?: string;
  authorization?: string;
  parentId?: string;
  message?: string;
}

// ============================================================================
// DATABASE QUERY TYPES
// ============================================================================

/**
 * Database query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  select?: string[];
  include?: string[];
}

/**
 * Database filter options
 */
export interface FilterOptions {
  where?: Record<string, unknown>;
  or?: Record<string, unknown>[];
  in?: Record<string, unknown[]>;
  not?: Record<string, unknown>;
  isNull?: string[];
  isNotNull?: string[];
  between?: Record<string, { from: unknown; to: unknown }>;
  like?: Record<string, string>;
  ilike?: Record<string, string>;
}

/**
 * Database transaction options
 */
export interface TransactionOptions {
  isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  timeout?: number;
}

/**
 * Database migration options
 */
export interface MigrationOptions {
  version: string;
  description: string;
  up: string;
  down: string;
  timestamp: string;
}

// ============================================================================
// DATABASE RELATIONSHIP TYPES
// ============================================================================

/**
 * One-to-one relationship
 */
export interface OneToOneRelation<T> {
  connect?: { id: string };
  disconnect?: boolean;
  create?: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  update?: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
  upsert?: {
    where: { id: string };
    create: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
    update: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
  };
}

/**
 * One-to-many relationship
 */
export interface OneToManyRelation<T> {
  connect?: { id: string }[];
  disconnect?: { id: string }[];
  set?: { id: string }[];
  create?: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[];
  update?: Array<{
    where: { id: string };
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
  }>;
  delete?: { id: string }[];
  deleteMany?: Record<string, unknown>;
}

/**
 * Many-to-many relationship
 */
export interface ManyToManyRelation {
  connect?: { id: string }[];
  disconnect?: { id: string }[];
  set?: { id: string }[];
}

// ============================================================================
// DATABASE INDEX TYPES
// ============================================================================

/**
 * Database index configuration
 */
export interface DatabaseIndex {
  name: string;
  columns: string[];
  unique?: boolean;
  partial?: string;
  where?: string;
}

/**
 * Database constraint configuration
 */
export interface DatabaseConstraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null';
  columns: string[];
  references?: {
    table: string;
    columns: string[];
  };
  onDelete?: 'cascade' | 'set_null' | 'restrict';
  onUpdate?: 'cascade' | 'set_null' | 'restrict';
}

// Types are already exported inline above
// No need for additional export block
