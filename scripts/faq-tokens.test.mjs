// node --test scripts/faq-tokens.test.mjs   (unit 2pv)
// Edition FAQ language counts are tokens filled at build from generated data, never typed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { faqTokenValues, fillFaqTokens } from '../src/lib/faq-tokens.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rlFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/reader-languages.json'), 'utf8'));
// reader-languages.json is GENERATED (and not committed with audioLanguages), so this test must not
// depend on it being fresh: audioLanguages is computed here with the generator's rule
// (live reader language AND lang-audio.json complete === true). A generated file, when present, must agree.
const AUDIO_SRC = '/srv/sites/community/src/data/lang-audio.json';
const audioSrc = fs.existsSync(AUDIO_SRC) ? JSON.parse(fs.readFileSync(AUDIO_SRC, 'utf8')) : null;
const computedAudio = audioSrc ? rlFile.languages.filter((l) => audioSrc[l.code]?.complete === true).map((l) => l.code) : rlFile.audioLanguages;
const rl = { ...rlFile, audioLanguages: computedAudio };
const dir = path.join(ROOT, 'src/data/editions');
const editions = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]);

test('tokens fill from the generated data', () => {
	const v = faqTokenValues(rl);
	assert.equal(v.READ_COUNT, String(rl.languages.length));
	assert.equal(v.AUDIO_COUNT, String(rl.audioLanguages.length));
	assert.equal(fillFaqTokens('{{READ_COUNT}} read, {{AUDIO_COUNT}} listen', v), `${v.READ_COUNT} read, ${v.AUDIO_COUNT} listen`);
});

test('audioLanguages are live reader languages and agree with lang-audio.json and any generated file', () => {
	assert.ok(Array.isArray(rl.audioLanguages) && rl.audioLanguages.length > 0, 'no audio languages (lang-audio.json unreadable and none in file)');
	const codes = new Set(rl.languages.map((l) => l.code));
	for (const c of rl.audioLanguages) assert.ok(codes.has(c), `${c} narrated but not a live reader language`);
	if (Array.isArray(rlFile.audioLanguages)) assert.deepEqual(rlFile.audioLanguages, rl.audioLanguages, 'generated reader-languages.json audioLanguages is stale vs lang-audio.json');
});

// failure paths: a stale or unknown token must fail, never publish
test('unknown token fails', () => {
	assert.throws(() => fillFaqTokens('in {{NOPE}} languages', faqTokenValues(rl)), /unknown token/);
});
test('missing audio data fails (stale source)', () => {
	assert.throws(() => faqTokenValues({ languages: rl.languages }), /no audioLanguages/);
	assert.throws(() => faqTokenValues({ languages: rl.languages, audioLanguages: [] }), /no audioLanguages/);
	assert.throws(() => faqTokenValues({ languages: [], audioLanguages: [] }), /no languages/);
});
test('audio count above read count fails', () => {
	assert.throws(() => faqTokenValues({ languages: [{ code: 'a' }], audioLanguages: ['a', 'b'] }), /exceeds/);
});

test('no edition FAQ types a language count or the Telugu-only audio claim', () => {
	const v = faqTokenValues(rl);
	let tokens = 0;
	for (const [f, ed] of editions) {
		for (const q of ed.faq ?? []) {
			assert.doesNotMatch(q.a, /twenty-five languages|English and Telugu|\b(2[0-9]|[3-9][0-9]) languages\b/, `${f}: typed count`);
			fillFaqTokens(q.a, v, f); // throws on any stray token
			tokens += (q.a.match(/\{\{AUDIO_COUNT\}\}/g) ?? []).length;
		}
	}
	assert.equal(tokens, 12, 'expected AUDIO_COUNT in the 12 audience-edition FAQs');
});
