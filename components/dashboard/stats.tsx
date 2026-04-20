"use client";

import { BarChart3, DollarSign, Mail, TrendingUp, UserMinus } from "lucide-react";
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
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type VariantStats = {
  variant: "A" | "B";
  sent: number;
  converted: number;
  conversionRate: number;
};

type TimelinePoint = {
  day: string;
  sent: number;
  converted: number;
  revenue: number;
};

type DashboardStatsProps = {
  stats: {
    totalAbandoned: number;
    emailsSent: number;
    converted: number;
    recoveredRevenue: number;
    averageCartValue: number;
    conversionRate: number;
    variantStats: VariantStats[];
    timeline: TimelinePoint[];
  };
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function metricCards(stats: DashboardStatsProps["stats"]): Array<{
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
}> {
  return [
    {
      title: "Abandoned checkouts",
      value: stats.totalAbandoned.toLocaleString(),
      icon: UserMinus,
      detail: "Captured from Shopify webhook events",
    },
    {
      title: "Recovery emails sent",
      value: stats.emailsSent.toLocaleString(),
      icon: Mail,
      detail: "AI-personalized variants delivered",
    },
    {
      title: "Recovered revenue",
      value: formatCurrency(stats.recoveredRevenue),
      icon: DollarSign,
      detail: `Avg cart ${formatCurrency(stats.averageCartValue)}`,
    },
    {
      title: "Recovery conversion rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      detail: `${stats.converted} converted carts`,
    },
  ];
}

export function DashboardStats({ stats }: DashboardStatsProps): React.JSX.Element {
  const cards = metricCards(stats);

  const variantChart = stats.variantStats.map((item) => ({
    variant: item.variant,
    sent: item.sent,
    converted: item.converted,
    conversionRate: Number(item.conversionRate.toFixed(1)),
  }));

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardDescription className="text-xs uppercase tracking-wide text-[#8b949e]">
                {card.title}
              </CardDescription>
              <card.icon className="h-4 w-4 text-[#8b949e]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#f0f6fc]">{card.value}</div>
              <p className="mt-1 text-xs text-[#8b949e]">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-4 w-4 text-[#3fb950]" />
              Daily sends vs conversions
            </CardTitle>
            <CardDescription>Last active days from tracked campaigns</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {stats.timeline.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#8b949e]">
                No send data yet. Fire a Shopify webhook to start tracking.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeline} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#8b949e" fontSize={12} />
                  <YAxis stroke="#8b949e" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f141d",
                      border: "1px solid #30363d",
                      borderRadius: 12,
                      color: "#f0f6fc",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="#58a6ff"
                    strokeWidth={2}
                    dot={false}
                    name="Sent"
                  />
                  <Line
                    type="monotone"
                    dataKey="converted"
                    stroke="#3fb950"
                    strokeWidth={2}
                    dot={false}
                    name="Converted"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Variant A/B performance</CardTitle>
            <CardDescription>Compare send and conversion counts by variant</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={variantChart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
                <XAxis dataKey="variant" stroke="#8b949e" fontSize={12} />
                <YAxis stroke="#8b949e" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0f141d",
                    border: "1px solid #30363d",
                    borderRadius: 12,
                    color: "#f0f6fc",
                  }}
                />
                <Legend />
                <Bar dataKey="sent" fill="#58a6ff" radius={6} name="Sent" />
                <Bar dataKey="converted" fill="#3fb950" radius={6} name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
