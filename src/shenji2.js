// ===================== 神機營 · part two: glory, the fall, and revenge =====================
// Four more battles for the Divine Engine Division, threaded through the first three: the Zunhua road before Shunyi
// (an ambush that works, then Zhao Shuaijiao's death), the Yongding Gate after the Guangqu Gate (Man Gui's camp broken
// at dawn by Jin in Ming coats, the fall), and in 1630 the revenge: the red cannon open Luanzhou, and Amin's column is
// caught with its loot and captives in the Lengkou pass. Each has a choice that the story remembers.
// Sources: 《明史》 趙率教傳、滿桂傳、孫承宗傳; 《崇禎長編》; 《清太宗實錄》 天聰三年–四年; 談遷《國榷》.
// <sj2-missions>
const SJ2_MISSIONS = (() => { const PI = Math.PI; const cartRow = (z, xs) => xs.map(x => [x, z, 2, 0.5, 1.5, 'mantlet']); const stakes = (z, x0, x1, gap) => { const o = []; for (let x = x0; x < x1; x += 3) { if (gap && Math.abs(x + 1.5 - gap[0]) < gap[1]) continue; o.push([x + 1.5, z, 1.5, 0.45, 1.5, 'palisade']); } return o; };
  return {
  // ----- before Shunyi: a powder train for Zunhua, with Zhao Shuaijiao's riders from Shanhai Pass -----
  sjzun: {
    title: '遵化道 · The Zunhua road', year: 'November 1629', battle: 'toba', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sjz',
    bdef: { name: 'The Sha River ford', jp: '沙河', when: 'November 1629', biome: 'winter', fog: 0.3 },
    brief: 'Zunhua is besieged. The court sends a powder train to the town with a picked company of the Divine Engine Division, and old Zhao Shuaijiao rides from Shanhai Pass with four thousand horse to break the siege.',
    start: [0, -112, 0],
    zones: [{ key: 'bank', x: 10, z: -30, r: 10, name: 'The south bank' }, { key: 'south', x: 0, z: -132, r: 15, name: 'The road back' }],
    forts: cartRow(-46, [-9, -4, 4, 9]),
    labels: { samurai: ['Bordered White foragers', '鑲白旗'], cavalry: ['Ajige\'s horse', '阿濟格騎'] },
    choices: { 1: [[['explode', 0, -46, 8, 210], ['calm', 'jinmain', 6], ['say', 'sj_zhao', 'Fire in the hole!']], [['release', 'chase'], ['dir', 'chase', 'hold', 0, -70], ['dir', 'carts', 'hold', 0, -126]]] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [0, -112, 0], dir: ['hold', 0, -104], stay: true },
      carts: { team: 0, name: 'The powder train', zh: '火藥車', army: ['ashigaru'], at: [-6, -116, 0], dir: ['hold', -4, -52], stay: true, n: 8 },
      zhao: { team: 0, name: 'Zhao Shuaijiao', zh: '趙率教', army: ['cavalry', 'cavalry', 'cavalry'], at: [-34, -108, 0], dir: ['hold', -30, -60], officer: 2, stay: true },
      jinf: { team: 1, name: 'A Jin forage party', zh: '金兵採糧', army: ['samurai', 'archer', 'samurai'], at: [-10, 96, PI], reserve: true, n: 10 },
      jinmain: { team: 1, name: 'Ajige\'s Bordered White', zh: '阿濟格', army: ['cavalry', 'samurai', 'samurai', 'archer', 'cavalry'], at: [0, 138, PI], reserve: true },
      flank: { team: 1, name: 'Khorchin riders', zh: '科爾沁', army: ['byakkotai', 'cavalry'], at: [138, 30, -PI / 2], reserve: true },
      chase: { team: 1, name: 'Jin horsemen', army: ['cavalry'], at: [-138, -40, PI / 2], reserve: true, n: 6 },
    },
    phases: [
      { title: '一 · 火藥車 · The powder train', goal: 'March with the carts to the river', text: 'Powder for Zunhua. Down to the ford.', show: ['bank'],
        start: [['dir', 'sjf', 'hold', 10, -30], ['dir', 'carts', 'hold', 0, -50]],
        obj: { all: [{ reach: 'bank' }, { survive: 30 }] },
        say: [[5, 'zhao', 'Capital gunners and a powder train. Keep up, or I leave you to the Jin.', '京營的銃手，還有火藥車。跟上，跟不上就留給金人。'],
          [12, 'sj_hu', 'Zhao Shuaijiao. Sixty, and he rode three hundred li in three days. He held Shanhai Pass when everyone else ran.', '趙率教。六十歲了，三天跑了三百里。別人都跑的時候，他守住了山海關。'],
          [20, 'sj_ma', 'Powder carts and ice. If a wheel slips, nobody stand behind me.', '火藥車加上冰。輪子一滑，誰也別站我後面。'],
          [26, 'sj_tian', 'Is that smoke over there? Is that Zunhua?', '那邊是煙嗎？是遵化？']] },
      { title: '二 · 伏 · The ambush', goal: 'Let the foragers into the water, then fire', text: 'Jin foragers coming down to the ford. Down, and wait.',
        start: [['release', 'jinf'], ['dir', 'jinf', 'hold', 0, -6], ['calm', 'jinf', 7], ['dir', 'sjf', 'hold', 12, -28], ['dir', 'zhao', 'hold', -40, -40]],
        obj: { defeat: ['jinf'], frac: 0.7 }, limit: 170, fail: 'The foragers got away to warn the banners.',
        at: [[34, ['calm', 'jinf', 40]]],
        say: [[2, 'lookout', 'Men on the far bank! Jin, leading horses, loaded with sacks!', '對岸有人！金兵，牽著馬，馱著口袋！'], [5, 'sj_hu', 'Down. Behind the bank. Let them into the water.', '趴下。躲在河岸後面。讓他們下水。'],
          [16, 'sj_lin', 'Not yet... they are in the middle... their boots are full of ice...', '還不到……到河中間了……靴子裡全是冰……'],
          [24, 'sj_hu', 'Now! Fire!', '就是現在！放！'], [44, 'sj_wu', 'Ha! They did not even get their bows off their backs!', '哈！他們連弓都沒來得及摘！'],
          [58, 'zhao', 'Good! The capital can fight after all. On to Zunhua!', '好！京營也能打。向遵化！']] },
      { title: '三 · 趙總兵 · Zhao Shuaijiao', goal: 'Hold the ford while the horse rides on', text: 'Zhao rides on for Zunhua. Hold the ford behind him.',
        start: [['dir', 'zhao', 'hold', 0, 120], ['calm', 'zhao', 60], ['dir', 'sjf', 'hold', 2, -40], ['dir', 'carts', 'hold', 0, -48]],
        obj: { survive: 60 }, at: [[16, ['kill', 'zhao']], [17, ['release', 'jinmain']], [18, ['dir', 'jinmain', 'hold', 0, -40]], [30, ['release', 'flank']], [31, ['dir', 'flank', 'hold', 30, -46]]],
        say: [[2, 'zhao', 'Gunners, keep the ford open behind me. I will be back with the Zunhua garrison by dark.', '銃手，把渡口給我守住。天黑前我帶遵化的兵回來。'],
          [14, 'lookout', 'Banners on the hill north of the river! Hundreds of them!', '河北的山上有旗！好幾百面！'],
          [18, 'soldier', 'General Zhao is down! The whole column is cut to pieces in the valley!', '趙總兵落馬了！整支馬隊在谷裡被砍光了！'],
          [24, 'sj_gao', 'Like Sarhu. They wait until you are in the valley.', '跟薩爾滸一樣。等你進了谷才動手。'],
          [27, 'sj_ma', 'The carts! We can\'t run with the carts! What do we do with the powder?', '車！拉著車跑不動！火藥怎麼辦？']] },
      { title: '四 · 退 · Back down the road', goal: 'Get your team back down the road south', text: 'Zunhua is lost. Back down the road.', show: ['south'], hide: ['bank'],
        start: [['dir', 'sjf', 'hold', 0, -128], ['calm', 'jinmain', 24], ['calm', 'flank', 24]],
        obj: { extract: 'south' }, limit: 330, fail: 'The Jin horse cut the road.',
        say: [[2, 'sj_hu', 'Walk. Wounded in the middle. Guns outward. Do not run.', '走。傷的在中間，銃口朝外。別跑。'],
          [20, 'sj_song', 'Zhao Shuaijiao held Shanhai Pass for ten years. He lasted one morning here.', '趙率教守了山海關十年。在這兒只撐了一個早上。']] },
    ],
    win: 'You got back down the Zunhua road.',
  },
  // ----- after the Guangqu Gate: the Yongding Gate, the seventeenth day of the twelfth month -----
  sjyong: {
    title: '永定門 · The Yongding Gate', year: 'January 1630', battle: 'bjgate', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sjy',
    bdef: { name: 'The Yongding Gate', jp: '永定門', when: 'January 1630', biome: 'winter', fog: 0.42 },
    brief: 'Yuan Chonghuan is in prison. Man Gui, the Mongol general, has the command and forty thousand men camped outside the Yongding Gate behind a fence of stakes. The Emperor wants a battle. Man Gui does not.',
    start: [6, 70, PI],
    zones: [{ key: 'fence', x: 6, z: 56, r: 11, name: 'The stake fence' }, { key: 'wall', x: 6, z: 128, r: 14, name: 'Under the wall' }],
    forts: stakes(48, -42, 54, [6, 4]).concat(cartRow(54, [-12, -7, 19, 24])),
    labels: { samurai: ['Men in Ming coats', '穿明衣者'] },
    choices: { 1: [[['dir', 'fake', 'attack'], ['calm', 'fake', 80]], [['release', 'inside'], ['dir', 'inside', 'hold', 8, 56], ['calm', 'inside', 20], ['wound', 6]], [['dir', 'fake', 'attack'], ['calm', 'fake', 80], ['say', 'sj_hu', 'No password! Fire!']]] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [6, 70, PI], dir: ['hold', 6, 62], stay: true },
      mangui: { team: 0, name: 'Man Gui', zh: '滿桂', army: ['cavalry', 'samurai', 'rifle_imp', 'samurai'], at: [-18, 72, PI], dir: ['hold', -18, 58], officer: 3, stay: true },
      sun: { team: 0, name: 'Sun Zude', zh: '孫祖壽', army: ['ashigaru', 'rifle_imp', 'samurai'], at: [34, 72, PI], dir: ['hold', 34, 58], officer: 2, stay: true },
      hei: { team: 0, name: 'Hei Yunlong', zh: '黑雲龍', army: ['ashigaru', 'rifle_imp'], at: [-42, 74, PI], dir: ['hold', -40, 58], stay: true },
      fake: { team: 1, name: 'Men in Ming coats', zh: '穿明衣者', army: ['samurai', 'samurai', 'archer'], at: [6, -60, 0], reserve: true },
      inside: { team: 1, name: 'Men in Ming coats', zh: '穿明衣者', army: ['samurai', 'samurai'], at: [40, 40, -PI / 2], reserve: true, n: 12 },
      hong: { team: 1, name: 'Hong Taiji\'s banners', zh: '皇太極', army: ['samurai', 'cavalry', 'samurai', 'archer', 'samurai', 'cavalry'], at: [0, -138, 0], reserve: true },
      left: { team: 1, name: 'The Plain White banner', zh: '正白旗', army: ['cavalry', 'samurai', 'byakkotai'], at: [-138, 40, PI / 2], reserve: true },
      chase: { team: 1, name: 'Jin horsemen', army: ['cavalry', 'cavalry'], at: [138, 90, -PI / 2], reserve: true },
    },
    phases: [
      { title: '一 · 柵 · The stake fence', goal: 'Stand to behind the stakes', text: 'Fog before dawn. Stand to behind the stakes.', show: ['fence'],
        start: [['dir', 'sjf', 'hold', 6, 56]],
        obj: { all: [{ reach: 'fence' }, { survive: 36 }] },
        say: [[5, 'mangui', 'The Emperor wants a battle. A battle with what? Half these men have never seen a Jin.', '皇上要打。拿什麼打？這裡一半的人沒見過金人。'],
          [13, 'sj_song', 'They say the Governor is in the Embroidered Uniform prison. They say he will not live.', '聽說督師關在錦衣衛的獄裡。聽說活不成了。'],
          [21, 'sj_qian', 'Zu Dashou took the Liaodong men and rode home when he heard. Fifteen thousand of them. Just like that.', '祖大壽一聽說，帶著遼兵就回去了。一萬五千人。說走就走。'],
          [30, 'sj_hu', 'Fog. I hate fog. You hear them before you see them.', '霧。我最恨霧。先聽見，後看見。']] },
      { title: '二 · 明衣 · Men in our coats', goal: 'Watch the fog. Decide.', text: 'Men in Ming red coming out of the fog.',
        start: [['release', 'fake'], ['dir', 'fake', 'hold', 6, 40], ['calm', 'fake', 4]],
        obj: { survive: 46 }, at: [[40, ['dir', 'fake', 'attack']], [41, ['calm', 'fake', 80]]],
        say: [[2, 'lookout', 'Men coming in out of the fog! Red coats — ours! Stragglers from Dezhou?', '霧裡有人過來！紅衣——是我們的人！德州的散兵？'],
          [7, 'sj_gao', 'Ours? Walking like that? In step?', '我們的人？這麼走？還踩著步子？']] },
      { title: '三 · 天明 · First light', goal: 'Hold the fence', text: 'The fog lifts. Banners everywhere.',
        start: [['release', 'hong'], ['dir', 'hong', 'hold', 6, 46], ['release', 'left'], ['dir', 'left', 'hold', -30, 56]],
        obj: { survive: 80 }, at: [[52, ['kill', 'mangui']], [58, ['kill', 'sun']], [60, ['break', 'hei']]],
        say: [[1, 'lookout', 'The fog is lifting — banners! On every side!', '霧散了——旗！四面都是！'], [6, 'sj_lin', 'By ranks! First fires, second waits!', '分排！頭排放，二排等！'],
          [22, 'mangui', 'Hold the stakes! If the stakes go, the city goes!', '守住柵欄！柵欄一破，京城就破！'],
          [53, 'soldier', 'Man Gui is down! General Man is dead!', '滿總兵落馬了！滿總兵死了！'],
          [59, 'soldier', 'Sun Zude is killed! Hei Yunlong\'s men are running!', '孫總兵戰死了！黑雲龍的人跑了！'],
          [70, 'sj_hu', 'It\'s gone. The whole camp is gone. To the wall!', '完了。整個營都完了。往城牆跑！']] },
      { title: '四 · 城下 · To the wall', goal: 'Get your team back under the wall', text: 'The camp is broken. To the wall.', show: ['wall'], hide: ['fence'],
        start: [['dir', 'sjf', 'hold', 6, 126], ['calm', 'hong', 22], ['calm', 'left', 22]],
        obj: { extract: 'wall' }, limit: 360, fail: 'The Jin horse rode the camp down before you reached the wall.',
        waves: [[14, 'chase', ['hold', 20, 100]]], at: [[15, ['calm', 'chase', 30]]],
        say: [[2, 'sj_hu', 'Walk! Carry who you can! Don\'t throw the guns!', '走！能抬的抬！銃別扔！'], [14, 'lookout', 'Horsemen on the right, along the ditch!', '右邊溝邊有馬兵！'],
          [30, 'sj_tian', 'Open the gate! Open the gate!', '開門！開門啊！'], [36, 'sj_gao', 'They won\'t. They never do.', '不會開的。從來不開。']] },
    ],
    win: 'You got back under the wall.',
  },
  // ----- 1630: Luanzhou, the red cannon -----
  sjluan: {
    title: '灤州 · Luanzhou', year: 'June 1630', battle: 'hakodate', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sjl',
    bdef: { name: 'Luanzhou', jp: '灤州', when: 'June 1630', biome: 'summer', fog: 0.12 },
    brief: 'Five months after the Yongding Gate, Sun Chengzong has gathered a new army. The Jin still hold four walled towns inside the Great Wall. At Luanzhou the Western red cannon are brought up to the walls.',
    start: [0, -24, 0],
    zones: [{ key: 'battery', x: 0, z: -6, r: 10, name: 'The battery' }, { key: 'gate', x: 0, z: 44, r: 7, name: 'The south gate' }, { key: 'yamen', x: 0, z: 70, r: 9, name: 'The yamen' }, { key: 'north', x: 0, z: 108, r: 10, name: 'The north gate' }],
    forts: cartRow(4, [-16, -11, 11, 16]),
    labels: { samurai: ['Amin\'s bannermen', '阿敏甲兵'] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [0, -24, 0], dir: ['hold', 0, -16], stay: true },
      guns: { team: 0, name: 'The red cannon', zh: '紅夷砲', army: ['armstrong', 'armstrong', 'cannon'], at: [0, -2, 0], dir: ['hold', 0, -2], stay: true },
      zu: { team: 0, name: 'Zu Dashou', zh: '祖大壽', army: ['cavalry', 'samurai', 'samurai', 'ashigaru'], at: [-40, -20, 0], dir: ['hold', -40, -10], officer: 2, stay: true },
      majs: { team: 0, name: 'Ma Shilong', zh: '馬世龍', army: ['samurai', 'ashigaru', 'rifle_imp'], at: [40, -20, 0], dir: ['hold', 40, -10], officer: 2, stay: true },
      sally: { team: 1, name: 'A sally from the gate', zh: '出城', army: ['samurai', 'samurai', 'cavalry'], at: [0, 66, PI], reserve: true },
      town: { team: 1, name: 'The Luanzhou garrison', zh: '灤州守兵', army: ['samurai', 'archer', 'samurai'], at: [0, 76, PI], reserve: true, stay: true, dir: ['hold', 0, 66] },
      rear: { team: 1, name: 'The rearguard at the north gate', zh: '殿後', army: ['samurai', 'archer'], at: [0, 96, PI], reserve: true, stay: true, dir: ['hold', 0, 100] },
    },
    phases: [
      { title: '一 · 紅夷砲 · The red cannon', goal: 'Stand to with the battery', text: 'Western guns against the wall of Luanzhou.', show: ['battery'],
        start: [['dir', 'sjf', 'hold', 0, -6]],
        obj: { all: [{ reach: 'battery' }, { survive: 40 }] },
        say: [[4, 'sj_song', 'Western guns. Xu Guangqi had them sent up from Macao. Look at the bore: you could put your head in it.', '西洋砲。徐光啟從澳門調來的。你看那砲口，頭都塞得進去。'],
          [12, 'sj_hu', 'Five months ago we ran from the Yongding Gate. Today they run. Load.', '五個月前，我們從永定門跑回去。今天輪到他們跑。裝藥。'],
          [20, 'zu', 'Zu Dashou is back. The Governor\'s men are back. Tell the Jin.', '祖大壽回來了。督師的兵回來了。告訴金人。'],
          [30, 'sj_zhao', 'Every time those things fire, my good eye waters.', '那東西每響一次，我這隻好眼睛就流淚。']] },
      { title: '二 · 出城 · The sally', goal: 'Throw back the sally before they spike the guns', text: 'They are coming out of the gate for the guns.',
        start: [['release', 'sally'], ['dir', 'sally', 'hold', 0, -2]],
        obj: { defeat: ['sally'], frac: 0.7 }, limit: 150, fail: 'They spiked the guns.',
        say: [[1, 'lookout', 'The gate is open! They are coming out for the guns!', '城門開了！衝著砲來了！'], [5, 'sj_hu', 'Between them and the guns! Fire at thirty paces, then swing!', '擋在他們和砲中間！三十步放，然後掄！'],
          [26, 'sj_wu', 'Not this time! Not this time!', '這回不行！這回不行！']] },
      { title: '三 · 破門 · The gate', goal: 'Storm the south gate with Zu Dashou', text: 'The gate is broken. In!', show: ['gate'], hide: ['battery'],
        start: [['dir', 'zu', 'hold', 0, 46], ['dir', 'majs', 'hold', 8, 40], ['dir', 'sjf', 'hold', 0, 44], ['release', 'town']],
        obj: { all: [{ reach: 'gate' }, { survive: 30 }] }, limit: 260, fail: 'The assault broke on the gate.',
        say: [[2, 'zu', 'The gate is down! Liaodong, in! Remember the Yongding Gate!', '門破了！遼兵，進！記住永定門！'], [10, 'sj_hu', 'Stay together in the gate! A gate is a throat: you choke in it!', '在門洞裡別散！門洞就是喉嚨，散了就噎死！'],
          [24, 'sj_qian', 'For the Governor, eh? For Yuan?', '為督師？為袁督師？'], [27, 'sj_hu', 'For whoever you like. Keep moving.', '為誰都行。往前走。']] },
      { title: '四 · 衙門 · The yamen', goal: 'Take the yamen in the middle of the town', text: 'Through the streets to the yamen.', show: ['yamen'], hide: ['gate'],
        start: [['dir', 'zu', 'hold', 0, 70], ['dir', 'sjf', 'hold', 2, 68], ['dir', 'majs', 'hold', 10, 66]],
        obj: { hold: 'yamen', t: 18 }, limit: 300, fail: 'The street fighting bogged down.',
        at: [[40, ['break', 'town']]],
        say: [[3, 'sj_tian', 'Where are the people? Where are all the people?', '人呢？城裡的人都去哪了？'], [12, 'sj_lin', 'In the well. Don\'t look in the well.', '在井裡。別往井裡看。'],
          [20, 'sj_hu', 'Keep your eyes on the doors. Not on the dead.', '眼睛看門。別看死人。']] },
      { title: '五 · 北門 · The north gate', goal: 'Push through to the north gate', text: 'They are leaving by the north gate.', show: ['north'], hide: ['yamen'],
        start: [['release', 'rear'], ['dir', 'zu', 'hold', 0, 104], ['dir', 'sjf', 'hold', 0, 104]],
        obj: { all: [{ reach: 'north' }, { survive: 20 }] }, limit: 260, fail: 'They held the north gate until dark.',
        at: [[30, ['break', 'rear']]],
        say: [[2, 'lookout', 'They are running out of the north gate!', '他們從北門跑了！'], [20, 'sj_wu', 'We took a town! We actually took a town!', '我們打下一座城！真打下來了！'],
          [26, 'sj_gao', 'Took it back.', '是奪回來。']] },
    ],
    win: 'Luanzhou was retaken.',
  },
  // ----- 1630: the Lengkou pass, Amin's column leaving through the Wall -----
  sjleng: {
    title: '冷口 · The Lengkou pass', year: 'June 1630', battle: 'abudali', side: 0, soldier: { group: 'sjf' }, hidden: true, ch: 'sjk',
    bdef: { name: 'The Lengkou pass', jp: '冷口', when: 'June 1630', biome: 'spring', fog: 0.15 },
    brief: 'Amin has abandoned Yongping and Qian\'an and is taking his column out through the Great Wall at Lengkou, with the loot of four towns and a long file of captives. Your company has climbed the east slope of the pass in the night.',
    start: [30, -72, 0],
    zones: [{ key: 'ridge', x: 28, z: -26, r: 9, name: 'The east slope' }, { key: 'caps', x: 0, z: -40, r: 9, name: 'The captives' }],
    labels: { samurai: ['Amin\'s bannermen', '阿敏甲兵'], ashigaru: ['Captives from Yongping', '永平被擄百姓'] },
    choices: { 1: [[['goto', 4]], [['goto', 5]]] },
    groups: {
      sjf: { team: 0, name: 'Captain Cui Ying', zh: '崔英', army: ['rifle_spencer'], at: [30, -72, 0], dir: ['hold', 28, -64], stay: true },
      guns: { team: 0, name: 'The bird-gun company', zh: '鳥銃隊', army: ['rifle_imp', 'rifle_imp'], at: [36, -76, 0], dir: ['hold', 36, -66], stay: true },
      majs: { team: 0, name: 'Ma Shilong\'s riders', zh: '馬世龍', army: ['cavalry', 'cavalry'], at: [40, -138, 0], reserve: true, officer: 2 },
      col: { team: 1, name: 'Amin\'s baggage column', zh: '阿敏輜重', army: ['samurai', 'archer', 'samurai'], at: [0, -138, 0], reserve: true },
      guard: { team: 1, name: 'The captives\' guards', zh: '押解', army: ['samurai', 'archer'], at: [-4, -126, 0], reserve: true, n: 10 },
      caps: { team: 0, name: 'Captives from Yongping', zh: '永平百姓', army: ['ashigaru'], at: [4, -128, 0], reserve: true, n: 10, stay: true },
      banner: { team: 1, name: 'Amin\'s rearguard banner', zh: '阿敏後隊', army: ['samurai', 'cavalry', 'samurai'], at: [0, -134, 0], reserve: true, officer: 4 },
      chase: { team: 1, name: 'Jin horse coming back', army: ['cavalry', 'cavalry'], at: [0, 138, PI], reserve: true },
    },
    phases: [
      { title: '一 · 山坡 · The slope', goal: 'Take your place on the east slope', text: 'Up the slope in the dark. No match lit until the word.', show: ['ridge'],
        start: [['dir', 'sjf', 'hold', 28, -26], ['dir', 'guns', 'hold', 34, -18]],
        obj: { all: [{ reach: 'ridge' }, { survive: 26 }] },
        say: [[4, 'sj_hu', 'No light. No talking. When they come, they come under us.', '不許點火。不許說話。他們來，就從我們腳下過。'],
          [12, 'sj_n7', 'They burned Yongping. They threw people down the wells at Qian\'an. I saw.', '他們燒了永平。在遷安把人往井裡扔。我看見了。'],
          [20, 'sj_lin', 'Remember: the captives walk in the middle. Fire at the ones on horses.', '記住：百姓在中間走。打騎馬的。']] },
      { title: '二 · 等 · Wait', goal: 'Let the head of the column pass', text: 'The column comes up the pass. Let the head go by.',
        start: [['release', 'col'], ['dir', 'col', 'hold', 0, 130], ['calm', 'col', 5], ['release', 'guard'], ['dir', 'guard', 'hold', -4, 130], ['calm', 'guard', 5], ['release', 'caps'], ['dir', 'caps', 'hold', 4, 120], ['release', 'banner'], ['dir', 'banner', 'hold', 0, 126], ['calm', 'banner', 5]],
        obj: { survive: 46 },
        say: [[3, 'lookout', 'Here they come. Carts... cattle... silk...', '來了。大車……牛……綢緞……'], [14, 'sj_tian', 'There. Tied in a line. Women. Children.', '那兒。拴成一串。女人。孩子。'],
          [24, 'sj_hu', 'Wait. Wait for the banner. Let the carts go by.', '等。等那面旗。讓車過去。'], [38, 'sj_hu', 'Light your match.', '點火繩。']] },
      { title: '三 · 伏擊 · The ambush', goal: 'Fire into the column', text: 'Fire!',
        start: [['calm', 'col', 40], ['calm', 'guard', 40], ['calm', 'banner', 40], ['dir', 'col', 'attack'], ['dir', 'banner', 'hold', 12, -30]],
        obj: { survive: 70 },
        say: [[1, 'sj_hu', 'Fire! Fire into the horses!', '放！朝馬放！'], [8, 'lookout', 'They are cutting the captives loose to run at us!', '他們把百姓放開往我們這兒趕！'],
          [12, 'sj_ma', 'The guards are dragging the captives back north!', '押解的在把百姓往北拖！']] },
      { title: '四 · 救 · The captives', goal: 'Cut down the guards and free the captives', text: 'Down the slope to the captives.', show: ['caps'], hide: ['ridge'],
        start: [['dir', 'sjf', 'hold', 2, -40], ['dir', 'guard', 'hold', 0, -38], ['dir', 'caps', 'hold', 2, -44], ['release', 'majs'], ['dir', 'majs', 'hold', 10, -60]],
        obj: { defeat: ['guard'], frac: 0.75 }, limit: 200, fail: 'The guards got the captives away north.', next: 6,
        say: [[2, 'sj_hu', 'Down! Into the guards! Not the people — the guards!', '下去！打押解的！別打百姓——打押解的！'], [20, 'sj_n7', 'Is anyone here from Yongping? Is anyone here from the salt yards?', '有永平的嗎？有鹽場的嗎？']] },
      { title: '五 · 旗 · The banner', goal: 'Run down Amin\'s rearguard banner', text: 'Down the slope after the banner.', hide: ['ridge'],
        start: [['dir', 'sjf', 'hold', 6, -28], ['dir', 'banner', 'hold', 0, 40], ['release', 'majs'], ['dir', 'majs', 'hold', 0, -10]],
        obj: { officer: 'banner' }, limit: 220, fail: 'The banner got away up the pass.', next: 6,
        say: [[2, 'sj_hu', 'The banner! A captured banner is worth a hundred heads at court!', '那面旗！奪一面旗，在朝廷上值一百顆頭！'], [12, 'sj_tian', 'And the people? The guards are taking them!', '那百姓呢？押解的把他們帶走了！'],
          [18, 'sj_hu', 'Keep running.', '跑。']] },
      { title: '六 · 回 · Back up the slope', goal: 'Get back up the slope before their horse return', text: 'Their horse is coming back down the pass.', show: ['ridge'], hide: ['caps'],
        start: [['dir', 'sjf', 'hold', 28, -26], ['release', 'chase'], ['dir', 'chase', 'hold', 0, -30], ['calm', 'chase', 24], ['break', 'col']],
        obj: { extract: 'ridge' }, limit: 260, fail: 'The Jin horse caught you in the open pass.',
        say: [[2, 'lookout', 'Horse coming back down the pass!', '馬兵從關口折回來了！'], [5, 'sj_hu', 'Up the slope! Horses can\'t climb!', '上坡！馬爬不上來！']] },
    ],
    win: 'You came back up the slope.',
  },
  }; })();
