-- Migration: Add audit trail and conflict resolution tables
-- Created: 2025-08-30
-- Purpose: Enable comprehensive audit logging and conflict resolution for property management

-- Create audit_logs table for comprehensive change tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'IMPORT')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_role TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id);

-- Create data_conflicts table for conflict resolution
CREATE TABLE IF NOT EXISTS data_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    local_value JSONB,
    server_value JSONB,
    local_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('UPDATE_CONFLICT', 'DELETE_CONFLICT', 'CONCURRENT_EDIT')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'IGNORED')),
    resolution_strategy TEXT CHECK (resolution_strategy IN ('KEEP_LOCAL', 'KEEP_SERVER', 'MERGE', 'MANUAL')),
    resolved_value JSONB,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for conflict resolution
CREATE INDEX IF NOT EXISTS idx_data_conflicts_table_record ON data_conflicts(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_user_id ON data_conflicts(user_id);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_status ON data_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_created_at ON data_conflicts(created_at DESC);

-- Create RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs and admins can view all
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: System can insert audit logs (no user restrictions for logging)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy: Only admins can delete audit logs (for cleanup)
CREATE POLICY "Admins can delete old audit logs" ON audit_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create RLS policies for data_conflicts
ALTER TABLE data_conflicts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and manage their own conflicts
CREATE POLICY "Users can manage own conflicts" ON data_conflicts
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create function to automatically log property changes
CREATE OR REPLACE FUNCTION log_property_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[] := '{}';
    old_vals JSONB := '{}';
    new_vals JSONB := '{}';
    field_name TEXT;
BEGIN
    -- Only log for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Compare old and new values
        FOR field_name IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
            IF to_jsonb(OLD)->>field_name IS DISTINCT FROM to_jsonb(NEW)->>field_name THEN
                changed_fields := array_append(changed_fields, field_name);
                old_vals := old_vals || jsonb_build_object(field_name, to_jsonb(OLD)->>field_name);
                new_vals := new_vals || jsonb_build_object(field_name, to_jsonb(NEW)->>field_name);
            END IF;
        END LOOP;
        
        -- Only log if there are actual changes (excluding updated_at)
        IF array_length(changed_fields, 1) > 0 AND NOT (array_length(changed_fields, 1) = 1 AND changed_fields[1] = 'updated_at') THEN
            INSERT INTO audit_logs (
                table_name,
                record_id,
                action,
                old_values,
                new_values,
                changed_fields,
                user_id,
                context
            ) VALUES (
                TG_TABLE_NAME,
                NEW.id::TEXT,
                'UPDATE',
                old_vals,
                new_vals,
                changed_fields,
                auth.uid(),
                jsonb_build_object(
                    'source', 'DATABASE_TRIGGER',
                    'table', TG_TABLE_NAME,
                    'operation', TG_OP
                )
            );
        END IF;
    END IF;
    
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            new_values,
            user_id,
            context
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'CREATE',
            to_jsonb(NEW),
            auth.uid(),
            jsonb_build_object(
                'source', 'DATABASE_TRIGGER',
                'table', TG_TABLE_NAME,
                'operation', TG_OP
            )
        );
    END IF;
    
    -- For DELETE operations
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            user_id,
            context
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id::TEXT,
            'DELETE',
            to_jsonb(OLD),
            auth.uid(),
            jsonb_build_object(
                'source', 'DATABASE_TRIGGER',
                'table', TG_TABLE_NAME,
                'operation', TG_OP
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for key tables
CREATE TRIGGER audit_properties_changes
    AFTER INSERT OR UPDATE OR DELETE ON properties
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();

CREATE TRIGGER audit_purchase_pipeline_changes
    AFTER INSERT OR UPDATE OR DELETE ON purchase_pipeline
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();

CREATE TRIGGER audit_property_subdivisions_changes
    AFTER INSERT OR UPDATE OR DELETE ON property_subdivisions
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();

CREATE TRIGGER audit_property_handovers_changes
    AFTER INSERT OR UPDATE OR DELETE ON property_handovers
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();

CREATE TRIGGER audit_property_documents_changes
    AFTER INSERT OR UPDATE OR DELETE ON property_documents
    FOR EACH ROW EXECUTE FUNCTION log_property_changes();

-- Create function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 2555)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get audit summary
CREATE OR REPLACE FUNCTION get_audit_summary(days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_actions BIGINT,
    actions_by_type JSONB,
    actions_by_user JSONB,
    actions_by_table JSONB,
    recent_activity JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH audit_data AS (
        SELECT *
        FROM audit_logs
        WHERE timestamp >= NOW() - INTERVAL '1 day' * days
    ),
    type_counts AS (
        SELECT jsonb_object_agg(action, count) as actions_by_type
        FROM (
            SELECT action, COUNT(*) as count
            FROM audit_data
            GROUP BY action
        ) t
    ),
    user_counts AS (
        SELECT jsonb_object_agg(COALESCE(user_email, user_id::TEXT), count) as actions_by_user
        FROM (
            SELECT user_id, user_email, COUNT(*) as count
            FROM audit_data
            WHERE user_id IS NOT NULL
            GROUP BY user_id, user_email
        ) u
    ),
    table_counts AS (
        SELECT jsonb_object_agg(table_name, count) as actions_by_table
        FROM (
            SELECT table_name, COUNT(*) as count
            FROM audit_data
            GROUP BY table_name
        ) tb
    ),
    recent AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'table_name', table_name,
                'action', action,
                'user_email', user_email,
                'timestamp', timestamp
            )
        ) as recent_activity
        FROM (
            SELECT id, table_name, action, user_email, timestamp
            FROM audit_data
            ORDER BY timestamp DESC
            LIMIT 20
        ) r
    )
    SELECT 
        (SELECT COUNT(*) FROM audit_data)::BIGINT,
        COALESCE(type_counts.actions_by_type, '{}'::JSONB),
        COALESCE(user_counts.actions_by_user, '{}'::JSONB),
        COALESCE(table_counts.actions_by_table, '{}'::JSONB),
        COALESCE(recent.recent_activity, '[]'::JSONB)
    FROM type_counts, user_counts, table_counts, recent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON data_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all property management operations';
COMMENT ON TABLE data_conflicts IS 'Conflict resolution tracking for concurrent data modifications';
COMMENT ON FUNCTION log_property_changes IS 'Automatically logs changes to property-related tables';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than specified retention period';
COMMENT ON FUNCTION get_audit_summary IS 'Provides audit activity summary for dashboard reporting';
