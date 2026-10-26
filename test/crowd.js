const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], build = process.argv[3] || 'test-real.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.army = ['cavalry', 'rifle_imp', 'yuanyang', 'horokutai', 'ronin', 'samurai']; st.mode = 'standard'; st.battle = 'field'; });
  await page.click('#btnSolo'); await page.waitForTimeout(1500);
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim, r = d.state.renderer; d.state.screen = 'pause'; for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    // bring both armies face to face, 30 m apart, so the crowd reads as it would in a battle
    const m = sim.units.filter(u => !u.dead && u.type !== 'horse' && u.team === 0).slice(0, 70), j = sim.units.filter(u => !u.dead && u.type !== 'horse' && u.team === 1).slice(0, 70);
    const place = (arr, z0, yaw) => arr.forEach((u, k) => { const x = ((k % 14) - 6.5) * 1.6, z = z0 + Math.floor(k / 14) * (yaw ? 1.8 : -1.8); u.x = u.px = x; u.z = u.pz = z; u.y = u.py = SIM.terrainH(x, z); u.yaw = u.pyaw = yaw; u.hyaw = u.phyaw = yaw; u.mx = u.mz = 0; u.speedNow = 0; if (u.mount >= 0) { const h = sim.units[u.mount]; h.x = h.px = x; h.z = h.pz = z; h.y = h.py = u.y; h.yaw = h.pyaw = yaw; } });
    place(m, -55, 0); place(j, -25, Math.PI);
    const gy = SIM.terrainH(0, -40); const cam = new THREE.PerspectiveCamera(60, 1100 / 600, 0.1, 800); cam.position.set(-24, gy + 9, -70); cam.lookAt(0, gy + 1, -40); r.scene.add(cam);
    for (let i = 0; i < 3; i++) { r.fdt = 0.016; r.render(0.5, 0.016, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); });
  await page.screenshot({ path: out, timeout: 120000 });
  console.log('errors', errors); await browser.close();
})();
