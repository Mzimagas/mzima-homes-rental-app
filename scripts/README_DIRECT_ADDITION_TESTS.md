# 🧪 Direct Addition Documents - Test Scripts

This directory contains comprehensive test scripts for the Direct Addition Documents system.

## 📋 Available Test Scripts

### 1. `test-direct-addition-docs.js`
**Purpose**: Main system test for document creation and retrieval  
**Usage**: `node scripts/test-direct-addition-docs.js`

**What it tests**:
- ✅ Document creation for all 10 Kenya document types
- ✅ Document retrieval and metadata grouping
- ✅ Completion percentage calculation
- ✅ Multiple file support for Property Images and Stamp Duty
- ✅ Database integration and storage

**Expected Output**:
```
🎉 All tests passed! The Direct Addition Documents system is ready.
✅ Completion: 9/9 (100%)
```

### 2. `test-user-profile-fix.js`
**Purpose**: Test foreign key constraint handling for uploaded_by field  
**Usage**: `node scripts/test-user-profile-fix.js`

**What it tests**:
- ✅ Document creation with null uploaded_by (foreign key fix)
- ✅ Document creation with valid user profiles
- ✅ Foreign key constraint compliance
- ✅ Error handling for missing user profiles

**Expected Output**:
```
🎉 User profile fix test completed successfully!
✅ Documents can be created with null uploaded_by
✅ Foreign key constraint is properly handled
```

### 3. `test-stage-documents.js` (Legacy)
**Purpose**: Original stage-based document testing (for reference)  
**Usage**: `node scripts/test-stage-documents.js`

**Note**: This script tests the old stage-based system and is kept for reference. The Direct Addition system uses a different approach.

## 🚀 Running All Tests

To run a comprehensive test suite:

```bash
# Test the main Direct Addition Documents system
node scripts/test-direct-addition-docs.js

# Test the foreign key fix
node scripts/test-user-profile-fix.js

# Verify both tests pass
echo "✅ All Direct Addition tests completed!"
```

## 🔍 Test Data

### Test Property
- **Name**: Usually "Vindo Block 1/2205 (0.05Ha)"
- **Source**: `DIRECT_ADDITION`
- **Used for**: All document testing

### Test Documents Created
Each test run creates sample documents for:
1. **title_deed** - Copy of Title/Title Number
2. **property_images** - Property Images (multiple files)
3. **search_certificate** - Search Certificate
4. **minutes_decision** - Minutes/Decision to Buy
5. **agreement_seller** - Agreement with Seller
6. **lcb_consent** - LCB Consent
7. **valuation_report** - Valuation Report
8. **assessment** - Assessment
9. **stamp_duty** - Stamp Duty Payment (multiple files)
10. **registered_title** - Registered Title (optional)

### Test File Details
- **File Path**: `test/sample-document-1756292550670.txt`
- **File Size**: 84 bytes
- **File Type**: `text/plain`
- **Metadata**: Includes `document_id` for grouping

## 🧹 Test Cleanup

### Automatic Cleanup
- `test-user-profile-fix.js` automatically cleans up test documents
- Uses `metadata->test = true` to identify and remove test data

### Manual Cleanup (if needed)
```sql
-- Remove test documents
DELETE FROM documents 
WHERE file_path LIKE 'test/%' 
   OR metadata->>'test' = 'true';
```

## 📊 Test Coverage

### ✅ Functional Testing
- Document creation and storage
- File upload simulation
- Metadata grouping and retrieval
- Progress calculation
- Multiple file handling

### ✅ Integration Testing
- Database operations
- Storage bucket access
- Authentication handling
- Foreign key constraints

### ✅ Error Handling
- Invalid file types
- Missing user profiles
- Storage failures
- Database constraints

### ✅ Performance Testing
- Document loading speed
- File upload efficiency
- Memory usage
- State management

## 🔧 Troubleshooting

### Common Issues

**Test fails with "No direct addition properties found"**
- Solution: The test will automatically create a test property

**Foreign key constraint errors**
- Solution: Run `test-user-profile-fix.js` to verify the fix

**Storage upload errors**
- Solution: Check Supabase configuration and internet connection

**Database connection issues**
- Solution: Verify `.env.local` file has correct Supabase credentials

### Debug Mode
Add `DEBUG=true` environment variable for verbose logging:
```bash
DEBUG=true node scripts/test-direct-addition-docs.js
```

## 📈 Success Criteria

### All Tests Should Show:
- ✅ **Document creation**: All 10 types created successfully
- ✅ **File grouping**: Proper metadata-based organization
- ✅ **Completion tracking**: 100% when all required docs present
- ✅ **Multiple files**: Property Images and Stamp Duty support
- ✅ **Foreign key handling**: No constraint violations

### Performance Benchmarks:
- **Document creation**: < 100ms per document
- **Retrieval and grouping**: < 200ms for 50+ documents
- **Test completion**: < 10 seconds total

## 🎯 Maintenance

### Regular Testing
Run these tests:
- **Before deployments**: Ensure system integrity
- **After database changes**: Verify compatibility
- **Monthly**: Performance and data validation

### Test Data Management
- **Monitor test document accumulation**
- **Clean up old test data periodically**
- **Verify test file storage usage**

---

**Note**: These tests are designed to be safe and non-destructive. They create minimal test data and clean up after themselves where possible.
