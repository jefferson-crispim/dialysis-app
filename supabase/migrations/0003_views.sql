-- Views dos painéis. security_invoker => RLS das tabelas base continua valendo.

-- último Kt/V válido (> 0) por paciente ativo
create or replace view nefro.v_ktv_latest with (security_invoker = true) as
select distinct on (k.patient_id)
  k.organization_id, k.patient_id, p.name, p.modality, k.date,
  coalesce(k.calculated_ktv, k.imported_ktv) as ktv
from nefro.ktv_records k
join nefro.patients p on p.id = k.patient_id and p.status = 'ATIVO'
where coalesce(k.calculated_ktv, k.imported_ktv) > 0
order by k.patient_id, k.date desc;

-- distribuição de acesso/modalidade entre ativos
create or replace view nefro.v_access_distribution with (security_invoker = true) as
select organization_id, coalesce(access_type::text, 'NAO_INFORMADO') as access_type,
       modality, count(*)::int as total
from nefro.patients where status = 'ATIVO'
group by organization_id, access_type, modality;

-- último BCM por paciente ativo
create or replace view nefro.v_bcm_latest with (security_invoker = true) as
select distinct on (b.patient_id)
  b.organization_id, b.patient_id, p.name, p.modality, p.dry_weight, b.date,
  b.overhydration, b.ecw, b.post_weight, b.dry_weight_suggested,
  case when b.ecw > 0 then round(b.overhydration / b.ecw * 100, 1) end as oh_pct_ecw
from nefro.bcm_records b
join nefro.patients p on p.id = b.patient_id and p.status = 'ATIVO'
order by b.patient_id, b.date desc;

-- série de exames para as curvas
create or replace view nefro.v_lab_curves with (security_invoker = true) as
select organization_id, patient_id, analyte, date, value from nefro.lab_results;

-- peritonites por mês (para taxa por 1000 pacientes-mês)
create or replace view nefro.v_peritonitis_monthly with (security_invoker = true) as
select organization_id, date_trunc('month', date)::date as month, count(*)::int as episodes
from nefro.infections
where lower(coalesce(infected_area, '')) like 'perit%'
group by organization_id, date_trunc('month', date);

-- datas-chave por paciente ativo: alimenta a fila "Hoje"
create or replace view nefro.v_patient_status with (security_invoker = true) as
select p.organization_id, p.id as patient_id, p.name, p.modality, p.access_type,
  (select max(k.date) from nefro.ktv_records k
     where k.patient_id = p.id and coalesce(k.calculated_ktv, k.imported_ktv) > 0) as last_ktv_date,
  (select max(b.date) from nefro.bcm_records b where b.patient_id = p.id) as last_bcm_date,
  (select max(e.date) from nefro.pet_records e where e.patient_id = p.id) as last_pet_date,
  (select x.next_change_date from nefro.extension_changes x where x.patient_id = p.id order by x.date desc limit 1) as next_extension_date
from nefro.patients p
where p.status = 'ATIVO';
