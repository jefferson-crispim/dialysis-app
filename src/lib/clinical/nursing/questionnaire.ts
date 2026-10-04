/**
 * Roteiro da avaliação de enfermagem (histórico + exame físico), em formato declarativo.
 * Baseado no "Roteiro para preenchimento do instrumento de SAE – Condições Crônicas" (SMS Ribeirão Preto),
 * com perguntas próprias de diálise (acesso, adesão a líquidos). O mesmo roteiro alimenta a tela e a gravação.
 */
import { footRiskCategory } from "./risk";

export type QType = "select" | "multi" | "yesno" | "number" | "text";
export type Answers = Record<string, string | string[]>;
export type Ctx = { diabetic: boolean; gender: "M" | "F" | null };

export type Question = {
  key: string;
  label: string;
  type: QType;
  options?: string[];
  unit?: string;
  hint?: string;
  /** true: grava na coluna de mesmo nome em nursing_assessments; senão vai para o JSON `answers` */
  column?: boolean;
  /** vem preenchido da consulta anterior (dado que muda pouco) */
  prefill?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  showIf?: (a: Answers, c: Ctx) => boolean;
};

export type Step = { id: string; title: string; icon: string; intro?: string; questions: Question[]; showIf?: (c: Ctx) => boolean };

const GRAUS = ["Boa", "Parcial", "Baixa"];
const PALPAVEL = ["Palpável", "Não palpável"];

export const has = (a: Answers, key: string, value: string) => {
  const v = a[key];
  return Array.isArray(v) ? v.includes(value) : v === value;
};
const usaInsulina = (a: Answers, c: Ctx) => c.diabetic && has(a, "meds_atencao", "Insulina");

