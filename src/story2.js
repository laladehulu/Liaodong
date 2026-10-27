// ===================== story2 · more to do in the three story campaigns =====================
// Client side of the story's own small rules (sim.js mActX / mObjX / mTickX, driven by each mission's `x` data): the
// officer's word turned into captions on named men, the goal line's running tally, the moment at the ford, the beacon,
// fire by rank, the ice, and the camp scenes that answer them (who stands at your left, naming the dead, the whip for the
// man who moved before the conch). Spliced last into main.js's scope (build.sh). Solo story only; it never writes the sim
// except through the input stream (chSend) like choices.js.
// Sources are given piece by piece; where none exists the comment says so.
const S2 = { last: {}, cool: {}, goal: '', tally: null, said: {}, campDone: {}, seen: new Set() };
const s2L = (zh, en) => [zh, en];
const s2Ctx = () => (typeof chCtx === 'function' ? chCtx() : null);
const s2Save = () => { const C = s2Ctx(); if (C) C.save(); };
// ---------- captions: the story's events become short spoken lines on named men ----------
// who speaks: the senior man of the file on his feet (the chief if he lives), else anyone of the file near you
function s2Chief() { const sim = state.sim, h = localHero(); if (!sim || !ZB) return null; let best = null, bi = 99;
  for (const uid in ZB.map) { const u = sim.units[uid]; if (!u || u.dead || u.wounded || u.downed || (h && +uid === h.id)) continue; const i = ZB.map[uid]; if (i < bi) { bi = i; best = u; } } return best; }
