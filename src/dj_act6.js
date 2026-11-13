// ===================== 東江 · Act Six: 丙子 the end (1636–1637) and the epilogue =====================
// Chapters 19–21 of the East River campaign. In 1636 Hong Taiji proclaimed the Qing and Korea would not kneel; in the twelfth
// month his armies crossed the frozen Yalu, King Injo was shut in Namhan fortress, and the provincial armies that marched to
// relieve him were beaten one by one (Gwanggyo mountain, where Yangguli was killed, was the one they remembered). Injo came out
// and knelt at Samjeondo on the thirtieth day of the first month of 1637; three months later the Qing and the Korean ships they
// had forced to sail with them took Pidao, and the East River was finished. (《仁祖實錄》十五年; 《清太宗實錄》崇德二年;
// 《明史》沈世魁傳.) Chapter 19/20 follow the mutiny (a), 39/40 the men who would not go with it (b); 21 is the epilogue.
DR.push(
  { k: 'kcaptive', zh: '被擄的女子', en: 'A Korean captive', t: 'taken in the villages south of the Han', guest: true, woman: true },
  { k: 'kimjr', zh: '金俊龍', en: 'Kim Jun-ryong', t: 'Army Commander of Jeolla', guest: true },
  { k: 'shensk', zh: '沈世魁', en: 'Shen Shikui', t: 'the last commander of the East River', guest: true },
);
Object.assign(DLOOK, {
  kcaptive: { h: 0.92, hat: 'kerchief', brows: 'sad', coat: 0xe8e4da, skin: 0xd8b48e },
  kimjr: { h: 1.04, hat: 'chief', plume: 0x2a3a6a, brows: 'thick', beard: 'longmous', coat: 0x3a4a6a },
  shensk: { h: 1.0, hat: 'chief', brows: 'sad', beard: 'longmous', grey: true, bulk: true },
});
const djAway6 = ['erniu', 'zheng', 'sun'];
const djCh = (id) => chGot(chCtx() || { S: DS }, id);
const djWedded = () => djCh('dj6wed') === 0; /* Erniu married Ma Liu in 1624 and they have a son (alive or not now) */

// ========== 第六幕 · 丙子 · Act Six: the end ==========
// ----- 十九a · with the Qing -----
DCH[19] = {
  year: 1637, mission: 'dj19', act: '第六幕 · 丙子 · Act Six: the end', away: djAway6,
  intro: [
    { title: '第六幕 · 丙子', year: 'Act Six · The end · 1636–1637', p: ['In the fourth month of 1636 Hong Taiji gave up the title of Khan and made himself Emperor of a new dynasty, the Qing. The Korean envoys at the ceremony would not bow, and the King in Seoul would not call him Emperor.',
      'In the twelfth month the Qing armies crossed the frozen Yalu, a hundred and twenty thousand men. They were outside Seoul in a fortnight. King Injo fled to the mountain fortress of Namhan, south of the river, and the Qing shut him in. Kong Youde\'s Tianyou army marched with them, and you with it.'], zh: '崇德元年十二月，清兵再入朝鮮。丙子胡亂。' },
    { title: '你 · You', year: () => `You are ${dAge('me', 1637)}`, p: () => [`Three years a man of the Khan, now the Emperor. Your head is shaved and your queue is long enough to plait. ${DS.alive.zhao ? `Zhao Da is ${dAge('zhao', 1637)} and still marching.` : ''}`, DS.flags.kimLeaves ? 'Kim Sun went home to Korea before Lüshun. You have not heard from him since. Somewhere in this country, in this snow, he is on the other side.' : DS.alive.kim ? 'Kim Sun has not said a word since the column crossed the Yalu.' : '', 'Your mother, Erniu, Old Sun and Old Zheng are still on Pidao, which is still Ming. You have not seen them in five years.'].filter(Boolean), btn: 'To the camp →' },
  ],
  camp: { map: 'djgwang', biome: 'night', fog: 0.35, at: [0, 112], noTents: true, title: '營 · The Qing camp', card: 'The Qing camp on the valley road below Gwanggyo mountain, the night before the attack. The banners have brought their captives from the villages roped in lines. Talk (E). When you are ready, lie down (E).',
    guests: ['kcaptive', 'kong'], choice: 'dj19rope',
    chat: [['山上是全羅道的兵。', 'That\'s the Jeolla army up on the mountain.'], ['旗兵說，朝鮮王躲在南漢山城裡。', 'The bannermen say the Korean King is hiding in Namhan fortress.'], ['那些女人一晚上都在哭。', 'Those women have been crying all night.'], ['揚古利明天親自上山看。', 'Yangguli is going up to look at the mountain himself tomorrow.'], ['天佑兵，又是打頭陣。', 'The Tianyou army in front again.']] },
  dawn: { title: '光教山 · Gwanggyo mountain', year: 'The first month of 1637', p: ['In the morning the Tianyou army forms on the valley road. Above it the Korean stockade on the shoulder of the mountain, and their white coats against the snow.'], btn: 'Up the road →' },
  battleCard: ['Gwanggyo mountain, 1637. With the Qing. Up the valley road, take the stockade and the camp.', '光教山 · Gwanggyo mountain'],
  who: { file: ['孔有德', 'Kong Youde'] },
  order: ['zhao', 'kim', 'hu', 'liu', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'came down from Gwanggyo mountain', dead: 'killed on Gwanggyo mountain', lost: 'left in the snow on Gwanggyo mountain' },
  after: (won, li, outN) => [
    { title: '三田渡 · Samjeondo', year: 'The thirtieth day of the first month of 1637', p: ['Namhan held out for forty-seven days. Then the food ran out, and the news came that the Qing had taken Ganghwa island and the royal family on it. King Injo came down from the fortress in a plain blue coat, by the west gate, the gate for the dead, and at Samjeondo on the Han River he knelt before Hong Taiji, bowed three times and knocked his head on the ground nine times.',
      'Korea became a vassal of the Qing. The Crown Prince went to Mukden as a hostage. The banners went home with tens of thousands of Korean captives, some said hundreds of thousands, roped in lines.'], zh: '仁祖出城，三田渡受降。' },
    { title: '你們 · Your people', year: `${outN} came down`, html: `<ul>${li}</ul>`, p: () => [djCh('dj19rope') === 1 ? 'Nobody ever asked who cut the rope. The girl was not in the line in the morning.' : djCh('dj19rope') === 0 ? 'The girl in the line drank the water. You did not see her again.' : ''].filter(Boolean), btn: 'Pidao →' },
  ],
  next: 20,
  talk: (k) => ({
    zhao: { g: ['五十六了。這是我打的最後一仗，我知道。', 'Fifty-six. This is my last war. I know it.'], t: [{ q: 'How do you know?', bond: 1, a: [['因為我已經不知道我在替誰打了。', 'Because I no longer know who I\'m fighting for.'], ['在遼陽，我知道。在皮島，我知道。在這兒……', 'At Liaoyang I knew. On Pidao I knew. Here...'], ['我只知道你。我替你打。', 'I only know you. I fight for you.']] }] },
    kim: { g: ['……', '...'], t: [{ q: 'Kim. Talk to me.', bond: 1, a: [['那是我的國家。山上那些人，說的是我娘說的話。', 'That is my country. The men on that mountain speak the words my mother spoke.'], ['明天我不開槍。你可以叫人打我。我不開槍。', 'Tomorrow I won\'t fire. You can have me flogged. I won\'t fire.']] }] },
    hu: { g: ['第三回了。每一回，跟的人都不一樣。', 'The third time. Every time behind someone different.'], t: [{ q: 'Do you still count them?', bond: 1, a: [['我數的是頭髮。剃了三回，長了三回。', 'I count my hair. Three times shaved, three times grown.'], ['明天，又會有人剃頭。山上那些朝鮮人，以後也得剃。', 'Tomorrow someone else will be shaved. Those Koreans on the mountain will have to, one day.']] }] },
    liu: { g: ['我現在是把總了。你知道嗎？把總！', 'I\'m a captain now. Did you know? A captain!'], t: [{ q: 'You wanted this.', bond: 1, a: [['我要的是吃飽。我吃飽了。', 'I wanted to eat my fill. I eat my fill.'], ['……可我晚上還是會夢見吳橋。王家的那扇門。', '...But at night I still dream of Wuqiao. The Wang family\'s gate.']] }] },
    ma: { g: ['皮島就在北邊。坐船兩天。', 'Pidao is just to the north. Two days by boat.'], t: [{ q: 'They\'ll attack Pidao next.', bond: 1, a: djWedded() ? [['我知道。', 'I know.'], ['我想了五年，二妞和孩子。現在我要坐著汗的船回去，打我自己的家。', 'Five years I\'ve thought of Erniu and the boy. Now I\'m going back in the Khan\'s ships, to attack my own home.']] : [['我知道。', 'I know.'], ['我生在那片海邊。現在我要坐著汗的船回去，打我自己的家。', 'I was born on that shore. Now I\'m going back in the Khan\'s ships, to attack my own home.']] }] },
    gou: { g: ['哥，那些繩子上的女人……', 'Brother, the women on those ropes...'], t: [{ q: 'Don\'t look.', bond: 1, a: [['我小時候，在遼陽，我娘也是這樣被帶走的。', 'When I was small, in Liaoyang, my mother was taken like that.'], ['我從來沒跟你說過。', 'I never told you.']] }] },
    feng: { g: ['朝鮮的牛很瘦。', 'Korean cattle are thin.'], t: [{ q: 'Everything here is thin.', a: [['人也瘦。', 'The people too.']] }] },
    dong: { g: ['旗兵在賣搶來的朝鮮人。一個五兩。', 'The bannermen are selling the Korean captives. Five taels a head.'], t: [{ q: 'Will you buy?', bond: 1, a: [['我做了一輩子買賣。我不買人。', 'I\'ve traded all my life. I don\'t buy people.'], ['可是被買走的，總比被凍死的好。我不知道。我真的不知道。', 'But being bought is better than freezing to death. I don\'t know. I really don\'t know.']] }] },
    kcaptive: { g: ['（她用朝鮮話說了什麼。然後，用很生硬的漢話：）水。', '(She says something in Korean. Then, in halting Chinese:) Water.'], t: [{ q: 'Where are you from?', a: [['（她指了指南邊，又指了指自己的手腕上的繩子。她不再說話了。）', '(She points south, then at the rope round her wrists. She says nothing more.)']] }] },
    kong: { g: ['你看那座山。', 'Look at that mountain.'], t: [{ q: 'What about it?', bond: 1, a: [['我乾爹在的時候，朝鮮人藏著我們，餵著我們。', 'When my adoptive father was alive, the Koreans hid us and fed us.'], ['現在我們來打他們了。', 'Now we\'ve come to fight them.'], ['……天佑。哈。', '...Heaven-Aided. Ha.']] }] },
  })[k],
};

