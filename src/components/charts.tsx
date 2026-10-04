"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

const AXIS = { fontSize: 12, fill: "var(--muted)" } as const;
const TIP = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)" },
  labelStyle: { color: "var(--ink)", fontWeight: 700 },
  itemStyle: { color: "var(--ink)" },
} as const;

/** Barras de uma só cor: a identidade vem do rótulo no eixo, não da cor. */
export function BarList({ data, unit = "pacientes" }: { data: { label: string; value: number }[]; unit?: string }) {
  return (
    <div role="img" aria-label={`Gráfico de barras: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`} className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={150} tick={{ ...AXIS, fill: "var(--ink)" }} axisLine={false} tickLine={false} />
          <Tooltip {...TIP} cursor={{ fill: "var(--brand-soft)" }} formatter={(v) => [`${v} ${unit}`, ""]} separator="" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((d) => (
              <Cell key={d.label} fill="var(--brand)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Série mensal com faixa-meta sombreada. Pontos fora da meta ficam coral (e a contagem aparece no cartão). */
export function TrendWithTarget({
  data,
  band,
  unit,
  name,
}: {
  data: { month: string; value: number; out: boolean }[];
  band: [number, number];
  unit: string;
  name: string;
}) {
  const values = data.map((d) => d.value);
  const lo = Math.min(band[0], ...values);
  const hi = Math.max(band[1], ...values);
  const pad = (hi - lo) * 0.15 || 1;
  return (
    <div role="img" aria-label={`Curva de ${name}, meta ${band[0]} a ${band[1]} ${unit}`} className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tick={AXIS} axisLine={false} tickLine={false} width={44} />
          <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--leaf)" fillOpacity={0.16} ifOverflow="extendDomain" />
          <Tooltip {...TIP} formatter={(v) => [`${v} ${unit}`, name]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--brand)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(p) => {
              const { cx, cy, payload, index } = p as { cx: number; cy: number; payload: { out: boolean }; index: number };
              return (
                <circle key={index} cx={cx} cy={cy} r={4.5} fill={payload.out ? "var(--coral)" : "var(--brand)"} stroke="var(--card)" strokeWidth={2} />
              );
            }}
            activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
