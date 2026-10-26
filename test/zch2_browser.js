// Chapter Two in the browser: from a finished Chapter One save, Continue -> cards -> camp -> sleep -> battle.
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path'); const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 560 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const url = 'file://' + path.resolve(__dirname, '..', 'dist', 'test.html');
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { const alive = {}, fate = {}, bond = {}; for (const k of ['wu', 'lou', 'me', 'liu6', 'luo', 'jin', 'ye', 'wang', 'fang', 'he', 'du', 'zhu']) { alive[k] = !['wu', 'jin', 'du'].includes(k); fate[k] = alive[k] ? 'out' : 'dead'; bond[k] = 1; }
    localStorage.setItem('mingZhe', JSON.stringify({ v: 1, stage: 'end1', name: { zh: '阿明', en: 'Aming' }, alive, fate, bond, talked: {}, flags: { letter: true, saved6: true }, me: 'me' })); });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; });
  await page.click('#btnZhe'); await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/ch2_intro.png', timeout: 90000 });
  for (let i = 0; i < 3; i++) { await page.click('#zheNext'); await page.waitForTimeout(300); }
  await page.waitForTimeout(2500);
  const camp = await page.evaluate(() => { const s = window.__boshin.state.sim; return { mission: s.cfg.mission, npcs: s.units.filter(u => u.camp).length, beds: (s.cfg.camp.bedrolls || []).length }; });
  await page.evaluate(() => { document.getElementById('pause').hidden = true; });
  await page.screenshot({ path: out + '/ch2_camp.png', timeout: 90000 });
  // talk to the first man in front: face him and press E
  const talk = await page.evaluate(() => { const st = window.__boshin.state, sim = st.sim, h = sim.units[sim.players[0].heroId]; const u = sim.units.find(v => v.camp && v.ci >= 12); if (!u) return 'no recruit'; h.x = h.px = u.x; h.z = h.pz = u.z - 1.6; return u.ci; });
  await page.waitForTimeout(300);
  // jump straight to the battle via the save, as sleeping would
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('mingZhe')); s.stage = 'battle2'; localStorage.setItem('mingZhe', JSON.stringify(s)); localStorage.setItem('mingZheGo', 'battle2'); });
  await page.reload({ waitUntil: 'load' }); await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; });
  await page.waitForTimeout(3500);
  const bat = await page.evaluate(() => { const s = window.__boshin.state.sim, me = s.players[0], h = s.units[me.heroId]; return { mission: s.cfg.mission, role: h && h.role, owns: me.squads.length, tick: s.tick, tags: [...document.querySelectorAll('.ztag')].filter(e => e.style.display !== 'none').length }; });
  await page.evaluate(() => { document.getElementById('pause').hidden = true; });
  await page.screenshot({ path: out + '/ch2_battle.png', timeout: 90000 });
  console.log(JSON.stringify({ camp, talk, bat }), 'errors', errors); await browser.close();
})();
