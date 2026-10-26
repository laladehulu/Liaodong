// Deeds scenes: a camp after a battle where you ran but also carried a man: the court-martial (with the staff) and
// the thanks. usage: node test/deeds_scenes.js <outdir> [test.html|test-real.html]
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const out = process.argv[2] || '.', file = process.argv[3] || 'test.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } }); const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file:///home/claude/ming/dist/' + file, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => { const alive = {}, fate = {}, bond = {}; for (const k of ['wu', 'lou', 'me', 'liu6', 'luo', 'jin', 'ye', 'wang', 'fang', 'he', 'du', 'zhu']) { alive[k] = true; fate[k] = 'out'; bond[k] = 1; }
    const B = { m: 'abudali', title: 'Abudali Pass', kills: 3, kf: 0, club: 0, kick: 0, off: 0, long: 0, early: 0, held: 0, blocks: 9, shield: 2, help: ['lou'], rev: [], aid: [], back: [], over: 0, place: 30, ran: 14, rally: 0, alone: 0, last: 0, low: 0.4, fell: 0, beside: { lou: 30 }, left: [], relF: 0, pick: 0, avenge: [], saved: [], lad: 0, hurtK: 0, first: 0, lost: [], won: true, n: 0 };
    const s = { v: 1, stage: 'camp1', name: { zh: '阿明', en: 'Aming' }, alive, fate, bond, talked: {}, flags: {}, me: 'me', dd: { log: [B], seen: {}, rep: { valor: 3, care: 3, disc: 0, cruel: 0, coward: 3 }, nick: null, keep: [] } };
    localStorage.setItem('mingZhe', JSON.stringify(s)); localStorage.setItem('mingZheGo', 'camp1'); });
  await page.reload({ waitUntil: 'load', timeout: 90000 }); await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; }); await page.waitForTimeout(3000);
  const q = await page.evaluate(() => { document.getElementById('pause').hidden = true; const S = window.__ddSc(); S.wait = 0.5; return S.q.map(s => s.id + ':' + s.who); });
  await page.waitForTimeout(2500); await page.screenshot({ path: out + '/sc_walk.png', timeout: 90000 });
  await page.waitForTimeout(6000);
  const d1 = await page.evaluate(() => { const d = document.getElementById('zheDlg'); return d && !d.hidden ? d.innerText.slice(0, 300) : null; });
  await page.screenshot({ path: out + '/sc_court.png', timeout: 90000 });
  await page.keyboard.press('Digit1'); await page.waitForTimeout(3200);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(800); }
  await page.screenshot({ path: out + '/sc_beat.png', timeout: 90000 });
  for (let i = 0; i < 16; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(800); }
  await page.waitForTimeout(1500);
  const d2 = await page.evaluate(() => { const d = document.getElementById('zheDlg'); return d && !d.hidden ? d.innerText.slice(0, 300) : null; });
  await page.screenshot({ path: out + '/sc_after.png', timeout: 90000 });
  await page.keyboard.press('KeyE'); await page.waitForTimeout(500);
  await page.evaluate(() => { const S = window.__ddSc(); S.wait = 0.5; });
  await page.waitForTimeout(9000);
  const d3 = await page.evaluate(() => { const d = document.getElementById('zheDlg'); return d && !d.hidden ? d.innerText.slice(0, 300) : null; });
  await page.screenshot({ path: out + '/sc_thanks.png', timeout: 90000 });
  await page.keyboard.press('Digit1'); await page.waitForTimeout(500); await page.keyboard.press('KeyE');
  const sv = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('mingZhe')); return { beat: s.dd.beat, keep: s.dd.keep, bond: s.bond.lou, flags: s.dd.flags }; });
  console.log(JSON.stringify({ q, d1, d2, d3, sv }), 'errors', errors);
  await browser.close();
})();
