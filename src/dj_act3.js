// ===================== 東江 · Act Three: 1627 =====================
// Chapters 9–11 of the East River campaign: the Jin invasion of Korea (丁卯胡亂, the first month of 1627), the fall of Tieshan,
// Jeong Bong-su's Yonggol mountain fortress, and the refugees walking out over the sea ice to Sinmi island.
DR.push(
  { k: 'jeong', zh: '鄭鳳壽', en: 'Jeong Bong-su', t: 'a Korean officer, commander of Yonggol fortress', guest: true },
  { k: 'monk', zh: '雪岩', en: 'Seoram', t: 'a monk of the fortress temple, who speaks Chinese', guest: true },
);
Object.assign(DLOOK, {
  jeong: { h: 1.03, hat: 'gat', brows: 'knit', beard: 'longmous', coat: 0x3a4a6a },
  monk: { h: 0.96, hat: 'shaved', hair: 0x2a2420, brows: 'thin', coat: 0x8a7a5a, skin: 0xd8b48e },
});
// a man taken out of the story by a choice in the middle of a battle: kept for the fate count at the end of it
const djLoseIn = (C, k, how, id, ch) => { if (!k) return; chLose(C, k, how, id); (C.S.chLost || (C.S.chLost = {}))[k] = { id, how, ch }; };
// the place in the squad of one man of the file (for a choice's '$k')
const djPlace = (k) => { const sim = state.sim; if (!sim || !ZB) return 0; const q = sim.squads[ZB.sq]; for (const uid in ZB.map) if (DR[ZB.map[uid]] && DR[ZB.map[uid]].k === k) { const i = q.unitIds.indexOf(+uid); if (i >= 0) return i; } return 0; };

// ========== 第三幕 · 丁卯 · Act Three: 1627 ==========
DCH[9] = {
  year: 1627, mission: 'dj9', act: '第三幕 · 丁卯 · Act Three: 1627', away: ['erniu'],
  intro: [
    { title: '第三幕 · 丁卯', year: 'Act Three · 1627 · 天聰元年', p: ['Hong Taiji has been Khan for five months. He has decided that Korea, which feeds the East River and shelters it, will be his first war.',
      'In the first month of 1627 his cousin Amin crossed the frozen Yalu with thirty thousand men. Uiju fell in a day. The Koreans would call the war the Jeongmyo Horan: the Barbarian Invasion of the Fire Rabbit year.'], zh: '天聰元年正月，阿敏伐朝鮮，渡鴨綠江。' },
    { title: '鐵山 · Tieshan', year: () => `You are ${dAge('me', 1627)}`, p: () => [`Your file has wintered at the Tieshan fort, where the palisade was finished at last. Below the hill the refugee village has grown to three thousand people. Zhao Da is ${dAge('zhao', 1627)}; he says this is his last winter as a soldier.`,
      'At midnight the beacon on the Uiju road was lit, and then the next one, and then the next.'], btn: 'To the gate →' },
  ],
  camp: null,
  battleCard: ['Tieshan, the first month of 1627. Hold the gate; when it goes, get to the boats with the refugees.', '鐵山陷 · Tieshan falls'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], fort: ['', 'A man of the garrison'], refugees: ['', 'A refugee'] },
  order: ['zhao', 'kim', 'hu', 'ma', 'qian', 'liu', 'gou', 'feng', 'dong', 'sun'], wounds: { 5: 'qian' },
  fateText: { out: 'got out in the last boats', dead: 'killed at Tieshan', lost: 'left on the beach at Tieshan' },
  after: (won, li, outN) => [
    { title: '鐵山 · What happened', year: 'The first month of 1627', p: ['Tieshan fell the same day. Mao Wenlong withdrew to his islands; the Jin killed the refugees they caught in the villages along the shore. The Korean court had told the Jin the Ming soldiers were not its concern. The Jin did not listen.',
      chGot(chCtx() || { S: DS }, 'dj9zhao') === 0 ? 'Zhao Da stayed on the sand. The last you saw of him was his grey head between two riders, and his spear.' : chGot(chCtx() || { S: DS }, 'dj9zhao') === 1 ? 'You dragged Zhao Da into the boat by his collar. Behind you, on the beach, the riders reached the refugees who were still running.' : 'You got out through the shore ice.'], zh: '鐵山陷，遼民死者甚眾。' },
    { title: '你們 · Your people', year: `${outN} got out`, html: `<ul>${li}</ul>`, btn: 'The ice →' },
  ],
  next: 10,
};

