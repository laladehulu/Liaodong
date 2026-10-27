// ===== Action combat (experimental edition: window.MING_ACTION) =====
// Beyond the four-direction duel: men in the press do the things men in a press do, each one telegraphed so it can be
// answered. A swordsman lunges a step and a half to spit the man in front; a pikeman jabs three times fast; a man turns his
// back and whips round in a full-circle cut; a swordsman charges in from a few paces. Every one has a counter:
//   lunge / charge  - sidestep or hop back as it comes (a dodge), or take it on a shield: the shield shoves him off his feet
//   pike flurry     - parry the pokes; a parry on any of them breaks the flurry and leaves him open
//   spin cut        - back out of the circle, or block it; while his back is turned he is open
// A move that misses or is answered leaves the man open for a moment (a cut on him then is a deathblow).
// Step in front of a comrade with your shield up and a lunge meant for him meets your shield instead.
// Sim-side (deterministic: this.rng only); render-side cues (glint, warning, spin, counter flashes) below.
(() => {
if (typeof globalThis === 'undefined' || !globalThis.MING_ACTION || typeof SIM === 'undefined') return;
const S = SIM, P = S.Sim.prototype, DT = S.DT, RT = S.RELEASE_T;
const { ST_IDLE, ST_WINDUP, ST_RELEASE, ST_RECOVER, ST_STUN, DIR_DOWN, DIR_RIGHT, DIR_LEFT } = S;
const len = (x, z) => Math.sqrt(x * x + z * z), wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// tele: how long the warning shows; go: how long the move runs
const MV = {
  lunge:  { tele: 0.5, go: 0.32, rec: 0.7, dmg: 1.35, spd: 10.5 },
  charge: { tele: 0.65, go: 0.95, rec: 0.9, dmg: 1.45, spd: 8.2 },
  flurry: { tele: 0.45, go: 0.9, rec: 0.6, dmg: 0.55, n: 3 },
  spin:   { tele: 0.55, go: 0.45, rec: 0.8, dmg: 1.1 },
};
const humanOf = (sim, u) => u.ctrl >= 0 && sim.players[u.ctrl] && !sim.players[u.ctrl].ai;
function heroNear(sim, u, r) { for (const p of sim.players) { if (p.ai) continue; const h = sim.units[p.heroId]; if (h && !h.dead && len(h.x - u.x, h.z - u.z) < r) return true; } return false; }

const baseAI = P.unitAI;
P.unitAI = function (u) {
  if (u.amK) { if (this.amStep(u)) return; }
  baseAI.call(this, u);
  if (!u.amK) this.amMaybe(u);
};
// should this man start a move now?
P.amMaybe = function (u) {
  if (u.dead || u.ctrl >= 0 || u.mounted || u.champ || u.type === 'hero' || u.type === 'horse' || u.def.ai === 'cannon' || u.wounded || u.camp) return;
  if (u.st !== ST_IDLE || u.flinchT > 0 || u.blocking || (u.entT || 0) > 0 || this.tick < (u.amCd || 0) || u.target < 0) return;
  if (u.weapon !== 'katana' && u.weapon !== 'yari') return;
  const t = this.units[u.target]; if (!t || t.dead || t.mounted || t.type === 'horse') return;
  const d = len(t.x - u.x, t.z - u.z), reach = u.def.reach || 2.2;
  // only a few at a time near a player, so each one can be seen coming
  if (heroNear(this, u, 26)) { let busy = 0; for (const v of this.units) if (v.amK && !v.dead && heroNear(this, v, 26)) busy++; if (busy >= 2) return; }
  if (this.rng.next() > 0.012) return;
  const yari = u.weapon === 'yari', brush = u.def.brush || u.role === 'brush';
  let k = null;
  if (yari && !brush && d > reach * 0.5 && d < reach + 0.6) k = 'flurry';
  else if (!yari && d > reach + 0.4 && d < reach + 2.6) k = 'lunge';
  else if (!yari && d > 4.5 && d < 9) k = 'charge';
  else if (!yari && d < reach + 0.2) { let n = 0; for (const e of this.teamAlive[1 - u.team]) if (!e.dead && len(e.x - u.x, e.z - u.z) < reach + 0.3) n++; if (n >= 2 || this.rng.next() < 0.35) k = 'spin'; }
  if (!k) { u.amCd = this.tick + 20; return; }
  u.amK = k; u.amP = 0; u.amT = 0; u.amN = 0; u.amTgt = t.id; u.amHit = 0; u.amCd = this.tick + 30 * (6 + this.rng.int(6));
  u.st = ST_WINDUP; u.stT = 0; u.atkDir = k === 'spin' ? (this.rng.next() < 0.5 ? DIR_RIGHT : DIR_LEFT) : DIR_DOWN; u.wMul = 99; u.heavy = false; u.blocking = false;
  this.events.push({ t: 'amtele', id: u.id, k, at: t.id, x: u.x, y: u.y + 1.5, z: u.z });
};
P.amEnd = function (u, open) {
  const k = u.amK; u.amK = null; u.amP = 0; u.wMul = 1; u.heavy = false;
  if (open) { u.openT = Math.max(u.openT || 0, open); }
  if (u.st === ST_WINDUP || u.st === ST_RELEASE) { u.st = ST_RECOVER; u.stT = 0; }
  u.vx = (u.vx || 0) * 0.3; u.vz = (u.vz || 0) * 0.3; return k;
};
// run the move; returns true while it owns the man this tick
P.amStep = function (u) {
  const M = MV[u.amK]; if (!M) { u.amK = null; return false; }
  if (u.dead || u.st === ST_STUN || u.flinchT > 0 || (u.downT || 0) > 0 || (u.entT || 0) > 0) { this.amEnd(u, 0); return false; } // hit, staggered or snared: the move is lost
  const t = this.units[u.amTgt]; u.amT += DT;
  if (u.amP === 0) { // the warning: he gathers himself, eyes on his man
    if (t && !t.dead) { const a = Math.atan2(t.x - u.x, t.z - u.z); this.turnTo(u, a, 6 * DT); u.amYaw = a; }
    u.mx = 0; u.mz = 0; u.st = ST_WINDUP; u.stT = Math.min(u.stT, (u.def.windup || 0.45) * 0.95);
    if (u.amT >= M.tele) { u.amP = 1; u.amT = 0; u.st = ST_RELEASE; u.stT = 0; u.swingHit = true; this.events.push({ t: 'amgo', id: u.id, k: u.amK, x: u.x, y: u.y + 1.2, z: u.z }); }
    return true;
  }
  if (u.amP === 1) {
    const k = u.amK, fx = Math.sin(u.amYaw), fz = Math.cos(u.amYaw); u.mx = 0; u.mz = 0; u.swingHit = true;
    if (k === 'lunge' || k === 'charge') { const sp = M.spd * (k === 'charge' && u.amT < 0.2 ? 0.6 + u.amT * 2 : 1); u.vx = fx * sp; u.vz = fz * sp; u.yaw = u.amYaw; u.st = ST_RELEASE; u.stT = Math.min(u.amT, RT * 0.7);
      if (!u.amHit) { const v = this.amFirst(u, fx, fz, k === 'charge' ? 1.3 : 1.15, 0.65); if (v) { u.amHit = 1; this.amResolve(u, v, k, M); if (!u.amK) return true; u.vx *= 0.25; u.vz *= 0.25; } } }
    else if (k === 'flurry') { const per = M.go / M.n, i = Math.floor(u.amT / per); u.st = ST_RELEASE; u.stT = Math.min(u.amT - i * per, RT); u.yaw = u.amYaw;
      if (t && !t.dead) { const a = Math.atan2(t.x - u.x, t.z - u.z); u.amYaw += wrap(a - u.amYaw) * 0.3; }
      if (i < M.n && i >= u.amN && u.amT - i * per > per * 0.45) { u.amN = i + 1; u.vx = (u.vx || 0) + fx * 1.2; u.vz = (u.vz || 0) + fz * 1.2; const v = this.amFirst(u, fx, fz, (u.def.reach || 3) + 0.4, 0.35); this.events.push({ t: 'ampoke', id: u.id, n: i }); if (v) { this.amResolve(u, v, k, M); if (!u.amK) return true; } } }
    else if (k === 'spin') { const f = u.amT / M.go; u.yaw = u.amYaw + f * 2 * Math.PI * (u.atkDir === DIR_RIGHT ? 1 : -1); u.st = ST_RELEASE; u.stT = Math.min(f * RT, RT);
      if (!u.amHit && f > 0.45) { u.amHit = 1; const R = (u.def.reach || 2.2) + 0.35, n = this.gatherNear(u.x, u.z, R + 1); const hit = [];
        for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team === u.team || v.type === 'horse' || v.mounted) continue; if (len(v.x - u.x, v.z - u.z) < R + v.def.r && Math.abs(v.y - u.y) < 2.2) hit.push(v); }
        for (const v of hit) { this.amResolve(u, v, k, M); if (!u.amK) return true; } } }
    if (u.amT >= M.go) { u.amP = 2; u.amT = 0; u.st = ST_RECOVER; u.stT = 0; u.yaw = k === 'spin' ? u.amYaw : u.yaw; u.vx *= 0.3; u.vz *= 0.3; u.openT = Math.max(u.openT || 0, u.amHit ? 0.35 : 0.8); } // spent, and a miss leaves him open
    return true;
  }
  // recovery: he finds his feet again
  u.mx = 0; u.mz = 0; if (u.amT >= M.rec) { this.amEnd(u, 0); u.st = ST_IDLE; u.stT = 0; return false; }
  return true;
};
// the first enemy in the way of a thrust or a run: along the line, within the cone. A man blocking with a shield
// covers the space beside him too, so he can take a lunge meant for the comrade at his side.
P.amFirst = function (u, fx, fz, R, cone) {
  const n = this.gatherNear(u.x, u.z, R + 2.2); let best = null, bd = 1e9;
  for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team === u.team || v.type === 'horse' || v.mounted || Math.abs(v.y - u.y) > 2.2) continue;
    const dx = v.x - u.x, dz = v.z - u.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); if (along < 0) continue;
    const cover = v.blocking && v.def.shield ? 0.9 : 0; if (along > R + v.def.r + cover * 0.5 || side > 0.45 + v.def.r + cover + along * Math.tan(cone) * 0.3) continue;
    const sc = along - cover; if (sc < bd) { bd = sc; best = v; } }
  return best;
};
P.amResolve = function (u, v, k, M) {
  const dx = v.x - u.x, dz = v.z - u.z, d = len(dx, dz) || 1, nx = dx / d, nz = dz / d, hx = v.x - nx * v.def.r, hy = v.y + 1.2, hz = v.z - nz * v.def.r;
  const facing = Math.abs(wrap(Math.atan2(u.x - v.x, u.z - v.z) - v.yaw)) < 1.4;
  // dodged: he finds nothing there, overreaches, and is wide open
  if (v.iframe > 0 || (v.dodgeT || 0) > 0) { this.events.push({ t: 'amcounter', how: 'dodge', id: u.id, by: v.id, k, x: hx, y: hy, z: hz }); this.amEnd(u, 1.3); u.st = ST_STUN; u.stT = 0; u.stunDur = 0.9; return; }
  const canBlock = v.blocking && facing && v.flinchT <= 0 && (v.downT || 0) <= 0;
  if (canBlock) {
    if (v.def.shield && k !== 'spin') { // the shield meets him and shoves: he goes back off his feet, open
      u.vx = -nx * 6.5; u.vz = -nz * 6.5; this.amEnd(u, 1.4); u.st = ST_STUN; u.stT = 0; u.stunDur = 1.2; this.posture(u, 45, v);
      this.events.push({ t: 'amcounter', how: 'shield', id: u.id, by: v.id, k, x: hx, y: hy, z: hz }); return; }
    const perfect = v.blockT < 0.22 * (humanOf(this, v) ? 1.3 : 1);
    if (perfect || k === 'flurry') { // a parry: on a flurry any parried poke breaks it
      this.amEnd(u, 1.1); u.st = ST_STUN; u.stT = 0; u.stunDur = perfect ? 1.0 : 0.7; this.posture(u, 35, v); v.counterT = 0.9;
      this.events.push({ t: 'amcounter', how: 'parry', id: u.id, by: v.id, k, x: hx, y: hy, z: hz }); return; }
    // a plain guard holds, but the weight of it tells
    this.posture(v, 30 * M.dmg, u); v.vx = (v.vx || 0) + nx * 2.2; v.vz = (v.vz || 0) + nz * 2.2;
    this.events.push({ t: 'block', x: hx, y: hy, z: hz, perfect: false, by: v.id, att: u.id, shield: !!v.def.shield });
    if (k !== 'flurry') { this.amEnd(u, 0.5); u.st = ST_RECOVER; u.stT = 0; } return;
  }
  const dir = k === 'spin' ? u.atkDir : DIR_DOWN, base = (u.def.dmg && (u.def.dmg[dir] || u.def.dmg[0])) || 40;
  let dmg = base * M.dmg * (this.xc && u.ctrl < 0 && v.ctrl < 0 ? 0.72 : 1);
  if (v.openT > 0) { dmg *= 2.2; v.openT = 0; }
  u.lastAttacker = -1; v.lastAttacker = u.id;
  this.applyDamage(v, dmg, u.id, nx * (k === 'charge' ? 6 : 3), k === 'charge' ? 1.2 : 0.3, nz * (k === 'charge' ? 6 : 3), 'melee', hx, hy, hz);
  if (!v.dead) { if (this.xc && this.hitReact) this.hitReact(v, u, k === 'spin' ? 'cut' : 'thrust', k === 'charge' || k === 'lunge', false); else v.flinchT = 0.45; if (k === 'charge') v.downT = Math.max(v.downT || 0, 0.8); }
  this.events.push({ t: 'amhit', id: u.id, at: v.id, k, x: hx, y: hy, z: hz });
};

