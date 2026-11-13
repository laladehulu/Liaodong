// ===================== 東江 · Act Five: the mutiny (1631–1633) =====================
// Chapters 14–18 of the East River campaign. At Wuqiao (the eleventh month of 1631) Kong Youde's unpaid column of East River men
// mutinied over a stolen chicken; the mutineers took Dengzhou and its Western guns, besieged Laizhou, were besieged in their turn,
// and in 1633 sailed to the Jin, whom they helped take Lüshun from Huang Long. The player chooses at Wuqiao: the a chapters
// (15–18) go with the mutiny, the b chapters (35–38) against it. (《明史》孔有德傳, 孫元化傳, 黃龍傳; 《崇禎長編》; 毛霖《平叛記》.)
DR.push(
  { k: 'lijc', zh: '李九成', en: 'Li Jiucheng', t: 'a captain in Kong Youde\'s column', guest: true },
  { k: 'teixeira', zh: '公沙的西勞', en: 'Gonçalo Teixeira', t: 'captain of the Portuguese gunners from Macao', guest: true },
  { k: 'huanglong', zh: '黃龍', en: 'Huang Long', t: 'Regional Commander of the East River', guest: true },
  { k: 'barber', zh: '剃頭匠', en: 'The barber', t: 'a Han bannerman of the Jin camp', guest: true },
);
Object.assign(DLOOK, {
  lijc: { h: 1.06, hat: 'wrap', wrap: 0x5a2a2a, brows: 'knit', beard: 'full', scar: true, bulk: true },
  teixeira: { h: 1.1, hat: 'felt', brows: 'thick', beard: 'full', bigNose: true, skin: 0xe8c8b0, hair: 0x5a3a24 },
  huanglong: { h: 1.02, hat: 'chief', brows: 'sad', beard: 'longmous', grey: true },
  barber: { h: 0.96, hat: 'shaved', brows: 'thin', beard: 'mous', apron: true },
});
const djMut = () => chGot(chCtx() || { S: DS }, 'dj14mutiny') === 0;
const djAway5 = ['erniu', 'zheng', 'sun'];

