# Supabase CLI Backup Instructions

To create a complete database dump using Supabase CLI:

1. Ensure you're logged in to Supabase CLI:
   ```bash
   supabase login
   ```

2. Link your project (if not already linked):
   ```bash
   supabase link --project-ref ajrxvnakphkpkcssisxm
   ```

3. Create the database dump:
   ```bash
   supabase db dump --file /Users/a0722379217/Downloads/Mzima Homes App/mzima-homes-rental-app/backups/database-backup-2025-08-27T10-04-38-896Z/supabase-dump.sql
   ```

4. Verify the dump was created:
   ```bash
   ls -la /Users/a0722379217/Downloads/Mzima Homes App/mzima-homes-rental-app/backups/database-backup-2025-08-27T10-04-38-896Z/supabase-dump.sql
   ```

This will create a complete SQL dump of your database schema and data.
