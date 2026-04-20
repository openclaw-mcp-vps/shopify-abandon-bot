import "server-only";

import "@shopify/shopify-api/adapters/node";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { CartItem } from "@/lib/database";

export const SHOPIFY_API_VERSION = "2025-10";

export type ParsedAbandonmentPayload = {
  shopDomain: string;
  cartToken: string;
  email: string;
  customerName: string;
  currency: string;
  subtotal: number;
  checkoutUrl: string;
  items: CartItem[];
  browsingSignals: string[];
};

function env(name: string): string {
  return process.env[name] ?? "";
}

export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

export function buildShopifyInstallUrl(shop: string, state: string): string {
  const apiKey = env("SHOPIFY_API_KEY");
  const scopes = env("SHOPIFY_SCOPES") || "read_orders,read_customers,read_checkouts";
  const appUrl = env("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/shopify/install`;

  const params = new URLSearchParams({
    client_id: apiKey,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function verifyShopifyInstallHmac(params: URLSearchParams): boolean {
  const secret = env("SHOPIFY_API_SECRET");
  const hmac = params.get("hmac");

  if (!secret || !hmac) {
    return false;
  }

  const sanitized = [...params.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = createHmac("sha256", secret).update(sanitized).digest("hex");

  const digestBuffer = Buffer.from(digest, "utf8");
  const hmacBuffer = Buffer.from(hmac, "utf8");

  if (digestBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, hmacBuffer);
}

export async function exchangeShopifyCodeForToken(input: {
  shop: string;
  code: string;
}): Promise<{ accessToken: string; scope: string } | null> {
  const apiKey = env("SHOPIFY_API_KEY");
  const apiSecret = env("SHOPIFY_API_SECRET");

  if (!apiKey || !apiSecret) {
    return null;
  }

  const response = await fetch(
    `https://${input.shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: input.code,
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    access_token?: string;
    scope?: string;
  };

  if (!data.access_token) {
    return null;
  }

  return {
    accessToken: data.access_token,
    scope: data.scope ?? env("SHOPIFY_SCOPES"),
  };
}

export function verifyShopifyWebhook(input: {
  rawBody: string;
  hmacHeader: string | null;
}): boolean {
  const secret = env("SHOPIFY_WEBHOOK_SECRET") || env("SHOPIFY_API_SECRET");

  if (!secret || !input.hmacHeader) {
    return false;
  }

  const generated = createHmac("sha256", secret)
    .update(input.rawBody, "utf8")
    .digest("base64");

  const generatedBuffer = Buffer.from(generated, "utf8");
  const headerBuffer = Buffer.from(input.hmacHeader, "utf8");

  if (generatedBuffer.length !== headerBuffer.length) {
    return false;
  }

  return timingSafeEqual(generatedBuffer, headerBuffer);
}

function numberFromUnknown(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseCartItems(payload: Record<string, unknown>): CartItem[] {
  const source = payload.line_items;

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const typed = item as Record<string, unknown>;
      const title = String(typed.title ?? "Untitled product").trim();
      const quantity = numberFromUnknown(typed.quantity) || 1;
      const price = numberFromUnknown(typed.price);
      const variantTitle = String(typed.variant_title ?? "").trim() || undefined;

      return {
        title,
        quantity,
        price,
        variantTitle,
      } satisfies CartItem;
    })
    .filter(Boolean) as CartItem[];
}

export function parseAbandonmentPayload(input: {
  payload: Record<string, unknown>;
  shopDomain: string;
}): ParsedAbandonmentPayload | null {
  const payload = input.payload;
  const items = parseCartItems(payload);
  const email = String(payload.email ?? "").trim().toLowerCase();
  const subtotal = numberFromUnknown(payload.subtotal_price);
  const completedAt = payload.completed_at;

  if (!email || items.length === 0 || completedAt) {
    return null;
  }

  const cartToken = String(
    payload.cart_token ?? payload.token ?? payload.id ?? "",
  ).trim();

  if (!cartToken) {
    return null;
  }

  const customer = payload.customer;
  const customerFallback =
    customer && typeof customer === "object"
      ? String((customer as { first_name?: unknown }).first_name ?? "")
      : "";

  const customerName = String(
    payload.customer_first_name ?? payload.first_name ?? customerFallback ?? "",
  ).trim();
  const currency = String(payload.currency ?? "USD").trim() || "USD";
  const checkoutUrl = String(
    payload.abandoned_checkout_url ?? payload.checkout_url ?? payload.cart_url ?? "",
  ).trim();

  const noteAttributes = Array.isArray(payload.note_attributes)
    ? (payload.note_attributes as Array<Record<string, unknown>>)
    : [];

  const browsingSignals = noteAttributes
    .map((attribute) => {
      const name = String(attribute.name ?? "").trim();
      const value = String(attribute.value ?? "").trim();

      if (!name || !value) {
        return null;
      }

      return `${name}: ${value}`;
    })
    .filter(Boolean) as string[];

  const landingSite = String(payload.landing_site ?? "").trim();
  if (landingSite) {
    browsingSignals.push(`Landing site: ${landingSite}`);
  }

  return {
    shopDomain: input.shopDomain,
    cartToken,
    email,
    customerName,
    currency,
    subtotal,
    checkoutUrl,
    items,
    browsingSignals,
  };
}

export function parseOrderConversion(input: {
  payload: Record<string, unknown>;
  shopDomain: string;
}): { shopDomain: string; cartToken?: string; email?: string; orderValue?: number } {
  const payload = input.payload;

  return {
    shopDomain: input.shopDomain,
    cartToken: String(payload.cart_token ?? payload.checkout_token ?? "").trim() || undefined,
    email: String(payload.email ?? "").trim().toLowerCase() || undefined,
    orderValue: numberFromUnknown(payload.total_price) || undefined,
  };
}
