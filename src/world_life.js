// ===================== 人間 · the life of the world, on screen: townsfolk, family, the forge, the court, the road, the journal =====================
// world_core.js keeps the rules (and is tested in node); this file puts them in front of you. Spliced into main.js's scope after world.js.

// ---------------- people who are not in WPP: generated townsfolk, and the family's new members ----------------
WPP.push({ k: 'shitou', zh: '石頭', en: 'Shitou', t: 'the refugee boy from Fushun who works your father\'s bellows', born: 1607, look: { h: 0.8 }, rank: 0, where: [[0, 1e9, 'lijia', 'forge', 11]], role: 'shitou' },
  { k: 'wife', zh: '妻', en: 'Your wife', t: 'your wife', born: 1604, woman: true, look: { h: 0.92, hat: 'kerchief' }, rank: 0, where: [[0, 1e9, 'lijia', 'home', 13]], role: 'wife' });
const W_FOLKP = {};
function wFolkP(f) { const T = WCORE.TR[f.trade]; let p = W_FOLKP[f.k]; if (!p) p = W_FOLKP[f.k] = { k: f.k, folk: f };
  p.folk = f; p.zh = f.zh; p.en = f.en; p.t = `${T.en}, ${WCORE.age(WS, f.born)} years old${f.jin ? ', living under the Jin' : ''}`; p.look = f.jin ? Object.assign({}, f.look, { hat: 'shaved' }) : f.look; p.rank = T.rank | 0; p.woman = f.woman; return p; }
// where your family is: they move when the house moves, the father can be taken for the army, the boy can go to war
function wFamWhere(p, day) {
  const fam = p.k === 'father' || p.k === 'mother' || p.k === 'erniu' || p.k === 'wife';
  if (p.k === 'shitou') return WS.flags.shitou && WS.home === 'lijia' && !WS.dead.shitou ? [0, 1e9, 'lijia', 'forge', 11] : null;
  if (p.k === 'wife') { if (!WS.spouse) return null; p.zh = WS.spouse.zh; p.en = `${WS.spouse.en}, your wife`; }
  if (p.k === 'boy1' && WS.flags.gouGoes) return day < D(1619, 2, 21) ? [0, 1e9, 'liaoyang', 'drill', 10] : null;
  if (p.k === 'father' && WS.flags.fatherDrafted && !WS.flags.fatherBack) return day < D(1619, 2, 21) ? [0, 1e9, 'liaoyang', 'yard', 10] : null;
  if (!fam) return undefined;
  if (WS.home === 'jin') return null;
  if (WS.home !== 'lijia') return [0, 1e9, WS.home, 'inn', p.k === 'father' ? 18 : 13];
  if (p.k === 'wife') return [0, 1e9, 'lijia', 'home', 13];
  return undefined;
}
const wFamDead = (k) => !!WS.dead[k];

