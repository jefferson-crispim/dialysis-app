import { requireSession } from "@/lib/session";
import { buildTodayActions, type BcmLatestRow, type KtvLatestRow, type PatientStatusRow, type TodayAction } from "@/lib/today";
import { BracketFrame } from "@/components/StripeBrackets";
import { Card, EmptyState } from "@/components/Card";
import { LinkButton } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { AlertBadge } from "@/components/AlertBadge";

export const metadata = { title: "Hoje" };

function greeting(d: Date) {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Bahia" }).format(d));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function ActionItem({ a }: { a: TodayAction }) {
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:flex-row sm:items-center">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-full ${a.severity === "critico" ? "bg-crit-bg text-crit-ink" : "bg-warn-bg text-warn-ink"}`}
      >
        <Icon name={a.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{a.patientName}</p>
        <p className="flex flex-wrap items-center gap-2">
          <AlertBadge severity={a.severity}>{a.title}</AlertBadge>
          <span className="text-sm text-muted">{a.detail}</span>
        </p>
      </div>
      <LinkButton href={a.href} variant={a.severity === "critico" ? "primary" : "secondary"} className="sm:shrink-0">
        {a.actionLabel}
      </LinkButton>
    </li>
  );
}

export default async function HojePage() {
  const { supabase, displayName } = await requireSession();
  const [statusRes, ktvRes, bcmRes] = await Promise.all([
    supabase.from("v_patient_status").select("patient_id,name,modality,last_ktv_date,last_bcm_date,last_pet_date,next_extension_date"),
    supabase.from("v_ktv_latest").select("patient_id,ktv,modality"),
    supabase.from("v_bcm_latest").select("patient_id,overhydration,ecw"),
  ]);
  const statuses = (statusRes.data ?? []) as PatientStatusRow[];
  const now = new Date();
  const actions = buildTodayActions({
    today: now,
    statuses,
    ktvLatest: (ktvRes.data ?? []) as KtvLatestRow[],
    bcmLatest: (bcmRes.data ?? []) as BcmLatestRow[],
  });
  const critical = actions.filter((a) => a.severity === "critico");
  const routine = actions.filter((a) => a.severity !== "critico");
  const firstName = displayName.split(" ")[0];

  return (
    <div className="grid gap-8">
      <BracketFrame height={104}>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          {greeting(now)}, {firstName}
        </h1>
        <p className="mt-1 text-lg text-muted">
          {statuses.length === 0
            ? "Vamos começar cadastrando seus pacientes."
            : actions.length === 0
              ? "Tudo em dia. Nenhuma pendência para hoje."
              : `${actions.length} ${actions.length === 1 ? "pendência" : "pendências"}, ${critical.length} ${critical.length === 1 ? "crítica" : "críticas"}.`}
        </p>
      </BracketFrame>

      {statuses.length === 0 ? (
        <Card>
          <EmptyState
            icon="upload_file"
            title="Nenhum paciente ativo ainda"
            hint="Baixe o modelo de planilha, preencha com seus pacientes e importe. Leva poucos minutos."
          >
            <LinkButton href="/importar" icon="upload_file">
              Importar pacientes
            </LinkButton>
          </EmptyState>
        </Card>
      ) : actions.length === 0 ? (
        <Card>
          <EmptyState icon="task_alt" title="Tudo em dia" hint="Sem alertas e sem rotinas vencidas. Aproveite para registrar uma nova avaliação.">
            <LinkButton href="/lancar" icon="add_circle">
              Lançar registro
            </LinkButton>
          </EmptyState>
        </Card>
      ) : (
        <>
          {critical.length > 0 && (
            <section aria-labelledby="crit">
              <h2 id="crit" className="mb-3 text-xl font-bold">
                Precisa de atenção agora
              </h2>
              <ul className="grid gap-3">
                {critical.slice(0, 10).map((a) => (
                  <ActionItem key={a.key} a={a} />
                ))}
              </ul>
              {critical.length > 10 && <p className="mt-2 text-sm text-muted">e mais {critical.length - 10} alertas. Veja todos em Painéis.</p>}
            </section>
          )}
          {routine.length > 0 && (
            <section aria-labelledby="rot">
              <h2 id="rot" className="mb-3 text-xl font-bold">
                Rotinas a fazer
              </h2>
              <ul className="grid gap-3">
                {routine.slice(0, 12).map((a) => (
                  <ActionItem key={a.key} a={a} />
                ))}
              </ul>
              {routine.length > 12 && <p className="mt-2 text-sm text-muted">e mais {routine.length - 12} rotinas pendentes.</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
