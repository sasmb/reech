# @reech/shared

Shared types, schemas, and utilities for the Reech SaaS application.

## Overview

This package serves as the single source of truth for all data validation schemas, TypeScript types, and common utilities used across the Reech SaaS platform. It ensures consistency between the API layer, frontend components, and database operations.

## Features

- **🔒 Tenant Isolation**: All schemas enforce tenant context with mandatory `storeId` validation
- **📝 Zod Validation**: Runtime schema validation with TypeScript inference
- **🎯 Type Safety**: Complete end-to-end type safety across the application
- **🔧 Utilities**: Common validation and formatting utilities
- **📊 Standards**: Consistent patterns for pagination, sorting, and API responses

## Installation

```bash
# Install from the monorepo
pnpm add @reech/shared

# Or install dependencies
pnpm install
```

## Usage

### Basic Schema Usage

```typescript
import { TenantSchema, CreateProductSchema, validateTenantContext } from '@reech/shared';

// Validate tenant data
const tenant = TenantSchema.parse({
  id: '123e4567-e89b-12d3-a456-426614174000',
  storeId: '123e4567-e89b-12d3-a456-426614174000',
  subdomain: 'my-store',
  name: 'My Store',
  slug: 'my-store',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
});

// Validate product creation with tenant context
const product = CreateProductSchema.parse({
  storeId: '123e4567-e89b-12d3-a456-426614174000', // Required!
  sku: 'PROD-001',
  name: 'My Product',
  description: 'A great product',
  slug: 'my-product',
  status: 'active'
});

// Validate tenant context in API operations
validateTenantContext({ storeId: '123e4567-e89b-12d3-a456-426614174000' });
```

### API Response Patterns

```typescript
import { ApiResponseSchema, PaginationSchema } from '@reech/shared';

// Create a typed API response
const ProductResponseSchema = ApiResponseSchema(ProductSchema);

// Validate pagination parameters
const pagination = PaginationSchema.parse({
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

### Store Configuration

```typescript
import { StoreConfigSchema, ThemeConfigSchema } from '@reech/shared';

// Validate store configuration
const config = StoreConfigSchema.parse({
  storeId: '123e4567-e89b-12d3-a456-426614174000',
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      // ... other colors
    },
    typography: {
      fontFamily: {
        heading: 'Inter',
        body: 'Inter'
      }
      // ... other typography settings
    }
  },
  // ... other configuration
});
```

## Schema Categories

### Core Schemas

- **Tenant**: Tenant identification and context
- **Store Config**: Dynamic store configuration and theming
- **User**: User management with role-based permissions
- **Product**: Product catalog with variants and inventory
- **Order**: Order management with line items and fulfillment

### Common Schemas

- **Pagination**: Standardized pagination parameters
- **Sorting**: Multi-field sorting with direction
- **Filtering**: Date ranges, numeric ranges, text search
- **API Responses**: Success/error response patterns
- **Validation**: Common validation utilities

## Critical Constraints

### Tenant Isolation

⚠️ **CRITICAL**: All data operations MUST include a `storeId` for tenant isolation:

```typescript
// ✅ CORRECT - Always include storeId
const products = await api.product.list({ storeId: tenant.storeId });

// ❌ INCORRECT - Never omit storeId
const products = await api.product.list(); // This will fail validation
```

### Schema Validation

All schemas use Zod for runtime validation and TypeScript inference:

```typescript
import { z } from 'zod';

// All schemas are Zod schemas
const result = ProductSchema.safeParse(data);
if (!result.success) {
  console.error('Validation errors:', result.error.issues);
}
```

## Development

### Building

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Testing
pnpm test
```

### Adding New Schemas

1. Create a new schema file in `schemas/`
2. Export the schema and types from the file
3. Add the export to `schemas/index.ts`
4. Update this README with usage examples

### Testing Schemas

```typescript
import { TenantSchema } from '@reech/shared';

// Test schema validation
describe('TenantSchema', () => {
  it('should validate correct tenant data', () => {
    const validTenant = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      storeId: '123e4567-e89b-12d3-a456-426614174000',
      subdomain: 'test-store',
      name: 'Test Store',
      slug: 'test-store',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };
    
    expect(() => TenantSchema.parse(validTenant)).not.toThrow();
  });
  
  it('should reject data without storeId', () => {
    const invalidTenant = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      // Missing storeId
      subdomain: 'test-store',
      name: 'Test Store',
      slug: 'test-store',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };
    
    expect(() => TenantSchema.parse(invalidTenant)).toThrow();
  });
});
```

## API Reference

### Core Schemas

#### TenantSchema
Base tenant schema with required identification fields.

#### StoreConfigSchema
Complete store configuration including theme, layout, and features.

#### UserSchema
User management with tenant isolation and role-based permissions.

#### ProductSchema
Product catalog with variants, inventory, and pricing.

#### OrderSchema
Order management with line items, addresses, and fulfillment.

### Utility Functions

#### createTenantScopedSchema(schema)
Creates a tenant-scoped version of any schema by adding required `storeId` field.

#### validateTenantContext(data)
Validates that data includes proper tenant context (`storeId`).

#### PaginationSchema
Standard pagination parameters with validation.

#### ApiResponseSchema(dataSchema)
Creates a typed API response wrapper for any data schema.

## Contributing

1. Follow the existing schema patterns
2. Ensure all schemas include tenant isolation
3. Add comprehensive TypeScript types
4. Include validation examples in tests
5. Update this README with new features

## License

MIT © Reech Development Team
