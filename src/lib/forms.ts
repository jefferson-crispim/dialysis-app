import { daugirdasKtv, type Modality } from "@/lib/clinical/ktv";
import { bcmAlert, ktvAlert, labAlert, type ClinicalAlert } from "@/lib/clinical/alerts";
import { hydrationStatus, ohPercentOfEcw, suggestedDryWeight, ultrafiltrationTarget } from "@/lib/clinical/bcm";
import { formatDate } from "@/lib/date";

export type FieldDef = {
  name: string;
  label: string;
  type: "number" | "date" | "text" | "select" | "textarea";
  unit?: string;
  step?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
  defaultValue?: string;
};

export type PatientLite = { id: string; name: string; modality: Modality | null };
export type Values = Record<string, string>;

export type Preview = { lines: { label: string; value: string }[]; alerts: ClinicalAlert[]; error?: string };

export type FormDef = {
  slug: string;
  title: string;
  verb: string; // verbo do botão, repetido na confirmação
  icon: string;
  table: string;
  description: string;
  fields: FieldDef[];
  /** linhas a gravar (uma ou várias) a partir do formulário; null = dados insuficientes */
  build: (v: Values, p: PatientLite) => Record<string, unknown>[] | null;
  preview: (v: Values, p: PatientLite) => Preview;
};

