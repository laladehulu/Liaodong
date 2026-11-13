// ===================== 東江 · Act Two: the island (1622–1626) =====================
// Chapters 5–8 of the East River campaign (dongjiang.js): the first landing on the Jin coast, the famine on Pidao (played as
// Li Erniu), the hill fort at Tieshan, and the deep raid toward Anshan after Nurhaci's death.
DR.push(
  { k: 'ma', zh: '馬六', en: 'Ma Liu', t: 'a fisherman of the Liaodong coast', born: 1600, joins: 5 },
  { k: 'hu', zh: '胡三', en: 'Hu San', t: 'a Haizhou man, once a bannerman\'s bondservant', born: 1597, joins: 7 },
  { k: 'auntwang', zh: '王嫂', en: 'Sister Wang', t: 'a fisherman\'s widow of Pidao', born: 1594, woman: true, only: [6] },
  { k: 'xiaolan', zh: '小蘭', en: 'Xiaolan', t: 'a girl from Haizhou, freed at the landing', born: 1610, woman: true, only: [6] },
  { k: 'mao', zh: '毛文龍', en: 'Mao Wenlong', t: 'Regional Commander of the East River', guest: true },
  { k: 'chenshou', zh: '陳壽', en: 'Sergeant Chen Shou', t: 'a Mao Wenlong man, your company\'s sergeant', guest: true },
  { k: 'kimyong', zh: '金永', en: 'Kim Yong', t: 'Kim Sun\'s cousin, a Korean musketeer', guest: true },
);
Object.assign(DLOOK, {
  ma: { h: 1.02, hat: 'straw', brows: 'thick', beard: 'mous', rosy: true, skin: 0xa87a52 },
  hu: { h: 0.97, hat: 'shaved', brows: 'sad', beard: 'stubble', scar: true, skin: 0xc8a07a },
  auntwang: { h: 0.92, hat: 'kerchief', kerch: 0x6a3a2a, brows: 'knit', woman: true, skin: 0xc49a72 },
  xiaolan: { h: 0.8, hat: 'kerchief', kerch: 0x8a5a7a, brows: 'high', young: true, rosy: true, woman: true, skin: 0xe2bc96 },
  mao: { h: 1.0, hat: 'chief', brows: 'knit', beard: 'longmous', plume: 0xd02a1c, skin: 0xd8b088 },
  chenshou: { h: 1.04, hat: 'rattan', brows: 'thick', beard: 'full', scar: true },
  kimyong: { h: 1.0, hat: 'gat', brows: 'thick', beard: 'mous', coat: 0xe8e4da },
});

