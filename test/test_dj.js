// The East River missions, played headless: the hero is walked to each objective (and the file with him), enemy groups the
// phase must defeat are broken, a wounded man is got up; every mission must run all its phases and end in a win.
const fs = require('fs'), vm = require('vm'), path = require('path'); const R = path.join(__dirname, '..', 'src') + '/';
const src = ['dmath.js', 'sim.js', 'sim_maps.js', 'sim_coop.js', 'dj_maps.js', 'dj_missions.js'].map(f => fs.readFileSync(R + f, 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Uint8Array, performance, Map, Set }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM; this.DJ = DJ_MISSIONS;', ctx);
const S = ctx.SIM, only = process.argv[2]; let bad = 0;
for (const id of Object.keys(ctx.DJ)) { if (only && id !== only) continue;
  const M = ctx.DJ[id]; const t0 = Date.now();
  let sim; try { sim = new S.Sim({ seed: 7, battle: M.battle, mode: 'campaign', mission: id, players: [{ name: 'me', team: M.side | 0 }] }); } catch (e) { console.log(id, 'SETUP FAILED', e.message); bad++; continue; }
  const p = sim.players[0]; const log = []; let lastPh = -1, phT = 0, stuck = false;
  const walkTo = (x, z) => { const h = sim.units[p.heroId]; if (!h || h.dead) return; const dx = x - h.x, dz = z - h.z, d = Math.hypot(dx, dz); if (d < 1) return; const s = Math.min(d, 0.25); h.x += dx / d * s; h.z += dz / d * s; h.px = h.x; h.pz = h.z;
    const q = sim.squads[p.soldierSq]; if (q) for (const uid of q.unitIds) { const u = sim.units[uid]; if (u.dead || u.ctrl >= 0) continue; const ex = h.x - u.x, ez = h.z - u.z, e = Math.hypot(ex, ez); if (e > 6) { u.x += ex / e * 0.25; u.z += ez / e * 0.25; u.px = u.x; u.pz = u.z; } } };
  for (let t = 0; t < 30 * 60 * 14; t++) {
    const ph = sim.mv.ph; if (ph !== lastPh) { log.push(ph + '@' + (t / 30).toFixed(0) + 's'); lastPh = ph; phT = 0; } phT++;
    const P = M.phases[ph]; const o = P && P.obj; const walk = (O) => { if (!O) return null; if (O.reach || O.extract || O.hold) return O.reach || O.extract || O.hold; for (const s of O.all || []) { const k = walk(s); if (k) return k; } return null; };
    const zk = walk(o); if (zk) { const z = sim.missionZone(zk); if (z) { walkTo(z.x, z.z); const h = sim.units[p.heroId]; if (h && phT > 30 * 40 && phT % 300 === 0) { h.x = h.px = z.x; h.z = h.pz = z.z; } } } /* a real player finds his way round the houses; the harness is put there after a while */
    // stand in for the fighting: groups this phase must beat are broken a while into it; an officer is taken
    const defs = []; const dw = (O) => { if (!O) return; if (O.defeat) defs.push(...O.defeat); if (O.officer) defs.push(O.officer); (O.all || []).forEach(dw); }; dw(o);
    if (phT > 30 * 20) for (const g of defs) { const G = sim.mg[g]; if (!G) continue; const pl = sim.players[G.p]; for (const sid of pl.squads) for (const uid of sim.squads[sid].unitIds) { const u = sim.units[uid]; if (!u.dead && !u.inactive && sim.rng.next() < 0.02) { u.hp = 0; sim.kill(u, 0, 0, 0, 'test', -1); } } const hh = sim.units[pl.heroId]; if (hh && !hh.dead && phT > 30 * 30 && G.G.wound) hh.hp = Math.min(hh.hp, hh.def.hp * 0.3); else if (hh && !hh.dead && phT > 30 * 30) { hh.hp = 0; sim.kill(hh, 0, 0, 0, 'test', -1); } }
    for (const u of sim.units) if (u.wounded && !u.dead && u.team === M.side && u.ctrl < 0) { u.wounded = false; u.aided = true; }
    const h = sim.units[p.heroId]; if (h && h.hp < h.def.hp * 0.5) h.hp = h.def.hp; // the hero does not die in the harness
    sim.step([[0, 0, 0, 0, 0, 0, []]]);
    if (sim.mwin !== undefined && sim.mwin >= 0) break; if (sim.winner >= 0) break;
    if (phT > 30 * 60 * 4) { stuck = true; break; } }
  const res = sim.mwin !== undefined && sim.mwin >= 0 ? sim.mwin : sim.winner;
  const ok = res === (M.side | 0) && !stuck; if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${id.padEnd(8)} phases ${log.join(' ')}  result ${res}${stuck ? ' STUCK in phase ' + sim.mv.ph + ' (' + M.phases[sim.mv.ph].title + ')' : ''}  ${Date.now() - t0} ms`);
}
process.exit(bad ? 1 : 0);
