# Kill All Database Connections - Quick Commands

## 🔌 **Immediate Solutions**

### **Option 1: Single SQL Command (Fastest)**

```sql
-- Kill all connections except your own
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
```

### **Option 2: Using psql Command Line**

```bash
# Replace with your actual database details
psql -h localhost -U postgres -d land_management -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
"
```

### **Option 3: Using the SQL File**

```bash
# Run the kill connections SQL file
psql -h localhost -U postgres -d land_management -f migrations/kill_db_connections.sql
```

### **Option 4: Using the Shell Script**

```bash
# Make executable and run
chmod +x migrations/kill_connections.sh
./migrations/kill_connections.sh
```

## 🔍 **Check Current Connections First**

```sql
-- See all current connections
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start DESC;
```

## 🎯 **Complete Workflow**

```bash
# 1. Check connections
psql -h localhost -U postgres -d land_management -c "
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid();
"

# 2. Kill all connections
psql -h localhost -U postgres -d land_management -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid();
"

# 3. Verify connections are gone
psql -h localhost -U postgres -d land_management -c "
SELECT count(*) as remaining_connections
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid();
"

# 4. Now run your migrations
./migrations/run_migrations.sh
```

## 🚨 **For Supabase Users**

If you're using Supabase, you can run this in the SQL Editor:

```sql
-- In Supabase SQL Editor
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND usename != 'supabase_admin';
```

## ⚡ **Emergency Reset (Nuclear Option)**

If connections won't die, restart the database service:

```bash
# For local PostgreSQL
sudo systemctl restart postgresql

# For Docker PostgreSQL
docker restart your-postgres-container

# For Supabase - use their dashboard to restart
```

## 🔧 **Troubleshooting**

### If connections keep coming back:

1. **Stop your application** that's connecting to the database
2. **Check for connection poolers** (pgbouncer, etc.)
3. **Look for background jobs** or scheduled tasks
4. **Check for IDE connections** (pgAdmin, DBeaver, etc.)

### Common connection sources:

- Your application server
- Database management tools (pgAdmin, DBeaver, etc.)
- IDE database connections
- Background job processors
- Connection poolers
- Other developers' connections

## 📋 **Quick Reference**

| Command                                                                                                                  | Purpose                 |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();`                                              | Count total connections |
| `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();` | Kill all connections    |
| `SELECT pid, usename, state FROM pg_stat_activity WHERE datname = current_database();`                                   | List all connections    |

---

**💡 Pro Tip**: Always kill connections before running database migrations or schema changes to avoid conflicts!
