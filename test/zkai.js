// Interlude (Kaiyuan road, 1619) harness: node test/zkai.js <seed> <idle|lead|reckless> [maxSec]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, beh = process.argv[3] || 'lead', maxT = (+process.argv[4] || 600) * 30;
const sim = new S.Sim({ seed, mode: 'campaign', mission: 'kaiyuan', players: [{ name: 'me', team: 0, yyRole: 'lead' }] });
const p = sim.players[0]; const q0 = sim.squads[p.soldierSq]; const first = p.heroId; const file = q0.unitIds.filter(id => id !== first);
const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const ph = []; let wounded = -1, helped = false, carry = 0, says = 0; const fdp = [0, 0, 0];
const folk = sim.players[sim.mg.folk.p].squads.flatMap(id => sim.squads[id].unitIds);
for (let t = 0; t < maxT && sim.winner < 0 && sim.mwin === undefined; t++) {
  const h = sim.units[p.heroId]; let keys = 0, yaw = h ? h.yaw : 0, acts = 0;
  if (h && !h.dead && beh !== 'idle') {
    const P = sim.mv.ph; let tx = 0, tz = -10;
    if (P === 2) { tx = 0; tz = -138; const w = wounded >= 0 ? sim.units[wounded] : null; if (beh === 'lead' && w && !w.dead && w.helpedBy < 0 && Math.hypot(w.x - h.x, w.z - h.z) < 40) { tx = w.x; tz = w.z; if (Math.hypot(w.x - h.x, w.z - h.z) < 2 && (t & 7) === 0) acts |= S.A_KICK; } }
    let enemy = null, ed = 1e9; for (const e of sim.teamAlive[1]) { const d = Math.hypot(e.x - h.x, e.z - h.z); if (d < ed) { ed = d; enemy = e; } }
    const fr = beh === 'reckless' ? 10 : 4;
    if (enemy && ed < fr && (P < 2 || ed < 2.6)) { yaw = Math.atan2(enemy.x - h.x, enemy.z - h.z); if ((t % 14) < 7) acts |= S.A_ATK; if (ed > 2.2) keys |= S.KEY_W; }
    else { const dx = tx - h.x, dz = tz - h.z; if (Math.hypot(dx, dz) > 1.5) { keys |= S.KEY_W; yaw = Math.atan2(dx, dz); } }
  }
  sim.step([[keys, yq(yaw), 0, acts, 0, 0, [], 0]]);
  for (const e of sim.events) { if (e.t === 'mphase') ph.push(Math.round(sim.tick / 30)); if (e.t === 'msay') says++; if (e.t === 'zwound') wounded = e.id; if (e.t === 'zhelp' && e.id === wounded) helped = true; if (e.t === 'zcarry') carry++;
    if (e.t === 'death' && file.includes(e.id)) fdp[Math.max(0, sim.mv.ph)]++; }
}
const h = sim.units[p.heroId], z = sim.missionZone('tieling'); const won = sim.mwin === 0; let out = 0, dead = 0, lost = 0;
for (const id of file) { const u = sim.units[id]; if (u.dead) { dead++; continue; } const ok = !(u.wounded && u.helpedBy < 0) && (h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < (won ? 26 : 12)) || Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10; if (ok) out++; else lost++; }
const folkAlive = folk.filter(id => !sim.units[id].dead).length;
console.log(JSON.stringify({ seed, beh, won, mwin: sim.mwin, rain: sim.rain, biome: sim.bdef.biome, end: Math.round(sim.tick / 30), phases: ph, says, helped, carry, out, dead, lost, of: file.length, deathsByPhase: fdp, folk: folkAlive + '/' + folk.length, alive: sim.teamAlive.map(a => a.length) }));
