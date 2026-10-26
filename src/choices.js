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
    return chDream(() => _s()); }; }
// the talk at the fire remembers: every answer can give a man something to say about it
function chTalkAdd(D, k) {
  const C = chCtx(); if (!C) return D; const S = chData(C.S); const add = [];
  for (const e of S.ledger) { const R = CHD[e.id]; if (!R || !R.talk) continue; const t = R.talk(C, k, e.o); if (t) add.push(Object.assign({ chk: e.id }, t)); }
  if (!add.length) return D; if (!D) D = { g: chL('……', '...'), t: [] }; return Object.assign({}, D, { t: add.concat(D.t || []) });
}
{ const _t = zTalk; zTalk = function (k, night) { return chTalkAdd(_t(k, night), k); }; }
// test handle (headless scripts): the registry and the entry points
window.__ch = { CHD, CH, ctx: () => chCtx(), sleep: () => zSleep(), decide: (id) => { const C = chCtx(); chDecide(CHD[id].build(C), () => { }); }, ledger: () => { const C = chCtx(); return C ? chLedgerCard(C) : null; } };
