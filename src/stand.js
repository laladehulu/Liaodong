// ===== 闖營 · Last Stand: an endless wave-survival mode with a boon between waves =====
// Loaded after sim.js (like beacon.js): only what SIM exports and the mission machinery (groups, mRelease, mBreak, zones).
// You and your companies hold a palisade camp on the open field. The raids come from every side, each bigger and harder than
// the last, a named officer with his guard every fifth. When a raid breaks, every player picks one of three boons (a stronger
// coat, quicker hands, a fresh company, the fallen back on their feet...) and the next raid comes on the moment he has chosen:
// no countdown. Three lives each; the camp falls when the last of you is out, or when the raiders hold it three to one.
// Everything here is deterministic (the boons are drawn from the sim's own rng), so it runs in co-op rooms like the beacon.
(() => {
  'use strict';
  const S = SIM, P = S.Sim.prototype, PI = Math.PI, HALF = S.HALF, { clamp, len } = DM;
  const ORD_PICK = 22, LIVES = 3, RING = 122, FALL = 20, CAP = 170;
  // the raiding bands, by tier: a raid draws from the tiers it has reached (wave 1-3 tier 0, 4-6 tier 1, 7-9 tier 2, then 3)
  const BANDS = [
    [['ronin', 'ronin'], 'Bandit militia', 0], [['ashigaru', 'archer'], 'Banner pikes and bows', 0], [['byakkotai', 'ronin'], 'Mongol riders', 0],
    [['samurai', 'archer'], 'Bannermen', 1], [['samurai', 'ashigaru'], 'Bannermen and pikes', 1], [['cavalry', 'byakkotai'], 'Horse raiders', 1],
    [['shinsengumi', 'samurai'], 'Bayara guard', 2], [['horokutai', 'archer'], 'Grenadiers', 2], [['rifle_sho', 'samurai'], 'Han Banner guns', 2],
    [['shinsengumi', 'shinsengumi'], 'Bayara vanguard', 3], [['cavalry', 'cavalry'], 'Banner horse', 3], [['jigen', 'rifle_sho'], 'Horse-cutters and guns', 3],
  ];
  const BOSS = [['Ejen Daišan', '代善'], ['Jalan-i ejen Bayan', '甲喇額真'], ['Gūsa ejen Hohori', '固山額真'], ['Beile Amin', '阿敏'], ['Baturu Eidu', '巴圖魯']];
  // the boons: [key, character, name, what it does]
  const BOONS = [
    ['mend', '醫', 'Field dressing', 'Every man of yours healed, and the fallen of your companies on their feet again'],
    ['iron', '甲', 'Iron coat', 'You: +40% health'],
    ['edge', '刃', 'Keen edge', 'You: +30% blade damage · your men +10%'],
    ['quick', '速', 'Quick hands', 'You and your men load and loose a quarter faster'],
    ['aim', '準', 'Steady aim', 'You and your men: muskets and bows a third tighter'],
    ['levy', '兵', 'Levy', 'A fresh company marches in to join you'],
    ['drum', '鼓', 'War drum', 'Your men: +25% health, and much harder to break'],
    ['gun', '砲', 'Nest of Bees', 'A rocket cart is brought up to the camp, yours to command'],
    ['life', '命', 'Second wind', 'One more life'],
  ];
  const LEVY = ['ashigaru', 'rifle_imp', 'yuanyang', 'rifle_spencer'];
  const groups = {
    garrison: { team: 0, name: 'Camp garrison', zh: '營兵', army: ['ashigaru', 'rifle_imp'], at: [0, 6, 0], dir: ['hold', 0, 4], stay: true },
    sboss: { team: 1, name: 'The officer', zh: '額真', army: ['shinsengumi', 'shinsengumi'], at: [0, 140, PI], reserve: true, officer: 2.5 },
  };
  BANDS.forEach((b, i) => { groups['sb' + i] = { team: 1, name: b[1], army: b[0], at: [0, 140, PI], reserve: true }; });
  LEVY.forEach((t, i) => { groups['lv' + i] = { team: 0, name: 'Levy', army: [t], at: [(i - 1.5) * 12, -96, 0], reserve: true }; });
  groups.lvg = { team: 0, name: 'Rocket cart', army: ['gatling'], at: [0, -110, 0], reserve: true };
  // the camp: a square palisade with a gate in each face, mantlets at the gates, a storehouse and tents inside
  const PAL = 1.7;
  const forts = [[-10, 16, 6, 0.5, PAL, 'palisade'], [10, 16, 6, 0.5, PAL, 'palisade'], [-10, -16, 6, 0.5, PAL, 'palisade'], [10, -16, 6, 0.5, PAL, 'palisade'],
    [16, -10, 0.5, 6, PAL, 'palisade'], [16, 10, 0.5, 6, PAL, 'palisade'], [-16, -10, 0.5, 6, PAL, 'palisade'], [-16, 10, 0.5, 6, PAL, 'palisade'],
    [0, 18.6, 1.4, 1.1, 1.4, 'mantlet'], [0, -18.6, 1.4, 1.1, 1.4, 'mantlet'], [18.6, 0, 1.1, 1.4, 1.4, 'mantlet'], [-18.6, 0, 1.1, 1.4, 1.4, 'mantlet'],
    [-8, 8, 3, 2.4, 3, 'house'], [8, -8, 2.4, 2.4, 2.2, 'tent'], [-8, -8, 2.4, 2.4, 2.2, 'tent']];
  S.MISSIONS.laststand = {
    title: '闖營 · Last Stand', year: 'Liaodong, the 1620s', battle: 'field', side: 0, stand: true, hidden: true, soloExtra: 'ashigaru',
    brief: 'Hold the camp. Every raid is bigger than the last; between raids, pick a boon. How long can you last?',
    start: [0, -4, 0], zones: [{ key: 'camp', x: 0, z: 0, r: 18, name: 'The camp', owner: 0, rate: 0.4 }], forts, groups,
    phases: [{ title: '闖營 · The stand', text: 'Hold the camp. The raids come from every side.', obj: { never: true } }], win: '',
  };
  S.STAND = { BOONS, LIVES, ORD_PICK, BANDS };

  const humans = (sim) => sim.players.filter(p => !p.ai);
  const tune = (d, f) => { const n = Object.assign({}, d); if (d.rifle) n.rifle = Object.assign({}, d.rifle); if (d.bow) n.bow = Object.assign({}, d.bow); if (d.dmg) n.dmg = d.dmg.slice(); f(n); return n; };
  P.standInit = function () {
    const nh = humans(this).length;
    this.st = { n: 0, stage: 'wave', wave: [], kills: 0, t0: this.tick, lives: {}, offer: {}, picked: {}, took: {}, log: [], nh, scaleC: new Map(), sent: {} };
    for (const p of humans(this)) { this.st.lives[p.idx] = LIVES; this.st.took[p.idx] = []; }
    { const z = this.missionZone('camp'); if (z) z.hidden = false; }
    // the bands are men, not generals: their commanders stay home (the officer of every fifth raid excepted)
    for (const gid in this.mg) { if (gid === 'sboss' || gid === 'garrison') continue; const p = this.players[this.mg[gid].p];
      for (const uid of [p.heroId, p.horseId]) { const u = uid >= 0 ? this.units[uid] : null; if (u && !u.dead) { u.dead = true; u.hp = 0; u.inactive = true; u.stCut = true; u.stPaid = true; } } }
    this.standWave();
  };
  P.standTick = function () {
    if (this.mv.ph < 0) return; if (!this.st) this.standInit(); const T = this.st; if (!T.wave) return;
    const dt = this.tick - (T.lastT === undefined ? this.tick : T.lastT); T.lastT = this.tick;
    for (const u of this.units) { if (u.team !== 1 || !u.dead || u.inactive || u.stPaid || u.type === 'horse') continue; u.stPaid = true; T.kills++; }
    // lives: a fall costs one; with none left you stay down (the others fight on)
    let left = 0;
    for (const p of humans(this)) { const h = this.units[p.heroId]; const L = T.lives[p.idx] === undefined ? (T.lives[p.idx] = LIVES) : T.lives[p.idx];
      if (h && h.dead) { if (!p.stDown) { p.stDown = true; T.lives[p.idx] = L - 1; this.events.push({ t: 'slife', p: p.idx, n: T.lives[p.idx] }); } if (T.lives[p.idx] <= 0) { p.respawnT = Infinity; p.stOut = true; } }
      else if (h) p.stDown = false;
      if (!p.stOut) left++; }
    const end = (why) => this.mOver(false, `${why} You held ${T.n - 1} raid${T.n === 2 ? '' : 's'} and fell in the ${T.n}${T.n % 10 === 1 && T.n !== 11 ? 'st' : T.n % 10 === 2 && T.n !== 12 ? 'nd' : T.n % 10 === 3 && T.n !== 13 ? 'rd' : 'th'}. ${T.kills} raiders slain.`);
    if (!left) return end('The last of you is down.');
    // the camp falls when the raiders hold it, or stand in it three to one for twenty seconds
    const cz = this.missionZone('camp'); let m0 = 0, m1 = 0;
    if (cz) for (const u of this.units) { if (u.dead || u.inactive || u.type === 'horse' || u.downed) continue; if (len(u.x - cz.x, u.z - cz.z) > cz.r) continue; if (u.team === 0) m0++; else m1++; }
    T.m0 = m0; T.m1 = m1; T.press = m1 >= 4 && m1 >= 3 * m0 ? (T.press || 0) + dt : Math.max(0, (T.press || 0) - dt);
    if ((cz && cz.owner === 1) || T.press >= FALL * 30) return end('The raiders hold the camp.');
    if (T.stage === 'wave') {
      let done = true; const el = (this.tick - T.t0) / 30;
      for (const gid of T.wave) { const g = this.mg[gid]; if (!g || g.broken) continue; if (this.standAlive(gid) <= Math.max(1, Math.floor((T.sent[gid] || 1) * 0.15))) { this.mBreak(gid); continue; }
        // a band that has lost its stomach for it (four men or fewer, nowhere near the camp, two minutes in) has gone home
        if (el > 120) { const p = this.players[g.p]; let n = 0, near = false; for (const sid of p.squads) for (const uid of this.squads[sid].unitIds) { const u = this.units[uid]; if (u.dead || u.inactive) continue; n++; if (len(u.x, u.z) < 70) near = true; }
          if (n <= 4 && !near) { this.mBreak(gid); continue; } }
        done = false; }
      if (done) { T.stage = 'pick'; T.offer = {}; T.picked = {}; for (const p of humans(this)) if (!p.stOut) T.offer[p.idx] = this.standOffer(p); this.events.push({ t: 'swaveend', n: T.n }); }
      return;
    }
    if (T.stage === 'pick') { let all = true; for (const p of humans(this)) if (!p.stOut && T.picked[p.idx] === undefined) all = false; if (all) this.standWave(); }
  };
  // three different boons, drawn from the sim's rng (the same draw on every peer)
  P.standOffer = function (p) {
    const T = this.st, ok = BOONS.map((b, i) => i).filter(i => { const k = BOONS[i][0];
      if (k === 'levy') return this.standFree('lv') !== null; if (k === 'gun') return this.standFree('lvg') !== null; if (k === 'life') return (T.lives[p.idx] | 0) < 5; return true; });
    const out = []; while (out.length < 3 && ok.length) { const j = Math.floor(this.rng.next() * ok.length); out.push(ok.splice(j, 1)[0]); } return out;
  };
  P.standFree = function (pre) { const ks = pre === 'lvg' ? ['lvg'] : LEVY.map((t, i) => 'lv' + i); for (const k of ks) { const g = this.mg[k]; if (g && !g.used) return k; } return null; };
  // a raid: k bands from the tiers reached, from different sides, the men shared out of a budget that grows by seven a raid
  P.standWave = function () {
    const T = this.st; T.n++; const n = T.n;
    const budget = Math.round(Math.min(CAP, 10 + 7 * n) * (1 + 0.45 * (T.nh - 1)));
    const tier = Math.min(3, Math.floor((n - 1) / 3)), pool = BANDS.map((b, i) => i).filter(i => BANDS[i][2] <= tier);
    const k = Math.min(5, pool.length, 1 + Math.floor(n / 2)), pick = [];
    // the newest tier is always in it once reached; the rest drawn at random
    const fresh = pool.filter(i => BANDS[i][2] === tier); pick.push(fresh[Math.floor(this.rng.next() * fresh.length)]);
    while (pick.length < k) { const rest = pool.filter(i => !pick.includes(i)); if (!rest.length) break; pick.push(rest[Math.floor(this.rng.next() * rest.length)]); }
    const scale = 1 + 0.045 * (n - 1), per = Math.max(4, Math.round(budget / pick.length));
    const dir0 = Math.floor(this.rng.next() * 8); T.wave = [];
    pick.forEach((bi, j) => { const a = ((dir0 + j * 3) % 8) * PI / 4; const gid = this.standArm('sb' + bi, a, per, scale); if (gid) T.wave.push(gid); });
    if (n % 5 === 0) { const B = BOSS[(n / 5 - 1) % BOSS.length], gb = this.mg.sboss; if (gb) { gb.G.name = B[0]; gb.G.zh = B[1]; }
      const gid = this.standArm('sboss', ((dir0 + 4) % 8) * PI / 4, 10 + n, scale * 1.1, true); if (gid) T.wave.push(gid); }
    T.stage = 'wave'; T.t0 = this.tick; T.press = 0;
    this.events.push({ t: 'swave', n, boss: n % 5 === 0 });
  };
  // send a band (again): `men` of it come back fresh, a little harder each raid, on the ring at angle a, and march on the camp
  P.standArm = function (gid, a, men, scale, boss) {
    const g = this.mg[gid]; if (!g) return null; const p = this.players[g.p], T = this.st;
    const sx = Math.sin(a) * RING, sz = Math.cos(a) * RING, yaw = a + PI, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const sk = Math.round(scale * 100) / 100; let k = 0;
    for (const sid of p.squads) { const q = this.squads[sid]; q.routing = false; q.morale = q.moraleMax; q.order = 2;
      for (const uid of q.unitIds) { const u = this.units[uid]; if (u.stCut) continue;
        if (k >= men) { if (!u.dead) { u.dead = true; u.hp = 0; } u.inactive = true; u.stPaid = true; continue; }
        if (!u.stBase) u.stBase = u.def; const ck = u.stBase.name + ':' + u.team + ':' + sk; let d = T.scaleC.get(ck);
        if (!d) { d = tune(u.stBase, (n) => { n.hp = u.stBase.hp * sk; if (n.dmg) n.dmg = n.dmg.map(v => v * (1 + (sk - 1) * 0.7)); }); T.scaleC.set(ck, d); } u.def = d;
        const lat = ((k % 8) - 3.5) * 1.8, dep = -Math.floor(k / 8) * 2; k++;
        this.reviveUnit(u, clamp(sx + rx * lat + fx * dep, -HALF + 3, HALF - 3), clamp(sz + rz * lat + fz * dep, -HALF + 3, HALF - 3));
        u.inactive = false; u.stPaid = false; u.yaw = yaw; u.mount = -1; u.mounted = false; u.wounded = false; u.downed = false; u.bleed = 0; }
      q.alive = q.unitIds.some(uid => !this.units[uid].dead); }
    if (boss) { const h = this.units[p.heroId]; if (h) { this.reviveUnit(h, sx, sz); h.inactive = false; h.stPaid = false; h.wounded = false; h.downed = false; h.yaw = yaw; } }
    T.sent[gid] = k + (boss ? 1 : 0); g.released = false; g.broken = false; p.fleeing = false; g.G.exit = [sx, sz];
    this.mRelease(gid); this.mDir(gid, ['hold', 0, 0]); return gid;
  };
  // the men of a band still on their feet (its officer counts)
  P.standAlive = function (gid) { const g = this.mg[gid]; if (!g) return 0; const p = this.players[g.p]; let n = 0;
    for (const sid of p.squads) for (const uid of this.squads[sid].unitIds) { const u = this.units[uid]; if (!u.dead && !u.inactive && !u.downed) n++; }
    const h = this.units[p.heroId]; if (h && !h.dead && !h.inactive) n++; return n; };
  // the boons
  P.standPick = function (p, i) {
    const T = this.st; if (!T || T.stage !== 'pick' || p.ai || p.stOut || T.picked[p.idx] !== undefined || this.mwin !== undefined) return;
    const off = T.offer[p.idx]; if (!off || off[i] === undefined) return; const b = off[i], key = BOONS[b][0];
    const hero = this.units[p.heroId], men = [];
    for (const sid of p.squads) { const q = this.squads[sid]; if (!q) continue; for (const uid of q.unitIds) { const u = this.units[uid]; if (u !== hero) men.push(u); } }
    const live = men.filter(u => !u.dead);
    const each = (list, f) => { for (const u of list) { if (!u || u.dead) continue; const hp0 = u.hp / u.def.hp; u.def = tune(u.def, f); u.hp = Math.min(u.def.hp, Math.max(u.hp, u.def.hp * hp0)); } };
    if (key === 'mend') { const h = hero && !hero.dead ? hero : null; let k = 0;
      for (const u of men) { if (u.stCut) continue; if (u.dead) { const x = (h ? h.x : 0) + ((k % 6) - 2.5) * 1.6, z = (h ? h.z : -4) - 2 - Math.floor(k / 6) * 1.8; k++; this.reviveUnit(u, clamp(x, -HALF + 3, HALF - 3), clamp(z, -HALF + 3, HALF - 3)); u.inactive = false; u.wounded = false; u.downed = false; }
        else { u.hp = u.def.hp; u.wounded = false; u.downed = false; u.fat = 0; } }
      for (const sid of p.squads) { const q = this.squads[sid]; if (q && q.unitIds.some(uid => !this.units[uid].dead)) { q.alive = true; q.routing = false; q.morale = q.moraleMax; } }
      if (h) h.hp = h.def.hp; }
    else if (key === 'iron') each([hero], (n) => { n.hp *= 1.4; });
    else if (key === 'edge') { each([hero], (n) => { if (n.dmg) n.dmg = n.dmg.map(v => v * 1.3); }); each(live, (n) => { if (n.dmg) n.dmg = n.dmg.map(v => v * 1.1); }); }
    else if (key === 'quick') each([hero].concat(live), (n) => { if (n.rifle) n.rifle.reload *= 0.75; if (n.bow) n.bow.reload *= 0.75; if (n.windup) n.windup *= 0.85; });
    else if (key === 'aim') each([hero].concat(live), (n) => { if (n.rifle) { n.rifle.spread *= 0.67; if (n.rifle.ads) n.rifle.ads *= 0.67; } if (n.bow && n.bow.spread) n.bow.spread *= 0.67; });
    else if (key === 'drum') { each(live, (n) => { n.hp *= 1.25; }); for (const sid of p.squads) { const q = this.squads[sid]; if (q) { q.moraleMax *= 1.8; q.morale = q.moraleMax; } } }
    else if (key === 'life') T.lives[p.idx] = (T.lives[p.idx] | 0) + 1;
    else if (key === 'levy' || key === 'gun') { const gid = this.standFree(key === 'gun' ? 'lvg' : 'lv'); if (gid) this.standJoin(p, gid); }
    T.picked[p.idx] = b; T.took[p.idx] = (T.took[p.idx] || []).concat([b]); T.log.push([this.tick, p.idx, b]); if (T.log.length > 12) T.log.shift();
    this.events.push({ t: 'spick', p: p.idx, b });
  };
  // a levy company: taken out of its reserve group and given to the player who chose it, marching up from the south road
  P.standJoin = function (p, gid) {
    const g = this.mg[gid], ap = this.players[g.p]; g.used = true; const sids = ap.squads.slice(); ap.squads = []; const h = this.units[p.heroId];
    const sx = h && !h.dead ? h.x : 0, sz = (h && !h.dead ? h.z : 0) - 6; let k = 0;
    for (const sid of sids) { const q = this.squads[sid]; q.inactive = false; q.alive = true; q.routing = false; q.morale = q.moraleMax; q.owner = p.idx; q.order = S.ORD_FOLLOW; p.squads.push(sid);
      for (const uid of q.unitIds) { const u = this.units[uid]; const x = clamp(sx + ((k % 6) - 2.5) * 1.6, -HALF + 3, HALF - 3), z = clamp(sz - Math.floor(k / 6) * 1.8, -HALF + 3, HALF - 3); k++;
        if (u.dead) this.reviveUnit(u, x, z); else { u.x = u.px = x; u.z = u.pz = z; u.y = u.py = S.terrainH(x, z); u.vx = u.vz = 0; } u.inactive = false; u.owner = p.idx; u.ctrl = -1; }
      this.events.push({ t: 'mspare', p: p.idx, sq: sid, levy: true, name: q.def.name }); }
  };
})();
