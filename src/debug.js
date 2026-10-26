// ===================== debug / testing mode + game speed =====================
// Off by default. Turn on with ?debug=1 in the URL, or F10 on the main menu (it is remembered until turned off).
// The panel (F10) lists every story campaign's flow — cards, camps, road scenes, battles and every phase of every
// battle — and jumps straight there, keeping the campaign's save (names, the living and the dead, bonds, flags, deeds):
// only the stage needed to land there is changed. Save tools: view/edit/import/export the JSON, toggle who lives,
// three snapshot slots per campaign. In battle: ] skips to the next phase, \ toggles invulnerability (both travel in
// the input stream as commands, so they are deterministic; solo only). Game speed (= and -, or the panel) works in
// any solo game, debug or not: more fixed-length sim ticks per frame, so the battle itself is unchanged.
const DBG = { on: false, panel: null, tag: null, hud: null, spd: null, typed: '' };
const DBG_KEYS = { zhe: 'mingZhe', jin: 'mingJin', sj: 'mingShenji' };
const DBG_NAMES = { zhe: '浙兵 · The Zhejiang Company', jin: '八旗 · The Plain White Niru', sj: '神機營 · The Divine Engine Division' };
const SPEEDS = [0.5, 1, 2, 4, 8];
function dbgLS(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
function dbgLoad(c) { try { return JSON.parse(dbgLS(DBG_KEYS[c]) || 'null'); } catch (e) { return null; } }
function dbgStore(c, s) { dbgLS(DBG_KEYS[c], JSON.stringify(s)); }
function dbgFresh(c) {
  try { if (c === 'zhe' && typeof zFresh === 'function') return zFresh(); if (c === 'jin' && typeof jFresh === 'function') return jFresh(); if (c === 'sj' && typeof sjFresh === 'function') return sjFresh(); } catch (e) { }
  return { v: 1, stage: '', name: { zh: '阿明', en: 'Aming' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {} };
}
// every campaign's flow, in the order a player meets it; m = the battle's mission (its phases are listed)
function dbgFlows() {
  const F = {};
  F.zhe = [['roadA', 'Road · the march out', 'roadA'], ['camp0', 'Camp · the night before Abdali'], ['battle1', 'Battle · Abdali Pass, 1619', 'abudali'], ['camp1', 'Camp · after Abdali (night)'],
    ['kai', 'Cards · Tieling, summer 1619'], ['battlek', 'Battle · the Kaiyuan road', 'kaiyuan'], ['ch2', 'Cards · Chapter 2'], ['roadB', 'Road · toward the Hun', 'roadB'], ['camp2', 'Camp · before the Hun River'],
    ['battle2', 'Battle · the Hun River, 1621', 'hunz'], ['camp3', 'Camp · after the Hun River'], ['roadC', 'Road · the Liaoyang road', 'roadC']];
  F.jin = []; if (typeof JCH !== 'undefined') for (const n of Object.keys(JCH).map(Number).sort((a, b) => a - b)) { const C = JCH[n];
    F.jin.push(['c' + n, `Ch ${n} · intro cards`, null, 'intro'], ['c' + n, `Ch ${n} · camp`], ['b' + n, `Ch ${n} · battle (${C.mission})`, C.mission]); }
  F.sj = [['drill', 'Prologue · the drill ground', 'sjdrill'], ['camp0', 'Camp · outside Shunyi'], ['battle1', 'Battle · Shunyi, 1629', 'sj1'], ['amb', 'Cards · forage'], ['battleA', 'Battle · the village ambush', 'sjamb'],
    ['ch2', 'Cards · the capital'], ['camp1', 'Camp · under the Guangqu Gate'], ['battle2', 'Battle · the Guangqu Gate', 'sj2'], ['ch3', 'Cards · Chapter 3'], ['camp2', 'Camp · Changshan'], ['battle3', 'Battle · Changshan, 1631', 'sj3'], ['end', 'Epilogue']];
  if (typeof SJBAT !== 'undefined') F.sj = F.sj.filter(e => !/^battle/.test(e[0]) && e[0] !== 'drill' || SJBAT[e[0]]);
  if (typeof ZROAD !== 'undefined') F.zhe = F.zhe.filter(e => !/^road/.test(e[0]) || ZROAD[e[0].slice(4)]);
  return F;
}
function dbgPhases(m) { const M = SIM.MISSIONS && SIM.MISSIONS[m]; return M && M.phases ? M.phases.map(P => P.title) : []; }
// jump: keep the save, set only the stage needed to land on this scene, then reload into it
function dbgJump(c, e, ph) {
  let s = dbgLoad(c); if (!s) s = dbgFresh(c); s.flags = s.flags || {};
  const [scene, , , kind] = e;
  if (c === 'zhe') { if (/^road/.test(scene)) { const D = ZROAD[scene.slice(4)]; s.flags['pre' + scene.slice(4)] = 1; s.stage = D ? D.next : s.stage; } else s.stage = scene; }
  else if (c === 'jin') { s.stage = scene; s.seen = s.seen || {}; if (kind === 'intro') delete s.seen['i' + scene.slice(1)]; }
  else s.stage = scene;
  dbgStore(c, s); dbgLS('mingDebugGo', JSON.stringify({ c, s: scene, ph: ph | 0, m: e[2] || null })); location.reload();
}
function dbgBoot() {
  let go = null; try { go = JSON.parse(dbgLS('mingDebugGo') || 'null'); } catch (e) { } dbgLS('mingDebugGo', null); if (!go) return;
  setTimeout(() => {
    AUDIO.init();
    if (go.c === 'zhe') { if (/^road/.test(go.s) && typeof zStartR === 'function') zStartR(go.s); else zStart(go.s); }
    else if (go.c === 'jin') jStart(go.s); else if (go.c === 'sj') sjStart(go.s);
    if (go.ph > 0 && go.m) { let n = 0; const iv = setInterval(() => { const sim = state.sim; if (++n > 150) return clearInterval(iv);
      if (sim && sim.cfg.mission === go.m && sim.tick > 3) { clearInterval(iv); dbgCmd(0, go.ph); toast('Debug: jumped to phase ' + (go.ph + 1)); } }, 200); }
  }, 140);
}
function dbgCmd(sub, val) { Input.cmds.push([0, 31, sub, val | 0]); }
function dbgSolo() { return !!(state.sim && !state.net && state.sim.players.filter(p => !p.ai).length === 1); }
// ---------------- the panel ----------------
function dbgCSS() {
  if ($('dbgCss')) return; const st = document.createElement('style'); st.id = 'dbgCss';
  st.textContent = `#dbgTag { position: fixed; left: 50%; top: 4px; transform: translateX(-50%); z-index: 60; font: 700 10px/1 sans-serif; letter-spacing: .12em; color: #ffd27a; background: #3a1410e0; border: 1px solid #c0503a; border-radius: 3px; padding: 3px 7px; pointer-events: none; }
#dbgSpd { position: fixed; right: 14px; top: 46%; z-index: 60; font: 700 15px/1 sans-serif; color: #f2e6c8; background: #1d1814cc; border: 1px solid #6a5a44; border-radius: 4px; padding: 4px 9px; pointer-events: none; }
#dbgHud { position: fixed; left: 50%; top: 22px; transform: translateX(-50%); z-index: 60; font: 11px/1.35 ui-monospace, monospace; color: #e8dcc0; background: #14100ccc; border: 1px solid #5a4a34; border-radius: 3px; padding: 3px 8px; pointer-events: none; white-space: nowrap; }
#dbgPanel { position: fixed; right: 0; top: 0; bottom: 0; width: min(460px, 100vw); z-index: 70; overflow-y: auto; background: #15110dF2; color: #e8dcc0; font: 13px/1.4 system-ui, sans-serif; border-left: 1px solid #6a5a44; padding: 12px 14px 40px; box-sizing: border-box; }
#dbgPanel h3 { margin: 14px 0 6px; font-size: 14px; color: #f0d38a; } #dbgPanel h4 { margin: 10px 0 4px; font-size: 12px; color: #c8b890; font-weight: 600; }
#dbgPanel button { font: 12px system-ui, sans-serif; background: #2a2219; color: #f2e6c8; border: 1px solid #6a5a44; border-radius: 3px; padding: 3px 7px; margin: 2px 3px 2px 0; cursor: pointer; }
#dbgPanel button:hover { background: #4a3a26; } #dbgPanel button.on { background: #6a4a1e; border-color: #d2a94c; }
#dbgPanel .row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 3px 0; } #dbgPanel .row > span.l { flex: 1 1 100%; color: #d8ccb0; }
#dbgPanel textarea { width: 100%; height: 150px; box-sizing: border-box; background: #0c0a08; color: #cfe; border: 1px solid #4a3a26; font: 11px/1.3 ui-monospace, monospace; }
#dbgPanel .small { color: #9a9183; font-size: 11px; } #dbgPanel .tabs button { font-weight: 600; }`;
  document.head.appendChild(st);
}
function dbgEnable(on) { DBG.on = !!on; dbgLS('mingDebug', on ? '1' : null); dbgTag(); if (!on && DBG.panel) dbgPanel(false); }
function dbgTag() { dbgCSS(); if (!DBG.tag) { DBG.tag = document.createElement('div'); DBG.tag.id = 'dbgTag'; DBG.tag.textContent = 'DEBUG · F10'; document.body.appendChild(DBG.tag); } DBG.tag.hidden = !DBG.on; }
function dbgPanel(open) {
  dbgCSS(); if (open === undefined) open = !DBG.panel;
  if (!open) { if (DBG.panel) DBG.panel.remove(); DBG.panel = null; return; }
  if (document.pointerLockElement) document.exitPointerLock();
  const P = DBG.panel || document.createElement('div'); P.id = 'dbgPanel'; DBG.panel = P; if (!P.parentNode) document.body.appendChild(P);
  DBG.tab = DBG.tab || 'zhe'; dbgRender();
}
function dbgRender() {
  const P = DBG.panel; if (!P) return; const c = DBG.tab, F = dbgFlows(), s = dbgLoad(c);
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  let h = `<div class="row"><b style="flex:1;color:#ffd27a">Debug / testing</b><button data-a="close">Close · F10</button></div>`;
  h += `<div class="row"><span class="small" style="flex:1">Speed (= / −, any solo game)</span>${SPEEDS.map(v => `<button data-a="spd" data-v="${v}" class="${(state.speed || 1) === v ? 'on' : ''}">${v}×</button>`).join('')}</div>`;
  if (state.screen === 'game' && state.sim && state.sim.mission && !state.sim.mission.camp) { const M = state.sim.mission, me = state.sim.players[state.localIdx];
    h += `<h3>This battle</h3><div class="row">${(M.phases || []).map((P0, i) => `<button data-a="ph" data-v="${i}" class="${state.sim.mv.ph === i ? 'on' : ''}">${i + 1}. ${esc(P0.title.split(' · ').slice(-1)[0])}</button>`).join('')}</div>
      <div class="row"><button data-a="god" class="${me && me.god ? 'on' : ''}">Invulnerable (\\)</button><span class="small">] next phase · phases only go forward</span></div>`; }
  h += `<div class="row tabs" style="margin-top:12px">${Object.keys(DBG_KEYS).map(k => `<button data-a="tab" data-v="${k}" class="${k === c ? 'on' : ''}">${DBG_NAMES[k].split(' · ')[0]}</button>`).join('')}</div>`;
  h += `<h3>${esc(DBG_NAMES[c])}</h3><div class="small">Save: ${s ? `stage <b>${esc(s.stage || '—')}</b>, ${s.alive ? Object.values(s.alive).filter(v => v !== false).length + ' alive' : ''}` : 'none yet (a default one is made when you jump)'}</div>`;
  (F[c] || []).forEach((e, i) => { const ph = e[2] ? dbgPhases(e[2]) : [];
    h += `<div class="row"><span class="l">${esc(e[1])}</span><button data-a="go" data-v="${i}">Go</button>${ph.slice(1).map((t, j) => `<button data-a="go" data-v="${i}" data-p="${j + 1}" title="${esc(t)}">ph ${j + 2}</button>`).join('')}</div>`; });
  h += `<h3>Save</h3>`;
  if (s && s.alive) h += `<h4>Who lives (click to toggle)</h4><div class="row">${Object.keys(s.alive).map(k => `<button data-a="alive" data-v="${esc(k)}" class="${s.alive[k] !== false ? 'on' : ''}">${esc(k)}</button>`).join('')}</div>`;
  if (s && s.flags) h += `<h4>Flags (click to toggle)</h4><div class="row">${Object.keys(s.flags).map(k => `<button data-a="flag" data-v="${esc(k)}" class="${s.flags[k] ? 'on' : ''}">${esc(k)}</button>`).join('') || '<span class="small">none</span>'}<button data-a="addflag">+ flag</button></div>`;
  h += `<h4>Slots</h4><div class="row">${[1, 2, 3].map(n => { const has = !!dbgLS(`mingDbgSlot:${c}:${n}`); return `<button data-a="slotS" data-v="${n}">Save → ${n}</button><button data-a="slotL" data-v="${n}" ${has ? '' : 'disabled'}>Load ${n}</button>`; }).join('')}</div>`;
  h += `<h4>JSON</h4><textarea id="dbgJson" spellcheck="false">${esc(s ? JSON.stringify(s) : '')}</textarea>
    <div class="row"><button data-a="apply">Apply JSON</button><button data-a="copy">Copy</button><button data-a="fresh">New save</button><button data-a="wipe">Delete save</button></div>`;
  h += `<h3 style="margin-top:18px">Debug mode</h3><div class="row"><button data-a="off">Turn debug off</button><span class="small">or open the page with ?debug=0</span></div>`;
  P.innerHTML = h;
}
function dbgClick(ev) {
  const b = ev.target.closest('#dbgPanel button'); if (!b) return; const a = b.dataset.a, v = b.dataset.v, c = DBG.tab; ev.stopPropagation();
  const s = dbgLoad(c);
  if (a === 'close') return dbgPanel(false);
  if (a === 'spd') { dbgSpeed(+v); }
  else if (a === 'tab') DBG.tab = v;
  else if (a === 'go') { const e = dbgFlows()[c][+v]; return dbgJump(c, e, +(b.dataset.p || 0)); }
  else if (a === 'ph') { if (dbgSolo()) dbgCmd(0, +v); else toast('Phase jumps are solo only'); }
  else if (a === 'god') { const me = state.sim && state.sim.players[state.localIdx]; if (dbgSolo()) dbgCmd(1, me && me.god ? 0 : 1); }
  else if (a === 'alive' && s) { s.alive[v] = s.alive[v] === false; if (s.fate) s.fate[v] = s.alive[v] ? 'out' : 'dead'; dbgStore(c, s); }
  else if (a === 'flag' && s) { s.flags[v] = s.flags[v] ? 0 : 1; dbgStore(c, s); }
  else if (a === 'addflag' && s) { const k = prompt('Flag name'); if (k) { s.flags[k] = 1; dbgStore(c, s); } }
  else if (a === 'slotS') { const raw = dbgLS(DBG_KEYS[c]); if (raw) { dbgLS(`mingDbgSlot:${c}:${v}`, raw); toast('Saved to slot ' + v); } }
  else if (a === 'slotL') { const raw = dbgLS(`mingDbgSlot:${c}:${v}`); if (raw) { dbgLS(DBG_KEYS[c], raw); toast('Loaded slot ' + v); } }
  else if (a === 'apply') { try { const j = JSON.parse($('dbgJson').value); dbgStore(c, j); toast('Save replaced'); } catch (e) { toast('Not valid JSON: ' + e.message); } }
  else if (a === 'copy') { const t = $('dbgJson'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('Copied'); }
  else if (a === 'fresh') { dbgStore(c, dbgFresh(c)); }
  else if (a === 'wipe') { if (confirm('Delete this campaign\'s save?')) dbgLS(DBG_KEYS[c], null); }
  else if (a === 'off') { dbgEnable(false); return; }
  setTimeout(dbgRender, 60);
}
// ---------------- speed ----------------
function dbgSpeed(v) { state.speed = v; if (!DBG.spd) { DBG.spd = document.createElement('div'); DBG.spd.id = 'dbgSpd'; document.body.appendChild(DBG.spd); } dbgCSS(); dbgSpdShow(); }
function dbgSpdShow() { if (!DBG.spd) return; const v = state.speed || 1, show = v !== 1 && state.screen === 'game' && !state.net; DBG.spd.hidden = !show; DBG.spd.textContent = v < 1 ? '▶ ½×' : '▶▶ ' + v + '×'; }
function dbgSpeedStep(d) { const v = state.speed || 1, i = Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(v) + d)); dbgSpeed(SPEEDS[i]); toast('Game speed ' + SPEEDS[i] + '×'); }
// ---------------- keys and the in-battle readout ----------------
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (state.screen !== 'game') { // the menu: F10, or typing "debug", switches debug mode on and opens the panel
    if (e.code === 'F10') { e.preventDefault(); if (!DBG.on) dbgEnable(true); dbgPanel(); return; }
    if (e.key && e.key.length === 1) { DBG.typed = (DBG.typed + e.key.toLowerCase()).slice(-5); if (DBG.typed === 'debug') { dbgEnable(true); dbgPanel(true); } } return; }
  if (e.code === 'Equal' || e.code === 'NumpadAdd') { if (!state.net) { e.preventDefault(); dbgSpeedStep(1); } return; }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') { if (!state.net) { e.preventDefault(); dbgSpeedStep(-1); } return; }
  if (!DBG.on) return;
  if (e.code === 'F10') { e.preventDefault(); e.stopPropagation(); dbgPanel(); return; }
  if (e.code === 'BracketRight' && dbgSolo() && state.sim.mission) { e.preventDefault(); dbgCmd(0, state.sim.mv.ph + 1); toast('Debug: next phase'); return; }
  if (e.code === 'Backslash' && dbgSolo()) { e.preventDefault(); const me = state.sim.players[state.localIdx]; dbgCmd(1, me.god ? 0 : 1); toast(me.god ? 'Invulnerable off' : 'Invulnerable on'); }
}, true);
document.addEventListener('click', dbgClick, true);
setInterval(() => {
  dbgSpdShow();
  if (!DBG.on) { if (DBG.hud) DBG.hud.hidden = true; return; }
  if (!DBG.hud) { dbgCSS(); DBG.hud = document.createElement('div'); DBG.hud.id = 'dbgHud'; document.body.appendChild(DBG.hud); }
  const sim = state.sim, M = sim && sim.mission; if (state.screen !== 'game' || !M || M.camp) { DBG.hud.hidden = true; return; }
  const P = M.phases[Math.max(0, sim.mv.ph)], el = (sim.tick - sim.mv.t0) / 30, me = sim.players[state.localIdx];
  let r = ''; try { r = sim.mObj(P.obj, el); } catch (e) { }
  DBG.hud.hidden = false; DBG.hud.textContent = `${M.title.split(' · ')[0]} · phase ${sim.mv.ph + 1}/${M.phases.length} · ${Math.floor(el)} s${P.obj && P.obj.survive ? '/' + P.obj.survive : ''}${P.limit ? ' (limit ' + P.limit + ')' : ''} · obj ${r === 1 ? 'met' : r === -1 ? 'FAILED' : 'open'}${me && me.god ? ' · INVULNERABLE' : ''}${(state.speed || 1) !== 1 ? ' · ' + state.speed + '×' : ''}`;
}, 250);
{ const q = new URLSearchParams(location.search).get('debug'); if (q === '1') dbgEnable(true); else if (q === '0') dbgEnable(false); else if (dbgLS('mingDebug') === '1') dbgEnable(true); }
dbgBoot();
