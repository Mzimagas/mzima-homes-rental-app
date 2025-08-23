-- Migration: Create Permission Templates
-- Created: 2024-01-15
-- Description: Creates predefined role templates and permission configurations

-- Permission templates table for reusable role configurations
CREATE TABLE IF NOT EXISTS permission_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    template_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10), -- Emoji or icon identifier
    
    -- Template configuration
    role_template role_template NOT NULL,
    default_scope permission_scope DEFAULT 'property',
    
    -- Section permissions (JSON structure)
    section_permissions JSONB NOT NULL DEFAULT '{}',
    
    -- Template metadata
    is_system_template BOOLEAN DEFAULT false, -- Cannot be deleted if true
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Insert predefined role templates
INSERT INTO permission_templates (
    template_name, 
    display_name, 
    description, 
    icon, 
    role_template, 
    default_scope, 
    section_permissions, 
    is_system_template
) VALUES 
-- Administrator Template
(
    'admin',
    'Administrator',
    'Full system access with edit permissions across all sections',
    '👑',
    'admin',
    'global',
    '{
        "direct_addition": {"level": "edit", "details": {"basic_info": "edit", "location": "edit", "documents": "edit", "financial": "edit"}},
        "purchase_pipeline": {"level": "edit", "details": {"basic_info": "edit", "location": "edit", "documents": "edit", "financial": "edit"}},
        "subdivision_process": {"level": "edit", "details": {"basic_info": "edit", "location": "edit", "documents": "edit", "financial": "edit"}},
        "property_handover": {"level": "edit", "details": {"basic_info": "edit", "location": "edit", "documents": "edit", "financial": "edit"}},
        "audit_trail": {"level": "edit", "details": {}}
    }',
    true
),

-- Supervisor Template
(
    'supervisor',
    'Supervisor',
    'View-only access across all sections for oversight and monitoring',
    '👁️',
    'supervisor',
    'global',
    '{
        "direct_addition": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "view", "financial": "view"}},
        "purchase_pipeline": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "view", "financial": "view"}},
        "subdivision_process": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "view", "financial": "view"}},
        "property_handover": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "view", "financial": "view"}},
        "audit_trail": {"level": "view", "details": {}}
    }',
    true
),

-- Staff Template
(
    'staff',
    'Staff',
    'Edit access to Direct Addition and Property Handover, view access to other sections',
    '📝',
    'staff',
    'property',
    '{
        "direct_addition": {"level": "edit", "details": {"basic_info": "edit", "location": "edit", "documents": "edit", "financial": "view"}},
        "purchase_pipeline": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "view", "financial": "none"}},
        "subdivision_process": {"level": "none", "details": {"basic_info": "none", "location": "none", "documents": "none", "financial": "none"}},
        "property_handover": {"level": "edit", "details": {"basic_info": "edit", "location": "edit", "documents": "edit", "financial": "view"}},
        "audit_trail": {"level": "none", "details": {}}
    }',
    true
),

-- Member Template
(
    'member',
    'Member',
    'Limited view access excluding Direct Addition and Audit Trail',
    '👤',
    'member',
    'property',
    '{
        "direct_addition": {"level": "none", "details": {"basic_info": "none", "location": "none", "documents": "none", "financial": "none"}},
        "purchase_pipeline": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "none", "financial": "none"}},
        "subdivision_process": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "none", "financial": "none"}},
        "property_handover": {"level": "view", "details": {"basic_info": "view", "location": "view", "documents": "none", "financial": "none"}},
        "audit_trail": {"level": "none", "details": {}}
    }',
    true
);

-- Permission sections reference table
CREATE TABLE IF NOT EXISTS permission_sections (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Section details configuration
    available_details JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert permission sections
INSERT INTO permission_sections (id, name, description, icon, sort_order, available_details) VALUES
('direct_addition', 'Direct Addition', 'Add properties directly to the system', '🏠', 1, 
 '["basic_info", "location", "documents", "financial"]'),
('purchase_pipeline', 'Purchase Pipeline', 'Manage property acquisition process', '🏢', 2, 
 '["basic_info", "location", "documents", "financial"]'),
('subdivision_process', 'Subdivision Process', 'Handle property subdivision workflows', '🏗️', 3, 
 '["basic_info", "location", "documents", "financial"]'),
('property_handover', 'Property Handover', 'Manage property transfer and handover', '📋', 4, 
 '["basic_info", "location", "documents", "financial"]'),
('audit_trail', 'Audit Trail', 'View system audit logs and changes', '🔍', 5, '[]');

-- Permission detail types reference
CREATE TABLE IF NOT EXISTS permission_detail_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0
);

-- Insert permission detail types
INSERT INTO permission_detail_types (id, name, description, icon, sort_order) VALUES
('basic_info', 'Basic Information', 'Property basic details and metadata', 'ℹ️', 1),
('location', 'Location Details', 'Property location and geographic information', '📍', 2),
('documents', 'Documents', 'Property documents and file management', '📄', 3),
('financial', 'Financial Information', 'Property financial data and transactions', '💰', 4);

