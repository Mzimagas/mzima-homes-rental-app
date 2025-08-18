-- Migration 001: Initial Schema - Core Entities
-- Creates core tables for land management system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Try to enable PostGIS (optional - for geospatial features)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "postgis";
    RAISE NOTICE 'PostGIS extension enabled - geospatial features available';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS extension not available - geospatial features disabled';
END $$;

-- Create custom types (with IF NOT EXISTS handling)
DO $$
BEGIN
    -- Create tenure_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenure_type') THEN
        CREATE TYPE tenure_type AS ENUM ('freehold', 'leasehold');
    END IF;

    -- Create land_use_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'land_use_type') THEN
        CREATE TYPE land_use_type AS ENUM ('residential', 'commercial', 'agricultural', 'industrial', 'mixed', 'recreational', 'institutional');
    END IF;

    -- Create entity_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
        CREATE TYPE entity_type AS ENUM ('individual', 'company', 'partnership', 'trust', 'government');
    END IF;

    -- Create encumbrance_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'encumbrance_type') THEN
        CREATE TYPE encumbrance_type AS ENUM ('charge', 'caveat', 'lien', 'court_order', 'restriction');
    END IF;

    -- Create survey_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'survey_status') THEN
        CREATE TYPE survey_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
    END IF;

    -- Create user_role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_agent', 'finance', 'operations', 'viewer');
    END IF;
END $$;

-- Parcels table - Core land parcel information
CREATE TABLE parcels (
    parcel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lr_number VARCHAR(50) UNIQUE NOT NULL,
    registry_office VARCHAR(100) NOT NULL,
    county VARCHAR(50) NOT NULL,
    sub_county VARCHAR(50),
    locality VARCHAR(100) NOT NULL,
    tenure tenure_type NOT NULL,
    acreage_ha DECIMAL(10,4) NOT NULL CHECK (acreage_ha > 0),
    size_acres DECIMAL(10,4) GENERATED ALWAYS AS (acreage_ha * 2.47105) STORED,
    current_use land_use_type NOT NULL,
    acquisition_date DATE,
    acquisition_cost_total DECIMAL(15,2) CHECK (acquisition_cost_total >= 0),
    acquisition_cost_per_acre DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE WHEN (acreage_ha * 2.47105) > 0 THEN acquisition_cost_total / (acreage_ha * 2.47105) ELSE 0 END
    ) STORED,
    market_value DECIMAL(15,2) CHECK (market_value >= 0),
    valuation_date DATE,
    rim_sheet_no VARCHAR(50),
    deed_plan_no VARCHAR(50),
    coordinates JSONB, -- Store GeoJSON coordinates (always available)
    -- Note: PostGIS geometry column will be added separately if PostGIS is available
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Owners table - Property owners information
CREATE TABLE owners (
    owner_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    id_number VARCHAR(20),
    passport_number VARCHAR(20),
    kra_pin VARCHAR(11),
    phone VARCHAR(20),
    email VARCHAR(100),
    postal_address TEXT,
    physical_address TEXT,
    entity_type entity_type NOT NULL DEFAULT 'individual',
    company_registration_no VARCHAR(50),
    date_of_birth DATE,
    nationality VARCHAR(50) DEFAULT 'Kenyan',
    is_pep BOOLEAN DEFAULT FALSE, -- Politically Exposed Person
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_id_or_passport CHECK (
        (entity_type = 'individual' AND (id_number IS NOT NULL OR passport_number IS NOT NULL)) OR
        (entity_type != 'individual' AND company_registration_no IS NOT NULL)
    )
);

-- Parcel ownership junction table
CREATE TABLE parcel_owners (
    parcel_owner_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(owner_id) ON DELETE CASCADE,
    ownership_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
    ownership_type VARCHAR(50) DEFAULT 'full_ownership',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(parcel_id, owner_id, start_date),
    CHECK (end_date IS NULL OR end_date > start_date)
);

-- Encumbrances table - Legal encumbrances on parcels
CREATE TABLE encumbrances (
    encumbrance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    encumbrance_type encumbrance_type NOT NULL,
    reference_number VARCHAR(100),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'KES',
    beneficiary VARCHAR(200),
    registration_date DATE,
    expiry_date DATE,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    discharge_date DATE,
    discharge_reference VARCHAR(100),
    supporting_documents JSONB, -- Array of document references
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (expiry_date IS NULL OR expiry_date > registration_date),
    CHECK (discharge_date IS NULL OR discharge_date >= registration_date)
);

