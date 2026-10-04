import { requireSession } from "@/lib/session";
import { Card, EmptyState } from "@/components/Card";
import { TrendWithTarget } from "@/components/charts";
import { AlertBadge } from "@/components/AlertBadge";
import { LinkButton } from "@/components/Button";
import { DEFAULT_TARGETS, labInRange } from "@/lib/clinical/alerts";

export const metadata = { title: "Laboratório" };

const ANALYTES: { key: string; label: string; unit: string; band: [number, number] }[] = [
  { key: "Ca", label: "Cálcio", unit: "mg/dL", band: [...DEFAULT_TARGETS.calcium] },
  { key: "P", label: "Fósforo", unit: "mg/dL", band: [3.5, DEFAULT_TARGETS.phosphorusMax] },
  { key: "PTH", label: "PTH", unit: "pg/mL", band: [...DEFAULT_TARGETS.pth] },
  { key: "Hb", label: "Hemoglobina", unit: "g/dL", band: [...DEFAULT_TARGETS.hemoglobin] },
  { key: "Ferritina", label: "Ferritina", unit: "ng/mL", band: [DEFAULT_TARGETS.ferritinMin, 800] },
];

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function LaboratorialPage() {
  const { supabase } = await requireSession();
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const { data } = await supabase
    .from("v_lab_curves")
    .select("analyte,date,value")
    .gte("date", since.toISOString().slice(0, 10))
    .order("date");
  const rows = (data ?? []) as { analyte: string; date: string; value: number }[];

  if (rows.length === 0)
    return (
      <Card>
        <EmptyState icon="biotech" title="Nenhum exame nos últimos 12 meses" hint="Registre os exames dos pacientes para acompanhar as curvas e os desvios das metas.">
          <LinkButton href="/lancar/labs" icon="add_circle">
            Registrar exames
          </LinkButton>
        </EmptyState>
      </Card>
    );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {ANALYTES.map((a) => {
        const own = rows.filter((r) => r.analyte === a.key);
        const byMonth = new Map<string, number[]>();
        for (const r of own) {
          const k = r.date.slice(0, 7);
          byMonth.set(k, [...(byMonth.get(k) ?? []), Number(r.value)]);
        }
        const series = [...byMonth].map(([k, vs]) => {
          const mean = vs.reduce((s, v) => s + v, 0) / vs.length;
          const value = Math.round(mean * 10) / 10;
          return { month: `${MONTHS[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`, value, out: !labInRange(a.key, value) };
        });
        const outCount = own.filter((r) => !labInRange(a.key, Number(r.value))).length;
        const outPct = own.length ? Math.round((outCount / own.length) * 100) : 0;
        return (
          <Card key={a.key}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">
                {a.label} <span className="font-normal text-muted">({a.unit})</span>
              </h2>
              {own.length > 0 && <AlertBadge severity={outPct <= 20 ? "ok" : outPct <= 40 ? "atencao" : "critico"}>{outPct}% fora da meta</AlertBadge>}
            </div>
            <p className="mb-2 text-sm text-muted">
              Média mensal da clínica. Faixa verde: meta de {a.band[0]} a {a.band[1]}. Pontos coral estão fora da meta.
            </p>
            {series.length === 0 ? <p className="py-8 text-center text-muted">Sem resultados deste exame.</p> : <TrendWithTarget data={series} band={a.band} unit={a.unit} name={a.label} />}
            {series.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Ver como tabela</summary>
                <table className="mt-2 w-full text-left text-sm">
                  <tbody>
                    {series.map((s) => (
                      <tr key={s.month} className="border-b border-line">
                        <td className="py-1.5">{s.month}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums">
                          {s.value} {a.unit} {s.out ? "(fora da meta)" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </Card>
        );
      })}
    </div>
  );
}
