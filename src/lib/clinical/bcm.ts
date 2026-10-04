export type HydrationStatus = "hipohidratado" | "normal" | "sobreidratado" | "critico";

export const OH_CRITICAL_LITERS = 2.0;
export const OH_CRITICAL_PCT_ECW = 15;

export function ohPercentOfEcw(oh: number, ecw?: number | null): number | null {
  if (!ecw || ecw <= 0) return null;
  return Math.round((oh / ecw) * 1000) / 10;
}

export function hydrationStatus(oh: number, ecw?: number | null): HydrationStatus {
  const pct = ohPercentOfEcw(oh, ecw);
  if (oh > OH_CRITICAL_LITERS || (pct !== null && pct > OH_CRITICAL_PCT_ECW)) return "critico";
  if (oh > 1.1) return "sobreidratado";
  if (oh < -1.1) return "hipohidratado";
  return "normal";
}

/** Peso seco estimado: peso pós-diálise menos o excesso de volume medido pelo BCM. */
export function suggestedDryWeight(postWeightKg: number, oh: number): number | null {
  if (!(postWeightKg > 0)) return null;
  return Math.round((postWeightKg - oh) * 10) / 10;
}

/** Meta de ultrafiltração da sessão = excesso de volume + ganho interdialítico esperado. */
export function ultrafiltrationTarget(oh: number, expectedInterdialyticGainKg = 0): number {
  return Math.round(Math.max(0, oh + expectedInterdialyticGainKg) * 100) / 100;
}
