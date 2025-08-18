-- 061: Drop Property Finances and Handover Schema
-- This migration removes all DB objects introduced by 060_property_finances_handover.sql

-- Safety: wrap in DO block to ignore if objects are already absent
DO $$
BEGIN
  -- Drop view first (depends on tables)
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'property_sale_summary'
  ) THEN
    EXECUTE 'DROP VIEW IF EXISTS property_sale_summary CASCADE';
  END IF;

  -- Drop triggers
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_sale_info_updated_at'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_property_sale_info_updated_at ON public.property_sale_info';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'track_property_sale_status_changes'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS track_property_sale_status_changes ON public.property_sale_info';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_property_sale_total_paid'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_property_sale_total_paid ON public.property_payment_records';
  END IF;

  -- Drop trigger functions
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_property_sale_updated_at'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS update_property_sale_updated_at()';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'track_sale_status_changes'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS track_sale_status_changes()';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_total_paid'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS update_total_paid()';
  END IF;

  -- Drop tables (status history depends on sale_info, payment_records depends on sale_info)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'property_payment_records'
  ) THEN
    EXECUTE 'DROP TABLE IF EXISTS public.property_payment_records CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'property_sale_status_history'
  ) THEN
    EXECUTE 'DROP TABLE IF EXISTS public.property_sale_status_history CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'property_sale_info'
  ) THEN
    EXECUTE 'DROP TABLE IF EXISTS public.property_sale_info CASCADE';
  END IF;

  -- Drop enums last
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'handover_status') THEN
    EXECUTE 'DROP TYPE IF EXISTS handover_status';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    EXECUTE 'DROP TYPE IF EXISTS payment_status';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_sale_status') THEN
    EXECUTE 'DROP TYPE IF EXISTS property_sale_status';
  END IF;
END $$;

