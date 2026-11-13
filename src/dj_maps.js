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

  // ========== Act Two: the island ==========
  const junk = (sim, keep, x, z, len, bow, o) => { sim.boxes.push(Object.assign({ x, z, hw: len / 2, hd: 1.9, h: 2.2, kind: 'junk', bow: bow || 1 }, o || {})); keep.push({ x, z, r: len / 2 + 3 }); };
  const junkZ = (sim, keep, x, z, len, bow, o) => { sim.boxes.push(Object.assign({ x, z, hw: 1.9, hd: len / 2, h: 2.2, kind: 'junk', bow: bow || 1 }, o || {})); keep.push({ x, z, r: len / 2 + 3 }); };
  const racks = (sim, x0, z0, n) => { for (let i = 0; i < n; i++) sim.boxes.push({ x: x0 + (i % 4) * 4, z: z0 + Math.floor(i / 4) * 3.5, hw: 1.6, hd: 0.3, h: 1.6, kind: 'fence' }); }; /* fish-drying racks */

  // ---------- 沿海 A village of the Liaodong coast, 1622 ----------
  // A composite of the landings the East River men made on the Jin-held coast (《明史》毛文龍傳: 數遣兵襲擾, 招集遼民; the Korean
  // records of 1622–1623 count boatloads of Liaodong people brought out). The sea lies along the east edge; the beach with the
  // boats drawn up, a fishing village behind it, the Jin tax granary in its stockade inland, and the fields where the Han
  // bondservants work under guard. The Jin outposts are inland (+z) and to the west.
  B.djcoast = { name: 'The Liaodong coast', jp: '遼東沿海', when: 'Spring 1622', biome: 'spring', fog: 0.35, terrain: 0.4, features: [], hidden: true, horizon: { lo: 0.6, nokarst: true, open: [0.7, 2.4] },
    desc: 'A fishing village on the Jin-held coast of Liaodong: the boats drawn up on the beach, the bondservants in the fields, the tax granary in its stockade.' };
  M.djcoast = { trees: 70, rocks: 18,
    terrain(L, r) { L.sea = { x0: 112, depth: 6, islands: [] }; L.hills.push({ x: -110, z: 100, rx: 70, rz: 60, rot: 0.2, h: 14 }); L.hills.push({ x: -60, z: -120, rx: 90, rz: 34, rot: 0, h: 9 }); L.hills.push({ x: 40, z: 140, r: 50, h: 10 }); },
    objectives: [{ x: 106, z: -40, r: 12, name: 'The boats' }, { x: -10, z: 30, r: 12, name: 'The bondservants\' field' }, { x: 40, z: 78, r: 12, name: 'The granary' }],
    noTree(x, z) { return x > 60 || (Math.abs(x + 10) < 40 && Math.abs(z - 30) < 30) || (Math.abs(x - 40) < 30 && Math.abs(z - 78) < 26); },
    build(sim, r, keep, clear) {
      for (const [z, b] of [[-60, 1], [-40, 1], [-22, 1], [-4, 1]]) junkZ(sim, keep, 114, z, 13, b, { wy: 0, furled: true });
      for (const [x, z] of [[78, -30], [70, -14], [84, -4], [74, 12], [64, -46], [88, -56]]) house(sim, keep, x, z, 3.2, 2.6, false, 2.8);
      racks(sim, 92, -24, 8);
      /* the tax granary: three storehouses in a palisade with its gate toward the village */
      for (let x = 22; x < 58; x += 3) sim.boxes.push({ x: x + 1.5, z: 62, hw: 1.5, hd: 0.5, h: 2, kind: 'palisade' }); for (let x = 22; x < 58; x += 3) if (Math.abs(x + 1.5 - 40) > 4) sim.boxes.push({ x: x + 1.5, z: 94, hw: 1.5, hd: 0.5, h: 2, kind: 'palisade' });
      for (let z = 62; z < 94; z += 3) { sim.boxes.push({ x: 22, z: z + 1.5, hw: 0.5, hd: 1.5, h: 2, kind: 'palisade' }); sim.boxes.push({ x: 58, z: z + 1.5, hw: 0.5, hd: 1.5, h: 2, kind: 'palisade' }); }
      for (const x of [30, 40, 50]) house(sim, keep, x, 82, 3.4, 4, false, 3.6); keep.push({ x: 40, z: 78, r: 24 });
      /* the guard huts by the field */ house(sim, keep, -34, 46, 3, 2.4, false); house(sim, keep, -40, 34, 3, 2.4, false);
      trees(sim, r, clear, 60, -145, 60, -145, 145, undefined); rocks(sim, r, clear, 16, -145, 60, -145, 145); } };

  // ---------- 皮島 Pidao (Gado), the fishing village under the hills, 1623 ----------
  // 《明史》毛文龍傳: 島中商賈輻輳, 遼民歸者日眾; 《朝鮮王朝實錄》仁祖元年–二年 on the famine on the islands and the soldiers who
  // came ashore to take grain. Gado lies off the Korean coast at Cheolsan: a hilly island, the fishing village and the East River
  // grain store on the sheltered shore, the sea along the east edge. Here the village and the granary sit low by the beach (-z);
  // the hills and the soldiers' camps are inland (+z).
  B.djpidao = { name: 'Pidao', jp: '皮島 · 椵島', when: 'Autumn 1623', biome: 'autumn', fog: 0.25, terrain: 0.6, features: [], hidden: true, horizon: { lo: 0.7, nokarst: true, open: [0.6, 2.5] },
    desc: 'The East River\'s island off the Korean coast: the fishing village and the grain store on the sheltered beach, the soldiers\' camps in the hills.' };
  M.djpidao = { trees: 90, rocks: 30,
    terrain(L, r) { L.sea = { x0: 108, depth: 7, islands: [{ x: 150, z: 90, r: 16 }] }; L.hills.push({ x: -40, z: 100, rx: 110, rz: 60, rot: 0.1, h: 22 }); L.hills.push({ x: -120, z: -40, r: 50, h: 14 }); L.hills.push({ x: 60, z: 130, r: 40, h: 12 }); },
    objectives: [{ x: 30, z: -40, r: 11, name: 'The grain store' }, { x: 70, z: -60, r: 12, name: 'The fishing village' }, { x: 0, z: 40, r: 12, name: 'The hill path' }],
    noTree(x, z) { return (x > 0 && z < 0) || Math.abs(x) < 8; },
    build(sim, r, keep, clear) {
      for (const [z, b] of [[-90, -1], [-72, 1], [-54, 1], [-30, -1]]) junkZ(sim, keep, 112, z, 12, b, { wy: 0, furled: true });
      junk(sim, keep, 128, -120, 18, 1, { wy: 0 }); /* a grain ship from Dengzhou at anchor */
      for (const [x, z] of [[60, -48], [72, -66], [84, -52], [62, -78], [80, -86], [94, -70], [50, -66]]) house(sim, keep, x, z, 3, 2.4, false, 2.7);
      racks(sim, 88, -40, 12);
      for (const [x, z] of [[24, -40], [36, -40], [30, -28]]) house(sim, keep, x, z, 4, 3.2, false, 3.4); /* the grain store */
      for (let x = 14; x < 46; x += 3) if (Math.abs(x + 1.5 - 30) > 4) sim.boxes.push({ x: x + 1.5, z: -16, hw: 1.5, hd: 0.5, h: 1.6, kind: 'palisade' });
      sim.deco.push({ kind: 'road', x: 0, w: 4 }); sim.roadX = 0;
      trees(sim, r, clear, 90, -145, 145, -145, 145, 1); rocks(sim, r, clear, 26, -145, 100, -145, 145); } };

  // ---------- 鐵山 Tieshan, the hill fort on the Korean coast, 1624 ----------
  // 《朝鮮王朝實錄》仁祖二年; 《明史》毛文龍傳: the East River's mainland posts at Tieshan (鐵山) and Sinmi island, from which it
  // ran its raids. A palisaded camp on a low hill above the shore, half built; the sea and the boats to the east; the plain to
  // the north (+z) over which the Jin come from the Yalu.
  B.djtieshan = { name: 'Tieshan', jp: '鐵山', when: 'Summer 1624', biome: 'summer', fog: 0.15, terrain: 0.6, features: [], hidden: true, horizon: { lo: 0.8, nokarst: true, open: [0.7, 2.3] },
    desc: 'The East River\'s hill fort on the Korean shore, its palisade half built, the boats below, and the plain to the north where the Jin come from the Yalu.' };
  M.djtieshan = { trees: 80, rocks: 26,
    terrain(L, r) { L.sea = { x0: 118, depth: 6, islands: [] }; L.plateaus.push({ x: 20, z: -30, r0: 30, r1: 44, h: 9 }); L.hills.push({ x: -110, z: -90, r: 50, h: 12 }); L.hills.push({ x: -120, z: 110, r: 40, h: 8 }); },
    objectives: [{ x: 20, z: -30, r: 14, name: 'The fort' }, { x: 20, z: -5, r: 9, name: 'The north gate' }, { x: 112, z: -70, r: 11, name: 'The boats' }],
    noTree(x, z) { return Math.hypot(x - 20, z + 30) < 58 || x > 90; },
    build(sim, r, keep, clear) {
      /* the palisade on the plateau's rim; the gaps of the unfinished stretch on the north-east are marked by logs on the ground */
      const cx = 20, cz = -30, x0 = cx - 24, x1 = cx + 24, z0 = cz - 22, z1 = cz + 22;
      pal(sim, x0, cx - 4, z1, 2.2); pal(sim, cx + 4, cx + 9, z1, 2.2); /* the north face: the gate, and east of it the stretch not built yet (cx + 9 .. x1) */
      pal(sim, x0, x1, z0, 2.2); palZ(sim, x0, z0, z1, 2.2); palZ(sim, x1, z0, cz - 4, 2.2); /* the east face is open at its north end too */
      for (let x = cx + 11; x < x1; x += 4) sim.boxes.push({ x, z: z1 + 2, hw: 1.6, hd: 0.25, h: 0.35, kind: 'log' }); /* the stakes for it, lying on the ground */
      keep.push({ x: cx, z: cz, r: 34 });
      for (const [x, z] of [[8, -36], [28, -40], [14, -22], [32, -24]]) sim.boxes.push({ x, z, hw: 2.4, hd: 2.4, h: 2.2, kind: 'tent' });
      house(sim, keep, 20, -44, 4, 3, false, 3.2); /* the commander's hut */
      for (const [z, b] of [[-90, 1], [-74, 1], [-56, -1]]) junkZ(sim, keep, 120, z, 13, b, { wy: 0, furled: true });
      trees(sim, r, clear, 70, -145, 90, -145, 145, undefined); rocks(sim, r, clear, 20, -145, 90, -145, 145); } };

  // ---------- 鞍山 A Jin manor farm near Anshan, autumn 1626 ----------
  // After Ningyuan and the death of Nurhaci (the eighth month of 1626) the East River raided far inland: 《明熹宗實錄》天啟六年
  // 七月–八月, 毛文龍 襲鞍山驛, 薩爾滸 (the Jin had to send banners back from the west). A walled farm (拖克索, a bannerman's
  // estate worked by Han bondservants) in the hills south of Anshan: an earth-walled compound with its gate, the bondservants'
  // huts, the river ford, and the long valley back south (-z) toward the coast and the boats.
  B.djanshan = { name: 'A manor near Anshan', jp: '鞍山 · 拖克索', when: 'Autumn 1626', biome: 'autumn', fog: 0.2, terrain: 0.7, features: [], hidden: true, horizon: { lo: 1.0, nokarst: true },
    desc: 'A bannerman\'s walled farm in the hills south of Anshan, worked by Han bondservants; a ford below it, and the long valley south toward the sea.' };
  M.djanshan = { trees: 130, rocks: 34,
    terrain(L, r) { L.river = { axis: 'x', c0: -20, amp: 6, freq: 0.02, ph: 0.7, w: 10, depth: 2.4, bridges: [{ at: 0, hw: 8, ford: true }] };
      L.hills.push({ x: -120, z: 20, rx: 50, rz: 120, rot: 0, h: 20 }); L.hills.push({ x: 120, z: 30, rx: 50, rz: 110, rot: 0, h: 18 }); L.hills.push({ x: 0, z: 150, rx: 120, rz: 30, rot: 0, h: 14 }); },
    objectives: [{ x: 0, z: 60, r: 13, name: 'The manor' }, { x: 0, z: -20, r: 10, name: 'The ford' }, { x: 0, z: -138, r: 12, name: 'The valley south' }],
    noTree(x, z) { return (Math.abs(x) < 46 && z > 30 && z < 96) || Math.abs(x) < 7; },
    build(sim, r, keep, clear) {
      sim.deco.push({ kind: 'road', x: 0, w: 5 }); sim.roadX = 0;
      cityWall(sim, { axis: 'x', at: 34, from: -30, to: 30, h: 4, hd: 1.2, out: -1, gx: 0, gw: 3.5, nobast: true, notower: true }); cityWall(sim, { axis: 'x', at: 90, from: -30, to: 30, h: 4, hd: 1.2, out: 1, nobast: true, notower: true });
      cityWall(sim, { axis: 'z', at: -30, from: 34, to: 90, h: 4, hd: 1.2, out: -1, nobast: true, notower: true }); cityWall(sim, { axis: 'z', at: 30, from: 34, to: 90, h: 4, hd: 1.2, out: 1, nobast: true, notower: true });
      keep.push({ x: 0, z: 62, r: 40 });
      sim.boxes.push({ x: 0, z: 74, hw: 8, hd: 4.5, h: 4.4, kind: 'hall' }); /* the bannerman's house */
      for (const [x, z] of [[-20, 50], [-20, 62], [20, 50], [20, 62], [-16, 84], [16, 84]]) house(sim, keep, x, z, 3, 2.4, false, 2.6); /* storehouses and stables */
      for (const [x, z] of [[-44, 40], [-52, 52], [-40, 60], [46, 44], [54, 58]]) house(sim, keep, x, z, 2.6, 2.2, false, 2.3); /* the bondservants' huts outside the wall */
      trees(sim, r, clear, 120, -145, 145, -145, 145, undefined); rocks(sim, r, clear, 30, -145, 145, -145, 145); } };

  // ========== Act Three: 1627 ==========
  // ---------- 鐵山 in winter: the first month of 1627 (the same fort, the shallows frozen, snow on the plain) ----------
  B.djtieshanw = Object.assign({}, B.djtieshan, { when: 'February 1627', biome: 'winter', fog: 0.3, desc: 'The Tieshan fort in the snow, the morning the Jin came over the frozen Yalu into Korea with thirty thousand men.' });
  M.djtieshanw = Object.assign({}, M.djtieshan, { terrain(L, r) { M.djtieshan.terrain(L, r); L.sea.ice = true; L.sea.x0 = 126; } });

  // ---------- 龍骨山城 Yonggol mountain fortress, spring 1627 ----------
  // 《朝鮮王朝實錄》仁祖五年: 鄭鳳壽 (Jeong Bong-su), a minor officer, gathered the people of Yongcheon and Cheolsan into the old
  // mountain fortress of Yonggol and held it against repeated Jin assaults through the spring, one of the few places in the
  // north-west the Jin never took. The fortress rings the flat top of a steep hill with a stone wall; the main gate faces the
  // valley path (+z, where the Jin come up), a postern faces south; the hillside below is bare and steep.
  B.djyonggol = { name: 'Yonggol mountain fortress', jp: '龍骨山城', when: 'April 1627', biome: 'spring', fog: 0.2, terrain: 0.6, features: [], hidden: true, horizon: { lo: 1.2, nokarst: true },
    desc: 'An old Korean mountain fortress on a steep hill above Yongcheon: a ring of stone wall round the summit, a gate over the valley path, and below it the Jin camps.' };
  M.djyonggol = { trees: 110, rocks: 50,
    terrain(L, r) { L.plateaus.push({ x: 0, z: -10, r0: 46, r1: 88, h: 24 }); L.hills.push({ x: 0, z: 150, rx: 150, rz: 30, rot: 0, h: 8 }); L.hills.push({ x: -130, z: -80, r: 50, h: 18 }); L.hills.push({ x: 130, z: -90, r: 46, h: 16 }); },
    objectives: [{ x: 0, z: 34, r: 10, name: 'The main gate' }, { x: -40, z: -10, r: 10, name: 'The west wall' }, { x: 0, z: -10, r: 12, name: 'The summit' }, { x: 0, z: 110, r: 14, name: 'The Jin siege camp' }],
    noTree(x, z) { return Math.hypot(x, z + 10) < 60 || (Math.abs(x) < 30 && z > 90 && z < 130); },
    build(sim, r, keep, clear) {
      /* the stone ring: four walls on the summit's edge, the main gate in the north wall, a postern in the south */
      cityWall(sim, { axis: 'x', at: 30, from: -40, to: 40, h: 5, hd: 1.6, out: 1, gx: 0, gw: 3.2, nobast: true, name: '龍骨' }); cityWall(sim, { axis: 'x', at: -50, from: -40, to: 40, h: 5, hd: 1.6, out: -1, gx: 0, gw: 2, nobast: true, notower: true });
      cityWall(sim, { axis: 'z', at: -40, from: -50, to: 30, h: 5, hd: 1.6, out: -1, nobast: true, notower: true }); cityWall(sim, { axis: 'z', at: 40, from: -50, to: 30, h: 5, hd: 1.6, out: 1, nobast: true, notower: true });
      keep.push({ x: 0, z: -10, r: 56 });
      sim.boxes.push({ x: 0, z: -22, hw: 7, hd: 4, h: 4.5, kind: 'temple' }); /* the fortress temple, where the monks keep the powder */
      for (const [x, z] of [[-24, 8], [-26, -30], [24, -30], [26, 10], [-10, -38], [12, 16]]) sim.boxes.push({ x, z, hw: 2.4, hd: 2.4, h: 2.2, kind: 'tent' });
      /* the Jin siege camp in the valley below the gate */
      for (const [x, z] of [[-18, 104], [0, 112], [18, 104], [-10, 124], [12, 126]]) sim.boxes.push({ x, z, hw: 2.6, hd: 2.6, h: 2.4, kind: 'tent' }); keep.push({ x: 0, z: 112, r: 28 });
      trees(sim, r, clear, 100, -145, 145, -145, 145, 1); rocks(sim, r, clear, 44, -145, 145, -145, 145); } };

  // ---------- 冰上 The sea ice off Sinmi island, the second month of 1627 ----------
  // The Juehua field (sim_maps.js) dressed as the frozen strait between the Korean shore and Mao Wenlong's island of Sinmi: after
  // Tieshan fell the refugees who had not reached the boats walked out over the sea ice. The mainland shore is +z, the island -z.
  B.djice = Object.assign({}, B.juehua, { name: 'The sea ice off Sinmi', jp: '身彌島 · 冰上', when: 'February 1627', hidden: true, desc: 'The frozen strait between the Korean shore and the island of Sinmi, the refugees walking out over the ice with the riders behind them.' });
  M.djice = M.juehua;
})();
