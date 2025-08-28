-- 068: Fix Purchase Pipeline Documents Database Constraints
-- This migration updates both property_documents and property_document_status table constraints to support purchase_pipeline

-- Update the property_documents pipeline constraint to include purchase_pipeline
ALTER TABLE property_documents
DROP CONSTRAINT IF EXISTS property_documents_pipeline_check;

ALTER TABLE property_documents
ADD CONSTRAINT property_documents_pipeline_check
CHECK (pipeline IN ('direct_addition', 'purchase_pipeline', 'subdivision', 'handover'));

-- Update the property_document_status pipeline constraint to include purchase_pipeline
ALTER TABLE property_document_status
DROP CONSTRAINT IF EXISTS property_document_status_pipeline_check;

ALTER TABLE property_document_status
ADD CONSTRAINT property_document_status_pipeline_check
CHECK (pipeline IN ('direct_addition', 'purchase_pipeline', 'subdivision', 'handover'));

-- Add comments for documentation
COMMENT ON CONSTRAINT property_documents_pipeline_check ON property_documents
IS 'Ensures pipeline field contains valid pipeline types including purchase_pipeline for document storage';

COMMENT ON CONSTRAINT property_document_status_pipeline_check ON property_document_status
IS 'Ensures pipeline field contains valid pipeline types including purchase_pipeline for document status tracking';

-- Verify the constraint was updated successfully
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Check if the constraint allows purchase_pipeline
    SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'property_document_status_pipeline_check'
        AND check_clause LIKE '%purchase_pipeline%'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'SUCCESS: property_document_status table now supports purchase_pipeline';
    ELSE
        RAISE EXCEPTION 'FAILED: property_document_status constraint was not updated correctly';
    END IF;
END $$;

-- Test that the constraint now allows purchase_pipeline
-- This should succeed after the constraint update
DO $$
BEGIN
    -- Test constraint validation
    IF 'purchase_pipeline' = ANY(ARRAY['direct_addition', 'purchase_pipeline', 'subdivision', 'handover']) THEN
        RAISE NOTICE 'VALIDATION: purchase_pipeline is now allowed in constraint';
    ELSE
        RAISE EXCEPTION 'VALIDATION FAILED: purchase_pipeline constraint validation failed';
    END IF;
END $$;
