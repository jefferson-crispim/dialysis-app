/** minúsculas, sem acento, espaços colapsados — usado para casar nomes de abas, colunas e pacientes. */
export function normalizeText(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

/** Aceita serial do Excel, Date, "dd/mm/aaaa" ou "aaaa-mm-dd". Retorna "aaaa-mm-dd" ou null. */
export function toISODate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    if (!(v > 366 && v < 80000)) return null; // 1901–2118: descarta lixo
    return new Date(EXCEL_EPOCH_UTC + Math.floor(v) * 86400000).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

export function toBool(v: unknown): boolean | null {
  const s = normalizeText(v);
  if (["sim", "s", "true", "1", "x"].includes(s)) return true;
  if (["nao", "n", "false", "0"].includes(s)) return false;
  return null;
}

export function toText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export function toGender(v: unknown): "M" | "F" | null {
  const s = normalizeText(v);
  if (s.startsWith("m")) return "M";
  if (s.startsWith("f")) return "F";
  return null;
}

export function toModality(v: unknown): "APD" | "CAPD" | "HD" | null {
  const s = normalizeText(v).toUpperCase();
  if (s === "APD" || s === "CAPD" || s === "HD") return s;
  if (s.includes("HEMODIALISE")) return "HD";
  return null;
}

export function toPatientStatus(v: unknown): "ATIVO" | "ENCERRADO" | null {
  const s = normalizeText(v).toUpperCase();
  if (s === "ATIVO") return "ATIVO";
  if (s === "ENCERRADO") return "ENCERRADO";
  return null;
}
