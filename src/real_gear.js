// ===== Realism edition uniforms =====
// The realism edition dresses its soldiers from period sources (平番得勝圖, 出警入蹕圖, 武備志, surviving armour) with more
// detail per figure; the regular editions keep their own look. Same part budget: b<=40, c<=4, y<=5 per man.
(() => {
if (!window.MING_REAL) return;
const R = RENDER, HPI = Math.PI / 2, BANNER = R.BANNER, torsoColor = R.torsoColor;
const RG_CACHE = new Map();
function realGear(u) {
  const vr = u.type === 'byakkotai' ? (u.id % 2) * 4 : u.id % 6; const key = u.type + ':' + (u.role || '') + ':' + u.team + ':' + vr + ':' + (u.team === 1 ? ((u.squad >= 0 ? u.squad : u.id) * 7 + 3) % 4 : 0) + (u.look ? ':L' + u.look.id : ''); let g = RG_CACHE.get(key); if (g) return g;
  const imp = u.team === 0, team = imp ? 0xb3262f : 0x2f55b8, P = [];
  let HAT = false; const b = (f, o, s, k, r) => P.push({ m: 'b', f, o, s, k, r, hat: HAT && f === 'h' }), c = (f, o, s, k, r) => P.push({ m: 'c', f, o, s, k, r, hat: HAT && f === 'h' }), y = (f, o, s, k, r) => P.push({ m: 'y', f, o, s, k, r, hat: HAT && f === 'h' });
  const hatOn = (fn) => { HAT = true; fn(); HAT = false; };
  const seg = (a, z, t0, t1, w, d, k) => P.push({ m: 'b', f: 'seg', a, z, t0, t1, w, d, k });
  const kingire = () => { if (imp) { seg('shL', 'elL', 0.25, 0.55, 0.15, 0.15, 0xc8312a); seg('shL', 'elL', 0.33, 0.46, 0.155, 0.155, 0xd9b24a); } else seg('shL', 'elL', 0.25, 0.5, 0.15, 0.15, 0xe9e4d6); };
  const eri = (col) => b('c', [0, 0.2, 0.13], [0.2, 0.1, 0.02], col || 0xeee8da, [0.25, 0, 0]);
  const hakama = (col) => { b('p', [0, -0.2, 0], [0.44, 0.32, 0.3], col); seg('hipL', 'kneeL', 0, 1, 0.24, 0.26, col); seg('hipR', 'kneeR', 0, 1, 0.24, 0.26, col); seg('kneeL', 'footL', 0, 0.55, 0.22, 0.24, col); seg('kneeR', 'footR', 0, 0.55, 0.22, 0.24, col); };
  const kyahan = (col) => { seg('kneeL', 'footL', 0.35, 0.95, 0.16, 0.17, col); seg('kneeR', 'footR', 0.35, 0.95, 0.16, 0.17, col); };
  const belts = (col) => { b('c', [0, 0.02, 0.135], [0.06, 0.62, 0.012], col, [0, 0, 0.62]); b('c', [0, 0.02, 0.135], [0.06, 0.62, 0.012], col, [0, 0, -0.62]); b('c', [0, 0.02, -0.135], [0.06, 0.62, 0.012], col, [0, 0, 0.62]); b('c', [0, 0.02, -0.135], [0.06, 0.62, 0.012], col, [0, 0, -0.62]); b('p', [-0.17, 0.02, -0.11], [0.13, 0.11, 0.07], 0x1a1714); };
  const tasuki = () => { b('c', [0, 0.03, -0.136], [0.05, 0.66, 0.012], 0xf2efe6, [0, 0, 0.6]); b('c', [0, 0.03, -0.136], [0.05, 0.66, 0.012], 0xf2efe6, [0, 0, -0.6]); };
  const hachimaki = (col) => { b('h', [0, 0.04, 0], [0.285, 0.05, 0.285], col); b('h', [0.03, 0.0, -0.17], [0.035, 0.035, 0.14], col, [0.6, 0, 0]); };
  const topknot = () => { b('h', [0, 0.13, -0.01], [0.27, 0.05, 0.27], 0x1a1614); b('h', [0, 0.17, -0.02], [0.05, 0.045, 0.16], 0x1a1614); };
  const shaguma = (col) => { b('h', [0, 0.12, -0.04], [0.31, 0.12, 0.3], col); b('c', [0, 0.16, -0.17], [0.28, 0.5, 0.09], col, [-0.12, 0, 0]); b('c', [0, -0.08, -0.19], [0.22, 0.3, 0.07], col, [-0.2, 0, 0]); };
  const armour = (lacq, lace) => {
    b('c', [0, 0.0, 0], [0.5, 0.5, 0.31], lacq); b('c', [0, 0.1, 0], [0.505, 0.035, 0.315], lace); b('c', [0, -0.08, 0], [0.505, 0.035, 0.315], lace);
    b('sl', [0.07, -0.1, 0], [0.07, 0.22, 0.26], lacq); b('sr', [-0.07, -0.1, 0], [0.07, 0.22, 0.26], lacq);
    b('sl', [0.075, -0.12, 0], [0.072, 0.03, 0.265], lace); b('sr', [-0.075, -0.12, 0], [0.072, 0.03, 0.265], lace);
    b('p', [0, -0.18, 0.12], [0.42, 0.26, 0.05], lacq); b('p', [0, -0.18, -0.12], [0.42, 0.26, 0.05], lacq); b('p', [0.21, -0.18, 0], [0.05, 0.26, 0.22], lacq); b('p', [-0.21, -0.18, 0], [0.05, 0.26, 0.22], lacq);
  };
  const kabuto = (col, crest) => hatOn(() => kabuto0(col, crest));
  const kabuto0 = (col, crest) => { b('h', [0, 0.13, -0.01], [0.32, 0.14, 0.32], col); b('h', [0, 0.03, -0.09], [0.4, 0.09, 0.24], col, [0.25, 0, 0]); b('h', [0.18, 0.09, 0.08], [0.04, 0.09, 0.09], col); b('h', [-0.18, 0.09, 0.08], [0.04, 0.09, 0.09], col);
    if (crest) { b('h', [0.07, 0.27, 0.15], [0.03, 0.22, 0.02], crest, [0, 0, -0.35]); b('h', [-0.07, 0.27, 0.15], [0.03, 0.22, 0.02], crest, [0, 0, 0.35]); } };
  const sashimono = (col) => { b('c', [0, 0.5, -0.17], [0.025, 1.15, 0.025], 0x3a2a1a); b('c', [0.13, 0.75, -0.17], [0.25, 0.55, 0.014], col); };
  // ---- Ming & Jin kit, realism edition ----
  // Recognition keys (what must read at 35 m), from the 平番得勝圖 / 出警入蹕圖 scrolls, the 武備志 and 紀效新書 plates and
  // surviving armour:
  //  Ming gunners: wide-brim 笠盔 + red horsehair plume, red studded 布面甲.  Ming heavy foot/horse: 明盔 bowl with tall spike,
  //  red tassel and the drooping 頓項 neck-and-ear guard.  Qi Jiguang's men: low rattan helmets, red coats, white puttees,
  //  round rattan shields.  Jin bannermen: two-plate cone helmet with a tall finial, three-peaked visor and flaps in banner
  //  colour; studded 棉甲 in banner colour; hip quiver and bow case (撒袋); horse-hoof cuffs; the shaved head and queue.
  const red = 0xc8281e, gold = 0xd8b04a, iron = 0x3a3d44, brass = 0xc49a3a;
  const mingHair = () => { b('h', [0, 0.12, -0.01], [0.27, 0.06, 0.27], 0x1a1614); b('h', [0, 0.17, -0.01], [0.09, 0.07, 0.09], 0x1a1614); };
  const queue = () => { b('h', [0, 0.07, -0.09], [0.27, 0.11, 0.1], 0x1a1614); b('c', [0, 0.12, -0.165], [0.035, 0.52, 0.03], 0x141210); b('c', [0, -0.15, -0.165], [0.05, 0.05, 0.04], 0x8a2a20); };
  // Jin/Qing helmet: cone bowl, brass spool, tall iron finial with a tuft, three-peaked visor, flaps in banner colour
  const jinHelm = (col, flap, plume, tall) => hatOn(() => { const t = tall || 1;
    y('h', [0, 0.11, 0], [0.31, 0.12, 0.31], col); c('h', [0, 0.22, 0], [0.31, 0.13, 0.31], col); y('h', [0, 0.29, 0], [0.075, 0.05, 0.075], brass);
    c('h', [0, 0.29 + 0.16 * t, 0], [0.04, 0.3 * t, 0.04], 0xa8acb2); b('h', [0, 0.33 + 0.3 * t, 0], [0.055, 0.12, 0.055], plume || red);
    b('h', [0, 0.065, 0.165], [0.3, 0.045, 0.07], col); b('h', [0, 0.05, 0.2], [0.09, 0.05, 0.03], brass);
    b('h', [0.168, -0.07, 0.0], [0.03, 0.26, 0.25], flap, [0, 0, -0.1]); b('h', [-0.168, -0.07, 0.0], [0.03, 0.26, 0.25], flap, [0, 0, 0.1]); b('h', [0, -0.07, -0.168], [0.33, 0.26, 0.03], flap, [0.1, 0, 0]);
    b('h', [0, -0.19, -0.18], [0.34, 0.03, 0.035], brass, [0.1, 0, 0]); });
  // Ming 明盔 with 頓項: iron bowl, brass band, tall gilt spike over a red tassel, drooping studded neck-and-ear guard
  const mingKui = (col, flap, stud) => hatOn(() => {
    y('h', [0, 0.1, 0], [0.32, 0.12, 0.32], col); c('h', [0, 0.23, 0], [0.33, 0.17, 0.33], col); y('h', [0, 0.05, 0], [0.34, 0.035, 0.34], brass);
    c('h', [0, 0.41, 0], [0.045, 0.26, 0.045], gold); b('h', [0, 0.31, 0], [0.17, 0.09, 0.17], red); b('h', [0, 0.27, 0], [0.21, 0.05, 0.21], 0xa01a14);
    b('h', [0.175, -0.1, 0.02], [0.035, 0.27, 0.26], flap, [0, 0, -0.16]); b('h', [-0.175, -0.1, 0.02], [0.035, 0.27, 0.26], flap, [0, 0, 0.16]); b('h', [0, -0.1, -0.172], [0.34, 0.27, 0.035], flap, [0.14, 0, 0]);
    b('h', [0, -0.12, -0.192], [0.3, 0.02, 0.01], stud, [0.14, 0, 0]); b('h', [0.196, -0.12, 0.02], [0.01, 0.02, 0.22], stud, [0, 0, -0.16]); b('h', [-0.196, -0.12, 0.02], [0.01, 0.02, 0.22], stud, [0, 0, 0.16]); });
  const liangmao = (fr) => hatOn(() => { c('h', [0, 0.15, 0], [0.5, 0.16, 0.5], 0x2a2420); c('h', [0, 0.19, 0], [0.32, 0.1, 0.32], fr || red); y('h', [0, 0.25, 0], [0.05, 0.05, 0.05], gold); });
  const furHat = (col) => hatOn(() => { y('h', [0, 0.11, 0], [0.37, 0.12, 0.37], 0x6a4426); y('h', [0, 0.06, 0], [0.4, 0.05, 0.4], 0x4a2e1a); c('h', [0, 0.22, 0], [0.26, 0.14, 0.26], col); b('h', [0, 0.31, 0], [0.05, 0.06, 0.05], red); });
  // studded padded armour (棉甲 / 布面甲): coat, rows of brass rivet-heads front and back, studded shoulders, split skirt
  const dingjia = (col, stud, rows) => { b('c', [0, -0.04, 0], [0.5, 0.6, 0.31], col); for (const yy of rows || [0.15, 0.03, -0.09]) { b('c', [0, yy, 0.158], [0.4, 0.02, 0.01], stud || gold); b('c', [0, yy, -0.158], [0.4, 0.02, 0.01], stud || gold); }
    b('sl', [0.07, -0.12, 0], [0.1, 0.23, 0.28], col); b('sr', [-0.07, -0.12, 0], [0.1, 0.23, 0.28], col); b('sl', [0.08, -0.17, 0], [0.102, 0.02, 0.282], stud || gold); b('sr', [-0.08, -0.17, 0], [0.102, 0.02, 0.282], stud || gold);
    b('p', [0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); b('p', [-0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); b('p', [0, -0.22, 0.172], [0.4, 0.02, 0.01], stud || gold); b('p', [0, -0.36, 0.172], [0.4, 0.02, 0.01], stud || gold); };
  const hoof = (col) => { seg('elL', 'haL', 0.78, 1.0, 0.13, 0.15, col); seg('elR', 'haR', 0.78, 1.0, 0.13, 0.15, col); }; // 馬蹄袖
  const robe = (col, sash) => { b('p', [0, -0.25, 0.01], [0.44, 0.4, 0.3], col); if (sash) b('p', [0, -0.07, 0], [0.47, 0.07, 0.32], sash); };
  const backflag = (col, edge) => { b('c', [0.1, 0.5, -0.25], [0.03, 1.15, 0.03], 0x3a2a1a); b('c', [0.25, 0.82, -0.25], [0.28, 0.5, 0.016], col); if (edge) b('c', [0.25, 0.82, -0.252], [0.32, 0.54, 0.012], edge); }; // pole behind the shoulder, clear of the helmet
  const quiver = () => { y('c', [0.14, 0.05, -0.17], [0.13, 0.6, 0.13], 0x4a2e18, [0, 0, -0.35]); b('c', [0.25, 0.36, -0.17], [0.16, 0.12, 0.08], 0xe8e0cc, [0, 0, -0.35]); };
  const sadai = () => { b('p', [0.27, -0.16, 0.02], [0.06, 0.48, 0.24], 0x5a3a22, [0, 0, 0.22]); b('p', [0.29, -0.06, 0.02], [0.065, 0.12, 0.25], brass, [0, 0, 0.22]); // bow case (left hip)
    b('p', [-0.26, -0.08, -0.03], [0.08, 0.34, 0.17], 0x4a2e18, [0, 0, -0.18]); b('p', [-0.29, 0.13, -0.03], [0.06, 0.12, 0.16], 0xe8e0cc, [0, 0, -0.18]); }; // quiver with white fletching
  const verm = 0xc4381e, mirror = () => { y('c', [0, 0.06, 0.162], [0.17, 0.02, 0.17], 0xd6dadc, [HPI, 0, 0]); y('c', [0, 0.06, 0.165], [0.1, 0.015, 0.1], 0x9aa2a6, [HPI, 0, 0]); };
  const coat = (col, sash, collar) => { b('p', [0, -0.3, 0.01], [0.47, 0.52, 0.32], col); b('p', [0, -0.07, 0], [0.48, 0.07, 0.33], sash || 0x2a2622); b('c', [0, 0.2, 0.06], [0.3, 0.06, 0.24], collar || 0xe8e2d0); };
  const tassel = (yy) => { b('h', [0, yy, 0], [0.12, 0.07, 0.12], red); b('h', [0, yy - 0.06, 0], [0.16, 0.05, 0.16], red); };
  // Qi Jiguang's men: a low rattan helmet woven in bands, red knob, cloth neck guard
  const rattanHelm = () => hatOn(() => { c('h', [0, 0.17, 0], [0.4, 0.2, 0.4], 0xb8964e); y('h', [0, 0.07, 0], [0.4, 0.045, 0.4], 0x8a6a30); y('h', [0, 0.14, 0], [0.33, 0.02, 0.33], 0x8a6a30); b('h', [0, 0.28, 0], [0.07, 0.06, 0.07], red); b('h', [0, -0.08, -0.15], [0.3, 0.16, 0.03], verm, [0.15, 0, 0]); });
  const phoenixHelm = () => hatOn(() => { y('h', [0, 0.13, 0], [0.33, 0.16, 0.33], 0xc9a03a); c('h', [0, 0.24, 0], [0.33, 0.1, 0.33], 0xc9a03a); b('h', [0.21, 0.2, 0], [0.22, 0.06, 0.05], gold, [0, 0, 0.7]); b('h', [-0.21, 0.2, 0], [0.22, 0.06, 0.05], gold, [0, 0, -0.7]); c('h', [0, 0.42, 0], [0.045, 0.26, 0.045], gold); b('h', [0, 0.34, 0], [0.17, 0.08, 0.17], red); b('h', [0, 0.6, -0.04], [0.06, 0.16, 0.06], red, [-0.3, 0, 0]);
    b('h', [0.175, -0.1, 0.02], [0.035, 0.27, 0.26], 0x9a1a1e, [0, 0, -0.16]); b('h', [-0.175, -0.1, 0.02], [0.035, 0.27, 0.26], 0x9a1a1e, [0, 0, 0.16]); b('h', [0, -0.1, -0.172], [0.34, 0.27, 0.035], 0x9a1a1e, [0.14, 0, 0]); });
  // 笠盔: wide flat drooping iron brim, brass band and fittings, tall red horsehair plume
  const liKui = (iron2) => hatOn(() => { const st = iron2 || 0xb4b9bd;
    y('h', [0, 0.065, 0], [0.74, 0.018, 0.74], st); y('h', [0, 0.05, 0], [0.8, 0.012, 0.8], 0x8e9397);
    y('h', [0, 0.16, 0], [0.29, 0.16, 0.29], st); b('h', [0, 0.25, 0], [0.25, 0.08, 0.25], st); y('h', [0, 0.095, 0], [0.305, 0.03, 0.305], gold);
    for (let k = 0; k < 4; k++) b('h', [Math.sin(k * HPI + 0.785) * 0.15, 0.16, Math.cos(k * HPI + 0.785) * 0.15], [0.045, 0.045, 0.03], gold, [0, k * HPI + 0.785, 0]);
    c('h', [0, 0.31, 0], [0.055, 0.07, 0.055], gold);
    for (let k = 0; k < 5; k++) { const a = k * 1.2566; b('h', [Math.sin(a) * 0.05, 0.43, Math.cos(a) * 0.05 - 0.02], [0.03, 0.24, 0.03], k % 2 ? 0xd0261c : 0xa8160f, [Math.cos(a) * 0.35 - 0.12, 0, -Math.sin(a) * 0.35]); } });
  const buMian = (col, stud) => { b('c', [0, -0.04, 0], [0.5, 0.6, 0.31], col); for (const yy of [0.16, 0.06, -0.04, -0.14]) { b('c', [0, yy, 0.158], [0.42, 0.02, 0.01], stud); b('c', [0, yy, -0.158], [0.42, 0.02, 0.01], stud); }
    b('c', [0, 0.19, 0.12], [0.2, 0.1, 0.05], col, [0.3, 0, 0]); b('sl', [0.06, -0.12, 0], [0.09, 0.22, 0.27], col); b('sr', [-0.06, -0.12, 0], [0.09, 0.22, 0.27], col); b('sl', [0.07, -0.16, 0], [0.092, 0.02, 0.272], stud); b('sr', [-0.07, -0.16, 0], [0.092, 0.02, 0.272], stud);
    b('p', [0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); b('p', [-0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); b('p', [0, -0.22, 0.17], [0.38, 0.02, 0.01], stud); b('p', [0, -0.36, 0.17], [0.38, 0.02, 0.01], stud); };
  const flask = () => y('p', [0.22, -0.06, 0.1], [0.08, 0.15, 0.08], 0x5a3a20);
  // Ming gunner, as the scrolls show him: a dark polished 笠盔 with a cloth 頓項 hanging from it, a cloth-faced 布面甲 sown
  // with round brass rivet-heads (staggered dots, never stripes), a steel 護心鏡 on the chest, steel 披膊 on the shoulders,
  // steel 臂手 on the forearms, and the split armoured skirt
  const steel = 0x7c848c;
  const gunnerKui = (st, nape) => hatOn(() => {
    y('h', [0, 0.06, 0], [0.76, 0.02, 0.76], st); y('h', [0, 0.045, 0], [0.8, 0.012, 0.8], 0x4e555c);
    y('h', [0, 0.13, 0], [0.31, 0.1, 0.31], st); b('h', [0, 0.21, 0], [0.29, 0.13, 0.29], st); y('h', [0, 0.085, 0], [0.32, 0.03, 0.32], brass);
    b('h', [0, 0.15, 0.155], [0.05, 0.05, 0.03], brass); b('h', [0, 0.15, -0.155], [0.05, 0.05, 0.03], brass); c('h', [0, 0.31, 0], [0.055, 0.08, 0.055], brass);
    for (let k = 0; k < 3; k++) { const a = k * 2.094; b('h', [Math.sin(a) * 0.04, 0.44, Math.cos(a) * 0.04 - 0.02], [0.035, 0.26, 0.035], k ? 0xd0261c : 0xa8160f, [Math.cos(a) * 0.3 - 0.12, 0, -Math.sin(a) * 0.3]); }
    b('h', [0.175, -0.1, 0.0], [0.03, 0.24, 0.24], nape, [0, 0, -0.08]); b('h', [-0.175, -0.1, 0.0], [0.03, 0.24, 0.24], nape, [0, 0, 0.08]); b('h', [0, -0.1, -0.175], [0.34, 0.24, 0.03], nape, [0.08, 0, 0]); });
  const gunnerArmour = (col, stud) => {
    b('c', [0, -0.04, 0], [0.5, 0.6, 0.31], col); y('c', [0, 0.05, 0.16], [0.19, 0.025, 0.19], steel, [HPI, 0, 0]);
    for (const [x, yy] of [[-0.17, 0.15], [0.17, 0.15], [-0.17, -0.02], [0.17, -0.02], [-0.08, -0.13], [0.08, -0.13]]) b('c', [x, yy, 0.16], [0.04, 0.04, 0.02], stud);
    for (const [x, yy] of [[-0.11, 0.08], [0.11, -0.05]]) b('c', [x, yy, -0.16], [0.04, 0.04, 0.02], stud);
    b('sl', [0.075, -0.07, 0], [0.11, 0.19, 0.3], steel); b('sr', [-0.075, -0.07, 0], [0.11, 0.19, 0.3], steel);
    seg('elL', 'haL', 0.12, 0.8, 0.125, 0.125, steel); seg('elR', 'haR', 0.12, 0.8, 0.125, 0.125, steel);
    b('p', [0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col); b('p', [-0.12, -0.3, 0.03], [0.22, 0.44, 0.32], col);
    for (const [x, yy] of [[0.12, -0.22], [-0.12, -0.22], [0.12, -0.38], [-0.12, -0.38]]) b('p', [x, yy, 0.195], [0.04, 0.04, 0.02], stud); };
  const kyahanW = () => kyahan(0xe8e2d0);
  const yaopai = () => { b('p', [-0.17, -0.06, 0.16], [0.012, 0.09, 0.012], 0x2a2018); b('p', [-0.17, -0.15, 0.165], [0.075, 0.11, 0.016], 0xcbb07a); b('p', [-0.17, -0.13, 0.175], [0.04, 0.012, 0.004], 0x5a3a20); }; // 腰牌: Qi Jiguang's waist tag (name, unit, looks), the period way a Ming soldier was identified
  // a tall cavalry banner on a long pole: the rider is small at 35 m, the flag is not
  const tallFlag = (col, edge) => { b('c', [0, 0.72, -0.18], [0.035, 1.6, 0.035], 0x3a2a1a); b('c', [0.19, 1.2, -0.18], [0.38, 0.72, 0.018], edge); b('c', [0.19, 1.2, -0.18], [0.32, 0.64, 0.022], col); };
  // twin back flags for the Khan's guard
  const twinFlags = (col, edge) => { for (const sx of [-1, 1]) { b('c', [sx * 0.08, 0.55, -0.18], [0.025, 1.25, 0.025], 0x2a1e14, [0, 0, -sx * 0.12]); b('c', [sx * 0.22, 0.95, -0.18], [0.24, 0.42, 0.016], edge, [0, 0, -sx * 0.12]); b('c', [sx * 0.22, 0.95, -0.18], [0.19, 0.36, 0.02], col, [0, 0, -sx * 0.12]); } };
  // 震天雷 bombers: a bandolier of iron thunder-crash bombs, fuses capped
  const bombs = () => { b('c', [0, 0.02, 0.16], [0.07, 0.62, 0.012], 0x8a6a40, [0, 0, 0.62]); for (const [x, yy] of [[0.13, 0.15], [0.0, 0.03], [-0.13, -0.09]]) { b('c', [x, yy, 0.19], [0.12, 0.12, 0.1], 0x26262a); b('c', [x, yy + 0.07, 0.2], [0.025, 0.04, 0.025], 0xd8c8a0); } };
  // 蓑衣 straw rain cape of a farmer called to arms
  const straw = () => { b('c', [0, 0.04, -0.03], [0.58, 0.6, 0.38], 0x9a8a5a); b('p', [0, -0.16, -0.06], [0.56, 0.3, 0.36], 0x8a7a4a); b('c', [0, 0.22, 0.0], [0.5, 0.08, 0.36], 0xa8986a); };
  const bc = imp ? red : (u.type === 'shinsengumi' ? 0xd8b03c : BANNER[((u.squad >= 0 ? u.squad : u.id) * 7 + 3) % 4]);
  const trim = imp ? gold : (bc === 0xe8e4da ? 0xb0262a : bc === 0x2f4fa8 ? 0xe8e4da : 0xb0262a); // bordered banners: a contrasting edge
  if (imp) switch (u.type) {
    case 'hero': phoenixHelm(); dingjia(0x8a1a1e, gold); mirror(); b('c', [0, -0.08, -0.18], [0.62, 0.95, 0.03], 0xb02a24, [-0.06, 0, 0]); b('c', [0, 0.18, -0.17], [0.5, 0.06, 0.05], gold); break;
    case 'samurai': rattanHelm(); coat(verm, 0xe8e2d0, 0x2a2622); kyahanW(); yaopai(); b('p', [-0.24, -0.1, 0.05], [0.06, 0.4, 0.07], 0x2a1e14, [0.3, 0, -0.1]); break;
    case 'yuanyang': if (u.look) R.lookGear(u.look, b, c, y, hatOn, 'head'); else rattanHelm(); coat(verm, 0xe8e2d0, 0x2a2622); kyahanW(); yaopai(); if (u.role === 'lead') backflag(0xe8c25a, red); if (u.look) R.lookGear(u.look, b, c, y, hatOn, 'body'); break;
    case 'cavalry': mingKui(iron, 0x9a2222, gold); dingjia(0x9a2222, gold); mirror(); tallFlag(verm, gold); hoof(0x9a2222); break;
    case 'ashigaru': hatOn(() => { c('h', [0, 0.13, 0], [0.66, 0.2, 0.66], 0xc8a868); y('h', [0, 0.07, 0], [0.5, 0.02, 0.5], 0x9a7a40); b('h', [0, 0.26, 0], [0.07, 0.06, 0.07], red); }); coat(verm, 0x2a2622); kyahanW(); break;
    case 'rifle_imp': gunnerKui(0x5a6168, 0x7a1a16); gunnerArmour(0xa8261e, gold); kyahanW(); yaopai(); break;
    case 'rifle_spencer': gunnerKui(0x4a5056, 0x3a2a24); gunnerArmour(0x7a2a22, 0xc9c0a8); kyahanW(); break;
    case 'jinshotai': gunnerKui(0x5a6168, 0x1c2438); gunnerArmour(0x24304a, gold); kyahanW(); break;
    case 'jigen': mingKui(0x6e757c, 0x3a3a40, brass); dingjia(0x4a2024, 0x9a9ea6, [0.15, 0.06, -0.03, -0.12]); mirror(); break;
    case 'horokutai': mingHair(); b('h', [0, 0.115, 0], [0.285, 0.045, 0.285], red); robe(0x7a3422, 0x2a2a34); bombs(); y('c', [0.12, -0.02, -0.17], [0.2, 0.2, 0.2], 0x2a2a2e); break;
    case 'ronin': if (vr % 2 === 0) hatOn(() => c('h', [0, 0.16, 0], [0.8, 0.18, 0.8], 0x9a8058)); else { mingHair(); b('h', [0, 0.08, 0], [0.29, 0.07, 0.29], 0x2a3a5a); } robe(torsoColor(u), 0x5a4a3a); if (vr % 3 !== 1) straw(); break;
  } else if (u.look && u.look.jin) { const L = u.look, cc = L.coat || bc;
    if (L.jin === 'helm') jinHelm(L.iron || iron, cc, L.plume || red, L.tall); else if (L.jin === 'fur') furHat(L.fur || red); else if (L.jin === 'liang') liangmao();
    queue(); if (L.armor === 'robe') robe(cc, L.sash || 0x26262c); else dingjia(cc, L.stud || 0xc9c0a8); hoof(cc); if (L.quiver) { quiver(); sadai(); } if (L.flag) backflag(bc);
    R.lookGear(L, b, c, y, hatOn, 'body');
  } else switch (u.type) {
    case 'hero': jinHelm(0xc9a03a, 0xe8c040, red, 1.35); queue(); dingjia(0xe8c040, 0xa8201a, [0.15, 0.06, -0.03, -0.12]); hoof(0xe8c040); b('c', [0, -0.08, -0.18], [0.6, 0.95, 0.03], 0xa8201a, [-0.06, 0, 0]); break; // the Khan's yellow, under a red cloak
    case 'samurai': jinHelm(iron, bc, red); queue(); dingjia(bc, 0xc9c0a8); hoof(bc); break;
    case 'cavalry': jinHelm(iron, bc, red); queue(); dingjia(bc, 0xc9c0a8, [0.12, -0.04]); hoof(bc); sadai(); backflag(bc); break;
    case 'shinsengumi': jinHelm(0x4a4440, 0xd8b03c, red, 1.2); queue(); dingjia(0x2e2b28, 0xd8b03c, [0.15, 0.03, -0.09]); hoof(0x2e2b28); twinFlags(red, 0xd8b03c); break; // the Khan's guard: dark iron-studded armour and twin red-and-gold back flags (silhouette choice; no period source found for the details)
    case 'ashigaru': liangmao(); queue(); robe(bc, 0x26262c); hoof(bc); break;
    case 'rifle_sho': jinHelm(iron, bc, red); queue(); robe(bc, 0x26262c); hoof(bc); belts(0x6a4a30); flask(); break; // Ujen Cooha gunners: Han bannermen in helmets
    case 'archer': liangmao(); queue(); robe(0x2c3f6a, bc); hoof(0x2c3f6a); sadai(); break;
    case 'horokutai': liangmao(); queue(); robe(bc, 0x26262c); hoof(bc); b('p', [-0.24, -0.02, 0.04], [0.14, 0.18, 0.2], 0x6a5038); y('p', [0.24, -0.02, 0.06], [0.16, 0.14, 0.16], 0x2a2a2e); break;
    case 'byakkotai': case 'ronin': furHat(vr % 2 ? red : 0x2a4a8a); queue(); robe(torsoColor(u), [0xc8281e, 0x2a4a8a, 0xd8b03c][vr % 3]); b('c', [0.08, 0.04, 0.158], [0.08, 0.5, 0.012], 0xd8b03c, [0, 0, -0.5]); b('c', [0, 0.2, 0.06], [0.32, 0.06, 0.26], 0x6a4426); break; // the deel's slanting lapel and fur collar
  }
  // faces: eyes, brows, mouth, and a moustache or beard on some of the older men
  if (u.look) R.lookGear(u.look, b, c, y, hatOn, 'face');
  else if (u.type !== 'horse' && !u.def.cannon && !u.def.gun) {
    const ink = 0x1a1410, hair = 0x201a16, fz = 0.146;
    b('h', [0.058, 0.0, fz], [0.045, 0.02, 0.012], ink); b('h', [-0.058, 0.0, fz], [0.045, 0.02, 0.012], ink);
    const bt = vr === 5 ? 0.12 : 0; b('h', [0.06, 0.035, fz], [0.065, 0.016, 0.014], hair, [0, 0, -0.12 - bt]); b('h', [-0.06, 0.035, fz], [0.065, 0.016, 0.014], hair, [0, 0, 0.12 + bt]);
    b('h', [0, -0.045, fz + 0.006], [0.03, 0.05, 0.02], 0xd2aa84); // nose
    b('h', [0, -0.085, fz], [0.06, 0.012, 0.012], 0x6a3a30);
    if (vr === 1 || vr === 2) b('h', [0, -0.066, fz + 0.004], [0.11, 0.022, 0.014], hair);
    if (vr === 2) b('h', [0, -0.125, fz - 0.005], [0.05, 0.05, 0.02], hair);
    if (vr === 3) { b('h', [0, -0.12, fz - 0.01], [0.24, 0.06, 0.03], hair); b('h', [0.12, -0.07, 0.06], [0.03, 0.1, 0.12], hair); b('h', [-0.12, -0.07, 0.06], [0.03, 0.1, 0.12], hair); }
  }
  const hp = P.find(q => q.hat);
  g = { parts: P, hat: hp ? { m: hp.m, s: hp.s, k: hp.k } : null }; RG_CACHE.set(key, g); return g;
}
R.GEAR_HOOK.fn = realGear;
R.GEAR_HOOK.torso = (u) => u.team === 1 && u.type === 'shinsengumi' ? 0x2e2b28 : 0; // the Khan's guard in dark iron-studded coats, not banner yellow
R.GEAR_HOOK.legs = (u) => u.team === 1 && u.type === 'shinsengumi' ? 0x26231f : 0;
})();
