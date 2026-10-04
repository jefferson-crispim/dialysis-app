import Link from "next/link";
import { FORMS } from "@/lib/forms";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Lançar" };

export default function LancarPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">O que você vai registrar?</h1>
        <p className="mt-1 text-muted">Escolha o tipo de registro. Você escolhe o paciente no próximo passo.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FORMS.map((f) => (
          <li key={f.slug}>
            <Link
              href={`/lancar/${f.slug}`}
              className="flex h-full min-h-20 items-start gap-4 rounded-[var(--radius)] border border-line bg-card p-4 hover:bg-brand-soft"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon name={f.icon} />
              </span>
              <span>
                <span className="block text-lg font-bold">{f.title}</span>
                <span className="block text-sm text-muted">{f.description}</span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/importar"
            className="flex h-full min-h-20 items-start gap-4 rounded-[var(--radius)] border border-dashed border-line bg-card p-4 hover:bg-brand-soft"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon name="upload_file" />
            </span>
            <span>
              <span className="block text-lg font-bold">Muitos registros de uma vez</span>
              <span className="block text-sm text-muted">Importe uma planilha modelo com pacientes, Kt/V, BCM, exames e mais.</span>
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
