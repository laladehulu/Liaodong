// ===== 話 · Speech: men talk where they stand =====
// Lines appear as bilingual captions over the speaker's head, only within earshot. A small director keeps it readable:
// at most two lines at once, a cooldown per speaker, and the more important line wins.
const SPEECH = (() => {
  const MAX = 2, live = [], cool = {}, pool = []; let pollT = 0, globalT = 0, lastHp = 1, cavT = 0, bleedT = 0, sqOrd = {}, lastSt = {}, wndT = 0;
  const v3 = new THREE.Vector3();
  const unit = (id) => state.sim && id >= 0 ? state.sim.units[id] : null;
  function nameOf(id) {
    if (typeof ZB !== 'undefined' && ZB && ZB.map[id] !== undefined) { const r = (ZB.R || ZR)[ZB.map[id]]; return r ? { zh: r.zh, en: r.en } : null; }
    if (typeof ZC !== 'undefined' && ZC && ZC.map[id] !== undefined) { const r = (ZC.R || ZR)[ZC.map[id]]; return r ? { zh: r.zh, en: r.en } : null; }
    if (typeof SOLD !== 'undefined' && SOLD && SOLD.map && SOLD.map[id]) return SOLD.map[id].name;
    return null;
  }
  function el() { let e = pool.pop(); if (!e) { e = document.createElement('div'); e.className = 'spk'; document.body.appendChild(e); } e.style.opacity = 0; e.hidden = false; return e; }
  function listener() { const r = state.renderer; return r ? r.camera.position : null; }
  // say(unitId, zh, en, opts): opts.prio (0 bark … 3 story), opts.loud (scripted: heard farther), opts.radio (fall back to the radio panel), opts.who (name override), opts.shout
  // ---- the face of whoever is speaking: rendered once per man in the studio above the field, then cached ----
  // ---- live 3D heads in the HUD ----
  // Each speaker in the stack is a small 3D bust (head, shoulders, his own hat, face and kit) built from the same gear
  // description as his body, drawn every frame by a second tiny renderer on a transparent overlay canvas, one small
  // scissored viewport per face box. That costs a few dozen meshes, not a second pass of the battle.
  const BUST = { r: null, cv: null, scene: null, cam: null, cache: new Map(), geo: null, any: false };
  const faceKey = (u) => u.id + ':' + ((u.look && u.look.id) || '');
  function bustInit() {
    const cv = document.createElement('canvas'); cv.id = 'bustcv'; document.body.appendChild(cv);
    const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); r.setClearColor(0x000000, 0); r.autoClear = false;
    const sc = new THREE.Scene(); const hm = new THREE.HemisphereLight(0xe8e4dc, 0x3a3028, 0.85); sc.add(hm); const d = new THREE.DirectionalLight(0xfff0dc, 0.75); d.position.set(0.6, 1.2, 1.4); sc.add(d); BUST.hemi = hm; BUST.dir = d;
    const R = RENDER.roundBox; BUST.geo = { b: R(0.3, 6, 4), c: new THREE.ConeGeometry(0.5, 1, 10), y: new THREE.CylinderGeometry(0.5, 0.5, 1, 10), head: R(0.62, 10, 7), torso: R(0.38, 10, 6), limb: R(0.5, 6, 4) };
    BUST.r = r; BUST.cv = cv; BUST.scene = sc; BUST.cam = new THREE.PerspectiveCamera(26, 1, 0.05, 10); BUST.cam.position.set(0.16, 0.5, 1.28); BUST.cam.lookAt(0, 0.4, 0);
  }
  function bustFor(u) {
    const key = faceKey(u); let b = BUST.cache.get(key); if (b) return b;
    const G = BUST.geo; const grp = new THREE.Group(), head = new THREE.Group(); head.position.set(0, 0.47, 0.01); grp.add(head);
    const skinC = new THREE.Color(); { const t = RENDER.uhash(u.id, 3); skinC.setRGB(0.9 - t * 0.14, 0.76 - t * 0.16, 0.6 - t * 0.17); if (u.look && u.look.skin) skinC.set(u.look.skin); }
    const tc = (RENDER.GEAR_HOOK.torso && RENDER.GEAR_HOOK.torso(u)) || RENDER.torsoColor(u);
    const add = (parent, geo, c, x, y, z, sx, sy, sz, rot) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); m.scale.set(sx, sy, sz); parent.add(m); return m; };
    add(grp, G.torso, tc, 0, 0, 0, 0.5, 0.64, 0.3); add(head, G.head, skinC, 0, 0, 0, 0.28, 0.3, 0.28);
    for (const sx of [-1, 1]) add(grp, G.limb, tc, sx * 0.29, 0.08, 0, 0.13, 0.36, 0.14, [0, 0, sx * 0.12]);
    const FR = { c: [grp, 0, 0, 0], h: [head, 0, 0, 0], sl: [grp, 0.2, 0.22, 0], sr: [grp, -0.2, 0.22, 0] };
    for (const p of RENDER.gearFor(u).parts) { const F = FR[p.f]; if (!F || !G[p.m]) continue; add(F[0], G[p.m], p.k, F[1] + p.o[0], F[2] + p.o[1], F[3] + p.o[2], p.s[0], p.s[1], p.s[2], p.r); }
    grp.visible = false; BUST.scene.add(grp);
    b = { grp, head, seed: u.id * 1.7 }; BUST.cache.set(key, b);
    if (BUST.cache.size > 40) { const k0 = BUST.cache.keys().next().value; const o = BUST.cache.get(k0); BUST.scene.remove(o.grp); BUST.cache.delete(k0); }
    return b;
  }
  function setFace(el, u) { el.classList.add('facebox'); el._uid = u ? u.id : -1; el.classList.toggle('none', !u); el.classList.toggle('live', !!u); el._t0 = performance.now(); }
  function face() { return null; }
  function bustFrame() { // after the battle frame: draw every visible speaker's head into his box
    const boxes = [...document.querySelectorAll('.facebox.live')].filter(el => el.offsetParent !== null && el._uid >= 0);
    if (!boxes.length) { if (BUST.any) { BUST.r.setScissorTest(false); BUST.r.clear(); BUST.any = false; } return; }
    if (!BUST.r) bustInit(); const r = BUST.r, W = window.innerWidth, H = window.innerHeight;
    const sz = r.getSize(new THREE.Vector2()); if (sz.x !== W || sz.y !== H) r.setSize(W, H, false);
    r.setScissorTest(false); r.clear(); r.setScissorTest(true); BUST.any = true; const now = performance.now() / 1000;
    for (const el of boxes) { const u = unit(el._uid); if (!u) continue; const host = el.closest('.ce, #dlgcard, .tk') || el; const fade = +getComputedStyle(host).opacity; if (fade < 0.2) continue;
      const rc = el.getBoundingClientRect(); if (rc.width < 4 || rc.bottom < 0 || rc.top > H) continue; const b = bustFor(u); b.grp.visible = true;
      const talk = (performance.now() - el._t0) / 1000 < 2.5; b.grp.rotation.y = 0.25 + Math.sin(now * 0.6 + b.seed) * 0.12; b.head.rotation.set(talk ? Math.sin(now * 11 + b.seed) * 0.04 : 0, Math.sin(now * 0.9 + b.seed) * 0.1, 0);
      if (u.dead || u.downed || u.wounded) b.head.rotation.set(0.2, 0, 0.25);
      r.setViewport(rc.left, H - rc.bottom, rc.width, rc.height); r.setScissor(rc.left, H - rc.bottom, rc.width, rc.height); BUST.cam.aspect = rc.width / rc.height; BUST.cam.updateProjectionMatrix();
      if (u.dead) { if (!BUST.grey) BUST.grey = new THREE.MeshLambertMaterial({ color: 0x5a5856 }); BUST.scene.overrideMaterial = BUST.grey; b.head.rotation.set(0.35, 0, 0.3); }
      { const quiet = !!el.closest('#zgrid') && !el.closest('.talk, .down, .rise'); BUST.hemi.intensity = quiet ? 0.42 : 0.85; BUST.dir.intensity = quiet ? 0.28 : 0.75; } // the squad grid sits muted until a man speaks or needs you
      r.render(BUST.scene, BUST.cam); BUST.scene.overrideMaterial = null; b.grp.visible = false; }
  }
  function pump() { }
  function prewarm() { }
  let cardEl = null, cardT = 0;
  function card(u, who, zh, en, dur) { // the dialogue card: face on the left, the words on the right
    if (!cardEl) { cardEl = document.createElement('div'); cardEl.id = 'dlgcard'; cardEl.innerHTML = '<div class="f"></div><div class="t"><b></b><span class="z"></span><span class="e"></span></div>'; document.body.appendChild(cardEl); }
    setFace(cardEl.firstChild, u);
    const t = cardEl.lastChild; t.children[0].textContent = who || ''; t.children[1].textContent = zh || ''; t.children[2].textContent = en || '';
    cardEl.classList.add('on'); cardT = dur || 5;
  }
  // ---- three ways to lay out who-said-what; F9 cycles them (saved per browser) ----
  //  A · 'stack'   : a ranked column on the left, at most 4 lines: orders and story first, alerts after, newest on top; each fades on its own clock
  //  B · 'card'    : one large card for the line that matters (face + words), with a 3-line alert ticker under it
  //  C · 'film'    : no panels: story lines as film subtitles at the bottom, alerts as bubbles pinned to the screen edge toward the speaker
  const LAYOUTS = ['stack', 'card', 'film'], LNAME = { stack: 'A · ranked stack', card: 'B · speaker card + ticker', film: 'C · film subtitles + edge bubbles' };
  let layout = 'stack'; try { const v = localStorage.getItem('ming_comms'); if (LAYOUTS.includes(v)) layout = v; } catch (e) { }
  const RANK = { story: 0, alert: 1 }, LIFE = { story: 7, alert: 4.5 };
  let stackEl = null, tickEl = null, subEl = null; const stack = []; // { key, tier, who, zh, en, url, t, dur, el }
  function setLayout(v) { layout = v; try { localStorage.setItem('ming_comms', v); } catch (e) { } for (const s of stack) s.el.remove(); stack.length = 0; if (cardEl) cardEl.classList.remove('on'); if (subEl) subEl.classList.remove('on'); if (typeof toast === 'function') toast('Speech layout: ' + LNAME[v] + '  (F9 to change)'); }
  function cycle() { setLayout(LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length]); }
  function comms(u, tier, who, zh, en, dur) {
    if (layout === 'card') { if (tier === 'story') card(u, who, zh, en, dur); else ticker(u, who, zh, en); return; }
    if (!u && layout === 'film') { subtitle(who, zh, en, dur); return; }
    if (layout === 'film') { if (tier === 'story') subtitle(who, zh, en, dur); return; } // film: alerts are edge bubbles, drawn in frame()
    // stack: one line per speaker (a new line replaces his old one), ranked, at most 4
    if (!stackEl) { stackEl = document.createElement('div'); stackEl.id = 'comms'; document.body.appendChild(stackEl); }
    const key = u ? u.id : 'n:' + who; let s = stack.find(x => x.key === key);
    if (!s) { const el = document.createElement('div'); el.className = 'ce'; el.innerHTML = '<i></i><div><b></b><span class="z"></span><span class="e"></span></div>'; s = { key, el }; stack.push(s); }
    const fresh = !s.el.parentNode; Object.assign(s, { tier, who, zh, en, t: 0, dur: dur || LIFE[tier] }); s.el.className = 'ce ' + tier + (fresh ? '' : ' upd'); if (!fresh) { void s.el.offsetWidth; }
    setFace(s.el.firstChild, u); const tx = s.el.lastChild; tx.children[0].textContent = who; tx.children[1].textContent = zh || ''; tx.children[2].textContent = tier === 'story' ? (en || '') : (en || '').slice(0, 60);
    stack.sort((a, b) => RANK[a.tier] - RANK[b.tier] || a.t - b.t);
    while (stack.length > 4) { const w = stack.pop(); w.el.remove(); }
    stack.forEach((x, i) => { x.el.style.order = i; if (!x.el.parentNode) stackEl.appendChild(x.el); }); // reorder by flex order, never by moving nodes (that would replay every entry's slide-in)
  }
  function ticker(u, who, zh, en) {
    if (!tickEl) { tickEl = document.createElement('div'); tickEl.id = 'ticker'; document.body.appendChild(tickEl); }
    const row = document.createElement('div'); row.className = 'tk';
    row.innerHTML = '<i></i><b></b><span></span>'; setFace(row.firstChild, u); row.children[1].textContent = who ? who.split(' ')[0] : ''; row.children[2].textContent = (zh ? zh + '  ' : '') + (en || '');
    tickEl.prepend(row); while (tickEl.children.length > 3) tickEl.lastChild.remove(); setTimeout(() => { row.classList.add('out'); setTimeout(() => row.remove(), 500); }, 4200);
  }
  let subT = 0;
  function subtitle(who, zh, en, dur) {
    if (!subEl) { subEl = document.createElement('div'); subEl.id = 'filmsub'; subEl.innerHTML = '<b></b><span class="z"></span><span class="e"></span>'; document.body.appendChild(subEl); }
    subEl.children[0].textContent = who || ''; subEl.children[1].textContent = zh || ''; subEl.children[2].textContent = en || ''; subEl.classList.add('on'); subT = dur || 6;
  }
  // a voice with no body in earshot (a runner, a messenger, the radio of old): straight into the comms layout
  function note(who, text, dur) { const i = (text || '').indexOf('  '), zh = i > 0 && /[\u3400-\u9fff]/.test(text.slice(0, i)) ? text.slice(0, i) : '', en = zh ? text.slice(i + 2) : text; comms(null, 'story', who, zh, en, dur || Math.min(8, 3 + en.length / 20)); }
  function commsFrame(dt) {
    for (let i = stack.length - 1; i >= 0; i--) { const s = stack[i]; s.t += dt; const left = s.dur - s.t; s.el.style.opacity = Math.max(0, Math.min(1, left / 0.6)).toFixed(2); if (left <= 0) { s.el.remove(); stack.splice(i, 1); } }
    if (subEl && subT > 0) { subT -= dt; if (subT <= 0) subEl.classList.remove('on'); }
  }
  function say(id, zh, en, o) {
    o = o || {}; const u = unit(id); const L = listener(); const now = performance.now() / 1000; const prio = o.prio || 0;
    const range = o.loud ? 48 : 26;
    const mine = (v) => { const sim = state.sim, me = sim && sim.players[state.localIdx]; if (!v || !me) return false; if (nameOf(v.id)) return true; const sq = v.squad >= 0 ? sim.squads[v.squad] : null; return !!sq && (v.squad === me.soldierSq || sq.owner === state.localIdx); };
    // the stack is for your own men, and for the named commanders whose words carry the story; everyone else speaks only where he stands
    if (prio >= 2 && u && !u.dead && (mine(u) || (prio >= 3 && o.who))) { const n0 = o.who || nameOf(id); comms(u, prio >= 3 ? 'story' : 'alert', typeof n0 === 'string' ? n0 : n0 ? n0.zh + ' ' + n0.en : '', zh, en, o.dur || (prio >= 3 ? Math.min(8, 3 + (en || '').length / 20) : 4.5)); if (prio >= 3 && (!L || Math.hypot(u.x - L.x, u.z - L.z) > range)) return true; }
    if (!u || u.dead || !L || Math.hypot(u.x - L.x, u.z - L.z) > range) { if (o.radio && typeof radio === 'function' && typeof MIS !== 'undefined' && MIS) radio(o.who || 'Voice', `${zh ? zh + '  ' : ''}${en}`); return false; }
    if (prio < 2 && (cool[id] || 0) > now) return false; cool[id] = now + (o.cool || 6);
    for (let i = live.length - 1; i >= 0; i--) if (live[i].id === id) { kill(i); }
    if (live.length >= MAX) { let w = -1, wp = 99; live.forEach((l, i) => { if (l.prio < wp || (l.prio === wp && w >= 0 && l.t0 < live[w].t0)) { wp = l.prio; w = i; } }); if (wp > prio) return false; kill(w); }
    const n = o.who || nameOf(id); const e = el();
    e.innerHTML = `${n ? `<span class="n">${typeof n === 'string' ? n : n.zh + ' ' + n.en}</span>` : ''}${zh ? `<span class="z">${zh}</span>` : ''}${en ? `<span class="e">${en}</span>` : ''}`;
    const dur = o.dur || Math.min(7, 2.2 + (en || '').length / 22);
    live.push({ id, e, t: 0, dur, prio, t0: now });
    if (o.shout) AUDIO.play('kiai', u.x, u.y + 1.6, u.z, o.shout === true ? 0.35 : o.shout);
    return true;
  }
  function kill(i) { const l = live[i]; l.e.hidden = true; pool.push(l.e); live.splice(i, 1); }
  function frame(dt) {
    const r = state.renderer; if (!r || !state.sim) { while (live.length) kill(0); return; }
    const cam = r.camera, W = canvas.clientWidth, H = canvas.clientHeight;
    if (cardEl && cardT > 0) { cardT -= dt; if (cardT <= 0) cardEl.classList.remove('on'); }
    commsFrame(dt); bustFrame();
    const edgeUsed = { l: [], r: [] };
    for (let i = live.length - 1; i >= 0; i--) { const l = live[i]; l.t += dt; const u = unit(l.id);
      if (l.t > l.dur || !u || (u.dead && l.t > 0.8)) { kill(i); continue; }
      // the caption rides the drawn body, not the 30 Hz sim position
      const al = r.alpha === undefined ? 1 : Math.max(0, Math.min(1, r.alpha)); v3.set(u.px + (u.x - u.px) * al, u.py + (u.y - u.py) * al + (u.mounted ? 2.9 : 2.15), u.pz + (u.z - u.pz) * al); const d = cam.position.distanceTo(v3); v3.project(cam);
      { const me = state.sim.players[state.localIdx]; if (me && l.id === me.heroId && r.lastMode === 'fp') { // your own voice: a subtitle at the bottom of the screen, not a caption over your own head
        l.e.style.transform = `translate(${(W / 2).toFixed(1)}px, ${(H * 0.8).toFixed(1)}px) translate(-50%, -100%)`; l.e.style.opacity = Math.min(1, l.t * 5, (l.dur - l.t) * 2).toFixed(2); continue; } }
      if (v3.z > 1 || Math.abs(v3.x) > 1.15 || Math.abs(v3.y) > 1.2) {
        if (l.prio >= 2 && layout === 'film') { // a shout you need to hear (help, man down) stays on screen, pinned to the edge toward the speaker
          const cv2 = v3.set(u.x, u.y + 1.8, u.z).applyMatrix4(cam.matrixWorldInverse); const right = cv2.x > 0; const U = edgeUsed[right ? 'r' : 'l'];
          let sy = H * 0.42; while (U.some(y0 => Math.abs(y0 - sy) < 54)) sy += 56; U.push(sy);
          l.e.classList.add('edge', right ? 'r' : 'l'); l.e.classList.remove(right ? 'l' : 'r');
          l.e.style.transform = `translate(${right ? W - 16 : 16}px, ${sy.toFixed(0)}px) translate(${right ? '-100%' : '0'}, -50%)`; l.e.style.opacity = Math.min(1, l.t * 5, (l.dur - l.t) * 2).toFixed(2); continue; }
        l.e.style.opacity = 0; continue; }
      l.e.classList.remove('edge', 'l', 'r');
      const sx = (v3.x + 1) / 2 * W, sy = (1 - v3.y) / 2 * H; const k = Math.max(0.62, Math.min(1.15, 9 / Math.max(3, d)));
      l.e.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`;
      const fade = Math.min(1, l.t * 5, (l.dur - l.t) * 2) * Math.max(0.35, 1 - d / 40); l.e.style.opacity = fade.toFixed(2); }
    if (state.sim.phase === 1 && !state.ended) { pollT -= dt; if (pollT <= 0) { pollT = 0.35; poll(); } }
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // friendly men near the player (not the player), nearest first
  function near(x, z, r, team, not) { const sim = state.sim, out = []; for (const u of sim.teamAlive[team]) { if (u.id === not || u.type === 'horse' || u.camp || u.wounded) continue; const d = Math.hypot(u.x - x, u.z - z); if (d < r) out.push([d, u]); } out.sort((a, b) => a[0] - b[0]); return out.map(q => q[1]); }
  function poll() {
    const sim = state.sim, me = sim.players[state.localIdx]; const h = localHero(); if (!h || h.dead || Input.cmdMode || (sim.mission && sim.mission.camp)) return;
    const now = performance.now() / 1000, team = h.team; const fr = near(h.x, h.z, 24, team, h.id);
    // reloading men call for cover; a man starting to load
    for (const u of fr) { const was = lastSt[u.id]; lastSt[u.id] = u.st; if (u.st === S.ST_RELOAD && was !== S.ST_RELOAD && Math.random() < 0.12 && now > globalT) { globalT = now + 1.4; const L = pick([['裝藥！', 'Loading!'], ['掩護我，裝藥！', 'Cover me — I\'m loading!'], ['藥！快！', 'Powder — quick!']]); say(u.id, L[0], L[1], { cool: 9 }); break; } }
    // cavalry bearing down
    cavT -= 0.35; if (cavT <= 0) { for (const e of sim.teamAlive[1 - team]) { if (!e.mounted || Math.abs(e.hspeed || 0) < 5) continue; const d = Math.hypot(e.x - h.x, e.z - h.z); if (d > 34 || d < 4) continue; const toward = ((h.x - e.x) * Math.sin(e.yaw) + (h.z - e.z) * Math.cos(e.yaw)) / d; if (toward < 0.6) continue;
        const s = fr[0]; if (s) { const spear = s.weapon === 'yari'; say(s.id, spear ? '騎兵！列槍！' : '騎兵！騎兵來了！', spear ? 'Cavalry! Spears up!' : 'Cavalry — horsemen coming!', { prio: 1, shout: true, cool: 5 }); cavT = 12; } break; } }
    // you are bleeding
    const hp = h.hp / h.def.hp; bleedT -= 0.35; if (hp < 0.35 && lastHp >= 0.35 && bleedT <= 0 && fr[0]) { const nm = typeof ZS !== 'undefined' && ZS ? ZS.name.zh : ''; say(fr[0].id, `${nm ? nm + '，' : ''}你流血了！退後！`, 'You\'re bleeding — fall back behind us!', { prio: 1, cool: 20 }); bleedT = 40; } lastHp = hp;
    // a company near you goes forward: its chief calls the men on
    for (const q of sim.squads) { if (!q.alive || q.team !== team) continue; const o = q.order, was = sqOrd[q.id]; sqOrd[q.id] = o; if (was === undefined || was === o || q.owner === state.localIdx) continue; const c = unit(q.unitIds[0]); if (!c || c.dead || Math.hypot(c.x - h.x, c.z - h.z) > 30) continue;
      if (o === S.ORD_CHARGE) say(c.id, '殺！跟我衝！', 'Kill! Follow me in!', { prio: 1, shout: true }); else if (o === S.ORD_MOVE && Math.random() < 0.5) say(c.id, '跟我來！', 'Follow me!', { prio: 0 }); }
    // the wounded call out until someone helps them
    wndT -= 0.35; if (wndT <= 0) { for (const u of sim.teamAlive[team]) { if (!u.wounded || u.helpedBy >= 0) continue; const d = Math.hypot(u.x - h.x, u.z - h.z); if (d > 32) continue; const nm = typeof ZS !== 'undefined' && ZS ? ZS.name.zh : '';
        say(u.id, pick([`${nm ? nm + '哥' : '哥'}，救我……`, '救我……我走不了……', '別丟下我……']), pick(['Help me… I can\'t walk…', 'Don\'t leave me here…', 'Please — help me up…']), { prio: 2, cool: 4, dur: 3.5 }); wndT = 5.5; break; } }
  }
  function event(ev) {
    const sim = state.sim; if (!sim || sim.phase !== 1) return; const h = localHero(); if (!h) return; const team = h.team;
    if (ev.t === 'death') { const u = unit(ev.id); if (!u || u.type === 'horse' || u.team !== team || u.id === h.id || Math.hypot(u.x - h.x, u.z - h.z) > 20) return;
      const w = near(u.x, u.z, 10, team, h.id).filter(v => v.id !== u.id)[0]; if (!w) return; const n = nameOf(u.id);
      say(w.id, n ? `${n.zh}倒了！` : pick(['有人倒了！', '他中了！']), n ? `${n.en} is down!` : pick(['Man down!', 'He\'s hit!']), { prio: n ? 2 : 1, cool: 4 }); }
    else if (ev.t === 'rout') { const q = sim.squads[ev.sq]; if (!q) return; const d = Math.hypot(q.cx - h.x, q.cz - h.z); if (d > 40) return;
      if (q.team === team) { const c = unit(q.unitIds.find(id => !unit(id).dead)); if (c) say(c.id, '撤！快撤！', 'Fall back! Fall back!', { prio: 1, shout: 0.25 }); }
      else { const w = near(h.x, h.z, 18, team, h.id)[0]; if (w) say(w.id, pick(['他們跑了！', '韃子退了！']), pick(['They\'re running!', 'They\'re breaking!']), { prio: 1, shout: 0.3 }); } }
    else if (ev.t === 'zhelp') { const u = unit(ev.id); if (u) say(u.id, '我還能走……別丟下我。', 'I can still walk… don\'t let go of me.', { prio: 2, dur: 3.5 }); }
    else if (ev.t === 'zdown') { const u = unit(ev.id); if (!u || u.team !== team || Math.hypot(u.x - h.x, u.z - h.z) > 26) return; const n = nameOf(u.id);
      say(u.id, pick(['啊——！', '我中了……', '腿……我的腿……']), pick(['Aagh—!', 'I\'m hit…', 'My leg… my leg…']), { prio: 2, cool: 3, dur: 2.5 });
      const w = near(u.x, u.z, 12, team, h.id).filter(v => v.id !== u.id)[0]; if (w) setTimeout(() => say(w.id, n ? `${n.zh}倒了！快扶他！` : '有人倒了！快扶起來！', n ? `${n.en} is down! Get him up!` : 'Man down! Get him up!', { prio: 2, cool: 3 }), 700); }
    else if (ev.t === 'zrevive0') { const r = unit(ev.by); if (r && r.id !== h.id) say(r.id, pick(['我來扶你！', '撐住，我來了！']), pick(['I\'ve got you!', 'Hold on — I\'m here!']), { prio: 1, cool: 4 }); else if (r) say(r.id, '來，抓住我的手！', 'Here — take my hand!', { prio: 2, cool: 1, who: typeof ZS !== 'undefined' && ZS ? ZS.name.zh + ' · you' : 'You' }); }
    else if (ev.t === 'zrevive') { const u = unit(ev.id), r = unit(ev.by); if (r) say(r.id, ev.limp ? '靠著我，走！' : '起來！還能打！', ev.limp ? 'Lean on me — walk!' : 'Up! You can still fight!', { prio: 2, cool: 1, who: r.id === h.id && typeof ZS !== 'undefined' && ZS ? ZS.name.zh + ' · you' : undefined });
      if (u) setTimeout(() => say(u.id, pick(['謝了……', '我欠你一條命。', '好……好，我還站得住。']), pick(['Thanks…', 'I owe you my life.', 'Right… I can still stand.']), { prio: 1, cool: 2 }), 900); }
  }
  // an order travels: you shout it, the chief repeats it down the file, the men answer
  const OL = {};
  function orderChain(type, sqIds, param) {
    const sim = state.sim; if (!sim) return; const h = localHero();
    const T = type === S.ORD_CHARGE ? [['殺！隨我衝！', 'Kill! Charge with me!'], ['聽令——衝！', 'Orders — charge!'], [['殺！', 'Kill!'], ['殺——！', 'Kill!']]]
      : type === S.ORD_HOLD ? [['止！列陣！', 'Halt! Dress the line!'], ['止步——列陣！', 'Halt — form the line!'], [['得令！', 'Yes, sir!'], ['是！', 'Sir!']]]
      : type === S.ORD_FOLLOW ? [['跟我來！', 'Follow me!'], ['跟上！都跟上！', 'Keep up! Everyone keep up!'], [['得令！', 'Yes, sir!'], ['走！', 'Moving!']]]
      : type === S.ORD_FIRE ? (param ? [['自由放銃！', 'Fire at will!'], ['放——！', 'Fire!'], [['得令！', 'Yes, sir!']]] : [['收銃！聽號再放！', 'Hold your fire! Wait for the call!'], ['收銃——！', 'Hold fire!'], [['是！', 'Sir!']]])
      : [['到那裡列陣！', 'Form up over there!'], ['聽令——列陣！', 'Orders — form the line!'], [['得令！', 'Yes, sir!'], ['是！', 'Sir!']]];
    const now = performance.now(); if (OL.t && now - OL.t < 900 && OL.type === type) return; OL.t = now; OL.type = type;
    if (h && !h.dead && !Input.cmdMode) say(h.id, T[0][0], T[0][1], { prio: 2, shout: type === S.ORD_CHARGE ? 0.45 : false, cool: 0.5, who: typeof ZS !== 'undefined' && ZS ? ZS.name.zh + ' · you' : 'You' });
    let heard = false; (sqIds || []).slice(0, 2).forEach((sid, i) => { const q = sim.squads[sid]; if (!q || !q.alive) return;
      const chief = q.unitIds.map(unit).find(u => u && !u.dead && u.ctrl < 0 && !u.wounded); if (!chief) return;
      const L = listener(); if (L && Math.hypot(chief.x - L.x, chief.z - L.z) < 26) heard = true;
      setTimeout(() => say(chief.id, T[1][0], T[1][1], { prio: 2, cool: 0.5 }), 600 + i * 350);
      const men = q.unitIds.map(unit).filter(u => u && !u.dead && u.ctrl < 0 && u !== chief && !u.wounded); for (let k = 0; k < Math.min(2, men.length); k++) { const m = men[Math.floor(Math.random() * men.length)], A = pick(T[2]); setTimeout(() => say(m.id, A[0], A[1], { prio: 1, cool: 0.5, dur: 1.6 }), 1150 + k * 260 + i * 350); } });
    if (!heard && sqIds && sqIds.length) AUDIO.play(type === S.ORD_HOLD ? 'gong' : 'drum', undefined, 0, 0, 0.5);
  }
  const speaking = (id) => live.some(l => l.id === id);
  return { say, frame, event, orderChain, nameOf, speaking, cycle, setLayout, note, pump, prewarm, get layout() { return layout; } };
})();

// ===== 浙兵 · The Zhejiang Company: a story campaign =====
// One mandarin duck team of Yiwu miners, marched north in 1619. Camp at night among named men, then the battles as
// they happened. You cannot change the history; you can only change who comes home.
// each man of the file has his own face and headgear, the same at the fire and in the pass (render-only: u.look)
const ZLOOK = {
  wu: { h: 1.03, hat: 'chief', brows: 'knit', beard: 'longmous', grey: true, scar: true, skin: 0xbf9670 },
  lou: { h: 1.08, hat: 'rattan', brows: 'thick', beard: 'stubble', bulk: true, skin: 0xcd9f78 },
  me: { h: 1.0, hat: 'rattan', brows: 'thin', band: 0xe8e2d0 },
  liu6: { h: 0.86, hat: 'band', brows: 'high', young: true, rosy: true, skin: 0xe8c6a2 },
  luo: { h: 0.95, hat: 'wrap', wrap: 0x2a3a5a, brows: 'high', beard: 'mous', grin: true },
  jin: { h: 0.92, hat: 'straw', brows: 'thick', beard: 'goatee', charm: true, skin: 0xc49a72 },
  ye: { h: 0.98, hat: 'rattan', band: 0xe8e2d0, brows: 'sad', beard: 'mous' },
  wang: { h: 1.14, hat: 'rattanTall', brows: 'thick', bulk: true, rosy: true, bigNose: true },
  fang: { h: 0.97, hat: 'scholar', brows: 'thin', beard: 'goatee', longBeard: true, brush: true, skin: 0xe2c4a0 },
  he: { h: 1.01, hat: 'felt', brows: 'thick', beard: 'full', patch: true, scar: true, skin: 0xb88c66 },
  du: { h: 1.06, hat: 'rattan', plume: 0xd02a1c, brows: 'knit', skin: 0xd8b088 },
  zhu: { h: 1.0, hat: 'cookcap', brows: 'thick', beard: 'full', grey: true, belly: true, apron: true, bigNose: true, skin: 0xd8a07a },
};
function zDress(u, ci) { const r = ZR[ci]; if (!u || !r) return; u.look = Object.assign({ id: r.k }, ZLOOK[r.k] || {}); if (state.renderer) state.renderer.colorFigure(u.id, u); }
// name tags: who a man is, over his head, when you look at him or he is close
const ZTAG = { pool: [], v: null };
function zTags() {
  const sim = state.sim, r = state.renderer, map = ZB ? ZB.map : ZC ? ZC.map : null;
  if (!ZTAG.v) ZTAG.v = new THREE.Vector3(); let n = 0;
  if (sim && r && map && state.screen === 'game' && !state.zheDlg && r.lastMode === 'fp') {
    const cam = r.camera, W = canvas.clientWidth, H = canvas.clientHeight, h = localHero(), al = r.alpha === undefined ? 1 : Math.max(0, Math.min(1, r.alpha));
    for (const uid in map) { const u = sim.units[uid]; if (!u || u.dead || (h && +uid === h.id)) continue; const rr = ((ZB ? ZB.R : ZC && ZC.R) || ZR)[map[uid]]; if (!rr || rr.k === 'me') continue;
      if (typeof SPEECH !== 'undefined' && SPEECH.speaking && SPEECH.speaking(+uid)) continue;
      const v = ZTAG.v.set(u.px + (u.x - u.px) * al, u.py + (u.y - u.py) * al + (u.mounted ? 3.1 : 2.45), u.pz + (u.z - u.pz) * al); const d = cam.position.distanceTo(v); v.project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue; const look = Math.abs(v.x) < 0.07 && Math.abs(v.y) < 0.2 && d < 32;
      if (d > 12 && !look) continue;
      let e = ZTAG.pool[n]; if (!e) { e = document.createElement('div'); e.className = 'ztag'; document.body.appendChild(e); ZTAG.pool[n] = e; } n++;
      const st = u.wounded ? (u.helpedBy >= 0 ? ' · <i class="w">wounded</i>' : ' · <i class="d">down</i>') : u.hp < u.def.hp * 0.5 ? ' · <i class="w">hurt</i>' : '';
      const html = `${rr.zh} <span>${rr.en}</span>${st ? `<small>${st.replace(/^ · /, '')}</small>` : ''}`; if (e._h !== html) { e.innerHTML = html; e._h = html; }
      const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H, k = Math.max(0.7, Math.min(1, 8 / Math.max(4, d)));
      e.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`; e.style.opacity = (look ? 1 : Math.max(0.25, 1 - (d - 4) / 10)).toFixed(2); e.style.display = ''; }
  }
  for (let i = n; i < ZTAG.pool.length; i++) ZTAG.pool[i].style.display = 'none';
}
const ZR = [ // the file, in the order of the duck team's places (YY_ROLE)
  { k: 'wu', zh: '吳老栓', en: 'Wu Laoshuan', role: 'lead', t: 'section chief · 隊長' },
  { k: 'lou', zh: '樓阿根', en: 'Lou Agen', role: 'shield', t: 'rattan shield' },
  { k: 'me', zh: '', en: '', role: 'shield', t: 'rattan shield' },
  { k: 'liu6', zh: '陳小六', en: 'Chen Xiaoliu', role: 'brush', t: 'wolf-brush · 16' },
  { k: 'luo', zh: '駱鐵頭', en: 'Luo Tietou', role: 'brush', t: 'wolf-brush' },
  { k: 'jin', zh: '金阿土', en: 'Jin Atu', role: 'spear', t: 'long spear' },
  { k: 'ye', zh: '葉三', en: 'Ye San', role: 'spear', t: 'long spear' },
  { k: 'wang', zh: '王大牛', en: 'Wang Daniu', role: 'spear', t: 'long spear' },
  { k: 'fang', zh: '方秀才', en: 'Fang the Scholar', role: 'spear', t: 'long spear · the scholar' },
  { k: 'he', zh: '何老虎', en: 'He Laohu', role: 'trident', t: 'trident · veteran of Bozhou' },
  { k: 'du', zh: '杜阿九', en: 'Du Ajiu', role: 'trident', t: 'trident' },
  { k: 'zhu', zh: '朱胖子', en: 'Fatty Zhu', role: 'cook', t: 'cook · 伙夫' },
];
let ZKEY = 'mingZhe';
// other story campaigns (shenji.js …) reuse this machinery: while one is running it sets ZKEY to its own save and fills
// ZHOOK with its own talk / sleep / finish / speaker names / camp chatter
const ZHOOK = {};
let ZS = null, ZB = null, ZC = null; // save, battle mapping, camp mapping
function zLoad() { try { return JSON.parse(localStorage.getItem(ZKEY) || 'null'); } catch (e) { return null; } }
function zSave() { try { localStorage.setItem(ZKEY, JSON.stringify(ZS)); } catch (e) { } }
function zFresh(name) { const s = { v: 1, stage: 'camp0', name: name || { zh: '阿明', en: 'Aming' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, me: 'me' }; for (const r of ZR) { s.alive[r.k] = true; s.bond[r.k] = 0; } return s; }
// the roster in play: another campaign's (ZB.R / ZC.R, set by jin.js or shenji.js) or the Zhejiang file
const zRos = () => (ZB && ZB.R) || (ZC && ZC.R) || ZR;
const zRow = (k) => zRos().find(r => r.k === k);
const zName = (k) => k === 'me' ? ZS.name : zRow(k);

// ---------- cards: exposition between scenes ----------
function zCards(cards, done) {
  let i = 0; let box = $('zheCard'); if (!box) { box = document.createElement('div'); box.id = 'zheCard'; document.body.appendChild(box); }
  const show = () => { const c = cards[i]; box.hidden = false; if (document.pointerLockElement) document.exitPointerLock();
    box.innerHTML = `<div class="in"><h2>${c.title}</h2>${c.year ? `<div class="yr">${c.year}</div>` : ''}${c.html || ''}${(c.p || []).map(p => `<p>${p}</p>`).join('')}${c.zh ? `<p class="zh">${c.zh}</p>` : ''}<div class="nav"><span>${i + 1} / ${cards.length}</span><button type="button" id="zheNext">${c.btn || (i + 1 < cards.length ? 'Next →' : 'Continue →')}</button></div></div>`;
    $('zheNext').onclick = () => { AUDIO.play('ui'); if (c.onNext) c.onNext(); i++; if (i < cards.length) show(); else { box.hidden = true; if (done) done(); } }; };
  show();
}
const INTRO = [
  { title: '撫順 · Fushun', year: 'Spring 1618 · 萬曆四十六年', p: ['In the fourth month of 1618, the Jurchen chieftain Nurhaci proclaimed his Seven Grievances against the Ming before Heaven, and rode on the border town of Fushun. Its commander, Li Yongfang, opened the gates and went over to him.',
    'For two hundred years the Ming had played the Jurchen tribes against one another. Now one man had united them, called his state the Later Jin, and taken a Ming city.'], zh: '天命三年，努爾哈赤以「七大恨」告天，襲陷撫順。' },
  { title: '四路 · Four columns', year: 'Winter 1618–1619', p: ['The court in Beijing answered with new taxes and an army gathered from every province — 470,000 men, the proclamations said, though perhaps a hundred thousand marched. Commissioner Yang Hao divided it into four columns to converge on Nurhaci\'s capital, Hetu Ala, in the mountains.',
    'Du Song from Fushun in the west. Ma Lin from Kaiyuan in the north. Li Rubai from Qinghe in the south. And from Kuandian in the east, through the roughest mountains, the old general Liu Ting — with ten thousand Koreans under Gang Hong-rip marching beside him.'] },
  { title: '浙兵 · The Zhejiang men', year: 'March 1619', p: ['Liu Ting\'s column has a core of southern soldiers: Zhejiang men, many of them from Yiwu, where sixty years ago Qi Jiguang recruited miners and drilled them into the twelve-man <b>mandarin duck team</b> that destroyed the pirates on the coast.',
    'You are one of them: a rattan-shield man in a duck team, three thousand li from home. For weeks the column has marched through snow and empty Jin villages. Tonight it camps in the hills, a few days from Hetu Ala.'],
    html: '<p><label style="font:14px sans-serif">Your name <input id="zName" value="阿明" maxlength="6" style="width:6em;font-size:15px"> <input id="zNameEn" value="Aming" maxlength="14" style="width:8em;font-size:15px"></label></p>',
    onNext: () => { const zh = ($('zName').value || '阿明').trim().slice(0, 6), en = ($('zNameEn').value || 'Aming').trim().slice(0, 14); ZS.name = { zh, en }; zSave(); } },
];

// ---------- dialogue: who says what, the night before and the night after ----------
// each topic: q (what you say), a: lines [zh, en], bond, flag
function zTalk(k, night) {
  if (ZHOOK.talk) return ZHOOK.talk(k, night);
  if (night >= 2) return zTalk2(k, night);
  const S0 = ZS, dead = (x) => !S0.alive[x], lost = ZR.filter(r => !r.ch && r.k !== 'me' && r.k !== k && !S0.alive[r.k]).map(r => r.zh);
  if (night === 0) return ({
    wu: { g: ['睡不著？天一亮就拔營。', 'Can\'t sleep? We break camp at first light.'], t: [
      { q: 'How do we fight tomorrow?', a: [['戚爺爺教的：藤牌在前擋箭，狼筅撩住他，長槍刺，鏜鈀補。十二個人，一條命。', 'The way Marshal Qi taught it. Shields in front to take the arrows, the wolf-brushes tangle the man, the long spears kill him, the tridents finish what\'s left. Twelve men, one life.'], ['你是藤牌手。你一倒，後面的人全露出來。舉盾，別離隊。', 'You\'re a shield. If you go down, everyone behind you is naked. Shield up (right mouse), and never leave the file.']] },
      { q: 'What do you make of General Liu?', a: [['劉總兵打過緬甸、打過朝鮮、打過播州，是條好漢。', 'General Liu has fought in Burma, in Korea, at Bozhou. A real fighter.'], ['可這回給我們的砲少、馬少，路又最難走。聽說他跟楊經略不對付。', 'But this time we got the fewest guns, the fewest horses and the worst road. They say he and Commissioner Yang don\'t get along.']] },
      { q: 'Where did you learn to fight?', bond: 1, a: [['萬曆二十一年，平壤。吳惟忠將軍帶著我們浙兵頭一個登城。', 'Pyongyang, in the twenty-first year of Wanli. General Wu Weizhong\'s Zhejiang men were first onto the walls.'], ['那時候我跟小六一樣大。……照顧好他。', 'I was Xiaoliu\'s age then. ...Look after him.']] }] },
    lou: { g: ['你識字吧？……能不能幫我寫封信回家？', 'You can read, can\'t you? ...Could you write a letter home for me?'], t: [
      { q: 'Write it just the way he says it.', bond: 1, flag: 'letter', a: [['跟我娘說，北邊冷，可我有棉襖。跟我媳婦說……說我很好。', 'Tell my mother it\'s cold up north, but I have a padded coat. Tell my wife... tell her I\'m well.'], ['（他看著你寫完，把信折好，貼身收進懷裡。）', '(He watches you finish, folds the letter, and tucks it inside his coat against his chest.)']] },
      { q: 'Where is home?', a: [['義烏，山裡。我們是挖礦的，打架從小打到大。', 'Yiwu, up in the hills. We were miners — we grew up fighting over the mines.'], ['戚爺爺當年就是看上我們這股狠勁。', 'That\'s what Marshal Qi liked about us. We don\'t back down.']] }] },
    liu6: { g: ['……我沒怕。我就是冷。', '...I\'m not scared. I\'m just cold.'], t: [
      { q: 'How old are you really?', a: [['十六。徵兵的說要十八，我就說我十八。', 'Sixteen. The recruiter said eighteen, so I said eighteen.'], ['我哥死在播州。家裡要這份餉。', 'My brother died at Bozhou. My family needs the pay.']] },
      { q: 'Stay close to me tomorrow.', bond: 1, flag: 'promise', a: [['真的？……好。我用狼筅撩住他們，你就砍。', 'Really? ...All right. I tangle them with the brush, you cut.'], ['（他今晚第一次笑了。）', '(For the first time tonight, he smiles.)']] },
      { q: 'Isn\'t the brush too heavy for you?', a: [['一丈五尺的毛竹，枝杈都留著。重是重，可金人的刀砍不進來。', 'Fifteen feet of bamboo with the branches left on. It\'s heavy, but no Jin blade gets through it.']] }] },
    luo: { g: ['來來來，押一個錢。贏了，明天你替我站前頭。', 'Come on, one coin. Win, and tomorrow you stand in front for me.'], t: [
      { q: 'Roll the dice with him.', bond: 1, a: [['（骰子在火光裡滾。你贏了三個錢，他拍腿大笑。）', '(The dice tumble in the firelight. You win three coins and he slaps his knee laughing.)'], ['好手氣！留著明天用。', 'Lucky hands! Save some of that luck for tomorrow.']] },
      { q: 'Why do they call you Iron Head?', a: [['小時候從礦洞頂上摔下來，頭先著地——石頭碎了。', 'Fell down a mine shaft as a boy, head first. The rock broke.']] }] },
    jin: { g: ['你聽見沒？山裡有東西在叫。', 'Did you hear that? Something is calling in the hills.'], t: [
      { q: 'Wolves, probably.', a: [['狼不怕。我怕的是不叫的東西。', 'Wolves I don\'t mind. It\'s the things that don\'t call.'], ['這一路的寨子都是空的。人都到哪去了？', 'Every village on this road was empty. Where did all the people go?']] },
      { q: 'Here — take my charm.', bond: 1, a: [['……你自己留著吧。——好，好，我收下。多謝。', '...Keep it for yourself. — All right, all right, I\'ll take it. Thank you.']] }] },
    ye: { g: ['我女兒今年該五歲了。', 'My daughter will be five this year.'], t: [
      { q: 'Tell me about her.', bond: 1, a: [['我走的時候，她抱著我的腿不放。我說，等過年我就回來。', 'When I left she held on to my leg and wouldn\'t let go. I told her I\'d be back by New Year.'], ['……那是兩個年以前的事了。', '...That was two New Years ago.']] },
      { q: 'We\'ll be home soon.', a: [['打完這一仗，聽說就能回南了。', 'After this campaign, they say, we go back south.']] }] },
    wang: { g: ['胖子的粥又稀了。這哪有力氣打仗。', 'Fatty\'s gruel is thin again. How\'s a man meant to fight on this?'], t: [
      { q: 'Give him half your millet cake.', bond: 1, a: [['你……你自己吃啊。——好兄弟！明天誰敢碰你，我先捅了他。', 'You... eat it yourself. — Brother! Tomorrow, anyone touches you, I spear him first.']] },
      { q: 'Why is the food so short?', a: [['糧車在後頭，跟砲一起。總兵要快，糧就跟不上。', 'The grain carts are at the back with the guns. The general wants speed, so the grain can\'t keep up.']] }] },
    fang: { g: ['我考了三回才中秀才，中了還是來當兵。', 'Three tries to pass the county examination. Passed, and here I am anyway.'], t: [
      { q: 'Why are we here?', a: [['去年四月，努爾哈赤以「七大恨」告天，陷了撫順。守將李永芳開門降了。', 'Last spring Nurhaci swore his Seven Grievances before Heaven and took Fushun. Its commander, Li Yongfang, opened the gate and surrendered.'], ['朝廷加派遼餉，號稱四十七萬大軍，來討建州。其實能有十萬就不錯了。', 'The court raised a new Liaodong tax and proclaimed an army of four hundred and seventy thousand. If there are a hundred thousand of us, that\'s a lot.']] },
      { q: 'What is the plan?', a: [['楊經略分四路：杜松出撫順，馬林出開原，李如柏出清河，我們劉總兵出寬甸，從東邊進山。', 'Commissioner Yang split us four ways: Du Song from Fushun, Ma Lin from Kaiyuan, Li Rubai from Qinghe, and us, under General Liu, from Kuandian, through the mountains in the east.'], ['四路合擊赫圖阿拉。朝鮮的姜弘立帶一萬多人跟著我們。', 'Four columns closing on Hetu Ala together. Gang Hong-rip\'s ten thousand Koreans march with us.']] },
      { q: 'Do you think we will win?', bond: 1, a: [['四路兵，相隔幾百里，山路難行，消息不通。努爾哈赤若是把兵合在一處，一路一路地打……', 'Four columns, hundreds of li apart, on mountain tracks, with no way to send word to each other. If Nurhaci gathers his whole strength and takes us one column at a time...'], ['……罷了，書生之見。睡吧。', '...Never mind. A bookworm\'s fears. Go to sleep.']] }] },
    he: { g: ['我跟劉總兵打過播州。那時他還不老。', 'I fought at Bozhou with General Liu. He wasn\'t old then.'], t: [
      { q: 'Tell me about Bozhou.', a: [['萬曆二十八年，楊應龍造反，劉總兵帶我們打上海龍囤。人稱「劉大刀」——那口刀，聽說一百二十斤。', 'Twenty-eighth year of Wanli. Yang Yinglong rebelled and General Liu took us up Hailongtun. They call him "Liu Big Sword" — that blade of his, they say, weighs a hundred and twenty jin.'], ['好漢。可好漢最怕人激他。', 'A hero. But a hero is easy to goad.']] },
      { q: 'Teach me something for tomorrow.', bond: 1, a: [['藤牌斜著拿，讓箭滑走，別硬頂。人來了，低頭，用牌撞他，再出刀。', 'Hold the rattan at a slant and let the arrows slide off — don\'t meet them square. When a man comes, keep your head down, bash him with the shield, then cut.']] }] },
    du: { g: ['一顆金人首級，賞銀五十兩。五十兩！', 'One Jin head, fifty taels of silver. Fifty!'], t: [
      { q: 'Heads won\'t help you if you leave the file.', a: [['隊長也這麼說。可不搶，功就是別人的。', 'The chief says that too. But if you don\'t grab, the merit goes to someone else.']] },
      { q: 'What would you do with fifty taels?', bond: 1, a: [['買兩畝水田，娶隔壁的春花。……不許笑。', 'Buy two mu of paddy and marry Chunhua next door. ...Don\'t laugh.']] }] },
    zhu: { g: ['粥有，鹽沒有。趁熱吃。', 'There\'s gruel. No salt. Eat it while it\'s hot.'], t: [
      { q: 'Any news?', a: [['聽說杜總兵那路搶頭功，冒著雪過了渾河。', 'Word is Du Song\'s column is racing for first honours — crossed the Hun River in the snow.'], ['還聽說餉銀又欠了三個月，說打完仗再發。——打完仗，誰還在？', 'And the pay\'s three months behind again. "After the campaign," they say. — And who\'ll be left after the campaign?']] },
      { q: 'Thank you for the gruel.', bond: 1, a: [['（他往你碗裡多舀一勺，又趁沒人看見，塞了塊鹹肉。）', '(He ladles you an extra scoop, and when no one is looking slips in a piece of salt pork.)']] }] },
  })[k];
  // the night after Abudali
  const saved6 = S0.flags.saved6, nm = S0.name.zh;
  const many = lost.length;
  const T = {
    lou: { g: S0.flags.letter ? ['信還在我懷裡。……我自己帶回去。', 'The letter is still against my chest. ...I\'ll carry it home myself.'] : ['我手還在抖。你看。', 'My hands are still shaking. Look.'], t: [{ q: 'We came through.', bond: 1, a: [['我們這些人，進山的時候十二個。', 'There were twelve of us when we went into those hills.'], [`現在${12 - many - 1 > 0 ? '剩' + (12 - many) + '個' : '……'}。`, `Now there are ${12 - many}.`]] }] },
    liu6: { g: saved6 ? ['你沒丟下我。', 'You didn\'t leave me.'] : ['……', '...'], t: [{ q: 'How is the leg?', bond: 1, a: saved6 ? [['骨頭沒斷。何老虎說，養一個月就好。', 'The bone isn\'t broken. He Laohu says a month and it\'ll mend.'], [`${nm}哥……以後我還跟著你。`, `Brother ${S0.name.en}... I\'m staying with you from now on.`]] : [['疼。', 'It hurts.']] }] },
    luo: { g: dead('liu6') || !S0.alive.liu6 ? ['小六那個傻子……還欠我兩個錢。', 'That fool Xiaoliu... he still owes me two coins.'] : ['今天骰子不靈了。', 'The dice weren\'t with us today.'], t: [{ q: 'Play a round?', a: [['（他把骰子攥在手裡，沒有擲。）', '(He closes his fist around the dice, and doesn\'t throw them.)']] }] },
    jin: { g: ['我就說山裡有東西。', 'I told you there was something in those hills.'], t: [{ q: 'You were right.', a: [['西嶺上全是旗。他們等了我們好幾天。', 'The whole west ridge was banners. They\'d been waiting for us for days.']] }] },
    ye: { g: ['我還能回去。我還能回去看她。', 'I can still go back. I can still go back and see her.'], t: [{ q: 'You will.', bond: 1, a: [['你也要回去。我們一起回去。', 'You too. We\'ll go back together.']] }] },
    wang: { g: ['今天我捅了四個。……我不想再數了。', 'Four, today. ...I don\'t want to count any more.'], t: [{ q: 'Eat something.', a: [['吃不下。頭一回吃不下。', 'Can\'t. First time in my life I can\'t.']] }] },
    fang: { g: ['那個信使，是金人假扮的。杜總兵好幾天前就死了。', 'That messenger was a Jin agent in our colours. Du Song had been dead for days.'], t: [
      { q: 'What happened to the other columns?', a: [['杜松在薩爾滸全軍覆沒。馬林在北邊也敗了。只有李如柏被召回，逃了出來。', 'Du Song\'s column was destroyed at Sarhu. Ma Lin was beaten in the north. Only Li Rubai, called back in time, got out.'], ['努爾哈赤說：「憑爾幾路來，我只一路去。」——他一路一路地吃掉了我們。', 'They say Nurhaci put it this way: "However many roads you come by, I go by one." He ate us one column at a time.']] },
      { q: 'And the Koreans?', a: [['姜弘立被圍在富察，凍餓交加，正在跟金人議和。', 'Gang Hong-rip is surrounded, freezing and starving. He is talking terms with the Jin.'], ['明天，我們只能自己走出這片山。', 'Tomorrow we walk out of these mountains on our own.']] }] },
    he: { g: ['劉總兵是往陣裡衝死的。到最後還是條好漢。', 'General Liu died charging into them. A hero to the last.'], t: [{ q: 'And Chief Wu?', a: [['吳老栓……他把隊交給你了。', 'Wu Laoshuan... he handed the file to you.'], ['往後，我們聽你的。', 'From now on, we follow you.']] }] },
    du: { g: ['一顆首級都沒拿到。', 'Not one head.'], t: [{ q: 'You are alive.', bond: 1, a: [['……是。活著就好。春花還等著。', '...Yes. Alive is enough. Chunhua is waiting.']] }] },
    zhu: { g: ['我給吳隊長留了一碗……忘了。', 'I kept a bowl back for Chief Wu... I forgot.'], t: [{ q: 'Sit with us.', bond: 1, a: [['（他放下勺子，在火邊坐下，很久沒說話。）', '(He puts down the ladle and sits by the fire, and says nothing for a long while.)']] }] },
  }[k];
  if (T && !saved6 && k === 'liu6') T.g = ['……', '...'];
  return T;
}

// ---------- camp ----------
const ZCAMP = { fires: [[0, 0], [8, -5]], tents: [[-10, 4, 1.7, 2.5, 2.1], [-4.5, 10.5, 1.7, 2.5, 2.1], [4.5, 10.5, 1.7, 2.5, 2.1], [10, 4, 1.7, 2.5, 2.1]],
  props: [['pot', 8, -5, 0], ['banner', -3, -7.5, 0.3, '浙'], ['rack', -7.5, -3.5, 0.9], ['wagon', 13, -11, 0.5], ['shields', 3.5, -7.2, 0.2], ['log', 0, 2.9, 0], ['log', -2.6, -1.4, 1.1], ['log', 2.7, -1.2, -1.1]],
  // where each man of the file sits or stands: [x, z, pose] (looking at the fire unless noted)
  spots: { wu: [-2.6, -5.6, 'stand'], lou: [-2.5, -0.9, 'squat'], liu6: [-0.9, 2.4, 'squat'], luo: [1.0, 2.4, 'squat'], jin: [2.6, -0.6, 'squat'], ye: [-1.9, 1.6, 'squat'], wang: [7.0, -3.4, 'stand'], fang: [2.1, 1.7, 'squat'], he: [-6.8, -2.6, 'stand'], du: [3.1, -2.4, 'stand'], zhu: [8.9, -3.7, 'stand'] } };
function zCampCfg(night) {
  const npcs = [], beds = [], map = {};
  ZR.forEach((r, i) => { if (r.ch) return; const a = -0.5 + (i / 12) * Math.PI * 1.55 + Math.PI * 0.55; const bx = Math.sin(a) * 6.3, bz = Math.cos(a) * 6.3; const alive = ZS.alive[r.k];
    beds.push([+bx.toFixed(2), +bz.toFixed(2), +(a + Math.PI).toFixed(3), !alive]);
    if (r.k === 'me' || r.k === ZS.me || !alive) return; const sp = ZCAMP.spots[r.k]; const [x, z] = sp; const tx = r.k === 'zhu' || r.k === 'wang' ? 8 : 0, tz = r.k === 'zhu' || r.k === 'wang' ? -5 : 0;
    npcs.push({ role: r.role, x, z, yaw: +Math.atan2(tx - x, tz - z).toFixed(3), ci: i, pose: night === 1 && r.k !== 'zhu' ? 'squat' : sp[2] }); });
  const mb = beds[2]; ZC = { bed: [mb[0], mb[1]] };
  return { fires: ZCAMP.fires, tents: ZCAMP.tents, props: ZCAMP.props, bedrolls: beds, npcs, me: { x: 0.4, z: -3.4, yaw: 0, role: 'shield' } };
}
function zStart(scene) {
  if (/^(ch2|camp2|battle2|camp3)$/.test(scene)) return zStart2(scene);
  if (/^(kai|battlek)$/.test(scene)) return zStartK(scene);
  ZS = zLoad(); if (!ZS) { ZS = zFresh(); }
  $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, yyRole: 'shield', connected: true }];
  if (scene === 'camp0' || scene === 'camp1') {
    const night = scene === 'camp1' ? 1 : 0; const camp = zCampCfg(night);
    startGame({ seed, battle: 'zcamp', mode: 'campaign', mission: 'zcamp', camp, players: pl }, 0, null, 1);
    ZC.night = night; ZC.map = {}; for (const u of state.sim.units) if (u.camp) { ZC.map[u.id] = u.ci; zDress(u, u.ci); } { const me = state.sim.units[state.sim.players[0].heroId]; zDress(me, 2); } ZC.chatT = 6;
    MUSIC.play('menu'); MUSIC.setIntensity(0.15); AUDIO.setFire(0.6); $('army').hidden = true;
    setTimeout(() => storyCard(night ? 'The survivors make camp in a ravine south of the pass. Nobody sings. Walk among them (E to talk), and when you are ready, lie down on your bedroll.' : 'The night before. Walk among your file and talk with them (look at a man and press E). When you are ready, lie down on your bedroll (E) to sleep until the march.', night ? '夜 · The night after' : '營 · Camp, April 1619'), 900);
  } else if (scene === 'battle1') {
    startGame({ seed, battle: 'abudali', mode: 'campaign', mission: 'abudali', players: pl }, 0, null, 1);
    const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq]; ZB = { map: {}, sq: q.id, first: me.heroId, cur: 'me', fell: false };
    const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = 2;
    ZR.forEach((r, i) => { if (r.k === 'me' || r.ch) return; const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role === r.role); if (id !== undefined) { used[id] = 1; ZB.map[id] = i; } });
    for (const uid in ZB.map) zDress(sim.units[uid], ZB.map[uid]);
    setTimeout(() => storyCard('Dawn, April 1619. The column breaks camp and climbs into the valleys toward Hetu Ala. Stay with your duck team: the chief calls the drill. Shield up with the right mouse button.', '阿布達里岡 · Abudali Pass'), 700);
  }
}
function zGo(scene) { try { localStorage.setItem('mingZheGo', scene); } catch (e) { } location.reload(); }
// what you are looking at in camp
function zLook() {
  const sim = state.sim, h = localHero(); if (!h || h.dead || !ZC) return null;
  if (Math.hypot(h.x - ZC.bed[0], h.z - ZC.bed[1]) < 1.9) return { bed: true };
  let best = null, bd = 0.5; const fx = Math.sin(Input.yaw), fz = Math.cos(Input.yaw);
  for (const u of sim.units) { if (!u.camp) continue; const dx = u.x - h.x, dz = u.z - h.z, d = Math.hypot(dx, dz); if (d > 3.4 || d < 0.3) continue; const off = 1 - (dx * fx + dz * fz) / d; if (off < bd) { bd = off; best = u; } }
  return best ? { u: best, k: zRos()[best.ci].k } : null;
}
function zheKeyE() {
  if (!ZC || !state.sim || !state.sim.mission || !state.sim.mission.camp) return false;
  if (state.zheDlg) return true; const t = zLook(); if (!t) return true;
  if (t.bed) { zSleep(); return true; }
  zDialog(t.k, t.u); return true;
}
function zSleep() {
  if (ZHOOK.sleep) return ZHOOK.sleep();
  if (ZC.night >= 2) return zSleep2();
  if (ZC.night === 0) { ZS.stage = 'battle1'; zSave(); zCards([{ title: '黎明 · Dawn', year: 'April 1619', p: ['Drums before light. The column breaks camp and climbs on into the valleys. Ahead, somewhere, is Hetu Ala; behind, the guns and the grain carts are already falling back along the track.', 'Chief Wu walks down the file, tugging straps and checking match-cord. "Twelve men," he says. "One life."'], btn: 'March →' }], () => zGo('battle1')); }
  else { ZS.stage = 'end1'; zSave(); zCards([{ title: '第一章終 · End of Chapter One', year: 'Abudali Pass, April 1619', p: [`${ZR.filter(r => r.k !== 'me' && ZS.alive[r.k]).length} of your file sleep around the embers. In the morning you will walk south out of the mountains with the remnants of Liu Ting's army.`, 'What is left of the southern troops is spread among the northern garrisons. Your file is sent to Tieling, a walled town on the road between Shenyang and Kaiyuan.'], zh: '間章 · 開原道 · The Kaiyuan road, summer 1619', btn: 'Summer →' }], () => { zGo('kai'); }); }
}
function zDialog(k, u) {
  const sim = state.sim, D = zTalk(k, ZC.night); if (!D) return; const r = zRow(k); state.zheDlg = { k };
  if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; $('pause').hidden = true;
  let box = $('zheDlg'); if (!box) { box = document.createElement('div'); box.id = 'zheDlg'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const h = localHero(); if (h && u) { Input.yaw = Math.atan2(u.x - h.x, u.z - h.z); }
  const render = (lines, topics) => {
    box.hidden = false; const L = lines[lines.length - 1];
    box.innerHTML = `<div class="who">${r.zh} ${r.en}<small>${r.t}${ZS.bond[k] > 0 ? ' · ' + '♥'.repeat(Math.min(3, ZS.bond[k])) : ''}</small></div>${lines.map(l => `<div class="zh">${l[0]}</div><div class="en">${l[1]}</div>`).join('')}<div class="ch">${topics.map((t, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd>${t.q}</button>`).join('')}<button type="button" data-i="-1"><kbd>Esc</kbd>Leave</button></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => choose(+b.dataset.i));
    state.zheDlg.topics = topics; };
  const key = (t) => `${ZC.night}:${k}:${t.q}`;
  const open = () => D.t.filter(t => !ZS.talked[key(t)]);
  const choose = (i) => { AUDIO.play('ui');
    if (i < 0) { close(); return; } const t = state.zheDlg.topics[i]; if (!t) return; ZS.talked[key(t)] = 1; if (t.bond) ZS.bond[k] = (ZS.bond[k] || 0) + t.bond; if (t.flag) ZS.flags[t.flag] = true; zSave();
    render([[`「${t.q}」`, ''], ...t.a].filter(x => x[0]), open()); };
  const close = () => { box.hidden = true; state.zheDlg = null; requestLock(); };
  state.zheDlg.choose = choose; state.zheDlg.close = close;
  const rest = open(); render([D.g], rest.length ? rest : []);
}
document.addEventListener('keydown', (e) => { // the dialogue panel takes the keys while it is open
  const d = state.zheDlg; if (!d || state.screen !== 'game') return;
  if (e.code === 'Escape' || e.code === 'KeyE') { d.close(); e.stopImmediatePropagation(); e.preventDefault(); return; }
  const m = /^Digit([1-9])$/.exec(e.code); if (m) { d.choose(+m[1] - 1); e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (/^Key[WASD]$/.test(e.code)) { e.stopImmediatePropagation(); }
}, true);

// ---------- in battle ----------
function zheSay(ev) { // scripted lines come out of a man's mouth when you are near enough to hear him; otherwise by runner
  const sim = state.sim, h = localHero(); if (!ZB) return false;
  const W = { liu: ['劉綎', 'General Liu Ting'], chief: ['吳老栓', 'Chief Wu'], fang: ['方秀才', 'Fang the Scholar'], lookout: ['', 'Lookout'], soldier: ['', 'A soldier'], rider: ['', 'A rider in Ming colours'], qi: ['戚金', 'General Qi Jin'], chen: ['陳策', 'General Chen Ce'], sichuan: ['周敦吉', 'Zhou Dunji of the White Poles'], col: ['', 'The column officer'], folk: ['', 'A woman from Kaiyuan'] }[ev.who] || (ZHOOK.who && ZHOOK.who[ev.who]) || ['', ev.who];
  let id = -1; const ZRR = zRos(), zi = ZRR.findIndex(r => r.k === ev.who && r.k !== 'me' && !r.guest);
  if (zi >= 0) { for (const uid in ZB.map) if (ZB.map[uid] === zi && sim.units[uid] && !sim.units[uid].dead && !sim.units[uid].wounded) id = +uid; if (id >= 0) { W[0] = ZRR[zi].zh; W[1] = ZRR[zi].en; } else { W[0] = ''; W[1] = 'A soldier'; } }
  else if (ev.who === 'qi' && sim.mg.zhe && sim.mission.ch === 2) id = sim.players[sim.mg.zhe.p].heroId;
  else if (ev.who === 'liu') { const g = sim.mg.liu; id = g ? sim.players[g.p].heroId : -1; }
  else if (sim.mg[ev.who]) { const g = sim.mg[ev.who]; id = sim.players[g.p].heroId; }
  else if (ev.who === 'chief' || ev.who === 'fang') { const want = ev.who === 'chief' ? 0 : 8; for (const uid in ZB.map) if (ZB.map[uid] === want) id = +uid; }
  if (id >= 0 && sim.units[id] && sim.units[id].dead) id = -1;
  if (id < 0 && h) { const q = sim.squads[ZB.sq]; const cand = sim.teamAlive[h.team].filter(u => u.id !== h.id && !u.wounded && u.type !== 'horse' && Math.hypot(u.x - h.x, u.z - h.z) < 22 && (ev.who !== 'rider' || !q.unitIds.includes(u.id))); if (cand.length) id = cand[Math.floor(Math.random() * cand.length)].id; }
  const ok = id >= 0 && SPEECH.say(id, ev.zh, ev.text, { prio: 3, loud: true, radio: true, who: W[0] ? `${W[0]} ${W[1]}` : W[1], dur: Math.min(8, 3 + ev.text.length / 20), shout: ev.who === 'liu' || ev.who === 'lookout' ? 0.3 : false });
  if (!ok && typeof radio === 'function') radio(W[0] ? `${W[0]} ${W[1]}` : W[1], `${ev.zh ? ev.zh + '  ' : ''}${ev.text}`);
  return true;
}
function zheEvent(ev) {
  const sim = state.sim; if (!ZB || !sim || !sim.mission || !sim.mission.soldier) return; const me = sim.players[state.localIdx];
  if (ZHOOK.event) ZHOOK.event(ev);
  if (ev.t === 'mkill' && ev.gid === 'zhe' && ZB.ch2 && !ZB.chK) { MUSIC.stop(); setTimeout(() => { if (state.sim === sim && !state.ended) { MUSIC.play('battle'); MUSIC.setIntensity(0.35); } }, 12000); } // Qi Jin falls: the war drums stop, and for a while there is only the fighting
  if (ev.t === 'zpromote' && ev.p === state.localIdx && ZB.ch2) { state.fpSel = null; banner('你領隊 · Your file', 'You lead the file: F follow me / H halt / C charge / Z form up where you look', 6); }
  else if (ev.t === 'zpromote' && ev.p === state.localIdx) { state.fpSel = null; const q = sim.squads[ev.sq]; const w = q.unitIds.map(id => sim.units[id]).find(u => !u.dead && u.ctrl < 0 && !u.wounded);
    if (w) setTimeout(() => SPEECH.say(w.id, `隊長沒了！${ZS.name.zh}，你說怎麼走？`, `The chief is dead! ${ZS.name.en}, you're senior now — what do we do?`, { prio: 3, dur: 5 }), 1600);
    banner('你領隊 · The file is yours', 'Chief Wu is dead. F follow me / H halt / C charge / Z form up where you look', 6); }
  else if (ev.t === 'zwound' && ev.p === state.localIdx) { ZB.wounded = ev.id; const u = sim.units[ev.id]; const n = SPEECH.nameOf(ev.id);
    SPEECH.say(ev.id, '我的腿……走不了了！', 'My leg... I can\'t walk!', { prio: 3, dur: 4 }); toast(`${n ? n.zh + ' ' + n.en : 'A man of your file'} is hit and can't walk. Get to him and press E to get him up`); }
  else if (ev.t === 'zhelp' && ev.id === ZB.wounded) { ZS.flags[ZB.chK ? 'helpedK' : ZB.ch2 ? 'helped2' : 'helped6'] = true; feed(`You get ${(SPEECH.nameOf(ev.id) || { en: 'him' }).en}'s arm over your shoulder`, true); }
  else if (ev.t === 'zcarry' && ev.p === state.localIdx) { const k = ZB.map[ev.id]; ZB.fell = true; const prev = ZB.cur; if (prev && ZS.alive[prev] !== false) { ZB.deadMe = ZB.deadMe || []; ZB.deadMe.push(prev); }
    ZB.cur = k !== undefined ? zRos()[k].k : 'stranger'; const n = SPEECH.nameOf(ev.id); const h = sim.units[ev.id]; if (h) { Input.yaw = h.yaw; Input.pitch = 0; }
    toast(n ? `You fall. The fight goes on — you are ${n.zh} ${n.en} now` : 'You fall. The fight goes on — you are another man of the column now'); }
}
function zheObjLines() {
  const sim = state.sim; if (!ZB) return ''; const h = localHero(); let n = 0, all = 0;
  for (const uid in ZB.map) { const u = sim.units[uid]; if (+uid === (h && h.id)) continue; all++; if (!u.dead && h && Math.hypot(u.x - h.x, u.z - h.z) < 24) n++; }
  let s = `<div class="ob"><i>伍</i><span>Your file with you: ${n} of ${all}</span></div>`;
  if (ZB.wounded !== undefined) { const u = sim.units[ZB.wounded]; s += `<div class="ob${u.helpedBy >= 0 ? ' done' : ''}"><i>!</i><span>${(() => { const wn = (SPEECH.nameOf(ZB.wounded) || { en: 'The wounded man' }).en; return u.dead ? wn + ' is dead' : u.helpedBy >= 0 ? wn + ' is on his feet' : 'Get ' + wn + ' up (E beside him)'; })()}</span></div>`; }
  return s;
}
function zheFinish(winner) {
  if (ZHOOK.finish) return ZHOOK.finish(winner);
  if (ZB && state.sim.mission && state.sim.mission.ch === 2) return zheFinish2(winner);
  if (ZB && state.sim.mission && state.sim.mission.ch === 'k') return zheFinishK(winner);
  const sim = state.sim, h = localHero(); if (!ZB) return; const M = sim.mission, z = sim.missionZone('mouth'); const won = winner === M.side;
  const fate = {}; const near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const k = ZR[ZB.map[uid]].k; const u = sim.units[uid]; if (u.dead) { fate[k] = 'dead'; continue; }
    const out = (near(u, won ? 26 : 12) || (z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10)) && !(u.wounded && u.helpedBy < 0 && !near(u, 4)); fate[k] = out ? 'out' : 'lost'; }
  for (const k of ZB.deadMe || []) fate[k] = 'dead';
  if (fate.me === undefined) fate.me = h && !h.dead ? 'out' : 'dead';
  // you go on as whoever you became
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger' && fate.me === 'dead') { const nk = ZB.cur; ZS.me = nk; ZS.oldName = ZS.name; ZS.name = { zh: zRow(nk).zh, en: zRow(nk).en }; }
  for (const r of ZR) { if (r.ch) continue; const f = fate[r.k] || 'lost'; ZS.fate[r.k] = f; ZS.alive[r.k] = f === 'out'; }
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger') ZS.alive[ZB.cur] = !!(h && !h.dead);
  ZS.alive.me = fate.me === 'out' || (ZB.cur && ZB.cur !== 'me'); // you live on in whoever carried on
  ZS.flags.saved6 = ZS.alive.liu6 && !!ZS.flags.helped6; ZS.stage = 'camp1'; zSave();
  const li = ZR.filter(r => !r.ch).map(r => { const f = ZS.fate[r.k] || 'lost'; const nm = r.k === 'me' ? `${ZS.name.zh} ${ZS.name.en} (you)` : `${r.zh} ${r.en}`; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${nm} — ${f === 'out' ? 'came out of the pass' : f === 'dead' ? 'killed' : 'missing in the valley'}</li>`; }).join('');
  const outN = ZR.filter(r => ZS.fate[r.k] === 'out').length;
  $('resultTitle').textContent = won ? '出 · Out of the pass' : '陷 · Cut off'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? 'You reached the south gorge.' : 'The valley closed behind you, but a few of you crawled out after dark.'} ${outN} of twelve came out.`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; zCards([
    { title: '阿布達里岡 · What happened', year: 'April 1619', p: ['Liu Ting\'s column had been lured. Jin agents dressed as Ming soldiers came to him with word from Du Song urging him to hurry. Du Song was already dead: his column had been destroyed at Sarhu days before. Hurrying, the column strung out along the valleys.',
      'At Abudali Pass, less than sixty li from Hetu Ala, Daišan\'s banners struck the head of the column, and the Ming held. Then Hong Taiji\'s banners came down from the heights into its side, and the column broke. Liu Ting died fighting.',
      'About three thousand Zhejiang soldiers were killed. A few days later the Korean army under Gang Hong-rip, cut off and starving, surrendered to the Jin. Of Yang Hao\'s four columns only Li Rubai\'s, recalled in time, came home. Nurhaci had destroyed the others one at a time.'], zh: '憑爾幾路來，我只一路去。— attributed to Nurhaci' },
    { title: '伍 · Your file', year: `${outN} of twelve`, html: `<ul>${li}</ul>`, p: [ZS.flags.saved6 ? 'You did not leave Chen Xiaoliu in the valley.' : ZS.alive.liu6 ? '' : 'Chen Xiaoliu did not come out of the valley.'].filter(Boolean), btn: 'Night falls →' },
  ], () => zGo('camp1')); };
}
// ---------- the file at a glance (story battles): twelve live heads, top right, each showing how the man is doing ----------
// fighting · hurt (amber) · DOWN, needs help (pulsing red ✚, bleed-out bar) · on his feet with help (green 扶) · dead (grey, ✕)
// · missing. The grid follows the roster, not your body, so it stays right when you carry on as another man.
const ZG = { el: null, cells: {}, t: 0 };
function zGrid(dt) {
  const sim = state.sim, on = !!(sim && sim.mission && sim.mission.soldier && ZB && !state.ended);
  document.body.classList.toggle('zgrid', on);
  if (!on) { if (ZG.el) ZG.el.hidden = true; return; }
  if (!ZG.el) { ZG.el = document.createElement('div'); ZG.el.id = 'zgrid'; document.body.appendChild(ZG.el); }
  ZG.el.hidden = false; ZG.t -= dt; if (ZG.t > 0) return; ZG.t = 0.2;
  const h = localHero(), ids = Object.keys(ZB.map).map(Number).sort((a, b) => ZB.map[a] - ZB.map[b]);
  for (const uid of ids) {
    const rr = (ZB.R || ZR)[ZB.map[uid]]; if (!rr) continue; let c = ZG.cells[uid]; // ZB.R: another campaign's roster (jin.js, shenji.js)
    if (!c) { c = document.createElement('div'); c.className = 'zc'; c.innerHTML = '<i></i><em></em><b></b><u><s></s></u>'; ZG.el.appendChild(c); ZG.cells[uid] = c; c.children[2].textContent = rr.zh; c.title = rr.en; }
    const u = sim.units[uid], f = c.firstChild;
    if (!u) { if (f._uid !== -1) setFaceZ(f, null); c.className = 'zc miss'; c.children[1].textContent = '?'; continue; }
    if (f._uid !== uid) setFaceZ(f, u);
    const st = u.dead ? 'dead' : u.downed ? (u.reviveBy >= 0 ? 'rise' : 'down') : u.wounded ? 'help' : u.hp < u.def.hp * 0.5 ? 'hurt' : 'ok';
    c.className = 'zc ' + st + (h && uid === h.id ? ' you' : '') + (SPEECH.speaking(uid) ? ' talk' : '');
    c.children[1].textContent = st === 'dead' ? '✕' : st === 'down' ? '✚' : st === 'rise' ? '↑' : st === 'help' ? '扶' : h && uid === h.id ? '你' : '';
    const bar = c.children[3]; bar.style.display = u.downed ? '' : 'none'; if (u.downed) bar.firstChild.style.width = Math.max(0, Math.min(100, (u.bleed || 0) / (30 * (u.zfile ? 45 : 30)) * 100)).toFixed(0) + '%';
  }
}
function setFaceZ(el, u) { el.classList.add('facebox'); el._uid = u ? u.id : -1; el.classList.toggle('none', !u); el.classList.toggle('live', !!u); el._t0 = -1e9; }
// the current objective in a handful of words (phase.goal when the mission gives one, else the first sentence of its text), with the distance when it is a place
function zGoal() {
  const sim = state.sim, M = sim.mission, P = M && M.phases[Math.max(0, sim.mv.ph)]; if (!P) return '';
  let g = P.goal || (P.text || '').split(/(?<=[.!?])\s/)[0]; if (g.length > 70) g = g.slice(0, 67).replace(/\s\S*$/, '') + '…';
  const z = P.obj && (P.obj.extract || P.obj.reach) ? sim.missionZone(P.obj.extract || P.obj.reach) : null, h = localHero();
  if (z && h && !h.dead) g += ` · ${Math.round(Math.hypot(z.x - h.x, z.z - h.z))} m`;
  // a phase you only have to live through shows how long is left, so nobody thinks he must kill every banner
  const sv = P.obj && (P.obj.survive || (P.obj.all && (P.obj.all.find(o => o.survive) || {}).survive));
  if (sv) { const left = Math.max(0, Math.ceil(sv - (sim.tick - sim.mv.t0) / 30)); if (left > 0) g += ` · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
  return g;
}
function zheHUD(dt) {
  zTags(); zGrid(dt);
  const sim = state.sim; let pr = $('zhePrompt');
  if (sim && sim.mission && sim.mission.camp) $('status').style.visibility = 'hidden';
  if (!sim || !sim.mission || !sim.mission.camp || !ZC || state.zheDlg) { if (pr) pr.hidden = true; return; }
  if (!pr) { pr = document.createElement('div'); pr.id = 'zhePrompt'; document.body.appendChild(pr); }
  const t = zLook(); pr.hidden = !t; if (t) pr.innerHTML = t.bed ? '<kbd>E</kbd>Lie down on your bedroll' + (ZC.night ? '' : ' — march at dawn') : `<kbd>E</kbd>Talk to ${zRos()[t.u.ci].zh} ${zRos()[t.u.ci].en}`;
  // the camp murmurs: men talk to each other when you pass
  ZC.chatT -= dt; if (ZC.chatT <= 0) { ZC.chatT = 7 + Math.random() * 6; const h = localHero(); if (!h) return; const near = sim.units.filter(u => u.camp && Math.hypot(u.x - h.x, u.z - h.z) < 14); if (!near.length) return; const u = near[Math.floor(Math.random() * near.length)];
    const P0 = [['這鬼地方，四月還下雪。', 'Snow in April. What a place.'], ['明天走多少里？', 'How many li tomorrow?'], ['聽說赫圖阿拉的城是木頭的。', 'They say the walls of Hetu Ala are made of logs.'], ['腳上的凍瘡又裂了。', 'My chilblains have split open again.'], ['誰還有菸葉？', 'Anyone got tobacco?'], ['義烏這時候該插秧了。', 'Back in Yiwu they\'ll be planting the rice now.']];
    const P1 = [['……', '...'], ['火別讓它滅了。', 'Don\'t let the fire go out.'], ['明天往南走。', 'Tomorrow we go south.'], ['我閉上眼睛就看見西嶺上的旗。', 'When I close my eyes I see the banners on the west ridge.']];
    const PL = ZHOOK.chatter ? ZHOOK.chatter(ZC.night) : ZC.night === 2 ? ZP2 : ZC.night === 3 ? ZP3 : ZC.night ? P1 : P0; const L = PL[Math.floor(Math.random() * PL.length)]; SPEECH.say(u.id, L[0], L[1], { prio: 0, cool: 10 }); }
}
function zMenu() {
  const s = zLoad(); const b = $('btnZhe'), nb = $('btnZheNew'); if (!b) return;
  const cont = s && s.stage && s.stage !== 'end2'; b.textContent = cont ? 'Continue' : s ? 'Play again' : 'Begin'; nb.hidden = !cont;
  const begin = () => { AUDIO.init(); AUDIO.play('ui'); ZS = zFresh(); zSave(); zCards(INTRO, () => { ZS.stage = 'camp0'; zSave(); zStart('camp0'); }); };
  b.onclick = () => { if (cont) { AUDIO.init(); AUDIO.play('ui'); zStart(s.stage === 'after1' ? 'camp1' : s.stage === 'end1' ? 'kai' : s.stage === 'endk' ? 'ch2' : s.stage); } else begin(); };
  nb.onclick = begin;
}
zMenu();
{ let go = null; try { go = localStorage.getItem('mingZheGo'); localStorage.removeItem('mingZheGo'); } catch (e) { } if (go) setTimeout(() => zStart(go), 60); }

// ===================== 間章 · Interlude: the Kaiyuan road, summer 1619 =====================
// Three months after Abudali. The survivors serve in the Tieling garrison; Kaiyuan is attacked in the rain and a relief
// column goes north from Tieling and is turned back on the road. Then cards: Kaiyuan, Tieling, Xiong Tingbi.
function zFileK() { return ZR.filter(r => !r.ch && r.k !== 'wu' && r.k !== 'me' && r.k !== ZS.me && ZS.alive[r.k]); }
function zStartK(scene) {
  ZS = zLoad(); if (!ZS) { ZS = zFresh(); }
  $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  if (scene === 'kai') { const n = zFileK().length;
    zCards([
      { title: '鐵嶺 · Tieling', year: 'Summer 1619 · 萬曆四十七年', p: ['Three months after Sarhu, the Ming hold on the north is two walled towns and the road between them: Tieling, and a day\'s march beyond it, Kaiyuan, the old gate to the Mongol and Jurchen country.',
        'In the sixth month Nurhaci comes for Kaiyuan, in rain that does not stop. Word reaches Tieling that the town is under attack, and a relief column is made ready to march.'], zh: '萬曆四十七年六月，努爾哈赤冒雨攻開原。' },
      { title: '伍 · Your file', year: n ? `${n + 1} men` : 'You alone', p: [n ? `${n} of your file came out of the mountains with you. Chief Wu is dead; the file is yours. When you give an order you hear his voice in it.` : 'None of your file came out of the mountains with you. The garrison has put you over a file of strangers.', 'F follow me · H halt · C charge · Z form up where you look.'], btn: 'March →' },
    ], () => { ZS.stage = 'battlek'; zSave(); zStartK('battlek'); }); return; }
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, yyRole: 'lead', connected: true }];
  startGame({ seed, battle: 'field', mode: 'campaign', mission: 'kaiyuan', players: pl }, 0, null, 1);
  const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq]; const meIdx = ZR.findIndex(r => r.k === (ZS.me || 'me'));
  ZB = { map: {}, sq: q.id, first: me.heroId, cur: ZS.me || 'me', fell: false, ch2: true, chK: true };
  const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = meIdx;
  const left = []; for (const r of zFileK()) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role === r.role); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } else left.push(r); }
  for (const r of left) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role !== 'lead'); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } }
  for (const uid in ZB.map) zDress(sim.units[uid], ZB.map[uid]);
  setTimeout(() => storyCard('Summer 1619. Rain on the Kaiyuan road. Your file marches north with the relief column from Tieling. Wet match-cord fails: in this rain trust the spear more than the gun.', '開原道 · The Kaiyuan road'), 700);
}
function zheFinishK(winner) {
  const sim = state.sim, h = localHero(); const M = sim.mission, z = sim.missionZone('tieling'); const won = winner === M.side;
  const fate = {}; const near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const r = ZR[ZB.map[uid]]; if (!r) continue; const k = r.k; const u = sim.units[uid]; if (u.dead) { fate[k] = 'dead'; continue; }
    const out = (near(u, won ? 26 : 12) || (z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10)) && !(u.wounded && u.helpedBy < 0 && !near(u, 4)); fate[k] = out ? 'out' : 'lost'; }
  for (const k of ZB.deadMe || []) fate[k] = 'dead';
  const meK = ZS.me || 'me'; if (fate[meK] === undefined) fate[meK] = h && !h.dead ? 'out' : 'dead';
  if (ZB.cur && ZB.cur !== meK && ZB.cur !== 'stranger' && fate[meK] === 'dead') { const nk = ZB.cur; ZS.me = nk; ZS.oldName = ZS.name; ZS.name = { zh: zRow(nk).zh, en: zRow(nk).en }; }
  const file = zFileK(); ZS.fateK = {}; for (const r of file) { const f = fate[r.k] || 'lost'; ZS.fateK[r.k] = f; ZS.alive[r.k] = f === 'out'; }
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger') ZS.alive[ZB.cur] = !!(h && !h.dead);
  ZS.stage = 'endk'; zSave();
  const all = [{ k: meK, zh: ZS.name.zh, en: ZS.name.en, me: true }].concat(file.filter(r => r.k !== meK));
  const li = all.map(r => { const f = r.me ? 'out' : ZS.fateK[r.k] || 'lost'; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${r.zh} ${r.en}${r.me ? ' (you)' : ''} — ${f === 'out' ? 'back in Tieling' : f === 'dead' ? 'killed on the road' : 'missing in the rain'}</li>`; }).join('');
  const outN = file.filter(r => ZS.fateK[r.k] === 'out').length + 1; let fa = 0, fn = 0; { const G = sim.mg.folk; if (G) for (const id of sim.players[G.p].squads) for (const uid of sim.squads[id].unitIds) { fn++; if (!sim.units[uid].dead) fa++; } } ZS.folkK = fa;
  $('resultTitle').textContent = won ? '回 · Back to Tieling' : '散 · Scattered on the road'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? 'The column came back to Tieling, and the people of Kaiyuan with it.' : 'The horsemen closed the road, but some of you found your way back through the fields after dark.'} ${outN} of your file came back.${fn ? ` About ${Math.round(fa / fn * 10) * 10}% of the people you met on the road reached Tieling with you.` : ''}`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; zCards([
    { title: '開原 · Kaiyuan', year: 'The sixth month of 1619', p: ['Nurhaci attacked Kaiyuan in heavy rain. Its general, Ma Lin, led much of the garrison out of the gates to fight in the open, and too few men were left on the walls. A small relief party sent to the town was cut off on the way; a second relief force from Tieling was intercepted and driven back.',
      'The Jin broke in, and the fighting went on in the streets for three days. Ma Lin was taken and put to death. One of the censors of the town fled.'], zh: '開原陷，馬林死之。' },
    { title: '鐵嶺 · Tieling', year: 'The seventh month of 1619', p: ['Six weeks later the Jin came for Tieling. The town had cannon on its walls, but many of its soldiers went over to the enemy, and the gunners could not reload before the walls were stormed. Its commander, Li Ruzhen, fled.',
      'Those of the garrison who got out walked south to Shenyang. Your file walked with them.'] },
    { title: '熊廷弼 · Xiong Tingbi', year: 'Autumn 1619 – 1620', p: ['That summer the court sent Xiong Tingbi to take charge of Liaodong. He arrived as the frontier was coming apart. He punished officers who had run, rebuilt the walls of Liaoyang and Shenyang, and gathered the scattered soldiers back into an army.',
      'For a year and a half the Jin made no great attack. Your file wintered in Shenyang, mending shields and drilling in the snow.'] },
    { title: '伍 · Your file', year: `${outN} came back`, html: `<ul>${li}</ul>`, btn: 'Spring 1621 →' },
  ], () => zGo('ch2')); };
}
// ===================== 第二章 · Chapter Two: the Hun River, spring 1621 =====================
// Two years after Abudali. The survivors of the file and new drafts from Zhejiang stand in Qi Jin's wagon camp south of the
// Hun River bridge while the Sichuan White Poles fight on the far bank. You lead the file now.
ZR.push(
  { k: 'xiaoman', zh: '樓小滿', en: 'Lou Xiaoman', role: 'shield', t: 'rattan shield · new draft', ch: 2 },
  { k: 'bao', zh: '鮑二', en: 'Bao Er', role: 'spear', t: 'long spear · new draft · a Ningbo boatman', ch: 2 },
  { k: 'shao', zh: '邵阿福', en: 'Shao Afu', role: 'brush', t: 'wolf-brush · new draft · 17', ch: 2 },
  { k: 'ran', zh: '冉家虎', en: 'Ran Jiahu', role: 'spear', t: 'White Pole of Shizhu · 白杆兵', ch: 2, guest: true },
  { k: 'qijin', zh: '戚金', en: 'Qi Jin', role: 'lead', t: 'deputy general of the Zhejiang men · 副將', ch: 2, guest: true },
  { k: 'chence', zh: '陳策', en: 'Chen Ce', role: 'lead', t: 'regional commander of the relief army · 總兵', ch: 2, guest: true });
Object.assign(ZLOOK, {
  xiaoman: { hat: 'rattan', brows: 'thick', young: true, skin: 0xd6a880 },
  bao: { hat: 'wrap', wrap: 0x3a3a3a, brows: 'thin', beard: 'stubble', skin: 0xb48a62 },
  shao: { hat: 'band', brows: 'high', young: true, rosy: true, skin: 0xe2bc96 },
  ran: { hat: 'wrap', wrap: 0xe8e2d0, brows: 'thick', beard: 'mous', skin: 0xb8865e },
  qijin: { h: 1.04, hat: 'chief', brows: 'knit', beard: 'full', grey: true, longBeard: true, skin: 0xc49a74 },
  chence: { h: 1.1, hat: 'chief', brows: 'thick', beard: 'longmous', longBeard: true, bulk: true, skin: 0xb88c66 },
});
const ZP2 = [['北邊的冰還沒化。', 'The ice up north hasn\'t melted yet.'], ['聽說瀋陽的城牆矮。', 'They say Shenyang\'s walls are low.'], ['川兵吃辣子，冬天也不怕冷。', 'The Sichuan men eat chillies. Cold doesn\'t touch them.'], ['火藥多領一包，總沒錯。', 'Draw an extra bag of powder. Never hurts.'], ['又是三月，又在打仗。', 'March again, and war again.']];
const ZP3 = [['……', '...'], ['遼陽那邊有消息沒？', 'Any word from Liaoyang?'], ['別往北看了。', 'Stop looking north.'], ['火小一點，別讓他們看見。', 'Keep the fire low. Don\'t let them see it.']];
// who stands in the file in 1621: the men who came out of Abudali, and the new drafts
function zFile2() { return ZR.filter(r => !r.guest && (r.ch === 2 || (r.k !== 'wu' && r.k !== 'me' && r.k !== ZS.me && ZS.alive[r.k]))); }
const INTRO2 = [
  { title: '兩年 · Two years', year: '1619 – 1621', p: ['After Sarhu the frontier crumbled. That summer Kaiyuan and Tieling fell to the Jin. Xiong Tingbi was sent to hold Liaodong; for a year and a half he rebuilt the defences around Liaoyang and Shenyang and drilled what was left of the army.',
    'Then the old emperor died, and in the new court Xiong\'s enemies talked him out of office. In his place came Yuan Yingtai, a civil official: generous, brave, and no soldier.'], zh: '天啟元年，熊廷弼去職，袁應泰經略遼東。' },
  { title: '浙兵北上 · New men from the south', year: 'Winter 1620', p: ['More Zhejiang men came north, over three thousand under Qi Jin, a kinsman of Qi Jiguang, and Zhang Mingshi. The file was filled out with new drafts: boys from Yiwu, a boatman from Ningbo.',
    'You came out of Abudali Pass. The men call you 隊長 now — section chief. The file is yours to lead.'] },
  { title: '瀋陽 · Shenyang', year: 'The third month of 1621', p: ['In the spring Nurhaci struck at Shenyang. Its generals, He Shixian and You Shigong, were killed and the city fell in a day.',
    'A relief army marching up from Liaoyang under Chen Ce and Tong Zhongkui came too late: native troops from Sichuan and Huguang — among them the White Poles of Shizhu under Qin Bangping — and the Zhejiang men. Tonight it camps on the Hun River, south of the bridge.'] },
];
// ---------- the camp, night before and night after ----------
const ZSPOT2 = { lou: [-2.5, -0.9, 'squat'], liu6: [-0.9, 2.4, 'squat'], luo: [1.0, 2.4, 'squat'], jin: [2.6, -0.6, 'squat'], ye: [-1.9, 1.6, 'squat'], wang: [7.0, -3.4, 'stand'], fang: [2.1, 1.7, 'squat'], he: [-6.8, -2.6, 'stand'], du: [3.1, -2.4, 'stand'], zhu: [8.9, -3.7, 'stand'],
  xiaoman: [-2.9, 0.6, 'squat'], bao: [5.2, -6.6, 'stand'], shao: [0.1, 2.8, 'squat'], ran: [-1.6, -2.8, 'stand'], qijin: [-4.4, -4.6, 'stand'], chence: [5.6, -1.2, 'stand'] };
function zCampCfg2(night) {
  const npcs = [], beds = [], file = zFile2(), rows = [{ k: 'me' }].concat(file), n = rows.length;
  rows.forEach((r, i) => { const a = -0.5 + (i / Math.max(8, n)) * Math.PI * 1.55 + Math.PI * 0.55; const bx = Math.sin(a) * 6.3, bz = Math.cos(a) * 6.3; const alive = r.k === 'me' || ZS.alive[r.k];
    beds.push([+bx.toFixed(2), +bz.toFixed(2), +(a + Math.PI).toFixed(3), !alive]); });
  for (const r of file.concat(night === 2 ? [zRow('ran'), zRow('qijin'), zRow('chence')] : [])) { if (!ZS.alive[r.k] && !r.guest) continue; const sp = ZSPOT2[r.k] || [4, 4, 'stand']; const [x, z] = sp; const tx = r.k === 'zhu' || r.k === 'wang' || r.k === 'bao' ? 8 : 0, tz = r.k === 'zhu' || r.k === 'wang' || r.k === 'bao' ? -5 : 0;
    npcs.push({ role: r.role, x, z, yaw: +Math.atan2(tx - x, tz - z).toFixed(3), ci: ZR.indexOf(r), pose: night === 3 && r.k !== 'zhu' ? 'squat' : sp[2] }); }
  const mb = beds[0]; ZC = { bed: [mb[0], mb[1]] };
  return { fires: ZCAMP.fires, tents: ZCAMP.tents, props: ZCAMP.props, bedrolls: beds, npcs, me: { x: 0.4, z: -3.4, yaw: 0, role: 'lead' } };
}
function zStart2(scene) {
  ZS = zLoad(); if (!ZS) { ZS = zFresh(); }
  $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  if (scene === 'ch2') { // a new chapter: the drafts join, the dead stay in Abudali
    if (!ZS.ch2init) { for (const r of ZR) if (r.ch === 2) { ZS.alive[r.k] = true; ZS.bond[r.k] = 0; delete ZS.fate[r.k]; } ZS.fate1 = Object.assign({}, ZS.fate); ZS.ch2init = true; ZS.stage = 'ch2'; zSave(); }
    zCards(INTRO2, () => { ZS.stage = 'camp2'; zSave(); zStart2('camp2'); }); return;
  }
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, yyRole: 'lead', connected: true }];
  if (scene === 'camp2' || scene === 'camp3') {
    const night = scene === 'camp2' ? 2 : 3; const camp = zCampCfg2(night);
    startGame({ seed, battle: 'zcamp', mode: 'campaign', mission: 'zcamp', camp, players: pl }, 0, null, 1);
    ZC.night = night; ZC.map = {}; for (const u of state.sim.units) if (u.camp) { ZC.map[u.id] = u.ci; zDress(u, u.ci); } { const me = state.sim.units[state.sim.players[0].heroId]; zDress(me, ZR.findIndex(r => r.k === (ZS.me || 'me'))); } ZC.chatT = 6;
    MUSIC.play('menu'); MUSIC.setIntensity(0.15); AUDIO.setFire(0.6); $('army').hidden = true;
    setTimeout(() => storyCard(night === 3 ? 'The survivors make camp in a burnt farmstead off the Liaoyang road. Walk among them (E to talk), and when you are ready, lie down on your bedroll.' : 'The night before. The camp lies five li south of the Hun River bridge. Walk among your file and talk with them (E). When you are ready, lie down on your bedroll.', night === 3 ? '夜 · The night after' : '營 · The Hun River, spring 1621'), 900);
  } else if (scene === 'battle2') {
    startGame({ seed, battle: 'toba', mode: 'campaign', mission: 'hunz', players: pl }, 0, null, 1);
    const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq]; const meIdx = ZR.findIndex(r => r.k === (ZS.me || 'me'));
    ZB = { map: {}, sq: q.id, first: me.heroId, cur: ZS.me || 'me', fell: false, ch2: true };
    const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = meIdx;
    const left = []; for (const r of zFile2()) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role === r.role); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } else left.push(r); }
    for (const r of left) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role !== 'lead'); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } } // a place for every man, even if it is not his usual trade
    for (const uid in ZB.map) zDress(sim.units[uid], ZB.map[uid]);
    for (const [g, k] of [['zhe', 'qijin'], ['chen', 'chence']]) { const G = sim.mg[g]; if (G) zDress(sim.units[sim.players[G.p].heroId], ZR.findIndex(r => r.k === k)); }
    setTimeout(() => storyCard('Spring 1621. You lead your file in Qi Jin\'s wagon camp south of the Hun River. F follow me · H halt · C charge · Z form up where you look. The flag on your back is the file\'s.', '渾河 · The Hun River'), 700);
  }
}
function zSleep2() {
  if (ZC.night === 2) { ZS.stage = 'battle2'; zSave(); zCards([{ title: '黎明 · Dawn', year: 'Spring 1621', p: ['Before light, word runs through the camp: Shenyang fell yesterday. The officers argue at the bridge. Then the Sichuan men start across it.', 'You walk down your file, tugging straps the way Chief Wu used to. "Twelve men," you hear yourself say. "One life."'], btn: 'Stand to →' }], () => zGo('battle2')); }
  else { ZS.stage = 'end2'; zSave(); const n = zFile2().filter(r => ZS.alive[r.k]).length; zCards([{ title: '第二章終 · End of Chapter Two', year: 'The Hun River, spring 1621', p: [`${n} of your file sleep in the ashes of the farmstead. In the morning you will walk south. Days later Liaoyang will fall, and everything east of the Liao River with it.`, 'Five years from now, at a small fort called Ningyuan on the Bohai coast, a civil official named Yuan Chonghuan will refuse to run.'], zh: '第三章 · 寧遠 · Ningyuan, 1626 — 待續 · to be continued', btn: 'Back to the menu' }], () => { location.reload(); }); }
}
// ---------- dialogue ----------
function zTalk2(k, night) {
  const S0 = ZS, F1 = S0.fate1 || {}, FK = S0.fateK || {}, d1 = (x) => F1[x] && F1[x] !== 'out', dK = (x) => FK[x] && FK[x] !== 'out', lou1 = !d1('lou') && !dK('lou'), nm = S0.name;
  const deadAt1 = ZR.filter(r => !r.ch && r.k !== 'me' && r.k !== 'wu' && d1(r.k)).map(r => r.zh);
  if (night === 2) return ({
    lou: { g: ['兩年了。我還是沒把那封信寄出去。', 'Two years. I still haven\'t sent that letter.'], t: [
      { q: 'Your brother is here.', a: [['小滿？……那個傻小子，自己跑來當兵了。', 'Xiaoman? ...The fool came and enlisted himself.'], ['明天讓他站我後面。我替他擋。', 'Tomorrow he stands behind me. I take what comes for him.']] },
      { q: 'Why not send it?', bond: 1, a: [['寄了，家裡就以為我還好。', 'If I send it, they\'ll think I\'m still well.'], ['等打完這一仗，我自己帶回去。', 'When this one\'s done, I\'ll carry it home myself.']] }] },
    xiaoman: { g: lou1 ? ['我哥說你是隊長。他說你在山裡沒丟下人。', 'My brother says you\'re chief. He says you didn\'t leave anyone in those mountains.'] : ['你是我哥的隊長？樓阿根。他在哪？', 'You were my brother\'s chief? Lou Agen. Where is he?'], t: lou1 ? [
      { q: 'Stay behind your brother tomorrow.', bond: 1, a: [['我不要躲。我是藤牌手，跟他一樣。', 'I won\'t hide. I\'m a shield man, same as him.'], ['……好吧。我站他旁邊。', '...All right. I\'ll stand beside him.']] }] : [
      { q: 'Tell him the truth.', bond: 1, a: [[`（你告訴他${dK('lou') ? '開原道' : '阿布達里岡'}的事。他很久沒說話。）`, `(You tell him about ${dK('lou') ? 'the Kaiyuan road' : 'Abudali Pass'}. He says nothing for a long time.)`], ['……娘一直在等他的信。', '...Mother has been waiting all this time for his letter.']] },
      { q: S0.flags.letter ? 'I wrote a letter for him. I remember it.' : 'He spoke of home often.', bond: 1, a: S0.flags.letter ? [['他說：跟娘說北邊冷，可我有棉襖。跟媳婦說，我很好。', 'He said: tell my mother it\'s cold up north, but I have a padded coat. Tell my wife I\'m well.'], ['（樓小滿低下頭，用袖子擦了擦臉。）', '(Lou Xiaoman bows his head and wipes his face with his sleeve.)']] : [['義烏，山裡，礦坑邊上。他說戚爺爺就是看上他們那股狠勁。', 'Yiwu, up by the mines. He said that was what Marshal Qi liked about them: they never back down.']] }] },
    liu6: S0.flags.saved6 ? { g: [`${nm.zh}哥。腿好了，你看。`, `Brother ${nm.en}. The leg healed — look.`], t: [
      { q: 'Look after Shao Afu tomorrow.', bond: 1, a: [['他跟我那時候一樣大。……我會的。', 'He\'s the age I was. ...I will.']] }] } : { g: ['我還記得那個山谷。', 'I still remember that valley.'], t: [{ q: 'So do I.', a: [['這回別讓人掉隊。', 'This time, nobody gets left.']] }] },
    shao: { g: ['隊長，狼筅這麼重，我拿得穩嗎？', 'Chief, the wolf-brush is so heavy — can I hold it steady?'], t: [
      { q: 'Plant it, don\'t swing it.', bond: 1, a: [['插在地上，讓馬自己撞上來……對吧？', 'Plant it in the ground and let the horses run onto it... right?'], ['陳小六也這麼教我。', 'Chen Xiaoliu told me the same.']] },
      { q: 'How old are you?', a: [['十七。這回是真的。', 'Seventeen. Really, this time.']] }] },
    bao: { g: ['在寧波我撐船，現在撐槍。都是一根長桿子。', 'In Ningbo I poled a boat. Now I pole a spear. It\'s all a long stick.'], t: [
      { q: 'Can you swim?', a: [['能。可渾河三月的水，冰的。掉下去就上不來。', 'I can. But the Hun River in the third month is ice water. Fall in and you don\'t come out.']] },
      { q: 'Why did you join?', bond: 1, a: [['欠了船主的錢。當兵有餉。……說是有餉。', 'I owed the boat owner. Soldiers get paid. ...They say soldiers get paid.']] }] },
    ran: { g: ['浙江來的？我們石柱的人，跟你們一起守過關。', 'From Zhejiang? We Shizhu men have held a pass beside your people before.'], t: [
      { q: 'Who leads you?', a: [['秦邦屏將軍。他妹妹秦良玉，在家裡管著石柱的兵。', 'General Qin Bangping. His sister, Qin Liangyu, commands the Shizhu troops back home.'], ['我們的槍杆是白的，所以叫白杆兵。槍頭有鉤，可以把馬上的人拉下來。', 'Our spear shafts are white, so they call us the White Poles. The heads have hooks — we pull riders out of the saddle.']] },
      { q: 'Will you cross the river tomorrow?', bond: 1, a: [['城都丟了，還過河幹什麼？……可周將軍說，不能救瀋陽，在這三年幹什麼。', 'The city\'s gone, why cross? ...But General Zhou says: if we can\'t save Shenyang, what have we been doing here three years?'], ['他過，我們就過。', 'If he crosses, we cross.']] }] },
    fang: { g: ['熊經略在，遼東還能守。熊經略一走……', 'With Xiong Tingbi in charge, Liaodong could be held. With him gone...'], t: [
      { q: 'What happened to Xiong Tingbi?', a: [['新皇登基，朝裡有人參他，說他畏敵、說他跋扈。他就辭了。', 'A new emperor, and men at court accused him of cowardice, of arrogance. He resigned.'], ['換了袁經略。袁公是好人，可不懂兵。他還收了好些逃來的蒙古饑民進城，說是仁政。', 'Now we have Commissioner Yuan. A good man, but no soldier. He even took starving Mongol refugees into the cities — calls it benevolence.']] },
      { q: 'What do you make of tomorrow?', bond: 1, a: [['川兵在北，我們在南，中間一條河、一座橋。', 'The Sichuan men to the north, us to the south, and between us a river and one bridge.'], ['兵分兩處，又隔著水。……我在阿布達里岡見過這種事。', 'An army split in two with water between. ...I saw this at Abudali.']] }] },
    he: { g: ['兩年前我說劉總兵是條好漢。戚將軍也是。', 'Two years ago I said General Liu was a hero. So is General Qi.'], t: [
      { q: 'You taught me the shield. Teach Xiaoman.', bond: 1, a: [['我教了。他學得快，跟他哥一樣倔。', 'I have. He learns fast. Stubborn, like his brother.']] }] },
    luo: { g: ['骰子還是那對。運氣用光了沒有，誰知道。', 'Same pair of dice. Who knows if the luck\'s used up.'], t: [{ q: 'Roll for tomorrow.', bond: 1, a: [['（骰子停下：兩個六。駱鐵頭不笑，把骰子塞給你。）', '(The dice stop: two sixes. Luo Tietou doesn\'t laugh. He presses them into your hand.)'], ['你拿著。隊長的運氣，大家都用得著。', 'You keep them. The whole file can use a chief\'s luck.']] }] },
    jin: { g: ['這條河晚上有聲音。冰在裂。', 'The river makes noises at night. The ice is cracking.'], t: [{ q: 'You still have the charm?', a: [['在。兩年，一直在。', 'Here. Two years, never left me.']] }] },
    ye: { g: ['我女兒七歲了。我還沒見過七歲的她。', 'My daughter is seven. I\'ve never seen her at seven.'], t: [{ q: 'You\'ll see her at eight.', bond: 1, a: [['……你答應我？', '...You promise?']] }] },
    wang: { g: ['我現在一頓吃三個餅。長力氣。', 'I eat three cakes a meal now. Building strength.'], t: [{ q: 'Stay by me tomorrow.', bond: 1, a: [['你在前頭，我就在你左邊。誰都別想過去。', 'You\'re at the front, I\'m at your left. Nobody gets through.']] }] },
    du: { g: ['五十兩一顆首級。兩年了，我一顆也沒拿到。', 'Fifty taels a head. Two years, and I haven\'t taken one.'], t: [{ q: 'Chunhua?', bond: 1, a: [['她嫁人了。去年。……不提了。', 'She married. Last year. ...Let\'s not talk about it.']] }] },
    qijin: { g: [`你就是從阿布達里岡出來的那個隊長？${nm.zh}，是吧。坐，坐。`, `You're the chief who came out of Abudali Pass? ${nm.en}, isn't it. Sit, sit.`], t: [
      { q: 'You know about Abudali?', a: [['劉總兵的浙兵，我認得好幾個。都是義烏人。', 'Liu Ting\'s Zhejiang men — I knew a good few of them. Yiwu men, all of them.'], ['你帶出來的人，名字記住。我也記。', 'The men you brought out — keep their names. I keep them too.']] },
      { q: 'Are you kin to Marshal Qi?', a: [['他是我叔父。', 'He was my uncle.'], ['人人都說戚家軍。可戚家軍從來不是姓戚的人，是你們這些人。', 'Everyone talks about the Qi family army. It was never the men named Qi. It was men like you.']] },
      { q: 'What do they think of us here?', a: [['熊經略頭一回見我們，說南兵虛而猾。', 'The first time Commissioner Xiong saw us, he said the southern troops were hollow and sly.'], ['（他笑了一聲。）明天讓他們看看。', '(He gives a short laugh.) Tomorrow we let them see.']] },
      { q: 'Will we cross the river?', a: [['陳總兵要回遼陽，川兵要過河。不管誰對，總得有個地方讓人退回來。', 'General Chen wants to go back to Liaoyang; the Sichuan men want to cross. Whoever is right, there has to be somewhere for men to fall back to.'], ['所以我們挖壕、立柵、排車。聽我的鼓。鼓在響，營就在。', 'So we dig the ditch, raise the palisade, line up the wagons. Listen for my drum. While it beats, the camp holds.']] },
      { q: 'Eat with us.', flag: 'qicake', a: [['（他從懷裡掏出一塊乾餅，掰成兩半，一半遞給你，一半遞給樓小滿。）', '(He takes a dry cake from inside his coat, breaks it in two, and hands one half to you and the other to Lou Xiaoman.)']] }] },
    chence: { g: ['南兵？這麼冷的天，腳還好吧？', 'Southern men? In this cold — how are your feet?'], t: [
      { q: 'Will we cross the river?', a: [['瀋陽已經丟了。過河去救一座空城，是白白送死。', 'Shenyang is already lost. Crossing to save an empty city is throwing men away.'], ['可底下的人不肯走。……明早再說。', 'But the officers won\'t turn back. ...We\'ll see in the morning.']] },
      { q: 'Where do you want us?', a: [['跟著戚副將。他的車營比城牆還結實。', 'Stay with Deputy General Qi. His wagon camp is sturdier than a city wall.'], ['看見東邊那面大旗沒有？那是我的。旗在，兵就在。', 'See the big banner on the east side? That\'s mine. While it stands, the army stands.']] }] },
    zhu: { g: ['今天有鹽。川兵分給我們的。', 'Salt today. The Sichuan men shared theirs.'], t: [{ q: 'Any news?', a: [['陳總兵要回遼陽，底下的將爺不肯，說來都來了。', 'General Chen wants to march back to Liaoyang. His officers won\'t have it — we\'ve come this far, they say.'], ['朱萬良、姜弼的馬兵在白塔鋪，說是接應。……接應誰，誰知道。', 'Zhu Wanliang and Jiang Bi have cavalry at Baitapu, to support us, they say. ...Support whom, who knows.']] }] },
  })[k];
  // the night after
  const F2 = S0.fate2 || {}, d2 = (x) => F2[x] && F2[x] !== 'out';
  return ({
    lou: { g: ['我說過我替他擋。', 'I said I\'d take what came for him.'], t: [{ q: d2('xiaoman') ? 'Xiaoman...' : 'He\'s alive.', bond: 1, a: d2('xiaoman') ? [['（樓阿根把那封兩年前的信拿出來，看了很久，又收回懷裡。）', '(Lou Agen takes out the letter from two years ago, looks at it for a long time, and puts it back against his chest.)']] : [['是。……是。', 'Yes. ...Yes.']] }] },
    xiaoman: { g: lou1 && !d2('lou') ? ['哥還在。我們都還在。', 'My brother\'s alive. We\'re both alive.'] : ['……', '...'], t: [{ q: 'Rest.', a: [['我閉上眼就聽見砲聲。', 'When I close my eyes I hear the guns.']] },
      ...(S0.flags.qicake ? [{ q: 'The old general gave you half his cake.', bond: 1, a: [['我還留著一角，沒捨得吃。', 'I kept a corner of it. I couldn\'t bring myself to eat it.'], ['他叫我小兄弟。', 'He called me little brother.']] }] : [])] },
    liu6: { g: ['這回沒人掉隊吧？……有沒有？', 'Nobody got left this time? ...Did they?'], t: [{ q: 'Some did.', a: [['（他點點頭，把狼筅抱在懷裡。）', '(He nods, and holds the wolf-brush close.)']] }] },
    shao: { g: ['我插住了一匹馬。牠自己撞上來的，跟你說的一樣。', 'I stopped a horse. It ran right onto the brush, like you said.'], t: [{ q: 'You did well.', bond: 1, a: [['可是旁邊的人……', 'But the man beside me...']] }] },
    bao: { g: ['我們往南走，對吧？離河越遠越好。', 'We go south, right? The farther from that river the better.'], t: [{ q: 'South.', a: [['遼陽還守得住嗎？', 'Can Liaoyang hold?']] }] },
    fang: { g: ['戚將軍、張參將、陳總兵、童總兵……都沒了。', 'General Qi, Zhang Mingshi, Chen Ce, Tong Zhongkui... all gone.'], t: [
      { q: 'What happens now?', a: [['金人下一步就是遼陽。袁經略守不住的。', 'Next the Jin go for Liaoyang. Commissioner Yuan can\'t hold it.'], ['我們這些人，加上川兵剩下的，都是寫不進捷報的人。', 'Men like us, and what\'s left of the Sichuan troops — nobody writes us into the victory reports.']] }] },
    he: { g: ['戚將軍跟童總兵說，大丈夫報國，就在今日。', 'General Qi told General Tong: a man repays his country today, of all days.'], t: [{ q: 'You heard him?', a: [['我聽見了。然後他回頭叫你帶人走。', 'I heard. Then he turned and told you to take your men out.']] }] },
    luo: { g: ['骰子呢？還在你那吧。', 'The dice? You still have them?'], t: [{ q: 'Here.', a: [['留著。還沒用完。', 'Keep them. They\'re not used up yet.']] }] },
    jin: { g: ['冰裂了，好多人掉下去。', 'The ice broke. So many went through.'], t: [{ q: 'We\'re out.', a: [['嗯。我們出來了。', 'Mm. We\'re out.']] }] },
    ye: { g: ['八歲。你答應過我。', 'Eight. You promised.'], t: [{ q: 'I remember.', bond: 1, a: [['那就再活一年。', 'Then we live one more year.']] }] },
    wang: { g: ['左邊沒人過去。我說到做到。', 'Nobody got past on the left. I said so.'], t: [{ q: 'Eat something.', a: [['……給我一個餅。', '...Give me a cake.']] }] },
    du: { g: ['我拿到一顆首級。可是沒人收了。', 'I took a head. But there\'s nobody left to pay for it.'], t: [{ q: 'Leave it.', a: [['（他把那包東西扔進了雪溝。）', '(He throws the bundle into a snowy ditch.)']] }] },
    zhu: { g: ['鍋還在。人少了，粥就稠了。', 'The pot made it. Fewer men, thicker gruel.'], t: [{ q: 'Sit with us.', bond: 1, a: [['（他給每個人都多舀了一勺，也給空著的位子舀了一碗。）', '(He gives every man an extra scoop, and fills a bowl for each empty place too.)']] }] },
  })[k];
}
// ---------- after the battle ----------
function zheFinish2(winner) {
  const sim = state.sim, h = localHero(); const M = sim.mission, z = sim.missionZone('road'); const won = winner === M.side;
  const fate = {}; const near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const r = ZR[ZB.map[uid]]; if (!r) continue; const k = r.k; const u = sim.units[uid]; if (u.dead) { fate[k] = 'dead'; continue; }
    const out = (near(u, won ? 26 : 12) || (z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10)) && !(u.wounded && u.helpedBy < 0 && !near(u, 4)); fate[k] = out ? 'out' : 'lost'; }
  for (const k of ZB.deadMe || []) fate[k] = 'dead';
  const meK = ZS.me || 'me'; if (fate[meK] === undefined) fate[meK] = h && !h.dead ? 'out' : 'dead';
  if (ZB.cur && ZB.cur !== meK && ZB.cur !== 'stranger' && fate[meK] === 'dead') { const nk = ZB.cur; ZS.me = nk; ZS.oldName = ZS.name; ZS.name = { zh: zRow(nk).zh, en: zRow(nk).en }; }
  const file = zFile2(); ZS.fate2 = {}; for (const r of file) { const f = fate[r.k] || 'lost'; ZS.fate2[r.k] = f; ZS.alive[r.k] = f === 'out'; }
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger') ZS.alive[ZB.cur] = !!(h && !h.dead);
  ZS.stage = 'camp3'; zSave();
  const all = [{ k: meK, zh: ZS.name.zh, en: ZS.name.en, me: true }].concat(file.filter(r => r.k !== meK));
  const li = all.map(r => { const f = r.me ? (fate[meK] === 'dead' && ZB.cur === meK ? 'dead' : 'out') : ZS.fate2[r.k] || 'lost'; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${r.zh} ${r.en}${r.me ? ' (you)' : ''} — ${f === 'out' ? 'came out by the Liaoyang road' : f === 'dead' ? 'killed' : 'missing on the river'}</li>`; }).join('');
  const outN = file.filter(r => ZS.fate2[r.k] === 'out').length + 1;
  $('resultTitle').textContent = won ? '出 · Out by the Liaoyang road' : '陷 · The camp is overrun'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? 'You got out of the camp before the ring closed.' : 'The ring closed, but a few of you crawled out through the dark.'} ${outN} of your file came out.`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; zCards([
    { title: '渾河 · What happened', year: 'The third month of 1621', p: ['Shenyang had fallen the day before. Chen Ce wanted to turn back; his officers would not. Zhou Dunji is recorded as saying: "If we cannot save Shenyang, what have we been doing here these three years?"',
      'The Sichuan troops under Qin Bangping and Zhou Dunji crossed and made camp north of the bridge. They threw back the first Jin charges and killed many, but were worn down and overwhelmed; Qin Bangping and Zhou Dunji were killed, and a few survivors broke through to the Zhejiang camp. One Ming report says the turncoat Li Yongfang set captured Ming gunners to fire Shenyang\'s cannon into them; some historians doubt it.',
      'Five li south of the bridge, about three thousand Zhejiang men under Qi Jin and Zhang Mingshi had dug in behind wagons, guns, a ditch and a palisade of sorghum stalks plastered with mud. Surrounded, they fired until their powder ran out, then fought hand to hand into the night. Chen Ce, Tong Zhongkui, Qi Jin and Zhang Mingshi all died. Qi Jin is said to have stopped Tong from withdrawing with the words: "A man repays his country today."',
      'The cavalry of Zhu Wanliang and Jiang Bi, waiting at Baitapu, held back and were beaten when at last they moved. Days later the Jin took Liaoyang, and Yuan Yingtai killed himself in the burning city. Everything east of the Liao River was lost.'], zh: '大丈夫報國在今日。— attributed to Qi Jin' },
    { title: '伍 · Your file', year: `${outN} came out`, html: `<ul>${li}</ul>`, btn: 'Night falls →' },
  ], () => zGo('camp3')); };
}


// ===================== 道 · On the road: short scenes between the camps and the battles (story-road) =====================
// You march with your file. The men talk in twos and threes, and the talk knows who came out of the last fight and who did
// not; now and then one of them turns to you (E to answer). A handful of raiders tests the column. Enter (twice) marches on.
// Low stakes: in these scenes a man of the file is knocked down, never killed (the sim's `soft` missions).
const ZRV = ['he', 'luo', 'lou', 'fang', 'wang', 'jin', 'ye', 'du', 'zhu', 'liu6'], ZRN = ['xiaoman', 'bao', 'shao'];
const zrAny = (list) => ({ r: list }); // a slot filled by any one of these, at random
// what a man was like, for the men who never knew him
const ZTRAIT = {
  liu6: ['十六歲，扛著一丈五的狼筅，從來不往後退。', 'Sixteen, carrying a fifteen-foot brush, and he never once stepped back.'],
  lou: ['他懷裡揣著一封信，一直沒寄。', 'He carried a letter inside his coat, and never sent it.'],
  luo: ['骰子不離手，嘴不饒人，刀也不饒人。', 'Never without his dice. A sharp tongue and a sharper blade.'],
  jin: ['他總說山裡有東西。他說對了。', 'He always said there was something in those hills. He was right.'],
  ye: ['他有個女兒。他沒看見她長大。', 'He had a daughter. He never saw her grow up.'],
  wang: ['力氣大，飯量也大，可最後一口餅也肯分給你。', 'Strong as an ox and always hungry, and he would still give you his last bite.'],
  fang: ['讀過書，什麼都懂，就是不懂怎麼怕。', 'He had read books and understood everything, except how to be afraid.'],
  he: ['打過播州的老兵。我的盾是他教的。', 'A Bozhou veteran. He taught me the shield.'],
  du: ['一心想拿一顆首級，回家娶春花。', 'All he wanted was one head, and to go home and marry Chunhua.'],
  zhu: ['伙夫。粥稀，可從來沒讓我們餓著。', 'The cook. Thin gruel, but he never let us go hungry.'],
  xiaoman: ['樓阿根的弟弟。倔，跟他哥一樣。', 'Lou Agen\'s little brother. Stubborn, like his brother.'],
  bao: ['寧波撐船的。說什麼都是一根長桿子。', 'A Ningbo boatman. Everything was just a long pole to him.'],
  shao: ['十七歲。這回是真的十七。', 'Seventeen. Really seventeen.'],
};
// the dead of the file, as the save remembers them (never the living)
function zrDead() { return ZR.filter(r => !r.guest && r.k !== 'me' && r.k !== 'wu' && r.k !== ZS.me && ZS.alive[r.k] === false && (!r.ch || (ZS.fate2 && ZS.fate2[r.k]))); }
function zrDead2() { const F = ZS.fate2 || {}; return ZR.filter(r => !r.guest && r.k !== 'me' && r.k !== ZS.me && F[r.k] && F[r.k] !== 'out' && ZS.alive[r.k] === false); }
const ZROAD = {
  A: { mission: 'roadA', next: 'camp0',
    camp: { fires: [[-5, 124], [6, 119]], props: [['wagon', -7, 46, 1.2], ['log', 5, 30, 0.4], ['log', 4, 33, 1.5], ['banner', 3, 128, 0, '劉'], ['rack', -6, 116, 0.3], ['shields', 8, 114, 0.6]] },
    card: ['March 1619. Liu Ting\'s column climbs north into the Jin hills. You march as a shield man in Chief Wu\'s file. Keep your place and listen to the men around you. E answers when one of them speaks to you; Enter (twice) marches on.', '寬甸道 · The Kuandian road'],
    winT: '暮 · Dusk', winX: 'The column made camp in a fold of the hills.',
    after: [{ title: '暮 · Dusk', year: 'March 1619', p: ['The column makes camp in a fold of the hills. The scouts have seen how many you are; somewhere ahead, someone is counting.', 'Chief Wu sets two extra sentries, and walks down the file one more time before dark.'], btn: 'Night →' }],
    go: () => zGo('camp0'),
    beats: [
      { ph: 0, t: 5, who: { w: 'wu', l: 'luo', s: 'liu6' }, lines: [['w', '聽鼓就走，聽金就停。戚爺爺的規矩：行軍不許亂，不許喧嘩，不許私自離隊取水。', 'Drum, we march. Gong, we halt. Marshal Qi\'s rules: no straggling, no shouting, and nobody leaves the file to fetch water.'], ['l', '不許喧嘩？那駱鐵頭只好閉嘴了。', 'No shouting? Then Luo Tietou had better shut his mouth.'], ['s', '嘿嘿。', 'Heh.']] },
      { ph: 0, t: 18, who: { s: 'liu6', l: 'luo' }, lines: [['s', '這狼筅扛一天，比打一仗還累。', 'A day of carrying this brush is worse than a battle.'], ['l', '跟我換根長槍？那你就得站前頭了。', 'Want to trade it for a spear? Then you\'d be standing in front.'], ['s', '……那我還是扛著吧。', '...I\'ll keep carrying it.']] },
      { ph: 0, t: 31, who: { f: 'fang', h: 'he' }, lines: [['f', '出寬甸已經九天了。地圖上說，再翻三道嶺就是赫圖阿拉。', 'Nine days out of Kuandian. The map says three more ridges and we reach Hetu Ala.'], ['h', '地圖不打仗。', 'Maps don\'t fight.']],
        reply: { q: 'Ask Fang where the other columns are', me: ['方秀才，別的幾路到哪了？', 'Fang, where are the other columns now?'], a: [['f', '沒有消息。這山裡，連信鴿都飛不過來。', 'No word. Not even a pigeon gets through these hills.']], bond: 'f' } },
      { ph: 0, t: 44, who: { w: 'wang', z: 'zhu' }, lines: [['w', '胖子，鍋裡還有沒有？', 'Fatty, anything left in the pot?'], ['z', '鍋在我背上，粥在你夢裡。', 'The pot\'s on my back. The gruel\'s in your dreams.']] },
      { ph: 1, t: 3, who: { w: 'wu', z: 'zhu' }, lines: [['w', '井水不許生喝。胖子，燒開了再分。金人退的時候，常往井裡下毒。', 'Nobody drinks raw from that well. Fatty, boil it, then share it out. When the Jin pull back they often foul the wells.'], ['z', '曉得，曉得。燒開了，一人一瓢。', 'I know, I know. Boiled, one ladle each.']] },
      { ph: 1, t: 13, who: { j: 'jin', y: 'ye' }, lines: [['j', '門都沒閂。灶還是溫的。他們剛走不久。', 'The doors aren\'t even barred. The stove is still warm. They left only just now.'], ['y', '……帶著孩子走的吧。院子裡有個撥浪鼓。', '...They left with the children. There\'s a rattle-drum in the yard.']],
        reply: { q: 'Tell Ye San to leave the rattle-drum where it is', me: ['放著吧，別動人家的東西。', 'Leave it. Don\'t touch their things.'], a: [['y', '嗯。……我女兒也有一個。', 'Mm. ...My daughter has one too.']], bond: 'y' } },
      { ph: 1, t: 27, who: { d: 'du', h: 'he' }, lines: [['d', '空村子，連隻雞都沒留。這算什麼仗？', 'An empty village, not even a chicken left. What kind of war is this?'], ['h', '堅壁清野。播州的人也這麼幹：糧帶走，人躲進山，等我們走累了再來。', 'Strip the land and hide in the hills. They did it at Bozhou too: take the grain, vanish, and come back when we are worn out.']] },
      { ph: 2, t: 5, who: { s: 'liu6' }, lines: [['s', '插住——插住——', 'Plant it — plant it —']] },
      { ph: 3, t: 2, who: { l: 'luo', w: 'wu', s: 'liu6' }, lines: [['l', '跑了！看了看我們有多少人就跑了。', 'They\'re off! Took one look at how many we are and ran.'], ['w', '他們不是來打的，是來數的。今晚多放兩個哨。', 'They didn\'t come to fight. They came to count. Two extra sentries tonight.']],
        reply: { q: 'Ask Chen Xiaoliu if he is all right', me: ['小六，沒事吧？', 'Xiaoliu, you all right?'], a: [['s', '沒……沒事。手在抖。可是我插住了一匹。', 'I\'m... fine. My hands are shaking. But I stopped one.']], bond: 's' } },
      { ph: 3, t: 20, who: { f: 'fang' }, lines: [['f', '他們知道我們在哪。我們不知道他們在哪。', 'They know where we are. We don\'t know where they are.']] },
      { ph: 3, t: 32, who: { o: 'lou' }, lines: [['o', '（樓阿根低聲哼起義烏的山歌。）', '(Lou Agen hums a Yiwu hill song under his breath.)']] },
    ] },
  B: { mission: 'roadB', next: 'camp2',
    camp: { fires: [[-6, 124], [5, 121]], props: [['wagon', 6, -30, 0.15], ['banner', -3, 128, 0, '戚'], ['wagon', 10, 112, 1.4], ['wagon', -10, 112, -1.4], ['rack', 4, 126, 0]] },
    card: ['The third month of 1621. The relief army marches north from Liaoyang toward Shenyang. You lead your file in the column. E answers when one of your men speaks to you; Enter (twice) marches on.', '遼陽道 · North from Liaoyang'],
    winT: '渾河 · The Hun River', winX: 'The relief army reached the Hun River by evening.',
    after: [{ title: '渾河 · The Hun River', year: 'The third month of 1621', p: ['By evening the relief army reaches the Hun River. The Sichuan White Poles make camp by the bridge; Qi Jin\'s Zhejiang men dig in five li to the south, behind wagons and a ditch.', 'Somewhere north of the river, the sky over Shenyang is red.'], btn: 'Night →' }],
    go: () => zGo('camp2'),
    beats: [
      { ph: 0, t: 5, who: { s: 'shao', v: zrAny(ZRV) }, lines: [['s', '隊長，北邊是什麼樣的？', 'Chief, what is it like up north?']],
        reply: { q: 'Tell Shao Afu what the north is like', me: ['冷。山多。金人的馬比你想的快。', 'Cold. Hills. Their horses are faster than you think.'], a: [['s', '……比我想的快多少？', '...How much faster than I think?'], ['v', '快到你來不及想。', 'Faster than you can think it.']], bond: 's' } },
      { ph: 0, t: 19, who: { b: 'bao', x: 'xiaoman' }, lines: [['b', '這條路比寧波的河還彎。', 'This road bends more than the rivers at Ningbo.'], ['x', '你又沒在這條路上撐過船。', 'You never poled a boat up this road.'], ['b', '撐過就好了，至少能坐著。', 'I wish I had. At least I\'d be sitting down.']] },
      { ph: 0, t: 33, who: { v: zrAny(ZRV), n: zrAny(ZRN) }, make: () => { const d = zrDead()[0];
        if (!d) return { lines: [['v', '吳隊長要是還在，這會兒該罵我們走得慢了。', 'If Chief Wu were still here, he\'d be cursing us for walking slow.'], ['n', '吳隊長？', 'Chief Wu?'], ['v', '阿布達里岡。他老說：十二個人，一條命。', 'Abudali Pass. He always said: twelve men, one life.']] };
        const T = ZTRAIT[d.k] || ['跟你一樣，什麼都不懂，可從來不往後退。', 'Like you. Knew nothing, and never once stepped back.'];
        return { lines: [['v', `${d.zh}要是還在，這會兒該罵我們走得慢了。`, `If ${d.en} were still with us, he'd be cursing us for walking slow.`], ['n', '他是什麼樣的人？', 'What was he like?'], ['v', T[0], T[1]]] }; } },
      { ph: 0, t: 47, who: { v: zrAny(ZRV) }, lines: [['v', '兩年前也是這個月，我們往北走。', 'Two years ago, this same month, we were walking north.']] },
      { ph: 1, t: 3, who: { p: ['wang', 'bao', 'he', 'luo'], q: ['bao', 'xiaoman', 'shao', 'du'] }, lines: [['p', '讓開，讓我來。一、二——', 'Out of the way, let me at it. One, two —'], ['q', '起！', 'Heave!']] },
      { ph: 1, t: 10, who: { c: ['zhu', 'shao', 'jin', 'du'] }, lines: [['c', '輪子底下墊草，墊草！', 'Straw under the wheel — straw!']] },
      { ph: 1, t: 17, who: { v: zrAny(ZRV.concat(ZRN)) }, lines: [['v', '動了！動了！', 'It\'s moving! It\'s moving!']],
        reply: { q: 'Order the men back into file', me: ['歸隊！別在路上站著。', 'Back in file! Don\'t stand about on the road.'], a: [['v', '是，隊長。', 'Yes, chief.']] } },
      { ph: 2, t: 4, who: { s: ['shao', 'xiaoman', 'bao'], f: ['fang', 'he', 'lou', 'luo', 'wang'] }, lines: [['s', '這麼多人……他們從哪來的？', 'So many people... where are they from?'], ['f', '瀋陽北邊的屯子。金人一來，屯子就空了。', 'The farm villages north of Shenyang. When the Jin come, the villages empty.']] },
      { ph: 2, t: 15, who: { v: zrAny(ZRV) }, lines: [['v', '穿著我們的號衣，搶自己人。', 'Wearing our coats, and robbing our own.']] },
      { ph: 3, t: 2, who: { x: ['xiaoman', 'shao', 'bao'], v: zrAny(ZRV) }, lines: [['x', '那些人……也是當兵的吧？', 'Those men... they were soldiers too, weren\'t they?'], ['v', '是。跑了，就什麼都不是了。', 'They were. A man who runs is nothing at all.']],
        reply: { q: 'Tell them: we don\'t run', me: ['我們不跑。阿布達里岡沒跑，這回也不跑。', 'We don\'t run. We didn\'t run at Abudali, and we won\'t now.'], a: [['x', '……是，隊長。', '...Yes, chief.']], bond: 'x' } },
      { ph: 3, t: 17, who: { f: ['fang', 'he', 'lou', 'luo', 'jin'] }, lines: [['f', '前面就是渾河。過了河，就是瀋陽。', 'Up ahead is the Hun River. Across it, Shenyang.']] },
    ] },
  C: { mission: 'roadC', next: 'end2',
    camp: { fires: [[-2, 3], [-7, 126], [7, 126]], props: [['banner', -9, 129, 0, '明'], ['banner', 9, 129, 0, '袁'], ['rack', 3, 12, 1.2], ['log', -3, 6, 0.2], ['shields', 4, 3, 0.8]] },
    pre: [{ title: '五年 · Five years', year: '1621 – 1625', p: ['Liaoyang fell days after the Hun River, and with it everything east of the Liao River. The next winter Guangning was lost too, and the Ming fell back on a line of forts along the Bohai coast toward Shanhai Pass.', 'What was left of your file was kept on in the coastal garrisons, mending walls and drilling the new men.'], btn: 'Winter 1625 →' }],
    card: ['Winter 1625. Every fort beyond the Pass is being abandoned on the new commissioner\'s orders — except one. Your file walks the coast road to Ningyuan by night. E answers; Enter (twice) marches on.', '寧遠道 · The road to Ningyuan'],
    winT: '寧遠 · Ningyuan', winX: 'Your file walked in through the gate of Ningyuan before dawn.',
    after: [{ title: '寧遠 · Ningyuan', year: 'The twelfth month of 1625', p: ['That autumn the new commissioner, Gao Di, ordered every fort beyond Shanhai Pass abandoned. The garrisons burned what they could not carry and streamed back toward the Pass, and the people of the forts went with them; many died on the road in the cold.',
      'One man refused. Yuan Chonghuan, the intendant at Ningyuan, stayed with fewer than twenty thousand men in a small walled town on the Bohai coast, far from any help.', 'Your file walks in through the gate before dawn. In a few weeks Nurhaci will cross the frozen Liao River with the Eight Banners.'],
      zh: '我寧前道也，官此，當死此，我必不去。— Yuan Chonghuan, in the History of Ming', btn: 'To be continued →' }],
    go: () => { if (typeof zStart3 === 'function') zStart3('ch3'); else location.reload(); },
    beats: [
      { ph: 0, t: 5, who: { a: zrAny(ZRV.concat(ZRN)), b: zrAny(ZRV.concat(ZRN)), f: ['fang', 'he', 'lou', 'luo', 'bao', 'xiaoman', 'shao', 'wang', 'jin', 'ye', 'du', 'zhu', 'liu6'] }, lines: [['a', '五年了。遼陽沒了，廣寧也沒了。', 'Five years. Liaoyang is gone. Guangning too.'], ['b', '高經略說關外不守了，全撤回山海關。', 'Commissioner Gao says nothing beyond the Pass is to be held. Everyone back to Shanhai Pass.'], ['f', '只有袁道台不走。他說：「我寧前道也，官此，當死此，我必不去。」', 'Only Intendant Yuan won\'t go. He said: "I am the intendant of Ning-Qian. My post is here, and here I will die. I will not leave."']] },
      { ph: 0, t: 24, who: { v: zrAny(ZRV.concat(ZRN)), w: zrAny(ZRV.concat(ZRN)) }, make: () => { const d = zrDead2()[0];
        if (!d) return { lines: [['v', '渾河那天，我們一個都沒丟。', 'At the Hun River we didn\'t lose a single man.'], ['w', '五年了，就這件事，我服你。', 'Five years, and that\'s the one thing I\'ll give you.']] };
        return { lines: [['v', `渾河那天，${d.zh}……`, `That day at the Hun River, ${d.en}...`], ['w', '別說了。看路。', 'Don\'t. Watch the road.']],
          reply: { q: `Say ${d.en}'s name`, me: [`${d.zh}。我記得。`, `${d.en}. I remember.`], a: [['v', '我們都記得。', 'We all remember.']] } }; } },
      { ph: 0, t: 40, who: { s: ['bao', 'xiaoman', 'shao', 'luo', 'jin'] }, lines: [['s', '海風好冷。寧波的海是暖的。', 'The sea wind is so cold. The sea at home is warm.']] },
      { ph: 1, t: 15, who: { v: zrAny(ZRV.concat(ZRN)) }, lines: [['v', '別開銃！看清楚再說。', 'Don\'t fire! Look first.']] },
      { ph: 1, t: 24, who: { l: ['luo', 'du', 'wang', 'bao'], s: ['shao', 'xiaoman', 'liu6', 'ye'] }, lines: [['l', '鹿都比人膽子大，敢在這地方走。', 'Even the deer are braver than men, walking about out here.'], ['s', '嘿。', 'Heh.']],
        reply: { q: 'Tell the sentries to stay sharp', me: ['別鬆勁。鹿不會半夜來，人會。', 'Stay sharp. Deer don\'t come at midnight. Men do.'], a: [['l', '是。', 'Yes.']] } },
      { ph: 2, t: 3, who: { v: zrAny(ZRV.concat(ZRN)) }, lines: [['v', '別讓他們摸到路上來！', 'Don\'t let them onto the road!']] },
      { ph: 3, t: 2, who: { v: zrAny(ZRV.concat(ZRN)), f: ['fang', 'he', 'lou', 'luo', 'bao', 'xiaoman', 'shao'] }, lines: [['v', '他們回去報信了。大軍不遠了。', 'They\'ve gone back to report. The main army isn\'t far behind.'], ['f', '那就進城吧。寧遠的牆，是袁道台這幾年一塊磚一塊磚修起來的。', 'Then into the town. Intendant Yuan has spent these years building Ningyuan\'s walls up brick by brick.']] },
      { ph: 3, t: 22, who: { a: zrAny(ZRV.concat(ZRN)) }, lines: [['a', '看——城上有燈。', 'Look — lights on the wall.']] },
    ] },
};
const ZRD = { on: false, key: '', q: [], qT: 0, wait: null, prompt: null, done: {}, skipT: 0, el: null, hint: null, last: 0 };
// the living man of the file for a slot: a roster key, a list (the first of them on his feet), or zrAny(list) (any of them)
function zrUnit(spec, taken) {
  const sim = state.sim, h = localHero(); if (spec === 'me') return h && !h.dead ? h.id : -1;
  let keys = typeof spec === 'string' ? [spec] : spec.r ? spec.r.slice().sort(() => Math.random() - 0.5) : spec;
  for (const k of keys) for (const uid in ZB.map) { const r = ZR[ZB.map[uid]], u = sim.units[uid]; if (!r || r.k !== k || !u || u.dead || u.downed || u.wounded || taken[uid] || (h && +uid === h.id)) continue; return +uid; }
  return -1;
}
function zrSay(id, zh, en) {
  const sim = state.sim, u = sim && sim.units[id]; if (!u || u.dead || u.downed) return; const h = localHero(); const me = h && id === h.id;
  SPEECH.say(id, zh, en, { prio: 3, who: me ? `${ZS.name.zh} ${ZS.name.en}` : undefined, dur: Math.min(7.5, 2.8 + en.length / 20) });
}
function zrQueue(lines, ids) { for (const [s, zh, en] of lines) { const id = s === 'me' ? (localHero() || {}).id : ids[s]; if (id === undefined || id < 0) continue; ZRD.q.push({ id, zh, en, gap: Math.min(6.5, 2.2 + en.length / 24) }); } }
function zrBond(ids, s) { const k = ids[s] !== undefined && ZB.map[ids[s]] !== undefined ? ZR[ZB.map[ids[s]]].k : null; if (k) { ZS.bond[k] = (ZS.bond[k] || 0) + 1; zSave(); } }
function zRoadUI() {
  if (!ZRD.el) { const e = document.createElement('div'); e.id = 'zroadPr'; document.body.appendChild(e); ZRD.el = e; const k = document.createElement('div'); k.id = 'zroadHint'; k.innerHTML = '<kbd>Enter</kbd> march on'; document.body.appendChild(k); ZRD.hint = k; }
}
function zRoadStop() { ZRD.on = false; ZRD.q.length = 0; ZRD.prompt = null; if (ZRD.el) ZRD.el.hidden = true; if (ZRD.hint) ZRD.hint.hidden = true; }
function zRoadTick(dt) {
  const sim = state.sim, D = ZROAD[ZRD.key]; if (!ZRD.on || !sim || !sim.mission || !sim.mission.road || !D) return;
  if (state.ended) { zRoadStop(); return; }
  ZRD.hint.hidden = false; if (ZRD.skipT > 0) ZRD.skipT -= dt;
  if (ZRD.q.length) { ZRD.qT -= dt; if (ZRD.qT <= 0) { const L = ZRD.q.shift(); zrSay(L.id, L.zh, L.en); ZRD.qT = L.gap; } return; }
  if (ZRD.qT > 0) { ZRD.qT -= dt; return; }
  if (ZRD.wait) { ZRD.prompt = ZRD.wait; ZRD.wait = null; ZRD.prompt.t = 9; ZRD.el.innerHTML = `<kbd>E</kbd>${ZRD.prompt.q}`; ZRD.el.hidden = false; }
  if (ZRD.prompt) { ZRD.prompt.t -= dt; if (ZRD.prompt.t <= 0) { ZRD.prompt = null; ZRD.el.hidden = true; } return; }
  const ph = sim.mv.ph; if (ph < 0) return; const el = (sim.tick - sim.mv.t0) / 30, h = localHero(); if (!h || h.dead) return;
  for (let i = 0; i < D.beats.length; i++) { const b = D.beats[i]; if (ZRD.done[i] || b.ph !== ph || el < b.t) continue;
    if (el > b.t + 25) { ZRD.done[i] = 1; continue; }
    const ids = {}, taken = {}; let ok = true; for (const s in b.who) { const id = zrUnit(b.who[s], taken); if (id < 0) { ok = false; break; } ids[s] = id; taken[id] = 1; }
    if (!ok) continue;
    let near = true; for (const s in ids) { const u = sim.units[ids[s]]; if (Math.hypot(u.x - h.x, u.z - h.z) > 18) near = false; } if (!near && el < b.t + 10) continue;
    ZRD.done[i] = 1; const m = b.make ? b.make() : b; if (!m) continue;
    zrQueue(m.lines || [], ids); if (m.reply) ZRD.wait = Object.assign({ ids }, m.reply); ZRD.qT = 0; break; }
}
function zRoadKey(e) {
  if (!ZRD.on || !state.sim || !state.sim.mission || !state.sim.mission.road || state.ended || Input.cmdMode) return;
  if (e.code === 'KeyE' && ZRD.prompt) { e.preventDefault(); e.stopImmediatePropagation(); const P = ZRD.prompt; ZRD.prompt = null; ZRD.el.hidden = true;
    ZRD.q.push({ id: localHero().id, zh: P.me[0], en: P.me[1], gap: Math.min(6.5, 2.2 + P.me[1].length / 24) }); zrQueue(P.a, P.ids); if (P.bond) zrBond(P.ids, P.bond); ZRD.qT = 0; return; }
  if (e.code === 'Enter' && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); const sim = state.sim, h = localHero();
    const foe = h && sim.teamAlive[1].some(u => !u.inactive && Math.hypot(u.x - h.x, u.z - h.z) < 45);
    if (foe) { toast('Not with the enemy this close'); return; }
    if (ZRD.skipT <= 0) { ZRD.skipT = 3; toast('Press Enter again to march on'); return; }
    zRoadSkip(); }
}
window.addEventListener('keydown', zRoadKey, true);
function zRoadDone() { const D = ZROAD[ZRD.key]; ZS.flags['road' + ZRD.key] = 1; ZS.stage = D.next; zSave(); zRoadStop(); }
function zRoadSkip() { const D = ZROAD[ZRD.key]; zRoadDone(); state.ended = true; zCards(D.after, D.go); }
function zStartR(scene) {
  ZS = zLoad(); if (!ZS) { ZS = zFresh(); }
  const key = scene.slice(4), D = ZROAD[key]; if (!D) return;
  $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  if (D.pre && !ZS.flags['pre' + key]) { ZS.flags['pre' + key] = 1; zSave(); zCards(D.pre, () => zStartR(scene)); return; }
  const lead = key !== 'A', seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, yyRole: lead ? 'lead' : 'shield', connected: true }];
  startGame({ seed, battle: 'zroad', mode: 'campaign', mission: D.mission, camp: D.camp, players: pl }, 0, null, 1);
  const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq]; const meK = lead ? (ZS.me || 'me') : 'me', meIdx = ZR.findIndex(r => r.k === meK);
  ZB = { map: {}, sq: q.id, first: me.heroId, cur: meK, fell: false, ch2: lead, road: key };
  const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = meIdx;
  const file = lead ? zFile2().filter(r => ZS.alive[r.k] !== false) : ZR.filter(r => !r.ch && r.k !== 'me' && ZS.alive[r.k] !== false);
  const left = []; for (const r of file) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role === r.role); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } else left.push(r); }
  for (const r of left) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role !== 'lead'); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } }
  for (const uid in ZB.map) zDress(sim.units[uid], ZB.map[uid]);
  zRoadUI(); Object.assign(ZRD, { on: true, key, q: [], qT: 0, wait: null, prompt: null, done: {}, skipT: 0, last: performance.now() });
  const loop = () => { if (state.sim !== sim || !ZRD.on) return; const now = performance.now(); zRoadTick(Math.min(0.1, (now - ZRD.last) / 1000)); ZRD.last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  setTimeout(() => storyCard(D.card[0], D.card[1]), 700);
}
function zheFinishR(winner) {
  const sim = state.sim, D = ZROAD[ZB.road]; ZRD.key = ZB.road; const won = winner === sim.mission.side; zRoadDone();
  let hurt = 0; for (const uid in ZB.map) { const u = sim.units[uid]; if (u && (u.downed || u.wounded || u.dead)) hurt++; }
  $('resultTitle').textContent = won ? D.winT : '散 · Scattered on the road'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? D.winX : 'The column picked up what was left of you on the road.'}${hurt ? ` ${hurt} of your file ${hurt > 1 ? 'were' : 'was'} knocked about, and walk on bandaged.` : ''}`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'On →';
  $('btnNext').onclick = () => { $('result').hidden = true; zCards(D.after, D.go); };
}
