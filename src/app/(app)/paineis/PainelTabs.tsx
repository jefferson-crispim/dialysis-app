"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const TABS = [
  { href: "/paineis/qualidade", label: "Qualidade da diálise", icon: "verified" },
  { href: "/paineis/bcm", label: "Composição corporal", icon: "monitor_weight" },
  { href: "/paineis/laboratorial", label: "Laboratório", icon: "biotech" },
];

export function PainelTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Painéis" className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold ${
              active ? "border-brand bg-brand text-brand-ink" : "border-line bg-card hover:bg-brand-soft"
            }`}
          >
            <Icon name={t.icon} size={20} /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
