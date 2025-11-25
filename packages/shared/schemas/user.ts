/**
 * User Schema Definitions
 * 
 * Schemas for user management within tenant contexts.
 * All user operations must be scoped to a specific store/tenant.
 */

import { z } from 'zod';

// ============================================================================
// USER IDENTIFICATION
// ============================================================================

/**
 * Base user schema with tenant isolation
 */
export const UserSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  dateOfBirth: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * User creation schema
 */
export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * User update schema
 */
export const UpdateUserSchema = UserSchema.partial({
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  dateOfBirth: true,
}).required({
  storeId: true,
});

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================

/**
 * User role enumeration within a tenant
 */
export const UserRoleSchema = z.enum([
  'owner',
  'admin', 
  'editor',
  'viewer',
  'customer',
]);

/**
 * Permission enumeration
 */
export const PermissionSchema = z.enum([
  'read_products',
  'write_products',
  'delete_products',
  'read_orders',
  'write_orders',
  'delete_orders',
  'read_customers',
  'write_customers',
  'delete_customers',
  'read_analytics',
  'write_settings',
  'manage_users',
  'manage_billing',
]);

/**
 * User role configuration with permissions
 */
export const RoleConfigSchema = z.object({
  role: UserRoleSchema,
  permissions: z.array(PermissionSchema),
  description: z.string().optional(),
});

/**
 * User with role information
 */
export const UserWithRoleSchema = UserSchema.extend({
  role: UserRoleSchema,
  permissions: z.array(PermissionSchema),
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().datetime().optional(),
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * User authentication schema
 */
export const UserAuthSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * User login schema
 */
export const UserLoginSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

/**
 * Password reset schema
 */
export const PasswordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
  storeId: z.string().uuid('Invalid store ID format'),
});

/**
 * Password update schema
 */
export const PasswordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * User notification preferences
 */
export const NotificationPreferencesSchema = z.object({
  email: z.object({
    orders: z.boolean().default(true),
    marketing: z.boolean().default(false),
    security: z.boolean().default(true),
    updates: z.boolean().default(false),
  }).default({}),
  push: z.object({
    orders: z.boolean().default(true),
    marketing: z.boolean().default(false),
    security: z.boolean().default(true),
  }).default({}),
  sms: z.object({
    orders: z.boolean().default(false),
    security: z.boolean().default(true),
  }).default({}),
});

/**
 * User display preferences
 */
export const DisplayPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en-US'),
  currency: z.string().default('USD'),
  timezone: z.string().default('UTC'),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
});

/**
 * Complete user preferences
 */
export const UserPreferencesSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  notifications: NotificationPreferencesSchema,
  display: DisplayPreferencesSchema,
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).default('private'),
    dataSharing: z.boolean().default(false),
    analyticsOptIn: z.boolean().default(true),
  }).default({}),
});

// ============================================================================
// USER QUERIES & FILTERING
// ============================================================================

/**
 * User query schema for filtering and searching
 */
export const UserQuerySchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  lastLoginAfter: z.string().datetime().optional(),
  lastLoginBefore: z.string().datetime().optional(),
});

/**
 * User sorting options
 */
export const UserSortSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'lastLoginAt', 'firstName', 'lastName', 'email']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// USER ADDRESSES
// ============================================================================

/**
 * Address schema for user shipping/billing addresses
 */
export const AddressSchema = z.object({
  id: z.string().uuid('Invalid address ID format'),
  storeId: z.string().uuid('Invalid store ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  type: z.enum(['shipping', 'billing', 'both']),
  isDefault: z.boolean().default(false),
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
 * Create address schema
 */
export const CreateAddressSchema = AddressSchema.omit({
  id: true,
});

/**
 * Update address schema
 */
export const UpdateAddressSchema = AddressSchema.partial().required({
  storeId: true,
  userId: true,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type RoleConfig = z.infer<typeof RoleConfigSchema>;
export type UserWithRole = z.infer<typeof UserWithRoleSchema>;
export type UserAuth = z.infer<typeof UserAuthSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type PasswordReset = z.infer<typeof PasswordResetSchema>;
export type PasswordUpdate = z.infer<typeof PasswordUpdateSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type DisplayPreferences = z.infer<typeof DisplayPreferencesSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserSort = z.infer<typeof UserSortSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type CreateAddress = z.infer<typeof CreateAddressSchema>;
export type UpdateAddress = z.infer<typeof UpdateAddressSchema>;