// ----- 十九b · with the Koreans -----
DCH[39] = {
  year: 1637, mission: 'dj39', act: '第六幕 · 丙子 · Act Six: the end', away: djAway6,
  intro: [
    { title: '第六幕 · 丙子', year: 'Act Six · The end · 1636–1637', p: ['In the fourth month of 1636 Hong Taiji gave up the title of Khan and made himself Emperor of a new dynasty, the Qing. The Korean envoys at the ceremony would not bow, and the King in Seoul would not call him Emperor.',
      'In the twelfth month the Qing armies crossed the frozen Yalu. King Injo fled to the mountain fortress of Namhan and the Qing shut him in. Shen Shikui, commander on Pidao since Huang Long died, had a few boats and a few hundred men to spare. He sent them to the Korean coast with letters for the relief armies, and your file with them, because Kim Sun spoke the language.'], zh: '崇德元年十二月，清兵再入朝鮮。' },
    { title: '你 · You', year: () => `You are ${dAge('me', 1637)}`, p: () => [`Your head is not shaved. ${DS.flags.seal ? 'You carried Huang Long\'s seal to Pidao, and Shen Shikui took it from you with both hands.' : ''}`, DS.alive.kim ? 'Kim Sun is home, after twenty years. He has not stopped talking since you landed.' : '', 'Your mother, Erniu, Old Sun and Old Zheng are on Pidao. You left them on the beach in the snow.'].filter(Boolean), btn: 'To the camp →' },
  ],
  camp: { map: 'djgwang', biome: 'night', fog: 0.35, at: [0, -56], noTents: true, title: '山上 · On the mountain', card: 'The Jeolla army\'s stockade on Gwanggyo mountain, the night before the Qing come up. The men have no rice left. Talk (E). When you are ready, lie down (E).',
    guests: ['kimjr'], choice: 'dj39rice',
    chat: [['南漢山城就在北邊四十里。', 'Namhan is forty li to the north.'], ['全羅道的兵沒有米了。', 'The Jeolla men have no rice left.'], ['他們在雪裡走了六百里。', 'They walked six hundred li in the snow.'], ['山下的火，是清兵的。', 'The fires down there are the Qing\'s.'], ['火藥只夠打一天。', 'There\'s powder for one day.']] },
  dawn: { title: '光教山 · Gwanggyo mountain', year: 'The first month of 1637', p: ['At first light there are banners on the valley road, coming up.'], btn: 'To the gate →' },
  battleCard: ['Gwanggyo mountain, 1637. With the Jeolla army. Hold the stockade, ambush the general from the crag, hold till dark, then down the mountain.', '光教山 · Gwanggyo mountain'],
  who: { file: ['金俊龍', 'Kim Jun-ryong'] },
  order: ['zhao', 'kim', 'hu', 'qian', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'came down from Gwanggyo mountain', dead: 'killed on Gwanggyo mountain', lost: 'left on Gwanggyo mountain' },
  after: (won, li, outN) => [
    { title: '三田渡 · Samjeondo', year: 'The thirtieth day of the first month of 1637', p: ['Gwanggyo mountain was the one victory anyone remembered. It changed nothing. Namhan held out for forty-seven days; then the food ran out, and the news came that the Qing had taken Ganghwa island and the royal family on it. King Injo came down from the fortress in a plain blue coat and at Samjeondo on the Han River knelt before Hong Taiji, bowed three times and knocked his head on the ground nine times.',
      'Korea became a vassal of the Qing, and was made to send ships against Pidao.'], zh: '仁祖出城，三田渡受降。' },
    { title: '你們 · Your people', year: `${outN} came down`, html: `<ul>${li}</ul>`, p: () => [DS.alive.kim ? 'Kim Sun came back with you to the boats. He said: there is nowhere in Korea now that is not theirs.' : ''].filter(Boolean), btn: 'Pidao →' },
  ],
  next: 40,
  talk: (k) => ({
    zhao: { g: ['五十六了。這是我打的最後一仗，我知道。', 'Fifty-six. This is my last war. I know it.'], t: [{ q: 'How do you know?', bond: 1, a: [['因為朝鮮是最後一個還肯養我們的地方。', 'Because Korea is the last place that would still feed us.'], ['朝鮮一跪，皮島就完了。', 'Once Korea kneels, Pidao is finished.']] }] },
    kim: { g: ['鐵子！你聽，他們說的是全羅道的話！', 'Tie! Listen, that\'s the Jeolla dialect they\'re speaking!'], t: [{ q: 'You\'re home.', bond: 1, a: [['二十年了。我走的時候十六歲。', 'Twenty years. I was sixteen when I left.'], ['我爹的渡口還在不在，我不知道。可這座山是朝鮮的山。明天我替它打。', 'I don\'t know if my father\'s ferry is still there. But this mountain is a Korean mountain. Tomorrow I fight for it.']] }] },
    qian: { g: ['我在記：全羅道的兵，一天吃一頓，半碗。', 'I\'m writing it down: the Jeolla men eat once a day, half a bowl.'], t: [{ q: 'Still writing.', bond: 1, a: [['二十年。三十本。', 'Twenty years. Thirty notebooks.'], ['我有時候想，我是不是只是為了寫，才活下來的。', 'Sometimes I wonder whether I\'ve stayed alive only to write it.']] }] },
    hu: { g: ['第三回進朝鮮了。', 'The third time I\'ve come into Korea.'], t: [{ q: 'On the right side this time?', bond: 1, a: [['第一回是旗下的牛。第二回是逃出來的。這一回……', 'The first time I was the banners\' ox. The second time I\'d run away. This time...'], ['這一回，我自己選的。', 'This time I chose.']] }] },
    ma: { g: ['皮島就在北邊。坐船兩天。', 'Pidao is just to the north. Two days by boat.'], t: [{ q: 'We\'ll go back.', bond: 1, a: [['我知道。', 'I know.'], djWedded() ? ['朝鮮一跪，下一個就是皮島。二妞跟孩子都在島上。', 'Once Korea kneels, Pidao is next. Erniu and the boy are on the island.'] : ['朝鮮一跪，下一個就是皮島。', 'Once Korea kneels, Pidao is next.']] }] },
    gou: { g: ['哥，我第一次覺得我們在打對的仗。', 'Brother, for the first time I feel we\'re fighting the right fight.'], t: [{ q: 'Since when?', bond: 1, a: [['從萊州開始。', 'Since Laizhou.'], ['也許我們會輸。可這一回，輸了也不丟人。', 'Maybe we\'ll lose. But this time losing isn\'t shameful.']] }] },
    feng: { g: ['他們的米吃完了。我們的也快了。', 'They\'ve eaten all their rice. Ours is nearly gone too.'], t: [{ q: 'We\'ll share.', a: [['殺豬的分肉，從來不算錢。', 'When a butcher shares out meat, he never counts the coin.']] }] },
    dong: { g: ['我用一包針換了一捆柴。朝鮮的針比我的貴。', 'I traded a packet of needles for a bundle of firewood. Korean needles are dearer than mine.'], t: [{ q: 'A good trade.', a: [['這輩子最後一筆好買賣。', 'The last good trade of my life.']] }] },
    kimjr: { g: ['你們是皮島來的？好。毛都督的兵，朝鮮人記得。', 'You\'re from Pidao? Good. Korea remembers General Mao\'s men.'], t: [{ q: 'Can we break through to Namhan?', bond: 1, a: [['不能。', 'No.'], ['可我們能讓他們知道，朝鮮還有兵。王上在南漢城頭上，也許看得見我們的火。', 'But we can let them know Korea still has soldiers. From the walls of Namhan, the King might see our fires.']] }] },
  })[k],
};

