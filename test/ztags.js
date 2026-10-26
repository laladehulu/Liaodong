const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], build = process.argv[3] || 'test.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const url = 'file://' + path.resolve(__dirname, '..', 'dist', build);
  await page.goto(url, { waitUntil: 'load' }); await page.evaluate(() => localStorage.setItem('mingZheGo', 'battle1'));
  await page.goto(url, { waitUntil: 'load' }); await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { const sim = window.__boshin.state.sim, h = sim.units[sim.players[0].heroId]; let k = 0; for (const u of sim.units) if (u.look && u !== h && k < 5) { const x = h.x + Math.sin(h.yaw) * (5 + k) + (k - 2) * 1.5, z = h.z + Math.cos(h.yaw) * (5 + k); u.x = u.px = x; u.z = u.pz = z; u.y = u.py = SIM.terrainH(x, z); k++; } }); await page.waitForTimeout(300);
  const info = await page.evaluate(() => { document.getElementById('pause').hidden = true; document.getElementById('storycard').style.display = 'none';
    const sim = window.__boshin.state.sim; const K = RENDER.GEAR_K; const over = [];
    for (const u of sim.units) if (u.look) { const g = RENDER.gearFor(u), c = { b: 0, c: 0, y: 0 }; for (const p of g.parts) c[p.m]++; if (c.b > K.b || c.c > K.c || c.y > K.y) over.push(u.look.id + JSON.stringify(c)); }
    const st = window.__boshin.state, r = st.renderer, h = sim.units[sim.players[0].heroId]; const dbg = { mode: r.lastMode, screen: st.screen, dlg: !!st.zheDlg, near: sim.units.filter(u => u.look && Math.hypot(u.x - h.x, u.z - h.z) < 12).length };
    return { dbg, tags: [...document.querySelectorAll('.ztag')].filter(e => e.style.display !== 'none').map(e => e.textContent).slice(0, 6), roster: (document.querySelector('.zroster') || {}).textContent, over }; });
  await page.screenshot({ path: out, timeout: 120000 });
  console.log(JSON.stringify(info), 'errors', errors); await browser.close();
})();
