import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChartColumn,
  Mail,
  Radar,
  Sparkles,
  Store,
  Timer,
} from "lucide-react";

import { Pricing } from "@/components/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Shopify Abandon Bot — AI-personalized abandon-cart emails",
  description:
    "Connect Shopify and recover abandoned checkouts with AI-personalized email copy and automatic A/B testing.",
};

const problems = [
  {
    title: "Generic templates underperform",
    body: "Most default abandon-cart emails look identical across stores, so they get ignored. Conversion usually stalls around 8-12%.",
    icon: Mail,
  },
  {
    title: "No behavior context",
    body: "Built-in automations rarely use product intent signals like viewed collections, compared variants, or onsite journey patterns.",
    icon: Radar,
  },
  {
    title: "No experimentation loop",
    body: "Without continuous A/B testing, teams guess at subject lines instead of learning what actually converts by customer segment.",
    icon: Timer,
  },
];

const solutions = [
  {
    title: "Shopify webhook ingestion",
    body: "Checkout-abandonment events flow into the app in real time. Cart details and behavior signals are normalized instantly.",
    icon: Store,
  },
  {
    title: "AI email generation",
    body: "Each cart gets two personalized variants tuned to product mix, cart value, and customer browsing context.",
    icon: Bot,
  },
  {
    title: "Automatic A/B optimization",
    body: "Variant assignment, send tracking, and conversion reporting run automatically so the best style wins over time.",
    icon: ChartColumn,
  },
];

const faqs = [
  {
    q: "How quickly can we launch on a live store?",
    a: "Most teams go live in under 20 minutes. Add the Shopify app, set your webhook, and connect Lemon Squeezy billing. Recovery starts as soon as checkout events arrive.",
  },
  {
    q: "Do you require changing our ESP?",
    a: "No. The app can send through your SMTP provider, and you can keep existing transactional infrastructure while adding AI recovery flows.",
  },
  {
    q: "What counts as a converted abandoned cart?",
    a: "When a tracked abandoned checkout later appears as a completed Shopify order with matching cart token or customer email, it is marked as recovered revenue.",
  },
  {
    q: "Can agencies manage multiple stores?",
    a: "Yes. The $99/mo Agency plan supports up to five stores and central performance monitoring across clients.",
  },
];

export default function Home(): React.JSX.Element {
  return (
    <main className="relative overflow-x-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(63,185,80,0.18),rgba(13,17,23,0))]" />

      <section className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-20 pt-14 sm:px-6 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mx-auto mb-5">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            AI-personalized abandon-cart emails, benchmarked at 28-32% conversion
          </Badge>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Shopify Abandon Bot helps stores recover revenue with personalized emails that convert.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-[#8b949e] md:text-xl">
            Connect Shopify once. The bot reads cart contents and customer behavior, writes personalized subject lines + body copy, and auto-runs A/B tests to find the winning variant.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="#pricing">
                Start Recovering Carts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-[#8b949e]">Typical default recovery rate</p>
                <p className="mt-2 text-3xl font-bold text-[#f0f6fc]">~10%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-[#8b949e]">AI-personalized benchmark</p>
                <p className="mt-2 text-3xl font-bold text-[#84f6a0]">28-32%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-[#8b949e]">Plan starts at</p>
                <p className="mt-2 text-3xl font-bold text-[#f0f6fc]">$29/mo</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold md:text-3xl">The expensive problem</h2>
          <p className="mt-2 max-w-3xl text-[#8b949e]">
            High-intent shoppers abandon checkout, but the standard follow-up feels generic. Every missed recovery email leaves margin on the table.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {problems.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="h-5 w-5 text-[#f0883e]" />
                <CardTitle className="pt-2 text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold md:text-3xl">How Shopify Abandon Bot solves it</h2>
          <p className="mt-2 max-w-3xl text-[#8b949e]">
            The stack combines webhook-driven data, AI generation, and conversion measurement so you can improve abandoned-cart performance continuously.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {solutions.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="h-5 w-5 text-[#3fb950]" />
                <CardTitle className="pt-2 text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-[#3fb950]/35 bg-[#0f141d]">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold">Connect Shopify in one step</h3>
            <p className="mt-2 text-sm text-[#8b949e]">
              Enter your `.myshopify.com` domain to start installation and webhook authorization.
            </p>
            <form action="/api/shopify/install" method="GET" className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                name="shop"
                required
                placeholder="your-brand.myshopify.com"
                className="h-11 flex-1 rounded-lg border border-[#30363d] bg-[#151b23] px-3 text-sm outline-none transition focus:border-[#3fb950]"
              />
              <Button type="submit" className="h-11">
                Connect Shopify
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Pricing className="mx-auto w-full px-4 pb-16 sm:px-6" />

      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6" id="faq">
        <div className="mb-6">
          <h2 className="text-2xl font-bold md:text-3xl">Frequently asked questions</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">{faq.a}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
