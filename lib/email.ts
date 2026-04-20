import "server-only";

import { randomBytes } from "node:crypto";

import nodemailer from "nodemailer";

type SendAbandonEmailInput = {
  to: string;
  subject: string;
  body: string;
  checkoutUrl: string;
  cta: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

function renderHtml(body: string, checkoutUrl: string, cta: string): string {
  const replaced = body
    .replace("{{checkout_url}}", checkoutUrl)
    .replace(/\n/g, "<br />");

  return [
    "<div style=\"font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;\">",
    `<div style=\"line-height: 1.6; font-size: 16px;\">${replaced}</div>`,
    `<p style=\"margin-top: 22px;\"><a href=\"${checkoutUrl}\" style=\"display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;\">${cta}</a></p>`,
    "<p style=\"margin-top: 20px; color: #6b7280; font-size: 13px;\">You are receiving this because you started checkout but did not complete your order.</p>",
    "</div>",
  ].join("");
}

export async function sendAbandonEmail(
  input: SendAbandonEmailInput,
): Promise<{ messageId: string; provider: "smtp" | "log" }> {
  const smtp = getTransporter();
  const textBody = input.body.replace("{{checkout_url}}", input.checkoutUrl);

  if (!smtp) {
    const messageId = `log_${randomBytes(8).toString("hex")}`;
    console.info(
      "[abandon-email][dry-run]",
      JSON.stringify(
        {
          to: input.to,
          subject: input.subject,
          body: textBody,
          cta: input.cta,
          checkoutUrl: input.checkoutUrl,
        },
        null,
        2,
      ),
    );

    return {
      messageId,
      provider: "log",
    };
  }

  const info = await smtp.sendMail({
    from: process.env.SMTP_FROM ?? "Cart Recovery <recover@example.com>",
    to: input.to,
    subject: input.subject,
    text: `${textBody}\n\n${input.cta}: ${input.checkoutUrl}`,
    html: renderHtml(input.body, input.checkoutUrl, input.cta),
  });

  return {
    messageId: info.messageId,
    provider: "smtp",
  };
}
