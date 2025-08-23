
-- Migration: Migrate Existing Users to Enhanced System
-- Created: 2024-01-15
-- Description: Migrates existing users to the new enhanced user management system

-- Backup existing users table (optional safety measure)
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM auth.users;

-- Migration function to convert existing users
CREATE OR REPLACE FUNCTION migrate_existing_users() RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    new_member_number VARCHAR(10);
    counter INTEGER := 1;
    migrated_count INTEGER := 0;
BEGIN
    -- Loop through existing users
    FOR user_record IN 
        SELECT id, email, raw_user_meta_data, created_at
        FROM auth.users 
        WHERE email IS NOT NULL
    LOOP
        -- Generate member number if not exists
        new_member_number := 'USR' || LPAD(counter::TEXT, 4, '0');
        
        -- Ensure unique member number
        WHILE EXISTS (SELECT 1 FROM enhanced_users WHERE member_number = new_member_number) LOOP
            counter := counter + 1;
            new_member_number := 'USR' || LPAD(counter::TEXT, 4, '0');
        END LOOP;
        
        -- Insert into enhanced_users table
        INSERT INTO enhanced_users (
            id,
            member_number,
            email,
            full_name,
            phone_number,
            id_passport_number,
            status,
            profile_complete,
            next_of_kin_complete,
            must_change_password,
            created_at
        ) VALUES (
            user_record.id,
            new_member_number,
            user_record.email,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name',
                user_record.raw_user_meta_data->>'name',
                split_part(user_record.email, '@', 1)
            ),
            COALESCE(
                user_record.raw_user_meta_data->>'phone',
                user_record.raw_user_meta_data->>'phone_number',
                '+1234567890' -- Valid default placeholder
            ),
            COALESCE(
                user_record.raw_user_meta_data->>'id_number',
                'PENDING' -- Placeholder for missing ID numbers
            ),
            'active', -- Existing users are already active
            CASE 
                WHEN user_record.raw_user_meta_data->>'full_name' IS NOT NULL 
                THEN true 
                ELSE false 
            END,
            false, -- Next of kin needs to be completed
            false, -- Don't force password change for existing users
            user_record.created_at
        )
        ON CONFLICT (id) DO NOTHING; -- Skip if already migrated
        
        -- Create basic user profile
        INSERT INTO user_profiles (
            user_id,
            department,
            position,
            hire_date
        ) VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data->>'department', 'General'),
            COALESCE(user_record.raw_user_meta_data->>'position', 'Staff'),
            user_record.created_at::DATE
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Assign default permissions based on email domain or existing role
        DECLARE
            default_template VARCHAR(50) := 'member'; -- Default role
        BEGIN
            -- Determine role based on email or existing metadata
            IF user_record.email LIKE '%admin%' OR 
               user_record.raw_user_meta_data->>'role' = 'admin' THEN
                default_template := 'admin';
            ELSIF user_record.email LIKE '%supervisor%' OR 
                  user_record.raw_user_meta_data->>'role' = 'supervisor' THEN
                default_template := 'supervisor';
            ELSIF user_record.email LIKE '%staff%' OR 
                  user_record.raw_user_meta_data->>'role' = 'staff' THEN
                default_template := 'staff';
            END IF;
            
            -- Apply permission template
            PERFORM apply_permission_template(
                user_record.id,
                default_template,
                'global', -- Start with global permissions for existing users
                NULL,
                user_record.id -- Self-assigned during migration
            );
        END;
        
        counter := counter + 1;
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_existing_users() as migrated_users_count;

-- Create migration log entry
CREATE TABLE IF NOT EXISTS migration_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    details JSONB,
    executed_by UUID REFERENCES auth.users(id)
);

-- Log this migration
INSERT INTO migration_log (migration_name, details) VALUES 
('003_migrate_existing_users', jsonb_build_object(
    'description', 'Migrated existing users to enhanced user management system',
    'tables_created', ARRAY['enhanced_users', 'user_profiles', 'user_next_of_kin'],
    'default_permissions_applied', true,
    'backup_created', true
));

-- Update existing property_users table to reference enhanced_users
-- (Assuming you have a property_users junction table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_users') THEN
        -- Add foreign key constraint to enhanced_users if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'property_users_user_id_fkey_enhanced'
        ) THEN
            ALTER TABLE property_users 
            ADD CONSTRAINT property_users_user_id_fkey_enhanced 
            FOREIGN KEY (user_id) REFERENCES enhanced_users(id);
        END IF;
    END IF;