function s2Man(k) { const sim = state.sim; if (!sim || !ZB) return null; const R = ZB.R || ZR; for (const uid in ZB.map) { const r = R[ZB.map[uid]]; if (r && r.k === k) { const u = sim.units[uid]; if (u && !u.dead) return u; } } return null; }
function s2Say(u, zh, en, o) { if (!u) return false; const key = (o && o.key) || zh; const now = performance.now(); if (S2.cool[key] && now - S2.cool[key] < ((o && o.cool) || 6) * 1000) return false; S2.cool[key] = now; return SPEECH.say(u.id, zh, en, Object.assign({ prio: 3, loud: true, dur: Math.min(7, 2.5 + en.length / 22) }, o || {})); }
const s2Me = () => { const h = localHero(); return h && !h.dead ? h : null; };
const s2Nm = (uid) => SPEECH.nameOf(uid) || { zh: '', en: 'a man of the file' };
// the orders the chief gives by voice at every change of the line's state (short, period, readable in the fight)
const S2ORD = {
  hold: [s2L('舉銃——等號令！', 'Present — wait for the word!'), s2L('收銃！聽我的！', 'Hold your fire! On my word!')],
  word: [s2L('放！', 'Fire!'), s2L('放銃——！', 'Give fire!')],
  early: [s2L('誰放的？！還沒下令！', 'Who fired?! No order was given!'), s2L('未令先放——記下他！', 'Fired before the word — mark him down!')],
  rank: [s2L('頭排——放！二排舉銃！', 'First rank — fire! Second rank, present!'), s2L('二排——放！三排舉銃！', 'Second rank — fire! Third rank, present!'), s2L('三排——放！頭排裝藥！', 'Third rank — fire! First rank, load!')],
  back: [s2L('退一排，裝藥！', 'Fall back a rank — load!')],
  waste: [s2L('不是你的排！等！', 'Not your rank! Wait!')],
  drum: [s2L('聽鼓——放！', 'On the drum — fire!')],
  offbeat: [s2L('鼓點！跟著鼓點！', 'The drum! Fire on the drum!')],
  close: [s2L('歸隊！靠攏！', 'Back in line! Close up!')],
  closed: [s2L('好——隊齊了！藤牌在前！', 'Good — the file is whole! Shields front!')],
};
function s2Order(kind, i) { const L = S2ORD[kind]; if (!L) return; const l = L[Math.min(i | 0, L.length - 1)]; const c = s2Chief(); if (c) s2Say(c, l[0], l[1], { key: kind + i, cool: 2.5, shout: kind === 'word' || kind === 'rank' ? 0.4 : false }); }
// ---------- the events ----------
function s2Event(ev) {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.soldier || !ZB) return; const h = s2Me();
  if (ev.t === 'mword') { s2Order('word', 0); banner('放 · Fire!', 'The word is given: fire', 2.5); if (ev.early) feed('You fired before the word. The chief saw it.'); }
  else if (ev.t === 'mearly') { s2Order('early', (S2.said.early = (S2.said.early || 0) + 1) > 1 ? 1 : 0); feed('Fired before the word · 未令先放', false); S2.early = 1; }
  else if (ev.t === 'mrank') { if (ev.mine) { s2Order('rank', 0); banner('你的排 · Your rank', 'Present and fire now', 2); } else { const c = s2Chief(); if (c) s2Say(c, S2ORD.rank[1 + (ev.r % 2)][0], S2ORD.rank[1 + (ev.r % 2)][1], { key: 'rank' + ev.r, cool: 1.5, shout: 0.3 }); } }
  else if (ev.t === 'mshot') { if (!ev.good) s2Order(sim.mission.phases[sim.mv.ph].x.drum ? 'offbeat' : 'waste', 0); }
  else if (ev.t === 'mdrum') { AUDIO.play('drum', undefined, 0, 0, 0.35); if (ev.b === 0) s2Order('drum', 0); }
  else if (ev.t === 'mbroke') { const c = s2Chief(); if (c) s2Say(c, '誰讓你動的？！海螺沒響！', 'Who told you to move?! The conch has not sounded!', { key: 'broke', shout: 0.4 }); feed('You moved before the conch · 未令先動'); const C = s2Ctx(); if (C) { C.S.flags.movedEarly = 1; C.save(); } }
  else if (ev.t === 'mfar') { const u = sim.units[ev.id]; if (u) s2Say(u, '你說過跟緊你的！你在哪？', 'You said to stay close to you! Where are you?', { key: 'far' }); }
  else if (ev.t === 'mback') { const u = sim.units[ev.id]; if (u) s2Say(u, '……你回來了。', '...You came back.', { key: 'back' }); }
  else if (ev.t === 'mclosed') { s2Order('closed', 0); banner('隊齊 · The file is whole', ev.how === 'line' ? 'You dressed the line' : 'Back on the chief\'s shoulder', 2.5); }
  else if (ev.t === 'mmoment') { const c = s2Chief(); const w = ev.wet; const L = w >= 0.45 ? s2L('就是現在！半渡——殺！', 'Now! Half across — kill!') : w >= 0.2 ? s2L('早了點……殺！', 'A little early... kill!') : s2L('太早了！他們還在岸上！', 'Too early! They are still on the bank!'); if (c) s2Say(c, L[0], L[1], { key: 'moment', shout: 0.45 }); banner(w >= 0.45 ? '半渡 · Mid-stream' : w >= 0.2 ? '早 · Early' : '太早 · Too early', `${Math.round(w * 100)}% of their horse were in the water`, 3); const C = s2Ctx(); if (C) { C.S.flags.fordMoment = w >= 0.45 ? 2 : w >= 0.2 ? 1 : 0; C.save(); } }
  else if (ev.t === 'mice') { const u = sim.units[ev.id], n = s2Nm(ev.id); SPEECH.say(ev.id, '冰——冰裂了！拉我——', 'The ice — the ice is going! Pull me —', { prio: 3, dur: 4 }); toast(`${n.zh} ${n.en} has gone through the ice. Get to him (E) before the cold takes him`); S2.ice = ev.id; }
  else if (ev.t === 'miceout') { const n = s2Nm(ev.id); feed(`You haul ${n.en} out of the water`, true); setTimeout(() => SPEECH.say(ev.id, '……手。我的手沒知覺了。', '...My hands. I can\'t feel my hands.', { prio: 2, dur: 3.5 }), 900); S2.ice = -1; }
  else if (ev.t === 'muse') { if (ev.key === 'beacon') { banner('烽火 · The beacon', 'The cresset burns. The garrison sees them now', 3); AUDIO.play('explosion', ev.x, 4, ev.z, 0.3); const C = s2Ctx(); if (C) { C.S.flags.beaconLit = 1; C.save(); } }
    else if (ev.key === 'chain') { feed(`Cart chained · ${ev.n} of 3`, true); if (ev.n >= 3) banner('車連 · Carts chained', 'The wall is closed', 2.5); }
    else if (ev.key === 'gap') { banner('缺口 · The gap', 'You point it out. The file strikes there', 2.5); }
    else if (ev.key === 'ladder') { banner('雲梯 · The ladder', 'You go up first', 2.5); } }
  else if (ev.t === 'mhurt') { if (h && ev.id === h.id) { state.renderer && (state.renderer.hitFlash = 0.5); toast('A gun bursts in the rank beside you. Your hands are burned'); } }
  else if (ev.t === 'mform') { const q = sim.squads[ZB.sq]; if (q && ev.gid === 'zhe' && ev.form === 3) s2Order('close', 0); }
  else if (ev.t === 'entangle') { const b = sim.units[ev.by]; if (b && ZB.map[ev.by] !== undefined && h && Math.hypot(b.x - h.x, b.z - h.z) < 14) { const n = s2Nm(ev.by); if (n.zh) s2Say(b, '架住了！槍！', 'Held! Spears!', { key: 'ent' + ev.by, cool: 7, prio: 2, dur: 2 }); } }
  else if (ev.t === 'yylunge') { const u = sim.units[ev.id]; if (u && ZB.map[ev.id] !== undefined && h && Math.hypot(u.x - h.x, u.z - h.z) < 14) s2Say(u, '戳！', 'Stick him!', { key: 'lunge' + ev.id, cool: 7, prio: 2, dur: 1.5 }); }
}
// ---------- the goal line: a tally for the phases that count something ----------
function s2Goal(g) {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mv || sim.mv.ph < 0 || !sim.mv.x) return g; const P = sim.mission.phases[sim.mv.ph]; if (!P || !P.x) return g; const x = sim.mv.x;
  if (P.x.tally === 'catch') g += ` · caught ${x.n.catch || 0}`;
  if (P.x.rank || P.x.drum) g += ` · ${x.good || 0} on the word${x.waste ? ` · ${x.waste} wasted` : ''}`;
  if (P.x.hold) g += x.word ? '' : x.early ? ' · fired early' : ' · HOLD';
  if (P.x.ice && x.iceId >= 0 && !x.flag.iceOut) { const u = sim.units[x.iceId]; if (u && u.downed) g += ` · ${Math.ceil(u.bleed / 30)} s in the water`; }
  if (P.x.use) { for (const s of P.x.use) if (s.key === 'chain') { g += ` · chained ${x.n.chain || 0}/3`; break; } }
  return g;
}
{ const _g = zGoal; zGoal = function () { try { return s2Goal(_g()); } catch (e) { return _g(); } }; }
// the E key: in a story battle, E at one of the phase's marked spots is a use (the sim decides; the key goes as a kick)
// ---------- the in-battle choices (choices.js registry) ----------
// 浙兵 · Bao Er at the bridge end (hunz ph 2): the White Poles in the river; he can swim. No source: the game's own.
CHD.z2bao = {
  build: (C) => { const k = 'bao', n = ['鮑二', 'Bao Er']; return { id: 'z2bao', urgent: true, timer: 12, def: 1, title: 'The water', ltitle: 'Bao Er at the bridge: the men in the river', kick: '抉擇 · NOW', who: [n[0] + ' ' + n[1]],
    lines: [chL('隊長！白杆兵掉水裡了——我會水！讓我下去！', 'Chief! White Poles in the water — I can swim! Let me go in!')],
    opts: [{ q: 'Go. Bring who you can.', led: 'Sent Bao Er into the Hun River for the drowning White Poles.', a: [chL('去！能拉幾個拉幾個！', 'Go! Pull out who you can!')], fx: (C) => { chBond(C, 'bao', 2); chRep(C, 'care', 1); C.S.flags.baoSwam = 1; } },
      { q: 'No. You stay in the file.', led: 'Kept Bao Er in the file while the White Poles drowned.', a: [chL('不行。你是我的槍。站住。', 'No. You are my spear. Stay.')], fx: (C) => { chBond(C, 'bao', -1); chRep(C, 'disc', 1); C.S.flags.baoKept = 1; } }] }; },
  end: (C, o) => o === 0 ? (C.S.alive.bao ? 'Bao Er went into the river at the bridge and came out with two White Poles. He never got warm again that winter.' : 'Bao Er went into the river for the White Poles and did not come out.') : 'Bao Er stayed in the file. He did not look at the river again.',
  murmur: (C, o) => o === 0 && C.S.alive.bao ? ['bao', '水比寧波的冷。可我拉上來兩個。', 'Colder than Ningbo. But I pulled two out.'] : o === 1 && C.S.alive.bao ? ['bao', '……我會水的。', '...I could have swum.'] : null,
  talk: (C, k, o) => k === 'bao' ? (o === 0 ? { q: 'The river.', bond: 1, a: [chL('白杆兵不會水。石柱是山裡。我拉了一個，他抓著我的辮子不放。', 'White Poles can\'t swim. Shizhu is mountains. I got one, and he held my queue and wouldn\'t let go.'), chL('……他活了。', '...He lived.')] } : { q: 'About the river...', a: [chL('你說我是你的槍。槍不會水。', 'You said I was your spear. Spears don\'t swim.'), chL('（他沒再說下去。）', '(He does not go on.)')] }) : null,
};
CHBT.hunz = (CHBT.hunz || []).concat([{ ph: 1, t: 34, id: 'z2bao', cid: 0, k: () => { const sim = state.sim; const q = sim.squads[ZB.sq]; const u = s2Man('bao'); return u ? q.unitIds.indexOf(u.id) : 0; }, when: () => !!s2Man('bao') && chGot(chCtx(), 'z2bao') < 0 }]);
// ---------- camp: who stands at your left (浙兵 camp2, the night before the Hun River) ----------
// 紀效新書·卷二: the two shields stand at the head of the team, left and right; the drill lets the chief place his men. The
// pick moves the man into the shield slot beside you for the battle (ZB.map order) and is remembered in talk.
function s2LeftPick() {
  const C = s2Ctx(); if (!C || C.c !== 'zhe' || !ZC || ZC.night !== 2 || chGot(C, 'z2left') >= 0) return false;
  const cands = ['lou', 'xiaoman', 'he', 'wang', 'luo', 'liu6'].filter(k => C.S.alive[k] && k !== C.S.me).slice(0, 4); if (cands.length < 2) return false;
  const spec = { id: 'z2left', title: '左 · Who stands at your left', ltitle: 'Who stood at your left on the Hun River', year: 'The night before the Hun River, 1621', who: ['何老虎 He Laohu', 'squatting by the shield rack'],
    lines: [chL('隊長的左邊是另一面藤牌。你倒了，他擋；他倒了，你擋。', 'At the chief\'s left stands the other shield. You fall, he covers; he falls, you cover.'), chL('明天誰站你左邊？你來定。', 'Who stands at your left tomorrow? Your call.')],
    opts: cands.map(k => { const r = zRow(k); const why = { lou: chL('樓阿根：「我站。我弟弟在後面。」', 'Lou Agen: "I\'ll stand. My brother is behind me."'), xiaoman: chL('樓小滿：「我！我哥說我學得快。」', 'Lou Xiaoman: "Me! My brother says I learn fast."'), he: chL('何老虎：「老骨頭了。可牌還拿得穩。」', 'He Laohu: "Old bones. But the shield still sits steady."'), wang: chL('王大牛：「我說過，左邊沒人過得去。」', 'Wang Daniu: "I said it. Nobody gets past on the left."'), luo: chL('駱鐵頭：「骰子說是我。」', 'Luo Tietou: "The dice say me."'), liu6: chL('陳小六：「我扛筅扛慣了……可我願意。」', 'Chen Xiaoliu: "I\'m used to the brush... but I\'ll do it."') }[k];
      return { q: `${r.en} stands at my left`, led: `${r.en} stood at your left on the Hun River.`, a: [why, chL('何老虎點點頭。「那就他。」', 'He Laohu nods. "Him, then."')], fx: (C) => { C.S.flags.left = k; chBond(C, k, 1); } }; }) };
  chDecide(spec, () => { s2Save(); requestLock(); }); return true;
}
// the battle: the chosen man takes the shield place beside you (slot 1 of the team), whatever his trade
{ const _st = zStart2; zStart2 = function (scene) { const r = _st(scene); try { if (scene === 'battle2' && ZS && ZS.flags && ZS.flags.left && ZB && state.sim) { const sim = state.sim, q = sim.squads[ZB.sq]; const k = ZS.flags.left; const me = localHero();
      const want = q.unitIds[1] === (me && me.id) ? q.unitIds[2] : q.unitIds[1]; let have = -1; for (const uid in ZB.map) if (ZR[ZB.map[uid]] && ZR[ZB.map[uid]].k === k) have = +uid;
      if (have >= 0 && have !== want && ZB.map[want] !== undefined) { const t = ZB.map[want]; ZB.map[want] = ZB.map[have]; ZB.map[have] = t; zDress(sim.units[want], ZB.map[want]); zDress(sim.units[have], ZB.map[have]); }
      const u = sim.units[want]; if (u) setTimeout(() => SPEECH.say(u.id, '我在你左邊。', 'I\'m at your left.', { prio: 3, dur: 3 }), 4000); } } catch (e) { console.warn('story2 left', e); } return r; }; }
