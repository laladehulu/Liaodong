// Simulates 3 peers with a lossless, ordered, delayed transport and checks lockstep determinism.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js', 'net.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, performance, setInterval, clearInterval, Peer: undefined, RTCPeerConnection: undefined }; vm.createContext(ctx);
vm.runInContext(src + '\nthis.SIM = SIM; this.Lockstep = Lockstep; this.RNG = RNG;', ctx);
const S = ctx.SIM;
const N = 3, DELAY = 4;
const cfg = { seed: 4242, players: [{ name: 'A', team: 0, army: ['samurai', 'rifle_imp', 'cavalry'], mounted: false }, { name: 'B', team: 1, army: ['shinsengumi', 'rifle_sho', 'cannon'], mounted: true }, { name: 'C', team: 0, army: ['ashigaru', 'ashigaru'], mounted: false }] };
const peers = []; let now = 0;
const inbox = []; // {at, to, from, k, d}
for (let i = 0; i < N; i++) peers.push({ me: i, sim: new S.Sim(cfg), ls: new ctx.Lockstep(N, i, DELAY), rng: new ctx.RNG(100 + i), acc: 0, hashes: new Map(), stalls: 0 });
function send(from, k, d) { for (let to = 0; to < N; to++) if (to !== from) inbox.push({ at: now + 20 + Math.random() * 90, to, from, k, d }); }
function deliver() { inbox.sort((a, b) => a.at - b.at); while (inbox.length && inbox[0].at <= now) { const m = inbox.shift(); peers[m.to].ls.onRemote(m.from, m.k, m.d); } }
function input(p) { const r = p.rng; const keys = r.int(16); const acts = (r.next() < 0.3 ? S.A_ATK : 0) | (r.next() < 0.2 ? S.A_BLOCK : 0) | (r.next() < 0.05 ? S.A_FIRE : 0) | (r.next() < 0.02 ? S.A_SWAP : 0) | (r.next() < 0.02 ? S.A_MOUNT : 0); const cmds = []; if (r.next() < 0.02) { const sq = p.sim.players[p.me].squads[0]; cmds.push([sq, S.ORD_CHARGE, r.range(-50, 50), r.range(-50, 50), 0, 0]); } return [keys, r.int(65536), r.int(2000) - 1000, acts, r.int(4), r.int(4), cmds]; }
const DTms = 1000 / 30; const TARGET = 900;
while (peers.some(p => p.ls.tick < TARGET)) {
  now += 16 + Math.random() * 10; deliver();
  for (const p of peers) {
    if (p.ls.tick >= TARGET) continue;
    p.acc += 16; let steps = 0;
    while (p.acc >= DTms && steps < 6 && p.ls.tick < TARGET) {
      if (!p.ls.ready(p.ls.tick)) { p.acc = Math.min(p.acc, DTms); p.stalls++; break; }
      const inp = input(p); const tk = p.ls.queueLocal(inp); send(p.me, tk, inp);
      p.sim.step(p.ls.inputsFor(p.ls.tick)); p.ls.advance();
      if (p.ls.tick % 60 === 0) p.hashes.set(p.ls.tick, p.sim.hash());
      p.acc -= DTms; steps++;
    }
  }
}
let ok = true;
for (const [k, h] of peers[0].hashes) for (let i = 1; i < N; i++) if (peers[i].hashes.get(k) !== h) { ok = false; console.log('MISMATCH at tick', k, peers.map(p => p.hashes.get(k))); break; }
console.log('lockstep 3 peers', ok ? 'IN SYNC' : 'DESYNC', 'ticks', peers.map(p => p.ls.tick), 'stalls', peers.map(p => p.stalls), 'alive', peers[0].sim.teamAlive.map(a => a.length), 'kills', peers[0].sim.players.map(p => p.kills));
