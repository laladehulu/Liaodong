// node test/siege_sim.js [ticks] [seed] [team] : headless siege run, prints the flow of the siege
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
function mk() { const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx); return ctx.SIM; }
const T = +process.argv[2] || 2400, seed = +process.argv[3] || 7, team = +(process.argv[4] || 1);
function run(S, log) {
  const sim = new S.Sim({ seed, mode: 'assault', op: 'ningyuan_siege', players: [{ name: 'me', team, role: 'shield' }] });
  const ev = {}; const hs = [];
  for (let t = 0; t < T && sim.winner < 0; t++) { sim.step([[0, 0, 0, 0, 0, 0, [], 0]]); for (const e of sim.events) { ev[e.t] = (ev[e.t] || 0) + 1; if (log && /^sg(stage|fill|dock|breach|hole|engine)$|^mend$/.test(e.t)) console.log((t / 30).toFixed(0) + 's', e.t, e.stage !== undefined ? e.stage : '', e.kind || e.text || ''); }
    if (log && t % 600 === 0) { const sg = sim.sg; console.log((t / 30).toFixed(0) + 's sector', sim.sector, 'gate', sg.gateHp, 'eng', sg.engines.map(e => e.kind[0] + ':' + Math.round(e.z) + '/' + e.hp + '/p' + e.push).join(' '), 'lad', sg.lads.map(L => L.up ? 'U' : Math.round(L.prog)).join(','), 'holes', sg.holes.map(L => L.up ? 'U' : Math.round(L.prog)).join(','), 'alive', sim.teamAlive.map(a => a.length), 'tk', sim.tickets); }
    if (t % 300 === 0) hs.push(sim.hash()); }
  return { sim, ev, hs };
}
const a = run(mk(), true);
console.log('events', JSON.stringify(Object.fromEntries(Object.entries(a.ev).filter(([k]) => /^sg|mend|breach/.test(k)))));
if (process.argv[5] === 'det') { const b = run(mk(), false); console.log('determinism', JSON.stringify(a.hs) === JSON.stringify(b.hs) ? 'OK' : 'MISMATCH'); }
