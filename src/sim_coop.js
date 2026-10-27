// ===================== co-op missions: raids, ambushes, the front line, a sortie by night =====================
// Every phase is something to do — get there, break them, burn it, kill him, get out — never a clock to sit out.
// Each mission is five or six phases with a turn in the middle: a man down, a fire, horse on the flank, a gate to hold.
// The exposition is talk: a cast of named men (cast[key] = [zh, en, group]) speak short bilingual lines where they
// stand, spaced out over the phase (say: [t, who, en, zh, order]); an officer's line that carries a squad order names
// the order so the HUD can show the key. No cards, no walls of text: the brief is only the menu blurb.
// Sources: 《明史》毛文龍傳 (鎮江, 1621: 陳良策 the inside man, 佟養真 taken alive), 東江塘報 on the raids against Jin grain
// trains, 《明史》袁崇煥傳 on 寧錦 (1627: 滿桂、祖大壽 sent to relieve 錦州), 《清太宗實錄》天聰五年 on the siege of 大凌河
// (1631: Zu Dashou's sorties, 佟養性's red cannon, 何可綱 his deputy). Unnamed sergeants, scouts and gunners are
// invented where the sources give no name; each such man is marked (no source) where he is defined.
(function () { if (typeof SIM === 'undefined') return; const PI = Math.PI;
  const house = (x, z, hw, hd) => [x, z, hw, hd, 3.4, 'house'], pal = (x0, x1, z) => { const o = []; for (let x = x0; x < x1; x += 3) o.push([x + 1.5, z, 1.5, 0.5, 1.6, 'palisade']); return o; };
  Object.assign(SIM.MISSIONS, {
  // ----- 1621: Mao Wenlong takes Zhenjiang by night with two hundred men -----
  zhenjiang: {
    title: '鎮江夜襲 · The night raid on Zhenjiang', year: 'Summer 1621', battle: 'toba', side: 0, soloExtra: 'samurai',
    bdef: { name: 'Zhenjiang', jp: '鎮江', when: 'Summer 1621', biome: 'night', fog: 0.35 },
    brief: 'Two hundred men over the Yalu by night: take Zhenjiang, seize Tong Yangzhen, burn the granary, and be gone by dawn.',
    start: [-78, -118, 0],
    // the cast: Mao and Chen Liangce are in 《明史》; Han the scout and Sergeant Du are invented (no source)
    cast: { mao: ['毛文龍', 'Mao Wenlong', 'mao'], chen: ['陳良策', 'Chen Liangce', 'rising'], han: ['韓老五', 'Han the scout', 'me'], du: ['杜把總', 'Sergeant Du', 'me'], town: ['', 'A townsman', 'rising'] },
    zones: [{ key: 'bridge', x: -78, z: -14, r: 10, name: 'The west bridge' }, { key: 'gate', x: 0, z: 52, r: 8, name: 'The town gate' }, { key: 'yamen', x: 0, z: 86, r: 9, name: 'The yamen' }, { key: 'granary', x: 34, z: 92, r: 8, name: 'The granary' }, { key: 'boats', x: -78, z: -88, r: 14, name: 'The boats' }],
    forts: [house(-22, 64, 4, 3), house(22, 64, 4, 3), house(-24, 82, 3.5, 3), house(-6, 100, 3, 3), house(34, 104, 4, 3), house(48, 86, 3, 3.5), [0, 92, 5, 3.5, 4, 'hall'], [34, 92, 3, 3, 3, 'house']].concat(pal(-44, -4, 48), pal(4, 44, 48)),
    groups: {
      mao: { team: 0, name: 'Mao Wenlong', zh: '毛文龍', army: ['samurai', 'rifle_imp'], at: [-90, -122, 0], dir: ['support'], officer: 2 },
      rising: { team: 0, name: 'The townsmen of Zhenjiang', zh: '鎮江民', army: ['ronin', 'ronin'], at: [0, 72, PI], reserve: true, dir: ['hold', 0, 56], escort: true },
      watch: { team: 1, name: 'Sentries on the bridge', army: ['samurai', 'archer'], at: [-78, 10, PI], dir: ['hold', -78, 4], n: 12 },
      garrison: { team: 1, name: 'The Zhenjiang garrison', army: ['samurai', 'samurai', 'archer'], at: [10, 96, PI], reserve: true },
      tong: { team: 1, name: 'Tong Yangzhen', zh: '佟養真', officer: 3, army: ['samurai', 'samurai'], at: [0, 90, PI], reserve: true, stay: true, dir: ['hold', 0, 88] },
      relief: { team: 1, name: 'Jin horse from Kuandian', zh: '寬甸騎', army: ['cavalry', 'cavalry', 'cavalry'], at: [100, 138, PI], reserve: true },
      relief2: { team: 1, name: 'More horse', army: ['cavalry', 'byakkotai'], at: [138, -40, -PI / 2], reserve: true },
    },
    phases: [
      { title: 'I · 夜渡 · The bridge', goal: 'Take the bridge sentries quietly', text: 'Across the river in the dark. Take the sentries before they raise the town.', show: ['bridge'],
        start: [['calm', 'watch', 6]], obj: { all: [{ reach: 'bridge' }, { defeat: ['watch'], frac: 0.7 }] },
        say: [[3, 'mao', 'No match lit until they see us. Knives first.', '見了人才點火繩。先用刀。'], [9, 'han', 'Two fires on the bridge. Eight men, half asleep.', '橋上兩堆火。八個人，睡了一半。'],
          [26, 'du', 'Muskets, hold your fire. Not till they shout.', '銃手，不許放。等他們喊了再說。', 'holdfire'], [48, 'mao', 'Shields up the bridge. Go.', '刀牌上橋。走。', 'charge']] },
      { title: 'II · 開門 · The gate', goal: 'Get in through the town gate', text: 'The townsmen are rising inside. In through the gate before the garrison wakes.', show: ['gate'], hide: ['bridge'],
        start: [['release', 'rising'], ['dir', 'mao', 'hold', 0, 40]], obj: { reach: 'gate' }, at: [[22, ['release', 'garrison']], [23, ['dir', 'garrison', 'hold', 0, 58]]],
        say: [[4, 'chen', 'Torches in the streets. Chen Liangce keeps his word: the gate is open.', '街上有火把。陳良策說話算話，門開了。'], [25, 'town', 'The bannermen are out of the barracks!', '旗兵出營了！'],
          [31, 'mao', 'Muskets, fire at will. Shields to the gate.', '銃手自由放。刀牌上門。', 'fire']] },
      { title: 'III · 巷戰 · The streets', goal: 'Get your man up, break the garrison', text: 'An arrow off a roof. A man is down in the street and the garrison is on you.', hide: ['gate'],
        start: [['fell', 1, 'an arrow off a roof'], ['dir', 'mao', 'hold', 0, 60]], obj: { all: [{ rescue: true }, { defeat: ['garrison'], frac: 0.6 }] },
        say: [[2, 'du', 'Archer on the roof! Man down!', '房上有弓手！有人倒了！'], [12, 'mao', 'Nobody leaves him. Get him up and hold the street.', '誰也不許丟下他。拉起來，守住街口。', 'hold'],
          [40, 'han', 'The yamen is lit. He is in there.', '衙門亮著燈。他在裡頭。']] },
      { title: 'IV · 佟養真 · Tong Yangzhen', goal: 'Take Tong Yangzhen in the yamen', text: 'The Jin commander is in the yamen. Take him.', show: ['yamen'],
        start: [['release', 'tong'], ['dir', 'mao', 'hold', 0, 80]], obj: { officer: 'tong' },
        say: [[3, 'mao', 'Tong Yangzhen. He opened Fushun to them. Alive if you can.', '佟養真。撫順是他開的門。能活捉就活捉。'], [20, 'han', 'He has barred the hall doors. His guard is at the steps.', '他把堂門閂上了。親兵在台階上。']] },
      { title: 'V · 焚倉 · The granary', goal: 'Fire the granary before the horse come', text: 'Horse are coming down from Kuandian. Fire the granary first.', show: ['granary'], hide: ['yamen'],
        start: [['dir', 'mao', 'hold', 20, 80]], obj: { reach: 'granary' }, limit: 150, fail: 'The Kuandian horse caught you in the town.', done: [['explode', 34, 92, 4, 30, 0], ['say', 'han', 'It burns! The whole granary!', '燒起來了！整個倉！']],
        at: [[28, ['release', 'relief']], [29, ['dir', 'relief', 'hold', 40, 60]]],
        say: [[3, 'mao', 'The granary. Torches to every roof.', '糧倉。每個屋頂都點上。'], [30, 'han', 'Horse on the north road! Hundreds!', '北路有馬！好幾百！'], [36, 'du', 'Muskets, a volley down the road. Then we run.', '銃手，朝路上放一排。然後跑。', 'fire']] },
      { title: 'VI · 回船 · The boats', goal: 'Back over the bridge to the boats', text: 'Back over the bridge to the boats before they cut you off.', show: ['boats'], hide: ['granary'],
        start: [['dir', 'mao', 'hold', -78, -80], ['dir', 'rising', 'hold', -70, -84]], obj: { extract: 'boats' }, limit: 330, fail: 'The Jin horse caught you before the river.',
        waves: [[30, 'relief2', ['hold', -60, -60]]],
        say: [[4, 'mao', 'Walk, do not run. Wounded in the middle. Follow me.', '走，別跑。傷的在中間。跟我來。', 'follow'], [32, 'han', 'More along the south bank. They want the boats!', '南岸又來一隊。他們要截船！'],
          [60, 'chen', 'The boatmen are waiting. Zhenjiang will pay for this night.', '船家等著呢。鎮江要為今夜付代價。']] },
    ],
    win: 'Zhenjiang was taken in a night. The Jin answered by killing the people of the towns along the Yalu, and Mao Wenlong went out to the islands to begin twenty years of raids.',
  },
  // ----- 1623: a Jin grain train ambushed in the hills (the Eastern River raids) -----
  grainroad: {
    title: '劫糧 · The grain road', year: 'Autumn 1623', battle: 'abudali', side: 0, soloExtra: 'rifle_imp',
    bdef: { name: 'The Haizhou road', jp: '海州道', when: 'Autumn 1623', biome: 'autumn', fog: 0.2 },
    brief: 'A Jin grain train is coming down the valley to Haizhou. Lie on the slopes, break the escort, burn the carts, get back to the boats.',
    start: [30, -96, 0],
    // Chen Jisheng was Mao Wenlong's deputy (《明史》); Nikan is a Jin captain's name, not this man; Old Pang the gunner and
    // the boy scout are invented (no source)
    cast: { chen: ['陳繼盛', 'Chen Jisheng', 'chen'], pang: ['龐老銃', 'Old Pang the gunner', 'me'], boy: ['小石', 'Shi the boy scout', 'me'], jin: ['', 'A Jin carter', 'escort'] },
    zones: [{ key: 'slope', x: 26, z: -30, r: 10, name: 'The east slope' }, { key: 'carts', x: 0, z: -44, r: 9, name: 'The grain carts' }, { key: 'rear', x: 0, z: -4, r: 10, name: 'The tail of the train' }, { key: 'mouth', x: 0, z: -96, r: 12, name: 'The valley mouth' }, { key: 'south', x: 0, z: -132, r: 14, name: 'The way to the boats' }],
    forts: [[-4, -44, 2, 0.6, 1.4, 'mantlet'], [4, -40, 2, 0.6, 1.4, 'mantlet'], [0, -50, 2, 0.6, 1.4, 'mantlet'], [-3, -2, 2, 0.6, 1.4, 'mantlet'], [4, -6, 2, 0.6, 1.4, 'mantlet']],
    groups: {
      chen: { team: 0, name: 'Chen Jisheng\'s raiders', zh: '陳繼盛', army: ['rifle_imp', 'samurai'], at: [-30, -96, 0], dir: ['hold', -26, -36], officer: 2 },
      escort: { team: 1, name: 'The grain escort', army: ['samurai', 'archer', 'samurai'], at: [0, 138, PI], dir: ['hold', 0, -40] },
      rear: { team: 1, name: 'The rearguard', army: ['cavalry', 'samurai'], at: [0, 138, PI], reserve: true },
      relief: { team: 1, name: 'Bordered Blue horse from Haizhou', zh: '鑲藍旗', army: ['cavalry', 'cavalry', 'byakkotai'], at: [-138, -60, PI / 2], reserve: true },
      chief: { team: 1, name: 'Their captain, Nikan', zh: '尼堪', officer: 3, army: ['cavalry', 'samurai'], at: [-138, -70, PI / 2], reserve: true, stay: true, dir: ['hold', -10, -96] },
      chase: { team: 1, name: 'Jin horsemen', army: ['cavalry'], at: [138, -110, -PI / 2], reserve: true, n: 8 },
    },
    phases: [
      { title: 'I · 埋伏 · Lie in wait', goal: 'Up the east slope, no shot fired', text: 'Up the east slope before the escort comes into the narrows.', show: ['slope'],
        start: [['calm', 'escort', 6]], obj: { reach: 'slope' },
        say: [[3, 'chen', 'Every ten days they come down this valley. They stopped looking up.', '每隔十天他們走這條谷。早不往上看了。'], [8, 'pang', 'Matches out. Lie flat till Chen stands up.', '火繩收了。趴著，等陳爺站起來。', 'holdfire'],
          [15, 'boy', 'Carts! Twenty, with oxen. The soldiers walk behind.', '車！二十輛，牛拉的。兵走在後頭。']] },
      { title: 'II · 截 · Into the narrows', goal: 'Break the escort from both slopes', text: 'The escort is in the narrows. Break it.', hide: ['slope'],
        start: [['calm', 'escort', 60], ['dir', 'escort', 'attack'], ['dir', 'chen', 'hold', -6, -40]], obj: { defeat: ['escort'], frac: 0.7 },
        waves: [[24, 'rear', ['hold', 0, -36]]], say: [[1, 'chen', 'Now! Both slopes! Muskets first, then down on them!', '就是現在！兩面坡！先放銃，再衝下去！', 'fire'], [26, 'boy', 'Horse at the back of the train, coming up!', '車隊後頭有馬，上來了！']] },
      { title: 'III · 焚 · Burn the grain', goal: 'Fire the carts, then the tail of the train', text: 'Fire the carts, then the ones that turned back.', show: ['carts'],
        obj: { reach: 'carts' }, done: [['explode', 0, -44, 4, 30, 0], ['say', 'pang', 'Burn, you bastards. Eat ash this winter.', '燒吧，狗東西。這個冬天吃灰去。']],
        say: [[3, 'chen', 'The carts. Torches. Nothing goes to Haizhou.', '車。火把。一粒米也不許到海州。'], [18, 'jin', 'Cut the oxen loose! Turn the tail back!', '砍斷牛繩！把後隊掉頭！']] },
      { title: 'IV · 尾 · The tail of the train', goal: 'Fire the last carts; get your man up', text: 'The last carts turned back up the valley. Chase them down.', show: ['rear'], hide: ['carts'],
        start: [['dir', 'chen', 'hold', -8, -10], ['fell', 1, 'a cart went over on him']], obj: { all: [{ reach: 'rear' }, { rescue: true }] }, done: [['explode', 0, -4, 4, 30, 0]],
        say: [[2, 'boy', 'A cart went over! It is on his leg!', '車翻了！壓住他的腿了！'], [10, 'chen', 'Two men lift it. The rest run for the tail carts.', '兩個人抬車。其他人追後隊。'],
          [38, 'pang', 'Smoke in the valley mouth. That is not ours.', '谷口有煙。不是咱們的。']] },
      { title: 'V · 援 · Their relief', goal: 'Hold the valley mouth; kill Nikan', text: 'Haizhou horse are in the valley mouth. Kill the captain and they go home.', show: ['mouth'], hide: ['rear'],
        start: [['dir', 'chen', 'hold', -10, -88], ['release', 'relief'], ['dir', 'relief', 'hold', -10, -80]], at: [[20, ['release', 'chief']]], obj: { officer: 'chief' }, limit: 300, fail: 'They rode you down in the valley.',
        say: [[3, 'boy', 'Banners in the valley mouth! The Bordered Blue!', '谷口有旗！鑲藍旗！'], [8, 'chen', 'Muskets to the mouth. Line, and hold your fire till I say.', '銃手去谷口。列隊，我不說不許放。', 'line'],
          [24, 'pang', 'Red plume. That is their captain. Give him to me.', '紅纓。那是他們的頭。讓我來。'], [40, 'chen', 'Spears forward. Horse will not go onto points.', '長槍上前。馬不往槍尖上撞。', 'hold']] },
      { title: 'VI · 退 · To the boats', goal: 'Down the valley to the boats', text: 'Back down the valley to the boats before more come.', show: ['south'], hide: ['mouth'],
        start: [['dir', 'chen', 'hold', 0, -126]], obj: { extract: 'south' }, limit: 240, fail: 'More banners closed the valley.', waves: [[12, 'chase', ['hold', 20, -120]]],
        say: [[2, 'chen', 'Enough. To the boats. Wounded in the middle, follow me.', '夠了。回船。傷的在中間，跟我走。', 'follow'], [14, 'boy', 'Riders behind us, along the east bank!', '後面有馬，沿東岸來了！'], [40, 'pang', 'Ash in Haizhou this winter. Worth a boy\'s leg.', '海州這個冬天吃灰。值一條腿。']] },
    ],
    win: 'The grain train burned in the narrows. Raids like it kept the Jin looking over their shoulders for a decade — and the Jin killed Korean and Han villagers for every one.',
  },
  // ----- 1627: the front line before Jinzhou -----
  jinzhou: {
    title: '寧錦 · The lines before Jinzhou', year: 'Summer 1627', battle: 'bonari', side: 0, soloExtra: 'ashigaru',
    bdef: { name: 'Before Jinzhou', jp: '錦州', when: 'Summer 1627', biome: 'summer', fog: 0.12 },
    brief: 'Hong Taiji is battering Jinzhou. A column from Ningyuan goes out to break the siege lines.',
    start: [0, -112, 0],
    // Man Gui and Zu Dashou led the Ningyuan relief (《明史》袁崇煥傳); Amin commanded the Bordered Blue at Jinzhou. Corporal
    // Wei of the muskets and the drummer boy are invented (no source).
    cast: { man: ['滿桂', 'Man Gui', 'man'], zu: ['祖大壽', 'Zu Dashou', 'zu'], wei: ['魏什長', 'Corporal Wei', 'me'], drum: ['鼓手', 'The drummer', 'me'] },
    zones: [{ key: 'line1', x: 0, z: 34, r: 14, name: 'The first line', owner: 1 }, { key: 'right', x: 44, z: 48, r: 12, name: 'The right bank' }, { key: 'line2', x: 0, z: 66, r: 14, name: 'The second line', owner: 1 }, { key: 'camp', x: 0, z: 112, r: 16, name: 'The Jin camp', owner: 1, rate: 0.7 }],
    groups: {
      man: { team: 0, name: 'Man Gui', zh: '滿桂', army: ['cavalry', 'samurai', 'rifle_imp'], at: [-40, -112, 0], dir: ['hold', -30, 20], officer: 2 },
      zu: { team: 0, name: 'Zu Dashou', zh: '祖大壽', army: ['ashigaru', 'samurai', 'rifle_imp'], at: [40, -112, 0], dir: ['hold', 30, 20], officer: 2 },
      wall1: { team: 1, name: 'The first line', army: ['archer', 'samurai', 'archer'], at: [0, 40, PI], stay: true, dir: ['hold', 0, 38] },
      wall2: { team: 1, name: 'The second line', army: ['archer', 'samurai', 'samurai'], at: [0, 72, PI], stay: true, dir: ['hold', 0, 70] },
      counter: { team: 1, name: 'Mongol horse', zh: '蒙古騎', army: ['cavalry', 'byakkotai', 'cavalry'], at: [-138, 50, PI / 2], reserve: true },
      rightjin: { team: 1, name: 'The Bordered Blue right', zh: '鑲藍旗', army: ['samurai', 'archer', 'samurai'], at: [138, 60, -PI / 2], reserve: true },
      camp: { team: 1, name: 'The camp guard', army: ['samurai', 'samurai', 'archer'], at: [0, 120, PI], stay: true, dir: ['hold', 0, 114] },
      beile: { team: 1, name: 'Amin', zh: '阿敏', officer: 3.5, army: ['shinsengumi', 'samurai'], at: [0, 136, PI], reserve: true },
    },
    phases: [
      { title: 'I · 一線 · The first line', goal: 'Over the first earthwork', text: 'Over the first earthwork. Muskets keep their heads down; the rest go over together.', show: ['line1'],
        start: [['dir', 'man', 'hold', -20, 30], ['dir', 'zu', 'hold', 20, 30]], obj: { capture: ['line1'] },
        say: [[3, 'zu', 'At Ningyuan we sat behind walls. Today we go to them.', '寧遠咱們躲在牆後頭。今天去找他們。'], [14, 'wei', 'Muskets in line, forty paces from the bank. Fire when they show.', '銃手列隊，離土牆四十步。他們露頭就放。', 'line'],
          [30, 'drum', 'Archers on the bank! Shields up!', '牆上有弓手！舉盾！'], [50, 'man', 'Muskets, keep firing. Shields, over the bank now!', '銃手不停。刀牌，現在上牆！', 'charge']] },
      { title: 'II · 反衝 · The counter-charge', goal: 'Face left, break the Mongol horse', text: 'Mongol horse coming round the flank. Face left and break them.', start: [['release', 'counter'], ['dir', 'counter', 'hold', -10, 30]],
        obj: { defeat: ['counter'], frac: 0.65 }, say: [[2, 'drum', 'Horse on the left! Out of the gully!', '左邊有馬！從溝裡出來了！'], [6, 'man', 'Spears to the left! Let them come onto the points!', '長槍向左！讓他們撞到槍尖上！', 'hold'],
          [24, 'wei', 'Hold fire till they wheel. Then into the flank.', '等他們轉向再放。打側面。', 'holdfire']] },
      { title: 'III · 右翼 · Zu is cut off', goal: 'Bring Zu Dashou through on the right', text: 'Zu Dashou is cut off on the right bank. Get him through to you.', show: ['right'],
        start: [['release', 'rightjin'], ['dir', 'rightjin', 'hold', 44, 44], ['dir', 'zu', 'hold', 44, 50], ['dir', 'man', 'hold', 10, 40], ['fell', 1, 'a Jin arrow']], obj: { all: [{ arrive: 'zu', zone: 'right' }, { defeat: ['rightjin'], frac: 0.6 }, { rescue: true }] },
        say: [[3, 'zu', 'Bannermen on my right! They are between us!', '右邊有旗兵！隔開我們了！'], [9, 'man', 'Muskets, volley at the right bank. Shields, go to Zu.', '銃手，朝右岸放排銃。刀牌去接祖大壽。', 'fire'],
          [28, 'wei', 'One of ours is down. Somebody get him up!', '咱們的人倒了一個。誰去拉一把！'], [48, 'zu', 'Good. Together now. The second line.', '好。合兵了。二線。']] },
      { title: 'IV · 二線 · The second line', goal: 'Take the second earthwork', text: 'On to the second earthwork before they can man it properly.', show: ['line2'], hide: ['line1', 'right'],
        start: [['dir', 'man', 'hold', -18, 62], ['dir', 'zu', 'hold', 18, 62]], obj: { capture: ['line2'] },
        say: [[4, 'man', 'Column, fast, before they man it. Then line at the ditch.', '縱隊，快，趁他們沒上牆。到壕邊再列隊。', 'column'], [30, 'drum', 'They are running from the second line!', '他們從二線跑了！']] },
      { title: 'V · 營 · The camp', goal: 'Take the camp; bring down Amin', text: 'Their camp is behind the lines. Take it, and bring down Amin\'s banner.', show: ['camp'], hide: ['line2'],
        start: [['release', 'beile'], ['dir', 'man', 'hold', -10, 108], ['dir', 'zu', 'hold', 10, 108]], obj: { all: [{ capture: ['camp'] }, { officer: 'beile' }] },
        say: [[4, 'drum', 'That banner. The Bordered Blue. Amin himself!', '那面旗。鑲藍旗。是阿敏！'], [12, 'zu', 'Muskets on the banner. Everyone else, the tents.', '銃手打旗。其他人，上帳篷。', 'fire'], [40, 'man', 'He fights. Good. Finish it.', '他還打。好。了結他。']] },
    ],
    win: 'The siege lines broke. At Ningyuan and Jinzhou in 1627 Hong Taiji was thrown back from the walls, and went home.',
  },
  // ----- 1631: a sortie by night from Dalinghe against the siege guns -----
  dalinghe: {
    title: '大凌河 · The sortie', year: 'Autumn 1631', battle: 'hakodate', side: 0, soloExtra: 'samurai',
    bdef: { name: 'Dalinghe', jp: '大凌河', when: 'Autumn 1631', biome: 'night', fog: 0.3 },
    brief: 'Zu Dashou is besieged in the half-built fort of Dalinghe. Hong Taiji has dug a ditch around it and brought up red cannon cast that year in Shenyang. Go out by the south gate in the dark, cross their trench, spike the guns, and get back inside before the banners close in.',
    start: [0, 70, PI],
    zones: [{ key: 'gate', x: 0, z: 44, r: 8, name: 'The south gate' }, { key: 'trench', x: 0, z: 14, r: 12, name: 'The siege trench' }, { key: 'guns', x: 0, z: -18, r: 9, name: 'The red cannon' }, { key: 'fort', x: 0, z: 72, r: 12, name: 'Inside the fort' }],
    forts: pal(-46, -6, 20).concat(pal(6, 46, 20)),
    groups: {
      zu: { team: 0, name: 'Zu Dashou', zh: '祖大壽', army: ['samurai', 'rifle_imp'], at: [12, 76, PI], dir: ['support'], officer: 2 },
      trench: { team: 1, name: 'The trench guard', army: ['samurai', 'archer', 'samurai'], at: [0, 10, PI], stay: true, dir: ['hold', 0, 12] },
      guns: { team: 1, name: 'The red cannon (Ujen Cooha)', zh: '烏真超哈', army: ['cannon4', 'cannon4', 'rifle_sho'], at: [0, -22, PI], stay: true, dir: ['hold', 0, -20] },
      hong: { team: 1, name: 'Hong Taiji\'s guard', zh: '皇太極', army: ['samurai', 'cavalry', 'samurai', 'archer'], at: [0, -138, 0], reserve: true },
      left: { team: 1, name: 'Plain Yellow horse', army: ['cavalry', 'cavalry'], at: [-138, 20, PI / 2], reserve: true },
    },
    labels: { cannon4: ['Red cannon (Ujen Cooha)', '紅衣砲'] },
    phases: [
      { title: 'I · 出城 · Out of the gate', text: 'Out by the south gate in the dark. No match lit.', show: ['gate'], obj: { reach: 'gate' },
        say: [[3, 'Zu Dashou', 'We eat horses now. In a month we eat worse. Those guns go tonight or the wall goes tomorrow.']] },
      { title: 'II · 壕 · The trench', text: 'Over their trench and through the guard before they wake the camp.', show: ['trench'], hide: ['gate'],
        start: [['calm', 'trench', 8]], obj: { defeat: ['trench'], frac: 0.7 },
        say: [[2, 'Scout', 'Sentries by the fires. They\'re cooking.']] },
      { title: 'III · 砲 · The guns', text: 'Get to the red cannon and break them.', show: ['guns'], hide: ['trench'],
        obj: { all: [{ reach: 'guns' }, { defeat: ['guns'], frac: 0.5 }] }, done: [['explode', 0, -20, 5, 45, 0], ['say', 'Scout', 'Their powder! It\'s gone up!']],
        at: [[18, ['release', 'left']], [19, ['dir', 'left', 'hold', -10, 0]]], say: [[2, 'Zu Dashou', 'Spike them! Hammer the nails into the vents!'], [20, 'Scout', 'Horse along the trench! The camp is awake!']] },
      { title: 'IV · 回城 · Back inside', text: 'The whole siege camp is awake. Back to the fort.', show: ['fort'], hide: ['guns'],
        start: [['dir', 'zu', 'hold', 0, 72]], obj: { extract: 'fort' }, limit: 300, fail: 'They cut you off from the gate.',
        waves: [[4, 'hong', ['hold', 0, 30]]], say: [[5, 'Scout', 'The yellow banners! Hong Taiji\'s own guard!']] },
    ],
    win: 'The guns were broken. It bought Dalinghe a few more weeks. In the tenth month, after the people inside had eaten the dead, Zu Dashou surrendered.',
  },
  });
})();
