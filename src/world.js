// ===================== 人間 · The open world: Liaodong and Beijing, from the spring of 1618 =====================
// docs/open_world_plan.md. You are Li Tie, a smith's son of Lijia village under Liaoyang, sixteen in the spring Fushun falls.
// Places (each a 3D scene on one of the game's maps) joined by roads; a clock (a day is a few minutes in a place, the road
// takes days); real people in their real posts, found where history had them; history's events firing on their dates
// whether you are there or not, and the news of them going about by word of mouth; your standing (功名 and office, or army
// rank) deciding who bows to whom, which doors open and who will see you. No menus: you look at a person and press E to talk,
// at a thing (the forge, a book, a bed, a notice, a road) and press E to use it. Spliced into main.js's scope.
const WKEY = 'mingWorld', WGO = 'mingWorldGo';
let WS = null, WZ = null, WB = null; // the saved world; the place you are standing in; a battle you are fighting in it

// ---------------- the calendar: Wanli 46 (1618), months of thirty days ----------------
const W_Y0 = 1618;
const wDay = (y, m, d) => (y - W_Y0) * 360 + (m - 1) * 30 + (d - 1);
const wDate = (day) => { const y = W_Y0 + Math.floor(day / 360), r = day - (y - W_Y0) * 360; return { y, m: Math.floor(r / 30) + 1, d: (r % 30) + 1 }; };
const ZHN = '〇一二三四五六七八九十';
const zhNum = (n) => n <= 10 ? ZHN[n] : n < 20 ? '十' + (n % 10 ? ZHN[n % 10] : '') : ZHN[Math.floor(n / 10)] + '十' + (n % 10 ? ZHN[n % 10] : '');
const wReign = (y, m) => y < 1620 || (y === 1620 && m < 8) ? ['萬曆', 'Wanli', y - 1572] : y === 1620 ? ['泰昌', 'Taichang', 1] : y < 1628 ? ['天啟', 'Tianqi', y - 1620] : ['崇禎', 'Chongzhen', y - 1627];
function wFmt(day) { const D = wDate(day), R = wReign(D.y, D.m); const dz = D.d <= 10 ? '初' + ZHN[D.d] : zhNum(D.d);
  return { zh: `${R[0]}${R[2] === 1 ? '元' : zhNum(R[2])}年${D.m === 1 ? '正' : zhNum(D.m)}月${dz}`, en: `${R[1]} ${R[2]}, the ${D.m}${D.m === 1 ? 'st' : D.m === 2 ? 'nd' : D.m === 3 ? 'rd' : 'th'} month, day ${D.d} (${D.y})` }; }
const wHourName = (h) => h < 5 ? 'night' : h < 7 ? 'dawn' : h < 11 ? 'morning' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 19.5 ? 'evening' : 'night';

// ---------------- standing: what you are, and what it is worth ----------------
// rank numbers order everyone: a man bows to a higher number; below 40 kneels to 40 and above (an official)
const W_STATUS = { none: [0, '白身', 'a commoner'], tongsheng: [4, '童生', 'a candidate (童生)'], shengyuan: [10, '生員', 'a licentiate (生員)'], juren: [20, '舉人', 'a provincial graduate (舉人)'], jinshi: [30, '進士', 'a metropolitan graduate (進士)'] };
const W_ARMY = [[2, '兵', 'a soldier'], [6, '小旗', 'a squad leader (小旗)'], [8, '總旗', 'a section leader (總旗)'], [12, '百總', 'a company commander (百總)'], [16, '把總', 'a platoon commander (把總)'], [22, '千總', 'a battalion commander (千總)'], [44, '守備', 'a Garrison Commander (守備)']];
function wRank() { if (!WS) return 0; let r = W_STATUS[WS.status][0]; if (WS.army) r = Math.max(r, W_ARMY[WS.army.r][0]); if (WS.office) r = Math.max(r, WS.office.rank); return r; }
function wTitle() { if (WS.office) return [WS.office.zh, WS.office.en]; if (WS.army) return [W_ARMY[WS.army.r][1], W_ARMY[WS.army.r][2]]; const s = W_STATUS[WS.status]; return [s[1], s[2]]; }

// ---------------- the places ----------------
// map: the battlefield it is drawn on; at: where you stand on arrival by each road; exits: the roads out (walk to the marker,
// E); spots: named places in it (people stand at them, things are at them); gates: places you need standing to enter
const WPL = {
  lijia: { zh: '李家堡', en: 'Lijia village', map: 'zroad', biome: 'spring', desc: 'A village of Liaoyang county on the Fushun road: seven houses, a smithy, a village school.',
    at: { liaoyang: [0, 120], start: [10, 22] }, exits: [{ to: 'liaoyang', x: 0, z: 132, sign: '遼', days: 1 }],
    spots: { forge: [7, 25], home: [16, 18], hearth: [9, 19], school: [-7, 22], fieldW: [-44, 4], fieldE: [44, -12], well: [-4, 40], road: [0, 60] } },
  liaoyang: { zh: '遼陽', en: 'Liaoyang', map: 'djliao', biome: 'spring', desc: 'The seat of the Liaodong Regional Military Commission: the west quarter, its streets, the Commission, the school, the recruiting yard.',
    at: { lijia: [0, -128], west: [-100, 40], fushun: [40, -116] }, exits: [{ to: 'lijia', x: 0, z: -136, sign: '李', days: 1 }, { to: 'shanhai', x: -104, z: 40, sign: '京', days: 12, via: 'Guangning' }, { to: 'fushun', x: 40, z: -132, sign: '撫', days: 2, via: 'Shenyang' }],
    spots: { yamen: [-40, 14], yamenGate: [-40, 4], school: [40, -40], yard: [-88, 40], drill: [-80, 52], inn: [12, -14], market: [0, 0], barracks: [-92, 30], market2: [10, 8], teahouse: [22, 12], temple: [60, 24], physician: [-14, -22], smithy: [-22, -8], scribe: [-28, 2], street: [24, 30], gate: [0, -122], wall: [-96, 20], bookshop: [30, -28] } },
  shanhai: { zh: '山海關', en: 'Shanhai Pass', map: 'bonari', biome: 'spring', desc: 'The First Pass Under Heaven, between the mountains and the sea: the road from Liaodong into China.',
    at: { liaoyang: [0, -118], beijing: [0, 118] }, exits: [{ to: 'liaoyang', x: 0, z: -132, sign: '遼', days: 12, via: 'Guangning' }, { to: 'tongzhou', x: 0, z: 132, sign: '通', days: 5, via: 'Yongping' }],
    spots: { gate: [0, 0], guard: [4, -6], inn: [-14, 30], yard: [10, -20], market: [-10, 20], wall: [16, 6], road: [0, 50] } },
  beijing: { zh: '京師', en: 'Beijing, outside the Guangqu Gate', map: 'bjgate', biome: 'spring', desc: 'The suburb outside the outer wall of the capital: inns, carters, the gate.',
    at: { shanhai: [6, -128], tongzhou: [6, -128], city: [6, 128] }, exits: [{ to: 'tongzhou', x: 6, z: -136, sign: '通', days: 1 }, { to: 'city', x: 6, z: 138, sign: '門', days: 0 }],
    spots: { inn: [-30, 20], market: [20, -20], gate: [6, 128], market2: [26, -8], teahouse: [-22, 6], physician: [34, 10], street: [0, 40], temple: [-40, -30], inn2: [-30, 30] } },
  city: { zh: '京城', en: 'Beijing, within the walls', map: 'djdeng', biome: 'spring', desc: 'Within the walls: the Examination Hall (貢院), the Ministry of Personnel (吏部), the road to the palace.',
    at: { beijing: [0, -44], palace: [0, 96], county: [-60, -30] }, exits: [{ to: 'beijing', x: 0, z: -50, sign: '廣', days: 0 }, { to: 'palace', x: 0, z: 100, sign: '午', days: 0, rank: 30 }, { to: 'county', x: -66, z: -30, sign: '縣', days: 2, via: 'the Shuntian roads', office: 1 }],
    spots: { exam: [-10, 22], examGate: [-10, 14], ministry: [40, 6], ministryGate: [40, 0], street: [10, 40], inn: [-40, -30], bookshop: [24, -20], scribe: [30, -26], temple: [-50, 40], market: [14, -34], market2: [20, 50] } },
  palace: { zh: '午門', en: 'The Meridian Gate', map: 'ueno', biome: 'spring', desc: 'The court of the Meridian Gate and the hall beyond it, where the officials wait at dawn for an audience.',
    at: { city: [1, 36] }, exits: [{ to: 'city', x: 1, z: 30, sign: '城', days: 0 }],
    spots: { hall: [1, 70], ranks: [1, 62], gate: [1, 52] } },
  fushun: { zh: '撫順', en: 'Fushun', map: 'djzhen', desc: 'The frontier market town on the Hun River, where the Jurchens come to trade ginseng and furs for iron and cloth.',
    at: { liaoyang: [0, -34] }, exits: [{ to: 'liaoyang', x: 0, z: -46, sign: '遼', days: 2, via: 'Shenyang' }], jinFrom: wDay(1618, 4, 15),
    spots: { market: [0, 0], market2: [14, 10], gate: [0, -32], yard: [-30, 40], yamenGate: [0, 18], wall: [-40, 0], street: [20, 40] } },
  tongzhou: { zh: '通州', en: 'Tongzhou', map: 'sjvil', desc: 'The end of the Grand Canal, a day east of the capital: grain barges, warehouses, carters.',
    at: { shanhai: [0, -100], beijing: [0, 100] }, exits: [{ to: 'shanhai', x: 0, z: -112, sign: '關', days: 5, via: 'Yongping' }, { to: 'beijing', x: 0, z: 112, sign: '京', days: 1 }],
    spots: { quay: [30, 0], market: [0, 10], gate: [0, -60], road: [0, 60], inn: [-20, 20] } },
  county: { zh: '寶坻縣', en: 'Baodi county seat', map: 'siegecity', desc: 'A county of Shuntian prefecture, two days east of the capital: the county yamen, a market, the gate.',
    at: { city: [0, -40] }, exits: [{ to: 'city', x: 0, z: -52, sign: '京', days: 2, via: 'the Shuntian roads' }],
    spots: { yamen: [0, 30], yamenGate: [0, 20], market: [-20, 0], market2: [20, 0], gate: [0, -36], fieldW: [-40, -20], fieldE: [40, -20] } },
};

