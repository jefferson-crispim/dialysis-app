"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** `mobile: false` tira o item da barra inferior (6 itens cabem; o resto fica só no menu lateral). */
export const NAV: { href: string; label: string; icon: string; mobile?: boolean }[] = [
  { href: "/hoje", label: "Hoje", icon: "today" },
  { href: "/pacientes", label: "Pacientes", icon: "groups" },
  { href: "/enfermagem", label: "Enfermagem", icon: "clinical_notes" },
  { href: "/lancar", label: "Lançar", icon: "add_circle" },
  { href: "/paineis", label: "Painéis", icon: "monitoring" },
  { href: "/importar", label: "Importar", icon: "upload_file", mobile: false },
  { href: "/ajustes", label: "Ajustes", icon: "settings" },
];

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[15px] font-semibold ${
              active ? "bg-brand text-brand-ink" : "text-ink hover:bg-brand-soft"
            }`}
          >
            <Icon name={n.icon} filled={active} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV.filter((n) => n.mobile !== false).map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}
          >
            <Icon name={n.icon} size={24} filled={active} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
