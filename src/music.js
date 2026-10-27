// ===== Music: a sampled Chinese ensemble =====
// Recorded instruments (CC0): dan tranh zither (stands in for the guzheng — same family, pentatonic tuning),
// ocarina as xun, a cello drone; the erhu and suona are our own physical models (bowed string on a
// python-skin body; double reed on a conical bore with a flared bell), rendered to samples,
// large ethnic drum as dagu, frame drum as tanggu, woodblock as bangzi, clash cymbals as bo, gongs, temple bell.
// Every pitch is resampled from the nearest recording; each piece is in the B gong (宫) pentatonic mode.
// If samples are not decoded (old browser), each instrument falls back to a small synth voice.
const MUSIC = (() => {
  // measured root pitch (MIDI, with cents) of every melodic recording
  const ROOT = {
    zh: { B2: 59.0, B3: 71.09, B4: 82.9, Cs2: 49.29, Cs3: 61.65, Cs4: 73.0, Ds2: 51.37, Ds3: 63.16, Ds4: 75.05, Fs2: 54.19, Fs3: 66.0, Fs4: 77.94, Gs2: 56.28, Gs3: 68.0, Gs4: 79.97 },
    zt: { B3: 70.89, B4: 82.96, Cs3: 60.78, Cs4: 73.07, Ds3: 63.28, Ds4: 75.07, Fs3: 66.15, Fs4: 78.0, Gs3: 67.75, Gs4: 80.36 },
    xun: { A3: 68.89, A4: 81.03, As4: 82.02, C4: 72.04, C5: 84.1, Cs4: 73.05, Ds4: 75.04, E4: 75.96, Fs4: 78.01, Gs4: 80.16 },
    sn: { 66: 66.09, 71: 71.21, 76: 76.25, 81: 81.34, 86: 86.47 },   // physically modelled suona (see synth/)
    eh: { 62: 61.79, 67: 66.82, 71: 70.8, 74: 73.81, 78: 77.78, 83: 82.69 },   // physically modelled erhu
    vc: { A2: 56.97, B1: 46.99 },
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let duckG = null;
  // a great gun going off pushes the music down for a moment (k: how far, 0..1; d: seconds back up)
  function duck(k, d) { if (!duckG || !ctx) return; const t = ctx.currentTime, g = duckG.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(Math.max(0.2, 1 - k), t + 0.05); g.linearRampToValueAtTime(1, t + 0.05 + (d || 1.2)); }
  let REC = null, recSrc = null, recG = null, recEnd = 0, comp = null, ctx, out, dry, nb, playing = null, nextT = 0, step = 0, timer = null, vol = 0.5, target = 0.5, I = 0.5, muted = false, prevMel = {};
  function ensure(c) {
    if (out && !c) return true; ctx = c || AUDIO.ctx; if (!ctx) return false; nb = AUDIO.noise;
    out = ctx.createGain(); out.gain.value = muted ? 0 : vol;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 2.5; comp.attack.value = 0.012; comp.release.value = 0.3;
    // a warm hall: stereo exponential tail with a few early reflections
    const L = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, L, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); let lp = 0; for (let i = 0; i < L; i++) { const t = i / ctx.sampleRate; lp += (Math.random() * 2 - 1 - lp) * Math.max(0.08, 0.6 - t * 0.2); ch[i] = lp * Math.exp(-t * 2.3) * (t < 0.018 ? 0 : 1); } for (const e of [0.021, 0.034, 0.047, 0.063]) ch[Math.floor((e + c * 0.003) * ctx.sampleRate)] += 0.5; }
    const verb = ctx.createConvolver(); verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.3;
    dry = ctx.createGain(); dry.connect(comp); dry.connect(wet); wet.connect(verb); verb.connect(comp); duckG = ctx.createGain(); comp.connect(duckG); duckG.connect(out); out.connect(ctx.destination);
    return true;
  }
  const S = () => SAMPLES;
  function nearest(fam, m) { const R = ROOT[fam]; let bk = null, bd = 1e9; for (const k in R) { const d = Math.abs(R[k] - m) + (R[k] > m ? 0.01 : 0); if (d < bd) { bd = d; bk = k; } } const buf = S().get(fam + '_' + bk); return buf ? { buf, rate: Math.pow(2, (m - R[bk]) / 12) } : null; }
  // one sample voice: pitch slides, bends, sustain by overlapping retriggers, its own filter chain and pan
  function voice(buf, t, rate, gain, o) {
    o = o || {}; const len = buf.duration / rate; const dur = o.dur || len, rel = o.rel || 0.12, att = o.att || 0.004;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + att);
    if (o.dur) { g.gain.setValueAtTime(gain, t + Math.max(att + 0.01, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02); }
    let last = g; if (o.fx) last = o.fx(g);
    if (ctx.createStereoPanner && o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; last.connect(p); last = p; }
    last.connect(dry);
    const seg = (st, a0) => { // segment of the recording; long notes chain overlapping segments
      const s = ctx.createBufferSource(); s.buffer = buf; const pr = s.playbackRate;
      if (o.slide && st === t) { pr.setValueAtTime(rate * o.slide, st); pr.exponentialRampToValueAtTime(rate, st + (o.slideT || 0.12)); } else pr.setValueAtTime(rate, st);
      if (o.bend && st === t) { const b = o.bend; pr.setValueAtTime(rate, st + b.at); pr.exponentialRampToValueAtTime(rate * b.ratio, st + b.at + 0.14); if (b.back) { pr.setValueAtTime(rate * b.ratio, st + b.back); pr.exponentialRampToValueAtTime(rate, st + b.back + 0.14); } }
      const sg = ctx.createGain(); sg.gain.setValueAtTime(a0 ? 0.0001 : 1, st); if (a0) sg.gain.exponentialRampToValueAtTime(1, st + a0);
      const segLen = Math.min(len, t + dur + 0.1 - st);
      if (segLen < len) { sg.gain.setValueAtTime(1, st + Math.max(0.05, segLen - 0.05)); sg.gain.linearRampToValueAtTime(0, st + segLen); }
      s.connect(sg); sg.connect(g); s.start(st, a0 ? 0.25 * buf.duration : 0); s.stop(st + segLen + 0.05);
      if (o.dur && dur > (st - t) + len * 0.92) { const nx = st + len * 0.62; if (nx < t + dur - 0.1) { sg.gain.setValueAtTime(1, nx); sg.gain.linearRampToValueAtTime(0.0001, nx + len * 0.3); seg(nx, len * 0.25); } }
    };
    seg(t, 0);
  }
  const chain = (...nodes) => (g) => { let n = g; for (const x of nodes) { n.connect(x); n = x; } return n; };
  const bq = (type, f, q, gain) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; if (gain) b.gain.value = gain; return b; };
  // ---------- fallback synth voices
  function synth(t, m, dur, lvl, kind) {
    const o = ctx.createOscillator(); o.type = kind === 'reed' ? 'sawtooth' : 'triangle'; o.frequency.value = mf(m); const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl, t + (kind === 'pluck' ? 0.003 : 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (kind === 'reed') { const b = bq('bandpass', 1500, 1.1); o.connect(b); n = b; } n.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + 0.05);
  }
  function synthDrum(t, lvl, f0) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0 || 120, t); o.frequency.exponentialRampToValueAtTime((f0 || 120) * 0.4, t + 0.3); const g = ctx.createGain(); g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.5); }
  function synthMetal(t, lvl, dur, f) { const b = ctx.createBufferSource(); b.buffer = nb; b.loop = true; const fl = bq('highpass', f || 5000, 0.7); const g = ctx.createGain(); g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); b.connect(fl); fl.connect(g); g.connect(dry); b.start(t); b.stop(t + dur + 0.05); }
  // ---------- the ensemble
  const zheng = (t, m, g, o) => { const n = nearest('zh', m); if (!n) return synth(t, m, 1.2, g * 0.5, 'pluck'); voice(n.buf, t, n.rate, g, Object.assign({ pan: -0.25 }, o)); };
  const zhengTrem = (t, m, dur, g) => { const n = nearest('zt', m); if (!n) return synth(t, m, dur, g * 0.4, 'pluck'); voice(n.buf, t, n.rate, g, { dur, rel: 0.4, att: 0.05, pan: -0.3 }); };
  const gliss = (t, up, g) => { const b = S().get(up ? 'zgl_up' : 'zgl_dn'); if (b) voice(b, t, 1, g, { pan: -0.2 }); };
  const xun = (t, m, dur, g) => { const n = nearest('xun', m); if (!n) return synth(t, m, dur, g * 0.5, 'breath'); voice(n.buf, t, n.rate, g, { dur, att: 0.07, rel: 0.18, slide: 0.985, slideT: 0.1, pan: 0.18, fx: chain(bq('lowpass', 3800)) }); };
  const erhu = (t, m, dur, g, from) => { const n = nearest('eh', m); if (!n) return synth(t, m, dur, g * 0.4, 'reed');
    voice(n.buf, t, n.rate, g, { dur, att: 0.09, rel: 0.2, slide: from ? Math.pow(2, (from - m) / 12) : 0.99, slideT: from ? 0.16 : 0.08, pan: 0.22, fx: chain(bq('highpass', 200, 0.7), bq('lowpass', 7000)) }); };
  const suona = (t, m, dur, g) => { const n = nearest('sn', m); if (!n) return synth(t, m, dur, g * 0.5, 'reed');
    voice(n.buf, t, n.rate, g, { dur, att: 0.025, rel: 0.08, slide: 0.94, slideT: 0.05, fx: chain(bq('highpass', 300, 0.8), bq('lowpass', 8000)) }); };
  const drone = (t, m, dur, g) => { const n = nearest('vc', m); if (!n) return synth(t, m, dur, g * 0.3, 'breath'); voice(n.buf, t, n.rate, g, { dur, att: 0.4, rel: 0.6, fx: chain(bq('lowpass', 1100)) }); };
  const cello = (t, m, g) => { const n = nearest('vc', m); if (!n) return synthDrum(t, g * 0.5, mf(m)); voice(n.buf, t, n.rate, g, { dur: 0.32, att: 0.01, rel: 0.12, fx: chain(bq('lowpass', 1500)) }); };
  function hit(key, t, g, rate, pan) { const b = S().get(key); if (!b) { if (/^(dg|bd|tg)/.test(key)) synthDrum(t, g * 0.7, key[0] === 't' ? 220 : 110); else if (/^(bo|gong|bell)/.test(key)) synthMetal(t, g * 0.3, key[0] === 'g' ? 3 : 1, key[0] === 'g' ? 400 : 5000); else synthMetal(t, g * 0.3, 0.05, 2500); return; } voice(b, t, rate || 1, g, { pan: pan || 0 }); }
  const dagu = (t, k, g) => { hit('dg_' + k, t, g, 0.82); if (k === 'ff' && I > 0.5) hit('bd_ff', t, g * 0.45, 0.9); };
  // ---------- notation: jianpu degrees 1 2 3 5 6 (4, 7 as passing tones), ' up / , down an octave, ~ slide in, :n length in eighths
  const DEG = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
  function mel(str, base) { const notes = new Map(); let pos = 0; for (const tok of str.replace(/\|/g, ' ').trim().split(/\s+/)) { const m = tok.match(/^([0-7-])([',]*)(~?)(?::(\d+))?$/); if (!m) continue; const len = +(m[4] || 1); if (m[1] !== '-' && m[1] !== '0') { let oc = 0; for (const c of m[2]) oc += c === "'" ? 12 : -12; notes.set(pos, { m: base + DEG[m[1]] + oc, len, slide: !!m[3] }); } pos += len; } notes.total = pos; return notes; }
  const SC = [0, 2, 4, 7, 9]; const DI = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };
  const sdeg = (rootDeg, k, base) => { const i = DI[rootDeg] + k; return base + 12 * Math.floor(i / 5) + SC[((i % 5) + 5) % 5]; }; // k scale steps above a root degree
  function line(name, notes, s, t, e8, play) { const n = notes.get(s % notes.total); if (!n) return; const from = n.slide ? prevMel[name] : 0; prevMel[name] = n.m; play(t, n.m, n.len * e8, from); }
  // ---------- the pieces
  const MENU_A = mel("3:4 5:2 6:2 | 5:6 3:2 | 2:3 3:1 5:2 3:2 | 2:8 | 1:3 2:1 3:2 5:2 | 6:4 1':4 | 6:2 5:2 3:2 2:2 | 1:8", 71);
  const MENU_B = mel("5:4 6:2 1':2 | 2':6 1'~:2 | 6:3 1':1 6:2 5:2 | 3:8 | 2:3 3:1 5:2 6:2 | 5:4 3~:2 2:2 | 1:2 2:2 3:2 2:2 | 1:8", 71);
  const MENU_C = mel("5,:8 | 6,:8 | 5,:8 | 6,~:8 | 3,:8 | 5,:8 | 3,:4 2,~:4 | 1,:8", 71);
  const MENU_R = [[1, 1, 6, 5, 1, 6, 5, 1], [1, 1, 6, 5, 1, 6, 5, 1], [5, 2, 6, 3, 2, 5, 1, 1], [1, 1, 6, 5, 1, 6, 5, 1]];
  const MUSTER = mel("1:6 2~:2 | 3:8 | 2:4 1:2 6,~:2 | 5,:8 | 1:6 2:2 | 3:4 5~:4 | 6:4 5:2 3:2 | 2:8", 71);
  const BAT = mel("5 5 6 5 3 2 1:2 | 2 3 5 6 5:4 | 1' 1' 6 5 3 5 6 3 | 2 3 5 3 2 1:3 | 5 5 6 5 3 2 1:2 | 2 3 5 6 1':4 | 2' 1' 6 1' 6 5 3:2 | 5 6 5 3 2:2 1:2 | " +
    "6 1' 2' 1' 6 5 3:2 | 5 6 1' 6 5 3 2:2 | 3 5 6 1' 2' 1' 6 5 | 3 2 3 5 1:2 -:2 | 1':2 -:2 1':2 -:2 | 6 5 3 2 1:4 | 2':2 1':2 6:2 5:2 | 6:6 -:2", 71);
  const BAT_R = [1, 1, 6, 5, 1, 5, 6, 1, 6, 5, 6, 1, 1, 1, 5, 6];
  const SIEGE = mel("1:4 1:2 2:2 | 3:6 2~:2 | 1:2 6,:2 5,:4 | 6,:8 | 1:4 1:2 2:2 | 3:4 5~:4 | 6:2 5:2 3:2 2:2 | 3:8 | 5:4 6:2 5:2 | 3:6 5:2 | 6:2 1':2 6:2 5:2 | 3:8 | 2:4 3:2 2:2 | 1:4 6,~:4 | 5,:2 6,:2 1:2 2:2 | 1:8", 71);
  const SIEGE_R = [1, 1, 6, 6, 1, 1, 6, 3, 5, 3, 6, 3, 2, 6, 5, 1];
  // ---------- the war engine (battle and siege): a live drum corps that follows the fight ----------
  // 擊鼓而進: the big war drum (戰鼓) drives on the beat, the small drums (堂鼓) interlock on the sixteenths, cymbals (鈸)
  // and gongs mark the phrases, a suona leads, the cello and zheng hold the ground under it. Three levels follow how close
  // the fighting is: approach (heartbeat drums, a held erhu line), engaged (the full drive) and melee (double-time drums,
  // doubled suona, horn calls). Every 8 bars a phrase: A, B, A', then a break (C) that drops to big hits and builds back.
  const BAT_A = mel("5 5 6 5 3 2 1:2 | 2 3 5 6 5:4 | 1' 1' 6 5 3 5 6 3 | 2 3 5 3 2 1:3 | 5 5 6 5 3 2 1:2 | 2 3 5 6 1':4 | 2' 1' 6 1' 6 5 3:2 | 5 6 5 3 2:2 1:2", 71);
  const BAT_B = mel("6 1' 2' 1' 6 5 3:2 | 5 6 1' 6 5 3 2:2 | 3 5 6 1' 2' 1' 6 5 | 3 2 3 5 1:2 -:2 | 1':2 -:2 1':2 -:2 | 6 5 3 2 1:4 | 2':2 1':2 6:2 5:2 | 6:6 -:2", 71);
  const BAT_C = mel("1' 6 5 6 1':2 2':2 | 3':2 2' 1' 6:4 | 5 6 1' 2' 3' 2' 1' 6 | 5:6 3:2 | 2 3 5 6 5 3 2 3 | 5:4 6:2 5:2 | 3 2 1 2 3 5 2 3 | 1:6 -:2", 71);
  const BAT_D = mel("5:8 | 6:4 5:4 | 3:8 | 2:4 3~:4 | 5:8 | 6:4 1':4 | 6:6 5:2 | 5:8", 71); // the break: long erhu tones over the hits
  const SIG_A = mel("1:4 1:2 2:2 | 3:6 2~:2 | 1:2 6,:2 5,:4 | 6,:8 | 1:4 1:2 2:2 | 3:4 5~:4 | 6:2 5:2 3:2 2:2 | 3:8", 71);
  const SIG_B = mel("5:4 6:2 5:2 | 3:6 5:2 | 6:2 1':2 6:2 5:2 | 3:8 | 2:4 3:2 2:2 | 1:4 6,~:4 | 5,:2 6,:2 1:2 2:2 | 1:8", 71);
  const SIG_C = mel("6 6 5 3 5:2 6:2 | 1':4 6:4 | 5 3 2 3 5:2 3:2 | 2:8 | 3 3 2 1 2:2 3:2 | 5:4 6~:4 | 5 3 2 3 1:2 6,:2 | 1:8", 71);
  const SIG_D = mel("1:8 | 6,:8 | 5,:8 | 6,~:8 | 1:8 | 2:8 | 3:4 2:4 | 1:8", 71);
  const humanize = (t, j) => t + (Math.random() - 0.5) * (j || 0.008);
  function warTrack(o) {
    let lvl = 1, plan = 'ABAC', vary = 0;
    return { bpm: o.bpm, len: 256, play(s, t, e8) {
      const ph = Math.floor(s / 64) % 4, bar = Math.floor(s / 8) % 8, b8 = s % 8, e16 = e8 / 2;
      if (s % 64 === 0) { plan = Math.random() < 0.3 ? 'ABCA' : 'ABAC'; vary = Math.random(); }
      if (b8 === 0) lvl = I < 0.42 ? (lvl === 1 && I > 0.36 ? 1 : 0) : I < 0.78 ? (lvl === 2 && I > 0.72 ? 2 : 1) : 2; // with a little hysteresis
      const sec = plan[ph], root = o.roots[(ph % 2) * 8 + bar], brk = sec === 'C' && lvl > 0, last = bar === 7, mel0 = { A: o.m[0], B: o.m[1], C: o.m[3] }[sec] || o.m[0];
      const M = sec === 'A' && ph === 2 ? o.m[2] : mel0; // the third phrase carries the second tune
      // --- phrase marks: gong and crash on the downbeat of a phrase, a horn call into the melee
      if (s % 64 === 0) { if (lvl > 0) { hit(o.gong, t, 0.22 + lvl * 0.05); hit('bo_ff', t, 0.13 + lvl * 0.04, 1, 0.2); } else hit('gong_lt', t, 0.16); if (lvl === 2) suona(t + e8 * 0.1, 59, e8 * 5, 0.2); }
      // --- drums, on a sixteenth grid (two per eighth)
      for (let h = 0; h < 2; h++) { const k = b8 * 2 + h, tt = humanize(t + h * e16, h ? 0.01 : 0.004);
        if (last && lvl > 0 && !(sec === 'C')) { // the fill: small drums roll up into the next phrase, the big drum lands on the last sixteenth
          if (k >= 8) hit('tg_f', tt, 0.1 + (k - 8) * 0.025, 1, (k % 2 ? 0.25 : -0.25)); if (k % 4 === 0) dagu(tt, 'mf', 0.3 + k * 0.012); if (k === 15) { dagu(tt, 'ff', 0.55); hit('bd_ff', tt, 0.4, 0.85); } if (k < 8 && (k === 0 || k === 6)) dagu(tt, 'ff', 0.55); continue; }
        if (brk) { // the break: two big hits a bar, a held drone; the last two bars build back
          if (k === 0 || k === 11) { dagu(tt, 'ff', 0.62); hit('bd_ff', tt, 0.38, 0.8); } if (k === 0 && bar % 2 === 0) hit('gong_f', tt, 0.12);
          if (bar >= 6) { if (bar === 7 || k % 2 === 0) hit('tg_f', tt, 0.06 + (bar - 6) * 0.06 + k * 0.006, 1, k % 2 ? 0.3 : -0.3); if (k % 4 === 0) dagu(tt, 'mf', 0.22 + (bar - 6) * 0.14 + k * 0.01); }
          continue; }
        const BIG = [[0, 10], [0, 6, 8, 11], [0, 3, 6, 8, 10, 11, 14]][lvl], MID = [[], [4, 12], [4, 12, 13]][lvl];
        if (BIG.includes(k)) { dagu(tt, 'ff', lvl === 0 ? 0.34 : k === 0 ? 0.66 : 0.54); if (lvl > 0) hit('bd_ff', tt, k === 0 ? 0.4 : 0.28, 0.78); }
        if (MID.includes(k)) dagu(tt, 'mf', 0.36);
        if (lvl === 1 && [2, 7, 9, 14, 15].includes(k)) hit('tg_f', tt, k === 15 ? 0.15 : 0.12, 1, k % 2 ? 0.28 : -0.28);
        if (lvl === 2) { const acc = k % 4 === 2; hit(acc ? 'tg_f' : 'tg_p', tt, acc ? 0.17 : 0.1, 1, k % 2 ? 0.3 : -0.3); if (k === 4 || k === 12) dagu(tt, 'rim', 0.18); }
        if (lvl === 0 && k === 6 && bar % 2) hit('tg_p', tt, 0.1, 1, 0.2); }
      // --- cymbals
      if (!brk && b8 === 0 && lvl === 1 && bar % 2 === 0 && bar) hit('bo_mf', t, 0.1, 1, -0.2);
      if (!brk && lvl === 2) { if (b8 === 0 && bar) hit('bo_mf', t, 0.12, 1, bar % 2 ? 0.25 : -0.25); if (b8 === 6 && bar % 2) hit('bo_sh', t, 0.1, 1, 0.1); }
      // --- the ground: cello pulse (or pedal) on the root, the zheng ostinato
      if (lvl === 0 || brk) { if (b8 === 0 && bar % 2 === 0) drone(t, sdeg(root, 0, 35), e8 * 16, 0.16); }
      else { const P = [0, 0, 5, 0, 0, 5, 4, 3]; cello(t, sdeg(root, P[b8], 35), b8 === 0 ? 0.38 : 0.27); }
      if (lvl > 0 && !brk) zheng(humanize(t), sdeg(root, [0, 3, 5, 3, 6, 3, 5, 3][b8], 59), b8 === 0 ? 0.14 : 0.08);
      if (brk && b8 === 0 && bar % 2 === 0) zhengTrem(t, sdeg(root, 5, 47), e8 * 15, 0.12);
      // --- the voices
      if (lvl === 0) { if (s % 2 === 0) { const n = M.get((s / 2) % M.total); if (n) erhu(t, n.m - 12, n.len * e8 * 2, 0.22); } } // the tune at half speed, an octave down: something coming
      else if (brk) line('erhuD', o.m[3], s, t, e8, (tt, m, d, f) => erhu(tt, m, d, 0.28, f));
      else { const quiet = vary > 0.7 && bar < 2; // sometimes the drums alone open a phrase
        if (!quiet) line('suona', M, s, t, e8, (tt, m, d) => suona(tt, m, d * 0.95, 0.32));
        if (lvl === 2 && !quiet) { line('suona2', M, s, t, e8, (tt, m, d) => suona(tt + 0.012, m - 12, d * 0.95, 0.15)); line('erhuB', M, s, t, e8, (tt, m, d) => erhu(tt, m - 12, d * 0.95, 0.13)); } }
    } };
  }
  const TRACKS = {
    battle: warTrack({ bpm: 138, roots: BAT_R, m: [BAT_A, BAT_B, BAT_C, BAT_D], gong: 'gong_big' }),
    siege: warTrack({ bpm: 134, roots: SIEGE_R, m: [SIG_A, SIG_B, SIG_C, SIG_D], gong: 'gong_big' }),
    menu: { bpm: 64, len: 256, rec: { key: 'mus_red_dawn', pure: true, e8: 0.47 }, play(s, t, e8) {
      if (REC && REC.pure) return;
      const sec = Math.floor(s / 64), bar = Math.floor(s / 8) % 8, b8 = s % 8, root = MENU_R[sec][bar];
      if (s % 64 === 0) { hit('gong_lt', t, 0.18); hit('bell', t + e8 * 0.5, 0.16, 0.94); if (sec === 1) gliss(t, true, 0.22); }
      if (b8 === 0 && bar % 2 === 0) drone(t, sdeg(root, 0, 35), e8 * 16, 0.12);
      if (sec < 3) { const pat = [0, 3, 5, 6, 7]; if (b8 < 5) zheng(t + b8 * 0.03, sdeg(root, pat[b8], 47), b8 === 0 ? 0.32 : 0.2); if (b8 === 6 && bar % 2) zheng(t, sdeg(root, 8, 47), 0.14); }
      else if (b8 === 0) zheng(t, sdeg(root, 0, 47), 0.3);
      if (sec === 0 || sec === 1) line('xun', MENU_A, s, t, e8, (tt, m, d) => xun(tt, m, d * 1.02, 0.34));
      if (sec === 1) line('erhuC', MENU_C, s, t, e8, (tt, m, d, f) => erhu(tt, m, d, 0.15, f));
      if (sec === 2) line('erhu', MENU_B, s, t, e8, (tt, m, d, f) => erhu(tt, m, d * 1.02, 0.3, f));
      if (sec === 3) line('zh', MENU_A, s, t, e8, (tt, m, d) => { if (d >= e8 * 4) zhengTrem(tt, m, d, 0.26); else zheng(tt, m, 0.34, (m - 71) % 12 === 9 && d >= e8 * 2 ? { bend: { at: 0.25, ratio: Math.pow(2, 2 / 12), back: 0.6 } } : null); });
    } },
    muster: { bpm: 80, len: 64, play(s, t, e8) {
      const bar = Math.floor(s / 8), b8 = s % 8;
      if (s === 0) { hit('gong_f', t, 0.3); hit('bo_mf', t, 0.12); }
      if (b8 === 0) dagu(t, 'mf', 0.5); if (b8 === 3) dagu(t, 'hand', 0.28); if (b8 === 4 && bar % 2) dagu(t, 'mf', 0.32);
      if (bar % 4 === 2 && b8 === 0) hit('troll', t, 0.3);
      if (b8 === 0 && bar % 2 === 0) zhengTrem(t, bar % 4 ? 66 : 59, e8 * 15, 0.16);
      line('erhuM', MUSTER, s, t, e8, (tt, m, d, f) => erhu(tt, m, d, 0.26, f));
      if (bar === 6 && b8 % 2 === 0) hit('bz_f', t, 0.22, 1.25); if (bar === 7) { hit('bz_f', t, 0.26, 1.25); if (b8 >= 4) hit('bz_mp', t + e8 / 2, 0.2, 1.25); }
      if (bar === 4 && b8 === 0) hit('bo_sh', t, 0.18);
    } },
    // battle and siege ride on a recorded war-drum ensemble (0 A.D., CC BY-SA); our instruments lock to its beat
    battle0: { bpm: 124, rec: { key: 'mus_taiko_1', e8: 0.3076, ph: 0.01 }, recs: [{ key: 'mus_taiko_1', e8: 0.3076, ph: 0.01 }, { key: 'mus_hill', pure: true, e8: 0.3076 }, { key: 'mus_taiko_2', e8: 0.3104, ph: 0.19 }, { key: 'mus_red_dawn', pure: true, e8: 0.3076 }], len: 128, play(s, t, e8) {
      if (REC && REC.pure) return;
      const bar = Math.floor(s / 8), b8 = s % 8, root = BAT_R[bar % 16];
      const pat = ['ff', 0, 'mf', 'rim', 'ff', 'rim', 'mf', 0][b8];
      if (REC) { /* the recording carries the drums */ }
      else if (bar % 4 === 3 && b8 >= 4) { dagu(t, 'mf', 0.4); dagu(t + e8 / 2, b8 === 7 ? 'ff' : 'mf', 0.42); if (I > 0.6) hit('tg_f', t + e8 / 4, 0.22); }
      else if (pat) dagu(t, pat, pat === 'ff' ? 0.62 : pat === 'mf' ? 0.42 : 0.22);
      if (b8 === 0) { if (bar % 4 === 0) hit('bo_ff', t, 0.2 + I * 0.15, 1, 0.15); else if (bar % 2 === 0) hit('bo_mf', t, 0.14, 1, -0.15); }
      if (I > 0.25 && b8 % 2 === 1) hit('bz_f', t, 0.16 + I * 0.08, 1.25, 0.3);
      if (I > 0.3) zheng(t, sdeg(root, [0, 3, 5, 3, 6, 3, 5, 3][b8], 59), b8 === 0 ? 0.24 : 0.15);
      if (I > 0.7 && (b8 === 0 || b8 === 4)) cello(t, sdeg(root, 0, 35), 0.3);
      if (I > (REC ? 0.35 : 0.55)) line('suona', BAT, s, t, e8, (tt, m, d) => suona(tt, m, d * 0.95, 0.38));
      else line('xunB', BAT, s, t, e8, (tt, m, d) => xun(tt, m, d * 0.95, 0.26));
      if (I > 0.82) line('erhuB', BAT, s, t, e8, (tt, m, d) => erhu(tt, m - 12, d * 0.95, 0.17));
    } },
    siege0: { bpm: 124, rec: { key: 'mus_taiko_2', e8: 0.3104, ph: 0.19 }, recs: [{ key: 'mus_taiko_2', e8: 0.3104, ph: 0.19 }, { key: 'mus_hill', pure: true, e8: 0.3104 }, { key: 'mus_taiko_1', e8: 0.3076, ph: 0.01 }], len: 128, play(s, t, e8) {
      if (REC && REC.pure) return;
      const bar = Math.floor(s / 8), b8 = s % 8, root = SIEGE_R[bar % 16];
      if (REC) { } else if (b8 === 0 || b8 === 4) dagu(t, 'ff', 0.6); if (b8 === 2 || b8 === 6) dagu(t, 'hand', 0.34); if (b8 === 7) dagu(t, 'rim', 0.22);
      if (b8 === 0 && bar % 2 === 0) hit(bar % 8 === 0 ? 'gong_big' : 'gong_f', t, 0.24);
      if (I > 0.4 && b8 % 2 === 0) cello(t, sdeg(root, 0, 35), 0.26);
      if (I > 0.3 && b8 === 0) zhengTrem(t, sdeg(root, 0, 59), e8 * 7.5, 0.13);
      if (I > 0.6) { if (b8 % 2 === 1) hit('bz_f', t, 0.18, 1.2, 0.3); line('suonaS', SIEGE, s, t, e8, (tt, m, d) => suona(tt, m, d * 0.96, 0.34)); }
      else line('erhuS', SIEGE, s, t, e8, (tt, m, d, f) => erhu(tt, m, d, 0.28, f));
      if (I > 0.82) line('erhuS2', SIEGE, s, t, e8, (tt, m, d) => erhu(tt, m - 12, d, 0.16));
      if (bar % 8 === 7 && b8 >= 4) hit('tg_f', t + e8 / 2, 0.24);
    } },
  };
  let recIdx = 0;
  function startRec(t) { const b = REC.buf; recSrc = ctx.createBufferSource(); recSrc.buffer = b; recSrc.connect(recG); recSrc.start(t); recEnd = t + b.duration; nextT = t + (REC.ph || 0); step = 0; prevMel = {}; }
  function stopRec() { if (recSrc) { try { recG.gain.setTargetAtTime(0, ctx.currentTime, 0.4); const s0 = recSrc; setTimeout(() => { try { s0.stop(); } catch (e) { } }, 1500); } catch (e) { } } recSrc = null; REC = null; }
  function tick() { if (!playing || !ctx) return; tickAt(ctx.currentTime); }
  function tickAt(now) {
    const tr = TRACKS[playing]; const e8 = REC ? REC.e8 : 60 / tr.bpm / 2;
    if (REC) { recG.gain.setTargetAtTime((REC.pure ? 0.62 : 0.42) + 0.4 * I, now, 0.8); if (now + 0.35 > recEnd) { const L = tr.recs; if (L && L.length > 1) { recIdx = (recIdx + 1) % L.length; const nb = S().get(L[recIdx].key); if (nb) REC = Object.assign({ buf: nb }, L[recIdx]); } startRec(recEnd); } }
    while (nextT < now + 0.3) { I += (target - I) * 0.06; try { tr.play(step % tr.len, nextT, e8); } catch (e) {} nextT += e8; step++; }
  }
  function play(name) {
    if (!ensure() || !TRACKS[name]) return; if (playing === name) return;
    const was = playing; playing = name; step = 0; prevMel = {}; nextT = ctx.currentTime + 0.12;
    stopRec(); recIdx = 0; const rb = TRACKS[name].rec && S().get(TRACKS[name].rec.key);
    if (rb) { REC = Object.assign({ buf: rb }, TRACKS[name].rec); recG = ctx.createGain(); recG.gain.value = 0.0001; recG.gain.setTargetAtTime(0.6, ctx.currentTime, 0.6); recG.connect(comp); startRec(ctx.currentTime + 0.12); }
    if (was && (name === 'battle' || name === 'siege')) { hit('gong_big', nextT, 0.3); hit('bo_ff', nextT, 0.22); }
    if (!timer) timer = setInterval(tick, 50);
  }
  function stop() { playing = null; stopRec(); }
  // stingers for the end of a battle, and accents for big moments
  function sting(win) {
    if (!ensure()) return; playing = null; stopRec(); const t = ctx.currentTime + 0.1;
    if (win) { hit('bo_ff', t, 0.3); hit('gong_big', t, 0.32); dagu(t, 'ff', 0.6); const e = 0.24; [[71, 1], [71, 1], [78, 2], [80, 2], [83, 6]].reduce((tt, [m, l]) => { suona(tt, m, l * e * 0.95, 0.4); return tt + l * e; }, t + 0.05);
      gliss(t + 0.5, true, 0.3); [0.48, 0.96, 1.2, 1.44].forEach(d => dagu(t + d, 'ff', 0.5)); hit('bo_ff', t + 2.9, 0.26); hit('bell', t + 3.2, 0.2); }
    else { hit('gong_f', t, 0.3); hit('troll', t, 0.16, 0.8); const e = 0.6; [[75, 3, 0], [73, 1, 75], [71, 4, 0], [68, 4, 71], [66, 4, 0], [63, 8, 0]].reduce((tt, [m, l, f]) => { erhu(tt, m, l * e, 0.32, f); return tt + l * e; }, t + 0.4); hit('bell', t + 9, 0.2, 0.9); }
    setTimeout(() => { if (!playing) play('menu'); }, win ? 6000 : 11000);
  }
  function accent(kind) {
    if (!ensure() || muted) return; const t = ctx.currentTime + 0.05;
    if (kind === 'breach') { hit('gong_big', t, 0.36); hit('bo_ff', t, 0.3); for (let i = 0; i < 8; i++) dagu(t + i * 0.09, i === 7 ? 'ff' : 'mf', 0.3 + i * 0.04); }
    else if (kind === 'phase') { hit('gong_f', t, 0.3); gliss(t, true, 0.24); }
    else if (kind === 'wave') { hit('bo_ff', t, 0.24); dagu(t, 'ff', 0.5); dagu(t + 0.2, 'ff', 0.5); }
  }
  function setIntensity(v) { target = (playing === 'battle' || playing === 'siege') ? Math.max(0.6, v) : v; } /* a fight never falls to the quiet layer */
  // render a cue offline (for previews and tests): the same scheduler, driven by a fake clock into an OfflineAudioContext
  async function _offline(name, iv, secs, curve) {
    const live = { ctx, out, dry, comp, nb, playing, REC, recSrc, recG, recEnd, nextT, step, I, target, prevMel, recIdx };
    if (timer) { clearInterval(timer); timer = null; }
    const oc = new OfflineAudioContext(2, Math.ceil(44100 * secs), 44100); out = null; ensure(oc); out.gain.value = vol;
    playing = name; step = 0; prevMel = {}; nextT = 0.12; REC = null; recSrc = null; recIdx = 0; I = target = iv;
    const rb = TRACKS[name].rec && S().get(TRACKS[name].rec.key);
    if (rb) { REC = Object.assign({ buf: rb }, TRACKS[name].rec); recG = oc.createGain(); recG.gain.value = 0.6; recG.connect(comp); startRec(0.12); }
    for (let now = 0; now < secs - 0.4; now += 0.05) { if (curve) target = curve(now); tickAt(now); }
    const pr = oc.startRendering();
    ({ ctx, out, dry, comp, nb, playing, REC, recSrc, recG, recEnd, nextT, step, I, target, prevMel, recIdx } = live);
    if (playing) timer = setInterval(tick, 50);
    return pr;
  }
  function toggle() { muted = !muted; if (out) out.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.1); return !muted; }
  function setMuted(m) { muted = m; if (out) out.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.1); }
  return { duck, _offline, play, stop, sting, accent, setIntensity, toggle, setMuted, get muted() { return muted; }, get track() { return playing; } };
})();
