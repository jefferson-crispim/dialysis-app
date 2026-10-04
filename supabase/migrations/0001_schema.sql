-- Nefro: schema dedicado para não colidir com o website pessoal (schema public).
-- Depois de rodar: Supabase > Settings > API > Exposed schemas > adicionar "nefro".

create schema if not exists nefro;
create extension if not exists unaccent with schema extensions;

-- ---------- tipos ----------
create type nefro.user_role as enum ('admin_clinica', 'enfermeiro', 'medico', 'viewer');
create type nefro.modality as enum ('APD', 'CAPD', 'HD');
create type nefro.access_type as enum ('FAV', 'CATETER_CURTA', 'CATETER_LONGA', 'CATETER_PERITONEAL');
create type nefro.patient_status as enum ('ATIVO', 'ENCERRADO');

-- ---------- organizações e perfis ----------
create table nefro.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  address text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table nefro.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references nefro.organizations (id) on delete set null,
  full_name text,
  role nefro.user_role not null default 'enfermeiro',
  coren_number text,
  created_at timestamptz not null default now()
);
create index on nefro.profiles (organization_id);

-- organização do usuário logado (usada por todas as policies)
create or replace function nefro.current_org() returns uuid
language sql stable security definer set search_path = nefro, public as $$
  select organization_id from nefro.profiles where id = auth.uid()
$$;

create or replace function nefro.current_role_name() returns nefro.user_role
language sql stable security definer set search_path = nefro, public as $$
  select role from nefro.profiles where id = auth.uid()
$$;

-- nome sem acento/caixa, usado para casar pacientes na importação
create or replace function nefro.normalize_name(t text) returns text
language sql immutable as $$
  select regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '\s+', ' ', 'g')
$$;

-- ---------- pacientes ----------
create table nefro.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  name text not null,
  name_normalized text generated always as (nefro.normalize_name(name)) stored,
  cpf text,
  gender text check (gender in ('M', 'F')),
  birth_date date,
  admission_date date,
  exit_date date,
  exit_reason text,
  modality nefro.modality,
  primary_disease text,
  diabetic boolean,
  insurance text,
  company text,
  origin text,
  caregiver text,
  nurse_name text,
  doctor_name text,
  dry_weight numeric(5, 1),
  access_type nefro.access_type,
  status nefro.patient_status not null default 'ATIVO',
  created_at timestamptz not null default now(),
  unique (organization_id, name_normalized, birth_date)
);
create index on nefro.patients (organization_id, status);

-- ---------- registros longitudinais ----------
create table nefro.ktv_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  modality nefro.modality,
  pre_urea numeric(6, 1),
  post_urea numeric(6, 1),
  session_time_min integer,
  uf_volume numeric(4, 2),
  post_weight numeric(5, 1),
  calculated_ktv numeric(5, 2),   -- Daugirdas II (HD)
  imported_ktv numeric(5, 2),     -- valor vindo de planilha (DP: semanal)
  created_at timestamptz not null default now()
);
create index on nefro.ktv_records (organization_id, patient_id, date desc);

create table nefro.bcm_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  overhydration numeric(4, 1),    -- OH, litros
  tbw numeric(5, 1),
  ecw numeric(5, 1),
  icw numeric(5, 1),
  lti numeric(4, 1),
  fti numeric(4, 1),
  post_weight numeric(5, 1),
  dry_weight_suggested numeric(5, 1),
  uf_target numeric(4, 2),
  created_at timestamptz not null default now()
);
create index on nefro.bcm_records (organization_id, patient_id, date desc);

create table nefro.nursing_diagnoses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null default current_date,
  diagnosis_code text not null,
  intervention text,
  evaluation text,
  nurse_id uuid references nefro.profiles (id),
  created_at timestamptz not null default now()
);
create index on nefro.nursing_diagnoses (organization_id, patient_id, date desc);

create table nefro.lab_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  analyte text not null check (analyte in ('K', 'P', 'Ca', 'PTH', 'Hb', 'Ferritina', 'Ureia', 'Creatinina', 'Albumina', 'IST')),
  value numeric(10, 2) not null,
  created_at timestamptz not null default now()
);
create index on nefro.lab_results (organization_id, patient_id, analyte, date desc);

create table nefro.pet_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  fluid_transport text,
  solute_transport text,
  created_at timestamptz not null default now()
);
create index on nefro.pet_records (organization_id, patient_id, date desc);

create table nefro.cytology_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  cell_count integer,
  notes text,
  created_at timestamptz not null default now()
);
create index on nefro.cytology_records (organization_id, patient_id, date desc);

create table nefro.infections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  end_date date,
  occurrence text,
  infected_area text,
  symptoms text,
  medications text[],
  infection_type text,
  microorganism text,
  treatment text,
  outcome text,
  created_at timestamptz not null default now()
);
create index on nefro.infections (organization_id, patient_id, date desc);

create table nefro.hospitalizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  end_date date,
  cause text,
  reason text,
  location text,
  outcome text,
  created_at timestamptz not null default now()
);
create index on nefro.hospitalizations (organization_id, patient_id, date desc);

create table nefro.catheter_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  movement text,
  reason text,
  notes text,
  created_at timestamptz not null default now()
);
create index on nefro.catheter_movements (organization_id, patient_id, date desc);

create table nefro.extension_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  responsible text,
  reason text,
  next_change_date date,
  created_at timestamptz not null default now()
);
create index on nefro.extension_changes (organization_id, patient_id, date desc);

create table nefro.trainings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,              -- início
  end_date date,
  process text,
  trainee text,
  nurse_name text,
  fit boolean,
  status text,
  notes text,
  created_at timestamptz not null default now()
);
create index on nefro.trainings (organization_id, patient_id, date desc);

create table nefro.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,
  visit_type text,
  nurse_name text,
  notes text,
  created_at timestamptz not null default now()
);
create index on nefro.visits (organization_id, patient_id, date desc);

create table nefro.vaccinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_id uuid not null references nefro.patients (id) on delete cascade,
  date date not null,              -- data do 1º anti-HBs
  anti_hbs_value numeric(10, 2),
  primary_status text,
  definitive_status text,
  doses jsonb,
  created_at timestamptz not null default now()
);
create index on nefro.vaccinations (organization_id, patient_id, date desc);

create table nefro.admission_processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  patient_name text not null,
  nurse_name text,
  interview_date date,
  insurance text,
  eligible boolean,
  outcome text,
  outcome_date date,
  notes text,
  phone text,
  admission_date date,
  created_at timestamptz not null default now()
);
create index on nefro.admission_processes (organization_id, interview_date desc);

create table nefro.lookups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  kind text not null,
  value text not null,
  meta jsonb not null default '{}',
  unique (organization_id, kind, value)
);

create table nefro.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nefro.organizations (id) on delete cascade,
  created_by uuid references auth.users (id),
  file_name text,
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- registros importados ficam ligados ao lote para poderem ser revertidos
do $$
declare t text;
begin
  foreach t in array array['ktv_records','bcm_records','lab_results','pet_records','cytology_records','infections',
    'hospitalizations','catheter_movements','extension_changes','trainings','visits','vaccinations','admission_processes','patients']
  loop
    execute format('alter table nefro.%I add column import_batch_id uuid references nefro.import_batches (id) on delete set null', t);
  end loop;
end $$;
