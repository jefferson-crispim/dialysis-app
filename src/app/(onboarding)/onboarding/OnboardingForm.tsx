"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCnpj, formatPhone, isValidCnpj } from "@/lib/cnpj";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/Button";
import { BracketMark } from "@/components/StripeBrackets";

const STEPS = ["Dados da clínica", "Logo"];
const field = "mt-1 min-h-11 w-full rounded-[var(--radius-sm)] border border-line bg-card px-3 text-ink";

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", cnpj: "", address: "", phone: "" });
  const [logo, setLogo] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  function next() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = "Informe o nome da clínica.";
    if (!isValidCnpj(form.cnpj)) e.cnpj = "CNPJ inválido. Confira os 14 dígitos.";
    if (form.address.trim().length < 5) e.address = "Informe o endereço completo.";
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Informe o telefone com DDD.";
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(1);
  }

  async function finish() {
    if (logo && (logo.size > 2 * 1024 * 1024 || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(logo.type))) {
      setFatal("O logo deve ser PNG, JPG, WebP ou SVG de até 2 MB.");
      return;
    }
    setSaving(true);
    setFatal(null);
    const supabase = createClient();
    const { data: orgId, error } = await supabase.rpc("create_organization", {
      p_name: form.name.trim(),
      p_cnpj: form.cnpj.replace(/\D/g, ""),
      p_address: form.address.trim(),
      p_phone: form.phone.trim(),
    });
    if (error || !orgId) {
      setFatal("Não foi possível cadastrar a clínica. Verifique a conexão e tente de novo.");
      setSaving(false);
      return;
    }
    if (logo) {
      const ext = logo.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${orgId}/logo.${ext}`;
      const up = await supabase.storage.from("logos").upload(path, logo, { upsert: true, contentType: logo.type });
      if (!up.error) {
        const { data } = supabase.storage.from("logos").getPublicUrl(path);
        await supabase.from("organizations").update({ logo_url: data.publicUrl }).eq("id", orgId);
      }
      // falha no logo não bloqueia: dá para enviar de novo em Ajustes
    }
    router.replace("/hoje");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <BracketMark height={44} />
        <div>
          <h1 className="text-3xl font-extrabold">Bem-vinda(o) ao Nefro</h1>
          <p className="text-muted">Cadastre sua clínica. Você será a administradora do espaço.</p>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-line bg-card p-6">
        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <form
            className="mt-6 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            noValidate
          >
            <label className="block font-semibold">
              Nome da clínica
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="organization" />
              {errors.name && <span className="mt-1 block text-sm font-normal text-crit-ink">{errors.name}</span>}
            </label>
            <label className="block font-semibold">
              CNPJ
              <input
                className={field}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
              />
              {errors.cnpj && <span className="mt-1 block text-sm font-normal text-crit-ink">{errors.cnpj}</span>}
            </label>
            <label className="block font-semibold">
              Endereço
              <input className={field} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" />
              {errors.address && <span className="mt-1 block text-sm font-normal text-crit-ink">{errors.address}</span>}
            </label>
            <label className="block font-semibold">
              Telefone
              <input
                className={field}
                inputMode="tel"
                placeholder="(71) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                autoComplete="tel"
              />
              {errors.phone && <span className="mt-1 block text-sm font-normal text-crit-ink">{errors.phone}</span>}
            </label>
            <Button type="submit" icon="arrow_forward" className="mt-2">
              Continuar
            </Button>
          </form>
        )}

        {step === 1 && (
          <div className="mt-6 grid gap-4">
            <label className="block font-semibold">
              Logo da clínica (opcional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className={`${field} py-2`}
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              />
              <span className="mt-1 block text-sm font-normal text-muted">PNG, JPG, WebP ou SVG, até 2 MB. Aparece no menu e nos relatórios.</span>
            </label>
            {fatal && (
              <p role="alert" className="rounded-[var(--radius-sm)] bg-crit-bg px-3 py-2 text-crit-ink">
                {fatal}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" icon="arrow_back" onClick={() => setStep(0)} disabled={saving}>
                Voltar
              </Button>
              <Button icon="check" onClick={finish} disabled={saving} className="flex-1">
                {saving ? "Cadastrando…" : "Cadastrar clínica"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
