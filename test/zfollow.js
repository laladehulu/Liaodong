// Follow-order pace: the player sprints across the field; how far behind does his company fall? node test/zfollow.js [seed]  SIMSRC= to compare
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1;
const sim = new S.Sim({ seed, mode: 'standard', battle: 'field', players: [{ name: 'me', team: 0, army: ['samurai'] }, { name: 'foe', team: 1, army: ['samurai'] }] });
sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
const me = sim.players[0], h = sim.units[me.heroId]; const hs = sim.units[me.horseId]; if (hs) { hs.dead = true; hs.inactive = true; } h.mounted = false; h.mount = -1;
const sq = sim.squads.find(q => q.team === 0 && q.type === 'samurai'); sq.order = S.ORD_FOLLOW; sq.owner = 0; sq.cz0 = sq.cz + 8;
for (const q of sim.squads) if (q.team === 1) { q.unitIds.forEach(id => { const u = sim.units[id]; u.x = u.px = 300; u.z = u.pz = 300; }); }
h.x = h.px = sq.cx; h.z = h.pz = sq.cz + 8; h.y = h.py = S.terrainH(h.x, h.z); const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const gaps = [];
for (let t = 0; t < 30 * 14; t++) { const keys = t < 30 * 10 ? (S.KEY_W | S.KEY_SPRINT) : 0; sim.step([[keys, yq(0), 0, 0, 0, 0, [], 0], [0, 0, 0, 0, 0, 0, [], 0]]);
  if (t % 30 === 0) { let sx = 0, sz = 0, n = 0; for (const id of sq.unitIds) { const u = sim.units[id]; if (u.dead || u === h) continue; sx += u.x; sz += u.z; n++; } gaps.push(+Math.hypot(sx / n - h.x, sz / n - h.z).toFixed(1)); } }
console.log(JSON.stringify({ seed, gapEachSecond: gaps, heroRan: +(h.z - sq.cz0).toFixed(0), heroSpeed: +(h.speedNow || 0).toFixed(1), fat: Math.round(h.fat || 0) }));
