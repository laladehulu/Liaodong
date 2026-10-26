const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const errors = []; const shot = async (page, n) => { try { await page.screenshot({ path: path.resolve(__dirname, 'v3_' + n + '.png'), timeout: 60000 }); } catch (e) { console.log('fail', n); } };
  for (const [scen, team] of [['ningyuan', 1], ['liaoyang', 0]]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 650 } });
    page.on('pageerror', e => errors.push(scen + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load' }); await page.waitForTimeout(300);
    await page.evaluate((a) => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const s = window.__boshin.state; s.scen = a[0]; s.faction = a[1]; }, [scen, team]);
    await page.click('#modeSeg button[data-m="heroes"]'); await page.waitForTimeout(200); if (scen === 'ningyuan') await shot(page, 'menu');
    await page.click('#btnSolo'); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; d.Input.locked = true; document.getElementById('pause').hidden = true; d.stepN(30 * 50); return { hm: sim.heroMode, phase: sim.hphase, gate: sim.gate.hp, players: sim.players.map(p => p.name + (p.aiChamp ? '*' : '')).join(','), champ: sim.units[sim.players[0].heroId].def.name }; });
    console.log(scen, r);
    for (const k of ['KeyZ', 'KeyV']) { await page.keyboard.press(k); await page.waitForTimeout(250); }
    await page.evaluate(() => { document.getElementById('pause').hidden = true; });
    await page.waitForTimeout(300); await shot(page, scen + '_fp');
    await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; for (let i = 0; i < 30 * 240 && sim.hphase < 2 && sim.winner < 0; i++) d.stepN(1); return sim.hphase; });
    await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; d.Input.cmdMode = true; const r = d.state.renderer; const g = sim.scen.gate; r.cmdCam.x = g[0]; r.cmdCam.z = g[1] - 8; r.cmdCam.h = 30; r.cmdCam.yaw = 0; document.getElementById('pause').hidden = true; });
    await page.waitForTimeout(800); await shot(page, scen + '_siege');
    console.log(scen, await page.evaluate(() => { const sim = window.__boshin.state.sim; return { phase: sim.hphase, gate: Math.round(sim.gate.hp), tick: sim.tick, hint: document.getElementById('hint').textContent, abil: document.getElementById('abil').innerText.replace(/\s+/g, ' ').slice(0, 120) }; }));
    await page.close();
  }
  console.log('errors', errors); await browser.close();
})();
