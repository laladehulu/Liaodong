// ===================== ANIM: a spring rig over the figure's pose =====================
// drawFigure works out where every joint *should* be this frame (root-local: legs, arms, weapon, chest frame, pelvis,
// the lie/fall pitch). Many of those targets change abruptly: a new attack phase, block on and off, a weapon swap, the
// run cycle starting or stopping, arms switching between swinging free and holding a grip. Set directly, each change
// is a pop. Here every target drives a critically damped spring (exact closed form, stable at any frame rate), so the
// body always travels to a new pose instead of jumping to it. Bone lengths are put back after the springs, a weapon
// held in the hand stays in the hand, and the trunk leans with the root's acceleration. Near figures only: far ones
// (and anyone not drawn for a moment) snap, so it costs nothing at range.
// Render-only: it never touches the sim, so lockstep is unaffected.
const ANIM = (function () {
  const N = 70; // 18 legs + 30 joints + 9 chest axes + pel, pz, dp, oy (+ spares)
  const OL = 0, OJ = 18, OC = 48, OP = 57;
  const W = new Float64Array(N);
  // stiffness (rad/s) per scalar: the trunk and the fall are slower, hands and feet quick
  (function () {
    for (let i = 0; i < 18; i++) W[OL + i] = 42;
    const jw = [20, 23, 25, 20, 23, 25, 25, 22, 17, 15]; // shL elL handL shR elR handR grip dir chest head
    for (let k = 0; k < 10; k++) for (let q = 0; q < 3; q++) W[OJ + k * 3 + q] = jw[k];
    for (let i = 0; i < 9; i++) W[OC + i] = 18;
    W[OP] = 26; W[OP + 1] = 24; W[OP + 2] = 11; W[OP + 3] = 11;
  })();
  const T = new Float64Array(N), Lt = new Float64Array(8);
  const st = { on: true, near: 45, drawn: 0, sprung: 0 };
  function spring(S, V, i, t, w, dt) { const x = S[i] - t, v = V[i], e = Math.exp(-w * dt), g = v + w * x; S[i] = (x + g * dt) * e + t; V[i] = (v - w * g * dt) * e; }
  function d3(A, i, B, j) { return Math.hypot(A[i] - B[j], A[i + 1] - B[j + 1], A[i + 2] - B[j + 2]); }
  // put B (at j) back at distance L from A (at i) along its current direction
  // (only a small correction: when a limb whips through, the lagging joints can cross and the direction flips, and a
  // full correction would then throw the hand or foot to the wrong side)
  function keep(A, i, B, j, L) { const dx = B[j] - A[i], dy = B[j + 1] - A[i + 1], dz = B[j + 2] - A[i + 2], l = Math.hypot(dx, dy, dz) || 1e-6; if (l < L * 0.5 || Math.abs(L - l) > 0.08) return; const k = L / l; B[j] = A[i] + dx * k; B[j + 1] = A[i + 1] + dy * k; B[j + 2] = A[i + 2] + dz * k; }
  // r: renderer, u: unit, a: its anim state; legs/J/C are edited in place; returns [pel, pz, dp, oy]
  function rig(r, u, a, legs, J, C, pel, pz, dp, oy, dt, x, z) {
    const out = a.smOut || (a.smOut = new Float64Array(4));
    st.drawn++;
    const cam = r.camera ? r.camera.position : null, far = cam ? Math.hypot(x - cam.x, z - cam.z) > st.near : false;
    // gather the targets
    for (let i = 0; i < 18; i++) T[OL + i] = legs[i];
    for (let i = 0; i < 30; i++) T[OJ + i] = J[i];
    for (let i = 0; i < 9; i++) T[OC + i] = C[i];
    T[OP] = pel; T[OP + 1] = pz; T[OP + 2] = dp; T[OP + 3] = oy;
    // inertia: the trunk leans into a start and back from a stop (rotated about the pelvis, upper body only)
    if (!(u.mounted || u.mount >= 0) && !u.dead && !(a.dw > 0)) {
      const vx = (u.x - u.px) * 30, vz = (u.z - u.pz) * 30, cy = Math.cos(u.yaw), sy = Math.sin(u.yaw), fwd = vx * sy + vz * cy;
      if (a.smV0 === undefined) a.smV0 = fwd; const acc = (fwd - a.smV0) / Math.max(dt, 1e-3); a.smV0 += (fwd - a.smV0) * Math.min(1, dt * 6);
      a.smAcc = (a.smAcc || 0) + ((Math.abs(fwd) > 12 ? 0 : acc) - (a.smAcc || 0)) * Math.min(1, dt * 5);
      const th = Math.max(-0.16, Math.min(0.16, (a.smAcc || 0) * 0.018));
      if (Math.abs(th) > 0.002) { const c = Math.cos(th), s = Math.sin(th);
        const rot = (o) => { const yy = T[o + 1] - pel, zz = T[o + 2] - pz; T[o + 1] = pel + yy * c - zz * s; T[o + 2] = pz + yy * s + zz * c; };
        const rotv = (o) => { const yy = T[o + 1], zz = T[o + 2]; T[o + 1] = yy * c - zz * s; T[o + 2] = yy * s + zz * c; };
        for (let k = 0; k < 10; k++) { if (k === 7) rotv(OJ + 21); else rot(OJ + k * 3); } rotv(OC); rotv(OC + 3); rotv(OC + 6); } }
    // segment lengths to keep (from the targets: they come out of the IK/FK at the right lengths)
    Lt[0] = d3(T, OJ, T, OJ + 3); Lt[1] = d3(T, OJ + 3, T, OJ + 6); Lt[2] = d3(T, OJ + 9, T, OJ + 12); Lt[3] = d3(T, OJ + 12, T, OJ + 15);
    Lt[4] = d3(T, OL, T, OL + 3); Lt[5] = d3(T, OL + 3, T, OL + 6); Lt[6] = d3(T, OL + 9, T, OL + 12); Lt[7] = d3(T, OL + 12, T, OL + 15);
    const gripR = d3(T, OJ + 18, T, OJ + 15) < 1e-4, gripL = !gripR && d3(T, OJ + 18, T, OJ + 6) < 1e-4;
    let S = a.smS, V = a.smV; const now = r.time || 0;
    const snap = far || !S || now - (a.smT || -9) > 0.3 || dt <= 0;
    if (!S) { S = a.smS = new Float64Array(N); V = a.smV = new Float64Array(N); }
    a.smT = now; a.smSn = snap;
    if (snap) { for (let i = 0; i < N; i++) { S[i] = T[i]; V[i] = 0; } }
    else { st.sprung++; const h = Math.min(dt, 0.05); for (let i = 0; i < 61; i++) spring(S, V, i, T[i], W[i], h);
      // a weapon held in a hand moves with that hand, velocity and all, so letting go of it later starts smoothly
      const hs = gripR ? OJ + 15 : gripL ? OJ + 6 : -1; if (hs >= 0) for (let q = 0; q < 3; q++) { S[OJ + 18 + q] = S[hs + q]; V[OJ + 18 + q] = V[hs + q]; }
      // planted feet are already where they belong: a spring would only drag them (and the hips riding on them) behind
      const fw = a.fpW || 0; if (fw > 0) { for (let i = 0; i < 18; i++) { S[OL + i] += (T[OL + i] - S[OL + i]) * fw; V[OL + i] *= 1 - fw; } S[OP] += (T[OP] - S[OP]) * fw; V[OP] *= 1 - fw; } }
    // write back, with the constraints restored
    for (let i = 0; i < 18; i++) legs[i] = S[OL + i];
    for (let i = 0; i < 30; i++) J[i] = S[OJ + i];
    for (let i = 0; i < 9; i++) C[i] = S[OC + i];
    if (!snap) {
      keep(J, 0, J, 3, Lt[0]); keep(J, 3, J, 6, Lt[1]); keep(J, 9, J, 12, Lt[2]); keep(J, 12, J, 15, Lt[3]);
      keep(legs, 0, legs, 3, Lt[4]); keep(legs, 3, legs, 6, Lt[5]); keep(legs, 9, legs, 12, Lt[6]); keep(legs, 12, legs, 15, Lt[7]);
      if (gripR) { J[18] = J[15]; J[19] = J[16]; J[20] = J[17]; } else if (gripL) { J[18] = J[6]; J[19] = J[7]; J[20] = J[8]; }
      { const l = Math.hypot(J[21], J[22], J[23]) || 1; J[21] /= l; J[22] /= l; J[23] /= l; }
      // chest frame back to orthonormal: Y, then X against it, Z = X × Y
      let l = Math.hypot(C[3], C[4], C[5]) || 1; C[3] /= l; C[4] /= l; C[5] /= l;
      const dxy = C[0] * C[3] + C[1] * C[4] + C[2] * C[5]; C[0] -= C[3] * dxy; C[1] -= C[4] * dxy; C[2] -= C[5] * dxy; l = Math.hypot(C[0], C[1], C[2]) || 1; C[0] /= l; C[1] /= l; C[2] /= l;
      C[6] = C[1] * C[5] - C[2] * C[4]; C[7] = C[2] * C[3] - C[0] * C[5]; C[8] = C[0] * C[4] - C[1] * C[3];
    }
    out[0] = S[OP]; out[1] = S[OP + 1]; out[2] = S[OP + 2]; out[3] = S[OP + 3];
    return out;
  }
  // ---------------- foot planting ----------------
  // A man's feet are where he put them. Each foot has a planted spot in the world and stays exactly there; when the
  // hips have moved (or turned) far enough past it, it steps: lifted on an arc to a landing spot ahead of where the
  // hips are going, then planted again. Walking is long slow steps, running short quick ones with a moment in the air
  // when both feet are up. The legs are solved to reach the feet (two-bone IK, knee forward), and the hips ride on
  // whatever foot is down, so the bob, the drop on a long stride and the lower hips on a slope come from the feet.
  // In a fighting stance the ideal spots are the stance's own feet, so a lunge steps into the blow and a turn on the
  // spot is a few small pivot steps. Render-only; near figures only (far ones keep the cycle).
  const FP = { on: true, near: 40 }, LT = 0.46, LS = 0.46;
  const FT = new Float64Array(6), IL = new Float64Array(9);
  function legIK(out, o, side, tx, ty, tz) { // hip at (side*0.1, 0, 0) root-local; out gets hip, knee, foot
    const hx = side * 0.1; let dx = tx - hx, dy = ty, dz = tz; let d = Math.hypot(dx, dy, dz) || 1e-4;
    const dm = Math.min(Math.max(d, 0.25), LT + LS - 0.004), k = dm / d; dx *= k; dy *= k; dz *= k; d = dm;
    const ux = dx / d, uy = dy / d, uz = dz / d, ca = (LT * LT + d * d - LS * LS) / (2 * LT * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    let px = side * 0.12, py = 0, pz = 1; const dp = px * ux + py * uy + pz * uz; px -= ux * dp; py -= uy * dp; pz -= uz * dp; const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl; // the knee bends forward (and a touch out)
    out[o] = hx; out[o + 1] = 0; out[o + 2] = 0;
    out[o + 3] = hx + LT * (ux * ca + px * sa); out[o + 4] = LT * (uy * ca + py * sa); out[o + 5] = LT * (uz * ca + pz * sa);
    out[o + 6] = hx + dx; out[o + 7] = dy; out[o + 8] = dz;
  }
  const sm = (t) => t * t * (3 - 2 * t);
  // legs: the cycle's legs (root-local, edited in place); pel: the cycle's pelvis height; pz: the lunge's forward shift of
  // the whole leg set; x,y,z/cy,sy: the root in the world; vsc: the man's size. Returns the pelvis height to use.
  function feet(r, u, a, legs, pel, pz, x, y, z, cy, sy, vsc, dt) {
    const now = r.time || 0, cam = r.camera ? r.camera.position : null, near = FP.on && st.on && (!cam || Math.hypot(x - cam.x, z - cam.z) < FP.near) && dt > 0 && dt < 0.1;
    let F = a.fp;
    a.fpW = (a.fpW || 0) + ((near ? 1 : 0) - (a.fpW || 0)) * Math.min(1, dt * 6);
    if (!near && a.fpW < 0.01) { a.fpW = 0; if (F) F.ok = false; return pel; }
    const tH = SIM.terrainH;
    // the hips' velocity (rendered, so knockback and hit shoves are walked too), smoothed
    if (!F) F = a.fp = { px: new Float64Array(2), pz: new Float64Array(2), sx: new Float64Array(2), sz: new Float64Array(2), lx: new Float64Array(2), lz: new Float64Array(2), t: new Float64Array(2), ok: false, vx: 0, vz: 0, X: x, Z: z, T: now, last: -9, still: 0, n: 0 };
    const reset = !F.ok || now - F.T > 0.3 || Math.hypot(x - F.X, z - F.Z) > 2.5;
    if (!reset) { const k = Math.min(1, dt * 10), ivx = (x - F.X) / dt, ivz = (z - F.Z) / dt; if (Math.hypot(ivx, ivz) < 14) { F.vx += (ivx - F.vx) * k; F.vz += (ivz - F.vz) * k; } }
    else { F.vx = 0; F.vz = 0; }
    F.X = x; F.Z = z; F.T = now;
    const vx = F.vx, vz = F.vz, spd = Math.hypot(vx, vz);
    // ideal foot spots: the stance's own feet when standing, a neutral track under the hips when moving
    const kM = Math.min(1, spd / 1.2);
    for (let f = 0; f < 2; f++) { const o = f * 9, side = f ? -1 : 1;
      const lx = legs[o + 6] * (1 - kM) + side * 0.13 * kM, lz = (legs[o + 8] + pz) * (1 - kM);
      FT[f * 3] = x + (lx * cy + lz * sy) * vsc; FT[f * 3 + 2] = z + (-lx * sy + lz * cy) * vsc; }
    const Tstep = Math.min(0.55, Math.max(0.2, 0.62 - spd * 0.065)), run = spd > 4.2, Tsw = Math.max(0.17, Tstep * (run ? 1.12 : 0.82)), lift = Math.min(0.2, 0.05 + spd * 0.028);
    if (reset) { for (let f = 0; f < 2; f++) { F.px[f] = FT[f * 3]; F.pz[f] = FT[f * 3 + 2]; F.t[f] = -1; } F.ok = true; F.last = now; }
    // trigger a step
    F.still = spd < 0.25 ? F.still + dt : 0;
    const thr = spd > 0.3 ? Math.max(0.13, spd * Tstep * 0.55) : (F.still > 0.35 ? 0.07 : 0.14);
    const lead = spd > 0.3 ? Tstep * 0.25 : 0;
    let best = -1, be = thr;
    for (let f = 0; f < 2; f++) { if (F.t[f] >= 0) continue; const g = 1 - f, otherOk = F.t[g] < 0 || (run && F.t[g] > 0.55) || (!run && F.t[g] > 0.92); if (!otherOk) continue; if (now - F.last < Tstep * (spd > 0.3 ? 0.55 : 0.8)) continue;
      const e = Math.hypot(F.px[f] - (FT[f * 3] + vx * lead), F.pz[f] - (FT[f * 3 + 2] + vz * lead)); if (e > be) { be = e; best = f; } }
    if (best >= 0) { F.t[best] = 0; F.sx[best] = F.px[best]; F.sz[best] = F.pz[best]; F.last = now; F.n++; a.fpLast = best; }
    // move the swinging feet (the landing spot is re-predicted every frame, so a turn mid-step lands where it should)
    const hy = [0, 0];
    for (let f = 0; f < 2; f++) { if (F.t[f] < 0) continue; F.t[f] = Math.min(1, F.t[f] + dt / Tsw);
      const rem = Tsw * (1 - F.t[f]), ahead = spd > 0.3 ? Tstep * 0.42 : 0;
      F.lx[f] = FT[f * 3] + vx * (rem + ahead); F.lz[f] = FT[f * 3 + 2] + vz * (rem + ahead);
      const s = sm(F.t[f]); F.px[f] = F.sx[f] + (F.lx[f] - F.sx[f]) * s; F.pz[f] = F.sz[f] + (F.lz[f] - F.sz[f]) * s;
      hy[f] = Math.sin(F.t[f] * Math.PI) * (spd > 0.3 ? lift : 0.05);
      if (F.t[f] >= 1) { F.t[f] = -1; hy[f] = 0; } }
    // arms swing with the legs: lock the cycle phase to the stepping foot (left leg forward at ph = pi/2)
    if (spd > 0.4 && a.fpLast !== undefined) { const f = a.fpLast, tt = F.t[f] >= 0 ? F.t[f] : 1, want = (f ? Math.PI / 2 : -Math.PI / 2) + tt * Math.PI;
      let dph = (want - a.ph) % (2 * Math.PI); if (dph > Math.PI) dph -= 2 * Math.PI; if (dph < -Math.PI) dph += 2 * Math.PI; a.ph += dph * Math.min(1, dt * 8); }
    // the hips ride on the planted feet: as high as the cycle wants, no higher than a down foot allows
    let pelOut = pel;
    for (let f = 0; f < 2; f++) { const side = f ? -1 : 1, hx = x + side * 0.1 * cy * vsc, hz = z - side * 0.1 * sy * vsc, gy = tH(F.px[f], F.pz[f]) + hy[f];
      FT[f * 3 + 1] = gy; if (F.t[f] >= 0) continue;
      const dh = Math.hypot(F.px[f] - hx, F.pz[f] - hz), L = (LT + LS) * 0.985 * vsc; const top = gy + Math.sqrt(Math.max(0, L * L - dh * dh)); const pmax = (top - y) / vsc; if (pmax < pelOut) pelOut = pmax; }
    pelOut = Math.max(pelOut, pel - 0.32);
    // solve the legs to the feet (root-local, relative to the pelvis), and blend with the cycle by the near weight
    const w = a.fpW;
    for (let f = 0; f < 2; f++) { const o = f * 9, side = f ? -1 : 1, dX = (F.px[f] - x) / vsc, dZ = (F.pz[f] - z) / vsc;
      const lx = dX * cy - dZ * sy, lz = dX * sy + dZ * cy - pz, ly = (FT[f * 3 + 1] - y) / vsc - pelOut;
      legIK(IL, 0, side, lx, ly, lz); for (let i = 0; i < 9; i++) legs[o + i] = legs[o + i] + (IL[i] - legs[o + i]) * w; }
    return pel + (pelOut - pel) * w;
  }
  return { rig, feet, st, FP, get on() { return st.on; }, set on(v) { st.on = !!v; }, get fpOn() { return FP.on; }, set fpOn(v) { FP.on = !!v; } };
})();
