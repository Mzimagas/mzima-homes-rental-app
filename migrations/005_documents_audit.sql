-- Migration 005: Documents and Audit Schema
-- Creates tables for document management, M-PESA transactions, and audit logging

-- Create document and audit-related types (with IF NOT EXISTS handling)
DO $$
BEGIN
    -- Create document_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'title', 'deed_plan', 'survey_report', 'agreement', 'receipt', 'invoice',
            'id_copy', 'kra_pin', 'passport', 'photo', 'correspondence', 'legal',
            'approval', 'eia', 'nema', 'physical_planning', 'wayleave', 'other'
        );
    END IF;

    -- Create access_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_level') THEN
        CREATE TYPE access_level AS ENUM ('public', 'internal', 'restricted', 'confidential');
    END IF;

    -- Create mpesa_result_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mpesa_result_code') THEN
        CREATE TYPE mpesa_result_code AS ENUM ('0', '1', '1032', '1037', '1025', '1019');
    END IF;

    -- Create task_priority if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;

    -- Create task_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

-- Documents table - Document management system
CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'parcel', 'client', 'agreement', etc.
    entity_id UUID NOT NULL,
    doc_type document_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash for integrity
    version INTEGER DEFAULT 1 CHECK (version > 0),
    is_current_version BOOLEAN DEFAULT TRUE,
    parent_document_id UUID REFERENCES documents(document_id),
    access_level access_level DEFAULT 'internal',
    tags TEXT[], -- Array of tags for categorization
    uploaded_by UUID REFERENCES user_profiles(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB, -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (expires_at IS NULL OR expires_at > uploaded_at)
);

