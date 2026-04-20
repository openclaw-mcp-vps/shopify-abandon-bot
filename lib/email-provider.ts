import "server-only";

import { Resend } from "resend";

export type SendRecoveryEmailInput = {
  to: string;
  subject: string;
  body: string;
  customerName?: string;
  shopDomain: string;
  ctaUrl: string;
  pixelUrl?: string;
  variant: "A" | "B";
};

export type SendRecoveryEmailResult = {
  messageId: string;
  simulated: boolean;
};

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBodyAsHtml(text: string) {
  return escapeHtml(text)
    .split("\n\n")
    .map((paragraph) => `<p style=\"margin:0 0 14px 0;line-height:1.6;color:#d3d9e8;\">${paragraph.replaceAll("\n", "<br/>")}</p>`)
    .join("");
}

export function buildRecoveryEmailHtml(input: SendRecoveryEmailInput) {
  const greetingName = input.customerName?.trim() || "there";
  const bodyHtml = renderBodyAsHtml(input.body);

  return `
    <div style="margin:0;background:#0d1117;padding:24px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#121a27;border:1px solid #263244;border-radius:16px;padding:28px;">
        <p style="margin:0 0 16px;color:#8ea2c8;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Shopify Abandon Bot • Variant ${input.variant}</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#f5f7ff;">Hi ${escapeHtml(greetingName)}, your cart is still saved.</h1>
        ${bodyHtml}
        <p style="margin:24px 0 0;">
          <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:linear-gradient(90deg,#29b6f6,#61ffca);color:#06131f;font-weight:700;padding:12px 18px;border-radius:10px;text-decoration:none;">Return To Checkout</a>
        </p>
        <p style="margin:20px 0 0;color:#8ea2c8;font-size:12px;">Sent for ${escapeHtml(input.shopDomain)} by Shopify Abandon Bot.</p>
      </div>
      ${input.pixelUrl ? `<img src=\"${escapeHtml(input.pixelUrl)}\" width=\"1\" height=\"1\" alt=\"\" style=\"display:block;opacity:0;\"/>` : ""}
    </div>
  `;
}

export async function sendRecoveryEmail(
  input: SendRecoveryEmailInput
): Promise<SendRecoveryEmailResult> {
  if (!resendClient) {
    return {
      messageId: `simulated-${Date.now()}`,
      simulated: true
    };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Shopify Abandon Bot <recovery@updates.example.com>";

  const response = await resendClient.emails.send({
    from: fromAddress,
    to: [input.to],
    subject: input.subject,
    html: buildRecoveryEmailHtml(input),
    text: input.body
  });

  return {
    messageId: response.data?.id ?? `resend-${Date.now()}`,
    simulated: false
  };
}
