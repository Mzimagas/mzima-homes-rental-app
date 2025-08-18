-- Fix agreement_status enum to include all required values
-- This script ensures the agreement_status enum has all necessary values

DO $$
BEGIN
    -- Check if agreement_status enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agreement_status') THEN
        RAISE NOTICE 'agreement_status enum exists, checking values...';
        
        -- Check and add missing enum values
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'draft') THEN
            ALTER TYPE agreement_status ADD VALUE 'draft';
            RAISE NOTICE 'Added draft to agreement_status enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'active') THEN
            ALTER TYPE agreement_status ADD VALUE 'active';
            RAISE NOTICE 'Added active to agreement_status enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'completed') THEN
            ALTER TYPE agreement_status ADD VALUE 'completed';
            RAISE NOTICE 'Added completed to agreement_status enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'settled') THEN
            ALTER TYPE agreement_status ADD VALUE 'settled';
            RAISE NOTICE 'Added settled to agreement_status enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'cancelled') THEN
            ALTER TYPE agreement_status ADD VALUE 'cancelled';
            RAISE NOTICE 'Added cancelled to agreement_status enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status') AND enumlabel = 'defaulted') THEN
            ALTER TYPE agreement_status ADD VALUE 'defaulted';
            RAISE NOTICE 'Added defaulted to agreement_status enum';
        END IF;
        
    ELSE
        -- Create the enum if it doesn't exist
        CREATE TYPE agreement_status AS ENUM ('draft', 'active', 'completed', 'settled', 'cancelled', 'defaulted');
        RAISE NOTICE 'Created agreement_status enum with all values';
    END IF;
    
    RAISE NOTICE 'agreement_status enum fix completed successfully';
END $$;

-- Show current enum values
SELECT 'Current agreement_status enum values:' as info;
SELECT enumlabel as status_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agreement_status')
ORDER BY enumsortorder;
