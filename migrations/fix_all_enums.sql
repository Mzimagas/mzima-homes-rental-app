-- Fix all enums to include required values
-- This script ensures all enums have the necessary values for the migrations

DO $$
BEGIN
    RAISE NOTICE 'Starting comprehensive enum fix...';
    
    -- Fix agreement_status enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agreement_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'draft') THEN
            ALTER TYPE agreement_status ADD VALUE 'draft';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'active') THEN
            ALTER TYPE agreement_status ADD VALUE 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'completed') THEN
            ALTER TYPE agreement_status ADD VALUE 'completed';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'settled') THEN
            ALTER TYPE agreement_status ADD VALUE 'settled';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'cancelled') THEN
            ALTER TYPE agreement_status ADD VALUE 'cancelled';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'defaulted') THEN
            ALTER TYPE agreement_status ADD VALUE 'defaulted';
        END IF;
        RAISE NOTICE 'Fixed agreement_status enum';
    END IF;
    
    -- Fix client_source enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_source') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'walk_in') THEN
            ALTER TYPE client_source ADD VALUE 'walk_in';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'referral') THEN
            ALTER TYPE client_source ADD VALUE 'referral';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'agent') THEN
            ALTER TYPE client_source ADD VALUE 'agent';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'marketing') THEN
            ALTER TYPE client_source ADD VALUE 'marketing';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'website') THEN
            ALTER TYPE client_source ADD VALUE 'website';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'social_media') THEN
            ALTER TYPE client_source ADD VALUE 'social_media';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_source') AND enumlabel = 'bulk_import') THEN
            ALTER TYPE client_source ADD VALUE 'bulk_import';
        END IF;
        RAISE NOTICE 'Fixed client_source enum';
    END IF;
    
    -- Fix listing_status enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_status') AND enumlabel = 'draft') THEN
            ALTER TYPE listing_status ADD VALUE 'draft';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_status') AND enumlabel = 'active') THEN
            ALTER TYPE listing_status ADD VALUE 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_status') AND enumlabel = 'sold') THEN
            ALTER TYPE listing_status ADD VALUE 'sold';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_status') AND enumlabel = 'withdrawn') THEN
            ALTER TYPE listing_status ADD VALUE 'withdrawn';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'listing_status') AND enumlabel = 'expired') THEN
            ALTER TYPE listing_status ADD VALUE 'expired';
        END IF;
        RAISE NOTICE 'Fixed listing_status enum';
    END IF;
    
    -- Fix offer_status enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status') AND enumlabel = 'draft') THEN
            ALTER TYPE offer_status ADD VALUE 'draft';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status') AND enumlabel = 'reserved') THEN
            ALTER TYPE offer_status ADD VALUE 'reserved';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status') AND enumlabel = 'accepted') THEN
            ALTER TYPE offer_status ADD VALUE 'accepted';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status') AND enumlabel = 'declined') THEN
            ALTER TYPE offer_status ADD VALUE 'declined';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status') AND enumlabel = 'expired') THEN
            ALTER TYPE offer_status ADD VALUE 'expired';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status') AND enumlabel = 'cancelled') THEN
            ALTER TYPE offer_status ADD VALUE 'cancelled';
        END IF;
        RAISE NOTICE 'Fixed offer_status enum';
    END IF;
    
    -- Fix payment_terms enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_terms') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_terms') AND enumlabel = 'cash') THEN
            ALTER TYPE payment_terms ADD VALUE 'cash';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_terms') AND enumlabel = 'installments') THEN
            ALTER TYPE payment_terms ADD VALUE 'installments';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_terms') AND enumlabel = 'mortgage') THEN
            ALTER TYPE payment_terms ADD VALUE 'mortgage';
        END IF;
        RAISE NOTICE 'Fixed payment_terms enum';
    END IF;
    
    -- Fix pricing_strategy enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_strategy') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pricing_strategy') AND enumlabel = 'flat') THEN
            ALTER TYPE pricing_strategy ADD VALUE 'flat';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pricing_strategy') AND enumlabel = 'negotiable') THEN
            ALTER TYPE pricing_strategy ADD VALUE 'negotiable';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pricing_strategy') AND enumlabel = 'auction') THEN
            ALTER TYPE pricing_strategy ADD VALUE 'auction';
        END IF;
        RAISE NOTICE 'Fixed pricing_strategy enum';
    END IF;
    
    -- Fix installment_frequency enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_frequency') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'installment_frequency') AND enumlabel = 'monthly') THEN
            ALTER TYPE installment_frequency ADD VALUE 'monthly';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'installment_frequency') AND enumlabel = 'quarterly') THEN
            ALTER TYPE installment_frequency ADD VALUE 'quarterly';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'installment_frequency') AND enumlabel = 'semi_annual') THEN
            ALTER TYPE installment_frequency ADD VALUE 'semi_annual';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'installment_frequency') AND enumlabel = 'annual') THEN
            ALTER TYPE installment_frequency ADD VALUE 'annual';
        END IF;
        RAISE NOTICE 'Fixed installment_frequency enum';
    END IF;
    
    RAISE NOTICE 'Comprehensive enum fix completed successfully!';
END $$;

-- Show all enum values for verification
SELECT 'All enum types and their values:' as info;

SELECT 
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;
