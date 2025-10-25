/**
 * Validation Utilities
 * 
 * Common validation utilities and helpers for the Reech SaaS application.
 */

import { z } from 'zod';

// ============================================================================
// TENANT VALIDATION UTILITIES
// ============================================================================

/**
 * Validates that a value is a valid UUID
 */
export function isValidUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validates that a value is a valid store ID (UUID format)
 */
export function isValidStoreId(value: string): boolean {
  return isValidUuid(value);
}

/**
 * Validates that a value is a valid subdomain
 */
export function isValidSubdomain(value: string): boolean {
  const subdomainRegex = /^[a-z0-9-]+$/;
  return (
    subdomainRegex.test(value) &&
    value.length >= 3 &&
    value.length <= 63 &&
    !value.startsWith('-') &&
    !value.endsWith('-')
  );
}

/**
 * Validates that a value is a valid slug
 */
export function isValidSlug(value: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/;
  return (
    slugRegex.test(value) &&
    value.length >= 1 &&
    value.length <= 100
  );
}

/**
 * Validates that a value is a valid email address
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

// ============================================================================
// SCHEMA VALIDATION UTILITIES
// ============================================================================

/**
 * Safely parses data with a Zod schema and returns a result object
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
  issues?: z.ZodIssue[];
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    error: result.error.message,
    issues: result.error.issues,
  };
}

/**
 * Validates multiple fields and returns all validation errors
 */
export function validateFields<T extends Record<string, unknown>>(
  validators: Record<keyof T, z.ZodSchema>,
  data: T
): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  let isValid = true;
  
  for (const [field, validator] of Object.entries(validators)) {
    const result = validator.safeParse(data[field]);
    if (!result.success) {
      errors[field] = result.error.issues[0]?.message || 'Invalid value';
      isValid = false;
    }
  }
  
  return { isValid, errors };
}

/**
 * Creates a validator that requires all fields to be present
 */
export function createRequiredValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  return schema.required();
}

/**
 * Creates a validator that makes all fields optional
 */
export function createOptionalValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  return schema.partial();
}

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

/**
 * Validates that a price is reasonable (not negative, not too high)
 */
export function validatePrice(price: number): {
  isValid: boolean;
  error?: string;
} {
  if (price < 0) {
    return { isValid: false, error: 'Price cannot be negative' };
  }
  
  if (price > 1000000) {
    return { isValid: false, error: 'Price seems unreasonably high' };
  }
  
  return { isValid: true };
}

/**
 * Validates that a quantity is reasonable
 */
export function validateQuantity(quantity: number): {
  isValid: boolean;
  error?: string;
} {
  if (!Number.isInteger(quantity)) {
    return { isValid: false, error: 'Quantity must be a whole number' };
  }
  
  if (quantity < 0) {
    return { isValid: false, error: 'Quantity cannot be negative' };
  }
  
  if (quantity > 10000) {
    return { isValid: false, error: 'Quantity seems unreasonably high' };
  }
  
  return { isValid: true };
}

/**
 * Validates that a percentage is between 0 and 100
 */
export function validatePercentage(percentage: number): {
  isValid: boolean;
  error?: string;
} {
  if (percentage < 0 || percentage > 100) {
    return { isValid: false, error: 'Percentage must be between 0 and 100' };
  }
  
  return { isValid: true };
}

// ============================================================================
// DATE VALIDATION UTILITIES
// ============================================================================

/**
 * Validates that a date string is in ISO 8601 format
 */
export function isValidIsoDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}

/**
 * Validates that a date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
}

/**
 * Validates that a date is in the past
 */
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
}

/**
 * Validates that a date range is valid (start < end)
 */
export function isValidDateRange(startDate: string, endDate: string): {
  isValid: boolean;
  error?: string;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  if (start >= end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }
  
  return { isValid: true };
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const validationUtils = {
  // UUID validation
  isValidUuid,
  isValidStoreId,
  
  // String validation
  isValidSubdomain,
  isValidSlug,
  isValidEmail,
  
  // Schema validation
  safeParse,
  validateFields,
  createRequiredValidator,
  createOptionalValidator,
  
  // Business logic validation
  validatePrice,
  validateQuantity,
  validatePercentage,
  
  // Date validation
  isValidIsoDate,
  isFutureDate,
  isPastDate,
  isValidDateRange,
} as const;
