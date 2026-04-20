import { Resend } from "resend";

import type { Campaign } from "@/lib/types";

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function buildHtmlBody(campaign: Campaign, bodyText: string, ctaLabel: string): string {
  const escapedBody = bodyText
    .split("\n")
    .map((line) => `<p style=\"margin:0 0 12px 0;line-height:1.6;color:#dce3eb;\">${line}</p>`)
    .join("");

  return `
  <div style="background:#0d1117;padding:28px;font-family:Inter,Arial,sans-serif;color:#dce3eb;">
    <div style="max-width:580px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:14px;padding:28px;">
      ${escapedBody}
      <a href="${campaign.recoveryUrl}" style="display:inline-block;margin-top:16px;background:#22c55e;color:#04130b;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">${ctaLabel}</a>
      <p style="margin:18px 0 0 0;color:#90a4b8;font-size:12px;">Cart value: $${campaign.cartValue.toFixed(2)} • Powered by Shopify Abandon Bot</p>
    </div>
  </div>
  `;
}

export async function sendCampaignEmail(campaign: Campaign): Promise<SendResult> {
  const variant = campaign.variants.find((item) => item.id === campaign.assignedVariant);
  if (!variant) {
    return {
      success: false,
      error: "Assigned variant missing"
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      success: true,
      messageId: `simulated-${Date.now()}`
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || `Abandon Bot <noreply@${campaign.storeDomain}>`;

  try {
    const response = await resend.emails.send({
      from,
      to: campaign.customerEmail,
      subject: variant.subject,
      text: `${variant.bodyText}\n\n${variant.ctaLabel}: ${campaign.recoveryUrl}`,
      html: buildHtmlBody(campaign, variant.bodyText, variant.ctaLabel)
    });

    return {
      success: true,
      messageId: response.data?.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email provider failure"
    };
  }
}
