// Unit 2ra: OpenAI-format product feed (dist/merchant-feed-openai.jsonl) must match the Google feed
// (dist/merchant-feed.xml) item-for-item. Spec: https://developers.openai.com/commerce/specs/feed
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const REQUIRED = ['item_id', 'title', 'description', 'url', 'brand', 'seller_name', 'image_url', 'availability', 'price'];
const AVAIL = ['in_stock', 'out_of_stock', 'pre_order', 'backorder', 'unknown'];
const un = (s) => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const tag = (b, t) => { const m = new RegExp(`<${t}>(.*?)</${t}>`, 's').exec(b); return m ? un(m[1]) : ''; };

export function parseGoogle(xml) {
	return [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((m) => ({
		id: tag(m[1], 'g:id'), link: tag(m[1], 'link'), image: tag(m[1], 'g:image_link'),
		price: tag(m[1], 'g:price'), availability: tag(m[1], 'g:availability'), gtin: tag(m[1], 'g:gtin'), title: tag(m[1], 'title'),
	}));
}
/** Returns a list of error strings; empty = valid and in parity. */
export function validate(jsonl, google) {
	const errs = [];
	const lines = jsonl.split('\n').filter((l) => l.trim());
	const recs = [];
	for (const [n, l] of lines.entries()) { try { recs.push(JSON.parse(l)); } catch { errs.push(`line ${n + 1}: not JSON`); } }
	if (recs.length !== google.length) errs.push(`count ${recs.length} != google ${google.length}`);
	const ids = new Set();
	for (const r of recs) {
		for (const f of REQUIRED) if (typeof r[f] !== 'string' || !r[f].trim()) errs.push(`${r.item_id}: missing ${f}`);
		if (ids.has(r.item_id)) errs.push(`${r.item_id}: duplicate item_id`); ids.add(r.item_id);
		if (!AVAIL.includes(r.availability)) errs.push(`${r.item_id}: bad availability ${r.availability}`);
		if (!/^\d+\.\d\d [A-Z]{3}$/.test(r.price ?? '') || parseFloat(r.price) <= 0) errs.push(`${r.item_id}: bad price ${r.price}`);
		for (const f of ['url', 'image_url']) if (!/^https?:\/\//.test(r[f] ?? '')) errs.push(`${r.item_id}: ${f} not absolute`);
		if (r.gtin !== undefined && !/^(\d{8}|\d{12,14})$/.test(r.gtin)) errs.push(`${r.item_id}: bad gtin`);
		if (r.group_id !== undefined && r.group_id === r.item_id) errs.push(`${r.item_id}: group_id equals item_id`);
		if ((r.title ?? '').length > 150) errs.push(`${r.item_id}: title > 150`);
		const g = google.find((x) => x.id === r.item_id);
		if (!g) { errs.push(`${r.item_id}: not in google feed`); continue; }
		if (g.price !== r.price) errs.push(`${r.item_id}: price ${r.price} != google ${g.price}`);
		if (g.availability !== r.availability) errs.push(`${r.item_id}: availability ${r.availability} != google ${g.availability}`);
		if (g.link !== r.url) errs.push(`${r.item_id}: url != google`);
		if (g.image !== r.image_url) errs.push(`${r.item_id}: image != google`);
		if (g.gtin !== r.gtin) errs.push(`${r.item_id}: gtin != google`);
	}
	return errs;
}

const jsonl = () => fs.readFileSync('dist/merchant-feed-openai.jsonl', 'utf8');
const google = () => parseGoogle(fs.readFileSync('dist/merchant-feed.xml', 'utf8'));

test('dist: OpenAI feed is valid and in parity with the Google feed', () => {
	const g = google();
	assert.ok(g.length > 0);
	assert.deepEqual(validate(jsonl(), g), []);
});
test('validator rejects injected defects (failure path)', () => {
	const g = google();
	const recs = jsonl().trim().split('\n').map((l) => JSON.parse(l));
	const ser = (a) => a.map((r) => JSON.stringify(r)).join('\n');
	const mut = (fn) => { const c = structuredClone(recs); fn(c); return validate(ser(c), g); };
	assert.ok(mut((c) => { delete c[0].seller_name; }).some((e) => e.includes('missing seller_name')));
	assert.ok(mut((c) => { c[0].price = '1.23 USD'; }).some((e) => e.includes('!= google')));
	assert.ok(mut((c) => { c.pop(); }).some((e) => e.includes('count')));
	assert.ok(mut((c) => { c[0].availability = 'out_of_stock'; }).some((e) => e.includes('availability')));
	assert.ok(mut((c) => { c[0].url = 'https://x.example/'; }).some((e) => e.includes('url')));
});
