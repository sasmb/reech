/**
 * Constants
 * 
 * Common constants and configuration values for the Reech SaaS application.
 */

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

/**
 * Application metadata
 */
export const APP_CONFIG = {
  name: 'Reech SaaS',
  version: '1.0.0',
  description: 'Multi-tenant SaaS platform for dynamic storefronts',
  author: 'Reech Development Team',
  license: 'MIT',
} as const;

/**
 * Supported locales
 */
export const SUPPORTED_LOCALES = [
  'en-US',
  'en-GB',
  'es-ES',
  'fr-FR',
  'de-DE',
  'it-IT',
  'pt-BR',
  'ja-JP',
  'ko-KR',
  'zh-CN',
] as const;

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'INR',
  'BRL',
  'MXN',
] as const;

/**
 * Supported timezones
 */
export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
] as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * String length limits
 */
export const STRING_LIMITS = {
  MIN_SUBDOMAIN_LENGTH: 3,
  MAX_SUBDOMAIN_LENGTH: 63,
  MIN_SLUG_LENGTH: 1,
  MAX_SLUG_LENGTH: 100,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 0,
  MAX_DESCRIPTION_LENGTH: 5000,
  MIN_SHORT_DESCRIPTION_LENGTH: 0,
  MAX_SHORT_DESCRIPTION_LENGTH: 500,
  MIN_SKU_LENGTH: 1,
  MAX_SKU_LENGTH: 100,
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 200,
  MAX_ALT_TEXT_LENGTH: 200,
  MAX_META_TITLE_LENGTH: 60,
  MAX_META_DESCRIPTION_LENGTH: 160,
  MAX_NOTE_LENGTH: 2000,
  MAX_TAG_LENGTH: 50,
  MAX_KEYWORD_LENGTH: 50,
} as const;

/**
 * Numeric limits
 */
export const NUMERIC_LIMITS = {
  MIN_PRICE: 0,
  MAX_PRICE: 1000000,
  MIN_QUANTITY: 0,
  MAX_QUANTITY: 10000,
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 1000,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_TAX_RATE: 0,
  MAX_TAX_RATE: 1,
  MIN_DISCOUNT: 0,
  MAX_DISCOUNT: 100,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MIN_RATING: 1,
  MAX_RATING: 5,
} as const;

/**
 * File size limits
 */
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_LOGO_SIZE: 2 * 1024 * 1024, // 2MB
  SUPPORTED_IMAGE_FORMATS: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg'],
  SUPPORTED_DOCUMENT_FORMATS: ['pdf', 'doc', 'docx', 'txt', 'csv'],
} as const;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_SORT_DIRECTION: 'desc' as const,
  DEFAULT_SORT_FIELD: 'createdAt',
} as const;

/**
 * Common sort fields
 */
export const SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  NAME: 'name',
  TITLE: 'title',
  PRICE: 'price',
  STATUS: 'status',
  POSITION: 'position',
  ORDER_NUMBER: 'orderNumber',
  TOTAL: 'total',
  SKU: 'sku',
  EMAIL: 'email',
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
} as const;

// ============================================================================
// STATUS CONSTANTS
// ============================================================================

/**
 * Common status values
 */
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

/**
 * Order status values
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

/**
 * Financial status values
 */
export const FINANCIAL_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  VOIDED: 'voided',
} as const;

/**
 * Fulfillment status values
 */
export const FULFILLMENT_STATUS = {
  UNFULFILLED: 'unfulfilled',
  PARTIAL: 'partial',
  FULFILLED: 'fulfilled',
  RESTOCKED: 'restocked',
} as const;

/**
 * User role values
 */
export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  CUSTOMER: 'customer',
} as const;

/**
 * Tenant status values
 */
export const TENANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_SETUP: 'pending_setup',
  TRIAL_EXPIRED: 'trial_expired',
} as const;

/**
 * Subscription status values
 */
export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Common regex patterns for validation
 */
export const REGEX_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9-]+$/,
  SUBDOMAIN: /^[a-z0-9-]+$/,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
  CURRENCY_CODE: /^[A-Z]{3}$/,
  COUNTRY_CODE: /^[A-Z]{2}$/,
  LANGUAGE_CODE: /^[a-z]{2}(-[A-Z]{2})?$/,
  POSTAL_CODE_US: /^\d{5}(-\d{4})?$/,
  POSTAL_CODE_CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  CREDIT_CARD: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  SKU: /^[A-Z0-9-_]+$/i,
} as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * API response messages
 */
export const API_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists',
  RATE_LIMITED: 'Too many requests',
  INTERNAL_ERROR: 'Internal server error',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS = {
  CHECKOUT: true,
  INVENTORY: true,
  ANALYTICS: false,
  MULTI_LANGUAGE: false,
  DARK_MODE: false,
  SOCIAL_LOGIN: false,
  WISHLIST: true,
  REVIEWS: true,
  RECOMMENDATIONS: false,
  LIVE_CHAT: false,
  SUBSCRIPTIONS: false,
  MARKETPLACE: false,
  B2B_FEATURES: false,
} as const;

// ============================================================================
// THEME CONSTANTS
// ============================================================================

/**
 * Default theme colors
 */
export const DEFAULT_THEME_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#64748b',
  ACCENT: '#f59e0b',
  BACKGROUND: '#ffffff',
  SURFACE: '#f8fafc',
  TEXT: '#1e293b',
  TEXT_SECONDARY: '#64748b',
  BORDER: '#e2e8f0',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  SUCCESS: '#10b981',
  INFO: '#3b82f6',
} as const;

/**
 * Default typography settings
 */
export const DEFAULT_TYPOGRAPHY = {
  FONT_FAMILY_HEADING: 'Inter',
  FONT_FAMILY_BODY: 'Inter',
  FONT_FAMILY_MONO: 'JetBrains Mono',
  FONT_SIZE_BASE: '1rem',
  LINE_HEIGHT_BASE: '1.5',
} as const;

// ============================================================================
// EXPORT ALL CONSTANTS
// ============================================================================

export const constants = {
  APP_CONFIG,
  SUPPORTED_LOCALES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TIMEZONES,
  STRING_LIMITS,
  NUMERIC_LIMITS,
  FILE_LIMITS,
  PAGINATION,
  SORT_FIELDS,
  STATUS,
  ORDER_STATUS,
  FINANCIAL_STATUS,
  FULFILLMENT_STATUS,
  USER_ROLES,
  TENANT_STATUS,
  SUBSCRIPTION_STATUS,
  REGEX_PATTERNS,
  HTTP_STATUS,
  ERROR_CODES,
  API_MESSAGES,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_THEME_COLORS,
  DEFAULT_TYPOGRAPHY,
} as const;
