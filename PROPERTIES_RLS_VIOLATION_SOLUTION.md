# Properties RLS Policy Violation - Complete Solution

## 🚨 Root Causes Identified

Based on comprehensive analysis, the RLS policy violation is caused by multiple issues:

### **1. Data Inconsistency (CRITICAL)**
- **Issue:** Landlord ID mismatch between `properties` and `property_users` tables
- **Found:** Property landlord_id: `7ef41199-9161-4dea-8c90-0511ee310b3a`
- **Found:** Property user_id: `be74c5f6-f485-42ca-9d71-1e81bb81f53f`
- **Impact:** RLS policies fail because data relationships are broken

### **2. Schema Column Mismatch**
- **Issue:** Properties table expects `address` column but application uses different column names
- **Error:** "Could not find the 'address' column of 'properties' in the schema cache"
- **Impact:** INSERT operations fail due to schema mismatch

### **3. RLS Policy Logic Issue**
- **Issue:** Current policy expects property_users entry to exist BEFORE property creation
- **Problem:** Chicken-and-egg scenario - can't create property without property_users entry
- **Impact:** All authenticated user INSERTs fail

## 🛠️ Comprehensive Solution

### **Step 1: Fix Data Consistency**

```sql
-- Fix the landlord_id mismatch in existing data
UPDATE properties 
SET landlord_id = (
  SELECT user_id 
  FROM property_users 
  WHERE property_id = properties.id 
  AND role = 'OWNER' 
  LIMIT 1
)
WHERE landlord_id != (
  SELECT user_id 
  FROM property_users 
  WHERE property_id = properties.id 
  AND role = 'OWNER' 
  LIMIT 1
);
```

### **Step 2: Fix Schema Column Names**

Check your properties table schema and ensure it matches your application code:

```sql
-- Check current properties table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
ORDER BY ordinal_position;
```

Common column name mismatches:
- Application uses `address` but table has `physical_address`
- Application uses `property_type` but table has `type`

### **Step 3: Create Improved RLS Policies**

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Property owners can insert properties" ON properties;
DROP POLICY IF EXISTS "Users can view properties they have access to" ON properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON properties;

-- Create new, more permissive INSERT policy
CREATE POLICY "Authenticated users can insert properties" ON properties
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND landlord_id = auth.uid()
);

