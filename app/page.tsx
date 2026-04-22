import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqItems = [
  {
    question: "How quickly can I launch this on my Shopify store?",
    answer:
      "Most stores are live in under 15 minutes. Connect Shopify, enable the webhook, and the bot starts generating personalized recovery emails immediately."
  },
  {
    question: "What data does the AI use to personalize each email?",
    answer:
      "The model reads abandoned cart items, product/category history, and recent browsing behavior. It writes copy with the exact products and likely objections in mind."
  },
  {
    question: "Can I see whether A or B variants are actually winning?",
    answer:
      "Yes. The dashboard tracks sends, opens, clicks, conversions, and revenue recovery per test cohort so you can keep what performs and drop what does not."
  },
  {
    question: "What if my store already has a Klaviyo flow?",
    answer:
      "Use Shopify Abandon Bot as a focused, high-intent recovery layer. Many stores keep Klaviyo for broad lifecycle messaging and use this for pure abandonment lift."
  }
] as const;

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-10 sm:px-10">
      <header className="flex items-center justify-between">
        <p className="font-[var(--font-heading)] text-lg font-semibold tracking-wide text-zinc-100">
          Shopify Abandon Bot
        </p>
        <nav className="flex items-center gap-3 text-sm text-zinc-300">
          <Link href="/pricing" className="hover:text-zinc-100">
            Pricing
          </Link>
          <Link href="/onboarding" className="hover:text-zinc-100">
            Onboarding
          </Link>
          <Link href="/dashboard" className="hover:text-zinc-100">
            Dashboard
          </Link>
        </nav>
      </header>

      <section className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI-personalized abandon-cart recovery for Shopify
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl font-bold leading-tight text-white sm:text-5xl">
            Shopify Abandon Bot, personalized recovery emails that convert 3x better
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-300">
            Default abandon flows recover around 10% of carts. This bot analyzes product mix, cart value, and browsing behavior to generate conversion-focused copy that routinely lands in the 28-32% range.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={paymentLink}>
              <Button size="lg" className="w-full sm:w-auto">
                Start Recovering Revenue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <Link href="/onboarding">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Connect Shopify
              </Button>
            </Link>
          </div>
          <p className="text-sm text-zinc-400">
            Built for Shopify stores already doing $5k+/month that want immediate abandoned-cart lift.
          </p>
        </div>

        <Card className="border-sky-500/30 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="font-[var(--font-heading)] text-2xl">Expected Impact</CardTitle>
            <CardDescription>Conservative math for a store with 1,000 abandon sessions/month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-zinc-400">Default Shopify emails (10%)</p>
              <p className="text-xl font-semibold text-zinc-100">100 recovered carts</p>
            </div>
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-emerald-300">AI-personalized bot (30%)</p>
              <p className="text-xl font-semibold text-emerald-200">300 recovered carts</p>
            </div>
            <p className="text-zinc-300">
              Even at $45 average order value, that’s about <span className="font-semibold text-emerald-200">$9,000 extra monthly revenue</span> from the same traffic.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-700">
          <CardHeader>
            <CardTitle className="font-[var(--font-heading)] text-lg">The Problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>Generic abandon emails sound robotic and fail to address cart-specific intent.</p>
            <p>Most stores run one static template for every shopper and leave revenue on the table.</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-700">
          <CardHeader>
            <CardTitle className="font-[var(--font-heading)] text-lg">The Solution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>AI writes two high-performing variants per cart based on real product and browsing data.</p>
            <p>Automatic A/B routing continuously finds stronger copy for each segment.</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-700">
          <CardHeader>
            <CardTitle className="font-[var(--font-heading)] text-lg">The Outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>Higher open rates, better clicks, and meaningfully higher conversion on abandoned checkout traffic.</p>
            <p>The monthly gain typically dwarfs the $29 subscription cost.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="font-[var(--font-heading)] text-3xl font-semibold text-white">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg">1. Capture abandonment events</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Shopify webhooks stream abandoned cart payloads with line items, cart totals, and customer identifiers.
            </CardContent>
          </Card>
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg">2. Generate targeted copy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              The AI model creates two purchase-focused variants tuned to specific products and behavior hints.
            </CardContent>
          </Card>
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg">3. Send and optimize</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Campaigns are delivered through your email provider and measured in a dashboard built for revenue outcomes.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[var(--font-heading)] text-3xl font-semibold">Simple pricing for revenue recovery</h2>
            <p className="mt-2 text-zinc-300">$29/month for one store, or $99/month for up to five stores.</p>
          </div>
          <a href={paymentLink}>
            <Button size="lg">
              Buy Now
              <Zap className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
        <div className="mt-5 grid gap-2 text-sm text-zinc-300">
          <p className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            Unlimited abandoned-cart campaigns
          </p>
          <p className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            AI subject + body generation with A/B rotation
          </p>
          <p className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            Conversion and recovered-revenue tracking dashboard
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-[var(--font-heading)] text-3xl font-semibold">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <Card key={item.question} className="border-zinc-700">
              <CardHeader>
                <CardTitle className="text-base">{item.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-300">{item.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
