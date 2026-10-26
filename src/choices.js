// ===================== 抉擇 · choices: the decisions that split the story, and what they cost =====================
// A few times in each story campaign the game stops and makes you choose, and there is no right answer: a captured boy,
// a wounded man on the road out, a bridge to cross or not, a prisoner, a deserter. The choice is written in the save
// (S.ch, S.ledger) and bends what follows: a different battle, a man who is not there any more, men who remember it at
// the fire, a dream, his empty bedroll, a letter home, and at the end a ledger of what you chose and what it cost.
// Client side and story only (solo). A choice made in the middle of a battle travels through the input stream as a
// debug-type command (sub 2), and the mission's own data says what each answer does, so the sim stays deterministic.
const CH = { el: null, urg: null, live: null, zc: null, zb: null, objs: [], talkWrapped: new Set(), lines: null, fired: {}, initSent: null };
const chL = (zh, en) => [zh, en];
function chCtx() {
  if (((ZB && ZB.jin) || (ZC && ZC.jin)) && typeof JS !== 'undefined' && JS) return { c: 'jin', S: JS, save: () => jSave(), R: JR };
  if (ZS) return { c: ZS.sj ? 'sj' : 'zhe', S: ZS, save: () => zSave(), R: ZS.sj && typeof SR !== 'undefined' ? SR : ZR };
  return null;
}
function chData(S) { if (!S.ch) S.ch = {}; if (!S.ledger) S.ledger = []; if (!S.chLost) S.chLost = {}; if (!S.dreamt) S.dreamt = {}; return S; }
const chRowIn = (R, k) => R.find(r => r.k === k) || null;
function chNm(C, k, en) {
  if (k === C.S.me || (C.c === 'zhe' && k === 'me')) return en ? C.S.name.en : C.S.name.zh;
  const r = chRowIn(C.R, k); return r ? (en ? r.en : r.zh) : (en ? 'a comrade' : '弟兄');
}
const chAlive = (C, k) => !!(C.S.alive && C.S.alive[k]);
const chBond = (C, k, n) => { if (!C.S.bond) C.S.bond = {}; C.S.bond[k] = (C.S.bond[k] || 0) + n; };
const chDD = (C) => (typeof ddDD === 'function' ? ddDD(C.S) : null);
const chRep = (C, key, n) => { const D = chDD(C); if (D && D.rep) D.rep[key] = (D.rep[key] || 0) + n; };
// a man goes out of the story because of what you chose: dead, left behind, gone over the wall, sent home
function chLose(C, k, how, id) { if (!k) return; C.S.alive[k] = false; C.S.fate[k] = how; chData(C.S).chLost[k] = { id, how }; if (C.c === 'sj' && C.S.lost && !C.S.lost.includes(k)) C.S.lost.push(k); }
const chGot = (C, id) => { const e = chData(C.S).ch[id]; return e ? e.o : -1; };

