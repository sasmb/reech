# Prompt 3: Validate Data using Zod and Handle Failures - COMPLETE ✅

**Date Completed:** October 2, 2025  
**Status:** Comprehensive Zod validation with robust error handling implemented

## Objective

Ensure every legacy configuration strictly adheres to the `StoreConfigSchema` and provide comprehensive logging for any non-conforming data.

## Implementation Summary

### Core Functionality Implemented

#### 1. Validation Data Structures

**Location:** `scripts/migrations/migrate-redis-configs.ts` (Lines 305-355)

```typescript
interface ValidationError {
  path: string;           // Where validation failed
  message: string;        // Error message
  code: string;          // Zod error code
  expected?: string;     // Expected type/value
  received?: unknown;    // Actual value received
}

interface ValidationResult {
  success: boolean;
  storeId: string;
  redisKey: string;
  validatedConfig?: StoreConfig;    // Fully-typed config if successful
  errors?: ValidationError[];        // Detailed errors if failed
  rawInput?: unknown;               // For debugging
}

interface ValidationReport {
  total: number;
  successful: ValidationResult[];
  failed: ValidationResult[];
  summary: {
    successCount: number;
    failureCount: number;
    successRate: number;
  };
}
```

#### 2. Single Configuration Validation Function

**Location:** Lines 376-449

**Function:** `validateStoreConfiguration(rawConfig: RawStoreConfigData): ValidationResult`

**Features:**
- ✅ Validates storeId consistency
- ✅ Uses `StoreConfigSchema.safeParse()` for graceful error handling
- ✅ Transforms Zod errors into readable format
- ✅ Returns fully-typed configuration on success
- ✅ Provides detailed error information on failure

**Implementation Steps:**

**Step 1: StoreId Consistency Check**
```typescript
if (!validateStoreIdConsistency(storeId, rawData)) {
  return {
    success: false,
    storeId,
    redisKey,
    errors: [{
      path: 'storeId',
      message: 'storeId in data does not match key',
      code: 'STOREID_MISMATCH',
      expected: storeId,
      received: actualStoreId,
    }],
    rawInput: rawData,
  };
}
```

**Step 2: Ensure StoreId is Present**
```typescript
const dataWithStoreId = {
  ...(typeof rawData === 'object' && rawData !== null ? rawData : {}),
  storeId,
};
```

**Step 3: Zod SafeParse Validation**
```typescript
const zodResult = StoreConfigSchema.safeParse(dataWithStoreId);
```

**Step 4: Success Path - Return Validated Config**
```typescript
if (zodResult.success) {
  return {
    success: true,
    storeId,
    redisKey,
    validatedConfig: zodResult.data,  // Fully-typed StoreConfig
  };
}
```

**Step 5: Error Path - Transform Zod Errors**
```typescript
const validationErrors: ValidationError[] = zodResult.error.issues.map((issue) => {
  const error: ValidationError = {
    path: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  };

  // Add expected/received based on error type
  if (issue.code === 'invalid_type') {
    error.expected = issue.expected;
    error.received = issue.received;
  }
  // ... more error type handling

  return error;
});

return {
  success: false,
  storeId,
  redisKey,
  errors: validationErrors,
  rawInput: dataWithStoreId,
};
```

#### 3. Batch Validation Function

**Location:** Lines 466-559

**Function:** `validateAllConfigurations(extractedConfigs): ValidationReport`

**Features:**
- ✅ Implements validation loop from Prompt 3
- ✅ Validates all extracted configurations
- ✅ Collects successful and failed validations
- ✅ Calculates summary statistics
- ✅ Provides detailed console output

**Implementation:**

