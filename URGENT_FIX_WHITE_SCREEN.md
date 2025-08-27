# 🚨 URGENT: Fix White Screen Issue

## Problem

The production deployment shows a white screen because environment variables are missing.

## Immediate Solution

### Step 1: Configure Environment Variables in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/mzimagas-projects/mzima-rental-2025/settings/environment-variables

2. **Add these REQUIRED environment variables**:

   **Variable Name**: `NEXT_PUBLIC_SUPABASE_URL`
   **Value**: `https://ajrxvnakphkpkcssisxm.supabase.co`
   **Environment**: Production, Preview, Development

   **Variable Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   **Value**: `[REMOVED FOR SECURITY - GET FROM SUPABASE DASHBOARD]`
   **Environment**: Production, Preview, Development

   **Variable Name**: `SUPABASE_SERVICE_ROLE_KEY`
   **Value**: `[REMOVED FOR SECURITY - GET FROM SUPABASE DASHBOARD]`
   **Environment**: Production, Preview, Development

   **Variable Name**: `NEXT_PUBLIC_APP_NAME`
   **Value**: `Mzima Homes`
   **Environment**: Production, Preview, Development

   **Variable Name**: `NEXT_PUBLIC_APP_URL`
   **Value**: `https://mzima-rental-2025-ev0tdhsq7-mzimagas-projects.vercel.app`
   **Environment**: Production, Preview, Development

### Step 2: Redeploy After Adding Variables

After adding all environment variables:

1. Go to: https://vercel.com/mzimagas-projects/mzima-rental-2025
2. Click on the latest deployment
3. Click "Redeploy" button
4. Wait for deployment to complete

### Step 3: Alternative - Quick CLI Redeploy

Or run this command from your terminal:

```bash
cd voi-rental-app
npx vercel --prod
```

## Expected Result

After adding environment variables and redeploying:

- White screen should be resolved
- Application should load properly
- Login/signup should work
- Database connectivity should be restored

## If Still Having Issues

1. Check browser console for JavaScript errors (F12 → Console)
2. Check Vercel function logs in dashboard
3. Verify all environment variables are correctly set
4. Ensure no typos in environment variable names or values

## Quick Test

Once fixed, test these URLs:

- Main app: https://mzima-rental-2025-ev0tdhsq7-mzimagas-projects.vercel.app
- Login page: https://mzima-rental-2025-ev0tdhsq7-mzimagas-projects.vercel.app/auth/login
