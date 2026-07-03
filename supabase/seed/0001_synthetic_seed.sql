insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@example.test',
    crypt('synthetic-password-owner', gen_salt('bf')),
    '2026-07-03T09:00:00Z',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Olivia Owner"}'::jsonb,
    '2026-07-03T09:00:00Z',
    '2026-07-03T09:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'visitor@example.test',
    crypt('synthetic-password-visitor', gen_salt('bf')),
    '2026-07-03T09:00:00Z',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Victor Visitor"}'::jsonb,
    '2026-07-03T09:00:00Z',
    '2026-07-03T09:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer@example.test',
    crypt('synthetic-password-viewer', gen_salt('bf')),
    '2026-07-03T09:00:00Z',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Valerie Viewer"}'::jsonb,
    '2026-07-03T09:00:00Z',
    '2026-07-03T09:00:00Z'
  )
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name, created_at, updated_at) values
  (
    '10000000-0000-4000-8000-000000000001',
    'owner@example.test',
    'Olivia Owner',
    '2026-07-03T09:00:00Z',
    '2026-07-03T09:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'visitor@example.test',
    'Victor Visitor',
    '2026-07-03T09:00:00Z',
    '2026-07-03T09:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'viewer@example.test',
    'Valerie Viewer',
    '2026-07-03T09:00:00Z',
    '2026-07-03T09:00:00Z'
  )
on conflict (id) do nothing;

insert into public.projects (
  id,
  name,
  address_label,
  description,
  status,
  created_by,
  created_at,
  updated_at
) values (
  '20000000-0000-4000-8000-000000000001',
  'Demo apartment renovation',
  'Barcelona flat',
  'Synthetic renovation project used for local development only.',
  'active',
  '10000000-0000-4000-8000-000000000001',
  '2026-07-03T09:05:00Z',
  '2026-07-03T09:05:00Z'
) on conflict (id) do nothing;

insert into public.project_members (
  id,
  project_id,
  user_id,
  role,
  created_at,
  updated_at
) values
  (
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'owner',
    '2026-07-03T09:06:00Z',
    '2026-07-03T09:06:00Z'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'editor',
    '2026-07-03T09:06:00Z',
    '2026-07-03T09:06:00Z'
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'viewer',
    '2026-07-03T09:06:00Z',
    '2026-07-03T09:06:00Z'
  )
on conflict (id) do nothing;

insert into public.zones (id, project_id, name, description, sort_order, created_at, updated_at) values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Kitchen',
    'Synthetic kitchen zone.',
    10,
    '2026-07-03T09:10:00Z',
    '2026-07-03T09:10:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Main bathroom',
    'Synthetic bathroom zone.',
    20,
    '2026-07-03T09:10:00Z',
    '2026-07-03T09:10:00Z'
  )
on conflict (id) do nothing;

insert into public.trades (id, project_id, name, description, sort_order, created_at, updated_at) values
  (
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Electrical',
    'Synthetic electrical trade.',
    10,
    '2026-07-03T09:12:00Z',
    '2026-07-03T09:12:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Plumbing',
    'Synthetic plumbing trade.',
    20,
    '2026-07-03T09:12:00Z',
    '2026-07-03T09:12:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'Carpentry',
    'Synthetic carpentry trade.',
    30,
    '2026-07-03T09:12:00Z',
    '2026-07-03T09:12:00Z'
  )
on conflict (id) do nothing;

insert into public.documents (
  id,
  project_id,
  type,
  title,
  storage_path,
  original_filename,
  mime_type,
  size_bytes,
  notes,
  uploaded_by,
  created_at,
  updated_at
) values
  (
    '50000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'quote',
    'Synthetic renovation quote',
    'projects/demo-apartment/documents/synthetic-quote.pdf',
    'synthetic-quote.pdf',
    'application/pdf',
    2048,
    'Metadata only. No real file is bundled.',
    '10000000-0000-4000-8000-000000000002',
    '2026-07-03T09:15:00Z',
    '2026-07-03T09:15:00Z'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'plan',
    'Synthetic floor plan',
    'projects/demo-apartment/documents/synthetic-plan.pdf',
    'synthetic-plan.pdf',
    'application/pdf',
    4096,
    'Stored as a technical reference only. No AI document parsing in this phase.',
    '10000000-0000-4000-8000-000000000002',
    '2026-07-03T09:16:00Z',
    '2026-07-03T09:16:00Z'
  )
on conflict (id) do nothing;

insert into public.contract_items (
  id,
  project_id,
  source_document_id,
  code,
  title,
  description,
  trade_id,
  zone_id,
  quantity,
  unit,
  unit_price,
  total_amount,
  included_excluded,
  source_page,
  notes,
  status,
  created_at,
  updated_at
) values
  (
    '60000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'EL-001',
    'Kitchen lighting points',
    'Synthetic budget line for kitchen lighting.',
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    6,
    'unit',
    85.00,
    510.00,
    'included',
    '3',
    'Synthetic quote data only.',
    'not_started',
    '2026-07-03T09:20:00Z',
    '2026-07-03T09:20:00Z'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'PL-001',
    'Bathroom fixture connections',
    'Synthetic budget line for bathroom plumbing.',
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    1,
    'lot',
    750.00,
    750.00,
    'included',
    '4',
    'Synthetic quote data only.',
    'not_started',
    '2026-07-03T09:20:00Z',
    '2026-07-03T09:20:00Z'
  )
on conflict (id) do nothing;

