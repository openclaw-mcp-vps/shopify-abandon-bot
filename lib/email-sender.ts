import nodemailer from "nodemailer";
import { z } from "zod";

const emailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(3),
  preview: z.string().optional(),
  body: z.string().min(20),
  ctaLabel: z.string().default("Complete checkout"),
  ctaUrl: z.string().url(),
  customerFirstName: z.string().min(1),
  storeName: z.string().min(2),
});

export type SendPersonalizedEmailInput = z.infer<typeof emailInputSchema>;

function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .map((line) => (line.length === 0 ? "<br/>" : `<p style=\"margin:0 0 12px;\">${line}</p>`))
    .join("\n");
}

function buildHtmlEmail(input: SendPersonalizedEmailInput): string {
  const preheader = input.preview ?? "Your cart is still waiting for you.";

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#0d1117;color:#e6edf3;font-family:Verdana,Segoe UI,sans-serif;">
    <span style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 20px;">
                <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${input.storeName}</p>
                ${textToHtml(input.body)}
                <div style="margin-top:20px;">
                  <a href="${input.ctaUrl}" style="display:inline-block;background:#34d399;color:#0b1220;padding:12px 18px;border-radius:10px;font-weight:700;text-decoration:none;">
                    ${input.ctaLabel}
                  </a>
                </div>
                <p style="margin:20px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
                  You received this because you added products to your cart at ${input.storeName}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendPersonalizedEmail(rawInput: SendPersonalizedEmailInput) {
  const input = emailInputSchema.parse(rawInput);
  const fromAddress = process.env.EMAIL_FROM ?? "Shopify Abandon Bot <noreply@abandon-bot.ai>";

  const transporter = buildTransporter();

  if (!transporter) {
    const simulatedId = `simulated-${Date.now()}`;
    console.info(
      `[email-sender] SMTP not configured, simulated send ${simulatedId} to ${input.to}`
    );
    return {
      messageId: simulatedId,
      accepted: [input.to],
      rejected: [],
      simulated: true,
    };
  }

  const info = await transporter.sendMail({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: buildHtmlEmail(input),
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    simulated: false,
  };
}
