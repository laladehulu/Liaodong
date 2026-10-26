// 神機營 campaign in the browser: menu button, intro cards, then each scene via the go flag (camp and battle screenshots)
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2], file = process.argv[3] || 'test.html', scenes = (process.argv[4] || 'menu,drill,camp0,battle1').split(',');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 560 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const url = 'file://' + path.resolve(__dirname, '..', 'dist', file); const res = {};
  await page.goto(url, { waitUntil: 'load', timeout: 150000 });
  for (const sc of scenes) {
    if (sc === 'menu') { await page.evaluate(() => localStorage.removeItem('mingShenji')); await page.reload({ waitUntil: 'load', timeout: 150000 });
      res.menu = await page.evaluate(() => { const b = document.getElementById('btnSj'); b.scrollIntoView(); return b ? b.textContent : 'none'; });
      await page.screenshot({ path: out + '/sj_menu.png', timeout: 90000 });
      await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; }); await page.click('#btnSj'); await page.waitForTimeout(500);
      await page.screenshot({ path: out + '/sj_intro.png', timeout: 90000 }); res.intro = await page.evaluate(() => (document.querySelector('#zheCard h2') || {}).textContent);
      continue; }
    await page.evaluate((sc) => { let s = null; try { s = JSON.parse(localStorage.getItem('mingShenji')); } catch (e) { } if (!s || !s.sj) { s = { v: 1, sj: true, name: { zh: '李順', en: 'Li Shun' }, me: 'sjme', team: ['sj_hu', 'sjme', 'sj_tian', 'sj_lin', 'sj_ma', 'sj_zhao', 'sj_song', 'sj_wu', 'sj_qian', 'sj_gao'], alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, newMen: [], lost: [] }; for (const k of s.team) s.alive[k] = true; }
      s.stage = sc; localStorage.setItem('mingShenji', JSON.stringify(s)); localStorage.setItem('mingShenjiGo', sc); }, sc);
    await page.reload({ waitUntil: 'load', timeout: 150000 }); await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; });
    await page.waitForFunction(() => !!(window.__boshin && window.__boshin.state && window.__boshin.state.sim && window.__boshin.state.screen === 'game'), null, { timeout: 150000 }).catch(() => {}); await page.waitForTimeout(3500);
    res[sc] = await page.evaluate(() => { const st = window.__boshin.state, s = st.sim; document.getElementById('pause').hidden = true; if (!s) return 'no sim';
      const me = s.players[0], h = s.units[me.heroId]; return { mission: s.cfg.mission, type: h && h.type, npcs: s.units.filter(u => u.camp).length, grid: document.querySelectorAll('#zgrid .zc').length, goal: (document.querySelector('#status .goal') || {}).textContent || '', card: (document.querySelector('#zheCard:not([hidden]) h2') || {}).textContent || '' }; });
    if (/^camp/.test(sc)) { // face the nearest man and talk to him
      res[sc + 'talk'] = await page.evaluate(() => { const st = window.__boshin.state, sim = st.sim, h = sim.units[sim.players[0].heroId]; const u = sim.units.filter(v => v.camp)[0]; if (!u) return 'none'; h.x = h.px = u.x; h.z = h.pz = u.z - 1.3; return u.ci; });
      await page.waitForTimeout(400);
      await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
      res[sc + 'dlg'] = await page.evaluate(() => { const d = document.getElementById('zheDlg'); return d && !d.hidden ? d.textContent.slice(0, 160) : 'no dialog'; }); }
    else await page.waitForTimeout(6000);
    await page.screenshot({ path: out + '/sj_' + sc + '.png', timeout: 90000 });
  }
  console.log(JSON.stringify(res, null, 1), 'errors', errors); await browser.close();
})();
