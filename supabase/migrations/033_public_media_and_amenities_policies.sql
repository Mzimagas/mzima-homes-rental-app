-- 033: Public read policies for media and amenities of published & vacant units

-- Allow SELECT on units_media for units that are both published (property) and vacant
DO $$ BEGIN
  CREATE POLICY units_media_public_view ON units_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM units u
      JOIN properties p ON p.id = u.property_id
      LEFT JOIN tenants t ON t.current_unit_id = u.id
      WHERE u.id = unit_id
        AND COALESCE(p.is_published, true) = true
        AND t.id IS NULL
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow SELECT on unit_amenities for units that are both published (property) and vacant
DO $$ BEGIN
  CREATE POLICY unit_amenities_public_view ON unit_amenities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM units u
      JOIN properties p ON p.id = u.property_id
      LEFT JOIN tenants t ON t.current_unit_id = u.id
      WHERE u.id = unit_id
        AND COALESCE(p.is_published, true) = true
        AND t.id IS NULL
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

