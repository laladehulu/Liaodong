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
  if (F.fatherDies && WS.day >= F.fatherDies && !WS.dead.father) { WS.dead.father = 1; F.parentDied = WS.day; F.fatherDies = 0; wNote('你爹去世了。', 'Your father has died. You bury him on the hill behind the village. The forge is yours now.'); }
  if (F.hoard && WS.day === D(1619, 4, 1)) { if (Math.random() < 0.55) { WS.cash += 2500; wNote('糧商還了錢。', 'The grain dealer pays out: 2,500 wen. People are eating bark in Liaoyang.'); } else wNote('糧商跑了。', 'The grain dealer has vanished with everyone\'s money.'); F.hoard = 0; }
  if (WS.spouse && !F.kidDue && WS.day - WS.spouse.since > 300 && Math.random() < 0.004) F.kidDue = WS.day + 270;
  if (F.kidDue && WS.day >= F.kidDue) { F.kidDue = 0; const boy = Math.random() < 0.5; const nm = boy ? [['大寶', 'Dabao'], ['小鐵', 'Xiaotie'], ['繼祖', 'Jizu']] : [['大妞', 'Daniu'], ['小翠', 'Xiaocui'], ['招弟', 'Zhaodi']]; const n = nm[Math.floor(Math.random() * 3)];
    if (Math.random() < 0.04) { const w = WS.spouse.en; WS.spouse = null; WS.flags.widower = WS.day; wNote('妻子難產死了。', `${w} died in childbirth. The midwife could do nothing. The child lived.`); }
    WS.kids = (WS.kids || []).concat([{ zh: n[0], en: n[1], born: WCORE.DT(WS.day).y, boy }]); wNote(`${boy ? '生了個兒子' : '生了個女兒'}，叫${n[0]}。`, `${WS.spouse ? WS.spouse.en : 'She'} has given birth: a ${boy ? 'son' : 'daughter'}. You call ${boy ? 'him' : 'her'} ${n[1]}.`); }
  if (WS.office) { const o = WS.office; if (o.since !== undefined && WS.day > o.since && (WS.day - o.since) % 360 === 0) { const w = WCORE.evaluate(WS); wNote('考滿。', w); if (!WS.office) WS.flags.dismissed = WS.day; }
    const p = WCORE.purge(WS); if (p) wNote('錦衣衛來了。', p); }
  { const T = WCORE.DT(WS.day); if (WS.status === 'shengyuan' && T.m === 9 && T.d === 1) { const L = WS.learning;
      if (L >= 60) { WS.flags.linsheng = 1; wNote('歲考一等。', 'The licentiates\' yearly test (歲考): first grade. You are made a stipend student (廩生): a monthly allowance of rice.'); }
      else if (L >= 42) wNote('歲考二等。', 'The licentiates\' yearly test: second grade. Nothing changes.');
      else if (L >= 34) { WS.health -= 10; wNote('歲考四等，挨了板子。', 'The licentiates\' yearly test: fourth grade. The Director of Studies has you beaten ten strokes for idleness.'); }
      else { WS.status = 'none'; wNote('歲考六等，革了功名。', 'The licentiates\' yearly test: sixth grade. You are stripped of your licentiate\'s degree.'); } }
    if (WS.flags.linsheng && WS.status === 'shengyuan' && T.d === 1) WS.cash += 600; }
  wXuArmy(); wArmyDay(); wFamilyDay(); wMoneyDay();
  if (WS.health < 30 && Math.random() < 0.02) wNote('你病了。', 'You are running a fever. A physician could help (Liaoyang, Beijing).');
  if (WS.health < 30) WS.health -= 0.6; else if (WS.health < 100) WS.health = Math.min(100, WS.health + 0.6);
  if (WS.health <= 0 && WS.alive) { WS.alive = false; WS.flags.diedOf = 'fever'; }
}
function wLifeHistory(k) {
  const known = WCORE.folkHistory(WS, k); for (const [f, zh, en] of known) if (wKnows(f) || f.place === WS.place) wNote(zh, en);
  const F = WS.flags;
  if (k === 'liuting') {
    if (F.fatherDrafted && !F.fatherBack) { if (Math.random() < 0.55) { WS.dead.father = 1; F.parentDied = WS.day; wNote('你爹沒有回來。', 'Your father did not come back from the east road. A man of his company says he was at Abudali.'); } else { F.fatherBack = 1; wNote('你爹回來了。', 'Your father came back from Abudali, thin as a rake, two fingers gone. He does not speak of it.'); } }
    if (F.gouGoes && !WS.dead.boy1) { WS.dead.boy1 = 1; wNote('狗兒死了。', 'Gou\'er died at Abudali. He was the drummer of his company. He was thirteen.'); }
  }
  if (k === 'liaoyangfall' && WS.home === 'lijia' && !F.stayJin && !(WS.place === 'lijia' || WS.place === 'liaoyang')) {
    const x = Math.random(); if (x < 0.55) { WS.home = 'shanhai'; wNote('家裡人逃出來了。', 'Your family got out: they are among the refugees at the Shanhai Pass.'); }
    else if (x < 0.85) { WS.home = 'jin'; wNote('家裡人沒能逃出來。', 'Your family did not get out. They are under the Jin now; your father will have shaved his head.'); }
    else { WS.dead.mother = 1; WS.dead.erniu = 1; WS.home = 'jin'; wNote('家裡人死了。', 'Word comes from a man of Lijia: when the Jin came through, your mother and sister were killed. Your father was not found.'); }
  }
  if (k === 'liaoyangfall') { const r = WCORE.rngFor(WS, 77); let n = 0; for (const [pl, c] of [['liaoyang', 4], ['lijia', 1]]) for (let i = 0; i < c; i++) { const kk = 'b' + (n++); const sur = [['佟', 'Tong'], ['鈕', 'Niu'], ['覺羅', 'Gioro'], ['舒', 'Shu'], ['富', 'Fu']][Math.floor(r() * 5)], g = [['阿', 'a'], ['爾', 'r'], ['泰', 'tai'], ['善', 'shan']][Math.floor(r() * 4)];
      WS.folk[kk] = { k: kk, zh: sur[0] + g[0], en: `${sur[1]}${g[1]}`, born: 1585 + Math.floor(r() * 15), trade: 'bannerman', place: pl, work: ['market', 'gate', 'road'][i % 3], alive: 1, rel: 0, temper: r(), wealth: 2, jin: 1, look: { h: 1.0 + r() * 0.06, hat: 'felt', beard: 'mous' } }; } }
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
    if (f.trade === 'matchmaker' && !WS.spouse) { const o = WCORE.matchOffer(WS); if (o) say('"Find me a wife"', () => ({ lines: [['', `"There is ${o.en}, of ${o.from}. Good hips, a good worker, can embroider. Betrothal gifts: ${o.gifts} wen, and my fee ${o.fee}."`]], opts: [{ q: `Agree (${o.gifts + o.fee} wen)`, off: WS.cash < o.gifts + o.fee, fx: () => { const r = WCORE.marry(WS, o); if (r[0]) { WS.spouse.home = WS.home; WS.spouse.temper = ['thrifty', 'sharp', 'gentle'][Math.floor(Math.random() * 3)]; wNote('成親了。', r[1] + ` She is ${({ thrifty: 'thrifty: the house money goes further in her hands', sharp: 'sharp-tongued and quick', gentle: 'gentle; the house is quieter for her' })[WS.spouse.temper]}.`); } return { lines: [['', r[1]]], opts: [] }; } }, { q: 'Not yet', fx: () => wSays('', '"Don\'t leave it too long, young man."') }] })); }
    if (f.trade === 'beggar' || f.trade === 'refugee') say('Give him 5 wen', () => { if (WS.cash < 5) return wSays('', 'You have nothing to give.'); WS.cash -= 5; WS.karma = (WS.karma | 0) + 1; WCORE.addRel(WS, f.k, 2); return { lines: [['好人有好報。', 'May good come to the good.']], opts: mk() }; });
    if (f.trade === 'candidate') say('Talk about the classics (an hour)', () => { WS.hour += 1; const g = WS.learning < 50 ? 0.8 : 0.3; WS.learning = Math.min(100, WS.learning + g); WCORE.addRel(WS, f.k, 2); return { lines: [['', WS.learning < 40 ? 'He is kind about how little you know, and lends you his notes on the Doctrine of the Mean.' : 'You argue about whether 格物 means investigating things or rectifying the mind, until the lamp oil runs out.']], opts: mk() }; });
    if (f.trade === 'soldier') say('"What is it like, the army?"', () => wSays('', WS.day < D(1619, 3, 2) ? '"Bad food, no pay, and the officers sell our rations. But they say the four armies will finish Nurhaci in a month."' : '"I was at Sarhu. Don\'t join. Or join, and run at the right moment."'));
    if (f.trade === 'clerk' && WS.office) say('Go over the county accounts (two hours)', () => { wPass(2, () => { WS.office.favor = (WS.office.favor | 0) + 1; toast('The tax registers balance, almost. Your superiors will be pleased.'); }); });
    wMoneyTopics(f.trade, (q, fx, off) => say(q, () => { const r = fx(); return r ? { lines: r.lines, opts: mk() } : r; }, off));
    if (f.trade === 'boatman') say('"Where does the grain go?"', () => wSays('', '"To the capital granaries, for the officials\' and soldiers\' rations. Half of it rots, a quarter is stolen, and the rest they eat."'));
    return O; };
  wPanel({ zh: f.zh, en: f.en, t: p.t }, [greet], mk());
}