// ---------------- the decision panel ----------------
// spec: { id, kick, title, year, who, lines: [[zh,en]], opts: [{ q, a: [[zh,en]], fx(C), led }], timer, def, urgent, hold }
// A full-screen pause for the deliberate ones (camp, the road): the lines come one at a time, and the answers only after
// a moment. The urgent ones (in battle) are a small panel at the top with a burning fuse; the fight does not stop.
function chCSS() {
  if ($('chCss')) return; const st = document.createElement('style'); st.id = 'chCss';
  st.textContent = `#chDec { position: fixed; inset: 0; z-index: 86; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at center, rgba(26,16,10,.9), rgba(4,2,2,.985)); color: #efe6d0; font-family: 'Noto Serif CJK TC', Georgia, serif; opacity: 0; transition: opacity .9s; }
#chDec.on { opacity: 1; } #chDec .in { max-width: 700px; width: 92vw; padding: 30px 38px; }
#chDec .k { font: 700 11px sans-serif; letter-spacing: .32em; color: #c9524a; text-transform: uppercase; margin-bottom: 10px; }
#chDec h2 { font-size: 30px; margin: 0 0 4px; letter-spacing: .08em; } #chDec .yr { opacity: .55; font: 13px sans-serif; letter-spacing: .12em; margin-bottom: 18px; }
#chDec .who { font: 700 14px sans-serif; color: #e0b46a; margin: 12px 0 2px; } #chDec .who small { font-weight: 400; color: #a89878; margin-left: 8px; }
#chDec .l { opacity: 0; transform: translateY(4px); transition: opacity .8s, transform .8s; margin: 0 0 11px; } #chDec .l.on { opacity: 1; transform: none; }
#chDec .l .zh { font-size: 18px; } #chDec .l .en { font-size: 15.5px; line-height: 1.55; opacity: .85; }
#chDec .ops { display: flex; flex-direction: column; gap: 7px; margin-top: 20px; opacity: 0; transition: opacity 1.2s; pointer-events: none; } #chDec .ops.on { opacity: 1; pointer-events: auto; }
#chDec .ops button { all: unset; cursor: pointer; padding: 10px 14px; border-radius: 4px; background: #1e1611; border: 1px solid #4a3a28; font: 15px sans-serif; color: #efe6d0; }
#chDec .ops button:hover { border-color: #c9524a; background: #2a1c14; } #chDec .ops button kbd { color: #e0b46a; margin-right: 10px; font: 700 12px sans-serif; }
#chDec .go { all: unset; cursor: pointer; margin-top: 18px; padding: 9px 20px; border-radius: 4px; background: #6a2a22; color: #fff3e4; font: 700 14px sans-serif; display: inline-block; }
#chDec .tm, #chUrg .tm { height: 3px; background: #3a2a1c; margin-top: 14px; border-radius: 2px; overflow: hidden; } #chDec .tm i, #chUrg .tm i { display: block; height: 100%; background: linear-gradient(90deg, #e05a3a, #f0b05a); width: 100%; }
#chUrg { position: fixed; left: 50%; top: 9%; transform: translateX(-50%); width: min(640px, 92vw); z-index: 45; background: linear-gradient(180deg, rgba(36,14,10,.94), rgba(16,8,6,.96)); border: 1px solid #a8483a; border-radius: 6px; padding: 12px 16px; color: #efe6d0; font-family: 'Noto Serif CJK TC', Georgia, serif; box-shadow: 0 8px 30px rgba(0,0,0,.6); }
#chUrg .k { font: 700 10px sans-serif; letter-spacing: .3em; color: #f07a5a; } #chUrg .zh { font-size: 17px; margin-top: 4px; } #chUrg .en { font-size: 14px; opacity: .85; margin-bottom: 6px; }
#chUrg .ops { display: flex; flex-direction: column; gap: 4px; } #chUrg .ops div { padding: 5px 9px; border: 1px solid #5a3a28; border-radius: 4px; font: 14px sans-serif; background: #1e1410; } #chUrg .ops kbd { color: #f0b05a; margin-right: 8px; font: 700 12px sans-serif; }
#zheCard.dream { background: radial-gradient(ellipse at center, rgba(14,18,30,.95), rgba(2,3,8,.99)); } #zheCard.dream h2 { color: #9fb2d8; font-weight: 400; letter-spacing: .3em; } #zheCard.dream p { font-style: italic; color: #c8d0e0; }
#zheCard .chled { font-size: 14.5px; line-height: 1.5; } #zheCard .chled div { margin: 0 0 10px; padding-left: 10px; border-left: 2px solid #6a4a2a; } #zheCard .chled b { color: #e8c27a; font-weight: 600; } #zheCard .chled i { display: block; opacity: .75; font-style: normal; } #zheCard .chled em { display: block; color: #d88a7a; font-style: normal; }
#chPr { position: fixed; left: 50%; bottom: 23%; transform: translateX(-50%); z-index: 30; font: 14px sans-serif; color: #efe6d0; background: rgba(12,9,7,.8); border: 1px solid #5a4a32; border-radius: 4px; padding: 5px 12px; pointer-events: none; } #chPr kbd { color: #e0b46a; margin-right: 6px; font-weight: 700; }`;
  document.head.appendChild(st);
}
function chDecide(spec, done) {
  chCSS(); const C = chCtx(); if (!C) { if (done) done(-1); return; } chData(C.S);
  if (spec.urgent) return chUrgent(spec, done);
  if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; if ($('pause')) $('pause').hidden = true;
  let box = $('chDec'); if (!box) { box = document.createElement('div'); box.id = 'chDec'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const ln = (l) => `<div class="l"><div class="zh">${l[0]}</div><div class="en">${l[1]}</div></div>`;
  box.innerHTML = `<div class="in"><div class="k">${spec.kick || '抉擇 · A choice'}</div><h2>${spec.title}</h2>${spec.year ? `<div class="yr">${spec.year}</div>` : ''}${spec.who ? `<div class="who">${spec.who[0]}${spec.who[1] ? `<small>${spec.who[1]}</small>` : ''}</div>` : ''}<div class="ls">${spec.lines.map(ln).join('')}</div>
    <div class="ops">${spec.opts.map((o, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd>${o.q}</button>`).join('')}</div>${spec.timer ? '<div class="tm"><i></i></div>' : ''}</div>`;
  box.hidden = false; void box.offsetWidth; box.classList.add('on');
  const ls = [...box.querySelectorAll('.ls .l')], ops = box.querySelector('.ops'); let step = 0, phase = 'lines', t0 = 0, raf = 0;
  const reveal = () => { if (phase !== 'lines') return; if (step < ls.length) { ls[step++].classList.add('on'); setTimeout(reveal, step === 1 ? 700 : 1500); } else setTimeout(() => { phase = 'pick'; ops.classList.add('on'); t0 = performance.now(); if (spec.timer) tick(); }, (spec.hold || 2.2) * 1000); };
  const tick = () => { if (phase !== 'pick') return; const f = 1 - (performance.now() - t0) / (spec.timer * 1000); const bar = box.querySelector('.tm i'); if (bar) bar.style.width = Math.max(0, f * 100) + '%'; if (f <= 0) { pick(spec.def || 0); return; } raf = requestAnimationFrame(tick); };
  const pick = (i) => { if (phase !== 'pick') return; const o = spec.opts[i]; if (!o) return; phase = 'after'; cancelAnimationFrame(raf); AUDIO.play('ui');
    chRecord(C, spec, i); const more = o.fx ? o.fx(C) : null; C.save();
    const after = (o.a || []).concat(more && more.a ? more.a : []);
    const lsEl = box.querySelector('.ls'); if (lsEl) lsEl.style.display = 'none'; const wEl = box.querySelector('.who'); if (wEl) wEl.innerHTML = `「${o.q}」`;
    box.querySelector('.ops').outerHTML = `<div class="ls2">${after.map(ln).join('')}</div><button type="button" class="go">${spec.go || '……'}</button>`; const tm = box.querySelector('.tm'); if (tm) tm.remove();
    const l2 = [...box.querySelectorAll('.ls2 .l')]; let j = 0; const rv = () => { if (j < l2.length) { l2[j++].classList.add('on'); setTimeout(rv, 1300); } }; rv();
    const go = box.querySelector('.go'); go.onclick = () => close(more); };
  const close = (more) => { if (phase !== 'after') return; phase = 'done'; box.classList.remove('on'); state.zheDlg = null; setTimeout(() => { box.hidden = true; }, 500);
    if (more && more.beat && typeof ddBeat === 'function') { ddBeat(more.beat, () => { if (done) done(spec.picked); }); return; } if (done) done(spec.picked); };
  box.querySelectorAll('.ops button').forEach(b => b.onclick = () => pick(+b.dataset.i));
  // the camp's dialogue keys (1-9 answer, E/Esc closes) route here while the panel is open
  state.zheDlg = { k: 'ch', choose: (i) => { if (phase === 'pick') pick(i); }, close: () => { if (phase === 'after') { const g = box.querySelector('.go'); if (g) g.click(); } } };
  setTimeout(reveal, 500);
}
// write it down: the save remembers the answer, and the ledger what it meant
function chRecord(C, spec, i) {
  const S = chData(C.S); spec.picked = i; const o = spec.opts[i];
  S.ch[spec.id] = Object.assign({ o: i, at: S.stage || '' }, spec.keep || {});
  S.ledger = S.ledger.filter(e => e.id !== spec.id); S.ledger.push({ id: spec.id, o: i, t: spec.ltitle || spec.title, pick: o.led || o.q, at: spec.year || '' });
}
// ---------------- the urgent kind, in the middle of a fight ----------------
function chUrgent(spec, done) {
  let box = $('chUrg'); if (!box) { box = document.createElement('div'); box.id = 'chUrg'; document.body.appendChild(box); }
  const L = spec.lines[spec.lines.length - 1];
  box.innerHTML = `<div class="k">${spec.kick || '抉擇 · NOW'}${spec.who ? ' · ' + spec.who[0] : ''}</div><div class="zh">${L[0]}</div><div class="en">${L[1]}</div><div class="ops">${spec.opts.map((o, i) => `<div><kbd>${i + 1}</kbd>${o.q}</div>`).join('')}</div><div class="tm"><i></i></div>`;
  box.hidden = false; const t0 = performance.now(), T = (spec.timer || 12) * 1000; let over = false; AUDIO.play('whistle', undefined, 0, 0, 0.5);
  const fin = (i) => { if (over) return; over = true; CH.live = null; const C = chCtx(); if (C) { chRecord(C, spec, i); const o = spec.opts[i]; if (o.fx) o.fx(C); C.save(); }
    const o = spec.opts[i]; box.innerHTML = `<div class="k">${spec.kick || '抉擇'}</div>${(o.a || []).slice(0, 2).map(l => `<div class="zh">${l[0]}</div><div class="en">${l[1]}</div>`).join('') || `<div class="en">${o.q}</div>`}`; setTimeout(() => { box.hidden = true; }, 4200); if (done) done(i); };
  const tick = () => { if (over) return; const f = 1 - (performance.now() - t0) / T; const bar = box.querySelector('.tm i'); if (bar) bar.style.width = Math.max(0, f * 100) + '%'; if (f <= 0 || !state.sim || state.ended) { fin(spec.def || 0); return; } requestAnimationFrame(tick); };
  CH.live = { pick: (i) => { if (i >= 0 && i < spec.opts.length) fin(i); } }; tick();
}
window.addEventListener('keydown', (e) => { // while an urgent choice burns, 1-3 answer it (and do not change weapons)
  if (!CH.live || state.screen !== 'game') return; const m = /^Digit([1-9])$/.exec(e.code); if (!m) return; e.preventDefault(); e.stopImmediatePropagation(); CH.live.pick(+m[1] - 1);
}, true);
// the mission's answer, sent to the sim as a command: which choice (cid), which answer (opt), and a man's place k
function chSend(cid, opt, k) { Input.cmds.push([0, 31, 2, ((cid & 255) << 8) | ((opt & 15) << 4) | (k & 15)]); }
{ const P = SIM.Sim.prototype, _dc = P.debugCmd;
  P.debugCmd = function (p, sub, val) {
    if (sub !== 2) return _dc.call(this, p, sub, val);
    if (this.players.filter(q => !q.ai).length !== 1 || p.ai || !this.mission || !this.mission.choices) return;
    const cid = (val >> 8) & 255, opt = (val >> 4) & 15, k = val & 15, acts = (this.mission.choices[cid] || [])[opt]; if (!acts) return;
    this.mv.chose = this.mv.chose || {}; if (this.mv.chose[cid] !== undefined) return; this.mv.chose[cid] = opt;
    const q = this.squads[p.soldierSq];
    for (const a0 of acts) { const a = a0.map(x => x === '$k' ? k : x);
      if (a[0] === 'jump') this.mJump(a[1] | 0);
      else if (a[0] === 'park') { const u = q && this.units[q.unitIds[a[1] | 0]]; if (u && !u.dead && u.ctrl < 0) { u.wounded = true; u.aided = true; u.helpedBy = -1; u.downed = false; u.noncomb = true; u.x = u.px = a[2]; u.z = u.pz = a[3]; } }
      else this.mAct(a); }
    this.events.push({ t: 'mchoose', cid, opt });
  }; }

// ---------------- the registry: every decision, what it shows, what it does ----------------
const CHD = {};
// a dream for the night after, if this answer earned one: [title, [lines]]
function chDreamFor(C) {
  const S = chData(C.S); for (let i = S.ledger.length - 1; i >= 0; i--) { const e = S.ledger[i], D = CHD[e.id]; if (!D || S.dreamt[e.id]) continue; const d = D.dream && D.dream(C, e.o); if (!d) continue; S.dreamt[e.id] = 1; C.save(); return d; }
  return null;
}
function chDream(then) {
  const C = chCtx(); const d = C && chDreamFor(C); if (!d) return then();
  zCards([{ title: '夢 · A dream', year: d[0], p: d[1], btn: 'Wake →' }], () => { const b = $('zheCard'); if (b) b.classList.remove('dream'); then(); });
  const b = $('zheCard'); if (b) b.classList.add('dream');
}
// the ledger at the end of a campaign: every choice, and what came of it
function chLedgerCard(C) {
  const S = chData(C.S); if (!S.ledger.length) return null;
  const rows = S.ledger.map(e => { const D = CHD[e.id]; const out = D && D.end ? D.end(C, e.o) : ''; return `<div><b>${e.t}</b><i>${e.pick}</i>${out ? `<em>${out}</em>` : ''}</div>`; }).join('');
  return { title: '簿 · What you chose', year: 'and what it cost', html: `<div class="chled">${rows}</div>` };
}

// ================= 浙兵 · the Zhejiang file =================
// 一 · the boy at the well (camp0, before you sleep): a Jin boy caught in the well-house; fifty taels a head
CHD.z1boy = {
  build: (C) => ({ id: 'z1boy', title: '井房 · The well-house', ltitle: 'The boy in the well-house', year: 'The night before Abudali, April 1619', who: ['杜阿九 Du Ajiu', 'and Luo Tietou, dragging someone between them'],
    lines: [chL('（他們從黑暗裡拖出一個孩子。十三四歲，光著一隻腳，辮子凍成了冰。）', '(Out of the dark they drag a boy. Thirteen, fourteen. One foot bare, his queue frozen stiff.)'),
      chL('井房裡抓的，金人的探子。一顆首級，賞銀五十兩。隊長睡了——你說句話。', 'Caught him in the well-house. A Jin scout. One head, fifty taels of silver. The chief\'s asleep — you say the word.'),
      chL('陳小六：他……他還是個孩子。', 'Chen Xiaoliu: He\'s... he\'s just a boy.'),
      chL('方秀才：他不是兵。可記功的書辦不會問這個。', 'Fang the Scholar: He\'s no soldier. But the clerk who counts the heads won\'t ask.')],
    opts: [
      { q: 'Let Du take the head.', led: 'Let Du Ajiu take the boy\'s head for fifty taels.', a: [chL('（杜阿九拔出刀。你轉過身去。你還是聽見了。）', '(Du draws his knife. You turn away. You hear it anyway.)'), chL('（小六整夜沒有再說一句話。）', '(Xiaoliu doesn\'t say another word all night.)')],
        fx: (C) => { chBond(C, 'du', 2); chBond(C, 'liu6', -2); chBond(C, 'fang', -1); chRep(C, 'cruel', 2); C.S.flags.boyHead = 1; } },
      { q: 'Wake Chief Wu. Have him questioned.', led: 'Handed the boy to Chief Wu to be questioned.', a: [chL('方秀才替隊長問話。孩子說：西邊的山上，旗多得數不過來。都在等。', 'Fang questions him for the chief. The boy says: on the west ridge, more banners than he can count. All of them waiting.'), chL('吳老栓把話帶到劉總兵帳前。回來的時候他什麼也沒說，只把全隊的藤牌換到了西邊。', 'Chief Wu takes it to General Liu\'s tent. When he comes back he says nothing. He only moves every shield in the file to the west side.'), chL('（天亮前，書辦的人把孩子帶走了。）', '(Before dawn, the clerk\'s men come and take the boy away.)')],
        fx: (C) => { chBond(C, 'wu', 1); chRep(C, 'disc', 1); C.S.flags.warned = 1; } },
      { q: 'Cut him loose in the dark.', led: 'Cut the boy loose and let him run north.', a: [chL('你割斷繩子，朝北邊指了指。他看了你一眼，跑進了黑暗。', 'You cut the cord and point north. He looks at you once, and runs into the dark.'), chL('杜阿九：「五十兩。你知道他回去會說什麼？我們有多少人，在哪裡。」', 'Du: "Fifty taels. And you know what he\'ll tell them? How many we are. And where."'), chL('（天亮時書辦來查是誰放走了探子。吳老栓站出來：「我的隊，我的令。」他替你挨了二十棍，一聲沒吭。）', '(At first light the clerk comes asking who let the scout go. Chief Wu steps forward: "My file. My order." He takes twenty strokes for you, without a sound.)')],
        fx: (C) => { chBond(C, 'liu6', 2); chBond(C, 'du', -2); chBond(C, 'wu', 2); chRep(C, 'care', 1); C.S.flags.freed = 1; const D = chDD(C); if (D) { D.grudge = D.grudge || {}; D.grudge.du = 'boy'; } } },
    ] }),
  dream: (C, o) => o === 0 ? ['The night after', ['You dream of the well-house. A boy\'s bare foot in the snow, and Du Ajiu counting silver by the fire, and the count never ends.', 'Fifty. Fifty. Fifty.']]
    : o === 2 ? ['The night after', ['You dream that the boy comes back over the ridge with the banners behind him, and lifts his hand toward you.', 'You wake before you can tell whether he is pointing you out, or waving.']] : null,
  murmur: (C, o) => o === 0 ? ['liu6', '那個孩子……他光著一隻腳。', 'That boy... he had one bare foot.'] : o === 2 ? ['du', '五十兩。跑了。', 'Fifty taels. Ran off into the dark.'] : null,
  end: (C, o) => o === 0 ? `Fifty taels. ${chAlive(C, 'du') ? 'Du Ajiu sent them home to Chunhua.' : 'Du Ajiu never spent them.'}` : o === 1 ? 'The chief knew where the banners were. Nobody above him listened. The clerk took the boy anyway.' : 'Somewhere north of the pass a boy got home. Chief Wu took twenty strokes for it, and died two days later at Abudali.',
  talk: (C, k, o) => ({
    liu6: o === 0 ? { q: 'Xiaoliu. About the boy...', a: [chL('……他跟我一樣大。', '...He was my age.'), chL('（他轉過身去睡了。）', '(He turns over and goes to sleep.)')] } : o === 2 ? { q: 'You think he got home?', bond: 1, a: [chL('他跑得比兔子還快。一定到家了。', 'He ran faster than a hare. He got home. He did.')] } : null,
    du: o === 0 ? { q: 'What will you do with the silver?', a: [chL('寄給春花。……你別那樣看我。是你點的頭。', 'Send it to Chunhua. ...Don\'t look at me like that. You nodded.')] } : o === 2 ? { q: 'Still angry about the boy?', a: [chL('五十兩，你放跑了。隊長替你挨了棍子。你記著。', 'Fifty taels you let run off. And the chief took the staff for you. Remember that.')] } : null,
    he: o === 2 ? { q: 'Chief Wu took the strokes for me.', a: [chL('他願意。他說你做得對，可規矩是規矩，總得有人挨。', 'He wanted to. He said you were right, but rules are rules, and someone had to take it.')] } : null,
  })[k] || null,
};
// the Abudali variants the boy leaves behind him: warned (the shields face the ridge in time) or found (the Jin knew)
function chMissionVariants() {
  const M = SIM.MISSIONS, A = M.abudali; if (!A || M.abudali_w) return;
  const cp = (o) => JSON.parse(JSON.stringify(o));
  const W = cp(A); W.variantOf = 'abudali';
  W.groups.hong.army = ['cavalry', 'samurai', 'samurai', 'byakkotai', 'archer'];
  W.phases[1].say = W.phases[1].say.concat([[30, 'chief', 'Shields to the west side. The boy said the west ridge. Trust a scared boy over a rider in fine clothes.', '藤牌靠西。那孩子說的是西嶺。寧信嚇壞的孩子，也別信穿得體面的信使。']]);
  W.phases[2].say = [[1, 'chief', 'There — the west ridge, as the boy said! Shields are already facing them. Brace!', '西嶺——跟那孩子說的一樣！藤牌已經朝西了，頂住！']].concat(W.phases[2].say.filter(s => s[1] !== 'fang'));
  M.abudali_w = W;
  const F = cp(A); F.variantOf = 'abudali';
  F.groups.boy = { team: 1, name: 'Jin horsemen who knew the way', army: ['cavalry', 'byakkotai'], at: [104, -60, -PI_ / 2], reserve: true };
  F.phases[0].waves = (F.phases[0].waves || []).concat([[44, 'boy', ['attack']]]);
  F.phases[0].say = F.phases[0].say.concat([[45, 'lookout', 'Riders on the east slope — straight for our file! How do they know where we are?', '東坡有馬兵——直衝我們隊！他們怎麼知道我們在這兒？'], [50, 'du', 'Your boy told them. Fifty taels, I said.', '你那個孩子告訴他們的。五十兩，我說過。']]);
  M.abudali_f = F;
}
const PI_ = Math.PI;
// ---------------- the hooks into the Zhejiang flow ----------------
{ const _sg = startGame;
  startGame = function (msg, me, net, delay) { // the battle the save has earned
    try { chMissionVariants(); if (msg && msg.mode === 'campaign' && ZS && !ZS.sj) {
      if (msg.mission === 'abudali') { const o = chGot({ S: ZS }, 'z1boy'); if (o === 1) msg = Object.assign({}, msg, { mission: 'abudali_w' }); else if (o === 2) msg = Object.assign({}, msg, { mission: 'abudali_f' }); } } } catch (e) { console.warn('choices', e); }
    return _sg(msg, me, net, delay); }; }
{ const _s = zSleep;
  zSleep = function () {
    if (ZHOOK.sleep || !ZC || ZC.night >= 2) return _s();
    const C = chCtx(); if (!C) return _s(); chData(C.S);
    if (ZC.night === 0 && chGot(C, 'z1boy') < 0) { chDecide(CHD.z1boy.build(C), () => _s()); return; }
    if (ZC.night === 1 && chGot(C, 'z2road') < 0 && chZW(C)) { chDecide(CHD.z2road.build(C), (o) => chDream(() => {
      if (o === 2) return _s();
      const sc = o === 0 ? 'zford' : 'zfucha'; ZS.stage = sc; zSave();
      zCards([{ title: o === 0 ? '南 · South' : '東 · East', year: 'April 1619', p: [o === 0 ? 'You march before light, the wounded man limping in the middle of the file, south toward the passes and the river beyond them.' : 'You march east along the valley toward the smoke of the Korean camp at Fucha.'], btn: 'March →' }], () => zGo(sc)); })); return; }
    return chDream(() => _s()); }; }
// the talk at the fire remembers: every answer can give a man something to say about it
function chTalkAdd(D, k) {
  const C = chCtx(); if (!C) return D; const S = chData(C.S); const add = [];
  for (const e of S.ledger) { const R = CHD[e.id]; if (!R || !R.talk) continue; const t = R.talk(C, k, e.o); if (t) add.push(Object.assign({ chk: e.id }, t)); }
  if (!add.length) return D; if (!D) D = { g: (add.find(t => t.g) || {}).g || chL('……', '...'), t: [] }; return Object.assign({}, D, { t: add.concat(D.t || []) });
}
{ const _t = zTalk; zTalk = function (k, night) { return chTalkAdd(_t(k, night), k); }; }
// 二 · the ravine (camp1, before you sleep): a man of the file cannot walk, and there are three roads out
const chZW = (C) => ['liu6', 'he', 'ye', 'lou', 'luo', 'jin', 'wang', 'fang', 'du', 'zhu'].find(k => C.S.alive[k] && k !== C.S.me) || null;
CHD.z2road = {
  build: (C) => { const w = chZW(C), W = [chNm(C, w), chNm(C, w, true)], sp = ['he', 'fang', 'lou', 'luo', 'wang'].find(k => k !== w && C.S.alive[k] && k !== C.S.me);
    const S0 = sp ? [chNm(C, sp), chNm(C, sp, true)] : ['', 'The oldest man left'];
    return { id: 'z2road', keep: { w }, title: '峽谷 · The ravine', ltitle: `The ravine: ${W[1]}`, year: 'The night after Abudali, April 1619', who: [S0[0] ? `${S0[0]} ${S0[1]}` : S0[1], 'squatting by what is left of the fire'],
      lines: [chL(`（${W[0]}躺在火邊，腿用撕下的旗子綁著。他一晚上都醒著，裝睡。）`, `(${W[1]} lies by the fire with his leg bound in a torn banner. He has been awake all evening, pretending to sleep.)`),
        chL('三條路。往南翻山，四百里，抬著他走。慢。金人的哨騎守著山口。', 'Three roads. South over the mountains, four hundred li, carrying him. Slow. And their patrols are watching the passes.'),
        chL('往東去富察，朝鮮兵在那兒紮營。有火，有糧，他能躺下。可朝鮮人被圍好幾天了。', 'East to Fucha, where the Koreans are camped. Fires, food, somewhere for him to lie down. But the Koreans have been surrounded for days.'),
        chL('或者……給他留水，留把刀。我們今晚就走，走得快。', 'Or... we leave him water, and a knife. We go tonight, and we go fast.'),
        chL(`（${W[0]}什麼也沒說。他在看著你。）`, `(${W[1]} says nothing. He is looking at you.)`)],
      opts: [
        { q: 'We carry him. South, all of us.', led: `Carried ${W[1]} south over the mountains.`, a: [chL('好。那就抬。', 'Good. Then we carry him.'), chL('（你們把一根長槍削成拐杖。有人在旁邊扶著，他走得動。天沒亮就上路。）', '(You cut him a crutch from a spear shaft. He can walk, if someone walks beside him. You are on the road before light.)')], fx: (C) => { chBond(C, w, 2); chRep(C, 'care', 1); } },
        { q: 'To the Korean camp. He needs a fire.', led: `Took ${W[1]} east to the Korean camp at Fucha.`, a: [chL('朝鮮人……好吧。至少那邊有火。', 'The Koreans... all right. At least there\'s a fire.')], fx: (C) => { chBond(C, w, 1); } },
        { q: 'Leave him the water and the knife.', led: `Left ${W[1]} in the ravine with water and a knife.`, a: [chL(`${W[0]}：「……去吧。」他再也沒看你一眼。`, `${W[1]}: "...Go on." He doesn't look at you again.`), chL('（你們走了一夜。沒人說話，沒人回頭。每個人都想回頭。）', '(You walk south all night. Nobody speaks. Nobody looks back. Everyone wants to.)')],
          fx: (C) => { chLose(C, w, 'left', 'z2road'); for (const k in C.S.alive) if (C.S.alive[k] && k !== C.S.me && k !== 'me') chBond(C, k, -1); chRep(C, 'care', -2); } },
      ] }; },
  dream: (C, o) => { const w = (C.S.ch.z2road || {}).w, n = w ? chNm(C, w, true) : 'him';
    if (o === 2) return ['Every night since', [`Water dripping somewhere in a ravine. ${n} calling your name, patiently, as if you had only stepped away for a moment.`, 'In the dream you always go back. You never get there.']];
    if (o === 1 && chGot(C, 'z2tent') === 1) return ['After Fucha', ['The flap of the Korean surgeon\'s tent, falling shut. Through the cloth, the shapes of men coming in, and no sound at all.']];
    return null; },
  murmur: (C, o) => { const w = (C.S.ch.z2road || {}).w; if (!w) return null; const n = [chNm(C, w), chNm(C, w, true)]; return o === 2 ? ['he', `${n[0]}的刀……不知道他用了沒有。`, `${n[1]}'s knife... I wonder if he used it.`] : C.S.alive[w] ? [w, '四百里。我一步一步數的。', 'Four hundred li. I counted every step.'] : null; },
  end: (C, o) => { const w = (C.S.ch.z2road || {}).w, n = w ? chNm(C, w, true) : 'He';
    if (o === 2) return `${n} was left in the ravine above Abudali with water and a knife. Nobody knows what he did with the knife.`;
    if (o === 1) return chGot(C, 'z2tent') === 1 ? `${n} was left in the surgeons' tent at Fucha. The Jin killed every Ming soldier they found in the Korean camp.` : C.S.alive[w] ? `You carried ${n} out of Fucha when the Koreans gave up. He lived.` : `You went back for ${n} at Fucha. You could not get him out.`;
    return C.S.alive[w] ? `You carried ${n} four hundred li over the mountains. He lived.` : `You carried ${n} as far as the river.`; },
  talk: (C, k, o) => { const w = (C.S.ch.z2road || {}).w; if (!w) return null; const n = [chNm(C, w), chNm(C, w, true)];
    if (k === w && C.S.alive[w] && o === 0) return { q: 'How is the leg?', bond: 1, a: [chL('你們抬了我四百里。……總有一天，我把你抬回義烏。', 'You carried me four hundred li. ...One day I\'ll carry you home to Yiwu.')] };
    if (o === 2 && (k === 'luo' || k === 'he' || k === 'lou')) return { q: `Do you think about ${n[1]}?`, a: [chL(`每天。${n[0]}要是在，這會兒該笑我們了。`, `Every day. If ${n[1]} were here he'd be laughing at us right now.`), chL('……那天換了我，我也會那麼選。我只是不想再說它。', '...If it had been my call, I might have chosen the same. I just don\'t want to talk about it.')] };
    return null; },
};
// 二 · the battles the ravine leads to: the ford (carry him south) and Fucha (the Korean camp)
CH.missions = () => {
  const M = SIM.MISSIONS, PI = Math.PI; if (M.zford) return;
  M.zford = { title: '無名河 · The ford', year: 'April 1619', battle: 'toba', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'zb',
    bdef: { name: 'A river in the hills', jp: '無名河', when: 'April 1619', biome: 'winter', fog: 0.45 },
    brief: 'Two days south of Abudali the survivors come down to a river with a single ford. You carry your wounded with you.',
    start: [0, 112, PI],
    zones: [{ key: 'ford', x: 0, zr: 18, r: 11, name: 'The ford' }, { key: 'sbank', x: 0, zr: -20, r: 12, name: 'The south bank' }, { key: 'south', x: 4, z: -132, r: 14, name: 'The track south' }],
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [0, 112, PI], dir: ['hold', 0, 108], stay: true },
      strag: { team: 0, name: 'Stragglers from the column', zh: '潰兵', army: ['ashigaru'], n: 7, at: [10, 122, PI], dir: ['hold', 8, -128] },
      p1: { team: 1, name: 'A Jin patrol', zh: '金哨騎', army: ['cavalry'], n: 6, at: [-130, 70, PI / 2], reserve: true },
      p2: { team: 1, name: 'Jin horse at the ford', zh: '金騎', army: ['cavalry', 'archer'], n: 12, at: [132, -34, -PI / 2], reserve: true },
      p3: { team: 1, name: 'Jin horsemen', zh: '金騎', army: ['cavalry'], n: 7, at: [-132, -96, PI / 2], reserve: true },
    },
    choices: [[[['wound', '$k']]]],
    phases: [
      { title: '一 · 夜路 · The night road', goal: 'Get your wounded down to the ford', text: 'Before dawn, down out of the hills to the river. Your wounded man is slow. Keep the file around him.', show: ['ford'],
        obj: { reach: 'ford' }, at: [[1, ['promote']]], waves: [[40, 'p1', ['attack']]],
        say: [[3, 'he', 'Slow and steady. Every stone hurts a broken leg.', '慢點，穩點。腿傷了，每塊石頭都疼。'], [14, 'fang', 'The river is low this time of year. There is a ford, if the map is right.', '這個時節水淺。地圖沒錯的話，有個淺灘。'],
          [41, 'lookout', 'Horsemen behind us, on the west slope!', '後面西坡上有馬兵！'], [46, 'luo', 'Put him down and fight, or keep walking?', '放下他打，還是接著走？']] },
      { title: '二 · 渡 · The ford', goal: 'Hold the ford until your wounded is across', text: 'The ford. Get everyone over, the wounded first, and hold the water\'s edge until they are.', show: ['sbank'], hide: ['ford'],
        obj: { survive: 50 }, waves: [[10, 'p2', ['attack']]],
        say: [[2, 'he', 'The wounded first! Spears at the water\'s edge!', '傷的先過！長槍守水邊！'], [11, 'lookout', 'More of them on the far bank!', '對岸也有！'], [30, 'wang', 'The water is like knives.', '這水跟刀子一樣。']] },
      { title: '三 · 南 · South', goal: 'Carry on south out of the hills', text: 'Over. Now south, before they bring more.', show: ['south'], hide: ['sbank'],
        obj: { extract: 'south' }, limit: 360, fail: 'They caught the file on the open track.', waves: [[22, 'p3', ['attack']]],
        say: [[2, 'fang', 'South. Every li south is a li nearer home.', '往南。往南走一里，離家近一里。'], [23, 'lookout', 'Riders on the track ahead!', '前面有馬兵！']] },
    ],
    win: 'You carried your wounded out of the hills.' };
  M.zfucha = { title: '富察 · Fucha', year: 'April 1619', battle: 'zroad', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'zb',
    bdef: { name: 'Fucha', jp: '富察', when: 'April 1619', biome: 'winter', fog: 0.3 },
    brief: 'The Korean army of Gang Hong-rip, cut off and starving, is camped at Fucha. Ming survivors from Abudali are drifting into its lines.',
    start: [0, -100, 0],
    zones: [{ key: 'kcamp', x: 0, z: 60, r: 15, name: 'The Korean camp' }, { key: 'south', x: 0, z: -132, r: 14, name: 'The road south' }],
    forts: [[-16, 60, 0.5, 14, 1.6, 'palisade'], [16, 60, 0.5, 14, 1.6, 'palisade'], [-10, 74, 6, 0.5, 1.6, 'palisade'], [10, 74, 6, 0.5, 1.6, 'palisade'], [-10, 46, 6, 0.5, 1.6, 'palisade'], [10, 46, 6, 0.5, 1.6, 'palisade'], [-6, 66, 1.6, 1.2, 1.9, 'tent'], [6, 54, 1.6, 1.2, 1.9, 'tent']],
    labels: { rifle_imp: ['Korean musketeers', '朝鮮銃手'] },
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [0, -100, 0], dir: ['hold', 0, -96], stay: true },
      korea: { team: 0, name: 'Gang Hong-rip\'s Koreans', zh: '姜弘立', army: ['rifle_imp', 'rifle_imp', 'ashigaru', 'archer'], at: [0, 62, 0], dir: ['hold', 0, 62], stay: true, exit: [0, 150] },
      jin: { team: 1, name: 'Daišan\'s banners', zh: '代善', army: ['cavalry', 'samurai', 'samurai', 'cavalry'], at: [0, 138, PI], reserve: true, stay: true, dir: ['hold', 0, 100] },
      take: { team: 1, name: 'Bannermen sent into the camp', zh: '金兵', army: ['samurai', 'samurai', 'archer'], at: [-124, 64, PI / 2], reserve: true },
      cut: { team: 1, name: 'Jin horsemen', zh: '金騎', army: ['cavalry', 'cavalry'], at: [118, -64, -PI / 2], reserve: true },
    },
    choices: [[[['wound', '$k']]], [[], [['park', '$k', -6, 63]]]],
    phases: [
      { title: '一 · 富察 · Fucha', goal: 'Bring your file into the Korean camp', text: 'East to Fucha. The Korean camp, its palisade, its fires. Bring your wounded in.', show: ['kcamp'],
        start: [['release', 'jin'], ['calm', 'jin', 6]], obj: { all: [{ reach: 'kcamp' }, { survive: 50 }] }, at: [[1, ['promote']]],
        say: [[4, 'fang', 'They have been starving here for days. Look at the horses — skin and bone.', '他們在這裡餓了好幾天了。你看那些馬，皮包骨。'], [16, 'korea', 'Ming soldiers? Come in, come in. There is a little millet left.', '明國的兵？進來，進來。還剩一點小米。'],
          [34, 'lookout', 'Banners on the north road. They are not attacking. They are waiting.', '北邊路上有旗。他們不打，他們在等。']] },
      { title: '二 · 議 · The parley', goal: 'Wait in the camp with your wounded', text: 'The Korean general has ridden out to talk with the Jin. Wait.',
        obj: { survive: 46 },
        say: [[3, 'korea', 'The general has gone out under a white flag to talk with them.', '都元帥打著白旗出去了，跟他們談。'], [14, 'fang', 'Terms. Terms for whom?', '議和。替誰議的和？'],
          [30, 'korea', 'He says they will let us go home. Only... they want the Ming men handed over.', '他說他們放我們回國。只是……明兵要交出去。'], [38, 'he', 'Handed over. We know what that means.', '交出去。我們知道那是什麼意思。']] },
      { title: '三 · 降 · The surrender', goal: 'Break out of the camp and run south', text: 'The Koreans are laying down their arms. The Jin are coming in for the Ming men. Get out — south, down the road.', show: ['south'], hide: ['kcamp'],
        start: [['break', 'korea'], ['release', 'take'], ['dir', 'take', 'attack'], ['dir', 'jin', 'attack'], ['calm', 'jin', 30]],
        obj: { extract: 'south' }, limit: 360, fail: 'The Jin went through the Korean camp tent by tent.', waves: [[25, 'cut', ['hold', 0, -84]]],
        say: [[1, 'lookout', 'The Koreans are stacking their muskets! They are giving up!', '朝鮮兵把銃都堆起來了！他們降了！'], [26, 'lookout', 'Horsemen on the road south!', '南邊路上有馬兵！']] },
    ],
    win: 'You broke out of Fucha.' };
};
// in Fucha, when the Koreans give up: the tent, and the man in it
CHD.z2tent = {
  build: (C) => { const w = (C.S.ch.z2road || {}).w, n = [chNm(C, w), chNm(C, w, true)];
    return { id: 'z2tent', urgent: true, timer: 11, def: 1, title: 'The surgeons\' tent', ltitle: `Fucha: ${n[1]} in the surgeons' tent`, kick: '抉擇 · NOW', who: [n[0] + ' ' + n[1]],
      lines: [chL(`${n[0]}還在朝鮮人的醫帳裡！金兵進營了——`, `${n[1]} is still in the Korean surgeons' tent! The Jin are inside the camp —`)],
      opts: [{ q: `Go back for ${n[1]}`, led: `Went back into the camp for ${n[1]}.`, a: [chL('回去！把他架出來！', 'Back! Get him out!')], fx: (C) => { chBond(C, w, 2); } },
        { q: 'Run. There is no time.', led: `Ran, and left ${n[1]} in the tent.`, a: [chL('……跑！', '...Run!')], fx: (C) => { chRep(C, 'care', -1); } }] }; },
  end: () => '',
};
// ---------------- starting and finishing the branch battles ----------------
const CHZB = {
  zford: { m: 'zford', zone: 'south', next: 'kai', card: ['April 1619. Two days south of Abudali, the remnants come down out of the hills to a river. Your wounded man is with the file; if he goes down, get him up (E). F follow · H halt · C charge · Z form up.', '無名河 · The ford'], init: 0, file: () => zFileK() },
  zfucha: { m: 'zfucha', zone: 'south', next: 'kai', card: ['April 1619. East to Fucha, where Gang Hong-rip\'s Korean army is camped behind its palisade. Bring your file and your wounded in. F follow · H halt · C charge · Z form up.', '富察 · Fucha'], init: 0, file: () => zFileK() },
};
function chStartZ(scene) {
  const B = CHZB[scene]; CH.missions(); CH.missions2(); ZS = zLoad() || zFresh(); chData(ZS); ZHOOK.who = Object.assign({}, ZHOOK.who || {}, CHWHO);
  $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, yyRole: 'lead', connected: true }];
  startGame({ seed, battle: SIM.MISSIONS[B.m].battle, mode: 'campaign', mission: B.m, players: pl }, 0, null, 1);
  const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq]; const meIdx = ZR.findIndex(r => r.k === (ZS.me || 'me'));
  ZB = { map: {}, sq: q.id, first: me.heroId, cur: ZS.me || 'me', fell: false, ch2: true, chz: scene };
  const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = meIdx; const file = B.file();
  const left = []; for (const r of file) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role === r.role); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } else left.push(r); }
  for (const r of left) { const id = q.unitIds.find(uid => !used[uid] && sim.units[uid].role !== 'lead'); if (id !== undefined) { used[id] = 1; ZB.map[id] = ZR.indexOf(r); } }
  for (const uid in ZB.map) zDress(sim.units[uid], ZB.map[uid]);
  // the wounded man of the ravine starts the fight wounded: tell the sim which place in the file is his
  const w = (ZS.ch.z2road || {}).w; let k = -1; if (w) for (const uid in ZB.map) if (ZR[ZB.map[uid]] && ZR[ZB.map[uid]].k === w) k = q.unitIds.indexOf(+uid);
  ZB.wk = k; ZB.wkey = w; if (B.init !== undefined && k >= 0) chAfterTicks(sim, 4, () => chSend(B.init, 0, k));
  if (B.dress) B.dress(sim);
  setTimeout(() => storyCard(B.card[0], B.card[1]), 700);
}
function chAfterTicks(sim, n, fn) { let tries = 0; const iv = setInterval(() => { if (state.sim !== sim || ++tries > 300) return clearInterval(iv); if (sim.tick >= n) { clearInterval(iv); fn(); } }, 100); }
function chFinishZ(winner) {
  const sim = state.sim, h = localHero(), M = sim.mission, B = CHZB[ZB.chz], z = sim.missionZone(B.zone), won = winner === M.side;
  const fate = {}, near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const r = ZR[ZB.map[uid]]; if (!r) continue; const u = sim.units[uid]; if (u.dead) { fate[r.k] = 'dead'; continue; }
    const out = (near(u, won ? 26 : 12) || (z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 10)) && !(u.wounded && u.helpedBy < 0 && !near(u, 5) && !(z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 4)); fate[r.k] = out ? 'out' : 'lost'; }
  for (const k of ZB.deadMe || []) fate[k] = 'dead';
  const C = chCtx(); if (ZB.chz === 'zfucha' && ZB.wkey && chGot(C, 'z2tent') === 1) fate[ZB.wkey] = 'dead';
  const meK = ZS.me || 'me'; if (fate[meK] === undefined) fate[meK] = h && !h.dead ? 'out' : 'dead';
  if (ZB.cur && ZB.cur !== meK && ZB.cur !== 'stranger' && fate[meK] === 'dead') { const nk = ZB.cur; ZS.me = nk; ZS.oldName = ZS.name; ZS.name = { zh: zRow(nk).zh, en: zRow(nk).en }; }
  const file = B.file(); if (B.ch2) ZS.fate2 = {}; for (const r of file) { const f = fate[r.k] || 'lost'; if (B.ch2) ZS.fate2[r.k] = f; else ZS.fate[r.k] = f; ZS.alive[r.k] = f === 'out'; }
  if (ZB.chz === 'hunw') { const g = sim.mg.ran, ru = g && sim.units[sim.players[g.p].heroId]; const zs = sim.missionZone('sbank'); ZS.flags.ranLived = ru && !ru.dead && ((zs && Math.hypot(ru.x - zs.x, ru.z - zs.z) < zs.r + 14) || near(ru, 16)) ? 1 : 0; let lastN = 0; const gl = sim.mg.last; if (gl && gl.released) for (const id of sim.players[gl.p].squads) for (const uid of sim.squads[id].unitIds) if (!sim.units[uid].dead) lastN++; ZS.flags.polesSaved = lastN; }
  if (ZB.cur && ZB.cur !== 'me' && ZB.cur !== 'stranger') ZS.alive[ZB.cur] = !!(h && !h.dead);
  if (ZB.wkey) { ZS.flags.z2out = ZS.alive[ZB.wkey] ? 1 : 0; if (!ZS.alive[ZB.wkey]) chData(ZS).chLost[ZB.wkey] = { id: 'z2road', how: fate[ZB.wkey] }; }
  ZS.stage = B.next; zSave();
  const all = [{ k: meK, zh: ZS.name.zh, en: ZS.name.en, me: true }].concat(file.filter(r => r.k !== meK));
  const li = all.map(r => { const f = r.me ? 'out' : (B.ch2 ? ZS.fate2 : ZS.fate)[r.k] || 'lost'; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${r.zh} ${r.en}${r.me ? ' (you)' : ''}${r.k === ZB.wkey ? ' — the wounded man' : ''} — ${f === 'out' ? 'came out' : f === 'dead' ? 'killed' : 'missing'}</li>`; }).join('');
  const outN = file.filter(r => ZS.alive[r.k]).length + 1, wn = ZB.wkey ? chNm(C, ZB.wkey, true) : '';
  $('resultTitle').textContent = won ? (ZB.chz === 'zford' ? '渡 · Across the river' : ZB.chz === 'hunw' ? '回 · Back over the bridge' : '出 · Out of Fucha') : '散 · Scattered'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? M.win : 'They caught you on the road, but a few of you got away after dark.'} ${outN} of your file came out.${wn ? (ZS.alive[ZB.wkey] ? ` ${wn} came out with you.` : ` ${wn} did not.`) : ''}${ZB.chz === 'hunw' ? (ZS.flags.ranLived ? ' Ran Jiahu came back over the bridge.' : ' Ran Jiahu did not come back.') + (ZS.flags.polesSaved ? ` ${ZS.flags.polesSaved} more White Poles got over while you held the bridge end.` : '') : ''}`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  const hist = ZB.chz === 'zfucha' ? { title: '富察 · What happened', year: 'The fourth month of 1619', p: ['Cut off and starving, Gang Hong-rip surrendered the Korean army at Fucha to Daišan. The Koreans were spared and most were later sent home. The Ming soldiers who had fled into their camp were not: the Jin took them out and killed them.', 'Gang Hong-rip himself was kept in the Jin capital for years. In Korea it was said he had been told by his own king to surrender if the war went badly.'], zh: '姜弘立以朝鮮兵降。明兵在營者，皆為金人所殺。' }
    : { title: '南 · South', year: 'The fourth month of 1619', p: ['For ten days the file walked south through the hills, carrying its wounded, eating what it could find, hiding from the Jin patrols by day.', 'Behind you, the Korean army at Fucha surrendered to the Jin. The Ming soldiers who had fled into its camp were taken out and killed.'], zh: '朝鮮兵降金，明兵在營者皆死。' };
  if (ZB.chz === 'hunw') { $('btnNext').onclick = () => { $('result').hidden = true; zCards([{ title: '渾河 · What happened', year: 'The third month of 1621', p: ['The White Poles on the north bank threw back the first Jin charges and killed many, but they were worn down and overwhelmed; Qin Bangping and Zhou Dunji were killed. Of some three thousand Sichuan men, a handful came back over the bridge.',
      'South of the river, about three thousand Zhejiang men under Qi Jin and Zhang Mingshi fought behind their wagons until their powder ran out, then hand to hand into the night. Chen Ce, Tong Zhongkui, Qi Jin and Zhang Mingshi all died. Days later Liaoyang fell.'], zh: '川兵、浙兵俱沒於渾河。' },
      { title: '伍 · Your file', year: `${outN} came out`, html: `<ul>${li}</ul>`, btn: 'Night falls →' }], () => zGo(B.next)); }; return; }
  $('btnNext').onclick = () => { $('result').hidden = true; zCards([hist, { title: '伍 · Your file', year: `${outN} came out`, html: `<ul>${li}</ul>`, btn: 'On →' },
    { title: '第一章終 · End of Chapter One', year: 'April 1619', p: [`${outN} of your file reach the Ming lines. What is left of the southern troops is spread among the northern garrisons. Your file is sent to Tieling, a walled town on the road between Shenyang and Kaiyuan.`], zh: '間章 · 開原道 · The Kaiyuan road, summer 1619', btn: 'Summer →' }], () => zGo(B.next)); };
}
{ const _st = zStart; zStart = function (scene) { if (CHZB[scene]) return chStartZ(scene); return _st(scene); }; }
{ const _f = zheFinish; zheFinish = function (w) { if (ZB && ZB.chz && CHZB[ZB.chz]) { try { if (typeof ddFinish === 'function') ddFinish(w); } catch (e) { } const r = chFinishZ(w); try { if (typeof ddResultLine === 'function') ddResultLine(); } catch (e) { } return r; } return _f(w); }; }
// the in-battle choices: when the sim reaches the moment, the panel burns; the answer goes to the sim as a command
const CHBT = {
  zfucha: [{ ph: 2, t: 3, id: 'z2tent', cid: 1, when: () => ZB && ZB.wk >= 0 && chGot(chCtx(), 'z2tent') < 0 }],
};
function chBattleTick() {
  const sim = state.sim; if (!sim || !sim.mission || !ZB || state.ended || CH.live) return; const L = CHBT[sim.cfg.mission]; if (!L) return;
  const el = (sim.tick - sim.mv.t0) / 30; for (const b of L) { const key = sim.cfg.mission + ':' + b.id; if (CH.fired[key] === sim || sim.mv.ph !== b.ph || el < b.t) continue; if (b.when && !b.when()) { CH.fired[key] = sim; continue; }
    CH.fired[key] = sim; const C = chCtx(); const spec = CHD[b.id].build(C); chDecide(spec, (i) => chSend(b.cid, i, b.k ? b.k() : (ZB.wk >= 0 ? ZB.wk : 0))); return; }
}
{ const _h = zheHUD; zheHUD = function (dt) { const r = _h(dt); try { chBattleTick(); chCampTick(dt); } catch (e) { console.warn('choices', e); } return r; }; }
const CHWHO = { korea: ['朝鮮兵', 'A Korean musketeer'], ran: ['冉家虎', 'Ran Jiahu of the White Poles'], qijin: ['戚金', 'General Qi Jin'] };

// 三 · the bridge (camp2, the night before the Hun River): Ran Jiahu asks your file to cross with the White Poles
CHD.z3bridge = {
  build: (C) => ({ id: 'z3bridge', title: '浮橋 · The bridge', ltitle: 'The Hun River bridge', year: 'The night before the Hun River, 1621', who: ['冉家虎 Ran Jiahu', 'a White Pole of Shizhu, his white-ringed pole over his shoulder'],
    lines: [chL('（他走到你的火邊。河對岸，川營的火一直燒到天邊。）', '(He comes to your fire. Across the river the fires of the Sichuan camp burn all the way to the dark.)'),
      chL('秦將軍天一亮就過河。我們缺能近身打的人。你的鴛鴦隊——跟我們去北岸。', 'General Qin crosses at first light. We are short of men who can fight close. Your duck team — come with us to the north bank.'),
      chL('戚金：他們是你的人。我不下這個令。要去，就過橋去——回來的時候，橋很窄。', 'Qi Jin: They are your men. I won\'t order it. If you go, you go over the bridge — and coming back, the bridge is narrow.'),
      chL('（你的人都在看你。北岸，是金兵第一個要打的地方。）', '(Your men are all looking at you. The north bank is where the Jin will strike first.)')],
    opts: [
      { q: 'We cross with the White Poles.', led: 'Crossed the Hun River with the White Poles.', a: [chL('好！你們的藤牌，我們的白杆——這條河會記住的。', 'Good! Your shields and our poles — this river will remember it.')], fx: (C) => { chBond(C, 'ran', 2); chRep(C, 'valor', 1); } },
      { q: 'We stay with Qi Jin\'s wagons.', led: 'Stayed south of the river in Qi Jin\'s wagon camp.', a: [chL('……好吧。那就北岸見——不，那就之後見。給我們把橋口守住。', '...So be it. Then we\'ll see you after. Keep the bridge open for us.'), chL('（他走回橋上，沒有回頭。）', '(He walks back over the bridge and does not look round.)')], fx: (C) => { chBond(C, 'ran', -1); } },
    ] }),
  dream: (C, o) => o === 1 ? ['After the Hun River', ['White poles standing in the river ice like reeds, a hundred of them, a thousand. On one of them the white ring is still clean.', 'Ran Jiahu, from the far bank: "Keep the bridge open for us."']] : (C.S.flags.ranLived ? null : ['After the Hun River', ['The bridge end, and Ran Jiahu\'s back, and the white pole turning in his hands. You are walking away from him. In the dream the bridge is a thousand li long.']]),
  murmur: (C, o) => C.S.flags.ranLived ? ['ran', '白杆兵，三千人過橋。回來的……', 'Three thousand White Poles went over that bridge. The ones who came back...'] : o === 1 ? ['fang', '他來請我們過河。我們沒去。', 'He came to ask us across. We didn\'t go.'] : null,
  end: (C, o) => o === 1 ? 'You stayed south of the river. The White Poles died on the north bank; Ran Jiahu among them.' : C.S.flags.ranLived ? 'You crossed with the White Poles. Ran Jiahu came back over the bridge with you, and lived.' : 'You crossed with the White Poles. Ran Jiahu stayed at the bridge end.',
  talk: (C, k, o) => k === 'ran' && C.S.flags.ranLived ? { g: chL('橋還在我夢裡。', 'I still see that bridge when I sleep.'), q: 'You lived.', bond: 1, a: [chL('秦將軍、周將軍都沒回來。三千白杆，過來的不到一百。', 'General Qin and General Zhou didn\'t come back. Three thousand White Poles; fewer than a hundred came over.'), chL('我欠你一條命。四川的人，欠了就記著。', 'I owe you a life. Sichuan men remember what they owe.')] }
    : (o === 1 && (k === 'xiaoman' || k === 'shao' || k === 'bao')) ? { q: 'Do you think we should have crossed?', a: [chL('那個白杆兵……他來請我們的時候，我就站在你旁邊。', 'That White Pole... I was standing next to you when he came to ask.'), chL('我不知道。我只知道我還活著。', 'I don\'t know. I only know I\'m alive.')] } : null,
};
CHD.z3ran = {
  build: (C) => ({ id: 'z3ran', urgent: true, timer: 12, def: 1, title: 'The bridge end', ltitle: 'The bridge end', kick: '抉擇 · NOW', who: ['冉家虎 Ran Jiahu'],
    lines: [chL('走！我守橋口，等我的人都過來！', 'Go! I hold the bridge end till the last of my men are over!')],
    opts: [{ q: 'Hold the bridge end with him', led: 'Held the bridge end with Ran Jiahu for the last of the White Poles.', a: [chL('一起守！讓白杆的人先過！', 'We hold it together! Let the White Poles cross!')], fx: (C) => { chBond(C, 'ran', 2); chRep(C, 'valor', 1); } },
      { q: 'Drag him back over with you', led: 'Dragged Ran Jiahu back over the bridge, and left the rest.', a: [chL('別傻了，跟我走！', 'Don\'t be a fool — come with me!')], fx: (C) => { } }] }),
  end: () => '',
};
CH.missions2 = () => {
  const M = SIM.MISSIONS, PI = Math.PI; if (M.hunw) return;
  M.hunw = { title: '渾河北岸 · The north bank', year: 'Spring 1621', battle: 'toba', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'zb',
    brief: 'Shenyang fell yesterday. The Sichuan White Poles under Qin Bangping and Zhou Dunji have crossed the Hun River to fight on the north bank. Your file has crossed with them.',
    start: [70, 24, 0],
    zones: [{ key: 'ncamp', x: 76, zr: 30, r: 16, name: 'The Sichuan camp', owner: 0, rate: 0.5 }, { key: 'sbank', x: 74, zr: -24, r: 12, name: 'Back over the bridge' }],
    forts: [[62, 44, 0.5, 6, 1.4, 'mantlet'], [90, 44, 0.5, 6, 1.4, 'mantlet'], [76, 52, 6, 0.5, 1.4, 'mantlet']],
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [70, 24, 0], dir: ['hold', 70, 30], stay: true },
      sichuan: { team: 0, name: 'Qin Bangping (White Poles)', zh: '秦邦屏', army: ['ashigaru', 'ashigaru', 'ashigaru', 'samurai'], at: [80, 34, 0], dir: ['hold', 80, 40] },
      ran: { team: 0, name: 'Ran Jiahu', zh: '冉家虎', army: ['ashigaru'], n: 5, at: [74, 30, 0], dir: ['hold', 74, 34], stay: true },
      qijin: { team: 0, name: 'Qi Jin', zh: '戚金', army: ['yuanyang', 'rifle_imp'], at: [58, -64, 0], dir: ['hold', 58, -60], stay: true },
      last: { team: 0, name: 'The last of the White Poles', zh: '白杆兵', army: ['ashigaru'], n: 9, at: [96, 62, PI], reserve: true, dir: ['hold', 72, -30] },
      bayara: { team: 1, name: 'The red Bayara', zh: '紅巴牙喇', army: ['shinsengumi', 'shinsengumi', 'cavalry'], at: [60, 138, PI], reserve: true, stay: true },
      rw: { team: 1, name: 'The right wing', army: ['samurai', 'samurai', 'ashigaru', 'archer', 'cavalry'], at: [100, 138, PI], reserve: true, stay: true },
      guns: { team: 1, name: 'The Shenyang guns', army: ['cannon4', 'rifle_sho'], at: [86, 112, PI], reserve: true, stay: true, dir: ['hold', 86, 92] },
      lw: { team: 1, name: 'The left wing', army: ['samurai', 'samurai', 'archer', 'cavalry'], at: [-30, 130, PI], reserve: true },
    },
    choices: [[[['dir', 'ran', 'hold', 74, 10], ['release', 'last']], [['dir', 'ran', 'hold', 72, -28]]]],
    phases: [
      { title: '一 · 北岸 · The north bank', goal: 'Stand with the White Poles', text: 'Across the bridge with the White Poles. Stand with them in the Sichuan camp and meet the charge.', show: ['ncamp'],
        obj: { survive: 66 }, at: [[1, ['promote']]], waves: [[22, 'bayara', ['attack']]],
        say: [[3, 'sichuan', 'If we cannot save Shenyang, what have we been doing here these three years?', '我輩不能救瀋，在此三年何為！'], [9, 'ran', 'Stand by my pole. It is longer than your spear.', '站我旁邊。我的白杆比你的長槍長。'],
          [23, 'lookout', 'Red banners — the Khan\'s own guard, riding straight at us!', '紅旗——巴牙喇，直衝我們來了！'], [52, 'lookout', 'They threw them back! The White Poles held!', '打退了！白杆兵頂住了！']] },
      { title: '二 · 砲 · Their guns', goal: 'Hold the Sichuan camp', text: 'The Jin right wing comes on in strength, and behind it guns.',
        start: [['release', 'rw'], ['dir', 'rw', 'attack'], ['dir', 'bayara', 'attack']], obj: { survive: 80 }, waves: [[24, 'guns', ['hold', 86, 92]]], at: [[74, ['kill', 'sichuan']]],
        say: [[25, 'lookout', 'Guns! They have Shenyang\'s cannon!', '砲！他們拿了瀋陽的大砲！'], [30, 'fang', 'Li Yongfang found our own gunners among the prisoners and paid them to serve those guns.', '李永芳在俘虜裡找出我們的砲手，給銀子讓他們開砲。'],
          [70, 'lookout', 'The white banners are going down, one after another.', '白旗一面一面倒了。'], [75, 'soldier', 'Qin Bangping is down! Zhou Dunji is down!', '秦邦屏陣亡！周敦吉陣亡！']] },
      { title: '三 · 橋 · Back over the bridge', goal: 'Get your file back across the bridge', text: 'The north bank is lost. Get your file back over the bridge to the south bank.', show: ['sbank'], hide: ['ncamp'],
        start: [['release', 'lw'], ['dir', 'lw', 'attack'], ['dir', 'sichuan', 'hold', 74, -26]], obj: { extract: 'sbank' }, limit: 300, fail: 'The Jin closed the bridge behind you.',
        say: [[3, 'ran', 'Go! I hold the bridge end until the last of my men are over!', '走！我守橋口，等我的人都過來！']] },
    ],
    win: 'You came back over the Hun River.' };
};
CHZB.hunw = { m: 'hunw', zone: 'sbank', next: 'camp3', ch2: true, card: ['Spring 1621. Over the bridge with the White Poles, to the Sichuan camp on the north bank of the Hun River. F follow · H halt · C charge · Z form up.', '渾河北岸 · The north bank'], file: () => zFile2(),
  dress: (sim) => { for (const [g, k] of [['ran', 'ran'], ['qijin', 'qijin']]) { const G = sim.mg[g]; if (G) zDress(sim.units[sim.players[G.p].heroId], ZR.findIndex(r => r.k === k)); } } };