// ---------------- the people ----------------
// k, zh, en, t (who he is), look, rank; where: [[fromDay, toDay, place, spot, act, seated]] (history's people move with
// their posts); route: a day's round [[spot, act, secs, seated]]; role: what you can do with him; dead: the day he dies
const D = wDay;
const WPP = [
  // your family and village
  { k: 'father', zh: '李大錘', en: 'Li Dachui, your father', t: 'the smith of Lijia', born: 1572, look: { h: 1.04, beard: 'full', brows: 'thick', bulk: true, apron: true }, rank: 0, where: [[0, 1e9, 'lijia', 'forge', 18]], role: 'father' },
  { k: 'mother', zh: '李王氏', en: 'Mother', t: 'your mother', born: 1578, woman: true, look: { h: 0.92, hat: 'kerchief', brows: 'sad' }, rank: 0, where: [[0, 1e9, 'lijia', 'hearth', 13]], role: 'mother' },
  { k: 'erniu', zh: '李二妞', en: 'Erniu, your sister', t: 'your little sister', born: 1611, woman: true, look: { h: 0.72 }, rank: 0, where: [[0, 1e9, 'lijia', 'home', 21]], role: 'sister' },
  { k: 'zhang', zh: '張先生', en: 'Master Zhang', t: 'the village schoolmaster, a 童生 of forty who never passed', born: 1578, look: { h: 1.0, hat: 'band', beard: 'longmous', grey: true }, rank: 4, where: [[0, 1e9, 'lijia', 'school', 20, true]], role: 'teacher' },
  { k: 'wu', zh: '吳老栓', en: 'Old Wu', t: 'the headman (里長)', born: 1560, look: { h: 0.98, beard: 'mous', grey: true }, rank: 1, where: [[0, 1e9, 'lijia', 'road', 0]], route: [['road', 9, 40], ['well', 0, 30], ['fieldW', 0, 30], ['road', 9, 40]], role: 'headman' },
  { k: 'farmer1', zh: '趙老三', en: 'Zhao Laosan', t: 'a farmer', born: 1582, look: { h: 1.0, hat: 'straw' }, rank: 0, where: [[0, 1e9, 'lijia', 'fieldW', 19]], role: 'farmer' },
  { k: 'farmer2', zh: '孫二', en: 'Sun Er', t: 'a farmer', born: 1590, look: { h: 1.02, hat: 'straw' }, rank: 0, where: [[0, 1e9, 'lijia', 'fieldE', 19]], role: 'farmer' },
  { k: 'boy1', zh: '狗兒', en: 'Gou\'er', t: 'a boy at the school', born: 1608, look: { h: 0.82 }, rank: 0, where: [[0, 1e9, 'lijia', 'school', 20, true]], role: 'pupil' },
  // Liaoyang: the ordinary people of the town
  { k: 'innkeep', zh: '錢掌櫃', en: 'Innkeeper Qian', t: 'keeps the inn by the market', born: 1575, look: { h: 1.0, hat: 'band', bulk: true }, rank: 0, where: [[0, 1e9, 'liaoyang', 'inn', 9]], role: 'inn' },
  { k: 'vendor', zh: '賣餅的', en: 'A cake seller', t: 'sells sesame cakes', born: 1585, look: { h: 0.96, hat: 'kerchief' }, rank: 0, where: [[0, 1e9, 'liaoyang', 'market', 9]], role: 'food' },
  { k: 'jiaoshou', zh: '劉教授', en: 'Instructor Liu', t: 'Instructor (教授) of the Liaodong Regional School (遼東都司儒學)', born: 1570, look: { h: 1.02, hat: 'band', beard: 'longmous' }, rank: 41, where: [[0, D(1621, 3, 21), 'liaoyang', 'school', 20]], role: 'instructor' },
  { k: 'clerk', zh: '書辦', en: 'A Commission clerk', t: 'a clerk of the Regional Commission', born: 1590, look: { h: 1.0, hat: 'band' }, rank: 2, where: [[0, D(1621, 3, 20), 'liaoyang', 'yamenGate', 0]], role: 'clerk' },
  { k: 'recruiter', zh: '韓百總', en: 'Captain Han', t: 'a company commander (百總), raising men for the Liaodong army', born: 1584, look: { h: 1.06, hat: 'chief', beard: 'full', scar: true }, rank: 12, where: [[D(1618, 4, 25), D(1619, 2, 20), 'liaoyang', 'yard', 10]], role: 'recruiter' },
  { k: 'sergeant', zh: '馬總旗', en: 'Sergeant Ma', t: 'a section leader (總旗) who drills the recruits', born: 1590, look: { h: 1.02, hat: 'chief', brows: 'knit' }, rank: 8, where: [[D(1618, 4, 25), D(1619, 2, 20), 'liaoyang', 'drill', 10]], role: 'drill' },
  { k: 'refugee', zh: '撫順難民', en: 'A refugee from Fushun', t: 'came in with the crowds after Fushun fell', born: 1590, look: { h: 0.98, hat: 'kerchief', brows: 'sad' }, rank: 0, where: [[D(1618, 4, 18), D(1618, 9, 1), 'liaoyang', 'market', 4, true]], role: 'refugee' },
  // the Pass and Beijing
  { k: 'passguard', zh: '關吏', en: 'The pass clerk', t: 'checks travel papers (路引) at the gate', born: 1585, look: { h: 1.0, hat: 'chief' }, rank: 6, where: [[0, 1e9, 'shanhai', 'guard', 10]], role: 'passguard' },
  { k: 'bjinn', zh: '朱掌櫃', en: 'Innkeeper Zhu', t: 'keeps an inn for examination candidates (會館)', born: 1580, look: { h: 1.0, hat: 'band' }, rank: 0, where: [[0, 1e9, 'beijing', 'inn', 9]], role: 'inn' },
  { k: 'examoff', zh: '監臨官', en: 'The examination proctor', t: 'keeps the gate of the Examination Hall', born: 1575, look: { h: 1.04, hat: 'chief', beard: 'longmous' }, rank: 45, where: [[0, 1e9, 'city', 'examGate', 10]], role: 'proctor' },
  { k: 'libu', zh: '吏部司官', en: 'A secretary of the Ministry of Personnel', t: 'keeps the rolls of men awaiting posts', born: 1578, look: { h: 1.0, hat: 'chief', beard: 'mous' }, rank: 45, where: [[0, 1e9, 'city', 'ministryGate', 9]], role: 'libu' },
  // history's people, in their posts
  { k: 'lirubai', zh: '李如柏', en: 'Li Rubai', t: 'Regional Commander (總兵) at Liaoyang, son of the great Li Chengliang', born: 1553, hist: true, look: { h: 1.04, hat: 'chief', beard: 'longmous', grey: true }, rank: 48, where: [[D(1618, 5, 1), D(1619, 4, 1), 'liaoyang', 'yamen', 10]], role: 'general' },
  { k: 'yanghao', zh: '楊鎬', en: 'Yang Hao', t: 'Military Commissioner for Liaodong (遼東經略), Vice Minister of War', born: 1560, hist: true, look: { h: 1.0, hat: 'chief', beard: 'longmous', grey: true }, rank: 48, where: [[D(1618, 6, 10), D(1619, 6, 10), 'liaoyang', 'yamen', 9]], role: 'grandee' },
  { k: 'maowl', zh: '毛文龍', en: 'Mao Wenlong', t: 'a guerrilla commander (遊擊) under the Regional Commander', born: 1576, hist: true, look: { h: 1.04, hat: 'chief', beard: 'longmous' }, rank: 46, where: [[0, D(1621, 3, 20), 'liaoyang', 'yard', 0]], route: [['yamenGate', 0, 60], ['yard', 9, 60], ['market', 0, 40]], role: 'officer' },
  { k: 'xiongtb', zh: '熊廷弼', en: 'Xiong Tingbi', t: 'Military Commissioner for Liaodong (遼東經略)', born: 1569, hist: true, look: { h: 1.06, hat: 'chief', beard: 'full', brows: 'knit' }, rank: 48, where: [[D(1619, 8, 1), D(1620, 10, 20), 'liaoyang', 'yamen', 9]], role: 'grandee' },
  { k: 'yuanyt', zh: '袁應泰', en: 'Yuan Yingtai', t: 'Military Commissioner for Liaodong (遼東經略)', born: 1565, hist: true, look: { h: 1.0, hat: 'chief', beard: 'longmous' }, rank: 48, where: [[D(1620, 10, 20), D(1621, 3, 21), 'liaoyang', 'yamen', 9]], role: 'grandee' },
  { k: 'xugq', zh: '徐光啟', en: 'Xu Guangqi', t: 'Hanlin academician; from the autumn of 1619 he drills new troops at Tongzhou', born: 1562, hist: true, look: { h: 1.0, hat: 'chief', beard: 'longmous', grey: true }, rank: 45, where: [[0, D(1619, 9, 1), 'city', 'street', 9], [D(1619, 9, 1), D(1621, 1, 1), 'tongzhou', 'gate', 10], [D(1621, 1, 1), D(1621, 6, 1), 'city', 'street', 9]], role: 'scholar' },
  { k: 'fangcz', zh: '方從哲', en: 'Fang Congzhe', t: 'Senior Grand Secretary (首輔)', born: 1562, hist: true, look: { h: 1.0, hat: 'chief', beard: 'longmous', grey: true }, rank: 49, where: [[0, D(1620, 12, 1), 'palace', 'ranks', 0]], role: 'grandee' },
  { k: 'yanglian', zh: '楊漣', en: 'Yang Lian', t: 'a supervising secretary (給事中), outspoken', born: 1572, hist: true, look: { h: 1.04, hat: 'chief', beard: 'full' }, rank: 43, where: [[0, D(1625, 6, 1), 'palace', 'ranks', 0]], role: 'censor' },
  { k: 'sunczong', zh: '孫承宗', en: 'Sun Chengzong', t: 'a Hanlin academician, tutor to the heir', born: 1563, hist: true, look: { h: 1.08, hat: 'chief', beard: 'full', grey: true }, rank: 45, where: [[0, D(1622, 3, 1), 'palace', 'ranks', 0]], role: 'scholar' },
];
const wPerson = (k) => WPP.find(p => p.k === k);
// where a person is on a given day (null: not in any place you can be), and whether he is alive
function wWhere(p, day) { if (WS && WS.dead[p.k]) return null; const fam = wFamWhere(p, day); if (fam !== undefined) return fam; for (const w of p.where) if (day >= w[0] && day < w[1]) return w; return null; }

