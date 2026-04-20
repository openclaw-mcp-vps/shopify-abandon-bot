import type { Campaign } from "@/lib/types";

interface EmailPreviewProps {
  campaign: Campaign;
}

export function EmailPreview({ campaign }: EmailPreviewProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-[#111827d5] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{campaign.storeDomain}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{campaign.customerEmail}</h3>
        </div>
        <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-300">
          Variant {campaign.assignedVariant}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {campaign.variants.map((variant) => (
          <div
            key={variant.id}
            className={`rounded-lg border p-4 ${
              variant.id === campaign.assignedVariant
                ? "border-emerald-700 bg-emerald-900/20"
                : "border-slate-700 bg-slate-900/50"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">Variant {variant.id}</p>
            <p className="mt-2 text-sm font-semibold text-white">{variant.subject}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{variant.bodyText}</p>
            <p className="mt-3 text-xs font-semibold text-emerald-300">CTA: {variant.ctaLabel}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="rounded-md border border-slate-700 px-2 py-1">Cart: ${campaign.cartValue.toFixed(2)}</span>
        <span className="rounded-md border border-slate-700 px-2 py-1">Status: {campaign.status}</span>
        <span className="rounded-md border border-slate-700 px-2 py-1">Generated: {new Date(campaign.generatedAt).toUTCString()}</span>
      </div>
    </article>
  );
}
