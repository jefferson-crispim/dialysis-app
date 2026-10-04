import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export const INED_ORG_NAME = process.env.INED_ORG_NAME || "INED";

export function inedAdminEmails(): string[] {
  return (process.env.INED_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Vincula e-mails autorizados à clínica INED (cria a clínica na primeira vez). Só servidor. */
export async function provisionInedUser(user: User): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (!email || !user.email_confirmed_at || !inedAdminEmails().includes(email)) return false;

  const db = createAdminClient();
  const found = await db.from("organizations").select("id").eq("name", INED_ORG_NAME).limit(1).maybeSingle();
  let orgId = found.data?.id as string | undefined;
  if (!orgId) {
    const created = await db.from("organizations").insert({ name: INED_ORG_NAME }).select("id").single();
    if (created.error) return false;
    orgId = created.data.id as string;
  }

  const meta = user.user_metadata as { full_name?: string; name?: string };
  const { error } = await db
    .from("profiles")
    .upsert({ id: user.id, organization_id: orgId, role: "admin_clinica", full_name: meta.full_name || meta.name || email });
  return !error;
}
