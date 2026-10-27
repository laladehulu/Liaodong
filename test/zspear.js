// Spear file vs swordsmen (xc): who wins, how, and does the file keep its shape? node test/zspear.js <seed> [maxSec]   SIMSRC= to compare
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, maxT = (+process.argv[3] || 120) * 30;
const sim = new S.Sim({ seed, mode: 'standard', battle: 'field', xcombat: true, players: [{ name: 'a', team: 0, army: ['ashigaru'] }, { name: 'b', team: 1, army: ['byakkotai'] }] });
sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
for (const p of sim.players) { const h = sim.units[p.heroId]; if (h) { h.dead = true; h.inactive = true; } const hs = sim.units[p.horseId]; if (hs) { hs.dead = true; hs.inactive = true; } }
const sp = sim.squads.find(q => q.type === 'ashigaru'), sw = sim.squads.find(q => q.type === 'byakkotai');
const place = (q, cx, cz, f) => { q.facing = f; q.tx = cx; q.tz = cz; q.order = S.ORD_HOLD; q.unitIds.forEach((id, i) => { const u = sim.units[id]; u.x = u.px = cx + ((i % 8) - 3.5) * 1.1; u.z = u.pz = cz - Math.floor(i / 8) * 1.2 * Math.cos(f); u.yaw = u.pyaw = f; u.hyaw = u.phyaw = f; }); };
place(sp, 0, -20, 0); place(sw, 0, 16, Math.PI);
let thrusts = 0, thrustHits = 0, swordHits = 0, jammed = 0, tip = 0, spearKicks = 0, lateral = 0, latN = 0, contact = -1, end = -1;
for (let t = 0; t < maxT && sim.winner < 0; t++) { if (t === 15) { sw.order = S.ORD_CHARGE; sw.tx = sp.cx; sw.tz = sp.cz; sp.order = S.ORD_HOLD; }
  sim.step([[0, 0, 0, 0, 0, 0, [], 0], [0, 0, 0, 0, 0, 0, [], 0]]);
  for (const ev of sim.events) { const a = ev.att >= 0 ? sim.units[ev.att] : null; if (ev.t === 'swing' && sim.units[ev.id].squad === sp.id) thrusts++; if (ev.t === 'hit' && a && a.squad === sp.id) thrustHits++; if (ev.t === 'hit' && a && a.squad === sw.id) swordHits++; if (ev.t === 'hitq') { if (ev.q === 'jammed') jammed++; if (ev.q === 'tip') tip++; } if (ev.t === 'kick' && sim.units[ev.id].squad === sp.id) spearKicks++; }
  const alSp = sp.unitIds.filter(id => !sim.units[id].dead).length, alSw = sw.unitIds.filter(id => !sim.units[id].dead).length;
  if (contact < 0 && Math.abs(sp.cz - sw.cz) < 6) contact = t; if (contact >= 0 && end < 0 && (alSp <= 2 || alSw <= 2)) { end = t; break; }
  if (contact >= 0 && t % 10 === 0) { let sx = 0, n = 0; for (const id of sp.unitIds) { const u = sim.units[id]; if (u.dead) continue; sx += Math.abs(u.x - u.slotX); n++; } if (n) { lateral += sx / n; latN++; } }
}
const alSp = sp.unitIds.filter(id => !sim.units[id].dead).length, alSw = sw.unitIds.filter(id => !sim.units[id].dead).length;
console.log(JSON.stringify({ seed, contactS: +(contact / 30).toFixed(1), fightS: +(((end < 0 ? sim.tick : end) - contact) / 30).toFixed(1), spearsLeft: alSp + '/' + sp.unitIds.length, swordsLeft: alSw + '/' + sw.unitIds.length, thrusts, thrustHits, swordHits, jammed, tip, spearKicks, spearOffSlotM: +(lateral / Math.max(1, latN)).toFixed(2), hash: sim.hash() }));
