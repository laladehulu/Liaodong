// ===== Scripted battles: the co-op commander campaign and Assault operations =====
// A mission is a real battle with a script on top: AI generals command named groups (some waiting off-field as
// reserves), and the script moves through phases — march, ambush, relief, assault, last stand — releasing streams of
// enemies, showing objectives and ending the mission. Every number is deterministic, so peers stay in lockstep.
const WOKOU = { samurai: ['Wokou swordsmen', '倭刀手'], byakkotai: ['Pirate rabble', '海寇'], archer: ['Wokou archers', '倭弓手'], rifle_sho: ['Wokou arquebusiers', '鐵炮手'], shinsengumi: ["Pirate lord's guard", '親衛'], ashigaru: ['Pirate pikemen', '長槍寇'] };
const MISSIONS = {
  taizhou: {
    title: '台州大捷 · Victory at Taizhou', year: 'Summer 1561', battle: 'nagaoka', side: 0, soloExtra: 'yuanyang',
    brief: 'Japanese pirates and their Chinese allies have landed on the Zhejiang coast. Qi Jiguang\'s new army — miners from Yiwu drilled in the mandarin duck formation — marches to save the villages around Taizhou. You lead a squad in his column.',
    start: [0, -118, 0],
    zones: [{ key: 'cross', x: 40, z: 0, r: 14, name: 'Huaxin crossroads' }, { key: 'village', x: 10, z: 70, r: 20, name: 'Huaxin village', owner: 0 }, { key: 'stockade', x: -58, z: 116, r: 15, name: 'Pirate stockade', owner: 1, rate: 0.6 }],
    forts: [[-2, 62, 3.5, 3, 3.4, 'house'], [22, 64, 3, 3.5, 3.2, 'house'], [-6, 82, 3.5, 3, 3.4, 'house'], [26, 84, 3, 3, 3.2, 'house'], [10, 92, 4, 3, 3.6, 'hall'],
      [-73, 116, 0.5, 15, 2.4, 'palisade'], [-43, 116, 0.5, 15, 2.4, 'palisade'], [-58, 131, 15, 0.5, 2.4, 'palisade'], [-68, 101, 5, 0.5, 2.4, 'palisade'], [-48, 101, 5, 0.5, 2.4, 'palisade'], [-58, 122, 4, 3, 3, 'house']],
    labels: WOKOU,
    groups: {
      qi: { team: 0, name: 'Qi Jiguang', zh: '戚繼光', army: ['yuanyang', 'yuanyang', 'rifle_imp', 'yuanyang'], at: [-24, -132, 0], dir: ['support'] },
      militia: { team: 0, name: 'Huaxin militia', zh: '鄉勇', army: ['ronin', 'ronin'], at: [10, 74, PI], dir: ['hold', 10, 74] },
      amb1: { team: 1, name: 'Ambushers (west)', army: ['byakkotai', 'samurai', 'archer'], at: [-58, -40, PI / 2], reserve: true },
      amb2: { team: 1, name: 'Ambushers (east)', army: ['byakkotai', 'rifle_sho', 'samurai'], at: [78, -34, -PI / 2], reserve: true },
      raid: { team: 1, name: 'Raider captain', zh: '倭首', officer: 3.5, army: ['samurai', 'byakkotai', 'byakkotai', 'archer'], at: [14, 112, PI], reserve: true },
      str1: { team: 1, name: 'Pirate band', army: ['byakkotai', 'samurai'], at: [40, 140, PI], reserve: true },
      str2: { team: 1, name: 'Pirate band', army: ['archer', 'byakkotai'], at: [-10, 140, PI], reserve: true },
      str3: { team: 1, name: 'Pirate band', army: ['samurai', 'rifle_sho'], at: [70, 135, PI], reserve: true },
      stk: { team: 1, name: 'Stockade garrison', army: ['rifle_sho', 'archer', 'samurai', 'rifle_sho'], at: [-58, 120, PI], dir: ['hold', -58, 116] },
      flank: { team: 1, name: 'River pirates', army: ['byakkotai', 'byakkotai', 'samurai'], at: [-88, 30, 0.4], reserve: true },
      king: { team: 1, name: 'Mao Haifeng, the pirate lord', zh: '毛海峰', officer: 6, army: ['shinsengumi', 'shinsengumi', 'rifle_sho', 'samurai'], at: [-64, 140, PI], reserve: true, exit: [-140, 140] },
    },
    phases: [
      { title: 'I · The coast road', text: 'March north with Qi Jiguang\'s column to the Huaxin crossroads. The pirates know these paddies better than you do.', show: ['cross'],
        obj: { all: [{ reach: 'cross' }, { defeat: ['amb1', 'amb2'], frac: 0.7 }] }, waves: [[80, 'amb1'], [92, 'amb2']],
        say: [[2, 'Qi Jiguang', 'Keep the duck teams tight on the dikes. A pirate alone is a tiger; in a ditch he is nothing.'], [84, 'Scout', 'Swords in the rice! Both flanks — they were lying in the water!'], [100, 'Qi Jiguang', 'Shields front! Wolf-brushes, snare them! Spears, kill what the brushes hold!']],
        done: [['say', 'Qi Jiguang', 'Good. Now — smoke over Huaxin. They are burning the village.']] },
      { title: 'II · Smoke over Huaxin', text: 'Pirates are plundering Huaxin. Drive them out, cut down their captain, and hold the village while more bands come down from the hills.', show: ['village'], hide: ['cross'],
        start: [['release', 'raid'], ['dir', 'raid', 'hold', 10, 74], ['dir', 'qi', 'hold', 10, 60]],
        obj: { all: [{ officer: 'raid' }, { hold: 'village', t: 75 }] }, waves: [[70, 'str1'], [170, 'str2'], [260, 'str3']],
        say: [[3, 'Village elder', 'They took the grain and the girls are hiding in the temple — please, hurry!'], [72, 'Scout', 'More of them coming down the north road!'], [175, 'Qi Jiguang', 'Hold the village. Let them come to us and die on the duck teams.']],
        done: [['say', 'Qi Jiguang', 'Their nest is the stockade by the river. We end this today.'], ['dir', 'militia', 'hold', 10, 70]] },
      { title: 'III · The stockade', text: 'Storm the pirate stockade on the riverbank. Arquebusiers hold the palisade; expect the river pirates to strike your flank.', show: ['stockade'], hide: ['village'],
        start: [['dir', 'qi', 'hold', -58, 112]],
        obj: { capture: ['stockade'] }, waves: [[110, 'flank']],
        say: [[2, 'Qi Jiguang', 'Muskets, keep their heads down. Duck teams go over the palisade together, not one by one.'], [112, 'Scout', 'Boats on the river — they are landing behind us!']],
        done: [['say', 'Scout', 'The pirate lord himself — Mao Haifeng — he is running for the boats!']] },
      { title: 'IV · The pirate lord', text: 'Mao Haifeng and his guard are breaking out toward the river. Cut him down before he reaches his ships.', start: [['release', 'king'], ['dir', 'king', 'hold', -40, 100]],
        obj: { officer: 'king' }, limit: 420, fail: 'Mao Haifeng reached his ships and escaped to sea.',
        say: [[3, 'Qi Jiguang', 'Do not let him reach the water! His head is worth a thousand of his men!']] },
    ],
    win: 'Taizhou is saved. In nine battles that summer Qi Jiguang\'s army destroyed the pirate bands, and the mandarin duck formation became famous across the empire.',
  },
  ningyuan: {
    title: '寧遠之戰 · The Defense of Ningyuan', year: 'February 1626', battle: 'hakodate', side: 0, soloExtra: 'rifle_imp',
    brief: 'Nurhaci, undefeated in forty years, leads the Eight Banners across the frozen Liao River. Every Ming general has fled except one: Yuan Chonghuan, who stays in Ningyuan with eleven "red barbarian" cannon and swears in blood to hold. You command a company of his garrison.',
    start: [0, 88, PI],
    zones: [{ key: 'village', x: -52, z: -18, r: 18, name: 'Outer village' }, { key: 'sgate', x: 0, z: 30, r: 12, name: 'South gate', owner: 0 }, { key: 'citadel', x: 0, z: 74, r: 16, name: 'Ningyuan citadel', owner: 0, rate: 0.5 }, { key: 'camp', x: 62, z: -98, r: 17, name: 'Jin siege camp', owner: 1, rate: 0.7 }],
    forts: [[-60, -12, 3, 3, 3.2, 'house'], [-42, -26, 3.5, 3, 3.2, 'house'], [-62, -32, 3, 3, 3, 'house'], [-38, -8, 3, 3.5, 3.2, 'house'],
      [47, -98, 0.5, 14, 2, 'palisade'], [77, -98, 0.5, 14, 2, 'palisade'], [62, -112, 14, 0.5, 2, 'palisade'], [62, -96, 4, 3, 2.6, 'house'], [54, -104, 3, 2, 2.4, 'house']],
    groups: {
      yuan: { team: 0, name: 'Yuan Chonghuan', zh: '袁崇煥', army: ['rifle_imp', 'rifle_imp', 'armstrong', 'armstrong', 'samurai', 'armstrong'], at: [0, 76, PI], dir: ['hold', 0, 60] },
      man: { team: 0, name: 'Man Gui', zh: '滿桂', army: ['cavalry', 'cavalry', 'ashigaru'], at: [-30, 100, PI], dir: ['hold', -20, 70] },
      villagers: { team: 0, name: 'Villagers', zh: '百姓', army: ['ronin', 'ronin'], at: [-52, -20, PI], dir: ['hold', -52, -18] },
      camp: { team: 1, name: 'Siege camp guard', army: ['samurai', 'archer', 'ashigaru'], at: [62, -100, PI], dir: ['hold', 62, -98] },
      scouts: { team: 1, name: 'Jin scouts', army: ['cavalry', 'byakkotai', 'cavalry'], at: [-100, -130, 0.4], reserve: true },
      w1: { team: 1, name: 'Bordered Blue Banner', army: ['samurai', 'samurai', 'archer', 'rifle_sho', 'cavalry'], at: [-40, -140, 0], reserve: true },
      w2: { team: 1, name: 'Plain Red Banner', army: ['samurai', 'ashigaru', 'archer', 'archer', 'cannon4'], at: [40, -140, 0], reserve: true },
      w3: { team: 1, name: 'Bordered White Banner', army: ['samurai', 'byakkotai', 'byakkotai', 'rifle_sho'], at: [-115, -100, 0.7], reserve: true },
      nur: { team: 1, name: 'Nurhaci', zh: '努爾哈赤', officer: 7, wound: 0.45, army: ['shinsengumi', 'shinsengumi', 'samurai', 'cavalry'], at: [0, -140, 0], reserve: true, exit: [0, -150] },
    },
    phases: [
      { title: 'I · Scorched earth', text: 'Yuan Chonghuan has ordered the suburbs burned and the people brought inside the walls. Ride out to the outer village and bring the villagers home before the banners arrive.', show: ['village'],
        start: [['dir', 'man', 'hold', -40, 10]],
        obj: { all: [{ reach: 'village' }, { arrive: 'villagers', zone: 'sgate' }, { defeat: ['scouts'], frac: 0.6 }] }, waves: [[75, 'scouts']],
        at: [[20, ['dir', 'villagers', 'hold', 0, 40]]],
        say: [[2, 'Yuan Chonghuan', 'Leave the Jin nothing: no roof, no grain, no well. Bring every soul inside.'], [78, 'Scout', 'Horsemen on the ice! Jin scouts, coming for the village!']],
        done: [['say', 'Yuan Chonghuan', 'Close the gates. Gunners to the walls.'], ['dir', 'man', 'hold', -20, 66], ['hide', 'village']] },
      { title: 'II · The Eight Banners', text: 'The Jin host arrives. Hold the south gate and the walls; the Hongyipao on the citadel will do the rest. If the citadel falls, Ningyuan falls.', show: ['sgate', 'citadel'],
        start: [['release', 'w1'], ['dir', 'w1', 'hold', 0, 30]],
        obj: { survive: 400, keep: 'citadel' }, waves: [[110, 'w2', ['hold', 0, 30]], [240, 'w3', ['hold', -30, 60]]],
        say: [[3, 'Yuan Chonghuan', 'Let them come close. Then the red cannon speak.'], [112, 'Lookout', 'Plain Red Banner — and they have guns of their own!'], [245, 'Lookout', 'Bordered White on the west wall!'], [330, 'Yuan Chonghuan', 'Hold! The ice is red with them!']],
        done: [['say', 'Lookout', 'The yellow umbrella — it is Nurhaci himself! He leads the last assault!']] },
      { title: 'III · The Khan', text: 'Nurhaci and his Bayara guard throw themselves at the gate. Stop them. A wounded Khan will not stay on the field.', show: ['sgate', 'citadel'],
        start: [['release', 'nur'], ['dir', 'nur', 'hold', 0, 30]],
        obj: { officer: 'nur', keep: 'citadel' },
        say: [[3, 'Yuan Chonghuan', 'Every gun on the yellow umbrella!'], [120, 'Lookout', 'He is still coming!']],
        done: [['say', 'Lookout', 'He is hit! The Khan is hit — they are carrying him back!']] },
      { title: 'IV · Sortie', text: 'The banners waver. Sally out with Man Gui\'s cavalry and burn the Jin siege camp before they recover.', show: ['camp'], hide: ['sgate'],
        start: [['dir', 'man', 'hold', 62, -98], ['dir', 'yuan', 'hold', 0, 40]],
        obj: { capture: ['camp'] },
        say: [[3, 'Man Gui', 'Horses! For once it is our turn to ride them down!']] },
    ],
    win: 'Ningyuan held. Nurhaci, wounded, never recovered and died that autumn. It was the first defeat the Jin had ever suffered.',
  },
  hunriver: {
    title: '渾河血戰 · Blood on the Hun River', year: 'May 1621', battle: 'toba', side: 0, soloExtra: 'ashigaru',
    brief: 'Shenyang is under attack. A relief army of Sichuan "White Pole" spearmen under Qin Bangping and Zhejiang musketeers under Chen Ce marches to save it. You command a company of the relief.',
    start: [10, -112, 0],
    zones: [{ key: 'bridgehead', x: 0, zr: 34, r: 16, name: 'North bank', owner: 1, rate: 0.7 }, { key: 'camp', x: -42, z: -62, r: 22, name: 'Zhejiang camp', owner: 0, rate: 0.5 }, { key: 'guns', x: 60, z: 100, r: 15, name: 'The captured guns', owner: 1, rate: 0.7 }, { key: 'ebridge', x: 74, zr: -20, r: 13, name: 'Road east' }],
    forts: [[-64, -62, 0.5, 14, 1.6, 'palisade'], [-20, -62, 0.5, 14, 1.6, 'palisade'], [-42, -40, 14, 0.5, 1.6, 'palisade'], [-34, -66, 2, 2, 1.4, 'mantlet'], [-50, -58, 2, 2, 1.4, 'mantlet'],
      [52, 112, 6, 0.5, 1.6, 'palisade'], [68, 112, 6, 0.5, 1.6, 'palisade']],
    groups: {
      qin: { team: 0, name: 'Qin Bangping (White Poles)', zh: '秦邦屏', army: ['ashigaru', 'ashigaru', 'ashigaru', 'samurai'], at: [-18, -104, 0], dir: ['support'] },
      chen: { team: 0, name: 'Chen Ce (Zhejiang)', zh: '陳策', army: ['rifle_imp', 'rifle_imp', 'yuanyang', 'armstrong'], at: [-42, -66, 0], dir: ['hold', -42, -60] },
      nb: { team: 1, name: 'Bridgehead guard', army: ['samurai', 'archer', 'rifle_sho'], at: [0, 46, PI], dir: ['hold', 0, 40] },
      cav1: { team: 1, name: 'Banner horse', army: ['cavalry', 'cavalry', 'cavalry'], at: [-130, 70, PI], reserve: true },
      inf1: { team: 1, name: 'Plain Yellow Banner', army: ['samurai', 'samurai', 'ashigaru', 'archer'], at: [0, 140, PI], reserve: true },
      guns: { team: 1, name: 'Han Banner gunners', army: ['rifle_sho', 'rifle_sho', 'cannon4', 'cannon4'], at: [60, 118, PI], reserve: true },
      ht: { team: 1, name: 'Hong Taiji', zh: '皇太極', officer: 6, army: ['shinsengumi', 'samurai', 'cavalry'], at: [-60, 140, PI], reserve: true },
      cut: { team: 1, name: 'Bordered Yellow Banner', army: ['cavalry', 'samurai', 'byakkotai'], at: [125, -40, -PI / 2], reserve: true },
    },
    phases: [
      { title: 'I · Across the Hun', text: 'Cross the river at the ford with the White Poles and take the north bank. Shenyang lies beyond.', show: ['bridgehead'],
        obj: { capture: ['bridgehead'] },
        say: [[2, 'Qin Bangping', 'Sichuan men do not stop for cold water. Over the ford, spears first!'], [60, 'Chen Ce', 'Our muskets will cover you from the south bank.']],
        done: [['say', 'Messenger', 'General! Shenyang fell yesterday — traitors opened the gates! The whole Jin army is coming out!']] },
      { title: 'II · Shenyang has fallen', text: 'There is nothing left to relieve. Fall back across the river to the Zhejiang camp and hold it against the banners.', show: ['camp'], hide: ['bridgehead'],
        start: [['release', 'cav1'], ['dir', 'qin', 'hold', -42, -50]],
        obj: { all: [{ reach: 'camp' }, { survive: 300 }], keep: 'camp' }, waves: [[50, 'inf1', ['hold', -42, -60]]],
        say: [[3, 'Chen Ce', 'Into the camp! Wagons and palisades — make them pay for every step.'], [55, 'Lookout', 'Yellow banners crossing the ice!'], [200, 'Qin Bangping', 'My spears hold. Do not waste a ball.']],
        done: [['say', 'Lookout', 'Guns! They have dragged our own cannon from Shenyang onto the far bank!']] },
      { title: 'III · The captured guns', text: 'The Jin are turning captured Ming cannon on the camp. Cross back and silence the guns, then deal with Hong Taiji\'s guard.', show: ['guns'],
        start: [['release', 'guns'], ['dir', 'guns', 'hold', 60, 104], ['dir', 'qin', 'hold', 40, 60]],
        obj: { all: [{ capture: ['guns'] }, { defeat: ['guns'], frac: 0.6 }] }, waves: [[100, 'ht', ['hold', 20, 40]]],
        say: [[3, 'Chen Ce', 'Spike those guns or we all die in this camp.'], [104, 'Lookout', 'Hong Taiji\'s guard is coming down the bank!']],
        done: [['say', 'Qin Bangping', 'Enough. We cannot win this field. Get the men out to the east road — my White Poles will hold the rear.']] },
      { title: 'IV · The road east', text: 'Break out to the east road with what is left of your company. The Bordered Yellow Banner is moving to cut you off.', show: ['ebridge'], hide: ['guns', 'camp'],
        start: [['release', 'cut'], ['dir', 'cut', 'hold', 74, -10], ['dir', 'qin', 'hold', 30, -20]],
        obj: { reach: 'ebridge', all2: true }, limit: 480, fail: 'The Jin closed the east road. None of the relief army escaped.',
        say: [[3, 'Qin Bangping', 'Go! Tell them in Sichuan we did not run.'], [120, 'Chen Ce', 'Keep moving! Do not stop to fight what you can walk around!']] },
    ],
    win: 'You broke out. Qin Bangping and the White Poles died to the last man on the Hun River; the Jin themselves called it the hardest fight of the war.',
  },
};
// Assault: attackers with limited manpower take sectors of fortified points one by one; defenders fall back
const OPS = {
  liaoyang: {
    title: '遼陽之戰 · Assault on Liaoyang', year: 'April 1621', battle: 'aizu', attacker: 1, tickets: 520,
    brief: 'The Jin storm Liaoyang, capital of Liaodong. Three lines stand between the banners and the keep: the outer trenches, the market quarter and the city gate.',
    zones: [{ key: 'a1', x: -40, z: -62, r: 12, name: 'A · West trench', owner: 0, rate: 0.55 }, { key: 'b1', x: 40, z: -62, r: 12, name: 'B · East trench', owner: 0, rate: 0.55 },
      { key: 'a2', x: 0, z: 6, r: 14, name: 'A · Market quarter', owner: 0, rate: 0.5 }, { key: 'b2', x: -60, z: 20, r: 12, name: 'B · Drum tower', owner: 0, rate: 0.55 },
      { key: 'a3', x: 0, z: 63, r: 10, name: 'A · City gate', owner: 0, rate: 0.45 }, { key: 'b3', x: 0, z: 96, r: 13, name: 'B · The keep', owner: 0, rate: 0.4 }],
    forts: [[-40, -52, 9, 0.5, 1.4, 'palisade'], [40, -52, 9, 0.5, 1.4, 'palisade'], [-52, -60, 0.5, 6, 1.4, 'palisade'], [52, -60, 0.5, 6, 1.4, 'palisade'], [-34, -66, 2, 1.5, 1.3, 'mantlet'], [34, -66, 2, 1.5, 1.3, 'mantlet'],
      [-60, 26, 3, 3, 4.5, 'keep'], [-10, -6, 6, 0.5, 1.5, 'palisade'], [10, -6, 6, 0.5, 1.5, 'palisade']],
    sectors: [['a1', 'b1'], ['a2', 'b2'], ['a3', 'b3']],
    def: [[['rifle_imp', 'ashigaru', 'samurai'], -40, -58], [['rifle_imp', 'ashigaru', 'armstrong'], 40, -58], [['samurai', 'rifle_imp', 'yuanyang'], 0, 10], [['rifle_imp', 'ashigaru'], -60, 20], [['rifle_imp', 'samurai', 'armstrong', 'armstrong'], 0, 80], [['yuanyang', 'samurai', 'rifle_imp'], 0, 96]],
    att: [['samurai', 'samurai', 'archer', 'rifle_sho', 'cannon4'], ['samurai', 'ashigaru', 'archer', 'byakkotai'], ['cavalry', 'samurai', 'archer', 'rifle_sho'], ['samurai', 'byakkotai', 'archer', 'cannon4'], ['shinsengumi', 'samurai', 'archer', 'rifle_sho'], ['samurai', 'samurai', 'byakkotai', 'archer']],
    attAt: [0, -140, 0],
  },
  shanhai: {
    title: '山海關 · The First Pass Under Heaven', year: 'May 1644', battle: 'bonari', attacker: 1, tickets: 480,
    brief: 'Li Zicheng\'s rebels hold Beijing; the Qing banners come down on Shanhai Pass. The pass is narrow: an outer trench line, the earthwork, and the great gate itself.',
    zones: [{ key: 'a1', x: -14, z: -40, r: 11, name: 'A · Trench line', owner: 0, rate: 0.55 }, { key: 'b1', x: 16, z: -34, r: 11, name: 'B · Signal tower', owner: 0, rate: 0.55 },
      { key: 'a2', x: 0, z: 32, r: 11, name: 'A · Outer earthwork', owner: 0, rate: 0.5 },
      { key: 'a3', x: -10, z: 92, r: 11, name: 'A · Pass gate', owner: 0, rate: 0.45 }, { key: 'b3', x: 14, z: 104, r: 10, name: 'B · Gate tower', owner: 0, rate: 0.45 }],
    forts: [[-14, -32, 8, 0.5, 1.4, 'palisade'], [16, -26, 6, 0.5, 1.4, 'palisade'], [16, -40, 2.5, 2.5, 5, 'keep'], [0, 40, 10, 0.6, 1.8, 'palisade'], [-8, 26, 2, 1.5, 1.3, 'mantlet'], [8, 26, 2, 1.5, 1.3, 'mantlet'], [14, 110, 3, 3, 6, 'keep']],
    sectors: [['a1', 'b1'], ['a2'], ['a3', 'b3']],
    def: [[['rifle_imp', 'ashigaru'], -14, -36], [['rifle_spencer', 'samurai'], 16, -32], [['rifle_imp', 'yuanyang', 'armstrong', 'samurai'], 0, 36], [['rifle_imp', 'samurai', 'armstrong'], -10, 96], [['rifle_imp', 'ashigaru', 'armstrong'], 14, 104]],
    att: [['samurai', 'samurai', 'archer', 'rifle_sho'], ['samurai', 'ashigaru', 'archer', 'cannon4'], ['samurai', 'byakkotai', 'archer', 'rifle_sho'], ['shinsengumi', 'samurai', 'archer', 'cannon4'], ['samurai', 'samurai', 'archer', 'byakkotai']],
    attAt: [0, -138, 0],
  },
};
Sim.prototype.missionZone = function (key) { return this.objectives.find(o => o.key === key); };
Sim.prototype.setupMission = function (teams, aiPl) {
  const M = this.mission, ass = this.mode === 'assault'; this.mg = {}; this.mv = { ph: -1, t0: 0, hold: 0, said: {}, waves: {}, ats: {} };
  const rz = (x) => { const rv = this.layout.river; return rv && rv.axis === 'x' ? rv.c0 + rv.amp * sin(x * rv.freq + rv.ph) : 0; };
  for (const f of M.forts || []) this.boxes.push({ x: f[0], z: f[1], hw: f[2], hd: f[3], h: f[4], kind: f[5] || 'palisade' });
  this.objectives = (M.zones || []).map((z, i) => ({ id: i, key: z.key, x: z.x, z: z.zr !== undefined ? rz(z.x) + z.zr : z.z, r: z.r, name: z.name, ctrl: z.owner === 1 ? -100 : z.owner === 0 ? 100 : 0, owner: z.owner === undefined ? -1 : z.owner, hidden: true, rate: z.rate || 1 }));
  for (const e of teams[0].concat(teams[1])) { e.army = []; e.player.army = []; }
  const humans = this.players.filter(p => !p.ai);
  const mk = (gid, G) => { aiPl(G.team, G.name, G.army.slice()); const pl = this.players[this.players.length - 1]; pl.gid = gid; this.mg[gid] = { p: pl.idx, G, released: !G.reserve, broken: false }; return pl; };
  if (ass) { // assault: defender garrisons per point, attacker corps that arrive as manpower allows
    const A = M.attacker, D = 1 - A;
    M.def.forEach((d, i) => mk('d' + i, { team: D, name: 'Garrison ' + (i + 1), army: d[0], at: [d[1], d[2], A === 1 ? PI : 0], reserve: i >= M.sectors[0].length + 0 && false }));
    M.att.forEach((a, i) => mk('a' + i, { team: A, name: AI_NAMES[A][i % 5], army: a, at: [M.attAt[0] + ((i % 3) - 1) * 40, M.attAt[1], M.attAt[2]], reserve: i >= 2 }));
  } else for (const gid in M.groups) mk(gid, M.groups[gid]);
  for (const p of this.players) if (p.ai) { const g = this.mg[p.gid], G = g.G; this.placeArmy({ player: p, army: p.army }, G.team, G.at[0], G.at[1], G.at[2]);
    const lab = G.team === 1 && M.labels; if (lab) for (const id of p.squads) { const q = this.squads[id], L = lab[q.type]; if (!L) continue; const nd = Object.assign({}, q.def, { name: L[0], jp: L[1] }); q.def = nd; for (const uid of q.unitIds) { const u = this.units[uid]; u.def = Object.assign({}, u.def, { name: L[0], jp: L[1] }); } }
    const h = this.units[p.heroId]; if (h && G.officer) { h.def = Object.assign({}, h.def, { hp: h.def.hp * G.officer, name: G.name, dmg: h.def.dmg.map(x => x * 1.4) }); h.hp = h.def.hp; h.officer = true; }
    if (G.reserve) { p.inactive = true; for (const id of p.squads) { const q = this.squads[id]; q.inactive = true; for (const uid of q.unitIds) this.units[uid].inactive = true; } for (const uid of [p.heroId, p.horseId]) if (uid >= 0) this.units[uid].inactive = true; }
    this.mDir(p.gid, G.dir); }
  if (ass) { this.tickets = M.tickets; this.sector = 0; M.sectors[0].forEach(k => this.missionZone(k).hidden = false); this.assaultDirs(); this.mv.ph = 0; }
  // humans: in the campaign each leads a squad of the troops they chose (two when alone) and rides with it
  if (!ass) {
    humans.forEach((p, i) => { const c = this.cfg.players[p.idx] || {}; const t = roleType(c.role, M.side); p.team = M.side; p.army = humans.length === 1 ? [t, M.soloExtra || 'ashigaru'] : [t];
      const s = M.start; this.placeArmy({ player: p, army: p.army }, M.side, s[0] + (i - (humans.length - 1) / 2) * 26, s[1], s[2]); p.spare = 2; p.auto = false; p.ready = true;
      for (const id of p.squads) this.squads[id].order = ORD_FOLLOW; });
  } else {
    humans.forEach((p) => { const c = this.cfg.players[p.idx] || {}; const want = (c.team | 0) === M.attacker ? M.attacker : 1 - M.attacker; p.team = want; p.auto = false; p.ready = true; p.heroId = -1; p.commanderId = -1;
      const role = roleType(c.role, want); const sq = this.squads.find(q => q.team === want && q.type === role && !q.inactive) || this.squads.find(q => q.team === want && !q.inactive && !q.def.mounted && q.def.ai !== 'cannon');
      p.soldierSq = sq ? sq.id : 0; this.possess(p, sq); });
  }
};
Sim.prototype.mDir = function (gid, dir) {
  const g = this.mg[gid]; if (!g || !dir) return; const p = this.players[g.p]; const k = dir[0];
  if (k === 'support') { const h = this.players.find(q => !q.ai); p.directive = { kind: DIR_SUPPORT, x: 0, z: 0, by: h ? h.idx : 0 }; }
  else if (k === 'hold') p.directive = { kind: DIR_HOLD, x: dir[1], z: dir[2], by: -1 };
  else p.directive = { kind: DIR_ATTACK, x: 0, z: 0, by: -1 };
};
Sim.prototype.mRelease = function (gid) {
  const g = this.mg[gid]; if (!g || g.released) return; g.released = true; const p = this.players[g.p]; p.inactive = false;
  for (const id of p.squads) { const q = this.squads[id]; q.inactive = false; for (const uid of q.unitIds) this.units[uid].inactive = false; }
  for (const uid of [p.heroId, p.horseId]) if (uid >= 0) this.units[uid].inactive = false;
  if (!this.mission.groups || !this.mission.groups[gid] || !this.mission.groups[gid].dir) p.directive = { kind: DIR_ATTACK, x: 0, z: 0, by: -1 };
  this.events.push({ t: 'mwave', team: p.team, name: p.name, gid });
};
Sim.prototype.mGroupFrac = function (gid) { // fraction of the group's men still fighting
  const g = this.mg[gid]; if (!g) return 0; const p = this.players[g.p]; let a = 0, n = 0; for (const id of p.squads) { const q = this.squads[id]; n += q.count; if (!q.inactive) a += q.aliveCount; else a += q.count; } return n ? a / n : 0;
};
Sim.prototype.mBreak = function (gid) { // a beaten group gives up the field and withdraws (no morale rout needed)
  const g = this.mg[gid]; if (!g || g.broken) return; g.broken = true; const p = this.players[g.p]; const ex = g.G.exit || [g.G.at[0], g.G.team === 1 ? HALF : -HALF];
  p.directive = { kind: DIR_HOLD, x: clamp(ex[0], -HALF + 2, HALF - 2), z: clamp(ex[1], -HALF + 2, HALF - 2), by: -1 }; p.fleeing = true;
  this.events.push({ t: 'mbreak', gid, name: p.name, team: p.team });
};
Sim.prototype.mAct = function (a) {
  if (a[0] === 'release') this.mRelease(a[1]);
  else if (a[0] === 'dir') this.mDir(a[1], a.slice(2));
  else if (a[0] === 'say') this.events.push({ t: 'msay', who: a[1], text: a[2] });
  else if (a[0] === 'show') { const z = this.missionZone(a[1]); if (z) z.hidden = false; }
  else if (a[0] === 'hide') { const z = this.missionZone(a[1]); if (z) z.hidden = true; }
};
Sim.prototype.humansIn = function (z) { for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId]; if (h && !h.dead && len(h.x - z.x, h.z - z.z) < z.r + 2) return true; for (const id of p.squads) { const q = this.squads[id]; if (q.alive && len(q.cx - z.x, q.cz - z.z) < z.r + 3) return true; } } return false; };
// evaluate one objective; returns 1 when met, -1 when failed, 0 otherwise
Sim.prototype.mObj = function (o, el) {
  if (o.all) { let ok = 1; for (const s of o.all) { const r = this.mObj(s, el); if (r < 0) return -1; if (r === 0) ok = 0; } if (ok && o.keep === undefined && !o.reach) return 1; if (!ok) return 0; }
  if (o.keep) { const z = this.missionZone(o.keep); if (z && z.owner === 1 - this.mission.side) return -1; }
  if (o.reach) { const z = this.missionZone(o.reach); if (!(z && this.humansIn(z))) return 0; }
  if (o.hold) { const z = this.missionZone(o.hold); const k = 'hold:' + o.hold; if (z.n0 > 0 && z.n1 === 0) this.mv[k] = (this.mv[k] || 0) + 0.5; if ((this.mv[k] || 0) < o.t) return 0; }
  if (o.capture) { for (const k of o.capture) { const z = this.missionZone(k); if (z.owner !== this.mission.side) return 0; } }
  if (o.defeat) { for (const gid of o.defeat) { const g = this.mg[gid]; if (!g || (!g.released && !g.broken)) return 0; if (!g.broken && this.mGroupFrac(gid) > 1 - (o.frac || 0.8)) return 0; } for (const gid of o.defeat) this.mBreak(gid); }
  if (o.officer) { const g = this.mg[o.officer]; if (!g || !g.released) return 0; const h = this.units[this.players[g.p].heroId]; const wound = g.G.wound; if (h && !h.dead && !(wound && h.hp < h.def.hp * wound)) return 0; if (!g.broken) { this.events.push({ t: 'mofficer', name: g.G.name, zh: g.G.zh || '', gid: o.officer, wounded: !!(h && !h.dead) }); this.mBreak(o.officer); } }
  if (o.arrive) { const z = this.missionZone(o.zone), p = this.players[this.mg[o.arrive].p]; let n = 0, a = 0; for (const id of p.squads) { const q = this.squads[id]; if (!q.alive) continue; a++; if (len(q.cx - z.x, q.cz - z.z) < z.r + 8) n++; } if (a === 0) return -1; if (n < a) return 0; }
  if (o.survive) { if (el < o.survive) return 0; }
  return 1;
};
Sim.prototype.missionThink = function () {
  const M = this.mission; if (this.mode === 'assault') return this.assaultThink();
  const mv = this.mv;
  if (mv.ph < 0) { mv.ph = 0; mv.t0 = this.tick; this.mStart(); }
  const P = M.phases[mv.ph], el = (this.tick - mv.t0) / 30;
  for (const [t, gid, dir] of P.waves || []) { const k = mv.ph + ':' + gid; if (!mv.waves[k] && el >= t) { mv.waves[k] = 1; this.mRelease(gid); if (dir) this.mDir(gid, dir); } }
  for (const [t, a] of P.at || []) { const k = mv.ph + ':at:' + t; if (!mv.ats[k] && el >= t) { mv.ats[k] = 1; this.mAct(a); } }
  for (const [t, who, text] of P.say || []) { const k = mv.ph + ':' + t; if (!mv.said[k] && el >= t) { mv.said[k] = 1; this.events.push({ t: 'msay', who, text }); } }
  // broken groups melt away at the field's edge
  for (const gid in this.mg) { const g = this.mg[gid]; if (!g.broken) continue; const p = this.players[g.p]; for (const id of p.squads) { const q = this.squads[id]; for (const uid of q.unitIds) { const u = this.units[uid]; if (!u.dead && (Math.abs(u.x) > HALF - 12 || Math.abs(u.z) > HALF - 12)) this.flee(u); } } }
  // commanders who fall return to their men; a wiped-out company is replaced from the reserve (twice)
  for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId];
    if (h && h.dead) { if (!p.respawnT) p.respawnT = this.tick + 30 * 10; else if (this.tick >= p.respawnT) { const q = p.squads.map(id => this.squads[id]).find(q => q.alive); const sx = q ? q.cx : M.start[0], sz = q ? q.cz - 6 : M.start[1];
        h.dead = false; h.hp = h.def.hp; h.x = sx; h.z = sz; h.y = terrainH(sx, sz); h.px = h.x; h.pz = h.z; h.py = h.y; h.vx = h.vz = h.vy = 0; h.st = ST_IDLE; h.stT = 0; h.mount = -1; h.mounted = false; h.deathTick = -1; p.respawnT = 0; this.events.push({ t: 'respawn', id: h.id, p: p.idx }); } }
    if (!p.squads.some(id => this.squads[id].alive) && p.spare > 0 && !p.spareT) p.spareT = this.tick + 30 * 8;
    if (p.spareT && this.tick >= p.spareT) { p.spareT = 0; p.spare--; const a = this.players.find(q => q.ai && q.team === M.side && q.squads.some(id => this.squads[id].alive && !this.squads[id].inactive));
      if (a) { const sid = a.squads.find(id => this.squads[id].alive && !this.squads[id].inactive && this.squads[id].def.ai !== 'cannon'); if (sid !== undefined) { a.squads = a.squads.filter(id => id !== sid); const q = this.squads[sid]; q.owner = p.idx; p.squads.push(sid); q.order = ORD_FOLLOW; this.events.push({ t: 'mspare', p: p.idx, sq: sid }); } } } }
  const lost = this.players.filter(p => !p.ai).every(p => !p.squads.some(id => this.squads[id].alive) && !(p.spare > 0));
  let r = lost ? -1 : this.mObj(P.obj, el);
  if (r === 0 && P.limit && el > P.limit) r = -1;
  if (r < 0) { this.mOver(false, lost ? 'Your companies are gone.' : (P.fail || 'The objective is lost.')); return; }
  if (r > 0) { for (const a of P.done || []) this.mAct(a); for (const k of P.hide || []) this.mAct(['hide', k]); if (mv.ph + 1 >= M.phases.length) { this.mOver(true, M.win); return; } mv.ph++; mv.t0 = this.tick; this.mStart(); }
};
Sim.prototype.mStart = function () { const P = this.mission.phases[this.mv.ph]; for (const k of P.show || []) this.mAct(['show', k]); for (const k of P.hide || []) this.mAct(['hide', k]); for (const a of P.start || []) this.mAct(a); this.events.push({ t: 'mphase', ph: this.mv.ph, title: P.title, text: P.text }); };
Sim.prototype.mOver = function (won, text) { if (this.mwin !== undefined) return; this.mwin = won ? this.mission.side : 1 - this.mission.side; this.events.push({ t: 'mend', won, text }); };
// ---- assault
Sim.prototype.assaultDirs = function () {
  const M = this.mission, A = M.attacker, keys = M.sectors[this.sector] || []; const zs = keys.map(k => this.missionZone(k)).filter(z => z && z.owner !== A);
  const zt = zs.length ? zs : keys.map(k => this.missionZone(k));
  let i = 0; for (const gid in this.mg) { const g = this.mg[gid], p = this.players[g.p]; if (g.G.team !== A || g.broken) continue; const z = zt[i++ % zt.length]; if (z) p.directive = { kind: DIR_HOLD, x: z.x, z: z.z, by: -1 }; }
  // defenders: garrisons of this sector hold their points; garrisons of lost sectors fall back to the next line
  const D = 1 - A; let j = 0; for (const gid in this.mg) { const g = this.mg[gid], p = this.players[g.p]; if (g.G.team !== D) continue; const di = +gid.slice(1), home = this.missionZone(this.defKey(di)); if (home && home.owner === D) { p.directive = { kind: DIR_HOLD, x: home.x, z: home.z, by: -1 }; continue; } const nz = zt[j++ % zt.length]; if (nz) p.directive = { kind: DIR_HOLD, x: nz.x, z: nz.z, by: -1 }; }
};
Sim.prototype.defKey = function (di) { const M = this.mission; let k = 0; for (const s of M.sectors) for (const key of s) { if (k === di) return key; k++; } return null; };
Sim.prototype.assaultThink = function () {
  const M = this.mission, A = M.attacker; const keys = M.sectors[this.sector];
  // manpower: every attacking man who falls costs a ticket; reserves march on while tickets last and the line is thin
  let act = 0; for (const u of this.teamAlive[A]) if (!u.inactive && u.type !== 'horse') act++;
  if (act < 120 && this.tickets > 0) { const next = Object.keys(this.mg).find(g => this.mg[g].G.team === A && !this.mg[g].released); if (next) { this.mRelease(next); this.assaultDirs(); } }
  if (keys.every(k => this.missionZone(k).owner === A)) {
    this.events.push({ t: 'msector', sector: this.sector, team: A });
    for (const k of keys) this.missionZone(k).hidden = true;
    this.sector++; this.tickets += 90;
    if (this.sector >= M.sectors.length) { this.mwin = A; this.events.push({ t: 'mend', won: true, text: 'Every line has fallen.', att: A }); return; }
    for (const k of M.sectors[this.sector]) this.missionZone(k).hidden = false;
    this.assaultDirs();
  }
  if (this.tick % 150 === 0) this.assaultDirs();
  if (this.tickets <= 0 && act === 0) { this.mwin = 1 - A; this.events.push({ t: 'mend', won: false, text: 'The attackers have no men left to send.', att: A }); }
};
