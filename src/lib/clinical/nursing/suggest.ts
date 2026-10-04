import { bcmAlert, DEFAULT_TARGETS, ktvAlert, labAlert, type Severity } from "../alerts";
import { hydrationStatus } from "../bcm";
import type { Modality } from "../ktv";
import { formatDate } from "../../date";
import { CATALOG } from "./catalog";
import { bmi, vitalsAlerts } from "./risk";

/** Dados mais antigos que isso não sustentam uma sugestão. */
export const MAX_AGE_DAYS = { assessment: 30, bcm: 120, lab: 120, infection: 90, peritonitis: 180, foot: 400 };

export type AssessmentLite = {
  id?: string;
  date: string;
  edema: string | null;
  dyspnea: boolean | null;
  pain_score: number | null;
  access_site: string | null;
  skin: string | null;
  appetite: string | null;
  anxiety: boolean | null;
  adherence_fluid: string | null;
  adherence_diet: string | null;
  adherence_meds: string | null;
  knowledge_deficit: boolean | null;
  mobility: string | null;
  /** avaliação guiada: sinais vitais e respostas em JSON (ausentes nos registros do formulário antigo) */
  bp_sys?: number | null;
  bp_dia?: number | null;
  hr?: number | null;
  rr?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  waist_cm?: number | null;
  glucose?: number | null;
  answers?: Record<string, unknown> | null;
};

export type SuggestInput = {
  today: Date;
  patient: { modality: Modality | null; diabetic: boolean | null };
  bcm: { date: string; overhydration: number | null; ecw: number | null } | null;
  ktv: { date: string; value: number | null } | null;
  labs: { date: string; analyte: string; value: number }[];
  infections: { date: string; infected_area: string | null }[];
  assessment: AssessmentLite | null;
  /** último rastreamento do pé diabético */
  foot?: { date: string; risk_category: number } | null;
  /** diagnósticos ativos já registrados: não voltam a ser sugeridos */
  activeCatalogIds: string[];
};

export type Suggestion = { catalogId: string; severity: Severity; evidence: string[]; assessmentId?: string };

const SEVERITY_ORDER: Record<Severity, number> = { critico: 0, atencao: 1, info: 2 };

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

function ageDays(iso: string, today: Date): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((start - Date.UTC(y, m - 1, d)) / 86_400_000);
}

const fresh = (iso: string, max: number, today: Date) => ageDays(iso, today) <= max;

