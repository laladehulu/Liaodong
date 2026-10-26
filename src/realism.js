// ============================================================================
// 寫實 · Realism edition: a film look in the spirit of live-action Ming war epics.
// Loaded after render.js; only active when window.MING_REAL is set. It patches the
// renderer: PBR materials, HDR + filmic tone mapping, an overcast dusty sky, smoke-
// choked air, distant burning, textured mud and grass, and a cinematic grade.
// ============================================================================
(function () {
  if (typeof window === 'undefined' || !window.MING_REAL || typeof RENDER === 'undefined') return;
  const R = RENDER.Renderer.prototype; const HALF = 150; const terrainH = SIM.terrainH;
  const RT = { time: { value: 0 } };
  // HDR + bloom is optional (off by default): toggle in the pause menu or with F8; remembered per browser
  const realQ = () => { try { const v = localStorage.getItem('ming_q'); return v === null ? 1 : Math.max(0, Math.min(2, +v)); } catch (e) { return 1; } }; // 0 low, 1 medium, 2 high
  const realHDR = () => { try { return localStorage.getItem('ming_hdr') === '1'; } catch (e) { return false; } };
  // dusty, overcast palette (grey-brown haze, cold sky, warm fire)
  const LOOK = {
    haze: 0x9c968a, hazeFar: 0xb4ada0, skyTop: 0x5d646c, skyMid: 0xa39d92, skyLow: 0xb9b1a2, sun: 0xffe2b8,
    hemiSky: 0xa7adb3, hemiGround: 0x4d4234, sunI: 1.55, hemiI: 0.9, exposure: 0.92,
  };
  const WINTER = { haze: 0xb7b8b6, hazeFar: 0xc9c9c6, skyTop: 0x6c737b, skyMid: 0xb7b8b6, skyLow: 0xc6c6c2, sun: 0xfff0dc, hemiSky: 0xc2c8ce, hemiGround: 0x6a6a68, sunI: 1.3, hemiI: 1.05, exposure: 0.9 };
  const STORMY = { haze: 0x6f7378, hazeFar: 0x80848a, skyTop: 0x3c4148, skyMid: 0x6c7076, skyLow: 0x7a7e84, sun: 0xd8dde4, hemiSky: 0x9aa2ac, hemiGround: 0x3c3a34, sunI: 0.9, hemiI: 1.0, exposure: 1.15 };
  const NIGHT = { haze: 0x161c28, hazeFar: 0x0c1018, skyTop: 0x04060b, skyMid: 0x0e1420, skyLow: 0x182030, sun: 0x9db2e0, hemiSky: 0x2a3550, hemiGround: 0x0a0a0a, sunI: 0.3, hemiI: 0.4, exposure: 1.05 };
  const look = (r) => r.biome.night ? NIGHT : r.sim.rain ? STORMY : r.biome.snow ? WINTER : LOOK;

  // crisp world-space cells (Voronoi): x = the cell's own random value, y = distance to its centre, z = distance to the
  // nearest border, w = a second random value. A precision-safe hash (no sin of huge numbers, which bands on GPUs).
  const TCELL = `
    float tHh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec2 tHh2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
    vec4 tCells(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = i;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 r = g + tHh2(i + g) * 0.8 + 0.1 - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
      float a = sqrt(d1), b = sqrt(d2); return vec4(tHh(id), a, (b - a) * 0.5, tHh(id + 31.7)); }
`;
  const NOISE = `
    float rH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float rV(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(rH(i), rH(i+vec2(1.0,0.0)), f.x), mix(rH(i+vec2(0.0,1.0)), rH(i+vec2(1.0,1.0)), f.x), f.y); }
    float rF(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < 3; i++) { a += rV(p) * w; p = p * 2.03 + vec2(13.1, 7.7); w *= 0.5; } return a; }
  `;

  // ---- materials: everything becomes physically based; metal reads as metal
  R.toonify = function () {
    const L = look(this); const cache = new Map();
    const metal = new Set([this.fig.blade, this.fig.barrel, this.fig.kabuto, this.fig.rod, this.fig.boss].filter(Boolean));
    this.scene.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.isMeshLambertMaterial) return;
      const m = o.material, isMetal = metal.has(o); const key = m.uuid + (isMetal ? 'm' : '');
      let t = cache.get(key);
      if (!t) { t = new THREE.MeshStandardMaterial({ color: m.color, vertexColors: m.vertexColors, transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite, roughness: isMetal ? 0.45 : 0.97, metalness: isMetal ? 0.7 : 0.0 }); cache.set(key, t); }
      o.material = t;
    });
    // cloth and hide: fine weave noise breaks up the flat colours of coats and trousers
    const clothKeys = ['torso', 'hips', 'uarmL', 'uarmR', 'farmL', 'farmR', 'thighL', 'thighR', 'shinL', 'shinR', 'gb', 'gc', 'gy'];
    for (const k of clothKeys) { const mesh = this.fig[k]; if (!mesh) continue; const mat = mesh.material.clone(); mat.roughness = 0.95;
      mat.onBeforeCompile = (sh) => { sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vWP;\n' + NOISE + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { float w = rV(vWP.xz * 38.0 + vWP.y * 21.0) * 0.5 + rV(vWP.xy * 33.0) * 0.5; float grime = rF(vWP.xz * 1.7 + vWP.y * 0.9); diffuseColor.rgb *= 0.86 + 0.22 * w; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 0.72, 0.64), smoothstep(0.45, 0.8, grime) * 0.6); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.27, 0.21), clamp(0.55 - vWP.y, 0.0, 0.55) * 0.55); }'); };
      mesh.material = mat; }
    // skin: a warmer, softer face
    if (this.fig.head) { this.fig.head.material.roughness = 0.96; } for (const k of ['hand', 'foot', 'kepi', 'cap', 'jingasa', 'band']) if (this.fig[k] && this.fig[k].material.roughness !== undefined) this.fig[k].material.roughness = 0.97; // matte skin and cloth: no sun glare off faces and hats
    // the battlefield floor: churned mud, trampled grass, puddles and stones
    if (this.terrain) { const tm = this.terrain.material; tm.roughness = 0.97;
      const snowF = this.biome.snow ? 1 : -1; const gMap = this.groundMap || new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat), gExt = this.groundExt || 1; gMap.needsUpdate = true;
      tm.onBeforeCompile = (sh) => { sh.uniforms.rTime = RT.time; sh.uniforms.rSnow = { value: snowF }; sh.uniforms.gMap = { value: gMap }; sh.uniforms.gExt = { value: gExt };
        sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vWP; uniform float rSnow; uniform sampler2D gMap; uniform float gExt;\n' + NOISE + TCELL + sh.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
            { vec2 p = vWP.xz;
              float big = rF(p * 0.035), mid = rF(p * 0.21), fine = rV(p * 1.7) * 0.6 + rV(p * 0.9 + 4.0) * 0.4;
              // crisp close-up detail: hard-edged clumps of turf and grit in world space (no soft smears, no pixel blocks).
              // On steep faces the clumps are projected from the side so they don't stretch; they fade out once a clump is
              // only a few pixels wide, so nothing shimmers at range.
              vec3 wn = normalize(cross(dFdx(vWP), dFdy(vWP))); vec2 cp = abs(wn.y) > 0.7 ? p : (abs(wn.x) > abs(wn.z) ? vWP.zy : vWP.xy);
              float px = length(fwidth(cp)); float near = 1.0 - smoothstep(0.025, 0.08, px);
              vec4 cl = tCells(cp * 2.6); float edgeW = max(px * 2.6 * 1.5, 0.02); float seam = 1.0 - smoothstep(0.0, edgeW, cl.z);
              vec4 cl2 = tCells(cp * 9.0 + 17.0); float grit = smoothstep(0.62, 0.62 - max(px * 9.0 * 1.5, 0.02), cl2.y) * step(0.9, cl2.x);
              vec3 base = diffuseColor.rgb; float lum = dot(base, vec3(0.3, 0.59, 0.11));
              float snowy = smoothstep(0.7, 0.8, lum) * step(0.0, rSnow);
              // late-season northern grassland: straw-coloured dry grass, tired green, bare earth and trodden mud
              vec3 straw = vec3(0.47, 0.42, 0.29), green = vec3(0.25, 0.28, 0.16), earth = vec3(0.33, 0.28, 0.21), mud = vec3(0.2, 0.17, 0.13);
              float dryk = smoothstep(0.3, 0.75, rF(p * 0.06 + 3.0) + (fine - 0.5) * 0.25);
              vec3 grass = mix(green, straw, dryk) * (0.82 + 0.3 * rV(p * 1.3));
              grass = mix(grass, straw * 1.08, smoothstep(0.55, 0.9, rV(p * 6.0)) * 0.35);
              float churn = smoothstep(0.45, 0.72, big + (mid - 0.5) * 0.5);
              vec3 c = mix(grass, mix(earth, mud, fine), churn * 0.9);
              c *= 0.94 + 0.1 * fine;
              { float t = cl.x; vec3 cc = c * (0.93 + 0.13 * t); cc = mix(cc, mix(straw * 1.06, green * 0.9, step(0.5, fract(t * 7.0))), step(0.84, t) * 0.25 * (1.0 - churn));
                cc *= 1.0 - seam * 0.035; cc = mix(cc, mix(vec3(0.22, 0.2, 0.16), vec3(0.42, 0.4, 0.35), step(0.6, cl2.w)), grit * 0.4);
                c = mix(c, cc, near); }
              float stones = smoothstep(0.88, 0.94, rV(p * 1.9)) * (1.0 - churn); c = mix(c, vec3(0.42, 0.4, 0.37), stones * 0.6);
              // grounding: trodden bare earth round every structure (an uneven edge cut by noise), and a contact shadow at the foot
              vec4 gm = texture2D(gMap, (p + gExt) / (2.0 * gExt)); float gn = rV(p * 1.4) * 0.6 + rV(p * 4.3 + 9.0) * 0.4;
              float dirt = smoothstep(0.34, 0.5, gm.g + (gn - 0.5) * 0.5);
              vec3 trod = mix(earth, mud, 0.3 + 0.45 * fine) * (0.88 + 0.2 * gn); trod = mix(trod, vec3(0.4, 0.38, 0.34), grit * 0.5 * near);
              c = mix(c, trod, dirt * 0.9);
              // keep what the map painted on purpose: water margins, roads, rock, snow
              diffuseColor.rgb = mix(c, base, snowy);
              // on snow: trodden slush, grey-brown, round the foot of things
              diffuseColor.rgb = mix(diffuseColor.rgb, mix(earth, vec3(0.62, 0.6, 0.57), 0.45 + 0.25 * gn), dirt * snowy * 0.8);
              diffuseColor.rgb *= 1.0 - gm.r * 0.72; }`)
          .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
            { vec2 p = vWP.xz; float e = 0.06; float h0 = rF(p * 0.6); float hx = rF((p + vec2(e, 0.0)) * 0.6); float hz = rF((p + vec2(0.0, e)) * 0.6);
              vec3 bump = vec3((h0 - hx) / e, 0.0, (h0 - hz) / e) * 0.07;
              // each turf clump is a slightly tilted flat facet: a low-poly surface instead of a blurred one
              float px = length(fwidth(p)); vec4 cl = tCells(p * 2.6); vec2 tilt = (vec2(cl.x, fract(cl.x * 13.7)) - 0.5) * 0.13 * (1.0 - smoothstep(0.025, 0.08, px));
              bump += vec3(tilt.x, 0.0, tilt.y);
              normal = normalize(normal + (viewMatrix * vec4(bump, 0.0)).xyz); }`); };
      tm.needsUpdate = true; }
    this.realSetup();
  };

  R.realSetup = function () {
    const L = look(this), sc = this.scene;
    this.buildForest(); this.buildGrass();
    // HDR-ish lighting: a hazed sun and a cool overcast sky
    this.sun.color.set(L.sun); this.sun.intensity = L.sunI; this.hemi.color.set(L.hemiSky); this.hemi.groundColor.set(L.hemiGround); this.hemi.intensity = L.hemiI;
    this.sun.shadow.radius = 2; this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.05;
    // performance: plain PCF shadows from a smaller map, redrawn every other frame; render scale set by the quality level (F7)
    this.renderer.shadowMap.type = THREE.PCFShadowMap; const q = realQ(); this.sun.shadow.mapSize.set(q === 2 ? 2048 : 1536, q === 2 ? 2048 : 1536); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.renderer.shadowMap.enabled = q > 0; this.renderer.shadowMap.autoUpdate = q === 2; this.shadowTick = 0;
    this.renderer.setPixelRatio([0.7, 0.85, 1][q] * Math.min(window.devicePixelRatio || 1, 1.25)); this.resize();
    // the air itself: dust and smoke thicken with distance
    sc.fog = new THREE.FogExp2(new THREE.Color(L.haze), this.sim.rain ? 0.0105 : this.biome.snow ? 0.0085 : 0.0072); this.realFog = sc.fog; sc.background = new THREE.Color(L.hazeFar);
    // the ink-print set dressing goes: no dragon, no auspicious clouds; mountains become hazy silhouettes
    if (this.dragon) { for (const k of ['body', 'fins', 'belly']) this.dragon[k].visible = false; this.dragon.head.visible = false; this.dragon.pearl.visible = false; this.dragon = null; }
    if (this.env && this.env.group) this.env.group.traverse((o) => { if (o.isSprite) o.visible = false; if (o.isMesh && o.material && o.material.isMeshBasicMaterial) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(L.hazeFar), 0.62); } if (o.isMesh && o.material && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.col) { o.material.uniforms.col.value.set(L.hazeFar); } });
    // sky: heavy overcast with drifting cloud and a sun smothered in smoke
    this.sky.material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(L.skyTop) }, mid: { value: new THREE.Color(L.skyMid) }, low: { value: new THREE.Color(L.skyLow) }, sunCol: { value: new THREE.Color(L.sun) }, sunDir: { value: this.sunDir.clone() }, time: RT.time },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: NOISE + `uniform vec3 top, mid, low, sunCol, sunDir; uniform float time; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 c = mix(low, mid, smoothstep(-0.02, 0.18, h)); c = mix(c, top, smoothstep(0.15, 0.75, h));
          vec2 uv = d.xz / max(0.08, h + 0.12) * 1.3 + vec2(time * 0.006, time * 0.002);
          float cl = rF(uv * 1.1), cl2 = rF(uv * 3.2 + 4.0);
          float cover = smoothstep(0.38, 0.78, cl * 0.75 + cl2 * 0.35);
          c = mix(c, mix(mid * 1.08, top * 0.82, cl2), cover * smoothstep(0.0, 0.25, h) * 0.85);
          float s = max(0.0, dot(d, normalize(sunDir)));
          c += sunCol * (pow(s, 6.0) * 0.16 + pow(s, 60.0) * 0.32) * (1.0 - cover * 0.7);
          c = mix(c, low, (1.0 - smoothstep(0.0, 0.12, h)) * 0.6);
          gl_FragColor = vec4(c, 1.0); }` });
    // tracers and blade trails: in daylight a musket ball is barely seen; keep them faint so they do not bloom into streaks of light
    if (this.tracerMesh) { this.tracerMesh.material = this.tracerMesh.material.clone(); this.tracerMesh.material.transparent = true; this.tracerMesh.material.opacity = 0.42; }
    if (this.trailMesh) { this.trailMesh.material.opacity = 0.3; }
    // distant towns burning: columns of smoke on the horizon and drifting palls over the field
    this.buildSmokeColumns();
    // embers and ash in the air
    this.buildAsh();
  };

  // ---- low-poly trees in natural colour: bare branching trees, oaks, elms, pines and dead snags (a few merged meshes, instanced)
  function mergeGeo(parts) { // parts: [geometry, matrix4, color]
    let n = 0; const gs = parts.map(([g, m, c]) => { const q = g.index ? g.toNonIndexed() : g.clone(); q.applyMatrix4(m); n += q.attributes.position.count; return [q, c]; });
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    for (const [q, c] of gs) { const p = q.attributes.position.array; pos.set(p, o * 3); for (let i = 0; i < q.attributes.position.count; i++) { const v = 0.9 + ((i * 7919) % 13) / 60; col[(o + i) * 3] = c.r * v; col[(o + i) * 3 + 1] = c.g * v; col[(o + i) * 3 + 2] = c.b * v; } o += q.attributes.position.count; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }
  function treeTemplates(snow, autumn) {
    let seed = 4242; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const M = () => new THREE.Matrix4(), V = (x, y, z) => new THREE.Vector3(x, y, z), Q = new THREE.Quaternion(), up = V(0, 1, 0);
    const bark = new THREE.Color(0x4a4036), barkD = new THREE.Color(0x3a332c), grey = new THREE.Color(0x6a645c);
    const limb = (parts, a, b, r0, r1, col) => { const d = b.clone().sub(a), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, 5, 1); const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()); parts.push([g, M().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1)), col]); };
    const blob = (parts, c, s, col) => { const g = new THREE.IcosahedronGeometry(1, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + rr() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); } parts.push([g, M().compose(c, Q.setFromEuler(new THREE.Euler(rr(), rr() * 6, rr())), V(s, s * (0.75 + rr() * 0.3), s)), col]); };
    const grow = (parts, a, dir, len, r, depth, maxD, tips, col) => { const b = a.clone().add(dir.clone().multiplyScalar(len)); limb(parts, a, b, r, r * 0.68, col); if (depth >= maxD) { if (tips) tips.push(b); return; }
      const n = depth === 0 ? 3 : 2 + (rr() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) { const t = dir.clone(); const ax = V(rr() - 0.5, 0, rr() - 0.5).normalize(); t.applyAxisAngle(ax, 0.45 + rr() * 0.55); t.y = Math.max(0.15, t.y); t.normalize(); grow(parts, b, t, len * (0.62 + rr() * 0.14), r * 0.62, depth + 1, maxD, tips, col); } };
    const leafCols = snow ? [0x55574f, 0x60625a] : autumn ? [0x5a5130, 0x6b5c34, 0x4b4a2c, 0x7a6438] : [0x3b4529, 0x45502f, 0x343e25];
    const T = [];
    // 0, 1: bare deciduous trees (winter elms / dead oaks), two shapes
    for (const [h0, mx] of [[3.2, 4], [4.2, 4]]) { const parts = []; grow(parts, V(0, 0, 0), V(0.05, 1, 0).normalize(), h0, 0.32, 0, mx, null, bark); T.push(mergeGeo(parts)); }
    // 2: autumn oak, thin crown of brown-olive leaf clumps on a broad branch frame
    { const parts = [], tips = []; grow(parts, V(0, 0, 0), up.clone(), 3.0, 0.36, 0, 3, tips, bark); for (const t of tips) if (rr() < 0.8) blob(parts, t, 1.1 + rr() * 0.7, new THREE.Color(leafCols[Math.floor(rr() * leafCols.length)])); T.push(mergeGeo(parts)); }
    // 3: elm in leaf, a fuller dusty-green crown
    { const parts = [], tips = []; grow(parts, V(0, 0, 0), up.clone(), 3.4, 0.34, 0, 3, tips, bark); for (const t of tips) blob(parts, t.clone().add(V(0, 0.4, 0)), 1.5 + rr() * 0.8, new THREE.Color(leafCols[Math.floor(rr() * leafCols.length)])); blob(parts, V(0, 7.2, 0), 2.4, new THREE.Color(leafCols[0])); T.push(mergeGeo(parts)); }
    // 4: Korean pine / larch: straight stem and ragged tiers
    { const parts = []; limb(parts, V(0, 0, 0), V(0, 12, 0), 0.32, 0.08, barkD); const needle = new THREE.Color(snow ? 0x39443a : 0x26331f), needle2 = new THREE.Color(snow ? 0x8f948f : 0x2e3c25);
      for (let i = 0; i < 6; i++) { const y = 3.2 + i * 1.45, r0 = 2.6 * (1 - i / 7) + 0.4; const g = new THREE.ConeGeometry(r0, 2.4, 7, 1); const p = g.attributes.position; for (let j = 0; j < p.count; j++) { if (p.getY(j) < 0) { const k = 0.8 + rr() * 0.45; p.setX(j, p.getX(j) * k); p.setZ(j, p.getZ(j) * k); p.setY(j, p.getY(j) - rr() * 0.4); } }
        parts.push([g, M().compose(V((rr() - 0.5) * 0.3, y, (rr() - 0.5) * 0.3), Q.setFromEuler(new THREE.Euler(0, rr() * 6, 0)), V(1, 1, 1)), i % 2 ? needle : needle2]); } T.push(mergeGeo(parts)); }
    // 5: dead snag, broken top and stubs
    { const parts = []; limb(parts, V(0, 0, 0), V(0.3, 8.5, 0.1), 0.4, 0.16, grey); for (let i = 0; i < 6; i++) { const y = 2.5 + i * 1.0; const a = rr() * 6.28; limb(parts, V(0.3 * y / 8.5, y, 0), V(Math.cos(a) * (0.8 + rr()), y + 0.4 + rr() * 0.5, Math.sin(a) * (0.8 + rr())), 0.09, 0.03, grey); } T.push(mergeGeo(parts)); }
    return T;
  }
  R.buildForest = function () {
    const old = []; this.scene.traverse((o) => { if (o.isInstancedMesh && o.geometry && ((o.geometry.type === 'IcosahedronGeometry' && o.geometry.parameters.radius > 2) || (o.geometry.type === 'ConeGeometry' && o.geometry.parameters.height > 6) || (o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.height > 4) || (o.geometry.type === 'ConeGeometry' && o.geometry.parameters.height === 1.2))) old.push(o); });
    for (const o of old) o.visible = false;
    const trees = this.sim.obstacles.filter((o) => o.kind === 0); if (!trees.length) return;
    const snow = !!this.biome.snow, T = treeTemplates(snow, !!this.biome.maple);
    let seed = 99 + (this.sim.seed & 255); const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const W = snow ? [0.24, 0.22, 0.06, 0.03, 0.33, 0.12] : this.biome.maple ? [0.15, 0.12, 0.3, 0.12, 0.23, 0.08] : [0.1, 0.08, 0.17, 0.35, 0.24, 0.06];
    const pick = () => { let t = rr(), k = 0; for (; k < W.length - 1; k++) { if (t < W[k]) break; t -= W[k]; } return k; };
    const groups = T.map(() => []); trees.forEach((o) => groups[pick()].push(o));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true }); const tm = this.tmp; this.forest = [];
    groups.forEach((list, k) => { if (!list.length) return; const mesh = new THREE.InstancedMesh(T[k], mat, list.length); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      list.forEach((o, i) => { const y = terrainH(o.x, o.z), s = (o.scale || 1) * (0.85 + rr() * 0.4); tm.m.compose(tm.v.set(o.x, y - 0.1, o.z), tm.q.setFromEuler(tm.e.set((rr() - 0.5) * 0.06, rr() * 6.28, (rr() - 0.5) * 0.06)), tm.v2.set(s, s, s)); mesh.setMatrixAt(i, tm.m); });
      this.scene.add(mesh); this.forest.push(mesh); });
  };
  // ---- tussocks of dry grass and weeds, alpha-cut cards scattered over the open ground
  R.buildGrass = function () {
    if (this.biome.snow) return; const W = 256, H = 128;
    const draw = (mono) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.fillStyle = mono ? '#000' : '#6e6446'; x.fillRect(0, 0, W, H); let seed = 7; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 160; i++) { const bx = W / 2 + (rr() - 0.5) * W * 0.7, lean = (rr() - 0.5) * 30, h = H * (0.45 + rr() * 0.55); const c = rr(); const col = c < 0.55 ? `rgb(${120 + rr() * 30},${105 + rr() * 25},${65 + rr() * 15})` : c < 0.85 ? `rgb(${70 + rr() * 20},${80 + rr() * 20},${45 + rr() * 10})` : `rgb(${150 + rr() * 20},${135 + rr() * 15},90)`; x.strokeStyle = mono ? '#fff' : col; x.lineWidth = (1.6 + rr() * 1.8) * W / 128; x.beginPath(); x.moveTo(bx, H); x.quadraticCurveTo(bx + lean * 0.3, H - h * 0.6, bx + lean, H - h); x.stroke(); }
      return new THREE.CanvasTexture(cv); };
    const tex = draw(false), alphaTex = draw(true); for (const t of [tex, alphaTex]) { t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; } // no mip blur: blades stay blades at range instead of turning into solid cards
    let seed = 911; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const g = new THREE.BufferGeometry(); const P = [], N = [], U = [], I = [];
    for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2, cx = Math.cos(a) * 0.5, cz = Math.sin(a) * 0.5, b = P.length / 3; P.push(-cx, 0, -cz, cx, 0, cz, cx, 1, cz, -cx, 1, -cz); for (let j = 0; j < 4; j++) N.push(0, 1, 0); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
    const n = [800, 2200, 3500][realQ()]; const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: tex, alphaMap: alphaTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 }), n); mesh.frustumCulled = false; mesh.receiveShadow = true;
    const T = this.tmp; let k = 0;
    for (let t = 0; t < n * 3 && k < n; t++) { const px = (rr() - 0.5) * 290, pz = (rr() - 0.5) * 290; const dens = Math.sin(px * 0.05 + 2) * Math.cos(pz * 0.043) + Math.sin(px * 0.11) * 0.5; if (dens < 0.1 || SIM.waterAt(px, pz) > 0) continue; if (this.sim.boxes.some((b) => Math.abs(px - b.x) < b.hw + 1 && Math.abs(pz - b.z) < b.hd + 1)) continue;
      const s = 0.5 + rr() * 0.7; T.m.compose(T.v.set(px, terrainH(px, pz) - 0.03, pz), T.q.setFromEuler(T.e.set(0, rr() * 6.28, 0)), T.v2.set(s * 1.6, s * 0.7, s * 1.6)); mesh.setMatrixAt(k++, T.m); }
    mesh.count = k; this.scene.add(mesh); this.grass = mesh;
  };
  R.buildSmokeColumns = function () {
    const L = look(this); let seed = 31 + (this.sim.seed & 255); const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
      uniforms: { time: RT.time, col: { value: new THREE.Color(0x4a4640) }, lit: { value: new THREE.Color(L.hazeFar) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); vec3 sx = vec3(modelMatrix[0].x, 0.0, 0.0); mv.xy += position.xy * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz)); gl_Position = projectionMatrix * mv; }',
      fragmentShader: NOISE + `uniform float time; uniform vec3 col, lit; varying vec2 vUv;
        void main(){ float y = vUv.y; float w = 0.18 + y * 0.55; float x = (vUv.x - 0.5) / w + (rF(vec2(y * 2.0 - time * 0.05, 3.0)) - 0.5) * 1.4 * y;
          float body = 1.0 - smoothstep(0.35, 1.0, abs(x)); float n = rF(vec2(x * 1.4, y * 3.0 - time * 0.09)); float d = body * smoothstep(0.25, 0.7, n + body * 0.35);
          d *= smoothstep(0.0, 0.06, y) * (1.0 - smoothstep(0.65, 1.0, y));
          vec3 c = mix(col, lit, smoothstep(0.15, 1.0, y) * 0.7 + n * 0.15); if (y < 0.08) c = mix(vec3(0.95, 0.45, 0.15), c, smoothstep(0.0, 0.08, y));
          gl_FragColor = vec4(c, d * 0.82); }` });
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    this.smokeCols = [];
    for (let i = 0; i < 7; i++) { const a = rr() * Math.PI * 2, R0 = 170 + rr() * 200; const m = new THREE.Mesh(geo, mat); const h = 140 + rr() * 120; m.scale.set(h * 0.45, h, 1); m.position.set(Math.sin(a) * R0, -4, Math.cos(a) * R0); m.renderOrder = -4; m.frustumCulled = false; this.scene.add(m); this.smokeCols.push(m); }
  };

  R.buildAsh = function () {
    const N = this.lowfx ? 300 : 900, pos = new Float32Array(N * 3), rn = new Float32Array(N * 2); let seed = 77; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < N; i++) { pos[i * 3] = rr() * 70 - 35; pos[i * 3 + 1] = rr() * 22; pos[i * 3 + 2] = rr() * 70 - 35; rn[i * 2] = rr(); rn[i * 2 + 1] = rr(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('rnd', new THREE.BufferAttribute(rn, 2));
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: { time: RT.time, cam: { value: new THREE.Vector3() } },
      vertexShader: `uniform float time; uniform vec3 cam; attribute vec2 rnd; varying float vE; varying float vA;
        void main(){ vec3 p = position; p.y += time * (0.25 + rnd.x * 0.5) * (rnd.y > 0.85 ? 1.6 : -0.6); p.x += sin(time * 0.3 + rnd.x * 40.0) * 2.0 + time * 0.9; p.z += cos(time * 0.27 + rnd.y * 30.0) * 1.5;
          vec3 rel = mod(p - cam + vec3(35.0, 4.0, 35.0), vec3(70.0, 22.0, 70.0)) - vec3(35.0, 4.0, 35.0);
          vec4 mv = modelViewMatrix * vec4(cam + rel, 1.0); vE = rnd.y > 0.85 ? 1.0 : 0.0; vA = 0.5 + 0.5 * sin(time * 3.0 + rnd.x * 60.0);
          gl_PointSize = (vE > 0.5 ? 0.9 : 0.6) * (220.0 / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vE; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.1, 0.5, d); if (a < 0.03) discard;
        vec3 c = vE > 0.5 ? mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.75, 0.35), vA) * 2.2 : vec3(0.36, 0.34, 0.32); gl_FragColor = vec4(c, a * (vE > 0.5 ? 0.9 * vA : 0.55)); }` });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 11; this.scene.add(pts); this.ash = pts;
  };

  // F8 switches HDR + bloom on or off (remembered in this browser)
  document.addEventListener('keydown', (e) => { if (e.code !== 'F7') return; e.preventDefault(); const q = (realQ() + 1) % 3; try { localStorage.setItem('ming_q', String(q)); } catch (err) { }
    const t = document.getElementById('toast'); if (t) { t.textContent = 'Graphics quality: ' + ['Low (no shadows, 70% resolution)', 'Medium', 'High'][q] + ' (F7) — restarts with the next battle'; t.style.opacity = 1; t.hidden = false; } });
  document.addEventListener('keydown', (e) => { if (e.code !== 'F8') return; e.preventDefault(); const on = !realHDR(); try { localStorage.setItem('ming_hdr', on ? '1' : '0'); } catch (err) { }
    const st = window.__boshin && window.__boshin.state, r = st && st.renderer; if (r && r.post) { r.buildPost(); r.resize(); }
    const t = document.getElementById('toast'); if (t) { t.textContent = on ? 'HDR and bloom on (F8)' : 'HDR and bloom off (F8)'; t.style.opacity = 1; t.hidden = false; } });
  // no ink-print dragon in the realism edition
  R.updateDragon = function () { };

  // ---- the camera: HDR scene, bloom from fire and muzzle flashes, filmic tone map and grade
  R.buildPost = function () {
    const b = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const gl2 = this.renderer.capabilities.isWebGL2 && realHDR();
    const rt = new THREE.WebGLRenderTarget(b.x, b.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: gl2 ? THREE.HalfFloatType : THREE.UnsignedByteType });
    rt.depthTexture = new THREE.DepthTexture(b.x, b.y); rt.depthTexture.type = THREE.UnsignedIntType;
    const L = look(this);
    const mat = new THREE.ShaderMaterial({
      uniforms: { tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, res: { value: new THREE.Vector2(b.x, b.y) }, near: { value: 0.05 }, far: { value: 700 }, time: RT.time, exposure: { value: L.exposure }, haze: { value: new THREE.Color(L.haze) }, hdr: { value: gl2 ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tCol, tDep; uniform vec2 res; uniform float near, far, time, exposure, hdr; uniform vec3 haze; varying vec2 vUv;
        float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float lin(vec2 uv){ float d = texture2D(tDep, uv).x; return (near * far) / (far - d * (far - near)); }
        vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
        // FXAA: the scene is drawn into a texture with no multisampling, so long straight edges (walls, boards, poles)
        // would stair-step; this smooths them along their own direction
        vec3 fxaa(vec2 uv){ vec2 px = 1.0 / res; vec3 L = vec3(0.299, 0.587, 0.114);
          vec3 cM = texture2D(tCol, uv).rgb; float lM = dot(min(cM, 1.0), L);
          float lNW = dot(min(texture2D(tCol, uv + vec2(-1.0, -1.0) * px).rgb, 1.0), L), lNE = dot(min(texture2D(tCol, uv + vec2(1.0, -1.0) * px).rgb, 1.0), L);
          float lSW = dot(min(texture2D(tCol, uv + vec2(-1.0, 1.0) * px).rgb, 1.0), L), lSE = dot(min(texture2D(tCol, uv + vec2(1.0, 1.0) * px).rgb, 1.0), L);
          float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
          if (lMax - lMin < max(0.04, lMax * 0.1)) return cM;
          vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
          float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125); float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
          dir = clamp(dir * rcp, -8.0, 8.0) * px;
          vec3 A = 0.5 * (texture2D(tCol, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tCol, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
          vec3 B = A * 0.5 + 0.25 * (texture2D(tCol, uv - dir * 0.5).rgb + texture2D(tCol, uv + dir * 0.5).rgb);
          float lB = dot(min(B, 1.0), L); return (lB < lMin || lB > lMax) ? A : B; }
        void main(){
          vec2 q = vUv - 0.5; float r2 = dot(q, q);
          // a little lens: chromatic fringe toward the corners
          vec2 ca = q * r2 * 0.012; vec3 c0 = texture2D(tCol, vUv).rgb; vec3 c = fxaa(vUv); c.r += texture2D(tCol, vUv + ca).r - c0.r; c.b += texture2D(tCol, vUv - ca).b - c0.b;
          // bloom from fire, flashes and the sun through smoke (cheap 12-tap gather of bright light)
          vec3 bl = vec3(0.0); vec2 px = 1.0 / res;
          for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996; float rr = (3.0 + float(i) * 2.2); vec3 s = texture2D(tCol, vUv + vec2(cos(a), sin(a)) * rr * px * 1.6).rgb; bl += max(s - vec3(0.9), vec3(0.0)); }
          c += bl / 12.0 * 1.6 * hdr;
          // aerial perspective already comes from fog; add a faint dust veil that rises toward the horizon
          float d = lin(vUv); float veil = (1.0 - exp(-d * 0.0035)) * 0.25; c = mix(c, haze * 1.05, veil);
          // exposure and filmic curve
          c = aces(c * exposure * (hdr > 0.5 ? 1.0 : 1.15));
          // grade: muted, cold shadows, warm dusty highlights, a touch of bleach bypass
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, 0.68);
          c = mix(c * vec3(0.93, 0.98, 1.04), c * vec3(1.05, 1.0, 0.9), smoothstep(0.15, 0.75, l));
          vec3 bleach = mix(c, vec3(l) * 1.05, 0.18); c = mix(c, bleach * (0.95 + l * 0.12), 0.5);
          c = (c - 0.5) * 1.08 + 0.5;
          // film: grain that moves every frame, and a heavy lens vignette
          float g = h1(vUv * res + fract(time * 24.0) * 91.7) - 0.5; c += g * 0.045 * (1.0 - l * 0.5);
          c *= mix(0.62, 1.0, smoothstep(0.62, 0.18, length(q * vec2(1.15, 1.25))));
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
      depthTest: false, depthWrite: false });
    const scene = new THREE.Scene(); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
    this.post = { rt, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  };
  const present0 = R.present;
  R.present = function (cam) {
    RT.time.value = this.time || 0;
    if (this.renderer.shadowMap.enabled && !this.renderer.shadowMap.autoUpdate) { this.shadowTick = (this.shadowTick || 0) + 1; if (this.shadowTick % 2 === 0) this.renderer.shadowMap.needsUpdate = true; }
    if (this.ash) this.ash.material.uniforms.cam.value.copy(this.camera.position);
    // fog breathes: thicker in the low command view, thinner in first person so you can see your enemy
    if (this.realFog) { const fp = this.lastMode === 'fp'; const base = this.sim.rain ? 0.0105 : this.biome.snow ? 0.0085 : 0.0072; const want = base * (fp ? 1.0 : 0.62); this.realFog.density += (want - this.realFog.density) * 0.05; }
    return present0.call(this, cam);
  };
})();
