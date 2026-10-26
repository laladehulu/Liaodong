// the three speech layouts (F9) in the same busy moment of the Abudali chapter: node test/comms.js <outdir> [build]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'), fs = require('fs'); const out = process.argv[2], build = process.argv[3] || 'test.html';
const seedLine = fs.readFileSync(path.join(__dirname, 'zgate.js'), 'utf8').split('\n')[9];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('ming_comms', 'stack'); } catch (e) { } });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
  await eval('(async () => {' + seedLine + '})()');
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.soldier, null, { timeout: 60000 });
  const res = {};
  for (const lay of ['stack', 'card', 'film']) {
    await page.evaluate((first) => { const d = window.__boshin, sim = d.state.sim; for (const id of ['storycard', 'pause']) { const e = document.getElementById(id); if (e) e.hidden = true; }
      if (first) d.stepN(30 * 60); // into Daišan's charge: orders, story lines and alerts all at once
      const h = sim.units[sim.players[0].heroId]; const q = sim.squads[sim.players[0].soldierSq];
      const v = sim.units[q.unitIds.find(id => id !== h.id && !sim.units[id].dead && !sim.units[id].downed)]; if (v) { v.hp = 0.5; sim.applyDamage(v, 50, -1, 0, 0, 0, 'arrow'); }
      d.stepN(20); }, lay === 'stack');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/comms_${lay}.png`, timeout: 90000 });
    res[lay] = await page.evaluate(() => ({ stack: document.querySelectorAll('#comms .ce').length, ticker: document.querySelectorAll('#ticker .tk').length, card: !!(document.getElementById('dlgcard') || {}).classList?.contains('on'), sub: !!(document.getElementById('filmsub') || {}).classList?.contains('on'), edge: document.querySelectorAll('.spk.edge').length }));
    await page.keyboard.press('F9'); await page.waitForTimeout(300);
  }
  console.log(JSON.stringify(res), 'errors', errors); await browser.close();
})();
