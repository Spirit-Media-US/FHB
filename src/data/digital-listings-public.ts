// The digital-listings.json entries that may be RENDERED on the site.
// Kevin 2026-11-08: no link to, mention of, or logo from Amazon anywhere on FHB — the FHB site is the
// primary retailer. digital-listings.json still carries the Kindle rows (other tools read it); this
// module is the ONE place that drops them before any page sees them. Pages import THIS, not the JSON.
import raw from './digital-listings.json' with { type: 'json' };

type Entry = { store: string; url?: string; [k: string]: unknown };
const isAmazon = (d: Entry) =>
	/kindle|amazon/i.test(d.store ?? '') || /amazon\.|amzn\./i.test(d.url ?? '');

function strip<T>(node: T): T {
	if (Array.isArray(node)) {
		return node
			.filter((d) => !(d && typeof d === 'object' && 'store' in d && isAmazon(d as Entry)))
			.map(strip) as unknown as T;
	}
	if (node && typeof node === 'object') {
		return Object.fromEntries(
			Object.entries(node as Record<string, unknown>)
				.filter(([k]) => !k.startsWith('_'))
				.map(([k, v]) => [k, strip(v)]),
		) as T;
	}
	return node;
}

const digital = strip(raw) as typeof raw;
export default digital;
