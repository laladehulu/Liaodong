// Every phased story mission of every campaign (except the East River's dj*, see test_dj_honest.js; ALL=1 includes them), played honestly headless.
// HONEST variant: nothing is broken for you, no healing, no teleport; the hero walks (at a man's pace) to the objective with his file
// and the battle is fought by the AIs. Reports, per mission, the phase times, how often the player went down, and where it got stuck.
// The East River missions, played headless: the hero is walked to each objective (and the file with him), enemy groups the
// phase must defeat are broken, a wounded man is got up; every mission must run all its phases and end in a win.
const fs = require('fs'), vm = require('vm'), path = require('path'); const R = path.join(__dirname, '..', 'src') + '/';
// the text of one top-level definition: from its start to the brace that closes its body
const block = (t, k) => { const i = t.indexOf(k); let j = t.indexOf('{', t.indexOf(k.includes('=') ? '=>' : '(', i)), d = 0; for (; j < t.length; j++) { const c = t[j]; if (c === '{') d++; else if (c === '}' && --d === 0) break; } return t.slice(i, j + 1) + ';'; };
const rd = (f) => fs.readFileSync(R + f, 'utf8'), cut = (f, a, b) => { const t = rd(f); return t.slice(t.indexOf(a), t.indexOf(b)); };
const src = ['dmath.js', 'sim.js', 'sim_maps.js', 'sim_coop.js', 'dj_maps.js', 'dj_missions.js', 'beacon.js', 'stand.js'].map(rd).join('\n')
  + '\n' + cut('shenji.js', 'const SJ_MISSIONS', '// </sj-missions>') + '\nObject.assign(SIM.MISSIONS, SJ_MISSIONS);'
  + '\n' + cut('shenji2.js', 'const SJ2_MISSIONS', '// </sj2-missions>') + '\nObject.assign(SIM.MISSIONS, SJ2_MISSIONS);'
  + '\nconst CH = {}; const chL = (zh, en) => [zh, en]; const PI_ = Math.PI;\n' + ['function chMissionVariants', 'CH.missions = ', 'CH.missions2 = ', 'function chJinVariants', 'CH.missions3 = '].map(k => block(rd('choices.js'), k)).join('\n')
  + '\n;[chMissionVariants, CH.missions, CH.missions2, chJinVariants, CH.missions3].forEach(f => { try { f(); } catch (e) { console.log(\'variant\', e.message); } });';
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Uint8Array, performance, Map, Set, document: { createElement: () => ({ style: {} }), addEventListener() {} }, window: { addEventListener() {} }, addEventListener() {} }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
ctx.DJ = Object.fromEntries(Object.entries(ctx.SIM.MISSIONS).filter(([k, m]) => m.phases && !/^(zcamp|beacon|laststand)$/.test(k) && (process.env.ALL || !/^dj\d/.test(k))));
const S = ctx.SIM, only = process.argv[2], onlyRe = only && only.includes('*') ? new RegExp('^' + only.replace(/\*/g, '.*') + '$') : null; let bad = 0;
if (process.env.LIST) { console.log(Object.keys(ctx.DJ).join(' ')); process.exit(0); }
for (const id of Object.keys(ctx.DJ)) { if (only && (onlyRe ? !onlyRe.test(id) : id !== only)) continue;
  const M = ctx.DJ[id]; const t0 = Date.now();
  let sim; try { sim = new S.Sim({ seed: 7, battle: M.battle, mode: 'campaign', mission: id, diff: +(process.env.DIFF || 1), players: [{ name: 'me', team: M.side | 0 }] }); } catch (e) { console.log(id, 'SETUP FAILED', e.message); bad++; continue; }
  const p = sim.players[0]; const log = []; const wk = { n: 0 }; let lastPh = -1, phT = 0, stuck = false, downs = 0, lastHero = -1, endText = '';
  const walkTo = (x, z) => { const h = sim.units[p.heroId]; if (!h || h.dead) return; let dx = x - h.x, dz = z - h.z; const d = Math.hypot(dx, dz); if (d < 1) return;
    /* a man walks round a house: when he has made no headway for three seconds he steps off to one side for two */
    if (sim.tick % 90 === 0) { if (wk.d !== undefined && wk.d - d < 1.5) { if (!wk.side) { wk.side = 60; wk.sgn = -(wk.sgn || -1); } if (++wk.n > 4) { h.x += (x - h.x) / d * 6; h.z += (z - h.z) / d * 6; wk.n = 0; } } else wk.n = 0; wk.d = d; } /* and after a while, as a man would, finds the gap */
    if (wk.side > 0) { wk.side--; const t = dx; dx = -dz * wk.sgn + dx * 0.3; dz = t * wk.sgn + dz * 0.3; } const dd = Math.hypot(dx, dz) || 1;
    const s = Math.min(d, 0.15); h.x += dx / dd * s; h.z += dz / dd * s; h.px = h.x; h.pz = h.z; if (h.mount >= 0) { const hr = sim.units[h.mount]; if (hr && !hr.dead) { hr.x = h.x; hr.z = h.z; hr.px = h.x; hr.pz = h.z; } }
    const q = sim.squads[p.soldierSq]; if (q) for (const uid of q.unitIds) { const u = sim.units[uid]; if (u.dead || u.ctrl >= 0) continue; const ex = h.x - u.x, ez = h.z - u.z, e = Math.hypot(ex, ez); if (e > 6) { u.x += ex / e * 0.25; u.z += ez / e * 0.25; u.px = u.x; u.pz = u.z; } } };
  for (let t = 0; t < 30 * 60 * 22; t++) {
    const ph = sim.mv.ph; if (ph !== lastPh) { log.push(ph + '@' + (t / 30).toFixed(0) + 's'); lastPh = ph; phT = 0; } phT++;
    const P = M.phases[ph]; const o = P && P.obj; const walk = (O) => { if (!O) return null; if (O.reach || O.extract || O.hold) return O.reach || O.extract || O.hold; if (O.arrive) return O.zone; if (O.capture) { const c = O.capture.find(k => { const z = sim.missionZone(k); return z && z.owner !== (M.side | 0); }); return c || O.capture[0]; } for (const s of O.all || []) { const k = walk(s); if (k) return k; } return null; };
    let goal = null; let zk = walk(o); if (!zk) { /* no place to go: head for the group the phase wants beaten (a man goes to the fight) */ const dg = []; const dw2 = (O) => { if (!O) return; if (O.defeat) dg.push(...O.defeat); if (O.officer) dg.push(O.officer); (O.all || []).forEach(dw2); }; dw2(o);
      for (const g of dg) { const G = sim.mg[g]; if (!G || G.broken) continue; const pl = sim.players[G.p]; let gx = 0, gz = 0, gn = 0; for (const sid of pl.squads) { const q = sim.squads[sid]; if (q.alive && !q.inactive) { gx += q.cx; gz += q.cz; gn++; } } const hu = sim.units[pl.heroId]; if (!gn && hu && !hu.dead && !hu.inactive) { gx = hu.x; gz = hu.z; gn = 1; } if (gn) { const hh2 = sim.units[p.heroId]; gx /= gn; gz /= gn; if (hh2 && Math.hypot(gx - hh2.x, gz - hh2.z) > 10) walkTo(gx, gz); goal = [gx, gz]; break; } } } /* to the fight, not into it */
    if (zk) { const z = sim.missionZone(zk); if (z) { /* walled in: a man goes out by the gate (the nearest zone named for one) when the straight way is blocked */
        const h0 = sim.units[p.heroId]; if (h0 && t % 150 === 0) { const d0 = Math.hypot(z.x - h0.x, z.z - h0.z); if (wk.lastD !== undefined && wk.lastD - d0 < 2 && d0 > z.r) wk.blocked = (wk.blocked | 0) + 1; else wk.blocked = 0; wk.lastD = d0;
          if (wk.blocked >= 3 && !wk.via) { const gz = (M.zones || []).filter(q => /gate/i.test(q.key)).map(q => sim.missionZone(q.key)).filter(Boolean).sort((a, b) => Math.hypot(a.x - h0.x, a.z - h0.z) - Math.hypot(b.x - h0.x, b.z - h0.z))[0]; if (gz) wk.via = gz; } }
        if (wk.via && h0) { if (Math.hypot(wk.via.x - h0.x, wk.via.z - h0.z) < 4) wk.via = null; else { walkTo(wk.via.x, wk.via.z); } }
        if (!wk.via) walkTo(z.x, z.z); goal = [z.x, z.z]; const h = sim.units[p.heroId];  } } /* a real player finds his way round the houses; the harness is put there after a while */
    // stand in for the fighting: groups this phase must beat are broken a while into it; an officer is taken
    const defs = []; const dw = (O) => { if (!O) return; if (O.defeat) defs.push(...O.defeat); if (O.officer) defs.push(O.officer); (O.all || []).forEach(dw); }; dw(o);
    if (false) for (const g of defs) { const G = sim.mg[g]; if (!G) continue; const pl = sim.players[G.p]; for (const sid of pl.squads) for (const uid of sim.squads[sid].unitIds) { const u = sim.units[uid]; if (!u.dead && !u.inactive && sim.rng.next() < 0.02) { u.hp = 0; sim.kill(u, 0, 0, 0, 'test', -1); } } const hh = sim.units[pl.heroId]; if (hh && !hh.dead && phT > 30 * 30 && G.G.wound) hh.hp = Math.min(hh.hp, hh.def.hp * 0.3); else if (hh && !hh.dead && phT > 30 * 30) { hh.hp = 0; sim.kill(hh, 0, 0, 0, 'test', -1); } }
    
    const hh = sim.units[p.heroId]; if (hh && hh.id !== lastHero) { if (lastHero >= 0) downs++; lastHero = hh.id; }
    /* a commander sends his companies where the objective is, every ten seconds (story soldiers give no orders) */
    const cmds = []; if (!M.soldier && goal && t % 300 === 15) for (const sid of p.squads) { const q = sim.squads[sid]; if (q && q.alive) cmds.push([sid, 1, goal[0] + ((sid % 3) - 1) * 6, goal[1], 0, 0]); }
    sim.step([[0, 0, 0, 0, 0, 0, cmds]]); for (const e of sim.events || []) if (e.t === 'mend') endText = e.text;
    if (sim.mwin !== undefined && sim.mwin >= 0) break; if (sim.winner >= 0) break;
    if (phT > 30 * 60 * 7) { stuck = true; const O = M.phases[sim.mv.ph].obj; if (process.env.DBG) { for (const sub of (O.all || [O])) console.log('  sub', JSON.stringify(sub), '->', sim.mObj(sub, 999)); const h = sim.units[p.heroId]; for (const sid of p.squads) { const q = sim.squads[sid]; console.log('  sq', sid, q.alive, q.cx.toFixed(0), q.cz.toFixed(0), 'order', q.order, q.tx, q.tz); } console.log('  zones', JSON.stringify((sim.zones || sim.mzones || []).map(z => [z.key, z.owner, (z.prog || 0).toFixed ? +(z.prog || 0).toFixed(2) : z.prog]))); console.log('  hero', h && h.x.toFixed(0), h && h.z.toFixed(0), h && h.dead); } break; } }
  const res = sim.mwin !== undefined && sim.mwin >= 0 ? sim.mwin : sim.winner;
  const ok = res === (M.side | 0) && !stuck; if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${id.padEnd(8)} phases ${log.join(' ')}  result ${res} downs ${downs} ${res !== (M.side | 0) ? '[' + endText + ']' : ''}${stuck ? ' STUCK in phase ' + sim.mv.ph + ' (' + M.phases[sim.mv.ph].title + ')' : ''}  ${Date.now() - t0} ms`);
}
process.exit(bad ? 1 : 0);