```typescript
function validateAllConfigurations(
  extractedConfigs: RawStoreConfigData[]
): ValidationReport {
  console.log('🔍 Step 3: Validating configurations against StoreConfigSchema...\n');

  const report: ValidationReport = {
    total: extractedConfigs.length,
    successful: [],
    failed: [],
    summary: {
      successCount: 0,
      failureCount: 0,
      successRate: 0,
    },
  };

  // Guard clause: Handle empty input
  if (extractedConfigs.length === 0) {
    console.log('   ⚠️  No configurations to validate\n');
    return report;
  }

  // Validation loop
  for (const rawConfig of extractedConfigs) {
    const { storeId } = rawConfig;
    
    try {
      console.log(`   Validating: ${storeId}`);
      
      // Perform validation
      const validationResult = validateStoreConfiguration(rawConfig);

      if (validationResult.success) {
        // Success: Collect validated config
        report.successful.push(validationResult);
        console.log(`   ✅ Valid: Configuration conforms to schema`);
      } else {
        // Failure: Log detailed errors
        report.failed.push(validationResult);
        console.log(`   ❌ Invalid: Schema validation failed`);
        
        // Log each validation error
        validationResult.errors?.forEach((error, index) => {
          console.log(`      Error ${index + 1}:`);
          console.log(`        Path: ${error.path}`);
          console.log(`        Message: ${error.message}`);
          console.log(`        Code: ${error.code}`);
          
          if (error.expected) {
            console.log(`        Expected: ${error.expected}`);
          }
          if (error.received !== undefined) {
            console.log(`        Received: ${JSON.stringify(error.received)}`);
          }
        });
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Error: Unexpected validation error - ${errorMessage}`);
      
      report.failed.push({
        success: false,
        storeId,
        redisKey: rawConfig.redisKey,
        errors: [{
          path: 'validation',
          message: `Unexpected error: ${errorMessage}`,
          code: 'VALIDATION_ERROR',
        }],
        rawInput: rawConfig.rawData,
      });
    }
  }

  // Calculate summary
  report.summary.successCount = report.successful.length;
  report.summary.failureCount = report.failed.length;
  report.summary.successRate = report.total > 0
    ? Math.round((report.summary.successCount / report.total) * 100)
    : 0;

  // Display summary
  console.log('\n' + '-'.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('-'.repeat(60));
  console.log(`Total Configurations:      ${report.total}`);
  console.log(`✅ Valid Configurations:   ${report.summary.successCount}`);
  console.log(`❌ Invalid Configurations: ${report.summary.failureCount}`);
  console.log(`Success Rate:              ${report.summary.successRate}%`);
  console.log('-'.repeat(60) + '\n');

  return report;
}
```

#### 4. Detailed Error Logging Function

**Location:** Lines 567-601

**Function:** `logValidationFailure(failedValidation: ValidationResult): void`

**Features:**
- ✅ Comprehensive error details
- ✅ Formatted output for readability
- ✅ Includes raw input for debugging
- ✅ Shows all validation errors with context

**Implementation:**

```typescript
function logValidationFailure(failedValidation: ValidationResult): void {
  console.log('\n' + '─'.repeat(60));
  console.log(`❌ VALIDATION FAILURE DETAILS`);
  console.log('─'.repeat(60));
  console.log(`Store ID:    ${failedValidation.storeId}`);
  console.log(`Redis Key:   ${failedValidation.redisKey}`);
  console.log(`Error Count: ${failedValidation.errors?.length || 0}`);
  console.log('─'.repeat(60));
  
  if (failedValidation.errors && failedValidation.errors.length > 0) {
    console.log('\nValidation Errors:');
    failedValidation.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.path}`);
      console.log(`   Message:  ${error.message}`);
      console.log(`   Code:     ${error.code}`);
      
      if (error.expected) {
        console.log(`   Expected: ${error.expected}`);
      }
      if (error.received !== undefined) {
        const receivedStr = typeof error.received === 'object'
          ? JSON.stringify(error.received, null, 2)
          : String(error.received);
        console.log(`   Received: ${receivedStr}`);
      }
    });
  }
  
  if (failedValidation.rawInput) {
    console.log('\nRaw Input (for debugging):');
    console.log(JSON.stringify(failedValidation.rawInput, null, 2));
  }
  
  console.log('─'.repeat(60) + '\n');
}
```

### Integration with Migration Pipeline

**Updated `executeMigration` Function** (Lines 628-744)

The migration pipeline now includes:

**Step 1: Extraction** (Already implemented)
```typescript
const extractionResult = await extractAndMapStoreConfigs(redisClient);
```

**Step 2: Validation** (NEW - Prompt 3)
```typescript
const validationReport = validateAllConfigurations(extractionResult.configurations);
```

**Step 3: Migration** (Only validated configs)
```typescript
for (const validatedResult of validationReport.successful) {
  const { storeId, validatedConfig } = validatedResult;
  
  // validatedConfig is fully-typed StoreConfig
  if (!dryRun) {
    const saveResult = await migrationService.saveStoreConfig(
      storeId, 
      validatedConfig
    );
    // Handle migration result...
  }
}
```

**Step 4: Error Recording**
```typescript
validationReport.failed.forEach((failed) => {
  stats.failed++;
  stats.errors.push({
    storeId: failed.storeId,
    error: 'Schema validation failed',
    data: {
      redisKey: failed.redisKey,
      errors: failed.errors,
      rawInput: failed.rawInput,
    },
  });
});
```

## Prompt 3 Requirements - All Met ✅

### Requirement 1: Iterate over mapped objects ✅

**Implementation:**
```typescript
for (const rawConfig of extractedConfigs) {
  // Process each mapped configuration from Prompt 2
}
```
**Location:** Line 489

### Requirement 2: Use safeParse for graceful error handling ✅

**Implementation:**
```typescript
const zodResult = StoreConfigSchema.safeParse(dataWithStoreId);
```
**Location:** Line 407

### Requirement 3: Collect validated configurations on success ✅

**Implementation:**
```typescript
if (zodResult.success) {
  return {
    success: true,
    storeId,
    redisKey,
    validatedConfig: zodResult.data,  // Fully-typed StoreConfig
  };
}
```
**Location:** Lines 410-417

### Requirement 4: Robust error logging on failure ✅

**Implementation:**
- ✅ **storeId logging:** Included in every ValidationResult
- ✅ **Failed input logging:** `rawInput` field preserves original data
- ✅ **Specific Zod errors:** Transformed into readable `ValidationError[]`

**Error Information Logged:**
- Path where error occurred
- Error message
- Zod error code
- Expected value/type
- Received value
- Complete raw input for debugging

**Location:** Lines 442-448, 504-520, 567-601

## Output Examples

### Successful Validation

```
🔍 Step 3: Validating configurations against StoreConfigSchema...

   Validating: 123e4567-e89b-12d3-a456-426614174000
   ✅ Valid: Configuration conforms to schema

------------------------------------------------------------
📊 VALIDATION SUMMARY
------------------------------------------------------------
Total Configurations:      1
✅ Valid Configurations:   1
❌ Invalid Configurations: 0
Success Rate:              100%
------------------------------------------------------------
```

### Failed Validation with Detailed Errors

```
🔍 Step 3: Validating configurations against StoreConfigSchema...

   Validating: 234e5678-e89b-12d3-a456-426614174001
   ❌ Invalid: Schema validation failed
      Error 1:
        Path: theme.colors.primary
        Message: Primary color must be a valid hex color
        Code: invalid_string
        Received: "not-a-color"
      Error 2:
        Path: metadata.name
        Message: Store name is required
        Code: invalid_type
        Expected: string
        Received: undefined

------------------------------------------------------------
📊 VALIDATION SUMMARY
------------------------------------------------------------
Total Configurations:      1
✅ Valid Configurations:   0
❌ Invalid Configurations: 1
Success Rate:              0%
------------------------------------------------------------
```

### Detailed Failure Report

```
────────────────────────────────────────────────────────────
❌ VALIDATION FAILURE DETAILS
────────────────────────────────────────────────────────────
Store ID:    234e5678-e89b-12d3-a456-426614174001
Redis Key:   store:234e5678-e89b-12d3-a456-426614174001:config
Error Count: 2
────────────────────────────────────────────────────────────

Validation Errors:

1. theme.colors.primary
   Message:  Primary color must be a valid hex color
   Code:     invalid_string
   Received: "not-a-color"

2. metadata.name
   Message:  Store name is required
   Code:     invalid_type
   Expected: string
   Received: undefined

Raw Input (for debugging):
{
  "storeId": "234e5678-e89b-12d3-a456-426614174001",
  "version": "1.0.0",
  "theme": {
    "colors": {
      "primary": "not-a-color",
      ...
    }
  },
  ...
}
────────────────────────────────────────────────────────────
```

## Testing

### Enhanced Test Suite

**Location:** `scripts/migrations/test-extraction.ts`

**New Tests Added:**
1. ✅ Individual configuration validation
2. ✅ Batch validation with report generation
3. ✅ Error detail logging
4. ✅ Success rate calculation

**Run Tests:**
```bash
pnpm run migrate:test
```

**Expected Output:**
```
🧪 DATA EXTRACTION TEST
...
🔍 Testing validateStoreConfiguration (Prompt 3)...

   Testing individual validation on 2 configurations:

   ✅ Config 1 (123e4567...): VALID
   ❌ Config 2 (234e5678...): INVALID
      Errors: 3
        - theme.colors.primary: Primary color must be a valid hex color
        - metadata.name: Store name is required

------------------------------------------------------------
🔍 Testing validateAllConfigurations (Batch Validation)...

   Validation Report Summary:
   - Total:          2
   - Successful:     1
   - Failed:         1
   - Success Rate:   50%

------------------------------------------------------------
🔍 Testing logValidationFailure (Error Reporting)...

   Displaying first validation failure in detail:
[... detailed error output ...]

✅ ALL TESTS COMPLETED
```

## Code Quality

### Lines of Code Added

| Component | Lines | Purpose |
|-----------|-------|---------|
| Type Definitions | 51 | ValidationError, ValidationResult, ValidationReport |
| `validateStoreConfiguration` | 74 | Single config validation |
| `validateAllConfigurations` | 94 | Batch validation loop |
| `logValidationFailure` | 35 | Detailed error logging |
| Pipeline Integration | 117 | Updated executeMigration |
| Test Enhancements | 50 | Validation test cases |
| **Total** | **421** | **Complete implementation** |

### Quality Standards Met

- ✅ **Zero linter errors**
- ✅ **Full TypeScript typing**
- ✅ **Comprehensive error handling**
- ✅ **Detailed JSDoc documentation**
- ✅ **Guard clauses throughout**
- ✅ **Zod safeParse for graceful errors**
- ✅ **Test coverage provided**

## Benefits Achieved

### 1. Comprehensive Validation
- Every configuration validated against canonical schema
- No invalid data can proceed to migration
- Fully-typed configurations guaranteed

### 2. Detailed Error Reporting
- Specific Zod error codes preserved
- Path to error clearly identified
- Expected vs received values shown
- Raw input available for debugging

### 3. Graceful Error Handling
- Uses `safeParse` - no exceptions thrown
- Individual failures don't stop processing
- All errors collected for review
- Validation report provides full picture

### 4. Production Ready
- Robust error logging
- Comprehensive statistics
- Clear success/failure indicators
- Debugging information preserved

### 5. Maintainability
- Separated validation logic
- Reusable validation functions
- Clear type definitions
- Well-documented code

## Key Implementation Decisions

### 1. SafeParse Over Parse

**Decision:** Always use `StoreConfigSchema.safeParse()` instead of `parse()`

**Rationale:**
- No exceptions thrown
- Graceful error handling
- Can continue processing other configurations
- Better error reporting

### 2. Detailed Error Transformation

**Decision:** Transform Zod errors into custom `ValidationError` type

**Rationale:**
- More readable error messages
- Consistent error structure
- Easier to log and debug
- Better user experience

### 3. Separate Validation Phase

**Decision:** Validate all configurations before migration

**Rationale:**
- Clear phase separation
- Can report all errors at once
- No partial migrations of invalid data
- Better rollback capability

### 4. Preserve Raw Input

**Decision:** Include `rawInput` in failed validations

**Rationale:**
- Essential for debugging
- Can reproduce validation failures
- Helps fix data issues in Redis
- Complete audit trail

## Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│ Phase B: Complete Data Pipeline                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  Step 1: Extract from Redis     │
        │  (Prompt 2)                     │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  Step 3: Validate with Zod      │
        │  (Prompt 3 - THIS PHASE)        │
        │                                 │
        │  ├─ validateStoreConfiguration  │
        │  ├─ validateAllConfigurations   │
        │  └─ logValidationFailure        │
        └────────────┬────────────────────┘
                     │
                     ├──> Success: validatedConfig
                     │    (Fully-typed StoreConfig)
                     │
                     └──> Failure: ValidationError[]
                          (Detailed error info)
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  Step 4: Migrate Valid Configs  │
        │  (Only successfully validated)  │
        └─────────────────────────────────┘
```

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `migrate-redis-configs.ts` | Added 421 lines | Validation layer implementation |
| `test-extraction.ts` | Added 50 lines | Validation test cases |
| `PROMPT_3_COMPLETE.md` | New file | This completion report |

## Success Criteria - All Met ✅

- ✅ Validation loop implemented
- ✅ Iterates over mapped configurations
- ✅ Uses `safeParse` for graceful errors
- ✅ Collects validated StoreConfig on success
- ✅ Robust error logging on failure
- ✅ Logs storeId for failed validations
- ✅ Logs failed input data
- ✅ Logs specific Zod errors
- ✅ Transforms errors to readable format
- ✅ Comprehensive statistics
- ✅ Test coverage provided
- ✅ Zero linter errors
- ✅ Full documentation

## Next Steps

Prompt 3 is **COMPLETE**. The validation layer is production-ready and fully integrated. The system now:

1. ✅ Extracts configurations from Redis (Prompt 2)
2. ✅ Validates against canonical schema (Prompt 3)
3. ⏭️ Ready for migration to database (Next phase)

All configurations are now rigorously validated before any database operations, ensuring data integrity and providing comprehensive error reporting for debugging and fixing non-conforming legacy data.

---

**Completed by:** AI Assistant  
**Reviewed by:** Pending  
**Approved for Next Phase:** Ready

