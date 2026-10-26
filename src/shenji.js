// ===================== 神機營 · The Divine Engine Division: a story campaign =====================
// One three-eyed-gun team of the capital's firearms division, 1629–1631: the autumn review on the drill ground, the
// Jin raid on Beijing (Shunyi, the Guangqu Gate), and the relief of Dalinghe at Changshan. It reuses the Zhejiang
// machinery in zhe.js (SPEECH, camp talk, the file grid, the golden goal line) through ZHOOK / ZB.R / ZC.R and keeps
// its own save ('mingShenji'). Sources: 趙士楨《神器譜》, 戚繼光《練兵實紀》, 茅元儀《武備志》, 《明史·兵志》, 徐光啟's memorials.

// <sj-missions> (data only: the node harness evals this block on its own)
const SJ_MISSIONS = (() => { const PI = Math.PI; const cartRow = (z, xs) => xs.map(x => [x, z, 2, 0.5, 1.5, 'mantlet']); const cartCol = (x, zs) => zs.map(z => [x, z, 0.5, 2, 1.5, 'mantlet']);
  return {
  // ----- prologue: the autumn review on the drill ground, which ends with a rider from the east -----
  sjdrill: {
    title: '校場 · The drill ground', year: 'Autumn 1629', battle: 'zroad', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sj0', soft: true,
    bdef: { name: 'The drill ground', jp: '京營校場', when: 'Autumn 1629', biome: 'autumn', fog: 0.08 },
    brief: 'The autumn review of the capital camps, on the drill ground outside Beijing\'s walls. Your three-eyed-gun team marches with the Divine Engine Division.',
    start: [0, -110, 0],
    zones: [{ key: 'line', x: 0, z: -62, r: 9, name: 'The firing line' }, { key: 'butts', x: 0, z: -30, r: 6, name: 'The straw butts' }, { key: 'road', x: 0, z: 96, r: 14, name: 'The east road' }],
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [0, -110, 0], dir: ['hold', 0, -106], stay: true },
      niao: { team: 0, name: 'The bird-gun company', zh: '鳥銃隊', army: ['rifle_imp'], at: [-16, -108, 0], dir: ['hold', -16, -104], stay: true },
      carts: { team: 0, name: 'The cart company', zh: '車營', army: ['ashigaru'], at: [16, -108, 0], dir: ['hold', 16, -104], stay: true },
      stand: { team: 0, name: 'The eunuch inspector', zh: '提督內臣', army: ['samurai'], at: [-26, -46, PI / 2], dir: ['hold', -26, -46], stay: true },
    },
    phases: [
      { title: '一 · 秋操 · The autumn review', goal: 'March to the firing line with your team', text: 'Drums and banners. March to the line.', show: ['line'],
        start: [['dir', 'sjf', 'hold', 0, -62], ['dir', 'niao', 'hold', -16, -60], ['dir', 'carts', 'hold', 16, -60]],
        obj: { all: [{ reach: 'line' }, { survive: 24 }] },
        say: [[6, 'sj_hu', 'Step on the drum. The inspector watches the banners. I watch your feet.', '踩著鼓點走。內臣看旗，我看你們的腳。'],
          [13, 'sj_tian', 'Is that the eunuch inspector? He has more silk on him than my whole street.', '那就是提督太監？他身上的綢子比我們整條街都多。'],
          [20, 'sj_qian', 'Smile for him. The pay goes through his hands.', '笑一個。餉銀要從他手裡過。']] },
      { title: '二 · 三疊 · Three ranks', goal: 'Fire at the butts on the drum, then step back and load', text: 'Fire on the drum, then step back.',
        show: ['butts'], hide: ['line'], obj: { survive: 50 },
        say: [[1, 'sj_lin', 'First rank, present! Wait for the drum!', '頭排——舉銃！聽鼓！'], [6, 'sj_lin', 'Fire! Back through the gaps and load. Second rank up!', '放！從空隙退回去裝藥。二排上！'],
          [16, 'sj_hu', 'Three barrels, three shots. Then you are holding an iron club. Remember that.', '三個管子，三響。打完了你手裡就是根鐵棍。記住。'],
          [27, 'sj_zhao', 'Not so much powder, boy! A barrel that splits takes your hand with it.', '藥別裝那麼多！管子一炸，手就沒了。'],
          [38, 'sj_song', 'Zhao Shizhen wrote that half our guns are cast so badly they burst.', '趙士楨說，我們的銃一半鑄得不好，一放就炸。'],
          [46, 'sj_lin', 'Better. In the south we drilled until we could load in the dark.', '好一點了。在南邊，我們練到閉著眼也能裝藥。']] },
      { title: '三 · 急報 · A rider from the east', goal: 'Fall in and march out by the east road', text: 'A rider from the east. Fall in.', show: ['road'], hide: ['butts'],
        start: [['dir', 'sjf', 'hold', 0, 94], ['dir', 'niao', 'hold', -14, 90], ['dir', 'carts', 'hold', 14, 90]],
        obj: { reach: 'road' },
        say: [[1, 'rider', 'The Jin are over the Wall at Da\'ankou! Zunhua is under siege! All camps to arms!', '金兵從大安口入塞！遵化被圍！各營整備！'],
          [6, 'sj_tian', 'Over the Wall? That is three days from here.', '入塞？那離這兒只有三天路。'],
          [11, 'sjf', 'Gun teams, fall in! We march with General Man Gui\'s Datong horse.', '銃隊集合！隨滿總兵大同兵出征。'],
          [18, 'sj_gao', 'Ten years ago I marched out to Sarhu. One in five of us came back.', '十年前我出征薩爾滸。五個回來一個。'],
          [26, 'sj_hu', 'Then this time more of us come back. Drum up!', '那這回多回來幾個。起鼓！']] },
    ],
    win: 'The company marched out of Beijing.',
  },
  // ----- chapter one: Shunyi, the eleventh month of 1629 -----
  sj1: {
    title: '順義 · Shunyi', year: 'November 1629', battle: 'zroad', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sj1',
    bdef: { name: 'Shunyi', jp: '順義', when: 'November 1629', biome: 'winter', fog: 0.25 },
    brief: 'Hong Taiji is through the Great Wall and moving on Beijing. Man Gui of Datong and Hou Shilu of Xuanfu march out to meet him at Shunyi. Your gun team marches behind the carts.',
    start: [0, -84, 0],
    zones: [{ key: 'carts', x: 0, z: -56, r: 10, name: 'The cart wall' }, { key: 'road', x: 0, z: -136, r: 14, name: 'The Beijing road' }],
    forts: cartRow(-50, [-22, -17, -12, -7, 7, 12, 17, 22]),
    labels: { cavalry: ['Bordered White horse', '鑲白旗騎'] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [0, -84, 0], dir: ['hold', 0, -80], stay: true },
      carts: { team: 0, name: 'The cart company', zh: '車營', army: ['rifle_imp', 'ashigaru'], at: [-12, -88, 0], dir: ['hold', -12, -84], stay: true },
      mangui: { team: 0, name: 'Man Gui (Datong)', zh: '滿桂', army: ['cavalry', 'cavalry', 'samurai'], at: [-42, -74, 0], dir: ['hold', -42, -46], officer: 3, stay: true },
      hou: { team: 0, name: 'Hou Shilu (Xuanfu)', zh: '侯世祿', army: ['cavalry', 'ashigaru', 'rifle_imp'], at: [42, -74, 0], dir: ['hold', 42, -46], stay: true },
      jin1: { team: 1, name: 'The Bordered White van', zh: '鑲白旗', army: ['cavalry', 'archer', 'samurai'], at: [0, 138, PI], reserve: true },
      jin2: { team: 1, name: 'Hong Taiji\'s main body', zh: '皇太極', army: ['samurai', 'samurai', 'archer', 'cavalry', 'samurai'], at: [-30, 138, PI], reserve: true },
      khor: { team: 1, name: 'Khorchin Mongols', zh: '科爾沁', army: ['byakkotai', 'cavalry'], at: [138, 10, -PI / 2], reserve: true },
      jin3: { team: 1, name: 'More banners', zh: '後隊', army: ['cavalry', 'samurai', 'archer', 'samurai'], at: [20, 138, PI], reserve: true },
      chase: { team: 1, name: 'Jin horsemen', army: ['cavalry'], at: [-138, -84, PI / 2], reserve: true, n: 6 },
    },
    phases: [
      { title: '一 · 列車 · The cart wall', goal: 'Take your place behind the carts', text: 'Chain the carts. Load behind them.', show: ['carts'],
        start: [['dir', 'sjf', 'hold', 0, -56], ['dir', 'carts', 'hold', -12, -56]],
        obj: { all: [{ reach: 'carts' }, { survive: 36 }] },
        say: [[6, 'mangui', 'Gunners! You shoot, my horsemen finish. And do not shoot my horsemen.', '銃手！你們放銃，我的馬兵收拾。別打我的人。'],
          [13, 'sj_hu', 'That is Man Gui. A Mongol by birth. Forty wounds, they say, every one in front.', '那是滿桂。蒙古人出身。身上四十多處傷，都在前面。'],
          [21, 'sj_ma', 'Carts chained. The mules hate this cold more than I do.', '車連好了。騾子比我還怕冷。'],
          [27, 'sj_lin', 'Light your match. Keep it under your coat until the drum.', '火繩點上。打鼓之前揣在懷裡。']] },
      { title: '二 · 齊放 · The volley', goal: 'Hold your fire until they reach the carts, then fire', text: 'Riders out of the snow. Wait for fifty paces.',
        start: [['release', 'jin1'], ['dir', 'jin1', 'hold', 0, -50]],
        obj: { survive: 70 }, at: [[42, ['wound', 5]]],
        say: [[1, 'lookout', 'Riders on the road! White banners edged in red!', '路上有馬兵——白旗鑲紅！'], [6, 'sj_lin', 'Not yet... not yet... fifty paces!', '還不到……還不到……五十步！'],
          [13, 'sj_hu', 'Fire! Back and load! Next rank!', '放！退後裝藥！下一排！'],
          [43, 'sj_hu', 'Zhao\'s gun has burst! Get him back from the carts!', '老趙的銃炸了！把他拖下去！'],
          [48, 'sj_zhao', 'My hand... it\'s still there. It\'s still there!', '我的手……還在。還在！'], [60, 'mangui', 'Datong! Ride!', '大同兵！衝！']] },
      { title: '三 · 短兵 · In close', goal: 'Club them off the carts with your gun', text: 'They are over the carts. Swing the gun.',
        start: [['release', 'jin2'], ['release', 'khor'], ['dir', 'jin2', 'hold', 0, -52], ['dir', 'khor', 'hold', 20, -56], ['break', 'hou']],
        obj: { survive: 75 },
        say: [[2, 'lookout', 'Hou Shilu\'s banners are going back! Xuanfu is running!', '侯總兵的旗退了！宣府兵跑了！'], [6, 'sj_hu', 'Swing it like a flail! Three pounds of iron on the end!', '當連枷掄！頭上三斤鐵！'],
          [14, 'sj_wu', 'Ha! Like threshing millet!', '哈！跟打穀子一樣！'], [30, 'sj_tian', 'There are too many. Where are they all coming from?', '太多了。哪來這麼多人？'],
          [52, 'mangui', 'Back to Beijing! Gunners first, the horse behind!', '退回京城！銃手先走，馬兵斷後！']] },
      { title: '四 · 回京 · The road home', goal: 'Fall back down the road with your wounded', text: 'Fall back down the road to Beijing.', show: ['road'], hide: ['carts'],
        start: [['dir', 'sjf', 'hold', 0, -132], ['dir', 'mangui', 'hold', 0, -64], ['dir', 'carts', 'hold', 0, -124], ['release', 'jin3'], ['dir', 'jin3', 'hold', 0, -60], ['calm', 'jin3', 22], ['calm', 'jin1', 22], ['calm', 'jin2', 22], ['calm', 'khor', 22]],
        obj: { extract: 'road' }, limit: 360, fail: 'The Jin horse got round the carts and cut the road.',
        waves: [[18, 'chase', ['hold', -30, -110]]], at: [[19, ['calm', 'chase', 30]]],
        say: [[2, 'sj_hu', 'Walk, don\'t run. Running men get ridden down.', '走，別跑。跑的人會被馬踩死。'], [18, 'lookout', 'Horsemen on the left, by the trees!', '左邊樹林裡有馬兵！'],
          [32, 'sj_gao', 'Same snow as Sarhu. Same sound.', '跟薩爾滸一樣的雪。一樣的聲音。']] },
    ],
    win: 'You got back to Beijing.',
  },
  // ----- chapter two: the Guangqu Gate, the twentieth day of the eleventh month (December 1629) -----
  sj2: {
    title: '廣渠門 · The Guangqu Gate', year: 'December 1629', battle: 'aizu', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sj2',
    bdef: { name: 'The Guangqu Gate', jp: '廣渠門', when: 'December 1629', biome: 'winter', fog: 0.15 },
    brief: 'The Jin army is under the walls of Beijing. Yuan Chonghuan\'s Liaodong horse have ridden round it to stand before the Guangqu Gate. Your gun team stands with them, outside the wall.',
    start: [6, 54, PI],
    zones: [{ key: 'gate', x: 6, z: 46, r: 10, name: 'Before the Guangqu Gate' }, { key: 'canal', x: 0, z: -92, r: 16, name: 'The canal' }],
    forts: cartRow(40, [-22, -17, -12, -7, 7, 12, 17, 22]),
    labels: { samurai: ['Plain Blue bannermen', '正藍旗甲兵'] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [6, 56, PI], dir: ['hold', 6, 52], stay: true },
      yuan: { team: 0, name: 'Yuan Chonghuan', zh: '袁崇煥', army: ['cavalry', 'cavalry', 'samurai', 'rifle_imp'], at: [-10, 58, PI], dir: ['hold', -10, 46], officer: 3, stay: true },
      zu: { team: 0, name: 'Zu Dashou', zh: '祖大壽', army: ['cavalry', 'samurai', 'ashigaru'], at: [-52, 52, PI], dir: ['hold', -52, 40], officer: 2, stay: true },
      wall: { team: 0, name: 'Guns on the wall', zh: '城上砲', army: ['armstrong', 'rifle_imp'], at: [18, 70, PI], dir: ['hold', 18, 68], stay: true },
      amba: { team: 1, name: 'Manggūltai\'s Plain Blue', zh: '莽古爾泰', army: ['samurai', 'archer', 'samurai', 'archer', 'cavalry', 'samurai'], at: [0, -138, 0], reserve: true },
      rear: { team: 1, name: 'The Jin rearguard', zh: '殿後', army: ['samurai', 'archer', 'samurai', 'cavalry'], at: [20, -138, 0], reserve: true },
      hooge: { team: 1, name: 'Hooge\'s horse', zh: '豪格', army: ['cavalry', 'cavalry', 'byakkotai'], at: [-138, 10, PI / 2], reserve: true },
    },
    phases: [
      { title: '一 · 城下 · Under the wall', goal: 'Form your guns before the gate', text: 'The wall behind you, the suburb in front.', show: ['gate'],
        start: [['dir', 'sjf', 'hold', 6, 46]],
        obj: { all: [{ reach: 'gate' }, { survive: 34 }] },
        say: [[6, 'yuan', 'Gunners from the capital? My Liaodong men have shot at the Jin before. Learn from them, and fast.', '京營的銃手？我的遼兵打過金人。跟著學，學快點。'],
          [14, 'sj_song', 'That is Yuan Chonghuan. The man who held Ningyuan against Nurhaci himself.', '那就是袁崇煥。在寧遠打退努爾哈赤本人的人。'],
          [22, 'sj_qian', 'Then why does the city say he let the Jin through?', '那城裡怎麼都說是他放金兵進來的？'], [28, 'sj_hu', 'Shut up and load.', '閉嘴，裝藥。']] },
      { title: '二 · 正藍旗 · The Plain Blue Banner', goal: 'Fire by ranks and keep the line loaded', text: 'Blue banners in the streets. Fire by ranks.',
        start: [['release', 'amba'], ['dir', 'amba', 'hold', 0, 42]],
        obj: { survive: 90 }, at: [[55, ['wound', 4]]],
        say: [[1, 'lookout', 'Blue banners in the streets!', '街上有藍旗！'], [6, 'sj_lin', 'By ranks! First fires, second waits! Never all at once!', '分排！頭排放，二排等！不許一齊放空！'],
          [22, 'sj_song', 'The wall guns. Listen: Western pattern. Red cannon.', '城上的砲——聽。西洋式的，紅夷砲。'],
          [56, 'sj_hu', 'A gun has burst! Get him behind the carts!', '有銃炸了！拖到車後面去！'],
          [70, 'yuan', 'Hold! They came a thousand li to die before this gate. Let them.', '頂住！他們跑了千里來這門前送死，就成全他們。']] },
      { title: '三 · 肉搏 · Hand to hand', goal: 'Turn and club the riders off your guns', text: 'Horse in the alleys. Turn and club them.',
        start: [['release', 'hooge'], ['dir', 'hooge', 'hold', 10, 46]],
        obj: { survive: 80 },
        say: [[1, 'lookout', 'Horse in the alleys on the left!', '左邊巷子裡有馬兵！'], [5, 'sj_hu', 'Club them! Go for the horses\' legs!', '掄起來！打馬腿！'],
          [30, 'soldier', 'The Governor is hit! Arrows in his armour like a hedgehog. He is still on his horse!', '督師中箭了！甲上的箭跟刺蝟一樣——他還在馬上！'],
          [62, 'yuan', 'They waver. Liaodong, forward!', '他們動搖了。遼兵，前進！']] },
      { title: '四 · 運河 · To the canal', goal: 'Drive them back to the canal', text: 'They are giving way. On to the canal.', show: ['canal'], hide: ['gate'],
        start: [['dir', 'yuan', 'hold', 0, -80], ['dir', 'zu', 'hold', -40, -80], ['dir', 'sjf', 'hold', 4, -84], ['release', 'rear'], ['dir', 'rear', 'hold', 0, -70]],
        obj: { all: [{ reach: 'canal' }, { survive: 50 }] }, limit: 300, fail: 'The attack stalled in the suburb.',
        at: [[28, ['break', 'amba']], [30, ['break', 'hooge']], [44, ['break', 'rear']]],
        waves: [],
        say: [[2, 'lookout', 'Their rearguard is standing in the street!', '他們的殿後在街上站住了！'], [6, 'sj_hu', 'Forward, but together. A chasing line is a broken line.', '前進，但別散。追的人最容易散。'], [45, 'lookout', 'They are over the canal! They are running!', '他們過河了！跑了！'],
          [48, 'sj_tian', 'We beat them. We actually beat them!', '我們打贏了。真打贏了！'], [52, 'sj_gao', 'This time.', '這一回。']] },
    ],
    win: 'The Jin were driven back from the Guangqu Gate.',
  },
  // ----- chapter three: Changshan, the relief of Dalinghe, autumn 1631 -----
  sj3: {
    title: '長山 · Changshan', year: 'October 1631', battle: 'field', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sj3',
    bdef: { name: 'Changshan', jp: '長山', when: 'October 1631', biome: 'autumn', fog: 0.18 },
    brief: 'Zu Dashou is starving in Dalinghe. Zhang Chun\'s relief army has crossed the Xiaoling River and camped on a long hill behind a square of carts. Your gun team holds the north side.',
    start: [4, -4, 0],
    zones: [{ key: 'carts', x: 4, z: 12, r: 10, name: 'The north carts' }, { key: 'river', x: 0, z: -134, r: 15, name: 'The Xiaoling River' }],
    forts: cartRow(18, [-17, -12, -7, 7, 12, 17]).concat(cartCol(-21, [-12, -7, -2, 3, 8, 13]), cartCol(21, [-12, -7, -2, 3, 8, 13])),
    labels: { cannon4: ['Red cannon (Ujen Cooha)', '紅衣砲'] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [4, -4, 0], dir: ['hold', 4, 0], stay: true },
      zhang: { team: 0, name: 'Zhang Chun', zh: '張春', army: ['rifle_imp', 'ashigaru', 'gatling'], at: [0, -16, 0], dir: ['hold', 0, -10], officer: 2, stay: true },
      songwei: { team: 0, name: 'Song Wei', zh: '宋偉', army: ['rifle_imp', 'samurai', 'ashigaru'], at: [26, -10, 0], dir: ['hold', 26, -4], stay: true },
      wuxiang: { team: 0, name: 'Wu Xiang', zh: '吳襄', army: ['cavalry', 'cavalry'], at: [-36, -18, 0], dir: ['hold', -36, -12], stay: true },
      guns: { team: 1, name: 'The red cannon', zh: '烏真超哈砲', army: ['cannon4', 'cannon4', 'cannon4', 'rifle_sho'], at: [0, 84, PI], reserve: true, stay: true, dir: ['hold', 0, 64] },
      hong: { team: 1, name: 'Hong Taiji\'s banners', zh: '皇太極', army: ['samurai', 'samurai', 'archer', 'shinsengumi', 'cavalry', 'archer'], at: [0, 138, PI], reserve: true },
      east: { team: 1, name: 'The Plain Yellow banner', zh: '正黃旗', army: ['samurai', 'samurai', 'shinsengumi', 'cavalry'], at: [138, 20, -PI / 2], reserve: true },
      left: { team: 1, name: 'Mongol horse', zh: '蒙古騎', army: ['byakkotai', 'cavalry'], at: [-138, 40, PI / 2], reserve: true },
      right: { team: 1, name: 'Jin horse', army: ['cavalry'], at: [138, -60, -PI / 2], reserve: true, n: 6 },
    },
    phases: [
      { title: '一 · 車營 · The cart camp', goal: 'Stand to behind the north carts', text: 'A square of carts on the long hill.', show: ['carts'],
        start: [['dir', 'sjf', 'hold', 4, 12]],
        obj: { all: [{ reach: 'carts' }, { survive: 40 }] },
        say: [[6, 'zhang', 'Zu Dashou has eaten his horses. Then worse. We reach him tomorrow.', '祖大壽已經殺馬而食，然後……更糟。明天我們就到。'],
          [15, 'sj_hu', 'Zhang Chun. A civil official, sixty years old, in armour. He walked the whole line last night.', '張春。文官，六十歲了，穿著甲。昨晚他把整條線都走了一遍。'],
          [22, 'sj_ma', 'Carts chained. Mules fed. Me too, a bit.', '車連好了。騾子餵了。我也吃了一點。'], [32, 'sj_lin', 'Dry your match. There\'s mist off the river.', '火繩烤乾。河上起霧了。']] },
      { title: '二 · 紅衣砲 · Their guns', goal: 'Keep your head down and hold the carts', text: 'Heavy guns on the ridge. Get down.',
        start: [['release', 'guns']],
        obj: { survive: 70 }, at: [[48, ['wound', 6]], [44, ['release', 'hong']], [45, ['dir', 'hong', 'hold', 4, 22]]],
        say: [[3, 'lookout', 'Guns! The Jin have guns on the ridge!', '砲！金人在嶺上有砲！'],
          [9, 'sj_song', 'Red cannon, cast this year in Shenyang by Han craftsmen. Our own art, turned on us.', '紅衣砲。今年在瀋陽鑄的，漢人工匠鑄的。我們的手藝，打我們自己。'],
          [20, 'sj_hu', 'Down! Behind the carts! Let them waste powder.', '趴下！躲車後面！讓他們費藥。'], [49, 'sj_hu', 'A gun has burst! Ours! Pull him back!', '又一門炸了——我們的！拖回來！'],
          [60, 'zhang', 'Gunners, stand up! Foot soldiers are coming on behind their guns.', '銃手，起來！砲後面有步兵上來了！']] },
      { title: '三 · 風 · The wind turns', goal: 'Hold the cart wall and club them when they reach you', text: 'The wind turns the smoke onto the camp.',
        start: [['release', 'left'], ['dir', 'hong', 'hold', 4, 16], ['dir', 'left', 'hold', -30, 0], ['break', 'wuxiang']],
        obj: { survive: 90 }, waves: [[65, 'east', ['hold', 20, 0]]],
        say: [[2, 'lookout', 'Wu Xiang\'s horse is leaving! The cavalry is riding off!', '吳總兵的馬兵走了！騎兵跑了！'], [6, 'sj_qian', 'There goes the cavalry. Of course it does.', '騎兵走了。當然走了。'],
          [10, 'sj_hu', 'Let them go. Carts and guns. That is all we ever had.', '讓他們走。車和銃。我們從來就只有這些。'], [40, 'sj_lin', 'Load in the smoke, by feel! As we drilled!', '煙裡摸著裝！跟練的一樣！'],
          [76, 'soldier', 'The east side is broken! They are in the camp!', '東邊破了！他們進營了！']] },
      { title: '四 · 潰 · Break out', goal: 'Get your team down the hill to the river', text: 'The camp is lost. Down to the river.', show: ['river'], hide: ['carts'],
        start: [['dir', 'sjf', 'hold', 0, -130], ['break', 'zhang'], ['calm', 'hong', 16], ['calm', 'guns', 10], ['calm', 'left', 16], ['calm', 'east', 16], ['dir', 'songwei', 'hold', 10, -100]],
        obj: { extract: 'river' }, limit: 420, fail: 'The banners closed the ring around the hill.',
        waves: [[10, 'right', ['hold', 30, -92]]], at: [[4, ['promote']], [11, ['calm', 'right', 30]]],
        say: [[1, 'soldier', 'Zhang Chun is taken! They have the Intendant!', '張監軍被俘了！'], [13, 'lookout', 'Horsemen between us and the river!', '河邊有馬兵擋著！']] },
    ],
    win: 'You got down to the Xiaoling River.',
  },
  }; })();
