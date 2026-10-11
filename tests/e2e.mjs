// End-to-end check of the real extension in headless Chrome for Testing.
// Branded Chrome ignores --load-extension, so CFT must point at a Chrome for
// Testing binary (Taskfile `test` finds one in the puppeteer cache).
//
// Needs a page that renders TanStack Devtools: E2E_URL (default: the designkit
// dev site). Writes screenshots to E2E_OUT. Exits non-zero on any failed check.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const EXT = fileURLToPath(new URL('..', import.meta.url));
const URL_ = process.env.E2E_URL || 'https://designkit.localhost/kits/overlay';
const OUT = process.env.E2E_OUT || fileURLToPath(new URL('../.e2e', import.meta.url));
const HOST = new URL(URL_).host;
// Time for a storage change to reach the page and the toolbar icon.
const SETTLE_MS = 800;
mkdirSync(OUT, { recursive: true });

let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
};

const ctx = await chromium.launchPersistentContext('', {
  executablePath: process.env.CFT,
  headless: true,
  ignoreHTTPSErrors: true,
  viewport: { width: 1000, height: 600 },
  args: ['--headless=new', `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
try {
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
  const extId = sw.url().split('/')[2];

  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  const trigger = page.locator('button[aria-label="Open TanStack Devtools"]');
  await trigger.waitFor({ state: 'attached', timeout: 20000 });
  await page.bringToFront();
  // No `tabs` permission, so find the tab by being the active one.
  const tab = await sw.evaluate(async () => (await chrome.tabs.query({ active: true }))[0]);

  const settle = () => page.waitForTimeout(SETTLE_MS);
  const visible = async () => (await settle(), trigger.isVisible());
  const title = () => sw.evaluate((id) => chrome.action.getTitle({ tabId: id }), tab.id);
  const badge = () => sw.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tab.id);
  const setSettings = (s) => sw.evaluate((s) => chrome.storage.sync.set({ settings: s }), s);
  const T = { hidden: `TanStack Devtools trigger hidden (${HOST})`, shown: `TanStack Devtools trigger visible (${HOST})`, paused: `Paused: TanStack Devtools trigger visible (${HOST})` };

  check('default: trigger hidden', await visible(), false);
  check('default: icon status = hidden', await title(), T.hidden);
  // Upgrade from v1.1 leaves its "SHOW"/"HID" text badge on open tabs; the next
  // status update must wipe it so only the dot shows.
  await sw.evaluate((id) => chrome.action.setBadgeText({ tabId: id, text: 'SHOW' }), tab.id);
  await setSettings({ enabled: true, globalHide: true, sites: {} });
  await settle();
  check('leftover text badge is cleared (dot only)', await badge(), '');

  await setSettings({ enabled: true, globalHide: true, sites: { [HOST]: 'show' } });
  check('site=show: trigger visible', await visible(), true);
  check('site=show: icon status = visible', await title(), T.shown);

  await setSettings({ enabled: true, globalHide: false, sites: {} });
  check('global off: trigger visible', await visible(), true);

  await setSettings({ enabled: true, globalHide: false, sites: { [HOST]: 'hide' } });
  check('global off + site=hide: trigger hidden', await visible(), false);

  await setSettings({ enabled: false, globalHide: true, sites: { [HOST]: 'hide' } });
  check('paused: trigger visible', await visible(), true);
  check('paused: icon status = paused', await title(), T.paused);

  await setSettings({ enabled: true, globalHide: true, sites: { 'other.test': 'show' } });
  check('rule for another site does not leak', await visible(), false);

  // Real popup, pointed at the page's tab (a headless popup has no active tab).
  const pop = await ctx.newPage();
  await pop.setViewportSize({ width: 300, height: 520 });
  await pop.addInitScript((t) => { chrome.tabs.query = async () => [t]; }, { ...tab, url: URL_ });
  await pop.goto(`chrome-extension://${extId}/popup.html`);
  const status = pop.locator('#status');
  await pop.waitForFunction(() => document.getElementById('status').textContent.length > 0);
  check('popup status', await status.textContent(), 'Trigger hidden on this page (global setting)');
  await pop.screenshot({ path: `${OUT}/popup.png` });

  await pop.getByRole('radio', { name: 'Always show' }).click();
  check('popup "Always show" shows trigger', await visible(), true);
  await pop.waitForTimeout(300);
  check('popup status after Always show', await status.textContent(), 'Trigger visible on this page (site rule)');

  await pop.locator('li button[title="Remove rule for other.test"]').click();
  await pop.getByRole('radio', { name: /Global/ }).click();
  check('popup Global hides trigger again', await visible(), false);
  check('popup rule list empty', await pop.locator('#rules').textContent(), 'No site rules — every site follows the global setting');

  for (const sel of ['.statusRow .help', '#siteSection .help', 'footer .help']) {
    await pop.mouse.move(150, 510);
    await pop.locator(sel).hover();
    await pop.waitForTimeout(150);
    const box = await pop.locator(`${sel} > .tip`).boundingBox();
    check(`help popover opens: ${sel}`, !!box, true);
    // A real popup is only as tall as its content; a popover past it is cut off.
    const bodyH = await pop.evaluate(() => document.body.getBoundingClientRect().height);
    check(`help popover fits in popup: ${sel}`, !!box && box.y >= 0 && box.y + box.height <= bodyH, true);
  }
  await pop.screenshot({ path: `${OUT}/popup-help.png` });

  // Toolbar icons as the background really draws them: plain + 3 status dots.
  const strip = await sw.evaluate(async () => {
    const colors = [null, DOT.HIDDEN.color, DOT.SHOWN.color, DOT.PAUSED.color];
    const c = new OffscreenCanvas(32 * 4 + 30, 32);
    const g = c.getContext('2d');
    for (let i = 0; i < colors.length; i++) {
      if (colors[i]) g.putImageData((await iconWithDot(colors[i]))[32], i * 42, 0);
      else g.drawImage((await loadBaseIcons())[1][1], i * 42, 0);
    }
    const blob = await c.convertToBlob();
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  writeFileSync(`${OUT}/toolbar-icons.png`, Buffer.from(strip));
} finally {
  await ctx.close();
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
