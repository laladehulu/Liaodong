const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2]; const file = process.argv[3] || 'test.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', file), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('mingZhe'); });
  if (process.argv[4] === 'battle') { await page.evaluate(() => { localStorage.setItem('mingZhe', JSON.stringify({ v: 1, stage: 'battle1', name: { zh: '阿明', en: 'Aming' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, me: 'me' })); }); }
  else {
  await page.click('#btnZhe'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/zhe_intro.png', timeout: 60000 });
  for (let i = 0; i < 3; i++) { await page.click('#zheNext'); await page.waitForTimeout(150); }
  await page.waitForTimeout(2500);
  const ft = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { if (++n >= 5) r((performance.now() - t0) / 5); else requestAnimationFrame(f); }; requestAnimationFrame(f); })); console.log('frame ms', ft, errors);
  await page.screenshot({ path: out + '/zhe_camp.png', timeout: 90000 });
  // walk up to Fang and talk
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; const h = sim.units[sim.players[0].heroId]; const f = sim.units.find(u => u.camp && u.ci === 8); h.x = h.px = f.x - 1.6; h.z = h.pz = f.z - 1.4; d.Input.yaw = Math.atan2(f.x - h.x, f.z - h.z); d.Input.pitch = -0.05; });
  await page.waitForTimeout(600); await page.keyboard.press('KeyE'); await page.waitForTimeout(400); await page.keyboard.press('Digit1'); await page.waitForTimeout(700);
  await page.screenshot({ path: out + '/zhe_dialog.png', timeout: 90000 });
  const dlg = await page.evaluate(() => { const b = document.getElementById('zheDlg'); return b && !b.hidden ? b.innerText.slice(0, 160) : 'no dialog'; });
  await page.keyboard.press('Escape');
  console.log('dialog:', dlg.replace(/\n/g, ' | '));
  }
  // battle
  await page.evaluate(() => { localStorage.setItem('mingZheGo', 'battle1'); location.reload(); });
  await page.waitForFunction(() => window.__boshin && window.__boshin.state.sim && window.__boshin.state.sim.mission && window.__boshin.state.sim.mission.soldier, null, { timeout: 60000 });
  await page.evaluate(() => { window.__boshin.stepN(30 * 25); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/zhe_battle.png', timeout: 90000 });
  const info = await page.evaluate(() => { const s = window.__boshin.state.sim; return { mission: s.mission && s.mission.title, ph: s.mv.ph, spk: [...document.querySelectorAll('.spk')].filter(e => !e.hidden).map(e => e.innerText.replace(/\n/g, ' ')).slice(0, 3) }; });
  console.log(JSON.stringify(info), '\nerrors', errors);
  await browser.close();
})();
