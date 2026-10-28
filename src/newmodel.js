// ============================================================================
// 新寫實 · New Realism: the Realism game with the new soldier (model/rig.js: cut-block men on the 65-bone rig, wearing armour
// that cannot clip). Only active when window.MING_NEWMODEL is set and model/rig.js and man.glb have loaded.
//
// Near field: the foot soldiers nearest the camera (within NEAR metres, at most CAP of them) are drawn as rigged men, driven
// by the game's own state each frame; everyone further out stays on the instanced figures, so a great battle still runs.
// A man taken into the near field leaves the instanced figure hidden for his slot; given back, the figure returns.
// What drives the rig (all read, never written: the simulation and its lockstep are untouched):
//   travel (from his last two positions: speed and its angle off his facing), wind-up (a cut timed to land at the game's
//   release), a spear thrust or a gun at the shoulder, the guard, a blow taken (on the side it came from), the kick, going
//   down wounded and being got up, death (he falls where he stood, in place of the ragdoll, and lies there a while), the
//   bow drawn, and the squad leader pointing the way when his squad is ordered to charge.
// ============================================================================
(function () {
  if (typeof window === 'undefined' || !window.MING_NEWMODEL || typeof RENDER === 'undefined') return;
  const R = RENDER.Renderer.prototype, S = SIM;
  const { ST_IDLE, ST_WINDUP, ST_RELEASE, ST_RECOVER, ST_STUN, ST_AIM, ST_KICK, ST_RELOAD, DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT, ORD_CHARGE } = S;
  const NEAR = 32, CAP = 40, CORPSE_T = 30, CORPSE_CAP = 24;
  const NM = { dirt: new Map(), ok: false, men: new Map(), pool: [], corpses: [], touched: null, lastOrder: [] };
  window.NEWMODEL = NM;
  if (!window.RIG || !THREE.GLTFLoader) { console.warn('new model: rig.js or GLTFLoader missing'); return; }
  // F6: grime on or off (remembered)
  try { if (localStorage.getItem('ming_grime') === '0') RIG.GRIME.uOn.value = 0; } catch (e) {}
  window.addEventListener('keydown', (e) => { if (e.code !== 'F6') return; e.preventDefault(); RIG.GRIME.uOn.value = RIG.GRIME.uOn.value ? 0 : 1; try { localStorage.setItem('ming_grime', RIG.GRIME.uOn.value ? '1' : '0'); } catch (er) {} });
  new THREE.GLTFLoader().load(window.MING_NEWMODEL_URL || '../model/man.glb', (g) => { RIG.analyse(g); NM.ok = true; }, undefined, (e) => console.warn('new model: man.glb', e));

  const hash = (id, k) => { let h = (id * 374761393 + k * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // ---- who wears what: the faction from the game (team 0, or a Ming look, is Ming), the kit from his weapon and place
  function kitOf(u, sim) {
    const ming = u.team === 0 || !!(u.look && u.look.ming), sq = u.squad >= 0 ? sim.squads[u.squad] : null, lead = sq && sq.unitIds[0] === u.id, w = u.weapon, h = hash(u.id, 5);
    const wpn = w === 'yari' ? 'spear' : w === 'bow' ? 'bow' : w === 'rifle' ? 'gun' : u.def && u.def.shield ? 'shield' : 'dao';
    let set;
    if (ming) {
      if (u.type === 'hero') set = 'ming_shanwen';
      else if (lead) set = h < 0.5 ? 'ming_lamellar' : 'ming_scale';
      else if (wpn === 'shield') set = h < 0.6 ? 'qi_rattan' : 'ming_robe';
      else if (wpn === 'gun') set = h < 0.55 ? 'ming_studded' : h < 0.8 ? 'ming_jacket' : 'ming_paper';
      else if (wpn === 'bow') set = h < 0.5 ? 'ming_jacket' : 'ming_robe';
      else if (wpn === 'spear') set = h < 0.6 ? 'ming_studded' : h < 0.85 ? 'ming_jacket' : 'ming_mail';
      else set = h < 0.5 ? 'ming_studded' : h < 0.75 ? 'ming_mail' : 'ming_jacket';
    } else {
      if (u.look && u.look.jin === 'fur') set = 'mongol';
      else set = ['jin_yellow', 'jin_white', 'jin_blue_b', 'jin_red'][((u.squad >= 0 ? u.squad : u.id) * 7 + 3) % 4];
    }
    return { set, wpn };
  }
  const eligible = (u) => u && !u.dead && !u.inactive && u.type !== 'horse' && !u.mounted && !(u.mount >= 0) && u.def && u.def.ai !== 'cannon' && u.weapon !== 'gatling' && u.weapon !== 'cannon';

  // the field's sky, for armour and helmets to reflect (the scene has none: without it every metal goes black, and the new men
  // stood darker than the old figures beside them)
  function envOf(r) { if (NM.env) return NM.env; const es = new THREE.Scene(), geo = new THREE.SphereGeometry(10, 24, 12), col = [], P = geo.attributes.position, top = new THREE.Color(0xb4bcc4), hor = new THREE.Color(0xd8d0c0), low = new THREE.Color(0x6a5c48), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 10; if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(low, Math.min(1, -y * 3)); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); es.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }))); const pm = new THREE.PMREMGenerator(r.renderer); NM.env = pm.fromScene(es, 0.03).texture; pm.dispose(); return NM.env; }
  function lit(r, m) { const env = envOf(r); const fix = (mat) => { if (!mat || !mat.isMeshStandardMaterial || mat.userData.nmLit) return; mat.envMap = env; mat.envMapIntensity = 1.15; mat.userData.nmLit = true; mat.needsUpdate = true; };
    for (const s of m.meshes) fix(s.material); m.root.traverse(o => { if (o.isMesh) fix(o.material); }); }
  function take(r, u) {
    const k = kitOf(u, r.sim), key = k.set + '|' + k.wpn; let m = null;
    const i = NM.pool.findIndex(p => p.key === key); if (i >= 0) { m = NM.pool[i]; NM.pool.splice(i, 1); }
    else { m = new RIG.Man(k.set, k.wpn, r.scene); m.key = key; for (const s of m.meshes) { s.castShadow = false; } } /* the realism edition's men throw an ink drop, not a shadow-map shade */
    lit(r, m); m.groundAt = (gx, gz) => S.terrainH(gx, gz); m.root.visible = true; m.anim.revive(); m.anim.os.forEach(e => e.a.stop()); m.anim.os = []; m.anim.one = null; m.anim.chain = null; m.unit = u.id; m.lastW = u.windupId; m.lastSt = u.st; m.px = u.x; m.pz = u.z; m.sp = 0;
    NM.men.set(u.id, m); return m;
  }
  function give(id) { const m = NM.men.get(id); if (!m) return; NM.men.delete(id); m.root.visible = false; m.unit = -1; if (NM.pool.length < CAP + 10) NM.pool.push(m); else m.dispose(); }

  // ---- one man's frame: his place, his travel, his state
  function drive(r, m, u, x, y, z, yaw, dt) {
    const A = m.anim; m.root.position.set(x, y, z); m.root.rotation.y = yaw;
    const vx = (x - m.px) / Math.max(dt, 1e-3), vz = (z - m.pz) / Math.max(dt, 1e-3); m.px = x; m.pz = z; const sp = Math.min(9, Math.hypot(vx, vz)); m.sp += (sp - m.sp) * Math.min(1, dt * 8);
    A.speed = m.sp; if (sp > 0.15) { const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw); A.ang = Math.atan2(vx * lx + vz * lz, vx * fx + vz * fz); }
    // down and up again
    if (u.downed && !A.down) A.wound(); else if (!u.downed && A.down) A.rise();
    if (A.down) return;
    // the cut: started at the wind-up, timed so the blade meets the line when the game releases it
    if (u.st === ST_WINDUP && u.windupId !== m.lastW) { m.lastW = u.windupId;
      if (m.wpnKey === 'spear') { /* the spear is thrust at the release */ }
      else if (m.wpnKey === 'dao' || m.wpnKey === 'shield') {
        const wd = u.ctrl >= 0 && !u.amK ? (u.cbFast ? 0.2 : (u.heavy || u.cbHeavy) ? 0.4 : 0.28) : Math.min(1.1, (u.def.windup || 0.4) * (u.aiHeavy ? 1.9 : 1) * (u.wMul || 1));
        const key = A.chain && A.one && A.one.attack ? A.chain : u.atkDir === DIR_UP ? 'po' : u.atkDir === DIR_LEFT ? 'duanda' : u.atkDir === DIR_DOWN ? (hash(u.id + u.windupId, 3) < 0.5 ? 'fan' : 'chong') : 'lianhuan';
        const clip = RIG.CHAINS[key].steps[0], dur = RIG.BODY.clips[clip] ? RIG.BODY.clips[clip].duration : 1; A.atkTS = Math.max(0.6, Math.min(2.2, 0.4 * dur / (wd + RELEASE_LEAD)));
        A.attack(key); } }
    if (m.wpnKey === 'spear' && u.st === ST_RELEASE && m.lastSt !== ST_RELEASE) A.thrust();
    if (u.st === ST_KICK && m.lastSt !== ST_KICK) A.play('Kick', { expr: 'shout' });
    m.lastSt = u.st;
    A.block(!!u.blocking && u.st === ST_IDLE);
    // shooting: the gun up at the cheek while he aims, the bow drawn
    A.aimOn = m.wpnKey === 'gun' && (u.st === ST_AIM || !!u.aiming);
    if (m.wpnKey === 'bow') A.hold = u.st === ST_AIM ? 'Bow_Aim_Neutral' : u.st === ST_RELOAD ? 'Bow_Notch' : null;
    A.combat = u.st !== ST_IDLE || !!u.blocking || (u.target >= 0 && m.wpnKey !== 'gun' && m.wpnKey !== 'bow'); A.keepCombat = A.combat;
    // his dirt: the field's dust and mud build through the battle; a fall puts him in the mud; every blow he took shows
    const D = NM.dirt.get(u.id) || { b: 0, m: 0 }; NM.dirt.set(u.id, D); if (u.downed) D.m = Math.min(1, D.m + dt * 0.5);
    const T = r.sim.tick / 30; m.setGrime(0.3 + Math.min(0.5, T / 400) + 0.1 * hash(u.id, 9), 0.15 + Math.min(0.45, T / 500) + D.m, D.b);
    // he watches the man he fights
    const t = u.target >= 0 ? r.sim.units[u.target] : null; A.look = t && !t.dead && Math.hypot(t.x - x, t.z - z) < 12 ? new THREE.Vector3(t.x, t.y + 1.5, t.z) : (A.orderT > 0 ? A.look : null);
  }
  const RELEASE_LEAD = 0.06;

  // ---- the frame: the original renderer draws (with our men's slots kept off its figures), then the men are moved on
  const render0 = R.render;
  R.render = function (alpha, dt, view) {
    NM.touched = NM.ok ? new Set() : null; NM.n = 0; this._nmDt = dt || 1 / 60;
    const out = render0.call(this, alpha, dt, view);
    if (!NM.ok) return out;
    for (const id of [...NM.men.keys()]) if (!NM.touched.has(id)) give(id);
    // the squad leader points the way when his squad is sent in
    const sim = this.sim; for (let i = 0; i < sim.squads.length; i++) { const sq = sim.squads[i], o = sq.order; if (o === ORD_CHARGE && NM.lastOrder[i] !== ORD_CHARGE && sq.alive) { const m = NM.men.get(sq.unitIds[0]); if (m && sq.tx !== undefined) m.anim.order(new THREE.Vector3(sq.tx, (m.root.position.y || 0) + 0.8, sq.tz), 2.2); } NM.lastOrder[i] = o; }
    const d = Math.min(0.05, dt || 1 / 60);
    for (const m of NM.men.values()) m.update(d);
    for (let i = NM.corpses.length - 1; i >= 0; i--) { const c = NM.corpses[i]; c.t += d; if (c.t < 4) c.m.update(d); if (c.t > CORPSE_T) { c.m.root.visible = false; c.m.unit = -1; NM.corpses.splice(i, 1); if (NM.pool.length < CAP + 10) NM.pool.push(c.m); else c.m.dispose(); } }
    return out;
  };
  const draw0 = R.drawFigure;
  R.drawFigure = function (slot, u, x, y, z, yaw, alpha, hide) {
    if (!NM.ok || hide || slot >= this.sim.units.length || (this.studio && slot === this.studio.id) || !eligible(u)) { if (NM.men.has(u && u.id)) give(u.id); return draw0.call(this, slot, u, x, y, z, yaw, alpha, hide); }
    const cp = this.camera.position, dd = (x - cp.x) * (x - cp.x) + (z - cp.z) * (z - cp.z);
    let m = NM.men.get(u.id);
    if (!m && (dd > NEAR * NEAR || NM.n >= CAP)) return draw0.call(this, slot, u, x, y, z, yaw, alpha, hide);
    if (m && dd > (NEAR + 4) * (NEAR + 4)) { give(u.id); return draw0.call(this, slot, u, x, y, z, yaw, alpha, hide); } /* a little slack, so a man at the edge does not flicker between the two */
    if (!m) m = take(this, u);
    NM.n++; NM.touched.add(u.id); this.hideFigure(slot);
    drive(this, m, u, x, y, z, yaw, this._nmDt);
  };
  // death: a man of ours falls where he stands and lies there; his ragdoll and his slow arrow-collapse are not drawn
  const ev0 = R.processEvents;
  R.processEvents = function (events) {
    if (NM.ok) for (const ev of events) {
      if (ev.t === 'hit' && !ev.killed) { const m = NM.men.get(ev.id); if (m) { const a = ev.att >= 0 ? this.sim.units[ev.att] : null, v = this.sim.units[ev.id];
        let side = 'F'; if (a) { const dx = a.x - v.x, dz = a.z - v.z, fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw), f = dx * fx + dz * fz, l = dx * lx + dz * lz;
          side = a.atkDir === DIR_UP ? 'U' : a.atkDir === DIR_DOWN ? 'D' : Math.abs(l) > Math.abs(f) * 0.5 ? (l > 0 ? 'L' : 'R') : 'F'; }
        m.anim.hit(side, (ev.dmg || 0) > 40); }
        const D = NM.dirt.get(ev.id) || { b: 0, m: 0 }; D.b = Math.min(1, D.b + 0.22); NM.dirt.set(ev.id, D); }
      if (ev.t === 'death') { const m = NM.men.get(ev.id); if (m && ev.cause !== 'fled') { NM.men.delete(ev.id); m.anim.die(); NM.corpses.push({ m, t: 0, id: ev.id }); if (NM.corpses.length > CORPSE_CAP) { const c = NM.corpses.shift(); c.m.root.visible = false; NM.pool.push(c.m); } } }
    }
    return ev0.call(this, events);
  };
  const corpse = (id) => NM.corpses.some(c => c.id === id);
  const rag0 = R.drawRagdoll;
  R.drawRagdoll = function (rag) { if (NM.ok && rag.unit && corpse(rag.unit.id)) { this.hideFigure(rag.slot); return; } return rag0.call(this, rag); };
  const dying0 = R.dyingDraw;
  if (dying0) R.dyingDraw = function (i, u, dt) { if (NM.ok && corpse(u.id)) { this.hideFigure(i); return; } return dying0.call(this, i, u, dt); };
})();
