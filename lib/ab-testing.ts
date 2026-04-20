import crypto from "node:crypto";

export type ABVariant = "A" | "B";

export function assignVariant(seed: string): ABVariant {
  const digest = crypto.createHash("sha256").update(seed).digest();
  return digest[0] % 2 === 0 ? "A" : "B";
}

export function getVariantLabel(variant: ABVariant): string {
  return variant === "A"
    ? "Urgency + social proof"
    : "Benefit-led personalization";
}

export function calculateLiftFromBaseline(conversionRate: number): number {
  const baseline = 0.1;

  return ((conversionRate - baseline) / baseline) * 100;
}
