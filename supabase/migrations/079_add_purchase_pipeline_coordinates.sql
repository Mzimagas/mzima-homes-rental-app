-- 079: Add coordinate fields to purchase_pipeline table
-- This allows purchase pipeline items to have their own coordinates before becoming properties

-- Add coordinate fields to purchase_pipeline table
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Add constraints for valid coordinate ranges
ALTER TABLE purchase_pipeline 
ADD CONSTRAINT chk_purchase_pipeline_lat_range 
CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90));

ALTER TABLE purchase_pipeline 
ADD CONSTRAINT chk_purchase_pipeline_lng_range 
CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180));

-- Add index for spatial queries (if needed in the future)
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_coordinates 
ON purchase_pipeline(lat, lng) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN purchase_pipeline.lat IS 'Latitude coordinate of the property location';
COMMENT ON COLUMN purchase_pipeline.lng IS 'Longitude coordinate of the property location';

-- Update the purchase pipeline service to use these coordinates
-- Note: This will be handled in the application code