export function suggestDiagnoses(input: SuggestInput): Suggestion[] {
  const { today, patient, assessment } = input;
  const out = new Map<string, Suggestion>();
  const add = (catalogId: string, severity: Severity, evidence: string) => {
    const cur = out.get(catalogId);
    if (!cur) {
      out.set(catalogId, { catalogId, severity, evidence: [evidence] });
      return;
    }
    cur.evidence.push(evidence);
    if (SEVERITY_ORDER[severity] < SEVERITY_ORDER[cur.severity]) cur.severity = severity;
  };

  const a = assessment && fresh(assessment.date, MAX_AGE_DAYS.assessment, today) ? assessment : null;
  const aDate = a ? formatDate(a.date) : "";
  const dp = patient.modality === "APD" || patient.modality === "CAPD";

  // hidratação (BCM + edema)
  const bcm = input.bcm && input.bcm.overhydration !== null && fresh(input.bcm.date, MAX_AGE_DAYS.bcm, today) ? input.bcm : null;
  const status = bcm ? hydrationStatus(bcm.overhydration!, bcm.ecw) : null;
  const edemaHigh = a?.edema === "++" || a?.edema === "+++";
  if (bcm && (status === "critico" || status === "sobreidratado")) {
    const crit = bcmAlert(bcm.overhydration, bcm.ecw);
    add("volume_excesso", crit ? "critico" : "atencao", `BCM ${formatDate(bcm.date)}: sobreidratação de ${bcm.overhydration} L`);
  }
  if (edemaHigh) add("volume_excesso", "atencao", `Avaliação ${aDate}: edema ${a!.edema}`);
  if (a?.dyspnea && out.has("volume_excesso")) add("volume_excesso", "atencao", `Avaliação ${aDate}: dispneia`);
  if (bcm && status === "hipohidratado") add("volume_deficiente", "atencao", `BCM ${formatDate(bcm.date)}: hipohidratação (${bcm.overhydration} L)`);

  // infecção
  for (const inf of input.infections) {
    const area = norm(inf.infected_area);
    const peritoneal = area === "PERITONEO";
    if (peritoneal && dp && fresh(inf.date, MAX_AGE_DAYS.peritonitis, today)) {
      add("risco_peritonite", "atencao", `Peritonite em ${formatDate(inf.date)}`);
    } else if (!peritoneal && fresh(inf.date, MAX_AGE_DAYS.infection, today)) {
      add("risco_infeccao_acesso", "atencao", `Infecção de ${inf.infected_area ?? "acesso"} em ${formatDate(inf.date)}`);
    }
  }
  if (a?.access_site && a.access_site !== "Sem alterações") {
    add("risco_infeccao_acesso", a.access_site === "Secreção" ? "critico" : "atencao", `Avaliação ${aDate}: ${a.access_site.toLowerCase()} no sítio do acesso`);
    if (a.access_site === "Dor local") add("dor_aguda", "atencao", `Avaliação ${aDate}: dor local no acesso`);
  }

  // exames: valores mais recentes de cada analito
  const latest = new Map<string, { date: string; value: number }>();
  for (const l of input.labs) {
    const cur = latest.get(l.analyte);
    if (!cur || l.date > cur.date) latest.set(l.analyte, { date: l.date, value: Number(l.value) });
  }
  for (const [analyte, l] of latest) {
    if (!fresh(l.date, MAX_AGE_DAYS.lab, today)) continue;
    const alert = labAlert(analyte, l.value);
    if (!alert) continue;
    const when = formatDate(l.date);
    if (["K", "P", "Ca", "PTH"].includes(analyte)) add("risco_eletrolitos", alert.severity, `${alert.title} em ${when}`);
    if (analyte === "Hb" && l.value < DEFAULT_TARGETS.hemoglobin[0]) add("fadiga", "atencao", `${alert.title} em ${when}`);
  }

  // Kt/V
  if (input.ktv && input.ktv.value !== null) {
    const alert = ktvAlert(input.ktv.value, patient.modality);
    if (alert) add("dialise_insuficiente", "atencao", `${alert.title} em ${formatDate(input.ktv.date)}`);
  }

  if (patient.diabetic) add("risco_glicemia", "info", "Paciente diabético");

  // demais itens da avaliação estruturada
  if (a) {
    if (a.pain_score !== null && a.pain_score >= 4) add("dor_aguda", a.pain_score >= 7 ? "critico" : "atencao", `Avaliação ${aDate}: dor ${a.pain_score}/10`);
    if (a.skin && a.skin !== "Íntegra") add("integridade_pele", "atencao", `Avaliação ${aDate}: pele ${a.skin.toLowerCase()}`);
    if (a.appetite === "Diminuído") add("nutricao_desequilibrada", "atencao", `Avaliação ${aDate}: apetite diminuído`);
    if (a.mobility && a.mobility !== "Independente") add("mobilidade_prejudicada", "atencao", `Avaliação ${aDate}: mobilidade ${a.mobility.toLowerCase()}`);
    if (a.anxiety) add("ansiedade", "atencao", `Avaliação ${aDate}: ansiedade`);
    if (a.knowledge_deficit) add("conhecimento_deficiente", "atencao", `Avaliação ${aDate}: conhecimento deficiente sobre o tratamento`);
    const adherence = [
      ["líquidos", a.adherence_fluid],
      ["dieta", a.adherence_diet],
      ["medicação", a.adherence_meds],
    ] as const;
    const low = adherence.filter(([, v]) => v === "Baixa");
    const partial = adherence.filter(([, v]) => v === "Parcial");
    if (low.length > 0 || partial.length >= 2) {
      const detail = [...low, ...partial].map(([k, v]) => `${k} ${v!.toLowerCase()}`).join(", ");
      add("adesao_regime", "atencao", `Avaliação ${aDate}: adesão — ${detail}`);
    }
  }

  // pé diabético (rastreamento próprio, vale por mais tempo que a avaliação)
  if (input.foot && input.foot.risk_category >= 1 && fresh(input.foot.date, MAX_AGE_DAYS.foot, today)) {
    add("risco_ulcera_pe", input.foot.risk_category === 3 ? "critico" : "atencao", `Pé diabético ${formatDate(input.foot.date)}: categoria de risco ${input.foot.risk_category}`);
  }

  // avaliação guiada (roteiro SAE)
  if (a) {
    const ans = a.answers ?? {};
    const is = (key: string, ...values: string[]) => typeof ans[key] === "string" && values.includes(ans[key] as string);
    const includes = (key: string, value: string) => Array.isArray(ans[key]) && (ans[key] as string[]).includes(value);

    const pa = vitalsAlerts({ bp_sys: a.bp_sys, bp_dia: a.bp_dia }, null).find((v) => v.code === "pa_alta" || v.code === "pa_muito_alta");
    if (pa) add("risco_pa", pa.severity, `Avaliação ${aDate}: ${pa.title}`);
    const imc = bmi(a.weight_kg, a.height_cm);
    if (imc !== null && imc >= 30) add("sobrepeso", "info", `Avaliação ${aDate}: IMC ${imc} kg/m² (confirme com o peso seco)`);
    if (is("perfusao", "> 3 segundos")) add("perfusao_periferica", "atencao", `Avaliação ${aDate}: enchimento capilar > 3 segundos`);
    if (is("pulso_pedioso", "Diminuído", "Não palpável")) add("perfusao_periferica", "atencao", `Avaliação ${aDate}: pulso pedioso ${String(ans.pulso_pedioso).toLowerCase()}`);
    if (is("autocuidado", "Parcialmente dependente", "Dependente")) add("autocuidado_deficiente", "atencao", `Avaliação ${aDate}: autocuidado ${String(ans.autocuidado).toLowerCase()}`);
    if (is("sono", "Prejudicado")) add("sono_prejudicado", "atencao", `Avaliação ${aDate}: sono prejudicado`);
    if (is("exercicio", "Não pratica")) add("sedentarismo", "info", `Avaliação ${aDate}: não pratica exercício físico`);
    if (is("intestinal", "Constipação")) add("constipacao", "atencao", `Avaliação ${aDate}: constipação`);
    if (is("tabagismo", "Fuma")) add("habitos_risco", "atencao", `Avaliação ${aDate}: fuma`);
    if (is("alcool_drogas", "Frequente")) add("habitos_risco", "atencao", `Avaliação ${aDate}: consumo frequente de álcool ou drogas`);
    if (includes("oral", "Lesões") || includes("oral", "Ausência de dentes que dificulta a alimentação")) add("denticao_prejudicada", "atencao", `Avaliação ${aDate}: alteração na cavidade oral`);
  }

  const active = new Set(input.activeCatalogIds);
  const order = new Map(CATALOG.map((c, i) => [c.id, i]));
  return [...out.values()]
    .filter((s) => !active.has(s.catalogId))
    .map((s) => (a?.id && s.evidence.some((e) => e.startsWith("Avaliação")) ? { ...s, assessmentId: a.id } : s))
    .sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity] || order.get(x.catalogId)! - order.get(y.catalogId)!);
}
