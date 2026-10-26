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
  if (ZB && sim.mission.soldier && DD.zb !== ZB) { DD.zb = ZB; DD.B = ddFresh(sim); DD.fileKills = 0; DD.killers = {}; DD.firstShot = true; DD.placeSince = 0; DD.acc = 0; }
  if (ZB && DD.B) ddSample(dt);
  if (ZC && sim.mission.camp && DD.zc !== ZC) { DD.zc = ZC; DD.obj = null; ddCampObjects();
    // the Jin chapters keep their talk in JCH: wrap each chapter's table once
    if (ZC.jin && typeof JCH !== 'undefined') for (const n in JCH) { const C = JCH[n]; if (!C || !C.talk || DD.wrapped.has(C)) continue; const t = C.talk; DD.wrapped.add(C); C.talk = (k) => ddAugment(t(k) || (typeof jTalkAny === 'function' ? jTalkAny(k, +n) : null), k); } }
  if (ZC && sim.mission.camp && !state.zheDlg && DD.obj && ddNearRoll()) { const pr = $('zhePrompt'); if (pr) { pr.hidden = false; pr.innerHTML = '<kbd>E</kbd>Read the roll · 功過簿'; } }
}
{ const st = document.createElement('style'); st.textContent = '.ddres { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; } .ddres span, .ddroll span { font: 13px sans-serif; padding: 2px 8px; border-radius: 3px; } .ddp { background: rgba(120,150,80,.22); color: #cfe0b0; } .ddm { background: rgba(170,60,50,.25); color: #f0b8a8; } .ddn { opacity: .5; } .ddroll { max-height: 56vh; overflow: auto; text-align: left; } .ddrow { margin: 0 0 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; } .ddrow b { width: 100%; font-size: 15px; letter-spacing: .04em; }'; document.head.appendChild(st); }
// test hooks (read-only)
window.__ddRollPos = () => (DD.obj ? ddRollPos() : null);
window.__ddCampKey = (u) => { const R = (ZC && ZC.R) || ZR; return u && u.ci !== undefined && R[u.ci] ? R[u.ci].k : null; };
