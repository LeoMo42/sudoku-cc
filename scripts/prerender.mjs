/**
 * Static prerender for the SEO landing pages (PR3 of #23).
 *
 * After `vite build` produces dist/, this script:
 *   1. Boots Vite's preview server pointed at dist/
 *   2. Crawls each /{lang} and /{lang}/{slug} URL with headless Chromium
 *      (Playwright, already a dev dep for e2e)
 *   3. Captures the fully-rendered HTML AFTER React mounts and writes it
 *      to dist/{lang}[/{slug}]/index.html
 *
 * GitHub Pages serves those static files directly — crawlers (and
 * humans on slow connections) get fully-formed HTML with the right
 * <title>, <meta description>, <h1>, canonical, and hreflang on the
 * very first request, no JS execution required.
 *
 * Why a custom script instead of @prerenderer/rollup-plugin: zero new
 * deps (vite + playwright are both already here), and the surface is
 * small enough to own outright.
 *
 * Slug list is duplicated from src/utils/variantSlugs.ts because
 * Node-running .mjs can't trivially import .ts. A drift-detection
 * test in src/utils/variantSlugs.test.ts asserts the two lists match.
 */
import { preview } from 'vite';
import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

// MUST stay in sync with VARIANT_SLUGS in src/utils/variantSlugs.ts.
// Drift is caught by the unit test.
export const VARIANT_SLUGS = [
  'classic-sudoku',
  'diagonal-sudoku',
  'windoku',
  'anti-knight-sudoku',
  'odd-even-sudoku',
  'anti-king-sudoku',
  'non-consecutive-sudoku',
  'kropki',
  'killer-sudoku',
  'little-killer-sudoku',
  'greater-than-sudoku',
  'thermo-sudoku',
  'sandwich-sudoku',
];
export const LANGS = ['en', 'ru'];

export const ROUTES = [
  ...LANGS.map((l) => `/${l}`),
  ...LANGS.flatMap((l) => VARIANT_SLUGS.map((s) => `/${l}/${s}`)),
];

const BASE = process.env.PRERENDER_BASE || '/';

async function prerender() {
  // Vite preview reads `base` from vite.config.ts unless overridden.
  // We pass it explicitly so the script works regardless of how the
  // build was invoked (CLI --base flag doesn't persist into preview).
  const server = await preview({
    base: BASE,
    preview: { port: 4173, strictPort: true },
  });
  // server.httpServer is already listening when preview() resolves
  // (Vite v6+). Capture the actual port in case strictPort is off.
  const address = server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 4173;
  const origin = `http://localhost:${port}`;
  const baseUrl = `${origin}${BASE.replace(/\/$/, '')}`;
  console.log(`[prerender] preview server at ${baseUrl}`);

  const browser = await chromium.launch();
  const errors = [];
  const written = [];

  try {
    for (const route of ROUTES) {
      const url = `${baseUrl}${route}`;
      const ctx = await browser.newContext();
      // Skip the onboarding tour overlay so it doesn't end up baked
      // into the static HTML (it'd dim the page for SEO crawlers).
      await ctx.addInitScript(() => {
        localStorage.setItem('sudoku-onboarding-done', 'true');
      });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`[${route}] pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`[${route}] console.error: ${m.text()}`);
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      // Wait until the SPA has rendered the meta + game shell:
      //   - meta description present (LandingMeta or HomeMeta mounted)
      //   - 81 cells rendered (board generated, even if cells are empty)
      // This is enough to capture per-route SEO content. Killer-style
      // variants legitimately have 0 .cell-initial — don't gate on that.
      await page.waitForFunction(
        () =>
          !!document.querySelector('meta[name="description"]') &&
          document.querySelectorAll('[data-testid="cell"]').length === 81,
        { timeout: 15_000 },
      );

      const html = await page.content();
      const outRel = path.join(route.replace(/^\//, ''), 'index.html');
      const outPath = path.join(distDir, outRel);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, html, 'utf-8');
      written.push(outRel);
      console.log(`[prerender] wrote ${outRel}`);

      await page.close();
      await ctx.close();
    }
  } finally {
    await browser.close();
    await new Promise((res) => server.httpServer.close(res));
  }

  if (errors.length) {
    console.error('\n[prerender] errors during rendering:');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log(`\n[prerender] OK — ${written.length} routes prerendered.`);
}

// Allow `node scripts/prerender.mjs` to run as a CLI; tests can import
// the URL list without triggering the crawl.
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  prerender().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
