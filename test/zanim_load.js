// Startup check for the animation work: load a page, start a practice battle, report page/console errors. node test/zanim_load.js [page]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core'); const path = require('path'); const pageName = process.argv[2] || 'test-real';
(async () => { const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } }); const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', pageName + '.html'), { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; document.getElementById('lowfxIn').checked = true; const st = window.__boshin.state; st.army = (process.env.ARMY || 'samurai').split(','); st.mode = 'standard'; st.battle = 'field'; }, );
  await page.evaluate(() => document.getElementById('btnSolo').click());
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(2000); const ok = await page.evaluate(() => !!(window.__boshin.state.sim && window.__boshin.state.renderer)); if (ok || errors.length) break; }
  const st = await page.evaluate(() => ({ screen: window.__boshin.state.screen, sim: !!window.__boshin.state.sim, r: !!window.__boshin.state.renderer }));
  console.log(JSON.stringify({ st, errors: errors.slice(0, 5) })); await browser.close(); })();
