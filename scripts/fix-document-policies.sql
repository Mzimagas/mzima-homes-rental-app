-- Fix document RLS policies to allow authenticated users to access documents
-- This addresses the issue where documents are not loading due to overly restrictive policies

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Documents viewable based on access level" ON documents;
DROP POLICY IF EXISTS "Documents modifiable by uploader or admin" ON documents;

-- Create more permissive policies for authenticated users
-- Allow authenticated users to view all documents (can be restricted later if needed)
CREATE POLICY "Authenticated users can view documents" ON documents
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Allow authenticated users to insert documents
CREATE POLICY "Authenticated users can insert documents" ON documents
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Allow users to update their own documents or if they have admin role
CREATE POLICY "Users can update their documents" ON documents
FOR UPDATE USING (
  auth.role() = 'authenticated' AND (
    uploaded_by = auth.uid() OR 
    COALESCE(get_current_user_role()::text, '') IN ('super_admin', 'admin')
  )
);

-- Allow users to delete their own documents or if they have admin role
CREATE POLICY "Users can delete their documents" ON documents
FOR DELETE USING (
  auth.role() = 'authenticated' AND (
    uploaded_by = auth.uid() OR 
    COALESCE(get_current_user_role()::text, '') IN ('super_admin', 'admin')
  )
);

-- Ensure RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
GRANT USAGE ON SEQUENCE documents_document_id_seq TO authenticated;
