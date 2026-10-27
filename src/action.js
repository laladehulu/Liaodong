// ===== Action combat (experimental edition: window.MING_ACTION) =====
// Every melee attack, the player's and the enemy's, is a committed move from a fixed move set, as in Dark Souls:
// a wind-up you can read, an active part that cuts or thrusts (and may carry the man forward), and a recovery in which he
// is open. Once begun a move cannot be steered or cancelled (a feint during the wind-up excepted).
//   cuts:    横斬 side cut (L/R), 劈 overhead chop (breaks a plain guard), 撩 rising cut (quick), 連斬 two-cut combo,
//            旋斬 spin cut (all round him), 躍劈 leaping chop (from a run)
//   thrusts: 刺 thrust, 突刺 lunge (a step and a half), 衝 charge (from a few paces), 連刺 pike flurry (three pokes),
//            橫掃 pike sweep (wide, trips), 盾擊 shield bash (shoves, staggers)
// Answers: block (right mouse) holds any of them; a block in the first instant is a parry and staggers him; a shield takes
// a thrust, lunge, charge or bash and shoves him off his feet; a dodge (double-tap A/D) makes a big move overreach. A man who
// has been answered, or who misses with a big move, is open: a cut on him then is a deathblow.
// Player: A/D-side cut on left/right mouse direction as before, W-up (wheel up) chop, R thrust; attack again late in a
// recovery to chain (cut, cut the other way, then a chop); sprint + attack = leaping chop (blade) or lunge (spear);
// block + attack with a shield = shield bash.
// Sim-side (deterministic: this.rng only); render-side cues below.
(() => {
if (typeof globalThis === 'undefined' || !globalThis.MING_ACTION || typeof SIM === 'undefined') return;
const S = SIM, P = S.Sim.prototype, DT = S.DT, RT = S.RELEASE_T;
const { ST_IDLE, ST_WINDUP, ST_RELEASE, ST_RECOVER, ST_STUN, DIR_UP, DIR_DOWN, DIR_RIGHT, DIR_LEFT } = S;
const len = (x, z) => Math.sqrt(x * x + z * z), wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const TAU = 2 * Math.PI;
// steps: at (s into the active part), dur, dash (m/s forward), spin (radians over the step), hit: { cut|thrust|all, arc, r (extra reach), dmg, dir, gb (guard break), trip, push }
const C = (dir, dmg, arc, extra) => Object.assign({ cut: 1, arc: arc || 1.05, r: 0, dmg, dir }, extra || {});
const T = (dmg, r, extra) => Object.assign({ thrust: 1, r: r || 0, dmg, dir: DIR_DOWN }, extra || {});
const MV = {
  slashL:  { zh: '横斬', tele: 0.36, rec: 0.42, steps: [{ at: 0, dur: 0.2, dash: 1.4, hit: C(DIR_LEFT, 1.0) }] },
  slashR:  { zh: '横斬', tele: 0.36, rec: 0.42, steps: [{ at: 0, dur: 0.2, dash: 1.4, hit: C(DIR_RIGHT, 1.0) }] },
  chop:    { zh: '劈', tele: 0.55, rec: 0.55, steps: [{ at: 0, dur: 0.2, dash: 1.2, hit: C(DIR_UP, 1.35, 0.5, { gb: 1 }) }] },
  rise:    { zh: '撩', tele: 0.22, rec: 0.32, steps: [{ at: 0, dur: 0.16, hit: C(DIR_RIGHT, 0.75, 0.8) }] },
  combo:   { zh: '連斬', tele: 0.34, rec: 0.6, steps: [{ at: 0, dur: 0.2, dash: 1.2, hit: C(DIR_LEFT, 0.8) }, { at: 0.3, dur: 0.2, dash: 1.2, hit: C(DIR_RIGHT, 0.9) }] },
  thrust:  { zh: '刺', tele: 0.3, rec: 0.4, steps: [{ at: 0, dur: 0.18, dash: 2, hit: T(1.0, 0.4) }] },
  lunge:   { zh: '突刺', tele: 0.5, rec: 0.7, big: 1, steps: [{ at: 0, dur: 0.32, dash: 10.5, hit: T(1.35, 0.6) }] },
  charge:  { zh: '衝', tele: 0.65, rec: 0.9, big: 1, steps: [{ at: 0, dur: 0.95, dash: 8.2, hit: T(1.45, 0.8, { trip: 0.8, push: 6 }) }] },
  spin:    { zh: '旋斬', tele: 0.55, rec: 0.8, big: 1, steps: [{ at: 0, dur: 0.45, spin: TAU, hit: { all: 1, r: 0.35, dmg: 1.1, dir: DIR_RIGHT, late: 0.45 } }] },
  leap:    { zh: '躍劈', tele: 0.42, rec: 0.8, big: 1, steps: [{ at: 0, dur: 0.34, dash: 7 }, { at: 0.28, dur: 0.18, hit: C(DIR_UP, 1.6, 0.55, { gb: 1 }) }] },
  flurry:  { zh: '連刺', tele: 0.45, rec: 0.6, big: 1, pike: 1, steps: [0, 0.3, 0.6].map(at => ({ at, dur: 0.15, dash: 1.2, hit: T(0.55, 0.4, { flurry: 1 }) })) },
  sweep:   { zh: '橫掃', tele: 0.5, rec: 0.7, big: 1, pike: 1, steps: [{ at: 0, dur: 0.3, hit: C(DIR_LEFT, 0.9, 1.4, { r: 0.2, trip: 0.6 }) }] },
  bash:    { zh: '盾擊', tele: 0.2, rec: 0.45, steps: [{ at: 0, dur: 0.15, dash: 4, hit: T(0.2, -0.6, { push: 5, stun: 0.9, bash: 1 }) }] },
};
const humanOf = (sim, u) => u.ctrl >= 0 && sim.players[u.ctrl] && !sim.players[u.ctrl].ai;
function heroNear(sim, u, r) { for (const p of sim.players) { if (p.ai) continue; const h = sim.units[p.heroId]; if (h && !h.dead && len(h.x - u.x, h.z - u.z) < r) return true; } return false; }
const usesMoves = (u) => !u.mounted && u.mount < 0 && !u.champ && u.type !== 'horse' && (u.weapon === 'katana' || u.weapon === 'yari' || (u.weapon === 'rifle' && u.club));

// every attack starts a move
const baseWind = P.startWindup;
P.startWindup = function (u, dir) {
  if (!usesMoves(u) || u.hrT > 0) return baseWind.call(this, u, dir);
  const human = humanOf(this, u), pike = u.weapon === 'yari' && !(u.def.brush || u.role === 'brush'), t = u.target >= 0 ? this.units[u.target] : null, d = t ? len(t.x - u.x, t.z - u.z) : 9, reach = u.def.reach || 2.2;
  let k;
  if (human) {
    const chain = u.amLast && this.tick - u.amLastTk < 24 ? (u.amChain || 0) + 1 : 0; u.amChain = chain;
    if (u.blockHeld && u.def.shield) k = 'bash';
    else if (u.sprint) k = pike ? 'lunge' : 'leap';
    else if (dir === DIR_DOWN) k = pike && chain >= 1 ? 'flurry' : 'thrust';
    else if (dir === DIR_UP) k = pike ? 'sweep' : 'chop';
    else if (chain === 1) k = u.amLast === 'slashL' ? 'slashR' : u.amLast === 'slashR' ? 'slashL' : (dir === DIR_LEFT ? 'slashL' : 'slashR');
    else if (chain >= 2) k = pike ? 'sweep' : 'chop';
    else k = dir === DIR_LEFT ? 'slashL' : 'slashR';
  } else {
    const r = this.rng.next();
    if (u.def.shield && d < reach * 0.7 && r < 0.2) k = 'bash';
    else if (pike) k = dir === DIR_DOWN ? (r < 0.75 ? 'thrust' : 'flurry') : r < 0.4 ? 'sweep' : 'thrust';
    else if (dir === DIR_DOWN) k = 'thrust';
    else if (dir === DIR_UP) k = d > reach + 0.8 && r < 0.3 ? 'leap' : 'chop';
    else k = r < 0.25 ? 'combo' : r < 0.4 ? 'rise' : dir === DIR_LEFT ? 'slashL' : 'slashR';
  }
  this.amStart(u, k, t);
};
P.amStart = function (u, k, t) {
  const M = MV[k]; u.amK = k; u.amP = 0; u.amT = 0; u.amS = 0; u.amHit = 0; u.amTgt = t ? t.id : -1; u.amYaw = u.yaw;
  u.st = ST_WINDUP; u.stT = 0; u.atkDir = M.steps.find(s => s.hit) ? (M.steps.find(s => s.hit).hit.dir) : DIR_DOWN; u.wMul = 99; u.heavy = false; u.blocking = false; u.aiming = false; u.windupId++; u.swingHit = true; u.relQ = false;
  this.events.push(M.big ? { t: 'amtele', id: u.id, k, at: u.amTgt, x: u.x, y: u.y + 1.5, z: u.z } : { t: 'windup', id: u.id, dir: u.atkDir });
};
// the specials an AI man may open with on his own
const baseAI = P.unitAI;
P.unitAI = function (u) {
  if (u.amK) { u.atkHeld = false; u.blockHeld = false; return; } // inside a move he does nothing else
  baseAI.call(this, u);
  if (!u.amK) this.amMaybe(u);
};
P.amMaybe = function (u) {
  if (u.dead || u.ctrl >= 0 || !usesMoves(u) || u.type === 'hero' || u.def.ai === 'cannon' || u.wounded || u.camp) return;
  if (u.st !== ST_IDLE || u.flinchT > 0 || u.blocking || (u.entT || 0) > 0 || this.tick < (u.amCd || 0) || u.target < 0) return;
  const t = this.units[u.target]; if (!t || t.dead || t.mounted || t.type === 'horse') return;
  const d = len(t.x - u.x, t.z - u.z), reach = u.def.reach || 2.2;
  if (heroNear(this, u, 26)) { let busy = 0; for (const v of this.units) if (v.amK && MV[v.amK].big && !v.dead && heroNear(this, v, 26)) busy++; if (busy >= 2) return; }
  if (this.rng.next() > 0.012) return;
  const yari = u.weapon === 'yari', brush = u.def.brush || u.role === 'brush';
  let k = null;
  if (yari && !brush && d > reach * 0.5 && d < reach + 0.6) k = this.rng.next() < 0.6 ? 'flurry' : 'sweep';
  else if (!yari && d > reach + 0.4 && d < reach + 2.6) k = this.rng.next() < 0.6 ? 'lunge' : 'leap';
  else if (!yari && d > 4.5 && d < 9) k = 'charge';
  else if (!yari && d < reach + 0.2) { let n = 0; for (const e of this.teamAlive[1 - u.team]) if (!e.dead && len(e.x - u.x, e.z - u.z) < reach + 0.3) n++; if (n >= 2 || this.rng.next() < 0.35) k = 'spin'; }
  if (!k) { u.amCd = this.tick + 20; return; }
  u.amCd = this.tick + 30 * (6 + this.rng.int(6)); this.amStart(u, k, t);
};
// the move runs inside the combat-state step, for the player and the AI alike
const baseUCS = P.updateCombatState;
P.updateCombatState = function (u) {
  if (u.amK) { this.amStep(u); if (u.amK) return; }
  return baseUCS.call(this, u);
};
P.amEnd = function (u, open) {
  u.amLast = u.amK; u.amLastTk = this.tick; u.amK = null; u.amP = 0; u.wMul = 1; u.heavy = false; u.swingHit = false;
  if (open) u.openT = Math.max(u.openT || 0, open);
  if (u.st === ST_WINDUP || u.st === ST_RELEASE) { u.st = ST_RECOVER; u.stT = 0; }
  u.vx = (u.vx || 0) * 0.3; u.vz = (u.vz || 0) * 0.3;
};
P.amStep = function (u) {
  const M = MV[u.amK]; if (!M) { u.amK = null; return; }
  if (u.dead || u.st === ST_STUN || u.flinchT > 0 || (u.downT || 0) > 0 || (u.entT || 0) > 0) { this.amEnd(u, 0); return; } // hit, staggered or snared: the move is lost
  if (u.amP === 0 && u.st === ST_IDLE) { u.amK = null; u.wMul = 1; this.events.push({ t: 'feint', id: u.id }); return; } // feinted (block pressed in the wind-up) or dodged out
  const t = u.amTgt >= 0 ? this.units[u.amTgt] : null; u.amT += DT; const human = humanOf(this, u);
  if (u.amP === 0) { // the wind-up: he gathers himself; the AI tracks his man, the player turns with the mouse
    if (!human && t && !t.dead) { const a = Math.atan2(t.x - u.x, t.z - u.z); this.turnTo(u, a, 6 * DT); }
    u.amYaw = u.yaw; u.mx = 0; u.mz = 0; u.st = ST_WINDUP; u.stT = Math.min(u.amT, (u.def.windup || 0.45) * 0.95);
    if (u.amT >= M.tele) { u.amP = 1; u.amT = 0; u.amS = 0; u.st = ST_RELEASE; u.stT = 0; this.events.push({ t: 'amgo', id: u.id, k: u.amK, x: u.x, y: u.y + 1.2, z: u.z }); this.events.push({ t: 'swing', id: u.id, x: u.x, y: u.y, z: u.z, dir: u.atkDir }); }
    return;
  }
  if (u.amP === 1) {
    u.mx = 0; u.mz = 0; u.swingHit = true; const fx = Math.sin(u.amYaw), fz = Math.cos(u.amYaw); let total = 0;
    for (let i = 0; i < M.steps.length; i++) { const s = M.steps[i]; total = Math.max(total, s.at + s.dur); if (u.amT < s.at || u.amT > s.at + s.dur + DT) continue; const f = (u.amT - s.at) / s.dur;
      if (s.dash) { const sp = s.dash * (u.amK === 'charge' && u.amT < 0.2 ? 0.6 + u.amT * 2 : 1); u.vx = fx * sp; u.vz = fz * sp; }
      if (s.spin) u.yaw = u.amYaw + Math.min(1, f) * s.spin * (u.atkDir === DIR_LEFT ? -1 : 1); else u.yaw = u.amYaw;
      if (s.hit) { u.atkDir = s.hit.dir; u.st = ST_RELEASE; u.stT = Math.min(1, f) * RT; // the body follows this cut
        if (!(u.amHit & (1 << i)) && f >= (s.hit.late || 0.25)) { const vs = this.amTargets(u, s.hit, fx, fz); if (vs.length || !s.dash || f >= 1) { u.amHit |= 1 << i; for (const v of vs) { this.amResolve(u, v, s.hit, M); if (!u.amK) return; } if (vs.length && s.dash) { u.vx *= 0.25; u.vz *= 0.25; } } } } }
    if (u.amT >= total) { u.amP = 2; u.amT = 0; u.st = ST_RECOVER; u.stT = 0; u.yaw = u.amYaw; u.vx *= 0.3; u.vz *= 0.3; if (M.big && !u.amHitAny) u.openT = Math.max(u.openT || 0, 0.8); } // a big move that found nobody leaves him open
    return;
  }
  // recovery: rooted while he finds his feet; late in it the player may chain the next move (the base input path starts it)
  u.mx = 0; u.mz = 0; u.st = ST_RECOVER; u.stT = (u.amT / M.rec) * (u.def.recover || 0.4);
  if (u.amT >= M.rec) { this.amEnd(u, 0); u.st = ST_IDLE; u.stT = 0; u.amHitAny = 0; }
  else if (human && u.amT > M.rec * 0.55) { u.amLast = u.amK; u.amLastTk = this.tick; u.amK = null; u.wMul = 1; u.amHitAny = 0; } // the chain window: hand him back to the input, still in his recovery
};
P.amTargets = function (u, h, fx, fz) {
  const R = (u.def.reach || 2.2) + (h.r || 0); const out = [];
  if (h.thrust) { const v = this.amFirst(u, fx, fz, R, h.bash ? 0.7 : 0.4); if (v) out.push(v); return out; }
  const n = this.gatherNear(u.x, u.z, R + 1.5);
  for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team === u.team || v.type === 'horse' || v.mounted || Math.abs(v.y - u.y) > 2.2) continue;
    const dx = v.x - u.x, dz = v.z - u.z, d = len(dx, dz); if (d > R + v.def.r) continue; if (!h.all && Math.abs(wrap(Math.atan2(dx, dz) - u.yaw)) > (h.arc || 1)) continue; out.push([d, v]); }
  out.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id); return out.slice(0, h.all ? 6 : 2).map(e => e[1]); // a cut takes one man, and maybe the one beside him
};
P.amFirst = function (u, fx, fz, R, cone) { // the first enemy in the line of a thrust or a run; a shield held up covers the space beside its bearer
  const n = this.gatherNear(u.x, u.z, R + 2.2); let best = null, bd = 1e9;
  for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team === u.team || v.type === 'horse' || v.mounted || Math.abs(v.y - u.y) > 2.2) continue;
    const dx = v.x - u.x, dz = v.z - u.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); if (along < 0) continue;
    const cover = v.blocking && v.def.shield ? 0.9 : 0; if (along > R + v.def.r + cover * 0.5 || side > 0.45 + v.def.r + cover + along * Math.tan(cone) * 0.3) continue;
    const sc = along - cover; if (sc < bd) { bd = sc; best = v; } }
  return best;
};
P.amResolve = function (u, v, h, M) {
  const k = u.amK, dx = v.x - u.x, dz = v.z - u.z, d = len(dx, dz) || 1, nx = dx / d, nz = dz / d, hx = v.x - nx * v.def.r, hy = v.y + 1.2, hz = v.z - nz * v.def.r;
  const facing = Math.abs(wrap(Math.atan2(u.x - v.x, u.z - v.z) - v.yaw)) < 1.4; u.amHitAny = 1;
  if (v.iframe > 0 || (v.dodgeT || 0) > 0) { this.events.push({ t: 'amcounter', how: 'dodge', id: u.id, by: v.id, k, x: hx, y: hy, z: hz }); if (M.big) { this.amEnd(u, 1.3); u.st = ST_STUN; u.stT = 0; u.stunDur = 0.9; } return; }
  const canBlock = v.blocking && facing && v.flinchT <= 0 && (v.downT || 0) <= 0;
  if (canBlock) {
    if (v.def.shield && h.thrust) { // the shield meets the point and shoves: he goes back off his feet, open
      u.vx = -nx * 6.5; u.vz = -nz * 6.5; this.amEnd(u, 1.4); u.st = ST_STUN; u.stT = 0; u.stunDur = 1.2; this.posture(u, 45, v);
      this.events.push({ t: 'amcounter', how: 'shield', id: u.id, by: v.id, k, x: hx, y: hy, z: hz }); return; }
    const perfect = v.blockT < 0.22 * (humanOf(this, v) ? 1.3 : 1);
    if (perfect || h.flurry) { this.amEnd(u, 1.1); u.st = ST_STUN; u.stT = 0; u.stunDur = perfect ? 1.0 : 0.7; this.posture(u, 35, v); v.counterT = 0.9;
      this.events.push({ t: 'amcounter', how: 'parry', id: u.id, by: v.id, k, x: hx, y: hy, z: hz }); return; }
    if (h.gb && !v.def.shield) { // a chop or a leap crushes an ordinary guard: half comes through, and he reels
      v.blocking = false; v.flinchT = 0.5; this.posture(v, 40, u); this.events.push({ t: 'guardcrush', x: hx, y: hy, z: hz, by: v.id, att: u.id });
      this.applyDamage(v, ((u.def.dmg && u.def.dmg[h.dir]) || 40) * h.dmg * 0.5, u.id, nx * 2.5, 0, nz * 2.5, 'melee', hx, hy, hz); return; }
    this.posture(v, 25 * h.dmg, u); v.vx = (v.vx || 0) + nx * 2; v.vz = (v.vz || 0) + nz * 2;
    this.events.push({ t: 'block', x: hx, y: hy, z: hz, perfect: false, by: v.id, att: u.id, shield: !!v.def.shield });
    if (!h.flurry && M.steps.length === 1) { this.amEnd(u, 0.35); u.st = ST_RECOVER; u.stT = 0; } return;
  }
  if (h.bash) { v.vx = (v.vx || 0) + nx * (h.push || 5); v.vz = (v.vz || 0) + nz * (h.push || 5); v.st = ST_STUN; v.stT = 0; v.stunDur = h.stun || 0.9; v.blocking = false; this.posture(v, 30, u); this.events.push({ t: 'amhit', id: u.id, at: v.id, k, x: hx, y: hy, z: hz }); return; }
  const base = (u.def.dmg && (u.def.dmg[h.dir] || u.def.dmg[0])) || 40;
  let dmg = base * h.dmg * (this.xc && u.ctrl < 0 && v.ctrl < 0 ? 0.72 : 1);
  if (v.openT > 0) { dmg *= 2.2; v.openT = 0; }
  v.lastAttacker = u.id; const push = h.push || (h.thrust ? 3 : 2.2);
  this.applyDamage(v, dmg, u.id, nx * push, h.trip ? 1.2 : 0.3, nz * push, 'melee', hx, hy, hz);
  if (!v.dead) { if (this.xc && this.hitReact) this.hitReact(v, u, h.thrust ? 'thrust' : 'cut', !!(M.big || h.gb), false); else v.flinchT = 0.45; if (h.trip) v.downT = Math.max(v.downT || 0, h.trip); }
  this.events.push({ t: 'amhit', id: u.id, at: v.id, k, x: hx, y: hy, z: hz });
};