-- Surveys table - Survey information and tracking
CREATE TABLE surveys (
    survey_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    survey_firm VARCHAR(200),
    surveyor_name VARCHAR(200),
    surveyor_license VARCHAR(50),
    job_reference VARCHAR(100),
    survey_type VARCHAR(50) DEFAULT 'boundary_survey',
    submission_date DATE,
    approval_date DATE,
    status survey_status DEFAULT 'draft',
    area_surveyed_ha DECIMAL(10,4),
    beacon_coordinates JSONB, -- Array of beacon points
    survey_plan_url VARCHAR(500),
    mutation_reference VARCHAR(100),
    deed_plan_reference VARCHAR(100),
    cost DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (approval_date IS NULL OR approval_date >= submission_date),
    CHECK (area_surveyed_ha IS NULL OR area_surveyed_ha > 0)
);

-- User profiles table - System users
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- Links to auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities audit table - System activity logging
CREATE TABLE activities_audit (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES user_profiles(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    before_snapshot JSONB,
    after_snapshot JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_parcels_lr_number ON parcels(lr_number);
CREATE INDEX idx_parcels_county ON parcels(county);
CREATE INDEX idx_parcels_locality ON parcels(locality);
CREATE INDEX idx_parcels_tenure ON parcels(tenure);
CREATE INDEX idx_parcels_current_use ON parcels(current_use);
CREATE INDEX idx_parcels_acquisition_date ON parcels(acquisition_date);

CREATE INDEX idx_owners_id_number ON owners(id_number);
CREATE INDEX idx_owners_kra_pin ON owners(kra_pin);
CREATE INDEX idx_owners_entity_type ON owners(entity_type);
CREATE INDEX idx_owners_full_name_gin ON owners USING gin(full_name gin_trgm_ops);

CREATE INDEX idx_parcel_owners_parcel_id ON parcel_owners(parcel_id);
CREATE INDEX idx_parcel_owners_owner_id ON parcel_owners(owner_id);
CREATE INDEX idx_parcel_owners_active ON parcel_owners(is_active);

CREATE INDEX idx_encumbrances_parcel_id ON encumbrances(parcel_id);
CREATE INDEX idx_encumbrances_type ON encumbrances(encumbrance_type);
CREATE INDEX idx_encumbrances_status ON encumbrances(status);

CREATE INDEX idx_surveys_parcel_id ON surveys(parcel_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_submission_date ON surveys(submission_date);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);

CREATE INDEX idx_activities_audit_entity ON activities_audit(entity_type, entity_id);
CREATE INDEX idx_activities_audit_actor ON activities_audit(actor_id);
CREATE INDEX idx_activities_audit_created_at ON activities_audit(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encumbrances_updated_at BEFORE UPDATE ON encumbrances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE parcels IS 'Core land parcel information with ownership and legal details';
COMMENT ON TABLE owners IS 'Property owners including individuals, companies, and other entities';
COMMENT ON TABLE parcel_owners IS 'Junction table linking parcels to their owners with ownership percentages';
COMMENT ON TABLE encumbrances IS 'Legal encumbrances such as charges, caveats, and liens on parcels';
COMMENT ON TABLE surveys IS 'Survey information and tracking for land parcels';
COMMENT ON TABLE user_profiles IS 'System user profiles with roles and permissions';
COMMENT ON TABLE activities_audit IS 'Audit trail for all system activities and changes';

-- Add PostGIS geometry columns if PostGIS is available
DO $$
BEGIN
    -- Check if PostGIS is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        -- Add geometry column to parcels
        ALTER TABLE parcels ADD COLUMN IF NOT EXISTS geometry GEOMETRY(POLYGON, 4326);

        -- Add spatial index
        CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON parcels USING GIST(geometry);

        RAISE NOTICE 'PostGIS geometry columns added to parcels table';
    ELSE
        RAISE NOTICE 'PostGIS not available - using JSONB coordinates only';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add PostGIS columns: %', SQLERRM;
END $$;

-- Insert initial admin user (update with actual admin details)
INSERT INTO user_profiles (id, email, full_name, role, department, is_active)
VALUES (
    uuid_generate_v4(),
    'admin@mzimahomes.com',
    'System Administrator',
    'super_admin',
    'IT',
    TRUE
) ON CONFLICT (email) DO NOTHING;
