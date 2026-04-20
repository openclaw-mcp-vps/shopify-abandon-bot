"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function planCheckoutUrl(plan: "starter" | "scale") {
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!storeId || !productId) {
    return "/onboarding";
  }

  const url = new URL(`https://checkout.lemonsqueezy.com/buy/${productId}`);
  url.searchParams.set("embed", "1");
  url.searchParams.set("media", "0");
  url.searchParams.set("logo", "0");
  url.searchParams.set("checkout[custom][store_id]", storeId);
  url.searchParams.set("checkout[custom][plan]", plan);
  url.searchParams.set("checkout[custom][source]", "landing-pricing");

  return url.toString();
}

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,0.2),transparent_40%),radial-gradient(circle_at_80%_40%,rgba(14,165,233,0.18),transparent_38%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <motion.section
          initial="hidden"
          animate="show"
          transition={{ duration: 0.5 }}
          variants={reveal}
          className="grid items-center gap-10 pt-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-7">
            <Badge variant="secondary" className="text-emerald-200">
              Ecom lifecycle automation
            </Badge>
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-6xl">
              Shopify Abandon Bot
              <span className="block text-emerald-300">
                AI-personalized abandon-cart emails with 3x higher conversion
              </span>
            </h1>
            <p className="max-w-xl text-lg text-zinc-300">
              Connect your Shopify store, let AI read cart and browsing behavior,
              and send personalized recovery emails that consistently beat
              Shopify defaults.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={planCheckoutUrl("starter")}
                className="lemonsqueezy-button"
              >
                <Button size="lg" className="w-full sm:w-auto">
                  Start Recovering Revenue
                </Button>
              </a>
              <Link href="/onboarding" className="sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  Connect Shopify
                </Button>
              </Link>
            </div>
            <p className="text-sm text-zinc-400">
              Default abandon emails average about 10% conversion. Personalized
              campaigns here benchmark 28-32%, turning abandoned carts into
              recovered revenue fast.
            </p>
          </div>

          <Card className="border border-zinc-700/80 bg-zinc-900/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-zinc-100">Recovery Snapshot</CardTitle>
              <CardDescription className="text-zinc-400">
                Typical first month for stores doing $5k+ monthly revenue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-400">Recovered Revenue</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  +$2,460
                </p>
                <p className="text-sm text-zinc-500">from 84 recovered carts</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-700 p-3">
                  <p className="text-xs text-zinc-500">Open Rate</p>
                  <p className="text-xl font-semibold text-zinc-100">61%</p>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3">
                  <p className="text-xs text-zinc-500">Click Rate</p>
                  <p className="text-xl font-semibold text-zinc-100">38%</p>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3">
                  <p className="text-xs text-zinc-500">Conversion</p>
                  <p className="text-xl font-semibold text-zinc-100">30%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          variants={reveal}
          className="space-y-6"
        >
          <h2 className="font-heading text-3xl font-semibold text-zinc-100">
            Why most Shopify abandon flows leave money on the table
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border border-zinc-700/80 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Generic Subject Lines</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400">
                Every shopper gets the same reminder, even if they looked at
                premium bundles or returned to the same product page three times.
              </CardContent>
            </Card>
            <Card className="border border-zinc-700/80 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">No Behavioral Context</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400">
                Standard templates ignore browsing signals and fail to address
                what actually blocked checkout.
              </CardContent>
            </Card>
            <Card className="border border-zinc-700/80 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">No Iteration Loop</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400">
                Without automated A/B testing, stores cannot systematically
                improve conversion and recover more revenue week over week.
              </CardContent>
            </Card>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          variants={reveal}
          className="space-y-6"
        >
          <h2 className="font-heading text-3xl font-semibold text-zinc-100">
            How Shopify Abandon Bot Works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border border-zinc-700 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">1. Connect Shopify</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400">
                Secure OAuth setup and webhook sync capture checkout abandonment
                events and cart details in real time.
              </CardContent>
            </Card>
            <Card className="border border-zinc-700 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">2. AI Personalizes Copy</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400">
                The AI model reads products, order value, and browsing behavior
                to write two tailored variants per shopper.
              </CardContent>
            </Card>
            <Card className="border border-zinc-700 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">3. Auto A/B Testing</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400">
                Variant routing runs automatically, then performance telemetry
                identifies the winner and tracks recovered revenue.
              </CardContent>
            </Card>
          </div>
        </motion.section>

        <motion.section
          id="pricing"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          variants={reveal}
          className="space-y-6"
        >
          <h2 className="font-heading text-3xl font-semibold text-zinc-100">
            Pricing That Pays for Itself Quickly
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border border-emerald-500/40 bg-zinc-900/80">
              <CardHeader>
                <CardTitle className="text-zinc-100">Starter</CardTitle>
                <CardDescription className="text-zinc-300">
                  For solo store owners doing $5k+ monthly revenue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-4xl font-semibold text-emerald-300">$29/mo</p>
                <ul className="space-y-2 text-zinc-300">
                  <li>AI subject + body personalization</li>
                  <li>Automated A/B split for all abandon flows</li>
                  <li>Conversion and recovered revenue dashboard</li>
                </ul>
                <a
                  href={planCheckoutUrl("starter")}
                  className="lemonsqueezy-button block"
                >
                  <Button className="w-full">Choose Starter</Button>
                </a>
              </CardContent>
            </Card>

            <Card className="border border-zinc-700 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Scale</CardTitle>
                <CardDescription className="text-zinc-300">
                  For operators managing multiple storefronts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-4xl font-semibold text-zinc-100">$99/mo</p>
                <ul className="space-y-2 text-zinc-300">
                  <li>Everything in Starter</li>
                  <li>Up to 5 connected stores</li>
                  <li>Cross-store performance benchmarking</li>
                </ul>
                <a
                  href={planCheckoutUrl("scale")}
                  className="lemonsqueezy-button block"
                >
                  <Button variant="secondary" className="w-full">
                    Choose Scale
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          variants={reveal}
          className="space-y-6"
        >
          <h2 className="font-heading text-3xl font-semibold text-zinc-100">FAQ</h2>
          <div className="space-y-3">
            <Card className="border border-zinc-700/80 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">How fast can I launch?</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300">
                Most stores connect Shopify and enable webhooks in under 15
                minutes. Emails start going out as soon as abandonment events
                come in.
              </CardContent>
            </Card>
            <Card className="border border-zinc-700/80 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">
                  Do I need technical skills to run A/B testing?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300">
                No. Variant assignment and reporting are fully automated. You only
                review performance and recovered revenue.
              </CardContent>
            </Card>
            <Card className="border border-zinc-700/80 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">What if my store uses Klaviyo?</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300">
                You can still use this tool to generate high-performing copy and
                route output into your existing email stack while keeping webhook
                attribution centralized.
              </CardContent>
            </Card>
          </div>
        </motion.section>

        <footer className="flex flex-col items-start justify-between gap-4 border-t border-zinc-800 pt-8 text-sm text-zinc-400 sm:flex-row sm:items-center">
          <p>Shopify Abandon Bot</p>
          <div className="flex items-center gap-4">
            <Link href="/onboarding" className="hover:text-zinc-200">
              Onboarding
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-200">
              Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
