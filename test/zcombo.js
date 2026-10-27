// Combo chains: the player cuts a passive man (and a man on each side, a guarding man, a reeling man); prints the chain steps. node test/zcombo.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM; const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
function run(setup, label) {
  const sim = new S.Sim({ seed: 1, mode: 'standard', battle: 'field', xcombat: true, players: [{ name: 'me', team: 0, army: ['samurai'] }, { name: 'foe', team: 1, army: ['samurai'] }] });
  sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
  const me = sim.players[0], h = sim.units[me.heroId]; const hs = sim.units[me.horseId]; if (hs) { hs.dead = true; hs.inactive = true; } h.mounted = false; h.mount = -1;
  h.x = h.px = 0; h.z = h.pz = -30; h.y = h.py = S.terrainH(0, -30); h.yaw = h.pyaw = 0;
  const foes = sim.units.filter(u => u.team === 1 && u.weapon === 'katana' && u.type !== 'horse').slice(0, 3);
  for (const u of sim.units) if (u !== h && !foes.includes(u)) { u.x = u.px = 300; u.z = u.pz = 300; } for (const q of sim.squads) q.order = S.ORD_HOLD;
  for (const f of foes) { f.x = f.px = 300; f.z = f.pz = 300; f.hp = 5000; f.def = Object.assign({}, f.def, { hp: 5000 }); }
  setup(h, foes); const log = []; let presses = 0;
  for (let t = 0; t < 120; t++) { for (const f of foes) { f.target = -1; if (f.st === S.ST_WINDUP) f.st = S.ST_IDLE; f.mx = f.mz = 0; f.slotX = f.x; f.slotZ = f.z; f.yaw = Math.PI; } const atk = (t % 12 === 2 && presses < 6) ? S.A_ATK : 0; if (atk) presses++;
    sim.step([[0, yq(0), 0, atk, S.DIR_RIGHT, S.DIR_UP, [], 0], [0, 0, 0, 0, 0, 0, [], 0]]);
    for (const ev of sim.events) { if (ev.t === 'combo' && ev.id === h.id) log.push(`${ev.zh}${ev.n}/${ev.of}${ev.step}${ev.heavy ? '!' : ''}@${Math.hypot(foes[0].x - h.x, foes[0].z - h.z).toFixed(2)}`); if (ev.t === 'swing' && ev.id === h.id) log.push(`swing@${Math.hypot(foes[0].x - h.x, foes[0].z - h.z).toFixed(2)}`); if (ev.t === 'hit' && ev.att === h.id) log.push(`hit(${sim.units[ev.id].x > 0.3 ? 'L' : sim.units[ev.id].x < -0.3 ? 'R' : 'C'},${Math.round(ev.dmg)})`); } }
  console.log(label.padEnd(26), log.join(' '));
}
const put = (f, x, z) => { f.x = f.px = x; f.z = f.pz = z; f.y = f.py = S.terrainH(x, z); f.yaw = f.pyaw = Math.PI; };
run((h, F) => put(F[0], 0, -28.3), 'one man, mid range');
run((h, F) => put(F[0], 0, -28.9), 'one man, close');
run((h, F) => put(F[0], 0, -27.9), 'one man, far');
run((h, F) => { put(F[0], 0.9, -28.3); put(F[1], -0.9, -28.3); }, 'two men, both sides');
run((h, F) => { put(F[0], 0, -28.3); F[0].blocking = true; F[0].blockT = 1; F[0].blockHold = 99; F[0].blockDir = S.DIR_UP; }, 'guard up (bannerman)');
run((h, F) => { put(F[0], 0, -28.3); F[0].st = S.ST_STUN; F[0].stunDur = 3; F[0].stT = 0; }, 'reeling man');
run((h, F) => { put(F[0], 0, -28.3); h.counterT = 0.9; }, 'after a parry');
