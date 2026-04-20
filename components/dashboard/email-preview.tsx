type Preview = {
  id: number;
  customerEmail: string;
  customerName: string | null;
  shopDomain: string;
  cartTotal: number;
  currency: string;
  variant: "A" | "B";
  subject: string;
  body: string;
  sentAt: string;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function EmailPreviewList({ previews }: { previews: Preview[] }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-white">Recent Sent Emails</h3>
        <p className="text-xs text-[#8ea2c8]">Latest A/B sends with live engagement metrics</p>
      </div>

      {previews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2e3a4e] bg-[#0d1422]/70 p-6 text-sm text-[#9eb1d0]">
          No emails sent yet. Connect Shopify and let abandoned cart webhooks flow in to start collecting results.
        </div>
      ) : (
        <div className="space-y-4">
          {previews.map((preview) => (
            <article key={preview.id} className="rounded-xl border border-[#2e3a4e] bg-[#0d1422]/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#8ea2c8]">{preview.shopDomain}</p>
                  <h4 className="mt-1 text-base font-semibold text-white">{preview.subject}</h4>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    preview.variant === "A"
                      ? "bg-[#0f3050] text-[#86d6ff]"
                      : "bg-[#153a31] text-[#87ffd8]"
                  }`}
                >
                  Variant {preview.variant}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#d3d9e8]">{preview.body}</p>

              <div className="mt-4 grid gap-2 text-xs text-[#9eb1d0] sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="text-[#7f96ba]">Recipient:</span> {preview.customerName || preview.customerEmail}
                </p>
                <p>
                  <span className="text-[#7f96ba]">Cart:</span> {formatCurrency(preview.cartTotal, preview.currency)}
                </p>
                <p>
                  <span className="text-[#7f96ba]">Engagement:</span> {preview.opens} opens · {preview.clicks} clicks
                </p>
                <p>
                  <span className="text-[#7f96ba]">Conversion:</span> {preview.conversions} orders ·
                  {" "}
                  {formatCurrency(preview.revenue, preview.currency)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
