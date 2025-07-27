# Fix for FunctionsFetchError in Notifications Processing

## Problem Summary
The "Process Now" button on the notifications page fails with:
```
FunctionsFetchError: Failed to send a request to the Edge Function
```

This occurs at line 275 in `/src/app/dashboard/notifications/page.tsx` when calling `clientBusinessFunctions.processNotifications()`.

## Root Cause
The Edge Function `process-notifications` is **not deployed** to Supabase. Our diagnostic test confirmed:
- ❌ HTTP 404 "Requested function was not found"
- ❌ All requests (direct HTTP, Supabase client, authenticated) fail
- ✅ Function code exists locally in `supabase/functions/process-notifications/index.ts`

## Solution: Deploy the Edge Functions

### Option 1: Manual Deployment via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in the left sidebar

3. **Deploy process-notifications function**
   - Click "Create a new function"
   - Function name: `process-notifications`
   - Copy the code from `supabase/functions/process-notifications/index.ts`
   - Click "Deploy function"

4. **Set Environment Variables**
   - In Edge Functions settings, add:
     - `SUPABASE_URL`: Your Supabase URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ajrxvnakphkpkcssisxm

# Deploy the function
supabase functions deploy process-notifications
```

### Option 3: Temporary Fix - Enhanced Error Handling

If you can't deploy immediately, update the error handling to provide better user feedback:

```typescript
// In src/app/dashboard/notifications/page.tsx
const handleProcessNotifications = async () => {
  setProcessingNotifications(true)
  try {
    const { data, error } = await clientBusinessFunctions.processNotifications()

    if (error) {
      // Check if it's a deployment issue
      if (error.includes('not deployed') || error.includes('404')) {
        alert('Notification processing service is not yet deployed. Please contact your administrator to deploy the Edge Functions.')
        return
      }
      throw new Error(error)
    }

    alert(`Notifications processed successfully! ${data?.processed || 0} rules processed.`)

    // Refresh notification data and cron stats
    loadNotificationData()
    loadCronStats()
  } catch (err) {
    console.error('Error processing notifications:', err)
    
    // Provide specific error messages
    if (err.name === 'FunctionsFetchError' || err.message.includes('404')) {
      alert('The notification processing service is not available. Please ensure Edge Functions are deployed.')
    } else {
      alert('Failed to process notifications. Please try again.')
    }
  } finally {
    setProcessingNotifications(false)
  }
}
```

## Verification

After deploying the Edge Function, test it:

1. **Run the debug script:**
   ```bash
   node debug-edge-function.js
   ```

2. **Test in the application:**
   - Go to the notifications page
   - Click "Process Now"
   - Should see success message instead of error

## Additional Edge Functions to Deploy

For full functionality, also deploy these functions:

1. **cron-scheduler** - For automated scheduling
2. **send-email** - For email notifications  
3. **send-sms** - For SMS notifications

Use the same deployment process for each function.

## Current Error Handling

The `processNotifications` function in `supabase-client.ts` already has some error handling:

```typescript
async processNotifications() {
  try {
    const { data, error } = await supabase.functions.invoke('process-notifications', {
      body: {}
    })

    if (error) {
      // Handle Edge Function not deployed scenario
      if (error.status === 404 || error.context?.status === 404) {
        console.warn('Process notifications Edge Function not deployed. Returning mock response.')
        return {
          data: {
            message: 'Edge Function not deployed',
            processed: 0,
            status: 'not_deployed'
          },
          error: null
        }
      }

      return { data: null, error: handleSupabaseError(error) }
    }

    return { data, error: null }
  } catch (err: any) {
    // Handle network errors or function not found
    if (err?.status === 404 || err?.context?.status === 404) {
      console.warn('Process notifications Edge Function not deployed. Returning mock response.')
      return {
        data: {
          message: 'Edge Function not deployed',
          processed: 0,
          status: 'not_deployed'
        },
        error: null
      }
    }

    return { data: null, error: handleSupabaseError(err) }
  }
}
```

However, the FunctionsFetchError is being thrown before this error handling can catch it.

## Why This Happens

1. **FunctionsFetchError** is thrown by the Supabase Functions client when the network request fails
2. This happens at the fetch level, before the response can be processed
3. The 404 error handling in the code expects an HTTP response, not a fetch failure

## Long-term Solution

Deploy all Edge Functions to ensure full application functionality:

```bash
supabase functions deploy process-notifications
supabase functions deploy cron-scheduler  
supabase functions deploy send-email
supabase functions deploy send-sms
```

## Files Involved
- `/src/app/dashboard/notifications/page.tsx` - Where the error occurs
- `/src/lib/supabase-client.ts` - Contains `processNotifications()` function
- `/supabase/functions/process-notifications/index.ts` - The Edge Function code
- `/deploy-edge-functions.md` - Deployment instructions

## Prevention
- Set up CI/CD to automatically deploy Edge Functions
- Add deployment status checks to the application
- Provide clear error messages when services are unavailable
