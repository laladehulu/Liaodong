// ===================== 東江 · Act Four: the general (1628–1629) =====================
// Chapters 12–13 of the East River campaign: Pidao at its height and the paymaster's two sets of books (a camp, no battle), and
// Yuan Chonghuan's review on Shuangdao, where he beheaded Mao Wenlong (the fifth day of the sixth month of 1629).
DR.push(
  { k: 'chenjs', zh: '陳繼盛', en: 'Chen Jisheng', t: 'Mao Wenlong\'s deputy', guest: true },
  { k: 'kong', zh: '孔有德', en: 'Kong Youde', t: 'a captain of the East River, one of Mao\'s adopted sons', guest: true },
  { k: 'baby', zh: '小鐵', en: 'Little Tie', t: 'Erniu\'s son', guest: true },
);
Object.assign(DLOOK, {
  chenjs: { h: 1.02, hat: 'chief', brows: 'knit', beard: 'goatee', skin: 0xd2aa84 },
  kong: { h: 1.08, hat: 'rattan', plume: 0xd02a1c, brows: 'thick', beard: 'mous', bulk: true, grin: true, skin: 0xb88c66 },
  baby: { h: 0.55, hat: 'band', bandCol: 0xc8281e, young: true, rosy: true },
});
const djWed = () => chGot(chCtx() || { S: DS }, 'dj6wed') === 0 && DS.alive.erniu;