// ----- 二十a · Pidao, with the Qing -----
DCH[20] = {
  year: 1637, mission: 'dj20', away: djAway6,
  intro: [{ title: '皮島 · Pidao', year: 'The fourth month of 1637', p: ['After Samjeondo, Hong Taiji turned to the island. Ajige led the bannermen, with Kong Youde, Geng Zhongming and Shang Kexi and their Han troops; the Koreans were made to send their warships under Yu Rim. They gathered on the Korean shore opposite Pidao in the fourth month.',
    'Shen Shikui, a cloth merchant whose daughter had been Mao Wenlong\'s concubine, held the island with a few thousand men. Your mother and your sister are still in the fishing village.'], zh: '崇德二年四月，阿濟格率孔、耿、尚及朝鮮舟師攻皮島。' }],
  camp: { map: 'djcoast', biome: 'night', fog: 0.4, at: [98, -82], noTents: true, title: '對岸 · The far shore', card: 'The Korean shore opposite Pidao, the night before the crossing. You can see the island\'s fires across the water. Talk (E). When you are ready, lie down (E).',
    guests: ['kong'], choice: 'dj20warn',
    chat: [['島上的火，一共七堆。', 'Seven fires on the island.'], ['朝鮮的船明天先去南岸。', 'The Korean ships go to the south shore first tomorrow.'], ['阿濟格說，島上的人一個不留。', 'Ajige says no one on the island is to be spared.'], ['那邊有漁船，朝鮮的。', 'There are fishing boats down there. Korean ones.'], ['你娘在島上？', 'Your mother\'s on the island?']] },
  dawn: { title: '渡海 · The crossing', year: 'Before dawn', p: () => [djCh('dj20warn') === 0 ? 'You came back across the water an hour before the boats went out, soaked to the waist, and nobody asked where you had been.' : 'The boats go out an hour before dawn.', 'Off the south shore the Korean warships are firing their guns to draw the garrison. Your boat grinds onto the north beach.'], btn: 'Ashore →' },
  battleCard: ['Pidao, 1637. With the Qing. Take the beach, get to your mother\'s house before the bannermen, take the hill camp.', '皮島 · Pidao'],
  who: { file: ['孔有德', 'Kong Youde'] },
  order: ['zhao', 'kim', 'hu', 'liu', 'ma', 'gou', 'feng', 'dong'],
  fateText: { out: 'came off Pidao', dead: 'killed on Pidao', lost: 'left on Pidao' },
  resultTitle: '陷 · Pidao falls',
  after: (won, li, outN) => [
    { title: '皮島 · What happened', year: 'The fourth month of 1637', p: ['Pidao fell in a day. Shen Shikui was taken and brought before Ajige and would not kneel; he was beheaded on the beach. Thousands of the islanders were killed or taken. The East River, which had held the islands for sixteen years since Mao Wenlong crossed to Zhenjiang with two hundred men, was finished.'], zh: '皮島陷，沈世魁不屈死。東江亡。' },
    { title: '家 · Your family', year: 'After the fall', p: () => djFamA(), btn: 'Your people →' },
    { title: '你們 · Your people', year: `${outN} came off the island`, html: `<ul>${li}</ul>`, btn: 'Epilogue →' },
  ],
  next: 21,
  talk: (k) => ({
    zhao: { g: ['我在那個島上住了十年。', 'I lived on that island for ten years.'], t: [{ q: 'So did we all.', bond: 1, a: [['我在那兒教新兵放銃。他們現在都在對面。', 'I taught the new men to shoot there. They\'re all over there now.'], ['明天我一個都不打。我打不中的。我老了，眼睛花了。', 'Tomorrow I won\'t hit any of them. I can\'t. I\'m old, my eyes are going.']] }] },
    kim: { g: ['朝鮮的船也去。朝鮮的船。', 'The Korean ships are going too. Korean ships.'], t: [{ q: 'They were made to.', bond: 1, a: [['我知道。全朝鮮都跪了。我也跪了，比他們早三年。', 'I know. All of Korea has knelt. I knelt too, three years before them.']] }] },
    hu: { g: ['明天旗兵會去村子。', 'Tomorrow the bannermen will go into the village.'], t: [{ q: 'What will they do?', bond: 1, a: [['跟撫順一樣。跟遼陽一樣。跟所有地方一樣。', 'The same as Fushun. The same as Liaoyang. The same as everywhere.'], ['先到的人，能救幾個。', 'Whoever gets there first can save a few.']] }] },
    liu: { g: ['你娘在島上，我知道。', 'Your mother\'s on the island. I know.'], t: [{ q: 'What would you do?', bond: 1, a: [['我哥死在遼陽城頭上，我娘死在路上。我什麼都沒救下。', 'My brother died on the wall at Liaoyang and my mother died on the road. I saved nothing.'], ['你還有東西能救。去救。', 'You still have something to save. Go and save it.']] }] },
    ma: { g: ['藍門的那一家。藍門。', 'The house with the blue door. The blue door.'], t: [{ q: 'We\'ll get there first.', bond: 1, a: [djWedded() ? ['我兒子十二了。他不認得我。', 'My son is twelve. He won\'t know me.'] : ['你娘餵過我飯。在鎮江，在皮島。', 'Your mother fed me. In Zhenjiang, on Pidao.'], ['我會跑。比旗兵快。我是打魚的，從小就跑沙灘。', 'I\'ll run. Faster than the bannermen. I\'m a fisherman; I\'ve run on sand since I was a boy.']] }] },
    gou: { g: ['哥，我認得一條路。走私鹽的人從北邊上島，有一條溝。', 'Brother, I know a way. The salt smugglers come onto the island from the north, up a gully.'], t: [{ q: 'You could get across tonight?', bond: 1, a: [['坐朝鮮人的漁船。一個時辰。', 'In a Korean fishing boat. An hour.'], ['你要去，我給你划船。', 'If you\'re going, I\'ll row.']] }] },
    feng: { g: ['明天我不殺人。我殺豬。', 'Tomorrow I don\'t kill men. I kill pigs.'], t: [{ q: 'There are no pigs on Pidao.', a: [['那我就什麼都不殺。', 'Then I kill nothing.']] }] },
    dong: { g: ['我認得那些漁船的主人。給錢，什麼都肯幹。', 'I know the men who own those fishing boats. Pay them, they\'ll do anything.'], t: [{ q: 'Anything?', bond: 1, a: [['送一封信過海。送一個人過海。', 'Carry a letter across the water. Carry a man across.'], ['只要銀子夠。', 'If the silver\'s enough.']] }] },
    kong: { g: ['明天，我乾爹的島。', 'Tomorrow, my adoptive father\'s island.'], t: [{ q: 'Do you mind?', bond: 1, a: [['沈世魁那個賣布的，也配守毛家的島？', 'That cloth merchant Shen Shikui, fit to hold the Mao family\'s island?'], ['……我小時候在那個島上學會的放砲。', '...I learned to fire a gun on that island when I was young.']] }] },
  })[k],
};

