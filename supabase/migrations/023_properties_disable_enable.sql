-- Properties disable/enable support: audit columns and indexes
alter table properties add column if not exists disabled_at timestamptz;
alter table properties add column if not exists disabled_by uuid references auth.users(id) on delete set null;
alter table properties add column if not exists disabled_reason text;

create index if not exists idx_properties_disabled_at on properties(disabled_at);