// </sj2-missions>
Object.assign(SJ_MISSIONS, SJ2_MISSIONS); if (typeof SIM !== 'undefined') Object.assign(SIM.MISSIONS, SJ2_MISSIONS);
// Shunyi with the powder saved on the Zunhua road: two light guns on the cart wall
{ const v = JSON.parse(JSON.stringify(SJ_MISSIONS.sj1)); v.groups.carts.army = ['rifle_imp', 'ashigaru', 'armstrong'];
  v.phases[0].say = v.phases[0].say.concat([[32, 'sj_ma', 'The powder from the Zunhua road. Dry as a bone. Two light guns on the carts, and enough to feed them.', '遵化道上拖回來的火藥，乾得很。車上兩門小砲，管夠。']]);
  SJ_MISSIONS.sj1_p = v; if (typeof SIM !== 'undefined') SIM.MISSIONS.sj1_p = v; }
// Luanzhou for the men who put their marks on the petition: the forlorn hope, first through the gate
{ const v = JSON.parse(JSON.stringify(SJ_MISSIONS.sjluan)); v.groups.sjf.at = [0, 16, 0]; v.groups.sjf.dir = ['hold', 0, 22]; v.start = [0, 16, 0];
  v.phases[0].say = [[4, 'sjf', 'Your team signed for Yuan Chonghuan. The Intendant knows your names. You go in first at the gate.', '你們隊替袁督師畫了押。監軍知道你們的名字。攻門你們打頭陣。'],
    [12, 'sj_song', 'I am sorry. I am sorry.', '對不住。對不住大家。'], [20, 'sj_hu', 'Don\'t be. A man puts his name to what he believes. Load.', '別說了。人信什麼，就給什麼畫押。裝藥。']];
  v.zones[0] = { key: 'battery', x: 0, z: 22, r: 10, name: 'The forlorn hope' };
  SJ_MISSIONS.sjluan_f = v; if (typeof SIM !== 'undefined') SIM.MISSIONS.sjluan_f = v; }

