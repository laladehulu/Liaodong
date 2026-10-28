// New Realism in a real battle: node test/newreal_shot.js out.png [ticks] [port]   (serve the repo root: python3 -m http.server 8766)
// Plays the field battle on the AI for a while, finds where the lines meet, and frames it from close by with the new men.
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core'); const fs = require('fs');
const out = process.argv[2] || 'test/out/newreal.png', ticks = +process.argv[3] || 450, port = process.argv[4] || 8766;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } }); const errors = []; page.on('pageerror', e => errors.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await page.goto(`http://localhost:${port}/dist/test-newreal.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.NEWMODEL && window.NEWMODEL.ok, null, { timeout: 60000 }).catch(() => errors.push('new model never loaded'));
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.mode = 'standard'; st.battle = 'field'; });
  await page.evaluate(() => document.getElementById('btnSolo').click()); await page.waitForTimeout(1500);
  const info = await page.evaluate((ticks) => { const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer, S = SIM; st.screen = 'pause';
    for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'status', 'zgrid', 'comms', 'help']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true; for (const p of sim.players) p.ai = true;
    const me = sim.players[0], h = sim.units[me.heroId]; if (h) { h.x = h.px = 0; h.z = h.pz = -120; }
    for (let t = 0; t < ticks; t++) { sim.step([[0, 0, 0, 0, 0, 0, [], 0]]); r.processEvents(sim.events); if (t % 30 === 0) { r.fdt = 0.2; r.render(1, 0.2, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } }
    // where the lines meet: the man with a live foe nearest the middle of all such men
    const fight = sim.units.filter(u => !u.dead && u.type !== 'horse' && u.target >= 0 && !sim.units[u.target].dead && Math.hypot(sim.units[u.target].x - u.x, sim.units[u.target].z - u.z) < 4);
    const c = fight.length ? fight[(fight.length / 2) | 0] : sim.units.find(u => !u.dead && u.type !== 'horse');
    const gy = S.terrainH(c.x, c.z); const cam = new THREE.PerspectiveCamera(42, 1100 / 620, 0.1, 800); cam.position.set(c.x + 5.5, gy + 2.6, c.z + 4.5); cam.lookAt(c.x, gy + 1.0, c.z); r.scene.add(cam);
    r.camera.position.copy(cam.position); r.camera.quaternion.copy(cam.quaternion);
    for (let i = 0; i < 12; i++) { sim.step([[0, 0, 0, 0, 0, 0, [], 0]]); r.processEvents(sim.events); r.fdt = 0.033; r.camera.position.copy(cam.position); r.render(1, 0.033, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); }
    r.camera.position.copy(cam.position); r.present(cam);
    return { url: r.renderer.domElement.toDataURL('image/png'), men: window.NEWMODEL.men.size, corpses: window.NEWMODEL.corpses.length, fighting: fight.length, tick: sim.tick }; }, ticks);
  fs.writeFileSync(out, Buffer.from(info.url.split(',')[1], 'base64')); delete info.url; console.log(JSON.stringify(info), 'errors', JSON.stringify(errors.slice(0, 6))); await browser.close();
})();
