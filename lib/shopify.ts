import "server-only";

import crypto from "node:crypto";

import type { BrowseEvent, CartItem } from "@/lib/database";

export type NormalizedAbandonedCart = {
  cartToken: string;
  customerEmail: string;
  customerName?: string;
  totalPrice: number;
  currency: string;
  checkoutUrl: string;
  discountCode?: string;
  items: CartItem[];
  browseHistory: BrowseEvent[];
};

export function normalizeShopDomain(shop: string) {
  return shop.trim().toLowerCase();
}

export function isValidShopDomain(shop: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

export function verifyShopifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const generated = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const providedBuffer = Buffer.from(signatureHeader, "utf8");
  const generatedBuffer = Buffer.from(generated, "utf8");

  if (providedBuffer.length !== generatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, generatedBuffer);
}

export function verifyShopifyOAuthHmac(searchParams: URLSearchParams) {
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const receivedHmac = searchParams.get("hmac");

  if (!apiSecret || !receivedHmac) {
    return false;
  }

  const sortedPairs = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto.createHmac("sha256", apiSecret).update(sortedPairs).digest("hex");

  const providedBuffer = Buffer.from(receivedHmac, "utf8");
  const digestBuffer = Buffer.from(digest, "utf8");

  if (providedBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, digestBuffer);
}

export function buildShopifyAuthUrl(input: {
  shopDomain: string;
  state: string;
  redirectUri: string;
}) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES ?? "read_checkouts,read_orders,read_customers";

  if (!apiKey) {
    throw new Error("Missing SHOPIFY_API_KEY");
  }

  const params = new URLSearchParams({
    client_id: apiKey,
    scope: scopes,
    redirect_uri: input.redirectUri,
    state: input.state
  });

  return `https://${input.shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeShopifyCodeForToken(input: {
  shopDomain: string;
  code: string;
}) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET");
  }

  const response = await fetch(`https://${input.shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code: input.code
    })
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Shopify token exchange failed: ${response.status} ${responseText}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export function isAbandonmentTopic(topic: string) {
  const normalized = topic.toLowerCase();
  return normalized.includes("checkouts/update") || normalized.includes("carts/update");
}

export function isOrderTopic(topic: string) {
  const normalized = topic.toLowerCase();
  return normalized.includes("orders/create") || normalized.includes("orders/paid");
}

export function chooseVariant(cartToken: string) {
  const hash = [...cartToken].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? "A" : "B";
}

function extractBrowseHistory(payload: Record<string, unknown>): BrowseEvent[] {
  const noteAttributes = Array.isArray(payload.note_attributes)
    ? (payload.note_attributes as Array<Record<string, unknown>>)
    : [];

  const normalizedFromNotes: BrowseEvent[] = [];
  for (const attribute of noteAttributes) {
    const path = typeof attribute.value === "string" ? attribute.value : "";
    const key = typeof attribute.name === "string" ? attribute.name : "";

    if (!path || !key.toLowerCase().includes("viewed")) {
      continue;
    }

    normalizedFromNotes.push({
      path,
      title: key,
      category: "recently-viewed",
      secondsOnPage: 45
    });
  }

  if (normalizedFromNotes.length > 0) {
    return normalizedFromNotes;
  }

  return [
    {
      path: "/collections/recently-viewed",
      category: "recently-viewed",
      secondsOnPage: 50
    }
  ];
}

function extractItems(payload: Record<string, unknown>): CartItem[] {
  const lineItems = Array.isArray(payload.line_items)
    ? (payload.line_items as Array<Record<string, unknown>>)
    : [];

  if (lineItems.length === 0) {
    return [
      {
        title: "Saved item",
        quantity: 1,
        unitPrice: Number(payload.total_price ?? 0) || 0
      }
    ];
  }

  return lineItems.map((lineItem) => ({
    title: String(lineItem.title ?? "Cart item"),
    quantity: Number(lineItem.quantity ?? 1) || 1,
    unitPrice: Number(lineItem.price ?? 0) || 0,
    variant: typeof lineItem.variant_title === "string" ? lineItem.variant_title : undefined,
    productUrl:
      typeof lineItem.product_url === "string"
        ? lineItem.product_url
        : typeof lineItem.handle === "string"
          ? `/products/${lineItem.handle}`
          : undefined
  }));
}

export function normalizeAbandonedCartPayload(
  payload: Record<string, unknown>,
  shopDomain: string
): NormalizedAbandonedCart | null {
  const completedAt = payload.completed_at;

  if (typeof completedAt === "string" && completedAt.length > 0) {
    return null;
  }

  const customerEmail =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.contact_email === "string"
        ? payload.contact_email
        : null;

  if (!customerEmail) {
    return null;
  }

  const token =
    typeof payload.token === "string"
      ? payload.token
      : typeof payload.cart_token === "string"
        ? payload.cart_token
        : typeof payload.id === "number"
          ? String(payload.id)
          : null;

  if (!token) {
    return null;
  }

  const firstName = typeof payload.customer_first_name === "string" ? payload.customer_first_name : "";
  const lastName = typeof payload.customer_last_name === "string" ? payload.customer_last_name : "";
  const customerName = `${firstName} ${lastName}`.trim() || undefined;

  const checkoutUrl =
    typeof payload.abandoned_checkout_url === "string"
      ? payload.abandoned_checkout_url
      : `https://${shopDomain}/checkout`;

  const discountCodes = Array.isArray(payload.discount_codes)
    ? (payload.discount_codes as Array<Record<string, unknown>>)
    : [];

  const discountCode = discountCodes.find((entry) => typeof entry.code === "string")?.code as
    | string
    | undefined;

  return {
    cartToken: token,
    customerEmail,
    customerName,
    totalPrice: Number(payload.total_price ?? 0) || 0,
    currency: typeof payload.currency === "string" ? payload.currency : "USD",
    checkoutUrl,
    discountCode,
    items: extractItems(payload),
    browseHistory: extractBrowseHistory(payload)
  };
}

export function normalizeOrderPayload(payload: Record<string, unknown>) {
  const cartToken =
    typeof payload.checkout_token === "string"
      ? payload.checkout_token
      : typeof payload.cart_token === "string"
        ? payload.cart_token
        : typeof payload.token === "string"
          ? payload.token
          : null;

  if (!cartToken) {
    return null;
  }

  const orderValue = Number(payload.total_price ?? payload.current_total_price ?? 0) || 0;
  return {
    cartToken,
    orderValue
  };
}
