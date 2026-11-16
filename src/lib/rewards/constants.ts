/**
 * Standard legal and compliance disclosure for customer testimonial incentives.
 * Guarantees compliance:
 * - Never require a positive rating or positive testimonial in exchange for a reward.
 * - Do not rewrite or influence customer feedback.
 * - Clearly disclose reward conditions to customers.
 */
export const DEFAULT_REWARD_DISCLOSURE =
  "This reward is offered as a genuine token of appreciation for taking the time to share your honest feedback. Reviews of all ratings (positive, neutral, or critical) are equally eligible. Praise never conditions rewards on positive ratings or alters customer feedback.";

export const REWARD_TYPES = [
  {
    id: "COUPON_CODE",
    label: "Coupon Code",
    description: "Display promo code with one-click copy",
  },
  {
    id: "REWARD_URL",
    label: "Reward URL",
    description: "Redirect to custom perks or redemption link",
  },
  {
    id: "DIGITAL_GIFT",
    label: "Digital Gift Link",
    description: "Asset download, ebook, or digital voucher link",
  },
  {
    id: "MANUAL",
    label: "Manual Delivery",
    description: "Workspace staff manually issues custom gift",
  },
  {
    id: "EXTERNAL_PROVIDER",
    label: "External Provider",
    description: "Dispatch webhook to third-party reward API",
  },
] as const;
