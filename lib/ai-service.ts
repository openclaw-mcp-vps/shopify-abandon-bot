import OpenAI from "openai";

import type { BrowsingSignal, CartItem, EmailVariant } from "@/lib/types";

export interface GenerateEmailInput {
  storeDomain: string;
  customerFirstName?: string;
  cartItems: CartItem[];
  browsingSignals: BrowsingSignal[];
  cartValue: number;
  recoveryUrl: string;
}

function createFallbackVariants(input: GenerateEmailInput): EmailVariant[] {
  const firstItem = input.cartItems[0];
  const firstName = input.customerFirstName?.trim();
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const itemName = firstItem ? firstItem.title : "your items";

  const variantA: EmailVariant = {
    id: "A",
    subject: `${firstName ? `${firstName}, ` : ""}your ${itemName} is still waiting in cart`,
    bodyText: `${greeting}\n\nYou left ${itemName} in your cart. It looks like you were close to checkout, so we saved your cart and made it one click to finish.\n\nComplete checkout here: ${input.recoveryUrl}\n\nIf you had any questions about sizing, shipping, or fit, reply and we will help right away.`,
    ctaLabel: "Complete My Checkout"
  };

  const topSignal = input.browsingSignals.sort((a, b) => b.secondsOnPage - a.secondsOnPage)[0];
  const contextLine = topSignal
    ? `You spent time on ${topSignal.path}, so this cart appears to be a strong match.`
    : "This cart was tailored to what you viewed most recently.";

  const variantB: EmailVariant = {
    id: "B",
    subject: `Still comparing options? Your cart is saved`,
    bodyText: `${greeting}\n\n${contextLine}\n\nYour cart total is $${input.cartValue.toFixed(2)} and everything is still reserved for now.\n\nResume checkout: ${input.recoveryUrl}\n\nYou are one step away from placing the order.`,
    ctaLabel: "Resume Checkout"
  };

  return [variantA, variantB];
}

function buildPrompt(input: GenerateEmailInput): string {
  return [
    "You are a conversion-focused ecommerce copywriter.",
    "Generate two abandon-cart email variants for A/B testing.",
    "Output strict JSON with this shape:",
    '{"variants":[{"id":"A","subject":"...","bodyText":"...","ctaLabel":"..."},{"id":"B","subject":"...","bodyText":"...","ctaLabel":"..."}] }',
    "Rules:",
    "- Keep subject <= 65 characters.",
    "- Body should be plain text, 90-160 words.",
    "- Mention concrete products from cart.",
    "- Reference browsing behavior if available.",
    "- Never use fake discounts.",
    "- Tone: helpful, confident, short paragraphs.",
    "- End with a direct CTA.",
    "Context:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateEmailVariants(input: GenerateEmailInput): Promise<EmailVariant[]> {
  const fallback = createFallbackVariants(input);
  const client = getClient();

  if (!client) {
    return fallback;
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You create high-converting ecommerce lifecycle emails and respond with valid JSON only."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = JSON.parse(content) as { variants?: EmailVariant[] };

    if (!parsed.variants || parsed.variants.length < 2) {
      return fallback;
    }

    const cleaned = parsed.variants
      .slice(0, 2)
      .map((variant, index) => ({
        id: index === 0 ? "A" : "B",
        subject: (variant.subject || fallback[index].subject).trim(),
        bodyText: (variant.bodyText || fallback[index].bodyText).trim(),
        ctaLabel: (variant.ctaLabel || fallback[index].ctaLabel).trim()
      })) as EmailVariant[];

    return cleaned;
  } catch {
    return fallback;
  }
}
