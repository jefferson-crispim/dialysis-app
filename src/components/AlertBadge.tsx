import { Icon } from "./Icon";
import type { Severity } from "@/lib/clinical/alerts";

const STYLE: Record<Severity | "ok", { box: string; icon: string; label: string }> = {
  critico: { box: "bg-crit-bg text-crit-ink", icon: "error", label: "Crítico" },
  atencao: { box: "bg-warn-bg text-warn-ink", icon: "warning", label: "Atenção" },
  info: { box: "bg-info-bg text-info-ink", icon: "info", label: "Informação" },
  ok: { box: "bg-ok-bg text-ok-ink", icon: "check_circle", label: "Na meta" },
};

/** Ícone + texto: a severidade nunca depende só da cor. */
export function AlertBadge({ severity, children }: { severity: Severity | "ok"; children?: React.ReactNode }) {
  const s = STYLE[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${s.box}`}>
      <Icon name={s.icon} size={18} filled />
      {children ?? s.label}
    </span>
  );
}
