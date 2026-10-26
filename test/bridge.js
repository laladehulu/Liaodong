const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.army = ['rifle_imp', 'samurai']; st.battle = 'toba'; st.mode = 'standard'; });
  await page.click('#btnSolo'); await page.waitForTimeout(1200);
  for (const [name, setup] of [['bridge', 0], ['musket', 1]]) {
    await page.evaluate((setup) => { const d = window.__boshin, sim = d.state.sim, r = d.state.renderer; d.state.screen = 'pause'; for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
      const rv = sim.layout.river, br = rv.bridges.find(b => !b.ford); const bx = br.at, bz = rv.c0 + rv.amp * Math.sin(br.at * rv.freq + rv.ph);
      const us = sim.units.filter(u => u.team === 0 && u.type !== 'horse' && u.type !== 'hero').slice(0, 14);
      if (setup === 0) us.forEach((u, k) => { u.x = u.px = bx + ((k % 4) - 1.5) * 1.8; u.z = u.pz = bz + (Math.floor(k / 4) - 1.5) * 2.5; u.y = u.py = SIM.terrainH(u.x, u.z); u.mx = u.mz = 0; });
      const gy = SIM.terrainH(bx, bz); const cam = new THREE.PerspectiveCamera(45, 900 / 560, 0.1, 800);
      if (setup === 0) { cam.position.set(bx + 9, gy + 7, bz - 12); cam.lookAt(bx, gy, bz); }
      else { const u = sim.units.find(v => v.type === 'rifle_imp'); u.x = u.px = 0; u.z = u.pz = -60; u.y = u.py = SIM.terrainH(0, -60); u.yaw = u.pyaw = Math.PI; u.mx = u.mz = 0; const g2 = u.y; cam.position.set(0.6, g2 + 1.5, -62.6); cam.lookAt(0, g2 + 1.1, -60); }
      r.scene.add(cam); for (let i = 0; i < 3; i++) { r.fdt = 0.016; r.render(0.5, 0.016, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); r.scene.remove(cam); }, setup);
    await page.screenshot({ path: out + '/' + name + '.png', timeout: 90000 });
  }
  console.log('errors', errors); await browser.close();
})();
