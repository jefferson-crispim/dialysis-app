import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedSheet, ParsedWorkbook } from "./parse";
import { SHEET_BY_KEY } from "./sheetMap";
import { normalizeText } from "./normalize";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "nefro", any>;

export type SheetResult = {
  key: string;
  label: string;
  inserted: number;
  duplicates: number;
  unmatched: string[]; // pacientes que não existem no cadastro
  issues: string[];
};

export type ImportResult = { batchId: string; sheets: SheetResult[]; ignoredSheets: string[] };

const CHUNK = 400;

function chunks<T>(arr: T[], n = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function clean(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined));
}

type PatientRow = { id: string; name: string; birth_date: string | null; status: string; admission_date: string | null };

async function loadPatients(db: Db, orgId: string): Promise<PatientRow[]> {
  const rows: PatientRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("patients")
      .select("id,name,birth_date,status,admission_date")
      .eq("organization_id", orgId)
      .range(from, from + 999);
    if (error) throw new Error(`Falha ao ler pacientes: ${error.message}`);
    rows.push(...(data as PatientRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** Paciente que aparece várias vezes (readmissões): fica o registro mais recente. */
function dedupePatients(sheet: ParsedSheet) {
  const best = new Map<string, ParsedSheet["rows"][number]>();
  for (const row of sheet.rows) {
    const key = `${normalizeText(row.patientName)}|${row.values.birth_date ?? ""}`;
    const prev = best.get(key);
    const a = String(row.values.admission_date ?? "");
    const b = String(prev?.values.admission_date ?? "");
    if (!prev || a > b) best.set(key, row);
  }
  return [...best.values()];
}

async function importPatients(db: Db, orgId: string, batchId: string, sheet: ParsedSheet): Promise<SheetResult> {
  const res: SheetResult = { key: sheet.key, label: sheet.label, inserted: 0, duplicates: 0, unmatched: [], issues: sheet.issues.map((i) => i.message) };
  const unique = dedupePatients(sheet);
  res.duplicates = sheet.rows.length - unique.length; // readmissões mescladas
  const existing = await loadPatients(db, orgId);
  const existingKey = new Map(existing.map((p) => [`${normalizeText(p.name)}|${p.birth_date ?? ""}`, p.id]));

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; values: Record<string, unknown> }[] = [];
  for (const row of unique) {
    const key = `${normalizeText(row.patientName)}|${row.values.birth_date ?? ""}`;
    const id = existingKey.get(key);
    if (id) toUpdate.push({ id, values: clean(row.values) });
    else toInsert.push({ ...clean(row.values), name: row.patientName, organization_id: orgId, import_batch_id: batchId });
  }
  for (const part of chunks(toInsert)) {
    const { error } = await db.from("patients").insert(part);
    if (error) throw new Error(`Falha ao inserir pacientes: ${error.message}`);
    res.inserted += part.length;
  }
  for (const part of chunks(toUpdate, 25)) {
    await Promise.all(
      part.map(async (u) => {
        if (Object.keys(u.values).length === 0) return;
        const { error } = await db.from("patients").update(u.values).eq("id", u.id);
        if (error) res.issues.push(`Falha ao atualizar paciente: ${error.message}`);
      }),
    );
  }
  return res;
}

function recordKey(sheetKey: string, patientId: string, v: Record<string, unknown>) {
  const extra = sheetKey === "labs" ? v.analyte : sheetKey === "treinamentos" ? v.process : sheetKey === "cateter" ? v.movement : "";
  return `${patientId}|${v.date}|${extra ?? ""}`;
}

async function existingKeys(db: Db, orgId: string, table: string, sheetKey: string): Promise<Set<string>> {
  const extraCol = sheetKey === "labs" ? ",analyte" : sheetKey === "treinamentos" ? ",process" : sheetKey === "cateter" ? ",movement" : "";
  const keys = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(`patient_id,date${extraCol}`).eq("organization_id", orgId).range(from, from + 999);
    if (error) throw new Error(`Falha ao ler ${table}: ${error.message}`);
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
      const extra = r.analyte ?? r.process ?? r.movement ?? "";
      keys.add(`${r.patient_id}|${r.date}|${extra}`);
    }
    if (!data || data.length < 1000) break;
  }
  return keys;
}

