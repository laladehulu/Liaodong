const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; }); await page.click('#btnSolo'); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => { const d = window.__boshin, r = d.state.renderer, sim = d.state.sim; const h = sim.units[sim.players[d.state.localIdx].heroId]; r.impact(h.x + 3, h.z + 0.5, 1.2, true); return { mode: r.lastMode, imp: JSON.stringify(r.imp) }; });
  await page.waitForTimeout(90); await page.screenshot({ path: out + '/impact_a.png' });
  const after = await page.evaluate(() => JSON.stringify(window.__boshin.state.renderer.imp));
  await page.waitForTimeout(1200); const late = await page.evaluate(() => JSON.stringify(window.__boshin.state.renderer.imp));
  console.log(info, '\nafter', after, '\nlate', late, '\nerrors', errors);
  await browser.close();
})();
