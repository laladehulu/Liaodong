// ===== 小兵之路 · Path of a Soldier =====
// In battle: one man in the ranks. Drill calls by drum and gong, named comrades, falling and returning with the next wave.
// Between battles: an overworld career on the Liaodong frontier, 1619–1644.

// ---------- names
const SURN = [['王', 'Wang'], ['李', 'Li'], ['張', 'Zhang'], ['劉', 'Liu'], ['陳', 'Chen'], ['楊', 'Yang'], ['趙', 'Zhao'], ['黃', 'Huang'], ['周', 'Zhou'], ['吳', 'Wu'], ['徐', 'Xu'], ['孫', 'Sun'], ['胡', 'Hu'], ['朱', 'Zhu'], ['高', 'Gao'], ['林', 'Lin'], ['何', 'He'], ['郭', 'Guo'], ['馬', 'Ma'], ['羅', 'Luo'], ['戚', 'Qi'], ['秦', 'Qin']];
const GIVN = [['大牛', 'Daniu'], ['二狗', 'Ergou'], ['三寶', 'Sanbao'], ['鐵柱', 'Tiezhu'], ['石頭', 'Shitou'], ['小六', 'Xiaoliu'], ['阿福', 'Afu'], ['長生', 'Changsheng'], ['有才', 'Youcai'], ['來旺', 'Laiwang'], ['春生', 'Chunsheng'], ['老七', 'Laoqi'], ['順子', 'Shunzi'], ['黑子', 'Heizi'], ['狗剩', 'Gousheng'], ['金寶', 'Jinbao'], ['根生', 'Gensheng'], ['滿倉', 'Mancang'], ['秋生', 'Qiusheng'], ['大勇', 'Dayong'], ['守義', 'Shouyi'], ['得勝', 'Desheng']];
function mkName(h) { h = (h * 2654435761) >>> 0; const a = SURN[h % SURN.length], b = GIVN[(h >>> 8) % GIVN.length]; return { zh: a[0] + b[0], en: a[1] + ' ' + b[1] }; }

