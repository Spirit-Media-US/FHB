// GENERATOR for src/data/globalBibleMonth.ts (before 2026-10-28 the file said GENERATED but no generator existed).
// Source: /home/deploy/claude-config/jobs/state/dbl-nov-30in30.json (public_day, name, code, code_confirmed, public).
// RULE: a row becomes 'readable' (and links to /read/<code>/) only when ALL hold:
//   (a) its code is confirmed (no '?'), (b) https://fathersheartbible.com/read/<code>/ returns 200,
//   (c) its DBL go-public ran (state row public === true; dbl_release_day.py writes that).
// A row that is ALREADY 'readable' in the committed file is never regressed (Hausa: readable now, DBL-public Nov 1).
// Usage: node scripts/gen-global-bible-month.mjs [--state <json>] [--out <file>] [--check]
//   default out = src/data/globalBibleMonth.ts. Prints 'GBM row ready to ship: <name> (<code>)' per newly flipped row.
//   --check writes nothing, exit 1 if the committed file differs from what would be generated.
// Called after each successful go-public by projects/fhb-dbl-export/dbl_release_day.py (existing daily cron).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'src', 'data', 'globalBibleMonth.ts');
const STATE = '/home/deploy/claude-config/jobs/state/dbl-nov-30in30.json';

export function cleanCode(row) {
	const c = row.code;
	if (!row.code_confirmed || typeof c !== 'string' || !/^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(c)) return null;
	return c;
}

// Pure: rows from the state file + committed statuses + a read200(code) predicate -> generated rows.
export async function buildRows(stateRows, committed, read200) {
	const out = [];
	const flipped = [];
	for (const r of stateRows) {
		const code = cleanCode(r);
		let status = 'scheduled';
		if (code) {
			if (committed[r.public_day] === 'readable') status = 'readable';
			else if (r.public === true && (await read200(code))) {
				status = 'readable';
				flipped.push({ name: r.name, code });
			}
		}
		out.push({ date: r.public_day, name: r.name, code, status });
	}
	return { rows: out, flipped };
}

export function render(header, rows) {
	const body = rows
		.map((r) => `\t{\n\t\tdate: '${r.date}',\n\t\tname: '${r.name.replace(/'/g, "\\'")}',\n\t\tcode: ${r.code === null ? 'null' : `'${r.code}'`},\n\t\tstatus: '${r.status}',\n\t},\n`)
		.join('');
	return `${header}export const GLOBAL_BIBLE_MONTH: GbmRow[] = [\n${body}] as GbmRow[];\n`;
}

export function parseCommitted(text) {
	const m = {};
	for (const b of text.matchAll(/date: '([\d-]+)',[\s\S]*?status: '(\w+)'/g)) m[b[1]] = b[2];
	return m;
}

async function http200(code) {
	try {
		const r = await fetch(`https://fathersheartbible.com/read/${code}/`, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
		return r.status === 200;
	} catch {
		return false;
	}
}

async function main() {
	const a = process.argv.slice(2);
	const arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
	const state = JSON.parse(fs.readFileSync(arg('--state', STATE), 'utf8'));
	const out = arg('--out', DATA);
	const text = fs.readFileSync(DATA, 'utf8');
	const header = text.slice(0, text.indexOf('export const GLOBAL_BIBLE_MONTH'));
	const { rows, flipped } = await buildRows(state.languages, parseCommitted(text), http200);
	const next = render(header, rows);
	if (a.includes('--check')) process.exit(next === text ? 0 : 1);
	fs.mkdirSync(path.dirname(out), { recursive: true });
	fs.writeFileSync(out, next);
	for (const f of flipped) console.log(`GBM row ready to ship: ${f.name} (${f.code})`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