// ---------------- render: the warning, the move, the answer ----------------
if (typeof RENDER === 'undefined' || !RENDER.Renderer) return;
const RP = RENDER.Renderer.prototype;
const NAME = { lunge: ['突 LUNGE', 'sidestep (double-tap A/D) or take it on the shield'], charge: ['衝 CHARGE', 'sidestep, or brace the shield'], flurry: ['連刺 PIKE FLURRY', 'parry a poke and he is open'], spin: ['旋 SPIN CUT', 'back out, or block it'] };
const COUNTER = { dodge: ['閃 DODGED — he is open', '#9fe0ff'], shield: ['盾 SHIELD SHOVE — strike!', '#ffd36a'], parry: ['格 PARRIED — strike now', '#ffd36a'] };
const baseEv = RP.processEvents;
RP.processEvents = function (events) {
  const sim = this.sim, me = sim && sim.players[this.localIdx], hero = me ? sim.units[me.heroId] : null;
  for (const ev of events) {
    if (ev.t === 'amtele') { const u = sim.units[ev.id]; if (!u) continue; this.burstSparks(u.x + Math.sin(u.yaw) * 0.5, u.y + 1.65, u.z + Math.cos(u.yaw) * 0.5, 9, 1.6, 1, 0.92, 0.6, 0.45, 0.09); // a glint off the blade
      const near = hero && !hero.dead && Math.hypot(u.x - hero.x, u.z - hero.z) < 9;
      if (near) { const N = NAME[ev.k], mine = ev.at === hero.id; this.hitQ = { text: N[0] + (mine ? ' at you' : ' at your comrade') + ' — ' + N[1], t: 1.3, c: mine ? '#ff8a6a' : '#ffd08a' }; }
      if (typeof AUDIO !== 'undefined') AUDIO.play('whistle', u.x, u.y + 1.5, u.z, near ? 0.8 : 0.4); }
    else if (ev.t === 'amgo') { if (typeof AUDIO !== 'undefined') AUDIO.play(ev.k === 'charge' ? 'thud' : 'swing', ev.x, ev.y, ev.z, 0.9); }
    else if (ev.t === 'amcounter') { const C = COUNTER[ev.how]; this.burstSparks(ev.x, ev.y, ev.z, ev.how === 'shield' ? 22 : 16, 7, 1, 0.85, 0.45, 0.4, 0.1); if (typeof AUDIO !== 'undefined') AUDIO.play(ev.how === 'shield' ? 'shield' : ev.how === 'parry' ? 'parry' : 'swing', ev.x, ev.y, ev.z, 1.2);
      if (hero && ev.by === hero.id) { this.hitQ = { text: C[0], t: 1.2, c: C[1] }; this.hitstop = Math.max(this.hitstop || 0, 0.06); this.shake = Math.max(this.shake || 0, ev.how === 'shield' ? 0.5 : 0.3); } }
  }
  return baseEv.call(this, events);
};
// the spin is a real turn of the whole body; a man in a lunge or charge leans hard into it
const baseFig = RP.drawFigure;
RP.drawFigure = function (slot, u, x, y, z, yaw, alpha, hide) {
  if (u && u.amK && u.amP === 1) { if (u.amK === 'spin') yaw = u.yaw; }
  return baseFig.call(this, slot, u, x, y, z, yaw, alpha, hide);
};
})();
