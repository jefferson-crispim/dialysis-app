"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FORM_BY_SLUG, resolveDefault, type PatientLite, type Values } from "@/lib/forms";
import { Stepper } from "./Stepper";
import { Button } from "./Button";
import { AlertBadge } from "./AlertBadge";
import { Icon } from "./Icon";

const STEPS = ["Paciente", "Dados", "Conferir"];
const input = "mt-1 min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card px-3 text-ink";

type Props = { slug: string; orgId: string; patients: PatientLite[]; initialPatientId?: string };

export function RecordWizard({ slug, orgId, patients, initialPatientId }: Props) {
  const def = FORM_BY_SLUG[slug];
  const router = useRouter();
  const [step, setStep] = useState(initialPatientId ? 1 : 0);
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [query, setQuery] = useState("");
  const [values, setValues] = useState<Values>(() => Object.fromEntries(def.fields.map((f) => [f.name, resolveDefault(f.defaultValue)])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === patientId);
  const preview = useMemo(() => (patient ? def.preview(values, patient) : null), [def, values, patient]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? patients.filter((p) => p.name.toLowerCase().includes(q)) : patients).slice(0, 30);
  }, [patients, query]);

  async function save() {
    if (!patient) return;
    const rows = def.build(values, patient);
    if (!rows) {
      setError("Faltam dados para salvar. Volte e confira os campos.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await createClient()
      .from(def.table)
      .insert(rows.map((r) => ({ ...r, organization_id: orgId, patient_id: patient.id })));
    if (err) {
      setError("Não foi possível salvar. Verifique a conexão e tente de novo.");
      setSaving(false);
      return;
    }
    router.push(`/pacientes/${patient.id}?salvo=${encodeURIComponent(def.verb)}`);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <label className="block font-semibold">
            Buscar paciente
            <input className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o nome" autoFocus />
          </label>
          <ul className="mt-3 grid max-h-96 gap-2 overflow-auto" aria-label="Pacientes">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line px-3 text-left hover:bg-brand-soft"
                  onClick={() => {
                    setPatientId(p.id);
                    setStep(1);
                  }}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-sm text-muted">{p.modality ?? "—"}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="p-3 text-muted">Nenhum paciente encontrado. Confira o nome ou importe a planilha de pacientes.</li>}
          </ul>
        </div>
      )}

      {step === 1 && patient && (
        <form
          className="rounded-[var(--radius)] border border-line bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <p className="mb-4 flex items-center gap-2 font-bold">
            <Icon name="person" /> {patient.name}
            <button type="button" className="ml-2 text-sm font-semibold text-brand underline" onClick={() => setStep(0)}>
              Trocar
            </button>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields.map((f) => (
              <label key={f.name} className={`block font-semibold ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                {f.label}
                {f.unit && <span className="font-normal text-muted"> ({f.unit})</span>}
                {f.type === "select" ? (
                  <select className={input} value={values[f.name]} required={f.required} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                    <option value="">Selecione</option>
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea className={`${input} py-2`} rows={3} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
                ) : (
                  <input
                    className={input}
                    type={f.type === "number" ? "text" : f.type}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    value={values[f.name]}
                    required={f.required}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  />
                )}
                {f.hint && <span className="mt-1 block text-sm font-normal text-muted">{f.hint}</span>}
              </label>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="secondary" icon="arrow_back" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button type="submit" icon="arrow_forward" className="flex-1">
              Conferir
            </Button>
          </div>
        </form>
      )}

      {step === 2 && patient && preview && (
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <p className="mb-4 flex items-center gap-2 font-bold">
            <Icon name="person" /> {patient.name}
          </p>
          {preview.error ? (
            <p role="alert" className="rounded-[var(--radius-sm)] bg-warn-bg px-3 py-2 text-warn-ink">
              {preview.error}
            </p>
          ) : (
            <>
              <dl className="grid gap-2 sm:grid-cols-2">
                {preview.lines.map((l) => (
                  <div key={l.label} className="rounded-[var(--radius-sm)] bg-brand-soft px-3 py-2">
                    <dt className="text-sm text-muted">{l.label}</dt>
                    <dd className="text-lg font-bold">{l.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 grid gap-2" aria-live="polite">
                {preview.alerts.length === 0 ? (
                  <AlertBadge severity="ok">Dentro da meta</AlertBadge>
                ) : (
                  preview.alerts.map((a) => (
                    <div key={a.code} className="flex flex-wrap items-center gap-2">
                      <AlertBadge severity={a.severity}>{a.title}</AlertBadge>
                      <span className="text-sm text-muted">{a.detail}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-[var(--radius-sm)] bg-crit-bg px-3 py-2 text-crit-ink">
              {error}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" icon="arrow_back" onClick={() => setStep(1)} disabled={saving}>
              Corrigir
            </Button>
            <Button icon="check" onClick={save} disabled={saving || !!preview.error} className="flex-1">
              {saving ? "Salvando…" : def.verb}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
