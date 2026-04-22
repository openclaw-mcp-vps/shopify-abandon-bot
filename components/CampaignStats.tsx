import { BarChart3, DollarSign, Mail, MousePointerClick, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  totalCampaigns: number;
  sentCampaigns: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  recoveredRevenue: number;
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function CampaignStats({ stats }: { stats: Stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Mail className="h-4 w-4" />
            Campaigns Sent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-white">{stats.sentCampaigns}</p>
          <p className="text-xs text-zinc-400">out of {stats.totalCampaigns} generated</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Sparkles className="h-4 w-4" />
            Open Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-white">{pct(stats.openRate)}</p>
          <p className="text-xs text-zinc-400">benchmark: 35%+</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <MousePointerClick className="h-4 w-4" />
            Click Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-white">{pct(stats.clickRate)}</p>
          <p className="text-xs text-zinc-400">A/B optimized weekly</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <BarChart3 className="h-4 w-4" />
            Conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-white">{pct(stats.conversionRate)}</p>
          <p className="text-xs text-zinc-400">target: 28-32%</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <DollarSign className="h-4 w-4" />
            Recovered Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-emerald-300">{money(stats.recoveredRevenue)}</p>
          <p className="text-xs text-zinc-400">attributed to campaign clicks</p>
        </CardContent>
      </Card>
    </section>
  );
}
