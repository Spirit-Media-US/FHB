// The /print volume ladder, for pages OTHER than /print that sell print copies — today the
// per-language quick order form on /bibles/<language>-bible/#order (Kevin 2026-10-03: "1 yes",
// reuse the /print tiers and its discount calculation; never invent new ones).
//
// functions/dvc-checkout.ts TIERS is what Stripe charges; print.astro carries its own copy for
// its live total. All three are asserted equal by scripts/pricing-verify.mjs (check 9), so a
// tier edited in one place and not the others stops the build.
export const PRINT_TIERS: { min: number; pct: number }[] = [
	{ min: 250, pct: 30 },
	{ min: 100, pct: 25 },
	{ min: 50, pct: 20 },
	{ min: 25, pct: 15 },
	{ min: 10, pct: 10 },
	{ min: 1, pct: 0 },
];
