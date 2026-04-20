import { NextResponse } from "next/server";

import { listCampaigns, summarizeCampaigns, updateCampaign } from "@/lib/database";
import { parseAccessToken, PAYWALL_COOKIE_NAME } from "@/lib/paywall";

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
  const access = getAccessPayload(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const storeDomain = url.searchParams.get("store");
  const campaigns = await listCampaigns(storeDomain || undefined);

  return NextResponse.json({
    ok: true,
    campaigns,
    summary: summarizeCampaigns(campaigns)
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = getAccessPayload(request);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "mark_opened" | "mark_converted";
    campaignId?: string;
  };

  if (!body.action || !body.campaignId) {
    return NextResponse.json(
      {
        error: "action and campaignId are required"
      },
      { status: 400 }
    );
  }

  const updated = await updateCampaign(body.campaignId, (campaign) => {
    if (body.action === "mark_opened") {
      return {
        ...campaign,
        status: campaign.status === "converted" ? "converted" : "opened",
        openedAt: campaign.openedAt || new Date().toISOString()
      };
    }

    return {
      ...campaign,
      status: "converted",
      convertedAt: new Date().toISOString(),
      openedAt: campaign.openedAt || new Date().toISOString(),
      recoveredRevenue: campaign.cartValue
    };
  });

  if (!updated) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, campaign: updated });
}
