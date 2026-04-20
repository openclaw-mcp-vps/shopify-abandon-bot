import { createHmac, timingSafeEqual } from "crypto";

import { ApiVersion } from "@shopify/shopify-api";

import type { BrowsingSignal, CartItem } from "@/lib/types";

interface ShopifyLineItem {
  product_id?: number;
  variant_id?: number;
  title: string;
  variant_title?: string;
  quantity: number;
  price: string;
  image_url?: string;
  url?: string;
}

interface ShopifyCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ShopifyNoteAttribute {
  name: string;
  value: string;
}

export interface ShopifyCheckoutPayload {
  id: number | string;
  abandoned_checkout_url?: string;
  email?: string;
  customer?: ShopifyCustomer;
  line_items: ShopifyLineItem[];
  total_price: string;
  currency: string;
  completed_at?: string | null;
  note_attributes?: ShopifyNoteAttribute[];
}

export function normalizeShopDomain(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
    throw new Error("Store domain must be a valid *.myshopify.com domain");
  }

  return normalized;
}

export function verifyShopifyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  const signatureBuffer = Buffer.from(signature);
  const computedBuffer = Buffer.from(computed);

  if (signatureBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, computedBuffer);
}

export async function validateShopifyToken(storeDomain: string, accessToken: string): Promise<boolean> {
  const apiVersion = ApiVersion.April26;

  try {
    const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/shop.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    return response.ok;
  } catch {
    return false;
  }
}

function parseBrowsingSignals(noteAttributes?: ShopifyNoteAttribute[]): BrowsingSignal[] {
  if (!noteAttributes || noteAttributes.length === 0) {
    return [];
  }

  const signalAttribute = noteAttributes.find((attribute) => attribute.name === "browsing_signals");
  if (!signalAttribute) {
    return [];
  }

  try {
    const parsed = JSON.parse(signalAttribute.value) as BrowsingSignal[];
    return parsed.slice(0, 10).map((signal) => ({
      path: signal.path,
      secondsOnPage: Number(signal.secondsOnPage) || 0,
      referrer: signal.referrer,
      viewedAt: signal.viewedAt
    }));
  } catch {
    return [];
  }
}

export function checkoutToCartItems(payload: ShopifyCheckoutPayload): CartItem[] {
  return payload.line_items.map((item) => ({
    productId: item.product_id?.toString(),
    variantId: item.variant_id?.toString(),
    title: item.title,
    variantTitle: item.variant_title,
    quantity: item.quantity,
    price: Number(item.price),
    imageUrl: item.image_url,
    productUrl: item.url
  }));
}

export function mapShopifyCheckout(payload: ShopifyCheckoutPayload): {
  checkoutId: string;
  customerEmail: string;
  customerFirstName?: string;
  cartItems: CartItem[];
  browsingSignals: BrowsingSignal[];
  cartValue: number;
  recoveryUrl: string;
  isAbandoned: boolean;
} {
  const cartItems = checkoutToCartItems(payload);
  const customerEmail = payload.email || payload.customer?.email || "";
  const recoveryUrl = payload.abandoned_checkout_url || "";

  return {
    checkoutId: String(payload.id),
    customerEmail,
    customerFirstName: payload.customer?.first_name,
    cartItems,
    browsingSignals: parseBrowsingSignals(payload.note_attributes),
    cartValue: Number(payload.total_price),
    recoveryUrl,
    isAbandoned: !payload.completed_at
  };
}