DCH[10] = {
  year: 1627, mission: 'dj10', away: ['erniu', 'zheng'],
  intro: [
    { title: '朝鮮 · Korea', year: 'The second and third months of 1627', p: ['The Jin went south through Anju and Pyongyang. King Injo fled with his court to Ganghwa island. In the north-west the Korean armies broke, but here and there the people did not: farmers, slaves and monks gathered in the old mountain fortresses and held them.',
      'The most stubborn was Yonggol, above Yongcheon, where a minor officer called Jeong Bong-su had raised a righteous army, an uibyeong, and held the fortress against every assault. Mao Wenlong sent a few companies across from the islands to help him. Kim Sun asked for your file to go.'], zh: '鄭鳳壽守龍骨山城，金兵屢攻不下。' },
  ],
  camp: { map: 'djyonggol', biome: 'night', fog: 0.25, at: [-16, -6], noTents: true, title: '山城 · Inside the fortress', card: 'Inside Yonggol fortress at night, among Jeong Bong-su\'s volunteers. Most of them speak no Chinese; the monk Seoram interprets. Talk (E). When you are ready, lie down (E).',
    guests: ['jeong', 'monk'], choice: 'dj10powder',
    chat: [['（朝鮮話，聽不懂。）', '(Korean. You don\'t understand.)'], ['和尚在念經。', 'The monks are chanting.'], ['金人的營火比星星還多。', 'There are more Jin campfires than stars.'], ['朝鮮的火藥快沒了。', 'The Koreans\' powder is nearly gone.'], ['國王跑到江華島去了。', 'The king has run off to Ganghwa.'], ['這山城，壬辰年也守住過。', 'This fortress held in the Japanese war too.']] },
  dawn: { title: '第三天 · The third day', year: 'Morning', p: ['Every third day they come. Today is the third day.', 'Jeong Bong-su walks along the gate wall touching each man on the shoulder, saying something in Korean. "He says," Seoram tells you, "today is the last time."'], btn: 'To the gate →' },
  battleCard: ['Yonggol, 1627. Hold the gate with Jeong Bong-su\'s volunteers, then go down at dusk and burn the Jin camp.', '龍骨山城 · Yonggol'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], jeong: ['鄭鳳壽', 'Jeong Bong-su'], monks: ['雪岩', 'A monk'] },
  order: ['kim', 'zhao', 'hu', 'ma', 'liu', 'qian', 'gou', 'feng', 'dong', 'sun'], wounds: { 3: 'ma' },
  fateText: { out: 'held Yonggol', dead: 'killed at Yonggol', lost: 'left on the hillside below Yonggol' },
  after: (won, li, outN) => [
    { title: '龍骨 · What happened', year: 'Spring 1627', p: ['In the third month King Injo made peace with the Jin on Ganghwa: Korea would be the Khan\'s "younger brother", pay tribute, and open markets on the border. The Jin went home. Yonggol was never taken, and Jeong Bong-su was rewarded by his king.',
      'The treaty said nothing of Mao Wenlong. He came back to Pidao, and so did you.'], zh: '丁卯和議成，朝鮮與後金約為兄弟之國。' },
    { title: '你們 · Your people', year: `${outN} came back`, html: `<ul>${li}</ul>`, p: () => [chGot(chCtx() || { S: DS }, 'dj10powder') === 0 ? 'The Korean volunteers fired your powder at the last assault. When you left, Jeong Bong-su gave you his own short sword.' : chGot(chCtx() || { S: DS }, 'dj10powder') === 1 ? 'The Koreans had half your powder, and made it last.' : 'You kept your powder. On the last day the Korean matchlocks fell silent before yours did.'], btn: 'The ice →' },
  ],
  next: 11,
  talk: (k) => ({
    zhao: { g: ['朝鮮人守城的樣子，跟我們在遼陽一樣。', 'The Koreans hold a wall the way we did in Liaoyang.'], t: [
      { q: 'And Liaoyang fell.', a: [['遼陽是大城。大城裡有人開門。', 'Liaoyang was a big city. In a big city there\'s always someone to open the gate.'], ['這兒的人，都是一個村子出來的。誰也不會開門。', 'Everyone here comes from the same villages. No one will open the gate.']] },
      { q: 'You said this was your last winter.', bond: 1, if: () => DS.alive.zhao, a: [['我說過。可金人沒聽見。', 'I said it. The Jin didn\'t hear.'], ['等這山城守住了，我就回島上，給你娘劈柴。', 'When this fortress holds I\'ll go back to the island and split firewood for your mother.']] }] },
    kim: { g: ['這是我的國家，鐵子。我第一次替我自己的國家打仗。', 'This is my country, Tie. It\'s the first time I\'ve fought for my own country.'], t: [
      { q: 'How does it feel?', bond: 1, a: [['……一樣害怕。可不一樣。', '...Just as frightening. But different.'], ['以前我是在你們的戰爭裡。現在你們在我的戰爭裡。', 'Before, I was in your war. Now you\'re in mine.']] },
      { q: 'What do the volunteers say about us?', a: [['他們說明兵來了，金兵就來了。說得沒錯。', 'They say: when the Ming soldiers come, the Jin come after them. They\'re not wrong.'], ['可是他們也說：明兵是來幫忙的。只有你們來了。', 'But they also say the Ming men came to help. And only you came.']] }] },
    hu: { g: ['山上的和尚給了我一碗粥。他沒看我的頭。', 'The monk on the hill gave me a bowl of gruel. He didn\'t look at my head.'], t: [{ q: 'Your hair is growing back.', bond: 1, a: [['快一寸了。再長兩年，就沒人知道了。', 'Nearly an inch. Two more years and no one will know.'], ['我自己知道。', 'I\'ll know.']] }] },
    ma: { g: ['朝鮮的海跟我們的海是一個海。', 'The Korean sea and our sea are the same sea.'], t: [{ q: 'You miss the boats.', bond: 1, a: [['我想我的船，想你妹妹。在山上打仗，我的腳不知道往哪兒放。', 'I miss my boat, and your sister. Fighting on a mountain, my feet don\'t know where to go.']] }] },
    liu: { g: ['朝鮮人也恨金人。好。', 'The Koreans hate the Jin too. Good.'], t: [{ q: 'What number are you on?', bond: 1, a: [['我不數了。', 'I\'ve stopped counting.'], ['在鐵山，數到二百多的時候……我忘了我哥長什麼樣了。完全忘了。', 'At Tieshan, when I got past two hundred... I forgot what my brother looked like. Completely.'], ['數下去有什麼用？', 'What\'s the use of counting?']] }] },
    qian: { g: ['朝鮮人的記錄寫得比我們的好。每天幾時攻，幾時退，傷幾人。', 'The Koreans keep better records than we do. What hour they attacked, what hour they pulled back, how many hurt.'], t: [{ q: 'No thousand where there was a hundred?', bond: 1, a: [['沒有。他們的國王會看。', 'No. Their king will read it.'], ['我們的皇上……也會看。可他看的是總兵寫的。', 'Our emperor... reads it too. But he reads what the general writes.']] }] },
    gou: { g: ['我學會了一句朝鮮話：「밥 먹었어요？」吃了嗎？', 'I\'ve learned some Korean: "bap meogeosseoyo?" Have you eaten?'], t: [{ q: 'That\'s what my mother always says.', bond: 1, a: [['對！朝鮮人也這麼說！天下的娘都一樣。', 'Right! The Koreans say it too! Mothers everywhere are the same.']] }] },
    feng: { g: ['我跟一個朝鮮屠夫交換刀子。他的刀是彎的。', 'I swapped knives with a Korean butcher. His is curved.'], t: [{ q: 'Is it better?', a: [['不好不壞。殺豬的道理，到哪兒都一樣。', 'Neither better nor worse. Butchering\'s the same everywhere.']] }] },
    dong: { g: ['朝鮮人不聽三國了。他們要聽壬辰年的事。', 'The Koreans don\'t want the Three Kingdoms any more. They want stories of the Japanese war.'], t: [{ q: 'Do you know any?', bond: 1, a: [['我在學。他們講給我聽，我再講給他們聽。講得越來越好。', 'I\'m learning. They tell me, then I tell them back. It gets better every time.']] }] },
    sun: { g: ['朝鮮的和尚會打鐵。他們的爐子在廟後面。', 'The Korean monks can forge. Their furnace is behind the temple.'], t: [{ q: 'You found the forge first thing.', bond: 1, a: [['老鐵匠到哪兒都先找爐子。', 'An old smith goes looking for the forge first, wherever he is.'], ['我幫他們修了十一把銃。他們給我念了一段經。', 'I mended eleven matchlocks for them. They chanted a sutra for me.']] }] },
    jeong: { g: ['（他用漢字寫：）明人遠來，感激。', '(He writes in characters:) The Ming men have come far. I am grateful.'], t: [
      { q: '(Write:) Why do farmers fight when the king has run?', bond: 1, a: [['（他寫了很久：）王者，國之一也。民者，國之本也。', '(He writes for a long time:) The king is one part of the country. The people are its root.'], ['（又寫：）山城在，民在。民在，國在。', '(And then:) While the fortress stands, the people stand. While the people stand, the country stands.']] },
      { q: '(Write:) Will you hold?', a: [['（他把筆放下，指了指城門，又指了指自己的心。）', '(He puts down the brush, points at the gate, and then at his own heart.)']] }] },
    monk: { g: ['阿彌陀佛。施主是遼東人？', 'Amitabha. You are from Liaodong?'], t: [
      { q: 'A monk who fights?', bond: 1, a: [['壬辰年，西山大師帶著五千僧兵打倭寇。我師父就在其中。', 'In the Japanese war, the great master Seosan led five thousand monks against them. My teacher was one.'], ['殺生是罪。看著百姓被殺，也是罪。我選了輕的那個。', 'To kill is a sin. To watch the people killed is a sin too. I chose the lighter one.']] },
      { q: 'What does Jeong Bong-su say to his men?', a: [['他說：我們不是兵。我們是守家的人。', 'He says: we are not soldiers. We are people guarding our homes.'], ['兵會跑。守家的人，沒地方跑。', 'Soldiers run. People guarding their homes have nowhere to run to.']] }] },
  })[k],
};

