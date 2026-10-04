import { bcmAlert, ktvAlert, type Severity } from "@/lib/clinical/alerts";
import type { Modality } from "@/lib/clinical/ktv";

export type PatientStatusRow = {
  patient_id: string;
  name: string;
  modality: Modality | null;
  last_ktv_date: string | null;
  last_bcm_date: string | null;
  last_pet_date: string | null;
  next_extension_date: string | null;
};
export type KtvLatestRow = { patient_id: string; ktv: number; modality: Modality | null };
export type BcmLatestRow = { patient_id: string; overhydration: number | null; ecw: number | null };

export type TodayAction = {
  key: string;
  severity: Severity;
  icon: string;
  patientId: string;
  patientName: string;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
};

/** Intervalos de rotina (dias) por modalidade. Cada clínica poderá ajustar em Ajustes. */
export const DUE_DAYS = {
  ktv: { HD: 35, DP: 190 },
  bcm: { HD: 35, DP: 190 },
  pet: 380,
} as const;

function daysBetween(fromISO: string, to: Date) {
  return Math.floor((to.getTime() - new Date(`${fromISO}T00:00:00`).getTime()) / 86400000);
}

const group = (m: Modality | null) => (m === "HD" ? "HD" : "DP");
const SEV_ORDER: Record<Severity, number> = { critico: 0, atencao: 1, info: 2 };

export function buildTodayActions(input: {
  today: Date;
  statuses: PatientStatusRow[];
  ktvLatest: KtvLatestRow[];
  bcmLatest: BcmLatestRow[];
}): TodayAction[] {
  const { today, statuses, ktvLatest, bcmLatest } = input;
  const actions: TodayAction[] = [];
  const byId = new Map(statuses.map((s) => [s.patient_id, s]));

  for (const k of ktvLatest) {
    const p = byId.get(k.patient_id);
    const a = ktvAlert(k.ktv, k.modality);
    if (p && a)
      actions.push({
        key: `ktv-low-${p.patient_id}`, severity: "critico", icon: "water_drop", patientId: p.patient_id, patientName: p.name,
        title: a.title, detail: a.detail, actionLabel: "Rever prescrição e registrar Kt/V", href: `/pacientes/${p.patient_id}`,
      });
  }
  for (const b of bcmLatest) {
    const p = byId.get(b.patient_id);
    const a = bcmAlert(b.overhydration, b.ecw);
    if (p && a)
      actions.push({
        key: `oh-${p.patient_id}`, severity: "critico", icon: "monitor_weight", patientId: p.patient_id, patientName: p.name,
        title: a.title, detail: a.detail, actionLabel: "Reavaliar peso seco", href: `/lancar/bcm?paciente=${p.patient_id}`,
      });
  }
  for (const p of statuses) {
    const g = group(p.modality);
    const ktvDays = p.last_ktv_date ? daysBetween(p.last_ktv_date, today) : null;
    if (ktvDays === null || ktvDays > DUE_DAYS.ktv[g])
      actions.push({
        key: `ktv-due-${p.patient_id}`, severity: "atencao", icon: "event_busy", patientId: p.patient_id, patientName: p.name,
        title: ktvDays === null ? "Sem Kt/V registrado" : `Kt/V há ${ktvDays} dias`,
        detail: `Rotina: a cada ${DUE_DAYS.ktv[g]} dias`, actionLabel: "Registrar Kt/V", href: `/lancar/ktv?paciente=${p.patient_id}`,
      });
    const bcmDays = p.last_bcm_date ? daysBetween(p.last_bcm_date, today) : null;
    if (bcmDays === null || bcmDays > DUE_DAYS.bcm[g])
      actions.push({
        key: `bcm-due-${p.patient_id}`, severity: "atencao", icon: "event_busy", patientId: p.patient_id, patientName: p.name,
        title: bcmDays === null ? "Sem BCM registrado" : `BCM há ${bcmDays} dias`,
        detail: `Rotina: a cada ${DUE_DAYS.bcm[g]} dias`, actionLabel: "Registrar BCM", href: `/lancar/bcm?paciente=${p.patient_id}`,
      });
    if (g === "DP") {
      const petDays = p.last_pet_date ? daysBetween(p.last_pet_date, today) : null;
      if (petDays !== null && petDays > DUE_DAYS.pet)
        actions.push({
          key: `pet-due-${p.patient_id}`, severity: "atencao", icon: "science", patientId: p.patient_id, patientName: p.name,
          title: `PET há ${petDays} dias`, detail: "Rotina: anual", actionLabel: "Agendar PET", href: `/lancar/pet?paciente=${p.patient_id}`,
        });
      if (p.next_extension_date && daysBetween(p.next_extension_date, today) > 0)
        actions.push({
          key: `ext-${p.patient_id}`, severity: "atencao", icon: "published_with_changes", patientId: p.patient_id, patientName: p.name,
          title: `Troca de extensão atrasada (${daysBetween(p.next_extension_date, today)} dias)`,
          detail: "A troca prevista já passou", actionLabel: "Registrar troca", href: `/lancar/troca-extensao?paciente=${p.patient_id}`,
        });
    }
  }
  return actions.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.patientName.localeCompare(b.patientName, "pt-BR"));
}
