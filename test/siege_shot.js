// node test/siege_shot.js <outdir> [test.html|test-real.html] : screenshots of the siege stages
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], build = process.argv[3] || 'test.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', build), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const st = window.__boshin.state; st.faction = 1; });
  await page.click('[data-m="siege"]'); await page.waitForTimeout(300);
  const menuOps = await page.evaluate(() => [...document.querySelectorAll('#missionList button')].map(b => b.textContent.slice(0, 40)));
  await page.click('#btnSolo'); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => { const st = window.__boshin.state; return { mode: st.sim.mode, op: st.sim.mission && st.sim.mission.title, sg: !!st.sim.sg }; });
  const shots = [
    ['overview', 0, (sim) => {}, [-60, 28, -40], [0, 4, 45]],
    ['approach', 0, (sim) => { const sg = sim.sg; for (const e of sg.engines) e.z = Math.min(e.z + 40, e.tz); }, [22, 6, -20], [0, 3, 30]],
    ['walls', 1, (sim) => { const sg = sim.sg; for (const f of SIM.TERR.sditch.fills) f.done = true; sg.lads[1].up = true; sg.lads[2].up = true; sg.lads[1].hp = 600; sg.lads[2].hp = 600; for (const e of sg.engines) { e.z = e.tz; if (e.kind === 'tower') { e.docked = true; e.lad.up = true; } if (e.kind === 'ram') e.atGate = true; } sg.engines[0].burn = 8; sim.navBoxes(); }, [-30, 9, 16], [-8, 5, 42]],
    ['gate', 2, (sim) => { sim.sgGate(1e6); }, [9, 4, 22], [0, 3, 46]],
    ['streets', 3, (sim) => {}, [-30, 16, 50], [0, 2, 100]],
  ];
  const only = process.argv[4] ? process.argv[4].split(',') : null;
  for (const [name, sector, fn, cp, la] of shots) { if (only && !only.includes(name)) continue;
    await page.evaluate(([fnSrc, sector]) => { const st = window.__boshin.state, sim = st.sim; st.screen = 'pause'; for (const id of ['hud', 'pause', 'cmdui', 'toast', 'storycard', 'feed', 'vitals', 'hudmarks', 'deploy', 'mobj']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; } document.body.classList.remove('deploying');
      (new Function('sim', 'return (' + fnSrc + ')(sim)'))(sim); }, [fn.toString(), sector]);
    await page.evaluate(([cp, la]) => { const r = window.__boshin.state.renderer; const cam = new THREE.PerspectiveCamera(55, 1100 / 620, 0.1, 900); const gy = SIM.terrainH(la[0], la[2]); cam.position.set(cp[0], SIM.terrainH(cp[0], cp[2]) + cp[1], cp[2]); cam.lookAt(la[0], gy + la[1], la[2]); r.scene.add(cam);
      for (let i = 0; i < 3; i++) { r.fdt = 0.05; r.render(0.5, 0.05, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); } r.present(cam); r.scene.remove(cam); }, [cp, la]);
    await page.screenshot({ path: path.join(out, 'siege_' + name + (build.includes('real') ? '_real' : '') + '.png'), timeout: 120000 });
  }
  console.log(JSON.stringify({ menuOps, info }), 'errors', errors); await browser.close();
})();
