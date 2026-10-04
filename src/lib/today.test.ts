import { describe, expect, it } from "vitest";
import { buildTodayActions } from "./today";

const today = new Date("2025-06-01T12:00:00");
const base = { next_extension_date: null, last_pet_date: null };

describe("buildTodayActions", () => {
  it("prioriza críticos e detecta rotinas vencidas", () => {
    const actions = buildTodayActions({
      today,
      statuses: [
        { patient_id: "a", name: "ANA", modality: "HD", last_ktv_date: "2025-05-20", last_bcm_date: "2025-05-20", ...base },
        { patient_id: "b", name: "BIA", modality: "APD", last_ktv_date: "2024-01-01", last_bcm_date: "2025-05-01", last_pet_date: "2024-01-01", next_extension_date: "2025-05-01" },
      ],
      ktvLatest: [{ patient_id: "a", ktv: 1.0, modality: "HD" }],
      bcmLatest: [{ patient_id: "a", overhydration: 2.5, ecw: 17 }],
    });
    expect(actions[0].severity).toBe("critico");
    expect(actions.filter((x) => x.severity === "critico")).toHaveLength(2);
    const keys = actions.map((x) => x.key);
    expect(keys).toContain("ktv-due-b");
    expect(keys).toContain("pet-due-b");
    expect(keys).toContain("ext-b");
    expect(keys).not.toContain("ktv-due-a"); // HD, 12 dias
  });
});
