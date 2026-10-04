-- RLS: cada usuário só enxerga/escreve dados da própria organização.

grant usage on schema nefro to authenticated, service_role;
grant all on all tables in schema nefro to authenticated, service_role;
grant execute on all functions in schema nefro to authenticated, service_role;
alter default privileges in schema nefro grant all on tables to authenticated, service_role;

-- ---------- organizations ----------
alter table nefro.organizations enable row level security;

create policy org_select on nefro.organizations for select to authenticated
  using (id = nefro.current_org());
create policy org_update on nefro.organizations for update to authenticated
  using (id = nefro.current_org() and nefro.current_role_name() = 'admin_clinica')
  with check (id = nefro.current_org());
-- criação só pela função de onboarding (abaixo)

-- ---------- profiles ----------
alter table nefro.profiles enable row level security;

create policy profiles_select on nefro.profiles for select to authenticated
  using (id = auth.uid() or organization_id = nefro.current_org());
create policy profiles_insert_self on nefro.profiles for insert to authenticated
  with check (id = auth.uid() and organization_id is null);
create policy profiles_update_self on nefro.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and organization_id is not distinct from nefro.current_org());
create policy profiles_update_admin on nefro.profiles for update to authenticated
  using (organization_id = nefro.current_org() and nefro.current_role_name() = 'admin_clinica')
  with check (organization_id = nefro.current_org());

-- Onboarding: cria a clínica e torna o usuário admin_clinica (atômico).
create or replace function nefro.create_organization(
  p_name text, p_cnpj text, p_address text, p_phone text, p_logo_url text default null
) returns uuid
language plpgsql security definer set search_path = nefro, public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if (select organization_id from nefro.profiles where id = auth.uid()) is not null then
    raise exception 'user already belongs to an organization';
  end if;
  insert into nefro.organizations (name, cnpj, address, phone, logo_url)
    values (p_name, p_cnpj, p_address, p_phone, p_logo_url) returning id into v_org;
  insert into nefro.profiles (id, organization_id, role)
    values (auth.uid(), v_org, 'admin_clinica')
    on conflict (id) do update set organization_id = excluded.organization_id, role = 'admin_clinica';
  return v_org;
end $$;
grant execute on function nefro.create_organization(text, text, text, text, text) to authenticated;

-- ---------- tabelas por organização ----------
do $$
declare t text;
begin
  foreach t in array array['patients','ktv_records','bcm_records','nursing_diagnoses','lab_results','pet_records',
    'cytology_records','infections','hospitalizations','catheter_movements','extension_changes','trainings',
    'visits','vaccinations','admission_processes','lookups','import_batches']
  loop
    execute format('alter table nefro.%I enable row level security', t);
    execute format('create policy %I on nefro.%I for select to authenticated using (organization_id = nefro.current_org())', t || '_sel', t);
    execute format($p$create policy %I on nefro.%I for insert to authenticated
      with check (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro','medico'))$p$, t || '_ins', t);
    execute format($p$create policy %I on nefro.%I for update to authenticated
      using (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro','medico'))
      with check (organization_id = nefro.current_org())$p$, t || '_upd', t);
    execute format($p$create policy %I on nefro.%I for delete to authenticated
      using (organization_id = nefro.current_org() and nefro.current_role_name() in ('admin_clinica','enfermeiro'))$p$, t || '_del', t);
  end loop;
end $$;

-- ---------- Storage: bucket de logos (pasta = id da organização) ----------
insert into storage.buckets (id, name, public) values ('logos', 'logos', true)
  on conflict (id) do nothing;

create policy logos_read on storage.objects for select using (bucket_id = 'logos');
create policy logos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = nefro.current_org()::text);
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = nefro.current_org()::text);
