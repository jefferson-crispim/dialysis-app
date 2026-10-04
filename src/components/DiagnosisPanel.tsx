"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveDefault } from "@/lib/forms";
import { formatDate } from "@/lib/date";
import { CATALOG, CATALOG_BY_ID } from "@/lib/clinical/nursing/catalog";
import type { Suggestion } from "@/lib/clinical/nursing/suggest";
import { AlertBadge } from "./AlertBadge";
import { Button } from "./Button";
import { Card } from "./Card";
import { DateField } from "./DateField";
import { Icon } from "./Icon";

const input = "mt-1 min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card px-3 text-ink";

export type Diagnosis = {
  id: string;
  date: string;
  diagnosis_code: string;
  catalog_id: string | null;
  etiology: string | null;
  evidence: string[] | null;
  expected_outcome: string | null;
  interventions: string[] | null;
  intervention: string | null;
  evaluation: string | null;
  status: "ativo" | "resolvido";
  resolved_date: string | null;
};

type Ctx = { orgId: string; patientId: string; userId: string };

/** Formulário PES: Problema (título), Etiologia, Sinais/sintomas (evidências), resultado esperado e intervenções. */
function DiagnosisForm({
  ctx,
  initialCatalogId,
  evidence,
  assessmentId,
  source,
  onDone,
  onCancel,
}: {
  ctx: Ctx;
  initialCatalogId: string;
  evidence: string[];
  assessmentId?: string;
  source: "sugestao" | "manual";
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const factorsId = useId();
  const [catalogId, setCatalogId] = useState(initialCatalogId);
  const entry = CATALOG_BY_ID[catalogId];
  const [title, setTitle] = useState(entry?.title ?? "");
  const [etiology, setEtiology] = useState(entry?.relatedFactors[0] ?? "");
  const [evidenceText, setEvidenceText] = useState(evidence.join("\n"));
  const [outcome, setOutcome] = useState(entry?.outcome ?? "");
  const [picked, setPicked] = useState<string[]>(entry?.interventions ?? []);
  const [extra, setExtra] = useState("");
  const [nanda, setNanda] = useState("");
  const [date, setDate] = useState(resolveDefault("@hoje"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseCatalog(id: string) {
    setCatalogId(id);
    const c = CATALOG_BY_ID[id];
    if (c) {
      setTitle(c.title);
      setEtiology(c.relatedFactors[0] ?? "");
      setOutcome(c.outcome);
      setPicked(c.interventions);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Descreva o diagnóstico.");
    if (!date) return setError("Informe uma data válida.");
    const interventions = [...picked, ...extra.split("\n").map((s) => s.trim()).filter(Boolean)];
    setSaving(true);
    setError(null);
    const { error: err } = await createClient()
      .from("nursing_diagnoses")
      .insert({
        organization_id: ctx.orgId,
        patient_id: ctx.patientId,
        nurse_id: ctx.userId,
        date,
        diagnosis_code: title.trim(),
        catalog_id: catalogId || null,
        nanda_code: nanda.trim() || null,
        etiology: etiology.trim() || null,
        evidence: evidenceText.split("\n").map((s) => s.trim()).filter(Boolean),
        expected_outcome: outcome.trim() || null,
        interventions,
        intervention: interventions.join("; ") || null,
        source,
        assessment_id: assessmentId ?? null,
      });
    if (err) {
      setError("Não foi possível salvar. Verifique a conexão e tente de novo.");
      setSaving(false);
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-4 grid gap-4 border-t border-line pt-4">
      {source === "manual" && (
        <label className="block font-semibold">
          Modelo do catálogo (opcional)
          <select className={input} value={catalogId} onChange={(e) => chooseCatalog(e.target.value)}>
            <option value="">Outro (texto livre)</option>
            {CATALOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block font-semibold">
        Diagnóstico (problema)
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block font-semibold">
        Relacionado a (etiologia)
        <input className={input} list={factorsId} value={etiology} onChange={(e) => setEtiology(e.target.value)} />
        <datalist id={factorsId}>{entry?.relatedFactors.map((f) => <option key={f} value={f} />)}</datalist>
      </label>
      <label className="block font-semibold">
        Evidenciado por (sinais e sintomas, um por linha)
        <textarea className={`${input} py-2`} rows={3} value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} />
      </label>
      <label className="block font-semibold">
        Resultado esperado
        <textarea className={`${input} py-2`} rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      </label>
      <fieldset className="grid gap-1">
        <legend className="font-semibold">Intervenções</legend>
        {entry?.interventions.map((i) => (
          <label key={i} className="flex min-h-11 items-start gap-3 py-1">
            <input
              type="checkbox"
              className="mt-1 size-5"
              checked={picked.includes(i)}
              onChange={(e) => setPicked(e.target.checked ? [...picked, i] : picked.filter((x) => x !== i))}
            />
            <span>{i}</span>
          </label>
        ))}
        <label className="mt-1 block font-semibold">
          Outras intervenções (uma por linha)
          <textarea className={`${input} py-2`} rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </label>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-semibold">
          Data
          <DateField className={input} value={date} onChange={setDate} required />
        </label>
        <label className="block font-semibold">
          Código NANDA-I (opcional)
          <input className={input} value={nanda} onChange={(e) => setNanda(e.target.value)} inputMode="numeric" />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-crit-bg px-3 py-2 text-crit-ink">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" className="flex-1" disabled={saving}>
          {saving ? "Salvando…" : "Confirmar diagnóstico"}
        </Button>
      </div>
    </form>
  );
}

export function SuggestionList({ ctx, suggestions, canWrite }: { ctx: Ctx; suggestions: Suggestion[]; canWrite: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [manual, setManual] = useState(false);
  const visible = suggestions.filter((s) => !ignored.includes(s.catalogId));

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="lightbulb" className="text-brand" /> Diagnósticos sugeridos
        </h2>
        {canWrite && (
          <Button variant="secondary" icon="add" onClick={() => setManual(!manual)}>
            Diagnóstico manual
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">Apoio à decisão: nada é registrado sem a sua confirmação. O julgamento clínico é da enfermeira(o).</p>

      {manual && <DiagnosisForm ctx={ctx} initialCatalogId="" evidence={[]} source="manual" onDone={() => setManual(false)} onCancel={() => setManual(false)} />}

      {visible.length === 0 ? (
        <p className="text-muted">Nenhuma sugestão com os dados atuais. Registre uma avaliação de enfermagem, BCM ou exames para gerar sugestões.</p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((s) => {
            const c = CATALOG_BY_ID[s.catalogId];
            return (
              <li key={s.catalogId} className="rounded-[var(--radius-sm)] border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertBadge severity={s.severity}>{c.title}</AlertBadge>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                  {s.evidence.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                {canWrite && open !== s.catalogId && (
                  <div className="mt-3 flex gap-2">
                    <Button icon="check" onClick={() => setOpen(s.catalogId)}>
                      Confirmar
                    </Button>
                    <Button variant="ghost" onClick={() => setIgnored([...ignored, s.catalogId])}>
                      Ignorar
                    </Button>
                  </div>
                )}
                {open === s.catalogId && (
                  <DiagnosisForm
                    ctx={ctx}
                    initialCatalogId={s.catalogId}
                    evidence={s.evidence}
                    assessmentId={s.assessmentId}
                    source="sugestao"
                    onDone={() => setOpen(null)}
                    onCancel={() => setOpen(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Reevaluate({ d, onDone }: { d: Diagnosis; onDone: () => void }) {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState(d.evaluation ?? "");
  const [resolve, setResolve] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const patch = {
      evaluation: evaluation.trim() || null,
      ...(resolve ? { status: "resolvido", resolved_date: resolveDefault("@hoje") } : {}),
    };
    const { error: err } = await createClient().from("nursing_diagnoses").update(patch).eq("id", d.id);
    if (err) {
      setError("Não foi possível salvar. Verifique a conexão e tente de novo.");
      setSaving(false);
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-3 border-t border-line pt-3">
      <label className="block font-semibold">
        Avaliação do resultado
        <textarea className={`${input} py-2`} rows={3} value={evaluation} onChange={(e) => setEvaluation(e.target.value)} />
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={resolve} onChange={(e) => setResolve(e.target.checked)} />
        <span>Resultado atingido: marcar como resolvido</span>
      </label>
      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-crit-bg px-3 py-2 text-crit-ink">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onDone} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" className="flex-1" disabled={saving}>
          {saving ? "Salvando…" : "Salvar avaliação"}
        </Button>
      </div>
    </form>
  );
}

export function DiagnosisList({ diagnoses, canWrite }: { diagnoses: Diagnosis[]; canWrite: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const active = diagnoses.filter((d) => d.status === "ativo");
  const resolved = diagnoses.filter((d) => d.status === "resolvido");

  return (
    <>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Icon name="clinical_notes" className="text-brand" /> Diagnósticos ativos
        </h2>
        {active.length === 0 ? (
          <p className="text-muted">Nenhum diagnóstico ativo.</p>
        ) : (
          <ul className="grid gap-3">
            {active.map((d) => (
              <li key={d.id} className="rounded-[var(--radius-sm)] border border-line p-4">
                <p className="font-bold">{d.diagnosis_code}</p>
                <p className="text-sm text-muted">desde {formatDate(d.date)}</p>
                {d.etiology && (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Relacionado a:</span> {d.etiology}
                  </p>
                )}
                {!!d.evidence?.length && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Evidenciado por:</span> {d.evidence.join("; ")}
                  </p>
                )}
                {d.expected_outcome && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Resultado esperado:</span> {d.expected_outcome}
                  </p>
                )}
                {(d.interventions?.length ? d.interventions.join("; ") : d.intervention) && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Intervenções:</span> {d.interventions?.length ? d.interventions.join("; ") : d.intervention}
                  </p>
                )}
                {d.evaluation && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Avaliação:</span> {d.evaluation}
                  </p>
                )}
                {canWrite && editing !== d.id && (
                  <Button variant="secondary" icon="rate_review" className="mt-3" onClick={() => setEditing(d.id)}>
                    Reavaliar
                  </Button>
                )}
                {editing === d.id && <Reevaluate d={d} onDone={() => setEditing(null)} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {resolved.length > 0 && (
        <Card>
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-lg font-bold">
              <Icon name="task_alt" className="text-brand" /> Resolvidos ({resolved.length})
            </summary>
            <ul className="mt-3 grid divide-y divide-line">
              {resolved.map((d) => (
                <li key={d.id} className="py-2">
                  <p className="font-semibold">{d.diagnosis_code}</p>
                  <p className="text-sm text-muted">
                    {formatDate(d.date)} a {formatDate(d.resolved_date, "—")}
                    {d.evaluation ? ` · ${d.evaluation}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}
    </>
  );
}
