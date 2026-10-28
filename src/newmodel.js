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
  const NM = { dirt: new Map(), helping: new Set(), ragMen: new Map(), dying: new Map(), ok: false, men: new Map(), pool: [], touched: null, lastOrder: [] };
  window.NEWMODEL = NM;
  if (!window.RIG || !THREE.GLTFLoader) { console.warn('new model: rig.js or GLTFLoader missing'); return; }
  // F6: grime on or off (remembered)
  try { if (localStorage.getItem('ming_grime') === '0') RIG.GRIME.uOn.value = 0; } catch (e) {}
  window.addEventListener('keydown', (e) => { if (e.code !== 'F6') return; e.preventDefault(); RIG.GRIME.uOn.value = RIG.GRIME.uOn.value ? 0 : 1; try { localStorage.setItem('ming_grime', RIG.GRIME.uOn.value ? '1' : '0'); } catch (er) {} });
  new THREE.GLTFLoader().load(window.MING_NEWMODEL_URL || '../model/man.glb', (g) => { RIG.analyse(g); RIG.prewarm(); NM.ok = true; }, undefined, (e) => console.warn('new model: man.glb', e));

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
    lit(r, m); m.anim.dead = false; m.anim.down = false; m.anim.rx.a = m.anim.rx.v = 0; m.anim.rx.o.set(0, 0, 0); m.anim.rx.ov.set(0, 0, 0); m.groundAt = (gx, gz) => S.terrainH(gx, gz); m.root.visible = true; m.anim.revive(); m.anim.os.forEach(e => e.a.stop()); m.anim.os = []; m.anim.one = null; m.anim.chain = null; m.unit = u.id; m.lastW = u.windupId; m.lastSt = u.st; m.px = u.x; m.pz = u.z; m.sp = 0;
    NM.men.set(u.id, m); return m;
  }
  function give(id) { const m = NM.men.get(id); if (!m) return; NM.men.delete(id); retire(m); }

  // ---- the cut he makes: chosen by the game's own blow (its line, heavy or light, the step of a combo, a lunge, a riposte, a
  // champion's sweep) and by his weapon, so no two blows in a row look alike; side and weight drive the trunk's load and follow-through
  function cutFor(u, m) { const d = u.atkDir, n = u.cbN || 0, hv = !!(u.heavy || u.aiHeavy || u.cbHeavy), h = hash(u.id + (u.windupId || 0), 7);
    if (m.wpnKey === 'gun') return { name: hv ? 'Sword_Heavy_A' : 'Sword_Heavy_B', side: 1, pow: 1.3 }; /* a gun turned round, swung like a club */
    if (u.lunge) return { name: 'Sword_Dash', side: 0.4, pow: 1.3 };
    if (u.counterT > 0) return m.wpnKey === 'shield' ? { name: 'Shield_OneShot', side: 0.6, pow: 1.2 } : { name: 'Sword_UpperCut', side: -0.6, pow: 1.2 };
    if (u.champ && u.spinT > 0) return { name: h < 0.5 ? 'Sword_Regular_Combo' : 'Sword_Light_Combo', side: 1, pow: 1.4 };
    if (d === DIR_UP) return hv ? { name: h < 0.5 ? 'Sword_Heavy_A' : 'Sword_Heavy_B', side: 0.3, pow: 1.5 } : { name: ['Sword_Regular_C', 'Sword_Heavy_B', 'Sword_Regular_C'][n % 3], side: 0.4, pow: 1.1 };
    if (d === DIR_DOWN) return { name: hv ? 'Sword_Dash' : ['Sword_Light_C', 'Sword_UpperCut'][n % 2], side: -0.3, pow: hv ? 1.4 : 1 };
    if (d === DIR_LEFT) return { name: hv ? 'Sword_Heavy_B' : ['Sword_Regular_B', 'Sword_Light_B'][n % 2], side: -1, pow: hv ? 1.5 : 1 };
    return { name: hv ? 'Sword_Heavy_A' : ['Sword_Regular_A', 'Sword_Light_A', 'Sword_Regular_A'][n % 3], side: 1, pow: hv ? 1.5 : 1 }; }
  const brushOf = (u) => u.weapon === 'yari' && ((u.kitRole !== undefined ? u.kitRole : u.role) === 'brush' || !!(u.def && u.def.brush));

  // ---- one man's frame: his place, his travel, his state; then he is posed at once, so he is never drawn unposed
  function drive(r, m, u, x, y, z, yaw, dt) {
    const A = m.anim; m.root.position.set(x, y, z); { let d = yaw - (m.vyaw === undefined ? yaw : m.vyaw); d -= Math.PI * 2 * Math.round(d / (Math.PI * 2)); m.vyaw = (m.vyaw === undefined ? yaw : m.vyaw) + d * Math.min(1, dt * 16); m.root.rotation.y = m.vyaw; } /* his facing eased a touch: the game turns a fighter sharply */
    const vx = (x - m.px) / Math.max(dt, 1e-3), vz = (z - m.pz) / Math.max(dt, 1e-3); m.px = x; m.pz = z; const sp = Math.min(9, Math.hypot(vx, vz)); m.sp += (sp - m.sp) * Math.min(1, dt * 8);
    A.speed = m.sp; if (sp > 0.6) { /* the way he moves is only trusted once he is really moving: at a creep it is noise */ const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw); A.ang = Math.atan2(vx * lx + vz * lz, vx * fx + vz * fz); }
    const sq = u.squad >= 0 ? r.sim.squads[u.squad] : null, routing = !!(sq && sq.routing);
    // down and up again; the man who hauls him up kneels to it
    if (u.downed && !A.down) A.wound(); else if (!u.downed && A.down) A.rise();
    if (A.down) return;
    A.hold = NM.helping.has(u.id) ? 'Fixing_Kneeling' : null;
    // the cut: started at the wind-up, timed so the blade meets the line when the game releases it
    if (u.st === ST_WINDUP && u.windupId !== m.lastW) { m.lastW = u.windupId;
      if (m.wpnKey === 'dao' || m.wpnKey === 'shield' || (m.wpnKey === 'gun' && (u.club || u.ctrl < 0))) {
        const wd = u.ctrl >= 0 && !u.amK ? (u.cbFast ? 0.2 : (u.heavy || u.cbHeavy) ? 0.4 : 0.28) : Math.min(1.1, (u.def.windup || 0.4) * (u.aiHeavy ? 1.9 : 1) * (u.wMul || 1));
        const C = cutFor(u, m), clip = RIG.BODY.clips[C.name] ? C.name : 'Sword_Regular_A', dur = RIG.BODY.clips[clip].duration; A.cut(clip, Math.max(0.7, Math.min(1.6, 0.4 * dur / (wd + RELEASE_LEAD))), C.side, C.pow); } }
    if (m.wpnKey === 'spear' && u.st === ST_RELEASE && m.lastSt !== ST_RELEASE) { if (brushOf(u)) A.sweep(); else A.thrust({ h: u.atkDir === DIR_UP ? 0.3 : u.atkDir === DIR_DOWN ? -0.22 : 0, k: (u.heavy || u.aiHeavy || u.lunge) ? 1.45 : 1, flurry: (u.cbN || 0) > 0 }); }
    if (u.st === ST_KICK && m.lastSt !== ST_KICK) A.play(hash(u.id, 13) < 0.6 ? 'Kick' : 'Melee_Knee', { expr: 'shout' });
    if (u.st === ST_STUN && m.lastSt !== ST_STUN && !(A.one && /^Hit_/.test(A.one.name))) A.play((u.stunDur || 0) > 0.6 ? 'Hit_Knockback' : 'Hit_Chest', { fade: 0.06, expr: 'pain' });
    // shooting: the gun up at the cheek while he aims, the kick of the shot, the ramrod; the bow drawn and loosed
    const aiming = u.st === ST_AIM || !!u.aiming;
    if (m.wpnKey === 'gun') { if (m.wasAim && !aiming && u.st !== ST_IDLE) A.impulse(new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), 0.45, false); A.aimOn = aiming; A.reloadOn = u.st === ST_RELOAD; }
    if (m.wpnKey === 'bow') { if (m.wasAim && !aiming) A.play('Bow_Shoot', { fade: 0.05 }); A.hold = A.hold || (aiming ? 'Bow_Aim_Neutral' : u.st === ST_RELOAD ? 'Bow_Notch' : null); }
    m.wasAim = aiming; m.lastSt = u.st;
    A.block(!!u.blocking && u.st === ST_IDLE); A.blockDir = u.blockDir === DIR_LEFT ? 'L' : u.blockDir === DIR_RIGHT ? 'R' : u.blockDir === DIR_UP ? 'U' : 'F';
    { const hot = !routing && (u.st !== ST_IDLE || !!u.blocking || (u.target >= 0 && m.wpnKey !== 'gun' && m.wpnKey !== 'bow')); m.hotT = hot ? 3 : Math.max(0, (m.hotT || 0) - dt); A.combat = !routing && m.hotT > 0; A.keepCombat = A.combat; } /* the guard is kept a few seconds once a fight has touched him: no flicker between idle and guard */
    A.idle = (u.fat || 0) > 70 ? 'Idle_Tired_Loop' : A.idle === 'Idle_Tired_Loop' ? 'Idle_Loop' : A.idle;
    // his dirt: the field's dust and mud build through the battle; a fall puts him in the mud; every blow he took shows
    const D = NM.dirt.get(u.id) || { b: 0, m: 0 }; NM.dirt.set(u.id, D); if (u.downed) D.m = Math.min(1, D.m + dt * 0.5);
    const T = r.sim.tick / 30; m.setGrime(0.3 + Math.min(0.5, T / 400) + 0.1 * hash(u.id, 9), 0.15 + Math.min(0.45, T / 500) + D.m, D.b);
    // he watches the man he fights; a routing man looks back over his shoulder
    const t = u.target >= 0 ? r.sim.units[u.target] : null;
    if (routing) A.look = (r.sim.tick + u.id * 7) % 90 < 30 ? new THREE.Vector3(x - Math.sin(yaw) * 5, y + 1.5, z - Math.cos(yaw) * 5) : null;
    else A.look = t && !t.dead && Math.hypot(t.x - x, t.z - z) < 12 ? new THREE.Vector3(t.x, t.y + 1.5, t.z) : (A.orderT > 0 ? A.look : null);
  }
  const RELEASE_LEAD = 0.06;
  const clampDt = (d) => Math.min(0.05, d || 1 / 60);

  // ---- the frame
  // men made ahead of need, two a frame, for the kits on this field, and every material compiled once: a man walking into the
  // near field, a helmet knocked off, a first block, never stall a frame
  function warm(r) { if (NM.warmDone) return; if (window.NM_NOWARM) { NM.warmDone = true; return; } /* (tests on software rendering skip it) */ if (!NM.warmList) { const seen = new Map(); for (const u of r.sim.units) if (eligible(u)) { const k = kitOf(u, r.sim), key = k.set + '|' + k.wpn; seen.set(key, (seen.get(key) || 0) + 1); }
      NM.warmList = []; for (const [key, n] of [...seen].sort((a, b) => b[1] - a[1])) for (let i = 0; i < Math.min(6, Math.ceil(n / 4)); i++) NM.warmList.push(key); NM.warmList = NM.warmList.slice(0, CAP); }
    for (let i = 0; i < 2 && NM.warmList.length; i++) { const key = NM.warmList.shift(), [set, wpn] = key.split('|'); const m = new RIG.Man(set, wpn, r.scene); m.key = key; for (const s of m.meshes) s.castShadow = false; lit(r, m); m.root.visible = false; m.unit = -1; NM.pool.push(m);
      if (!NM.compiled) NM.compiled = new Set(); if (!NM.compiled.has(set)) { NM.compiled.add(set); m.root.visible = true; m.root.position.set(0, -50, 0); try { r.renderer.compile(r.scene, r.camera); } catch (e) {} m.root.visible = false; } }
    if (!NM.warmList.length) NM.warmDone = true; }
  const render0 = R.render;
  R.render = function (alpha, dt, view) {
    NM.touched = NM.ok ? new Set() : null; NM.n = 0; this._nmDt = clampDt(dt);
    if (NM.ok) { warm(this); NM.helping.clear(); for (const v of this.sim.units) if (v.downed && !v.dead && v.reviveBy >= 0) NM.helping.add(v.reviveBy); RIG.stepLoose(this._nmDt); }
    const out = render0.call(this, alpha, dt, view);
    if (!NM.ok) return out;
    for (const id of [...NM.men.keys()]) if (!NM.touched.has(id)) give(id);
    // orders: the squad leader points the way into a charge, raises his arm to hold or to give fire
    const sim = this.sim; for (let i = 0; i < sim.squads.length; i++) { const sq = sim.squads[i], o = sq.order; if (o !== NM.lastOrder[i] && sq.alive && NM.lastOrder[i] !== undefined) { const m = NM.men.get(sq.unitIds[0]);
        if (m && o === ORD_CHARGE && sq.tx !== undefined) m.anim.order(new THREE.Vector3(sq.tx, (m.root.position.y || 0) + 0.8, sq.tz), 2.2); else if (m && (o === S.ORD_HOLD || o === S.ORD_FIRE)) m.anim.raise(1.6); } NM.lastOrder[i] = o; }
    // the dead whose ragdoll has gone (sunk away, or taken for another man) are given back
    for (const [rag, m] of [...NM.ragMen]) if (!rag.active || !rag.unit || rag.unit.id !== m.ragUnit) { NM.ragMen.delete(rag); retire(m); }
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
    drive(this, m, u, x, y, z, yaw, this._nmDt); m.update(this._nmDt); /* posed now, before this frame is drawn: a man newly taken never shows his bind pose */
  };
  function retire(m) { m.root.visible = false; m.unit = -1; m.ragUnit = -1; m.rearm(); if (NM.pool.length < CAP + 10) NM.pool.push(m); else m.dispose(); }
  // ---- blows and deaths
  const ev0 = R.processEvents;
  R.processEvents = function (events) {
    const deaths = [];
    if (NM.ok) for (const ev of events) {
      if (ev.t === 'hit' && !ev.killed) { const m = NM.men.get(ev.id), a = ev.att >= 0 ? this.sim.units[ev.att] : null, v = this.sim.units[ev.id];
        if (m && v) { let dx = a ? v.x - a.x : 0, dz = a ? v.z - a.z : 1; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
          const melee = ev.cause === 'melee' || ev.cause === 'trample' || ev.cause === 'spear', shot = ev.cause === 'shot' || ev.cause === 'headshot' || ev.cause === 'arrow', heavyB = !!(a && (a.heavy || a.lunge)) || (ev.dmg || 0) >= 60;
          const k = v.def ? Math.max(0.3, Math.min(1.5, (ev.dmg || 20) / Math.max(40, v.def.hp * 0.5))) * (heavyB ? 1.35 : 1) : 0.6;
          m.anim.impulse(new THREE.Vector3(dx, 0, dz), k * (shot ? 0.7 : 1), heavyB); /* thrown and bent away from the blow, as the old figures were */
          let side = 'F'; if (a) { const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw), f = -dx * fx - dz * fz, l = -dx * lx - dz * lz; side = a.atkDir === DIR_UP ? 'U' : a.atkDir === DIR_DOWN ? 'D' : Math.abs(l) > Math.abs(f) * 0.5 ? (l > 0 ? 'L' : 'R') : 'F'; }
          if (melee || shot) m.anim.hit(shot ? 'F' : side, heavyB && melee);
          if (ev.cause === 'headshot' || (shot && ev.y > v.y + 1.55)) { const hv = new THREE.Vector3(dx * 2.5, 2.5, dz * 2.5); m.dropHelmet(hv); } } /* a ball to the head takes the helmet off */
        /* (no bite-drag on the attacker's swing: a hit stop on men who are nothing to do with the player) */
        const D = NM.dirt.get(ev.id) || { b: 0, m: 0 }; D.b = Math.min(1, D.b + 0.22); NM.dirt.set(ev.id, D); }
      if (ev.t === 'block') { const m = NM.men.get(ev.by); if (m) m.anim.impulse(new THREE.Vector3(-Math.sin(m.root.rotation.y), 0, -Math.cos(m.root.rotation.y)), ev.perfect ? 0.2 : 0.45, false); }
      if (ev.t === 'death') { const m = NM.men.get(ev.id), u = this.sim.units[ev.id]; if (m && u && ev.cause !== 'fled') { NM.men.delete(ev.id); deaths.push({ m, u, ev, x: u.x, y: u.y, z: u.z }); } }
    }
    NM.suppress = deaths.length ? deaths : null;
    const out = ev0.call(this, events); NM.suppress = null;
    for (const d of deaths) { const rag = this.ragdolls.find(r => r.active && r.unit === d.u && r.age === 0);
      if (rag) { bindRag(rag, d.m, d.ev); } else { d.m.anim.play('Hit_Stomach', { fade: 0.06, force: true, expr: 'pain', then: () => d.m.anim.play('Death02', { fade: 0.3, force: true, ts: 0.55, then: () => {} }) }); d.m.anim.dead = true; NM.dying.set(d.u.id, d.m); } } /* an arrow: he clutches it and goes down slowly, until the ragdoll takes him */
    return out;
  };
  function heavyB0(a, ev) { return !!(a.heavy || a.lunge) || (ev.dmg || 0) >= 60; }
  function bindRag(rag, m, ev) { m.ragUnit = rag.unit.id; NM.ragMen.set(rag, m); m.anim.dead = true;
    if (rag.hatOff) m.dropHelmet(new THREE.Vector3((ev.ix || 0) * 0.5 + (Math.random() - 0.5) * 2, 3 + Math.random() * 3 + Math.max(0, ev.iy || 0) * 0.3, (ev.iz || 0) * 0.5 + (Math.random() - 0.5) * 2));
    m.dropWeapon(new THREE.Vector3((ev.ix || 0) * 0.3 + (Math.random() - 0.5) * 2, 2 + Math.random() * 2, (ev.iz || 0) * 0.3 + (Math.random() - 0.5) * 2)); }
  // the game's own hat and weapon debris for a man of ours is not thrown (his own helmet and weapon fly instead)
  const sd0 = R.spawnDebris;
  R.spawnDebris = function (kind, x, y, z) { if (NM.suppress) for (const d of NM.suppress) if (Math.abs(x - d.x) < 0.8 && Math.abs(z - d.z) < 0.8 && (Math.abs(y - (d.y + 1.75)) < 1e-3 || Math.abs(y - (d.y + 1.6)) < 1e-3 || Math.abs(y - (d.y + 1.1)) < 1e-3)) return; return sd0.apply(this, arguments); };
  const rag0 = R.drawRagdoll;
  R.drawRagdoll = function (rag) {
    if (NM.ok && rag.unit) { let m = NM.ragMen.get(rag); if (!m && NM.dying.has(rag.unit.id)) { m = NM.dying.get(rag.unit.id); NM.dying.delete(rag.unit.id); bindRag(rag, m, { ix: 0, iy: 0, iz: 0 }); }
      if (m) { this.hideFigure(rag.slot); m.root.visible = true; RIG.poseRag(m, rag.p, this._nmDt); return; } }
    return rag0.call(this, rag); };
  const dying0 = R.dyingDraw;
  if (dying0) R.dyingDraw = function (i, u, dt) { const m = NM.ok && NM.dying.get(u.id); if (m) { this.hideFigure(i); m.root.position.set(u.x, u.y, u.z); m.update(clampDt(dt)); return; } return dying0.call(this, i, u, dt); };
})();
