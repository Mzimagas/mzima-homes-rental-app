-- Migration 003: Sales Schema - Client Management and Sales Pipeline
-- Creates tables for client management, listings, offers, and sale agreements

-- Create sales-related types (with IF NOT EXISTS handling)
DO $$
BEGIN
    -- Create client_source if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_source') THEN
        CREATE TYPE client_source AS ENUM ('walk_in', 'referral', 'agent', 'marketing', 'website', 'social_media', 'bulk_import');
    END IF;

    -- Create lead_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
    END IF;

    -- Create listing_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
        CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'withdrawn', 'expired');
    END IF;

    -- Create pricing_strategy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_strategy') THEN
        CREATE TYPE pricing_strategy AS ENUM ('flat', 'negotiable', 'auction');
    END IF;

    -- Create payment_terms if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_terms') THEN
        CREATE TYPE payment_terms AS ENUM ('cash', 'installments', 'mortgage');
    END IF;

    -- Create offer_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
        CREATE TYPE offer_status AS ENUM ('draft', 'reserved', 'accepted', 'declined', 'expired', 'cancelled');
    END IF;

    -- Create agreement_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agreement_status') THEN
        CREATE TYPE agreement_status AS ENUM ('draft', 'active', 'completed', 'settled', 'cancelled', 'defaulted');
    END IF;

    -- Create installment_frequency if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_frequency') THEN
        CREATE TYPE installment_frequency AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
    END IF;
END $$;

