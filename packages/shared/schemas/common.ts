/**
 * Common Schema Definitions
 * 
 * Shared schemas and utilities used across multiple domains.
 * These schemas provide common patterns and validation rules.
 */

import { z } from 'zod';

// ============================================================================
// COMMON IDENTIFIERS
// ============================================================================

/**
 * Generic ID schema for UUID validation
 */
export const IdSchema = z.string().uuid('Invalid ID format');

/**
 * Generic store ID schema with tenant isolation
 */
export const StoreIdSchema = z.string().uuid('Invalid store ID format');

/**
 * Generic user ID schema
 */
export const UserIdSchema = z.string().uuid('Invalid user ID format');

/**
 * Generic email schema
 */
export const EmailSchema = z.string().email('Invalid email format');

/**
 * Generic phone number schema
 */
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * Generic URL schema
 */
export const UrlSchema = z.string().url('Invalid URL format');

/**
 * Generic slug schema
 */
export const SlugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug too long')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

// ============================================================================
// COMMON ENUMS
// ============================================================================

/**
 * Common status enumeration
 */
export const StatusSchema = z.enum(['active', 'inactive', 'pending', 'suspended']);

/**
 * Common currency enumeration
 */
export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR']);

/**
 * Common country codes (ISO 3166-1 alpha-2)
 */
export const CountryCodeSchema = z.string().length(2, 'Country code must be 2 characters');

/**
 * Common language codes (ISO 639-1)
 */
export const LanguageCodeSchema = z.string().length(2, 'Language code must be 2 characters');

/**
 * Common timezone enumeration
 */
export const TimezoneSchema = z.enum([
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
]);

// ============================================================================
// COMMON DATE/TIME SCHEMAS
// ============================================================================

/**
 * ISO 8601 datetime schema
 */
export const DateTimeSchema = z.string().datetime('Invalid datetime format');

/**
 * ISO 8601 date schema (YYYY-MM-DD)
 */
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

/**
 * Time schema (HH:MM:SS)
 */
export const TimeSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format (HH:MM:SS)');

/**
 * Timestamp schema (Unix timestamp in seconds)
 */
export const TimestampSchema = z.number().int().positive('Timestamp must be a positive integer');

// ============================================================================
// COMMON ADDRESS SCHEMAS
// ============================================================================

/**
 * Base address schema
 */
export const BaseAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  company: z.string().max(100, 'Company name too long').optional(),
  address1: z.string().min(1, 'Address line 1 is required').max(100, 'Address line 1 too long'),
  address2: z.string().max(100, 'Address line 2 too long').optional(),
  city: z.string().min(1, 'City is required').max(50, 'City name too long'),
  state: z.string().min(1, 'State/Province is required').max(50, 'State/Province too long'),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code too long'),
  country: CountryCodeSchema,
  phone: PhoneSchema.optional(),
});

/**
 * Shipping address schema
 */
export const ShippingAddressSchema = BaseAddressSchema;

/**
 * Billing address schema
 */
export const BillingAddressSchema = BaseAddressSchema;

// ============================================================================
// COMMON PAGINATION SCHEMAS
// ============================================================================

/**
 * Pagination parameters schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive('Page must be a positive integer').default(1),
  limit: z.number().int().positive('Limit must be a positive integer').max(100, 'Limit cannot exceed 100').default(20),
  offset: z.number().int().min(0, 'Offset cannot be negative').optional(),
});

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

/**
 * Paginated response schema
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    meta: PaginationMetaSchema,
  });

// ============================================================================
// COMMON SORTING SCHEMAS
// ============================================================================

/**
 * Sort direction schema
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Generic sorting schema
 */
export const SortSchema = z.object({
  field: z.string().min(1, 'Sort field is required'),
  direction: SortDirectionSchema,
});

/**
 * Multiple field sorting schema
 */
export const MultiSortSchema = z.array(SortSchema).min(1, 'At least one sort field is required');

// ============================================================================
// COMMON FILTERING SCHEMAS
// ============================================================================

/**
 * Date range filter schema
 */
export const DateRangeSchema = z.object({
  from: DateTimeSchema.optional(),
  to: DateTimeSchema.optional(),
}).refine((data) => {
  if (data.from && data.to) {
    return new Date(data.from) <= new Date(data.to);
  }
  return true;
}, {
  message: 'From date must be before or equal to to date',
  path: ['to'],
});

/**
 * Numeric range filter schema
 */
export const NumericRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
}).refine((data) => {
  if (data.min !== undefined && data.max !== undefined) {
    return data.min <= data.max;
  }
  return true;
}, {
  message: 'Min value must be less than or equal to max value',
  path: ['max'],
});