CHD.z2left = { build: () => null, end: (C, o) => { const k = C.S.flags.left; return k ? `${zRow(k).en} stood at your left on the Hun River${C.S.alive[k] ? '.' : ', and died there.'}` : ''; },
  talk: (C, k) => k === C.S.flags.left && C.S.alive[k] ? { q: 'You were at my left.', bond: 1, a: [chL('左邊。我沒讓人過去。', 'Your left. Nobody got past.'), chL('下回還是我。', 'Next time it\'s me again.')] } : null,
  murmur: (C) => { const k = C.S.flags.left; return k && !C.S.alive[k] && C.S.fate2 && C.S.fate2[k] ? ['he', `${zRow(k).zh}站你左邊的。`, `${zRow(k).en} stood at your left.`] : null; } };
// ---------- camp: naming the dead (浙兵 camp3, the night after the Hun River) ----------
// E at an empty bedroll says the man's name aloud; the file answers; when every name is said the cook fills a bowl for each.
// 練兵實紀·卷九 (陣亡者… 祭之); the words are the game's own.
function s2NameDead() {
  const C = s2Ctx(); if (!C || C.c !== 'zhe' || !ZC || ZC.night !== 3) return false; const sim = state.sim, h = localHero(); if (!sim || !h) return false;
  const beds = (sim.cfg.camp && sim.cfg.camp.bedrolls) || []; const rows = [{ k: 'me' }].concat(zFile2()); let bi = -1;
  for (let i = 0; i < beds.length; i++) { const b = beds[i]; if (!b[3]) continue; const dx = b[0] - h.x, dz = b[1] - h.z, d = Math.hypot(dx, dz); if (d < 2.2 && (dx * Math.sin(Input.yaw) + dz * Math.cos(Input.yaw)) / Math.max(d, 0.01) > 0.3) { bi = i; break; } }
  if (bi < 0) return false; const r = rows[bi]; if (!r || r.k === 'me') return false; const named = C.S.flags.named || (C.S.flags.named = {}); if (named[r.k]) { toast(`${r.en}. You have said his name.`); return true; }
  named[r.k] = 1; C.save(); const zh = r.zh, en = r.en;
  SPEECH.say(h.id, `${zh}。`, `${en}.`, { prio: 3, dur: 3, who: `${C.S.name.zh} · you` });
  const near = sim.units.filter(u => u.camp && Math.hypot(u.x - h.x, u.z - h.z) < 16).slice(0, 3);
  near.forEach((u, i) => setTimeout(() => SPEECH.say(u.id, i === 0 ? `${zh}。` : i === 1 ? '在。' : '……在。', i === 0 ? `${en}.` : 'Here.', { prio: 2, dur: 2.5 }), 1200 + i * 900));
  const dead = zrDead2(); const all = dead.every(d => named[d.k]);
  if (all && dead.length) { C.S.flags.namedAll = 1; C.save(); const cook = (typeof chCampUnit === 'function' && chCampUnit('zhu')) || near[0]; if (cook) setTimeout(() => SPEECH.say(cook.id, `${dead.length}個名字。${dead.length}碗。都盛了。`, `${dead.length} names. ${dead.length} bowls. All filled.`, { prio: 3, dur: 5 }), 4500); setTimeout(() => toast('Every name said. The cook fills a bowl for each empty place'), 4600); }
  return true;
}
function s2NearDeadRoll() { const C = s2Ctx(); if (!C || C.c !== 'zhe' || !ZC || ZC.night !== 3) return null; const sim = state.sim, h = localHero(); if (!sim || !h) return null;
  const beds = (sim.cfg.camp && sim.cfg.camp.bedrolls) || []; const rows = [{ k: 'me' }].concat(zFile2());
  for (let i = 0; i < beds.length; i++) { const b = beds[i]; if (!b[3] || !rows[i] || rows[i].k === 'me') continue; const dx = b[0] - h.x, dz = b[1] - h.z, d = Math.hypot(dx, dz); if (d < 2.2 && (dx * Math.sin(Input.yaw) + dz * Math.cos(Input.yaw)) / Math.max(d, 0.01) > 0.3) return rows[i]; } return null; }