// ---------------- history's calendar ----------------
// each: [day, key, news zh, news en, how far it is heard (places), effect(day)]
const WEV = [
  [D(1618, 4, 15), 'fushun', '撫順陷了！李永芳降了奴兒哈赤。', 'Fushun has fallen! Li Yongfang went over to Nurhaci.'],
  [D(1618, 4, 21), 'zhangcy', '張總兵帶兵去救撫順，全軍覆沒，人也死了。', 'General Zhang Chengyin took an army to relieve Fushun. It was wiped out, and he with it.'],
  [D(1618, 4, 25), 'levy', '遼陽在募兵了，每月一兩八錢。', 'They are raising men in Liaoyang. A tael and eight a month.'],
  [D(1618, 6, 10), 'yanghao', '楊經略到遼陽了。說是要四路進兵，直搗赫圖阿拉。', 'Commissioner Yang has come to Liaoyang. They say four armies will march straight on Hetu Ala.'],
  [D(1618, 7, 22), 'qinghe', '清河堡也丟了。守城的鄒儲賢戰死。', 'Qinghe is lost too. Zou Chuxian died defending it.'],
  [D(1618, 8, 9), 'xiangshi', '順天鄉試開考了。遼東的秀才有五個邊字號的名額。', 'The Shuntian provincial exam has begun. Liaodong\'s licentiates have five places reserved, marked 邊.'],
  [D(1619, 2, 9), 'huishi', '京師會試開考了。', 'The metropolitan exam has begun in the capital.'],
  [D(1619, 2, 21), 'march', '大軍出征了，分四路。劉總兵從寬甸走東路。', 'The army has marched, in four columns. General Liu Ting takes the east road from Kuandian.'],
  [D(1619, 3, 2), 'sarhu', '薩爾滸大敗！杜總兵全軍沒了。', 'A great defeat at Sarhu! General Du Song\'s whole army is gone.'],
  [D(1619, 3, 5), 'liuting', '劉總兵在阿布達里岡戰死，浙兵都死光了。', 'General Liu Ting fell at Abudali. The Zhejiang men died to a man.'],
  [D(1619, 3, 15), 'dianshi', '殿試放榜了。', 'The palace exam list is out.'],
  [D(1619, 6, 16), 'kaiyuan', '開原丟了，馬總兵戰死。', 'Kaiyuan is lost. General Ma Lin is dead.'],
  [D(1619, 7, 25), 'tieling', '鐵嶺也陷了。', 'Tieling has fallen too.'],
  [D(1619, 8, 1), 'xiong', '熊經略來了。這個人厲害，一到就斬了逃將。', 'Commissioner Xiong has come. A hard man: he beheaded the generals who ran the day he arrived.'],
  [D(1620, 7, 21), 'wanli', '萬曆爺駕崩了。', 'The Wanli Emperor is dead.'],
  [D(1620, 9, 1), 'taichang', '新皇上才一個月就駕崩了。說是吃了紅丸。', 'The new Emperor is dead after a month. They say it was a red pill.'],
  [D(1620, 10, 20), 'yuanyt', '熊經略被罷了，換了袁應泰。', 'Commissioner Xiong has been dismissed. Yuan Yingtai has his post.'],
  [D(1621, 3, 13), 'shenyang', '瀋陽陷了！賀總兵戰死。', 'Shenyang has fallen! General He Shixian is dead.'],
  [D(1621, 3, 21), 'liaoyangfall', '遼陽陷了。袁經略自盡了。', 'Liaoyang has fallen. Commissioner Yuan has taken his own life.'],
];
// the exams: [level, open day, place, spot, needed status, gives status, pass line, results day]
const WEX = [
  ['tongshi', D(1618, 4, 10), 'liaoyang', 'school', 'none', 'shengyuan', 46, D(1618, 4, 20), '童試', 'the licentiate exam (童試)'],
  ['tongshi', D(1619, 4, 10), 'liaoyang', 'school', 'none', 'shengyuan', 46, D(1619, 4, 20), '童試', 'the licentiate exam (童試)'],
  ['tongshi', D(1620, 4, 10), 'liaoyang', 'school', 'none', 'shengyuan', 46, D(1620, 4, 20), '童試', 'the licentiate exam (童試)'],
  ['xiangshi', D(1618, 8, 9), 'city', 'exam', 'shengyuan', 'juren', 68, D(1618, 8, 29), '鄉試', 'the Shuntian provincial exam (鄉試)'],
  ['xiangshi', D(1621, 8, 9), 'city', 'exam', 'shengyuan', 'juren', 68, D(1621, 8, 29), '鄉試', 'the Shuntian provincial exam (鄉試)'],
  ['huishi', D(1619, 2, 9), 'city', 'exam', 'juren', 'jinshi', 78, D(1619, 3, 15), '會試', 'the metropolitan exam (會試) and the palace exam'],
  ['huishi', D(1622, 2, 9), 'city', 'exam', 'juren', 'jinshi', 78, D(1622, 3, 15), '會試', 'the metropolitan exam (會試) and the palace exam'],
];
// the paper: passages of the Four Books and how to read them (the first reading is Zhu Xi's, the one the examiners want)
const WQ = [
  ['學而時習之，不亦說乎？', 'Is it not a pleasure to learn and to practise it in due season? (Analects 1.1)', ['Learning is following what the earlier enlightened did; practising, like a fledgling that keeps trying its wings (Zhu Xi)', 'Practise means to rehearse texts aloud for the examinations', 'Pleasure is the true goal; learning is only its means']],
  ['大學之道，在明明德，在親民，在止於至善。', 'The way of great learning lies in making bright virtue shine, in renewing the people, in resting in the highest good. (Great Learning)', ['親 is to be read 新, renewing: the bright virtue made to shine in oneself renews the people (Zhu Xi)', '親民 means to love and be close to the common people as they are', 'The highest good is the ruler\'s favour']],
  ['天命之謂性，率性之謂道，修道之謂教。', 'What Heaven decrees is called nature; to follow nature is the Way; to cultivate the Way is teaching. (Doctrine of the Mean)', ['Heaven endows all things with principle (理) as their nature; following it is the Way; the sage\'s regulating of it is teaching (Zhu Xi)', 'Nature is the appetites; the Way is to indulge them in moderation', 'Teaching comes first and makes nature']],
  ['民為貴，社稷次之，君為輕。', 'The people are the most important, the altars of the state next, the ruler least. (Mencius 7B)', ['The state exists for the people, and the ruler\'s worth lies in keeping both; a careful answer (the examiners of this dynasty dislike it)', 'The ruler may be dismissed by anyone who disagrees with him', 'The people should be governed strictly, as they are the many']],
  ['克己復禮為仁。', 'To overcome the self and return to ritual is humaneness. (Analects 12.1)', ['To overcome selfish desire (私欲) so that the heavenly principle of ritual is restored is humaneness (Zhu Xi)', 'To defeat one\'s enemies and restore the old dynasty', 'To follow ritual outwardly whatever one feels']],
  ['人皆有不忍人之心。', 'All men have a heart that cannot bear the suffering of others. (Mencius 2A)', ['The four sprouts (四端) are in every man\'s nature; the child at the well shows it (Mencius, as Zhu Xi reads him)', 'Only the gentleman has such a heart; the common people must be taught it', 'This heart is weakness in a ruler']],
  ['知止而後有定。', 'Knowing where to rest, one becomes settled. (Great Learning)', ['To know the highest good as the place to rest gives the mind a fixed aim (Zhu Xi)', 'To know when to stop studying', 'To stop desiring office']],
  ['君子喻於義，小人喻於利。', 'The gentleman understands what is right; the small man understands what is profitable. (Analects 4.16)', ['The gentleman\'s mind follows heavenly principle, the small man\'s selfish desire (Zhu Xi)', 'Merchants are small men by birth', 'Profit and right are the same thing seen twice']],
];

