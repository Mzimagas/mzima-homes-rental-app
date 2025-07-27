# Supabase Setup and Troubleshooting Guide

This guide will help you fix the Supabase-related errors in your rental management application.

## Issues Identified

1. **Missing Database Function**: `get_cron_job_stats` function not found
2. **Missing Database Table**: `cron_job_history` table not found  
3. **Edge Functions Not Deployed**: `process-notifications` and `cron-scheduler` functions return 404
4. **Error Handling**: Improved to provide better user feedback

## Quick Fix Summary

The application has been updated with improved error handling and will now:
- Show helpful messages when database functions are missing
- Display mock data for cron job stats when the function isn't available
- Handle Edge Function deployment issues gracefully
- Provide better error messages to users

## Step-by-Step Fix Instructions

### 1. Apply Missing Database Migration

The `007_cron_job_history.sql` migration needs to be applied to your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ajrxvnakphkpkcssisxm`
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/migrations/007_cron_job_history.sql`
5. Paste and execute the SQL

**Option B: Using Supabase CLI (if installed)**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ajrxvnakphkpkcssisxm

# Push migrations
supabase db push
```

### 2. Deploy Edge Functions

Your Edge Functions need to be deployed to Supabase.

**Option A: Using Supabase Dashboard**
1. Go to **Edge Functions** in your Supabase Dashboard
2. Create new functions for:
   - `process-notifications`
   - `cron-scheduler`
   - `send-email`
   - `send-sms`
3. Copy the code from the respective files in `supabase/functions/`

**Option B: Using Supabase CLI**
```bash
# Deploy all functions
supabase functions deploy process-notifications
supabase functions deploy cron-scheduler
supabase functions deploy send-email
supabase functions deploy send-sms
```

### 3. Verify the Fixes

Run the test script to verify everything is working:
```bash
cd voi-rental-app
node test-database-functions.js
```

You should see:
- ✅ get_cron_job_stats function exists and works
- ✅ cron_job_history table exists
- ✅ process-notifications function works
- ✅ cron-scheduler function works

## What's Been Fixed in the Code

### 1. Enhanced Error Handling (`src/lib/supabase-client.ts`)
- Better error logging with more details
- Specific handling for missing functions (PGRST202 errors)
- Specific handling for missing tables (42P01 errors)
- Edge Function error handling (404 status codes)
- Network error handling

### 2. Graceful Fallbacks (`getCronJobStats` method)
- Returns mock data when the database function is missing
- Shows "not_deployed" status for jobs that haven't been set up
- Prevents the UI from breaking when backend services are unavailable

### 3. Improved Notifications Page (`src/app/dashboard/notifications/page.tsx`)
- Better error handling for cron stats loading
- Helpful messages when services are not deployed
- Visual indicators for deployment status
- Graceful degradation when services are unavailable

### 4. Edge Function Error Handling (`processNotifications` method)
- Detects when Edge Functions are not deployed (404 errors)
- Returns mock responses to prevent UI breakage
- Logs warnings for debugging

## Expected Behavior After Fixes

### Before Applying Database Migration
- Cron job stats will show mock data with "Not Deployed" badges
- No errors will be thrown, but functionality will be limited

### After Applying Database Migration
- Real cron job statistics will be displayed
- Database functions will work properly

### Before Deploying Edge Functions  
- Process notifications will return mock responses
- No errors will be thrown, but actual notification processing won't work

### After Deploying Edge Functions
- Full notification processing functionality will be available
- Real-time notification sending will work

## Troubleshooting

### If you still see errors after applying fixes:

1. **Check your environment variables** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Verify database connection**:
   ```bash
   node test-connection.js
   ```

3. **Check Supabase project status** in the dashboard

4. **Clear browser cache** and restart the development server:
   ```bash
   npm run dev
   ```

## Next Steps

1. Apply the database migration (Step 1 above)
2. Deploy the Edge Functions (Step 2 above)  
3. Test the application functionality
4. Set up automated cron scheduling if needed

The application will now work gracefully even if some backend services are not yet deployed, providing a better user experience during the setup process.
