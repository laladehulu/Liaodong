// ===== 闖營 · Last Stand: menu, HUD line, the boon cards and the score =====
// Spliced into main.js's scope (like mode_beacon.js): uses state, S, $, toast, banner, AUDIO, ROLE_INFO, Input, escapeHtml.
const STD = { sim: null, n: 0, sum: false, open: false, best: 0, lastLog: 0 };
(function standCss() {
  const st = document.createElement('style'); st.textContent = `
#standPanel .sdbrief { font: 14px/1.5 Georgia, serif; color: var(--ink); margin: 2px 0 10px; max-width: 640px; }
#standPanel .sdbest { font: 600 13px Georgia, serif; color: #8a5a1e; margin: 4px 0 10px; }
#standPanel .sdkeys { font-size: 12px; color: var(--ink2); margin-top: 8px; }
#status .sdw { font: 700 13px Georgia, serif; color: #f2cf6a; } #status .sdl { color: #e06a5a; letter-spacing: 1px; } #status .sdk { font: 600 12px Georgia, serif; color: #c9b9a0; }
#status.sdpress { border-color: #e04a3a; box-shadow: 0 0 14px rgba(224,74,58,.55); }
#sdboons { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 55; display: flex; gap: 14px; pointer-events: auto; }
#sdboons .bn { width: min(210px, 28vw); background: rgba(18,14,10,.92); border: 1px solid #8a6a3a; border-top: 3px solid #d2a94c; border-radius: 4px; color: #efe6d0; padding: 14px 14px 12px; cursor: pointer; text-align: left; font: 13px/1.4 Georgia, serif; box-shadow: 0 8px 30px rgba(0,0,0,.5); }
#sdboons .bn:hover { border-color: #f2cf6a; background: rgba(42,32,20,.95); transform: translateY(-2px); }
#sdboons .bn .ch { font: 700 34px/1 serif; color: #f2cf6a; display: block; margin-bottom: 8px; }
#sdboons .bn b { display: block; font-size: 15px; margin-bottom: 4px; } #sdboons .bn small { color: #c9b9a0; font-size: 12px; display: block; min-height: 3.2em; }
#sdboons .bn kbd { float: right; font: 700 12px monospace; background: #2a241c; border: 1px solid #6a5a44; border-radius: 3px; padding: 1px 6px; color: #f2cf6a; }
#sdhead { position: fixed; left: 50%; top: calc(50% - 150px); transform: translateX(-50%); z-index: 55; font: 700 16px Georgia, serif; color: #f2cf6a; text-shadow: 0 2px 6px #000; text-align: center; pointer-events: none; background: rgba(14,11,8,.82); border: 1px solid #6a5a44; border-radius: 4px; padding: 7px 16px; }
#sdhead small { display: block; font: 400 12px Georgia, serif; color: #d8ccb0; margin-top: 3px; }
`; document.head.appendChild(st);
})();
function standBestGet() { try { return +(localStorage.getItem('mingStandBest') || 0); } catch (e) { return 0; } }
function standBestSet(n) { try { localStorage.setItem('mingStandBest', String(n)); } catch (e) { } }
// ---- menu ----
function standMaps() { return [['field', '界凡 · Jiefan Hill', 'Open hill country above the Hun River.'], ['zroad', '道 · The road village', 'A winter cart road; houses to hide behind.'], ['hakodate', '寧遠 · The Ningyuan plain', 'Frozen flat ground by the sea: nowhere to hide.'],
  ['nagaoka', '揚州 · The paddies', 'Jiangnan rice fields in a thunderstorm: wet powder, short sight.'], ['djzhen', '鎮江 · Inside Zhenjiang', 'The camp inside a walled town: the raiders come through the gates.']]; }
