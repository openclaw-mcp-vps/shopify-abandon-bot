import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Pricing | Shopify Abandon Bot",
  description:
    "Choose the plan that fits your Shopify growth stage. Start at $29/month and recover abandoned cart revenue with AI."
};

const planFeatures = [
  "AI-written subject + body for each abandoned cart",
  "Automatic A/B variant rotation",
  "Webhook-driven campaign orchestration",
  "Live conversion and recovered revenue metrics",
  "Email delivery via Resend"
] as const;

export default function PricingPage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-[var(--font-heading)] text-lg font-semibold text-white">
          Shopify Abandon Bot
        </Link>
        <Link href="/dashboard" className="text-sm text-zinc-300 hover:text-zinc-100">
          Dashboard
        </Link>
      </header>

      <section className="space-y-4 text-center">
        <h1 className="font-[var(--font-heading)] text-4xl font-bold text-white">Pricing that pays for itself fast</h1>
        <p className="mx-auto max-w-2xl text-zinc-300">
          If your store is already doing real volume, abandoned checkouts are likely your highest-leverage revenue fix. Pick a plan and go live today.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-sky-500/40 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="font-[var(--font-heading)] text-2xl">Starter Store</CardTitle>
            <p className="text-4xl font-bold text-white">$29<span className="text-base text-zinc-400">/month</span></p>
            <p className="text-sm text-zinc-300">Perfect for a single Shopify store at $5k+ monthly revenue.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-zinc-200">
              {planFeatures.map((feature) => (
                <li key={feature} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {feature}
                </li>
              ))}
            </ul>
            <a href={paymentLink}>
              <Button size="lg" className="w-full">
                Buy Starter Plan
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="border-zinc-700">
          <CardHeader>
            <CardTitle className="font-[var(--font-heading)] text-2xl">Scale Portfolio</CardTitle>
            <p className="text-4xl font-bold text-white">$99<span className="text-base text-zinc-400">/month</span></p>
            <p className="text-sm text-zinc-300">Manage up to five Shopify stores in one account with shared campaign insights.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-zinc-200">
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Everything in Starter
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Up to 5 connected stores
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Cross-store performance benchmarking
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Priority implementation support
              </li>
            </ul>
            <a href={paymentLink}>
              <Button size="lg" variant="secondary" className="w-full">
                Buy Scale Plan
              </Button>
            </a>
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-sm text-zinc-400">
        After checkout, open <Link href="/onboarding" className="text-sky-300">Onboarding</Link> to connect your store and unlock the dashboard.
      </p>
    </main>
  );
}
