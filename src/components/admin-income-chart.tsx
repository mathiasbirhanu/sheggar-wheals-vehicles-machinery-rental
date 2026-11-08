"use client";
// Admin income chart (FR-44): monthly platform income vs owner income, side by side.
// Two separate series on purpose — they are NEVER stacked into one "total" bar,
// because platform income (the 10% service fee) belongs to the admin while owner
// income belongs to the car owner. Follows the safe recharts pattern of
// earnings-chart.tsx (simple props only — no recharts types imported).
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type AdminIncomePoint = { month: string; platform: number; owner: number };

export function AdminIncomeChart({ data }: { data: AdminIncomePoint[] }) {
  if (data.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">No released payments yet — the income chart will appear here.</p>;
  }
  return (
    <div className="h-72 w-full" role="img" aria-label="Monthly platform income versus owner income bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
          <Tooltip formatter={(v, n) => [`ETB ${Number(v).toLocaleString()}`, String(n)]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {/* amber = the admin's cut, green = owners' cut — matches KPI card accents below */}
          <Bar dataKey="platform" name="Platform income" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="owner" name="Owner income" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
