// node test/map_shot.js <outdir> <tag> [battle,battle,...] [test.html] : one oblique overview of each battlefield
// (grand mode, nobody moving), written as <outdir>/map_<battle>_<tag>.png. The WebGL canvas is read back with toDataURL
// inside the same evaluate call as the render (page.screenshot hangs on WebGL pages under swiftshader).
// Optional per-map camera: CAMS[battle] = [[camX, camHeightAboveGround, camZ], [lookX, lookHeight, lookZ]].
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const out = process.argv[2], tag = process.argv[3] || 'shot', maps = (process.argv[4] || 'field,toba,ueno,nagaoka,aizu,hakodate,abudali,bjgate,zroad,sjvil,siegecity,bonari').split(','), build = process.argv[5] || 'test.html';
const CAMS = { hakodate: [[-70, 55, -40], [0, 2, 74]], aizu: [[-60, 60, -30], [0, 4, 80]], toba: [[-80, 50, -90], [0, 1, 0]], field: [[-60, 48, -110], [0, 4, 0]], ueno: [[-70, 55, -40], [0, 3, 72]],
  abudali: [[0, 40, -130], [0, 4, 20]], bjgate: [[-60, 40, -60], [6, 6, 140]], bonari: [[-30, 45, -120], [0, 6, 60]], nagaoka: [[-90, 50, -90], [0, 2, 0]], siegecity: [[-70, 40, -60], [0, 4, 45]] };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  for (const b of maps) {
    const page = await browser.newPage({ viewport: { width: 900, height: 520 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
    await page.evaluate((b) => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.mode = 'grand'; st.battle = b; }, b);
    await page.click('#btnSolo'); await page.waitForTimeout(1200);
    const cam = CAMS[b] || [[-70, 50, -90], [0, 2, 20]];
    let info = null;
    try {
      info = await page.evaluate(([cp, la]) => { const st = window.__boshin.state, r = st.renderer; st.screen = 'pause';
        for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'deploy', 'mobj', 'status', 'comms', 'help']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; } document.body.classList.remove('deploying');
        const cam = new THREE.PerspectiveCamera(55, 900 / 520, 0.1, 900); const gy = SIM.terrainH(la[0], la[2]); cam.position.set(cp[0], SIM.terrainH(cp[0], cp[2]) + cp[1], cp[2]); cam.lookAt(la[0], gy + la[1], la[2]); r.scene.add(cam);
        for (let i = 0; i < 2; i++) { r.fdt = 0.05; r.render(0.5, 0.05, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); r.scene.remove(cam);
        const c = document.getElementById('c'); return { battle: st.sim.battle, boxes: st.sim.boxes.length, obs: st.sim.obstacles.length, url: c.toDataURL('image/png') }; }, cam);
    } catch (e) { errors.push('evaluate: ' + e.message); }
    if (info && info.url) { const f = path.join(out, 'map_' + b + '_' + tag + '.png'); fs.writeFileSync(f, Buffer.from(info.url.split(',')[1], 'base64')); console.log(f, 'boxes', info.boxes, 'obstacles', info.obs, errors.length ? 'ERR ' + errors.join(' | ') : ''); }
    else console.log(b, 'FAILED', errors.join(' | '));
    await page.close();
  }
  await browser.close();
})();
