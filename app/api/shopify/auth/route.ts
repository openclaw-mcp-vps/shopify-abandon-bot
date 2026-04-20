import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { upsertStoreAuth } from "@/lib/database";
import {
  buildShopifyAuthUrl,
  exchangeShopifyCodeForToken,
  isValidShopDomain,
  normalizeShopDomain,
  verifyShopifyOAuthHmac
} from "@/lib/shopify";

const STATE_COOKIE = "shopify_oauth_state";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requestedShop = params.get("shop");

  if (!requestedShop) {
    return errorResponse("Missing required `shop` query parameter. Example: ?shop=your-store.myshopify.com");
  }

  const shopDomain = normalizeShopDomain(requestedShop);

  if (!isValidShopDomain(shopDomain)) {
    return errorResponse("Invalid Shopify shop domain.");
  }

  const code = params.get("code");

  if (!code) {
    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${request.nextUrl.origin}/api/shopify/auth`;
    const authorizeUrl = buildShopifyAuthUrl({
      shopDomain,
      state,
      redirectUri
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/"
    });

    return response;
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const receivedState = params.get("state");

  if (!expectedState || !receivedState || expectedState !== receivedState) {
    return errorResponse("Invalid OAuth state. Retry the Shopify connect flow.", 401);
  }

  if (!verifyShopifyOAuthHmac(params)) {
    return errorResponse("Invalid Shopify OAuth signature.", 401);
  }

  try {
    const accessToken = await exchangeShopifyCodeForToken({
      shopDomain,
      code
    });

    upsertStoreAuth({
      shopDomain,
      accessToken
    });

    const dashboardUrl = new URL("/dashboard", request.nextUrl.origin);
    dashboardUrl.searchParams.set("shop", shopDomain);
    dashboardUrl.searchParams.set("connected", "1");

    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set(STATE_COOKIE, "", {
      path: "/",
      maxAge: 0
    });
    response.cookies.set("shopify_connected_shop", shopDomain, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/"
    });

    return response;
  } catch (error) {
    return errorResponse(
      error instanceof Error ? `Failed to complete Shopify auth: ${error.message}` : "Failed to complete Shopify auth.",
      500
    );
  }
}