// </sj-missions>
if (typeof SIM !== 'undefined') Object.assign(SIM.MISSIONS, SJ_MISSIONS);

// ---------- the team ----------
// slot order = the squad's places: 0 the team chief, 1 you, then the rest. New drafts fill the places of the dead.
const SR = [
  { k: 'sj_hu', zh: '胡老鐵', en: 'Hu Laotie', t: 'team chief · 隊長 · twenty years on the Xuanfu frontier' },
  { k: 'sjme', zh: '李順', en: 'Li Shun', t: 'three-eyed gun · 三眼銃手' },
  { k: 'sj_tian', zh: '田小鷹', en: 'Tian Xiaoying', t: 'three-eyed gun · 17 · born by the Chongwen Gate' },
  { k: 'sj_lin', zh: '林阿水', en: 'Lin Ashui', t: 'bird-gun instructor · 鳥銃教師 · from Zhangzhou' },
  { k: 'sj_ma', zh: '馬大車', en: 'Ma Dache', t: 'cart driver · 車夫 · a Hui of Wanping' },
  { k: 'sj_zhao', zh: '趙獨眼', en: 'One-Eye Zhao', t: 'powder man · 火藥匠' },
  { k: 'sj_song', zh: '宋秀才', en: 'Song the Scholar', t: 'three-eyed gun · failed the exams four times' },
  { k: 'sj_wu', zh: '武二愣', en: 'Wu Erleng', t: 'three-eyed gun · a farm boy from Baoding' },
  { k: 'sj_qian', zh: '錢串子', en: 'Qian "String-of-Cash"', t: 'three-eyed gun · sells anything' },
  { k: 'sj_gao', zh: '高老槍', en: 'Old Gao', t: 'kuaiqiang gun · 快槍 · came back from Sarhu' },
  // new drafts, in the order they are sent
  { k: 'sj_n1', zh: '孫小毛', en: 'Sun Xiaomao', t: 'new draft · says he is 18 · from Tongzhou', draft: 1 },
  { k: 'sj_n3', zh: '杜三更', en: 'Du Sangeng', t: 'new draft · was a night watchman', draft: 1 },
  { k: 'sj_n4', zh: '葛鐵匠', en: 'Ge the Smith', t: 'new draft · a smith from the Ministry of Works', draft: 1 },
  { k: 'sj_n6', zh: '何順', en: 'He Shun', t: 'new draft · an apprentice with debts', draft: 1 },
  { k: 'sj_n5', zh: '曹阿四', en: 'Cao Asi', t: 'new draft · trained by the Portuguese at Dengzhou', draft: 2 },
  { k: 'sj_n2', zh: '白大', en: 'Bai Da', t: 'new draft · a Mongol of the Xuanfu garrison', draft: 2 },
  // commanders, met in person
  { k: 'sjf', zh: '崔英', en: 'Captain Cui Ying', t: 'company captain · 把總', guest: true },
  { k: 'mangui', zh: '滿桂', en: 'Man Gui', t: 'regional commander of Datong · 大同總兵', guest: true },
  { k: 'yuan', zh: '袁崇煥', en: 'Yuan Chonghuan', t: 'Governor of Jiliao · 督師 · held Ningyuan in 1626', guest: true },
  { k: 'zu', zh: '祖大壽', en: 'Zu Dashou', t: 'Liaodong general · 總兵', guest: true },
  { k: 'zhang', zh: '張春', en: 'Zhang Chun', t: 'intendant of the relief army · 監軍道 · sixty years old', guest: true },
];
const SLOOK = {
  sj_hu: { h: 1.04, brows: 'knit', beard: 'longmous', grey: true, scar: true, skin: 0xb88c66 },
  sjme: { h: 1.0, brows: 'thin', skin: 0xd8b08a },
  sj_tian: { h: 0.88, brows: 'high', young: true, rosy: true, skin: 0xe8c6a2 },
  sj_lin: { h: 0.95, brows: 'thin', beard: 'goatee', skin: 0xb07e58 },
  sj_ma: { h: 1.13, brows: 'thick', beard: 'full', bulk: true, bigNose: true, skin: 0xc49a72 },
  sj_zhao: { h: 0.97, brows: 'sad', beard: 'stubble', patch: true, scar: true, skin: 0xc8a07a },
  sj_song: { h: 1.02, brows: 'thin', beard: 'mous', skin: 0xe2c4a0 },
  sj_wu: { h: 1.1, brows: 'thick', bulk: true, rosy: true, grin: true, skin: 0xcd9f78 },
  sj_qian: { h: 0.93, brows: 'high', beard: 'mous', grin: true, skin: 0xd6a880 },
  sj_gao: { h: 0.99, brows: 'sad', beard: 'longmous', longBeard: true, grey: true, skin: 0xb48a62 },
  sj_n1: { h: 0.84, brows: 'high', young: true, skin: 0xdcb48e },
  sj_n3: { h: 1.0, brows: 'knit', beard: 'stubble', skin: 0xc49a72 },
  sj_n4: { h: 1.06, brows: 'thick', beard: 'full', bulk: true, skin: 0xb88c66 },
  sj_n6: { h: 0.96, brows: 'thin', young: true, skin: 0xe2bc96 },
  sj_n5: { h: 1.01, brows: 'thick', beard: 'mous', skin: 0xc8a07a },
  sj_n2: { h: 1.08, brows: 'thick', beard: 'goatee', rosy: true, skin: 0xb07e58 },
  sjf: { h: 1.05, brows: 'knit', beard: 'mous', skin: 0xc49a72 },
  mangui: { h: 1.12, brows: 'thick', beard: 'full', scar: true, bulk: true, rosy: true, skin: 0xa87a54 },
  yuan: { h: 0.98, brows: 'knit', beard: 'longmous', longBeard: true, skin: 0xc8a07a },
  zu: { h: 1.06, brows: 'thick', beard: 'full', skin: 0xbf9670 },
  zhang: { h: 0.96, brows: 'sad', beard: 'longmous', longBeard: true, grey: true, skin: 0xd8b088 },
};
const SKEY = 'mingShenji';
const sIdx = (k) => SR.findIndex(r => r.k === k);
const sRow = (k) => SR.find(r => r.k === k);
function sDress(u, ci) { const r = SR[ci]; if (!u || !r) return; u.look = Object.assign({ id: r.k }, SLOOK[r.k] || {}); if (state.renderer) state.renderer.colorFigure(u.id, u); }
function sjFresh() { const s = { v: 1, sj: true, stage: 'drill', name: { zh: '李順', en: 'Li Shun' }, me: 'sjme', team: SR.slice(0, 10).map(r => r.k), alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, newMen: [], lost: [] };
  for (const r of SR) { s.alive[r.k] = !r.draft; s.bond[r.k] = 0; } return s; }
