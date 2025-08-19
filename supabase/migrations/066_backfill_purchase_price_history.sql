-- Migration 066: Backfill initial purchase price history for existing properties
-- This backfill inserts one "Initial purchase price entry" history row for any property
-- that has a purchase_price_agreement_kes set but no corresponding history rows yet.

BEGIN;

-- Safety: ensure the history table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'property_purchase_price_history'
  ) THEN
    RAISE NOTICE 'Table property_purchase_price_history does not exist; skipping backfill.';
    RETURN;
  END IF;
END $$;

-- Insert initial history entries where missing
WITH props AS (
  SELECT p.id AS property_id,
         p.purchase_price_agreement_kes AS price,
         COALESCE(p.purchase_price_last_updated_by, p.owner_id, p.landlord_id) AS user_id
  FROM properties p
  WHERE p.purchase_price_agreement_kes IS NOT NULL
),
props_missing AS (
  SELECT pr.*
  FROM props pr
  LEFT JOIN property_purchase_price_history h
    ON h.property_id = pr.property_id
  WHERE h.id IS NULL
)
INSERT INTO property_purchase_price_history (
  property_id,
  previous_price_kes,
  new_price_kes,
  change_reason,
  changed_by,
  changed_at
)
SELECT
  property_id,
  NULL::DECIMAL(15,2) AS previous_price_kes,
  price::DECIMAL(15,2) AS new_price_kes,
  'Initial purchase price entry' AS change_reason,
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) AS changed_by,
  COALESCE(now(), now()) AS changed_at
FROM props_missing;

COMMIT;