// ----- 二十b · Pidao, the last stand -----
DCH[40] = {
  year: 1637, mission: 'dj40', away: [], withErniu: true,
  intro: [{ title: '皮島 · Pidao', year: 'The fourth month of 1637', p: ['After Samjeondo, Hong Taiji turned to the island. Ajige led the bannermen, with Kong Youde, Geng Zhongming and Shang Kexi and their Han troops, and the Koreans were made to send their warships under Yu Rim.',
    'You came back to Pidao in the snow with the news of Gwanggyo mountain. By the fourth month the Qing were on the Korean shore opposite, and you could see their fires across the water. Shen Shikui, a cloth merchant whose daughter had been Mao Wenlong\'s concubine, had a few thousand men, the village, and nowhere to go.'], zh: '崇德二年四月，清兵攻皮島。' }],
  camp: { map: 'djpidaof', biome: 'night', fog: 0.3, at: [44, -78], title: '漁村 · The last night', card: 'The fishing village on Pidao, the last night. Your mother, your sister and the old men are here. Shen Zhixiang\'s boats are at the south jetty. Talk (E). When you are ready, lie down (E).',
    guests: ['ma_mother', 'shensk'], choice: 'dj40boat',
    chat: [['對岸的火，比昨晚多了。', 'More fires on the far shore than last night.'], ['朝鮮的船，也在那邊。', 'The Korean ships are over there too.'], ['沈總兵說他不走。', 'General Shen says he\'s not leaving.'], ['南灘的船，只夠幾百人。', 'The boats at the south jetty will only take a few hundred.'], ['孩子們睡了。', 'The children are asleep.']] },
  dawn: { title: '北灘 · The north beach', year: 'Dawn', p: ['All night the Korean warships fired their guns off the south shore. At first light someone runs into the village shouting: boats on the north beach.'], btn: 'To the beach →' },
  battleCard: ['Pidao, 1637. The last stand. Hold the north beach, get the village to the boats, hold the grain store with Shen Shikui, then the last boat.', '皮島 · Pidao'],
  who: { file: ['沈志祥', 'Shen Zhixiang'], shen: ['沈世魁', 'Shen Shikui'] },
  order: ['zhao', 'kim', 'hu', 'qian', 'ma', 'erniu', 'gou', 'sun', 'zheng', 'feng', 'dong'],
  fateText: { out: 'got off Pidao in the last boats', dead: 'killed on Pidao', lost: 'left on Pidao' },
  resultTitle: '陷 · Pidao falls',
  after: (won, li, outN) => [
    { title: '皮島 · What happened', year: 'The fourth month of 1637', p: ['Pidao fell in a day. Shen Shikui was taken at the grain store and brought before Ajige and would not kneel; he was beheaded on the beach. Thousands of the islanders were killed or taken. Shen Zhixiang got away with some boats to Shicheng island, further out, with a few hundred people.',
      'The East River, which had held the islands for sixteen years since Mao Wenlong crossed to Zhenjiang with two hundred men, was finished.'], zh: '皮島陷，沈世魁不屈死。沈志祥收餘眾走石城島。東江亡。' },
    { title: '你們 · Your people', year: `${outN} got away`, html: `<ul>${li}</ul>`, p: () => [djCh('dj40boat') === 0 ? 'Your mother went out on the first boat the night before, with the children, as you asked. She was standing on the jetty at Shicheng when you came in.' : `Your mother came down to the jetty with the village, ${djWedded() ? 'holding Erniu\'s boy by the hand' : 'with the other old women'}, and got into the boat. She did not look back at the island once.`], btn: 'Epilogue →' },
  ],
  next: 21,
  talk: (k) => ({
    zhao: { g: ['又是一個島，又是最後一晚。', 'Another island, another last night.'], t: [{ q: 'Like Lüshun.', bond: 1, a: [['旅順，萊州，遼陽。我這輩子，盡是最後一晚。', 'Lüshun, Laizhou, Liaoyang. My whole life has been last nights.'], ['可每一回，你都活下來了。這回也一樣。我說了算。', 'And every time, you lived. This time too. I say so.']] }] },
    kim: { g: ['朝鮮的船在對面。', 'The Korean ships are over there.'], t: [{ q: 'They were made to come.', bond: 1, a: [['我知道。', 'I know.'], ['明天要是我在灘上看見朝鮮人，我就用朝鮮話罵他。罵他的祖宗。然後，我們都開槍。', 'If I see a Korean on the beach tomorrow, I\'ll curse him in Korean. His ancestors. And then we\'ll both fire.']] }] },
    qian: { g: ['三十一本。', 'Thirty-one notebooks.'], t: [{ q: 'Put them on the boat.', bond: 1, a: [['我放在油布裡了。', 'I\'ve wrapped them in oilcloth.'], ['要是我上不了船，你替我把它們帶走。誰讀都行。不讀也行。', 'If I don\'t make the boat, you take them. Anyone can read them. Or no one.']] }] },
    hu: { g: ['我不會再剃頭了。', 'I won\'t shave my head again.'], t: [{ q: 'Not ever?', bond: 1, a: [['三回了。夠了。', 'Three times. Enough.'], ['明天要是他們抓到我，就讓他們連頭帶頭髮一起拿去。', 'If they catch me tomorrow, they can take my head and the hair with it.']] }] },
    ma: { g: ['這是我的海。我生在這片海邊。', 'This is my sea. I was born on this shore.'], t: [{ q: 'You could get your family out tonight.', bond: 1, a: [['二妞不肯走。她說她守過這片灘。', 'Erniu won\'t go. She says she\'s held this beach before.'], ['你妹妹，比你還倔。', 'Your sister is more stubborn than you.']].slice(0, djWedded() ? 2 : 0).concat(djWedded() ? [] : [['我不走。這是我的海。', 'I\'m not going. This is my sea.']]) }] },
    erniu: { g: ['哥。', 'Brother.'], t: [{ q: 'Go with the boats tonight, Erniu.', bond: 1, a: [djWedded() ? ['娘去。孩子去。我不去。', 'Ma goes. The boy goes. I don\'t.'] : ['娘去。我不去。', 'Ma goes. I don\'t.'], ['十六年前你從遼陽把我背出來。這一回，我自己走。', 'Sixteen years ago you carried me out of Liaoyang. This time I walk out myself.']] }] },
    sun: { g: () => [`我${dAge('sun', 1637)}了。`, `I\'m ${dAge('sun', 1637)}.`], t: [{ q: 'You should be on the boat.', bond: 1, a: [['我從遼陽扛出一條鐵鏈，扛了十六年。', 'I carried a chain out of Liaoyang and I\'ve carried it sixteen years.'], ['你爹打的。明天我把它掛在倉門上。讓旗兵看看，遼陽的鐵匠打的鐵。', 'Your father forged it. Tomorrow I\'ll hang it on the grain-store door. Let the bannermen see what a Liaoyang smith could make.']] }] },
    zheng: { g: ['最後一鍋粥。米不多，水多。', 'The last pot of gruel. Not much rice, a lot of water.'], t: [{ q: 'It\'s good.', bond: 1, a: [['騙人。', 'Liar.'], ['十六年，我給你燒了多少頓飯？我算過。一萬一千頓。沒有一頓是好的。', 'Sixteen years: how many meals have I cooked for you? I\'ve counted. Eleven thousand. Not one of them good.'], ['……可你們都吃了。', '...But you all ate them.']] }] },
    gou: { g: ['哥，船上的位子，我讓給一個孩子了。', 'Brother, I gave my place on the boat to a child.'], t: [{ q: 'Then you stay with me.', bond: 1, a: [['我本來就要跟著你。', 'I was going to anyway.'], ['二十年前在遼陽，你沒有丟下我。', 'Twenty years ago in Liaoyang you didn\'t leave me behind.']] }] },
    feng: { g: ['我把最後一頭豬殺了。今晚每個人都有肉。', 'I\'ve killed the last pig. Everyone has meat tonight.'], t: [{ q: 'Thank you, Feng.', a: [['謝什麼。殺豬的，就這點本事。', 'Don\'t thank me. It\'s all a butcher can do.']] }] },
    dong: { g: ['我的帳都結清了。', 'My accounts are all settled.'], t: [{ q: 'All of them?', bond: 1, a: [['欠我的，不要了。我欠人的，都還了。', 'What people owed me, I\'ve let go. What I owed, I\'ve paid.'], ['做買賣的，臨走總要結清賬。我在旅順就說過。', 'A trader always settles his accounts before he goes. I said so at Lüshun.']] }] },
    ma_mother: { g: ['鐵子。過來，坐。', 'Tie. Come and sit.'], t: [{ q: 'Ma, you have to go on the boats.', bond: 1, a: [['我從遼陽走到這兒，走了十六年。我不怕再走一回。', 'I walked from Liaoyang to here. Sixteen years. I\'m not afraid of walking again.'], ['你爹要是看見你現在的樣子……', 'If your father could see you now...'], ['……他會說，這孩子的手，還是打鐵的手。', '...he\'d say: the boy still has a smith\'s hands.']] }] },
    shensk: { g: ['我是賣布的。你知道嗎？', 'I was a cloth merchant. Did you know?'], t: [{ q: 'Will you go with the boats, sir?', bond: 1, a: [['不。', 'No.'], ['毛都督來之前，我就在這島上。他走了，袁督師走了，黃龍走了。總得有一個人，最後一個走。', 'I was on this island before General Mao came. He is gone, the Supreme Commander is gone, Huang Long is gone. Someone has to be the last to go.'], ['我不走，就是最後一個。', 'If I don\'t go, I\'m the last.']] }] },
  })[k],
};

