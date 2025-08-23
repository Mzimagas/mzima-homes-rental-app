-- Migration: Create User Management Tables (Safe Version)
-- Created: 2024-01-15
-- Description: Creates tables for enhanced user management system with member numbers, permissions, and role templates
-- Note: This version handles existing objects gracefully

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for user management (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending_first_login', 'active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_level AS ENUM ('none', 'view', 'edit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_scope AS ENUM ('global', 'property');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE role_template AS ENUM ('admin', 'supervisor', 'staff', 'member', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced users table with new required fields
CREATE TABLE IF NOT EXISTS enhanced_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_number VARCHAR(10) UNIQUE NOT NULL, -- Office staff member ID
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL, -- Used as default password
    id_passport_number VARCHAR(50) NOT NULL, -- ID or Passport number
    
    -- Authentication and security
    password_hash VARCHAR(255), -- Hashed password
    default_password VARCHAR(255), -- Temporary default password (phone number)
    must_change_password BOOLEAN DEFAULT true,
    last_password_change TIMESTAMP WITH TIME ZONE,
    
    -- Profile completion tracking
    profile_complete BOOLEAN DEFAULT false,
    next_of_kin_complete BOOLEAN DEFAULT false,
    
    -- Status and metadata
    status user_status DEFAULT 'pending_first_login',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Constraints (with relaxed phone validation for migration)
    CONSTRAINT valid_member_number CHECK (member_number ~ '^[A-Z0-9]{3,10}$'),
    CONSTRAINT valid_email CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT valid_phone CHECK (
        phone_number ~ '^\+?[1-9]\d{1,14}$' OR
        phone_number IN ('+1234567890', '1234567890', 'PENDING')
    )
);

-- User profile details table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES enhanced_users(id) ON DELETE CASCADE,
    
    -- Personal information
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Employment information
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    employee_id VARCHAR(50),
    
    -- Contact preferences
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Next of kin information table
CREATE TABLE IF NOT EXISTS user_next_of_kin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES enhanced_users(id) ON DELETE CASCADE,
    
    -- Next of kin details
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- spouse, child, parent, sibling, etc.
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    
    -- Priority order (primary, secondary, etc.)
    priority_order INTEGER DEFAULT 1,
    is_emergency_contact BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_relationship CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'guardian', 'friend', 'other'))
);

-- User permissions table for granular access control
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES enhanced_users(id) ON DELETE CASCADE,
    
    -- Permission scope
    scope permission_scope NOT NULL,
    property_id UUID REFERENCES properties(id), -- NULL for global permissions
    
    -- Role template classification
    role_template role_template DEFAULT 'custom',
    
    -- Section permissions (JSON for flexibility)
    section_permissions JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT global_or_property CHECK (
        (scope = 'global' AND property_id IS NULL) OR 
        (scope = 'property' AND property_id IS NOT NULL)
    ),
    
    -- Unique constraint to prevent duplicate permissions
    UNIQUE(user_id, scope, property_id)
);

-- Permission audit trail
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES enhanced_users(id),
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- 'granted', 'revoked', 'modified'
    permission_details JSONB NOT NULL,
    previous_permissions JSONB,
    
    -- Context
    scope permission_scope,
    property_id UUID REFERENCES properties(id),
    role_template role_template,
    
    -- Metadata
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    reason TEXT
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_enhanced_users_member_number ON enhanced_users(member_number);
CREATE INDEX IF NOT EXISTS idx_enhanced_users_email ON enhanced_users(email);
CREATE INDEX IF NOT EXISTS idx_enhanced_users_status ON enhanced_users(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_users_created_at ON enhanced_users(created_at);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_scope ON user_permissions(scope);
CREATE INDEX IF NOT EXISTS idx_user_permissions_property_id ON user_permissions(property_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_role_template ON user_permissions(role_template);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_permission_audit_user_id ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_performed_at ON permission_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_user_next_of_kin_user_id ON user_next_of_kin(user_id);
CREATE INDEX IF NOT EXISTS idx_user_next_of_kin_priority ON user_next_of_kin(priority_order);

-- Create updated_at trigger function (replace if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_enhanced_users_updated_at ON enhanced_users;
CREATE TRIGGER update_enhanced_users_updated_at 
    BEFORE UPDATE ON enhanced_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_next_of_kin_updated_at ON user_next_of_kin;
CREATE TRIGGER update_user_next_of_kin_updated_at 
    BEFORE UPDATE ON user_next_of_kin 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE enhanced_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_next_of_kin ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own profile" ON enhanced_users;
CREATE POLICY "Users can view their own profile" ON enhanced_users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON enhanced_users;
CREATE POLICY "Users can update their own profile" ON enhanced_users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all users" ON enhanced_users;
CREATE POLICY "Admins can manage all users" ON enhanced_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions up 
            WHERE up.user_id = auth.uid() 
            AND up.role_template = 'admin' 
            AND up.is_active = true
        )
    );

-- Comments for documentation
COMMENT ON TABLE enhanced_users IS 'Enhanced user management with member numbers, phone-based auth, and profile tracking';
COMMENT ON TABLE user_profiles IS 'Detailed user profile information including employment and personal details';
COMMENT ON TABLE user_next_of_kin IS 'Emergency contact and next of kin information for users';
COMMENT ON TABLE user_permissions IS 'Granular permission system with role templates and section-based access';
COMMENT ON TABLE permission_audit_log IS 'Audit trail for all permission changes and access control modifications';

COMMENT ON COLUMN enhanced_users.member_number IS 'Unique office staff member ID (3-10 alphanumeric characters)';
COMMENT ON COLUMN enhanced_users.phone_number IS 'Phone number used as default password for first login';
COMMENT ON COLUMN enhanced_users.must_change_password IS 'Forces password change on next login';
COMMENT ON COLUMN enhanced_users.profile_complete IS 'Tracks if user has completed their profile information';
COMMENT ON COLUMN enhanced_users.next_of_kin_complete IS 'Tracks if user has provided next of kin details';

-- Check if tables exist and their structure
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('enhanced_users', 'user_profiles', 'user_permissions');

-- Check the structure of user_profiles table if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check enhanced_users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'enhanced_users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
