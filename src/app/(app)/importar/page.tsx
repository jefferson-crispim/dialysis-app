import { SHEETS } from "@/lib/import/sheetMap";
import { ImportWizard } from "./ImportWizard";

export const metadata = { title: "Importar" };

export default function ImportarPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Importar planilha</h1>
        <p className="mt-1 text-muted">Cadastre pacientes e registros em lote. Importe os pacientes antes dos demais registros.</p>
      </div>
      <ImportWizard sheets={SHEETS.map((s) => ({ key: s.key, label: s.label }))} />
    </div>
  );
}
