"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Campaign, CampaignSummary } from "@/lib/types";

interface CampaignAnalyticsProps {
  campaigns: Campaign[];
  summary: CampaignSummary;
}

function formatDay(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

export function CampaignAnalytics({ campaigns, summary }: CampaignAnalyticsProps) {
  const chartData = useMemo(() => {
    const grouped = new Map<string, { date: string; sent: number; converted: number }>();

    campaigns.forEach((campaign) => {
      const key = campaign.generatedAt.slice(0, 10);
      const existing = grouped.get(key) || { date: formatDay(campaign.generatedAt), sent: 0, converted: 0 };
      if (["sent", "opened", "converted"].includes(campaign.status)) {
        existing.sent += 1;
      }
      if (campaign.status === "converted") {
        existing.converted += 1;
      }
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-14)
      .map(([, value]) => value);
  }, [campaigns]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#111827d8] p-5">
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Sent</p>
          <p className="mt-1 text-2xl font-semibold text-white">{summary.totalSent}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Converted</p>
          <p className="mt-1 text-2xl font-semibold text-white">{summary.totalConverted}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Conversion Rate</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">{summary.conversionRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Recovered Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">${summary.totalRecoveredRevenue.toFixed(2)}</p>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">14-Day Send vs Conversion Trend</h2>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#1f2937",
                borderRadius: "10px",
                color: "#e2e8f0"
              }}
            />
            <Legend />
            <Bar dataKey="sent" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="converted" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          Variant A conversion: <span className="font-semibold text-white">{summary.variantAConversionRate.toFixed(1)}%</span>
        </p>
        <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          Variant B conversion: <span className="font-semibold text-white">{summary.variantBConversionRate.toFixed(1)}%</span>
        </p>
      </div>
    </section>
  );
}