CHBT.hunw = [{ ph: 2, t: 4, id: 'z3ran', cid: 0, when: () => { const s = state.sim, g = s && s.mg.ran; const u = g && s.units[s.players[g.p].heroId]; return !!(u && !u.dead); } }];
// three-eyed choice: the bridge decides between the old battle and the new one
{ const _s2 = zSleep2;
  zSleep2 = function () {
    const C = chCtx(); if (!C || ZHOOK.sleep) return _s2(); chData(C.S);
    if (ZC.night === 2 && chGot(C, 'z3bridge') < 0) { chDecide(CHD.z3bridge.build(C), (o) => { if (o === 1) return _s2();
      ZS.stage = 'hunw'; zSave(); zCards([{ title: '黎明 · Dawn', year: 'Spring 1621', p: ['Before light you take your file over the bridge behind the White Poles. On the far bank their camp is already awake, and the poles stand up against the sky like a reed bed.', 'Behind you, south of the river, Qi Jin\'s men are digging in around the wagons.'], btn: 'Over the bridge →' }], () => zGo('hunw')); }); return; }
    if (ZC.night === 3) return chDream(() => chLetter(C, () => { const L = chLedgerCard(C); if (L) zCards([L], () => _s2()); else _s2(); }));
    return chDream(() => _s2()); }; }
