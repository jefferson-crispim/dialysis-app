import { requireSession } from "@/lib/session";
import { Card, EmptyState } from "@/components/Card";
import { BarList } from "@/components/charts";
import { AlertBadge } from "@/components/AlertBadge";
import { LinkButton } from "@/components/Button";
import { ktvTarget, type Modality } from "@/lib/clinical/ktv";

export const metadata = { title: "Qualidade da diálise" };

const ACCESS_LABEL: Record<string, string> = {
  FAV: "Fístula (FAV)",
  CATETER_CURTA: "Cateter curta permanência",
  CATETER_LONGA: "Cateter longa permanência",
  CATETER_PERITONEAL: "Cateter peritoneal",
  NAO_INFORMADO: "Não informado",
};

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-4xl font-extrabold tabular-nums">{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
}

export default async function QualidadePage() {
  const { supabase } = await requireSession();
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const [ktvRes, accRes, perRes, activeRes] = await Promise.all([
    supabase.from("v_ktv_latest").select("patient_id,ktv,modality"),
    supabase.from("v_access_distribution").select("access_type,total"),
    supabase.from("v_peritonitis_monthly").select("episodes").gte("month", since.toISOString().slice(0, 10)),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "ATIVO"),
  ]);
  const ktv = (ktvRes.data ?? []) as { ktv: number; modality: Modality | null }[];
  const active = activeRes.count ?? 0;

  if (active === 0)
    return (
      <Card>
        <EmptyState icon="verified" title="Sem dados para mostrar" hint="Importe pacientes e Kt/V para ver a qualidade da diálise da clínica.">
          <LinkButton href="/importar" icon="upload_file">
            Importar planilha
          </LinkButton>
        </EmptyState>
      </Card>
    );

  const onTarget = ktv.filter((k) => k.ktv >= ktvTarget(k.modality)).length;
  const pct = ktv.length ? Math.round((onTarget / ktv.length) * 100) : null;
  const mean = ktv.length ? ktv.reduce((s, k) => s + k.ktv, 0) / ktv.length : null;

  const byAccess = new Map<string, number>();
  for (const r of accRes.data ?? []) byAccess.set(r.access_type, (byAccess.get(r.access_type) ?? 0) + (r.total as number));
  const access = [...byAccess].map(([k, v]) => ({ label: ACCESS_LABEL[k] ?? k, value: v })).sort((a, b) => b.value - a.value);

  const episodes = (perRes.data ?? []).reduce((s, r) => s + (r.episodes as number), 0);
  const rate = active ? (episodes / (active * 12)) * 1000 : 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pacientes na meta de Kt/V" value={pct === null ? "—" : `${pct}%`}>
          {pct !== null && <AlertBadge severity={pct >= 80 ? "ok" : pct >= 60 ? "atencao" : "critico"}>{onTarget} de {ktv.length} com Kt/V medido</AlertBadge>}
        </Stat>
        <Stat label="Kt/V médio da clínica" value={mean === null ? "—" : mean.toFixed(2)}>
          <p className="text-sm text-muted">Último valor de cada paciente ativo</p>
        </Stat>
        <Stat label="Peritonites por 1.000 pacientes-mês" value={rate.toFixed(1)}>
          <p className="text-sm text-muted">{episodes} episódios em 12 meses (estimativa)</p>
        </Stat>
      </div>

      <Card>
        <h2 className="text-lg font-bold">Acessos dos pacientes ativos</h2>
        <p className="mb-3 text-sm text-muted">Metas: hemodiálise 1,2 ou mais; diálise peritoneal 1,7 semanal ou mais.</p>
        {access.length === 0 ? <p className="text-muted">Sem tipo de acesso informado.</p> : <BarList data={access} />}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Ver como tabela</summary>
          <table className="mt-2 w-full text-left text-sm">
            <tbody>
              {access.map((a) => (
                <tr key={a.label} className="border-b border-line">
                  <td className="py-1.5">{a.label}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{a.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>
    </div>
  );
}
