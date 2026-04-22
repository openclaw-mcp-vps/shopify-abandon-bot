import { Resend } from "resend";

const resendClient =
  process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toHtmlBody(textBody: string) {
  return textBody
    .split("\n")
    .map((line) => `<p style=\"margin:0 0 12px\">${escapeHtml(line)}</p>`)
    .join("");
}

export async function sendAbandonEmail(input: {
  to: string;
  subject: string;
  body: string;
}) {
  if (!resendClient) {
    return {
      status: "queued" as const,
      id: `local-${Date.now()}`,
      provider: "resend"
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Recovery Bot <recover@yourdomain.com>";

  const result = await resendClient.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: toHtmlBody(input.body)
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    status: "sent" as const,
    id: result.data?.id || `resend-${Date.now()}`,
    provider: "resend"
  };
}
