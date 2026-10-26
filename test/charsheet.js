// Character sheet: every unit type of one faction photographed alone — front, three-quarter back, side — plus how he
// reads at 35 m in the real game camera (cropped and enlarged so you can judge the silhouette). Writes a contact sheet
// and reports each figure's gear part count against the per-figure instance budget (parts past the budget are dropped).
// usage: node test/charsheet.js <outdir> [ming|jin|both] [test.html|test-real.html]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const out = process.argv[2] || '.', which = process.argv[3] || 'both', build = process.argv[4] || 'test.html', only = process.argv[5] ? process.argv[5].split(',') : null; // optional: render only these unit keys
const SIDES = {
  ming: { f: 0, army: ['samurai', 'yuanyang', 'ashigaru', 'rifle_imp', 'rifle_spencer', 'jinshotai', 'jigen', 'cavalry', 'horokutai', 'ronin'],
    show: ['hero', 'samurai', 'yuanyang:lead', 'yuanyang:shield', 'yuanyang:brush', 'yuanyang:trident', 'ashigaru', 'rifle_imp', 'rifle_spencer', 'jinshotai', 'jigen', 'cavalry', 'horokutai', 'ronin'] },
  jin: { f: 1, army: ['samurai', 'cavalry', 'shinsengumi', 'ashigaru', 'rifle_sho', 'archer', 'horokutai', 'byakkotai'],
    show: ['hero', 'samurai', 'cavalry', 'shinsengumi', 'ashigaru', 'rifle_sho', 'archer', 'horokutai', 'byakkotai'] },
};
const W = 300, H = 400;
const VIEWS = [['front', 0, 1.15, -4.4, 0, 1.0, 0, 30], ['back', 2.6, 1.7, 3.2, 0, 1.0, 0, 30], ['side', 4.4, 1.2, 0.2, 0, 1.0, 0, 30], ['far', 0, 5, -34, 0, 1.0, 0, 70]];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const report = {};
  for (const side of which === 'both' ? ['ming', 'jin'] : [which]) {
    const S = SIDES[side];
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
    await page.evaluate((S) => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.faction = S.f; st.army = S.army.slice(); st.mode = 'standard'; st.battle = 'field'; }, S);
    await page.click('#btnSolo'); await page.waitForTimeout(800);
    const picked = await page.evaluate(([S, only]) => {
      const d = window.__boshin, sim = d.state.sim; d.state.screen = 'pause';
      for (const u of sim.units) { u.x = u.px = 140; u.z = u.pz = 140; }
      const out = [], rep = {}; let k = 0;
      for (const key of S.show) { if (only && !only.includes(key)) continue; const [ty, role] = key.split(':'); const u = sim.units.find(v => v.type === ty && v.team === S.f && !v._used && !v.dead && (!role || v.role === role)); if (!u) continue; u._used = true;
        const x = -60 + k * 9, z0 = -40; k++; u.x = u.px = x; u.z = u.pz = z0; u.y = u.py = SIM.terrainH(x, z0); u.yaw = u.pyaw = Math.PI; u.hyaw = u.phyaw = Math.PI; u.mx = u.mz = 0; u.speedNow = 0; u.st = 0; u.aiming = false; u.blocking = false; u.target = -1;
        if (u.mount >= 0) { const h = sim.units[u.mount]; h.x = h.px = x; h.z = h.pz = z0; h.y = h.py = u.y; h.yaw = h.pyaw = Math.PI; }
        const g = RENDER.gearFor(u), cnt = { b: 0, c: 0, y: 0 }; for (const p of g.parts) cnt[p.m]++; const K = RENDER.GEAR_K;
        rep[key] = { b: cnt.b + '/' + K.b, c: cnt.c + '/' + K.c, y: cnt.y + '/' + K.y, over: cnt.b > K.b || cnt.c > K.c || cnt.y > K.y };
        out.push({ key, x, z: z0, name: u.def.name, mounted: u.mount >= 0 || u.mounted }); }
      { const r = d.state.renderer, keep = new Set(); for (const k in r.fig) keep.add(r.fig[k]); for (const k in (r.horse || {})) keep.add(r.horse[k]); r.scene.traverse(o => { if (o.isInstancedMesh && !keep.has(o)) o.visible = false; }); if (r.forest) r.forest.visible = false; if (r.grass) r.grass.visible = false; } // clear the stage: no trees or flags in the way
      { const cv = document.getElementById('c'); for (const el of document.body.querySelectorAll('*')) { if (el === cv || el.contains(cv) || el.tagName === 'SCRIPT') continue; const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.position === 'absolute') el.style.display = 'none'; } } // nothing but the picture
      return { out, rep };
    }, [S, only]);
    report[side] = picked.rep;
    for (const u of picked.out) for (const [name, cx, cy, cz, lx, ly, lz, fov] of VIEWS) {
      const up = u.mounted ? 1.0 : 0, back = u.mounted ? 1.6 : 1;
      await page.evaluate(([u, cx, cy, cz, lx, ly, lz, fov, up, back, W, H]) => { const r = window.__boshin.state.renderer; const gy = SIM.terrainH(u.x, u.z); const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 800);
        cam.position.set(u.x + cx * back, gy + cy + up, u.z + cz * back); cam.lookAt(u.x + lx, gy + ly + up * 0.8, u.z + lz); r.scene.add(cam);
        for (let i = 0; i < 2; i++) { r.fdt = 0.016; r.render(0.5, 0.016, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); r.scene.remove(cam); }, [u, cx, cy, cz, lx, ly, lz, fov, up, back, W, H]);
      await page.screenshot({ path: path.join(out, `${side}_${u.key.replace(':', '-')}_${name}.png`), timeout: 90000 });
    }
    report[side + '_order'] = picked.out.map(u => u.key);
    if (errors.length) report[side + '_errors'] = errors;
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'parts.json'), JSON.stringify(report, null, 1));
  // contact sheet: one row per unit, columns front / back / side / far (centre crop enlarged 3x)
  const py = `
import json, sys, os
from PIL import Image, ImageDraw
out = sys.argv[1]; rep = json.load(open(os.path.join(out, 'parts.json')))
W, H = ${W}, ${H}
for side in ['ming', 'jin']:
    order = rep.get(side + '_order')
    if not order: continue
    sheet = Image.new('RGB', (W * 4 + 170, H * len(order)), (24, 22, 20)); d = ImageDraw.Draw(sheet)
    for r, key in enumerate(order):
        for c, v in enumerate(['front', 'back', 'side', 'far']):
            im = Image.open(os.path.join(out, '%s_%s_%s.png' % (side, key.replace(':', '-'), v))).convert('RGB')
            if v == 'far':
                cw, ch = W // 3, H // 3; im = im.crop(((W - cw) // 2, (H - ch) // 2 - 10, (W + cw) // 2, (H + ch) // 2 - 10)).resize((W, H), Image.NEAREST)
            sheet.paste(im, (170 + c * W, r * H))
        p = rep[side][key]; d.text((8, r * H + 10), key, fill=(240, 220, 170)); d.text((8, r * H + 30), 'parts b%s c%s y%s%s' % (p['b'], p['c'], p['y'], ' OVER' if p['over'] else ''), fill=(200, 200, 200))
    sheet.save(os.path.join(out, 'sheet_%s.png' % side))
`;
  execFileSync('python3', ['-c', py, out]);
  console.log(JSON.stringify(report));
})();
