// Contact sheet of the 6 hit reactions (realism build): node test/zhitpose.js out.png [dist]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], dist = +process.argv[3] || 7;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 520 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test-real.html'), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.army = ['ashigaru', 'samurai', 'shinsengumi']; st.mode = 'standard'; st.battle = 'field'; });
  await page.click('#btnSolo'); await page.waitForTimeout(1500);
  await page.evaluate((dist) => { const d = window.__boshin, sim = d.state.sim, r = d.state.renderer; d.state.screen = 'pause'; for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'status', 'zgrid', 'comms']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    const men = sim.units.filter(u => !u.dead && u.type !== 'horse' && !u.mounted && u.mount < 0 && u.weapon === 'katana').slice(0, 7);
    for (const u of sim.units) if (!men.includes(u) && u.type !== 'horse') { u.x = u.px = 200; u.z = u.pz = 200; }
    const gy = SIM.terrainH(0, -40);
    men.forEach((u, k) => { const x = (k - 3) * 1.9, z = -40; u.x = u.px = x; u.z = u.pz = z; u.y = u.py = SIM.terrainH(x, z); u.yaw = u.pyaw = Math.PI * 0.82; u.mx = u.mz = 0; u.speedNow = 0; u.st = SIM.ST_IDLE; u.stT = 0; u.blocking = false; u.aiming = false;
      // first six: one of each reaction near its peak; last: unhurt for reference
      if (k < 6) { u.hrK = k; u.hrA = 0.12; u.hrD = k === 5 ? 0.2 : k >= 3 ? 0.5 : 0.32; u.hrS = 1; u.hrT = 0.2; u.hrImm = 0; u.hrF = 0; u.hrL = []; } else { u.hrA = 9; } });
    const cam = new THREE.PerspectiveCamera(42, 1200 / 520, 0.1, 800); cam.position.set(dist * 0.35, gy + 1.6, -40 - dist); cam.lookAt(0, gy + 1.0, -40); r.scene.add(cam);
    for (let i = 0; i < 8; i++) { r.fdt = 0.05; r.render(0.5, 0.05, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam);
    const lab = document.createElement('div'); lab.style.cssText = 'position:fixed;left:0;right:0;bottom:8px;display:flex;justify-content:space-around;color:#fff;font:14px sans-serif;text-shadow:0 0 3px #000;z-index:99'; lab.innerHTML = ['1 head snap', '2 twist', '3 doubled', '4 stagger', '5 knee', '6 guard jolt', 'neutral'].map(s => '<span>' + s + '</span>').join(''); document.body.appendChild(lab); }, dist);
  await page.screenshot({ path: out, timeout: 120000 });
  console.log('errors', errors); await browser.close();
})();
