-- Units disable/enable support: audit columns and indexes
alter table units add column if not exists disabled_at timestamptz;
alter table units add column if not exists disabled_by uuid references auth.users(id) on delete set null;
alter table units add column if not exists disabled_reason text;

-- Note: units table does not have landlord_id; it has property_id. Most queries filter by property_id and is_active.
create index if not exists idx_units_property_active on units(property_id, is_active);
create index if not exists idx_units_disabled_at on units(disabled_at);

