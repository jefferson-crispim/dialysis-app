import * as XLSX from "xlsx";
import { SHEETS, type SheetDef, type SheetKey } from "./sheetMap";
import { normalizeText } from "./normalize";

export type ParsedRow = {
  /** linha na planilha (1-based), para mensagens de erro */
  rowNumber: number;
  patientName: string;
  values: Record<string, unknown>;
};

export type RowIssue = { rowNumber: number; message: string };

export type ParsedSheet = {
  key: SheetKey;
  label: string;
  sheetName: string;
  rows: ParsedRow[];
  issues: RowIssue[];
  /** colunas esperadas que não foram encontradas no cabeçalho */
  missingColumns: string[];
};

export type ParsedWorkbook = {
  sheets: ParsedSheet[];
  /** abas da planilha que o sistema não importa (ex.: abas calculadas) */
  ignoredSheets: string[];
};

const HEADER_SCAN_ROWS = 20;

function findHeaderRow(matrix: unknown[][], def: SheetDef): { row: number; patientCol: number } | null {
  for (let r = 0; r < Math.min(matrix.length, HEADER_SCAN_ROWS); r++) {
    const cells = (matrix[r] ?? []).map(normalizeText);
    const patientCol = cells.findIndex((c) => def.patientAliases.includes(c));
    if (patientCol >= 0) return { row: r, patientCol };
  }
  return null;
}

function mapColumns(headers: string[], def: SheetDef, patientCol: number) {
  const used = new Set<number>([patientCol]);
  const found: { field: string; index: number; convert: (v: unknown) => unknown }[] = [];
  const missing: string[] = [];
  for (const col of def.columns) {
    const aliases = col.aliases.map(normalizeText);
    let idx = headers.findIndex((h, i) => !used.has(i) && aliases.includes(h));
    if (idx < 0) idx = headers.findIndex((h, i) => !used.has(i) && h !== "" && aliases.some((a) => h.startsWith(a)));
    if (idx < 0) {
      missing.push(col.field);
      continue;
    }
    used.add(idx);
    found.push({ field: col.field, index: idx, convert: col.convert });
  }
  return { found, missing };
}

export function parseSheet(ws: XLSX.WorkSheet, sheetName: string, def: SheetDef): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false });
  const out: ParsedSheet = { key: def.key, label: def.label, sheetName, rows: [], issues: [], missingColumns: [] };
  const hdr = findHeaderRow(matrix, def);
  if (!hdr) {
    out.issues.push({ rowNumber: 0, message: `Não encontrei a coluna "${def.patientAliases[0]}" nas primeiras ${HEADER_SCAN_ROWS} linhas.` });
    return out;
  }
  const headers = (matrix[hdr.row] ?? []).map(normalizeText);
  const { found, missing } = mapColumns(headers, def, hdr.patientCol);
  out.missingColumns = missing;

  const dateField = def.requireDate ? "date" : null;
  for (let r = hdr.row + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const name = String(line[hdr.patientCol] ?? "").trim();
    if (!name) continue;
    const values: Record<string, unknown> = {};
    for (const f of found) values[f.field] = f.convert(line[f.index]);
    // linhas de aba de cabeçalho repetido ou totais
    if (normalizeText(name).startsWith("total")) continue;
    const rowNumber = r + 1;
    if (dateField && !values[dateField]) {
      out.issues.push({ rowNumber, message: `${name}: data ausente ou inválida — linha ignorada.` });
      continue;
    }
    out.rows.push({ rowNumber, patientName: name, values });
  }
  return out;
}

/** Lê o arquivo (xlsx/csv) e extrai todas as abas conhecidas. Funciona no navegador e no Node. */
export function parseWorkbook(data: ArrayBuffer | Uint8Array | Buffer, onlyKeys?: SheetKey[]): ParsedWorkbook {
  const wb = XLSX.read(data, { type: data instanceof ArrayBuffer ? "array" : "buffer", cellDates: false });
  const sheets: ParsedSheet[] = [];
  const claimed = new Set<string>();
  for (const def of SHEETS) {
    if (onlyKeys && !onlyKeys.includes(def.key)) continue;
    const name = wb.SheetNames.find((n) => def.sheetNames.includes(normalizeText(n)));
    // CSV de uma aba só: a "aba" única representa qualquer modelo — o chamador informa onlyKeys
    const fallback = wb.SheetNames.length === 1 && onlyKeys?.length === 1 ? wb.SheetNames[0] : undefined;
    const sheetName = name ?? fallback;
    if (!sheetName) continue;
    claimed.add(sheetName);
    sheets.push(parseSheet(wb.Sheets[sheetName], sheetName, def));
  }
  return { sheets, ignoredSheets: wb.SheetNames.filter((n) => !claimed.has(n)) };
}