// ---------- quick battle / co-op post picker
const ROLE_INFO = [
  ['musket', '鳥銃手', 'Musketeer', 'Niaochong matchlock. One lethal ball, then a long reload.'],
  ['spear', '長槍手', 'Spearman', 'A long qiang in a dense file. Hold the line, keep them at the tip.'],
  ['shield', '藤牌手', 'Shield & dao', 'Rattan shield and broad dao. Turn arrows and close in.'],
  ['duck', '鴛鴦陣', 'Mandarin Duck team', 'One of Qi Jiguang\'s twelve: shields, wolf-brushes, long spears.'],
  ['sanyan', '三眼銃', 'Three-eyed gunner', 'Three barrels, fired one after another, then swung as a club.'],
  ['skirm', '神機營', 'Skirmisher', 'Shenji marksman in loose order.'],
  ['cavalry', '關寧鐵騎', 'Iron cavalry', 'Armored horseman of Guanning.'],
];
const ROLE_INFO_JIN = [['musket', '漢軍銃手', 'Han Banner musketeer', 'Captured Ming muskets, fast-loading.'], ['archer', '弓手', 'Manchu archer', 'Heavy arrows from a horn bow.'], ['shield', '甲兵', 'Armored Bannerman', 'Studded armor coat, heavy blade.'], ['guard', '巴牙喇', 'Bayara guard', 'The Khan\'s elite guard.'], ['mongol', '科爾沁', 'Khorchin Mongol', 'Quick and fearless.'], ['cavalry', '鐵騎', 'Banner cavalry', 'Armored horse archers turned lancers.']];
function renderRoles() {
  const box = $('roleList'); if (!box) return; const list = state.faction === 1 ? ROLE_INFO_JIN : ROLE_INFO; if (!list.some(r => r[0] === state.role)) state.role = list[0][0];
  box.innerHTML = list.map(r => `<button type="button" class="chap${r[0] === state.role ? ' on' : ''}" data-r="${r[0]}"><b>${r[1]} · ${r[2]}</b><small>${r[3]}</small></button>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => { state.role = b.dataset.r; AUDIO.init(); AUDIO.play('ui'); renderRoles(); });
  $('officerIn').checked = state.officer; $('officerIn').onchange = () => { state.officer = $('officerIn').checked; };
}

// ---------- in battle
let SOLD = null;
function soldierStart(msg) {
  const sim = state.sim, me = sim.players[state.localIdx]; const cb = state.careerBattle;
  SOLD = { lastOrder: -1, cueT: 0, aimN: 0, near: false, routed: false, shots: [], lastFire: -999, map: {}, lost: 0, startSq: me.soldierSq, falls: 0, plate: null };
  const sq = sim.squads[me.soldierSq]; const comr = cb ? cb.comrades : [];
  let k = 0; for (const id of sq.unitIds) { if (id === me.heroId) continue; if (k < comr.length) SOLD.map[id] = { name: comr[k].name, ci: k }; k++; }
  const role = sim.units[me.heroId] ? sim.units[me.heroId].def.name : 'soldier';
  const lead = me.squads.length ? `You command ${me.squads.length} squad${me.squads.length > 1 ? 's' : ''}. Press O for the command view; your orders travel by drum, gong and runner.` : 'Stay with your file. Your section chief calls the drill: the drum means advance, the gong means halt.';
  const t = cb ? cb.title : `${sim.bdef.jp} · ${sim.bdef.name}`;
  setTimeout(() => storyCard(`${cb ? cb.intro + ' ' : ''}You march with the ${role}. ${lead} Every ball kills. Reloading takes long seconds, so make each shot count. If you fall, you return with the next wave.`, t), 500);
}
function nameOf(id) { return (SOLD && SOLD.map[id] && SOLD.map[id].name) || mkName(id * 7 + 13); }
function cue(zh, en, snd) {
  const d = $('drill'); d.innerHTML = `${zh}<small>${en}</small>`; d.style.opacity = 1; SOLD.cueT = 2.8;
  if (snd === 'drum') AUDIO.play('drum', undefined, 0, 0, 0.9); else if (snd === 'gong') AUDIO.play('gong', undefined, 0, 0, 0.9); else if (snd === 'kiai') { const h = localHero(); if (h) AUDIO.play('kiai', h.x, h.y, h.z, 1.2); }
}
function soldierEvent(ev) {
  if (!SOLD) return; const sim = state.sim, me = sim.players[state.localIdx];
  if (ev.t === 'death') { const u = sim.units[ev.id]; if (!u || u.type === 'horse') return;
    if (ev.id === me.heroId) { SOLD.falls++; feed(SOLD.falls === 1 ? 'You are struck down.' : 'Down again.', true); return; }
    if (u.squad === me.soldierSq && u.team === me.team) { SOLD.lost++; const n = nameOf(ev.id); const how = ev.cause === 'melee' ? 'is cut down' : ev.cause === 'arrow' ? 'takes an arrow' : ev.cause === 'explosion' ? 'is torn apart by shot' : 'takes a ball and falls'; feed(`${n.zh} ${n.en} ${how}`, !!SOLD.map[ev.id]); }
    if (ev.killer === me.heroId && u.team !== me.team) { const n = mkName(ev.id * 3 + 1); if (Math.random() < 0.3) feed(`Your shot drops a ${u.def.name.toLowerCase()}`, true); } }
  else if (ev.t === 'possess' && ev.p === state.localIdx) { SOLD.lastOrder = -1; if (SOLD.falls) { toast('Forward with the reserve — back in the ranks'); const h = sim.units[ev.id]; if (h) { Input.yaw = h.yaw; Input.pitch = 0; } } }
  else if (ev.t === 'captain' && ev.sq === me.soldierSq) cue('隊總陣亡!', 'The section chief is down!', null);
  else if (ev.t === 'shot') { const u = sim.units[ev.shooter]; if (u && u.squad === me.soldierSq && ev.shooter !== me.heroId) { SOLD.shots.push(sim.tick); while (SOLD.shots.length && SOLD.shots[0] < sim.tick - 12) SOLD.shots.shift(); if (SOLD.shots.length >= 3 && sim.tick - SOLD.lastFire > 150) { SOLD.lastFire = sim.tick; cue('放!', 'Fire!', null); } } }
}
function soldierHUD(dt) {
  if (!SOLD) return; const sim = state.sim, me = sim.players[state.localIdx], h = sim.units[me.heroId];
  const dead = !h || h.dead; $('fallen').hidden = !dead || state.ended || sim.phase !== 1 || !!state.dying;
  if (dead && me.respawnAt) $('fallenT').textContent = `Next wave in ${Math.max(0, Math.ceil((me.respawnAt - sim.tick) / 30))} s`;
  if (SOLD.cueT > 0) { SOLD.cueT -= dt; $('drill').style.opacity = Math.min(1, SOLD.cueT * 1.5); }
  $('suppress').style.opacity = Math.min(0.85, (state.renderer.suppress || 0) * 0.9);
  const sq = sim.squads[me.soldierSq]; if (!sq || dead || sim.phase !== 1) return;
  if (sq.order !== SOLD.lastOrder) {
    if (SOLD.lastOrder !== -1) { if (sq.order === S.ORD_MOVE) cue('擂鼓 · 進', 'The drum: advance', 'drum'); else if (sq.order === S.ORD_CHARGE) cue('殺!', 'Charge!', 'kiai'); else if (sq.order === S.ORD_HOLD) cue('鳴金 · 止', 'The gong: halt and dress the line', 'gong'); else if (sq.order === S.ORD_FOLLOW) cue('隨我來!', 'Follow me!', 'drum'); }
    SOLD.lastOrder = sq.order; }
  if (sq.def.ai === 'ranged') { let aim = 0; for (const id of sq.unitIds) { const u = sim.units[id]; if (!u.dead && u.st === S.ST_AIM && id !== h.id) aim++; } if (aim >= 3 && SOLD.aimN < 3 && SOLD.cueT <= 0.3) cue(sq.def.bow ? '開弓!' : '舉銃 · 瞄!', sq.def.bow ? 'Draw!' : 'Present — take aim!', null); SOLD.aimN = aim; }
  if (!SOLD.near) { for (const e of sim.teamAlive[1 - sq.team]) { if (Math.abs(e.x - sq.cx) + Math.abs(e.z - sq.cz) < 30) { SOLD.near = true; cue(sq.def.ai === 'ranged' ? '裝藥 · 快!' : '列陣 · 槍向前', sq.def.ai === 'ranged' ? 'Load — quickly now!' : 'Close ranks — points forward!', 'drum'); break; } } }
  if (sq.routing && !SOLD.routed) { SOLD.routed = true; cue('退! 退!', 'The line breaks — fall back!', null); } if (!sq.routing) SOLD.routed = false;
  // the comrade you are looking at
  let best = null, bd = 0.1; const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
  for (const id of sq.unitIds) { if (id === h.id) continue; const u = sim.units[id]; if (u.dead) continue; const dx = u.x - h.x, dz = u.z - h.z, d = Math.hypot(dx, dz); if (d > 16 || d < 0.5) continue; const off = 1 - (dx * fx + dz * fz) / d; if (off < bd) { bd = off; best = u; } }
  let pl = SOLD.plate; if (!pl) { pl = SOLD.plate = document.createElement('div'); pl.style.cssText = 'position:fixed;left:50%;top:56%;transform:translateX(-50%);font:600 13px sans-serif;color:#efe6d0;text-shadow:0 1px 3px #000;pointer-events:none;z-index:20;text-align:center'; document.body.appendChild(pl); }
  if (best && !Input.cmdMode) { const n = nameOf(best.id); const hp = best.hp / best.def.hp; pl.innerHTML = `${n.zh} <span style="opacity:.75">${n.en}</span>${SOLD.map[best.id] ? ' · <span style="color:#e0a84a">comrade</span>' : ''}<br><small style="opacity:.7">${best.def.name}${hp < 0.6 ? ' · wounded' : ''}</small>`; pl.hidden = false; } else pl.hidden = true;
}
function soldierFinish(winner) {
  if (!SOLD) return; const sim = state.sim, me = sim.players[state.localIdx], h = sim.units[me.heroId]; if (SOLD.plate) SOLD.plate.hidden = true; $('fallen').hidden = true;
  const res = { won: winner === me.team, kills: me.kills | 0, survived: !!(h && !h.dead), falls: SOLD.falls, comrades: {}, lost: SOLD.lost };
  for (const id in SOLD.map) res.comrades[SOLD.map[id].ci] = !sim.units[id].dead;
  $('resultText').textContent = `${res.won ? 'The field is ours.' : 'The day is lost.'} You killed ${res.kills}. You fell ${res.falls} time${res.falls === 1 ? '' : 's'}. Your squad lost ${res.lost} men.`;
  if (state.careerBattle) CAREER.report(res);
}

// ---------- the career
const CAREER = (() => {
  const KEY = 'mingSoldier';
  const RANKS = [['小兵', 'Recruit', 0, 0], ['老兵', 'Veteran', 40, 0], ['伍長', 'Leader of five (伍長)', 100, 1], ['隊總', 'Section chief (隊總)', 190, 1], ['哨官', 'Company officer (哨官)', 320, 2], ['把總', 'Captain (把總)', 500, 3], ['千總', 'Commander of a thousand (千總)', 740, 5], ['守備', 'Garrison commander (守備)', 1040, 7], ['遊擊', 'Mobile general (遊擊將軍)', 1400, 9], ['參將', 'Deputy general (參將)', 1850, 12], ['總兵', 'Regional commander (總兵)', 2400, 12]];
  const N = {
    shg: { zh: '山海關', en: 'Shanhai Pass', x: 8, y: 86, k: 'hq', map: 'bonari', d: 'The First Pass Under Heaven. Paymasters of the Ministry of War, a crowded market, and the road out to Liaodong.' },
    qt: { zh: '前屯', en: 'Qiantun', x: 20, y: 75, k: 'village', map: 'field', d: 'A walled farming village behind the coast road. Quiet, and cheap to rest in.' },
    ny: { zh: '寧遠', en: 'Ningyuan', x: 32, y: 65, k: 'fort', map: 'hakodate', d: 'A coastal fort on the Bohai. Its walls look out over frozen fields toward Jinzhou.' },
    ts: { zh: '塔山', en: 'Tashan', x: 40, y: 57, k: 'village', map: 'field', d: 'A hill village under an old pagoda. Jin scouts are often seen on the ridge.' },
    jz: { zh: '錦州', en: 'Jinzhou', x: 48, y: 49, k: 'town', map: 'ueno', d: 'A garrison town with a busy market and the temple compound of Songshan to the south.' },
    dlh: { zh: '大淩河', en: 'Dalinghe', x: 56, y: 41, k: 'fort', map: 'toba', d: 'A river fort on the Daling, the Ming\'s farthest foothold beyond Jinzhou.' },
    gn: { zh: '廣寧', en: 'Guangning', x: 61, y: 29, k: 'town', map: 'field', d: 'The headquarters west of the Liao River. Grain, horses and gossip.' },
    ly: { zh: '遼陽', en: 'Liaoyang', x: 74, y: 41, k: 'town', map: 'aizu', d: 'The old Liaodong capital: a stone-walled city of markets and yamen offices.' },
    sy: { zh: '瀋陽', en: 'Shenyang', x: 81, y: 30, k: 'fort', map: 'toba', d: 'The great fortress on the Hun River, where armies muster for campaigns to the east.' },
    tl: { zh: '鐵嶺', en: 'Tieling', x: 79, y: 15, k: 'fort', map: 'field', d: 'A northern fortress guarding the road to the Mongol steppe.' },
    fs: { zh: '撫順', en: 'Fushun', x: 90, y: 28, k: 'town', map: 'field', d: 'The border market town. It fell to Nurhaci in 1618.' },
    sh: { zh: '薩爾滸', en: 'Sarhu', x: 93, y: 17, k: 'field', map: 'field', d: 'A hill above the Hun River gorge. Jin camps fill the valley.' },
    ht: { zh: '赫圖阿拉', en: 'Hetu Ala', x: 97, y: 6, k: 'capital', map: 'field', d: 'Nurhaci\'s capital in the mountains. No Ming army has ever reached it.' },
  };
  const E = [['shg', 'qt'], ['qt', 'ny'], ['ny', 'ts'], ['ts', 'jz'], ['jz', 'dlh'], ['dlh', 'gn'], ['gn', 'ly'], ['ly', 'sy'], ['sy', 'fs'], ['fs', 'sh'], ['sh', 'ht'], ['sy', 'tl'], ['tl', 'sh']];
  const D0 = Date.UTC(1619, 2, 1);
  const dayOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - D0) / 864e5);
  // the war, as it happened (unless you change it)
  const HIST = [
    { id: 'sarhu', at: dayOf(1619, 4, 14), node: 'sy', field: 'sh', take: [], fall: [], map: 'field', att: true, title: '薩爾滸之戰 · Sarhu, April 1619', intro: 'Four Ming columns march on Hetu Ala. Yours, under Du Song, pushes ahead across the Hun River in the snow.', hist: 'At Sarhu the Ming columns were destroyed one by one. Du Song fell with most of his army.', cmds: [3, 4], size: [1500, 1700] },
    { id: 'tieling', at: dayOf(1619, 8, 25), node: 'tl', fall: ['tl'], map: 'field', title: '鐵嶺 · Tieling, August 1619', intro: 'Jin banners circle Tieling. The garrison and the Mongol allies stand on the walls.', hist: 'Tieling fell to the Jin in August 1619.', cmds: [2, 3], size: [1300, 1600] },
    { id: 'shenyang', at: dayOf(1621, 5, 4), node: 'sy', fall: ['sy'], map: 'toba', title: '渾河之戰 · Hun River, May 1621', intro: 'Shenyang has fallen to treachery inside the walls. Sichuan White Poles and Zhejiang troops make a stand on the frozen Hun River.', hist: 'Shenyang fell; on the Hun River the Sichuan and Zhejiang troops fought to the last man.', cmds: [3, 4], size: [1500, 1800] },
    { id: 'liaoyang', at: dayOf(1621, 5, 10), node: 'ly', fall: ['ly'], map: 'aizu', title: '遼陽 · Liaoyang, May 1621', intro: 'The Jin storm Liaoyang. Defend the gate tower and the streets behind it.', hist: 'Liaoyang fell in May 1621; Xiong Tingbi\'s line collapsed back to the Liao River.', cmds: [3, 4], size: [1500, 1700] },
    { id: 'guangning', at: dayOf(1622, 3, 1), node: 'gn', fall: ['gn', 'dlh'], map: 'field', title: '平陽橋 · Pingyang Bridge, March 1622', intro: 'Wang Huazhen\'s army meets the Jin at Pingyang Bridge before Guangning.', hist: 'Guangning was lost and the Ming fell back to Shanhai Pass.', cmds: [3, 4], size: [1500, 1700] },
    { id: 'retake', at: dayOf(1624, 6, 1), node: 'dlh', take: ['dlh'], peace: true, title: 'Sun Chengzong\'s forts', hist: 'Sun Chengzong and Yuan Chonghuan rebuilt the line of forts from Ningyuan to Dalinghe.' },
    { id: 'ningyuan', at: dayOf(1626, 2, 10), node: 'ny', fall: [], map: 'hakodate', title: '寧遠之戰 · Ningyuan, February 1626', intro: 'Nurhaci himself leads the banners against Ningyuan. The Hongyipao guns are loaded on the walls.', hist: 'Ningyuan held. Nurhaci was wounded by cannon fire and died that summer.', cmds: [3, 4], size: [1600, 1700], hold: true },
    { id: 'ningjin', at: dayOf(1627, 6, 1), node: 'jz', fall: [], map: 'ueno', title: '寧錦之戰 · Ning-Jin, June 1627', intro: 'Hong Taiji attacks Jinzhou and Ningyuan. Hold the temple compound outside Jinzhou.', hist: 'Ningyuan and Jinzhou both held against Hong Taiji.', cmds: [3, 4], size: [1600, 1700], hold: true },
    { id: 'dalinghe', at: dayOf(1631, 9, 1), node: 'dlh', fall: ['dlh'], map: 'toba', title: '大淩河 · Dalinghe, autumn 1631', intro: 'The Jin dig siege lines around the half-built fort. A relief army must break through.', hist: 'Starving after months of siege, Zu Dashou surrendered Dalinghe.', cmds: [3, 4], size: [1500, 1800] },
    { id: 'songjin', at: dayOf(1641, 8, 15), node: 'jz', fall: ['jz', 'ts'], map: 'ueno', title: '松錦之戰 · Song-Jin, August 1641', intro: 'Hong Chengchou\'s 130,000 men march to relieve Jinzhou. The Qing cut the supply road behind Songshan.', hist: 'The Ming relief army was destroyed at Songshan; Jinzhou fell the next spring.', cmds: [4, 4], size: [1600, 1800] },
    { id: 'shanhai', at: dayOf(1644, 5, 27), node: 'shg', fall: ['shg', 'qt', 'ny'], map: 'bonari', final: true, title: '山海關 · Shanhai Pass, May 1644', intro: 'Beijing has fallen to Li Zicheng. Wu Sangui opens the pass. History asks which side you stand on.', hist: 'Wu Sangui opened the Pass to the Qing. The Ming dynasty was over.', cmds: [3, 4], size: [1600, 1800] },
  ];
  let st = null, sel = null, rng = Math.random;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const CN = '〇一二三四五六七八九';
  const cnum = (n) => n <= 10 ? (n === 10 ? '十' : CN[n]) : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  function dateStr(day) { const d = new Date(D0 + day * 864e5); const y = d.getUTCFullYear(); const era = y < 1621 ? ['萬曆', y - 1572] : y < 1628 ? ['天啟', y - 1620] : ['崇禎', y - 1627]; const season = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'][d.getUTCMonth()];
    return `${season}, ${d.toLocaleString('en', { month: 'long', timeZone: 'UTC' })} ${d.getUTCDate()}, ${y} · ${era[0]}${era[1] === 1 ? '元' : cnum(era[1])}年`; }
  const rank = () => RANKS[st.rank];
  const adj = (a) => E.filter(e => e[0] === a || e[1] === a).map(e => e[0] === a ? e[1] : e[0]);
  const log = (t) => { st.log.unshift(`<b>${dateStr(st.day).split(' · ')[0]}</b> ${t}`); st.log = st.log.slice(0, 60); };
  function fresh(name) {
    const owner = {}; for (const k in N) owner[k] = ['fs', 'sh', 'ht'].includes(k) ? 1 : 0;
    const s = { v: 1, name: name || mkName(Date.now() & 0xffff).zh, rank: 0, merit: 0, silver: 18, hp: 100, skills: { gun: 0, blade: 0, drill: 0 }, role: 'musket', kit: { armor: 0, gun: 0, blade: 0, horse: 0 }, node: 'shg', day: 0, owner, done: {}, comrades: [], fallen: [], log: [], battles: 0, kills: 0, payDay: 0, alive: true, ironman: false, owned: ['dao'], load: { melee: '', ranged: '', shield: false } };
    for (let i = 0; i < 4; i++) s.comrades.push({ name: mkName((Date.now() + i * 977) & 0xfffff), b: 0 });
    return s;
  }
  // ---------- drawing the map
  function draw() {
    const c = $('cMap'), g = c.getContext('2d'), W = c.width, H = c.height; const P = (n) => [n.x / 100 * (W - 60) + 30, n.y / 100 * (H - 50) + 25];
    g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, W, H);
    // paper grain
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,95,60,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    // the Bohai Sea
    g.fillStyle = '#b9c9c0'; g.beginPath(); g.moveTo(0, H * 0.78); g.bezierCurveTo(W * 0.18, H * 0.86, W * 0.3, H * 0.74, W * 0.42, H * 0.7); g.bezierCurveTo(W * 0.5, H * 0.66, W * 0.58, H * 0.72, W * 0.66, H * 0.8); g.lineTo(W * 0.7, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = 'rgba(70,95,90,.5)'; for (let k = 0; k < 6; k++) { g.beginPath(); for (let x = 10; x < W * 0.6; x += 18) { const y = H * (0.86 + k * 0.022) + Math.sin(x * 0.05 + k) * 3; if (x === 10) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.font = 'italic 15px serif'; g.fillStyle = 'rgba(50,75,70,.7)'; g.fillText('渤海 · Bohai Sea', W * 0.18, H * 0.93);
    // the Liao River
    g.strokeStyle = 'rgba(70,110,120,.75)'; g.lineWidth = 4; g.beginPath(); g.moveTo(W * 0.66, 0); g.bezierCurveTo(W * 0.63, H * 0.25, W * 0.7, H * 0.45, W * 0.64, H * 0.72); g.stroke(); g.lineWidth = 1;
    g.fillStyle = 'rgba(50,75,90,.75)'; g.font = 'italic 13px serif'; g.fillText('遼河', W * 0.655, H * 0.52);
    // mountains
    g.strokeStyle = 'rgba(90,70,45,.55)'; for (let i = 0; i < 26; i++) { const x = W * (0.82 + ((i * 37) % 17) / 100), y = H * (0.02 + ((i * 53) % 40) / 100); g.beginPath(); g.moveTo(x - 10, y + 8); g.lineTo(x, y - 6); g.lineTo(x + 10, y + 8); g.stroke(); }
    for (let i = 0; i < 12; i++) { const x = W * (0.02 + i * 0.03), y = H * (0.6 + (i % 3) * 0.04); g.beginPath(); g.moveTo(x - 9, y + 7); g.lineTo(x, y - 5); g.lineTo(x + 9, y + 7); g.stroke(); }
    // the Great Wall
    g.strokeStyle = 'rgba(120,60,40,.7)'; g.lineWidth = 3; g.setLineDash([6, 3]); g.beginPath(); const s0 = P(N.shg); g.moveTo(s0[0], s0[1]); g.bezierCurveTo(s0[0] - 10, s0[1] - 80, s0[0] + 20, s0[1] - 200, s0[0] - 10, 0); g.stroke(); g.setLineDash([]); g.lineWidth = 1;
    // roads
    for (const [a, b] of E) { const A = P(N[a]), B = P(N[b]); g.strokeStyle = 'rgba(95,70,40,.65)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); }
    g.setLineDash([]); g.lineWidth = 1;
    // campaigns ahead
    const nxt = HIST.find(h => !st.done[h.id] && !h.peace && h.at - st.day <= 25 && h.at >= st.day);
    for (const k in N) {
      const n = N[k], [x, y] = P(n), jin = st.owner[k] === 1;
      if (nxt && nxt.node === k) { g.strokeStyle = 'rgba(200,40,30,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 22 + Math.sin(Date.now() / 250) * 3, 0, 7); g.stroke(); g.lineWidth = 1; }
      const sz = n.k === 'village' || n.k === 'field' ? 9 : 12;
      g.fillStyle = jin ? '#2c3550' : '#b4322a'; g.strokeStyle = '#2a2018';
      if (n.k === 'village' || n.k === 'field') { g.beginPath(); g.arc(x, y, sz, 0, 7); g.fill(); g.stroke(); } else { g.fillRect(x - sz, y - sz, sz * 2, sz * 2); g.strokeRect(x - sz, y - sz, sz * 2, sz * 2); }
      g.fillStyle = '#f3ead6'; g.font = 'bold 12px serif'; g.textAlign = 'center'; g.fillText(jin ? '金' : '明', x, y + 4);
      g.fillStyle = '#2a2018'; g.font = 'bold 15px serif'; g.fillText(n.zh, x, y - sz - 6); g.font = '11px sans-serif'; g.fillStyle = '#5a4c3a'; g.fillText(n.en, x, y + sz + 13);
      if (sel === k) { g.strokeStyle = '#2a2018'; g.lineWidth = 2; g.strokeRect(x - sz - 5, y - sz - 5, sz * 2 + 10, sz * 2 + 10); g.lineWidth = 1; }
    }
    // you
    { const [x, y] = P(N[st.node]); g.fillStyle = '#e0a84a'; g.strokeStyle = '#2a2018'; g.beginPath(); g.moveTo(x + 14, y - 30); g.lineTo(x + 14, y - 10); g.stroke(); g.beginPath(); g.moveTo(x + 14, y - 30); g.lineTo(x + 30, y - 25); g.lineTo(x + 14, y - 20); g.fill(); g.stroke(); }
    g.textAlign = 'left'; g.font = '12px sans-serif'; g.fillStyle = '#5a4c3a'; g.fillText('■ fortress / town   ● village / field   red: Ming   blue: Jin   ringed: a campaign musters', 12, H - 10);
  }
  function nodeAt(ev) { const c = $('cMap'), r = c.getBoundingClientRect(); const mx = (ev.clientX - r.left) / r.width * c.width, my = (ev.clientY - r.top) / r.height * c.height; let best = null, bd = 30; for (const k in N) { const n = N[k], x = n.x / 100 * (c.width - 60) + 30, y = n.y / 100 * (c.height - 50) + 25, d = Math.hypot(mx - x, my - y); if (d < bd) { bd = d; best = k; } } return best; }
  // ---------- the sheet and actions
  function armsOf() { const L = st.load || {}; return L.melee || L.ranged || L.shield ? { melee: L.melee, ranged: L.ranged, shield: !!L.shield } : null; }
  function kit() { const k = st.kit, s = st.skills; return { arms: armsOf(), hp: [1, 1.15, 1.3, 1.45][k.armor] * (st.hp < 60 ? 0.85 : 1), reload: (1 - 0.03 * s.gun) * [1, 0.92, 0.85][k.gun], aim: (1 - 0.04 * s.gun) * [1, 0.85, 0.72][k.gun], melee: (1 + 0.04 * s.blade) * [1, 1.15, 1.3][k.blade] }; }
  function render() {
    const R = rank(), nx = RANKS[st.rank + 1];
    $('cDate').textContent = dateStr(st.day); $('cRank').innerHTML = `<b>${R[0]}</b>${st.name} · ${R[1]}`;
    const n = N[st.node];
    $('cPlace').innerHTML = `<h3>${n.zh} · ${n.en}</h3><p>${n.d}${st.owner[st.node] === 1 ? ' <b>Held by the Jin.</b>' : ''}</p>`;
    const roleName = (ROLE_INFO.find(r => r[0] === st.role) || ROLE_INFO[0]);
    $('cSheet').innerHTML = `<div><h4>Merit ${nx ? `· ${nx[0]} at ${nx[2]}` : ''}</h4><div class="bar"><i style="width:${nx ? Math.min(100, (st.merit - R[2]) / (nx[2] - R[2]) * 100) : 100}%"></i></div></div>
      <div class="kv"><span>Post</span><b>${roleName[1]} · ${roleName[2]}</b><span>Health</span><b>${st.hp} / 100${st.hp < 60 ? ' · wounded' : ''}</b><span>Silver</span><b>${st.silver} taels</b><span>Merit</span><b>${st.merit}</b><span>Battles</span><b>${st.battles} · ${st.kills} enemies slain</b>
      <span>Skills</span><b>Firearms ${st.skills.gun} · Blade & spear ${st.skills.blade} · Drill ${st.skills.drill}</b><span>Kit</span><b>${['Padded coat', 'Lamellar', 'Mountain-pattern armor', 'Iron armor'][st.kit.armor]}, ${['issue musket', 'fine niaochong', 'master niaochong'][st.kit.gun]}, ${['issue dao', 'good dao', 'master-forged dao'][st.kit.blade]}${st.kit.horse ? ', a horse' : ''}</b><span>Carrying</span><b>${(() => { const L = st.load || {}; const nm = (a) => { const D = S.ARMS[a] || S.RANGED[a]; return D ? D.zh + ' ' + D.en : a; }; return [L.melee ? nm(L.melee) : 'issue blade', L.ranged === 'none' ? 'no missile' : L.ranged ? nm(L.ranged) : 'issue missile', L.shield ? 'rattan shield' : ''].filter(Boolean).join(', '); })()}</b></div>
      <div><h4>Your file (${st.comrades.length})</h4><div class="comrades">${st.comrades.map(c => `<span title="${c.b} battles">${c.name.zh} ${c.name.en}${c.b ? ` · ${c.b}` : ''}</span>`).join('') || '<span>none</span>'}${st.fallen.slice(-6).map(c => `<span class="dead">${c.name.zh} ✝</span>`).join('')}</div></div>`;
    const A = []; const k = n.k; const here = st.owner[st.node] === 0;
    const muster = HIST.find(h => !st.done[h.id] && !h.peace && h.node === st.node && h.at - st.day <= 25 && h.at >= st.day);
    if (muster) A.push(['hot', `Join the muster`, `${muster.title}. The army marches in ${muster.at - st.day} days.`, () => campaign(muster)]);
    if (here) A.push(['', 'Rest 3 days', k === 'village' ? 'An inn bed: +30 health, 1 tael' : 'Barracks: +25 health', () => { st.day += 3; st.hp = Math.min(100, st.hp + (k === 'village' ? 30 : 25)); if (k === 'village') st.silver = Math.max(0, st.silver - 1); log('You rest and let your wounds close.'); tick(3); }]);
    if (here && (k === 'fort' || k === 'hq')) A.push(['', 'Drill 6 days', 'Train with the garrison: firearms, blade or formation drill', drill]);
    if (here && (k === 'town' || k === 'hq')) A.push(['', 'Market', 'Armor, a better musket, a forged blade, dressings', market]);
    if (st.owned.length > 1) A.push(['', 'Arms rack', 'Choose the blade, missile weapon and shield you carry', armsRack]);
    if (here && k !== 'field') A.push(['', 'Change post', 'Ask to serve as spearman, shield, duck team, gunner…', changePost]);
    if (here && (k === 'fort' || k === 'hq') && st.day - st.payDay >= 30) A.push(['', 'Draw your pay', `${4 + st.rank * 4} taels are owed — if the paymaster has silver`, pay]);
    if (nx && st.merit >= nx[2] && here && (k === 'fort' || k === 'hq' || k === 'town')) A.push(['hot', 'Petition for promotion', `Your merit earns the rank of ${nx[0]}`, promote]);
    if (here && st.rank >= 2 && (k === 'town' || k === 'village' || k === 'hq') && st.comrades.length < Math.min(11, 3 + st.rank * 2)) A.push(['', 'Recruit a man', '8 taels: a new comrade for your file', recruit]);
    const front = adj(st.node).some(a => st.owner[a] === 1);
    if (here && front) A.push(['', 'Patrol toward the enemy', 'Skirmish with Jin scouts: merit, silver and danger', () => fight('patrol')]);
    if (here && !front && k !== 'field') A.push(['', 'Hunt bandits', 'Deserters and brigands raid the villages', () => fight('bandits')]);
    $('cActs').innerHTML = A.map((a, i) => `<button type="button" class="btn ${a[0]}" data-i="${i}"><b>${a[1]}</b><small>${a[2]}</small></button>`).join('');
    $('cActs').querySelectorAll('button').forEach(b => b.onclick = () => { AUDIO.init(); AUDIO.play('ui'); A[+b.dataset.i][3](); });
    $('cLog').innerHTML = st.log.slice(0, 30).map(l => `<p>${l}</p>`).join('');
    $('cHint').textContent = `Click a neighboring town to march there. Roads from here: ${adj(st.node).map(a => N[a].zh).join(' · ')}`;
    draw(); save();
  }
  function modal(title, body, btns) {
    $('cmTitle').innerHTML = title; $('cmBody').innerHTML = body; const B = $('cmBtns'); B.innerHTML = '';
    for (const [label, fn, cls] of btns) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || ''); b.innerHTML = label; b.onclick = () => { $('cModal').hidden = true; AUDIO.play('ui'); if (fn) fn(); render(); }; B.appendChild(b); }
    $('cModal').hidden = false;
  }
  // ---------- time and the war
  function tick(days) {
    for (const h of HIST) {
      if (st.done[h.id] || h.at > st.day) continue;
      st.done[h.id] = true;
      if (h.peace) { for (const t of h.take || []) st.owner[t] = 0; log(h.hist); continue; }
      for (const t of h.fall || []) st.owner[t] = 1; for (const t of h.take || []) st.owner[t] = 0;
      log(`${h.title}: ${h.hist}`);
      if ((h.fall || []).includes(st.node)) { const safe = adj(st.node).find(a => st.owner[a] === 0) || 'shg'; st.node = safe; log(`You escape to ${N[safe].zh} with the survivors.`); }
      if (h.final) return ending(false);
    }
  }
  function travel(to) {
    if (!adj(st.node).includes(to)) { sel = to; render(); return; }
    if (st.owner[to] === 1) { modal(`${N[to].zh} · ${N[to].en}`, `<p>The Jin hold ${N[to].en}. Scouts report banners on the walls.</p><p>Raid it with the garrison troops nearby? If you win, the town is retaken.</p>`, [['Raid it', () => fight('raid', to), 'primary'], ['Stay', null]]); return; }
    const a = N[st.node], b = N[to]; const days = Math.max(2, Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 4));
    st.day += days; st.node = to; sel = null; log(`You march ${days} days to ${b.zh} ${b.en}.`); tick(days);
    // the road
    const risk = adj(to).some(x => st.owner[x] === 1) ? 0.35 : 0.18; const r = rng();
    if (r < risk) { const ev = rng();
      if (ev < 0.5) modal('伏兵 · Ambush!', '<p>Jin horsemen burst out of a gully as your column crosses the stream bed.</p>', [['Form up and fight', () => fight('ambush'), 'primary']]);
      else if (ev < 0.7) modal('流民 · Refugees', '<p>Families driven from their farms beg for food at the roadside.</p>', [['Give 5 taels', () => { st.silver = Math.max(0, st.silver - 5); st.merit += 6; log('You share your silver with refugees. Word of it reaches your officers.'); }], ['March on', () => log('You march past the refugees.')]]);
      else if (ev < 0.85) modal('逃兵 · Deserters', '<p>Three ragged men from a broken company hide in a barn. Their pay is a year in arrears.</p>', [[st.rank >= 2 ? 'Take them into your file' : 'Let them go', () => { if (st.rank >= 2 && st.comrades.length < 11) { st.comrades.push({ name: mkName(st.day * 31 + 7), b: 0 }); log('A deserter joins your file. He swears he will not run again.'); } else log('You let the deserters go.'); }], ['Report them', () => { st.merit += 4; log('You report the deserters to the provost.'); }]]);
      else { const sk = ['gun', 'blade', 'drill'][Math.floor(rng() * 3)]; st.skills[sk] = Math.min(10, st.skills[sk] + 1); modal('老兵 · An old soldier', `<p>A one-eyed veteran of the Korean war shares your fire and teaches you a trick or two.</p><p><b>${{ gun: 'Firearms', blade: 'Blade & spear', drill: 'Drill' }[sk]} +1</b></p>`, [['Thank him', null, 'primary']]); }
    }
    render();
  }
  function drill() { modal('操練 · Drill', '<p>Six days with the garrison drill-masters.</p>', ['gun', 'blade', 'drill'].map(sk => [`${{ gun: 'Firearms', blade: 'Blade & spear', drill: 'Formation drill' }[sk]} (${st.skills[sk]})`, () => { if (st.skills[sk] >= 10) return; st.day += 6; st.skills[sk]++; st.merit += 2; log(`You drill ${{ gun: 'with the matchlock until you can load in the dark', blade: 'with blade and spear until your arms ache', drill: 'in formation to the drum and the gong' }[sk]}.`); tick(6); }]).concat([['Not now', null]])); }
  function market() {
    const items = [];
    if (st.kit.armor < 3) items.push([`${['Lamellar coat', 'Mountain-pattern armor', 'Iron armor'][st.kit.armor]} — ${[30, 70, 140][st.kit.armor]} taels`, [30, 70, 140][st.kit.armor], () => st.kit.armor++]);
    if (st.kit.gun < 2) items.push([`${['A fine niaochong', 'A master niaochong'][st.kit.gun]} — ${[40, 100][st.kit.gun]} taels`, [40, 100][st.kit.gun], () => st.kit.gun++]);
    if (st.kit.blade < 2) items.push([`${['A good dao', 'A master-forged dao'][st.kit.blade]} — ${[25, 70][st.kit.blade]} taels`, [25, 70][st.kit.blade], () => st.kit.blade++]);
    if (!st.kit.horse && st.rank >= 3) items.push(['A Mongol horse — 80 taels', 80, () => { st.kit.horse = 1; }]);
    const AR = [['jian', 35, 0], ['mace', 40, 0], ['qiang', 20, 0], ['guandao', 75, 3], ['shield', 15, 0], ['xbow', 50, 0], ['bow', 45, 0], ['sanyan', 45, 0]];
    for (const [a, price, need] of AR) { if (st.owned.includes(a) || st.skills.blade < need) continue; const D = S.ARMS[a] || S.RANGED[a]; const label = a === 'shield' ? '藤牌 A rattan shield' : `${D.zh} ${D.en}`; items.push([`${label} — ${price} taels`, price, () => { st.owned.push(a); log(`You can equip it at the arms rack.`); }]); }
    items.push(['Dressings and herbs (+35 health) — 6 taels', 6, () => { st.hp = Math.min(100, st.hp + 35); }]);
    modal('市 · Market', `<p>You have ${st.silver} taels.</p>`, items.map(([l, p, fn]) => [l, () => { if (st.silver < p) { log('You cannot afford it.'); return; } st.silver -= p; fn(); log(`You buy: ${l.split(' — ')[0]}.`); }]).concat([['Leave', null]]));
  }
  function armsRack() {
    const L = st.load; const mel = st.owned.filter(a => S.ARMS[a]), rng2 = st.owned.filter(a => S.RANGED[a]);
    const nm = (a) => { const D = S.ARMS[a] || S.RANGED[a]; return D ? `${D.zh} ${D.en}` : a; };
    const btns = [];
    for (const a of [''].concat(mel)) btns.push([`Blade: ${a ? nm(a) : 'issue weapon of your post'}${(L.melee || '') === a ? ' ✓' : ''}`, () => { L.melee = a; armsRack(); }]);
    for (const a of [''].concat(rng2, ['none'])) btns.push([`Missile: ${a === '' ? 'issue weapon of your post' : a === 'none' ? 'none' : nm(a)}${(L.ranged || '') === a ? ' ✓' : ''}`, () => { L.ranged = a; armsRack(); }]);
    if (st.owned.includes('shield')) btns.push([`Rattan shield: ${L.shield ? 'carried ✓' : 'left behind'}`, () => { L.shield = !L.shield; armsRack(); }]);
    btns.push(['Done', null, 'primary']);
    modal('兵器架 · Arms rack', '<p>What you carry into the next battle. Your post still decides which company you march with.</p>', btns);
  }
  function changePost() { const roles = ROLE_INFO.filter(r => r[0] !== 'cavalry' || st.kit.horse); modal('Change post', '<p>The officer of the day can move you to another company.</p>', roles.map(r => [`${r[1]} · ${r[2]}${r[0] === st.role ? ' (now)' : ''}`, () => { st.role = r[0]; log(`You transfer to the ${r[2].toLowerCase()}s.`); }]).concat([['Stay', null]])); }
  function pay() { st.payDay = st.day; if (rng() < 0.38) modal('欠餉 · Pay in arrears', '<p>The paymaster\'s chest is empty. The men mutter about the last company that mutinied.</p>', [['Endure it', () => { st.merit += 3; log('There is no pay. You endure it.'); }], ['Petition the officer', () => { if (rng() < 0.3 + st.skills.drill * 0.05) { const s = 4 + st.rank * 4; st.silver += s; log(`Your petition succeeds: ${s} taels.`); } else { st.merit = Math.max(0, st.merit - 3); log('The officer has you beaten for insolence.'); } }]]); else { const s = 4 + st.rank * 4; st.silver += s; log(`You draw ${s} taels of pay.`); } render(); }
  function promote() { st.rank++; const R = rank(); st.silver += 5 * st.rank; log(`<b>Promoted to ${R[0]} · ${R[1]}.</b>`);
    modal(`升 · ${R[0]}`, `<p>Before the assembled company you receive the rank of <b>${R[1]}</b>.</p>${R[3] ? `<p>From now on you lead ${R[3] > 1 ? R[3] + ' squads' : 'your squad'} in battle: press O for the command view; your orders travel by drum, gong and runner.</p>` : '<p>Keep surviving. Officers are made from soldiers who live.</p>'}`, [['承命 · I accept', null, 'primary']]); }
  function recruit() { if (st.silver < 8) { log('You cannot pay a recruit.'); render(); return; } st.silver -= 8; const c = { name: mkName((st.day * 131 + st.comrades.length * 17) & 0xfffff), b: 0 }; st.comrades.push(c); log(`${c.name.zh} ${c.name.en} joins your file.`); render(); }
  function campaign(h) { modal(h.title, `<p>${h.intro}</p><p>You march with the army. ${h.at - st.day} days to the battle.</p>`, [['March', () => { st.day = h.at; fight('campaign', null, h); }, 'primary'], ['Not yet', null]]); }
  // ---------- battles
  function fight(kind, target, h) {
    const n = N[target || st.node]; let soldier, title, intro, map = n.map, attack = false;
    if (kind === 'campaign') { soldier = { cmds: h.cmds, size: h.size[0], armies: null }; title = h.title; intro = h.intro; map = h.map; }
    else if (kind === 'bandits') { soldier = { cmds: [1, 1], size: 900, armies: [null, [['ronin', 'ronin', 'ronin', 'archer', 'ronin']]], names: [null, ['Bandit chief Zhang']] }; title = `剿匪 · Brigands near ${n.zh}`; intro = 'A band of deserters and brigands has burned two villages. The garrison rides out to end it.'; }
    else if (kind === 'ambush') { soldier = { cmds: [1, 1], size: 1000, armies: [null, [['cavalry', 'cavalry', 'archer', 'byakkotai', 'samurai']]] }; title = `伏 · Ambush on the road to ${n.zh}`; intro = 'Jin horsemen have caught your column on the road. Form up!'; }
    else if (kind === 'raid') { soldier = { cmds: [2, 2], size: 1300 }; title = `襲 · Raid on ${n.zh} ${n.en}`; intro = `The garrison troops strike at the Jin in ${n.en}. Win and the town is ours again.`; attack = true; }
    else { soldier = { cmds: [1, 1], size: 1100 }; title = `哨探 · Patrol beyond ${n.zh}`; intro = 'Your company runs into Jin scouts in the hills.'; }
    if (soldier.cmds[1] > 1 && st.day > dayOf(1626, 1, 1)) soldier.size = Math.round(soldier.size * 1.08);
    const role = st.role === 'cavalry' && !st.kit.horse ? 'musket' : st.role;
    state.careerBattle = { kind, node: target || st.node, hist: h ? h.id : null, title, intro, comrades: st.comrades.slice(), target };
    st.pending = { kind, node: target || st.node, hist: h ? h.id : null, target }; save();
    $('career').hidden = true;
    const seed = (Math.random() * 0x7fffffff) | 0; state.lowfx = $('lowfxIn').checked; state.fog = false;
    startGame({ seed, battle: map, mode: 'soldier', soldier, players: [{ name: st.name, team: 0, role, kit: kit(), command: rank()[3], connected: true }] }, 0, null, 1);
  }
  function report(res) {
    const p = st.pending || {}; st.pending = null; st.battles++; st.kills += res.kills;
    const big = p.kind === 'campaign' ? 18 : p.kind === 'raid' ? 12 : 0;
    const merit = res.kills * 3 + (res.won ? 18 + big : 4) + (res.survived ? 8 : 0) - res.falls * 2 + st.skills.drill;
    const silver = 4 + res.kills * 2 + (res.won ? 10 + big / 2 : 0);
    st.merit = Math.max(0, st.merit + merit); st.silver += silver;
    const dead = [], kept = [];
    st.comrades.forEach((c, i) => { if (res.comrades[i] === false) dead.push(c); else { c.b++; kept.push(c); } });
    st.comrades = kept; st.fallen = st.fallen.concat(dead);
    let wound = res.falls * 22; st.hp -= wound; const lines = [];
    lines.push(`${res.won ? 'Victory' : 'Defeat'}. You killed ${res.kills}${res.falls ? `, and fell ${res.falls} time${res.falls > 1 ? 's' : ''}` : ''}. Merit +${merit}, silver +${silver}.`);
    if (dead.length) lines.push(`Fallen from your file: ${dead.map(c => c.name.zh + ' ' + c.name.en).join(', ')}.`);
    if (p.hist) { const h = HIST.find(x => x.id === p.hist); st.done[h.id] = true;
      if (res.won) { if (h.fall && h.fall.length) lines.push(`<b>History turns.</b> ${h.fall.map(t => N[t].en).join(' and ')} will not fall this time.`); for (const t of h.take || []) st.owner[t] = 0; if (h.final) return ending(true); }
      else { for (const t of h.fall || []) st.owner[t] = 1; lines.push(h.hist); if (h.final) return ending(false); } }
    if (p.kind === 'raid' && res.won) { st.owner[p.target] = 0; st.node = p.target; lines.push(`${N[p.target].en} is retaken!`); }
    if ((st.owner[st.node] === 1)) { const safe = adj(st.node).find(a => st.owner[a] === 0) || 'shg'; st.node = safe; lines.push(`The survivors fall back to ${N[safe].en}.`); }
    if (st.hp <= 0) { if (st.ironman) { st.alive = false; log(`<b>${st.name} died of wounds.</b>`); } else { st.hp = 35; st.day += 60; st.merit = Math.max(0, st.merit - 10); lines.push('Your wounds nearly killed you. Two months on a cot in the field hospital.'); } }
    st.day += 2; log(lines.join(' ')); save();
    $('resultText').innerHTML = lines.join('<br>'); $('btnNext').hidden = false; $('btnNext').textContent = '回營 · Return to the road →';
    $('btnNext').onclick = () => { try { localStorage.setItem('mingCareerOpen', '1'); } catch (e) { } location.reload(); };
  }
  function ending(won) {
    st.alive = false; save();
    modal(won ? '山河猶在 · The rivers and mountains remain' : '明亡 · The fall of the Ming', `<p>${won ? 'Against everything the histories say, the Pass held. The Ming endures another season, and your name is written in the regimental rolls.' : 'Wu Sangui opened the Pass, and the Qing banners poured south. The dynasty you served is over.'}</p><p>${st.name} served ${st.battles} battles as ${rank()[1]}, slew ${st.kills}, and buried ${st.fallen.length} comrades.</p>`, [['Begin a new life', () => { localStorage.removeItem(KEY); open(true); }, 'primary']]);
  }
  function open(newGame) {
    st = load(); if (st && !st.owned) { st.owned = ['dao']; st.load = { melee: '', ranged: '', shield: false }; } show('career-x'); $('menu').hidden = true; $('career').hidden = false; $('hud').hidden = true;
    if (!st || !st.alive || newGame) {
      st = fresh(); const opts = [['zj', '浙江 · A Yiwu miner from Zhejiang', 'Qi Jiguang\'s old recruiting ground. You start as a spearman with a strong arm.', 'spear', { blade: 2 }], ['sc', '四川 · A White Pole from Sichuan', 'Qin Liangyu\'s hill tribesmen with their white-shafted spears.', 'spear', { blade: 1, drill: 1 }], ['ld', '遼東 · A Liaodong farmer\'s son', 'You grew up on this frontier and know the matchlock.', 'musket', { gun: 2 }], ['bj', '北京 · A Beijing artisan\'s apprentice', 'You can read and count, and the arsenal taught you powder.', 'musket', { gun: 1, drill: 1 }]];
      render();
      modal('應募 · Enlistment', `<p>Spring 1619. Fushun has fallen and the court is raising an army to punish Nurhaci. The recruiting officer at Shanhai Pass dips his brush. Where are you from?</p><p><label>Your name <input id="cName" value="${st.name}" maxlength="12" style="width:10em"></label> <label class="chk"><input type="checkbox" id="cIron"> Iron soldier: if you die of wounds, the career ends</label></p>`,
        opts.map(o => [`<b>${o[1]}</b><small style="display:block;font-weight:400">${o[2]}</small>`, () => { st.name = ($('cName').value || st.name).slice(0, 12); st.ironman = $('cIron').checked; st.role = o[3]; for (const k in o[4]) st.skills[k] += o[4][k]; log(`${st.name} enlists at Shanhai Pass as a ${o[3] === 'spear' ? 'spearman' : 'musketeer'}.`); }]));
    } else render();
  }
  function init() {
    $('btnCareer').onclick = () => { AUDIO.init(); AUDIO.play('ui'); open(false); MUSIC.play('menu'); };
    $('cBack').onclick = () => { $('career').hidden = true; show('menu'); };
    $('cMap').onclick = (ev) => { const k = nodeAt(ev); if (!k) return; AUDIO.play('ui'); if (k === st.node) { sel = null; render(); return; } if (adj(st.node).includes(k)) travel(k); else { sel = k; render(); $('cHint').textContent = `${N[k].zh} ${N[k].en}: not on a road from here.`; } };
    setInterval(() => { if (!$('career').hidden && st) draw(); }, 250);
    let flag = null; try { flag = localStorage.getItem('mingCareerOpen'); localStorage.removeItem('mingCareerOpen'); } catch (e) { }
    if (flag) { state.mode = 'soldier'; open(false); }
  }
  return { init, report, open };
})();
CAREER.init(); renderMenu();

// ===== Co-op campaign & Assault: menus and HUD =====
// difficulty: chosen once, kept in this browser, carried by the host's start message so every player fights the same battle
const DIFFS = [['新兵', 'Recruit', 'Softer enemies; your allies hit harder.'], ['兵', 'Soldier', 'As the battles were fought.'], ['老兵', 'Veteran', 'Full-strength enemies with an extra company in each large group.'], ['孤旗', 'Lone banner', 'Veteran, and no AI companies on your side in co-op: only the players and their own men.']];
function diffUI(host, id) {
  if (!host) return; let el = $(id); if (!el) { el = document.createElement('div'); el.id = id; el.className = 'diffrow'; host.parentNode.insertBefore(el, host);
    if (!$('diffCss')) { const st = document.createElement('style'); st.id = 'diffCss'; st.textContent = '.diffrow { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 0 0 12px; } .diffrow > span { font: 700 11px sans-serif; letter-spacing: .14em; text-transform: uppercase; opacity: .7; margin-right: 6px; } .diffrow button { padding: 5px 10px; border: 1px solid #8a7a5a; background: transparent; color: inherit; font: 13px Georgia, serif; cursor: pointer; } .diffrow button.on { background: #8a2a1e; color: #f4ead6; border-color: #8a2a1e; } .diffrow small { flex-basis: 100%; opacity: .75; font: 12px sans-serif; }'; document.head.appendChild(st); } }
  const cur = diffPref(); el.innerHTML = '<span>Difficulty</span>' + DIFFS.map((d, i) => `<button type="button" class="${i === cur ? 'on' : ''}" data-d="${i}">${d[0]} ${d[1]}</button>`).join('') + `<small>${DIFFS[cur][2]}</small>`;
  el.querySelectorAll('button').forEach(b => b.onclick = () => { try { localStorage.setItem('mingDiff', b.dataset.d); } catch (e) { } AUDIO.init(); AUDIO.play('ui'); diffUI(host, id); if ($('diffRowStory') && id !== 'diffRowStory') diffUI($('zheCta'), 'diffRowStory'); if ($('diffRowMis') && id !== 'diffRowMis') diffUI($('missionList'), 'diffRowMis'); });
}
// your place in the mandarin duck team, kept per browser like the difficulty: the story casts you as a shield man (and later the
// leader) unless you have chosen a trade here; any team-based battle starts you in that trade when the team has it
const YY_PICK = [['', '隊 Story', 'as the story casts you'], ['shield', '藤牌 Shield', 'rattan shield and dao, the front of the team'], ['brush', '狼筅 Brush', 'the wolf-brush: catch and hold'], ['spear', '長槍 Spear', 'the long spear behind the brushes'], ['trident', '鏜鈀 Trident', 'the flanks and the finishing thrust'], ['lead', '隊長 Leader', 'the dao at the head of the team']];
function yyPref() { try { const v = localStorage.getItem('mingYyRole') || ''; return YY_PICK.some(r => r[0] === v) ? v : ''; } catch (e) { return ''; } }
function yyRolePick(def) { const v = yyPref(); return v || def; }
function yyUI(host, id) {
  if (!host) return; let el = $(id); if (!el) { el = document.createElement('div'); el.id = id; el.className = 'diffrow'; host.parentNode.insertBefore(el, host); }
  const cur = yyPref(); el.innerHTML = '<span>Your place</span>' + YY_PICK.map(r => `<button type="button" class="${r[0] === cur ? 'on' : ''}" data-r="${r[0]}">${r[1]}</button>`).join('') + `<small>${YY_PICK.find(r => r[0] === cur)[2]}</small>`;
  el.querySelectorAll('button').forEach(b => b.onclick = () => { try { localStorage.setItem('mingYyRole', b.dataset.r); } catch (e) { } AUDIO.init(); AUDIO.play('ui'); yyUI(host, id); });
}
function renderMissions() {
  const sgm = state.mode === 'siege', as = state.mode === 'assault' || sgm; const L = as ? S.OPS : S.MISSIONS;
  if (as && (!L[state.op] || !!L[state.op].siege !== sgm)) state.op = Object.keys(L).find(k => !L[k].hidden && !!L[k].siege === sgm);
  const cur = as ? state.op : state.mission;
  $('missionHead').textContent = as ? 'Operation' : 'Mission';
  $('missionList').innerHTML = Object.keys(L).filter(k => !L[k].hidden && (!as || !!L[k].siege === sgm)).map(k => { const M = L[k]; return `<button type="button" class="chap${k === cur ? ' on' : ''}" data-k="${k}"><b>${M.title}</b><small>${M.year} · ${M.brief}</small></button>`; }).join('');
  if (!as) { diffUI($('missionList'), 'diffRowMis'); yyUI($('missionList'), 'yyRowMis'); } else { if ($('diffRowMis')) $('diffRowMis').remove(); if ($('yyRowMis')) $('yyRowMis').remove(); }
  $('missionList').querySelectorAll('button').forEach(b => b.onclick = () => { if (as) state.op = b.dataset.k; else state.mission = b.dataset.k; AUDIO.init(); AUDIO.play('ui'); renderMissions(); });
  const side = as ? state.faction : 0; const list = side === 1 ? ROLE_INFO_JIN : ROLE_INFO; if (!list.some(r => r[0] === state.role)) state.role = list[0][0];
  $('mroleList').innerHTML = list.map(r => `<button type="button" class="chap${r[0] === state.role ? ' on' : ''}" data-r="${r[0]}"><b>${r[1]} · ${r[2]}</b><small>${r[3]}</small></button>`).join('');
  $('mroleList').querySelectorAll('button').forEach(b => b.onclick = () => { state.role = b.dataset.r; AUDIO.init(); AUDIO.play('ui'); renderMissions(); });
  $('missionNote').textContent = as ? `You fight as a soldier. Choose 後金 Later Jin above to attack, 大明 Ming to defend. Host a room and friends join the same battle.` : 'You lead a squad of these troops in person (two squads if you play alone), with plain number keys to pick squads, F follow, C charge, H hold, O for the overview. Host a room to play together; each player picks their own troops.';
}
let MIS = null;
function missionStart() {
  const sim = state.sim, M = sim.mission; MIS = { radioT: 0, bannerT: 0, said: [] };
  MUSIC.play(sim.mode === 'assault' ? 'siege' : 'battle'); MUSIC.setIntensity(0.85);
  if (sim.mode === 'assault') { const me = sim.players[state.localIdx], att = me.team === M.attacker; setTimeout(() => storyCard(M.talk ? `${M.brief} ${att ? `You attack, with ${M.tickets} men to spend.` : 'You defend.'}` : `${M.brief} ${att ? `You attack. Your side has ${M.tickets} men to spend: every one who falls is gone for good. Take every point of a sector to push the line forward.` : `You defend. Hold each line as long as you can; when a sector falls, fall back to the next.`}`, `${M.title} · ${M.year}`), 400); }
}
function radio(who, text) { if (typeof SPEECH !== 'undefined' && SPEECH.note) { SPEECH.note(who, text); return; } const r = $('radio'); r.firstChild.textContent = who; r.lastChild.textContent = text; r.hidden = false; MIS.radioT = Math.min(11, 4 + text.length / 22); AUDIO.play('ui', undefined, 0, 0, 0.6); }
function banner(big, small, t) { const b = $('banner'); b.innerHTML = `${big}${small ? `<small>${small}</small>` : ''}`; b.hidden = false; MIS.bannerT = t || 3.5; }
// co-op missions (M.cast): the exposition is talk between named men, captioned over the speaker (SPEECH), not cards.
// cast[key] = [zh, en, of]: 'of' names an AI group (its general speaks), 'me' a man of your own company, or nothing
// when the key is itself a group id. An officer's line can carry an order (say[4]): shown as the key to give it.
const COOP_ORD = { fire: ['放 · Fire at will', 'N'], holdfire: ['止 · Hold your fire', 'N'], follow: ['跟 · Follow me', 'F'], hold: ['守 · Hold here', 'H'], line: ['列 · Form a line', 'Z'], charge: ['衝 · Charge', 'C'], column: ['縱 · Column', 'X'] };
function coopWho(key) {
  const sim = state.sim, M = sim.mission, c = (M.cast || {})[key]; const of = c ? c[2] : key; const h = localHero();
  if (of && sim.mg[of]) { const g = sim.mg[of], p = sim.players[g.p]; const gh = sim.units[p.heroId]; if (gh && !gh.dead && !gh.inactive) return gh.id; for (const id of p.squads) { const q = sim.squads[id]; if (!q.alive || q.inactive) continue; const u = q.unitIds.map(i => sim.units[i]).find(v => !v.dead && !v.wounded); if (u) return u.id; } }
  if (h) { const me = sim.players[state.localIdx]; let n = 0; for (const id of me.squads) { const q = sim.squads[id]; if (!q.alive) continue; for (const uid of q.unitIds) { const u = sim.units[uid]; if (u.dead || u.wounded || u.ctrl >= 0 || u.type === 'horse') continue; if ((n++ % 5) === (key.length % 5)) return u.id; } } }
  return -1;
}
function coopSay(ev) {
  const sim = state.sim, M = sim.mission, c = (M.cast || {})[ev.who]; const nm = c ? `${c[0]} ${c[1]}` : sim.mg[ev.who] ? `${sim.mg[ev.who].G.zh || ''} ${sim.mg[ev.who].G.name}`.trim() : ev.who;
  const id = coopWho(ev.who); const ok = id >= 0 && typeof SPEECH !== 'undefined' && SPEECH.say(id, ev.zh || '', ev.text, { prio: 3, loud: true, radio: true, who: nm, dur: Math.min(7, 2.5 + ev.text.length / 20) });
  if (!ok) radio(nm, `${ev.zh ? ev.zh + '  ' : ''}${ev.text}`);
  const o = ev.ord && COOP_ORD[ev.ord]; if (o) banner(o[0], `Give the order: ${o[1]} (pick a squad with 1–9 first)`, 3.5);
}
function missionEvent(ev) {
  if (!MIS) return; const sim = state.sim, M = sim.mission, me = sim.players[state.localIdx];
  if (ev.t === 'mphase' && M.camp) return;
  if (M.cast && ev.t === 'mphase') { const P = M.phases[ev.ph] || {}; banner(ev.title.split(' · ').slice(1).join(' · ') || ev.title, P.goal || '', 5); if (ev.ph) MUSIC.accent('phase'); return; }
  if (M.cast && ev.t === 'msay') { coopSay(ev); return; }
  if (ev.t === 'msay' && ev.team !== undefined) { if (ev.team !== me.team) return; const h = localHero(); let id = -1; /* an op's briefing line: a man of your own side near you says it */
    if (h && typeof SPEECH !== 'undefined') { const c = sim.teamAlive[me.team].filter(u => u.id !== h.id && !u.dead && !u.wounded && u.type !== 'horse' && Math.hypot(u.x - h.x, u.z - h.z) < 14); if (c.length) id = c[(ev.text.length + c.length) % c.length].id; }
    if (!(id >= 0 && SPEECH.say(id, ev.zh || '', ev.text, { prio: 3, loud: true, radio: true, who: ev.who, dur: Math.min(7, 2.5 + ev.text.length / 20) }))) radio(ev.who, `${ev.zh ? ev.zh + '  ' : ''}${ev.text}`); return; }
  if (M.cast && ev.t === 'zwound' && ev.p === state.localIdx) { const u = sim.units[ev.id]; if (u && typeof SPEECH !== 'undefined') SPEECH.say(ev.id, '我倒了……拉我一把！', 'I\'m down... get me up!', { prio: 3, dur: 4, loud: true, who: 'One of your men' }); toast(`One of your men is down${ev.why ? ' (' + ev.why + ')' : ''}. Get to him and press E to get him up`); return; }
  if (ev.t === 'mphase' && M.soldier) { const P = M.phases[ev.ph] || {}; banner(ev.title.split(' · ').slice(1).join(' · ') || ev.title, P.goal || (ev.text || '').split(/(?<=[.!?])\s/)[0], 5); if (ev.ph) MUSIC.accent('phase'); return; }
  if (ev.t === 'msay' && M.soldier && typeof zheSay === 'function' && zheSay(ev)) return;
  if (ev.t === 'mphase') { const first = ev.ph === 0; if (first) storyCard(`${M.brief}<br><br><b>${ev.title}.</b> ${ev.text}`, `${M.title} · ${M.year}`);
    else { const P = M.phases[ev.ph] || {}; const short = P.goal || (ev.text || '').split(/(?<=[.!?])\s/)[0]; banner(ev.title.split(' · ').slice(1).join(' · ') || ev.title, short, 4.5); if (ev.text && ev.text !== short) feed(ev.text, true); MUSIC.accent('phase'); } } /* in the fight a new phase is a short order on the banner, not a card of text; the rest goes to the feed */
  else if (ev.t === 'msay') radio(ev.who, ev.text);
  else if (ev.t === 'mwave') { if (ev.team !== me.team) feed(`Enemy reinforcements: ${ev.name}`); else feed(`${ev.name} joins the battle`, true); }
  else if (ev.t === 'mofficer') { banner(`敵將${ev.wounded ? '負傷' : '討取'} · ${ev.zh || ''}`, `${ev.name} ${ev.wounded ? 'is wounded and carried off' : 'is slain'}`, 4); MUSIC.accent('breach'); }
  else if (ev.t === 'mbreak') feed(`${ev.name} ${ev.team === me.team ? 'falls back' : 'gives way and withdraws'}`, ev.team !== me.team);
  else if (ev.t === 'mspare' && ev.p === state.localIdx) { if (ev.levy) { const n = state.sim.players[state.localIdx].squads.length; radio('Reinforcements', `${ev.name || 'A fresh company'} marches up to your banner. You now command ${n} companies (press ${n} to select it).`); } else toast('A fresh company is placed under your command'); }
  else if (ev.t === 'mhunt' && ev.team !== state.sim.players[state.localIdx].team) { toast(`${ev.name} is moving out to attack`); }
  else if (ev.t === 'msector') { const att = me.team === M.attacker; banner(att ? '破陣 · Sector taken' : '失陣 · Sector lost', att ? 'Push on to the next line' : 'Fall back to the next line', 3.5); MUSIC.accent('wave'); }
  else if (ev.t === 'mend') MIS.endText = ev.text;
}
function missionHUD(dt) {
  if (!MIS) return; const sim = state.sim, M = sim.mission, me = sim.players[state.localIdx]; if (M.camp) { $('mobj').hidden = true; return; }
  if (MIS.radioT > 0) { MIS.radioT -= dt; if (MIS.radioT <= 0) $('radio').hidden = true; }
  if (MIS.bannerT > 0) { MIS.bannerT -= dt; if (MIS.bannerT <= 0) $('banner').hidden = true; }
  MIS.hudT = (MIS.hudT || 0) - dt; if (MIS.hudT > 0) return; MIS.hudT = 0.25;
  const Z = (k) => sim.missionZone(k), pct = (x) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, x * 100)).toFixed(0)}%"></i></div>`;
  let h = '';
  if (sim.mode === 'assault') {
    const att = me.team === M.attacker, keys = M.sectors[Math.min(sim.sector, M.sectors.length - 1)];
    h = `<b>Sector ${Math.min(sim.sector + 1, M.sectors.length)} of ${M.sectors.length} · ${att ? 'Attack' : 'Defend'}</b>`;
    for (const k of keys) { const z = Z(k); const held = z.owner === M.attacker; const prog = M.attacker === 1 ? -z.ctrl / 100 : z.ctrl / 100; h += `<div class="ob${held ? ' done' : ''}"><i>${held ? '✓' : '◆'}</i><span>${z.name}${(z.n0 > 0) !== (z.n1 > 0) && !held ? ' · contested' : ''}</span></div>${pct(Math.max(0, prog))}`; }
    h += `<div class="ob"><i>兵</i><span>Attacker manpower: ${sim.tickets}</span></div>`;
  } else {
    const P = M.phases[Math.max(0, sim.mv.ph)], el = (sim.tick - sim.mv.t0) / 30;
    h = `<b>${P.title}</b>`;
    const line = (o) => { let s = '', d = sim.mObj(o, el) > 0;
      if (o.all) { for (const x of o.all) s += line(x); }
      if (o.reach) s += `<div class="ob${d ? ' done' : ''}"><i>◆</i><span>Reach ${Z(o.reach).name}</span></div>`;
      if (o.hold) { const v = sim.mv['hold:' + o.hold] || 0; s += `<div class="ob${v >= o.t ? ' done' : ''}"><i>◆</i><span>Hold ${Z(o.hold).name} · ${Math.floor(v)} / ${o.t} s</span></div>${pct(v / o.t)}`; }
      if (o.capture) for (const k of o.capture) { const z = Z(k), held = z.owner === M.side; s += `<div class="ob${held ? ' done' : ''}"><i>◆</i><span>Take ${z.name}</span></div>${pct((z.ctrl + 100) / 200)}`; }
      if (o.defeat) for (const g of o.defeat) { const G = sim.mg[g]; const f = G && G.released ? sim.mGroupFrac(g) : 1; s += `<div class="ob${G && G.broken ? ' done' : ''}"><i>◆</i><span>Break the ${G ? sim.players[G.p].name : g}${G && !G.released ? ' (not yet seen)' : ''}</span></div>${G && G.released && !G.broken ? pct(f) : ''}`; }
      if (o.officer) { const G = sim.mg[o.officer], hu = G && sim.units[sim.players[G.p].heroId]; s += `<div class="ob${G && G.broken ? ' done' : ''}"><i>將</i><span>${G.G.wound ? 'Wound' : 'Slay'} ${G.G.name}${G.G.zh ? ' ' + G.G.zh : ''}${G.released ? '' : ' (not yet on the field)'}</span></div>${hu && G.released && !G.broken ? pct(hu.hp / hu.def.hp) : ''}`; }
      if (o.arrive) { const G = sim.mg[o.arrive]; s += `<div class="ob"><i>◆</i><span>Bring the ${sim.players[G.p].name.toLowerCase()} safely to ${Z(o.zone).name}</span></div>`; }
      if (o.survive) { s += M.soldier ? `<div class="ob"><i>◆</i><span>${P.text}</span></div>` : `<div class="ob${el >= o.survive ? ' done' : ''}"><i>◆</i><span>Hold out · ${Math.max(0, Math.ceil(o.survive - el))} s</span></div>${pct(el / o.survive)}`; }
      if (o.extract) { const z = Z(o.extract), h0 = sim.units[me.heroId]; s += `<div class="ob"><i>◆</i><span>Reach ${z.name}${h0 && !h0.dead ? ` · ${Math.round(Math.hypot(h0.x - z.x, h0.z - z.z))} m` : ''}</span></div>`; }
      if (o.keep) s += `<div class="ob"><i>!</i><span>Do not lose ${Z(o.keep).name}</span></div>`;
      if (o.rescue) { const n = typeof sim.mFallen === 'function' ? sim.mFallen() : 0; s += `<div class="ob${n ? '' : ' done'}"><i>傷</i><span>${n ? `${n} of your men down · get to him, press E` : 'Your men are up'}</span></div>`; }
      return s; };
    h += line(P.obj); if (M.soldier && typeof zheObjLines === 'function') h += zheObjLines();
    if (P.limit) h += `<div class="ob"><i>⏳</i><span>${Math.max(0, Math.ceil(P.limit - el))} s left</span></div>`;
    h += `<div class="ob" style="opacity:.7"><i>·</i><span>Phase ${sim.mv.ph + 1} of ${M.phases.length}${me.spare !== undefined ? ` · reserve companies: ${me.spare}` : ''}</span></div>`;
  }
  // story: the golden line at the top is the objective; the panel would only repeat the phase text
  $('mobj').innerHTML = h; $('mobj').hidden = !!M.soldier;
}
function missionFinish(winner) {
  if (state.sim.mission.soldier && typeof arsRecord === 'function') { try { arsRecord(); } catch (e) { } }
  if (state.sim.mission.soldier && typeof zheFinish === 'function') { $('mobj').hidden = true; $('radio').hidden = true; return zheFinish(winner); }
  const sim = state.sim, me = sim.players[state.localIdx]; const won = winner === me.team; $('mobj').hidden = true; $('radio').hidden = true;
  if (MIS && MIS.endText) $('resultText').textContent = sim.mode === 'assault' ? `${MIS.endText} ${won ? 'Your side carries the day.' : 'Your side is beaten.'} You killed ${me.kills}.` : `${MIS.endText} You killed ${me.kills}.`;
  $('resultTitle').textContent = won ? '勝 · Mission accomplished' : '敗 · Mission failed';
}
// ---------- assault: deployment screen (pick a soldier from a gallery and where to enter the fight) ----------
const DEP = { open: false, ti: 0, si: 0, el: null, por: {}, porT: {}, t: 0, key: '' };
function depBuild() {
  const d = document.createElement('div'); d.id = 'deploy'; d.hidden = true;
  d.innerHTML = `<style>
  #deploy{position:fixed;inset:0;z-index:60;display:flex;gap:18px;padding:28px 32px;background:linear-gradient(90deg,rgba(14,11,9,.97),rgba(14,11,9,.9) 62%,rgba(14,11,9,.8));color:#efe6d0;font-family:'Noto Serif CJK TC',Georgia,serif;box-sizing:border-box;overflow:auto}
  #deploy h2{margin:0 0 2px;font-size:28px;letter-spacing:.08em}#deploy .sub{opacity:.7;font:13px sans-serif;margin-bottom:14px}
  #deploy .gal{flex:1;min-width:0}#deploy .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:12px}
  #deploy .card{background:#1c1612;border:1px solid #3d3128;border-radius:8px;overflow:hidden;cursor:pointer;transition:transform .12s,border-color .12s;position:relative}
  #deploy .card:hover{transform:translateY(-2px);border-color:#8a6a3c}#deploy .card.on{border-color:#d8b04a;box-shadow:0 0 0 2px #d8b04a55}
  #deploy .card.off{opacity:.38;cursor:default}
  #deploy .por{height:150px;background:#2a221c center/cover no-repeat;position:relative}
  #deploy .por b{position:absolute;left:8px;top:6px;font:700 12px sans-serif;background:#0009;border-radius:3px;padding:1px 6px}
  #deploy .por i{position:absolute;right:8px;top:6px;font:600 11px sans-serif;font-style:normal;background:#0009;border-radius:3px;padding:1px 6px}
  #deploy .nm{padding:8px 10px 2px;font-size:15px;font-weight:700}#deploy .nm small{display:block;font:12px sans-serif;opacity:.65;font-weight:400}
  #deploy .eq{display:flex;flex-wrap:wrap;gap:4px;padding:6px 10px 10px}#deploy .eq span{font:11px sans-serif;background:#2e251e;border:1px solid #4a3c30;border-radius:3px;padding:1px 6px}
  #deploy .side{width:300px;flex:none;display:flex;flex-direction:column;gap:10px}
  #deploy canvas{width:300px;height:300px;border-radius:8px;background:#20291f;border:1px solid #3d3128;cursor:pointer}
  #deploy .sp{display:flex;flex-direction:column;gap:5px;max-height:220px;overflow:auto}
  #deploy .sp button{all:unset;cursor:pointer;padding:7px 10px;border-radius:5px;background:#1c1612;border:1px solid #3d3128;font:13px sans-serif;display:flex;justify-content:space-between}
  #deploy .sp button.on{border-color:#d8b04a;background:#2b2116}#deploy .sp button.bl{opacity:.4;cursor:default}#deploy .sp button em{font-style:normal;opacity:.6;font-size:11px}
  #deploy .go{all:unset;cursor:pointer;text-align:center;padding:12px;border-radius:6px;background:#b8322a;color:#fff3e4;font:700 17px sans-serif;letter-spacing:.06em}
  #deploy .go:hover{background:#cf3b31}#deploy .tk{font:13px sans-serif;opacity:.8}
  @media (max-width:760px){#deploy{flex-direction:column}#deploy .side{width:auto}}
  body.deploying #hud,body.deploying #cmdui,body.deploying #fallen,body.deploying #fpmarks,body.deploying #storycard{visibility:hidden}
  </style>
  <div class="gal"><h2>出陣 · Deploy</h2><div class="sub" id="depSub"></div><div class="grid" id="depGrid"></div></div>
  <div class="side"><div class="tk" id="depTk"></div><canvas id="depMap" width="300" height="300"></canvas><div class="sp" id="depSp"></div><button class="go" id="depGo">Deploy <span style="opacity:.7;font-weight:400">(Space)</span></button></div>`;
  document.body.appendChild(d); DEP.el = d;
  d.addEventListener('mousedown', (e) => e.stopPropagation());
  $('depGo').onclick = () => depGo();
  $('depMap').onclick = (e) => { const r = e.target.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 300 - 150, z = 150 - (e.clientY - r.top) / r.height * 300; const sps = state.sim.deploySpawns(state.sim.players[state.localIdx].team, state.localIdx); let b = -1, bd = 14; sps.forEach((s, i) => { const dd = Math.hypot(s.x - x, s.z - z); if (dd < bd && !s.blocked) { bd = dd; b = i; } }); if (b >= 0) { DEP.si = b; DEP.key = ''; depRender(); } }; /* every change redraws at once: the picker used to wait for the next 0.4 s tick, which read as a dead click */
}
function depOpen(on) {
  if (!DEP.el) depBuild(); DEP.open = on; DEP.el.hidden = !on; DEP.key = ''; document.body.classList.toggle('deploying', on); if (state.renderer) state.renderer.omHide = on;
  if (on) { if (document.pointerLockElement) document.exitPointerLock(); $('pause').hidden = true; $('fallen').hidden = true; } else if (Input.cmdMode) toggleCmd(false);
}
function depPortrait(type) { // the soldier rendered alone in a little studio above the field, in his own kit
  const sim = state.sim, r = state.renderer; if (!r) return null; if (DEP.por[type]) return DEP.por[type];
  const [ty, role] = type.split(':'); let u = null; for (const v of sim.units) if (v.type === ty && !v.inactive && (!role || v.role === role)) { u = v; if (!v.dead) break; } if (!u) return null;
  const c = Object.assign({}, u, { st: S.ST_IDLE, stT: 0, blocking: false, aiming: false, speedNow: 0, walk: 0, mounted: false, mount: -1, downT: 0, flinchT: 0, dead: false, ctrl: -1, weapon: (u.def.weapons || [])[0] || u.weapon, posT: 0, entT: 0 });
  const Y = 420; const prev = r.cine; r.studio = { id: u.id, u: c, x: 0, y: Y, z: 0, yaw: 0.35 };
  r.cine = { pos: [0.9, Y + 1.15, 3.3], look: [0, Y + 0.92, 0], fov: 36 };
  try { r.render(1, 0, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); const cv = document.getElementById('c'); const t = document.createElement('canvas'); t.width = 240; t.height = 180; const g = t.getContext('2d'); const W = cv.width, H = cv.height, cw = H * 4 / 3; g.drawImage(cv, (W - cw) / 2, 0, cw, H, 0, 0, 240, 180); DEP.por[type] = t.toDataURL('image/jpeg', 0.85); } catch (e) { }
  r.studio = null; r.cine = prev; return DEP.por[type];
}
function depEquip(def) { const fake = { def }; const out = (def.weapons || []).map(w => def.brush ? '狼筅 Wolf-brush' : def.trident ? '鏜鈀 Trident' : wpnName(fake, w)); if (def.mounted) out.push('馬 Horse'); if (def.shield) out.push('牌 Rattan shield'); if (def.brush) out.push(`reach ${def.reach} m`); out.push(`♥ ${Math.round(def.hp)}`); return out; }
function depRender() {
  const sim = state.sim, me = sim.players[state.localIdx]; const types = sim.deployTypes(me.team, me.idx), sps = sim.deploySpawns(me.team, me.idx);
  if (DEP.ti >= types.length) DEP.ti = 0; if (DEP.si >= sps.length || (sps[DEP.si] && sps[DEP.si].blocked)) DEP.si = 0;
  const sel = sps[DEP.si]; const lockType = sel && sel.kind === 'sq' ? sel.type : null;
  const key = types.map(t => t.key + t.n).join() + '|' + sps.map(s => s.name + (s.blocked ? 'b' : '')).join() + '|' + DEP.ti + ':' + DEP.si;
  if (key !== DEP.key) { DEP.key = key;
    const h = sim.units[me.heroId]; const alive = h && !h.dead;
    $('depSub').textContent = alive ? 'Change your soldier or where you fight. Your current man goes back to his company.' : 'You have fallen. Choose a soldier and where to rejoin the fight.';
    $('depGrid').innerHTML = types.map((t, i) => { const off = lockType && t.type !== lockType; const on = lockType ? t.type === lockType : i === DEP.ti;
      return `<div class="card${on ? ' on' : ''}${off ? ' off' : ''}" data-i="${i}"><div class="por" data-t="${t.key}"><b>${i + 1}</b><i>${t.n ? t.n + ' men' : t.reserve ? 'in reserve · join nearest' : 'none left · join nearest'}</i></div><div class="nm">${t.name}<small>${t.jp || ''}</small></div><div class="eq">${depEquip(t.def).map(x => `<span>${x}</span>`).join('')}</div></div>`; }).join('');
    for (const el of $('depGrid').querySelectorAll('.card')) el.onclick = () => { const i = +el.dataset.i; if (lockType) { const j = sim.mode === 'campaign' ? sps.findIndex(s => s.type === types[i].type && !s.blocked) : -1; DEP.si = j >= 0 ? j : 0; } DEP.ti = i; DEP.key = ''; depRender(); };
    for (const el of $('depGrid').querySelectorAll('.por')) { const url = depPortrait(el.dataset.t); if (url) el.style.backgroundImage = `url(${url})`; }
    $('depSp').innerHTML = sps.map((s, i) => `<button class="${i === DEP.si ? 'on' : ''}${s.blocked ? ' bl' : ''}" data-i="${i}"><span>${s.kind === 'hq' ? '⛺ ' : s.kind === 'zone' ? '⚑ ' : '◆ '}${s.name}</span><em>${s.blocked ? 'contested' : s.kind === 'sq' ? 'join company' : s.kind === 'hq' ? 'camp' : 'objective'}</em></button>`).join('');
    for (const el of $('depSp').querySelectorAll('button')) el.onclick = () => { const i = +el.dataset.i; if (!sps[i].blocked) { DEP.si = i; DEP.key = ''; depRender(); } };
  }
  if (sim.mode === 'campaign') $('depTk').textContent = 'Co-op · rejoin the fight in one of your companies'; else { const A = sim.mission.attacker; $('depTk').textContent = `${me.team === A ? 'Attacking' : 'Defending'} · Sector ${Math.min(sim.sector + 1, sim.mission.sectors.length)}/${sim.mission.sectors.length} · Manpower ${Math.max(0, sim.tickets | 0)}`; }
  // map
  const g = $('depMap').getContext('2d'); const X = (x) => (x + 150), Z = (z) => (150 - z); g.fillStyle = '#26301f'; g.fillRect(0, 0, 300, 300);
  for (const b of sim.boxes) { g.fillStyle = '#6b5a44'; g.fillRect(X(b.x - b.hw), Z(b.z + b.hd), b.hw * 2, b.hd * 2); }
  for (const q of sim.squads) { if (!q.alive || q.inactive) continue; g.fillStyle = q.team === me.team ? '#7fbf6a' : '#d9543f'; g.fillRect(X(q.cx) - 2, Z(q.cz) - 2, 4, 4); }
  for (const o of sim.objectives) { if (o.hidden) continue; g.strokeStyle = o.owner === me.team ? '#7fbf6a' : o.owner >= 0 ? '#d9543f' : '#ccc'; g.lineWidth = 2; g.beginPath(); g.arc(X(o.x), Z(o.z), o.r, 0, 7); g.stroke(); }
  sps.forEach((s, i) => { g.fillStyle = s.blocked ? '#777' : i === DEP.si ? '#ffd65a' : s.kind === 'sq' ? '#cfe8c4' : '#f3ead6'; g.beginPath(); g.arc(X(s.x), Z(s.z), i === DEP.si ? 7 : s.kind === 'sq' ? 3.5 : 5, 0, 7); g.fill(); if (i === DEP.si) { g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke(); } });
}
function depGo() {
  const sim = state.sim, me = sim.players[state.localIdx]; const sps = sim.deploySpawns(me.team, me.idx), types = sim.deployTypes(me.team, me.idx); const sp = sps[DEP.si]; if (!sp || sp.blocked) return;
  let ti = DEP.ti; if (sp.kind === 'sq' && !(types[ti] && types[ti].type === sp.type)) { const j = types.findIndex(t => t.type === sp.type); if (j >= 0) ti = j; }
  Input.cmds.push([DEP.si, S.ORD_SPAWN, ti, 0, 0, 0]); AUDIO.play('ui'); depOpen(false); requestLock();
}
function depKey(c, e) {
  if (c === 'Space' || c === 'Enter') { e.preventDefault(); depGo(); return true; }
  if (/^Digit[1-9]$/.test(c)) { DEP.ti = +c.slice(5) - 1; DEP.key = ''; const sps = state.sim.deploySpawns(state.sim.players[state.localIdx].team, state.localIdx), sp = sps[DEP.si], ty = state.sim.deployTypes(state.sim.players[state.localIdx].team, state.localIdx)[DEP.ti]; if (sp && sp.kind === 'sq' && ty && sp.type !== ty.type) { const j = state.sim.mode === 'campaign' ? sps.findIndex(s => s.type === ty.type && !s.blocked) : -1; DEP.si = j >= 0 ? j : 0; } depRender(); return true; }
  if (c === 'Escape' || c === 'KeyP') { const h = localHero(); if (h && !h.dead) { depOpen(false); requestLock(); } else if (state.sim.mode === 'campaign') { DEP.dismissed = true; depOpen(false); } return true; }
  return true;
}
function depHUD(dt) {
  const sim = state.sim; if (!sim || (sim.mode !== 'assault' && sim.mode !== 'campaign') || (sim.mission && (sim.mission.soldier || sim.mission.camp)) || state.ended || sim.mwin !== undefined) { if (DEP.open) depOpen(false); return; }
  const h = localHero(); if (h && !h.dead) DEP.dismissed = false; else if (!DEP.open && !DEP.dismissed && sim.phase === 1 && !state.dying) depOpen(true);
  if (DEP.open) { $('fallen').hidden = true; DEP.t -= dt; if (DEP.t <= 0) { DEP.t = 0.4; depRender(); } }
}
