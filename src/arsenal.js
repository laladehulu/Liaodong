// ===================== the arsenal: weapons you carried off the field =====================
// In the story campaigns a weapon you pick up and still carry when the battle ends goes into your arsenal (kept in the
// campaign's save). In camp, I opens it: choose up to three to carry into the next battle, whatever your place in the
// team; the sim gives them to you when the battle starts (cfg.players[].kit), so it is the same on every machine.
function arsWhich() {
  const sim = state.sim, M = sim && sim.mission, key = (sim && sim.cfg && sim.cfg.mission) || '';
  if (/^jin/.test(key) || (M && M.camp && sim.cfg.camp && (sim.cfg.camp.team | 0) === 1)) return 'jin';
  if (/^sj/.test(key) || (typeof ZKEY !== 'undefined' && ZKEY === 'mingShenji')) return 'sj';
  return 'zhe';
}
function arsSave(which) {
  which = which || arsWhich();
  if (which === 'jin') { if (typeof JS === 'undefined' || !JS) return null; return { s: JS, put: () => { if (typeof jSave === 'function') jSave(); } }; }
  if (typeof ZS === 'undefined' || !ZS) return null; return { s: ZS, put: () => { if (typeof zSave === 'function') zSave(); } };
}
// the battle ends: whatever extra weapons the man you play still has go into the arsenal
function arsRecord() {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.soldier) return; const A = arsSave(); if (!A) return;
  const me = sim.players[state.localIdx], h = me && sim.units[me.heroId]; if (!h || h.dead || !h.kit) return;
  const got = h.kit.filter(sl => !sl.o).map(sl => sl.k); if (h.kitSh) got.push(h.team === 1 ? 'jshield' : 'shield');
  if (!got.length) return; const ars = A.s.arsenal || (A.s.arsenal = []);
  const fresh = []; for (const k of got) if (ars.indexOf(k) < 0 && ars.length < 16) { ars.push(k); fresh.push(k); }
  A.put(); if (fresh.length && typeof toast === 'function') toast('Into your arsenal: ' + fresh.map(k => (S.WPN[k] || {}).n || k).join(', '));
}
// the battle starts: the loadout you chose rides in the battle config
function arsKitFor(missionKey) {
  const which = /^jin/.test(missionKey) ? 'jin' : /^sj/.test(missionKey) ? 'sj' : 'zhe'; const A = arsSave(which); if (!A) return null;
  const ars = A.s.arsenal || [], lo = (A.s.loadout || []).filter(k => ars.indexOf(k) >= 0 && S.WPN[k]); return lo.length ? lo.slice(0, 4) : null;
}
// in camp: the weapon rack
function arsPanel(show) {
  let el = document.getElementById('arsPanel'); if (show === false) { if (el) el.hidden = true; return; }
  const A = arsSave(); if (!A) return; const ars = A.s.arsenal || [], lo = A.s.loadout || (A.s.loadout = []);
  if (!el) { el = document.createElement('div'); el.id = 'arsPanel'; document.body.appendChild(el);
    const st = document.createElement('style'); st.textContent = '#arsPanel{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:60;min-width:300px;max-width:440px;background:rgba(18,14,10,.92);border:1px solid #6a5a44;color:#e8dcc0;font:13px/1.45 "IBM Plex Sans",sans-serif;padding:12px 16px;border-radius:3px}#arsPanel h3{margin:0 0 4px;font:600 16px "Shippori Mincho",serif;color:#d2a94c}#arsPanel small{color:#a39880}#arsPanel .w{display:flex;align-items:center;gap:8px;padding:4px 6px;margin:3px 0;border:1px solid rgba(255,255,255,.12);cursor:pointer}#arsPanel .w.on{border-color:#d2a94c;background:rgba(210,169,76,.16)}#arsPanel .w kbd{min-width:14px}#arsPanel .x{margin-top:8px;text-align:right}';
    document.head.appendChild(st);
    el.addEventListener('click', (e) => { const w = e.target.closest('.w'); if (w) { arsToggle(w.dataset.k); return; } if (e.target.closest('.x')) arsPanel(false); }); }
  el.hidden = false;
  el.innerHTML = '<h3>兵器 · Your arsenal</h3><small>Weapons you carried off the field. Choose up to 3 to take into the next battle (1–9 to toggle, I or Esc to close).</small>' +
    (ars.length ? ars.map((k, i) => `<div class="w${lo.indexOf(k) >= 0 ? ' on' : ''}" data-k="${k}"><kbd>${i + 1}</kbd>${(S.WPN[k] || {}).n || k}${lo.indexOf(k) >= 0 ? ' · <small>carried</small>' : ''}</div>`).join('') : '<p><small>Nothing yet. Pick up weapons in battle (E) and keep them to the end.</small></p>') +
    '<div class="x"><kbd>I</kbd> close</div>';
}
function arsToggle(k) {
  const A = arsSave(); if (!A) return; const lo = A.s.loadout || (A.s.loadout = []); const i = lo.indexOf(k);
  if (i >= 0) lo.splice(i, 1); else { const shields = lo.filter(x => (S.WPN[x] || {}).sh).length, arms = lo.length - shields; if ((S.WPN[k] || {}).sh ? shields >= 1 : arms >= 3) return; lo.push(k); }
  A.put(); arsPanel(true);
}
function arsOpen() { const el = document.getElementById('arsPanel'); return !!(el && !el.hidden); }
function arsInCamp() { const sim = state.sim; return !!(state.screen === 'game' && sim && sim.mission && sim.mission.camp); }
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'KeyI' && arsInCamp()) { e.preventDefault(); e.stopImmediatePropagation(); arsOpen() ? arsPanel(false) : arsPanel(true); return; }
  if (!arsOpen()) return;
  if (e.code === 'Escape') { arsPanel(false); e.stopImmediatePropagation(); return; }
  const m = /^Digit([1-9])$/.exec(e.code); if (m) { const A = arsSave(), ars = (A && A.s.arsenal) || []; const k = ars[+m[1] - 1]; if (k) arsToggle(k); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
// a quiet hint in camp so the rack can be found
function arsHint() {
  let el = document.getElementById('arsHint'); const show = arsInCamp() && !arsOpen() && !state.zheDlg;
  if (!el) { if (!show) return; el = document.createElement('div'); el.id = 'arsHint'; el.style.cssText = 'position:fixed;right:14px;bottom:12px;z-index:30;font:12px "IBM Plex Sans",sans-serif;color:#cfc6b4;background:rgba(20,16,12,.6);border:1px solid #5a4a36;padding:3px 8px;border-radius:2px;pointer-events:none'; document.body.appendChild(el); }
  el.hidden = !show; if (show) { const A = arsSave(), n = (A && A.s.arsenal || []).length; el.innerHTML = `<kbd>I</kbd> your arsenal${n ? ' · ' + n : ''}`; }
}
setInterval(arsHint, 500);
