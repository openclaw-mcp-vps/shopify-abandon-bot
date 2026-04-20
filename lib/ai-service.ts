import "server-only";

import OpenAI from "openai";

import type { BrowseEvent, CartItem } from "@/lib/database";

export type EmailVariant = {
  subject: string;
  body: string;
};

export type GeneratedEmailPair = {
  variantA: EmailVariant;
  variantB: EmailVariant;
};

export type EmailGenerationInput = {
  customerName?: string;
  customerEmail?: string;
  shopDomain?: string;
  discountCode?: string;
  cartItems: CartItem[];
  browseHistory: BrowseEvent[];
};

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MODEL_NAME = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

function normalizeLineBreaks(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

function fallbackGeneration(input: EmailGenerationInput): GeneratedEmailPair {
  const firstName = input.customerName?.trim() || "there";
  const cartTotal = input.cartItems
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    .toFixed(2);

  const itemNames = input.cartItems
    .slice(0, 3)
    .map((item) => item.title)
    .join(", ");

  const topBrowseCategory =
    input.browseHistory.find((entry) => entry.category)?.category ?? "your recently viewed picks";

  const discountLine = input.discountCode
    ? `Use code ${input.discountCode} at checkout to save before your cart expires.`
    : "Your cart is still reserved, and checkout only takes about 60 seconds.";

  return {
    variantA: {
      subject: `Your ${itemNames || "cart"} is still waiting`,
      body: normalizeLineBreaks(`Hi ${firstName},

You were close to checking out ${itemNames || "your picks"}, and we kept everything ready for you.

Cart value: $${cartTotal}

${discountLine}

Complete your order now and we will keep this lineup available while inventory lasts.`)
    },
    variantB: {
      subject: `${firstName}, still deciding on ${topBrowseCategory}?`,
      body: normalizeLineBreaks(`Hi ${firstName},

Based on what you viewed in ${topBrowseCategory}, your cart looks like a strong match.

${itemNames || "The items you selected"} are still available and ready for checkout.

${discountLine}

Finish checkout today to avoid missing your selected sizes and variants.`)
    }
  };
}

function safeJsonParse(content: string): GeneratedEmailPair | null {
  try {
    const parsed = JSON.parse(content) as Partial<GeneratedEmailPair>;

    if (
      parsed.variantA?.subject &&
      parsed.variantA?.body &&
      parsed.variantB?.subject &&
      parsed.variantB?.body
    ) {
      return {
        variantA: {
          subject: normalizeLineBreaks(parsed.variantA.subject).slice(0, 120),
          body: normalizeLineBreaks(parsed.variantA.body)
        },
        variantB: {
          subject: normalizeLineBreaks(parsed.variantB.subject).slice(0, 120),
          body: normalizeLineBreaks(parsed.variantB.body)
        }
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function generatePersonalizedEmailVariants(
  input: EmailGenerationInput
): Promise<GeneratedEmailPair> {
  if (!openaiClient) {
    return fallbackGeneration(input);
  }

  const systemPrompt = [
    "You are an ecommerce lifecycle marketer specialized in abandoned-cart recovery emails.",
    "Generate two distinct email variants for A/B testing:",
    "Variant A: urgent and direct.",
    "Variant B: consultative and intent-based.",
    "Both variants must feel human, avoid spammy language, and match the exact cart context.",
    "Return strict JSON with keys: variantA.subject, variantA.body, variantB.subject, variantB.body.",
    "Subject <= 70 characters. Body must be 90-180 words and plain text only."
  ].join(" ");

  const userPrompt = {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    shopDomain: input.shopDomain,
    discountCode: input.discountCode,
    cartItems: input.cartItems,
    browseHistory: input.browseHistory
  };

  try {
    const completion = await openaiClient.chat.completions.create({
      model: MODEL_NAME,
      response_format: { type: "json_object" },
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate both variants from this JSON input:\n${JSON.stringify(userPrompt, null, 2)}`
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return fallbackGeneration(input);
    }

    const parsed = safeJsonParse(raw);
    return parsed ?? fallbackGeneration(input);
  } catch {
    return fallbackGeneration(input);
  }
}
