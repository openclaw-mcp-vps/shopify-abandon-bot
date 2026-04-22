import { NextResponse } from "next/server";
import Stripe from "stripe";

import { logWebhookEvent, upsertPayment } from "@/lib/database";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

function inferStoreLimit(amountInCents: number) {
  return amountInCents >= 9900 ? 5 : 1;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      {
        error: "Missing Stripe webhook signing secret"
      },
      { status: 400 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 });
  }

  logWebhookEvent(
    "stripe",
    event.type,
    event.data.object as unknown as Record<string, unknown>
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email || session.customer_email;

    if (email) {
      upsertPayment({
        provider: "stripe",
        customerEmail: email,
        active: true,
        storeLimit: inferStoreLimit(session.amount_total || 2900),
        referenceId: session.id,
        metadata: {
          mode: session.mode || "payment"
        }
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const email = subscription.metadata?.customer_email;

    if (email) {
      upsertPayment({
        provider: "stripe",
        customerEmail: email,
        active: false,
        storeLimit: inferStoreLimit(subscription.items.data[0]?.price?.unit_amount || 2900),
        referenceId: subscription.id,
        metadata: {
          status: subscription.status
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
