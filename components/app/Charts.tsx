"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

const AXIS = { fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-faint)" };

const tooltipStyle = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-hair)",
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text-strong)",
  boxShadow: "var(--shadow-ink-md)",
};

export function IncorporationTrend({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} interval={1} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "var(--text-muted)" }}
            formatter={(v: number) => [`${v} (index)`, "Incorporations"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="var(--accent)" maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SectorBars({ data }: { data: { name: string; count: number }[] }) {
  const height = Math.max(180, data.length * 34);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={150}
            tick={{ fontFamily: "var(--font-sans)", fontSize: 12, fill: "var(--text-body)" }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => [v.toLocaleString("en-GB"), "Active companies"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--accent)" fillOpacity={1 - i * 0.07} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(v: number) => v.toLocaleString("en-GB")}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
