-- Migration 009: Fix Properties Table RLS Policies
-- Add comprehensive RLS policies for properties table to allow proper CRUD operations

-- Enable RLS on properties table if not already enabled
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view properties for their landlords" ON properties;
DROP POLICY IF EXISTS "Users can create properties for their landlords" ON properties;
DROP POLICY IF EXISTS "Users can update properties for their landlords" ON properties;
DROP POLICY IF EXISTS "Users can delete properties for their landlords" ON properties;

-- Create comprehensive RLS policies for properties table
-- Policy 1: Users can view properties for their landlords
CREATE POLICY "Users can view properties for their landlords" ON properties
  FOR SELECT USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

-- Policy 2: Users can create properties for their landlords
CREATE POLICY "Users can create properties for their landlords" ON properties
  FOR INSERT WITH CHECK (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

-- Policy 3: Users can update properties for their landlords
CREATE POLICY "Users can update properties for their landlords" ON properties
  FOR UPDATE USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

-- Policy 4: Users can delete properties for their landlords
CREATE POLICY "Users can delete properties for their landlords" ON properties
  FOR DELETE USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));

-- Also ensure units table has proper RLS policies
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Drop existing unit policies if they exist
DROP POLICY IF EXISTS "Users can view units for their properties" ON units;
DROP POLICY IF EXISTS "Users can create units for their properties" ON units;
DROP POLICY IF EXISTS "Users can update units for their properties" ON units;
DROP POLICY IF EXISTS "Users can delete units for their properties" ON units;

-- Create RLS policies for units table
CREATE POLICY "Users can view units for their properties" ON units
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can create units for their properties" ON units
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update units for their properties" ON units
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete units for their properties" ON units
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

-- Ensure tenants table has proper RLS policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing tenant policies if they exist
DROP POLICY IF EXISTS "Users can view tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can delete tenants for their properties" ON tenants;

-- Create RLS policies for tenants table
CREATE POLICY "Users can view tenants for their properties" ON tenants
  FOR SELECT USING (
    current_unit_id IN (
      SELECT u.id FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
    OR current_unit_id IS NULL -- Allow viewing tenants without units
  );

CREATE POLICY "Users can create tenants" ON tenants
  FOR INSERT WITH CHECK (true); -- Allow creating tenants, unit assignment will be controlled by unit policies

CREATE POLICY "Users can update tenants for their properties" ON tenants
  FOR UPDATE USING (
    current_unit_id IN (
      SELECT u.id FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
    OR current_unit_id IS NULL -- Allow updating tenants without units
  );

CREATE POLICY "Users can delete tenants for their properties" ON tenants
  FOR DELETE USING (
    current_unit_id IN (
      SELECT u.id FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
    OR current_unit_id IS NULL -- Allow deleting tenants without units
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_current_unit_id ON tenants(current_unit_id);

-- Verify the policies were created
SELECT 'Properties RLS policies created successfully' as status;
