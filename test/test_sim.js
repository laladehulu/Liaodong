const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
function makeCtx() { const ctx = { console, Math, Int32Array, Float64Array, Float32Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM; this.DM = DM; this.RNG = RNG;', ctx); return ctx; }

function run(cfg, ticks, inputFn, ctx) {
  const sim = new ctx.SIM.Sim(cfg);
  const hashes = [];
  let evCount = {};
  for (let t = 0; t < ticks; t++) {
    const inputs = inputFn ? inputFn(t, sim) : [];
    sim.step(inputs);
    for (const e of sim.events) evCount[e.t] = (evCount[e.t] || 0) + 1;
    for (const u of sim.units) { if (!isFinite(u.x) || !isFinite(u.z) || !isFinite(u.y) || !isFinite(u.hp)) throw new Error('NaN at tick ' + t + ' unit ' + u.id + ' ' + u.type + ' ' + JSON.stringify({ x: u.x, z: u.z, y: u.y, hp: u.hp, vx: u.vx, vz: u.vz, vy: u.vy })); }
    if (t % 60 === 0) hashes.push(sim.hash());
    if (sim.winner >= 0) { console.log('winner', sim.winner, 'at tick', t); break; }
  }
  return { sim, hashes, evCount };
}

// AI vs AI
const cfgA = { seed: 12345, players: [] };
const r1 = run(cfgA, 9000, null, makeCtx());
const r2 = run(cfgA, 9000, null, makeCtx());
console.log('AI vs AI ticks', r1.sim.tick, 'alive', r1.sim.teamAlive.map(a => a.length), 'events', r1.evCount);
console.log('determinism:', JSON.stringify(r1.hashes) === JSON.stringify(r2.hashes) ? 'OK' : 'MISMATCH');

// With a player hero running around, firing, attacking, mounting
const A = (function () { const c = makeCtx(); return c.SIM; })();
function mkInput(t, sim) {
  const p = sim.players[0]; const hero = sim.units[p.heroId];
  const keys = (t % 90 < 60) ? A.KEY_W : A.KEY_A;
  let acts = 0;
  if (t % 50 === 0) acts |= A.A_FIRE;
  if (t % 70 < 15) acts |= A.A_ATK;
  if (t % 70 > 30 && t % 70 < 45) acts |= A.A_BLOCK;
  if (t === 100) acts |= A.A_SWAP;
  if (t === 300) acts |= A.A_MOUNT;
  if (t === 900) acts |= A.A_MOUNT;
  if (t % 200 === 0) acts |= A.A_KICK;
  if (t % 133 === 0) acts |= A.A_JUMP;
  if (t > 1500 && t < 1600) acts |= A.A_CMD;
  const yawQ = ((Math.round((t * 0.01) / (Math.PI * 2) * 65536)) % 65536 + 65536) % 65536;
  const cmds = [];
  if (t === 200) cmds.push([p.squads[0], A.ORD_CHARGE, 0, 50, 0, 0]);
  if (t === 210) cmds.push([p.squads[1], A.ORD_MOVE, 20, -60, 1570, 0]);
  if (t === 220) cmds.push([p.squads[1], A.ORD_FORM, 0, 0, 0, A.FORM_WEDGE]);
  if (t === 230) cmds.push([p.squads[2] !== undefined ? p.squads[2] : p.squads[0], A.ORD_FOLLOW, 0, 0, 0, 0]);
  if (t === 400) cmds.push([0, A.ORD_AUTO, 0, 0, 0, 1]);
  if (t === 1550) { const sq = sim.squads[p.squads[0]]; const uid = sq.unitIds.find(id => !sim.units[id].dead); if (uid !== undefined) cmds.push([0, A.ORD_CONTROL, 0, 0, 0, uid]); }
  if (t === 30) acts |= A.A_READY;
  if (t % 777 === 0) acts |= A.A_RALLY;
  if (t % 400 === 350) acts |= A.A_THROW;
  if (t % 500 === 480) acts |= A.A_DUEL;
  return [[keys, yawQ, 0, acts, t % 4, (t + 1) % 4, cmds, (t % 300 === 0) ? 3 : 0]];
}
const cfgB = { seed: 777, players: [{ name: 'A', team: 0, army: ['samurai', 'rifle_spencer', 'cavalry', 'armstrong', 'jinshotai'], mounted: false }] };
const r3 = run(cfgB, 9000, mkInput, makeCtx());
const r4 = run(cfgB, 9000, mkInput, makeCtx());
console.log('bombs left', r3.sim.players[0].bombs, 'fury', r3.sim.players[0].fury);
console.log('Player game ticks', r3.sim.tick, 'alive', r3.sim.teamAlive.map(a => a.length), 'events', r3.evCount, 'kills', r3.sim.players[0].kills);
console.log('determinism:', JSON.stringify(r3.hashes) === JSON.stringify(r4.hashes) ? 'OK' : 'MISMATCH');

// two players different teams, mounted
const cfgC = { seed: 99, players: [{ name: 'A', team: 0, army: ['samurai', 'rifle_imp', 'jigen'], mounted: true }, { name: 'B', team: 1, army: ['shinsengumi', 'archer', 'cavalry', 'cannon4', 'gatling', 'byakkotai'], mounted: true }] };
const r5 = run(cfgC, 6000, (t, sim) => [mkInput(t, sim)[0], [A.KEY_W, 32768, 0, (t % 40 === 0 ? A.A_FIRE : 0) | (t % 60 < 20 ? A.A_ATK : 0) | (t === 20 ? A.A_READY : 0), 0, 0, [], 0]], makeCtx());
console.log('2p game ticks', r5.sim.tick, 'alive', r5.sim.teamAlive.map(a => a.length), 'events', r5.evCount);
for (const b of ['field','toba','ueno','nagaoka','aizu','hakodate','bonari']) { const c2 = makeCtx(); const r = run({ seed: 31337, battle: b, players: [] }, 6000, null, c2); const r2b = run({ seed: 31337, battle: b, players: [] }, 6000, null, makeCtx()); console.log('battle', b, 'ticks', r.sim.tick, 'alive', r.sim.teamAlive.map(a=>a.length), 'boxes', r.sim.boxes.length, 'zones', r.sim.zones.length, 'routs', r.evCount.rout||0, 'fled', (r.evCount.death||0), JSON.stringify(r.hashes)===JSON.stringify(r2b.hashes)?'OK':'MISMATCH'); }
// perf
const ctxP = makeCtx(); const simP = new ctxP.SIM.Sim({ seed: 5, players: [] });
const t0 = Date.now(); for (let i = 0; i < 600; i++) simP.step([]); console.log('600 ticks ms', Date.now() - t0, 'units', simP.units.length);
