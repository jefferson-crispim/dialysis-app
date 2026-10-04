type Props = { name: string; size?: number; filled?: boolean; className?: string };

/** Material Symbols Rounded. Decorativo: o texto ao lado (ou aria-label do botão) descreve a ação. */
export function Icon({ name, size = 24, filled = false, className = "" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded ${className}`}
      style={{ fontSize: size, fontVariationSettings: `"FILL" ${filled ? 1 : 0}` }}
    >
      {name}
    </span>
  );
}