// ---------- the new men and the generals met ----------
SR.push({ k: 'sj_n7', zh: '韓七', en: 'Han Qi', t: 'new draft · a salt-boiler from Yongping · the Jin killed his family', draft: 3 },
  { k: 'sj_n8', zh: '丁老四', en: 'Ding Laosi', t: 'new draft · ran from Man Gui\'s camp, brought back in a cangue', draft: 3 },
  { k: 'sj_n9', zh: '盧阿保', en: 'Lu Abao', t: 'new draft · a gunner trained by the Portuguese at Zhuozhou', draft: 4 },
  { k: 'sj_n10', zh: '喬二', en: 'Qiao Er', t: 'new draft · a Tongzhou canal boatman', draft: 4 },
  { k: 'zhao', zh: '趙率教', en: 'Zhao Shuaijiao', t: 'regional commander of Shanhai Pass · 山海總兵', guest: true },
  { k: 'sun', zh: '孫祖壽', en: 'Sun Zude', t: 'regional commander of Jizhou · 薊鎮總兵', guest: true },
  { k: 'majs', zh: '馬世龍', en: 'Ma Shilong', t: 'general under Sun Chengzong · 總兵', guest: true });
Object.assign(SLOOK, {
  sj_n7: { h: 1.03, hat: 'wrap', wrap: 0x2e2a26, brows: 'knit', beard: 'stubble', scar: true, skin: 0xb48a62 },
  sj_n8: { h: 0.97, brows: 'sad', beard: 'mous', skin: 0xc8a07a },
  sj_n9: { h: 1.0, hat: 'felt', brows: 'thin', beard: 'goatee', skin: 0xd2a882 },
  sj_n10: { h: 1.09, hat: 'straw', brows: 'thick', bulk: true, rosy: true, skin: 0xbf9670 },
  zhao: { h: 1.0, brows: 'knit', beard: 'longmous', longBeard: true, grey: true, scar: true, skin: 0xb88c66 },
  sun: { h: 1.04, brows: 'thick', beard: 'full', grey: true, skin: 0xc49a72 },
  majs: { h: 1.06, brows: 'thick', beard: 'mous', skin: 0xbf9670 },
});
Object.assign(SJWHO, { zhao: ['趙率教', 'General Zhao Shuaijiao'], sun: ['孫祖壽', 'General Sun Zude'], hei: ['黑雲龍', 'General Hei Yunlong'], majs: ['馬世龍', 'General Ma Shilong'] });
Object.assign(SJBAT, {
  battleZ: ['sjzun', '遵化道 · The Zunhua road', 'November 1629. A powder train for besieged Zunhua, with Zhao Shuaijiao\'s horse. At the ford, lie behind the bank and let them into the water before you fire.', [['sjf', 'sjf'], ['zhao', 'zhao']]],
  battleY: ['sjyong', '永定門 · The Yongding Gate', 'The seventeenth day of the twelfth month. Fog before dawn outside the Yongding Gate. Man Gui has the command now.', [['sjf', 'sjf'], ['mangui', 'mangui'], ['sun', 'sun']]],
  battleL: ['sjluan', '灤州 · Luanzhou', 'June 1630. The red cannon are up before Luanzhou. Guard the battery, then follow Zu Dashou through the gate.', [['sjf', 'sjf'], ['zu', 'zu'], ['majs', 'majs']]],
  battleK: ['sjleng', '冷口 · The Lengkou pass', 'June 1630. Amin\'s column is leaving through the Wall with the loot and the captives of four towns. Your company lies on the east slope of the pass.', [['sjf', 'sjf'], ['majs', 'majs']]],
});
// the in-battle choices (they burn at the top of the screen; 1-3 answers; the sim does what the mission's data says)
Object.assign(CHBT, {
  sjzun: [{ ph: 2, t: 26, id: 'sjpowder', cid: 1 }],
  sjyong: [{ ph: 1, t: 10, id: 'sjcoats', cid: 1 }],
  sjleng: [{ ph: 2, t: 10, id: 'sjcaps', cid: 1 }],
});
CHD.sjpowder = {
  build: (C) => ({ id: 'sjpowder', urgent: true, timer: 14, def: 0, kick: '抉擇 · The powder', title: '火藥車 · The powder carts', ltitle: 'The powder train for Zunhua', year: 'The Sha River ford, November 1629', who: ['馬大車 Ma Dache'],
    lines: [chL('拉著車跑不掉！炸了，還是拉回去？', 'We can\'t outrun them with the carts! Blow them, or drag them back?')],
    opts: [{ q: 'Blow the carts when the Jin reach them', led: 'Blew up the powder train at the ford.', a: [chL('趙獨眼：點火！都趴下！', 'One-Eye Zhao: Fire in the hole! Everyone down!')], fx: (C) => { C.S.flags.powderBlown = 1; chBond(C, 'sj_zhao', 1); chBond(C, 'sj_ma', -1); } },
      { q: 'Drag them back down the road', led: 'Dragged the powder train back down the road under the Jin horse.', a: [chL('馬大車：拉！騾子，拉！', 'Ma Dache: Pull! Pull, you mules!')], fx: (C) => { C.S.flags.powderSaved = 1; chBond(C, 'sj_ma', 2); } }] }),
  end: (C, o) => o === 0 ? 'The powder went up at the ford and took the first Jin riders with it. Nobody brought anything back to Beijing but themselves.' : `The carts came back. At Shunyi they fed two light guns on the cart wall.${chAlive(C, 'sj_ma') ? ' Ma Dache still says the mules did it.' : ''}`,
  murmur: (C, o) => o === 1 ? ['sj_ma', '車拉回來了。騾子瘦了一圈。', 'The carts came back. The mules came back thinner.'] : ['sj_zhao', '那一聲……耳朵到今天還在響。', 'That bang... my ears are still ringing.'],
};
CHD.sjcoats = {
  build: (C) => ({ id: 'sjcoats', urgent: true, timer: 12, def: 1, kick: '抉擇 · NOW', title: '明衣 · Men in our coats', ltitle: 'The men in Ming coats at the Yongding Gate', year: 'The Yongding Gate, January 1630', who: ['高老槍 Old Gao'],
    lines: [chL('紅衣，可走得太齊了。放不放？', 'Red coats. But they walk too straight. Fire or not?')],
    opts: [{ q: 'Fire on them', led: 'Fired on the men in Ming coats.', a: [chL('放！管他是誰！', 'Fire! Whoever they are!')], fx: (C) => { C.S.flags.coats = 'fire'; chBond(C, 'sj_gao', 1); } },
      { q: 'Hold fire — they may be ours', led: 'Held fire on the men in Ming coats.', a: [chL('……別放！是自己人——', '...Hold! They\'re ours —')], fx: (C) => { C.S.flags.coats = 'hold'; chBond(C, 'sj_tian', 1); } },
      { q: 'Shout for the night\'s password', led: 'Challenged the men in Ming coats for the password.', a: [chL('口令！……沒有口令！放！', 'Password! ...No password! Fire!')], fx: (C) => { C.S.flags.coats = 'pass'; chBond(C, 'sj_hu', 1); } }] }),
  end: (C, o) => o === 1 ? 'They were Jin bannermen in coats taken from the dead. They came over the stakes before the first gun was fired.' : o === 0 ? 'They were Jin in coats taken from the dead. Your team fired first. The rest of the camp did not.' : 'They had no password. Your team fired first. The rest of the camp did not.',
  murmur: (C, o) => o === 1 ? ['sj_tian', '我以為是我們的人。他們穿的是我們的衣裳。', 'I thought they were ours. They were wearing our coats.'] : null,
};
CHD.sjcaps = {
  build: (C) => ({ id: 'sjcaps', urgent: true, timer: 13, def: 0, kick: '抉擇 · NOW', title: '冷口 · Captives or the banner', ltitle: 'The captives at the Lengkou pass', year: 'The Lengkou pass, June 1630', who: ['胡老鐵 Chief Hu'],
    lines: [chL('押解的拖著百姓往北跑，阿敏的旗也在跑！救人，還是奪旗？', 'The guards are dragging the captives north, and Amin\'s banner is running too! The people, or the banner?')],
    opts: [{ q: 'Go for the captives', led: 'Went down for the captives and let the banner go.', a: [chL('救人！打押解的！', 'The people! Get the guards!')], fx: (C) => { C.S.flags.caps = 1; chBond(C, 'sj_tian', 2); chBond(C, 'sj_n7', 2); chRep(C, 'care', 1); } },
      { q: 'Go for Amin\'s banner', led: 'Ran down Amin\'s rearguard banner and let the guards take the captives.', a: [chL('奪旗！一面旗值一百顆頭！', 'The banner! One banner is worth a hundred heads!')], fx: (C) => { C.S.flags.banner = 1; chBond(C, 'sj_qian', 1); chBond(C, 'sj_n7', -2); chRep(C, 'glory', 2); } }] }),
  end: (C, o) => o === 0 ? `Some forty people from Yongping walked back through the pass behind your team.${chAlive(C, 'sj_n7') ? ' Han Qi found none of his own among them.' : ''}` : 'The banner went to Beijing and the company was paid a bounty. The captives went north through the Wall to the Jin.',
  dream: (C, o) => o === 1 ? ['The night after', ['You dream of a line of people tied neck to neck, walking north through a gap in a wall that goes on forever.', 'At the back of the line is a child with one shoe.']] : null,
  murmur: (C, o) => o === 0 ? ['sj_n7', '四十個人。不是我家的。可也是人家的。', 'Forty people. None of them mine. But somebody\'s.'] : ['sj_tian', '那面旗……換了多少銀子？', 'That banner... how much silver did it fetch?'],
};
// the deliberate ones, between the battles
CHD.sjpetition = {
  build: (C) => ({ id: 'sjpetition', title: '疏 · The petition', ltitle: 'The petition for Yuan Chonghuan', year: 'The twelfth month of 1629', who: ['宋秀才 Song the Scholar', 'with a sheet of paper and a brush, at the fire'],
    lines: [chL('（他把紙攤在膝上。上面已經有幾十個名字和指印。）', '(He spreads the paper on his knee. There are already a few dozen names and thumbprints on it.)'),
      chL('一個叫程本直的布衣，給皇上上疏，替袁督師喊冤。我抄了一份，在營裡傳。', 'A commoner called Cheng Benzhi has written to the Emperor to say the Governor is innocent. I copied it out. It\'s going round the camp.'),
      chL('我們在廣渠門下見過他。你畫個押嗎？', 'We saw him at the Guangqu Gate. Will you put your mark on it?'),
      chL('胡老鐵：（低聲）錦衣衛的人也在營裡傳。', 'Chief Hu (low): The Embroidered Uniform men are going round the camp too.')],
    opts: [{ q: 'Put your mark on it, and the team\'s', led: 'Put your mark and the team\'s on the petition for Yuan Chonghuan.', a: [chL('宋秀才：好。……好。我替大家記著。', 'Song: Good. ...Good. I will remember who signed.'), chL('（第二天，監軍的書辦來營裡抄名字。）', '(The next day the Intendant\'s clerk comes through the camp copying names.)')],
        fx: (C) => { C.S.flags.petition = 'signed'; chBond(C, 'sj_song', 3); chBond(C, 'sj_hu', -1); } },
      { q: 'Refuse. It will get us all killed.', led: 'Refused to sign the petition for Yuan Chonghuan.', a: [chL('宋秀才：……你說得對。你說得對。', 'Song: ...You\'re right. You\'re right.'), chL('（他把紙折起來，收進懷裡。那天晚上他一個人坐到天亮。）', '(He folds the paper into his coat. He sits alone by the fire until it is light.)')],
        fx: (C) => { C.S.flags.petition = 'refused'; chBond(C, 'sj_song', -2); chBond(C, 'sj_hu', 1); } },
      { q: 'Burn it, before the clerks find it on him', led: 'Burned Song\'s copy of the petition to keep him out of prison.', a: [chL('（你把紙放進火裡。宋秀才看著它燒完，一句話也沒說。）', '(You put the paper in the fire. Song watches it burn and says nothing at all.)'), chL('胡老鐵：（點點頭。）', 'Chief Hu: (nods.)')],
        fx: (C) => { C.S.flags.petition = 'burned'; chBond(C, 'sj_song', -1); chBond(C, 'sj_hu', 2); } }] }),
  end: (C, o) => o === 0 ? 'The petition reached the throne. Cheng Benzhi was beheaded for it. The Intendant remembered the names, and your team went first through the gate at Luanzhou.' : o === 1 ? `Cheng Benzhi was beheaded for his petition. ${chAlive(C, 'sj_song') ? 'Song never spoke of it again.' : 'Song did not live to see the Governor die.'}` : 'Cheng Benzhi was beheaded for his petition. Nobody came looking for Song.',
  murmur: (C, o) => o === 0 ? ['sj_song', '名字是我們自己的。總得寫在什麼上面。', 'Our names are our own. They have to be written on something.'] : o === 1 ? ['sj_song', '……', '...'] : null,
};
CHD.sjprisoners = {
  build: (C) => ({ id: 'sjprisoners', title: '俘 · The prisoners', ltitle: 'The Jin prisoners at Luanzhou', year: 'Luanzhou, the sixth month of 1630', who: ['韓七 Han Qi', 'and a crowd from the streets'],
    lines: [chL('（衙門後院，十幾個金兵跪在地上，手綁在背後。最小的一個不過十五六。）', '(In the yamen yard a dozen Jin soldiers kneel with their hands tied behind them. The youngest is fifteen or sixteen.)'),
      chL('韓七：永平的人全進了井。我娘，我妹妹。把他們交給我。', 'Han Qi: Everyone in Yongping went down the wells. My mother. My sister. Give them to me.'),
      chL('書辦：首級一顆五兩。活的，監軍要問話。', 'The clerk: Five taels a head. Alive, the Intendant wants to question them.'),
      chL('宋秀才：他們不是在永平殺人的那些。那些人跟阿敏走了。', 'Song: These aren\'t the ones who did Yongping. Those went with Amin.')],
    opts: [{ q: 'Give them to Han Qi', led: 'Gave the Jin prisoners at Luanzhou to Han Qi and the crowd.', a: [chL('（你轉身走開。身後的聲音持續了很久。）', '(You turn and walk away. The noise behind you goes on for a long time.)'), chL('（那天晚上，韓七第一次笑了。第二天早上，他吐了。）', '(That night Han Qi laughs for the first time. In the morning he is sick.)')],
        fx: (C) => { C.S.flags.prisoners = 'killed'; chBond(C, 'sj_n7', 2); chBond(C, 'sj_song', -2); chRep(C, 'cruel', 2); } },
      { q: 'Hand them to the Intendant alive', led: 'Handed the Jin prisoners to the Intendant alive.', a: [chL('書辦把他們帶走了。後來聽說，他們被押到京城，在西市斬首。', 'The clerk takes them away. Later you hear they were sent to the capital and beheaded in the western market.')],
        fx: (C) => { C.S.flags.prisoners = 'handed'; chBond(C, 'sj_hu', 1); chBond(C, 'sj_n7', -1); chRep(C, 'disc', 1); } },
      { q: 'Let the boy go', led: 'Cut the youngest Jin prisoner loose and let him run.', a: [chL('（你割斷最小那個的繩子，朝北一指。他看了你一眼，跑了。）', '(You cut the youngest one loose and point north. He looks at you once, and runs.)'), chL('韓七：（他什麼也沒說。他再也沒跟你說過話。）', 'Han Qi: (He says nothing. He never speaks to you again.)')],
        fx: (C) => { C.S.flags.prisoners = 'freed'; chBond(C, 'sj_n7', -3); chBond(C, 'sj_tian', 1); chRep(C, 'care', 1); } }] }),
  end: (C, o) => o === 0 ? 'The prisoners died in the yamen yard. Han Qi was sick the next morning, and fought like a madman at Lengkou.' : o === 1 ? 'The prisoners were beheaded in the western market of the capital, where Yuan Chonghuan was cut to pieces two months later.' : 'Somewhere beyond the Wall a boy got home. Han Qi never spoke to you again.',
  dream: (C, o) => o === 0 ? ['The night after', ['You dream of a well in Yongping. You look down it, and the faces looking back up at you are the faces from the yamen yard.']] : o === 2 ? ['The night after', ['You dream of the boy running north through the gate at Lengkou, and of Han Qi standing in the gate, not stopping him.']] : null,
  murmur: (C, o) => o === 0 ? ['sj_n7', '……還不夠。永遠不夠。', '...It isn\'t enough. It will never be enough.'] : o === 2 ? ['sj_n7', '……', '...'] : null,
};

