// GET /glossary-review/status — aggregate per-language review counts for the
// index badges and the Bethel beachhead dispatcher. Marketing-owned path (the
// apex router sends /api/* to the community app, so this must NOT live there).

const json = (obj, status = 200) =>
	new Response(JSON.stringify(obj), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export async function onRequestGet({ env }) {
	try {
		const list = await env.GLOSSARY_KV.list({ prefix: 'sub:' });
		const out = {};
		for (const k of list.keys) {
			const lang = k.name.split(':')[1];
			const v = await env.GLOSSARY_KV.get(k.name, 'json');
			if (!v) continue;
			out[lang] ??= { approved: 0, corrections: 0, reviewers: [] };
			out[lang][v.verdict] += 1;
			if (v.name && !out[lang].reviewers.includes(v.name)) out[lang].reviewers.push(v.name);
		}
		return json(out);
	} catch {
		return json({});
	}
}
