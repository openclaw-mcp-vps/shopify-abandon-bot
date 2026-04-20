import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SHOPIFY_OAUTH_STATE_COOKIE } from "@/lib/constants";
import { upsertStoreInstall } from "@/lib/database";
import {
  buildShopifyInstallUrl,
  exchangeShopifyCodeForToken,
  isValidShopDomain,
  verifyShopifyInstallHmac,
} from "@/lib/shopify";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const shop = String(searchParams.get("shop") ?? "").trim().toLowerCase();

  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.json(
      {
        error:
          "Valid Shopify domain required. Example: your-brand.myshopify.com",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();

  const code = searchParams.get("code");
  if (!code) {
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      return NextResponse.json(
        {
          error:
            "Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET before starting installation.",
        },
        { status: 500 },
      );
    }

    const state = randomBytes(18).toString("hex");

    cookieStore.set(SHOPIFY_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(buildShopifyInstallUrl(shop, state));
  }

  const state = String(searchParams.get("state") ?? "");
  const savedState = cookieStore.get(SHOPIFY_OAUTH_STATE_COOKIE)?.value;

  if (!savedState || state !== savedState) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 403 });
  }

  if (!verifyShopifyInstallHmac(searchParams)) {
    return NextResponse.json({ error: "Invalid Shopify HMAC." }, { status: 401 });
  }

  const tokenResult = await exchangeShopifyCodeForToken({
    shop,
    code,
  });

  if (!tokenResult) {
    return NextResponse.json(
      { error: "Failed to exchange Shopify auth code." },
      { status: 500 },
    );
  }

  await upsertStoreInstall({
    shopDomain: shop,
    accessToken: tokenResult.accessToken,
    scopes: tokenResult.scope,
  });

  cookieStore.delete(SHOPIFY_OAUTH_STATE_COOKIE);

  const dashboardUrl = new URL("/dashboard", request.url);
  dashboardUrl.searchParams.set("connected", "1");
  dashboardUrl.searchParams.set("shop", shop);

  return NextResponse.redirect(dashboardUrl);
}
