// node test/menu_maps.js : lists the battlefields the picker offers in the regular and realism test pages (and page errors)
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core'); const path = require('path');
(async () => { const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  for (const pg of ['test.html', 'test-real.html', 'test-act.html']) { const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); await page.goto('file://' + path.resolve(__dirname, '..', 'dist', pg), { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(300);
    const names = await page.evaluate(() => [...document.querySelectorAll('#battles .battle .bn')].map(e => e.textContent)); console.log(pg, names.length, names.join(' | '), errs.length ? 'ERR ' + errs.join(' | ') : ''); await page.close(); }
  await browser.close(); })();
