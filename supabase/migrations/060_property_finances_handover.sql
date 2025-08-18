-- 060: Property Finances and Handover Schema
-- Manages property sale status, financial details, and handover process

-- Create sale status enum
CREATE TYPE property_sale_status AS ENUM (
  'NOT_FOR_SALE',
  'LISTED_FOR_SALE', 
  'UNDER_CONTRACT',
  'SOLD'
);

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PARTIAL',
  'COMPLETED',
  'OVERDUE'
);

-- Create handover status enum
CREATE TYPE handover_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'DELAYED'
);

-- 1. Property Sale Information Table
CREATE TABLE property_sale_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sale_status property_sale_status NOT NULL DEFAULT 'NOT_FOR_SALE',
  listed_date DATE,
  listing_price DECIMAL(15,2),
  purchase_price DECIMAL(15,2),
  
  -- Purchaser Information
  purchaser_name TEXT,
  purchaser_email TEXT,
  purchaser_phone TEXT,
  purchaser_address TEXT,
  
  -- Financial Details
  deposit_amount DECIMAL(12,2),
  deposit_date DATE,
  payment_period_months INTEGER,
  payment_schedule TEXT, -- JSON or text describing payment schedule
  
  -- Commission Details
  commission_rate DECIMAL(5,4), -- e.g., 0.0300 for 3%
  commission_amount DECIMAL(12,2),
  commission_recipient TEXT,
  commission_paid BOOLEAN DEFAULT FALSE,
  
  -- Payment Tracking
  total_paid DECIMAL(12,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'PENDING',
  
  -- Handover Details
  handover_date DATE,
  handover_status handover_status DEFAULT 'NOT_STARTED',
  handover_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT unique_property_sale UNIQUE (property_id),
  CONSTRAINT chk_listing_price CHECK (listing_price IS NULL OR listing_price > 0),
  CONSTRAINT chk_purchase_price CHECK (purchase_price IS NULL OR purchase_price > 0),
  CONSTRAINT chk_deposit_amount CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  CONSTRAINT chk_commission_rate CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1)),
  CONSTRAINT chk_total_paid CHECK (total_paid >= 0),
  CONSTRAINT chk_payment_period CHECK (payment_period_months IS NULL OR payment_period_months > 0),
  CONSTRAINT chk_purchaser_email CHECK (
    purchaser_email IS NULL OR 
    purchaser_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- 2. Payment Records Table
CREATE TABLE property_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_sale_id UUID NOT NULL REFERENCES property_sale_info(id) ON DELETE CASCADE,
  payment_amount DECIMAL(12,2) NOT NULL CHECK (payment_amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  payment_notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_payment_date_not_future CHECK (payment_date <= CURRENT_DATE)
);

-- 3. Sale Status History Table (for audit trail)
CREATE TABLE property_sale_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_sale_id UUID NOT NULL REFERENCES property_sale_info(id) ON DELETE CASCADE,
  old_status property_sale_status,
  new_status property_sale_status NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_property_sale_info_property_id ON property_sale_info(property_id);
CREATE INDEX idx_property_sale_info_status ON property_sale_info(sale_status);
CREATE INDEX idx_property_sale_info_payment_status ON property_sale_info(payment_status);
CREATE INDEX idx_property_sale_info_handover_status ON property_sale_info(handover_status);

CREATE INDEX idx_payment_records_sale_id ON property_payment_records(property_sale_id);
CREATE INDEX idx_payment_records_date ON property_payment_records(payment_date);

CREATE INDEX idx_sale_status_history_sale_id ON property_sale_status_history(property_sale_id);
CREATE INDEX idx_sale_status_history_created_at ON property_sale_status_history(created_at);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_property_sale_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_sale_info_updated_at 
    BEFORE UPDATE ON property_sale_info 
    FOR EACH ROW EXECUTE FUNCTION update_property_sale_updated_at();

-- Create trigger to track status changes
CREATE OR REPLACE FUNCTION track_sale_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.sale_status != NEW.sale_status THEN
        INSERT INTO property_sale_status_history (
            property_sale_id, 
            old_status, 
            new_status, 
            changed_by
        ) VALUES (
            NEW.id, 
            OLD.sale_status, 
            NEW.sale_status, 
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_property_sale_status_changes
    AFTER UPDATE ON property_sale_info
    FOR EACH ROW EXECUTE FUNCTION track_sale_status_changes();

-- Create trigger to update total_paid when payments are added
CREATE OR REPLACE FUNCTION update_total_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE property_sale_info 
        SET total_paid = (
            SELECT COALESCE(SUM(payment_amount), 0) 
            FROM property_payment_records 
            WHERE property_sale_id = NEW.property_sale_id
        )
        WHERE id = NEW.property_sale_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE property_sale_info 
        SET total_paid = (
            SELECT COALESCE(SUM(payment_amount), 0) 
            FROM property_payment_records 
            WHERE property_sale_id = OLD.property_sale_id
        )
        WHERE id = OLD.property_sale_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_sale_total_paid
    AFTER INSERT OR DELETE ON property_payment_records
    FOR EACH ROW EXECUTE FUNCTION update_total_paid();

-- Create helpful views
CREATE VIEW property_sale_summary AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    p.physical_address,
    p.property_type,
    psi.id as sale_info_id,
    psi.sale_status,
    psi.listing_price,
    psi.purchase_price,
    psi.purchaser_name,
    psi.deposit_amount,
    psi.total_paid,
    psi.payment_status,
    psi.handover_status,
    psi.handover_date,
    psi.created_at as sale_created_at,
    psi.updated_at as sale_updated_at,
    CASE 
        WHEN psi.purchase_price IS NOT NULL AND psi.total_paid IS NOT NULL 
        THEN (psi.total_paid / psi.purchase_price * 100)
        ELSE 0 
    END as payment_percentage
FROM properties p
LEFT JOIN property_sale_info psi ON p.id = psi.property_id
WHERE p.disabled_at IS NULL;

-- Add helpful comments
COMMENT ON TABLE property_sale_info IS 'Stores property sale status and financial details';
COMMENT ON TABLE property_payment_records IS 'Records individual payments made for property purchases';
COMMENT ON TABLE property_sale_status_history IS 'Audit trail of property sale status changes';
COMMENT ON VIEW property_sale_summary IS 'Summary view of properties with their sale information';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 060: Property finances and handover schema created successfully';
  RAISE NOTICE 'Created tables: property_sale_info, property_payment_records, property_sale_status_history';
  RAISE NOTICE 'Created view: property_sale_summary';
  RAISE NOTICE 'Property finances and handover functionality ready for implementation';
END $$;
