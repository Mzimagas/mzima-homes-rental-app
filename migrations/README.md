# Database Migrations for Enhanced User Management System

This directory contains database migrations for the enhanced user management system with member numbers, permission templates, and granular access control.

## 📋 Migration Overview

### Migration Files

1. **001_create_user_management_tables.sql**
   - Creates enhanced user management tables
   - Adds member number, phone authentication, profile tracking
   - Implements granular permission system
   - Sets up audit trail and next of kin tables

2. **002_create_permission_templates.sql**
   - Creates permission templates for role-based access
   - Defines Admin, Supervisor, Staff, Member role templates
   - Sets up permission sections and detail types
   - Includes helper functions for permission management

3. **003_migrate_existing_users.sql**
   - Migrates existing users to the new system
   - Assigns default member numbers and permissions
   - Creates backward compatibility views
   - Includes verification functions

## 🚀 Running Migrations

### Prerequisites

Ensure you have the following environment variables set:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run All Migrations

```bash
# Run all pending migrations
npm run migrate

# Verify migration results
npm run migrate:verify
```

### Manual Migration Execution

You can also run migrations manually using the Supabase SQL editor:

1. Copy the content of each migration file
2. Execute them in order in the Supabase SQL editor
3. Verify the results using the verification functions

## 📊 Database Schema Changes

### New Tables Created

#### enhanced_users
- **Purpose**: Enhanced user management with member numbers
- **Key Fields**: member_number, phone_number, id_passport_number
- **Features**: Profile completion tracking, password management

#### user_profiles
- **Purpose**: Detailed user profile information
- **Key Fields**: department, position, hire_date, personal details
- **Features**: Employment and contact information

#### user_next_of_kin
- **Purpose**: Emergency contact information
- **Key Fields**: full_name, relationship, phone_number
- **Features**: Priority ordering, emergency contact flags

#### user_permissions
- **Purpose**: Granular permission management
- **Key Fields**: scope, property_id, role_template, section_permissions
- **Features**: Global/property-specific permissions, JSON-based section control

#### permission_templates
- **Purpose**: Reusable role templates
- **Key Fields**: template_name, role_template, section_permissions
- **Features**: System templates, custom templates

#### permission_audit_log
- **Purpose**: Audit trail for permission changes
- **Key Fields**: action, permission_details, performed_by
- **Features**: Complete audit history, IP tracking

### New Enums

- `user_status`: pending_first_login, active, inactive, suspended
- `permission_level`: none, view, edit
- `permission_scope`: global, property
- `role_template`: admin, supervisor, staff, member, custom

### New Functions

- `apply_permission_template()`: Apply role template to user
- `get_user_effective_permissions()`: Get merged user permissions
- `migrate_existing_users()`: Migrate existing users
- `verify_migration()`: Verify migration success

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- Users can view/update their own profiles
- Admins can manage all users
- Permission-based access to sensitive data

### Audit Trail

Complete audit trail for:
- Permission grants/revokes
- Role changes
- Profile updates
- Login attempts

### Data Validation

- Member number format validation
- Email format validation
- Phone number format validation
- Relationship type constraints

## 📈 Permission System

### Role Templates

#### 👑 Administrator
- **Scope**: Global
- **Access**: Edit access to all sections
- **Use Case**: System administrators, company executives

#### 👁️ Supervisor
- **Scope**: Global
- **Access**: View access to all sections
- **Use Case**: Department heads, oversight roles

#### 📝 Staff
- **Scope**: Property-specific
- **Access**: Edit access to Direct Addition & Property Handover, view to others
- **Use Case**: Operational staff, property managers

#### 👤 Member
- **Scope**: Property-specific
- **Access**: Limited view access (no Direct Addition or Audit Trail)
- **Use Case**: Limited access users, external partners

### Permission Sections

1. **Direct Addition**: Add properties directly
2. **Purchase Pipeline**: Manage property acquisition
3. **Subdivision Process**: Handle subdivisions
4. **Property Handover**: Manage transfers
5. **Audit Trail**: View system logs

### Permission Details

- **Basic Info**: Property metadata
- **Location**: Geographic information
- **Documents**: File management
- **Financial**: Financial data

## 🧪 Testing and Verification

### Verification Functions

```sql
-- Check migration status
SELECT * FROM verify_migration();

-- Get users needing profile completion
SELECT * FROM get_users_requiring_profile_completion();

-- Get user by member number
SELECT * FROM get_user_by_member_number('USR0001');
```

### Test Scenarios

1. **User Creation**: Test new user creation with all required fields
2. **Permission Assignment**: Test role template application
3. **Profile Completion**: Test profile and next of kin workflows
4. **Permission Filtering**: Test the intelligent filter system
5. **Audit Trail**: Verify permission change logging

## 🔄 Rollback Procedures

### Backup Strategy

Before running migrations:
1. Backup existing users table (done automatically)
2. Export current permission data
3. Document current system state

### Rollback Steps

If rollback is needed:
1. Restore from backup tables
2. Drop new tables and functions
3. Restore original auth.users references
4. Verify system functionality

### Emergency Contacts

- Database Admin: [Your DBA contact]
- System Admin: [Your system admin contact]
- Development Team: [Your dev team contact]

## 📝 Migration Log

Migrations are tracked in the `schema_migrations` table:

```sql
SELECT * FROM schema_migrations ORDER BY executed_at DESC;
```

Each migration records:
- Migration name
- Execution timestamp
- Success/failure status
- Execution time
- Error messages (if any)

## 🔧 Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure service role key has sufficient permissions
2. **Table Already Exists**: Check if migrations were partially run
3. **Foreign Key Violations**: Verify referenced tables exist
4. **RLS Policies**: Check if policies are blocking operations

### Debug Commands

```sql
-- Check table existence
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%user%';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename LIKE '%user%';

-- Check migration status
SELECT * FROM schema_migrations;
```

## 📞 Support

For migration support:
1. Check the troubleshooting section
2. Review migration logs
3. Contact the development team
4. Create an issue in the project repository

---

**⚠️ Important**: Always backup your database before running migrations in production!
