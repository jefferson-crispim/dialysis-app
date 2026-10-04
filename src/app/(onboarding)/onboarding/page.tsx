import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { provisionInedUser } from "@/lib/ined";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Cadastrar clínica" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", data.user.id).maybeSingle();
  if (profile?.organization_id) redirect("/hoje");
  if (await provisionInedUser(data.user)) redirect("/hoje");
  return <OnboardingForm />;
}
