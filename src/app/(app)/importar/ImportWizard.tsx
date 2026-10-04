"use client";

import { useState } from "react";
import Link from "next/link";
import { Stepper } from "@/components/Stepper";
import { Button, LinkButton } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { AlertBadge } from "@/components/AlertBadge";
import type { ParsedWorkbook } from "@/lib/import/parse";
import type { ImportResult } from "@/lib/import/commit";

const STEPS = ["Modelo", "Arquivo", "Conferir", "Pronto"];
const MAX_BYTES = 4 * 1024 * 1024;

export function ImportWizard({ sheets }: { sheets: { key: string; label: string }[] }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(f: File | null) {
    setFile(f);
    setError(null);
    setParsed(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setError("Arquivo acima de 4 MB. Divida a planilha em partes menores.");
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return setError("Use um arquivo .xlsx ou .csv.");
    setBusy(true);
    try {
      const { parseWorkbook } = await import("@/lib/import/parse");
      const p = parseWorkbook(await f.arrayBuffer());
      if (p.sheets.length === 0) setError("Não encontrei nenhuma aba conhecida. Use a planilha modelo.");
      else {
        setParsed(p);
        setStep(2);
      }
    } catch {
      setError("Não consegui ler o arquivo. Confira se ele não está protegido por senha.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na importação.");
      setResult(json as ImportResult);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na importação.");
    } finally {
      setBusy(false);
    }
  }

  const total = parsed?.sheets.reduce((n, s) => n + s.rows.length, 0) ?? 0;

  return (
    <div className="grid gap-6">
      <Stepper steps={STEPS} current={step} />

      {step <= 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon name="download" className="text-brand" /> 1. Baixe o modelo
            </h2>
            <p className="mt-1 text-muted">Uma planilha com todas as abas e uma aba de instruções.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/api/template/todos"
                download
                onClick={() => setStep(1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-brand px-4 font-semibold text-brand-ink hover:brightness-110"
              >
                <Icon name="download" size={20} /> Modelo completo
              </a>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand">Baixar só uma aba</summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {sheets.map((s) => (
                  <li key={s.key}>
                    <a href={`/api/template/${s.key}`} download className="flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] px-2 hover:bg-brand-soft">
                      <Icon name="table_chart" size={20} /> {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section className="rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon name="upload_file" className="text-brand" /> 2. Envie a planilha preenchida
            </h2>
            <p className="mt-1 text-muted">Aceita .xlsx e .csv de até 4 MB. Você confere tudo antes de importar.</p>
            <label className="mt-4 block">
              <span className="sr-only">Arquivo da planilha</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={busy}
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card px-3 py-2"
              />
            </label>
            {busy && <p className="mt-3 text-muted">Lendo a planilha…</p>}
          </section>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-crit-bg px-4 py-3 text-crit-ink">
          {error}
        </p>
      )}

      {step === 2 && parsed && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="text-lg font-bold">
            {total} registros prontos para importar de {file?.name}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="py-2 pr-3 font-semibold">Aba</th>
                  <th className="py-2 pr-3 font-semibold">Registros</th>
                  <th className="py-2 font-semibold">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {parsed.sheets.map((s) => (
                  <tr key={s.key} className="border-b border-line align-top">
                    <td className="py-2 pr-3 font-semibold">{s.label}</td>
                    <td className="py-2 pr-3">{s.rows.length}</td>
                    <td className="py-2">
                      {s.issues.length === 0 && s.missingColumns.length === 0 ? (
                        <AlertBadge severity="ok">Sem avisos</AlertBadge>
                      ) : (
                        <details>
                          <summary className="cursor-pointer">
                            <AlertBadge severity="atencao">
                              {s.issues.length} linhas ignoradas{s.missingColumns.length ? `, ${s.missingColumns.length} colunas ausentes` : ""}
                            </AlertBadge>
                          </summary>
                          <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 text-sm text-muted">
                            {s.missingColumns.length > 0 && <li>Colunas não encontradas (ficam vazias): {s.missingColumns.join(", ")}</li>}
                            {s.issues.slice(0, 30).map((i, idx) => (
                              <li key={idx}>
                                Linha {i.rowNumber}: {i.message}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.ignoredSheets.length > 0 && (
            <p className="mt-3 text-sm text-muted">Abas não importadas (calculadas ou desconhecidas): {parsed.ignoredSheets.join(", ")}.</p>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" icon="arrow_back" onClick={() => setStep(1)} disabled={busy}>
              Trocar arquivo
            </Button>
            <Button icon="check" onClick={commit} disabled={busy} className="flex-1">
              {busy ? "Importando…" : "Importar registros"}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && result && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Icon name="check_circle" filled className="text-leaf" /> Importação concluída
          </h2>
          <ul className="mt-4 grid gap-2">
            {result.sheets.map((s) => (
              <li key={s.key} className="rounded-[var(--radius-sm)] bg-brand-soft px-3 py-2">
                <p className="font-semibold">
                  {s.label}: {s.inserted} novos{s.duplicates ? `, ${s.duplicates} já existiam` : ""}
                </p>
                {s.unmatched.length > 0 && (
                  <p className="text-sm text-warn-ink">
                    {s.unmatched.length} nomes sem cadastro em Pacientes (ignorados): {s.unmatched.slice(0, 5).join(", ")}
                    {s.unmatched.length > 5 ? "…" : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/pacientes" icon="groups">
              Ver pacientes
            </LinkButton>
            <LinkButton href="/hoje" icon="today" variant="secondary">
              Ir para Hoje
            </LinkButton>
            <Link href="/importar" onClick={() => location.reload()} className="inline-flex min-h-11 items-center px-3 font-semibold text-brand">
              Importar outro arquivo
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
