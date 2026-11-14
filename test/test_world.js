// Lives through the open world's core systems in node: many lives, years each, choosing at random, checking nothing breaks
// and the numbers stay sane. Usage: node test/test_world.js [lives] [years]
const C = require('../src/world_core.js');
const LIVES = +(process.argv[2] || 40), YEARS = +(process.argv[3] || 8);
const fresh = (seed) => ({ seed, day: C.D(1618, 3, 1), hour: 7, place: 'lijia', from: 'start', name: { zh: '李鐵', en: 'Li Tie' }, born: 1602, cash: 1500, learning: 24, arms: 12, health: 100, status: 'none', army: null, office: null, flags: {}, rel: {}, inv: {} });
const PLACES = Object.keys(C.POP); let fails = 0, stats = { dil: {}, road: 0, deaths: 0, crafted: 0, jobs: 0, cases: 0, promos: 0, dismiss: 0, letters: 0, wed: 0, memos: 0, purged: 0, folkDead: 0, folkFled: 0 };
const bad = (m, S) => { fails++; if (fails < 12) console.log('FAIL', m, JSON.stringify({ day: S.day, cash: S.cash, health: S.health, place: S.place })); };
for (let L = 0; L < LIVES; L++) {
  const S = fresh(1000 + L * 7); S.folk = C.makeFolk(S); let r = (() => { let a = L * 9301 + 49297; return () => (a = (a * 9301 + 49297) % 233280) / 233280; })();
  const n0 = Object.keys(S.folk).length; if (n0 < 60) bad('few folk ' + n0, S);
  for (const f of Object.values(S.folk)) if (!f.zh || !f.en || !C.TR[f.trade] || !f.work) bad('bad folk ' + JSON.stringify(f), S);
  const HIST = { [C.D(1618, 4, 15)]: 'fushun', [C.D(1618, 4, 25)]: 'levy', [C.D(1619, 3, 2)]: 'sarhu', [C.D(1619, 3, 5)]: 'liuting', [C.D(1621, 3, 21)]: 'liaoyangfall' };
  for (let d = 0; d < YEARS * 360 && S.health > 0; d++) { S.day++;
    if (HIST[S.day]) { const o = C.folkHistory(S, HIST[S.day]); stats.folkFled += o.filter(x => x[0].trade === 'refugee').length; }
    stats.folkDead += C.folkDay(S).length;
    // a day's doings
    const x = r();
    if (x < 0.08) S.place = PLACES[Math.floor(r() * PLACES.length)];
    if (x < 0.04) { const e = C.roadDay(S); if (e) { stats.road++; const o = e[4][Math.floor(r() * e[4].length)]; const w = o[1](S); if (typeof w !== 'string') bad('road words ' + e[0], S); } }
    const dl = C.dilemmaNow(S); if (dl) { const i = Math.floor(r() * dl.opts.length); const w = C.dilemmaChoose(S, dl, i); if (typeof w !== 'string' || !w) bad('dil words ' + dl.k + i, S); stats.dil[dl.k] = (stats.dil[dl.k] | 0) + 1; }
    const here = Object.values(S.folk).filter(f => f.alive && f.place === S.place);
    for (const h of [6, 9, 12, 15, 20]) for (const f of here) { const a = C.folkAt(S, f, h); if (a && (a.act == null || !a.spot)) bad('folkAt', S); }
    if (here.length && r() < 0.3) { const f = here[Math.floor(r() * here.length)]; const J = C.jobsFor(S, f.trade); if (J.length) { C.work(S, J[0]); stats.jobs++; }
      const T = C.TR[f.trade]; if (T.sells && r() < 0.3) { const g = T.sells[0]; C.buy(S, S.place, g, 1); if (r() < 0.5) C.giftTo(S, f.k, g); }
      const L2 = C.letterAsk(S, f); if (L2 && r() < 0.5) C.letterTake(S, L2); if (C.letterDeliver(S, f)) stats.letters++; }
    if (r() < 0.05) { C.buy(S, S.place, 'iron', 3); const w = Object.keys(C.RECIPES)[Math.floor(r() * 4)]; if (C.craft(S, w)[0]) stats.crafted++; if (C.inv(S, w) && r() < 0.5) C.sell(S, S.place, w, 1); }
    if (r() < 0.02) C.drawStick(S); if (r() < 0.02) C.tale(S); if (r() < 0.01 && S.cash > 50) C.dice(S, 20);
    if (r() < 0.002 && !S.spouse) { const o = C.matchOffer(S); if (o && C.marry(S, o)[0]) stats.wed++; }
    if (r() < 0.004) S.learning = Math.min(100, S.learning + 3);
    if (!S.office && S.day > C.D(1622, 4, 1) && r() < 0.01) S.office = { zh: '知縣', en: 'County Magistrate', rank: 43, since: S.day };
    if (S.office) { if (r() < 0.1) { const c = C.caseNow(S); C.judge(S, c, Math.floor(r() * c[3].length)); stats.cases++; }
      for (const m of C.memosNow(S)) { C.memo(S, m, Math.floor(r() * m.opts.length)); stats.memos++; }
      if ((S.day - S.office.since) % 360 === 359) { const w = C.evaluate(S); if (/promoted/.test(w)) stats.promos++; if (/dismissed/.test(w)) stats.dismiss++; }
      const p = C.purge(S); if (p) stats.purged++; }
    S.health = Math.min(100, S.health + 2);
    S.cash = Math.max(0, S.cash); // the screen clamps after every action
    if (!Number.isFinite(S.cash) || !Number.isFinite(S.learning) || !Number.isFinite(S.health)) bad('NaN', S);
    if (S.cash > 2e6) bad('cash runaway ' + S.cash, S);
    for (const g in S.inv) if (!(S.inv[g] > 0)) bad('inv ' + g, S);
  }
  // prices sane on all places at the end
  for (const p of PLACES) for (const g in C.GOODS) { const v = C.price(S, p, g); if (!(v > 0 && v < 50000)) bad(`price ${p} ${g} ${v}`, S); }
  const J = C.journal(S); if (!J.length || J.some(l => l.length !== 3 || typeof l[2] !== 'string')) bad('journal', S);
}
// the seasons
const seas = [1, 3, 6, 9, 12].map(m => C.season(C.D(1619, m, 5))).join(','); if (seas !== 'winter,spring,summer,autumn,winter') { fails++; console.log('FAIL seasons', seas); }
// determinism: same seed, same folk
{ const a = C.makeFolk({ seed: 5 }), b = C.makeFolk({ seed: 5 }); if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL folk not deterministic'); } }
console.log(JSON.stringify(stats));
console.log(fails ? `${fails} FAILURES` : `OK: ${LIVES} lives × ${YEARS} years`);
process.exit(fails ? 1 : 0);
