"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenuePoint = { date: string; total: number };

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const total = data.reduce((sum, p) => sum + p.total, 0);

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No payments in the last 30 days.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`$${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type StagePoint = { key: string; label: string; color: string; count: number; value: number };

export function PipelineChart({ data }: { data: StagePoint[] }) {
  const hasDeals = data.some((d) => d.count > 0);

  if (!hasDeals) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No deals yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, _name: any, props: any) => [
            `${value} deal${value === 1 ? "" : "s"} · $${Number(props.payload.value).toLocaleString()}`,
            props.payload.label,
          ]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
