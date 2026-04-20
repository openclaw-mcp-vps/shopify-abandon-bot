import crypto from "node:crypto";

import { shopifyApi } from "@shopify/shopify-api";
import { z } from "zod";

import { readJsonFile, writeJsonFile } from "@/lib/storage";

const STORES_FILE = "stores.json";

const shopConnectionSchema = z.object({
  id: z.string(),
  shopDomain: z.string(),
  accessToken: z.string(),
  ownerEmail: z.string().email().optional(),
  installedAt: z.string(),
  updatedAt: z.string(),
});

export type ShopConnection = z.infer<typeof shopConnectionSchema>;

type StoreConnectionFile = {
  stores: ShopConnection[];
};

const EMPTY_STORES: StoreConnectionFile = { stores: [] };

function getShopifyApiKey() {
  return process.env.SHOPIFY_API_KEY ?? "";
}

function getShopifyApiSecret() {
  return process.env.SHOPIFY_API_SECRET ?? "";
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}

export function getScopes() {
  return (process.env.SHOPIFY_SCOPES ?? "read_products,read_checkouts")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

let cachedShopifyClient: ReturnType<typeof shopifyApi> | null = null;

export function getShopifyClient() {
  if (cachedShopifyClient) {
    return cachedShopifyClient;
  }

  cachedShopifyClient = shopifyApi({
    apiKey: getShopifyApiKey() || "missing",
    apiSecretKey: getShopifyApiSecret() || "missing",
    scopes: getScopes(),
    hostName: new URL(getAppUrl()).host,
    isEmbeddedApp: false,
    apiVersion: (process.env.SHOPIFY_API_VERSION ?? "2025-10") as never,
  });

  return cachedShopifyClient;
}

export function sanitizeShopDomain(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value) {
    return null;
  }

  const normalized = value.endsWith(".myshopify.com")
    ? value
    : `${value}.myshopify.com`;

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function buildOAuthStartUrl(shopDomain: string, state: string) {
  const redirectUri = `${getAppUrl()}/api/shopify/auth`;
  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);

  url.searchParams.set("client_id", getShopifyApiKey());
  url.searchParams.set("scope", getScopes().join(","));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyOAuthHmac(query: URLSearchParams, hmac: string): boolean {
  const params = new URLSearchParams(query);
  params.delete("hmac");
  params.delete("signature");

  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", getShopifyApiSecret())
    .update(message)
    .digest("hex");

  return timingSafeCompare(digest, hmac);
}

export function verifyWebhookHmac(rawBody: string, receivedHmac: string): boolean {
  const digest = crypto
    .createHmac("sha256", getShopifyApiSecret())
    .update(rawBody, "utf8")
    .digest("base64");

  return timingSafeCompare(digest, receivedHmac);
}

export async function exchangeCodeForAccessToken(params: {
  shopDomain: string;
  code: string;
}) {
  const response = await fetch(
    `https://${params.shopDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: getShopifyApiKey(),
        client_secret: getShopifyApiSecret(),
        code: params.code,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange access token: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { access_token: string };

  if (!payload.access_token) {
    throw new Error("Shopify did not return an access token.");
  }

  return payload.access_token;
}

async function readConnections(): Promise<StoreConnectionFile> {
  return readJsonFile<StoreConnectionFile>(STORES_FILE, EMPTY_STORES);
}

async function writeConnections(file: StoreConnectionFile) {
  await writeJsonFile(STORES_FILE, file);
}

export async function upsertShopConnection(
  input: Omit<ShopConnection, "id" | "installedAt" | "updatedAt"> & {
    id?: string;
    installedAt?: string;
    updatedAt?: string;
  }
): Promise<ShopConnection> {
  const file = await readConnections();
  const now = new Date().toISOString();
  const existingIndex = file.stores.findIndex(
    (store) => store.shopDomain === input.shopDomain
  );

  if (existingIndex >= 0) {
    const updated = shopConnectionSchema.parse({
      ...file.stores[existingIndex],
      ...input,
      updatedAt: input.updatedAt ?? now,
    });

    file.stores[existingIndex] = updated;
    await writeConnections(file);

    return updated;
  }

  const created = shopConnectionSchema.parse({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    installedAt: input.installedAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });

  file.stores.push(created);
  await writeConnections(file);

  return created;
}

export async function getShopConnection(shopDomain: string) {
  const file = await readConnections();
  return file.stores.find((store) => store.shopDomain === shopDomain) ?? null;
}

export function parseBrowsingSignals(
  noteAttributes?: Array<{ name: string; value: string }>
): string[] {
  if (!Array.isArray(noteAttributes)) {
    return [];
  }

  return noteAttributes
    .map((attribute) => `${attribute.name}: ${attribute.value}`)
    .slice(0, 4);
}