// ---------- the flow: the new stages between the old ones ----------
const SJ2CARD = {
  zunc: [{ title: '遵化 · Zunhua', year: 'The fourth day of the eleventh month, 1629', p: ['A rider from the east: the Jin are through the Wall at Da\'ankou, and Zunhua is under siege. The court sends a powder train to the town under guard of a picked company of the Divine Engine Division: yours.', 'Old Zhao Shuaijiao, who holds Shanhai Pass, has ridden west with four thousand horse to break the siege. You will meet him on the road.'], zh: '趙率教率騎四千，馳援遵化。', btn: 'Down the road →' }],
  yongc: [{ title: '督師下獄 · The Governor arrested', year: 'The first day of the twelfth month, 1629', p: ['Ten days after the Guangqu Gate, the Chongzhen Emperor called Yuan Chonghuan into the palace to talk about pay for his troops, and had him seized in the hall. Two eunuchs who had escaped from the Jin camp swore they had overheard a secret pact.',
    'Zu Dashou heard, and rode east for Liaodong with fifteen thousand men. Man Gui, the Mongol general, was given the command of everything that was left.'], zh: '下崇煥錦衣衛獄。大壽懼，率所部東潰。' }],
  luanc: [{ title: '五個月 · Five months', year: 'The first half of 1630', p: ['Man Gui died outside the Yongding Gate. The Jin took Yongping, Qian\'an, Zunhua and Luanzhou, four walled towns inside the Wall, and Hong Taiji went home, leaving his cousin Amin to hold them.',
    'Sun Chengzong, an old man the court had sent away, was called back. He persuaded Zu Dashou to return. Xu Guangqi\'s Western cannon came up from the coast with the Portuguese who knew how to serve them.', 'In the fifth month of 1630 the Ming army went over to the attack.'], zh: '孫承宗督師，復灤州、遷安、永平、遵化四城。', btn: 'To Luanzhou →' }],
  lengc: [{ title: '四城 · The four towns', year: 'The fifth month of 1630', p: ['After Luanzhou fell, Amin abandoned the other three towns in a night. Before he left Yongping and Qian\'an he had the Han people who had surrendered to him put to the sword.', 'His column is going out through the Wall at Lengkou with everything it can carry, and a long file of captives. Sun Chengzong sends companies into the hills to catch it in the pass.'], zh: '阿敏屠永平、遷安官民，出冷口而去。', btn: 'Into the hills →' }],
};
const SJ2AFTER = {
  battleZ: () => [{ title: '遵化 · Zunhua', year: 'The fourth day of the eleventh month, 1629', p: ['Zhao Shuaijiao\'s four thousand rode into the Jin outside Zunhua and were destroyed. Zhao died with them. Zunhua fell the same day.', 'The Jin turned west for Beijing. The capital camps were sent out to stop them at Shunyi.'], zh: '率教中流矢，全軍盡沒。' }],
  battleY: () => [{ title: '永定門 · The Yongding Gate', year: 'The seventeenth day of the twelfth month, 1629', p: ['Hong Taiji attacked Man Gui\'s camp outside the Yongding Gate at dawn. Some of his men wore Ming coats taken from the dead. Man Gui and Sun Zude were killed; Hei Yunlong and Ma Shilong\'s colleague Ma Dengyun were taken. Of forty thousand men, the Ming lost some thirty generals and most of the camp.',
    'The Jin did not try the walls. They went east, took four towns inside the Great Wall, and in the spring Hong Taiji went home.'], zh: '滿桂、孫祖壽戰死，黑雲龍、麻登雲被擒。' }],
  battleL: () => [{ title: '灤州 · Luanzhou', year: 'The fifth month of 1630', p: ['Sun Chengzong\'s army took back Luanzhou on the thirteenth day of the fifth month, after the Western cannon broke its wall. It was the first time the Ming had taken a walled town back from the Jin.',
    'In the eighth month of the same year, in the western market of the capital, Yuan Chonghuan was put to death by slicing. The people of Beijing, who believed he had let the Jin in, paid the executioners for pieces of his flesh.'], zh: '崇禎三年八月，磔袁崇煥於市。' }],
  battleK: () => [{ title: '冷口 · Lengkou', year: 'The fifth month of 1630', p: ['Amin got out through Lengkou with most of his loot. In Shenyang, Hong Taiji had him tried for losing the four towns and for the massacres; he was stripped of everything and died in confinement ten years later.',
    'For a year there was quiet on the Wall. Then, in the eighth month of 1631, Hong Taiji came back, to Dalinghe.'], zh: '阿敏以棄四城罪，幽禁至死。' }],
};
// the battle each save has earned
{ const _b = sjBattle; sjBattle = function (scene) {
    const B = SJBAT[scene]; if (!B) return _b(scene); const C = chCtx(); const keep = B[0];
    if (scene === 'battle1' && ZS && ZS.flags && ZS.flags.powderSaved) B[0] = 'sj1_p';
    if (scene === 'battleL' && ZS && ZS.flags && ZS.flags.petition === 'signed') B[0] = 'sjluan_f';
    try { return _b(scene); } finally { B[0] = keep;
      if (scene === 'battleY' && state.sim) { const g = state.sim.mg.fake, g2 = state.sim.mg.inside; for (const G of [g, g2]) if (G) { const p = state.sim.players[G.p]; for (const id of p.squads) for (const uid of state.sim.squads[id].unitIds) { const u = state.sim.units[uid]; u.look = { id: 'coat' + (uid % 5), ming: true }; state.renderer && state.renderer.colorFigure(uid, u); } } }
      if (scene === 'battleK' && state.sim) { const g = state.sim.mg.caps; if (g) { const p = state.sim.players[g.p]; for (const id of p.squads) for (const uid of state.sim.squads[id].unitIds) { const u = state.sim.units[uid]; u.look = { id: 'cap' + (uid % 7), hat: 'wrap', wrap: 0x6a5a48, brows: 'sad', skin: 0xc8a07a }; state.renderer && state.renderer.colorFigure(uid, u); } } } } }; }
