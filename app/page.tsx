import type { Metadata } from "next";
import Link from "next/link";

import { Pricing } from "@/components/pricing";

export const metadata: Metadata = {
  title: "Shopify Abandon Bot — AI-personalized abandon-cart emails",
  description:
    "Increase abandoned-cart conversions to 28-32% with AI-generated subject lines and body copy built from Shopify cart and browsing behavior."
};

const problems = [
  {
    title: "Default cart recovery emails are too generic",
    body: "Most stores send one static template to every shopper. It ignores browsing intent, product category context, and price sensitivity cues."
  },
  {
    title: "A/B testing is inconsistent or manual",
    body: "Teams often test a few subject lines by intuition, then stop because setup and reporting costs too much time each week."
  },
  {
    title: "Revenue impact is hidden",
    body: "Without event-level attribution, owners cannot prove whether recovery campaigns are adding profitable orders or just creating noise."
  }
] as const;

const solutions = [
  "Shopify webhook ingestion for abandoned checkouts and recovered orders",
  "AI engine that converts cart items + browsing patterns into two distinct variants",
  "Automatic A/B split assignment and provider-based email dispatch",
  "Real-time dashboard with conversion lift and recovered revenue metrics"
] as const;

const faqs = [
  {
    question: "How is this different from Shopify's built-in abandoned checkout email?",
    answer:
      "Shopify defaults rely on one broad template. Shopify Abandon Bot writes customer-specific copy from exact cart contents and intent signals, then continuously A/B tests messaging across your traffic."
  },
  {
    question: "Do I need to replace my current ESP?",
    answer:
      "No. The app can send through Resend and can be adapted to your existing provider API. You keep your domain and sender reputation controls."
  },
  {
    question: "How quickly do results appear?",
    answer:
      "Stores with steady abandoned-cart volume usually see measurable uplift within the first 7-14 days because the A/B split starts learning immediately."
  },
  {
    question: "Is the app gated behind payment?",
    answer:
      "Yes. AI generation and dashboard access are behind a cookie-based paid access gate that is unlocked after a valid Lemon Squeezy purchase."
  }
] as const;

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const paywallNotice = resolvedSearchParams?.paywall;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <section className="animate-fade-up rounded-3xl border border-[#243146] bg-[linear-gradient(160deg,rgba(17,25,39,.9),rgba(9,15,24,.95))] px-6 py-10 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr,1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#88a2c9]">Shopify Abandon Bot · Ecom Tools</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              AI-personalized abandon-cart emails that recover more revenue automatically
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#c6d2e7] sm:text-lg">
              Connect your Shopify store. We analyze cart contents and browsing behavior, write customer-specific subject
              lines and body copy, and run automated A/B tests that typically move recovery conversion from around 10%
              to 28-32%.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#pricing"
                className="rounded-xl bg-gradient-to-r from-[#29b6f6] to-[#61ffca] px-5 py-3 text-sm font-semibold text-[#03111c] transition hover:opacity-90"
              >
                Start paid plan
              </a>
              <Link
                href="/dashboard"
                className="rounded-xl border border-[#2d415f] bg-[#0e1b2d] px-5 py-3 text-sm font-semibold text-[#d4e8ff] transition hover:bg-[#142a47]"
              >
                Open dashboard
              </Link>
            </div>

            {paywallNotice ? (
              <p className="mt-4 rounded-lg border border-[#523244] bg-[#2c1a25] px-3 py-2 text-sm text-[#ffc1d5]">
                Dashboard access requires an active paid plan. Complete checkout, then unlock using your billing email.
              </p>
            ) : null}
          </div>

          <div className="panel p-5">
            <h2 className="text-lg font-semibold text-white">Connect Shopify in 30 seconds</h2>
            <p className="mt-2 text-sm text-[#9fb2cf]">Paste your store domain and authorize webhook + API access.</p>
            <form action="/api/shopify/auth" method="GET" className="mt-4 space-y-3">
              <input
                required
                name="shop"
                placeholder="your-store.myshopify.com"
                className="h-11 w-full rounded-xl border border-[#2f4057] bg-[#0c1624] px-3 text-sm text-white placeholder:text-[#6e819c] focus:outline-none focus:ring-2 focus:ring-[#2a88c7]"
              />
              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#153a61] text-sm font-semibold text-[#d9ecff] transition hover:bg-[#1a4a7c]"
              >
                Authorize Shopify Connection
              </button>
            </form>
            <p className="mt-3 text-xs text-[#8498b8]">
              Only stores with at least $5k/month in revenue typically get full ROI from the automated plan.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8ea2c8]">Problem</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Why abandoned-cart revenue is left on the table</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {problems.map((problem) => (
            <article key={problem.title} className="panel p-5">
              <h3 className="text-lg font-semibold text-white">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#aebcd4]">{problem.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-[1.1fr,1fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#8ea2c8]">Solution</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">From abandonment event to personalized send in seconds</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#afbdd4]">
            The system listens to Shopify checkout events, pulls line items and intent clues, generates two persuasive
            variants with AI, and sends one variant automatically while logging conversion outcomes for each cohort.
          </p>
        </div>
        <ul className="space-y-3">
          {solutions.map((solution) => (
            <li key={solution} className="panel flex items-start gap-3 p-4 text-sm text-[#d6deee]">
              <span className="mt-1 h-2 w-2 rounded-full bg-[#61ffca]" />
              <span>{solution}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <Pricing />
      </section>

      <section className="mt-16 pb-16">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8ea2c8]">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Questions store operators ask before installing</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <article key={faq.question} className="panel p-5">
              <h3 className="text-base font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#aebcd4]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
