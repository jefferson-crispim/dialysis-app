import { describe, expect, it } from "vitest";
import { suggestDiagnoses, type AssessmentLite, type SuggestInput } from "./suggest";
import { CATALOG } from "./catalog";

const today = new Date("2025-06-01T12:00:00");

const empty: SuggestInput = {
  today,
  patient: { modality: "HD", diabetic: false },
  bcm: null,
  ktv: null,
  labs: [],
  infections: [],
  assessment: null,
  activeCatalogIds: [],
};

const assessment = (over: Partial<AssessmentLite> = {}): AssessmentLite => ({
  id: "a1",
  date: "2025-05-30",
  edema: null,
  dyspnea: null,
  pain_score: null,
  access_site: null,
  skin: null,
  appetite: null,
  anxiety: null,
  adherence_fluid: null,
  adherence_diet: null,
  adherence_meds: null,
  knowledge_deficit: null,
  mobility: null,
  ...over,
});

const ids = (input: SuggestInput) => suggestDiagnoses(input).map((s) => s.catalogId);

describe("suggestDiagnoses", () => {
  it("não inventa nada sem dados", () => {
    expect(suggestDiagnoses(empty)).toEqual([]);
  });

  it("sugere volume excessivo com evidência e severidade crítica para OH crítica", () => {
    const [s] = suggestDiagnoses({ ...empty, bcm: { date: "2025-05-20", overhydration: 3.2, ecw: 18 } });
    expect(s.catalogId).toBe("volume_excesso");
    expect(s.severity).toBe("critico");
    expect(s.evidence[0]).toContain("20/05/2025");
    expect(s.evidence[0]).toContain("3.2 L");
  });

  it("sobreidratação moderada é atenção; hipohidratado vira volume deficiente", () => {
    expect(suggestDiagnoses({ ...empty, bcm: { date: "2025-05-20", overhydration: 1.5, ecw: 20 } })[0].severity).toBe("atencao");
    expect(ids({ ...empty, bcm: { date: "2025-05-20", overhydration: -1.5, ecw: 20 } })).toEqual(["volume_deficiente"]);
  });

  it("edema ++ sugere volume excessivo e acrescenta a dispneia como evidência", () => {
    const [s] = suggestDiagnoses({ ...empty, assessment: assessment({ edema: "++", dyspnea: true }) });
    expect(s.catalogId).toBe("volume_excesso");
    expect(s.evidence).toHaveLength(2);
    expect(s.assessmentId).toBe("a1");
  });

  it("dispneia sozinha não sugere nada; edema + não sugere", () => {
    expect(ids({ ...empty, assessment: assessment({ dyspnea: true, edema: "+" }) })).toEqual([]);
  });

  it("ignora BCM, exames e avaliação antigos", () => {
    expect(
      ids({
        ...empty,
        bcm: { date: "2024-01-01", overhydration: 3, ecw: 18 },
        labs: [{ date: "2024-01-01", analyte: "K", value: 6.5 }],
        assessment: assessment({ date: "2025-01-01", edema: "+++" }),
      }),
    ).toEqual([]);
  });

  it("infecção de acesso recente sugere risco de infecção; peritonite só em diálise peritoneal", () => {
    const infections = [{ date: "2025-05-10", infected_area: "ACESSO" }];
    expect(ids({ ...empty, infections })).toEqual(["risco_infeccao_acesso"]);
    const perit = [{ date: "2025-05-10", infected_area: "PERITÔNEO" }];
    expect(ids({ ...empty, patient: { modality: "CAPD", diabetic: false }, infections: perit })).toEqual(["risco_peritonite"]);
    expect(ids({ ...empty, infections: perit })).toEqual([]);
  });

  it("secreção no sítio do acesso é crítica", () => {
    const [s] = suggestDiagnoses({ ...empty, assessment: assessment({ access_site: "Secreção" }) });
    expect(s).toMatchObject({ catalogId: "risco_infeccao_acesso", severity: "critico" });
  });

  it("usa o valor mais recente de cada exame", () => {
    const labs = [
      { date: "2025-04-01", analyte: "K", value: 6.5 },
      { date: "2025-05-20", analyte: "K", value: 4.8 },
    ];
    expect(ids({ ...empty, labs })).toEqual([]);
    const [s] = suggestDiagnoses({ ...empty, labs: [{ date: "2025-05-20", analyte: "K", value: 6.5 }] });
    expect(s).toMatchObject({ catalogId: "risco_eletrolitos", severity: "critico" });
  });

  it("hemoglobina baixa sugere fadiga; alta não", () => {
    expect(ids({ ...empty, labs: [{ date: "2025-05-20", analyte: "Hb", value: 8.5 }] })).toEqual(["fadiga"]);
    expect(ids({ ...empty, labs: [{ date: "2025-05-20", analyte: "Hb", value: 13 }] })).toEqual([]);
  });

  it("Kt/V abaixo da meta sugere dose de diálise insuficiente", () => {
    expect(ids({ ...empty, ktv: { date: "2025-05-20", value: 1.0 } })).toEqual(["dialise_insuficiente"]);
    expect(ids({ ...empty, ktv: { date: "2025-05-20", value: 1.4 } })).toEqual([]);
  });

  it("diabético recebe sugestão informativa", () => {
    expect(suggestDiagnoses({ ...empty, patient: { modality: "HD", diabetic: true } })).toMatchObject([{ catalogId: "risco_glicemia", severity: "info" }]);
  });

  it("traduz a avaliação estruturada em sugestões", () => {
    const found = ids({
      ...empty,
      assessment: assessment({ pain_score: 5, skin: "Prurido", appetite: "Diminuído", mobility: "Com auxílio", anxiety: true, knowledge_deficit: true }),
    });
    expect(found).toEqual(
      expect.arrayContaining(["dor_aguda", "integridade_pele", "nutricao_desequilibrada", "mobilidade_prejudicada", "ansiedade", "conhecimento_deficiente"]),
    );
    expect(ids({ ...empty, assessment: assessment({ pain_score: 2, skin: "Íntegra", mobility: "Independente" }) })).toEqual([]);
  });

  it("adesão: uma baixa ou duas parciais; uma parcial não basta", () => {
    expect(ids({ ...empty, assessment: assessment({ adherence_diet: "Baixa" }) })).toEqual(["adesao_regime"]);
    expect(ids({ ...empty, assessment: assessment({ adherence_diet: "Parcial", adherence_fluid: "Parcial" }) })).toEqual(["adesao_regime"]);
    expect(ids({ ...empty, assessment: assessment({ adherence_diet: "Parcial" }) })).toEqual([]);
  });

  it("não repete diagnóstico já ativo", () => {
    const input = { ...empty, bcm: { date: "2025-05-20", overhydration: 3.2, ecw: 18 } };
    expect(ids({ ...input, activeCatalogIds: ["volume_excesso"] })).toEqual([]);
  });

  it("ordena por severidade", () => {
    const found = suggestDiagnoses({
      ...empty,
      patient: { modality: "HD", diabetic: true },
      labs: [{ date: "2025-05-20", analyte: "K", value: 6.5 }],
      assessment: assessment({ anxiety: true }),
    });
    expect(found.map((s) => s.severity)).toEqual(["critico", "atencao", "info"]);
  });
});

describe("CATALOG", () => {
  it("tem ids únicos e todo item sugerido existe no catálogo", () => {
    const all = CATALOG.map((c) => c.id);
    expect(new Set(all).size).toBe(all.length);
    const everything = suggestDiagnoses({
      today,
      patient: { modality: "CAPD", diabetic: true },
      bcm: { date: "2025-05-20", overhydration: 3, ecw: 18 },
      ktv: { date: "2025-05-20", value: 1 },
      labs: [
        { date: "2025-05-20", analyte: "K", value: 6.5 },
        { date: "2025-05-20", analyte: "Hb", value: 8 },
      ],
      infections: [
        { date: "2025-05-10", infected_area: "PERITÔNEO" },
        { date: "2025-05-10", infected_area: "TÚNEL" },
      ],
      assessment: assessment({ pain_score: 8, skin: "Lesão", appetite: "Diminuído", mobility: "Restrito ao leito", anxiety: true, knowledge_deficit: true, adherence_diet: "Baixa" }),
      activeCatalogIds: [],
    });
    for (const s of everything) expect(all).toContain(s.catalogId);
  });
});
