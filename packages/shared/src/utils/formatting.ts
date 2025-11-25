/**
 * Formatting Utilities
 * 
 * Common formatting utilities for the Reech SaaS application.
 */

// ============================================================================
// STRING FORMATTING
// ============================================================================

/**
 * Converts a string to a URL-safe slug
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Converts a string to title case
 */
export function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncates text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Converts camelCase to kebab-case
 */
export function camelToKebab(text: string): string {
  return text.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Converts kebab-case to camelCase
 */
export function kebabToCamel(text: string): string {
  return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Formats a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats a number with commas
 */
export function formatNumber(
  number: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Formats a number with appropriate units (K, M, B)
 */
export function formatCompactNumber(
  number: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Formats a date string to a human-readable format
 */
export function formatDate(
  dateString: string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(date);
}

/**
 * Formats a date string to a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  dateString: string,
  locale: string = 'en-US'
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

/**
 * Formats a date string to ISO format
 */
export function formatIsoDate(dateString: string): string {
  return new Date(dateString).toISOString();
}

/**
 * Formats a date string to a short format (MM/DD/YYYY)
 */
export function formatShortDate(
  dateString: string,
  locale: string = 'en-US'
): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Formats a file size in bytes to a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

/**
 * Formats a phone number to a standard format
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phoneNumber; // Return original if can't format
}

// ============================================================================
// ADDRESS FORMATTING
// ============================================================================

/**
 * Formats an address object to a single string
 */
export function formatAddress(address: {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  const parts = [
    address.address1,
    address.address2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);
  
  return parts.join('\n');
}

/**
 * Formats an address to a single line
 */
export function formatAddressInline(address: {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  const parts = [
    address.address1,
    address.address2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);
  
  return parts.join(', ');
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const formattingUtils = {
  // String formatting
  toSlug,
  toTitleCase,
  truncateText,
  capitalize,
  camelToKebab,
  kebabToCamel,
  
  // Number formatting
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  
  // Date formatting
  formatDate,
  formatRelativeTime,
  formatIsoDate,
  formatShortDate,
  
  // File size formatting
  formatFileSize,
  
  // Phone number formatting
  formatPhoneNumber,
  
  // Address formatting
  formatAddress,
  formatAddressInline,
} as const;
