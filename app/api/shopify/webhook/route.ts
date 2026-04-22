import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { generateAbandonEmail } from "@/lib/ai";
import { logWebhookEvent, saveCampaign } from "@/lib/database";
import { sendAbandonEmail } from "@/lib/email";
import { verifyShopifyWebhookSignature } from "@/lib/shopify";

export const runtime = "nodejs";

type ShopifyLineItem = {
  product_id?: number;
  variant_id?: number;
  title?: string;
  variant_title?: string;
  quantity?: number;
  price?: string | number;
};

type ShopifyWebhookPayload = {
  email?: string;
  customer?: {
    email?: string;
    first_name?: string;
  };
  line_items?: ShopifyLineItem[];
  total_price?: string | number;
  currency?: string;
  note_attributes?: Array<{ name?: string; value?: string }>;
};

function pickVariant(seed: string): "A" | "B" {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  return parseInt(hash.slice(0, 2), 16) % 2 === 0 ? "A" : "B";
}

function extractBrowsingSignals(payload: ShopifyWebhookPayload) {
  return (payload.note_attributes || [])
    .filter((attr) => attr.name && attr.value)
    .slice(0, 6)
    .map((attr) => `${attr.name}: ${attr.value}`);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic") || "unknown";
  const shopDomain = request.headers.get("x-shopify-shop-domain") || "unknown.myshopify.com";

  if (!verifyShopifyWebhookSignature(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid Shopify webhook signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as ShopifyWebhookPayload;

  logWebhookEvent("shopify", topic, payload as Record<string, unknown>);

  const customerEmail = payload.email || payload.customer?.email;
  const lineItems = (payload.line_items || [])
    .filter((item) => item.title && item.quantity)
    .map((item) => ({
      productId: item.product_id ? String(item.product_id) : undefined,
      variantId: item.variant_id ? String(item.variant_id) : undefined,
      title: item.title || "Item",
      variantTitle: item.variant_title,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0)
    }));

  if (!customerEmail || lineItems.length === 0) {
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "No customer email or line items found"
    });
  }

  const cartValue = Number(payload.total_price || 0);
  const currency = payload.currency || "USD";
  const browsingSignals = extractBrowsingSignals(payload);

  const generated = await generateAbandonEmail({
    storeDomain: shopDomain,
    customer: {
      email: customerEmail,
      firstName: payload.customer?.first_name
    },
    cart: {
      lineItems,
      total: cartValue,
      currency
    },
    browsingSignals
  });

  const variant = pickVariant(`${shopDomain}:${customerEmail}:${topic}`);
  const selected = variant === "A" ? generated.variantA : generated.variantB;

  let sendStatus: "queued" | "sent" | "failed" = "queued";
  let providerId: string | undefined;

  try {
    const sendResult = await sendAbandonEmail({
      to: customerEmail,
      subject: selected.subject,
      body: selected.body
    });
    sendStatus = sendResult.status === "sent" ? "sent" : "queued";
    providerId = sendResult.id;
  } catch {
    sendStatus = "failed";
  }

  const campaign = saveCampaign({
    storeDomain: shopDomain,
    customerEmail,
    customerName: payload.customer?.first_name,
    source: "shopify-webhook",
    cartValue,
    currency,
    lineItems,
    browsingSignals,
    variantA: generated.variantA,
    variantB: generated.variantB,
    sentVariant: variant,
    emailProviderId: providerId,
    status: sendStatus,
    metrics: {
      opened: false,
      clicked: false,
      converted: false,
      recoveredRevenue: 0
    }
  });

  return NextResponse.json({
    received: true,
    campaignId: campaign.id,
    status: campaign.status,
    variant: campaign.sentVariant
  });
}