function sjName() { const r = sRow('sjme'); if (ZS && ZS.name && ZS.me === 'sjme') { r.zh = ZS.name.zh; r.en = ZS.name.en; } else if (ZS && ZS.oldName) { r.zh = ZS.oldName.zh; r.en = ZS.oldName.en; } }
// who says the scripted lines (commanders by their group id)
const SJWHO = { sjf: ['崔英', 'Captain Cui Ying'], mangui: ['滿桂', 'General Man Gui'], hou: ['侯世祿', 'General Hou Shilu'], yuan: ['袁崇煥', 'Governor Yuan Chonghuan'], zu: ['祖大壽', 'General Zu Dashou'], zhang: ['張春', 'Intendant Zhang Chun'], wuxiang: ['吳襄', 'General Wu Xiang'] };
function sjActivate() {
  ZKEY = SKEY; Object.assign(ZHOOK, { talk: sjTalk, sleep: sjSleep, finish: sjFinish, who: SJWHO, chatter: sjChatter, event: sjEvent });
}
function sjGo(scene) { try { localStorage.setItem('mingShenjiGo', scene); } catch (e) { } location.reload(); }
// the dead stay dead: before a new chapter every empty place gets a named draft
function sjRefill(ch) {
  ZS.newMen = [];
  for (let i = 0; i < ZS.team.length; i++) { const k = ZS.team[i]; if (ZS.alive[k]) continue;
    const used = new Set(ZS.team); const pool = SR.filter(r => r.draft && !used.has(r.k) && !ZS.fate[r.k]).sort((a, b) => (a.draft === ch ? -1 : 0) - (b.draft === ch ? -1 : 0));
    const nr = pool[0]; if (!nr) continue; if (!ZS.lost.includes(k)) ZS.lost.push(k); ZS.team[i] = nr.k; ZS.alive[nr.k] = true; ZS.newMen.push(nr.k); }
  // you always stand in the second place; the senior living man is chief
  const mi = ZS.team.indexOf(ZS.me); if (mi > 1) { const t = ZS.team[1]; ZS.team[1] = ZS.me; ZS.team[mi] = t; } else if (mi === 0) { const t = ZS.team[1]; ZS.team[1] = ZS.me; ZS.team[0] = t; }
}
const sjLost = () => ZS.lost.filter(k => k !== ZS.me && !ZS.alive[k] && sRow(k));
const sjFile = () => ZS.team.filter(k => k !== ZS.me && ZS.alive[k]);

