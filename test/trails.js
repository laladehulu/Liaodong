const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], build = process.argv[3] || 'test.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; });
  await page.click('#btnSolo'); await page.waitForTimeout(1200);
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim, r = d.state.renderer; d.state.screen = 'pause'; for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    const gy = SIM.terrainH(0, 0); for (let k = 0; k < 10; k++) { sim.projectiles.push({ kind: 'arrow', x: -6 + k * 1.2, y: gy + 4 + Math.sin(k) * 1.5, z: 10 + k, vx: 2, vy: -3, vz: -38, team: 1, owner: 0, life: 0, hits: 0 }); }
    for (let k = 0; k < 8; k++) r.tracer([8 + k, gy + 1.5, 40], [4 + k * 0.6, gy + 1.3, -20], 1);
    const cam = new THREE.PerspectiveCamera(55, 900 / 520, 0.1, 800); cam.position.set(18, gy + 3, -8); cam.lookAt(0, gy + 2, 12); r.scene.add(cam);
    for (let i = 0; i < 3; i++) { r.fdt = 0.05; r.render(0.5, 0.05, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); });
  await page.screenshot({ path: out + '/trails_' + build.replace('.html', '') + '.png', timeout: 90000 });
  console.log('errors', errors); await browser.close();
})();
