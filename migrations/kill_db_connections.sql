-- Kill All Database Connections Script
-- This script terminates all active connections to the current database

-- Show current connections before termination
SELECT 
    'Current active connections:' as info,
    count(*) as connection_count,
    current_database() as database_name
FROM pg_stat_activity
WHERE datname = current_database();

-- Show detailed connection information
SELECT 
    pid,
    usename as username,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
ORDER BY state_change DESC;

-- Terminate all active connections (except our own)
SELECT 
    pg_terminate_backend(pid) as terminated,
    pid,
    usename,
    application_name,
    state
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'active';

-- Terminate all idle connections
SELECT 
    pg_terminate_backend(pid) as terminated,
    pid,
    usename,
    application_name,
    state
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'idle';

-- Terminate idle in transaction connections
SELECT 
    pg_terminate_backend(pid) as terminated,
    pid,
    usename,
    application_name,
    state
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'idle in transaction';

-- Show remaining connections after termination
SELECT 
    'Remaining connections after termination:' as info,
    count(*) as remaining_connections,
    current_database() as database_name
FROM pg_stat_activity
WHERE datname = current_database();

-- Show any remaining connection details
SELECT 
    'Remaining connection details:' as info;
    
SELECT 
    pid,
    usename as username,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
ORDER BY state_change DESC;
