import { NextRequest, NextResponse } from "next/server";

import { recordEmailClick } from "@/lib/database";

function isSafeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const target = request.nextUrl.searchParams.get("to");
  const emailId = Number(idParam);

  if (Number.isFinite(emailId) && emailId > 0) {
    recordEmailClick(emailId);
  }

  if (!target || !isSafeUrl(target)) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  return NextResponse.redirect(target);
}