// ---------------- the forge ----------------
function wForge() {
  const fa = !WS.dead.father && wWhere(wPerson('father'), WS.day) && WS.home === 'lijia';
  const mk = () => { const O = [];
    if (fa) O.push({ q: 'Work the forge with your father (four hours, +60 wen)', fx: () => { wPass(4, () => { WS.cash += WS.flags.jinManor ? 30 : 60; WS.arms += 0.6; WS.smith = Math.min(100, (WS.smith || 0) + 1.5); wLog('跟父親打了一下午鐵。', 'An afternoon at the forge with your father.'); toast(`Four hours at the anvil. +60 wen. Smithing ${Math.round(WS.smith)}.`); }); } });
    else O.push({ q: 'Do the village\'s repair work (four hours, +45 wen)', fx: () => { wPass(4, () => { WS.cash += WS.flags.jinManor ? 22 : 45; WS.smith = Math.min(100, (WS.smith || 0) + 0.8); toast(`Mended a plough-share and two pots. +45 wen. Smithing ${Math.round(WS.smith)}.`); }); } });
    const ip = WCORE.price(WS, WS.place, 'iron') * 3; O.push({ q: `Buy 3 jin of pig iron from the stock (${ip} wen)`, off: WS.cash < ip, fx: () => { const r = WCORE.buy(WS, WS.place, 'iron', 3); return { lines: [['', r[1] + ` Iron: ${WCORE.inv(WS, 'iron')} jin.`]], opts: mk() }; } });
    for (const w in WCORE.RECIPES) { const R = WCORE.RECIPES[w]; O.push({ q: `Make ${WCORE.GOODS[w][1]} (${R[0]} iron, ${R[1]} hours${R[2] > (WS.smith || 0) ? `, needs smithing ${R[2]}` : ''})`, off: R[2] > (WS.smith || 0) || WCORE.inv(WS, 'iron') < R[0], fx: () => { const r = WCORE.craft(WS, w); if (!r[0]) return { lines: [['', r[1]]], opts: mk() }; wPass(r[2], () => toast(r[1] + ' Sell it to the ironmonger in Liaoyang.')); } }); }
    return O; };
  wPanel({ zh: '鐵匠爐', en: 'The forge', t: `Smithing ${Math.round(WS.smith || 0)} · iron ${WCORE.inv(WS, 'iron')} jin · ${WS.cash} wen` }, [fa ? ['拉風箱！', 'Your father: Work the bellows!'] : ['', WS.dead.father ? 'Your father\'s hammer is on its hook where he left it.' : 'The fire is banked.']], mk());
}

