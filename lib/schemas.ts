import { z } from "zod";

export const cartLineItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  title: z.string().min(1),
  variantTitle: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative()
});

export const generateEmailSchema = z.object({
  storeDomain: z.string().min(1),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().optional()
  }),
  cart: z.object({
    lineItems: z.array(cartLineItemSchema).min(1),
    total: z.number().nonnegative(),
    currency: z.string().default("USD")
  }),
  browsingSignals: z.array(z.string()).default([])
});

export const createCampaignSchema = z.object({
  storeDomain: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  lineItems: z.array(cartLineItemSchema).min(1),
  cartValue: z.number().nonnegative(),
  currency: z.string().default("USD"),
  browsingSignals: z.array(z.string()).default([]),
  sendNow: z.boolean().default(true)
});

export const unlockSchema = z.object({
  email: z.string().email()
});