// ---------------- the save ----------------
function wFresh() {
  return { v: 1, day: D(1618, 3, 1), hour: 7, place: 'lijia', from: 'start', name: { zh: '李鐵', en: 'Li Tie' }, born: 1602, cash: 1500, learning: 24, arms: 12, health: 100,
    status: 'none', army: null, office: null, lodge: 'lijia', dead: {}, talked: {}, heard: {}, rel: {}, flags: {}, exams: {}, log: [], fired: {}, alive: true, ...wV2({}) };
}
// the second save: the townsfolk, your pack, your skill at the forge, your home (it can move)
function wV2(S) { if (!S.seed) S.seed = (Math.random() * 1e9) | 0; S.inv = S.inv || {}; if (S.smith === undefined) S.smith = 15; S.home = S.home || 'lijia'; S.news = S.news || []; S.karma = S.karma | 0; if (!S.folk) S.folk = WCORE.makeFolk(S); S.v = 2; return S; }
function wLoad() { try { const s = JSON.parse(localStorage.getItem(WKEY) || 'null'); return s ? wV2(s) : null; } catch (e) { return null; } }
function wSave() { try { localStorage.setItem(WKEY, JSON.stringify(WS)); } catch (e) { } }
function wLog(zh, en) { WS.log.push([WS.day, zh, en]); if (WS.log.length > 200) WS.log.shift(); }
const wCash = (w) => w >= 800 ? `${(w / 800).toFixed(1)} taels` : `${w} wen`;

// ---------------- the world turns: one day at a time ----------------
function wTurnDays(n) {
  for (let i = 0; i < n; i++) { WS.day++;
    for (const e of WEV) if (e[0] === WS.day && !WS.fired[e[1]]) { WS.fired[e[1]] = 1; wLog(e[2], e[3]); wHappen(e[1]); }
    // the fallen of history die on their day
    if (WS.day === D(1618, 4, 21)) WS.dead.zhangcy = 1;
    // family life: your father ages; in a bad year the price of grain doubles
    if (WS.army) { WS.army.paid = (WS.army.paid || 0) + 1; if (WS.army.paid >= 30) { WS.army.paid = 0; wPayDay(); } }
    if (WS.office) { WS.office.paid = (WS.office.paid || 0) + 1; if (WS.office.paid >= 30) { WS.office.paid = 0; WS.cash += 4000; } }
    wArmyCheck(); wLifeDay();
  }
}
function wHappen(k) {
  wLifeHistory(k);
  if (k === 'liaoyangfall' && (WS.place === 'liaoyang' || WS.place === 'lijia') && !WS.flags.stayJin) WS.flags.fallHere = 1;
}
// the news a person knows: what has happened, heard here after a delay that grows with the distance from where it happened
const W_FAR = { lijia: 1, liaoyang: 0, fushun: 1, shanhai: 6, tongzhou: 8, beijing: 9, city: 9, palace: 9, county: 10 };
function wNews(place) { const delay = W_FAR[place] || 0; const out = []; for (const e of WEV) if (WS.day - e[0] >= delay && WS.day - e[0] < delay + 60) out.push(e); return out; }

// ---------------- the army: you march with your company when history marches ----------------
function wArmyCheck() {
  if (!WS.army || WB) return;
  if (WS.day >= D(1619, 2, 21) && !WS.flags.marched && WS.army.col === 'liu') { WS.flags.marched = 1; WS.flags.pendingBattle = 'roadA'; }
  if (WS.day >= D(1621, 3, 10) && WS.day < D(1621, 3, 14) && !WS.flags.hun && WS.army.col === 'liu' && (WS.place === 'liaoyang' || WS.place === 'lijia')) { WS.flags.hun = 1; WS.flags.pendingBattle = 'hunw'; }
  if (WS.day >= D(1626, 1, 20) && WS.day < D(1626, 2, 1) && !WS.flags.ningyuan && (WS.army.col === 'pass' || WS.flags.yuanMan) && (WS.place === 'shanhai')) { WS.flags.ningyuan = 1; WS.flags.pendingBattle = 'ningyuan'; }
}