// ========== 第五幕 · 吳橋 · Act Five: the mutiny ==========
DCH[14] = {
  year: 1631, mission: 'dj14', act: '第五幕 · 吳橋 · Act Five: the mutiny', away: djAway5,
  intro: [
    { title: '第五幕 · 吳橋', year: 'Act Five · The mutiny · 1631', p: ['After Shuangdao the East River fell apart. Its command was split among Mao Wenlong\'s officers; the court cut its silver; the men who had called Mao "father" looked for someone else to feed them. Three of his adopted sons, Kong Youde, Geng Zhongming and Shang Kexi, took their companies across the sea to Dengzhou in Shandong, where the governor Sun Yuanhua, a Christian who had Portuguese gunners from Macao, was building the best artillery in the empire. Sergeant Chen\'s company went with Kong.',
      'In the autumn of 1631 the Jin besieged Dalinghe beyond the Wall. Sun Yuanhua ordered Kong Youde to march north with his East River men to relieve it. It was winter. The pay did not come.'], zh: '崇禎四年閏十一月，孔有德奉調援大凌河。' },
    { title: '你 · You', year: () => `You are ${dAge('me', 1631)}`, p: () => [`Ten years since Liaoyang. You lead your file now in Kong Youde\'s column, ${DS.alive.zhao ? 'with Zhao Da beside you, grey to the roots' : 'with Zhao Da ten years in your head'}. Your mother, Old Sun and Old Zheng stayed on Pidao${DS.alive.erniu ? ', with Erniu' : ''}.`, 'A month on the road north. The towns of Shandong shut their gates on the column and sell it nothing.'], btn: 'To the camp →' },
  ],
  camp: { map: 'sjvil', biome: 'night', fog: 0.35, at: [0, -96], title: '雪 · The road north', card: 'The column\'s camp in the snow outside Wuqiao, the night before it goes into the town. Talk to the file (E). When you are ready, lie down (E).',
    guests: ['lijc', 'kong'],
    chat: [['四十天沒發餉了。', 'Forty days without pay.'], ['那些縣城的門一看見我們就關。', 'Those county towns shut their gates as soon as they see us.'], ['遼東人，在山東就是外人。', 'Liaodong men are outsiders in Shandong.'], ['李九成在說些什麼？', 'What\'s Li Jiucheng going on about?'], ['大凌河那邊，聽說已經吃人了。', 'At Dalinghe they say they\'re already eating people.'], ['冷。', 'Cold.']] },
  dawn: { title: '吳橋 · Wuqiao', year: 'The eleventh month of 1631', p: ['In the morning the column goes into Wuqiao to billet, and the town does what every town has done: shuts its doors and gives you nothing. The biggest house in the town belongs to the family of a retired minister called Wang.'], btn: 'Into the town →' },
  battleCard: ['Wuqiao, 1631. You lead your file now: F follow me / H halt / C charge / Z form up where you look. Tonight you will have to choose.', '吳橋 · Wuqiao'],
  who: { file: ['孔有德', 'Kong Youde'], li: ['李九成', 'Li Jiucheng'], wang: ['', 'A Wang household man'], mut: ['', 'A mutineer'], town: ['', 'A townsman'] },
  order: ['zhao', 'kim', 'hu', 'ma', 'liu', 'qian', 'gou', 'feng', 'dong'],
  fateText: { out: 'came through the night at Wuqiao', dead: 'killed at Wuqiao', lost: 'lost in the night at Wuqiao' },
  resultTitle: '夜 · The night',
  after: (won, li, outN) => [
    { title: '吳橋 · What happened', year: 'The eleventh month of 1631', p: () => [djMut() ? 'Li Jiucheng\'s men burned the Wang family\'s house and broke open their barns, and Kong Youde, seeing that the column would follow Li and not him, put himself at its head. The mutineers turned back east across Shandong, taking and sacking town after town: Lingyi, Shanghe, Qidong, Xincheng.' : 'You got the column\'s loyal officers and a few hundred townspeople out of Wuqiao by the south road before dawn. Behind you Li Jiucheng\'s men burned the Wang family\'s house, and Kong Youde, seeing that the column would follow Li and not him, put himself at its head. The mutineers turned back east across Shandong, sacking the towns on the road.',
      'Sun Yuanhua, who believed Kong Youde could be talked back, ordered the towns ahead of them not to resist. It was a mistake that would cost him his head.'], zh: '吳橋兵變，孔有德、李九成反，回兵東向。' },
    { title: '你們 · Your people', year: () => djMut() ? 'You went with the mutiny' : 'You did not go with it', html: `<ul>${li}</ul>`, p: () => [djMut() ? 'Qian the Scholar walked away from the column in the dark with his notebooks. He said: someone has to write down what we are about to do. He did not say goodbye.' : 'Liu Heizi went with the mutiny. The last you saw of him he was running toward the Wang house with a torch, and he did not look back.'], btn: 'Dengzhou →' },
  ],
  next: () => djMut() ? 15 : 35,
  talk: (k) => ({
    zhao: { g: ['我五十了，鐵子。五十歲在雪地裡走路，骨頭會響。', 'I\'m fifty, Tie. Walk in the snow at fifty and your bones creak.'], t: [
      { q: 'Li Jiucheng is talking about mutiny.', bond: 1, a: [['我聽見了。', 'I heard.'], ['我在遼陽當兵的時候，見過一回兵變。萬曆四十二年。後來那些人，全砍了頭。', 'When I was a soldier in Liaoyang, I saw a mutiny once. The forty-second year of Wanli. Afterwards every man of them was beheaded.'], ['可那時候，至少朝廷還發餉。', 'But at least back then the court paid.']] }] },
    liu: { g: ['四十天，一兩銀子都沒見著。', 'Forty days and not one tael of silver.'], t: [
      { q: 'What are you thinking, Liu?', bond: 1, a: [['我在想，我給朝廷打了十年仗。朝廷給了我什麼？', 'I\'m thinking I\'ve fought ten years for the court. And what has the court given me?'], ['一件紅邊襖。一個空肚子。一個死在遼陽城頭上的哥。', 'A red-bordered coat. An empty belly. A brother dead on the wall at Liaoyang.']] },
      { q: 'Mutiny means the axe.', a: [['餓死也是死。', 'Starving is dying too.'], ['你跟不跟？我跟你說實話：你不跟，我也去。', 'Will you come? I\'ll tell you straight: if you don\'t, I\'m going anyway.']] }] },
    qian: { g: ['我在記：每個縣城是幾時關的門。', 'I\'m writing down what hour each county town shut its gate on us.'], t: [{ q: 'What will you do if they mutiny?', bond: 1, a: [['我不知道。', 'I don\'t know.'], ['我寫了十年謊話給總兵。現在我不想再寫了。不管是誰的。', 'I wrote lies for the general for ten years. I don\'t want to write any more. For anyone.']] }] },
    kim: { g: ['山東的冬天比朝鮮還冷。', 'Shandong winters are colder than Korea\'s.'], t: [{ q: 'You could go home to Korea.', bond: 1, a: [['朝鮮現在是金人的「弟弟」了。我回去，算什麼？', 'Korea is the Jin\'s "younger brother" now. What would I be if I went back?'], ['我跟著你。你去哪兒，我去哪兒。', 'I\'m with you. Wherever you go, I go.']] }] },
    hu: { g: ['旗下從來不欠餉。', 'The banners never owe pay.'], t: [{ q: 'Do you miss them?', bond: 1, a: [['不。', 'No.'], ['可我也不想替一個不給飯吃的皇上死。', 'But I don\'t want to die for an emperor who won\'t feed me, either.']] }] },
    ma: { g: () => [djWed() ? '我給你妹妹寫了信。秀才替我寫的。' : '我想我的船了。', djWed() ? 'I wrote to your sister. The scholar wrote it for me.' : 'I miss my boat.'], t: [{ q: 'What did you tell her?', bond: 1, a: [['說我很好。說快回去了。', 'That I\'m well. That I\'ll be back soon.'], ['兩句都是假的。', 'Both lies.']] }] },
    gou: { g: ['哥，我二十三了。李九成說，我們這樣的人，總得自己找條活路。', 'Brother, I\'m twenty-three. Li Jiucheng says men like us have to find our own way to live.'], t: [{ q: 'What do you think?', bond: 1, a: [['我不知道。我從小就是偷東西活下來的。', 'I don\'t know. I stayed alive stealing, when I was small.'], ['後來跟了你，我才不偷了。你要是說不，我就不。', 'Then I joined you, and I stopped. If you say no, it\'s no.']] }] },
    feng: { g: ['豬肉都凍成石頭了。', 'The pork has frozen to stone.'], t: [{ q: 'Will you go with them?', a: [['殺豬的跟著有肉的人走。', 'A butcher goes where the meat is.']] }] },
    dong: { g: ['我的攤子丟在皮島了。三個攤子。', 'I left my stalls on Pidao. Three stalls.'], t: [{ q: 'You\'ll go back to them.', bond: 1, a: [['做買賣的都知道：買賣有賺有賠。這一趟，賠到底了。', 'Every trader knows: some trips you make money, some you lose. This trip I\'m losing everything.']] }] },
    lijc: { g: ['你就是那個鐵匠的兒子？', 'You\'re the smith\'s son?'], t: [{ q: 'What are you planning?', bond: 1, a: [['我什麼也沒計劃。我只是說了大家心裡想的。', 'I\'m not planning anything. I only said what everyone is thinking.'], ['朝廷不要我們了。總兵死了。我們這些遼東人，在這兒誰也不要。', 'The court doesn\'t want us. The general is dead. Nobody here wants us Liaodong men.'], ['那就只好自己要自己。', 'So we\'ll have to want ourselves.']] }] },
    kong: { g: ['……', '...'], t: [{ q: 'Captain, the men are talking.', bond: 1, a: [['我知道。', 'I know.'], ['我乾爹在的時候，他說話，大家就聽。現在我說話……大家先看李九成。', 'When my adoptive father was alive, he spoke and everyone listened. Now when I speak... they look at Li Jiucheng first.']] }] },
  })[k],
};

