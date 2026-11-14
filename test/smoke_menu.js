// Loads the built test page and fails on any page error at load (catches TDZ-style menu breakage). Needs a server on :8766 at the repo root.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('mingLives', JSON.stringify([{ t: Date.now(), e: ['Li Tie (李鐵), born 1602, died in 1621, aged 19.'] }])));
  await p.goto('http://127.0.0.1:8766/dist/test.html'); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => ({ cta: !!document.getElementById('wCta'), hall: !!document.getElementById('wHall'), txt: (document.getElementById('wCta') || {}).innerText }));
  await p.evaluate(() => { const b = document.querySelector('[data-m="stand"]'); if (b) b.click(); }); await p.waitForTimeout(500);
  const sm = await p.evaluate(() => document.querySelectorAll('#sdmaps button').length);
  console.log(JSON.stringify(r).slice(0, 300), 'standMaps', sm, 'errors', JSON.stringify(errs)); await b.close(); })();
