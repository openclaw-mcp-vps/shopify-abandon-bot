import { NextRequest, NextResponse } from "next/server";

import { generatePersonalizedEmailVariants } from "@/lib/ai-service";
import {
  createOrUpdateCart,
  hasSentEmailForCart,
  markEmailSent,
  recordRecoveredOrder,
  saveGeneratedEmailVariant
} from "@/lib/database";
import { sendRecoveryEmail } from "@/lib/email-provider";
import {
  chooseVariant,
  isAbandonmentTopic,
  isOrderTopic,
  normalizeAbandonedCartPayload,
  normalizeOrderPayload,
  verifyShopifyWebhookSignature
} from "@/lib/shopify";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Shopify webhook signature." }, { status: 401 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "unknown-shop.myshopify.com";

  if (isOrderTopic(topic)) {
    const order = normalizeOrderPayload(payload);

    if (!order) {
      return NextResponse.json({ status: "ignored", reason: "missing cart token in order payload" });
    }

    const recorded = recordRecoveredOrder({
      shopDomain,
      cartToken: order.cartToken,
      orderValue: order.orderValue
    });

    return NextResponse.json({
      status: recorded ? "conversion_recorded" : "conversion_unmatched",
      cartToken: order.cartToken
    });
  }

  if (!isAbandonmentTopic(topic)) {
    return NextResponse.json({ status: "ignored", topic });
  }

  const abandonedCart = normalizeAbandonedCartPayload(payload, shopDomain);

  if (!abandonedCart) {
    return NextResponse.json({ status: "ignored", reason: "payload is not an abandoned checkout" });
  }

  const cartResult = createOrUpdateCart({
    shopDomain,
    cartToken: abandonedCart.cartToken,
    customerEmail: abandonedCart.customerEmail,
    customerName: abandonedCart.customerName,
    totalPrice: abandonedCart.totalPrice,
    currency: abandonedCart.currency,
    items: abandonedCart.items,
    browseHistory: abandonedCart.browseHistory
  });

  if (!cartResult.isNew && hasSentEmailForCart(cartResult.cartId)) {
    return NextResponse.json({
      status: "ignored",
      reason: "email already sent for this cart",
      cartId: cartResult.cartId
    });
  }

  const generated = await generatePersonalizedEmailVariants({
    customerName: abandonedCart.customerName,
    customerEmail: abandonedCart.customerEmail,
    shopDomain,
    discountCode: abandonedCart.discountCode,
    cartItems: abandonedCart.items,
    browseHistory: abandonedCart.browseHistory
  });

  const variantAId = saveGeneratedEmailVariant({
    cartId: cartResult.cartId,
    variant: "A",
    subject: generated.variantA.subject,
    body: generated.variantA.body
  });

  const variantBId = saveGeneratedEmailVariant({
    cartId: cartResult.cartId,
    variant: "B",
    subject: generated.variantB.subject,
    body: generated.variantB.body
  });

  const selectedVariant = chooseVariant(abandonedCart.cartToken);
  const selectedVariantId = selectedVariant === "A" ? variantAId : variantBId;
  const selectedEmail = selectedVariant === "A" ? generated.variantA : generated.variantB;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const trackingPixelUrl = `${baseUrl}/api/email/track/open?id=${selectedVariantId}`;
  const trackedCheckoutUrl = `${baseUrl}/api/email/track/click?id=${selectedVariantId}&to=${encodeURIComponent(abandonedCart.checkoutUrl)}`;

  const delivery = await sendRecoveryEmail({
    to: abandonedCart.customerEmail,
    subject: selectedEmail.subject,
    body: selectedEmail.body,
    customerName: abandonedCart.customerName,
    shopDomain,
    ctaUrl: trackedCheckoutUrl,
    pixelUrl: trackingPixelUrl,
    variant: selectedVariant
  });

  markEmailSent(selectedVariantId, delivery.messageId);

  return NextResponse.json({
    status: "sent",
    cartId: cartResult.cartId,
    variant: selectedVariant,
    simulatedDelivery: delivery.simulated
  });
}
