// Every skirmish mode on many fields, AI against AI, headless: does each battle end, in reasonable time, without stalls?
// Reports per run: winner, minutes, kills, and STALL when nobody was hurt for three minutes while both sides stood.
// Usage: node test/test_modes.js [mode] [battle]
const fs = require('fs'), vm = require('vm'), path = require('path'); const R = path.join(__dirname, '..', 'src') + '/';
const src = ['dmath.js', 'sim.js', 'sim_maps.js', 'sim_coop.js', 'dj_maps.js', 'dj_missions.js', 'beacon.js', 'stand.js'].map(f => fs.readFileSync(R + f, 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Uint8Array, performance, Map, Set }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM; this.OPS = typeof OPS !== "undefined" ? OPS : {}; this.SCEN = typeof SCEN !== "undefined" ? SCEN : {};', ctx);
const S = ctx.SIM, B = Object.keys(S.BATTLES).filter(b => !S.BATTLES[b].hidden && !/^dj/.test(b));
const want = process.argv[2], wb = process.argv[3], MAXMIN = +(process.env.MIN || 15);
const runs = [];
for (const mode of ['standard', 'grand', 'chaos', 'officers', 'duel']) for (const b of B) runs.push({ mode, battle: b });
for (const op of Object.keys(S.OPS || {})) runs.push({ mode: "assault", op, battle: S.OPS[op].battle });
for (const sc of Object.keys(S.SCEN || {})) runs.push({ mode: 'heroes', scen: sc, battle: 'x' });
for (let ch = 0; ch < (S.STORY || []).length; ch++) runs.push({ mode: 'story', chapter: ch, battle: S.STORY[ch].battle || 'x', scen: 'ch' + ch });
for (const b of ['field', 'aizu', 'hakodate']) runs.push({ mode: 'siege', battle: b });
for (const b of ['field', 'sarhu']) runs.push({ mode: 'soldier', battle: b });
let bad = 0;
for (const r of runs) { if (want && r.mode !== want) continue; if (wb && r.battle !== wb && r.op !== wb && r.scen !== wb) continue;
  const t0 = Date.now(); let sim; try { sim = new S.Sim(Object.assign({ seed: 5, diff: 1, players: [], ai: [{ team: 0 }, { team: 1 }] }, r)); } catch (e) { console.log('SETUP', JSON.stringify(r), e.message); bad++; continue; }
  let lastHurt = 0, stall = 0, hp = -1; const hpSum = () => { let s = 0; for (const u of sim.units) if (!u.dead) s += u.hp; return s; };
  let t; for (t = 0; t < 30 * 60 * MAXMIN; t++) { sim.step([]); if (sim.winner >= 0 || (sim.mwin !== undefined && sim.mwin >= 0)) break;
    if (t % 300 === 0) { const h = hpSum(); if (h !== hp) { hp = h; lastHurt = t; } else if (t - lastHurt > 30 * 180) { stall = 1; break; } } }
  const kills = sim.units.filter(u => u.dead).length, alive = [0, 1].map(k => sim.units.filter(u => !u.dead && u.team === k).length);
  const won = sim.winner >= 0 ? sim.winner : sim.mwin; const flag = stall ? 'STALL' : (won === undefined || won < 0) ? 'NOEND' : 'ok';
  if (flag !== 'ok') bad++;
  console.log(`${flag.padEnd(5)} ${(r.mode + ' ' + (r.op || r.scen || r.battle)).padEnd(28)} winner ${won} at ${(t / 1800).toFixed(1)}min dead ${kills} alive ${alive.join('/')} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
process.exit(bad ? 1 : 0);
