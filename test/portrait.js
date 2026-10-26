const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; }); await page.click('#btnSolo'); await page.waitForTimeout(1500);
  const res = await page.evaluate(() => { const d = window.__boshin, r = d.state.renderer, sim = d.state.sim; r.hitstop = 0.5; const urls = [];
    for (const ty of ['samurai', 'rifle_imp']) { const u = sim.units.find(v => v.type === ty); if (!u) { urls.push('none'); continue; } r.studio = { id: u.id, u, x: 0, y: 420, z: 0, yaw: 0.35 }; const prev = r.cine; r.cine = { pos: [0.9, 421.15, 3.3], look: [0, 420.92, 0], fov: 36 }; r.render(1, 0, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); urls.push(document.getElementById('c').toDataURL('image/jpeg', 0.5).length); r.studio = null; r.cine = prev; }
    return { urls, hs: r.hitstop, vk: r.vmFov.scale.x }; });
  console.log(JSON.stringify(res), 'errors', errors);
  await browser.close();
})();
