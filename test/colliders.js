// node test/colliders.js [page] : for every map, finds solid-looking building geometry a man could walk into (no sim collider under it)
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
const PAGE = process.argv[2] || 'test.html';
const CASES = (process.argv[3] || 'grand:field,grand:toba,grand:ueno,grand:nagaoka,grand:aizu,grand:hakodate,grand:abudali,grand:bjgate,grand:zroad,grand:sjvil,grand:siegecity,grand:bonari,assault:op=ningyuan_siege,assault:op=liaoyang,assault:op=shanhai').split(',');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  for (const cs of CASES) {
    const [mode, b] = cs.split(':');
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } }); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', PAGE), { waitUntil: 'load' }); await page.waitForTimeout(300);
    await page.evaluate(([mode, b]) => { AUDIO.init = () => {}; const S = window.__boshin.state; S.mode = mode; if (b.startsWith('op=')) S.op = b.slice(3); else S.battle = b; }, [mode, b]);
    await page.click('#btnSolo'); await page.waitForTimeout(1500);
    const res = await page.evaluate(() => {
      const r = window.__boshin.state.renderer, sim = r.sim, TH = SIM.terrainH; const out = [];
      const ray = new THREE.Raycaster(); const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-0.6, 0, 0.8)];
      const inBox = (x, z, y) => { for (const b of sim.boxes) { if (b.hw < 0.1) continue; const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0), dx = x - b.x, dz = z - b.z, lx = dx * c + dz * s, lz = -dx * s + dz * c; if (Math.abs(lx) < b.hw + 0.05 && Math.abs(lz) < b.hd + 0.05) return true; } for (const o of sim.obstacles) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + 0.05) ** 2) return true; if (sim.navBlk && sim.navBlk[sim.navCell(x, z)] & 1) return true; return sim.siegeSolid ? sim.siegeSolid(x, z) : false; };
      const m4 = new THREE.Matrix4(), bb = new THREE.Box3(), tmp = new THREE.Mesh();
      const meshes = []; r.scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible && o.geometry && !o.isSkinnedMesh && !(o.material && o.material.isShaderMaterial) && !(o.material && o.material.transparent)) meshes.push(o); });
      for (const o of meshes) { if (o === r.terrain || (r.fig && Object.values(r.fig).includes(o))) continue; o.updateWorldMatrix(true, false); const n = o.isInstancedMesh ? o.count : 1; if (n > 3000) continue;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        for (let i = 0; i < n; i++) { if (o.isInstancedMesh) { o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld); } else m4.copy(o.matrixWorld);
          bb.copy(o.geometry.boundingBox).applyMatrix4(m4); const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z; if (sx < 0.3 || sz < 0.3 || sx > 45 || sz > 45) continue;
          const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, g = TH(cx, cz); if (bb.max.y < g + 1.3 || bb.min.y > g + 1.0 || Math.abs(cx) > 160 || Math.abs(cz) > 160 || Math.max(sx, sz) < 1.2) continue;
          tmp.geometry = o.geometry; tmp.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); tmp.matrixWorld.copy(m4); tmp.matrixAutoUpdate = false;
          let tot = 0, bad = 0, bx = 0, bz = 0; const st = Math.max(0.35, Math.max(sx, sz) / 40);
          for (let x = bb.min.x + st / 2; x < bb.max.x; x += st) for (let z = bb.min.z + st / 2; z < bb.max.z; z += st) { const y = TH(x, z) + 1.0; if (y < bb.min.y || y > bb.max.y) continue;
            let inside = 0; for (const d of dirs) { ray.set(new THREE.Vector3(x, y, z), d); ray.far = 300; const hits = []; tmp.raycast(ray, hits); if (hits.length % 2 === 1) inside++; } if (inside < 2) continue;
            tot++; if (!inBox(x, z, y)) { bad++; bx += x; bz += z; } }
          if (bad >= 3 && bad > tot * 0.15) out.push({ geo: o.geometry.type, col: o.material && o.material.color ? o.material.color.getHexString() : '', i, at: [+(bx / bad).toFixed(1), +(bz / bad).toFixed(1)], size: [+sx.toFixed(1), +(bb.max.y - bb.min.y).toFixed(1), +sz.toFixed(1)], bad, tot }); } }
      return out; });
    const area = res.reduce((a, c) => a + c.bad, 0);
    console.log('\n== ' + cs + ' ' + res.length + ' leaky pieces' + (errs.length ? ' ERR ' + errs[0] : ''));
    for (const q of res.sort((a, b) => b.bad - a.bad).slice(0, 25)) console.log('  ', q.geo, '#' + q.col, 'at', q.at.join(','), 'size', q.size.join('x'), 'uncovered', q.bad + '/' + q.tot);
    await page.close();
  }
  await browser.close();
})();
