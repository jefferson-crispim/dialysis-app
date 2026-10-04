import { describe, expect, it } from "vitest";
import { buildTemplate } from "./templates";
import { parseWorkbook } from "./parse";
import * as XLSX from "xlsx";
import { SHEETS } from "./sheetMap";

describe("planilha modelo", () => {
  it("gera todas as abas e o leitor reconhece os cabeçalhos sem colunas faltando", () => {
    const buf = buildTemplate("all");
    const parsed = parseWorkbook(buf);
    expect(parsed.sheets.map((s) => s.key).sort()).toEqual(SHEETS.map((s) => s.key).sort());
    for (const s of parsed.sheets) expect(s.missingColumns, s.key).toEqual([]);
    expect(parsed.ignoredSheets).toEqual(["Instruções"]);
  });

  it("aba única pedida", () => {
    const wb = XLSX.read(buildTemplate(["ktv"]), { type: "array" });
    expect(wb.SheetNames).toEqual(["Ktv", "Instruções"]);
  });
});