// ---------------- the scene: the place you are in, its people, its things, at this hour ----------------
const wNight = () => WS.hour >= 19.5 || WS.hour < 5;
function wPeopleHere() {
  const P = WPL[WS.place], out = [];
  for (const p of WPP) { const w = wWhere(p, WS.day); if (!w || w[2] !== WS.place) continue;
    if (wNight() && !['father', 'mother', 'erniu', 'innkeep', 'bjinn', 'passguard', 'examoff'].includes(p.k) && !(WS.flags.examIn && p.role === 'proctor')) continue; // at night the street empties
    const s = P.spots[w[3]] || [0, 0]; const e = { p, x: s[0] + ((p.k.charCodeAt(0) % 5) - 2) * 0.8, z: s[1] + ((p.k.charCodeAt(1) % 5) - 2) * 0.8, act: wNight() && ['father', 'mother', 'erniu'].includes(p.k) ? 1 : w[4], seat: !!w[5] };
    if (p.route && !wNight()) e.route = p.route.map(r => { const q = P.spots[r[0]] || s; return [q[0] + (Math.random() - 0.5) * 2, q[1] + (Math.random() - 0.5) * 2, r[1], r[2], r[3] ? 1 : 0]; });
    out.push(e); }
  // the townsfolk: generated people with trades and days of their own (world_core.js)
  const taken = {};
  for (const k in WS.folk) { const f = WS.folk[k]; const a = WCORE.folkAt(WS, f, WS.hour); if (!a) continue; const s = P.spots[a.spot] || P.spots.market || Object.values(P.spots)[0];
    const n = taken[a.spot] = (taken[a.spot] | 0) + 1; const ang = n * 2.4, rr = 1.6 + n * 0.5;
    out.push({ p: wFolkP(f), x: s[0] + Math.cos(ang) * rr, z: s[1] + Math.sin(ang) * rr, act: a.act, seat: a.seat }); }
  return out;
}
// the things you can use in a place, with what they look like (camp props)
function wThings() {
  const P = WPL[WS.place], T = [];
  for (const ex of P.exits) T.push({ k: 'exit', to: ex.to, x: ex.x, z: ex.z, ex });
  if (WS.place === 'lijia') { const S2 = P.spots; T.push({ k: 'forge', x: S2.forge[0] + 1.4, z: S2.forge[1] - 1 }, { k: 'bed', x: S2.home[0], z: S2.home[1] }, { k: 'books', x: S2.home[0] - 2.2, z: S2.home[1] + 1.2 }); }
  if (WS.place === 'liaoyang') { const S2 = P.spots; T.push({ k: 'inn', x: S2.inn[0] + 2, z: S2.inn[1] }, { k: 'board', x: S2.school[0] - 3, z: S2.school[1] - 2 }); if (WS.army && (WS.army.col === 'liu' || WS.army.col === 'jin')) T.push({ k: 'bunk', x: S2.barracks[0], z: S2.barracks[1] }); }
  if (WS.place === 'beijing') T.push({ k: 'inn', x: WPL.beijing.spots.inn[0] + 2, z: WPL.beijing.spots.inn[1] });
  if (WS.place === 'shanhai') T.push({ k: 'inn', x: WPL.shanhai.spots.inn[0] + 2, z: WPL.shanhai.spots.inn[1] });
  if (WS.place === 'city') T.push({ k: 'board', x: WPL.city.spots.examGate[0] + 4, z: WPL.city.spots.examGate[1] - 2 }, { k: 'inn', x: WPL.city.spots.inn[0], z: WPL.city.spots.inn[1] });
  return T.concat(wMoreThings(P));
}
function wScene(arriveFrom) {
  wArmyDay();
  const P = WPL[WS.place]; const night = wNight(); const at = (arriveFrom && P.at[arriveFrom]) || P.at[WS.from] || P.at.start || Object.values(P.at)[0];
  const people = wPeopleHere(), things = wThings();
  const npcs = people.map((e, i) => ({ role: 'spear', x: e.x, z: e.z, yaw: Math.random() * 6.28, ci: i, pose: e.seat ? 'squat' : 'stand', act: e.act, rank: e.p.rank, route: e.route }));
  const props = [], fires = [];
  for (const t of things) { if (t.k === 'exit') props.push(['banner', t.x + 1.4, t.z, 0, t.ex.sign]); if (t.k === 'forge') { props.push(['pot', t.x, t.z, 0], ['rack', t.x + 1.6, t.z + 0.6, 0.4]); fires.push([t.x - 0.4, t.z + 0.9]); } if (t.k === 'inn') props.push(['pot', t.x, t.z, 0], ['log', t.x + 1.4, t.z + 1, 0.3]); if (t.k === 'board') props.push(['rack', t.x, t.z, 0]); if (t.k === 'books') props.push(['log', t.x, t.z, 0]); if (t.prop) props.push([t.prop, t.x, t.z, t.yaw || 0, t.sign]); }
  if (WS.place === 'lijia' && night) fires.push([WPL.lijia.spots.hearth[0], WPL.lijia.spots.hearth[1]]);
  const bedT = things.find(t => t.k === 'bed' || (t.k === 'bunk')), bedrolls = bedT ? [[bedT.x, bedT.z, 0, false]] : [];
  const camp = { world: true, map: P.map, biome: WCORE.biome(WS.day, night), fog: night ? 0.3 : 0.12, type: 'ronin', team: 0, fires, tents: [], props, bedrolls, npcs, things, me: { x: at[0], z: at[1], yaw: 0, role: 'spear' }, myRank: wRank() };
  ZC = null; ZB = null; WB = null;
  WZ = { place: WS.place, people, things, chatT: 5, hourT: 0, night };
  if (bedT) ZC = { bed: [bedT.x, bedT.z], world: true }; // (the bed marker: main.js marks ZC.bed)
  startGame({ seed: (Math.random() * 0x7fffffff) | 0, battle: P.map, mode: 'campaign', mission: 'zcamp', camp, players: [{ name: WS.name.zh, team: 0, connected: true }] }, 0, null, 1);
  const sim = state.sim; WZ.map = {}; WZ.pp = {}; for (const u of sim.units) if (u.camp) { const e = people[u.ci]; if (!e) continue; WZ.map[u.id] = e.p.k; WZ.pp[u.id] = e.p; u.look = Object.assign({ id: 'w:' + e.p.k }, e.p.look || {}); if (state.renderer) state.renderer.colorFigure(u.id, u); }
  // things snapped onto clear ground by the sim: keep its places
  WZ.things = sim.cfg.camp.things || things; { const bt = WZ.things.find(t => t.k === 'bed' || t.k === 'bunk'); if (bt && ZC) { ZC.bed = [bt.x, bt.z]; if (state.renderer && state.renderer.markBed) state.renderer.markBed(bt.x, bt.z); } }
  { const me = sim.units[sim.players[0].heroId]; if (me) { me.look = Object.assign({ id: 'w:me' }, wMyLook()); if (state.renderer) state.renderer.colorFigure(me.id, me); } }
  $('army').hidden = true; $('status').style.visibility = 'hidden'; MUSIC.play('menu'); MUSIC.setIntensity(night ? 0.12 : 0.2); if (night) AUDIO.setFire(0.3);
  const F = wFmt(WS.day); banner(`${P.zh} · ${P.en}`, `${F.zh} · ${wHourName(WS.hour)}`, 3.2);
  wSave(); wAfterScene();
}
// what you wear: your standing shows
function wMyLook() { const r = wRank(); if (WS.jin) return { hat: 'shaved', h: 1.0 }; if (WS.office) return { hat: 'chief', h: 1.02, beard: 'mous' }; if (WS.army) return { hat: 'chief', h: 1.02 }; if (r >= 10) return { hat: 'scholar', h: 1.0 }; return { hat: 'kerchief', h: 1.0, apron: WS.place === 'lijia' }; }

