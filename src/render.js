// ===== Renderer: three.js scene, instanced figures, ragdolls, effects =====
const RENDER = (() => {
'use strict';
const S = SIM;
const { ST_IDLE, ST_WINDUP, ST_RELEASE, ST_RECOVER, ST_STUN, ST_RELOAD, ST_AIM, ST_SWAP, ST_KICK, DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT, RELEASE_T, KICK_T, SWAP_T, DT, HALF } = S;
const terrainH = S.terrainH;
const MAXRAG = 110, PI = Math.PI, HPI = Math.PI / 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const wrapA = (a) => a - PI * 2 * Math.floor((a + PI) / (PI * 2));
const lerpA = (a, b, t) => a + wrapA(b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

const TEAM_COL = [0xb0263a, 0x2f55b8];
const PAL = {
  skin: 0xe2c19c, steel: 0xcfd6dc, wood: 0x4a2e18, yari: 0x8b6b4a, iron: 0x3b3d46, jingasa: 0x2a2a2a, kepi: 0x203068, cap: 0x1f1f26, band: 0xf2f2ee,
  hakama: 0xd9d3c3, trouser0: 0x2d2d36, trouser1: 0x2a3348, ashLeg: 0x5a4a3a, gold: 0xc9a24a,
};
// ===== Uniforms: base cloth colours and per-unit gear built from low-poly parts =====
// ===== Uniforms: Ming crimson against the colours of the Eight Banners =====
const BANNER = [0xd8b03c, 0xe8e4da, 0x2f4fa8, 0xc0902a];
function bannerOf(u) { return BANNER[((u.squad >= 0 ? u.squad : u.id) * 7 + 3) % 4]; }
function torsoColor(u) {
  if (u.look && u.look.body) return u.look.body;
  const t = u.team;
  if (t === 1) {
    switch (u.type) {
      case 'hero': return 0xc9a03a; case 'byakkotai': case 'ronin': return [0x6a5a3a, 0x5a4a32, 0x4a5058, 0x6a4a3a][u.id % 4];
      case 'archer': return 0x2c3f6a; case 'shinsengumi': return 0xd8b03c; default: return bannerOf(u);
    }
  }
  switch (u.type) {
    case 'hero': return 0x8a1a1e; case 'samurai': case 'yuanyang': return 0xc4381e; case 'cavalry': return 0x9a2222; case 'ashigaru': return 0xc4381e;
    case 'rifle_imp': return 0xc4381e; case 'rifle_spencer': return 0xa83a24; case 'jinshotai': return 0x2a3a5a; case 'jigen': return 0x5a2226;
    case 'horokutai': return 0x7a3422; case 'ronin': return [0x5a4a3a, 0x4a4a52, 0x6a5a48, 0x3e3a36][u.id % 4];
    default: return 0x9a2a2a;
  }
}
function legColor(u) {
  if (u.look && u.look.legs) return u.look.legs;
  if (u.team === 1) return u.type === 'byakkotai' || u.type === 'ronin' ? 0x3a3228 : 0x26262c;
  switch (u.type) { case 'ronin': return 0x3e3832; case 'jinshotai': return 0x24283a; default: return 0x262834; }
}
// part: m = mesh kind ('b' box, 'c' cone, 'y' cylinder); f = frame (c chest, h head, p pelvis, sl/sr shoulders, or seg:[jointA, jointB, t0, t1]);
// o = offset in the frame's axes, s = size, r = local euler, k = colour
const GJ = { hipL: 0, kneeL: 3, footL: 6, hipR: 9, kneeR: 12, footR: 15, shL: 18, elL: 21, haL: 24, shR: 27, elR: 30, haR: 33 };
const GEAR_K = { b: 40, c: 4, y: 5 };
const uhash = (id, k) => (((id + 1) * 2654435761 + (k || 0) * 40503) >>> 0) % 1000 / 1000;
const GEAR_CACHE = new Map();
// hit reaction envelope: snaps in over 70 ms (ease-out), holds while he reels, eases back out over 0.25 s after the stun ends
const hrEnv = (u, alpha) => { if (u.hrA === undefined) return 0; const t = u.hrA + alpha * DT, D = u.hrD || 0.3; if (t >= D + 0.25) return 0;
  if (t < 0.07) { const q = t / 0.07; return 1 - (1 - q) * (1 - q); } if (t < D) return 1 - 0.15 * (t - 0.07) / Math.max(0.01, D - 0.07); const q = (t - D) / 0.25; return 0.85 * (1 - q * q * (3 - 2 * q)); };
// pose offsets per kind: lean (fwd +), twist, roll, crouch, stance, lunge, head pitch (back -), weapon/hands offset y, z (chest-local)
const HR_POSE = [
  [-0.18, 0, 0, 0, 0, -0.04, -0.6, 0.04, -0.05],   // 0 head snapped back
  [-0.05, 0.6, 0.18, 0.04, 0, 0, -0.15, 0.02, -0.08],  // 1 twisted aside (signed by the side he was hit from)
  [0.6, 0, 0, 0.14, 0.4, -0.12, 0.35, -0.12, -0.1],  // 2 doubled over the blow
  [-0.45, 0.12, 0.08, 0, 0, -0.2, -0.3, 0.3, -0.2],  // 3 stagger back, arms flung up
  [0.35, 0.1, 0.12, 0.42, 1, -0.05, 0.2, -0.2, 0.02],   // 4 buckled to one knee
  [-0.1, 0.12, 0, 0.03, 0.3, -0.06, -0.08, 0.1, -0.2] // 5 guard driven back
];
const GEAR_HOOK = { fn: null }; // an edition may supply its own uniforms (the realism edition does)
// ---- the named men of the story file: each his own face and headgear (u.look is set by the story module; render-only) ----
function lookGear(L, b, c, y, hatOn, part) {
  const ink = 0x1a1410, hair = L.hair || 0x201a16, bh = L.grey ? 0x8a8680 : hair, fz = 0.146, red = 0xc8281e, gold = 0xd8b03c;
  if (part === 'head') hatOn(() => { switch (L.hat) {
    case 'chief': y('h', [0, 0.13, 0], [0.32, 0.13, 0.32], 0x4a4e54); b('h', [0, 0.2, 0], [0.27, 0.07, 0.27], 0x4a4e54); y('h', [0, 0.07, 0], [0.37, 0.025, 0.37], gold); c('h', [0, 0.29, 0], [0.05, 0.12, 0.05], gold); b('h', [0, 0.37, 0], [0.11, 0.08, 0.11], red); b('h', [0, 0.32, 0], [0.15, 0.05, 0.15], red); b('h', [0, -0.04, -0.14], [0.3, 0.15, 0.04], 0x5a2a24); break;
    case 'wrap': { const w = L.wrap || 0x2a3a5a; b('h', [0, 0.1, 0], [0.31, 0.12, 0.31], w); b('h', [0, 0.17, -0.02], [0.21, 0.08, 0.21], w); b('h', [0.03, 0.04, -0.19], [0.05, 0.16, 0.03], w, [0.3, 0, 0.2]); b('h', [-0.03, 0.04, -0.19], [0.05, 0.14, 0.03], w, [0.3, 0, -0.25]); break; }
    case 'straw': c('h', [0, 0.15, 0], [0.62, 0.16, 0.62], 0xc2a666); b('h', [0, 0.235, 0], [0.05, 0.04, 0.05], 0x8a6a30); break;
    case 'band': b('h', [0, 0.13, -0.01], [0.27, 0.06, 0.27], hair); b('h', [0, 0.18, -0.02], [0.09, 0.08, 0.09], hair); b('h', [0, 0.065, 0], [0.295, 0.05, 0.295], L.bandCol || red); b('h', [0.04, 0.04, -0.17], [0.035, 0.035, 0.16], L.bandCol || red, [0.7, 0, 0.2]); break;
    case 'scholar': b('h', [0, 0.15, 0], [0.29, 0.17, 0.29], 0x18161a); b('h', [0, 0.25, 0], [0.31, 0.03, 0.31], 0x18161a); b('h', [0, 0.1, -0.16], [0.13, 0.13, 0.02], 0x18161a); break;
    case 'felt': y('h', [0, 0.12, 0], [0.33, 0.13, 0.33], 0x6a4a2c); y('h', [0, 0.06, 0], [0.38, 0.03, 0.38], 0x4a3220); b('h', [0, 0.2, 0], [0.06, 0.05, 0.06], red); break;
    case 'cookcap': b('h', [0, 0.12, 0], [0.3, 0.12, 0.3], 0xe8e2d0); b('h', [0, 0.19, 0], [0.25, 0.07, 0.25], 0xe8e2d0); break;
    default: { const tall = L.hat === 'rattanTall' ? 1.35 : 1; c('h', [0, 0.17 * tall, 0], [0.4, 0.2 * tall, 0.4], 0xb8964e); y('h', [0, 0.07, 0], [0.4, 0.045, 0.4], 0x8a6a30); b('h', [0, 0.27 * tall + 0.03, 0], [0.07, L.plume ? 0.12 : 0.05, 0.07], L.plume || red); if (L.band) y('h', [0, 0.11, 0], [0.37, 0.035, 0.37], L.band); }
  } });
  if (part === 'face') {
    const ew = L.young ? 0.04 : 0.045, eh = L.young ? 0.028 : 0.02;
    b('h', [0.058, 0.0, fz], [ew, eh, 0.012], ink); if (L.patch) { b('h', [-0.058, 0.004, fz + 0.004], [0.075, 0.065, 0.016], 0x111111); b('h', [0, 0.03, fz - 0.004], [0.3, 0.016, 0.012], 0x111111, [0, 0, -0.32]); } else b('h', [-0.058, 0.0, fz], [ew, eh, 0.012], ink);
    const BR = { thick: [0.08, 0.028, 0.06, 0.035], thin: [0.06, 0.012, 0.1, 0.04], knit: [0.075, 0.022, 0.32, 0.03], high: [0.065, 0.016, -0.18, 0.055], sad: [0.065, 0.018, -0.3, 0.035] }[L.brows || 'thin'] || [0.065, 0.016, 0.12, 0.035];
    b('h', [0.06, BR[3], fz], [BR[0], BR[1], 0.014], bh, [0, 0, -BR[2]]); b('h', [-0.06, BR[3], fz], [BR[0], BR[1], 0.014], bh, [0, 0, BR[2]]);
    b('h', [0, -0.045, fz + 0.006], [L.bigNose ? 0.045 : 0.03, L.bigNose ? 0.06 : 0.05, 0.022], 0xd2aa84);
    b('h', [0, -0.085, fz], [L.grin ? 0.09 : 0.06, L.grin ? 0.018 : 0.012, 0.012], L.grin ? 0x5a2a24 : 0x6a3a30);
    if (L.beard === 'mous' || L.beard === 'longmous') b('h', [0, -0.066, fz + 0.004], [0.11, 0.022, 0.014], bh);
    if (L.beard === 'longmous') { b('h', [0.055, -0.1, fz + 0.002], [0.02, 0.08, 0.014], bh); b('h', [-0.055, -0.1, fz + 0.002], [0.02, 0.08, 0.014], bh); }
    if (L.beard === 'goatee' || L.beard === 'longmous') b('h', [0, -0.135, fz - 0.005], [0.05, L.longBeard ? 0.14 : 0.07, 0.02], bh);
    if (L.beard === 'full') { b('h', [0, -0.12, fz - 0.01], [0.24, 0.07, 0.03], bh); b('h', [0.12, -0.07, 0.06], [0.03, 0.1, 0.12], bh); b('h', [-0.12, -0.07, 0.06], [0.03, 0.1, 0.12], bh); }
    if (L.beard === 'stubble') b('h', [0, -0.1, fz - 0.002], [0.2, 0.08, 0.006], 0x7a6a5a);
    if (L.scar) b('h', [0.085, -0.03, fz + 0.002], [0.012, 0.09, 0.008], 0x8a3a30, [0, 0, 0.5]);
    if (L.rosy) { b('h', [0.088, -0.05, fz], [0.035, 0.02, 0.006], 0xd88a7a); b('h', [-0.088, -0.05, fz], [0.035, 0.02, 0.006], 0xd88a7a); }
  }
  if (part === 'body') {
    const coat = L.coat || 0xc4381e;
    if (L.belly) b('c', [0, -0.13, 0.13], [0.42, 0.32, 0.12], coat);
    if (L.apron) { b('p', [0, -0.28, 0.175], [0.38, 0.5, 0.02], 0xe8e2d0); b('c', [0, 0.1, 0.17], [0.3, 0.03, 0.012], 0xe8e2d0); }
    if (L.bulk) { b('sl', [0.06, -0.02, 0], [0.15, 0.13, 0.31], coat); b('sr', [-0.06, -0.02, 0], [0.15, 0.13, 0.31], coat); b('c', [0, 0.06, 0], [0.56, 0.3, 0.34], coat); }
    if (L.charm) { b('c', [0.09, 0.12, 0.162], [0.05, 0.07, 0.012], gold); b('c', [0.09, 0.17, 0.16], [0.012, 0.05, 0.01], red); }
    if (L.brush) b('c', [-0.16, -0.02, 0.15], [0.03, 0.2, 0.03], 0x3a2a1a, [0, 0, 0.3]);
  }
}
function gearFor(u) {
  if (GEAR_HOOK.fn) { const g = GEAR_HOOK.fn(u); if (g) return g; }
  const vr = u.type === 'byakkotai' ? (u.id % 2) * 4 : u.id % 6; const key = u.type + ':' + (u.role || '') + ':' + u.team + ':' + vr + ':' + (u.team === 1 ? ((u.squad >= 0 ? u.squad : u.id) * 7 + 3) % 4 : 0) + (u.look ? ':L' + u.look.id : ''); let g = GEAR_CACHE.get(key); if (g) return g;
  // look.ming: men of the other side who are Ming soldiers all the same (the Dengzhou mutineers of 1632) wear Ming kit
  const imp = u.team === 0 || !!(u.look && u.look.ming), team = imp ? 0xb3262f : 0x2f55b8, P = [];
  let HAT = false; const b = (f, o, s, k, r) => P.push({ m: 'b', f, o, s, k, r, hat: HAT && f === 'h' }), c = (f, o, s, k, r) => P.push({ m: 'c', f, o, s, k, r, hat: HAT && f === 'h' }), y = (f, o, s, k, r) => P.push({ m: 'y', f, o, s, k, r, hat: HAT && f === 'h' });
  const hatOn = (fn) => { HAT = true; fn(); HAT = false; };
  const seg = (a, z, t0, t1, w, d, k) => P.push({ m: 'b', f: 'seg', a, z, t0, t1, w, d, k });
  const kingire = () => { if (imp) { seg('shL', 'elL', 0.25, 0.55, 0.15, 0.15, 0xc8312a); seg('shL', 'elL', 0.33, 0.46, 0.155, 0.155, 0xd9b24a); } else seg('shL', 'elL', 0.25, 0.5, 0.15, 0.15, 0xe9e4d6); };
  const eri = (col) => b('c', [0, 0.2, 0.13], [0.2, 0.1, 0.02], col || 0xeee8da, [0.25, 0, 0]);
  const hakama = (col) => { b('p', [0, -0.2, 0], [0.44, 0.32, 0.3], col); seg('hipL', 'kneeL', 0, 1, 0.24, 0.26, col); seg('hipR', 'kneeR', 0, 1, 0.24, 0.26, col); seg('kneeL', 'footL', 0, 0.55, 0.22, 0.24, col); seg('kneeR', 'footR', 0, 0.55, 0.22, 0.24, col); };
  const kyahan = (col) => { seg('kneeL', 'footL', 0.35, 0.95, 0.16, 0.17, col); seg('kneeR', 'footR', 0.35, 0.95, 0.16, 0.17, col); };
  const belts = (col) => { b('c', [0, 0.02, 0.135], [0.06, 0.62, 0.012], col, [0, 0, 0.62]); b('c', [0, 0.02, 0.135], [0.06, 0.62, 0.012], col, [0, 0, -0.62]); b('c', [0, 0.02, -0.135], [0.06, 0.62, 0.012], col, [0, 0, 0.62]); b('c', [0, 0.02, -0.135], [0.06, 0.62, 0.012], col, [0, 0, -0.62]); b('p', [-0.17, 0.02, -0.11], [0.13, 0.11, 0.07], 0x1a1714); };
  const tasuki = () => { b('c', [0, 0.03, -0.136], [0.05, 0.66, 0.012], 0xf2efe6, [0, 0, 0.6]); b('c', [0, 0.03, -0.136], [0.05, 0.66, 0.012], 0xf2efe6, [0, 0, -0.6]); };
  const hachimaki = (col) => { b('h', [0, 0.04, 0], [0.285, 0.05, 0.285], col); b('h', [0.03, 0.0, -0.17], [0.035, 0.035, 0.14], col, [0.6, 0, 0]); };
  const topknot = () => { b('h', [0, 0.13, -0.01], [0.27, 0.05, 0.27], 0x1a1614); b('h', [0, 0.17, -0.02], [0.05, 0.045, 0.16], 0x1a1614); };
  const shaguma = (col) => { b('h', [0, 0.12, -0.04], [0.31, 0.12, 0.3], col); b('c', [0, 0.16, -0.17], [0.28, 0.5, 0.09], col, [-0.12, 0, 0]); b('c', [0, -0.08, -0.19], [0.22, 0.3, 0.07], col, [-0.2, 0, 0]); };
  const armour = (lacq, lace) => {
    b('c', [0, 0.0, 0], [0.5, 0.5, 0.31], lacq); b('c', [0, 0.1, 0], [0.505, 0.035, 0.315], lace); b('c', [0, -0.08, 0], [0.505, 0.035, 0.315], lace);
    b('sl', [0.07, -0.1, 0], [0.07, 0.22, 0.26], lacq); b('sr', [-0.07, -0.1, 0], [0.07, 0.22, 0.26], lacq);
    b('sl', [0.075, -0.12, 0], [0.072, 0.03, 0.265], lace); b('sr', [-0.075, -0.12, 0], [0.072, 0.03, 0.265], lace);
    b('p', [0, -0.18, 0.12], [0.42, 0.26, 0.05], lacq); b('p', [0, -0.18, -0.12], [0.42, 0.26, 0.05], lacq); b('p', [0.21, -0.18, 0], [0.05, 0.26, 0.22], lacq); b('p', [-0.21, -0.18, 0], [0.05, 0.26, 0.22], lacq);
  };
  const kabuto = (col, crest) => hatOn(() => kabuto0(col, crest));
  const kabuto0 = (col, crest) => { b('h', [0, 0.13, -0.01], [0.32, 0.14, 0.32], col); b('h', [0, 0.03, -0.09], [0.4, 0.09, 0.24], col, [0.25, 0, 0]); b('h', [0.18, 0.09, 0.08], [0.04, 0.09, 0.09], col); b('h', [-0.18, 0.09, 0.08], [0.04, 0.09, 0.09], col);
    if (crest) { b('h', [0.07, 0.27, 0.15], [0.03, 0.22, 0.02], crest, [0, 0, -0.35]); b('h', [-0.07, 0.27, 0.15], [0.03, 0.22, 0.02], crest, [0, 0, 0.35]); } };
  const sashimono = (col) => { b('c', [0, 0.5, -0.17], [0.025, 1.15, 0.025], 0x3a2a1a); b('c', [0.13, 0.75, -0.17], [0.25, 0.55, 0.014], col); };
  // ---- Ming & Jin kit ----
  const red = 0xc8281e, gold = 0xd8b04a, iron = 0x3a3d44;
  const mingHair = () => { b('h', [0, 0.12, -0.01], [0.27, 0.06, 0.27], 0x1a1614); b('h', [0, 0.17, -0.01], [0.09, 0.07, 0.09], 0x1a1614); };
  const queue = () => { b('h', [0, 0.07, -0.09], [0.27, 0.11, 0.1], 0x1a1614); b('c', [0, 0.12, -0.165], [0.035, 0.52, 0.03], 0x141210); b('c', [0, -0.15, -0.165], [0.05, 0.05, 0.04], 0x8a2a20); };
  const mingHelm = (col, tuft) => hatOn(() => { y('h', [0, 0.12, 0], [0.31, 0.13, 0.31], col); y('h', [0, 0.06, 0], [0.36, 0.025, 0.36], col); c('h', [0, 0.24, 0], [0.05, 0.13, 0.05], gold); b('h', [0, 0.32, 0], [0.08, 0.08, 0.08], tuft || red); b('h', [0, -0.02, -0.14], [0.3, 0.14, 0.04], col); });
  const jinHelm = (col, plume) => hatOn(() => { y('h', [0, 0.11, 0], [0.3, 0.11, 0.3], col); c('h', [0, 0.3, 0], [0.045, 0.3, 0.045], 0x9a9ea6); y('h', [0, 0.19, 0], [0.09, 0.03, 0.09], gold); b('h', [0, 0.47, 0], [0.04, 0.12, 0.04], plume || red); b('h', [0.155, -0.03, 0.01], [0.025, 0.18, 0.2], col); b('h', [-0.155, -0.03, 0.01], [0.025, 0.18, 0.2], col); b('h', [0, -0.03, -0.155], [0.3, 0.18, 0.025], col); });
  const brim = (col) => hatOn(() => { y('h', [0, 0.1, 0], [0.62, 0.025, 0.62], col); y('h', [0, 0.18, 0], [0.26, 0.14, 0.26], col); });
  const liangmao = () => hatOn(() => { c('h', [0, 0.15, 0], [0.48, 0.15, 0.48], 0x2a2420); c('h', [0, 0.19, 0], [0.3, 0.09, 0.3], red); y('h', [0, 0.24, 0], [0.05, 0.04, 0.05], gold); });
  const furHat = (col) => hatOn(() => { y('h', [0, 0.12, 0], [0.33, 0.13, 0.33], 0x5a3a22); c('h', [0, 0.22, 0], [0.24, 0.1, 0.24], col); });
  const dingjia = (col, stud) => { b('c', [0, -0.04, 0], [0.5, 0.6, 0.31], col); for (const yy of [0.14, 0.0, -0.14]) { b('c', [0, yy, 0.158], [0.4, 0.018, 0.01], stud || gold); b('c', [0, yy, -0.158], [0.4, 0.018, 0.01], stud || gold); }
    b('sl', [0.06, -0.12, 0], [0.09, 0.22, 0.27], col); b('sr', [-0.06, -0.12, 0], [0.09, 0.22, 0.27], col);
    b('p', [0, -0.26, 0.02], [0.46, 0.4, 0.33], col); b('p', [0, -0.2, 0.168], [0.36, 0.018, 0.01], stud || gold); b('p', [0, -0.32, 0.168], [0.36, 0.018, 0.01], stud || gold); };
  const robe = (col, sash) => { b('p', [0, -0.25, 0.01], [0.44, 0.4, 0.3], col); if (sash) b('p', [0, -0.07, 0], [0.47, 0.07, 0.32], sash); };
  const shield = () => { y('sl', [0.12, -0.38, 0.22], [0.56, 0.05, 0.56], 0xa8884a, [HPI, 0, 0]); y('sl', [0.12, -0.38, 0.25], [0.18, 0.03, 0.18], red, [HPI, 0, 0]); };
  const backflag = (col) => { b('c', [0.1, 0.45, -0.24], [0.025, 1.05, 0.025], 0x3a2a1a); b('c', [0.22, 0.72, -0.24], [0.22, 0.4, 0.014], col); }; // pole behind the shoulder, clear of the helmet
  const quiver = () => { y('c', [0.14, 0.05, -0.17], [0.13, 0.6, 0.13], 0x4a2e18, [0, 0, -0.35]); b('c', [0.25, 0.36, -0.17], [0.16, 0.12, 0.08], 0xe8e0cc, [0, 0, -0.35]); };
  // late-Ming kit: vermilion padded coats (胖襖), white puttees, the round 護心鏡 heart-mirror on brigandine,
  // eight-petal iron helmets with red tassels, rattan helmets for shield-men, broad black hats for gunners
  const verm = 0xc4381e, mirror = () => { y('c', [0, 0.06, 0.162], [0.17, 0.02, 0.17], 0xd6dadc, [HPI, 0, 0]); y('c', [0, 0.06, 0.165], [0.1, 0.015, 0.1], 0x9aa2a6, [HPI, 0, 0]); };
  const coat = (col, sash) => { b('p', [0, -0.3, 0.01], [0.47, 0.52, 0.32], col); b('p', [0, -0.07, 0], [0.48, 0.07, 0.33], sash || 0x2a2622); };
  const tassel = (yy) => { b('h', [0, yy, 0], [0.12, 0.07, 0.12], red); b('h', [0, yy - 0.06, 0], [0.16, 0.05, 0.16], red); };
  const bigHat = () => hatOn(() => { y('h', [0, 0.1, 0], [0.66, 0.025, 0.66], 0x161412); y('h', [0, 0.19, 0], [0.27, 0.16, 0.27], 0x1c1916); tassel(0.3); });
  const rattanHelm = () => hatOn(() => { y('h', [0, 0.12, 0], [0.34, 0.16, 0.34], 0xb8964e); y('h', [0, 0.06, 0], [0.37, 0.03, 0.37], 0x8a6a30); b('h', [0, 0.22, 0], [0.06, 0.05, 0.06], red); });
  const petalHelm = (col, plume) => hatOn(() => { y('h', [0, 0.12, 0], [0.31, 0.14, 0.31], col); for (let k = 0; k < 4; k++) b('h', [Math.sin(k * 0.785) * 0.155, 0.13, Math.cos(k * 0.785) * 0.155], [0.02, 0.15, 0.02], gold, [0, k * 0.785, 0]); y('h', [0, 0.05, 0], [0.37, 0.03, 0.37], col); c('h', [0, 0.27, 0], [0.04, 0.18, 0.04], gold); tassel(0.38); if (plume) b('h', [0, 0.47, -0.02], [0.05, 0.14, 0.05], plume); b('h', [0, -0.05, -0.15], [0.34, 0.14, 0.04], 0x3a2a24); });
  const phoenixHelm = () => hatOn(() => { y('h', [0, 0.13, 0], [0.32, 0.15, 0.32], 0xc9a03a); b('h', [0.2, 0.17, 0], [0.16, 0.05, 0.04], gold, [0, 0, 0.6]); b('h', [-0.2, 0.17, 0], [0.16, 0.05, 0.04], gold, [0, 0, -0.6]); c('h', [0, 0.3, 0], [0.04, 0.2, 0.04], gold); tassel(0.42); });
  // 笠盔: the late-Ming gunner's helmet — a polished iron bowl on a wide, flat, slightly drooping iron brim, brass band and
  // fittings, and a tall spray of red horsehair from a brass holder at the crown
  const liKui = (iron2) => hatOn(() => { const st = iron2 || 0x5f666c, cl = 0x3a2a26;
    y('h', [0, 0.065, 0], [0.74, 0.018, 0.74], st); y('h', [0, 0.05, 0], [0.8, 0.012, 0.8], 0x464c52);
    y('h', [0, 0.15, 0], [0.3, 0.15, 0.3], st); b('h', [0, 0.235, 0], [0.27, 0.09, 0.27], st); y('h', [0, 0.09, 0], [0.31, 0.03, 0.31], gold);
    b('h', [0.15, 0.15, 0], [0.04, 0.05, 0.04], gold); b('h', [-0.15, 0.15, 0], [0.04, 0.05, 0.04], gold);
    c('h', [0, 0.3, 0], [0.055, 0.07, 0.055], gold);
    for (let k = 0; k < 3; k++) { const a = k * 2.094; b('h', [Math.sin(a) * 0.04, 0.43, Math.cos(a) * 0.04 - 0.02], [0.035, 0.24, 0.035], k % 2 ? 0xd0261c : 0xa8160f, [Math.cos(a) * 0.3 - 0.12, 0, -Math.sin(a) * 0.3]); }
    b('h', [0, -0.08, -0.15], [0.3, 0.17, 0.05], cl); b('h', [0.16, -0.08, -0.02], [0.04, 0.16, 0.22], cl); b('h', [-0.16, -0.08, -0.02], [0.04, 0.16, 0.22], cl); }); // 頓項: the quilted neck-and-ear guard hanging from the bowl
  // 布面甲: cloth-faced brigandine with its plates riveted inside — the face is a field of round brass rivet heads, with a
  // polished 護心鏡 on the chest, steel 披膊 at the shoulders, 臂手 on the forearms and a split skirt
  const buMian = (col, stud, steel) => { const sv = steel || 0x6a7076; b('c', [0, -0.04, 0], [0.5, 0.6, 0.31], col);
    for (const [yy, xs] of [[0.19, [-0.16, 0, 0.16]], [0.08, [-0.19, 0.19]], [-0.03, [-0.08, 0.08]], [-0.14, [-0.16, 0, 0.16]]]) for (const xx of xs) b('c', [xx, yy, 0.158], [0.034, 0.034, 0.012], stud);
    y('c', [0, 0.07, 0.162], [0.15, 0.02, 0.15], 0xb8bec2, [HPI, 0, 0]);
    b('sl', [0.06, -0.08, 0], [0.11, 0.18, 0.28], sv); b('sr', [-0.06, -0.08, 0], [0.11, 0.18, 0.28], sv); b('sl', [0.07, -0.17, 0], [0.112, 0.03, 0.282], stud); b('sr', [-0.07, -0.17, 0], [0.112, 0.03, 0.282], stud);
    seg('elL', 'haL', 0.12, 0.85, 0.12, 0.12, sv); seg('elR', 'haR', 0.12, 0.85, 0.12, 0.12, sv);
    b('p', [0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); b('p', [-0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); };
  const flask = () => y('p', [0.22, -0.06, 0.1], [0.08, 0.15, 0.08], 0x5a3a20);
  const yaopai = () => { b('p', [-0.17, -0.06, 0.16], [0.012, 0.09, 0.012], 0x2a2018); b('p', [-0.17, -0.15, 0.165], [0.075, 0.11, 0.016], 0xcbb07a); b('p', [-0.17, -0.13, 0.175], [0.04, 0.012, 0.004], 0x5a3a20); }; // 腰牌: Qi Jiguang's waist tag (name, unit, looks), the period way a Ming soldier was identified
  const bc = imp ? red : (u.type === 'shinsengumi' ? 0xd8b03c : BANNER[((u.squad >= 0 ? u.squad : u.id) * 7 + 3) % 4]);
  if (imp) switch (u.type) {
    case 'hero': phoenixHelm(); dingjia(0x8a1a1e, gold); mirror(); b('c', [0, -0.02, -0.17], [0.56, 0.78, 0.03], 0xb02a24); b('sl', [0.06, 0.0, 0], [0.12, 0.05, 0.16], gold); b('sr', [-0.06, 0.0, 0], [0.12, 0.05, 0.16], gold); break;
    case 'samurai': rattanHelm(); coat(verm, 0xe8e2d0); kyahan(0xe8e2d0); yaopai(); break;
    case 'yuanyang': if (u.look) lookGear(u.look, b, c, y, hatOn, 'head'); else rattanHelm(); coat(verm, 0xe8e2d0); kyahan(0xe8e2d0); yaopai(); if (u.role === 'lead') backflag(0xe8c25a); if (u.look) lookGear(u.look, b, c, y, hatOn, 'body'); break;
    case 'cavalry': petalHelm(iron, red); dingjia(0x9a2222, gold); mirror(); backflag(verm); break;
    case 'ashigaru': hatOn(() => { c('h', [0, 0.13, 0], [0.62, 0.2, 0.62], 0xc8a868); b('h', [0, 0.26, 0], [0.06, 0.05, 0.06], red); }); coat(verm, 0x2a2622); kyahan(0xe8e2d0); break;
    case 'rifle_imp': liKui(); buMian(0xa8261e, gold); kyahan(0xe8e2d0); yaopai(); break;
    case 'rifle_spencer': if (u.look && u.look.hat) lookGear(u.look, b, c, y, hatOn, 'head'); else liKui(0x8a8f94); buMian(0x7a2a22, 0xc9c0a8); kyahan(0xe8e2d0); break;
    case 'jinshotai': liKui(); buMian(0x24304a, gold); kyahan(0xe8e2d0); break;
    case 'jigen': petalHelm(iron, 0x1a1a1a); dingjia(0x5a2226, 0x9a9ea6); mirror(); break;
    case 'horokutai': mingHair(); hachimaki(red); robe(0x7a3422, 0x2a2a34); b('p', [-0.24, -0.02, 0.04], [0.14, 0.18, 0.2], 0x6a5038); y('p', [0.24, -0.02, 0.06], [0.16, 0.14, 0.16], 0x2a2a2e); b('p', [0.24, 0.07, 0.06], [0.03, 0.06, 0.03], 0xe8e2cc); break;
    case 'ronin': if (vr % 2 === 0) hatOn(() => c('h', [0, 0.16, 0], [0.8, 0.18, 0.8], 0x9a8058)); else mingHair(); robe(torsoColor(u), 0x5a4a3a); break;
  } else if (u.look && u.look.jin) { const L = u.look, cc = L.coat || bc;
    if (L.jin === 'helm') jinHelm(L.iron || iron, L.plume); else if (L.jin === 'fur') furHat(L.fur || red); else if (L.jin === 'liang') liangmao();
    queue(); if (L.armor === 'robe') robe(cc, L.sash || 0x26262c); else dingjia(cc, L.stud || 0xc9c0a8); if (L.quiver) quiver(); if (L.flag) backflag(bc);
    lookGear(L, b, c, y, hatOn, 'body');
  } else switch (u.type) {
    case 'hero': jinHelm(0xc9a03a, red); queue(); dingjia(0xc9a03a, 0x8a5a20); b('c', [0, -0.02, -0.17], [0.52, 0.7, 0.03], 0x9a7a2a); break;
    case 'samurai': jinHelm(iron); queue(); dingjia(bc, 0xc9c0a8); break;
    case 'cavalry': jinHelm(iron); queue(); dingjia(bc, 0xc9c0a8); quiver(); backflag(bc); break;
    case 'shinsengumi': jinHelm(0x8a6a2a, 0xe8e4da); queue(); dingjia(0xd8b03c, 0x6a4a1a); backflag(0xd8b03c); break;
    case 'ashigaru': liangmao(); queue(); robe(bc, 0x26262c); break;
    case 'rifle_sho': liangmao(); queue(); robe(bc, 0x26262c); belts(0x6a4a30); break;
    case 'archer': liangmao(); queue(); robe(0x2c3f6a, bc); quiver(); break;
    case 'horokutai': liangmao(); queue(); robe(bc, 0x26262c); b('p', [-0.24, -0.02, 0.04], [0.14, 0.18, 0.2], 0x6a5038); y('p', [0.24, -0.02, 0.06], [0.16, 0.14, 0.16], 0x2a2a2e); break;
    case 'byakkotai': case 'ronin': furHat(vr % 2 ? red : 0x2a4a8a); queue(); robe(torsoColor(u), [0xc8281e, 0x2a4a8a, 0xd8b03c][vr % 3]); break;
  }
  // faces: eyes, brows, mouth, and a moustache or beard on some of the older men
  if (u.look) lookGear(u.look, b, c, y, hatOn, 'face');
  else if (u.type !== 'horse' && !u.def.cannon && !u.def.gun) {
    const ink = 0x1a1410, hair = 0x201a16, fz = 0.146;
    b('h', [0.058, 0.0, fz], [0.045, 0.02, 0.012], ink); b('h', [-0.058, 0.0, fz], [0.045, 0.02, 0.012], ink);
    const bt = vr === 5 ? 0.12 : 0; b('h', [0.06, 0.035, fz], [0.065, 0.016, 0.014], hair, [0, 0, -0.12 - bt]); b('h', [-0.06, 0.035, fz], [0.065, 0.016, 0.014], hair, [0, 0, 0.12 + bt]);
    b('h', [0, -0.045, fz + 0.006], [0.03, 0.05, 0.02], 0xd2aa84); // nose
    b('h', [0, -0.085, fz], [0.06, 0.012, 0.012], 0x6a3a30);
    if (vr === 1 || vr === 2) b('h', [0, -0.066, fz + 0.004], [0.11, 0.022, 0.014], hair);
    if (vr === 2) b('h', [0, -0.125, fz - 0.005], [0.05, 0.05, 0.02], hair);
    if (vr === 3) { b('h', [0, -0.12, fz - 0.01], [0.24, 0.06, 0.03], hair); b('h', [0.12, -0.07, 0.06], [0.03, 0.1, 0.12], hair); b('h', [-0.12, -0.07, 0.06], [0.03, 0.1, 0.12], hair); }
  }
  const hp = P.find(q => q.hat);
  g = { parts: P, hat: hp ? { m: hp.m, s: hp.s, k: hp.k } : null }; GEAR_CACHE.set(key, g); return g;
}
// Pose tuples: [armRx, armRz, wX, wY, wZ, armLx, armLz]
const POSES = {
  katana: {
    idle: [-0.8, 0, 1.3, 0, 0, -0.6, 0.3],
    windup: [[-3.2, -0.3, 0.3, 0, 0, -2.9, 0.4], [-1.5, -1.7, 0.9, 1.3, 0, -1.3, 0.5], [0.2, -0.2, 1.57, 0, 0, 0.1, 0.4], [-1.5, 1.5, 0.9, -1.3, 0, -1.5, 1.1]],
    release: [[-0.2, -0.1, 1.9, 0, 0, -0.2, 0.3], [-1.5, 1.3, 0.9, -1.0, 0, -1.4, 1.2], [-2.0, -0.1, 1.57, 0, 0, -1.9, 0.3], [-1.5, -1.4, 0.9, 1.0, 0, -1.3, -0.6]],
    block: [[-2.3, -0.3, 0.3, 0, 1.5, -2.3, 0.3], [-1.2, -0.7, 0.2, 0, 0, -1.0, 0.2], [-0.6, -0.2, 0.8, 0, 1.5, -0.6, 0.3], [-1.2, 0.5, 0.2, 0, 0, -1.2, 0.5]],
    stun: [-0.2, -0.4, 0.6, 0, 0.6, -0.2, 0.4],
  },
  yari: {
    idle: [-1.1, -0.1, 1.5, 0, 0, -1.1, 0.3],
    windup: [[-2.6, -0.2, 0.9, 0, 0, -2.3, 0.3], null, [-0.5, -0.1, 1.5, 0, 0, -0.6, 0.3], null],
    release: [[-0.7, -0.1, 1.7, 0, 0, -0.7, 0.3], null, [-1.8, -0.1, 1.5, 0, 0, -1.7, 0.3], null],
    block: [[-2.3, -0.3, 0.3, 0, 1.5, -2.3, 0.3], [-1.2, -0.7, 0.2, 0, 0, -1.0, 0.2], [-0.6, -0.2, 0.8, 0, 1.5, -0.6, 0.3], [-1.2, 0.5, 0.2, 0, 0, -1.2, 0.5]],
    stun: [-0.3, -0.4, 0.9, 0, 0.5, -0.3, 0.4],
  },
  rifle: {
    idle: [-0.6, -0.1, 0.9, 0, 0.2, -1.0, 0.5],
    aim: [-1.5, -0.1, 1.57, 0, 0, -1.5, 0.5],
    reload: [-0.8, -0.2, 0.1, 0, 0, -0.9, 0.4],
    windup: [null, null, [-0.5, -0.1, 1.5, 0, 0, -0.6, 0.3], null],
    release: [null, null, [-1.8, -0.1, 1.5, 0, 0, -1.7, 0.3], null],
    block: [[-2.3, -0.3, 0.3, 0, 1.5, -2.3, 0.3], [-1.2, -0.7, 0.2, 0, 0, -1.0, 0.2], [-0.6, -0.2, 0.8, 0, 1.5, -0.6, 0.3], [-1.2, 0.5, 0.2, 0, 0, -1.2, 0.5]],
    stun: [-0.3, -0.4, 0.9, 0, 0.5, -0.3, 0.4],
  },
  bow: {
    idle: [-0.5, -0.1, 0.2, 0, 0, -0.9, 0.5],
    aim: [-1.5, -0.1, 0.1, 0, 0, -1.6, 0.9],
    reload: [-0.9, -0.2, 0.2, 0, 0, -1.0, 0.5],
    windup: [null, null, [-0.5, -0.1, 1.5, 0, 0, -0.6, 0.3], null], release: [null, null, [-1.8, -0.1, 1.5, 0, 0, -1.7, 0.3], null],
    block: [null, null, null, null], stun: [-0.3, -0.4, 0.4, 0, 0.5, -0.3, 0.4],
  },
  none: { idle: [-0.1, 0, 0, 0, 0, -0.1, 0], windup: [null, null, null, null], release: [null, null, null, null], block: [null, null, null, null], stun: [-0.2, -0.3, 0, 0, 0, -0.2, 0.3] },
};
POSES.cannon = POSES.none; POSES.gatling = POSES.none; POSES.revolver = POSES.rifle;
function blend(out, a, b, t) { for (let i = 0; i < 7; i++) out[i] = a[i] + (b[i] - a[i]) * t; return out; }
function poseFor(u, stT, out) {
  const P = POSES[u.weapon === 'bow' && u.def.bow && u.def.bow.xbow ? 'rifle' : u.weapon] || POSES.none; const d = u.atkDir;
  const W = (P.windup[d] || P.idle), R = (P.release[d] || P.idle), B = (P.block[u.blockDir] || P.idle);
  switch (u.st) {
    case ST_WINDUP: return blend(out, P.idle, W, clamp(stT / 0.12, 0, 1));
    case ST_RELEASE: return blend(out, W, R, clamp(stT / RELEASE_T, 0, 1));
    case ST_RECOVER: return blend(out, R, P.idle, clamp(stT / Math.max(0.1, u.def.recover), 0, 1));
    case ST_STUN: return blend(out, P.stun, P.idle, clamp((stT - u.stunDur * 0.6) / (u.stunDur * 0.4 + 0.01), 0, 1));
    case ST_AIM: return blend(out, P.idle, P.aim || P.idle, clamp(stT / 0.3, 0, 1));
    case ST_RELOAD: return blend(out, P.idle, P.reload || P.idle, clamp(stT / 0.25, 0, 1));
    case ST_SWAP: return blend(out, P.idle, P.reload || P.idle, 0.6);
    default:
      if (u.blocking) return blend(out, P.idle, B, clamp(u.blockT / 0.1, 0, 1));
      if (u.aiming && P.aim) return blend(out, P.idle, P.aim, 1);
      for (let i = 0; i < 7; i++) out[i] = P.idle[i]; return out;
  }
}

// ===== Skeletal animation: keyframes (chest-local, relative to the shoulder centre; +x = left, +y = up, +z = forward) =====
const N3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const KP = (g, d) => ({ g, d });
const add3 = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const KF = {
  katana: {
    off2: -0.15,
    guard: KP([-0.05, -0.36, 0.36], N3(0, 0.6, 0.8)),
    carry: KP([-0.2, -0.14, 0.16], N3(-0.1, 1, -0.22)),
    atk: [
      [KP([-0.02, 0.3, 0.1], N3(0, 0.4, -0.92)), KP([-0.02, 0.2, 0.42], N3(0, 1, 0.3)), KP([-0.02, -0.34, 0.42], N3(0, -0.35, 0.94))],
      [KP([-0.36, 0.04, 0.06], N3(-0.65, 0.45, -0.6)), KP([-0.1, -0.12, 0.46], N3(0.1, 0.12, 1)), KP([0.3, -0.24, 0.28], N3(0.88, -0.18, 0.25))],
      [KP([-0.06, -0.3, 0.08], N3(0, 0.1, 1)), KP([-0.05, -0.26, 0.36], N3(0, 0.06, 1)), KP([-0.04, -0.22, 0.56], N3(0, 0.03, 1))],
      [KP([0.3, 0.04, 0.06], N3(0.65, 0.45, -0.6)), KP([0.06, -0.12, 0.46], N3(-0.1, 0.12, 1)), KP([-0.34, -0.24, 0.28], N3(-0.88, -0.18, 0.25))],
    ],
    block: [KP([-0.22, 0.24, 0.3], N3(1, 0.12, 0.05)), KP([-0.32, -0.22, 0.3], N3(-0.1, 1, 0.2)), KP([-0.12, -0.48, 0.34], N3(0.85, -0.4, 0.35)), KP([0.18, -0.22, 0.3], N3(0.1, 1, 0.2))],
    stun: KP([-0.2, -0.15, 0.12], N3(-0.35, 0.7, -0.6)),
  },
  yari: {
    off2: 0.55,
    guard: KP([-0.16, -0.42, -0.06], N3(0.06, 0.14, 1)),
    carry: KP([-0.18, -0.38, 0.0], N3(0.05, 0.55, 0.84)),
    atk: [
      [KP([-0.2, 0.22, -0.12], N3(0, 0.4, 0.92)), KP([-0.16, 0.06, 0.2], N3(0, 0.05, 1)), KP([-0.12, -0.3, 0.34], N3(0, -0.45, 0.9))],
      null,
      [KP([-0.2, -0.38, -0.32], N3(0.05, 0.1, 1)), KP([-0.17, -0.36, 0.06], N3(0.04, 0.08, 1)), KP([-0.12, -0.3, 0.42], N3(0.03, 0.06, 1))],
      null,
    ],
    block: [KP([-0.3, 0.22, 0.3], N3(1, 0.08, 0)), KP([-0.28, -0.35, 0.3], N3(0.1, 1, 0.15)), KP([-0.25, -0.5, 0.3], N3(1, -0.25, 0.2)), KP([0.0, -0.35, 0.3], N3(0.15, 1, 0.15))],
    stun: KP([-0.22, -0.3, 0.0], N3(0.3, 0.8, 0.5)),
  },
  rifle: {
    off2: 0.42,
    guard: KP([-0.12, -0.4, 0.16], N3(0.22, 0.55, 0.8)),
    carry: KP([-0.12, -0.36, 0.2], N3(0.55, 0.72, 0.3)),
    aim: KP([-0.1, -0.02, 0.12], [0, 0, 1]),
    atk: [null, null, [KP([-0.14, -0.34, -0.08], N3(0.02, 0.14, 1)), KP([-0.12, -0.3, 0.22], N3(0, 0.1, 1)), KP([-0.1, -0.26, 0.48], N3(0, 0.06, 1))], null],
    block: [KP([-0.32, 0.22, 0.3], [1, 0, 0]), KP([-0.3, -0.42, 0.3], N3(0.15, 1, 0.1)), KP([-0.3, -0.55, 0.32], N3(1, -0.15, 0.1)), KP([-0.05, -0.42, 0.3], N3(0.2, 1, 0.1))],
    stun: KP([-0.2, -0.36, 0.1], N3(0.6, 0.7, -0.2)),
  },
};
// a gun swung as a club (the three-eyed gun by its pole, a musket by its barrel): both hands at the end of the shaft, the heavy end out;
// no thrust at all: a big overhead smash and wide side swings that carry right round
KF.club = {
  off2: -0.14,
  guard: KP([-0.14, -0.2, 0.28], N3(-0.25, 0.9, 0.22)),
  carry: KP([-0.2, -0.2, 0.14], N3(-0.22, 0.75, -0.62)),
  atk: [
    [KP([-0.08, 0.42, 0.02], N3(0, 0.12, -1)), KP([-0.06, 0.32, 0.4], N3(0, 1, 0.22)), KP([-0.04, -0.3, 0.46], N3(0, -0.82, 0.57))],
    [KP([-0.42, 0.12, -0.06], N3(-0.75, 0.4, -0.52)), KP([-0.1, -0.04, 0.48], N3(0.05, 0.12, 1)), KP([0.36, -0.16, 0.22], N3(0.92, -0.12, -0.2))],
    null,
    [KP([0.3, 0.12, -0.02], N3(0.75, 0.4, -0.52)), KP([0.04, -0.04, 0.48], N3(-0.05, 0.12, 1)), KP([-0.4, -0.16, 0.22], N3(-0.92, -0.12, -0.2))],
  ],
  block: KF.katana.block,
  stun: KF.katana.stun,
};
KF.club.atk[2] = KF.club.atk[0];
const BODYC = [[0.1, -0.26, -0.05, 0.42, 0.28], [-0.8, -0.04, 0.66, 0.16, 0.22], [0.1, -0.26, -0.05, 0.42, 0.28], [0.8, -0.04, -0.66, 0.16, 0.22]];
// body motion per attack direction: [twist at windup, lean at windup, twist at release, lean at release, lunge]
const BODY = [[0, -0.12, 0, 0.3, 0.22], [-0.45, 0, 0.42, 0.12, 0.2], [-0.15, -0.04, 0.05, 0.18, 0.34], [0.45, 0, -0.42, 0.12, 0.2]];
// reload paths for the right hand (time 0..1 → chest-local point)
const POUCH = [-0.26, -0.58, 0.02];
const MZ = (() => { const d = N3(0.05, 1, 0.12), butt = [0.04, -1.34, 0.34]; const g = add3(butt, d, 0.3), mz = add3(butt, d, 1.3); const up = (h) => [mz[0], mz[1] + h, mz[2]];
  return { d, g, l: add3(butt, d, 0.92), mz, keys: [[0, g], [0.12, POUCH], [0.24, [-0.04, 0.14, 0.16]], [0.34, up(0.06)], [0.42, up(0.08)], [0.5, up(0.52)], [0.58, up(0.08)], [0.65, up(0.4)], [0.71, up(0.07)], [0.77, up(0.4)], [0.84, up(0.55)], [0.92, [butt[0] - 0.06, butt[1] + 0.55, butt[2] + 0.06]], [1, g]] }; })();
const BR = (() => { const g = [-0.14, -0.46, 0.22], d = N3(0.3, 0.22, 0.93); const b = add3(add3(g, d, 0.2), [0, 1, 0], 0.06); const o = (x, y, z) => [b[0] + x, b[1] + y, b[2] + z];
  return { g, d, keys: [[0, g], [0.14, b], [0.22, o(-0.06, 0.08, 0)], [0.3, o(0, 0.02, -0.06)], [0.48, POUCH], [0.62, o(0, 0.06, -0.04)], [0.7, o(0, 0.02, 0.05)], [0.78, o(0.06, 0.08, 0)], [0.88, [g[0], g[1] + 0.04, g[2]]], [1, g]] }; })();
const SP = (() => { const g = [-0.12, -0.42, 0.2], d = N3(0.3, -0.3, 0.9); const butt = add3(g, d, -0.3), out = add3(butt, d, -0.32);
  return { g, d, keys: [[0, g], [0.12, butt], [0.24, out], [0.44, POUCH], [0.6, out], [0.72, butt], [0.82, g], [0.9, [g[0], g[1] - 0.14, g[2] + 0.06]], [1, g]] }; })();
// the three-eyed gun (三眼銃) loaded properly, one barrel after another: muzzles tipped up with the pole's foot on the ground,
// powder poured from the flask, ball and wad from the pouch, the rammer drawn and driven home in strokes and put back,
// the touch-hole primed from the flask; when all three are loaded the slow-match is lifted and blown on to brighten it
const SJR = { g: [-0.02, -0.56, 0.3], d: N3(0.06, 0.9, 0.42), flask: [-0.24, -0.5, 0.14], mouth: [-0.04, 0.16, 0.22], BT: 0.88 / 3 };
function sjReload(t, tg, KW) {
  if (t >= 0.88) {
    const m = clamp((t - 0.88) / 0.12, 0, 1), G = KW.guard;
    set3(tg.wp, G.g); set3(tg.wd, G.d);
    keyPath(tg.rh, [[0, G.g], [0.3, SJR.mouth], [0.75, SJR.mouth], [1, G.g]], m);
    return { rod: -1, flask: 0, blow: m > 0.3 && m < 0.75 ? 1 : 0 };
  }
  const k = Math.min(2, Math.floor(t / SJR.BT)), s = (t - k * SJR.BT) / SJR.BT, g = SJR.g, d = SJR.d, sx = (k - 1) * 0.03;
  set3(tg.wp, g); set3(tg.wd, d);
  const up = (h) => [g[0] + d[0] * (0.97 + h) + sx, g[1] + d[1] * (0.97 + h), g[2] + d[2] * (0.97 + h)];
  const at = (f, ox) => [g[0] + d[0] * f + ox, g[1] + d[1] * f, g[2] + d[2] * f];
  const rest = at(0.1, 0), stow = at(-0.22, 0.05), pan = at(0.5, -0.07);
  keyPath(tg.rh, [[0, rest], [0.07, SJR.flask], [0.12, up(0.12)], [0.2, up(0.1)], [0.25, POUCH], [0.31, up(0.03)], [0.34, up(0.03)], [0.38, stow], [0.44, up(0.62)], [0.48, up(0.5)], [0.53, up(0.18)], [0.57, up(0.42)], [0.61, up(0.16)], [0.65, up(0.4)], [0.69, up(0.15)], [0.74, up(0.66)], [0.79, stow], [0.84, SJR.flask], [0.88, pan], [0.94, pan], [1, rest]], s);
  return { rod: s > 0.38 && s < 0.79 ? 0.7 : -1, flask: (s > 0.06 && s < 0.24) || (s > 0.83 && s < 0.96) ? 1 : 0, blow: 0 };
}
const BOW = { idleL: [0.24, -0.5, 0.18], idleD: N3(0.2, 0.95, 0.25), aimL: [0.1, 0.03, 0.56], aimD: N3(-0.06, 1, 0.04), nock: [0.06, 0.05, 0.48], cheek: [-0.06, 0.15, 0.06], relL: [0.16, -0.24, 0.42], relD: N3(0, 1, 0.15) };
BOW.keys = [[0, [0.09, -0.24, 0.38]], [0.25, [-0.22, 0.24, -0.18]], [0.5, [-0.22, 0.42, -0.22]], [0.82, [0.09, -0.24, 0.38]], [1, [0.09, -0.24, 0.38]]];
const RAISE_MID = { g: [-0.06, -0.12, 0.36], d: N3(0.08, 0.9, 0.45) };
// a unit superellipsoid: e=1 is a sphere, small e approaches a cube with softly rounded edges
function roundBox(e, ws, hs) {
  const g = new THREE.SphereGeometry(0.5, ws, hs); const p = g.attributes.position;
  const f = (v) => { const a = Math.abs(v * 2); return Math.sign(v) * Math.pow(a, e) * 0.5; };
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)), f(p.getY(i)), f(p.getZ(i)));
  g.computeVertexNormals(); return g;
}
// a capsule one unit long along y with radius 0.5 in x/z; k sets how much of the length the rounded caps take
function capsule(seg, k) {
  const pts = []; const r = 0.5, h = 0.5 - k * 0.5;
  for (let i = 0; i <= 3; i++) { const a = -Math.PI / 2 + (i / 3) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r * 0.98 + 0.001, -h + Math.sin(a) * k * 0.5)); }
  for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r * 0.98 + 0.001, h + Math.sin(a) * k * 0.5)); }
  const g = new THREE.LatheGeometry(pts, seg); g.computeVertexNormals(); return g;
}
function keyPath(out, keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[i], k1 = keys[i + 1]; let s = clamp((t - k0[0]) / Math.max(1e-4, k1[0] - k0[0]), 0, 1); s = s * s * (3 - 2 * s);
  for (let j = 0; j < 3; j++) out[j] = k0[1][j] + (k1[1][j] - k0[1][j]) * s; return out;
}
function bez3(out, a, m, b, t) { const u = 1 - t; for (let j = 0; j < 3; j++) out[j] = u * u * a[j] + 2 * u * t * m[j] + t * t * b[j]; return out; }
function set3(out, a) { out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; return out; }
function lerp3(out, a, b, t) { for (let j = 0; j < 3; j++) out[j] = a[j] + (b[j] - a[j]) * t; return out; }
function nrm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; return v; }
function reloadStyle(u) {
  if (u.weapon === 'revolver') return 'revolver';
  if (u.weapon === 'bow') return u.def.bow && u.def.bow.xbow ? 'lever' : 'bow';
  const r = u.def.rifle; if (!r) return 'none';
  if (u.type === 'rifle_spencer') return u.reloadFill ? 'sj' : 'lever'; /* the three-eyed gun: each barrel loaded from the muzzle in turn */
  if (r.mag > 1) return u.reloadFill ? 'spencer' : 'lever';
  return 'muzzle'; // every long gun of the age is a muzzle-loader
  return 'breech';
}

class Particles {
  constructor(scene, max, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    this.cr = new Float32Array(max); this.cg = new Float32Array(max); this.cb = new Float32Array(max); this.cr1 = new Float32Array(max); this.cg1 = new Float32Array(max); this.cb1 = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3); this.colAttr = new THREE.BufferAttribute(this.col, 4); this.sizeAttr = new THREE.BufferAttribute(this.size, 1);
    this.posAttr.setUsage(THREE.DynamicDrawUsage); this.colAttr.setUsage(THREE.DynamicDrawUsage); this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr); geo.setAttribute('pcolor', this.colAttr); geo.setAttribute('psize', this.sizeAttr);
    this.smokey = !additive; /* smoke, dust and blood share this pool; smoke puffs are drawn as billowing, top-lit, wisping clouds */
    this.seed = new Float32Array(max); this.age = new Float32Array(max); this.ageAttr = new THREE.BufferAttribute(this.age, 1); this.ageAttr.setUsage(THREE.DynamicDrawUsage); this.seedAttr = new THREE.BufferAttribute(this.seed, 1); this.seedAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('pseed', this.seedAttr); geo.setAttribute('page', this.ageAttr);
    geo.setDrawRange(0, 0);
    const toon = typeof MING_STYLE !== 'undefined' && MING_STYLE ? 1 : 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { scaleF: { value: 400 }, noiseT: { value: Particles.noiseTex() }, toon: { value: toon } },
      vertexShader: 'attribute float psize; attribute vec4 pcolor; attribute float pseed; attribute float page; varying vec4 vC; varying float vS; varying float vT; uniform float scaleF; void main(){ vC=pcolor; vS=pseed; vT=page; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize = psize*(scaleF/ max(1.0,-mv.z)); gl_Position=projectionMatrix*mv; }',
      fragmentShader: additive ? 'varying vec4 vC; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.12,d)*vC.a; if(a<0.01) discard; gl_FragColor=vec4(vC.rgb,a); }'
        : ['uniform sampler2D noiseT; uniform float toon; varying vec4 vC; varying float vS; varying float vT;',
          'void main(){ vec2 c=gl_PointCoord-0.5;',
          ' if(vS<0.0){ float d=length(c); float a=smoothstep(0.5,0.12,d)*vC.a; if(a<0.01) discard; gl_FragColor=vec4(vC.rgb,a); return; }',
          /* each puff turns slowly and has its own patch of cloud noise */
          ' float an=vS*6.2832+vT*(vS-0.5)*1.6; float cs=cos(an), sn=sin(an); vec2 r=vec2(c.x*cs-c.y*sn, c.x*sn+c.y*cs);',
          ' vec2 uv=r*0.6+vec2(vS*7.31, vS*3.17); float n1=texture2D(noiseT,uv).r; float n2=texture2D(noiseT,uv*2.3+vec2(vT*0.2,vS)).r;',
          ' float nz=n1*0.62+n2*0.38; float d=length(c)*2.0;',
          /* a lumpy body that erodes into wisps as it ages, instead of a round dot fading out */
          ' float dens=(1.0-d*d)*1.15+(nz-0.5)*(1.0+vT*0.9); float thr=0.08+vT*0.55;',
          ' float w=toon>0.5?0.07:0.3; float a=smoothstep(thr,thr+w,dens)*vC.a; if(a<0.01) discard;',
          /* lit from above: brighter crowns, shadowed undersides; the stylized edition bands it */
          ' float lit=0.86+(-c.y)*0.42+(n2-0.5)*0.22; if(toon>0.5) lit=0.76+floor(clamp((lit-0.6)*3.2,0.0,2.99))*0.15;',
          ' gl_FragColor=vec4(vC.rgb*lit,a); }'].join('\n'),
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mat = mat;
    this.points = new THREE.Points(geo, mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 20 : 10;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, drag, grav, r1, g1, b1) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0; this.drag[i] = drag; this.grav[i] = grav;
    this.seed[i] = (grav > 0 || s1 < 0.45) ? -1 : Math.random(); this.age[i] = 0; /* blood and specks stay plain discs */
    this.cr[i] = r; this.cg[i] = g; this.cb[i] = b; this.cr1[i] = r1 === undefined ? r : r1; this.cg1[i] = g1 === undefined ? g : g1; this.cb1[i] = b1 === undefined ? b : b1;
  }
  static noiseTex() {
    if (Particles._nt) return Particles._nt; const N = 128, d = new Uint8Array(N * N * 4), lat = [];
    for (let o = 0; o < 4; o++) { const G = 4 << o, v = new Float32Array(G * G); for (let k = 0; k < G * G; k++) v[k] = Math.random(); lat.push([G, v]); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0, amp = 0.5, tot = 0;
      for (const [G, v] of lat) { const fx = x / N * G, fy = y / N * G, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const g = (a, b) => v[((b % G) * G + (a % G))]; const n = (g(x0, y0) * (1 - sx) + g(x0 + 1, y0) * sx) * (1 - sy) + (g(x0, y0 + 1) * (1 - sx) + g(x0 + 1, y0 + 1) * sx) * sy;
        s += n * amp; tot += amp; amp *= 0.5; }
      const q = Math.round(s / tot * 255), k = (y * N + x) * 4; d[k] = d[k + 1] = d[k + 2] = q; d[k + 3] = 255; }
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; Particles._nt = t; return t;
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { const j = --this.n; if (i !== j) this.copy(j, i); continue; }
      const t = 1 - this.life[i] / this.maxLife[i];
      const dr = Math.pow(this.drag[i], dt * 60);
      this.vel[i * 3] *= dr; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dr - this.grav[i] * dt; this.vel[i * 3 + 2] *= dr;
      const wd = this.wind && this.grav[i] <= 0 ? this.wind : null; this.pos[i * 3] += (this.vel[i * 3] + (wd ? wd[0] : 0)) * dt; this.pos[i * 3 + 1] += (this.vel[i * 3 + 1] + (wd ? wd[1] : 0)) * dt; this.pos[i * 3 + 2] += (this.vel[i * 3 + 2] + (wd ? wd[2] : 0)) * dt;
      if (this.grav[i] > 0) { const g = terrainH(this.pos[i * 3], this.pos[i * 3 + 2]) + 0.03; if (this.pos[i * 3 + 1] < g) { this.pos[i * 3 + 1] = g; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.5; this.vel[i * 3 + 2] *= 0.5; } }
      this.age[i] = t; const puff = this.smokey && this.seed[i] >= 0;
      this.size[i] = puff ? this.s0[i] + (this.s1[i] - this.s0[i]) * (1 - (1 - t) * (1 - t) * (1 - t)) : this.s0[i] + (this.s1[i] - this.s0[i]) * t; /* smoke bursts out fast, then spreads slowly */
      const fade = puff ? (t < 0.06 ? t / 0.06 : 1 - t * t * 0.55) : t < 0.15 ? t / 0.15 : (1 - t) / 0.85;
      this.col[i * 4] = this.cr[i] + (this.cr1[i] - this.cr[i]) * t; this.col[i * 4 + 1] = this.cg[i] + (this.cg1[i] - this.cg[i]) * t; this.col[i * 4 + 2] = this.cb[i] + (this.cb1[i] - this.cb[i]) * t; this.col[i * 4 + 3] = this.a0[i] * fade;
      i++;
    }
    this.posAttr.needsUpdate = true; this.colAttr.needsUpdate = true; this.sizeAttr.needsUpdate = true; this.ageAttr.needsUpdate = true; this.seedAttr.needsUpdate = true;
    this.points.geometry.setDrawRange(0, this.n);
  }
  copy(from, to) {
    for (let k = 0; k < 3; k++) { this.pos[to * 3 + k] = this.pos[from * 3 + k]; this.vel[to * 3 + k] = this.vel[from * 3 + k]; }
    const arrs = ['life', 'maxLife', 's0', 's1', 'a0', 'drag', 'grav', 'cr', 'cg', 'cb', 'cr1', 'cg1', 'cb1', 'seed', 'age'];
    for (const a of arrs) this[a][to] = this[a][from];
  }
}

// Verlet ragdoll: 7 points (head, chest, pelvis, handL, handR, footL, footR)
const RAG_CON = [[0, 1, 0.36], [1, 2, 0.42], [1, 3, 0.62], [1, 4, 0.62], [2, 5, 0.9], [2, 6, 0.9], [0, 2, 0.78], [3, 4, 0.64], [5, 6, 0.3], [1, 5, 1.3], [1, 6, 1.3], [0, 3, 0.8], [0, 4, 0.8]];
const RAG_STIFF = [1, 1, 1, 1, 1, 1, 1, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
class Ragdoll {
  constructor() { this.p = new Float32Array(21); this.q = new Float32Array(21); this.age = 0; this.active = false; this.slot = -1; this.yaw = 0; this.settle = 0; }
  spawn(u, ix, iy, iz, slot) {
    const yaw = u.yaw, cx = Math.cos(yaw), sx = Math.sin(yaw);
    const b = (u.mount >= 0 || u.mounted) ? 1.0 : 0;
    const rest = [[0, 1.62, 0], [0, 1.3, 0], [0, 0.9, 0], [0.32, 0.9, 0.05], [-0.32, 0.9, 0.05], [0.15, 0.02, 0], [-0.15, 0.02, 0]];
    const vx = (u.mx + u.vx) * 0.6 + ix * 0.9, vy = u.vy * 0.5 + iy * 0.7 + 0.5, vz = (u.mz + u.vz) * 0.6 + iz * 0.9;
    for (let i = 0; i < 7; i++) {
      const lx = rest[i][0], ly = rest[i][1] + b, lz = rest[i][2];
      const wx = u.x + lx * cx + lz * sx, wy = u.y + ly, wz = u.z - lx * sx + lz * cx;
      this.p[i * 3] = wx; this.p[i * 3 + 1] = wy; this.p[i * 3 + 2] = wz;
      const j = (i === 0 ? 1.6 : 1) * 0.6, dt = 1 / 60;
      this.q[i * 3] = wx - (vx + rnd(-j, j)) * dt; this.q[i * 3 + 1] = wy - (vy + rnd(-j, j)) * dt; this.q[i * 3 + 2] = wz - (vz + rnd(-j, j)) * dt;
    }
    this.age = 0; this.active = true; this.slot = slot; this.yaw = yaw; this.settle = 0;
  }
  step(dt) {
    const p = this.p, q = this.q; this.age += dt;
    const g = 22 * dt * dt; let moving = 0;
    for (let i = 0; i < 7; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      let vx = (x - q[i * 3]) * 0.985, vy = (y - q[i * 3 + 1]) * 0.985, vz = (z - q[i * 3 + 2]) * 0.985;
      q[i * 3] = x; q[i * 3 + 1] = y; q[i * 3 + 2] = z;
      p[i * 3] = x + vx; p[i * 3 + 1] = y + vy - g; p[i * 3 + 2] = z + vz;
      moving += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    }
    for (let it = 0; it < 4; it++) {
      for (let c = 0; c < RAG_CON.length; c++) {
        const a = RAG_CON[c][0] * 3, b = RAG_CON[c][1] * 3, rest = RAG_CON[c][2], k = RAG_STIFF[c] * 0.5;
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2]; const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        const f = (d - rest) / d * k; p[a] += dx * f; p[a + 1] += dy * f; p[a + 2] += dz * f; p[b] -= dx * f; p[b + 1] -= dy * f; p[b + 2] -= dz * f;
      }
      for (let i = 0; i < 7; i++) {
        const gh = terrainH(p[i * 3], p[i * 3 + 2]) + (i === 0 ? 0.14 : 0.1);
        if (p[i * 3 + 1] < gh) { p[i * 3 + 1] = gh; q[i * 3] = p[i * 3] - (p[i * 3] - q[i * 3]) * 0.4; q[i * 3 + 2] = p[i * 3 + 2] - (p[i * 3 + 2] - q[i * 3 + 2]) * 0.4; }
      }
    }
    if (moving < 0.004) this.settle += dt; else this.settle = 0;
    if (this.settle > 2 || this.age > 20) { const sink = (this.settle > 2 ? (this.settle - 2) : 0) * 0.08 + (this.age > 20 ? (this.age - 20) * 0.1 : 0); for (let i = 0; i < 7; i++) { p[i * 3 + 1] -= sink * dt * 2; q[i * 3 + 1] -= sink * dt * 2; } if (sink > 1.4) this.active = false; }
  }
}

const STORM = { sky: [0x2c333f, 0x7c828a, 0x707780], fog: 0x7a8088, fogNear: 35, fogFar: 230, sunCol: 0xf2dcb0, mist: 0x9aa0a6, mtn: [0x5c636e, 0x454c56], weather: 'rain', hemi: [0x9aa4b0, 0x3a3c36], sun: [0xc8d0dc, 0.45] };
const BIOMES = {
  autumn: { sky: [0x2a4466, 0xd4d6d2, 0xcacdca], fog: 0xc9cdcc, fogNear: 70, fogFar: 360, sunCol: 0xf2dcb0, mist: 0xdcdedb, mtn: [0x8c96a8, 0x5d6b78], weather: 'leaves', grass: [[0.4, 0.46, 0.28], [0.52, 0.5, 0.34]], dry: [0.52, 0.46, 0.34], hemi: [0xc4ccd8, 0x4c4636], sun: [0xfff0dc, 1.0], pine: 0x2f5a35, maple: true, snow: false },
  summer: { sky: [0x2a5280, 0xd8dcd8, 0xcfd4d2], fog: 0xcfd4d2, fogNear: 80, fogFar: 380, sunCol: 0xf2dcb0, mist: 0xe2e4df, mtn: [0x8aa0a8, 0x56707a], weather: 'pollen', grass: [[0.32, 0.44, 0.25], [0.42, 0.5, 0.3]], dry: [0.48, 0.48, 0.32], hemi: [0xd0dbe6, 0x485a30], sun: [0xfff2e0, 1.05], pine: 0x2b5f2f, maple: false, snow: false },
  spring: { sky: [0x2c5486, 0xdedcd8, 0xd6d6d2], fog: 0xd6d6d2, fogNear: 80, fogFar: 380, sunCol: 0xf2dcb0, mist: 0xe4e2dc, mtn: [0x98a2b4, 0x627486], weather: 'petals', grass: [[0.38, 0.5, 0.3], [0.48, 0.54, 0.34]], dry: [0.54, 0.52, 0.4], hemi: [0xd6dcea, 0x4a5a30], sun: [0xfff0e2, 1.04], pine: 0x2e5a36, maple: false, blossom: true, snow: false },
  night:  { sky: [0x060a14, 0x141c2c, 0x182030], fog: 0x0e1420, fogNear: 22, fogFar: 150, sunCol: 0x8ea6d8, mist: 0x1c2434, mtn: [0x18202c, 0x0e131c], weather: 'snow', grass: [[0.15, 0.17, 0.15], [0.19, 0.2, 0.17]], dry: [0.19, 0.19, 0.17], hemi: [0x34445e, 0x0c0c0c], sun: [0x8ea6d8, 0.32], pine: 0x142218, maple: false, snow: false, night: true },
  winter: { sky: [0x46546a, 0xd6d4cd, 0xcfcdc6], fog: 0xcfcdc5, fogNear: 45, fogFar: 270, sunCol: 0xf2dcb0, mist: 0xe9e6de, mtn: [0xa7acb4, 0x7d8590], weather: 'snow', grass: [[0.82, 0.84, 0.86], [0.9, 0.9, 0.92]], dry: [0.7, 0.69, 0.66], hemi: [0xd4d9de, 0x6a6a6a], sun: [0xf0e6dc, 0.7], pine: 0x2c4a33, maple: false, snow: true },
};
// ---------- 水墨 shadows: cast shade is laid on like an ink wash, not a hard digital edge ----------
// the shadow edge bleeds and wanders (wet-in-wet), ink pools darker along the rim of each wash, and the shaded
// area is broken by dry-brush granulation so it never reads as flat black. Noise is anchored in world space.
const INK_SHIFT = { value: new THREE.Vector2() };
// arm proportions: upper arm and forearm about 15% longer than they were (0.30 / 0.29), and hand targets pushed out from
// the shoulder by ARM_REACH, so swings, thrusts and gestures sweep wider arcs and read from further away
const ARM_U = 0.345, ARM_F = 0.335, ARM_REACH = 1.12;
(function inkShadows() {
  const REAL = typeof window !== 'undefined' && window.MING_REAL;
  const C = THREE.ShaderChunk; let src = C.shadowmap_pars_fragment; if (!src || src.indexOf('getShadowBase') >= 0) return;
  const sig = 'float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord )';
  if (src.indexOf(sig) < 0) return;
  src = src.replace(sig, 'float getShadowBase( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord )');
  const ink = `
	#define REAL_SHADOW ${REAL ? 'true' : 'false'}
	uniform vec2 inkShift;
	float inkH( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
	float inkV( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( inkH( i ), inkH( i + vec2( 1.0, 0.0 ) ), f.x ), mix( inkH( i + vec2( 0.0, 1.0 ) ), inkH( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
	float inkF( vec2 p ) { return inkV( p ) * 0.55 + inkV( p * 2.13 + 3.1 ) * 0.28 + inkV( p * 4.37 + 7.7 ) * 0.17; }
	// how edge-on the surface is to the sun: on a wall the light only grazes, one shadow texel smears across a
	// metre of surface and turns into streaks and staircases. There the plain lighting already darkens the face,
	// so the shadow (and its ink noise) fades out and the face reads as one clean flat tone.
	float shadowGraze( vec4 shadowCoord ) { vec3 c = shadowCoord.xyz / shadowCoord.w; float dxy = length( fwidth( c.xy ) ) * 140.0, dz = fwidth( c.z ) * 390.0; return smoothstep( 1.6, 4.0, dz / max( dxy, 1e-6 ) ); }
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float graze = shadowGraze( shadowCoord );
		if ( REAL_SHADOW ) return mix( getShadowBase( shadowMap, shadowMapSize, shadowBias, shadowRadius, shadowCoord ), 1.0, graze );
		vec2 w = shadowCoord.xy / shadowCoord.w + inkShift;
		// low-frequency wander only (features ~1-3 m): nothing finer than a few pixels, so nothing to shimmer
		vec2 warp = ( vec2( inkF( w * 55.0 ), inkF( w * 55.0 + 19.3 ) ) - 0.5 ) * ( 2.0 / 140.0 );
		float s = 0.0;
		for ( int i = 0; i < 12; i ++ ) { float fi = float( i ); float a = fi * 2.39996; float r = sqrt( ( fi + 0.5 ) / 12.0 ) * ( 1.25 / 140.0 );
			s += getShadowBase( shadowMap, shadowMapSize, shadowBias, shadowRadius, shadowCoord + vec4( warp + vec2( cos( a ), sin( a ) ) * r, 0.0, 0.0 ) ); }
		s /= 12.0;
		// a wet wash: soft bloom, a little darker where the ink pools at the rim, paler and patchy inside
		s = smoothstep( 0.05, 0.95, s + ( inkF( w * 90.0 ) - 0.5 ) * 0.35 );
		float rim = s * ( 1.0 - s ) * 4.0; s -= rim * 0.2;
		s += ( 1.0 - s ) * ( 0.04 + inkF( w * 140.0 ) * 0.16 );
		return mix( clamp( s, 0.0, 1.0 ), 1.0, graze );
	}
`;
  const at = src.lastIndexOf('#endif'); if (at < 0) return;
  C.shadowmap_pars_fragment = src.slice(0, at) + ink + src.slice(at);
  const base = THREE.Material.prototype.onBeforeCompile;
  THREE.Material.prototype.onBeforeCompile = function (sh, r) { if (sh && sh.uniforms) sh.uniforms.inkShift = INK_SHIFT; if (base) base.call(this, sh, r); };
})();
class Renderer {
  constructor(canvas, sim, localIdx) {
    this.sim = sim; this.localIdx = localIdx; this.canvas = canvas; this.time = 0;
    this.biome = BIOMES[sim.bdef.biome] || BIOMES.autumn; if (sim.rain) this.biome = Object.assign({}, this.biome, STORM); const fogK = 1 - 0.55 * sim.bdef.fog;
    this.lowfx = !!(window.__boshin && window.__boshin.state && window.__boshin.state.lowfx);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowfx, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.lowfx ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = !this.lowfx; this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.biome.fog);
    this.fogBase = [this.biome.fogNear * fogK, this.biome.fogFar * fogK];
    this.scene.fog = new THREE.Fog(this.biome.fog, this.fogBase[0], this.fogBase[1]);
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 700);
    this.scene.add(this.camera);
    this.fov = 75; this.fovTarget = 75;
    this.shake = 0; this.recoil = 0; this.recoilRoll = 0; this.hitFlash = 0; this.imp = { p: 0, y: 0, r: 0, vp: 0, vy: 0, vr: 0, x: 0, vx: 0, fov: 0, jolt: 0, blur: 0 }; this.hitMark = 0; this.hitMarkHead = false; this.parryFlash = 0;
    this.cmdCam = { x: 0, z: 0, h: 70, yaw: 0 };
    this.tmp = { m: new THREE.Matrix4(), m2: new THREE.Matrix4(), m3: new THREE.Matrix4(), t: new THREE.Matrix4(), r: new THREE.Matrix4(), s: new THREE.Matrix4(), e: new THREE.Euler(), q: new THREE.Quaternion(), v: new THREE.Vector3(), v2: new THREE.Vector3(), v3: new THREE.Vector3(), v4: new THREE.Vector3(), c: new THREE.Color(), zero: new THREE.Matrix4().makeScale(0, 0, 0) };
    this.pose = new Float32Array(7);
    this.deadHorses = []; this.cannonRecoil = new Map(); this.heroStates = new Map();
    this.msgs = [];
    this.localTeam = sim.cfg.players[localIdx] ? (sim.cfg.players[localIdx].team ? 1 : 0) : 0;
    this.buildLights(); this.buildSky(); this.buildTerrain(); this.buildDeco(); this.buildStructures(); this.campFires = []; if (sim.cfg.camp) this.buildCamp(sim.cfg.camp); if (sim.sg) this.buildSiege(); this.buildFigures(); this.buildHorses(); this.buildCannons(); this.buildMarkers(); this.buildFX(); this.buildViewmodel();
    this.ragdolls = []; for (let i = 0; i < MAXRAG; i++) this.ragdolls.push(new Ragdoll());
    this.ragNext = 0;
    this.buildEnvironment(); this.buildWater();
    { const n = sim.units.length; this.fog = !!(window.__boshin && window.__boshin.state && window.__boshin.state.fog) && !sim.heroMode && !sim.chaos; this.seen = new Uint8Array(n).fill(1); this.wasSeen = new Uint8Array(n).fill(1); this.reveal = new Float32Array(n); this.seenSq = new Uint8Array(sim.squads.length).fill(1); this.lastSeen = []; }
    this.buildGroundMap();
    if (!this.lowfx) { this.toonify(); this.buildPost(); }
    AUDIO.setRain(!!sim.rain);
    this.resize();
    const fc = this.localTeam;
    this.cmdCam.yaw = fc === 0 ? 0 : PI;
    const pl = sim.players[localIdx];
    if (pl && pl.squads.length) { let sx = 0, sz = 0; for (const id of pl.squads) { sx += sim.squads[id].cx; sz += sim.squads[id].cz; } this.cmdCam.x = sx / pl.squads.length; this.cmdCam.z = sz / pl.squads.length; }
    else { const hero = sim.units[pl ? pl.heroId : 0]; if (hero) { this.cmdCam.x = hero.x; this.cmdCam.z = hero.z; } }
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.post) { const b = this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.post.rt.setSize(b.x, b.y); this.post.mat.uniforms.res.value.set(b.x, b.y); }
  }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(this.biome.hemi[0], this.biome.hemi[1], 0.65); this.scene.add(this.hemi); this.lightFlash = 0;
    const sun = new THREE.DirectionalLight(this.biome.sun[0], this.biome.sun[1]); this.sunDir = new THREE.Vector3(-70, 48, 85).normalize(); sun.position.copy(this.sunDir).multiplyScalar(150); sun.castShadow = true;
    sun.shadow.mapSize.set(this.lowfx ? 512 : 2048, this.lowfx ? 512 : 2048); const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.09; sun.shadow.radius = 2;
    this.sun = sun; this.scene.add(sun); this.scene.add(sun.target);
  }
  buildSky() {
    const geo = new THREE.SphereGeometry(600, 24, 12);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(this.biome.sky[0]) }, mid: { value: new THREE.Color(this.biome.sky[1]) }, bot: { value: new THREE.Color(this.biome.sky[2]) }, sunCol: { value: new THREE.Color(this.biome.sunCol) }, sunDir: { value: new THREE.Vector3(-70, 22, 85).normalize() } },
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform vec3 top,mid,bot,sunCol,sunDir; varying vec3 vP;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }',
        'void main(){ vec3 d=normalize(vP); float h=d.y;',
        // bokashi: a hard-edged indigo band at the top fading into cream, like a woodblock printer wiping the block
        '  float band = smoothstep(0.18, 0.42, h + 0.025*sin(atan(d.z,d.x)*3.0));',
        '  vec3 c = mix(mid, top, band); c = mix(c, top*0.75, smoothstep(0.55, 0.95, h));',
        '  if (h < 0.0) c = mix(mid, bot, clamp(-h*4.0,0.0,1.0));',
        '  float s = dot(d, sunDir); c = mix(c, sunCol * 1.08, smoothstep(0.9982, 0.999, s));',
        '  c = mix(c, mix(c, sunCol, 0.25), smoothstep(0.96, 0.997, s) * (1.0 - band));',
        // stylised cloud streaks
        '  float cl = sin(d.x*9.0 + d.z*4.0) * sin(h*38.0 + d.z*6.0); c = mix(c, mid*1.04, smoothstep(0.82, 0.95, cl) * smoothstep(0.05,0.12,h) * (1.0-smoothstep(0.22,0.3,h)) * 0.7);',
        '  gl_FragColor=vec4(c,1.0); }'].join('\n'),
    });
    this.sky = new THREE.Mesh(geo, mat); this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.scene.add(this.sky);
  }
  buildTerrain() {
    const size = HALF * 2 + 60, seg = this.lowfx ? 130 : 200;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-HPI);
    const pos = geo.attributes.position; const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); const y = terrainH(x, z); pos.setY(i, y);
      const n = Math.sin(x * 0.13 + 1) * Math.cos(z * 0.11) + Math.sin(x * 0.031) * Math.sin(z * 0.037 + 2) * 1.3 + Math.sin(x * 0.52) * Math.cos(z * 0.47) * 0.4;
      const t = clamp(n * 0.5 + 0.5, 0, 1); const B = this.biome;
      let r = lerp(B.grass[0][0], B.grass[1][0], t), g = lerp(B.grass[0][1], B.grass[1][1], t), b = lerp(B.grass[0][2], B.grass[1][2], t);
      const dry = clamp((Math.sin(x * 0.07 + 5) * Math.cos(z * 0.05 + 1) - 0.55) * 4, 0, 1);
      r = lerp(r, B.dry[0], dry); g = lerp(g, B.dry[1], dry); b = lerp(b, B.dry[2], dry);
      const slope = y - terrainH(x + 1, z); r += slope * 0.06; g += slope * 0.06;
      { const gx = terrainH(x + 1, z) - terrainH(x - 1, z), gz = terrainH(x, z + 1) - terrainH(x, z - 1); const gr = Math.sqrt(gx * gx + gz * gz) / 2; const rk = clamp((gr - 0.45) * 2.2, 0, 1) * (this.sim.battle === 'aizu' && Math.hypot(x, z - 96) < 30 ? 1.6 : 1); const rc = this.sim.battle === 'aizu' ? [0.56, 0.55, 0.52] : B.snow ? [0.6, 0.6, 0.62] : [0.5, 0.45, 0.38]; const kk = clamp(rk, 0, 1); r = lerp(r, rc[0], kk); g = lerp(g, rc[1], kk); b = lerp(b, rc[2], kk); }
      if (SIM.waterAt(x, z) > 0 || SIM.waterAt(x, z) === 2) { r = lerp(r, 0.36, 0.7); g = lerp(g, 0.33, 0.7); b = lerp(b, 0.27, 0.7); }
      if (this.sim.roadX !== undefined && Math.abs(x - this.sim.roadX) < 3.5) { const k = B.snow ? 0.75 : 1; r = 0.52 * k; g = 0.46 * k; b = 0.36 * k; }
      for (const q of this.sim.zones) if (x > q.x - q.hw - 1 && x < q.x + q.hw + 1 && z > q.z - q.hd - 1 && z < q.z + q.hd + 1) { r = 0.36; g = 0.4; b = 0.3; }
      cols[i * 3] = r; cols[i * 3 + 1] = g; cols[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; this.scene.add(mesh); this.terrain = mesh;
  }
  // ---------- a night camp: tents, the fire, bedrolls (the empty ones too), the cook's pot, the company banner ----------
  buildCamp(C) {
    const sc = this.scene, L = (c) => new THREE.MeshLambertMaterial({ color: c });
    const tents = this.sim.boxes.filter(b => b.kind === 'tent');
    if (tents.length) { const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.5, 0); const m = new THREE.InstancedMesh(g, L(0xb9ab8a), tents.length); const T = this.tmp;
      tents.forEach((b, i) => { const y = Math.min(terrainH(b.x, b.z) - 0.04, this.footY(b) + 0.04); T.m.compose(T.v.set(b.x, y, b.z), T.q.identity(), T.v2.set(b.hw * 2 / 1.732, b.h / 1.5, b.hd * 2)); m.setMatrixAt(i, T.m); }); m.castShadow = true; m.receiveShadow = true; sc.add(m);
      for (const b of tents) { const y = terrainH(b.x, b.z); const flap = new THREE.Mesh(new THREE.PlaneGeometry(b.hw * 0.9, b.h * 0.7), L(0x2a2620)); flap.position.set(b.x, y + b.h * 0.32, b.z + b.hd + 0.02); sc.add(flap);
        for (const sz of [-1, 1]) { const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, b.h + 0.25, 0.06), L(0x5a4630)); pole.position.set(b.x, y + (b.h + 0.25) / 2, b.z + sz * (b.hd + 0.05)); sc.add(pole); } } }
    this.campFires = [];
    for (const f of C.fires || []) { const [x, z] = f, y = terrainH(x, z); const grp = new THREE.Group(); grp.position.set(x, y, z); sc.add(grp);
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (k % 3) * 0.03), L(0x4a4a48)); st.position.set(Math.sin(a) * 0.62, 0.08, Math.cos(a) * 0.62); grp.add(st); }
      for (let k = 0; k < 3; k++) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.0), L(0x2c2118)); lg.rotation.y = k * 1.05; lg.rotation.x = 0.12; lg.position.y = 0.12; grp.add(lg); }
      const emb = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshBasicMaterial({ color: 0xff5a1a })); emb.rotation.x = -Math.PI / 2; emb.position.y = 0.05; grp.add(emb);
      const fl = []; for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22 - k * 0.04, 0.9 - k * 0.15, 7), new THREE.MeshBasicMaterial({ color: [0xff7a22, 0xffa040, 0xffd27a][k], transparent: true, opacity: 0.85 - k * 0.1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.position.set((k - 1) * 0.1, 0.45, (k % 2) * 0.08 - 0.04); grp.add(m); fl.push(m); }
      const lt = new THREE.PointLight(0xff9a4a, 2.4, 30, 1.6); lt.position.set(x, y + 1.3, z); sc.add(lt);
      this.campFires.push({ x, y, z, fl, lt, t: Math.random() * 10 }); }
    for (const b of C.bedrolls || []) { const [x, z, yaw, empty] = b, y = terrainH(x, z); const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = yaw; sc.add(grp);
      const mat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 1.85), L(empty ? 0x343a44 : 0x46505e)); mat.position.y = 0.05; grp.add(mat);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.66, 8), L(0x6a5a44)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.13, -0.8); grp.add(roll);
      if (empty) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 2.1), L(0x6b5232)); sp.position.set(0.48, 0.04, 0.1); sp.rotation.y = 0.05; grp.add(sp); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.07, 8), L(0x7a6a50)); cup.position.set(-0.2, 0.13, -0.45); grp.add(cup);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.12, 10), L(0x2c2a26)); hat.position.set(0.12, 0.15, -0.3); grp.add(hat); } }
    for (const p of C.props || []) { const [kind, x, z, yaw] = p, y = terrainH(x, z); const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = yaw || 0; sc.add(grp);
      if (kind === 'pot') { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.38, 12), L(0x2a2a2c)); pot.position.y = 0.62; grp.add(pot); for (let k = 0; k < 3; k++) { const a = k * 2.094; const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.05), L(0x4a3a28)); leg.position.set(Math.sin(a) * 0.45, 0.6, Math.cos(a) * 0.45); leg.rotation.set(Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32); grp.add(leg); } }
      else if (kind === 'banner') { const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6, 0.08), L(0x4a3826)); pole.position.y = 3; grp.add(pole); const cv = document.createElement('canvas'); cv.width = 128; cv.height = 192; const g = cv.getContext('2d'); g.fillStyle = '#9a2420'; g.fillRect(0, 0, 128, 192); g.strokeStyle = '#e0c070'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 180); g.fillStyle = '#f2e6c8'; g.font = 'bold 96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p[4] || '浙', 64, 96);
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.65), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); fl.position.set(0.6, 5, 0); grp.add(fl); this.campFlag = fl; }
      else if (kind === 'rack') { for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.2, 0.04), L(0x6b5232)); sp.position.set((k - 2) * 0.22, 1.5, 0); sp.rotation.x = -0.18; grp.add(sp); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 4), L(0x9aa0a6)); tip.position.set((k - 2) * 0.22, 3.1, -0.28); grp.add(tip); } const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.06), L(0x4a3826)); bar.position.set(0, 1.9, -0.18); grp.add(bar); }
      else if (kind === 'wagon') { const bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 3), L(0x5a4430)); bed.position.y = 0.9; grp.add(bed); for (const sx of [-0.8, 0.8]) for (const sz of [-0.9, 0.9]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 12), L(0x3a2c1e)); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.42, sz); grp.add(w); } const load = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 2.2), L(0x8a7a5a)); load.position.y = 1.45; grp.add(load); }
      else if (kind === 'shields') { for (let k = 0; k < 3; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), L(0xa8844a)); d.rotation.x = Math.PI / 2 - 0.25; d.position.set((k - 1) * 0.5, 0.42, 0); grp.add(d); } }
      else if (kind === 'log') { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.2, 8), L(0x4a3a2a)); lg.rotation.z = Math.PI / 2; lg.position.y = 0.2; grp.add(lg); } }
  }
  // ---------- 攻守城 siege: the rampart, the gatehouse, the ditch, the engines and the emplacements ----------
  buildSiege() {
    const sim = this.sim, sg = sim.sg, W = SIM.TERR.swall, Dt = SIM.TERR.sditch, sc = this.scene, T = this.tmp;
    const L = (c) => new THREE.MeshLambertMaterial({ color: c }); const brick = L(0x6f6a62), brickD = L(0x58544e), top = L(0x8a857c), wood = L(0x5a3a20), woodL = L(0x7a5a38), hide = L(0x6e5a3e), iron = L(0x34363a), red = L(0x8a2a20), tile = L(0x2c2e32);
    const box = (w, h, d, m, x, y, z, g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (g || sc).add(o); return o; };
    const gy = (x, z) => SIM.terrainH(x, z);
    // the rampart: two long brick bodies either side of the gate passage, a walkway, battlements on the outer edge
    const zc = (W.z0 + W.z1) / 2, dep = W.z1 - W.z0, base = -2.5;
    for (const sx of [-1, 1]) { const x0 = W.gate, x1 = 152, cx = sx * (x0 + x1) / 2, len2 = x1 - x0; const hTop = gy(cx, zc);
      box(len2, hTop - base, dep + 0.2, brick, cx, (hTop + base) / 2, zc); box(len2, 0.08, dep - 0.6, top, cx, hTop + 0.04, zc + 0.2); }
    { const pos = []; for (let x = -150; x <= 150; x += 1.7) { if (Math.abs(x) < W.gate + 0.6) continue; pos.push(x); }
      const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.85, 0.42), brickD, pos.length); pos.forEach((x, i) => { T.m.compose(T.v.set(x, gy(x, W.z0 + 0.3) + 0.42, W.z0 + 0.22), T.q.identity(), T.v2.set(1, 1, 1)); m.setMatrixAt(i, T.m); }); m.castShadow = true; sc.add(m); }
    // scaling ladders (雲梯) leaning on the face when raised
    this.sgLad = sg.lads.map(Ld => { const g = new THREE.Group(); const H = W.h + 0.4; for (const sx of [-0.45, 0.45]) box(0.12, H, 0.12, woodL, sx, H / 2, 0, g); for (let k = 0; k < 9; k++) box(0.9, 0.08, 0.08, woodL, 0, 0.4 + k * 0.66, 0, g); box(0.5, 0.25, 0.25, iron, 0, H, 0, g); g.position.set(Ld.x, gy(Ld.x, W.z0 - 2.8), W.z0 - 2.8); g.visible = false; sc.add(g); return g; });
    // inner ramps (stairways up from the town)
    for (const r of W.ramps) { const z0 = W.z1, z1 = W.z1 + 14, h0 = gy(r, z0 - 1); const len2 = Math.hypot(z1 - z0, h0); const o = box(6, 0.5, len2, brickD, r, h0 / 2, (z0 + z1) / 2); o.rotation.x = Math.atan2(h0, z1 - z0); }
    // the gatehouse (城樓) over the passage, with its two-eaved roof
    { const g = new THREE.Group(); const hTop = gy(W.gate + 2, zc); g.position.set(0, hTop, zc); sc.add(g);
      box(2 * W.gate + 0.2, 1.4, dep + 0.2, brick, 0, 0.7 - 1.4 + 0.02, 0, g); box(16, 0.3, dep + 1.6, top, 0, 0.15, 0, g);
      for (const x of [-6.5, -2.2, 2.2, 6.5]) for (const z of [-2.6, 2.6]) box(0.45, 4.2, 0.45, red, x, 2.25, z, g);
      box(14.4, 3.6, 5.4, L(0x7a3a28), 0, 2.2, 0, g); const roof = (w, d, y, h) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1), tile); o.rotation.y = Math.PI / 4; o.scale.set(w * 0.72, h, d * 0.72); o.position.y = y; o.castShadow = true; g.add(o); };
      roof(19, 8.5, 5.0, 1.6); box(11, 2, 4.4, L(0x7a3a28), 0, 6.4, 0, g); roof(14.5, 7, 8.1, 2.2);
      const banner = box(0.08, 4, 0.08, wood, 7.6, 9.5, 2.7, g); }
    // the gate doors in the passage
    { const g = new THREE.Group(); g.position.set(0, gy(0, W.z0 + 1), W.z0 + 0.9); sc.add(g); const studs = L(0x9a8a5a);
      for (const sx of [-1, 1]) { const d = box(W.gate - 0.15, W.h - 0.6, 0.5, L(0x5a2e1c), sx * (W.gate / 2), (W.h - 0.6) / 2, 0, g); for (let r2 = 0; r2 < 5; r2++) for (let c = 0; c < 3; c++) box(0.16, 0.16, 0.08, studs, sx * (0.9 + c * 1.2), 0.9 + r2 * 1.05, -0.3, g); }
      box(2 * W.gate + 1, 0.8, dep + 0.2, brick, 0, W.h + 0.1, (dep / 2) - 0.9, g); this.sgDoors = g; }
    // the ditch: an iced bottom, rows of sharpened stakes on the far bank, the causeway at the gate, fascines where it is filled
    { const ice = new THREE.Mesh(new THREE.PlaneGeometry(300, Dt.w * 1.3), new THREE.MeshLambertMaterial({ color: sim.bdef.biome === 'winter' ? 0xa8b8c4 : 0x4a5a5a })); ice.rotation.x = -Math.PI / 2; ice.position.set(0, gy(40, Dt.zc) + 0.12, Dt.zc); ice.receiveShadow = true; sc.add(ice);
      const st = []; for (let x = -148; x <= 148; x += 1.3) { if (Math.abs(x) < Dt.bridge + 1) continue; st.push([x, Dt.zc + Dt.w + 0.6 + (Math.floor(x / 1.3) % 2) * 0.5]); }
      const m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 1.5, 4), woodL, st.length); st.forEach(([x, z], i) => { T.m.compose(T.v.set(x, gy(x, z) + 0.45, z), T.q.setFromEuler(T.e.set(-0.7, 0, (i % 3 - 1) * 0.15)), T.v2.set(1, 1, 1)); m.setMatrixAt(i, T.m); }); sc.add(m);
      const deck = box(2 * Dt.bridge, 0.3, Dt.w * 2 + 1.5, woodL, 0, gy(0, Dt.zc) + 0.05, Dt.zc); deck.receiveShadow = true;
      this.sgFills = Dt.fills.map(f => { const n = Math.round(f.hw * 2 / 0.9) * 3; const mm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 6), L(0x8a7a50), n); for (let i = 0; i < n; i++) mm.setMatrixAt(i, T.zero); sc.add(mm); return { f, m: mm, n, shown: -1 }; }); }
    // engines
    this.sgEng = sg.engines.map(e => { const g = new THREE.Group(); sc.add(g);
      if (e.kind === 'ram') { box(2.8, 0.25, 6, wood, 0, 0.7, 0, g); for (const sx of [-1, 1]) { box(0.18, 2.8, 0.18, wood, sx * 1.3, 2.1, -2.6, g); box(0.18, 2.8, 0.18, wood, sx * 1.3, 2.1, 2.6, g); const r1 = box(1.8, 0.12, 6.4, hide, sx * 0.75, 3.5, 0, g); r1.rotation.z = sx * 0.55; }
        const log = new THREE.Group(); log.position.set(0, 1.9, 0); const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 6.6, 10), wood); lg.rotation.x = HPI; log.add(lg); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.7, 10), iron); tip.rotation.x = HPI; tip.position.z = 3.5; log.add(tip); g.add(log); g.userData.log = log; }
      else if (e.kind === 'tower') { box(4.8, 0.4, 4.8, wood, 0, 0.6, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.32, 9.6, 0.32, wood, sx * 2.2, 5.2, sz * 2.2, g); for (const y of [3.4, 6.6, 9.6]) box(4.8, 0.25, 4.8, wood, 0, y, 0, g);
        box(4.7, 9, 0.2, hide, 0, 5.1, 2.35, g); for (const sx of [-1, 1]) box(0.2, 9, 4.6, hide, sx * 2.35, 5.1, 0, g); box(4.9, 0.9, 4.9, hide, 0, 10.4, 0, g);
        const br = new THREE.Group(); br.position.set(0, 6.6, 2.4); box(2.6, 0.18, 3.2, woodL, 0, 0, 1.6, br); g.add(br); g.userData.bridge = br; }
      else { box(3.4, 0.3, 1.6, wood, 0, 0.6, 0, g); const sh = box(3.4, 2.5, 0.22, hide, 0, 1.9, 0.85, g); sh.rotation.x = -0.18; box(3.5, 0.12, 0.12, iron, 0, 3.05, 1.05, g); }
      const nW = e.kind === 'tower' ? 4 : 4; for (let k = 0; k < nW; k++) { const sx = k % 2 ? 1 : -1, sz = k < 2 ? -1 : 1; const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 10), wood); wh.rotation.z = HPI; const S = e.kind === 'tower' ? [2.5, 2] : e.kind === 'ram' ? [1.5, 2.2] : [1.8, 0.5]; wh.position.set(sx * S[0], 0.55, sz * S[1]); g.add(wh); }
      return g; });
    // emplacements: bed crossbows (床弩) and guns
    this.sgEmp = sg.emp.map(e => { const g = new THREE.Group(); g.position.set(e.x, e.y, e.z); sc.add(g); const aim = new THREE.Group(); aim.position.y = 1.2; g.add(aim);
      if (e.kind === 'bow') { box(0.5, 1.0, 0.5, wood, 0, 0.5, 0, g); box(0.25, 0.22, 3.2, wood, 0, 0, 0.3, aim); for (const sx of [-1, 1]) { const arm = box(1.9, 0.12, 0.14, wood, sx * 0.9, 0, 1.4, aim); arm.rotation.y = -sx * 0.32; } box(0.08, 0.08, 2.6, L(0xb08a50), 0, 0.14, 0.6, aim); box(0.02, 0.02, 2.4, L(0xd8d4c8), 0, 0.05, 0.6, aim); }
      else { box(1.2, 0.5, 1.8, wood, 0, 0.45, 0, g); for (const sx of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 10), wood); wh.rotation.z = HPI; wh.position.set(sx * 0.7, 0.5, 0); g.add(wh); } const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.9, 10), iron); tube.rotation.x = HPI; tube.position.z = 0.5; aim.add(tube); }
      g.userData.aim = aim; return g; });
    // sapped holes in the wall face
    this.sgHoles = sg.holes.map(L => { const o = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.4), L0x(0x16120e)); o.position.set(L.x, gy(L.x, W.z0 - 1) + 1.4, W.z0 - 0.45); o.scale.set(0.01, 0.01, 1); sc.add(o); return o; });
    function L0x(c) { return new THREE.MeshBasicMaterial({ color: c }); }
    this.sgv = true;
  }
  // crewing a piece: the camera stands up and behind the gun (a little to the side) so the barrel never hides the field;
  // RMB (empZoom) brings it back down to the sight. Blended in and out; the shot kicks it back.
  empCam(hero, yaw, pitch, dt, look) {
    const sg = this.sim.sg, e = sg && hero.manE >= 0 ? sg.emp[hero.manE] : null, on = !!(e && e.man === hero.id) && hero.downT <= 0;
    const want = on && !this.empZoom ? 1 : 0; this.empK = (this.empK || 0) + (want - (this.empK || 0)) * (1 - Math.exp(-dt * 6)); const k0 = this.empK; if (k0 < 0.01 || !e) return;
    const k = k0 * k0 * (3 - 2 * k0), cam = this.camera, fx = Math.sin(yaw), fz = Math.cos(yaw), kick = (this.empKick || 0) * (this.empKick || 0);
    const bow = e.kind === 'bow', back = (bow ? 2.6 : 3.2) + kick * 0.6, up = (bow ? 2.9 : 3.3) + kick * 0.15, side = bow ? 1.3 : 1.5, gy = e.y + 1.2;
    const px = e.x - fx * back - fz * side, py = gy + up, pz = e.z - fz * back + fx * side;
    cam.position.set(lerp(cam.position.x, px, k), lerp(cam.position.y, py, k), lerp(cam.position.z, pz, k));
    const lp = pitch - 0.2, cp = Math.cos(lp); look.set(lerp(look.x, cam.position.x + fx * cp * 10, k), lerp(look.y, cam.position.y + Math.sin(lp) * 10, k), lerp(look.z, cam.position.z + fz * cp * 10, k));
  }
  // manning a bed crossbow or a gun: your own weapon is slung, your hands are on the piece (tiller and trigger bar, or the
  // two handspikes), and the ground shows where a shot at the present lay would first strike (Sim.sgPredict: the sim's own steps)
  empView(hero, dt) {
    const sg = this.sim.sg, e = sg && hero.manE >= 0 ? sg.emp[hero.manE] : null, on = !!(e && e.man === hero.id) && (this.tp || 0) < 0.3 && hero.downT <= 0;
    if (on && !this.vmEmp) this.buildEmpVM(hero);
    if (!this.vmEmp) return;
    this.vmEmp.visible = on && (this.empK || 0) < 0.4; this.empMark.visible = on; this.empArc.visible = on; if (!on) { this.empHud = null; return; }
    this.vm.visible = false; this.vmArms.visible = false; this.vmShield.visible = false; this.vmBow.visible = false;
    const bow = e.kind === 'bow'; this.vmEmpBow.visible = bow; this.vmEmpGun.visible = !bow;
    this.fovTarget = this.empZoom ? (bow ? 36 : 30) : 70;
    this.empKick = Math.max(0, (this.empKick || 0) - dt * 2.5); const k = this.empKick * this.empKick;
    this.vmEmp.position.set(0, -k * 0.06, k * 0.16); this.vmEmp.rotation.x = k * 0.12;
    this.empN = (this.empN || 0) + 1;
    if (this.empN % 3 === 1 || !this.empP) { const P = this.sim.sgPredict(e, e.yaw, e.pitch || 0); this.empP = P;
      const gy = P.box ? P.y : SIM.terrainH(P.x, P.z); this.empMark.position.set(P.x, gy + 0.06, P.z); const dist = Math.hypot(P.x - e.x, P.z - e.z); 
      // the arc: the sim's points with four dots between each pair (the sim keeps one point per 3 ticks), ending on the fall of shot
      const A = this.empArc.geometry.attributes.position, src = P.pts.concat([P.x, P.box ? P.y : SIM.terrainH(P.x, P.z), P.z]), m0 = src.length / 3; let n = 0;
      for (let i = 0; i < m0 - 1 && n < A.count - 5; i++) for (let s = 0; s < 5; s++) { const f = s / 5, a = i * 3, b = a + 3; A.setXYZ(n++, src[a] + (src[b] - src[a]) * f, src[a + 1] + (src[b + 1] - src[a + 1]) * f, src[a + 2] + (src[b + 2] - src[a + 2]) * f); }
      A.needsUpdate = true; this.empArc.geometry.setDrawRange(0, n); this.empArc.geometry.computeBoundingSphere();
      // the ring: where a ball first strikes it skips and ploughs on (a bolt sticks), so mark the ground it can sweep; foes inside turn it red
      const rr = bow ? 1.6 : 3.2; let foes = 0; if (!P.out) for (const u of this.sim.units) { if (u.dead || u.team === e.team || u.type === 'horse') continue; if (Math.hypot(u.x - P.x, u.z - P.z) < rr) foes++; }
      const vr = Math.max(rr, dist * 0.03), bt = Math.max(1, dist * 0.06), bh = 1 + dist * 0.06; this.empMark.scale.set(vr, 1, vr); this.empMark.children[0].material.color.setHex(foes ? 0xff6a4a : 0xffd27a); { const bm = this.empMark.children.find(c => c.userData.beam); if (bm) { bm.scale.set(bt / vr, bh, bt / vr); bm.position.y = 3 * bh; bm.material.color.setHex(foes ? 0xff6a4a : 0xffe2a0); } }
      this.empHud = { kind: e.kind, cd: e.cd, cdMax: e.cdMax || (bow ? 150 : 270), elev: e.pitch || 0, want: this._viewPitch, dist, wall: !!P.box, out: !!P.out, foes }; }
    else if (this.empHud) { this.empHud.cd = e.cd; this.empHud.elev = e.pitch || 0; this.empHud.want = this._viewPitch; }
    { const m = this.empArc.material, tk = this.empK || 0; m.size = 3.5 + tk * 2.5; m.opacity = (e.cd > 0 ? 0.4 : 0.95) * (0.6 + 0.4 * tk); }
  }
  buildEmpVM(hero) {
    const g = new THREE.Group(); this.camera.add(g); this.vmEmp = g; const mk = (c) => new THREE.MeshLambertMaterial({ color: c, depthTest: false });
    const skin = mk(0xd2ac84), wood = mk(0x5a3a20), dark = mk(0x3a2616), iron = mk(0x4a4c50), sleeve = mk(torsoColor(hero));
    const bx = (p, w, h, d, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.renderOrder = 990; p.add(o); return o; };
    const hand = (p, x, y, z, ry) => { const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry || 0; p.add(h); bx(h, 0.085, 0.07, 0.11, skin, 0, 0, 0); bx(h, 0.09, 0.03, 0.05, skin, 0, 0.045, -0.03); bx(h, 0.1, 0.1, 0.42, sleeve, 0, -0.07, 0.24, 0.32); return h; };
    // 床弩: the tiller running out ahead, its cross handle and the trigger lever under your right hand
    const B = new THREE.Group(); g.add(B); this.vmEmpBow = B;
    bx(B, 0.16, 0.12, 1.5, wood, 0, -0.4, -1.15); bx(B, 0.62, 0.06, 0.07, dark, 0, -0.32, -0.62); bx(B, 0.035, 0.16, 0.035, iron, 0.09, -0.42, -0.66, 0.4); bx(B, 0.02, 0.02, 1.3, mk(0xd8d0bc), 0, -0.33, -1.25);
    hand(B, -0.24, -0.29, -0.62, 0.15); hand(B, 0.2, -0.3, -0.62, -0.15);
    // a gun: both hands on the handspikes that lay the trail, the breech and its touch-hole ahead
    const G = new THREE.Group(); g.add(G); this.vmEmpGun = G;
    for (const s of [-1, 1]) bx(G, 0.06, 0.06, 1.2, wood, s * 0.24, -0.42, -0.85, -0.18, s * 0.28);
    bx(G, 0.34, 0.3, 0.5, iron, 0, -0.55, -1.55); bx(G, 0.12, 0.12, 0.12, iron, 0, -0.42, -1.25); bx(G, 0.02, 0.03, 0.02, mk(0xff8a3a), 0, -0.38, -1.42);
    hand(G, -0.27, -0.33, -0.55, 0.25); hand(G, 0.27, -0.33, -0.55, -0.25);
    // where the shot will fall: a thin ring on the ground and a faint dotted arc
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    ring.rotation.x = -Math.PI / 2; const mark = new THREE.Group(); mark.add(ring); const dot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), ring.material); dot.rotation.x = -Math.PI / 2; mark.add(dot);
    { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.5, depthWrite: false, fog: false })); beam.position.y = 3; beam.userData.beam = true; mark.add(beam); } // a thin post of light so the fall of shot shows at any range
    this.scene.add(mark); this.empMark = mark;
    const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array(360 * 3), 3));
    const arc = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0xffe2a0, size: 4, sizeAttenuation: false, transparent: true, opacity: 0.45, depthWrite: false, fog: false })); arc.frustumCulled = false; this.scene.add(arc); this.empArc = arc;
  }
  updateSiege(dt) {
    const sim = this.sim, sg = sim.sg, W = SIM.TERR.swall, T = this.tmp;
    sg.engines.forEach((e, i) => { const g = this.sgEng[i]; if (!g) return; g.visible = e.hp > 0; if (e.hp <= 0) return;
      // the sim moves an engine in half-second steps; draw it rolling at a steady pace toward where the sim has it
      const ud = g.userData; if (ud.dx === undefined) { ud.dx = e.x; ud.dz = e.z; ud.tx = e.x; ud.tz = e.z; ud.vel = 0; }
      if (e.x !== ud.tx || e.z !== ud.tz) { ud.tx = e.x; ud.tz = e.z; ud.vel = Math.hypot(e.x - ud.dx, e.z - ud.dz) / 0.5; }
      { const ddx = ud.tx - ud.dx, ddz = ud.tz - ud.dz, dd = Math.hypot(ddx, ddz); if (dd > 6) { ud.dx = ud.tx; ud.dz = ud.tz; } else if (dd > 1e-4) { const st = Math.min(dd, Math.max(ud.vel, 0.25) * dt); ud.dx += ddx / dd * st; ud.dz += ddz / dd * st; } }
      const y = SIM.terrainH(ud.dx, ud.dz); g.position.set(ud.dx, y, ud.dz);
      if (e.kind === 'ram') { const sw = e.atGate && sg.gateHp > 0 ? Math.sin(this.time * 4.2) : 0; g.userData.log.position.z = sw * 0.9; }
      if (e.kind === 'tower') { const br = g.userData.bridge; const k = e.docked ? 1 : 0; br.rotation.x += ((k ? 0 : -1.4) - br.rotation.x) * Math.min(1, dt * 3); }
      if (e.burn > 0 && Math.random() < dt * 16) { const S = { ram: [1.4, 3, 3.6], tower: [2.4, 2.4, 10], cart: [1.6, 0.8, 2.6] }[e.kind]; this.sparks.spawn(e.x + rnd(-S[0], S[0]), y + rnd(0.5, S[2]), e.z + rnd(-S[1], S[1]), rnd(-0.4, 0.4), rnd(1.5, 3.5), rnd(-0.4, 0.4), rnd(0.5, 1.1), rnd(0.5, 1.1), 0.1, 1, 0.55, 0.15, 1, 0.8, -2, 0.9, 0.25, 0.05); if (Math.random() < 0.4) this.smoke.spawn(e.x, y + S[2], e.z, rnd(-0.3, 0.3), 1.5, rnd(-0.3, 0.3), 4, 0.8, 3.5, 0.18, 0.16, 0.15, 0.5, 0.8, 0); } });
    sg.lads.forEach((Ld, i) => { const g = this.sgLad[i]; const k = Ld.up ? 1 : Math.min(1, Ld.prog / 210); g.visible = Ld.up || Ld.prog > 0; g.rotation.x = -(HPI - (HPI - 0.44) * k); });
    sg.emp.forEach((e, i) => { const g = this.sgEmp[i]; if (!g) return; g.rotation.y = e.yaw; g.userData.aim.rotation.x = -(e.pitch || 0); });
    sg.holes.forEach((L, i) => { const o = this.sgHoles[i]; const k = L.up ? 1 : Math.min(0.85, L.prog / 320); o.scale.set(Math.max(0.01, k), Math.max(0.01, k), 1); });
    if (this.sgDoors) this.sgDoors.visible = sg.gateHp > 0;
    for (const F of this.sgFills) { const z = sim.missionZone(F.f.key); const k = F.f.done ? 1 : z ? Math.max(0, sg.A === 1 ? -z.ctrl / 100 : z.ctrl / 100) : 0; const show = Math.round(F.n * k); if (show === F.shown) continue; F.shown = show;
      const Dt = SIM.TERR.sditch, per = Math.round(F.f.hw * 2 / 0.9); for (let i = 0; i < F.n; i++) { if (i >= show) { F.m.setMatrixAt(i, T.zero); continue; } const col = i % per, lay = Math.floor(i / per); const x = F.f.x - F.f.hw + 0.45 + col * 0.9; T.m.compose(T.v.set(x, SIM.terrainH(x, Dt.zc) + 0.35 + lay * 0.6, Dt.zc + ((col * 7) % 3 - 1) * 0.6), T.q.setFromEuler(T.e.set(HPI, 0, 0)), T.v2.set(1, Dt.w * 1.1, 1)); F.m.setMatrixAt(i, T.m); }
      F.m.instanceMatrix.needsUpdate = true; }
  }
  updateCamp(dt) {
    for (const f of this.campFires) { f.t += dt; const k = 0.82 + 0.18 * Math.sin(f.t * 11) * Math.sin(f.t * 7.3 + 1) + 0.08 * Math.sin(f.t * 23); f.lt.intensity = 2.3 * k;
      f.fl.forEach((m, i) => { const s = 0.85 + 0.25 * Math.sin(f.t * (9 + i * 3) + i); m.scale.set(1, s, 1); m.rotation.y = f.t * (0.6 + i * 0.3); });
      if (Math.random() < dt * 9) this.sparks.spawn(f.x + rnd(-0.2, 0.2), f.y + 0.6, f.z + rnd(-0.2, 0.2), rnd(-0.3, 0.3), rnd(1.5, 3.2), rnd(-0.3, 0.3), rnd(0.8, 1.6), 0.05, 0.015, 1, 0.65, 0.25, 1, 0.4, 0.1, 0.9, -0.3, 0.2);
      if (Math.random() < dt * 2.5) this.smoke.spawn(f.x, f.y + 1.2, f.z, rnd(-0.1, 0.1), 0.8, rnd(-0.1, 0.1), 4, 0.5, 2.2, 0.16, 0.15, 0.14, 0.3, 0.7, 0); }
    if (this.campFlag) this.campFlag.rotation.y = Math.sin(this.time * 1.3) * 0.25;
  }
  buildDeco() {
    const obs = this.sim.obstacles; const trees = obs.filter(o => o.kind === 0), rocks = obs.filter(o => o.kind === 1);
    const T = this.tmp;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 4.6, 7); const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x4a3524 }), trees.length);
    const pineGeo = new THREE.ConeGeometry(2.3, 6.5, 8); const pine = new THREE.InstancedMesh(pineGeo, new THREE.MeshLambertMaterial({ color: this.biome.pine }), trees.length);
    const mapleGeo = new THREE.IcosahedronGeometry(2.6, 1); const maple = new THREE.InstancedMesh(mapleGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), trees.length);
    trees.forEach((o, i) => {
      const y = terrainH(o.x, o.z), s = o.scale;
      T.m.compose(T.v.set(o.x, y + 2.3 * s, o.z), T.q.setFromEuler(T.e.set(0, o.rot, 0)), T.v2.set(s, s, s)); trunk.setMatrixAt(i, T.m);
      if ((o.variant === 0 && !this.biome.blossom) || this.biome.snow || (this.biome.blossom && o.variant === 0 && Math.abs(o.x) > 60)) { T.m.compose(T.v.set(o.x, y + 6.6 * s, o.z), T.q, T.v2.set(s, s, s)); pine.setMatrixAt(i, T.m); maple.setMatrixAt(i, T.zero); }
      else { T.m.compose(T.v.set(o.x, y + 5.6 * s, o.z), T.q, T.v2.set(s, s * 0.85, s)); maple.setMatrixAt(i, T.m); pine.setMatrixAt(i, T.zero); maple.setColorAt(i, this.biome.blossom ? T.c.setHSL(rnd(0.93, 0.98), rnd(0.55, 0.75), rnd(0.8, 0.88)) : this.biome.maple ? T.c.setHSL(rnd(0.0, 0.09), 0.75, rnd(0.38, 0.5)) : T.c.setHSL(rnd(0.22, 0.3), 0.55, rnd(0.3, 0.42))); }
    });
    [trunk, pine, maple].forEach(m => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.scene.add(m); });
    if (maple.instanceColor) maple.instanceColor.needsUpdate = true;
    const rockGeo = new THREE.DodecahedronGeometry(1, 0); const rock = new THREE.InstancedMesh(rockGeo, new THREE.MeshLambertMaterial({ color: 0x7c7a72 }), rocks.length);
    rocks.forEach((o, i) => { const y = terrainH(o.x, o.z); T.m.compose(T.v.set(o.x, y + o.r * 0.25, o.z), T.q.setFromEuler(T.e.set(0.2, o.rot, 0.1)), T.v2.set(o.r, o.r * 0.75, o.r * 0.9)); rock.setMatrixAt(i, T.m); });
    rock.castShadow = true; rock.receiveShadow = true; this.scene.add(rock);
    if (this.biome.snow) { const snowGeo = new THREE.ConeGeometry(2.0, 1.2, 8); const snow = new THREE.InstancedMesh(snowGeo, new THREE.MeshLambertMaterial({ color: 0xf2f4f6 }), trees.length); trees.forEach((o, i) => { const y = terrainH(o.x, o.z), sc = o.scale; T.m.compose(T.v.set(o.x, y + 9.1 * sc, o.z), T.q.setFromEuler(T.e.set(0, o.rot, 0)), T.v2.set(sc, sc, sc)); snow.setMatrixAt(i, T.m); }); snow.frustumCulled = false; this.scene.add(snow); }
    // fences
    const fences = this.sim.deco.filter(d => d.kind === 'fence');
    if (fences.length) {
      let panels = 0; fences.forEach(f => { panels += Math.ceil(f.len / 1.6); });
      const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), new THREE.MeshLambertMaterial({ color: 0x6a5238 }), panels); const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.25, 0.14), new THREE.MeshLambertMaterial({ color: 0x4f3b28 }), panels + fences.length);
      let fi = 0, pi = 0;
      fences.forEach(f => { const n = Math.ceil(f.len / 1.6); const dx = Math.sin(f.yaw), dz = Math.cos(f.yaw); for (let i = 0; i < n; i++) { const x = f.x + dx * (i + 0.5) * 1.6, z = f.z + dz * (i + 0.5) * 1.6; const y = terrainH(x, z); T.m.compose(T.v.set(x, y + 0.75, z), T.q.setFromEuler(T.e.set(0, f.yaw + HPI, 0)), T.v2.set(1, 1, 1)); fm.setMatrixAt(fi++, T.m); } for (let i = 0; i <= n; i++) { const x = f.x + dx * i * 1.6, z = f.z + dz * i * 1.6; T.m.compose(T.v.set(x, terrainH(x, z) + 0.62, z), T.q.identity(), T.v2.set(1, 1, 1)); pm.setMatrixAt(pi++, T.m); } });
      fm.castShadow = true; pm.castShadow = true; this.scene.add(fm); this.scene.add(pm);
    }
    // rice paddies: shallow water planes
    for (const q of this.sim.zones) {
      const seg = 24; const g = new THREE.PlaneGeometry(q.hw * 2, q.hd * 2, seg, seg); g.rotateX(-HPI); const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, terrainH(q.x + pos.getX(i), q.z + pos.getZ(i)) + 0.07);
      g.computeVertexNormals();
      const w = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x5f7f86, transparent: true, opacity: 0.72 })); w.position.set(q.x, 0, q.z); w.receiveShadow = true; this.scene.add(w);
      const dike = new THREE.Mesh(new THREE.BoxGeometry(q.hw * 2 + 1, 0.35, 0.9), new THREE.MeshLambertMaterial({ color: 0x6a5a3a })); dike.position.set(q.x, terrainH(q.x, q.z - q.hd) + 0.15, q.z - q.hd); this.scene.add(dike);
      const dike2 = dike.clone(); dike2.position.z = q.z + q.hd; dike2.position.y = terrainH(q.x, q.z + q.hd) + 0.15; this.scene.add(dike2);
    }
    // deployment band for the local player's side
    const team = this.localTeam === undefined ? 0 : this.localTeam;
    const dz = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF - 54, 60, 20), new THREE.MeshBasicMaterial({ color: team === 0 ? 0xff8a92 : 0x92afff, transparent: true, opacity: 0.12, depthWrite: false }));
    dz.geometry.rotateX(-HPI); const zc = team === 0 ? -(HALF + 48) / 2 : (HALF + 48) / 2; { const pos = dz.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, terrainH(pos.getX(i), zc + pos.getZ(i)) + 0.12); }
    dz.position.set(0, 0, zc); this.deployBand = dz; this.scene.add(dz);
    // shrine
    const sh = this.sim.deco.find(d => d.kind === 'shrine');
    if (sh) {
      const g = new THREE.Group(); g.position.set(sh.x, terrainH(sh.x, sh.z), sh.z); g.rotation.y = sh.yaw;
      const verm = new THREE.MeshLambertMaterial({ color: 0xb8402a }), dark = new THREE.MeshLambertMaterial({ color: 0x2b2420 }), wall = new THREE.MeshLambertMaterial({ color: 0xd8cdb6 });
      const pl = new THREE.CylinderGeometry(0.28, 0.32, 5.2, 10);
      const p1 = new THREE.Mesh(pl, verm); p1.position.set(1.6, 2.6, 0); const p2 = new THREE.Mesh(pl, verm); p2.position.set(-1.6, 2.6, 0);
      const tile = new THREE.MeshLambertMaterial({ color: this.biome.snow ? 0xe6e9ec : 0x2f5a4a }), goldM = new THREE.MeshLambertMaterial({ color: 0xd8b04a });
      const b1 = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.1, 4), tile); b1.position.y = 5.6; b1.rotation.y = PI / 4; b1.scale.set(1.25, 1, 0.42); const b2 = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.7, 0.36), verm); b2.position.y = 4.6; const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.4), goldM); plaque.position.y = 4.6;
      const hall = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 4.6), new THREE.MeshLambertMaterial({ color: 0x9a3026 })); hall.position.set(0, 1.4, 7);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 1.6, 4), tile); roof.position.set(0, 3.6, 7); roof.rotation.y = PI / 4; roof.scale.set(1.25, 1, 1);
      const base = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0xb8b2a6 })); base.position.set(0, 0.2, 7);
      [p1, p2, b1, b2, plaque, hall, roof, base].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
      this.scene.add(g);
    }
  }
  buildStructures() {
    if (this.sim.battle === 'bjgate') this.buildBeijing();
    const boxes = this.sim.boxes; if (!boxes.length) return; this.buildSpecialStructures(boxes);
    const T = this.tmp; const snow = this.biome.snow;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xa9a49a }), roofMat = new THREE.MeshLambertMaterial({ color: snow ? 0xe6e9ec : 0x3e4044 }), plasterMat = new THREE.MeshLambertMaterial({ color: 0x9a958c }), capMat = new THREE.MeshLambertMaterial({ color: snow ? 0xeef0f2 : 0x34363a });
    const houses = boxes.filter(b => b.kind === 'house' || b.kind === 'hall'), walls = boxes.filter(b => b.kind === 'wall');
    const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, houses.length + 1), rm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.72, 1, 4), roofMat, houses.length + 1);
    // each house stands on a low stone plinth (台基) whose foot goes down to the lowest corner of the slope
    const plm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: snow ? 0x8a8780 : 0x75706a }), houses.length + 1);
    houses.forEach((b, i) => {
      const y = terrainH(b.x, b.z); const wh = b.h * 0.62, fy = this.footY(b), pt = y + 0.32;
      T.m.compose(T.v.set(b.x, (fy + pt) / 2, b.z), T.q.identity(), T.v2.set(b.hw * 2 + 0.36, pt - fy, b.hd * 2 + 0.36)); plm.setMatrixAt(i, T.m);
      T.m.compose(T.v.set(b.x, (pt - 0.05 + y + wh) / 2, b.z), T.q.identity(), T.v2.set(b.hw * 2, y + wh - pt + 0.05, b.hd * 2)); hm.setMatrixAt(i, T.m);
      T.m.compose(T.v.set(b.x, y + wh + b.h * 0.2, b.z), T.q.setFromEuler(T.e.set(0, PI / 4, 0)), T.v2.set(Math.max(b.hw, b.hd) * 2 * 1.15, b.h * 0.42, Math.max(b.hw, b.hd) * 2 * 1.15)); rm.setMatrixAt(i, T.m);
    });
    const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plasterMat, walls.length + 1), cm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), capMat, walls.length + 1);
    walls.forEach((b, i) => { const y = terrainH(b.x, b.z), fy = this.footY(b); T.m.compose(T.v.set(b.x, (fy + y + b.h) / 2, b.z), T.q.identity(), T.v2.set(b.hw * 2, y + b.h - fy, b.hd * 2)); wm.setMatrixAt(i, T.m); T.m.compose(T.v.set(b.x, y + b.h + 0.08, b.z), T.q.identity(), T.v2.set(b.hw * 2 + 0.3, 0.18, b.hd * 2 + 0.3)); cm.setMatrixAt(i, T.m); });
    houses.length || plm.setMatrixAt(0, T.zero); for (let i = houses.length; i < houses.length + 1; i++) plm.setMatrixAt(i, T.zero);
    for (const m of [hm, rm, wm, cm, plm]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.scene.add(m); }
    const temple = this.sim.deco.find(d => d.kind === 'temple');
    if (temple) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 4.2, 8), new THREE.MeshLambertMaterial({ color: 0xb8402a })); const y = terrainH(temple.x, temple.z - 20); g.position.set(temple.x - 3.2, y + 2.1, temple.z - 20); this.scene.add(g); const g2 = g.clone(); g2.position.x = temple.x + 3.2; this.scene.add(g2); const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.5, 0.6), new THREE.MeshLambertMaterial({ color: 0x2b2420 })); beam.position.set(temple.x, y + 4.4, temple.z - 20); this.scene.add(beam); const gr = new THREE.Mesh(new THREE.ConeGeometry(5.6, 1.4, 4), new THREE.MeshLambertMaterial({ color: this.biome.snow ? 0xe6e9ec : 0x2f5a4a })); gr.rotation.y = PI / 4; gr.scale.set(1.2, 1, 0.45); gr.position.set(temple.x, y + 5.3, temple.z - 20); this.scene.add(gr); }
  }
  buildSpecialStructures(boxes) {
    const T = this.tmp, snow = this.biome.snow;
    const add = (geo, color, x, y, z, sx, sy, sz, ry) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; this.scene.add(m); return m; };
    const box = new THREE.BoxGeometry(1, 1, 1), pyr = new THREE.ConeGeometry(0.72, 1, 4);
    // Liaoyang gate tower: a massive grey brick base, then a two-storey red timber tower under double hip roofs
    // mantlets: plank shields on props, painted with each army's colours
    // a mantlet is a wall of planks, no two quite alike, their feet dug into the ground, held by two cross battens behind
    { const ms = boxes.filter(q => q.kind === 'mantlet'); if (ms.length) { const nP = ms.map(b => Math.max(3, Math.round(Math.max(b.hw, b.hd) * 2 / 0.3))), NP = nP.reduce((a, c) => a + c, 0);
      const pm = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), NP), bt = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x3e2c1c }), ms.length * 2), fm = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), ms.length * 2), sm2 = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x4a3420 }), ms.length * 2);
      const q = new THREE.Quaternion(), off = new THREE.Vector3(); let pk = 0;
      ms.forEach((b, i) => { const along = b.hw >= b.hd, L = (along ? b.hw : b.hd) * 2, faceZ = along ? (b.z > 0 ? -1 : 1) : (b.x > 0 ? -1 : 1), ry = along ? 0 : HPI, tilt = 0.08 * faceZ;
        const put = (m, idx, lx, ly, lz, sx, sy, sz, rx, rz) => { const e = T.e.set(tilt + (rx || 0), ry, rz || 0, 'YXZ'); q.setFromEuler(e); off.set(lx, ly, lz).applyQuaternion(T.q.setFromEuler(T.e.set(tilt, ry, 0, 'YXZ'))); const wx = b.x + off.x, wz = b.z + off.z;
          T.m.compose(T.v.set(wx, terrainH(wx, wz) + off.y, wz), q, T.v2.set(sx, sy, sz)); m.setMatrixAt(idx, T.m); T.e.order = 'XYZ'; };
        const n = nP[i], w = L / n;
        for (let j = 0; j < n; j++) { const hj = uhash(i * 31 + j, 5), hh = b.h * (0.93 + 0.13 * hj) + 0.2; put(pm, pk, -L / 2 + (j + 0.5) * w, hh / 2 - 0.2, 0, w * 0.965, hh, 0.11, 0, (hj - 0.5) * 0.016); pm.setColorAt(pk++, T.c.setHSL(0.075 + hj * 0.012, 0.36 + hj * 0.06, 0.205 + uhash(i * 31 + j, 9) * 0.04)); }
        for (const k of [0, 1]) { put(bt, i * 2 + k, 0, k ? b.h * 0.78 : 0.32, -faceZ * 0.085, L * 0.97, 0.11, 0.05);
          put(fm, i * 2 + k, (k ? 0.25 : -0.25) * L, b.h * 0.62, faceZ * 0.065, L * 0.35, 0.18, 0.02); fm.setColorAt(i * 2 + k, T.c.set(b.z > 0 ? 0xb8262a : 0xd8b03c));
          put(sm2, i * 2 + k, (k ? 0.35 : -0.35) * L, 0.55, -faceZ * 0.5, 0.1, 1.3, 0.1, faceZ * 0.9 - tilt); } });
      for (const m of [pm, fm]) if (m.instanceColor) m.instanceColor.needsUpdate = true; for (const m of [pm, bt, fm, sm2]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.scene.add(m); } } }
    // siege engines: the battering ram's roofed cart and the scaling ladders
    if (this.sim.ram) { const g = new THREE.Group(); const wood = new THREE.MeshLambertMaterial({ color: 0x5a3a20 }), hide = new THREE.MeshLambertMaterial({ color: 0x7a6040 }), iron = new THREE.MeshLambertMaterial({ color: 0x3a3a3c });
      const mb = (w, h, d, m, x, y, z, rx, rz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; o.castShadow = true; g.add(o); return o; };
      mb(2.6, 0.25, 5, wood, 0, 0.7, 0); for (const sx of [-1, 1]) { mb(0.18, 2.6, 0.18, wood, sx * 1.2, 2, -2.2); mb(0.18, 2.6, 0.18, wood, sx * 1.2, 2, 2.2); const r1 = mb(1.7, 0.12, 5.4, hide, sx * 0.7, 3.4, 0, 0, sx * 0.55); }
      for (const z of [-2, 2]) for (const sx of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 10), wood); wh.rotation.z = HPI; wh.position.set(sx * 1.4, 0.55, z); g.add(wh); }
      const log = new THREE.Group(); log.position.set(0, 1.9, 0); const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 6.2, 10), wood); lg.rotation.x = HPI; log.add(lg); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.7, 10), iron); tip.rotation.x = HPI; tip.position.z = 3.3; log.add(tip); g.add(log);
      this.scene.add(g); this.ramVis = { g, log }; }
    this.ladderVis = (this.sim.ladders || []).map(L => { const g = new THREE.Group(); const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c }); const H = 6;
      for (const sx of [-0.45, 0.45]) { const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 0.12), wood); r1.position.set(sx, H / 2, 0); r1.castShadow = true; g.add(r1); }
      for (let k = 0; k < 9; k++) { const rg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), wood); rg.position.set(0, 0.4 + k * 0.62, 0); g.add(rg); }
      const y = terrainH(L.x, L.z - L.hd - 2); g.position.set(L.x, y, L.z - L.hd - 2.2); g.visible = false; this.scene.add(g); return g; });
    // supply wagons: ox-drawn carts under oiled canvas
    this.wagonVis = (this.sim.wagons || []).map(w => { const g = new THREE.Group(); const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c }), canvas = new THREE.MeshLambertMaterial({ color: w.team === 0 ? 0xd8c8a0 : 0xc8b888 }), ox = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
      const m = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
      m(new THREE.BoxGeometry(1.8, 0.7, 3.2), wood, 0, 0.9, 0); const cov = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 10, 1, false, 0, Math.PI), canvas); cov.rotation.z = HPI; cov.rotation.y = HPI; cov.position.y = 1.25; cov.scale.set(1, 1, 0.9); cov.castShadow = true; g.add(cov);
      for (const zx of [[-0.95, -1], [0.95, -1], [-0.95, 1], [0.95, 1]]) { const wh = m(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 10), wood, zx[0], 0.5, zx[1]); wh.rotation.z = HPI; }
      for (let k = 0; k < 4; k++) m(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshLambertMaterial({ color: k % 2 ? 0x5a3a20 : 0x7a5a30 }), -0.5 + (k % 2) * 1, 1.4, -1.2 + k * 0.2).visible = false;
      const body = m(new THREE.BoxGeometry(0.9, 0.9, 1.8), ox, 0, 0.9, -2.9); m(new THREE.BoxGeometry(0.5, 0.5, 0.6), ox, 0, 1.2, -4); m(new THREE.BoxGeometry(0.9, 0.08, 0.08), new THREE.MeshLambertMaterial({ color: 0xd8d0b8 }), 0, 1.5, -4.1);
      g.position.set(w.x, terrainH(w.x, w.z), w.z); if (w.team === 1) g.rotation.y = PI; this.scene.add(g); return { g, cov, burnt: false }; });
    // the siege gate: heavy studded timber doors under a gatehouse roof
    this.gateMeshes = [];
    for (const b of boxes.filter(q => q.kind === 'gate')) {
      const y = terrainH(b.x, b.z);
      this.gateMeshes.push(add(box, 0x5a2a1a, b.x, y + b.h / 2, b.z, b.hw * 2, b.h, b.hd * 2));
      for (let i = -2; i <= 2; i++) this.gateMeshes.push(add(box, 0x2a2420, b.x + i * b.hw * 0.38, y + b.h * 0.5, b.z - b.hd - 0.02, 0.12, b.h * 0.9, 0.06));
      this.gateMeshes.push(add(box, 0x8a867e, b.x - b.hw - 1, y + 2.6, b.z, 2, 5.2, b.hd * 2 + 1)); this.gateMeshes.push(add(box, 0x8a867e, b.x + b.hw + 1, y + 2.6, b.z, 2, 5.2, b.hd * 2 + 1));
      add(box, 0x9a2a22, b.x, y + 6.0, b.z, b.hw * 2 + 4, 1.8, b.hd * 2 + 1); add(pyr, snow ? 0xe8ebee : 0x2f3a3a, b.x, y + 7.5, b.z, b.hw * 2 + 7, 1.5, b.hd * 2 + 4, PI / 4);
      this.gateMeshes.length = 1 + 5; // the doors and studs go when breached; the towers stay
    }
    for (const b of boxes.filter(q => q.kind === 'keep')) {
      const y = terrainH(b.x, b.z); const w = b.hw * 2; const tileC = snow ? 0xe8ebee : 0x2f3a3a;
      add(box, 0x8d8a82, b.x, y + 3, b.z, w * 1.9, 6, w * 1.4); add(box, 0x6a6660, b.x, y + 6.15, b.z, w * 1.95, 0.3, w * 1.45);
      add(box, 0x1a1816, b.x, y + 1.6, b.z - w * 0.7, 2.6, 3.2, 0.3);
      add(box, 0x9a2a22, b.x, y + 7.8, b.z, w * 1.3, 3.0, w * 0.9); add(pyr, tileC, b.x, y + 9.9, b.z, w * 2.4, 1.4, w * 1.7, PI / 4);
      add(box, 0x9a2a22, b.x, y + 11.4, b.z, w * 1.0, 2.4, w * 0.7); add(pyr, tileC, b.x, y + 13.4, b.z, w * 1.9, 1.8, w * 1.3, PI / 4);
      add(box, 0xd8b44a, b.x, y + 11.6, b.z - w * 0.36, 1.2, 0.6, 0.1);
    }
    // earthen ramparts with a grass cap; palisades of sharpened stakes
    const ramp = boxes.filter(q => q.kind === 'rampart'), pal = boxes.filter(q => q.kind === 'palisade');
    if (ramp.length) { const em = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x8a867e }), ramp.length), gm = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: snow ? 0xe8ebee : 0x6a6660 }), ramp.length);
      ramp.forEach((b, i) => { const y = terrainH(b.x, b.z); T.m.compose(T.v.set(b.x, y + b.h / 2 - 0.2, b.z), T.q.identity(), T.v2.set(b.hw * 2.25, b.h + 0.4, b.hd * 2.25)); em.setMatrixAt(i, T.m); T.m.compose(T.v.set(b.x, y + b.h + 0.4, b.z), T.q.identity(), T.v2.set(b.hw * 1.1, 0.8, b.hd * 1.1)); gm.setMatrixAt(i, T.m); });
      for (const m of [em, gm]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.scene.add(m); } }
    if (pal.length) { // stakes run along the palisade's long side, one every ~0.55 m, so every metre of the collision box is a visible wall
      const cnt = pal.map(b => Math.max(5, Math.ceil(Math.max(b.hw, b.hd) * 2 / 0.55))); const n = cnt.reduce((a, c) => a + c, 0);
      const sm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0, 0.14, 1, 5), new THREE.MeshLambertMaterial({ color: 0x6a4e30 }), n), bm = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x5a4028 }), pal.length * 2); let k = 0;
      pal.forEach((b, i) => { const alongX = b.hw >= b.hd, L = (alongX ? b.hw : b.hd) * 2, N = cnt[i];
        for (let j = 0; j < N; j++) { const t = -L / 2 + (j + 0.5) * (L / N), w = Math.sin(j * 2.1) * 0.12, x = alongX ? b.x + t : b.x + w, z = alongX ? b.z + w : b.z + t, y = terrainH(x, z), hh = b.h > 0 ? Math.max(1.6, b.h * 1.25) : 2.1;
          T.m.compose(T.v.set(x, y + hh / 2, z), T.q.setFromEuler(T.e.set(Math.sin(j * 3.7) * 0.12, 0, Math.cos(j * 1.3) * 0.08)), T.v2.set(1, hh, 1)); sm.setMatrixAt(k++, T.m); }
        for (let r = 0; r < 2; r++) { const y = terrainH(b.x, b.z); T.m.compose(T.v.set(b.x, y + 0.55 + r * 0.6, b.z), T.q.identity(), T.v2.set(alongX ? L : 0.18, 0.14, alongX ? 0.18 : L)); bm.setMatrixAt(i * 2 + r, T.m); } });
      for (const m of [sm, bm]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.scene.add(m); } }
  }
  // rivers, moats and the sea, printed with Hokusai-style wave lines; bridges and fords
  buildWater() {
    const L = this.sim.layout; this.waterMats = []; if (!L) return;
    const snow = this.biome.snow;
    const mkMat = () => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, deep: { value: new THREE.Color(snow ? 0x5f7286 : 0x2c4d6e) }, light: { value: new THREE.Color(snow ? 0x9fb0be : 0x5c8fa0) }, foam: { value: new THREE.Color(snow ? 0xf2f4f6 : 0xf0ead8) }, ice: { value: snow ? 1 : 0 } },
      vertexShader: 'varying vec3 vW; varying float vE; attribute float edge; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vE = edge; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'uniform float time, ice; uniform vec3 deep, light, foam; varying vec3 vW; varying float vE;',
        'void main(){ vec2 p = vW.xz;',
        '  float b = 0.5 + 0.5 * sin(p.x * 0.05 + p.y * 0.04 + sin(p.y * 0.03) * 2.0);',
        '  vec3 c = mix(deep, light, b * 0.6 + vE * 0.4);',
        '  float w1 = sin(p.x * 0.42 + sin(p.y * 0.23 + time * 0.5) * 2.6 + time * 0.9);',
        '  float w2 = sin(p.y * 0.37 - sin(p.x * 0.19 - time * 0.4) * 2.2 - time * 0.7);',
        '  float lines = max(smoothstep(0.93, 0.985, w1), smoothstep(0.95, 0.99, w2) * 0.7) * (1.0 - ice * 0.7);',
        '  c = mix(c, foam, lines * 0.85 + smoothstep(0.75, 1.0, vE) * 0.45);',
        '  gl_FragColor = vec4(c, 0.93); }'].join('\n') }); this.waterMats.push(m); return m; };
    const strip = (pts) => { // pts: [[lx, ly, lz, rx, ry, rz], ...] → triangle strip with an edge attribute
      const n = pts.length, pos = new Float32Array(n * 3 * 3), edge = new Float32Array(n * 3), idx = [];
      for (let i = 0; i < n; i++) { const q = pts[i]; pos.set([q[0], q[1], q[2], (q[0] + q[3]) / 2, (q[1] + q[4]) / 2, (q[2] + q[5]) / 2, q[3], q[4], q[5]], i * 9); edge.set([1, 0, 1], i * 3); if (i < n - 1) { const a = i * 3, c = (i + 1) * 3; idx.push(a, c, a + 1, a + 1, c, c + 1, a + 1, c + 1, a + 2, a + 2, c + 1, c + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('edge', new THREE.BufferAttribute(edge, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mkMat()); m.frustumCulled = false; m.renderOrder = 2; this.scene.add(m); };
    const rv = L.river;
    if (rv) {
      const pts = []; const at = (al, ac) => rv.axis === 'x' ? [al, ac] : [ac, al];
      for (let al = -HALF - 40; al <= HALF + 40; al += 2.5) {
        const c = rv.c0 + rv.amp * Math.sin(al * rv.freq + rv.ph); const e1 = at(al, c - rv.w), e2 = at(al, c + rv.w);
        const lvl = Math.min(terrainH(e1[0], e1[1]), terrainH(e2[0], e2[1])) - rv.depth * 0.32; const a = at(al, c - rv.w * 0.86), b = at(al, c + rv.w * 0.86);
        pts.push([a[0], lvl, a[1], b[0], lvl, b[1]]);
      }
      strip(pts);
      for (const d of this.sim.deco.filter(q => q.kind === 'bridge' || q.kind === 'ford')) this.buildCrossing(d, rv);
    }
    const m = L.moat;
    if (m) { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, sx = Math.sin(a), cz = Math.cos(a); const lvl = terrainH(m.x + sx * (m.R + m.w), m.z + cz * (m.R + m.w)) - m.depth * 0.35; pts.push([m.x + sx * (m.R - m.w * 0.85), lvl, m.z + cz * (m.R - m.w * 0.85), m.x + sx * (m.R + m.w * 0.85), lvl, m.z + cz * (m.R + m.w * 0.85)]); } strip(pts);
      // stone-faced earth causeways at the gates
      for (const g of m.gates) { const dx = g[0] - m.x, dz = g[1] - m.z, l = Math.hypot(dx, dz); const ang = Math.atan2(dx, dz); const cw = new THREE.Mesh(new THREE.BoxGeometry(9, 1, m.w * 2.6), new THREE.MeshLambertMaterial({ color: 0x8a8274 })); cw.position.set(g[0], terrainH(g[0], g[1]) - 0.45, g[1]); cw.rotation.y = ang; cw.receiveShadow = true; this.scene.add(cw); } }
    if (L.sea) { const g = new THREE.PlaneGeometry(420, 1100, 1, 1); g.rotateX(-Math.PI / 2); g.setAttribute('edge', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0]), 1)); const sm = new THREE.Mesh(g, mkMat()); sm.position.set(L.sea.x0 + 14 + 210, -2.6, 0); sm.renderOrder = 2; this.scene.add(sm);
      const shore = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 1100), new THREE.MeshBasicMaterial({ color: 0xf2ead6, transparent: true, opacity: 0.7, depthWrite: false })); shore.position.set(L.sea.x0 + 16, -2.5, 0); this.scene.add(shore); }
  }
  buildCrossing(d, rv) {
    const along = d.at, c = d.c; const P = (al, ac) => rv.axis === 'x' ? [al, ac] : [ac, al];
    if (d.kind === 'ford') { for (let i = 0; i < 18; i++) { const al = along + (Math.random() - 0.5) * d.hw * 1.6, ac = c + (i / 17 - 0.5) * rv.w * 2.2; const p = P(al, ac); const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x8a867c })); r.position.set(p[0], terrainH(p[0], p[1]) + 0.1, p[1]); r.scale.y = 0.45; this.scene.add(r); } return; }
    // arched wooden bridge with vermilion railings
    const span = rv.w * 2 + 5, N = 10, hw = d.hw, verm = this.sim.battle === 'toba' ? 0xb8402a : 0x6a4e30;
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x6b5236 }), railMat = new THREE.MeshLambertMaterial({ color: verm });
    const base = (ac) => { const p = P(along, ac); return terrainH(p[0], p[1]); };
    const y0 = Math.max(base(c - span / 2), base(c + span / 2));
    const pt = (t) => { const ac = c - span / 2 + span * t; const p = P(along, ac); const e1 = P(along - hw, ac), e2 = P(along + hw, ac); return [p[0], Math.max(terrainH(p[0], p[1]), terrainH(e1[0], e1[1]), terrainH(e2[0], e2[1])) - 0.1, p[1]]; }; // the deck lies where the men actually walk (the sim's ground), so nobody sinks into it
    for (let i = 0; i < N; i++) {
      const a = pt(i / N), b = pt((i + 1) / N); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2; const L2 = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(rv.axis === 'x' ? hw * 2 : L2, 0.25, rv.axis === 'x' ? L2 : hw * 2), deckMat); plank.position.set(mx, my, mz);
      const pitch = Math.atan2(b[1] - a[1], rv.axis === 'x' ? b[2] - a[2] : b[0] - a[0]); if (rv.axis === 'x') plank.rotation.x = -pitch; else plank.rotation.z = pitch; plank.castShadow = true; plank.receiveShadow = true; this.scene.add(plank);
      for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), railMat); const off = rv.axis === 'x' ? [s * (hw - 0.1), 0] : [0, s * (hw - 0.1)]; post.position.set(a[0] + off[0], a[1] + 0.55, a[2] + off[1]); this.scene.add(post);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(rv.axis === 'x' ? 0.12 : L2, 0.12, rv.axis === 'x' ? L2 : 0.12), railMat); rail.position.set(mx + off[0], my + 1.0, mz + off[1]); if (rv.axis === 'x') rail.rotation.x = -pitch; else rail.rotation.z = pitch; this.scene.add(rail); }
    }
    for (const t of [0.25, 0.5, 0.75]) { const p = pt(t); const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 4, 6), deckMat); pile.position.set(p[0], p[1] - 2.1, p[2]); this.scene.add(pile); }
  }
  buildFigures() {
    const N = this.sim.units.length + MAXRAG; this.figN = N;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mk = (geo, color, mult, cast) => { const n = N * (mult || 1); const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), n); m.frustumCulled = false; m.castShadow = cast !== false; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.userData.mult = mult || 1; for (let i = 0; i < n; i++) { m.setMatrixAt(i, this.tmp.zero); m.setColorAt(i, this.tmp.c.set(color)); } this.scene.add(m); return m; };
    // soft, rounded bodies: superellipsoid torso and head, capsule limbs, round fists
    const RB = (e, w, h) => this.lowfx ? box : roundBox(e, w, h);
    const headG = RB(0.62, 10, 7), torsoG = RB(0.38, 10, 6), hipG = RB(0.45, 8, 5), limbG = this.lowfx ? box : capsule(7, 0.32), handG = RB(0.8, 6, 4), footG = RB(0.45, 6, 4);
    this.fig = {
      head: mk(headG, PAL.skin), torso: mk(torsoG, 0x888888), hips: mk(hipG, 0x888888),
      uarmL: mk(limbG, 0x888888), uarmR: mk(limbG, 0x888888), farmL: mk(limbG, 0x888888), farmR: mk(limbG, 0x888888),
      thighL: mk(limbG, 0x888888), thighR: mk(limbG, 0x888888), shinL: mk(limbG, 0x888888), shinR: mk(limbG, 0x888888),
      hand: mk(handG, PAL.skin, 2, false), foot: mk(footG, 0x2a2420, 2),
      jingasa: mk(new THREE.ConeGeometry(0.34, 0.14, 10), PAL.jingasa), kabuto: mk(new THREE.ConeGeometry(0.24, 0.3, 8), PAL.iron), cap: mk(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 10), PAL.cap), kepi: mk(box, PAL.kepi), band: mk(box, PAL.band),
      blade: mk(box, PAL.steel), hilt: mk(box, 0x1e1b2a), rifle: mk(box, PAL.wood), barrel: mk(box, 0x55595e), yari: mk(box, PAL.yari), pistol: mk(box, 0x3a3a3f),
      gb: mk(RB(0.3, 6, 4), 0xffffff, GEAR_K.b), gc: mk(new THREE.ConeGeometry(0.5, 1, 10), 0xffffff, GEAR_K.c), gy: mk(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), 0xffffff, GEAR_K.y),
      shield: mk(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), 0xa8844a), boss: mk(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), 0x8a2a20),
      bow: mk(box, 0x5a3b1e, 2), bstring: mk(box, 0xe8e2cc, 2, false), arrow: mk(box, 0x8a6a3a, 1, false), rod: mk(box, 0x9aa0a6, 1, false), flask: mk(box, 0x6b4426, 1, false), twig: mk(box, 0x6b6a3a, 9, false),
    };
    this.anims = [];
    this.tg = { wp: [0, 0, 0], wd: [0, 1, 0], rh: [0, 0, 0], lh: [0, 0, 0] };
    this.fdt = 1 / 60;
    const units = this.sim.units;
    for (let i = 0; i < units.length; i++) this.colorFigure(i, units[i]);
  }
  colorFigure(slot, u) {
    { const f = this.fig, z = this.tmp.zero, g = gearFor(u); const cnt = { b: 0, c: 0, y: 0 }; for (const k of ['b', 'c', 'y']) for (let i = 0; i < GEAR_K[k]; i++) f['g' + k].setMatrixAt(slot * GEAR_K[k] + i, z);
      for (const p of g.parts) { const i = cnt[p.m]++; if (i >= GEAR_K[p.m]) continue; p.idx = i; f['g' + p.m].setColorAt(slot * GEAR_K[p.m] + i, this.tmp.c.set(p.k)); }
      for (const k of ['b', 'c', 'y']) if (f['g' + k].instanceColor) f['g' + k].instanceColor.needsUpdate = true; }
    const c = this.tmp.c; const f = this.fig; const tc = (GEAR_HOOK.torso && GEAR_HOOK.torso(u)) || torsoColor(u), lc = (GEAR_HOOK.legs && GEAR_HOOK.legs(u)) || legColor(u); // an edition may recolour the body under the gear
    for (const k of ['torso', 'uarmL', 'uarmR']) f[k].setColorAt(slot, c.set(tc));
    c.set(tc).multiplyScalar(0.82); f.farmL.setColorAt(slot, c); f.farmR.setColorAt(slot, c);
    for (const k of ['thighL', 'thighR', 'shinL', 'shinR', 'hips']) f[k].setColorAt(slot, c.set(lc));
    { const t = uhash(u.id, 3); c.setRGB(0.9 - t * 0.14, 0.76 - t * 0.16, 0.6 - t * 0.17); if (u.type === 'byakkotai') c.setRGB(0.92, 0.79, 0.66); if (u.look && u.look.skin) c.set(u.look.skin); f.head.setColorAt(slot, c); f.hand.setColorAt(slot * 2, c); f.hand.setColorAt(slot * 2 + 1, c); }
    if (u.type === 'hero') f.kabuto.setColorAt(slot, c.set(PAL.gold));
    f.hilt.setColorAt(slot, c.set(u.weapon === 'yari' ? 0xc8281e : 0x5a1a1a)); f.pistol.setColorAt(slot, c.set(0x5a4a2a)); f.barrel.setColorAt(slot, c.set(u.type === 'rifle_spencer' ? 0x3a3a3a : 0x55595e));
    for (const k of ['torso', 'hips', 'uarmL', 'uarmR', 'farmL', 'farmR', 'thighL', 'thighR', 'shinL', 'shinR', 'head', 'kabuto', 'hand', 'hilt', 'pistol', 'barrel']) f[k].instanceColor.needsUpdate = true;
  }
  hideFigure(slot) { const z = this.tmp.zero; for (const k in this.fig) { const m = this.fig[k], n = m.userData.mult; for (let j = 0; j < n; j++) m.setMatrixAt(slot * n + j, z); } }
  anim(id) {
    let a = this.anims[id];
    if (!a) a = this.anims[id] = { init: false, ph: Math.random() * 6.28, spd: 0, wp: [0, 0, 0], wd: [0, 1, 0], rh: [0, 0, 0], lh: [0, 0, 0], lean: 0, twist: 0, roll: 0, crouch: 0, lunge: 0, stance: 0, mfx: 0, mfz: 1, recoil: 0, hph: Math.random() * 6.28, hspd: 0, hbob: 0, hpitch: 0, trail: null };
    return a;
  }
  // box spanning a→b; width w along the reference side axis (this._sx..), depth d
  seg(mesh, idx, ax, ay, az, bx, by, bz, w, d) {
    let yx = bx - ax, yy = by - ay, yz = bz - az; const L = Math.sqrt(yx * yx + yy * yy + yz * yz) || 1e-4; yx /= L; yy /= L; yz /= L;
    let sx = this._sx, sy = this._sy, sz = this._sz; let dp = sx * yx + sy * yy + sz * yz; sx -= yx * dp; sy -= yy * dp; sz -= yz * dp;
    let sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
    if (sl < 1e-3) { sx = 0; sy = 1; sz = 0; dp = yy; sx -= yx * dp; sy -= yy * dp; sz -= yz * dp; sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1; }
    sx /= sl; sy /= sl; sz /= sl;
    const zx = sy * yz - sz * yy, zy = sz * yx - sx * yz, zz = sx * yy - sy * yx;
    this.tmp.m.set(sx * w, yx * L, zx * d, (ax + bx) / 2, sy * w, yy * L, zy * d, (ay + by) / 2, sz * w, yz * L, zz * d, (az + bz) / 2, 0, 0, 0, 1);
    mesh.setMatrixAt(idx, this.tmp.m);
  }
  drawGear(slot, u, fr, G, B, noHat) {
    const f = this.fig, T = this.tmp, g = gearFor(u);
    for (const p of g.parts) {
      if (p.idx === undefined) continue; const mesh = f['g' + p.m], idx = slot * GEAR_K[p.m] + p.idx;
      if (noHat && p.hat) { mesh.setMatrixAt(idx, T.zero); continue; }
      if (p.f === 'seg') { if (!G) { mesh.setMatrixAt(idx, T.zero); continue; } const a = GJ[p.a], z = GJ[p.z]; const ax = G[a] + (G[z] - G[a]) * p.t0, ay = G[a + 1] + (G[z + 1] - G[a + 1]) * p.t0, az = G[a + 2] + (G[z + 2] - G[a + 2]) * p.t0; const bx = G[a] + (G[z] - G[a]) * p.t1, by = G[a + 1] + (G[z + 1] - G[a + 1]) * p.t1, bz = G[a + 2] + (G[z + 2] - G[a + 2]) * p.t1; this.seg(mesh, idx, ax, ay, az, bx, by, bz, p.w, p.d); continue; }
      const F = fr[p.f]; if (!F) { mesh.setMatrixAt(idx, T.zero); continue; }
      // cloth and plates that hang from a joint follow the limb under them (no knee through the skirt, no arm through the pauldron)
      let Bf = F[3], o = p.o, fx0 = F[0], fy0 = F[1], fz0 = F[2], ps = p.s;
      if (G) { const h = this.gearFollow(u, p, F, G); if (h) { Bf = h.B; o = h.o; fx0 = h.x; fy0 = h.y; fz0 = h.z; ps = h.s || p.s; } }
      const cx = fx0 + Bf[0] * o[0] + Bf[3] * o[1] + Bf[6] * o[2], cy = fy0 + Bf[1] * o[0] + Bf[4] * o[1] + Bf[7] * o[2], cz = fz0 + Bf[2] * o[0] + Bf[5] * o[1] + Bf[8] * o[2];
      if (!p.r) { this.boxB(mesh, idx, cx, cy, cz, Bf, ps[0], ps[1], ps[2]); continue; }
      T.m.set(Bf[0], Bf[3], Bf[6], cx, Bf[1], Bf[4], Bf[7], cy, Bf[2], Bf[5], Bf[8], cz, 0, 0, 0, 1).multiply(T.r.makeRotationFromEuler(T.e.set(p.r[0], p.r[1], p.r[2]))).multiply(T.s.makeScale(ps[0], ps[1], ps[2])); mesh.setMatrixAt(idx, T.m);
    }
  }
  boxB(mesh, idx, cx, cy, cz, B, sx, sy, sz) {
    this.tmp.m.set(B[0] * sx, B[3] * sy, B[6] * sz, cx, B[1] * sx, B[4] * sy, B[7] * sz, cy, B[2] * sx, B[5] * sy, B[8] * sz, cz, 0, 0, 0, 1);
    mesh.setMatrixAt(idx, this.tmp.m);
  }
  buildHorses() {
    const N = this.sim.units.filter(u => u.type === 'horse' || u.mounted).length + 1; this.horseN = N;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mk = (color, mult) => { const n = N * (mult || 1); const m = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), n); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.userData.mult = mult || 1; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < n; i++) { m.setMatrixAt(i, this.tmp.zero); m.setColorAt(i, this.tmp.c.set(color)); } this.scene.add(m); return m; };
    this.horse = { body: mk(0x4a3122), neck: mk(0x4a3122), head: mk(0x3d2819), legU: mk(0x3a2518, 4), legL: mk(0x3a2518, 4), tail: mk(0x221410), saddle: mk(0x6b1f1f) };
    this.horseSlot = new Map(); let k = 0;
    for (const u of this.sim.units) if (u.type === 'horse' || u.mounted) {
      this.horseSlot.set(u.id, k);
      const hc = u.type === 'horse' ? 0x2b2b2b : [0x5a3a26, 0x3f2a1c, 0x6b4a30, 0x2e2420][u.id % 4];
      for (const p of ['body', 'neck']) this.horse[p].setColorAt(k, this.tmp.c.set(hc));
      for (let j = 0; j < 4; j++) { this.horse.legU.setColorAt(k * 4 + j, this.tmp.c.set(hc)); this.horse.legL.setColorAt(k * 4 + j, this.tmp.c.set(hc).multiplyScalar(0.8)); }
      this.horse.head.setColorAt(k, this.tmp.c.set(hc).multiplyScalar(0.85));
      this.horse.saddle.setColorAt(k, this.tmp.c.set(TEAM_COL[u.team]));
      k++;
    }
    for (const key in this.horse) if (this.horse[key].instanceColor) this.horse[key].instanceColor.needsUpdate = true;
  }
  hideHorse(hs) { for (const k in this.horse) { const m = this.horse[k], n = m.userData.mult || 1; for (let j = 0; j < n; j++) m.setMatrixAt(hs * n + j, this.tmp.zero); } }
  buildCannons() {
    const cannons = this.sim.units.filter(u => u.def.ai === 'cannon'); const N = cannons.length + 1;
    this.cannonSlot = new Map(); cannons.forEach((u, i) => this.cannonSlot.set(u.id, i));
    this._cannonCols = cannons.map(u => u.type === 'cannon4' ? 0x3a3a3c : 0x9a7a38);
    const mk = (geo, color) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), N); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < N; i++) m.setMatrixAt(i, this.tmp.zero); this.scene.add(m); return m; };
    this.cannon = { barrel: mk(new THREE.CylinderGeometry(0.12, 0.2, 2.7, 12), 0x8a6a2a), muzzle: mk(new THREE.CylinderGeometry(0.17, 0.15, 0.22, 12), 0x8a6a2a), gbarrel: mk(new THREE.BoxGeometry(0.1, 0.1, 0.5), 0x2a2420), hopper: mk(new THREE.BoxGeometry(0.75, 0.6, 0.95), 0x8a2a1e), carriage: mk(new THREE.BoxGeometry(0.5, 0.32, 1.9), 0x5c3f27), wheelL: mk(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 12), 0x6b4a2a), wheelR: mk(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 12), 0x6b4a2a), axle: mk(new THREE.BoxGeometry(1.3, 0.12, 0.12), 0x3a2a1a) };
    this._cannonCols.forEach((c, i) => { this.cannon.barrel.setColorAt(i, this.tmp.c.set(c)); this.cannon.muzzle.setColorAt(i, this.tmp.c.set(c)); }); if (this.cannon.barrel.instanceColor) { this.cannon.barrel.instanceColor.needsUpdate = true; this.cannon.muzzle.instanceColor.needsUpdate = true; }
  }
  buildMarkers() {
    const ring = new THREE.RingGeometry(0.55, 0.72, 20); ring.rotateX(-HPI);
    this.rings = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: 0x9be36a, transparent: true, opacity: 0.85, depthWrite: false }), 200); this.rings.frustumCulled = false; this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.rings);
    const cone = new THREE.ConeGeometry(0.8, 2.4, 6);
    this.marks = new THREE.InstancedMesh(cone, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), 64); this.marks.frustumCulled = false; this.marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.marks);
    for (let i = 0; i < 64; i++) this.marks.setColorAt(i, this.tmp.c.set(0xffffff));
    const pole = new THREE.BoxGeometry(0.05, 4.4, 0.05); const flag = new THREE.BoxGeometry(0.02, 1.9, 0.5);
    const NS = this.sim.squads.length + 1;
    this.poles = new THREE.InstancedMesh(pole, new THREE.MeshLambertMaterial({ color: 0x3b2a1a }), NS); this.flags = new THREE.InstancedMesh(flag, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), NS);
    for (const m of [this.poles, this.flags]) { m.frustumCulled = false; m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(m); for (let i = 0; i < NS; i++) m.setMatrixAt(i, this.tmp.zero); }
    this.sim.squads.forEach((sq, i) => this.flags.setColorAt(i, this.tmp.c.set(sq.team === 0 ? 0xb8262a : BANNER[(sq.id * 7 + 3) % 4])));
    const disc = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16); disc.rotateZ(HPI); const bar = new THREE.BoxGeometry(0.035, 0.035, 0.56);
    this.mons = new THREE.InstancedMesh(disc, new THREE.MeshLambertMaterial({ color: 0xffffff }), NS); this.bars = new THREE.InstancedMesh(bar, new THREE.MeshLambertMaterial({ color: 0x3b2a1a }), NS);
    for (const m of [this.mons, this.bars]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(m); for (let i = 0; i < NS; i++) m.setMatrixAt(i, this.tmp.zero); }
    this.sim.squads.forEach((sq, i) => this.mons.setColorAt(i, this.tmp.c.set(sq.team === 0 ? 0xe0b84a : (BANNER[(sq.id * 7 + 3) % 4] === 0xb02c26 ? 0xe8e4da : 0xb02c26)))); if (this.mons.instanceColor) this.mons.instanceColor.needsUpdate = true;
    // objectives: a ring that hugs the ground and a tall marker flag, coloured by who holds it
    this.objVis = [];
    for (const o of this.sim.objectives) {
      const segs = 72, geo = new THREE.BufferGeometry(), pos = [], idx = [];
      for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2; for (const rr of [o.r - 0.5, o.r]) { const x = o.x + Math.sin(a) * rr, z = o.z + Math.cos(a) * rr; pos.push(x, terrainH(x, z) + 0.18, z); } if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf2ead8, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }); const ring = new THREE.Mesh(geo, mat); ring.renderOrder = 3; this.scene.add(ring);
      const gy = terrainH(o.x, o.z); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7, 0.12), new THREE.MeshLambertMaterial({ color: 0x3b2a1a })); pl.position.set(o.x, gy + 3.5, o.z); this.scene.add(pl);
      const fm = new THREE.MeshLambertMaterial({ color: 0xf2ead8, side: THREE.DoubleSide }); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.6), fm); fl.position.set(o.x + 0.5, gy + 5.4, o.z); this.scene.add(fl);
      this.objVis.push({ ring, mat, fl, fm, gy, pl });
    }
    // naval target flares
    this.navalMarks = [];
    const gbox = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    this.ghost = new THREE.InstancedMesh(gbox, new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.85, depthWrite: false }), 400); this.ghost.frustumCulled = false; this.ghost.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.ghost);
    for (let i = 0; i < 400; i++) this.ghost.setMatrixAt(i, this.tmp.zero);
    this.ghostLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.25), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.6, depthWrite: false })); this.ghostLine.visible = false; this.scene.add(this.ghostLine);
    if (this.flags.instanceColor) this.flags.instanceColor.needsUpdate = true;
  }
  buildFX() {
    this.smoke = new Particles(this.scene, this.lowfx ? 5000 : 9000, false); this.smoke.wind = [0.55, 0.04, 0.25]; this.suppress = 0;
    this.sparks = new Particles(this.scene, 2500, true);
    const TR = 260; this.tracerN = TR; this.tracers = []; this.tracerNext = 0;
    this.tracerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), TR);
    this.tracerMesh.frustumCulled = false; this.tracerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.tracerMesh);
    for (let i = 0; i < TR; i++) { this.tracerMesh.setMatrixAt(i, this.tmp.zero); this.tracerMesh.setColorAt(i, this.tmp.c.set(0)); this.tracers.push({ life: 0, max: 1, from: new THREE.Vector3(), to: new THREE.Vector3() }); }
    const DN = 300; this.decalN = DN; this.decalNext = 0;
    const circ = new THREE.CircleGeometry(1, 10); circ.rotateX(-HPI);
    this.decals = new THREE.InstancedMesh(circ, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), DN);
    this.decals.frustumCulled = false; this.decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < DN; i++) { this.decals.setMatrixAt(i, this.tmp.zero); this.decals.setColorAt(i, this.tmp.c.set(0x2a2218)); } this.scene.add(this.decals);
    this.buildTrails();
    this.hitstop = 0; this.speedLines = 0; this.speedLinesT = 0;
    this.shells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }), 64); this.shells.frustumCulled = false; this.shells.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.shells);
    this.arrows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 0.95), new THREE.MeshLambertMaterial({ color: 0xb08a50 }), 128); this.arrows.frustumCulled = false; this.arrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.arrows);
    this.debrisN = 160; this.debris = []; this.debrisNext = 0;
    this.debrisMesh = {}; for (const [k, geo] of [['b', new THREE.BoxGeometry(1, 1, 1)], ['c', new THREE.ConeGeometry(0.5, 1, 10)], ['y', new THREE.CylinderGeometry(0.5, 0.5, 1, 10)]]) { const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), this.debrisN); m.frustumCulled = false; m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < this.debrisN; i++) { m.setMatrixAt(i, this.tmp.zero); m.setColorAt(i, this.tmp.c.set(0xffffff)); } this.scene.add(m); this.debrisMesh[k] = m; }
    for (let i = 0; i < this.debrisN; i++) this.debris.push({ life: 0, m: 'b', p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), rest: false });
    { const bm = new THREE.MeshBasicMaterial({ color: 0xeef2ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); this.bolt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bm, 24); this.bolt.frustumCulled = false; for (let i = 0; i < 24; i++) this.bolt.setMatrixAt(i, this.tmp.zero); this.scene.add(this.bolt); this.boltT = 0; }
    this.timers = []; this.fireSeen = new Uint8Array(this.sim.fireState.length); this.fireSndT = 0; this.abFxT = 0;
    this.stuckN = 220; this.stuckNext = 0; this.stuck = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }), this.stuckN); this.stuck.frustumCulled = false; for (let i = 0; i < this.stuckN; i++) this.stuck.setMatrixAt(i, this.tmp.zero); this.scene.add(this.stuck);
  }
  buildViewmodel() {
    const vmFov = new THREE.Group(); this.camera.add(vmFov); this.vmFov = vmFov; // squeezes the first-person kit toward the sight line when the view zooms, so a raised musket doesn't fill the screen
    const vm = new THREE.Group(); vmFov.add(vm); this.vm = vm;
    const wood = new THREE.MeshLambertMaterial({ color: 0x4a2e18 }), steel = new THREE.MeshLambertMaterial({ color: 0x6b7075 }), brass = new THREE.MeshLambertMaterial({ color: 0xb08d3c }), blade = new THREE.MeshLambertMaterial({ color: 0xd8dee3 }), wrap = new THREE.MeshLambertMaterial({ color: 0x1e1b2a }), black = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
    const bx = (w, h, d, mat, x, y, z, rx, ry, rz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz; m.castShadow = false; return m; };
    // niaochong matchlock: origin at rear sight, long slim barrel along -z, bird-beak stock dropping under the cheek
    const red = new THREE.MeshLambertMaterial({ color: 0xc8281e }), glow = new THREE.MeshBasicMaterial({ color: 0xff8a3a });
    const rifle = new THREE.Group();
    rifle.add(bx(0.022, 0.022, 1.12, steel, 0, 0, -0.56));
    rifle.add(bx(0.036, 0.042, 0.74, wood, 0, -0.026, -0.5));
    for (const zb of [-0.25, -0.55, -0.85]) rifle.add(bx(0.04, 0.048, 0.02, brass, 0, -0.022, zb));
    rifle.add(bx(0.04, 0.05, 0.22, wood, 0, -0.04, 0.0));
    rifle.add(bx(0.034, 0.07, 0.3, wood, 0, -0.1, 0.22, 0.38));
    rifle.add(bx(0.008, 0.024, 0.012, brass, 0, 0.022, 0)); rifle.add(bx(0.006, 0.02, 0.006, brass, 0, 0.022, -1.1));
    rifle.add(bx(0.012, 0.012, 0.09, brass, 0.03, 0.02, -0.06, -0.8)); rifle.add(bx(0.016, 0.016, 0.016, glow, 0.03, 0.05, -0.1)); this.vmNearEye = rifle.children.slice(-2);
    rifle.add(bx(0.012, 0.012, 0.28, blade, 0, 0.0, -1.24));
    const breech = new THREE.Group(); breech.position.set(0.026, 0.004, -0.13); breech.add(bx(0.03, 0.006, 0.03, brass, 0, 0.006, 0)); rifle.add(breech); this.vmBreech = breech;
    const xbar = new THREE.Group(); xbar.add(bx(0.74, 0.024, 0.034, wood, 0, -0.005, -0.92)); xbar.add(bx(0.006, 0.006, 0.5, new THREE.MeshLambertMaterial({ color: 0xe8e2cc }), 0.19, 0, -0.72, 0, 0.72)); xbar.add(bx(0.006, 0.006, 0.5, new THREE.MeshLambertMaterial({ color: 0xe8e2cc }), -0.19, 0, -0.72, 0, -0.72)); xbar.visible = false; rifle.add(xbar); this.vmXbar = xbar;
    vm.add(rifle); this.vmRifle = rifle;
    // horn bow held out at arm's length, and a rattan shield on the left arm
    const vb = new THREE.Group(); const bw2 = new THREE.MeshLambertMaterial({ color: 0x5a3b1e });
    vb.add(bx(0.03, 0.42, 0.035, bw2, 0, 0.2, -0.02, -0.25)); vb.add(bx(0.03, 0.42, 0.035, bw2, 0, -0.2, -0.02, 0.25));
    { // the string in two halves that meet at the nock and pull back with the draw, and the nocked arrow
      const sm = new THREE.MeshLambertMaterial({ color: 0xe8e2cc }); this.vmBowS = [bx(0.006, 1, 0.006, sm, 0, 0.2, 0.07), bx(0.006, 1, 0.006, sm, 0, -0.2, 0.07)]; for (const s of this.vmBowS) vb.add(s);
      const ar = new THREE.Group(); ar.add(bx(0.008, 0.008, 0.72, new THREE.MeshLambertMaterial({ color: 0x8a6a40 }), 0, 0, -0.36)); ar.add(bx(0.012, 0.012, 0.06, new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }), 0, 0, -0.74)); ar.add(bx(0.002, 0.03, 0.08, new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }), 0, 0.012, -0.03)); vb.add(ar); this.vmBowA = ar; }
    vb.visible = false; vmFov.add(vb); this.vmBow = vb;
    const sh = new THREE.Group(); const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 18), new THREE.MeshLambertMaterial({ color: 0xa8844a })); disk.rotation.x = Math.PI / 2; sh.add(disk);
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), new THREE.MeshLambertMaterial({ color: 0x8a2a20 })); boss.rotation.x = Math.PI / 2; boss.position.z = -0.03; sh.add(boss);
    for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.08 + k * 0.055, 0.006, 4, 24), new THREE.MeshLambertMaterial({ color: 0x7a5a2a })); r.position.z = -0.022; sh.add(r); }
    sh.visible = false; vmFov.add(sh); this.vmShield = sh;
    // three-eyed hand cannon: three iron barrels round a wooden haft; the cluster turns between shots
    const rev = new THREE.Group();
    const cyl = new THREE.Group(); for (let k = 0; k < 3; k++) { const a = k * 2.094; cyl.add(bx(0.026, 0.026, 0.3, steel, Math.cos(a) * 0.022, Math.sin(a) * 0.022, -0.15)); } cyl.add(bx(0.07, 0.07, 0.03, steel, 0, 0, -0.02)); cyl.add(bx(0.07, 0.07, 0.03, steel, 0, 0, -0.28));
    rev.add(cyl); this.vmCyl = cyl;
    rev.add(bx(0.034, 0.034, 0.34, wood, 0, -0.01, 0.17)); rev.add(bx(0.006, 0.02, 0.006, black, 0, 0.04, -0.3));
    vm.add(rev); this.vmRevolver = rev;
    // dao: a broad single-edged blade that widens toward the tip, along +y, origin at the guard
    const kat = new THREE.Group();
    kat.add(bx(0.016, 0.42, 0.05, blade, 0, 0.25, 0.004)); kat.add(bx(0.014, 0.34, 0.068, blade, 0, 0.62, 0.016, -0.09)); kat.add(bx(0.012, 0.12, 0.05, blade, 0, 0.82, 0.03, -0.35));
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 8), brass); tsuba.position.y = 0.04; tsuba.scale.set(1.3, 1, 0.8); kat.add(tsuba);
    kat.add(bx(0.03, 0.2, 0.032, new THREE.MeshLambertMaterial({ color: 0x5a1a1a }), 0, -0.08, 0)); kat.add(bx(0.036, 0.03, 0.036, brass, 0, -0.19, 0));
    vm.add(kat); this.vmKatana = kat;
    const yari = new THREE.Group(); yari.add(bx(0.026, 2.3, 0.026, new THREE.MeshLambertMaterial({ color: 0x8b6b4a }), 0, 0.95, 0)); yari.add(bx(0.014, 0.3, 0.05, blade, 0, 2.24, 0)); yari.add(bx(0.09, 0.12, 0.09, red, 0, 2.05, 0)); vm.add(yari); this.vmYari = yari;
    { // 狼筅 wolf-brush: a long bamboo with its side branches left on, trimmed into layered, iron-tipped spikes
      const brush = new THREE.Group(), bam = new THREE.MeshLambertMaterial({ color: 0x8a8a4c }), twig = new THREE.MeshLambertMaterial({ color: 0x6f7438 });
      brush.add(bx(0.038, 3.5, 0.038, bam, 0, 1.5, 0)); brush.add(bx(0.016, 0.24, 0.04, blade, 0, 3.36, 0));
      for (let k = 0; k < 8; k++) brush.add(bx(0.046, 0.02, 0.046, bam, 0, 0.3 + k * 0.38, 0)); // bamboo nodes
      for (let k = 0; k < 13; k++) { const y = 1.75 + k * 0.12, L = 0.56 - k * 0.03; const piv = new THREE.Group(); piv.position.y = y; piv.rotation.y = k * 2.4; const tilt = new THREE.Group(); tilt.rotation.x = 0.75 + (k % 3) * 0.12; const m = bx(0.012, L, 0.012, twig, 0, L / 2, 0); tilt.add(m); const tip = bx(0.01, 0.05, 0.02, blade, 0, L + 0.02, 0); tilt.add(tip); piv.add(tilt); brush.add(piv); }
      brush.visible = false; vm.add(brush); this.vmBrush = brush; }
    { // 鏜鈀 trident-rake: a long centre spike and two horns curving up from the crossbar
      const fork = new THREE.Group(), iron = new THREE.MeshLambertMaterial({ color: 0x7a7f84 });
      fork.add(bx(0.03, 2.1, 0.03, new THREE.MeshLambertMaterial({ color: 0x7a5a3a }), 0, 0.85, 0)); fork.add(bx(0.03, 0.42, 0.03, iron, 0, 2.08, 0)); fork.add(bx(0.014, 0.12, 0.03, blade, 0, 2.35, 0));
      fork.add(bx(0.34, 0.03, 0.03, iron, 0, 1.92, 0));
      for (const sd of [-1, 1]) { fork.add(bx(0.024, 0.2, 0.024, iron, sd * 0.17, 2.0, 0, 0, 0, -sd * 0.25)); fork.add(bx(0.02, 0.14, 0.02, blade, sd * 0.2, 2.15, 0)); }
      fork.visible = false; vm.add(fork); this.vmFork = fork; }
    rifle.visible = false; kat.visible = false; yari.visible = false; rev.visible = false;
    // hands, a cartridge and a ramrod live in weapon space; sleeves live in camera space
    const skin = new THREE.MeshLambertMaterial({ color: PAL.skin });
    this.vmHandR = bx(0.045, 0.06, 0.075, skin, 0, 0, 0); this.vmHandL = bx(0.045, 0.06, 0.075, skin, 0, 0, 0); vm.add(this.vmHandR); vm.add(this.vmHandL);
    this.vmCart = bx(0.014, 0.014, 0.06, brass, 0, 0, 0); this.vmCart.visible = false; vm.add(this.vmCart);
    this.vmRod = bx(0.008, 0.008, 0.9, steel, 0, 0, 0); this.vmRod.visible = false; vm.add(this.vmRod);
    const arms = new THREE.Group(); this.vmFov.add(arms); this.vmArms = arms;
    this.sleeveMat = new THREE.MeshLambertMaterial({ color: 0x8a1f2d });
    const unit = new THREE.BoxGeometry(1, 1, 1);
    this.vmFore = [new THREE.Mesh(unit, this.sleeveMat), new THREE.Mesh(unit, this.sleeveMat)]; this.vmUpper = [new THREE.Mesh(unit, this.sleeveMat), new THREE.Mesh(unit, this.sleeveMat)];
    for (const m of [...this.vmFore, ...this.vmUpper]) arms.add(m);
    this.vmState = { pos: new THREE.Vector3(0.3, -0.33, -0.55), rot: new THREE.Euler(-1, 0.3, 0.2), rh: new THREE.Vector3(), lh: new THREE.Vector3(), ph: 0, spd: 0, lagX: 0, lagY: 0, lastYaw: 0, lastPitch: 0, roll: 0, pitch: 0, push: 0 };
    this.camRoll = 0; this.camPitch = 0; this.camPush = 0; this.camBob = 0;
    const P = (px, py, pz, rx, ry, rz) => ({ px, py, pz, rx, ry, rz });
    const L = (x, y, z) => new THREE.Vector3(x, y, z);
    this.VM = {
      katana: {
        idle: P(0.3, -0.33, -0.55, -1.0, 0.3, 0.2),
        windup: [P(0.25, 0.22, -0.35, 0.75, 0.15, 0.2), P(0.7, -0.1, -0.4, -0.5, 0.2, -1.5), P(0.32, -0.3, -0.18, -1.5, 0.1, 0), P(-0.5, -0.05, -0.4, -0.5, -0.2, 1.5)],
        mid: [P(0.15, 0.12, -0.72, -0.7, 0.12, 0.15), P(0.12, -0.2, -0.82, -1.35, 0.1, -0.1), P(0.22, -0.28, -0.7, -1.55, 0.05, 0), P(0.05, -0.2, -0.82, -1.35, -0.1, 0.1)],
        release: [P(0.05, -0.55, -0.85, -2.2, 0.1, 0.1), P(-0.55, -0.35, -0.7, -1.3, 0, 1.3), P(0.15, -0.26, -1.15, -1.57, 0, 0), P(0.7, -0.35, -0.7, -1.3, 0, -1.3)],
        block: [P(0.0, 0.1, -0.68, -0.2, 0, 1.45), P(0.38, -0.22, -0.6, -0.3, 0, -0.15), P(0.1, -0.44, -0.62, 0.2, 0, 1.5), P(-0.3, -0.22, -0.6, -0.3, 0, 0.15)],
        stun: P(0.35, -0.5, -0.4, -0.3, 0.5, -0.5),
        R: L(0, -0.02, 0), Lh: L(0, -0.16, 0),
      },
      yari: {
        idle: P(0.3, -0.35, -0.5, -1.35, 0.1, 0.05),
        windup: [P(0.3, 0.0, -0.3, -0.6, 0.1, 0.1), null, P(0.3, -0.3, -0.1, -1.45, 0, 0), null],
        mid: [P(0.25, -0.2, -0.45, -1.3, 0.1, 0.1), null, P(0.25, -0.3, -0.6, -1.48, 0, 0), null],
        release: [P(0.2, -0.4, -0.6, -1.9, 0.1, 0.1), null, P(0.2, -0.3, -1.2, -1.5, 0, 0), null],
        block: [P(0.05, 0.1, -0.5, -0.2, 0, 1.45), P(0.35, -0.2, -0.5, -0.3, 0, -0.15), P(0.1, -0.42, -0.5, 0.2, 0, 1.5), P(-0.28, -0.2, -0.5, -0.3, 0, 0.15)],
        stun: P(0.35, -0.5, -0.4, -0.3, 0.5, -0.5),
        R: L(0, 0.15, 0), Lh: L(0, 0.75, 0),
      },
    };
    // a gun swung as a club: the shaft's end in both fists, the heavy end (three barrels, or a musket's butt) out at the far end
    this.VM.club = {
      /* the side swings turn the shaft flat (rz = ±90°) and sweep it round with ry, so the head travels across the view, never straight out */
      idle: P(0.28, -0.36, -0.5, -1.05, 0.25, -0.25),
      windup: [P(0.2, 0.06, -0.3, 0.5, 0.05, 0.12), P(0.4, -0.14, -0.26, 0.35, -0.6, -1.57), null, P(-0.32, -0.14, -0.26, 0.35, 0.6, 1.57)],
      mid: [P(0.1, 0.02, -0.45, -0.6, 0.04, 0.06), P(0.12, -0.24, -0.42, 0.15, 1.4, -1.57), null, P(0.0, -0.24, -0.42, 0.15, -1.4, 1.57)],
      release: [P(0.06, -0.2, -0.6, -1.8, 0.02, 0.02), P(-0.32, -0.3, -0.3, 0.05, 3.4, -1.57), null, P(0.42, -0.3, -0.3, 0.05, -3.4, 1.57)],
      block: this.VM.katana.block, stun: this.VM.katana.stun,
      R: L(0, 0, 0), Lh: L(0, -0.14, 0),
    };
    this.VM.club.windup[2] = this.VM.club.windup[0]; this.VM.club.mid[2] = this.VM.club.mid[0]; this.VM.club.release[2] = this.VM.club.release[0];
    const R0 = L(0, -0.06, 0.14), B = L(0.035, 0.035, -0.08), PO = L(0.2, -0.32, 0.25), Mz = L(0, 0.02, -0.88), BT = L(0, -0.07, 0.42);
    const o = (v, x, y, z) => v.clone().add(L(x, y, z));
    this.VMR = {
      R0, L0: L(0, -0.05, -0.42),
      breech: [[0, R0], [0.15, B], [0.22, o(B, 0.02, 0.03, 0)], [0.3, o(B, 0, 0.01, 0.06)], [0.48, PO], [0.62, o(B, 0, 0.03, 0.05)], [0.7, o(B, 0, 0.01, -0.03)], [0.78, o(B, 0.02, 0.03, 0)], [0.88, L(0, 0.03, 0.05)], [1, R0]],
      muzzle: [[0, R0], [0.12, PO], [0.24, o(Mz, 0, 0, -0.06)], [0.36, o(Mz, 0, 0, -0.06)], [0.46, o(Mz, 0, 0, -0.45)], [0.54, o(Mz, 0, 0, -0.05)], [0.62, o(Mz, 0, 0, -0.35)], [0.7, o(Mz, 0, 0, -0.05)], [0.78, o(Mz, 0, 0, -0.35)], [0.86, o(Mz, 0, 0, -0.5)], [0.93, L(0.04, -0.05, -0.3)], [1, R0]],
      spencer: [[0, R0], [0.12, BT], [0.24, o(BT, 0, 0, 0.25)], [0.44, PO], [0.6, o(BT, 0, 0, 0.25)], [0.72, BT], [0.82, R0], [0.9, o(R0, 0, -0.08, 0.03)], [1, R0]],
      relBreech: P(0.1, -0.27, -0.42, 0.28, -0.25, 0.6), relMuzzle: P(0.0, -0.55, -0.5, 1.3, 0.1, 0.0), relSpencer: P(0.12, -0.3, -0.4, -0.2, -0.3, 0.5),
    };
    const C = L(-0.045, -0.012, 0.0), L0 = L(0.035, -0.09, 0.075), RP = L(-0.25, -0.35, 0.2); const rk = [[0, L0], [0.1, C], [0.24, C]];
    for (let i = 0; i < 6; i++) { const t0 = 0.28 + i * 0.0967; rk.push([t0 + 0.045, RP], [t0 + 0.0967, C]); } rk.push([0.92, C], [1, L0]);
    this.VMV = { R: L(0, -0.07, 0.07), L0, keys: rk, rel: P(0.04, -0.2, -0.36, 0.75, 0.35, -0.45) };
  }
  // ---------- effects ----------
  slashUnused(u, dir, friendly, hero) {
    const sl = this.slashes[this.slashNext]; this.slashNext = (this.slashNext + 1) % this.slashN;
    const yaw = u.yaw, x = u.x, z = u.z, y = u.y + (u.mounted || u.mount >= 0 ? 2.0 : 1.25);
    sl.life = sl.max = hero ? 0.22 : 0.26; sl.kind = dir === DIR_DOWN ? 2 : dir === DIR_UP ? 1 : 0; sl.flip = dir === DIR_LEFT ? -1 : 1;
    sl.mat.color.set(hero ? 0xdffcff : friendly ? 0x9fe8ff : 0xff6a52);
    const m = sl.kind === 0 ? sl.mh : sl.kind === 1 ? sl.mv : sl.ms;
    sl.mh.visible = sl.kind === 0; sl.mv.visible = sl.kind === 1; sl.ms.visible = sl.kind === 2;
    m.position.set(x + Math.sin(yaw) * (sl.kind === 2 ? 1.6 : 0.3), y, z + Math.cos(yaw) * (sl.kind === 2 ? 1.6 : 0.3));
    if (sl.kind === 0) m.rotation.set(0, yaw, 0); else if (sl.kind === 1) m.rotation.set(0, yaw - HPI, 0); else m.rotation.set(0, yaw, 0);
    m.scale.set(sl.kind === 0 ? sl.flip * 0.6 : 0.6, 0.6, 0.6);
  }
  updateSlashes(dt) {
    for (const sl of this.slashes) {
      if (sl.life <= 0) continue; sl.life -= dt; const t = 1 - Math.max(0, sl.life) / sl.max;
      const m = sl.kind === 0 ? sl.mh : sl.kind === 1 ? sl.mv : sl.ms;
      const sc = 0.6 + t * 0.7; m.scale.set(sl.kind === 0 ? sl.flip * sc : sc, sc, sl.kind === 2 ? 0.6 + t * 1.2 : sc);
      sl.mat.opacity = t < 0.25 ? t / 0.25 * 0.9 : (1 - t) / 0.75 * 0.9;
      if (sl.life <= 0) { sl.mh.visible = sl.mv.visible = sl.ms.visible = false; sl.mat.opacity = 0; }
    }
  }
  tracer(from, to, bright) {
    const i = this.tracerNext; this.tracerNext = (this.tracerNext + 1) % this.tracerN;
    const t = this.tracers[i]; t.from.set(from[0], from[1], from[2]); t.to.set(to[0], to[1], to[2]); t.len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]); t.life = t.max = Math.min(0.9, Math.max(0.12, t.len / 150)) + 0.06; t.bright = bright; // a visible ball, flying at a readable speed
  }
  decal(x, y, z, size, col) {
    const i = this.decalNext; this.decalNext = (this.decalNext + 1) % this.decalN;
    this.tmp.m.compose(this.tmp.v.set(x, y + 0.03, z), this.tmp.q.setFromEuler(this.tmp.e.set(0, rnd(0, 6.28), 0)), this.tmp.v2.set(size, 1, size * rnd(0.8, 1.2)));
    this.decals.setMatrixAt(i, this.tmp.m); this.decals.setColorAt(i, this.tmp.c.set(col)); this.decals.instanceMatrix.needsUpdate = true; this.decals.instanceColor.needsUpdate = true;
  }
  puffSmoke(x, y, z, n, vx, vy, vz, spread, life, s0, s1, shade, alpha) {
    for (let i = 0; i < n; i++) {
      const sh = shade + rnd(-0.08, 0.08);
      this.smoke.spawn(x + rnd(-0.2, 0.2), y + rnd(-0.2, 0.2), z + rnd(-0.2, 0.2), vx + rnd(-spread, spread), vy + rnd(-spread, spread) * 0.6 + 0.4, vz + rnd(-spread, spread), life * rnd(0.7, 1.3), s0, s1 * rnd(0.8, 1.4), sh, sh, sh * 1.02, alpha, 0.9, -0.08, sh + 0.1, sh + 0.1, sh + 0.12);
    }
  }
  burstSparks(x, y, z, n, speed, r, g, b, life, size) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), e = rnd(-0.2, 1.2), s = speed * rnd(0.3, 1);
      this.sparks.spawn(x, y, z, Math.cos(a) * s * Math.cos(e), Math.sin(e) * s, Math.sin(a) * s * Math.cos(e), life * rnd(0.5, 1.2), size, size * 0.3, r, g, b, 1, 0.94, 16, r, g * 0.4, b * 0.2);
    }
  }
  dust(x, y, z, n, vx, vy, vz, spread, life, s0, s1) {
    for (let i = 0; i < n; i++) this.smoke.spawn(x, y, z, vx + rnd(-spread, spread), vy + rnd(0, spread), vz + rnd(-spread, spread), life * rnd(0.6, 1.3), s0, s1, 0.55, 0.47, 0.34, 0.7, 0.9, 1.5);
  }
  blood(x, y, z, n, vx, vy, vz) {
    for (let i = 0; i < n; i++) this.smoke.spawn(x, y, z, vx + rnd(-2, 2), vy + rnd(0, 2.5), vz + rnd(-2, 2), rnd(0.4, 0.9), 0.08, 0.3, 0.45, 0.04, 0.05, 0.95, 0.9, 14);
  }
  flash(x, y, z, size, life) { this.sparks.spawn(x, y, z, 0, 0, 0, life, size, size * 0.5, 1, 0.85, 0.5, 1, 1, 0, 1, 0.4, 0.1); }
  spawnDebris(m, x, y, z, vx, vy, vz, sx, sy, sz, col, spin) {
    const d = this.debris[this.debrisNext]; const i = this.debrisNext; this.debrisNext = (this.debrisNext + 1) % this.debrisN;
    if (d.life > 0 && d.m !== m) this.debrisMesh[d.m].setMatrixAt(i, this.tmp.zero);
    d.life = 90; d.m = m; d.p.set(x, y, z); d.v.set(vx, vy, vz); d.q.setFromEuler(this.tmp.e.set(rnd(-0.3, 0.3), Math.random() * 6.28, rnd(-0.3, 0.3))); d.w.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(6 + spin * 20); d.s.set(sx, sy, sz); d.rest = false; d.long = sy > sx * 4 || sz > sx * 4;
    const mesh = this.debrisMesh[m]; mesh.setColorAt(i, this.tmp.c.set(col)); mesh.instanceColor.needsUpdate = true;
  }
  makeBolt(x, y, z) {
    const T = this.tmp, x0 = x + rnd(-15, 15), y0 = y + 140, z0 = z + rnd(-15, 15); let px = x0, py = y0, pz = z0, n = 0;
    for (let i = 0; i < 20; i++) { const t = (i + 1) / 20, j = i === 19 ? 0 : 3.5 * (1 - t * 0.6);
      const bx = lerp(x0, x, t) + rnd(-j, j), by = lerp(y0, y, t), bz = lerp(z0, z, t) + rnd(-j, j);
      const a = T.v.set(px, py, pz), b = T.v2.set(bx, by, bz); const L = a.distanceTo(b); T.v3.addVectors(a, b).multiplyScalar(0.5); T.v4.subVectors(b, a).normalize(); T.q.setFromUnitVectors(T.v.set(0, 1, 0), T.v4);
      T.m.compose(T.v3, T.q, T.v.set(0.35, L, 0.35)); this.bolt.setMatrixAt(n++, T.m); px = bx; py = by; pz = bz; }
    for (; n < 24; n++) this.bolt.setMatrixAt(n, T.zero); this.bolt.instanceMatrix.needsUpdate = true;
  }
  updateWorldFX(dt) {
    const sim = this.sim, T = this.tmp, cp = this.camera.position;
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    // debris tumbling to rest
    for (let i = 0; i < this.debrisN; i++) { const d = this.debris[i]; if (d.life <= 0) continue; d.life -= dt; const mesh = this.debrisMesh[d.m];
      if (d.life <= 0) { mesh.setMatrixAt(i, T.zero); continue; }
      if (!d.rest) { d.v.y -= 18 * dt; d.p.addScaledVector(d.v, dt); const gy = terrainH(d.p.x, d.p.z) + Math.min(d.s.x, d.s.y, d.s.z) * 0.5;
        T.q.setFromEuler(T.e.set(d.w.x * dt, d.w.y * dt, d.w.z * dt)); d.q.multiply(T.q);
        if (d.p.y < gy) { d.p.y = gy; if (Math.abs(d.v.y) > 2.5) { d.v.y = -d.v.y * 0.3; d.v.x *= 0.5; d.v.z *= 0.5; d.w.multiplyScalar(0.5); } else { d.rest = true; // settle flat
          const e = T.e.setFromQuaternion(d.q, 'YXZ'); if (d.long) { if (d.s.y > d.s.z) d.q.setFromEuler(T.e.set(HPI, e.y, 0, 'YXZ')); else d.q.setFromEuler(T.e.set(0, e.y, 0, 'YXZ')); } else d.q.setFromEuler(T.e.set(d.m === 'b' ? 0 : (Math.random() < 0.5 ? 0 : PI * 0.85), e.y, rnd(-0.3, 0.3), 'YXZ')); d.p.y = terrainH(d.p.x, d.p.z) + (d.long && d.s.y > d.s.z ? Math.max(d.s.x, d.s.z) * 0.5 : d.s.y * 0.5); } } }
      T.m.compose(d.p, d.q, d.s); mesh.setMatrixAt(i, T.m); }
    for (const k in this.debrisMesh) this.debrisMesh[k].instanceMatrix.needsUpdate = true;
    // lightning flash
    if (this.boltT > 0) { this.boltT -= dt; this.bolt.visible = this.boltT > 0 && (this.boltT > 0.3 || Math.random() < 0.5); }
    this.lightFlash = Math.max(0, this.lightFlash - dt * 2.2); if (this.hemi) this.hemi.intensity = 0.65 + this.lightFlash * (Math.random() < 0.7 ? 2.2 : 0.4);
    if (sim.rain && Math.random() < dt * 0.06) { this.lightFlash = Math.max(this.lightFlash, 0.4); this.timers.push({ t: 1 + Math.random() * 2, fn: () => AUDIO.play('thunder', cp.x + rnd(-400, 400), 60, cp.z + rnd(-400, 400), 0.5) }); }
    // wildfire: flames and smoke columns from burning cells, char where it has passed
    const st = sim.fireState, W = sim.fireW, CS = S.FIRE_CS; let nearB = null, nd = 1e9;
    for (let c = 0; c < st.length; c++) {
      const s = st[c]; if (s === 0) continue; const x = -HALF + ((c % W) + 0.5) * CS, z = -HALF + (((c / W) | 0) + 0.5) * CS;
      if (s === 2) { if (this.fireSeen[c] !== 2) { this.fireSeen[c] = 2; this.decal(x + rnd(-1, 1), terrainH(x, z), z + rnd(-1, 1), 3.4, 0x1c1812); this.decal(x + rnd(-2, 2), terrainH(x, z), z + rnd(-2, 2), 2.4, 0x2a221a); } continue; }
      this.fireSeen[c] = 1; const dx = x - cp.x, dz = z - cp.z, d2 = dx * dx + dz * dz; if (d2 > 260 * 260) continue; if (d2 < nd) { nd = d2; nearB = [x, z]; }
      const big = sim.fuel[c] > 1.5 ? 2.2 : 1, gy = terrainH(x, z), lod = this.lowfx ? 0.5 : 1;
      for (let k = 0; k < 3; k++) if (Math.random() < dt * 9 * big * lod) { const fx = x + rnd(-3, 3), fz = z + rnd(-3, 3), h = terrainH(fx, fz); this.sparks.spawn(fx, h + 0.2, fz, rnd(-0.3, 0.3) + 0.4, rnd(1.5, 3.5) * big, rnd(-0.3, 0.3) + 0.2, rnd(0.4, 0.9), rnd(0.8, 1.6) * big, 0.2, 1, 0.62, 0.2, 1, 0.5, -1, 0.9, 0.2, 0.05); }
      if (Math.random() < dt * 2.5 * big * lod) this.smoke.spawn(x + rnd(-2, 2), gy + 1.5, z + rnd(-2, 2), 0.3, rnd(1, 2), 0.2, rnd(6, 10), 1.5, 7 * big, 0.2, 0.18, 0.16, 0.55, 0.6, -0.15);
      if (Math.random() < dt * 4 * lod) this.sparks.spawn(x + rnd(-2, 2), gy + 1, z + rnd(-2, 2), rnd(-0.5, 0.5), rnd(3, 6), rnd(-0.5, 0.5), rnd(1, 2), 0.12, 0.05, 1, 0.7, 0.3, 1, 0.8, -0.2, 1, 0.3, 0.05);
    }
    this.fireSndT -= dt; if (this.fireSndT <= 0 && nearB && nd < 70 * 70) { this.fireSndT = 0.8; AUDIO.play('fire', nearB[0], terrainH(nearB[0], nearB[1]), nearB[1], 1); }
    // naval target: a red signal flare that smokes until the shells land
    for (let i = this.navalMarks.length - 1; i >= 0; i--) { const m = this.navalMarks[i]; m.t += dt; if (m.t > 8) { this.navalMarks.splice(i, 1); continue; }
      if (Math.random() < dt * 14) this.smoke.spawn(m.x + rnd(-0.3, 0.3), m.y + 0.3, m.z + rnd(-0.3, 0.3), rnd(-0.2, 0.2), rnd(2, 3.5), rnd(-0.2, 0.2), 3.5, 0.5, 3, 0.85, 0.22, 0.18, 0.75, 0.6, -0.1);
      if (Math.random() < dt * 10) this.sparks.spawn(m.x, m.y + 0.4, m.z, rnd(-0.5, 0.5), rnd(1, 2), rnd(-0.5, 0.5), 0.5, 0.5, 0.1, 1, 0.3, 0.2, 1, 1, 0, 1, 0.1, 0.05); }
    // objectives
    for (let i = 0; i < this.objVis.length; i++) { const o = sim.objectives[i], v = this.objVis[i]; const vis = !o.hidden; v.ring.visible = vis; v.pl.visible = vis; v.fl.visible = vis; const k = Math.abs(o.ctrl) / 100; const tc = T.c.set(o.ctrl >= 0 ? TEAM_COL[0] : TEAM_COL[1]); const base = new THREE.Color(0xf2ead8);
      v.mat.color.copy(base).lerp(tc, k); v.mat.opacity = 0.55 + 0.3 * (o.owner >= 0 ? 1 : (Math.sin(this.time * 6) * 0.5 + 0.5) * ((o.n0 > 0) !== (o.n1 > 0) ? 1 : 0));
      v.fm.color.copy(o.owner >= 0 ? T.c.set(o.owner === 0 ? 0xb8262a : 0xd8b03c) : base); v.fl.rotation.y = Math.sin(this.time * 2 + i) * 0.4; }
    // duels: a ring of torches around the two fighters; frenzied heroes smoulder red
    for (const d of sim.duels) { if (Math.random() < dt * 20) { const a = Math.random() * 6.283, gx = d.x + Math.sin(a) * 9, gz = d.z + Math.cos(a) * 9; this.sparks.spawn(gx, terrainH(gx, gz) + 0.4, gz, 0, 1.5, 0, 0.7, 0.6, 0.1, 1, 0.75, 0.3, 1, 1, -0.6, 1, 0.3, 0.05); } }
    for (const u of sim.units) if (u.frenzyT > 0 && !u.dead && Math.random() < dt * 25) this.sparks.spawn(u.x + rnd(-0.4, 0.4), u.y + rnd(0.5, 1.9), u.z + rnd(-0.4, 0.4), 0, 1.2, 0, 0.5, 0.35, 0.05, 1, 0.25, 0.1, 1, 1, -0.5, 0.6, 0.05, 0.02);
    { const cp = this.camera.position; if (!this.whistled) this.whistled = new WeakSet(); // a cannonball passing close overhead whistles, once
      for (const pr of sim.projectiles) { if ((pr.kind !== 'solid' && pr.kind !== 'shell') || this.whistled.has(pr)) continue; const dx = pr.x - cp.x, dy = pr.y - cp.y, dz = pr.z - cp.z; if (dx * dx + dy * dy + dz * dz < 196) { this.whistled.add(pr); AUDIO.play('ballwhistle', pr.x, pr.y, pr.z, 1); } } }
    for (const pr of sim.projectiles) if (pr.kind === 'bomb' && Math.random() < dt * 40) this.sparks.spawn(pr.x, pr.y + 0.15, pr.z, rnd(-0.6, 0.6), rnd(0.5, 1.5), rnd(-0.6, 0.6), 0.25, 0.12, 0.02, 1, 0.8, 0.3, 1, 1, 0.5, 1, 0.4, 0.1);
    for (const u of sim.units) { if (!u.champ || u.dead) continue;
      if (u.spinT > 0.3 && Math.random() < dt * 60) { const a = Math.random() * 6.283; this.sparks.spawn(u.x + Math.sin(a) * 3.6, u.y + 0.15, u.z + Math.cos(a) * 3.6, 0, 0.3, 0, 0.18, 0.4, 0.2, 1, 0.75, 0.3, 1, 1, 0, 1, 0.4, 0.1); }
      if (u.iframe > 0 && Math.random() < dt * 50) this.sparks.spawn(u.x + rnd(-0.3, 0.3), u.y + rnd(0.4, 1.8), u.z + rnd(-0.3, 0.3), 0, 0, 0, 0.25, 0.35, 0.1, 0.7, 0.85, 1, 0.6, 1, 0, 0.5, 0.6, 1);
      if (u.guardT > 0 && Math.random() < dt * 40) { const a = u.yaw + rnd(-1.2, 1.2); this.sparks.spawn(u.x + Math.sin(a) * 0.8, u.y + rnd(0.4, 2), u.z + Math.cos(a) * 0.8, 0, 0.2, 0, 0.25, 0.3, 0.1, 1, 0.85, 0.4, 1, 1, 0, 1, 0.6, 0.2); }
      if (u.dashT > 0) { this.dust(u.x, u.y + 0.2, u.z, 3, 0, 0.6, 0, 0.8, 0.8, 0.3, 1.4); }
      if (u.ironT > 0 && Math.random() < dt * 30) this.sparks.spawn(u.x + rnd(-0.6, 0.6), u.y + rnd(0.3, 2.2), u.z + rnd(-0.6, 0.6), 0, 0.4, 0, 0.35, 0.3, 0.05, 0.85, 0.85, 0.95, 1, 1, -0.3, 0.6, 0.6, 0.8);
      if (u.braceT > 0 && Math.random() < dt * 20) { const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw); this.sparks.spawn(u.x + fx * 2.2 + rnd(-1, 1), u.y + 0.2, u.z + fz * 2.2 + rnd(-1, 1), 0, 0.4, 0, 0.3, 0.3, 0.05, 1, 0.5, 0.3, 1, 1, 0, 1, 0.3, 0.1); }
      if (u.burnT > 0 && Math.random() < dt * 25) this.sparks.spawn(u.x + rnd(-0.3, 0.3), u.y + rnd(0.4, 1.6), u.z + rnd(-0.3, 0.3), 0, 1.5, 0, 0.4, 0.5, 0.1, 1, 0.55, 0.15, 1, 0.8, -0.8, 0.9, 0.2, 0.05);
      if (u.cryT > 0 && Math.random() < dt * 6) this.sparks.spawn(u.x, u.y + 2.3, u.z, 0, 0.6, 0, 0.5, 0.25, 0.05, 1, 0.5, 0.2, 1, 1, -0.3, 1, 0.2, 0.05); }
    for (const u of sim.units) if (u.burnT > 0 && !u.champ && !u.dead && Math.random() < dt * 20) this.sparks.spawn(u.x + rnd(-0.3, 0.3), u.y + rnd(0.4, 1.6), u.z + rnd(-0.3, 0.3), 0, 1.5, 0, 0.4, 0.5, 0.1, 1, 0.55, 0.15, 1, 0.8, -0.8, 0.9, 0.2, 0.05);
    if (sim.pickups) for (const q of sim.pickups) { const gy = terrainH(q.x, q.z); if (Math.random() < dt * 8) this.sparks.spawn(q.x + rnd(-0.2, 0.2), gy + 0.3, q.z + rnd(-0.2, 0.2), 0, 1.2, 0, 0.8, 0.35, 0.05, 0.4, 1, 0.55, 1, 1, -0.6, 0.2, 0.8, 0.3); }
    if (sim.smokes) for (const sm of sim.smokes) { if (Math.random() < dt * 30) { const a = Math.random() * 6.283, r = Math.random() * sm.r; const x = sm.x + Math.sin(a) * r, z = sm.z + Math.cos(a) * r; this.smoke.spawn(x, terrainH(x, z) + rnd(0.3, 2), z, rnd(-0.2, 0.2), rnd(0.1, 0.4), rnd(-0.2, 0.2), rnd(4, 6), 2.5, 7, 0.78, 0.76, 0.72, 0.85, 0.6, -0.02); } }
    if (sim.rocketStrikes) for (const r of sim.rocketStrikes) { if (sim.tick < r.t && Math.random() < dt * 12) this.smoke.spawn(r.x, terrainH(r.x, r.z) + 0.3, r.z, 0, rnd(2, 3), 0, 3, 0.5, 3, 0.85, 0.22, 0.18, 0.75, 0.6, -0.1); }
    this.bushidoFx = Math.max(0, (this.bushidoFx || 0) - dt); if (this.quakeT > 0) { this.quakeT -= dt; this.shake = Math.max(this.shake, 0.9 * Math.min(1, this.quakeT)); }
    // squads with an active ability give off a faint glow
    this.abFxT -= dt; if (this.abFxT <= 0) { this.abFxT = 0.25; for (const sq of sim.squads) { if (!sq.alive || sq.abOn <= 0) continue; const u = sim.units[sq.unitIds.find(id => !sim.units[id].dead)]; if (!u) continue; this.sparks.spawn(u.x + rnd(-2, 2), u.y + 2.2, u.z + rnd(-2, 2), 0, 0.8, 0, 0.8, 0.35, 0.05, 1, 0.8, 0.3, 0.9, 1, -0.3, 1, 0.5, 0.1); } }
  }
  processEvents(events) {
    const sim = this.sim, units = sim.units; const local = sim.players[this.localIdx]; const heroId = local ? local.heroId : -1;
    for (const ev of events) {
      if (typeof VOICE !== 'undefined') VOICE.ev(ev, sim, heroId);
      switch (ev.t) {
        case 'shot': {
          if (this.sim.real && ev.shooter !== heroId) { // near misses: the crack of a ball past your head presses you down
            const cp = this.camera.position, f = ev.from, t2 = ev.to; const vx = t2[0] - f[0], vy = t2[1] - f[1], vz = t2[2] - f[2]; const L2 = vx * vx + vy * vy + vz * vz || 1;
            const k = Math.max(0, Math.min(1, ((cp.x - f[0]) * vx + (cp.y - f[1]) * vy + (cp.z - f[2]) * vz) / L2)); const d = Math.hypot(f[0] + vx * k - cp.x, f[1] + vy * k - cp.y, f[2] + vz * k - cp.z);
            if (d < 4) { this.suppress = Math.min(1.3, (this.suppress || 0) + (4 - d) / 4 * 0.45); if (d < 2.2) AUDIO.play('whiz', cp.x + vx * 0.01, cp.y, cp.z + vz * 0.01, 1.1); } }
          if (ev.shooter >= 0 && this.reveal) this.reveal[ev.shooter] = this.time + 3;
          if (ev.shooter >= 0 && ev.weapon !== 'gatling') this.anim(ev.shooter).recoil = 1;
          const f = ev.from, to = ev.to, d = ev.dir; const isMe = ev.shooter === heroId;
          const mx = f[0] + d[0] * 0.9, my = f[1] + d[1] * 0.9 - 0.1, mz = f[2] + d[2] * 0.9;
          this.tracer([mx, my, mz], to, ev.weapon === 'gatling' ? 2.2 : isMe ? 1.2 : 1);
          if (ev.weapon === 'gatling') { for (let k = 1; k <= 8; k++) { const s2 = k / 9; this.smoke.spawn(f[0] + (to[0] - f[0]) * s2 + rnd(-0.3, 0.3), f[1] + (to[1] - f[1]) * s2 + 0.3 + rnd(-0.2, 0.2), f[2] + (to[2] - f[2]) * s2 + rnd(-0.3, 0.3), 0, 0.3, 0, 2.5 + s2 * 2, 0.3, 1.6, 0.8, 0.78, 0.74, 0.45, 0.8, -0.05); } this.burstSparks(to[0], to[1], to[2], 10, 5, 1, 0.6, 0.2, 0.4, 0.1); AUDIO.play('rocket', f[0], f[1], f[2], 1); }
          this.flash(mx, my, mz, isMe ? 1.6 : 1.2, 0.07);
          this.puffSmoke(mx, my, mz, (ev.weapon === 'gatling' ? 3 : ev.weapon === 'revolver' ? 5 : isMe ? 14 : 9) * (this.sim.real ? 2 : 1), d[0] * 4, d[1] * 4, d[2] * 4, 1.1, ev.weapon === 'gatling' ? 4 : 9, 0.6, 3.6, 0.86, 0.5);
          if (ev.weapon !== 'gatling') this.puffSmoke(mx + d[0] * 2.5, my - 0.3, mz + d[2] * 2.5, 4, d[0] * 1.2, 0.2, d[2] * 1.2, 0.5, 14, 2.2, 5.5, 0.9, 0.32);
          if (ev.weapon !== 'gatling') AUDIO.play('shot', f[0], f[1], f[2], isMe ? (ev.weapon === 'revolver' ? 1.1 : 1.4) : 1);
          if (isMe) { this.recoil = 1; this.recoilRoll = rnd(-1, 1); }
          const tx = to[0], ty = to[1], tz = to[2];
          if (ev.kind === 'unit') { this.blood(tx, ty, tz, 9, d[0] * 1.5, 0.5, d[2] * 1.5); this.smoke.spawn(tx, ty, tz, d[0], 0.3, d[2], 0.6, 0.3, 1.0, 0.4, 0.1, 0.08, 0.6, 0.9, 0); AUDIO.play('flesh', tx, ty, tz, 0.8); if (isMe) { this.hitMark = 0.35; this.hitMarkHead = ev.head; AUDIO.play('hitmark', undefined, 0, 0, ev.head ? 1.3 : 1); } }
          else if (ev.kind === 'ground') { this.dust(tx, ty + 0.05, tz, 10, 0, 1.5, 0, 1.6, 1.0, 0.25, 1.3); this.burstSparks(tx, ty + 0.05, tz, 5, 5, 1, 0.75, 0.3, 0.25, 0.08); this.decal(tx, ty, tz, 0.32, 0x2a2218); AUDIO.play('dirt', tx, ty, tz, 0.7); }
          else if (ev.kind === 'rock' || ev.kind === 'wood') { this.burstSparks(tx, ty, tz, 16, 7, 1, 0.8, 0.35, 0.35, 0.09); this.puffSmoke(tx, ty, tz, 4, 0, 0.5, 0, 0.6, 1.2, 0.2, 0.9, 0.6, 0.5); AUDIO.play('ricochet', tx, ty, tz, 1); }
          else if (ev.kind === 'tree') { this.burstSparks(tx, ty, tz, 10, 4, 0.75, 0.55, 0.3, 0.5, 0.1); this.puffSmoke(tx, ty, tz, 3, 0, 0.3, 0, 0.4, 1, 0.2, 0.6, 0.5, 0.5); AUDIO.play('dirt', tx, ty, tz, 0.6); }
          if (ev.victim === heroId) { this.hitFlash = 0.5; this.shake = Math.max(this.shake, 0.5); const hh = units[heroId]; if (hh) this.impact(hh.x - d[0] * 10, hh.z - d[2] * 10, 0.9, ev.head); }
          else if (ev.team !== this.localTeam) { // closest approach of the bullet to your head
            const cp = this.camera.position; const sx = to[0] - f[0], sy = to[1] - f[1], sz = to[2] - f[2]; const L2 = sx * sx + sy * sy + sz * sz || 1; let k = ((cp.x - f[0]) * sx + (cp.y - f[1]) * sy + (cp.z - f[2]) * sz) / L2; k = clamp(k, 0, 1);
            const qx = f[0] + sx * k - cp.x, qy = f[1] + sy * k - cp.y, qz = f[2] + sz * k - cp.z; const dd = Math.sqrt(qx * qx + qy * qy + qz * qz);
            if (dd < 3.5 && k > 0.05) { AUDIO.play('whiz', cp.x + qx, cp.y + qy, cp.z + qz, 1.2 - dd * 0.25); this.suppress = Math.min(1, this.suppress + 0.35 * (1 - dd / 3.5)); this.shake = Math.max(this.shake, 0.12); }
          }
          break;
        }
        case 'volley': {
          const sq = sim.squads[ev.sq]; if (!sq) break;
          if (!ev.bow) AUDIO.play('volley', ev.x, ev.y, ev.z, 0.25 + Math.min(1, ev.n / 10) * 0.25); // each man's own shot brings its smoke; this is only the distant roll of the line
          else AUDIO.play('twang', ev.x, ev.y, ev.z, 1.6);
          const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 70 && !ev.bow) this.shake = Math.max(this.shake, 0.35 * (1 - dc / 70));
          break;
        }
        case 'cannon': { if (this.reveal && ev.id >= 0) this.reveal[ev.id] = this.time + 5;
          this.flash(ev.x, ev.y, ev.z, 5, 0.12); this.burstSparks(ev.x, ev.y, ev.z, 20, 12, 1, 0.8, 0.4, 0.5, 0.18);
          this.puffSmoke(ev.x, ev.y, ev.z, 50, ev.dx * 9, ev.dy * 9 + 1, ev.dz * 9, 3, 14, 1.4, 9, 0.84, 0.65);
          AUDIO.play('cannon', ev.x, ev.y, ev.z, 1); this.cannonRecoil.set(ev.id, 0.35);
          const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 30) this.shake = Math.max(this.shake, 0.3 * (1 - dc / 30));
          break;
        }
        case 'explosion': {
          this.flash(ev.x, ev.y + 0.5, ev.z, 9, 0.15); this.burstSparks(ev.x, ev.y + 0.3, ev.z, 45, 16, 1, 0.7, 0.3, 0.9, 0.22);
          this.puffSmoke(ev.x, ev.y + 0.5, ev.z, 50, 0, 4, 0, 5, 5, 1.5, 9, 0.35, 0.75); this.dust(ev.x, ev.y + 0.2, ev.z, 50, 0, 6, 0, 7, 2.2, 0.8, 4);
          this.decal(ev.x, ev.y, ev.z, 3.2, 0x1a1510); AUDIO.play('explosion', ev.x, ev.y, ev.z, 1);
          if (this.sim.real) { const d = this.camera.position.distanceTo(this.tmp.v.set(ev.x, ev.y, ev.z)); if (d < 28) { const k = 1 - d / 28; this.suppress = Math.min(1.3, (this.suppress || 0) + k * 1.2); this.shake = Math.max(this.shake, k * 1.4); AUDIO.shellshock(k); } }
          const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 45) this.shake = Math.max(this.shake, 1.2 * (1 - dc / 45));
          break;
        }
        case 'swing': { const u = units[ev.id]; if (u) AUDIO.play(u.weapon === 'yari' ? 'thrust' : 'swish', ev.x, ev.y + 1.3, ev.z, ev.id === heroId ? 1.3 : 0.9); break; }
        case 'windup': { const u = units[ev.id]; if (u && ev.id !== heroId && u.team !== this.localTeam) { const dc = Math.hypot(u.x - this.camera.position.x, u.z - this.camera.position.z); if (dc < 14) { const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw); this.sparks.spawn(u.x + fx * 0.5 - Math.cos(u.yaw) * 0.3, u.y + 1.9, u.z + fz * 0.5 + Math.sin(u.yaw) * 0.3, 0, 0.3, 0, 0.18, 0.9, 0.2, 1, 0.45, 0.35, 1, 1, 0, 1, 0.2, 0.1); } } break; }
        case 'hit': {
          { // a blow that lands has weight: the struck man is shoved and bends away, the blade bites with a thud, a little blood and grit fly
            const vic = units[ev.id], att = ev.att >= 0 ? units[ev.att] : null, mine = ev.att === heroId && ev.id !== heroId;
            let dx = vic && att ? vic.x - att.x : 0, dz = vic && att ? vic.z - att.z : 1; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
            const melee = ev.cause === 'melee' || ev.cause === 'trample' || ev.cause === 'spear', shot = ev.cause === 'shot' || ev.cause === 'headshot' || ev.cause === 'arrow';
            const heavyB = !!(att && (att.heavy || att.lunge)) || (ev.dmg || 0) >= 60, armd = !!(vic && vic.def && (vic.def.hp >= 115 || vic.type === 'hero'));
            const k = vic && vic.def ? clamp((ev.dmg || 20) / Math.max(40, vic.def.hp * 0.5), 0.3, 1.5) * (heavyB ? 1.35 : 1) * (ev.killed ? 1.3 : 1) : 0.6;
            if (melee) {
              this.blood(ev.x, ev.y, ev.z, mine ? (heavyB ? 16 : 11) : 7, dx * 2.2, 1, dz * 2.2);
              /* hit mist, dust and red sparks on the struck man removed (user: no green/red particles on fallen men) */
              if (armd) this.burstSparks(ev.x, ev.y, ev.z, mine ? 10 : 5, 4, 1, 0.8, 0.45, 0.25, 0.07);
              /* hit mist, dust and red sparks on the struck man removed (user: no green/red particles on fallen men) */
              AUDIO.play(armd ? 'strikearmor' : heavyB ? 'strikeheavy' : 'strike', ev.x, ev.y, ev.z, mine ? 1.25 : 0.95);
            } else if (shot && vic) { this.dust(ev.x, ev.y, ev.z, 3, dx * 0.6, 0.4, dz * 0.6, 0.25, 0.45, 0.12, 0.45); this.blood(ev.x, ev.y, ev.z, 4, dx * 2.5, 0.6, dz * 2.5); AUDIO.play('strike', ev.x, ev.y, ev.z, 0.5); }
            if (vic && ev.id !== heroId && (melee || shot)) this.hitImpulse(ev.id, dx, dz, k * (shot ? 0.6 : 1), heavyB);
            if (mine && melee) { this.recoil = Math.max(this.recoil, heavyB ? 0.75 : 0.45); this.recoilRoll = (Math.random() - 0.5) * (heavyB ? 1.4 : 0.8); this.shake = Math.max(this.shake, heavyB || ev.killed ? 0.35 : 0.18);
              if (this.imp) { this.imp.fov = Math.min(9, this.imp.fov + (heavyB ? 3 : 1.2)); this.imp.vp -= heavyB ? 2.2 : 1.1; }
              this.hitMarkPop = ev.killed ? 2 : 1; if (ev.killed) AUDIO.play('killcue', undefined, 0, 0, 0.9); } }
          if (ev.id === heroId) { this.hitFlash = 0.6; this.shake = Math.max(this.shake, 0.6); const hh = units[heroId], a = ev.att >= 0 ? units[ev.att] : null; if (hh && ev.cause !== 'fire') { const k = clamp((ev.dmg || 20) / Math.max(40, hh.def.hp * 0.45), 0.25, 1.4) * (ev.cause === 'trample' || ev.cause === 'explosion' ? 1.4 : 1); this.impact(a ? a.x : ev.x, a ? a.z : ev.z + 0.01, k, ev.cause === 'trample' || ev.cause === 'explosion'); } }
          if (ev.att === heroId && ev.id !== heroId && (ev.cause === 'melee' || ev.cause === 'spear')) { const at0 = units[heroId], hv = !!(at0 && (at0.heavy || at0.lunge)) || (ev.dmg || 0) >= 60; this.hitMark = ev.killed ? 0.5 : 0.32; this.hitMarkHead = false; AUDIO.play('hitmark', undefined, 0, 0, 0.8); this.hitstop = Math.max(this.hitstop, ev.killed ? 0.09 : hv ? 0.075 : 0.05); }
          break;
        }
        case 'block': {
          this.burstSparks(ev.x, ev.y, ev.z, ev.perfect ? 26 : 12, ev.perfect ? 9 : 6, 1, 0.9, 0.6, 0.35, 0.09); AUDIO.play(ev.shield && !ev.perfect ? 'shield' : 'clang', ev.x, ev.y, ev.z, ev.perfect ? 1.4 : 1);
          if (ev.perfect && ev.by === heroId) { this.parryFlash = 0.6; AUDIO.play('parry', undefined, 0, 0, 1); this.hitstop = Math.max(this.hitstop, 0.06); }
          if (ev.att === heroId) this.shake = Math.max(this.shake, ev.perfect ? 0.5 : 0.25);
          break;
        }
        case 'heavy': { const u = units[ev.id]; if (u && Math.abs(u.x - this.camera.position.x) + Math.abs(u.z - this.camera.position.z) < 60) { this.burstSparks(u.x + Math.sin(u.yaw) * 0.5, u.y + 1.7, u.z + Math.cos(u.yaw) * 0.5, 10, 2, 1, 0.25, 0.1, 0.5, 0.08); AUDIO.play('whistle', u.x, u.y, u.z, 0.35); } break; }
        case 'posturebreak': { this.burstSparks(ev.x, ev.y, ev.z, 30, 7, 1, 0.95, 0.5, 0.6, 0.1); this.flash(ev.x, ev.y, ev.z, 2.5, 0.1); AUDIO.play('clang', ev.x, ev.y, ev.z, 1.8); AUDIO.play('thud', ev.x, ev.y, ev.z, 1.3);
          if (ev.by === heroId) { this.hitstop = Math.max(this.hitstop, 0.1); this.shake = Math.max(this.shake, 0.5); this.hitQ = { text: '破 BROKEN — strike now', t: 1.4, c: '#ffd36a' }; }
          if (ev.id === heroId) { this.shake = Math.max(this.shake, 0.9); this.hitQ = { text: 'GUARD BROKEN', t: 1.2, c: '#ff5a4a' }; } break; }
        case 'guardcrush': { this.burstSparks(ev.x, ev.y, ev.z, 20, 7, 1, 0.6, 0.3, 0.5, 0.1); AUDIO.play('clang', ev.x, ev.y, ev.z, 1.5); AUDIO.play('thud', ev.x, ev.y, ev.z, 1);
          if (ev.att === heroId) { this.hitstop = Math.max(this.hitstop, 0.07); this.shake = Math.max(this.shake, 0.45); this.hitQ = { text: 'GUARD CRUSHED', t: 1, c: '#ffb04a' }; } if (ev.by === heroId) { this.shake = Math.max(this.shake, 0.8); this.hitQ = { text: 'Heavy blow — parry it, don\'t block', t: 1.6, c: '#ff5a4a' }; } break; }
        case 'entangle': { this.dust(ev.x, ev.y, ev.z, 5, 0, 0.6, 0, 0.6, 0.4, 0.1, 0.5); if (ev.id === heroId) this.hitQ = { text: 'SNARED by wolf-brush — dodge out', t: 1.2, c: '#9fe07a' }; break; }
        case 'hitq': { if (ev.att === heroId) { const T = { clean: ['CLEAN', '#fff'], tip: ['TIP — perfect measure', '#9fe0ff'], jammed: ['JAMMED — too close for a spear', '#ff9a7a'], graze: ['GRAZE — step in', '#ccc'], pinned: ['PINNED', '#9fe07a'], deathblow: ['致命 DEATHBLOW', '#ffd36a'] }[ev.q] || ['HIT', '#fff'];
            this.hitQ = { text: (ev.heavy ? 'HEAVY · ' : '') + T[0], t: 0.9, c: T[1] }; this.hitstop = Math.max(this.hitstop, ev.heavy || ev.q === 'deathblow' ? 0.09 : ev.q === 'tip' ? 0.05 : 0.03); if (ev.heavy || ev.q === 'deathblow') this.shake = Math.max(this.shake, 0.45); }
          /* hit mist, dust and red sparks on the struck man removed (user: no green/red particles on fallen men) */ break; }
        case 'obstruct': { AUDIO.play('thud', ev.x, ev.y, ev.z, 0.8); if (ev.id === heroId) { this.hitQ = { text: 'BLADE CAUGHT on a comrade — stab (R) in formation', t: 1.4, c: '#e0b070' }; this.shake = Math.max(this.shake, 0.3); } break; }
        case 'kickhit': { this.dust(ev.x, ev.y, ev.z, 4, 0, 1, 0, 1, 0.5, 0.2, 0.6); AUDIO.play('thud', ev.x, ev.y, ev.z, 1); break; }
        case 'trample': { this.dust(ev.x, ev.y + 0.2, ev.z, 10, 0, 2, 0, 2, 1, 0.4, 1.6); AUDIO.play('thud', ev.x, ev.y, ev.z, 1.2); break; }
        case 'land': { this.dust(ev.x, ev.y + 0.1, ev.z, 8, 0, 1.5, 0, 1.8, 0.9, 0.4, 1.4); AUDIO.play('thud', ev.x, ev.y, ev.z, 0.7); break; }
        case 'death': {
          const u = units[ev.id]; if (!u) break;
          this.hideFigure(ev.id);
          if (ev.cause === 'fled') { if (u.mounted) { const hs = this.horseSlot.get(u.id); if (hs !== undefined) this.hideHorse(hs); } break; }
          if (u.def.ai === 'cannon') { this.drawCannon(this.cannonSlot.get(u.id), u, u.x, u.y, u.z, u.yaw, true); for (const k in this.cannon) this.cannon[k].instanceMatrix.needsUpdate = true; AUDIO.play('death', u.x, u.y, u.z, 0.8); break; }
          if (u.type === 'horse') AUDIO.play('horsedie', u.x, u.y + 1, u.z, 0.8);
          if (u.type === 'horse' || u.mounted) { this.deadHorses.push({ id: u.id, x: u.x, y: u.y, z: u.z, yaw: u.type === 'horse' ? u.yaw : u.hyaw, t: 0 }); if (u.type === 'horse') { this.hideFigure(u.id); AUDIO.play('death', u.x, u.y, u.z, 0.8); break; } }
          const rag = this.ragdolls[this.ragNext]; this.ragNext = (this.ragNext + 1) % MAXRAG;
          const slot = units.length + this.ragdolls.indexOf(rag);
          rag.spawn(u, ev.ix, ev.iy, ev.iz, slot); rag.unit = u; this.colorFigure(slot, u);
          this.blood(u.x, u.y + 1.1, u.z, 6, 0, 1, 0);
          { const gr = terrainH(u.x, u.z); if (ev.cause !== 'fire' && ev.cause !== 'lightning') this.timers.push({ t: 0.9, fn: () => { this.decal(u.x + rnd(-0.4, 0.4), gr, u.z + rnd(-0.4, 0.4), 0.55 + Math.random() * 0.45, 0x4a0d0e); } }); else this.decal(u.x, gr, u.z, 0.9, 0x161210); }
          { const g = gearFor(u); const imp = Math.hypot(ev.ix, ev.iz); rag.hatOff = !!g.hat && (uhash(u.id, 11) < 0.65 || imp > 6);
            if (rag.hatOff) { const h = g.hat; this.spawnDebris(h.m, u.x, u.y + 1.75, u.z, ev.ix * 0.5 + rnd(-1, 1), 3 + Math.random() * 3 + Math.max(0, ev.iy) * 0.3, ev.iz * 0.5 + rnd(-1, 1), h.s[0], h.s[1], h.s[2], h.k, 0.4); }
            const w = u.weapon, fx = Math.sin(u.yaw), fz = Math.cos(u.yaw);
            const wd = w === 'katana' ? [0.035, 0.05, 1.0, 0xcfd6dc] : w === 'yari' ? [0.04, 0.04, 2.5, 0x8b6b4a] : w === 'rifle' ? [0.06, 0.09, 1.35, 0x4a2e18] : w === 'bow' ? [0.04, 0.04, 1.9, 0x5a3b1e] : w === 'revolver' ? [0.04, 0.1, 0.28, 0x3a3a3f] : null;
            if (wd) this.spawnDebris('b', u.x + fx * 0.4, u.y + 1.1, u.z + fz * 0.4, ev.ix * 0.3 + fx * rnd(0.5, 2), 2 + Math.random() * 2, ev.iz * 0.3 + fz * rnd(0.5, 2), wd[0], wd[1], wd[2], wd[3], 0.5); }
          if (typeof VOICE === 'undefined' || !VOICE.on || u.type === 'horse') AUDIO.play(Math.random() < 0.55 ? 'scream' : 'death', u.x, u.y + 1, u.z, 0.9);
          if (ev.killer === heroId) { this.hitMark = 0.45; }
          break;
        }
        case 'reload': { if (ev.id === heroId) AUDIO.play('click', undefined, 0, 0, 1); break; }
        case 'arrow': { AUDIO.play('twang', ev.x, ev.y, ev.z, 1); break; }
        case 'arrowhit': { this.blood(ev.x, ev.y, ev.z, 5, 0, 0.5, 0); AUDIO.play('flesh', ev.x, ev.y, ev.z, 0.8); break; }
        case 'arrowstick': { const i = this.stuckNext; this.stuckNext = (this.stuckNext + 1) % this.stuckN; this.tmp.v.set(ev.vx, ev.vy, ev.vz).normalize(); this.tmp.q.setFromUnitVectors(this.tmp.v2.set(0, 0, 1), this.tmp.v); this.tmp.m.compose(this.tmp.v3.set(ev.x - this.tmp.v.x * 0.35, ev.y - this.tmp.v.y * 0.35, ev.z - this.tmp.v.z * 0.35), this.tmp.q, this.tmp.v4.set(1, 1, 1)); this.stuck.setMatrixAt(i, this.tmp.m); this.stuck.instanceMatrix.needsUpdate = true; this.dust(ev.x, ev.y + 0.05, ev.z, 2, 0, 0.6, 0, 0.5, 0.5, 0.15, 0.4); AUDIO.play(ev.y > 0.4 ? 'woodhit' : 'dirt', ev.x, ev.y, ev.z, 0.7); break; }
        case 'bounce': { this.dust(ev.x, ev.y + 0.1, ev.z, ev.big ? 14 : 8, 0, 2.5, 0, 2.2, 1.0, 0.4, 1.8); AUDIO.play('cannonhit', ev.x, ev.y, ev.z, ev.big ? 1.2 : 0.9); const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 18) this.shake = Math.max(this.shake, 0.25 * (1 - dc / 18)); break; }
        case 'solidhit': { this.blood(ev.x, ev.y, ev.z, 14, 0, 1.5, 0); this.dust(ev.x, ev.y, ev.z, 6, 0, 1.5, 0, 1.5, 0.7, 0.3, 1.2); AUDIO.play('flesh', ev.x, ev.y, ev.z, 1.3); break; }
        case 'gatlingstart': { break; }
        case 'rally': { this.burstSparks(ev.x, ev.y + 1.2, ev.z, 30, 6, 1, 0.85, 0.4, 0.8, 0.14); AUDIO.play('shout', ev.x, ev.y, ev.z, 1); break; }
        case 'battle': { AUDIO.play('drum', undefined, 0, 0, 1); break; }
        case 'rout': { const sq = sim.squads[ev.sq]; if (sq) AUDIO.play('horn', sq.cx, 1, sq.cz, 1); break; }
        case 'commanderdown': { AUDIO.play('drum', undefined, 0, 0, 0.8); break; }
        case 'captain': { const sq = sim.squads[ev.sq]; if (!sq) break; const u = units[sq.unitIds[0]]; const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw);
          this.spawnDebris('b', u.x - fx * 0.3, u.y + 2.6, u.z - fz * 0.3, -fx * 2 + rnd(-1, 1), 1.5, -fz * 2 + rnd(-1, 1), 0.05, 4.4, 0.05, 0x3b2a1a, 0.15);
          this.spawnDebris('b', u.x - fx * 0.5, u.y + 3.8, u.z - fz * 0.5, -fx * 3 + rnd(-1, 1), 2, -fz * 3 + rnd(-1, 1), 0.02, 1.9, 0.5, sq.team === 0 ? 0xb8262a : BANNER[(sq.id * 7 + 3) % 4], 0.1);
          AUDIO.play('horn', u.x, u.y, u.z, 0.8); break; }
        case 'ability': { const sq = sim.squads[ev.sq]; if (!sq) break; const gy = terrainH(ev.x, ev.z);
          const snd = ev.kind === 'kiai' || ev.kind === 'wedge' ? 'kiai' : ev.kind === 'spearwall' ? 'brace' : ev.kind === 'aimed' ? 'drum' : 'ui'; AUDIO.play(snd, ev.x, gy + 1.5, ev.z, 1.2);
          for (const id of sq.unitIds) { const v = units[id]; if (v.dead) continue; this.sparks.spawn(v.x, v.y + 2.1, v.z, 0, 1.2, 0, 0.6, 0.5, 0.1, 1, 0.82, 0.35, 1, 1, -0.5, 1, 0.5, 0.1); }
          if (ev.kind === 'kiai' || ev.kind === 'wedge') this.dust(ev.x, gy + 0.2, ev.z, 20, 0, 1.5, 0, 6, 1.4, 0.6, 3); break; }
        case 'brushsnare': { this.dust(ev.x, ev.y - 1.2, ev.z, 10, 0, 1.2, 0, 2, 1, 0.4, 1.6); this.blood(ev.x, ev.y, ev.z, 6, 0, 0.8, 0); AUDIO.play('thud', ev.x, ev.y, ev.z, 1.2); AUDIO.play('neigh', ev.x, ev.y, ev.z, 0.9); if (ev.by === heroId) this.hitQ = { text: '狼筅 · the brush stops the horse', t: 1.2, c: '#9fe07a' }; break; }
        case 'spearwall': { this.burstSparks(ev.x, ev.y, ev.z, 14, 6, 1, 0.85, 0.5, 0.35, 0.1); this.blood(ev.x, ev.y, ev.z, 10, 0, 1, 0); AUDIO.play('thud', ev.x, ev.y, ev.z, 1.4); AUDIO.play('clang', ev.x, ev.y, ev.z, 0.8); break; }
        case 'misfire': { this.puffSmoke(ev.x, ev.y, ev.z, 5, 0, 0.8, 0, 0.3, 2.2, 0.3, 1.2, 0.7, 0.45); this.sparks.spawn(ev.x, ev.y, ev.z, 0, 0.4, 0, 0.2, 0.3, 0.05, 1, 0.7, 0.3, 1, 1, 0, 1, 0.4, 0.1); AUDIO.play('misfire', ev.x, ev.y, ev.z, ev.id === heroId ? 1.5 : 1); break; }
        case 'lightning': {
          this.lightFlash = 1; this.boltT = 0.45; this.makeBolt(ev.x, ev.y, ev.z);
          this.flash(ev.x, ev.y + 1, ev.z, 10, 0.25); this.burstSparks(ev.x, ev.y + 0.5, ev.z, 50, 12, 0.85, 0.9, 1, 0.6, 0.18);
          this.puffSmoke(ev.x, ev.y + 0.5, ev.z, 20, 0, 2, 0, 3, 5, 1, 5, 0.4, 0.6); this.decal(ev.x, ev.y, ev.z, 2.6, 0x14110e);
          AUDIO.play('thunder', ev.x, ev.y + 20, ev.z, 1);
          const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 60) this.shake = Math.max(this.shake, 0.9 * (1 - dc / 60)); break; }
        case 'navalcall': { const gy = terrainH(ev.x, ev.z); this.navalMarks.push({ x: ev.x, z: ev.z, y: gy, t: 0, team: ev.team });
          AUDIO.play('horn', ev.x, gy, ev.z, 0.7); const sx = ev.x - 260;
          for (let i = 0; i < 6; i++) { this.timers.push({ t: 1.2 + i * 0.4, fn: () => AUDIO.play('cannon', sx, 5, ev.z, 0.8) }); this.timers.push({ t: 4 + i * 0.4 + 0.75, fn: () => AUDIO.play('whistle', ev.x, gy + 25, ev.z, 1) }); }
          break; }
        case 'capture': case 'lost': AUDIO.play('gong', undefined, 0, 0, 1); break;
        case 'weather': { AUDIO.setRain(!!sim.rain); AUDIO.play('thunder', this.camera.position.x + 200, 60, this.camera.position.z, ev.kind === 'rain' ? 0.6 : 0.15); break; }
        case 'wagonburn': { const gy = terrainH(ev.x, ev.z); this.flash(ev.x, gy + 1, ev.z, 6, 0.3); this.burstSparks(ev.x, gy + 1.2, ev.z, 50, 7, 1, 0.6, 0.2, 0.9, 0.15); AUDIO.play('explosion', ev.x, gy, ev.z, 0.6); AUDIO.play('fire', ev.x, gy, ev.z, 2); break; }
        case 'hab': { if (ev.key === 'smoke') { AUDIO.play('explosion', ev.x, ev.y, ev.z, 0.25); } if (ev.key === 'vault') { AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 1.6); this.dust(ev.x, ev.y + 0.2, ev.z, 14, 0, 1, 0, 1.6, 1, 0.4, 1.8); } if (ev.key === 'unbreak' || ev.key === 'brace') AUDIO.play('brace', ev.x, ev.y, ev.z, 1.4); if (ev.k === 1) { AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 1.6); AUDIO.play('gallop', ev.x, ev.y, ev.z, 1.2); if (ev.id === heroId) { this.fovTarget = (this.fovTarget || 75) + 12; this.shake = Math.max(this.shake, 0.3); } }
          if (ev.k === 2) { AUDIO.play('clang', ev.x, ev.y + 1.3, ev.z, 0.7); AUDIO.play('brace', ev.x, ev.y, ev.z, 1); }
          if (ev.k === 0) AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 1.5); break; }
        case 'whirl': { const gy = ev.y; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; this.sparks.spawn(ev.x + Math.sin(a) * 2.6, gy + 1.1, ev.z + Math.cos(a) * 2.6, Math.sin(a) * 6, 0.4, Math.cos(a) * 6, 0.3, 0.35, 0.05, 1, 0.9, 0.7, 1, 0.8, 0, 1, 0.5, 0.2); } this.dust(ev.x, gy + 0.2, ev.z, 26, 0, 1.2, 0, 4.5, 1.2, 0.5, 2.4); AUDIO.play('swish', ev.x, gy + 1, ev.z, 1.8); if (ev.hits) AUDIO.play('thud', ev.x, gy + 1, ev.z, 1.4); if (ev.id === heroId) this.shake = Math.max(this.shake, 0.4 + ev.hits * 0.05); break; }
        case 'warcry': { const gy = ev.y; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; this.dust(ev.x + Math.sin(a) * 2, gy + 0.2, ev.z + Math.cos(a) * 2, 1, Math.sin(a) * 14, 0.6, Math.cos(a) * 14, 0.3, 1.4, 0.6, 2.4); } this.burstSparks(ev.x, gy + 2, ev.z, 40, 6, 1, ev.team === 0 ? 0.3 : 0.85, 0.15, 0.8, 0.14); AUDIO.play('kiai', ev.x, gy + 1.5, ev.z, 1.8); AUDIO.play('drum', undefined, 0, 0, 0.9); if (ev.clash) { AUDIO.play('gong', undefined, 0, 0, 1.4); this.flash(ev.x, gy + 2, ev.z, 8, 0.25); } break; }
        case 'guardcounter': { this.burstSparks(ev.x, ev.y, ev.z, 36, 9, 1, 0.85, 0.35, 0.5, 0.12); this.flash(ev.x, ev.y, ev.z, 3, 0.12); AUDIO.play('clang', ev.x, ev.y, ev.z, 1.6); AUDIO.play('parry', undefined, 0, 0, ev.by === heroId || ev.att === heroId ? 1 : 0.0001); if (ev.att === heroId) this.shake = Math.max(this.shake, 0.8); if (ev.by === heroId) { this.parryFlash = 0.6; this.hitstop = Math.max(this.hitstop, 0.08); } break; }
        case 'guardbreak': { this.burstSparks(ev.x, ev.y, ev.z, 20, 6, 0.8, 0.8, 0.8, 0.4, 0.1); AUDIO.play('clang', ev.x, ev.y, ev.z, 1.2); AUDIO.play('thud', ev.x, ev.y, ev.z, 1.2); break; }
        case 'breach': { const gy = terrainH(ev.x, ev.z); if (this.gateMeshes) for (const m of this.gateMeshes) m.visible = false; for (let i = 0; i < 14; i++) this.spawnDebris('b', ev.x + rnd(-3, 3), gy + rnd(0.5, 3), ev.z + rnd(-1, 1), rnd(-4, 4), rnd(3, 8), rnd(2, 9), rnd(0.15, 0.4), rnd(0.8, 2.4), 0.2, 0x5a2a1a, 1); this.puffSmoke(ev.x, gy + 2, ev.z, 60, 0, 3, 2, 6, 10, 2, 9, 0.6, 0.7); AUDIO.play('explosion', ev.x, gy + 2, ev.z, 1.6); AUDIO.play('collapse', ev.x, gy + 2, ev.z, 1.4); this.shake = Math.max(this.shake, 1); break; }
        case 'ramhit': { const gy = terrainH(ev.x, ev.z); this.dust(ev.x, gy + 1.5, ev.z, 10, 0, 1, -1, 2, 1, 0.4, 1.6); this.burstSparks(ev.x, gy + 1.8, ev.z, 8, 4, 0.9, 0.7, 0.4, 0.3, 0.08); AUDIO.play('ram', ev.x, gy + 1.5, ev.z, 2); AUDIO.play('cannon', ev.x, gy, ev.z, 0.25); const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 25) this.shake = Math.max(this.shake, 0.35 * (1 - dc / 25)); break; }
        case 'gatehit': AUDIO.play('gatehit', ev.x, 1.5, ev.z, 1.2); break;
        case 'ramdown': { const gy = terrainH(ev.x, ev.z); for (let i = 0; i < 16; i++) this.spawnDebris('b', ev.x + rnd(-1.5, 1.5), gy + rnd(1, 3), ev.z + rnd(-2, 2), rnd(-5, 5), rnd(3, 8), rnd(-5, 5), rnd(0.15, 0.4), rnd(0.8, 3), rnd(0.15, 0.4), 0x5a3a20, 1); AUDIO.play('gong', undefined, 0, 0, 1); break; }
        case 'ladderup': { const gy = terrainH(ev.x, ev.z); AUDIO.play('thud', ev.x, gy + 3, ev.z, 1.5); AUDIO.play('shout', ev.x, gy, ev.z, 1.4); this.dust(ev.x, gy + 0.3, ev.z - 2, 8, 0, 1, 0, 1.5, 1, 0.4, 1.4); break; }
        case 'ladderdown': { const gy = terrainH(ev.x, ev.z); AUDIO.play('scream', ev.x, gy + 3, ev.z, 1.2); AUDIO.play('thud', ev.x, gy, ev.z, 1.6); for (let i = 0; i < 6; i++) this.spawnDebris('b', ev.x + rnd(-0.5, 0.5), gy + 2 + i * 0.6, ev.z - 2, rnd(-1, 1), rnd(1, 3), rnd(-4, -1), 0.9, 0.08, 0.08, 0x6a4a2c, 0.6); this.dust(ev.x, gy + 0.3, ev.z - 3, 14, 0, 1.4, 0, 2.5, 1.2, 0.5, 2); break; }
        case 'oil': { const gy = terrainH(ev.x, ev.z); for (let i = 0; i < 30; i++) this.sparks.spawn(ev.x + rnd(-0.6, 0.6), gy + 4 + rnd(0, 1), ev.z + rnd(-0.6, 0.6), rnd(-2.5, 2.5), rnd(-3, 0), rnd(-2.5, 2.5), rnd(0.6, 1.4), rnd(0.8, 1.6), 0.2, 1, 0.6, 0.15, 1, 0.6, 1, 0.9, 0.2, 0.05); this.puffSmoke(ev.x, gy + 1, ev.z, 20, 0, 2.5, 0, 2, 5, 1, 4.5, 0.2, 0.7); this.flash(ev.x, gy + 1, ev.z, 5, 0.25); AUDIO.play('fire', ev.x, gy, ev.z, 2); AUDIO.play('scream', ev.x, gy + 1, ev.z, 1); break; }
        case 'sgoil': { const gy = SIM.terrainH(ev.x, ev.z); for (let i = 0; i < 40; i++) this.sparks.spawn(ev.x + rnd(-0.8, 0.8), gy + ev.y - 1 + rnd(0, 1), ev.z + 1.5 + rnd(-0.4, 0.4), rnd(-2, 2), rnd(-6, -1), rnd(-2.5, 0), rnd(0.6, 1.4), rnd(0.8, 1.8), 0.2, 1, 0.6, 0.15, 1, 0.6, 1, 0.9, 0.2, 0.05); this.puffSmoke(ev.x, gy + 1, ev.z, 26, 0, 2.5, 0, 2.5, 6, 1, 5, 0.2, 0.75); this.flash(ev.x, gy + 1, ev.z, 6, 0.3); AUDIO.play('fire', ev.x, gy, ev.z, 2.2); AUDIO.play('scream', ev.x, gy + 1, ev.z, 1); break; }
        case 'sgstone': { const gy = SIM.terrainH(ev.x, ev.z); for (let i = 0; i < 9; i++) this.spawnDebris('b', ev.x + rnd(-1.2, 1.2), gy + ev.y + rnd(0, 1.5), ev.z + 1.2, rnd(-1.5, 1.5), rnd(-4, 0), rnd(-2.5, -0.5), rnd(0.3, 0.7), rnd(0.3, 0.6), rnd(0.3, 0.7), 0x77726a, 1); this.dust(ev.x, gy + 0.3, ev.z, 18, 0, 1.4, 0, 2.6, 1.3, 0.5, 2.2); AUDIO.play('thud', ev.x, gy, ev.z, 2); AUDIO.play('scream', ev.x, gy + 1, ev.z, 0.8); break; }
        case 'sgladder': { const gy = SIM.terrainH(ev.x, ev.z - 2); if (ev.up) { AUDIO.play('thud', ev.x, gy + 3, ev.z, 1.5); this.dust(ev.x, gy + 0.3, ev.z - 2.5, 8, 0, 1, 0, 1.5, 1, 0.4, 1.4); } else { AUDIO.play('scream', ev.x, gy + 3, ev.z, 1.2); AUDIO.play('thud', ev.x, gy, ev.z, 1.6); for (let i = 0; i < 6; i++) this.spawnDebris('b', ev.x + rnd(-0.5, 0.5), gy + 2 + i * 0.6, ev.z - 2, rnd(-1, 1), rnd(1, 3), rnd(-4, -1), 0.9, 0.08, 0.08, 0x6a4a2c, 0.6); this.dust(ev.x, gy + 0.3, ev.z - 3, 14, 0, 1.4, 0, 2.5, 1.2, 0.5, 2); } break; }
        case 'sgbreach': { const gy = SIM.terrainH(ev.x, ev.z - 4); for (let i = 0; i < 16; i++) this.spawnDebris('b', ev.x + rnd(-3, 3), gy + rnd(0.5, 4), ev.z + rnd(-1, 1), rnd(-4, 4), rnd(3, 8), rnd(2, 9), rnd(0.15, 0.4), rnd(0.8, 2.4), 0.2, 0x5a2a1a, 1); this.puffSmoke(ev.x, gy + 2, ev.z, 60, 0, 3, 2, 6, 10, 2, 9, 0.6, 0.7); AUDIO.play('collapse', ev.x, gy + 2, ev.z, 1.6); this.shake = Math.max(this.shake, 1); break; }
        case 'sghole': { const gy = SIM.terrainH(ev.x, ev.z - 2); for (let i = 0; i < 12; i++) this.spawnDebris('b', ev.x + rnd(-1, 1), gy + rnd(0.5, 3), ev.z - 0.5, rnd(-2, 2), rnd(1, 4), rnd(-4, -1), rnd(0.2, 0.5), rnd(0.2, 0.5), rnd(0.2, 0.5), 0x6f6a62, 1); this.puffSmoke(ev.x, gy + 1.5, ev.z - 1, 30, 0, 1.5, -1, 3, 6, 1.5, 6, 0.6, 0.7); AUDIO.play('collapse', ev.x, gy + 2, ev.z, 1.2); break; }
        case 'sgdock': { const gy = SIM.terrainH(ev.x, ev.z); AUDIO.play('thud', ev.x, gy + 6, ev.z, 2); this.dust(ev.x, gy + 6.6, ev.z + 4, 14, 0, 0.5, 0, 2, 1.2, 0.5, 2); break; }
        case 'sgengine': { const gy = SIM.terrainH(ev.x, ev.z); for (let i = 0; i < 22; i++) this.spawnDebris('b', ev.x + rnd(-2, 2), gy + rnd(1, ev.kind === 'tower' ? 9 : 3), ev.z + rnd(-2, 2), rnd(-5, 5), rnd(2, 8), rnd(-5, 5), rnd(0.15, 0.45), rnd(0.8, 3), rnd(0.15, 0.4), 0x5a3a20, 1); this.puffSmoke(ev.x, gy + 2, ev.z, 40, 0, 2.5, 0, 4, 8, 1.5, 6, 0.25, 0.7); AUDIO.play('collapse', ev.x, gy + 2, ev.z, 1.3); break; }
        case 'sghit': { this.burstSparks(ev.x, ev.y, ev.z, ev.kind === 'arrow' ? 3 : 14, 5, 0.8, 0.6, 0.35, 0.35, 0.08); if (ev.kind !== 'arrow') { for (let i = 0; i < 5; i++) this.spawnDebris('b', ev.x, ev.y, ev.z, rnd(-3, 3), rnd(1, 4), rnd(-3, 3), 0.5, 0.06, 0.06, 0x6a4a2c, 1); AUDIO.play('thud', ev.x, ev.y, ev.z, 1.4); } break; }
        case 'sgshot': { this.flash(ev.x, ev.y, ev.z, ev.gun ? 5 : 1.5, ev.gun ? 0.2 : 0.08); if (ev.by === heroId && ev.by >= 0) { this.empKick = 1; this.recoil = 1; this.recoilRoll = rnd(-1, 1); this.shake = Math.max(this.shake, ev.gun ? 1 : 0.35); if (this.imp) this.imp.vp += ev.gun ? 2.2 : 0.8; } if (ev.gun) { this.puffSmoke(ev.x + ev.dx * 1.5, ev.y, ev.z + ev.dz * 1.5, 30, ev.dx * 3, 0.6, ev.dz * 3, 1.5, 5, 1, 4.5, 0.85, 0.7); AUDIO.play('cannon', ev.x, ev.y, ev.z, 1.6); const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 40) this.shake = Math.max(this.shake, 0.6 * (1 - dc / 40)); } else AUDIO.play('thud', ev.x, ev.y, ev.z, 1.2); break; }
        case 'sgsaltpeter': AUDIO.play('fire', this.camera.position.x, 0, ev.z, 1.6); break;
        case 'sgram': { const gy = SIM.terrainH(ev.x, ev.z - 2); this.dust(ev.x, gy + 1.5, ev.z - 1, 10, 0, 1, -1, 2, 1, 0.4, 1.6); this.burstSparks(ev.x, gy + 1.8, ev.z - 0.5, 8, 4, 0.9, 0.7, 0.4, 0.3, 0.08); AUDIO.play('ram', ev.x, gy + 1.5, ev.z, 2); const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 25) this.shake = Math.max(this.shake, 0.35 * (1 - dc / 25)); break; }
        case 'sgfill': AUDIO.play('thud', ev.x, 0, ev.z, 1.2); break;
        case 'sgpush': AUDIO.play('thud', ev.x, 6, ev.z, 1.2); break;
        case 'execute': { this.blood(ev.x, ev.y + 0.6, ev.z, 20, 0, 1.5, 0); AUDIO.play('flesh', ev.x, ev.y, ev.z, 1.8); if (ev.id === heroId) { this.hitstop = Math.max(this.hitstop, 0.09); this.shake = Math.max(this.shake, 0.5); } break; }
        case 'streak': { const u = units[ev.id]; if (u) { this.burstSparks(u.x, u.y + 2.2, u.z, 50, 7, 1, 0.8, 0.3, 1, 0.15); AUDIO.play('kiai', u.x, u.y + 1.5, u.z, 1.5); } break; }
        case 'quake': { const fx = Math.sin(ev.yaw), fz = Math.cos(ev.yaw); for (let i = 0; i < 40; i++) { const a = ev.yaw + rnd(-1.1, 1.1), d = rnd(0.5, 6.5); const x = ev.x + Math.sin(a) * d, z = ev.z + Math.cos(a) * d; this.dust(x, terrainH(x, z) + 0.2, z, 1, Math.sin(a) * 6, 2.5, Math.cos(a) * 6, 0.4, 1.4, 0.6, 2.2); } for (let i = 0; i < 6; i++) this.decal(ev.x + fx * i, ev.y, ev.z + fz * i, 1.2, 0x2a2218); AUDIO.play('explosion', ev.x, ev.y, ev.z, 0.6); const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 25) this.shake = Math.max(this.shake, 1 * (1 - dc / 25)); break; }
        case 'flame': { const fx = Math.sin(ev.yaw), fz = Math.cos(ev.yaw); for (let i = 0; i < 70; i++) { const sp = rnd(6, 13), a = ev.yaw + rnd(-0.45, 0.45); this.sparks.spawn(ev.x + fx * 0.8, ev.y + 1.3, ev.z + fz * 0.8, Math.sin(a) * sp, rnd(-0.5, 1.5), Math.cos(a) * sp, rnd(0.35, 0.6), rnd(0.6, 1.3), 0.25, 1, 0.6, 0.15, 1, 0.6, -0.5, 0.9, 0.2, 0.05); } this.puffSmoke(ev.x + fx * 4, ev.y + 1.3, ev.z + fz * 4, 14, fx * 2, 1, fz * 2, 2, 4, 1, 4, 0.25, 0.6); AUDIO.play('fire', ev.x, ev.y, ev.z, 2.2); AUDIO.play('rocket', ev.x, ev.y, ev.z, 0.8); break; }
        case 'fizzle': { this.puffSmoke(ev.x, ev.y + 1.3, ev.z, 8, 0, 0.6, 0, 0.6, 2, 0.4, 1.6, 0.6, 0.5); AUDIO.play('misfire', ev.x, ev.y, ev.z, 1.5); break; }
        case 'rocketcall': { const gy = terrainH(ev.x, ev.z); this.flash(ev.x, gy + 0.5, ev.z, 3, 0.4); AUDIO.play('horn', ev.x, gy, ev.z, 0.8); for (let i = 0; i < 9; i++) this.timers.push({ t: 0.9 + i * 0.17, fn: () => AUDIO.play('rocket', ev.x, gy + 25, ev.z, 1) }); break; }
        case 'pickup': { const gy = terrainH(ev.x, ev.z); this.burstSparks(ev.x, gy + 1, ev.z, 30, 4, 0.4, 1, 0.55, 0.8, 0.12); AUDIO.play('parry', undefined, 0, 0, 0.6); break; }
        case 'classpick': break;
        case 'dodge': { const u = units[ev.id]; this.dust(ev.x, ev.y + 0.15, ev.z, 10, 0, 0.6, 0, 1.2, 0.9, 0.35, 1.5); AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 0.7); AUDIO.play('dirt', ev.x, ev.y, ev.z, 0.9); if (u) { const ss = units[ev.id]; for (let k = 1; k <= 4; k++) this.dust(ss.x + ss.dodgeX * k * 0.8, ss.y + 0.1, ss.z + ss.dodgeZ * k * 0.8, 4, 0, 0.4, 0, 0.8, 0.7, 0.3, 1.2); } if (ev.id === heroId) { this.shake = Math.max(this.shake, 0.1); } break; }
        case 'leap': { this.dust(ev.x, ev.y + 0.15, ev.z, 14, 0, 1, 0, 1.6, 1, 0.4, 1.8); AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 0.8); break; }
        case 'lunge': { const u = units[ev.id]; const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw); for (let i = 0; i < 12; i++) this.sparks.spawn(ev.x + fx * i * 0.35, ev.y + 1.2, ev.z + fz * i * 0.35, fx * 4, 0, fz * 4, 0.25, 0.25, 0.02, 1, 0.95, 0.8, 1, 0.8, 0, 1, 0.6, 0.3); AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 1.8); if (ev.id === heroId) this.shake = Math.max(this.shake, 0.25); break; }
        case 'plunge': { const u = units[ev.id]; AUDIO.play('swish', u.x, u.y + 2, u.z, 1.6); break; }
        case 'slam': { for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; this.dust(ev.x + Math.sin(a) * 1.2, ev.y + 0.2, ev.z + Math.cos(a) * 1.2, 1, Math.sin(a) * 9, 0.8, Math.cos(a) * 9, 0.3, 1.2, 0.5, 2); } this.burstSparks(ev.x, ev.y + 0.3, ev.z, 30, 8, 1, 0.8, 0.5, 0.4, 0.12); this.decal(ev.x, ev.y, ev.z, 1.6, 0x2a2218); AUDIO.play('explosion', ev.x, ev.y, ev.z, 0.35); AUDIO.play('thud', ev.x, ev.y, ev.z, 2); const dc = Math.hypot(ev.x - this.camera.position.x, ev.z - this.camera.position.z); if (dc < 20) this.shake = Math.max(this.shake, 0.8 * (1 - dc / 20)); break; }
        case 'evade': { this.sparks.spawn(ev.x, ev.y + 1.3, ev.z, 0, 0.5, 0, 0.4, 0.9, 0.2, 0.7, 0.85, 1, 0.8, 1, 0, 0.5, 0.6, 1); AUDIO.play('swish', ev.x, ev.y + 1, ev.z, 0.6); break; }
        case 'hphase': AUDIO.play('gong', undefined, 0, 0, 1.4); AUDIO.play('drum', undefined, 0, 0, 1.2); break;
        case 'revive': { const u = units[ev.id]; if (u) this.colorFigure(ev.id, u); break; }
        case 'respawn': { const u = units[ev.id]; this.flash(u.x, u.y + 1.2, u.z, 6, 0.3); this.burstSparks(u.x, u.y + 1.2, u.z, 40, 5, 1, 0.85, 0.4, 0.8, 0.14); this.colorFigure(ev.id, u); AUDIO.play('drum', undefined, 0, 0, 0.8); break; }
        case 'chaos': {
          AUDIO.play('gong', undefined, 0, 0, 1.4); AUDIO.play('drum', undefined, 0, 0, 1);
          if (ev.kind === 1) { this.shake = Math.max(this.shake, 2.2); this.quakeT = 2.5; for (let i = 0; i < 40; i++) { const cp = this.camera.position; const x = cp.x + rnd(-60, 60), z = cp.z + rnd(-60, 60); this.dust(x, terrainH(x, z) + 0.2, z, 4, 0, 1.2, 0, 3, 2, 0.8, 3); } AUDIO.play('thunder', this.camera.position.x, 0, this.camera.position.z, 0.8); }
          if (ev.kind === 4 || ev.kind === 5) AUDIO.play('kiai', this.camera.position.x, 1, this.camera.position.z + 20, 1.4);
          break; }
        case 'throw': AUDIO.play('swish', ev.x, ev.y, ev.z, 1.1); break;
        case 'bombbounce': AUDIO.play('thud', ev.x, ev.y, ev.z, 0.5); break;
        case 'bushido': { this.flash(ev.x, ev.y + 1.2, ev.z, 6, 0.3); this.burstSparks(ev.x, ev.y + 1.2, ev.z, 60, 9, 1, 0.3, 0.15, 0.9, 0.16); this.dust(ev.x, ev.y + 0.2, ev.z, 30, 0, 2, 0, 8, 1.6, 0.8, 4); AUDIO.play('kiai', ev.x, ev.y + 1.5, ev.z, 1.6); AUDIO.play('drum', undefined, 0, 0, 1); if (ev.id === heroId) { this.shake = Math.max(this.shake, 0.8); this.bushidoFx = 1.2; } break; }
        case 'duel': AUDIO.play('gong', undefined, 0, 0, 1.3); AUDIO.play('shout', ev.x, 1, ev.z, 1.2); break;
        case 'duelend': AUDIO.play('gong', undefined, 0, 0, 1); if (ev.winner >= 0) { const w = units[ev.winner]; this.burstSparks(w.x, w.y + 2, w.z, 40, 6, 1, 0.85, 0.4, 1, 0.14); AUDIO.play('kiai', w.x, w.y + 1.5, w.z, 1); } break;
        case 'laststand': AUDIO.play('kiai', ev.x, 1.5, ev.z, 1.3); break;
        case 'ignite': { const gy = terrainH(ev.x, ev.z); this.flash(ev.x, gy + 0.5, ev.z, 3, 0.3); AUDIO.play('fire', ev.x, gy, ev.z, 1.2); break; }
        case 'mount': { AUDIO.play('thud', units[ev.id].x, units[ev.id].y, units[ev.id].z, 0.6); break; }
      }
    }
  }
  // ---------- figures ----------
  setPart(mesh, slot, root, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz) {
    const T = this.tmp;
    T.m.copy(root).multiply(T.t.makeTranslation(px, py, pz));
    if (rx || ry || rz) T.m.multiply(T.r.makeRotationFromEuler(T.e.set(rx, ry, rz)));
    T.m.multiply(T.t.makeTranslation(ox, oy, oz)).multiply(T.s.makeScale(sx, sy, sz));
    mesh.setMatrixAt(slot, T.m);
  }
  drawFigure(slot, u, x, y, z, yaw, alpha, hide) {
    if (hide) { this.hideFigure(slot); return; }
    const f = this.fig, a = this.anim(u.id), dt = this.fdt, tg = this.tg, def = u.def;
    const stT = u.st === ST_IDLE ? 0 : u.stT + alpha * DT;
    const mounted = u.mounted || u.mount >= 0, wnd = !!(u.wounded && !u.dead) && !mounted;
    // a wounded man going down (and being got up again) is animated, not snapped: a.dw runs 0 (on his feet) to 1 (on the ground)
    if (a.dw === undefined) a.dw = 0;
    if (wnd || a.dw > 0) { const want = wnd && u.downed ? 1 : 0;
      if (!wnd) { if (u.dead || mounted) a.dw = 0; else { a.dUp = true; a.dw = Math.max(0, a.dw - dt / 0.8); } } // hauled up: he gets up, he doesn't pop up
      else if (want > a.dw) { if (!(a.dw > 0)) { a.dw = 0; a.dV = uhash(u.id, 23) < 0.5 ? 1 : -1; } a.dUp = false; a.dw = Math.min(1, a.dw + dt / 1.05); }
      else if (want < a.dw) { a.dUp = true; a.dw = Math.max(0, a.dw - dt / 0.8); } }
    const down = (u.downT > 0 && !mounted) || (a.dw > 0 && !u.dead && !mounted);
    const sq = u.squad >= 0 ? this.sim.squads[u.squad] : null, routing = !!(sq && sq.routing);
    // ---------- locomotion state ----------
    const k8 = 1 - Math.exp(-8 * dt);
    let rvx = 0, rvz = 0; if (!mounted) { rvx = (u.x - u.px) * 30; rvz = (u.z - u.pz) * 30; const rs = Math.hypot(rvx, rvz); if (rs > 12) { rvx = rvz = 0; } } // legs follow how the man actually moves, so a shove or a step back is walked, not skated
    const rsp = mounted ? u.speedNow : Math.hypot(rvx, rvz); a.spd += (Math.max(rsp, Math.min(u.speedNow, rsp + 0.4)) - a.spd) * k8;
    let ryaw = yaw; // root yaw (legs); mounted riders sit along the horse
    if (u.mounted) ryaw = lerpA(u.phyaw, u.hyaw, alpha); else if (u.mount >= 0) { const h = this.sim.units[u.mount]; ryaw = lerpA(h.pyaw, h.yaw, alpha); }
    const cy = Math.cos(ryaw), sy = Math.sin(ryaw);
    if (!mounted && rsp > 0.3) { const lx = rvx * cy - rvz * sy, lz = rvx * sy + rvz * cy, l = Math.hypot(lx, lz) || 1; a.mfx += (lx / l - a.mfx) * k8; a.mfz += (lz / l - a.mfz) * k8; }
    const spd = mounted ? 0 : a.spd;
    const r = clamp((spd - 2.6) / 1.6, 0, 1), mv = clamp(spd / 1.2, 0, 1);
    a.bk = a.bk ? a.mfz < -0.12 : a.mfz < -0.35; const back = a.bk; // hysteresis: no flicker between stepping forward and backpedalling when moving sideways
    const beta0 = clamp(back ? Math.atan2(-a.mfx, -a.mfz) : Math.atan2(a.mfx, Math.max(0.05, a.mfz)), -1.1, 1.1);
    if (a.bt === undefined) a.bt = beta0; a.bt += (beta0 - a.bt) * (1 - Math.exp(-9 * dt)); const beta = a.bt; // the leg plane turns, it doesn't flip
    a.ph += (back ? -1.3 : 1) * spd * dt * 6.2832 / (1.35 + r * 0.95); // backpedalling is short, quick steps
    const ph = a.ph;
    // ---------- pose targets ----------
    const w = u.weapon, clubbing = w === 'rifle' && (u.club || (u.ctrl < 0 && u.st >= 1 && u.st <= 3)), KW = KF[clubbing ? 'club' : w]; // a gun turned round swings like a club
    const melee = w === 'katana' || w === 'yari' || clubbing;
    const runH = uhash(u.id, 9), runLean = 0.34 + 0.18 * uhash(u.id, 4); // every man runs a little differently: some bent low and driving, some upright
    let lean = 0.03 * mv + runLean * r, twist = -(0.1 + 0.08 * r) * Math.sin(ph) * mv, roll = 0, lunge = 0, crouch = 0.05 * r * uhash(u.id, 5);
    let stance = (1 - mv) * (melee ? 1 : 0.5);
    if (back && mv > 0.05) { // running backward: the weight goes back over the heels to keep from falling; three very different ways of doing it
      const bk = clamp(spd / 2.2, 0, 1) * mv, bs = Math.floor(uhash(u.id, 13) * 3), sp = Math.sin(ph);
      if (bs === 0) { lean = -0.36 * bk + 0.06 * Math.abs(sp) * bk; crouch = 0.07 * bk; twist *= 1.5; } // stumbling back, rocking on each step
      else if (bs === 1) { lean = -0.2 * bk; crouch = 0.18 * bk; roll = 0.14 * sp * bk; stance = Math.max(stance, 0.55 * bk); } // low wide crab-shuffle, swaying side to side
      else { lean = -0.46 * bk - 0.07 * Math.abs(Math.cos(ph)) * bk; twist = -0.28 * sp * bk; roll = -0.05 * bk; } // bolt upright, pedalling hard, shoulders thrashing
    }
    let rateW = 13, rateB = 10, anchor = 'R', two = true, fkR = false, fkL = false, rod = -1, arrowVis = 0, bowDraw = 0;
    let sjFl = 0;
    const atkSet = KW && KW.atk ? (KW.atk[u.atkDir] || KW.atk[2]) : null;
    const B = (clubbing ? BODYC : BODY)[u.atkDir] || BODY[2];
    const reloading = u.st === ST_RELOAD && u.reloadT > 0.6;
    if (routing && !mounted) {
      fkR = true; fkL = true; lean = 0.22; stance = 0;
    } else if (w === 'bow') {
      anchor = 'L';
      if (u.st === ST_AIM) { const g = def.bow; const t = clamp(stT / Math.max(0.2, g.aim), 0, 1); bowDraw = 1 - (1 - t) * (1 - t); set3(tg.lh, BOW.aimL); set3(tg.wd, BOW.aimD); lerp3(tg.rh, BOW.nock, BOW.cheek, bowDraw); twist = -0.45; rateW = 10; arrowVis = 1; stance = 0.5; }
      else if (reloading) { const t = clamp(stT / u.reloadT, 0, 1); set3(tg.lh, BOW.relL); set3(tg.wd, BOW.relD); keyPath(tg.rh, BOW.keys, t); arrowVis = t > 0.5 ? 2 : 0; rateW = 9; twist = -0.15 + 0.2 * Math.sin(t * PI); }
      else { set3(tg.lh, BOW.idleL); set3(tg.wd, BOW.idleD); fkR = true; }
      set3(tg.wp, tg.lh);
    } else if (w === 'revolver') {
      two = false; fkL = true;
      if (reloading) { set3(tg.wp, [-0.06, -0.2, 0.32]); set3(tg.wd, N3(0, 0.6, 0.8)); fkL = false; two = true; const t = stT * 3; set3(tg.lh, [-0.02 + Math.sin(t) * 0.03, -0.24 - Math.abs(Math.sin(t)) * 0.12, 0.3]); }
      else if (u.aiming || u.st === ST_RELOAD) { set3(tg.wp, [-0.12, 0.0, 0.52]); set3(tg.wd, [0, 0, 1]); twist = -0.3; }
      else { set3(tg.wp, [-0.2, -0.42, 0.22]); set3(tg.wd, N3(0, -0.3, 1)); }
      set3(tg.rh, tg.wp);
    } else if (KW) {
      if ((u.st === ST_WINDUP || u.st === ST_RELEASE || u.st === ST_RECOVER) && atkSet) {
        if (u.st === ST_WINDUP) { set3(tg.wp, atkSet[0].g); set3(tg.wd, atkSet[0].d); rateW = u.ctrl >= 0 ? 12 : 9; twist = B[0]; lean = B[1]; crouch = 0.04; rateB = 9; }
        else if (u.st === ST_RELEASE) {
          const t = clamp(stT / RELEASE_T, 0, 1), e = t * t * (3 - 2 * t);
          bez3(tg.wp, atkSet[0].g, atkSet[1].g, atkSet[2].g, e); nrm3(bez3(tg.wd, atkSet[0].d, atkSet[1].d, atkSet[2].d, e));
          rateW = 50; rateB = 22; twist = lerp(B[0], B[2], e); lean = lerp(B[1], B[3], e); lunge = B[4] * e; crouch = 0.04 + 0.06 * e;
        } else {
          const t = clamp(stT / Math.max(0.1, def.recover), 0, 1);
          if (t < 0.35) { const R = atkSet[2], M = atkSet[1]; for (let j = 0; j < 3; j++) { tg.wp[j] = R.g[j] + (R.g[j] - M.g[j]) * 0.2; tg.wd[j] = R.d[j] + (R.d[j] - M.d[j]) * 0.25; } nrm3(tg.wd); rateW = 9; }
          else { set3(tg.wp, KW.guard.g); set3(tg.wd, KW.guard.d); rateW = 6; }
          twist = B[2] * (1 - t); lean = B[3] * (1 - t); lunge = B[4] * (1 - t); crouch = 0.1 * (1 - t); rateB = 6;
        }
        stance = Math.max(stance, 0.7);
      } else if (u.blocking) { const K = KW.block[u.blockDir]; set3(tg.wp, K.g); set3(tg.wd, K.d); rateW = 24; twist = u.blockDir === DIR_RIGHT ? -0.2 : u.blockDir === DIR_LEFT ? 0.2 : 0; crouch = 0.05; stance = Math.max(stance, 0.7); }
      else if (u.st === ST_STUN) { set3(tg.wp, KW.stun.g); set3(tg.wd, KW.stun.d); rateW = 11; lean = -0.22; lunge = -0.12; }
      else if (w === 'rifle' && reloading && reloadStyle(u) !== 'lever') {
        const style = reloadStyle(u), t = clamp(stT / u.reloadT, 0, 1); anchor = 'W'; rateW = 8;
        if (style === 'muzzle') { if (t < 0.93) { set3(tg.wp, MZ.g); set3(tg.wd, MZ.d); } else { set3(tg.wp, KW.guard.g); set3(tg.wd, KW.guard.d); } keyPath(tg.rh, MZ.keys, t); set3(tg.lh, MZ.l); lean = 0.1; twist = 0.12; rod = t > 0.43 && t < 0.86 ? 1 : -1; stance = 0.3; }
        else if (style === 'sj') { const q = sjReload(t, tg, KW); rod = q.rod; sjFl = q.flask; lean = q.blow ? 0.14 : 0.1; twist = 0.1; stance = 0.3; rateW = 10; }
        else if (style === 'spencer') { set3(tg.wp, SP.g); set3(tg.wd, SP.d); keyPath(tg.rh, SP.keys, t); lean = 0.06; }
        else { set3(tg.wp, BR.g); set3(tg.wd, BR.d); keyPath(tg.rh, BR.keys, t); lean = 0.06; twist = -0.1; }
        if (style !== 'muzzle') { for (let j = 0; j < 3; j++) tg.lh[j] = tg.wp[j] + tg.wd[j] * KW.off2; }
      } else if (w === 'rifle' && (u.st === ST_AIM || u.aiming || (u.st === ST_RELOAD && reloadStyle(u) === 'lever'))) {
        set3(tg.wp, KW.aim.g); set3(tg.wd, KW.aim.d);
        if (u.st === ST_AIM && u.ctrl < 0) {
          // bring the musket up: from the carry, through port-arms in front of the chest, to the cheek, eased in and out
          const t = clamp(stT / S.AIM_RAISE, 0, 1), e = t * t * (3 - 2 * t), mid = RAISE_MID;
          bez3(tg.wp, KW.carry.g, mid.g, KW.aim.g, e);
          const d0 = KW.carry.d, d2 = KW.aim.d; for (let j = 0; j < 3; j++) tg.wd[j] = (1 - e) * (1 - e) * d0[j] + 2 * (1 - e) * e * mid.d[j] + e * e * d2[j];
          twist = -0.32 * e; lean = 0.02 + 0.08 * e; stance = Math.max(stance, 0.15 + 0.35 * e); rateW = 34; rateB = 14;
          if (t < 1) { tg.wp[1] += 0.03 * Math.sin(t * PI); }
          else { const sway = Math.sin(this.time * 1.7 + u.id) * 0.006; tg.wp[0] += sway; tg.wp[1] += Math.sin(this.time * 2.3 + u.id * 2) * 0.004; }
        }
        if (u.st === ST_RELOAD) { const t = clamp(stT / Math.max(0.2, u.reloadT), 0, 1); tg.wp[1] -= 0.1; tg.wd[1] -= 0.1; anchor = 'W'; set3(tg.rh, tg.wp); tg.rh[1] -= 0.14 * Math.sin(t * PI); tg.rh[2] += 0.06 * Math.sin(t * PI); for (let j = 0; j < 3; j++) tg.lh[j] = tg.wp[j] + tg.wd[j] * KW.off2; }
        if (!(u.st === ST_AIM && u.ctrl < 0)) { twist = -0.32; lean = 0.05; rateW = 11; stance = Math.max(stance, 0.4); }
        if (a.recoil > 0) { const k = a.recoil * a.recoil; tg.wp[2] -= 0.16 * k; tg.wp[1] += 0.04 * k; tg.wd[1] += 0.55 * k; twist += 0.18 * k; lean -= 0.1 * k; rateW = 60; rateB = 30; }
        nrm3(tg.wd);
      } else if (u.st === ST_SWAP) { set3(tg.wp, [0.1, -0.5, 0.12]); set3(tg.wd, N3(-0.2, -0.3, 1)); rateW = 9; }
      else if (r > 0.05) { // running: a real stride, weapon carried the way a soldier actually carries it at the double
        const sw = Math.sin(ph), sw2 = Math.cos(2 * ph), charge = sq && sq.order === S.ORD_CHARGE;
        let G, D;
        const rv = uhash(u.id, 17); // which way this man carries his weapon at the run
        if (w === 'katana') { const st2 = charge && runH > 0.35 ? 1 : [0, 2, 3, 4][Math.floor(rv * 4)];
          if (st2 === 0) { two = false; G = [-0.27, -0.3 + 0.04 * sw2, -0.02 - 0.24 * sw]; D = N3(-0.12, -0.38 - 0.25 * sw, -1); } // blade trailing low behind, sword arm swinging
          else if (st2 === 1) { two = false; G = [-0.25, 0.14 + 0.03 * sw2, 0.08]; D = N3(0.12, 0.78, -0.62); } // blade cocked back over the shoulder for the first cut
          else if (st2 === 2) { G = [-0.1, -0.32 + 0.04 * sw2, 0.3 + 0.04 * sw]; D = N3(0.3, 0.42, 0.85); } // both hands, blade slanted across the body
          else if (st2 === 3) { G = [-0.12, -0.04 + 0.03 * sw2, 0.26 + 0.03 * sw]; D = N3(0.12, 0.93, 0.25); } // both hands, blade held upright before the face
          else { two = false; G = [-0.24, -0.3 + 0.03 * sw2, 0.3 + 0.06 * sw]; D = N3(0.05, -0.22, 1); } // one hand, point thrust out ahead, low and eager
          if (u.def.shield) two = false; }
        else if (w === 'yari') { const st2 = charge ? 0 : Math.floor(runH * 4);
          if (st2 === 0) { G = [-0.2, -0.27 + 0.04 * sw2, 0.06 + 0.05 * sw]; D = N3(0.05, 0.03 + 0.04 * sw2, 1); } // point levelled for the charge
          else if (st2 === 1) { G = [-0.15, -0.1 + 0.04 * sw2, 0.18]; D = N3(0.35, 0.85, 0.22); } // sloped on the shoulder
          else if (st2 === 2) { two = false; G = [-0.25, -0.45 + 0.03 * sw2, 0.02 - 0.12 * sw]; D = N3(0.02, 0.2, 1); } // trailed in one hand at the balance, swinging with the stride
          else { G = [-0.18, -0.38 + 0.03 * sw2, 0.12 + 0.04 * sw]; D = N3(0.08, 0.5, 0.86); } } // low at the hip in both hands, point angled up
        else if (w === 'rifle' && !clubbing) { const st2 = Math.floor(runH * 5);
          if (st2 === 0) { G = [-0.14, -0.17 + 0.04 * sw2, 0.24 + 0.05 * sw]; D = N3(0.62, 0.74, 0.16); } // port arms across the chest
          else if (st2 === 1) { two = false; G = [-0.25, -0.5 + 0.03 * sw2, 0.04 - 0.18 * sw]; D = N3(0.04, 0.12 + 0.1 * sw, 1); } // trail arms, swinging at the side
          else if (st2 === 2) { two = false; G = [-0.21, 0.03 + 0.03 * sw2, 0.04]; D = N3(0.16, 0.95, -0.24); } // shouldered
          else if (st2 === 3) { G = [-0.16, -0.3 + 0.04 * sw2, 0.2 + 0.04 * sw]; D = N3(0.1, 0.3, 0.95); } // both hands at the hip, muzzle forward, ready to drop and fire
          else { G = [-0.1, -0.06 + 0.03 * sw2, 0.25]; D = N3(0.2, 0.97, 0.1); } } // high port: held upright before the chest
        else { G = KW.carry.g.slice(); D = KW.carry.d.slice(); }
        const kr = clamp((r - 0.05) / 0.5, 0, 1);
        for (let j = 0; j < 3; j++) { tg.wp[j] = lerp(lerp(KW.guard.g[j], KW.carry.g[j], r), G[j], kr); tg.wd[j] = lerp(lerp(KW.guard.d[j], KW.carry.d[j], r), D[j], kr); } nrm3(tg.wd);
        rateW = 20; }
      else { lerp3(tg.wp, KW.guard.g, KW.carry.g, r); nrm3(lerp3(tg.wd, KW.guard.d, KW.carry.d, r)); tg.wp[1] += Math.abs(Math.sin(ph)) * 0.02 * mv; }
      if (anchor === 'R') { set3(tg.rh, tg.wp); for (let j = 0; j < 3; j++) tg.lh[j] = tg.wp[j] + tg.wd[j] * KW.off2; }
    } else { fkR = true; fkL = true; }
    if (u.flinchT > 0 && !(u.hrA < 1)) { lean -= 0.3 * (u.flinchT / 0.35); }
    if (a.hiOn) { // hit impulse (hitImpulse): critically damped springs on a shove offset and a bend away from the blow
      const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n; for (let i = 0; i < n; i++) { a.kbVx -= (a.kbX * 90 + a.kbVx * 19) * h; a.kbVz -= (a.kbZ * 90 + a.kbVz * 19) * h; a.kbX += a.kbVx * h; a.kbZ += a.kbVz * h; a.hbV -= (a.hb * 110 + a.hbV * 21) * h; a.hb += a.hbV * h; a.hsV -= (a.hs * 110 + a.hsV * 21) * h; a.hs += a.hsV * h; }
      x += a.kbX; z += a.kbZ; lean += a.hb; twist += a.hs * 0.7; roll += a.hs * 0.45; crouch += Math.min(0.25, Math.abs(a.hb) * 0.35); // the knees give a little under the blow
      if (Math.abs(a.kbX) + Math.abs(a.kbZ) + Math.abs(a.hb) + Math.abs(a.hs) + Math.abs(a.kbVx) + Math.abs(a.hbV) < 0.002) a.hiOn = false; }
    if (u.champ) { // acrobatics: low dodges, a tucked leap, a coiled spin, a long lunge
      if (u.dodgeT > 0) { const k = Math.sin(clamp(u.dodgeT / 0.34, 0, 1) * PI); lean += (u.dodgeFwd ? 0.45 : -0.2) * k; crouch += 0.22 * k; twist += 0.25 * k * (u.dodgeX * Math.cos(yaw) - u.dodgeZ * Math.sin(yaw) > 0 ? -1 : 1) * (u.dodgeFwd ? 0 : 1); rateB = 24; }
      if (u.airborne) { crouch += u.plunge ? 0.05 : 0.18; lean += u.plunge ? 0.35 : 0.08; rateB = 18; }
      if (u.spinT > 0) { crouch += 0.12; lean += 0.12; }
      if (u.guardT > 0) { crouch += 0.08; stance = Math.max(stance, 0.7); }
    }
    if (mounted) { lean += 0.06 + 0.22 * clamp(((u.mounted ? u.speedNow : this.sim.units[u.mount].speedNow) - 4) / 5, 0, 1); stance = 0; twist += clamp(wrapA(yaw - ryaw), -1.1, 1.1); }
    if (u.camp && u.campPose === 'squat') { crouch = 0.5; lean = 0.3; stance = 0.35; twist = 0.05 * Math.sin(this.time * 0.4 + u.id); rateB = 6; } // hunkered down by the fire
    else if (u.camp) { lean = 0.04 + 0.03 * Math.sin(this.time * 0.6 + u.id); twist = 0.12 * Math.sin(this.time * 0.25 + u.id * 1.7); }
    // camp life (campPoseT): relaxed hands and weapon, sitting, lying, small activities, a prop in the hand
    if (u.camp && !u.dead && u.cAct !== undefined) { const P = this.campPoseT(u, a, w); a.cProp = P.prop; a.cPropH = P.ph;
      lean = P.lean; twist = P.twist; crouch = P.crouch; stance = P.stance; roll = P.roll; rateB = 5;
      if (P.anchor !== 'skip') { anchor = P.anchor; fkL = P.fkL; fkR = P.fkR; two = P.two; rateW = 6; } }
    if (u.camp) { // a man who looks up at you turns his head first (the body only turns if he gets up to talk)
      let want = 0; const lp = this.sim.players[this.localIdx], hh = lp ? this.sim.units[lp.heroId] : null;
      if (u.cLook && u.cAct !== 7 && hh && !hh.dead) want = clamp(wrapA(Math.atan2(hh.x - x, hh.z - z) - yaw), -1.05, 1.05);
      a.hYw = (a.hYw || 0) + (want - (a.hYw || 0)) * (1 - Math.exp(-4 * dt)); } else a.hYw = 0;
    if (u.wounded && !u.dead) { if (u.helpedBy >= 0) { lean = 0.28; crouch = Math.max(crouch, 0.16); roll = 0.12 * Math.sin(ph); } else { crouch = 0.62; lean = 0.62; roll = 0.1; stance = 0.4; } rateB = 8; } // doubled over / limping on a friend's shoulder
    // ---------- smoothing ----------
    a.recoil = Math.max(0, a.recoil - dt * 3.2);
    if (!a.init) { set3(a.wp, tg.wp); set3(a.wd, tg.wd); set3(a.rh, tg.rh); set3(a.lh, tg.lh); a.lean = lean; a.twist = twist; a.init = true; }
    const kw = 1 - Math.exp(-rateW * dt), kb = 1 - Math.exp(-rateB * dt), ks = 1 - Math.exp(-6 * dt);
    for (let j = 0; j < 3; j++) { a.wp[j] += (tg.wp[j] - a.wp[j]) * kw; a.wd[j] += (tg.wd[j] - a.wd[j]) * kw; a.rh[j] += (tg.rh[j] - a.rh[j]) * kw; a.lh[j] += (tg.lh[j] - a.lh[j]) * kw; }
    nrm3(a.wd);
    if (a.hro) { const o = a.hro; a.lean -= o[0]; a.twist -= o[1]; a.roll -= o[2]; a.crouch -= o[3]; a.stance -= o[4]; a.lunge -= o[5]; for (let j = 0; j < 3; j++) { a.wp[j] -= o[6 + j]; a.rh[j] -= o[6 + j]; a.lh[j] -= o[6 + j]; } a.hro = null; }
    a.lean += (lean - a.lean) * kb; a.twist += (twist - a.twist) * kb; a.roll += (roll - a.roll) * kb; a.lunge += (lunge - a.lunge) * kb; a.crouch += (crouch - a.crouch) * kb; a.stance += (stance - a.stance) * ks;
    a.hrh = 0; { // hit reaction: added on top of the smoothed pose (and taken off again next frame) so it snaps in and out crisply
      const e = mounted || down ? 0 : hrEnv(u, alpha), fl = u.hrF > 0 ? Math.sin(clamp(u.hrF / 0.16, 0, 1) * PI) * 0.35 : 0;
      if (e > 0.001 || fl > 0.001) { const P0 = HR_POSE[u.hrK || 0], s = u.hrS || 1, F0 = HR_POSE[0], fs = u.hrFS || 1;
        const v = (i) => (e > 0.001 ? P0[i] * e : 0) + F0[i] * fl;
        const o = a.hro = a.hroB || (a.hroB = new Float64Array(9));
        o[0] = v(0); o[1] = (e > 0.001 ? P0[1] * e * s : 0) + 0.25 * fl * fs; o[2] = (e > 0.001 ? P0[2] * e * s : 0); o[3] = v(3); o[4] = Math.min(v(4), Math.max(0, 1 - a.stance)); o[5] = v(5);
        o[6] = (e > 0.001 && u.hrK === 1 ? -0.1 * s * e : 0); o[7] = v(7); o[8] = v(8);
        a.lean += o[0]; a.twist += o[1]; a.roll += o[2]; a.crouch += o[3]; a.stance += o[4]; a.lunge += o[5]; for (let j = 0; j < 3; j++) { a.wp[j] += o[6 + j]; a.rh[j] += o[6 + j]; a.lh[j] += o[6 + j]; }
        a.hrh = v(6); }
      // caught in a wolf-brush: thrown back, arms up, twisting against the branches
      if (!a.hro && !mounted && !down && u.entT > 0) { const e2 = Math.min(1, u.entT / 0.2), P3 = HR_POSE[3], w = Math.sin((this.time || 0) * 13 + u.id) * 0.22;
        const o = a.hro = a.hroB || (a.hroB = new Float64Array(9)); o[0] = P3[0] * 0.8 * e2; o[1] = (P3[1] + w) * e2; o[2] = (P3[2] + w * 0.5) * e2; o[3] = 0; o[4] = 0; o[5] = P3[5] * e2; o[6] = 0; o[7] = P3[7] * 0.9 * e2; o[8] = P3[8] * e2;
        a.lean += o[0]; a.twist += o[1]; a.roll += o[2]; a.lunge += o[5]; for (let j = 0; j < 3; j++) { a.wp[j] += o[6 + j]; a.rh[j] += o[6 + j]; a.lh[j] += o[6 + j]; } a.hrh = -0.3 * e2; } }
    // ---------- legs (root-local; +x left, +z forward) ----------
    const LT = 0.46, LS = 0.46;
    const legs = this._legs || (this._legs = new Float64Array(18)); // hipL,kneeL,footL,hipR,kneeR,footR
    let pel, wdp = null, woy = 0, lie = null; a.hK = 0.5;
    const legPlane = (o, side, th, kn, bb) => {
      const fx = Math.sin(bb), fz = Math.cos(bb);
      const f1 = LT * Math.sin(th), v1 = LT * Math.cos(th), f2 = f1 + LS * Math.sin(th - kn), v2 = v1 + LS * Math.cos(th - kn);
      legs[o] = side * 0.1; legs[o + 1] = 0; legs[o + 2] = 0;
      legs[o + 3] = side * 0.11 + fx * f1; legs[o + 4] = -v1; legs[o + 5] = fz * f1;
      legs[o + 6] = side * 0.11 + fx * f2; legs[o + 7] = -v2; legs[o + 8] = fz * f2;
      return v2;
    };
    if (mounted) {
      const sx = [1, -1];
      for (let i = 0; i < 2; i++) { const o = i * 9, s = sx[i]; legs[o] = s * 0.1; legs[o + 1] = 0; legs[o + 2] = 0; legs[o + 3] = s * 0.34; legs[o + 4] = -0.3; legs[o + 5] = 0.28; legs[o + 6] = s * 0.32; legs[o + 7] = -0.78; legs[o + 8] = 0.1; }
      pel = 1.47 + (u.mount >= 0 ? this.anim(u.mount).hbob : a.hbob);
    } else if (down && a.dw > 0 && (wnd || !(u.downT > 0))) { // the fall of a wounded man: stagger, knees buckle, one knee, down on his back, up on an elbow
      // keys: [thigh A, knee A, thigh B, knee B, pelvis height, torso lean, lift, roll, leg-plane A, leg-plane B]; A is the
      // knee-up / kneeling leg. The body is jointed, not tipped over: the pelvis comes down to the ground and the chest
      // bends back (or forward) from it, so the legs, the trunk and the head each find the ground on their own.
      const sv = a.dV || 1, sA = sv > 0 ? 1 : -1, tt = (this.time || 0) + u.id * 1.37;
      a.cw = (a.cw || 0) + ((u.crawling ? 1 : 0) - (a.cw || 0)) * (1 - Math.exp(-2.5 * dt));
      const KG = this._lieKG || (this._lieKG = new Float64Array(10)), KC = this._lieKC || (this._lieKC = new Float64Array(10)), KD = this._lieKD || (this._lieKD = new Float64Array(10));
      { const br = 0.025 * Math.sin(tt * 1.9), sh = 0.04 * Math.sin(tt * 0.37); // on his back, up on an elbow, one knee up; breathing hard, shifting
        KG[0] = 2.05 + sh; KG[1] = 1.42 + sh; KG[2] = 1.42; KG[3] = 0.28 + 0.08 * Math.sin(tt * 0.23); KG[4] = 0.17; KG[5] = -1.02 + br; KG[6] = 0; KG[7] = -0.2 * sA; KG[8] = -0.1 * sA; KG[9] = 0.12 * sA; }
      { a.crPh = (a.crPh || 0) + dt * (a.spd > 0.12 ? 3.4 : 0.5); const c = a.crPh, s1 = Math.sin(c); // face down: the arms pull in turn, one leg drawn up to push, the other dragging
        const pA = Math.max(0, s1), pB = Math.max(0, -s1); // A draws its knee up and out to push while B drags, then they change over
        KC[0] = -1.42 + 0.6 * pA; KC[1] = 0.25 + 1.15 * pA; KC[2] = -1.42 + 0.6 * pB; KC[3] = 0.25 + 1.15 * pB; KC[4] = 0.2; KC[5] = 1.2 + 0.05 * Math.sin(c * 2); KC[6] = 0; KC[7] = 0.14 * s1; KC[8] = -sA * (0.15 + 0.6 * pA); KC[9] = sA * (0.15 + 0.6 * pB); }
      for (let j = 0; j < 10; j++) KD[j] = KG[j] + (KC[j] - KG[j]) * a.cw;
      const KS = [0.05, 0.1, -0.05, 0.1, 0.91, 0, 0, 0, 0, 0], KT = [0.35, 0.5, -0.25, 0.25, 0.84, 0.32, 0, 0.12 * sA, 0, 0], KN = [1.1, 1.5, 0.1, 1.6, 0.5, 0.25, 0, 0.1 * sA, 0, 0];
      const KB = [1.3, 0.55, 1.45, 0.3, 0.2, -1.25, 0.05, -0.12 * sA, 0, 0]; // sat down hard and going over backwards
      { const rv = u.downed ? (u.reviveBy >= 0 ? clamp((u.reviveT || 0) / 45, 0, 1) : 0) : (a.rvK || 0); a.rvK = rv; if (rv > 0) for (let j = 0; j < 10; j++) KD[j] += (KN[j] - KD[j]) * rv * 0.75; } // a comrade pulling him up: up onto a knee as the bar fills
      const KEYS = a.dUp ? [[0, KS], [0.45, KN], [1, KD]] : [[0, KS], [0.22, KT], [0.5, KN], [0.78, KB], [1, KD]];
      const w = a.dw, Q = this._dwq || (this._dwq = new Float64Array(10)); let i = 0; while (i < KEYS.length - 2 && w > KEYS[i + 1][0]) i++;
      const k0 = KEYS[i], k1 = KEYS[i + 1]; let s = clamp((w - k0[0]) / Math.max(1e-4, k1[0] - k0[0]), 0, 1); s = s * s * (3 - 2 * s);
      for (let j = 0; j < 10; j++) Q[j] = k0[1][j] + (k1[1][j] - k0[1][j]) * s;
      const oA = sv > 0 ? 0 : 9, oB = sv > 0 ? 9 : 0; legPlane(oA, oA ? -1 : 1, Q[0], Q[1], Q[8]); legPlane(oB, oB ? -1 : 1, Q[2], Q[3], Q[9]);
      pel = Q[4]; woy = Q[6]; a.lean = Q[5]; a.roll = Q[7]; a.twist *= 0.5; a.lunge = 0;
      const lk = clamp((0.62 - pel) / 0.42, 0, 1); a.hK = lerp(0.5, a.cw > 0.5 ? 0.85 : 0.55, lk);
      // lying on a slope: tilt with the ground between his head and his feet so neither end sinks into it
      { const hb = terrainH(x - sy * 0.9, z - cy * 0.9), hf = terrainH(x + sy * 0.6, z + cy * 0.6); wdp = clamp(Math.atan2(hb - hf, 1.5), -0.4, 0.4) * lk; }
      lie = { k: lk, kind: a.cw > 0.5 ? 'crawl' : 'back', sA, c: a.crPh || 0, call: u.downed && u.reviveBy < 0, tt };
    } else if (down) {
      legPlane(0, 1, 0.12, 0.2, 0); legPlane(9, -1, -0.05, 0.3, 0); pel = 0.92;
    } else if (u.camp && a.cl > 0.02) { // asleep: down on his back, a knee drawn up (or both legs out), an arm under his head
      const k = a.cl, ss = a.cSl === undefined ? (a.cSl = uhash(u.id, 41) < 0.5 ? 1 : -1) : a.cSl, kv = uhash(u.id, 43) < 0.55, tt = (this.time || 0) + u.id;
      const k2 = clamp((k - 0.15) / 0.85, 0, 1), sk = k2 * k2 * (3 - 2 * k2);
      // the knee on the side he's turned toward is drawn up and falls a little across; the other leg lies out, slightly bent
      const kU = kv ? 1.95 : 1.7, nU = kv ? 1.25 : 0.85; legPlane(0, 1, lerp(0.06, ss > 0 ? kU : 1.45, k), lerp(0.12, ss > 0 ? nU : 0.3, k), lerp(0, ss > 0 ? -0.35 : 0.05, k)); legPlane(9, -1, lerp(0.02, ss < 0 ? kU : 1.45, k), lerp(0.2, ss < 0 ? nU : 0.3, k), lerp(0, ss < 0 ? 0.35 : -0.05, k));
      pel = lerp(0.92, 0.15, k); a.lean = lerp(a.lean, -1.45 + 0.02 * Math.sin(tt * 1.25), sk); a.roll = lerp(a.roll, 0.32 * ss, sk); a.twist = lerp(a.twist, 0.12 * ss, sk); a.hK = lerp(0.5, 0.12, sk);
      lie = { k: sk, kind: 'sleep', sA: ss, c: 0, call: false, tt };
      // lying on a slope: tilt with the ground between his feet and his head so neither end sinks into it
      { const hb = terrainH(x - sy * 0.95, z - cy * 0.95), hf = terrainH(x + sy * 0.6, z + cy * 0.6); a.cTilt = clamp(Math.atan2(hb - hf, 1.55), -0.4, 0.4); }
    } else if (u.camp && a.cs > 0.02) { // seated on the ground (knees up, or legs out) or on a log, rising when someone comes to talk
      const k = a.cs, g0 = terrainH(x, z); let v = a.cSv;
      if (v === 1 && terrainH(x + sy * 0.85, z + cy * 0.85) - g0 > 0.03) v = 0; // ground rising in front: knees up rather than legs pushed into it
      const Sv = v === 2 ? [1.6, 1.25, 1.6, 1.25, 0.42] : v === 1 ? [1.5, 0.15, 1.45, 0.25, 0.17] : [2.1, 1.75, 1.95, 1.6, 0.22];
      const eL = legPlane(0, 1, lerp(0.05, Sv[0], k), lerp(0.1, Sv[1], k), 0.14 * k), eR = legPlane(9, -1, lerp(0.05, Sv[2], k), lerp(0.1, Sv[3], k), -0.14 * k); const p0 = lerp(Math.max(eL, eR), Sv[4], k);
      // feet and knees rest ON the ground under them: lift the seat as much as the highest one needs (a simple foot IK)
      let lift = 0; for (const o of [3, 6, 12, 15]) { const fx = x + legs[o] * cy + legs[o + 2] * sy, fz = z - legs[o] * sy + legs[o + 2] * cy; const need = terrainH(fx, fz) - g0 + (o === 6 || o === 15 ? 0.06 : 0.08) - (p0 + legs[o + 1]); if (need > lift) lift = need; }
      pel = p0 + Math.min(lift, 0.35);
    } else if (u.airborne) {
      legPlane(0, 1, 0.55, 1.1, 0); legPlane(9, -1, 0.3, 1.2, 0); pel = 0.95;
    } else if (u.st === ST_KICK) {
      const t = clamp(stT / KICK_T, 0, 1); const th = 1.45 * Math.sin(Math.min(1, t * 1.6) * PI * 0.5) * (t < 0.75 ? 1 : (1 - t) * 4); const kn = t < 0.3 ? 1.5 : lerp(1.5, 0.1, clamp((t - 0.3) / 0.18, 0, 1));
      const eL = legPlane(0, 1, -0.1, 0.18, 0); legPlane(9, -1, th, kn, 0); pel = eL;
    } else {
      const A = (0.38 * (1 - r) + 0.72 * r) * mv, Ks = 0.55 * (1 - r) + 1.5 * r, k0 = 0.06 + 0.12 * r, bias = 0.1 * r;
      const s = a.stance, lg = a.lunge;
      const legAng = (p, side) => {
        let th = A * Math.sin(p) + bias, kn = k0 * mv + Ks * Math.pow(Math.max(0, Math.cos(p)), 1.2) * mv;
        const sth = side > 0 ? (melee ? 0.3 : 0.12) + lg * 0.9 : (melee ? -0.28 : -0.1) - lg * 0.3, skn = (melee ? 0.24 : 0.06) + a.crouch * 2.2 + (side > 0 ? lg * 0.5 : 0);
        return [lerp(th, sth, s), lerp(kn, skn, s)];
      };
      const L = legAng(ph, 1), R = legAng(ph + PI, -1);
      const bb = beta * (1 - s);
      const eL = legPlane(0, 1, L[0], L[1], bb), eR = legPlane(9, -1, R[0], R[1], bb);
      pel = Math.max(eL, eR) + r * 0.03 * Math.max(0, Math.cos(2 * ph));
      // near men put their feet down and keep them there (anim.js feet): the legs reach for planted spots, the hips ride on them
      if (typeof ANIM !== 'undefined' && ANIM.feet && !this.studio) { const vs0 = u.look && u.look.h ? u.look.h : (u.type === 'byakkotai' ? 0.9 : 1) * (u.champ ? S.HCLASS[u.hclass | 0].scale : u.type === 'hero' ? 1.04 : 0.88 + uhash(u.id, 7) * 0.24);
        pel = ANIM.feet(this, u, a, legs, pel, a.lunge * 0.9, x, y, z, cy, sy, vs0, dt); a.fpF = this.time; }
    }
    if (a.fpW && a.fpF !== this.time) { a.fpW = 0; if (a.fp) a.fp.ok = false; } // sitting, riding, down: their own legs
    // ---------- chest frame ----------
    const pz = a.lunge * 0.9 * (mounted ? 0 : 1);
    const cr = Math.cos(a.roll), sr = Math.sin(a.roll), cl = Math.cos(a.lean), sl = Math.sin(a.lean), ct = Math.cos(a.twist), st = Math.sin(a.twist);
    const C = this._C || (this._C = new Float64Array(9)); // chest axes in root-local: X, Y, Z
    const rc = (vx, vy, vz, out, o) => { const x1 = vx * cr - vy * sr, y1 = vx * sr + vy * cr; const y2 = y1 * cl - vz * sl, z2 = y1 * sl + vz * cl; out[o] = x1 * ct + z2 * st; out[o + 1] = y2; out[o + 2] = -x1 * st + z2 * ct; };
    rc(1, 0, 0, C, 0); rc(0, 1, 0, C, 3); rc(0, 0, 1, C, 6);
    // chest-local (relative to the shoulder centre) → root-local
    const SH = 0.47;
    const toRoot = (v, out, o) => { out[o] = C[0] * v[0] + C[3] * (v[1] + SH) + C[6] * v[2]; out[o + 1] = pel + C[1] * v[0] + C[4] * (v[1] + SH) + C[7] * v[2]; out[o + 2] = pz + C[2] * v[0] + C[5] * (v[1] + SH) + C[8] * v[2]; };
    const dirRoot = (v, out, o) => { out[o] = C[0] * v[0] + C[3] * v[1] + C[6] * v[2]; out[o + 1] = C[1] * v[0] + C[4] * v[1] + C[7] * v[2]; out[o + 2] = C[2] * v[0] + C[5] * v[1] + C[8] * v[2]; };
    const J = this._J || (this._J = new Float64Array(60));
    // J layout: 0 shoulderL, 3 elbowL, 6 handL, 9 shoulderR, 12 elbowR, 15 handR, 18 weapon grip, 21 weapon dir, 24 chest centre, 27 head
    toRoot([0.2, 0, 0], J, 0); toRoot([-0.2, 0, 0], J, 9);
    toRoot([0, -0.22, 0], J, 24); toRoot([0, 0.25, 0.01], J, 27);
    const ik = (so, ho, tx, ty, tz, side) => {
      const sx = J[so], sy2 = J[so + 1], sz = J[so + 2]; let dx = (tx - sx) * ARM_REACH, dy = (ty - sy2) * ARM_REACH, dz = (tz - sz) * ARM_REACH; let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4; dx /= d; dy /= d; dz /= d;
      const A1 = ARM_U, A2 = ARM_F; d = clamp(d, 0.08, A1 + A2 - 0.002);
      const ca = (A1 * A1 + d * d - A2 * A2) / (2 * A1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
      let px = C[0] * side * 0.7 - C[3] * 1 - C[6] * 0.35, py = C[1] * side * 0.7 - C[4] - C[7] * 0.35, pz2 = C[2] * side * 0.7 - C[5] - C[8] * 0.35;
      const dp = px * dx + py * dy + pz2 * dz; px -= dx * dp; py -= dy * dp; pz2 -= dz * dp; const pl = Math.sqrt(px * px + py * py + pz2 * pz2) || 1; px /= pl; py /= pl; pz2 /= pl;
      J[ho - 3] = sx + A1 * (dx * ca + px * sa); J[ho - 2] = sy2 + A1 * (dy * ca + py * sa); J[ho - 1] = sz + A1 * (dz * ca + pz2 * sa);
      J[ho] = sx + dx * d; J[ho + 1] = sy2 + dy * d; J[ho + 2] = sz + dz * d;
    };
    const fk = (so, ho, side, alpha2, bend) => {
      const ux = side * 0.12, uy = -Math.cos(alpha2), uz = Math.sin(alpha2), fx = side * 0.05, fy = -Math.cos(alpha2 + bend), fz = Math.sin(alpha2 + bend);
      const tmp = this._tmp3 || (this._tmp3 = new Float64Array(3));
      dirRoot([ux, uy, uz], tmp, 0); const l1 = Math.hypot(tmp[0], tmp[1], tmp[2]);
      J[ho - 3] = J[so] + tmp[0] / l1 * ARM_U; J[ho - 2] = J[so + 1] + tmp[1] / l1 * ARM_U; J[ho - 1] = J[so + 2] + tmp[2] / l1 * ARM_U;
      dirRoot([fx, fy, fz], tmp, 0); const l2 = Math.hypot(tmp[0], tmp[1], tmp[2]);
      J[ho] = J[ho - 3] + tmp[0] / l2 * ARM_F; J[ho + 1] = J[ho - 2] + tmp[1] / l2 * ARM_F; J[ho + 2] = J[ho - 1] + tmp[2] / l2 * ARM_F;
    };
    const armA = (0.22 * (1 - r) + 0.7 * r) * mv, armBend = 0.25 + 1.15 * r + (routing ? 0.3 : 0);
    const tmpA = this._tmpA || (this._tmpA = new Float64Array(6));
    dirRoot(a.wd, J, 21);
    if (fkR) fk(9, 15, -1, routing ? armA * Math.sin(ph) + 0.1 : armA * Math.sin(ph), armBend);
    else { toRoot(anchor === 'R' ? a.wp : a.rh, tmpA, 0); ik(9, 15, tmpA[0], tmpA[1], tmpA[2], -1); }
    if (anchor === 'R') { J[18] = J[15]; J[19] = J[16]; J[20] = J[17]; }
    else if (anchor === 'W') toRoot(a.wp, J, 18);
    if (fkL || (!two && anchor === 'R')) fk(0, 6, 1, -armA * Math.sin(ph), armBend);
    else if (anchor === 'L') { toRoot(a.lh, tmpA, 0); ik(0, 6, tmpA[0], tmpA[1], tmpA[2], 1); J[18] = J[6]; J[19] = J[7]; J[20] = J[8]; }
    else if (anchor === 'R' && KW) { ik(0, 6, J[18] + J[21] * KW.off2, J[19] + J[22] * KW.off2, J[20] + J[23] * KW.off2, 1); }
    else { toRoot(a.lh, tmpA, 0); ik(0, 6, tmpA[0], tmpA[1], tmpA[2], 1); }
    if (fkR && w !== 'bow' && w !== '') { J[18] = J[15]; J[19] = J[16]; J[20] = J[17]; const fx = J[15] - J[12], fy = J[16] - J[13], fz = J[17] - J[14]; const l = Math.hypot(fx, fy, fz) || 1; const cdir = routing ? [fx / l * 0.3 - C[6], fy / l * 0.3 - C[7] - 0.4, fz / l * 0.3 - C[8]] : [C[6], C[7] + 0.3, C[8]]; const cl2 = Math.hypot(cdir[0], cdir[1], cdir[2]) || 1; J[21] = cdir[0] / cl2; J[22] = cdir[1] / cl2; J[23] = cdir[2] / cl2; }
    if (lie && lie.k > 0.01) this.lieArms(lie, J, C, pel, toRoot, ik);
    // ---------- to world ----------
    const dp = wdp !== null ? wdp : down ? (u.downed && u.crawling ? 1.22 + Math.sin((this.time || 0) * 5 + u.id) * 0.07 : u.downed ? -(0.55 + 0.45 * uhash(u.id, 21)) * (u.reviveBy >= 0 ? 1 - clamp((u.reviveT || 0) / 45, 0, 1) * 0.8 : 1) : -1.45 * (0.5 + 0.5 * Math.min(1, clamp(u.downT, 0, 1) * 4))) : (u.camp && a.cl ? (a.cTilt || 0) * a.cl : 0), cP = Math.cos(dp), sP = Math.sin(dp); // a downed man is propped on an elbow or half-sitting, and rises as he is hauled up
    const oy0 = wdp !== null ? woy : down ? 0.15 : 0;
    // the spring rig (anim.js): every joint travels to its new place instead of popping there
    const AS = typeof ANIM !== 'undefined' && ANIM.on && !this.studio ? ANIM.rig(this, u, a, legs, J, C, pel, pz, dp, oy0, dt, x, z) : null;
    const oy = AS ? AS[3] : oy0, cPs = AS ? Math.cos(AS[2]) : cP, sPs = AS ? Math.sin(AS[2]) : sP, pelS = AS ? AS[0] : pel, pzS = AS ? AS[1] : pz;
    const vsc = u.look && u.look.h ? u.look.h : (u.type === 'byakkotai' ? 0.9 : 1) * (u.champ ? S.HCLASS[u.hclass | 0].scale : u.type === 'hero' ? 1.04 : 0.88 + uhash(u.id, 7) * 0.24); // men come in all sizes: about 12% either way
    const Wp = (lx, ly, lz, out, o) => { lx *= vsc; ly *= vsc; lz *= vsc; const y2 = ly * cPs - lz * sPs, z2 = ly * sPs + lz * cPs; out[o] = x + lx * cy + z2 * sy; out[o + 1] = y + oy + y2; out[o + 2] = z - lx * sy + z2 * cy; };
    const Wd = (lx, ly, lz, out, o) => { const y2 = ly * cPs - lz * sPs, z2 = ly * sPs + lz * cPs; out[o] = lx * cy + z2 * sy; out[o + 1] = y2; out[o + 2] = -lx * sy + z2 * cy; };
    const G = this._G || (this._G = new Float64Array(96));
    for (let i = 0; i < 18; i += 3) Wp(legs[i], legs[i + 1] + pelS, legs[i + 2] + pzS, G, i);
    for (let i = 0; i < 30; i += 3) { if (i === 21) Wd(J[21], J[22], J[23], G, 18 + i); else Wp(J[i], J[i + 1], J[i + 2], G, 18 + i); }
    const CB = this._CB || (this._CB = new Float64Array(9)); Wd(C[0], C[1], C[2], CB, 0); Wd(C[3], C[4], C[5], CB, 3); Wd(C[6], C[7], C[8], CB, 6);
    Wp(0, pelS - 0.02, pzS, G, 60);
    if (u.camp) this.campPropDraw(u, a, G);
    this._sx = CB[0]; this._sy = CB[1]; this._sz = CB[2];
    if (vsc !== 1) for (let i = 0; i < 9; i++) CB[i] *= vsc;
    // ---------- draw body ----------
    this.boxB(f.torso, slot, G[18 + 24], G[18 + 25], G[18 + 26], CB, 0.5, 0.64, 0.3);
    this.boxB(f.hips, slot, G[60], G[61], G[62], CB, 0.4, 0.22, 0.27);
    // head stays nearer upright than the chest
    const HB = this._HB || (this._HB = new Float64Array(9)); { const hl = -a.lean * a.hK + (a.hrh || 0), ht = -a.twist * 0.35 + (a.hYw || 0); const ch = Math.cos(hl), sh = Math.sin(hl), cth = Math.cos(ht), sth = Math.sin(ht); const ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; for (let i = 0; i < 3; i++) { const v = ax[i]; const y1 = v[1] * ch - v[2] * sh, z1 = v[1] * sh + v[2] * ch; const x2 = v[0] * cth + z1 * sth, z2 = -v[0] * sth + z1 * cth; const vx = CB[0] * x2 + CB[3] * y1 + CB[6] * z2, vy = CB[1] * x2 + CB[4] * y1 + CB[7] * z2, vz = CB[2] * x2 + CB[5] * y1 + CB[8] * z2; HB[i * 3] = vx; HB[i * 3 + 1] = vy; HB[i * 3 + 2] = vz; } }
    if (vsc !== 1) for (let i = 0; i < 9; i++) HB[i] *= vsc;
    const hx = G[18 + 27], hy = G[18 + 28], hz = G[18 + 29];
    this.boxB(f.head, slot, hx, hy, hz, HB, 0.28, 0.3, 0.28);
    const hat = def.hat; const hatAt = (mesh, on, off, s1, s2, s3) => { if (!on) { mesh.setMatrixAt(slot, this.tmp.zero); return; } this.boxB(mesh, slot, hx + HB[3] * off, hy + HB[4] * off, hz + HB[5] * off, HB, s1, s2, s3); };
    hatAt(f.jingasa, false); hatAt(f.kabuto, false); hatAt(f.cap, false); hatAt(f.kepi, false); hatAt(f.band, false);
    this.drawGear(slot, u, { c: [G[42], G[43], G[44], CB], h: [hx, hy, hz, HB], p: [G[60], G[61], G[62], CB], sl: [G[18], G[19], G[20], CB], sr: [G[27], G[28], G[29], CB] }, G, CB);
    // legs & feet
    this.seg(f.thighL, slot, G[0], G[1], G[2], G[3], G[4], G[5], 0.2, 0.21); this.seg(f.shinL, slot, G[3], G[4], G[5], G[6], G[7], G[8], 0.16, 0.17);
    this.seg(f.thighR, slot, G[9], G[10], G[11], G[12], G[13], G[14], 0.2, 0.21); this.seg(f.shinR, slot, G[12], G[13], G[14], G[15], G[16], G[17], 0.16, 0.17);
    { const fb = mounted ? 0 : beta * (1 - a.stance); const fdx = Math.sin(ryaw + fb), fdz = Math.cos(ryaw + fb); for (let i = 0; i < 2; i++) { const o = i * 9 + 6; this.seg(f.foot, slot * 2 + i, G[o] - fdx * 0.06, G[o + 1] + 0.04, G[o + 2] - fdz * 0.06, G[o] + fdx * 0.18, G[o + 1] + 0.04, G[o + 2] + fdz * 0.18, 0.11, 0.08); } }
    // arms & hands
    const o = 18;
    this.seg(f.uarmL, slot, G[o], G[o + 1], G[o + 2], G[o + 3], G[o + 4], G[o + 5], 0.13, 0.13); this.seg(f.farmL, slot, G[o + 3], G[o + 4], G[o + 5], G[o + 6], G[o + 7], G[o + 8], 0.11, 0.11);
    this.seg(f.uarmR, slot, G[o + 9], G[o + 10], G[o + 11], G[o + 12], G[o + 13], G[o + 14], 0.13, 0.13); this.seg(f.farmR, slot, G[o + 12], G[o + 13], G[o + 14], G[o + 15], G[o + 16], G[o + 17], 0.11, 0.11);
    this.boxB(f.hand, slot * 2, G[o + 6], G[o + 7], G[o + 8], CB, 0.105, 0.1, 0.115); this.boxB(f.hand, slot * 2 + 1, G[o + 15], G[o + 16], G[o + 17], CB, 0.105, 0.1, 0.115);
    // ---------- weapon ----------
    const gx = G[o + 18], gy = G[o + 19], gz = G[o + 20], dx = G[o + 21], dy = G[o + 22], dz = G[o + 23];
    const Z = this.tmp.zero;
    const P = (s, i) => (i === 0 ? gx + dx * s : i === 1 ? gy + dy * s : gz + dz * s);
    const segW = (mesh, s0, s1, ww, dd, idx) => this.seg(mesh, idx === undefined ? slot : idx, P(s0, 0), P(s0, 1), P(s0, 2), P(s1, 0), P(s1, 1), P(s1, 2), ww, dd);
    const big = u.type === 'jigen' || (u.champ && u.hclass === 3) || u.def.big; const arm = u.def.arm, xb = w === 'bow' && u.def.bow && u.def.bow.xbow;
    if (w === 'katana' && arm === 'guandao') { segW(f.yari, -0.9, 1.45, 0.045, 0.045); segW(f.hilt, 1.4, 1.5, 0.08, 0.08); segW(f.blade, 1.45, 2.05, 0.03, 0.17); }
    else if (w === 'katana' && arm === 'mace') { segW(f.hilt, -0.2, 0.03, 0.045, 0.045); segW(f.blade, 0.03, 0.62, 0.07, 0.07); }
    else if (w === 'katana' && arm === 'jian') { segW(f.hilt, -0.2, 0.03, 0.035, 0.08); segW(f.blade, 0.03, 0.86, 0.018, 0.045); }
    else if (w === 'katana') { if (big) { segW(f.hilt, -0.55, 0.03, 0.045, 0.05); segW(f.blade, 0.03, 1.2, 0.03, 0.085); } else { segW(f.hilt, -0.2, 0.03, 0.04, 0.045); segW(f.blade, 0.03, 0.72, 0.026, 0.075); } }
    else if (w === 'yari') { if ((u.kitRole !== undefined ? u.kitRole : u.role) === 'spear') segW(f.hilt, 3.55, 3.7, 0.1, 0.1); else segW(f.hilt, 1.7, 1.86, 0.11, 0.11); } else f.hilt.setMatrixAt(slot, Z);
    if (w === 'yari') { if ((u.kitRole !== undefined ? u.kitRole : u.role) === 'spear') { segW(f.yari, -0.9, 3.7, 0.042, 0.042); segW(f.blade, 3.7, 4.0, 0.02, 0.06); } else { segW(f.yari, -0.8, 1.85, 0.045, 0.045); segW(f.blade, 1.85, 2.15, 0.02, 0.06); } } // the duck team's 長槍 is about 1丈5尺, near 5 m
    else if (w !== 'katana') f.blade.setMatrixAt(slot, Z);
    if (w !== 'yari' && !(w === 'katana' && arm === 'guandao')) f.yari.setMatrixAt(slot, Z);
    { // the mandarin duck's special arms: 狼筅 wolf-brush (a bamboo trunk left bristling with branches) and 镗钯 tangba (three-pronged fork)
      const role = (u.kitRole !== undefined ? u.kitRole : u.role), brush = w === 'yari' && role === 'brush', fork = w === 'yari' && role === 'trident'; let n = 0;
      if (brush || fork) { let ex = dy * 0 - dz * 1, ey = 0, ez = dx * 1 - dy * 0; let el = Math.hypot(ex, ey, ez); if (el < 1e-3) { ex = 1; ey = 0; ez = 0; el = 1; } ex /= el; ey /= el; ez /= el; const fx = dy * ez - dz * ey, fy = dz * ex - dx * ez, fz = dx * ey - dy * ex;
        if (brush) { segW(f.yari, -0.8, 3.3, 0.055, 0.05); f.blade.setMatrixAt(slot, Z); f.hilt.setMatrixAt(slot, Z);
          for (let k = 0; k < 9; k++) { const sk = 1.6 + k * 0.2, a = k * 2.4 + 0.5, L = 0.5 - k * 0.03; const bx = P(sk, 0), by = P(sk, 1), bz = P(sk, 2); const ox = (ex * Math.cos(a) + fx * Math.sin(a)) * L, oy = (ey * Math.cos(a) + fy * Math.sin(a)) * L, oz = (ez * Math.cos(a) + fz * Math.sin(a)) * L;
            this.seg(f.twig, slot * 9 + k, bx, by, bz, bx + ox + dx * 0.18, by + oy + dy * 0.18, bz + oz + dz * 0.18, 0.022, 0.022); } n = 9; }
        else { const cx = P(1.88, 0), cy = P(1.88, 1), cz = P(1.88, 2); this.seg(f.twig, slot * 9, cx - ex * 0.2, cy - ey * 0.2, cz - ez * 0.2, cx + ex * 0.2, cy + ey * 0.2, cz + ez * 0.2, 0.03, 0.03);
          for (const sd of [-1, 1]) { const bx = cx + ex * 0.19 * sd, by = cy + ey * 0.19 * sd, bz = cz + ez * 0.19 * sd; this.seg(f.twig, slot * 9 + (sd > 0 ? 1 : 2), bx, by, bz, bx + dx * 0.3, by + dy * 0.3, bz + dz * 0.3, 0.025, 0.025); } n = 3; } }
      for (let k = n; k < 9; k++) f.twig.setMatrixAt(slot * 9 + k, Z); }
    if (xb) { segW(f.rifle, -0.3, 0.75, 0.05, 0.07); f.barrel.setMatrixAt(slot, Z); }
    else if (w === 'rifle') { const cl = u.club || (u.ctrl < 0 && u.st >= 1 && u.st <= 3); // clubbing: held by the barrel, the stock swung forward
      if (u.type === 'rifle_spencer') { if (cl) { segW(f.rifle, -0.15, 1.0, 0.045, 0.045); segW(f.barrel, 1.0, 1.5, 0.1, 0.1); } /* the three-eyed gun as a club: hold the end of the pole, the iron barrels are the head */ else { segW(f.rifle, -0.7, 0.45, 0.045, 0.045); segW(f.barrel, 0.45, 0.95, 0.1, 0.1); } }
      else if (cl) { segW(f.rifle, 0.35, 1.45, 0.05, 0.075); segW(f.barrel, -0.1, 1.05, 0.026, 0.026); } else { segW(f.rifle, -0.3, 0.8, 0.05, 0.075); segW(f.barrel, 0.1, 1.25, 0.026, 0.026); } } else { f.rifle.setMatrixAt(slot, Z); f.barrel.setMatrixAt(slot, Z); }
    if (w === 'revolver') segW(f.pistol, -0.25, 0.3, 0.08, 0.08); else f.pistol.setMatrixAt(slot, Z);
    if (rod > 0) { const hx2 = G[o + 15], hy2 = G[o + 16], hz2 = G[o + 17]; const rl = rod === 1 ? 0.95 : rod; this.seg(f.rod, slot, hx2, hy2, hz2, hx2 - dx * rl, hy2 - dy * rl, hz2 - dz * rl, 0.012, 0.012); } else f.rod.setMatrixAt(slot, Z);
    if (sjFl > 0) { const hx2 = G[o + 15], hy2 = G[o + 16], hz2 = G[o + 17]; this.seg(f.flask, slot, hx2, hy2 + 0.02, hz2, hx2 - dz * 0.03, hy2 + 0.16, hz2 + dx * 0.03, 0.075, 0.055); } else f.flask.setMatrixAt(slot, Z);
    if (xb) { // crossbow: limbs across the front of the stock, string drawn back to the nut
      const ux2 = dz, uz2 = -dx, ul = Math.hypot(ux2, uz2) || 1; const px = ux2 / ul * 0.38, pz = uz2 / ul * 0.38; const cx = P(0.72, 0), cy = P(0.72, 1), cz = P(0.72, 2), bk = 0.08;
      this.seg(f.bow, slot * 2, cx, cy, cz, cx + px - dx * bk, cy - dy * bk, cz + pz - dz * bk, 0.035, 0.04); this.seg(f.bow, slot * 2 + 1, cx, cy, cz, cx - px - dx * bk, cy - dy * bk, cz - pz - dz * bk, 0.035, 0.04);
      const nx2 = P(0.45, 0), ny2 = P(0.45, 1), nz2 = P(0.45, 2);
      this.seg(f.bstring, slot * 2, cx + px - dx * bk, cy - dy * bk, cz + pz - dz * bk, nx2, ny2, nz2, 0.01, 0.01); this.seg(f.bstring, slot * 2 + 1, cx - px - dx * bk, cy - dy * bk, cz - pz - dz * bk, nx2, ny2, nz2, 0.01, 0.01); f.arrow.setMatrixAt(slot, Z);
    } else if (w === 'bow') {
      // limbs curve back toward the archer; string meets the drawing hand when drawn
      const kx = -CB[6], ky = -CB[7], kz = -CB[8]; const bend = 0.18 + 0.17 * bowDraw;
      const tx1 = gx + dx * 0.6 + kx * bend, ty1 = gy + dy * 0.6 + ky * bend, tz1 = gz + dz * 0.6 + kz * bend;
      const tx2 = gx - dx * 0.6 + kx * bend, ty2 = gy - dy * 0.6 + ky * bend, tz2 = gz - dz * 0.6 + kz * bend;
      this._sx = kx; this._sy = ky; this._sz = kz;
      this.seg(f.bow, slot * 2, gx, gy, gz, tx1, ty1, tz1, 0.035, 0.045); this.seg(f.bow, slot * 2 + 1, gx, gy, gz, tx2, ty2, tz2, 0.035, 0.045);
      const rhx = G[o + 15], rhy = G[o + 16], rhz = G[o + 17];
      let mx2 = (tx1 + tx2) / 2, my2 = (ty1 + ty2) / 2, mz2 = (tz1 + tz2) / 2;
      if (bowDraw > 0.02 || (arrowVis === 2 && Math.hypot(rhx - gx, rhy - gy, rhz - gz) < 0.35)) { mx2 = rhx; my2 = rhy; mz2 = rhz; }
      this.seg(f.bstring, slot * 2, tx1, ty1, tz1, mx2, my2, mz2, 0.01, 0.01); this.seg(f.bstring, slot * 2 + 1, tx2, ty2, tz2, mx2, my2, mz2, 0.01, 0.01);
      if (arrowVis) { let ax2 = gx - rhx, ay2 = gy - rhy, az2 = gz - rhz; const al = Math.hypot(ax2, ay2, az2) || 1; ax2 /= al; ay2 /= al; az2 /= al; this.seg(f.arrow, slot, rhx, rhy, rhz, rhx + ax2 * 0.85, rhy + ay2 * 0.85, rhz + az2 * 0.85, 0.02, 0.02); } else f.arrow.setMatrixAt(slot, Z);
      this._sx = CB[0]; this._sy = CB[1]; this._sz = CB[2];
    } else { f.bow.setMatrixAt(slot * 2, Z); f.bow.setMatrixAt(slot * 2 + 1, Z); f.bstring.setMatrixAt(slot * 2, Z); f.bstring.setMatrixAt(slot * 2 + 1, Z); f.arrow.setMatrixAt(slot, Z); }
    if (u.def.shield && (w === 'katana' || w === 'yari') && !u.mounted) {
      const lx = G[o + 6], ly = G[o + 7], lz = G[o + 8], fx2 = Math.sin(u.yaw), fz2 = Math.cos(u.yaw);
      this.seg(f.shield, slot, lx + fx2 * 0.06, ly, lz + fz2 * 0.06, lx + fx2 * 0.13, ly, lz + fz2 * 0.13, 0.8, 0.8); this.seg(f.boss, slot, lx + fx2 * 0.12, ly, lz + fz2 * 0.12, lx + fx2 * 0.17, ly, lz + fz2 * 0.17, 0.2, 0.2);
    } else { f.shield.setMatrixAt(slot, Z); f.boss.setMatrixAt(slot, Z); }
    // blade trail while the cut is moving
    if (melee && (u.st === ST_RELEASE || (u.st === ST_RECOVER && stT < 0.06))) {
      const cx = this.camera.position.x - x, cz = this.camera.position.z - z;
      if (cx * cx + cz * cz < 45 * 45) { const t0 = w === 'yari' ? ((u.kitRole !== undefined ? u.kitRole : u.role) === 'spear' ? 3.2 : 1.4) : 0.25, t1 = w === 'yari' ? ((u.kitRole !== undefined ? u.kitRole : u.role) === 'spear' ? 4.0 : 2.15) : 0.8; this.trailPush(u.id, P(t0, 0), P(t0, 1), P(t0, 2), P(t1, 0), P(t1, 1), P(t1, 2), u.team === this.localTeam); }
    }
  }
  // ---------- blade trails ----------
  buildTrails() {
    const TN = 32, SN = 10; this.trailTN = TN; this.trailSN = SN; this.trails = new Map(); this.trailPool = [];
    for (let i = 0; i < TN; i++) this.trailPool.push({ id: -1, n: 0, pts: new Float32Array(SN * 6), age: new Float32Array(SN), friendly: false, last: 0 });
    const geo = new THREE.BufferGeometry(); this.trailPos = new Float32Array(TN * SN * 2 * 3); this.trailCol = new Float32Array(TN * SN * 2 * 3);
    const idx = []; for (let t = 0; t < TN; t++) for (let s = 0; s < SN - 1; s++) { const b = (t * SN + s) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('color', new THREE.BufferAttribute(this.trailCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.trailMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.trailMesh.frustumCulled = false; this.trailMesh.renderOrder = 15; this.scene.add(this.trailMesh);
  }
  trailPush(id, bx, by, bz, tx, ty, tz, friendly) {
    let tr = this.trails.get(id);
    if (!tr) { tr = this.trailPool.find(t => t.id < 0) || this.trailPool.reduce((m, t) => (t.last < m.last ? t : m)); if (tr.id >= 0) this.trails.delete(tr.id); tr.id = id; tr.n = 0; this.trails.set(id, tr); }
    tr.last = this.time; tr.friendly = friendly;
    if (tr.n > 0) { const o = (tr.n - 1) * 6; if (Math.abs(tr.pts[o + 3] - tx) + Math.abs(tr.pts[o + 4] - ty) + Math.abs(tr.pts[o + 5] - tz) < 0.02) return; }
    if (tr.n === this.trailSN) { tr.pts.copyWithin(0, 6); tr.age.copyWithin(0, 1); tr.n--; }
    const o = tr.n * 6; tr.pts[o] = bx; tr.pts[o + 1] = by; tr.pts[o + 2] = bz; tr.pts[o + 3] = tx; tr.pts[o + 4] = ty; tr.pts[o + 5] = tz; tr.age[tr.n] = 0; tr.n++;
  }
  updateTrails(dt) {
    const SN = this.trailSN, pos = this.trailPos, col = this.trailCol; let t = 0;
    for (const tr of this.trailPool) {
      if (tr.id >= 0) { for (let s = 0; s < tr.n; s++) tr.age[s] += dt; while (tr.n > 0 && tr.age[0] > 0.16) { tr.pts.copyWithin(0, 6); tr.age.copyWithin(0, 1); tr.n--; } if (tr.n === 0 && this.time - tr.last > 0.3) { this.trails.delete(tr.id); tr.id = -1; } }
      const base = t * SN * 2;
      for (let s = 0; s < SN; s++) {
        const vi = (base + s * 2) * 3; const ss = Math.min(s, Math.max(0, tr.n - 1));
        if (tr.id < 0 || tr.n < 2) { for (let k = 0; k < 6; k++) { pos[vi + k] = 0; col[vi + k] = 0; } continue; }
        const o = ss * 6; for (let k = 0; k < 6; k++) pos[vi + k] = tr.pts[o + k];
        const fade = s < tr.n ? Math.max(0, 1 - tr.age[ss] / 0.16) * (ss / (tr.n - 1)) : 0; const br = 0.42 * fade;
        const r = tr.friendly ? 0.75 : 1, g = tr.friendly ? 0.85 : 0.82, b = tr.friendly ? 1 : 0.75;
        col[vi] = r * br * 0.25; col[vi + 1] = g * br * 0.25; col[vi + 2] = b * br * 0.25; col[vi + 3] = r * br; col[vi + 4] = g * br; col[vi + 5] = b * br;
      }
      t++;
    }
    this.trailMesh.geometry.attributes.position.needsUpdate = true; this.trailMesh.geometry.attributes.color.needsUpdate = true;
  }
  drawRagdoll(rag) {
    const f = this.fig, T = this.tmp, p = rag.p, slot = rag.slot, u = rag.unit;
    const cx = p[3], cy = p[4], cz = p[5], px = p[6], py = p[7], pz = p[8];
    let yx = cx - px, yy = cy - py, yz = cz - pz; let l = Math.hypot(yx, yy, yz) || 1; yx /= l; yy /= l; yz /= l;
    let xx = p[9] - p[12], xy = p[10] - p[13], xz = p[11] - p[14]; const d = xx * yx + xy * yy + xz * yz; xx -= yx * d; xy -= yy * d; xz -= yz * d; l = Math.hypot(xx, xy, xz); if (l < 1e-3) { xx = 1; xy = 0; xz = 0; l = 1; } xx /= l; xy /= l; xz /= l;
    const zx = xy * yz - xz * yy, zy = xz * yx - xx * yz, zz = xx * yy - xy * yx;
    const B = this._RB || (this._RB = new Float64Array(9)); B[0] = xx; B[1] = xy; B[2] = xz; B[3] = yx; B[4] = yy; B[5] = yz; B[6] = zx; B[7] = zy; B[8] = zz;
    this._sx = xx; this._sy = xy; this._sz = xz;
    this.boxB(f.torso, slot, (cx + px) / 2 + yx * 0.04, (cy + py) / 2 + yy * 0.04, (cz + pz) / 2 + yz * 0.04, B, 0.46, 0.6, 0.26);
    this.boxB(f.hips, slot, px, py, pz, B, 0.36, 0.18, 0.24);
    this.boxB(f.head, slot, p[0], p[1], p[2], B, 0.26, 0.28, 0.26);
    const hat = u.def.hat; const hatM = (mesh, on, oy, s1, s2, s3) => { if (!on) { mesh.setMatrixAt(slot, T.zero); return; } this.boxB(mesh, slot, p[0] + yx * oy, p[1] + yy * oy, p[2] + yz * oy, B, s1, s2, s3); };
    hatM(f.jingasa, false); hatM(f.kabuto, false); hatM(f.cap, false); hatM(f.kepi, false); hatM(f.band, false);
    { const cmx = (cx + px) / 2 + yx * 0.04, cmy = (cy + py) / 2 + yy * 0.04, cmz = (cz + pz) / 2 + yz * 0.04; this.drawGear(slot, u, { c: [cmx, cmy, cmz, B], h: [p[0], p[1], p[2], B], p: [px, py, pz, B], sl: [cx + xx * 0.2, cy + xy * 0.2, cz + xz * 0.2, B], sr: [cx - xx * 0.2, cy - xy * 0.2, cz - xz * 0.2, B] }, null, B, rag.hatOff); }
    const limb2 = (m1, m2, ax, ay, az, bx, by, bz, w1, w2, bendx, bendy, bendz) => { const mx = (ax + bx) / 2 + bendx, my = (ay + by) / 2 + bendy, mz = (az + bz) / 2 + bendz; this.seg(m1, slot, ax, ay, az, mx, my, mz, w1, w1); this.seg(m2, slot, mx, my, mz, bx, by, bz, w2, w2); };
    limb2(f.uarmL, f.farmL, cx + xx * 0.2, cy + xy * 0.2, cz + xz * 0.2, p[9], p[10], p[11], 0.13, 0.11, -yx * 0.05, -yy * 0.05, -yz * 0.05);
    limb2(f.uarmR, f.farmR, cx - xx * 0.2, cy - xy * 0.2, cz - xz * 0.2, p[12], p[13], p[14], 0.13, 0.11, -yx * 0.05, -yy * 0.05, -yz * 0.05);
    limb2(f.thighL, f.shinL, px + xx * 0.1, py + xy * 0.1, pz + xz * 0.1, p[15], p[16], p[17], 0.17, 0.14, zx * 0.06, zy * 0.06, zz * 0.06);
    limb2(f.thighR, f.shinR, px - xx * 0.1, py - xy * 0.1, pz - xz * 0.1, p[18], p[19], p[20], 0.17, 0.14, zx * 0.06, zy * 0.06, zz * 0.06);
    this.boxB(f.hand, slot * 2, p[9], p[10], p[11], B, 0.09, 0.09, 0.1); this.boxB(f.hand, slot * 2 + 1, p[12], p[13], p[14], B, 0.09, 0.09, 0.1);
    this.boxB(f.foot, slot * 2, p[15], p[16], p[17], B, 0.11, 0.08, 0.24); this.boxB(f.foot, slot * 2 + 1, p[18], p[19], p[20], B, 0.11, 0.08, 0.24);
    for (const k of ['blade', 'hilt', 'rifle', 'barrel', 'yari', 'pistol', 'arrow', 'rod', 'flask']) f[k].setMatrixAt(slot, T.zero); for (let k = 0; k < 9; k++) f.twig.setMatrixAt(slot * 9 + k, T.zero);
    for (const k of ['bow', 'bstring']) { f[k].setMatrixAt(slot * 2, T.zero); f[k].setMatrixAt(slot * 2 + 1, T.zero); }
  }
  drawHorse(slot, u, x, y, z, yaw, speed, walk, dead, deadT) {
    const H = this.horse, T = this.tmp, dt = this.fdt;
    const a = u ? this.anim(u.id) : null;
    let s = speed, ph = 0, gW = 1, gT = 0, gG = 0;
    if (a && !dead) {
      a.hspd += (speed - a.hspd) * (1 - Math.exp(-5 * dt)); s = a.hspd;
      gG = clamp((s - 5.2) / 1.6, 0, 1); gT = clamp((s - 2.4) / 1.2, 0, 1) * (1 - gG); gW = 1 - gT - gG;
      const stride = 1.7 * gW + 2.6 * gT + 4.6 * gG; a.hph += s * dt * 6.2832 / stride; ph = a.hph;
    }
    const mv = clamp(s / 1.5, 0, 1);
    const bob = dead ? 0 : (0.03 * Math.abs(Math.sin(ph * 2)) * gW + 0.06 * Math.abs(Math.sin(ph * 2)) * gT + 0.12 * (0.5 + 0.5 * Math.sin(ph + 1.2)) * gG) * mv;
    const pitch = dead ? 0 : 0.07 * Math.sin(ph) * gG * mv;
    if (a) a.hbob = bob;
    let lean = 0, rootY = y + bob;
    if (dead) { lean = 1.35; rootY = y + 0.35 - Math.max(0, deadT - 15) * 0.1; }
    const root = T.m2.compose(T.v.set(x, rootY, z), T.q.setFromEuler(T.e.set(pitch, yaw, lean, 'YXZ')), T.v2.set(1, 1, 1));
    this.setPart(H.body, slot, root, 0, 0, 0, 0, 0, 0, 0, 1.05, 0, 0.56, 0.62, 1.5);
    const nod = dead ? 0.4 : (0.05 * Math.sin(ph * 2) * gW + 0.04 * Math.sin(ph * 2) * gT + 0.14 * Math.sin(ph + 2.2) * gG) * mv;
    const neckA = 0.95 + nod + (dead ? 0 : 0.12 * gG);
    this.setPart(H.neck, slot, root, 0, 1.25, 0.62, neckA, 0, 0, 0, 0.32, 0, 0.26, 0.7, 0.32);
    T.m3.copy(root).multiply(T.t.makeTranslation(0, 1.25, 0.62)).multiply(T.r.makeRotationFromEuler(T.e.set(neckA, 0, 0))).multiply(T.t.makeTranslation(0, 0.66, 0)).multiply(T.r.makeRotationFromEuler(T.e.set(1.15 - nod * 0.5, 0, 0)));
    T.m.copy(T.m3).multiply(T.t.makeTranslation(0, 0.22, -0.04)).multiply(T.s.makeScale(0.2, 0.56, 0.24)); H.head.setMatrixAt(slot, T.m);
    // legs: [front-left, front-right, back-left, back-right]; phase offsets blend walk / trot / gallop
    const offW = [0.25, 0.75, 0, 0.5], offT = [0, 0.5, 0.5, 0], offG = [0.42, 0.52, 0, 0.1];
    const A = 0.32 * gW + 0.48 * gT + 0.7 * gG, K = 0.55 * gW + 1.05 * gT + 1.35 * gG;
    const pos = [[0.2, 0.55], [-0.2, 0.55], [0.2, -0.55], [-0.2, -0.55]];
    for (let i = 0; i < 4; i++) {
      const off = offW[i] * gW + offT[i] * gT + offG[i] * gG; const p = ph + off * 6.2832;
      let th = A * Math.sin(p) * mv, kn = K * Math.pow(Math.max(0, Math.cos(p)), 1.3) * mv;
      if (dead) { th = 0.6 + (i % 2) * 0.3; kn = 0.4; }
      const hind = i >= 2; const kd = hind ? -kn : kn; // hind hocks fold the other way
      T.m3.copy(root).multiply(T.t.makeTranslation(pos[i][0], 0.84, pos[i][1])).multiply(T.r.makeRotationFromEuler(T.e.set(th + (hind ? 0.12 : 0), 0, 0)));
      T.m.copy(T.m3).multiply(T.t.makeTranslation(0, -0.21, 0)).multiply(T.s.makeScale(0.15, 0.44, hind ? 0.2 : 0.16)); H.legU.setMatrixAt(slot * 4 + i, T.m);
      T.m3.multiply(T.t.makeTranslation(0, -0.42, 0)).multiply(T.r.makeRotationFromEuler(T.e.set(-kd - (hind ? 0.22 : 0), 0, 0)));
      T.m.copy(T.m3).multiply(T.t.makeTranslation(0, -0.21, 0)).multiply(T.s.makeScale(0.11, 0.44, 0.12)); H.legL.setMatrixAt(slot * 4 + i, T.m);
    }
    if (!dead && s > 6 && Math.random() < 0.4) this.smoke.spawn(x - Math.sin(yaw) * 1.2 + rnd(-0.4, 0.4), y + 0.2, z - Math.cos(yaw) * 1.2 + rnd(-0.4, 0.4), -Math.sin(yaw) * 1.5, 0.6, -Math.cos(yaw) * 1.5, rnd(0.5, 0.9), 0.4, 1.6, 0.55, 0.47, 0.34, 0.35, 0.9, 0.3);
    this.setPart(H.tail, slot, root, 0, 1.2, -0.76, 0.5 + Math.sin(this.time * 3 + slot) * 0.15 + 0.35 * gG * mv, 0, 0, 0, -0.28, 0, 0.09, 0.55, 0.09);
    this.setPart(H.saddle, slot, root, 0, 0, 0, 0, 0, 0, 0, 1.4, 0.05, 0.62, 0.12, 0.7);
  }
  drawCannon(slot, u, x, y, z, yaw, dead) {
    const C = this.cannon, T = this.tmp;
    const rec = this.cannonRecoil.get(u.id) || 0;
    const root = T.m2.compose(T.v.set(x, y + (dead ? -0.3 : 0), z), T.q.setFromEuler(T.e.set(0, yaw, dead ? 0.6 : 0, 'YXZ')), T.v2.set(1, 1, 1));
    const gat = u.def.gun ? 1 : 0;
    this.setPart(C.barrel, slot, root, 0, 0.8, -rec * 0.6, HPI - 0.14, 0, 0, 0, 0.45, 0, 1 - gat, 1 - gat, 1 - gat);
    this.setPart(C.muzzle, slot, root, 0, 0.8, -rec * 0.6, HPI - 0.14, 0, 0, 0, 1.75, 0, 1 - gat, 1 - gat, 1 - gat);
    // Nest of Bees: a red lacquered box of rockets on a barrow, tilted up at the enemy
    const full = u.loaded || u.st === S.ST_BURST ? 1 : 0.0001;
    this.setPart(C.hopper, slot, root, 0, 1.05, 0.15, -0.45, 0, 0, 0, 0, 0, gat, gat, gat);
    this.setPart(C.gbarrel, slot, root, 0, 1.05, 0.15, -0.45, 0, 0, 0, 0, 0.6, gat * 3.2 * full, gat * 2.6 * full, gat);
    this.setPart(C.carriage, slot, root, 0, 0, 0, -0.18, 0, 0, 0, 0.5, -0.5, 1, 1, 1);
    this.setPart(C.wheelL, slot, root, 0.62, 0.66, -0.1, 0, 0, HPI, 0, 0, 0, 1, 1, 1);
    this.setPart(C.wheelR, slot, root, -0.62, 0.66, -0.1, 0, 0, HPI, 0, 0, 0, 1, 1, 1);
    this.setPart(C.axle, slot, root, 0, 0.66, -0.1, 0, 0, 0, 0, 0, 0, 1, 1, 1);
  }
  // ---------- viewmodel ----------
  // first person, loading the three-eyed gun: the muzzles tipped up before your face, one barrel at a time (powder, ball and wad,
  // the rammer driven home in strokes, the touch-hole primed), then the gun comes down and the match is blown on
  vmSjReload(rt, rh, lh, P) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    if (!this.vmFlask && this.vmRifle && this.vmRifle.parent) { const g = new THREE.Group(), lea = new THREE.MeshLambertMaterial({ color: 0x6b4426, depthTest: false }), brass = new THREE.MeshLambertMaterial({ color: 0xb8913a, depthTest: false });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.11), lea); b.position.z = 0.06; g.add(b); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.05), brass); sp.position.z = -0.01; g.add(sp);
      for (const m of [b, sp]) m.renderOrder = 999; g.visible = false; this.vmRifle.parent.add(g); this.vmFlask = g; }
    lh.set(0, -0.03, -0.02);
    if (rt >= 0.88) { const m = clamp((rt - 0.88) / 0.12, 0, 1); rh.set(0, -0.06, 0.14); return { target: P(0.14, -0.3, -0.36, 0.45, 0.35, 0.15), rod: false, flask: 0, blow: m > 0.2 && m < 0.8 ? 1 : 0 }; }
    const BT = 0.88 / 3, k = Math.min(2, Math.floor(rt / BT)), s = (rt - k * BT) / BT, a = k * 2.094 + 0.5, bx = Math.cos(a) * 0.026, by = Math.sin(a) * 0.026;
    const up = (h) => V(bx, by, -0.72 - h), rest = V(0, -0.05, 0.2), F = V(0.3, 0.0, 0.42), PO = V(0.22, -0.12, 0.5), stow = V(0.04, -0.07, 0.12), pan = V(0.07, 0.05, -0.3);
    this.vmKey(rh, [[0, rest], [0.07, F], [0.12, up(0.1)], [0.2, up(0.08)], [0.25, PO], [0.31, up(0.02)], [0.34, up(0.02)], [0.38, stow], [0.44, up(0.6)], [0.48, up(0.46)], [0.53, up(0.12)], [0.57, up(0.38)], [0.61, up(0.1)], [0.65, up(0.36)], [0.69, up(0.1)], [0.74, up(0.62)], [0.79, stow], [0.84, F], [0.88, pan], [0.94, pan], [1, rest]], s);
    const prime = s > 0.8 && s < 0.97;
    return { target: prime ? P(0.08, -0.3, -0.46, 0.25, 0.25, 0.3) : P(0.04, -0.52, -0.55, 1.1, 0.08, 0), rod: s > 0.38 && s < 0.79, flask: (s > 0.06 && s < 0.24) || (s > 0.83 && s < 0.96) ? 1 : 0, blow: 0 };
  }
  vmKey(out, keys, t) {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const k0 = keys[i], k1 = keys[i + 1]; let s = clamp((t - k0[0]) / Math.max(1e-4, k1[0] - k0[0]), 0, 1); s = s * s * (3 - 2 * s);
    return out.copy(k0[1]).lerp(k1[1], s);
  }
  // being hit has weight: the head snaps away from the blow on a damped spring, the view is shoved back,
  // the field of view tightens for a heartbeat, the arms jolt down and hearing dulls on heavy blows
  impact(sx, sz, k, heavy) {
    const sim = this.sim, local = sim.players[this.localIdx]; const h = local ? sim.units[local.heroId] : null; if (!h) return;
    const yaw = this._viewYaw !== undefined ? this._viewYaw : h.yaw; let dx = sx - h.x, dz = sz - h.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const fwd = dx * Math.sin(yaw) + dz * Math.cos(yaw), right = dx * -Math.cos(yaw) + dz * Math.sin(yaw); // where the blow came from, in view space
    const I = this.imp, r = () => Math.random() - 0.5; k = Math.min(1.6, k);
    I.vp += (0.9 * fwd + 0.25 + r() * 0.3) * 9 * k;          // struck from the front: head snaps back and up
    I.vy += (-right * 0.9 + r() * 0.3) * 7 * k;               // struck from the side: head turns away
    I.vr += (right * 1.1 + r() * 0.4) * 9 * k;                // and the horizon tilts
    I.vx += (0.35 + 0.65 * Math.max(0, fwd)) * 6 * k;         // shoved back
    I.fov = Math.min(9, I.fov + 6 * k); I.jolt = Math.min(1.4, I.jolt + k); I.blur = Math.min(1, I.blur + 0.6 * k);
    this.hitstop = Math.max(this.hitstop || 0, heavy ? 0.07 : 0.035 * k);
    if (heavy || k > 0.9) { AUDIO.shellshock(Math.min(0.75, 0.3 * k)); this.shake = Math.max(this.shake, 0.9 * k); }
    AUDIO.play('thud', undefined, 0, 0, 0.5 + 0.6 * k);
  }
  // a blow on another man: an additive shove (m/s into a spring) and a bend (rad/s), consumed in drawFigure; an animation rig
  // can read a.kbX/a.kbZ (shove offset), a.hb (bend back, rad, negative = away from the front) and a.hs (twist/side bend) instead
  hitImpulse(id, dx, dz, k, heavy) {
    const u = this.sim.units[id]; if (!u || u.type === 'horse') return; const a = this.anim(id); if (!a.hiOn) { a.kbX = a.kbZ = a.kbVx = a.kbVz = a.hb = a.hbV = a.hs = a.hsV = 0; } a.hiOn = true;
    const sp = (heavy ? 6.0 : 3.6) * k; a.kbVx += dx * sp; a.kbVz += dz * sp;
    const fwd = dx * Math.sin(u.yaw) + dz * Math.cos(u.yaw), side = dx * -Math.cos(u.yaw) + dz * Math.sin(u.yaw); // the blow's direction in his own frame
    a.hbV += (fwd >= 0 ? 1 : -1) * Math.abs(fwd) * (heavy ? 17 : 11) * k - 3 * k; a.hsV += side * (heavy ? 14 : 9) * k + (Math.random() - 0.5) * 3 * k;
  }
  impStep(dt) { // critically-damped-ish springs, sub-stepped so a long frame can't explode them
    const I = this.imp, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { for (const [a, v, kk, c] of [['p', 'vp', 170, 15], ['y', 'vy', 150, 14], ['r', 'vr', 130, 12], ['x', 'vx', 160, 16]]) { I[v] += (-kk * I[a] - c * I[v]) * h; I[a] += I[v] * h; } }
    I.p = clamp(I.p, -0.35, 0.35); I.y = clamp(I.y, -0.3, 0.3); I.r = clamp(I.r, -0.35, 0.35); I.x = clamp(I.x, -0.2, 0.45);
    I.fov *= Math.exp(-dt * 7); I.jolt *= Math.exp(-dt * 6); I.blur *= Math.exp(-dt * 4);
  }
  updateViewmodel(hero, alpha, dt, moveF, mounted) {
    const vm = this.vm, st = this.vmState; const stT = hero.st === ST_IDLE ? 0 : hero.stT + alpha * DT;
    const P = (px, py, pz, rx, ry, rz) => ({ px, py, pz, rx, ry, rz });
    const xbow = hero.weapon === 'bow' && hero.def.bow && hero.def.bow.xbow; const w = xbow ? 'rifle' : hero.weapon, T = this.tmp;
    this.vmXbar.visible = xbow; this.vmBow.visible = hero.weapon === 'bow' && !xbow;
    if (this.vmBow.visible) { const dr = hero.st === ST_AIM || hero.aiming ? 1 : 0;
      // the draw: the bow comes up to the eye, the string comes back toward the cheek; a long-held full draw trembles
      const d = Math.min(1, (hero.drawT || 0) / 0.8), k = this.vmBowK = (this.vmBowK || 0) + (d - (this.vmBowK || 0)) * Math.min(1, dt * 16), tr = Math.max(0, (hero.drawT || 0) - 2.5) * 0.004;
      const sh = tr ? Math.sin(performance.now() / 23) * tr : 0;
      this.vmBow.position.set(-0.05 + dr * 0.04 + sh, -0.12 + dr * 0.08 + sh * 0.7, -0.55 + k * 0.05); this.vmBow.rotation.set(0, 0, 0.2 - dr * 0.15 - k * 0.05);
      if (this.vmBowS) { const nz = 0.07 + k * 0.34, tips = [[0.4, -0.02], [-0.4, -0.02]]; this.vmBowS.forEach((s, i) => { const ty = tips[i][0], tz = tips[i][1], dy = 0 - ty, dz = nz - tz, L = Math.hypot(dy, dz); s.position.set(0, ty + dy / 2, tz + dz / 2); s.scale.set(1, L, 1); s.rotation.set(Math.atan2(dz, dy), 0, 0); });
        const nocked = hero.ammo > 0 || (hero.st === ST_RELOAD && hero.stT > (hero.reloadT || 0.8) * 0.6); this.vmBowA.visible = nocked; this.vmBowA.position.set(0.012, 0, nz); } }
    { const arm = hero.def.arm, K = this.vmKatana.scale; if (arm === 'guandao') K.set(1.1, 1.8, 2.2); else if (arm === 'mace') K.set(3, 0.72, 1.3); else if (arm === 'jian') K.set(0.75, 1.15, 0.6); else K.set(1, 1, 1); }
    { const sv = hero.def.shield && (w === 'katana' || w === 'yari') && !mounted; this.vmShield.visible = sv; if (sv) { const up = hero.blocking ? 1 : 0; const tp = this.vmShield.position; this.vmShieldK = (this.vmShieldK || 0) + (up - (this.vmShieldK || 0)) * Math.min(1, dt * 14); const k = this.vmShieldK; tp.set(-0.42 + k * 0.15, -0.36 + k * 0.05, -0.55 - k * 0.07); this.vmShield.rotation.set(0.1 + k * 0.12, 0.5 - k * 0.3, k * 0.12); } }
    const yrole = w === 'yari' ? (hero.kitRole !== undefined ? hero.kitRole : hero.role) : null; this.vmYari.scale.y = yrole === 'spear' ? 1.75 : 1; this.vmRifle.visible = w === 'rifle'; this.vmKatana.visible = w === 'katana'; this.vmYari.visible = w === 'yari' && yrole !== 'brush' && yrole !== 'trident'; this.vmBrush.visible = w === 'yari' && yrole === 'brush'; this.vmFork.visible = w === 'yari' && yrole === 'trident'; this.vmRevolver.visible = w === 'revolver';
    // a three-eyed gun model added by a campaign (vmSj) replaces the musket parts every frame, whoever you now are
    /* swung as a club the gun is stood on end in the hands: the three-eyed gun by the end of its pole with the barrels up as the head, a musket by the muzzle with the butt up */
    { const cl = !!hero.club && w === 'rifle', sj = hero.type === 'rifle_spencer'; this.vmRifle.rotation.set(cl ? (sj ? Math.PI / 2 : -Math.PI / 2) : 0, 0, 0); this.vmRifle.position.set(0, cl ? (sj ? 0.4 : 0.66) : 0, 0); }
    if (this.vmSj) { const on = hero.type === 'rifle_spencer'; this.vmSj.visible = on; for (const c of this.vmRifle.children) { if (c === this.vmSj) continue; if (c === this.vmXbar) { if (on) c.visible = false; continue; } c.visible = !on; } }
    this.sleeveMat.color.setHex(torsoColor(hero));
    let target, speed = 14, two = true, cart = false, rod = false, breechOpen = 0, cylOut = 0, shake = 0;
    let camRoll = 0, camPitch = 0, camPush = 0;
    const rhT = T.v3.set(0, 0, 0), lhT = T.v4.set(0, 0, 0);
    const reloading = hero.st === ST_RELOAD && hero.reloadT > 0.6, rt = reloading ? clamp(stT / hero.reloadT, 0, 1) : 0;
    const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
    if (w === 'revolver') {
      const V = this.VMV; const hip = P(0.2, -0.22, -0.42, 0.05, -0.1, 0.03), ads = P(0, -0.03, -0.4, 0, 0, 0);
      rhT.copy(V.R); lhT.copy(V.L0); two = hero.aiming;
      if (reloading) { target = rt < 0.93 ? V.rel : (hero.aiming ? ads : hip); speed = 9; two = true; this.vmKey(lhT, V.keys, rt); cylOut = smooth(0.08, 0.14, rt) * (1 - smooth(0.86, 0.92, rt)); shake = rt > 0.14 && rt < 0.24 ? Math.sin(rt * 140) * 0.012 : 0; cart = rt > 0.28 && rt < 0.88 && ((rt - 0.28) % 0.0967) > 0.045; }
      else if (hero.st === ST_STUN) target = P(0.25, -0.4, -0.3, 0.4, -0.5, 0.3);
      else if (hero.aiming) { target = ads; speed = 18; } else target = hip;
      if (hero.st === ST_RELOAD && !reloading) { const t = clamp(stT / Math.max(0.1, hero.reloadT), 0, 1); rhT.y += 0.012 * Math.sin(t * PI); }
      this.fovTarget = (hero.aiming && !reloading) ? 58 : 75;
      if (cart) this.vmCart.position.copy(lhT).add(T.v.set(0.01, 0.02, 0));
    } else if (w === 'rifle' && !hero.club) {
      const R = this.VMR; const hip = P(0.22, -0.23, -0.42, 0.03, -0.12, 0.04), ads = P(0, -0.026, -0.28, 0, 0, 0);
      const bw = P(0.28, -0.28, -0.25, -0.05, -0.1, 0), br = P(0.08, -0.2, -0.85, 0.02, 0, 0);
      rhT.copy(R.R0); lhT.copy(R.L0);
      const style = reloadStyle(hero);
      if (reloading && style !== 'lever') {
        speed = 9;
        if (style === 'muzzle') { target = rt < 0.93 ? R.relMuzzle : hip; this.vmKey(rhT, R.muzzle, rt); rod = rt > 0.42 && rt < 0.88; cart = rt > 0.12 && rt < 0.3; }
        else if (style === 'sj') { const q = this.vmSjReload(rt, rhT, lhT, P); target = q.target; rod = q.rod; this._sjFl = q.flask; this._sjBlow = q.blow; speed = 7; }
        else if (style === 'spencer') { target = rt < 0.86 ? R.relSpencer : hip; this.vmKey(rhT, R.spencer, rt); cart = rt > 0.36 && rt < 0.58; }
        else { target = rt < 0.9 ? R.relBreech : (hero.aiming ? ads : hip); this.vmKey(rhT, R.breech, rt); breechOpen = smooth(0.17, 0.24, rt) * (1 - smooth(0.73, 0.8, rt)); cart = rt > 0.45 && rt < 0.72; }
        if (cart) this.vmCart.position.copy(rhT).add(T.v.set(0, 0.03, -0.02));
      }
      else if (hero.st === ST_WINDUP) target = bw;
      else if (hero.st === ST_RELEASE) { const t = clamp(stT / RELEASE_T, 0, 1), e = t * t * (3 - 2 * t); target = P(lerp(bw.px, br.px, e), lerp(bw.py, br.py, e), lerp(bw.pz, br.pz, e), lerp(bw.rx, br.rx, e), lerp(bw.ry, br.ry, e), lerp(bw.rz, br.rz, e)); speed = 40; camPush = Math.sin(t * PI) * 0.12; }
      else if (hero.st === ST_RECOVER) target = hip;
      else if (hero.st === ST_STUN) target = P(0.3, -0.45, -0.35, 0.4, -0.5, 0.3);
      else if (hero.blocking) { const Bk = [P(0.05, 0.05, -0.45, 0.3, 0, 1.4), P(0.3, -0.2, -0.45, -0.2, -0.2, -0.2), P(0.1, -0.4, -0.45, 0.1, 0, 1.5), P(-0.25, -0.2, -0.45, -0.2, 0.2, 0.2)][hero.blockDir]; target = Bk; speed = 22; }
      else if (hero.aiming) { target = ads; speed = 16; }
      else target = hip;
      if (hero.st === ST_RELOAD && style === 'lever') { const t = clamp(stT / Math.max(0.2, hero.reloadT), 0, 1); rhT.y -= 0.08 * Math.sin(t * PI); rhT.z += 0.03 * Math.sin(t * PI); }
      this.fovTarget = (hero.aiming && hero.st !== ST_RELOAD && !hero.blocking) ? 42 : (hero.aiming && style === 'lever' ? 42 : 75);
    } else {
      { let near = 99; const sim = this.sim; for (const v of sim.teamAlive[1 - hero.team] || []) { const d = Math.abs(v.x - hero.x) + Math.abs(v.z - hero.z); if (d < near) near = d; } this.fovTarget = near < 7 ? 86 : near < 12 ? 80 : 75; } // see more of the melee around you
      const K = (hero.club && w === 'rifle' ? this.VM.club : this.VM[w]) || this.VM.katana; // turned round, a gun is swung like a club: the blade's cuts and smashes, not a bayonet
      rhT.copy(K.R); lhT.copy(K.Lh);
      const d = hero.atkDir; const W = K.windup[d] || K.windup[2] || K.idle, M = K.mid[d] || K.mid[2] || W, R = K.release[d] || K.release[2] || K.idle;
      const side = d === DIR_RIGHT ? 1 : d === DIR_LEFT ? -1 : 0;
      if (hero.st === ST_WINDUP) { target = W; speed = 13; camRoll = side * 0.025; camPitch = d === DIR_UP ? 0.025 : 0; }
      else if (hero.st === ST_RELEASE) {
        const t = clamp(stT / RELEASE_T, 0, 1), e = t * t * (3 - 2 * t), u = 1 - e;
        const q = (k) => u * u * W[k] + 2 * u * e * M[k] + e * e * R[k];
        target = P(q('px'), q('py'), q('pz'), q('rx'), q('ry'), q('rz')); speed = 60;
        camRoll = side * lerp(0.025, -0.04, e); camPitch = d === DIR_UP ? lerp(0.025, -0.05, e) : d === DIR_DOWN ? -0.01 : 0; camPush = (d === DIR_DOWN ? 0.16 : 0.07) * Math.sin(t * PI);
      }
      else if (hero.st === ST_RECOVER) {
        const t = clamp(stT / Math.max(0.1, hero.def.recover), 0, 1);
        if (t < 0.3) { target = P(R.px + (R.px - M.px) * 0.15, R.py + (R.py - M.py) * 0.15, R.pz + (R.pz - M.pz) * 0.15, R.rx + (R.rx - M.rx) * 0.15, R.ry + (R.ry - M.ry) * 0.15, R.rz + (R.rz - M.rz) * 0.15); speed = 10; }
        else { target = K.idle; speed = 7; }
      }
      else if (hero.st === ST_STUN) { target = K.stun; speed = 12; camRoll = -0.04; camPitch = 0.03; }
      else if (hero.blocking) { target = K.block[hero.blockDir]; speed = 26; }
      else target = K.idle;
    }
    { // at the run the weapon is carried, not presented: musket at port arms across the chest, blade swinging low with the arm, spear tipped forward
      const idleish = hero.st === ST_IDLE && !hero.aiming && !hero.blocking && !mounted;
      this.vmRunK = (this.vmRunK || 0) + ((idleish ? clamp((hero.speedNow - 2.8) / 1.3, 0, 1) : 0) - (this.vmRunK || 0)) * Math.min(1, dt * 7);
      const rk = this.vmRunK; if (rk > 0.01) { const ph = st.ph, s1 = Math.sin(ph), c2 = Math.cos(2 * ph);
        let RP;
        if (w === 'rifle' && hero.club) RP = P(0.32 + 0.02 * s1, -0.44 + 0.03 * c2, -0.42, -0.6 + 0.08 * s1, 0.25, -0.3);
        else if (w === 'rifle') RP = P(0.14 + 0.015 * s1, -0.32 + 0.025 * c2, -0.34, 0.42 + 0.04 * s1, 0.75, -0.9 - 0.06 * s1); // port arms: butt low on the right hip, muzzle up past the left shoulder
        else if (w === 'katana') RP = P(0.3 + 0.03 * s1, -0.36 + 0.03 * c2, -0.3 - 0.1 * s1, -0.9 + 0.25 * s1, -0.3, -0.25);
        else if (w === 'yari') RP = P(0.2, -0.3 + 0.025 * c2, -0.36 - 0.04 * s1, -0.18, -0.12, 0.12);
        else if (w === 'revolver') RP = P(0.24, -0.34 + 0.03 * c2, -0.3 - 0.08 * s1, -0.7, -0.2, 0.1);
        if (RP) { target = P(lerp(target.px, RP.px, rk), lerp(target.py, RP.py, rk), lerp(target.pz, RP.pz, rk), lerp(target.rx, RP.rx, rk), lerp(target.ry, RP.ry, rk), lerp(target.rz, RP.rz, rk)); speed = Math.max(speed, 12); } } }
    if (hero.st === ST_SWAP) { target = P(target.px, target.py - 0.6, target.pz, target.rx + 0.8, target.ry, target.rz); speed = 12; }
    if (hero.st === ST_KICK) { target = P(target.px + 0.1, target.py - 0.15, target.pz, target.rx + 0.3, target.ry, target.rz); camPitch = -0.03; }
    { const he = hrEnv(hero, this.alpha === undefined ? 1 : this.alpha); if (he > 0.01) { const hs = hero.hrS || 1, jb = hero.hrK === 5; target = P(target.px + 0.05 * hs * he, target.py - (jb ? 0.05 : 0.12) * he, target.pz + (jb ? 0.14 : 0.08) * he, target.rx + (jb ? 0.15 : 0.35) * he, target.ry, target.rz + 0.15 * hs * he); speed = Math.max(speed, 34); camPitch += (jb ? 0.012 : 0.035) * he; camRoll += -0.035 * hs * he; } }
    const k = 1 - Math.exp(-speed * dt), kh = 1 - Math.exp(-16 * dt);
    st.pos.x += (target.px - st.pos.x) * k; st.pos.y += (target.py - st.pos.y) * k; st.pos.z += (target.pz - st.pos.z) * k;
    st.rot.x += (target.rx - st.rot.x) * k; st.rot.y += (target.ry - st.rot.y) * k; st.rot.z += (target.rz - st.rot.z) * k;
    st.rh.lerp(rhT, reloading ? 1 - Math.exp(-22 * dt) : kh); st.lh.lerp(lhT, reloading ? 1 - Math.exp(-22 * dt) : kh);
    // gait bob, look lag and body motion
    st.spd += (hero.speedNow - st.spd) * (1 - Math.exp(-8 * dt));
    const run = clamp((st.spd - 2.6) / 1.6, 0, 1), mv = clamp(st.spd / 1.2, 0, 1);
    st.ph += st.spd * dt * 6.2832 / (mounted ? 3 : 1.35 + run * 0.95);
    const bob = mounted ? -Math.abs(Math.sin(st.ph)) * 0.02 * moveF : (-Math.abs(Math.sin(st.ph)) * (0.012 + run * 0.02)) * mv;
    const sway = Math.sin(st.ph) * (0.008 + run * 0.012) * mv;
    let dyaw = wrapA(this._viewYaw - st.lastYaw), dpit = this._viewPitch - st.lastPitch; st.lastYaw = this._viewYaw; st.lastPitch = this._viewPitch;
    const lagK = 1 - Math.exp(-10 * dt);
    st.lagX += (clamp(dyaw * 0.9, -0.06, 0.06) - st.lagX) * lagK; st.lagY += (clamp(-dpit * 0.9, -0.05, 0.05) - st.lagY) * lagK;
    const ads = hero.aiming && !reloading ? 0.25 : 1;
    const ck = 1 - Math.exp(-14 * dt);
    st.roll += (camRoll - st.roll) * ck; st.pitch += (camPitch - st.pitch) * ck; st.push += (camPush - st.push) * (1 - Math.exp(-25 * dt));
    this.camRoll = st.roll + sway * 0.4 * ads; this.camPitch = st.pitch; this.camPush = st.push; this.camBob = bob * 1.4;
    if (this.sim.real) { // weight: a heavier stride, and a musket that wanders until you steady your breath
      this.camBob = bob * 2.3; this.camRoll += sway * 0.5;
      const settle = hero.aiming ? Math.max(0, 1 - (hero.aimHold || 0) / 1.4) : 0.4, amp = (hero.aiming ? 0.004 + 0.016 * settle : 0.002) + (this.suppress || 0) * 0.012;
      this.camPitch += Math.sin(this.time * 1.6) * amp + Math.sin(this.time * 3.7) * amp * 0.3; this.camRoll += Math.sin(this.time * 1.1 + 1) * amp * 0.8; }
    const jo = this._jolt || 0, jr = this._joltR || 0; vm.position.set(st.pos.x + (sway + st.lagX) * ads + jr * 0.2, st.pos.y + (bob * 0.6 + st.lagY) * ads + shake - jo * 0.07, st.pos.z + this.recoil * 0.12 + jo * 0.03);
    vm.rotation.set(st.rot.x + this.recoil * 0.3 + st.lagY * 2 * ads - jo * 0.22, st.rot.y + st.lagX * 1.5 * ads, st.rot.z + this.recoilRoll * 0.1 + jr * 0.5);
    // moving parts
    this.vmBreech.rotation.z = -2.0 * breechOpen;
    if (!(this.vmSj && this.vmSj.visible)) { const sight = hero.aiming && hero.st !== ST_RELOAD; if (this.vmNearEye) for (const m of this.vmNearEye) m.visible = !sight; this.vmBreech.visible = !sight; } // down the sights the brass serpentine and the match sit right at your eye: leave them out
    this.vmCyl.position.x = -0.04 * cylOut;
    this.vmCart.visible = cart;
    this.vmRod.visible = rod; if (rod) { this.vmRod.position.copy(st.rh).add(T.v.set(0, 0, 0.45)); }
    { const sjr = w === 'rifle' && !hero.club && reloading && reloadStyle(hero) === 'sj'; if (!sjr) { this._sjFl = 0; this._sjBlow = 0; }
      if (this.vmFlask) { this.vmFlask.visible = !!this._sjFl; if (this._sjFl) this.vmFlask.position.copy(st.rh).add(T.v.set(0.0, 0.0, 0.06)); }
      if (this.vmSj) { if (!this.vmSjMatch) this.vmSjMatch = this.vmSj.children.find(c => c.material && c.material.type === 'MeshBasicMaterial') || null;
        const mt = this.vmSjMatch; if (mt) { const b = this._sjBlow || 0, f = 1 + b * (2.2 + 0.6 * Math.sin(this.time * 31)); mt.scale.set(f, f, f); mt.material.color.setHex(b > 0.3 ? 0xffd27a : 0xff8a3a); } } }
    // hands and arms
    this.vmHandR.position.copy(st.rh); this.vmHandL.position.copy(st.lh); this.vmHandL.visible = two;
    vm.updateMatrix();
    // forearms run from the hands down and back toward the bottom corners of the view
    const elbowA = [new THREE.Vector3(0.24, -0.5, -0.16), new THREE.Vector3(-0.24, -0.52, -0.18)];
    const shoulder = [new THREE.Vector3(0.32, -0.84, -0.02), new THREE.Vector3(-0.32, -0.84, -0.04)]; // longer arms in first person too
    const hands = [this.vmHandR.position.clone().applyMatrix4(vm.matrix), this.vmHandL.position.clone().applyMatrix4(vm.matrix)];
    for (let i = 0; i < 2; i++) {
      const vis = i === 0 || two; this.vmFore[i].visible = vis; this.vmUpper[i].visible = vis; if (!vis) continue;
      const h = hands[i]; const dir = elbowA[i].clone().sub(h); const dl = dir.length(); dir.normalize();
      const e = h.clone().addScaledVector(dir, Math.min(0.31, dl));
      this.placeSeg(this.vmFore[i], h, e, 0.042); this.placeSeg(this.vmUpper[i], e, shoulder[i], 0.05);
    }
  }
  placeSeg(m, a, b, w) {
    const T = this.tmp; const d = T.v.subVectors(b, a); const L = d.length() || 1e-3;
    m.position.addVectors(a, b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(T.v2.set(0, 1, 0), d.multiplyScalar(1 / L)); m.scale.set(w, L, w);
  }
  // ---------- main render ----------
  // in-world markers over the men you command: a small gold lozenge over each head, the company number over its captain
  ownMarkStart(fp) {
    if (!this.omPts) { const N = this.sim.units.length; const g = new THREE.BufferGeometry(); this.omPos = new Float32Array(N * 3); g.setAttribute('position', new THREE.BufferAttribute(this.omPos, 3)); g.setDrawRange(0, 0);
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); c.translate(32, 32); c.beginPath(); c.moveTo(0, 26); c.lineTo(15, 2); c.lineTo(0, -14); c.lineTo(-15, 2); c.closePath(); c.fillStyle = 'rgba(6,20,10,.6)'; c.lineWidth = 7; c.strokeStyle = 'rgba(6,20,10,.6)'; c.stroke(); c.fillStyle = '#6fe08a'; c.fill();
      const tex = new THREE.CanvasTexture(cv); this.omPts = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size: 1.25, sizeAttenuation: true, transparent: true, depthWrite: false, alphaTest: 0.08, fog: false })); this.omPts.frustumCulled = false; this.omPts.renderOrder = 5; this.scene.add(this.omPts); this.omSpr = []; this.omTex = {}; }
    if (!fp) { this.omPts.visible = false; for (const sp of this.omSpr) sp.visible = false; return null; }
    this.omN = 0; const P = this.omPos, self = this; return { push(x, y, z) { const k = self.omN++ * 3; if (k + 2 < P.length) { P[k] = x; P[k + 1] = y; P[k + 2] = z; } } };
  }
  ownMarkEnd(om, capt, view) {
    if (!om) return; const g = this.omPts.geometry; g.setDrawRange(0, this.omN); g.attributes.position.needsUpdate = true; this.omPts.visible = this.omN > 0;
    const own = this.sim.players[this.localIdx].squads, sel = view.fpSel || []; let n = 0;
    for (let k = 0; k < own.length; k++) { const id = own[k], c = capt[id]; if (!c) continue; const on = sel.includes(id); const key = (k + 1) + (on ? 's' : '');
      let tex = this.omTex[key]; if (!tex) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = on ? '#c8f5d0' : 'rgba(8,26,14,.78)'; x.strokeStyle = '#6fe08a'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 25, 0, 7); x.fill(); x.stroke(); x.fillStyle = on ? '#0c3a1a' : '#a8f5b8'; x.font = 'bold 32px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(k + 1), 32, 34); tex = this.omTex[key] = new THREE.CanvasTexture(cv); }
      let sp = this.omSpr[n]; if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false })); sp.renderOrder = 6; this.scene.add(sp); this.omSpr[n] = sp; }
      if (sp.material.map !== tex) { sp.material.map = tex; sp.material.needsUpdate = true; }
      const d = this.camera.position.distanceTo(this.tmp.v.set(c[0], c[1], c[2])); const sc = Math.max(0.9, d * 0.045); sp.scale.set(sc, sc, 1); sp.position.set(c[0], c[1] + 0.35 + sc * 0.5, c[2]); sp.visible = true; n++; }
    for (let i = n; i < this.omSpr.length; i++) this.omSpr[i].visible = false;
  }
  render(alpha, dt, view) {
    this.alpha = alpha; // overlays (speech captions) read positions interpolated the same way the bodies are
    if (this.hitstop > 0 && !this.studio) { this.hitstop -= dt; this.present(this.camera); return; }
    this.time += dt; const sim = this.sim, units = sim.units, T = this.tmp; if (this.campFires && this.campFires.length) this.updateCamp(dt); if (this.sgv) this.updateSiege(dt);
    this.fdt = Math.min(0.05, Math.max(0.001, dt)); this.speedLines = 0;
    const local = sim.players[this.localIdx]; const hero = local ? units[local.heroId] : null;
    const fp = view.mode === 'fp' && hero && !hero.dead; this.lastMode = fp ? 'fp' : 'cmd';
    this.shake = Math.max(0, this.shake - dt * 2.5); this.recoil = Math.max(0, this.recoil - dt * 5); this.recoilRoll *= Math.exp(-dt * 8);
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.suppress = Math.max(0, this.suppress - dt * 0.5);
    this.ambT = (this.ambT || 0) - dt; if (this.ambT <= 0) { this.ambT = 0.5; let n = 0; const cp = this.camera.position; for (const u of units) if (!u.dead && (u.st === ST_RELEASE || u.st === ST_WINDUP || u.st === ST_AIM) && Math.abs(u.x - cp.x) + Math.abs(u.z - cp.z) < 120) n++; AUDIO.ambient(n / 25); } this.hitMark = Math.max(0, this.hitMark - dt); this.parryFlash = Math.max(0, this.parryFlash - dt); if (this.suppress) this.suppress = Math.max(0, this.suppress - dt * 0.35); if (this.hitQ) { this.hitQ.t -= dt; if (this.hitQ.t <= 0) this.hitQ = null; }
    // camera
    const cam = this.camera;
    let camYaw = view.yaw;
    if (fp) {
      const hx = lerp(hero.px, hero.x, alpha), hy = lerp(hero.py, hero.y, alpha), hz = lerp(hero.pz, hero.z, alpha);
      const mounted = hero.mount >= 0 || hero.mounted;
      const slideK = !hero.champ && hero.dodgeT > 0 ? Math.sin(clamp(1 - hero.dodgeT / 0.32, 0, 1) * PI) : 0;
      if (!hero.champ) { const fx0 = Math.sin(view.yaw), fz0 = Math.cos(view.yaw); const side = hero.dodgeT > 0 ? (hero.dodgeX * -fz0 + hero.dodgeZ * fx0) : 0; this.slideRoll = (this.slideRoll || 0) + ((side > 0.4 ? 1 : side < -0.4 ? -1 : 0) * slideK * 0.16 - (this.slideRoll || 0)) * (1 - Math.exp(-dt * 16)); }
      const eyeH = mounted ? 2.35 : (hero.downT > 0 ? 0.5 : 1.6 - slideK * 0.55);
      const sh = this.shake; const sx = (Math.random() - 0.5) * sh * 0.1, sy = (Math.random() - 0.5) * sh * 0.1;
      cam.position.set(hx + sx, hy + eyeH + sy + this.camBob, hz); this._viewYaw = view.yaw; this._viewPitch = view.pitch;
      this.impStep(dt); const IM = this.imp; const flin = hero.flinchT > 0 ? Math.min(1, hero.flinchT / 0.35) : 0; cam.position.y -= flin * 0.07; cam.position.x -= Math.sin(view.yaw) * IM.x; cam.position.z -= Math.cos(view.yaw) * IM.x;
      const pitch = view.pitch + this.recoil * 0.06 + (Math.random() - 0.5) * sh * 0.02 + IM.p; const yaw = view.yaw + (Math.random() - 0.5) * sh * 0.02 + IM.y;
      const cp = Math.cos(pitch); T.v.set(cam.position.x + Math.sin(yaw) * cp, cam.position.y + Math.sin(pitch), cam.position.z + Math.cos(yaw) * cp);
      { const big = hero.champ && (hero.spinT > 0 || hero.dashT > 0 || hero.castT > 0 || hero.vault || hero.plunge); this.tp = (this.tp || 0) + ((big ? 1 : 0) - (this.tp || 0)) * (1 - Math.exp(-dt * (big ? 9 : 4)));
        if (this.tp > 0.01) { const k = this.tp * this.tp * (3 - 2 * this.tp); const back = 4.6 * k, up = 1.1 * k, side = 0.9 * k; const fx = Math.sin(yaw), fz = Math.cos(yaw);
          cam.position.set(cam.position.x - fx * back - fz * side, cam.position.y + up, cam.position.z - fz * back + fx * side); T.v.y -= 0.4 * k; T.v.x = lerp(T.v.x, hx + fx * 3, k); T.v.z = lerp(T.v.z, hz + fz * 3, k); T.v.y = lerp(T.v.y, hy + 1.4, k); } }
      this.empCam(hero, yaw, pitch, dt, T.v);
      cam.lookAt(T.v); this.dodgeRoll = (this.dodgeRoll || 0) * Math.exp(-dt * 7); cam.rotateZ(this.recoilRoll * 0.03 + (hero.downT > 0 ? 0.6 : 0) + this.camRoll + this.dodgeRoll + (this.slideRoll || 0) + IM.r + flin * 0.03); cam.rotateX(this.camPitch); cam.translateZ(-this.camPush);
      this.fov += (this.fovTarget - this.fov) * (1 - Math.exp(-dt * 14));
      { const f = this.fov - IM.fov; if (Math.abs(cam.fov - f) > 0.05) { cam.fov = f; cam.updateProjectionMatrix(); } const vk = Math.min(1, Math.tan(cam.fov * PI / 360) / Math.tan(64 * PI / 360)); this.vmFov.scale.set(vk, vk, 1); }
      this._jolt = IM.jolt + flin * 0.5; this._joltR = IM.r;
      this.updateViewmodel(hero, alpha, dt, clamp(hero.speedNow / 3.5, 0, 1), mounted);
      this.vm.visible = hero.downT <= 0 && (this.tp || 0) < 0.3; this.vmArms.visible = this.vm.visible; if (!this.vm.visible) { this.vmShield.visible = false; this.vmBow.visible = false; }
      if (this.sim.sg || this.vmEmp) this.empView(hero, dt);
    } else {
      this.vm.visible = false; this.vmArms.visible = false; this.vmShield.visible = false; this.vmBow.visible = false; this.fovTarget = 60;
      this.fov += (this.fovTarget - this.fov) * (1 - Math.exp(-dt * 10)); if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
      const c = this.cmdCam; const gy = terrainH(c.x, c.z);
      const back = c.h * 0.62; camYaw = c.yaw;
      cam.position.set(c.x - Math.sin(c.yaw) * back, gy + c.h, c.z - Math.cos(c.yaw) * back);
      cam.lookAt(T.v.set(c.x, gy, c.z));
      if (this.cine) { const C = this.cine; cam.position.set(C.pos[0], C.pos[1], C.pos[2]); cam.lookAt(T.v.set(C.look[0], C.look[1], C.look[2])); if (C.fov && Math.abs(cam.fov - C.fov) > 0.05) { cam.fov = this.fov = C.fov; cam.updateProjectionMatrix(); } } // cinematic camera (trailers)
    }
    // commanders see through the murk: push the fog out in the command view
    { const k = (fp ? 1 : 1.9) * (sim.fogMul || 1) * (sim.rain && !this.biomeRain ? 0.8 : 1); const fn = this.fogBase[0] * k, ff = this.fogBase[1] * k; this.scene.fog.near += (fn - this.scene.fog.near) * Math.min(1, dt * 3); this.scene.fog.far += (ff - this.scene.fog.far) * Math.min(1, dt * 3); }
    // sun follows camera for shadows
    const sun = this.sun; const tx = cam.position.x, tz = cam.position.z;
    sun.target.position.set(tx, 0, tz); sun.position.set(tx + this.sunDir.x * 150, this.sunDir.y * 150, tz + this.sunDir.z * 150); sun.target.updateMatrixWorld();
    { // snap the shadow camera to whole shadow-map texels so edges never crawl as you move, and pin the ink texture to the ground
      const z = this.sunDir, xa = this.tmp.v2.set(z.z, 0, -z.x).normalize(), ya = this.tmp.v3.crossVectors(z, xa), tex = 140 / sun.shadow.mapSize.x;
      const lx = tx * xa.x + tz * xa.z, ly = tx * ya.x + tz * ya.z, sx = Math.round(lx / tex) * tex - lx, sy = Math.round(ly / tex) * tex - ly;
      const ntx = tx + xa.x * sx + ya.x * sy, nty = ya.y * sy, ntz = tz + xa.z * sx + ya.z * sy;
      sun.target.position.set(ntx, nty, ntz); sun.position.set(ntx + this.sunDir.x * 150, nty + this.sunDir.y * 150, ntz + this.sunDir.z * 150); sun.target.updateMatrixWorld();
      INK_SHIFT.value.set((lx + sx) / 140, (ly + sy) / 140); } // keep the ink texture fixed to the ground as the shadow camera follows you
    if (this.waterMats) for (const m of this.waterMats) m.uniforms.time.value = this.time;
    if (this.dragon) this.updateDragon(dt);
    if (this.wagonVis) sim.wagons.forEach((w, i) => { const v = this.wagonVis[i]; if (w.burnt && !v.burnt) { v.burnt = true; v.cov.visible = false; v.g.traverse(o => { if (o.material && o.material.color) o.material = o.material.clone(), o.material.color.multiplyScalar(0.25); }); }
      if (w.burnt && Math.random() < dt * 6) this.smoke.spawn(w.x + rnd(-1, 1), terrainH(w.x, w.z) + 1.5, w.z + rnd(-1, 1), 0.3, rnd(1, 2), 0.2, 6, 1, 5, 0.2, 0.18, 0.16, 0.5, 0.6, -0.15);
      if (!w.burnt && w.raid > 0 && Math.random() < dt * 10) this.sparks.spawn(w.x + rnd(-1, 1), terrainH(w.x, w.z) + 1.6, w.z + rnd(-1, 1), 0, 1.5, 0, 0.6, 0.6, 0.1, 1, 0.6, 0.2, 1, 0.8, -0.6, 0.9, 0.2, 0.05); });
    if (this.ramVis) { const r = sim.ram; this.ramVis.g.visible = r.hp > 0; if (r.hp > 0) { const y = terrainH(r.x, r.z); this.ramVis.g.position.set(r.x, y, r.z); const sw = r.atGate && sim.gate.hp > 0 ? Math.sin(this.time * 4.2) : 0; this.ramVis.log.position.z = sw * 0.9; this.ramVis.log.rotation.x = sw * 0.06; } }
    if (this.ladderVis) sim.ladders.forEach((L, i) => { const g = this.ladderVis[i]; const k = L.up ? 1 : clamp(L.prog / (30 * 7), 0, 1); g.visible = L.up || L.prog > 0; g.rotation.x = -(HPI - (HPI - 0.42) * k); });
    if (this.env) { this.env.group.position.set(cam.position.x * 0.92, 0, cam.position.z * 0.92); this.env.weather.material.uniforms.time.value = this.time; this.env.weather.material.uniforms.cam.value.copy(cam.position);
      if (this.biomeRain) this.env.weather.visible = !!sim.rain; else if (this.env.rain) { this.env.rain.visible = !!sim.rain; if (sim.rain) { this.env.rain.material.uniforms.time.value = this.time; this.env.rain.material.uniforms.cam.value.copy(cam.position); } } }
    this.sky.position.copy(cam.position);
    AUDIO.setListener(cam.position.x, cam.position.y, cam.position.z, camYaw);
    if (sim.pickups && !this.studio) this.pkFrame(sim);
    if (typeof VOICE !== 'undefined' && !this.studio) { const lp = sim.players[this.localIdx]; VOICE.frame(dt, sim, lp ? lp.heroId : -1); }
    // fog of war: the enemy is only seen within sight of your own men, or by the flash of his muskets
    if (this.fog) { this.fogT = (this.fogT || 0) - dt; if (this.fogT <= 0) { this.fogT = 0.25; const R = 62 * (1 - 0.45 * (sim.bdef.fog || 0)) * (sim.rain ? 0.8 : 1), R2 = R * R; const mine = [];
        for (const u of units) if (!u.dead && u.team === this.localTeam && u.type !== 'horse') mine.push(u);
        for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.team === this.localTeam) { this.seen[i] = 1; continue; } let v = this.reveal[i] > this.time ? 1 : 0;
          if (!v && !u.dead) for (let k = 0; k < mine.length; k++) { const m = mine[k]; const dx = m.x - u.x, dz = m.z - u.z; if (dx * dx + dz * dz < R2) { v = 1; break; } }
          if (!v && u.rider >= 0 && this.seen[u.rider]) v = 1; this.seen[i] = v; }
        for (const sq of sim.squads) { let v = 0; for (const id of sq.unitIds) if (this.seen[id] && !units[id].dead) { v = 1; break; } this.seenSq[sq.id] = v; if (v && sq.alive) this.lastSeen[sq.id] = { x: sq.cx, z: sq.cz, t: this.time }; } } }
    // figures
    const heroId = hero ? hero.id : -1;
    const cx = cam.position.x, cz = cam.position.z;
    const om = this.ownMarkStart(fp); const capt = {};
    for (let i = 0; i < units.length; i++) {
      if (this.studio && i === this.studio.id) { const S0 = this.studio; this.drawFigure(i, S0.u, S0.x, S0.y, S0.z, S0.yaw, 1, false); continue; } // portrait studio: one man posed alone, high above the field
      const u = units[i];
      if (u.dead || u.inactive) continue;
      const x = lerp(u.px, u.x, alpha), y = lerp(u.py, u.y, alpha), z = lerp(u.pz, u.z, alpha);
      if (om && u.squad >= 0 && i !== heroId && u.type !== 'horse' && !u.downed && !u.wounded && !(u.downT > 0)) { const q = sim.squads[u.squad]; if (q && (q.owner === this.localIdx || (q.id === sim.players[this.localIdx].soldierSq && sim.mission && sim.mission.soldier))) { const top = y + (u.mounted ? 3.15 : 2.55) * (u.look && u.look.h ? u.look.h : 1); om.push(x, top, z); if (capt[u.squad] === undefined) capt[u.squad] = [x, top, z]; } }
      const far = (x - cx) * (x - cx) + (z - cz) * (z - cz) > 330 * 330;
      if (this.fog && u.team !== this.localTeam && !this.seen[i]) { if (this.wasSeen[i]) { this.wasSeen[i] = 0; this.hideFigure(i); const hs = this.horseSlot.get(u.id); if (hs !== undefined) this.hideHorse(hs); const cs = this.cannonSlot.get(u.id); if (cs !== undefined) for (const k in this.cannon) this.cannon[k].setMatrixAt(cs, T.zero); } continue; }
      if (this.fog) this.wasSeen[i] = 1;
      if (u.type === 'horse') { const hs = this.horseSlot.get(u.id); this.drawHorse(hs, u, x, y, z, lerpA(u.pyaw, u.yaw, alpha), u.speedNow, u.walk, false, 0); continue; }
      if (u.def.ai === 'cannon') { this.drawCannon(this.cannonSlot.get(u.id), u, x, y, z, lerpA(u.pyaw, u.yaw, alpha), false); continue; }
      const yaw = lerpA(u.pyaw, u.yaw, alpha);
      if (u.mounted) { const hs = this.horseSlot.get(u.id); this.drawHorse(hs, u, x, y, z, lerpA(u.phyaw, u.hyaw, alpha), u.speedNow, u.walk, false, 0); }
      const sy = u.champ && u.spinT > 0 ? yaw + (1 - clamp(u.spinT / 0.55, 0, 1)) * PI * 2 : yaw;
      this.drawFigure(i, u, x, y, z, sy, alpha, far || (fp && i === heroId && (this.tp || 0) < 0.3));
    }
    this.ownMarkEnd(om, capt, view);
    // dead horses
    for (let i = this.deadHorses.length - 1; i >= 0; i--) {
      const d = this.deadHorses[i]; d.t += dt; const hs = this.horseSlot.get(d.id);
      if (d.t > 22) { this.hideHorse(hs); this.deadHorses.splice(i, 1); continue; }
      this.drawHorse(hs, units[d.id], d.x, d.y, d.z, d.yaw, 0, 0, true, d.t);
    }
    for (const [id, v] of this.cannonRecoil) { const nv = v - dt; if (nv <= 0) this.cannonRecoil.delete(id); else this.cannonRecoil.set(id, nv); }
    // ragdolls
    const sub = Math.min(dt, 0.05);
    for (const rag of this.ragdolls) {
      if (!rag.active) continue;
      rag.step(sub * 0.5); rag.step(sub * 0.5);
      if (!rag.active) { this.hideFigure(rag.slot); continue; }
      this.drawRagdoll(rag);
    }
    this.updateTrails(dt);
    for (const k in this.fig) this.fig[k].instanceMatrix.needsUpdate = true;
    for (const k in this.horse) this.horse[k].instanceMatrix.needsUpdate = true;
    for (const k in this.cannon) this.cannon[k].instanceMatrix.needsUpdate = true;
    // flags
    for (let i = 0; i < sim.squads.length; i++) {
      const sq = sim.squads[i]; const leader = sq.alive ? units[sq.unitIds[0]] : null;
      if (!leader || leader.dead || leader.downT > 0 || sq.def.cannon || sq.def.gun) { this.poles.setMatrixAt(i, T.zero); this.flags.setMatrixAt(i, T.zero); this.mons.setMatrixAt(i, T.zero); this.bars.setMatrixAt(i, T.zero); continue; }
      const x = lerp(leader.px, leader.x, alpha), y = lerp(leader.py, leader.y, alpha) + (leader.mounted ? 1 : 0), z = lerp(leader.pz, leader.z, alpha), yaw = lerpA(leader.pyaw, leader.yaw, alpha);
      const root = T.m2.compose(T.v.set(x, y, z), T.q.setFromEuler(T.e.set(0, yaw, 0)), T.v2.set(1, 1, 1));
      const sway = Math.sin(this.time * 2.2 + i) * 0.05 + (leader.speedNow || 0) * 0.02, fl = Math.sin(this.time * 5 + i * 1.7) * (sim.rain ? 0.12 : 0.22);
      this.setPart(this.poles, i, root, 0, 2.7, -0.24, -sway, 0, 0, 0, 0, 0, 1, 1, 1);
      this.setPart(this.bars, i, root, 0, 4.75, -0.24, -sway, fl, 0, 0, 0, -0.27, 1, 1, 1);
      this.setPart(this.flags, i, root, 0, 4.75, -0.24, -sway, fl, 0, 0, -0.98, -0.28, 1, 1, 1);
      this.setPart(this.mons, i, root, 0, 4.75, -0.24, -sway, fl, 0, 0, -0.5, -0.28, 1, 1, 1);
    }
    this.poles.instanceMatrix.needsUpdate = true; this.flags.instanceMatrix.needsUpdate = true; this.mons.instanceMatrix.needsUpdate = true; this.bars.instanceMatrix.needsUpdate = true;
    this.updateWorldFX(dt);
    // selection rings & markers
    let ri = 0, mi = 0;
    if (view.selected) for (const sid of view.selected) {
      const sq = sim.squads[sid]; if (!sq || !sq.alive) continue;
      for (const uid of sq.unitIds) { const u = units[uid]; if (u.dead || ri >= 200) continue; T.m.compose(T.v.set(lerp(u.px, u.x, alpha), lerp(u.py, u.y, alpha) + 0.05, lerp(u.pz, u.z, alpha)), T.q.identity(), T.v2.set(u.mounted ? 1.8 : 1, 1, u.mounted ? 1.8 : 1)); this.rings.setMatrixAt(ri++, T.m); }
      if ((sq.order === S.ORD_MOVE || sq.order === S.ORD_CHARGE) && mi < 64) { const gy = terrainH(sq.tx, sq.tz); T.m.compose(T.v.set(sq.tx, gy + 2 + Math.sin(this.time * 4) * 0.3, sq.tz), T.q.setFromEuler(T.e.set(PI, 0, 0)), T.v2.set(1, 1, 1)); this.marks.setMatrixAt(mi, T.m); this.marks.setColorAt(mi, T.c.set(sq.order === S.ORD_CHARGE ? 0xff5a3c : 0xffe08a)); mi++; }
    }
    for (let i = ri; i < 200; i++) this.rings.setMatrixAt(i, T.zero); for (let i = mi; i < 64; i++) this.marks.setMatrixAt(i, T.zero);
    let gi = 0;
    if (view.ghost) for (const g of view.ghost) { if (gi >= 400) break; T.m.compose(T.v.set(g[0], terrainH(g[0], g[1]) + 0.08, g[1]), T.q.setFromEuler(T.e.set(0, g[2] || 0, 0)), T.v2.set(1, 1, 1)); this.ghost.setMatrixAt(gi++, T.m); }
    for (let i = gi; i < 400; i++) this.ghost.setMatrixAt(i, T.zero); this.ghost.instanceMatrix.needsUpdate = true;
    if (view.ghostLine) { const L = view.ghostLine; const dx = L[2] - L[0], dz = L[3] - L[1]; const len = Math.sqrt(dx * dx + dz * dz); this.ghostLine.visible = len > 0.5; this.ghostLine.position.set((L[0] + L[2]) / 2, terrainH((L[0] + L[2]) / 2, (L[1] + L[3]) / 2) + 0.1, (L[1] + L[3]) / 2); this.ghostLine.rotation.set(0, Math.atan2(dx, dz) + HPI, 0); this.ghostLine.scale.set(Math.max(0.5, len), 1, 1); } else this.ghostLine.visible = false;
    this.rings.instanceMatrix.needsUpdate = true; this.marks.instanceMatrix.needsUpdate = true; if (this.marks.instanceColor) this.marks.instanceColor.needsUpdate = true;
    // projectiles
    let si = 0, ai = 0;
    for (let i = 0; i < sim.projectiles.length; i++) {
      const p = sim.projectiles[i];
      if (p.bolt) { if (ai >= 128) continue; T.v.set(p.vx, p.vy, p.vz).normalize(); T.q.setFromUnitVectors(T.v2.set(0, 0, 1), T.v); T.m.compose(T.v3.set(p.x, p.y, p.z), T.q, T.v4.set(2.4, 2.4, 2.6)); this.arrows.setMatrixAt(ai++, T.m); continue; }
      if (p.kind === 'arrow') { if (ai >= 128) continue; T.v.set(p.vx, p.vy, p.vz).normalize(); T.q.setFromUnitVectors(T.v2.set(0, 0, 1), T.v); T.m.compose(T.v3.set(p.x, p.y, p.z), T.q, T.v4.set(1, 1, 1)); this.arrows.setMatrixAt(ai++, T.m); }
      else { if (si >= 64) continue; const sc = p.kind === 'solid' ? 1.6 : 1; T.m.compose(T.v.set(p.x, p.y, p.z), T.q.identity(), T.v2.set(sc, sc, sc)); this.shells.setMatrixAt(si++, T.m); if (p.kind === 'shell' && Math.random() < 0.6) this.smoke.spawn(p.x, p.y, p.z, rnd(-0.3, 0.3), rnd(0, 0.4), rnd(-0.3, 0.3), 0.8, 0.3, 1.2, 0.6, 0.6, 0.6, 0.4, 0.9, -0.05); }
    }
    if (!this.arrowTrails) { this.arrowTrails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xd8d4c8, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), 128); this.arrowTrails.frustumCulled = false; this.arrowTrails.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.arrowTrails); }
    { let ti = 0; for (const p of sim.projectiles) { if (p.kind !== 'arrow' || ti >= 128) continue; const sp = Math.hypot(p.vx, p.vy, p.vz); if (sp < 1) continue; const L = Math.min(5, sp * 0.09); T.v.set(p.vx / sp, p.vy / sp, p.vz / sp); T.q.setFromUnitVectors(T.v2.set(0, 0, 1), T.v); T.m.compose(T.v3.set(p.x - T.v.x * (L / 2 + 0.35), p.y - T.v.y * (L / 2 + 0.35), p.z - T.v.z * (L / 2 + 0.35)), T.q, T.v4.set(0.035, 0.035, L)); this.arrowTrails.setMatrixAt(ti++, T.m); }
      for (let i = ti; i < 128; i++) this.arrowTrails.setMatrixAt(i, T.zero); this.arrowTrails.instanceMatrix.needsUpdate = true; } // a pale streak behind each arrow so a volley can be read in flight
    for (let i = si; i < 64; i++) this.shells.setMatrixAt(i, T.zero); for (let i = ai; i < 128; i++) this.arrows.setMatrixAt(i, T.zero);
    this.shells.instanceMatrix.needsUpdate = true; this.arrows.instanceMatrix.needsUpdate = true;
    if (this.deployBand) this.deployBand.visible = sim.phase === 0;
    // tracers
    for (let i = 0; i < this.tracerN; i++) {
      const t = this.tracers[i];
      if (t.life <= 0) { this.tracerMesh.setMatrixAt(i, T.zero); continue; }
      t.life -= dt;
      const f = clamp(t.life / t.max, 0, 1);
      const dir = T.v.subVectors(t.to, t.from); const L = dir.length(); if (L < 0.01) { t.life = 0; continue; }
      dir.multiplyScalar(1 / L);
      const prog = (t.max - t.life) / Math.max(0.01, t.max - 0.06); const headT = clamp(prog, 0, 1), tailT = clamp(prog - 13 / L, 0, 1);
      const a = T.v2.copy(t.from).addScaledVector(dir, L * tailT), b = T.v3.copy(t.from).addScaledVector(dir, L * headT);
      const seg = b.distanceTo(a); T.v4.addVectors(a, b).multiplyScalar(0.5);
      T.q.setFromUnitVectors(T.v.set(0, 0, 1), dir);
      const wd = prog < 1 ? 0.065 : 0.03 * f; T.m.compose(T.v4, T.q, T.v.set(wd, wd, Math.max(0.25, seg))); this.tracerMesh.setMatrixAt(i, T.m);
      if (prog < 1 && Math.random() < dt * 30) this.smoke.spawn(b.x, b.y, b.z, 0, 0.1, 0, 0.6, 0.05, 0.35, 0.82, 0.8, 0.78, 0.18, 0.5, 0);
      const br = (prog < 1 ? 1.25 : f * 2.5) * (t.bright || 1); this.tracerMesh.setColorAt(i, T.c.setRGB(br, br * 0.82, br * 0.5));
    }
    this.tracerMesh.instanceMatrix.needsUpdate = true; this.tracerMesh.instanceColor.needsUpdate = true;
    // particles
    this.smoke.update(dt); this.sparks.update(dt);
    // mounted charge: wind lines
    // local hero continuous sounds
    if (hero && !hero.dead) {
      const hs = this.heroStates; const prev = hs.get('st');
      if (prev !== hero.st) hs.set('st', hero.st);
      const mounted = hero.mount >= 0 || hero.mounted;
      if (mounted && hero.speedNow > 3) { const ph = Math.floor(hero.walk * 3.2 / PI); if (ph !== hs.get('gal')) { hs.set('gal', ph); AUDIO.play('gallop', hero.x, hero.y, hero.z, 0.6 + hero.speedNow * 0.05); } }
    }
    this.present(cam);
  }
  updateDragon(dt) {
    const D = this.dragon, T = this.tmp; D.t += dt * 0.022;
    const P = (u, out) => { const a = u, R = 330 + 40 * Math.sin(u * 2.3); return out.set(Math.sin(a) * R, 105 + 22 * Math.sin(u * 3.1) + 9 * Math.sin(u * 7.3), Math.cos(a) * R); };
    const ds = 0.019, q = new THREE.Quaternion(), up = T.v4.set(0, 1, 0);
    for (let i = 0; i < D.N; i++) { const u = D.t - i * ds; P(u, T.v); P(u + 0.003, T.v2); const dir = T.v3.subVectors(T.v2, T.v).normalize();
      const r = 8.5 * (1 - i / D.N * 0.7) + (i < 3 ? 1 : 0); const wv = Math.sin(this.time * 2.4 - i * 0.45) * 2.2; T.v.y += wv;
      q.setFromUnitVectors(T.v2.set(0, 0, 1), dir); T.m.compose(T.v, q, T.v2.set(r, r * 0.92, r * 1.7)); D.body.setMatrixAt(i, T.m);
      T.m.compose(T.v3.copy(T.v).addScaledVector(up, -r * 0.35), q, T.v2.set(r * 0.72, r * 0.62, r * 1.6)); D.belly.setMatrixAt(i, T.m);
      T.m.compose(T.v3.copy(T.v).addScaledVector(up, r * 0.95), q, T.v2.set(r * 0.5, r * 1.1, r * 0.5)); D.fins.setMatrixAt(i, i % 2 ? T.zero : T.m); }
    for (const m of [D.body, D.fins, D.belly]) m.instanceMatrix.needsUpdate = true;
    P(D.t + 0.006, T.v); T.v.y += Math.sin(this.time * 2.4 + 0.45) * 2.2; P(D.t + 0.012, T.v2); D.head.position.copy(T.v); D.head.lookAt(T.v2.x + this.env.group.position.x, T.v2.y, T.v2.z + this.env.group.position.z);
    P(D.t + 0.05, D.pearl.position); D.pearl.position.y += 6 + Math.sin(this.time * 1.3) * 3;
  }
  present(cam) {
    if (!this.post) { this.renderer.render(this.scene, cam); return; }
    const P = this.post; this.renderer.setRenderTarget(P.rt); this.renderer.render(this.scene, cam); this.renderer.setRenderTarget(null);
    P.mat.uniforms.near.value = cam.near; P.mat.uniforms.far.value = cam.far; this.renderer.render(P.scene, P.cam);
  }
  // ---------- art direction: woodblock-print shading, ink lines, mountains, mist, weather ----------
  toonify() {
    const g = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    g.minFilter = THREE.NearestFilter; g.magFilter = THREE.NearestFilter; g.generateMipmaps = false; g.needsUpdate = true;
    const cache = new Map();
    this.scene.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.isMeshLambertMaterial) return;
      const m = o.material; let t = cache.get(m);
      if (!t) { t = new THREE.MeshToonMaterial({ color: m.color, vertexColors: m.vertexColors, transparent: m.transparent, opacity: m.opacity, side: m.side, gradientMap: g, depthWrite: m.depthWrite }); cache.set(m, t); }
      o.material = t;
    });
    this.sleeveMat = cache.get(this.sleeveMat) || this.sleeveMat;
    // grounding in the ink edition: a soft grey wash at the foot of every structure (no trodden-earth colour: the
    // print keeps its own ground tones)
    if (this.terrain && this.groundMap) { const tm = this.terrain.material = this.terrain.material.clone(), base = THREE.Material.prototype.onBeforeCompile, gMap = this.groundMap, gExt = this.groundExt;
      tm.onBeforeCompile = function (sh, r) { if (base) base.call(this, sh, r); sh.uniforms.gMap = { value: gMap }; sh.uniforms.gExt = { value: gExt };
        sh.vertexShader = 'varying vec3 vGW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vGW; uniform sampler2D gMap; uniform float gExt;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { vec4 gm = texture2D(gMap, (vGW.xz + gExt) / (2.0 * gExt)); diffuseColor.rgb *= 1.0 - gm.r * 0.4; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.83, 0.78), smoothstep(0.35, 0.6, gm.g) * 0.5); }'); };
      tm.needsUpdate = true; }
  }
  buildPost() {
    const b = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(b.x, b.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    rt.depthTexture = new THREE.DepthTexture(b.x, b.y); rt.depthTexture.type = THREE.UnsignedIntType;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, res: { value: new THREE.Vector2(b.x, b.y) }, near: { value: 0.05 }, far: { value: 700 }, paper: { value: new THREE.Color(this.biome.mist) }, ink: { value: new THREE.Color(0x1b1720) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: [
        'uniform sampler2D tCol, tDep; uniform vec2 res; uniform float near, far; uniform vec3 paper, ink; varying vec2 vUv;',
        'float lin(vec2 uv){ float d = texture2D(tDep, uv).x; return (near*far) / (far - d*(far-near)); }',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }',
        'float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
        'void main(){',
        '  vec2 px = 1.0/res; vec3 c = texture2D(tCol, vUv).rgb;',
        '  float d0 = lin(vUv);',
        '  float dl = lin(vUv-vec2(px.x,0.0)), dr = lin(vUv+vec2(px.x,0.0)), du = lin(vUv+vec2(0.0,px.y)), dd = lin(vUv-vec2(0.0,px.y));',
        // second-derivative edges: silhouettes and creases, ignoring smooth slopes
        '  float e = (abs(dl + dr - 2.0*d0) + abs(du + dd - 2.0*d0)) / max(d0, 0.1);',
        '  float line = smoothstep(0.016, 0.05, e) * (1.0 - smoothstep(25.0, 120.0, d0));',
        '  if (d0 > far*0.98) line = 0.0;',
        // smoke and mist write no depth, so gate the edge by real colour contrast: behind smoke the image is flat and the line disappears
        '  vec3 cl = texture2D(tCol, vUv-vec2(px.x*1.5,0.0)).rgb, cr = texture2D(tCol, vUv+vec2(px.x*1.5,0.0)).rgb, cu = texture2D(tCol, vUv+vec2(0.0,px.y*1.5)).rgb, cd = texture2D(tCol, vUv-vec2(0.0,px.y*1.5)).rgb;',
        '  float ce = length(cl-cr) + length(cu-cd);',
        '  line *= smoothstep(0.05, 0.16, ce);',
        // natural print grading: desaturated, neutral highlights, slightly cool shadows
        '  float l = dot(c, vec3(0.299,0.587,0.114));',
        '  c = mix(vec3(l), c, 0.74);',
        '  c = mix(c * vec3(0.95, 0.97, 1.03), c, smoothstep(0.15, 0.6, l));',
        '  c = mix(c, c * 0.55 + ink * 0.45, line * 0.42);',
        '  vec2 fp = gl_FragCoord.xy;',
        '  float grain = hash(floor(fp)) * 0.5 + vnoise(fp * vec2(0.012, 0.18)) * 0.5;',
        '  c *= 0.97 + 0.045 * grain;',
        '  vec2 q = vUv - 0.5; float vig = smoothstep(0.85, 0.3, length(q * vec2(1.1, 1.3)));',
        '  c = mix(c * 0.8, c, 0.5 + 0.5 * vig);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'].join('\n'),
      depthTest: false, depthWrite: false,
    });
    const scene = new THREE.Scene(); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
    this.post = { rt, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }
  buildEnvironment() {
    const B = this.biome, group = new THREE.Group(); this.scene.add(group);
    let seed = 7 + (this.sim.seed & 255); const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // two ranges of distant mountains, flat-coloured like printed layers, plus one tall snow-capped cone
    const ranges = [{ R: 520, n: 34, h: [40, 95], col: B.mtn[0] }, { R: 430, n: 28, h: [22, 55], col: B.mtn[1] }];
    for (const rg of ranges) {
      const mat = new THREE.MeshBasicMaterial({ color: rg.col, fog: false });
      for (let i = 0; i < rg.n; i++) {
        const a = (i / rg.n) * Math.PI * 2 + rr() * 0.12; const h = rg.h[0] + rr() * (rg.h[1] - rg.h[0]); const w = h * (1.6 + rr() * 1.2);
        const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5 + Math.floor(rr() * 3), 1), mat); m.position.set(Math.sin(a) * rg.R, h / 2 - 8, Math.cos(a) * rg.R); m.rotation.y = rr() * 6.28; m.renderOrder = -9; group.add(m);
      }
    }
    // karst pinnacles: tall, narrow ink-wash peaks in two misty layers
    for (const [R, n, col, hs] of [[460, 26, B.mtn[0], [70, 150]], [395, 20, B.mtn[1], [40, 95]]]) { const mat = new THREE.MeshBasicMaterial({ color: col, fog: false });
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rr() * 0.2; if (rr() < 0.25) continue; const h = hs[0] + rr() * (hs[1] - hs[0]); const w = h * (0.28 + rr() * 0.14);
        const g = new THREE.CylinderGeometry(w * 0.35, w, h, 7, 1); const m = new THREE.Mesh(g, mat); m.position.set(Math.sin(a) * R, h / 2 - 10, Math.cos(a) * R); m.renderOrder = -9; group.add(m);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(w * 0.36, 7, 5), mat); cap.position.set(m.position.x, h - 10, m.position.z); cap.scale.y = 0.7; cap.renderOrder = -9; group.add(cap); } }
    // kasumi: horizontal bands of mist across the foot of the mountains
    const mistMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      uniforms: { col: { value: new THREE.Color(B.mist) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 col; varying vec2 vUv; void main(){ float band = smoothstep(0.0,0.25,vUv.y) * (1.0 - smoothstep(0.6,1.0,vUv.y)); float wav = 0.5 + 0.5*sin(vUv.x*60.0); float a = band * mix(0.75, 0.95, wav); gl_FragColor = vec4(col, a); }' });
    for (const [R, y, h] of [[470, 4, 26], [395, 10, 14]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 64, 1, true), mistMat); m.position.y = y; m.renderOrder = -7; group.add(m); }
    // weather: leaves, snow or pollen drifting through a box around the camera
    const isRain = B.weather === 'rain'; const N = isRain ? (this.lowfx ? 700 : 1800) : B.night ? 40 : this.lowfx ? 200 : 500, pos = new Float32Array(N * 3), rnd2 = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { pos[i * 3] = rr() * 80 - 40; pos[i * 3 + 1] = rr() * 30; pos[i * 3 + 2] = rr() * 80 - 40; rnd2[i * 2] = rr(); rnd2[i * 2 + 1] = rr(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('rnd', new THREE.BufferAttribute(rnd2, 2));
    const kind = isRain ? 4 : B.weather === 'snow' ? 0 : B.weather === 'leaves' ? 1 : B.weather === 'petals' ? 3 : 2;
    const wmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { time: { value: 0 }, cam: { value: new THREE.Vector3() }, kind: { value: kind } },
      vertexShader: [
        'uniform float time, kind; uniform vec3 cam; attribute vec2 rnd; varying vec2 vR; varying float vRot;',
        'void main(){ vR = rnd; float fall = kind > 3.5 ? 22.0 + rnd.x * 6.0 : kind < 0.5 ? 1.6 + rnd.x : kind < 1.5 ? 1.1 + rnd.x * 0.6 : kind > 2.5 ? 0.7 + rnd.x * 0.4 : 0.25;',
        '  vec3 p = position; p.y -= time * fall; if (kind > 3.5) { p.x += time * 5.0; } else { p.x += sin(time * (0.6 + rnd.y) + rnd.x * 30.0) * (kind > 0.5 ? 1.6 : 0.6) + time * 0.8; p.z += cos(time * (0.5 + rnd.x) + rnd.y * 20.0) * 0.9; }',
        '  vec3 rel = mod(p - cam + vec3(40.0, 0.0, 40.0), vec3(80.0, 30.0, 80.0)) - vec3(40.0, 8.0, 40.0);',
        '  vec4 mv = modelViewMatrix * vec4(cam + rel, 1.0); vRot = time * (1.0 + rnd.y * 3.0) + rnd.x * 6.28;',
        '  gl_PointSize = (kind > 3.5 ? 1.4 : kind < 0.5 ? 1.6 : kind < 1.5 ? 1.5 : 1.2) * (260.0 / max(1.0, -mv.z)); if (kind > 3.5) gl_PointSize = min(gl_PointSize, 26.0); gl_Position = projectionMatrix * mv; }'].join('\n'),
      fragmentShader: [
        'uniform float kind; varying vec2 vR; varying float vRot;',
        'void main(){ vec2 c = gl_PointCoord - 0.5; float a;',
        '  if (kind > 3.5) { float x = c.x + c.y * 0.2; a = (1.0 - smoothstep(0.01, 0.035, abs(x))) * (1.0 - smoothstep(0.25, 0.5, abs(c.y))) * 0.4; }',
        '  else if (kind > 0.5 && kind != 2.0) { float s = sin(vRot), co = cos(vRot); c = vec2(c.x*co - c.y*s, c.x*s + c.y*co); c.y *= 2.2 * (0.6 + 0.4 * abs(sin(vRot*0.7))); a = 1.0 - smoothstep(0.3, 0.45, length(c)); }',
        '  else a = 1.0 - smoothstep(0.2, 0.5, length(c));',
        '  if (a < 0.05) discard;',
        '  vec3 col = kind > 3.5 ? vec3(0.78, 0.83, 0.9) : kind < 0.5 ? vec3(0.97) : kind < 1.5 ? mix(vec3(0.78, 0.2, 0.1), vec3(0.9, 0.55, 0.15), vR.y) : kind > 2.5 ? mix(vec3(1.0, 0.8, 0.86), vec3(0.98, 0.9, 0.93), vR.y) : vec3(1.0, 0.97, 0.8);',
        '  gl_FragColor = vec4(col, a * (kind > 3.5 ? 1.0 : kind > 1.5 ? 0.6 : 0.95)); }'].join('\n') });
    const weather = new THREE.Points(geo, wmat); weather.frustumCulled = false; weather.renderOrder = 12; this.scene.add(weather);
    this.biomeRain = isRain; let rainPts = null;
    if (!isRain) { const rn = this.lowfx ? 700 : 1600, rp = new Float32Array(rn * 3), r2 = new Float32Array(rn * 2); for (let i = 0; i < rn; i++) { rp[i * 3] = rr() * 80 - 40; rp[i * 3 + 1] = rr() * 30; rp[i * 3 + 2] = rr() * 80 - 40; r2[i * 2] = rr(); r2[i * 2 + 1] = rr(); }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(rp, 3)); g2.setAttribute('rnd', new THREE.BufferAttribute(r2, 2)); const m2 = wmat.clone(); m2.uniforms.kind.value = 4; rainPts = new THREE.Points(g2, m2); rainPts.frustumCulled = false; rainPts.renderOrder = 12; rainPts.visible = false; this.scene.add(rainPts); }
    this.env = { group, weather, rain: rainPts };
    // xiangyun: auspicious curling clouds drawn on canvas, hung around the sky
    { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'); x.strokeStyle = 'rgba(255,250,235,0.95)'; x.fillStyle = 'rgba(255,250,235,0.85)'; x.lineWidth = 9; x.lineCap = 'round';
      const curl = (cx, cy, r) => { x.beginPath(); for (let t = 0; t < 9.5; t += 0.1) { const rr2 = r * (1 - t / 11); x.lineTo(cx + Math.cos(t) * rr2, cy + Math.sin(t) * rr2 * 0.8); } x.stroke(); };
      x.beginPath(); x.ellipse(128, 86, 110, 22, 0, 0, Math.PI * 2); x.fill(); curl(70, 66, 34); curl(128, 54, 40); curl(186, 66, 34);
      const tex = new THREE.CanvasTexture(cv); const sm = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }); if (this.biome.night) { sm.color.set(0x2c3442); sm.opacity = 0.4; }
      for (let i = 0; i < 14; i++) { const a = rr() * Math.PI * 2, R = 300 + rr() * 120; const sp = new THREE.Sprite(sm); sp.position.set(Math.sin(a) * R, 70 + rr() * 70, Math.cos(a) * R); const sc = 50 + rr() * 50; sp.scale.set(sc * 2, sc, 1); sp.renderOrder = -6; group.add(sp); } }
    // the golden dragon: a long serpentine body winding through the clouds
    if (!this.biome.night) { const N = 46, gold = new THREE.MeshBasicMaterial({ color: 0xe6b43c, fog: false }), dark = new THREE.MeshBasicMaterial({ color: 0xa8741e, fog: false }), red = new THREE.MeshBasicMaterial({ color: 0xc8281e, fog: false }), pale = new THREE.MeshBasicMaterial({ color: 0xf6e6b0, fog: false });
      const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), gold, N); const fins = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 4), red, N); const belly = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), pale, N);
      for (const m of [body, fins, belly]) { m.frustumCulled = false; m.renderOrder = -5; group.add(m); }
      const head = new THREE.Group(); head.renderOrder = -5;
      const hb = new THREE.Mesh(new THREE.BoxGeometry(6, 4.2, 9), gold); head.add(hb); head.scale.setScalar(2.3); const snout = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3, 5), gold); snout.position.set(0, -0.6, 6); head.add(snout);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 6), dark); jaw.position.set(0, -2.6, 5); head.add(jaw);
      for (const sx of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.6, 7, 6), dark); horn.position.set(sx * 1.8, 3.4, -2.5); horn.rotation.x = -0.9; horn.rotation.z = sx * -0.3; head.add(horn);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), red); eye.position.set(sx * 2.4, 1.2, 2.6); head.add(eye);
        const wh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 11), pale); wh.position.set(sx * 2.6, -1.0, 9); wh.rotation.y = sx * 0.5; wh.rotation.x = 0.25; head.add(wh);
        const mane = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 5), red); mane.position.set(sx * 2.8, 0.5, -4); mane.rotation.x = -1.8; head.add(mane); }
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(4.5, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff4d0, fog: false })); pearl.renderOrder = -5; group.add(pearl);
      group.add(head); this.dragon = { body, fins, belly, head, pearl, N, t: rr() * 100 }; }
  }
  project(x, y, z, out) { const v = this.tmp.v.set(x, y, z).project(this.camera); out.x = (v.x * 0.5 + 0.5) * this.canvas.clientWidth; out.y = (-v.y * 0.5 + 0.5) * this.canvas.clientHeight; out.visible = v.z < 1 && v.z > -1; return out; }
  groundFromScreen(mx, my) {
    const cam = this.camera; const nd = this.tmp.v.set((mx / this.canvas.clientWidth) * 2 - 1, -(my / this.canvas.clientHeight) * 2 + 1, 0.5).unproject(cam);
    const dir = nd.sub(cam.position).normalize(); const o = cam.position;
    let t = 10, px = o.x, pz = o.z;
    for (let i = 0; i < 24; i++) { const gy = terrainH(px, pz); if (Math.abs(dir.y) < 1e-4) break; t = (gy - o.y) / dir.y; if (t < 0) return null; px = o.x + dir.x * t; pz = o.z + dir.z * t; }
    return { x: clamp(px, -HALF, HALF), z: clamp(pz, -HALF, HALF) };
  }
}
// ---- Beijing seen from the Guangqu Gate suburb: a backdrop beyond the field's edge, never walked on ----
// The outer-city wall (外城, 1553) runs off out of sight both ways with its bastions (馬面) and crenellations; the
// Guangqu Gate stands in it as a barbican (甕城) with an arrow tower (箭樓) in front and the double-eaved gate tower
// (城樓) on the wall; corner towers close the ends, and the towers of the inner city's gates rise in the haze beyond.
Renderer.prototype.buildBeijing = function () {
  const sc = this.scene, snow = this.biome.snow, grp = new THREE.Group(); sc.add(grp); this.beijing = grp;
  const brick = new THREE.MeshLambertMaterial({ color: 0x6f6b64 }), brickD = new THREE.MeshLambertMaterial({ color: 0x5c5852 }), red = new THREE.MeshLambertMaterial({ color: 0x8a3226 }),
    roof = new THREE.MeshLambertMaterial({ color: snow ? 0x5a605e : 0x3d433e }), roofD = new THREE.MeshLambertMaterial({ color: 0x2c302c }), win = new THREE.MeshLambertMaterial({ color: 0x2a2420 });
  const Z0 = 176, H = 17, T = 9, X0 = -330, X1 = 330, gx = 6, base = -8;
  const box = (m, x, y, z, w, h, d, ry) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; grp.add(o); return o; };
  // a hip roof (廡殿/歇山 read as a hip at this distance): a flattened four-sided cone rotated to sit square
  const hip = (m, x, y, z, w, d, h) => { const o = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1), m); o.rotation.y = Math.PI / 4; o.scale.set(w, h, d); o.position.set(x, y + h / 2, z); grp.add(o); return o; };
  const tower = (x, z, w, d, storeys, s) => { // a gate or corner tower: brick platform part is the wall itself, then red-pillared storeys under deep eaves
    let y = H; for (let k = 0; k < storeys; k++) { const sw = w * (1 - k * 0.12), sd = d * (1 - k * 0.12), bh = 6.5 * s;
      box(red, x, y + bh / 2, z, sw, bh, sd); hip(roof, x, y + bh - 0.6 * s, z, sw * 1.32, sd * 1.4, (k === storeys - 1 ? 6.5 : 2.6) * s); y += bh + (k === storeys - 1 ? 0 : 1.6 * s); } };
  const arrowTower = (x, z, w, d) => { // 箭樓: a tall brick box pierced with rows of arrow windows, a hip roof on top
    const h = 16; box(brickD, x, H + h / 2, z, w, h, d); for (let row = 0; row < 4; row++) for (let c = 0; c < 12; c++) box(win, x - w / 2 + (c + 0.5) * w / 12, H + 2.6 + row * 3.4, z - d / 2 - 0.05, 1.1, 1.4, 0.2);
    hip(roof, x, H + h - 0.4, z, w * 1.25, d * 1.5, 6); };
  // the wall itself in 20 m lengths standing on the ground, so its foot follows the land; bastions every 80 m
  for (let x = X0; x < X1; x += 20) { const cx = x + 10; if (Math.abs(cx - gx) < 12) continue; const y0 = Math.min(terrainH(Math.max(-HALF - 25, Math.min(HALF + 25, cx)), Z0 - T / 2), 0) + base; box(brick, cx, (y0 + H) / 2, Z0, 20.2, H - y0, T); }
  for (let x = X0 + 40; x < X1; x += 80) { if (Math.abs(x - gx) < 40) continue; box(brick, x, (base + H) / 2, Z0 - T / 2 - 4, 12, H - base, 8); }
  // crenellations (垛口) along the outer face, one instanced mesh
  { const n = Math.floor((X1 - X0) / 2.4), im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.5, 0.7), brick, n), m = new THREE.Matrix4(); let k = 0;
    for (let x = X0; x < X1 && k < n; x += 2.4) { if (Math.abs(x - gx) < 12) continue; m.makeTranslation(x, H + 0.75, Z0 - T / 2 + 0.35); im.setMatrixAt(k++, m); } im.count = k; grp.add(im); }
  // the Guangqu Gate: the barbican in front, the arrow tower on its face, the gate tower on the wall behind
  box(brick, gx - 20, (base + H) / 2, Z0 - 14, 4, H - base, 28); box(brick, gx + 20, (base + H) / 2, Z0 - 14, 4, H - base, 28); box(brick, gx, (base + H) / 2, Z0 - 27, 44, H - base, 5);
  box(win, gx, 3.5, Z0 - 29.6, 6, 7 - base, 0.4);
  arrowTower(gx, Z0 - 27, 30, 9);
  box(brick, gx, (base + H) / 2, Z0, 24, H - base, T + 2); box(win, gx, 4, Z0 - T / 2 - 1.1, 6, 8 - base, 0.4); tower(gx, Z0, 30, 15, 2, 1.25);
  // corner towers (角樓) where the wall turns away, and small watch towers (敵臺) on a few bastions
  for (const s of [-1, 1]) { const x = gx + s * 300; box(brick, x, (base + H) / 2, Z0 - 6, 22, H - base, 20); arrowTower(x, Z0 - 6, 20, 16);
    box(brick, x + s * 8, (base + H) / 2, Z0 + 60, 8, H - base, 120); }
  for (const x of [gx - 200, gx - 120, gx + 120, gx + 200]) tower(x, Z0 - 6, 8, 6, 1, 0.7);
  // the inner city beyond: gate towers of the Chongwen and Zhengyang gates and a long line of the inner wall, paler with distance
  const far = new THREE.MeshLambertMaterial({ color: 0x8a8680 }), farR = new THREE.MeshLambertMaterial({ color: 0x8a5a50 });
  box(far, -40, 6, 330, 900, 34, 10); for (const [x, s] of [[-170, 1.5], [120, 1.4], [-430, 1.2]]) { box(farR, x, 23 + 4 * s, 330, 22 * s, 8 * s, 11 * s); hip(roof, x, 23 + 7.4 * s, 330, 30 * s, 16 * s, 7 * s); }
  grp.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
};
// ---- grounding: where things meet the earth ----
// One ground map for the whole field, painted once when the battle is built: R = contact shadow (ambient occlusion
// round every house, wall, palisade, mantlet, tent, rock and trunk), G = trodden earth (an uneven skirt of bare,
// trampled ground round each structure). The realism and stylized ground shaders read it, so every object stands in
// the ground instead of slicing through it along a perfect line. A few loose stones break up the base as well.
Renderer.prototype.buildGroundMap = function () {
  const E = HALF + 30, N = this.lowfx ? 1024 : 2048, k = N / (2 * E), sim = this.sim;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); return [c, g]; };
  const [dc, dg] = mk(), [ac, ag] = mk();
  let seed = 4711 + (sim.seed & 1023); const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const X = (x) => (x + E) * k, Zc = (z) => (z + E) * k;
  // [dirt margin m, contact strength] per kind of structure
  const KIND = { house: [1.1, 0.8], hall: [1.3, 0.85], wall: [0.7, 0.65], palisade: [0.85, 0.6], mantlet: [0.95, 0.65], tent: [0.7, 0.5], rampart: [1.4, 0.45], gate: [1.3, 0.8], keep: [1.6, 0.85] };
  const blob = (g, cx, cz, hw, hd, m, a, jag) => { // an uneven rounded outline round a footprint, grown by m
    const pts = [], per = 2 * (hw + hd) + 4 * m, n = Math.max(10, Math.min(64, Math.round(per / 0.7)));
    for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      // a rounded rectangle (superellipse) through the grown footprint, pushed in and out a little
      const ex = (hw + m) * Math.sign(c) * Math.pow(Math.abs(c), 0.35), ez = (hd + m) * Math.sign(s) * Math.pow(Math.abs(s), 0.35), j = 1 + (rr() - 0.5) * jag;
      pts.push([cx + ex * j, cz + ez * j]); }
    g.globalAlpha = a; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Zc(p[1])) : g.moveTo(X(p[0]), Zc(p[1]))); g.closePath(); g.fill(); };
  dg.fillStyle = '#fff'; ag.fillStyle = '#fff'; const stones = [];
  for (const b of sim.boxes) { const K = KIND[b.kind]; if (!K) continue; const tall = Math.min(1, (b.h || 2) / 3);
    blob(dg, b.x, b.z, b.hw, b.hd, K[0], 1, 0.45);
    blob(ag, b.x, b.z, b.hw, b.hd, 0.12 + 0.18 * tall, K[1] * (0.6 + 0.4 * tall), 0.1);
    if (b.kind !== 'tent' && b.kind !== 'rampart') { const n = Math.max(2, Math.min(9, Math.round((b.hw + b.hd) * 1.1)));
      for (let i = 0; i < n; i++) { const t = rr() * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), o = 0.12 + rr() * 0.45;
        stones.push([b.x + Math.sign(c) * Math.min(Math.abs(c) * 3, 1) * (b.hw + o), b.z + Math.sign(s) * Math.min(Math.abs(s) * 3, 1) * (b.hd + o), 0.45 + rr() * 0.9]); } } }
  for (const o of sim.obstacles) { const r = o.kind === 1 ? 0.9 * (o.scale || 1) : 0.45 * (o.scale || 1); blob(ag, o.x, o.z, r * 0.5, r * 0.5, r * 0.6, o.kind === 1 ? 0.55 : 0.35, 0.2); if (o.kind === 1) blob(dg, o.x, o.z, r * 0.6, r * 0.6, 0.5, 0.6, 0.5); }
  for (const f of sim.deco.filter(d => d.kind === 'fence')) { const dx = Math.sin(f.yaw), dz = Math.cos(f.yaw);
    for (const [g, w, a] of [[dg, 1.1, 0.7], [ag, 0.35, 0.35]]) { g.globalAlpha = a; g.lineWidth = w * 2 * k; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(X(f.x), Zc(f.z)); g.lineTo(X(f.x + dx * f.len), Zc(f.z + dz * f.len)); g.stroke(); } }
  if (!stones.length && !sim.boxes.some(b => KIND[b.kind]) && !sim.obstacles.length) return;
  // soften: the trodden ground fades over ~0.4 m (the shaders cut it with noise), the contact shadow over ~0.35 m
  const soft = (src, px) => { const [c, g] = mk(); g.filter = `blur(${px.toFixed(1)}px)`; g.drawImage(src, 0, 0); return g.getImageData(0, 0, N, N).data; };
  const D = soft(dc, 0.42 * k), A = soft(ac, 0.32 * k), px = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { px[i * 4] = A[i * 4]; px[i * 4 + 1] = D[i * 4]; px[i * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(px, N, N, THREE.RGBAFormat); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  this.groundMap = tex; this.groundExt = E;
  // loose stones and clods along the bases, half sunk
  if (stones.length) { const T = this.tmp, snow = this.biome.snow; const m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), stones.length);
    stones.forEach((s, i) => { const y = terrainH(s[0], s[1]); T.m.compose(T.v.set(s[0], y - 0.03, s[1]), T.q.setFromEuler(T.e.set(rr() * 3, rr() * 3, rr() * 3)), T.v2.set(s[2] * (0.8 + rr() * 0.5), s[2] * 0.6, s[2])); m.setMatrixAt(i, T.m);
      m.setColorAt(i, T.c.setHSL(0.08, 0.08 + rr() * 0.08, (snow ? 0.42 : 0.3) + rr() * 0.14)); });
    if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; this.scene.add(m); }
};
// where a footprint meets sloping ground: the lowest corner, so walls and plinths go down into the earth, not float
Renderer.prototype.footY = function (b) { let y = Infinity; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) y = Math.min(y, terrainH(b.x + sx * b.hw, b.z + sz * b.hd)); return y - 0.08; };
// ---- gear that follows the limb under it (model-style pass) ----
// Pauldrons and arm plates hang from the shoulder and swing with the upper arm; skirt panels, tassets and robe tails hinge
// at the waist and follow the thigh behind them; capes hinge at the shoulders and trail when running. Returns null when
// the part keeps its rigid frame.
Renderer.prototype.gearFollow = function (u, p, F, G) {
  const B = F[3], o = p.o, s = p.s; if (!o || !s) return null;
  const sc = Math.hypot(B[0], B[1], B[2]) || 1, ux = B[3] / sc, uy = B[4] / sc, uz = B[5] / sc, fx = B[6] / sc, fy = B[7] / sc, fz = B[8] / sc;
  const dirOf = (a, b) => { const dx = G[b] - G[a], dy = G[b + 1] - G[a + 1], dz = G[b + 2] - G[a + 2], l = Math.hypot(dx, dy, dz) || 1; return [dx / l, dy / l, dz / l]; };
  const A = this.anims[u.id], spd = A ? A.spd || 0 : 0;
  const R = this._gfR || (this._gfR = { B: new Float64Array(9), o: [0, 0, 0], x: 0, y: 0, z: 0, s: null, ss: [0, 0, 0] }); R.s = null;
  // basis: up (y) as given, x = the frame's own x made perpendicular, z = x × y; scaled like the source frame
  const build = (yx, yy, yz) => { let l = Math.hypot(yx, yy, yz) || 1; yx /= l; yy /= l; yz /= l;
    let xx = B[0] / sc, xy = B[1] / sc, xz = B[2] / sc; const d = xx * yx + xy * yy + xz * yz; xx -= yx * d; xy -= yy * d; xz -= yz * d; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const zx = xy * yz - xz * yy, zy = xz * yx - xx * yz, zz = xx * yy - xy * yx; const O = R.B;
    O[0] = xx * sc; O[1] = xy * sc; O[2] = xz * sc; O[3] = yx * sc; O[4] = yy * sc; O[5] = yz * sc; O[6] = zx * sc; O[7] = zy * sc; O[8] = zz * sc; };
  // hinge: keep the part's top edge where it was on the rigid frame, hang the rest along the new up axis
  const hinge = () => { const top = o[1] + s[1] * 0.5; R.x = F[0] + B[0] * o[0] + B[3] * top + B[6] * o[2]; R.y = F[1] + B[1] * o[0] + B[4] * top + B[7] * o[2]; R.z = F[2] + B[2] * o[0] + B[5] * top + B[8] * o[2]; R.o[0] = 0; R.o[1] = -s[1] * 0.5; R.o[2] = 0; };
  if (p.f === 'sl' || p.f === 'sr') { // shoulder plates ride the upper arm (70% arm, 30% chest so they still sit on the shoulder)
    const d = dirOf(p.f === 'sl' ? 18 : 27, p.f === 'sl' ? 21 : 30), k = 0.7;
    build(-d[0] * k + ux * (1 - k), -d[1] * k + uy * (1 - k), -d[2] * k + uz * (1 - k)); R.x = F[0]; R.y = F[1]; R.z = F[2]; R.o[0] = o[0]; R.o[1] = o[1]; R.o[2] = o[2]; return R; }
  if (p.f === 'p' && o[1] < -0.06 && s[1] > 0.12) { // skirt / tasset / robe panel below the waist
    const L = dirOf(0, 3), Rt = dirOf(9, 12); let d, k = 0.8;
    const fl = L[0] * fx + L[1] * fy + L[2] * fz, fr = Rt[0] * fx + Rt[1] * fy + Rt[2] * fz;
    if (o[0] > 0.07) d = L; else if (o[0] < -0.07) d = Rt;
    else if (Math.min(s[0], s[2]) < 0.12) { d = (o[2] >= 0) === (fl >= fr) ? L : Rt; k = 0.9; } // a thin front panel goes with the leading leg, a back panel with the trailing one
    else { d = [(L[0] + Rt[0]) * 0.5, (L[1] + Rt[1]) * 0.5, (L[2] + Rt[2]) * 0.5]; k = 0.6; // a whole robe skirt: hangs between the legs and flares in depth with the stride so no knee comes through
      R.ss[0] = s[0] + Math.abs((L[0] - Rt[0]) * B[0] + (L[1] - Rt[1]) * B[1] + (L[2] - Rt[2]) * B[2]) / sc * 0.12; R.ss[1] = s[1]; R.ss[2] = s[2] + Math.abs(fl - fr) * 0.32; R.s = R.ss; }
    const lag = Math.min(0.3, spd * 0.045); // the hem lifts and trails when running
    build(-d[0] * k + ux * (1 - k) + fx * lag, -d[1] * k + uy * (1 - k) + fy * lag, -d[2] * k + uz * (1 - k) + fz * lag); hinge(); return R; }
  if (p.f === 'c' && o[2] < -0.13 && o[1] < 0.22 && s[1] > 0.3 && s[2] < 0.12) { // a cape or back cloth hanging from the shoulders
    const lag = Math.min(0.45, spd * 0.07), fl = spd > 0.5 ? Math.sin((this.time || 0) * 5 + u.id) * 0.04 * Math.min(1, spd / 4) : 0;
    build(ux + fx * lag + (B[0] / sc) * fl, uy + fy * lag + (B[1] / sc) * fl, uz + fz * lag + (B[2] / sc) * fl); hinge(); return R; }
  return null;
};
// ---- camp life, drawn: relaxed poses and small activities for the men at the fire (sim sets u.cAct; see campThink) ----
// Sets the hand/weapon targets in this.tg (chest-local: +x left, +y up from the shoulders, +z forward) and returns the body.
// arms of a man on the ground (root-local; +x his left, +z forward, y from the ground): on his back one arm props him on
// the elbow and the other holds the wound, now and then reaching out for help; face down the arms reach and pull in
// turn; asleep one hand is under his head. The weapon lies by his side. Blended in by lie.k as he goes down.
Renderer.prototype.lieArms = function (lie, J, C, pel, toRoot, ik) {
  const k = lie.k, T = this._lieT || (this._lieT = new Float64Array(6)), tt = lie.tt, sA = lie.sA;
  const bump = (per, on) => { const c = ((tt / per) % 1 + 1) % 1; return c < on ? Math.sin(c / on * Math.PI) : 0; };
  const put = (so, ho, side, tx, ty, tz) => { const hx = J[ho] + (tx - J[ho]) * k, hy = J[ho + 1] + (ty - J[ho + 1]) * k, hz = J[ho + 2] + (tz - J[ho + 2]) * k; ik(so, ho, hx, hy, hz, side); };
  const sp = sA > 0 ? 0 : 9, fr = sA > 0 ? 9 : 0, sps = sA > 0 ? 1 : -1; // propping arm and free arm
  if (lie.kind === 'back') {
    put(sp, sp + 6, sps, J[sp] + sps * 0.1, 0.05, J[sp + 2] + 0.12);
    toRoot([-sps * 0.05, -0.3, 0.17], T, 0); let tx = T[0], ty = T[1], tz = T[2];
    if (lie.call) { const r = bump(4.6, 0.42); tx += (J[fr] * 0.6 - tx) * r; ty += (pel + 0.72 - ty) * r; tz += (0.42 - tz) * r; }
    put(fr, fr + 6, -sps, tx, ty, tz);
  } else if (lie.kind === 'crawl') {
    for (const [so, sd, ph] of [[0, 1, 0], [9, -1, Math.PI]]) { const c = lie.c + ph, r = 0.5 + 0.5 * Math.sin(c), up = Math.max(0, Math.cos(c)) * 0.14;
      put(so, so + 6, sd, J[so] + sd * (0.2 - 0.1 * r), 0.05 + up, J[so + 2] + 0.05 + 0.5 * r); } // reach ahead, grip, drag the body up to the hand
  } else {
    put(sp, sp + 6, sps, J[27] + sps * 0.13, Math.max(0.06, J[28] - 0.06), J[29] - 0.06);
    toRoot([-sps * 0.06, -0.3, 0.17], T, 0); put(fr, fr + 6, -sps, T[0], T[1], T[2]);
  }
  // the weapon lies on the ground beside him
  const gx = -0.42 * sps, gz = 0.15; J[18] += (gx - J[18]) * k; J[19] += (0.05 - J[19]) * k; J[20] += (gz - J[20]) * k;
  let dx = J[21] * (1 - k) + 0.08 * k, dy = J[22] * (1 - k), dz = J[23] * (1 - k) + k; const l = Math.hypot(dx, dy, dz) || 1; J[21] = dx / l; J[22] = dy / l; J[23] = dz / l;
};
Renderer.prototype.campPoseT = function (u, a, w) {
  const tg = this.tg, t = (this.time || 0) + uhash(u.id, 31) * 20, dt = this.fdt || 0.016, act = u.cAct | 0, rise = !!u.cRise, look = !!u.cLook;
  const lie = act === 7 && !rise, squat = !!u.cSeat && (act === 4 || act === 12) && !rise && !lie, sit = !!u.cSeat && !lie && !squat && !rise;
  if (a.cSv === undefined) { a.cs = sit ? 1 : 0; a.cl = lie ? 1 : 0; let v = uhash(u.id, 33) < 0.6 ? 0 : 1; const C = this.sim.cfg.camp; if (C && C.props) for (const p of C.props) if (p[0] === 'log' && Math.hypot(p[1] - u.x, p[2] - u.z) < 1.1) v = 2; a.cSv = v; }
  const kk = 1 - Math.exp(-2.6 * dt); a.cs += ((sit ? 1 : 0) - a.cs) * kk; a.cl += ((lie ? 1 : 0) - a.cl) * kk;
  const seatPel = a.cSv === 2 ? 0.42 : a.cSv === 1 ? 0.14 : 0.2, gy = sit ? -(seatPel + 0.47) + 0.05 : squat ? -0.95 : -1.34;
  const R = { lean: 0.03 + 0.02 * Math.sin(t * 0.6), twist: 0.08 * Math.sin(t * 0.21), crouch: 0, stance: 0.2, roll: 0.03 * Math.sin(t * 0.33), anchor: 'W', fkL: false, fkR: false, two: true, prop: '', ph: 'R' };
  const S3 = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; };
  const bump = (per, on) => { const c = ((t / per) % 1 + 1) % 1; return c < on ? Math.sin(c / on * PI) : 0; };
  const L3 = (o, p, q, k) => { for (let j = 0; j < 3; j++) o[j] = p[j] + (q[j] - p[j]) * k; };
  const pole = w === 'yari' || w === 'rifle';
  // where the weapon is when the hands are busy: on the ground at his right side
  const grounded = () => { S3(tg.wp, -0.44, gy, 0.08); S3(tg.wd, 0.05, 0.02, 1); nrm3(tg.wd); };
  // held at rest: a pole or gun upright at the side, a sabre point-down
  const rest = (side) => { const sx = side > 0 ? 0.24 : -0.24; if (pole) { S3(tg.wp, sx, -0.42, 0.1); S3(tg.wd, 0, 1, 0.06); } else { S3(tg.wp, sx * 0.95, -0.66, 0.08); S3(tg.wd, 0.05 * side, -0.95, 0.3); } nrm3(tg.wd); if (side > 0) { set3(tg.lh, tg.wp); } else { set3(tg.rh, tg.wp); } };
  const knees = () => { S3(tg.rh, -0.17, sit ? -0.52 : -0.5, 0.34); S3(tg.lh, 0.17, sit ? -0.52 : -0.5, 0.34); };
  if (w === 'bow' || w === '' || w === 'revolver') { R.anchor = 'skip'; }
  if (lie) { S3(tg.rh, -0.06, -0.3, 0.13); S3(tg.lh, 0.07, -0.34, 0.12); S3(tg.wp, -0.42, -0.45, -0.05); S3(tg.wd, 0, 1, 0.02); nrm3(tg.wd); R.lean = 0; R.twist = 0; R.roll = 0.05; R.stance = 0; return R; }
  if (look) { // somebody has come to talk: look up at him, hands to the knees (or the weapon at rest)
    if (sit || squat) { knees(); grounded(); R.lean = -0.12; R.crouch = squat ? 0.5 : 0; R.stance = squat ? 0.35 : 0; } else { rest(-1); R.fkL = true; R.lean = -0.04; }
    return R; }
  switch (act) {
    case 1: { const r2 = 0.02 * Math.sin(t * 3.1); S3(tg.rh, -0.09, -0.27 + r2, 0.46); S3(tg.lh, 0.09, -0.27 - r2, 0.46); grounded(); R.lean = 0.24; break; } // hands to the fire
    case 2: case 15: { const k = act === 2 ? bump(6.5, 0.32) : bump(9, 0.4); L3(tg.rh, [-0.16, -0.42, 0.3], act === 2 ? [-0.03, 0.11, 0.12] : [-0.05, 0.06, 0.17], k); R.prop = act === 2 ? 'gourd' : 'pipe';
      if (sit || squat) { S3(tg.lh, 0.17, -0.52, 0.34); grounded(); R.lean = 0.12 - (act === 2 ? 0.3 : 0.08) * k; } else { rest(1); R.lean = 0.02 - (act === 2 ? 0.25 : 0.06) * k; } break; }
    case 3: { const k = bump(2.4, 0.45); S3(tg.lh, 0.05, -0.3, 0.3); L3(tg.rh, [-0.02, -0.26, 0.31], [-0.02, 0.09, 0.13], k); grounded(); R.prop = 'bowl'; R.ph = 'L'; R.lean = 0.22 - 0.1 * k; break; } // bowl and chopsticks
    case 5: { S3(tg.wp, -0.03, -0.47, 0.34); S3(tg.wd, 1, 0.06, 0.12); nrm3(tg.wd); S3(tg.lh, 0.38, -0.45, 0.38); S3(tg.rh, 0.02 + 0.16 * Math.sin(t * 3.3), -0.42, 0.37); R.prop = 'stone'; R.lean = 0.32; break; } // the whetstone along the blade
    case 6: { S3(tg.rh, -0.05 + 0.03 * Math.sin(t * 2.3), -0.5 + 0.02 * Math.sin(t * 4.7), 0.3); S3(tg.lh, 0.07, -0.5, 0.31); grounded(); R.prop = 'cloth'; R.ph = 'L'; R.lean = 0.36; break; } // mending a sandal or a sleeve
    case 4: { knees(); grounded(); R.crouch = 0.5; R.lean = 0.3; R.stance = 0.35; break; }
    case 12: { const k = bump(5, 0.35); knees(); L3(tg.rh, [-0.17, -0.5, 0.34], [-0.06, -0.7, 0.66], k); grounded(); R.prop = 'stick'; R.crouch = 0.5; R.lean = 0.3 + 0.2 * k; R.stance = 0.35; break; } // feeding the fire
    case 14: { const k = bump(3.2, 0.3); S3(tg.lh, 0.17, -0.52, 0.34); L3(tg.rh, [-0.1, -0.35 + 0.03 * Math.sin(t * 14), 0.3], [-0.05, -0.62, 0.52], k); grounded(); R.prop = 'cup'; R.lean = 0.3; break; } // dice in a cup
    case 8: { const k = bump(8, 0.38); L3(tg.rh, [-0.24, -0.62, 0.05], [-0.14, 0.42, 0.02], k); L3(tg.lh, [0.24, -0.62, 0.05], [0.14, 0.42, 0.02], k); S3(tg.wp, -0.46, -0.9, 0.14); S3(tg.wd, -0.1, 1, 0.12); nrm3(tg.wd); R.lean = -0.14 * k; break; } // a long stretch
    case 9: { rest(1); S3(tg.rh, -0.2 + 0.06 * Math.sin(t * 2.1), -0.26 + 0.09 * Math.sin(t * 1.7), 0.33 + 0.05 * Math.sin(t * 2.6)); R.twist = 0.1 * Math.sin(t * 0.9); R.lean = 0.05; break; } // talking with his hands
    case 10: { if (pole) rest(-1); else { S3(tg.wp, 0, -0.52, 0.28); S3(tg.wd, 0, -1, 0.12); nrm3(tg.wd); set3(tg.rh, tg.wp); set3(tg.lh, tg.wp); } if (pole) R.fkL = true; R.lean = -0.02; R.stance = 0.3; R.roll = 0; break; } // on watch
    case 11: { if (w === 'yari') { S3(tg.wp, -0.15, -0.1, 0.18); S3(tg.wd, 0.35, 0.85, 0.22); } else if (w === 'rifle') { S3(tg.wp, -0.21, 0.03, 0.04); S3(tg.wd, 0.16, 0.95, -0.24); } else { const K = KF.katana.carry; set3(tg.wp, K.g); set3(tg.wd, K.d); } nrm3(tg.wd); set3(tg.rh, tg.wp); R.fkL = true; R.stance = 0; R.lean = 0.04; break; } // walking with the weapon sloped
    case 13: { const c = Math.cos(t * 1.5), s = Math.sin(t * 1.5); S3(tg.rh, -0.04 + 0.1 * c, -0.42, 0.5 + 0.1 * s); S3(tg.lh, 0.06 + 0.1 * c, -0.3, 0.48 + 0.1 * s); grounded(); R.prop = 'ladle'; R.lean = 0.2; break; } // stirring the pot
    default: { if (sit || squat) { knees(); grounded(); R.lean = 0.18; } else { rest(-1); R.fkL = true; } }
  }
  if (squat && act !== 4 && act !== 12) { R.crouch = 0.5; R.stance = 0.35; }
  return R;
};
// the little things in their hands
Renderer.prototype.campPropDraw = function (u, a, G) {
  const kind = a.cProp || ''; let P = this.campPropM || (this.campPropM = {});
  let g = P[u.id];
  if (!g) { if (!kind) return; g = P[u.id] = {}; const L = (c) => new THREE.MeshLambertMaterial({ color: c });
    const mk = (geo, c) => { const m = new THREE.Mesh(geo, L(c)); m.visible = false; this.scene.add(m); return m; };
    g.gourd = mk(new THREE.SphereGeometry(0.055, 7, 5), 0xb08a3c); g.bowl = mk(new THREE.CylinderGeometry(0.075, 0.045, 0.05, 9), 0x6a4a2c); g.cup = mk(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 8), 0x3a2a1c);
    g.pipe = mk(new THREE.BoxGeometry(0.012, 0.012, 0.3), 0x2a1c12); g.stone = mk(new THREE.BoxGeometry(0.1, 0.025, 0.035), 0x6a6a68); g.cloth = mk(new THREE.BoxGeometry(0.16, 0.025, 0.1), 0x8a7a5a);
    g.stick = mk(new THREE.BoxGeometry(0.025, 0.025, 0.55), 0x3a2a1a); g.ladle = mk(new THREE.BoxGeometry(0.025, 0.85, 0.025), 0x5a4028); }
  const hi = a.cPropH === 'L' ? 24 : 33, ei = a.cPropH === 'L' ? 21 : 30;
  for (const k in g) { const m = g[k]; const on = k === kind && !u.dead; m.visible = on; if (!on) continue;
    m.position.set(G[hi], G[hi + 1], G[hi + 2]); const fx = G[hi] - G[ei], fz = G[hi + 2] - G[ei + 2];
    m.rotation.set(k === 'ladle' ? 0.3 : 0, Math.atan2(fx, fz), 0); if (k === 'ladle') m.position.y -= 0.3; if (k === 'gourd') m.position.y += 0.03; }
};
// weapons lying where men fell: one small low-poly model per kind, placed flat on the ground and turned by id
Renderer.prototype.pkFrame = function (sim) {
  const M = this.pkM || (this.pkM = new Map()), seen = this.pkSeen || (this.pkSeen = new Set()); seen.clear();
  const mat = this.pkMat || (this.pkMat = { iron: new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }), dark: new THREE.MeshLambertMaterial({ color: 0x3c3c40 }), wood: new THREE.MeshLambertMaterial({ color: 0x6b4a2c }), red: new THREE.MeshLambertMaterial({ color: 0x8a2a1e }), straw: new THREE.MeshLambertMaterial({ color: 0xb79a5a }), horn: new THREE.MeshLambertMaterial({ color: 0x4a3424 }) });
  const box = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const make = (k) => { const g = new THREE.Group();
    if (k === 'dao' || k === 'jsword') { box(g, 0.05, 0.02, 0.78, mat.iron, 0, 0.02, 0.25); box(g, 0.12, 0.03, 0.03, mat.dark, 0, 0.02, -0.15); box(g, 0.04, 0.035, 0.24, k === 'dao' ? mat.red : mat.wood, 0, 0.02, -0.29); }
    else if (k === 'spear' || k === 'qiang' || k === 'trident' || k === 'brush') { const L = k === 'spear' ? 4.6 : k === 'brush' ? 4.2 : k === 'trident' ? 2.6 : 3.0; box(g, 0.045, 0.045, L, mat.wood, 0, 0.03, 0);
      if (k === 'brush') for (let i = 0; i < 6; i++) box(g, 0.6 - i * 0.07, 0.03, 0.03, mat.wood, 0, 0.03, L / 2 - 0.2 - i * 0.22);
      else if (k === 'trident') { box(g, 0.34, 0.03, 0.03, mat.iron, 0, 0.03, L / 2); for (const s of [-1, 0, 1]) box(g, 0.025, 0.025, 0.28, mat.iron, s * 0.16, 0.03, L / 2 + 0.14); }
      else box(g, 0.03, 0.02, 0.3, mat.iron, 0, 0.03, L / 2 + 0.15); }
    else if (k === 'musket' || k === 'jmusket') { box(g, 0.05, 0.06, 0.75, mat.wood, 0, 0.04, -0.15); box(g, 0.025, 0.025, 1.0, mat.dark, 0, 0.07, 0.35); }
    else if (k === 'sanyan') { box(g, 0.04, 0.04, 1.1, mat.wood, 0, 0.04, -0.3); for (const s of [-1, 0, 1]) box(g, 0.035, 0.035, 0.42, mat.dark, s * 0.04, 0.05 + (s === 0 ? 0.035 : 0), 0.45); }
    else if (k === 'bow' || k === 'jbow') { const m = k === 'jbow' ? mat.horn : mat.wood; for (let i = -3; i <= 3; i++) { const a = i / 3 * 0.9; box(g, 0.035, 0.025, 0.2, m, Math.cos(a) * 0.45 - 0.42, 0.02, Math.sin(a) * 0.62); } box(g, 0.006, 0.006, 1.2, mat.straw, 0.0, 0.02, 0); }
    else if (k === 'shield' || k === 'jshield') { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 10), k === 'shield' ? mat.straw : mat.red); s.position.y = 0.04; g.add(s); box(g, 0.1, 0.03, 0.1, mat.dark, 0, 0.08, 0); }
    return g; };
  for (const p of sim.pickups) { seen.add(p.id); let g = M.get(p.id);
    if (!g) { g = make(p.k); const y = terrainH(p.x, p.z); g.position.set(p.x, y + 0.01, p.z); g.rotation.y = (p.id * 2.399) % 6.283; g.rotation.z = ((p.id * 0.37) % 0.3) - 0.15; this.scene.add(g); M.set(p.id, g); } }
  for (const [id, g] of M) if (!seen.has(id)) { this.scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); M.delete(id); }
};
return { Renderer, TEAM_COL, gearFor, GEAR_K, GEAR_HOOK, BANNER, torsoColor, legColor, lookGear, roundBox, uhash };
})();
