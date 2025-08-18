-- Migration 002: Subdivision Schema - Development and Plot Management
-- Creates tables for subdivision planning and plot management

-- Create subdivision-related types (with IF NOT EXISTS handling)
DO $$
BEGIN
    -- Create subdivision_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subdivision_status') THEN
        CREATE TYPE subdivision_status AS ENUM ('planning', 'approved', 'in_progress', 'completed', 'cancelled');
    END IF;

    -- Create plot_stage if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plot_stage') THEN
        CREATE TYPE plot_stage AS ENUM ('raw', 'surveyed', 'ready_for_sale', 'reserved', 'sold', 'transferred');
    END IF;

    -- Create access_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_type') THEN
        CREATE TYPE access_type AS ENUM ('public_road', 'private_road', 'footpath', 'no_access');
    END IF;

    -- Create utility_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utility_level') THEN
        CREATE TYPE utility_level AS ENUM ('none', 'water_only', 'power_only', 'water_power', 'full_utilities');
    END IF;

    -- Create project_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('planned', 'ongoing', 'completed', 'cancelled');
    END IF;

    -- Create approval_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
    END IF;
END $$;

-- Subdivisions table - Development projects
CREATE TABLE subdivisions (
    subdivision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_plots_planned INTEGER NOT NULL CHECK (total_plots_planned > 0),
    total_plots_created INTEGER DEFAULT 0 CHECK (total_plots_created >= 0),
    status subdivision_status DEFAULT 'planning',
    project_manager VARCHAR(200),
    budget_estimate DECIMAL(15,2) CHECK (budget_estimate >= 0),
    actual_cost DECIMAL(15,2) CHECK (actual_cost >= 0),
    start_date DATE,
    completion_date DATE,
    public_utility_area_ha DECIMAL(8,4) CHECK (public_utility_area_ha >= 0),
    road_reserve_area_ha DECIMAL(8,4) CHECK (road_reserve_area_ha >= 0),
    saleable_area_ha DECIMAL(8,4) CHECK (saleable_area_ha >= 0),
    layout_plan_url VARCHAR(500),
    approval_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (completion_date IS NULL OR completion_date >= start_date),
    CHECK (total_plots_created <= total_plots_planned)
);

-- Plots table - Individual plots within subdivisions
CREATE TABLE plots (
    plot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdivision_id UUID NOT NULL REFERENCES subdivisions(subdivision_id) ON DELETE CASCADE,
    plot_no VARCHAR(20) NOT NULL,
    size_sqm DECIMAL(10,2) NOT NULL CHECK (size_sqm > 0),
    size_acres DECIMAL(8,4) GENERATED ALWAYS AS (size_sqm * 0.000247105) STORED,
    stage plot_stage DEFAULT 'raw',
    access_type access_type DEFAULT 'public_road',
    utility_level utility_level DEFAULT 'none',
    corner_plot BOOLEAN DEFAULT FALSE,
    premium_location BOOLEAN DEFAULT FALSE,
    frontage_meters DECIMAL(6,2) CHECK (frontage_meters > 0),
    coordinates JSONB, -- Plot boundary coordinates (always available)
    -- Note: PostGIS geometry column will be added separately if PostGIS is available
    beacon_references TEXT[], -- Array of beacon references
    survey_plan_reference VARCHAR(100),
    title_deed_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(subdivision_id, plot_no)
);

-- Value addition projects table - Infrastructure development
CREATE TABLE value_add_projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdivision_id UUID NOT NULL REFERENCES subdivisions(subdivision_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL, -- roads, water, electricity, drainage, etc.
    contractor_name VARCHAR(200),
    contractor_contact VARCHAR(100),
    contract_sum DECIMAL(15,2) CHECK (contract_sum >= 0),
    start_date DATE,
    planned_completion_date DATE,
    actual_completion_date DATE,
    status project_status DEFAULT 'planned',
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    amount_paid DECIMAL(15,2) DEFAULT 0 CHECK (amount_paid >= 0),
    retention_amount DECIMAL(15,2) DEFAULT 0 CHECK (retention_amount >= 0),
    warranty_period_months INTEGER CHECK (warranty_period_months > 0),
    warranty_expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (planned_completion_date IS NULL OR planned_completion_date >= start_date),
    CHECK (actual_completion_date IS NULL OR actual_completion_date >= start_date),
    CHECK (amount_paid <= contract_sum)
);