// Ran Jiahu sits at the fire on the night after, if he came back over the bridge
{ const _cc = zCampCfg2; zCampCfg2 = function (night) { const c = _cc(night); try { if (night === 3 && ZS.flags && ZS.flags.ranLived) { const sp = [-1.6, -2.8]; c.npcs.push({ role: 'spear', x: sp[0], z: sp[1], yaw: +Math.atan2(-sp[0], -sp[1]).toFixed(3), ci: ZR.findIndex(r => r.k === 'ran'), pose: 'squat' }); } } catch (e) { } return c; }; }

// ---------------- a letter home ----------------
// at the end of a campaign: write to the family of one of the dead
function chLetterWho(C) {
  const S = C.S, dead = Object.keys(S.alive).filter(k => S.alive[k] === false && k !== 'me' && k !== S.me && chRowIn(C.R, k) && !chRowIn(C.R, k).guest && S.fate[k] !== 'home' && S.fate[k] !== 'gone');
  if (!dead.length) return null; if (C.c === 'zhe' && dead.includes('lou') && S.flags.letter) return 'lou';
  const lost = dead.filter(k => S.chLost && S.chLost[k]); const pool = lost.length ? lost : dead;
  return pool.sort((a, b) => (S.bond[b] || 0) - (S.bond[a] || 0))[0];
}
CHD.letter = {
  build: (C) => { const k = chLetterWho(C), n = [chNm(C, k), chNm(C, k, true)], lou = C.c === 'zhe' && k === 'lou' && C.S.flags.letter, why = C.S.chLost && C.S.chLost[k];
    const home = C.c === 'jin' ? 'his people in the niru' : C.c === 'sj' ? 'his family in the capital' : 'his family in Yiwu';
    return { id: 'letter', keep: { k }, kick: '家書 · A letter home', title: `${n[0]} · ${n[1]}`, ltitle: `The letter to ${n[1]}'s family`, year: `To ${home}`,
      lines: [chL('（燈下，你鋪開一張紙。墨凍住了，你呵了好幾口氣。）', '(By the lamp you spread out a sheet of paper. The ink has frozen; you breathe on it a long time.)'),
        lou ? chL('（樓阿根那封信還在他的衣服裡，從來沒寄。上面寫著：「跟我娘說北邊冷，可我有棉襖。跟我媳婦說……說我很好。」）', '(Lou Agen\'s letter is still inside his coat, never sent. It says: "Tell my mother it\'s cold up north, but I have a padded coat. Tell my wife... tell her I\'m well.")')
          : chL(`（${n[0]}的家人只會知道你寫給他們的。）`, `(${n[1]}'s family will know only what you write to them.)`),
        why ? chL('（你知道他為什麼沒回來。你知道你在其中的分量。）', '(You know why he did not come back. You know your own part in it.)') : chL('（你想起他最後說的話。）', '(You think of the last thing he said.)')],
      opts: [
        { q: 'Write the truth: how he died, and why.', led: `Wrote ${n[1]}'s family the truth.`, a: [chL('（你寫了很久。寫完以後，你沒有再讀一遍。）', '(You write for a long time. When it is done, you do not read it over.)')], fx: (C) => { chRep(C, 'disc', 1); } },
        { q: 'Write that he died quickly, bravely, and without pain.', led: `Wrote ${n[1]}'s family a kind lie.`, a: [chL('（三行字。每一個字都是好的。沒有一個是真的。）', '(Three lines. Every word of it kind. None of it true.)')], fx: (C) => { } },
        lou ? { q: 'Send his own letter, just as he wrote it.', led: 'Sent Lou Agen\'s own letter home, as he wrote it: "Tell her I\'m well."', a: [chL('（你把它封好，交給驛卒。「說我很好。」）', '(You seal it and hand it to the courier. "Tell her I\'m well.")')], fx: (C) => { chBond(C, 'xiaoman', 2); } }
          : { q: 'Write nothing. Carry his things home yourself.', led: `Wrote nothing to ${n[1]}'s family; kept his things to carry home.`, a: [chL('（你把他的東西包在一起，放在自己的行囊最底下。）', '(You wrap his things together and put them at the very bottom of your own pack.)')], fx: (C) => { } },
      ] }; },
  end: (C, o) => '',
};
function chLetter(C, then) { if (chGot(C, 'letter') >= 0 || !chLetterWho(C)) return then(); chDecide(CHD.letter.build(C), () => then()); }

