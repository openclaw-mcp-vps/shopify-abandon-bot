import { NextResponse } from "next/server";

import { listStores, upsertStore } from "@/lib/database";
import { parseAccessToken, PAYWALL_COOKIE_NAME } from "@/lib/paywall";
import { normalizeShopDomain, validateShopifyToken } from "@/lib/shopify";

interface ShopifyAuthRequest {
  storeDomain: string;
  accessToken: string;
  senderEmail: string;
}

function getAccessPayload(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${PAYWALL_COOKIE_NAME}=`))
    ?.split("=")
    ?.slice(1)
    ?.join("=");

  return parseAccessToken(token);
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({
      message:
        "POST storeDomain + accessToken + senderEmail to connect a store. For OAuth flows, redirect back here with the generated token."
    });
  }

  return NextResponse.json({
    message: "Shop received. Exchange code for token in your OAuth app and POST token to this endpoint.",
    shop
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = getAccessPayload(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ShopifyAuthRequest>;

  if (!body.storeDomain || !body.accessToken || !body.senderEmail) {
    return NextResponse.json(
      {
        error: "storeDomain, accessToken, and senderEmail are required"
      },
      { status: 400 }
    );
  }

  let storeDomain: string;
  try {
    storeDomain = normalizeShopDomain(body.storeDomain);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid shop domain"
      },
      { status: 400 }
    );
  }

  const existingStores = await listStores();
  if (!existingStores.some((store) => store.storeDomain === storeDomain) && existingStores.length >= access.storeLimit) {
    return NextResponse.json(
      {
        error: `Plan limit reached. Your current plan supports up to ${access.storeLimit} store(s).`
      },
      { status: 403 }
    );
  }

  const isValidToken = await validateShopifyToken(storeDomain, body.accessToken);
  if (!isValidToken) {
    return NextResponse.json(
      {
        error: "Shopify token validation failed. Confirm the token has read_checkouts scope."
      },
      { status: 401 }
    );
  }

  const store = await upsertStore({
    storeDomain,
    accessToken: body.accessToken,
    senderEmail: body.senderEmail
  });

  return NextResponse.json({
    ok: true,
    store,
    plan: access.plan,
    storeLimit: access.storeLimit
  });
}
