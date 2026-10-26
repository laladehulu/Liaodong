// ============================================================================
// 畫 · Stylized edition: the realism edition's game (same sim flags, same gear, same combat) drawn with a clean,
// painted look instead of the film look. Loaded after realism.js; only active when window.MING_STYLE is set
// (that build also sets MING_REAL and MING_XCOMBAT, so every behaviour is the realism one).
// Flat toon bands with crisp shadow shapes, a thin ink outline, a small harmonious palette per biome, cel clouds,
// low-poly tufts and smoke puffs. No blurry or stretched textures: colour comes from flat tones and tiny crisp marks.
// ============================================================================
(function () {
  if (typeof window === 'undefined' || !window.MING_STYLE || !window.MING_REAL || typeof RENDER === 'undefined') return;
  const R = RENDER.Renderer.prototype; const HALF = 150; const terrainH = SIM.terrainH;
  const ST = { time: { value: 0 } };
  const styQ = () => { try { const v = localStorage.getItem('ming_q'); return v === null ? 1 : Math.max(0, Math.min(2, +v)); } catch (e) { return 1; } };
  // palettes: sky (top, horizon), light (sun, hemisphere sky/ground), ground tones (three grass bands + earth), foliage tint, fog
  const DAY = { top: 0x6f9cc6, hor: 0xe9dcbf, cloud: 0xfaf4e6, cloudSh: 0xc3c8cf, sun: 0xfff0d2, sunI: 1.25, hemiS: 0xc6d6e4, hemiG: 0x7a6a4c, hemiI: 0.85,
    g: [0x7f8f45, 0x96a050, 0xb3ab5c], earth: 0x9a7a52, fol: 1.25, fog: 0xd9d6c4, ink: 0x2a2420, mtn: 0x8ea3b4, exp: 1.0 };
  const WIN = { top: 0x7f9fbf, hor: 0xe6ecf0, cloud: 0xffffff, cloudSh: 0xc9d3de, sun: 0xfff6e6, sunI: 1.05, hemiS: 0xd2e0ee, hemiG: 0x8c94a0, hemiI: 0.95,
    g: [0xdfe7ee, 0xeef3f6, 0xffffff], earth: 0x8c8278, fol: 1.15, fog: 0xdfe6ec, ink: 0x2b2f3a, mtn: 0xa9b8c8, exp: 1.0 };
  const STORM = { top: 0x56646f, hor: 0xa8adad, cloud: 0x9aa1a6, cloudSh: 0x6d767e, sun: 0xdfe6ee, sunI: 0.8, hemiS: 0xaab4bd, hemiG: 0x55503f, hemiI: 1.0,
    g: [0x66734a, 0x76804f, 0x8a8a58], earth: 0x6e5a40, fol: 1.1, fog: 0x9da3a4, ink: 0x1e2226, mtn: 0x6f7b85, exp: 1.05 };
  const NITE = { top: 0x0d1428, hor: 0x2c3a5c, cloud: 0x3a4a6c, cloudSh: 0x1e2842, sun: 0x9fb4e6, sunI: 0.42, hemiS: 0x40507a, hemiG: 0x141418, hemiI: 0.55,
    g: [0x2c3a34, 0x34443a, 0x3e4c40], earth: 0x3a3226, fol: 1.0, fog: 0x1c2640, ink: 0x06080e, mtn: 0x26324e, exp: 1.08 };
  const look = (r) => r.biome.night ? NITE : r.sim.rain ? STORM : r.biome.snow ? WIN : DAY;
  const C = (h) => new THREE.Color(h);
  const NOISE = `
    float sH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float sV(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(sH(i), sH(i+vec2(1.0,0.0)), f.x), mix(sH(i+vec2(0.0,1.0)), sH(i+vec2(1.0,1.0)), f.x), f.y); }
    float sF(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < 3; i++) { a += sV(p) * w; p = p * 2.03 + vec2(13.1, 7.7); w *= 0.5; } return a; }
  `;
  // three light bands: shade, half, lit. Crisp steps, no gradient smear.
  const grad = () => { const g = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 178, 178, 178, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); g.minFilter = THREE.NearestFilter; g.magFilter = THREE.NearestFilter; g.generateMipmaps = false; g.needsUpdate = true; return g; };
  const punch = (col, k) => { const h = {}; col.getHSL(h); col.setHSL(h.h, Math.min(1, h.s * k), h.l); return col; };

  R.toonify = function () {
    const L = look(this), g = grad(); this.styGrad = g; const cache = new Map();
    const metal = new Set([this.fig.blade, this.fig.barrel, this.fig.kabuto, this.fig.rod, this.fig.boss].filter(Boolean));
    this.scene.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.isMeshLambertMaterial) return;
      const m = o.material, isMetal = metal.has(o); const key = m.uuid + (isMetal ? 'm' : '');
      let t = cache.get(key);
      if (!t) { const col = punch(m.color.clone(), 1.18); if (isMetal) col.lerp(C(0xdfe4ea), 0.35);
        t = new THREE.MeshToonMaterial({ color: col, vertexColors: m.vertexColors, transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite, gradientMap: g }); cache.set(key, t); cache.set(m, t); }
      o.material = t;
    });
    this.sleeveMat = cache.get(this.sleeveMat) || this.sleeveMat;
    // the ground: big flat patches in three grass tones (hard edges), and tiny crisp marks up close only
    if (this.terrain) { const old = this.terrain.material; const tm = new THREE.MeshToonMaterial({ vertexColors: old.vertexColors, color: old.color ? old.color.clone() : C(0xffffff), gradientMap: g }); this.terrain.material = tm;
      const snowF = this.biome.snow ? 1 : -1;
      tm.onBeforeCompile = (sh) => { sh.uniforms.sSnow = { value: snowF }; sh.uniforms.g0 = { value: C(L.g[0]) }; sh.uniforms.g1 = { value: C(L.g[1]) }; sh.uniforms.g2 = { value: C(L.g[2]) }; sh.uniforms.gE = { value: C(L.earth) };
        sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vWP; uniform float sSnow; uniform vec3 g0, g1, g2, gE;\n' + NOISE + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          { vec2 p = vWP.xz; vec3 base = diffuseColor.rgb; float lum = dot(base, vec3(0.3, 0.59, 0.11));
            float v = sF(p * 0.035) + (sV(p * 0.21) - 0.5) * 0.18;
            vec3 band = v < 0.42 ? g0 : v < 0.56 ? g1 : g2;
            // paths and bare ground the map painted (brown, not green) keep their own colour in flat tones
            float bare = smoothstep(0.02, 0.09, base.r - base.g * 0.98);
            float snowy = smoothstep(0.7, 0.8, lum) * step(0.0, sSnow);
            vec3 c = mix(band, mix(gE, base, 0.5) * (v < 0.5 ? 0.94 : 1.04), bare);
            // tiny marks: flowers/stones on a 0.6 m grid, drawn only where a cell is several pixels wide (no shimmer)
            vec2 cell = floor(p * 1.6); float pick = sH(cell); vec2 f = fract(p * 1.6) - 0.5;
            float px = length(fwidth(p * 1.6)); float near = 1.0 - smoothstep(0.08, 0.2, px);
            float dotm = step(0.965, pick) * step(length(f), 0.14) * near * (1.0 - bare);
            c = mix(c, pick > 0.985 ? vec3(0.93, 0.88, 0.7) : c * 1.22, dotm);
            diffuseColor.rgb = mix(c, base, snowy); }`); };
      tm.needsUpdate = true; }
    this.styleSetup();
  };

  R.styleSetup = function () {
    const L = look(this), sc = this.scene, q = styQ();
    this.buildForest();
    if (this.forest) { const fm = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: this.styGrad });
      fm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, ${L.fol.toFixed(2)}) * 1.12; }`); };
      for (const m of this.forest) m.material = fm; }
    this.buildTufts();
    this.sun.color.set(L.sun); this.sun.intensity = L.sunI; this.hemi.color.set(L.hemiS); this.hemi.groundColor.set(L.hemiG); this.hemi.intensity = L.hemiI;
    // crisp shadow shapes: plain PCF, small kernel; redrawn every other frame
    this.sun.shadow.radius = 1; this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.05;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; this.sun.shadow.mapSize.set(q === 2 ? 2048 : 1536, q === 2 ? 2048 : 1536); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.renderer.shadowMap.enabled = q > 0; this.renderer.shadowMap.autoUpdate = q === 2; this.shadowTick = 0;
    this.renderer.setPixelRatio([0.7, 0.85, 1][q] * Math.min(window.devicePixelRatio || 1, 1.25)); this.resize();
    // restrained fog: linear, far away, the horizon colour (render.js eases near/far by view mode from fogBase)
    const fogC = C(L.fog); sc.fog = new THREE.Fog(fogC, 70, 330); this.fogBase = [this.biome.night ? 30 : 70, this.biome.night ? 170 : this.sim.rain ? 230 : 330]; this.realFog = null; sc.background = C(L.hor);
    if (this.dragon) { for (const k of ['body', 'fins', 'belly']) this.dragon[k].visible = false; this.dragon.head.visible = false; this.dragon.pearl.visible = false; this.dragon = null; }
    // mountains: flat layered silhouettes in the palette
    if (this.env && this.env.group) this.env.group.traverse((o) => { if (o.isSprite) o.visible = false; if (o.isMesh && o.material && o.material.isMeshBasicMaterial) { o.material = o.material.clone(); const l = o.material.color.getHSL({}).l; o.material.color.copy(C(L.mtn)).lerp(C(L.hor), Math.min(0.75, 0.25 + l * 0.5)); } if (o.isMesh && o.material && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.col) { o.material.uniforms.col.value.set(L.mtn); } });
    // water in two clean tones and foam lines
    if (this.waterMats) for (const m of this.waterMats) { const U = m.uniforms; if (!U.deep) continue; const snow = this.biome.snow; U.deep.value.set(this.biome.night ? 0x1a2a44 : snow ? 0x6f8ea8 : 0x3d7aa0); U.light.value.set(this.biome.night ? 0x2e4466 : snow ? 0xb9d0de : 0x76b9c8); U.foam.value.set(snow ? 0xffffff : 0xf6f1e2); }
    // sky: a smooth two-colour gradient, cel clouds with hard edges and a lit/shaded side, a crisp sun disc
    this.sky.material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: C(L.top) }, hor: { value: C(L.hor) }, cl: { value: C(L.cloud) }, cs: { value: C(L.cloudSh) }, sunCol: { value: C(L.sun) }, sunDir: { value: this.sunDir.clone() }, time: ST.time, night: { value: this.biome.night ? 1 : 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: NOISE + `uniform vec3 top, hor, cl, cs, sunCol, sunDir; uniform float time, night; varying vec3 vP;
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 c = mix(hor, top, smoothstep(-0.02, 0.55, h));
          vec2 uv = d.xz / max(0.1, h + 0.15) * 0.9 + vec2(time * 0.004, time * 0.0015);
          float n = sF(uv * 0.9) + sV(uv * 3.0) * 0.12; float n2 = sF(uv * 0.9 + vec2(0.05, -0.04));
          float aw = fwidth(n) * 1.5 + 0.004; float cloud = smoothstep(0.56 - aw, 0.56 + aw, n) * smoothstep(0.0, 0.06, h);
          float shade = smoothstep(0.62 - aw, 0.62 + aw, n2);
          c = mix(c, mix(cs, cl, shade), cloud * (night > 0.5 ? 0.6 : 0.95));
          float s = dot(d, normalize(sunDir)); float disc = smoothstep(0.9975, 0.998, s);
          c = mix(c, sunCol * (night > 0.5 ? 1.0 : 1.08), disc * (1.0 - cloud * 0.8));
          c += sunCol * pow(max(s, 0.0), 24.0) * 0.12 * (1.0 - night);
          if (night > 0.5) { vec2 sp = floor(d.xz / max(0.2, h + 0.3) * 260.0); float st = step(0.996, sH(sp)) * smoothstep(0.1, 0.4, h) * (1.0 - cloud); c += vec3(0.85, 0.88, 1.0) * st * 0.8; }
          gl_FragColor = vec4(c, 1.0); }` });
    if (this.tracerMesh) { this.tracerMesh.material = this.tracerMesh.material.clone(); this.tracerMesh.material.transparent = true; this.tracerMesh.material.opacity = 0.6; }
    if (this.trailMesh) { this.trailMesh.material.opacity = 0.45; }
    this.buildPuffColumns();
  };

  // ---- low-poly tufts of grass instead of textured cards: 4-sided cones in a few flat tones
  R.buildTufts = function () {
    if (this.biome.snow) return; const L = look(this);
    let seed = 911; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const g = new THREE.ConeGeometry(0.22, 0.55, 4, 1); g.translate(0, 0.26, 0);
    const n = [500, 1400, 2400][styQ()]; const mesh = new THREE.InstancedMesh(g, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: this.styGrad }), n); mesh.frustumCulled = false; mesh.receiveShadow = true;
    const T = this.tmp, cols = [C(L.g[0]).multiplyScalar(0.82), C(L.g[1]).multiplyScalar(0.88), C(L.g[2]).multiplyScalar(0.9), C(L.earth).lerp(C(L.g[2]), 0.5)]; let k = 0;
    for (let t = 0; t < n * 3 && k < n; t++) { const px = (rr() - 0.5) * 290, pz = (rr() - 0.5) * 290; const dens = Math.sin(px * 0.05 + 2) * Math.cos(pz * 0.043) + Math.sin(px * 0.11) * 0.5; if (dens < 0.1 || SIM.waterAt(px, pz) > 0) continue; if (this.sim.boxes.some((b) => Math.abs(px - b.x) < b.hw + 1 && Math.abs(pz - b.z) < b.hd + 1)) continue;
      const s = 0.6 + rr() * 0.8; T.m.compose(T.v.set(px, terrainH(px, pz) - 0.04, pz), T.q.setFromEuler(T.e.set((rr() - 0.5) * 0.3, rr() * 6.28, (rr() - 0.5) * 0.3)), T.v2.set(s, s * (0.7 + rr() * 0.7), s)); mesh.setMatrixAt(k, T.m); mesh.setColorAt(k, cols[Math.floor(rr() * cols.length)]); k++; }
    mesh.count = k; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; this.scene.add(mesh); this.tufts = mesh;
  };
  // ---- distant burning: stacked low-poly smoke puffs that drift upward (flat toon grey, no soft texture)
  R.buildPuffColumns = function () {
    let seed = 31 + (this.sim.seed & 255); const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const N = 6, P = 9, g = new THREE.IcosahedronGeometry(1, 0); const night = !!this.biome.night;
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: this.styGrad, fog: false }), N * P); mesh.frustumCulled = false;
    this.puffs = []; let k = 0;
    for (let i = 0; i < N; i++) { const a = rr() * Math.PI * 2, R0 = 190 + rr() * 150, x = Math.sin(a) * R0, z = Math.cos(a) * R0, lean = (rr() - 0.5) * 0.5;
      for (let j = 0; j < P; j++) { const f = j / P; const c = C(night ? 0x2a3046 : 0x8c8a86).lerp(C(night ? 0x4a5270 : 0xd8d4cc), f); if (j === 0) c.set(night ? 0x9a4a2a : 0x6a5c50); mesh.setColorAt(k, c); this.puffs.push({ k, x, z, lean, f, s: 9 + f * 26 + rr() * 6, ph: rr() * 6.28 }); k++; } }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; this.scene.add(mesh); this.puffMesh = mesh; this.updatePuffs(0);
  };
  R.updatePuffs = function (t) {
    if (!this.puffMesh) return; const T = this.tmp, P = 9;
    for (const p of this.puffs) { const ff = (p.f + t * 0.004) % 1; const y = 4 + ff * P * 15; const s = (9 + ff * 30) * (ff > 0.85 ? (1 - ff) / 0.15 : 1);
      T.m.compose(T.v.set(p.x + p.lean * y + Math.sin(p.ph + y * 0.05) * 4, y, p.z), T.q.setFromEuler(T.e.set(p.ph, p.ph + t * 0.02, 0)), T.v2.set(s, s * 0.8, s)); this.puffMesh.setMatrixAt(p.k, T.m); }
    this.puffMesh.instanceMatrix.needsUpdate = true;
  };

  // ---- the camera: a thin ink outline on silhouettes and creases, a gentle clean grade, a soft vignette
  R.buildPost = function () {
    const b = this.renderer.getDrawingBufferSize(new THREE.Vector2()); const L = look(this);
    const rt = new THREE.WebGLRenderTarget(b.x, b.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    rt.depthTexture = new THREE.DepthTexture(b.x, b.y); rt.depthTexture.type = THREE.UnsignedIntType;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, res: { value: new THREE.Vector2(b.x, b.y) }, near: { value: 0.05 }, far: { value: 700 }, ink: { value: C(L.ink) }, exposure: { value: L.exp } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tCol, tDep; uniform vec2 res; uniform float near, far, exposure; uniform vec3 ink; varying vec2 vUv;
        float lin(vec2 uv){ float d = texture2D(tDep, uv).x; return (near * far) / (far - d * (far - near)); }
        void main(){
          vec2 px = 1.0 / res; vec3 c = texture2D(tCol, vUv).rgb;
          float d0 = lin(vUv), dl = lin(vUv - vec2(px.x, 0.0)), dr = lin(vUv + vec2(px.x, 0.0)), du = lin(vUv + vec2(0.0, px.y)), dd = lin(vUv - vec2(0.0, px.y));
          float e = (abs(dl + dr - 2.0 * d0) + abs(du + dd - 2.0 * d0)) / max(d0, 0.1);
          float line = smoothstep(0.02, 0.06, e) * (1.0 - smoothstep(30.0, 140.0, d0));
          if (d0 > far * 0.98) line = 0.0;
          vec3 cl = texture2D(tCol, vUv - vec2(px.x, 0.0)).rgb, cr = texture2D(tCol, vUv + vec2(px.x, 0.0)).rgb, cu = texture2D(tCol, vUv + vec2(0.0, px.y)).rgb, cd = texture2D(tCol, vUv - vec2(0.0, px.y)).rgb;
          line *= smoothstep(0.04, 0.14, length(cl - cr) + length(cu - cd));
          // edge smoothing: blend toward the neighbours across strong colour steps (cheap AA for the flat bands)
          vec3 avg = (cl + cr + cu + cd) * 0.25; float ce = length(cl - cr) + length(cu - cd); c = mix(c, avg, smoothstep(0.15, 0.5, ce) * 0.45);
          c = mix(c, ink * 0.6 + c * 0.4, line * 0.75);
          c *= exposure;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, 1.08);
          vec2 q = vUv - 0.5; c *= mix(0.86, 1.0, smoothstep(0.75, 0.25, length(q * vec2(1.1, 1.2))));
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
      depthTest: false, depthWrite: false });
    const scene = new THREE.Scene(); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
    this.post = { rt, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  };
  const present0 = R.present;
  R.present = function (cam) { ST.time.value = this.time || 0; this.updatePuffs(this.time || 0); return present0.call(this, cam); };
})();
