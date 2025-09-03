-- Test Database Fixes
-- Run this after applying database-fixes.sql to verify everything works

-- 1. Test table visibility
SELECT 'Testing table visibility...' as test_step;

-- Check if tables are visible to PostgREST
SELECT 
  schemaname, 
  tablename, 
  hasindexes, 
  hasrules, 
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('rent_invoices', 'payments', 'tenants', 'units', 'properties')
ORDER BY tablename;

-- 2. Test function existence
SELECT 'Testing function existence...' as test_step;

SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_tenant_balance_summary', 'get_rent_balance_summary');

-- 3. Test function calls with dummy data
SELECT 'Testing function calls...' as test_step;

-- Test with a dummy UUID (should return zeros)
SELECT * FROM get_tenant_balance_summary('00000000-0000-0000-0000-000000000000');
SELECT * FROM get_rent_balance_summary('00000000-0000-0000-0000-000000000000');

-- 4. Test basic table queries
SELECT 'Testing basic table queries...' as test_step;

-- These should return empty results but no errors
SELECT COUNT(*) as rent_invoices_count FROM rent_invoices;
SELECT COUNT(*) as payments_count FROM payments;

-- 5. Test permissions
SELECT 'Testing permissions...' as test_step;

-- Check table permissions
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name IN ('rent_invoices', 'payments')
  AND grantee IN ('anon', 'authenticated', 'service_role');

-- Check function permissions  
SELECT 
  grantee,
  routine_name,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('get_tenant_balance_summary', 'get_rent_balance_summary')
  AND grantee IN ('anon', 'authenticated', 'service_role');

-- 6. Test RLS policies
SELECT 'Testing RLS policies...' as test_step;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('rent_invoices', 'payments');

-- Success message
SELECT 'All tests completed! Check results above for any issues.' as final_result;
