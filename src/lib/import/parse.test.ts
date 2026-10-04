import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook } from "./parse";
import { toISODate, toNumber } from "./normalize";

function wbBuffer(sheets: Record<string, unknown[][]>) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("normalize", () => {
  it("converte serial do Excel", () => {
    expect(toISODate(43831)).toBe("2020-01-01");
    expect(toISODate("15/03/2024")).toBe("2024-03-15");
    expect(toISODate("abc")).toBeNull();
    expect(toNumber("1,85")).toBe(1.85);
  });
});

describe("parseWorkbook", () => {
  it("acha o cabeçalho abaixo de títulos e ignora abas desconhecidas", () => {
    const buf = wbBuffer({
      KTV: [[], ["INED"], [], ["Nome do paciente", "Data", "Valor", "Mês"], ["ANA SOUZA", 43831, 2.07, "jan"], ["BIA", null, 1.5, "fev"]],
      Agenda: [["qualquer coisa"]],
    });
    const r = parseWorkbook(buf);
    expect(r.sheets).toHaveLength(1);
    const ktv = r.sheets[0];
    expect(ktv.key).toBe("ktv");
    expect(ktv.rows).toHaveLength(1);
    expect(ktv.rows[0].values).toMatchObject({ date: "2020-01-01", imported_ktv: 2.07 });
    expect(ktv.issues).toHaveLength(1); // BIA sem data
    expect(r.ignoredSheets).toEqual(["Agenda"]);
  });
});
