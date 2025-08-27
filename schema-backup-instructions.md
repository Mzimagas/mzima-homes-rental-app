
# Schema Backup Instructions

## Required Before Any Table Archiving:

1. **Complete Table Schemas**:
   ```sql
   -- For each table, capture:
   SELECT
     'CREATE TABLE ' || table_name || ' (' ||
     string_agg(
       column_name || ' ' || data_type ||
       CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
       ', '
     ) || ');'
   FROM information_schema.columns
   WHERE table_schema = 'public'
   GROUP BY table_name;
   ```

2. **Foreign Key Relationships**:
   ```sql
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY';
   ```

3. **Indexes**:
   ```sql
   SELECT
     schemaname,
     tablename,
     indexname,
     indexdef
   FROM pg_indexes
   WHERE schemaname = 'public';
   ```

4. **Triggers and Functions**:
   ```sql
   SELECT
     trigger_name,
     event_manipulation,
     event_object_table,
     action_statement
   FROM information_schema.triggers
   WHERE trigger_schema = 'public';
   ```