DCH[11] = {
  year: 1627, mission: 'dj11', away: ['erniu'],
  intro: [
    { title: '冰 · The ice', year: 'Ten days after Tieshan', p: ['Three thousand of the refugees from the shore villages did not reach the boats at Tieshan. In the bitterest February in years the sea froze out to Sinmi, one of Mao Wenlong\'s islands, and they began to walk across it.',
      'Mao sent back across the ice every man who could carry a musket to bring them in. Your file was one of the companies.'], zh: '海冰合，遼民踏冰走身彌島。' },
  ],
  camp: null,
  battleCard: ['The sea ice off Sinmi, 1627. Bring the refugees over the ice to the island. Keep the riders off them.', '冰上 · The ice road'],
  who: { file: ['陳壽', 'Sergeant Chen Shou'], walkers: ['', 'A refugee'], sled: ['', 'A man on the sled'] },
  order: ['kim', 'ma', 'hu', 'zhao', 'liu', 'qian', 'gou', 'zheng', 'feng', 'dong', 'sun'],
  fateText: { out: 'came onto Sinmi island', dead: 'killed on the ice', lost: 'left on the ice' },
  after: (won, li, outN) => [
    { title: '冰上 · What happened', year: 'The second month of 1627', p: ['About two thousand five hundred came onto Sinmi. In the spring they were taken to Pidao in boats, and from Pidao, because the island could not feed them, many were shipped on to Dengzhou in Shandong. (The walk over the ice is a composite drawn from the Korean and Ming accounts of the refugees after Tieshan.)',
      chGot(chCtx() || { S: DS }, 'dj11sled') === 0 ? 'When the sled went through the channel your men went into the black water after it, and the wounded came out. Not everyone who went in did.' : chGot(chCtx() || { S: DS }, 'dj11sled') === 1 ? 'The sled with the wounded went through the dark ice. You kept the column moving. You did not look back, and you heard it anyway.' : 'The ice held.'], zh: '至者二千五百餘人。' },
    { title: '你們 · Your people', year: `${outN} came over the ice`, html: `<ul>${li}</ul>`, btn: 'Yonggol →' },
  ],
  next: 12,
};
// the order of the act as played: the ice comes between Tieshan and Yonggol
DCH[9].next = 11; DCH[11].next = 10; DCH[10].next = 12;
DCH[11].after = ((f) => (won, li, outN) => { const c = f(won, li, outN); c[c.length - 1].btn = 'Yonggol →'; return c; })(DCH[11].after);
DCH[10].after = ((f) => (won, li, outN) => { const c = f(won, li, outN); c[c.length - 1].btn = 'End of the third act →'; return c; })(DCH[10].after);
DCH[12] = null; // Act Four is being written