// ---------------- camp: the empty bedrolls of the men your choices cost, and men who bring it up ----------------
function chCampTick(dt) {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.camp || !ZC) { const p = $('chPr'); if (p) p.hidden = true; return; }
  if (CH.zc !== ZC) { CH.zc = ZC; CH.objs = []; CH.murT = 24; CH.mur = chMurmurs(); try { chRolls(); } catch (e) { console.warn('choices rolls', e); } }
  let pr = $('chPr'); const t = chNearRoll();
  if (!pr) { chCSS(); pr = document.createElement('div'); pr.id = 'chPr'; document.body.appendChild(pr); }
  pr.hidden = !t || !!state.zheDlg; if (t) pr.innerHTML = `<kbd>E</kbd>${t.n[0]}${t.n[1] ? ' · ' + t.n[1] : ''}'s bedroll`;
  if (CH.mur && CH.mur.length && !state.zheDlg) { CH.murT -= dt; if (CH.murT <= 0) { CH.murT = 30; const m = CH.mur.shift(); const u = chCampUnit(m[0]); if (u) SPEECH.say(u.id, m[1], m[2], { prio: 2, dur: 6 }); } }
}
function chCampUnit(k) { const sim = state.sim; if (!sim || !ZC || !ZC.map) return null; const R = ZC.R || ZR; for (const uid in ZC.map) { const r = R[ZC.map[uid]]; if (r && r.k === k) { const u = sim.units[uid]; if (u && !u.dead) return u; } } return null; }
function chMurmurs() { const C = chCtx(); if (!C) return []; const S = chData(C.S), out = [];
  for (const e of S.ledger) { const D = CHD[e.id]; if (!D || !D.murmur) continue; const m = D.murmur(C, e.o); if (m && chCampUnit(m[0])) out.push(m); } return out.slice(-2); }
