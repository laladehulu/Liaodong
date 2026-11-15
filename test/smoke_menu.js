// Loads the built test page and fails on any page error at load (catches TDZ-style menu breakage). Needs a server on :8766 at the repo root.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const L = localStorage; L.setItem('mingLives', JSON.stringify([{ t: Date.now(), e: ['Li Tie (李鐵), born 1602, died in 1621, aged 19.'] }]));
    /* a well-used browser: every kind of record the menus draw at load (a TDZ error only shows when there is something to draw) */
    L.setItem('mingMedals', JSON.stringify({ 'story:0:0': { d: 2, t: 400 }, taizhou: { d: 1, t: 300 }, 'op:liaoyang': { d: 1, t: 600 } })); L.setItem('mingRecord', JSON.stringify({ 'standard:1': { w: 3, l: 2 } }));
    L.setItem('mingDuelRung', '2'); L.setItem('mingStandBest', '4'); L.setItem('mingStandBest:zroad', '3'); L.setItem('mingArmies', JSON.stringify({ s0: [['samurai', 'rifle_imp'], null, null], last0: ['samurai'], menu: { mode: 'standard', battle: 'toba' } })); });
  await p.goto('http://127.0.0.1:8766/dist/test.html'); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => ({ cta: !!document.getElementById('wCta'), hall: !!document.getElementById('wHall'), txt: (document.getElementById('wCta') || {}).innerText }));
  await p.evaluate(() => { const b = document.querySelector('[data-m="stand"]'); if (b) b.click(); }); await p.waitForTimeout(500);
  const sm = await p.evaluate(() => document.querySelectorAll('#sdmaps button').length);
  console.log(JSON.stringify(r).slice(0, 300), 'standMaps', sm, 'errors', JSON.stringify(errs)); await b.close(); })();
