import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin_clinica" | "enfermeiro" | "medico" | "viewer";

/** Sessão + perfil + organização do usuário logado. Redireciona para login/onboarding quando faltar algo. */
export const requireSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,role,coren_number,organization_id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.organization_id) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("id,name,logo_url")
    .eq("id", profile.organization_id)
    .single();
  if (!org) redirect("/onboarding");

  const meta = data.user.user_metadata as { full_name?: string; name?: string };
  return {
    supabase,
    user: data.user,
    role: profile.role as Role,
    orgId: org.id as string,
    org: org as { id: string; name: string; logo_url: string | null },
    displayName: profile.full_name || meta.full_name || meta.name || data.user.email || "Usuário",
  };
});
