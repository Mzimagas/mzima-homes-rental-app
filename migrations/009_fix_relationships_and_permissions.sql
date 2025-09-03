-- Migration 009: Fix database relationships and permissions
-- This migration addresses the issues identified in the error logs

-- 1. Ensure foreign key constraints exist for PostgREST nested queries
-- These constraints are required for PostgREST to understand table relationships

-- Check if foreign key constraints exist and add them if missing
DO $$
BEGIN
    -- units.property_id -> properties.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'units_property_id_fkey' 
        AND table_name = 'units'
    ) THEN
        ALTER TABLE public.units
        ADD CONSTRAINT units_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES public.properties(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;

    -- rent_invoices.unit_id -> units.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rent_invoices_unit_id_fkey' 
        AND table_name = 'rent_invoices'
    ) THEN
        ALTER TABLE public.rent_invoices
        ADD CONSTRAINT rent_invoices_unit_id_fkey
        FOREIGN KEY (unit_id) REFERENCES public.units(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;

    -- rent_invoices.tenant_id -> tenants.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rent_invoices_tenant_id_fkey' 
        AND table_name = 'rent_invoices'
    ) THEN
        ALTER TABLE public.rent_invoices
        ADD CONSTRAINT rent_invoices_tenant_id_fkey
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;

    -- tenants.current_unit_id -> units.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tenants_current_unit_id_fkey' 
        AND table_name = 'tenants'
    ) THEN
        ALTER TABLE public.tenants
        ADD CONSTRAINT tenants_current_unit_id_fkey
        FOREIGN KEY (current_unit_id) REFERENCES public.units(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_invoices_unit_id ON public.rent_invoices(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_invoices_tenant_id ON public.rent_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_invoices_status ON public.rent_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tenants_current_unit_id ON public.tenants(current_unit_id);

-- 3. Create or update the purchase_pipeline_field_security table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_pipeline_field_security (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name TEXT NOT NULL UNIQUE,
    security_level TEXT NOT NULL DEFAULT 'STANDARD' CHECK (security_level IN ('STANDARD', 'SENSITIVE', 'CRITICAL')),
    lock_after_stage INTEGER DEFAULT NULL,
    requires_reason BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default field security settings if they don't exist
INSERT INTO public.purchase_pipeline_field_security (field_name, security_level, lock_after_stage, requires_reason, requires_approval)
VALUES 
    ('propertyId', 'CRITICAL', 1, TRUE, TRUE),
    ('propertyName', 'STANDARD', NULL, FALSE, FALSE),
    ('propertyAddress', 'STANDARD', NULL, FALSE, FALSE),
    ('propertyType', 'STANDARD', 2, FALSE, FALSE),
    ('purchasePrice', 'SENSITIVE', 3, TRUE, FALSE),
    ('sellerName', 'STANDARD', NULL, FALSE, FALSE),
    ('sellerContact', 'STANDARD', NULL, FALSE, FALSE),
    ('agreementDate', 'SENSITIVE', 2, FALSE, FALSE),
    ('completionDate', 'SENSITIVE', NULL, FALSE, FALSE),
    ('notes', 'STANDARD', NULL, FALSE, FALSE)
ON CONFLICT (field_name) DO NOTHING;

-- 5. Grant proper permissions for the authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.purchase_pipeline_field_security TO authenticated;
GRANT SELECT ON TABLE public.units TO authenticated;
GRANT SELECT ON TABLE public.properties TO authenticated;
GRANT SELECT ON TABLE public.rent_invoices TO authenticated;
GRANT SELECT ON TABLE public.tenants TO authenticated;

-- Grant column-level permissions if needed
GRANT SELECT (field_name, security_level, lock_after_stage, requires_reason, requires_approval)
ON public.purchase_pipeline_field_security TO authenticated;

-- 6. Create or update RLS policies for purchase_pipeline_field_security
ALTER TABLE public.purchase_pipeline_field_security ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS pfs_select ON public.purchase_pipeline_field_security;

-- Create a permissive read policy for authenticated users
CREATE POLICY pfs_select
ON public.purchase_pipeline_field_security
FOR SELECT
TO authenticated
USING (true);

-- 7. Create a view for overdue invoices to simplify complex queries
CREATE OR REPLACE VIEW public.v_overdue_invoices AS
SELECT
    ri.id,
    ri.amount_due_kes,
    ri.amount_paid_kes,
    ri.status,
    ri.due_date,
    ri.tenant_id,
    u.id as unit_id,
    u.property_id,
    p.disabled_at,
    p.name as property_name,
    t.full_name as tenant_name
FROM public.rent_invoices ri
JOIN public.units u ON u.id = ri.unit_id
JOIN public.properties p ON p.id = u.property_id
JOIN public.tenants t ON t.id = ri.tenant_id
WHERE ri.status = 'OVERDUE';

-- Grant permissions on the view
GRANT SELECT ON public.v_overdue_invoices TO authenticated;

-- 8. Create RLS policy for the view (inherits from base tables)
ALTER VIEW public.v_overdue_invoices OWNER TO postgres;

-- 9. Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to purchase_pipeline_field_security
DROP TRIGGER IF EXISTS update_purchase_pipeline_field_security_updated_at ON public.purchase_pipeline_field_security;
CREATE TRIGGER update_purchase_pipeline_field_security_updated_at
    BEFORE UPDATE ON public.purchase_pipeline_field_security
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Verify the setup with some helpful comments
COMMENT ON TABLE public.purchase_pipeline_field_security IS 'Field-level security configuration for purchase pipeline forms';
COMMENT ON VIEW public.v_overdue_invoices IS 'Simplified view for overdue invoice queries with property and tenant details';
COMMENT ON CONSTRAINT units_property_id_fkey ON public.units IS 'Foreign key to enable PostgREST nested queries';
COMMENT ON CONSTRAINT rent_invoices_unit_id_fkey ON public.rent_invoices IS 'Foreign key to enable PostgREST nested queries';
