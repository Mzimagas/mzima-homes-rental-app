-- 034: Create public-media storage bucket for unit photos

-- Create the public-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-media',
  'public-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-media' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files or files they have property access to
CREATE POLICY IF NOT EXISTS "Users can delete files with property access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-media' AND
  auth.role() = 'authenticated'
);

-- Allow public read access to all files in the bucket
CREATE POLICY IF NOT EXISTS "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');
