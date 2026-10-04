export type KtvInput = {
  preUrea: number; // mg/dL
  postUrea: number; // mg/dL
  sessionTimeMin: number;
  ufLiters: number;
  postWeightKg: number;
};

export type Modality = "HD" | "APD" | "CAPD";

export const HD_KTV_TARGET = 1.2;
/** Meta semanal de Kt/V total em diálise peritoneal (renal + peritoneal). */
export const DP_WEEKLY_KTV_TARGET = 1.7;

/**
 * spKt/V de Daugirdas II (hemodiálise):
 * -ln(R - 0,008 t) + (4 - 3,5 R) * UF / W, com t em horas.
 * Retorna null quando as entradas são inválidas.
 */
export function daugirdasKtv(i: KtvInput): number | null {
  const { preUrea, postUrea, sessionTimeMin, ufLiters, postWeightKg } = i;
  if (![preUrea, postUrea, sessionTimeMin, postWeightKg].every((n) => Number.isFinite(n) && n > 0)) return null;
  if (!Number.isFinite(ufLiters) || ufLiters < 0) return null;
  const r = postUrea / preUrea;
  const t = sessionTimeMin / 60;
  const arg = r - 0.008 * t;
  if (arg <= 0) return null;
  const ktv = -Math.log(arg) + (4 - 3.5 * r) * (ufLiters / postWeightKg);
  return Math.round(ktv * 100) / 100;
}

/** Percentual de redução da ureia (URR). */
export function urr(preUrea: number, postUrea: number): number | null {
  if (!(preUrea > 0) || !(postUrea >= 0)) return null;
  return Math.round((1 - postUrea / preUrea) * 1000) / 10;
}

/** Na planilha de DP, valor 0 significa "não medido". */
export function normalizeImportedKtv(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function ktvTarget(modality: Modality | null | undefined): number {
  return modality === "APD" || modality === "CAPD" ? DP_WEEKLY_KTV_TARGET : HD_KTV_TARGET;
}
