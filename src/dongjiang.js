// ===================== 東江 · The East River: a story campaign, 1621–1637 =====================
// The war's other front: the people of Liaodong who ran from the banners to the coast and the islands off Korea, Mao
// Wenlong's East River command on Pidao, the raids behind the Jin lines, two invasions of Korea, the general's death on
// Shuangdao, the Wuqiao mutiny and the siege of Dengzhou, and the fall of the island in 1637 to East River men who had gone
// over. One smith's son grows up in it with the same file of men around him for sixteen years.
// Built like the Plain White Niru (jin.js): its own save ('mingDongjiang'), chapters as data (DCH), the Zhejiang machinery for
// speech, cards, the talk panel and the squad grid (ZB / ZC with .dj), its battles in dj_missions.js and its fields in
// dj_maps.js. A camp can be pitched on a real field at night (camp.map / camp.biome).
// Sources are named in the chapters' cards; where a raid or a scene is a composite, the card says so.
const DKEY = 'mingDongjiang', DGO = 'mingDongjiangGo';
var DS = null; // the save (var: the choices module asks for it by name)
// ---------- the file ----------
// born: the year he was born (the cards give his age); joins: the chapter he comes in (0 = from the start); draft: fills a gap
const DR = [
  { k: 'me', zh: '李鐵', en: 'Li Tie', t: 'the smith\'s son', born: 1604 },
  { k: 'zhao', zh: '趙大', en: 'Zhao Da', t: 'a soldier of the Liaoyang garrison', born: 1581 },
  { k: 'sun', zh: '孫老鐵', en: 'Old Sun', t: 'your father\'s friend, a smith', born: 1561 },
  { k: 'qian', zh: '錢秀才', en: 'Qian the Scholar', t: 'a failed licentiate who keeps a diary', born: 1590 },
  { k: 'gou', zh: '吳狗兒', en: 'Wu Gou\'er', t: 'a street boy of the east quarter', born: 1608 },
  { k: 'zheng', zh: '鄭老', en: 'Old Zheng', t: 'a cook from the garrison kitchens', born: 1566 },
  { k: 'liu', zh: '劉黑子', en: 'Liu Heizi', t: 'a carter, whose brother was on the east wall', born: 1598 },
  { k: 'erniu', zh: '李二妞', en: 'Li Erniu', t: 'your sister', born: 1606, woman: true },
  { k: 'feng', zh: '馮屠戶', en: 'Feng the butcher', t: 'a neighbour', born: 1588 },
  { k: 'dong', zh: '董貨郎', en: 'Dong the peddler', t: 'a neighbour', born: 1593 },
  { k: 'kim', zh: '金順', en: 'Kim Sun', t: 'a Korean border boy, son of a ferryman', born: 1605, joins: 4 },
  // guests: people who talk at the fire but do not fight in the file
  { k: 'ma_mother', zh: '李大娘', en: 'Your mother', t: 'the smith\'s widow', guest: true, woman: true },
  { k: 'chenlc', zh: '陳良策', en: 'Chen Liangce', t: 'a Zhenjiang townsman', guest: true },
  { k: 'kimuncle', zh: '金老漢', en: 'Kim\'s uncle', t: 'the headman of the village', guest: true },
];
const DLOOK = {
  me: { h: 1.0, hat: 'band', bandCol: 0x5a4a3a, brows: 'thin', young: true },
  zhao: { h: 1.06, hat: 'rattan', brows: 'knit', beard: 'stubble', scar: true, skin: 0xbf9670 },
  sun: { h: 0.96, hat: 'felt', brows: 'thick', beard: 'full', grey: true, bulk: true, apron: true, skin: 0xb88c66 },
  qian: { h: 0.97, hat: 'scholar', brows: 'thin', beard: 'goatee', brush: true, skin: 0xe2c4a0 },
  gou: { h: 0.82, hat: 'band', bandCol: 0x8a2a20, brows: 'high', young: true, grin: true, skin: 0xd8b088 },
  zheng: { h: 0.94, hat: 'cookcap', brows: 'sad', beard: 'longmous', grey: true, belly: true, skin: 0xd8a07a },
  liu: { h: 1.08, hat: 'wrap', wrap: 0x2a2620, brows: 'knit', beard: 'stubble', bulk: true, skin: 0xb48a62 },
  erniu: { h: 0.9, hat: 'kerchief', kerch: 0x3a5a7a, brows: 'thin', young: true, rosy: true, woman: true, skin: 0xe8c6a2 },
  feng: { h: 1.1, hat: 'wrap', wrap: 0x6a3a2a, brows: 'thick', bulk: true, apron: true, bigNose: true },
  dong: { h: 0.98, hat: 'straw', brows: 'high', beard: 'mous', charm: true },
  kim: { h: 0.95, hat: 'gat', brows: 'thin', young: true, coat: 0xe8e4da, skin: 0xd8b48e },
  ma_mother: { h: 0.88, hat: 'kerchief', kerch: 0x2a2a30, brows: 'sad', grey: true, woman: true },
  chenlc: { h: 1.0, hat: 'scholar', brows: 'thick', beard: 'mous' },
  kimuncle: { h: 0.96, hat: 'gat', brows: 'sad', beard: 'longmous', grey: true, coat: 0xe8e4da },
};
const dRow = (k) => DR.find(r => r.k === k);
const dIdx = (k) => DR.findIndex(r => r.k === k);
function dLoad() { try { return JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) { return null; } }
function dSave() { try { localStorage.setItem(DKEY, JSON.stringify(DS)); } catch (e) { } }
function dFresh() { const s = { v: 1, dj: true, stage: 'c1', name: { zh: '李鐵', en: 'Li Tie' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, seen: {}, me: 'me' };
  for (const r of DR) if (!r.guest && !r.joins && !r.only) s.alive[r.k] = true; return s; }
function dMeRow() { const r = dRow('me'), nm = DS.me === 'me' ? DS.name : (DS.meName || { zh: '', en: '' }); r.zh = nm.zh; r.en = nm.en; }
function dDress(u, i) { const r = DR[i]; if (!u || !r) return; u.look = Object.assign({ id: 'd:' + r.k }, DLOOK[r.k] || {}, u.team === 1 ? { ming: true } : {}); /* your file in its Ming coat whichever side of the battle it is on */ if (state.renderer) state.renderer.colorFigure(u.id, u); }
function dGo(scene) { try { localStorage.setItem(DGO, scene); } catch (e) { } location.reload(); }
const dAge = (k, year) => { const r = dRow(k); return r && r.born ? year - r.born : 0; };
// who comes into the file at this chapter, and who is with it (the chapter's cast; by default everyone alive)
function dJoin(n) { for (const r of DR) if ((r.joins === n || (r.only && r.only.includes(n))) && DS.alive[r.k] === undefined) DS.alive[r.k] = true; }
const dMeK = (n) => { const P = DCH[n] && DCH[n].playAs; return (typeof P === 'function' ? P() : P) || DS.me; }; // whom you play in this chapter
// cards may carry fields worked out when they are shown (ages, what was chosen): resolve them
const dCards = (L) => (typeof L === 'function' ? L() : L).filter(Boolean).map(c => { const o = Object.assign({}, c); for (const f of ['p', 'year', 'title', 'html']) if (typeof o[f] === 'function') o[f] = o[f](); return o; });
function dFile(n) { const C = DCH[n] || {}, cast = C.cast, me = dMeK(n); return DR.filter(r => !r.guest && r.k !== me && r.k !== DS.me && DS.alive[r.k] && (!cast || cast.includes(r.k)) && (!C.away || !C.away.includes(r.k)) && (!r.only || r.only.includes(n)) && !(r.k === 'erniu' && !C.withErniu && !C.playAs)); }
const dDead = () => DR.filter(r => !r.guest && r.k !== DS.me && DS.alive[r.k] === false && (DS.fate[r.k] === 'dead' || DS.fate[r.k] === 'lost'));
const dName = (k) => k === DS.me ? DS.name : dRow(k);

// ---------- the chapters ----------
// DCH[n]: { intro: cards or () => cards, camp: { map, biome, at: [x, z], title, card, guests, chat, talk(k), choice: id } | null,
//   dawn: card, mission, battleCard: [text, title], who: { key: [zh, en] }, order: [file keys in squad order], wounds: { k: key },
//   fateText, after(won, li, outN) => cards, next }
const DCH = {};

// ========== 第一幕 · 遼陽 · Act One: the fall ==========
DCH[1] = {
  year: 1621, withErniu: true, mission: 'dj1', act: '第一幕 · 遼陽 · Act One: the fall',
  intro: [
    { title: '遼東 · Liaodong', year: 'Spring 1621 · 天啟元年', p: ['Liaodong is the Ming empire\'s corner beyond the Great Wall: a plain of farms and walled towns between the Liao River and the Yalu, held for two hundred years against the steppe and the forest peoples.',
      'Three years ago the Jurchen Khan Nurhaci declared war on the Ming. Two years ago he destroyed four Ming armies at Sarhu. This spring he has taken Shenyang. Liaoyang, the capital of Liaodong, is next.'], zh: '天啟元年三月，努爾哈赤陷瀋陽，進圍遼陽。' },
    { title: '你 · You', year: '鐵匠的兒子 · The smith\'s son', p: ['You are seventeen. Your father is a smith in the east quarter of Liaoyang: arrowheads and horseshoes for the garrison, plough-shares for everyone else. You can swing a hammer all day.',
      'You have never held a sword. Tonight you will.'],
      html: '<p><label style="font:14px sans-serif">Your name <input id="dName" value="李鐵" maxlength="6" style="width:6em;font-size:15px"> <input id="dNameEn" value="Li Tie" maxlength="14" style="width:8em;font-size:15px"></label></p>',
      onNext: () => { const zh = ($('dName').value || '李鐵').trim().slice(0, 6), en = ($('dNameEn').value || 'Li Tie').trim().slice(0, 14); DS.name = { zh, en }; dSave(); } },
    { title: '遼陽 · Liaoyang', year: 'The twenty-first day of the third month', p: ['For two days the banners have been at the walls. At noon the news ran through the streets that the east gate had a fire in its tower. At dusk the bells started, and did not stop.',
      'Your father took a pike from the rack and went to the wall. He told you to stay at the smithy, and if the bells kept going, to get your mother and your sister out.'], zh: '城中火起，鐘聲不絕。', btn: 'Into the street →' },
  ],
  camp: null,
  dawn: null,
  battleCard: ['Liaoyang, 1621. Get your family out of the burning city. LMB cut, RMB guard, E to get a man up.', '遼陽 · Liaoyang'],
  who: { file: ['陳千總', 'Captain Chen of the west quarter'], erniu: ['李二妞', 'Li Erniu'] },
  order: ['zhao', 'sun', 'qian', 'gou', 'zheng', 'liu', 'erniu', 'feng', 'dong'], wounds: { 4: 'zheng' },
  fateText: { out: 'came out through the water gate', dead: 'killed in the streets of Liaoyang', lost: 'left in the burning city' },
  after: (won, li, outN) => [
    { title: '遼陽 · What happened', year: 'The third month of 1621', p: ['Liaoyang fell in a night. The governor, Yuan Yingtai, hanged himself in the tower over the east gate; the inspector Zhang Quan was taken and would not kneel, and was killed. Within days seventy towns of Liaodong had surrendered or emptied.',
      'Nurhaci moved his court into the city. Han families who stayed were ordered to shave their foreheads and grow the queue, and many were given to the bannermen as bondservants. Those who could ran: west to the Great Wall, south to the coast, east to the Yalu and Korea.'], zh: '天啟元年三月二十一日，遼陽陷，經略袁應泰自縊。' },
    { title: '你們 · Your people', year: `${outN} came out`, html: `<ul>${li}</ul>`, p: [DS.alive.zheng ? 'Old Zheng limps, but he is walking.' : 'Old Zheng did not come out.', 'Your mother has the chest. Your father has not come.'], btn: 'East →' },
  ],
  next: 2,
};

DCH[2] = {
  year: 1621, withErniu: true, mission: 'dj2',
  intro: [
    { title: '東行 · East', year: 'The fourth month of 1621', p: ['You walked for ten days. Behind you the smoke of Liaoyang, then the smoke of the villages, then nothing. Around you more people every day: farmers with their ploughs on their backs, soldiers without officers, monks, a magistrate in a cart with his books.',
      'No one knows where the road goes in the end. East is the Yalu, and over it Korea; somewhere south is the sea. The Khan\'s riders come down the road every few days to take what they want: carts, horses, girls.'], zh: '遼民渡江者，不可勝數。' },
    { title: '趙大 · Zhao Da', year: 'A soldier of the Liaoyang garrison', p: ['Zhao Da was at the west gate when it fell and came out with you through the water gate. Nobody made him your leader. But when the riders come he is the one who says where to stand, and everybody stands there.'], btn: 'To the camp →' },
  ],
  camp: { map: 'djford', biome: 'night', fog: 0.3, at: [24, 96], title: '營 · Under the carts', card: 'The refugees camp on the north road, a mile above the Ai river ford. Walk among your people (look at someone and press E to talk). When you are ready, lie down on your bedroll (E).',
    guests: ['ma_mother'],
    chat: [['又一個孩子死了。今天第三個。', 'Another child died. That\'s three today.'], ['明天過河。過了河，就是寬甸。', 'We cross tomorrow. Over the river is Kuandian.'], ['別生火太大，北邊看得見。', 'Keep the fire small. They can see it from the north.'], ['我的鞋底磨穿了。', 'My soles are worn through.'], ['聽說朝鮮人不收我們。', 'They say the Koreans won\'t take us in.'], ['有人看見毛遊擊的船了，在江口。', 'Someone saw Major Mao\'s boats, at the river mouth.']],
    choice: 'dj2millet' },
  dawn: { title: '渡口 · The ford', year: 'The morning', p: ['The ford is knee-deep and forty paces wide, and every cart has to go over one at a time. Zhao Da puts the men who can fight on the north bank, across the road.', '"Anyone who wants the carts," he says, "comes through us."'], btn: 'To the ford →' },
  battleCard: ['The Ai river, 1621. Hold the north bank until the carts are across, then cross yourselves.', '靉河 · The ford'],
  who: { carts: ['', 'A carter'] },
  order: ['zhao', 'qian', 'sun', 'gou', 'zheng', 'liu', 'erniu', 'feng', 'dong'], wounds: { 2: 'sun' },
  fateText: { out: 'crossed the Ai', dead: 'killed at the ford', lost: 'left on the north bank' },
  after: (won, li, outN) => [
    { title: '靉河 · What happened', year: 'The fourth month of 1621', p: [DS.alive.sun ? 'You carried Old Sun across the ford on your back. He cursed you the whole way, and then he cried.' : DS.fate.sun === 'lost' ? 'Old Sun stayed on the north bank. The last you saw of him he was sitting on a stone with his hammer across his knees, facing the road.' : 'Old Sun died at the ford.',
      'The Korean border guards would not let the column over the Yalu at first. Then a rumour came down the road: a Ming officer called Mao Wenlong had come up the coast in boats, and was taking in every Liaodong man who could fight.'], zh: '毛文龍，浙江杭州人，以都司援朝鮮，招集遼民。' },
    { title: '你們 · Your people', year: `${outN} crossed`, html: `<ul>${li}</ul>`, btn: 'Zhenjiang →' },
  ],
  next: 3,
  talk: (k) => ({
    zhao: { g: ['你娘睡了？……好。你也睡。明天要用你的手。', 'Your mother asleep? ...Good. You sleep too. Tomorrow I need your hands.'], t: [
      { q: 'Did you see my father on the wall?', a: [['……我在西門。東牆那邊，我什麼都沒看見。', '...I was at the west gate. The east wall, I saw nothing.'], ['可是東牆上的人，沒有一個下來的。你要知道這個。', 'But of the men on the east wall, not one came down. You should know that.']] },
      { q: 'Why do you look after us?', bond: 1, a: [['我在遼陽當了二十年兵。守了二十年城。', 'Twenty years I was a soldier in Liaoyang. Twenty years guarding that city.'], ['城沒了。可城裡的人還有幾個。我就守你們吧。', 'The city\'s gone. But a few of its people are left. So I\'ll guard you.']] },
      { q: 'How do I hold a spear?', a: [['跟掄錘子一樣：腳先站穩，再出手。手比腳快，人就死了。', 'Like a hammer: plant your feet first, then strike. When your hands are faster than your feet, you die.']] }] },
    sun: { g: ['你爹打的那把刀，你帶出來沒有？', 'That blade your father made. Did you bring it?'], t: [
      { q: 'I brought his hammer.', bond: 1, a: [['（他把錘子接過去，在手裡掂了掂。）好錘子。他三十年都用這把。', '(He takes the hammer and weighs it in his hand.) A good hammer. Thirty years he used this one.'], ['到了能生火的地方，我教你把它打成刀。', 'When we get somewhere we can light a forge, I\'ll teach you to make it a blade.']] },
      { q: 'Your feet are bleeding.', a: [['六十歲的腳，走了十天。流點血是應該的。', 'Sixty-year-old feet, ten days on the road. They\'re allowed to bleed.'], ['別跟你娘說。', 'Don\'t tell your mother.']] }] },
    qian: { g: ['我在記。每天死了多少人，走了多少里。', 'I\'m writing it down. How many died each day, how many li we walked.'], t: [
      { q: 'Who will read it?', bond: 1, a: [['也許沒人。也許一百年以後有人。', 'Maybe no one. Maybe someone in a hundred years.'], ['可要是沒人記，就跟沒發生過一樣。', 'But if nobody writes it down, it\'s as if it never happened.']] },
      { q: 'You failed the examinations?', a: [['三次。府試。第三次考官說我的字太瘦。', 'Three times, the prefectural exam. The third time the examiner said my brushwork was too thin.'], ['現在我的字很胖了：都是死人的名字。', 'My brushwork is fat enough now. It\'s all names of the dead.']] }] },
    gou: { g: ['哥，你看這個。（一個銀鐲子。）', 'Brother, look at this. (A silver bracelet.)'], t: [
      { q: 'Where did you get that?', a: [['那個縣官的車上。他有好多。', 'Off that magistrate\'s cart. He\'s got loads.'], ['他的書比我的命值錢。我拿他一個鐲子，不算偷。', 'His books are worth more than my life. Me taking one bracelet doesn\'t count as stealing.']] },
      { q: 'Give it to my mother for bread.', bond: 1, flag: 'gouBracelet', a: [['……行。給大娘。可下回我偷的是我自己的。', '...All right. For Auntie. But the next one I steal is mine.']] }] },
    zheng: { g: ['小米還有兩天的。兩天以後……再說。', 'Millet for two more days. After two days... we\'ll see.'], t: [
      { q: 'How is your leg?', a: [['腫了。不礙事。廚子是站著死的。', 'Swollen. It doesn\'t matter. A cook dies on his feet.']] },
      { q: 'You fed the garrison?', bond: 1, a: [['三十年。三千人的飯。我認得一半人的臉，因為他們回來添飯。', 'Thirty years. Rice for three thousand. I knew half their faces, because they came back for seconds.'], ['現在認得的臉，都在這兒了。', 'The faces I know are all here now.']] }] },
    liu: { g: ['……', '...'], t: [
      { q: 'Your brother was on the east wall?', bond: 1, a: [['他叫劉大。比我高一個頭。', 'His name was Liu Da. A head taller than me.'], ['他說，金人上不來。他說了三天。', 'He said the Jin couldn\'t get up. He said it for three days.']] },
      { q: 'What will you do?', a: [['殺金人。殺到我數不清為止。', 'Kill Jin. Until I lose count.']] }] },
    erniu: { g: ['哥，娘不肯把箱子扔了。', 'Brother, Ma won\'t throw the chest away.'], t: [
      { q: 'What\'s in the chest?', a: [['爹的帳本。還有我的嫁妝。一床被子，兩對銀簪子。', 'Pa\'s ledgers. And my dowry. A quilt, two pairs of silver hairpins.'], ['……誰還娶我呀，在這條路上。', '...Who\'s going to marry me, on this road.']] },
      { q: 'You did well with the saw.', bond: 1, a: [['我砍了一個人的手。他叫起來像頭豬。', 'I cut a man\'s hand. He squealed like a pig.'], ['我晚上老聽見。', 'I keep hearing it at night.']] }] },
    feng: { g: ['我殺了二十年豬。殺人，也差不多。', 'Twenty years I killed pigs. Killing men is much the same.'], t: [{ q: 'Is it?', a: [['不一樣。豬不看你。', 'No. Pigs don\'t look at you.']] }] },
    dong: { g: ['要針嗎？線？我什麼都有。', 'Need a needle? Thread? I\'ve got everything.'], t: [{ q: 'Where are you going?', bond: 1, a: [['我挑著擔子走了三十年。這回不過走得遠一點。', 'I\'ve carried this pole thirty years. This time I\'m just walking a bit further.']] }] },
    ma_mother: { g: ['鐵子，吃了沒有？', 'Tie, have you eaten?'], t: [
      { q: 'Ma, Pa...', bond: 1, a: [['（她半天不說話，一直在縫你的袖子。）', '(For a long time she says nothing, sewing up your sleeve.)'], ['你爹要是在，會叫你把妹妹看好。那你就看好。', 'If your father were here he\'d tell you to look after your sister. So look after her.']] }] },
  })[k],
};

DCH[3] = {
  year: 1621, withErniu: true, mission: 'dj3',
  intro: [
    { title: '毛文龍 · Mao Wenlong', year: 'Summer 1621', p: ['Mao Wenlong is a Hangzhou man who came to Liaodong as an officer and has never in his life done what he was told. When Liaoyang fell he took a few hundred men down the coast in fishing boats and began to take in every Liaodong refugee who could hold a blade.',
      'He calls them his sons. His enemies say he calls them his sons so he can draw pay for them.'], zh: '毛文龍，字振南，仁和人。' },
    { title: '鎮江 · Zhenjiang', year: 'The seventh month of 1621', p: ['You have walked into Zhenjiang, the Jin-held town on the north bank of the Yalu, as refugees with nowhere else to go. The Jin governor Tong Yangzhen lets refugees in to work the fields. Every week a few of them are taken north as bondservants.',
      'Chen Liangce, a townsman, has been talking to men like Zhao Da in the dark. Mao Wenlong\'s boats are coming. When they come, someone inside has to open the gate.'], btn: 'To the shack →' },
  ],
  camp: { map: 'djzhen', biome: 'night', fog: 0.45, at: [-34, 48], title: '屋 · A shack in Zhenjiang', card: 'The night before. Your people are crowded into a shack inside the walls, whispering. Talk to them (E). When you are ready, lie down (E).',
    guests: ['chenlc', 'ma_mother'],
    chat: [['小聲點。', 'Quiet.'], ['巡夜的過去了。', 'The night watch has gone by.'], ['他們今天又帶走了六個。', 'They took six more today.'], ['毛遊擊真的會來嗎？', 'Will Major Mao really come?'], ['刀藏在稻草底下。', 'The blades are under the straw.']] },
  dawn: { title: '夜半 · Midnight', year: 'The twentieth day of the seventh month', p: ['Chen Liangce knocks twice. Somewhere outside the south wall a frog croaks three times, and then a fourth.', '"That\'s them," Zhao Da says. "Blades."'], btn: 'To the gate →' },
  battleCard: ['Zhenjiang, 1621. Open the south gate from inside for Mao Wenlong\'s men.', '鎮江 · Zhenjiang'],
  who: { file: ['陳良策', 'Chen Liangce'], mao: ['毛文龍', 'Mao Wenlong'] },
  order: ['zhao', 'qian', 'gou', 'liu', 'zheng', 'sun', 'erniu', 'feng', 'dong'],
  fateText: { out: 'saw the sun come up over Zhenjiang', dead: 'killed in Zhenjiang', lost: 'taken in Zhenjiang' },
  after: (won, li, outN) => [
    { title: '鎮江 · What happened', year: 'The eighth month of 1621', p: ['Tong Yangzhen was taken alive in his yamen and sent to Beijing in a cage. The court called it the Zhenjiang victory, the first good news from Liaodong in three years, and made Mao Wenlong a regional commander.',
      'A month later Nurhaci\'s nephew Amin came back with the banners. Zhenjiang fell again; the towns that had risen with it were burned; Chen Liangce died in the fighting. Mao Wenlong and his refugees crossed the Yalu into Korea.'], zh: '鎮江之捷，遼左第一功。旋復失。' },
    { title: '你們 · Your people', year: `${outN} crossed the Yalu`, html: `<ul>${li}</ul>`, btn: 'Into Korea →' },
  ],
  next: 4,
  talk: (k) => ({
    zhao: { g: ['刀磨好了沒有？', 'Is your blade sharp?'], t: [
      { q: 'What if Mao doesn\'t come?', a: [['那我們明天還種他們的地，後天還賠他們的笑臉。', 'Then tomorrow we work their fields again, and the next day we smile at them again.'], ['我寧可死在門洞裡。', 'I\'d sooner die in the gateway.']] },
      { q: 'Have you killed a man before Liaoyang?', bond: 1, a: [['一個。萬曆四十年，一個偷馬的蒙古人。我哭了一晚上。', 'One. In the fortieth year of Wanli, a Mongol horse thief. I cried all night.'], ['遼陽那一晚我殺了五個。一滴眼淚也沒有。這個不好。', 'The night Liaoyang fell I killed five. Not a tear. That isn\'t good.']] }] },
    qian: { g: ['佟養真也是遼東人，你知道嗎？', 'Did you know Tong Yangzhen is a Liaodong man too?'], t: [
      { q: 'Then why does he serve the Khan?', bond: 1, a: [['佟家是撫順的大戶。撫順一破，他就跪了。', 'The Tongs were a great family of Fushun. When Fushun fell, he knelt.'], ['跪了的人，就要讓別人也跪。不然他自己就太難看了。', 'A man who has knelt has to make everyone else kneel too. Otherwise he looks too ugly to himself.']] },
      { q: 'Are you afraid?', a: [['怕。我的手在抖，你看。', 'Yes. Look, my hand is shaking.'], ['可我想看看毛文龍長什麼樣。值得寫一寫。', 'But I want to see what Mao Wenlong looks like. He\'s worth writing down.']] }] },
    gou: { g: ['我去看過了。門上八個人，兩個睡覺。', 'I went and looked. Eight men on the gate, two asleep.'], t: [
      { q: 'You went alone?', bond: 1, a: [['偷東西的人走路沒聲音。這是我唯一的本事。', 'A thief walks without a sound. It\'s the only thing I\'m good at.'], ['明天我也想有點別的本事。', 'Tomorrow I\'d like to be good at something else.']] }] },
    liu: { g: ['今晚我要殺一個。', 'Tonight I\'m going to kill one.'], t: [
      { q: 'Only one?', a: [['先一個。然後再數。', 'One to start. Then I\'ll count.']] },
      { q: 'And then?', bond: 1, a: [['然後……我不知道。我哥死了以後，我只想到今晚。', 'Then... I don\'t know. Since my brother died I haven\'t thought past tonight.']] }] },
    zheng: { g: ['吃一口。空著肚子打仗，刀是飄的。', 'Eat something. Fight on an empty belly and your blade floats.'], t: [{ q: 'Will you come to the gate?', bond: 1, a: [['我在後面燒水。總有人要包紮。', 'I\'ll boil water at the back. Someone always needs binding up.']] }] },
    sun: { g: ['我又打了一把。用那個鐵門閂。', 'I made another one. Out of that iron door bar.'], t: [{ q: 'Let me see.', bond: 1, a: [['（一把短刀，刃上還有錘痕。）你爹的錘子打的。', '(A short blade, the hammer marks still on it.) Made with your father\'s hammer.'], ['拿著。這是你的。', 'Take it. It\'s yours.']] }] },
    erniu: { g: ['他們今天又來看我了。那個旗兵。', 'He came to look at me again today. That bannerman.'], t: [
      { q: 'Stay inside tomorrow.', a: [['不。我拿鋸子跟你們去。', 'No. I\'m coming with you, with the saw.'], ['讓他再來看我一回。', 'Let him come and look at me one more time.']] },
      { q: 'I won\'t let him take you.', bond: 1, a: [['……我知道，哥。', '...I know, brother.']] }] },
    feng: { g: ['刀我藏在豬圈裡。他們不聞豬糞。', 'I hid the blades in the pigsty. They don\'t sniff pig dung.'], t: [{ q: 'Clever.', a: [['殺豬的，也得有點腦子。', 'A butcher needs some brains too.']] }] },
    dong: { g: ['我給巡夜的賣了一斤煙葉。他很喜歡我。', 'I sold the night watch a jin of tobacco. He likes me very much.'], t: [{ q: 'He won\'t tomorrow.', bond: 1, a: [['明天我就不賣給他了。', 'Tomorrow I won\'t sell him any.']] }] },
    chenlc: { g: ['青蛙叫四聲，就是他們。', 'Four croaks of a frog. That\'s them.'], t: [
      { q: 'Why do you risk this?', bond: 1, a: [['我的地，我的祖墳，都在鎮江。', 'My land, my ancestors\' graves, all in Zhenjiang.'], ['他們要我剃頭。剃了頭，我見不了祖宗。', 'They want me to shave my head. With a shaved head, I couldn\'t face my ancestors.']] },
      { q: 'What is Mao Wenlong like?', a: [['我只見過他的信。字寫得很大，一個字佔三行。', 'I\'ve only seen his letters. He writes very big. Three lines to a character.'], ['寫字那麼大的人，膽子也小不了。', 'A man who writes that big can\'t be a coward.']] }] },
    ma_mother: { g: ['你們要做什麼，我不問。', 'Whatever you\'re going to do, I won\'t ask.'], t: [{ q: 'Ma, stay here tomorrow.', bond: 1, a: [['我在這兒等。像等你爹那樣等。', 'I\'ll wait here. The way I waited for your father.'], ['別讓我等那麼久。', 'Don\'t make me wait as long.']] }] },
  })[k],
};

DCH[4] = {
  year: 1621, withErniu: true, mission: 'dj4',
  intro: [
    { title: '過江 · Over the river', year: 'Autumn 1621', p: ['Mao Wenlong crossed the Yalu with his refugees and set up his camp among the Korean villages around Yongcheon. The Korean king had not asked for him and did not want him: the Khan had warned Korea what would happen if it sheltered Ming soldiers.',
      'But the farmers of Yongcheon took you in. Your file sleeps in the barn of a headman called Kim, whose nephew Kim Sun speaks some Chinese because his father ferried the Ming envoys over the Yalu.'], zh: '毛文龍屯龍川、彌串堡。' },
    { title: '冬 · Winter', year: 'The twelfth month of 1621', p: ['The Yalu has frozen. A river that froze is a bridge.'], btn: 'To the farmhouse →' },
  ],
  camp: { map: 'djkor', biome: 'night', fog: 0.35, at: [-24, 48], title: '農家 · The Kims\' farmhouse', card: 'The headman\'s farmhouse at Yongcheon, deep in snow. Talk to your file and your hosts (E). When you are ready, lie down (E).',
    guests: ['kimuncle', 'ma_mother'],
    chat: [['江凍上了。', 'The river\'s frozen.'], ['這泡菜辣死了。', 'This pickle is burning my mouth off.'], ['朝鮮的炕真暖和。', 'Korean floors are so warm.'], ['毛總兵今晚睡在村長家。', 'General Mao is sleeping at the headman\'s tonight.'], ['北邊的狗叫了一晚上。', 'The dogs to the north barked all night.']] },
  dawn: { title: '狗叫 · The dogs', year: 'Before dawn', p: ['You wake to dogs barking, all at once, all along the valley to the north. Then Kim Sun is at the door with snow in his hair, saying a word you don\'t know, over and over.', 'Zhao Da knows it. "Horses," he says. "On the ice."'], btn: 'Into the snow →' },
  battleCard: ['Yongcheon, the winter of 1621. Hold the village while the villagers and the general get away.', '龍川 · Yongcheon'],
  who: { mao: ['毛文龍', 'Mao Wenlong'] },
  order: ['zhao', 'kim', 'qian', 'gou', 'liu', 'zheng', 'sun', 'erniu', 'feng', 'dong'], wounds: { 5: 'zheng' },
  fateText: { out: 'came down to the coast', dead: 'killed at Yongcheon', lost: 'left in the snow at Yongcheon' },
  after: (won, li, outN) => [
    { title: '龍川 · What happened', year: 'The twelfth month of 1621', p: ['Amin\'s riders came over the frozen Yalu to take Mao Wenlong, and burned the villages that had sheltered him. Mao got away in a Korean farmer\'s white coat. Hundreds of Liaodong refugees and Korean villagers were killed.',
      'The Korean court protested to the Ming, and to the Khan, and to no one. In the spring Mao Wenlong took his people out to sea, to an empty island off the Korean coast called Gado, which the Chinese called Pidao.'], zh: '毛文龍僅以身免。明年，移駐皮島。' },
    { title: '你們 · Your people', year: `${outN} reached the coast`, html: `<ul>${li}</ul>`, p: [DS.alive.kim ? 'Kim Sun came with you. His uncle\'s house burned; his uncle stayed to put it out.' : 'Kim Sun stayed in the snow at Yongcheon.'], btn: 'End of the first act →' },
  ],
  next: 5,
  talk: (k) => ({
    zhao: { g: ['朝鮮人待我們不薄。', 'The Koreans have been good to us.'], t: [
      { q: 'Will the Jin come here?', a: [['江凍了。凍了的江就是橋。', 'The river\'s frozen. A frozen river is a bridge.'], ['我讓狗兒睡在門口。他耳朵尖。', 'I\'ve got Gou\'er sleeping by the door. He has sharp ears.']] },
      { q: 'What do you think of Mao Wenlong?', bond: 1, a: [['他說話像唱戲。可他來了，別人都沒來。', 'He talks like an opera singer. But he came, and nobody else did.']] }] },
    kim: { g: ['你會說「謝謝」嗎？고맙습니다。', 'Can you say "thank you"? Gomapseumnida.'], t: [
      { q: 'Go-map-seum-ni-da.', bond: 1, a: [['（他大笑。）你說得像頭驢。不過，好。', '(He laughs.) You say it like a donkey. But good.']] },
      { q: 'Why does your family help us?', a: [['我爹擺渡擺了二十年。明朝的使者、商人、和尚，都坐過他的船。', 'My father ran the ferry twenty years. Ming envoys, merchants, monks, they all crossed in his boat.'], ['他說，明朝是大哥。大哥有難，不能不管。', 'He said the Ming is our elder brother. When your elder brother is in trouble, you help.']] },
      { q: 'Teach me a word for the fight.', a: [['「의병」。義兵。不是官兵，是自己起來打仗的人。', '"Uibyeong." A righteous army. Not the king\'s soldiers: people who rise up and fight on their own.'], ['二十年前倭寇來的時候，我爺爺就是義兵。', 'Twenty years ago, when the Japanese came, my grandfather was one.']] }] },
    qian: { g: ['朝鮮人寫的也是漢字。我跟他們筆談了一晚上。', 'The Koreans write in Chinese characters too. I talked with them all night, in writing.'], t: [{ q: 'What did they say?', bond: 1, a: [['他們的國王很怕。怕金人，也怕我們把金人引來。', 'Their king is very frightened. Of the Jin, and of us bringing the Jin down on them.'], ['他怕得對。', 'He is right to be.']] }] },
    gou: { g: ['我跟那個朝鮮丫頭學翻花繩。', 'I\'m learning cat\'s cradle from that Korean girl.'], t: [{ q: 'She likes you.', bond: 1, a: [['……她才十二歲！', '...She\'s twelve!'], ['我也才十三。', 'I\'m only thirteen.']] }] },
    liu: { g: ['我數到七了。', 'I\'m up to seven.'], t: [{ q: 'Does it help?', bond: 1, a: [['不。每一個都不像我哥。', 'No. None of them looks like my brother.'], ['可我還要數下去。', 'But I\'ll keep counting.']] }] },
    zheng: { g: ['朝鮮人的飯，米是好米。', 'The Koreans\' rice is good rice.'], t: [{ q: 'You\'re limping worse.', bond: 1, a: [['老了。廚子的腿，二十年前就站壞了。', 'Old age. A cook\'s legs were ruined from standing twenty years ago.'], ['到了海邊，我就坐著燒飯。', 'When we get to the sea, I\'ll cook sitting down.']] }] },
    sun: { g: ['朝鮮的鐵匠用的是腳踩的風箱。好東西。', 'The Korean smiths use a foot bellows. Good idea.'], t: [{ q: 'Will you teach me?', bond: 1, a: [['開春，找個能落腳的地方。我教你打刀。', 'In spring, when we find somewhere to stay. I\'ll teach you to make a blade.']] }] },
    erniu: { g: ['村長的媳婦給了我一件襖。', 'The headman\'s wife gave me a jacket.'], t: [{ q: 'It suits you.', bond: 1, a: [['朝鮮的衣服是白的。他們說白的乾淨。', 'Korean clothes are white. They say white is clean.'], ['在雪裡，白的看不見。', 'In the snow, white can\'t be seen.']] }] },
    feng: { g: ['我跟他們換了一頭豬。用我的刀。', 'I traded them my knife for a pig.'], t: [{ q: 'Your butcher\'s knife?', a: [['我還有一把。殺人的那把。', 'I\'ve another. The one for men.']] }] },
    dong: { g: ['朝鮮人不要我的針。他們自己的針更好。', 'The Koreans don\'t want my needles. Theirs are better.'], t: [{ q: 'What will you sell?', bond: 1, a: [['故事。我給他們講三國。他們聽得眼睛都直了。', 'Stories. I tell them the Three Kingdoms. Their eyes go round.']] }] },
    kimuncle: { g: ['（他用漢字寫：）客人安否？', '(He writes in characters:) Are our guests well?'], t: [
      { q: '(Write:) Thank you for the shelter.', bond: 1, a: [['（他寫：）遠親不如近鄰。', '(He writes:) A neighbour near is better than kin far away.'], ['（又寫：）然，鄰家有虎。', '(And then:) But the neighbour has a tiger.']] }] },
    ma_mother: { g: ['朝鮮人的炕，跟咱家的一樣暖。', 'The Korean floor is as warm as ours at home.'], t: [{ q: 'Do you miss home?', bond: 1, a: [['家？家是你爹。你爹沒了，哪兒都一樣。', 'Home? Home was your father. With him gone, anywhere\'s the same.'], ['你們在，就是家。', 'Where you are is home.']] }] },
  })[k],
};

// ---------- camp ----------
const DCAMP = { fires: [[0, 0], [8, -5]], tents: [[-10, 4, 1.7, 2.5, 2.1], [-4.5, 10.5, 1.7, 2.5, 2.1], [4.5, 10.5, 1.7, 2.5, 2.1], [10, 4, 1.7, 2.5, 2.1]],
  props: [['pot', 8, -5, 0], ['rack', -7.5, -3.5, 0.9], ['log', 0, 2.9, 0], ['log', -2.6, -1.4, 1.1], ['log', 2.7, -1.2, -1.1]] };
function dCampCfg(n) {
  const C = DCH[n], K = C.camp, ox = K.at ? K.at[0] : 0, oz = K.at ? K.at[1] : 0, P = (x, z) => [+(x + ox).toFixed(2), +(z + oz).toFixed(2)];
  const npcs = [], beds = [], file = dFile(n), rows = [{ k: dMeK(n) }].concat(file), N = rows.length;
  rows.forEach((r, i) => { const a = -0.5 + (i / Math.max(8, N)) * Math.PI * 1.55 + Math.PI * 0.55; const p = P(Math.sin(a) * 6.3, Math.cos(a) * 6.3); beds.push([p[0], p[1], +(a + Math.PI).toFixed(3), false]); });
  for (const k of dDead().map(r => r.k).slice(0, 4)) { const a = Math.PI * (1.6 + beds.length * 0.07); const p = P(Math.sin(a) * 6.3, Math.cos(a) * 6.3); beds.push([p[0], p[1], +(a + Math.PI).toFixed(3), true]); } // empty bedrolls for the dead
  file.forEach((r, i) => { const a = (i / Math.max(1, file.length)) * Math.PI * 2 + 0.4, rr = i % 3 === 2 ? 3.4 : 2.5; const x = Math.sin(a) * rr, z = Math.cos(a) * rr; const p = P(x, z);
    npcs.push({ role: 'spear', x: p[0], z: p[1], yaw: +Math.atan2(-x, -z).toFixed(3), ci: dIdx(r.k), pose: i % 3 === 2 ? 'stand' : 'squat' }); });
  (typeof K.guests === 'function' ? K.guests() : (K.guests || [])).forEach((k, i) => { const p = P(7 - i * 1.5, -2.6); npcs.push({ role: 'spear', x: p[0], z: p[1], yaw: 2.6, ci: dIdx(k), pose: 'stand' }); });
  ZC = { bed: [beds[0][0], beds[0][1]], dj: true, R: DR, map: {}, night: n };
  const off = (L) => L.map(a => { const c = a.slice(); c[0] = +(c[0] + ox).toFixed(2); c[1] = +(c[1] + oz).toFixed(2); return c; }), offP = (L) => L.map(a => { const c = a.slice(); c[1] = +(c[1] + ox).toFixed(2); c[2] = +(c[2] + oz).toFixed(2); return c; });
  const me = P(0.6, -6.6);
  return { map: K.map, biome: K.biome, fog: K.fog, type: K.type || 'ronin', team: 0, fires: off(DCAMP.fires), tents: K.noTents ? [] : off(DCAMP.tents), props: offP(DCAMP.props), bedrolls: beds, npcs, me: { x: me[0], z: me[1], yaw: 0, role: 'spear' } };
}
function dStart(scene) {
  DS = dLoad() || dFresh(); dMeRow(); $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  const m = /^([cb])(\d+)$/.exec(scene); if (!m) { dMenu(); $('menu').hidden = false; return; }
  const n = +m[2], C = DCH[n]; if (!C) { $('menu').hidden = false; return; }
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: DS.name.zh || 'You', team: 0, connected: true }];
  if (m[1] === 'c') {
    if (!DS.seen['i' + n]) { dJoin(n); return zCards(dCards(C.intro), () => { DS.seen['i' + n] = 1; DS.stage = 'c' + n; dSave(); dStart('c' + n); }); }
    if (!C.camp) { DS.stage = 'b' + n; dSave(); return dStart('b' + n); } // straight into the battle
    const camp = dCampCfg(n); ZB = null;
    startGame({ seed, battle: camp.map || 'zcamp', mode: 'campaign', mission: 'zcamp', camp, players: pl }, 0, null, 1);
    for (const u of state.sim.units) if (u.camp) { ZC.map[u.id] = u.ci; dDress(u, u.ci); } { const me = state.sim.units[state.sim.players[0].heroId]; dDress(me, dIdx(dMeK(n))); } ZC.chatT = 6;
    MUSIC.play('menu'); MUSIC.setIntensity(0.15); AUDIO.setFire(0.6); $('army').hidden = true;
    setTimeout(() => storyCard(C.camp.card, C.camp.title), 900);
  } else {
    ZC = null; startGame({ seed, battle: SIM.MISSIONS[C.mission].battle, mode: 'campaign', mission: C.mission, players: pl }, 0, null, 1);
    const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq];
    ZB = { map: {}, sq: q.id, first: me.heroId, cur: dMeK(n), fell: false, R: DR, dj: true, ch: n, deadMe: [] };
    const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = dIdx(dMeK(n));
    { const M = SIM.MISSIONS[C.mission], dressG = (gid, L) => { const g = sim.mg[gid]; if (!g) return; const pl = sim.players[g.p]; for (const uid of [pl.heroId].concat(...pl.squads.map(sid => sim.squads[sid].unitIds))) { const u = uid >= 0 && sim.units[uid]; if (!u || ZB.map[uid] !== undefined) continue; u.look = L(uid); if (state.renderer) state.renderer.colorFigure(uid, u); } };
      const mingL = (uid) => ({ id: 'mut:' + (uid % 6), ming: true, hat: ['band', 'wrap', 'straw', 'felt'][uid % 4], brows: 'knit', beard: uid % 3 ? 'stubble' : undefined });
      for (const gid in M.groups || {}) { const G = M.groups[gid]; if (G.jinKit) dressG(gid, (uid) => ({ id: 'jside:' + (uid % 4), jinside: true })); else if (G.ming || (G.team === 1 && (M.mingAll || M.side === 1)) || (C.mingFoes || []).includes(gid)) dressG(gid, mingL); } } /* Ming men on both sides of the civil war; Jin men on yours at Lüshun */
    const file = dFile(n), order = (C.order || []).filter(k => file.some(r => r.k === k)).concat(file.map(r => r.k).filter(k => !(C.order || []).includes(k)));
    // the men a scripted wound is meant for take that place in the squad (the sim wounds by place)
    for (const kk in (C.wounds || {})) { const k = C.wounds[kk], uid = q.unitIds[+kk]; if (uid === undefined || used[uid] || !file.some(r => r.k === k)) continue; used[uid] = 1; ZB.map[uid] = dIdx(k); }
    const placed = new Set(Object.values(ZB.map).map(i => DR[i].k));
    for (const k of order) { if (placed.has(k)) continue; const id = q.unitIds.find(uid => !used[uid]); if (id === undefined) break; used[id] = 1; ZB.map[id] = dIdx(k); placed.add(k); }
    for (const uid in ZB.map) dDress(sim.units[uid], ZB.map[uid]);
    setTimeout(() => storyCard(C.battleCard[0], C.battleCard[1]), 700);
  }
}
function dLook() {
  const sim = state.sim, h = localHero(); if (!h || h.dead || !ZC) return null;
  if (Math.hypot(h.x - ZC.bed[0], h.z - ZC.bed[1]) < 1.9) return { bed: true };
  let best = null, bd = 0.5; const fx = Math.sin(Input.yaw), fz = Math.cos(Input.yaw);
  for (const u of sim.units) { if (!u.camp) continue; const dx = u.x - h.x, dz = u.z - h.z, d = Math.hypot(dx, dz); if (d > 3.4 || d < 0.3) continue; const off = 1 - (dx * fx + dz * fz) / d; if (off < bd) { bd = off; best = u; } }
  return best ? { u: best, k: DR[best.ci].k } : null;
}
function dKeyE() {
  if (state.zheDlg) return true; const t = dLook(); if (!t) return true;
  if (t.bed) { const n = ZC.night, C = DCH[n]; const go = () => { if (!C.mission) { /* a chapter with no battle: the night is the chapter */ const nx = typeof C.next === 'function' ? C.next() : C.next; DS.stage = 'c' + nx; dSave(); return zCards(dCards(C.after ? C.after(true, '', 0) : []), () => DCH[nx] ? dGo('c' + nx) : dEnd()); }
      DS.stage = 'b' + n; dSave(); if (C.dawn) zCards(dCards([C.dawn]), () => dGo('b' + n)); else dGo('b' + n); };
    const chId = typeof C.camp.choice === 'function' ? C.camp.choice() : C.camp.choice;
    if (chId && typeof CHD !== 'undefined' && CHD[chId] && chGot(chCtx(), chId) < 0) { chDecide(CHD[chId].build(chCtx()), () => go()); return true; }
    if (false) { chDecide(CHD[C.camp.choice].build(chCtx()), () => go()); return true; }
    go(); return true; }
  dDialog(t.k, t.u); return true;
}
// talk: the same panel and keys as the Zhejiang camp (#zheDlg, state.zheDlg)
function dDialog(k, u) {
  const n = ZC.night, D = (DCH[n].talk && DCH[n].talk(k)) || dTalkAny(k, n); if (!D) return; const r = dRow(k); state.zheDlg = { k }; if (typeof D.g === 'function') D.g = D.g(); if (!D.g || !D.g[0]) D.g = ['……', '...'];
  if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; $('pause').hidden = true;
  let box = $('zheDlg'); if (!box) { box = document.createElement('div'); box.id = 'zheDlg'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const h = localHero(); if (h && u) Input.yaw = Math.atan2(u.x - h.x, u.z - h.z);
  const key = (t) => `${n}:${k}:${t.q}`, open = () => D.t.filter(t => !DS.talked[key(t)] && (!t.if || t.if()));
  const year = DCH[n].year || 0, age = year && r.born ? ` · ${year - r.born}` : '';
  const render = (lines, topics) => { box.hidden = false;
    box.innerHTML = `<div class="who">${r.zh} ${r.en}<small>${r.t}${age}${DS.bond[k] > 0 ? ' · ' + '♥'.repeat(Math.min(3, DS.bond[k])) : ''}</small></div>${lines.map(l => `<div class="zh">${l[0]}</div><div class="en">${l[1]}</div>`).join('')}<div class="ch">${topics.map((t, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd>${t.q}</button>`).join('')}<button type="button" data-i="-1"><kbd>Esc</kbd>Leave</button></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => choose(+b.dataset.i)); state.zheDlg.topics = topics; };
  const choose = (i) => { AUDIO.play('ui'); if (i < 0) { close(); return; } const t = state.zheDlg.topics[i]; if (!t) return;
    DS.talked[key(t)] = 1; if (t.bond) DS.bond[k] = (DS.bond[k] || 0) + t.bond; if (t.flag) DS.flags[t.flag] = true; dSave(); render([[`「${t.q}」`, ''], ...t.a].filter(x => x[0]), open()); };
  const close = () => { box.hidden = true; state.zheDlg = null; requestLock(); };
  state.zheDlg.choose = choose; state.zheDlg.close = close; render([D.g], open());
}
// a man the chapter has no special lines for: who he is, and the dead
function dTalkAny(k, n) {
  const r = dRow(k); if (!r) return null; const lost = dDead().map(d => d.zh);
  return { g: ['……', '...'], t: lost.length ? [{ q: 'Do you think about the ones we lost?', a: [[`${lost.slice(0, 3).join('、')}……`, `${dDead().slice(0, 3).map(d => d.en).join(', ')}...`], ['每天晚上。', 'Every night.']] }] : [] };
}
function dHUD(dt) {
  zTags(); const sim = state.sim; let pr = $('zhePrompt'); $('status').style.visibility = 'hidden';
  if (state.zheDlg) { if (pr) pr.hidden = true; return; }
  if (!pr) { pr = document.createElement('div'); pr.id = 'zhePrompt'; document.body.appendChild(pr); }
  const t = dLook(); pr.hidden = !t; if (t) pr.innerHTML = t.bed ? '<kbd>E</kbd>Lie down on your bedroll' : `<kbd>E</kbd>Talk to ${DR[t.u.ci].zh} ${DR[t.u.ci].en}`;
  ZC.chatT -= dt; if (ZC.chatT <= 0) { ZC.chatT = 7 + Math.random() * 6; const h = localHero(); if (!h) return; const near = sim.units.filter(u => u.camp && Math.hypot(u.x - h.x, u.z - h.z) < 14); if (!near.length) return; const u = near[Math.floor(Math.random() * near.length)];
    const PL = DCH[ZC.night].camp.chat; const L = PL[Math.floor(Math.random() * PL.length)]; SPEECH.say(u.id, L[0], L[1], { prio: 0, cool: 10 }); }
}

