import Link from "next/link";
import { requireSession } from "@/lib/session";
import { Card, EmptyState } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { AlertBadge } from "@/components/AlertBadge";
import { ktvAlert } from "@/lib/clinical/alerts";
import type { Modality } from "@/lib/clinical/ktv";

export const metadata = { title: "Pacientes" };

type Row = { id: string; name: string; modality: Modality | null; status: string; access_type: string | null; birth_date: string | null };

const ACCESS_LABEL: Record<string, string> = {
  FAV: "FAV",
  CATETER_CURTA: "Cateter curta permanência",
  CATETER_LONGA: "Cateter longa permanência",
  CATETER_PERITONEAL: "Cateter peritoneal",
};

function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00`);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

const chip = (active: boolean) =>
  `inline-flex min-h-10 items-center rounded-full border px-4 text-[15px] font-semibold ${active ? "border-brand bg-brand text-brand-ink" : "border-line bg-card hover:bg-brand-soft"}`;

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; modalidade?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "ENCERRADO" ? "ENCERRADO" : "ATIVO";
  const modalidade = ["HD", "APD", "CAPD"].includes(sp.modalidade ?? "") ? sp.modalidade! : "";
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, "");

  const { supabase } = await requireSession();
  let query = supabase.from("patients").select("id,name,modality,status,access_type,birth_date").eq("status", status).order("name").limit(300);
  if (modalidade) query = query.eq("modality", modalidade);
  if (q) query = query.ilike("name", `%${q}%`);
  const [{ data }, { data: ktv }] = await Promise.all([query, supabase.from("v_ktv_latest").select("patient_id,ktv,modality")]);
  const rows = (data ?? []) as Row[];
  const ktvBy = new Map((ktv ?? []).map((k) => [k.patient_id as string, k as { ktv: number; modality: Modality | null }]));

  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ status, ...(modalidade ? { modalidade } : {}), ...(q ? { q } : {}), ...over });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/pacientes?${p}`;
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Pacientes</h1>
          <p className="text-muted">
            {rows.length} {rows.length === 1 ? "paciente" : "pacientes"} {status === "ATIVO" ? "ativos" : "encerrados"}
          </p>
        </div>
        <LinkButton href="/importar" icon="upload_file" variant="secondary">
          Importar planilha
        </LinkButton>
      </div>

      <form className="flex flex-wrap items-center gap-2" role="search">
        <input type="hidden" name="status" value={status} />
        {modalidade && <input type="hidden" name="modalidade" value={modalidade} />}
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Buscar por nome</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome"
            className="min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card pl-10 pr-3"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={20} />
          </span>
        </label>
        <Link href={href({ status: "ATIVO" })} className={chip(status === "ATIVO")}>
          Ativos
        </Link>
        <Link href={href({ status: "ENCERRADO" })} className={chip(status === "ENCERRADO")}>
          Encerrados
        </Link>
        {["", "HD", "APD", "CAPD"].map((m) => (
          <Link key={m || "todas"} href={href({ modalidade: m })} className={chip(modalidade === m)}>
            {m || "Todas"}
          </Link>
        ))}
      </form>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="person_search" title="Nenhum paciente encontrado" hint="Ajuste a busca ou os filtros, ou importe sua planilha de pacientes.">
            <LinkButton href="/importar" icon="upload_file">
              Importar pacientes
            </LinkButton>
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {rows.map((p) => {
            const k = ktvBy.get(p.id);
            const alert = k ? ktvAlert(k.ktv, p.modality) : null;
            const a = age(p.birth_date);
            return (
              <li key={p.id}>
                <Link href={`/pacientes/${p.id}`} className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius)] border border-line bg-card px-4 py-3 hover:bg-brand-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block text-sm text-muted">
                      {[p.modality, a !== null ? `${a} anos` : null, p.access_type ? ACCESS_LABEL[p.access_type] : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {k && (alert ? <AlertBadge severity="critico">Kt/V {k.ktv.toFixed(2)}</AlertBadge> : <AlertBadge severity="ok">Kt/V {k.ktv.toFixed(2)}</AlertBadge>)}
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
