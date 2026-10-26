// Deeds: fake a few things done in a story battle, finish it, then check the result line, the roll by the bedroll
// and the camp talk that answers them. usage: node test/deeds.js <outdir> [test.html|test-real.html] [zhe|jin|sj]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const out = process.argv[2] || '.', file = process.argv[3] || 'test.html', camp = process.argv[4] || 'zhe';
const CFG = {
  zhe: { key: 'mingZhe', go: 'mingZheGo', battle: 'battle1', camp: 'camp1', save: (st) => { const alive = {}, fate = {}, bond = {}; for (const k of ['wu', 'lou', 'me', 'liu6', 'luo', 'jin', 'ye', 'wang', 'fang', 'he', 'du', 'zhu']) { alive[k] = true; fate[k] = 'out'; bond[k] = 1; } return { v: 1, stage: st, name: { zh: '阿明', en: 'Aming' }, alive, fate, bond, talked: {}, flags: {}, me: 'me' }; } },
  jin: { key: 'mingJin', go: 'mingJinGo', battle: 'b1', camp: 'c2', save: null },
  sj: { key: 'mingShenji', go: 'mingShenjiGo', battle: 'battle1', camp: 'camp1', save: null },
}[camp];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } }); const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'warning' && /deeds/.test(m.text())) errors.push('warn ' + m.text()); });
  await page.goto('file:///home/claude/ming/dist/' + file, { waitUntil: 'load', timeout: 90000 });
  if (CFG.save) await page.evaluate(([k, g, s, st]) => { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem(g, st); }, [CFG.key, CFG.go, CFG.save(CFG.battle), CFG.battle]);
  else await page.evaluate(([k, g, st]) => { const s = JSON.parse(localStorage.getItem(k) || 'null'); if (s) { s.stage = st; localStorage.setItem(k, JSON.stringify(s)); } localStorage.setItem(g, st); }, [CFG.key, CFG.go, CFG.battle]);
  await page.reload({ waitUntil: 'load', timeout: 90000 }); await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; }); await page.waitForTimeout(4000);
  const r1 = await page.evaluate(() => { const st = window.__boshin.state, sim = st.sim; const h = sim.units[sim.players[0].heroId];
    // two ticks of HUD so the battle record starts, then a few deeds
    const file = Object.keys(window.__boshin.ZB ? window.__boshin.ZB.map : {}).map(Number);
    return { mission: sim.cfg.mission, hero: h && h.id, file: file.length }; });
  // the main script keeps ZB in its closure: drive the deeds through the events it consumes
  const r2 = await page.evaluate(() => { const st = window.__boshin.state, sim = st.sim, h = sim.units[sim.players[0].heroId];
    const mates = sim.squads[sim.players[0].soldierSq].unitIds.filter(id => id !== h.id).map(id => sim.units[id]);
    const foes = sim.units.filter(u => u.team !== h.team && u.type !== 'horse' && !u.dead).slice(0, 4);
    const a = mates[1], b = mates[3], c = mates[5];
    // a man down and helped; another wounded and left far away; an enemy killed by you who was attacking c
    const ev = [{ t: 'zhelp', id: a.id, by: h.id }, { t: 'block', by: h.id, att: foes[0].id }, { t: 'block', by: h.id, att: foes[0].id }];
    foes[0].target = c.id; c.hp = c.def.hp * 0.3; foes[0].dead = true; ev.push({ t: 'death', id: foes[0].id, killer: h.id }); foes[1].dead = true; ev.push({ t: 'death', id: foes[1].id, killer: h.id });
    b.wounded = true; b.downed = true; b.helpedBy = -1; b.x = b.px = h.x + 60; b.z = b.pz = h.z;
    st.__ddEv = ev; return { a: a.id, b: b.id, c: c.id }; });
  // feed the events through the game's own per-tick event hook by stepping one frame
  await page.evaluate(() => { const st = window.__boshin.state; window.__boshin.handleEvents(st.__ddEv); });
  await page.waitForTimeout(800);
  const r3 = await page.evaluate(() => { const st = window.__boshin.state, sim = st.sim; return { tick: sim.tick }; });
  await page.evaluate(() => { const st = window.__boshin.state; window.__boshin.finish(st.sim.mission.side); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/deeds_result.png', timeout: 90000 });
  const res = await page.evaluate(() => ({ text: (document.getElementById('resultText') || {}).innerHTML || '', save: (JSON.parse(localStorage.getItem('mingZhe') || 'null') || {}).dd }));
  console.log(JSON.stringify({ r1, r2, r3, resText: res.text.slice(-400), log: res.save && res.save.log && res.save.log.map(B => ({ kills: B.kills, help: B.help, left: B.left, saved: B.saved, blocks: B.blocks })) }), 'errors', errors);
  await browser.close();
})();
