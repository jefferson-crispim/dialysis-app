import type { ClinicalAlert } from "../alerts";

/**
 * Alertas de risco derivados da avaliação de enfermagem.
 * - Pé diabético: categorias e periodicidade do Anexo 2 do roteiro SAE (SMS Ribeirão Preto).
 * - IMC ≥ 30 e circunferência abdominal (≥ 102 cm homens, ≥ 88 cm mulheres): critérios do roteiro.
 * - Demais limites (PA, FC, FR, glicemia): premissas de apoio à decisão, a validar pela equipe.
 */

export type Gender = "M" | "F" | null;
export type Vitals = {
  bp_sys?: number | null;
  bp_dia?: number | null;
  hr?: number | null;
  rr?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  waist_cm?: number | null;
  glucose?: number | null;
};

const alert = (code: string, severity: ClinicalAlert["severity"], title: string, detail: string): ClinicalAlert => ({ code, severity, title, detail });
const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!num(weightKg) || !num(heightCm) || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function vitalsAlerts(v: Vitals, gender: Gender): ClinicalAlert[] {
  const out: ClinicalAlert[] = [];
  const { bp_sys: sys, bp_dia: dia } = v;
  if (num(sys) && num(dia)) {
    const label = `${sys}/${dia} mmHg`;
    if (sys >= 180 || dia >= 110) out.push(alert("pa_muito_alta", "critico", `PA muito elevada (${label})`, "Reaferir e comunicar o médico"));
    else if (sys >= 140 || dia >= 90) out.push(alert("pa_alta", "atencao", `PA elevada (${label})`, "Reaferir e acompanhar"));
    else if (sys < 90) out.push(alert("pa_baixa", "atencao", `PA baixa (${label})`, "Avaliar sintomas de hipotensão"));
  }
  if (num(v.hr) && (v.hr > 100 || v.hr < 50)) out.push(alert("fc_alterada", "atencao", `Frequência cardíaca alterada (${v.hr} bpm)`, "Referência: 50 a 100 bpm"));
  if (num(v.rr) && v.rr > 20) out.push(alert("fr_alta", "atencao", `Frequência respiratória elevada (${v.rr} irpm)`, "Referência: até 20 irpm"));
  const imc = bmi(v.weight_kg, v.height_cm);
  if (imc !== null && imc >= 30) out.push(alert("imc_alto", "atencao", `IMC ${imc} kg/m²`, "Obesidade: IMC a partir de 30"));
  const limit = gender === "M" ? 102 : gender === "F" ? 88 : null;
  if (limit !== null && num(v.waist_cm) && v.waist_cm >= limit) out.push(alert("ca_alta", "atencao", `Circunferência abdominal ${v.waist_cm} cm`, `Limite: ${limit} cm`));
  if (num(v.glucose)) {
    if (v.glucose < 70) out.push(alert("hipoglicemia", "critico", `Glicemia baixa (${v.glucose} mg/dL)`, "Tratar conforme protocolo"));
    else if (v.glucose > 180) out.push(alert("hiperglicemia", "atencao", `Glicemia elevada (${v.glucose} mg/dL)`, "Avaliar e comunicar o médico"));
  }
  return out;
}

const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** Alertas a partir das respostas qualitativas (JSON `answers` e colunas) da avaliação. */
export function answerAlerts(answers: Record<string, unknown> | null | undefined, columns?: { edema?: string | null }): ClinicalAlert[] {
  const a = answers ?? {};
  const out: ClinicalAlert[] = [];
  const queixas = list(a.queixas);
  if (queixas.includes("Dor precordial")) out.push(alert("dor_precordial", "critico", "Dor precordial referida", "Encaminhar ao médico"));
  if (queixas.includes("Paresia")) out.push(alert("paresia", "atencao", "Paresia referida", "Possível lesão de órgão-alvo: encaminhar ao médico"));
  if (a.neuro === "Confuso" || a.neuro === "Torporoso") out.push(alert("neuro_alterado", "critico", `Estado neurológico: ${String(a.neuro).toLowerCase()}`, "Encaminhar ao médico"));
  if (a.perfusao === "> 3 segundos") out.push(alert("perfusao_lenta", "atencao", "Perfusão periférica lenta (> 3 s)", "Avaliar circulação das extremidades"));
  if (a.pulso_pedioso === "Não palpável" || a.pulso_pedioso === "Diminuído") out.push(alert("pulso_pedioso", "atencao", `Pulso pedioso ${String(a.pulso_pedioso).toLowerCase()}`, "Avaliar doença arterial periférica"));
  if (columns?.edema === "+++") out.push(alert("edema_importante", "atencao", "Edema +++", "Avaliar volume e peso seco"));
  return out;
}

// ---------- pé diabético ----------

export type FootCategory = 0 | 1 | 2 | 3;
export type FootInput = { history: string[]; psp: string | null; pulses: (string | null)[] };

/** 3: úlcera/amputação prévia; 2: doença arterial (pulsos ausentes) ± PSP; 1: perda da sensibilidade protetora; 0: sem PSP nem alteração de pulso. */
export function footRiskCategory(f: FootInput): FootCategory {
  if (f.history.includes("Úlcera ou amputação prévia")) return 3;
  if (f.pulses.some((p) => p === "Não palpável")) return 2;
  if (f.psp === "Uma ou mais áreas insensíveis") return 1;
  return 0;
}

export const FOOT_FOLLOWUP: Record<FootCategory, { months: number; label: string }> = {
  0: { months: 12, label: "anual" },
  1: { months: 6, label: "a cada 3 a 6 meses" },
  2: { months: 3, label: "a cada 2 a 3 meses" },
  3: { months: 2, label: "a cada 1 a 2 meses" },
};

export function footDueDate(date: string, category: FootCategory): Date {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1 + FOOT_FOLLOWUP[category].months, d);
}

export function footAlerts(category: FootCategory, date: string, today: Date): ClinicalAlert[] {
  const out: ClinicalAlert[] = [];
  const f = FOOT_FOLLOWUP[category];
  if (category >= 1) {
    out.push(alert(`pe_risco_${category}`, category === 3 ? "critico" : "atencao", `Pé diabético: risco categoria ${category}`, `Acompanhamento ${f.label}; considerar calçado especial`));
  }
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (start > footDueDate(date, category)) out.push(alert("pe_reavaliar", "atencao", "Reavaliação do pé diabético vencida", `Categoria ${category}: acompanhamento ${f.label}`));
  return out;
}
