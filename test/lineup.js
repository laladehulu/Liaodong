const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__boshin.state.army = ['samurai', 'ashigaru', 'rifle_imp', 'rifle_spencer', 'jinshotai', 'jigen', 'horokutai']; });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; }); await page.click('#btnSolo'); await page.waitForTimeout(600);
  await page.keyboard.press('KeyC'); await page.mouse.move(640, 320);
  for (const side of [0, 1]) {
    await page.evaluate((side) => {
      const d = window.__boshin; const sim = d.state.sim; const r = d.state.renderer;
      const types = side === 0 ? ['hero', 'samurai', 'ashigaru', 'rifle_imp', 'rifle_spencer', 'jinshotai', 'jigen'] : ['samurai', 'ashigaru', 'rifle_sho', 'archer', 'shinsengumi', 'byakkotai', 'cavalry'];
      const x0 = 0, z0 = -60; let k = 0;
      for (const u of sim.units) { if (u.dead || u.type === 'horse') continue; u.x = u.px = 300; u.z = u.pz = 300; }
      for (const t of types) { const u = sim.units.find(v => v.type === t && v.team === (t === 'hero' ? 0 : side) && !v._used) || sim.units.find(v => v.type === t && !v._used); if (!u) continue; u._used = true; u.x = u.px = x0 + (k - 3) * 1.6; u.z = u.pz = z0; u.y = u.py = SIM.terrainH(u.x, u.z); u.yaw = u.pyaw = Math.PI; u.hyaw = u.phyaw = Math.PI; u.mx = u.mz = 0; u.speedNow = 0; k++; }
      for (const u of sim.units) u._used = false;
      r.cmdCam.x = 0; r.cmdCam.z = z0 - 0.5; r.cmdCam.h = 2.6; r.cmdCam.yaw = 0;
    }, side);
    await page.waitForTimeout(900);
    await page.evaluate(() => { const d = window.__boshin; d.state.screen = 'pause'; const r = d.state.renderer; const cam = new THREE.PerspectiveCamera(42, 1280 / 640, 0.1, 800); const gy = SIM.terrainH(0, -60); cam.position.set(0, gy + 1.25, -65.2); cam.lookAt(0, gy + 0.95, -60); document.getElementById('hud').hidden = true; document.getElementById('cmdui').hidden = true; document.getElementById('toast').style.display = 'none'; r.scene.add(cam); for (let i = 0; i < 3; i++) { r.fdt = 0.016; r.render(0.5, 0.016, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, 'lineup' + side + '.png'), timeout: 90000 });
    await page.evaluate(() => { window.__boshin.state.screen = 'game'; });
  }
  console.log('errors', errors);
  await browser.close();
})();