// ---------- cards ----------
const SJ_INTRO = [
  { title: '神機營 · The Divine Engine Division', year: '1410 – 1629', p: ['When the Yongle Emperor\'s armies came back from Annam, they brought its gunners home. In Beijing he founded a camp of firearms: the Shenjiying, the Divine Engine Division.',
    'Two hundred years on, half the names on its rolls are empty. But some teams still drill.'], zh: '永樂中，平交阯，得神機槍砲法，特置神機營肄習。— 《明史·兵志》' },
  { title: '三眼銃 · The three-eyed gun', year: 'The weapons of the camp', p: ['Your team carries the <b>three-eyed gun</b>: three short iron barrels on a wooden pole, fired one after another, then swung as a club.',
    'Zhao Shizhen warned the court that half these guns are cast so badly they burst.'] },
  { title: '你 · You', year: 'The autumn of 1629 · 崇禎二年', p: ['You are a gunner from a Wanping soldier family, in a three-eyed-gun team of ten. Tomorrow is the autumn review on the drill ground outside the walls.'],
    html: '<p><label style="font:14px sans-serif">Your name <input id="sjNm" value="李順" maxlength="6" style="width:6em;font-size:15px"> <input id="sjNmEn" value="Li Shun" maxlength="14" style="width:8em;font-size:15px"></label></p>',
    onNext: () => { const zh = ($('sjNm').value || '李順').trim().slice(0, 6), en = ($('sjNmEn').value || 'Li Shun').trim().slice(0, 14); ZS.name = { zh, en }; zSave(); }, btn: 'To the drill ground →' },
];
function sjNewMenCard() { if (!ZS.newMen.length) return null;
  return { title: '新兵 · New men', year: `${ZS.newMen.length} sent to fill the team`, p: ZS.newMen.map(k => { const r = sRow(k); return `<b>${r.zh} ${r.en}</b> — ${r.t.replace(/^new draft · /, '')}.`; }).concat(['Talk to them in camp. They take the places of the men who did not come back.']) }; }
function sjTeamList(where) { return `<ul>${ZS.team.concat(ZS.lastDead || []).filter((k, i, a) => a.indexOf(k) === i).map(k => { const r = sRow(k); const f = k === ZS.me ? 'out' : ZS.fate[k] || 'out'; const nm = k === ZS.me ? `${ZS.name.zh} ${ZS.name.en} (you)` : `${r.zh} ${r.en}`; return `<li class="${f}">${f === 'out' ? '<b>✓</b>' : f === 'dead' ? '✝' : '?'} ${nm} — ${f === 'out' ? where : f === 'dead' ? 'killed' : 'missing'}</li>`; }).join('')}</ul>`; }

// ---------- camp ----------
const SJPROPS = [['pot', 8, -5, 0], ['banner', -3, -7.5, 0.3, '神'], ['rack', -7.5, -3.5, 0.9], ['wagon', 13, -11, 0.5], ['wagon', -12, -9, -0.4], ['log', 0, 2.9, 0], ['log', -2.6, -1.4, 1.1], ['log', 2.7, -1.2, -1.1]];
const SJGUEST = ['mangui', 'yuan', 'zhang'];
function sjCampCfg(night) {
  const beds = [], npcs = [], n = ZS.team.length;
  ZS.team.forEach((k, i) => { const a = -0.5 + (i / n) * Math.PI * 1.55 + Math.PI * 0.55; beds.push([+(Math.sin(a) * 6.3).toFixed(2), +(Math.cos(a) * 6.3).toFixed(2), +(a + Math.PI).toFixed(3), false]); });
  const file = sjFile(); file.forEach((k, i) => { const a = (i / Math.max(1, file.length)) * Math.PI * 2 + 0.4, r = 2.4 + (i % 2) * 0.5; const x = Math.sin(a) * r, z = Math.cos(a) * r;
    npcs.push({ role: 'lead', x: +x.toFixed(2), z: +z.toFixed(2), yaw: +Math.atan2(-x, -z).toFixed(3), ci: sIdx(k), pose: (i % 3 === 2) ? 'stand' : 'squat' }); });
  const g = SJGUEST[night]; if (g) npcs.push({ role: 'lead', x: -3.4, z: -6.2, yaw: +Math.atan2(3.4, 6.2).toFixed(3), ci: sIdx(g), pose: 'stand' });
  const mb = beds[ZS.team.indexOf(ZS.me)] || beds[1]; ZC = { bed: [mb[0], mb[1]], map: {}, R: SR, night, chatT: 6 };
  return { type: 'rifle_spencer', team: 0, fires: [[0, 0], [8, -5]], tents: [[-10, 4, 1.7, 2.5, 2.1], [-4.5, 10.5, 1.7, 2.5, 2.1], [4.5, 10.5, 1.7, 2.5, 2.1], [10, 4, 1.7, 2.5, 2.1]], props: SJPROPS, bedrolls: beds, npcs, me: { x: 0.6, z: -6.6, yaw: 0, role: 'lead' } };
}
const SJCAMPTXT = [['營 · Outside Shunyi', 'The night before the Jin. Walk among your team (look at a man and press E to talk). When you are ready, lie down on your bedroll.'],
  ['營 · Under the Guangqu Gate', 'Inside the outer city, under the gate. Talk with your team (E). Your bedroll is by the cart.'],
  ['營 · The long hill', 'The camp on the hill above the Xiaoling River. Talk with your team (E), then lie down on your bedroll.']];
