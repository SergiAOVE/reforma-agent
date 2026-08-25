-- Synthetic seed for LOCAL DEVELOPMENT ONLY.
-- Applied by `supabase db reset` (see [db.seed] in supabase/config.toml).
-- All people, projects and figures are fictional. Never load real data here.
--
-- Test users (password for both: "password123"):
--   ana@example.com   -> project owner
--   luis@example.com  -> project editor (visits the site)

-- ---------------------------------------------------------------------------
-- Auth users. Inserting into auth.users directly is acceptable in the local
-- stack only; in hosted Supabase users are created through Auth APIs.
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  (
    '00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'ana@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Example"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'luis@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Luis Example"}',
    now(), now(), '', '', '', ''
  );

-- Email identities so the seeded users can actually log in (Phase 2+).
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(), '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001', 'email',
    '{"sub":"00000000-0000-4000-8000-000000000001","email":"ana@example.com","email_verified":true}',
    now(), now(), now()
  ),
  (
    gen_random_uuid(), '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002', 'email',
    '{"sub":"00000000-0000-4000-8000-000000000002","email":"luis@example.com","email_verified":true}',
    now(), now(), now()
  );

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name)
values
  ('00000000-0000-4000-8000-000000000001', 'ana@example.com', 'Ana Example'),
  ('00000000-0000-4000-8000-000000000002', 'luis@example.com', 'Luis Example');

-- ---------------------------------------------------------------------------
-- Project and memberships
-- ---------------------------------------------------------------------------
insert into public.projects
  (id, name, address_label, description, status, start_date, deadline_date, created_by)
values (
  '11111111-1111-4111-8111-111111111111',
  'Demo renovation',
  'Demo flat',
  'Synthetic project used for local development and manual testing.',
  'active',
  '2026-06-01',
  '2026-09-30',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.project_members (project_id, user_id, role, stakeholder_type)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000001',
    'owner',
    'customer'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-4000-8000-000000000002',
    'editor',
    'site_manager'
  );

-- ---------------------------------------------------------------------------
-- Zones and trades
-- ---------------------------------------------------------------------------
insert into public.zones (id, project_id, name, sort_order)
values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 'Kitchen', 1),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 'Main bathroom', 2),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 'Living room', 3);

insert into public.trades (id, project_id, name, sort_order)
values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111111', 'Electrical', 1),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111111', 'Plumbing', 2),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111111', 'Painting', 3);

-- ---------------------------------------------------------------------------
-- Budget line items
-- ---------------------------------------------------------------------------
insert into public.contract_items
  (project_id, code, title, trade_id, zone_id, quantity, unit, unit_price, total_amount)
values
  (
    '11111111-1111-4111-8111-111111111111', 'E-01', 'Replace electrical panel',
    '33333333-3333-4333-8333-333333333301', null, 1, 'unit', 950, 950
  ),
  (
    '11111111-1111-4111-8111-111111111111', 'P-01', 'Kitchen plumbing rough-in',
    '33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201',
    1, 'unit', 1400, 1400
  );

-- ---------------------------------------------------------------------------
-- A published visit with an issue and a pending decision
-- ---------------------------------------------------------------------------
insert into public.visits
  (id, project_id, title, visit_date, status, human_notes, primary_zone_id, primary_trade_id,
   created_by, published_at)
values (
  '44444444-4444-4444-8444-444444444401',
  '11111111-1111-4111-8111-111111111111',
  'Week 1 check',
  '2026-06-29',
  'published',
  'Demolition finished in the kitchen. Plumber starts on Monday.',
  '22222222-2222-4222-8222-222222222201',
  '33333333-3333-4333-8333-333333333302',
  '00000000-0000-4000-8000-000000000002',
  now()
);

insert into public.issues
  (
    project_id, visit_id, title, description, zone_id, trade_id, priority, status,
    responsible_user_id, approver_user_id, created_by
  )
values (
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444401',
  'Damp spot behind kitchen wall',
  'Small damp patch found after demolition; plumber should inspect before closing the wall.',
  '22222222-2222-4222-8222-222222222201',
  '33333333-3333-4333-8333-333333333302',
  'high',
  'open',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
);

insert into public.decisions
  (
    project_id, visit_id, title, description, options, priority, status, deadline,
    responsible_user_id, approver_user_id, created_by
  )
values (
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444401',
  'Choose kitchen countertop material',
  'Builder needs the countertop decision before ordering cabinets.',
  '[{"label":"Quartz","note":"mid price"},{"label":"Laminate","note":"cheapest"}]',
  'medium',
  'pending',
  '2026-07-15',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

-- ---------------------------------------------------------------------------
-- Audit log sample entry
-- ---------------------------------------------------------------------------
insert into public.audit_log (project_id, actor_user_id, action, entity_type, entity_id)
values (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-4000-8000-000000000002',
  'visit.published',
  'visit',
  '44444444-4444-4444-8444-444444444401'
);
