import "server-only";

import OpenAI from "openai";

import type { CartItem, EmailVariant, VariantId } from "@/lib/database";

type GenerateEmailInput = {
  storeName: string;
  customerName: string;
  cartItems: CartItem[];
  browsingSignals: string[];
  cartValue: number;
  currency: string;
};

export type GenerateEmailResult = {
  reasoning: string;
  variants: EmailVariant[];
};

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function fallbackBody(input: GenerateEmailInput, variant: VariantId): string {
  const firstItem = input.cartItems[0];
  const itemSummary = input.cartItems
    .map((item) => `${item.quantity}x ${item.title}`)
    .join(", ");

  if (variant === "A") {
    return [
      `Hi ${input.customerName || "there"},`,
      "",
      `You left ${itemSummary} in your cart at ${input.storeName}. These picks are still available right now, and we can have them moving today.`,
      "",
      `Your cart is worth ${input.currency} ${input.cartValue.toFixed(2)}. Check out now to lock in your selection before sizes or colors sell out.`,
      "",
      "Complete your order:",
      "{{checkout_url}}",
    ].join("\n");
  }

  const behaviorHook =
    input.browsingSignals[0] ??
    `You spent time comparing ${firstItem?.title ?? "your favorites"}`;

  return [
    `Hey ${input.customerName || "there"},`,
    "",
    `${behaviorHook}. We saved your cart so you can finish in one click.`,
    "",
    `You are only one step away from getting ${firstItem?.title ?? "your items"} delivered. Your ${input.currency} ${input.cartValue.toFixed(2)} cart is ready whenever you are.`,
    "",
    "Resume checkout:",
    "{{checkout_url}}",
  ].join("\n");
}

function buildFallback(input: GenerateEmailInput): GenerateEmailResult {
  const topItem = input.cartItems[0]?.title ?? "your picks";

  return {
    reasoning:
      "Fallback mode used because OPENAI_API_KEY is missing or generation failed. Variants are generated from cart and browsing context.",
    variants: [
      {
        variant: "A",
        subject: `${input.customerName || "Your"}, your ${topItem} is still in your cart`,
        body: fallbackBody(input, "A"),
        cta: "Finish my order",
      },
      {
        variant: "B",
        subject: `Still thinking about ${topItem}? We saved your cart`,
        body: fallbackBody(input, "B"),
        cta: "Resume checkout",
      },
    ],
  };
}

function sanitizeVariants(payload: unknown, fallback: GenerateEmailResult): EmailVariant[] {
  if (!payload || typeof payload !== "object") {
    return fallback.variants;
  }

  const variants = (payload as { variants?: unknown }).variants;
  if (!Array.isArray(variants)) {
    return fallback.variants;
  }

  const shaped = variants
    .slice(0, 2)
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const variant = index === 0 ? "A" : "B";
      const subject = String((item as { subject?: unknown }).subject ?? "").trim();
      const body = String((item as { body?: unknown }).body ?? "").trim();
      const cta = String((item as { cta?: unknown }).cta ?? "").trim();

      if (!subject || !body || !cta) {
        return null;
      }

      return {
        variant,
        subject,
        body,
        cta,
      } as EmailVariant;
    })
    .filter(Boolean) as EmailVariant[];

  if (shaped.length !== 2) {
    return fallback.variants;
  }

  return shaped;
}

export async function generatePersonalizedEmail(
  input: GenerateEmailInput,
): Promise<GenerateEmailResult> {
  const fallback = buildFallback(input);

  if (!openaiClient) {
    return fallback;
  }

  const itemLines = input.cartItems
    .map((item) => `- ${item.quantity}x ${item.title} (${input.currency} ${item.price.toFixed(2)})`)
    .join("\n");

  const signalLines =
    input.browsingSignals.length > 0
      ? input.browsingSignals.map((signal) => `- ${signal}`).join("\n")
      : "- No behavior signals available";

  const prompt = [
    "You write abandoned cart emails for Shopify stores.",
    "Return strict JSON with fields: reasoning, variants.",
    "variants must be exactly 2 objects with fields subject, body, cta.",
    "Rules:",
    "- Keep each subject under 60 characters.",
    "- Body between 70 and 140 words.",
    "- Mention at least one concrete cart item and one behavior signal.",
    "- Include '{{checkout_url}}' exactly once in each body.",
    "- No fake scarcity, no deceptive language.",
    "",
    `Store: ${input.storeName}`,
    `Customer: ${input.customerName}`,
    `Cart value: ${input.currency} ${input.cartValue.toFixed(2)}`,
    "Cart items:",
    itemLines,
    "Browsing signals:",
    signalLines,
  ].join("\n");

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a conversion copywriter specializing in ethical lifecycle email for ecommerce.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as { reasoning?: string; variants?: unknown };
    return {
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
          ? parsed.reasoning.trim()
          : fallback.reasoning,
      variants: sanitizeVariants(parsed, fallback),
    };
  } catch {
    return fallback;
  }
}
