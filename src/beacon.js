// ===== 烽火 · Hold the Beacon: a co-op wave-defence mode on a Liaodong border tower (1618) =====
// Loaded after sim.js. It only uses what SIM exports, and the mission machinery (groups, mRelease, mBreak, zones).
// Everything here is deterministic: same seed, same inputs, same result on every peer.
(() => {
  'use strict';
  const S = SIM, P = S.Sim.prototype, PI = Math.PI, HALF = S.HALF, { clamp, len } = DM;
  const ORD_BUY = 21;
  // the five fire stoves along the north wall, and the compound they belong to
  const STOVES = { x: -8, z: 9, r: 4 };
  const SPAWN = { N: [0, 128, PI], E: [128, 26, -PI / 2], W: [-128, 26, PI / 2], NE: [96, 104, -PI * 0.75], NW: [-96, 104, PI * 0.75] };
  // the raiding bands: each is a fixed company of the field, sent again (fresh men, same banners) in later raids
  const BANDS = { A: ['ronin', 'archer'], B: ['samurai', 'archer'], C: ['cavalry', 'byakkotai'], D: ['samurai', 'ashigaru'], E: ['shinsengumi', 'samurai'], F: ['horokutai', 'archer'],
    G: ['cavalry', 'cavalry'], H: ['ashigaru', 'archer'], X1: ['byakkotai'], X2: ['samurai', 'archer'], FIN: ['shinsengumi', 'shinsengumi', 'samurai'] };
  const BNAME = { A: 'Mongol scouts', B: 'Bannermen', C: 'Horse raiders', D: 'Bannermen and pikes', E: 'Bayara guard', F: 'Grenadiers', G: 'Banner horse', H: 'Han Banner pikes', X1: 'Khorchin riders', X2: 'Flank party', FIN: 'Beile Amin' };
  // the raids, each heavier than the last; a raid is a list of [band, approach]
  const WAVES = [
    [['A', 'N']],
    [['B', 'N'], ['A', 'E']],
    [['C', 'E'], ['B', 'W'], ['D', 'N']],
    [['D', 'N'], ['C', 'W'], ['E', 'NE']],
    [['E', 'NW'], ['F', 'E'], ['G', 'W'], ['A', 'N']],
    [['G', 'W'], ['H', 'N'], ['A', 'E'], ['B', 'NE']],
    [['E', 'NE'], ['D', 'N'], ['F', 'W'], ['C', 'E']],
  ];
  const FINAL = [['FIN', 'N'], ['B', 'E'], ['H', 'W'], ['C', 'NE'], ['D', 'NW'], ['G', 'E']];
  // with two or more defenders each raid brings one more party, from another flank
  const EXTRA = [['X1', 'E'], ['X2', 'W'], ['X1', 'N'], ['X2', 'E'], ['X1', 'W'], ['X2', 'NW'], ['X1', 'NE'], ['X2', 'NW']];
  // what the quartermaster can send up from the road: [type, cost, how many companies the road holds]
  const SHOP = [['ashigaru', 25, 2], ['rifle_imp', 35, 2], ['yuanyang', 45, 1], ['rifle_spencer', 40, 1], ['cavalry', 50, 1], ['gatling', 60, 1]];
  const MEND = 20, FALL = 20, WAVE_MAX = 180, NFIRE = 5, LULL = 30, LULL0 = 40, LIGHT = 3, RELIEF_AT = 55;
  const groups = {
    garrison: { team: 0, name: 'Tower garrison', zh: '墩軍', army: ['rifle_imp', 'yuanyang'], at: [0, 0, 0], dir: ['hold', 0, 2], stay: true },
    relief: { team: 0, name: 'Guanning relief', zh: '關寧援兵', army: ['cavalry', 'cavalry', 'cavalry', 'rifle_imp'], at: [0, -132, 0], reserve: true, dir: ['hold', 0, 20] },
  };
  for (const k in BANDS) groups['band' + k] = Object.assign({ team: 1, name: BNAME[k], army: BANDS[k], at: [0, 140, PI], reserve: true }, k === 'FIN' ? { zh: '阿敏', officer: 2.5 } : {});
  SHOP.forEach((it, i) => { for (let k = 0; k < it[2]; k++) groups[`buy${i}_${k}`] = { team: 0, name: 'Road company', army: [it[0]], at: [(i - 2.5) * 10, -76 - k * 12, 0], reserve: true }; });
  // the compound: a palisade square round the tower, gates north, south, east and west
  const PAL = 1.7;
  const forts = [[-9.5, 12, 6.5, 0.5, PAL, 'palisade'], [9.5, 12, 6.5, 0.5, PAL, 'palisade'], [-9.5, -20, 6.5, 0.5, PAL, 'palisade'], [9.5, -20, 6.5, 0.5, PAL, 'palisade'],
    [16, -13.5, 0.5, 6.5, PAL, 'palisade'], [16, 5.5, 0.5, 6.5, PAL, 'palisade'], [-16, -13.5, 0.5, 6.5, PAL, 'palisade'], [-16, 5.5, 0.5, 6.5, PAL, 'palisade'],
    [-9, -12, 3, 3, 9, 'wall'], [9, -13, 3, 2.5, 3.2, 'house'], [-3.5, 13.6, 1.4, 1.1, 1.4, 'mantlet'], [3.5, 13.6, 1.4, 1.1, 1.4, 'mantlet']];
  S.MISSIONS.beacon = {
    title: '烽火 · Hold the Beacon', year: 'Summer 1618', battle: 'field', side: 0, beacon: true, hidden: true, soloExtra: 'ashigaru',
    brief: 'Fushun has fallen. You hold a border tower on the Liaodong wall. Light five fires so Liaoyang sends its cavalry, and keep the tower until it comes.',
    start: [0, -6, 0],
    zones: [{ key: 'tower', x: 0, z: -4, r: 16, name: 'The beacon tower', owner: 0, rate: 0.4 }, { key: 'stoves', x: STOVES.x, z: STOVES.z, r: STOVES.r, name: 'The fire stoves' }],
    forts, groups,
    phases: [{ title: '烽火 · The beacon', text: 'Light the first fire at the stoves by the north wall.', obj: { never: true } }],
    win: 'The relief rode in. The tower held.',
  };
  S.BEACON = { SHOP, MEND, FALL, WAVE_MAX, NFIRE, LULL, LULL0, LIGHT, RELIEF_AT, STOVES, WAVES: WAVES.length, ORD_BUY };

  const humans = (sim) => sim.players.filter(p => !p.ai);
  P.beaconInit = function () {
    const nh = humans(this).length;
    this.bc = { stage: 'lull', n: 0, fires: 0, lit: false, light: 0, t0: this.tick, silver: 40 + 15 * (nh - 1), kills: 0, wave: [], log: [], relief: false, nh };
    for (const k of ['stoves', 'tower']) { const z = this.missionZone(k); if (z) z.hidden = false; }
    for (const gid in this.mg) { if (gid === 'bandFIN' || gid === 'garrison') continue; const p = this.players[this.mg[gid].p];
      for (const uid of [p.heroId, p.horseId]) { const u = uid >= 0 ? this.units[uid] : null; if (u && !u.dead) { u.dead = true; u.hp = 0; u.inactive = true; u.bcCut = true; u.bcPaid = true; } } }
  };
  P.beaconTick = function () {
    if (this.mv.ph < 0) return; if (!this.bc) this.beaconInit(); const B = this.bc, el = (this.tick - B.t0) / 30;
    // the purse: every raider who falls pays the garrison
    const dt = this.tick - (B.lastT === undefined ? this.tick : B.lastT); B.lastT = this.tick;
    for (const u of this.units) { if (u.team !== 1 || !u.dead || u.inactive || u.bcPaid || u.type === 'horse') continue; u.bcPaid = true; B.kills++; B.silver += u.type === 'hero' ? 10 : u.def.mounted ? 2 : 1; }
    // the tower falls when the Jin hold it, or when they stand in it three to one for twenty seconds
    const tz = this.missionZone('tower'); let m0 = 0, m1 = 0;
    if (tz) for (const u of this.units) { if (u.dead || u.inactive || u.type === 'horse' || u.downed) continue; if (len(u.x - tz.x, u.z - tz.z) > tz.r) continue; if (u.team === 0) m0++; else m1++; }
    B.m0 = m0; B.m1 = m1; B.press = m1 >= 4 && m1 >= 3 * m0 ? (B.press || 0) + dt : Math.max(0, (B.press || 0) - dt);
    if ((tz && tz.owner === 1) || B.press >= FALL * 30) { this.mOver(false, 'The Jin hold the tower. No more fires will burn on it.'); return; }
    if (B.stage === 'lull') {
      // light the next fire: someone of the garrison stands at the stoves
      if (!B.lit && B.fires < NFIRE) { let on = false; for (const p of humans(this)) { const h = this.units[p.heroId]; if (h && !h.dead && len(h.x - STOVES.x, h.z - STOVES.z) < STOVES.r) on = true; }
        B.light = on ? B.light + dt : Math.max(0, B.light - dt * 2); if (B.light >= LIGHT * 30) { B.lit = true; B.fires++; B.light = 0; B.silver += 10; this.events.push({ t: 'bfire', n: B.fires }); } }
      if (el >= (B.n === 0 ? LULL0 : LULL)) {
        if (B.fires >= NFIRE) this.beaconWave(-1);
        else if (B.n >= WAVES.length) { this.mOver(false, 'Seven raids came and the fifth fire never burned. No signal reached Liaoyang.'); return; }
        else this.beaconWave(B.n);
      }
      return;
    }
    // a raid: it is over when every party of it has broken
    { let done = true; for (const gid of B.wave) { const g = this.mg[gid]; if (!g || g.broken) continue; if (this.mGroupFrac(gid) < 0.2) { this.mBreak(gid); continue; } done = false; }
      if (B.stage === 'final' && !B.relief && el >= RELIEF_AT) { B.relief = true; this.mRelease('relief'); this.mDir('relief', ['hold', 0, 20]); this.events.push({ t: 'brelief' }); }
      // a raid that cannot finish the tower and will not go home draws off with its plunder after three minutes
      if (!done && B.stage === 'wave' && el >= WAVE_MAX) { for (const gid of B.wave) this.mBreak(gid); done = true; }
      if (done) { if (B.stage === 'final') { this.mOver(true, this.mission.win); return; } B.stage = 'lull'; B.lit = false; B.light = 0; B.t0 = this.tick; B.silver += 10; this.events.push({ t: 'bwaveend', n: B.n }); } }
  };
  // send a band (again): every man of it, fallen or not, comes back fresh at the edge of the field it approaches from
  P.beaconArm = function (k, side) {
    const gid = 'band' + k, g = this.mg[gid]; if (!g) return null; const p = this.players[g.p], sp = SPAWN[side] || SPAWN.N;
    const fx = Math.sin(sp[2]), fz = Math.cos(sp[2]), rx = -Math.cos(sp[2]), rz = Math.sin(sp[2]); let n = 0;
    if (g.released) { for (const sid of p.squads) { const q = this.squads[sid]; q.routing = false; q.morale = q.moraleMax; q.alive = true; q.order = 2;
        for (const uid of q.unitIds) { const u = this.units[uid]; if (u.bcCut) continue; const lat = ((n % 8) - 3.5) * 1.8, dep = -Math.floor(n / 8) * 2; n++;
          this.reviveUnit(u, clamp(sp[0] + rx * lat + fx * dep, -HALF + 3, HALF - 3), clamp(sp[1] + rz * lat + fz * dep, -HALF + 3, HALF - 3)); u.inactive = false; u.bcPaid = false; u.yaw = sp[2]; u.mount = -1; u.mounted = false; } }
      g.released = false; g.broken = false; p.fleeing = false; }
    else { for (const sid of p.squads) for (const uid of this.squads[sid].unitIds) { const u = this.units[uid]; if (u.bcCut) continue; const lat = ((n % 8) - 3.5) * 1.8, dep = -Math.floor(n / 8) * 2; n++;
        u.x = u.px = clamp(sp[0] + rx * lat + fx * dep, -HALF + 3, HALF - 3); u.z = u.pz = clamp(sp[1] + rz * lat + fz * dep, -HALF + 3, HALF - 3); u.y = u.py = S.terrainH(u.x, u.z); u.yaw = sp[2]; } }
    g.G.exit = [sp[0], sp[1]]; this.mRelease(gid); this.mDir(gid, ['hold', 0, -4]); return gid;
  };
  P.beaconWave = function (i) {
    const B = this.bc, fin = i < 0; const list = (fin ? FINAL : WAVES[i]).slice(); if (B.nh >= 2) list.push(EXTRA[fin ? 7 : i]);
    B.wave = list.map(([k, side]) => this.beaconArm(k, side)).filter(Boolean); B.stage = fin ? 'final' : 'wave'; B.t0 = this.tick; if (!fin) B.n++;
    this.events.push({ t: 'bwave', n: fin ? -1 : B.n });
  };
  // how many companies of a kind the road can still send (never sent, or sent and cut to the last man)
  P.beaconStock = function (item) { const it = SHOP[item]; if (!it) return 0; let n = 0;
    for (let k = 0; k < it[2]; k++) { const g = this.mg[`buy${item}_${k}`]; if (!g) continue; if (!g.used || g.sids.every(sid => this.squads[sid].unitIds.every(uid => this.units[uid].dead))) n++; } return n; };
  // the quartermaster: a company marches up the road from the south to whoever paid for it; or mend your men
  P.beaconBuy = function (p, item) {
    const B = this.bc; if (!B || !this.mission || !this.mission.beacon || this.mwin !== undefined || p.ai) return;
    const note = (ok, why) => { B.log.push([this.tick, p.idx, item, ok ? 1 : 0, why || '']); if (B.log.length > 12) B.log.shift(); };
    // 'ready': once this lull's fire burns, anyone may call the next raid on now rather than wait
    if (item === SHOP.length + 1) { if (B.stage !== 'lull' || (!B.lit && B.fires < NFIRE)) return note(false, 'fire'); const L = (B.n === 0 ? LULL0 : LULL) * 30; if (this.tick - B.t0 < L - 90) B.t0 = this.tick - L + 90; return note(true, 'ready'); }
    if (item === SHOP.length) { if (B.silver < MEND) return note(false, 'silver');
      B.silver -= MEND; for (const id of p.squads) { const q = this.squads[id]; if (!q || !q.alive) continue; for (const uid of q.unitIds) { const u = this.units[uid]; if (!u.dead) { u.hp = u.def.hp; u.fat = 0; } } } return note(true); }
    const it = SHOP[item]; if (!it) return; if (B.silver < it[1]) return note(false, 'silver');
    // a company the road has not sent yet, or one that was cut to the last man (the road raises it again)
    let gid = null; for (let k = 0; k < it[2] && !gid; k++) { const g = this.mg[`buy${item}_${k}`]; if (!g) continue; if (!g.used) gid = `buy${item}_${k}`; else if (g.sids.every(sid => { const q = this.squads[sid]; return q.unitIds.every(uid => this.units[uid].dead); })) gid = `buy${item}_${k}`; }
    if (!gid) return note(false, 'none');
    const g = this.mg[gid], ap = this.players[g.p]; B.silver -= it[1];
    if (!g.used) { g.used = true; g.sids = ap.squads.slice(); ap.squads = []; }
    else for (const sid of g.sids) { const op = this.players[this.squads[sid].owner]; if (op) op.squads = op.squads.filter(x => x !== sid); }
    const sx = 0, sz = -34; let k = 0;
    for (const sid of g.sids) { const q = this.squads[sid]; q.inactive = false; q.alive = true; q.routing = false; q.morale = q.moraleMax; q.owner = p.idx; q.order = S.ORD_FOLLOW; p.squads.push(sid);
      for (const uid of q.unitIds) { const u = this.units[uid]; const x = clamp(sx + ((k % 6) - 2.5) * 1.6, -HALF + 3, HALF - 3), z = clamp(sz - Math.floor(k / 6) * 1.8, -HALF + 3, HALF - 3); k++;
        if (u.dead) this.reviveUnit(u, x, z); else { u.x = u.px = x; u.z = u.pz = z; u.y = u.py = S.terrainH(x, z); u.vx = u.vz = 0; } u.inactive = false; u.owner = p.idx; u.ctrl = -1; }
      this.events.push({ t: 'mspare', p: p.idx, sq: sid, levy: true, name: q.def.name }); }
    note(true);
  };
})();
