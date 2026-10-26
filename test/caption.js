const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; window.__boshin.state.army = ['samurai', 'rifle_imp']; });
  await page.click('#btnSolo'); await page.waitForTimeout(2000);
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  await page.evaluate(() => { const st = window.__boshin.state, sim = st.sim, me = sim.players[st.localIdx], h = sim.units[me.heroId]; let k = 0; for (const id of me.squads) { const q = sim.squads[id]; for (const uid of q.unitIds.slice(0, 1)) { const u = sim.units[uid]; u.x = u.px = h.x + Math.sin(h.yaw) * 6 + (k - 0.5) * 3; u.z = u.pz = h.z + Math.cos(h.yaw) * 6; k++; } } });
  await page.keyboard.press('KeyC'); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => [...document.querySelectorAll('.spk')].filter(e => !e.hidden).map(e => e.style.opacity + ':' + e.textContent.slice(0, 30)));
  await page.screenshot({ path: process.argv[2], timeout: 90000 });
  console.log(JSON.stringify(r), 'errors', errors); await browser.close();
})();