async function importLongitudinal(
  db: Db,
  orgId: string,
  batchId: string,
  sheet: ParsedSheet,
  patientIdByName: Map<string, string>,
): Promise<SheetResult> {
  const def = SHEET_BY_KEY[sheet.key];
  const res: SheetResult = { key: sheet.key, label: sheet.label, inserted: 0, duplicates: 0, unmatched: [], issues: sheet.issues.map((i) => i.message) };
  const seen = await existingKeys(db, orgId, def.table, sheet.key);
  const unmatched = new Set<string>();
  const payload: Record<string, unknown>[] = [];

  for (const row of sheet.rows) {
    const values = clean(row.values);
    if (sheet.key === "ktv" && !(Number(values.imported_ktv) > 0) && !values.pre_urea) {
      res.issues.push(`${row.patientName}: Kt/V sem valor (0 = não medido) — linha ignorada.`);
      continue;
    }
    if (sheet.key === "labs" && (values.analyte === undefined || values.value === undefined)) {
      res.issues.push(`${row.patientName}: exame ou valor inválido — linha ignorada.`);
      continue;
    }
    const patientId = patientIdByName.get(normalizeText(row.patientName));
    if (!patientId) {
      unmatched.add(row.patientName);
      continue;
    }
    const key = recordKey(sheet.key, patientId, values);
    if (seen.has(key)) {
      res.duplicates++;
      continue;
    }
    seen.add(key);
    payload.push({ ...values, organization_id: orgId, patient_id: patientId, import_batch_id: batchId });
  }
  for (const part of chunks(payload)) {
    const { error } = await db.from(def.table).insert(part);
    if (error) throw new Error(`Falha ao inserir ${def.label}: ${error.message}`);
    res.inserted += part.length;
  }
  res.unmatched = [...unmatched];
  return res;
}

async function importAdmissions(db: Db, orgId: string, batchId: string, sheet: ParsedSheet): Promise<SheetResult> {
  const res: SheetResult = { key: sheet.key, label: sheet.label, inserted: 0, duplicates: 0, unmatched: [], issues: sheet.issues.map((i) => i.message) };
  const { data } = await db.from("admission_processes").select("patient_name,interview_date").eq("organization_id", orgId);
  const seen = new Set((data ?? []).map((r) => `${normalizeText(r.patient_name)}|${r.interview_date ?? ""}`));
  const payload: Record<string, unknown>[] = [];
  for (const row of sheet.rows) {
    const key = `${normalizeText(row.patientName)}|${row.values.interview_date ?? ""}`;
    if (seen.has(key)) {
      res.duplicates++;
      continue;
    }
    seen.add(key);
    payload.push({ ...clean(row.values), patient_name: row.patientName, organization_id: orgId, import_batch_id: batchId });
  }
  for (const part of chunks(payload)) {
    const { error } = await db.from("admission_processes").insert(part);
    if (error) throw new Error(`Falha ao inserir processos de admissão: ${error.message}`);
    res.inserted += part.length;
  }
  return res;
}

/** Grava a planilha já lida. Idempotente: registros iguais (paciente + data) não são duplicados. */
export async function commitImport(
  db: Db,
  opts: { orgId: string; userId: string; fileName: string; parsed: ParsedWorkbook },
): Promise<ImportResult> {
  const { orgId, userId, fileName, parsed } = opts;
  const { data: batch, error } = await db
    .from("import_batches")
    .insert({ organization_id: orgId, created_by: userId, file_name: fileName })
    .select("id")
    .single();
  if (error || !batch) throw new Error(`Falha ao criar lote de importação: ${error?.message}`);
  const batchId = batch.id as string;

  const results: SheetResult[] = [];
  const patientsSheet = parsed.sheets.find((s) => s.key === "pacientes");
  if (patientsSheet) results.push(await importPatients(db, orgId, batchId, patientsSheet));

  // nome normalizado -> paciente (prefere ativo, depois admissão mais recente)
  const all = await loadPatients(db, orgId);
  const patientIdByName = new Map<string, string>();
  const rank = (p: PatientRow) => `${p.status === "ATIVO" ? "1" : "0"}${p.admission_date ?? ""}`;
  const best = new Map<string, PatientRow>();
  for (const p of all) {
    const k = normalizeText(p.name);
    const prev = best.get(k);
    if (!prev || rank(p) > rank(prev)) best.set(k, p);
  }
  for (const [k, p] of best) patientIdByName.set(k, p.id);

  for (const sheet of parsed.sheets) {
    if (sheet.key === "pacientes") continue;
    results.push(
      sheet.key === "admissao"
        ? await importAdmissions(db, orgId, batchId, sheet)
        : await importLongitudinal(db, orgId, batchId, sheet, patientIdByName),
    );
  }

  const summary = Object.fromEntries(results.map((r) => [r.key, { inserted: r.inserted, duplicates: r.duplicates, unmatched: r.unmatched.length }]));
  await db.from("import_batches").update({ summary }).eq("id", batchId);
  return { batchId, sheets: results, ignoredSheets: parsed.ignoredSheets };
}
