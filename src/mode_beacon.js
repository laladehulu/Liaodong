// ===== 烽火 · Hold the Beacon: menu, HUD line, quartermaster and the fire stoves in the 3D scene =====
// Spliced into main.js's scope (like career.js): uses state, S, $, toast, banner, feed, AUDIO, ROLE_INFO, Input.
const BCN = { open: false, sim: null, fires: -1, stage: '', log: 0, vis: null, t: 0, lastN: 0 };
(function beaconCss() {
  const st = document.createElement('style'); st.textContent = `
#beaconPanel .bcbrief { font: 14px/1.5 Georgia, serif; color: var(--ink); margin: 2px 0 10px; max-width: 640px; }
#beaconPanel .bckeys { font-size: 12px; color: var(--ink2); margin-top: 8px; }
#status .bcf { display: inline-flex; gap: 3px; align-items: center; }
#status .bcf i { width: 9px; height: 13px; border-radius: 50% 50% 45% 45% / 60% 60% 40% 40%; background: rgba(233,225,207,.18); border: 1px solid rgba(233,225,207,.3); display: inline-block; }
#status .bcf i.on { background: radial-gradient(circle at 50% 70%, #ffe08a, #f08a24 55%, #b8361c); border-color: #ffb050; box-shadow: 0 0 8px #f08a24; }
#status .bcs { font: 600 13px Georgia, serif; color: #e8dcc0; }
#status .bcs b { color: #f2cf6a; }
#status .bcw { font: 600 12px Georgia, serif; color: #c9b9a0; }
#status.bcpress { border-color: #e04a3a; box-shadow: 0 0 14px rgba(224,74,58,.55); }
#bcshop { position: fixed; right: max(12px, env(safe-area-inset-right, 0px)); top: 120px; width: min(300px, 76vw); background: rgba(16,13,10,.86); border-left: 3px solid #d2a94c; color: #efe6d0; padding: 10px 12px; font: 13px/1.35 Georgia, serif; z-index: 30; }
#bcshop h4 { margin: 0 0 6px; font: 700 14px Georgia, serif; color: #f2cf6a; }
#bcshop .it { display: grid; grid-template-columns: 22px 1fr auto; gap: 6px; padding: 3px 0; border-top: 1px solid rgba(233,225,207,.08); }
#bcshop .it kbd { font: 700 11px monospace; background: #2a241c; border: 1px solid #6a5a44; border-radius: 3px; text-align: center; color: #f2cf6a; }
#bcshop .it.no { opacity: .42; }
#bcshop .it small { color: #a89a84; display: block; font-size: 11px; }
#bcshop .ft { margin-top: 6px; font-size: 11px; color: #a89a84; }
`; document.head.appendChild(st);
})();
// ---- menu ----
function beaconMenu(on) {
  let el = $('beaconPanel');
  if (!el) { el = document.createElement('div'); el.id = 'beaconPanel'; el.hidden = true; const after = $('missionPanel'); after.parentNode.insertBefore(el, after.nextSibling); }
  el.hidden = !on; if (!on) return;
  if (!ROLE_INFO.some(r => r[0] === state.role)) state.role = ROLE_INFO[0][0];
  el.innerHTML = `<h3 class="sect">烽火 · Hold the Beacon · 1618</h3>
    <p class="bcbrief">Fushun has fallen. You hold a signal tower on the Liaodong wall. Between raids, light the fires: five fires and Liaoyang sends its cavalry. Hold until it comes.</p>
    <h3 class="sect">Your troops</h3><div class="chapters roles" id="bcroles">${ROLE_INFO.map(r => `<button type="button" class="chap${r[0] === state.role ? ' on' : ''}" data-r="${r[0]}"><b>${r[1]} · ${r[2]}</b><small>${r[3]}</small></button>`).join('')}</div>
    <p class="note bckeys">Stand at the stoves to light a fire · <b>I</b> quartermaster: hire men with silver · F follow · C charge · H hold. Host a room to hold it together (up to 4).</p>`;
  el.querySelectorAll('#bcroles button').forEach(b => b.onclick = () => { state.role = b.dataset.r; AUDIO.init(); AUDIO.play('ui'); beaconMenu(true); });
}
// ---- the golden line in the top bar ----
const bcOrd = (n) => ['first', 'second', 'third', 'fourth', 'fifth'][n - 1] || n + 'th';
const bcClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, '0')}`;
function beaconLeft(sim) { const B = sim.bc; let n = 0; for (const gid of B.wave || []) { const g = sim.mg[gid]; if (!g || g.broken) continue; const p = sim.players[g.p]; for (const id of p.squads) for (const uid of sim.squads[id].unitIds) { const u = sim.units[uid]; if (!u.dead && !u.inactive) n++; } const h = sim.units[p.heroId]; if (h && !h.dead && !h.inactive) n++; } return n; }
function beaconGoal() {
  const sim = state.sim, B = sim.bc, K = S.BEACON; if (!B) return `<span class="goal">Hold the tower</span>`;
  const el = (sim.tick - B.t0) / 30, me = sim.units[sim.players[state.localIdx].heroId];
  let g;
  if (B.stage === 'lull') { const left = (B.n === 0 ? K.LULL0 : K.LULL) - el;
    if (!B.lit && B.fires < K.NFIRE) { const d = me && !me.dead ? Math.hypot(me.x - K.STOVES.x, me.z - K.STOVES.z) : 0;
      g = B.light > 0 ? `Lighting the fire… ${Math.min(99, Math.round(B.light / (K.LIGHT * 30) * 100))}%` : `Light fire ${B.fires + 1} at the stoves${d > K.STOVES.r ? ` · ${Math.round(d)} m` : ''} · ${bcClock(left)}`; }
    else g = B.fires >= K.NFIRE ? `Brace for the last assault · ${bcClock(left)}` : `Hire men (I) · raid in ${bcClock(left)}`; }
  else if (B.stage === 'final') g = B.relief ? `Break them · ${beaconLeft(sim)} left` : `Hold till the relief · ${bcClock(K.RELIEF_AT - el)}`;
  else g = `Raid ${B.n}: hold the tower · ${beaconLeft(sim)} left`;
  if (B.press > 30) g = `Drive them out of the tower! · ${bcClock(K.FALL - B.press / 30)}`;
  $('status').classList.toggle('bcpress', B.press > 30);
  const pips = Array.from({ length: K.NFIRE }, (_, i) => `<i class="${i < B.fires ? 'on' : ''}"></i>`).join('');
  return `<span class="bcf" title="Signal fires">${pips}</span><span class="bcs">銀 <b>${B.silver}</b></span><span class="goal">${escapeHtml(g)}</span>`;
}
// ---- the quartermaster ----
function beaconShop(open) {
  BCN.open = open; let el = $('bcshop'); if (!el) { el = document.createElement('div'); el.id = 'bcshop'; el.hidden = true; document.body.appendChild(el); }
  el.hidden = !open; if (open) beaconShopDraw(); AUDIO.play('ui');
}
function beaconShopDraw() {
  const el = $('bcshop'), sim = state.sim, B = sim && sim.bc; if (!el || el.hidden || !B) return; const K = S.BEACON;
  const rows = K.SHOP.map((it, i) => { const d = S.defFor(it[0], 0), n = sim.beaconStock(i), ok = n > 0 && B.silver >= it[1];
    return `<div class="it${ok ? '' : ' no'}"><kbd>${i + 1}</kbd><span>${d.jp} ${d.name}<small>${d.count > 1 ? `${d.count} men` : 'one rocket cart'} · ${n ? `${n} on the road` : 'none left'}</small></span><b>${it[1]}</b></div>`; });
  rows.push(`<div class="it${B.silver >= K.MEND ? '' : ' no'}"><kbd>${K.SHOP.length + 1}</kbd><span>醫 Mend your men<small>Every man of yours back to full strength</small></span><b>${K.MEND}</b></div>`);
  const rd = B.stage === 'lull' && (B.lit || B.fires >= K.NFIRE);
  rows.push(`<div class="it${rd ? '' : ' no'}"><kbd>${K.SHOP.length + 2}</kbd><span>令 Ready<small>${rd ? 'Call the next raid on now' : 'Light this lull\'s fire first'}</small></span><b></b></div>`);
  el.innerHTML = `<h4>糧餉 · Quartermaster · 銀 ${B.silver}</h4>${rows.join('')}<div class="ft">Hired companies march up the south road to you. I or Esc to close.</div>`;
}
window.addEventListener('keydown', (e) => {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.beacon || state.screen !== 'game' || state.ended) return;
  if (e.code === 'KeyI') { beaconShop(!BCN.open); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (!BCN.open) return;
  if (e.code === 'Escape') { beaconShop(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
  const m = /^Digit([1-8])$/.exec(e.code); if (!m) return;
  Input.cmds.push([0, S.BEACON.ORD_BUY, +m[1] - 1, 0, 0, 0]); e.preventDefault(); e.stopImmediatePropagation();
}, true);
// ---- per frame: notices, the fire stoves and their smoke ----
function beaconVisuals(sim) {
  const R = state.renderer; if (!R || !R.scene || typeof THREE === 'undefined') return null; const K = S.BEACON;
  const grp = new THREE.Group(); R.scene.add(grp); const stoves = [];
  const earth = new THREE.MeshLambertMaterial({ color: 0x8a7a62 }), soot = new THREE.MeshLambertMaterial({ color: 0x2a2420 });
  for (let i = 0; i < K.NFIRE; i++) { const x = K.STOVES.x - 4 + i * 2, z = K.STOVES.z + 0.4, y = S.terrainH(x, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.1, 8), earth); base.position.set(x, y + 0.55, z); base.castShadow = true; base.receiveShadow = true; grp.add(base);
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 8), soot); mouth.position.set(x, y + 1.12, z); grp.add(mouth);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.4, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); fl.position.set(x, y + 1.8, z); fl.visible = false; grp.add(fl);
    const sm = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.5, 34, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a3632, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })); sm.position.set(x, y + 18.5, z); sm.visible = false; grp.add(sm);
    stoves.push({ fl, sm, y, seed: i * 1.7 }); }
  // the tower itself (a solid rammed-earth 墩台): a crenellated parapet, a watch hut, the garrison's flag and the rope ladder
  { const T = { x: -9, z: -12, hw: 3, h: 9 }, y0 = S.terrainH(T.x, T.z) + T.h, wall = new THREE.MeshLambertMaterial({ color: 0xa49a88 }), red = new THREE.MeshLambertMaterial({ color: 0x8a2a20 }), roof = new THREE.MeshLambertMaterial({ color: 0x3a3a3c }), wood = new THREE.MeshLambertMaterial({ color: 0x5a4028 });
    const box = (m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; grp.add(o); return o; };
    for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) { box(wall, T.x + k * 1.3, y0 + 0.45, T.z + s * (T.hw - 0.15), 0.8, 0.9, 0.3); box(wall, T.x + s * (T.hw - 0.15), y0 + 0.45, T.z + k * 1.3, 0.3, 0.9, 0.8); }
    box(red, T.x + 0.6, y0 + 1.1, T.z + 0.4, 2.4, 2.2, 2.2); const r = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 4), roof); r.rotation.y = Math.PI / 4; r.position.set(T.x + 0.6, y0 + 2.75, T.z + 0.4); grp.add(r);
    box(wood, T.x - 1.8, y0 + 3, T.z - 1.8, 0.12, 6, 0.12); const fl = box(new THREE.MeshLambertMaterial({ color: 0xc23a2a, side: THREE.DoubleSide }), T.x - 1.8 + 0.8, y0 + 5.2, T.z - 1.8, 1.5, 1.1, 0.04);
    for (let k = 0; k < 2; k++) box(wood, T.x - 0.5 + k, S.terrainH(T.x, T.z - T.hw) + T.h / 2, T.z - T.hw - 0.12, 0.07, T.h, 0.07);
    for (let k = 0; k < 12; k++) box(wood, T.x, S.terrainH(T.x, T.z - T.hw) + 0.5 + k * 0.72, T.z - T.hw - 0.12, 1.0, 0.06, 0.06);
    return { grp, stoves, flag: fl }; }
}
function beaconFrame() {
  requestAnimationFrame(beaconFrame);
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.beacon) { if (BCN.open) beaconShop(false); return; }
  if (BCN.sim !== sim) { BCN.sim = sim; BCN.fires = -1; BCN.stage = ''; BCN.log = 0; BCN.vis = null; BCN.lastN = 0; }
  const B = sim.bc; const m = $('mobj'); if (m) m.style.display = 'none';
  if (!BCN.vis && state.renderer && state.renderer.scene) BCN.vis = beaconVisuals(sim);
  if (BCN.vis) { const now = performance.now() / 1000; BCN.vis.stoves.forEach((s, i) => { const on = !!B && i < B.fires; s.fl.visible = on; s.sm.visible = on;
      if (BCN.vis.flag) BCN.vis.flag.rotation.y = Math.sin(now * 1.3) * 0.25;
      if (on) { s.fl.scale.set(1 + Math.sin(now * 9 + s.seed) * 0.12, 1 + Math.sin(now * 13 + s.seed) * 0.2, 1); s.sm.rotation.y = now * 0.15 + s.seed; s.sm.material.opacity = 0.26 + Math.sin(now * 0.7 + s.seed) * 0.05; } }); }
  if (!B) return;
  if (BCN.fires >= 0 && B.fires > BCN.fires) { banner(['一炬', '二炬', '三炬', '四炬', '五炬'][B.fires - 1] + ' · The ' + bcOrd(B.fires) + ' fire', B.fires >= S.BEACON.NFIRE ? 'Five fires! Liaoyang will send its horse' : 'The next tower will see it. +10 silver', 3.5); AUDIO.play('ui'); }
  BCN.fires = B.fires;
  if (BCN.stage && B.stage !== BCN.stage) {
    if (B.stage === 'wave') { banner(`第${'一二三四五六七'[B.n - 1] || B.n}陣 · Raid ${B.n}`, 'Riders on the horizon. Hold the tower', 3); if (typeof MUSIC !== 'undefined' && MUSIC.accent) MUSIC.accent('wave'); if (BCN.open) beaconShop(false); }
    else if (B.stage === 'final') { banner('大舉 · The last assault', 'Beile Amin comes himself. Hold until the relief arrives', 4); if (typeof MUSIC !== 'undefined' && MUSIC.accent) MUSIC.accent('breach'); }
    else if (B.stage === 'lull') toast(B.fires < S.BEACON.NFIRE ? 'The raid draws off. +10 silver. Light the next fire, hire men (I)' : 'The raid draws off. +10 silver'); }
  if (B.relief && !BCN.relief) { BCN.relief = true; banner('援兵 · The relief', 'Guanning horse on the south road!', 3.5); }
  if (!B.relief) BCN.relief = false;
  BCN.stage = B.stage;
  if (B.log.length && B.log[B.log.length - 1][0] !== BCN.log) { const L = B.log[B.log.length - 1]; BCN.log = L[0];
    if (L[4] === 'ready') toast('Ready. The raid comes on in three seconds'); else if (L[1] === state.localIdx) { if (!L[3]) toast(L[4] === 'none' ? 'The road has no more of those to send' : L[4] === 'fire' ? 'Light the fire first' : 'Not enough silver'); else if (L[2] === S.BEACON.SHOP.length) toast('Your men are bound up and fed'); }
    beaconShopDraw(); }
  BCN.t -= 1 / 60; if (BCN.t <= 0) { BCN.t = 0.25; beaconShopDraw(); }
}
requestAnimationFrame(beaconFrame);
