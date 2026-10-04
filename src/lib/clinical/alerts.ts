import { ktvTarget, type Modality } from "./ktv";
import { OH_CRITICAL_LITERS, OH_CRITICAL_PCT_ECW, ohPercentOfEcw } from "./bcm";

export type Severity = "critico" | "atencao" | "info";
export type ClinicalAlert = { code: string; severity: Severity; title: string; detail: string };

/** Metas padrão (KDOQI/KDIGO); cada clínica pode ajustar. */
export const DEFAULT_TARGETS = {
  potassiumMax: 5.5,
  phosphorusMax: 5.5,
  calcium: [8.4, 10.2] as readonly [number, number],
  pth: [150, 600] as readonly [number, number],
  hemoglobin: [10, 12] as readonly [number, number],
  ferritinMin: 200,
};

export type Targets = typeof DEFAULT_TARGETS;

export function ktvAlert(ktv: number | null, modality: Modality | null | undefined): ClinicalAlert | null {
  if (ktv === null || !(ktv > 0)) return null;
  const target = ktvTarget(modality);
  if (ktv >= target) return null;
  return {
    code: "ktv_baixo",
    severity: "critico",
    title: `Kt/V abaixo da meta (${ktv.toFixed(2)})`,
    detail: `Meta mínima: ${target}`,
  };
}

export function bcmAlert(oh: number | null, ecw?: number | null): ClinicalAlert | null {
  if (oh === null) return null;
  const pct = ohPercentOfEcw(oh, ecw);
  if (oh > OH_CRITICAL_LITERS || (pct !== null && pct > OH_CRITICAL_PCT_ECW)) {
    return {
      code: "oh_critica",
      severity: "critico",
      title: `Sobreidratação crítica (${oh.toFixed(1)} L${pct !== null ? `, ${pct}% do ECW` : ""})`,
      detail: `Limite: ${OH_CRITICAL_LITERS} L ou ${OH_CRITICAL_PCT_ECW}% do ECW`,
    };
  }
  return null;
}

export function labAlert(analyte: string, value: number, t: Targets = DEFAULT_TARGETS): ClinicalAlert | null {
  const a = (code: string, severity: Severity, title: string, detail: string): ClinicalAlert => ({ code, severity, title, detail });
  switch (analyte) {
    case "K":
      return value > t.potassiumMax ? a("hipercalemia", "critico", `Hipercalemia (${value} mEq/L)`, `Meta: até ${t.potassiumMax}`) : null;
    case "P":
      return value > t.phosphorusMax ? a("hiperfosfatemia", "atencao", `Hiperfosfatemia (${value} mg/dL)`, `Meta: até ${t.phosphorusMax}`) : null;
    case "Ca":
      return value < t.calcium[0] || value > t.calcium[1]
        ? a("calcio_fora", "atencao", `Cálcio fora da meta (${value} mg/dL)`, `Meta: ${t.calcium[0]} a ${t.calcium[1]}`)
        : null;
    case "PTH":
      return value < t.pth[0] || value > t.pth[1]
        ? a("pth_fora", "atencao", `PTH fora da meta (${value} pg/mL)`, `Meta: ${t.pth[0]} a ${t.pth[1]}`)
        : null;
    case "Hb":
      return value < t.hemoglobin[0] || value > t.hemoglobin[1]
        ? a("hb_fora", "atencao", `Hemoglobina fora da meta (${value} g/dL)`, `Meta: ${t.hemoglobin[0]} a ${t.hemoglobin[1]}`)
        : null;
    case "Ferritina":
      return value < t.ferritinMin ? a("ferritina_baixa", "atencao", `Ferritina baixa (${value} ng/mL)`, `Meta: ${t.ferritinMin} ou mais`) : null;
    default:
      return null;
  }
}

/** Valor dentro da meta? Usado nos gráficos laboratoriais. */
export function labInRange(analyte: string, value: number, t: Targets = DEFAULT_TARGETS): boolean {
  return labAlert(analyte, value, t) === null;
}
