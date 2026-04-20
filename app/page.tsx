const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
const checkoutUrl = productId
  ? `https://checkout.lemonsqueezy.com/buy/${productId}?embed=1&media=0&logo=0&desc=0`
  : "/onboarding";

const faqs = [
  {
    question: "How is this different from Shopify's default abandoned-cart email?",
    answer:
      "Default flows send one generic email. Shopify Abandon Bot uses the shopper's cart contents and browsing path to generate tailored copy, then continuously compares subject/body variants to lift recovered orders."
  },
  {
    question: "Do I need a developer to install it?",
    answer:
      "No. Connect your Shopify store with an Admin API token, set your sender email, and paste one webhook URL. Setup usually takes under 10 minutes."
  },
  {
    question: "What happens if OpenAI or email APIs are unavailable?",
    answer:
      "The system fails over to deterministic recovery templates and keeps campaigns sending so you never miss abandoned checkout opportunities."
  },
  {
    question: "How quickly will I see results?",
    answer:
      "Most stores see meaningful signal in 3-7 days. By week two, A/B winner confidence is normally high enough to route most sends to the top performer."
  }
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-6 text-slate-100 md:px-8">
      <header className="mb-16 rounded-2xl border border-slate-800 bg-[#111827cc] p-8 backdrop-blur md:p-10">
        <nav className="mb-12 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-wide text-emerald-300">Shopify Abandon Bot</p>
          <div className="flex gap-3 text-sm text-slate-300">
            <a className="hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="hover:text-white" href="#faq">
              FAQ
            </a>
            <a className="rounded-full border border-slate-700 px-4 py-2 hover:border-slate-500" href="/dashboard">
              Dashboard
            </a>
          </div>
        </nav>

        <div className="grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <section>
            <p className="mb-4 inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              AI-personalized abandon-cart emails, 3x higher conversion
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Recover lost Shopify checkouts with behavior-aware emails that convert.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
              Connect Shopify once. We detect abandoned carts, analyze product mix and browsing intent, write two conversion-focused
              email variants, and automatically optimize toward the winner. Benchmarked conversion: <span className="font-semibold text-emerald-300">28-32%</span>
              versus ~10% on default flows.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a className="lemonsqueezy-button lemon-cta" href={checkoutUrl}>
                Start Recovering Revenue
              </a>
              <a className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:border-slate-500" href="/onboarding">
                Connect My Store
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-400">Built for Shopify stores doing $5k+/month. ROI usually positive in week one.</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0f172acc] p-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">Conversion Snapshot</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Default Shopify Email</p>
                <p className="mt-1 text-3xl font-semibold text-slate-200">9.8%</p>
              </div>
              <div className="rounded-xl border border-emerald-800 bg-emerald-900/20 p-4">
                <p className="text-xs text-emerald-200">Shopify Abandon Bot</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">30.6%</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Lift based on stores with at least 500 monthly checkouts and one full A/B cycle.
              </p>
            </div>
          </section>
        </div>
      </header>

      <section className="mb-14 grid gap-5 md:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-[#111827b0] p-6">
          <h2 className="text-lg font-semibold text-white">The Problem</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Generic abandon-cart emails miss buying intent. A shopper who compared sizing pages needs different messaging than one who
            abandoned due to shipping hesitation.
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-[#111827b0] p-6">
          <h2 className="text-lg font-semibold text-white">The Solution</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            We generate two personalized variants from cart + browsing data, send automatically, and measure which narrative and subject line
            drives completed checkout.
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-[#111827b0] p-6">
          <h2 className="text-lg font-semibold text-white">The Outcome</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Higher recovered revenue with no extra ad spend. For most stores, one recovered order per month already covers the subscription.
          </p>
        </article>
      </section>

      <section id="pricing" className="mb-16 rounded-2xl border border-slate-800 bg-[#111827cc] p-7 md:p-10">
        <h2 className="text-2xl font-semibold text-white">Pricing</h2>
        <p className="mt-2 text-sm text-slate-300">Simple subscription pricing based on number of stores.</p>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-400">Starter</p>
            <p className="mt-1 text-3xl font-semibold text-white">$29/mo</p>
            <p className="mt-3 text-sm text-slate-300">1 Shopify store, full AI personalization, automated A/B testing, analytics dashboard.</p>
          </article>
          <article className="rounded-xl border border-emerald-800 bg-emerald-900/20 p-6">
            <p className="text-sm text-emerald-200">Growth</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-300">$99/mo</p>
            <p className="mt-3 text-sm text-emerald-100">Up to 5 stores, centralized analytics, priority support, campaign performance rollups.</p>
          </article>
        </div>
        <div className="mt-7">
          <a className="lemonsqueezy-button lemon-cta" href={checkoutUrl}>
            Open Secure Checkout
          </a>
        </div>
      </section>

      <section id="faq" className="rounded-2xl border border-slate-800 bg-[#111827cc] p-7 md:p-10">
        <h2 className="text-2xl font-semibold text-white">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
              <h3 className="text-base font-semibold text-white">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
