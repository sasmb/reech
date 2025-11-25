/**
 * API Types
 * 
 * TypeScript type definitions for API-related structures.
 */

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

/**
 * Generic paginated API response
 */
export interface PaginatedApiResponse<T = unknown> {
  success: true;
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

/**
 * API request metadata
 */
export interface ApiRequestMeta {
  timestamp: string;
  requestId: string;
  userId?: string;
  storeId?: string;
  userAgent?: string;
  ipAddress?: string;
  version?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationError[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Multi-field sort parameters
 */
export type MultiSortParams = SortParams[];

// ============================================================================
// FILTERING TYPES
// ============================================================================

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: string;
  to?: string;
}

/**
 * Numeric range filter
 */
export interface NumericRangeFilter {
  min?: number;
  max?: number;
}

/**
 * Text search filter
 */
export interface TextSearchFilter {
  query: string;
  fields?: string[];
  caseSensitive?: boolean;
}

// ============================================================================
// TENANT CONTEXT TYPES
// ============================================================================

/**
 * Tenant context for API operations
 */
export interface TenantContext {
  storeId: string;
  tenantId: string;
  subdomain: string;
  userId?: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
}

/**
 * Tenant-scoped request
 */
export interface TenantScopedRequest<T = unknown> {
  context: TenantContext;
  data: T;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * Authentication context
 */
export interface AuthContext {
  userId: string;
  storeId: string;
  role: string;
  permissions: string[];
  isAuthenticated: boolean;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // user ID
  storeId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

/**
 * Middleware context
 */
export interface MiddlewareContext {
  req: Request;
  res: Response;
  next: () => void;
  user?: AuthContext;
  tenant?: TenantContext;
}

/**
 * Error handling middleware
 */
export interface ErrorHandler {
  (error: Error, req: Request, res: Response, next: () => void): void;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// ============================================================================
// CACHING TYPES
// ============================================================================

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // time to live in seconds
  key: string;
  tags?: string[];
}

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Webhook payload
 */
export interface WebhookPayload<T = unknown> {
  id: string;
  event: string;
  data: T;
  timestamp: string;
  version: string;
}

/**
 * Webhook signature verification
 */
export interface WebhookSignature {
  signature: string;
  timestamp: string;
  algorithm: string;
}

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

/**
 * File upload metadata
 */
export interface FileUploadMeta {
  name: string;
  size: number;
  type: string;
  url: string;
  alt?: string;
}

/**
 * Image file metadata
 */
export interface ImageFileMeta extends FileUploadMeta {
  width?: number;
  height?: number;
  format?: string;
}

// Types are already exported inline above
// No need for additional export block
