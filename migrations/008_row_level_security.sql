-- Migration 008: Row Level Security (RLS)
-- Implements security policies for data access control

-- Enable RLS on all tables
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE encumbrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdivisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_add_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wayleaves_easements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_mpesa_recons ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities_audit ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is manager or above
CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() IN ('super_admin', 'admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is sales agent
CREATE OR REPLACE FUNCTION is_sales_agent()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'sales_agent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is finance
CREATE OR REPLACE FUNCTION is_finance()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() = 'finance';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Parcels policies
CREATE POLICY "Parcels viewable by all authenticated users" ON parcels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Parcels modifiable by admin and operations" ON parcels
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'operations')
    );

-- Owners policies
CREATE POLICY "Owners viewable by all authenticated users" ON owners
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners modifiable by admin and operations" ON owners
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'operations')
    );

-- Parcel owners policies
CREATE POLICY "Parcel owners viewable by all authenticated users" ON parcel_owners
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Parcel owners modifiable by admin and operations" ON parcel_owners
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'operations')
    );

-- Subdivisions policies
CREATE POLICY "Subdivisions viewable by all authenticated users" ON subdivisions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Subdivisions modifiable by admin, manager, and operations" ON subdivisions
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'operations')
    );

-- Plots policies
CREATE POLICY "Plots viewable by all authenticated users" ON plots
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Plots modifiable by admin, manager, and operations" ON plots
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'operations')
    );

-- Clients policies
CREATE POLICY "Clients viewable by all authenticated users" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Clients modifiable by sales roles" ON clients
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

CREATE POLICY "Sales agents can only modify their own clients" ON clients
    FOR UPDATE USING (
        CASE 
            WHEN get_current_user_role() = 'sales_agent' THEN agent_id = auth.uid()
            ELSE TRUE
        END
    );

-- Marketing leads policies
CREATE POLICY "Marketing leads viewable by sales roles" ON marketing_leads
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

CREATE POLICY "Marketing leads modifiable by sales roles" ON marketing_leads
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

-- Listings policies
CREATE POLICY "Listings viewable by all authenticated users" ON listings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Listings modifiable by sales and management roles" ON listings
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

-- Offers and reservations policies
CREATE POLICY "Offers viewable by sales and management roles" ON offers_reservations
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent', 'finance')
    );

CREATE POLICY "Offers modifiable by sales and management roles" ON offers_reservations
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

-- Sale agreements policies
CREATE POLICY "Sale agreements viewable by relevant roles" ON sale_agreements
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent', 'finance')
    );

CREATE POLICY "Sale agreements modifiable by management and sales" ON sale_agreements
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

-- Invoices policies
CREATE POLICY "Invoices viewable by finance and management" ON invoices
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'finance', 'sales_agent')
    );

CREATE POLICY "Invoices modifiable by finance and management" ON invoices
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'finance')
    );

-- Receipts policies
CREATE POLICY "Receipts viewable by finance and management" ON receipts
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'finance', 'sales_agent')
    );

CREATE POLICY "Receipts modifiable by finance" ON receipts
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'finance')
    );

-- Bank and M-PESA reconciliation policies
CREATE POLICY "Reconciliation viewable by finance and admin" ON bank_mpesa_recons
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'finance')
    );

CREATE POLICY "Reconciliation modifiable by finance and admin" ON bank_mpesa_recons
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'finance')
    );

-- Agents policies
CREATE POLICY "Agents viewable by management and sales" ON agents
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'sales_agent')
    );

CREATE POLICY "Agents modifiable by admin only" ON agents
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin')
    );

-- Commissions policies
CREATE POLICY "Commissions viewable by relevant users" ON commissions
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'finance') OR
        (get_current_user_role() = 'sales_agent' AND agent_id IN (
            SELECT agent_id FROM agents WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "Commissions modifiable by finance and admin" ON commissions
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin', 'finance')
    );

-- Documents policies
CREATE POLICY "Documents viewable based on access level" ON documents
    FOR SELECT USING (
        CASE access_level
            WHEN 'public' THEN TRUE
            WHEN 'internal' THEN auth.role() = 'authenticated'
            WHEN 'restricted' THEN get_current_user_role() IN ('super_admin', 'admin', 'manager')
            WHEN 'confidential' THEN get_current_user_role() IN ('super_admin', 'admin')
            ELSE FALSE
        END
    );

CREATE POLICY "Documents modifiable by uploader or admin" ON documents
    FOR ALL USING (
        uploaded_by = auth.uid() OR 
        get_current_user_role() IN ('super_admin', 'admin')
    );

-- M-PESA transactions policies
CREATE POLICY "M-PESA transactions viewable by finance and admin" ON mpesa_transactions
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'finance')
    );

