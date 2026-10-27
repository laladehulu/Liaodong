// First-person frame of a swordsman coming in (realism build): node test/zmeasure_shot.js out.png [dist dir] [seed]
// Runs the sim until an enemy swordsman targeting the player starts his wind-up, then presents that frame through the
// player's own camera and writes it with the distance in the corner (canvas readback: page.screenshot hangs on WebGL).
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const fs = require('fs'), path = require('path'); const out = process.argv[2], distDir = process.argv[3] || path.resolve(__dirname, '..', 'dist'), seed = +process.argv[4] || 3;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(distDir, 'test-real.html'), { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.army = ['samurai']; st.mode = 'standard'; st.battle = 'field'; });
  await page.click('#btnSolo'); await page.waitForTimeout(1500);
  const info = await page.evaluate((seed) => { const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer, S = SIM; d.state.screen = 'pause';
    for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'status', 'zgrid', 'comms', 'help']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    sim.rng.s = seed; sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
    const me = sim.players[0]; const h = sim.units[me.heroId]; const hs = sim.units[me.horseId]; if (hs) { hs.dead = true; hs.inactive = true; }
    const gy = (x, z) => S.terrainH(x, z); const X = 0, Z = -30; h.mounted = false; h.mount = -1; h.x = h.px = X; h.z = h.pz = Z; h.y = h.py = gy(X, Z); h.yaw = h.pyaw = 0; h.hyaw = h.phyaw = 0;
    /* one enemy company of Bayara guards, eight paces off, ordered to charge; everyone else far away */
    let foe = sim.squads.find(q => q.team === 1 && (q.type === 'shinsengumi' || q.type === 'samurai')); if (!foe) foe = sim.squads.find(q => q.team === 1 && q.def.ai === 'melee' && !q.def.mounted);
    for (const u of sim.units) if (u !== h && !(foe && u.squad === foe.id)) { u.x = u.px = 250; u.z = u.pz = 250; u.target = -1; }
    foe.unitIds.forEach((id, i) => { const u = sim.units[id]; const x = X + ((i % 5) - 2) * 1.5, z = Z + 9 + Math.floor(i / 5) * 1.5; u.x = u.px = x; u.z = u.pz = z; u.y = u.py = gy(x, z); u.yaw = u.pyaw = Math.PI; u.hyaw = u.phyaw = Math.PI; u.mx = u.mz = 0; });
    foe.order = S.ORD_CHARGE; foe.tx = X; foe.tz = Z; foe.cx = X; foe.cz = Z + 9;
    const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536; let got = null, inputs;
    for (let t = 0; t < 30 * 20 && !got; t++) { let e = null, ed = 1e9; for (const v of sim.teamAlive[1]) { const dd = Math.hypot(v.x - h.x, v.z - h.z); if (dd < ed) { ed = dd; e = v; } }
      const yaw = e ? Math.atan2(e.x - h.x, e.z - h.z) : 0; inputs = [[0, yq(yaw), 0, S.A_BLOCK, 0, 0, [], 0]]; sim.step(inputs);
      for (const ev of sim.events) if (ev.t === 'windup') { const a = sim.units[ev.id]; if (a.team === 1 && a.target === h.id) { got = { tick: t, dist: Math.hypot(a.x - h.x, a.z - h.z), who: a.def.name }; } } }
    /* a few more ticks so he is a third of the way into the wind-up, then present through the player's eyes */
    for (let k = 0; k < 4; k++) sim.step(inputs); let e2 = null, ed2 = 1e9; for (const v of sim.teamAlive[1]) { const dd = Math.hypot(v.x - h.x, v.z - h.z); if (dd < ed2) { ed2 = dd; e2 = v; } }
    const yaw = e2 ? Math.atan2(e2.x - h.x, e2.z - h.z) : 0; r.view = r.view || {}; st.yaw = yaw; st.pitch = 0;
    for (let i = 0; i < 6; i++) { r.fdt = 0.033; r.render(1, 0.033, { mode: 'fp', yaw, pitch: 0.02, selected: [] }); }
    const c = document.getElementById('c'); r.present(r.camera); return { got, near: ed2, url: c.toDataURL('image/png') }; }, seed); /* the readback must happen in the same task as the render */
  const url = info.url;
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ out, info: { got: info.got, near: +info.near.toFixed(2) }, errors })); await browser.close();
})();
