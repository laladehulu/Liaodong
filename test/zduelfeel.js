// Duel mode feel: a scripted player against the duel bot. node test/zduelfeel.js <seed> [maxSec]   SIMSRC= to compare
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(f === 'sim.js' && process.env.SIMSRC ? process.env.SIMSRC : path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, Int16Array, Uint8Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
const S = ctx.SIM, seed = +process.argv[2] || 1, maxT = (+process.argv[3] || 120) * 30;
const sim = new S.Sim({ seed, mode: 'duel', battle: 'field', xcombat: true, players: [{ name: 'me', team: 0, role: 'shield' }] });
sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true;
const me = sim.players[0], heroId = me.heroId, bot = sim.players.find(p => p.duelBot); const botId = bot.heroId;
const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
const wd = [], hd = []; let face = 0, ticks = 0, lastAtk = -99, blockUntil = -1, rounds = 0, won = 0, myHits = 0, hitsOnMe = 0, swings = 0;
for (let t = 0; t < maxT && sim.winner < 0; t++) {
  const h = sim.units[heroId], b = sim.units[botId]; let keys = 0, yaw = h.yaw, acts = 0;
  if (!h.dead && !b.dead) { const ed = Math.hypot(b.x - h.x, b.z - h.z); yaw = Math.atan2(b.x - h.x, b.z - h.z);
    if (ed > 2.0 && h.st === S.ST_IDLE && t - lastAtk > 30 && blockUntil < t) keys |= S.KEY_W;
    if (ed < 2.1 && t - lastAtk > 36 && h.st === S.ST_IDLE && blockUntil < t) { acts |= S.A_ATK; lastAtk = t; }
    else if (ed < 3.2 && b.st === S.ST_WINDUP && t > blockUntil + 20 && t - lastAtk > 12 && h.st === S.ST_IDLE) blockUntil = t + 15;
    if (blockUntil >= t) acts |= S.A_BLOCK; }
  const inputs = sim.players.map((p, i) => i === 0 ? [keys, yq(yaw), 0, acts, 0, 0, [], 0] : 0); sim.step(inputs);
  for (const ev of sim.events) { if (ev.t === 'windup' && ev.id === botId) { swings++; wd.push(Math.hypot(b.x - h.x, b.z - h.z)); } if (ev.t === 'hit' && ev.id === heroId) { hitsOnMe++; hd.push(Math.hypot(b.x - h.x, b.z - h.z)); } if (ev.t === 'hit' && ev.att === heroId) myHits++; if (ev.t === 'duelround') { rounds++; if (ev.winner === 0) won++; } }
  if (!h.dead && !b.dead) { ticks++; const d = Math.hypot(b.x - h.x, b.z - h.z); if (d < 1.3 && b.st !== S.ST_WINDUP && b.st !== S.ST_RELEASE) face++; }
}
const q = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return [s[Math.floor(s.length * 0.1)], s[Math.floor(s.length * 0.5)], s[Math.floor(s.length * 0.9)]].map(v => +v.toFixed(2)); };
console.log(JSON.stringify({ seed, rounds, won, botSwings: swings, windupDist: q(wd), hitDist: q(hd), faceTime: +(face / Math.max(1, ticks)).toFixed(2), myHits, hitsOnMe, hash: sim.hash() }));
