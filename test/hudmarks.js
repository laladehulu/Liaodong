const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; window.__boshin.state.army = ['samurai', 'rifle_imp', 'ashigaru']; });
  await page.click('#btnSolo'); await page.waitForTimeout(2500);
  await page.evaluate(() => { document.getElementById('pause').hidden = true; });
  const n = await page.evaluate(() => document.querySelectorAll('#hudmarks .hm').length + ' ' + [...document.querySelectorAll('#hudmarks .hm')].filter(e => e.style.display !== 'none').map(e => e.className + ':' + e.textContent).join(' | '));
  await page.screenshot({ path: out + '/hudmarks.png', timeout: 90000 });
  console.log(n, 'errors', errors); await browser.close();
})();
