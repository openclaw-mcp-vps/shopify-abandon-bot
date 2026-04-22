import "@shopify/shopify-api/adapters/node";
import { LATEST_API_VERSION, shopifyApi } from "@shopify/shopify-api";
import crypto from "node:crypto";

const FALLBACK_SCOPES = "read_customers,read_checkouts,read_orders";

export function normalizeShopDomain(shop: string) {
  const cleaned = shop.toLowerCase().trim().replace(/^https?:\/\//, "");
  if (!cleaned.endsWith(".myshopify.com")) {
    return `${cleaned}.myshopify.com`;
  }
  return cleaned;
}

function appHostName() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

let cachedClient: ReturnType<typeof shopifyApi> | null = null;

export function getShopifyClient() {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY || "dev-key",
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "dev-secret",
    scopes: (process.env.SHOPIFY_SCOPES || FALLBACK_SCOPES).split(","),
    hostName: appHostName(),
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false
  });

  return cachedClient;
}

export function createOAuthState() {
  return crypto.randomBytes(16).toString("hex");
}

export function buildShopifyInstallUrl(shop: string, state: string) {
  const normalizedShop = normalizeShopDomain(shop);
  const scopes = process.env.SHOPIFY_SCOPES || FALLBACK_SCOPES;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/shopify/auth`;

  const url = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", process.env.SHOPIFY_API_KEY || "");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export function verifyShopifyOAuthHmac(query: URLSearchParams) {
  const providedHmac = query.get("hmac");
  if (!providedHmac || !process.env.SHOPIFY_API_SECRET) {
    return false;
  }

  const pairs: string[] = [];
  for (const [key, value] of query.entries()) {
    if (key === "hmac" || key === "signature") {
      continue;
    }
    pairs.push(`${key}=${value}`);
  }

  const message = pairs.sort().join("&");
  const computed = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  const provided = Buffer.from(providedHmac, "utf8");
  const expected = Buffer.from(computed, "utf8");

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export async function exchangeCodeForToken(input: { shop: string; code: string }) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const apiKey = process.env.SHOPIFY_API_KEY;

  if (!secret || !apiKey) {
    throw new Error("Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET");
  }

  const response = await fetch(`https://${input.shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: secret,
      code: input.code
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Shopify OAuth token: ${response.status}`);
  }

  const parsed = (await response.json()) as { access_token: string; scope?: string };
  return {
    accessToken: parsed.access_token,
    scope: parsed.scope || ""
  };
}

export function verifyShopifyWebhookSignature(rawBody: string, hmacHeader: string | null) {
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!secret || !hmacHeader) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const provided = Buffer.from(hmacHeader, "utf8");
  const expected = Buffer.from(digest, "utf8");

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