// ---------------- more things to use in places ----------------
Object.assign(W_THING, { bench: ['Sit on the magistrate\'s bench and hear the day\'s case', '升堂'], desk: ['Write a memorial to the throne', '上疏'], shrine: ['Pray at the shrine of the Earth God (土地)', '拜'], ledger: ['Your journal (J)', '記'], shop: ['Work your own smithy (four hours)', '鋪'], east: ['Slip away east to the coast, to Mao Wenlong (continues in the East River campaign)', '東'] });
function wMoreThings(P) { const T = [], S2 = P.spots;
  if (WS.place === 'lijia') T.push({ k: 'shrine', x: S2.well[0] + 3, z: S2.well[1] + 2, prop: 'rack' });
  if (WS.army && W_ARMYAT[WS.army.col] === WS.place && WS.place !== 'liaoyang') { const q = S2.yard || S2.gate || Object.values(S2)[0]; T.push({ k: 'bunk', x: q[0] + 4, z: q[1] + 3 }); }
  if (WS.jin && WS.place === 'lijia' && WS.day >= D(1621, 7, 1) && WS.day < D(1627, 1, 1)) T.push({ k: 'east', x: S2.road[0] + 6, z: S2.road[1], prop: 'banner', sign: '東' });
  if (WS.shop && WS.place === WS.shop.place && S2.smithy) T.push({ k: 'shop', x: S2.smithy[0] + 2, z: S2.smithy[1], prop: 'pot' });
  if (WS.place === 'county' && WS.office) T.push({ k: 'bench', x: S2.yamen[0], z: S2.yamen[1] - 2, prop: 'rack' }, { k: 'desk', x: S2.yamen[0] + 4, z: S2.yamen[1], prop: 'pot' }, { k: 'bed', x: S2.yamen[0] - 5, z: S2.yamen[1] + 3 });
  return T; }
function wThingUse(T) {
  if (T.k === 'shrine') { if (WS.flags.prayed === WS.day) { toast('You have prayed today.'); return true; } WS.flags.prayed = WS.day; if (Math.random() < 0.3) { WS.luck = 1; WS.luckTo = WS.day + 10; } toast('You light a stick of incense before the little Earth God and his wife.'); return true; }
  if (T.k === 'bench') { wCourt(); return true; }
  if (T.k === 'shop') { wShopWork(); return true; }
  if (T.k === 'east') { wToMao(); return true; }
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
    return { lines: [['', w]], opts: [{ q: 'Go on', fx: () => { if (WS.health <= 0) return wDie(WS.flags.diedFor || 'of his wounds'); if (WS.flags.toMao) return wToMao(); if (moved) return wScene(place0); const nx = WCORE.dilemmaNow(WS) || WCORE.festNow(WS, WS.home); if (nx) wChoice(nx); } }] }; } }; }), { noLeave: true });
}
function wAfterScene() { if (state.zheDlg || !WS.alive) return; if (WS.flags.toMao) return wToMao(); if (wArmyMoment()) return; const d = WCORE.dilemmaNow(WS) || WCORE.festNow(WS, WS.home); if (d) wChoice(d); }
// the road's length: a horse cuts it by a third, winter adds two-fifths
function wDays(ex) { if (!ex.days) return 0; let d = ex.days; if (WCORE.inv(WS, 'horse')) d = Math.max(1, Math.ceil(d * 2 / 3)); if (WCORE.season(WS.day) === 'winter') d = Math.ceil(d * 1.4); return d; }
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
function wDie(how) { WS.alive = false; how = how || `of a fever ${WS.place === 'lijia' ? 'at home' : 'at ' + WPL[WS.place].en}`; const E = WCORE.epitaph(WS, how); wHall(E); wSave();
  zCards([{ title: '墓誌 · His stone', year: wFmt(WS.day).en, p: E.concat([WS.spouse ? `${WS.spouse.en} burned paper money for him.` : 'The world went on without him.']) }], () => location.reload()); }
