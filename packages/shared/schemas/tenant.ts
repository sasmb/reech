/**
 * Tenant Schema Definitions
 * 
 * Core schemas for tenant identification and context enforcement.
 * These schemas ensure all operations are properly scoped to a tenant.
 */

import { z } from 'zod';

// ============================================================================
// TENANT IDENTIFICATION
// ============================================================================

/**
 * Base tenant schema with required identification fields
 */
export const TenantSchema = z.object({
  id: z.string().uuid('Invalid tenant ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be less than 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Subdomain cannot start or end with hyphen'),
  name: z.string().min(1, 'Tenant name is required').max(100, 'Tenant name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Tenant creation schema (without auto-generated fields)
 */
export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Tenant update schema (partial with required storeId)
 */
export const UpdateTenantSchema = TenantSchema.partial({
  name: true,
  slug: true,
}).required({
  storeId: true,
});

/**
 * Tenant query schema for filtering and searching
 */
export const TenantQuerySchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  createdAt: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
});

// ============================================================================
// TENANT STATUS & CONFIGURATION
// ============================================================================

/**
 * Tenant status enumeration
 */
export const TenantStatusSchema = z.enum([
  'active',
  'inactive', 
  'suspended',
  'pending_setup',
  'trial_expired',
]);

/**
 * Tenant subscription status
 */
export const SubscriptionStatusSchema = z.enum([
  'trial',
  'active',
  'past_due',
  'canceled',
  'unpaid',
]);

/**
 * Complete tenant profile with status information
 */
export const TenantProfileSchema = TenantSchema.extend({
  status: TenantStatusSchema,
  subscriptionStatus: SubscriptionStatusSchema,
  trialEndsAt: z.string().datetime().optional(),
  subscriptionEndsAt: z.string().datetime().optional(),
  plan: z.object({
    id: z.string(),
    name: z.string(),
    features: z.array(z.string()),
    limits: z.record(z.number()),
  }),
});

// ============================================================================
// TENANT CONTEXT FOR OPERATIONS
// ============================================================================

/**
 * Tenant context schema for API operations
 * This ensures all operations include proper tenant identification
 */
export const TenantContextSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
  subdomain: z.string().min(1, 'Subdomain is required'),
  userId: z.string().uuid('Invalid user ID format').optional(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']).optional(),
});

/**
 * Schema for validating tenant context in API requests
 */
export const TenantRequestSchema = z.object({
  context: TenantContextSchema,
  data: z.unknown(),
});

// ============================================================================
// TENANT DOMAIN & ROUTING
// ============================================================================

/**
 * Domain configuration for tenant
 */
export const TenantDomainSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  subdomain: z.string().min(1, 'Subdomain is required'),
  customDomain: z.string().url('Invalid custom domain URL').optional(),
  sslEnabled: z.boolean().default(true),
  verified: z.boolean().default(false),
  verificationToken: z.string().optional(),
});

/**
 * Subdomain validation schema
 */
export const SubdomainValidationSchema = z.object({
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be less than 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Subdomain cannot start or end with hyphen'),
  available: z.boolean(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Tenant = z.infer<typeof TenantSchema>;
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;
export type TenantQuery = z.infer<typeof TenantQuerySchema>;
export type TenantStatus = z.infer<typeof TenantStatusSchema>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type TenantProfile = z.infer<typeof TenantProfileSchema>;
export type TenantContext = z.infer<typeof TenantContextSchema>;
export type TenantRequest = z.infer<typeof TenantRequestSchema>;
export type TenantDomain = z.infer<typeof TenantDomainSchema>;
export type SubdomainValidation = z.infer<typeof SubdomainValidationSchema>;
