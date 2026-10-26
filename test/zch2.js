// Chapter 2 (Hun River) harness: node test/zch2.js <seed> <idle|lead|reckless> [maxSec]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, beh = process.argv[3] || 'lead', maxT = (+process.argv[4] || 700) * 30;
const sim = new S.Sim({ seed, mode: 'campaign', mission: 'hunz', players: [{ name: 'me', team: 0, yyRole: 'lead' }] });
const p = sim.players[0]; const q0 = sim.squads[p.soldierSq]; const first = p.heroId; const file = q0.unitIds.filter(id => id !== first);
const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const ph = []; let wounded = -1, helped = false, carry = 0, promoted = -1; const fdp = [0, 0, 0, 0];
for (let t = 0; t < maxT && sim.winner < 0; t++) {
  const h = sim.units[p.heroId]; let keys = 0, yaw = h ? h.yaw : 0, acts = 0;
  if (h && !h.dead && beh !== 'idle') {
    const P = sim.mv.ph; let tx = 58, tz = -62;
    if (P === 1) { const z = sim.missionZone('sbridge'); tx = z.x; tz = z.z - 2; }
    if (P === 3) { tx = -62; tz = -134; if (h.z > -49 && Math.abs(h.x - 58) < 20) { tx = 58; tz = -46; if (Math.abs(h.x - 58) < 2) tz = -84; } else if (h.z > -80 && Math.abs(h.x - 58) < 20) { tx = 58; tz = -84; } const w = wounded >= 0 ? sim.units[wounded] : null; if (beh === 'lead' && w && !w.dead && w.helpedBy < 0 && Math.hypot(w.x - h.x, w.z - h.z) < 40) { tx = w.x; tz = w.z; if (Math.hypot(w.x - h.x, w.z - h.z) < 2 && (t & 7) === 0) acts |= S.A_KICK; }
      else if (beh === 'lead') { let n = 0, a = 0; for (const id of file) { const u = sim.units[id]; if (u.dead) continue; a++; if (Math.hypot(u.x - h.x, u.z - h.z) < 14) n++; } if (a && n < a * 0.6 && (t % 60) < 40) { tx = h.x; tz = h.z; } } }
    let enemy = null, ed = 1e9; for (const e of sim.teamAlive[1]) { const d = Math.hypot(e.x - h.x, e.z - h.z); if (d < ed) { ed = d; enemy = e; } }
    const fr = beh === 'reckless' ? 8 : 3;
    if (enemy && ed < fr && (P < 3 || ed < 2.6)) { yaw = Math.atan2(enemy.x - h.x, enemy.z - h.z); if ((t % 14) < 7) acts |= S.A_ATK; if (ed > 2.2) keys |= S.KEY_W; }
    else { const dx = tx - h.x, dz = tz - h.z; if (Math.hypot(dx, dz) > 1.5) { keys |= S.KEY_W; yaw = Math.atan2(dx, dz); } }
  }
  sim.step([[keys, yq(yaw), 0, acts, 0, 0, [], 0]]);
  if (process.env.DBG && t % 300 === 0 && sim.mv.ph >= 3) { const hh = sim.units[p.heroId]; console.log(Math.round(t / 30), 'me', hh && hh.x.toFixed(0), hh && hh.z.toFixed(0), hh && hh.dead, 'file', file.filter(id => !sim.units[id].dead).length); }
  for (const e of sim.events) { if (e.t === 'mphase') ph.push(Math.round(sim.tick / 30)); if (e.t === 'zpromote') promoted = Math.round(sim.tick / 30); if (e.t === 'zwound') wounded = e.id; if (e.t === 'zhelp' && e.id === wounded) helped = true; if (e.t === 'zcarry') carry++;
    if (e.t === 'death' && file.includes(e.id)) fdp[Math.max(0, sim.mv.ph)]++; }
}
const h = sim.units[p.heroId], z = sim.missionZone('road'); const won = sim.mwin === 0; let out = 0, dead = 0, lost = 0;
for (const id of file) { const u = sim.units[id]; if (u.dead) { dead++; continue; } const ok = (h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < (won ? 26 : 12)) || Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10; if (ok) out++; else lost++; }
console.log(JSON.stringify({ seed, beh, won, end: Math.round(sim.tick / 30), phases: ph, promoted, helped, carry, out, dead, lost, of: file.length, deathsByPhase: fdp, alive: sim.teamAlive.map(a => a.length), meRole: sim.units[first].role }));