// ---------- 二十一 · 尾聲 · the epilogue (cards only) ----------
// what became of each of the file, by the road they took at Wuqiao and what they did after
const djFamA = () => { const w = djCh('dj20warn'), A = DS.alive, E = A.erniu !== false, W = djWedded(), old = ['sun', 'zheng'].filter(k => A[k] !== false).map(k => k === 'sun' ? 'Old Sun' : 'Old Zheng'), and = (l) => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1];
  const all = and(['your mother'].concat(E ? (W ? ['Erniu', 'her son'] : ['Erniu']) : [], old)), lostL = and((w === 1 ? ['your mother'] : (E && W ? ['her son', 'your mother'] : ['your mother'])).concat(old));
  return w === 0 ? [`You had crossed in a Korean fishing boat the night before and woken them. By the time the bannermen came down the path, ${all} were in a gully at the north end of the island where the salt smugglers landed, and in the dark they went over to the Korean shore in the same boat.`, `${old.length ? old.join(' and ') + (old.length > 1 ? ' died' : ' died') + ' in a Korean village within two years. ' : ''}${W ? 'Your mother lived to see her grandson married.' : 'Your mother lived another eleven years.'}`]
  : [`${w === 1 ? 'The Korean fisherman took your silver and your letter. Whether he crossed to the island you never knew.' : 'You did not send word.'} The house with the blue door was empty, the pot on the stove still warm; they had run when the shooting started.`,
    E ? `Months later, at the slave market outside Mukden, you found Erniu${w === 1 && W ? ' and her son' : ''} in a line of captives from Pidao and bought ${w === 1 && W ? 'them' : 'her'} back with everything you had. ${lostL[0].toUpperCase() + lostL.slice(1)} you never found.` : `${lostL[0].toUpperCase() + lostL.slice(1)} you never found. You looked in every line of captives between Pidao and Mukden for a year.`]; };
