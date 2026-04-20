"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardStats } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function metricLabel(value: number, suffix = "%") {
  return `${value.toFixed(1)}${suffix}`;
}

export function StatsOverview({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-zinc-700 bg-zinc-900/70">
          <CardHeader>
            <CardDescription className="text-zinc-400">Emails sent</CardDescription>
            <CardTitle className="text-3xl text-zinc-100">{stats.sentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-zinc-700 bg-zinc-900/70">
          <CardHeader>
            <CardDescription className="text-zinc-400">Conversion rate</CardDescription>
            <CardTitle className="text-3xl text-zinc-100">
              {metricLabel(stats.conversionRate)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-zinc-700 bg-zinc-900/70">
          <CardHeader>
            <CardDescription className="text-zinc-400">
              Recovered revenue
            </CardDescription>
            <CardTitle className="text-3xl text-zinc-100">
              {money(stats.recoveredRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-zinc-700 bg-zinc-900/70">
          <CardHeader>
            <CardDescription className="text-zinc-400">Lift vs baseline</CardDescription>
            <CardTitle className="text-3xl text-emerald-300">
              {stats.liftVsShopifyBaseline.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-zinc-700 bg-zinc-900/70">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-zinc-100">14-day Recovery Trend</CardTitle>
            <CardDescription className="text-zinc-400">
              A/B split winner: {stats.bestVariant === "-" ? "not enough data" : `Variant ${stats.bestVariant}`}
            </CardDescription>
          </div>
          <Badge variant="secondary">Open {metricLabel(stats.openRate)}</Badge>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    color: "#e5e7eb",
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="converted"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
