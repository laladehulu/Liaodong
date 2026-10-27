// Runtime smoke test for the figure animations: a field battle stepped and rendered for N seconds in a page (default test-real),
// archers firing so arrow deaths happen; reports page errors, how many men went through each animation path, and frame cost.
// node test/zanim_smoke.js [page] [seconds]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const pageName = process.argv[2] || 'test-real', secs = +process.argv[3] || 25;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', pageName + '.html'), { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; document.getElementById('lowfxIn').checked = true; const st = window.__boshin.state; st.army = ['samurai', 'archer']; st.mode = 'standard'; st.battle = 'field'; });
  await page.evaluate(() => document.getElementById('btnSolo').click()); for (let i = 0; i < 150; i++) { await page.waitForTimeout(2000); if (await page.evaluate(() => !!(window.__boshin.state.sim && window.__boshin.state.renderer))) break; } await page.waitForTimeout(800);
  const info = await page.evaluate((secs) => new Promise((res) => { const d = window.__boshin, st = d.state, sim = st.sim, r = st.renderer, S = SIM;
    st.screen = 'pause'; sim.phase = 1; sim.battleTick = sim.tick; for (const p of sim.players) p.ready = true; for (const q of sim.squads) q.order = S.ORD_CHARGE;
    const me = sim.players[0], h = sim.units[me.heroId]; const yq = (y) => ((Math.round(y / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
    const stats = { dying: 0, dyingMax: 0, helper: 0, tiger: 0, riposte: 0, idle: new Set(), deaths: 0, arrowDeaths: 0, frames: 0, ms: 0 };
    let n = 0; const N = Math.round(secs * 30);
    const tick = () => { for (let k = 0; k < 3 && n < N; k++, n++) { sim.step([[0, yq(h.yaw), 0, n % 60 < 20 ? S.A_ATK : 0, S.DIR_RIGHT, S.DIR_UP, [], 0]]);
        for (const ev of sim.events) { if (ev.t === 'death') { stats.deaths++; if (ev.cause === 'arrow') stats.arrowDeaths++; } }
        r.processEvents(sim.events); }
      const t0 = performance.now(); r.fdt = 0.1; r.render(0.5, 0.1, { mode: 'cmd', yaw: 0, pitch: 0, selected: [] }); stats.ms += performance.now() - t0; stats.frames++;
      if (r.dying) { stats.dyingMax = Math.max(stats.dyingMax, r.dying.size); }
      for (let i = 0; i < sim.units.length; i++) { const a = r.anims[i]; if (!a) continue; if (a.hlp > 0.5) stats.helper++; if (a.tgK > 0.5) stats.tiger++; if (a.swRip) stats.riposte++; if (a.ivOn && a.ivK >= 0) stats.idle.add(a.ivK); }
      if (n < N) setTimeout(tick, 0); else { stats.idle = [...stats.idle]; stats.msPerFrame = stats.ms / stats.frames; res(stats); } };
    tick(); }), secs);
  console.log(JSON.stringify({ page: pageName, info, errors })); await browser.close();
})();