function sjCamp(night) {
  const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, connected: true }];
  const camp = sjCampCfg(night); startGame({ seed, battle: 'zcamp', mode: 'campaign', mission: 'zcamp', camp, players: pl }, 0, null, 1);
  for (const u of state.sim.units) if (u.camp) { ZC.map[u.id] = u.ci; sDress(u, u.ci); } { const me = state.sim.units[state.sim.players[0].heroId]; sDress(me, sIdx(ZS.me)); me.def = Object.assign({}, me.def, { hp: me.def.hp * 1.5 }); me.hp = me.def.hp; }
  document.body.classList.add('sjstory');
  MUSIC.play('menu'); MUSIC.setIntensity(0.15); AUDIO.setFire(0.6); $('army').hidden = true;
  setTimeout(() => storyCard(SJCAMPTXT[night][1], SJCAMPTXT[night][0]), 900);
}
function sjSleep() {
  const N = ZC.night;
  const D = [['黎明 · Dawn', 'November 1629', ['Snow before light. The carts are greased, the match-cord coiled under coats. Chief Hu walks down the team and taps each gun once, as if counting.'], 'battle1'],
    ['黎明 · Dawn', 'The twentieth day of the eleventh month', ['The gate behind you stays shut. Smoke from the suburb; drums from the south.'], 'battle2'],
    ['黎明 · Dawn', 'October 1631', ['Mist on the river below the hill. Somewhere north, Dalinghe is waiting.'], 'battle3']][N];
  ZS.stage = D[3]; zSave(); zCards([{ title: D[0], year: D[1], p: D[2], btn: 'Stand to →' }], () => sjGo(D[3]));
}
function sjChatter(night) {
  return [[['這雪下得早。', 'Early snow this year.'], ['明天走多少里？', 'How far tomorrow?'], ['誰還有火石？', 'Anyone got a flint?'], ['京城的城牆，從這兒還看得見。', 'You can still see the city wall from here.']],
    [['城門不給我們開。', 'They won\'t open the gate for us.'], ['城裡在罵袁督師。', 'They\'re cursing the Governor in the city.'], ['……', '...'], ['火藥乾不乾？', 'Is the powder dry?']],
    [['大凌河城裡吃人。', 'They\'re eating people in Dalinghe.'], ['吳總兵的騎兵在那邊烤火。', 'Wu Xiang\'s riders are warming themselves over there.'], ['這山叫長山。好長。', 'They call this the long hill. It is long.'], ['想家了。', 'I miss home.']]][night] || [['……', '...']];
}

