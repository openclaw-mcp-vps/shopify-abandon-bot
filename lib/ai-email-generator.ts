import OpenAI from "openai";
import { z } from "zod";

const cartItemSchema = z.object({
  title: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  price: z.number().nonnegative(),
  productUrl: z.string().url().optional(),
});

export const emailGenerationInputSchema = z.object({
  storeName: z.string().min(2),
  shopDomain: z.string().min(3).optional(),
  customerFirstName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  currency: z.string().min(3).max(5).default("USD"),
  cartItems: z.array(cartItemSchema).min(1),
  cartValue: z.number().positive().optional(),
  browsingSignals: z.array(z.string().min(2)).default([]),
});

const generatedVariantSchema = z.object({
  variant: z.enum(["A", "B"]),
  subject: z.string().min(8).max(120),
  preview: z.string().min(20).max(220),
  body: z.string().min(80).max(2500),
  ctaLabel: z.string().min(2).max(40),
});

const generatedEmailSetSchema = z.object({
  customerSegment: z.string().min(3),
  rationale: z.string().min(20),
  variants: z.array(generatedVariantSchema).length(2),
});

export type EmailGenerationInput = z.infer<typeof emailGenerationInputSchema>;
export type GeneratedEmailVariant = z.infer<typeof generatedVariantSchema>;
export type GeneratedEmailSet = z.infer<typeof generatedEmailSetSchema>;

function currency(value: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function summarizeCart(items: EmailGenerationInput["cartItems"]): string {
  return items
    .map((item) => `${item.quantity}x ${item.title}`)
    .slice(0, 4)
    .join(", ");
}

function fallbackOutput(input: EmailGenerationInput): GeneratedEmailSet {
  const total =
    input.cartValue ??
    input.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartSummary = summarizeCart(input.cartItems);
  const firstProduct = input.cartItems[0]?.title;
  const signalLine =
    input.browsingSignals.length > 0
      ? `You also spent extra time looking at ${input.browsingSignals[0]}.`
      : `Your cart is still saved and ready whenever you are.`;

  return {
    customerSegment:
      total >= 200
        ? "High-intent, high-AOV shopper"
        : "Price-aware shopper with strong product intent",
    rationale:
      "Variant A leans into urgency and confidence. Variant B emphasizes value and personal fit to maximize click-through across mixed shopper intent.",
    variants: [
      {
        variant: "A",
        subject: `${input.customerFirstName}, your ${firstProduct} is almost gone`,
        preview: `Your ${cartSummary} cart is still reserved. Complete checkout in under a minute.`,
        ctaLabel: "Finish checkout",
        body: [
          `Hi ${input.customerFirstName},`,
          "",
          `You were close to checking out at ${input.storeName}, so we kept your cart ready:`,
          `${cartSummary}`,
          `Cart total: ${currency(total, input.currency)}`,
          "",
          `${signalLine}`,
          "",
          "Complete checkout now to lock in your items before stock shifts.",
          "",
          `Thanks,`,
          `${input.storeName} team`,
        ].join("\n"),
      },
      {
        variant: "B",
        subject: `Still deciding, ${input.customerFirstName}? Your picks are waiting`,
        preview: `A quick reminder from ${input.storeName}: your cart is intact and one click away.`,
        ctaLabel: "Return to cart",
        body: [
          `Hi ${input.customerFirstName},`,
          "",
          `You built a strong cart at ${input.storeName}:`,
          `${cartSummary}`,
          `Order value: ${currency(total, input.currency)}`,
          "",
          `Most customers who picked ${firstProduct} also came back within 24 hours to complete their order.`,
          "",
          "If timing was the only blocker, your cart is saved and ready.",
          "",
          `See you soon,`,
          `${input.storeName} team`,
        ].join("\n"),
      },
    ],
  };
}

function normalizeVariantOrder(variants: GeneratedEmailVariant[]): GeneratedEmailVariant[] {
  const map = new Map(variants.map((variant) => [variant.variant, variant]));
  const variantA = map.get("A");
  const variantB = map.get("B");

  if (!variantA || !variantB) {
    throw new Error("AI output must include both A and B variants.");
  }

  return [variantA, variantB];
}

export async function generateAbandonEmail(
  rawInput: EmailGenerationInput
): Promise<GeneratedEmailSet> {
  const input = emailGenerationInputSchema.parse(rawInput);
  const fallback = fallbackOutput(input);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const total =
      input.cartValue ??
      input.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const promptPayload = {
      ...input,
      cartValue: total,
      cartSummary: summarizeCart(input.cartItems),
      objective:
        "Write two high-converting abandonment email variants for Shopify. Be specific to products and browsing behavior, avoid spammy claims, and sound human.",
      outputContract: {
        customerSegment: "string",
        rationale: "string",
        variants: [
          {
            variant: "A",
            subject: "string",
            preview: "string",
            ctaLabel: "string",
            body: "plain-text email body with line breaks",
          },
          {
            variant: "B",
            subject: "string",
            preview: "string",
            ctaLabel: "string",
            body: "plain-text email body with line breaks",
          },
        ],
      },
    };

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an ecommerce lifecycle marketer. Return only strict JSON that matches the requested schema. No markdown.",
        },
        {
          role: "user",
          content: JSON.stringify(promptPayload),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    const rawJson = typeof content === "string" ? content : "";

    if (!rawJson) {
      return fallback;
    }

    const parsed = generatedEmailSetSchema.parse(JSON.parse(rawJson));

    return {
      ...parsed,
      variants: normalizeVariantOrder(parsed.variants),
    };
  } catch (error) {
    console.warn("[ai-email-generator] Falling back to deterministic copy.", error);
    return fallback;
  }
}
