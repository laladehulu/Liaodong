// Animation contact sheets: a row of men, each frozen at one phase of an animation, rendered headless and read back with
// toDataURL (page.screenshot hangs on WebGL). node test/zanim_sheet.js <scene> out.png [page: test|test-real|test-act] [dist]
//   scenes: arms (clearance in idle/run/swing/block), swing (dao cut phases), chop, thrust, spear, club, heavy, combo,
//           riposte, shieldrip, arrowdie, helpup, tiger, idle, run, faces
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const scene = process.argv[2] || 'swing', out = process.argv[3] || path.resolve(__dirname, 'out', scene + '.png'), pageName = process.argv[4] || 'test-real', dist = +process.argv[5] || 6.5;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 560 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', pageName + '.html'), { waitUntil: 'load', timeout: 90000 });
  const process_low = process.env.LOWFX === '1';
  await page.evaluate((process_low) => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; if (process_low) document.getElementById('lowfxIn').checked = true; const st = window.__boshin.state; st.army = ['jigen', 'ronin', 'ashigaru', 'rifle_spencer', 'yuanyang', 'samurai']; st.mode = 'standard'; st.battle = 'field'; }, process_low);
  await page.evaluate(() => document.getElementById('btnSolo').click()); for (let i = 0; i < 150; i++) { await page.waitForTimeout(2000); if (await page.evaluate(() => !!(window.__boshin.state.sim && window.__boshin.state.renderer))) break; } await page.waitForTimeout(800);
  const info = await page.evaluate(([scene, dist]) => {
    const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer, S = SIM; st.screen = 'pause';
    for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'status', 'zgrid', 'comms', 'help']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    const all = sim.units.filter(u => !u.dead && u.type !== 'horse' && !u.mounted && u.mount < 0 && u.def.ai !== 'cannon');
    for (const u of sim.units) if (u.type !== 'horse') { u.x = u.px = 300; u.z = u.pz = 300; u.target = -1; }
    const pick = (f, n) => { const got = []; for (const u of all) { if (got.length >= n) break; if (!u._used && f(u)) { u._used = true; got.push(u); } } return got; };
    const kat = (u) => u.weapon === 'katana' && u.type !== 'hero' && !u.def.shield, spear = (u) => u.weapon === 'yari' && u.role === 'spear', brush = (u) => u.weapon === 'yari' && u.role === 'brush', gun = (u) => u.weapon === 'rifle', any = (u) => u.weapon === 'katana' || u.weapon === 'yari';
    // a flat, open stretch: search a grid for the spot whose 14 m row varies least in height and has no drawn prop near it
    let Z = -40, X0 = 0; { let best = 1e9; for (let zz = -120; zz <= 120; zz += 6) for (let xx = -120; xx <= 120; xx += 6) { let lo = 1e9, hi = -1e9; for (let k = -7; k <= 7; k++) { const h = S.terrainH(xx + k, zz); lo = Math.min(lo, h); hi = Math.max(hi, h); } let v = hi - lo; if (S.waterAt && S.waterAt(xx, zz)) v += 9; for (const b of (sim.boxes || [])) if (Math.abs(b.x - xx) < 12 && Math.abs(b.z - zz) < 10) v += 5; for (const o of (sim.obstacles || [])) if (Math.abs(o.x - xx) < 12 && Math.abs(o.z - zz) < 10) v += 5; if (v < best) { best = v; X0 = xx; Z = zz; } } }
    const gy = S.terrainH(X0, Z); const labels = []; const men = [];
    const place = (u, k, n, yaw) => { const x = X0 - (k - (n - 1) / 2) * 1.5; u.x = u.px = x; /* the camera looks along +z: +x is screen-left, so k runs right along the screen */ u.z = u.pz = Z; u.y = u.py = S.terrainH(x, Z); u.yaw = u.pyaw = yaw === undefined ? -Math.PI * 0.62 : yaw; u.hyaw = u.phyaw = u.yaw; u.mx = u.mz = 0; u.vx = u.vz = 0; u.speedNow = 0; u.st = S.ST_IDLE; u.stT = 0; u.blocking = false; u.aiming = false; u.hrA = 9; u.hrT = 0; u.flinchT = 0; u.heavy = false; u.lunge = false; u.counterT = 0; u.cbN = 0; u.pace = 0; u.fat = 0; men.push(u); };
    const atk = (u, dir, st, t, extra) => { u.atkDir = dir; u.st = st; u.stT = t; Object.assign(u, extra || {}); };
    const W = S.ST_WINDUP, R = S.ST_RELEASE, C = S.ST_RECOVER;
    const phases = [[W, 0.06, 'wind .06'], [W, 0.3, 'wind top'], [R, 0.04, 'rel .04'], [R, 0.09, 'rel .09'], [R, 0.15, 'rel .15'], [R, 0.2, 'rel end'], [C, 0.1, 'rec .1'], [C, 0.35, 'settled']];
    const row = (f, dir, extra, yaw) => { const us = pick(f, phases.length); us.forEach((u, k) => { place(u, k, us.length, yaw); const p = phases[k]; atk(u, dir, p[0], p[1], extra); labels.push(p[2]); }); };
    let cam2 = null;
    switch (scene) {
      case 'arms': { const us = pick(any, 8); us.forEach((u, k) => place(u, k, 8, k < 4 ? Math.PI * 0.5 : Math.PI)); const [a, b, c, dd, e, f, g, h] = us;
        labels.push('idle', 'run', 'windup', 'release', 'block', 'idle(front)', 'guard', 'run(front)'); b.speedNow = 4; b.pace = 3; atk(c, S.DIR_RIGHT, W, 0.3); atk(dd, S.DIR_RIGHT, R, 0.1); e.blocking = true; e.blockT = 1; e.blockDir = S.DIR_UP; h.speedNow = 4; h.pace = 3; break; }
      case 'swing': row(kat, S.DIR_RIGHT); break;
      case 'swingL': row(kat, S.DIR_LEFT); break;
      case 'chop': row(kat, S.DIR_UP); break;
      case 'thrust': row(kat, S.DIR_DOWN); break;
      case 'spear': row(spear, S.DIR_DOWN); break;
      case 'club': row(gun, S.DIR_RIGHT, { club: true }); break;
      case 'heavy': row(kat, S.DIR_UP, { heavy: true }); break;
      case 'combo': row(kat, S.DIR_LEFT, { cbN: 2, cbK: 'lianhuan', cbE: sim.tick, cbChain: 1 }); break;
      case 'riposte': row(kat, S.DIR_UP, { counterT: 0.6, cbK: 'fan', cbN: 1 }); break;
      case 'shieldrip': row((u) => kat(u) && u.def.shield, S.DIR_RIGHT, { counterT: 0.6, cbK: 'fan', cbN: 1 }); break;
      case 'tiger': { const us = pick(brush, 2); if (us.length) { const u = us[0]; place(u, 0, 1, Math.PI * 0.8); const foes = pick((v) => v.team !== u.team && any(v), 3); foes.forEach((v, k) => { const a = k * 2.1 + 0.4; v.x = v.px = u.x + Math.sin(a) * 2.2; v.z = v.pz = u.z + Math.cos(a) * 2.2; v.y = v.py = S.terrainH(v.x, v.z); v.yaw = v.pyaw = a + Math.PI; }); atk(u, S.DIR_RIGHT, R, 0.1); labels.push('surrounded sweep'); } break; }
      case 'idle': { const us = pick(any, 8); us.forEach((u, k) => { place(u, k, 8); u.id2 = k; labels.push('idle ' + k); }); break; }
      case 'run': { const us = pick(any, 8); us.forEach((u, k) => { place(u, k, 8, Math.PI * 0.5); u.speedNow = k < 3 ? 3.2 : k < 6 ? 4.4 : 3.6; u.pace = k < 3 ? 2 : k < 6 ? 3 : 2; u.fat = k >= 6 ? 95 : 0; labels.push(k < 3 ? 'trot' : k < 6 ? 'sprint' : 'tired'); }); break; }
      case 'faces': case 'faces2': { const FXK = scene === 'faces' ? ['calm', 'fear', 'fury', 'pain', 'dying', 'spent', 'veteran', 'alarm'] : ['resolve', 'shout', 'relief', 'grief', 'surprise', 'focus', 'strain', 'wary'];
        const us = pick(any, 8); us.forEach((u, k) => { place(u, k, 8, Math.PI); labels.push(FXK[k]); }); cam2 = 2.6; window.__fxForce = (u) => FXK[men.indexOf(u)]; break; }
      case 'arrowdie': { const us = pick(any, 8); us.forEach((u, k) => { place(u, k, 8, -Math.PI * 0.62); const v = k < 3 ? 0 : k < 6 ? 1 : 2, tt = [0.15, 0.5, 0.85][k % 3]; labels.push(['clutch', 'stagger', 'spin'][v] + ' ' + tt);
        r.dying = r.dying || new Map(); const id = u.id; r.dyingStart(u, { ix: 0.3, iy: 0, iz: -1, cause: 'arrow' }); const D = r.dying.get(id); D.v = v; D.dur = 1; D.t = tt; D.hold = tt; u.dead = true; }); break; }
      case 'helpup': { const us = pick(any, 8); for (let k = 0; k < 4; k++) { const h = us[k * 2], v = us[k * 2 + 1]; place(h, k * 2, 8, Math.PI * 0.9); place(v, k * 2 + 1, 8, Math.PI * 0.9); v.x = v.px = h.x - 0.7; v.z = v.pz = h.z + 0.3; v.y = v.py = S.terrainH(v.x, v.z);
          v.wounded = true; v.downed = true; v.reviveBy = h.id; v.reviveT = [2, 20, 38, 44][k]; v.hp = 1; labels.push('helper ' + ['kneel', 'lift', 'rising', 'up'][k], 'helped'); } break; }
    }
    const n = men.length || 1; const D = cam2 || dist;
    const cam = new THREE.PerspectiveCamera(cam2 ? 36 : 40, 1400 / 560, 0.1, 800); cam.position.set(X0 + D * 0.08, gy + (cam2 ? 1.55 : 1.5), Z - D * (0.45 + n * 0.075)); cam.lookAt(X0, gy + (cam2 ? 1.45 : 0.95), Z); r.scene.add(cam);
    if (r.anims) for (const u of men) { delete r.anims[u.id]; }
    if (window.__fxForce) { for (const u of men) { const a = r.anim(u.id); const k = window.__fxForce(u); a.fx = Float64Array.from(RENDER.FX[k]); a.fxV = new Float64Array(8); a.fxT = 1e9; a.fxK = k; } }
    for (let i = 0; i < 40; i++) { r.fdt = 0.02; r.time = (r.time || 0) + 0.02; if (r.dying) for (const D of r.dying.values()) if (D.hold !== undefined) D.t = D.hold - 0.02; r.render(0.5, 0.02, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); r.camera.position.copy(cam.position); }
    if (cam2) { for (let i = 0; i < 30; i++) { r.fdt = 0.02; r.time += 0.02; for (const u of men) { r.drawFigure(u.id, u, u.x, u.y, u.z, u.yaw, 1, false); } for (const k in r.fig) r.fig[k].instanceMatrix.needsUpdate = true; } }
    r.present(cam);
    const src = document.getElementById('c'); const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const g = cv.getContext('2d'); g.drawImage(src, 0, 0);
    g.font = 'bold 15px sans-serif'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; g.textAlign = 'center';
    labels.forEach((L, k) => { const px = (k + 0.5) / labels.length * cv.width; g.strokeText(L, px, cv.height - 14); g.fillText(L, px, cv.height - 14); });
    g.textAlign = 'left'; g.strokeText(scene + ' · ' + document.title, 10, 22); g.fillText(scene + ' · ' + document.title, 10, 22);
    return { labels, n, url: cv.toDataURL('image/png') }; }, [scene, dist]);
  fs.writeFileSync(out, Buffer.from(info.url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ out, labels: info.labels, n: info.n, errors })); await browser.close();
})();
