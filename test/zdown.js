// downed-comrade indicators: node test/zdown.js <outdir>
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'), fs = require('fs'); const out = process.argv[2];
const seedLine = fs.readFileSync(path.join(__dirname, 'zgate.js'), 'utf8').split('\n')[9]; // reuse zgate's save setup
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await eval('(async () => {' + seedLine + '})()');
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.soldier, null, { timeout: 60000 });
  const r = await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; d.stepN(30 * 8); for (const id of ['storycard', 'pause']) { const e = document.getElementById(id); if (e) e.hidden = true; }
    const h = sim.units[sim.players[0].heroId]; const q = sim.squads[sim.players[0].soldierSq];
    // knock down two men of the file: one right beside you, one off to the side
    const a = sim.units[q.unitIds.find(id => id !== h.id && !sim.units[id].dead && sim.units[id].role === 'spear')], b = sim.units[q.unitIds.find(id => id !== h.id && id !== a.id && !sim.units[id].dead && sim.units[id].role === 'brush')];
    a.x = a.px = h.x + Math.sin(h.yaw) * 1.6; a.z = a.pz = h.z + Math.cos(h.yaw) * 1.6; a.y = a.py = SIM.terrainH(a.x, a.z);
    for (const v of [a, b]) { v.hp = 0.5; sim.applyDamage(v, 50, -1, 0, 0, 0, 'arrow'); if (!v.downed) { v.hp = 1; sim.zDown ? 0 : 0; } }
    d.stepN(10); return { a: [a.downed, a.dead], b: [b.downed, b.dead], hero: h.id };
  });
  await page.waitForTimeout(1500); await page.screenshot({ path: out + '/zdown_marks.png', timeout: 90000 });
  const m = await page.evaluate(() => ({ marks: [...document.querySelectorAll('#hudmarks .hm')].filter(e => e.style.display !== 'none').map(e => e.className + ':' + e.textContent), prompt: (document.getElementById('helpprompt') || {}).textContent }));
  await page.keyboard.press('KeyE'); await page.waitForTimeout(800);
  const m2 = await page.evaluate(() => ({ prompt: (document.getElementById('helpprompt') || {}).textContent, spk: [...document.querySelectorAll('.spk')].filter(e => !e.hidden).map(e => e.textContent) }));
  await page.screenshot({ path: out + '/zdown_help.png', timeout: 90000 });
  await page.evaluate(() => window.__boshin.stepN(60)); await page.waitForTimeout(900);
  const m3 = await page.evaluate(() => { const sim = window.__boshin.state.sim; return sim.units.filter(u => u.zfile).map(u => (u.downed ? 'D' : u.wounded ? 'w' : u.dead ? 'x' : 'o')).join(''); });
  console.log(JSON.stringify({ r, m, m2, m3 }), 'errors', errors); await browser.close();
})();
