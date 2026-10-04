import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Card, EmptyState } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { LinkButton } from "@/components/Button";
import type { Modality } from "@/lib/clinical/ktv";

export const metadata = { title: "Enfermagem" };

type Row = { id: string; name: string; modality: Modality | null };

export default async function EnfermagemPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, "");
  const { supabase } = await requireSession();

  let query = supabase.from("patients").select("id,name,modality").eq("status", "ATIVO").order("name").limit(300);
  if (q) query = query.ilike("name", `%${q}%`);
  const [{ data }, { data: dx }] = await Promise.all([query, supabase.from("nursing_diagnoses").select("patient_id").eq("status", "ativo")]);
  const rows = (data ?? []) as Row[];
  const activeBy = new Map<string, number>();
  for (const d of dx ?? []) activeBy.set(d.patient_id as string, (activeBy.get(d.patient_id as string) ?? 0) + 1);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Processo de enfermagem</h1>
          <p className="text-muted">Escolha o paciente para ver sugestões de diagnóstico, avaliar e acompanhar o plano de cuidados.</p>
        </div>
        <LinkButton href="/lancar/avaliacao" icon="assignment" variant="secondary">
          Nova avaliação
        </LinkButton>
      </div>

      <form role="search">
        <label className="relative block">
          <span className="sr-only">Buscar por nome</span>
          <input name="q" defaultValue={q} placeholder="Buscar por nome" className="min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card pl-10 pr-3" />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={20} />
          </span>
        </label>
      </form>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="person_search" title="Nenhum paciente encontrado" hint="Ajuste a busca ou importe sua planilha de pacientes." />
        </Card>
      ) : (
        <ul className="grid gap-2">
          {rows.map((p) => {
            const n = activeBy.get(p.id) ?? 0;
            return (
              <li key={p.id}>
                <Link href={`/pacientes/${p.id}/processo`} className="flex min-h-16 items-center gap-4 rounded-[var(--radius)] border border-line bg-card px-4 py-3 hover:bg-brand-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block text-sm text-muted">
                      {[p.modality, n === 0 ? "sem diagnósticos ativos" : `${n} ${n === 1 ? "diagnóstico ativo" : "diagnósticos ativos"}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Icon name="chevron_right" className="text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
