"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BracketFrame } from "@/components/StripeBrackets";
import { Button } from "@/components/Button";

type Provider = "google" | "linkedin_oidc";

export default function LoginPage() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setLoading(provider);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Não foi possível entrar agora. Tente de novo em instantes.");
      setLoading(null);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <BracketFrame height={190}>
        <h1 className="text-5xl font-extrabold">Nefro</h1>
        <p className="mt-3 text-xl font-medium">Cuidado em diálise, um passo de cada vez.</p>
        <p className="mt-2 max-w-sm text-muted">
          Hemodiálise e diálise peritoneal: o sistema mostra o que precisa da sua atenção hoje e guia cada registro.
        </p>
      </BracketFrame>

      <div className="rounded-[var(--radius)] border border-line bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Entrar</h2>
        <p className="mt-1 text-muted">Use sua conta profissional. Não precisa criar senha.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" onClick={() => signIn("google")} disabled={loading !== null} icon="account_circle">
            {loading === "google" ? "Abrindo o Google…" : "Entrar com Google"}
          </Button>
          <Button variant="secondary" onClick={() => signIn("linkedin_oidc")} disabled={loading !== null} icon="work">
            {loading === "linkedin_oidc" ? "Abrindo o LinkedIn…" : "Entrar com LinkedIn"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-[var(--radius-sm)] bg-crit-bg px-3 py-2 text-crit-ink">
            {error}
          </p>
        )}
        <p className="mt-6 text-sm text-muted">No primeiro acesso você cadastra a clínica e passa a administrá-la.</p>
      </div>
    </main>
  );
}
