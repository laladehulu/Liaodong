// Model lab headless: node test/model_shot.js <outdir> [port]   (serve model/ over http first: python3 -m http.server <port> -d model)
// Loads the lab, reports errors and gait speeds, and writes a frame per mode (canvas readback; page.screenshot hangs on WebGL).
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core'); const fs = require('fs'), path = require('path');
const out = process.argv[2] || 'test/out', port = process.argv[3] || 8765, only = process.argv[4];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } }); await page.addInitScript(() => window.addEventListener('error', () => { window.__err = 1; })); const errors = []; page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 5).join(' | '))); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/index.html?noloop&shot`, { waitUntil: 'load', timeout: 180000 });
  try { await page.waitForFunction(() => window.LAB && (window.LAB.ready || window.LAB.error) || window.__err, null, { timeout: 120000 }); } catch (e) { console.log('NOT READY', JSON.stringify(errors.slice(0, 8)), await page.evaluate(() => document.getElementById('load') && document.getElementById('load').textContent)); await browser.close(); return; }
  const info = await page.evaluate(() => ({ err: window.LAB.error, speeds: Object.fromEntries(Object.entries(window.LAB.SPEED).map(([k, v]) => [k, +v.toFixed(2)])) })); console.log(JSON.stringify(info));
  const shots = [['show', 40, null], ['lineup', 40, null], ['duel', 150, null], ['file', 120, null]].filter(s => !only || only.split(',').includes(s[0]));
  for (const [mode, n, setup] of shots) {
    const r = await page.evaluate(([mode, n]) => { const L = window.LAB; L.setMode(mode); for (let i = 0; i < n; i++) L.step(1 / 30); const info = L.renderer.info.render; return { url: L.renderer.domElement.toDataURL('image/png'), calls: info.calls, tris: info.triangles, men: L.men.length }; }, [mode, n]);
    fs.writeFileSync(path.join(out, `model_${mode}.png`), Buffer.from(r.url.split(',')[1], 'base64')); console.log(mode, 'calls', r.calls, 'tris', r.tris, 'men', r.men);
  }
  console.log('errors', JSON.stringify(errors.slice(0, 8))); await browser.close();
})();
