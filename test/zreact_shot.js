// Reaction-direction check: the player cuts an enemy with a given direction; frame a few ticks after the blow lands from behind the player.
// node test/zreact_shot.js out.png <right|left|up|down> [dist dir] [seed]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const fs = require('fs'), path = require('path'); const out = process.argv[2], dirName = process.argv[3] || 'right', distDir = process.argv[4] || path.resolve(__dirname, '..', 'dist'), seed = +process.argv[5] || 3;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(distDir, 'test-real.html'), { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.army = ['samurai']; st.mode = 'standard'; st.battle = 'field'; });
  await page.click('#btnSolo'); await page.waitForTimeout(1500);
  const info = await page.evaluate(([seed, dirName]) => { const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer, S = SIM; d.state.screen = 'pause';
    for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'status', 'zgrid', 'comms', 'help']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    sim.rng.s = seed; sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
    const me = sim.players[0]; const h = sim.units[me.heroId]; const hs = sim.units[me.horseId]; if (hs) { hs.dead = true; hs.inactive = true; }
    const gy = (x, z) => S.terrainH(x, z); const X = 0, Z = -30; h.mounted = false; h.mount = -1; h.x = h.px = X; h.z = h.pz = Z; h.y = h.py = gy(X, Z); h.yaw = h.pyaw = 0; h.hyaw = h.phyaw = 0;
    const foe = sim.units.find(u => u.team === 1 && u.weapon === 'katana' && !u.mounted && u.type !== 'horse');
    for (const u of sim.units) if (u !== h && u !== foe) { u.x = u.px = 250; u.z = u.pz = 250; u.target = -1; } for (const q of sim.squads) q.order = S.ORD_HOLD;
    foe.x = foe.px = X; foe.z = foe.pz = Z + 1.6; foe.y = foe.py = gy(X, Z + 1.6); foe.yaw = foe.pyaw = Math.PI; foe.hyaw = foe.phyaw = Math.PI; foe.mx = foe.mz = 0; foe.target = -1; foe.hp = 1000; foe.blocking = false; foe.hrImm = 0; foe.hrT = 0;
    const DIR = { up: S.DIR_UP, right: S.DIR_RIGHT, down: S.DIR_DOWN, left: S.DIR_LEFT }[dirName];
    const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536; let got = null, t;
    for (t = 0; t < 90 && !got; t++) { foe.target = -1; foe.st = foe.st === S.ST_WINDUP ? S.ST_IDLE : foe.st; const acts = t === 2 ? S.A_ATK : 0; sim.step([[0, yq(0), 0, acts, DIR, S.DIR_UP, [], 0]]); for (const ev of sim.events) if (ev.t === 'hit' && ev.att === h.id) got = { tick: t, k: foe.hrK, s: foe.hrS, dir: dirName }; }
    for (let k = 0; k < 3; k++) { foe.target = -1; sim.step([[0, yq(0), 0, 0, DIR, S.DIR_UP, [], 0]]); }
    const cam = new THREE.PerspectiveCamera(40, 1100 / 620, 0.1, 800); cam.position.set(X + 0.9, gy(X, Z) + 3.4, Z - 2.6); cam.lookAt(X, gy(X, Z) + 0.9, Z + 1.2); r.scene.add(cam);
    for (let i = 0; i < 6; i++) { r.fdt = 0.033; r.render(1, 0.033, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam);
    const lab = document.createElement('div'); lab.style.cssText = 'position:fixed;left:12px;top:8px;color:#fff;font:16px sans-serif;text-shadow:0 0 3px #000;z-index:99'; lab.textContent = 'cut: ' + dirName + '  reaction k=' + (got ? got.k : '-') + ' s=' + (got ? got.s : '-'); document.body.appendChild(lab);
    return { got, url: document.getElementById('c').toDataURL('image/png') }; }, [seed, dirName]);
  fs.writeFileSync(out, Buffer.from(info.url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ out, got: info.got, errors })); await browser.close();
})();
