-- Migration: group project documents by upload batch
--
-- A bulk document upload can contain several Storage objects that belong to
-- one user-facing topic. The files remain separate rows so Storage metadata,
-- document intelligence and future per-file operations stay precise, while
-- the UI can render one card per upload batch.

alter table public.documents
  add column upload_batch_id uuid,
  add column upload_batch_title text;

-- Existing rows become one-file groups. New rows default to their own batch
-- unless an upload flow explicitly supplies the same id for several files.
update public.documents
set
  upload_batch_id = id,
  upload_batch_title = title
where upload_batch_id is null;

alter table public.documents
  alter column upload_batch_id set default gen_random_uuid(),
  alter column upload_batch_id set not null,
  alter column upload_batch_title set not null,
  add constraint documents_upload_batch_title_check check (
    char_length(btrim(upload_batch_title)) between 1 and 180
  );

comment on column public.documents.upload_batch_id is
  'Shared id for documents uploaded together as one user-facing topic.';
comment on column public.documents.upload_batch_title is
  'User-facing title for the upload batch shown as one document library card.';

create index documents_project_upload_batch_idx
  on public.documents (project_id, upload_batch_id, created_at desc);
