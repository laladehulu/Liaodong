// wolf-brush vs cavalry: node test/zduel.js <srcdir> <seed>
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = process.argv[2], seed = +process.argv[3] || 1;
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM; const sim = new S.Sim({ seed, mode: 'standard', battle: 'field', players: [{ name: 'a', team: 0, army: ['yuanyang'] }, { name: 'b', team: 1, army: ['cavalry', 'cavalry', 'cavalry'] }] });
sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
const yy = sim.squads.find(q => q.type === 'yuanyang'), cavs = sim.squads.filter(q => q.type === 'cavalry'), cav = cavs[0];
for (const p of sim.players) { const h = sim.units[p.heroId]; if (h) { h.x = h.px = p.team ? 140 : -140; h.z = h.pz = p.team ? 140 : -140; } const hs = sim.units[p.horseId]; if (hs) { hs.x = hs.px = p.team ? 145 : -145; hs.z = hs.pz = 140; } }
const place = (q, cx, cz, f) => { q.facing = f; q.tx = cx; q.tz = cz; q.order = S.ORD_HOLD; q.unitIds.forEach((id, i) => { const u = sim.units[id]; u.x = u.px = cx + ((i % 4) - 1.5) * 1.6; u.z = u.pz = cz - Math.floor(i / 4) * 1.6 * Math.cos(f); u.yaw = u.pyaw = f; u.hyaw = u.phyaw = f; }); };
place(yy, -60, -60, 0); cavs.forEach((c, i) => place(c, -60 + (i - 1) * 9, -10, Math.PI));
const ev = {}; let kc = 0, ky = 0;
for (let t = 0; t < 30 * 25; t++) { if (t % 30 === 0) { for (const c of cavs) { c.order = S.ORD_CHARGE; c.tx = yy.cx; c.tz = yy.cz; } yy.order = S.ORD_HOLD; }
  sim.step([[0, 0, 0, 0, 0, 0, [], 0], [0, 0, 0, 0, 0, 0, [], 0]]); for (const e of sim.events) { ev[e.t] = (ev[e.t] || 0) + 1; if (e.t === 'death') { const u = sim.units[e.id]; if (cavs.some(c => c.id === u.squad)) kc++; if (u.squad === yy.id) ky++; } } }
console.log(JSON.stringify({ src: path.basename(dir), seed, cavDead: kc, duckDead: ky, brushsnare: ev.brushsnare || 0, spearwall: ev.spearwall || 0, trample: ev.trample || 0 }));