// a battle is over: the old ones go their old way except where the new stages come between
const SJ2NEXT = { drill: 'zunc', battleZ: 'camp0', battle1: 'amb', battleA: 'ch2', battle2: 'yongc', battleY: 'luanc', battleL: 'prisoners', battleK: 'ch3', battle3: 'end' };
const SJ2WHERE = { battleZ: 'down the Zunhua road', battleY: 'under the wall', battleL: 'in Luanzhou', battleK: 'back up the slope' };
const SJ2ZONE = { battleZ: 'south', battleY: 'wall', battleK: 'ridge' };
{ const _f = sjFinish; sjFinish = function (winner) {
    if (!ZB) return; const scene = ZB.scene;
    if (scene === 'drill') { ZS.stage = 'zunc'; zSave(); zCards([{ title: '出征 · Marching out', year: 'The eleventh month of 1629', p: ['The review breaks up in shouting. Riders, drums, the gates shut behind the columns. The Jin army is through the Great Wall.'], btn: 'On →' }], () => sjGo('zunc')); return; }
    if (!SJ2AFTER[scene]) return _f(winner); // the old battles finish as they always did (Guangqu now leads on to the Yongding Gate)
    const sim = state.sim, h = localHero(), M = sim.mission, won = winner === M.side;
    const z = SJ2ZONE[scene] ? sim.missionZone(SJ2ZONE[scene]) : null; const near = (u, r) => h && !h.dead && Math.hypot(u.x - h.x, u.z - h.z) < r; const fate = {};
    for (const uid in ZB.map) { const r = SR[ZB.map[uid]]; if (!r) continue; const u = sim.units[uid]; if (u.dead) { fate[r.k] = 'dead'; continue; }
      const inZ = z && Math.hypot(u.x - z.x, u.z - z.z) < z.r + 12, left = u.wounded && !u.aided && u.helpedBy < 0 && !near(u, 5) && !inZ;
      fate[r.k] = left && (z || !won) ? 'lost' : (!z ? won || near(u, 14) : inZ || near(u, won ? 30 : 12)) ? 'out' : 'lost'; }
    for (const k of ZB.deadMe || []) fate[k] = 'dead';
    if (fate[ZS.me] === undefined) fate[ZS.me] = h && !h.dead ? 'out' : 'dead';
    if (ZB.cur && ZB.cur !== ZS.me && ZB.cur !== 'stranger' && fate[ZS.me] === 'dead') { const nk = ZB.cur; ZS.oldName = ZS.name; sjName(); ZS.me = nk; ZS.name = { zh: sRow(nk).zh, en: sRow(nk).en }; fate[nk] = 'out'; }
    ZS.lastDead = []; for (const k in fate) { ZS.fate[k] = fate[k]; ZS.alive[k] = fate[k] === 'out'; if (fate[k] !== 'out') ZS.lastDead.push(k); }
    const nx = SJ2NEXT[scene]; ZS.stage = nx; zSave();
    const outN = ZS.team.filter(k => ZS.alive[k]).length, names = ZS.lastDead.map(k => sRow(k)).filter(Boolean);
    $('resultTitle').textContent = won ? M.win.split('.')[0] : 'Cut off'; $('resultTitle').className = won ? 'win' : 'lose';
    $('resultText').innerHTML = `${won ? M.win : 'It went wrong, but a few of you got away after dark.'} ${outN} of ${ZS.team.length} came out.${names.length ? ' Lost: ' + names.map(r => r.k === ZS.me ? ZS.name.en : r.en).join(', ') + '.' : ''}`;
    $('btnNext').hidden = false; $('btnNext').textContent = 'What happened →';
    $('btnNext').onclick = () => { $('result').hidden = true; zCards(SJ2AFTER[scene]().concat([{ title: '隊 · Your team', year: `${outN} of ${ZS.team.length}`, html: sjTeamList(SJ2WHERE[scene] || 'came out'), btn: 'Go on →' }]), () => sjGo(nx)); };
  }; }
