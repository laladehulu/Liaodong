// ===== Deterministic math =====
// Only +,-,*,/ and Math.sqrt/floor/abs are used by the simulation so every
// browser produces bit-identical results (IEEE-754 double). Trig is done with
// our own polynomials because Math.sin/atan2 differ between JS engines.
const DM = (() => {
  const PI = Math.PI, TAU = PI * 2, HPI = PI / 2;
  const C3 = -1 / 6, C5 = 1 / 120, C7 = -1 / 5040, C9 = 1 / 362880, C11 = -1 / 39916800;
  function sin(x) {
    x = x - TAU * Math.floor((x + PI) / TAU);
    if (x > HPI) x = PI - x; else if (x < -HPI) x = -PI - x;
    const x2 = x * x;
    return x * (1 + x2 * (C3 + x2 * (C5 + x2 * (C7 + x2 * (C9 + x2 * C11)))));
  }
  function cos(x) { return sin(x + HPI); }
  function atanU(x) {
    const x2 = x * x;
    return x * (0.99997726 + x2 * (-0.33262347 + x2 * (0.19354346 + x2 * (-0.11643287 + x2 * (0.05265332 + x2 * (-0.01172120))))));
  }
  function atan2(y, x) {
    if (x === 0 && y === 0) return 0;
    const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y;
    let a = ax >= ay ? atanU(ay / ax) : HPI - atanU(ax / ay);
    if (x < 0) a = PI - a;
    return y < 0 ? -a : a;
  }
  function asin(x) { if (x > 1) x = 1; else if (x < -1) x = -1; return atan2(x, Math.sqrt(1 - x * x)); }
  function wrap(a) { return a - TAU * Math.floor((a + PI) / TAU); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function len(x, z) { return Math.sqrt(x * x + z * z); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpAngle(a, b, t) { return a + wrap(b - a) * t; }
  return { PI, TAU, HPI, sin, cos, atan2, asin, wrap, clamp, len, lerp, lerpAngle };
})();

class RNG {
  constructor(seed) { this.s = seed | 0; }
  next() {
    let t = this.s = (this.s + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(n) { return Math.floor(this.next() * n); }
  sign() { return this.next() < 0.5 ? -1 : 1; }
}
