export const BILLING_PLANS = {
  free: {
    id: "free",
    label: "Free",
    monthlyStudyGuides: 2,
    maxFiles: 3,
    maxUnits: 75,
    maxCharacters: 150_000,
  },
  pro: {
    id: "pro",
    label: "Folveta Pro",
    monthlyStudyGuides: 10,
    maxFiles: 10,
    maxUnits: 300,
    maxCharacters: 600_000,
  },
} as const;

export type BillingPlanId = keyof typeof BILLING_PLANS;

export const PADDLE_SANDBOX_PRODUCT_ID = "pro_01m1b264s0fbx0r5dbwq0e03aa";
export const PADDLE_SANDBOX_PRICE_ID = "pri_01m1b26517pap7d484ngr7746a";

export function getPaddlePriceId() {
  return process.env.PADDLE_PRICE_ID ?? PADDLE_SANDBOX_PRICE_ID;
}

export function getPaddleProductId() {
  return process.env.PADDLE_PRODUCT_ID ?? PADDLE_SANDBOX_PRODUCT_ID;
}
