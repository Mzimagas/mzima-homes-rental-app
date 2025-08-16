-- Guarded delete eligibility check for units
create or replace function can_delete_unit(_unit uuid)
returns boolean
language sql
stable
as $$
  select 
    not exists(select 1 from tenancy_agreements where unit_id = _unit)
    and not exists(select 1 from maintenance_tickets where unit_id = _unit)
    and not exists(select 1 from tenants where current_unit_id = _unit)
$$;

