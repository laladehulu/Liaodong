// ===== 功過 · deeds: the story campaigns notice what you did in battle, and answer it =====
// What you did in each battle is kept in the campaign's own save (save.dd): kills, men you got up or carried, men
// you left, whether you held your place or ran, held your fire, stood over a downed friend... The camp, the men and
// the next battle answer it. Client-side and story-only (solo), so it never touches a co-op sim.
// It wraps the shared story entry points: zheEvent, zheHUD, zheKeyE, zheFinish, zTalk and the Jin chapter talk.
const DD = { B: null, zb: null, zc: null, acc: 0, kickTick: -99, fileKills: 0, killers: {}, firstShot: true, ranAt: -1, placeSince: 0, wrapped: new Set(), obj: null, camp: null };
const ddL = (zh, en) => [zh, en];
// which campaign is running, its save, its roster, and how to save it
function ddCtx() {
  if (((ZB && ZB.jin) || (ZC && ZC.jin)) && typeof JS !== 'undefined' && JS) return { c: 'jin', S: JS, save: () => jSave(), R: JR };
  if (ZS) return { c: ZS.sj ? 'sj' : 'zhe', S: ZS, save: () => zSave(), R: ZS.sj && typeof SR !== 'undefined' ? SR : ZR };
  return null;
}
function ddDD(S) { if (!S.dd) S.dd = { log: [], seen: {}, rep: { valor: 0, care: 0, disc: 0, cruel: 0, coward: 0 }, nick: null, keep: [] }; return S.dd; }
const ddRos = () => (ZB && ZB.R) || (ZC && ZC.R) || ZR;
const ddKey = (uid) => { if (!ZB) return null; const i = ZB.map[uid]; const r = i !== undefined ? ddRos()[i] : null; return r ? r.k : null; };
const ddRow = (k) => { for (const R of [ddRos(), (typeof JR !== 'undefined' ? JR : []), (typeof SR !== 'undefined' ? SR : []), ZR]) { const r = R.find(x => x.k === k); if (r) return r; } return null; };
const ddNm = (k, en) => { const r = ddRow(k); return r ? (en ? r.en : r.zh) : (en ? 'a comrade' : '弟兄'); };
function ddFresh(sim) {
  const M = sim.mission; return { m: sim.cfg.mission, title: (M.title || '').split(' · ').pop(), kills: 0, kf: 0, club: 0, kick: 0, off: 0, long: 0, early: 0, held: 0, blocks: 0, shield: 0,
    help: [], rev: [], aid: [], back: [], over: 0, overK: null, place: 0, ran: 0, rally: 0, alone: 0, last: 0, low: 1, fell: 0, beside: {}, left: [], relF: 0, pick: 0,
    avenge: [], saved: [], lad: 0, hurtK: 0, first: 0, lost: [], won: null };
}
// ---------- watching the battle ----------
function ddNearestFoe(sim, h) { let d = 1e9; for (const v of sim.units) { if (v.dead || v.team === h.team || v.type === 'horse' || v.inactive || v.def.ai === 'cannon') continue; const e = Math.hypot(v.x - h.x, v.z - h.z); if (e < d) d = e; } return d; }
function ddFile(sim, h) { const out = []; for (const uid in ZB.map) { if (h && +uid === h.id) continue; const u = sim.units[uid]; const k = ddKey(uid); if (u && k) out.push({ u, k }); } return out; }
function ddSample(dt) {
  const sim = state.sim, B = DD.B, h = localHero(); if (!sim || !B || !h || h.dead) return;
  DD.acc += dt; if (DD.acc < 0.25) return; const s = DD.acc; DD.acc = 0;
  const foe = ddNearestFoe(sim, h), q = sim.squads[ZB.sq], file = ddFile(sim, h);
  B.low = Math.min(B.low, h.hp / h.def.hp);
  const live = file.filter(f => !f.u.dead && !f.u.wounded);
  let cx = h.x, cz = h.z; if (live.length) { cx = live.reduce((a, f) => a + f.u.x, 0) / live.length; cz = live.reduce((a, f) => a + f.u.z, 0) / live.length; } else if (q && q.alive) { cx = q.cx; cz = q.cz; }
  const dFile = Math.hypot(h.x - cx, h.z - cz), near = live.some(f => Math.hypot(f.u.x - h.x, f.u.z - h.z) < 10);
  if (foe < 25 && dFile < 7) { B.place += s; DD.placeSince += s; if (B.ran > 4 && DD.placeSince > 20) B.rally = 1; }
  // running: well away from the file, moving away from the enemy, not badly hurt
  if (foe < 30 && dFile > 18 && h.hp > h.def.hp * 0.5) { let best = null, bd = 1e9; for (const v of sim.units) { if (v.dead || v.team === h.team || v.type === 'horse') continue; const e = Math.hypot(v.x - h.x, v.z - h.z); if (e < bd) { bd = e; best = v; } }
    if (best) { const vx = h.x - h.px, vz = h.z - h.pz, ex = best.x - h.x, ez = best.z - h.z; if (vx * ex + vz * ez < -0.02) { B.ran += s; DD.placeSince = 0; } } }
  if (foe < 15 && !near && dFile > 12) B.alone += s;
  if (foe < 15) for (const f of live) if (Math.hypot(f.u.x - h.x, f.u.z - h.z) < 4) B.beside[f.k] = (B.beside[f.k] || 0) + s;
  for (const f of file) if (f.u.downed && !f.u.dead && Math.hypot(f.u.x - h.x, f.u.z - h.z) < 2.5 && foe < 8) { B.over += s; B.overK = f.k; }
  if (file.length >= 3 && foe < 20 && !live.length) B.last = 1;
}
function ddEvent(ev) {
  const sim = state.sim, B = DD.B, h = localHero(); if (!sim || !B || !ZB) return;
  const me = h ? h.id : -1;
  if (ev.t === 'death') { const v = sim.units[ev.id]; if (!v || v.type === 'horse') return;
    const fk = ZB.map[ev.id] !== undefined && ev.id !== me ? ddKey(ev.id) : null;
    if (fk) { B.lost.push(fk); if (ev.killer >= 0) DD.killers[ev.killer] = fk; return; }
    const kr = ev.killer >= 0 ? sim.units[ev.killer] : null;
    if (kr && ZB.map[ev.killer] !== undefined && v.team !== kr.team) { if (DD.fileKills === 0 && ev.killer === me) B.first = 1; DD.fileKills++; }
    if (ev.killer !== me || !h || v.team === h.team) return;
    B.kills++; const sq = v.squad >= 0 ? sim.squads[v.squad] : null;
    if (sq && sq.routing) B.kf++;
    if (v.type === 'hero' || v.officer || v.type === 'shinsengumi') B.off++;
    if (h.club) B.club++; if (sim.tick - DD.kickTick < 20) B.kick++;
    if (h.hp < h.def.hp * 0.3) B.hurtK++;
    if (DD.killers[ev.id]) { B.avenge.push(DD.killers[ev.id]); delete DD.killers[ev.id]; }
    const t = v.target >= 0 ? sim.units[v.target] : null; if (t && t.id !== me && ZB.map[t.id] !== undefined && (t.wounded || t.hp < t.def.hp * 0.5)) { const k = ddKey(t.id); if (k && !B.saved.includes(k)) B.saved.push(k); }
    return; }
  if (ev.t === 'kick' && ev.id === me) DD.kickTick = sim.tick;
  else if (ev.t === 'shot' && ev.shooter === me && h) { const foe = ddNearestFoe(sim, h);
    if (ev.victim >= 0 && ev.from && ev.to && Math.hypot(ev.to[0] - ev.from[0], ev.to[2] - ev.from[2]) > 60) B.long++;
    if (foe > 75) B.early++; if (DD.firstShot) { DD.firstShot = false; if (foe < 40) B.held = 1; } }
  else if (ev.t === 'block' && ev.by === me && h) { B.blocks++; if (ddFile(sim, h).some(f => !f.u.dead && (f.u.wounded || f.u.hp < f.u.def.hp * 0.4) && Math.hypot(f.u.x - h.x, f.u.z - h.z) < 2.6)) B.shield++; }
  else if (ev.t === 'zhelp' && ev.by === me) { const k = ddKey(ev.id); if (k) { B.help.push(k); const P = sim.mission.phases[Math.max(0, sim.mv.ph)]; if (P && P.obj && P.obj.extract) B.back.push(k); } }
  else if (ev.t === 'zrevive' && ev.by === me) { const k = ddKey(ev.id); if (k) B.rev.push(k); }
  else if (ev.t === 'zaid' && ev.by === me) { const k = ddKey(ev.id); if (k) B.aid.push(k); }
  else if (ev.t === 'reload' && ev.id === me && h && ddNearestFoe(sim, h) < 15) B.relF++;
  else if (ev.t === 'pickup' && ev.id === me) B.pick++;
  else if (ev.t === 'sgpush' && ev.id === me) B.lad++;
  else if (ev.t === 'zcarry' && ev.p === state.localIdx) B.fell = 1;
}
// what the battle comes to: a few short lines of merit (功) and demerit (過)
function ddVerdict(B) {
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i), plus = [], minus = [], N = (k) => ddNm(k, true);
  const saved = uniq(B.help.concat(B.rev, B.aid));
  if (saved.length) plus.push(['救', `got ${saved.map(N).join(', ')} out`]);
  if (B.saved.length) plus.push(['護', `cut down the man over ${B.saved.map(N).join(', ')}`]);
  if (B.avenge.length) plus.push(['報', `avenged ${uniq(B.avenge).map(N).join(', ')}`]);
  if (B.over >= 3) plus.push(['守', `stood over ${N(B.overK)}`]);
  if (B.off) plus.push(['斬', `${B.off} officer${B.off > 1 ? 's' : ''} or guards`]);
  if (B.kills) plus.push(['殺', `${B.kills} killed${B.club ? `, ${B.club} with the club` : ''}`]);
  if (B.held) plus.push(['忍', 'held fire till they were close']);
  if (B.lad) plus.push(['推', `pushed ${B.lad} ladder${B.lad > 1 ? 's' : ''} off the wall`]);
  if (B.last) plus.push(['孤', 'last of the file on his feet']);
  if (B.rally) plus.push(['回', 'broke, and came back']);
  if (B.place > 60 && !B.ran) plus.push(['陣', 'held his place in the file']);
  if (B.ran > 6 && !B.rally) minus.push(['退', 'ran from the fight']);
  if (B.left.length) minus.push(['棄', `left ${uniq(B.left).map(N).join(', ')} on the field`]);
  if (B.kf >= 2) minus.push(['追', `cut down ${B.kf} men who were running`]);
  if (B.early >= 3) minus.push(['妄', `fired ${B.early} shots out of range`]);
  if (B.alone > 25) minus.push(['失伍', 'left the file to fight alone']);
  return { plus, minus };
}
function ddFinish(winner) {
  const C = ddCtx(), sim = state.sim, B = DD.B; if (!C || !B || !sim) return;
  const h = localHero(), won = winner === sim.mission.side; B.won = won;
  // wounded men nobody brought along: only after a defeat or a breakout, when the field is left to the enemy
  const P = sim.mission.phases[Math.max(0, sim.mv.ph)], fled = !won || (P && P.obj && P.obj.extract);
  if (fled) for (const f of ddFile(sim, h)) { const u = f.u; if (!u.dead && u.wounded && !u.aided && u.helpedBy < 0 && (!h || Math.hypot(u.x - h.x, u.z - h.z) > 12)) B.left.push(f.k); }
  const D = ddDD(C.S), R = D.rep, uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
  R.valor += B.kills + 3 * B.off + 2 * B.avenge.length + 2 * B.lad + (B.last ? 3 : 0);
  R.care += 3 * uniq(B.help.concat(B.rev, B.aid)).length + 2 * B.saved.length + (B.over >= 3 ? 2 : 0) + B.shield;
  R.disc += Math.min(4, B.place / 40) + (B.held ? 2 : 0) - B.early / 2 - (B.alone > 25 ? 2 : 0);
  R.cruel += B.kf; if (B.ran > 6 && !B.rally) R.coward += 3; R.coward += 3 * uniq(B.left).length;
  B.n = D.log.length; D.log.push(B); DD.B = null; C.save();
}
function ddResultLine() {
  const C = ddCtx(); if (!C) return; const D = ddDD(C.S), B = D.log[D.log.length - 1]; if (!B || B.shown) return; B.shown = 1;
  const V = ddVerdict(B), el = $('resultText'); if (!el) return;
  const s = V.plus.slice(0, 3).map(p => `<span class="ddp">${p[0]} ${p[1]}</span>`).concat(V.minus.slice(0, 2).map(p => `<span class="ddm">${p[0]} ${p[1]}</span>`));
  if (s.length) el.innerHTML += `<div class="ddres">${s.join('')}</div>`;
}
// ---------- what the men say in camp ----------
// a few extra topics a man has because of the last battle you shared
function ddTopics(k) {
  const C = ddCtx(); if (!C || !C.S.dd) return null; const D = C.S.dd, B = D.log[D.log.length - 1]; if (!B) return null;
  const me = C.S.name || { zh: '你', en: 'you' }, out = [], g = [];
  const has = (a) => a.includes(k), hash = (s) => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) | 0; return Math.abs(x); };
  if (has(B.help) || has(B.rev) || has(B.aid)) { g.push(ddL(`${me.zh}。……你把我拖回來的。`, `${me.en}. ...You're the one who dragged me back.`));
    out.push({ q: 'How is the leg?', a: [ddL('還在。是你的，也是我的。', 'Still there. Half of it is yours.'), ddL('那時候我以為就到這裡了。你沒走。', 'I thought that was the end of me. You didn\'t leave.')], bond: 2 }); }
  else if (has(B.saved)) out.push({ q: 'That one nearly had you.', a: [ddL('他的刀都舉起來了……然後是你。', 'His blade was already up... and then you were there.'), ddL('我欠你一條命。', 'I owe you a life.')], bond: 2 });
  const bes = Object.entries(B.beside).sort((a, b) => b[1] - a[1]);
  if (bes.length && bes[0][0] === k && bes[0][1] > 15) out.push({ q: 'You were at my shoulder all day.', a: [ddL('你在旁邊，我就敢往前站。', 'With you beside me I dared to stand forward.'), ddL('下次還站一起。', 'Next time too.')], bond: 1 });
  if (B.avenge.length && !B.avenge.includes(k) && hash(k + B.n) % 3 === 0) { const d = B.avenge[0]; out.push({ q: `I got the man who killed ${ddNm(d, true)}.`, a: [ddL(`我看見了。${ddNm(d)}可以閉眼了。`, `I saw. ${ddNm(d, true)} can close his eyes now.`)], bond: 1 }); }
  if (B.last && hash(k) % 2 === 0) out.push({ q: 'I was the last one standing out there.', a: [ddL('我們都看見了。一個人，背對著我們，還在打。', 'We all saw. One man, his back to us, still fighting.'), ddL('別再這樣了。下次等我們。', 'Don\'t do it again. Wait for us next time.')], bond: 1 });
  if (B.held && hash(k) % 3 === 1) out.push({ q: 'You held your fire well.', a: [ddL('是你先忍住的。你不放，我們誰也不敢放。', 'You held first. While you didn\'t fire, none of us dared to.')], bond: 1 });
  if (B.kf >= 2 && hash(k + 'kf') % 3 === 0) { out.push({ q: 'You\'re looking at me strangely.', a: [ddL('那些人已經在跑了。你還是砍了。', 'Those men were already running. You cut them down anyway.'), ddL('我不是說你錯。我只是看見了。', 'I\'m not saying you were wrong. I just saw it.')], flag: 'ddfear:' + k }); }
  const L = B.left.filter((x, i, a) => a.indexOf(x) === i); if (L.length && hash(k + 'l') % 2 === 0) out.push({ q: `About ${ddNm(L[0], true)}...`, a: [ddL(`你走的時候，${ddNm(L[0])}還活著。`, `When you left, ${ddNm(L[0], true)} was still alive.`), ddL('……我知道那時候顧不了。我知道。', '...I know there was no time. I know.')], bond: -1 });
  // the men who saw you run: half of them won't look at you
  if (B.ran > 6 && !B.rally && hash(k + 'r') % 2 === 0) return { g: ddL('……', '... (He looks at the fire, not at you.)'), t: [{ q: 'About the fight...', a: [ddL('別說了。我們都看見了。', 'Don\'t. We all saw.')], bond: -1 }] };
  return out.length || g.length ? { g: g[0] || null, t: out.slice(0, 2) } : null;
}
function ddAugment(D, k) { const X = ddTopics(k); if (!X) return D; if (!D) D = { g: X.g || ddL('……', '...'), t: [] };
  return { g: X.g || D.g, t: X.t.concat(D.t || []) }; }
