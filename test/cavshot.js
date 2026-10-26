const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 560 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.army = ['cavalry', 'cavalry']; st.mode = 'standard'; st.battle = 'field'; });
  await page.click('#btnSolo'); await page.waitForTimeout(800);
  const info = await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim, r = d.state.renderer; d.state.screen = 'pause';
    for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'fpmarks']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    const me = sim.players[0]; me.auto = true; for (const p of sim.players) p.ready = true;
    // park everyone far away, then set one Jin infantry company against our two cavalry companies on the open slope
    for (const u of sim.units) { u.x = u.px = 140; u.z = u.pz = 140 + (u.team ? 5 : 0); }
    const inf = sim.squads.find(q => q.team === 1 && !q.def.mounted && q.def.ai === 'melee'), cav = me.squads.map(id => sim.squads[id]);
    const put = (q, x, z, f) => { q.unitIds.forEach((id, k) => { const u = sim.units[id]; u.x = u.px = x + ((k % 6) - 2.5) * (u.mounted ? 2.8 : 1.3); u.z = u.pz = z - Math.floor(k / 6) * (u.mounted ? 3 : 1.4) * (f ? -1 : 1); u.y = u.py = SIM.terrainH(u.x, u.z); u.yaw = u.hyaw = u.pyaw = u.phyaw = f; u.mx = u.mz = 0; u.hspeed = 0; u.slotX = u.x; u.slotZ = u.z; }); q.cx = x; q.cz = z; q.tx = x; q.tz = z; q.facing = f; };
    put(inf, 0, -30, Math.PI); cav.forEach((q, k) => put(q, (k - 0.5) * 18, -75, 0));
    for (const p of sim.players) { const h = sim.units[p.heroId]; if (h) { h.x = h.px = 130; h.z = h.pz = 130; } }
    let t = 0, best = null; for (; t < 30 * 12; t++) { sim.step([[0, 0, 0, 0, 0, 0, [], 0]]); const tr = sim.events.filter(e => e.t === 'trample').length; if (tr && t > 30) { best = t; break; } }
    for (let k = 0; k < 6; k++) sim.step([[0, 0, 0, 0, 0, 0, [], 0]]);
    const gy = SIM.terrainH(0, -30); const c = cav[0]; const cam = new THREE.PerspectiveCamera(50, 1000 / 560, 0.1, 800); cam.position.set(c.cx + 16, gy + 5, c.cz - 4); cam.lookAt(c.cx, gy + 1, c.cz + 2); r.scene.add(cam);
    for (let i = 0; i < 3; i++) { r.fdt = 0.016; r.render(1, 0.016, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam);
    return { firstTrample: best, cavStates: cav.flatMap(q => q.unitIds.map(id => sim.units[id].cv | 0)).join(''), speeds: cav.flatMap(q => q.unitIds.map(id => sim.units[id].hspeed.toFixed(1))).join(' ') };
  });
  await page.screenshot({ path: out, timeout: 120000 });
  console.log(JSON.stringify(info), 'errors', errors); await browser.close();
})();