function chRolls() {
  const C = chCtx(), r = state.renderer; if (!C || !r || !r.scene) return; const S = chData(C.S); const ks = Object.keys(S.chLost).filter(k => S.alive[k] === false && S.chLost[k].how !== 'home'); if (!ks.length) return;
  const cloth = new THREE.MeshLambertMaterial({ color: 0x4a3c30 }), wood = new THREE.MeshLambertMaterial({ color: 0x8a7048 }), snow = new THREE.MeshLambertMaterial({ color: 0xd8dde4 });
  ks.slice(0, 4).forEach((k, i) => { const a = Math.PI * 1.62 + i * 0.42, R0 = 8.4, x = Math.sin(a) * R0, z = Math.cos(a) * R0, y = SIM.terrainH(x, z);
    const g = new THREE.Group(); const roll = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 1.9), cloth); roll.position.y = 0.06; g.add(roll);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), cloth); pil.rotation.z = Math.PI / 2; pil.position.set(0, 0.16, -0.78); g.add(pil);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.3, 6), wood); st.rotation.x = Math.PI / 2; st.rotation.z = 0.35; st.position.set(0, 0.16, 0.05); g.add(st);
    const sn = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.9), snow); sn.position.set(0.04, 0.125, 0.4); g.add(sn);
    g.position.set(x, y, z); g.rotation.y = a; r.scene.add(g); CH.objs.push({ k, x, z, g }); });
}
function chNearRoll() { const h = localHero(); if (!h || !CH.objs.length) return null; const C = chCtx(); if (!C) return null;
  for (const o of CH.objs) { const dx = o.x - h.x, dz = o.z - h.z, d = Math.hypot(dx, dz); if (d < 2.2 && (dx * Math.sin(Input.yaw) + dz * Math.cos(Input.yaw)) / Math.max(d, 0.01) > 0.3) return Object.assign({ n: [chNm(C, o.k), chNm(C, o.k, true)] }, o); } return null; }
