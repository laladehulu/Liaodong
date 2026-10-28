// New Realism, close up: a few men of each side set at each other by the camera, the AI fighting; frames over time, then a death.
// node test/newreal_duel.js out_prefix [port]   (serve the repo root on the port: python3 -m http.server 8766)
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core'); const fs = require('fs');
const pre = process.argv[2] || 'test/out/nrduel', port = process.argv[3] || 8766;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 540 } }); const errors = []; page.on('pageerror', e => errors.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await page.goto(`http://localhost:${port}/dist/test-newreal.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.NEWMODEL && window.NEWMODEL.ok, null, { timeout: 60000 }).catch(() => errors.push('new model never loaded'));
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.mode = 'standard'; st.battle = 'field'; document.getElementById('btnSolo').click(); });
  await page.waitForTimeout(2500);
  const setup = await page.evaluate(() => { const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer, S = SIM; st.screen = 'pause';
    for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'status', 'zgrid', 'comms', 'help']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
    const me = sim.players[0], h = sim.units[me.heroId]; if (h) { h.x = h.px = 200; h.z = h.pz = 200; }
    const foot = (t) => sim.units.filter(u => u.team === t && !u.dead && u.type !== 'horse' && !u.mounted && u.mount < 0 && u.def && u.def.ai !== 'cannon' && u !== h);
    const A = foot(0).slice(0, 5), B = foot(1).slice(0, 5), X = 0, Z = -20, gy = (x, z) => S.terrainH(x, z);
    for (const u of sim.units) if (!A.includes(u) && !B.includes(u) && u !== h) { u.x = u.px = 260 + (u.id % 20); u.z = u.pz = 260; }
    A.forEach((u, i) => { u.x = u.px = X + (i - 2) * 1.6; u.z = u.pz = Z - 2.2; u.y = u.py = gy(u.x, u.z); u.yaw = u.pyaw = 0; }); B.forEach((u, i) => { u.x = u.px = X + (i - 2) * 1.6; u.z = u.pz = Z + 2.2; u.y = u.py = gy(u.x, u.z); u.yaw = u.pyaw = Math.PI; });
    for (const q of sim.squads) { q.order = S.ORD_CHARGE; q.tx = X; q.tz = Z; }
    window.__cam = { X, Z, gy: gy(X, Z) }; return { A: A.map(u => u.weapon), B: B.map(u => u.weapon) }; });
  const frames = [];
  for (let k = 0; k < 6; k++) { const r = await page.evaluate((k) => { const st = window.__boshin.state, sim = st.sim, r = st.renderer, C = window.__cam;
      const cam = r._tcam || (r._tcam = new THREE.PerspectiveCamera(40, 900 / 540, 0.1, 800)); cam.position.set(C.X + 6.5, C.gy + 2.4, C.Z + 3.5); cam.lookAt(C.X, C.gy + 0.9, C.Z);
      for (let t = 0; t < 14; t++) { sim.step([[0, 0, 0, 0, 0, 0, [], 0]]); r.processEvents(sim.events); r.camera.position.copy(cam.position); r.camera.quaternion.copy(cam.quaternion); r.fdt = 1 / 30; r.render(1, 1 / 30, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); }
      r.present(cam); const N = window.NEWMODEL; return [r.renderer.domElement.toDataURL('image/png'), N.men.size, N.ragMen.size, sim.units.filter(u => u.dead).length]; }, k);
    fs.writeFileSync(`${pre}_${k}.png`, Buffer.from(r[0].split(',')[1], 'base64')); frames.push(r.slice(1)); }
  console.log(JSON.stringify({ setup, frames }), 'errors', JSON.stringify(errors.slice(0, 6))); await browser.close();
})();
