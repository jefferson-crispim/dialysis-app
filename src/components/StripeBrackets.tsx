import { useId } from "react";

const BANDS = ["var(--teal)", "var(--sun)", "var(--coral)", "var(--sky)", "var(--leaf)", "var(--sun)", "var(--coral)", "var(--sky)"];

function Bracket({ mirrored, height }: { mirrored?: boolean; height: number }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 160"
      height={height}
      width={(height * 48) / 160}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      className="shrink-0"
    >
      <defs>
        <clipPath id={id}>
          <path d="M42 4 C-4 34 -4 126 42 156 C22 120 22 40 42 4 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <g transform="rotate(-24 24 80)">
          {BANDS.map((c, i) => (
            <rect key={i} x="-30" y={-30 + i * 26} width="110" height="26" fill={c} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** Os colchetes listrados da identidade visual, emoldurando um conteúdo. */
export function BracketFrame({ children, height = 120, className = "" }: { children: React.ReactNode; height?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Bracket height={height} />
      <div className="min-w-0 flex-1">{children}</div>
      <Bracket height={height} mirrored />
    </div>
  );
}

export function BracketMark({ height = 36 }: { height?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Bracket height={height} />
      <Bracket height={height} mirrored />
    </span>
  );
}