// ========== 第二幕 · 皮島 · Act Two: the island ==========
DCH[5] = {
  year: 1622, mission: 'dj5', act: '第二幕 · 皮島 · Act Two: the island', away: ['erniu', 'zheng'],
  intro: [
    { title: '第二幕 · 皮島', year: 'Act Two · The island · 1622', p: ['Gado, the Chinese call it Pidao: a hilly island of fishermen and goats off the Korean coast, twenty li from the mouth of the Yalu. In the spring of 1622 Mao Wenlong brought his people out to it in fishing boats, and by summer there were thirty thousand on an island that had fed three hundred.',
      'The court in Beijing made him Regional Commander of the East River, sent him silver and grain by sea from Dengzhou, and told him to raid the Jin from behind. Mao reported that he had a hundred thousand men. Nobody could count them, out on the islands.'], zh: '毛文龍開鎮皮島，號東江。' },
    { title: '你們 · Your people', year: 'Spring 1622', p: () => [`You are ${dAge('me', 1622)} now. Your mother and Erniu have a hut in the fishing village; Old Zheng cooks for a company of Mao\'s men. Zhao Da, Liu Heizi and you have been written into the rolls of Sergeant Chen Shou\'s company, and they give you a padded coat with the East River\'s red border on it.`,
      'Ma Liu, a fisherman from the coast who rows one of the company\'s boats, has started bringing Erniu fish.'], btn: 'To the beach camp →' },
  ],
  camp: { map: 'djpidao', biome: 'night', fog: 0.3, at: [52, -100], title: '營 · The beach camp', card: 'The night before the first landing, on the beach below the fishing village. Walk among the file (E to talk). The general himself is walking the camp tonight. When you are ready, lie down (E).',
    guests: ['mao', 'chenshou'],
    chat: [['潮水半夜就漲。', 'The tide turns at midnight.'], ['對岸那片燈火，是金州的哨所。', 'Those lights across the water are the Jinzhou post.'], ['總兵說，一顆金人首級賞銀三兩。', 'The general says three taels a Jin head.'], ['我暈船。', 'I get seasick.'], ['船上別點燈。', 'No lights on the boats.'], ['聽說對岸田裡的人，都是遼陽人。', 'They say the people in the fields over there are Liaoyang people.']] },
  dawn: { title: '渡海 · Across', year: 'Before dawn', p: ['Twenty boats in the dark, oars muffled with rags. Ma Liu rows yours. Halfway across he starts singing under his breath, and Sergeant Chen hits him, and he stops.', 'Then the boat grinds on sand.'], btn: 'Ashore →' },
  battleCard: ['The Liaodong coast, 1622. Take the village, free the bondservants, burn the granary, and get everyone back to the boats.', '沿海 · The landing'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], second: ['張盤', 'Zhang Pan'] },
  order: ['zhao', 'ma', 'qian', 'gou', 'liu', 'kim', 'feng', 'dong', 'sun'],
  fateText: { out: 'came back in the boats', dead: 'killed on the coast', lost: 'left on the Jin shore' },
  after: (won, li, outN) => [
    { title: '沿海 · What happened', year: 'Spring 1622', p: ['That year the East River\'s boats landed all along the Liaodong coast, and every landing brought back people: Han bondservants, fishermen, whole villages. The Korean records say that the refugees on the islands came to number in the hundreds of thousands. (This landing is a composite of those raids; the place is not named in the records.)',
      'One of the bondservants who came back in your boat was a scarred Haizhou man called Hu San, who had run from his master twice and been caught twice. He asked to join the file.'], zh: '遼民歸者，日以千計。' },
    { title: '你們 · Your people', year: `${outN} came back`, html: `<ul>${li}</ul>`, btn: 'A year later →' },
  ],
  next: 6,
  talk: (k) => ({
    zhao: { g: ['穿上這身紅邊襖，你就是兵了。', 'Put on that red-bordered coat and you\'re a soldier.'], t: [
      { q: 'Am I?', a: [['兵是能聽令的人。你能聽令嗎？', 'A soldier is a man who can take an order. Can you?'], ['在遼陽那晚，你沒聽我的。你回頭去找你娘。', 'The night Liaoyang fell you didn\'t listen to me. You went back for your mother.'], ['……那是對的。可以後，要聽。', '...That was right. But from now on, listen.']] },
      { q: 'What do you make of Mao Wenlong?', bond: 1, a: [['他給我們飯吃，給我們刀。朝廷給他銀子，他給我們一半。', 'He feeds us and arms us. The court gives him silver and he gives us half.'], ['另一半去了哪兒，我不問。我在遼陽見過不給一半的。', 'Where the other half goes, I don\'t ask. In Liaoyang I saw the ones who didn\'t give half.']] }] },
    ma: { g: ['明天我划你們那條船。', 'Tomorrow I row your boat.'], t: [
      { q: 'You\'ve been bringing my sister fish.', bond: 1, a: [['……她跟你說了？', '...She told you?'], ['我不是壞人。我有一條船，有一張網。我舅舅以前在對岸有三畝地。', 'I\'m not a bad man. I\'ve a boat, and a net. My uncle used to have three mu of land over there.'], ['你同意的話……等我們回來。', 'If you agree... when we get back.']] },
      { q: 'Where are you from?', a: [['金州那邊的海邊。那個村子，明天就到。', 'The coast over by Jinzhou. That village, we land there tomorrow.'], ['我舅舅還在那兒。替金人划船。', 'My uncle\'s still there. Rowing for the Jin.']] }] },
    qian: { g: ['總兵讓我給他寫奏摺。他說我的字瘦，正好。', 'The general has me writing his memorials. He says my brushwork is thin, which is just right.'], t: [
      { q: 'What do you write?', bond: 1, a: [['他說殺了一百，我寫一千。他說有三萬人，我寫十萬。', 'He says we killed a hundred, I write a thousand. He says thirty thousand men, I write a hundred thousand.'], ['朝廷就按十萬人發餉。島上的人才能吃上飯。', 'The court sends pay for a hundred thousand. That\'s how the island eats.']] },
      { q: 'Isn\'t that a lie?', a: [['是。', 'Yes.'], ['可是說實話，三萬人裡有一萬會餓死。你說，哪個是罪？', 'But if I wrote the truth, ten thousand of the thirty would starve. You tell me which is the crime.']] }] },
    gou: { g: ['哥，我十四了。總兵說十四就能領餉。', 'Brother, I\'m fourteen. The general says fourteen can draw pay.'], t: [
      { q: 'What will you do with it?', bond: 1, a: [['給大娘買米。還有……買一雙靴子。', 'Buy rice for Auntie. And... a pair of boots.'], ['我這輩子沒穿過自己的靴子。', 'I\'ve never had my own boots in my life.']] }] },
    liu: { g: ['三兩一顆頭。我有二十三顆了，可那時候沒人收。', 'Three taels a head. I\'ve had twenty-three, and back then nobody was paying.'], t: [
      { q: 'Are you still counting?', bond: 1, a: [['數。我會一直數下去，數到我哥說夠了。', 'I am. I\'ll keep counting until my brother says enough.'], ['他是不會說的。', 'He isn\'t going to say it.']] }] },
    kim: { g: ['我給家裡寫信了。用諺文寫的。', 'I wrote to my family. In hangul.'], t: [
      { q: 'What did you tell them?', bond: 1, a: [['說我在明朝的兵營裡，吃得飽。', 'That I\'m in a Ming camp, and eating well.'], ['第二句是假的。', 'The second part isn\'t true.']] },
      { q: 'Why stay with us?', a: [['龍川燒了以後，我舅舅說：去吧，跟著明人。金人遲早還會來。', 'After Yongcheon burned my uncle said: go, go with the Ming. The Jin will come again sooner or later.'], ['我想在他們來以前，學會打仗。', 'I want to know how to fight before they come.']] }] },
    feng: { g: ['島上沒豬。我改殺魚了。', 'No pigs on this island. I\'ve gone over to killing fish.'], t: [{ q: 'Is it the same?', a: [['魚也不看你。', 'Fish don\'t look at you either.']] }] },
    dong: { g: ['我在島上開了個攤子。賣針線，也賣消息。', 'I\'ve set up a stall on the island. I sell needles and thread, and news.'], t: [{ q: 'What news?', bond: 1, a: [['朝鮮人說，毛總兵報的人數，比島上的石頭還多。', 'The Koreans say General Mao reports more men than there are stones on this island.']] }] },
    sun: { g: ['我在島上搭了個爐子。你來不來學？', 'I\'ve built a forge on the island. Coming to learn?'], t: [
      { q: 'Teach me.', bond: 1, flag: 'forge', a: [['（他把你爹的錘子放進你手裡。）先聽鐵的聲音。鐵會告訴你它要什麼。', '(He puts your father\'s hammer in your hand.) First listen to the iron. Iron tells you what it wants.']] }] },
    mao: { g: ['遼東的好兒郎！你叫什麼？', 'A fine son of Liaodong! What\'s your name?'], t: [
      { q: 'Li Tie, sir. A smith\'s son from Liaoyang.', bond: 1, a: [['鐵匠的兒子！好！我缺的就是鐵。', 'A smith\'s son! Good! Iron is just what I\'m short of.'], ['明天上了岸，給我帶幾個遼陽人回來。他們都是你的鄉親。', 'When you land tomorrow, bring me back some Liaoyang people. They\'re your own folk.']] },
      { q: 'Will we take Liaoyang back?', a: [['會！我給皇上寫了，三年復遼。', 'We will! I\'ve written to the Emperor: Liaodong recovered in three years.'], ['（他大笑著走了。陳壽在後面搖頭。）', '(He walks off laughing. Behind him Sergeant Chen shakes his head.)']] }] },
    chenshou: { g: ['早點睡。上了岸，誰也不許搶東西。', 'Get to sleep early. Once we\'re ashore, nobody loots.'], t: [{ q: 'Have you done this before?', bond: 1, a: [['四回。第一回，一半人沒回來。', 'Four times. The first time, half didn\'t come back.'], ['後來就學會了：上岸要快，回船要更快。', 'After that we learned. Ashore fast, back to the boats faster.']] }] },
  })[k],
};

