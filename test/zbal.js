// Abudali chapter balance harness: node test/zbal.js <seed> <idle|follow|front|hero> [maxSec]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, beh = process.argv[3] || 'follow', maxT = (+process.argv[4] || 700) * 30;
const sim = new S.Sim({ seed, mode: 'campaign', mission: 'abudali', players: [{ name: 'me', team: 0, yyRole: 'shield' }] });
const p = sim.players[0]; const q0 = sim.squads[p.soldierSq]; const first = p.heroId; const file = q0.unitIds.filter(id => id !== first);
const ph = [], fdp = {}, kills = {}; let promoted = -1, wounded = -1, helped = false, died = 0, k = 0; var revived = 0; const dists = []; const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
for (let t = 0; t < maxT && sim.winner < 0; t++) {
  const h = sim.units[p.heroId]; let keys = 0, yaw = h ? h.yaw : 0, acts = 0, cmds = [];
  if (h && !h.dead && beh !== 'idle') {
    const q = sim.squads[p.soldierSq]; let tx = q.cx, tz = q.cz; const P = sim.mv.ph;
    if (beh === 'follow' || beh === 'front' || beh === 'hero') { const chief = sim.units[q.unitIds[0]]; if (chief && !chief.dead && P < 3) { tx = chief.x; tz = chief.z - 1.5; } }
    let enemy = null, ed = 1e9; for (const e of sim.teamAlive[1]) { const d = Math.hypot(e.x - h.x, e.z - h.z); if (d < ed) { ed = d; enemy = e; } }
    if (P >= 3) { tx = 0; tz = -136;
      if (beh === 'hero') { const w = wounded >= 0 ? sim.units[wounded] : null; if (w && !w.dead && w.helpedBy < 0) { tx = w.x; tz = w.z; if (Math.hypot(w.x - h.x, w.z - h.z) < 2.0 && (t & 7) === 0) acts |= S.A_KICK; }
        else { let n = 0, a = 0; for (const id of file) { const u = sim.units[id]; if (u.dead) continue; a++; if (Math.hypot(u.x - h.x, u.z - h.z) < 14) n++; } if (a && n < a * 0.6 && (t % 60) < 40) { tx = h.x; tz = h.z; } } } }
    const fightR = beh === 'follow' ? 2.6 : beh === 'front' ? 6 : 3.5;
    if (enemy && ed < fightR && (P < 3 || ed < 2.6)) { yaw = Math.atan2(enemy.x - h.x, enemy.z - h.z); if ((t % 14) < 7) acts |= S.A_ATK; if (ed > 2.2) keys |= S.KEY_W; }
    else { const dx = tx - h.x, dz = tz - h.z; if (Math.hypot(dx, dz) > 1.5) { keys |= S.KEY_W; yaw = Math.atan2(dx, dz); if (P >= 3 && beh !== 'hero') keys |= S.KEY_SPRINT; } }
  }
  sim.step([[keys, yq(yaw), 0, acts, 0, 0, cmds, 0]]);
  for (const e of sim.events) { if (e.t === 'mphase') ph.push(Math.round(sim.tick / 30)); if (e.t === 'zpromote') promoted = Math.round(sim.tick / 30); if (e.t === 'zwound') wounded = e.id; if (e.t === 'zhelp') helped = true; if (e.t === 'zdown') { k++; } if (e.t === 'zrevive') revived = (typeof revived === 'number' ? revived : 0) + 1; if (e.t === 'zcarry') died++; if (e.t === 'death' && file.includes(e.id)) { const P = sim.mv.ph; fdp[P] = (fdp[P] || 0) + 1; const kk = e.killer >= 0 ? sim.units[e.killer] : null; const kt = kk ? kk.type : e.cause; kills[kt] = (kills[kt] || 0) + 1; } }
}
const h = sim.units[p.heroId], z = sim.missionZone('mouth'); const won = sim.mwin === 0;
let out = 0, dead = 0, lost = 0; for (const id of file) { const u = sim.units[id]; if (u.dead) { dead++; continue; } const nearMe = h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < (won ? 26 : 12); const inZ = Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10; if ((nearMe || inZ) && !(u.wounded && u.helpedBy < 0)) out++; else lost++; }
const dPh = {}; for (const id of file) { const u = sim.units[id]; if (u.dead) { const k2 = 'x'; } }
console.log(JSON.stringify({ seed, beh, downs: k, revived, won, end: Math.round(sim.tick / 30), phases: ph, promoted, helped, died, out, dead, lost, of: file.length, fileDeathsByPhase: fdp, killers: kills, ming: sim.teamAlive[0].length, jin: sim.teamAlive[1].length }));
