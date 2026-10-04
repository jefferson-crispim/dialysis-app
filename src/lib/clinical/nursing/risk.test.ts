import { describe, expect, it } from "vitest";
import { answerAlerts, bmi, footAlerts, footDueDate, footRiskCategory, vitalsAlerts } from "./risk";

const codes = (a: { code: string }[]) => a.map((x) => x.code);

describe("bmi", () => {
  it("calcula com uma casa decimal e rejeita dados faltantes", () => {
    expect(bmi(90, 170)).toBe(31.1);
    expect(bmi(null, 170)).toBeNull();
    expect(bmi(70, 0)).toBeNull();
  });
});

describe("vitalsAlerts", () => {
  it("classifica a pressão arterial", () => {
    expect(vitalsAlerts({ bp_sys: 120, bp_dia: 80 }, "M")).toEqual([]);
    expect(vitalsAlerts({ bp_sys: 150, bp_dia: 85 }, "M")[0]).toMatchObject({ code: "pa_alta", severity: "atencao" });
    expect(vitalsAlerts({ bp_sys: 130, bp_dia: 95 }, "M")[0].code).toBe("pa_alta");
    expect(vitalsAlerts({ bp_sys: 185, bp_dia: 100 }, "M")[0]).toMatchObject({ code: "pa_muito_alta", severity: "critico" });
    expect(vitalsAlerts({ bp_sys: 85, bp_dia: 55 }, "M")[0].code).toBe("pa_baixa");
  });

  it("não alerta com pressão incompleta", () => {
    expect(vitalsAlerts({ bp_sys: 200, bp_dia: null }, "M")).toEqual([]);
  });

  it("avalia FC, FR e glicemia", () => {
    expect(codes(vitalsAlerts({ hr: 110, rr: 24 }, null))).toEqual(["fc_alterada", "fr_alta"]);
    expect(codes(vitalsAlerts({ hr: 45 }, null))).toEqual(["fc_alterada"]);
    expect(vitalsAlerts({ glucose: 60 }, null)[0]).toMatchObject({ code: "hipoglicemia", severity: "critico" });
    expect(vitalsAlerts({ glucose: 250 }, null)[0].code).toBe("hiperglicemia");
    expect(vitalsAlerts({ glucose: 100 }, null)).toEqual([]);
  });

  it("usa os limites do roteiro para IMC e circunferência abdominal por sexo", () => {
    expect(codes(vitalsAlerts({ weight_kg: 90, height_cm: 170 }, "M"))).toEqual(["imc_alto"]);
    expect(codes(vitalsAlerts({ waist_cm: 95 }, "M"))).toEqual([]);
    expect(codes(vitalsAlerts({ waist_cm: 95 }, "F"))).toEqual(["ca_alta"]);
    expect(codes(vitalsAlerts({ waist_cm: 102 }, "M"))).toEqual(["ca_alta"]);
    expect(codes(vitalsAlerts({ waist_cm: 120 }, null))).toEqual([]);
  });
});

describe("answerAlerts", () => {
  it("destaca sinais de lesão de órgão-alvo e alteração neurológica", () => {
    const out = answerAlerts({ queixas: ["Dor precordial", "Paresia"], neuro: "Confuso", perfusao: "> 3 segundos", pulso_pedioso: "Não palpável" }, { edema: "+++" });
    expect(codes(out)).toEqual(["dor_precordial", "paresia", "neuro_alterado", "perfusao_lenta", "pulso_pedioso", "edema_importante"]);
    expect(out[0].severity).toBe("critico");
  });
  it("sem alterações não gera alerta", () => {
    expect(answerAlerts({ queixas: ["Cefaleia"], neuro: "Orientado", perfusao: "≤ 3 segundos", pulso_pedioso: "Palpável" })).toEqual([]);
    expect(answerAlerts(null)).toEqual([]);
  });
});

describe("pé diabético", () => {
  const ok = ["Palpável", "Palpável", "Palpável", "Palpável"];
  it("classifica as categorias do Anexo 2", () => {
    expect(footRiskCategory({ history: [], psp: "Sensível em todas as áreas", pulses: ok })).toBe(0);
    expect(footRiskCategory({ history: [], psp: "Uma ou mais áreas insensíveis", pulses: ok })).toBe(1);
    expect(footRiskCategory({ history: [], psp: "Sensível em todas as áreas", pulses: ["Palpável", "Não palpável", "Palpável", "Palpável"] })).toBe(2);
    expect(footRiskCategory({ history: [], psp: "Uma ou mais áreas insensíveis", pulses: ["Não palpável", null, null, null] })).toBe(2);
    expect(footRiskCategory({ history: ["Úlcera ou amputação prévia"], psp: "Sensível em todas as áreas", pulses: ok })).toBe(3);
  });

  it("calcula a data de reavaliação pela categoria", () => {
    expect(footDueDate("2025-01-31", 0).getFullYear()).toBe(2026);
    expect(footDueDate("2025-01-15", 3).getMonth()).toBe(2); // março
  });

  it("alerta o risco e a reavaliação vencida", () => {
    const today = new Date("2025-06-01T12:00:00");
    expect(footAlerts(0, "2025-05-01", today)).toEqual([]);
    expect(codes(footAlerts(0, "2024-01-01", today))).toEqual(["pe_reavaliar"]);
    expect(footAlerts(3, "2025-05-20", today)[0]).toMatchObject({ code: "pe_risco_3", severity: "critico" });
    expect(codes(footAlerts(1, "2024-10-01", today))).toEqual(["pe_risco_1", "pe_reavaliar"]);
  });
});
