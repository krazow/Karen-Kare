// Smoke test: opens Karen Kare in a real browser and runs the main aide + RN flows.
// Run with: npm test   (the release kit's QA runs this on every pull request and release)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const cfg = JSON.parse(fs.readFileSync('release.json', 'utf8'));
const SITE = path.resolve(cfg.site || '.');
const APP = path.relative(SITE, path.resolve(cfg.app || cfg.site || '.')).split(path.sep).join('/');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  let f = path.join(SITE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/${APP && APP !== '.' ? APP + '/' : ''}`;

const browser = await chromium.launch();
// Standing at the mock client Dorothy Jenkins' address so GPS clock-in passes the geofence.
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'],
  geolocation: { latitude: 28.8109, longitude: -81.8791 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const dialogs = [];
page.on('dialog', d => { dialogs.push(d.message()); d.accept(); }); // the PHI warning before export
let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
}
async function signIn(name, pin) {
  await page.waitForSelector('#lf');
  await page.locator('.big-choice', { hasText: name }).click();
  await page.fill('input[name=pin]', pin);
  await page.click('#signin');
}
const signOut = async () => { await page.click('#lockBtn'); await page.waitForSelector('#lf'); };

await page.goto(URL_, { waitUntil: 'load' });

const CHECKS = [
  ['the app opens without errors', async () => { await page.waitForSelector('#lf'); if (errors.length) throw new Error(errors.join('; ')); }],
  ['the page has a title', async () => { if (!(await page.title())) throw new Error('empty <title>'); }],
  ['the service worker installs (offline use)', async () => {
    const ok = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 8000))]));
    if (!ok) throw new Error('no active service worker after 8 s');
  }],
  ['it still opens offline', async () => {
    await page.context().setOffline(true);
    try { await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#lf'); } finally { await page.context().setOffline(false); }
  }],
  ['a wrong PIN is refused', async () => {
    await signIn('Maria Lopez', '0000');
    await page.waitForSelector('#toast:not([hidden])');
    if (await page.locator('.visit-card').count()) throw new Error('signed in with a wrong PIN');
  }],
  ['patient data and PINs are not readable on the device', async () => {
    const raw = await page.evaluate(() => new Promise(r => {
      const q = indexedDB.open('karen-kare');
      q.onsuccess = () => { const t = q.result.transaction(['clients', 'users', 'visits', 'meta']); const out = []; let n = 0;
        for (const s of ['clients', 'users', 'visits', 'meta']) t.objectStore(s).getAll().onsuccess = e => { out.push(JSON.stringify(e.target.result)); if (++n === 4) r(out.join('\n')); }; };
    }));
    for (const s of ['Dorothy', '9100000001', 'Leesburg', '"1111"']) if (raw.includes(s)) throw new Error(`found ${s} in plain text`);
  }],
  ['an aide completes a visit with GPS EVV (6/6 elements)', async () => {
    await signIn('Maria Lopez', '1111');
    await page.click('a[href="#/visit/v1"]');
    await page.click('#cin'); await page.waitForSelector('#tasks');
    const n = await page.locator('.task').count();
    for (let i = 0; i < n; i++) { await page.locator('.task').nth(i).locator('[data-a=done]').click(); await page.waitForTimeout(100); }
    await page.click('#cond'); await page.fill('#dialog textarea', 'Red area on left heel'); await page.click('#dialog button[value=ok]');
    // reporting suspected abuse must point the aide to the Florida Abuse Hotline (F.S. 415.1034)
    await page.click('#cond'); await page.locator('#dialog input[name=k]').last().check(); await page.click('#dialog button[value=ok]');
    await page.waitForSelector('#dialog a[href="tel:18009622873"]'); await page.click('#dialog button[value=ok]');
    await page.fill('#note', 'Smoke test visit');
    await page.check('#noSign'); await page.check('#attest'); await page.click('#cout');
    await page.click('#dialog button[value=ok]'); // reason client could not sign
    await page.waitForSelector('.pill.ok', { timeout: 10000 });
    await signOut();
  }],
  ['the aide app switches to Kreyòl', async () => {
    await signIn('Jean-Pierre Baptiste', '2222');
    await page.waitForSelector('.hello');
    if ((await page.textContent('.top h1')) !== 'Jounen mwen') throw new Error('not in Kreyòl');
    await signOut();
  }],
  ['the RN sees the condition alert and exports HHAeXchange V5 (96 columns)', async () => {
    await signIn('Karen Whitfield, RN', '9999');
    await page.waitForSelector('[data-ack]');
    await page.goto(URL_ + '#/rn/settings'); await page.waitForSelector('#st');
    await page.fill('input[name=taxId]', '123456789');
    for (const el of await page.$$('[data-plan]')) await el.fill('1');
    await page.click('#st button.primary'); await page.waitForTimeout(300);
    await page.goto(URL_ + '#/rn/evv'); await page.waitForSelector('text=No blocking issues found.');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#ex button[value=dl]')]);
    const lines = fs.readFileSync(await dl.path(), 'utf8').trim().split(/\r\n/);
    if (lines.length < 2) throw new Error('no visit rows');
    let cols = 1, q = false;
    for (const ch of lines[1]) { if (ch === '"') q = !q; else if (ch === ',' && !q) cols++; }
    if (cols !== 96) throw new Error(`expected 96 columns, got ${cols}`);
    if (!dialogs.some(m => m.includes('protected health information'))) throw new Error('no PHI warning before export');
  }],
  ['the audit trail is hash-chained and intact', async () => {
    await page.goto(URL_ + '#/rn/audit'); await page.waitForSelector('text=hash chain verified');
    await signOut();
  }],
  ['5 wrong PINs lock the account', async () => {
    for (let i = 0; i < 5; i++) { await signIn('Jean-Pierre Baptiste', '0000'); await page.waitForTimeout(200); }
    await signIn('Jean-Pierre Baptiste', '2222');
    await page.waitForSelector('#toast:not([hidden])');
    if (await page.locator('.hello').count()) throw new Error('signed in while locked out');
  }],
  ['no errors along the way', async () => { if (errors.length) throw new Error(errors.join('; ')); }],
];
for (const [name, fn] of CHECKS) await check(name, fn);

await browser.close();
server.close();
if (failed) { console.log(`${failed} check(s) failed`); process.exit(1); }
console.log('All smoke checks passed');