// ---------- in battle ----------
function dSay(ev) {
  const sim = state.sim, h = localHero(), C = DCH[ZB.ch]; const W = (C.who || {})[ev.who] || ['', ev.who];
  let id = -1, who = W.slice(); const ji = DR.findIndex(r => r.k === ev.who && !r.guest);
  if (ji >= 0) { for (const uid in ZB.map) if (ZB.map[uid] === ji && sim.units[uid] && !sim.units[uid].dead && !sim.units[uid].wounded) id = +uid; if (id >= 0) who = [DR[ji].zh, DR[ji].en]; else return true; } // a man's own words are not spoken by someone else: if he is gone, the line goes with him
  else if (sim.mg[ev.who]) { const g = sim.mg[ev.who]; id = sim.players[g.p].heroId; }
  if (id >= 0 && sim.units[id] && sim.units[id].dead) id = -1;
  if (id < 0 && h) { const cand = sim.teamAlive[h.team].filter(u => u.id !== h.id && !u.wounded && u.type !== 'horse' && Math.hypot(u.x - h.x, u.z - h.z) < 22); if (cand.length) id = cand[Math.floor(Math.random() * cand.length)].id; }
  const label = who[0] ? `${who[0]} ${who[1]}` : who[1];
  const ok = id >= 0 && SPEECH.say(id, ev.zh, ev.text, { prio: 3, loud: true, radio: true, who: label, dur: Math.min(8, 3 + ev.text.length / 20) });
  if (!ok && typeof radio === 'function') radio(label, `${ev.zh ? ev.zh + '  ' : ''}${ev.text}`);
  return true;
}
function dEvent(ev) {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.soldier) return;
  if (ev.t === 'zpromote' && ev.p === state.localIdx) { state.fpSel = null; banner('你帶隊 · Your file', 'You lead the file: F follow me / H halt / C charge / Z form up where you look', 6); }
  else if (ev.t === 'zwound' && ev.p === state.localIdx) { ZB.wounded = ev.id; const n = SPEECH.nameOf(ev.id);
    SPEECH.say(ev.id, '我的腿……走不動了！', 'My leg... I can\'t walk!', { prio: 3, dur: 4 }); toast(`${n ? n.zh + ' ' + n.en : 'A man of your file'} is hit and can't walk. Get to him and press E to get him up`); }
  else if (ev.t === 'zhelp' && ev.id === ZB.wounded) { DS.flags['helped' + ZB.ch] = true; feed(`You get ${(SPEECH.nameOf(ev.id) || { en: 'him' }).en}'s arm over your shoulder`, true); }
  else if (ev.t === 'zcarry' && ev.p === state.localIdx) { const i = ZB.map[ev.id]; ZB.fell = true; const prev = ZB.cur; if (prev && DS.alive[prev] !== false) ZB.deadMe.push(prev);
    ZB.cur = i !== undefined ? DR[i].k : 'stranger'; const n = SPEECH.nameOf(ev.id); const h = sim.units[ev.id]; if (h) { Input.yaw = h.yaw; Input.pitch = 0; }
    toast(n ? `You fall. The fight goes on — you are ${n.zh} ${n.en} now` : 'You fall. The fight goes on — you are another man of the file now'); }
}
function dFinish(winner) {
  const sim = state.sim, h = localHero(), M = sim.mission, n = ZB.ch, C = DCH[n]; const won = winner === M.side;
  const fate = {}, near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const r = DR[ZB.map[uid]]; if (!r) continue; const u = sim.units[uid];
    fate[r.k] = u.dead ? 'dead' : (!won && u.wounded && !u.aided && u.helpedBy < 0 && !near(u, 4)) ? 'lost' : (u.wounded && !u.aided && u.helpedBy < 0 && !near(u, 6) && M.phases.some(P => P.obj && P.obj.extract)) ? 'lost' : 'out'; }
  for (const k of ZB.deadMe) fate[k] = 'dead';
  { const L = DS.chLost || {}; for (const k in L) if (fate[k] !== undefined && L[k].ch === n) fate[k] = L[k].how === 'dead' ? 'dead' : 'lost'; } /* a man a choice took out of this fight is gone, whatever his body did after */
  const meK = dMeK(n), alive = h && !h.dead, oldName = Object.assign({}, DS.name), other = !!C.playAs;
  if (ZB.cur === meK || ZB.cur === 'stranger') fate[meK] = alive ? 'out' : 'dead'; else fate[meK] = 'dead';
  if (!other && ZB.cur && ZB.cur !== meK && ZB.cur !== 'stranger' && alive) { const nk = ZB.cur, r = dRow(nk); if (meK === 'me') DS.meName = oldName; DS.me = nk; DS.name = { zh: r.zh, en: r.en }; fate[nk] = 'out'; }
  const list = Object.keys(fate);
  for (const k of list) { DS.fate[k] = fate[k]; DS.alive[k] = fate[k] === 'out'; }
  DS.stage = 'e' + n; DS.lastWon = won; dSave();
  const ft = C.fateText, rows = list.map(k => { const r = dRow(k), f = fate[k]; const nm = other ? `${r.zh} ${r.en}${k === meK ? ' (you)' : ''}` : k === DS.me ? `${DS.name.zh} ${DS.name.en} (you)` : k === meK && DS.me !== meK ? `${oldName.zh} ${oldName.en} (you, until you fell)` : `${r.zh} ${r.en}`; return `<li class="${f === 'out' ? 'out' : f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${nm} — ${ft[f] || ft.out}</li>`; }).join('');
  const outN = list.filter(k => fate[k] === 'out').length;
  $('resultTitle').textContent = won ? (C.resultTitle || '過 · Through') : '敗 · Beaten back'; $('resultTitle').className = won ? 'win' : 'lose';
  const head = outN <= 1 ? (won ? 'You came through, and almost no one with you.' : 'You came back alone.') : won ? M.win : (M.loseText || 'You were beaten back.');
  $('resultText').innerHTML = `${head} ${outN} of ${list.length} of your people came through.`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; const nx = typeof C.next === 'function' ? C.next() : C.next; DS.stage = nx === 'done' ? 'done' : 'c' + nx; dSave(); zCards(dCards(C.after(won, rows, outN)), () => DCH[nx] ? dGo('c' + nx) : dEnd()); }; /* a chapter not written yet: the save waits at its door */
}
function dEnd() { if (!DS.stage || DS.stage === 'done') DS.stage = 'done'; dSave(); location.reload(); }