// ---------- the choices of Act Three ----------
CHBT.dj9 = [{ ph: 3, t: 4, id: 'dj9zhao', cid: 1, when: () => ZB && ZB.dj && chGot(chCtx(), 'dj9zhao') < 0 && DS.alive.zhao, k: () => djPlace('zhao') }];
CHD.dj9zhao = {
  build: (C) => ({ id: 'dj9zhao', urgent: true, timer: 12, def: 0, kick: '抉擇 · NOW', title: '趙大 · Zhao Da', ltitle: 'Zhao Da on the beach at Tieshan', year: 'Tieshan, the first month of 1627', who: ['趙大 Zhao Da'],
    lines: [chL('鐵子！你帶他們上船！我在這兒頂著。走！', 'Tie! Get them onto the boats! I\'ll hold here. Go!')],
    opts: [
      { q: 'Go. (Leave him holding the beach.)', led: 'Left Zhao Da holding the beach at Tieshan.', a: [chL('（你沒有回頭。）', '(You don\'t look back.)')], fx: (C) => { djLoseIn(C, 'zhao', 'dead', 'dj9zhao', 9); chRep(C, 'disc', 1); } },
      { q: 'Drag him with you.', led: 'Dragged Zhao Da into the boat with you.', a: [chL('你揪住他的領子，把他往船上拖。他罵你，一直罵到船離了岸。', 'You grab his collar and drag him to the boat. He curses you all the way, until the boat is off the sand.')], fx: (C) => { chBond(C, 'zhao', 2); C.S.flags.dj9left = 1; } },
    ] }),
  end: (C, o) => o === 0 ? 'He held the beach until the boats were out.' : 'The refugees still on the beach were caught by the riders.',
};
CHBT.dj11 = [{ ph: 2, t: 9, id: 'dj11sled', cid: 1, when: () => ZB && ZB.dj && chGot(chCtx(), 'dj11sled') < 0 }];
CHD.dj11sled = {
  build: (C) => ({ id: 'dj11sled', urgent: true, timer: 10, def: 1, kick: '抉擇 · NOW', title: '冰裂 · The ice breaks', ltitle: 'The sled in the channel', year: 'The sea ice off Sinmi, 1627', who: ['馬六 Ma Liu'],
    lines: [chL('爬犁陷下去了！上面是傷兵！下去救，冰還會裂！', 'The sled\'s going through! It\'s the wounded! Go in after them and the ice will break again!')],
    opts: [
      { q: 'Go in after them.', led: 'Sent men into the broken ice after the sled of wounded.', a: [chL('（你們趴在冰上，一個拉一個。）', '(You lie flat on the ice in a chain, each man holding the next.)')], fx: (C) => { chRep(C, 'care', 2); C.S.flags.sledSaved = 1; } },
      { q: 'Keep the column moving.', led: 'Kept the column moving and left the sled.', a: [chL('（你喊：走！別停！）', '(You shout: Move! Don\'t stop!)')], fx: (C) => { chRep(C, 'disc', 1); C.S.flags.sledLost = 1; } },
    ] }),
  end: (C, o) => o === 0 ? 'The wounded came out of the water. One of yours did not.' : 'The column reached the island.',
};
// 三 · the powder (camp in Yonggol fortress)
CHD.dj10powder = {
  build: (C) => ({ id: 'dj10powder', title: '火藥 · The powder', ltitle: 'The file\'s powder at Yonggol', year: 'Yonggol fortress, 1627', who: ['雪岩 Seoram', 'with a Korean musketeer beside him'], hold: 1.2,
    lines: [chL('（那個朝鮮砲手把他的火藥葫蘆倒過來給你看。是空的。）', '(The Korean musketeer turns his powder gourd upside down to show you. Empty.)'),
      chL('雪岩：他們的火藥，只夠明天打一陣。你們有兩桶。', 'Seoram: They have powder for one more fight tomorrow. You have two kegs.'),
      chL('陳壽：兩桶是我們回島的命。沒有火藥，金人在海邊等著我們，我們拿什麼過？', 'Sergeant Chen: Those two kegs are our way home. Without powder, if the Jin are waiting on the shore, how do we get across?'),
      chL('金順看著你，什麼也沒說。', 'Kim Sun looks at you and says nothing.')],
    opts: [
      { q: 'Give them both kegs.', led: 'Gave both kegs of the file\'s powder to the Korean volunteers.', a: [chL('（雪岩合掌。那個砲手抱著桶，像抱著一個孩子。）', '(Seoram presses his palms together. The musketeer holds the keg like a child.)'), chL('陳壽：……你說了算。', 'Sergeant Chen: ...Your call.')], fx: (C) => { chBond(C, 'kim', 2); chBond(C, 'jeong', 2); chRep(C, 'care', 1); } },
      { q: 'Give them one.', led: 'Gave the Korean volunteers one keg of two.', a: [chL('雪岩：一桶，也是一天。', 'Seoram: One keg is still a day.')], fx: (C) => { chBond(C, 'kim', 1); } },
      { q: 'Keep it for the crossing.', led: 'Kept the file\'s powder for the crossing home.', a: [chL('（金順轉身走了。過了很久，你聽見他在跟那個砲手說朝鮮話，聲音很低。）', '(Kim Sun turns and walks away. A long while later you hear him talking to the musketeer in Korean, very low.)')], fx: (C) => { chBond(C, 'kim', -1); chBond(C, 'chenshou', 1); } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? 'The Korean matchlocks fired to the end.' : o === 1 ? 'Half for them, half for you.' : 'You crossed home with dry powder.',
};