// the hall of lives: the stones of the last lives lived (on the menu card)
function wHall(E) { try { const H = JSON.parse(localStorage.getItem('mingLives') || '[]'); H.unshift({ t: Date.now(), e: E }); localStorage.setItem('mingLives', JSON.stringify(H.slice(0, 8))); } catch (e) { } }
function wHallHtml() { try { const H = JSON.parse(localStorage.getItem('mingLives') || '[]'); if (!H.length) return ''; return `<br><i>Lives lived: ${H.slice(0, 3).map(h => h.e[0]).join(' / ')}</i>`; } catch (e) { return ''; } }

// ---------------- history's people: more to say to some of them ----------------
WPP.push({ k: 'yuancz', zh: '袁崇煥', en: 'Yuan Chonghuan', t: 'a provincial graduate from Guangdong, up for the metropolitan exam; he talks of nothing but Liaodong', born: 1584, hist: true, look: { h: 1.0, hat: 'scholar', beard: 'mous', brows: 'knit' }, rank: 20, where: [[D(1619, 1, 20), D(1619, 3, 20), 'beijing', 'inn', 20, true], [D(1622, 2, 1), D(1622, 9, 1), 'shanhai', 'wall', 10]], role: 'yuancz' });
function wTalkMore(p, say, me) {
  wShopTopic(p, say);
  if (p.k === 'wu') wMoneyTopics('wu', (q, fx, off) => { if (!off) say(q, [['', '(Old Wu fetches the land register.)']], () => { const r = fx(); if (r) toast(r.lines[0][1]); }); });
  if (p.k === 'passguard' && !WS.army && WS.flags.fled && WS.day < D(1627, 1, 1)) say('Join the Pass garrison', [['遼東來的？當過兵？好，關上缺人。', 'From Liaodong? Served before? Good: the Pass is short of men.']], () => { WS.army = { r: 0, col: 'pass', unit: 'the Shanhai Pass garrison', since: WS.day }; wLog('投山海關守軍。', 'Joined the Shanhai Pass garrison.'); banner('守關 · The Pass garrison', 'You stand guard on the First Pass Under Heaven', 4); wScene(); });
  if ((p.k === 'maowl' || p.k === 'lirubai') && WS.army && !WS.army.retainer && WS.arms >= 40) say('Ask to serve among his household men (家丁)', [['讓我看看你的刀法。', 'Show me your swordwork.'], ['……好。從今天起你吃我的飯。', '...Good. From today you eat at my table.']], () => { WS.army.retainer = 1; WS.army.unit = `household men (家丁) of ${p.en}`; wLog('入家丁。', `Taken among the household men of ${p.en}.`); toast('Double pay, better armour, and you go where he goes.'); });
  if (p.k === 'xugq') {
    say('Ask him about Western learning', [['利瑪竇先生教我的。幾何之學，一步一步，無一字可疑。', 'Master Ricci taught me. The learning of geometry: step by step, not one word open to doubt.'], ['你看這個：《幾何原本》。三角形的內角之和……', 'Look at this: the Elements of Euclid. The angles of a triangle together...']], () => { WS.learning = Math.min(100, WS.learning + 1.2); WS.flags.xixue = (WS.flags.xixue | 0) + 1; WCORE.addRel(WS, 'xugq', 3); toast('An afternoon of Euclid. Learning ' + Math.round(WS.learning) + '.'); });
    say('Ask him about the war in Liaodong', [['遼事壞在兵不練，器不精。', 'Liaodong is lost through untrained men and bad weapons.'], ['要用西洋大炮，紅夷炮。澳門有，要去買。', 'We need the Western cannon, the red barbarian guns. Macao has them; we must buy them.']]);
    if (WS.day >= D(1619, 9, 1) && WS.day < D(1621, 1, 1) && !WS.army && WS.place === 'tongzhou') say('Ask to train in his new army', [['好。我這裡練的是新兵：火器，陣法，一個一個教。', 'Good. Here we train new soldiers: firearms, formations, man by man.'], ['只是……餉銀常常不到。', 'Only... the pay often does not come.']], () => { WS.army = { r: 0, col: 'xu', unit: 'Xu Guangqi\'s new army at Tongzhou', since: WS.day }; wLog('入徐光啟通州練兵。', 'Joined Xu Guangqi\'s new army at Tongzhou.'); banner('練兵 · The new army', 'You drill with firearms under Xu Guangqi', 4); });
    if (WCORE.relOf(WS, 'xugq') >= 9 && !WS.flags.baptised) say('Ask him about his faith', [['天主，是萬物的根本。我受洗二十年了，教名保祿。', 'The Lord of Heaven is the root of all things. I was baptised twenty years ago; my name in the faith is Paul.'], ['你若願意，我可以帶你去見龍華民神父。', 'If you wish, I can take you to Father Longobardo.']], () => { WS.flags.baptised = 1; wLog('受洗。', 'Baptised a Catholic at the Jesuits\' house in Beijing.'); toast('You are baptised. Your mother would not understand; you do not tell her.'); });
  }
  if (p.k === 'yuancz') {
    say('Talk with him about Liaodong', [['你是遼東人？好！撫順怎麼丟的，你給我說說。', 'You\'re from Liaodong? Good! Tell me how Fushun was lost.'], ['……給我兵馬錢糧，我一人足守此。', '...Give me men, horses, money and grain, and I alone can hold it.']], () => { WCORE.addRel(WS, 'yuancz', 6); wLog('與袁崇煥論遼事。', 'Talked of Liaodong with Yuan Chonghuan, a candidate from Guangdong.'); });
    if (WS.place === 'shanhai') say('Remind him of the inn in Beijing', WCORE.relOf(WS, 'yuancz') >= 6 ? [['是你！我記得。我單騎出關看過了，寧遠可以守。', 'You! I remember. I rode out beyond the Pass alone to look: Ningyuan can be held.'], ['跟我去寧遠吧。', 'Come with me to Ningyuan.']] : [['我們見過？', 'Have we met?']], () => { if (WCORE.relOf(WS, 'yuancz') >= 6) { WS.flags.yuanMan = 1; wLog('願隨袁崇煥。', 'Promised to follow Yuan Chonghuan to Ningyuan.'); } });
  }
}
// the Seven Grievances: Nurhaci's declaration of war, copied and passed from hand to hand
function wGrievances() {
  wPanel({ zh: '七大恨', en: 'The Seven Grievances', t: 'A copy pasted on the notice board, half torn down by the runners' }, [['我之祖父，未嘗損明邊一草寸土，明無端起釁邊陲，害我祖父，恨一也。', '"My grandfather and father never harmed a blade of grass of the Ming border, yet the Ming without cause made trouble on the frontier and killed them: this is the first grievance."'], ['', 'Then: the Ming protected the Yehe against him; Ming men crossed the border; the Ming made him execute ten of his own men; a betrothed Yehe princess given to the Mongols; his farmers driven from their fields; an envoy who insulted him. "For these seven grievances I go to war."']],
    [{ q: 'Tear it down', fx: () => { WS.karma = (WS.karma | 0); return wSays('', 'A runner sees you and nods his approval.'); } }, { q: 'Read it again, slowly', fx: () => { WS.learning = Math.min(100, WS.learning + 0.3); return wSays('', 'Some of it is true. That is what frightens you.'); } }]);
}
// Xu Guangqi's new army starves for pay and is disbanded when he resigns (early 1621)
function wXuArmy() { if (WS.army && WS.army.col === 'xu' && WS.day >= D(1621, 1, 1)) { WS.army = null; wNote('徐光啟辭官，新兵散了。', 'Xu Guangqi has resigned, sick and unpaid; his new army at Tongzhou is disbanded. You are a free man again.'); } }