// ---------------- looking and using ----------------
function wLook() {
  const sim = state.sim, h = localHero(); if (!h || h.dead || !WZ) return null;
  let tb = null, td = 2.2; for (const t of WZ.things) { const d = Math.hypot(h.x - t.x, h.z - t.z); if (d < td) { td = d; tb = t; } }
  let best = null, bd = 0.5; const fx = Math.sin(Input.yaw), fz = Math.cos(Input.yaw);
  for (const u of sim.units) { if (!u.camp) continue; const dx = u.x - h.x, dz = u.z - h.z, d = Math.hypot(dx, dz); if (d > 3.4 || d < 0.3) continue; const off = 1 - (dx * fx + dz * fz) / d; if (off < bd) { bd = off; best = u; } }
  if (best && (!tb || bd < 0.25)) return { u: best, p: (WZ.pp && WZ.pp[best.id]) || wPerson(WZ.map[best.id]) };
  return tb ? { t: tb } : null;
}
const W_THING = { forge: ['Work the forge with your father (four hours)', '打鐵'], bed: ['Sleep until morning', '睡覺'], bunk: ['Sleep in the barracks', '睡覺'], books: ['Read your books (three hours)', '讀書'], inn: ['Take a room for the night (40 wen)', '住店'], board: ['Read the notices', '看榜'] };
function wPrompt(t) {
  if (t.p) return `<kbd>E</kbd>${t.p.zh} ${t.p.en}`;
  const T = t.t; if (T.k === 'exit') { const P = WPL[T.to], ex = T.ex; const dd = wDays(ex); return `<kbd>E</kbd>${ex.days ? `Take the road to ${P.en} (${dd} day${dd > 1 ? 's' : ''}${ex.via ? ', by ' + ex.via : ''})` : `Go through to ${P.en}`}`; }
  const W = W_THING[T.k]; return W ? `<kbd>E</kbd>${W[0]}` : '';
}
function wKeyE() {
  if (state.zheDlg || WS.busy) return true; const t = wLook(); if (!t) return true;
  if (t.p) { wTalk(t.p, t.u); return true; }
  const T = t.t;
  if (T.k === 'exit') return wGo(T.ex), true;
  if (T.k === 'forge') { wForge(); return true; }
  if (wThingUse(T)) return true;
  if (T.k === 'books' || T.k === 'desk') { wPass(3, () => { const g = Math.max(0.4, 2.6 - WS.learning / 40) * (WCORE.inv(WS, 'book') ? 1.5 : 1); WS.learning = Math.min(100, WS.learning + g); toast(`You read the Four Books for three hours. Learning ${WS.learning.toFixed(0)}.`); }); return true; }
  if (T.k === 'bunk') { wBunk(); return true; }
  if (T.k === 'bed') { wSleep(); return true; }
  if (T.k === 'inn') { if (WS.cash < 40) { toast('You have not got forty wen.'); return true; } WS.cash -= 40; wSleep(); return true; }
  if (T.k === 'board') { wBoard(); return true; }
  return true;
}
// time passes doing something: the clock moves, then the outcome
function wPass(hours, done) { WS.hour += hours; if (done) done(); if (WS.hour >= 22) { toast('It is late. You are falling asleep where you stand.'); return wSleep(true); } wSave(); if (wNight() !== WZ.night) wScene(); }
function wSleep(rough) {
  WS.hour = 6; wTurnDays(1); if (rough && WS.place !== 'lijia') { WS.health = Math.max(20, WS.health - 6); }
  const F = wFmt(WS.day); wSave();
  if (!WS.alive) return wDie();
  if (WS.flags.pendingBattle) { const m = WS.flags.pendingBattle; WS.flags.pendingBattle = null; return wBattle(m); }
  if (WS.flags.fallHere && !WS.flags.fallDone) { WS.flags.fallDone = 1; return wBattle('dj1'); }
  zCards([{ title: `${F.zh}`, year: F.en, p: [wMorning()].concat(wLifeNews()) }], () => wScene());
}
function wMorning() { const N = wNews(WS.place).filter(e => !WS.heard[e[1]]); if (N.length) { const e = N[N.length - 1]; WS.heard[e[1]] = 1; return `You wake. In the street, people are saying: ${e[3]}`; } return 'You wake to another day.'; }
// the road: the days go by on it, and you arrive
function wGo(ex) {
  const P = WPL[ex.to];
  if (ex.rank && wRank() < ex.rank) { toast(`The guards turn you back. Only men of rank pass to ${P.en}.`); return; }
  { const why = wRoadShut(ex); if (why) { toast(why); return; } }
  const days = wDays(ex), cost = days * (WCORE.inv(WS, 'horse') ? 45 : 30); if (days && WS.cash < cost) { toast(`The road to ${P.en} will cost you about ${cost} wen in food and lodging${WCORE.inv(WS, 'horse') ? ' and fodder' : ''}. You have ${WS.cash}.`); return; }
  const from = WS.place; WS.cash -= cost; if (days) { wTurnDays(days); WS.hour = 9; } WS.place = ex.to; WS.from = from; wSave();
  if (!days) return wScene(from); ex = Object.assign({}, ex, { days });
  const F = wFmt(WS.day), N = wNews(WS.place).slice(-2).map(e => e[3]);
  const arrive = () => zCards([{ title: `${WPL[from].zh} → ${P.zh}`, year: `${ex.days} day${ex.days > 1 ? 's' : ''} on the road${ex.via ? ', by ' + ex.via : ''} · ${F.en}`, p: [`You reach ${P.en}. ${P.desc}`].concat(N.length ? ['On the road you heard: ' + N.join(' ')] : []) }], () => wScene(from));
  if (wRoadMeet(ex, arrive)) return; arrive();
}
function wBoard() {
  if (WS.place === 'liaoyang' && WS.day >= D(1618, 4, 13) && !WS.flags.grievances) { WS.flags.grievances = 1; return wGrievances(); }
  const done = WEX.filter(e => e[2] === WS.place && WS.day >= e[7] && WS.exams[e[0] + e[1]] !== undefined && !WS.exams[e[0] + e[1] + 'read']);
  if (!done.length) { const nx = WEX.filter(e => e[1] > WS.day && e[2] === WS.place)[0]; toast(nx ? `A notice: ${nx[9]} will be held here on ${wFmt(nx[1]).en}.` : 'Old notices, rain-streaked.'); return; }
  const e = done[0], got = WS.exams[e[0] + e[1]]; WS.exams[e[0] + e[1] + 'read'] = 1;
  if (got >= e[6]) { WS.status = e[5]; wLog(`${e[8]}中了！`, `Passed ${e[9]}.`); banner(`中了 · Your name is on the list`, `You are now ${W_STATUS[e[5]][2]}`, 5); AUDIO.play('ui');
    if (e[5] === 'jinshi') { WS.flags.awaitPost = 1; } }
  else { wLog(`${e[8]}落榜。`, `Failed ${e[9]}.`); toast(`You read the list twice. Your name is not on it. (Your paper scored ${got}; the line was about ${e[6]}.)`); }
  wSave();
}

