// ===================== 八旗 · The Plain White Niru: the same war from the Jin side =====================
// A second story campaign, spliced into main.js's scope after zhe.js (build.sh). You are a young armoured man (披甲,
// uksin) in a niru of Hong Taiji's Plain White Banner. It reuses the Zhejiang campaign's machinery: the soldier mission
// in sim.js, SPEECH captions, live heads in the squad grid, name tags and the golden goal line (through the ZB.R / ZC.R
// roster hooks in zhe.js), and cards. Its own save is `mingJin`; scenes switch by reload through `mingJinGo`.
// Stages: c1 (camp) -> b1 (battle) -> c2 -> b2 ... -> done. The dead stay dead; new men fill the file between chapters.
const JKEY = 'mingJin', JGO = 'mingJinGo';
const JR = [ // the file. Index 0 is the man in the squad's first place (the bošokū while he lives)
  { k: 'ulgen', zh: '烏勒根', en: 'Ulgen', t: 'bošokū (sergeant) · 撥什庫 · a Hada man' },
  { k: 'me', zh: '', en: '', t: 'armoured man · 披甲' },
  { k: 'dabsun', zh: '達布遜', en: 'Dabsun', t: 'armoured man · 16 · Alin\'s nephew' },
  { k: 'sose', zh: '索色', en: 'Sose', t: 'archer · sable hunter' },
  { k: 'ilan', zh: '伊蘭', en: 'Ilan', t: 'armoured man · the third son' },
  { k: 'bahai', zh: '巴海', en: 'Bahai', t: 'armoured man · pearl diver from the Sungari' },
  { k: 'lier', zh: '李二', en: 'Li Er', t: 'bondservant · 包衣 · taken at Fushun' },
  { k: 'bater', zh: '巴特爾', en: 'Bater', t: 'Khorchin Mongol · a gift to the Khan' },
  { k: 'erde', zh: '額爾德', en: 'Erde', t: 'armoured man · a son born this winter' },
  { k: 'muktan', zh: '穆克譚', en: 'Muktan', t: 'armoured man · writes the new script' },
  { k: 'manggu', zh: '莽古', en: 'Manggu', t: 'armoured man · never satisfied' },
  { k: 'alin', zh: '阿林', en: 'Alin', t: 'armoured man · served since Tulun' },
  // men who join the file between chapters, in this order, as the dead leave places
  { k: 'tuhe', zh: '圖赫', en: 'Tuhe', t: 'new man · Ula born, 17', draft: true },
  { k: 'wangsi', zh: '王四', en: 'Wang Si', t: 'new man · a Liaoyang Han who shaved his head', draft: true },
  { k: 'dorji', zh: '多爾濟', en: 'Dorji', t: 'new man · Khalkha Mongol horse-breaker', draft: true },
  { k: 'jala', zh: '扎拉', en: 'Jala', t: 'new man · Erde\'s cousin', draft: true },
  { k: 'hife', zh: '希佛', en: 'Hife', t: 'new man · a blacksmith\'s son', draft: true },
  { k: 'yanggu', zh: '楊古', en: 'Yanggu', t: 'new man · keeps a hawk', draft: true },
  { k: 'kesi', zh: '克什', en: 'Kesi', t: 'new man · quiet, from the Warka', draft: true },
  { k: 'cimbu', zh: '欽布', en: 'Cimbu', t: 'new man · sings badly', draft: true },
  { k: 'anju', zh: '安珠', en: 'Anju', t: 'new man · his brother died at Ningyuan', draft: true },
  { k: 'furdan', zh: '富爾丹', en: 'Furdan', t: 'new man · born the year of the Seven Grievances\' war', draft: true },
  { k: 'sabu', zh: '薩布', en: 'Sabu', t: 'new man · a Han gunner\'s apprentice', draft: true },
  { k: 'hoto', zh: '豁托', en: 'Hoto', t: 'new man · Hoifa orphan', draft: true },
  // officers you meet in person
  { k: 'tobohui', zh: '托博輝', en: 'Tobohui', t: 'captain of the niru · 牛錄額真', guest: true },
];
const JW = 0xe4e0d4, JSTUD = 0x7a6a50; // Plain White: white armour coats with dark iron studs
const JLOOK = {
  ulgen: { h: 1.04, jin: 'helm', plume: 0xb8281e, coat: JW, stud: JSTUD, brows: 'knit', beard: 'longmous', grey: true, scar: true, skin: 0xb88a62 },
  me: { h: 1.0, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thin' },
  dabsun: { h: 0.88, jin: 'helm', coat: JW, stud: JSTUD, brows: 'high', young: true, rosy: true, skin: 0xe2bc96 },
  sose: { h: 0.97, jin: 'liang', armor: 'robe', coat: 0x5a6a7a, sash: 0x2a2620, quiver: true, brows: 'thin', beard: 'mous', skin: 0xc49a72 },
  ilan: { h: 0.96, jin: 'helm', coat: JW, stud: JSTUD, brows: 'high', grin: true, beard: 'stubble' },
  bahai: { h: 1.15, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thick', bulk: true, bigNose: true, skin: 0xb48a62 },
  lier: { h: 0.95, jin: 'liang', armor: 'robe', coat: 0x4a5260, sash: 0x2a2a2e, brows: 'sad', beard: 'stubble', skin: 0xd6ae88 },
  bater: { h: 1.02, jin: 'fur', fur: 0x2a4a8a, armor: 'robe', coat: 0x8a5a2a, sash: 0xd8b03c, quiver: true, brows: 'thick', beard: 'mous', rosy: true, skin: 0xb07a52 },
  erde: { h: 1.0, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thin', beard: 'goatee', charm: true },
  muktan: { h: 0.98, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thin', beard: 'goatee', longBeard: true, brush: true, skin: 0xdcbc98 },
  manggu: { h: 1.03, jin: 'helm', coat: JW, stud: JSTUD, brows: 'knit', beard: 'full', patch: true },
  alin: { h: 1.01, jin: 'helm', iron: 0x4a4e54, coat: JW, stud: JSTUD, brows: 'sad', beard: 'longmous', grey: true, longBeard: true, skin: 0xbf9670 },
  tuhe: { h: 0.92, jin: 'helm', coat: JW, stud: JSTUD, brows: 'high', young: true, skin: 0xdcb48e },
  wangsi: { h: 0.99, jin: 'liang', armor: 'robe', coat: 0x4a5260, sash: 0x2a2a2e, brows: 'thin', beard: 'mous', skin: 0xd8b28c },
  dorji: { h: 1.06, jin: 'fur', fur: 0xc8281e, armor: 'robe', coat: 0x3a5a6a, sash: 0xd8b03c, brows: 'thick', rosy: true, skin: 0xa87650 },
  jala: { h: 1.0, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thin', beard: 'goatee', skin: 0xc8a07a },
  hife: { h: 1.09, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thick', bulk: true, beard: 'stubble', skin: 0xb8865e },
  yanggu: { h: 0.97, jin: 'helm', coat: JW, stud: JSTUD, brows: 'high', grin: true, quiver: true },
  kesi: { h: 0.94, jin: 'liang', armor: 'robe', coat: 0x5a6a7a, sash: 0x2a2620, brows: 'sad', skin: 0xc49a72 },
  cimbu: { h: 1.02, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thick', grin: true, beard: 'mous', rosy: true },
  anju: { h: 0.96, jin: 'helm', coat: JW, stud: JSTUD, brows: 'knit', young: true, skin: 0xe0b890 },
  furdan: { h: 1.0, jin: 'helm', coat: JW, stud: JSTUD, brows: 'thin', young: true, rosy: true },
  sabu: { h: 0.98, jin: 'liang', armor: 'robe', coat: 0x4a5260, sash: 0x6a4a30, brows: 'thick', beard: 'stubble', skin: 0xd4aa82 },
  hoto: { h: 0.93, jin: 'fur', fur: 0x5a3a22, coat: JW, stud: JSTUD, brows: 'sad', scar: true },
  tobohui: { h: 1.08, jin: 'helm', iron: 0x8a6a2a, plume: 0xe8e4da, coat: JW, stud: 0xd8b03c, flag: true, brows: 'thick', beard: 'full', skin: 0xbc8e66 },
};
let JS = null; // the Jin save
function jLoad() { try { return JSON.parse(localStorage.getItem(JKEY) || 'null'); } catch (e) { return null; } }
function jSave() { try { localStorage.setItem(JKEY, JSON.stringify(JS)); } catch (e) { } }
function jFresh() { const s = { v: 1, stage: 'c1', name: { zh: '阿克敦', en: 'Akdun' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, me: 'me', joined: {}, seen: {} }; for (const r of JR) if (!r.draft && !r.guest) { s.alive[r.k] = true; s.bond[r.k] = 0; } return s; }
const jRow = (k) => JR.find(r => r.k === k);
const jIdx = (k) => JR.findIndex(r => r.k === k);
function jMeRow() { const r = jRow('me'), nm = JS.me === 'me' ? JS.name : (JS.meName || { zh: '', en: '' }); r.zh = nm.zh; r.en = nm.en; } // the 'me' row carries your first name, even after you carry on as another man
function jDress(u, i) { const r = JR[i]; if (!u || !r) return; u.look = Object.assign({ id: 'j:' + r.k }, JLOOK[r.k] || { jin: 'helm', coat: JW, stud: JSTUD }); u.look.body = u.look.coat || JW; u.look.legs = 0x2a2a30;
  if (u.def && !u.def.jinName) { u.def = Object.assign({}, u.def, { name: u.look.armor === 'robe' ? 'Bannerman' : 'Armoured bannerman', jp: u.look.armor === 'robe' ? '旗丁' : '披甲', jinName: true }); } if (state.renderer) state.renderer.colorFigure(u.id, u); }
function jGo(scene) { try { localStorage.setItem(JGO, scene); } catch (e) { } location.reload(); }
// the men of the file now, not counting you; the bošokū stands in it only while he lives and you do not lead
function jFile() { return JR.filter(r => !r.guest && r.k !== JS.me && JS.alive[r.k]); }
// between chapters new men take the empty places (eleven besides you)
function jFill(n) { let vac = 11 - jFile().length; for (const r of JR) { if (vac <= 0) break; if (!r.draft || JS.alive[r.k] !== undefined) continue; JS.alive[r.k] = true; JS.bond[r.k] = 0; JS.joined[r.k] = n; vac--; } }
const jDead = () => JR.filter(r => !r.guest && r.k !== JS.me && JS.alive[r.k] === false && JS.fate[r.k] !== 'you');

// ---------- the chapters ----------
const JCH = {};
JCH[1] = {
  mission: 'jin1', battle: 'abudali',
  intro: [
    { title: '建州 · Jianzhou', year: 'Spring 1619 · 天命四年', p: ['For thirty years Nurhaci has gathered the Jurchen tribes under one hand: Hada, Hoifa, Ula, one after another. In 1616 he named his state the Later Jin and himself its Khan.',
      'Last spring he declared Seven Grievances against the Ming before Heaven and took Fushun. This spring the Ming have answered with four armies.'], zh: '天命三年四月，汗以七大恨告天。' },
    { title: '八旗 · The Eight Banners', year: 'Niru · jalan · gūsa', p: ['Every Jurchen household belongs to a niru, about three hundred men under a captain. Five niru make a jalan, five jalan a banner, and there are eight banners. In war each niru sends out its armoured men.',
      'You are one of them: a young 披甲, an armoured man, in a niru of the Plain White Banner, the banner of the Khan\'s fourth son, Hong Taiji.'],
      html: '<p><label style="font:14px sans-serif">Your name <input id="jName" value="阿克敦" maxlength="6" style="width:6em;font-size:15px"> <input id="jNameEn" value="Akdun" maxlength="14" style="width:8em;font-size:15px"></label></p>',
      onNext: () => { const zh = ($('jName').value || '阿克敦').trim().slice(0, 6), en = ($('jNameEn').value || 'Akdun').trim().slice(0, 14); JS.name = { zh, en }; jSave(); } },
    { title: '薩爾滸 · Sarhu', year: 'The third month of 1619', p: ['The Ming came by four roads, and the Khan went out by one. Two days ago at Sarhu your banners destroyed Du Song\'s column in the snow. Yesterday Ma Lin\'s broke in the north.',
      'One column is left: old Liu Ting\'s, coming through the eastern mountains toward Hetu Ala. Tonight your niru camps on the road to meet it.'], zh: '憑爾幾路來，我只一路去。', btn: 'To the camp →' },
  ],
  campTitle: '營 · The night after Sarhu', campCard: 'Your niru camps in the hills east of Hetu Ala. Walk among the file and talk with them (look at a man and press E). When you are ready, lie down on your bedroll (E).',
  guests: ['tobohui'],
  chat: [['薩爾滸那邊的屍首還沒埋完。', 'They haven\'t finished burying the dead at Sarhu.'], ['杜松的頭盔是金的，你看見沒？', 'Did you see Du Song\'s helmet? Gilded.'], ['腳凍麻了。', 'My feet have gone numb.'], ['明天走多遠？', 'How far tomorrow?'], ['汗說：憑他幾路來，我只一路去。', 'The Khan says: however many roads they come by, we go by one.'], ['給馬多餵一把豆子。', 'Give the horses an extra handful of beans.']],
  dawn: { title: '黎明 · Dawn', year: 'The fourth day of the third month', p: ['Before light the niru rides east and climbs into the woods of the west ridge. Below, along the valley floor, Liu Ting\'s column is already moving.', 'Ulgen walks down the file, tugging straps. "Armour in front, bows behind," he says. "And nobody goes before the conch."'], btn: 'To the ridge →' },
  battleCard: ['April 1619. Hong Taiji\'s banners wait in the woods above the valley. Stay with your file. LMB cut, RMB guard.', '阿布達里岡 · Abdali'],
  who: { niru: ['托博輝', 'Tobohui, captain of the niru'], hong: ['皇太極', 'Hong Taiji, the Fourth Beile'], daisan: ['代善', 'Daišan, the Great Beile'], lookout: ['', 'A lookout'], soldier: ['', 'A bannerman'] },
  fateText: { out: 'came down from the ridge', dead: 'killed at Abdali', lost: 'left in the valley' },
  after: (won, li, outN) => [
    { title: '阿布達里岡 · What happened', year: 'The fourth month of 1619', p: ['Liu Ting died fighting under his standard. Two days later the Korean army that marched with him, cut off and starving at Fucha, surrendered to Daišan. Of the four Ming columns, only Li Rubai\'s, called back in time, went home.',
      'In five days the Khan had destroyed an army the Ming called four hundred and seventy thousand strong. The scribes of the niru wrote it all down in the new script, and Ulgen\'s name among the dead.'], zh: '天命四年三月，大破明兵於薩爾滸、阿布達里岡。' },
    { title: '牛錄 · Your file', year: `${outN} came home`, html: `<ul>${li}</ul>`, p: ['Ulgen is dead. Tobohui gives his place to you: you are the bošokū of the file now.'], btn: 'Two years later →' },
  ],
  next: 'c2',
  talk: (k) => ({
    ulgen: { g: ['你的弓弦換了沒有？明天用得著。', 'Changed your bowstring? You\'ll need it tomorrow.'], t: [
      { q: 'What happens tomorrow?', a: [['四貝勒的人埋伏在西嶺上，等大貝勒先打他們的頭。', 'The Fourth Beile\'s men lie up on the west ridge and wait for the Great Beile to hit the head of the column.'], ['披甲的在前，弓手在後。跟著我，別一個人往裡衝。', 'Armour in front, bows behind. Stay with me, and never go in alone.']] },
      { q: 'Where are you from?', bond: 1, a: [['哈達。我十五歲那年，汗打下了哈達，我就成了他的人。', 'Hada. When I was fifteen the Khan took Hada, and I became his man.'], ['那時候我恨他。現在……他讓我們吃得飽。', 'I hated him then. Now... he keeps us fed.']] },
      { q: 'Do the Ming fight well?', a: [['杜松的人在薩爾滸打得很硬。可他們的火器一下雪就啞了。', 'Du Song\'s men fought hard at Sarhu. But their guns go dumb in the snow.'], ['南邊來的那些不一樣。聽說他們不跑。', 'The ones from the south are different. They say they don\'t run.']] }] },
    dabsun: { g: ['我在薩爾滸砍倒一個！真的！', 'I cut one down at Sarhu! I really did!'], t: [
      { q: 'What was it like?', a: [['……他比我還小。他在喊他娘。', '...He was younger than me. He was calling for his mother.'], ['舅舅說別想。我就不想。', 'Uncle says don\'t think about it. So I don\'t.']] },
      { q: 'Stay close to me tomorrow.', bond: 1, flag: 'promise', a: [['好！你砍左邊，我砍右邊！', 'Good! You take the left, I\'ll take the right!']] }] },
    sose: { g: ['風往東吹。明天的箭會飄。', 'The wind\'s blowing east. Tomorrow the arrows will drift.'], t: [
      { q: 'Teach me to shoot in the wind.', bond: 1, a: [['看樹梢，別看旗。旗會騙人，樹不會。', 'Watch the treetops, not the banners. Banners lie. Trees don\'t.']] },
      { q: 'You were a hunter?', a: [['冬天打貂，夏天挖參。這兩年……只打人。', 'Sable in winter, ginseng in summer. These two years... only men.']] }] },
    ilan: { g: ['來，擲一把。輸了明天替我背箭。', 'Come on, one throw. Lose, and you carry my arrows tomorrow.'], t: [
      { q: 'Throw the knucklebones.', bond: 1, a: [['（羊拐骨在火光裡翻滾。你贏了；他大笑，丟給你一枚明朝銅錢。）', '(The knucklebones tumble in the firelight. You win; he laughs and tosses you a Ming copper.)']] },
      { q: 'Why "Ilan"?', a: [['我是老三。我爹懶，數到三就不起名了。', 'I\'m the third son. My father was lazy. After three he stopped thinking up names.']] }] },
    bahai: { g: ['餓。誰還有炒米？', 'Hungry. Who\'s got parched millet?'], t: [
      { q: 'Share your millet with him.', bond: 1, a: [['好兄弟。明天誰敢碰你，我把他的臉按進雪裡。', 'Brother. Tomorrow, anyone touches you, I push his face in the snow.']] },
      { q: 'What did you do before?', a: [['在松花江裡摸東珠。我一口氣能憋到你數一百。', 'I dived for pearls in the Sungari. I can hold my breath while you count to a hundred.'], ['珠子都給了貝勒。我們只落下一手凍瘡。', 'The pearls all went to the beile. We kept the frostbite.']] }] },
    lier: { g: ['……爺有什麼吩咐？', '...Does the master want something?'], t: [
      { q: 'I\'m not your master.', bond: 1, a: [['（他看了你很久。）……我叫李二，撫順人。去年城破的時候被分到這個牛錄。', '(He looks at you for a long time.) ...My name is Li Er. From Fushun. When the town fell last year I was given to this niru.']] },
      { q: 'How did Fushun fall?', a: [['李永芳開了城門。汗說投降的不殺。他說話算話……大多數時候。', 'Li Yongfang opened the gates. The Khan said those who gave up would be spared. He kept his word... mostly.'], ['我家的人都在對面那邊。', 'My people are all on the other side.']] }] },
    bater: { g: ['你們女真人的馬太矮了。', 'You Jurchen ride horses that are too short.'], t: [
      { q: 'Why are you with us?', a: [['科爾沁的台吉把我送給汗當禮物。我比一匹馬值錢一點。', 'A Khorchin taiji gave me to the Khan as a gift. I was worth a little more than a horse.'], ['可這裡有肉吃。在草原上，冬天只有雪吃。', 'But here there\'s meat. On the grass, in winter, you eat snow.']] },
      { q: 'Sing something.', bond: 1, a: [['（他低聲用蒙古話唱了一段長調，唱一匹走失的白馬。火邊的人都不說話了。）', '(He sings a long low song in Mongolian about a white horse that wandered away. Around the fire the talking stops.)']] }] },
    erde: { g: ['我兒子正月生的。我還沒見過他。', 'My son was born in the first month. I haven\'t seen him yet.'], t: [
      { q: 'What will you call him?', bond: 1, flag: 'erdeson', a: [['本想叫他阿林……阿林大叔不會高興的。就叫太平吧。', 'I thought of "Alin"... Uncle Alin wouldn\'t like that. I\'ll call him Taiping. Peace.']] },
      { q: 'You\'ll see him soon.', a: [['汗說打完這一仗就分田、分人。我回家就有自己的地了。', 'The Khan says after this there\'ll be land and men to share out. I\'ll go home with fields of my own.']] }] },
    muktan: { g: ['別擋光，我在記帳。', 'Don\'t block my light. I\'m keeping the tally.'], t: [
      { q: 'What are you writing?', a: [['哪個牛錄斬了幾級，折了幾個人，得了幾匹馬。汗什麼都要記下來。', 'Which niru took how many heads, lost how many men, took how many horses. The Khan wants everything written down.'], ['這是額爾德尼師傅造的字，拿蒙古字母寫我們的話。才二十年。', 'It\'s the script Master Erdeni made: our tongue in Mongol letters. It\'s only twenty years old.']] },
      { q: 'Why are we fighting?', bond: 1, a: [['汗以七大恨告天。頭一恨：明朝無故殺了他的祖父、父親。', 'The Khan named Seven Grievances before Heaven. The first: the Ming killed his grandfather and his father for nothing.'], ['可真正的理由是：我們不打他們，他們就會再把我們分成十個部落，讓我們自相殘殺。', 'But the real reason is this: if we don\'t fight them, they\'ll split us into ten tribes again and let us kill each other.']] },
      { q: 'Write my name in it.', a: [['（他用新字在帳尾寫下你的名字。「這樣你就丟不了了。」）', '(He writes your name at the foot of the tally in the new letters. "Now you can\'t get lost.")']] }] },
    manggu: { g: ['又是凍硬的肉乾。', 'Frozen jerky again.'], t: [
      { q: 'At least we won.', a: [['贏了。贏了明天還得走一百里山路。', 'We won. For winning, tomorrow we walk a hundred li of mountain.']] },
      { q: 'Help him lace his armour.', bond: 1, a: [['……手倒挺巧。謝了。', '...Handy, aren\'t you. Thanks.']] }] },
    alin: { g: ['看著那孩子。他以為打仗跟打獵一樣。', 'Keep an eye on that boy. He thinks war is a hunt.'], t: [
      { q: 'He\'ll be all right.', bond: 1, a: [['我姐姐就這一個兒子。我答應過她，帶他回去。', 'My sister has only the one son. I promised her I\'d bring him home.']] },
      { q: 'How long have you fought?', a: [['從汗打圖倫城那年。那時候他只有十三副甲。', 'Since the year the Khan attacked Tulun. He had thirteen suits of armour then.'], ['十三副甲起家，現在……你看看這山谷。', 'Thirteen suits of armour, and now... look at this valley.']] }] },
    tobohui: { g: ['睡不著？明天睡得更少。', 'Can\'t sleep? You\'ll sleep less tomorrow.'], t: [
      { q: 'What should I know about tomorrow?', a: [['我們的牛錄跟著四貝勒。海螺一響，從西嶺上衝下去。', 'Our niru goes with the Fourth Beile. When the conch sounds, we go down the west ridge.'], ['盯著那面大纛。纛一倒，明軍就散了。', 'Watch the big standard. When it falls, the Ming come apart.']] },
      { q: 'What does "niru" mean?', a: [['打獵的時候，十個人一隊，每人出一支箭。那支箭就叫「牛錄」。', 'On the hunt men went in tens and each gave one arrow. That arrow was called a niru.'], ['汗把打獵的規矩變成了一個國家。', 'The Khan turned the rules of the hunt into a state.']] }] },
  })[k],
};

// ---------- camp ----------
const JCAMP = { fires: [[0, 0], [8, -5]], tents: [[-10, 4, 1.7, 2.5, 2.1], [-4.5, 10.5, 1.7, 2.5, 2.1], [4.5, 10.5, 1.7, 2.5, 2.1], [10, 4, 1.7, 2.5, 2.1]],
  props: [['pot', 8, -5, 0], ['banner', -3, -7.5, 0.3, '白'], ['rack', -7.5, -3.5, 0.9], ['log', 0, 2.9, 0], ['log', -2.6, -1.4, 1.1], ['log', 2.7, -1.2, -1.1]] };
function jCampCfg(n) {
  const C = JCH[n], npcs = [], beds = [], file = jFile(), rows = [{ k: JS.me }].concat(file), N = rows.length;
  rows.forEach((r, i) => { const a = -0.5 + (i / Math.max(8, N)) * Math.PI * 1.55 + Math.PI * 0.55; beds.push([+(Math.sin(a) * 6.3).toFixed(2), +(Math.cos(a) * 6.3).toFixed(2), +(a + Math.PI).toFixed(3), false]); });
  for (const k of jDead().map(r => r.k).slice(0, 4)) { const a = Math.PI * (1.6 + beds.length * 0.07); beds.push([+(Math.sin(a) * 6.3).toFixed(2), +(Math.cos(a) * 6.3).toFixed(2), +(a + Math.PI).toFixed(3), true]); } // empty bedrolls for the dead
  // the file around the fire: squatting in a ring, a few standing; officers by the second fire
  file.forEach((r, i) => { const a = (i / Math.max(1, file.length)) * Math.PI * 2 + 0.4, rr = i % 3 === 2 ? 3.4 : 2.5; const x = +(Math.sin(a) * rr).toFixed(2), z = +(Math.cos(a) * rr).toFixed(2);
    npcs.push({ role: 'spear', x, z, yaw: +Math.atan2(-x, -z).toFixed(3), ci: jIdx(r.k), pose: i % 3 === 2 ? 'stand' : 'squat' }); });
  (C.guests || []).forEach((k, i) => npcs.push({ role: 'spear', x: 7 - i * 1.5, z: -2.6, yaw: 2.6, ci: jIdx(k), pose: 'stand' }));
  ZC = { bed: [beds[0][0], beds[0][1]], jin: true, R: JR, map: {}, night: n };
  return { type: 'samurai', team: 1, fires: JCAMP.fires, tents: JCAMP.tents, props: JCAMP.props, bedrolls: beds, npcs, me: { x: 0.4, z: -3.4, yaw: 0, role: 'spear' } };
}
function jStart(scene) {
  JS = jLoad() || jFresh(); jMeRow(); $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  const m = /^([cb])(\d)$/.exec(scene); if (!m) { jMenu(); $('menu').hidden = false; return; }
  const n = +m[2], C = JCH[n]; if (!C) { $('menu').hidden = false; return; }
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: JS.name.zh || 'You', team: 1, connected: true }];
  if (m[1] === 'c') {
    if (!JS.seen['i' + n]) { if (n > 1) jFill(n); return zCards(C.intro, () => { JS.seen['i' + n] = 1; JS.stage = 'c' + n; jSave(); jStart('c' + n); }); }
    const camp = jCampCfg(n); ZB = null;
    startGame({ seed, battle: 'zcamp', mode: 'campaign', mission: 'zcamp', camp, players: pl }, 0, null, 1);
    for (const u of state.sim.units) if (u.camp) { ZC.map[u.id] = u.ci; jDress(u, u.ci); } { const me = state.sim.units[state.sim.players[0].heroId]; jDress(me, jIdx(JS.me)); } ZC.chatT = 6;
    MUSIC.play('menu'); MUSIC.setIntensity(0.15); AUDIO.setFire(0.6); $('army').hidden = true;
    setTimeout(() => storyCard(C.campCard, C.campTitle), 900);
  } else {
    ZC = null; startGame({ seed, battle: C.battle, mode: 'campaign', mission: C.mission, players: pl }, 0, null, 1);
    const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq];
    ZB = { map: {}, sq: q.id, first: me.heroId, cur: JS.me, fell: false, R: JR, jin: true, ch: n, deadMe: [] };
    const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = jIdx(JS.me);
    const file = jFile(); // the bošokū takes the first place while he lives; everyone else fills in
    const chief = file.find(r => r.k === 'ulgen'); if (chief && !used[q.unitIds[0]]) { used[q.unitIds[0]] = 1; ZB.map[q.unitIds[0]] = jIdx('ulgen'); }
    for (const r of file) { if (r.k === 'ulgen') continue; const id = q.unitIds.find(uid => !used[uid]); if (id === undefined) break; used[id] = 1; ZB.map[id] = jIdx(r.k); }
    for (const uid in ZB.map) jDress(sim.units[uid], ZB.map[uid]);
    const g = sim.mg.niru; if (g) { const h = sim.units[sim.players[g.p].heroId]; if (h) { h.look = Object.assign({ id: 'j:tobohui', body: JW, legs: 0x2a2a30 }, JLOOK.tobohui); if (state.renderer) state.renderer.colorFigure(h.id, h); } }
    setTimeout(() => storyCard(C.battleCard[0], C.battleCard[1]), 700);
  }
}
function jLook() {
  const sim = state.sim, h = localHero(); if (!h || h.dead || !ZC) return null;
  if (Math.hypot(h.x - ZC.bed[0], h.z - ZC.bed[1]) < 1.9) return { bed: true };
  let best = null, bd = 0.5; const fx = Math.sin(Input.yaw), fz = Math.cos(Input.yaw);
  for (const u of sim.units) { if (!u.camp) continue; const dx = u.x - h.x, dz = u.z - h.z, d = Math.hypot(dx, dz); if (d > 3.4 || d < 0.3) continue; const off = 1 - (dx * fx + dz * fz) / d; if (off < bd) { bd = off; best = u; } }
  return best ? { u: best, k: JR[best.ci].k } : null;
}
function jKeyE() {
  if (state.zheDlg) return true; const t = jLook(); if (!t) return true;
  if (t.bed) { const n = ZC.night, C = JCH[n]; JS.stage = 'b' + n; jSave(); zCards([C.dawn], () => jGo('b' + n)); return true; }
  jDialog(t.k, t.u); return true;
}
// talk: the same panel and keys as the Zhejiang camp (#zheDlg, state.zheDlg)
function jDialog(k, u) {
  const n = ZC.night, D = JCH[n].talk(k) || jTalkAny(k, n); if (!D) return; const r = jRow(k); state.zheDlg = { k };
  if (document.pointerLockElement) document.exitPointerLock(); Input.keys = 0; $('pause').hidden = true;
  let box = $('zheDlg'); if (!box) { box = document.createElement('div'); box.id = 'zheDlg'; document.body.appendChild(box); box.addEventListener('mousedown', (e) => e.stopPropagation()); }
  const h = localHero(); if (h && u) Input.yaw = Math.atan2(u.x - h.x, u.z - h.z);
  const key = (t) => `${n}:${k}:${t.q}`, open = () => D.t.filter(t => !JS.talked[key(t)]);
  const render = (lines, topics) => { box.hidden = false;
    box.innerHTML = `<div class="who">${r.zh} ${r.en}<small>${r.t}${JS.bond[k] > 0 ? ' · ' + '♥'.repeat(Math.min(3, JS.bond[k])) : ''}</small></div>${lines.map(l => `<div class="zh">${l[0]}</div><div class="en">${l[1]}</div>`).join('')}<div class="ch">${topics.map((t, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd>${t.q}</button>`).join('')}<button type="button" data-i="-1"><kbd>Esc</kbd>Leave</button></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => choose(+b.dataset.i)); state.zheDlg.topics = topics; };
  const choose = (i) => { AUDIO.play('ui'); if (i < 0) { close(); return; } const t = state.zheDlg.topics[i]; if (!t) return;
    JS.talked[key(t)] = 1; if (t.bond) JS.bond[k] = (JS.bond[k] || 0) + t.bond; if (t.flag) JS.flags[t.flag] = true; jSave(); render([[`「${t.q}」`, ''], ...t.a].filter(x => x[0]), open()); };
  const close = () => { box.hidden = true; state.zheDlg = null; requestLock(); };
  state.zheDlg.choose = choose; state.zheDlg.close = close; render([D.g], open());
}
// a man the chapter has no special lines for (usually a new man): who he is, and the dead he never knew
function jTalkAny(k, n) {
  const r = jRow(k); if (!r) return null; const B = JDRAFT[k] || {}; const lost = jDead().map(d => d.zh);
  return { g: B.g || ['……', '...'], t: (B.t || []).concat(lost.length ? [{ q: 'You never met the ones we lost.', a: [[`${lost.slice(0, 3).join('、')}……我聽他們說起過。`, `${jDead().slice(0, 3).map(d => d.en).join(', ')}... I've heard them talk about them.`], ['我會站在他們站過的地方。', 'I\'ll stand where they stood.']] }] : []) };
}
const JDRAFT = {
  tuhe: { g: ['我是烏拉人。汗打下烏拉那年我才五歲。', 'I\'m from Ula. I was five when the Khan took Ula.'], t: [{ q: 'Do you hate him for it?', bond: 1, a: [['我不記得烏拉了。我只記得這個牛錄。', 'I don\'t remember Ula. I only remember this niru.']] }] },
  wangsi: { g: ['我剃了頭，留了辮子。剃頭的時候我哭了。', 'I shaved my head and grew the queue. I cried when they shaved it.'], t: [{ q: 'Why did you join?', bond: 1, a: [['遼陽破了以後，降的人分田，不降的……你知道的。', 'After Liaoyang fell, the ones who gave up got land. The ones who didn\'t... you know.'], ['我有娘要養。', 'I have a mother to feed.']] }] },
  dorji: { g: ['給我一匹野馬，三天就能騎。', 'Give me a wild horse and I\'ll ride it in three days.'], t: [{ q: 'Where are you from?', bond: 1, a: [['喀爾喀。我們的台吉跟汗結了盟，我就跟來了。', 'Khalkha. Our taiji made an oath with the Khan, and I came along.']] }] },
  jala: { g: ['額爾德是我表哥。他跟你說過他兒子嗎？', 'Erde is my cousin. Did he tell you about his boy?'], t: [{ q: 'He did.', bond: 1, a: [['太平。我答應過嫂子，看著他。', 'Taiping. I promised his wife I\'d look out for him.']] }] },
  hife: { g: ['這甲片是我爹打的。你看這個鉚釘。', 'My father forged these plates. Look at this rivet.'], t: [{ q: 'Good work.', bond: 1, a: [['他說，甲好，人就能回家。', 'He says if the armour\'s good, the man comes home.']] }] },
  yanggu: { g: ['我的鷹餓了。你有生肉嗎？', 'My hawk is hungry. Got any raw meat?'], t: [{ q: 'Does it hunt for you?', bond: 1, a: [['兔子、野雞。打仗的時候我把牠留在家裡。牠會等我。', 'Hares, pheasant. When there\'s a war I leave her at home. She waits for me.']] }] },
  kesi: { g: ['……', '...'], t: [{ q: 'You don\'t talk much.', bond: 1, a: [['瓦爾喀人話少。話多的都死在山裡了。', 'Warka men don\'t talk much. The ones who did died in the mountains.']] }] },
  cimbu: { g: ['要不要聽我唱一段？', 'Want to hear me sing?'], t: [{ q: 'Go on, then.', bond: 1, a: [['（他唱得真難聽。全營都笑了，連最累的人都笑了。）', '(He sings terribly. The whole camp laughs, even the most tired men.)']] }] },
  anju: { g: ['我哥死在寧遠城下。紅衣砲。', 'My brother died under the walls of Ningyuan. The red cannon.'], t: [{ q: 'I\'m sorry.', bond: 1, a: [['他們說汗現在也有紅衣砲了。我想看看。', 'They say the Khan has red cannon of his own now. I want to see them.']] }] },
  furdan: { g: ['我爹說我出生那年，汗告了七大恨。', 'My father says the year I was born the Khan swore the Seven Grievances.'], t: [{ q: 'You\'re young.', a: [['十三。報了十六。', 'Thirteen. I said sixteen.']] }] },
  sabu: { g: ['佟大人在教漢人鑄砲。我學過裝藥。', 'Lord Tong is teaching Han men to cast cannon. I learned to load them.'], t: [{ q: 'Will the guns help us?', bond: 1, a: [['寧遠城牆就是被砲守住的。這回輪到我們了。', 'It was guns that held the walls of Ningyuan. This time it\'s our turn.']] }] },
  hoto: { g: ['輝發沒了以後，我是這個牛錄養大的。', 'After Hoifa was gone, this niru raised me.'], t: [{ q: 'Then we\'re your family.', bond: 1, a: [['……嗯。', '...Mm.']] }] },
};
function jHUD(dt) {
  zTags(); const sim = state.sim; let pr = $('zhePrompt'); $('status').style.visibility = 'hidden';
  if (state.zheDlg) { if (pr) pr.hidden = true; return; }
  if (!pr) { pr = document.createElement('div'); pr.id = 'zhePrompt'; document.body.appendChild(pr); }
  const t = jLook(); pr.hidden = !t; if (t) pr.innerHTML = t.bed ? '<kbd>E</kbd>Lie down on your bedroll — ride at dawn' : `<kbd>E</kbd>Talk to ${JR[t.u.ci].zh} ${JR[t.u.ci].en}`;
  ZC.chatT -= dt; if (ZC.chatT <= 0) { ZC.chatT = 7 + Math.random() * 6; const h = localHero(); if (!h) return; const near = sim.units.filter(u => u.camp && Math.hypot(u.x - h.x, u.z - h.z) < 14); if (!near.length) return; const u = near[Math.floor(Math.random() * near.length)];
    const PL = JCH[ZC.night].chat; const L = PL[Math.floor(Math.random() * PL.length)]; SPEECH.say(u.id, L[0], L[1], { prio: 0, cool: 10 }); }
}

// ---------- in battle ----------
function jSay(ev) {
  const sim = state.sim, h = localHero(), C = JCH[ZB.ch]; const W = (C.who || {})[ev.who] || ['', ev.who];
  let id = -1, who = W.slice(); const ji = JR.findIndex(r => r.k === ev.who && !r.guest);
  if (ji >= 0) { for (const uid in ZB.map) if (ZB.map[uid] === ji && sim.units[uid] && !sim.units[uid].dead && !sim.units[uid].wounded && +uid !== (h && h.id)) id = +uid; if (id >= 0) who = [JR[ji].zh, JR[ji].en]; else who = ['', 'A bannerman']; }
  else if (sim.mg[ev.who]) { const g = sim.mg[ev.who]; id = sim.players[g.p].heroId; }
  if (id >= 0 && sim.units[id] && sim.units[id].dead) id = -1;
  if (id < 0 && h) { const cand = sim.teamAlive[h.team].filter(u => u.id !== h.id && !u.wounded && u.type !== 'horse' && Math.hypot(u.x - h.x, u.z - h.z) < 22); if (cand.length) id = cand[Math.floor(Math.random() * cand.length)].id; }
  const label = who[0] ? `${who[0]} ${who[1]}` : who[1];
  const ok = id >= 0 && SPEECH.say(id, ev.zh, ev.text, { prio: 3, loud: true, radio: true, who: label, dur: Math.min(8, 3 + ev.text.length / 20), shout: ev.who === 'hong' || ev.who === 'lookout' ? 0.3 : false });
  if (!ok && typeof radio === 'function') radio(label, `${ev.zh ? ev.zh + '  ' : ''}${ev.text}`);
  return true;
}
function jEvent(ev) {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.soldier) return;
  if (ev.t === 'zpromote' && ev.p === state.localIdx) { state.fpSel = null;
    if (ZB.ch === 1) { const q = sim.squads[ev.sq]; const w = q.unitIds.map(id => sim.units[id]).find(u => !u.dead && u.ctrl < 0 && !u.wounded);
      if (w) setTimeout(() => SPEECH.say(w.id, `烏勒根死了！${JS.name.zh}，你說怎麼辦？`, `Ulgen's dead! ${JS.name.en}, what do we do?`, { prio: 3, dur: 5 }), 1600);
      banner('你帶隊 · The file is yours', 'Ulgen is dead. F follow me / H halt / C charge / Z form up where you look', 6); }
    else banner('你帶隊 · Your file', 'You lead the file: F follow me / H halt / C charge / Z form up where you look', 6); }
  else if (ev.t === 'zwound' && ev.p === state.localIdx) { ZB.wounded = ev.id; const n = SPEECH.nameOf(ev.id);
    SPEECH.say(ev.id, '我的腿……走不動了！', 'My leg... I can\'t walk!', { prio: 3, dur: 4 }); toast(`${n ? n.zh + ' ' + n.en : 'A man of your file'} is hit and can't walk. Get to him and press E to get him up`); }
  else if (ev.t === 'zhelp' && ev.id === ZB.wounded) { JS.flags['helped' + ZB.ch] = true; feed(`You get ${(SPEECH.nameOf(ev.id) || { en: 'him' }).en}'s arm over your shoulder`, true); }
  else if (ev.t === 'zcarry' && ev.p === state.localIdx) { const i = ZB.map[ev.id]; ZB.fell = true; const prev = ZB.cur; if (prev && JS.alive[prev] !== false) ZB.deadMe.push(prev);
    ZB.cur = i !== undefined ? JR[i].k : 'stranger'; const n = SPEECH.nameOf(ev.id); const h = sim.units[ev.id]; if (h) { Input.yaw = h.yaw; Input.pitch = 0; }
    toast(n ? `You fall. The fight goes on — you are ${n.zh} ${n.en} now` : 'You fall. The fight goes on — you are another man of the banner now'); }
}
function jFinish(winner) {
  const sim = state.sim, h = localHero(), M = sim.mission, n = ZB.ch, C = JCH[n]; const won = winner === M.side;
  const fate = {}, near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  for (const uid in ZB.map) { const r = JR[ZB.map[uid]]; if (!r) continue; const u = sim.units[uid];
    // the winners keep the field and carry in their wounded; after a defeat a man who cannot walk is left behind
    fate[r.k] = u.dead ? 'dead' : (!won && u.wounded && u.helpedBy < 0 && !near(u, 4)) ? 'lost' : 'out'; }
  for (const k of ZB.deadMe) fate[k] = 'dead';
  const meK = JS.me, alive = h && !h.dead, oldName = Object.assign({}, JS.name);
  if (ZB.cur === meK || ZB.cur === 'stranger') fate[meK] = alive ? 'out' : 'dead'; else fate[meK] = 'dead';
  if (ZB.cur && ZB.cur !== meK && ZB.cur !== 'stranger' && alive) { const nk = ZB.cur, r = jRow(nk); if (meK === 'me') JS.meName = oldName; JS.me = nk; JS.name = { zh: r.zh, en: r.en }; fate[nk] = 'out'; }
  const list = Object.keys(fate);
  for (const k of list) { JS.fate[k] = fate[k]; JS.alive[k] = fate[k] === 'out'; }
  JS.stage = 'e' + n; JS.lastWon = won; jSave();
  const ft = C.fateText, rows = list.map(k => { const r = jRow(k), f = fate[k]; const nm = k === JS.me ? `${JS.name.zh} ${JS.name.en} (you)` : k === meK && JS.me !== meK ? `${oldName.zh} ${oldName.en} (you, until you fell)` : `${r.zh} ${r.en}`; return `<li class="${f === 'out' ? 'out' : f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${nm} — ${ft[f] || ft.out}</li>`; }).join('');
  const outN = list.filter(k => fate[k] === 'out').length;
  $('resultTitle').textContent = won ? '勝 · The field is ours' : '退 · Pulled back'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? M.win : (M.loseText || 'The banners pulled back.')} ${outN} of ${list.length} of your file came through.`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; JS.stage = C.next; jSave(); zCards(C.after(won, rows, outN), () => C.next === 'done' ? jEnd() : jGo(C.next)); };
}
function jEnd() { JS.stage = 'done'; jSave(); location.reload(); }

// ---------- hooks into the Zhejiang campaign's entry points (main.js and career.js call these by name) ----------
{ const kE = zheKeyE, hud = zheHUD, sy = zheSay, evf = zheEvent, fin = zheFinish;
  zheKeyE = function () { if (ZC && ZC.jin && state.sim && state.sim.mission && state.sim.mission.camp) return jKeyE(); return kE(); };
  zheHUD = function (dt) { if (ZC && ZC.jin && state.sim && state.sim.mission && state.sim.mission.camp) return jHUD(dt); return hud(dt); };
  zheSay = function (ev) { if (ZB && ZB.jin) return jSay(ev); return sy(ev); };
  zheEvent = function (ev) { if (ZB && ZB.jin) return jEvent(ev); return evf(ev); };
  zheFinish = function (w) { if (ZB && ZB.jin) return jFinish(w); return fin(w); }; }

// ---------- the main menu ----------
function jMenu() {
  let el = $('jinCta'); const z = $('zheCta'); if (!z) return;
  if (!el) { const st = document.createElement('style'); st.textContent = '#jinCta { display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 14px 16px; margin: -6px 0 16px; border: 1px solid #5a6a8a; background: linear-gradient(100deg, rgba(220,216,204,.14), rgba(40,50,70,.08)); flex-wrap: wrap } #jinCta b { font-size: 19px; letter-spacing: .04em } #jinCta small { display: block; color: var(--ink2); max-width: 64ch; margin-top: 3px } #jinCta .btns { display: flex; gap: 8px }';
    document.head.appendChild(st); el = document.createElement('div'); el.id = 'jinCta';
    el.innerHTML = '<div><b>八旗 · The Plain White Niru</b><small>A story campaign from the other side. Spring 1619: a young armoured bannerman of Hong Taiji\'s Plain White Banner, his file of hunters, pearl divers, a Mongol and a Han bondservant, and the war that made the Qing.</small></div><div class="btns"><button class="btn primary" id="btnJin" type="button">Begin</button><button class="btn" id="btnJinNew" type="button" hidden>New</button></div>';
    z.after(el); }
  const s = jLoad(), b = $('btnJin'), nb = $('btnJinNew'); const cont = s && s.stage && s.stage !== 'done';
  b.textContent = cont ? 'Continue' : s ? 'Play again' : 'Begin'; nb.hidden = !cont;
  const begin = () => { AUDIO.init(); AUDIO.play('ui'); JS = jFresh(); jSave(); jStart('c1'); };
  b.onclick = () => { if (!cont) return begin(); AUDIO.init(); AUDIO.play('ui'); const st = s.stage; jStart(/^e(\d)$/.test(st) ? JCH[+st.slice(1)].next : st); };
  nb.onclick = begin;
}
jMenu();
{ let go = null; try { go = localStorage.getItem(JGO); localStorage.removeItem(JGO); } catch (e) { } if (go) setTimeout(() => jStart(go), 60); }