// ===================== R2: the army =====================
const W_ARMYAT = { liu: 'liaoyang', xu: 'tongzhou', pass: 'shanhai', jin: 'liaoyang' };
// your squad: five men who live where the company lives, and die in its battles
function wArmyDay() { const A = WS.army; if (!A) return; if (!A.mates) A.mates = WCORE.makeMates(WS, W_ARMYAT[A.col] || 'liaoyang');
  for (const k of A.mates) { const f = WS.folk[k]; if (f && f.alive) f.place = W_ARMYAT[A.col] || f.place; } }
function wMatesFall(p) { const A = WS.army; if (!A || !A.mates) return []; const dead = []; for (const k of A.mates) { const f = WS.folk[k]; if (f && f.alive && Math.random() < p) { f.alive = 0; f.died = WS.day; f.how = 'in battle'; dead.push(f.en); } } if (dead.length) wNote('戰友陣亡。', `Of your squad, ${dead.join(', ')} did not come back.`); return dead; }
// pay: a soldier's tael and eight a month, a squad leader's two and a half; after Sarhu the Liaodong pay comes late or not at all
function wPayDay() { const A = WS.army, amt = (W_ARMY[A.r][0] >= 6 ? 2000 : 1440) * (A.retainer ? 2 : 1);
  if ((A.col === 'liu' && WS.day >= D(1619, 3, 5) && Math.random() < 0.45) || (A.col === 'xu' && Math.random() < 0.6)) { A.arrears = (A.arrears | 0) + amt; wLog('欠餉。', 'No pay this month.'); if (A.arrears >= amt * 3 && !WS.flags.mutinyAsked) WS.flags.mutinyDue = 1; return; }
  WS.cash += amt; wLog('發了月餉。', 'Pay day.'); }
// heads taken in a battle: the Ming paid for heads in silver or in rank
function wHeads(k) { if (!WS.army || !k) return 0; const A = WS.army; A.heads = (A.heads | 0) + k; const steps = Math.floor(A.heads / 4) - (A.headSteps | 0);
  if (steps > 0 && A.r < W_ARMY.length - 2) { A.headSteps = (A.headSteps | 0) + steps; A.r = Math.min(W_ARMY.length - 2, A.r + steps); wNote('以首功升。', `Your heads are counted (${A.heads} in all): you are made ${W_ARMY[A.r][2]}.`); }
  else { WS.cash += k * 400; wNote('首級賞銀。', `${k} head${k > 1 ? 's' : ''} counted: ${k * 400} wen of reward silver (after the officers took their share).`); } return k; }