// ---------- dialogue ----------
function sjTalk(k, night) {
  const S = ZS, nm = S.name, lost = sjLost().map(x => sRow(x)), alive = (x) => S.alive[x] && S.team.includes(x), n = S.team.filter(x => S.alive[x]).length;
  const D = sjDraftTalk(k, night); if (D) return D;
  const T0 = {
    sj_hu: { g: ['睡吧。明天站車後面，比站校場難。', 'Sleep. Standing behind a cart is harder than standing on the drill ground.'], t: [
      { q: 'How do we fight horsemen with these?', a: [['三眼銃，近了才打得著。五十步內，三管連發。', 'The three-eyed gun only hits close. Inside fifty paces, three barrels one after another.'], ['打完了別裝藥——掄。馬腿、馬臉、人手。', 'When it\'s spent, don\'t reload: swing. Horse legs, horse faces, men\'s hands.']] },
      { q: 'You were on the frontier?', bond: 1, a: [['宣府，二十年。蒙古人一年來兩回。', 'Xuanfu, twenty years. The Mongols came twice a year.'], ['那時候我跟田小鷹一樣傻。……你多看著他點。', 'I was as green as Tian Xiaoying then. ...Keep an eye on him.']] }] },
    sj_tian: { g: ['我爹說，神機營三輩子沒出過京城。', 'My father says the Divine Engine Division hasn\'t left the capital in three generations.'], t: [
      { q: 'Why did you join?', a: [['軍戶。我爹是，我爺爺是。名冊上寫著，就得來。', 'A soldier family. My father, my grandfather. It\'s in the rolls, so I came.'], ['我爹的名字也在冊上，可他在崇文門賣了二十年豆腐。', 'My father\'s name is on the rolls too. He\'s sold bean curd at the Chongwen Gate for twenty years.']] },
      { q: 'Stay by me tomorrow.', bond: 1, flag: 'promise', a: [['……好。你放，我就放。', '...All right. When you fire, I fire.']] }] },
    sj_lin: { g: ['北方的火繩，一受潮就啞。', 'Northern match-cord. Goes dead the moment it\'s damp.'], t: [
      { q: 'Where did you learn guns?', bond: 1, a: [['漳州，海船上。佛郎機、鳥銃，紅毛人、倭寇都打過。', 'Zhangzhou, on the sea junks. Falangji and bird-guns. I\'ve fought the red-haired Dutch and the wokou both.'], ['鳥銃要瞄。三眼銃不用瞄：靠近了就打得著。', 'A bird-gun you aim. A three-eyed gun you don\'t: get close enough and it hits.']] },
      { q: 'What is the three-rank drill?', a: [['戚少保《練兵實紀》：頭排放，退後裝；二排上，三排等。', 'Marshal Qi\'s drill: the front rank fires and falls back to load, the second steps up, the third waits.'], ['銃永遠不空。這就是全部的秘密。', 'The line is never empty. That\'s the whole secret.']] }] },
    sj_ma: { g: ['這是偏廂車。一面有板，擋得住箭。', 'This is a side-box cart. Boarded on one side. Stops arrows.'], t: [
      { q: 'Tell me about the carts.', a: [['車連起來就是一道牆。銃在車後，馬兵在兩翼。', 'Chain them and they\'re a wall. Guns behind the carts, horse on the wings.'], ['我只管騾子。騾子不打仗，騾子只想回家。', 'I just look after the mules. Mules don\'t fight. Mules only want to go home.']] },
      { q: 'Give the mule some of your bread.', bond: 1, a: [['（他咧嘴一笑，掰了一半給你，一半給騾子。）', '(He grins, breaks his own in half, and gives one half to you and one to the mule.)']] }] },
    sj_zhao: { g: ['藥是我配的。硝七成五，硫一成，炭一成五。', 'I mixed the powder. Seventy-five saltpetre, ten sulphur, fifteen charcoal.'], t: [
      { q: 'How did you lose the eye?', bond: 1, a: [['工部鑄的銃。管壁薄得像紙，第一響就炸了。', 'A gun from the Ministry of Works foundry. Walls thin as paper. It burst on the first shot.'], ['趙士楨說得對：銃少不怕，就怕爛。', 'Zhao Shizhen had it right: few guns is bad, bad guns are worse.']] }] },
    sj_song: { g: ['你知道徐光啟大人嗎？', 'Have you heard of Lord Xu Guangqi?'], t: [
      { q: 'Who is he?', a: [['翰林，跟利瑪竇學過算學。他要用西洋大砲，請澳門的葡萄牙砲手來教。', 'A Hanlin scholar who studied mathematics with Matteo Ricci. He wants Western cannon, and Portuguese gunners from Macao to teach us.'], ['朝中有人說用夷人是恥辱。輸給金人就不恥辱？', 'Some at court say using foreigners is shameful. And losing to the Jin isn\'t?']] },
      { q: 'Why does a scholar carry a gun?', bond: 1, a: [['考了四回，沒中。家裡窮。餉銀按月發……有時候按月。', 'Four tries at the exams. My family\'s poor. The pay comes every month... some months.']] }] },
    sj_wu: { g: ['這銃比我家的連枷還重。', 'This gun is heavier than our flail at home.'], t: [
      { q: 'Are you afraid?', a: [['怕啥？金人也是人。挨一棍子都疼。', 'Of what? The Jin are men. Every man hurts when you hit him with a stick.']] },
      { q: 'Show me how you swing it.', bond: 1, a: [['（他把三眼銃掄了一圈，差點打翻了鍋。大家都笑了。）', '(He swings the gun round and nearly knocks over the pot. Everyone laughs.)']] }] },
    sj_qian: { g: ['要菸葉嗎？三個錢。給你算兩個。', 'Tobacco? Three coins. For you, two.'], t: [
      { q: 'Where do you get all this?', a: [['冊上三千人，校場上一千。空額的餉，總得有人花。', 'Three thousand on the rolls, a thousand on the drill ground. Somebody has to spend the empty men\'s pay.']] },
      { q: 'Buy the tobacco.', bond: 1, a: [['好兄弟！明天你要是倒了，我不收錢，把你拖回來。', 'Brother! If you go down tomorrow, I\'ll drag you back free of charge.']] }] },
    sj_gao: { g: ['快槍。一管，一響。我用了三十年。', 'Kuaiqiang. One barrel, one shot. Thirty years I\'ve carried it.'], t: [
      { q: 'You were at Sarhu?', bond: 1, a: [['杜松那一路。渾河水齊腰，火藥全濕了。', 'Du Song\'s column. The Hun River up to our waists. Every grain of powder got wet.'], ['那天晚上我躺在死人堆裡，一直躺到天亮。', 'That night I lay among the dead until it was light.']] }] },
    mangui: { g: ['你是銃手？手穩不穩？', 'You a gunner? Steady hands?'], t: [
      { q: 'Steady enough, General.', bond: 1, a: [['好。我是蒙古人，我爹放羊。我不認字，可我認得金人的旗。', 'Good. I\'m a Mongol; my father herded sheep. I can\'t read, but I know the Jin banners.'], ['明天你們打前面的，我的人打後面的。別把我的人當金人打了。', 'Tomorrow you shoot the ones in front, my men ride down the rest. Don\'t shoot my men by mistake.']] },
      { q: 'They say you have forty wounds.', a: [['四十二。都在前面。背上一處也沒有。', 'Forty-two. All in front. Not one on my back.']] }] },
  };
  const T1 = {
    sj_hu: { g: [`回來${n}個。`, `${n} of us came back.`], t: [
      { q: 'What happens tomorrow?', a: [['金兵到廣渠門。我們站在城外，城門不會為我們開。', 'The Jin reach the Guangqu Gate. We stand outside the wall. The gate won\'t open for us.']] }].concat(lost.slice(0, 2).map(r => ({ q: `About ${r.en}...`, bond: 1, a: [[`${r.zh}……`, `${r.en}...`], ['名字我記下了。回城我去他家。', 'I\'ve written his name down. When we get back, I\'ll go to his family.']] }))) },
    sj_tian: { g: S.flags.promise ? ['你說話算話。我也是。', 'You kept your word. So did I.'] : ['我放了三銃，一個都沒打中。', 'I fired three barrels and didn\'t hit a thing.'], t: [
      { q: 'Nobody hits anything the first time.', bond: 1, a: [['胡頭兒也這麼說。他說第二回就打中了。', 'Chief Hu says that too. He says you hit the second time.']] }] },
    sj_lin: { g: ['你裝藥快了。', 'You load faster now.'], t: [
      { q: 'What did we do wrong at Shunyi?', a: [['沒錯。三千銃，一千騎兵，對面一萬五。', 'Nothing. Three thousand guns and a thousand horse, against fifteen thousand.'], ['戚少保說，車營要有步兵、騎兵、砲。我們只有車和銃。', 'Marshal Qi said a cart camp needs foot, horse and cannon. We had carts and guns.']] }] },
    sj_zhao: { g: S.flags.helpedZhao ? ['你把我拖回來的。這隻手是你的。', 'You dragged me back. This hand is yours.'] : ['手還在。五個指頭，我數過了。', 'The hand\'s still there. Five fingers. I counted.'], t: [
      { q: 'Will you still mix the powder?', bond: 1, a: [['我不配，誰配？……少裝一點，記住。', 'If not me, who? ...Less powder. Remember.']] }] },
    sj_song: { g: ['城裡在傳，袁督師跟金人有約。', 'They\'re saying in the city that the Governor has a pact with the Jin.'], t: [
      { q: 'Do you believe it?', a: [['他兩天跑了兩百里來救京城。有約的人不會這麼跑。', 'He rode two hundred li in two days to save the capital. A man with a pact doesn\'t ride like that.'], ['可皇上信什麼，不由我們。', 'But what the Emperor believes isn\'t up to us.']] }] },
    sj_wu: { g: ['我那一棍子，把一個馬兵打下來了！', 'That one swing knocked a horseman clean off!'], t: [{ q: 'Are you all right?', a: [['不疼。……就是晚上睡不著。', 'Doesn\'t hurt. ...Just can\'t sleep.']] }] },
    sj_qian: { g: ['菸葉漲價了。打仗嘛。', 'Tobacco\'s gone up. It\'s the war.'], t: [{ q: 'You dragged a man back yesterday.', bond: 1, a: [['……別到處說。壞了我的名聲。', '...Don\'t spread it around. You\'ll ruin my reputation.']] }] },
    sj_gao: { g: ['又是一場雪。', 'Snow again.'], t: [{ q: 'It wasn\'t Sarhu. We got out.', bond: 1, a: [['是。這回我沒躺在死人堆裡。', 'True. This time I didn\'t lie among the dead.']] }] },
    sj_ma: { g: ['車丟了七輛。騾子……我不想說。', 'Seven carts lost. The mules... I don\'t want to talk about it.'], t: [{ q: 'You saved the rest.', a: [['剩下的都牽回來了。一頭沒扔。', 'I led back every one that was left. Didn\'t leave one.']] }] },
    yuan: { g: ['京營的兵？順義打過了？', 'Capital troops? You were at Shunyi?'], t: [
      { q: 'We were, Governor.', bond: 1, a: [['打過一回的兵，比沒打過的值十個。', 'A man who has fought once is worth ten who haven\'t.'], ['寧遠我們靠城和砲守住。明天沒有城，只有你們的銃和我的馬。', 'We held Ningyuan with walls and cannon. Tomorrow there are no walls. Only your guns and my horses.']] },
      { q: 'People in the city say...', a: [['我知道他們說什麼。', 'I know what they say.'], ['仗打完了再說。', 'We\'ll talk when the fighting is done.']] }] },
  };
  const T2 = {
    sj_hu: { g: ['袁督師……凌遲。京城的人搶著買他的肉。', 'The Governor... death by slicing. People in the capital paid for pieces of his flesh.'], t: [
      { q: 'Then why are we here?', bond: 1, a: [['祖大壽在大凌河城裡。三萬人，吃馬，吃人。', 'Zu Dashou is in Dalinghe. Thirty thousand people, eating horses, eating men.'], ['他是袁督師的人。我們去救他。就這樣。', 'He was the Governor\'s man. We go to get him out. That\'s all.']] }].concat(lost.slice(0, 2).map(r => ({ q: `Do you still think of ${r.en}?`, a: [['每天。', 'Every day.']] }))) },
    sj_song: { g: ['孫元化大人在登州練兵，用西洋砲和葡萄牙教官。', 'Lord Sun Yuanhua drills men at Dengzhou with Western guns and Portuguese instructors.'], t: [
      { q: 'Will they come?', a: [['聽說孔有德帶著登州兵往這邊來了。', 'They say Kong Youde is marching this way with the Dengzhou men.'], ['毛文龍的舊部，遼東人。不知道能不能信。', 'One of Mao Wenlong\'s old officers. A Liaodong man. I don\'t know if he can be trusted.']] }] },
    sj_lin: { g: ['火繩泡過桐油了。這回不怕霧。', 'I soaked the match in tung oil. Mist won\'t kill it this time.'], t: [
      { q: 'Teach me to load in the dark.', bond: 1, a: [['手記得，眼睛就不用。倒藥、壓實、裝子、點火門。再來。', 'When your hands remember, your eyes don\'t matter. Powder, ram, ball, priming. Again.'], ['（你們練到你閉著眼也不灑藥。）', '(You drill until you can do it eyes shut without spilling a grain.)']] }] },
    sj_tian: { g: ['我二十了。', 'I\'m twenty now.'], t: [{ q: 'You\'ve changed.', a: [['我爹的豆腐攤，去年被兵搶了。我們自己的兵。', 'My father\'s bean-curd stall was looted last year. By soldiers. Our own.']] }] },
    sj_zhao: { g: ['這回的銃是新鑄的。我一門一門試過。', 'These guns are newly cast. I tested every one.'], t: [{ q: 'Any bad ones?', a: [['三門。我拿錘子砸了。工部的人罵我。讓他罵。', 'Three. I smashed them with a hammer. The Ministry man cursed me. Let him.']] }] },
    sj_wu: { g: ['我娶媳婦了！去年冬天。', 'I got married! Last winter.'], t: [{ q: 'Congratulations!', bond: 1, a: [['她說，回來給她帶塊遼東的狐皮。', 'She said to bring her back a Liaodong fox fur.']] }] },
    sj_qian: { g: ['這回不賣了。送你。', 'Not selling this time. It\'s yours.'], t: [{ q: 'What\'s wrong?', a: [['大凌河城裡吃人。我們要是也被圍了呢？', 'They\'re eating people in Dalinghe. What if we get surrounded too?']] }] },
    sj_gao: { g: ['這是我最後一仗。打完回家。', 'This is my last fight. After this I go home.'], t: [{ q: 'Where is home?', bond: 1, a: [['通州。有個侄子。還有棵棗樹。', 'Tongzhou. A nephew. And a jujube tree.']] }] },
    sj_ma: { g: ['車比兩年前多了。騾子也胖了。', 'More carts than two years ago. Fatter mules too.'], t: [{ q: 'That\'s good.', a: [['好什麼。車多了，跑不動。', 'What\'s good about it? More carts, and we can\'t run.']] }] },
    zhang: { g: ['你們是神機營的？我是張春。', 'You\'re the Divine Engine men? I\'m Zhang Chun.'], t: [
      { q: 'Sir, aren\'t you a civil official?', bond: 1, a: [['六十歲的書生，穿著甲走路。好笑吧。', 'A sixty-year-old scholar walking about in armour. Funny, isn\'t it.'], ['可朝廷讓我來，我就來。祖大壽在等。', 'But the court sent me, so I came. Zu Dashou is waiting.']] },
      { q: 'Will we win?', a: [['吳襄的騎兵、宋偉的步兵、你們的銃。四萬人。', 'Wu Xiang\'s horse, Song Wei\'s foot, your guns. Forty thousand.'], ['……就看騎兵走不走。', '...It depends on whether the cavalry stays.']] }] },
  };
  const T = [T0, T1, T2][night] || T0; return T[k] || (alive(k) ? { g: ['……', '...'], t: [] } : null);
}
function sjDraftTalk(k, night) {
  const r = sRow(k); if (!r || !r.draft) return null; const fresh = ZS.newMen.includes(k);
  const D = {
    sj_n1: [['我十八。真的。', 'I\'m eighteen. Really.'], [{ q: 'Where are you from?', a: [['通州。房子燒了。金兵燒的。', 'Tongzhou. The house burned. The Jin burned it.']] }, { q: 'Stay behind me.', bond: 1, a: [['……嗯。', '...Mm.']] }]],
    sj_n3: [['我打了十年更。現在打銃。', 'Ten years beating the night watch. Now I fire guns.'], [{ q: 'Is it different?', bond: 1, a: [['打更是叫人醒。打銃是叫人睡。', 'The watch wakes people up. A gun puts them to sleep.']] }]],
    sj_n4: [['銃管我會修。', 'I can fix a barrel.'], [{ q: 'Look at mine?', bond: 1, a: [['給我。……誰鑄的？管口都歪了。', 'Give it here. ...Who cast this? The muzzle\'s crooked.']] }]],
    sj_n6: [['……別問我為什麼來。', '...Don\'t ask why I joined.'], [{ q: 'Why did you join?', a: [['欠了賭債。當兵，債主就找不到我了。', 'Gambling debts. In the army, they can\'t find me.']] }]],
    sj_n5: [['我在登州跟葡萄牙人學過放砲。', 'I learned gunnery from the Portuguese at Dengzhou.'], [{ q: 'What are they like?', bond: 1, a: [['鼻子高，說話快，砲打得準。量角度用一把銅尺。', 'High noses, fast talkers, straight shooters. They measure the angle with a brass quadrant.']] }]],
    sj_n2: [['我是蒙古人。我替大明打仗。', 'I\'m a Mongol. I fight for the Ming.'], [{ q: 'Why?', bond: 1, a: [['滿總兵也是蒙古人。我跟著他。他死在永定門外，我就跟著你們。', 'General Man Gui was a Mongol too. I followed him. He died outside the Yongding Gate, so now I follow you.']] }]],
  }[k]; if (!D) return null;
  return { g: fresh ? D[0] : ['還活著。', 'Still alive.'], t: fresh ? D[1] : [] };
}