// ---------- hooks into the Zhejiang campaign's entry points (main.js and career.js call these by name) ----------
{ const kE = zheKeyE, hud = zheHUD, sy = zheSay, evf = zheEvent, fin = zheFinish;
  zheKeyE = function () { if (ZC && ZC.dj && state.sim && state.sim.mission && state.sim.mission.camp) return dKeyE(); return kE(); };
  zheHUD = function (dt) { if (ZC && ZC.dj && state.sim && state.sim.mission && state.sim.mission.camp) return dHUD(dt); return hud(dt); };
  zheSay = function (ev) { if (ZB && ZB.dj) return dSay(ev); return sy(ev); };
  zheEvent = function (ev) { if (ZB && ZB.dj) return dEvent(ev); return evf(ev); };
  zheFinish = function (w) { if (ZB && ZB.dj) return dFinish(w); return fin(w); }; }

// ---------- the main menu ----------
function dMenu() {
  let el = $('djCta'); const z = $('zheCta'); if (!z) return;
  if (!el) { const st = document.createElement('style'); st.textContent = '#djCta { display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 14px 16px; margin: -6px 0 16px; border: 1px solid #3a6a6a; background: linear-gradient(100deg, rgba(40,90,100,.16), rgba(220,210,190,.08)); flex-wrap: wrap } #djCta b { font-size: 19px; letter-spacing: .04em } #djCta small { display: block; color: var(--ink2); margin-top: 4px; max-width: 640px; line-height: 1.5 } #djCta .btns { display: flex; gap: 8px }';
    document.head.appendChild(st); el = document.createElement('div'); el.id = 'djCta';
    el.innerHTML = '<div><b>東江 · The East River</b><small>A story campaign, 1621–1637. A smith\'s son of Liaoyang and the people who ran with him: refugees, Mao Wenlong\'s island army off Korea, raids behind the Jin lines, two invasions of Korea, a mutiny, and the fall of the island. <i>Acts One to Five are ready (eighteen chapters, and the fifth act forks); the last act is coming.</i></small></div><div class="btns"><button class="btn primary" id="btnDj" type="button">Begin</button><button class="btn" id="btnDjNew" type="button" hidden>New</button></div>';
    const after = $('jinCta') || z; after.after(el); }
  const s = dLoad(), b = $('btnDj'), nb = $('btnDjNew'); const cont = s && s.stage && s.stage !== 'done';
  const waiting = cont && /^c(\d+)$/.test(s.stage) && !DCH[+s.stage.slice(1)]; /* finished every chapter written so far */
  b.textContent = waiting ? 'Next act coming soon' : cont ? 'Continue' : s ? 'Play again' : 'Begin'; b.disabled = !!waiting; nb.hidden = !cont;
  const begin = () => { AUDIO.init(); AUDIO.play('ui'); DS = dFresh(); dSave(); dStart('c1'); };
  b.onclick = () => { if (!cont) return begin(); AUDIO.init(); AUDIO.play('ui'); const st = s.stage; const m = /^e(\d+)$/.exec(st); if (m) { const C = DCH[+m[1]]; const nx = C && (typeof C.next === 'function' ? C.next() : C.next); return dStart(DCH[nx] ? 'c' + nx : 'c1'); } dStart(st); };
  nb.onclick = begin;
}
setTimeout(dMenu, 0); // after the other campaigns' cards are in the menu
{ let go = null; try { go = localStorage.getItem(DGO); localStorage.removeItem(DGO); } catch (e) { } if (go) setTimeout(() => dStart(go), 60); }
