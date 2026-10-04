import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { DiagnosisList, SuggestionList, type Diagnosis } from "@/components/DiagnosisPanel";
import { suggestDiagnoses, type AssessmentLite } from "@/lib/clinical/nursing/suggest";
import type { Modality } from "@/lib/clinical/ktv";
import { formatDate } from "@/lib/date";
import { AlertBadge } from "@/components/AlertBadge";
import { answerAlerts, footAlerts, vitalsAlerts, type FootCategory } from "@/lib/clinical/nursing/risk";
import type { ClinicalAlert } from "@/lib/clinical/alerts";

export const metadata = { title: "Processo de enfermagem" };

export default async function ProcessoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ avaliado?: string }> }) {
  const { id } = await params;
  const { avaliado } = await searchParams;
  const { supabase, orgId, user, role } = await requireSession();

  const { data: p } = await supabase.from("patients").select("id,name,modality,diabetic,gender").eq("id", id).maybeSingle();
  if (!p) notFound();

  const [bcmR, ktvR, labR, infR, asmR, dxR, footR] = await Promise.all([
    supabase.from("bcm_records").select("date,overhydration,ecw").eq("patient_id", id).order("date", { ascending: false }).limit(1),
    supabase.from("ktv_records").select("date,calculated_ktv,imported_ktv").eq("patient_id", id).order("date", { ascending: false }).limit(8),
    supabase.from("lab_results").select("date,analyte,value").eq("patient_id", id).order("date", { ascending: false }).limit(60),
    supabase.from("infections").select("date,infected_area").eq("patient_id", id).order("date", { ascending: false }).limit(10),
    supabase.from("nursing_assessments").select("*").eq("patient_id", id).order("date", { ascending: false }).limit(1),
    supabase.from("nursing_diagnoses").select("*").eq("patient_id", id).order("date", { ascending: false }).limit(60),
    supabase.from("diabetic_foot_screenings").select("date,risk_category").eq("patient_id", id).order("date", { ascending: false }).limit(1),
  ]);

  const diagnoses = (dxR.data ?? []) as Diagnosis[];
  const assessment = ((asmR.data ?? [])[0] ?? null) as (AssessmentLite & { notes: string | null }) | null;
  const lastKtv = (ktvR.data ?? []).find((k) => (k.calculated_ktv ?? k.imported_ktv) > 0) ?? null;

  const foot = ((footR.data ?? [])[0] ?? null) as { date: string; risk_category: number } | null;
  const today = new Date();
  const gender = p.gender === "M" || p.gender === "F" ? p.gender : null;
  const riskAlerts: ClinicalAlert[] = [
    ...(assessment ? vitalsAlerts(assessment, gender) : []),
    ...(assessment ? answerAlerts(assessment.answers, assessment) : []),
    ...(foot ? footAlerts(foot.risk_category as FootCategory, foot.date, today) : []),
  ];

  const suggestions = suggestDiagnoses({
    today,
    patient: { modality: p.modality as Modality | null, diabetic: p.diabetic },
    bcm: (bcmR.data ?? [])[0] ?? null,
    ktv: lastKtv ? { date: lastKtv.date, value: Number(lastKtv.calculated_ktv ?? lastKtv.imported_ktv) } : null,
    labs: (labR.data ?? []).map((l) => ({ date: l.date, analyte: l.analyte, value: Number(l.value) })),
    infections: infR.data ?? [],
    assessment,
    foot,
    activeCatalogIds: diagnoses.filter((d) => d.status === "ativo" && d.catalog_id).map((d) => d.catalog_id!),
  });

  const canWrite = role !== "viewer";
  const ctx = { orgId, patientId: p.id as string, userId: user.id };
  const asmItems = assessment
    ? ([
        ["Edema", assessment.edema],
        ["Dor", assessment.pain_score !== null ? `${assessment.pain_score}/10` : null],
        ["Acesso", assessment.access_site],
        ["Pele", assessment.skin],
        ["Apetite", assessment.appetite],
        ["Mobilidade", assessment.mobility],
      ] as const).filter(([, v]) => v)
    : [];

  return (
    <div className="grid gap-6">
      {avaliado && (
        <p role="status" className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-ok-bg px-4 py-3 font-semibold text-ok-ink">
          <Icon name="check_circle" filled /> Avaliação registrada. Confira os alertas e os diagnósticos sugeridos abaixo.
        </p>
      )}
      <div>
        <Link href={`/pacientes/${p.id}`} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Icon name="arrow_back" size={18} /> {p.name}
        </Link>
        <h1 className="text-3xl font-extrabold">Processo de enfermagem</h1>
        <p className="mt-1 text-muted">Avaliação, diagnóstico, planejamento e reavaliação (COFEN 736/2024).</p>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon name="assignment" className="text-brand" /> Última avaliação
          </h2>
          {canWrite && (
            <LinkButton href={`/pacientes/${p.id}/avaliacao`} icon="add" variant="secondary">
              Nova avaliação
            </LinkButton>
          )}
        </div>
        {assessment ? (
          <>
            <p className="text-sm text-muted">Registrada em {formatDate(assessment.date)}</p>
            {asmItems.length > 0 && (
              <p className="mt-1">{asmItems.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
            )}
          </>
        ) : (
          <p className="text-muted">Nenhuma avaliação registrada. Ela aumenta a precisão das sugestões.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Icon name="warning" className="text-brand" /> Alertas de risco
        </h2>
        {riskAlerts.length === 0 ? (
          <AlertBadge severity="ok">Nenhum alerta com a última avaliação</AlertBadge>
        ) : (
          <div className="grid gap-2">
            {riskAlerts.map((a) => (
              <div key={a.code} className="flex flex-wrap items-center gap-2">
                <AlertBadge severity={a.severity}>{a.title}</AlertBadge>
                <span className="text-sm text-muted">{a.detail}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SuggestionList ctx={ctx} suggestions={suggestions} canWrite={canWrite} />
      <DiagnosisList diagnoses={diagnoses} canWrite={canWrite} />
    </div>
  );
}
