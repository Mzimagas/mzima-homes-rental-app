-- Property Documents System v2 - Database Schema
-- This creates the new schema for the redesigned Direct Addition document system

-- Create property_documents table for individual file records
create table if not exists property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  pipeline text not null check (pipeline in ('direct_addition','purchase_pipeline','subdivision','handover')),
  doc_type text not null,
  file_path text not null, -- storage path: property_id/doc_type/filename
  file_name text not null, -- original filename
  file_ext text,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now(),
  meta jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create property_document_status table for document type status tracking
create table if not exists property_document_status (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  pipeline text not null check (pipeline = 'direct_addition'),
  doc_type text not null,
  status text not null check (status in ('missing','partial','complete')) default 'missing',
  is_na boolean not null default false,
  note text,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(property_id, pipeline, doc_type)
);

-- Create indexes for performance
create index if not exists idx_property_documents_property_pipeline on property_documents(property_id, pipeline);
create index if not exists idx_property_documents_doc_type on property_documents(doc_type);
create index if not exists idx_property_documents_uploaded_at on property_documents(uploaded_at);
create index if not exists idx_property_document_status_property_pipeline on property_document_status(property_id, pipeline);
create index if not exists idx_property_document_status_doc_type on property_document_status(doc_type);

-- Create helper view for document counts
create or replace view v_property_doc_counts as
select
  pd.property_id,
  pd.pipeline,
  pd.doc_type,
  count(*) as files_count,
  max(pd.uploaded_at) as last_uploaded_at
from property_documents pd
group by pd.property_id, pd.pipeline, pd.doc_type;

-- Enable Row-Level Security
alter table property_documents enable row level security;
alter table property_document_status enable row level security;

-- RLS Policies for property_documents
create policy "team can read property docs"
on property_documents
for select using (
  exists (
    select 1 from properties p
    where p.id = property_documents.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

create policy "team can insert property docs"
on property_documents
for insert with check (
  exists (
    select 1 from properties p
    where p.id = property_documents.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

create policy "team can update property docs"
on property_documents
for update using (
  exists (
    select 1 from properties p
    where p.id = property_documents.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

create policy "team can delete property docs"
on property_documents
for delete using (
  exists (
    select 1 from properties p
    where p.id = property_documents.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

-- RLS Policies for property_document_status
create policy "team can read doc status"
on property_document_status
for select using (
  exists (
    select 1 from properties p
    where p.id = property_document_status.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

create policy "team can insert doc status"
on property_document_status
for insert with check (
  exists (
    select 1 from properties p
    where p.id = property_document_status.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

create policy "team can update doc status"
on property_document_status
for update using (
  exists (
    select 1 from properties p
    where p.id = property_document_status.property_id
      and (p.owner_id = auth.uid() or auth.uid() = any(p.team_member_ids))
  )
);

-- Create function to auto-update status based on file counts
create or replace function update_document_status()
returns trigger as $$
begin
  -- Update status based on file count for the affected document type
  insert into property_document_status (property_id, pipeline, doc_type, status)
  select 
    coalesce(NEW.property_id, OLD.property_id),
    coalesce(NEW.pipeline, OLD.pipeline),
    coalesce(NEW.doc_type, OLD.doc_type),
    case 
      when count(*) = 0 then 'missing'
      when count(*) >= 1 then 'complete'
      else 'partial'
    end
  from property_documents pd
  where pd.property_id = coalesce(NEW.property_id, OLD.property_id)
    and pd.pipeline = coalesce(NEW.pipeline, OLD.pipeline)
    and pd.doc_type = coalesce(NEW.doc_type, OLD.doc_type)
  group by pd.property_id, pd.pipeline, pd.doc_type
  on conflict (property_id, pipeline, doc_type)
  do update set 
    status = excluded.status,
    updated_at = now()
  where property_document_status.is_na = false; -- Don't override N/A status
  
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

-- Create triggers to auto-update status
create trigger trigger_update_document_status_insert
  after insert on property_documents
  for each row execute function update_document_status();

create trigger trigger_update_document_status_delete
  after delete on property_documents
  for each row execute function update_document_status();

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on property_documents to anon, authenticated;
grant all on property_document_status to anon, authenticated;
grant select on v_property_doc_counts to anon, authenticated;