DCH[6] = {
  year: 1623, mission: 'dj6', playAs: () => DS.alive.erniu ? 'erniu' : 'auntwang', cast: ['zheng', 'gou', 'qian', 'dong', 'sun', 'auntwang', 'xiaolan', 'erniu'], mingFoes: ['mob1', 'mob2', 'raid'],
  intro: () => DS.alive.erniu ? DCH[6].introE : DCH[6].introW,
  introW: [
    { title: '一年 · A year', year: 'Autumn 1623', p: ['A year on the island. The East River\'s boats raid the coast every month and come back with people, and every month there are more mouths. The grain ships from Dengzhou come when the court remembers to send them. This autumn the court has not remembered.'], zh: '島中乏食，兵民嗷嗷。' },
    { title: '王嫂 · Sister Wang', year: 'A fisherman\'s widow of Pidao', p: ['Your brother\'s file has sailed for the mainland. On the island, the key of the village grain store is kept by Sister Wang, a fisherman\'s widow, because the elder trusts no man with it. Since Erniu died, Sister Wang has looked in on your mother every evening. In this chapter you are Sister Wang.'], btn: 'Evening →' }],
  introE: [
    { title: '一年 · A year', year: 'Autumn 1623', p: ['A year on the island. The East River\'s boats raid the coast every month and come back with people, and every month there are more mouths. The grain ships from Dengzhou come when the court remembers to send them.',
      'This autumn the court has not remembered. The soldiers in the hill camps have had no pay since summer, and no rice for a month.'], zh: '島中乏食，兵民嗷嗷。' },
    { title: '二妞 · Erniu', year: () => `Li Erniu, ${dAge('erniu', 1623)}`, p: ['Your brother\'s file sailed for the mainland four days ago. You are Li Erniu. You mend nets with the fishermen\'s wives, help Old Zheng in the cookhouse, and keep the key of the village grain store, because the elder trusts no man with it.',
      'Ma Liu asked your brother for you before he sailed. Your brother said: ask her.'], btn: 'Evening →' },
  ],
  camp: { map: 'djpidao', biome: 'night', fog: 0.25, at: [44, -78], title: '漁村 · The fishing village', card: 'Evening in the fishing village, the men away. Talk to the women and the old men (E). When you are ready, go to bed (E).',
    guests: ['ma_mother'], choice: () => DS.alive.erniu ? 'dj6wed' : null,
    chat: [['米缸見底了。', 'The rice jar\'s down to the bottom.'], ['山上的兵昨晚來偷魚了。', 'The soldiers from the hill came stealing fish last night.'], ['船怎麼還不來？', 'Why hasn\'t the ship come?'], ['小蘭又在數星星。', 'Xiaolan\'s counting the stars again.'], ['男人們什麼時候回來？', 'When are the men coming back?']] },
  dawn: { title: '山上 · On the hill', year: 'Morning', p: ['Xiaolan runs into the cookhouse with her eyes huge. "They\'re coming down the hill path. The soldiers. All of them."', 'Old Zheng puts down his ladle and picks up a cleaver. "Erniu," he says. "The key."'], btn: 'To the grain store →' },
  battleCard: ['Pidao, 1623. Hold the grain store against the island\'s own starving soldiers. Nobody has to die.', '皮島 · The grain store'],
  who: { file: ['王老漢', 'Elder Wang'], fishers: ['', 'A fisherman'], ma_mother: ['李大娘', 'Your mother'], captain: ['陳繼盛', 'Chen Jisheng'] },
  order: ['zheng', 'gou', 'qian', 'sun', 'dong', 'auntwang', 'xiaolan'], wounds: { 3: 'sun' },
  fateText: { out: 'kept the store', dead: 'killed at the grain store', lost: 'hurt and left on the hill path' },
  after: (won, li, outN) => [
    { title: '皮島 · What happened', year: 'Autumn 1623', p: ['The grain ship from Dengzhou came eleven days later. Chen Jisheng, Mao Wenlong\'s right hand, hanged four of the soldiers on the beach as an example; the island watched. The rest went back to their camps and drew their pay when it came.',
      'Your brother came back from the mainland the week after. Old Zheng told him everything, and then told him again.'], zh: '陳繼盛斬亂兵四人於岸。' },
    { title: '二妞 · Erniu', year: `${outN} kept the store`, html: `<ul>${li}</ul>`, p: () => { const c = chGot(chCtx() || { S: DS }, 'dj6wed'); return [c === 0 ? 'Erniu married Ma Liu in the first month of 1624, in the fishing village, with a borrowed red skirt. Mao Wenlong sent a jar of wine and a pig.' : c === 1 ? 'Erniu told Ma Liu: when the war is over. He said he would wait. He kept bringing fish.' : 'Erniu said no to Ma Liu. He stayed in the file anyway, and rowed your boat as before.']; }, btn: 'Tieshan →' },
  ],
  next: 7,
  talk: (k) => ({
    zheng: { g: ['丫頭，你哥走了，你就是這家的男人。', 'Girl, with your brother gone, you\'re the man of this house.'], t: [
      { q: 'How much rice is left?', a: [['倉裡的，夠村子吃一個月。山上的兵，一粒也沒有了。', 'What\'s in the store would feed the village a month. The soldiers on the hill have none at all.'], ['餓兵比金兵可怕。金兵還要命，餓兵只要米。', 'Hungry soldiers are worse than Jin. The Jin want your life; hungry men only want the rice.']] },
      { q: 'Should I marry Ma Liu?', bond: 1, a: [['他是個好人。好人在這世道，活不長。', 'He\'s a good man. Good men don\'t live long these days.'], ['可是好人活著的時候，日子是好的。', 'But while a good man lives, the days are good.']] }] },
    gou: { g: ['二姐，我也留下了。他們說我太小。', 'Second Sister, I got left behind too. They said I\'m too young.'], t: [{ q: 'You\'re fifteen.', bond: 1, a: [['十五了！我比你哥那時候還大一歲！', 'Fifteen! A year older than your brother was!'], ['……其實我是自己要留下的。總得有個男人看家。', '...Actually I asked to stay. Somebody has to look after the house.']] }] },
    qian: { g: ['二妞，你識字嗎？', 'Erniu, can you read?'], t: [
      { q: 'No.', a: [['我教你。一天三個字。', 'I\'ll teach you. Three characters a day.'], ['今天的三個：米、門、家。', 'Today\'s three: rice, door, home.']] },
      { q: 'Why aren\'t you with the men?', bond: 1, a: [['總兵說，寫字的手比拿刀的手值錢。', 'The general says a hand that writes is worth more than one that holds a blade.'], ['我想他錯了。可我也不想去。', 'I think he\'s wrong. But I don\'t want to go either.']] }] },
    dong: { g: ['山上的兵昨天找我買煙葉。用他們的刀換。', 'The soldiers on the hill wanted to buy tobacco from me yesterday. With their swords.'], t: [{ q: 'Did you sell?', bond: 1, a: [['沒有。兵賣刀，就快要賣命了。', 'No. When soldiers sell their swords, they\'re about to sell their lives.']] }] },
    sun: { g: ['我又老了一歲。打鐵的手抖了。', 'Another year older. My smith\'s hands shake now.'], t: [{ q: 'Brother says you\'re teaching him.', bond: 1, a: [['他學得快。你爹的手，在他身上。', 'He learns fast. Your father\'s hands, on him.'], ['等這仗打完，讓他開個鋪子。在哪兒都行。', 'When this war is over, let him open a smithy. Anywhere.']] }] },
    auntwang: { g: ['我男人去年出海沒回來。', 'My husband went out to sea last year and didn\'t come back.'], t: [
      { q: 'I\'m sorry.', bond: 1, a: [['海就是這樣。給你魚，也收你人。', 'The sea\'s like that. It gives you fish, and it takes your men.'], ['你要嫁那個馬六？他船划得好。划得好的，能回來。', 'You\'ll marry that Ma Liu? He rows well. The ones who row well come back.']] }] },
    xiaolan: { g: ['二姐姐，星星底下是金州嗎？', 'Big sister, is Jinzhou under those stars?'], t: [
      { q: 'Over there. Why?', bond: 1, a: [['我娘還在金州的莊子上。他們只把我帶上了船。', 'My mother\'s still on the farm at Jinzhou. They only got me onto the boat.'], ['你哥下回去的時候，能帶上她嗎？', 'Next time your brother goes, could he bring her?']] }] },
    ma_mother: { g: ['那個姓馬的，又送魚來了。', 'That Ma fellow brought fish again.'], t: [{ q: 'What do you think, Ma?', bond: 1, a: [['你爹娶我的時候，送的是一把鐮刀。他說：有鐮刀就有糧。', 'When your father married me, he brought a sickle. He said: with a sickle, there\'s grain.'], ['送魚的也行。', 'Bringing fish will do.']] }] },
  })[k],
};

