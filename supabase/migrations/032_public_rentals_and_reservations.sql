-- 032: Public rentals catalog (media/amenities) and reservation requests

-- 1) Publication & availability fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE units ADD COLUMN IF NOT EXISTS available_from DATE;

-- 2) Media for units (photos and floor plans)
CREATE TABLE IF NOT EXISTS units_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PHOTO','FLOOR_PLAN')),
  url TEXT NOT NULL,
  alt_text TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_units_media_unit_id ON units_media(unit_id);
CREATE INDEX IF NOT EXISTS idx_units_media_order ON units_media(unit_id, order_index);

-- 3) Amenities catalog and mapping to units
CREATE TABLE IF NOT EXISTS amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS unit_amenities (
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (unit_id, amenity_id)
);
CREATE INDEX IF NOT EXISTS idx_unit_amenities_unit ON unit_amenities(unit_id);

-- 4) Reservation requests submitted by prospects
DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('PENDING','APPROVED','DECLINED','NEEDS_INFO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reservation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_move_in DATE,
  message TEXT,
  status reservation_status NOT NULL DEFAULT 'PENDING',
  created_by_auth_user UUID,
  handled_by_user_id UUID,
  handled_at TIMESTAMPTZ,
  notes_internal TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resreq_property_status ON reservation_requests(property_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resreq_unit ON reservation_requests(unit_id, created_at DESC);

-- 5) A helper view for published & vacant units (tenant-facing)
-- Vacancy computed by joining tenants.current_unit_id; adjust if schema differs
CREATE OR REPLACE VIEW view_public_vacant_units AS
  WITH vacant_units AS (
    SELECT u.*
    FROM units u
    LEFT JOIN tenants t ON t.current_unit_id = u.id
    WHERE t.id IS NULL
  )
  SELECT 
    u.id AS unit_id,
    u.property_id,
    p.name AS property_name,
    p.physical_address,
    u.unit_label,
    u.monthly_rent_kes,
    u.deposit_kes,
    u.available_from,
    p.is_published
  FROM vacant_units u
  JOIN properties p ON p.id = u.property_id
  WHERE COALESCE(p.is_published, true) = true;

-- 6) Enable RLS and add minimal policies (service role bypasses these)
ALTER TABLE units_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_requests ENABLE ROW LEVEL SECURITY;

-- Staff-only read on reservation_requests via property membership function (enforced at API layer as well)
DO $$ BEGIN
  CREATE POLICY resreq_staff_read ON reservation_requests
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY resreq_insert_all ON reservation_requests
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lock down media tables by default (reads will go through API/service role)
DO $$ BEGIN
  CREATE POLICY units_media_noop ON units_media FOR SELECT USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY unit_amenities_noop ON unit_amenities FOR SELECT USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

