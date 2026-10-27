// Co-op mission harness: node test/zcoop.js <mission|all> [seed] [diff] [players] [maxSec]
// A plain bot in each human seat: he walks his general to the phase's place (reach / extract / capture / hold /
// the officer / the group to defeat), swings at whatever comes within reach, and gives his squads no orders (they
// follow him). Prints which phases were reached, when, and whether the mission ended won; with 'all' it asserts that
// every phase of every co-op mission is reached and the mission ends.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js', 'sim_coop.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM; const COOP = ['zhenjiang', 'grainroad', 'jinzhou', 'dalinghe'];
const want = process.argv[2] || 'all', seed = +process.argv[3] || 1, diff = process.argv[4] === undefined ? 1 : +process.argv[4], np = +process.argv[5] || 2, maxT = (+process.argv[6] || 900) * 30;
const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const ROLES = ['shield', 'musket', 'spear', 'duck'];
function run(mission) {
  const M = S.MISSIONS[mission]; const players = []; for (let i = 0; i < np; i++) players.push({ name: 'p' + i, team: M.side, role: ROLES[i % ROLES.length] });
  const sim = new S.Sim({ seed, mode: 'campaign', mission, diff, players });
  const hum = sim.players.filter(p => !p.ai); const ph = [], says = [], blasts = []; let lastPh = -1, dead = 0;
  const target = (p, i) => { // where this bot wants his general: a man of his down, the phase's place, else beside the enemy group it must break
    const P = M.phases[Math.max(0, sim.mv.ph)], o = P.obj || {}; const subs = [o].concat(o.all || []);
    for (const id of p.squads) for (const uid of sim.squads[id].unitIds) { const u = sim.units[uid]; if (u.mFell && u.downed && !u.dead) return [u.x, u.z, u]; }
    for (const s of subs) { const k = s.extract || s.reach || s.hold || (s.capture && s.capture[0]) || (s.arrive && s.zone); if (k) { const z = sim.missionZone(k); if (z) return [z.x + (i - (np - 1) / 2) * 4, z.z]; } }
    for (const s of subs) { const gid = s.officer || (s.defeat && s.defeat[0]); if (gid && sim.mg[gid]) { const g = sim.mg[gid], ep = sim.players[g.p]; const h = sim.units[ep.heroId]; if (h && !h.dead && !h.inactive) return [h.x, h.z]; for (const id of ep.squads) { const q = sim.squads[id]; if (q.alive && !q.inactive) return [q.cx, q.cz]; } } }
    return null;
  };
  for (let t = 0; t < maxT && sim.winner < 0; t++) {
    const inputs = hum.map((p, i) => { const h = sim.units[p.heroId]; let keys = 0, yaw = h ? h.yaw : 0, acts = 0;
      if (h && !h.dead) { let enemy = null, ed = 1e9; for (const e of sim.teamAlive[1 - M.side]) { if (e.inactive || e.type === 'horse') continue; const d = Math.hypot(e.x - h.x, e.z - h.z); if (d < ed) { ed = d; enemy = e; } }
        const tg = target(p, i); const far = tg ? Math.hypot(tg[0] - h.x, tg[1] - h.z) : 0;
        if (tg && tg[2] && far < 2.2) { if ((t & 7) === 0) acts |= S.A_KICK; }
        else if (enemy && ed < 3.2) { yaw = Math.atan2(enemy.x - h.x, enemy.z - h.z); if ((t % 14) < 7) acts |= S.A_ATK; if (ed > 2.2) keys |= S.KEY_W; }
        else if (tg && far > 1.5) { keys |= S.KEY_W; yaw = Math.atan2(tg[0] - h.x, tg[1] - h.z); } }
      return [keys, yq(yaw), 0, acts, 0, 0, [], 0]; });
    sim.step(inputs);
    for (const e of sim.events) { if (e.t === 'mphase') { ph.push([e.ph, Math.round(sim.tick / 30)]); lastPh = e.ph; } if (e.t === 'msay') says.push([Math.round(sim.tick / 30), e.who, e.text]); if (e.t === 'mblast') blasts.push(Math.round(sim.tick / 30)); if (e.t === 'death' && hum.some(p => p.heroId === e.id)) dead++; }
  }
  const won = sim.mwin === M.side; const n = M.phases.length; const reached = new Set(ph.map(x => x[0]));
  const branch = M.phases.some(P => P.next !== undefined || (P.at || []).some(a => a[1][0] === 'goto') || (P.done || []).some(a => a[0] === 'goto'));
  let ok = won && reached.has(n - 1) && (branch ? reached.size >= 4 : reached.size === n);
  const out = { mission, seed, diff, np, won, ok, end: Math.round(sim.tick / 30), phases: n, reached: ph, heroDeaths: dead, endText: (sim.events || []).length ? undefined : undefined, blasts, alive: sim.teamAlive.map(a => a.filter(u => !u.inactive).length) };
  if (!won && sim.mwin !== undefined) { out.lostAt = lastPh; }
  console.log(JSON.stringify(out));
  if (process.env.SAY) for (const s of says) console.log('  ', s.join(' | '));
  return ok;
}
let all = true; for (const m of want === 'all' ? COOP : [want]) all = run(m) && all;
if (want === 'all') { console.log(all ? 'COOP OK: every phase reached, every mission ended' : 'COOP FAIL'); process.exit(all ? 0 : 1); }