function wBattleCards(m) { const F = wFmt(WS.day).en;
  return ({ roadA: [{ title: '東路 · The east road', year: F, p: ['General Liu Ting\'s column marches from Kuandian toward Hetu Ala: the Zhejiang men, the Sichuan men, the Korean allies, and the Liaoyang levy, you among them. The snow is still on the passes.'] }],
    abudali: [{ title: '阿布達里岡 · Abudali', year: F, p: ['The column has come out of the hills at Abudali. There is no word from the other columns.'] }],
    hunw: [{ title: '渾河 · The Hun River', year: F, p: ['Shenyang has fallen. The Sichuan and Zhejiang men under Chen Ce and Tong Zhongkui have crossed the Hun River to try to retake it. Your company is with them, on the north bank, with the river at your backs.'] }],
    ningyuan: [{ title: '寧遠 · Ningyuan', year: F, p: ['Nurhaci has come with his whole army across the frozen plain. Every fort beyond the Pass has been abandoned except this one. Yuan Chonghuan has burned the suburbs, brought the people inside, and mounted the red barbarian cannon on the walls.'] }] })[m]
    || [{ title: '遼陽 · Liaoyang', year: F, p: ['The Jin are in the city. Get your family out.'] }]; }
function wFinishMore(m, heads) {
  if (m === 'hunw') { wMatesFall(0.5); const d = D(1621, 3, 18); if (WS.day < d) wTurnDays(d - WS.day); WS.place = 'liaoyang'; WS.from = 'west'; WS.hour = 9; wSave();
    zCards([{ title: '渾河 · The Hun River', year: wFmt(WS.day).en, p: ['The north bank was lost. The Sichuan men fought until there were none of them left; the Zhejiang men on the south bank were overrun the next day. You swam the river at dusk.', 'You are back in Liaoyang. The Jin are three days behind you.'] }], () => wScene('west')); return true; }
  if (m === 'ningyuan') { wMatesFall(0.15); if (WS.army) WS.army.r = Math.min(W_ARMY.length - 1, WS.army.r + 1); wSave();
    zCards([{ title: '寧遠大捷 · Victory at Ningyuan', year: wFmt(WS.day).en, p: ['The Jin assault broke on the walls of Ningyuan under the fire of the red barbarian cannon. It was the first defeat of Nurhaci\'s life; by the summer he was dead.', WS.army ? `You are made ${W_ARMY[WS.army.r][2]}.` : ''] }], () => wScene()); return true; }
  return false; }
// after Liaoyang: west to the Pass with the refugees, or east to the coast with Mao Wenlong (the East River campaign)
function wAfterFall() {
  wPanel({ zh: '遼陽陷', en: 'Liaoyang has fallen', t: wFmt(WS.day).en }, [['', 'You are out of the city, in the crowd on the roads. West, twelve days to the Shanhai Pass and inside the Wall. East, they say Mao Wenlong is gathering men on the coast to fight on.']],
    [{ q: 'West, to the Pass, with the refugees', fx: () => { WS.place = 'shanhai'; WS.from = 'liaoyang'; if (WS.army) WS.army = Object.assign(WS.army, { col: 'pass', unit: 'the Shanhai Pass garrison' }); WS.home = 'shanhai'; WS.flags.fled = 1; wTurnDays(12); wSave();
      zCards([{ title: '逃難 · West', year: wFmt(WS.day).en, p: ['Liaoyang is lost. You go west with the refugees, twelve days to the Shanhai Pass.'] }], () => wScene('liaoyang')); } },
      { q: 'East, to the coast, to Mao Wenlong (your life goes on in the East River campaign)', fx: () => { wToMao(); } },
      { q: 'Home to Lijia: live under the Jin, as most people will', fx: () => { WS.flags.stayJin = 1; WS.army = null; WS.place = 'lijia'; WS.from = 'liaoyang'; WS.home = 'lijia'; wTurnDays(1); wSave(); wScene('liaoyang'); } }], { noLeave: true });
}
function wToMao() { WS.alive = false; WS.flags.toMao = 1; wHall(WCORE.epitaph(WS, 'beyond the sea with Mao Wenlong (his story goes on in the East River campaign)').slice(0, 2)); wSave();
  zCards([{ title: '東江 · To the East River', year: wFmt(WS.day).en, p: ['You go east, toward the sea, with the people who will not live under the Jin. Your life goes on in the East River campaign.'] }], () => { try { DS = dFresh(); DS.fromWorld = 1; dSave(); dStart('c2'); } catch (e) { location.reload(); } }); }
