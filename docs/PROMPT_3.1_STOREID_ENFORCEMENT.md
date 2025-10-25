# Prompt 3.1: StoreId Parameter Enforcement Documentation

## Overview

This document outlines the mandatory enforcement of `storeId` as the first parameter in all service functions that access tenant tables. This is a critical security requirement for multi-tenancy isolation.

## Signature Rule

**CRITICAL REQUIREMENT**: All service functions that access tenant tables MUST have `storeId` as the FIRST parameter.

### Correct Signature Pattern

```typescript
// ✅ CORRECT: storeId is the first parameter
async findProductsForStore(storeId: string, filters: FilterableProductProps): Promise<ProductListResponse>
async findOrdersForStore(storeId: string, filters: FilterableOrderProps): Promise<OrderListResponse>
async getProductById(storeId: string, productId: string): Promise<Product>
async createOrder(storeId: string, orderData: CreateOrder): Promise<Order>
```

### Incorrect Signature Patterns

```typescript
// ❌ INCORRECT: storeId is not the first parameter
async findProductsForStore(filters: FilterableProductProps, storeId: string): Promise<ProductListResponse>
async findProductsForStore(filters: FilterableProductProps): Promise<ProductListResponse> // Missing storeId
async findProductsForStore(storeId: string): Promise<ProductListResponse> // Missing required parameters
```

## Linter Rules

### ESLint Rule Configuration

Add the following custom ESLint rule to enforce `storeId` parameter placement:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Custom rule to enforce storeId as first parameter
    'reech/storeid-first-parameter': 'error',
  },
  plugins: ['reech'],
  overrides: [
    {
      files: ['packages/services/**/*.ts', 'server/services/**/*.ts'],
      rules: {
        'reech/storeid-first-parameter': 'error',
      },
    },
  ],
};
```

### Custom ESLint Rule Implementation

```javascript
// eslint-plugin-reech/rules/storeid-first-parameter.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce storeId as first parameter in service functions',
      category: 'Security',
      recommended: true,
    },
    schema: [],
    messages: {
      storeIdFirst: 'Service functions must have storeId as the first parameter for multi-tenancy isolation',
      storeIdRequired: 'Service functions must include storeId parameter for tenant table access',
      invalidStoreIdType: 'storeId parameter must be of type string',
    },
  },
  create(context) {
    const serviceFiles = ['packages/services', 'server/services'];
    const isServiceFile = serviceFiles.some(path => context.getFilename().includes(path));
    
    if (!isServiceFile) {
      return {};
    }

    return {
      MethodDefinition(node) {
        if (node.kind === 'method' && node.value.async) {
          const methodName = node.key.name;
          const params = node.value.params;
          
          // Check if method accesses tenant tables
          const tenantTableMethods = [
            'findProductsForStore',
            'findOrdersForStore',
            'getProductById',
            'getOrderById',
            'createProduct',
            'createOrder',
            'updateProduct',
            'updateOrder',
            'deleteProduct',
            'deleteOrder',
            'getOrderStats',
          ];
          
          if (tenantTableMethods.includes(methodName)) {
            // Check if storeId is the first parameter
            if (params.length === 0) {
              context.report({
                node,
                messageId: 'storeIdRequired',
              });
            } else {
              const firstParam = params[0];
              if (!firstParam.name || firstParam.name !== 'storeId') {
                context.report({
                  node,
                  messageId: 'storeIdFirst',
                });
              }
              
              // Check if storeId is typed as string
              if (firstParam.typeAnnotation) {
                const typeAnnotation = firstParam.typeAnnotation.typeAnnotation;
                if (typeAnnotation.type !== 'TSStringKeyword') {
                  context.report({
                    node,
                    messageId: 'invalidStoreIdType',
                  });
                }
              }
            }
          }
        }
      },
      
      FunctionDeclaration(node) {
        if (node.async) {
          const functionName = node.id?.name;
          const params = node.params;
          
          // Check if function accesses tenant tables
          const tenantTableFunctions = [
            'findProductsForStore',
            'findOrdersForStore',
            'getProductById',
            'getOrderById',
            'createProduct',
            'createOrder',
            'updateProduct',
            'updateOrder',
            'deleteProduct',
            'deleteOrder',
            'getOrderStats',
          ];
          
          if (tenantTableFunctions.includes(functionName)) {
            // Check if storeId is the first parameter
            if (params.length === 0) {
              context.report({
                node,
                messageId: 'storeIdRequired',
              });
            } else {
              const firstParam = params[0];
              if (!firstParam.name || firstParam.name !== 'storeId') {
                context.report({
                  node,
                  messageId: 'storeIdFirst',
                });
              }
              
              // Check if storeId is typed as string
              if (firstParam.typeAnnotation) {
                const typeAnnotation = firstParam.typeAnnotation.typeAnnotation;
                if (typeAnnotation.type !== 'TSStringKeyword') {
                  context.report({
                    node,
                    messageId: 'invalidStoreIdType',
                  });
                }
              }
            }
          }
        }
      },
    };
  },
};
```

## Code Review Checklist

### Pre-commit Checklist

Before committing any changes to service files, verify:

- [ ] **StoreId Parameter**: All service functions have `storeId` as the first parameter
- [ ] **Parameter Type**: `storeId` is typed as `string`
- [ ] **Validation**: `storeId` format is validated (Medusa Store ID: `store_XXXXX`)
- [ ] **Guard Clauses**: Input validation includes `storeId` checks
- [ ] **Database Queries**: All queries filter by `store_id` column
- [ ] **Error Handling**: Proper error messages for invalid `storeId`

### Code Review Questions

When reviewing service code, ask:

1. **Does this function access tenant tables?**
   - If yes, does it have `storeId` as the first parameter?
   - If no, is there a clear reason why `storeId` is not needed?

2. **Is the `storeId` parameter properly validated?**
   - Format validation (Medusa Store ID pattern)
   - Type validation (string)
   - Null/undefined checks

3. **Are database queries properly scoped?**
   - All queries include `store_id` filter
   - No cross-tenant data access possible
   - Proper use of Supabase client with tenant isolation

4. **Is error handling comprehensive?**
   - Invalid `storeId` format errors
   - Missing `storeId` errors
   - Database query errors
   - Proper TRPCError usage

### Automated Checks

#### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

# Run ESLint on service files
npx eslint packages/services/**/*.ts server/services/**/*.ts --fix

# Run TypeScript type checking
npx tsc --noEmit

# Run tests
npm run test:services
```

#### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint-services:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx eslint packages/services/**/*.ts server/services/**/*.ts
      - run: npx tsc --noEmit
      - run: npm run test:services
```

## Implementation Examples

### Correct Implementation

```typescript
/**
 * Product Service - Correct Implementation
 */
export class ProductService {
  /**
   * ✅ CORRECT: storeId is the first parameter
   */
  async findProductsForStore(
    storeId: string,  // ← FIRST PARAMETER
    filters: FilterableProductProps
  ): Promise<ProductListResponse> {
    // Guard clause: Validate storeId
    if (!storeId || !storeId.match(/^store_[a-zA-Z0-9]+$/)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid store ID format',
      });
    }

    // Query with store_id filter
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)  // ← TENANT ISOLATION
      .is('deleted_at', null);

    // Handle errors and return results
    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch products: ${error.message}`,
      });
    }

    return {
      products: data || [],
      count: data?.length || 0,
      limit: filters.limit || 15,
      offset: filters.offset || 0,
      hasMore: false,
    };
  }
}
```

### Incorrect Implementation

```typescript
/**
 * Product Service - INCORRECT Implementation
 */
export class ProductService {
  /**
   * ❌ INCORRECT: storeId is not the first parameter
   */
  async findProductsForStore(
    filters: FilterableProductProps,  // ← WRONG: filters first
    storeId: string                   // ← WRONG: storeId second
  ): Promise<ProductListResponse> {
    // This violates the signature rule
    // Could lead to cross-tenant data access
  }

  /**
   * ❌ INCORRECT: Missing storeId parameter
   */
  async findProductsForStore(
    filters: FilterableProductProps
  ): Promise<ProductListResponse> {
    // This violates the signature rule
    // No tenant isolation possible
    const { data, error } = await this.supabase
      .from('products')
      .select('*');  // ← DANGEROUS: No store_id filter
  }
}
```

## Security Implications

### Why This Rule is Critical

1. **Multi-Tenancy Isolation**: Ensures users can only access data from their own store
2. **Data Leakage Prevention**: Prevents accidental cross-tenant data access
3. **Security Compliance**: Meets enterprise security requirements
4. **Audit Trail**: Makes tenant access patterns clear and traceable

### Common Vulnerabilities Prevented

1. **Cross-Tenant Data Access**: Without `storeId` filtering, users could access other tenants' data
2. **Injection Attacks**: Proper `storeId` validation prevents malicious input
3. **Privilege Escalation**: Tenant isolation prevents unauthorized access
4. **Data Corruption**: Ensures data integrity across tenant boundaries

## Enforcement Timeline

### Phase 1: Implementation (Current)
- [x] Create service files with correct signatures
- [x] Document enforcement rules
- [x] Create linter configuration
- [x] Add code review checklist

### Phase 2: Validation (Next)
- [ ] Add automated tests
- [ ] Implement pre-commit hooks
- [ ] Set up CI/CD checks
- [ ] Train development team

### Phase 3: Monitoring (Future)
- [ ] Add runtime validation
- [ ] Implement audit logging
- [ ] Create monitoring dashboards
- [ ] Regular security reviews

## Conclusion

The `storeId` parameter enforcement is a critical security requirement that must be strictly followed. This documentation provides the necessary tools and processes to ensure compliance across the development team.

**Remember**: Every service function that accesses tenant tables MUST have `storeId` as the first parameter. This is not optional - it's a security requirement.