-- Clients table - Customer information
CREATE TABLE clients (
    client_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    id_number VARCHAR(20),
    passport_number VARCHAR(20),
    kra_pin VARCHAR(11),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    postal_address TEXT,
    physical_address TEXT,
    date_of_birth DATE,
    nationality VARCHAR(50) DEFAULT 'Kenyan',
    occupation VARCHAR(100),
    employer VARCHAR(200),
    monthly_income DECIMAL(12,2) CHECK (monthly_income >= 0),
    source client_source NOT NULL,
    referrer_name VARCHAR(200),
    agent_id UUID REFERENCES user_profiles(id),
    credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
    is_pep BOOLEAN DEFAULT FALSE, -- Politically Exposed Person
    kyc_verified BOOLEAN DEFAULT FALSE,
    kyc_verification_date DATE,
    blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_client_identification CHECK (
        id_number IS NOT NULL OR passport_number IS NOT NULL
    ),
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Marketing leads table - Lead tracking before conversion to clients
CREATE TABLE marketing_leads (
    lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    source client_source NOT NULL,
    campaign_name VARCHAR(100),
    interested_in VARCHAR(200), -- What they're interested in
    budget_range VARCHAR(50),
    status lead_status DEFAULT 'new',
    assigned_to UUID REFERENCES user_profiles(id),
    first_contact_date DATE,
    last_contact_date DATE,
    conversion_date DATE,
    converted_to_client_id UUID REFERENCES clients(client_id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table - Plot listings for sale
CREATE TABLE listings (
    listing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plot_id UUID NOT NULL REFERENCES plots(plot_id) ON DELETE CASCADE,
    pricing_strategy pricing_strategy DEFAULT 'flat',
    list_price DECIMAL(15,2) NOT NULL CHECK (list_price > 0),
    promo_price DECIMAL(15,2) CHECK (promo_price > 0),
    price_per_sqm DECIMAL(10,2), -- Calculated price per square meter (updated via trigger)
    terms payment_terms DEFAULT 'installments',
    status listing_status DEFAULT 'draft',
    marketing_description TEXT,
    key_features TEXT[], -- Array of key selling points
    listed_date DATE,
    expiry_date DATE,
    views_count INTEGER DEFAULT 0,
    inquiries_count INTEGER DEFAULT 0,
    agent_id UUID REFERENCES user_profiles(id),
    commission_rate DECIMAL(5,2) DEFAULT 5.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    marketing_budget DECIMAL(10,2) CHECK (marketing_budget >= 0),
    photos JSONB, -- Array of photo URLs
    virtual_tour_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (promo_price IS NULL OR promo_price < list_price),
    CHECK (expiry_date IS NULL OR expiry_date > listed_date),
    UNIQUE(plot_id) -- One active listing per plot
);

-- Offers and reservations table
CREATE TABLE offers_reservations (
    offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plot_id UUID NOT NULL REFERENCES plots(plot_id),
    client_id UUID NOT NULL REFERENCES clients(client_id),
    listing_id UUID REFERENCES listings(listing_id),
    offer_price DECIMAL(15,2) NOT NULL CHECK (offer_price > 0),
    reservation_fee DECIMAL(12,2) NOT NULL CHECK (reservation_fee > 0),
    reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    status offer_status DEFAULT 'draft',
    special_conditions TEXT,
    payment_plan_proposed JSONB, -- Proposed payment schedule
    agent_id UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    approval_date DATE,
    declined_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (expiry_date > reservation_date),
    CHECK (reservation_fee <= offer_price)
);

-- Sale agreements table - Formal sale contracts
CREATE TABLE sale_agreements (
    sale_agreement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_no VARCHAR(50) UNIQUE NOT NULL,
    plot_id UUID NOT NULL REFERENCES plots(plot_id),
    client_id UUID NOT NULL REFERENCES clients(client_id),
    offer_id UUID REFERENCES offers_reservations(offer_id),
    agent_id UUID REFERENCES user_profiles(id),
    agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    price DECIMAL(15,2) NOT NULL CHECK (price > 0),
    deposit_required DECIMAL(15,2) NOT NULL CHECK (deposit_required > 0),
    deposit_paid DECIMAL(15,2) DEFAULT 0 CHECK (deposit_paid >= 0),
    balance_due DECIMAL(15,2) GENERATED ALWAYS AS (price - deposit_paid) STORED,
    status agreement_status DEFAULT 'draft',
    lawyer_firm VARCHAR(200),
    lawyer_contact VARCHAR(100),
    completion_date DATE, -- When fully paid
    title_transfer_date DATE,
    special_conditions TEXT,
    penalty_rate DECIMAL(5,2) DEFAULT 2.00 CHECK (penalty_rate >= 0), -- Monthly penalty rate
    grace_period_days INTEGER DEFAULT 30 CHECK (grace_period_days >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (deposit_paid <= price),
    CHECK (title_transfer_date IS NULL OR title_transfer_date >= completion_date)
);

-- Payment plans table - Installment payment schedules
CREATE TABLE payment_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_agreement_id UUID NOT NULL REFERENCES sale_agreements(sale_agreement_id) ON DELETE CASCADE,
    deposit_percent DECIMAL(5,2) NOT NULL CHECK (deposit_percent > 0 AND deposit_percent <= 100),
    num_installments INTEGER NOT NULL CHECK (num_installments > 0),
    installment_frequency installment_frequency DEFAULT 'monthly',
    first_installment_date DATE NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL CHECK (installment_amount > 0),
    balloon_payment DECIMAL(15,2) DEFAULT 0 CHECK (balloon_payment >= 0),
    interest_rate DECIMAL(5,2) DEFAULT 0 CHECK (interest_rate >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(sale_agreement_id) -- One payment plan per agreement
);

-- Create indexes for performance
CREATE INDEX idx_clients_id_number ON clients(id_number);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_source ON clients(source);
CREATE INDEX idx_clients_agent_id ON clients(agent_id);
CREATE INDEX idx_clients_kyc_verified ON clients(kyc_verified);
CREATE INDEX idx_clients_blacklisted ON clients(blacklisted);
CREATE INDEX idx_clients_full_name_gin ON clients USING gin(full_name gin_trgm_ops);

CREATE INDEX idx_marketing_leads_phone ON marketing_leads(phone);
CREATE INDEX idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX idx_marketing_leads_source ON marketing_leads(source);
CREATE INDEX idx_marketing_leads_assigned_to ON marketing_leads(assigned_to);

CREATE INDEX idx_listings_plot_id ON listings(plot_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_agent_id ON listings(agent_id);
CREATE INDEX idx_listings_listed_date ON listings(listed_date);
CREATE INDEX idx_listings_price_range ON listings(list_price);

CREATE INDEX idx_offers_plot_id ON offers_reservations(plot_id);
CREATE INDEX idx_offers_client_id ON offers_reservations(client_id);
CREATE INDEX idx_offers_status ON offers_reservations(status);
CREATE INDEX idx_offers_expiry_date ON offers_reservations(expiry_date);
CREATE INDEX idx_offers_agent_id ON offers_reservations(agent_id);

CREATE INDEX idx_sale_agreements_plot_id ON sale_agreements(plot_id);
CREATE INDEX idx_sale_agreements_client_id ON sale_agreements(client_id);
CREATE INDEX idx_sale_agreements_status ON sale_agreements(status);
CREATE INDEX idx_sale_agreements_agreement_date ON sale_agreements(agreement_date);
CREATE INDEX idx_sale_agreements_agent_id ON sale_agreements(agent_id);
CREATE INDEX idx_sale_agreements_agreement_no ON sale_agreements(agreement_no);

CREATE INDEX idx_payment_plans_sale_agreement_id ON payment_plans(sale_agreement_id);
CREATE INDEX idx_payment_plans_active ON payment_plans(is_active);

-- Apply updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_leads_updated_at BEFORE UPDATE ON marketing_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_reservations_updated_at BEFORE UPDATE ON offers_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_agreements_updated_at BEFORE UPDATE ON sale_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update plot stage when offer is accepted
CREATE OR REPLACE FUNCTION update_plot_stage_on_offer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        UPDATE plots SET stage = 'reserved' WHERE plot_id = NEW.plot_id;
    ELSIF NEW.status = 'expired' OR NEW.status = 'declined' OR NEW.status = 'cancelled' THEN
        -- Check if there are other active offers for this plot
        IF NOT EXISTS (
            SELECT 1 FROM offers_reservations 
            WHERE plot_id = NEW.plot_id 
            AND status IN ('reserved', 'accepted') 
            AND offer_id != NEW.offer_id
        ) THEN
            UPDATE plots SET stage = 'ready_for_sale' WHERE plot_id = NEW.plot_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update plot stage based on offer status
CREATE TRIGGER update_plot_stage_on_offer_trigger
    AFTER UPDATE ON offers_reservations
    FOR EACH ROW EXECUTE FUNCTION update_plot_stage_on_offer();

-- Function to update plot stage when sale agreement is created
CREATE OR REPLACE FUNCTION update_plot_stage_on_agreement()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE plots SET stage = 'sold' WHERE plot_id = NEW.plot_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'settled' AND OLD.status != 'settled' THEN
            UPDATE plots SET stage = 'transferred' WHERE plot_id = NEW.plot_id;
        ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
            UPDATE plots SET stage = 'ready_for_sale' WHERE plot_id = NEW.plot_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update plot stage based on sale agreement
CREATE TRIGGER update_plot_stage_on_agreement_trigger
    AFTER INSERT OR UPDATE ON sale_agreements
    FOR EACH ROW EXECUTE FUNCTION update_plot_stage_on_agreement();

-- Function to calculate price per square meter for listings
CREATE OR REPLACE FUNCTION calculate_price_per_sqm()
RETURNS TRIGGER AS $$
DECLARE
    plot_size DECIMAL(10,2);
BEGIN
    -- Get the plot size
    SELECT size_sqm INTO plot_size
    FROM plots
    WHERE plot_id = NEW.plot_id;

    -- Calculate price per square meter
    IF plot_size IS NOT NULL AND plot_size > 0 THEN
        NEW.price_per_sqm := NEW.list_price / plot_size;
    ELSE
        NEW.price_per_sqm := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate price per square meter
CREATE TRIGGER calculate_price_per_sqm_trigger
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION calculate_price_per_sqm();

-- Function to generate agreement number
CREATE OR REPLACE FUNCTION generate_agreement_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    IF NEW.agreement_no IS NULL OR NEW.agreement_no = '' THEN
        year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

        -- Get next sequence number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(agreement_no FROM 'AGR-' || year_suffix || '-(\d+)') AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM sale_agreements
        WHERE agreement_no LIKE 'AGR-' || year_suffix || '-%';

        NEW.agreement_no := 'AGR-' || year_suffix || '-' || LPAD(sequence_num::VARCHAR, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate agreement numbers
CREATE TRIGGER generate_agreement_number_trigger
    BEFORE INSERT ON sale_agreements
    FOR EACH ROW EXECUTE FUNCTION generate_agreement_number();

-- Comments for documentation
COMMENT ON TABLE clients IS 'Customer information and KYC details';
COMMENT ON TABLE marketing_leads IS 'Lead tracking before conversion to clients';
COMMENT ON TABLE listings IS 'Plot listings available for sale with pricing and marketing information';
COMMENT ON TABLE offers_reservations IS 'Customer offers and plot reservations';
COMMENT ON TABLE sale_agreements IS 'Formal sale contracts between clients and company';
COMMENT ON TABLE payment_plans IS 'Installment payment schedules for sale agreements';
