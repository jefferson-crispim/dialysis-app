import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { AlertBadge } from "@/components/AlertBadge";
import { Icon } from "@/components/Icon";
import { bcmAlert, ktvAlert, labAlert, type ClinicalAlert } from "@/lib/clinical/alerts";
import { hydrationStatus } from "@/lib/clinical/bcm";
import type { Modality } from "@/lib/clinical/ktv";
import { formatDate } from "@/lib/date";

const fmt = (iso: string | null) => formatDate(iso, "—");

type Ktv = { id: string; date: string; calculated_ktv: number | null; imported_ktv: number | null };
type Bcm = { id: string; date: string; overhydration: number | null; ecw: number | null; dry_weight_suggested: number | null };
type Lab = { id: string; date: string; analyte: string; value: number };

function List({ title, icon, empty, children }: { title: string; icon: string; empty: string; children: React.ReactNode[] }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Icon name={icon} className="text-brand" /> {title}
      </h2>
      {children.length === 0 ? <p className="text-muted">{empty}</p> : <ul className="grid divide-y divide-line">{children}</ul>}
    </Card>
  );
}

export default async function PacientePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const { supabase } = await requireSession();

  const { data: p } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();

  const [ktvR, bcmR, labR, infR, hospR, dxR] = await Promise.all([
    supabase.from("ktv_records").select("id,date,calculated_ktv,imported_ktv").eq("patient_id", id).order("date", { ascending: false }).limit(8),
    supabase.from("bcm_records").select("id,date,overhydration,ecw,dry_weight_suggested").eq("patient_id", id).order("date", { ascending: false }).limit(8),
    supabase.from("lab_results").select("id,date,analyte,value").eq("patient_id", id).order("date", { ascending: false }).limit(40),
    supabase.from("infections").select("id,date,infected_area,microorganism,outcome").eq("patient_id", id).order("date", { ascending: false }).limit(6),
    supabase.from("hospitalizations").select("id,date,end_date,reason,outcome").eq("patient_id", id).order("date", { ascending: false }).limit(6),
    supabase.from("nursing_diagnoses").select("id,date,diagnosis_code,etiology,intervention").eq("patient_id", id).eq("status", "ativo").order("date", { ascending: false }).limit(6),
  ]);
  const ktv = (ktvR.data ?? []) as Ktv[];
  const bcm = (bcmR.data ?? []) as Bcm[];
  const labs = (labR.data ?? []) as Lab[];
  const modality = p.modality as Modality | null;

  const alerts: ClinicalAlert[] = [];
  const lastKtv = ktv.map((k) => k.calculated_ktv ?? k.imported_ktv).find((v) => v && v > 0) ?? null;
  const ka = ktvAlert(lastKtv, modality);
  if (ka) alerts.push(ka);
  const ba = bcm[0] ? bcmAlert(bcm[0].overhydration, bcm[0].ecw) : null;
  if (ba) alerts.push(ba);
  const seen = new Set<string>();
  for (const l of labs) {
    if (seen.has(l.analyte)) continue;
    seen.add(l.analyte);
    const la = labAlert(l.analyte, Number(l.value));
    if (la) alerts.push(la);
  }

  const act = (slug: string, label: string, icon: string) => (
    <LinkButton key={slug} href={`/lancar/${slug}?paciente=${id}`} icon={icon} variant="secondary">
      {label}
    </LinkButton>
  );

  return (
    <div className="grid gap-6">
      {salvo && (
        <p role="status" className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-ok-bg px-4 py-3 font-semibold text-ok-ink">
          <Icon name="check_circle" filled /> {salvo} concluído.
        </p>
      )}
      <div>
        <Link href="/pacientes" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Icon name="arrow_back" size={18} /> Pacientes
        </Link>
        <h1 className="text-3xl font-extrabold">{p.name}</h1>
        <p className="mt-1 text-muted">
          {[p.modality, p.gender === "F" ? "Feminino" : p.gender === "M" ? "Masculino" : null, p.birth_date ? `nascimento ${fmt(p.birth_date)}` : null, p.primary_disease, p.dry_weight ? `peso seco ${p.dry_weight} kg` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {act("ktv", "Registrar Kt/V", "water_drop")}
        {act("bcm", "Registrar BCM", "monitor_weight")}
        {act("labs", "Registrar exames", "biotech")}
        {act("avaliacao", "Avaliação de enfermagem", "assignment")}
        <LinkButton href={`/pacientes/${id}/processo`} icon="clinical_notes" variant="secondary">
          Processo de enfermagem
        </LinkButton>
        {act("infeccao", "Registrar infecção", "coronavirus")}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Alertas</h2>
        {alerts.length === 0 ? (
          <AlertBadge severity="ok">Nenhum alerta com os últimos registros</AlertBadge>
        ) : (
          <div className="grid gap-2">
            {alerts.map((a) => (
              <div key={a.code} className="flex flex-wrap items-center gap-2">
                <AlertBadge severity={a.severity}>{a.title}</AlertBadge>
                <span className="text-sm text-muted">{a.detail}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <List title="Kt/V" icon="water_drop" empty="Nenhum Kt/V registrado.">
          {ktv.map((k) => {
            const v = k.calculated_ktv ?? k.imported_ktv;
            const a = ktvAlert(v, modality);
            return (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2">
                <span>{fmt(k.date)}</span>
                {v && v > 0 ? <AlertBadge severity={a ? "critico" : "ok"}>{v.toFixed(2)}</AlertBadge> : <span className="text-muted">não medido</span>}
              </li>
            );
          })}
        </List>
        <List title="BCM" icon="monitor_weight" empty="Nenhum BCM registrado.">
          {bcm.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span>{fmt(b.date)}</span>
              <span className="text-sm text-muted">
                {b.overhydration !== null ? `OH ${b.overhydration} L · ${hydrationStatus(b.overhydration, b.ecw)}` : "sem medidas"}
                {b.dry_weight_suggested ? ` · peso seco ${b.dry_weight_suggested} kg` : ""}
              </span>
            </li>
          ))}
        </List>
        <List title="Exames recentes" icon="biotech" empty="Nenhum exame registrado.">
          {labs.slice(0, 10).map((l) => {
            const a = labAlert(l.analyte, Number(l.value));
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {l.analyte} · {fmt(l.date)}
                </span>
                <AlertBadge severity={a ? a.severity : "ok"}>{String(l.value)}</AlertBadge>
              </li>
            );
          })}
        </List>
        <List title="Diagnósticos de enfermagem ativos" icon="clinical_notes" empty="Nenhum diagnóstico ativo. Abra o Processo de enfermagem para ver sugestões.">
          {(dxR.data ?? []).map((d) => (
            <li key={d.id} className="py-2">
              <p className="font-semibold">{d.diagnosis_code}</p>
              <p className="text-sm text-muted">{[fmt(d.date), d.etiology ? `relacionado a ${d.etiology}` : d.intervention].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </List>
        <List title="Infecções" icon="coronavirus" empty="Nenhuma infecção registrada.">
          {(infR.data ?? []).map((i) => (
            <li key={i.id} className="py-2">
              <p className="font-semibold">{i.infected_area ?? "Infecção"}</p>
              <p className="text-sm text-muted">{[fmt(i.date), i.microorganism, i.outcome].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </List>
        <List title="Hospitalizações" icon="local_hospital" empty="Nenhuma hospitalização registrada.">
          {(hospR.data ?? []).map((h) => (
            <li key={h.id} className="py-2">
              <p className="font-semibold">{h.reason ?? "Hospitalização"}</p>
              <p className="text-sm text-muted">{[`${fmt(h.date)} a ${fmt(h.end_date)}`, h.outcome].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </List>
      </div>
    </div>
  );
}
