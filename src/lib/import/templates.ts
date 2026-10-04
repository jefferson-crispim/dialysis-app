import * as XLSX from "xlsx";
import { SHEETS, SHEET_BY_KEY, type SheetDef, type SheetKey } from "./sheetMap";

/** Cabeçalhos com acento/forma de exibição. O leitor ignora acento e caixa, então qualquer variação funciona. */
const HEADERS: Record<string, string> = {
  "pacientes.gender": "Sexo",
  "pacientes.birth_date": "Nascimento",
  "pacientes.admission_date": "Admissão",
  "pacientes.insurance": "Convênio",
  "pacientes.primary_disease": "Doença",
  "pacientes.diabetic": "Diabético",
  "pacientes.caregiver": "Cuidador responsável",
  "pacientes.doctor_name": "Médico",
  "pacientes.exit_date": "Saída",
  "pacientes.exit_reason": "Motivo da saída",
  "ktv.imported_ktv": "Valor",
  "ktv.pre_urea": "Ureia pré",
  "ktv.post_urea": "Ureia pós",
  "ktv.session_time_min": "Tempo (min)",
  "ktv.uf_volume": "UF (L)",
  "ktv.post_weight": "Peso pós",
  "bcm.overhydration": "OH",
  "bcm.post_weight": "Peso pós",
  "labs.analyte": "Exame",
  "labs.value": "Valor",
  "pet.date": "Data do PET",
  "pet.fluid_transport": "Tipo de transporte de líquido",
  "pet.solute_transport": "Tipo de transporte soluto",
  "citologias.cell_count": "Qtd de células",
  "citologias.notes": "Observações",
  "infeccoes.date": "Data inicial",
  "infeccoes.end_date": "Data fim",
  "infeccoes.occurrence": "Ocorrência",
  "infeccoes.infected_area": "Área infectada",
  "infeccoes.medications": "Medicamento 1",
  "infeccoes.infection_type": "Tipo de infecção",
  "hospitalizacoes.date": "Início",
  "hospitalizacoes.end_date": "Fim",
  "cateter.movement": "Tipo",
  "cateter.notes": "Hospital",
  "trocas_extensao.date": "Data da troca",
  "trocas_extensao.responsible": "Responsável pela troca",
  "trocas_extensao.reason": "Motivo da troca",
  "trocas_extensao.next_change_date": "Previsão da próxima troca",
  "treinamentos.date": "Data de início",
  "treinamentos.end_date": "Data fim",
  "treinamentos.notes": "Observações",
  "visitas.date": "Data da visita",
  "visitas.visit_type": "Tipo de visita",
  "visitas.notes": "Observações",
  "vacinacao.date": "Data do 1º anti-HBs",
  "vacinacao.anti_hbs_value": "Valor 1º anti-HBs",
  "vacinacao.primary_status": "Status primário",
  "admissao.interview_date": "Data da entrevista",
  "admissao.insurance": "Convênio",
  "admissao.eligible": "Elegibilidade",
  "admissao.outcome_date": "Data do desfecho",
  "admissao.notes": "Observações",
  "admissao.admission_date": "Data da admissão",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function headerFor(def: SheetDef, field: string, aliases: string[]) {
  return HEADERS[`${def.key}.${field}`] ?? cap(aliases[0]);
}

export function patientHeader(def: SheetDef) {
  return def.key === "vacinacao" || def.key === "admissao" || def.patientAliases[0] === "nome do paciente" ? "Nome do paciente" : "Paciente";
}

/** Planilha modelo: uma aba por tipo de registro (ou só a pedida) + aba "Instruções" que o leitor ignora. */
export function buildTemplate(keys: SheetKey[] | "all"): Uint8Array {
  const defs = keys === "all" ? SHEETS : keys.map((k) => SHEET_BY_KEY[k]);
  const wb = XLSX.utils.book_new();

  const help: unknown[][] = [
    ["Como preencher"],
    ["1. Preencha uma linha por registro, abaixo do cabeçalho. Não renomeie a primeira coluna."],
    ["2. Datas no formato dd/mm/aaaa. Números com ponto ou vírgula."],
    ["3. O nome do paciente deve ser igual ao da aba Pacientes. Importe os pacientes primeiro."],
    ["4. Kt/V igual a 0 significa não medido e é ignorado."],
    [],
    ["Aba", "Coluna", "Campo", "Exemplo de valor"],
  ];

  for (const def of defs) {
    const cols = def.columns.map((c) => ({ header: headerFor(def, c.field, c.aliases), example: c.example }));
    const ws = XLSX.utils.aoa_to_sheet([[patientHeader(def), ...cols.map((c) => c.header)]]);
    ws["!cols"] = [{ wch: 34 }, ...cols.map(() => ({ wch: 22 }))];
    XLSX.utils.book_append_sheet(wb, ws, def.sheetNames[0].replace(/^./, (c) => c.toUpperCase()).slice(0, 31));
    help.push([def.label, patientHeader(def), "paciente", ""]);
    for (const c of def.columns) help.push([def.label, headerFor(def, c.field, c.aliases), c.field, c.example ?? ""]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(help), "Instruções");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