// ---------- the roll by your bedroll ----------
function ddRollPos() { if (!ZC || !ZC.bed) return null; const [bx, bz] = ZC.bed, l = Math.hypot(bx, bz) || 1; return [bx + (bz / l) * 2.9, bz - (bx / l) * 2.9]; }
function ddCampObjects() {
  const r = state.renderer, p = ddRollPos(); if (!r || !r.scene || !p) return; const C = ddCtx(); if (!C || !ddDD(C.S).log.length) return;
  const g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: 0x6a4c2e }), paper = new THREE.MeshLambertMaterial({ color: 0xd8cba8 }), cloth = new THREE.MeshLambertMaterial({ color: 0x3a2a4a });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.46), wood); crate.position.y = 0.21; g.add(crate);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.36), cloth); book.position.set(0, 0.445, 0); book.rotation.y = 0.25; g.add(book);
  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.052, 0.33), paper); pg.position.set(0.012, 0.446, 0); pg.rotation.y = 0.25; g.add(pg);
  g.position.set(p[0], SIM.terrainH(p[0], p[1]), p[1]); r.scene.add(g); DD.obj = { roll: g };
}
function ddNearRoll() { const p = ddRollPos(), h = localHero(); if (!p || !h || !DD.obj) return false; const dx = p[0] - h.x, dz = p[1] - h.z, d = Math.hypot(dx, dz); if (d > 1.7) return false; return (dx * Math.sin(Input.yaw) + dz * Math.cos(Input.yaw)) / Math.max(d, 0.01) > 0.5; }
function ddRoll() {
  const C = ddCtx(); if (!C) return; const D = ddDD(C.S); const rows = D.log.map(B => { const V = ddVerdict(B);
    return `<div class="ddrow"><b>${B.title || B.m}</b>${V.plus.map(p => `<span class="ddp">${p[0]} ${p[1]}</span>`).join('')}${V.minus.map(p => `<span class="ddm">${p[0]} ${p[1]}</span>`).join('')}${!V.plus.length && !V.minus.length ? '<span class="ddn">nothing written</span>' : ''}</div>`; }).join('');
  zCards([{ title: '功過簿 · The roll', year: C.c === 'jin' ? 'Kept by the niru clerk' : 'Kept by the company clerk', html: `<div class="ddroll">${rows}</div>`, btn: 'Close' }], () => requestLock());
}
// ---------- wiring ----------
{ const _ev = zheEvent, _hud = zheHUD, _key = zheKeyE, _fin = zheFinish, _talk = zTalk;
  zheEvent = function (ev) { try { ddEvent(ev); } catch (e) { console.warn('deeds', e); } return _ev(ev); };
  zheHUD = function (dt) { const r = _hud(dt); try { ddFrame(dt); } catch (e) { console.warn('deeds', e); } return r; };
  zheKeyE = function () { if (ZC && state.sim && state.sim.mission && state.sim.mission.camp && !state.zheDlg && ddNearRoll()) { ddRoll(); return true; } return _key(); };
  zheFinish = function (w) { try { ddFinish(w); } catch (e) { console.warn('deeds', e); } const r = _fin(w); try { ddResultLine(); } catch (e) { } return r; };
  zTalk = function (k, night) { return ddAugment(_talk(k, night), k); }; }
