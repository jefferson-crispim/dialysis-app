import { describe, expect, it } from "vitest";
import { answersToRow, footAnswersFromRow, footRowFromAnswers, rowToAnswers, STEPS, validateAnswers, visibleSteps, type Ctx } from "./questionnaire";

const dm: Ctx = { diabetic: true, gender: "M" };
const noDm: Ctx = { diabetic: false, gender: "F" };

describe("roteiro", () => {
  it("tem chaves únicas e todo select/multi tem opções", () => {
    const qs = STEPS.flatMap((s) => s.questions);
    expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
    for (const q of qs) if (q.type === "select" || q.type === "multi") expect(q.options?.length).toBeGreaterThan(1);
  });

  it("mostra o passo do pé diabético só para diabéticos", () => {
    expect(visibleSteps(dm).map((s) => s.id)).toContain("pe");
    expect(visibleSteps(noDm).map((s) => s.id)).not.toContain("pe");
  });
});

describe("answersToRow", () => {
  it("separa colunas e JSON, converte tipos e deriva dispneia", () => {
    const row = answersToRow(
      { bp_sys: "130", bp_dia: "85", weight_kg: "72,5", anxiety: "Sim", knowledge_deficit: "Não", queixas: ["Dispneia", "Tontura"], antecedentes: ["Hipertensão arterial"], sono: "Prejudicado", edema: "++" },
      noDm,
    );
    expect(row).toMatchObject({ bp_sys: 130, bp_dia: 85, weight_kg: 72.5, anxiety: true, knowledge_deficit: false, dyspnea: true, edema: "++" });
    expect(row.answers).toEqual({ queixas: ["Dispneia", "Tontura"], antecedentes: ["Hipertensão arterial"], sono: "Prejudicado" });
  });

  it("não grava perguntas ocultas nem respostas vazias", () => {
    const row = answersToRow({ exercicio: "3 ou mais vezes por semana", exercicio_motivo: "sem tempo", glucose_context: "Jejum", insulina_autonomia: "Autoaplica e monitora a glicemia", queixa_detalhe: "" }, noDm);
    expect(row.answers).toEqual({ exercicio: "3 ou mais vezes por semana" });
    expect(row.glucose_context).toBeUndefined();
  });

  it("queixas sem dispneia gravam dispneia = falso", () => {
    expect(answersToRow({ queixas: ["Cefaleia"] }, noDm).dyspnea).toBe(false);
    expect(answersToRow({}, noDm).dyspnea).toBeUndefined();
  });

  it("não leva as respostas do pé diabético para a avaliação", () => {
    const row = answersToRow({ foot_psp: "Sensível em todas as áreas" }, dm);
    expect(JSON.stringify(row)).not.toContain("foot_");
  });
});

describe("rowToAnswers", () => {
  it("ida e volta preserva as respostas", () => {
    const a = { bp_sys: "130", anxiety: "Sim", edema: "+", antecedentes: ["Dislipidemia"], sono: "Adequado", agua_litros: "1.5" };
    expect(rowToAnswers(answersToRow(a, noDm))).toMatchObject(a);
  });
  it("lida com ausência de consulta anterior e com registros do formulário antigo (sem JSON)", () => {
    expect(rowToAnswers(null)).toEqual({});
    expect(rowToAnswers({ edema: "++", dyspnea: true, answers: null, adherence_diet: "Baixa" })).toEqual({ edema: "++", adherence_diet: "Baixa" });
  });
});

describe("validateAnswers", () => {
  it("aceita um preenchimento correto", () => {
    expect(validateAnswers({ bp_sys: "120", bp_dia: "80", hr: "70", pain_score: "3" }, noDm)).toEqual([]);
  });
  it("rejeita valores fora do intervalo e pressão incompleta ou invertida", () => {
    expect(validateAnswers({ hr: "500" }, noDm)).toHaveLength(1);
    expect(validateAnswers({ pain_score: "2,5" }, noDm)).toHaveLength(1);
    expect(validateAnswers({ weight_kg: "abc" }, noDm)).toHaveLength(1);
    expect(validateAnswers({ bp_sys: "120" }, noDm)).toHaveLength(1);
    expect(validateAnswers({ bp_sys: "80", bp_dia: "120" }, noDm)).toHaveLength(1);
  });
  it("exige o monofilamento quando o pé diabético foi preenchido", () => {
    expect(validateAnswers({ foot_hist: ["Tabagismo"] }, dm)).toHaveLength(1);
    expect(validateAnswers({ foot_hist: ["Tabagismo"], foot_psp: "Sensível em todas as áreas" }, dm)).toEqual([]);
    expect(validateAnswers({ foot_hist: ["Tabagismo"] }, noDm)).toEqual([]);
  });
});

describe("pé diabético: linha e ida e volta", () => {
  it("calcula a categoria e devolve as mesmas respostas", () => {
    const a = {
      foot_hist: ["Doença renal"],
      foot_pele: ["Calosidades"],
      foot_psp: "Uma ou mais áreas insensíveis",
      foot_def: ["Dedos em garra"],
      foot_r_ped: "Palpável",
      foot_r_tib: "Palpável",
      foot_l_ped: "Palpável",
      foot_l_tib: "Palpável",
    };
    const row = footRowFromAnswers(a);
    expect(row).toMatchObject({ risk_category: 1, psp: "Uma ou mais áreas insensíveis", pulse_l_tibial: "Palpável" });
    expect(footAnswersFromRow(row)).toEqual(a);
  });
});
