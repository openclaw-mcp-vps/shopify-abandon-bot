import { NextRequest, NextResponse } from "next/server";

import { recordEmailOpen } from "@/lib/database";

const pixelBuffer = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const emailId = Number(idParam);

  if (Number.isFinite(emailId) && emailId > 0) {
    recordEmailOpen(emailId);
  }

  return new NextResponse(pixelBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(pixelBuffer.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
    }
  });
}
