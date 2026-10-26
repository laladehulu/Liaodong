// the named file side by side: camp at night and the pass by day, plus a first-person shot with name tags
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], build = process.argv[3] || 'test.html', tag = build.replace('.html', '');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 520 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const url = 'file://' + path.resolve(__dirname, '..', 'dist', build);
  for (const scene of ['camp0', 'battle1']) {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate((sc) => { localStorage.setItem('mingZheGo', sc); }, scene);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => { const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer; st.screen = 'pause';
      for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'mobj', 'radio', 'zhePrompt']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
      const men = sim.units.filter(u => u.look).sort((a, b) => ['wu', 'lou', 'me', 'liu6', 'luo', 'jin', 'ye', 'wang', 'fang', 'he', 'du', 'zhu'].indexOf(a.look.id) - ['wu', 'lou', 'me', 'liu6', 'luo', 'jin', 'ye', 'wang', 'fang', 'he', 'du', 'zhu'].indexOf(b.look.id));
      const h0 = sim.units[sim.players[0].heroId]; const bx = sim.mission && sim.mission.soldier ? 0 : h0.x, bz = sim.mission && sim.mission.soldier ? -96 : h0.z + 10;
      window.__place = () => men.forEach((u, k) => { const x = bx + (k - (men.length - 1) / 2) * 1.25; u.x = u.px = x; u.z = u.pz = bz; u.y = u.py = SIM.terrainH(x, bz); u.yaw = u.pyaw = Math.PI; u.hyaw = u.phyaw = Math.PI; u.mx = u.mz = 0; u.speedNow = 0; u.st = 0; u.campPose = 'stand'; u.target = -1; u.st = 0; u.vx = u.vz = 0; }); window.__place();
      window.__row = { bx, bz, n: men.length }; return men.map(u => u.look.id).join(','); });
    for (const [nm, off, dist, fov] of [['all', 0, 9.5, 30], ['L', -3.75, 4.6, 30], ['R', 3.75, 4.6, 30]]) {
      await page.evaluate(([off, dist, fov]) => { window.__place(); for (const u of window.__boshin.state.sim.units) if (!u.look && Math.abs(u.x - window.__row.bx) < 12 && Math.abs(u.z - window.__row.bz) < 12) { u.x = u.px = u.x + 40; } const r = window.__boshin.state.renderer, R = window.__row; const gy = SIM.terrainH(R.bx, R.bz); const cam = new THREE.PerspectiveCamera(fov, 1400 / 520, 0.1, 800);
        cam.position.set(R.bx - off, gy + 1.55, R.bz - dist); cam.lookAt(R.bx - off, gy + (dist < 6 ? 1.4 : 1.1), R.bz); r.scene.add(cam);
        for (let i = 0; i < 3; i++) { r.fdt = 0.016; r.render(0.5, 0.016, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); r.scene.remove(cam); for (const e of document.querySelectorAll('.ztag,.spk')) e.style.display = 'none'; }, [off, dist, fov]);
      await page.screenshot({ path: `${out}/zlooks_${tag}_${scene}_${nm}.png`, timeout: 120000 }); }
    console.log(scene, info);
  }
  console.log('errors', errors); await browser.close();
})();
