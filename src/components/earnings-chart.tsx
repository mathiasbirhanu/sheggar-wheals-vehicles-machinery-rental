"use client";
// Monthly earnings chart (FR-37) + accessible data table is rendered by the page itself.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EarningsChart({ data }: { data: { month: string; earnings: number }[] }) {
  if (data.length === 0) return <p className="p-8 text-center text-sm text-muted-foreground">No completed trips yet — your earnings chart will appear here.</p>;
  return (
    <div className="h-64 w-full" role="img" aria-label="Monthly earnings bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
          <Tooltip formatter={(v) => [`ETB ${Number(v).toLocaleString()}`, "Earnings"]} />
          <Bar dataKey="earnings" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
