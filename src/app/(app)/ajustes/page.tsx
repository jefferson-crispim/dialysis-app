import { requireSession } from "@/lib/session";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { DEFAULT_TARGETS } from "@/lib/clinical/alerts";
import { DUE_DAYS } from "@/lib/today";
import { DP_WEEKLY_KTV_TARGET, HD_KTV_TARGET } from "@/lib/clinical/ktv";

export const metadata = { title: "Ajustes" };

const ROLE: Record<string, string> = {
  admin_clinica: "Administradora da clínica",
  enfermeiro: "Enfermagem",
  medico: "Médico",
  viewer: "Somente leitura",
};

export default async function AjustesPage() {
  const { supabase, org, role, displayName } = await requireSession();
  const { data } = await supabase.from("organizations").select("cnpj,address,phone").eq("id", org.id).single();
  const t = DEFAULT_TARGETS;

  const rows: [string, string][] = [
    ["Kt/V mínimo", `Hemodiálise ${HD_KTV_TARGET}; diálise peritoneal ${DP_WEEKLY_KTV_TARGET} semanal`],
    ["Potássio", `até ${t.potassiumMax} mEq/L`],
    ["Fósforo", `até ${t.phosphorusMax} mg/dL`],
    ["Cálcio", `${t.calcium[0]} a ${t.calcium[1]} mg/dL`],
    ["PTH", `${t.pth[0]} a ${t.pth[1]} pg/mL`],
    ["Hemoglobina", `${t.hemoglobin[0]} a ${t.hemoglobin[1]} g/dL`],
    ["Ferritina", `${t.ferritinMin} ng/mL ou mais`],
    ["Sobreidratação crítica", "acima de 2,0 L ou 15% da água extracelular"],
    ["Kt/V e BCM em rotina", `hemodiálise a cada ${DUE_DAYS.ktv.HD} dias; peritoneal a cada ${DUE_DAYS.ktv.DP} dias`],
    ["PET em rotina", "anual"],
  ];

  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="text-3xl font-extrabold">Ajustes</h1>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Icon name="apartment" className="text-brand" /> Clínica
        </h2>
        <dl className="grid gap-2 sm:grid-cols-[160px_1fr]">
          <dt className="text-muted">Nome</dt>
          <dd className="font-semibold">{org.name}</dd>
          <dt className="text-muted">CNPJ</dt>
          <dd>{data?.cnpj ?? "—"}</dd>
          <dt className="text-muted">Endereço</dt>
          <dd>{data?.address ?? "—"}</dd>
          <dt className="text-muted">Telefone</dt>
          <dd>{data?.phone ?? "—"}</dd>
          <dt className="text-muted">Você</dt>
          <dd>
            {displayName} · {ROLE[role]}
          </dd>
        </dl>
      </Card>
      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Icon name="rule" className="text-brand" /> Metas e alertas em uso
        </h2>
        <p className="mb-3 text-sm text-muted">
          Valores baseados em KDOQI, KDIGO e Portaria SAS/MS nº 389/2014. Revise com a equipe médica antes do uso assistencial.
        </p>
        <dl className="grid gap-2 sm:grid-cols-[200px_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
