import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  buildOAuthStartUrl,
  exchangeCodeForAccessToken,
  getShopifyClient,
  sanitizeShopDomain,
  upsertShopConnection,
  verifyOAuthHmac,
} from "@/lib/shopify";

export const runtime = "nodejs";

const STATE_COOKIE = "shopify_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const hmac = url.searchParams.get("hmac");
  const state = url.searchParams.get("state");
  const incomingShop = url.searchParams.get("shop");

  if (!code) {
    if (!incomingShop) {
      return NextResponse.json(
        { error: "Missing shop query parameter." },
        { status: 400 }
      );
    }

    const shopDomain = sanitizeShopDomain(incomingShop);
    if (!shopDomain) {
      return NextResponse.json(
        { error: "Invalid Shopify shop domain." },
        { status: 400 }
      );
    }

    // Initialize the client config once so invalid env fails early.
    getShopifyClient();

    const oauthState = crypto.randomUUID();
    const authUrl = buildOAuthStartUrl(shopDomain, oauthState);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(STATE_COOKIE, oauthState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return response;
  }

  if (!incomingShop || !hmac || !state) {
    return NextResponse.json(
      { error: "Missing OAuth callback parameters." },
      { status: 400 }
    );
  }

  const shopDomain = sanitizeShopDomain(incomingShop);
  if (!shopDomain) {
    return NextResponse.json({ error: "Invalid shop domain." }, { status: 400 });
  }

  const stateCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!stateCookie || stateCookie !== state) {
    return NextResponse.json(
      { error: "OAuth state check failed." },
      { status: 401 }
    );
  }

  if (!verifyOAuthHmac(url.searchParams, hmac)) {
    return NextResponse.json(
      { error: "OAuth HMAC verification failed." },
      { status: 401 }
    );
  }

  try {
    const accessToken = await exchangeCodeForAccessToken({ shopDomain, code });

    await upsertShopConnection({
      shopDomain,
      accessToken,
    });

    const redirectUrl = new URL("/onboarding?shopify=connected", request.url);
    redirectUrl.searchParams.set("shop", shopDomain);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set("shopify_shop", shopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[shopify-auth] OAuth exchange failed", error);
    return NextResponse.json(
      { error: "Unable to complete Shopify connection." },
      { status: 500 }
    );
  }
}