-- M-PESA transactions table - M-PESA payment tracking
CREATE TABLE mpesa_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_request_id VARCHAR(50),
    checkout_request_id VARCHAR(50) UNIQUE,
    result_code mpesa_result_code,
    result_desc TEXT,
    amount DECIMAL(15,2) CHECK (amount > 0),
    mpesa_receipt_number VARCHAR(50),
    transaction_date TIMESTAMP WITH TIME ZONE,
    phone_number VARCHAR(15),
    account_reference VARCHAR(100),
    transaction_desc TEXT,
    receipt_id UUID REFERENCES receipts(receipt_id),
    callback_data JSONB, -- Full callback payload
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activities table - Detailed user activity logging
CREATE TABLE user_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    performed_by UUID REFERENCES user_profiles(id), -- For admin actions on behalf of users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table - Security-related event logging
CREATE TABLE security_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL, -- 'login_success', 'login_failure', 'password_change', etc.
    user_id UUID REFERENCES user_profiles(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES user_profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data access logs table - Track access to sensitive data
CREATE TABLE data_access_logs (
    access_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    access_type VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks and reminders table - Task management system
CREATE TABLE tasks_reminders (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL, -- 'follow_up', 'document_expiry', 'payment_due', etc.
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'pending',
    assigned_to UUID REFERENCES user_profiles(id),
    created_by UUID REFERENCES user_profiles(id),
    entity_type VARCHAR(50), -- Related entity type
    entity_id UUID, -- Related entity ID
    due_date DATE,
    reminder_date DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (completed_date IS NULL OR completed_date >= created_at::date),
    CHECK (reminder_date IS NULL OR due_date IS NULL OR reminder_date <= due_date)
);

-- Create indexes for performance
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_access_level ON documents(access_level);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_current_version ON documents(is_current_version);
CREATE INDEX idx_documents_archived ON documents(is_archived);
CREATE INDEX idx_documents_title_gin ON documents USING gin(title gin_trgm_ops);
CREATE INDEX idx_documents_tags_gin ON documents USING gin(tags);

CREATE INDEX idx_mpesa_transactions_checkout_request ON mpesa_transactions(checkout_request_id);
CREATE INDEX idx_mpesa_transactions_receipt_number ON mpesa_transactions(mpesa_receipt_number);
CREATE INDEX idx_mpesa_transactions_phone ON mpesa_transactions(phone_number);
CREATE INDEX idx_mpesa_transactions_processed ON mpesa_transactions(processed);
CREATE INDEX idx_mpesa_transactions_result_code ON mpesa_transactions(result_code);
CREATE INDEX idx_mpesa_transactions_date ON mpesa_transactions(transaction_date);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_action ON user_activities(action);
CREATE INDEX idx_user_activities_entity ON user_activities(entity_type, entity_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);

CREATE INDEX idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_entity ON data_access_logs(entity_type, entity_id);
CREATE INDEX idx_data_access_logs_access_type ON data_access_logs(access_type);
CREATE INDEX idx_data_access_logs_accessed_at ON data_access_logs(accessed_at);

CREATE INDEX idx_tasks_reminders_assigned_to ON tasks_reminders(assigned_to);
CREATE INDEX idx_tasks_reminders_status ON tasks_reminders(status);
CREATE INDEX idx_tasks_reminders_priority ON tasks_reminders(priority);
CREATE INDEX idx_tasks_reminders_due_date ON tasks_reminders(due_date);
CREATE INDEX idx_tasks_reminders_entity ON tasks_reminders(entity_type, entity_id);

-- Apply updated_at triggers
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mpesa_transactions_updated_at BEFORE UPDATE ON mpesa_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_reminders_updated_at BEFORE UPDATE ON tasks_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle document versioning
CREATE OR REPLACE FUNCTION handle_document_versioning()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new version of an existing document
    IF NEW.parent_document_id IS NOT NULL THEN
        -- Mark all previous versions as not current
        UPDATE documents 
        SET is_current_version = FALSE 
        WHERE parent_document_id = NEW.parent_document_id 
           OR document_id = NEW.parent_document_id;
        
        -- Set the new document as current version
        NEW.is_current_version = TRUE;
        
        -- Increment version number
        SELECT COALESCE(MAX(version), 0) + 1 
        INTO NEW.version
        FROM documents 
        WHERE parent_document_id = NEW.parent_document_id 
           OR document_id = NEW.parent_document_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for document versioning
CREATE TRIGGER handle_document_versioning_trigger
    BEFORE INSERT ON documents
    FOR EACH ROW EXECUTE FUNCTION handle_document_versioning();

-- Function to auto-create tasks for document expiry
CREATE OR REPLACE FUNCTION create_document_expiry_task()
RETURNS TRIGGER AS $$
BEGIN
    -- Create reminder task if document has expiry date
    IF NEW.expires_at IS NOT NULL THEN
        INSERT INTO tasks_reminders (
            title,
            description,
            task_type,
            priority,
            assigned_to,
            entity_type,
            entity_id,
            due_date,
            reminder_date
        ) VALUES (
            'Document Expiry: ' || NEW.title,
            'Document "' || NEW.title || '" expires on ' || NEW.expires_at::date,
            'document_expiry',
            'medium',
            NEW.uploaded_by,
            'document',
            NEW.document_id,
            NEW.expires_at::date,
            (NEW.expires_at::date - INTERVAL '30 days')::date
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create expiry tasks
CREATE TRIGGER create_document_expiry_task_trigger
    AFTER INSERT ON documents
    FOR EACH ROW EXECUTE FUNCTION create_document_expiry_task();

-- Function to log M-PESA transaction processing
CREATE OR REPLACE FUNCTION log_mpesa_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when M-PESA transaction is processed
    IF NEW.processed = TRUE AND OLD.processed = FALSE THEN
        INSERT INTO user_activities (
            user_id,
            action,
            entity_type,
            entity_id,
            details
        ) VALUES (
            NULL, -- System action
            'mpesa_transaction_processed',
            'mpesa_transaction',
            NEW.transaction_id,
            jsonb_build_object(
                'checkout_request_id', NEW.checkout_request_id,
                'result_code', NEW.result_code,
                'amount', NEW.amount,
                'mpesa_receipt_number', NEW.mpesa_receipt_number
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log M-PESA processing
CREATE TRIGGER log_mpesa_processing_trigger
    AFTER UPDATE ON mpesa_transactions
    FOR EACH ROW EXECUTE FUNCTION log_mpesa_processing();

-- Function to update task completion
CREATE OR REPLACE FUNCTION update_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completion date when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_date = CURRENT_DATE;
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_date = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update task completion
CREATE TRIGGER update_task_completion_trigger
    BEFORE UPDATE ON tasks_reminders
    FOR EACH ROW EXECUTE FUNCTION update_task_completion();

-- Comments for documentation
COMMENT ON TABLE documents IS 'Document management system with versioning and access control';
COMMENT ON TABLE mpesa_transactions IS 'M-PESA payment transaction tracking and callback handling';
COMMENT ON TABLE user_activities IS 'Detailed logging of user activities within the system';
COMMENT ON TABLE security_events IS 'Security-related events and potential threats logging';
COMMENT ON TABLE data_access_logs IS 'Audit trail for access to sensitive data';
COMMENT ON TABLE tasks_reminders IS 'Task management and reminder system for follow-ups';
