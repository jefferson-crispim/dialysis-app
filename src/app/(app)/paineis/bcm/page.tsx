import { requireSession } from "@/lib/session";
import { Card, EmptyState } from "@/components/Card";
import { AlertBadge } from "@/components/AlertBadge";
import { LinkButton } from "@/components/Button";
import { hydrationStatus } from "@/lib/clinical/bcm";
import { bcmAlert } from "@/lib/clinical/alerts";

export const metadata = { title: "Composição corporal" };

type Row = { patient_id: string; name: string; date: string; overhydration: number | null; ecw: number | null; oh_pct_ecw: number | null; dry_weight: number | null };

export default async function BcmPage() {
  const { supabase } = await requireSession();
  const { data } = await supabase.from("v_bcm_latest").select("patient_id,name,date,overhydration,ecw,oh_pct_ecw,dry_weight");
  const rows = ((data ?? []) as Row[]).filter((r) => r.overhydration !== null);

  if (rows.length === 0)
    return (
      <Card>
        <EmptyState icon="monitor_weight" title="Nenhum BCM com medidas" hint="Registre a sobreidratação (OH) para acompanhar a hidratação e priorizar a reavaliação do peso seco.">
          <LinkButton href="/lancar/bcm" icon="add_circle">
            Registrar BCM
          </LinkButton>
        </EmptyState>
      </Card>
    );

  const mean = rows.reduce((s, r) => s + (r.overhydration ?? 0), 0) / rows.length;
  const priority = rows
    .map((r) => ({ ...r, alert: bcmAlert(r.overhydration, r.ecw), status: hydrationStatus(r.overhydration ?? 0, r.ecw) }))
    .filter((r) => r.status !== "normal")
    .sort((a, b) => (b.overhydration ?? 0) - (a.overhydration ?? 0));

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-muted">Sobreidratação média (OH)</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">{mean.toFixed(1)} L</p>
          <p className="mt-2 text-sm text-muted">{rows.length} pacientes com BCM medido</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-muted">Em nível crítico</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">{priority.filter((p) => p.alert).length}</p>
          <p className="mt-2 text-sm text-muted">OH acima de 2,0 L ou 15% do ECW</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-muted">Para reavaliar peso seco</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">{priority.length}</p>
          <p className="mt-2 text-sm text-muted">Fora da faixa normal de hidratação</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Pacientes prioritários para reavaliar o peso seco</h2>
        {priority.length === 0 ? (
          <AlertBadge severity="ok">Todos dentro da faixa normal</AlertBadge>
        ) : (
          <ul className="grid divide-y divide-line">
            {priority.slice(0, 20).map((p) => (
              <li key={p.patient_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm text-muted">
                    OH {p.overhydration} L{p.oh_pct_ecw !== null ? ` · ${p.oh_pct_ecw}% do ECW` : ""}
                    {p.dry_weight ? ` · peso seco ${p.dry_weight} kg` : ""}
                  </p>
                </div>
                <AlertBadge severity={p.alert ? "critico" : "atencao"}>{p.alert ? "Crítico" : p.status === "hipohidratado" ? "Hipohidratado" : "Sobreidratado"}</AlertBadge>
                <LinkButton href={`/lancar/bcm?paciente=${p.patient_id}`} variant="secondary">
                  Reavaliar peso seco
                </LinkButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