export const STEPS: Step[] = [
  {
    id: "historico",
    title: "Histórico",
    icon: "history_edu",
    intro: "Pergunte ao paciente sobre os medicamentos; não transcreva a receita.",
    questions: [
      {
        key: "antecedentes",
        label: "Antecedentes pessoais",
        type: "multi",
        prefill: true,
        options: [
          "Insuficiência cardíaca",
          "Angina ou infarto prévio",
          "Hipertrofia de ventrículo esquerdo",
          "AVC ou AIT",
          "Nefropatia",
          "Retinopatia",
          "Doença vascular periférica",
          "Claudicação intermitente",
          "Aneurisma de aorta",
          "Hipertensão arterial",
          "Diabetes mellitus",
          "Dislipidemia",
          "Tabagismo",
          "Etilismo",
          "Obesidade",
          "Sedentarismo",
        ],
      },
      { key: "fam_cv", label: "Evento cardiovascular ou morte prematura em parente de 1º grau", type: "select", options: ["Sim", "Não", "Não sabe"], prefill: true, hint: "Homens < 55 anos ou mulheres < 65 anos" },
      {
        key: "queixas",
        label: "Queixas atuais",
        type: "multi",
        options: ["Tontura", "Cefaleia", "Alterações visuais", "Dor precordial", "Dispneia", "Paresia", "Parestesia", "Edema", "Lesões em membros inferiores"],
      },
      { key: "queixa_detalhe", label: "Detalhes da queixa", type: "text", hint: "Duração, fatores de melhora ou piora" },
      {
        key: "meds_atencao",
        label: "Medicamentos que exigem atenção",
        type: "multi",
        prefill: true,
        options: ["Anticoagulantes orais", "Corticosteroides", "Anti-inflamatórios não hormonais", "Antidepressivos tricíclicos ou IMAO", "Anorexígenos", "Descongestionantes nasais", "Insulina"],
      },
      { key: "adherence_meds", label: "Adesão aos medicamentos", type: "select", column: true, options: GRAUS, prefill: true },
      { key: "efeitos_colaterais", label: "Efeitos colaterais", type: "text" },
      {
        key: "insulina_autonomia",
        label: "Aplicação de insulina e glicemia capilar",
        type: "select",
        options: ["Autoaplica e monitora a glicemia", "Autoaplica, sem monitorar", "Depende de outra pessoa"],
        prefill: true,
        showIf: usaInsulina,
      },
    ],
  },
  {
    id: "habitos",
    title: "Hábitos de vida",
    icon: "self_improvement",
    questions: [
      { key: "autocuidado", label: "Autocuidado", type: "select", options: ["Independente", "Parcialmente dependente", "Dependente"], prefill: true },
      { key: "rede_apoio", label: "Apoio familiar ou rede de apoio", type: "select", options: ["Família presente", "Rede de apoio parcial", "Sem rede de apoio"], prefill: true },
      { key: "sal", label: "Consumo de sal", type: "select", options: ["Baixo", "Moderado", "Alto"], prefill: true },
      { key: "adherence_diet", label: "Adesão à dieta", type: "select", column: true, options: GRAUS, prefill: true },
      { key: "adherence_fluid", label: "Adesão à restrição de líquidos", type: "select", column: true, options: GRAUS, prefill: true },
      { key: "agua_litros", label: "Consumo de líquidos", type: "number", unit: "L/dia", min: 0, max: 10, prefill: true },
      { key: "alim_tela", label: "Come em frente à TV ou ao celular", type: "yesno", prefill: true },
      { key: "appetite", label: "Apetite", type: "select", column: true, options: ["Preservado", "Diminuído"] },
      { key: "exercicio", label: "Exercício físico", type: "select", options: ["Não pratica", "1 a 2 vezes por semana", "3 ou mais vezes por semana"], prefill: true },
      { key: "exercicio_motivo", label: "Motivo de não praticar", type: "text", showIf: (a) => has(a, "exercicio", "Não pratica") },
      { key: "urinaria", label: "Eliminação urinária", type: "select", options: ["Preservada", "Diminuída", "Anúria"], hint: "Volume, cor, odor, dor ao urinar" },
      { key: "intestinal", label: "Eliminação intestinal", type: "select", options: ["Normal", "Constipação", "Diarreia", "Sangue nas fezes"] },
      { key: "tabagismo", label: "Tabagismo", type: "select", options: ["Não fuma", "Ex-fumante", "Fuma"], prefill: true },
      { key: "cigarros_dia", label: "Cigarros por dia", type: "number", min: 0, max: 100, integer: true, showIf: (a) => has(a, "tabagismo", "Fuma") },
      { key: "alcool_drogas", label: "Álcool e outras drogas", type: "select", options: ["Não", "Ocasional", "Frequente"], prefill: true },
      { key: "vacinas", label: "Situação vacinal", type: "select", options: ["Em dia", "Atrasada", "Não sabe"], prefill: true },
      { key: "vacina_gripe", label: "Participou da campanha anual de gripe", type: "yesno", prefill: true },
      { key: "vida_sexual", label: "Vida sexual", type: "select", options: ["Sem queixas", "Queixa ou disfunção", "Prefere não responder"], prefill: true },
      { key: "sono", label: "Sono e repouso", type: "select", options: ["Adequado", "Prejudicado"] },
      { key: "knowledge_deficit", label: "Dúvidas ou erros sobre a doença e o tratamento", type: "yesno", column: true },
      { key: "anxiety", label: "Ansiedade ou sofrimento emocional", type: "yesno", column: true },
    ],
  },
  {
    id: "exame",
    title: "Exame físico",
    icon: "stethoscope",
    intro: "Sinais vitais e medidas são aferidos a cada consulta. O valor anterior aparece como referência.",
    questions: [
      { key: "bp_sys", label: "PA sistólica", type: "number", column: true, unit: "mmHg", min: 40, max: 300, integer: true, hint: "Duas medidas com 1 minuto de intervalo" },
      { key: "bp_dia", label: "PA diastólica", type: "number", column: true, unit: "mmHg", min: 20, max: 200, integer: true },
      { key: "hr", label: "Frequência cardíaca", type: "number", column: true, unit: "bpm", min: 20, max: 250, integer: true },
      { key: "rr", label: "Frequência respiratória", type: "number", column: true, unit: "irpm", min: 5, max: 80, integer: true },
      { key: "weight_kg", label: "Peso", type: "number", column: true, unit: "kg", min: 20, max: 400 },
      { key: "height_cm", label: "Altura", type: "number", column: true, unit: "cm", min: 80, max: 250, prefill: true },
      { key: "waist_cm", label: "Circunferência abdominal", type: "number", column: true, unit: "cm", min: 30, max: 250 },
      { key: "glucose", label: "Glicemia capilar", type: "number", column: true, unit: "mg/dL", min: 10, max: 1000 },
      { key: "glucose_context", label: "Glicemia: momento", type: "select", column: true, options: ["Jejum", "Pós-prandial"], showIf: (a) => !!a.glucose },
      { key: "aspecto_geral", label: "Aspecto geral", type: "select", options: ["Bom", "Regular", "Ruim"] },
      { key: "neuro", label: "Estado neurológico", type: "select", options: ["Orientado", "Confuso", "Torporoso"] },
      { key: "skin", label: "Pele", type: "select", column: true, options: ["Íntegra", "Ressecada", "Prurido", "Lesão"] },
      { key: "skin_detalhe", label: "Detalhes das lesões", type: "text", hint: "Tipo, estágio, tamanho, exsudato, bordas, cobertura" },
      { key: "lipodistrofia", label: "Lipodistrofia nos locais de insulina", type: "yesno", showIf: usaInsulina },
      { key: "unhas", label: "Unhas", type: "select", options: ["Adequadas", "Alteradas ou mal cortadas"] },
      { key: "pain_score", label: "Dor", type: "number", column: true, unit: "0 a 10", min: 0, max: 10, integer: true },
      { key: "dor_detalhe", label: "Detalhes da dor", type: "text", hint: "Local, tipo, duração, fatores de melhora ou piora" },
      { key: "acuidades", label: "Acuidades prejudicadas", type: "multi", options: ["Visual", "Auditiva", "Gustativa", "Olfativa", "Tátil"], prefill: true },
      { key: "oral", label: "Cavidade oral", type: "multi", options: ["Lesões", "Ausência de dentes que dificulta a alimentação", "Uso de prótese", "Higiene inadequada"], prefill: true },
      { key: "deformidade", label: "Deformidade física evidente", type: "yesno", prefill: true },
      { key: "ausculta_pulmonar", label: "Ausculta pulmonar", type: "multi", options: ["Murmúrios diminuídos", "Roncos", "Sibilos", "Estertores"] },
      { key: "tosse", label: "Tosse com secreção", type: "yesno" },
      { key: "edema", label: "Edema", type: "select", column: true, options: ["Ausente", "+", "++", "+++"] },
      { key: "pulso_pedioso", label: "Pulso pedioso", type: "select", options: ["Palpável", "Diminuído", "Não palpável"] },
      { key: "perfusao", label: "Perfusão periférica", type: "select", options: ["≤ 3 segundos", "> 3 segundos"], hint: "Tempo de enchimento capilar" },
      { key: "ritmo_cardiaco", label: "Ritmo cardíaco", type: "select", options: ["Regular", "Irregular"] },
      { key: "sopro", label: "Sopro cardíaco", type: "yesno" },
      { key: "abdome", label: "Abdome", type: "multi", options: ["Globoso", "Tenso", "Dor à palpação", "Massa palpável", "Ruídos hidroaéreos ausentes"] },
      { key: "access_site", label: "Sítio do acesso (fístula ou cateter)", type: "select", column: true, options: ["Sem alterações", "Hiperemia", "Secreção", "Dor local"] },
      { key: "mobility", label: "Mobilidade", type: "select", column: true, options: ["Independente", "Com auxílio", "Restrito ao leito"] },
    ],
  },
  {
    id: "pe",
    title: "Pé diabético",
    icon: "footprint",
    intro: "Rastreamento anual (Anexo 2 do roteiro). A classificação de risco é calculada ao final.",
    showIf: (c) => c.diabetic,
    questions: [
      {
        key: "foot_hist",
        label: "História do paciente",
        type: "multi",
        prefill: true,
        options: ["Duração do DM > 10 anos", "HbA1c ≥ 7%", "Úlcera ou amputação prévia", "Visão comprometida", "Claudicação", "Doença renal", "Tabagismo"],
      },
      {
        key: "foot_pele",
        label: "Avaliação da pele",
        type: "multi",
        options: ["Pele seca ou rachaduras", "Unhas encravadas ou mal cortadas", "Maceração interdigital ou micose", "Ulceração", "Calosidades", "Pele fria, cianose ou palidez", "Pele quente, eritema ou edema"],
      },
      { key: "foot_psp", label: "Monofilamento de 10 g", type: "select", options: ["Sensível em todas as áreas", "Uma ou mais áreas insensíveis"] },
      { key: "foot_def", label: "Deformidades", type: "multi", prefill: true, options: ["Artropatia de Charcot", "Dedos em garra", "Joanetes e dedos cavalgados"] },
      { key: "foot_r_ped", label: "Pé direito: pulso pedioso", type: "select", options: PALPAVEL },
      { key: "foot_r_tib", label: "Pé direito: pulso tibial posterior", type: "select", options: PALPAVEL },
      { key: "foot_l_ped", label: "Pé esquerdo: pulso pedioso", type: "select", options: PALPAVEL },
      { key: "foot_l_tib", label: "Pé esquerdo: pulso tibial posterior", type: "select", options: PALPAVEL },
    ],
  },
];

