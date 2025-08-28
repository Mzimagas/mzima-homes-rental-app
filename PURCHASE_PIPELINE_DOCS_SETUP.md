# Purchase Pipeline Documents Setup Guide

## 🔍 **Issue Identified**

The Purchase Pipeline Documents system is failing because the `property_document_status` table constraint only allows `'direct_addition'` but not `'purchase_pipeline'`.

### **Error Symptoms**

- `Error uploading files: {}` when trying to upload documents
- Database constraint violations when updating document status
- N/A toggles and notes not persisting

### **Root Cause**

In `scripts/create-property-docs-schema.sql`:

- **Line 8**: `property_documents` table ✅ **SUPPORTS** `purchase_pipeline`
- **Line 26**: `property_document_status` table ❌ **ONLY ALLOWS** `direct_addition`

## 🔧 **Solution**

### **Step 1: Run Database Migration**

The migration file has been created: `supabase/migrations/068_fix_purchase_pipeline_documents_constraint.sql`

#### **Option A: Using Supabase CLI (Recommended)**

```bash
cd mzima-homes-rental-app
supabase db push
```

#### **Option B: Manual Execution**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the content of `supabase/migrations/068_fix_purchase_pipeline_documents_constraint.sql`
3. Execute the SQL

#### **Option C: Using Migration Script**

```bash
cd mzima-homes-rental-app
node scripts/run-migrations-api.js
```

### **Step 2: Test Database Operations**

1. Navigate to Purchase Pipeline in the app
2. Open a purchase record
3. Go to the Documents tab
4. Use the **Debug Component** to test database operations
5. Click "Run Database Tests" button
6. Verify all tests pass ✅

### **Step 3: Test Document Upload**

1. Try uploading a document (PDF, image, etc.)
2. Verify the upload succeeds
3. Check that the document appears in the list
4. Test N/A toggle functionality
5. Test notes functionality

## 📊 **Expected Results After Migration**

### **✅ Working Operations**

- ✅ Document uploads to `property_documents` table
- ✅ Status updates to `property_document_status` table
- ✅ N/A toggles and notes persistence
- ✅ Progress tracking calculations
- ✅ File operations (view, delete)

### **✅ Database Validation**

- ✅ `purchase_pipeline` accepted in both tables
- ✅ RLS policies allow team access
- ✅ Constraint validation prevents invalid pipelines

## 🚨 **Troubleshooting**

### **If Migration Fails**

1. Check Supabase connection
2. Verify you have admin/service role permissions
3. Check for existing constraint conflicts
4. Review Supabase logs for detailed errors

### **If Upload Still Fails**

1. Check browser console for detailed error messages
2. Verify the `property-docs` storage bucket exists
3. Check storage policies allow authenticated users
4. Verify file size is under 10MB limit

### **Common Error Messages**

#### **"Database constraint error"**

- **Cause**: Migration not run yet
- **Solution**: Run the migration script

#### **"Storage upload failed"**

- **Cause**: Storage bucket or policies issue
- **Solution**: Run `scripts/create-property-docs-bucket.js`

#### **"Authentication required"**

- **Cause**: User not logged in
- **Solution**: Ensure user is authenticated

## 🔍 **Debug Information**

### **Check Migration Status**

```sql
-- Check if constraint allows purchase_pipeline
SELECT
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint
WHERE conname = 'property_document_status_pipeline_check';
```

### **Test Constraint**

```sql
-- This should succeed after migration
INSERT INTO property_document_status (
    property_id,
    pipeline,
    doc_type,
    status
) VALUES (
    'test-id',
    'purchase_pipeline',
    'test_doc',
    'missing'
);
```

### **Check RLS Policies**

```sql
-- View all policies for document tables
SELECT * FROM pg_policies
WHERE tablename IN ('property_documents', 'property_document_status');
```

## 📝 **Migration Script Content**

The migration updates the constraint from:

```sql
-- OLD (only direct_addition)
CHECK (pipeline = 'direct_addition')
```

To:

```sql
-- NEW (supports all pipelines)
CHECK (pipeline IN ('direct_addition', 'purchase_pipeline', 'subdivision', 'handover'))
```

## ✅ **Verification Checklist**

- [ ] Migration script executed successfully
- [ ] Debug component tests all pass
- [ ] Document upload works
- [ ] Document status updates work
- [ ] N/A toggle works
- [ ] Notes functionality works
- [ ] Progress tracking displays correctly
- [ ] File view/delete operations work

## 🎯 **Next Steps After Fix**

1. Remove debug component from production views
2. Test with real documents
3. Verify progress tracking accuracy
4. Train users on new document system
5. Monitor for any remaining issues

---

**Once the migration is complete, the Purchase Pipeline Documents system will be fully functional with the same capabilities as Direct Addition Documents V2!** 🚀
