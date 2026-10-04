import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { FORM_BY_SLUG, type PatientLite } from "@/lib/forms";
import { RecordWizard } from "@/components/RecordWizard";
import { Icon } from "@/components/Icon";

export default async function LancarTipoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tipo: string }>;
  searchParams: Promise<{ paciente?: string }>;
}) {
  const { tipo } = await params;
  const { paciente } = await searchParams;
  const def = FORM_BY_SLUG[tipo];
  if (!def) notFound();

  const { supabase, orgId } = await requireSession();
  const { data } = await supabase.from("patients").select("id,name,modality").eq("status", "ATIVO").order("name");
  const patients = (data ?? []) as PatientLite[];
  const initial = patients.some((p) => p.id === paciente) ? paciente : undefined;

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <Icon name={def.icon} />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold">{def.title}</h1>
          <p className="text-muted">{def.description}</p>
        </div>
      </div>
      <RecordWizard slug={def.slug} orgId={orgId} patients={patients} initialPatientId={initial} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  return { title: FORM_BY_SLUG[tipo]?.title ?? "Lançar" };
}