function ddFrame(dt) {
  const sim = state.sim; if (!sim || !sim.mission) return;
  if (ZB && sim.mission.soldier && DD.zb !== ZB) { DD.zb = ZB; DD.B = ddFresh(sim); DD.fx = { cool: 0, charge: 0, aloneT: 0, blk: 0, start: false, mark: 0 }; DD.fileKills = 0; DD.killers = {}; DD.firstShot = true; DD.placeSince = 0; DD.acc = 0; }
  if (ZB && DD.B) ddSample(dt);
  if (ZC && sim.mission.camp && DD.zc !== ZC) { DD.zc = ZC; DD.obj = null; ddCampObjects(); DD.sc = { q: [], cur: null, wait: 0 }; ddPlanScenes();
    // the Jin chapters keep their talk in JCH: wrap each chapter's table once
    if (ZC.jin && typeof JCH !== 'undefined') for (const n in JCH) { const C = JCH[n]; if (!C || !C.talk || DD.wrapped.has(C)) continue; const t = C.talk; DD.wrapped.add(C); C.talk = (k) => ddAugment(t(k) || (typeof jTalkAny === 'function' ? jTalkAny(k, +n) : null), k); } }
  if (ZC && sim.mission.camp) ddScenesTick(dt);
  if (ZC && sim.mission.camp && !state.zheDlg && DD.obj && ddNearRoll()) { const pr = $('zhePrompt'); if (pr) { pr.hidden = false; pr.innerHTML = '<kbd>E</kbd>Read the roll · 功過簿'; } }
}
{ const st = document.createElement('style'); st.textContent = '.ddres { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; } .ddres span, .ddroll span { font: 13px sans-serif; padding: 2px 8px; border-radius: 3px; } .ddp { background: rgba(120,150,80,.22); color: #cfe0b0; } .ddm { background: rgba(170,60,50,.25); color: #f0b8a8; } .ddn { opacity: .5; } .ddroll { max-height: 56vh; overflow: auto; text-align: left; } .ddrow { margin: 0 0 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; } .ddrow b { width: 100%; font-size: 15px; letter-spacing: .04em; }'; document.head.appendChild(st); }
// test hooks (read-only)
window.__ddRollPos = () => (DD.obj ? ddRollPos() : null);
window.__ddCampKey = (u) => { const R = (ZC && ZC.R) || ZR; return u && u.ci !== undefined && R[u.ci] ? R[u.ci].k : null; };
// ===================== it2 · scenes in camp: a man walks up to you because of what you did =====================
// court-martial (軍法) with the staff, the man you carried and his keepsake, the friend of the man you left, a toast at
// the fire, a nickname, a promotion. At most two per camp, the reckoning first.
DD.sc = { q: [], cur: null, wait: 0 };
const ddCamp = () => (ddCtx() || {}).c;
const ddUnitOf = (k) => { const sim = state.sim; if (!sim || !ZC || !ZC.map) return null; for (const uid in ZC.map) { const R = ZC.R || ZR, r = R[ZC.map[uid]]; if (r && r.k === k) { const u = sim.units[uid]; if (u && !u.dead) return u; } } return null; };
const ddCampKeys = () => { const out = []; if (!ZC || !ZC.map) return out; const R = ZC.R || ZR; for (const uid in ZC.map) { const r = R[ZC.map[uid]]; if (r && !r.guest) out.push(r.k); } return out; };
const ddHash = (s) => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return Math.abs(x); };
const ddUniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
function ddPickChief() { const keys = ddCampKeys(); const pref = { zhe: ['wu', 'he', 'lou'], jin: ['ulgen', 'alin', 'dabsun'], sj: ['sj_hu', 'sj_gao', 'sj_lin'] }[ddCamp()] || []; return pref.find(k => keys.includes(k)) || keys[0]; }
const DDNICK = { // style: [zh, en, how they explain it]
  wall: ['鐵壁', 'Iron Wall', ddL('刀砍過來，他就是不讓。', 'Blades come at him and he just doesn\'t give.')],
  club: ['鐵棍', 'Cudgel', ddL('銃打完了，他還能掄。', 'When the gun is empty he just swings it.')],
  carry: ['背人的', 'the Carrier', ddL('誰倒了，他就背誰回來。', 'Whoever goes down, he carries back.')],
  eye: ['千里眼', 'Far-Eye', ddL('那麼遠也打得著。', 'He hits them that far out.')],
  stone: ['石頭', 'Stone', ddL('等到鼻子尖才放。', 'Waits till they\'re at the end of his nose before he fires.')],
  ladder: ['推梯的', 'Ladder-Pusher', ddL('梯子一靠上來，他就推下去。', 'A ladder touches the wall and over it goes.')],
  wolf: ['孤狼', 'Lone Wolf', ddL('一個人往前衝，也不等我們。', 'Charges off alone. Doesn\'t wait for us.')],
  hare: ['兔子', 'the Hare', ddL('跑得比誰都快。', 'Runs faster than any of us.')],
  butcher: ['屠夫', 'the Butcher', ddL('跑的他也不放過。', 'Not even the running ones get away from him.')],
};
function ddStyle(B) {
  if (B.ran > 6 && !B.rally) return 'hare'; if (B.kf >= 3) return 'butcher';
  const s = [['carry', ddUniq(B.help.concat(B.rev, B.aid)).length * 4], ['wall', B.blocks / 2 + B.shield * 2], ['club', B.club * 3], ['eye', B.long * 3], ['stone', B.held ? 5 : 0], ['ladder', B.lad * 3], ['wolf', B.alone > 25 ? 5 : 0]].sort((a, b) => b[1] - a[1]);
  return s[0][1] >= 5 ? s[0][0] : null;
}
function ddPlanScenes() {
  const C = ddCtx(); if (!C) return; const D = ddDD(C.S), B = D.log[D.log.length - 1]; if (!B || D.seen['sc' + B.n]) return; D.seen['sc' + B.n] = 1; C.save();
  const keys = ddCampKeys(), here = (k) => keys.includes(k), q = [];
  const saved = ddUniq(B.help.concat(B.rev, B.aid)).filter(here), left = ddUniq(B.left);
  // the reckoning
  if ((B.ran > 6 && !B.rally) || B.alone > 40 || (C.c === 'sj' && B.early >= 4)) q.push({ id: 'court', who: ddPickChief() });
  else if (left.length) { const w = keys.filter(k => k !== C.S.me)[ddHash(left[0] + B.n) % Math.max(1, keys.length - 1)]; if (w) q.push({ id: 'ask', who: w, about: left[0] }); }
  // the good
  if (saved.length) q.push({ id: 'thanks', who: saved[0] });
  else if (B.kills >= 4 || B.off || B.last || B.lad >= 2 || B.avenge.length) q.push({ id: 'toast', who: keys.filter(k => k !== C.S.me).sort((a, b) => (C.S.bond[b] || 0) - (C.S.bond[a] || 0))[0] });
  const st = ddStyle(B); if (st && !D.nick && q.length < 2) q.push({ id: 'nick', who: keys[ddHash(st + B.n) % keys.length], style: st });
  const R = D.rep; if (q.length < 2 && !D.rank && R.valor + R.care >= 14 && R.coward === 0 && !(B.ran > 6)) q.push({ id: 'rank', who: ddPickChief() });
  DD.sc.q = q.filter(s => s.who).slice(0, 2); DD.sc.wait = 8;
}
// the dialogue panel: the same box and keys as camp talk (#zheDlg, state.zheDlg)
function ddDlg(who, sub, lines, choices, end) {
  if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; $('pause').hidden = true;
  let box = $('zheDlg'); if (!box) { box = document.createElement('div'); box.id = 'zheDlg'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const show = (ls, ch) => { box.hidden = false; box.innerHTML = `<div class="who">${who}<small>${sub || ''}</small></div>${ls.map(l => `<div class="zh">${l[0]}</div><div class="en">${l[1]}</div>`).join('')}<div class="ch">${ch.map((c, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd>${c.q}</button>`).join('')}${ch.length ? '' : '<button type="button" data-i="-1"><kbd>E</kbd>Go on</button>'}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => (+b.dataset.i < 0 ? close() : choose(+b.dataset.i))); cur = ch; };
  let cur = choices; const close = () => { if (cur.length) return; box.hidden = true; state.zheDlg = null; requestLock(); if (end) end(); };
  const choose = (i) => { const c = cur[i]; if (!c) return; AUDIO.play('ui'); const nx = c.fx ? c.fx() : null; if (nx && nx.beat) { box.hidden = true; state.zheDlg = null; ddBeat(nx.beat, () => ddDlg(who, sub, nx.after || [], [], end)); return; } show(c.a || [], nx && nx.more ? nx.more : []); };
  state.zheDlg = { k: 'dd', choose, close }; show(lines, choices);
}
// 軍棍 · the staff: count the blows; press E as each one falls to take it without crying out
function ddBeat(n, done) {
  const C = ddCtx(); let el = $('ddBeat'); if (!el) { el = document.createElement('div'); el.id = 'ddBeat'; document.body.appendChild(el); }
  const NUM = '一二三四五六七八九十'; const zhN = (i) => i <= 10 ? NUM[i - 1] : i < 20 ? '十' + NUM[i - 11] : NUM[Math.floor(i / 10) - 1] + '十' + (i % 10 ? NUM[i % 10 - 1] : '');
  let i = 0, held = 0, open = false, got = false; el.hidden = false;
  const tool = C && C.c === 'jin' ? ['鞭', 'the whip'] : ['軍棍', 'the staff'];
  const draw = (cry) => { el.innerHTML = `<div class="n">${i ? zhN(i) : ''}</div><div class="t">${tool[0]} · ${i} / ${n}</div><div class="k${open ? ' on' : ''}"><kbd>E</kbd> grit your teeth</div>${cry ? `<div class="c">${cry}</div>` : ''}`; };
  state.zheDlg = { k: 'beat', choose: () => { }, close: () => { if (open && !got) { got = true; held++; } } };
  const blow = () => { i++; open = false; const r = state.renderer; if (r) { r.shake = Math.max(r.shake, 0.6); r.hitFlash = 0.35; } AUDIO.play('thud'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); draw(got ? '' : '啊——！'); got = false;
    if (i >= n) { setTimeout(() => { el.hidden = true; state.zheDlg = null; const D = C && ddDDsafe(); if (D) { D.beat = { n, held }; if (held >= n * 0.75) { D.rep.disc += 1; D.flags = D.flags || {}; D.flags.endured = 1; } C.save(); } done(held >= n * 0.75); }, 900); return; }
    setTimeout(() => { open = true; draw(''); setTimeout(blow, 420); }, 380); };
  draw(''); setTimeout(() => { open = true; draw(''); setTimeout(blow, 420); }, 900);
}
const ddDDsafe = () => { const C = ddCtx(); return C ? ddDD(C.S) : null; };
// ---------- the scenes ----------
function ddRunScene(s) {
  const C = ddCtx(); if (!C) return; const D = ddDD(C.S), B = D.log[D.log.length - 1], me = C.S.name, r = ddRow(s.who) || { zh: '', en: 'A comrade', t: '' };
  const who = `${r.zh} ${r.en}`, sub = r.t, bond = (k, n) => { C.S.bond[k] = (C.S.bond[k] || 0) + n; }, done = () => { C.save(); DD.sc.cur = null; DD.sc.wait = 22; };
  const jin = C.c === 'jin', sj = C.c === 'sj';
  if (s.id === 'court') {
    const officer = jin ? ['甲喇額真', 'the jalan captain'] : sj ? ['把總', 'the company captain'] : ['哨官', 'the company officer'];
    const crime = B.ran > 6 && !B.rally ? ['臨陣退縮', 'turning your back on the enemy'] : sj && B.early >= 4 ? ['未令先放', 'firing before the order'] : ['失伍', 'leaving your file'];
    const law = jin ? ddL('汗的法：臨陣退走者，鞭；再犯，斬。', 'The Khan\'s law: who falls back in battle is whipped. The second time, beheaded.') : ddL('號令有云：臨陣退縮者斬，失伍者棍。', 'The regulations say: who turns back in battle is beheaded; who leaves his file is beaten.');
    const helped = ddUniq(B.help.concat(B.rev, B.aid)).length;
    ddDlg(who, sub, [ddL(`${me.zh}。${officer[0]}叫你。現在就去。`, `${me.en}. ${officer[1][0].toUpperCase() + officer[1].slice(1)} wants you. Now.`), ddL(`罪名：${crime[0]}。`, `The charge: ${crime[1]}.`), law], [
      { q: 'I did it. I have no excuse.', a: [ddL('……還知道認。打二十，記過。', '...At least you own it. Twenty strokes, and it goes on the roll.')], fx: () => { bond(s.who, 1); return { beat: 20, after: [ddL('弟兄們把你扶回火邊。沒人說話，但有人把碗遞給你。', 'The men help you back to the fire. Nobody speaks, but someone hands you a bowl.')] }; } },
      { q: helped ? 'I went back for a wounded man.' : 'I was going for help.', a: [], fx: () => helped ? { beat: 10, after: [ddL('有人作證，你是去背人的。減為十棍。', 'Someone swears you went to carry a man. Ten strokes.')] } : (bond(s.who, -1), { beat: 40, after: [ddL('沒人能作證。說謊加倍：四十。', 'No one can back you. A lie doubles it: forty.')] }) },
      { q: '(Say nothing.)', a: [], fx: () => ({ beat: 30, after: [ddL('三十。你一聲沒吭，連打的人都看了你一眼。', 'Thirty. You don\'t make a sound; even the man with the staff gives you a look.')] }) },
    ], done);
  } else if (s.id === 'ask') {
    const a = s.about, an = [ddNm(a), ddNm(a, true)];
    ddDlg(who, sub, [ddL(`你把${an[0]}丟在那裡了。`, `You left ${an[1]} out there.`), ddL('他喊你的名字。我聽見了。', 'He was calling your name. I heard him.')], [
      { q: 'I couldn\'t carry him. I\'m sorry.', a: [ddL('……我知道。我就是要聽你說出來。', '...I know. I just needed to hear you say it.')], fx: () => { bond(s.who, 0); D.flags = D.flags || {}; D.flags['owned:' + a] = 1; } },
      { q: 'I thought he was already dead.', a: [ddL('他沒有。', 'He wasn\'t.'), ddL('（他轉身走了。下一仗，他不會站在你旁邊。）', '(He walks away. Next fight, he won\'t stand beside you.)')], fx: () => { bond(s.who, -2); D.grudge = D.grudge || {}; D.grudge[s.who] = a; } },
      { q: '(Say nothing.)', a: [ddL('（他往地上啐了一口。）', '(He spits on the ground.)')], fx: () => { bond(s.who, -1); } },
    ], done);
  } else if (s.id === 'thanks') {
    const item = jin ? ['鹿骨扳指', 'a deer-bone thumb ring', 'for the bowstring'] : sj ? ['火繩盒', 'his slow-match tin', 'it keeps the match dry'] : ['木雕小鳥', 'a little carved wooden bird', 'my father made it'];
    ddDlg(who, sub, [ddL(`${me.zh}。你回頭了。別人都在跑，你回頭了。`, `${me.en}. You came back. Everyone was running and you came back.`), ddL(`拿著。${item[0]}。`, `Take this. ${item[1][0].toUpperCase() + item[1].slice(1)} — ${item[2]}.`)], [
      { q: 'I\'ll keep it close.', a: [ddL('嗯。下次換我。', 'Mm. Next time it\'s my turn.')], fx: () => { bond(s.who, 2); D.keep.push({ k: s.who, zh: item[0], en: item[1], n: B.n }); D.debt = D.debt || {}; D.debt[s.who] = 1; } },
      { q: 'Keep it. You\'ll need your luck.', a: [ddL('……那我就欠著。', '...Then I owe you.')], fx: () => { bond(s.who, 3); D.debt = D.debt || {}; D.debt[s.who] = 1; } },
    ], done);
  } else if (s.id === 'toast') {
    const deed = B.off ? ddL('砍了他們的頭目', 'cut down their officer') : B.last ? ddL('最後一個站著的', 'the last of us standing') : B.lad ? ddL('把梯子推了下去', 'threw their ladders down') : B.avenge.length ? ddL(`替${ddNm(B.avenge[0])}報了仇`, `paid them back for ${ddNm(B.avenge[0], true)}`) : ddL('殺得最多', 'killed the most of them');
    ddDlg(who, sub, [ddL(`來！敬${me.zh}——${deed[0]}的人！`, `Here! To ${me.en} — the man who ${deed[1]}!`)], [
      { q: 'To the ones who aren\'t here.', a: [ddL('……敬他們。', '...To them.'), ddL('（火邊安靜了一會兒，每個人都喝了。）', '(The fire goes quiet for a moment. Everyone drinks.)')], fx: () => { bond(s.who, 1); D.flags = D.flags || {}; D.flags.humble = (D.flags.humble || 0) + 1; } },
      { q: 'Luck. Just luck.', a: [ddL('運氣也得有人接得住！', 'Luck needs a man to catch it!')], fx: () => bond(s.who, 1) },
      { q: 'Did you see me? Ha!', a: [ddL('看見了看見了！明天整個營都會知道。', 'We saw, we saw! By tomorrow the whole camp will know.')], fx: () => { D.flags = D.flags || {}; D.flags.boast = (D.flags.boast || 0) + 1; } },
    ], done);
  } else if (s.id === 'nick') {
    const N = DDNICK[s.style];
    ddDlg(who, sub, [ddL(`欸，你們看——${N[0]}來了！`, `Hey, look — here comes ${N[1]}!`), N[2], ddL('（火邊的人都笑了。）', '(The men at the fire laugh.)')], [
      { q: `Fine. ${N[1]} it is.`, a: [ddL(`${N[0]}！${N[0]}！`, `${N[1]}! ${N[1]}!`)], fx: () => { D.nick = { zh: N[0], en: N[1], style: s.style }; bond(s.who, 1); } },
      { q: 'Don\'t call me that.', a: ddHash(s.style + me.en) % 2 ? [ddL('好好好，不叫。', 'All right, all right. We won\'t.')] : [ddL(`越不讓叫，越要叫。${N[0]}！`, `The more you mind, the more we'll say it. ${N[1]}!`)], fx: () => { if (!(ddHash(s.style + me.en) % 2)) D.nick = { zh: N[0], en: N[1], style: s.style }; } },
    ], done);
  } else if (s.id === 'rank') {
    const t = jin ? ['巴圖魯', 'baturu — "hero"', '汗賜你巴圖魯之號。', 'The Khan grants you the name baturu.'] : sj ? ['伍長', 'file leader', '從今天起，你帶這一伍。', 'From today you lead this file of five.'] : ['伍長', 'file leader', '把總給你的腰牌。從今天起你帶一伍。', 'The captain sends you a waist tag. From today you lead a file of five.'];
    ddDlg(who, sub, [ddL(t[2], t[3]), ddL('別讓我們後悔。', 'Don\'t make us regret it.')], [
      { q: 'I won\'t.', a: [ddL('（他把東西放在你手裡，拍了拍你的肩。）', '(He puts it in your hand and claps your shoulder.)')], fx: () => { D.rank = { zh: t[0], en: t[1] }; if (jin) D.nick = { zh: '巴圖魯', en: 'Baturu', style: 'baturu' }; bond(s.who, 1); } },
      { q: 'Give it to someone else.', a: [ddL('不行。命令就是命令。', 'No. An order is an order.')], fx: () => { D.rank = { zh: t[0], en: t[1] }; if (jin) D.nick = { zh: '巴圖魯', en: 'Baturu', style: 'baturu' }; } },
    ], done);
  }
}
function ddScenesTick(dt) {
  const S = DD.sc, sim = state.sim, h = localHero(); if (!S.q.length && !S.cur) return; if (!sim || !h || !ZC || !sim.mission.camp) return;
  if (S.cur && S.cur.talking) return;
  if (!S.cur) { if ($('zheCard') && !$('zheCard').hidden) return; if (state.zheDlg) return; S.wait -= dt; if (S.wait > 0) return; S.cur = S.q.shift(); S.cur.t = 0; S.cur.u = ddUnitOf(S.cur.who); const n = ddRow(S.cur.who);
    if (S.cur.u) SPEECH.say(S.cur.u.id, `${(ddCtx().S.name || {}).zh || ''}！`, `${(ddCtx().S.name || {}).en || ''}!`, { prio: 2, dur: 2.5 }); if (n) toast(`${n.zh} ${n.en} is coming over to you`); }
  const c = S.cur, u = c.u; c.t += dt;
  if (u && !u.dead) { const dx = h.x - u.x, dz = h.z - u.z, d = Math.hypot(dx, dz); u.yaw = Math.atan2(dx, dz); u.campPose = 'stand';
    if (d > 1.9 && c.t < 20) { const st = Math.min(d - 1.8, 1.5 * dt); u.px = u.x; u.pz = u.z; u.x += dx / d * st; u.z += dz / d * st; u.y = SIM.terrainH(u.x, u.z); return; } }
  if (state.zheDlg) return; c.talking = true; ddRunScene(c);
}
{ const st = document.createElement('style'); st.textContent = '#ddBeat { position: fixed; inset: 0; z-index: 70; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; background: radial-gradient(ellipse at center, rgba(40,6,4,.25), rgba(10,2,2,.75)); color: #f0e0c8; font-family: serif; } #ddBeat .n { font-size: 96px; line-height: 1; text-shadow: 0 0 24px #000; } #ddBeat .t { font: 15px sans-serif; opacity: .8; margin-top: 8px; } #ddBeat .k { margin-top: 26px; font: 600 16px sans-serif; opacity: .35; } #ddBeat .k.on { opacity: 1; color: #ffd28a; } #ddBeat .c { margin-top: 10px; font-size: 26px; color: #ff9a8a; } #ddBeat.hit { animation: ddhit .25s ease-out; } @keyframes ddhit { 0% { background-color: rgba(160,20,10,.45); } 100% { background-color: transparent; } }'; document.head.appendChild(st); }
window.__ddSc = () => DD.sc;
// ===================== it3 · in battle: the file remembers you while the fight is on =====================
// your name or nickname shouted after your kills and blocks; "Follow him!" or "Get back in line!" when you charge
// ahead, depending on your record; the man who owes you a life stays near and calls it when he pays; a file that
// trusts you stands steadier, one that doesn't wavers; a known killer gets marked by the enemy.
DD.fx = { cool: 0, charge: 0, aloneT: 0, blk: 0, start: false, mark: 0 };
const ddMeName = () => { const C = ddCtx(); if (!C) return null; const D = ddDD(C.S); return D.nick ? { zh: D.nick.zh, en: D.nick.en } : C.S.name; };
function ddSayNear(zh, en, pred, pr) { const sim = state.sim, h = localHero(); if (!sim || !h || !ZB) return null; let best = null, bd = 18;
  for (const uid in ZB.map) { const u = sim.units[uid]; if (!u || u.dead || u.wounded || u.id === h.id) continue; const k = ddKey(uid); if (pred && !pred(k, u)) continue; const d = Math.hypot(u.x - h.x, u.z - h.z); if (d < bd) { bd = d; best = u; } }
  if (best) SPEECH.say(best.id, zh, en, { prio: pr || 2, dur: 2.6 }); return best; }