-- Functions for permission management
CREATE OR REPLACE FUNCTION apply_permission_template(
    p_user_id UUID,
    p_template_name VARCHAR(50),
    p_scope permission_scope DEFAULT NULL,
    p_property_id UUID DEFAULT NULL,
    p_assigned_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    template_record permission_templates%ROWTYPE;
    permission_id UUID;
    effective_scope permission_scope;
BEGIN
    -- Get template
    SELECT * INTO template_record 
    FROM permission_templates 
    WHERE template_name = p_template_name AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Permission template % not found', p_template_name;
    END IF;
    
    -- Determine effective scope
    effective_scope := COALESCE(p_scope, template_record.default_scope);
    
    -- Validate scope and property_id combination
    IF effective_scope = 'global' AND p_property_id IS NOT NULL THEN
        RAISE EXCEPTION 'Global scope cannot have a property_id';
    END IF;
    
    IF effective_scope = 'property' AND p_property_id IS NULL THEN
        RAISE EXCEPTION 'Property scope requires a property_id';
    END IF;
    
    -- Insert or update permission
    INSERT INTO user_permissions (
        user_id,
        scope,
        property_id,
        role_template,
        section_permissions,
        assigned_by
    ) VALUES (
        p_user_id,
        effective_scope,
        p_property_id,
        template_record.role_template,
        template_record.section_permissions,
        COALESCE(p_assigned_by, auth.uid())
    )
    ON CONFLICT (user_id, scope, property_id) 
    DO UPDATE SET
        role_template = EXCLUDED.role_template,
        section_permissions = EXCLUDED.section_permissions,
        assigned_at = NOW(),
        assigned_by = EXCLUDED.assigned_by,
        is_active = true
    RETURNING id INTO permission_id;
    
    -- Log the permission change
    INSERT INTO permission_audit_log (
        user_id,
        action,
        permission_details,
        scope,
        property_id,
        role_template,
        performed_by
    ) VALUES (
        p_user_id,
        'granted',
        template_record.section_permissions,
        effective_scope,
        p_property_id,
        template_record.role_template,
        COALESCE(p_assigned_by, auth.uid())
    );
    
    RETURN permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
    p_user_id UUID,
    p_property_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    global_perms JSONB := '{}';
    property_perms JSONB := '{}';
    effective_perms JSONB := '{}';
BEGIN
    -- Get global permissions
    SELECT COALESCE(section_permissions, '{}') INTO global_perms
    FROM user_permissions
    WHERE user_id = p_user_id 
    AND scope = 'global' 
    AND is_active = true;
    
    -- Get property-specific permissions if property_id provided
    IF p_property_id IS NOT NULL THEN
        SELECT COALESCE(section_permissions, '{}') INTO property_perms
        FROM user_permissions
        WHERE user_id = p_user_id 
        AND scope = 'property' 
        AND property_id = p_property_id 
        AND is_active = true;
    END IF;
    
    -- Merge permissions (property-specific overrides global)
    effective_perms := global_perms;
    
    -- Override with property-specific permissions
    SELECT jsonb_object_agg(key, value) INTO effective_perms
    FROM (
        SELECT key, 
               CASE 
                   WHEN property_perms ? key THEN property_perms->key
                   ELSE global_perms->key
               END as value
        FROM jsonb_object_keys(global_perms || property_perms) AS key
    ) merged;
    
    RETURN COALESCE(effective_perms, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX idx_permission_templates_role_template ON permission_templates(role_template);
CREATE INDEX idx_permission_templates_active ON permission_templates(is_active);
CREATE INDEX idx_permission_sections_sort_order ON permission_sections(sort_order);

-- Apply updated_at trigger
CREATE TRIGGER update_permission_templates_updated_at 
    BEFORE UPDATE ON permission_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for permission templates
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_detail_types ENABLE ROW LEVEL SECURITY;

-- Allow read access to permission templates for authenticated users
CREATE POLICY "Authenticated users can view permission templates" ON permission_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view permission sections" ON permission_sections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view permission detail types" ON permission_detail_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify permission templates
CREATE POLICY "Admins can manage permission templates" ON permission_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions up 
            WHERE up.user_id = auth.uid() 
            AND up.role_template = 'admin' 
            AND up.is_active = true
        )
    );

-- Comments
COMMENT ON TABLE permission_templates IS 'Predefined role templates with section permissions for easy assignment';
COMMENT ON TABLE permission_sections IS 'Available permission sections in the system';
COMMENT ON TABLE permission_detail_types IS 'Available permission detail types for granular control';

COMMENT ON FUNCTION apply_permission_template IS 'Applies a permission template to a user with optional scope and property overrides';
COMMENT ON FUNCTION get_user_effective_permissions IS 'Returns merged effective permissions for a user, combining global and property-specific permissions';
