import { NextResponse } from "next/server";
import { z } from "zod";

import { assignVariant } from "@/lib/ab-testing";
import { generateAbandonEmail } from "@/lib/ai-email-generator";
import { recordEmailSent } from "@/lib/analytics";
import { sendPersonalizedEmail } from "@/lib/email-sender";
import { parseBrowsingSignals, verifyWebhookHmac } from "@/lib/shopify";

export const runtime = "nodejs";

const lineItemSchema = z.object({
  title: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  price: z.union([z.string(), z.number()]).transform((value) => Number(value)),
  product_id: z.union([z.string(), z.number()]).optional(),
});

const checkoutWebhookSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  token: z.string().optional(),
  abandoned_checkout_url: z.string().url().optional(),
  email: z.string().email().optional(),
  currency: z.string().optional(),
  total_price: z.union([z.string(), z.number()]).optional(),
  line_items: z.array(lineItemSchema).default([]),
  customer: z
    .object({
      first_name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  billing_address: z
    .object({
      first_name: z.string().optional(),
    })
    .optional(),
  note_attributes: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "";
  const topic = request.headers.get("x-shopify-topic") ?? "unknown";
  const signature = request.headers.get("x-shopify-hmac-sha256") ?? "";

  if (!shopDomain || !signature) {
    return NextResponse.json(
      { error: "Missing Shopify headers." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  if (!verifyWebhookHmac(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  if (!topic.includes("checkout")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = checkoutWebhookSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Webhook payload did not match expected schema." },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const customerEmail = payload.email ?? payload.customer?.email;
  if (!customerEmail) {
    return NextResponse.json({ ok: true, ignored: "No customer email present." });
  }

  if (payload.line_items.length === 0) {
    return NextResponse.json({ ok: true, ignored: "No items in cart." });
  }

  const customerFirstName =
    payload.customer?.first_name ?? payload.billing_address?.first_name ?? "there";

  const cartItems = payload.line_items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    price: Number.isFinite(item.price) ? item.price : 0,
  }));

  const parsedTotal =
    payload.total_price !== undefined ? Number(payload.total_price) : undefined;
  const cartValue =
    parsedTotal && Number.isFinite(parsedTotal)
      ? parsedTotal
      : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const generated = await generateAbandonEmail({
    storeName: shopDomain.replace(".myshopify.com", ""),
    shopDomain,
    customerFirstName,
    customerEmail,
    currency: payload.currency ?? "USD",
    cartItems,
    cartValue,
    browsingSignals: parseBrowsingSignals(payload.note_attributes),
  });

  const checkoutId = payload.token ?? payload.id;
  const variant = assignVariant(`${shopDomain}:${checkoutId}`);
  const selectedVariant = generated.variants.find((entry) => entry.variant === variant);

  if (!selectedVariant) {
    return NextResponse.json({ error: "Missing A/B variant output." }, { status: 500 });
  }

  const ctaUrl =
    payload.abandoned_checkout_url ??
    `https://${shopDomain}/cart/${encodeURIComponent(payload.token ?? "")}`;

  const emailResponse = await sendPersonalizedEmail({
    to: customerEmail,
    customerFirstName,
    storeName: shopDomain,
    subject: selectedVariant.subject,
    preview: selectedVariant.preview,
    body: selectedVariant.body,
    ctaLabel: selectedVariant.ctaLabel,
    ctaUrl,
  });

  await recordEmailSent({
    shopDomain,
    checkoutId,
    customerEmail,
    customerFirstName,
    cartValue,
    variant,
    subject: selectedVariant.subject,
    body: selectedVariant.body,
  });

  return NextResponse.json({
    ok: true,
    topic,
    variant,
    messageId: emailResponse.messageId,
    simulated: emailResponse.simulated,
  });
}
