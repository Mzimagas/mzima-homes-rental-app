-- 041: Add size_acres column to properties table for land property size tracking

-- Add size_acres column to properties table
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS size_acres DECIMAL(10,4);

-- Add comment for the column
COMMENT ON COLUMN properties.size_acres IS 'Property size in acres, converted from hectare specifications in property names';

-- Create index for efficient size-based queries
CREATE INDEX IF NOT EXISTS idx_properties_size_acres ON properties(size_acres) WHERE size_acres IS NOT NULL;

-- Add constraint to ensure positive values
ALTER TABLE properties 
  ADD CONSTRAINT chk_size_acres_positive 
  CHECK (size_acres IS NULL OR size_acres > 0);
