import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { AssessmentWizard } from "@/components/AssessmentWizard";
import { Icon } from "@/components/Icon";
import { footAnswersFromRow, prefillOnly, rowToAnswers } from "@/lib/clinical/nursing/questionnaire";

export const metadata = { title: "Avaliação de enfermagem" };

export default async function AvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, orgId, user, role } = await requireSession();
  if (role === "viewer") redirect(`/pacientes/${id}/processo`);

  const { data: p } = await supabase.from("patients").select("id,name,gender,diabetic").eq("id", id).maybeSingle();
  if (!p) notFound();

  const [asmR, footR] = await Promise.all([
    supabase.from("nursing_assessments").select("*").eq("patient_id", id).order("date", { ascending: false }).limit(1),
    supabase.from("diabetic_foot_screenings").select("*").eq("patient_id", id).order("date", { ascending: false }).limit(1),
  ]);
  const prev = (asmR.data ?? [])[0] ?? null;
  const prevFoot = (footR.data ?? [])[0] ?? null;

  const reference = { ...rowToAnswers(prev), ...footAnswersFromRow(prevFoot) };
  const prefillDate = (prev?.date ?? prevFoot?.date ?? null) as string | null;

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/pacientes/${p.id}/processo`} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Icon name="arrow_back" size={18} /> Processo de enfermagem
        </Link>
        <h1 className="text-3xl font-extrabold">Avaliação de enfermagem</h1>
        <p className="mt-1 text-muted">Histórico e exame físico em etapas. Ao final, o app mostra os alertas de risco e os diagnósticos sugeridos.</p>
      </div>
      <AssessmentWizard
        ctx={{ diabetic: p.diabetic === true, gender: p.gender === "M" || p.gender === "F" ? p.gender : null }}
        patient={{ id: p.id as string, name: p.name as string }}
        orgId={orgId}
        userId={user.id}
        prefill={prefillOnly(reference)}
        prefillDate={prefillDate}
        reference={reference}
      />
    </div>
  );
}
