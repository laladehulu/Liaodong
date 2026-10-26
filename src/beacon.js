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
  // the raids, each heavier than the last; a wave is a list of [army, spawn]
  const WAVES = [
    [[['ronin', 'archer'], 'N']],
    [[['samurai', 'archer'], 'N'], [['ronin'], 'E']],
    [[['cavalry', 'byakkotai'], 'E'], [['samurai', 'archer'], 'W']],
    [[['samurai', 'ashigaru', 'archer'], 'N'], [['ronin', 'cavalry'], 'W']],
    [[['shinsengumi', 'samurai'], 'NW'], [['horokutai', 'archer'], 'E']],
    [[['cavalry', 'cavalry', 'samurai'], 'W'], [['ashigaru', 'archer', 'samurai'], 'N']],
    [[['shinsengumi', 'samurai', 'archer'], 'NE'], [['samurai', 'horokutai'], 'N']],
  ];
  const FINAL = [[['shinsengumi', 'shinsengumi', 'samurai'], 'N'], [['samurai', 'archer', 'cavalry'], 'E'], [['ashigaru', 'archer', 'samurai'], 'W']];
  // with two or more defenders each raid brings one more party, from the other flank
  const EXTRA = [['byakkotai'], ['samurai'], ['cavalry'], ['samurai', 'archer'], ['shinsengumi'], ['cavalry', 'archer'], ['samurai', 'archer'], ['shinsengumi', 'archer']];
  const XSIDE = ['E', 'W', 'N', 'E', 'W', 'E', 'W', 'NW'];
  // what the quartermaster can send up from the road: [type, cost, how many companies the road holds]
  const SHOP = [['ashigaru', 20, 3], ['rifle_imp', 30, 3], ['yuanyang', 35, 2], ['rifle_spencer', 35, 2], ['cavalry', 40, 2], ['gatling', 50, 1]];
  const MEND = 15, NFIRE = 5, LULL = 30, LULL0 = 40, LIGHT = 3, RELIEF_AT = 40;
  const NAMES = ['Scouts', 'Raiding party', 'Horse raid', 'War band', 'Bayara', 'Banner horse', 'Banner host'];
  const groups = {
    garrison: { team: 0, name: 'Tower garrison', zh: '墩軍', army: ['rifle_imp', 'yuanyang'], at: [0, 0, 0], dir: ['hold', 0, 2], stay: true },
    relief: { team: 0, name: 'Guanning relief', zh: '關寧援兵', army: ['cavalry', 'cavalry', 'cavalry', 'rifle_imp'], at: [0, -132, 0], reserve: true, dir: ['hold', 0, 20] },
  };
  WAVES.forEach((w, i) => { w.forEach((g, j) => { const s = SPAWN[g[1]]; groups[`w${i}_${j}`] = { team: 1, name: `${NAMES[i]} (${g[1]})`, army: g[0], at: s, reserve: true }; });
    const s = SPAWN[XSIDE[i]]; groups[`w${i}_x`] = { team: 1, name: `${NAMES[i]} (${XSIDE[i]} flank)`, army: EXTRA[i], at: s, reserve: true }; });
  FINAL.forEach((g, j) => { const s = SPAWN[g[1]]; groups[`fin_${j}`] = Object.assign({ team: 1, name: j ? `Banner host (${g[1]})` : 'Beile Amin', army: g[0], at: s, reserve: true }, j ? {} : { zh: '阿敏', officer: 2.5 }); });
  groups.fin_x = { team: 1, name: 'Banner host (west flank)', army: EXTRA[7], at: SPAWN[XSIDE[7]], reserve: true };
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
  S.BEACON = { SHOP, MEND, NFIRE, LULL, LULL0, LIGHT, RELIEF_AT, STOVES, WAVES: WAVES.length, ORD_BUY };

  const humans = (sim) => sim.players.filter(p => !p.ai);
  P.beaconInit = function () {
    const nh = humans(this).length;
    this.bc = { stage: 'lull', n: 0, fires: 0, lit: false, light: 0, t0: this.tick, silver: 40 + 15 * (nh - 1), kills: 0, wave: [], log: [], relief: false, nh };
    for (const k of ['stoves', 'tower']) { const z = this.missionZone(k); if (z) z.hidden = false; }
  };
  P.beaconTick = function () {
    if (this.mv.ph < 0) return; if (!this.bc) this.beaconInit(); const B = this.bc, el = (this.tick - B.t0) / 30;
    // the purse: every raider who falls pays the garrison
    if (this.tick % 15 === 0) for (const u of this.units) { if (u.team !== 1 || !u.dead || u.inactive || u.bcPaid || u.type === 'horse') continue; u.bcPaid = true; B.kills++; B.silver += u.type === 'hero' ? 12 : u.def.mounted ? 4 : 2; }
    const tz = this.missionZone('tower'); if (tz && tz.owner === 1) { this.mOver(false, 'The Jin hold the tower. No more fires will burn on it.'); return; }
    if (B.stage === 'lull') {
      // light the next fire: someone of the garrison stands at the stoves
      if (!B.lit && B.fires < NFIRE) { let on = false; for (const p of humans(this)) { const h = this.units[p.heroId]; if (h && !h.dead && len(h.x - STOVES.x, h.z - STOVES.z) < STOVES.r) on = true; }
        B.light = on ? B.light + 1 : Math.max(0, B.light - 2); if (B.light >= LIGHT * 30) { B.lit = true; B.fires++; B.light = 0; B.silver += 10; this.events.push({ t: 'bfire', n: B.fires }); } }
      if (el >= (B.n === 0 ? LULL0 : LULL)) {
        if (B.fires >= NFIRE) this.beaconWave(-1);
        else if (B.n >= WAVES.length) { this.mOver(false, 'Seven raids came and the fifth fire never burned. No signal reached Liaoyang.'); return; }
        else this.beaconWave(B.n);
      }
      return;
    }
    // a raid: it is over when every party of it has broken
    if (this.tick % 15 === 0) { let done = true; for (const gid of B.wave) { const g = this.mg[gid]; if (!g || g.broken) continue; if (this.mGroupFrac(gid) < 0.2) { this.mBreak(gid); continue; } done = false; }
      if (B.stage === 'final' && !B.relief && el >= RELIEF_AT) { B.relief = true; this.mRelease('relief'); this.mDir('relief', ['hold', 0, 20]); this.events.push({ t: 'brelief' }); }
      if (done) { if (B.stage === 'final') { this.mOver(true, this.mission.win); return; } B.stage = 'lull'; B.lit = false; B.light = 0; B.t0 = this.tick; B.silver += 10; this.events.push({ t: 'bwaveend', n: B.n }); } }
  };
  P.beaconWave = function (i) {
    const B = this.bc, fin = i < 0; const ids = fin ? FINAL.map((_, j) => `fin_${j}`) : WAVES[i].map((_, j) => `w${i}_${j}`);
    if (B.nh >= 2) ids.push(fin ? 'fin_x' : `w${i}_x`);
    for (const gid of ids) { this.mRelease(gid); this.mDir(gid, ['hold', 0, -4]); }
    B.wave = ids; B.stage = fin ? 'final' : 'wave'; B.t0 = this.tick; if (!fin) B.n++;
    this.events.push({ t: 'bwave', n: fin ? -1 : B.n });
  };
  // the quartermaster: a company marches up the road from the south to whoever paid for it; or mend your men
  P.beaconBuy = function (p, item) {
    const B = this.bc; if (!B || !this.mission || !this.mission.beacon || this.mwin !== undefined || p.ai) return;
    const note = (ok, why) => { B.log.push([this.tick, p.idx, item, ok ? 1 : 0, why || '']); if (B.log.length > 12) B.log.shift(); };
    if (item === SHOP.length) { if (B.silver < MEND) return note(false, 'silver');
      B.silver -= MEND; for (const id of p.squads) { const q = this.squads[id]; if (!q || !q.alive) continue; for (const uid of q.unitIds) { const u = this.units[uid]; if (!u.dead) { u.hp = u.def.hp; u.fat = 0; } } } return note(true); }
    const it = SHOP[item]; if (!it) return; if (B.silver < it[1]) return note(false, 'silver');
    let gid = null; for (let k = 0; k < it[2]; k++) { const g = this.mg[`buy${item}_${k}`]; if (g && !g.used) { gid = `buy${item}_${k}`; break; } } if (!gid) return note(false, 'none');
    const g = this.mg[gid], ap = this.players[g.p]; g.used = true; B.silver -= it[1];
    const sx = 0, sz = -34; let k = 0;
    for (const sid of ap.squads.slice()) { const q = this.squads[sid]; ap.squads = ap.squads.filter(x => x !== sid); q.inactive = false; q.owner = p.idx; q.order = S.ORD_FOLLOW; p.squads.push(sid);
      for (const uid of q.unitIds) { const u = this.units[uid]; if (u.dead) continue; u.inactive = false; u.owner = p.idx; u.x = u.px = clamp(sx + ((k % 6) - 2.5) * 1.6, -HALF + 3, HALF - 3); u.z = u.pz = clamp(sz - Math.floor(k / 6) * 1.8, -HALF + 3, HALF - 3); u.y = u.py = S.terrainH(u.x, u.z); u.vx = u.vz = 0; k++; }
      this.events.push({ t: 'mspare', p: p.idx, sq: sid, levy: true, name: q.def.name }); }
    note(true);
  };
})();
