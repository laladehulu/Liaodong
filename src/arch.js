// ===================== 營造 · Chinese buildings drawn in code =====================
// Loaded after render.js (like realism.js): replaces the box-and-pyramid houses and halls with buildings in the Ming manner,
// after the proportions of the 營造法式 / 工程做法: a stone plinth (台基), timber columns and a lintel on the front, lattice windows
// and a plank door, grey brick or whitewashed walls, and a curved tiled roof (屋面), concave from ridge to eave (舉折), the
// corners turned up (翼角), with a ridge (正脊) and its end ornaments. A house has a plain gable roof (硬山) between brick
// gable walls; a hall (廳, a yamen or a temple hall) stands on a higher platform with steps, columns all round, under a
// hip roof (廡殿/歇山) with deep eaves and strongly lifted corners. The collider is still the sim's box; only the drawing is new.
// Everything is merged into a handful of meshes per field (one per material), so a town of sixty houses is six draw calls.
(() => {
  'use strict';
  if (typeof RENDER === 'undefined' || !RENDER.Renderer) return;
  const R = RENDER.Renderer.prototype, terrainH = SIM.terrainH, PI = Math.PI;
  // ---- a bag of triangles in one material: geometries are baked in with their transform, then made one mesh ----
  class Bag {
    constructor() { this.p = []; this.n = []; this.u = []; }
    add(geo, m) { const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); this.p.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); this.n.push(v.x, v.y, v.z); if (U) this.u.push(U.getX(i), U.getY(i)); else this.u.push(0, 0); }
      if (g !== geo) g.dispose(); }
    mesh(mat) { if (!this.p.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }
  }
  const UB = new THREE.BoxGeometry(1, 1, 1), UC = new THREE.CylinderGeometry(0.5, 0.56, 1, 6, 1, true), UCL = new THREE.CylinderGeometry(0.5, 0.56, 1, 4, 1, true);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  // the building's own frame: origin at its centre at ground level, local x along its long side, turned by ry
  const frame = (x, y, z, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
  const boxIn = (bag, F, cx, cy, cz, sx, sy, sz, rx, ry, rz) => { M4.compose(V.set(cx, cy, cz), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), S.set(sx, sy, sz)); bag.add(UB, new THREE.Matrix4().multiplyMatrices(F, M4)); };
  const colIn = (bag, F, cx, cy, cz, r, h, lo) => { M4.compose(V.set(cx, cy, cz), Q.identity(), S.set(r * 2, h, r * 2)); bag.add(lo ? UCL : UC, new THREE.Matrix4().multiplyMatrices(F, M4)); };
  // ---- the roof: a height field over the plan, concave from the ridge down to the eaves, its corners turned up ----
  // a = half length (local x) and b = half depth (local z), both with the eaves' overhang; H = rise from eave to ridge.
  // hip 0: a gable roof (two slopes, the ends cut square for the gable walls); hip 1: four slopes (the hip ends start
  // `b` in from each end). lift: how far the corners curl up, as a share of H. Built as an indexed grid (smooth normals),
  // with an underside (the rafters seen from below) and a fascia round the edge.
  const roofCache = new Map();
  function roofGeo(a, b, H, hip, lift, lo) {
    const key = [a, b, H, hip, lift, lo].map(v => +(+v).toFixed(2)).join(':'); if (roofCache.has(key)) return roofCache.get(key);
    const nx = lo ? 6 : hip ? 12 : 8, nz = lo ? 4 : hip ? 8 : 6, T = 0.16, pos = [], uv = [], idx = [];
    const h = (x, z) => { const tz = Math.abs(z) / b; let m = tz;
      if (hip) { const tx = Math.max(0, (Math.abs(x) - (a - b)) / b); m = Math.max(tz, tx); }
      let y = H * Math.pow(Math.max(0, 1 - m), 1.45); /* 舉折: steep at the ridge, flattening to the eaves */
      const cx = Math.min(1, Math.abs(x) / a), corner = Math.pow(cx, hip ? 3 : 7) * Math.pow(tz, 2); y += lift * H * corner; /* 翼角: the corners turn up */
      return y; };
    const grid = (off, flip) => { const base = pos.length / 3;
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -a + (2 * a * i) / nx, z = -b + (2 * b * j) / nz; pos.push(x, h(x, z) - off, z); uv.push(x / 1.1, z / 1.1); }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = base + j * (nx + 1) + i; if (!flip) idx.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2); else idx.push(k, k + 1, k + nx + 1, k + 1, k + nx + 2, k + nx + 1); }
      return base; };
    const top = grid(0, false), bot = grid(T, true);
    // the fascia: a strip round the edge from the top sheet down to the underside
    const ring = []; for (let i = 0; i <= nx; i++) ring.push([i, 0]); for (let j = 1; j <= nz; j++) ring.push([nx, j]); for (let i = nx - 1; i >= 0; i--) ring.push([i, nz]); for (let j = nz - 1; j >= 1; j--) ring.push([0, j]); ring.push([0, 0]);
    for (let r = 0; r < ring.length - 1; r++) { const [i0, j0] = ring[r], [i1, j1] = ring[r + 1]; const a0 = top + j0 * (nx + 1) + i0, a1 = top + j1 * (nx + 1) + i1, b0 = bot + j0 * (nx + 1) + i0, b1 = bot + j1 * (nx + 1) + i1; idx.push(a0, b0, a1, a1, b0, b1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const out = { geo: g, h }; roofCache.set(key, out); return out;
  }
  // a gable wall's triangle (the 山牆 under a gable roof), as a thin prism in the local x = ±at plane
  function gableGeo(b, H, th) {
    const p = [], pts = [[-b, 0], [0, H], [b, 0]]; const side = (s) => pts.map(q => [s, q[1], q[0]]);
    const A = side(-th / 2), B = side(th / 2); const tri = (q0, q1, q2) => p.push(...q0, ...q1, ...q2);
    tri(A[0], A[2], A[1]); tri(B[0], B[1], B[2]); for (let k = 0; k < 3; k++) { const k2 = (k + 1) % 3; tri(A[k], B[k], A[k2]); tri(A[k2], B[k], B[k2]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; }
  // ---- textures: grey roof tiles in rows (筒瓦 over 板瓦), brick, plaster ----
  function tileTex(snow) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d');
    g.fillStyle = snow ? '#e4e8ec' : '#4a4e54'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i++) { const x = i * 16; g.fillStyle = snow ? '#c8ced6' : '#2a2d32'; g.fillRect(x, 0, 4, 64); g.fillStyle = snow ? '#f4f6f8' : '#6a6e74'; g.fillRect(x + 6, 0, 5, 64); }
    for (let j = 0; j < 4; j++) { g.fillStyle = snow ? 'rgba(160,170,180,.35)' : 'rgba(30,32,36,.35)'; g.fillRect(0, j * 16 + 14, 64, 2); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
  function brickTex(base, line) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 64, 64); g.fillStyle = line;
    for (let j = 0; j < 8; j++) { g.fillRect(0, j * 8 + 7, 64, 1); for (let i = 0; i < 4; i++) g.fillRect(((i * 16) + (j % 2) * 8) % 64, j * 8, 1, 8); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  // boxes take a UV per face 0..1: a brick wall is scaled to show a brick every ~25 cm (set by the material's repeat)
  R.buildArchHouses = function (houses) {
    const snow = this.biome.snow, lo = !!this.lowfx;
    const bags = { stone: new Bag(), wall: new Bag(), plaster: new Bag(), timber: new Bag(), dark: new Bag(), roof: new Bag(), ridge: new Bag(), soot: new Bag() };
    for (const b of houses) {
      const along = b.hw >= b.hd, a = along ? b.hw : b.hd, d = along ? b.hd : b.hw, ry = along ? 0 : PI / 2, hall = b.kind === 'hall' || (a * d > 30 && b.h > 5);
      const y = terrainH(b.x, b.z), fy = this.footY(b), F = frame(b.x, 0, b.z, ry);
      const plinth = hall ? 0.75 : 0.32, pt = y + plinth, wh = y + b.h * (hall ? 0.66 : 0.62), wallH = wh - pt;
      // 台基: the stone plinth, its foot down to the lowest corner of the slope; a hall's has steps up the front
      boxIn(bags.stone, F, 0, (fy + pt) / 2, 0, a * 2 + (hall ? 0.9 : 0.12), pt - fy, d * 2 + (hall ? 0.9 : 0.12));
      if (hall) for (let s = 0; s < 3; s++) boxIn(bags.stone, F, 0, y + plinth * (s + 0.5) / 3 - plinth / 6, d + 0.45 + 0.35 * (2 - s), Math.min(a * 1.1, 4.2), plinth * (s + 1) / 3, 0.35);
      if (b.burnt) { boxIn(bags.soot, F, 0, (pt + wh) / 2, 0, a * 2, wallH, d * 2); for (let k = -1; k <= 1; k += 2) boxIn(bags.soot, F, k * a * 0.4, wh + 0.1, 0, 0.18, 0.18, d * 2.2, 0.3 * k, 0, 0.2); continue; } /* a burnt-out shell: sooted walls, a few charred beams */
      // the walls: grey brick for a house, whitewashed for a hall
      boxIn(hall ? bags.plaster : bags.wall, F, 0, (pt + wh) / 2, 0, a * 2, wallH, d * 2);
      // the timber front (and back): columns, a lintel under the eaves, lattice windows between, a plank door in the middle
      const bays = Math.max(1, Math.round(a * 2 / (hall ? 2.6 : 2.4))), bw = a * 2 / bays, colR = hall ? 0.17 : 0.12;
      const many = houses.length > 60; /* a whole quarter of a city: the backs of the houses plain */
      for (const side of hall ? [-1, 1] : many ? [1] : [1, -1]) { const zf = side * (d + (hall ? 0.45 : 0.04));
        for (let i = 0; i <= bays; i++) colIn(bags.timber, F, -a + i * bw, (pt + wh) / 2, zf, colR, wallH, lo);
        boxIn(bags.timber, F, 0, wh - 0.16, zf, a * 2 + 0.2, 0.3, 0.22);
        if (lo) continue;
        for (let i = 0; i < bays; i++) { const cx = -a + (i + 0.5) * bw, mid = i === Math.floor(bays / 2);
          if (mid && side === 1) { boxIn(bags.dark, F, cx, pt + Math.min(2.1, wallH * 0.75) / 2, d + 0.03, Math.min(1.3, bw * 0.6), Math.min(2.1, wallH * 0.75), 0.08); boxIn(bags.timber, F, cx, pt + Math.min(2.1, wallH * 0.75) + 0.08, d + 0.06, Math.min(1.5, bw * 0.7), 0.14, 0.1); }
          else { const wy = pt + wallH * 0.55, ww = Math.min(1.2, bw * 0.55), wv = Math.min(0.95, wallH * 0.36); boxIn(bags.dark, F, cx, wy, side * (d + 0.03), ww, wv, 0.06); boxIn(bags.timber, F, cx, wy, side * (d + 0.07), 0.06, wv, 0.04); boxIn(bags.timber, F, cx, wy, side * (d + 0.07), ww, 0.06, 0.04); } } }
      if (hall) for (const side of [-1, 1]) for (let j = 1; j < Math.max(2, Math.round(d * 2 / 2.6)); j++) colIn(bags.timber, F, side * (a + 0.45), (pt + wh) / 2, -d - 0.45 + j * (d * 2 + 0.9) / Math.max(2, Math.round(d * 2 / 2.6)), colR, wallH, lo); /* the colonnade round the ends */
      // the roof
      const oh = hall ? 1.05 : 0.55, ra = a + (hall ? oh + 0.45 : 0.25), rb = d + oh + (hall ? 0.45 : 0), H = Math.max(1.1, (d + oh) * (hall ? 0.62 : 0.68)), lift = hall ? 0.32 : 0.1;
      const RF = roofGeo(ra, rb, H, hall ? 1 : 0, lift, lo); M4.compose(V.set(0, wh, 0), Q.identity(), S.set(1, 1, 1)); bags.roof.add(RF.geo, new THREE.Matrix4().multiplyMatrices(F, M4));
      if (!hall) for (const s of [-1, 1]) { M4.compose(V.set(s * (a - 0.02), wh - 0.02, 0), Q.identity(), S.set(1, 1, 1)); bags.wall.add(gableGeo(d + 0.06, RF.h(s * a, 0) - 0.05, 0.34), new THREE.Matrix4().multiplyMatrices(F, M4)); } /* 硬山: brick gables up to the roof */
      // 正脊: the ridge along the top, its ends curled up (鴟吻 on a hall)
      const ridgeL = hall ? Math.max(0.8, (ra - rb) * 2) : ra * 2 - 0.1, ry0 = wh + H + 0.06;
      boxIn(bags.ridge, F, 0, ry0 + (hall ? 0.16 : 0.1), 0, ridgeL, hall ? 0.38 : 0.24, hall ? 0.34 : 0.26);
      for (const s of [-1, 1]) boxIn(bags.ridge, F, s * ridgeL / 2, ry0 + (hall ? 0.5 : 0.26), 0, hall ? 0.32 : 0.2, hall ? 0.75 : 0.38, hall ? 0.3 : 0.24, 0, 0, -s * (hall ? 0.35 : 0.5));
      if (hall) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const ex = sx * (ra - rb), y0 = ry0; boxIn(bags.ridge, F, sx * (ra - rb * 0.5), (y0 + wh + RF.h(sx * ra * 0.98, sz * rb * 0.98)) / 2 + 0.1, sz * rb * 0.5, 0.2, 0.2, Math.hypot(rb, rb) * 1.0, 0, sx * sz * PI / 4, 0); void ex; } /* the hip ridges (垂脊) */
    }
    const L = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {}));
    const tiles = tileTex(snow); tiles.repeat.set(1, 1);
    const brick = brickTex(snow ? '#8f8b85' : '#7e7a74', snow ? '#6a6660' : '#5a5650'); brick.repeat.set(4, 4);
    /* solid colours: the stylised shading keeps a material's colour and not its texture map */
    const mats = { stone: L(snow ? 0x8a8780 : 0x77726a), wall: L(snow ? 0x8f8b85 : 0x7c7872), plaster: L(0xd8d0c0), timber: L(0x7a2e20), dark: L(0x2a2018), roof: L(snow ? 0xdfe4ea : 0x4a4f56, { side: THREE.DoubleSide }), ridge: L(snow ? 0xd8dde2 : 0x34363a), soot: L(0x3a3430) }; void tiles; void brick;
    for (const k in bags) { const m = bags[k].mesh(mats[k]); if (m) this.scene.add(m); }
    return true;
  };
})();
