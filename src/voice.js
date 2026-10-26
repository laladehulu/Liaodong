// ===== Soldiers' voices: every man has his own =====
// All voices are made here, in code: a small formant synthesiser (a glottal pulse through the resonances of a vocal
// tract, plus breath and fricative noise) renders a bank of shouts, grunts, cries of pain and death, calls for help and
// barked orders once at start-up. At play time each man colours the same clips his own way: his pitch and body size
// (playback rate), a resonance of his own (EQ), how hoarse he is (soft clipping) and which takes he favours.
// Recorded packs can be added later with VOICE.addPack({ category: [base64 mp3, ...] }); real recordings are then
// preferred over the synthesised takes of that category. Client only: nothing here touches the simulation.
const VOICE = (() => {
  const SR = 22050;
  // vowel and consonant targets for a man's voice: [F1, F2, F3, voicing, noise, noise centre]
  const PH = {
    a: [760, 1220, 2500, 1, 0, 0], o: [520, 880, 2400, 1, 0, 0], u: [340, 760, 2300, 1, 0, 0], e: [540, 1420, 2480, 1, 0, 0],
    i: [290, 2200, 2950, 1, 0, 0], y: [300, 1750, 2300, 1, 0, 0], ng: [260, 1150, 2400, 0.55, 0, 0], n: [260, 1500, 2500, 0.55, 0, 0],
    m: [250, 1100, 2300, 0.5, 0, 0], l: [380, 1200, 2600, 0.8, 0, 0], w: [320, 700, 2300, 0.8, 0, 0],
    sh: [500, 1400, 2500, 0, 1, 2900], zh: [450, 1400, 2400, 0.35, 0.75, 2600], s: [500, 1500, 2600, 0, 0.8, 5200],
    f: [500, 1400, 2500, 0, 0.45, 3800], h: [700, 1250, 2500, 0, 0.6, 1600], x: [500, 1600, 2600, 0, 0.8, 3600],
    // stops: a short burst then the next sound
    d: [300, 1700, 2600, 0, 0.9, 3400], t: [300, 1700, 2600, 0, 1, 3800], g: [300, 1300, 2400, 0, 0.9, 1800], k: [300, 1300, 2400, 0, 1, 2200],
    ch: [400, 1600, 2600, 0, 1, 3100], j: [300, 2000, 2800, 0, 0.9, 3300], b: [300, 900, 2300, 0, 0.7, 1200],
    // grunt vowels: pressed and dark
    U: [420, 1000, 2350, 1, 0, 0], E: [600, 1300, 2450, 1, 0, 0],
  };
  let rs = 1; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  // seq: [[phoneme, seconds], ...]; f0: [[t (0..1), Hz], ...]; o: { rasp, breath, gain }
  function synth(seq, f0, o) {
    o = o || {}; const dur = seq.reduce((s, p) => s + p[1], 0) + 0.06, N = Math.floor(dur * SR), out = new Float32Array(N);
    // per-sample targets with 25 ms glides between sounds
    const T = []; let acc = 0; for (const [p, d] of seq) { T.push([acc, PH[p] || PH.a, d, p]); acc += d; }
    const tgt = (t) => { let k = 0; while (k + 1 < T.length && T[k + 1][0] <= t) k++; const A = T[k][1], nx = T[k + 1]; const g = nx ? Math.max(0, Math.min(1, (t - (nx[0] - 0.025)) / 0.025)) : 0;
      const B = nx ? nx[1] : A; const r = []; for (let j = 0; j < 6; j++) r[j] = A[j] + (B[j] - A[j]) * g; r.stop = /^(d|t|g|k|ch|j|b)$/.test(T[k][3]) && t - T[k][0] < Math.min(0.03, T[k][2]); return r; };
    const pitch = (u) => { let k = 0; while (k + 1 < f0.length && f0[k + 1][0] <= u) k++; const a = f0[k], b = f0[k + 1] || a; const g = b[0] > a[0] ? (u - a[0]) / (b[0] - a[0]) : 0; return a[1] + (b[1] - a[1]) * g; };
    const res = () => ({ y1: 0, y2: 0 }); const R = [res(), res(), res(), res()], RN = res();
    const step = (s, x, f, bw) => { const r = Math.exp(-Math.PI * bw / SR), c = 2 * r * Math.cos(2 * Math.PI * f / SR); const y = (1 - r) * x * 2 + c * s.y1 - r * r * s.y2; s.y2 = s.y1; s.y1 = y; return y; };
    let ph = 0, gp = 0, jit = 0, shim = 1; const rasp = o.rasp || 0, breath = o.breath || 0.08;
    let P = null, pf = 0;
    for (let n = 0; n < N; n++) {
      const t = n / SR, u = t / dur; if ((n & 31) === 0) { P = tgt(t); pf = pitch(u); }
      if (n % 220 === 0) { jit = (rnd() - 0.5) * (0.02 + rasp * 0.08); shim = 1 - rnd() * (0.08 + rasp * 0.3); }
      const f = pf * (1 + jit); ph += f / SR; if (ph >= 1) ph -= 1;
      // the glottal pulse (open for 60% of the cycle) and its derivative as it leaves the lips
      const g = ph < 0.6 ? Math.pow(Math.sin(Math.PI * ph / 0.6), 2) : 0; let src = (g - gp) * 6 * shim; gp = g;
      if (rasp > 0 && ph > 0.5 && ph < 0.55) src += (rnd() - 0.5) * rasp * 0.9;
      const env = Math.min(1, t / 0.012, (dur - 0.06 - t) / 0.05 + 0.02); const e = Math.max(0, env);
      const nz = rnd() * 2 - 1; let v = src * P[3] + nz * breath * P[3] * 0.6;
      // parallel formants: each resonance of the tract adds its own peak, so vowels read as vowels
      const y = step(R[0], v, P[0], 80) * 1.0 + step(R[1], v, P[1], 100) * 0.7 + step(R[2], v, P[2], 150) * 0.4 + step(R[3], v, 3400, 250) * 0.22;
      let fr = 0; if (P[4] > 0) { fr = step(RN, nz, P[5], P[5] * 0.3) * P[4] * (P.stop ? 1.4 : 0.5); }
      out[n] = (y * 1.6 + fr) * e;
    }
    // loudness: peak-normalise, then a soft clip so shouts sound strained
    let pk = 0; for (let n = 0; n < N; n++) pk = Math.max(pk, Math.abs(out[n])); const k = pk > 0 ? 1 / pk : 1, dr = 1 + (o.press || 0) * 1.4;
    for (let n = 0; n < N; n++) out[n] = Math.tanh(out[n] * k * dr) / Math.tanh(dr) * (o.gain || 0.9);
    return out;
  }
  const W = (s) => s.split(' ').map(x => { const [p, d] = x.split(':'); return [p, +d]; });
  // the bank: what each category is made of (a few takes each, at several pitches)
  const BANK = {
    // war cries: 殺! 衝啊! 喝!
    cry: [['sh:.09 a:.42', [[0, 230], [0.3, 260], [1, 160]], 0.7], ['ch:.06 o:.12 ng:.08 a:.46', [[0, 210], [0.35, 250], [1, 170]], 0.7],
      ['h:.06 E:.3', [[0, 200], [0.4, 240], [1, 150]], 0.8], ['sh:.08 a:.6', [[0, 250], [0.5, 280], [1, 180]], 0.6]],
    // Jin cries: hiya! ai! gene! (go) afa! (fight)
    jcry: [['h:.05 i:.06 y:.04 a:.4', [[0, 220], [0.4, 270], [1, 170]], 0.7], ['a:.28 i:.16', [[0, 240], [0.5, 210], [1, 160]], 0.7],
      ['g:.03 e:.12 n:.06 e:.3', [[0, 200], [0.5, 230], [1, 150]], 0.7], ['a:.12 f:.07 a:.36', [[0, 210], [0.6, 250], [1, 160]], 0.7]],
    // effort and grunts: huh! hah! ngh
    effort: [['h:.03 U:.12', [[0, 140], [1, 110]], 0.9], ['h:.04 E:.1', [[0, 150], [1, 120]], 0.8], ['U:.1 m:.05', [[0, 130], [1, 100]], 1], ['h:.03 a:.09', [[0, 160], [1, 125]], 0.8]],
    // pain: ah! agh! ugh
    pain: [['a:.22', [[0, 210], [0.2, 300], [1, 170]], 0.8], ['E:.18 h:.06', [[0, 190], [0.25, 270], [1, 150]], 0.8], ['h:.03 U:.2', [[0, 170], [0.3, 230], [1, 130]], 0.9], ['a:.12 U:.12', [[0, 230], [0.3, 290], [1, 160]], 0.8]],
    // death: a long falling cry, breath running out
    death: [['a:.55 U:.25', [[0, 260], [0.15, 290], [0.7, 150], [1, 90]], 0.7], ['E:.3 a:.35 h:.2', [[0, 230], [0.3, 250], [1, 95]], 0.6], ['h:.05 U:.5', [[0, 200], [0.2, 220], [1, 85]], 0.8], ['a:.7', [[0, 300], [0.1, 320], [0.6, 170], [1, 80]], 0.6]],
    // calls for help: 救命! and a moan
    help: [['j:.04 i:.06 o:.12 u:.08 m:.05 i:.12 ng:.12', [[0, 220], [0.4, 240], [0.6, 260], [1, 170]], 0.6], ['U:.6', [[0, 150], [0.5, 170], [1, 110]], 0.5]],
    // panting
    pant: [['h:.12 a:.05 h:.12', [[0, 120], [1, 110]], 0.2]],
    // orders: 放! 頂住! 列陣! 跟我來! 退! 舉銃!
    o_fire: [['f:.08 a:.22 ng:.12', [[0, 220], [1, 140]], 0.7]],
    o_hold: [['d:.03 i:.12 ng:.07 zh:.07 u:.26', [[0, 200], [0.4, 180], [0.6, 230], [1, 150]], 0.7]],
    o_form: [['l:.05 i:.05 e:.16 zh:.07 e:.12 n:.12', [[0, 230], [0.4, 170], [0.6, 230], [1, 150]], 0.7]],
    o_follow: [['g:.03 e:.1 n:.06 w:.05 o:.14 l:.05 a:.16 i:.12', [[0, 200], [0.35, 190], [0.5, 170], [0.75, 230], [1, 160]], 0.7]],
    o_back: [['t:.03 u:.08 e:.08 i:.2', [[0, 220], [1, 150]], 0.7]],
    o_charge: [['ch:.06 o:.12 ng:.08 a:.46', [[0, 210], [0.35, 250], [1, 170]], 0.7]],
  };
  const B = {}, REC = {}; let ctx = null, out = null, built = false;
  let on = true, vol = 0.85; try { const s = JSON.parse(localStorage.getItem('mingVoice') || 'null'); if (s) { on = s.on !== false; vol = s.vol === undefined ? vol : s.vol; } } catch (e) {}
  function build() {
    if (built || !AUDIO.ready) return !!built; ctx = AUDIO.ctx; built = true; rs = 7;
    out = ctx.createGain(); out.gain.value = on ? vol : 0; out.connect(AUDIO.master);
    // rendered a few takes at a time in idle moments, so starting the sound never stalls a frame
    const jobs = []; for (const cat in BANK) { B[cat] = []; for (const [w, f0, br] of BANK[cat]) for (const sc of [0.92, 1.08]) jobs.push([cat, w, f0, br, sc]); }
    const work = () => { const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 6) { const [cat, w, f0, br, sc] = jobs.shift();
        const f = f0.map(([u, h]) => [u, h * sc]); const d = synth(W(w), f, { rasp: 0.15 + rnd() * 0.3, breath: br * 0.12, press: cat === 'cry' || cat === 'jcry' || cat.startsWith('o_') ? 0.6 : 0.3 });
        const buf = ctx.createBuffer(1, d.length, SR); buf.copyToChannel ? buf.copyToChannel(d, 0) : buf.getChannelData(0).set(d); B[cat].push(buf); }
      if (jobs.length) setTimeout(work, 16); };
    setTimeout(work, 0);
    if (typeof VOICE_DATA !== 'undefined') addPack(VOICE_DATA);
    return true;
  }
  // recorded packs plug in here, per category
  function addPack(map) { if (!build()) return; for (const cat in map) for (const b64 of map[cat]) { try { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    ctx.decodeAudioData(u.buffer, (buf) => { (REC[cat] = REC[cat] || []).push(buf); }, () => {}); } catch (e) {} } }
  // ---- each man's own voice ----
  const VP = new Map(); const sh = (s, k) => { let h = 2166136261 ^ k; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; };
  function vp(u) { const key = u.look && u.look.id ? 'L' + u.look.id : 'U' + u.id; let v = VP.get(key); if (v) return v;
    const H = (k) => sh(key, k), tall = u.look && u.look.h ? u.look.h : 1;
    v = { rate: (0.84 + H(1) * 0.32) / Math.pow(tall, 0.6) * (u.team === 1 ? 0.95 : 1), rasp: H(2) * 0.55 + (u.team === 1 ? 0.12 : 0), eqF: 700 + H(3) * 2000, eqG: -5 + H(4) * 10, gain: 0.75 + H(5) * 0.35, fav: Math.floor(H(6) * 997), next: 0 };
    if (VP.size > 600) VP.clear(); VP.set(key, v); return v; }
  const curves = {}; function curve(a) { const k = Math.round(a * 10); if (curves[k]) return curves[k]; const n = 256, c = new Float32Array(n), d = 1 + k * 0.8; for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * d) / Math.tanh(d); } return (curves[k] = c); }
  // ---- the mix: a handful of voices at a time, nearest and most important first ----
  const active = []; const MAX = 7;
  function say(cat, u, prio, x, y, z, volMul) {
    if (!on || !build()) return false; const now = ctx.currentTime; x = x === undefined ? u.x : x; z = z === undefined ? u.z : z; y = y === undefined ? (u.y || 0) + 1.5 : y;
    const v = u ? vp(u) : { rate: 0.9 + Math.random() * 0.25, rasp: 0.3, eqF: 1500, eqG: 0, gain: 0.9, fav: (Math.random() * 99) | 0, next: 0 };
    if (u && now < v.next && prio < 4) return false;
    const sp = AUDIO.spatial ? AUDIO.spatial(x, y, z, vol * v.gain * (volMul || 1), cat === 'death' || cat === 'help' ? 140 : 110) : { gain: vol, pan: 0, dist: 0, wet: 0.1 }; if (!sp) return false;
    for (let i = active.length - 1; i >= 0; i--) if (active[i].end <= now) active.splice(i, 1);
    const score = prio * 10 - sp.dist * 0.15;
    if (active.length >= MAX) { let lo = 0; for (let i = 1; i < active.length; i++) if (active[i].score < active[lo].score) lo = i; if (active[lo].score >= score) return false; try { active[lo].src.stop(); } catch (e) {} active.splice(lo, 1); }
    const rec = REC[cat], syn = B[cat]; let list = rec && rec.length && (Math.random() < 0.8 || !syn || !syn.length) ? rec : syn; if (!list || !list.length) list = rec; if (!list || !list.length) return false;
    const buf = list[(v.fav + ((Math.random() * 3) | 0) * 5) % list.length];
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = v.rate * (0.96 + Math.random() * 0.08);
    const eq = ctx.createBiquadFilter(); eq.type = 'peaking'; eq.frequency.value = v.eqF; eq.Q.value = 1.1; eq.gain.value = v.eqG;
    const ws = ctx.createWaveShaper(); ws.curve = curve(v.rasp); const g = ctx.createGain(); g.gain.value = sp.gain;
    // a distant voice loses its top end in the din
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000 / (1 + sp.dist / 35);
    src.connect(eq); eq.connect(ws); ws.connect(lp); lp.connect(g);
    let node = g; if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = sp.pan; g.connect(p); node = p; } node.connect(out);
    if (AUDIO.verbIn && sp.wet) { const w = ctx.createGain(); w.gain.value = sp.wet * 0.8; node.connect(w); w.connect(AUDIO.verbIn); }
    const t0 = now + Math.min(0.5, sp.dist / 343); src.start(t0); const end = t0 + buf.duration / src.playbackRate.value;
    active.push({ src, end, score }); if (u) v.next = end + 0.35 + Math.random() * 0.6; return true;
  }
  const lastOrd = {};
  const human = (u) => u && !u.camp && u.type !== 'horse' && u.def && u.def.ai !== 'cannon';
  const cryOf = (u) => (u.team === 1 ? 'jcry' : 'cry');
  // a company answering a shout: a few of its men cry out, one after another
  function chorus(sim, sq, cat, n) { if (!sq) return; let k = 0; for (const id of sq.unitIds) { const m = sim.units[id]; if (!human(m) || m.dead || m.downed) continue; if (Math.random() < 0.55 && k < n) { const d = 0.15 + k * 0.22 + Math.random() * 0.2; k++; setTimeout(() => say(cat || cryOf(m), m, 2), d * 1000); } } }
  // ---- what the battle sounds like ----
  function ev(e, sim, heroId) {
    if (!on || !AUDIO.ready) return; const U = sim.units;
    switch (e.t) {
      case 'swing': { const u = U[e.id]; if (human(u) && Math.random() < (e.id === heroId ? 0.55 : 0.16)) say('effort', u, e.id === heroId ? 3 : 1); break; }
      case 'heavy': { const u = U[e.id]; if (human(u) && Math.random() < 0.8) say('effort', u, 2, undefined, undefined, undefined, 1.25); break; }
      case 'block': { const u = U[e.id]; if (human(u) && Math.random() < 0.18) say('effort', u, 1, undefined, undefined, undefined, 0.8); break; }
      case 'hit': { const u = U[e.id]; if (!human(u) || e.killed || (e.dmg || 0) < 8) break; if (Math.random() < (e.id === heroId ? 1 : 0.5)) say('pain', u, e.id === heroId ? 4 : 2); break; }
      case 'death': { const u = U[e.id]; if (human(u) && Math.random() < 0.85) say('death', u, 3); break; }
      case 'zdown': { const u = U[e.id]; if (human(u)) setTimeout(() => say('help', u, 3), 600); break; }
      case 'warcry': { const u = U[e.id]; if (human(u)) { say(cryOf(u), u, 4, undefined, undefined, undefined, 1.3); if (u.squad >= 0) chorus(sim, sim.squads[u.squad], null, 4); } break; }
      case 'rally': { const p = sim.players[e.p], h = p && U[p.heroId]; if (human(h)) say(cryOf(h), h, 4, undefined, undefined, undefined, 1.3); if (p) for (const id of p.squads) chorus(sim, sim.squads[id], null, 2); break; }
      case 'volley': { const sq = sim.squads[e.sq]; if (!sq || Math.random() < 0.4) break; const m = U[sq.unitIds.find(id => !U[id].dead)]; if (human(m)) say(m.team === 1 ? 'jcry' : 'o_fire', m, 2, undefined, undefined, undefined, 0.9); break; }
      case 'order': { const p = sim.players[e.p], h = p && U[p.heroId], sq = sim.squads[e.sq]; if (!human(h) || h.dead || performance.now() - (lastOrd[e.p] || 0) < 900) break; lastOrd[e.p] = performance.now();
        const O = SIM.ORD_CHARGE !== undefined ? SIM : { ORD_CHARGE: 1, ORD_HOLD: 2, ORD_FOLLOW: 3, ORD_FORM: 4, ORD_FIRE: 5 };
        const cat = h.team === 1 ? 'jcry' : e.type === O.ORD_CHARGE ? 'o_charge' : e.type === O.ORD_HOLD ? 'o_hold' : e.type === O.ORD_FOLLOW ? 'o_follow' : e.type === O.ORD_FORM ? 'o_form' : e.type === O.ORD_FIRE ? 'o_fire' : null;
        if (cat) say(cat, h, 4, undefined, undefined, undefined, 1.2); if (e.type === O.ORD_CHARGE) chorus(sim, sq, null, 4); break; }
    }
  }
  // the din: distant men crying out where the fighting is, downed men calling, your own breath when you're spent
  let dinT = 0, helpT = 0, pantT = 0;
  function frame(dt, sim, heroId) {
    if (!on || !AUDIO.ready || !sim) return; dinT -= dt; helpT -= dt; pantT -= dt;
    if (dinT <= 0) { dinT = 0.3; let n = 0, pick = null; const L = AUDIO.listener || { x: 0, z: 0 };
      for (let i = 0; i < 60; i++) { const u = sim.units[(Math.random() * sim.units.length) | 0]; if (!u || u.dead || !human(u) || u.st < 1 || u.st > 3) continue; n++; const d = Math.hypot(u.x - L.x, u.z - L.z); if (d > 18 && d < 150) pick = u; }
      if (pick && Math.random() < Math.min(0.85, n * 0.06)) say(Math.random() < 0.6 ? cryOf(pick) : Math.random() < 0.6 ? 'pain' : 'death', pick, 0, undefined, undefined, undefined, 0.7); }
    if (helpT <= 0) { helpT = 4 + Math.random() * 3; const d = sim.units.filter(u => u.downed && !u.dead && u.reviveBy < 0); if (d.length) say('help', d[(Math.random() * d.length) | 0], 2, undefined, undefined, undefined, 0.8); }
    const h = sim.units[heroId]; if (h && !h.dead && pantT <= 0 && (h.fat || 0) > 0.75) { pantT = 1.4; say('pant', h, 3, undefined, undefined, undefined, 0.5); }
  }
  function set(o) { if (o.on !== undefined) on = !!o.on; if (o.vol !== undefined) vol = o.vol; if (out) out.gain.value = on ? vol : 0; try { localStorage.setItem('mingVoice', JSON.stringify({ on, vol })); } catch (e) {} }
  // offline rendering of the bank (for previews and tests)
  function render(cat, k, sc) { const e = BANK[cat][k || 0]; const f = e[1].map(([u, h]) => [u, h * (sc || 1)]); return synth(W(e[0]), f, { rasp: 0.25, breath: e[2] * 0.12, press: 0.6 }); }
  // the menu switch
  if (typeof document !== 'undefined') setTimeout(() => { const cb = document.getElementById('optVoice'); if (cb) { cb.checked = on; cb.onchange = () => set({ on: cb.checked }); } }, 0);
  return { ev, frame, say, set, addPack, render, SR, BANK, get on() { return on; } };
})();