// ---------------- talk ----------------
function wTalk(p, u) {
  if (p.folk) return wTalkFolk(p, u);
  const me = wRank(), rel = p.rank - me, T = wTitle(), age = p.born ? wDate(WS.day).y - p.born : 0;
  const greet = p.role === 'father' ? ['回來了？去拉風箱。', 'Back, are you? Work the bellows.'] : p.role === 'mother' ? ['鐵兒，餓了吧？', 'Tie, are you hungry?'] : p.role === 'sister' ? ['哥！', 'Brother!']
    : rel >= 30 ? ['何人？', 'Who are you?'] : rel >= 8 ? ['有事？', 'What is it?'] : me >= 40 && p.rank < 40 ? ['老爺。', 'Your Honour.'] : me >= 10 && p.rank < 10 ? ['相公。', 'Sir.'] : ['嗯？', 'Hm?'];
  const topics = [];
  const say = (q, a, fx) => topics.push({ q, a, fx });
  // the news he has heard
  const N = wNews(WS.place).filter(e => !(p.hist && e[1] === p.k)); if (N.length && !['sister'].includes(p.role)) { const e = N[N.length - 1]; say('What news?', [[e[2], e[3]]], () => { WS.heard[e[1]] = 1; }); }
  say('Who are you?', [[`我是${p.zh}。`, `${p.en}: ${p.t}${age ? `, ${age} years old` : ''}.`]]);
  // what he can do for you, by who he is and who you are
  if (p.role === 'teacher') say('Teach me (three hours, 20 wen)', [['坐下。今天講《孟子》。', 'Sit. Today, Mencius.']], () => { if (WS.cash < 20) return toast('You have no money for the lesson.'); WS.cash -= 20; wPass(3, () => { WS.learning = Math.min(100, WS.learning + Math.max(0.8, 4 - WS.learning / 22)); toast(`Learning ${WS.learning.toFixed(0)}.`); }); });
  if (p.role === 'teacher') say('Can I pass the licentiate exam?', [[WS.learning >= 46 ? '你可以試試。四月在遼陽儒學考。' : WS.learning >= 30 ? '還差些火候。多讀書。' : '你？先把字認全了。', WS.learning >= 46 ? 'You can try. It is held at the Liaoyang school in the fourth month.' : WS.learning >= 30 ? 'Not yet. Read more.' : 'You? Learn your characters first.']]);
  if (p.role === 'father') say('What should I do with my life?', [['打鐵餓不死人。讀書？讀書要錢。當兵？當兵的回不來。', 'A smith never starves. Study? Study costs money. The army? Soldiers don\'t come back.'], ['……你自己想好。', '...Make up your own mind.']]);
  if (p.role === 'mother') say('Eat', [['（她給你盛了一碗粥。）', '(She ladles you a bowl of gruel.)']], () => { WS.health = Math.min(100, WS.health + 8); });
  if (p.role === 'recruiter' && !WS.army) say('Enlist', [['好小子。按個手印。一兩八錢一個月，管飯。', 'Good lad. Your thumbprint here. A tael and eight a month, and fed.'], ['你跟劉總兵走東路，從寬甸出。', 'You go with General Liu Ting, the east road, out of Kuandian.']], () => { WS.army = { r: 0, col: 'liu', unit: 'Liaoyang levy, Liu Ting\'s east column', since: WS.day }; WS.lodge = 'barracks'; wLog('在遼陽投軍。', 'Enlisted at Liaoyang.'); banner('投軍 · Enlisted', 'You are a soldier of the Liaodong army', 4); wScene(); });
  if (p.role === 'drill' && WS.army) say('Drill (three hours)', [['站好！刀舉起來！', 'Stand straight! Blade up!']], () => wPass(3, () => { WS.arms = Math.min(100, WS.arms + 2.2); toast(`Three hours of drill. Arms ${WS.arms.toFixed(0)}.`); }));
  if (p.role === 'inn' || p.role === 'food') say('Eat (10 wen)', [['來了！', 'Coming!']], () => { if (WS.cash < 10) return toast('No money.'); WS.cash -= 10; WS.health = Math.min(100, WS.health + 6); });
  // the exams: register with whoever keeps the hall on its day
  const ex = WEX.find(e => e[2] === WS.place && WS.day >= e[1] && WS.day <= e[1] + 2 && (p.role === 'instructor' || p.role === 'proctor'));
  if (ex && WS.exams[ex[0] + ex[1]] === undefined) {
    if (WS.status !== ex[4]) say(`Sit ${ex[9]}`, [[ex[4] === 'none' ? '你已經有功名了。' : '你沒有資格。', ex[4] === 'none' ? 'You already hold a degree.' : `You are not qualified: it is for ${W_STATUS[ex[4]][2]}s.`]]);
    else say(`Sit ${ex[9]}`, [['進去吧。號舍在左。', 'In you go. The cells are on the left.']], () => wExam(ex));
  }
  if (p.role === 'libu' && WS.status === 'jinshi' && !WS.office) say('Ask about a post', [['等著吧。進士候選，總要等的。', 'Wait. Every jinshi waits for a post.'], ['……也有人送點東西，就快些。', '...Some send a little something, and it goes faster.']], () => { WS.office = { zh: '知縣', en: 'County Magistrate', rank: 43, place: 'a county of Shuntian', since: WS.day }; WS.flags.awaitPost = 0; wLog('授知縣。', 'Appointed a county magistrate.'); banner('授官 · Appointed', 'County Magistrate (知縣), rank 7a', 5); });
  if (p.role === 'passguard') say('Pass through', [[me >= 10 ? '相公請。' : '路引呢？……算了，給二十文。', me >= 10 ? 'Please, sir.' : 'Your papers? ...Never mind. Twenty wen.']], () => { if (me < 10) WS.cash = Math.max(0, WS.cash - 20); });
  if (p.role === 'grandee' || p.role === 'general') { if (me < 20) say('Ask to speak with him', [['（衛兵把你推開了。）', '(The guards push you back.)']]); else say('Pay your respects', [[`${T[0]}有心了。`, `Kind of you, ${T[1]}.`]], () => { WS.rel[p.k] = (WS.rel[p.k] || 0) + 1; }); }
  wTalkMore(p, say, me);
  const r = { zh: p.zh, en: p.en, t: p.t };
  wDialog(r, greet, topics, u);
}
// the conversation: the one text panel (shared with the campaigns' camps)
function wDialog(r, greet, topics, u) {
  if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; $('pause').hidden = true; state.zheDlg = { k: r.zh };
  let box = $('zheDlg'); if (!box) { box = document.createElement('div'); box.id = 'zheDlg'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const h = localHero(); if (h && u) Input.yaw = Math.atan2(u.x - h.x, u.z - h.z);
  const render = (lines, list) => { box.hidden = false;
    box.innerHTML = `<div class="who">${r.zh} ${r.en}<small>${r.t}</small></div>${lines.map(l => `<div class="zh">${l[0]}</div><div class="en">${l[1]}</div>`).join('')}<div class="ch">${list.map((t, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd>${t.q}</button>`).join('')}<button type="button" data-i="-1"><kbd>Esc</kbd>Leave</button></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => choose(+b.dataset.i)); state.zheDlg.topics = list; };
  let left = topics.slice();
  const choose = (i) => { AUDIO.play('ui'); if (i < 0) { close(); return; } const t = state.zheDlg.topics[i]; if (!t) return; left = left.filter(x => x !== t);
    render([[`「${t.q}」`, ''], ...t.a], left); if (t.fx) { const f = t.fx; t.fx = null; close(); f(); } };
  const close = () => { box.hidden = true; state.zheDlg = null; wSave(); requestLock(); };
  state.zheDlg.choose = choose; state.zheDlg.close = close; render([greet], left);
}

// ---------------- the exam: a cell, a desk, a paper ----------------
function wExam(ex) {
  WS.busy = true; if (document.pointerLockElement) document.exitPointerLock();
  const qs = WQ.slice().sort(() => Math.random() - 0.5).slice(0, 3); let score = 0, qi = 0, extra = 0; const notes = [], key = ex[0] + ex[1];
  let box = $('wExam'); if (!box) { box = document.createElement('div'); box.id = 'wExam'; document.body.appendChild(box); const st = document.createElement('style'); st.textContent = `#wExam { position: fixed; inset: 0; z-index: 70; background: rgba(12,10,8,.9); display: flex; align-items: center; justify-content: center; }
#wExam .pp { width: min(720px, 92vw); background: #efe6cf; color: #2a2018; padding: 26px 30px; border: 1px solid #8a6a3a; font: 15px/1.6 Georgia, serif; box-shadow: 0 10px 40px #000; }
#wExam h3 { margin: 0 0 4px; font: 700 18px Georgia, serif; } #wExam .q { font: 600 22px/1.5 serif; margin: 14px 0 4px; } #wExam .qe { color: #5a4a36; font-size: 13px; margin-bottom: 12px; }
#wExam button { display: block; width: 100%; text-align: left; margin: 6px 0; padding: 8px 12px; background: #f8f2e2; border: 1px solid #b89a6a; font: 14px/1.4 Georgia, serif; color: #2a2018; cursor: pointer; } #wExam button:hover { background: #fff8e8; }
#wExam small { color: #6a5a46; }`; document.head.appendChild(st); }
  const page = (h, btns, on) => { box.hidden = false; box.innerHTML = `<div class="pp"><h3>${ex[8]} · ${ex[9]}</h3>${h}${btns.map((t, i) => `<button type="button" data-i="${i}">${t}</button>`).join('')}</div>`; box.querySelectorAll('button').forEach(b => b.onclick = () => { AUDIO.play('ui'); on(+b.dataset.i); }); };
  // the gate: every candidate is searched to the skin
  const gate = () => { if (!WCORE.inv(WS, 'crib')) return cell(); WCORE.give(WS, 'crib', -1);
    if (Math.random() < 0.3) { WS.exams[key] = 0; WS.flags.caughtCrib = WS.day; WS.health = Math.max(10, WS.health - 25); if (WS.status === 'shengyuan' || WS.status === 'juren') WS.status = 'none'; wLog('夾帶被搜出。', 'Caught at the gate with a crib-shirt.');
      return page(`<small>The search at the gate (搜檢)</small><p>The searcher's fingers find the lining. He holds the shirt up to the lantern for everyone to see: the Four Books in characters the size of ants. You are dragged out, stripped of any degree you held, and put in the cangue outside the hall for three days.</p>`, ['Go'], () => { box.hidden = true; WS.busy = false; WS.hour = 18; wSave(); wScene(); }); }
    extra += 8; notes.push('The searchers missed the crib-shirt in your lining.'); cell(); };
  // a night in the cell
  const cell = () => { const c = WCORE.CELL[Math.floor(Math.random() * WCORE.CELL.length)];
    page(`<small>Your cell: a board to sit on, a board to write on, a curtain. The first night.</small><div class="q">${c[0]} · ${c[1]}</div><p>${c[2]}</p>`, c[3].map(o => o[0]), (i) => { const o = c[3][i]; extra += o[2]; WS.health = Math.max(5, WS.health + o[3]); WS.karma = (WS.karma | 0) + (o[4] | 0); WS.cash = Math.max(0, WS.cash - (o[5] | 0)); notes.push(o[1]); show(); }); };
  const show = () => { const q = qs[qi]; const opts = q[2].map((t, i) => [t, i]).sort(() => Math.random() - 0.5);
    box.hidden = false; box.innerHTML = `<div class="pp"><h3>${ex[8]} · ${ex[9]}</h3><small>Question ${qi + 1} of 3. Expound the passage.</small><div class="q">${q[0]}</div><div class="qe">${q[1]}</div>${opts.map(([t, i]) => `<button type="button" data-i="${i}">${t}</button>`).join('')}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => { const i = +b.dataset.i; const L = WS.learning; score += i === 0 ? 16 + L * 0.24 : i === 1 ? 6 + L * 0.1 : 2; qi++; AUDIO.play('ui'); if (qi < 3) show(); else bagu(); }); };
  // the eight-legged form: the parts of the essay in their order
  const bagu = () => { const B = WCORE.BAGU, have = WCORE.inv(WS, 'book') ? 2 : 0; let next = have, wrong = 0; const order = B.map((b, i) => i).sort(() => Math.random() - 0.5);
    const draw = () => page(`<small>The essay must be written in the eight-legged form (八股). Choose its parts in their order.${have ? ' (Your model essays remind you how it opens.)' : ''}</small><p>${B.slice(0, next).map(b => `<b>${b[0]}</b>`).join(' → ') || '…'}</p>`, order.filter(i => i >= next).map(i => `${B[i][0]} · ${B[i][1]}`), (k) => { const left = order.filter(i => i >= next), i = left[k];
      if (i === next) { next++; if (next >= B.length) { extra += Math.max(0, 6 - wrong); notes.push(wrong ? `Your essay's form had ${wrong} fault${wrong > 1 ? 's' : ''}.` : 'Your essay\'s form was faultless.'); return finish(); } } else wrong++; draw(); });
    draw(); };
  const finish = () => { box.hidden = true; WS.busy = false; const luck = (Math.random() - 0.5) * 12 + (WS.luck && WS.luckTo > WS.day ? WS.luck : 0), total = Math.round(score / 3 + WS.learning * 0.45 + luck + extra + (WCORE.inv(WS, 'book') ? 2 : 0)); WS.exams[key] = total;
    wLog(`考了${ex[8]}。`, `Sat ${ex[9]}.`); WS.hour = 18; wSave(); zCards([{ title: `${ex[8]} · ${ex[9]}`, year: wFmt(WS.day).en, p: notes.concat([`You hand in your paper as the light goes. The list goes up on ${wFmt(ex[7]).en}: read it on the notice board here.`]) }], () => wScene()); };
  gate();
}

