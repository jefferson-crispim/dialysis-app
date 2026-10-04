-- Avaliação guiada (roteiro SAE): sinais vitais em colunas, demais respostas em JSON, rastreamento do pé diabético.

alter table nefro.nursing_assessments
  add column bp_sys smallint check (bp_sys between 40 and 300),
  add column bp_dia smallint check (bp_dia between 20 and 200),
  add column hr smallint check (hr between 20 and 250),
  add column rr smallint check (rr between 5 and 80),
  add column weight_kg numeric(5, 1) check (weight_kg between 20 and 400),
  add column height_cm numeric(4, 1) check (height_cm between 80 and 250),
  add column waist_cm numeric(4, 1) check (waist_cm between 30 and 250),
  add column glucose numeric(5, 1) check (glucose between 10 and 1000),
  add column glucose_context text check (glucose_context in ('Jejum', 'Pós-prandial')),
  add column answers jsonb not null default '{}'::jsonb,
  add column completed_steps text[] not null default '{}';

-- ---------- rastreamento do pé diabético (Anexo 2 do roteiro) ----------
create table nefro.diabetic_foot_screenings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null default current_date,
  history text[] not null default '{}',
  skin text[] not null default '{}',
  psp text check (psp in ('Sensível em todas as áreas', 'Uma ou mais áreas insensíveis')),
  deformities text[] not null default '{}',
  pulse_r_pedioso text check (pulse_r_pedioso in ('Palpável', 'Não palpável')),
  pulse_r_tibial text check (pulse_r_tibial in ('Palpável', 'Não palpável')),
  pulse_l_pedioso text check (pulse_l_pedioso in ('Palpável', 'Não palpável')),
  pulse_l_tibial text check (pulse_l_tibial in ('Palpável', 'Não palpável')),
  risk_category smallint not null check (risk_category between 0 and 3),
  nurse_id uuid references nefro.profiles (id),
  created_at timestamptz not null default now()
);
create index on nefro.diabetic_foot_screenings (organization_id, patient_id, date desc);

alter table nefro.diabetic_foot_screenings enable row level security;
create policy diabetic_foot_screenings_sel on nefro.diabetic_foot_screenings for select to authenticated
  using (organization_id = nefro.current_org());
create policy diabetic_foot_screenings_ins on nefro.diabetic_foot_screenings for insert to authenticated
  with check (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro','medico'));
create policy diabetic_foot_screenings_upd on nefro.diabetic_foot_screenings for update to authenticated
  using (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro','medico'))
  with check (organization_id = nefro.current_org());
create policy diabetic_foot_screenings_del on nefro.diabetic_foot_screenings for delete to authenticated
  using (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro'));