DCH[7] = {
  year: 1624, mission: 'dj7', away: ['erniu', 'zheng'],
  intro: [
    { title: '鐵山 · Tieshan', year: 'Summer 1624', p: ['Mao Wenlong has posts all along the Korean shore opposite his islands, and the one at Tieshan is to be a real fort: a palisade on the hill above the beach, a gate, huts for a garrison. From Tieshan his raiders can cross the Yalu at night and be back before the Jin know they came.',
      'The Koreans of Tieshan don\'t like it. Their king likes it less. But some of their musketeers have started drilling with the East River men, and Kim Sun\'s cousin Kim Yong is one of them.'], zh: '毛文龍屯兵鐵山、雲從、宣川。' },
    { title: '火銃 · Muskets', year: () => `You are ${dAge('me', 1624)}`, p: ['Your file has been issued muskets: long bird-guns with matchlocks, made in the Dengzhou arsenal. Zhao Da has been teaching you to load in the dark. Hu San, the Haizhou man from the landing, is in the file now.'], btn: 'To the fort →' },
  ],
  camp: { map: 'djtieshan', biome: 'night', fog: 0.2, at: [20, -30], noTents: true, title: '鐵山 · The fort', card: 'The half-built fort at Tieshan, the night after the last of the stakes ran out. Talk to the file (E). When you are ready, lie down (E).',
    guests: ['kimyong', 'chenshou'],
    chat: [['木頭不夠了。東北邊還空著一段。', 'We\'ve run out of timber. There\'s still a gap on the north-east.'], ['火繩別受潮。', 'Keep your match dry.'], ['朝鮮人的鳥銃比我們的長。', 'The Korean bird-guns are longer than ours.'], ['北邊的平原上有火光。', 'There are fires on the plain to the north.'], ['船都拉上岸了。', 'The boats are all pulled up.']] },
  dawn: { title: '平原 · The plain', year: 'The morning', p: ['At first light a lookout on the north gate shouts and points. Out on the plain, riders: a few, then more, coming at an easy trot, looking at the fort the way a man looks at a horse he might buy.', '"The gap," Zhao Da says. "They\'ve seen the gap."'], btn: 'To the wall →' },
  battleCard: ['Tieshan, 1624. Your file has muskets now: LMB fire, R reload, RMB aim. Hold the gap, hold the gate, save the boats.', '鐵山 · Tieshan'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], fort: ['', 'A man of the garrison'], korea: ['金永', 'Kim Yong'] },
  order: ['zhao', 'kim', 'hu', 'ma', 'qian', 'liu', 'gou', 'feng', 'dong', 'sun'], wounds: { 4: 'qian' },
  fateText: { out: 'held Tieshan', dead: 'killed at Tieshan', lost: 'left outside the palisade' },
  after: (won, li, outN) => [
    { title: '鐵山 · What happened', year: 'Summer 1624', p: ['The Jin probes along the Korean shore came every few months, and every few months the East River drove them off. (This fight is a composite; the posts at Tieshan, Unchong and Seoncheon, and the Korean musketeers who fought beside the East River, are in the Korean records.)',
      'In the spring of 1625 the Jin took Lüshun, on the tip of the Liaodong peninsula, from Mao Wenlong\'s man Zhang Pan, who died there with his garrison. In the first month of 1626 the Khan himself was thrown back from the walls of Ningyuan by Yuan Chonghuan\'s Portuguese cannon. In the eighth month he died.'], zh: '天啟六年八月，努爾哈赤卒。' },
    { title: '你們 · Your people', year: `${outN} held the fort`, html: `<ul>${li}</ul>`, btn: 'Two years later →' },
  ],
  next: 8,
  talk: (k) => ({
    zhao: { g: ['裝藥：火藥、彈丸、紙、搗實。閉著眼睛也要會。', 'Loading: powder, ball, wad, ram. You have to be able to do it with your eyes shut.'], t: [
      { q: 'You\'re getting grey.', bond: 1, a: [['四十三了。在遼陽，四十三就該當伍長了。', 'Forty-three. In Liaoyang at forty-three I\'d have made file leader.'], ['在這兒，四十三是運氣好。', 'Out here, forty-three is lucky.']] },
      { q: 'Muskets or blades?', a: [['銃打得遠，刀砍得準。金人兩樣都怕，只是怕的時候不一樣。', 'A musket reaches far, a blade strikes true. The Jin fear both, just at different moments.']] }] },
    kim: { g: ['我表哥來了！他是朝鮮的砲手。', 'My cousin\'s here! He\'s a Korean musketeer.'], t: [{ q: 'Your king doesn\'t want us here.', bond: 1, a: [['國王住在漢陽，金人在義州。國王怕的是遠的，我們怕的是近的。', 'The king lives in Hanyang, the Jin are at Uiju. The king fears the distant thing; we fear the near one.']] }] },
    hu: { g: ['……', '...'], t: [
      { q: 'Tell me about your master.', bond: 1, a: [['鑲白旗的一個牛錄章京。他不打人。他只是……把你當成他的牛。', 'A niru captain of the Bordered White. He didn\'t beat people. He just... treated you like one of his oxen.'], ['牛吃得飽。牛也不能走。', 'An ox is well fed. An ox can\'t leave, either.']] },
      { q: 'Your head is still shaved.', a: [['頭髮長得慢。你們看我的時候，我知道你們在想什麼。', 'Hair grows slowly. When you all look at me I know what you\'re thinking.'], ['我也在想。', 'I\'m thinking it too.']] }] },
    ma: { g: () => [chGot(chCtx() || { S: DS }, 'dj6wed') === 0 ? '嫂子……不，你妹妹讓我帶話：吃飽，別逞強。' : '你妹妹讓我帶話：吃飽，別逞強。', chGot(chCtx() || { S: DS }, 'dj6wed') === 0 ? 'Your sister, my wife, says: eat properly, and don\'t show off.' : 'Your sister says: eat properly, and don\'t show off.'], t: [
      { q: 'How is she?', bond: 1, a: [['她在跟秀才學字。她現在比我認得多。', 'She\'s learning characters from the scholar. She knows more than me now.'], ['她說，等我們回去，她要寫我的名字給我看。', 'She says when we get back she\'ll write my name and show me.']] }] },
    qian: { g: ['總兵的奏摺又寫了一篇：鐵山大捷，斬首八百。', 'Another memorial for the general: a great victory at Tieshan, eight hundred heads.'], t: [{ q: 'We haven\'t fought yet.', bond: 1, a: [['所以我先寫好。打完了再改數目。', 'So I write it in advance. After the fight I change the numbers.'], ['有時候改大，有時候改小。從來沒改對過。', 'Sometimes up, sometimes down. Never once right.']] }] },
    liu: { g: ['銃好。一放就倒，不用看他的臉。', 'Muskets are good. They fall when you fire, and you don\'t have to see their faces.'], t: [{ q: 'Do the faces bother you?', bond: 1, a: [['我哥的臉，我快想不起來了。', 'I can hardly remember my brother\'s face any more.'], ['所以要多看幾個金人的臉。好讓我想起來，我為什麼恨。', 'So I need to look at a few more Jin faces. To remember why I hate.']] }] },
    gou: { g: ['我有靴子了！', 'I\'ve got boots!'], t: [{ q: 'They\'re too big.', bond: 1, a: [['會長的！我會長到穿得下的！', 'I\'ll grow! I\'ll grow into them!']] }] },
    feng: { g: ['我塞了一把殺豬刀在靴子裡。銃打完了總得有東西。', 'I\'ve got a pig-sticker in my boot. Once the musket\'s fired you need something.'], t: [{ q: 'Good idea.', a: [['殺豬的，總有一把刀。', 'A butcher always has a knife.']] }] },
    dong: { g: ['朝鮮人在說，金人的新汗是個狠的。', 'The Koreans are saying the Jin\'s next khan will be a hard one.'], t: [{ q: 'The Khan is still alive.', bond: 1, a: [['老汗快七十了。他的兒子們已經在挑刀子了。', 'The old Khan\'s nearly seventy. His sons are already choosing their knives.']] }] },
    sun: { g: () => [DS.alive.sun ? '我跟船來的。炮手要人修銃。' : '', DS.alive.sun ? 'I came on the boat. The gunners need someone to mend the muskets.' : ''], t: [{ q: 'You should rest.', bond: 1, a: [['休息？我在遼陽的時候，一天打三十個箭頭。', 'Rest? In Liaoyang I made thirty arrowheads a day.'], ['現在修三把銃就累了。不服老不行。', 'Now three muskets wear me out. There\'s no not giving in to age.']] }] },
    kimyong: { g: ['（他用漢字寫：）明兵能戰乎？', '(He writes in characters:) Can the Ming soldiers fight?'], t: [{ q: '(Write:) Tomorrow, you will see.', bond: 1, a: [['（他寫：）善。朝鮮砲手，亦能戰。', '(He writes:) Good. The Korean musketeers can fight too.'], ['（他笑了，把筆遞給金順，用朝鮮話說了一句。金順臉紅了。）', '(He laughs, hands the brush to Kim Sun and says something in Korean. Kim Sun goes red.)']] }] },
    chenshou: { g: ['缺口那邊，明天你們隊守。', 'The gap. Your file holds it tomorrow.'], t: [{ q: 'Why us?', bond: 1, a: [['因為趙大在你們隊。他在遼陽西門守過。', 'Because Zhao Da is in your file. He held the west gate at Liaoyang.'], ['守住了一半，也算守過。', 'Half held is still held.']] }] },
  })[k],
};

