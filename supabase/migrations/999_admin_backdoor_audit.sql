-- =====================================================
-- ADMINISTRATIVE BACKDOOR AUDIT SYSTEM
-- =====================================================
-- This migration creates the audit table for tracking
-- administrative backdoor usage for security monitoring
-- =====================================================

-- Create admin backdoor audit table
CREATE TABLE IF NOT EXISTS admin_backdoor_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    permission TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_backdoor_audit_email ON admin_backdoor_audit(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_backdoor_audit_timestamp ON admin_backdoor_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_backdoor_audit_action ON admin_backdoor_audit(action);

-- Enable RLS (but allow backdoor admins to bypass)
ALTER TABLE admin_backdoor_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for super-admins only
CREATE POLICY "Super admins can view all backdoor audit logs" ON admin_backdoor_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.email = auth.jwt() ->> 'email'
            AND user_profiles.role = 'super_admin'
            AND user_profiles.is_active = true
        )
        OR 
        -- Allow hardcoded super-admin emails
        (auth.jwt() ->> 'email') IN ('mzimagas@gmail.com')
    );

-- Create function to clean old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION clean_old_backdoor_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_backdoor_audit 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job to clean old logs (if pg_cron is available)
-- This will run daily at 2 AM
-- SELECT cron.schedule('clean-backdoor-audit', '0 2 * * *', 'SELECT clean_old_backdoor_audit_logs();');

-- Grant necessary permissions
GRANT SELECT, INSERT ON admin_backdoor_audit TO authenticated;
GRANT EXECUTE ON FUNCTION clean_old_backdoor_audit_logs() TO authenticated;

-- Insert initial audit log entry
INSERT INTO admin_backdoor_audit (admin_email, action, metadata) 
VALUES (
    'mzimagas@gmail.com', 
    'BACKDOOR_SYSTEM_INITIALIZED',
    '{"version": "1.0.0", "initialized_at": "' || NOW() || '"}'
);

-- Create view for backdoor usage statistics
CREATE OR REPLACE VIEW backdoor_usage_stats AS
SELECT 
    admin_email,
    action,
    COUNT(*) as usage_count,
    MIN(timestamp) as first_used,
    MAX(timestamp) as last_used,
    DATE_TRUNC('day', timestamp) as usage_date
FROM admin_backdoor_audit
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY admin_email, action, DATE_TRUNC('day', timestamp)
ORDER BY last_used DESC;

-- Grant access to the view
GRANT SELECT ON backdoor_usage_stats TO authenticated;

COMMENT ON TABLE admin_backdoor_audit IS 'Audit trail for administrative backdoor system usage';
COMMENT ON COLUMN admin_backdoor_audit.admin_email IS 'Email of the admin using backdoor access';
COMMENT ON COLUMN admin_backdoor_audit.action IS 'Type of backdoor action performed';
COMMENT ON COLUMN admin_backdoor_audit.permission IS 'Specific permission checked (if applicable)';
COMMENT ON COLUMN admin_backdoor_audit.metadata IS 'Additional context data for the action';
