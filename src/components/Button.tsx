import Link from "next/link";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:brightness-110",
  secondary: "border border-line bg-card text-ink hover:bg-brand-soft",
  ghost: "text-brand hover:bg-brand-soft",
};

type Common = { icon?: string; variant?: Variant; className?: string; children: React.ReactNode };

export function LinkButton({ href, icon, variant = "primary", className = "", children }: Common & { href: string }) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </Link>
  );
}

export function Button({
  icon,
  variant = "primary",
  className = "",
  children,
  ...rest
}: Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}