// ---------------- render: the warning, the move, the answer ----------------
if (typeof RENDER === 'undefined' || !RENDER.Renderer) return;
const RP = RENDER.Renderer.prototype;
const NAME = { lunge: ['突 LUNGE', 'sidestep (double-tap A/D) or take it on the shield'], charge: ['衝 CHARGE', 'sidestep, or brace the shield'], flurry: ['連刺 PIKE FLURRY', 'parry a poke and he is open'], spin: ['旋 SPIN CUT', 'back out, or block it'],
  leap: ['躍劈 LEAPING CHOP', 'dodge it - it breaks a plain guard'], sweep: ['橫掃 PIKE SWEEP', 'block or step back - it trips'] };
const COUNTER = { dodge: ['閃 DODGED — he is open', '#9fe0ff'], shield: ['盾 SHIELD SHOVE — strike!', '#ffd36a'], parry: ['格 PARRIED — strike now', '#ffd36a'] };
const baseEv = RP.processEvents;
RP.processEvents = function (events) {
  const sim = this.sim, me = sim && sim.players[this.localIdx], hero = me ? sim.units[me.heroId] : null;
  for (const ev of events) {
    if (ev.t === 'amtele') { const u = sim.units[ev.id]; if (!u) continue; this.burstSparks(u.x + Math.sin(u.yaw) * 0.5, u.y + 1.65, u.z + Math.cos(u.yaw) * 0.5, 9, 1.6, 1, 0.92, 0.6, 0.45, 0.09); // a glint off the blade
      const near = hero && !hero.dead && ev.id !== hero.id && Math.hypot(u.x - hero.x, u.z - hero.z) < 9;
      if (near && NAME[ev.k]) { const N = NAME[ev.k], mine = ev.at === hero.id; this.hitQ = { text: N[0] + (mine ? ' at you' : ' at your comrade') + ' — ' + N[1], t: 1.3, c: mine ? '#ff8a6a' : '#ffd08a' }; }
      if (typeof AUDIO !== 'undefined') AUDIO.play('whistle', u.x, u.y + 1.5, u.z, near ? 0.8 : 0.4); }
    else if (ev.t === 'amgo') { if (typeof AUDIO !== 'undefined' && (ev.k === 'charge' || ev.k === 'leap')) AUDIO.play('thud', ev.x, ev.y, ev.z, 0.9); }
    else if (ev.t === 'amcounter') { const C2 = COUNTER[ev.how]; this.burstSparks(ev.x, ev.y, ev.z, ev.how === 'shield' ? 22 : 16, 7, 1, 0.85, 0.45, 0.4, 0.1); if (typeof AUDIO !== 'undefined') AUDIO.play(ev.how === 'shield' ? 'shield' : ev.how === 'parry' ? 'parry' : 'swing', ev.x, ev.y, ev.z, 1.2);
      if (hero && ev.by === hero.id) { this.hitQ = { text: C2[0], t: 1.2, c: C2[1] }; this.hitstop = Math.max(this.hitstop || 0, 0.06); this.shake = Math.max(this.shake || 0, ev.how === 'shield' ? 0.5 : 0.3); } }
    else if (ev.t === 'amhit') { const a = this.anims && this.anims[ev.id]; if (a) a.dragT = 0.1; if (hero && ev.id === hero.id && MV[ev.k]) { this.hitQ = { text: MV[ev.k].zh, t: 0.5, c: '#fff' }; } }
  }
  return baseEv.call(this, events);
};
// the spin is a real turn of the whole body
const baseFig = RP.drawFigure;
RP.drawFigure = function (slot, u, x, y, z, yaw, alpha, hide) {
  if (u && u.amK === 'spin' && u.amP === 1) yaw = u.yaw;
  return baseFig.call(this, slot, u, x, y, z, yaw, alpha, hide);
};
})();
