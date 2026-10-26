// Wolf-brush harness: a mandarin duck team against one enemy squad. node test/zbrush.js <foe samurai|shinsengumi> <seed> [xc 1|0] [maxSec]
// SIMSRC=<file> runs another sim.js (for before/after). Prints one JSON line.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, foe = process.argv[2] || 'samurai', seed = +process.argv[3] || 1, xc = (process.argv[4] || '1') === '1', maxT = (+process.argv[5] || 120) * 30;
const sim = new S.Sim({ seed, players: [], xcombat: xc });
for (const u of sim.units) { u.dead = true; u.inactive = true; } for (const q of sim.squads) { q.alive = false; q.inactive = true; q.unitIds = []; }
const mine = [];
[['yuanyang', 0, -22, 0], [foe, 1, 22, Math.PI]].forEach(([k, t, z, f]) => { const sq = sim.createSquad(k, t, -1, 0, z, f); for (const id of sq.unitIds) mine.push(id); });
const N0 = [0, 1].map(t => mine.filter(id => sim.units[id].team === t).length);
sim.phase = 1; sim.battleTick = sim.tick; const SQ = sim.squads.filter(q => q.alive && !q.inactive);
function general() { for (const q of SQ) { if (!q.alive) continue; const e = SQ.find(r => r.alive && r.team !== q.team); if (!e) continue; q.order = S.ORD_CHARGE; q.tx = e.cx; q.tz = e.cz; q.facing = Math.atan2(e.cx - q.cx, e.cz - q.cz); } }
let ent = 0, entFar = 0, kills = 0, spearK = 0, spearKpin = 0, brushK = 0, maxRun = 0, maxFrac = 0, end = -1; const run = {}, hist = {};
const locked = (u) => (u.entT > 0) || u.st === 4 || (u.hrT > 0);
for (let t = 0; t < maxT; t++) {
  if (t % 30 === 0) general();
  const entB = {}; for (const id of mine) { const u = sim.units[id]; entB[id] = u.entT; }
  sim.step([]);
  for (const e of sim.events) {
    if (e.t === 'entangle') { ent++; const v = sim.units[e.id]; let bd = 99; for (const id of mine) { const b = sim.units[id]; if (b.dead || !b.def.brush) continue; bd = Math.min(bd, Math.hypot(b.x - v.x, b.z - v.z)); } if (bd > 2.8) entFar++; }
    if (e.t === 'death') { const v = sim.units[e.id], k = e.killer >= 0 ? sim.units[e.killer] : null; if (!k || k.team !== 0 || v.team !== 1) continue; kills++; if (k.role === 'spear' || k.role === 'trident') { spearK++; if (entB[v.id] > 0 || v.entT > 0) spearKpin++; } if (k.def.brush) brushK++; } }
  for (const id of mine) { const u = sim.units[id]; if (u.team !== 1 || u.dead) continue; const L = locked(u);
    run[id] = L ? (run[id] || 0) + 1 : 0; maxRun = Math.max(maxRun, run[id]);
    const h = hist[id] || (hist[id] = []); h.push(L ? 1 : 0); if (h.length > 60) h.shift(); if (h.length === 60) { const f = h.reduce((a, b) => a + b, 0) / 60; if (f > maxFrac) maxFrac = f; } }
  const al = [0, 1].map(tm => mine.filter(id => !sim.units[id].dead && !sim.units[id].wounded && sim.units[id].team === tm).length);
  if (al[0] <= N0[0] * 0.2 || al[1] <= N0[1] * 0.2) { end = t; break; }
}
const al = [0, 1].map(tm => mine.filter(id => !sim.units[id].dead && sim.units[id].team === tm).length);
console.log(JSON.stringify({ foe, seed, xc, secs: +((end < 0 ? maxT : end) / 30).toFixed(1), ended: end >= 0, duckWin: al[1] <= N0[1] * 0.2 && al[0] > N0[0] * 0.2, duckLost: N0[0] - al[0], foeLost: N0[1] - al[1], ent, entFar, kills, spearK, spearKpin, brushK, maxLockS: +(maxRun / 30).toFixed(2), maxLockFrac2s: +maxFrac.toFixed(2) }));
