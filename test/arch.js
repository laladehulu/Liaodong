const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const errors = [];
  for (const [b, v] of [['hakodate', [0, 30, 60, 0]], ['aizu', [0, 50, 45, 0]], ['field', [0, -20, 40, 0]]]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });
    page.on('pageerror', e => errors.push(b + ': ' + e.message));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load' }); await page.waitForTimeout(300);
    await page.evaluate((b) => { AUDIO.init = () => {}; window.__boshin.state.battle = b; window.__boshin.state.mode = 'grand'; }, b);
    await page.click('#btnSolo'); await page.waitForTimeout(800);
    await page.keyboard.press('KeyC');
    await page.evaluate((v) => { const r = window.__boshin.state.renderer; r.cmdCam.x = v[0]; r.cmdCam.z = v[1]; r.cmdCam.h = v[2]; r.cmdCam.yaw = v[3]; }, v);
    await page.waitForTimeout(1500);
    try { await page.screenshot({ path: path.resolve(__dirname, 'arch_' + b + '.png'), timeout: 60000 }); } catch (e) { console.log('fail', b); }
    await page.close();
  }
  console.log('errors', errors); await browser.close();
})();
