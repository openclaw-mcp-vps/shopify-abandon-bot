"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type Summary = {
  abandonedCarts: number;
  emailsSent: number;
  recoveredOrders: number;
  recoveredRevenue: number;
  conversionRate: number;
  estimatedUplift: number;
};

type SeriesPoint = {
  day: string;
  sent: number;
  recovered: number;
  revenue: number;
};

type VariantPoint = {
  variant: "A" | "B";
  sent: number;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
};

export function DashboardMetrics({
  summary,
  series,
  variants
}: {
  summary: Summary;
  series: SeriesPoint[];
  variants: VariantPoint[];
}) {
  const kpis = [
    {
      label: "Abandoned Carts Captured",
      value: summary.abandonedCarts.toLocaleString()
    },
    {
      label: "Recovery Emails Sent",
      value: summary.emailsSent.toLocaleString()
    },
    {
      label: "Recovered Orders",
      value: summary.recoveredOrders.toLocaleString()
    },
    {
      label: "Recovered Revenue",
      value: `$${summary.recoveredRevenue.toLocaleString(undefined, {
        maximumFractionDigits: 2
      })}`
    },
    {
      label: "Conversion Rate",
      value: `${summary.conversionRate.toFixed(1)}%`
    },
    {
      label: "Lift vs Shopify Default",
      value: `+${summary.estimatedUplift.toFixed(1)} pts`
    }
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[#8ea2c8]">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Daily Recovery Trend</h3>
            <span className="text-xs text-[#8ea2c8]">Last 14 days</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#9db0d1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9db0d1", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0f1725",
                    border: "1px solid #2a3445",
                    borderRadius: "10px"
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sent"
                  name="Emails Sent"
                  stroke="#29b6f6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="recovered"
                  name="Recovered Orders"
                  stroke="#61ffca"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">A/B Variant Performance</h3>
            <span className="text-xs text-[#8ea2c8]">Variant split metrics</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={variants}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="variant" tick={{ fill: "#9db0d1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9db0d1", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0f1725",
                    border: "1px solid #2a3445",
                    borderRadius: "10px"
                  }}
                />
                <Legend />
                <Bar dataKey="openRate" name="Open %" fill="#4fc3f7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="clickRate" name="Click %" fill="#80deea" radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="conversionRate"
                  name="Conversion %"
                  fill="#61ffca"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
