-- Processo de Enfermagem (COFEN 736/2024): avaliação estruturada + diagnóstico no formato PES.

-- ---------- avaliação de enfermagem ----------
create table nefro.nursing_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null default current_date,
  edema text check (edema in ('Ausente', '+', '++', '+++')),
  dyspnea boolean,
  pain_score smallint check (pain_score between 0 and 10),
  access_site text check (access_site in ('Sem alterações', 'Hiperemia', 'Secreção', 'Dor local')),
  skin text check (skin in ('Íntegra', 'Ressecada', 'Prurido', 'Lesão')),
  appetite text check (appetite in ('Preservado', 'Diminuído')),
  anxiety boolean,
  adherence_fluid text check (adherence_fluid in ('Boa', 'Parcial', 'Baixa')),
  adherence_diet text check (adherence_diet in ('Boa', 'Parcial', 'Baixa')),
  adherence_meds text check (adherence_meds in ('Boa', 'Parcial', 'Baixa')),
  knowledge_deficit boolean,
  mobility text check (mobility in ('Independente', 'Com auxílio', 'Restrito ao leito')),
  notes text,
  nurse_id uuid references nefro.profiles (id),
  created_at timestamptz not null default now()
);
create index on nefro.nursing_assessments (organization_id, patient_id, date desc);

-- ---------- diagnóstico: PES, plano e acompanhamento ----------
alter table nefro.nursing_diagnoses
  add column catalog_id text,
  add column nanda_code text,
  add column etiology text,
  add column evidence text[] not null default '{}',
  add column expected_outcome text,
  add column interventions text[] not null default '{}',
  add column status text not null default 'ativo' check (status in ('ativo', 'resolvido')),
  add column resolved_date date,
  add column source text not null default 'manual' check (source in ('sugestao', 'manual')),
  add column assessment_id uuid references nefro.nursing_assessments (id) on delete set null;
create index on nefro.nursing_diagnoses (organization_id, patient_id, status);

-- ---------- RLS (mesmo padrão da 0002) ----------
alter table nefro.nursing_assessments enable row level security;
create policy nursing_assessments_sel on nefro.nursing_assessments for select to authenticated
  using (organization_id = nefro.current_org());
create policy nursing_assessments_ins on nefro.nursing_assessments for insert to authenticated
  with check (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro','medico'));
create policy nursing_assessments_upd on nefro.nursing_assessments for update to authenticated
  using (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro','medico'))
  with check (organization_id = nefro.current_org());
create policy nursing_assessments_del on nefro.nursing_assessments for delete to authenticated
  using (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro'));