// ========== 第四幕 · 雙島 · Act Four: the general ==========
DCH[12] = {
  year: 1628, mission: null, act: '第四幕 · 雙島 · Act Four: the general', away: ['erniu'],
  intro: [
    { title: '第四幕 · 雙島', year: 'Act Four · The general · 1628', p: ['A year after the invasion, the East River is at its height. Mao Wenlong holds a string of islands from the Yalu to the tip of Liaodong; merchants from Shandong and Korea crowd the harbour at Pidao; the court sends him two hundred thousand taels of silver a year and grain by the shipload, and every month he reports another victory.',
      'In Beijing a new emperor, the young Chongzhen, has recalled Yuan Chonghuan, the hero of Ningyuan, and made him Supreme Commander of all the armies against the Jin. Yuan has promised to recover Liaodong in five years. He has also said that he means to look at the East River\'s accounts.'], zh: '崇禎元年，起袁崇煥督師薊遼。' },
    { title: '島上 · On the island', year: () => `You are ${dAge('me', 1628)}`, p: () => [djWed() ? `Erniu and Ma Liu have a son, three years old, whom they have named Little Tie after you. ` : '', DS.alive.zhao ? `Zhao Da, ${dAge('zhao', 1628)}, has stopped going out on the raids; he drills the new men instead.` : 'Since Zhao Da died at Tieshan you have led the file. Some of the new men call you "Old Li", which makes you laugh.', ` Qian the Scholar is chief clerk of the paymaster\'s office now. Tonight he asked you to come and see him, and to come alone.`].filter(Boolean), btn: 'Evening →' },
  ],
  camp: { map: 'djpidao', biome: 'night', fog: 0.2, at: [10, 18], noTents: true, title: '皮島 · The island at its height', card: 'An autumn evening on Pidao, 1628. The file is drinking by the drill ground, and there is a lot to talk about. Talk (E). Qian is waiting for you. When you are ready, lie down (E).',
    guests: () => ['kong'].concat(djWed() ? ['erniu', 'baby'] : DS.alive.erniu ? ['erniu'] : []).concat(['ma_mother']), choice: 'dj12books',
    chat: [['這個月又打了一個大勝仗。總兵說的。', 'Another great victory this month. The general says so.'], ['我三個月沒領到餉了。', 'I haven\'t been paid in three months.'], ['朝鮮商人說，總兵在漢陽有宅子。', 'The Korean merchants say the general has a house in Hanyang.'], ['袁督師要來查賬了。', 'Supreme Commander Yuan is coming to look at the accounts.'], ['孔有德那小子又贏了一匹馬。', 'That Kong Youde won another horse at dice.'], ['山東的船帶來了米酒。', 'The Shandong boats brought rice wine.']] },
  dawn: null,
  fateText: { out: '' },
  after: () => [
    { title: '帳 · The books', year: 'Autumn 1628', p: () => { const c = chGot(chCtx() || { S: DS }, 'dj12books'); return [c === 0 ? 'Qian\'s true roll went to Yuan Chonghuan\'s inspector in a fish basket. Nobody on the island knew. You told yourself it was the truth, and the truth was owed.' : c === 1 ? 'You burned the true roll in Old Zheng\'s cookhouse fire. Qian watched it go and said nothing for three days.' : 'Qian put the true roll back under the floor of the paymaster\'s office, and you both pretended it was not there.',
      'In the spring Yuan Chonghuan wrote to Mao Wenlong: the East River was to report its real numbers, take its grain through the Supreme Commander\'s officers at Ningyuan, and come to a review. Mao answered with a memorial to the Emperor about his victories.']; }, zh: '袁崇煥檄東江，令報實數。' },
  ],
  next: 13,
  talk: (k) => ({
    zhao: { g: ['新兵越來越小了。這個才十五。', 'The new men keep getting younger. This one\'s fifteen.'], t: [
      { q: 'You were young once.', bond: 1, a: [['我十五歲當兵，在遼陽。萬曆二十年。', 'I joined at fifteen, in Liaoyang. The twentieth year of Wanli.'], ['那時候朝廷還發餉。按月發。', 'Back then the court still paid. Every month.']] },
      { q: 'What do you think of the money talk?', a: [['錢多了，人就散了。我在遼陽見過。', 'When there\'s a lot of money, men drift apart. I saw it in Liaoyang.']] }] },
    qian: { g: ['你來了。關上門。', 'You came. Shut the door.'], t: [
      { q: 'What is it?', a: [['（他從地板底下拿出一本冊子。）這是真的花名冊。島上有兵兩萬八千。', '(From under the floor he takes out a ledger.) This is the true muster roll. Twenty-eight thousand soldiers on the islands.'], ['總兵報朝廷的，是十五萬。', 'What the general reports to the court is a hundred and fifty thousand.'], ['多出來的銀子，一半買了米，養活了難民。另一半……我不知道。', 'Half of the extra silver bought rice and fed the refugees. The other half... I don\'t know.']] },
      { q: 'Why show me?', bond: 1, a: [['因為袁督師的人在島上，在找這本冊子。', 'Because Supreme Commander Yuan\'s men are on the island looking for this book.'], ['因為我寫了八年的謊話，想有個人知道。', 'And because I\'ve written lies for eight years, and I wanted someone to know.']] }] },
    liu: { g: ['我不數了，鐵子。我現在數錢。', 'I don\'t count heads any more, Tie. I count money now.'], t: [{ q: 'How much?', bond: 1, a: [['欠我的餉：二十七兩。總兵欠全島的：天知道。', 'What I\'m owed in pay: twenty-seven taels. What the general owes the whole island: Heaven knows.'], ['可他養了我們八年。我不恨他。我只是想要我的二十七兩。', 'But he\'s fed us eight years. I don\'t hate him. I just want my twenty-seven taels.']] }] },
    kim: { g: ['朝鮮的國王不喜歡總兵了。', 'The Korean king doesn\'t like the general any more.'], t: [{ q: 'Did he ever?', bond: 1, a: [['丁卯年以後，朝鮮人說：是毛文龍把金人引來的。', 'After the invasion the Koreans said Mao Wenlong brought the Jin down on them.'], ['我說不是。可我說的時候，自己也不太信。', 'I said it wasn\'t true. But when I said it, I didn\'t quite believe it myself.']] }] },
    hu: { g: ['我的頭髮長回來了。你看。', 'My hair\'s grown back. Look.'], t: [{ q: 'You look like a Ming man again.', bond: 1, a: [['我本來就是。', 'I always was.'], ['可我在旗下五年，學會了一件事：主子靠不住。換了主子，也一樣。', 'But five years in the banners taught me one thing: you can\'t rely on a master. A new master is the same.']] }] },
    ma: { g: () => [djWed() ? '小鐵會叫舅舅了！' : '我又打了一條新船。', djWed() ? 'Little Tie can say "uncle" now!' : 'I\'ve built myself a new boat.'], t: [{ q: 'You look happy.', bond: 1, a: [['我有船，有網，有老婆孩子。這年頭，誰還有這麼多？', 'I\'ve a boat, a net, a wife and a child. Who has that much these days?'], ['就怕這好日子，是偷來的。', 'I just worry these good days are stolen.']] }] },
    gou: { g: ['孔有德讓我跟他的隊。他說我機靈。', 'Kong Youde wants me in his company. He says I\'m quick.'], t: [{ q: 'Will you go?', bond: 1, if: () => !DS.flags.gouKong, a: [['……我是你的人，哥。可他給雙餉。', '...I\'m your man, brother. But he pays double.'], ['我再想想。', 'I\'ll think about it.']] }] },
    feng: { g: ['島上開了個肉鋪。我的。', 'There\'s a butcher\'s shop on the island now. Mine.'], t: [{ q: 'You\'ve done well.', a: [['殺豬的，總能活。', 'A butcher always gets by.']] }] },
    dong: { g: ['我現在有三個攤子了。島上什麼都缺，什麼都能賣。', 'I\'ve three stalls now. The island is short of everything, so everything sells.'], t: [{ q: 'What\'s the news?', bond: 1, a: [['袁督師在寧遠說了一句話：「東江一鎮，有名無實。」', 'Supreme Commander Yuan said something at Ningyuan: "The East River command: a great name and nothing behind it."'], ['總兵聽了，摔了一個茶碗。', 'When the general heard it he smashed a teacup.']] }] },
    sun: { g: ['我給新兵打了三百個槍頭。手還行。', 'I\'ve made three hundred spearheads for the new men. My hands still work.'], t: [{ q: 'You\'re sixty-seven.', bond: 1, a: [['你爹要是在，也五十了。', 'If your father were alive he\'d be fifty.'], ['你現在打的刀，比他打得好。我跟你說過沒有？', 'The blades you make now are better than his. Have I told you that?']] }] },
    zheng: { g: ['我燒了三十年的飯，在這島上又燒了七年。', 'I cooked thirty years, and seven more on this island.'], t: [{ q: 'Rest, old man.', bond: 1, a: [['廚子一歇，就老了。', 'Once a cook rests, he\'s old.'], ['你們回來的時候，總得有口熱飯。', 'When you lot come back, there has to be hot food.']] }] },
    kong: { g: ['李家的！來，喝一碗！', 'Li! Come on, have a bowl!'], t: [
      { q: 'You\'re in a good mood, Captain Kong.', bond: 1, a: [['總兵是我乾爹。乾爹在，我們就有飯吃。', 'The general is my adoptive father. While he\'s here, we eat.'], ['袁蠻子要是敢動乾爹……（他把碗放下了。）', 'If that southern barbarian Yuan dares to touch him... (He puts the bowl down.)']] },
      { q: 'Leave Wu Gou\'er in my file.', a: [['（他大笑。）你護著他，像護著自己的兒子。好！我不要他了。', '(He laughs.) You guard him like your own son. Fine! I won\'t take him.']], flag: 'gouKong' }] },
    erniu: { g: ['哥，你瘦了。', 'Brother, you\'ve got thin.'], t: [{ q: 'And you look well.', bond: 1, a: [['我現在認得三百個字了。秀才教的。', 'I know three hundred characters now. The scholar taught me.'], ['我寫了一封信給爹。沒地方寄。就燒了。', 'I wrote a letter to Pa. There was nowhere to send it. So I burned it.']] }] },
    baby: { g: ['舅舅！', 'Uncle!'], t: [{ q: 'Pick him up.', bond: 1, a: [['（他抓住你的鬍子，笑得喘不過氣。）', '(He grabs your beard and laughs until he can\'t breathe.)']] }] },
    ma_mother: { g: ['鐵子，你多大了？', 'Tie, how old are you now?'], t: [{ q: 'Twenty-four, Ma.', bond: 1, a: [['二十四。你爹二十四的時候，已經有你了。', 'Twenty-four. When your father was twenty-four, he already had you.'], ['……我不是催你。這年頭，不催。', '...I\'m not nagging. These days, I don\'t nag.']] }] },
  })[k],
};

