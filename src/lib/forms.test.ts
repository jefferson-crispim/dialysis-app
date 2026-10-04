import { describe, expect, it } from "vitest";
import { FORM_BY_SLUG } from "./forms";

const hd = { id: "1", name: "ANA", modality: "HD" as const };

describe("formulários de lançamento", () => {
  it("Kt/V de HD calcula e alerta abaixo de 1,2", () => {
    const f = FORM_BY_SLUG.ktv;
    const low = { date: "2025-01-01", pre_urea: "100", post_urea: "55", session_time_min: "180", uf_volume: "1", post_weight: "70" };
    const p = f.preview(low, hd);
    expect(Number(p.lines[0].value)).toBeLessThan(1.2);
    expect(p.alerts[0]?.code).toBe("ktv_baixo");
    expect(f.build(low, hd)?.[0].calculated_ktv).not.toBeNull();
  });
  it("Kt/V sem dados suficientes não salva", () => {
    expect(FORM_BY_SLUG.ktv.build({ date: "2025-01-01" }, hd)).toBeNull();
  });
  it("exames geram uma linha por analito e alertam", () => {
    const v = { date: "2025-01-01", K: "5,9", P: "4,0", Hb: "" };
    const rows = FORM_BY_SLUG.labs.build(v, hd)!;
    expect(rows.map((r) => r.analyte)).toEqual(["K", "P"]);
    expect(FORM_BY_SLUG.labs.preview(v, hd).alerts.map((a) => a.code)).toEqual(["hipercalemia"]);
  });
  it("BCM sugere peso seco e meta de UF", () => {
    const v = { date: "2025-01-01", overhydration: "2,4", ecw: "16", post_weight: "72" };
    const row = FORM_BY_SLUG.bcm.build(v, hd)![0];
    expect(row.dry_weight_suggested).toBe(69.6);
    expect(FORM_BY_SLUG.bcm.preview(v, hd).alerts[0]?.code).toBe("oh_critica");
  });
});
