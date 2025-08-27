# Handover Pipeline Setup Guide

## Overview

The handover pipeline functionality requires a database table to be created before it can be used. This guide provides multiple methods to set up the required `handover_pipeline` table.

## Quick Setup (Recommended)

### Method 1: Complete Cleanup and Setup

Use this method if you're getting trigger errors or want a fresh installation:

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the entire contents of `CLEANUP_AND_SETUP_HANDOVER_PIPELINE.sql`
4. Paste and run the SQL script
5. Refresh the application

This script will:

- ✅ Clean up any partial installations
- ✅ Create the handover_pipeline table with all required fields
- ✅ Add proper indexes for performance
- ✅ Create triggers for automatic timestamp updates
- ✅ Verify successful installation

### Method 2: Basic Setup

If you prefer a simpler approach:

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the entire contents of `SETUP_HANDOVER_PIPELINE.sql`
4. Paste and run the SQL script
5. Refresh the application

## Alternative Methods

### Method 3: Using Supabase CLI (Requires Docker)

```bash
# Reset the entire database (applies all migrations)
npx supabase db reset

# Or push only new migrations
npx supabase db push
```

### Method 4: Manual Migration

Apply the migration file directly:

- File: `supabase/migrations/064_create_handover_pipeline.sql`
- Use your preferred database management tool

## Troubleshooting

### Error: "trigger already exists"

This happens when running the setup multiple times. Use the **Complete Cleanup and Setup** method (Method 1) which handles this automatically.

### Error: "table does not exist"

The handover_pipeline table hasn't been created yet. Follow any of the setup methods above.

### Error: "function update_updated_at_column does not exist"

This is normal - the trigger creation will be skipped automatically. The table will still work correctly.

## Verification

After running the setup, you should see:

- ✅ Success messages in the SQL Editor
- ✅ Table structure displayed
- ✅ Initial record count (should be 0)
- ✅ No error messages in the application

## Features Available After Setup

Once the table is created, you'll have access to:

### Handover Management

- Create handover opportunities for properties
- Track buyer information and financial details
- Manage 8-stage handover pipeline process

### Stage Tracking

- Interactive stage progression
- Status updates with notes
- Automatic progress calculation
- Visual progress indicators

### Financial Tracking

- Asking and negotiated prices
- Deposit and balance tracking
- Expected profit calculations
- ROI percentage tracking

### Workflow Management

- Buyer contact management
- Legal representative tracking
- Document and inspection notes
- Risk assessment documentation

## Database Schema

The `handover_pipeline` table includes:

### Core Fields

- `id` - Unique identifier
- `property_id` - Reference to properties table
- `property_name` - Property name
- `property_address` - Property address

### Buyer Information

- `buyer_name` - Buyer's full name
- `buyer_contact` - Phone number
- `buyer_email` - Email address
- `buyer_address` - Buyer's address

### Financial Details

- `asking_price_kes` - Initial asking price
- `negotiated_price_kes` - Final negotiated price
- `deposit_received_kes` - Deposit amount received
- `expected_profit_kes` - Expected profit amount
- `expected_profit_percentage` - Expected ROI percentage

### Pipeline Management

- `handover_status` - Overall status (PENDING/IN_PROGRESS/COMPLETED)
- `current_stage` - Current active stage (1-8)
- `overall_progress` - Completion percentage (0-100)
- `pipeline_stages` - JSON data for stage details

### Additional Fields

- Legal representative information
- Risk assessment notes
- Property condition notes
- Target and actual completion dates
- Assignment and tracking fields
- Audit timestamps

## Support

If you encounter any issues:

1. Check the Supabase SQL Editor for error messages
2. Verify your database permissions
3. Ensure the properties table exists (required dependency)
4. Try the Complete Cleanup and Setup method for a fresh start

The handover pipeline functionality will be fully operational once the database setup is complete.
