// ===== 話 · Speech: men talk where they stand =====
// Lines appear as bilingual captions over the speaker's head, only within earshot. A small director keeps it readable:
// at most two lines at once, a cooldown per speaker, and the more important line wins.
const SPEECH = (() => {
  const MAX = 2, live = [], cool = {}, pool = []; let pollT = 0, globalT = 0, lastHp = 1, cavT = 0, bleedT = 0, sqOrd = {}, lastSt = {}, wndT = 0;
  const v3 = new THREE.Vector3();
  const unit = (id) => state.sim && id >= 0 ? state.sim.units[id] : null;
  function nameOf(id) {
    if (typeof ZB !== 'undefined' && ZB && ZB.map[id] !== undefined) { const r = ZR[ZB.map[id]]; return r ? { zh: r.zh, en: r.en } : null; }
    if (typeof ZC !== 'undefined' && ZC && ZC.map[id] !== undefined) { const r = ZR[ZC.map[id]]; return r ? { zh: r.zh, en: r.en } : null; }
    if (typeof SOLD !== 'undefined' && SOLD && SOLD.map && SOLD.map[id]) return SOLD.map[id].name;
    return null;
  }
  function el() { let e = pool.pop(); if (!e) { e = document.createElement('div'); e.className = 'spk'; document.body.appendChild(e); } e.style.opacity = 0; e.hidden = false; return e; }
  function listener() { const r = state.renderer; return r ? r.camera.position : null; }
  // say(unitId, zh, en, opts): opts.prio (0 bark … 3 story), opts.loud (scripted: heard farther), opts.radio (fall back to the radio panel), opts.who (name override), opts.shout
  function say(id, zh, en, o) {
    o = o || {}; const u = unit(id); const L = listener(); const now = performance.now() / 1000; const prio = o.prio || 0;
    const range = o.loud ? 48 : 26;
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
    for (let i = live.length - 1; i >= 0; i--) { const l = live[i]; l.t += dt; const u = unit(l.id);
      if (l.t > l.dur || !u || (u.dead && l.t > 0.8)) { kill(i); continue; }
      // the caption rides the drawn body, not the 30 Hz sim position
      const al = r.alpha === undefined ? 1 : Math.max(0, Math.min(1, r.alpha)); v3.set(u.px + (u.x - u.px) * al, u.py + (u.y - u.py) * al + (u.mounted ? 2.9 : 2.15), u.pz + (u.z - u.pz) * al); const d = cam.position.distanceTo(v3); v3.project(cam);
      { const me = state.sim.players[state.localIdx]; if (me && l.id === me.heroId && r.lastMode === 'fp') { // your own voice: a subtitle at the bottom of the screen, not a caption over your own head
        l.e.style.transform = `translate(${(W / 2).toFixed(1)}px, ${(H * 0.8).toFixed(1)}px) translate(-50%, -100%)`; l.e.style.opacity = Math.min(1, l.t * 5, (l.dur - l.t) * 2).toFixed(2); continue; } }
      if (v3.z > 1 || Math.abs(v3.x) > 1.15 || Math.abs(v3.y) > 1.2) { l.e.style.opacity = 0; continue; }
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
  return { say, frame, event, orderChain, nameOf, speaking };
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
    for (const uid in map) { const u = sim.units[uid]; if (!u || u.dead || (h && +uid === h.id)) continue; const rr = ZR[map[uid]]; if (!rr || rr.k === 'me') continue;
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
const ZKEY = 'mingZhe';
let ZS = null, ZB = null, ZC = null; // save, battle mapping, camp mapping
function zLoad() { try { return JSON.parse(localStorage.getItem(ZKEY) || 'null'); } catch (e) { return null; } }
function zSave() { try { localStorage.setItem(ZKEY, JSON.stringify(ZS)); } catch (e) { } }
function zFresh(name) { const s = { v: 1, stage: 'camp0', name: name || { zh: '阿明', en: 'Aming' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, me: 'me' }; for (const r of ZR) { s.alive[r.k] = true; s.bond[r.k] = 0; } return s; }
const zRow = (k) => ZR.find(r => r.k === k);
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
  const S0 = ZS, dead = (x) => !S0.alive[x], lost = ZR.filter(r => r.k !== 'me' && r.k !== k && !S0.alive[r.k]).map(r => r.zh);
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
  ZR.forEach((r, i) => { const a = -0.5 + (i / ZR.length) * Math.PI * 1.55 + Math.PI * 0.55; const bx = Math.sin(a) * 6.3, bz = Math.cos(a) * 6.3; const alive = ZS.alive[r.k];
    beds.push([+bx.toFixed(2), +bz.toFixed(2), +(a + Math.PI).toFixed(3), !alive]);
    if (r.k === 'me' || r.k === ZS.me || !alive) return; const sp = ZCAMP.spots[r.k]; const [x, z] = sp; const tx = r.k === 'zhu' || r.k === 'wang' ? 8 : 0, tz = r.k === 'zhu' || r.k === 'wang' ? -5 : 0;
    npcs.push({ role: r.role, x, z, yaw: +Math.atan2(tx - x, tz - z).toFixed(3), ci: i, pose: night === 1 && r.k !== 'zhu' ? 'squat' : sp[2] }); });
  const mb = beds[2]; ZC = { bed: [mb[0], mb[1]] };
  return { fires: ZCAMP.fires, tents: ZCAMP.tents, props: ZCAMP.props, bedrolls: beds, npcs, me: { x: 0.4, z: -3.4, yaw: 0, role: 'shield' } };
}
function zStart(scene) {
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
    ZR.forEach((r, i) => { if (r.k === 'me') return; const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role === r.role); if (id !== undefined) { used[id] = 1; ZB.map[id] = i; } });
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
  return best ? { u: best, k: ZR[best.ci].k } : null;
}
function zheKeyE() {
  if (!ZC || !state.sim || !state.sim.mission || !state.sim.mission.camp) return false;
  if (state.zheDlg) return true; const t = zLook(); if (!t) return true;
  if (t.bed) { zSleep(); return true; }
  zDialog(t.k, t.u); return true;
}
function zSleep() {
  if (ZC.night === 0) { ZS.stage = 'battle1'; zSave(); zCards([{ title: '黎明 · Dawn', year: 'April 1619', p: ['Drums before light. The column breaks camp and climbs on into the valleys. Ahead, somewhere, is Hetu Ala; behind, the guns and the grain carts are already falling back along the track.', 'Chief Wu walks down the file, tugging straps and checking match-cord. "Twelve men," he says. "One life."'], btn: 'March →' }], () => zGo('battle1')); }
  else { ZS.stage = 'end1'; zSave(); zCards([{ title: '第一章終 · End of Chapter One', year: 'Abudali Pass, April 1619', p: [`${ZR.filter(r => r.k !== 'me' && ZS.alive[r.k]).length} of your file sleep around the embers. In the morning you will walk south out of the mountains with the remnants of Liu Ting's army.`, 'Two years later, in the spring of 1621, what is left of the Zhejiang men will stand with the Sichuan White Poles on the south bank of the Hun River, outside Shenyang.'], zh: '第二章 · 渾河 · Hun River, 1621 — 待續 · to be continued', btn: 'Back to the menu' }], () => { location.reload(); }); }
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
  const W = { liu: ['劉綎', 'General Liu Ting'], chief: ['吳老栓', 'Chief Wu'], fang: ['方秀才', 'Fang the Scholar'], lookout: ['', 'Lookout'], soldier: ['', 'A soldier'], rider: ['', 'A rider in Ming colours'] }[ev.who] || ['', ev.who];
  let id = -1;
  if (ev.who === 'liu') { const g = sim.mg.liu; id = g ? sim.players[g.p].heroId : -1; }
  else if (ev.who === 'chief' || ev.who === 'fang') { const want = ev.who === 'chief' ? 0 : 8; for (const uid in ZB.map) if (ZB.map[uid] === want) id = +uid; }
  if (id >= 0 && sim.units[id] && sim.units[id].dead) id = -1;
  if (id < 0 && h) { const q = sim.squads[ZB.sq]; const cand = sim.teamAlive[h.team].filter(u => u.id !== h.id && !u.wounded && u.type !== 'horse' && Math.hypot(u.x - h.x, u.z - h.z) < 22 && (ev.who !== 'rider' || !q.unitIds.includes(u.id))); if (cand.length) id = cand[Math.floor(Math.random() * cand.length)].id; }
  const ok = id >= 0 && SPEECH.say(id, ev.zh, ev.text, { prio: 3, loud: true, radio: true, who: W[0] ? `${W[0]} ${W[1]}` : W[1], dur: Math.min(8, 3 + ev.text.length / 20), shout: ev.who === 'liu' || ev.who === 'lookout' ? 0.3 : false });
  if (!ok && typeof radio === 'function') radio(W[0] ? `${W[0]} ${W[1]}` : W[1], `${ev.zh ? ev.zh + '  ' : ''}${ev.text}`);
  return true;
}
function zheEvent(ev) {
  const sim = state.sim; if (!ZB || !sim || !sim.mission || !sim.mission.soldier) return; const me = sim.players[state.localIdx];
  if (ev.t === 'zpromote' && ev.p === state.localIdx) { state.fpSel = null; const q = sim.squads[ev.sq]; const w = q.unitIds.map(id => sim.units[id]).find(u => !u.dead && u.ctrl < 0 && !u.wounded);
    if (w) setTimeout(() => SPEECH.say(w.id, `隊長沒了！${ZS.name.zh}，你說怎麼走？`, `The chief is dead! ${ZS.name.en}, you're senior now — what do we do?`, { prio: 3, dur: 5 }), 1600);
    banner('你領隊 · The file is yours', 'Chief Wu is dead. F follow me / H halt / C charge / Z form up where you look', 6); }
  else if (ev.t === 'zwound' && ev.p === state.localIdx) { ZB.wounded = ev.id; const u = sim.units[ev.id]; const n = SPEECH.nameOf(ev.id);
    SPEECH.say(ev.id, '我的腿……走不了了！', 'My leg... I can\'t walk!', { prio: 3, dur: 4 }); toast(`${n ? n.zh + ' ' + n.en : 'A man of your file'} is hit and can't walk. Get to him and press E to get him up`); }
  else if (ev.t === 'zhelp' && ev.id === ZB.wounded) { ZS.flags.helped6 = true; feed(`You get ${(SPEECH.nameOf(ev.id) || { en: 'him' }).en}'s arm over your shoulder`, true); }
  else if (ev.t === 'zcarry' && ev.p === state.localIdx) { const k = ZB.map[ev.id]; ZB.fell = true; const prev = ZB.cur; if (prev && ZS.alive[prev] !== false) { ZB.deadMe = ZB.deadMe || []; ZB.deadMe.push(prev); }
    ZB.cur = k !== undefined ? ZR[k].k : 'stranger'; const n = SPEECH.nameOf(ev.id); const h = sim.units[ev.id]; if (h) { Input.yaw = h.yaw; Input.pitch = 0; }
    toast(n ? `You fall. The fight goes on — you are ${n.zh} ${n.en} now` : 'You fall. The fight goes on — you are another man of the column now'); }
}
function zheObjLines() {
  const sim = state.sim; if (!ZB) return ''; const h = localHero(); let n = 0, all = 0;
  for (const uid in ZB.map) { const u = sim.units[uid]; if (+uid === (h && h.id)) continue; all++; if (!u.dead && h && Math.hypot(u.x - h.x, u.z - h.z) < 24) n++; }
  let s = `<div class="ob"><i>伍</i><span>Your file with you: ${n} of ${all}</span></div>`;
  { let row = ''; for (const uid in ZB.map) { const u = sim.units[uid], rr = ZR[ZB.map[uid]]; if (!rr || +uid === (h && h.id)) continue; const cls = u.dead ? 'x' : u.wounded ? (u.helpedBy >= 0 ? 'w' : 'd') : u.hp < u.def.hp * 0.5 ? 'w' : 'a'; row += `<b class="zr ${cls}" title="${rr.en} · ${rr.t}">${u.dead ? '✕' : u.wounded ? (u.helpedBy >= 0 ? '✚' : '▼') : '●'} ${rr.zh}</b>`; } s += `<div class="zroster">${row}</div>`; } // every man of the file by name: ● fighting, ✚ wounded, ▼ down, ✕ dead
  if (ZB.wounded !== undefined) { const u = sim.units[ZB.wounded]; s += `<div class="ob${u.helpedBy >= 0 ? ' done' : ''}"><i>!</i><span>${u.dead ? 'Chen Xiaoliu is dead' : u.helpedBy >= 0 ? 'Chen Xiaoliu is on his feet' : 'Get Chen Xiaoliu up (E beside him)'}</span></div>`; }
  return s;
}
function zheFinish(winner) {
  const sim = state.sim, h = localHero(); if (!ZB) return; const M = sim.mission, z = sim.missionZone('mouth'); const won = winner === M.side;
  const fate = {}; const near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const k = ZR[ZB.map[uid]].k; const u = sim.units[uid]; if (u.dead) { fate[k] = 'dead'; continue; }
    const out = (near(u, won ? 26 : 12) || (z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10)) && !(u.wounded && u.helpedBy < 0 && !near(u, 4)); fate[k] = out ? 'out' : 'lost'; }
  for (const k of ZB.deadMe || []) fate[k] = 'dead';
  if (fate.me === undefined) fate.me = h && !h.dead ? 'out' : 'dead';
  // you go on as whoever you became
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger' && fate.me === 'dead') { const nk = ZB.cur; ZS.me = nk; ZS.oldName = ZS.name; ZS.name = { zh: zRow(nk).zh, en: zRow(nk).en }; }
  for (const r of ZR) { const f = fate[r.k] || 'lost'; ZS.fate[r.k] = f; ZS.alive[r.k] = f === 'out'; }
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger') ZS.alive[ZB.cur] = !!(h && !h.dead);
  ZS.alive.me = fate.me === 'out' || (ZB.cur && ZB.cur !== 'me'); // you live on in whoever carried on
  ZS.flags.saved6 = ZS.alive.liu6 && !!ZS.flags.helped6; ZS.stage = 'camp1'; zSave();
  const li = ZR.map(r => { const f = ZS.fate[r.k] || 'lost'; const nm = r.k === 'me' ? `${ZS.name.zh} ${ZS.name.en} (you)` : `${r.zh} ${r.en}`; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${nm} — ${f === 'out' ? 'came out of the pass' : f === 'dead' ? 'killed' : 'missing in the valley'}</li>`; }).join('');
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
function zheHUD(dt) {
  zTags();
  const sim = state.sim; let pr = $('zhePrompt');
  if (sim && sim.mission && sim.mission.camp) $('status').style.visibility = 'hidden';
  if (!sim || !sim.mission || !sim.mission.camp || !ZC || state.zheDlg) { if (pr) pr.hidden = true; return; }
  if (!pr) { pr = document.createElement('div'); pr.id = 'zhePrompt'; document.body.appendChild(pr); }
  const t = zLook(); pr.hidden = !t; if (t) pr.innerHTML = t.bed ? '<kbd>E</kbd>Lie down on your bedroll' + (ZC.night ? '' : ' — march at dawn') : `<kbd>E</kbd>Talk to ${ZR[t.u.ci].zh} ${ZR[t.u.ci].en}`;
  // the camp murmurs: men talk to each other when you pass
  ZC.chatT -= dt; if (ZC.chatT <= 0) { ZC.chatT = 7 + Math.random() * 6; const h = localHero(); if (!h) return; const near = sim.units.filter(u => u.camp && Math.hypot(u.x - h.x, u.z - h.z) < 14); if (!near.length) return; const u = near[Math.floor(Math.random() * near.length)];
    const P0 = [['這鬼地方，四月還下雪。', 'Snow in April. What a place.'], ['明天走多少里？', 'How many li tomorrow?'], ['聽說赫圖阿拉的城是木頭的。', 'They say the walls of Hetu Ala are made of logs.'], ['腳上的凍瘡又裂了。', 'My chilblains have split open again.'], ['誰還有菸葉？', 'Anyone got tobacco?'], ['義烏這時候該插秧了。', 'Back in Yiwu they\'ll be planting the rice now.']];
    const P1 = [['……', '...'], ['火別讓它滅了。', 'Don\'t let the fire go out.'], ['明天往南走。', 'Tomorrow we go south.'], ['我閉上眼睛就看見西嶺上的旗。', 'When I close my eyes I see the banners on the west ridge.']];
    const L = (ZC.night ? P1 : P0)[Math.floor(Math.random() * (ZC.night ? P1 : P0).length)]; SPEECH.say(u.id, L[0], L[1], { prio: 0, cool: 10 }); }
}
function zMenu() {
  const s = zLoad(); const b = $('btnZhe'), nb = $('btnZheNew'); if (!b) return;
  const cont = s && s.stage && s.stage !== 'end1'; b.textContent = cont ? 'Continue' : s ? 'Play again' : 'Begin'; nb.hidden = !cont;
  const begin = () => { AUDIO.init(); AUDIO.play('ui'); ZS = zFresh(); zSave(); zCards(INTRO, () => { ZS.stage = 'camp0'; zSave(); zStart('camp0'); }); };
  b.onclick = () => { if (cont) { AUDIO.init(); AUDIO.play('ui'); zStart(s.stage === 'after1' ? 'camp1' : s.stage); } else begin(); };
  nb.onclick = begin;
}
zMenu();
{ let go = null; try { go = localStorage.getItem('mingZheGo'); localStorage.removeItem('mingZheGo'); } catch (e) { } if (go) setTimeout(() => zStart(go), 60); }
