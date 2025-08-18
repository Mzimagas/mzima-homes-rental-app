-- Quick syntax test for the fixed migrations
-- This file tests the basic table creation syntax

-- Test the types first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenure_type') THEN
        CREATE TYPE tenure_type AS ENUM ('freehold', 'leasehold');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'land_use_type') THEN
        CREATE TYPE land_use_type AS ENUM ('residential', 'commercial', 'agricultural', 'industrial', 'mixed', 'recreational', 'institutional');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_agent', 'finance', 'operations', 'viewer');
    END IF;
END $$;

-- Test parcels table creation (simplified)
CREATE TABLE IF NOT EXISTS test_parcels (
    parcel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lr_number VARCHAR(50) UNIQUE NOT NULL,
    registry_office VARCHAR(100) NOT NULL,
    county VARCHAR(50) NOT NULL,
    locality VARCHAR(100) NOT NULL,
    tenure tenure_type NOT NULL,
    acreage_ha DECIMAL(10,4) NOT NULL CHECK (acreage_ha > 0),
    current_use land_use_type NOT NULL,
    coordinates JSONB, -- Store GeoJSON coordinates
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test user_profiles table
CREATE TABLE IF NOT EXISTS test_user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clean up test tables
DROP TABLE IF EXISTS test_parcels;
DROP TABLE IF EXISTS test_user_profiles;

-- Success message
SELECT 'Syntax test completed successfully!' as result;
