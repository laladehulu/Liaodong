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

  // the picker shows BATTLES in table order: keep the new ones after the old
})();