const djEpi = (k, m) => { const r = dRow(k); if (!r) return ''; const al = DS.alive[k], f = DS.fate[k], nm = k === DS.me ? `${DS.name.zh} ${DS.name.en}` : `${r.zh} ${r.en}`;
  if (k !== DS.me && al === false && (f === 'dead' || f === 'lost')) return `<li>✝ <b>${nm}</b> ${f === 'dead' ? 'did not live to see it. He lies somewhere between Liaoyang and the sea.' : 'was lost in the war, and nobody ever learned where.'}</li>`.replace(' He lies', r.woman ? ' She lies' : ' He lies');
  const L = {
    me: m ? 'went through Shanhai Pass with the banners in the fourth month of 1644, when Wu Sangui opened the gate to the Qing, and saw Beijing. He went south with Kong Youde, and was at Guilin in 1652 when Li Dingguo took the city and Kong burned himself in his palace. He came home to Liaodong an old man, a captain of the Han banners, and was buried outside Liaoyang, a mile from the west gate.'
      : 'went from Shicheng to the mainland and joined the Guanning army under Wu Sangui. He was at Shanhai Pass in the fourth month of 1644 when Wu opened the gate to the Qing, and so shaved his head after all, eleven years after Lüshun. He farmed in Shandong after the wars, and told no one where he had been.',
    zhao: m ? 'died in his bed in Mukden in 1640, a bannerman with a queue, and asked to be buried facing south, toward Liaoyang.' : 'died on Shicheng island the winter after Pidao, and asked to be buried facing Liaoyang. In 1638 Shen Zhixiang took the men there over to the Qing; Zhao Da did not live to shave.',
    sun: m ? null : 'reached Shicheng in the last boat with your father\'s chain, and died there that winter. They buried the chain with him.',
    zheng: m ? null : 'reached Shicheng and cooked for the survivors until the spring. "Not one of them good," he said, to the end.',
    erniu: m ? null : djWedded() ? 'took her son to Dengzhou and then to a farm in Shandong, and lived to be very old. Her grandchildren were told that their great-grandfather was a smith of Liaoyang.' : 'went to Dengzhou and then to a farm in Shandong, and lived to be very old. She never let anyone carry her anywhere again.',
    ma: !djWedded() ? (m ? 'went back to the sea after Pidao and fished the Korean coast, and nobody ever asked him which side he had been on.' : 'fished off the Shandong coast for thirty years.') : m ? (djCh('dj20warn') === 0 ? 'found his wife and son in a Korean village that summer and never went to sea for anyone again.' : djCh('dj20warn') === 1 && DS.alive.erniu !== false ? 'had his wife and son back from the Mukden market, and never went to sea for anyone again.' : 'looked for his son in every line of captives between Pidao and Mukden for a year, and then went to sea and did not come back.') : 'fished off the Shandong coast for thirty years with his son.',
    qian: m ? 'walked away from the column at Wuqiao and was never seen again. In the 1680s a manuscript in thirty notebooks, a day-by-day account of the East River, was sold in the Suzhou book market. No one knew who had written it.' : 'went south with his thirty-one notebooks. He was in Yangzhou in the fifth month of 1645 when the city fell to the Qing; the diary ends on the fifth of the ten days of the massacre.',
    liu: m ? 'became a captain in Kong Youde\'s army and went south with it. He died at Guilin in 1652, in the fire.' : `went south with Kong Youde's army. He died at Guilin in 1652, when Li Dingguo took the city.${DS.flags.shotLiu ? ' If the musketeer at Laizhou hit him, it was not badly.' : ''}`,
    kim: m ? (DS.flags.kimLeaves ? 'went home to Korea before Lüshun. You never learned whether he was on Gwanggyo mountain. In 1650 a letter came to Mukden in his hand, from the ferry at Uiju: he had a wife, three sons, and his father\'s boat.' : 'asked to be let go from the banners after Pidao, and was. He ran his father\'s ferry at Uiju for thirty years and never spoke Chinese again.') : 'went home to Korea after Pidao and ran his father\'s ferry at Uiju for thirty years. He named his first son after you.',
    hu: m ? 'shaved his head a fourth time and lived as a Han bannerman in Mukden. He said he had stopped counting.' : 'walked off into the hills of Shandong rather than shave a fourth time, and was not heard of again.',
    gou: m ? 'went through Shanhai Pass with the banners in 1644 and saw Beijing, which he had never seen. He sold the first thing he looted there and gave the money to a beggar boy.' : 'went south, and in 1661 sailed with Zheng Chenggong\'s fleet to Taiwan, the furthest from Liaoyang that anyone in the file ever got.',
    feng: m ? 'opened a mutton shop in Mukden and grew fat.' : 'opened a pork shop in Dengzhou and grew fat.',
    dong: 'traded between Korea and the islands for the rest of his life, ginseng, needles, silk and silver, and died rich, which surprised everyone, including him.',
  };
  let t = L[k]; if (t === undefined) return ''; if (t === null) return ''; return `<li class="out"><b>${nm}</b> ${t}</li>`; };
