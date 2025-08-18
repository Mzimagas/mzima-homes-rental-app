-- Fix user_role enum to include all required values
-- This script ensures the user_role enum has all necessary values

DO $$
BEGIN
    -- Check if user_role enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        RAISE NOTICE 'user_role enum exists, checking values...';
        
        -- Check and add missing enum values
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'super_admin') THEN
            ALTER TYPE user_role ADD VALUE 'super_admin';
            RAISE NOTICE 'Added super_admin to user_role enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'admin') THEN
            ALTER TYPE user_role ADD VALUE 'admin';
            RAISE NOTICE 'Added admin to user_role enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'manager') THEN
            ALTER TYPE user_role ADD VALUE 'manager';
            RAISE NOTICE 'Added manager to user_role enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'sales_agent') THEN
            ALTER TYPE user_role ADD VALUE 'sales_agent';
            RAISE NOTICE 'Added sales_agent to user_role enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'finance') THEN
            ALTER TYPE user_role ADD VALUE 'finance';
            RAISE NOTICE 'Added finance to user_role enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'operations') THEN
            ALTER TYPE user_role ADD VALUE 'operations';
            RAISE NOTICE 'Added operations to user_role enum';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'viewer') THEN
            ALTER TYPE user_role ADD VALUE 'viewer';
            RAISE NOTICE 'Added viewer to user_role enum';
        END IF;
        
    ELSE
        -- Create the enum if it doesn't exist
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_agent', 'finance', 'operations', 'viewer');
        RAISE NOTICE 'Created user_role enum with all values';
    END IF;
    
    RAISE NOTICE 'user_role enum fix completed successfully';
END $$;

-- Show current enum values
SELECT 'Current user_role enum values:' as info;
SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;