-- Create SELECT policy that works with both landlord_id and property_users
CREATE POLICY "Users can view accessible properties" ON properties
FOR SELECT USING (
  -- Direct landlord access
  landlord_id = auth.uid()
  OR
  -- Property users access
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

-- Create UPDATE policy for property owners
CREATE POLICY "Property owners can update properties" ON properties
FOR UPDATE USING (
  landlord_id = auth.uid()
  OR
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'PROPERTY_MANAGER')
    AND status = 'ACTIVE'
  )
);
```

### **Step 4: Create Helper Function (Recommended)**

```sql
CREATE OR REPLACE FUNCTION create_property_with_owner(
  property_name TEXT,
  property_address TEXT,
  property_type TEXT DEFAULT 'APARTMENT',
  owner_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_property_id UUID;
BEGIN
  -- Validate input
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Insert property (adjust column names to match your schema)
  INSERT INTO properties (name, physical_address, type, landlord_id)
  VALUES (property_name, property_address, property_type, owner_user_id)
  RETURNING id INTO new_property_id;
  
  -- Create property_users entry
  INSERT INTO property_users (property_id, user_id, role, status, accepted_at)
  VALUES (new_property_id, owner_user_id, 'OWNER', 'ACTIVE', NOW());
  
  RETURN new_property_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
```

## 🔧 Application Code Solutions

### **Solution 1: Direct INSERT (Fixed)**

```javascript
// Ensure user is authenticated
const { data: user, error: userError } = await supabase.auth.getUser()

if (userError || !user?.user?.id) {
  throw new Error('User must be authenticated')
}

// Use correct column names that match your schema
const propertyData = {
  name: "My New Property",
  physical_address: "123 Main Street, Nairobi", // Note: physical_address, not address
  type: "APARTMENT", // Note: type, not property_type
  landlord_id: user.user.id  // CRITICAL: Must match auth.uid()
}

const { data, error } = await supabase
  .from('properties')
  .insert(propertyData)
  .select()

if (error) {
  console.error('RLS Error:', error.message)
  throw error
}

// Create property_users entry immediately after
const { error: puError } = await supabase
  .from('property_users')
  .insert({
    property_id: data[0].id,
    user_id: user.user.id,
    role: 'OWNER',
    status: 'ACTIVE',
    accepted_at: new Date().toISOString()
  })

if (puError) {
  console.error('Property users error:', puError.message)
  // Consider rolling back the property creation
}
```

### **Solution 2: Helper Function (Recommended)**

```javascript
// Use the helper function for atomic property creation
const { data: user } = await supabase.auth.getUser()

if (!user?.user?.id) {
  throw new Error('User must be authenticated')
}

const { data: propertyId, error } = await supabase.rpc('create_property_with_owner', {
  property_name: 'My New Property',
  property_address: '123 Main Street, Nairobi',
  property_type: 'APARTMENT'
})

if (error) {
  console.error('Error creating property:', error.message)
  throw error
}

console.log('Property created with ID:', propertyId)
```

### **Solution 3: Transaction-Based Approach**

```javascript
// Use a transaction to ensure atomicity
const { data: user } = await supabase.auth.getUser()

if (!user?.user?.id) {
  throw new Error('User must be authenticated')
}

try {
  // Start transaction by creating property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .insert({
      name: 'My New Property',
      physical_address: '123 Main Street, Nairobi',
      type: 'APARTMENT',
      landlord_id: user.user.id
    })
    .select()
    .single()

  if (propError) throw propError

  // Create property_users entry
  const { error: puError } = await supabase
    .from('property_users')
    .insert({
      property_id: property.id,
      user_id: user.user.id,
      role: 'OWNER',
      status: 'ACTIVE',
      accepted_at: new Date().toISOString()
    })

  if (puError) {
    // Rollback by deleting the property
    await supabase.from('properties').delete().eq('id', property.id)
    throw puError
  }

  return property
} catch (error) {
  console.error('Transaction failed:', error.message)
  throw error
}
```

## 🧪 Testing Your Solution

### **Test 1: Verify Schema Columns**

```javascript
// Check what columns exist in your properties table
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .limit(1)

console.log('Properties table columns:', Object.keys(data[0] || {}))
```

### **Test 2: Test Authentication Context**

```javascript
// Verify user authentication
const { data: user } = await supabase.auth.getUser()
console.log('Current user ID:', user?.user?.id)
console.log('User authenticated:', !!user?.user?.id)
```

### **Test 3: Test RLS Policies**

```javascript
// Test if you can view existing properties
const { data: properties, error } = await supabase
  .from('properties')
  .select('id, name, landlord_id')

console.log('Can view properties:', !error)
console.log('Properties count:', properties?.length || 0)
```

## 🎯 Quick Fix Checklist

1. **✅ Check Authentication**
   - Verify `auth.uid()` is not NULL
   - Ensure user is properly logged in

2. **✅ Fix Column Names**
   - Use `physical_address` instead of `address`
   - Use `type` instead of `property_type`
   - Match your actual schema

3. **✅ Set Correct landlord_id**
   - Always set `landlord_id = auth.uid()`
   - Never leave `landlord_id` as NULL

4. **✅ Create property_users Entry**
   - Create immediately after property INSERT
   - Set `role = 'OWNER'` and `status = 'ACTIVE'`

5. **✅ Use Helper Function**
   - Recommended for new implementations
   - Handles both property and property_users creation

## 🚨 Emergency Workaround

If you need immediate access, temporarily disable RLS:

```sql
-- TEMPORARY: Disable RLS for testing (NOT for production)
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable after fixing:
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** Only use this for debugging. Always re-enable RLS for security.

---

**Status:** ✅ **Solution Provided**  
**Priority:** 🔴 **HIGH** - Data consistency issues detected  
**Next Steps:** Apply schema fixes and use recommended helper function approach