// the bunk: sleep (a night in the barracks may bring something), or walk away from the army
function wBunk() { const A = WS.army; if (!A) return wSleep();
  const sleep = () => { const ev = WCORE.nightEvent(WS); if (!ev) return wSleep(); wPanel({ zh: ev.title[0], en: ev.title[1], t: 'Night, in the barracks' }, ev.text, ev.opts.map(o => ({ q: o[0], fx: () => { o[2](WS); WS.cash = Math.max(0, WS.cash); WS.health = Math.max(5, Math.min(100, WS.health)); const w = typeof o[1] === 'function' ? o[1](WS) : o[1]; return { lines: [['', w]], opts: [{ q: 'Sleep', fx: () => { wSleep(); } }] }; } })), { noLeave: true }); };
  const O = [{ q: 'Sleep', fx: () => { sleep(); } }];
  if (A.arrears) O.push({ q: `Ask the company clerk for your back pay (${A.arrears} wen owed)`, fx: () => Math.random() < 0.25 ? (WS.cash += Math.floor(A.arrears / 2), A.arrears = Math.ceil(A.arrears / 2), wSays('', 'He pays you half, and makes you sign for all of it.')) : wSays('', '"When the silver comes from Beijing. Next month."') });
  O.push({ q: 'Desert: take your things and walk away tonight', fx: () => { wNote('開小差。', 'You deserted from the army.'); WS.flags.deserter = WS.day; WS.army = null; WS.place = WS.home === 'lijia' ? 'lijia' : WS.place; WS.from = 'liaoyang'; wTurnDays(1); WS.hour = 7; wSave(); wScene(); } });
  wPanel({ zh: '營房', en: 'Your bunk', t: `${W_ARMY[A.r][2]}, ${A.unit}${A.heads ? `; ${A.heads} heads taken` : ''}` }, [['', 'A plank bed, a straw quilt, ten men snoring.']], O);
}
// the army's other moments: a mutiny over pay; a deserter recognised in town
function wArmyMoment() {
  const A = WS.army;
  if (A && WS.flags.mutinyDue && !WS.flags.mutinyAsked && WS.place === W_ARMYAT[A.col]) { WS.flags.mutinyAsked = 1;
    return wChoice({ k: 'mutiny' + WS.day, title: ['鼓譟', 'The company will not march'], text: [['', `Three months without pay. Tonight the company has barred the gate of the yard and is shouting for the paymaster. Your squad looks at you.`]],
      opts: [['Join them', 'The paymaster comes out with half the arrears. Next week two of the ringleaders are beheaded; you are not among them.', (S) => { S.cash += Math.floor((A.arrears | 0) / 2); A.arrears = 0; if (Math.random() < 0.15) S.health = Math.max(10, S.health - 40); }], ['Stay in your bunk', 'It passes over you.', () => { }], ['Go to the officers', 'You are made a squad leader for your loyalty. Your squad will not speak to you.', (S) => { A.r = Math.max(A.r, 1); S.karma = (S.karma | 0) - 1; }]] }), true; }
  if (!A && WS.flags.deserter && WS.place === 'liaoyang' && WS.day < D(1621, 3, 21) && WS.flags.seenDay !== WS.day && Math.random() < 0.3) { WS.flags.seenDay = WS.day;
    return wChoice({ k: 'seen' + WS.day, title: ['被認出來了', 'Recognised'], text: [['', 'A soldier from your old company stops in the street and stares at you. "You! You ran!"']],
      opts: [['Slip him 500 wen (500 wen)', 'He looks at the silver, then at you, and walks on.', (S) => { S.cash -= 500; }], ['Run', (S) => S.flags.caught ? 'They catch you at the corner. Forty strokes, and back to the company.' : 'You lose him in the market.', (S) => { if (Math.random() < 0.4) { S.flags.caught = 1; S.health = Math.max(10, S.health - 35); S.army = { r: 0, col: 'liu', unit: 'Liaoyang levy (returned deserter)', since: S.day }; S.flags.deserter = 0; } }]] }), true; }
  return false; }

// ===================== R3: the family =====================
function wFamilyDay() {
  const T = WCORE.DT(WS.day), F = WS.flags, y = T.y, home = WS.home;
  // the old die: your parents age like everyone else, faster in a hungry winter
  if (home !== 'jin') for (const [k, born, nm] of [['father', 1572, 'Your father'], ['mother', 1578, 'Your mother']]) { if (WS.dead[k] || (k === 'father' && F.fatherDrafted && !F.fatherBack)) continue; const a = y - born;
    const p = (a > 62 ? 0.0006 : a > 52 ? 0.00022 : 0.00006) * (WCORE.season(WS.day) === 'winter' ? 2 : 1) * ((F.famHungry | 0) > 2 ? 3 : 1);
    if (Math.random() < p) { WS.dead[k] = 1; F.parentDied = WS.day; wNote(k === 'father' ? '你爹去世了。' : '你娘去世了。', `${nm} has died${WS.place === home ? ' in the night' : ' at home; the letter took a month to find you'}. ${a} years old.`); } }
  if (T.d !== 1) return;
  // the house needs money once the father cannot earn it: 300 wen a month, taken from your purse if you have it
  const needs = home !== 'jin' && (!WS.dead.mother || !WS.dead.erniu) && (WS.dead.father || (F.fatherDrafted && !F.fatherBack) || home !== 'lijia');
  if (needs) { if (WS.cash >= 300) { WS.cash -= 300; F.famHungry = 0; WS.xiao = (WS.xiao | 0) + 0.2; } else { F.famHungry = (F.famHungry | 0) + 1; WS.xiao = (WS.xiao | 0) - 1; wNote('家裡斷糧了。', `There was no money for the house this month. Your mother is eating bran.`); } }
  if (WS.spouse && WS.spouse.temper === 'thrifty') WS.cash += 150;
  if (F.sonSchool && T.m === 1) { if (WS.cash >= 500) WS.cash -= 500; else { F.sonSchool = 0; wNote('兒子退學了。', 'There was no money for your son\'s school this year. He comes home.'); } }
  if (F.mourning && WS.day >= F.mourning) { F.mourning = 0; wNote('服滿。', 'The twenty-seven months of mourning are over. You may go to the Ministry of Personnel in Beijing and ask for a new post.'); }
}