function chRollCard(o) {
  const C = chCtx(); const S = chData(C.S), L = S.chLost[o.k] || {}, e = S.ledger.find(x => x.id === L.id), n = [chNm(C, o.k), chNm(C, o.k, true)];
  const how = { left: 'left behind', dead: 'killed', lost: 'missing', gone: 'gone', executed: 'executed' }[L.how] || 'gone';
  zCards([{ title: `${n[0]} · ${n[1]}`, year: `${how}`, p: ['Nobody sleeps here. Nobody has moved his things, and nobody will say why they keep a place for him.', e ? `${e.pick}` : ''].filter(Boolean), btn: 'Stand up' }], () => requestLock());
}
{ const _k = zheKeyE; zheKeyE = function () { if (ZC && state.sim && state.sim.mission && state.sim.mission.camp && !state.zheDlg) { const t = chNearRoll(); if (t) { chRollCard(t); return true; } } return _k(); }; }
// ================= 八旗 · the Plain White niru =================
const chJA = (C, k) => !!(JS && JS.alive[k] && k !== JS.me);
// 一 · Shenyang, the night after it fell (c2): the Ming gunner who will not serve the guns
CHD.j2gun = {
  build: (C) => ({ id: 'j2gun', title: '砲手 · The gunner', ltitle: 'The Ming gunner at Shenyang', year: 'Shenyang, the night it fell, 1621', who: ['托博輝 Tobohui', 'captain of the niru'],
    lines: [chL('（城門洞裡關著十幾個明軍砲手。李永芳的人一個一個地問：給銀子，明天替汗開瀋陽的大砲。）', '(A dozen Ming gunners are shut in the gate passage. Li Yongfang\'s men question them one by one: silver, if tomorrow they will serve Shenyang\'s cannon for the Khan.)'),
      chL('都點頭了，只有這一個。他叫什麼，沒人問。他不肯。', 'All of them nodded except this one. Nobody asked his name. He won\'t.'),
      chL('托博輝：不肯的，砍了。你的人看著他。你去辦。', 'Tobohui: The ones who refuse, kill. Your file is guarding him. You see to it.'),
      chJA(C, 'lier') ? chL('（李二站在火把底下，看著那個人，又看著你。他也是在撫順被抓來的。）', '(Li Er stands under the torch, looking at the man, then at you. He was taken at Fushun, too.)') : chL('（那人看著你，不求饒。）', '(The man looks at you. He does not beg.)')],
    opts: [
      { q: 'Do as Tobohui says.', led: 'Killed the Ming gunner who would not serve.', a: [chL('（很快。他到最後都沒低頭。）', '(It is quick. He never lowers his head.)'), chJA(C, 'lier') ? chL('（李二轉身走開了。那天晚上他沒有回火邊。）', '(Li Er turns and walks away. He doesn\'t come back to the fire that night.)') : chL('（托博輝點點頭。）', '(Tobohui nods.)')],
        fx: (C) => { chBond(C, 'lier', -3); chBond(C, 'tobohui', 1); chRep(C, 'cruel', 2); } },
      { q: 'Have Li Er talk him round to serve the gun.', led: 'Had Li Er talk the Ming gunner into serving the Khan\'s guns.', a: [chL('李二蹲下，用家鄉話跟他說了很久。「活著，比什麼都強。」', 'Li Er squats down and talks to him a long time in their own dialect. "Living beats everything."'), chL('（天亮前，那人點了頭。第二天，他在渾河邊替汗開砲，打的是川兵。）', '(Before dawn the man nods. The next day, on the Hun River, he fires the Khan\'s cannon into the Sichuan camp.)')],
        fx: (C) => { chBond(C, 'lier', 1); C.S.flags.gunner = 1; } },
      { q: 'Look the other way while he slips out.', led: 'Let the Ming gunner slip away in the night.', a: [chL('（你把鑰匙放在地上，轉過身去。天亮時，門洞裡少了一個人。）', '(You put the key on the ground and turn your back. At dawn the gate passage is one man short.)'), chL('托博輝：「看守是你的人。」鞭子是你的。', 'Tobohui: "The guard was your file." The whip is yours.')],
        fx: (C) => { chBond(C, 'lier', 3); chBond(C, 'tobohui', -2); C.S.flags.whipped = 1; chRep(C, 'care', 1); return { beat: 20 }; } },
    ] }),
  dream: (C, o) => o === 0 ? ['After Shenyang', ['A man in a Ming coat who will not lower his head, in a gate passage that goes on and on. Every time you reach him, he is still looking at you.']] : null,
  end: (C, o) => o === 0 ? (C.S.flags.lierGone ? 'You killed the gunner as you were told. Li Er ran south across the Liao River before Ningyuan.' : 'You killed the gunner as you were told.') : o === 1 ? 'The gunner lived and served the Khan\'s cannon at the Hun River. Years later he was among the Han gunners of the Ujen Cooha.' : 'The gunner got away. You took the whip for it, and Tobohui never trusted you again.',
  talk: (C, k, o) => k === 'lier' ? (o === 2 ? { q: 'About the gunner...', bond: 1, a: [chL('……我知道是你。我什麼都沒說。', '...I know it was you. I said nothing.'), chL('撫順那年，要是也有人轉過身去……', 'The year Fushun fell, if someone had turned his back for me...')] } : o === 1 ? { q: 'You saved his life.', a: [chL('我救了他，讓他打自己人。', 'I saved him so he could shoot his own people.'), chL('我們都是這麼活下來的。', 'That is how all of us stay alive.')] } : null) : null,
  murmur: (C, o) => o === 0 && chJA(C, 'lier') ? ['lier', '……', '...'] : null,
};
// 二 · before Ningyuan (c3): Wunage takes horsemen over the sea ice to the island where the Ming keep their grain
CHD.j3ice = {
  build: (C) => { const barred = !!C.S.flags.whipped;
    return { id: 'j3ice', title: '覺華島 · The ice road', ltitle: 'Juehua Island or the walls', year: 'Under the walls of Ningyuan, the first month of 1626', who: ['托博輝 Tobohui', 'captain of the niru'],
      lines: [chL('武訥格要帶騎兵從海冰上過去，打覺華島。明軍的糧，船，都在島上。', 'Wunage is taking horsemen over the sea ice to Juehua Island. The Ming keep their grain there, and their ships.'),
        chL('明天一早，其餘的人推盾車攻城。城上有大砲——你也看見了。', 'At first light everyone else pushes the shield carts at the walls. There are guns on those walls — you have seen them.'),
        barred ? chL('托博輝：武訥格要的是可靠的人。放跑犯人的，不算。', 'Tobohui: Wunage wants men he can trust. A man who lets prisoners go doesn\'t count.') : chL('托博輝：武訥格還缺一個牛錄的人。要去，你帶你的人去。', 'Tobohui: Wunage is one file short. If you want it, take your file.')],
      opts: barred ? [{ q: 'The walls, then.', led: 'Was not trusted to ride to Juehua Island; went to the walls.', a: [chL('（你的人什麼也沒說。他們都看見城上的砲了。）', '(Your men say nothing. They have all seen the guns on the walls.)')], fx: () => { } }]
        : [{ q: 'We go to the walls with the banner.', led: 'Went to the walls of Ningyuan with the banner.', a: [chL('好。盾車明天第一批。', 'Good. The shield carts go in the first wave tomorrow.')], fx: () => { } },
          { q: 'We ride over the ice with Wunage.', led: 'Rode over the sea ice to Juehua Island with Wunage.', a: [chL('好。冰上冷，可冰上沒有大砲。', 'Good. It\'s cold on the ice. But there are no cannon on the ice.')], fx: () => { } }] }; },
  end: (C, o) => o === 1 ? (chGot(C, 'j3jetty') === 0 ? 'You went over the ice to Juehua Island and burned the grain. At the jetty you followed the order.' : 'You went over the ice to Juehua Island and burned the grain. At the jetty you let the boatmen run onto the ice.') : 'You went to the walls of Ningyuan, where the guns were.',
};
CHD.j3jetty = {
  build: (C) => ({ id: 'j3jetty', urgent: true, timer: 12, def: 0, title: 'The jetty', ltitle: 'The jetty on Juehua Island', kick: '抉擇 · NOW', who: ['武訥格 Wunage'],
    lines: [chL('碼頭上的人一個不留——兵也好，船戶商人也好！', 'Nobody at the jetty lives — soldiers, boatmen, merchants, all of them!')],
    opts: [{ q: 'Follow the order', led: 'Followed the order at the jetty.', a: [chL('（你的人跟著武訥格的人下了碼頭。）', '(Your file goes down to the jetty behind Wunage\'s men.)')], fx: (C) => { chRep(C, 'cruel', 3); } },
      { q: 'Let them run out onto the ice', led: 'Let the boatmen and merchants run out onto the ice.', a: [chL('（你的人放低了刀。那些人往冰上跑去，一個也沒回頭。）', '(Your file lowers its blades. The people run out onto the ice, and none of them looks back.)')], fx: (C) => { chRep(C, 'care', 2); } }] }),
  dream: (C, o) => o === 0 ? ['After Juehua', ['Burning ships frozen into the ice, and the smoke going straight up. People on the jetty, and then the jetty empty.', 'In the dream the ice is quiet. That is the worst of it.']] : ['After Juehua', ['Figures running far out on the white ice, smaller and smaller. You never learn whether the ice held.']],
  end: () => '',
};
// 三 · before the Dalinghe relief battle (c4): a man of the file whose mother is dying asks to go home
const chJLeave = (C) => ['dabsun', 'erde', 'bahai', 'sose', 'ilan'].find(k => chJA(C, k)) || null;
CHD.j4leave = {
  build: (C) => { const k = chJLeave(C), n = [chNm(C, k), chNm(C, k, true)], unc = k === 'dabsun' && chJA(C, 'alin');
    return { id: 'j4leave', keep: { k }, title: '家信 · Word from home', ltitle: `${n[1]} asks to go home`, year: 'Behind the siege lines at Dalinghe, 1631', who: unc ? ['阿林 Alin', `${n[1]}'s uncle`] : [`${n[0]} ${n[1]}`],
      lines: [chL(`（一個從赫圖阿拉來的人帶了信：${n[0]}的娘病得快不行了。）`, `(A man up from Hetu Ala brings word: ${n[1]}'s mother is dying.)`),
        unc ? chL('阿林：我答應過他娘，把他活著帶回去。把他的名字從冊子上劃掉吧。少一個人，汗不會知道。', 'Alin: I promised his mother I\'d bring him home alive. Strike his name off the roll. One man less — the Khan will never know.')
          : chL(`${n[0]}：讓我回去。就這一回。少一個人，汗不會知道。`, `${n[1]}: Let me go home. Just this once. One man less — the Khan will never know.`),
        chL('（明天汗親自出去迎明朝的援兵。四萬人，有車有砲。）', '(Tomorrow the Khan himself rides out to meet the Ming relief army. Forty thousand of them, with carts and guns.)')],
      opts: [
        { q: 'Strike his name. Go home.', led: `Struck ${n[1]}'s name from the roll and sent him home.`, a: [chL(`（${n[0]}天沒亮就走了。你的牛錄明天少一個人。）`, `(${n[1]} leaves before light. Tomorrow your file is one man short.)`)], fx: (C) => { chBond(C, k, 3); chBond(C, 'alin', 2); C.S.alive[k] = false; C.S.fate[k] = 'home'; chData(C.S).chLost[k] = { id: 'j4leave', how: 'home' }; C.S.flags.sentHome = k; } },
        { q: 'Ask Tobohui for leave, properly.', led: `Asked Tobohui to give ${n[1]} leave. He refused.`, a: [chL('托博輝：「明天打仗。後天再說。」', 'Tobohui: "Tomorrow we fight. Ask me the day after."'), chL(`（${n[0]}點點頭。他知道後天是什麼意思。）`, `(${n[1]} nods. He knows what "the day after" means.)`)], fx: (C) => { chBond(C, k, 1); chRep(C, 'disc', 1); } },
        { q: 'No. Every man fights tomorrow.', led: `Refused to let ${n[1]} go home.`, a: [chL('（他沒有求第二次。）', '(He doesn\'t ask a second time.)')], fx: (C) => { chBond(C, k, -2); chBond(C, 'alin', -2); chRep(C, 'disc', 1); } },
      ] }; },
  end: (C, o) => { const k = (C.S.ch.j4leave || {}).k, n = k ? chNm(C, k, true) : 'He'; if (o === 0) return `${n} reached home before his mother died.`; return C.S.alive[k] ? `${n} fought at Dalinghe and lived. His mother died before he got home.` : `${n}'s mother died without him. Then he died too, at Dalinghe.`; },
};
// the Juehua mission: over the sea ice, the trench the Ming cut, the grain, the jetty
CH.missions3 = () => {
  const M = SIM.MISSIONS, PI = Math.PI; if (M.jjue) return;
  M.jjue = { title: '覺華島 · Juehua Island', year: 'The first month of 1626', battle: 'field', side: 1, soldier: { group: 'niru' }, hidden: true, ch: 'jb',
    bdef: { name: 'Juehua Island', jp: '覺華島', when: 'February 1626', biome: 'winter', fog: 0.25 },
    brief: 'While the banners storm Ningyuan, Wunage leads horsemen over the frozen sea to Juehua Island, where the Ming keep their grain and ships.',
    start: [0, -112, 0],
    zones: [{ key: 'trench', x: 0, z: -28, r: 14, name: 'The ice trench' }, { key: 'stores', x: -10, z: 46, r: 15, name: 'The grain stores' }, { key: 'jetty', x: 36, z: 96, r: 13, name: 'The jetty' }],
    forts: [[-14, -22, 6, 0.5, 1.4, 'mantlet'], [14, -22, 6, 0.5, 1.4, 'mantlet'], [-16, 46, 3, 3, 2.2, 'tent'], [-4, 50, 3, 3, 2.2, 'tent'], [-12, 36, 3, 2.5, 2.2, 'tent']],
    labels: { rifle_imp: ['Ming island garrison', '覺華守軍'], ronin: ['Boatmen and merchants', '船戶商民'] },
    groups: {
      niru: { team: 1, name: 'Tobohui', zh: '托博輝', army: ['samurai'], at: [0, -112, 0], dir: ['hold', 0, -90], exit: [0, -150] },
      wunage: { team: 1, name: 'Wunage', zh: '武訥格', army: ['cavalry', 'cavalry', 'samurai'], at: [-24, -118, 0], dir: ['hold', -20, -60] },
      line: { team: 0, name: 'The trench line', zh: '冰壕守兵', army: ['rifle_imp', 'ashigaru', 'rifle_imp'], at: [0, -16, PI], dir: ['hold', 0, -18], stay: true },
      garr: { team: 0, name: 'The garrison', zh: '覺華守軍', army: ['ashigaru', 'rifle_imp', 'samurai'], at: [-10, 70, PI], reserve: true },
      folk: { team: 0, name: 'Boatmen and merchants', zh: '船戶商民', army: ['ronin', 'ronin'], at: [36, 98, PI], dir: ['hold', 36, 98], stay: true, exit: [140, 150] },
    },
    choices: [[[['dir', 'wunage', 'hold', 36, 96], ['calm', 'wunage', 30], ['dir', 'niru', 'hold', 34, 90]], [['break', 'folk'], ['dir', 'wunage', 'hold', -10, 46]]]],
    phases: [
      { title: '一 · 冰 · The sea ice', goal: 'Cross the ice to the trench', text: 'Over the frozen sea toward the island. The Ming have cut a trench in the ice; the night froze it over again.', show: ['trench'],
        obj: { reach: 'trench' }, at: [[1, ['promote']]],
        say: [[3, 'wunage', 'The ice is ours tonight. Ride!', '今夜冰是我們的。走！'], [16, 'lookout', 'Muskets behind the trench!', '冰壕後面有銃！']] },
      { title: '二 · 冰壕 · The trench', goal: 'Break the line at the ice trench', text: 'The trench has frozen over. Break the line behind it.', start: [['dir', 'wunage', 'attack'], ['dir', 'niru', 'attack']],
        obj: { defeat: ['line'], frac: 0.7 }, say: [[2, 'niru', 'Over the trench! It froze in the night — the Heavens want this!', '過壕！一夜凍上了——天意！']] },
      { title: '三 · 糧 · The grain', goal: 'Take the grain stores', text: 'The grain stores beyond the trench. Burn them.', show: ['stores'], hide: ['trench'], start: [['release', 'garr'], ['dir', 'garr', 'hold', -10, 46]],
        obj: { all: [{ reach: 'stores' }, { survive: 40 }] }, at: [[30, ['burn', -40, 20, 46]]],
        say: [[3, 'niru', 'Burn it all. Grain, carts, ships.', '全燒了。糧，車，船。'], [32, 'lookout', 'The stores are burning!', '糧倉著了！']] },
      { title: '四 · 碼頭 · The jetty', goal: 'Go down to the jetty', text: 'The jetty, the ships frozen into the ice, and the people who ran there.', show: ['jetty'], hide: ['stores'],
        obj: { survive: 40 }, say: [[1, 'lookout', 'People at the jetty — boatmen, merchants, women!', '碼頭上有人——船戶，商人，還有女人！']] },
    ],
    win: 'Juehua Island burned.' };
};
CHBT.jjue = [{ ph: 3, t: 3, id: 'j3jetty', cid: 0, k: () => 0 }];
function chJStart(scene) {
  CH.missions3(); JS = jLoad() || jFresh(); jMeRow(); chData(JS); $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  const n = 3, C = JCH[n]; C.who = Object.assign({}, C.who || {}, { wunage: ['武訥格', 'Wunage'], niru: C.who && C.who.niru || ['托博輝', 'Tobohui'], lookout: ['', 'A lookout'] });
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: JS.name.zh || 'You', team: 1, connected: true }];
  ZC = null; startGame({ seed, battle: 'field', mode: 'campaign', mission: 'jjue', players: pl }, 0, null, 1);
  const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq];
  ZB = { map: {}, sq: q.id, first: me.heroId, cur: JS.me, fell: false, R: JR, jin: true, ch: n, deadMe: [], jue: true };
  const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = jIdx(JS.me);
  for (const r of jFile()) { const id = q.unitIds.find(uid => !used[uid]); if (id === undefined) break; used[id] = 1; ZB.map[id] = jIdx(r.k); }
  for (const uid in ZB.map) jDress(sim.units[uid], ZB.map[uid]);
  setTimeout(() => storyCard('The first month of 1626. Over the frozen sea with Wunage\'s horsemen, toward Juehua Island and the Ming grain. Stay with your file. F follow · H halt · C charge.', '覺華島 · Juehua Island'), 700);
}
function chJFinish(winner) {
  const sim = state.sim, h = localHero(), M = sim.mission, won = winner === M.side; const fate = {}, near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const r = JR[ZB.map[uid]]; if (!r) continue; const u = sim.units[uid]; fate[r.k] = u.dead ? 'dead' : (!won && u.wounded && !u.aided && u.helpedBy < 0 && !near(u, 4)) ? 'lost' : 'out'; }
  for (const k of ZB.deadMe) fate[k] = 'dead';
  const meK = JS.me, alive = h && !h.dead; fate[meK] = (ZB.cur === meK || ZB.cur === 'stranger') ? (alive ? 'out' : 'dead') : 'dead';
  if (ZB.cur && ZB.cur !== meK && ZB.cur !== 'stranger' && alive) { const nk = ZB.cur, r = jRow(nk); if (meK === 'me') JS.meName = Object.assign({}, JS.name); JS.me = nk; JS.name = { zh: r.zh, en: r.en }; fate[nk] = 'out'; }
  for (const k in fate) { JS.fate[k] = fate[k]; JS.alive[k] = fate[k] === 'out'; }
  JS.stage = 'c4'; JS.lastWon = won; jSave(); const outN = Object.keys(fate).filter(k => fate[k] === 'out').length;
  const rows = Object.keys(fate).map(k => { const r = jRow(k), f = fate[k]; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${k === JS.me ? JS.name.zh + ' ' + JS.name.en + ' (you)' : r.zh + ' ' + r.en} — ${f === 'out' ? 'came back over the ice' : f === 'dead' ? 'killed on the island' : 'left on the island'}</li>`; }).join('');
  $('resultTitle').textContent = won ? '焚 · Juehua burns' : '退 · Back over the ice'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? M.win : 'The island garrison drove you back onto the ice.'} ${outN} of your file came back.`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; zCards([
    { title: '覺華島 · What happened', year: 'The first month of 1626', p: ['Wunage\'s horsemen crossed the frozen sea to Juehua Island. The Ming had cut a trench fifteen li long in the ice, but the cold closed it again in a night. The garrison was destroyed, the grain stores and some two thousand ships were burned, and the people of the island were killed: soldiers, boatmen and merchants together, by the Ming count some fourteen thousand.',
      'Under the walls of Ningyuan it went the other way. Yuan Chonghuan\'s Western cannon broke the assault again and again; the Khan himself was struck, it was said, and the banners drew off. Nurhaci died that summer. He had never lost a battle before Ningyuan.'], zh: '武訥格攻覺華島，焚其糧船。汗攻寧遠，不克。' },
    { title: '牛錄 · Your file', year: `${outN} came back over the ice`, html: `<ul>${rows}</ul>`, btn: 'Five years later →' }], () => jGo('c4')); };
}
{ const _js = jStart; jStart = function (scene) {
    if (scene === 'b3j') return chJStart(scene);
    if (scene === 'c3') { const s = jLoad(); if (s && !(s.seen && s.seen.i3) && s.ch && s.ch.j2gun && s.ch.j2gun.o === 0 && s.alive.lier && s.me !== 'lier' && !s.flags.lierGone) {
      JS = s; chData(JS); const C = { c: 'jin', S: JS, save: () => jSave(), R: JR }; chLose(C, 'lier', 'gone', 'j2gun'); JS.flags.lierGone = 1; jSave();
      return zCards([{ title: '李二 · Li Er', year: 'The winter of 1621', p: ['A month after the Hun River, Li Er is gone. His horse is in the lines; his armour is folded on his bedroll. The guards at the Liao River say a man in a Han coat walked out across the ice toward the Ming side one night, and nobody stopped him.', 'Tobohui strikes his name from the roll and says nothing more about it.'], btn: 'On →' }], () => _js(scene)); } }
    return _js(scene); }; }
{ const _jf = jFinish; jFinish = function (w) { if (ZB && ZB.jue) { try { if (typeof ddFinish === 'function') ddFinish(w); } catch (e) { } return chJFinish(w); } return _jf(w); }; }
{ const _jk = jKeyE; jKeyE = function () {
    if (state.zheDlg) return true; const t = jLook(); if (!t || !t.bed) return _jk(); const C = chCtx(); if (!C) return _jk(); chData(C.S); const n = ZC.night;
    const id = n === 2 ? 'j2gun' : n === 3 ? 'j3ice' : n === 4 && chJLeave(C) ? 'j4leave' : null;
    if (id && chGot(C, id) < 0) { chDecide(CHD[id].build(C), (o) => {
      if (id === 'j3ice' && o === 1 && !C.S.flags.whipped) { JS.stage = 'b3j'; jSave(); return zCards([{ title: '冰 · The ice', year: 'Before dawn', p: ['Long before light the horsemen go down onto the frozen sea. The ice booms under the hooves like a drum somewhere far below.', 'Behind you, by torchlight, the banners are dragging the shield carts toward the walls of Ningyuan.'], btn: 'Onto the ice →' }], () => jGo('b3j')); }
      chDream(() => _jk()); }); return true; }
    chDream(() => _jk()); return true; }; }
{ const _je = jEnd; jEnd = function () { const C = { c: 'jin', S: chData(JS), save: () => jSave(), R: JR }; chLetter(C, () => { const L = chLedgerCard(C); if (L) zCards([L], () => _je()); else _je(); }); }; }
// the Jin talk lives in each chapter's table: give it the same memory
function chJinTalkWrap() { if (!ZC || !ZC.jin || CH.talkWrapped.has(ZC.night)) return; const C = JCH[ZC.night]; if (!C || !C.talk) return; CH.talkWrapped.add(ZC.night); const _t = C.talk; C.talk = (k) => chTalkAdd(_t(k), k); }
// test handle (headless scripts): the registry and the entry points
window.__ch = { CHD, CH, ctx: () => chCtx(), sleep: () => zSleep(), decide: (id) => { const C = chCtx(); chDecide(CHD[id].build(C), () => { }); }, ledger: () => { const C = chCtx(); return C ? chLedgerCard(C) : null; } };
