// node test/maps_sim.js [keys] : every battlefield built twice from the same seed and stepped 300 ticks with the same inputs
// must hash the same (determinism), and nobody may start inside a collider or in deep water.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js', 'sim_coop.js', 'sim_maps.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Uint8Array, performance }; vm.createContext(ctx);
vm.runInContext(src + '\nthis.SIM = SIM;', ctx); const S = ctx.SIM;
const keys = process.argv[2] ? process.argv[2].split(',') : Object.keys(S.BATTLES);
let bad = 0;
for (const b of keys) {
  const mk = () => new S.Sim({ seed: 77, battle: b, mode: 'grand', players: [{ name: 'A', team: 0, army: ['samurai', 'rifle_imp', 'cavalry'] }, { name: 'B', team: 1, army: ['shinsengumi', 'archer'] }] });
  let s1, s2; try { s1 = mk(); s2 = mk(); } catch (e) { console.log(b, 'BUILD ERROR', e.message, (e.stack || '').split('\n')[1]); bad++; continue; }
  const inside = []; for (const u of s1.units) { if (u.dead) continue; for (const bx of s1.boxes) if (bx.hw > 0.1 && Math.abs(u.x - bx.x) < bx.hw && Math.abs(u.z - bx.z) < bx.hd) { inside.push([u.type, bx.kind, +u.x.toFixed(0), +u.z.toFixed(0)]); break; } if (S.waterAt(u.x, u.z) === 1) inside.push([u.type, 'water', +u.x.toFixed(0), +u.z.toFixed(0)]); }
  for (let t = 0; t < 300; t++) { const inp = [[t % 7 === 0 ? S.KEY_W : 0, (t * 300) % 65536, 0, t % 11 === 0 ? S.A_ATK : 0, 0, 0, []], [0, 0, 0, 0, 0, 0, []]]; s1.step(inp); s2.step(inp); }
  const ok = s1.hash() === s2.hash();
  console.log((ok && !inside.length ? 'ok  ' : 'BAD ') + b.padEnd(10), 'boxes', s1.boxes.length, 'obstacles', s1.obstacles.length, 'objectives', s1.objectives.length, ok ? '' : 'HASH MISMATCH', inside.length ? 'spawned inside: ' + JSON.stringify(inside.slice(0, 4)) : '');
  if (!ok || inside.length) bad++;
}
console.log(bad ? 'FAIL ' + bad : 'all maps ok');
