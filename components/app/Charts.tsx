"use client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";

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

// Compact horizontal bars for the radar's small chart cards. Each bar is
// clickable so a category doubles as a filter on the company table.
export function MiniBars({
  data,
  onSelect,
  active,
  unit = "companies",
}: {
  data: { label: string; value: number; key?: string }[];
  onSelect?: (key: string) => void;
  active?: string | null;
  unit?: string;
}) {
  const height = Math.max(150, data.length * 30);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 40, left: 6, bottom: 2 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={118}
            tick={{ fontFamily: "var(--font-sans)", fontSize: 11, fill: "var(--text-body)" }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => [v.toLocaleString("en-GB"), unit]}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            cursor={onSelect ? "pointer" : undefined}
            onClick={(d: { payload?: { key?: string } }) => {
              const k = d?.payload?.key;
              if (onSelect && k) onSelect(k);
            }}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill="var(--accent)"
                fillOpacity={active && d.key === active ? 1 : active ? 0.32 : 1 - i * 0.08}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => v.toLocaleString("en-GB")}
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-muted)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLine({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div style={{ width: "100%", height: 170 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-hair)" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} interval={1} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={42} />
          <Tooltip
            cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "var(--text-muted)" }}
            formatter={(v: number) => [v.toLocaleString("en-GB"), "Incorporations"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
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