export const visibleSteps = (c: Ctx) => STEPS.filter((s) => !s.showIf || s.showIf(c));
export const visibleQuestions = (step: Step, a: Answers, c: Ctx) => step.questions.filter((q) => !q.showIf || q.showIf(a, c));

const isEmpty = (v: string | string[] | undefined) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const toNumber = (v: string) => {
  const x = Number(v.replace(",", "."));
  return Number.isFinite(x) ? x : null;
};

/** Erros de preenchimento, por pergunta visível. Lista vazia = pode salvar. */
export function validateAnswers(a: Answers, c: Ctx): string[] {
  const errors: string[] = [];
  for (const step of visibleSteps(c)) {
    for (const q of visibleQuestions(step, a, c)) {
      const v = a[q.key];
      if (q.type !== "number" || isEmpty(v)) continue;
      const n = toNumber(v as string);
      if (n === null || (q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max) || (q.integer && !Number.isInteger(n))) {
        errors.push(`${q.label}: valor inválido${q.min !== undefined && q.max !== undefined ? ` (de ${q.min} a ${q.max})` : ""}.`);
      }
    }
  }
  if (isEmpty(a.bp_sys) !== isEmpty(a.bp_dia)) errors.push("Informe a pressão arterial sistólica e a diastólica.");
  const sys = a.bp_sys && toNumber(a.bp_sys as string);
  const dia = a.bp_dia && toNumber(a.bp_dia as string);
  if (sys && dia && dia >= sys) errors.push("A pressão diastólica deve ser menor que a sistólica.");
  const footFilled = Object.keys(a).some((k) => k.startsWith("foot_") && !isEmpty(a[k]));
  if (c.diabetic && footFilled && isEmpty(a.foot_psp)) errors.push("Pé diabético: informe o resultado do monofilamento para classificar o risco.");
  return errors;
}