DCH[13] = {
  year: 1629, mission: 'dj13', away: ['erniu', 'zheng'],
  intro: [
    { title: '袁崇煥 · Yuan Chonghuan', year: 'The fifth month of 1629', p: ['In the fifth month of 1629 Yuan Chonghuan sailed from Ningyuan with his guard to the little island of Shuangdao, off Lüshun, and summoned Mao Wenlong to meet him for a review of the East River.',
      'Mao came with three thousand men. For three days the two of them feasted each other, talked, and shot at the butts. On the fifth day of the sixth month Yuan invited him up to his tent on the hill.'], zh: '崇禎二年六月初五，袁崇煥會毛文龍於雙島。' },
    { title: '你 · You', year: () => `You are ${dAge('me', 1629)}`, p: () => [`Sergeant Chen\'s company is part of the general\'s guard. You march behind Mao Wenlong up from the beach in your best coat, ${DS.flags && chGot(chCtx() || { S: DS }, 'dj12books') === 0 ? 'knowing what Yuan Chonghuan knows, because you sent it to him' : 'with no idea what is coming'}.`], btn: 'Ashore →' },
  ],
  camp: null,
  battleCard: ['Shuangdao, 1629. Walk behind your general. Keep your hands where they can see them.', '雙島 · Shuangdao'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], mao: ['毛文龍', 'Mao Wenlong'], yuan: ['袁崇煥', 'Yuan Chonghuan'], yguard: ['', 'One of Yuan\'s guards'] },
  order: ['zhao', 'kim', 'hu', 'ma', 'liu', 'qian', 'gou', 'feng', 'dong', 'sun'],
  fateText: { out: 'came back down to the boats', dead: 'killed on Shuangdao', lost: 'taken by the Supreme Commander\'s guard' },
  resultTitle: '終 · It is over',
  after: (won, li, outN) => [
    { title: '雙島 · What happened', year: 'The sixth month of 1629', p: ['Yuan Chonghuan read out twelve crimes deserving death: false reports, misused silver, the islands ruled as a private kingdom, the Emperor\'s officers insulted. Then he had Mao Wenlong beheaded in front of his guard with the imperial sword. He gave four months\' pay to the East River\'s men, divided its command among Mao\'s officers, and sailed home.',
      'Some at court called it necessary. Many have called it the worst mistake of the war. Four months later Hong Taiji came through the Great Wall and up to the walls of Beijing, and the Emperor, told that Yuan Chonghuan had let him in, had Yuan arrested. In the eighth month of 1630 Yuan was put to death by slicing in the Beijing market. The crowd bought pieces of his flesh.'], zh: '袁崇煥以尚方劍斬毛文龍。明年，崇煥亦被磔於市。' },
    { title: '你們 · Your people', year: `${outN} came back`, html: `<ul>${li}</ul>`, p: () => [chGot(chCtx() || { S: DS }, 'dj13draw') === 0 ? 'You drew your blade outside the tent. Yuan\'s guard knocked you down, and Sergeant Chen begged for you on his knees. You still have the scar.' : 'You stood still outside the tent. You have never been sure, since, whether that was the right thing.'], btn: 'End of the fourth act →' },
  ],
  next: 14,
};
DCH[14] = null; // Act Five is being written

