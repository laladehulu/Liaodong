// Melee feel harness (xcombat): a scripted player fights in a line; measures how the enemy engages him.
// node test/zfeel.js <seed> [line|solo] [maxSec]      SIMSRC=path/to/sim.js to compare another build
// Prints: distance from the enemy to the player when his wind-up starts and when his blow lands, how long enemies stand
// in his face (within 1.3 m, not swinging), how long they loiter in reach before swinging, and the player's own stats.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, scen = process.argv[3] || 'line', maxT = (+process.argv[4] || 90) * 30;
const sim = new S.Sim({ seed, mode: 'standard', battle: 'field', xcombat: true, players: [{ name: 'me', team: 0, army: ['samurai'] }, { name: 'foe', team: 1, army: ['shinsengumi', 'samurai'] }] });
sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
const me = sim.players[0]; const mySq = sim.squads.find(q => q.team === 0 && q.type === 'samurai'); const foes = sim.squads.filter(q => q.team === 1);
const place = (q, cx, cz, f) => { q.facing = f; q.tx = cx; q.tz = cz; q.order = S.ORD_HOLD; q.unitIds.forEach((id, i) => { const u = sim.units[id]; u.x = u.px = cx + ((i % 6) - 2.5) * 1.3; u.z = u.pz = cz - Math.floor(i / 6) * 1.4 * Math.cos(f); u.yaw = u.pyaw = f; u.hyaw = u.phyaw = f; }); };
place(mySq, 0, -20, 0); foes.forEach((c, i) => place(c, (i - 0.5) * 10, 14, Math.PI));
// the player takes the middle man of the front rank (or stands alone)
const old = sim.units[me.heroId]; if (old) { old.dead = true; old.inactive = true; } const hs = sim.units[me.horseId]; if (hs) { hs.dead = true; hs.inactive = true; }
const heroId = mySq.unitIds[2]; const h = sim.units[heroId]; h.ctrl = 0; me.heroId = heroId; me.soldierSq = mySq.id;
if (scen === 'solo') { for (const id of mySq.unitIds) if (id !== heroId) { const u = sim.units[id]; u.dead = true; u.inactive = true; } }
const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const wd = [], hd = [], loiter = []; let face = 0, faceAny = 0, engT = 0, inReach = 0, ticks = 0, myHits = 0, myBlocks = 0, hitsOnMe = 0, blockedByMe = 0, myDeath = -1, firstContact = -1;
const wTick = {}, reachSince = {}; let lastAtk = -99, blockUntil = -1;
for (let t = 0; t < maxT && sim.winner < 0; t++) {
  if (t === 30) { for (const c of foes) { c.order = S.ORD_CHARGE; c.tx = mySq.cx; c.tz = mySq.cz; } mySq.order = S.ORD_CHARGE; mySq.tx = foes[0].cx; mySq.tz = foes[0].cz; }
  const hero = sim.units[heroId]; let keys = 0, yaw = hero.yaw, acts = 0;
  if (!hero.dead) {
    let e = null, ed = 1e9; for (const v of sim.teamAlive[1]) { const d = Math.hypot(v.x - hero.x, v.z - hero.z); if (d < ed) { ed = d; e = v; } }
    if (e) { yaw = Math.atan2(e.x - hero.x, e.z - hero.z);
      if (ed > 2.0 && hero.st === S.ST_IDLE && t - lastAtk > 30 && blockUntil < t) keys |= S.KEY_W; /* he steps in only to cut, else he holds his place in the line */
      if (ed < 2.1 && t - lastAtk > 36 && hero.st === S.ST_IDLE && blockUntil < t) { acts |= S.A_ATK; lastAtk = t; }
      else if (ed < 3 && e.st === S.ST_WINDUP && t > blockUntil + 20 && t - lastAtk > 12 && hero.st === S.ST_IDLE) blockUntil = t + 15;
      if (blockUntil >= t) acts |= S.A_BLOCK; }
  }
  sim.step([[keys, yq(yaw), 0, acts, 0, 0, [], 0], [0, 0, 0, 0, 0, 0, [], 0]]);
  for (const ev of sim.events) {
    if (ev.t === 'windup') { const a = sim.units[ev.id]; if (a.team === 1 && a.target === heroId) { wd.push(Math.hypot(a.x - hero.x, a.z - hero.z)); wTick[a.id] = t; if (reachSince[a.id] >= 0) loiter.push((t - reachSince[a.id]) / 30); } }
    if (ev.t === 'hit' && ev.id === heroId && (ev.cause === 'melee' || ev.cause === 'spear')) { hitsOnMe++; const a = sim.units[ev.att]; if (a) hd.push(Math.hypot(a.x - hero.x, a.z - hero.z)); }
    if (ev.t === 'hit' && ev.att === heroId) myHits++;
    if (ev.t === 'block' && ev.by === heroId) blockedByMe++;
    if (ev.t === 'block' && ev.att === heroId) myBlocks++;
    if (ev.t === 'death' && ev.id === heroId) myDeath = t / 30;
  }
  if (!hero.dead) { let near = false, reach = false, anyNear = false, eng = false; for (const v of sim.teamAlive[1]) { const d = Math.hypot(v.x - hero.x, v.z - hero.z); const swinging = v.st === S.ST_WINDUP || v.st === S.ST_RELEASE;
      if (d < v.def.reach + 0.3 && !v.breathE) { reach = true; if (!(reachSince[v.id] >= 0)) reachSince[v.id] = t; } else reachSince[v.id] = -1; if (swinging) reachSince[v.id] = -1;
      if (d < 1.3 && !swinging && v.target === heroId) near = true; if (d < v.def.reach + 1.0 && v.target === heroId) eng = true; if (d < 1.3 && !swinging) anyNear = true; if (d < 3 && firstContact < 0) firstContact = t; }
    if (firstContact >= 0) { ticks++; if (near) face++; if (anyNear) faceAny++; if (eng) engT++; if (reach) inReach++; } }
}
const q = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return [s[Math.floor(s.length * 0.1)], s[Math.floor(s.length * 0.5)], s[Math.floor(s.length * 0.9)]].map(v => +v.toFixed(2)); };
const mean = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
console.log(JSON.stringify({ seed, scen, contactS: +(firstContact / 30).toFixed(1), fightTicks: ticks, windupDist_p10_50_90: q(wd), windupDistMean: mean(wd), hitDist_p10_50_90: q(hd), loiterS_p10_50_90: q(loiter), loiterMean: mean(loiter),
  faceTime: +(face / Math.max(1, ticks)).toFixed(2), faceAny: +(faceAny / Math.max(1, ticks)).toFixed(2), engaged: +(engT / Math.max(1, ticks)).toFixed(2), inReachTime: +(inReach / Math.max(1, ticks)).toFixed(2), enemySwingsAtMe: wd.length, hitsOnMe, blockedByMe, myHits, myBlocked: myBlocks, myDeathS: myDeath >= 0 ? +myDeath.toFixed(1) : null, hash: sim.hash() }));
