// Open-world things and people in every place under many states (army, office, shop, the Jin), in the browser: no NaN, no throw.
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/dist/test.html'); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const W = window.__world, out = []; const base = W.wFresh();
    const variants = [{}, { army: { r: 0, col: 'liu', unit: 'x' } }, { army: { r: 0, col: 'pass', unit: 'x' } }, { army: { r: 0, col: 'xu', unit: 'x' } }, { army: { r: 0, col: 'jin', unit: 'x' } }, { office: { zh: '知縣', en: 'm', rank: 43, lad: 'county' } }, { office: { zh: '翰林院編修', en: 'h', rank: 45, lad: 'hanlin' } }, { shop: { place: 'liaoyang' } }, { jin: 1, day: 1300 }, { day: 1500 }];
    for (const v of variants) for (const k in W.WPL) { W.WS = Object.assign({}, base, v, { place: k }); try { const T = W.wThings(W.WPL[k]); for (const t of T) if (!isFinite(t.x) || !isFinite(t.z)) out.push(`${k} ${JSON.stringify(v)}: thing ${t.k} at NaN`); const pe = W.wPeopleHere(); for (const e of pe) if (!isFinite(e.x) || !isFinite(e.z)) out.push(`${k}: person ${e.p.k} NaN`); } catch (e) { out.push(`${k} ${JSON.stringify(v).slice(0, 40)}: ${e.message}`); } }
    return out; });
  console.log([...new Set(r)].join('\n') || 'clean', errs); await b.close(); })();
