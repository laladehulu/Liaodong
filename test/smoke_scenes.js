// Every non-battle scene of a story campaign (zhe, jin, sj, dj), entered through the debug jump: page errors per scene. Needs a server on :8766. Usage: node test/smoke_scenes.js zhe [scene-regex]
const { chromium } = require('playwright');
(async () => { const c = process.argv[2]; const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p0 = await b.newPage(); await p0.goto('http://127.0.0.1:8766/dist/test.html'); await p0.waitForTimeout(3000);
  const flows = await p0.evaluate((c) => window.__dbg.dbgFlows()[c].map((e, i) => [i, e[0], e[1], e[2] || null]), c); await p0.close();
  const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
  for (const [i, sc, label, mis] of flows) { if (mis || (only && !only.test(sc))) continue;
    const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { Element.prototype.requestPointerLock = function () {}; });
    await p.goto('http://127.0.0.1:8766/dist/test.html', { waitUntil: 'commit' }); await p.waitForTimeout(2500);
    await p.evaluate(([c, i]) => { const e = window.__dbg.dbgFlows()[c][i]; window.__dbg.dbgJump(c, e); }, [c, i]).catch(() => {});
    await p.waitForTimeout(9000);
    const st = await Promise.race([p.evaluate(() => { const s = window.__boshin && window.__boshin.state; return s ? (s.sim ? 'scene ' + (s.sim.cfg.mission || s.sim.battle) : document.getElementById('menu').hidden ? 'cards' : 'menu') : 'loading'; }), new Promise(r => setTimeout(() => r('hung'), 6000))]);
    console.log(c, sc.padEnd(8), label.slice(0, 40).padEnd(40), st, errs.length ? 'ERR ' + errs.slice(0, 2).join(' | ') : ''); await p.close().catch(() => {}); }
  await b.close(); process.exit(0); })();
