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
    else { st.sprung++; const h = Math.min(dt, 0.05); for (let i = 0; i < 61; i++) spring(S, V, i, T[i], W[i], h); }
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
  return { rig, st, get on() { return st.on; }, set on(v) { st.on = !!v; } };
})();