insert into public.visits (
  id,
  project_id,
  title,
  visit_date,
  status,
  general_status,
  summary,
  human_notes,
  primary_zone_id,
  primary_trade_id,
  created_by,
  published_at,
  created_at,
  updated_at
) values (
  '70000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Synthetic initial site visit',
  '2026-07-03',
  'published',
  'Work appears active in kitchen and bathroom.',
  'Human-written synthetic summary for seed data.',
  'Visitor noted that kitchen lighting and bathroom plumbing need follow-up.',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '2026-07-03T10:00:00Z',
  '2026-07-03T09:30:00Z',
  '2026-07-03T10:00:00Z'
) on conflict (id) do nothing;

insert into public.evidence (
  id,
  project_id,
  visit_id,
  type,
  storage_path,
  original_filename,
  mime_type,
  size_bytes,
  zone_id,
  trade_id,
  manual_note,
  uploaded_by,
  created_at,
  updated_at
) values
  (
    '80000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'photo',
    'projects/demo-apartment/visits/2026-07-03/kitchen-lighting.jpg',
    'kitchen-lighting.jpg',
    'image/jpeg',
    8192,
    '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'Manual note: kitchen lighting positions marked by visitor.',
    '10000000-0000-4000-8000-000000000002',
    '2026-07-03T09:35:00Z',
    '2026-07-03T09:35:00Z'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    'audio',
    'projects/demo-apartment/visits/2026-07-03/site-note.m4a',
    'site-note.m4a',
    'audio/mp4',
    12288,
    '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'Manual note: short spoken update from visitor.',
    '10000000-0000-4000-8000-000000000002',
    '2026-07-03T09:36:00Z',
    '2026-07-03T09:36:00Z'
  )
on conflict (id) do nothing;

insert into public.agent_jobs (
  id,
  project_id,
  type,
  status,
  input,
  output,
  error_message,
  attempt_count,
  max_attempts,
  locked_at,
  locked_by,
  created_by,
  created_at,
  updated_at,
  completed_at
) values
  (
    '90000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'transcribe_audio',
    'completed',
    '{"evidence_id": "80000000-0000-4000-8000-000000000002"}'::jsonb,
    '{"transcription_id": "a0000000-0000-4000-8000-000000000001"}'::jsonb,
    null,
    1,
    3,
    null,
    null,
    '10000000-0000-4000-8000-000000000002',
    '2026-07-03T09:37:00Z',
    '2026-07-03T09:40:00Z',
    '2026-07-03T09:40:00Z'
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'generate_visit_summary',
    'pending',
    '{"visit_id": "70000000-0000-4000-8000-000000000001"}'::jsonb,
    null,
    null,
    0,
    3,
    null,
    null,
    '10000000-0000-4000-8000-000000000002',
    '2026-07-03T09:41:00Z',
    '2026-07-03T09:41:00Z',
    null
  )
on conflict (id) do nothing;

insert into public.audio_transcriptions (
  id,
  project_id,
  evidence_id,
  raw_transcript,
  edited_transcript,
  language,
  provider,
  model,
  created_by_job_id,
  created_at,
  updated_at
) values (
  'a0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000002',
  'Synthetic transcript: kitchen lighting locations should be confirmed before closing the ceiling.',
  'Synthetic transcript: kitchen lighting locations should be confirmed before closing the ceiling.',
  'en',
  'mock',
  'mock-transcriber',
  '90000000-0000-4000-8000-000000000001',
  '2026-07-03T09:40:00Z',
  '2026-07-03T09:40:00Z'
) on conflict (id) do nothing;

insert into public.issues (
  id,
  project_id,
  visit_id,
  title,
  description,
  zone_id,
  trade_id,
  priority,
  status,
  review_state,
  source,
  contract_item_id,
  cost_risk,
  schedule_risk,
  created_by,
  created_by_job_id,
  created_at,
  updated_at
) values (
  'b0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'Confirm kitchen lighting positions',
  'Synthetic issue created to demonstrate reviewable tracking.',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'medium',
  'open',
  'human_created',
  'human',
  '60000000-0000-4000-8000-000000000001',
  null,
  'Potential delay if ceiling work starts before confirmation.',
  '10000000-0000-4000-8000-000000000002',
  null,
  '2026-07-03T09:45:00Z',
  '2026-07-03T09:45:00Z'
) on conflict (id) do nothing;

insert into public.decisions (
  id,
  project_id,
  visit_id,
  title,
  description,
  options,
  recommendation,
  zone_id,
  trade_id,
  priority,
  status,
  review_state,
  source,
  deadline,
  cost_impact,
  schedule_impact,
  created_by,
  created_by_job_id,
  created_at,
  updated_at
) values (
  'c0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'Choose kitchen lighting layout',
  'Synthetic pending owner decision.',
  '{"options": ["Keep current layout", "Move two ceiling points"]}'::jsonb,
  'Review the marked positions before electrical rough-in is closed.',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'high',
  'pending',
  'human_created',
  'human',
  '2026-07-10',
  'No confirmed cost impact in synthetic data.',
  'Decision needed before ceiling closure.',
  '10000000-0000-4000-8000-000000000002',
  null,
  '2026-07-03T09:50:00Z',
  '2026-07-03T09:50:00Z'
) on conflict (id) do nothing;

insert into public.audit_log (
  id,
  project_id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at
) values (
  'd0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'seed.synthetic_project_created',
  'project',
  '20000000-0000-4000-8000-000000000001',
  '{"seed": true, "phase": 1}'::jsonb,
  '2026-07-03T09:55:00Z'
) on conflict (id) do nothing;
