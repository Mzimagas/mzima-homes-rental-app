# Edge Functions Deployment Guide

Since the Edge Functions are not deployed, here's how to deploy them manually using the Supabase Dashboard.

## Functions to Deploy

### 1. process-notifications

**Function Name**: `process-notifications`
**File**: `supabase/functions/process-notifications/index.ts`

This function processes automated notifications for rent reminders, overdue payments, and lease expiry.

### 2. cron-scheduler  

**Function Name**: `cron-scheduler`
**File**: `supabase/functions/cron-scheduler/index.ts`

This function manages the scheduling and execution of cron jobs.

### 3. send-email

**Function Name**: `send-email`
**File**: `supabase/functions/send-email/index.ts`

This function handles email sending functionality.

### 4. send-sms

**Function Name**: `send-sms`
**File**: `supabase/functions/send-sms/index.ts`

This function handles SMS sending functionality.

## Manual Deployment Steps

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `ajrxvnakphkpkcssisxm`

2. **Navigate to Edge Functions**
   - Click on "Edge Functions" in the left sidebar

3. **Create New Function**
   - Click "Create a new function"
   - Enter the function name (e.g., `process-notifications`)
   - Copy and paste the code from the corresponding file

4. **Deploy Function**
   - Click "Deploy function"
   - Wait for deployment to complete

5. **Repeat for all functions**
   - Repeat steps 3-4 for each function listed above

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref ajrxvnakphkpkcssisxm

# Deploy functions
supabase functions deploy process-notifications
supabase functions deploy cron-scheduler
supabase functions deploy send-email
supabase functions deploy send-sms
```

## Verification

After deployment, run the test script:
```bash
node test-database-functions.js
```

You should see successful responses instead of 404 errors.

## Environment Variables

Make sure these environment variables are set in your Supabase Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST` (for email function)
- `SMTP_PORT` (for email function)
- `SMTP_USER` (for email function)
- `SMTP_PASS` (for email function)
- `SMS_API_KEY` (for SMS function)
- `SMS_SENDER_ID` (for SMS function)

These can be set in the Supabase Dashboard under Edge Functions > Settings.
