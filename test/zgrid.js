// story squad grid: node test/zgrid.js <outdir> [build]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'), fs = require('fs'); const out = process.argv[2], build = process.argv[3] || 'test.html';
const seedLine = fs.readFileSync(path.join(__dirname, 'zgate.js'), 'utf8').split('\n')[9];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
  await eval('(async () => {' + seedLine + '})()');
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.soldier, null, { timeout: 90000 });
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; for (const id of ['storycard', 'pause']) { const e = document.getElementById(id); if (e) e.hidden = true; }
    d.stepN(30 * 20); const h = sim.units[sim.players[0].heroId]; const q = sim.squads[sim.players[0].soldierSq]; const ids = q.unitIds.filter(id => id !== h.id);
    const a = sim.units[ids[2]], b = sim.units[ids[5]], c = sim.units[ids[7]]; a.hp = 0.5; sim.applyDamage(a, 50, -1, 0, 0, 0, 'arrow'); sim.applyDamage(b, 1e6, -1, 0, 0, 0, 'arrow'); c.hp = c.def.hp * 0.3; d.stepN(15); });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: out + '/zgrid.png', timeout: 120000 });
  await page.screenshot({ path: out + '/zgrid_crop.png', clip: { x: 820, y: 0, width: 280, height: 330 }, timeout: 120000 });
  const r = await page.evaluate(() => ({ cells: [...document.querySelectorAll('#zgrid .zc')].map(c => c.className.replace('zc ', '') + ':' + c.children[1].textContent), army: document.getElementById('army').hidden, mobjTop: getComputedStyle(document.getElementById('mobj')).top }));
  console.log(JSON.stringify(r), 'errors', errors); await browser.close();
})();
