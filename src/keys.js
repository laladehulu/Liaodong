// ===================== 鍵 · the controls, on one card: F1 (or ?) in any battle, camp or the open world =====================
// The keys here are the ones the handlers in main.js actually read; the card shows the set for where you are (first person,
// the command view, a camp or the open world) and every other set below it.
const KEYS_FP = [['W A S D', 'walk (Shift: run)'], ['Mouse', 'look'], ['Left button', 'strike (the direction you move the mouse is the cut) · fire a gun · hold and release a bow'], ['Right button', 'block · aim down the sights with a gun'],
  ['Space', 'jump'], ['R', 'reload (with a blade: an overhead cut)'], ['Q', 'change weapon'], ['1–4', 'pick a weapon you carry'], ['X', 'turn the gun round and club with it, and back'],
  ['E', 'use, talk, mount a horse'], ['V', 'rally the men round you'], ['Z / X / C', 'a champion\'s abilities in Heroes (there they replace clubbing and the charge)'], ['G', 'the orders wheel for your squads (or the ultimate in Heroes)'],
  ['C', 'your squads charge where you look'], ['F or H', 'your squads follow you / stay'], ['N', 'your squads fire at will / hold fire'], ['B', 'your squads\' ability'], ['Shift + 1–9', 'pick squads'],
  ['K', 'call the war junks on the ground you look at (where there are any)'], ['J', 'challenge the man in front of you to single combat'], ['Y', 'let the AI command your army'], ['Backspace', 'back to your commander'], ['Enter', 'ready (before the battle)'], ['M', 'music on or off'], ['F9', 'cycle the voices']];
const KEYS_CMD = [['O or `', 'the command view (and back to first person)'], ['Left drag', 'select squads · click a squad to pick it'], ['Right click / drag', 'move there / move and face (drag sets the line)'], ['Ctrl + A', 'select all'],
  ['C', 'charge'], ['H', 'hold'], ['F', 'follow you'], ['Z / X / V', 'form a line / a column / a wedge'], ['N', 'fire at will / hold fire'], ['Q', 'the squad\'s ability'], ['U', 'take control of a man in the squad'], ['Y', 'AI command'], ['R', 'back to your commander'],
  ['L', 'send the next wave of reserves (Grand battle)'], ['1–4', 'pick a class to deploy (before the battle)'], ['Enter', 'ready'], ['Esc', 'clear the selection']];
const KEYS_CAMP = [['W A S D, mouse', 'walk and look'], ['E', 'talk to the man in front of you, use what you are looking at (a bed, the board, the forge, a road out)'], ['1–9', 'choose in a conversation or a choice'], ['Esc', 'leave a conversation'], ['J', 'your journal (the open world)']];
function keysOpen() {
  let box = $('keysCard'); if (!box) { box = document.createElement('div'); box.id = 'keysCard'; document.body.appendChild(box); const st = document.createElement('style');
    st.textContent = `#keysCard { position: fixed; inset: 0; z-index: 85; background: rgba(10,9,8,.78); display: flex; align-items: center; justify-content: center; }
#keysCard .pp { width: min(900px, 95vw); max-height: 88vh; overflow: auto; background: #efe6cf; color: #2a2018; border: 1px solid #8a6a3a; padding: 16px 22px; font: 13.5px/1.45 Georgia, serif; box-shadow: 0 10px 40px #000; }
#keysCard h3 { margin: 0 0 6px; font: 700 19px Georgia, serif; } #keysCard h4 { margin: 12px 0 4px; font: 700 14px Georgia, serif; color: #7a3a1a; } #keysCard table { border-collapse: collapse; width: 100%; }
#keysCard td { padding: 2px 8px 2px 0; vertical-align: top; border-bottom: 1px solid #ddd0b0; } #keysCard td:first-child { white-space: nowrap; font-weight: 700; width: 1%; padding-right: 14px; } #keysCard .now { background: #fff6dd; }`; document.head.appendChild(st);
    box.addEventListener('mousedown', (e) => { e.stopPropagation(); box.hidden = true; if (state.sim && typeof requestLock === 'function') requestLock(); }); }
  if (document.pointerLockElement) document.exitPointerLock();
  const sim = state.sim, camp = sim && sim.cfg && sim.cfg.camp, cmd = typeof Input !== 'undefined' && Input.cmdMode;
  const here = !sim ? null : camp ? 'camp' : cmd ? 'cmd' : 'fp';
  const sec = (k, t, L) => `<h4${here === k ? ' class="now"' : ''}>${t}${here === k ? ' · where you are now' : ''}</h4><table>${L.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
  const order = here === 'cmd' ? ['cmd', 'fp', 'camp'] : here === 'camp' ? ['camp', 'fp', 'cmd'] : ['fp', 'cmd', 'camp'];
  const S3 = { fp: ['fp', '戰 · In the fight (first person)', KEYS_FP], cmd: ['cmd', '令 · The command view', KEYS_CMD], camp: ['camp', '營 · Camp, town and the open world', KEYS_CAMP] };
  box.hidden = false; box.innerHTML = `<div class="pp"><h3>鍵 · Controls</h3><small>F1 or ? opens this anywhere. Click to close.</small>${order.map(k => sec(...S3[k])).join('')}</div>`;
}
document.addEventListener('keydown', (e) => {
  const open = $('keysCard') && !$('keysCard').hidden;
  if (e.code === 'F1' || (e.key === '?' && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)))) { e.preventDefault(); e.stopImmediatePropagation(); if (open) { $('keysCard').hidden = true; if (state.sim && typeof requestLock === 'function') requestLock(); } else keysOpen(); return; }
  if (open && e.code === 'Escape') { e.stopImmediatePropagation(); $('keysCard').hidden = true; }
}, true);
// the pause card says where to find them
{ const pc = $('pause'); const p = pc && pc.querySelector('p'); if (p) p.innerHTML += ' <kbd>F1</kbd> shows every key.'; }
