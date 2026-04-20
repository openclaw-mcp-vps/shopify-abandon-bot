import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = "shopify_abandon_paid";

export function middleware(request: NextRequest) {
  const cookieValue = request.cookies.get(ACCESS_COOKIE)?.value;
  const isPaid = cookieValue === "1";
  const pathname = request.nextUrl.pathname;

  if (isPaid) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/ai/generate-email")) {
    return NextResponse.json(
      {
        error: "Payment required",
        message: "Activate a paid plan to use AI generation endpoints."
      },
      { status: 402 }
    );
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.searchParams.set("paywall", "1");

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/ai/generate-email"]
};
