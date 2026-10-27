// ===== Recorded samples: decoded once from the embedded SND_DATA (see CREDITS in the help screen) =====
const SAMPLES = (() => {
  const B = {}, banks = {}; let started = false, n = 0;
  function load(ctx) {
    if (started || typeof SND_DATA === 'undefined') return; started = true;
    for (const k in SND_DATA) {
      let u; try { const bin = atob(SND_DATA[k]); u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); } catch (e) { continue; }
      const done = (buf) => { if (!buf) return; B[k] = buf; n++; const m = k.match(/^(.*)_(\d+)$/); if (m) (banks[m[1]] = banks[m[1]] || []).push(buf); };
      try { const pr = ctx.decodeAudioData(u.buffer, done, () => {}); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
    }
  }
  return { load, get: (k) => B[k] || null, pick: (p) => { const b = banks[p]; return b && b.length ? b[(Math.random() * b.length) | 0] : null; }, get count() { return n; } };
})();

// ===== Audio engine: recorded effects where we have them, synthesis for the rest =====
const AUDIO = (() => {
  let deaf = null, ctx = null, master = null, noiseBuf = null, verb = null, verbIn = null, amb = null;
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  let budget = 0, lastFrame = 0;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.6; deaf = ctx.createBiquadFilter(); deaf.type = 'lowpass'; deaf.frequency.value = 20000; deaf.Q.value = 0.5; master.connect(deaf); deaf.connect(ctx.destination);
      const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      // valley reverb: a generated stereo impulse with a long, darkening tail
      const L = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, L, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); let lp = 0; for (let i = 0; i < L; i++) { const t = i / L; lp += (Math.random() * 2 - 1 - lp) * (0.5 - t * 0.42); ch[i] = lp * Math.pow(1 - t, 2.6) * (i < ctx.sampleRate * 0.012 ? 0 : 1); } }
      verb = ctx.createConvolver(); verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.55; verbIn.connect(verb); verb.connect(master);
      SAMPLES.load(ctx);
    } catch (e) { ctx = null; }
  }
  function setListener(x, y, z, yaw) { listener.x = x; listener.y = y; listener.z = z; listener.yaw = yaw; }
  function spatial(x, y, z, vol, maxDist) {
    if (x === undefined) return { gain: vol, pan: 0, dist: 0, wet: 0.08 };
    const dx = x - listener.x, dz = z - listener.z, dy = y - listener.y;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) return null;
    const g = vol / (1 + dist / 18);
    const rx = -Math.cos(listener.yaw), rz = Math.sin(listener.yaw);
    const pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist * 0.8)) : 0;
    return { gain: g, pan, dist, wet: Math.min(0.85, 0.12 + dist / 110) };
  }
  function chain(sp, t, dur) {
    const g = ctx.createGain(); g.gain.value = 0;
    let node = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = sp.pan; g.connect(p); node = p; }
    node.connect(master);
    if (verbIn && sp.wet) { const w = ctx.createGain(); w.gain.value = sp.wet; node.connect(w); w.connect(verbIn); }
    return g;
  }
  function noise(sp, t, dur, type, freq, q, peak, attack) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
    const g = chain(sp, t, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); src.start(t); src.stop(t + dur + 0.05);
    return f;
  }
  function tone(sp, t, dur, type, freq, endFreq, peak) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = chain(sp, t, dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }
  // play one recording through the same spatial chain: pan, distance gain, reverb send, air absorption, pitch variation
  const rr = (a, b) => a + Math.random() * (b - a);
  function samp(sp, t, buf, rate, gain, lp) {
    if (!buf || !sp) return false; const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate || 1;
    const g = chain(sp, t, buf.duration); g.gain.setValueAtTime(Math.max(0.0001, gain), t);
    const f = lp || (sp.dist ? 17000 / (1 + sp.dist / 30) : 0); let n = s;
    if (f && f < 14000) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = Math.max(250, f); s.connect(fl); n = fl; }
    n.connect(g); s.start(t); s.stop(t + buf.duration / (rate || 1) + 0.05); return true;
  }
  function sampled(name, x, y, z, vol) {
    const P = SAMPLES.pick, t0 = ctx.currentTime; let t = t0, sp;
    const at = (v, max) => { sp = spatial(x, y, z, v, max); if (!sp) return false; t = t0 + Math.min(1.2, sp.dist / 343); return true; };
    switch (name) {
      case 'shot': { if (!P('shot')) return false; if (!at(vol * 1.0, 320)) return true; samp(sp, t, P('shot'), rr(0.9, 1.08), sp.gain * 1.1); noise({ ...sp, wet: 0.9 }, t + 0.04, 0.9 + sp.dist / 150, 'lowpass', 600, 0.5, sp.gain * 0.16, 0.05); return true; }
      case 'volley': { if (!P('shot')) return false; if (!at(vol * 1.3, 500)) return true; for (let i = 0; i < 6; i++) samp(sp, t + i * 0.022 + Math.random() * 0.05, P('shot'), rr(0.85, 1.05), sp.gain * 0.5); noise({ ...sp, wet: 1 }, t + 0.06, 2.6, 'lowpass', 420, 0.5, sp.gain * 0.45, 0.08); return true; }
      case 'cannon': { if (!P('shot')) return false; if (!at(vol * 1.4, 600)) return true; samp(sp, t, P('shot'), 0.42, sp.gain * 1.3); samp(sp, t + 0.01, P('shot'), 0.6, sp.gain * 0.7); tone(sp, t, 0.9, 'sine', 62, 26, sp.gain * 1.2); noise({ ...sp, wet: 1 }, t + 0.08, 3.2, 'lowpass', 260, 0.5, sp.gain * 0.55, 0.1); return true; }
      case 'explosion': { if (!P('debris')) return false; if (!at(vol * 1.4, 600)) return true; samp(sp, t, P('siegehit'), rr(0.7, 0.85), sp.gain * 1.1); samp(sp, t + 0.03, P('debris'), rr(0.85, 1), sp.gain * 0.9); tone(sp, t, 0.9, 'sine', 55, 24, sp.gain * 1.2); noise({ ...sp, wet: 1 }, t + 0.1, 3, 'lowpass', 300, 0.5, sp.gain * 0.4, 0.1); return true; }
      case 'clang': { if (!P('clash')) return false; if (!at(vol * 0.85, 90)) return true; samp(sp, t, P('clash'), rr(0.94, 1.12), sp.gain); return true; }
      case 'shield': { if (!P('shwood')) return false; if (!at(vol * 0.9, 80)) return true; samp(sp, t, P(Math.random() < 0.6 ? 'shwood' : 'shmetal'), rr(0.9, 1.1), sp.gain); return true; }
      case 'parry': { if (!P('clash')) return false; samp({ gain: 0.55 * vol, pan: 0, wet: 0.25 }, t, P('clash'), 1.3, 0.55 * vol); tone({ gain: 0.3 * vol, pan: 0 }, t, 0.5, 'sine', 2600, 2450, 0.25 * vol); return true; }
      case 'swish': { if (!P('swing')) return false; if (!at(vol * 0.6, 40)) return true; samp(sp, t, P('swing'), rr(0.9, 1.15), sp.gain); return true; }
      case 'thrust': { if (!P('thrust')) return false; if (!at(vol * 0.6, 40)) return true; samp(sp, t, P('thrust'), rr(0.92, 1.1), sp.gain); return true; }
      case 'flesh': { if (!P('flesh')) return false; if (!at(vol * 0.85, 60)) return true; samp(sp, t, P('flesh'), rr(0.85, 1.1), sp.gain); return true; }
      // a landed blow: the cut (flesh sample, pitched down) with a short low body thump under it; heavier blows go lower and longer;
      // on armour a dull metal knock rides on top
      case 'strike': case 'strikeheavy': case 'strikearmor': { if (!P('flesh')) return false; const hv = name === 'strikeheavy'; if (!at(vol * (hv ? 1.15 : 0.95), 70)) return true;
        samp(sp, t, P('flesh'), rr(0.72, 0.86) * (hv ? 0.85 : 1), sp.gain * 1.5); samp(sp, t + 0.012, P('flesh'), rr(1.15, 1.3), sp.gain * 0.5);
        noise({ ...sp, wet: 0.02 }, t, 0.035, 'bandpass', 2600, 1.2, sp.gain * 0.7, 0.001); /* the bite of the edge: a short bright crack on top, so a landed blow always reads, even in the din */
        tone(sp, t, hv ? 0.2 : 0.12, 'sine', hv ? 95 : 120, hv ? 34 : 48, sp.gain * (hv ? 1.1 : 0.8)); noise({ ...sp, wet: 0.05 }, t, hv ? 0.1 : 0.06, 'lowpass', hv ? 700 : 1100, 0.8, sp.gain * 0.5, 0.002);
        if (name === 'strikearmor') { if (P('ametal')) samp(sp, t + 0.004, P('ametal'), rr(0.6, 0.72), sp.gain * 0.55); if (P('clash')) samp(sp, t, P('clash'), rr(0.55, 0.65), sp.gain * 0.3); }
        return true; }
      case 'killcue': { const s0 = { gain: 0.32 * vol, pan: 0, wet: 0.2 }; tone(s0, t, 0.09, 'triangle', 330, 300, s0.gain); tone(s0, t + 0.07, 0.22, 'triangle', 220, 196, s0.gain * 0.9); noise(s0, t, 0.08, 'lowpass', 400, 0.7, s0.gain * 0.6, 0.003); return true; }
      case 'death': case 'scream': { if (!P('death')) return false; if (!at(vol * (name === 'death' ? 0.55 : 0.65), 70)) return true; samp(sp, t, P('death'), rr(0.9, 1.06), sp.gain); return true; }
      case 'twang': { if (!P('bow')) return false; if (!at(vol * 0.7, 60)) return true; samp(sp, t, P('bow'), rr(0.95, 1.08), sp.gain); return true; }
      case 'arrow': { if (!P('arrowfly')) return false; if (!at(vol * 0.5, 40)) return true; samp(sp, t, P('arrowfly'), rr(0.95, 1.1), sp.gain); return true; }
      case 'dirt': { if (!P('adirt')) return false; if (!at(vol * 0.6, 60)) return true; samp(sp, t, P('adirt'), rr(0.9, 1.1), sp.gain); return true; }
      case 'woodhit': { if (!P('awood')) return false; if (!at(vol * 0.7, 70)) return true; samp(sp, t, P('awood'), rr(0.9, 1.1), sp.gain); return true; }
      case 'ricochet': { if (!P('ametal')) return false; if (!at(vol * 0.5, 90)) return true; samp(sp, t, P('ametal'), rr(0.9, 1.2), sp.gain); tone(sp, t, 0.25, 'sine', 3200, 900, sp.gain * 0.15); return true; }
      case 'gallop': { if (!P('hoof')) return false; if (!at(vol * 0.7, 60)) return true; samp(sp, t, P('hoof'), rr(0.9, 1.1), sp.gain); return true; }
      case 'neigh': { if (!P('neigh')) return false; if (!at(vol * 0.6, 120)) return true; samp(sp, t, P('neigh'), rr(0.92, 1.05), sp.gain); return true; }
      case 'horsedie': { if (!P('horsedie')) return false; if (!at(vol * 0.6, 100)) return true; samp(sp, t, P('horsedie'), rr(0.95, 1.05), sp.gain); return true; }
      case 'fire': { if (!P('fire2')) return false; if (!at(vol * 0.5, 60)) return true; samp(sp, t, P('fire2'), rr(0.9, 1.1), sp.gain); return true; }
      case 'thunder': { if (!P('thunder')) return false; sp = spatial(x, y, z, vol * 1.4, 2000); if (!sp) return true; sp.wet = 0.6; const tt = t0 + Math.min(3, sp.dist / 343); samp(sp, tt, P('thunder'), rr(0.85, 1), sp.gain, 900 + 6000 / (1 + sp.dist / 60)); tone(sp, tt, 2.5, 'sine', 48, 22, sp.gain * 0.8); return true; }
      case 'ram': case 'gatehit': { if (!P('ram')) return false; if (!at(vol * 1.0, 200)) return true; samp(sp, t, P('ram'), rr(0.85, 1), sp.gain); return true; }
      case 'collapse': { if (!P('collapse')) return false; if (!at(vol * 1.2, 400)) return true; samp(sp, t, P('collapse'), 0.9, sp.gain); return true; }
      case 'siegehit': { if (!P('siegehit')) return false; if (!at(vol * 1.0, 300)) return true; samp(sp, t, P('siegehit'), rr(0.85, 1.05), sp.gain); return true; }
      case 'gong': { const b = SAMPLES.get('gong_big'); if (!b) return false; samp({ gain: 0.45 * vol, pan: 0, wet: 0.4 }, t, b, 1, 0.45 * vol); return true; }
      case 'drum': { const b = SAMPLES.get('dg_ff'); if (!b) return false; for (let i = 0; i < 3; i++) samp({ gain: 0.6 * vol, pan: 0, wet: 0.3 }, t + i * 0.22, b, 0.85, 0.6 * vol); return true; }
    }
    return false;
  }
  // ---- the great guns: a layered boom that carries across the whole field and is never dropped by the sound budget ----
  // crack (near only) + pitched-down shot + sub-bass thump + body roar + a long rolling tail (thunder) + an echo slap
  // off the hills; distance bends it all toward a low rumble that arrives late. Music ducks under it, and a gun fired
  // right beside you leaves your ears ringing.
  let lastBoom = 0;
  function boom(x, y, z, vol, kind) {
    const L = listener, dx = x - L.x, dz = z - L.z, dist = Math.sqrt(dx * dx + dz * dz + (y - L.y) * (y - L.y));
    if (dist > 950) return;
    const rx = -Math.cos(L.yaw), rz = Math.sin(L.yaw), pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist * 0.7)) : 0;
    const g = vol * 0.8 / (1 + dist / 85), near = Math.max(0, 1 - dist / 70), air = 14000 / (1 + dist / 55);
    const sp = { gain: g, pan, dist, wet: Math.min(0.9, 0.25 + dist / 250) }, t = ctx.currentTime + Math.min(2.8, dist / 343);
    const big = kind === 'hit' ? 0.55 : 1, S = SAMPLES.count ? SAMPLES : null;
    if (near > 0) noise(sp, t, 0.045, 'highpass', 2200, 0.7, g * near * 1.4 * big, 0.001);                                   // crack
    if (S && S.pick('shot')) { samp(sp, t, S.pick('shot'), 0.38, g * 1.2 * big, air); samp(sp, t + 0.012, S.pick('shot'), 0.55, g * 0.7 * big, air); }
    tone(sp, t, 1.1, 'sine', 58, 24, g * 1.9 * big);                                                                         // sub thump
    tone(sp, t, 0.35, 'triangle', 110, 40, g * 0.6 * big);
    { const f = noise(sp, t, 1.8 + dist / 400, 'lowpass', Math.min(2400, air), 0.6, g * 1.25 * big, 0.006); f.frequency.exponentialRampToValueAtTime(140, t + 1.6); } // body roar
    if (S && S.pick('thunder')) samp({ ...sp, wet: 0.9 }, t + 0.06, S.pick('thunder'), 1.35 + Math.random() * 0.2, g * 0.55 * big, Math.min(900, air));   // rolling tail
    else noise({ ...sp, wet: 1 }, t + 0.08, 4, 'lowpass', 240, 0.5, g * 0.7 * big, 0.12);
    const e1 = 0.35 + (dist % 7) * 0.06; noise({ ...sp, gain: g * 0.45, wet: 1 }, t + e1, 1.6, 'lowpass', 380, 0.6, g * 0.4 * big, 0.03);      // echo off the hills
    noise({ ...sp, gain: g * 0.25, wet: 1 }, t + e1 * 2.1, 2.2, 'lowpass', 260, 0.6, g * 0.22 * big, 0.06);
    const now = performance.now();
    if (kind !== 'hit' && now - lastBoom > 250) { lastBoom = now; if (typeof MUSIC !== 'undefined' && MUSIC.duck) MUSIC.duck(Math.min(0.75, 0.25 + g * 0.5), 1.4); }
    if (dist < 14 && kind !== 'hit') shellshock(Math.min(0.6, 0.6 * (1 - dist / 14)));
  }
  // a ball whistling past or overhead
  function whistle(x, y, z, vol) {
    const sp = spatial(x, y, z, vol, 60); if (!sp) return; const t = ctx.currentTime; sp.wet = 0.1;
    const f = noise(sp, t, 0.55, 'bandpass', 1900, 6, sp.gain * 0.8, 0.12); f.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    noise(sp, t, 0.5, 'lowpass', 400, 0.7, sp.gain * 0.5, 0.1);
  }
  function play(name, x, y, z, vol) {
    if (!ctx) return;
    if (name === 'cannon' || name === 'cannonhit') { boom(x, y, z, vol === undefined ? 1 : vol, name === 'cannonhit' ? 'hit' : 'fire'); if (name === 'cannonhit' && SAMPLES.count) { sampled('dirt', x, y, z, (vol || 1) * 1.6); const sp = spatial(x, y, z, (vol || 1) * 0.9, 120), d = SAMPLES.pick('debris'); if (sp && d) samp(sp, ctx.currentTime + Math.min(1, sp.dist / 343) + 0.03, d, rr(0.9, 1.1), sp.gain * 0.8); } return; }
    if (name === 'ballwhistle') { whistle(x, y, z, vol === undefined ? 1 : vol); return; }
    const now = performance.now(); if (now - lastFrame > 40) { budget = 16; lastFrame = now; }
    if (budget-- <= 0 && name !== 'explosion' && name !== 'collapse' && name !== 'siegehit' && name !== 'killcue' && name !== 'bodythump' && !((name.startsWith('strike') || name === 'thud') && (vol || 1) > 1)) return;
    vol = vol === undefined ? 1 : vol;
    if (SAMPLES.count && sampled(name, x, y, z, vol)) return;
    name = { strike: 'thud', strikeheavy: 'thud', strikearmor: 'clang', killcue: 'hitmark', flesh: 'thud', shield: 'clang', thrust: 'swish', woodhit: 'dirt', gatehit: 'thud', ram: 'thud', collapse: 'explosion', siegehit: 'explosion', horsedie: 'death', arrow: 'whiz' }[name] || name;
    const t0 = ctx.currentTime; let t = t0;
    const late = (sp) => { t = t0 + Math.min(1.2, sp.dist / 343); };   // sound travels at 343 m/s
    switch (name) {
      case 'shot': { const sp = spatial(x, y, z, vol * 0.95, 320); if (!sp) return; late(sp); const near = Math.max(0, 1 - sp.dist / 60);
        noise(sp, t, 0.03, 'highpass', 2600, 0.7, sp.gain * (0.5 + near), 0.001);                       // crack
        noise(sp, t, 0.28 + sp.dist / 300, 'lowpass', 3800 / (1 + sp.dist / 30), 0.5, sp.gain, 0.003);   // blast
        tone(sp, t, 0.22, 'sine', 95, 38, sp.gain * 0.9);                                               // body
        noise({ ...sp, wet: 0.9 }, t + 0.03, 0.9 + sp.dist / 150, 'lowpass', 700, 0.5, sp.gain * 0.25, 0.04); break; }
      case 'volley': { const sp = spatial(x, y, z, vol * 1.4, 500); if (!sp) return; late(sp); const near = Math.max(0, 1 - sp.dist / 90);
        for (let i = 0; i < 6; i++) { const dt = i * 0.018 + Math.random() * 0.03; noise(sp, t + dt, 0.035, 'highpass', 2200, 0.7, sp.gain * (0.4 + near) * 0.6, 0.001); noise(sp, t + dt, 0.4, 'lowpass', 2600 / (1 + sp.dist / 40), 0.5, sp.gain * 0.7, 0.004); }
        tone(sp, t, 0.5, 'sine', 70, 30, sp.gain * 1.2);
        noise({ ...sp, wet: 1 }, t + 0.05, 2.6, 'lowpass', 420, 0.5, sp.gain * 0.55, 0.08); break; }       // rolling thunder
      case 'whiz': { const sp = spatial(x, y, z, vol * 0.8, 30); if (!sp) return; sp.wet = 0.05; const f = noise(sp, t, 0.16, 'bandpass', 4200, 4, sp.gain, 0.01); f.frequency.exponentialRampToValueAtTime(1400, t + 0.15); noise(sp, t, 0.02, 'highpass', 5000, 0.7, sp.gain * 0.9, 0.001); break; }
      case 'scream': { const sp = spatial(x, y, z, vol * 0.4, 70); if (!sp) return; const f0 = 260 + Math.random() * 220; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.15, t + 0.1); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.7); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 500; bp.Q.value = 2.5; const g = chain(sp, t, 0.7); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(sp.gain * 0.5, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(bp); bp.connect(g); o.start(t); o.stop(t + 0.75); break; }
      case 'cannon': { const sp = spatial(x, y, z, vol * 1.5, 600); if (!sp) return; late(sp); noise(sp, t, 0.05, 'highpass', 1800, 0.7, sp.gain * 0.7, 0.002); noise(sp, t, 1.5, 'lowpass', 520 / (1 + sp.dist / 90), 0.5, sp.gain, 0.008); tone(sp, t, 0.9, 'sine', 62, 26, sp.gain * 1.3); noise({ ...sp, wet: 1 }, t + 0.08, 3.2, 'lowpass', 260, 0.5, sp.gain * 0.6, 0.1); break; }
      case 'explosion': { const sp = spatial(x, y, z, vol * 1.5, 600); if (!sp) return; late(sp); const f = noise(sp, t, 1.6, 'lowpass', 1500, 0.5, sp.gain, 0.008); f.frequency.exponentialRampToValueAtTime(110, t + 1.2); tone(sp, t, 0.9, 'sine', 55, 24, sp.gain * 1.3); noise(sp, t, 0.12, 'bandpass', 2500, 1, sp.gain * 0.5, 0.002); noise({ ...sp, wet: 1 }, t + 0.1, 3, 'lowpass', 300, 0.5, sp.gain * 0.5, 0.1); for (let i = 0; i < 5; i++) noise(sp, t + 0.25 + Math.random() * 0.9, 0.05, 'bandpass', 1800, 1.5, sp.gain * 0.12, 0.002); break; }
      case 'clang': { const sp = spatial(x, y, z, vol * 0.7, 80); if (!sp) return; tone(sp, t, 0.28, 'sine', 2150, 2100, sp.gain * 0.5); tone(sp, t, 0.22, 'sine', 3100, 3050, sp.gain * 0.3); tone(sp, t, 0.3, 'triangle', 1230, 1200, sp.gain * 0.25); noise(sp, t, 0.03, 'highpass', 3000, 0.7, sp.gain * 0.5, 0.002); break; }
      case 'swish': { const sp = spatial(x, y, z, vol * 0.45, 40); if (!sp) return; const f = noise(sp, t, 0.16, 'bandpass', 700, 1.2, sp.gain, 0.05); f.frequency.exponentialRampToValueAtTime(2600, t + 0.14); break; }
      case 'bodythump': { const sp = spatial(x, y, z, vol, 40); if (!sp) return; /* the weight of a blow landing on a body: a deep punch felt more than heard */
        tone(sp, t, 0.16, 'sine', 78, 34, sp.gain * 1.1); noise(sp, t, 0.07, 'lowpass', 260, 0.9, sp.gain * 0.9, 0.002); tone(sp, t, 0.05, 'triangle', 160, 60, sp.gain * 0.35); break; }
      case 'thud': { const sp = spatial(x, y, z, vol * 0.8, 60); if (!sp) return; noise(sp, t, 0.12, 'lowpass', 420, 0.7, sp.gain, 0.003); tone(sp, t, 0.1, 'sine', 90, 45, sp.gain * 0.7); break; }
      case 'ricochet': { const sp = spatial(x, y, z, vol * 0.5, 90); if (!sp) return; tone(sp, t, 0.25, 'sine', 3200, 900, sp.gain * 0.35); noise(sp, t, 0.05, 'highpass', 2500, 0.7, sp.gain * 0.4, 0.002); break; }
      case 'dirt': { const sp = spatial(x, y, z, vol * 0.5, 70); if (!sp) return; noise(sp, t, 0.08, 'lowpass', 900, 0.7, sp.gain, 0.003); break; }
      case 'gallop': { const sp = spatial(x, y, z, vol * 0.5, 50); if (!sp) return; noise(sp, t, 0.07, 'lowpass', 300, 0.7, sp.gain, 0.003); tone(sp, t, 0.07, 'sine', 60, 40, sp.gain * 0.5); break; }
      case 'death': { const sp = spatial(x, y, z, vol * 0.5, 50); if (!sp) return; tone(sp, t, 0.35, 'sawtooth', 190, 90, sp.gain * 0.15); noise(sp, t, 0.3, 'lowpass', 600, 0.7, sp.gain * 0.3, 0.02); break; }
      case 'click': { const sp = spatial(x, y, z, vol * 0.4, 20); if (!sp) return; noise(sp, t, 0.035, 'highpass', 2500, 0.7, sp.gain, 0.002); break; }
      case 'hitmark': { const sp = { gain: 0.25 * vol, pan: 0 }; tone(sp, t, 0.06, 'sine', 1400, 1200, sp.gain); break; }
      case 'parry': { const sp = { gain: 0.5 * vol, pan: 0 }; tone(sp, t, 0.4, 'sine', 2600, 2400, sp.gain); tone(sp, t, 0.35, 'sine', 3900, 3700, sp.gain * 0.5); break; }
      case 'rocket': { const sp = spatial(x, y, z, vol * 0.7, 260); if (!sp) return; const f = noise(sp, t, 0.7, 'bandpass', 900, 1.2, sp.gain * 0.8, 0.01); f.frequency.exponentialRampToValueAtTime(3200, t + 0.6); tone(sp, t, 0.5, 'sawtooth', 300 + Math.random() * 120, 900, sp.gain * 0.08); noise(sp, t, 0.06, 'lowpass', 600, 0.7, sp.gain * 0.6, 0.003); break; }
      case 'gatling': { const sp = spatial(x, y, z, vol * 0.6, 220); if (!sp) return; noise(sp, t, 0.12, 'bandpass', 1400 / (1 + sp.dist / 60), 0.6, sp.gain, 0.003); tone(sp, t, 0.08, 'sine', 140, 60, sp.gain * 0.6); break; }
      case 'pistol': { const sp = spatial(x, y, z, vol * 0.7, 180); if (!sp) return; noise(sp, t, 0.14, 'bandpass', 2200 / (1 + sp.dist / 40), 0.7, sp.gain, 0.003); tone(sp, t, 0.1, 'sine', 160, 70, sp.gain * 0.6); break; }
      case 'twang': { const sp = spatial(x, y, z, vol * 0.5, 50); if (!sp) return; tone(sp, t, 0.12, 'triangle', 320, 180, sp.gain * 0.5); noise(sp, t, 0.06, 'bandpass', 1800, 2, sp.gain * 0.5, 0.003); break; }
      case 'shout': { const sp = spatial(x, y, z, vol * 0.9, 80); if (!sp) return; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(230, t + 0.25); o.frequency.exponentialRampToValueAtTime(150, t + 0.6); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = chain(sp, t, 0.6); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(sp.gain * 0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(f); f.connect(g); o.start(t); o.stop(t + 0.65); break; }
      case 'drum': { const sp = { gain: 0.6 * vol, pan: 0 }; for (let i = 0; i < 3; i++) { tone(sp, t + i * 0.22, 0.25, 'sine', 95, 45, sp.gain); noise(sp, t + i * 0.22, 0.08, 'lowpass', 500, 0.7, sp.gain * 0.5, 0.003); } break; }
      case 'horn': { const sp = spatial(x, y, z, vol * 0.7, 160); if (!sp) return; const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.setValueAtTime(165, t + 0.4); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; const g = chain(sp, t, 0.9); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(sp.gain * 0.25, t + 0.08); g.gain.setValueAtTime(sp.gain * 0.25, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95); o.connect(f); f.connect(g); o.start(t); o.stop(t + 1); break; }
      case 'thunder': { const sp = spatial(x, y, z, vol * 1.6, 2000); if (!sp) return; const d = sp.dist / 343; const t0 = t + Math.min(3, d); sp.wet = 0.7;
        noise(sp, t0, 0.08, 'highpass', 2500, 0.7, sp.gain * 0.9 * Math.max(0.1, 1 - sp.dist / 150), 0.001);
        const f = noise(sp, t0, 4.5, 'lowpass', 900, 0.5, sp.gain, 0.02); f.frequency.exponentialRampToValueAtTime(70, t0 + 4); tone(sp, t0, 2.5, 'sine', 48, 22, sp.gain * 1.2);
        for (let i = 0; i < 6; i++) noise(sp, t0 + 0.3 + Math.random() * 2.5, 0.6, 'lowpass', 260, 0.5, sp.gain * 0.5, 0.05); break; }
      case 'fire': { const sp = spatial(x, y, z, vol * 0.45, 60); if (!sp) return; noise(sp, t, 0.9, 'bandpass', 500, 0.5, sp.gain * 0.5, 0.2); for (let i = 0; i < 7; i++) noise(sp, t + Math.random() * 0.9, 0.012, 'highpass', 3000, 0.7, sp.gain * (0.4 + Math.random() * 0.6), 0.001); break; }
      case 'whistle': { const sp = spatial(x, y, z, vol * 0.9, 400); if (!sp) return; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(420, t + 1.6); const g = chain(sp, t, 1.7); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(sp.gain * 0.22, t + 0.3); g.gain.exponentialRampToValueAtTime(sp.gain * 0.3, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7); o.connect(g); o.start(t); o.stop(t + 1.75); noise(sp, t, 1.6, 'bandpass', 1200, 3, sp.gain * 0.15, 0.4); break; }
      case 'kiai': { const sp = spatial(x, y, z, vol, 120); if (!sp) return; for (let k = 0; k < 5; k++) { const t1 = t + Math.random() * 0.12, f0 = 150 + Math.random() * 90; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t1); o.frequency.linearRampToValueAtTime(f0 * 1.4, t1 + 0.18); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t1 + 0.9); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 + Math.random() * 400; bp.Q.value = 1.6; const g = chain(sp, t1, 0.95); g.gain.setValueAtTime(0.0001, t1); g.gain.exponentialRampToValueAtTime(sp.gain * 0.2, t1 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.95); o.connect(bp); bp.connect(g); o.start(t1); o.stop(t1 + 1); } break; }
      case 'misfire': { const sp = spatial(x, y, z, vol * 0.6, 30); if (!sp) return; noise(sp, t, 0.03, 'highpass', 3000, 0.7, sp.gain, 0.001); noise(sp, t + 0.05, 0.5, 'bandpass', 3500, 1.5, sp.gain * 0.25, 0.05); break; }
      case 'gong': { const sp = { gain: 0.35 * vol, pan: 0 }; tone(sp, t, 2.2, 'sine', 196, 190, sp.gain); tone(sp, t, 1.6, 'sine', 293, 288, sp.gain * 0.5); tone(sp, t, 1.0, 'sine', 466, 460, sp.gain * 0.3); break; }
      case 'brace': { const sp = spatial(x, y, z, vol * 0.8, 60); if (!sp) return; for (let i = 0; i < 4; i++) noise(sp, t + i * 0.05, 0.06, 'lowpass', 700, 0.8, sp.gain * 0.7, 0.003); break; }
      case 'ui': { const sp = { gain: 0.2 * vol, pan: 0 }; tone(sp, t, 0.08, 'triangle', 660, 880, sp.gain); break; }
    }
  }
  // shell shock: hearing collapses to a muffled thud and a ringing that slowly fades (soldier mode only)
  function shellshock(k) {
    if (!ctx || !deaf) return; const t = ctx.currentTime, f = deaf.frequency;
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t); f.exponentialRampToValueAtTime(Math.max(300, 4000 * (1 - k)), t + 0.04); f.exponentialRampToValueAtTime(20000, t + 1.5 + k * 4);
    const o = ctx.createOscillator(); o.frequency.value = 3700 + Math.random() * 500; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * k, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 2 + k * 4);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 6.5);
  }
  function punch(k) { /* the beat after a blow of your own lands: the world drops away for a tenth of a second and comes back, so the hit stands out of the din */
    if (!ctx || !master) return; const t = ctx.currentTime, g = master.gain, base = 0.6; k = Math.min(1, k || 0.6);
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(base * (1 - 0.6 * k), t + 0.035); g.setValueAtTime(base * (1 - 0.6 * k), t + 0.035 + 0.09 * k); g.linearRampToValueAtTime(base, t + 0.035 + 0.09 * k + 0.25);
  }
  // ambient beds: wind always, distant battle noise that swells with the fighting
  let rainOn = false, fireLvl = 0; function setRain(v) { rainOn = !!v; } function setFire(v) { fireLvl = Math.max(0, Math.min(1, v)); }
  function ambient(level) {
    if (!ctx) return;
    if (!amb) {
      const mk = (type, f, q) => { const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(master); src.start(); return { g, fl }; };
      amb = { wind: mk('lowpass', 380, 0.4), roar: mk('bandpass', 600, 0.6), rain: mk('highpass', 1400, 0.4), rumble: mk('lowpass', 160, 0.5), t: 0 };
      if (verbIn) { const s2 = ctx.createGain(); s2.gain.value = 0.6; amb.roar.g.connect(s2); s2.connect(verbIn); }
    }
    if (!amb.loops && SAMPLES.get('wind_0') && SAMPLES.get('rain_0')) {
      const lp = (buf) => { const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = 0.5; src.loopEnd = buf.duration - 0.4; const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(master); src.start(); return g; };
      amb.loops = { wind: lp(SAMPLES.get('wind_0')), rain: lp(SAMPLES.get('rain_0')), fire: SAMPLES.get('fire_0') ? lp(SAMPLES.get('fire_0')) : null }; amb.wind.g.gain.value = 0; amb.rain.g.gain.value = 0;
    }
    const t = ctx.currentTime; amb.t += 1;
    if (amb.loops) { amb.loops.wind.gain.setTargetAtTime(0.16 + 0.08 * Math.sin(amb.t * 0.07), t, 1.5); amb.loops.rain.gain.setTargetAtTime(rainOn ? 0.32 : 0, t, 2); if (amb.loops.fire) amb.loops.fire.gain.setTargetAtTime(fireLvl * 0.25, t, 1); }
    if (!amb.loops) amb.wind.g.gain.setTargetAtTime(0.035 + 0.02 * Math.sin(amb.t * 0.07), t, 1.5); amb.wind.fl.frequency.setTargetAtTime(300 + 160 * Math.sin(amb.t * 0.05), t, 2);
    if (!amb.loops) amb.rain.g.gain.setTargetAtTime(rainOn ? 0.05 : 0, t, 2); amb.rumble.g.gain.setTargetAtTime(rainOn ? 0.03 : 0, t, 2);
    amb.roar.g.gain.setTargetAtTime(0.06 * Math.min(1, level), t, 1.2); amb.roar.fl.frequency.setTargetAtTime(500 + 250 * Math.sin(amb.t * 0.31), t, 0.6);
  }
  return { init, play, setListener, ambient, setRain, setFire, shellshock, punch, spatial: (x, y, z, v, m) => ctx ? spatial(x, y, z, v, m) : null, listener, get verbIn() { return verbIn; }, get ready() { return !!ctx; }, get ctx() { return ctx; }, get master() { return master; }, get noise() { return noiseBuf; } };
})();

