import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { parseWorkbook } from "./parse";

// Teste de integração com a planilha real (fora do git). Pula quando MOVIMENTO_DP_XLSX não está definido.
const file = process.env.MOVIMENTO_DP_XLSX;

describe.skipIf(!file || !fs.existsSync(file))("planilha real Movimento DP", () => {
  it("importa as abas conhecidas com contagens plausíveis", () => {
    const r = parseWorkbook(fs.readFileSync(file!));
    const by = Object.fromEntries(r.sheets.map((s) => [s.key, s]));
    const summary = Object.fromEntries(
      r.sheets.map((s) => [s.key, { rows: s.rows.length, issues: s.issues.length, missing: s.missingColumns }]),
    );
    console.log(JSON.stringify(summary, null, 1));
    expect(by.pacientes.rows.length).toBeGreaterThanOrEqual(72);
    expect(by.ktv.rows.length).toBeGreaterThanOrEqual(60);
    expect(by.hospitalizacoes.rows.length).toBeGreaterThanOrEqual(50);
    expect(by.infeccoes.rows.length).toBeGreaterThanOrEqual(30);
  });
});
