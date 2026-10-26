// Anti-bunching metrics harness: node test/zbunch.js <scenario sq|spear|co4> <seed> [xc 1|0] [maxSec]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, scen = process.argv[2] || 'sq', seed = +process.argv[3] || 1, xc = (process.argv[4] || '1') === '1', maxT = (+process.argv[5] || 150) * 30;
const sim = new S.Sim({ seed, players: [], xcombat: xc });
for (const u of sim.units) { u.dead = true; u.inactive = true; } for (const q of sim.squads) { q.alive = false; q.inactive = true; q.unitIds = []; }
const own = [-1, -1];
const SC = { sq: [['samurai'], ['shinsengumi']], spear: [['ashigaru'], ['ronin']], co4: [['samurai', 'ashigaru', 'samurai', 'ashigaru'], ['shinsengumi', 'ronin', 'horokutai', 'shinsengumi']] }[scen];
const mine = [];
for (let t = 0; t < 2; t++) SC[t].forEach((k, i) => { const n = SC[t].length; const sq = sim.createSquad(k, t, own[t], (i - (n - 1) / 2) * 16, t === 0 ? -22 : 22, t === 0 ? 0 : Math.PI); for (const id of sq.unitIds) mine.push(id); });
const N0 = [0, 1].map(t => mine.filter(id => sim.units[id].team === t).length);
let contact = -1, end = -1, samples = 0, crowd = 0, crowdN = 0, apM = 0, apN = 0, apMax = 0, front = 0, wait = 0, other = 0, apHist = [0, 0, 0, 0, 0, 0], gaps = 0, gapN = 0;
const hashes = []; sim.phase = 1; sim.battleTick = sim.tick;
const SQ = sim.squads.filter(q => q.alive && !q.inactive);
function general() { for (const q of SQ) { if (!q.alive) continue; let e = null, bd = 1e18; for (const r of SQ) { if (!r.alive || r.team === q.team) continue; const d = Math.hypot(r.cx - q.cx, r.cz - q.cz); if (d < bd) { bd = d; e = r; } } if (!e) continue; q.order = S.ORD_CHARGE; q.tx = e.cx; q.tz = e.cz; q.facing = Math.atan2(e.cx - q.cx, e.cz - q.cz); } }
for (let t = 0; t < maxT; t++) {
  if (t % 30 === 0) general(); sim.step([]);
  if (t % 60 === 0) hashes.push(sim.hash());
  const al = [0, 1].map(tm => mine.filter(id => !sim.units[id].dead && sim.units[id].team === tm).length);
  if (contact < 0) { for (const id of mine) { const u = sim.units[id]; if (u.dead || u.target < 0) continue; const v = sim.units[u.target]; if (Math.hypot(v.x - u.x, v.z - u.z) < u.def.reach + 0.5) { contact = t; break; } } }
  if (contact >= 0 && end < 0 && (al[0] <= N0[0] * 0.2 || al[1] <= N0[1] * 0.2)) { end = t; break; }
  if (contact >= 0 && t % 6 === 0) {
    samples++; const ap = {};
    for (const id of mine) { const u = sim.units[id]; if (u.dead || u.target < 0 || u.wounded) continue; const v = sim.units[u.target]; if (v.dead) continue; const d = Math.hypot(v.x - u.x, v.z - u.z), R = u.def.reach;
      if (d > 7) continue;
      if (d <= R + 0.5) { front++; ap[v.id] = (ap[v.id] || 0) + 1; let nb = 0; for (const id2 of mine) { if (id2 === id) continue; const w = sim.units[id2]; if (w.dead) continue; if (Math.hypot(w.x - u.x, w.z - u.z) < 1.2) nb++; } crowd += nb; crowdN++; }
      else if (d <= R + 3.2) wait++; else other++; }
    for (const k in ap) { apM += ap[k]; apN++; apMax = Math.max(apMax, ap[k]); apHist[Math.min(5, ap[k])]++; }
  }
}
const dur = ((end < 0 ? sim.tick : end) - contact) / 30; const dead = mine.filter(id => sim.units[id].dead).length;
const tot = front + wait + other || 1;
console.log(JSON.stringify({ scen, seed, xc, contactS: +(contact / 30).toFixed(1), fightS: +dur.toFixed(1), ended: end >= 0, dead, killPerS: +(dead / Math.max(1, dur)).toFixed(2), crowd12: +(crowd / Math.max(1, crowdN)).toFixed(2), attackersMean: +(apM / Math.max(1, apN)).toFixed(2), attackersMax: apMax, apHist: apHist.slice(1), front: +(front / tot).toFixed(2), wait: +(wait / tot).toFixed(2), other: +(other / tot).toFixed(2), hash: hashes.join(',').length + ':' + hashes.slice(-1)[0] }));
