const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.setItem('mingZhe', JSON.stringify({ v: 1, stage: 'battle1', name: { zh: '阿明', en: 'Aming' }, alive: { wu: true, lou: true, me: true, liu6: true, luo: true, jin: true, ye: true, wang: true, fang: true, he: true, du: true, zhu: true }, fate: {}, bond: {}, talked: {}, flags: { letter: true }, me: 'me' })); localStorage.setItem('mingZheGo', 'battle1'); location.reload(); });
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.soldier, null, { timeout: 60000 });
  const t0 = Date.now();
  await page.evaluate(() => { const d = window.__boshin; d.state.renderer.render = () => {}; for (let k = 0; k < 40 && d.state.sim.mv.ph < 3; k++) d.stepN(150); });
  console.log('to phase IV in', Date.now() - t0, 'ms');
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; const p = sim.players[0]; const h = sim.units[p.heroId]; const w = sim.units.find(u => u.wounded); if (w) { w.helpedBy = h.id; }
    const q = sim.squads[p.soldierSq]; for (const id of q.unitIds) { const u = sim.units[id]; if (!u.dead) { u.x = u.px = (id % 5) - 2; u.z = u.pz = -128 - (id % 3); } } h.x = h.px = 0; h.z = h.pz = -132; for (let k = 0; k < 20 && sim.winner < 0; k++) d.stepN(15); });
  await page.waitForTimeout(5000);
  const res = await page.evaluate(() => [document.getElementById('resultTitle').textContent, document.getElementById('resultText').innerText, document.getElementById('btnNext').textContent]);
  console.log(JSON.stringify(res));
  await page.click('#btnNext'); await page.waitForTimeout(400); await page.click('#zheNext'); await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/zhe_file.png', timeout: 60000 });
  await page.click('#zheNext');
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.camp, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const z = await page.evaluate(() => JSON.parse(localStorage.getItem('mingZhe')));
  await page.screenshot({ path: out + '/zhe_after.png', timeout: 90000 });
  console.log('stage', z.stage, 'fate', JSON.stringify(z.fate), 'saved6', z.flags.saved6, 'errors', errors);
  await browser.close();
})();
