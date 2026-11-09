import test from 'node:test';
import assert from 'node:assert/strict';
import { pagesDevRedirectTarget as t } from '../functions/_lib/pagesdev-redirect.js';

const H = (o = {}) => new Headers(o);
test('production alias redirects, path + query preserved', () => {
	assert.equal(t('https://fathersheartbible.pages.dev/blog/what-is-the-fathers-heart-of-god', H()), 'https://fathersheartbible.com/blog/what-is-the-fathers-heart-of-god');
	assert.equal(t('https://fathersheartbible.pages.dev/', H()), 'https://fathersheartbible.com/');
	assert.equal(t('https://fathersheartbible.pages.dev/blog/?page=2&q=a%20b', H()), 'https://fathersheartbible.com/blog/?page=2&q=a%20b');
	assert.equal(t('https://FathersHeartBible.pages.dev/x', H()), 'https://fathersheartbible.com/x');
});
test('preview, branch and hash aliases are never redirected', () => {
	for (const h of ['dev', 'seo-2mp-pagesdev-301', 'read-design', 'a1b2c3d4', 'x.y']) {
		assert.equal(t(`https://${h}.fathersheartbible.pages.dev/blog/`, H()), null, h);
	}
});
test('the real domain and look-alike hosts are untouched', () => {
	assert.equal(t('https://fathersheartbible.com/blog/', H()), null);
	assert.equal(t('https://www.fathersheartbible.com/', H()), null);
	assert.equal(t('https://fathersheartbible.pages.dev.evil.com/', H()), null);
	assert.equal(t('https://notfathersheartbible.pages.dev/', H()), null);
	assert.equal(t('https://community-cm1.pages.dev/', H()), null);
});
test('router subrequests to the production alias are served (no redirect loop)', () => {
	assert.equal(t('https://fathersheartbible.pages.dev/read-the-bible-in-a-year/', H({ 'cf-worker': 'fathersheartbible.com' })), null);
	assert.equal(t('https://fathersheartbible.pages.dev/read-the-bible-in-a-year/', H({ 'x-apex-proxy': 's' })), null);
});
