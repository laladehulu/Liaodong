// ===================== the newer battlefields (maps agent) =====================
// Each map is a BATTLES entry (name, period, biome, deployment) plus a MAPS entry that shapes the ground (terrain) and
// lays the structures with their colliders (build). Loaded right after sim.js in every edition; deterministic: only the
// RNG handed in and DM trig. Sources are cited per map; where a plan does not survive the comment says so.
// Conventions: team 0 (Ming) deploys at z < 0 and attacks toward +z, team 1 (Jin / Qing) at z > 0. A map's "north" is
// whichever way the Ming faced, so the Jin side of each field is +z. The field is 300 m square (HALF = 150).
(function () { if (typeof SIM === 'undefined') return;
  const B = SIM.BATTLES, M = SIM.MAPS, cityWall = SIM.cityWall; const { sin, cos } = DM; const PI = Math.PI, TAU = PI * 2;
  // builders shared by the maps (every box they make is a sim collider that the renderer draws at that size)
  const pal = (sim, x0, x1, z, h) => { for (let x = x0; x < x1; x += 3) sim.boxes.push({ x: x + 1.5, z, hw: 1.5, hd: 0.5, h: h || 1.6, kind: 'palisade' }); };
  const palZ = (sim, x, z0, z1, h) => { for (let z = z0; z < z1; z += 3) sim.boxes.push({ x, z: z + 1.5, hw: 0.5, hd: 1.5, h: h || 1.6, kind: 'palisade' }); };
  const stockade = (sim, keep, x0, z0, x1, z1, gate) => { /* a palisaded camp with a gap of 6 m in the side named by gate: 'n' (+z), 's', 'e', 'w' */
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (gate === 's') { pal(sim, x0, cx - 3, z0); pal(sim, cx + 3, x1, z0); } else pal(sim, x0, x1, z0);
    if (gate === 'n') { pal(sim, x0, cx - 3, z1); pal(sim, cx + 3, x1, z1); } else pal(sim, x0, x1, z1);
    if (gate === 'w') { palZ(sim, x0, z0, cz - 3); palZ(sim, x0, cz + 3, z1); } else palZ(sim, x0, z0, z1);
    if (gate === 'e') { palZ(sim, x1, z0, cz - 3); palZ(sim, x1, cz + 3, z1); } else palZ(sim, x1, z0, z1);
    keep.push({ x: cx, z: cz, r: Math.max(x1 - x0, z1 - z0) / 2 + 4 }); };
  const house = (sim, keep, x, z, hw, hd, burnt) => { sim.boxes.push({ x, z, hw, hd, h: burnt ? 2 : 3.3, kind: 'house', burnt: !!burnt }); keep.push({ x, z, r: Math.max(hw, hd) + 3 }); };
  const wagons = (sim, keep, x0, z0, n, dx, dz) => { for (let i = 0; i < n; i++) { const x = x0 + dx * i, z = z0 + dz * i; sim.boxes.push({ x, z, hw: dx ? 1.9 : 1.1, hd: dx ? 1.1 : 1.9, h: 1.8, kind: 'wagon' }); } keep.push({ x: x0 + dx * (n - 1) / 2, z: z0 + dz * (n - 1) / 2, r: Math.max(Math.abs(dx), Math.abs(dz)) * n / 2 + 3 }); };
  const trees = (sim, rng, clear, n, x0, x1, z0, z1, pine) => { for (let i = 0; i < n; i++) { const x = rng.range(x0, x1), z = rng.range(z0, z1); if (!clear(x, z, 2.5)) continue; sim.obstacles.push({ x, z, r: 0.45, kind: 0, variant: pine === undefined ? (rng.next() < 0.45 ? 1 : 0) : pine, scale: rng.range(0.8, 1.5), rot: rng.range(0, TAU) }); } };
  const rocks = (sim, rng, clear, n, x0, x1, z0, z1) => { for (let i = 0; i < n; i++) { const x = rng.range(x0, x1), z = rng.range(z0, z1); if (!clear(x, z, 3)) continue; sim.obstacles.push({ x, z, r: rng.range(0.7, 2.2), kind: 1, rot: rng.range(0, TAU) }); } };

  // ---------- 薩爾滸 Sarhu, the first day of the third month, 1619 ----------
  // 《滿文老檔》天命四年三月初一; 《清太祖實錄》卷六; 《明史》杜松傳; 《籌遼碩畫》卷十三 (the Ming reports of the four routes).
  // Du Song's western column came up the Hun River valley. He left his guns, wagons and two-thirds of the men in a camp
  // on the hill of Sarhu on the south bank, and crossed the river with the rest to assault the Jin workmen's fort on
  // Jiefan hill (界凡/吉林崖) opposite. Nurhaci sent two banners to stiffen Jiefan and threw six at the Sarhu camp,
  // which broke by evening; then the whole host fell on the crossing party, which died with its back to the river.
  // Here the Ming hold the Sarhu hill camp (south, -z) with the river below it; the Jin come down from Jiefan and
  // the valley to the north. The river is the Hun, fordable where Du Song forded it (the Jin crossing is the same ford).
  B.sarhu = { name: 'Sarhu', jp: '薩爾滸', when: 'April 1619', biome: 'winter', fog: 0.2, terrain: 0.8, features: [], horizon: { lo: 1 }, /* 《滿文老檔》三月初一: 是日大雪 — it snowed on the day, and the hills were still white */
    desc: 'Du Song\'s wagon camp on the Sarhu hill above the Hun River, the ford below it, and Jiefan hill rising beyond. The banners come down the valley at the camp; the river is at the Ming\'s back.' };
  M.sarhu = { trees: 120, rocks: 30,
    terrain(L, r) { L.hills.push({ x: -10, z: -70, rx: 62, rz: 40, rot: 0.35, h: 16 }); /* Sarhu hill: a long wooded hill along the south bank (薩爾滸山) */
      L.hills.push({ x: 40, z: 128, rx: 70, rz: 34, rot: -0.2, h: 18 }); /* Jiefan hill across the river, the half-built fort on its crest beyond the field edge */
      L.hills.push({ x: -140, z: 60, r: 50, h: 10 }); L.hills.push({ x: 150, z: -20, r: 40, h: 8 });
      L.river = { axis: 'x', c0: 22, amp: 7, freq: 0.021, ph: 1.2, w: 8, depth: 3.2, bridges: [{ at: -20, hw: 12, ford: true }] }; /* the Hun, spring melt (《籌遼碩畫》: 水深沒腹), one ford */
      L.rivers = [{ id: 1, axis: 'z', c0: 112, amp: 4, freq: 0.03, ph: 0.4, w: 6, depth: 2.4, a0: 20, a1: 160, bridges: [] }]; }, /* the 蘇子河 coming in from the north-east to join it (the confluence under Jiefan) */
    objectives: [{ x: -12, z: -62, r: 14, name: 'The Sarhu camp' }, { x: -20, z: 22, r: 12, name: 'The Hun River ford' }, { x: 60, z: 62, r: 11, name: 'The valley road' }],
    noTree(x, z) { return Math.abs(x + 12) < 30 && Math.abs(z + 62) < 26; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: -20, w: 5 }); sim.roadX = -20;
      /* the camp: Ming wagon laager (車營, 《練兵實紀》) on the hill crest, the carts chained in a ring with mantlets between, the guns' platform in the middle */
      wagons(sim, keep, -36, -78, 6, 7, 0); wagons(sim, keep, -36, -44, 6, 7, 0); wagons(sim, keep, -40, -72, 4, 0, 7); wagons(sim, keep, 10, -72, 4, 0, 7);
      for (const [x, z] of [[-26, -61], [-12, -61], [2, -61]]) { sim.boxes.push({ x, z, hw: 1.15, hd: 0.2, h: 1.35, kind: 'mantlet' }); }
      sim.boxes.push({ x: -12, z: -62, hw: 2.4, hd: 2.4, h: 1.0, kind: 'rampart', tight: true }); keep.push({ x: -12, z: -62, r: 6 });
      /* the Jin workmen's stockade on the near slope of Jiefan, abandoned when the banners came through (《滿文老檔》: 界凡築城夫役) */
      stockade(sim, keep, 118, 104, 144, 126, 's');
      for (const [x, z, bt] of [[-98, 40, 0], [-84, 48, 0], [-106, 58, 1]]) house(sim, keep, x, z, 2.8, 2.4, bt); /* a Jurchen hamlet on the north bank, one house burnt by Du Song's scouts the day before */
      trees(sim, r, clear, 90, -80, 60, -120, -30, 0); trees(sim, r, clear, 50, -10, 100, 90, 145, 0); rocks(sim, r, clear, 16, -60, 40, 30, 60); } };

  // ---------- 松錦 Songshan, the eighth month of 1641 ----------
  // 《清太宗實錄》崇德六年八月 (the Khan rode from Shenyang in six days, camped on the hills between Songshan and Xingshan,
  // and dug three lines of trench from the hills to the sea, cutting the road to Ningyuan and the grain at 筆架山);
  // 《明史》洪承疇傳; 《崇禎實錄》十四年八月; 《國榷》卷九十七. Hong Chengchou's eight generals camped in a line between 乳峰山
  // (Rufeng hill, north-east of Songshan city) and the shore. On the night of the 21st six of the eight broke south for
  // Xingshan and Ningyuan and were cut up in the trenches and on the beach; Hong held Songshan city till the spring.
  // Here the Ming camps lie on the slopes under Rufeng hill (west, -x) with the sea to the east; the Qing trench lines
  // run across the field from the hills to the shore, their earth thrown up toward the Ming. The grain depot on the
  // spit is the objective the Qing took first.
  B.songjin = { name: 'Rufeng Hill', jp: '松錦 · 乳峰山', when: 'August 1641', biome: 'summer', fog: 0.1, terrain: 0.5, features: [], horizon: { lo: 0.7, nokarst: true, open: [0.6, 2.5] },
    desc: 'Hong Chengchou\'s camps between Rufeng hill and the Bohai shore. The Qing have dug trench lines from the hills to the sea across the road south; the grain on the spit is behind them.' };
  M.songjin = { trees: 60, rocks: 24, nomant: true,
    terrain(L, r) { L.hills.push({ x: -150, z: 20, rx: 50, rz: 110, rot: 0.15, h: 26 }); /* 乳峰山 along the west edge */ L.hills.push({ x: -96, z: -70, r: 34, h: 7 }); L.hills.push({ x: -90, z: 60, r: 30, h: 6 });
      L.sea = { x0: 112, depth: 6, islands: [{ x: 122, z: 98, r: 15 }, { x: 134, z: 118, r: 14 }] }; L.hills.push({ x: 130, z: 108, rx: 12, rz: 22, rot: 0.4, h: 5 }); /* 筆架山, the grain depot's spit, joined to the shore at low tide */
      L.trenches = [{ x0: -100, z0: 26, x1: 112, z1: 34, w: 2.6, depth: 1.9, bank: 1.1, gaps: [-20, 60] }, { x0: -92, z0: 54, x1: 114, z1: 60, w: 2.6, depth: 1.9, bank: 1.1, gaps: [10] }, { x0: -80, z0: 82, x1: 116, z1: 86, w: 2.6, depth: 1.9, bank: 1.1, gaps: [-40, 40] }]; },
    objectives: [{ x: -20, z: 30, r: 12, name: 'The first trench' }, { x: 10, z: 57, r: 12, name: 'The second trench' }, { x: 120, z: 96, r: 13, name: 'Bijia Hill grain depot' }, { x: -61, z: -58, r: 14, name: 'Wu Sangui\'s camp' }],
    noTree(x, z) { return (z > 18 && z < 96) || x > 100; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 24, w: 6 }); sim.roadX = 24; /* the road south to Xingshan and Ningyuan */
      /* the Ming generals' camps (《明史》: 八總兵列營) on the slopes west of the road, each a stockade with its banner; Wu Sangui, Wang Pu, Cao Bianjiao, Ma Ke */
      stockade(sim, keep, -78, -72, -44, -44, 'n'); stockade(sim, keep, -30, -80, 4, -52, 'n'); stockade(sim, keep, 14, -76, 48, -48, 'n'); stockade(sim, keep, -116, -50, -82, -22, 'e'); /* in front of the deployment rows: the camps were the forward line */
      for (let i = 0; i < 5; i++) sim.boxes.push({ x: -61 + (i - 2) * 5, z: -50, hw: 1.9, hd: 1.1, h: 1.8, kind: 'wagon' });
      /* the Qing side: behind the third trench, the Khan's camp of the Yellow Banners and the horse lines; fascine bundles (the trench spoil's revetment) as cover along the first line */
      stockade(sim, keep, -142, 96, -108, 128, 'e'); /* the Khan's camp under the hill, out of the deployment ground (the horse lines beyond the field edge) */
      for (let x = -90; x < 100; x += 14) { if (Math.abs(x + 20) < 6 || Math.abs(x - 60) < 6) continue; sim.boxes.push({ x, z: 29 + (x + 100) * 8 / 212, hw: 1.15, hd: 0.2, h: 1.35, kind: 'mantlet' }); }
      /* the grain depot on Bijia spit: stacked sacks under matting, a palisade across the neck */
      for (const [x, z] of [[118, 92], [124, 100], [116, 104]]) sim.boxes.push({ x, z, hw: 2.4, hd: 1.6, h: 1.8, kind: 'house' }); palZ(sim, 108, 86, 110); keep.push({ x: 120, z: 98, r: 14 });
      trees(sim, r, clear, 50, -140, -60, -120, 130, 0); rocks(sim, r, clear, 14, -140, -90, -100, 100); } };

  // ---------- 撫順 Fushun, the fourth month of 1618 ----------
  // 《滿文老檔》天命三年四月十三–十五日 (the Seven Grievances read, the host at Fushun by dawn of the 15th; Li Yongfang
  // surrendered the city; the Guangning relief under 張承廕 came up the next day and was destroyed in the open);
  // 《明史》張承廕傳, 《明神宗實錄》萬曆四十六年四月; 《遼東志》撫順千戶所 (a square brick-faced wall of one li and a
  // half, a market gate on the east where the Jurchen horse fair was held). The city stands on the north bank of the
  // Hun River under the hills; the relief column from Shenyang came along the south bank road and crossed below the
  // town. Here the city is at the north edge (Jin-held, +z), the Hun River crosses the field with the stone bridge of
  // the Shenyang road and a ford east of it, and the Ming relief deploys on the south bank. No plan of the 1618 wall
  // survives; the wall here follows the 《遼東志》 dimensions.
  B.fushun = { name: 'Fushun', jp: '撫順', when: 'April 1618', biome: 'spring', fog: 0.15, terrain: 0.55, features: [], horizon: { lo: 0.8, nokarst: true },
    desc: 'The first Ming city to fall. Fushun\'s walls on the north bank of the Hun, the horse-fair gate open; the relief column from Shenyang must cross by the stone bridge or the ford under the banners\' eyes.' };
  M.fushun = { trees: 90, rocks: 20,
    terrain(L, r) { L.hills.push({ x: -40, z: 200, rx: 110, rz: 40, rot: 0.1, h: 16 }); L.hills.push({ x: 140, z: 120, r: 36, h: 7 }); L.hills.push({ x: -150, z: -60, r: 50, h: 8 });
      L.river = { axis: 'x', c0: 10, amp: 6, freq: 0.02, ph: 2.1, w: 9, depth: 3.4, bridges: [{ at: -30, hw: 4 }, { at: 70, hw: 10, ford: true }] };
      }, /* the moat along the south wall (《遼東志》: 池深一丈) lies beyond the field edge with the wall */
    objectives: [{ x: -30, z: 10, r: 11, name: 'The stone bridge' }, { x: 70, z: 12, r: 12, name: 'The ford' }, { x: 0, z: 132, r: 11, name: 'The south gate' }],
    noTree(x, z) { return z > 112; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: -30, w: 6 }); sim.roadX = -30;
      cityWall(sim, { axis: 'x', at: 157, from: -70, to: 70, h: 9, hd: 3, out: -1, gx: 0, gw: 3.2, name: '撫順', nobast: true }); /* the south wall and gate at the field's north edge; the city itself lies beyond */
      keep.push({ x: 0, z: 157, r: 70 });
      /* the horse-fair suburb (馬市) outside the east wall: stalls and a few houses, the Jin's first foothold (《滿文老檔》: the host came in as traders) */
      for (const [x, z, bt] of [[108, 130, 0], [120, 124, 0], [132, 132, 1], [114, 140, 0]]) house(sim, keep, x, z, 2.8, 2.4, bt);
      for (let i = 0; i < 4; i++) sim.boxes.push({ x: 124 + i * 6, z: 112, hw: 1.9, hd: 1.1, h: 1.8, kind: 'wagon' }); keep.push({ x: 133, z: 112, r: 12 });
      /* the village of the south bank where Zhang Chengyin's column halted (《明史》: 至撫順城南) */
      for (const [x, z] of [[-70, -40], [-58, -52], [-82, -56], [-66, -70]]) house(sim, keep, x, z, 3, 2.6, false);
      trees(sim, r, clear, 60, -140, 140, -120, -20, undefined); trees(sim, r, clear, 30, 100, 145, 20, 100, undefined); } };

  // ---------- 廣寧 Guangning: 平陽橋 and 沙嶺, the first month of 1622 ----------
  // 《滿文老檔》天命七年正月二十日–二十四日 (the Khan crossed the frozen Liao at 西平堡, the Ming relief under 劉渠 and
  // 祁秉忠 met the banners at 平陽橋 (Pingyang bridge) and were broken; 孫得功 fled, the army was cut up at 沙嶺;
  // Guangning opened its gates); 《明史》王化貞傳, 熊廷弼傳; 《明熹宗實錄》天啟二年正月. The country west of the Liao is a
  // flat snow plain cut by frozen streams and reed marsh; the only rise is the sand ridge of Shaling. Here the Liao's
  // marsh lies to the east (+x) as frozen reed beds (slow going), the Pingyang bridge carries the road over a frozen
  // stream in the middle, and the Shaling sand ridge runs across the Ming side where the rout was caught.
  B.shaling = { name: 'Pingyang Bridge', jp: '平陽橋 · 沙嶺', when: 'January 1622', biome: 'winter', fog: 0.3, terrain: 0.25, features: [], horizon: { lo: 0.25, nokarst: true, open: [0.4, 2.7] },
    desc: 'The snow plain west of the Liao. The Guangning relief army holds the sand ridge of Shaling; the banners come over the frozen stream at Pingyang bridge. Everything else is reed marsh and ice.' };
  M.shaling = { trees: 24, rocks: 6,
    terrain(L, r) { L.hills.push({ x: 10, z: -62, rx: 120, rz: 16, rot: 0.08, h: 5 }); /* 沙嶺: a long low sand ridge */ L.hills.push({ x: -150, z: 80, r: 50, h: 4 });
      L.river = { axis: 'x', c0: 20, amp: 8, freq: 0.018, ph: 0.8, w: 8, depth: 2.6, ice: true, bridges: [{ at: 0, hw: 4 }] }; /* the frozen stream, the bridge the only dry crossing: the ice is walked slowly */
      L.rivers = [{ id: 1, axis: 'z', c0: 128, amp: 5, freq: 0.025, ph: 2.5, w: 14, depth: 2.2, ice: true, bridges: [] }]; }, /* the Liao's flood channel and reed marsh on the east, frozen */
    objectives: [{ x: 0, z: 18, r: 12, name: 'Pingyang bridge' }, { x: 10, z: -62, r: 14, name: 'The Shaling ridge' }, { x: -70, z: 70, r: 12, name: 'Xiping post road' }],
    noTree(x, z) { return x > 110 || Math.abs(z - 20) < 14; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 0, w: 6 }); sim.roadX = 0;
      /* the relief army's wagon line along the ridge crest (《明史》: 列車營 on the ridge, the men behind the carts) */
      wagons(sim, keep, -54, -60, 7, 7, 0); wagons(sim, keep, 14, -62, 7, 7, 0);
      for (const [x, z] of [[-48, -58], [-20, -58], [22, -60], [50, -60]]) sim.boxes.push({ x, z, hw: 1.15, hd: 0.2, h: 1.35, kind: 'mantlet' });
      /* 西平堡 post road: a beacon tower and the post station's walled yard on the Jin side; reed stacks on the marsh edge */
      sim.boxes.push({ x: -70, z: 76, hw: 3, hd: 3, h: 7, kind: 'keep' }); keep.push({ x: -70, z: 76, r: 10 });
      stockade(sim, keep, -100, 60, -78, 82, 's'); for (const [x, z] of [[-92, 66], [-86, 74]]) sim.boxes.push({ x, z, hw: 2.4, hd: 2, h: 3, kind: 'house' });
      for (let i = 0; i < 8; i++) { const x = 100 + r.range(-6, 6), z = -110 + i * 30 + r.range(-8, 8); if (clear(x, z, 3)) sim.obstacles.push({ x, z, r: 1.6, kind: 1, rot: r.range(0, TAU) }); }
      trees(sim, r, clear, 20, -140, 100, -140, 140, 1); } };

  // ---------- 大凌河 Dalinghe, the eighth to tenth months of 1631 ----------
  // 《清太宗實錄》天聰五年八月初六 (the host arrived and in three days dug round the city: 掘壕四道, a trench ten feet across
  // and deep, a wall behind it, the whole ring thirty li, a camp of each banner at its station), 九月 (the Jinzhou relief
  // columns of 宋偉 and 吳襄 beaten at the Xiaoling river, Zhang Chun at 長山); 《明史》祖大壽傳, 孫承宗傳; 《崇禎長編》.
  // The city of Dalinghe (today's Linghai) is a small square fort that Zu Dashou was rebuilding when the Jin came; the
  // Daling river runs past its east side. Here the city's west wall stands at the Ming edge (-z, Zu Dashou's men inside
  // it) and the Jin ring of trench and bank crosses the field in front; the river is the east edge. The Jin deploy
  // behind their lines; the Ming inside the wall must sortie across the open ground into the trenches (as Zu did on the
  // 9th and 20th of the eighth month) or hold the gate.
  B.dalinghe = { name: 'Dalinghe', jp: '大凌河', when: 'September 1631', biome: 'autumn', fog: 0.12, terrain: 0.3, features: [], horizon: { lo: 0.5, nokarst: true },
    desc: 'Zu Dashou\'s half-built fort and the Jin ring round it: a trench ten feet deep with an earth wall behind, banner camps at intervals, the Daling River to the east. The sortie must cross the open ground and the trench.' };
  M.dalinghe = { trees: 40, rocks: 20, nomant: true,
    terrain(L, r) { L.hills.push({ x: -120, z: 100, r: 60, h: 7 }); L.hills.push({ x: 60, z: 130, r: 50, h: 5 });
      L.river = { axis: 'z', c0: 134, amp: 5, freq: 0.022, ph: 1.4, w: 10, depth: 3, bridges: [{ at: -60, hw: 9, ford: true }] }; /* the 大凌河, a ford on the Jinzhou road */
      L.trenches = [{ x0: -150, z0: 24, x1: 118, z1: 30, w: 3.2, depth: 2.8, bank: 1.6, gaps: [-70, 40] }, { x0: -150, z0: 44, x1: 118, z1: 50, w: 2.4, depth: 1.6, bank: 0.9, gaps: [-20] }]; }, /* 壕 and the inner line: the bank is thrown up on the city side (toward -z) */
    objectives: [{ x: 0, z: -92, r: 12, name: 'Under the west gate' }, { x: -70, z: 26, r: 11, name: 'The trench (west gap)' }, { x: 40, z: 28, r: 11, name: 'The trench (east gap)' }, { x: -131, z: 83, r: 13, name: 'The Bordered Yellow camp' }],
    noTree(x, z) { return (z > 14 && z < 60) || z < -80; },
    build(sim, r, keep, clear) {
      /* the city's west wall at the Ming edge, its gate in the middle: a wall half built (《明史》祖大壽傳: 城工未竣), so its ends are low rammed earth without the brick facing (lower h) */
      cityWall(sim, { axis: 'x', at: -163, from: -60, to: 60, h: 9, hd: 3.5, out: 1, gx: 0, gw: 3.2, name: '大凌河', nobast: true }); cityWall(sim, { axis: 'x', at: -163, from: -110, to: -64, h: 4.5, hd: 3, out: 1, notower: true, nobast: true }); cityWall(sim, { axis: 'x', at: -163, from: 64, to: 110, h: 4.5, hd: 3, out: 1, notower: true, nobast: true });
      keep.push({ x: 0, z: -163, r: 20 }); keep.push({ x: -87, z: -163, r: 10 }); keep.push({ x: 87, z: -163, r: 10 }); /* the wall stands at the field edge: the Ming sortie forms up under it */
      /* the Jin banner camps behind the inner line (《清太宗實錄》: 各旗營於所分汛地), with the shield carts (盾車) parked at the gaps */
      stockade(sim, keep, -146, 70, -116, 96, 'e'); stockade(sim, keep, 116, 70, 146, 96, 'w'); /* the camps on the flanks: the deployment ground is between them */
      for (const [x, z] of [[-74, 36], [-66, 36], [44, 38], [36, 38]]) sim.boxes.push({ x, z, hw: 1.6, hd: 0.5, h: 1.4, kind: 'mantlet' });
      /* the burnt houses of the suburb between the wall and the ring (the Jin burned the outer settlement on arrival) */
      for (const [x, z] of [[-40, -70], [34, -66], [-22, -52], [52, -48]]) house(sim, keep, x, z, 2.8, 2.4, true);
      trees(sim, r, clear, 40, -140, 110, 60, 140, 0); } };

  // ---------- 錦州 Jinzhou, the fifth month of 1627 (寧錦之戰) ----------
  // 《清太宗實錄》天聰元年五月十一日 (the host before Jinzhou at dawn; the city 'walled in brick and moated, its walls lined
  // with 紅夷砲'; thirteen days of assaults on the south and west faces with ladders and 盾車 broken by the guns; the
  // 28th moved on to Ningyuan and came back); 《明史》趙率教傳 (Zhao Shuaijiao held the city with Ji Yongzhen; the
  // Jin camps three li off; the Ming cavalry sortied on the 25th); 《明熹宗實錄》天啟七年五月, 《兩朝從信錄》. Jinzhou's wall
  // (《遼東志》: 廣寧中屯衛, 周五里二百二十步, 四門) had been rebuilt by Yuan Chonghuan the winter before. Here the west wall
  // and its gate fill the Ming edge, the moat in front, the Jin ladder parties and shield carts form up on the open
  // ground; a ruined temple and the burnt suburb give the attackers cover on the way in.
  B.jinzhou = { name: 'Jinzhou', jp: '錦州 (寧錦)', when: 'June 1627', biome: 'summer', fog: 0.05, terrain: 0.2, features: [], horizon: { lo: 0.45, nokarst: true },
    desc: 'Zhao Shuaijiao holds Jinzhou\'s rebuilt walls, the moat in front and the guns above. The banners\' ladders and shield carts must come across a shot-swept plain and a burnt suburb; the Ming cavalry waits inside the gate to sortie.' };
  M.jinzhou = { trees: 50, rocks: 16, nomant: true,
    terrain(L, r) { L.hills.push({ x: 140, z: 60, r: 50, h: 6 }); L.hills.push({ x: -130, z: 120, r: 60, h: 7 });
      L.trenches = [{ x0: -150, z0: -146, x1: 150, z1: -146, w: 4, depth: 2.6, wet: true, gaps: [0, -40, 40] }]; }, /* the moat along the wall (plank bridges for the sortie),, a causeway at the gate (《清太宗實錄》: 城外濬壕) */
    objectives: [{ x: 0, z: -90, r: 11, name: 'Under the gate' }, { x: -60, z: -20, r: 13, name: 'The burnt suburb' }, { x: 56, z: 10, r: 12, name: 'The ruined temple' }, { x: 133, z: 110, r: 14, name: 'The Jin siege camp' }],
    noTree(x, z) { return z < -60; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 0, w: 6 }); sim.roadX = 0;
      cityWall(sim, { axis: 'x', at: -163, from: -150, to: 150, h: 11, hd: 4, out: 1, gx: 0, gw: 3.4, name: '錦州', notower: true, nobast: true }); keep.push({ x: 0, z: -163, r: 24 }); /* the wall at the field edge, the sortie forms up under it */
      for (const sx of [-1, 1]) sim.boxes.push({ x: sx * 120, z: -152, hw: 4.5, hd: 3.5, h: 3.4, kind: 'rampart', tight: true }); /* Hongyipao platforms on the wall (《清太宗實錄》: 城上列紅夷砲) */
      for (const [x, z] of [[-70, -30], [-52, -20], [-60, -8], [-78, -12], [-44, -34], [-32, -6]]) house(sim, keep, x, z, 2.8, 2.4, true);
      /* a ruined temple compound (its walls stand, the hall is burnt): cover the Jin used to form up out of the guns' sight */
      sim.boxes.push({ x: 56, z: 22, hw: 14, hd: 0.5, h: 2.2, kind: 'wall' }); sim.boxes.push({ x: 42, z: 8, hw: 0.5, hd: 14, h: 2.2, kind: 'wall' }); sim.boxes.push({ x: 70, z: 8, hw: 0.5, hd: 14, h: 2.2, kind: 'wall' }); sim.boxes.push({ x: 56, z: 12, hw: 5, hd: 3.5, h: 2.4, kind: 'house', burnt: true }); keep.push({ x: 56, z: 10, r: 20 });
      /* the Jin camp (《明史》: 營於城外三里) and the shield carts (盾車) in a line, the ladder parties behind them */
      stockade(sim, keep, -148, 96, -118, 124, 'e'); stockade(sim, keep, 118, 96, 148, 124, 'w');
      for (let x = -40; x <= 40; x += 10) sim.boxes.push({ x, z: 60, hw: 1.6, hd: 0.5, h: 1.5, kind: 'mantlet' });
      trees(sim, r, clear, 50, -140, 140, 30, 140, undefined); } };

  // ---------- 開原 Kaiyuan, the sixth month of 1619 ----------
  // 《滿文老檔》天命四年六月十六日 (the host marched in heavy rain, reached Kaiyuan at dawn; the garrison commander 馬林
  // led his men out of the gate to fight in the open and was killed; the walls were scaled where the rain had brought
  // the rammed earth down); 《明史》馬林傳; 《明神宗實錄》萬曆四十七年六月; 《遼東志》開原城 (the largest city of the north-east
  // frontier: 周十三里, brick-faced, a moat; the Jurchen and Mongol horse fairs outside the gates). Here the south-east
  // wall of Kaiyuan runs along the Ming edge with the gate Ma Lin rode out of; the horse-fair ground outside the gate,
  // a slumped stretch of wall (the breach) to the east, rice and millet fields in the flat; rain all day.
  B.kaiyuan = { name: 'Kaiyuan', jp: '開原', when: 'July 1619', biome: 'summer', weather: 'storm', fog: 0.3, terrain: 0.2, features: ['paddies'], horizon: { lo: 0.4, nokarst: true },
    desc: 'Rain on the millet fields outside Kaiyuan. Ma Lin has ridden out of the gate to fight in the open; the walls behind him have slumped in the wet where the banners will climb. Matchlocks are fouled, the ground is mud.' };
  M.kaiyuan = { trees: 50, rocks: 10,
    terrain(L, r) { L.hills.push({ x: 140, z: 130, r: 50, h: 6 }); L.hills.push({ x: -140, z: 90, r: 60, h: 5 });
      L.trenches = [{ x0: -150, z0: -146, x1: 150, z1: -146, w: 4, depth: 2.4, wet: true, gaps: [0, 70] }]; }, /* the moat; a causeway at the gate and the gap where the slumped wall's rubble filled it */
    objectives: [{ x: 0, z: -92, r: 12, name: 'The horse-fair ground' }, { x: 70, z: -118, r: 11, name: 'The slumped wall' }, { x: -50, z: 20, r: 13, name: 'The Mongol road' }],
    noTree(x, z) { return z < -100; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 0, w: 6 }); sim.roadX = 0;
      cityWall(sim, { axis: 'x', at: -163, from: -150, to: 56, h: 11, hd: 4, out: 1, gx: 0, gw: 3.4, name: '開原', notower: true, nobast: true }); cityWall(sim, { axis: 'x', at: -163, from: 84, to: 150, h: 11, hd: 4, out: 1, notower: true, nobast: true });
      cityWall(sim, { axis: 'x', at: -163, from: 56, to: 84, h: 4, hd: 5, out: 1, notower: true, nobast: true }); keep.push({ x: 0, z: -163, r: 24 }); keep.push({ x: 70, z: -150, r: 16 }); /* the breach: rammed earth slumped to a slope the men can climb (《滿文老檔》: 雨壞城) */
      /* the horse-fair ground: stalls and pens outside the gate (《遼東志》: 馬市 at the 慶雲堡 gate), a few houses of the Mongol traders */
      for (const [x, z] of [[-30, -120], [-44, -108], [36, -126], [48, -112]]) house(sim, keep, x, z, 2.6, 2.2, false);
      for (const [x, z, dir] of [[-20, -100, 0], [20, -100, 0]]) { const n = 8; for (let i = 0; i <= n; i++) sim.obstacles.push({ x: x + i * 1.6 - 6.4, z, r: 0.22, kind: 5 }); sim.deco.push({ kind: 'fence', x: x - 6.4, z, yaw: Math.PI / 2, len: n * 1.6 }); }
      /* the Jin host came by the Mongol road from the north-west: a hamlet on it, and the Khan's standard-camp */
      for (const [x, z] of [[-60, 10], [-48, 24], [-72, 30]]) house(sim, keep, x, z, 2.8, 2.4, false);
      stockade(sim, keep, 110, 100, 146, 130, 'w'); } };

  // ---------- 覺華島 Juehua Island, the first month of 1626 ----------
  // 《清太祖實錄》天命十一年正月二十六日 (after the repulse at Ningyuan the Khan sent 武訥格 with the Mongol horse across
  // the frozen sea to Juehua; the Ming sailors under 姚撫民 and 金冠 had cut a channel fifteen li long through the
  // ice, but it froze over in the night; the Jin crossed, killed seven thousand sailors and burned the grain and the
  // ships); 《明史》袁崇煥傳, 《明熹宗實錄》天啟六年正月; 《寧遠衛志》. The island is low, the depot and the sailors' camp
  // on its north shore facing the mainland. Here the mainland shore is the Jin edge (+z), the frozen strait across
  // the middle (ice: slow going, the re-frozen channel a darker band that is slower still), and the island's north
  // shore with the grain depot and the ships frozen in at the Ming edge.
  B.juehua = { name: 'Juehua Island', jp: '覺華島', when: 'February 1626', biome: 'winter', fog: 0.25, terrain: 0.15, features: [], horizon: { lo: 0.3, nokarst: true, open: [-1.2, 1.2] },
    desc: 'The frozen strait between the mainland and Juehua island. The sailors cut a channel through the ice but it froze again in the night; the Mongol horse come over the ice at the grain depot and the ships frozen in at the shore.' };
  M.juehua = { trees: 30, rocks: 10, nomant: true,
    terrain(L, r) { L.hills.push({ x: 0, z: -140, rx: 160, rz: 36, rot: 0, h: 6 }); L.hills.push({ x: 120, z: -120, r: 40, h: 5 }); L.hills.push({ x: -40, z: 172, rx: 190, rz: 40, rot: 0, h: 9 });
      /* the strait: a wide frozen river across the field (ice: walked at ford speed); the cut channel re-frozen in the night as a second, thinner band */
      L.river = { axis: 'x', c0: 20, amp: 3, freq: 0.012, ph: 0.5, w: 72, depth: 0.5, ice: true, bridges: [] };
      L.rivers = [{ id: 1, axis: 'x', c0: -12, amp: 2, freq: 0.02, ph: 1.1, w: 5, depth: 0.7, ice: true, bridges: [] }]; },
    objectives: [{ x: 0, z: -100, r: 13, name: 'The grain depot' }, { x: -80, z: -96, r: 12, name: 'The ships in the ice' }, { x: 70, z: 112, r: 12, name: 'The mainland shore' }],
    noTree(x, z) { return z > -60 && z < 100; },
    build(sim, r, keep, clear) {
      /* the depot: granaries in rows behind a palisade (《明史》: 糧料八萬餘石, 船二千餘), the sailors' camp beside it */
      stockade(sim, keep, -30, -118, 30, -84, 'n'); for (const [x, z] of [[-18, -108], [0, -108], [18, -108], [-18, -94], [18, -94]]) sim.boxes.push({ x, z, hw: 4, hd: 2.6, h: 3, kind: 'house' });
      for (let i = 0; i < 6; i++) sim.boxes.push({ x: 40 + (i % 3) * 7, z: -100 - Math.floor(i / 3) * 7, hw: 2.4, hd: 2.4, h: 2.2, kind: 'tent' }); keep.push({ x: 47, z: -104, r: 12 });
      /* the ships frozen in along the shore: hulls as long boxes (the renderer's 'wagon' kind draws a plank body: no ship model in the game, a known stand-in) */
      for (let i = 0; i < 6; i++) { const x = -110 + i * 12, z = -92 + (i % 2) * 6; sim.boxes.push({ x, z, hw: 1.6, hd: 5, h: 2.2, kind: 'wagon' }); } keep.push({ x: -80, z: -90, r: 36 });
      /* the mainland shore: the Mongol horse lines' stockade and a fishing hamlet on the beach */
      stockade(sim, keep, 110, 112, 146, 140, 'w'); for (const [x, z] of [[-100, 118], [-86, 126], [-112, 130]]) house(sim, keep, x, z, 2.6, 2.2, false);
      trees(sim, r, clear, 30, -140, 140, 110, 145, 0); } };

  // the picker shows BATTLES in table order: keep the new ones after the old
})();