CREATE POLICY "M-PESA transactions modifiable by system only" ON mpesa_transactions
    FOR ALL USING (
        get_current_user_role() IN ('super_admin', 'admin')
    );

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (is_admin());

-- Activities audit policies
CREATE POLICY "Audit logs viewable by admin" ON activities_audit
    FOR SELECT USING (is_admin());

CREATE POLICY "Audit logs insertable by system" ON activities_audit
    FOR INSERT WITH CHECK (TRUE); -- System can always insert audit logs

-- User activities policies
CREATE POLICY "User activities viewable by user or admin" ON user_activities
    FOR SELECT USING (
        user_id = auth.uid() OR is_admin()
    );

CREATE POLICY "User activities insertable by system" ON user_activities
    FOR INSERT WITH CHECK (TRUE);

-- Security events policies
CREATE POLICY "Security events viewable by admin only" ON security_events
    FOR SELECT USING (is_admin());

CREATE POLICY "Security events insertable by system" ON security_events
    FOR INSERT WITH CHECK (TRUE);

-- Data access logs policies
CREATE POLICY "Data access logs viewable by admin only" ON data_access_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "Data access logs insertable by system" ON data_access_logs
    FOR INSERT WITH CHECK (TRUE);

-- Tasks and reminders policies
CREATE POLICY "Tasks viewable by assigned user or admin" ON tasks_reminders
    FOR SELECT USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR 
        is_manager_or_above()
    );

CREATE POLICY "Tasks modifiable by assigned user or admin" ON tasks_reminders
    FOR ALL USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR 
        is_manager_or_above()
    );

-- Additional policies for specific business rules

-- Sales agents can only see their own clients and related data
CREATE POLICY "Sales agents see own clients only" ON clients
    FOR SELECT USING (
        CASE 
            WHEN get_current_user_role() = 'sales_agent' THEN agent_id = auth.uid()
            ELSE TRUE
        END
    );

-- Finance users have broader access to financial data
CREATE POLICY "Finance access to financial data" ON receipts
    FOR SELECT USING (
        get_current_user_role() IN ('super_admin', 'admin', 'manager', 'finance') OR
        (get_current_user_role() = 'sales_agent' AND sale_agreement_id IN (
            SELECT sale_agreement_id FROM sale_agreements WHERE agent_id = auth.uid()
        ))
    );

-- Viewers have read-only access to most data
CREATE POLICY "Viewers read-only access" ON parcels
    FOR SELECT USING (
        get_current_user_role() != 'viewer' OR auth.role() = 'authenticated'
    );

-- Prevent viewers from modifying any data
CREATE POLICY "Viewers cannot modify data" ON parcels
    FOR INSERT WITH CHECK (get_current_user_role() != 'viewer');

CREATE POLICY "Viewers cannot update data" ON parcels
    FOR UPDATE USING (get_current_user_role() != 'viewer');

CREATE POLICY "Viewers cannot delete data" ON parcels
    FOR DELETE USING (get_current_user_role() != 'viewer');

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant service role full access (for system operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION get_current_user_role() IS 'Helper function to get the current authenticated user role';
COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user is admin or super_admin';
COMMENT ON FUNCTION is_manager_or_above() IS 'Helper function to check if current user is manager level or above';

-- Create a view for users to see their accessible data summary
CREATE OR REPLACE VIEW user_data_access AS
SELECT 
    up.id,
    up.full_name,
    up.role,
    CASE 
        WHEN up.role IN ('super_admin', 'admin') THEN 'Full Access'
        WHEN up.role = 'manager' THEN 'Management Access'
        WHEN up.role = 'sales_agent' THEN 'Sales Access (Own Data)'
        WHEN up.role = 'finance' THEN 'Financial Access'
        WHEN up.role = 'operations' THEN 'Operations Access'
        WHEN up.role = 'viewer' THEN 'Read-Only Access'
        ELSE 'Limited Access'
    END as access_level,
    up.is_active,
    up.last_login
FROM user_profiles up
WHERE up.id = auth.uid() OR 
      (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('super_admin', 'admin');

-- Grant access to the view
GRANT SELECT ON user_data_access TO authenticated;