// ----- the mutiny branch (a) -----
DCH[15] = {
  year: 1632, mission: 'dj15', away: djAway5,
  intro: [
    { title: '登州 · Dengzhou', year: 'The first month of 1632', p: ['The mutineers came back across Shandong burning as they went, and Sun Yuanhua, who still believed he could talk them home, told the towns not to fight. At Dengzhou he let them camp under his walls. Inside, Geng Zhongming and the East River men of the garrison had already made up their minds.',
      'You are with Kong Youde\'s column outside the south gate. It is the third night of the new year, and very cold.'], zh: '崇禎五年正月，孔有德陷登州。' },
  ],
  camp: null,
  battleCard: ['Dengzhou, 1632. With the mutiny. Through the gate Geng Zhongming opens, take the arsenal and its guns, and take the governor alive.', '登州 · Dengzhou'],
  who: { file: ['孔有德', 'Kong Youde'], li: ['李九成', 'Li Jiucheng'], geng: ['耿仲明', 'Geng Zhongming'] },
  order: ['zhao', 'kim', 'hu', 'liu', 'ma', 'gou', 'feng', 'dong'], wounds: { 4: 'feng' },
  fateText: { out: 'took Dengzhou', dead: 'killed in Dengzhou', lost: 'left in the streets of Dengzhou' },
  after: (won, li, outN) => [
    { title: '登州 · What happened', year: 'The first month of 1632', p: ['The mutineers had Dengzhou, twenty Western cannon, the gunners who knew how to fire them, and the ships in the water city. Sun Yuanhua was set free (Kong Youde had served under him) and sent to Beijing, where the Emperor had him beheaded. Twelve of the Portuguese gunners died in the fighting, among them their captain, Gonçalo Teixeira.',
      'Kong Youde called himself Regional Commander and the whole east of Shandong rose or fled. Then he turned west, toward Laizhou.'], zh: '登州陷，孫元化被執，西洋砲盡為所有。' },
    { title: '你們 · Your people', year: `${outN} came through`, html: `<ul>${li}</ul>`, btn: 'Laizhou →' },
  ],
  next: 16,
};
DCH[16] = {
  year: 1632, mission: 'dj16', away: djAway5,
  intro: [{ title: '萊州 · Laizhou', year: 'The second to the fourth month of 1632', p: ['Laizhou had a few hundred soldiers, its townsmen, and a magistrate called Zhu Wanniang who would not open the gates. The mutineers brought the Dengzhou guns up to its walls and began the siege.'], zh: '叛軍圍萊州。' }],
  camp: { map: 'siegecity', biome: 'night', fog: 0.3, at: [-24, -112], noTents: true, title: '圍 · The siege lines', card: 'The mutineers\' siege lines before Laizhou, the night before the assault. Talk to the file (E). When you are ready, lie down (E).',
    guests: ['lijc'],
    chat: [['城上的人在唱歌。', 'They\'re singing on the walls.'], ['砲彈不夠了。', 'We\'re running short of shot.'], ['昨天又跑了二十個。', 'Twenty more deserted yesterday.'], ['朝廷的兵從西邊來了。', 'The court\'s troops are coming from the west.'], ['萊州人說我們是賊。', 'The Laizhou people call us bandits.']] },
  dawn: { title: '攻城 · The assault', year: 'Dawn', p: ['The guns fire at first light. Then the drums, and the shield carts start forward.'], btn: 'Forward →' },
  battleCard: ['Laizhou, 1632. With the mutiny, from the siege lines. Advance behind the carts and take the walls.', '萊州 · Laizhou'],
  who: { file: ['李九成', 'Li Jiucheng'], zhu: ['朱萬年', 'Magistrate Zhu Wanniang'] },
  order: ['zhao', 'kim', 'hu', 'liu', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'came back from the walls of Laizhou', dead: 'killed under the walls of Laizhou', lost: 'left in the ditch at Laizhou' },
  after: (won, li, outN) => [
    { title: '萊州 · What happened', year: 'Summer 1632', p: ['Laizhou never fell. When the assaults failed the mutineers lured Magistrate Zhu Wanniang out under a flag of truce and killed him in front of the walls; the town still held. In the summer the court\'s armies came up from the west, the Guanning cavalry with them, and broke the siege lines. Li Jiucheng was killed. The mutineers fell back on Dengzhou, and the court\'s army followed and sat down outside its walls.'], zh: '萊州圍解。李九成戰死，叛軍退保登州。' },
    { title: '你們 · Your people', year: `${outN} came back`, html: `<ul>${li}</ul>`, btn: 'A year in Dengzhou →' },
  ],
  next: 17,
  talk: (k) => ({
    zhao: { g: ['這城裡的人，跟遼陽那晚的我們一樣。', 'The people in that town are like us, the night Liaoyang fell.'], t: [{ q: 'We are the banners now.', bond: 1, a: [['……是。', '...Yes.'], ['我活了五十年，從沒想到。', 'Fifty years I\'ve lived, and I never thought it.']] }] },
    liu: { g: ['我們有砲了！西洋砲！', 'We have guns now! Western guns!'], t: [{ q: 'And what will you do with Laizhou?', bond: 1, a: [['拿下來。吃飽。然後……再說。', 'Take it. Eat. And then... we\'ll see.'], ['你別這麼看我，鐵子。是你自己跟來的。', 'Don\'t look at me like that, Tie. You came of your own accord.']] }] },
    kim: { g: ['我寫了信給朝鮮的表哥。沒有寫我在哪兒。', 'I wrote to my cousin in Korea. I didn\'t write where I am.'], t: [{ q: 'Ashamed?', bond: 1, a: [['我在龍骨山城守過城。現在我在攻城。', 'I held the walls at Yonggol. Now I\'m attacking them.'], ['我不知道這是什麼。我只知道，這不是義兵。', 'I don\'t know what this is. I only know it isn\'t a righteous army.']] }] },
    hu: { g: ['旗兵打撫順的時候，城上的人也是這樣喊的。', 'When the banners took Fushun, the people on the walls shouted like that too.'], t: [{ q: 'What do you want, Hu San?', bond: 1, a: [['我想不當任何人的牛。', 'Not to be anyone\'s ox.'], ['可現在，我好像是自己的牛了。這也不怎麼好。', 'But now I seem to be my own ox. That\'s not much better.']] }] },
    ma: { g: ['萊州的海我認得。我小時候來過。', 'I know the sea at Laizhou. I came here when I was small.'], t: [{ q: 'With your father?', bond: 1, a: [['跟我舅舅。賣魚。城裡的人買了我們的魚，還給我一塊糖。', 'With my uncle. Selling fish. A townsman bought our fish and gave me a sweet.'], ['現在我在打那座城。', 'Now I\'m attacking his town.']] }] },
    gou: { g: ['哥，那些人是開鋪子的。他們不是兵。', 'Brother, those people keep shops. They\'re not soldiers.'], t: [{ q: 'I know.', bond: 1, a: [['那我們為什麼要打他們？', 'Then why are we fighting them?'], ['……我不問了。你不用回答。', '...I\'ll stop asking. You don\'t have to answer.']] }] },
    feng: { g: ['萊州城裡有三個肉鋪。我數過。', 'There are three butcher\'s shops in Laizhou. I counted.'], t: [{ q: 'Is that why you\'re here?', a: [['我在這兒，是因為我沒有別的地方。', 'I\'m here because I\'ve nowhere else.']] }] },
    dong: { g: ['我在營裡賣東西。賣搶來的東西。', 'I\'m selling things in the camp. Looted things.'], t: [{ q: 'Does it trouble you?', bond: 1, a: [['我做了一輩子買賣，從沒賣過贓物。', 'I\'ve traded all my life and never sold stolen goods.'], ['現在我什麼都賣。連我自己。', 'Now I sell anything. Even myself.']] }] },
    lijc: { g: ['明天，萊州就是我們的。', 'Tomorrow Laizhou is ours.'], t: [{ q: 'And after Laizhou?', bond: 1, a: [['山東是我們的。然後……也許朝廷會招安我們。給我們官做，給我們餉。', 'Shandong is ours. And then... maybe the court will offer us a pardon. Give us posts, pay.'], ['那時候，你就知道我是對的了。', 'Then you\'ll know I was right.']] }] },
  })[k],
};
DCH[17] = {
  year: 1633, mission: 'dj17', away: djAway5,
  intro: [{ title: '一年 · A year', year: 'The second month of 1633', p: ['A year besieged in Dengzhou. The court\'s army under Zhu Dadian built a wall round the city on the land side; the mutineers had the sea. They ate the grain, then the horses, then the leather of the saddles. Kong Youde sent letters to Hong Taiji.',
    'In the second month of 1633 the Khan\'s answer came: come north with your guns and your ships, and you will be princes.'], zh: '叛軍困守登州一年。孔有德通款於後金。' }],
  camp: null,
  battleCard: ['Dengzhou, 1633. Get the guns and your file to the ships in the water gate before the city falls.', '登州 · The breakout'],
  who: { file: ['孔有德', 'Kong Youde'], geng: ['耿仲明', 'Geng Zhongming'] },
  order: ['zhao', 'kim', 'hu', 'liu', 'ma', 'gou', 'feng', 'dong'], wounds: { 5: 'dong' },
  fateText: { out: 'sailed north from Dengzhou', dead: 'killed in Dengzhou', lost: 'left behind in Dengzhou' },
  after: (won, li, outN) => [
    { title: '登州 · What happened', year: 'The second month of 1633', p: ['Kong Youde and Geng Zhongming sailed north with more than a hundred ships, twelve thousand people, and the Western guns. The court\'s troops took Dengzhou and beheaded the mutineers they found in it. In the fourth month Hong Taiji came out of Mukden to meet Kong and Geng in person, embraced them in the Jurchen way, and gave them titles, banners of their own, and land.',
      'The East River men who had sailed north with them were given a choice of a sort: shave the head and grow the queue, or go back to the sea.'], zh: '孔有德、耿仲明航海降後金，皇太極郊迎。' },
    { title: '你們 · Your people', year: `${outN} sailed north`, html: `<ul>${li}</ul>`, btn: 'North →' },
  ],
  next: 18,
};
DCH[18] = {
  year: 1633, mission: 'dj18', away: djAway5,
  intro: [{ title: '天聰 · The Khan\'s men', year: 'The seventh month of 1633', p: ['Hong Taiji\'s first order to his new princes: Lüshun, at the tip of the Liaodong peninsula, still held by Huang Long for the Ming, the last great East River fort on the mainland. Kong Youde\'s ships would come by sea with the Dengzhou guns; the Jin would come by land.'], zh: '天聰七年七月，孔、耿從征旅順。' }],
  camp: { map: 'djlushun', biome: 'night', fog: 0.25, at: [-30, 104], noTents: true, title: '金營 · The Jin camp', card: 'The Jin camp on the road north of Lüshun, the night before the assault. A barber is going round the East River men with his razor. Talk (E). When you are ready, lie down (E).',
    guests: ['barber', 'kong'], choice: 'dj18shave',
    chat: [['剃刀很快。', 'The razor\'s sharp.'], ['旗兵看我們的眼神，跟看狗一樣。', 'The bannermen look at us like dogs.'], ['明天打的，是黃龍。我在皮島見過他。', 'Tomorrow it\'s Huang Long. I saw him on Pidao.'], ['汗給了孔將軍一面自己的旗。', 'The Khan gave General Kong a banner of his own.'], ['冷不冷？頭上沒頭髮了。', 'Cold? With no hair on your head.']] },
  dawn: { title: '旅順 · Lüshun', year: 'Dawn', p: ['From the ridge you can see the ships in the anchorage, Kong Youde\'s ships, and the smoke going up from the Dengzhou guns. On the land road the Jin banners are already moving.'], btn: 'Forward →' },
  battleCard: ['Lüshun, 1633. With Kong Youde and the Jin. Take the north gate, Huang Long\'s yamen, and the harbour stair.', '旅順 · Lüshun'],
  who: { file: ['孔有德', 'Kong Youde'], jin: ['', 'A bannerman'], huang: ['黃龍', 'Huang Long'] },
  order: ['zhao', 'kim', 'hu', 'liu', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'came through Lüshun', dead: 'killed at Lüshun', lost: 'left at Lüshun' },
  after: (won, li, outN) => [
    { title: '旅順 · What happened', year: 'The seventh month of 1633', p: ['Lüshun fell in a day and a night. Huang Long cut his own throat; his men died at the harbour or threw themselves into the sea. The Jin, who had never had a navy, now had a port on the open sea and the ships and gunners to use it, and the Ming held nothing on the Liaodong mainland beyond the Great Wall but a few forts.',
      'A year later Shang Kexi, the third of Mao Wenlong\'s adopted sons, came over to the Jin from Guanglu island with his own men. The three of them would be called the Three Feudatories one day, and they would conquer the south of China for the Qing.'], zh: '旅順陷，黃龍自刎。明年，尚可喜降。' },
    { title: '你們 · Your people', year: `${outN} came through`, html: `<ul>${li}</ul>`, btn: 'End of the fifth act →' },
  ],
  next: 19,
  talk: (k) => ({
    zhao: { g: () => [DS.flags.shaved ? '（他摸著自己剃過的頭。）五十二年，我沒想到。' : '他們也要剃我的頭。', DS.flags.shaved ? '(He touches his shaved head.) Fifty-two years, and I never imagined.' : 'They mean to shave my head too.'], t: [{ q: 'You could go back to the sea.', bond: 1, a: [['回哪兒？皮島？皮島的人會把我們扔進海裡。', 'Back where? Pidao? On Pidao they\'d throw us into the sea.'], ['我老了，鐵子。老人只能跟著走。', 'I\'m old, Tie. Old men just follow.']] }] },
    liu: { g: ['汗說了，我們是自己人。', 'The Khan says we\'re his own people.'], t: [{ q: 'Do you believe him?', bond: 1, a: [['他給飯吃。朝廷不給。', 'He feeds us. The court didn\'t.'], ['我哥死在金人手裡。我知道。你不用提醒我。我每天都知道。', 'My brother died at Jin hands. I know. You don\'t need to remind me. I know it every day.']] }] },
    kim: { g: ['我要走了，鐵子。', 'I\'m leaving, Tie.'], t: [{ q: 'Where?', bond: 1, flag: 'kimLeaves', a: [['回朝鮮。我不能替金人打明朝。我不能替打朝鮮的人打仗。', 'Back to Korea. I can\'t fight the Ming for the Jin. I can\'t fight for the men who invaded Korea.'], ['你保重。', 'Take care of yourself.'], ['（天亮以前，他的鋪蓋已經空了。）', '(Before dawn his bedroll is empty.)']] }] },
    hu: { g: ['（他第三次剃了頭。）', '(He has shaved his head for the third time.)'], t: [{ q: 'Again.', bond: 1, a: [['頭髮長了又剃，剃了又長。我這顆頭，比我還倔。', 'It grows, I shave it; I shave it, it grows. This head of mine is more stubborn than I am.'], ['在旗下活著，總比在海裡死了強。我告訴自己。每次都這麼告訴自己。', 'Alive under the banners beats dead in the sea. I tell myself that. Every time.']] }] },
    ma: { g: () => [djWed() ? '你妹妹……還在皮島。' : '皮島還是明朝的。', djWed() ? 'Your sister... she\'s still on Pidao.' : 'Pidao is still Ming.'], t: [{ q: 'You could go back.', bond: 1, a: [['我要是回去，他們會殺了我。我要是不回去……', 'If I go back they\'ll kill me. If I don\'t...'], ['我不知道哪一個更糟。', 'I don\'t know which is worse.']] }] },
    gou: { g: ['哥，我剃了。不疼。', 'Brother, I\'ve shaved it. It didn\'t hurt.'], t: [{ q: 'It doesn\'t look like you.', bond: 1, a: [['我小時候在遼陽，頭髮也是剃的。長虱子。', 'When I was small in Liaoyang my head was shaved too. For lice.'], ['……這回不一樣。我知道。', '...It\'s not the same this time. I know.']] }] },
    feng: { g: ['旗兵的肉鋪只賣羊。我得重新學。', 'The bannermen\'s butchers only sell mutton. I\'ll have to learn again.'], t: [{ q: 'You\'ll learn.', a: [['殺羊跟殺豬差不多。殺人也是。', 'Mutton\'s much the same as pork. So are men.']] }] },
    dong: { g: ['我在想，我這輩子到底是賺了還是賠了。', 'I\'m wondering whether my life has made a profit or a loss.'], t: [{ q: 'And?', bond: 1, a: [['賠了。賠了一座城，一個國，一顆頭髮。', 'A loss. A city lost, a country, a head of hair.'], ['可我還活著。做買賣的都知道：只要本錢還在，就還有下一趟。', 'But I\'m alive. Every trader knows: while there\'s still capital, there\'s another trip.']] }] },
    barber: { g: ['坐下。別動。我剃了十年頭，從沒割破過人。', 'Sit. Keep still. Ten years I\'ve shaved heads and never cut a man.'], t: [{ q: 'Were you Ming once?', bond: 1, a: [['遼陽人。天命六年剃的。跟你一樣大的時候。', 'A Liaoyang man. Shaved in the sixth year of Tianming. When I was your age.'], ['剃了以後，頭三天睡不著。後來就好了。人什麼都習慣。', 'After it was done I couldn\'t sleep for three nights. Then I was fine. A man gets used to anything.']] }] },
    kong: { g: ['汗待我們很好。', 'The Khan treats us well.'], t: [{ q: 'Better than the court did.', bond: 1, a: [['朝廷殺了我乾爹，砍了孫巡撫的頭，一兩餉都不發。', 'The court killed my adoptive father, beheaded Governor Sun, and never paid a tael.'], ['汗出城三十里來接我。三十里。', 'The Khan rode thirty li out of his city to meet me. Thirty li.']] }] },
  })[k],
};

