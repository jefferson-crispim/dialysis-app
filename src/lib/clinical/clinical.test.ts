import { describe, expect, it } from "vitest";
import { daugirdasKtv, normalizeImportedKtv, urr } from "./ktv";
import { ckdEpi2021, mdrd } from "./egfr";
import { hydrationStatus, ohPercentOfEcw, suggestedDryWeight, ultrafiltrationTarget } from "./bcm";
import { bcmAlert, ktvAlert, labAlert } from "./alerts";

describe("Kt/V Daugirdas II", () => {
  it("calcula caso de referência (R=0,30; 4h; UF 2,5 L; 70 kg)", () => {
    // -ln(0,30-0,032)=1,3168 ; (4-1,05)*2,5/70=0,1054 => 1,42
    expect(daugirdasKtv({ preUrea: 100, postUrea: 30, sessionTimeMin: 240, ufLiters: 2.5, postWeightKg: 70 })).toBe(1.42);
  });
  it("rejeita entradas inválidas", () => {
    expect(daugirdasKtv({ preUrea: 0, postUrea: 30, sessionTimeMin: 240, ufLiters: 2, postWeightKg: 70 })).toBeNull();
    expect(daugirdasKtv({ preUrea: 100, postUrea: 1, sessionTimeMin: 600, ufLiters: 2, postWeightKg: 70 })).toBeNull();
  });
  it("URR e valor importado 0", () => {
    expect(urr(100, 30)).toBe(70);
    expect(normalizeImportedKtv(0)).toBeNull();
    expect(normalizeImportedKtv(2.07)).toBe(2.07);
  });
});

describe("TFG estimada", () => {
  it("CKD-EPI 2021: homem 50 anos, Cr 1,0", () => {
    expect(ckdEpi2021(1.0, 50, "M")).toBeCloseTo(92, 0);
  });
  it("CKD-EPI 2021: mulher 60 anos, Cr 1,2", () => {
    expect(ckdEpi2021(1.2, 60, "F")).toBeCloseTo(51.8, 1);
  });
  it("MDRD: homem 50 anos, Cr 1,0", () => {
    expect(mdrd(1.0, 50, "M")).toBeCloseTo(79.1, 1);
  });
});

describe("BCM", () => {
  it("classifica hidratação", () => {
    expect(hydrationStatus(0.3, 17)).toBe("normal");
    expect(hydrationStatus(1.6, 17)).toBe("sobreidratado");
    expect(hydrationStatus(2.5, 17)).toBe("critico");
    expect(hydrationStatus(1.8, 11)).toBe("critico"); // 16,4% do ECW
    expect(hydrationStatus(-2, 17)).toBe("hipohidratado");
  });
  it("peso seco e meta de UF", () => {
    expect(ohPercentOfEcw(2.4, 16)).toBe(15);
    expect(suggestedDryWeight(72, 2.4)).toBe(69.6);
    expect(ultrafiltrationTarget(2.4, 1.5)).toBe(3.9);
  });
});

describe("alertas", () => {
  it("Kt/V < 1,2 em HD é crítico; DP usa meta semanal", () => {
    expect(ktvAlert(1.1, "HD")?.severity).toBe("critico");
    expect(ktvAlert(1.2, "HD")).toBeNull();
    expect(ktvAlert(1.5, "APD")).not.toBeNull();
    expect(ktvAlert(2.07, "APD")).toBeNull();
  });
  it("laboratório e BCM", () => {
    expect(labAlert("K", 5.6)?.code).toBe("hipercalemia");
    expect(labAlert("K", 5.5)).toBeNull();
    expect(labAlert("P", 5.6)?.code).toBe("hiperfosfatemia");
    expect(bcmAlert(2.1, 17)?.code).toBe("oh_critica");
    expect(bcmAlert(1.0, 17)).toBeNull();
  });
});
