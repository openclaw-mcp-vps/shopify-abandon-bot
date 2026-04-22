import OpenAI from "openai";

import type { CartLineItem, EmailVariant } from "@/lib/database";

type GenerateEmailInput = {
  storeDomain: string;
  customer: {
    email: string;
    firstName?: string;
  };
  cart: {
    lineItems: CartLineItem[];
    total: number;
    currency: string;
  };
  browsingSignals: string[];
};

type GenerateEmailOutput = {
  variantA: EmailVariant;
  variantB: EmailVariant;
};

type AIResponseShape = {
  variantA: {
    subject: string;
    body: string;
  };
  variantB: {
    subject: string;
    body: string;
  };
};

const openaiClient =
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

function fallbackVariant(input: GenerateEmailInput): GenerateEmailOutput {
  const firstName = input.customer.firstName?.trim();
  const opener = firstName ? `${firstName},` : "You";
  const topItems = input.cart.lineItems
    .slice(0, 3)
    .map((item) => item.title)
    .join(", ");

  return {
    variantA: {
      subject: `Still thinking it over? Your ${input.storeDomain} cart is ready`,
      body: `${opener} left ${topItems} in your cart. Checkout takes less than 60 seconds and your items are still available right now.`
    },
    variantB: {
      subject: `Quick nudge: your cart won't wait forever`,
      body: `You were close to checkout. We saved your picks (${topItems}) so you can finish in one click. If you had any concerns, just reply to this email.`
    }
  };
}

function safeTrim(variant: EmailVariant): EmailVariant {
  return {
    subject: variant.subject.trim().slice(0, 140),
    body: variant.body.trim().slice(0, 2500)
  };
}

export async function generateAbandonEmail(input: GenerateEmailInput) {
  if (!openaiClient) {
    return fallbackVariant(input);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemPrompt =
    "You write high-converting Shopify abandon-cart emails. Always return strict JSON with variantA and variantB, each with subject and body. Keep body under 120 words, plain text, no markdown.";

  const userPrompt = JSON.stringify(
    {
      storeDomain: input.storeDomain,
      customer: input.customer,
      cart: input.cart,
      browsingSignals: input.browsingSignals,
      goals: [
        "Increase conversions without sounding spammy",
        "Use specific product references",
        "Different angle per variant for A/B testing"
      ]
    },
    null,
    2
  );

  try {
    const completion = await openaiClient.chat.completions.create({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return fallbackVariant(input);
    }

    const parsed = JSON.parse(content) as AIResponseShape;
    if (
      !parsed.variantA?.subject ||
      !parsed.variantA?.body ||
      !parsed.variantB?.subject ||
      !parsed.variantB?.body
    ) {
      return fallbackVariant(input);
    }

    return {
      variantA: safeTrim(parsed.variantA),
      variantB: safeTrim(parsed.variantB)
    };
  } catch {
    return fallbackVariant(input);
  }
}
