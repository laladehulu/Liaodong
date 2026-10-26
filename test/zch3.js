// Chapter 3 (Ningyuan) harness: node test/zch3.js <seed> <idle|lead|reckless> [maxSec]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, beh = process.argv[3] || 'lead', maxT = (+process.argv[4] || 700) * 30;
const sim = new S.Sim({ seed, mode: 'campaign', mission: 'nyz', players: [{ name: 'me', team: 0, yyRole: 'lead' }] });
const p = sim.players[0]; const q0 = sim.squads[p.soldierSq]; const first = p.heroId; const file = q0.unitIds.filter(id => id !== first);
const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const ph = []; let wounded = -1, helped = false, carry = 0, downs = 0, revs = 0, pushes = 0; const fdp = [0, 0, 0, 0, 0]; const sg = {}; const log = []; const why = {};
for (let t = 0; t < maxT && sim.winner < 0; t++) {
  const h = sim.units[p.heroId]; let keys = 0, yaw = h ? h.yaw : 0, acts = 0;
  if (h && !h.dead && beh !== 'idle') {
    let tx = -25, tz = 44.5;
    if (h.z > 47.5 && Math.abs(h.x + 12) > 2) { tx = -12; tz = 56; } else if (h.z > 47.5) { tx = -12; tz = 45; }
    const w = wounded >= 0 ? sim.units[wounded] : null;
    if (beh === 'lead' && w && !w.dead && w.wounded && w.helpedBy < 0 && Math.hypot(w.x - h.x, w.z - h.z) < 30) { tx = w.x; tz = w.z; if (Math.hypot(w.x - h.x, w.z - h.z) < 2 && (t & 7) === 0) acts |= S.A_KICK; }
    if (sim.sg && h.z > 41 && h.z < 47.5) for (const L of sim.sg.lads) if (L.up && Math.abs(L.x - h.x) < 12) { tx = L.x; tz = 42.5; if (Math.abs(L.x - h.x) < 2 && (t & 15) === 0) { acts |= S.A_KICK; pushes++; } break; }
    let enemy = null, ed = 1e9; for (const e of sim.teamAlive[1]) { const d = Math.hypot(e.x - h.x, e.z - h.z); if (d < ed) { ed = d; enemy = e; } }
    const fr = beh === 'reckless' ? 8 : 3;
    if (enemy && ed < fr) { yaw = Math.atan2(enemy.x - h.x, enemy.z - h.z); if ((t % 14) < 7) acts |= S.A_ATK; if (ed > 2.2) keys |= S.KEY_W; }
    else { const dx = tx - h.x, dz = tz - h.z; if (Math.hypot(dx, dz) > 1.5) { keys |= S.KEY_W; yaw = Math.atan2(dx, dz); } }
  }
  sim.step([[keys, yq(yaw), 0, acts, 0, 0, [], 0]]);
  if (process.env.DBG && t % 600 === 0) { const hh = sim.units[p.heroId]; const g = sim.sg; console.log(Math.round(t / 30), 'ph', sim.mv.ph, 'me', hh && hh.x.toFixed(0), hh && hh.z.toFixed(1), hh && hh.y.toFixed(1), 'file', file.filter(id => !sim.units[id].dead).length, 'jin', sim.teamAlive[1].length, 'ming', sim.teamAlive[0].length, 'sec', sim.sector, 'lads', g.lads.map(L => L.up ? 'U' : L.prog | 0).join(','), 'holes', g.holes.map(L => L.up ? 'U' : L.prog | 0).join(','), 'eng', g.engines.map(e => e.kind[0] + (e.hp | 0) + '@' + (e.z | 0)).join(' '), 'zones', sim.objectives.map(o => o.key + ':' + o.owner + '/' + (o.ctrl | 0)).join(' ')); }
  for (const e of sim.events) { if (e.t === 'mphase') ph.push(Math.round(sim.tick / 30)); if (e.t === 'zwound') wounded = e.id; if (e.t === 'zhelp' && e.id === wounded) helped = true; if (e.t === 'zcarry') carry++; if (e.t === 'zdown') downs++; if (e.t === 'zrevive') revs++;
    if (/^sg(ladder|hole|oil|stone|fill|engine|saltpeter|breach)$/.test(e.t)) { const k = e.t + (e.t === 'sgladder' ? (e.up ? '+' : '-') : ''); sg[k] = (sg[k] || 0) + 1; }
    if (e.t === 'mend') log.push(e.text);
    if (e.t === 'death' && file.includes(e.id)) { fdp[Math.max(0, sim.mv.ph)]++; const k = sim.units[e.killer]; const key = e.cause + ':' + (k ? (k.squad >= 0 ? sim.squads[k.squad].type : k.type) + (k.team === 0 ? '(OURS)' : '') + ' d' + Math.round(Math.hypot(k.x - sim.units[e.id].x, k.z - sim.units[e.id].z)) : 'none'); why[key] = (why[key] || 0) + 1; } }
}
const won = sim.mwin === 0; let dead = 0; for (const id of file) if (sim.units[id].dead) dead++;
console.log(JSON.stringify({ seed, beh, won, end: Math.round(sim.tick / 30), phases: ph, helped, carry, downs, revs, pushes, dead, of: file.length, deathsByPhase: fdp, alive: sim.teamAlive.map(a => a.length), meDead: sim.units[first].dead, sg, log, why, kills: p.kills }));