DCH[21] = {
  year: 1644, epilogue: true,
  intro: () => { const m = djMut(); const keys = ['me'].concat(DR.filter(r => !r.guest && r.k !== 'me').map(r => r.k)).filter(k => DS.alive[k] !== undefined || k === 'me');
    const rows = keys.map(k => djEpi(k, m)).filter(Boolean).join('');
    return [
      { title: '尾聲 · Epilogue', year: '1637–1683', p: ['After Pidao, the war went on without the East River. In 1644 a rebel army under Li Zicheng took Beijing and the Chongzhen Emperor hanged himself on the hill behind the palace; Wu Sangui opened Shanhai Pass to the Qing, and the banners came through the Great Wall and took the empire. Every man was ordered to shave his head or lose it.',
        'Kong Youde, Geng Zhongming and Shang Kexi, Mao Wenlong\'s three adopted sons, conquered the south for the Qing. Geng Zhongming hanged himself in 1649 after he was caught hiding runaway bondservants. Kong Youde burned himself in his palace at Guilin in 1652 when the Ming loyalist Li Dingguo took the city. Shang Kexi ruled Guangdong; in 1673 his son, Geng Zhongming\'s grandson and Wu Sangui rose against the Qing in the Revolt of the Three Feudatories, and lost. In 1683 the Qing took Taiwan, the last Ming ground.'], zh: '甲申之變。清兵入關。' },
      { title: '你們 · The file', year: m ? 'Those who went with the mutiny' : 'Those who would not go with it', html: `<ul>${rows}</ul>`, p: m ? [djFamA()[1]] : [] },
      { title: '東江 · The East River', year: '1621–1637', p: ['The East River held the islands off Korea for sixteen years, with no pay and no grain and every man of it a refugee. It never took back Liaodong. Its men ended as everything: loyalists, rebels, bannermen, princes, pirates, farmers, and a great many graves.',
        'The file is invented; Li Tie and his people never lived. The war is not. Mao Wenlong, Yuan Chonghuan, Kong Youde, Huang Long, Shen Shikui, Teixeira, Kim Jun-ryong and the rest are drawn from the record, and so are the dated events: Liaoyang, Zhenjiang, Yongcheon, Tieshan, the invasions of Korea, Shuangdao, Wuqiao, Dengzhou, Laizhou, Lüshun, Gwanggyo mountain and Pidao.'], btn: 'The end' },
    ]; },
  camp: null, next: 'done',
};
{ const _s = dStart; dStart = function (scene) { if (scene === 'c21') { DS = dLoad() || DS; const mn = $('menu'); if (mn) mn.hidden = true; return zCards(dCards(DCH[21].intro()), () => { DS.stage = 'done'; dSave(); dEnd(); }); } return _s(scene); }; }