// the new stages themselves
{ const _s = sjStart; sjStart = function (scene) {
    if (scene === 'zunc' || scene === 'yongc' || scene === 'luanc' || scene === 'lengc' || scene === 'prisoners') {
      sjActivate(); ZS = zLoad(); if (!ZS || !ZS.sj) ZS = sjFresh(); sjName(); chData(ZS);
      $('menu').hidden = true; state.lowfx = $('lowfxIn').checked; state.fog = false;
      if (scene === 'zunc') return zCards(SJ2CARD.zunc, () => { ZS.stage = 'battleZ'; zSave(); sjGo('battleZ'); });
      if (scene === 'yongc') { if (ZS.refilled !== scene) { sjRefill(3); ZS.refilled = scene; zSave(); } const nc = sjNewMenCard();
        return zCards(SJ2CARD.yongc.concat(nc ? [nc] : []), () => { const go = () => chDream(() => { ZS.stage = 'battleY'; zSave(); zCards([{ title: '黎明 · Dawn', year: 'The seventeenth day of the twelfth month', p: ['Fog so thick you cannot see the stakes from the fire. Somewhere south, horses.'], btn: 'Stand to →' }], () => sjGo('battleY')); });
          if (chGot(chCtx(), 'sjpetition') < 0 && ZS.alive.sj_song && ZS.team.includes('sj_song')) chDecide(CHD.sjpetition.build(chCtx()), go); else go(); }); }
      if (scene === 'luanc') { if (ZS.refilled !== scene) { sjRefill(2); ZS.refilled = scene; zSave(); } const nc = sjNewMenCard();
        return zCards(SJ2CARD.luanc.concat(nc ? [nc] : []), () => { ZS.stage = 'battleL'; zSave(); sjGo('battleL'); }); }
      if (scene === 'prisoners') { const go = () => chDream(() => { ZS.stage = 'lengc'; zSave(); sjStart('lengc'); });
        if (chGot(chCtx(), 'sjprisoners') < 0 && ZS.alive.sj_n7 && ZS.team.includes('sj_n7')) return chDecide(CHD.sjprisoners.build(chCtx()), go); return go(); }
      if (scene === 'lengc') return zCards(SJ2CARD.lengc, () => { ZS.stage = 'battleK'; zSave(); sjGo('battleK'); });
    }
    if (scene === 'end' || scene === 'done') { const C = chCtx(); const L = C && chLedgerCard(C); if (L && !ZS.ledgerShown) { ZS.ledgerShown = 1; zSave(); return zCards([L], () => _s(scene)); } }
    return _s(scene); }; }
// Han Qi must be on the rolls for Luanzhou and Lengkou: if no place was empty for him, he joins as the eleventh man
{ const _r = sjRefill; sjRefill = function (ch) { _r(ch); if (ch === 3 && !ZS.team.includes('sj_n7') && !ZS.fate.sj_n7) { ZS.team.push('sj_n7'); ZS.alive.sj_n7 = true; ZS.newMen.push('sj_n7'); } }; }