// ---------------- the days of the world ----------------
function wNote(zh, en) { WS.news = (WS.news || []).concat([[zh, en]]).slice(-8); wLog(zh, en); }
const wKnows = (f) => f.place === WS.place || WCORE.relOf(WS, f.k) > 4;
function wLifeDay() {
  for (const [f, zh, en] of WCORE.folkDay(WS)) if (wKnows(f)) wNote(zh, en);
  const F = WS.flags;
  if (F.fatherDies && WS.day >= F.fatherDies && !WS.dead.father) { WS.dead.father = 1; F.fatherDies = 0; wNote('你爹去世了。', 'Your father has died. You bury him on the hill behind the village. The forge is yours now.'); }
  if (F.hoard && WS.day === D(1619, 4, 1)) { if (Math.random() < 0.55) { WS.cash += 2500; wNote('糧商還了錢。', 'The grain dealer pays out: 2,500 wen. People are eating bark in Liaoyang.'); } else wNote('糧商跑了。', 'The grain dealer has vanished with everyone\'s money.'); F.hoard = 0; }
  if (WS.spouse && !F.kidDue && WS.day - WS.spouse.since > 300 && Math.random() < 0.004) F.kidDue = WS.day + 270;
  if (F.kidDue && WS.day >= F.kidDue) { F.kidDue = 0; const boy = Math.random() < 0.5; const nm = boy ? [['大寶', 'Dabao'], ['小鐵', 'Xiaotie'], ['繼祖', 'Jizu']] : [['大妞', 'Daniu'], ['小翠', 'Xiaocui'], ['招弟', 'Zhaodi']]; const n = nm[Math.floor(Math.random() * 3)];
    WS.kids = (WS.kids || []).concat([{ zh: n[0], en: n[1], born: WCORE.DT(WS.day).y, boy }]); wNote(`${boy ? '生了個兒子' : '生了個女兒'}，叫${n[0]}。`, `${WS.spouse.en} has given birth: a ${boy ? 'son' : 'daughter'}. You call ${boy ? 'him' : 'her'} ${n[1]}.`); }
  if (WS.office) { const o = WS.office; if (o.since !== undefined && WS.day > o.since && (WS.day - o.since) % 360 === 0) { const w = WCORE.evaluate(WS); wNote('考滿。', w); if (!WS.office) WS.flags.dismissed = WS.day; }
    const p = WCORE.purge(WS); if (p) wNote('錦衣衛來了。', p); }
  if (WS.health < 30 && Math.random() < 0.02) wNote('你病了。', 'You are running a fever. A physician could help (Liaoyang, Beijing).');
  if (WS.health < 30) WS.health -= 0.6; else if (WS.health < 100) WS.health = Math.min(100, WS.health + 0.6);
  if (WS.health <= 0 && WS.alive) { WS.alive = false; WS.flags.diedOf = 'fever'; }
}
function wLifeHistory(k) {
  const known = WCORE.folkHistory(WS, k); for (const [f, zh, en] of known) if (wKnows(f) || f.place === WS.place) wNote(zh, en);
  const F = WS.flags;
  if (k === 'liuting') {
    if (F.fatherDrafted && !F.fatherBack) { if (Math.random() < 0.55) { WS.dead.father = 1; wNote('你爹沒有回來。', 'Your father did not come back from the east road. A man of his company says he was at Abudali.'); } else { F.fatherBack = 1; wNote('你爹回來了。', 'Your father came back from Abudali, thin as a rake, two fingers gone. He does not speak of it.'); } }
    if (F.gouGoes && !WS.dead.boy1) { WS.dead.boy1 = 1; wNote('狗兒死了。', 'Gou\'er died at Abudali. He was the drummer of his company. He was thirteen.'); }
  }
  if (k === 'liaoyangfall' && WS.home === 'lijia' && !F.stayJin && !(WS.place === 'lijia' || WS.place === 'liaoyang')) {
    const x = Math.random(); if (x < 0.55) { WS.home = 'shanhai'; wNote('家裡人逃出來了。', 'Your family got out: they are among the refugees at the Shanhai Pass.'); }
    else if (x < 0.85) { WS.home = 'jin'; wNote('家裡人沒能逃出來。', 'Your family did not get out. They are under the Jin now; your father will have shaved his head.'); }
    else { WS.dead.mother = 1; WS.dead.erniu = 1; WS.home = 'jin'; wNote('家裡人死了。', 'Word comes from a man of Lijia: when the Jin came through, your mother and sister were killed. Your father was not found.'); }
  }
  if (k === 'liaoyangfall' && F.stayJin) { WS.jin = 1; wNote('剃髮了。', 'The Jin order every man to shave his head and wear the queue. You do, as everyone does.'); }
}
function wLifeNews() { const n = (WS.news || []).map(x => x[1]); WS.news = []; return n; }