// ----- against the mutiny (b) -----
DCH[35] = {
  year: 1632, mission: 'dj35', away: djAway5,
  intro: [
    { title: '登州 · Dengzhou', year: 'The first month of 1632', p: ['You brought the loyal officers and the Wuqiao townspeople back to Dengzhou ahead of the mutiny, and Sun Yuanhua, who still believed he could talk Kong Youde home, posted your file to the arsenal with the Portuguese gunners from Macao. Their captain, Gonçalo Teixeira, has been in China for ten years and speaks Chinese like a Macao fishwife.',
      'The mutineers camped under the walls. Inside, Geng Zhongming and the East River men of the garrison had already made up their minds.'], zh: '崇禎五年正月，登州城中耿仲明為內應。' },
  ],
  camp: null,
  battleCard: ['Dengzhou, 1632. Against the mutiny. Hold the arsenal while the Portuguese spike the guns, then get them out through the water gate.', '登州 · Dengzhou'],
  who: { file: ['公沙的西勞', 'Gonçalo Teixeira'], guns: ['', 'A Portuguese gunner'], sun: ['孫元化', 'Sun Yuanhua'] },
  order: ['zhao', 'kim', 'hu', 'qian', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'got out of Dengzhou', dead: 'killed in Dengzhou', lost: 'left in Dengzhou' },
  after: (won, li, outN) => [
    { title: '登州 · What happened', year: 'The first month of 1632', p: ['Dengzhou fell to the mutiny that night. Gonçalo Teixeira and eleven of his gunners died defending the arsenal; the ones you brought out reached the Ming lines and were sent to Laizhou. Half the guns were spiked; the other half went to the mutineers.',
      'Sun Yuanhua was set free by Kong Youde, sent to Beijing, and beheaded by the Emperor for his weakness. In the arsenal he had built, the mutineers began drilling with his guns.'], zh: '登州陷。公沙的西勞等死之。' },
    { title: '你們 · Your people', year: `${outN} got out`, html: `<ul>${li}</ul>`, btn: 'Laizhou →' },
  ],
  next: 36,
};
DCH[36] = {
  year: 1632, mission: 'dj36', away: djAway5,
  intro: [{ title: '萊州 · Laizhou', year: 'The second to the fourth month of 1632', p: ['Laizhou had a few hundred soldiers, its townsmen, and a magistrate called Zhu Wanniang who would not open the gates. The mutineers came west from Dengzhou with the guns and sat down before its walls. Your file was one of the few companies of real soldiers inside.'], zh: '叛軍圍萊州。' }],
  camp: { map: 'siegecity', biome: 'night', fog: 0.3, at: [-6, 74], noTents: true, title: '城上 · On the wall', card: 'Inside Laizhou, under the west wall, the night before the assault. Talk to the file (E). Someone is calling your name from below the wall. When you are ready, lie down (E).',
    guests: [], choice: 'dj36liu',
    chat: [['城外的火光，一直到海邊。', 'Their fires stretch all the way to the sea.'], ['鹽工在挖地道。', 'The salt workers are digging.'], ['朱知縣說，城在人在。', 'Magistrate Zhu says: while the city stands, we stand.'], ['砲又響了。', 'The guns again.'], ['城下有人在喊話。', 'Someone\'s shouting from below the wall.']] },
  dawn: { title: '攻城 · The assault', year: 'Dawn', p: ['Their guns at first light, the Dengzhou guns. Then the drums, and the shield carts start forward across the field.'], btn: 'To the wall →' },
  battleCard: ['Laizhou, 1632. Against the mutiny, on the walls with the townsmen. Throw down the ladders and hold.', '萊州 · Laizhou'],
  who: { file: ['朱萬年', 'Magistrate Zhu Wanniang'] },
  order: ['zhao', 'kim', 'hu', 'qian', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'held Laizhou', dead: 'killed on the walls of Laizhou', lost: 'lost in the mines under Laizhou' },
  after: (won, li, outN) => [
    { title: '萊州 · What happened', year: 'Summer 1632', p: ['Laizhou held. When their assaults failed the mutineers lured Magistrate Zhu Wanniang out under a flag of truce and murdered him in front of the walls, and still the town held. In the summer the court\'s armies came up from the west with the Guanning cavalry and broke the siege; Li Jiucheng was killed. The mutineers fell back into Dengzhou.'], zh: '萊州圍解。' },
    { title: '你們 · Your people', year: `${outN} held the wall`, html: `<ul>${li}</ul>`, btn: 'A year later →' },
  ],
  next: 37,
  talk: (k) => ({
    zhao: { g: ['城下那些人，一個月前還跟我們一起走。', 'Those men below the wall were marching with us a month ago.'], t: [{ q: 'Do you regret it?', bond: 1, a: [['不。', 'No.'], ['可我五十年來第一次，看見城外的人比城裡的人更像我。', 'But for the first time in fifty years I can see that the men outside the walls are more like me than the men inside them.']] }] },
    qian: { g: ['我在記萊州的事。每一天。', 'I\'m writing down Laizhou. Every day.'], t: [{ q: 'The truth, this time?', bond: 1, a: [['這一回，沒人要我寫謊話。', 'This time no one wants lies from me.'], ['城裡的鹽工，昨天在地底下用鐵鍬殺了七個人。我寫下來了。', 'Yesterday the salt workers killed seven men underground with shovels. I wrote it down.']] }] },
    kim: { g: ['我守過龍骨山城。這座城也一樣。', 'I held Yonggol. This city\'s the same.'], t: [{ q: 'The same?', bond: 1, a: [['城裡是守家的人。城外是……不知道自己是什麼的人。', 'Inside are people guarding their homes. Outside are... people who don\'t know what they are.']] }] },
    hu: { g: ['城外那些人，我知道他們為什麼反。', 'I know why those men outside rebelled.'], t: [{ q: 'Why are you here, then?', bond: 1, a: [['因為我做過一回別人的牛。我不想讓萊州人也做。', 'Because I\'ve been someone\'s ox. I don\'t want the Laizhou people to be anyone\'s.']] }] },
    ma: { g: ['萊州的海，我小時候來過。', 'I came to the sea at Laizhou when I was small.'], t: [{ q: 'With your uncle?', bond: 1, a: [['賣魚。城裡的人買了我們的魚，還給了我一塊糖。', 'Selling fish. A townsman bought our fish and gave me a sweet.'], ['我在守他的城。這樣很好。', 'Now I\'m guarding his town. That\'s good.']] }] },
    gou: { g: ['哥，劉哥在城外。我看見他了。', 'Brother, Brother Liu is outside. I saw him.'], t: [{ q: 'I know.', bond: 1, a: [['他會攻上來嗎？', 'Will he come up the wall?'], ['……要是他上來了，我不知道我能不能下手。', '...If he does, I don\'t know if I could do it.']] }] },
    feng: { g: ['城裡的三個肉鋪都關了。肉都分給守城的人了。', 'All three butcher\'s shops in the town have shut. The meat\'s gone to the men on the walls.'], t: [{ q: 'Good.', a: [['殺豬的也知道什麼時候該白給。', 'Even a butcher knows when to give it away.']] }] },
    dong: { g: ['我把最後一包針給了城裡的女人。她們在縫沙袋。', 'I gave my last packet of needles to the town\'s women. They\'re sewing sandbags.'], t: [{ q: 'You\'ve given away everything.', bond: 1, a: [['做買賣做到這一步，不賠也賠了。', 'When trade comes to this, you lose whether you want to or not.'], ['不過，這一回賠得心甘情願。', 'But this time I\'m glad to lose.']] }] },
  })[k],
};
DCH[37] = {
  year: 1633, mission: 'dj37', away: djAway5,
  intro: [{ title: '一年 · A year', year: 'The second month of 1633', p: ['A year outside the walls of Dengzhou. The court\'s army under Zhu Dadian built a wall of its own round the city on the land side; the mutineers had the sea, and their ships came and went from the water city. Inside, they ate their grain, then their horses.',
    'In the second month of 1633 word came out of the city: Kong Youde was writing to the Khan. Zhu Dadian ordered the assault.'], zh: '崇禎六年二月，官軍克登州。' }],
  camp: null,
  battleCard: ['Dengzhou, 1633. Against the mutiny. Over the wall, through the streets, and take the water gate before the ships get out.', '登州 · The water gate'],
  who: { file: ['朱大典', 'Zhu Dadian'], storm: ['', 'A soldier of the storming party'], kong: ['孔有德', 'Kong Youde'], liu: ['劉黑子', 'Liu Heizi'] },
  order: ['zhao', 'kim', 'hu', 'qian', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'took the water gate', dead: 'killed in Dengzhou', lost: 'left in the streets of Dengzhou' },
  after: (won, li, outN) => [
    { title: '登州 · What happened', year: 'The second month of 1633', p: ['Dengzhou was retaken. The mutineers found inside were beheaded by the thousand. But Kong Youde and Geng Zhongming got out with a part of the fleet and the guns and sailed north to the Khan, who rode thirty li out of Mukden to meet them, embraced them, and gave them banners of their own.',
      'You heard later that Liu Heizi was on Kong Youde\'s ship.'], zh: '孔有德、耿仲明航海降後金。' },
    { title: '你們 · Your people', year: `${outN} came through`, html: `<ul>${li}</ul>`, btn: 'Lüshun →' },
  ],
  next: 38,
};
DCH[38] = {
  year: 1633, mission: 'dj38', away: djAway5,
  intro: [{ title: '黃龍 · Huang Long', year: 'The seventh month of 1633', p: ['After Dengzhou the court sent what was left of the loyal East River men to Lüshun, at the tip of the Liaodong peninsula, under Huang Long, who had held the East River together since Shuangdao. Lüshun was the last great Ming fort on the Liaodong mainland.',
    'In the seventh month Kong Youde\'s ships appeared in the anchorage, flying the Khan\'s banners and firing the Dengzhou guns. On the land road the Jin were coming.'], zh: '天聰七年七月，金兵與孔、耿水陸攻旅順。' }],
  camp: { map: 'djlushun', biome: 'night', fog: 0.25, at: [-12, -40], noTents: true, title: '旅順 · The last night', card: 'Inside Lüshun, the night before the assault. Huang Long is walking the walls. Talk (E). When you are ready, lie down (E).',
    guests: ['huanglong'], choice: 'dj38seal',
    chat: [['港裡是孔有德的船。', 'Those are Kong Youde\'s ships in the harbour.'], ['他們的砲是我們的砲。', 'Their guns are our guns.'], ['西灘還有幾條漁船。', 'There are still a few fishing boats on the west beach.'], ['黃總兵說他不走。', 'General Huang says he won\'t leave.'], ['皮島還在。', 'Pidao\'s still holding.']] },
  dawn: { title: '旅順 · Lüshun', year: 'Dawn', p: ['The guns start at first light from the anchorage. From the north gate you can see the Jin banners on the land road, coming on in no hurry.'], btn: 'To the gate →' },
  battleCard: ['Lüshun, 1633. Against the turncoats and the Jin. Hold the north gate, then the harbour stair, then the yamen with Huang Long.', '旅順 · Lüshun'],
  who: { file: ['黃龍', 'Huang Long'], gar: ['', 'A man of the garrison'], k1: ['', 'One of Kong Youde\'s men'] },
  order: ['zhao', 'kim', 'hu', 'qian', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'got away from Lüshun', dead: 'killed at Lüshun', lost: 'left at Lüshun' },
  resultTitle: '陷 · Lüshun falls',
  after: (won, li, outN) => [
    { title: '旅順 · What happened', year: 'The seventh month of 1633', p: ['Lüshun fell in a day and a night. Huang Long cut his own throat in his yamen as the banners came in; his men died at the harbour stair or threw themselves into the sea. A few boats got away from the west beach. Yours was one.',
      'The Jin had a port on the open sea, and the ships and gunners to use it. The men who gave it to them had been East River men. A year later Shang Kexi, the third of Mao Wenlong\'s adopted sons, went over to them too.'], zh: '旅順陷，黃龍自刎。' },
    { title: '你們 · Your people', year: `${outN} got away`, html: `<ul>${li}</ul>`, p: () => [chGot(chCtx() || { S: DS }, 'dj38seal') === 0 ? 'Huang Long\'s seal and his last letter are in your coat. You will take them to Pidao.' : 'You went down to the boats without Huang Long\'s seal. Someone else carried it, or no one did.'], btn: 'End of the fifth act →' },
  ],
  next: 39,
  talk: (k) => ({
    zhao: { g: ['港裡那些船，帆上的補丁我都認得。', 'Those ships in the harbour: I know the patches on their sails.'], t: [{ q: 'Our ships.', bond: 1, a: [['我們的船，我們的砲，我們的人。', 'Our ships, our guns, our men.'], ['四十年前，我第一次穿上號衣的時候，想的是守住遼東。現在連遼東的尖都要沒了。', 'Forty years ago when I first put on the uniform, I meant to hold Liaodong. Now even its tip is going.']] }] },
    qian: { g: ['我記了萊州。我也會記旅順。', 'I wrote Laizhou. I\'ll write Lüshun too.'], t: [{ q: 'Who will read it?', bond: 1, a: [['也許沒人。也許一百年以後。', 'Maybe no one. Maybe in a hundred years.'], ['你記得嗎？在靉河邊上，我也這麼說過。', 'Do you remember? By the Ai river, I said the same.']] }] },
    kim: { g: ['朝鮮還在。皮島還在。', 'Korea\'s still there. Pidao\'s still there.'], t: [{ q: 'And after Lüshun?', bond: 1, a: [['我們回皮島。皮島沒了，我們去朝鮮。朝鮮沒了……', 'We go back to Pidao. If Pidao goes, we go to Korea. If Korea goes...'], ['那時候再說。', 'Then we\'ll see.']] }] },
    hu: { g: ['孔有德的人裡，有一半剃了頭。', 'Half of Kong Youde\'s men have shaved their heads.'], t: [{ q: 'You know what that feels like.', bond: 1, a: [['我知道。', 'I do.'], ['頭三天，你每次摸頭，都會想起你是什麼人。後來你就不摸了。', 'For three days, every time you touch your head you remember what you are. Then you stop touching it.']] }] },
    ma: { g: ['西灘的漁船，我看過了。能走。', 'I\'ve looked at the fishing boats on the west beach. They\'ll go.'], t: [{ q: 'Keep one for the wounded.', bond: 1, a: [['我留兩條。一條給傷兵，一條給你。', 'I\'ll keep two. One for the wounded, one for you.']] }] },
    gou: { g: ['哥，劉哥在那些船上。', 'Brother, Brother Liu is on those ships.'], t: [{ q: 'I know.', bond: 1, a: [['明天他要是爬上來……', 'If he comes up tomorrow...'], ['我會叫他的名字。叫一聲。然後……', 'I\'ll call his name. Once. And then...']] }] },
    feng: { g: ['旅順沒有豬。只有魚。', 'No pigs in Lüshun. Only fish.'], t: [{ q: 'You\'re always on about pigs.', a: [['想點別的，就想到明天了。', 'If I think about anything else, I think about tomorrow.']] }] },
    dong: { g: ['我把攤子上剩下的東西都分了。', 'I\'ve given away what was left on my stall.'], t: [{ q: 'All of it?', bond: 1, a: [['一根針都沒留。做買賣的，臨走總要結清賬。', 'Not a needle left. A trader always settles his accounts before he goes.']] }] },
    huanglong: { g: ['你們是從萊州來的？好。萊州守住了。', 'You came from Laizhou? Good. Laizhou held.'], t: [{ q: 'Will Lüshun hold, sir?', bond: 1, a: [['不會。', 'No.'], ['可是它會守到他們付出代價。守到皇上知道，東江還有人。', 'But it will hold until they pay for it. Until the Emperor knows there were still East River men.']] }] },
  })[k],
};