// ---------- battles ----------
const SJBAT = {
  battle1: ['sj1', '順義 · Shunyi', 'November 1629. Your team marches behind the carts. Stay with your team: the chief calls the drill. Fire when the drum rolls, then swing the empty gun.', [['sjf', 'sjf'], ['mangui', 'mangui']]],
  battle2: ['sj2', '廣渠門 · The Guangqu Gate', 'The twentieth day of the eleventh month. Before the Guangqu Gate with Yuan Chonghuan\'s Liaodong men. Fire by ranks; never all at once.', [['sjf', 'sjf'], ['yuan', 'yuan'], ['zu', 'zu']]],
  battle3: ['sj3', '長山 · Changshan', 'October 1631. The cart camp on the long hill. Hold the north carts with your team.', [['sjf', 'sjf'], ['zhang', 'zhang']]],
  drill: ['sjdrill', '校場 · The drill ground', 'The autumn review. Stay with your team and march on the drum. Left mouse fires the three barrels one after another; R reloads.', [['sjf', 'sjf']]],
};
function sjBattle(scene) {
  const B = SJBAT[scene], M = SJ_MISSIONS[B[0]]; const seed = (Math.random() * 0x7fffffff) | 0, pl = [{ name: ZS.name.zh || 'You', team: 0, connected: true }];
  startGame({ seed, battle: M.battle, mode: 'campaign', mission: B[0], players: pl }, 0, null, 1);
  const sim = state.sim, me = sim.players[0], q = sim.squads[me.soldierSq];
  ZB = { map: {}, R: SR, sq: q.id, first: me.heroId, cur: ZS.me, fell: false, ch2: true, sj: true, scene };
  const used = {}; used[me.heroId] = 1; ZB.map[me.heroId] = sIdx(ZS.me);
  ZS.team.forEach((k, i) => { if (k === ZS.me || !ZS.alive[k]) return; let id = q.unitIds[i]; if (id === undefined || used[id]) id = q.unitIds.find(x => !used[x]); if (id === undefined) return; used[id] = 1; ZB.map[id] = sIdx(k); });
  for (const uid in ZB.map) sDress(sim.units[uid], ZB.map[uid]);
  for (const [g, k] of B[3]) { const G = sim.mg[g]; if (G) sDress(sim.units[sim.players[G.p].heroId], sIdx(k)); }
  document.body.classList.add('sjstory'); sjVM(); sjProps(M);
  if (scene === 'drill') setTimeout(() => storyCard(B[2], B[1]), 6500);
}
function sjEvent(ev) {
  const sim = state.sim; if (!ZB || !ZB.sj || !sim) return;
  if (ev.t === 'possess' || ev.t === 'zcarry') sjVM();
  if (ev.t === 'msay' && ev.who === 'sj_lin' && /^(Fire|First rank)/.test(ev.text)) banner(ev.text.startsWith('Fire') ? '放 · Fire!' : '舉銃 · Present!', ev.text.startsWith('Fire') ? 'Left mouse: three barrels, one after another · R to reload' : 'Raise your gun and wait for the drum', 3);
  if (ev.t === 'zhelp' && ev.id === ZB.wounded && ZB.scene === 'battle1' && ZB.map[ev.id] === sIdx('sj_zhao')) ZS.flags.helpedZhao = true;
  if (ev.t === 'zpromote' && ev.p === state.localIdx) { const n = SPEECH.nameOf(ev.chief); const q = sim.squads[ev.sq]; const w = q.unitIds.map(id => sim.units[id]).find(u => !u.dead && u.ctrl < 0 && !u.wounded);
    if (w) setTimeout(() => SPEECH.say(w.id, `${n ? n.zh : '隊長'}死了！${ZS.name.zh}，你帶隊！`, `${n ? n.en : 'The chief'} is dead! ${ZS.name.en}, you lead us!`, { prio: 3, dur: 5 }), 1500); }
}
// the three-eyed gun in first person: three short barrels bound to the end of a wooden pole, no stock (the musket
// model it replaces stays for any man who is not a three-eyed gunner)
function sjVM() {
  const r = state.renderer, sim = state.sim; if (!r || !r.vmRifle || !sim) return; const h = sim.units[sim.players[state.localIdx].heroId];
  if (!r.vmSj) { const g = new THREE.Group(), iron = new THREE.MeshLambertMaterial({ color: 0x3e4044 }), wood = new THREE.MeshLambertMaterial({ color: 0x5a3a20 }), band = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
    const bx = (w, hh, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); o.position.set(x, y, z); return o; };
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.4, 7), iron); b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, -0.5); g.add(b); }
    for (const z of [-0.33, -0.5, -0.67]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 9), band); ring.rotation.x = Math.PI / 2; ring.position.z = z; g.add(ring); }
    g.add(bx(0.034, 0.034, 0.95, wood, 0, -0.004, 0.15)); g.add(bx(0.012, 0.012, 0.012, new THREE.MeshBasicMaterial({ color: 0xff8a3a }), 0.03, 0.03, -0.3));
    g.visible = false; r.vmRifle.add(g); r.vmSj = g; }
  const on = !!(h && h.type === 'rifle_spencer'); r.vmSj.visible = on; for (const c of r.vmRifle.children) if (c !== r.vmSj) c.visible = !on && c !== r.vmXbar ? true : c.visible && !on;
}
// what the boxes of the sim stand for: mantlets in a 神機營 mission are side-box carts (偏廂車), the board toward the
// enemy, two wheels and the shafts behind; in the drill, straw butts stand where the zone 'butts' is
function sjProps(M) {
  const r = state.renderer, sim = state.sim; if (!r || !r.scene) return; const wood = new THREE.MeshLambertMaterial({ color: 0x5a3c22 }), dark = new THREE.MeshLambertMaterial({ color: 0x2e2218 }), red = new THREE.MeshLambertMaterial({ color: 0x8a2a1e });
  const sx = M.start[0], sz = M.start[1];
  for (const b of sim.boxes) { if (b.kind !== 'mantlet') continue; const g = new THREE.Group(); const along = b.hw >= b.hd; g.position.set(b.x, terrainH(b.x, b.z), b.z);
    const back = along ? Math.sign(sz - b.z) || -1 : Math.sign(sx - b.x) || 1; g.rotation.y = along ? (back > 0 ? 0 : Math.PI) : (back > 0 ? Math.PI / 2 : -Math.PI / 2);
    const L = Math.max(b.hw, b.hd) * 2;
    const add = (geo, m, x, y, z, rx, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; o.castShadow = true; g.add(o); };
    add(new THREE.BoxGeometry(L * 0.92, 0.12, 1.3), wood, 0, 0.72, 0.85);
    for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 12), dark, s * L * 0.38, 0.58, 0.95, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.08, 0.08, 1.9), wood, s * 0.45, 0.62, 2.4); }
    add(new THREE.BoxGeometry(L * 0.94, 0.16, 0.05), red, 0, 1.38, -0.02);
    r.scene.add(g); }
  const z = M.zones && M.zones.find(q => q.key === 'butts'); if (z) for (let i = -2; i <= 2; i++) { const g = new THREE.Group(), x = z.x + i * 5; g.position.set(x, terrainH(x, z.z), z.z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), wood); post.position.y = 0.8; g.add(post);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 14), new THREE.MeshLambertMaterial({ color: 0xc8a860 })); t.rotation.x = Math.PI / 2; t.position.y = 1.4; g.add(t);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 12), red); eye.rotation.x = Math.PI / 2; eye.position.y = 1.4; g.add(eye); r.scene.add(g); }
}
// a battle is over: who came out, who is dead, who is missing
function sjFinish(winner) {
  const sim = state.sim, h = localHero(); if (!ZB) return; const M = sim.mission, won = winner === M.side, scene = ZB.scene;
  const z = sim.missionZone(scene === 'battle1' ? 'road' : scene === 'battle3' ? 'river' : 'nowhere'); const near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r;
  const fate = {};
  for (const uid in ZB.map) { const r = SR[ZB.map[uid]]; if (!r) continue; const u = sim.units[uid]; if (u.dead) { fate[r.k] = 'dead'; continue; }
    const inZ = z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 12, left = u.wounded && u.helpedBy < 0 && !near(u, 5) && !inZ;
    fate[r.k] = left && (z || !won) ? 'lost' : (!z ? won || near(u, 14) : inZ || near(u, won ? 30 : 12)) ? 'out' : 'lost'; }
  for (const k of ZB.deadMe || []) fate[k] = 'dead';
  if (fate[ZS.me] === undefined) fate[ZS.me] = h && !h.dead ? 'out' : 'dead';
  if (M.soft) for (const k in fate) fate[k] = 'out';
  // you go on as whoever you became
  if (ZB.cur && ZB.cur !== ZS.me && ZB.cur !== 'stranger' && fate[ZS.me] === 'dead') { const nk = ZB.cur; ZS.oldName = ZS.name; sjName(); ZS.me = nk; ZS.name = { zh: sRow(nk).zh, en: sRow(nk).en }; fate[nk] = 'out'; }
  ZS.lastDead = [];
  for (const k in fate) { ZS.fate[k] = fate[k]; ZS.alive[k] = fate[k] === 'out'; if (fate[k] !== 'out') ZS.lastDead.push(k); }
  const B = { drill: ['camp0', null], battle1: ['ch2', 'back in Beijing'], battle2: ['ch3', 'before the gate'], battle3: ['end', 'across the river'] }[scene];
  ZS.stage = B[0]; zSave();
  if (scene === 'drill') { zCards([{ title: '出征 · Marching out', year: 'The eleventh month of 1629', p: ['The Jin army is through the Great Wall. Zunhua falls; the old general Zhao Shuaijiao, riding to its relief from Shanhai Pass, is killed outside it.', 'The capital camps are sent out to meet the raiders before they reach the walls. Your company goes with Man Gui\'s horsemen from Datong, north-east to Shunyi.'], btn: 'Make camp →' }], () => sjGo('camp0')); return; }
  const outN = ZS.team.filter(k => ZS.alive[k]).length, names = ZS.lastDead.map(k => sRow(k)).filter(Boolean);
  $('resultTitle').textContent = won ? M.win.split('.')[0] : 'Cut off'; $('resultTitle').className = won ? 'win' : 'lose';
  $('resultText').innerHTML = `${won ? M.win : 'The ring closed, but a few of you crawled out after dark.'} ${outN} of ten came out.${names.length ? ' Lost: ' + names.map(r => r.k === ZS.me ? ZS.name.en : r.en).join(', ') + '.' : ''}`;
  $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
  $('btnNext').onclick = () => { $('result').hidden = true; zCards(SJAFTER[scene]().concat([{ title: '隊 · Your team', year: `${outN} of ten`, html: sjTeamList(B[1]), btn: B[0] === 'end' ? 'Epilogue →' : 'Go on →' }]), () => sjGo(B[0])); };
}
const SJAFTER = {
  battle1: () => [{ title: '順義 · Shunyi', year: 'The eleventh month of 1629', p: ['Man Gui and Hou Shilu were beaten at Shunyi and fell back on Beijing. The Jin rode on, burning the villages around the capital.', 'Three days later Yuan Chonghuan arrived with nine thousand Liaodong horsemen. He had ridden round the Jin army to put himself between it and the city.'], zh: '滿桂、侯世祿戰順義，敗績。' }],
  battle2: () => [{ title: '廣渠門 · The Guangqu Gate', year: 'The twentieth day of the eleventh month', p: ['Yuan Chonghuan\'s men fought outside the Guangqu Gate from noon until dark, and drove the Jin back over the canal. Yuan was in the fight himself; arrows stuck in his armour like the quills of a hedgehog.', 'The same day, outside the Desheng Gate, Man Gui fought under the walls, and the guns on the wall fired into his own men.'], zh: '兩肋如蝟，賴有重甲不透。' },
    { title: '督師 · The Governor', year: 'Winter 1629 – autumn 1630', p: ['The Jin let it be known that Yuan had a secret pact with them. Ten days after the battle the Chongzhen Emperor called Yuan into the palace and arrested him. Zu Dashou took the Liaodong army and rode east in fury. Man Gui was given the command and was killed outside the Yongding Gate a few weeks later.',
      'In 1630 the Ming took back Zunhua and the walled towns the Jin had held inside the Wall. In the eighth month Yuan Chonghuan was executed by slicing in the market of the capital.'] },
    { title: '西洋砲 · Western guns', year: '1630 – 1631', p: ['Xu Guangqi had his way. A company of Portuguese gunners came up from Macao with their cannon and helped hold Zhuozhou. His student Sun Yuanhua went to Dengzhou on the Shandong coast to train Ming gunners in the Western way, with Liaodong refugees under Kong Youde and Geng Zhongming.',
      'In the eighth month of 1631 Hong Taiji came back and besieged Zu Dashou in the new fort of Dalinghe, beyond Jinzhou. A relief army was gathered. Your team marched with it.'] }],
  battle3: () => [{ title: '長山 · Changshan', year: 'The ninth month of 1631', p: ['Zhang Chun\'s relief army was attacked on the hill at Changshan. For the first time the Jin brought red cannon of their own, cast in Shenyang that year by Han craftsmen under Tong Yangxing. Wu Xiang\'s cavalry fled; the cart camp was broken.',
      'Zhang Chun was captured. He refused to kneel to Hong Taiji. A month later, after the people inside had eaten the dead, Zu Dashou surrendered Dalinghe, then talked his way back to Jinzhou and its walls.'], zh: '張春被執，不屈。' }],
};
const SJ_END = () => [
  { title: '吳橋 · Wuqiao', year: 'The winter of 1631–1632', p: ['Kong Youde\'s men from Dengzhou, sent north to relieve Dalinghe, mutinied in the snow at Wuqiao, unpaid and starving. They turned back and took Dengzhou itself, with its Western cannon and the gunners Sun Yuanhua had trained. Sun Yuanhua was executed for it.',
    'In 1633 Kong Youde and Geng Zhongming sailed to the Jin with their ships, their guns, and men who knew how to serve them. From then on the Jin had both.'], zh: '孔有德、耿仲明以登州砲手航海降金。' },
  { title: '終 · The end', year: '1641 – 1644', p: ['At Songshan and Jinzhou in 1641–1642 the Jin, now the Qing, broke the last Ming field army in the north with cannon of their own. In 1644 the Ming dynasty fell.', `${ZS.team.filter(k => ZS.alive[k]).length} of your team walked home from the long hill. ${ZS.alive.sj_gao ? 'Old Gao went back to Tongzhou and his jujube tree.' : ''}`] },
];
function sjEnd() { ZS.stage = 'done'; zSave(); zCards(SJ_END().concat([{ title: '隊 · Your team', year: 'The end of the campaign', html: sjTeamList('came home'), btn: 'Back to the menu' }]), () => location.reload()); }