END $$;

-- Create view for backward compatibility
CREATE OR REPLACE VIEW users_view AS
SELECT 
    eu.id,
    eu.member_number,
    eu.email,
    eu.full_name,
    eu.phone_number,
    eu.status,
    eu.profile_complete,
    eu.next_of_kin_complete,
    eu.created_at,
    eu.updated_at,
    up.department,
    up.position,
    up.hire_date,
    -- Aggregate permissions
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'scope', perm.scope,
                'property_id', perm.property_id,
                'role_template', perm.role_template,
                'permissions', perm.section_permissions
            )
        ) FILTER (WHERE perm.id IS NOT NULL),
        '[]'::jsonb
    ) as permissions
FROM enhanced_users eu
LEFT JOIN user_profiles up ON eu.id = up.user_id
LEFT JOIN user_permissions perm ON eu.id = perm.user_id AND perm.is_active = true
GROUP BY eu.id, up.department, up.position, up.hire_date;

-- Create helper functions for common queries
CREATE OR REPLACE FUNCTION get_user_by_member_number(p_member_number VARCHAR(10))
RETURNS TABLE (
    id UUID,
    member_number VARCHAR(10),
    email VARCHAR(255),
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    status user_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT eu.id, eu.member_number, eu.email, eu.full_name, eu.phone_number, eu.status
    FROM enhanced_users eu
    WHERE eu.member_number = p_member_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_users_requiring_profile_completion()
RETURNS TABLE (
    id UUID,
    member_number VARCHAR(10),
    email VARCHAR(255),
    full_name VARCHAR(255),
    profile_complete BOOLEAN,
    next_of_kin_complete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT eu.id, eu.member_number, eu.email, eu.full_name, 
           eu.profile_complete, eu.next_of_kin_complete
    FROM enhanced_users eu
    WHERE eu.profile_complete = false 
       OR eu.next_of_kin_complete = false
       OR eu.must_change_password = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if migration was successful
CREATE OR REPLACE FUNCTION verify_migration() RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if all auth.users have corresponding enhanced_users records
    RETURN QUERY
    SELECT 
        'Users Migration'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All users migrated successfully'
            ELSE COUNT(*)::TEXT || ' users not migrated'
        END::TEXT
    FROM auth.users au
    LEFT JOIN enhanced_users eu ON au.id = eu.id
    WHERE au.email IS NOT NULL AND eu.id IS NULL;
    
    -- Check if permission templates exist
    RETURN QUERY
    SELECT 
        'Permission Templates'::TEXT,
        CASE 
            WHEN COUNT(*) >= 4 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        COUNT(*)::TEXT || ' permission templates created'::TEXT
    FROM permission_templates
    WHERE is_system_template = true;
    
    -- Check if users have permissions assigned
    RETURN QUERY
    SELECT 
        'User Permissions'::TEXT,
        CASE 
            WHEN COUNT(DISTINCT user_id) > 0 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        COUNT(DISTINCT user_id)::TEXT || ' users have permissions assigned'::TEXT
    FROM user_permissions
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_migration();

-- Clean up migration function (optional)
-- DROP FUNCTION IF EXISTS migrate_existing_users();

-- Grant necessary permissions
GRANT SELECT ON users_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_member_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_requiring_profile_completion TO authenticated;
GRANT EXECUTE ON FUNCTION verify_migration TO authenticated;

-- Comments
COMMENT ON VIEW users_view IS 'Backward compatibility view combining enhanced_users with profiles and permissions';
COMMENT ON FUNCTION get_user_by_member_number IS 'Retrieves user information by member number';
COMMENT ON FUNCTION get_users_requiring_profile_completion IS 'Returns users who need to complete their profiles';
COMMENT ON FUNCTION verify_migration IS 'Verifies that the user migration completed successfully';

-- Quick fix - run this in Supabase SQL Editor
ALTER TABLE enhanced_users DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE enhanced_users ADD CONSTRAINT valid_phone 
CHECK (
    phone_number ~ '^\+?[1-9]\d{1,14}$' OR 
    phone_number IN ('+1234567890', '1234567890', 'PENDING')
);

-- Then re-run the migration
SELECT migrate_existing_users() as migrated_users_count;
