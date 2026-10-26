// story-chapter gating + markers: node test/zgate.js <outdir>
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.setItem('mingZhe', JSON.stringify({ v: 1, stage: 'battle1', name: { zh: '阿明', en: 'Aming' }, alive: { wu: true, lou: true, me: true, liu6: true, luo: true, jin: true, ye: true, wang: true, fang: true, he: true, du: true, zhu: true }, fate: {}, bond: {}, talked: {}, flags: {}, me: 'me' })); localStorage.setItem('mingZheGo', 'battle1'); location.reload(); });
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.soldier, null, { timeout: 60000 });
  await page.evaluate(() => { const d = window.__boshin; d.stepN(30 * 25); const h = d.state.sim.units[d.state.sim.players[0].heroId]; h.x += 12; h.px = h.x; for (const id of ['storycard', 'pause']) { const e = document.getElementById(id); if (e) e.hidden = true; } });
  await page.waitForTimeout(1200);
  const r = {}; for (const k of ['KeyO', 'Backquote', 'KeyY', 'KeyK']) { await page.keyboard.press(k); await page.waitForTimeout(300); }
  r.cmdAfterKeys = await page.evaluate(() => [window.__boshin.state.sim && document.getElementById('cmdui').hidden, document.getElementById('toast').textContent]);
  r.marks = await page.evaluate(() => [...document.querySelectorAll('#hudmarks .hm')].filter(e => e.style.display !== 'none').map(e => e.className + ':' + e.textContent));
  await page.screenshot({ path: out + '/zgate_file.png', timeout: 90000 });
  // after the chief falls: F works, O still blocked
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; d.state.renderer.render0 = d.state.renderer.render; for (let k = 0; k < 20 && !(sim.players[0].squads.length); k++) d.stepN(150); });
  await page.keyboard.press('KeyO'); await page.waitForTimeout(300);
  r.after = await page.evaluate(() => ({ squads: window.__boshin.state.sim.players[0].squads.length, ph: window.__boshin.state.sim.mv.ph, cmdHidden: document.getElementById('cmdui').hidden }));
  await page.waitForTimeout(1500); await page.screenshot({ path: out + '/zgate_lead.png', timeout: 90000 });
  r.marks2 = await page.evaluate(() => [...document.querySelectorAll('#hudmarks .hm')].filter(e => e.style.display !== 'none').map(e => e.className + ':' + e.textContent));
  console.log(JSON.stringify(r), 'errors', errors); await browser.close();
})();
