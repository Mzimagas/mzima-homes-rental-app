-- Check current database state
-- This script shows what types, tables, and enum values currently exist

-- Show all custom types
SELECT 'Custom Types:' as info;
SELECT typname as type_name, typtype as type_kind
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') 
  AND typtype = 'e'
ORDER BY typname;

-- Show user_role enum values if it exists
SELECT 'user_role enum values:' as info;
SELECT enumlabel as role_value, enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- Show all tables
SELECT 'Tables:' as info;
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show all functions
SELECT 'Functions:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check if specific tables exist
SELECT 'Table existence check:' as info;
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') 
         THEN 'parcels: EXISTS' 
         ELSE 'parcels: NOT EXISTS' END as parcels_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
         THEN 'user_profiles: EXISTS' 
         ELSE 'user_profiles: NOT EXISTS' END as user_profiles_status;

-- Show any existing data counts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') THEN
        RAISE NOTICE 'Parcels count: %', (SELECT COUNT(*) FROM parcels);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        RAISE NOTICE 'User profiles count: %', (SELECT COUNT(*) FROM user_profiles);
    END IF;
END $$;
