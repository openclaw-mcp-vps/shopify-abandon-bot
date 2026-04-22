import { NextResponse } from "next/server";

import { upsertStore } from "@/lib/database";
import {
  buildShopifyInstallUrl,
  createOAuthState,
  exchangeCodeForToken,
  getShopifyClient,
  normalizeShopDomain,
  verifyShopifyOAuthHmac
} from "@/lib/shopify";

const OAUTH_COOKIE_NAME = "shopify_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!shop) {
    return NextResponse.json(
      {
        error: "Missing `shop` query param"
      },
      { status: 400 }
    );
  }

  const normalizedShop = normalizeShopDomain(shop);

  if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
    return NextResponse.json(
      {
        error: "Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET before connecting a store."
      },
      { status: 500 }
    );
  }

  getShopifyClient();

  if (code && state) {
    const stateCookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${OAUTH_COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!stateCookie || stateCookie !== state) {
      return NextResponse.json(
        {
          error: "Invalid OAuth state"
        },
        { status: 400 }
      );
    }

    if (!verifyShopifyOAuthHmac(url.searchParams)) {
      return NextResponse.json(
        {
          error: "Invalid Shopify HMAC"
        },
        { status: 401 }
      );
    }

    try {
      const tokenResult = await exchangeCodeForToken({
        shop: normalizedShop,
        code
      });

      upsertStore({
        shopDomain: normalizedShop,
        accessToken: tokenResult.accessToken
      });

      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding?connected=1&shop=${normalizedShop}`
      );
      response.cookies.delete(OAUTH_COOKIE_NAME);
      return response;
    } catch {
      return NextResponse.json(
        {
          error: "Failed to complete Shopify OAuth flow"
        },
        { status: 500 }
      );
    }
  }

  const oauthState = createOAuthState();
  const installUrl = buildShopifyInstallUrl(normalizedShop, oauthState);
  const response = NextResponse.redirect(installUrl);

  response.cookies.set({
    name: OAUTH_COOKIE_NAME,
    value: oauthState,
    maxAge: 600,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return response;
}
