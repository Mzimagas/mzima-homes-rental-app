-- Fix for existing types error
-- This script handles the case where some types already exist

-- Check and create missing types only
DO $$ 
BEGIN
    -- Check and create tenure_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenure_type') THEN
        CREATE TYPE tenure_type AS ENUM ('freehold', 'leasehold');
        RAISE NOTICE 'Created tenure_type';
    ELSE
        RAISE NOTICE 'tenure_type already exists, skipping';
    END IF;
    
    -- Check and create land_use_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'land_use_type') THEN
        CREATE TYPE land_use_type AS ENUM ('residential', 'commercial', 'agricultural', 'industrial', 'mixed', 'recreational', 'institutional');
        RAISE NOTICE 'Created land_use_type';
    ELSE
        RAISE NOTICE 'land_use_type already exists, skipping';
    END IF;
    
    -- Check and create entity_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
        CREATE TYPE entity_type AS ENUM ('individual', 'company', 'partnership', 'trust', 'government');
        RAISE NOTICE 'Created entity_type';
    ELSE
        RAISE NOTICE 'entity_type already exists, skipping';
    END IF;
    
    -- Check and create encumbrance_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'encumbrance_type') THEN
        CREATE TYPE encumbrance_type AS ENUM ('charge', 'caveat', 'lien', 'court_order', 'restriction');
        RAISE NOTICE 'Created encumbrance_type';
    ELSE
        RAISE NOTICE 'encumbrance_type already exists, skipping';
    END IF;
    
    -- Check and create survey_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'survey_status') THEN
        CREATE TYPE survey_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
        RAISE NOTICE 'Created survey_status';
    ELSE
        RAISE NOTICE 'survey_status already exists, skipping';
    END IF;
    
    -- Check and create user_role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_agent', 'finance', 'operations', 'viewer');
        RAISE NOTICE 'Created user_role';
    ELSE
        RAISE NOTICE 'user_role already exists, skipping';
    END IF;
    
    -- Check and create subdivision_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subdivision_status') THEN
        CREATE TYPE subdivision_status AS ENUM ('planning', 'approved', 'in_progress', 'completed', 'cancelled');
        RAISE NOTICE 'Created subdivision_status';
    ELSE
        RAISE NOTICE 'subdivision_status already exists, skipping';
    END IF;
    
    -- Check and create plot_stage if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plot_stage') THEN
        CREATE TYPE plot_stage AS ENUM ('raw', 'surveyed', 'ready_for_sale', 'reserved', 'sold', 'transferred');
        RAISE NOTICE 'Created plot_stage';
    ELSE
        RAISE NOTICE 'plot_stage already exists, skipping';
    END IF;
    
    -- Check and create access_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_type') THEN
        CREATE TYPE access_type AS ENUM ('public_road', 'private_road', 'footpath', 'no_access');
        RAISE NOTICE 'Created access_type';
    ELSE
        RAISE NOTICE 'access_type already exists, skipping';
    END IF;
    
    -- Check and create utility_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utility_level') THEN
        CREATE TYPE utility_level AS ENUM ('none', 'water_only', 'power_only', 'water_power', 'full_utilities');
        RAISE NOTICE 'Created utility_level';
    ELSE
        RAISE NOTICE 'utility_level already exists, skipping';
    END IF;
    
    -- Check and create client_source if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_source') THEN
        CREATE TYPE client_source AS ENUM ('walk_in', 'referral', 'agent', 'marketing', 'website', 'social_media', 'bulk_import');
        RAISE NOTICE 'Created client_source';
    ELSE
        RAISE NOTICE 'client_source already exists, skipping';
    END IF;
    
    -- Check and create payment_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'bank_eft', 'mpesa', 'card', 'mobile_money');
        RAISE NOTICE 'Created payment_method';
    ELSE
        RAISE NOTICE 'payment_method already exists, skipping';
    END IF;
    
    -- Check and create invoice_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'unpaid', 'partly_paid', 'paid', 'overdue', 'cancelled');
        RAISE NOTICE 'Created invoice_status';
    ELSE
        RAISE NOTICE 'invoice_status already exists, skipping';
    END IF;
    
    -- Check and create document_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'title', 'deed_plan', 'survey_report', 'agreement', 'receipt', 'invoice',
            'id_copy', 'kra_pin', 'passport', 'photo', 'correspondence', 'legal',
            'approval', 'eia', 'nema', 'physical_planning', 'wayleave', 'other'
        );
        RAISE NOTICE 'Created document_type';
    ELSE
        RAISE NOTICE 'document_type already exists, skipping';
    END IF;
    
    -- Check and create access_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_level') THEN
        CREATE TYPE access_level AS ENUM ('public', 'internal', 'restricted', 'confidential');
        RAISE NOTICE 'Created access_level';
    ELSE
        RAISE NOTICE 'access_level already exists, skipping';
    END IF;
    
END $$;

-- Show all existing types
SELECT 'Existing custom types:' as info;
SELECT typname as type_name 
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') 
  AND typtype = 'e'
ORDER BY typname;
