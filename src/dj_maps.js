// ===================== 東江 · the East River campaign's battlefields =====================
// Hidden maps for the story campaign in dongjiang.js (the refugees of Liaodong, the islands off Korea, the Shandong coast).
// Same conventions as sim_maps.js: team 0 (Ming / the East River) at z < 0, team 1 (Jin) at z > 0; the field is 300 m
// square (HALF = 150); deterministic (the RNG handed in, DM trig only).
(function () { if (typeof SIM === 'undefined') return;
  const B = SIM.BATTLES, M = SIM.MAPS, cityWall = SIM.cityWall; const PI = Math.PI, TAU = PI * 2;
  const house = (sim, keep, x, z, hw, hd, burnt, h) => { sim.boxes.push({ x, z, hw, hd, h: h || (burnt ? 2 : 3.3), kind: 'house', burnt: !!burnt }); keep.push({ x, z, r: Math.max(hw, hd) + 3 }); };
  const pal = (sim, x0, x1, z, h) => { for (let x = x0; x < x1; x += 3) sim.boxes.push({ x: x + 1.5, z, hw: 1.5, hd: 0.5, h: h || 1.6, kind: 'palisade' }); };
  const palZ = (sim, x, z0, z1, h) => { for (let z = z0; z < z1; z += 3) sim.boxes.push({ x, z: z + 1.5, hw: 0.5, hd: 1.5, h: h || 1.6, kind: 'palisade' }); };
  const trees = (sim, rng, clear, n, x0, x1, z0, z1, pine) => { for (let i = 0; i < n; i++) { const x = rng.range(x0, x1), z = rng.range(z0, z1); if (!clear(x, z, 2.5)) continue; sim.obstacles.push({ x, z, r: 0.45, kind: 0, variant: pine === undefined ? (rng.next() < 0.45 ? 1 : 0) : pine, scale: rng.range(0.8, 1.3) }); } };
  const rocks = (sim, rng, clear, n, x0, x1, z0, z1) => { for (let i = 0; i < n; i++) { const x = rng.range(x0, x1), z = rng.range(z0, z1); if (!clear(x, z, 3)) continue; sim.obstacles.push({ x, z, r: rng.range(0.7, 2.2), kind: 1, rot: rng.range(0, TAU) }); } };
  const wagons = (sim, keep, pts) => { for (const [x, z, ax] of pts) sim.boxes.push({ x, z, hw: ax ? 1.1 : 1.9, hd: ax ? 1.9 : 1.1, h: 1.8, kind: 'wagon' }); };
  // a street block: a row of houses either side of a lane, some of them burnt
  const block = (sim, keep, rng, x0, x1, z, burnP) => { for (let x = x0; x < x1; x += 9) { if (rng.next() < 0.12) continue; house(sim, keep, x + 4, z, 3.6, 3, rng.next() < burnP); } };

  // ---------- 遼陽西城 Liaoyang, the west quarter: the twenty-first day of the third month, 1621 ----------
  // 《滿文老檔》天命六年三月; 《明史》袁應泰傳 (Yuan Yingtai hanged himself in the tower over the east gate when the city broke);
  // 《遼陽州志》. The banners came over the east wall at dusk and the city burned through the night; the Ming troops and the
  // townspeople ran for the west gate and the water gate where the Taizi canal leaves the city. Here the field is the inside
  // of the west quarter: the east (Jin, +z) end already burning, streets of houses, the west wall along x = -134 with its gate,
  // the south wall along z = -112 with the water gate over the canal, and the canal itself running out to the river.
  B.djliao = { name: 'Liaoyang, the west quarter', jp: '遼陽西城', when: 'April 1621', biome: 'spring', fog: 0.32, terrain: 0.08, features: [], hidden: true, horizon: { lo: 0.2, nokarst: true },
    desc: 'The west quarter of Liaoyang on the night the city fell: streets of houses, the east end already burning, the west gate jammed with people, and the water gate where the canal leaves the city.' };
  M.djliao = { trees: 6, rocks: 0, nomant: true,
    terrain(L, r) { L.river = { axis: 'x', c0: -128, amp: 1.5, freq: 0.03, ph: 0.4, w: 12, depth: 2.2, bridges: [{ at: 40, hw: 7, ford: true }] }; /* the canal and the river below the south wall: wadeable at the water gate */ },
    objectives: [{ x: 30, z: 20, r: 9, name: 'Your street' }, { x: -126, z: 0, r: 10, name: 'The west gate' }, { x: 40, z: -118, r: 10, name: 'The water gate' }],
    noTree(x, z) { return true; },
    build(sim, r, keep, clear) {
      cityWall(sim, { axis: 'z', at: -142, from: -105, to: 140, h: 8, hd: 3, out: -1, gx: 0, gw: 4, name: '遼陽', nobast: true }); keep.push({ x: -142, z: 0, r: 20 });
      cityWall(sim, { axis: 'x', at: -112, from: -140, to: 140, h: 8, hd: 3, out: -1, gx: 40, gw: 5, name: '水門', nobast: true }); keep.push({ x: 40, z: -112, r: 14 });
      /* the streets: east-west lanes every 26 m, a north-south high street at x = 0 and another at x = -70 */
      for (let z = -92; z <= 120; z += 26) { const burn = z > 60 ? 0.55 : z > 20 ? 0.25 : 0.08; block(sim, keep, r, -128, -76, z, burn); block(sim, keep, r, -64, -6, z, burn); block(sim, keep, r, 6, 64, z, burn); block(sim, keep, r, 76, 136, z, burn); }
      /* the smithy where you start, and your family's house in the next street (kept clear for the zones) */
      sim.deco.push({ kind: 'road', x: 0, w: 7 });
      wagons(sim, keep, [[-118, 6, true], [-115, -7, true], [-122, -3, false]]); /* carts jammed in the gate passage */
      trees(sim, r, clear, 6, -130, 130, -100, 130, 0); } };

  // ---------- 靉河 The ford on the Ai river, the fourth month of 1621 ----------
  // The roads east from Liaoyang to the Yalu ran over the Ai river (靉河) by Kuandian; after the fall tens of thousands of
  // Liaodong people went this way to Korea and the coast (《朝鮮王朝實錄》光海君日記 十三年: 遼民渡江者 不可勝數). A wide shallow
  // ford in the river meadows, a burnt village on the far bank, low wooded hills on both sides. The refugees come down from
  // the north (+z) with the riders behind them; the ford is at x = 0.
  B.djford = { name: 'The Ai river ford', jp: '靉河渡', when: 'May 1621', biome: 'spring', fog: 0.12, terrain: 0.55, features: [], hidden: true, horizon: { lo: 0.9, nokarst: true },
    desc: 'A wide shallow ford on the road from Liaodong to the Yalu, the meadows full of people walking east, and the banner riders behind them.' };
  M.djford = { trees: 120, rocks: 26,
    terrain(L, r) { L.river = { axis: 'x', c0: 0, amp: 7, freq: 0.018, ph: 1.4, w: 16, depth: 2.6, bridges: [{ at: 0, hw: 16, ford: true }, { at: 96, hw: 3 }] };
      L.hills.push({ x: -120, z: 70, rx: 60, rz: 50, rot: 0.3, h: 14 }); L.hills.push({ x: 110, z: 90, r: 50, h: 12 }); L.hills.push({ x: -60, z: -120, rx: 90, rz: 40, rot: 0.1, h: 10 }); L.hills.push({ x: 110, z: -90, r: 40, h: 8 }); },
    objectives: [{ x: 0, z: 30, r: 12, name: 'The north bank' }, { x: 0, z: -40, r: 13, name: 'The south bank' }, { x: 96, z: 2, r: 8, name: 'The footbridge' }],
    noTree(x, z) { return Math.abs(x) < 40 || (z > -20 && z < 20); },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 0, w: 6 }); sim.roadX = 0;
      /* the burnt village on the south bank, and an inn on the north road */
      for (const [x, z, b] of [[-26, -52, 1], [-14, -64, 0], [22, -58, 1], [30, -72, 0], [-30, -76, 0], [16, 54, 1], [-20, 62, 0]]) house(sim, keep, x, z, 3.2, 2.8, !!b);
      wagons(sim, keep, [[8, 44, true], [-6, 40, false], [12, 70, true], [-10, 88, true], [4, 102, false]]); /* carts on the north road, waiting their turn */
      trees(sim, r, clear, 90, -145, 145, -145, 145, undefined); rocks(sim, r, clear, 20, -145, 145, -145, 145); } };

  // ---------- 鎮江 Zhenjiang on the Yalu, the twentieth day of the seventh month, 1621 ----------
  // 《明史》毛文龍傳; 《朝鮮王朝實錄》光海君日記 十三年七月; 《毛大將軍海上情形》: Mao Wenlong came up the Yalu by boat with
  // two hundred men; the townsmen inside rose with him, opened the gate and took the Jin commander Tong Yangzhen (佟養真) in his
  // yamen. A small walled fort-town on the north bank of the Yalu, the river along the Ming side (-z), the boats drawn up on the
  // strand below the south gate; the yamen in the middle; the north gate toward Kuandian and the banners.
  B.djzhen = { name: 'Zhenjiang', jp: '鎮江', when: 'August 1621', biome: 'summer', fog: 0.28, terrain: 0.2, features: [], hidden: true, horizon: { lo: 0.5, nokarst: true },
    desc: 'A small walled town on the north bank of the Yalu, Jin-held since spring. Mao Wenlong\'s boats lie under the south wall in the dark.' };
  M.djzhen = { trees: 20, rocks: 6, nomant: true,
    terrain(L, r) { L.river = { axis: 'x', c0: -118, amp: 3, freq: 0.012, ph: 0.2, w: 34, depth: 3.6, bridges: [] }; L.hills.push({ x: 0, z: 150, rx: 150, rz: 30, rot: 0, h: 10 }); },
    objectives: [{ x: 0, z: -40, r: 9, name: 'The south gate' }, { x: 0, z: 20, r: 10, name: 'The yamen' }, { x: 0, z: 80, r: 9, name: 'The north gate' }],
    noTree(x, z) { return Math.abs(x) < 70 && z > -50 && z < 90; },
    build(sim, r, keep, clear) {
      cityWall(sim, { axis: 'x', at: -40, from: -62, to: 62, h: 6, hd: 2, out: -1, gx: 0, gw: 3.5, name: '鎮江', nobast: true });
      cityWall(sim, { axis: 'x', at: 80, from: -62, to: 62, h: 6, hd: 2, out: 1, gx: 0, gw: 3.5, name: '北門', nobast: true });
      cityWall(sim, { axis: 'z', at: -62, from: -40, to: 80, h: 6, hd: 2, out: -1, nobast: true, notower: true }); cityWall(sim, { axis: 'z', at: 62, from: -40, to: 80, h: 6, hd: 2, out: 1, nobast: true, notower: true });
      keep.push({ x: 0, z: 20, r: 70 });
      sim.boxes.push({ x: 0, z: 26, hw: 9, hd: 5, h: 5, kind: 'hall' }); /* the yamen hall, its courtyard before it */
      for (const [x, z] of [[-34, -24], [-22, -24], [22, -24], [34, -24], [-40, 4], [-28, 4], [28, 4], [40, 4], [-40, 40], [-28, 52], [28, 52], [40, 40], [-36, 64], [36, 64], [-14, 64], [14, 64]]) house(sim, keep, x, z, 3.6, 3, false);
      /* the strand: Mao's boats are not drawn; his men come up from the water's edge */
      trees(sim, r, clear, 20, -145, 145, -96, -60, 1); trees(sim, r, clear, 20, -145, 145, 96, 145, 1); rocks(sim, r, clear, 6, -145, 145, -96, -50); } };

  // ---------- 龍川 A village of Yongcheon, the twelfth month of 1621 ----------
  // 《朝鮮王朝實錄》光海君日記 十三年十二月: the Jin crossed the frozen Yalu to take Mao Wenlong at Yongcheon (龍川) and Ryongchon's
  // villages; Mao got away in Korean clothes (《明史》: 文龍僅以身免) and many Liaodong refugees and Korean villagers were killed.
  // A Korean farming village in deep snow: thatched houses in a fold of the hills, a frozen stream, a pine ridge to the
  // south (-z) over which the path runs to the coast; the Jin come down the valley from the north.
  B.djkor = { name: 'A village of Yongcheon', jp: '龍川', when: 'January 1622', biome: 'winter', fog: 0.3, terrain: 0.7, features: [], hidden: true, horizon: { lo: 1.1, nokarst: true },
    desc: 'A Korean farming village under deep snow, a frozen stream through it, and a pine ridge to the south with the path to the coast.' };
  M.djkor = { trees: 160, rocks: 30,
    terrain(L, r) { L.hills.push({ x: 0, z: -96, rx: 150, rz: 26, rot: 0, h: 15 }); L.hills.push({ x: -130, z: 60, r: 60, h: 18 }); L.hills.push({ x: 130, z: 50, r: 55, h: 16 });
      L.river = { axis: 'x', c0: 30, amp: 8, freq: 0.03, ph: 0.9, w: 6, depth: 0.6, ice: true, bridges: [] }; },
    objectives: [{ x: 0, z: 50, r: 12, name: 'The village' }, { x: 0, z: -90, r: 10, name: 'The ridge path' }, { x: 0, z: -138, r: 10, name: 'The path to the coast' }],
    noTree(x, z) { return (Math.abs(x) < 60 && z > 10 && z < 90) || Math.abs(x) < 6; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 0, w: 4 }); sim.roadX = 0;
      for (const [x, z] of [[-30, 40], [-16, 56], [-38, 64], [18, 44], [34, 58], [16, 70], [-4, 80], [40, 36], [-48, 50]]) house(sim, keep, x, z, 3.4, 2.6, false, 2.8);
      palZ(sim, -56, 30, 74, 1.2); palZ(sim, 52, 30, 74, 1.2); /* the low brushwood fences of the yards */
      trees(sim, r, clear, 140, -145, 145, -145, 145, 1); rocks(sim, r, clear, 24, -145, 145, -145, 145); } };
})();
