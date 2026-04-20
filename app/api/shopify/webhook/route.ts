import { NextResponse } from "next/server";

import { generatePersonalizedEmail } from "@/lib/ai";
import {
  assignVariant,
  markCartConverted,
  markCartEmailed,
  recordAbandonedCart,
  saveEmailVariants,
} from "@/lib/database";
import { sendAbandonEmail } from "@/lib/email";
import {
  parseAbandonmentPayload,
  parseOrderConversion,
  verifyShopifyWebhook,
} from "@/lib/shopify";

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook({ rawBody, hmacHeader })) {
    return NextResponse.json({ error: "Invalid Shopify webhook signature." }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopDomain =
    request.headers.get("x-shopify-shop-domain") ?? "unknown.myshopify.com";

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON." }, { status: 400 });
  }

  if (topic.startsWith("orders/")) {
    const conversion = parseOrderConversion({ payload, shopDomain });
    await markCartConverted(conversion);

    return NextResponse.json({ received: true, topic, action: "conversion_marked" });
  }

  const abandonment = parseAbandonmentPayload({ payload, shopDomain });
  if (!abandonment) {
    return NextResponse.json({ received: true, topic, ignored: true });
  }

  const record = await recordAbandonedCart({
    shopDomain: abandonment.shopDomain,
    cartToken: abandonment.cartToken,
    email: abandonment.email,
    customerName: abandonment.customerName,
    currency: abandonment.currency,
    subtotal: abandonment.subtotal,
    items: abandonment.items,
    browsingSignals: abandonment.browsingSignals,
  });

  const generated = await generatePersonalizedEmail({
    storeName: abandonment.shopDomain,
    customerName: abandonment.customerName,
    cartItems: abandonment.items,
    browsingSignals: abandonment.browsingSignals,
    cartValue: abandonment.subtotal,
    currency: abandonment.currency,
  });

  const assignedVariant = assignVariant(`${abandonment.cartToken}:${abandonment.email}`);

  await saveEmailVariants({
    cartId: record.id,
    variants: generated.variants,
    assignedVariant,
  });

  const selected =
    generated.variants.find((variant) => variant.variant === assignedVariant) ??
    generated.variants[0];

  const sent = await sendAbandonEmail({
    to: abandonment.email,
    subject: selected.subject,
    body: selected.body,
    cta: selected.cta,
    checkoutUrl:
      abandonment.checkoutUrl || `https://${abandonment.shopDomain}/cart/${abandonment.cartToken}`,
  });

  await markCartEmailed({
    cartId: record.id,
    emailMessageId: sent.messageId,
  });

  return NextResponse.json({
    received: true,
    topic,
    cartId: record.id,
    variant: assignedVariant,
    provider: sent.provider,
  });
}