-- Approvals table - Regulatory approvals tracking
CREATE TABLE approvals (
    approval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdivision_id UUID NOT NULL REFERENCES subdivisions(subdivision_id) ON DELETE CASCADE,
    approval_type VARCHAR(100) NOT NULL, -- Physical Planning, EIA, NEMA, KPLC, etc.
    authority VARCHAR(200) NOT NULL, -- County Government, NEMA, KPLC, etc.
    application_date DATE,
    approval_date DATE,
    expiry_date DATE,
    reference_number VARCHAR(100),
    status approval_status DEFAULT 'pending',
    conditions TEXT,
    fee_amount DECIMAL(12,2) CHECK (fee_amount >= 0),
    fee_paid BOOLEAN DEFAULT FALSE,
    supporting_documents JSONB, -- Array of document references
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (approval_date IS NULL OR approval_date >= application_date),
    CHECK (expiry_date IS NULL OR expiry_date > approval_date)
);

-- Wayleaves and easements table
CREATE TABLE wayleaves_easements (
    wayleave_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdivision_id UUID NOT NULL REFERENCES subdivisions(subdivision_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- wayleave, easement, right_of_way
    purpose VARCHAR(200) NOT NULL, -- power_lines, water_pipes, road_access, etc.
    beneficiary VARCHAR(200), -- KPLC, Water Company, etc.
    area_sqm DECIMAL(10,2) CHECK (area_sqm > 0),
    compensation_amount DECIMAL(12,2) CHECK (compensation_amount >= 0),
    registration_date DATE,
    expiry_date DATE,
    coordinates JSONB, -- Wayleave boundary coordinates
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing zones table - Different pricing areas within subdivisions
CREATE TABLE pricing_zones (
    zone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdivision_id UUID NOT NULL REFERENCES subdivisions(subdivision_id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price_per_sqm DECIMAL(10,2) NOT NULL CHECK (base_price_per_sqm > 0),
    premium_percentage DECIMAL(5,2) DEFAULT 0 CHECK (premium_percentage >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(subdivision_id, zone_name, effective_from),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Create indexes for performance
CREATE INDEX idx_subdivisions_parcel_id ON subdivisions(parcel_id);
CREATE INDEX idx_subdivisions_status ON subdivisions(status);
CREATE INDEX idx_subdivisions_name_gin ON subdivisions USING gin(name gin_trgm_ops);

CREATE INDEX idx_plots_subdivision_id ON plots(subdivision_id);
CREATE INDEX idx_plots_stage ON plots(stage);
CREATE INDEX idx_plots_plot_no ON plots(plot_no);
CREATE INDEX idx_plots_size_sqm ON plots(size_sqm);
CREATE INDEX idx_plots_corner_plot ON plots(corner_plot);
CREATE INDEX idx_plots_premium_location ON plots(premium_location);
CREATE INDEX idx_plots_utility_level ON plots(utility_level);

CREATE INDEX idx_value_add_projects_subdivision_id ON value_add_projects(subdivision_id);
CREATE INDEX idx_value_add_projects_status ON value_add_projects(status);
CREATE INDEX idx_value_add_projects_type ON value_add_projects(project_type);
CREATE INDEX idx_value_add_projects_completion_date ON value_add_projects(planned_completion_date);

CREATE INDEX idx_approvals_subdivision_id ON approvals(subdivision_id);
CREATE INDEX idx_approvals_type ON approvals(approval_type);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_authority ON approvals(authority);
CREATE INDEX idx_approvals_expiry_date ON approvals(expiry_date);

CREATE INDEX idx_wayleaves_subdivision_id ON wayleaves_easements(subdivision_id);
CREATE INDEX idx_wayleaves_type ON wayleaves_easements(type);
CREATE INDEX idx_wayleaves_status ON wayleaves_easements(status);

CREATE INDEX idx_pricing_zones_subdivision_id ON pricing_zones(subdivision_id);
CREATE INDEX idx_pricing_zones_active ON pricing_zones(is_active);
CREATE INDEX idx_pricing_zones_effective_dates ON pricing_zones(effective_from, effective_to);

-- Apply updated_at triggers
CREATE TRIGGER update_subdivisions_updated_at BEFORE UPDATE ON subdivisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_value_add_projects_updated_at BEFORE UPDATE ON value_add_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wayleaves_easements_updated_at BEFORE UPDATE ON wayleaves_easements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_zones_updated_at BEFORE UPDATE ON pricing_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update subdivision plot counts
CREATE OR REPLACE FUNCTION update_subdivision_plot_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE subdivisions 
        SET total_plots_created = total_plots_created + 1
        WHERE subdivision_id = NEW.subdivision_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE subdivisions 
        SET total_plots_created = total_plots_created - 1
        WHERE subdivision_id = OLD.subdivision_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update plot counts
CREATE TRIGGER update_subdivision_plot_count_trigger
    AFTER INSERT OR DELETE ON plots
    FOR EACH ROW EXECUTE FUNCTION update_subdivision_plot_count();

-- Function to validate plot area against subdivision
CREATE OR REPLACE FUNCTION validate_plot_area()
RETURNS TRIGGER AS $$
DECLARE
    subdivision_saleable_area DECIMAL(8,4);
    total_plot_area DECIMAL(8,4);
BEGIN
    -- Get subdivision saleable area
    SELECT saleable_area_ha INTO subdivision_saleable_area
    FROM subdivisions 
    WHERE subdivision_id = NEW.subdivision_id;
    
    -- Calculate total plot area including new plot
    SELECT COALESCE(SUM(size_sqm), 0) / 10000 INTO total_plot_area
    FROM plots 
    WHERE subdivision_id = NEW.subdivision_id;
    
    -- Add new plot area
    total_plot_area := total_plot_area + (NEW.size_sqm / 10000);
    
    -- Check if total exceeds saleable area (with 5% tolerance)
    IF subdivision_saleable_area IS NOT NULL AND total_plot_area > subdivision_saleable_area * 1.05 THEN
        RAISE EXCEPTION 'Total plot area (%.4f ha) exceeds subdivision saleable area (%.4f ha)', 
            total_plot_area, subdivision_saleable_area;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate plot areas
CREATE TRIGGER validate_plot_area_trigger
    BEFORE INSERT OR UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION validate_plot_area();

-- Add PostGIS geometry columns if PostGIS is available
DO $$
BEGIN
    -- Check if PostGIS is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        -- Add geometry column to plots
        ALTER TABLE plots ADD COLUMN IF NOT EXISTS geometry GEOMETRY(POLYGON, 4326);

        -- Add spatial index for plots
        CREATE INDEX IF NOT EXISTS idx_plots_geometry ON plots USING GIST(geometry);

        RAISE NOTICE 'PostGIS geometry columns added to plots table';
    ELSE
        RAISE NOTICE 'PostGIS not available - using JSONB coordinates only for plots';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add PostGIS columns to plots: %', SQLERRM;
END $$;

-- Comments for documentation
COMMENT ON TABLE subdivisions IS 'Development projects for subdividing parcels into plots';
COMMENT ON TABLE plots IS 'Individual plots within subdivisions available for sale';
COMMENT ON TABLE value_add_projects IS 'Infrastructure development projects within subdivisions';
COMMENT ON TABLE approvals IS 'Regulatory approvals required for subdivision development';
COMMENT ON TABLE wayleaves_easements IS 'Wayleaves and easements within subdivisions';
COMMENT ON TABLE pricing_zones IS 'Different pricing zones within subdivisions for plot pricing';