// ---------- 八旗 · the whip for the man who moved before the conch (c2 camp, after Abdali) ----------
// 滿文老檔 天命四年: men who broke ranks before the signal were flogged; the scene uses the counted-blows beat of deeds.js.
function s2JinWhip() {
  const C = s2Ctx(); if (!C || C.c !== 'jin' || !ZC || ZC.night !== 2 || !C.S.flags.movedEarly || C.S.flags.whippedEarly) return false;
  C.S.flags.whippedEarly = 1; C.save();
  const spec = { id: 'j1early', title: '海螺 · The conch', ltitle: 'Moved before the conch at Abdali', year: 'Inside Shenyang, 1621', who: ['托博輝 Tobohui', 'captain of the niru'],
    lines: [chL('阿布達里岡那天，海螺還沒響，你的腳就動了。我看見了。', 'That day at Abdali your feet moved before the conch. I saw.'), chL('兩年了。汗的法沒有變：先動的，鞭。', 'Two years. The Khan\'s law has not changed: who moves first is whipped.'), chL('（他把鞭子遞給穆克譚。）', '(He hands the whip to Muktan.)')],
    opts: [{ q: 'I moved. Give me the whip.', led: 'Took the whip for moving before the conch at Abdali.', a: [chL('（穆克譚：「對不住。」）', '(Muktan: "Forgive me.")')], fx: (C) => { chBond(C, 'tobohui', 1); chRep(C, 'disc', 1); return { beat: 15 }; } },
      { q: 'Ulgen moved first. I followed him.', led: 'Said Ulgen moved first, to escape the whip.', a: [chL('托博輝：烏勒根死了。死人不挨鞭子。你挨。', 'Tobohui: Ulgen is dead. The dead are not whipped. You are.'), chL('（二十下。穆克譚沒有再說對不住。）', '(Twenty. Muktan does not say forgive me this time.)')], fx: (C) => { chBond(C, 'tobohui', -2); chBond(C, 'muktan', -1); return { beat: 20 }; } }] };
  chDecide(spec, () => requestLock()); return true;
}
CHD.j1early = { build: () => null, end: (C, o) => o === 0 ? 'You moved before the conch at Abdali and took fifteen strokes for it inside Shenyang.' : 'You blamed a dead man for your feet. Twenty strokes, and Muktan wrote both things down.' };
// ---------- the E key and the camp hooks ----------
{ const _k = zheKeyE; zheKeyE = function () {
    if (ZC && state.sim && state.sim.mission && state.sim.mission.camp && !state.zheDlg) { try { if (s2NameDead()) return true; } catch (e) { console.warn('story2', e); } }
    return _k(); }; }
{ const _h = zheHUD; zheHUD = function (dt) { const r = _h(dt); try { s2CampTick(dt); } catch (e) { console.warn('story2', e); } return r; }; }
function s2CampTick(dt) {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.camp || !ZC || state.zheDlg) return;
  const key = (ZC.jin ? 'j' : ZS && ZS.sj ? 's' : 'z') + ZC.night; if (S2.campKey !== ZC) { S2.campKey = ZC; S2.campT = 3; }
  if (S2.campT > 0) { S2.campT -= dt; if (S2.campT <= 0 && !($('zheCard') && !$('zheCard').hidden)) { if (ZC.jin) s2JinWhip(); } }
  const t = s2NearDeadRoll(); if (t) { const pr = $('zhePrompt'); if (pr) { pr.hidden = false; const C = s2Ctx(); const named = C && C.S.flags.named && C.S.flags.named[t.k]; pr.innerHTML = `<kbd>E</kbd>${named ? `${t.zh} ${t.en}` : `Say his name · ${t.zh} ${t.en}`}`; } }
}
// the shield rack in camp2 (浙兵): E beside He Laohu opens the pick, before his usual talk, once
{ const _d = zDialog; zDialog = function (k, u) { try { if (k === 'he' && s2LeftPick()) return; } catch (e) { console.warn('story2', e); } return _d(k, u); }; }
// ---------- the events, wired ----------
{ const _e = zheEvent; zheEvent = function (ev) { try { s2Event(ev); } catch (e) { console.warn('story2', e); } return _e(ev); }; }
window.__s2 = { S2, event: s2Event, goal: s2Goal, left: s2LeftPick, name: s2NameDead, whip: s2JinWhip };