// ---------- the choices of Act Five ----------
// 一 · the night at Wuqiao: the fork of the campaign (a full stop in the middle of the battle)
CHBT.dj14 = [{ ph: 2, t: 9, id: 'dj14mutiny', cid: 1, when: () => ZB && ZB.dj && chGot(chCtx(), 'dj14mutiny') < 0 }];
CHD.dj14mutiny = {
  build: (C) => ({ id: 'dj14mutiny', title: '吳橋 · Wuqiao', ltitle: 'The night at Wuqiao', year: 'Wuqiao, the eleventh month of 1631', who: ['劉黑子 Liu Heizi', 'with a torch, at the end of the street'], hold: 1.4,
    lines: [chL('（鼓聲從不該響的地方響起來。街那頭，李九成的人在砸王家的門。）', '(Drums from where no drums should be. At the end of the street Li Jiucheng\'s men are battering at the Wang family\'s gate.)'),
      chL('劉黑子：十年了，鐵子！十年，朝廷給了我們什麼？走！', 'Liu Heizi: Ten years, Tie! Ten years, and what has the court given us? Come on!'),
      chL('錢秀才：跟他們去，就是造反。造反的人，九族都要殺。', 'Qian: Go with them and it\'s rebellion. For rebellion they kill your family to the ninth degree.'),
      chL('（王家的門後面，有女人在哭。街的另一頭，幾個不肯反的軍官被人圍住了，還有半條街的百姓。）', '(Behind the Wang gate, women are crying. At the other end of the street a few officers who would not join are surrounded, with half a street of townspeople.)')],
    opts: [
      { q: 'Go with the mutiny.', led: 'Went with the mutiny at Wuqiao.', a: [chL('劉黑子大笑，把火把塞進你手裡。', 'Liu Heizi laughs and pushes the torch into your hand.'), chL('錢秀才轉過身，走進了黑暗。', 'Qian turns away and walks into the dark.')], fx: (C) => { chBond(C, 'liu', 2); djLoseIn(C, 'qian', 'gone', 'dj14mutiny', 14); C.S.flags.mutiny = 1; } },
      { q: 'Get the officers and the townspeople out.', led: 'Refused the mutiny and got the loyal officers and the townspeople out of Wuqiao.', a: [chL('劉黑子看著你，看了很久。然後他啐了一口，跑向王家。', 'Liu Heizi stares at you for a long time. Then he spits and runs for the Wang house.')], fx: (C) => { chBond(C, 'qian', 2); djLoseIn(C, 'liu', 'gone', 'dj14mutiny', 14); C.S.flags.loyal = 1; } },
    ],
    go: '……' }),
  end: (C, o) => o === 0 ? 'You went with the mutiny, and everything that followed.' : 'You did not go with it. Liu Heizi did.',
};
// 二 · Liu Heizi at the foot of the wall (Laizhou, against the mutiny)
CHD.dj36liu = {
  build: (C) => ({ id: 'dj36liu', title: '城下 · Under the wall', ltitle: 'Liu Heizi under the walls of Laizhou', year: 'Laizhou, 1632', who: ['劉黑子 Liu Heizi', 'a voice in the dark below the west wall'], hold: 1.2,
    lines: [chL('鐵子！李鐵！是我！', 'Tie! Li Tie! It\'s me!'),
      chL('下來吧！孔將軍說了，下來的人，既往不咎。城裡的人吃什麼？你們撐不了一個月！', 'Come down! General Kong says anyone who comes down is forgiven. What are they eating in there? You won\'t last a month!'),
      chL('（城上的人都在看你。有人已經把火繩湊到了火門上。）', '(Everyone on the wall is looking at you. Someone has already brought his match down to the touch-hole.)')],
    opts: [
      { q: 'Answer him: go home, Liu.', led: 'Called down to Liu Heizi: go home.', a: [chL('你：劉黑子！回去吧！回去告訴孔有德：萊州人不下城。', 'You: Liu Heizi! Go back! Go back and tell Kong Youde the Laizhou people aren\'t coming down.'), chL('（很久以後，城下有人說：……你保重。）', '(A long while later, from below: ...Take care of yourself.)')], fx: (C) => { chBond(C, 'liu', 1); } },
      { q: 'Say nothing.', led: 'Said nothing to Liu Heizi under the wall.', a: [chL('（城下又喊了幾聲，然後沒聲音了。）', '(He shouts a few more times from below, and then nothing.)')], fx: (C) => { } },
      { q: 'Let the musketeer fire.', led: 'Let the musketeer fire at the voice below the wall.', a: [chL('（槍響了。城下有人罵了一句，跑遠了。不知道打中沒有。）', '(The shot goes off. Below, someone curses and runs. You don\'t know if he was hit.)')], fx: (C) => { chBond(C, 'liu', -2); chRep(C, 'disc', 1); C.S.flags.shotLiu = 1; } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'You told him to go home.' : o === 1 ? 'You said nothing.' : 'You let the musketeer fire at him.',
};
// 三 · the razor (the Jin camp before Lüshun, with the mutiny)
CHD.dj18shave = {
  build: (C) => ({ id: 'dj18shave', title: '剃刀 · The razor', ltitle: 'The razor in the Jin camp', year: 'North of Lüshun, 1633', who: ['剃頭匠 The barber', 'with his razor and his bowl of water'], hold: 1.2,
    lines: [chL('坐下吧。汗的規矩：歸順的人，剃頭留辮。', 'Sit. The Khan\'s rule: those who come over shave the head and grow the queue.'),
      chL('（你的人都已經剃了，或者正在剃。只有你還沒有。）', '(Your men have all been shaved, or are being shaved. Only you have not.)'),
      chL('孔有德：剃吧。剃了，我們就是汗的人。不剃，明天旗兵會把你當成黃龍的人。', 'Kong Youde: Shave it. Once it\'s done we\'re the Khan\'s men. If you don\'t, tomorrow the bannermen will take you for one of Huang Long\'s.')],
    opts: [
      { q: 'Sit down. Let him shave it.', led: 'Had your head shaved in the Jin camp.', a: [chL('（剃刀很涼。頭髮落在雪裡。）', '(The razor is cold. The hair falls in the snow.)')], fx: (C) => { C.S.flags.shaved = 1; } },
      { q: 'Shave it yourself.', led: 'Shaved your own head in the Jin camp.', a: [chL('（你從他手裡拿過剃刀。他看了你一眼，沒說話。）', '(You take the razor out of his hand. He gives you a look and says nothing.)'), chL('剃頭匠：自己剃的，比較不疼。', 'The barber: It hurts less when you do it yourself.')], fx: (C) => { C.S.flags.shaved = 1; C.S.flags.shavedSelf = 1; } },
      { q: 'Refuse.', led: 'Refused to shave your head in the Jin camp.', a: [chL('孔有德嘆了口氣：明天你站在後面。打完了再說。', 'Kong Youde sighs: Tomorrow you stand at the back. We\'ll talk about it afterwards.'), chL('（第二天晚上，他讓人按著你剃了。）', '(The next night he had you held down and shaved.)')], fx: (C) => { C.S.flags.shaved = 1; C.S.flags.shavedForced = 1; chRep(C, 'valor', 1); } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'The barber shaved it.' : o === 1 ? 'You shaved it yourself.' : 'They held you down and shaved it.',
};
// 四 · Huang Long's seal (Lüshun's last night, against the mutiny)
CHD.dj38seal = {
  build: (C) => ({ id: 'dj38seal', title: '印 · The seal', ltitle: 'Huang Long\'s seal', year: 'Lüshun, the seventh month of 1633', who: ['黃龍 Huang Long', 'with a seal wrapped in yellow silk'], hold: 1.2,
    lines: [chL('明天城破了，我不走。', 'When the city falls tomorrow, I am not leaving.'),
      chL('（他把一塊黃綢包著的印放在你手裡，還有一封信。）', '(He puts a seal wrapped in yellow silk into your hand, and a letter.)'),
      chL('城破以後，你帶著它上西灘的船，送到皮島沈世魁那兒。告訴他：旅順守到了最後。', 'After the city falls, take this down to the boats on the west beach and get it to Shen Shikui on Pidao. Tell him Lüshun held to the end.')],
    opts: [
      { q: 'Take the seal.', led: 'Took Huang Long\'s seal to carry to Pidao.', a: [chL('黃龍點點頭，又去巡城了。', 'Huang Long nods and goes back to walking the wall.')], fx: (C) => { chBond(C, 'huanglong', 2); C.S.flags.seal = 1; } },
      { q: 'Give it to someone else. I stay with you.', led: 'Gave Huang Long\'s seal back and asked to stay with him.', a: [chL('黃龍：……你還年輕。', 'Huang Long: ...You are young.'), chL('他把印給了你的一個兵，什麼也沒再說。', 'He gives the seal to one of your men and says nothing more.')], fx: (C) => { chRep(C, 'valor', 2); C.S.flags.stayed = 1; } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'You carried Huang Long\'s seal to Pidao.' : 'You asked to stay with him, and he would not let you.',
};
// Kim Sun, asked where he is going in the Jin camp, is gone by morning
{ const _s = dStart; dStart = function (scene) { if (scene === 'b18' && DS && DS.flags && DS.flags.kimLeaves && DS.alive && DS.alive.kim) { djLoseIn({ c: 'dj', S: DS, save: dSave, R: DR }, 'kim', 'gone', 'dj18kim', 17); dSave(); } return _s(scene); }; }