// ---------------- battles: when history comes for your company ----------------
function wBattle(mission) {
  const M = SIM.MISSIONS[mission]; if (!M) return wScene();
  WB = { mission }; WZ = null; ZC = null; ZB = null;
  const cards = wBattleCards(mission);
  zCards(cards, () => { startGame({ seed: (Math.random() * 0x7fffffff) | 0, battle: M.battle, mode: 'campaign', mission, players: [{ name: WS.name.zh, team: M.side | 0, connected: true }] }, 0, null, 1); });
}
function wFinish(winner) {
  const sim = state.sim, M = sim.mission, me = sim.players[state.localIdx], h = sim.units[me.heroId]; const won = winner === (M.side | 0), alive = !!(h && !h.dead);
  const mission = WB.mission; WB = null;
  if (!alive) { wLog('死了。', 'Died.'); return wDie(`in battle at ${M.title.split(' · ').slice(-1)[0]}`); }
  const heads = wHeads(me.kills | 0);
  if (mission === 'roadA') { WS.flags.pendingBattle = 'abudali'; wTurnDays(2); WS.flags.pendingBattle = null; return wBattle('abudali'); }
  if (wFinishMore(mission, heads)) return;
  if (mission === 'abudali') { if (WS.day < D(1619, 3, 12)) wTurnDays(D(1619, 3, 12) - WS.day); wMatesFall(0.6); WS.place = 'liaoyang'; WS.from = 'west'; WS.hour = 9; WS.army.r = Math.min(W_ARMY.length - 1, WS.army.r + 1); wLog('從阿布達里岡逃回遼陽。', 'Came back from Abudali to Liaoyang.');
    wSave(); return zCards([{ title: '敗歸 · Back from Abudali', year: wFmt(WS.day).en, p: ['Liu Ting\'s column was destroyed at Abudali. You and a handful of others came back through the hills to Liaoyang, nine days on foot.', `For bringing men back you are made ${W_ARMY[WS.army.r][2]}.`] }], () => wScene('west')); }
  wAfterFall();
}

// ---------------- the clock in a place, the prompt, the talk around you ----------------
function wHUD(dt) {
  const sim = state.sim; let pr = $('zhePrompt'); $('status').style.visibility = 'hidden';
  if (state.zheDlg || WS.busy) { if (pr) pr.hidden = true; return; }
  if (!pr) { pr = document.createElement('div'); pr.id = 'zhePrompt'; document.body.appendChild(pr); }
  const t = wLook(); pr.hidden = !t; if (t) pr.innerHTML = wPrompt(t);
  // the day goes by: an hour every fifteen seconds; dusk turns the place to night
  WS.hour += dt / 15; WZ.hourT += dt; if (WZ.hourT > 10) { WZ.hourT = 0; wSave(); }
  if (wNight() !== WZ.night && !state.zheDlg) { if (WS.hour >= 24) return wSleep(true); return wScene(); }
  WZ.chatT -= dt; if (WZ.chatT <= 0) { WZ.chatT = 8 + Math.random() * 8; const h = localHero(); if (!h) return; const near = sim.units.filter(u => u.camp && Math.hypot(u.x - h.x, u.z - h.z) < 14); if (!near.length) return; const u = near[Math.floor(Math.random() * near.length)];
    const fp = WZ.pp && WZ.pp[u.id]; if (fp && fp.folk && Math.random() < 0.5) { const T = WCORE.TR[fp.folk.trade], l = T.talk[Math.floor(Math.random() * T.talk.length)]; SPEECH.say(u.id, l[0], l[1], { prio: 0, cool: 12 }); return; }
    const N = wNews(WS.place); const L = N.length && Math.random() < 0.6 ? N[N.length - 1 - Math.floor(Math.random() * Math.min(3, N.length))] : null; if (L) SPEECH.say(u.id, L[2], L[3], { prio: 0, cool: 12 }); }
}

// ---------------- entry: the menu card, Begin / Continue ----------------
function wStart(fresh) { if (fresh || !WS) { WS = wFresh(); wSave(); } AUDIO.init(); $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  if (!WS.alive) { WS = wFresh(); wSave(); }
  if (fresh) return zCards([{ title: '人間 · A life', year: wFmt(WS.day).en, p: ['You are Li Tie, sixteen, the smith\'s son of Lijia village under Liaoyang. You can read a little; Master Zhang taught you. Your father wants you at the forge.', 'This spring the Jin will take Fushun, forty miles to the north-east. After that nothing in Liaodong will be the same, whatever you do. Live your life: work, study, travel, enlist. The world will not wait for you.', 'Look at a person and press E to talk; look at a thing (the forge, your books, your bed, a road marker) and press E to use it. A day passes in a few minutes; the road takes days.'] }], () => wScene('start'));
  wScene(); }
function wMenu() {
  let el = $('wCta'); const z = $('djCta') || $('zheCta'); if (!z) return;
  if (!el) { el = document.createElement('div'); el.id = 'wCta'; el.className = z.className; z.parentNode.insertBefore(el, z.nextSibling); }
  const s = wLoad(); WS = s;
  el.innerHTML = `<div><b>人間 · An open world (experimental)</b><small>Liaodong and Beijing from the spring of 1618: live as Li Tie, a smith's son. Work, study for the exams, go to Beijing, enlist. Real people, real events; the world goes on without you.${s && s.alive ? ` Now: ${wFmt(s.day).en}, ${WPL[s.place].en}.` : ''}${wHallHtml()}</small></div><div class="btns">${s && s.alive ? '<button type="button" class="btn primary" id="wGoOn">Continue</button>' : ''}<button type="button" class="btn${s && s.alive ? '' : ' primary'}" id="wNew">${s && s.alive ? 'New life' : 'Begin'}</button></div>`;
  const go = $('wGoOn'); if (go) go.onclick = () => wStart(false); $('wNew').onclick = () => { if (s && s.alive && !confirm('Start a new life? This one will be lost.')) return; wStart(true); };
}
// the hooks: the world's places and battles answer the shared entry points
{ const kE = zheKeyE, hud = zheHUD, fin = zheFinish;
  zheKeyE = function () { if (WZ && WS && state.sim && state.sim.cfg.camp && state.sim.cfg.camp.world) return wKeyE(); return kE(); };
  zheHUD = function (dt) { if (WZ && WS && state.sim && state.sim.cfg.camp && state.sim.cfg.camp.world) return wHUD(dt); return hud(dt); };
  zheFinish = function (w) { if (WB) return wFinish(w); return fin(w); }; }
setTimeout(() => { try { wMenu(); } catch (e) { } }, 400);
window.__world = { wBunk, wAfterFall, wArmyMoment, WCORE, wLifeDay, wTalkFolk, wJournal, wForge, wCourt, wChoice, wPeopleHere, wStart, wFresh, wTurnDays, wGo, wSleep, wScene, wBoard, wExam, wTalk, wLook, wPerson, WEX, WPL, get WS() { return WS; }, set WS(v) { WS = v; } }; // test hooks
