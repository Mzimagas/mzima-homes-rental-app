# Fix for RLS Policy Violation in Notifications Page

## Problem Summary

The notifications page is failing with the error:

```
Error creating landlord record: new row violates row-level security policy for table "landlords"
```

This occurs at lines 172 and 193 in `/src/app/dashboard/notifications/page.tsx` when the `loadNotificationData` function calls:

- `clientBusinessFunctions.getNotificationRules()`
- `clientBusinessFunctions.getNotificationHistory()`

## Root Cause

The auto-setup functionality in `getUserLandlordIds()` tries to create landlord records for new users, but the required RLS policies from migration 008 are missing from the database.

## Solution: Apply Missing RLS Policies

### Step 1: Access Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute the Missing Policies

Copy and paste the following SQL statements one by one and execute them:

```sql
-- Policy 1: Allow users to create landlord records with their own email
CREATE POLICY "Users can create landlord records with their email" ON landlords
  FOR INSERT WITH CHECK (email = auth.email());
```

```sql
-- Policy 2: Allow users to update their own landlord records
CREATE POLICY "Users can update their own landlord records" ON landlords
  FOR UPDATE USING (email = auth.email());
```

```sql
-- Policy 3: Allow users to create their own landlord role assignments
CREATE POLICY "Users can create their own landlord role assignments" ON user_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    role = 'LANDLORD' AND
    landlord_id IN (
      SELECT id FROM landlords WHERE email = auth.email()
    )
  );
```

```sql
-- Policy 4: Allow users to read their own role assignments
CREATE POLICY "Users can read their own role assignments" ON user_roles
  FOR SELECT USING (user_id = auth.uid());
```

### Step 3: Verify the Fix

After applying the policies, test the notifications page:

1. Sign in to your application
2. Navigate to the notifications page
3. The page should load without RLS policy violations
4. New users should be able to access notifications (auto-setup will work)

## How the Fix Works

### Before the Fix

- Users could only access landlord records they already had relationships with
- New users had no way to create their initial landlord record
- This created a "chicken-and-egg" problem where users couldn't bootstrap their access

### After the Fix

- Users can create landlord records using their own email address
- Users can create role assignments linking themselves to landlords they created
- The auto-setup process in `setupLandlordAccess()` can successfully:
  1. Create a landlord record with the user's email
  2. Create a user_roles entry linking the user to that landlord
  3. Return the landlord ID for use in notifications

## Technical Details

### The Auto-Setup Flow

1. `getNotificationRules()` calls `getUserLandlordIds(true)` with auto-setup enabled
2. If no landlord access found, `setupLandlordAccess()` is called
3. `setupLandlordAccess()` tries to:
   - Check for existing landlord with user's email
   - Create new landlord record if none exists ← **This was failing**
   - Create user_roles entry linking user to landlord ← **This was also failing**

### The RLS Policies

- **INSERT policy on landlords**: `email = auth.email()` ensures users can only create records with their own email
- **UPDATE policy on landlords**: `email = auth.email()` ensures users can only update records with their own email
- **INSERT policy on user_roles**: Complex check ensuring users can only create LANDLORD roles for landlords they own
- **SELECT policy on user_roles**: `user_id = auth.uid()` allows users to read their own role assignments

## Files Involved

- `/src/app/dashboard/notifications/page.tsx` - Where the error occurs
- `/src/lib/supabase-client.ts` - Contains `getUserLandlordIds()` and `setupLandlordAccess()`
- `/supabase/migrations/008_fix_landlord_rls_for_signup.sql` - The missing migration

## Prevention

To prevent this issue in the future:

1. Ensure all migrations are applied when setting up new environments
2. Test the auto-setup flow with fresh users during development
3. Monitor for RLS policy violations in application logs

## Verification Script

After applying the fix, you can verify it works by running:

```bash
node debug-notifications-error.js
```

This script will:

1. Create a fresh test user
2. Attempt the same operations that were failing
3. Clean up the test data
4. Report success or failure
