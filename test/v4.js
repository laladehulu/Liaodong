const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const errors = []; const shot = async (page, n) => { try { await page.screenshot({ path: path.resolve(__dirname, 'v4_' + n + '.png'), timeout: 60000 }); } catch (e) { console.log('fail', n); } };
  const page = await browser.newPage({ viewport: { width: 1200, height: 650 } });
  page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join('|')));
  await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'test.html'), { waitUntil: 'load' }); await page.waitForTimeout(300);
  await page.evaluate(() => { AUDIO.init = () => {}; Element.prototype.requestPointerLock = function () {}; const s = window.__boshin.state; s.scen = 'ningyuan'; s.faction = 0; });
  await page.click('#modeSeg button[data-m="heroes"]'); await page.click('#btnSolo'); await page.waitForTimeout(1200);
  // sky & dragon: look up toward the dragon
  await page.evaluate(() => { const d = window.__boshin; d.Input.locked = true; document.getElementById('pause').hidden = true; const r = d.state.renderer; const D = r.dragon; const p = D.head.getWorldPosition(new THREE.Vector3()); const h = d.state.sim.units[d.state.sim.players[0].heroId]; d.Input.yaw = Math.atan2(p.x - h.x, p.z - h.z); d.Input.pitch = Math.atan2(p.y - 2, Math.hypot(p.x - h.x, p.z - h.z)); });
  await page.waitForTimeout(900); await shot(page, 'dragon');
  // run the siege into phase II and look at the gate from outside
  const r = await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; for (let i = 0; i < 30 * 200 && sim.hphase < 1; i++) d.stepN(1); for (let i = 0; i < 30 * 40; i++) d.stepN(1);
    const h = sim.units[sim.players[0].heroId]; const g = sim.scen.gate; h.x = g[0] + 8; h.z = g[1] - 22; h.px = h.x; h.pz = h.z; h.y = SIM.terrainH(h.x, h.z); d.Input.yaw = Math.atan2(g[0] - h.x, g[1] - h.z); d.Input.pitch = 0.05; document.getElementById('pause').hidden = true;
    return { phase: sim.hphase, gate: Math.round(sim.gate.hp), ram: [Math.round(sim.ram.hp), Math.round(sim.ram.z)], ladders: sim.ladders.map(L => [L.up, Math.round(L.prog), L.hp]), tick: sim.tick }; });
  console.log(r); await page.waitForTimeout(900); await shot(page, 'siege');
  // musket raise: watch a Ming musketeer squad
  await page.evaluate(() => { const d = window.__boshin, sim = d.state.sim; const sq = sim.squads.find(q => q.team === 1 && q.def.ai === 'ranged' && q.alive) || sim.squads.find(q => q.def.ai === 'ranged' && q.alive); const u = sim.units[sq.unitIds.find(id => !sim.units[id].dead)]; const h = sim.units[sim.players[0].heroId]; h.x = u.x + Math.sin(u.yaw) * 3 + Math.cos(u.yaw) * 2.5; h.z = u.z + Math.cos(u.yaw) * 3 - Math.sin(u.yaw) * 2.5; h.px = h.x; h.pz = h.z; h.y = SIM.terrainH(h.x, h.z); d.Input.yaw = Math.atan2(u.x - h.x, u.z - h.z); d.Input.pitch = -0.08; document.getElementById('pause').hidden = true; });
  await page.waitForTimeout(700); await shot(page, 'musket');
  console.log('errors', errors); await browser.close();
})();