// ---------------- the panel: one person (or one moment) and the things you can say or do ----------------
// opts: [{ q, fx }]: fx returns { lines, opts } to stay open with new words, or nothing to close
function wPanel(r, lines, opts, o) {
  o = o || {}; if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; $('pause').hidden = true;
  let box = $('zheDlg'); if (!box) { box = document.createElement('div'); box.id = 'zheDlg'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const st = {}; state.zheDlg = st;
  const close = () => { if (state.zheDlg !== st) return; box.hidden = true; state.zheDlg = null; wSave(); requestLock(); };
  const render = (L, O) => { if (state.zheDlg !== st) return; box.hidden = false; st.topics = O;
    box.innerHTML = `<div class="who">${r.zh} ${r.en}<small>${r.t || ''}</small></div>${L.map(l => `${l[0] ? `<div class="zh">${l[0]}</div>` : ''}<div class="en">${l[1]}</div>`).join('')}<div class="ch">${O.map((t, i) => `<button type="button" data-i="${i}"${t.off ? ' style="opacity:.5"' : ''}><kbd>${i + 1}</kbd>${t.q}</button>`).join('')}${o.noLeave ? '' : '<button type="button" data-i="-1"><kbd>Esc</kbd>Leave</button>'}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => st.choose(+b.dataset.i)); };
  st.k = r.zh; st.close = () => { if (!o.noLeave) close(); };
  st.choose = (i) => { AUDIO.play('ui'); if (i < 0) { if (!o.noLeave) close(); return; } const t = st.topics && st.topics[i]; if (!t) return;
    const res = t.fx ? t.fx() : null; if (state.zheDlg !== st) return; if (res && res.lines) render([[`「${t.q}」`, '']].concat(res.lines), res.opts || st.topics.filter(x => x !== t)); else close(); };
  render(lines, opts);
}
const wSays = (zh, en) => ({ lines: [[zh, en]] });

// ---------------- talking with the townsfolk ----------------
function wTalkFolk(p, u) {
  const f = p.folk, T = WCORE.TR[f.trade], me = wRank(), rel = p.rank - me, h = localHero(); if (h && u) Input.yaw = Math.atan2(u.x - h.x, u.z - h.z);
  const like = WCORE.relOf(WS, f.k), line = T.talk[(WS.day + f.k.length) % T.talk.length];
  const greet = me >= 40 && p.rank < 40 ? ['老爺。', 'Your Honour.'] : me >= 10 && p.rank < 10 ? ['相公。' + line[0], 'Sir. ' + line[1]] : rel >= 8 ? ['有事？', 'What is it?'] : like > 20 ? [`${WS.name.zh}兄弟！${line[0]}`, `Brother ${WS.name.en.split(' ')[1]}! ${line[1]}`] : line;
  const mk = () => { const O = [], say = (q, fx, off) => O.push({ q, fx, off });
    say('Who are you?', () => wSays(`我叫${f.zh}，${T.zh}。`, `${f.en}, ${T.en}. ${WCORE.age(WS, f.born)} years old${f.spouse ? ', married' : ''}${f.drafted ? '; taken for the army in the levy' : ''}${f.trade === 'refugee' ? '; lost everything in the war' : ''}.`));
    { const N = wNews(WS.place); if (N.length) { const e = N[N.length - 1 - ((f.k.length + WS.day) % Math.min(3, N.length))]; say('What news?', () => { WS.heard[e[1]] = 1; return wSays(e[2], e[3]); }); } }
    // work for him
    for (const j of WCORE.jobsFor(WS, f.trade)) say(`Work: ${j[6].replace(/\.$/, '')} (+${j[4]} wen)`, () => { wPass(j[3], () => { const r = WCORE.work(WS, j); WCORE.addRel(WS, f.k, 1); toast(r[1]); }); });
    // buy, sell
    for (const g of T.sells || []) { const pr = WCORE.price(WS, WS.place, g), G = WCORE.GOODS[g]; say(`Buy ${G[1]} (${pr} wen)`, () => { const r = WCORE.buy(WS, WS.place, g, 1); return { lines: [['', r[1] + ` You have ${WS.cash} wen.`]], opts: mk() }; }, WS.cash < pr); }
    for (const g of T.buys || []) if (WCORE.inv(WS, g)) { const pr = Math.round(WCORE.price(WS, WS.place, g) * 0.7 * ((WS.quality && WS.quality[g]) || 1)); say(`Sell ${WCORE.GOODS[g][1]} (about ${pr} wen)`, () => { const r = WCORE.sell(WS, WS.place, g, 1); return { lines: [['', r[1]]], opts: mk() }; }); }
    // gifts
    for (const g of ['gift', 'wine', 'cake', 'cloth', 'ginseng']) if (WCORE.inv(WS, g)) { say(`Give him ${WCORE.GOODS[g][1]}`, () => { const r = WCORE.giftTo(WS, f.k, g); return { lines: [['', f.woman ? r[1].replace(/\bHe\b/, 'She') : r[1]]], opts: mk() }; }); break; }
    // letters: carry one for him, or hand him one carried for him
    if ((WS.letters || []).some(L => L.to === f.k)) say('"I have a letter for you"', () => { const L = WCORE.letterDeliver(WS, f); const fr = WS.folk[L.from]; return { lines: [['', `He reads it twice. "From ${fr ? fr.en : 'home'}..." He presses ${L.pay} wen on you.`]], opts: mk() }; });
    else if (WCORE.relOf(WS, f.k) >= 0 && !(WS.letters || []).some(L => L.from === f.k)) { const L = WCORE.letterAsk(WS, f); if (L) { const to = WS.folk[L.to]; say(`"Is there anything I can carry for you?"`, () => ({ lines: [['', `"I have family in ${WPL[L.place].en}: ${to.en}, ${WCORE.TR[to.trade].en}. Would you take a letter? They will pay the carrier."`]], opts: [{ q: 'Take the letter', fx: () => { WCORE.letterTake(WS, L); WCORE.addRel(WS, f.k, 3); return { lines: [['', `You put the letter for ${to.en} in your pack.`]], opts: mk() }; } }, { q: 'Not now', fx: () => ({ lines: [['', 'He nods.']], opts: mk() }) }] })); } }
    // what his trade lets you do
    if (f.trade === 'monk') say('Draw a fortune stick (5 wen)', () => { if (WS.cash < 5) return wSays('', 'You have not got five wen.'); WS.cash -= 5; const s = WCORE.drawStick(WS); return { lines: [['', '(You shake the bamboo tube before Guanyin until one stick falls.)'], [`${s[0]}籤：${s[2]}`, `${s[1]}: "${s[3]}"`]], opts: mk() }; }, WS.cash < 5);
    if (f.trade === 'monk') say('Burn incense for the dead (10 wen)', () => { if (WS.cash < 10) return wSays('', 'You have not got ten wen.'); WS.cash -= 10; WS.karma = (WS.karma | 0) + 1; return { lines: [['阿彌陀佛。', 'Amituofo. The smoke goes up.']], opts: mk() }; });
    if (f.trade === 'teller') say('Listen to a tale (2 wen, an hour)', () => { if (WS.cash < 2) return wSays('', 'You have not got two wen.'); WS.cash -= 2; const t = WCORE.tale(WS); WS.hour += 1; WS.learning = Math.min(100, WS.learning + 0.1); return { lines: [[`今天說《${t[0]}》。`, `Today: ${t[1]}.`], ['', t[2]], ['欲知後事如何，且聽下回分解。', 'To know what happened next, come back for the next instalment.']], opts: mk() }; });
    if (f.trade === 'tea') { say('A bowl of tea (2 wen)', () => { if (WS.cash < 2) return wSays('', 'No money.'); WS.cash -= 2; WS.health = Math.min(100, WS.health + 2); return { lines: [['', 'Hot, bitter, good.']], opts: mk() }; });
      for (const bet of [20, 100]) say(`Dice in the back room: bet ${bet} wen on big or small`, () => { const r = WCORE.dice(WS, bet); return { lines: [['', r[1] + ` You have ${WS.cash} wen.`]], opts: mk() }; }, WS.cash < bet); }
    if (f.trade === 'doctor') say(`Be treated (150 wen)${WS.health < 70 ? '' : ': you are well'}`, () => { if (WS.cash < 150) return wSays('', 'You have not got 150 wen.'); WS.cash -= 150; WS.health = Math.min(100, WS.health + 40); return { lines: [['伸手來。', 'He takes your pulse at three places on each wrist, looks at your tongue, and writes a prescription: ginseng, angelica, licorice. Your health is ' + Math.round(WS.health) + '.']], opts: mk() }; }, WS.cash < 150);
    if (f.trade === 'scribe') say('Have a letter written home (20 wen)', () => { if (WS.cash < 20) return wSays('', 'No money.'); WS.cash -= 20; WS.flags.wroteHome = WS.day; return { lines: [['', '"Father, mother: I am well..." He writes it in a fine hand and promises it will go with the next carter east.']], opts: mk() }; });
    if (f.trade === 'matchmaker' && !WS.spouse) { const o = WCORE.matchOffer(WS); if (o) say('"Find me a wife"', () => ({ lines: [['', `"There is ${o.en}, of ${o.from}. Good hips, a good worker, can embroider. Betrothal gifts: ${o.gifts} wen, and my fee ${o.fee}."`]], opts: [{ q: `Agree (${o.gifts + o.fee} wen)`, off: WS.cash < o.gifts + o.fee, fx: () => { const r = WCORE.marry(WS, o); if (r[0]) { WS.spouse.home = WS.home; wNote('成親了。', r[1]); } return { lines: [['', r[1]]], opts: [] }; } }, { q: 'Not yet', fx: () => wSays('', '"Don\'t leave it too long, young man."') }] })); }
    if (f.trade === 'beggar' || f.trade === 'refugee') say('Give him 5 wen', () => { if (WS.cash < 5) return wSays('', 'You have nothing to give.'); WS.cash -= 5; WS.karma = (WS.karma | 0) + 1; WCORE.addRel(WS, f.k, 2); return { lines: [['好人有好報。', 'May good come to the good.']], opts: mk() }; });
    if (f.trade === 'candidate') say('Talk about the classics (an hour)', () => { WS.hour += 1; const g = WS.learning < 50 ? 0.8 : 0.3; WS.learning = Math.min(100, WS.learning + g); WCORE.addRel(WS, f.k, 2); return { lines: [['', WS.learning < 40 ? 'He is kind about how little you know, and lends you his notes on the Doctrine of the Mean.' : 'You argue about whether 格物 means investigating things or rectifying the mind, until the lamp oil runs out.']], opts: mk() }; });
    if (f.trade === 'soldier') say('"What is it like, the army?"', () => wSays('', WS.day < D(1619, 3, 2) ? '"Bad food, no pay, and the officers sell our rations. But they say the four armies will finish Nurhaci in a month."' : '"I was at Sarhu. Don\'t join. Or join, and run at the right moment."'));
    if (f.trade === 'clerk' && WS.office) say('Go over the county accounts (two hours)', () => { wPass(2, () => { WS.office.favor = (WS.office.favor | 0) + 1; toast('The tax registers balance, almost. Your superiors will be pleased.'); }); });
    if (f.trade === 'boatman') say('"Where does the grain go?"', () => wSays('', '"To the capital granaries, for the officials\' and soldiers\' rations. Half of it rots, a quarter is stolen, and the rest they eat."'));
    return O; };
  wPanel({ zh: f.zh, en: f.en, t: p.t }, [greet], mk());
}

// ---------------- the forge ----------------
function wForge() {
  const fa = !WS.dead.father && wWhere(wPerson('father'), WS.day) && WS.home === 'lijia';
  const mk = () => { const O = [];
    if (fa) O.push({ q: 'Work the forge with your father (four hours, +60 wen)', fx: () => { wPass(4, () => { WS.cash += 60; WS.arms += 0.6; WS.smith = Math.min(100, (WS.smith || 0) + 0.8); wLog('跟父親打了一下午鐵。', 'An afternoon at the forge with your father.'); toast(`Four hours at the anvil. +60 wen. Smithing ${Math.round(WS.smith)}.`); }); } });
    else O.push({ q: 'Do the village\'s repair work (four hours, +45 wen)', fx: () => { wPass(4, () => { WS.cash += 45; WS.smith = Math.min(100, (WS.smith || 0) + 0.8); toast(`Mended a plough-share and two pots. +45 wen. Smithing ${Math.round(WS.smith)}.`); }); } });
    const ip = WCORE.price(WS, WS.place, 'iron') * 3; O.push({ q: `Buy 3 jin of pig iron from the stock (${ip} wen)`, off: WS.cash < ip, fx: () => { const r = WCORE.buy(WS, WS.place, 'iron', 3); return { lines: [['', r[1] + ` Iron: ${WCORE.inv(WS, 'iron')} jin.`]], opts: mk() }; } });
    for (const w in WCORE.RECIPES) { const R = WCORE.RECIPES[w]; O.push({ q: `Make ${WCORE.GOODS[w][1]} (${R[0]} iron, ${R[1]} hours${R[2] > (WS.smith || 0) ? `, needs smithing ${R[2]}` : ''})`, off: R[2] > (WS.smith || 0) || WCORE.inv(WS, 'iron') < R[0], fx: () => { const r = WCORE.craft(WS, w); if (!r[0]) return { lines: [['', r[1]]], opts: mk() }; wPass(r[2], () => toast(r[1] + ' Sell it to the ironmonger in Liaoyang.')); } }); }
    return O; };
  wPanel({ zh: '鐵匠爐', en: 'The forge', t: `Smithing ${Math.round(WS.smith || 0)} · iron ${WCORE.inv(WS, 'iron')} jin · ${WS.cash} wen` }, [fa ? ['拉風箱！', 'Your father: Work the bellows!'] : ['', WS.dead.father ? 'Your father\'s hammer is on its hook where he left it.' : 'The fire is banked.']], mk());
}

// ---------------- more things to use in places ----------------
Object.assign(W_THING, { bench: ['Sit on the magistrate\'s bench and hear the day\'s case', '升堂'], desk: ['Write a memorial to the throne', '上疏'], shrine: ['Pray at the shrine of the Earth God (土地)', '拜'], ledger: ['Your journal (J)', '記'] });
function wMoreThings(P) { const T = [], S2 = P.spots;
  if (WS.place === 'lijia') T.push({ k: 'shrine', x: S2.well[0] + 3, z: S2.well[1] + 2, prop: 'rack' });
  if (WS.place === 'county' && WS.office) T.push({ k: 'bench', x: S2.yamen[0], z: S2.yamen[1] - 2, prop: 'rack' }, { k: 'desk', x: S2.yamen[0] + 4, z: S2.yamen[1], prop: 'pot' }, { k: 'bed', x: S2.yamen[0] - 5, z: S2.yamen[1] + 3 });
  return T; }
function wThingUse(T) {
  if (T.k === 'shrine') { if (WS.flags.prayed === WS.day) { toast('You have prayed today.'); return true; } WS.flags.prayed = WS.day; if (Math.random() < 0.3) { WS.luck = 1; WS.luckTo = WS.day + 10; } toast('You light a stick of incense before the little Earth God and his wife.'); return true; }
  if (T.k === 'bench') { wCourt(); return true; }
  if (T.k === 'desk') { wMemorial(); return true; }
  return false;
}
// the magistrate's court: one case a day
function wCourt() {
  if (!WS.office) return toast('It is not your bench.');
  if (WS.office.caseDay === WS.day) return toast('No more cases today. The runners have sent the petitioners home.');
  const c = WCORE.caseNow(WS); WS.office.caseDay = WS.day;
  wPanel({ zh: `升堂 · ${c[0]}`, en: c[1], t: `${WS.office.en}. Repute with the people ${WS.office.repute | 0}, with your superiors ${WS.office.favor | 0}` }, [['威——武——', 'The runners strike the floor with their staves.'], ['', c[2]]],
    c[3].map((o, i) => ({ q: o[0], fx: () => { const w = WCORE.judge(WS, c, i); WS.hour += 2; wLog(`審了${c[0]}案。`, `Judged: ${c[1]}.`); return { lines: [['', w]], opts: [] }; } })), {});
}
function wMemorial() {
  const M = WCORE.memosNow(WS); if (!M.length) return toast('There is nothing you need to write to the throne about just now.');
  const m = M[0]; wPanel({ zh: '上疏', en: m.title, t: wFmt(WS.day).en }, [['', 'You grind the ink. What will you write?']], m.opts.map((o, i) => ({ q: o[0], fx: () => { const w = WCORE.memo(WS, m, i); wLog('上疏。', `Memorialised: ${m.title}.`); return { lines: [['', w]], opts: [] }; } })));
}

// ---------------- the hard choices, and the road ----------------
const wCost = (q) => { const m = /\(([\d,]+) wen\)/.exec(q); return m ? +m[1].replace(/,/g, '') : 0; };
function wChoice(d) {
  wPanel({ zh: d.title[0], en: d.title[1], t: wFmt(WS.day).en }, d.text, d.opts.map((o, i) => { const cost = wCost(o[0]); return { q: o[0], off: WS.cash < cost, fx: () => {
    if (WS.cash < cost) return { lines: [['', 'You have not got the money.']] };
    const day0 = WS.day, place0 = WS.place; const w = WCORE.dilemmaChoose(WS, d, i); if (WS.flags.fled) WS.home = 'shanhai';
    if (WS.day > day0) { const n = WS.day - day0; WS.day = day0; wTurnDays(n); }
    wLog(d.title[0], `${d.title[1]}: ${o[0]}.`);
    const moved = WS.place !== place0 || WS.day !== day0;
    return { lines: [['', w]], opts: [{ q: 'Go on', fx: () => { if (moved) wScene(place0); } }] }; } }; }), { noLeave: true });
}
function wAfterScene() { if (state.zheDlg || !WS.alive) return; const d = WCORE.dilemmaNow(WS); if (d) wChoice(d); }
// roads that are shut: the Jin hold the east after their cities fall; only the magistrate goes to his county
function wRoadShut(ex) {
  const P = WPL[ex.to];
  if (ex.office && !(WS.office && WS.office.zh === '知縣')) return `${P.en} is a county seat; you have no business there unless you are posted to it.`;
  if (P.jinFrom && WS.day >= P.jinFrom) return `${P.en} is in Jin hands now. The road is held by their patrols.`;
  if ((ex.to === 'liaoyang' || ex.to === 'lijia') && WS.day >= D(1621, 3, 21) && !WS.jin) return `${P.en} is in Jin hands now. Their patrols turn back anyone with a full head of hair.`;
  return null;
}
function wRoadMeet(ex, arrive) {
  if (!ex.days) return false; let e = null; const d0 = WS.day; for (let i = 0; i < ex.days && !e; i++) { WS.day = d0 - i; e = WCORE.roadDay(WS); } WS.day = d0; if (!e) return false;
  wPanel({ zh: e[2][0], en: e[2][1], t: `On the road to ${WPL[ex.to].en}` }, e[3], e[4].map(o => ({ q: o[0], fx: () => { const w = o[1](WS); WS.cash = Math.max(0, WS.cash); WS.health = Math.max(5, WS.health); wLog(e[2][0], `${e[2][1]}: ${w}`); return { lines: [['', w]], opts: [{ q: 'Go on', fx: () => { arrive(); } }] }; } })), { noLeave: true });
  return true;
}

// ---------------- the journal (J) ----------------
function wJournal() {
  let box = $('wJour'); if (box && !box.hidden) { box.hidden = true; requestLock(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'wJour'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => { e.stopPropagation(); box.hidden = true; requestLock(); }); const st = document.createElement('style');
    st.textContent = `#wJour { position: fixed; inset: 0; z-index: 70; background: rgba(12,10,8,.82); display: flex; align-items: center; justify-content: center; }
#wJour .pp { width: min(760px, 94vw); max-height: 86vh; overflow: auto; background: #efe6cf; color: #2a2018; padding: 22px 28px; border: 1px solid #8a6a3a; font: 14px/1.55 Georgia, serif; box-shadow: 0 10px 40px #000; }
#wJour h3 { margin: 0 0 2px; font: 700 19px Georgia, serif; } #wJour h4 { margin: 12px 0 2px; font: 700 14px Georgia, serif; color: #5a3a1a; } #wJour small { color: #6a5a46; } #wJour .lg { color: #4a3a28; font-size: 13px; }`; document.head.appendChild(st); }
  if (document.pointerLockElement) document.exitPointerLock();
  const T = wTitle(), F = wFmt(WS.day), J = WCORE.journal(WS);
  const fam = ['father', 'mother', 'erniu'].map(k => { const p = wPerson(k); return `${p.en.split(',')[0]}${WS.dead[k] ? ' (dead)' : ''}`; }).join(', ') + (WS.spouse ? `; your wife ${WS.spouse.en}` : '') + (WS.kids && WS.kids.length ? `; children: ${WS.kids.map(k => k.en).join(', ')}` : '');
  const home = WS.home === 'lijia' ? 'in Lijia' : WS.home === 'jin' ? 'under the Jin, beyond reach' : `at ${WPL[WS.home].en}`;
  const friends = Object.entries(WS.rel || {}).filter(([k, v]) => v >= 8).map(([k, v]) => WS.folk[k] ? WS.folk[k].en : (wPerson(k) || {}).en).filter(Boolean).slice(0, 10);
  const army = WS.army ? `${W_ARMY[WS.army.r][2]}, ${WS.army.unit}.` : '', off = WS.office ? `${WS.office.en} (${WS.office.zh}): repute with the people ${WS.office.repute | 0}, with your superiors ${WS.office.favor | 0}.` : '';
  const nx = WEX.filter(e => e[1] > WS.day).slice(0, 2).map(e => `${e[9]}, ${wFmt(e[1]).en}, at ${WPL[e[2]].en}`);
  box.hidden = false; box.innerHTML = `<div class="pp"><h3>${WS.name.zh} ${WS.name.en} · ${T[0]} ${T[1]}</h3><small>${F.zh} · ${F.en} · ${WPL[WS.place].en} · ${WCORE.season(WS.day)}</small>
${J.map(l => `<h4>${l[0]} · ${l[1]}</h4><div>${l[2]}</div>`).join('')}
<h4>家 · Family</h4><div>${fam}. Home: ${home}.</div>${army || off ? `<h4>職 · Service</h4><div>${army}${off}</div>` : ''}
${friends.length ? `<h4>友 · People who like you</h4><div>${friends.join(', ')}</div>` : ''}${nx.length ? `<h4>試 · Coming examinations</h4><div>${nx.join('; ')}</div>` : ''}
<h4>錄 · Lately</h4><div class="lg">${WS.log.slice(-10).reverse().map(l => `${wFmt(l[0]).en.replace(/^.*\((\d+)\)$/, '$1')}/${WCORE.DT(l[0]).m}/${WCORE.DT(l[0]).d}: ${l[2]}`).join('<br>')}</div>
<p><small>Press J or click to close.</small></p></div>`;
}
document.addEventListener('keydown', (e) => { if (e.code !== 'KeyJ' || !WS || !WZ || !state.sim || !state.sim.cfg.camp || !state.sim.cfg.camp.world || state.zheDlg) return; e.stopImmediatePropagation(); e.preventDefault(); wJournal(); }, true);
function wDie() { WS.alive = false; wSave(); zCards([{ title: '歿 · Dead', year: wFmt(WS.day).en, p: [`${WS.name.en} died of a fever ${WS.place === 'lijia' ? 'at home' : 'at ' + WPL[WS.place].en}, ${WCORE.age(WS, WS.born)} years old.`, WS.spouse ? `${WS.spouse.en} burned paper money for him.` : 'Nobody burned paper money for him.', 'The world went on without him.'] }], () => location.reload()); }
