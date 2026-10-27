// What each arm does that no other does (xc): node test/zweapons.js [seed]   SIMSRC= to compare
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js', 'sim_maps.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1;
function duel(mine, foe, setup, label, secs) {
  const sim = new S.Sim({ seed, mode: 'standard', battle: 'field', xcombat: true, players: [{ name: 'a', team: 0, army: [mine] }, { name: 'b', team: 1, army: [foe] }] });
  sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) { p.ready = true; const h = sim.units[p.heroId]; if (h) { h.dead = true; h.inactive = true; } const hs = sim.units[p.horseId]; if (hs) { hs.dead = true; hs.inactive = true; } }
  const A = sim.squads.find(q => q.team === 0 && q.alive && !q.inactive), B = sim.squads.find(q => q.team === 1 && q.alive && !q.inactive);
  const place = (q, cz, f) => { q.facing = f; q.tx = 0; q.tz = cz; q.order = S.ORD_HOLD; q.unitIds.forEach((id, i) => { const u = sim.units[id]; u.x = u.px = ((i % 6) - 2.5) * 1.3; u.z = u.pz = cz; u.y = u.py = S.terrainH(u.x, u.z); u.yaw = u.pyaw = f; u.hyaw = u.phyaw = f; }); };
  place(A, -12, 0); place(B, 10, Math.PI); if (setup) setup(sim, A, B);
  const ev = {};
  for (let t = 0; t < (secs || 45) * 30 && sim.winner < 0; t++) { if (t === 15) { B.order = S.ORD_CHARGE; B.tx = A.cx; B.tz = A.cz; A.order = S.ORD_HOLD; }
    sim.step([[0, 0, 0, 0, 0, 0, [], 0], [0, 0, 0, 0, 0, 0, [], 0]]); for (const e of sim.events) if (/^(shove|spearwall|brushsweep|trap|horsedown|guardcrush|posturebreak)$/.test(e.t)) ev[e.t] = (ev[e.t] || 0) + 1; }
  const al = [A, B].map(q => q.unitIds.filter(id => !sim.units[id].dead).length);
  console.log(label.padEnd(30), JSON.stringify(ev).padEnd(60), 'left', al.join(' v '));
}
duel('samurai', 'byakkotai', null, 'shield dao vs Mongols');
duel('ashigaru', 'byakkotai', null, 'spear file vs rushing swords');
duel('ashigaru', 'cavalry', null, 'spear file vs horse', 60);
duel('jigen', 'cavalry', null, 'horse-cutters vs horse', 60);
duel('yuanyang', 'byakkotai', null, 'duck team vs swords', 60);
duel('rifle_spencer', 'byakkotai', (sim, A) => { for (const id of A.unitIds) { const u = sim.units[id]; u.club = true; u.ammo = 0; } }, 'gun as club vs swords');