// ---------- the choices of Act Four ----------
CHD.dj12books = {
  build: (C) => ({ id: 'dj12books', title: '花名冊 · The true roll', ltitle: 'Qian\'s true muster roll', year: 'Pidao, autumn 1628', who: ['錢秀才 Qian the Scholar', 'with the ledger open on his knees'], hold: 1.2,
    lines: [chL('兩萬八千。總兵報的是十五萬。', 'Twenty-eight thousand. The general reports a hundred and fifty thousand.'),
      chL('袁督師的人在島上。他給我帶了話：把真冊子交出來，朝廷不追究你。', 'Supreme Commander Yuan\'s man is on the island. He sent word: hand over the true roll and the court will not hold it against you.'),
      chL('可是冊子一交出去，總兵就完了。總兵完了，島上的十萬張嘴，誰養？', 'But once the roll is handed over the general is finished. And if he\'s finished, who feeds the hundred thousand mouths on this island?'),
      chL('（他把冊子遞給你。）你替我拿主意。我拿了八年的主意，拿錯了八年。', '(He holds out the ledger.) You decide for me. I\'ve decided for eight years, and been wrong for eight years.')],
    opts: [
      { q: 'Send it to Yuan\'s inspector.', led: 'Sent the true muster roll to Yuan Chonghuan\'s inspector.', a: [chL('（你把冊子包進一張油紙，放進一個魚簍。）', '(You wrap the ledger in oiled paper and put it in a fish basket.)'), chL('錢秀才：……好。總得有人說一次真話。', 'Qian: ...Good. Someone has to tell the truth once.')], fx: (C) => { chBond(C, 'qian', 2); C.S.flags.booksSent = 1; } },
      { q: 'Burn it.', led: 'Burned the true muster roll to protect the general and the island.', a: [chL('（紙在灶火裡捲起來，一個名字一個名字地黑下去。）', '(The paper curls in the stove, going black one name at a time.)'), chL('錢秀才：我還記得。每一個數，我都記得。', 'Qian: I still remember. Every number, I remember.')], fx: (C) => { chBond(C, 'qian', -1); chBond(C, 'liu', 1); C.S.flags.booksBurned = 1; } },
      { q: 'Put it back under the floor.', led: 'Put the true roll back under the floor and said nothing.', a: [chL('錢秀才：那就等著吧。等誰先來拿它。', 'Qian: Then we wait. Wait and see who comes for it first.')], fx: (C) => { C.S.flags.booksKept = 1; } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'The roll was in Yuan\'s hands when he came to Shuangdao.' : o === 1 ? 'The numbers burned. Qian remembered them.' : 'The roll stayed under the floor.',
};
CHBT.dj13 = [{ ph: 2, t: 21, id: 'dj13draw', cid: 1, when: () => ZB && ZB.dj && chGot(chCtx(), 'dj13draw') < 0 }];
CHD.dj13draw = {
  build: (C) => ({ id: 'dj13draw', urgent: true, timer: 10, def: 1, kick: '抉擇 · NOW', title: '帳前 · Before the tent', ltitle: 'Outside the tent on Shuangdao', year: 'Shuangdao, the sixth month of 1629', who: ['劉黑子 Liu Heizi'],
    lines: [chL('他們要殺總兵！就在裡面！拔刀！', 'They\'re going to kill the general! In there! Draw!')],
    opts: [
      { q: 'Draw your blade.', led: 'Drew your blade outside Yuan Chonghuan\'s tent.', a: [chL('（四周的親兵同時拔刀。）', '(All around, the guards draw at the same moment.)')], fx: (C) => { chRep(C, 'valor', 1); chBond(C, 'liu', 2); C.S.flags.drew = 1; } },
      { q: 'Stand still.', led: 'Stood still outside the tent while the general was killed.', a: [chL('（你抓住劉黑子的手腕，不讓他拔。）', '(You grab Liu Heizi\'s wrist and hold it so he can\'t draw.)')], fx: (C) => { chRep(C, 'disc', 1); chBond(C, 'liu', -2); } },
    ] }),
  end: (C, o) => o === 0 ? 'You drew. The guard knocked you down.' : 'You stood still. Liu Heizi never forgave you for it.',
};
