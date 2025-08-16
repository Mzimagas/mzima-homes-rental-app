-- Guarded delete eligibility for properties
-- Note: payments table does not have property_id; use payment_allocations -> rent_invoices -> units linkage
create or replace function can_delete_property(_property uuid)
returns boolean
language sql
stable
as $$
  select
    not exists(select 1 from units where property_id = _property)
    and not exists(select 1 from tenancy_agreements ta join units u on ta.unit_id = u.id where u.property_id = _property)
    and not exists(select 1 from maintenance_tickets mt join units u on mt.unit_id = u.id where u.property_id = _property)
    and not exists(select 1 from rent_invoices ri join units u on ri.unit_id = u.id where u.property_id = _property)
    and not exists(
      select 1
      from payment_allocations pa
      join rent_invoices ri on pa.invoice_id = ri.id
      join units u on ri.unit_id = u.id
      where u.property_id = _property
    )
$$;