// ---------- flow ----------
function sjStart(scene) {
  sjActivate(); ZS = zLoad(); if (!ZS || !ZS.sj) ZS = sjFresh(); sjName();
  $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
  if (scene === 'ch2' || scene === 'ch3') { const ch = scene === 'ch2' ? 1 : 2; if (ZS.refilled !== scene) { sjRefill(ch); ZS.refilled = scene; zSave(); }
    const nc = sjNewMenCard(); const C = scene === 'ch2' ? [{ title: '京城 · The capital', year: 'The eleventh month of 1629', p: ['The gates of the inner city are shut. Your company is quartered in the outer city, under the Guangqu Gate, where the road comes in from the east.'] }] : [{ title: '大凌河 · Dalinghe', year: 'Autumn 1631', p: ['Two years on. The team marches north-east up the coast road, past Shanhai Pass and Ningyuan, with Zhang Chun\'s relief army.'] }];
    zCards(C.concat(nc ? [nc] : []), () => { ZS.stage = scene === 'ch2' ? 'camp1' : 'camp2'; zSave(); sjStart(ZS.stage); }); return; }
  if (/^camp[012]$/.test(scene)) return sjCamp(+scene[4]);
  if (SJBAT[scene]) return sjBattle(scene);
  if (scene === 'end' || scene === 'done') return sjEnd();
}
function sjMenu() {
  const host = $('zheCta'); if (!host || $('sjCta')) return;
  const st = document.createElement('style'); st.textContent = '#sjCta { display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 14px 16px; margin: -6px 0 16px; border: 1px solid #5a6474; background: linear-gradient(100deg, rgba(40,52,74,.22), rgba(40,30,20,.06)); flex-wrap: wrap; } #sjCta b { font-size: 19px; letter-spacing: .04em; } #sjCta small { display: block; color: var(--ink2); max-width: 64ch; margin-top: 3px; } #sjCta .btns { display: flex; gap: 8px; } body.sjstory #mobj { display: none !important; }';
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'sjCta';
  d.innerHTML = '<div><b>神機營 · The Divine Engine Division</b><small>A story campaign, 1629–1631. A three-eyed-gun team of the capital\'s firearms camp marches out against the Jin raid on Beijing. Volleys behind the cart wall, the gun swung as a club when they close, and the men beside you.</small></div><div class="btns"><button class="btn primary" id="btnSj" type="button">Begin</button><button class="btn" id="btnSjNew" type="button" hidden>New</button></div>';
  host.after(d);
  let s = null; try { s = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { }
  const cont = s && s.sj && s.stage && s.stage !== 'done'; $('btnSj').textContent = cont ? 'Continue' : s ? 'Play again' : 'Begin'; $('btnSjNew').hidden = !cont;
  const begin = () => { AUDIO.init(); AUDIO.play('ui'); sjActivate(); ZS = sjFresh(); zSave(); $('menu').hidden = true; zCards(SJ_INTRO, () => { ZS.stage = 'drill'; zSave(); sjStart('drill'); }); };
  $('btnSj').onclick = () => { if (cont) { AUDIO.init(); AUDIO.play('ui'); sjStart(s.stage); } else begin(); };
  $('btnSjNew').onclick = begin;
}
sjMenu();
{ let go = null; try { go = localStorage.getItem('mingShenjiGo'); localStorage.removeItem('mingShenjiGo'); } catch (e) { } if (go) setTimeout(() => sjStart(go), 60); }
