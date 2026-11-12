// Rolling priceValidUntil for every Offer on /bibles/* (unit 2qr): the build date + 12 months,
// computed at build time, never a typed date. A day-of-month overflow (Feb 29 + 12 months) clamps
// to the last day of the target month. Returns YYYY-MM-DD (schema.org Date).
export function priceValidUntil(now = new Date()) {
	if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('priceValidUntil: invalid build date');
	const y = now.getUTCFullYear() + 1;
	const m = now.getUTCMonth();
	const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
	const d = Math.min(now.getUTCDate(), lastDay);
	return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}