DCH[8] = {
  year: 1626, mission: 'dj8', away: ['erniu', 'zheng'],
  intro: [
    { title: '汗死了 · The Khan is dead', year: 'The eighth month of 1626', p: ['Nurhaci died on the road back from the hot springs at Qinghe, sixty-seven years old, seven months after Ningyuan. His eighth son Hong Taiji was chosen Khan over his brothers. For a few weeks, while the banners mourned and the beile watched each other, the Jin rear lay open.',
      'Mao Wenlong sent his raiders deep inland. His adopted son Mao Chenglu took a column up the valleys toward Anshan, to burn the bannermen\'s farms and bring out the Han who worked them.'], zh: '天啟六年秋，毛文龍遣將襲鞍山。' },
    { title: '你 · You', year: () => `You are ${dAge('me', 1626)}`, p: ['Twenty-two. You have killed more men than you can remember and fixed more muskets than you can count. Zhao Da\'s hair is grey; Gou\'er is taller than you; Kim Sun speaks Chinese like a Liaoyang man. Hu San says he knows the farm: he worked it.'], btn: 'Into the hills →' },
  ],
  camp: { map: 'djanshan', biome: 'night', fog: 0.3, at: [58, -100], noTents: true, title: '山中 · In the hills', card: 'Hidden in the hills above the valley, the night before the raid. No fire: the camp is cold and dark. Talk to the file (E). Before dawn the file draws lots for who goes first through the gate. When you are ready, lie down (E).',
    guests: ['chenshou'], choice: 'dj8lots',
    chat: [['別生火。', 'No fire.'], ['山下就是莊子。我聞得見他們的灶煙。', 'The farm\'s just below. I can smell their kitchen smoke.'], ['新汗叫皇太極。', 'The new khan\'s called Hong Taiji.'], ['二十里到海邊。二十里。', 'Twenty li to the sea. Twenty li.'], ['胡三一晚上沒閉眼。', 'Hu San hasn\'t shut his eyes all night.']] },
  dawn: { title: '霧 · Mist', year: 'Dawn', p: ['Mist in the valley, thick as milk. Below it the ford, and the six bowmen who watch it, and beyond them the farm with its gate already open for the carts.', 'Sergeant Chen raises his hand, and lets it fall.'], btn: 'Down to the ford →' },
  battleCard: ['Near Anshan, 1626. Take the ford quietly, storm the manor, free the bondservants, and get everyone twenty li down the valley to the boats.', '鞍山 · The raid'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], raid: ['毛承祿', 'Mao Chenglu'] },
  order: ['zhao', 'hu', 'kim', 'ma', 'liu', 'gou', 'qian', 'feng', 'dong', 'sun'],
  fateText: { out: 'came down the valley to the boats', dead: 'killed in the Anshan raid', lost: 'left in the valley' },
  after: (won, li, outN) => [
    { title: '鞍山 · What happened', year: 'Autumn 1626', p: ['The raid on Anshan and Sarhu forced Hong Taiji to call banners back from the west in the first weeks of his reign; the Ming court called it a victory and sent Mao Wenlong silver. (The manor is a composite; the raid is in the Ming records of the seventh and eighth months of 1626.)',
      'Hong Taiji drew his own conclusion. As long as the East River sat on the islands and in Korea, no Jin army could march on the Great Wall without looking over its shoulder. Korea, which fed the islands, would have to be brought to heel. That winter the Jin began to gather on the Yalu.'], zh: '皇太極曰：毛文龍在，終為心腹之患。' },
    { title: '你們 · Your people', year: `${outN} came down the valley`, html: `<ul>${li}</ul>`, p: [DS.alive.hu ? 'Hu San walked the last mile to the boats backwards, watching the valley.' : 'Hu San did not come back from the valley. He had said he would not go back, and he did not.'], btn: 'End of the second act →' },
  ],
  next: 9,
  talk: (k) => ({
    zhao: { g: ['我老了，鐵子。我跑不動二十里了。', 'I\'m getting old, Tie. I can\'t run twenty li any more.'], t: [
      { q: 'Then don\'t run. Walk.', bond: 1, a: [['（他笑了，第一次笑出聲。）你說話越來越像我了。', '(He laughs, out loud for the first time.) You talk more and more like me.']] },
      { q: 'Lead the file tomorrow.', a: [['不。明天你帶。我在旁邊看著。', 'No. Tomorrow you lead it. I\'ll watch from beside you.'], ['總有一天我不在旁邊。', 'One day I won\'t be beside you.']] }] },
    hu: { g: ['那是我主子的莊子。', 'That\'s my master\'s farm.'], t: [
      { q: 'Do you want to go in first?', bond: 1, a: [['不。我想最後一個出來。', 'No. I want to be the last one out.'], ['我要看著它燒。', 'I want to watch it burn.']] },
      { q: 'Who is still in there?', a: [['魏大叔，他瘸了一條腿。張家的兩個丫頭。還有我跑的時候沒帶上的那個孩子。', 'Uncle Wei, with his lame leg. The two Zhang girls. And the boy I didn\'t take when I ran.'], ['他現在該八歲了。', 'He\'d be eight now.']] }] },
    kim: { g: ['我想我爹了。', 'I miss my father.'], t: [{ q: 'You never talk about him.', bond: 1, a: [['他擺渡的時候唱歌。整條江都聽得見。', 'He used to sing when he ran the ferry. The whole river could hear.'], ['金人過江那年，他把船鑿沉了，人也沒上來。', 'The year the Jin crossed the river he scuttled his boat. He didn\'t come up.']] }] },
    ma: { g: ['我答應過她要回去。', 'I promised her I\'d go back.'], t: [{ q: 'You will.', bond: 1, a: [['你也是。她就你一個哥。', 'So will you. She\'s only got the one brother.']] }] },
    liu: { g: ['一百零三。', 'A hundred and three.'], t: [{ q: 'What will you do when it\'s over?', bond: 1, a: [['……沒想過。', '...Never thought about it.'], ['也許娶個媳婦。也許給她講我哥的事。', 'Maybe take a wife. Maybe tell her about my brother.'], ['先數完再說。', 'Finish counting first.']] }] },
    gou: { g: ['哥，我比你高了。', 'Brother, I\'m taller than you now.'], t: [{ q: 'Your boots fit.', bond: 1, a: [['我說過我會長到穿得下的！', 'I told you I\'d grow into them!']] }] },
    qian: { g: ['我在想，該怎麼寫這一仗。', 'I\'m thinking how to write this one.'], t: [{ q: 'Write it true, for once.', bond: 1, flag: 'qianTrue', a: [['……好。這一回，寫真的。只寫進我自己的本子裡。', '...All right. This once, the truth. Only in my own notebook.'], ['給總兵的那份，照樣寫一千。', 'The one for the general still says a thousand.']] }] },
    feng: { g: ['殺豬殺人，現在燒房子了。', 'Pigs, then men, now houses.'], t: [{ q: 'Next?', a: [['下一個？我也不知道。也許是蓋房子。', 'Next? I don\'t know. Maybe building houses.']] }] },
    dong: { g: ['我給莊子裡的人帶了針。他們的針一定都斷了。', 'I\'ve brought needles for the people on the farm. Theirs must all be broken.'], t: [{ q: 'That\'s kind.', bond: 1, a: [['做小買賣的，總得想著客人。', 'A peddler has to think of his customers.']] }] },
    sun: { g: ['我不該跟來的。可我想看看他們的鐵匠鋪。', 'I shouldn\'t have come. But I wanted to see their forge.'], t: [{ q: 'Stay at the boats.', bond: 1, a: [['好。我在船邊等你們。給你們燒一鍋熱水。', 'All right. I\'ll wait by the boats. I\'ll have hot water for you.']] }] },
    chenshou: { g: ['抽籤。誰先進門，誰拿頭功。', 'We draw lots. Whoever goes through the gate first gets first honours.'], t: [{ q: 'And the most danger.', bond: 1, a: [['頭功，就是頭一個死的機會。', 'First honours is the first chance to die.'], ['所以要抽籤。不讓任何人自己選。', 'That\'s why we draw lots. So nobody has to choose.']] }] },
  })[k],
};
DCH[9] = null; // Act Three is being written

