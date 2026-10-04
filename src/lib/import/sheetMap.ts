import { toBool, toGender, toISODate, toModality, toNumber, toPatientStatus, toText } from "./normalize";

export type Converter = (v: unknown) => unknown;

export type ColumnDef = {
  field: string;
  /** nomes aceitos para o cabeçalho (normalizados: sem acento, minúsculas). Casa por igualdade ou prefixo. */
  aliases: string[];
  convert: Converter;
  /** usado na planilha-modelo (exemplo e dica) */
  example?: string;
};

export type SheetKey =
  | "pacientes"
  | "ktv"
  | "bcm"
  | "labs"
  | "pet"
  | "citologias"
  | "infeccoes"
  | "hospitalizacoes"
  | "cateter"
  | "trocas_extensao"
  | "treinamentos"
  | "visitas"
  | "vacinacao"
  | "admissao";

export type SheetDef = {
  key: SheetKey;
  label: string;
  /** nomes aceitos da aba (normalizados) */
  sheetNames: string[];
  table: string;
  /** coluna que identifica o paciente (todas, exceto admissão e pacientes, ligam por nome) */
  patientAliases: string[];
  columns: ColumnDef[];
  /** só linhas com data válida são importadas */
  requireDate?: boolean;
};

const text = toText;
const date = toISODate;
const num = toNumber;
const meds = (v: unknown) => (toText(v) ? [String(v).trim()] : []);

