const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });
  page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load' }); await page.waitForTimeout(300);
  await page.evaluate(() => { AUDIO.init = () => {}; const s = window.__boshin.state; s.battle = 'field'; s.army = ['samurai', 'ashigaru', 'rifle_imp', 'rifle_spencer', 'jigen', 'armstrong', 'gatling']; });
  await page.click('#btnSolo'); await page.waitForTimeout(800);
  await page.evaluate(() => { const d = window.__boshin; d.Input.locked = true; d.Input.pitch = -0.1; });
  await page.waitForTimeout(1200);
  const shot = async (n) => { try { await page.screenshot({ path: path.resolve(__dirname, 'w_' + n + '.png'), timeout: 60000 }); } catch (e) { console.log('fail', n); } };
  await shot('dao');
  await page.keyboard.press('Digit2'); await page.waitForTimeout(1200); await shot('musket');
  await page.keyboard.press('Digit3'); await page.waitForTimeout(1200); await shot('threeeyed');
  // look at own army from the front
  await page.keyboard.press('KeyC');
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim, p = sim.players[0]; const g = sim.squads.find(q => q.owner === 0 && q.def.gun); const r = d.state.renderer; r.cmdCam.x = g.cx + 4; r.cmdCam.z = g.cz + 9; r.cmdCam.h = 6; r.cmdCam.yaw = Math.PI; });
  await page.waitForTimeout(1200); await shot('guns');
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; d.Input.pressed |= 2048; d.stepN(5); for (let i = 0; i < 2000 && sim.phase === 0; i++) d.stepN(1); sim.players[0].auto = true; let n = 0; for (let i = 0; i < 2500 && n < 3; i++) { d.stepN(1); n += sim.events.filter(e => e.t === 'shot' && e.weapon === 'gatling').length; } const g = sim.squads.find(q => q.owner === 0 && q.def.gun); const r = d.state.renderer; r.cmdCam.x = g.cx; r.cmdCam.z = g.cz + 25; r.cmdCam.h = 30; r.cmdCam.yaw = 0; });
  await page.waitForTimeout(500); await shot('rockets');
  console.log('errors', errors); await browser.close();
})();