const n = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return null;
  const x = Number(v.replace(",", "."));
  return Number.isFinite(x) ? x : null;
};
const t = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/** Resolve "@hoje" / "@hoje+365" na data local do navegador (evita o dia seguinte por causa do UTC). */
export function resolveDefault(def: string | undefined, now = new Date()): string {
  if (!def) return "";
  const m = def.match(/^@hoje(?:\+(\d+))?$/);
  if (!m) return def;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(m[1] ?? 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ktvOf(v: Values) {
  const calc = daugirdasKtv({
    preUrea: n(v.pre_urea) ?? 0,
    postUrea: n(v.post_urea) ?? 0,
    sessionTimeMin: n(v.session_time_min) ?? 0,
    ufLiters: n(v.uf_volume) ?? 0,
    postWeightKg: n(v.post_weight) ?? 0,
  });
  return { calc, imported: n(v.imported_ktv) };
}

const LAB_FIELDS: { name: string; label: string; unit: string; step: string }[] = [
  { name: "K", label: "Potássio", unit: "mEq/L", step: "0.1" },
  { name: "P", label: "Fósforo", unit: "mg/dL", step: "0.1" },
  { name: "Ca", label: "Cálcio", unit: "mg/dL", step: "0.1" },
  { name: "PTH", label: "PTH", unit: "pg/mL", step: "1" },
  { name: "Hb", label: "Hemoglobina", unit: "g/dL", step: "0.1" },
  { name: "Ferritina", label: "Ferritina", unit: "ng/mL", step: "1" },
];

export const FORMS: FormDef[] = [
  {
    slug: "ktv",
    title: "Kt/V",
    verb: "Registrar Kt/V",
    icon: "water_drop",
    table: "ktv_records",
    description: "Dose de diálise. Em hemodiálise o sistema calcula (Daugirdas II); em diálise peritoneal informe o valor medido.",
    fields: [
      { name: "date", label: "Data", type: "date", required: true, defaultValue: "@hoje" },
      { name: "pre_urea", label: "Ureia pré", type: "number", unit: "mg/dL", step: "0.1", hint: "Hemodiálise" },
      { name: "post_urea", label: "Ureia pós", type: "number", unit: "mg/dL", step: "0.1" },
      { name: "session_time_min", label: "Tempo de sessão", type: "number", unit: "min", step: "1" },
      { name: "uf_volume", label: "Ultrafiltração", type: "number", unit: "L", step: "0.1" },
      { name: "post_weight", label: "Peso pós", type: "number", unit: "kg", step: "0.1" },
      { name: "imported_ktv", label: "Kt/V já medido", type: "number", step: "0.01", hint: "Diálise peritoneal (semanal) ou resultado de laboratório" },
    ],
    build: (v, p) => {
      const { calc, imported } = ktvOf(v);
      if (calc === null && !(imported && imported > 0)) return null;
      return [
        {
          date: v.date,
          modality: p.modality,
          pre_urea: n(v.pre_urea),
          post_urea: n(v.post_urea),
          session_time_min: n(v.session_time_min),
          uf_volume: n(v.uf_volume),
          post_weight: n(v.post_weight),
          calculated_ktv: calc,
          imported_ktv: calc === null ? imported : null,
        },
      ];
    },
    preview: (v, p) => {
      const { calc, imported } = ktvOf(v);
      const value = calc ?? (imported && imported > 0 ? imported : null);
      if (value === null) return { lines: [], alerts: [], error: "Informe ureia pré/pós, tempo, UF e peso — ou o Kt/V já medido." };
      const a = ktvAlert(value, p.modality);
      return { lines: [{ label: calc !== null ? "Kt/V calculado (Daugirdas II)" : "Kt/V informado", value: value.toFixed(2) }], alerts: a ? [a] : [] };
    },
  },
  {
    slug: "bcm",
    title: "BCM",
    verb: "Registrar BCM",
    icon: "monitor_weight",
    table: "bcm_records",
    description: "Composição corporal. Mostra hidratação, peso seco sugerido e meta de ultrafiltração.",
    fields: [
      { name: "date", label: "Data", type: "date", required: true, defaultValue: "@hoje" },
      { name: "overhydration", label: "Sobreidratação (OH)", type: "number", unit: "L", step: "0.1", required: true },
      { name: "ecw", label: "Água extracelular (ECW)", type: "number", unit: "L", step: "0.1" },
      { name: "icw", label: "Água intracelular (ICW)", type: "number", unit: "L", step: "0.1" },
      { name: "tbw", label: "Água corporal total (TBW)", type: "number", unit: "L", step: "0.1" },
      { name: "lti", label: "Massa magra (LTI)", type: "number", unit: "kg/m²", step: "0.1" },
      { name: "fti", label: "Massa gorda (FTI)", type: "number", unit: "kg/m²", step: "0.1" },
      { name: "post_weight", label: "Peso atual", type: "number", unit: "kg", step: "0.1", hint: "Para sugerir o peso seco" },
    ],
    build: (v) => {
      const oh = n(v.overhydration);
      if (oh === null) return null;
      const w = n(v.post_weight);
      return [
        {
          date: v.date,
          overhydration: oh,
          ecw: n(v.ecw),
          icw: n(v.icw),
          tbw: n(v.tbw),
          lti: n(v.lti),
          fti: n(v.fti),
          post_weight: w,
          dry_weight_suggested: w ? suggestedDryWeight(w, oh) : null,
          uf_target: ultrafiltrationTarget(oh),
        },
      ];
    },
    preview: (v) => {
      const oh = n(v.overhydration);
      if (oh === null) return { lines: [], alerts: [], error: "Informe a sobreidratação (OH) em litros." };
      const ecw = n(v.ecw);
      const w = n(v.post_weight);
      const pct = ohPercentOfEcw(oh, ecw);
      const status = hydrationStatus(oh, ecw);
      const lines = [
        { label: "Hidratação", value: `${status}${pct !== null ? ` (${pct}% do ECW)` : ""}` },
        { label: "Meta de ultrafiltração", value: `${ultrafiltrationTarget(oh).toFixed(1)} L` },
      ];
      if (w) lines.push({ label: "Peso seco sugerido", value: `${suggestedDryWeight(w, oh)} kg` });
      const a = bcmAlert(oh, ecw);
      return { lines, alerts: a ? [a] : [] };
    },
  },
  {
    slug: "labs",
    title: "Exames laboratoriais",
    verb: "Registrar exames",
    icon: "biotech",
    table: "lab_results",
    description: "Preencha apenas os exames que chegaram. Valores fora da meta geram alerta.",
    fields: [
      { name: "date", label: "Data da coleta", type: "date", required: true, defaultValue: "@hoje" },
      ...LAB_FIELDS.map((f) => ({ name: f.name, label: f.label, type: "number" as const, unit: f.unit, step: f.step })),
    ],
    build: (v) => {
      const rows = LAB_FIELDS.flatMap((f) => {
        const value = n(v[f.name]);
        return value === null ? [] : [{ date: v.date, analyte: f.name, value }];
      });
      return rows.length ? rows : null;
    },
    preview: (v) => {
      const lines = LAB_FIELDS.flatMap((f) => (n(v[f.name]) === null ? [] : [{ label: f.label, value: `${v[f.name]} ${f.unit}` }]));
      if (!lines.length) return { lines: [], alerts: [], error: "Informe ao menos um exame." };
      const alerts = LAB_FIELDS.flatMap((f) => {
        const value = n(v[f.name]);
        const a = value === null ? null : labAlert(f.name, value);
        return a ? [a] : [];
      });
      return { lines, alerts };
    },
  },
  {
    slug: "pet",
    title: "PET",
    verb: "Registrar PET",
    icon: "science",
    table: "pet_records",
    description: "Teste de equilíbrio peritoneal.",
    fields: [
      { name: "date", label: "Data do PET", type: "date", required: true, defaultValue: "@hoje" },
      { name: "fluid_transport", label: "Transporte de líquido", type: "select", options: ["ALTO TRANSP", "MÉDIO ALTO TRANSP", "MÉDIO BAIXO TRANSP", "BAIXO TRANSP"], required: true },
      { name: "solute_transport", label: "Transporte de soluto", type: "select", options: ["ALTO TRANSP", "MÉDIO ALTO TRANSP", "MÉDIO BAIXO TRANSP", "BAIXO TRANSP"], required: true },
    ],
    build: (v) => (v.fluid_transport && v.solute_transport ? [{ date: v.date, fluid_transport: v.fluid_transport, solute_transport: v.solute_transport }] : null),
    preview: (v) =>
      v.fluid_transport && v.solute_transport
        ? { lines: [{ label: "Líquido", value: v.fluid_transport }, { label: "Soluto", value: v.solute_transport }], alerts: [] }
        : { lines: [], alerts: [], error: "Escolha o tipo de transporte de líquido e de soluto." },
  },
  {
    slug: "troca-extensao",
    title: "Troca de extensão",
    verb: "Registrar troca",
    icon: "published_with_changes",
    table: "extension_changes",
    description: "A próxima troca é sugerida para 12 meses; ajuste se precisar.",
    fields: [
      { name: "date", label: "Data da troca", type: "date", required: true, defaultValue: "@hoje" },
      { name: "responsible", label: "Responsável", type: "text" },
      { name: "reason", label: "Motivo", type: "select", options: ["IMPLANTE", "ROTINA", "CONTAMINAÇÃO", "DESCONEXÃO", "FISSURA"] },
      { name: "next_change_date", label: "Próxima troca", type: "date", defaultValue: "@hoje+365" },
    ],
    build: (v) => [{ date: v.date, responsible: t(v.responsible), reason: t(v.reason), next_change_date: t(v.next_change_date) }],
    preview: (v) => ({ lines: [{ label: "Próxima troca", value: formatDate(v.next_change_date, "não definida") }], alerts: [] }),
  },
  {
    slug: "infeccao",
    title: "Infecção ou peritonite",
    verb: "Registrar infecção",
    icon: "coronavirus",
    table: "infections",
    description: "Episódio de infecção de acesso, túnel ou peritonite.",
    fields: [
      { name: "date", label: "Início", type: "date", required: true, defaultValue: "@hoje" },
      { name: "infected_area", label: "Área infectada", type: "select", options: ["PERITÔNEO", "ACESSO", "TÚNEL", "ORIFÍCIO"], required: true },
      { name: "occurrence", label: "Ocorrência", type: "select", options: ["NOVA", "RECIDIVANTE", "REFRATÁRIA", "RECORRENTE"] },
      { name: "microorganism", label: "Microrganismo", type: "text" },
      { name: "treatment", label: "Tratamento", type: "textarea" },
    ],
    build: (v) =>
      v.infected_area
        ? [{ date: v.date, infected_area: v.infected_area, occurrence: t(v.occurrence), microorganism: t(v.microorganism), treatment: t(v.treatment) }]
        : null,
    preview: (v) =>
      v.infected_area
        ? { lines: [{ label: "Área", value: v.infected_area }], alerts: v.infected_area === "PERITÔNEO" ? [{ code: "peritonite", severity: "atencao", title: "Peritonite registrada", detail: "Acompanhe cultura e resposta ao tratamento." }] : [] }
        : { lines: [], alerts: [], error: "Escolha a área infectada." },
  },
  {
    slug: "diagnostico",
    title: "Diagnóstico de enfermagem",
    verb: "Registrar diagnóstico",
    icon: "clinical_notes",
    table: "nursing_diagnoses",
    description: "Registro manual. Para sugestões a partir dos dados do paciente, use o Processo de enfermagem na página do paciente.",
    fields: [
      { name: "date", label: "Data", type: "date", required: true, defaultValue: "@hoje" },
      { name: "diagnosis_code", label: "Diagnóstico", type: "text", required: true, hint: "Ex.: Volume de líquidos excessivo" },
      { name: "intervention", label: "Intervenção", type: "textarea" },
      { name: "evaluation", label: "Avaliação do resultado", type: "textarea" },
    ],
    build: (v) => (t(v.diagnosis_code) ? [{ date: v.date, diagnosis_code: v.diagnosis_code.trim(), intervention: t(v.intervention), evaluation: t(v.evaluation) }] : null),
    preview: (v) => (t(v.diagnosis_code) ? { lines: [{ label: "Diagnóstico", value: v.diagnosis_code }], alerts: [] } : { lines: [], alerts: [], error: "Descreva o diagnóstico de enfermagem." }),
  },
];

export const FORM_BY_SLUG = Object.fromEntries(FORMS.map((f) => [f.slug, f]));