function standMenu(on) {
  let el = $('standPanel');
  if (!el) { el = document.createElement('div'); el.id = 'standPanel'; el.hidden = true; $('personal').appendChild(el); }
  el.hidden = !on; if (!on) return;
  if (!ROLE_INFO.some(r => r[0] === state.role)) state.role = ROLE_INFO[0][0];
  const best = standBestGet();
  el.innerHTML = `<h3 class="sect">闖營 · Last Stand</h3>
    <p class="sdbrief">A palisade camp on the open field, and raiders from every side. Each raid is bigger and harder than the last, and every fifth brings a banner officer and his guard. When a raid breaks, choose one of three boons; the next comes on the moment you choose. Three lives. How long can you hold?</p>
    <div class="sdbest">${best ? `Your best: held ${best} raid${best === 1 ? '' : 's'}` : 'No stand made yet'}</div>
    <h3 class="sect">The field</h3><div class="chapters roles" id="sdmaps">${standMaps().map(m => `<button type="button" class="chap${m[0] === (state.standMap || 'field') ? ' on' : ''}" data-m="${m[0]}"><b>${m[1]}</b><small>${m[2]}</small></button>`).join('')}</div>
    <h3 class="sect">Your troops</h3><div class="chapters roles" id="sdroles">${ROLE_INFO.map(r => `<button type="button" class="chap${r[0] === state.role ? ' on' : ''}" data-r="${r[0]}"><b>${r[1]} · ${r[2]}</b><small>${r[3]}</small></button>`).join('')}</div>
    <p class="note sdkeys">Between raids pick a boon: <b>1 2 3</b> or click · F follow · C charge · H hold. Host a room to make the stand together (up to 4): the raids grow with you.</p>`;
  el.querySelectorAll('#sdroles button').forEach(b => b.onclick = () => { state.role = b.dataset.r; AUDIO.init(); AUDIO.play('ui'); standMenu(true); });
  el.querySelectorAll('#sdmaps button').forEach(b => b.onclick = () => { state.standMap = b.dataset.m; AUDIO.init(); AUDIO.play('ui'); standMenu(true); });
}
// ---- the golden line in the top bar ----
function standLeft(sim) { const T = sim.st; let n = 0; for (const gid of T.wave || []) { const g = sim.mg[gid]; if (!g || g.broken) continue; n += sim.standAlive(gid); } return n; }
function standGoal() {
  const sim = state.sim, T = sim.st; if (!T) return `<span class="goal">Hold the camp</span>`;
  const L = T.lives[state.localIdx], me = sim.players[state.localIdx];
  const hearts = me && me.stOut ? 'out' : '♥'.repeat(Math.max(0, L | 0));
  const g = T.stage === 'pick' ? (T.picked[state.localIdx] === undefined ? 'Raid broken! Choose a boon (1 2 3)' : 'Waiting for the others to choose') : (T.press > 30 ? 'Drive them out of the camp!' : `${standLeft(sim)} raiders left`);
  $('status').classList.toggle('sdpress', T.press > 30);
  return `<span class="sdw">第${T.n}陣 · Raid ${T.n}</span><span class="sdl" title="Lives">${hearts}</span><span class="sdk">${T.kills} slain</span><span class="goal">${escapeHtml(g)}</span>`;
}
// ---- the boon cards ----
function standCards(show) {
  let el = $('sdboons'), hd = $('sdhead');
  if (!show) { if (el) el.remove(); if (hd) hd.remove(); STD.open = false; return; }
  const sim = state.sim, T = sim.st, off = T.offer[state.localIdx]; if (!off) return;
  if (!el) { el = document.createElement('div'); el.id = 'sdboons'; document.body.appendChild(el); hd = document.createElement('div'); hd.id = 'sdhead'; document.body.appendChild(hd); }
  if (STD.open === T.n) return; STD.open = T.n;
  if (document.pointerLockElement) document.exitPointerLock();
  hd.innerHTML = `第${T.n}陣 破 · Raid ${T.n} broken<small>Choose a boon. The next raid comes on as soon as you do.</small>`;
  el.innerHTML = off.map((b, i) => { const B = S.STAND.BOONS[b]; return `<button type="button" class="bn" data-i="${i}"><kbd>${i + 1}</kbd><span class="ch">${B[1]}</span><b>${escapeHtml(B[2])}</b><small>${escapeHtml(B[3])}</small></button>`; }).join('');
  el.querySelectorAll('.bn').forEach(b => b.onclick = (e) => { e.stopPropagation(); standChoose(+b.dataset.i); });
}
function standChoose(i) { const sim = state.sim; if (!sim || !sim.st || sim.st.stage !== 'pick') return; Input.cmds.push([0, S.STAND.ORD_PICK, i, 0, 0, 0]); AUDIO.play('ui'); STD.chose = sim.st.n; standCards(false); }
window.addEventListener('keydown', (e) => {
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.stand || state.screen !== 'game' || state.ended || !sim.st) return;
  if (sim.st.stage !== 'pick' || sim.st.picked[state.localIdx] !== undefined || STD.chose === sim.st.n) return;
  const m = /^Digit([1-3])$/.exec(e.code); if (!m) return; standChoose(+m[1] - 1); e.preventDefault(); e.stopImmediatePropagation();
}, true);
// ---- per frame: banners, the cards, the score at the end ----
function standFrame() {
  requestAnimationFrame(standFrame);
  const sim = state.sim; if (!sim || !sim.mission || !sim.mission.stand) { if ($('sdboons')) standCards(false); return; }
  if (STD.sim !== sim) { STD.sim = sim; STD.n = 0; STD.sum = false; STD.open = false; STD.lastLog = 0; STD.chose = 0; }
  const T = sim.st; const mo = $('mobj'); if (mo) mo.style.display = 'none'; if (!T) return;
  if (T.n !== STD.n) { STD.n = T.n;
    banner(`第${T.n}陣 · Raid ${T.n}`, T.n % 5 === 0 ? `${sim.mg.sboss ? sim.mg.sboss.G.name : 'An officer'} comes with his guard` : T.n === 1 ? 'Raiders on the horizon. Hold the camp' : 'From every side', 3);
    if (typeof MUSIC !== 'undefined' && MUSIC.accent) MUSIC.accent(T.n % 5 === 0 ? 'breach' : 'wave'); }
  const mine = T.stage === 'pick' && T.offer[state.localIdx] && T.picked[state.localIdx] === undefined && STD.chose !== T.n && !state.ended;
  if (mine) standCards(true); else if ($('sdboons')) standCards(false);
  if (T.log.length && T.log[T.log.length - 1][0] !== STD.lastLog) { const L = T.log[T.log.length - 1]; STD.lastLog = L[0]; const B = S.STAND.BOONS[L[2]];
    if (L[1] === state.localIdx) toast(`${B[1]} ${B[2]}: ${B[3]}`); else { const p = sim.players[L[1]]; toast(`${p ? p.name : 'A comrade'} took ${B[2]}`); } }
  // the result card: how long the stand lasted, and the best
  if (sim.mwin !== undefined && !STD.sum) { const r = $('result'), t = $('resultText'); if (r && !r.hidden && t && t.textContent) { STD.sum = true; const held = Math.max(0, T.n - 1), best = standBestGet();
      if (held > best) standBestSet(held); t.textContent += held > best ? ` A new best! (was ${best})` : ` Your best: ${best} raids.`;
      const took = (T.took[state.localIdx] || []).map(b => S.STAND.BOONS[b][1]).join(' '); if (took) t.textContent += ` Boons: ${took}`; } }
}
requestAnimationFrame(standFrame);
window.__stand = { standCards, standGoal, standChoose, standMenu }; // test hook (headless checks of the cards and the status line)