export const SHEETS: SheetDef[] = [
  {
    key: "pacientes",
    label: "Pacientes",
    sheetNames: ["pacientes"],
    table: "patients",
    patientAliases: ["nome do paciente", "paciente"],
    columns: [
      { field: "gender", aliases: ["sexo"], convert: toGender, example: "F" },
      { field: "birth_date", aliases: ["nascimento", "data de nascimento"], convert: date, example: "1955-04-12" },
      { field: "admission_date", aliases: ["admissao"], convert: date, example: "2024-03-01" },
      { field: "company", aliases: ["empresa"], convert: text, example: "BAXTER" },
      { field: "origin", aliases: ["origem"], convert: text, example: "AMB INTERNO" },
      { field: "insurance", aliases: ["convenio"], convert: text, example: "AMIL" },
      { field: "primary_disease", aliases: ["doenca", "doenca de base"], convert: text, example: "AMILOIDOSE" },
      { field: "diabetic", aliases: ["diabetico"], convert: toBool, example: "NÃO" },
      { field: "modality", aliases: ["modalidade"], convert: toModality, example: "APD" },
      { field: "caregiver", aliases: ["cuidador responsavel", "cuidador"], convert: text, example: "FAMILIAR" },
      { field: "doctor_name", aliases: ["medico"], convert: text, example: "RITA" },
      { field: "nurse_name", aliases: ["enfermeiro", "enfermeira"], convert: text, example: "JOCIARIA NEVES" },
      { field: "exit_date", aliases: ["saida"], convert: date },
      { field: "exit_reason", aliases: ["motivo da saida"], convert: text },
      { field: "status", aliases: ["status"], convert: toPatientStatus, example: "ATIVO" },
      { field: "access_type", aliases: ["tipo de acesso", "acesso"], convert: toAccessType, example: "FAV" },
      { field: "dry_weight", aliases: ["peso seco"], convert: num, example: "68.5" },
    ],
  },
  {
    key: "ktv",
    label: "Kt/V",
    sheetNames: ["ktv"],
    table: "ktv_records",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data"], convert: date, example: "2025-01-15" },
      { field: "imported_ktv", aliases: ["valor", "ktv", "kt/v"], convert: num, example: "1.85" },
      { field: "pre_urea", aliases: ["ureia pre"], convert: num },
      { field: "post_urea", aliases: ["ureia pos"], convert: num },
      { field: "session_time_min", aliases: ["tempo (min)", "tempo sessao"], convert: num },
      { field: "uf_volume", aliases: ["uf (l)", "ultrafiltracao"], convert: num },
      { field: "post_weight", aliases: ["peso pos"], convert: num },
    ],
  },
  {
    key: "bcm",
    label: "BCM",
    sheetNames: ["bcm"],
    table: "bcm_records",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data"], convert: date, example: "2025-01-15" },
      { field: "overhydration", aliases: ["oh", "sobreidratacao"], convert: num, example: "1.2" },
      { field: "tbw", aliases: ["tbw", "agua corporal total"], convert: num },
      { field: "ecw", aliases: ["ecw"], convert: num },
      { field: "icw", aliases: ["icw"], convert: num },
      { field: "lti", aliases: ["lti"], convert: num },
      { field: "fti", aliases: ["fti"], convert: num },
      { field: "post_weight", aliases: ["peso pos", "peso"], convert: num },
    ],
  },
  {
    key: "labs",
    label: "Exames laboratoriais",
    sheetNames: ["exames lab", "exames", "laboratorio"],
    table: "lab_results",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data"], convert: date, example: "2025-01-15" },
      { field: "analyte", aliases: ["exame", "analito"], convert: toAnalyte, example: "K" },
      { field: "value", aliases: ["valor", "resultado"], convert: num, example: "5.1" },
    ],
  },
  {
    key: "pet",
    label: "PET",
    sheetNames: ["pet"],
    table: "pet_records",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data do pet", "data"], convert: date },
      { field: "fluid_transport", aliases: ["tipo de transporte de liquido"], convert: text, example: "MÉDIO TRANSP" },
      { field: "solute_transport", aliases: ["tipo de transporte soluto", "tipo de transporte de soluto"], convert: text, example: "MÉDIO TRANSP" },
    ],
  },
  {
    key: "citologias",
    label: "Citologias",
    sheetNames: ["citologias"],
    table: "cytology_records",
    patientAliases: ["paciente", "nome do paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data"], convert: date },
      { field: "cell_count", aliases: ["qtd de celulas"], convert: num },
      { field: "notes", aliases: ["observacoes"], convert: text },
    ],
  },
  {
    key: "infeccoes",
    label: "Infecções e peritonites",
    sheetNames: ["infeccoes"],
    table: "infections",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data inicial"], convert: date },
      { field: "end_date", aliases: ["data fim"], convert: date },
      { field: "occurrence", aliases: ["ocorrencia"], convert: text },
      { field: "infected_area", aliases: ["area infectada"], convert: text },
      { field: "symptoms", aliases: ["sintomas"], convert: text },
      { field: "medications", aliases: ["medicamento 1"], convert: meds },
      { field: "infection_type", aliases: ["tipo de infeccao"], convert: text },
      { field: "microorganism", aliases: ["microorganismo"], convert: text },
      { field: "treatment", aliases: ["tratamento"], convert: text },
      { field: "outcome", aliases: ["desfecho"], convert: text },
    ],
  },
  {
    key: "hospitalizacoes",
    label: "Hospitalizações",
    sheetNames: ["hospitalizacoes"],
    table: "hospitalizations",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["inicio"], convert: date },
      { field: "end_date", aliases: ["fim"], convert: date },
      { field: "cause", aliases: ["causa"], convert: text },
      { field: "reason", aliases: ["motivo"], convert: text },
      { field: "location", aliases: ["local"], convert: text },
      { field: "outcome", aliases: ["desfecho"], convert: text },
    ],
  },
  {
    key: "cateter",
    label: "Movimento de cateter",
    sheetNames: ["cateter"],
    table: "catheter_movements",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data"], convert: date },
      { field: "movement", aliases: ["tipo", "movimento", "movimento de cateter", "tipo de movimento"], convert: text },
      { field: "reason", aliases: ["motivo"], convert: text },
      { field: "notes", aliases: ["hospital", "observacoes"], convert: text },
    ],
  },
  {
    key: "trocas_extensao",
    label: "Trocas de extensão",
    sheetNames: ["trocas de extensao"],
    table: "extension_changes",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data da troca"], convert: date },
      { field: "responsible", aliases: ["responsavel pela troca"], convert: text },
      { field: "reason", aliases: ["motivo da troca"], convert: text },
      { field: "next_change_date", aliases: ["previsao da proxima troca"], convert: date },
    ],
  },
  {
    key: "treinamentos",
    label: "Treinamentos",
    sheetNames: ["treinamentos"],
    table: "trainings",
    patientAliases: ["nome do paciente", "paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data de inicio"], convert: date },
      { field: "end_date", aliases: ["data fim"], convert: date },
      { field: "process", aliases: ["processo"], convert: text },
      { field: "trainee", aliases: ["treinado"], convert: text },
      { field: "nurse_name", aliases: ["enfermeiro"], convert: text },
      { field: "fit", aliases: ["apto"], convert: toBool },
      { field: "status", aliases: ["status"], convert: text },
      { field: "notes", aliases: ["observacoes"], convert: text },
    ],
  },
  {
    key: "visitas",
    label: "Visitas",
    sheetNames: ["visitas"],
    table: "visits",
    patientAliases: ["paciente", "nome do paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data da visita"], convert: date },
      { field: "visit_type", aliases: ["tipo de visita"], convert: text },
      { field: "nurse_name", aliases: ["enfermeiro"], convert: text },
      { field: "notes", aliases: ["observacoes"], convert: text },
    ],
  },
  {
    key: "vacinacao",
    label: "Vacinação hepatite B",
    sheetNames: ["vacinacao"],
    table: "vaccinations",
    patientAliases: ["nome do paciente"],
    requireDate: true,
    columns: [
      { field: "date", aliases: ["data do 1o anti-hbs", "data do 1º anti-hbs"], convert: date },
      { field: "anti_hbs_value", aliases: ["valor 1o anti-hbs", "valor 1º anti-hbs"], convert: num },
      { field: "primary_status", aliases: ["status primario"], convert: text },
      { field: "definitive_status", aliases: ["status definitivo"], convert: text },
    ],
  },
  {
    key: "admissao",
    label: "Processos de admissão",
    sheetNames: ["processos de admissao"],
    table: "admission_processes",
    patientAliases: ["nome do paciente"],
    columns: [
      { field: "nurse_name", aliases: ["enfermeiro"], convert: text },
      { field: "interview_date", aliases: ["data da entrevista"], convert: date },
      { field: "insurance", aliases: ["convenio"], convert: text },
      { field: "eligible", aliases: ["elegibilidade"], convert: toBool },
      { field: "outcome", aliases: ["desfecho"], convert: text },
      { field: "outcome_date", aliases: ["data do desfecho"], convert: date },
      { field: "notes", aliases: ["observacoes"], convert: text },
      { field: "phone", aliases: ["telefone"], convert: text },
      { field: "admission_date", aliases: ["data da admissao"], convert: date },
    ],
  },
];

export const SHEET_BY_KEY = Object.fromEntries(SHEETS.map((s) => [s.key, s])) as Record<SheetKey, SheetDef>;

function toAccessType(v: unknown): string | null {
  const s = String(v ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!s) return null;
  if (s === "FAV") return "FAV";
  if (s.includes("CURTA")) return "CATETER_CURTA";
  if (s.includes("LONGA")) return "CATETER_LONGA";
  if (s.includes("PERITON")) return "CATETER_PERITONEAL";
  return null;
}

const ANALYTES: Record<string, string> = {
  k: "K", potassio: "K", p: "P", fosforo: "P", ca: "Ca", calcio: "Ca", pth: "PTH",
  hb: "Hb", hemoglobina: "Hb", ferritina: "Ferritina", ureia: "Ureia", creatinina: "Creatinina",
  albumina: "Albumina", ist: "IST",
};
function toAnalyte(v: unknown): string | null {
  const s = String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return ANALYTES[s] ?? null;
}