// ===================== R5: money and property =====================
function wMoneyDay() { for (const w of WCORE.moneyDay(WS)) wNote('錢', w);
  const T = WCORE.DT(WS.day);
  if (T.m === 9 && T.d === 1) { const r = WCORE.landYear(WS); if (r && (r.rent || r.lost)) wNote('秋收。', `The autumn: your tenants pay ${r.rent} wen of rent; the land tax and the Liaodong levy take ${r.tax}.${r.lost ? ` Your ${r.lost} mu at Lijia are in Jin hands now; the deeds are worthless.` : ''}`); }
  if (WS.shop && T.d === 1) { if (WS.cash >= 500) WS.cash -= 500; else { WS.shop = null; wNote('鋪子收回了。', 'You could not pay the rent on the smithy in Liaoyang; the landlord has let it to someone else.'); } }
  if (WS.shop && WS.day >= D(1621, 3, 21)) { WS.shop = null; wNote('鋪子沒了。', 'Your smithy in Liaoyang is lost with the city.'); }
  if (WS.contract && WS.day > WS.contract.due) { WS.contract = null; WCORE.addRel(WS, WS.contractFrom || '', -10); wNote('誤了期。', 'You missed the date on the blade contract. The ironmonger will not deal with you again soon.'); }
}
// the topics money brings: land from the headman or the county clerk, the pawnshop, a contract, a shop
function wMoneyTopics(who, add) {
  const land = (pl) => { const pr = WCORE.landPrice(WS, pl); for (const n of [1, 5]) add(`Buy ${n} mu of land (${pr * n} wen)`, () => { const r = WCORE.buyLand(WS, pl, n); return { lines: [['', r[1]]] }; }, WS.cash < pr * n);
    if (WS.land && WS.land[pl]) add(`Sell a mu of your land (about ${Math.round(pr * 0.85)} wen)`, () => { const r = WCORE.sellLand(WS, pl, 1); return { lines: [['', r[1]]] }; }); };
  if (who === 'wu' && WS.place === 'lijia' && WS.day < D(1621, 3, 21)) land('lijia');
  if (who === 'clerk' && WS.place === 'county') land('county');
  if (who === 'pawnbroker') {
    for (const g of Object.keys(WS.inv || {})) if (g !== 'letter' && WCORE.GOODS[g] && WCORE.price(WS, WS.place, g) >= 40) add(`Pawn ${WCORE.GOODS[g][1]} (${Math.round(WCORE.price(WS, WS.place, g) * 0.5)} wen)`, () => { const r = WCORE.pawn(WS, WS.place, g); return { lines: [['', r[1]]] }; });
    (WS.pawns || []).forEach((t, i) => { if (t.place === WS.place) add(`Redeem ${WCORE.GOODS[t.g][1]} (${WCORE.redeemCost(WS, t)} wen)`, () => { const r = WCORE.redeem(WS, i); return { lines: [['', r[1]]] }; }); });
    if ((WS.debt || []).length < 2) for (const n of [1000, 5000]) add(`Borrow ${n} wen at three per cent a month`, () => { const r = WCORE.borrow(WS, n); return { lines: [['', r[1]]] }; });
    (WS.debt || []).forEach((d, i) => add(`Repay the note for ${d.n} wen (${WCORE.owed(WS, d)} now)`, () => { const r = WCORE.repay(WS, i); return { lines: [['', r[1]]] }; }, WS.cash < WCORE.owed(WS, d)));
  }
  if (who === 'ironmonger') { if (WS.contract && WS.contractFrom) { add(`Deliver the ${WS.contract.n} knives`, () => { const p = WCORE.contractDeliver(WS); return { lines: [['', p ? `He checks every edge and pays ${p} wen.` : `You have ${WCORE.inv(WS, 'knife')} of ${WS.contract.n}.`]] }; }); }
    else { const c = WCORE.contractOffer(WS); if (c) add(`"Any big orders?" (a contract: ${c.n} knives at ${c.each} wen each in 40 days)`, () => { WS.contract = c; WS.contractFrom = who; return { lines: [['兵備道要刀，我一個人打不完。你接一半。', 'The Military Defence Circuit wants blades and I can\'t make them all. Take some.']] }; }); } }
}
// a smithy of your own in Liaoyang, rented from Innkeeper Qian's cousin
function wShopTopic(p, say) { if (p.k === 'innkeep' && WS.place === 'liaoyang' && WS.day < D(1621, 3, 1) && !WS.shop && (WS.smith || 0) >= 25) say('Ask about renting a shop front for a smithy (500 wen a month)', [['我表弟有間鋪面，靠著鐵匠街。一個月五百文。', 'My cousin has a shop front on the smiths\' street. Five hundred a month.']], () => { if (WS.cash < 500) return toast('You need the first month\'s rent.'); WS.cash -= 500; WS.shop = { place: 'liaoyang', since: WS.day }; wLog('租了鋪子。', 'Rented a smithy in Liaoyang.'); toast('The smithy is yours. Work it (E) when you are in Liaoyang.'); wScene(); }); }
function wShopWork() { const inc = Math.round((30 + (WS.smith || 0) * 1.8) * (WS.flags.jinManor ? 0.5 : 1)); wPass(4, () => { WS.cash += inc; WS.smith = Math.min(100, (WS.smith || 0) + 0.6); toast(`Four hours at your own anvil: hinges, hoes, a horse's shoes. +${inc} wen.`); }); }