/**
 * Text search filter schema
 */
export const TextSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  fields: z.array(z.string()).min(1, 'At least one search field is required').optional(),
  caseSensitive: z.boolean().default(false),
});

// ============================================================================
// COMMON API RESPONSE SCHEMAS
// ============================================================================

/**
 * Success response schema
 */
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    meta: z.object({
      timestamp: DateTimeSchema,
      requestId: IdSchema,
      version: z.string().optional(),
    }).optional(),
  });

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1, 'Error code is required'),
    message: z.string().min(1, 'Error message is required'),
    details: z.record(z.unknown()).optional(),
    stack: z.string().optional(),
  }),
  meta: z.object({
    timestamp: DateTimeSchema,
    requestId: IdSchema,
    version: z.string().optional(),
  }).optional(),
});

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  message: z.string().min(1, 'Error message is required'),
  code: z.string().min(1, 'Error code is required'),
  value: z.unknown().optional(),
});

/**
 * Validation error response schema
 */
export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.string().default('Validation failed'),
    details: z.array(ValidationErrorSchema),
  }),
  meta: z.object({
    timestamp: DateTimeSchema,
    requestId: IdSchema,
  }),
});

// ============================================================================
// COMMON METADATA SCHEMAS
// ============================================================================

/**
 * Common metadata schema
 */
export const MetadataSchema = z.object({
  title: z.string().max(60, 'Title too long').optional(),
  description: z.string().max(160, 'Description too long').optional(),
  keywords: z.array(z.string()).default([]),
  image: UrlSchema.optional(),
  url: UrlSchema.optional(),
  type: z.enum(['website', 'article', 'product', 'profile']).default('website'),
  locale: LanguageCodeSchema.optional(),
});

/**
 * SEO metadata schema
 */
export const SeoMetadataSchema = MetadataSchema.extend({
  robots: z.string().default('index,follow'),
  canonical: UrlSchema.optional(),
  alternate: z.array(z.object({
    hreflang: LanguageCodeSchema,
    href: UrlSchema,
  })).optional(),
});

// ============================================================================
// COMMON FILE SCHEMAS
// ============================================================================

/**
 * File upload schema
 */
export const FileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().int().positive('File size must be positive'),
  type: z.string().min(1, 'File type is required'),
  url: UrlSchema,
  alt: z.string().max(200, 'Alt text too long').optional(),
});

/**
 * Image file schema
 */
export const ImageFileSchema = FileUploadSchema.extend({
  width: z.number().int().positive('Width must be positive').optional(),
  height: z.number().int().positive('Height must be positive').optional(),
  format: z.enum(['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg']).optional(),
});

// ============================================================================
// COMMON VALIDATION UTILITIES
// ============================================================================

/**
 * Creates a schema that validates a string is not empty after trimming
 */
export const NonEmptyStringSchema = z.string().min(1, 'String cannot be empty').transform((str) => str.trim());

/**
 * Creates a schema that validates a positive number
 */
export const PositiveNumberSchema = z.number().positive('Number must be positive');

/**
 * Creates a schema that validates a non-negative number
 */
export const NonNegativeNumberSchema = z.number().min(0, 'Number cannot be negative');

/**
 * Creates a schema that validates a percentage (0-100)
 */
export const PercentageSchema = z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100');

/**
 * Creates a schema that validates a UUID or allows null
 */
export const OptionalUuidSchema = z.string().uuid('Invalid UUID format').optional();

/**
 * Creates a schema that validates a boolean or allows null
 */
export const OptionalBooleanSchema = z.boolean().optional();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Id = z.infer<typeof IdSchema>;
export type StoreId = z.infer<typeof StoreIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type Phone = z.infer<typeof PhoneSchema>;
export type Url = z.infer<typeof UrlSchema>;
export type Slug = z.infer<typeof SlugSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type CountryCode = z.infer<typeof CountryCodeSchema>;
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
export type Timezone = z.infer<typeof TimezoneSchema>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export type Date = z.infer<typeof DateSchema>;
export type Time = z.infer<typeof TimeSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type BaseAddress = z.infer<typeof BaseAddressSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type BillingAddress = z.infer<typeof BillingAddressSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type SortDirection = z.infer<typeof SortDirectionSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type MultiSort = z.infer<typeof MultiSortSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type NumericRange = z.infer<typeof NumericRangeSchema>;
export type TextSearch = z.infer<typeof TextSearchSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ImageFile = z.infer<typeof ImageFileSchema>;
