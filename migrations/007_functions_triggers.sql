-- Migration 007: Functions and Triggers
-- Creates business logic functions and automated triggers

-- Function to calculate balance due for sale agreements
CREATE OR REPLACE FUNCTION calculate_balance_due()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance_due when receipts are added/updated/deleted
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE sale_agreements 
        SET deposit_paid = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM receipts 
            WHERE sale_agreement_id = NEW.sale_agreement_id
        )
        WHERE sale_agreement_id = NEW.sale_agreement_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sale_agreements 
        SET deposit_paid = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM receipts 
            WHERE sale_agreement_id = OLD.sale_agreement_id
        )
        WHERE sale_agreement_id = OLD.sale_agreement_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balance due
CREATE TRIGGER update_balance_due_trigger
    AFTER INSERT OR UPDATE OR DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION calculate_balance_due();

-- Function to update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    total_allocated DECIMAL(15,2);
    invoice_amount DECIMAL(15,2);
BEGIN
    -- Calculate total allocated amount for the invoice
    SELECT COALESCE(SUM(pa.amount), 0) INTO total_allocated
    FROM payment_allocations pa
    WHERE pa.invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Get invoice amount
    SELECT amount_due INTO invoice_amount
    FROM invoices
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Update invoice status based on payment
    UPDATE invoices SET
        amount_paid = total_allocated,
        status = CASE
            WHEN total_allocated = 0 THEN 
                CASE WHEN due_date < CURRENT_DATE THEN 'overdue' ELSE 'unpaid' END
            WHEN total_allocated >= invoice_amount THEN 'paid'
            ELSE 'partly_paid'
        END
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice status when payments are allocated
CREATE TRIGGER update_invoice_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- Function to auto-generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
        year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_no FROM 'RCP-' || year_suffix || '-(\d+)') AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM receipts
        WHERE receipt_no LIKE 'RCP-' || year_suffix || '-%';
        
        NEW.receipt_no := 'RCP-' || year_suffix || '-' || LPAD(sequence_num::VARCHAR, 6, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate receipt numbers
CREATE TRIGGER generate_receipt_number_trigger
    BEFORE INSERT ON receipts
    FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- Function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
        year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 'INV-' || year_suffix || '-(\d+)') AS INTEGER)), 0) + 1
        INTO sequence_num
        FROM invoices
        WHERE invoice_no LIKE 'INV-' || year_suffix || '-%';
        
        NEW.invoice_no := 'INV-' || year_suffix || '-' || LPAD(sequence_num::VARCHAR, 6, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice numbers
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Function to calculate and create commissions
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
    agent_commission_rate DECIMAL(5,2);
    commission_amount DECIMAL(15,2);
BEGIN
    -- Only create commission for active agreements with agents
    IF NEW.status = 'active' AND NEW.agent_id IS NOT NULL THEN
        -- Get agent commission rate
        SELECT commission_rate INTO agent_commission_rate
        FROM agents
        WHERE agent_id = NEW.agent_id;
        
        -- Calculate commission amount
        commission_amount := NEW.price * (agent_commission_rate / 100);
        
        -- Insert commission record
        INSERT INTO commissions (
            agent_id,
            sale_agreement_id,
            base_amount,
            rate_applied,
            amount,
            balance,
            payable_date,
            status
        ) VALUES (
            NEW.agent_id,
            NEW.sale_agreement_id,
            NEW.price,
            agent_commission_rate,
            commission_amount,
            commission_amount,
            NEW.agreement_date + INTERVAL '30 days',
            'pending'
        ) ON CONFLICT (agent_id, sale_agreement_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate commissions
CREATE TRIGGER calculate_commission_trigger
    AFTER INSERT OR UPDATE ON sale_agreements
    FOR EACH ROW EXECUTE FUNCTION calculate_commission();

-- Function to audit all table changes
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
BEGIN
    table_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        old_data := NULL;
        new_data := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := row_to_json(OLD)::jsonb;
        new_data := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := row_to_json(OLD)::jsonb;
        new_data := NULL;
    END IF;
    
    -- Insert audit record
    INSERT INTO activities_audit (
        entity_type,
        entity_id,
        action,
        description,
        before_snapshot,
        after_snapshot
    ) VALUES (
        table_name,
        COALESCE(
            (new_data->>(table_name || '_id')),
            (old_data->>(table_name || '_id')),
            'unknown'
        ),
        action_type,
        action_type || ' on ' || table_name,
        old_data,
        new_data
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to check ownership percentage constraints
CREATE OR REPLACE FUNCTION validate_ownership_percentage()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calculate total ownership percentage for the parcel
    SELECT COALESCE(SUM(ownership_percentage), 0) INTO total_percentage
    FROM parcel_owners
    WHERE parcel_id = NEW.parcel_id
      AND is_active = TRUE
      AND (parcel_owner_id != NEW.parcel_owner_id OR NEW.parcel_owner_id IS NULL);
    
    -- Add the new/updated percentage
    total_percentage := total_percentage + NEW.ownership_percentage;
    
    -- Check if total exceeds 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total ownership percentage (%.2f%%) cannot exceed 100%% for parcel %', 
            total_percentage, NEW.parcel_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate ownership percentages
CREATE TRIGGER validate_ownership_percentage_trigger
    BEFORE INSERT OR UPDATE ON parcel_owners
    FOR EACH ROW EXECUTE FUNCTION validate_ownership_percentage();

-- Function to prevent duplicate active offers
CREATE OR REPLACE FUNCTION prevent_duplicate_offers()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for existing active offers on the same plot
    IF EXISTS (
        SELECT 1 FROM offers_reservations
        WHERE plot_id = NEW.plot_id
          AND status IN ('reserved', 'accepted')
          AND offer_id != COALESCE(NEW.offer_id, uuid_generate_v4())
    ) THEN
        RAISE EXCEPTION 'Plot already has an active offer or reservation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate offers
CREATE TRIGGER prevent_duplicate_offers_trigger
    BEFORE INSERT OR UPDATE ON offers_reservations
    FOR EACH ROW 
    WHEN (NEW.status IN ('reserved', 'accepted'))
    EXECUTE FUNCTION prevent_duplicate_offers();

-- Function to auto-expire offers
CREATE OR REPLACE FUNCTION auto_expire_offers()
RETURNS void AS $$
BEGIN
    UPDATE offers_reservations
    SET status = 'expired'
    WHERE status IN ('reserved', 'draft')
      AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to generate overdue invoice reminders
CREATE OR REPLACE FUNCTION generate_overdue_reminders()
RETURNS void AS $$
BEGIN
    -- Update overdue invoice status
    UPDATE invoices
    SET status = 'overdue'
    WHERE status IN ('unpaid', 'partly_paid')
      AND due_date < CURRENT_DATE;
    
    -- Create reminder tasks for overdue invoices
    INSERT INTO tasks_reminders (
        title,
        description,
        task_type,
        priority,
        entity_type,
        entity_id,
        due_date
    )
    SELECT 
        'Overdue Invoice: ' || invoice_no,
        'Invoice ' || invoice_no || ' is overdue. Amount: ' || balance,
        'payment_follow_up',
        'high',
        'invoice',
        invoice_id,
        CURRENT_DATE + INTERVAL '1 day'
    FROM invoices
    WHERE status = 'overdue'
      AND NOT EXISTS (
          SELECT 1 FROM tasks_reminders
          WHERE entity_type = 'invoice'
            AND entity_id = invoices.invoice_id
            AND task_type = 'payment_follow_up'
            AND status IN ('pending', 'in_progress')
      );
END;
$$ LANGUAGE plpgsql;

-- Function to get sales dashboard data
CREATE OR REPLACE FUNCTION get_sales_dashboard_data(
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Set default date range if not provided
    start_date := COALESCE(date_from, CURRENT_DATE - INTERVAL '30 days');
    end_date := COALESCE(date_to, CURRENT_DATE);
    
    SELECT json_build_object(
        'total_revenue', (
            SELECT COALESCE(SUM(r.amount), 0)
            FROM receipts r
            WHERE r.paid_date BETWEEN start_date AND end_date
        ),
        'total_sales', (
            SELECT COUNT(*)
            FROM sale_agreements sa
            WHERE sa.agreement_date BETWEEN start_date AND end_date
        ),
        'active_listings', (
            SELECT COUNT(*)
            FROM listings l
            WHERE l.status = 'active'
        ),
        'available_plots', (
            SELECT COUNT(*)
            FROM plots p
            WHERE p.stage = 'ready_for_sale'
        ),
        'pending_transfers', (
            SELECT COUNT(*)
            FROM transfers_titles tt
            WHERE tt.status IN ('pending', 'lodged')
        ),
        'overdue_invoices', (
            SELECT COUNT(*)
            FROM invoices i
            WHERE i.status = 'overdue'
        ),
        'monthly_revenue', (
            SELECT json_agg(
                json_build_object(
                    'month', TO_CHAR(paid_date, 'YYYY-MM'),
                    'revenue', monthly_total
                )
            )
            FROM (
                SELECT 
                    DATE_TRUNC('month', paid_date) as paid_date,
                    SUM(amount) as monthly_total
                FROM receipts
                WHERE paid_date BETWEEN start_date AND end_date
                GROUP BY DATE_TRUNC('month', paid_date)
                ORDER BY DATE_TRUNC('month', paid_date)
            ) monthly_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to find orphaned plots
CREATE OR REPLACE FUNCTION find_orphaned_plots()
RETURNS TABLE(plot_id UUID, plot_no VARCHAR, subdivision_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.plot_id,
        p.plot_no,
        'ORPHANED'::VARCHAR as subdivision_name
    FROM plots p
    LEFT JOIN subdivisions s ON p.subdivision_id = s.subdivision_id
    WHERE s.subdivision_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate LR numbers
CREATE OR REPLACE FUNCTION find_duplicate_lr_numbers()
RETURNS TABLE(lr_number VARCHAR, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.lr_number,
        COUNT(*) as count
    FROM parcels p
    WHERE p.lr_number IS NOT NULL
    GROUP BY p.lr_number
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Delete audit logs older than 2 years
    DELETE FROM activities_audit
    WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
    
    -- Delete user activities older than 1 year
    DELETE FROM user_activities
    WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
    
    -- Delete data access logs older than 2 years
    DELETE FROM data_access_logs
    WHERE accessed_at < CURRENT_DATE - INTERVAL '2 years';
    
    -- Delete security events older than 1 year (except critical ones)
    DELETE FROM security_events
    WHERE created_at < CURRENT_DATE - INTERVAL '1 year'
      AND severity != 'critical';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON FUNCTION calculate_balance_due() IS 'Automatically updates sale agreement balance when receipts are added/modified';
COMMENT ON FUNCTION update_invoice_status() IS 'Updates invoice payment status based on payment allocations';
COMMENT ON FUNCTION generate_receipt_number() IS 'Auto-generates sequential receipt numbers by year';
COMMENT ON FUNCTION calculate_commission() IS 'Automatically calculates and creates agent commissions';
COMMENT ON FUNCTION get_sales_dashboard_data(DATE, DATE) IS 'Returns comprehensive sales dashboard metrics for date range';
COMMENT ON FUNCTION auto_expire_offers() IS 'Automatically expires offers past their expiry date';
COMMENT ON FUNCTION generate_overdue_reminders() IS 'Creates reminder tasks for overdue invoices';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Removes old audit and activity logs to maintain performance';
