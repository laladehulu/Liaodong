// Hit-reaction / stun-lock harness: node test/zhit.js <1v1|4v4|3on1> <seed> [xc 1|0] [maxSec]   (SIMSRC=path to compare another sim.js)
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, scen = process.argv[2] || '1v1', seed = +process.argv[3] || 1, xc = (process.argv[4] || '1') === '1', maxT = (+process.argv[5] || 120) * 30;
const sim = new S.Sim({ seed, players: [], xcombat: xc });
for (const u of sim.units) { u.dead = true; u.inactive = true; } for (const q of sim.squads) { q.alive = false; q.inactive = true; q.unitIds = []; }
const SC = { '1v1': [['samurai'], ['shinsengumi']], '4v4': [['samurai', 'ashigaru', 'samurai', 'ashigaru'], ['shinsengumi', 'ronin', 'horokutai', 'shinsengumi']], '3on1': [['samurai'], ['shinsengumi']] }[scen];
const mine = [];
for (let t = 0; t < 2; t++) SC[t].forEach((k, i) => { const n = SC[t].length; const sq = sim.createSquad(k, t, -1, (i - (n - 1) / 2) * 16, t === 0 ? -12 : 12, t === 0 ? 0 : Math.PI); for (const id of sq.unitIds) mine.push(id); });
// trim: 1v1 keeps one man a side; 3on1 keeps one samurai against three
const keep = scen === '1v1' ? [1, 1] : scen === '3on1' ? [1, 3] : null;
if (keep) for (let t = 0; t < 2; t++) { let k = 0; for (const id of mine) { const u = sim.units[id]; if (u.team !== t) continue; if (k++ >= keep[t]) { u.dead = true; u.inactive = true; } } }
const live = mine.filter(id => !sim.units[id].dead);
sim.phase = 1; sim.battleTick = sim.tick; const SQ = sim.squads.filter(q => q.alive && !q.inactive);
function general() { for (const q of SQ) { if (!q.alive) continue; let e = null, bd = 1e18; for (const r of SQ) { if (!r.alive || r.team === q.team) continue; const d = Math.hypot(r.cx - q.cx, r.cz - q.cz); if (d < bd) { bd = d; e = r; } } if (!e) continue; q.order = S.ORD_CHARGE; q.tx = e.cx; q.tz = e.cz; } }
const N0 = [0, 1].map(tm => live.filter(id => sim.units[id].team === tm).length);
const run = {}, maxRun = { hr: 0, any: 0 }, win = {}, maxWin = { hr: 0, any: 0 }, kinds = [0, 0, 0, 0, 0, 0]; let contact = -1, end = -1, swings0 = 0, react = 0, flick = 0;
const target = scen === '3on1' ? live.find(id => sim.units[id].team === 0) : -1; let lastSt = -1;
for (let t = 0; t < maxT; t++) {
  if (t % 30 === 0) general(); sim.step([]);
  for (const e of sim.events) if (e.t === 'hitreact') { kinds[e.k]++; react++; }
  for (const id of live) { const u = sim.units[id]; if (u.dead) { run[id] = null; continue; }
    const R = run[id] || (run[id] = { hr: 0, any: 0, wh: [], wa: [] });
    const hr = u.hrT > 0, any = u.flinchT > 0 || u.st === S.ST_STUN;
    R.hr = hr ? R.hr + 1 : 0; R.any = any ? R.any + 1 : 0; maxRun.hr = Math.max(maxRun.hr, R.hr); maxRun.any = Math.max(maxRun.any, R.any);
    R.wh.push(hr ? 1 : 0); R.wa.push(any ? 1 : 0); if (R.wh.length > 60) { R.wh.shift(); R.wa.shift(); }
    const sh = R.wh.reduce((a, b) => a + b, 0), sa = R.wa.reduce((a, b) => a + b, 0); maxWin.hr = Math.max(maxWin.hr, sh); maxWin.any = Math.max(maxWin.any, sa);
    if (u.hrF > 0.159) flick++;
    if (contact < 0 && u.target >= 0) { const v = sim.units[u.target]; if (v && Math.hypot(v.x - u.x, v.z - u.z) < u.def.reach + 0.5) contact = t; } }
  if (target >= 0) { const u = sim.units[target]; if (!u.dead && u.st === S.ST_RELEASE && lastSt !== S.ST_RELEASE) swings0++; lastSt = u.st; if (u.dead && end < 0) { end = t; break; } }
  const al = [0, 1].map(tm => live.filter(id => !sim.units[id].dead && sim.units[id].team === tm).length);
  if (contact >= 0 && end < 0 && (al[0] === 0 || al[1] === 0 || (scen === '4v4' && (al[0] <= N0[0] * 0.2 || al[1] <= N0[1] * 0.2)))) { end = t; break; }
}
const al = [0, 1].map(tm => live.filter(id => !sim.units[id].dead && sim.units[id].team === tm).length);
const fight = ((end < 0 ? sim.tick : end) - Math.max(0, contact)) / 30;
console.log(JSON.stringify({ scen, seed, xc, fightS: +fight.toFixed(1), ended: end >= 0, alive: al, of: N0, longestReactS: +(maxRun.hr / 30).toFixed(2), maxReact2sS: +(maxWin.hr / 30).toFixed(2), longestAnyStunS: +(maxRun.any / 30).toFixed(2), maxAny2sS: +(maxWin.any / 30).toFixed(2), reactions: react, kinds, cosmeticFlinches: flick, targetSwings: target >= 0 ? swings0 : undefined, hash: sim.hash() }));
