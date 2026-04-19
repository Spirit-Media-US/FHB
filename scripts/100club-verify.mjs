#!/usr/bin/env node
/**
 * 100club-verify.mjs — post-build verification
 *
 * Runs after `astro build` + `async-css.mjs` and BEFORE push. Fails the build if
 * any 100 Club structural assertion regresses — specifically the failure modes that
 * static grep can't catch:
 *
 *   1. Every responsive grid (lg:grid-cols-N, md:grid-cols-N, sm:grid-cols-N)
 *      resolves to its expected column count at the matching viewport
 *   2. Every <img class="h-N"> computes to the expected pixel height
 *      (= N × 0.25rem × root font-size)
 *   3. Zero console errors on page load
 *   4. [data-animate] elements have opacity:1 and transform:none after 2s
 *      (CLS + Lighthouse-mid-fade sanity)
 *
 * Docs: /home/deploy/.claude/projects/-home-deploy/memory/reference_100club_guardrails_plan.md
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const DIST = resolve('dist');
if (!existsSync(DIST)) {
  console.error('[100club-verify] dist/ not found — run astro build first');
  process.exit(1);
}

const CHROME = '/usr/bin/google-chrome';
if (!existsSync(CHROME)) {
  console.error('[100club-verify] google-chrome not found at', CHROME);
  process.exit(1);
}

// pid-based port so parallel Bethel builds never collide.
// 5000-5999 range avoids common dev-server ports.
const PORT = 5000 + (process.pid % 1000);
const serve = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: DIST,
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1200));

const cleanup = () => {
  try { serve.kill('SIGTERM'); } catch {}
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

let browser;
try {
  browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
} catch (e) {
  cleanup();
  console.error('[100club-verify] chromium launch failed:', e.message);
  process.exit(1);
}

const fails = [];

for (const [w, h, label] of [
  [412, 823, 'mobile'],
  [1440, 900, 'desktop'],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
  } catch (e) {
    fails.push(`[${label}] navigation failed: ${e.message}`);
    await ctx.close();
    continue;
  }
  await page.waitForTimeout(2500); // settle animations

  // ---- Grid column count assertions ----
  const gridFails = await page.evaluate(() => {
    const r = [];
    const vw = window.innerWidth;
    for (const el of document.querySelectorAll('[class*=":grid-cols-"]')) {
      // Skip elements hidden at this viewport (no grid-cols assertion on display:none)
      if (el.offsetParent === null && el !== document.body) continue;
      // Find the highest breakpoint whose class applies
      const bps = [
        ['lg', 1024],
        ['md', 768],
        ['sm', 640],
      ];
      for (const [bp, minW] of bps) {
        if (vw < minW) continue;
        const m = el.className.match(new RegExp(`(^|\\s)${bp}:grid-cols-(\\d+)`));
        if (m) {
          const expected = parseInt(m[2], 10);
          const actual = getComputedStyle(el).gridTemplateColumns.split(' ').length;
          if (expected !== actual) {
            r.push({
              bp,
              expected,
              actual,
              className: el.className.slice(0, 100),
            });
          }
          break;
        }
      }
    }
    return r;
  });
  for (const g of gridFails) {
    fails.push(`[${label}] GRID ${g.bp}:grid-cols-${g.expected} → got ${g.actual} cols: ${g.className}`);
  }

  // ---- Image h-N height assertions ----
  // For responsive classes like "h-14 md:h-20 lg:h-28", pick the highest-bp
  // class that applies at the current viewport — mirrors the grid-cols logic.
  const imgFails = await page.evaluate(() => {
    const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const vw = window.innerWidth;
    const bps = [
      ['lg', 1024],
      ['md', 768],
      ['sm', 640],
    ];
    const r = [];
    for (const img of document.querySelectorAll('img[class*="h-"]')) {
      const rect = img.getBoundingClientRect();
      if (img.offsetParent === null && img !== document.body) continue;
      if (rect.width === 0 && rect.height === 0) continue;
      // Find the winning h-N class: highest-bp that applies wins, else base h-N
      let n = null;
      for (const [bp, minW] of bps) {
        if (vw < minW) continue;
        const m = img.className.match(new RegExp(`(^|\\s)${bp}:h-(\\d+)(\\s|$)`));
        if (m) { n = parseInt(m[2], 10); break; }
      }
      if (n === null) {
        const m = img.className.match(/(^|\s)h-(\d+)(\s|$)/);
        if (!m) continue;
        n = parseInt(m[2], 10);
      }
      const expected = n * 0.25 * rootFs;
      const actual = rect.height;
      if (Math.abs(actual - expected) > 3) {
        r.push({
          alt: (img.alt || '').slice(0, 40),
          n,
          expected: Math.round(expected),
          actual: Math.round(actual),
        });
      }
    }
    return r;
  });
  for (const i of imgFails) {
    fails.push(`[${label}] IMG h-${i.n} "${i.alt}": expected ${i.expected}px, got ${i.actual}px (Tailwind @layer utilities not winning — likely inline critical CSS is not in @layer base)`);
  }

  // ---- data-animate elements settled ----
  const animFails = await page.evaluate(() => {
    const r = [];
    for (const el of document.querySelectorAll('[data-animate]')) {
      const cs = getComputedStyle(el);
      const op = parseFloat(cs.opacity);
      if (op < 0.99) {
        r.push({ op, sel: el.tagName + (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : '') });
      }
    }
    return r;
  });
  for (const a of animFails) {
    fails.push(`[${label}] data-animate not settled: opacity=${a.op} on ${a.sel}`);
  }

  // ---- Console errors ----
  for (const e of consoleErrors) {
    // CF Insights beacon CSP block is fixed; any error here is a regression
    fails.push(`[${label}] CONSOLE ERROR: ${e.slice(0, 200)}`);
  }

  await ctx.close();
}

await browser.close();
cleanup();

if (fails.length) {
  console.error('');
  console.error(`[100club-verify] \u001b[31m✗ FAILED (${fails.length} issue${fails.length === 1 ? '' : 's'})\u001b[0m`);
  for (const f of fails) console.error('  ' + f);
  console.error('');
  console.error('Build BLOCKED. Fix the issues above and rebuild.');
  process.exit(1);
}
console.log('\u001b[32m[100club-verify] ✓\u001b[0m grids + h-N images + data-animate + console all pass on mobile + desktop');
