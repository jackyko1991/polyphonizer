/**
 * Tiers and their limits, in one place (Tensorizer's pattern). There is no sign-in yet: everyone is on the
 * community tier, which keeps one score of one's own; the built-in samples, library pieces and Learn problems are
 * unlimited. Pro (later, from learnkit-hub's entitlements for a "polyphonizer" product) raises the limit.
 */
export type Tier = "community" | "pro";

/** scores of one's own allowed per tier */
export const OWN_SCORE_LIMIT: Record<Tier, number> = { community: 1, pro: 50 };

/** the visitor's tier: community until accounts arrive */
export const currentTier = (): Tier => "community";

/** how many more own scores this tier may keep */
export const ownRoom = (count: number, tier: Tier = currentTier()) => Math.max(0, OWN_SCORE_LIMIT[tier] - count);