// ---------- the choices of Act Six ----------
// 一 · the rope (the Qing camp below Gwanggyo mountain)
CHD.dj19rope = {
  build: (C) => ({ id: 'dj19rope', title: '繩 · The rope', ltitle: 'The captives\' rope', year: 'Below Gwanggyo mountain, 1637', who: ['被擄的女子 A Korean captive', 'at the end of a line of roped women'], hold: 1.2,
    lines: [chL('（看守的旗兵在火邊睡著了。繩子的那頭，一個女孩看著你。）', '(The bannerman guarding the line has fallen asleep by the fire. At the end of the rope a girl is looking at you.)'),
      chL('水。', 'Water.'),
      chL('（繩子是麻的，很粗。你腰上有刀。南邊的山上，是朝鮮人的營火。）', '(The rope is hemp, thick. There\'s a knife at your belt. On the mountain to the south are the Korean army\'s fires.)')],
    opts: [
      { q: 'Give her water.', led: 'Gave water to a Korean captive below Gwanggyo mountain.', a: [chL('（她喝完了，把碗還給你，低下頭。）', '(She drinks, gives you back the bowl, and bows her head.)')], fx: (C) => { chRep(C, 'care', 1); } },
      { q: 'Cut her rope and point at the mountain.', led: 'Cut a Korean captive loose in the night below Gwanggyo mountain.', a: [chL('（刀很快。她看了你一眼，跑進了黑暗裡。看守的旗兵翻了個身。）', '(The knife is sharp. She looks at you once and runs into the dark. The bannerman on guard turns over in his sleep.)')], fx: (C) => { chRep(C, 'care', 2); chRep(C, 'valor', 1); C.S.flags.cutRope = 1; } },
      { q: 'Walk on.', led: 'Walked past the captives\' line below Gwanggyo mountain.', a: [chL('（你走過去了。她沒有再叫。）', '(You walk past. She does not call again.)')], fx: (C) => { chRep(C, 'care', -1); } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'You gave a captive water.' : o === 1 ? 'You cut a captive loose.' : 'You walked past the captives.',
};
// 二 · the rice (the Jeolla army's stockade)
CHD.dj39rice = {
  build: (C) => ({ id: 'dj39rice', title: '米 · The rice', ltitle: 'The rice on Gwanggyo mountain', year: 'Gwanggyo mountain, 1637', who: ['金俊龍 Kim Jun-ryong', 'Army Commander of Jeolla'], hold: 1.2,
    lines: [chL('（你的人還有三天的米，是從皮島帶來的。全羅道的兵，已經兩天沒吃東西了。）', '(Your men have three days\' rice, brought from Pidao. The Jeolla men have eaten nothing for two days.)'),
      chL('金俊龍：我不能向客人要米。', 'Kim Jun-ryong: I cannot ask a guest for rice.'),
      chL('（金順在看你。）', '(Kim Sun is watching you.)')],
    opts: [
      { q: 'Give it all to the Jeolla men.', led: 'Gave your file\'s rice to the Jeolla army on Gwanggyo mountain.', a: [chL('金俊龍站起來，向你行了一個禮。他什麼也沒說。', 'Kim Jun-ryong stands and bows to you. He says nothing.'), chL('（第二天，你的人餓著肚子打仗。他們沒有抱怨。）', '(The next day your men fight hungry. None of them complains.)')], fx: (C) => { chBond(C, 'kim', 2); chBond(C, 'kimjr', 2); chRep(C, 'care', 2); C.S.flags.rice = 1; } },
      { q: 'Share it: half each.', led: 'Shared your file\'s rice with the Jeolla army.', a: [chL('（每個人半碗。不夠，但總比沒有好。）', '(Half a bowl each. Not enough, but better than nothing.)')], fx: (C) => { chBond(C, 'kim', 1); chRep(C, 'care', 1); } },
      { q: 'Keep it. Your men fight tomorrow too.', led: 'Kept your file\'s rice on Gwanggyo mountain.', a: [chL('金俊龍點點頭：你是對的。', 'Kim Jun-ryong nods: You are right.'), chL('（金順一晚上沒有跟你說話。）', '(Kim Sun does not speak to you all night.)')], fx: (C) => { chBond(C, 'kim', -2); chRep(C, 'disc', 1); } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'You gave the Jeolla men all your rice.' : o === 1 ? 'You shared your rice with the Jeolla men.' : 'You kept your rice.',
};
// 三 · the warning (the far shore, the night before Pidao, with the Qing)
CHD.dj20warn = {
  build: (C) => ({ id: 'dj20warn', title: '對岸 · The far shore', ltitle: 'The night before Pidao', year: 'The Korean shore opposite Pidao, 1637', who: ['', 'the island\'s fires across the water'], hold: 1.3,
    lines: [chL('（島上的火一共七堆。最東邊那一堆，在漁村。藍門的那一家。）', '(Seven fires on the island. The easternmost is in the fishing village. The house with the blue door.)'),
      chL('（明天天亮以前，旗兵就要上島。阿濟格說了：一個不留。）', '(Before dawn tomorrow the bannermen land. Ajige has said it: no one spared.)'),
      chL('（灘上有朝鮮人的漁船。董貨郎認得船主。吳狗兒知道一條私鹽販子的路。）', '(There are Korean fishing boats on the beach. Dong the peddler knows their owners. Wu Gou\'er knows the salt smugglers\' way onto the island.)')],
    opts: [
      { q: 'Cross yourself, tonight, and wake them.', led: 'Crossed to Pidao in the night before the attack to warn your family.', a: [chL('（一個時辰過海，一個時辰回來。你在黑暗裡敲了藍門。）', '(An hour across, an hour back. In the dark you knock on the blue door.)'), chL('你娘：……鐵子？', 'Your mother: ...Tie?')], fx: (C) => { chRep(C, 'valor', 2); chRep(C, 'disc', -1); C.S.flags.warned = 1; } },
      { q: 'Pay a fisherman to carry a letter.', led: 'Paid a Korean fisherman to carry a warning to Pidao.', a: [chL('（他把銀子咬了一下，收進懷裡，把信塞進了帽子。）', '(He bites the silver, puts it inside his coat, and tucks the letter into his hat.)')], fx: (C) => { chRep(C, 'care', 1); } },
      { q: 'Do nothing. Orders are orders.', led: 'Sent no word to Pidao the night before the attack.', a: [chL('（你躺下，看著那堆火，一直看到它滅了。）', '(You lie down and watch that fire until it goes out.)')], fx: (C) => { chRep(C, 'disc', 1); chBond(C, 'ma', -2); } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'You crossed in the night and woke them.' : o === 1 ? 'You paid a fisherman to carry your letter.' : 'You sent no word.',
};
// 四 · the boats (Pidao's last night, against the mutiny)
CHD.dj40boat = {
  build: (C) => ({ id: 'dj40boat', title: '船 · The boats', ltitle: 'The boats on Pidao\'s last night', year: 'Pidao, the fourth month of 1637', who: ['沈世魁 Shen Shikui', 'the last commander of the East River'], hold: 1.2,
    lines: [chL('沈世魁：我侄子的船，今晚先送一批走。老人，孩子。', 'Shen Shikui: My nephew\'s boats take a first load out tonight. The old, the children.'),
      chL('沈世魁：明天要是灘守不住，剩下的船在南灘，等你們把百姓送過去。', 'Shen Shikui: If the beach can\'t be held tomorrow, the rest of the boats will be at the south jetty, waiting for you to bring the village down.'),
      djWedded() ? chL('（你娘在火邊縫衣服。二妞的孩子睡在她腿上。）', '(Your mother is sewing by the fire. Erniu\'s boy is asleep across her knees.)') : chL('（你娘在火邊縫衣服。）', '(Your mother is sewing by the fire.)')],
    opts: [
      { q: 'Put Ma on tonight\'s boat with the children.', led: 'Put your mother on the first boat off Pidao.', a: [chL('你娘：……好。', 'Your mother: ...Very well.'), chL('（她把針線包好，牽起一個孩子，沒有回頭。）', '(She wraps up her needle and thread, takes a child by the hand, and does not look back.)')], fx: (C) => { chRep(C, 'care', 1); C.S.flags.familyBoat = 1; } },
      { q: 'Keep the family together. We go when the village goes.', led: 'Kept your family together on Pidao\'s last night.', a: [chL('你娘：好。我們一家，從遼陽出來就沒分開過。', 'Your mother: Good. Our family hasn\'t been apart since Liaoyang.')], fx: (C) => { chBond(C, 'erniu', 1); } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'You sent your mother out first, with the children.' : 'You kept the family together to the end.',
};
// 五 · the boy in the tent (Gwanggyo mountain, with the Qing: a full stop in the middle of the battle)
CHBT.dj19 = [{ ph: 3, t: 10, id: 'dj19boy', cid: 2, when: () => ZB && ZB.dj && chGot(chCtx(), 'dj19boy') < 0 }];
CHD.dj19boy = {
  build: (C) => ({ id: 'dj19boy', urgent: true, timer: 10, def: 1, kick: '抉擇 · NOW', title: '帳中 · In the tent', ltitle: 'The tent on Gwanggyo mountain', year: 'Gwanggyo mountain, 1637', who: ['', 'a bannerman, his sword up'],
    lines: [chL('（帳篷裡，一個朝鮮少年躺在血裡，腿斷了。一個旗兵舉著刀站在他上面。）', '(In the tent a Korean boy lies in his blood with a broken leg. A bannerman stands over him with his sword up.)')],
    opts: [
      { q: 'Catch his arm. "He\'s mine. A captive."', led: 'Claimed a wounded Korean boy as your captive on Gwanggyo mountain.', a: [chL('（旗兵瞪著你，啐了一口，走了。）', '(The bannerman glares at you, spits, and goes.)')], fx: (C) => { chRep(C, 'care', 2); C.S.flags.boy = 1; } },
      { q: 'Look away.', led: 'Looked away in a tent on Gwanggyo mountain.', a: [chL('（你轉過身。身後有一聲悶響。）', '(You turn round. Behind you there is a dull sound.)')], fx: (C) => { chRep(C, 'care', -1); } },
    ] }),
  end: (C, o) => o === 0 ? 'You claimed the boy as your captive, and he lived.' : 'You looked away.',
};
// 六 · the rope in the village (Pidao, with the Qing)
CHBT.dj20 = [{ ph: 1, t: 16, id: 'dj20rope', cid: 2, when: () => ZB && ZB.dj && chGot(chCtx(), 'dj20rope') < 0 && DS.alive.auntwang !== false }];
CHD.dj20rope = {
  build: (C) => ({ id: 'dj20rope', urgent: true, timer: 10, def: 1, kick: '抉擇 · NOW', title: '王嬸 · Aunt Wang', ltitle: 'Aunt Wang in the village', year: 'Pidao, 1637', who: ['王嬸 Aunt Wang', 'your mother\'s neighbour, on a bannerman\'s rope'],
    lines: [chL('鐵子！鐵子，是我！王嬸！你娘跑了，往北邊跑了！救救我！', 'Tie! Tie, it\'s me! Aunt Wang! Your mother ran, north! Help me!')],
    opts: [
      { q: 'Cut the rope. "This one is mine."', led: 'Cut Aunt Wang off a bannerman\'s rope on Pidao.', a: [chL('（旗兵拔刀。孔有德的一個軍官把他拉開了。那天晚上你挨了二十鞭。）', '(The bannerman draws. One of Kong Youde\'s officers pulls him off. That night you get twenty lashes.)')], fx: (C) => { chRep(C, 'care', 2); chRep(C, 'valor', 1); C.S.flags.auntWang = 1; } },
      { q: 'Keep going. Find your mother.', led: 'Left Aunt Wang on the bannerman\'s rope to look for your mother.', a: [chL('（她一直在後面喊你的名字。）', '(She keeps calling your name behind you.)')], fx: (C) => { chRep(C, 'care', -1); } },
    ] }),
  end: (C, o) => o === 0 ? 'You cut Aunt Wang loose, and took twenty lashes for it.' : 'You left Aunt Wang on the rope.',
};