const isFoot = (key: string) => key.startsWith("foot_");

/** Respostas → linha de nursing_assessments (colunas + JSON). Perguntas ocultas não são gravadas. */
export function answersToRow(a: Answers, c: Ctx): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const json: Record<string, unknown> = {};
  for (const step of visibleSteps(c)) {
    if (step.id === "pe") continue;
    for (const q of visibleQuestions(step, a, c)) {
      const v = a[q.key];
      if (isEmpty(v)) continue;
      const value = q.type === "yesno" ? v === "Sim" : q.type === "number" ? toNumber(v as string) : v;
      if (q.column) row[q.key] = value;
      else json[q.key] = value;
    }
  }
  const queixas = a.queixas;
  if (Array.isArray(queixas) && queixas.length) row.dyspnea = queixas.includes("Dispneia");
  row.answers = json;
  return row;
}

/** Linha gravada → respostas (para pré-preencher e mostrar o valor anterior). */
export function rowToAnswers(row: Record<string, unknown> | null): Answers {
  const out: Answers = {};
  if (!row) return out;
  const json = (row.answers ?? {}) as Record<string, unknown>;
  for (const step of STEPS) {
    if (step.id === "pe") continue;
    for (const q of step.questions) {
      const raw = q.column ? row[q.key] : json[q.key];
      if (raw === null || raw === undefined || raw === "") continue;
      if (q.type === "yesno") out[q.key] = raw === true ? "Sim" : "Não";
      else if (q.type === "number") out[q.key] = String(raw);
      else if (q.type === "multi") out[q.key] = Array.isArray(raw) ? (raw as string[]) : [];
      else out[q.key] = String(raw);
    }
  }
  return out;
}

/** Respostas do passo "pé diabético" → linha de diabetic_foot_screenings (com a categoria de risco). */
export function footRowFromAnswers(a: Answers): Record<string, unknown> {
  const list = (k: string) => (Array.isArray(a[k]) ? (a[k] as string[]) : []);
  const one = (k: string) => (typeof a[k] === "string" && a[k] !== "" ? (a[k] as string) : null);
  const row = {
    history: list("foot_hist"),
    skin: list("foot_pele"),
    psp: one("foot_psp"),
    deformities: list("foot_def"),
    pulse_r_pedioso: one("foot_r_ped"),
    pulse_r_tibial: one("foot_r_tib"),
    pulse_l_pedioso: one("foot_l_ped"),
    pulse_l_tibial: one("foot_l_tib"),
  };
  return {
    ...row,
    risk_category: footRiskCategory({
      history: row.history,
      psp: row.psp,
      pulses: [row.pulse_r_pedioso, row.pulse_r_tibial, row.pulse_l_pedioso, row.pulse_l_tibial],
    }),
  };
}

export function footAnswersFromRow(row: Record<string, unknown> | null): Answers {
  if (!row) return {};
  const out: Answers = {};
  const set = (key: string, v: unknown) => {
    if (Array.isArray(v) && v.length) out[key] = v as string[];
    else if (typeof v === "string" && v) out[key] = v;
  };
  set("foot_hist", row.history);
  set("foot_pele", row.skin);
  set("foot_psp", row.psp);
  set("foot_def", row.deformities);
  set("foot_r_ped", row.pulse_r_pedioso);
  set("foot_r_tib", row.pulse_r_tibial);
  set("foot_l_ped", row.pulse_l_pedioso);
  set("foot_l_tib", row.pulse_l_tibial);
  return out;
}

export { isFoot };

/** Só as respostas que vêm pré-preenchidas da consulta anterior (dados que mudam pouco). */
export function prefillOnly(all: Answers): Answers {
  const keys = new Set(STEPS.flatMap((s) => s.questions.filter((q) => q.prefill).map((q) => q.key)));
  return Object.fromEntries(Object.entries(all).filter(([k]) => keys.has(k)));
}
