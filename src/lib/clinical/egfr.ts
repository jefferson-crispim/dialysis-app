export type Sex = "M" | "F";

/** CKD-EPI 2021 (sem raça). Creatinina em mg/dL, idade em anos. Resultado em mL/min/1,73 m². */
export function ckdEpi2021(creatinine: number, age: number, sex: Sex): number | null {
  if (!(creatinine > 0) || !(age > 0)) return null;
  const female = sex === "F";
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const ratio = creatinine / kappa;
  const egfr =
    142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  return Math.round(egfr * 10) / 10;
}

/** MDRD-4 (IDMS-rastreável, constante 175). */
export function mdrd(creatinine: number, age: number, sex: Sex): number | null {
  if (!(creatinine > 0) || !(age > 0)) return null;
  const egfr = 175 * Math.pow(creatinine, -1.154) * Math.pow(age, -0.203) * (sex === "F" ? 0.742 : 1);
  return Math.round(egfr * 10) / 10;
}
