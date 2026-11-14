// ===================== 人間 · the world's living systems (no screen code: tested in node by test/test_world.js) =====================
// The townsfolk of every place, their trades, homes and days, and their lives (age, sickness, the levy, the war, flight,
// marriage); the seasons; goods and their prices (which history moves), your purse and your pack, the forge, paid work; the
// people you know (gifts, favours, letters carried, the matchmaker); the hard choices history puts in front of you on its
// dates, and the road's encounters; the temple's sticks and the teahouse's storyteller and dice; office: a magistrate's
// court, his yearly evaluation, memorials at court. Each function takes the save (S) and returns words for the screen.
const WCORE = (() => {
  'use strict';
  const Y0 = 1618, D = (y, m, d) => (y - Y0) * 360 + (m - 1) * 30 + (d - 1), DT = (day) => { const y = Y0 + Math.floor(day / 360), r = day - (y - Y0) * 360; return { y, m: Math.floor(r / 30) + 1, d: (r % 30) + 1 }; };
  function mulberry(a) { a >>>= 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rngFor = (S, salt) => mulberry(((S.seed || 7) * 7919 + S.day * 104729 + (salt || 0) * 15485863) >>> 0);
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const age = (S, born) => DT(S.day).y - born;
  // ---------------- seasons ----------------
  const season = (day) => { const m = DT(day).m; return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn'; };
  const biome = (day, night) => night ? 'night' : season(day);

  // ---------------- names ----------------
  const SUR = [['王', 'Wang'], ['李', 'Li'], ['張', 'Zhang'], ['劉', 'Liu'], ['陳', 'Chen'], ['楊', 'Yang'], ['趙', 'Zhao'], ['黃', 'Huang'], ['周', 'Zhou'], ['吳', 'Wu'], ['徐', 'Xu'], ['孫', 'Sun'], ['胡', 'Hu'], ['朱', 'Zhu'], ['高', 'Gao'], ['林', 'Lin'], ['何', 'He'], ['郭', 'Guo'], ['馬', 'Ma'], ['羅', 'Luo'], ['宋', 'Song'], ['鄭', 'Zheng'], ['韓', 'Han'], ['唐', 'Tang'], ['馮', 'Feng'], ['董', 'Dong'], ['曹', 'Cao'], ['袁', 'Yuan'], ['許', 'Xu'], ['沈', 'Shen'], ['彭', 'Peng'], ['呂', 'Lü'], ['蘇', 'Su'], ['蔣', 'Jiang'], ['蔡', 'Cai'], ['丁', 'Ding'], ['魏', 'Wei'], ['葉', 'Ye'], ['潘', 'Pan'], ['杜', 'Du'], ['夏', 'Xia'], ['田', 'Tian'], ['范', 'Fan'], ['石', 'Shi'], ['姚', 'Yao'], ['金', 'Jin'], ['白', 'Bai'], ['崔', 'Cui'], ['孟', 'Meng'], ['常', 'Chang'], ['賀', 'He'], ['佟', 'Tong'], ['祖', 'Zu'], ['尤', 'You']];
  const GM = [['大', 'Da'], ['二', 'Er'], ['三', 'San'], ['老四', 'Laosi'], ['栓柱', 'Shuanzhu'], ['鐵頭', 'Tietou'], ['有福', 'Youfu'], ['來福', 'Laifu'], ['守田', 'Shoutian'], ['長貴', 'Changgui'], ['金寶', 'Jinbao'], ['順子', 'Shunzi'], ['根生', 'Gensheng'], ['富貴', 'Fugui'], ['得勝', 'Desheng'], ['大牛', 'Daniu'], ['石頭', 'Shitou'], ['小六', 'Xiaoliu'], ['秋生', 'Qiusheng'], ['喜子', 'Xizi'], ['福全', 'Fuquan'], ['德明', 'Deming'], ['興邦', 'Xingbang'], ['繼祖', 'Jizu']];
  const GF = [['翠兒', 'Cui\'er'], ['秀英', 'Xiuying'], ['蘭花', 'Lanhua'], ['桂香', 'Guixiang'], ['春梅', 'Chunmei'], ['小紅', 'Xiaohong'], ['杏兒', 'Xing\'er'], ['巧姐', 'Qiaojie'], ['招弟', 'Zhaodi'], ['銀鳳', 'Yinfeng']];
  // ---------------- trades: what a man does all day, where, and what you can do with him ----------------
  // act: what he is drawn doing (sim worldThink acts); work/home: spots in his place; sells: goods; talk: his own lines
  const TR = {
    farmer: { zh: '莊稼人', en: 'a farmer', act: 19, work: ['fieldW', 'fieldE', 'field'], hat: 'straw', talk: [['今年的雨水還行。', 'The rain has been all right this year.'], ['稅又加了。說是遼餉。', 'The tax is up again. The Liaodong levy, they say.']] },
    weaver: { zh: '織婦', en: 'a weaver', act: 13, work: ['home2'], woman: 1, talk: [['一匹布織半個月，賣不到二百文。', 'Half a month for a bolt, and it fetches less than two hundred wen.']] },
    herd: { zh: '放牛娃', en: 'a herd boy', act: 11, work: ['fieldE'], young: 1, talk: [['牛跑了我就挨打。', 'If the ox wanders off I get beaten.']] },
    carter: { zh: '車把式', en: 'a carter', act: 9, work: ['gate', 'road', 'market'], talk: [['去哪兒？我這車一天走六十里。', 'Where to? My cart does sixty li a day.'], ['路上不太平，有逃兵搶東西。', 'The roads aren\'t safe. Deserters robbing people.']] },
    vendor: { zh: '小販', en: 'a vendor', act: 9, work: ['market', 'market2'], sells: ['rice', 'cake', 'salt', 'wine', 'gift'], buys: ['rice', 'salt'], talk: [['米又漲了。', 'Rice is up again.'], ['要點什麼？', 'What\'ll it be?']] },
    clothier: { zh: '布商', en: 'a cloth merchant', act: 9, work: ['market2'], sells: ['cloth'], buys: ['cloth', 'ginseng'], rich: 1, talk: [['松江的好布，蘇州的綢子。', 'Good cloth from Songjiang, silk from Suzhou.']] },
    ironmonger: { zh: '鐵匠鋪', en: 'an ironmonger', act: 18, work: ['smithy'], sells: ['iron', 'nails', 'knife'], buys: ['hoe', 'knife', 'nails', 'sword'], talk: [['你爹的手藝比我好。', 'Your father\'s a better smith than me.'], ['兵部又來定刀了，一千把。', 'The Ministry of War has ordered a thousand blades again.']] },
    tea: { zh: '茶館掌櫃', en: 'the teahouse keeper', act: 13, work: ['teahouse'], sells: ['tea'], talk: [['樓上有說書的，一碗茶兩文。', 'There\'s a storyteller upstairs. Two wen a bowl.']] },
    teller: { zh: '說書人', en: 'a storyteller', act: 6, work: ['teahouse'], talk: [['且聽下回分解。', 'And for what happened next, hear the next instalment.']] },
    doctor: { zh: '郎中', en: 'a physician', act: 20, work: ['physician'], sells: ['medicine'], buys: ['ginseng'], talk: [['伸手來，我號號脈。', 'Give me your wrist; let me take your pulse.']] },
    scribe: { zh: '代書先生', en: 'a letter-writer', act: 20, work: ['scribe'], talk: [['寫信、寫狀紙、看八字，都行。', 'Letters, plaints, horoscopes. Whatever you need.']] },
    porter: { zh: '腳夫', en: 'a porter', act: 11, work: ['market', 'gate', 'yard'], talk: [['一擔四十文，扛到城門。', 'Forty wen a load to the gate.']] },
    matchmaker: { zh: '媒婆', en: 'a matchmaker', act: 6, work: ['market'], woman: 1, talk: [['哎喲，這後生長得好！說親沒有？', 'My, what a handsome lad! Are you spoken for?']] },
    monk: { zh: '和尚', en: 'a monk', act: 20, work: ['temple'], hat: 'wrap', talk: [['阿彌陀佛。', 'Amituofo.'], ['求一支籤吧，觀音菩薩靈得很。', 'Draw a stick. Guanyin answers.']] },
    beggar: { zh: '乞丐', en: 'a beggar', act: 4, seat: 1, work: ['gate', 'temple'], talk: [['行行好，給口吃的。', 'Have pity. Something to eat.']] },
    runner: { zh: '衙役', en: 'a yamen runner', act: 11, work: ['yamenGate', 'market', 'gate'], rank: 1, talk: [['走開走開，別擋道。', 'Out of the way.']] },
    soldier: { zh: '兵丁', en: 'a soldier', act: 10, work: ['gate', 'yard', 'wall'], rank: 2, talk: [['三個月沒發餉了。', 'Three months without pay.'], ['聽說奴兒哈赤的兵都是鐵甲。', 'They say Nurhaci\'s men are all in iron.']] },
    candidate: { zh: '舉子', en: 'an examination candidate', act: 20, work: ['inn', 'teahouse', 'street'], hat: 'scholar', rank: 10, talk: [['今科的題目，聽說出在《孟子》。', 'They say this year\'s questions are from Mencius.'], ['我考了三次了。', 'This is my third time.']] },
    bookseller: { zh: '書坊老闆', en: 'a bookseller', act: 20, work: ['bookshop'], sells: ['book', 'crib'], buys: ['book'], talk: [['新刻的程墨，今科必用。', 'The newly cut model essays. You\'ll need them this year.']] },
    boatman: { zh: '船夫', en: 'a boatman', act: 9, work: ['quay'], talk: [['運河上的糧船，一年四百萬石。', 'Four million piculs of grain come up the canal a year.']] },
    clerk: { zh: '書吏', en: 'a clerk', act: 20, work: ['yamenGate'], rank: 2, talk: [['文書在這兒，按個手印。', 'Here\'s the document. Your thumbprint.']] },
    petitioner: { zh: '告狀的', en: 'a petitioner', act: 4, seat: 1, work: ['yamenGate'], talk: [['青天大老爺，給小民做主啊！', 'Your Honour, give us justice!']] },
    refugee: { zh: '難民', en: 'a refugee', act: 4, seat: 1, work: ['market', 'gate', 'temple'], talk: [['家沒了。什麼都沒了。', 'The house is gone. Everything is gone.'], ['韃子進城那天，我在井裡藏了一夜。', 'The day the Jurchens came into town I hid all night in a well.']] },
    jurchen: { zh: '女真商人', en: 'a Jurchen trader', act: 9, work: ['market2'], sells: ['ginseng', 'horse'], buys: ['cloth', 'iron', 'nails', 'hoe', 'knife', 'salt'], hat: 'felt', talk: [['人參，好人參。換鐵鍋，換布。', 'Ginseng, good ginseng. For iron pots, for cloth.']] },
    bannerman: { zh: '旗人', en: 'a Jurchen bannerman', act: 10, work: ['market', 'gate', 'yard', 'road'], hat: 'felt', rank: 8, sells: ['horse'], talk: [['剃了頭就是自己人。', 'Shave your head and you are one of us.'], ['尼堪，糧食藏在哪兒？', 'Nikan, where is the grain hidden?'], ['汗說了，漢人和女真是一家。', 'The Khan says Han and Jurchen are one family.']] },
  pawnbroker: { zh: '當鋪朝奉', en: 'a pawnbroker', act: 20, work: ['market2', 'street'], rich: 1, talk: [['當什麼？', 'What are you pawning?'], ['三分利，童叟無欺。', 'Three per cent a month, the same for children and old men.']] },
  horsedealer: { zh: '馬販子', en: 'a horse dealer', act: 9, work: ['market2', 'yard', 'gate'], sells: ['horse'], buys: ['horse'], talk: [['蒙古馬，走得遠，吃得少。', 'Mongol ponies: go far, eat little.']] },
  eunuch: { zh: '太監', en: 'a palace eunuch', act: 11, work: ['street'], rank: 30, talk: [['咱家是司禮監的。', 'I am of the Directorate of Ceremonial.']] },
  };
  // who lives in each place (trade, how many); the families of your village are fixed in world.js
  const POP = {
    lijia: [['farmer', 3], ['weaver', 1], ['herd', 1], ['carter', 1]],
    liaoyang: [['vendor', 3], ['clothier', 1], ['bookseller', 1], ['horsedealer', 1], ['pawnbroker', 1], ['ironmonger', 1], ['tea', 1], ['teller', 1], ['doctor', 1], ['scribe', 1], ['porter', 2], ['matchmaker', 1], ['monk', 1], ['beggar', 2], ['runner', 2], ['soldier', 3], ['carter', 1]],
    fushun: [['vendor', 2], ['jurchen', 2], ['soldier', 3], ['runner', 1], ['beggar', 1], ['carter', 1]],
    shanhai: [['soldier', 4], ['carter', 2], ['vendor', 1], ['scribe', 1], ['beggar', 1]],
    tongzhou: [['boatman', 2], ['carter', 2], ['vendor', 2], ['porter', 1], ['beggar', 1]],
    beijing: [['carter', 2], ['vendor', 3], ['clothier', 1], ['horsedealer', 1], ['pawnbroker', 1], ['tea', 1], ['teller', 1], ['candidate', 3], ['beggar', 2], ['doctor', 1], ['matchmaker', 1]],
    city: [['runner', 2], ['candidate', 3], ['bookseller', 1], ['scribe', 1], ['vendor', 2], ['soldier', 2], ['monk', 1]],
    county: [['runner', 3], ['clerk', 2], ['vendor', 2], ['farmer', 2], ['petitioner', 2]],
  };
  // ---------------- the townsfolk: generated once (seeded), then living ----------------
  function makeFolk(S) {
    const r = mulberry((S.seed || 7) * 31 + 17), F = {}; let n = 0;
    for (const place in POP) for (const [tr, cnt] of POP[place]) for (let i = 0; i < cnt; i++) { const T = TR[tr], woman = !!T.woman || (tr === 'beggar' && r() < 0.3) || (tr === 'refugee' && r() < 0.5); const s = pick(r, SUR), g = woman ? pick(r, GF) : pick(r, GM);
      const nm = woman && !T.young && r() < 0.6 ? { zh: `${s[0]}氏`, en: `Mistress ${s[1]}` } : { zh: s[0] + g[0], en: `${s[1]} ${g[1]}` };
      const born = T.young ? 1604 + Math.floor(r() * 4) : 1560 + Math.floor(r() * 40);
      const k = 'f' + (n++); F[k] = { k, zh: nm.zh, en: nm.en, woman, born, trade: tr, place, work: pick(r, T.work), alive: 1, rel: 0, temper: r(), wealth: T.rich ? 3 : 1, drafted: 0, look: { h: woman ? 0.92 : T.young ? 0.8 : 0.96 + r() * 0.1, hat: T.hat || (woman ? 'kerchief' : pick(r, ['kerchief', 'band', 'wrap', 'straw'])), beard: !woman && !T.young && r() < 0.5 ? pick(r, ['mous', 'full', 'longmous']) : undefined, grey: born < 1570, wrap: tr === 'monk' ? 0x8a5a24 : undefined, kerch: woman ? pick(r, [0x3a5a7a, 0x7a3a3a, 0x4a6a3a, 0x6a5a7a]) : undefined } }; }
    return F;
  }
  // a folk's day: where he is and what he is doing at this hour (null: indoors)
  function folkAt(S, f, hour) { if (!f.alive || f.place !== S.place) return null; const T = TR[f.trade];
    if (hour >= 19.5 || hour < 6) return f.trade === 'beggar' || f.trade === 'refugee' || f.trade === 'soldier' ? { spot: f.work, act: f.trade === 'soldier' ? 10 : 1, seat: 1 } : null;
    if (hour >= 12 && hour < 13 && !T.seat) return { spot: S.place === 'lijia' ? 'well' : 'teahouse', act: 2, seat: 1 };
    return { spot: f.work, act: T.act, seat: !!T.seat }; }

  // ---------------- goods, prices, the purse and the pack ----------------
  const GOODS = { rice: ['米', 'rice (a dou)', 30], cake: ['餅', 'sesame cakes', 4], salt: ['鹽', 'salt (a jin)', 12], wine: ['酒', 'a jug of wine', 25], tea: ['茶', 'a bowl of tea', 2], cloth: ['布', 'a bolt of cotton', 220], iron: ['鐵', 'pig iron (a jin)', 18], nails: ['釘', 'nails (a hundred)', 40], hoe: ['鋤', 'a hoe', 120], knife: ['刀', 'a knife', 90], sword: ['劍', 'a sword', 900], book: ['書', 'model essays (程墨)', 300], medicine: ['藥', 'medicine', 150], ginseng: ['參', 'ginseng', 600], horse: ['馬', 'a horse', 9000], letter: ['信', 'a letter to carry', 0], gift: ['禮', 'a gift box (cakes and wine)', 80], crib: ['夾', 'a crib-shirt (the Four Books in tiny characters, sewn into a lining)', 600] };
  const PLACE_MUL = { lijia: 0.9, liaoyang: 1, fushun: 0.95, shanhai: 1.15, tongzhou: 1.2, beijing: 1.3, city: 1.4, county: 1 };
  const LIAO = { lijia: 1, liaoyang: 1, fushun: 1, shanhai: 0.5 };
  // history moves prices: in Liaodong, food dearer after Fushun, dearer still after Sarhu and the loss of Kaiyuan and Tieling
  // what is cheap where: ginseng and horses from the Jurchen markets, cloth from the south, salt from the coast
  const SPREAD = { ginseng: { fushun: 0.6, liaoyang: 0.9, beijing: 1.5, city: 1.6, tongzhou: 1.4 }, horse: { fushun: 0.7, liaoyang: 0.9, beijing: 1.2 }, cloth: { beijing: 0.7, tongzhou: 0.75, city: 0.8, liaoyang: 1.15, fushun: 1.4, lijia: 1.2 }, salt: { tongzhou: 0.6, beijing: 0.8, liaoyang: 1.2, fushun: 1.5 }, book: { city: 0.8, beijing: 0.9, liaoyang: 1.3 } };
  function price(S, place, g) { const G = GOODS[g]; if (!G) return 0; let p = G[2] * ((SPREAD[g] && SPREAD[g][place]) || (PLACE_MUL[place] || 1));
    const food = g === 'rice' || g === 'cake' || g === 'salt';
    if (food && LIAO[place]) { const k = LIAO[place]; if (S.day >= D(1618, 4, 15)) p *= 1 + 0.3 * k; if (S.day >= D(1619, 3, 5)) p *= 1 + 0.4 * k; if (S.day >= D(1619, 7, 25)) p *= 1 + 0.3 * k; }
    if (food && season(S.day) === 'winter') p *= 1.12;
    if (food && (place === 'beijing' || place === 'city' || place === 'tongzhou') && DT(S.day).m >= 8 && DT(S.day).m <= 10) p *= 0.85; /* the canal fleet is in */
    if (g === 'ginseng' && place !== 'fushun' && S.day >= D(1618, 4, 15)) p *= 1.6; /* the Jurchen markets are closed */
    if ((g === 'iron' || g === 'knife' || g === 'sword') && S.day >= D(1618, 5, 1) && LIAO[place]) p *= 1.25; /* the army buys all the iron */
    return Math.max(1, Math.round(p)); }
  const repOf = (S, place) => (S.rep && S.rep[place]) | 0;
  const addRep = (S, place, n) => { S.rep = S.rep || {}; S.rep[place] = Math.max(-20, Math.min(30, (S.rep[place] | 0) + n)); };
  const inv = (S, g) => (S.inv && S.inv[g]) | 0;
  const give = (S, g, n) => { S.inv = S.inv || {}; S.inv[g] = Math.max(0, (S.inv[g] | 0) + n); if (!S.inv[g]) delete S.inv[g]; };
  const WT = { letter: 0, horse: 0, tea: 0, crib: 0, book: 0.5, medicine: 0.2 };
  const load = (S) => Object.entries(S.inv || {}).reduce((a, [g, n]) => a + (WT[g] !== undefined ? WT[g] : 1) * n, 0);
  const cap = (S) => inv(S, 'horse') ? 60 : 20;
  function buy(S, place, g, n) { n = n || 1; if (g !== 'tea' && load(S) + (WT[g] !== undefined ? WT[g] : 1) * n > cap(S)) return [false, `Your pack is full (${Math.round(load(S))} of ${cap(S)}${inv(S, 'horse') ? '' : '; a horse would carry more'}).`]; const p = Math.round(price(S, place, g) * n * (1 - Math.min(0.1, Math.max(0, repOf(S, place)) * 0.01))); if (S.cash < p) return [false, `You have not got ${p} wen.`]; S.cash -= p; give(S, g, n); return [true, `Bought ${GOODS[g][1]} for ${p} wen.`]; }
  function sell(S, place, g, n) { n = n || 1; if (inv(S, g) < n) return [false, 'You have none to sell.']; const q = (S.quality && S.quality[g]) || 1, p = Math.round(price(S, place, g) * 0.7 * q) * n; S.cash += p; give(S, g, -n); return [true, `Sold ${GOODS[g][1]} for ${p} wen.`]; }

  // ---------------- the forge: what you can make, from what, in how long ----------------
  const RECIPES = { nails: [1, 2, 0], hoe: [3, 4, 10], knife: [2, 4, 25], sword: [6, 8, 50] }; // iron, hours, smithing needed
  function craft(S, what) { const R = RECIPES[what]; if (!R) return [false, '']; if ((S.smith || 0) < R[2]) return [false, `You are not smith enough for ${GOODS[what][1]} yet (smithing ${Math.round(S.smith || 0)} of ${R[2]}).`];
    if (inv(S, 'iron') < R[0]) return [false, `It takes ${R[0]} jin of iron. You have ${inv(S, 'iron')}.`];
    give(S, 'iron', -R[0]); give(S, what, 1); const q = 0.7 + (S.smith || 0) / 100; S.quality = S.quality || {}; S.quality[what] = +((S.quality[what] || q) * 0.5 + q * 0.5).toFixed(2); S.smith = Math.min(100, (S.smith || 0) + 1.2 + R[1] * 0.2);
    return [true, `${R[1]} hours at the anvil: ${GOODS[what][1]}. Smithing ${Math.round(S.smith)}.`, R[1]]; }

  // ---------------- paid work ----------------
  // [key, where (trade of who pays), what you need, hours, pay, what it does to you, words]
  const JOBS = [
    ['porter', 'porter', (S) => S.health > 40, 4, 40, (S) => { S.arms += 0.3; S.health -= 3; }, 'Four hours carrying loads from the market to the gate.'],
    ['copy', 'scribe', (S) => S.learning >= 30, 3, 60, (S) => { S.learning = Math.min(100, S.learning + 0.4); }, 'Three hours copying letters and plaints.'],
    ['field', 'farmer', () => true, 5, 35, (S) => { S.health -= 2; }, 'Five hours in the fields.'],
    ['tutor', 'candidate', (S) => S.status !== 'none' && S.status !== 'tongsheng', 3, 120, (S) => { S.learning = Math.min(100, S.learning + 0.3); }, 'Three hours teaching a merchant\'s sons their characters.'],
    ['tutor', 'clothier', (S) => S.status !== 'none' && S.status !== 'tongsheng', 3, 150, (S) => { S.learning = Math.min(100, S.learning + 0.3); }, 'Three hours teaching the cloth merchant\'s sons.'],
    ['smithy', 'ironmonger', (S) => (S.smith || 0) >= 20, 4, 90, (S) => { S.smith = Math.min(100, (S.smith || 0) + 0.8); }, 'Four hours at another man\'s forge.'],
  ];
  function jobsFor(S, trade) { return JOBS.filter(j => j[1] === trade && j[2](S)); }
  function work(S, j) { S.cash += j[4]; j[5](S); S.health = Math.max(5, Math.min(100, S.health)); return [true, `${j[6]} +${j[4]} wen.`, j[3]]; }

  // ---------------- people: liking, gifts, letters carried ----------------
  function relOf(S, k) { return (S.rel && S.rel[k]) | 0; }
  function addRel(S, k, n) { S.rel = S.rel || {}; S.rel[k] = Math.max(-100, Math.min(100, (S.rel[k] | 0) + n)); }
  function giftTo(S, k, g) { if (!inv(S, g)) return [false, 'You have nothing of that to give.']; give(S, g, -1); const v = GOODS[g][2]; const n = Math.max(3, Math.min(25, Math.round(v / 12))); addRel(S, k, n); return [true, n >= 15 ? 'He is moved.' : n >= 8 ? 'He is pleased.' : 'He takes it with a nod.']; }
  // a man with family elsewhere asks you to carry a letter there; the one it is for pays the carrier
  function letterAsk(S, f) { if (!S.folk) return null; if ((S.letters || []).some(L => L.from === f.k)) return null; const r = rngFor(S, f.k.charCodeAt(1) + 3);
    const far = Object.values(S.folk).filter(o => o.alive && o.place !== f.place && o.k !== f.k && o.place !== 'county'); if (!far.length || r() > 0.5) return null; const to = pick(r, far);
    return { from: f.k, to: to.k, place: to.place, pay: 30 + Math.floor(r() * 50) }; }
  function letterTake(S, L) { S.letters = (S.letters || []).concat([L]); give(S, 'letter', 1); }
  function letterDeliver(S, f) { const L = (S.letters || []).find(x => x.to === f.k); if (!L) return null; S.letters = S.letters.filter(x => x !== L); give(S, 'letter', -1); S.cash += L.pay; addRel(S, f.k, 12); addRel(S, L.from, 10); return L; }
  // the matchmaker: a wife from a family of the place, for a fee and the betrothal gifts
  function matchOffer(S) { if (S.spouse || age(S, S.born) < 17) return null; const r = rngFor(S, 99); const s = pick(r, SUR), g = pick(r, GF); return { zh: `${s[0]}${g[0]}`, en: `${s[1]} ${g[1]}`, gifts: 2400 + Math.floor(r() * 2400), fee: 300, from: pick(r, ['a farmer\'s family of Lijia', 'a cloth merchant\'s house', 'a soldier\'s widow\'s daughter', 'the miller\'s family']) }; }
  function marry(S, o) { if (S.cash < o.gifts + o.fee) return [false, `The betrothal gifts and the matchmaker's fee come to ${o.gifts + o.fee} wen.`]; S.cash -= o.gifts + o.fee; S.spouse = { zh: o.zh, en: o.en, since: S.day }; return [true, `You are married to ${o.en}. She comes to live in your father's house.`]; }

  // ---------------- the townsfolk's lives: one day ----------------
  function folkDay(S) {
    if (!S.folk) return []; const r = rngFor(S, 5), out = [];
    for (const k in S.folk) { const f = S.folk[k]; if (!f.alive) continue; const a = age(S, f.born);
      const pDie = a > 70 ? 0.0009 : a > 58 ? 0.00035 : 0.00006 * (season(S.day) === 'winter' ? 2 : 1) * (S.day >= D(1619, 3, 5) && LIAO[f.place] ? 1.6 : 1);
      if (r() < pDie) { f.alive = 0; f.died = S.day; f.how = a > 58 ? 'of old age' : 'of a fever'; out.push([f, `${f.zh}死了。`, `${f.en} has died ${f.how}.`]); continue; }
      if (r() < 0.00015 && !f.spouse && a > 17 && a < 40) { f.spouse = 1; out.push([f, `${f.zh}娶親了。`, `${f.en} is married.`]); } }
    return out; }
  // what history does to the townsfolk on its days
  function folkHistory(S, key) { if (!S.folk) return []; const r = rngFor(S, 11), out = [], all = Object.values(S.folk).filter(f => f.alive);
    if (key === 'levy') for (const f of all) if (LIAO[f.place] && (f.trade === 'farmer' || f.trade === 'porter' || f.trade === 'carter') && age(S, f.born) < 40 && r() < 0.4) { f.drafted = 1; f.trade = 'soldier'; f.work = 'yard'; f.place = 'liaoyang'; out.push([f, `${f.zh}被徵去當兵了。`, `${f.en} has been taken for the army.`]); }
    if (key === 'sarhu' || key === 'liuting') for (const f of all) if (f.drafted && r() < 0.35) { f.alive = 0; f.died = S.day; f.how = key === 'sarhu' ? 'at Sarhu' : 'at Abudali'; out.push([f, `${f.zh}死在${key === 'sarhu' ? '薩爾滸' : '阿布達里岡'}了。`, `${f.en} died ${f.how}.`]); }
    if (key === 'fushun') for (const f of all) if (f.place === 'fushun' && f.trade !== 'jurchen') { if (r() < 0.25) { f.alive = 0; f.died = S.day; f.how = 'when Fushun fell'; } else if (r() < 0.6) { f.place = 'liaoyang'; f.trade = 'refugee'; f.work = pick(r, TR.refugee.work); out.push([f, `${f.zh}從撫順逃到遼陽了。`, `${f.en} has fled from Fushun to Liaoyang.`]); } else { f.jin = 1; } }
    if (key === 'liaoyangfall') for (const f of all) if (f.place === 'liaoyang' || f.place === 'lijia') { const x = r(); if (x < 0.15) { f.alive = 0; f.died = S.day; f.how = 'when Liaoyang fell'; } else if (x < 0.5) { f.place = pick(r, ['shanhai', 'beijing']); f.trade = 'refugee'; f.work = pick(r, TR.refugee.work); out.push([f, `${f.zh}逃到關內了。`, `${f.en} has fled inside the Wall.`]); } else f.jin = 1; }
    return out; }

  // ---------------- the hard choices: history puts them in front of you on its dates ----------------
  // when(S): whether it is now; opts: [question, what happens (words), fx(S)]; once each
  const DIL = [
    { k: 'refugees', when: (S) => S.place === 'lijia' && S.day >= D(1618, 4, 17) && S.day < D(1618, 5, 20), title: ['撫順來的人', 'People from Fushun'],
      text: [['（天亮的時候，門口坐著一家人：一個男人，一個女人，兩個孩子。男人的腿上裹著血布。）', '(At first light there is a family sitting at your door: a man, a woman, two children. The man\'s leg is wrapped in a bloody cloth.)'], ['男人：撫順陷了。我們走了三天。給口吃的吧。', 'The man: Fushun has fallen. We walked for three days. Something to eat.']],
      opts: [['Take them in: there is room in the shed', 'They stay a month. The boy, Shitou, works the bellows for your father and follows you everywhere.', (S) => { S.cash -= 200; S.flags.shitou = 1; S.karma = (S.karma | 0) + 2; }],
        ['Give them a dou of rice and send them on to Liaoyang', 'They thank you and go on toward Liaoyang.', (S) => { S.cash -= 40; S.karma = (S.karma | 0) + 1; }],
        ['Shut the door. Everyone is hungry this spring', 'You hear them go on down the road.', (S) => { S.karma = (S.karma | 0) - 1; }]] },
    { k: 'quota', when: (S) => S.place === 'lijia' && S.day >= D(1618, 5, 2) && S.day < D(1618, 7, 1) && !S.army, title: ['派兵', 'The levy quota'],
      text: [['吳里長：遼陽要兵，咱們堡出兩個。名冊上……有你爹。', 'Headman Wu: Liaoyang wants men. This village sends two. The list... your father is on it.'], ['（你爹在打鐵，沒有停下來。）', '(Your father is at the anvil. He does not stop.)']],
      opts: [['Go in his place', 'You walk to Liaoyang the next morning and put your thumbprint on the roll.', (S) => { S.army = { r: 0, col: 'liu', unit: 'Liaoyang levy, Liu Ting\'s east column', since: S.day }; S.flags.forFather = 1; S.place = 'liaoyang'; S.from = 'lijia'; }],
        ['Pay for a substitute (2,400 wen)', 'Headman Wu finds a landless man who will go for the money.', (S) => { S.cash -= 2400; S.flags.substitute = 1; }],
        ['Slip the headman something to strike his name (800 wen)', 'Your father\'s name is struck off. Zhao Laosan\'s son goes instead.', (S) => { S.cash -= 800; S.flags.bribedWu = 1; S.karma = (S.karma | 0) - 2; }],
        ['Say nothing', 'Your father goes to Liaoyang in the fifth month.', (S) => { S.flags.fatherDrafted = 1; }]] },
    { k: 'gouer', when: (S) => S.place === 'lijia' && S.day >= D(1618, 6, 1) && S.day < D(1618, 9, 1), title: ['狗兒要當兵', 'Gou\'er wants to enlist'],
      text: [['狗兒：鐵子哥！我要去遼陽當兵！一兩八錢一個月！', 'Gou\'er: Brother Tie! I\'m going to Liaoyang to be a soldier! A tael and eight a month!'], ['（他十二歲。）', '(He is twelve.)']],
      opts: [['Tell him he is too young, and box his ears', 'He sulks for a week. He stays.', (S) => { S.flags.gouStays = 1; }], ['Let him go: it is his life', 'He goes. They take him as a drummer boy.', (S) => { S.flags.gouGoes = 1; }]] },
    { k: 'hoard', when: (S) => S.place === 'liaoyang' && S.day >= D(1618, 9, 1) && S.day < D(1619, 1, 1) && S.cash >= 1000, title: ['囤糧', 'The grain hoarder'],
      text: [['一個糧商把你拉到一邊：大軍明春出征，糧價還要漲一倍。你出一千文，開春還你兩千五。', 'A grain dealer takes you aside: the army marches in spring, and grain will double again. Put in a thousand wen; in spring I give you back two and a half thousand.']],
      opts: [['Put in a thousand', 'He writes you a note.', (S) => { S.cash -= 1000; S.flags.hoard = S.day; S.karma = (S.karma | 0) - 1; }],
        ['Report him to the Commission', 'The runners take him the next day. You are given a reward of 300 wen.', (S) => { S.cash += 300; S.karma = (S.karma | 0) + 1; }], ['Walk away', 'He shrugs.', () => { }]] },
    { k: 'fever', when: (S) => S.place === 'lijia' && season(S.day) === 'winter' && S.day >= D(1618, 12, 1) && S.day < D(1619, 2, 1) && !S.flags.fatherDrafted, title: ['你爹病了', 'Your father is sick'],
      text: [['（你爹咳了半個月，昨天起不來床了。）', '(Your father has coughed for half a month. Since yesterday he cannot get out of bed.)'], ['你娘：鐵兒，去遼陽請郎中吧。', 'Your mother: Tie, go to Liaoyang for the physician.']],
      opts: [['Buy medicine (150 wen) and fetch the physician', 'The physician comes, bleeds him, leaves a bitter tea. In ten days he is at the anvil again.', (S) => { S.cash -= 150; S.flags.fatherWell = 1; }],
        ['Pray at the shrine and make him broth', (S) => S.flags.fatherWell ? 'On the sixth day the fever breaks. He asks for his hammer.' : 'He grows weaker. Your mother has stopped speaking of the physician.', (S) => { if (rngFor(S, 4)() < 0.5) S.flags.fatherWell = 1; else S.flags.fatherDies = S.day + 12; }],
        ['There is no money. Let it run its course', (S) => S.flags.fatherWell ? 'You sit up with him at night. In the second week he can sit up.' : 'You sit up with him at night. He does not get better.',(S) => { if (rngFor(S, 6)() < 0.35) S.flags.fatherWell = 1; else S.flags.fatherDies = S.day + 10; }]] },
    { k: 'pension', when: (S) => (S.place === 'lijia' || S.place === 'liaoyang') && S.day >= D(1619, 3, 12) && S.day < D(1619, 6, 1) && S.learning >= 30, title: ['撫恤', 'The death pension'],
      text: [['趙老三的老婆找到你：俺兒子死在薩爾滸了。官府說有撫恤銀，要寫呈子。你識字，替我寫吧。', 'Zhao Laosan\'s wife finds you: My son died at Sarhu. The yamen says there is a pension for the dead, but you must write a petition. You can write. Write it for me.']],
      opts: [['Write it, and walk it to the Commission yourself', 'Three weeks later she is paid four taels. She brings you a basket of eggs.', (S) => { S.karma = (S.karma | 0) + 2; S.learning += 0.5; }], ['Write it for her to take', 'She takes it, and you never hear if she was paid.', (S) => { S.karma = (S.karma | 0) + 1; }], ['Say you are too busy', 'She goes to the letter-writer, who charges her a hundred wen.', () => { }]] },
    { k: 'deserters', when: (S) => S.place === 'lijia' && S.day >= D(1619, 3, 15) && S.day < D(1619, 5, 1), title: ['逃兵', 'Deserters'],
      text: [['（夜裡兩個兵敲你家的後門。他們身上還穿著號衣，一個人的手指少了兩根。）', '(At night two soldiers knock at your back door. They still have their tunics on; one is missing two fingers.)'], ['他們：我們從薩爾滸回來的。官府在抓逃兵，抓到就砍頭。藏我們一夜。', 'They: We came back from Sarhu. They are hunting deserters; caught, we lose our heads. Hide us one night.']],
      opts: [['Hide them in the charcoal shed', 'They are gone before dawn. One of them leaves you his knife.', (S) => { S.inv = S.inv || {}; S.inv.knife = (S.inv.knife | 0) + 1; S.karma = (S.karma | 0) + 1; S.flags.hidDeserters = 1; }],
        ['Give them food and send them on', 'They eat standing and go.', (S) => { S.cash -= 20; }], ['Go to the headman', 'The runners come at dawn. You are given 300 wen; you do not watch what happens to them.', (S) => { S.cash += 300; S.karma = (S.karma | 0) - 2; }]] },
    { k: 'betrothal', when: (S) => S.place === 'lijia' && S.day >= D(1620, 2, 1) && S.day < D(1620, 6, 1), title: ['二妞的親事', 'A match for Erniu'],
      text: [['你娘：媒婆來了。磨坊老孫家的兒子，看上二妞了。彩禮四千文。', 'Your mother: The matchmaker came. Old Sun the miller\'s son wants Erniu. Four thousand wen in betrothal gifts.'], ['二妞：我才九歲。', 'Erniu: I\'m only nine.']],
      opts: [['Agree: the gifts will feed the house through the winter', 'The betrothal is made; she will go to the Suns when she is fifteen.', (S) => { S.cash += 4000; S.flags.erniuBetrothed = 1; }], ['Refuse: she is a child', 'Your mother sighs. Erniu hugs your leg.', (S) => { S.karma = (S.karma | 0) + 1; }]] },
    { k: 'cheat', when: (S) => S.place === 'city' && (S.status === 'shengyuan' || S.status === 'juren') && [D(1618, 8, 1), D(1619, 2, 1), D(1621, 8, 1), D(1622, 2, 1)].some(d => S.day >= d && S.day < d + 8), title: ['關節', 'A word in the examiner\'s ear'],
      text: [['一個會館裡的人低聲說：今科主考的門生，可以通關節。五十兩，保你中。', 'A man at the lodging-house says quietly: a pupil of this year\'s chief examiner can pass a word. Fifty taels, and you are on the list.']],
      opts: [['Pay (40,000 wen)', 'He takes the money. "Write 天下歸仁 at the end of your second answer."', (S) => { S.cash -= 40000; S.flags.cheat = S.day; }], ['Refuse', 'He laughs. "Then good luck."', () => { }], ['Report him to the proctor', 'He is gone from the lodging-house by evening. The proctor notes your name.', (S) => { S.karma = (S.karma | 0) + 1; S.flags.honest = 1; }]] },
    { k: 'flee', when: (S) => (S.place === 'liaoyang' || S.place === 'lijia') && S.day >= D(1621, 3, 14) && S.day < D(1621, 3, 20), title: ['瀋陽丟了', 'Shenyang has fallen'],
      text: [['瀋陽丟了。奴兒哈赤的兵五天就能到遼陽城下。', 'Shenyang is lost. Nurhaci\'s army can be under the walls of Liaoyang in five days.'], ['你娘：走吧。往西走，進關。', 'Your mother: Let\'s go. West, inside the Wall.']],
      opts: [['Take the family west now', 'You load the cart that night. Twelve days later you are at the Shanhai Pass with ten thousand others.', (S) => { S.place = 'shanhai'; S.from = 'liaoyang'; S.day += 12; S.flags.fled = 1; S.army = null; }],
        ['Stay and fight for Liaoyang', 'You go to the walls.', (S) => { S.flags.fallHere = 1; S.place = 'liaoyang'; }],
        ['Stay home and keep your head down', 'You bury the silver under the forge.', (S) => { S.flags.stayJin = 1; }]] },
  ];
  DIL.push({ k: 'xiong', when: (S) => S.army && S.place === 'liaoyang' && S.day >= D(1619, 8, 5) && S.day < D(1619, 9, 1), title: ['熊經略閱兵', 'Commissioner Xiong reviews the troops'],
      text: [['（熊廷弼騎馬從隊列前走過，一個一個看。他在一個沒有刀的兵前面停下來。）', '(Xiong Tingbi rides down the ranks, looking at every man. He stops in front of a soldier who has no sword.)'], ['熊廷弼：刀呢？', 'Xiong Tingbi: Where is your sword?'], ['那兵：……賣了。三個月沒發餉。', 'The soldier: ...Sold it. No pay for three months.']],
      opts: [['Step out and say the officers sell the rations', 'Xiong has the company commander flogged in front of the ranks and pays the company from his own baggage. Your officers will not forget you.', (S) => { S.karma = (S.karma | 0) + 2; S.cash += 1440; S.flags.officerHates = 1; }],
        ['Stand straight and show your own blade', (S) => S.arms >= 30 ? 'He looks at your blade and your stance and gives you a tael with his own hand.' : 'He looks at your stance and moves on without a word.', (S) => { if (S.arms >= 30) S.cash += 800; }],
        ['Keep your eyes front', 'The soldier with no sword gets forty strokes.', () => { }]] });
  DIL.push({ k: 'maocall', when: (S) => S.place === 'shanhai' && S.day >= D(1621, 4, 10) && S.day < D(1621, 5, 15), title: ['毛文龍招兵', 'Mao Wenlong is raising men'],
      text: [['毛文龍：遼東還有幾十萬漢人在韃子手裡。我帶二百人從海上回去，打鎮江。誰跟我走？', 'Mao Wenlong: There are hundreds of thousands of Han people in Liaodong in Jin hands. I am going back by sea with two hundred men, to take Zhenjiang. Who comes with me?']],
      opts: [['Go with him (the East River campaign continues your life)', 'You go down to the boats.', (S) => { S.flags.toMao = 1; }], ['Stay inside the Wall', 'He finds his two hundred without you.', () => { }]] });
  // ---------------- the family's own turning points ----------------
  const atHome = (S) => S.place === (S.home || 'lijia') && S.home !== 'jin';
  DIL.push({ k: 'feet', when: (S) => atHome(S) && S.day >= D(1618, 6, 1) && S.day < D(1619, 6, 1) && !(S.dead && S.dead.erniu), title: ['纏足', 'Erniu\'s feet'],
      text: [['你娘：二妞七歲了，再不纏腳就晚了。大腳的姑娘，誰家要？', 'Your mother: Erniu is seven. If we don\'t bind her feet now it will be too late. Who will marry a girl with big feet?'], ['（二妞躲在你身後。）', '(Erniu hides behind you.)']],
      opts: [['Let your mother bind them', 'For a year Erniu cannot walk without crying. Then she learns to walk the way the other girls walk.', (S) => { S.flags.erniuBound = 1; S.xiao = (S.xiao | 0) + 1; }],
        ['Stand against your mother: "Let her keep her feet"', 'Your mother does not speak to you for three days. Erniu runs to the fields with the boys.', (S) => { S.flags.erniuFree = 1; S.xiao = (S.xiao | 0) - 1; S.karma = (S.karma | 0) + 1; }]] });
  DIL.push({ k: 'erniuwed', when: (S) => atHome(S) && S.day >= D(1626, 3, 1) && !(S.dead && S.dead.erniu) && !(S.flags.erniuWait && S.day - S.flags.erniuWait < 360), title: ['二妞出嫁', 'Erniu marries'],
      text: [['', 'Erniu is fifteen. ' + 'The match must be made this year.']],
      opts: [['Marry her into a good family, with a proper dowry (3000 wen)', 'She goes in a red sedan chair, crying as a bride must. She is happy, you think.', (S) => { S.cash -= 3000; S.flags.erniuWed = 1; S.karma = (S.karma | 0) + 1; }],
        ['Marry her to whoever asks with no dowry', 'She goes to a farmer twice her age. She does not cry.', (S) => { S.flags.erniuWed = 1; S.karma = (S.karma | 0) - 1; }],
        ['Keep her at home another year', 'People begin to talk.', (S) => { S.dil.erniuwed = 0; S.flags.erniuWait = S.day; }]] });
  DIL.push({ k: 'school', when: (S) => atHome(S) && S.kids && S.kids.some(k => k.boy && DT(S.day).y - k.born >= 6), title: ['送兒子讀書', 'Your son\'s schooling'],
      text: [['', 'Your son is six. The village schoolmaster takes boys for 500 wen a year and a gift at the festivals.']],
      opts: [['Send him to school (500 wen)', 'He comes home the first day able to write 人 and 大 and 天.', (S) => { S.cash -= 500; S.flags.sonSchool = 1; }], ['Keep him at home to help', 'He is a good help.', () => { }]] });
  DIL.push({ k: 'mourn', when: (S) => S.office && S.flags.parentDied > (S.office.since | 0) && S.flags.parentDied > (S.flags.mournFor | 0), title: ['丁憂', 'A parent\'s death and the law of mourning'],
      text: [['', 'An official whose parent dies must leave office and mourn for twenty-seven months (丁憂). There is no exception without an imperial order. To hide the death (匿喪) is a crime.']],
      opts: [['Report it and go home to mourn', 'You hand in your seal and go home in coarse hemp. In twenty-seven months you may ask the Ministry for a new post.', (S) => { S.flags.mournFor = S.flags.parentDied; delete S.dil.mourn; S.flags.mourning = S.day + 810; S.flags.wasOffice = S.office; S.office = null; S.xiao = (S.xiao | 0) + 4; }],
        ['Hide it, and stay in office', (S) => S.flags.hidMourn === 2 ? 'A censor finds out. You are dismissed, and your name is a byword for an unfilial son.' : 'Nobody finds out. Yet.', (S) => { S.flags.mournFor = S.flags.parentDied; delete S.dil.mourn; S.xiao = (S.xiao | 0) - 6; if (Math.random() < 0.35) { S.flags.hidMourn = 2; S.office = null; } else S.flags.hidMourn = 1; }]] });
  // ---------------- under the Jin ----------------
  const jinLand = (S) => (S.place === 'lijia' || S.place === 'liaoyang') && S.day >= D(1621, 3, 21) && S.flags.stayJin;
  DIL.push({ k: 'shave', when: (S) => jinLand(S) && S.day >= D(1621, 3, 22), title: ['薙髮令', 'The order to shave'],
      text: [['（城門口貼著告示，旗兵拿著剃刀站在旁邊。）', '(A proclamation on the gate; bannermen with razors stand beside it.)'], ['告示：凡降民，皆薙髮。不薙者，以抗命論。', 'The proclamation: All who submit shall shave the head. Whoever does not is a rebel.']],
      opts: [['Kneel and let them shave you', 'The razor is cold. The front of your head is bare; what is left is plaited into a queue. You are a subject of the Khan.', (S) => { S.jin = 1; }],
        ['Run for the hills tonight and make for the Pass', 'Fifteen days through the hills, eating roots. You reach the Shanhai Pass with your hair and nothing else.', (S) => { S.place = 'shanhai'; S.from = 'liaoyang'; S.day += 15; S.cash = Math.floor(S.cash / 3); S.health -= 25; S.flags.stayJin = 0; S.flags.fled = 1; S.home = (S.dead && S.dead.mother) ? 'shanhai' : 'jin'; }],
        ['Refuse, in front of them all', 'They do not argue. Your head goes up on the gate beside the proclamation.', (S) => { S.flags.diedFor = 'refused to shave his head under the Jin, in 1621'; S.health = 0; }]] });
  DIL.push({ k: 'manor', when: (S) => jinLand(S) && S.jin && S.day >= D(1621, 11, 1), title: ['編莊', 'The manors'],
      text: [['', 'By the Khan\'s order the Han households are put under Jurchen masters: thirteen men to a manor (拖克索), the grain to the master, the men to his labour. A bannerman with a list stops at your gate.']],
      opts: [['Accept: you are his now', 'Half of what you earn goes to the bannerman. He is not cruel, only hungry.', (S) => { S.flags.jinManor = 1; }], ['Bribe the bannerman to leave your name off (1500 wen)', 'He takes the silver and writes another name.', (S) => { S.cash -= 1500; }],
        ['Run east to the coast, to Mao Wenlong', 'You go at night with nothing but a knife.', (S) => { S.flags.toMao = 1; }]] });
  DIL.push({ k: 'grainpurge', when: (S) => jinLand(S) && S.jin && S.day >= D(1623, 6, 1), title: ['查糧', 'The grain search'],
      text: [['', 'The Khan has ordered that Han who hide grain or plot are to be killed. Your neighbour Zhao Laosan has two sacks buried under his kang; his little girls will starve without them. The bannermen are going house to house.']],
      opts: [['Help him move the sacks to your forge', 'The bannermen look in your forge and see only coal. Zhao\'s girls live through the winter.', (S) => { S.karma = (S.karma | 0) + 3; if (Math.random() < 0.2) S.health -= 30; }], ['Keep out of it', 'They find the sacks. Zhao Laosan is taken away.', (S) => { S.dead = S.dead || {}; S.dead.farmer1 = 1; }], ['Tell the bannermen, and be rewarded', 'You are given one of the sacks. Zhao Laosan is beheaded the same day.', (S) => { S.karma = (S.karma | 0) - 4; S.dead = S.dead || {}; S.dead.farmer1 = 1; S.cash += 600; }]] });
  DIL.push({ k: 'serveJin', when: (S) => jinLand(S) && S.jin && !S.army && S.day >= D(1622, 2, 1) && S.day < D(1626, 1, 1), title: ['漢軍', 'The Han troops'],
      text: [['', 'Li Yongfang, who surrendered Fushun and married a granddaughter of the Khan, is raising Han soldiers for the Jin. Pay, rations, no manor master. Your old neighbours would call it treason.']],
      opts: [['Serve the Jin', 'You are given a Jin tunic and a spear.', (S) => { S.army = { r: 0, col: 'jin', unit: 'the Han troops under Li Yongfang', since: S.day }; S.karma = (S.karma | 0) - 1; }], ['Refuse', 'You stay at your forge.', () => { }]] });
  DIL.push({ k: 'jinexam', when: (S) => jinLand(S) && S.jin && S.day >= D(1629, 9, 1) && S.day < D(1629, 12, 1) && S.learning >= 30, title: ['天聰三年考試', 'The Khan\'s examination of 1629'],
      text: [['', 'Hong Taiji, the new Khan, has ordered that the Han scholars held as bondservants be examined; those who pass will be freed from their masters and given posts. You can still write.']],
      opts: [['Sit it', (S) => S.flags.jinPassed ? 'Two hundred pass, and you among them. You are freed, given two oxen and made a scribe (bithesi) of the Jin court.' : 'You do not pass.', (S) => { if (S.learning >= 42 || Math.random() < 0.3) { S.flags.jinPassed = 1; S.flags.jinManor = 0; S.office = { zh: '筆帖式', en: 'a scribe (bithesi) of the Jin court', rank: 30, since: S.day, jin: 1 }; } }], ['Stay a smith', 'You stay a smith.', () => { }]] });
  DIL.push({ k: 'grab', when: (S) => S.place === 'lijia' && S.day >= D(1620, 4, 1) && S.day < D(1621, 3, 1) && !(S.dead && S.dead.father) && S.home === 'lijia', title: ['佔地', 'The land grab'],
      text: [['你爹：佟家的人把咱家北坡那塊地的界石挪了。說是他家的。', 'Your father: The Tong family\'s men moved the boundary stones on our north slope. They say it\'s theirs.'], ['', 'The Tongs are rich, and the magistrate dines with them.']],
      opts: [['Write a plaint and take it to the yamen (300 wen in fees)', (S) => S.flags.grabWon ? 'The magistrate walks the field himself and finds for you. The Tongs\' steward glares at you in the market.' : 'The magistrate finds for the Tongs. Your father does not say anything for a week.', (S) => { S.cash -= 300; if (S.status !== 'none' || S.learning > 50 || Math.random() < 0.35) { S.flags.grabWon = 1; } else S.xiao = (S.xiao | 0) - 1; }],
        ['Bribe the yamen clerks (1500 wen)', 'The plaint goes to the top of the pile and the Tongs\' stones go back where they were.', (S) => { S.cash -= 1500; S.flags.grabWon = 1; S.karma = (S.karma | 0) - 1; }],
        ['Go with your father at night and move the stones back', (S) => S.flags.grabFight ? 'The Tongs\' men are waiting. Your father\'s arm is broken.' : 'The stones are back. The Tongs pretend not to notice.', (S) => { if (Math.random() < 0.4) { S.flags.grabFight = 1; S.health -= 15; } }], ['Let it go', 'Your father lets it go too. It is only a slope.', () => { }]] });
  function dilemmaNow(S) { for (const d of DIL) if (!(S.dil && S.dil[d.k]) && d.when(S)) return d; return null; }
  function dilemmaChoose(S, d, i) { S.dil = S.dil || {}; S.dil[d.k] = i + 1; const o = d.opts[i]; o[2](S); S.cash = Math.max(0, S.cash); return typeof o[1] === 'function' ? o[1](S) : o[1]; }

  // ---------------- the road ----------------
  // each day on the road, a chance of one of these; [key, when, title, text, opts]
  const ROAD = [
    ['bandits', (S) => true, ['響馬', 'Bandits'], [['（林子裡出來五個人，拿著棍子和刀。）', '(Five men come out of the trees with clubs and knives.)'], ['為首的：留下錢，留下命。', 'Their leader: Leave the money and keep your life.']],
      [['Hand over a third of your money', (S) => { const n = Math.floor(S.cash / 3); S.cash -= n; return `They take ${n} wen and let you go.`; }],
        ['Fight', (S) => { const win = (S.arms + (S.inv && S.inv.sword ? 25 : S.inv && S.inv.knife ? 10 : 0) + (S.brothers && S.brothers.length ? 20 : 0)) / 100 + rngFor(S, 21)() * 0.5 > 0.55; if (win) { S.cash += 120; S.arms += 1; return 'You break the leader\'s arm and the rest run. In his bag: 120 wen.'; } S.health -= 35; S.cash -= Math.floor(S.cash / 2); return 'They beat you senseless and take half of what you have.'; }],
        ['Run', (S) => { if (rngFor(S, 22)() < 0.6) return 'You outrun them into the hills.'; S.cash -= Math.floor(S.cash / 4); return 'They catch your bag and you lose a quarter of your money.'; }]]],
    ['hungry', (S) => S.day >= D(1618, 4, 15), ['路邊', 'By the road'], [['（一個抱著孩子的女人坐在路邊。孩子不哭了。）', '(A woman with a child in her arms sits by the road. The child has stopped crying.)']],
      [['Give her 30 wen and your cakes', (S) => { S.cash -= 30; S.karma = (S.karma | 0) + 1; return 'She does not say anything. She holds the money in her fist.'; }], ['Walk on', () => 'You walk on.']]],
    ['candidate', (S) => S.status !== 'none' || S.learning > 35, ['同路', 'A fellow traveller'], [['一個背著書箱的書生：兄台也是去京師的？同行吧，路上好說話。', 'A scholar with a book-box on his back: Going to the capital too, brother? Let\'s walk together.']],
      [['Walk with him and talk about the classics', (S) => { S.learning = Math.min(100, S.learning + 1.5); S.friends = (S.friends || []).concat(['a scholar from Yongping']); return 'You argue about Zhu Xi for three days. You know Mencius better at the end of it.'; }], ['Keep your own pace', () => 'You let him go on ahead.']]],
    ['press', (S) => !S.army && S.status === 'none' && S.day < D(1621, 4, 1) && age(S, S.born) < 40, ['抓壯丁', 'The press-gang'], [['一隊兵攔住你：哪兒的？跟我們走，遼東缺人。', 'A squad of soldiers stops you: Where are you from? Come with us, Liaodong needs men.']],
      [['Slip the sergeant 200 wen', (S) => { S.cash -= 200; return 'He pockets it and waves you on.'; }], ['Go with them', (S) => { S.army = { r: 0, col: 'liu', unit: 'a pressed company of the Liaodong army', since: S.day }; return 'You are a soldier now.'; }],
        ['Show them you can read: "I am going to sit the examinations"', (S) => S.learning >= 35 ? 'The sergeant squints at your characters and lets you go.' : (S.army = { r: 0, col: 'liu', unit: 'a pressed company of the Liaodong army', since: S.day }, 'You cannot write your own name well enough to convince him. You are a soldier now.')]]],
    ['monk', () => true, ['雲遊僧', 'A wandering monk'], [['一個雲遊和尚：施主，結個緣吧。', 'A wandering monk: Benefactor, make an offering?']], [['Give 20 wen', (S) => { S.cash -= 20; S.luck = 3; S.luckTo = S.day + 30; return 'He reads your face. "You will pass through a gate you thought shut."'; }], ['Shake your head', () => 'He bows and goes on.']]],
    ['jinpatrol', (S) => S.day >= D(1621, 3, 21), ['韃子', 'A Jin patrol'], [['（遠處的山坡上，一隊騎兵，頭上剃得精光。）', '(On the slope ahead, a troop of horsemen, their heads shaved.)']], [['Hide in the ditch until they pass', (S) => rngFor(S, 31)() < 0.75 ? 'They ride past.' : (S.health -= 20, 'One of them sees you and rides you down with his lance-butt for sport.')], ['Go back the way you came a day', (S) => { S.day += 1; return 'You lose a day.'; }]]],
  ];
  function roadDay(S) { const r = rngFor(S, 41); if (r() > 0.22) return null; const ok = ROAD.filter(e => e[1](S)); return ok.length ? pick(r, ok) : null; }

  // ---------------- the temple and the teahouse ----------------
  const STICKS = [['上上', 'Highest fortune', '鯉魚躍過龍門去，平地一聲雷。', 'The carp leaps the Dragon Gate: a clap of thunder on level ground.', 6], ['上', 'Good fortune', '春風得意馬蹄疾。', 'The spring wind at your back, your horse\'s hooves fly.', 4], ['中上', 'Fair, rising', '積土成山，風雨興焉。', 'Pile up earth and a mountain rises; wind and rain come of it.', 2],
    ['中', 'Middling', '守得雲開見月明。', 'Wait out the clouds and the moon will show.', 0], ['中', 'Middling', '行船偏遇頂頭風。', 'The boat sets out and meets a headwind.', -1], ['中下', 'Fair, falling', '畫虎不成反類犬。', 'You set out to paint a tiger and it came out a dog.', -2], ['下', 'Ill fortune', '屋漏偏逢連夜雨。', 'The roof leaks, and it rains every night.', -4], ['下下', 'Worst fortune', '城門失火，殃及池魚。', 'The city gate burns, and the fish in the moat die of it.', -6]];
  function drawStick(S) { const r = rngFor(S, 51); const s = STICKS[Math.min(STICKS.length - 1, Math.floor(r() * r() * STICKS.length * 1.4))]; S.luck = s[4]; S.luckTo = S.day + 30; return s; }
  const TALES = [['華容道', 'Huarong Pass', 'Guan Yu lets Cao Cao go at Huarong, for an old kindness, though it may cost him his head.'], ['空城計', 'The Empty Fort', 'Zhuge Liang sits on the wall and plays the zither with the gates open, and Sima Yi\'s army turns back.'],
    ['戚家軍', 'The Qi Family Army', 'General Qi Jiguang drills miners from Yiwu into the mandarin-duck formation and they never lose to the Japanese pirates.'], ['岳飛', 'Yue Fei', 'Twelve gold tablets call Yue Fei back from the north, and Qin Hui has him killed on a charge of "perhaps".'],
    ['武松打虎', 'Wu Song and the Tiger', 'Wu Song drinks eighteen bowls at Jingyang Ridge and kills the tiger with his fists.'], ['木蘭從軍', 'Mulan', 'Mulan takes her father\'s place in the army and serves twelve years before anyone knows.'],
    ['洪武起兵', 'The Founder', 'A beggar monk of Fengyang drives the Mongols from the empire and founds this dynasty.'], ['鄭和下西洋', 'Zheng He', 'The eunuch admiral sails the treasure fleet to the edge of the western ocean, seven times.']];
  function tale(S) { const r = rngFor(S, 61); return pick(r, TALES); }
  function dice(S, bet) { if (S.cash < bet) return [false, 'You have not got the stake.']; const r = rngFor(S, 71 + (S.diceN = (S.diceN | 0) + 1)); const a = 1 + Math.floor(r() * 6), b = 1 + Math.floor(r() * 6), c = 1 + Math.floor(r() * 6); const big = a + b + c >= 11, mine = r() < 0.5;
    const won = big === mine && !(a === b && b === c); S.cash += won ? bet : -bet; return [won, `${a}, ${b}, ${c}: ${a + b + c}, ${big ? 'big' : 'small'}. You called ${mine ? 'big' : 'small'}. ${won ? `You win ${bet}.` : `You lose ${bet}.`}`]; }

  // ---------------- office: the magistrate's court ----------------
  // [title, the case, opts: [what you do, repute (民望), standing with superiors, cash, words]]
  const CASES = [
    ['爭界', 'A boundary', 'Two farmers both claim a strip of land between their fields; the boundary stone has been moved in the night.', [['Walk the fields yourself and set the stone by the old tax register', 3, 1, 0, 'Both grumble; neither can say it is wrong.'], ['Split the strip between them', 1, 0, 0, 'They go away equally dissatisfied.'], ['Take the richer man\'s 300 wen and find for him', -3, 0, 300, 'The poorer man kneels in the yard until dark.']]],
    ['偷牛', 'The stolen ox', 'A widow\'s son is accused of stealing an ox. The ox was found in his shed; he says it wandered in.', [['Have the ox walked home from the shed: if it knows its way, it was led', 3, 1, 0, 'The ox goes straight to the accuser\'s gate. The boy is released.'], ['Have him beaten twenty strokes to get the truth', -2, 1, 0, 'He confesses at twelve. The village says he was innocent.'], ['Fine the widow and close the case', -1, 1, 50, 'It is quick, at least.']]],
    ['人命', 'A death', 'A landlord\'s son has beaten a servant to death. The family offers 2,000 wen "for the funeral" and asks you to call it an illness.', [['Try him for homicide and send the case up', 4, -1, 0, 'The landlord has friends in the prefecture. Your evaluation will suffer for it.'], ['Take the money and record an illness', -5, 1, 2000, 'The servant\'s mother curses your gate.'], ['Make the family pay the servant\'s mother 2,000 and close it', 2, 0, 0, 'Half justice. She takes the money.']]],
    ['欠稅', 'Arrears', 'A village is two years behind on its taxes and the prefecture wants the money now; the village had a hailstorm last year.', [['Remit and report the hail to the prefecture', 4, -2, 0, 'The village sets up an incense table for you. The prefect is displeased.'], ['Send the runners to collect with the bamboo', -4, 2, 0, 'You meet your quota.'], ['Collect half, report half lost to hail', 2, 0, 0, 'Everyone is a little unhappy.']]],
    ['盜案', 'Bandits', 'A merchant was robbed on the county road. The runners have brought in a vagrant who fits the description.', [['Question him carefully; send the runners back to the road', 2, 0, 0, 'Ten days later they catch the real gang. The vagrant is fed and released.'], ['Torture him until he confesses', -3, 1, 0, 'He confesses to everything, including things that did not happen.'], ['Sell the vagrant\'s release to his family for 200 wen', -3, 0, 200, 'He had no family; a monk pays.']]],
    ['分家', 'Brothers', 'Two brothers cannot agree how to divide their dead father\'s land; the elder says he cared for their father alone.', [['Give the elder a larger share for his filial care', 2, 1, 0, 'The younger accepts it in the end.'], ['Divide it exactly in half', 1, 0, 0, 'The elder will not speak to his brother again.'], ['Let them bid against each other in bribes', -4, 0, 400, 'You do well out of it.']]],
    ['遼餉', 'The Liaodong levy', 'An order comes: raise the Liaodong supplementary tax (遼餉) by nine li per mu, at once.', [['Raise it, and spread it fairly by the registers', 0, 2, 0, 'The county pays, and hates the war.'], ['Raise it, but let the gentry\'s land off lightly as they ask', -3, 2, 600, 'The gentry send you a banquet.'], ['Memorialise that the county cannot bear it', 3, -3, 0, 'The prefect returns your memorial with a note in red.']]],
  ];
  function caseNow(S) { const r = rngFor(S, 81); return CASES[Math.floor(r() * CASES.length)]; }
  function judge(S, c, i) { const o = c[3][i]; S.office.repute = (S.office.repute | 0) + o[1]; S.office.favor = (S.office.favor | 0) + o[2]; S.cash += o[3]; S.karma = (S.karma | 0) + Math.sign(o[1]); return o[4]; }
  // a year in office: the evaluation (考滿): promotion, a stay, or dismissal
  const LADDER = [['知縣', 'County Magistrate', 43], ['知州', 'Department Magistrate', 44], ['知府', 'Prefect', 46], ['按察副使', 'Surveillance Vice Commissioner', 47], ['布政使', 'Provincial Administration Commissioner', 48]];
  const LADDERS = { county: LADDER, hanlin: [['翰林院編修', 'Hanlin Compiler', 45], ['翰林院侍讀', 'Hanlin Reader-in-waiting', 46], ['詹事府少詹事', 'Junior Supervisor of the Heir\'s Household', 47], ['禮部右侍郎', 'Vice Minister of Rites', 48], ['東閣大學士', 'Grand Secretary of the Eastern Hall', 49]],
    censor: [['監察御史', 'Investigating Censor', 44], ['僉都御史', 'Assistant Censor-in-chief', 47], ['左副都御史', 'Vice Censor-in-chief', 48], ['左都御史', 'Censor-in-chief', 49]] };
  function evaluate(S) { const o = S.office; const LAD = LADDERS[o.lad || 'county']; const sc = (o.favor | 0) * 1.2 + (o.repute | 0) * 0.6 + (S.karma | 0) * 0.2 + (S.xiao | 0) * 0.3 + (S.flags.eunuchFaction && S.day >= D(1624, 6, 1) && S.day < D(1627, 9, 1) ? 4 : 0) + (S.flags.donglin && S.day >= D(1625, 1, 1) && S.day < D(1628, 1, 1) ? -5 : 0);
    o.repute = 0; o.favor = 0; const i = LAD.findIndex(l => l[0] === o.zh); if (i < 0) return 'Your year in office passes without remark.';
    if (sc >= 10 && (S.karma | 0) >= 4 && (o.lad || 'county') === 'county' && i <= 1) { const L = LADDERS.censor[0]; o.lad = 'censor'; o.zh = L[0]; o.en = L[1]; o.rank = L[2]; return `Your evaluation is excellent, and your name for honesty has reached the capital. You are made ${L[1]} (${L[0]}): a censor, the emperor's eyes and ears.`; }
    if (sc >= 6 && i < LAD.length - 1) { const L = LAD[i + 1]; o.zh = L[0]; o.en = L[1]; o.rank = L[2]; return `Your evaluation is excellent. You are promoted ${L[1]} (${L[0]}).`; }
    if (sc <= -6) { S.office = null; return 'Your evaluation is "incompetent". You are dismissed and go home.'; }
    return 'Your evaluation is "adequate". You stay in your post.'; }
  // memorials at court: what you can write in each year, and what it does to you
  const MEMOS = [
    { k: 'sarhu', from: D(1619, 3, 15), to: D(1619, 12, 1), title: 'On the defeat at Sarhu', opts: [['Impeach Yang Hao for the four-column plan', 'Yang Hao is already in prison. Your memorial is noted.', (S) => { S.office.favor = (S.office.favor | 0) + 1; }], ['Propose Xiong Tingbi for Liaodong, and defence before attack', 'Xiong Tingbi is appointed. You are remembered as one who saw it.', (S) => { S.office.favor = (S.office.favor | 0) + 2; }]] },
    { k: 'redpill', from: D(1620, 9, 5), to: D(1621, 6, 1), title: 'On the Red Pill', opts: [['Accuse the Grand Secretary Fang Congzhe of the late Emperor\'s death', 'Fang resigns. The Donglin men count you as one of theirs.', (S) => { S.flags.donglin = 1; }], ['Keep silent', 'You keep silent.', () => { }]] },
    { k: 'wei', from: D(1624, 6, 1), to: D(1626, 1, 1), title: 'On the eunuch Wei Zhongxian', opts: [['Sign Yang Lian\'s memorial of the twenty-four crimes', 'Yang Lian\'s memorial is answered with a reprimand. In 1625 the Eastern Depot comes for the men who signed it.', (S) => { S.flags.donglin = 1; S.flags.signedYang = 1; }],
      ['Write in praise of the Depositor of Loyalty', 'Wei Zhongxian\'s people remember your name kindly.', (S) => { S.flags.eunuchFaction = 1; S.karma = (S.karma | 0) - 2; }], ['Write nothing', 'You write nothing.', () => { }]] },
  ];
  MEMOS.push({ k: 'shrine', from: D(1626, 6, 1), to: D(1627, 8, 22), title: 'On the living shrines to Wei Zhongxian', opts: [['Subscribe to a living shrine for the Depositor of Loyalty in your jurisdiction', 'A shrine with his statue in gold leaf goes up. You kowtow to it on his birthday with the others.', (S) => { S.flags.eunuchFaction = 1; S.karma = (S.karma | 0) - 2; S.cash -= 2000; S.cash = Math.max(0, S.cash); }],
      ['Refuse, quietly', (S) => S.flags.shrineFell ? 'Your name is noted. In the spring your evaluation reads "deficient in respect".' : 'Your refusal goes unremarked, for now.', (S) => { if (Math.random() < 0.4) { S.flags.shrineFell = 1; if (S.office) S.office.favor = (S.office.favor | 0) - 6; } }],
      ['Refuse, in a memorial', 'Your memorial is returned to you torn in half. Then the Embroidered Uniform Guard comes.', (S) => { S.flags.signedYang = 1; S.flags.donglin = 1; }]] });
  MEMOS.push({ k: 'yuan', from: D(1629, 12, 2), to: D(1630, 8, 16), title: 'On the arrest of Yuan Chonghuan', opts: [['Plead for him: he held Ningyuan, he came to save the capital', 'The Emperor does not answer. In the eighth month of 1630 Yuan Chonghuan is cut to pieces in the market; the crowd buys his flesh to eat.', (S) => { S.karma = (S.karma | 0) + 2; if (S.office) S.office.favor = (S.office.favor | 0) - 3; }],
      ['Denounce him: he let the Jin through, he killed Mao Wenlong', 'Your memorial is praised. He dies in the eighth month of 1630; you are thought of as a loyal man.', (S) => { if (S.office) S.office.favor = (S.office.favor | 0) + 3; S.karma = (S.karma | 0) - 1; }], ['Write nothing', 'You write nothing.', () => { }]] });
  // famine in your county: open the granary or wait for permission
  function famineNow(S) { const T = DT(S.day); if (!S.office || (S.office.lad || 'county') !== 'county' || S.office.jin || T.m !== 4 || ![1622, 1625, 1628, 1629].includes(T.y)) return null; const k = 'famine' + T.y; if (S.dil && S.dil[k]) return null;
    return { k, title: ['饑荒', 'Famine in the county'], text: [['', `There was no rain last year. In the villages people are eating bark and the clay they call Guanyin earth. The county granary is full, but grain may only be released with the prefecture's permission, which takes months.`]],
      opts: [['Open the granary now, on your own authority', 'The people kneel along the road when your chair passes. The prefect is furious.', (S) => { S.office.repute = (S.office.repute | 0) + 6; S.office.favor = (S.office.favor | 0) - 4; S.karma = (S.karma | 0) + 3; }],
        ['Write to the prefecture and wait', 'Permission comes in the seventh month. By then the villages are half empty.', (S) => { S.office.repute = (S.office.repute | 0) - 3; S.karma = (S.karma | 0) - 1; }],
        ['Sell the granary\'s grain to the merchants at famine prices', 'You make a great deal of money. You do not go to the villages.', (S) => { S.cash += 20000; S.office.repute = (S.office.repute | 0) - 8; S.karma = (S.karma | 0) - 5; }]] }; }
  function memosNow(S) { return MEMOS.filter(m => S.day >= m.from && S.day < m.to && !(S.memo && S.memo[m.k])); }
  function memo(S, m, i) { S.memo = S.memo || {}; S.memo[m.k] = i + 1; m.opts[i][2](S); return m.opts[i][1]; }
  // the Eastern Depot comes for the men who signed against Wei Zhongxian (1625, as it did for Yang Lian and Zuo Guangdou)
  function purge(S) { if (S.flags.eunuchFaction && S.office && !S.office.jin && S.day >= D(1629, 3, 1) && !S.flags.purged2) { S.flags.purged2 = 1; S.office = null; return 'The new Emperor publishes the list of Wei Zhongxian\'s faction (逆案). Your name is on it, for the shrine. You are dismissed and sent home in disgrace.'; } if (S.flags.signedYang && S.office && S.day >= D(1625, 6, 1) && !S.flags.purged) { S.flags.purged = 1; S.office = null; S.health = Math.max(10, S.health - 50); return 'The Embroidered Uniform Guard comes at night. You are stripped of office, beaten in the Northern Prison and sent home a cripple. Yang Lian and Zuo Guangdou die in that prison.'; } return null; }

  // ---------------- what you see when you look at yourself (the journal) ----------------
  function journal(S) { const L = []; const a = age(S, S.born);
    L.push(['你', 'You', `${S.name.en}, ${a}. ${S.spouse ? `Married to ${S.spouse.en}.` : 'Unmarried.'} Health ${Math.round(S.health)}. Purse ${S.cash} wen.`]);
    L.push(['學', 'Learning and arms', `Learning ${Math.round(S.learning)}, arms ${Math.round(S.arms)}, smithing ${Math.round(S.smith || 0)}.`]);
    const inv2 = Object.entries(S.inv || {}).filter(([, n]) => n > 0).map(([g, n]) => `${GOODS[g] ? GOODS[g][1] : g}${n > 1 ? ' ×' + n : ''}`); L.push(['囊', 'Your pack', inv2.length ? inv2.join(', ') : 'Empty.']);
    if (S.letters && S.letters.length && S.folk) L.push(['信', 'Letters to deliver', S.letters.map(x => `to ${S.folk[x.to] ? S.folk[x.to].en : '?'} in ${x.place}`).join('; ')]);
    { const P = []; for (const pl in S.land || {}) if (S.land[pl]) P.push(`${S.land[pl]} mu at ${pl === 'lijia' ? 'Lijia' : 'Baodi county'}`); if (S.shop) P.push('a smithy rented in Liaoyang'); if (P.length) L.push(['產', 'Property', P.join('; ') + '.']); }
    { const M = []; for (const d of S.debt || []) M.push(`a note for ${d.n} wen, due ${DT(d.due).y}/${DT(d.due).m}/${DT(d.due).d} (now ${owed(S, d)})`); for (const t of S.pawns || []) M.push(`pawned: ${GOODS[t.g][1]} (redeem by ${DT(t.day + 90).m}/${DT(t.day + 90).d})`); if (S.contract) M.push(`a contract: ${S.contract.n} knives to the ironmonger in Liaoyang by ${DT(S.contract.due).m}/${DT(S.contract.due).d}, ${S.contract.each} wen each`); if (M.length) L.push(['債', 'Debts and dealings', M.join('; ') + '.']); }
    { const B = brothers(S).map(k => S.folk[k].en); const R = Object.entries(S.rep || {}).filter(([, v]) => Math.abs(v) >= 3).map(([p, v]) => `${p}: ${v >= 8 ? 'well thought of' : v >= 3 ? 'liked' : v <= -5 ? 'known as a thief' : 'distrusted'}`); if (B.length || R.length) L.push(['義', 'Brothers and name', [B.length ? `Sworn brothers: ${B.join(', ')}.` : '', R.length ? `Your name: ${R.join('; ')}.` : ''].join(' ')]); }
    const dead = S.folk ? Object.values(S.folk).filter(f => !f.alive && f.died && S.day - f.died < 360 && (f.place === S.place || relOf(S, f.k) > 5)).slice(-6) : []; if (dead.length) L.push(['故', 'The dead you knew', dead.map(f => `${f.en} (${f.how})`).join('; ')]);
    return L; }

  // ---------------- the festivals of the year: each once a year, wherever you are ----------------
  const RIDDLES = [['一口咬掉牛尾巴（打一字）', 'One bite takes the ox\'s tail (a character)', ['告', '生', '午']], ['千里相逢（打一字）', 'Meeting after a thousand li (a character)', ['重', '里', '逢']], ['半部春秋（打一字）', 'Half the Spring and Autumn Annals (a character)', ['秦', '春', '秋']], ['人在草木中（打一字）', 'A man among grass and trees (a character)', ['茶', '休', '苦']]];
  function festNow(S, home) { const T = DT(S.day), at = S.place === home, y = T.y, k = (s) => s + y; const done = (s) => S.dil && S.dil[k(s)];
    const F = (key, title, text, opts) => done(key) ? null : { k: k(key), title, text, opts };
    if (T.m === 1 && T.d <= 3) return at ? F('spring', ['過年', 'The New Year'], [['（門上貼了紅對聯。你娘包了餃子，你爹喝了兩盅。）', '(Red couplets on the door. Your mother has made dumplings; your father has had two cups.)'], ['你爹：又是一年。', 'Your father: Another year.']],
        [['Kowtow to your parents and give them a red packet (200 wen)', 'Your mother cries a little. Your father pretends not to.', (S) => { S.cash -= 200; S.xiao = (S.xiao | 0) + 3; }], ['Set off firecrackers with Erniu (20 wen)', 'Erniu shrieks with joy; the dog hides under the cart.', (S) => { S.cash -= 20; S.xiao = (S.xiao | 0) + 1; }], ['Eat, and sleep early', 'You sleep like a stone.', (S) => { S.health = Math.min(100, S.health + 5); }]])
      : F('spring', ['他鄉過年', 'New Year away from home'], [['（爆竹聲從四面傳來。你在客店裡，一個人。）', '(Firecrackers on every side. You are at an inn, alone.)']],
        [['Send money home with a carter (300 wen)', 'It will reach them by the Lantern Festival, if the carter is honest.', (S) => { S.cash -= 300; S.xiao = (S.xiao | 0) + 2; }], ['Drink with the other travellers (30 wen)', 'A salt merchant from Shanxi tells you how to get rich. You forget it by morning.', (S) => { S.cash -= 30; }], ['Go to the temple fair', 'Acrobats, sugar figures, a fortune-teller who says you will rise.', (S) => { S.luck = 2; S.luckTo = S.day + 20; }]]);
    if (T.m === 1 && T.d >= 15 && T.d <= 16 && S.place !== 'lijia') { const R = RIDDLES[y % RIDDLES.length]; return F('lantern', ['元宵燈謎', 'Lantern riddles'], [['（滿街的燈。一盞走馬燈下掛著一條謎。答對了有彩頭。）', '(Lanterns all down the street. Under a revolving lantern hangs a riddle; a prize for the answer.)'], [R[0], R[1]]],
        R[2].map((a, i) => [a, i === 0 ? 'Right! The shopkeeper gives you a book of model essays as the prize.' : 'Wrong. The crowd laughs, not unkindly.', (S) => { if (i === 0) give(S, 'book', 1); }])); }
    if (T.m === 3 && T.d >= 5 && T.d <= 7) { const dead = ['father', 'mother', 'erniu'].filter(x => S.dead && S.dead[x]); if (!dead.length) return null;
      return at ? F('qingming', ['清明', 'Qingming: sweeping the graves'], [['（清明。墳上的草又長出來了。）', '(Qingming. The grass has grown back on the graves.)']], [['Sweep the graves, burn paper money, set out food (40 wen)', 'You pull the weeds and pile fresh earth. The paper money curls in the fire.', (S) => { S.cash -= 40; S.xiao = (S.xiao | 0) + 2; }], ['Sweep them, quickly', 'It is done.', (S) => { S.xiao = (S.xiao | 0) + 1; }]])
        : F('qingming', ['清明', 'Qingming, far from the graves'], [['', 'It is Qingming. The graves at home will go unswept this year.']], [['Burn paper money at a crossroads, facing home (10 wen)', 'An old woman burning her own nods at you.', (S) => { S.cash -= 10; }], ['There is nothing to be done', 'Nothing.', (S) => { S.xiao = (S.xiao | 0) - 1; }]]); }
    if (T.m === 5 && T.d >= 5 && T.d <= 6) return F('duanwu', ['端午', 'The Dragon Boat Festival'], [['（家家門上插著艾草。街上賣粽子。）', '(Mugwort over every door. Zongzi for sale in the street.)']],
        [['Buy zongzi and realgar wine (25 wen)', 'Sticky rice and dates in bamboo leaves. The wine burns.', (S) => { S.cash -= 25; S.health = Math.min(100, S.health + 4); }], ['Watch the crowd at the river', S.place === 'beijing' || S.place === 'tongzhou' ? 'In the crush at the river someone cuts your purse-string.' : 'Boys swim in the cold river and shout.', (S) => { if (S.place === 'beijing' || S.place === 'tongzhou') S.cash -= Math.floor(S.cash / 5); }]]);
    if (T.m === 8 && T.d >= 15 && T.d <= 16) return at ? F('zhongqiu', ['中秋', 'Mid-Autumn'], [['（月亮很圓。你娘買了月餅，切成四塊。）', '(The moon is full. Your mother has bought a mooncake and cut it in four.)']], [['Sit up with the family in the yard', 'Your father tells the story of Chang\'e, badly. Erniu falls asleep on your arm.', (S) => { S.xiao = (S.xiao | 0) + 1; S.health = Math.min(100, S.health + 3); }]])
      : F('zhongqiu', ['中秋', 'Mid-Autumn away from home'], [['舉頭望明月，低頭思故鄉。', '"I raise my head to look at the bright moon; I lower it and think of home."'], ['', 'The same moon is over Lijia tonight.']], [['Write a poem of your own', 'It is not Li Bai. It is yours.', (S) => { S.learning = Math.min(100, S.learning + 0.6); }], ['Drink until the moon goes down (30 wen)', 'You wake with a headache.', (S) => { S.cash -= 30; S.health -= 3; }]]);
    if (T.m === 9 && T.d >= 9 && T.d <= 10) return F('chongyang', ['重陽', 'The Double Ninth'], [['', 'The Double Ninth: people climb a height, wear dogwood, drink chrysanthemum wine for long life.']], [['Climb the nearest hill', 'From the top you can see the smoke of the next village.', (S) => { S.health = Math.min(100, S.health + 3); }], ['Visit the old people of the place with cakes (30 wen)', 'They talk to you about the old days of Li Chengliang, when the Jurchens were afraid of us.', (S) => { S.cash -= 30; S.karma = (S.karma | 0) + 1; }]]);
    if (T.m === 11 && T.d >= 15 && T.d <= 16) return F('dongzhi', ['冬至', 'The winter solstice'], [['', 'The winter solstice: the longest night. Dumplings, so your ears won\'t freeze off, as they say.']], [['Eat dumplings', 'Your ears are safe for another year.', (S) => { S.health = Math.min(100, S.health + 2); }]]);
    return null; }
  // ---------------- the examination hall ----------------
  const CELL = [['雨', 'Rain', 'In the night the rain comes through the cell roof onto your paper.', [['Hold your oilcloth over the paper all night', 'You save the paper and lose the night.', -2, -8], ['Move the paper under the board and sleep', 'Two characters are blotted.', -4, 0]]],
    ['病', 'A neighbour', 'In the next cell a candidate is groaning; by midnight he is calling for his mother.', [['Call the guards for him', 'They carry him out. You lose an hour.', -1, 0, 1], ['Keep writing', 'He is quiet by dawn. They carry him out under a mat.', 1, 0, -1]]],
    ['燭', 'The candle', 'Your candle is burning down and the third answer is half written.', [['Write by the guard\'s lantern in the corridor', 'The guard lets you, for twenty wen.', 0, 0, 0, 20], ['Finish it from memory in the dark', 'You write it in the dark. Some lines are crooked.', -3, 0]]],
    ['鬼', 'The ghost', 'Old candidates say the hall is full of the ghosts of those wronged by examinees; at the third watch something knocks on your board.', [['Say aloud: "I have wronged no one"', 'The knocking stops. Probably a rat.', 1, 0], ['Hide under the board', 'You lose the night to fear.', -3, -4]]]];
  const BAGU = [['破題', 'Breaking open the topic'], ['承題', 'Receiving the topic'], ['起講', 'Beginning the discussion'], ['入題', 'Entering the topic'], ['起股', 'The opening legs'], ['中股', 'The middle legs'], ['後股', 'The later legs'], ['束股', 'The tying legs']];
  // ---------------- a life summed up: the stone ----------------
  function epitaph(S, how) { const a = age(S, S.born), L = []; const st = { none: 'a commoner', tongsheng: 'a candidate', shengyuan: 'a licentiate (生員)', juren: 'a provincial graduate (舉人)', jinshi: 'a metropolitan graduate (進士)' }[S.status];
    L.push(`${S.name.en} (${S.name.zh}), born ${S.born} in Lijia under Liaoyang, died ${how || ''} in ${DT(S.day).y}, aged ${a}.`);
    L.push(`He was ${st}${S.office ? `, and served as ${S.office.en}` : ''}${S.army ? `; in the army he rose to ${S.army.t || 'the ranks'}` : ''}.`);
    if (S.spouse) L.push(`He married ${S.spouse.en}${S.kids && S.kids.length ? `, who bore him ${S.kids.map(k => `${k.boy ? 'a son' : 'a daughter'}, ${k.en}`).join('; ')}` : ''}.`);
    const dead = ['father', 'mother', 'erniu'].filter(k => S.dead && S.dead[k]); if (dead.length) L.push(`He buried ${dead.map(k => ({ father: 'his father', mother: 'his mother', erniu: 'his sister' })[k]).join(' and ')}.`);
    const deeds = []; const D2 = S.dil || {};
    if (D2.refugees === 1) deeds.push('took in a refugee family from Fushun'); if (D2.quota === 1) deeds.push('went to the army in his father\'s place'); if (D2.deserters === 1) deeds.push('hid two deserters from Sarhu'); if (D2.deserters === 3) deeds.push('gave two deserters up to the runners'); if (D2.pension === 1) deeds.push('won a widow her son\'s pension'); if (D2.cheat === 1) deeds.push('bought a word in an examiner\'s ear'); if (S.flags && S.flags.signedYang) deeds.push('signed Yang Lian\'s memorial against Wei Zhongxian');
    if (deeds.length) L.push(`He ${deeds.join(', ')}.`);
    const k = S.karma | 0, x = S.xiao | 0; L.push(k >= 5 ? 'The people of his place remembered him as a kind man.' : k <= -4 ? 'Not many came to his funeral.' : 'He was neither better nor worse than most.');
    if (x >= 6) L.push('He was known as a filial son.'); if (S.cash > 50000) L.push(`He left ${Math.round(S.cash / 800)} taels of silver.`);
    return L; }
  // ---------------- the army: nights in the barracks ----------------
  const NIGHT = [
    { k: 'shadow', title: ['夜哨', 'Night watch'], text: [['', 'You have the third watch on the wall. Something moves in the dark beyond the ditch.']], opts: [['Shout the challenge', 'A wild dog runs off. The sergeant curses you for waking the company.', () => { }], ['Shoot', 'You shoot into the dark. In the morning there is a dead Jurchen scout in the ditch. The company commander gives you a tael.', (S) => { S.cash += 800; S.army.heads = (S.army.heads | 0) + 1; }], ['Go and look alone', 'Nothing there. You come back with your heart in your mouth.', (S) => { S.arms += 0.5; }]] },
    { k: 'rations', title: ['糧', 'The rations'], text: [['', 'You see the quartermaster loading the company\'s rice onto a merchant\'s cart at night.']], opts: [['Report it to the company commander', 'The company commander has a share of it. You are given the worst duties for a month.', (S) => { S.health -= 5; S.karma = (S.karma | 0) + 1; }], ['Steal a sack back for the squad', 'The squad eats well for a week and calls you brother.', (S) => { S.health += 5; S.flags.squadLoves = 1; }], ['Say nothing', 'You say nothing.', () => { }]] },
    { k: 'cards', title: ['葉子戲', 'Cards'], text: [['', 'The squad is playing leaf cards by the fire for a few wen a hand.']], opts: [['Play (stake 50)', (S) => S.lastWin ? 'You win 50 wen and a reputation as a sharp.' : 'You lose 50 wen to the corporal.', (S) => { S.lastWin = Math.random() < 0.45; S.cash += S.lastWin ? 50 : -50; }], ['Sleep', 'You sleep.', (S) => { S.health += 2; }]] },
    { k: 'letter', title: ['家信', 'A letter home'], text: [['', 'Your squadmate cannot write. He asks you to write to his mother in Shandong for him.']], opts: [['Write it for him', 'He tells you what to say; you make it sound braver than he is.', (S) => { S.karma = (S.karma | 0) + 1; S.learning += 0.2; }], ['Tell him you\'re too tired', 'He asks someone else.', () => { }]], need: (S) => S.learning >= 30 },
    { k: 'bully', title: ['老兵油子', 'The old hand'], text: [['', 'A veteran who has been in the army twenty years wants your boots.']], opts: [['Give him the boots', 'He gives you his, which have holes.', (S) => { S.health -= 3; }], ['Fight him', (S) => S.arms >= 25 ? 'You put him on the ground. Nobody asks for your boots again.' : 'He beats you badly and takes the boots anyway.', (S) => { if (S.arms >= 25) S.arms += 1; else S.health -= 15; }]] },
    { k: 'dream', title: ['夢', 'A dream'], text: [['', 'You dream of the forge at home: your father\'s hammer, the smell of the coal.']], opts: [['Wake', 'You wake before dawn with the smell still in your nose.', () => { }]] },
  ];
  function nightEvent(S) { const r = rngFor(S, 91); if (r() > 0.4) return null; const ok = NIGHT.filter(n => !n.need || n.need(S)); return pick(r, ok); }
  // the men of your squad: generated soldiers who live and die with the company
  function makeMates(S, place) { const r = rngFor(S, 93), out = []; S.folk = S.folk || {}; for (let i = 0; i < 5; i++) { const s = pick(r, SUR), g = pick(r, GM), k = 'm' + S.day + '_' + i;
      S.folk[k] = { k, zh: s[0] + g[0], en: `${s[1]} ${g[1]}`, born: 1590 + Math.floor(r() * 14), trade: 'soldier', place, work: pick(r, ['barracks', 'yard', 'drill']), alive: 1, rel: 0, temper: r(), wealth: 1, mate: 1, look: { h: 0.96 + r() * 0.1, hat: pick(r, ['band', 'wrap', 'kerchief']), beard: r() < 0.4 ? 'mous' : undefined } }; out.push(k); }
    return out; }
  // ---------------- land, the pawnshop, debt, a shop, contracts ----------------
  // a mu of land: cheap in Liaodong and cheaper as the war comes; dearer near the capital
  function landPrice(S, place) { const base = place === 'lijia' ? 1400 : 2600; let p = base; if (place === 'lijia') { if (S.day >= D(1618, 4, 15)) p *= 0.8; if (S.day >= D(1619, 3, 5)) p *= 0.6; if (S.day >= D(1621, 3, 21)) p *= 0.4; } return Math.round(p); }
  function buyLand(S, place, n) { const p = landPrice(S, place) * n; if (S.cash < p) return [false, `${n} mu costs ${p} wen.`]; S.cash -= p; S.land = S.land || {}; S.land[place] = (S.land[place] | 0) + n; return [true, `You buy ${n} mu. The deed is stamped with the county seal. You hold ${S.land[place]} mu here.`]; }
  function sellLand(S, place, n) { if (!S.land || (S.land[place] | 0) < n) return [false, 'You have not got that much.']; const p = Math.round(landPrice(S, place) * 0.85) * n; S.land[place] -= n; S.cash += p; return [true, `You sell ${n} mu for ${p} wen.`]; }
  // the autumn: rent in, tax out (the land tax, and the Liaodong levy that was raised three times)
  function landYear(S) { if (!S.land) return null; let rent = 0, tax = 0, lost = 0; const levy = S.day >= D(1620, 1, 1) ? 3 : S.day >= D(1619, 1, 1) ? 2 : 1;
    for (const pl in S.land) { const n = S.land[pl] | 0; if (!n) continue; if (pl === 'lijia' && S.day >= D(1621, 3, 21) && !S.jin) { lost += n; S.land[pl] = 0; continue; }
      rent += n * (pl === 'lijia' ? 260 : 300) * (pl === 'lijia' && S.flags.jinManor ? 0.4 : 1); tax += n * (40 + 7 * levy); }
    rent = Math.round(rent); S.cash += rent - tax; return { rent, tax, lost }; }
  // the pawnshop: half the price now, the goods back for the money and three per cent a month, within three months
  function pawn(S, place, g) { if (!inv(S, g)) return [false, 'You have none.']; const q = Math.round(price(S, place, g) * 0.5); give(S, g, -1); S.cash += q; S.pawns = (S.pawns || []).concat([{ g, q, day: S.day, place }]); return [true, `The pawnbroker writes you a ticket for ${GOODS[g][1]}: ${q} wen. Redeem it within three months.`]; }
  function redeemCost(S, t) { return Math.round(t.q * (1 + 0.03 * Math.ceil((S.day - t.day + 1) / 30))); }
  function redeem(S, i) { const t = S.pawns[i]; const c = redeemCost(S, t); if (S.cash < c) return [false, `It costs ${c} wen to redeem.`]; S.cash -= c; give(S, t.g, 1); S.pawns.splice(i, 1); return [true, `You redeem ${GOODS[t.g][1]} for ${c} wen.`]; }
  function borrow(S, n) { S.debt = (S.debt || []).concat([{ n, day: S.day, due: S.day + 180 }]); S.cash += n; return [true, `You put your thumbprint on a note for ${n} wen at three per cent a month, due in six months.`]; }
  const owed = (S, d) => Math.round(d.n * (1 + 0.03 * Math.ceil((S.day - d.day + 1) / 30)));
  function repay(S, i) { const d = S.debt[i], c = owed(S, d); if (S.cash < c) return [false, `You owe ${c} wen.`]; S.cash -= c; S.debt.splice(i, 1); return [true, `You pay back ${c} wen and the note is torn up in front of you.`]; }
  // each day: pawn tickets lapse, debts fall due (the collectors come)
  function moneyDay(S) { const out = []; if (S.pawns) { const keep = []; for (const t of S.pawns) { if (S.day - t.day > 90) out.push(`Your pawn ticket for ${GOODS[t.g][1]} has lapsed; the pawnbroker has sold it.`); else keep.push(t); } S.pawns = keep; }
    if (S.debt) for (const d of S.debt) if (S.day > d.due && !d.dunned) { d.dunned = 1; const c = owed(S, d); if (S.cash >= c) { S.cash -= c; out.push(`The moneylender's men come for the ${c} wen you owe. You pay.`); d.paid = 1; } else { const took = S.cash; S.cash = 0; for (const g of Object.keys(S.inv || {})) if (g !== 'letter') delete S.inv[g]; S.health = Math.max(5, S.health - 20); out.push(`The moneylender's men come for the ${c} wen you owe. They take your ${took} wen, everything in your pack, and beat you for the rest.`); d.paid = 1; } }
    if (S.debt) S.debt = S.debt.filter(d => !d.paid); return out; }
  // a contract: the Commission (or a merchant) wants blades by a date
  function contractOffer(S) { if (S.contract || (S.smith || 0) < 25 || S.day >= D(1621, 3, 1)) return null; const r = rngFor(S, 101); const n = 5 + Math.floor(r() * 6), each = Math.round(price(S, 'liaoyang', 'knife') * (1.1 + r() * 0.3)); return { g: 'knife', n, each, due: S.day + 40 }; }
  function contractDeliver(S) { const c = S.contract; if (!c || inv(S, c.g) < c.n) return null; give(S, c.g, -c.n); const pay = c.n * c.each; S.cash += pay; S.contract = null; S.smith = Math.min(100, (S.smith || 0) + 2); return pay; }
  // ---------------- standing, crime, rumour, brotherhood ----------------
  function steal(S, place, g) { const r = rngFor(S, 111 + (S.thefts = (S.thefts | 0) + 1)); const caught = r() < 0.35 - Math.min(0.2, S.arms / 300);
    if (!caught) { give(S, g, 1); addRep(S, place, -1); S.karma = (S.karma | 0) - 1; return [true, `Nobody saw. ${GOODS[g][1][0].toUpperCase() + GOODS[g][1].slice(1)} is in your sleeve.`]; }
    S.health = Math.max(5, S.health - 20); addRep(S, place, -5); S.karma = (S.karma | 0) - 2; let w = 'He grabs your wrist and shouts for the runners. Twenty strokes of the light bamboo in the yamen yard.';
    if (S.status === 'shengyuan' && r() < 0.4) { S.status = 'none'; w += ' The Director of Studies hears of it and strikes your name from the rolls of licentiates.'; } return [false, w]; }
  // what people say about the people you know
  function gossip(S, f) { if (!S.folk) return null; const r = rngFor(S, f.k.length * 7 + 3); const o = Object.values(S.folk).filter(x => x.k !== f.k && (x.place === f.place || relOf(S, x.k) > 4) && (x.died ? S.day - x.died < 120 : (x.spouse || x.drafted || x.trade === 'refugee')));
    if (!o.length) return null; const x = pick(r, o);
    if (x.died) return [`聽說${x.zh}死了。`, `Did you hear? ${x.en} is dead, ${x.how}.`];
    if (x.trade === 'refugee') return [`${x.zh}現在要飯了。`, `${x.en} is begging in the street now. Lost everything.`];
    if (x.drafted) return [`${x.zh}被抓去當兵了。`, `${x.en} was taken in the levy. His mother cries every night.`];
    return [`${x.zh}娶了媳婦，是個厲害的。`, `${x.en} got married. A fierce one, they say: she keeps the money.`]; }
  function swear(S, k) { S.brothers = (S.brothers || []).concat([k]); addRel(S, k, 20); }
  const brothers = (S) => (S.brothers || []).filter(k => S.folk && S.folk[k] && S.folk[k].alive);
  return { LADDERS, famineNow, repOf, addRep, steal, gossip, swear, brothers, landPrice, buyLand, sellLand, landYear, pawn, redeemCost, redeem, borrow, owed, repay, moneyDay, contractOffer, contractDeliver, NIGHT, nightEvent, makeMates, festNow, CELL, BAGU, epitaph, load, cap, SPREAD, D, DT, season, biome, TR, POP, makeFolk, folkAt, GOODS, price, inv, give, buy, sell, RECIPES, craft, JOBS, jobsFor, work, relOf, addRel, giftTo, letterAsk, letterTake, letterDeliver, matchOffer, marry, folkDay, folkHistory,
    DIL, dilemmaNow, dilemmaChoose, ROAD, roadDay, STICKS, drawStick, TALES, tale, dice, CASES, caseNow, judge, LADDER, evaluate, MEMOS, memosNow, memo, purge, journal, rngFor, age };
})();
if (typeof module !== 'undefined') module.exports = WCORE;
