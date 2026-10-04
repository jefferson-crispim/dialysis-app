"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveDefault } from "@/lib/forms";
import { formatDate } from "@/lib/date";
import {
  answersToRow,
  footRowFromAnswers,
  validateAnswers,
  visibleQuestions,
  visibleSteps,
  type Answers,
  type Ctx,
  type Question,
} from "@/lib/clinical/nursing/questionnaire";
import { Stepper } from "./Stepper";
import { Button } from "./Button";
import { Card } from "./Card";
import { DateField } from "./DateField";
import { Icon } from "./Icon";

const input = "mt-1 min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card px-3 text-ink";

type Props = {
  ctx: Ctx;
  patient: { id: string; name: string };
  orgId: string;
  userId: string;
  /** respostas pré-preenchidas (dados que mudam pouco) e data da consulta de onde vieram */
  prefill: Answers;
  prefillDate: string | null;
  /** todos os valores anteriores, para mostrar como referência */
  reference: Answers;
};

const show = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : (v ?? ""));
const isEmpty = (v: string | string[] | undefined) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

function Field({
  q,
  value,
  onChange,
  fromPrev,
  reference,
  referenceDate,
}: {
  q: Question;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  fromPrev: boolean;
  reference: string | string[] | undefined;
  referenceDate: string | null;
}) {
  const wide = q.type === "multi" || q.type === "text";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="block font-semibold">
        {q.label}
        {q.unit && <span className="font-normal text-muted"> ({q.unit})</span>}
        {q.type === "select" || q.type === "yesno" ? (
          <select className={input} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Não avaliado</option>
            {(q.type === "yesno" ? ["Sim", "Não"] : q.options)!.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : q.type === "number" ? (
          <input className={input} type="text" inputMode="decimal" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ) : q.type === "text" ? (
          <input className={input} type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        ) : null}
      </label>
      {q.type === "multi" && (
        <fieldset className="mt-1 grid gap-x-4 sm:grid-cols-2">
          <legend className="sr-only">{q.label}</legend>
          {q.options!.map((o) => {
            const list = Array.isArray(value) ? value : [];
            return (
              <label key={o} className="flex min-h-11 items-start gap-3 py-1.5">
                <input type="checkbox" className="mt-0.5 size-5" checked={list.includes(o)} onChange={(e) => onChange(e.target.checked ? [...list, o] : list.filter((x) => x !== o))} />
                <span>{o}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {q.hint && <span className="mt-1 block text-sm text-muted">{q.hint}</span>}
      {fromPrev && !isEmpty(value) && <span className="mt-1 block text-sm font-semibold text-brand">Da consulta de {formatDate(referenceDate, "anterior")}</span>}
      {!fromPrev && !isEmpty(reference) && (
        <span className="mt-1 block text-sm text-muted">
          Anterior: {show(reference)}
          {q.unit && !Array.isArray(reference) ? ` ${q.unit}` : ""}
          {referenceDate ? ` (${formatDate(referenceDate)})` : ""}
        </span>
      )}
    </div>
  );
}

export function AssessmentWizard({ ctx, patient, orgId, userId, prefill, prefillDate, reference }: Props) {
  const router = useRouter();
  const steps = useMemo(() => visibleSteps(ctx), [ctx]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(prefill);
  const [touched, setTouched] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [date, setDate] = useState(resolveDefault("@hoje"));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const step = steps[index];
  const last = index === steps.length - 1;
  const questions = visibleQuestions(step, answers, ctx);
  const hasPrefill = questions.some((q) => !isEmpty(prefill[q.key]));

  const set = (key: string, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [key]: v }));
    setTouched((t) => (t.includes(key) ? t : [...t, key]));
  };
  const markDone = () => setDone((d) => (d.includes(step.id) ? d : [...d, step.id]));
  const next = () => {
    markDone();
    setIndex(index + 1);
  };
  const skip = () => {
    // etapa pulada não entra na avaliação: descarta as respostas (inclusive as pré-preenchidas)
    const keys = new Set(step.questions.map((q) => q.key));
    const remaining = Object.fromEntries(Object.entries(answers).filter(([k]) => !keys.has(k)));
    const completed = done.filter((x) => x !== step.id);
    setAnswers(remaining);
    setDone(completed);
    if (last) void save(remaining, completed);
    else setIndex(index + 1);
  };

  async function save(finalAnswers: Answers = answers, completed: string[] = done.includes(step.id) ? done : [...done, step.id]) {
    const problems = validateAnswers(finalAnswers, ctx);
    if (!date) problems.unshift("Informe uma data válida.");
    if (problems.length) return setErrors(problems);
    if (completed.length === 0) return setErrors(["Responda ao menos uma etapa para salvar a avaliação."]);

    setSaving(true);
    setErrors([]);
    const supabase = createClient();
    const base = { organization_id: orgId, patient_id: patient.id, nurse_id: userId, date };
    const { error } = await supabase.from("nursing_assessments").insert({ ...base, ...answersToRow(finalAnswers, ctx), completed_steps: completed });
    if (error) {
      setErrors(["Não foi possível salvar a avaliação. Verifique a conexão e tente de novo."]);
      setSaving(false);
      return;
    }
    const footFilled = ctx.diabetic && completed.includes("pe") && Object.keys(finalAnswers).some((k) => k.startsWith("foot_") && !isEmpty(finalAnswers[k]));
    if (footFilled) {
      const { error: footError } = await supabase.from("diabetic_foot_screenings").insert({ ...base, ...footRowFromAnswers(finalAnswers) });
      if (footError) {
        setErrors(["A avaliação foi salva, mas o rastreamento do pé diabético não. Registre-o novamente em uma nova avaliação."]);
        setSaving(false);
        return;
      }
    }
    router.push(`/pacientes/${patient.id}/processo?avaliado=1`);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Stepper steps={steps.map((s) => s.title)} current={index} />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-bold">
            <Icon name="person" /> {patient.name}
          </p>
          <label className="flex items-center gap-2 font-semibold">
            Data
            <DateField className="min-h-11 w-36 rounded-[var(--radius-sm)] border border-line bg-card px-3 font-normal text-ink" value={date} onChange={setDate} required />
          </label>
        </div>

        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Icon name={step.icon} className="text-brand" /> {step.title}
        </h2>
        {step.intro && <p className="mt-1 text-muted">{step.intro}</p>}
        {hasPrefill && prefillDate && (
          <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] bg-info-bg px-3 py-2 text-info-ink">
            <Icon name="history" size={20} />
            <span>Respostas pré-preenchidas com a consulta de {formatDate(prefillDate)}. Altere só o que mudou ou use “Nada mudou”.</span>
          </p>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {questions.map((q) => (
            <Field
              key={q.key}
              q={q}
              value={answers[q.key]}
              onChange={(v) => set(q.key, v)}
              fromPrev={!!prefill[q.key] && !touched.includes(q.key)}
              reference={reference[q.key]}
              referenceDate={prefillDate}
            />
          ))}
        </div>

        {errors.length > 0 && (
          <ul role="alert" className="mt-5 grid gap-1 rounded-[var(--radius-sm)] bg-crit-bg px-4 py-3 text-crit-ink">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" icon="arrow_back" onClick={() => setIndex(index - 1)} disabled={index === 0 || saving}>
            Voltar
          </Button>
          <Button variant="ghost" onClick={skip} disabled={saving}>
            Pular etapa
          </Button>
          {hasPrefill && !last && (
            <Button variant="secondary" icon="done_all" onClick={next} disabled={saving}>
              Nada mudou
            </Button>
          )}
          {last ? (
            <Button icon="check" className="flex-1" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar e ver resultado"}
            </Button>
          ) : (
            <Button icon="arrow_forward" className="flex-1" onClick={next} disabled={saving}>
              Avançar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
