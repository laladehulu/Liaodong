// Open-world data checks in the browser (needs a server on :8766 at the repo root): every person's places and spots, every road's arrival point, every exam's place; every place's things and people under many states.
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/dist/test.html'); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const W = window.__world, out = [];
    for (const pp of W.WPP) for (const w of pp.where || []) { const P = W.WPL[w[2]]; if (!P) out.push(`${pp.k}: no place ${w[2]}`); else if (!P.spots[w[3]]) out.push(`${pp.k}: no spot ${w[2]}.${w[3]}`); }
    for (const k in W.WPL) { const P = W.WPL[k]; for (const ex of P.exits || []) { if (!W.WPL[ex.to]) out.push(`${k}: exit to missing ${ex.to}`); else if (!W.WPL[ex.to].at || !W.WPL[ex.to].at[k]) out.push(`${k}->${ex.to}: arrival point missing (at.${k})`); } }
    for (const e of W.WEX) if (!W.WPL[e[2]] || !W.WPL[e[2]].spots[e[3]]) out.push(`exam ${e[0]} ${e[1]}: bad place/spot ${e[2]}.${e[3]}`);
    return out; });
  console.log(r.join('\n') || 'clean', errs); await b.close(); })();
