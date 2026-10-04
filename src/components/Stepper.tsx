import { Icon } from "./Icon";

/** Indicador de passos dos assistentes (lançar, importar). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Etapas">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={`grid size-7 place-items-center rounded-full text-sm font-bold ${
                done ? "bg-leaf text-[#10300f]" : active ? "bg-brand text-brand-ink" : "border border-line text-muted"
              }`}
            >
              {done ? <Icon name="check" size={18} /> : i + 1}
            </span>
            <span className={`text-[15px] ${active ? "font-bold" : "text-muted"}`}>{label}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-5 bg-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
