// Clicks every mode on the menu (with a well-used browser's saves) and a few of each mode's lists; reports page errors. Needs a server on :8766.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1200, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const L = localStorage; L.setItem('mingMedals', JSON.stringify({ 'story:0:0': { d: 2, t: 400 }, taizhou: { d: 1, t: 300 }, 'op:liaoyang': { d: 1, t: 600 }, 'op:ningyuan_siege': { d: 0, t: 900 } })); L.setItem('mingRecord', JSON.stringify({ 'standard:1': { w: 3, l: 2 } })); L.setItem('mingDuelRung', '5'); L.setItem('mingStandBest', '4'); L.setItem('mingWorld', JSON.stringify({ v: 1, day: 400, hour: 9, place: 'lijia', from: '', name: { zh: '李鐵', en: 'Li Tie' }, born: 1602, cash: 100, learning: 20, arms: 10, health: 90, status: 'none', army: null, office: null, lodge: 'lijia', dead: {}, talked: {}, heard: {}, rel: {}, flags: {}, exams: {}, log: [], fired: {}, alive: true })); });
  await p.goto('http://127.0.0.1:8766/dist/test.html'); await p.waitForTimeout(3500);
  const modes = await p.evaluate(() => [...document.querySelectorAll('#modeSeg [data-m]')].map(b => b.dataset.m));
  for (const m of modes) { const before = errs.length; await p.evaluate((m) => document.querySelector(`#modeSeg [data-m="${m}"]`).click(), m); await p.waitForTimeout(500);
    // click every visible chapter/mission/scen/role button once
    const n = await p.evaluate(() => { let n = 0; for (const sel of ['#missionList button.chap', '#storyList button', '#mroleList button', '#scenList button', '#sdmaps button', '#sdroles button']) { const bs = [...document.querySelectorAll(sel)].filter(b => b.offsetParent && !b.disabled).slice(0, 3); for (const b of bs) { b.click(); n++; } } return n; });
    await p.waitForTimeout(300); console.log(m.padEnd(10), 'clicked', n, errs.length > before ? 'ERR ' + errs.slice(before).join(' | ') : 'ok'); }
  await b.close(); })();