function ddTrust() { const C = ddCtx(); if (!C) return 0; const R = ddDD(C.S).rep; return R.care + R.valor * 0.5 + R.disc - R.coward * 1.5 - R.cruel * 0.5; }
function ddBattleStart() {
  const C = ddCtx(), sim = state.sim, h = localHero(); if (!C || !sim || !h || !ZB) return; const D = ddDD(C.S); if (!D.log.length) return;
  // trust: the file holds steadier around a man it trusts, and wavers around one it doesn't
  const t = ddTrust(), q = sim.squads[ZB.sq]; if (q && !q.def.fearless) { const k = t >= 8 ? 1.25 : t >= 4 ? 1.12 : t <= -4 ? 0.8 : 1; if (k !== 1) { q.moraleMax *= k; q.morale = q.moraleMax; } DD.fx.trust = k; }
  const nm = ddMeName(); setTimeout(() => {
    if (D.debt) { const k = Object.keys(D.debt)[0]; const u = k && Object.keys(ZB.map).map(Number).find(id => ddKey(id) === k && !sim.units[id].dead); if (u !== undefined) SPEECH.say(u, `${nm.zh}，今天我在你旁邊。`, `${nm.en}, today I stand next to you.`, { prio: 2, dur: 3.5 }); }
    if (D.grudge) { const k = Object.keys(D.grudge)[0]; const u = k && Object.keys(ZB.map).map(Number).find(id => ddKey(id) === k && !sim.units[id].dead); if (u !== undefined) SPEECH.say(u, '別指望我回頭找你。', 'Don\'t count on me coming back for you.', { prio: 2, dur: 3.5 }); }
    else if (DD.fx.trust < 1) ddSayNear('……跟緊點，別又跑了。', '...Stay close this time. Don\'t run again.');
    else if (DD.fx.trust > 1.1) ddSayNear(`有${nm.zh}在，怕什麼。`, `${nm.en}'s with us. What's to be afraid of?`); }, 9000);
}
function ddBattleEvent(ev) {
  const sim = state.sim, h = localHero(), B = DD.B; if (!sim || !h || !B || !ZB) return; const F = DD.fx, nm = ddMeName() || { zh: '', en: '' }; const C = ddCtx(); const D = C && ddDD(C.S);
  if (ev.t === 'death' && ev.killer === h.id) { const v = sim.units[ev.id]; if (!v || v.team === h.team || v.type === 'horse') return;
    if (F.cool <= 0 && (B.kills % 3 === 1 || v.type === 'hero' || v.officer)) { F.cool = 10; const L = v.type === 'hero' || v.officer ? [`${nm.zh}砍了他們的頭目！`, `${nm.en} cut down their officer!`] : [`好！${nm.zh}！`, `Good one, ${nm.en}!`]; ddSayNear(L[0], L[1]); } }
  // the man you saved pays you back: he kills the man who was going for you
  if (ev.t === 'death' && D && D.debt && ev.killer >= 0 && ev.killer !== h.id) { const k = ddKey(ev.killer); const v = sim.units[ev.id]; if (k && D.debt[k] && v && v.target === h.id) { delete D.debt[k]; C.S.bond[k] = (C.S.bond[k] || 0) + 2; B.repaid = k; SPEECH.say(ev.killer, '這下扯平了！', 'Now we\'re even!', { prio: 3, dur: 3 }); C.save(); } }
  if (ev.t === 'block' && ev.by === h.id) { F.blk++; if (F.blk >= 4 && F.cool <= 0) { F.cool = 12; F.blk = 0; ddSayNear(D && D.nick && D.nick.style === 'wall' ? '鐵壁！' : '擋得好！', D && D.nick && D.nick.style === 'wall' ? 'Iron Wall!' : 'Good block!'); } }
}
function ddBattleTick(dt) {
  const sim = state.sim, h = localHero(), B = DD.B, F = DD.fx; if (!sim || !h || h.dead || !B || !ZB) return;
  F.cool -= dt; F.charge -= dt; F.mark -= dt;
  if (!F.start && sim.tick > 30) { F.start = true; ddBattleStart(); }
  // charging ahead alone: the chief calls after you, according to your record
  F.aloneT = B.alone; if (F.charge <= 0 && B.alone - (F.alone0 || 0) > 3) { F.charge = 40; F.alone0 = B.alone; const t = ddTrust(), nm = ddMeName();
    const chief = ddSayNear(t >= 4 ? '跟上他！' : `${nm.zh}！回來！歸隊！`, t >= 4 ? `Follow him! Follow ${nm.en}!` : `${nm.en}! Get back in line!`, null, 3);
    // a file that trusts you comes after you: the squad's next slot is your position for a few seconds
    if (chief && t >= 4) { const q = sim.squads[ZB.sq]; if (q && q.order !== undefined) { DD.fx.follow = 6; } } }
  if (F.follow > 0) { F.follow -= dt; const q = sim.squads[ZB.sq]; if (q && q.alive) { q.tx = h.x; q.tz = h.z; } }
  // a known killer: the enemy point you out and come for you
  if (F.mark <= 0) { F.mark = 12; const C = ddCtx(), D = C && ddDD(C.S); if (D && D.rep.valor >= 14) { let n = 0; for (const v of sim.units) { if (v.dead || v.team === h.team || v.type === 'horse' || v.ctrl >= 0 || v.def.ai === 'cannon') continue; if (Math.hypot(v.x - h.x, v.z - h.z) < 22 && n < 2) { v.target = h.id; n++; if (n === 1 && !F.marked) { F.marked = 1; SPEECH.say(v.id, '就是他！', 'That\'s the one!', { prio: 2, dur: 2.5 }); } } } } }
}
{ const _f = ddFrame, _e = ddEvent;
  ddFrame = function (dt) { _f(dt); try { if (DD.B && ZB && state.sim && state.sim.mission && state.sim.mission.soldier) ddBattleTick(dt); } catch (e) { console.warn('deeds', e); } };
  ddEvent = function (ev) { _e(ev); try { ddBattleEvent(ev); } catch (e) { console.warn('deeds', e); } }; }