// ---------- the choices of Act Two ----------
// 二 · Ma Liu's question (camp before the famine, played as Erniu)
CHD.dj6wed = {
  build: (C) => ({ id: 'dj6wed', title: '魚 · The fish', ltitle: 'Ma Liu\'s question', year: 'Pidao, autumn 1623', who: ['李二妞 Li Erniu', 'at the door of the hut, with a basket of fish someone has left'], hold: 1.2,
    lines: [chL('（籃子裡是兩條黃魚，用草繩穿著。草繩上打了個結：漁民求親的結。）', '(In the basket, two yellow croakers on a grass cord. In the cord, a knot: the knot a fisherman ties when he asks for a girl.)'),
      chL('娘：他走以前跟你哥說了。你哥說：問她。', 'Your mother: He spoke to your brother before they sailed. Your brother said: ask her.'),
      chL('王嫂：結解開，就是答應了。結不動，就是不答應。', 'Sister Wang: Untie the knot and it\'s yes. Leave it tied and it\'s no.'),
      chL('（你在這個島上沒有房子，沒有地，沒有爹。你有一把鋸子，一個哥，和兩條魚。）', '(On this island you have no house, no land, no father. You have a saw, a brother, and two fish.)')],
    opts: [
      { q: 'Untie the knot.', led: 'Erniu untied the knot: she would marry Ma Liu.', a: [chL('（娘把魚接過去，說：晚上燒了吧。）', '(Your mother takes the fish and says: we\'ll cook them tonight.)'), chL('王嫂笑了，那是她男人沒回來以後第一次笑。', 'Sister Wang laughs: the first time since her husband didn\'t come back.')], fx: (C) => { chBond(C, 'ma', 2); C.S.flags.wed = 1; } },
      { q: 'Retie it looser: when the war is over.', led: 'Erniu told Ma Liu: when the war is over.', a: [chL('王嫂：鬆一點的結……他懂的。漁民都懂。', 'Sister Wang: A looser knot... he\'ll understand. Fishermen do.')], fx: (C) => { chBond(C, 'ma', 1); C.S.flags.wedLater = 1; } },
      { q: 'Leave the knot as it is.', led: 'Erniu left the knot tied: no.', a: [chL('（你把籃子放在門口，草繩沒動。）', '(You leave the basket at the door, the cord untouched.)'), chL('娘什麼也沒說。第二天早上，籃子不見了。', 'Your mother says nothing. In the morning the basket is gone.')], fx: (C) => { C.S.flags.wedNo = 1; } },
    ],
    go: 'Go to bed →' }),
  end: (C, o) => o === 0 ? (C.S.alive.ma ? 'They are married still.' : 'She was a widow before she was thirty.') : o === 1 ? 'The war was not over.' : 'He kept rowing your boat.',
};
// 三 · the lots (camp before the Anshan raid): who goes through the manor gate first
CHD.dj8lots = {
  build: (C) => ({ id: 'dj8lots', title: '籤 · The lots', ltitle: 'Who went first through the gate', year: 'In the hills above Anshan, 1626', who: ['陳壽 Sergeant Chen Shou', 'holding out a fist with ten straws in it'], hold: 1.2,
    lines: [chL('一根短的。抽到短的，明天第一個進門。', 'One short straw. Whoever draws it goes through the gate first tomorrow.'),
      chL('劉黑子：給我。我去。不用抽。', 'Liu Heizi: Give it here. I\'ll go. No need to draw.'),
      chL('胡三：……我認得那個門。我知道門後面站著誰。', 'Hu San: ...I know that gate. I know who stands behind it.'),
      chL('趙大看著你。他什麼也沒說，可你知道他想讓你說。', 'Zhao Da is looking at you. He says nothing, but you know he wants you to speak.')],
    opts: [
      { q: 'I\'ll go first. I lead the file.', led: 'Went first through the manor gate yourself.', a: [chL('陳壽把拳頭收回去，把稻草扔了。「好。」', 'Sergeant Chen closes his fist and throws the straws away. "Good."'), chL('趙大點了點頭。', 'Zhao Da nods.')], fx: (C) => { chBond(C, 'zhao', 2); chRep(C, 'valor', 2); C.S.flags.first = 'me'; } },
      { q: 'Let Liu Heizi go.', led: 'Let Liu Heizi go first, as he asked.', a: [chL('劉黑子咧嘴笑了。他好久沒笑了。', 'Liu Heizi grins. He hasn\'t smiled in a long time.')], fx: (C) => { chBond(C, 'liu', 2); C.S.flags.first = 'liu'; } },
      { q: 'Hu San knows the gate. Let him lead.', led: 'Sent Hu San first: he knew the gate.', a: [chL('胡三看了你很久。「謝謝。」', 'Hu San looks at you for a long time. "Thank you."'), chL('劉黑子啐了一口：「剃頭的。」', 'Liu Heizi spits. "Shaved-head."')], fx: (C) => { chBond(C, 'hu', 2); chBond(C, 'liu', -1); C.S.flags.first = 'hu'; } },
      { q: 'Draw. Everyone draws.', led: 'Made everyone draw lots.', a: [chL('（稻草一根一根抽出去。短的那根，在董貨郎手裡。他看著它，笑了一下。）', '(The straws go out one by one. The short one is in Dong the peddler\'s hand. He looks at it and gives a little laugh.)'), chL('董貨郎：做了三十年買賣，頭一回抽到頭彩。', 'Dong: Thirty years in trade, and the first time I\'ve drawn the prize.')], fx: (C) => { chBond(C, 'dong', 1); C.S.flags.first = 'dong'; } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => { const k = ['me', 'liu', 'hu', 'dong'][o]; return k === 'me' ? 'You went first.' : C.S.alive[k] ? `${({ liu: 'Liu Heizi', hu: 'Hu San', dong: 'Dong the peddler' })[k]} went first, and came out.` : `${({ liu: 'Liu Heizi', hu: 'Hu San', dong: 'Dong the peddler' })[k]} went first.`; },
};
// whoever went first through the gate takes the blow the manor fight gives the file
{ const _s = dStart; dStart = function (scene) { if (scene === 'b8') { const D = dLoad(); const f = D && D.flags && D.flags.first; if (f && f !== 'me') DCH[8].wounds = { 6: f }; } return _s(scene); }; }
