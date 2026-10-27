// ===== Game shell: menus, lobby, input, lockstep loop, HUD, command UI =====
(() => {
'use strict';
const S = SIM, DT = S.DT;
const $ = (id) => document.getElementById(id);
const canvas = $('c');
const isTouch = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
if (isTouch) $('mobile-note').hidden = false;
if (!Net.available()) $('netNote').textContent = 'Peer-to-peer play needs WebRTC, which this viewer blocks. Practice vs AI works here; for multiplayer, open the downloaded ming-dynasty-1619.html in a desktop browser.';
else if (window.parent !== window) $('netNote').textContent = 'Practice vs AI runs right here. Peer-to-peer rooms need the page in its own browser tab: open the downloaded ming-dynasty-1619.html (or host it on any static site) and share the room code.';

const state = { mission: 'taizhou', op: 'liaoyang', role: 'musket', officer: false, fog: true, pendingInputs: [], screen: 'menu', faction: 0, battle: 'field', mode: 'standard', chapter: 0, scen: 'ningyuan', hclass: 0, army: ['rifle_imp', 'samurai', 'ashigaru', 'rifle_spencer', 'cavalry', 'jigen'], replay: null, replayMode: false, replaySpeed: 1, replayPaused: false, net: null, sim: null, renderer: null, ls: null, acc: 0, last: 0, stalled: false, stallT: 0, toastT: 0, hudT: 0, started: false, ended: false, lastHeroId: -1, selected: [], localIdx: 0, delay: 1, peerNames: [], autoCmd: false };

// ---------- story mode ----------
const STORY_TEXT = [
  { title: 'The Four Columns', year: '1619 · Sarhu',
    intro: ['Nurhaci has declared Seven Grievances against the throne. A hundred thousand Ming men march on Hetu Ala in four columns. You are Du Song, leading the western column, and you are a day ahead of the others. The Jin are waiting on Jiefan hill.', 'The Ming have split their great army into four. Nurhaci\'s answer is simple: "However many roads they take, we take only one." Strike the western column at Sarhu before the others can help it.'],
    beats: [[40, 'Snow begins to fall. The Jiefan crest is the key; whoever holds it holds the field.', 'Snow begins to fall. Take the crest and the Ming are fighting uphill.'], [140, 'Scouts: Ma Lin\'s column is still hours away. You are on your own.', 'Daišan\'s horsemen are in position. Break them now!']],
    win: ['Against every expectation the western column holds. Sarhu will not be the disaster the chroniclers feared.', 'The western column is broken. Within five days three of the four Ming armies will be destroyed.'],
    lose: ['Du Song falls with his column. In five days the Jin destroy three of the four Ming armies. Liaodong lies open.', 'The Ming hold Jiefan. Nurhaci withdraws to gather his banners again.'] },
  { title: 'The White Staffs', year: '1621 · Hun River',
    intro: ['Shenyang has fallen. Across the half-frozen Hun River, Chen Ce\'s Sichuan "white staff" troops, the heirs of Qi Jiguang\'s drill, turn to face the whole Jin host.', 'The Ming relief army is digging in on the far bank of the Hun River. Cross at the bridges and the ford before their cannon are set up.'],
    beats: [[50, 'The ice is thin. Hold the bridges and the ford and they must come to you.', 'Bridges and ford: take them and the Ming line falls apart.'], [150, 'The Jin are bringing captured Ming guns up to the bank.', 'Ming reinforcements are reported on the south road. Finish this quickly.']],
    win: ['The white staffs hold the river. Shenyang can be retaken.', 'The river runs red. The last Ming field army in Liaodong is gone.'],
    lose: ['The white staffs die where they stand. The chroniclers call it the bloodiest day of the war.', 'The Ming hold the crossings. The Khan\'s advance stalls on the Hun.'] },
  { title: 'The Liaodong Capital', year: '1621 · Liaoyang',
    intro: ['Governor Yuan Yingtai has flooded the moat and lined the walls with guns. Liaoyang is the heart of Liaodong. If it falls, everything east of the Liao River falls with it.', 'Liaoyang\'s moat is full and its walls bristle with guns. Fight through the market streets to the gate tower.'],
    beats: [[60, 'Fires in the market quarter! There are spies inside the walls.', 'Our agents inside the city have set the market alight.'], [170, 'The gate must hold. Everything depends on the gate.', 'Take the gate and the city is ours.']],
    win: ['Liaoyang stands. The Jin advance breaks on its walls.', 'Liaoyang falls. Nurhaci moves his capital into the Ming governor\'s own halls.'],
    lose: ['Yuan Yingtai hangs himself in a tower as the city burns. Seventy towns surrender within days.', 'The walls hold. Liaoyang remains Ming.'] },
  { title: 'Red Barbarian Cannon', year: '1626 · Ningyuan',
    intro: ['Everyone else has fled behind the Shanhai Pass. Yuan Chonghuan alone stays at Ningyuan with eleven Portuguese-pattern cannon and an oath written in his own blood. Nurhaci is coming.', 'Nurhaci, undefeated in forty years of war, leads the banners against a lone fortress by the sea. Its commander is a stubborn scholar named Yuan.'],
    beats: [[45, 'Load the Hongyipao! Let them come into range.', 'Their guns are bigger than anything we have seen. Spread out!'], [150, 'The Khan himself is said to be wounded!', 'The Khan is wounded. Take the citadel for him!']],
    win: ['Nurhaci is beaten for the first time in his life. He dies months later. Ningyuan becomes a legend.', 'Ningyuan falls. Nothing now stands between the banners and the Pass.'],
    lose: ['Ningyuan falls and with it the last Ming fortress outside the Wall.', 'Nurhaci is beaten for the first time in his life. He dies within the year, and the bitterness passes to his son Hong Taiji.'] },
  { title: 'The Siege of Songshan', year: '1641 · Songshan',
    intro: ['Hong Chengchou has brought 130,000 men to relieve Jinzhou, and now he is cut off at Songshan. The temple compound on the hill is the last strong point.', 'Hong Taiji has trapped the great Ming relief army at Songshan. Storm the temple compound and its commander will be ours.'],
    beats: [[50, 'Supplies are gone. If we cannot break out, we must hold the main hall.', 'Their grain is gone. Push to the main hall.'], [160, 'Cao Bianjiao\'s cavalry are trying to cut through!', 'Their cavalry are making a run for it. Ride them down!']],
    win: ['The compound holds and the relief army breaks out. The north is not lost yet.', 'Songshan falls. Hong Chengchou surrenders and will serve the Qing.'],
    lose: ['Songshan falls. Hong Chengchou is taken alive and, in time, joins the Qing. The court mourns him as a martyr, wrongly.', 'The Ming break out of Songshan. The siege must start again.'] },
  { title: 'The First Pass Under Heaven', year: '1644 · Shanhai Pass',
    intro: ['Beijing has fallen to rebels and the last Ming emperor is dead. Wu Sangui holds the Shanhai Pass with the best army left in the empire. In this telling he will not open the gates.', 'The Ming capital has fallen. Regent Dorgon sees his chance. Take the Shanhai Pass and the road to Beijing is open.'],
    beats: [[50, 'Hold the outer earthwork; the gate is our last line.', 'The outer earthwork first, then the gate.'], [160, 'A sandstorm rises off the sea. Use it!', 'A sandstorm off the sea. Charge through it!']],
    win: ['The Pass holds. For one more season the Wall is still a wall.', 'The Pass is ours. The banners ride for Beijing.'],
    lose: ['The gates open. Within weeks a Qing emperor sits in the Forbidden City.', 'The Pass holds against the banners. Dorgon must look for another road.'] },
  { title: 'Ten Days', year: '1645 · Yangzhou',
    intro: ['The south is all that remains. Grand Secretary Shi Kefa holds Yangzhou with a mix of soldiers and townsmen against Prince Dodo\'s army as the spring storms roll in.', 'Shi Kefa will not surrender Yangzhou. Prince Dodo\'s orders are to take the city whatever the cost, before the storms turn the paddies to swamp.'],
    beats: [[45, 'The rain is soaking the matchlocks. Make every shot count.', 'Rain! Their matchlocks will misfire. Close with them.'], [150, 'Shi Kefa: "The city lives or dies with me."', 'Shi Kefa is on the bridge. Take him alive if you can.']],
    win: ['Yangzhou stands. The Southern Ming live to fight on.', 'Yangzhou falls. The way to Nanjing is open.'],
    lose: ['Yangzhou falls and is sacked for ten days. Shi Kefa\'s body is never found; his robes are buried on Plum Blossom Hill.', 'Yangzhou holds. The southern court takes heart.'] },
];
function storyProgress() { try { return JSON.parse(localStorage.getItem('mingStory') || '{"0":0,"1":0}'); } catch (e) { return { 0: 0, 1: 0 }; } }
function saveStory(side, ch) { try { const p = storyProgress(); p[side] = Math.max(p[side] || 0, ch); localStorage.setItem('mingStory', JSON.stringify(p)); } catch (e) { } }
function campaign() { try { return JSON.parse(localStorage.getItem('mingCampaign') || 'null'); } catch (e) { return null; } }
function saveCampaign(c) { try { localStorage.setItem('mingCampaign', JSON.stringify(c)); } catch (e) { } }
function campFor(side, ch) { const c = campaign(); return c && c.side === side && c.chapter === ch && c.veterans ? c : null; }
state.recruits = [];
function renderChest() {
  const box = $('warchest'); const c = campFor(state.faction, state.chapter);
  if (!c) { box.innerHTML = `<p class="note">${state.chapter === 0 ? 'A new campaign: you march with the historical army of this battle.' : 'No campaign record for this chapter: you will march with its historical army. Win chapters in order to build a veteran host.'}</p>`; state.recruits = []; return; }
  const spent = state.recruits.reduce((a, k) => a + S.DEFS[k].cost, 0), left = c.chest - spent; const ros = S.ROSTER[state.faction];
  box.innerHTML = `<h3>War chest <span class="budget">${left} / ${c.chest} taels</span></h3><div class="vets">${c.veterans.map(v => { const d = S.defFor(v.type, state.faction); const st = v.xp >= 30 ? 3 : v.xp >= 15 ? 2 : v.xp >= 6 ? 1 : 0; return `<span class="vet-sq">${d.name} <b class="vet">${'★'.repeat(st)}</b><small>${v.n}/${d.count}</small></span>`; }).join('') || '<em>No veterans survived.</em>'}${state.recruits.map((k, i) => `<span class="vet-sq new" data-r="${i}">${S.defFor(k, state.faction).name} <small>new · ✕</small></span>`).join('')}</div>
    <div class="recruit">${ros.map(k => { const d = S.defFor(k, state.faction); const ok = d.cost <= left && c.veterans.length + state.recruits.length < 10; return `<button type="button" class="btn sm" data-k="${k}" ${ok ? '' : 'disabled'}>+ ${d.name} · ${d.cost}</button>`; }).join('')}</div><button type="button" class="btn sm ghost" id="campReset">Abandon campaign</button>`;
}
$('warchest').addEventListener('click', (e) => { const b = e.target.closest('[data-k],[data-r],#campReset'); if (!b) return; if (b.id === 'campReset') { try { localStorage.removeItem('mingCampaign'); } catch (er) { } state.recruits = []; renderChest(); return; } if (b.dataset.k) state.recruits.push(b.dataset.k); else state.recruits.splice(+b.dataset.r, 1); AUDIO.play('ui'); renderChest(); });
function renderStory() { setTimeout(renderChest, 0);
  const box = $('storyList'); const prog = storyProgress(); const side = state.faction; const open = Math.max(state.storyUnlocked || 0, prog[side] || 0);
  box.innerHTML = STORY_TEXT.map((c, i) => { const ch = S.STORY[i]; const me = (side === 0 ? ch.ming : ch.jin)[0][0]; const lock = i > open;
    return `<button type="button" class="chapter${state.chapter === i ? ' on' : ''}${lock ? ' locked' : ''}" data-c="${i}" ${lock ? 'disabled' : ''}><span class="cn">${i + 1}. ${c.title}<small>${c.year}</small></span><span class="cw">You are ${me}</span><span class="cd">${lock ? 'Win the previous chapter to unlock.' : c.intro[side]}</span></button>`; }).join('');
}
function storyCard(text, title) { const el = $('storycard'); el.innerHTML = (title ? `<b>${title}</b>` : '') + `<span>${text}</span>`; el.classList.add('show'); clearTimeout(state.storyT); state.storyT = setTimeout(() => el.classList.remove('show'), Math.min(14000, 3500 + text.length * 55)); }
function heroHUD() {
  const sim = state.sim; if (!sim || !sim.heroMode) return; state.hhT = (state.hhT || 0) - 1; if (state.hhT > 0) return; state.hhT = 6;
  const me = sim.players[state.localIdx], h = sim.units[me.heroId]; if (!h) return;
  const keys = ['Z', 'X', 'C', 'V'];
  const sta = Math.max(0, h.sta === undefined ? 100 : h.sta); const sb = $('stamina'); sb.style.setProperty('--s', sta.toFixed(0) + '%'); sb.classList.toggle('low', sta < 25); sb.classList.toggle('full', sta >= 99.5); sb.hidden = h.dead;
  const HC = S.HCLASS[h.hclass | 0]; const HCOUNTER = HC.abil.map(a => a.ctr);
  { const pk = $('herosel'); const show = (h.dead && !state.dying) || state.pickOpen; pk.hidden = !show; if (show) { const nc = me.nextClass >= 0 ? me.nextClass : h.hclass | 0; const html = `<h4>${h.dead ? 'Choose who rides out next' : 'Change champion (only at your spawn, or on your next return)'}</h4>` + S.HCLASS.map((c, i) => `<div class="hc${i === nc ? ' on' : ''}"><kbd>${i + 1}</kbd><b>${c.name} <span>${c.jp}</span></b><small>${c.desc}</small><em>${c.abil.map(a => a.name).join(' · ')}</em></div>`).join(''); if (pk.dataset.h !== html) { pk.innerHTML = html; pk.dataset.h = html; } } }
  const ab = S.HCLASS[h.hclass | 0].abil.map((a, i) => { const cd = Math.max(0, h.cd[i]); return `<div class="ab${cd > 0 ? '' : ' ready'}${(i === 2 && h.guardT > 0) || (i === 1 && h.dashT > 0) ? ' on' : ''}" title="${HCOUNTER[i]}"><kbd>${keys[i]}</kbd><b>${a.name}</b><i style="--p:${(cd / a.cd * 100).toFixed(0)}%"></i><small>${cd > 0 ? Math.ceil(cd) + 's' : HCOUNTER[i]}</small></div>`; }).join('') + `<div class="ab${me.fury >= S.FURY_MAX ? ' ready' : ''}"><kbd>G</kbd><b>Valor</b><i style="--p:${(100 - me.fury).toFixed(0)}%"></i><small>${me.fury >= S.FURY_MAX ? 'READY' : 'fury ' + Math.round(me.fury) + '%'}</small></div>`;
  if ($('abil').dataset.h !== ab) { $('abil').innerHTML = ab; $('abil').dataset.h = ab; }
  const g = sim.gate, ph = sim.hphase; const t = Math.max(0, Math.ceil((sim.scen.limit - sim.tick) / 30));
  $('hint').hidden = false; $('hint').textContent = h.dead ? `Returning in ${Math.max(0, Math.ceil((me.respawnT - sim.tick) / 30))}s` : `${['Phase I · the outer works', 'Phase II · the gate ' + Math.round(g.hp / g.max * 100) + '%', 'Phase III · citadel ' + Math.round(sim.citT / 30) + ' / 45s held by the Jin'][ph]} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} left`;
}
function storyTick() {
  const sim = state.sim; if (!sim || sim.mode !== 'story' || sim.phase !== 1) return; const T = STORY_TEXT[sim.cfg.chapter | 0]; const side = sim.players[state.localIdx].team;
  const sec = (sim.tick - sim.battleTick) / 30; state.beatDone = state.beatDone || {};
  T.beats.forEach((b, i) => { if (!state.beatDone[i] && sec >= b[0]) { state.beatDone[i] = true; storyCard(b[1 + side]); } });
}

// ---------- menu ----------
function armyCost(a) { return a.reduce((s, k) => s + S.DEFS[k].cost, 0); }
function renderBattles() {
  const box = $('battles'); box.innerHTML = '';
  for (const key in S.BATTLES) {
    const b = S.BATTLES[key]; if (b.hidden) continue; const el = document.createElement('button'); el.type = 'button'; el.className = 'battle' + (state.battle === key ? ' on' : ''); el.dataset.b = key;
    el.innerHTML = `<span class="bn">${b.name}<span class="jp">${b.jp}</span></span><span class="bw">${b.when} · ${b.biome}${b.fog ? ' · fog' : ''}</span><span class="bd">${b.desc}</span>`;
    el.onclick = () => { state.battle = key; AUDIO.init(); AUDIO.play('ui'); renderBattles(); };
    box.appendChild(el);
  }
}
function renderMenu() {
  renderBattles(); renderStory(); renderScen(); const story = state.mode === 'story', heroes = state.mode === 'heroes', duel = state.mode === 'duel', soldier = state.mode === 'soldier' || duel, mis = state.mode === 'campaign' || state.mode === 'assault' || state.mode === 'siege'; $('missionPanel').hidden = !mis; if (mis && typeof renderMissions === 'function') renderMissions(); $('storyPanel').hidden = !story; $('heroPanel').hidden = !heroes; $('soldierPanel').hidden = !soldier; $('armsRow').hidden = heroes; $('fieldPanel').hidden = story || heroes || soldier || mis || state.mode === 'beacon'; if (typeof beaconMenu === 'function') beaconMenu(state.mode === 'beacon'); { const sp = $('soldierPanel'); const cta = sp && sp.querySelector('.career-cta'), oi = $('officerIn'); if (cta) cta.hidden = duel; if (oi && oi.parentElement) oi.parentElement.hidden = duel; const hd = sp && sp.querySelector('h3.sect'); if (hd) hd.textContent = duel ? 'Duel · your arms' : 'Quick battle or co-op · your post'; } if (soldier && typeof renderRoles === 'function') renderRoles(); $('modeNote').textContent = state.mode === 'officers' ? 'Officers: you lead a single squad in person (the first one in your army) beside AI generals. Host a room so friends can each lead a squad too.' : state.mode === 'grand' ? 'Grand battle: AI generals fill out both sides. Command your allies from the command view.' : state.mode === 'chaos' ? 'Chaos: no orders and no fear, and the gods take a hand.' : story ? 'Story: seven battles of the Ming–Jin war. Your faction choice sets which side you fight for.' : heroes ? 'Heroes: you are a lone champion; AI armies fight a phased siege. Faction sets your side. Host a room so each friend plays a champion.' : '';
  $('modeSeg').querySelectorAll('button').forEach(bt => bt.classList.toggle('on', bt.dataset.m === state.mode));
  const ros = S.ROSTER[state.faction]; const cost = armyCost(state.army), left = S.BUDGET - cost;
  const b = $('budget'); b.textContent = `${left} / ${S.BUDGET} taels`; b.classList.toggle('over', left < 0);
  $('armyCount').textContent = `${state.army.length} squad${state.army.length === 1 ? '' : 's'} · ${state.army.reduce((s, k) => s + S.DEFS[k].count, 0)} men`;
  const r = $('roster'); r.innerHTML = '';
  for (const k of ros) {
    const d = S.defFor(k, state.faction); const el = document.createElement('div'); el.className = 'unit';
    const role = d.gun ? 'machine gun' : d.cannon ? 'artillery' : d.bow ? 'archers' : d.ai === 'ranged' ? 'rifles' : d.mounted ? 'cavalry' : 'melee';
    el.innerHTML = `<div class="n">${d.name}<span class="jp">${d.jp}</span></div><div class="d">${d.desc}</div><div class="meta">${d.count} men · ${d.cost} taels · ${role} · morale ${d.fearless ? '∞' : d.morale}</div>`;
    const btn = document.createElement('button'); btn.className = 'btn sm'; btn.type = 'button'; btn.textContent = state.mode === 'officers' ? 'Lead' : 'Add'; btn.disabled = state.mode !== 'officers' && (left < d.cost || state.army.length >= 10);
    btn.onclick = () => { if (state.mode === 'officers') state.army = [k]; else state.army.push(k); AUDIO.init(); AUDIO.play('ui'); renderMenu(); };
    el.appendChild(btn); r.appendChild(el);
  }
  const al = $('armyList'); al.innerHTML = '';
  if (!state.army.length) al.innerHTML = '<div class="empty">No squads yet. You would ride out alone.</div>';
  state.army.forEach((k, i) => {
    const d = S.defFor(k, state.faction); const el = document.createElement('div'); el.className = 'sq';
    el.innerHTML = `<span><span class="num">${i + 1}</span>${d.name} <small style="color:var(--ink2)">×${d.count}</small></span>`;
    const btn = document.createElement('button'); btn.className = 'btn sm ghost'; btn.type = 'button'; btn.textContent = 'Remove'; btn.onclick = () => { state.army.splice(i, 1); renderMenu(); };
    el.appendChild(btn); al.appendChild(el);
  });
  $('factionSeg').querySelectorAll('button').forEach(bt => bt.classList.toggle('on', +bt.dataset.f === state.faction));
}
$('factionSeg').addEventListener('click', (e) => {
  const bt = e.target.closest('button'); if (!bt) return;
  const f = +bt.dataset.f; if (f === state.faction) return;
  state.faction = f;
  const pairs = [['rifle_imp', 'rifle_sho'], ['jigen', 'shinsengumi'], ['armstrong', 'cannon4'], ['rifle_spencer', 'archer'], ['jinshotai', 'byakkotai'], ['gatling', 'cannon4']];
  state.army = state.army.map(k => { for (const [a, b] of pairs) { if (k === a && f === 1) return b; if (k === b && f === 0) return a; } return k; }).filter(k => S.ROSTER[f].includes(k));
  renderMenu();
});
function renderHClass() { $('hcList').innerHTML = S.HCLASS.map((c, i) => `<button type="button" class="chapter${state.hclass === i ? ' on' : ''}" data-h="${i}"><span class="cn">${c.name}<small>${c.jp}</small></span><span class="cw">${c.hp} health · ${c.weapons.map(w => ({ katana: 'dao', yari: 'qiang', rifle: 'musket', revolver: 'hand cannon' })[w]).join(' + ')}</span><span class="cd">${c.desc}<br>${c.abil.map((a, k) => `<b>${'ZXCV'[k]}</b> ${a.name}`).join(' · ')}</span></button>`).join(''); }
$('hcList').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; state.hclass = +bt.dataset.h; AUDIO.init(); AUDIO.play('ui'); renderHClass(); });
function renderScen() { renderHClass(); $('scenList').innerHTML = Object.keys(S.SCEN).map(k => { const c = S.SCEN[k]; return `<button type="button" class="chapter${state.scen === k ? ' on' : ''}" data-s="${k}"><span class="cn">${c.name}</span><span class="cw">Ming defend · Jin attack</span><span class="cd">${c.text.map((t, i) => `${['I', 'II', 'III'][i]}. ${t}`).join('<br>')}</span></button>`; }).join(''); }
$('scenList').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; state.scen = bt.dataset.s; AUDIO.init(); AUDIO.play('ui'); renderScen(); });
$('storyList').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt || bt.disabled) return; state.chapter = +bt.dataset.c; AUDIO.init(); AUDIO.play('ui'); renderStory(); });
$('modeSeg').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; state.mode = bt.dataset.m; AUDIO.init(); AUDIO.play('ui'); renderMenu(); });
function myCfg() { return { name: ($('nameIn').value.trim() || 'Commander').slice(0, 16), team: state.faction, army: state.army.slice(), mounted: $('mountedIn').checked, battle: state.battle, hclass: state.hclass, role: state.role, command: state.officer ? 3 : 0, arms: myArms(), kit: state.mode === 'soldier' ? { arms: myArms() } : undefined }; }
function myArms() { const a = { melee: $('armMelee').value, ranged: $('armRanged').value, shield: $('armShield').checked }; return a.melee || a.ranged || a.shield ? a : null; }
function show(screen) {
  state.screen = screen;
  $('menu').hidden = screen !== 'menu'; $('lobby').hidden = screen !== 'lobby';
  $('hud').hidden = screen !== 'game'; $('cmdui').hidden = screen !== 'game' || !Input.cmdMode;
  if (screen !== 'game') { $('pause').hidden = true; $('result').hidden = true; }
}
$('btnSolo').onclick = () => {
  AUDIO.init(); if (state.mode === 'officers' && state.army.length > 1) state.army = state.army.slice(0, 1);
  const cfg = myCfg(); const seed = (Math.random() * 0x7fffffff) | 0;
  state.lowfx = $('lowfxIn').checked; state.fog = false;
  if (state.mode === 'story') { const c = campFor(state.faction, state.chapter); if (c) { cfg.veterans = c.veterans; cfg.recruits = state.recruits.slice(); } }
  startGame({ seed, battle: state.battle, mode: state.mode, chapter: state.chapter, scen: state.scen, mission: state.mission, op: state.op, players: [{ ...cfg, connected: true }] }, 0, null, 1);
};
$('btnHost').onclick = () => {
  if (!Net.available()) { $('menuMsg').textContent = 'Multiplayer is not available in this viewer. Open the downloaded .html file in a desktop browser to host.'; return; }
  AUDIO.init(); $('menuMsg').textContent = 'Opening a room…';
  const net = new Net(); state.net = net; wireLobby(net);
  net.host(myCfg(), (err, code) => { if (err) { $('menuMsg').textContent = 'Could not open a room: ' + (err.message || err.type || err); return; } $('menuMsg').textContent = ''; $('codeOut').textContent = code; $('lobbySub').textContent = 'Share this room code. Friends enter it under Join on the main screen.'; $('btnStart').hidden = false; $('lobbyWait').hidden = true; show('lobby'); renderLobby(); });
};
$('btnJoin').onclick = () => {
  if (!Net.available()) { $('menuMsg').textContent = 'Multiplayer is not available in this viewer. Open the downloaded .html file in a desktop browser to join.'; return; }
  const code = $('codeIn').value.trim().toUpperCase(); if (code.length < 5) { $('menuMsg').textContent = 'Enter the 5-character room code.'; return; }
  AUDIO.init(); $('menuMsg').textContent = 'Joining…';
  const net = new Net(); state.net = net; wireLobby(net);
  net.join(code, myCfg(), (err) => { if (err) { $('menuMsg').textContent = err.message || String(err); net.destroy(); state.net = null; return; } $('menuMsg').textContent = ''; $('codeOut').textContent = code; $('lobbySub').textContent = 'You are in. The host begins the battle when everyone has arrived.'; $('btnStart').hidden = true; $('lobbyWait').hidden = false; show('lobby'); renderLobby(); });
};
$('btnCopy').onclick = () => { const code = $('codeOut').textContent; navigator.clipboard && navigator.clipboard.writeText(code).then(() => { $('copyMsg').textContent = 'Copied'; }, () => { $('copyMsg').textContent = 'Select the code and copy it.'; }); };
$('btnLeave').onclick = () => { if (state.net) state.net.destroy(); state.net = null; show('menu'); };
$('btnMenu').onclick = () => { location.reload(); };
function wireLobby(net) {
  net.onLobby = renderLobby;
  net.onFail = (msg) => { $('menuMsg').textContent = msg; show('menu'); };
  net.onStart = (msg) => { state.lowfx = $('lowfxIn').checked; state.fog = false; startGame(msg, net.myIdx, net, msg.delay || 4); };
  net.onInput = (p, k, d) => { if (state.ls) state.ls.onRemote(p, k, d); else state.pendingInputs.push([p, k, d]); };
  net.onHash = (p, k, h) => { if (state.ls) state.ls.recordHash(p, k, h); };
  net.onPeerLeft = (idx) => { if (state.ls) { state.ls.disconnect(idx); toast(`${state.peerNames[idx] || 'A player'} left the battle`); } };
}
function renderLobby() {
  const net = state.net; if (!net) return;
  const list = $('players'); list.innerHTML = '';
  const sorted = net.players.slice().sort((a, b) => a.idx - b.idx);
  for (const p of sorted) {
    const el = document.createElement('div'); el.className = 'pl';
    const cfg = p.cfg; const team = cfg ? cfg.team : 0;
    el.innerHTML = `<span class="tag t${team}">${cfg ? S.FACTION[team].short : '…'}</span><span><b>${cfg ? escapeHtml(cfg.name) : 'joining…'}</b>${p.idx === 0 ? ' <small>host</small>' : ''}${p.idx === net.myIdx ? ' <small>(you)</small>' : ''}${p.connected ? '' : ' <small style="color:var(--danger)">disconnected</small>'}<div class="squads">${cfg ? cfg.army.map(k => S.DEFS[k].name).join(', ') || 'no squads' : ''}${cfg && cfg.mounted ? ' · mounted' : ''}</div></span><span class="squads">${p.rtt ? p.rtt + ' ms' : ''}</span>`;
    list.appendChild(el);
  }
  if (net.isHost) { const ready = net.players.every(p => p.cfg || !p.connected); $('btnStart').disabled = !ready; }
  const hostCfg = net.players.find(p => p.idx === 0); const bk = hostCfg && hostCfg.cfg && hostCfg.cfg.battle; const bd = S.BATTLES[bk] || S.BATTLES.field;
  $('lobbyBattle').textContent = `Battlefield: ${bd.name} ${bd.jp} · ${bd.when}`;
}
$('btnStart').onclick = () => {
  const net = state.net; if (!net || !net.isHost) return;
  const players = net.players.slice().sort((a, b) => a.idx - b.idx).map(p => ({ name: p.cfg ? p.cfg.name : 'Player', team: p.cfg ? p.cfg.team : 0, army: p.cfg ? p.cfg.army : [], mounted: p.cfg ? !!p.cfg.mounted : false, hclass: p.cfg ? p.cfg.hclass | 0 : 0, role: p.cfg ? p.cfg.role : 'musket', command: p.cfg ? p.cfg.command | 0 : 0, arms: p.cfg ? p.cfg.arms : null, kit: p.cfg ? p.cfg.kit : undefined, connected: p.connected }));
  let maxRtt = 0; for (const p of net.players) if (p.connected && p.rtt) maxRtt = Math.max(maxRtt, p.rtt);
  const delay = Math.max(3, Math.min(12, Math.ceil(maxRtt / 2 / 33.3) + 2));
  net.start({ t: 'start', seed: (Math.random() * 0x7fffffff) | 0, players, delay, battle: state.battle, mode: state.mode, chapter: state.chapter, scen: state.scen, mission: state.mission, op: state.op });
};
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------- input ----------
const Input = {
  keys: 0, yaw: 0, pitch: 0, accX: 0, accY: 0, lastDir: S.DIR_UP, lmb: false, rmb: false, ads: false, wsel: 0, atkDir: S.DIR_UP, blockDir: S.DIR_UP, pressed: 0, bayonet: false, cmdMode: false, cmds: [], locked: false, sens: 0.0022,
  cmdKeys: new Set(), shift: false, mouse: { x: -1, y: -1 }, mouseMoved: false,
  decay(dt) { const f = Math.exp(-dt * 9); this.accX *= f; this.accY *= f; },
  currentDir() {
    const ax = Math.abs(this.accX), ay = Math.abs(this.accY);
    if (ax + ay > 7) { this.lastDir = ay >= ax ? (this.accY < 0 ? S.DIR_UP : S.DIR_DOWN) : (this.accX > 0 ? S.DIR_RIGHT : S.DIR_LEFT); }
    return this.lastDir;
  },
};
const KEYMAP = { KeyW: S.KEY_W, KeyS: S.KEY_S, KeyA: S.KEY_A, KeyD: S.KEY_D, ArrowUp: S.KEY_W, ArrowDown: S.KEY_S, ArrowLeft: S.KEY_A, ArrowRight: S.KEY_D, ShiftLeft: S.KEY_SPRINT, ShiftRight: S.KEY_SPRINT };
function slashDir() {
  const h = localHero(); if (h && h.weapon === 'yari') return S.DIR_DOWN;
  if (Math.abs(Input.accX) > 9) Input.slashSide = Input.accX > 0 ? S.DIR_LEFT : S.DIR_RIGHT; else Input.slashSide = Input.slashSide === S.DIR_RIGHT ? S.DIR_LEFT : S.DIR_RIGHT;
  return Input.slashSide;
}
function tapAttack(dir) { if (gunMode() || Input.cmdMode) return false; Input.atkDir = dir; Input.tapAtk = true; return true; }
function wpnName(h, w) {
  if (w === 'katana') { const A = h.def.arm && S.ARMS[h.def.arm]; return A ? `${A.zh} ${A.en.split(' ')[0]}` : '腰刀 Dao'; }
  if (w === 'yari') return h.def.arm === 'qiang' ? '槍 Qiang' : '長槍 Spear';
  if (w === 'rifle') return h.def.rifle && h.def.rifle.mag > 1 ? '三眼銃 Gun' : '鳥銃 Musket';
  if (w === 'revolver') return '三眼銃 Three-eyed';
  if (w === 'bow') return h.def.bow && h.def.bow.xbow ? '弩 Crossbow' : '弓 Bow';
  return w;
}
function localHero() { const sim = state.sim; if (!sim) return null; const p = sim.players[state.localIdx]; return p ? sim.units[p.heroId] : null; }
// a man whose only weapon is a gun (the three-eyed gun, a plain musket) turns it round with X to fight with it as a club (sim: u.club)
// manning a bed crossbow or a gun: the weapon panel shows the piece, and an elevation scale with the range of the fall of shot
// sits under the sights (the renderer works out the fall with the sim's own projectile steps)
function empHUD(hero) {
  const r = state.renderer; let el = $('empAim'); const H = r && r.empHud; const on = !!(H && hero.manE >= 0 && !hero.dead && !Input.cmdMode);
  if (r) r.empZoom = on && Input.rmb;
  if (!on) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'empAim'; document.body.appendChild(el); }
  el.hidden = false; const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), gun = H.kind !== 'bow', deg = (x) => (x * 180 / Math.PI), e = deg(H.elev), w = deg(H.want), laying = Math.abs(w - e) > 0.6;
  const ticks = []; for (let d = -25; d <= 30; d += 5) ticks.push(`<i style="bottom:${((d + 25) / 55 * 100).toFixed(1)}%"${d === 0 ? ' class="z"' : ''}><b>${d > 0 ? '+' : ''}${d}°</b></i>`);
  el.innerHTML = `<div class="scale">${ticks.join('')}<u style="bottom:${((clamp(e, -25, 30) + 25) / 55 * 100).toFixed(1)}%"></u><s style="bottom:${((clamp(w, -25, 30) + 25) / 55 * 100).toFixed(1)}%"></s></div>`
    + `<div class="rd"><b>${gun ? '砲' : '弩'}</b> 仰 ${e >= 0 ? '+' : ''}${e.toFixed(1)}°${laying ? ' · laying…' : ''}<br>${H.out ? 'beyond the field' : H.wall ? 'strikes the wall ahead' : `落 ${Math.round(H.dist / 1.6)} 步 · ${Math.round(H.dist)} m`}${H.foes ? ` · <b style="color:#ff8a6a">${H.foes} in the ring</b>` : ''}</div>`;
  $('weapon').textContent = gun ? '紅夷砲 · the gun' : '床弩 · bed crossbow';
  const ready = H.cd <= 0; $('ammoFill').style.width = (ready ? 100 : (1 - H.cd / H.cdMax) * 100).toFixed(0) + '%'; $('ammoText').textContent = ready ? 'Ready · LMB fire' : `${gun ? 'Sponging and loading' : 'Spanning the bow'}… ${Math.ceil(H.cd / 30)} s`;
  $('dirText').textContent = 'Mouse lays the piece · wheel fine elevation · RMB sight · LMB fire · E leave it';
}
function gunMode() { const h = localHero(); return h && ((h.weapon === 'rifle' && !Input.bayonet && !h.club) || h.weapon === 'revolver' || h.weapon === 'bow'); }
// a bow (not a crossbow): hold the left button to draw, let go to loose
function bowMode() { const h = localHero(); return !!(h && !h.dead && h.weapon === 'bow' && !(h.def.bow && h.def.bow.xbow)); }
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'game') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const c = e.code;
  if (c === 'Tab') e.preventDefault();
  if (state.sim && state.sim.mode === 'campaign' && !storyLock()) { if (DEP.open) { depKey(c, e); return; } if (c === 'KeyP' && state.sim.phase === 1) { depOpen(true); DEP.t = 0; return; } }
  if (state.sim && state.sim.mode === 'assault') { if (DEP.open) { depKey(c, e); return; } if (c === 'KeyP') { depOpen(true); DEP.t = 0; return; } if (c === 'KeyO' || c === 'Backquote') { toast('In an assault you are a soldier: press P to change soldier or spawn point'); return; } }
  if (!e.repeat && (c === 'KeyA' || c === 'KeyD' || c === 'KeyS') && state.sim && !Input.cmdMode) { const now = performance.now(); const T = Input.tapT || (Input.tapT = {}); if (now - (T[c] || 0) < 260) { const h = localHero(); if (h && !h.dead && !(h.mount >= 0 || h.mounted)) Input.pressed |= c === 'KeyA' ? S.A_DASHL : c === 'KeyD' ? S.A_DASHR : S.A_DODGE; T[c] = 0; } else T[c] = now; }
  if (KEYMAP[c]) { Input.keys |= KEYMAP[c]; e.preventDefault(); }
  if (e.repeat) return;
  Input.shift = e.shiftKey;
  if (state.replayMode) { replayKey(c); return; }
  if (state.sim && state.sim.heroMode && !state.replayMode) {
    const h = localHero(); const fp = h && !h.dead;
    if (c === 'Tab') { e.preventDefault(); return; }
    if ((!fp || state.pickOpen) && /^Digit[1-4]$/.test(c)) { Input.cmds.push([+c.slice(5) - 1, S.ORD_CLASS, 0, 0, 0, 0]); state.pickOpen = false; AUDIO.play('ui'); return; }
    if (c === 'KeyB') { state.pickOpen = !state.pickOpen; return; }
    if (fp && !e.repeat) { const m = { KeyZ: S.A_AB1, KeyX: S.A_AB2, KeyC: S.A_AB3, KeyV: S.A_RALLY, KeyG: S.A_ULT }[c]; if (m) { Input.pressed |= m; return; } }
    if (fp && c === 'KeyE') { const sim = state.sim; const nearHorse = h.mount >= 0 || sim.units.some(v => v.type === 'horse' && !v.dead && v.rider < 0 && Math.abs(v.x - h.x) + Math.abs(v.z - h.z) < 4); Input.pressed |= nearHorse ? S.A_MOUNT : S.A_KICK; return; }
    if (c === 'KeyC' || c === 'KeyG' || c === 'KeyX' || c === 'KeyZ') return;
  }
  if (c === 'KeyO' || c === 'Backquote') { toggleCmd(); return; } // O (or `): overview / command view. T and Tab belong to the browser
  if (Input.cmdMode) {
    if (c === 'Enter') { Input.pressed |= S.A_READY; return; }
    switch (c) {
      case 'KeyC': orderCharge(); break; case 'KeyH': order(S.ORD_HOLD); break; case 'KeyF': case 'KeyG': order(S.ORD_FOLLOW); break;
      case 'KeyZ': order(S.ORD_FORM, 0, 0, 0, S.FORM_LINE); break; case 'KeyX': order(S.ORD_FORM, 0, 0, 0, S.FORM_COLUMN); break; case 'KeyV': order(S.ORD_FORM, 0, 0, 0, S.FORM_WEDGE); break; case 'KeyB': order(S.ORD_FORM, 0, 0, 0, S.FORM_LOOSE); break;
      case 'KeyN': toggleFire(); break; case 'KeyU': takeControl(); break; case 'KeyY': toggleAuto(); break; case 'KeyR': returnToCommander(); break;
      case 'KeyQ': useAbility(state.selected); break; case 'KeyL': { const sim = state.sim, me = sim.players[state.localIdx]; const w = (sim.waves || []).find(q => q.team === me.team && !q.released); if (!w) toast(sim.mode === 'grand' ? 'Your reserve corps is already committed' : 'Reserve corps only march in Grand battle'); else if (sim.rp[me.team] < 180) toast(`Not enough reinforcement points yet (${Math.round(sim.rp[me.team])}/180). Hold objectives and win fights`); else { Input.cmds.push([0, S.ORD_WAVE, 0, 0, 0, 0]); AUDIO.play('ui'); } break; } case 'KeyK': { const g = state.renderer.groundFromScreen(Input.mouse.x, Input.mouse.y); if (g) callNaval(g.x, g.z); else toast('Point at the ground to call the fleet'); break; }
      case 'KeyA': if (e.ctrlKey || e.metaKey) { e.preventDefault(); selectAll(); } break;
      case 'Escape': state.selected = []; break;
    }
    return;
  }
  if (c === 'F9' && typeof SPEECH !== 'undefined') { e.preventDefault(); SPEECH.cycle(); return; }
  if (c === 'KeyM') { const on = MUSIC.toggle(); $('musicIn').checked = on; toast(on ? 'Music on' : 'Music off'); return; }
  if (c === 'KeyG') { if (e.repeat) return; if (Input.orderMode) closeOrders(); else { openOrders(); state.gDownT = performance.now(); } return; }
  if (Input.orderMode) { orderKey(c, e); return; }
  // quick orders straight from first person, no menu needed
  { const kh = localHero(); const kit = kh && kh.kit && kh.kit.length > 1; // carrying several weapons: 1-4 pick a weapon, Shift+number picks squads
    if (/^Digit\d$/.test(c) && (e.shiftKey || (fpSquads().length && !(kit && /^Digit[1-4]$/.test(c))))) { quickSelect(+c.slice(5)); return; } }
  if (!e.repeat) switch (c) {
    case 'KeyZ': if (fpReady()) { state.zHeld = true; } return;
    case 'KeyC': if (fpReady()) fpCharge(); return;
    case 'KeyF': if (fpReady()) { fpFollowToggle(); return; } break;
    case 'KeyH': if (fpReady()) fpFollowToggle(); return;
    case 'KeyN': if (fpReady()) { const sim = state.sim; const on = !state.fpSel.some(id => sim.squads[id].fire); withFpSel(() => toggleFire()); shout(`${names()}: ${on ? 'fire at will!' : 'hold your fire!'}`); } return;
    case 'KeyB': if (fpReady()) useAbility(state.fpSel); return;
    case 'KeyK': { if (storyLock()) return; const g = fpAimPoint(); if (g) callNaval(g.x, g.z); else toast('Look at the ground to call the war junks'); return; }
    case 'KeyJ': if (storyLock()) return; Input.pressed |= S.A_DUEL; return;
  }
  switch (c) {
    case 'Space': Input.pressed |= S.A_JUMP; e.preventDefault(); break;
    case 'KeyE': { if (typeof zheKeyE === 'function' && zheKeyE()) break; const h = localHero(); const sim = state.sim; const nearHorse = h && (h.mount >= 0 || sim.units.some(v => v.type === 'horse' && !v.dead && v.rider < 0 && Math.abs(v.x - h.x) + Math.abs(v.z - h.z) < 4)); Input.pressed |= nearHorse ? S.A_MOUNT : S.A_KICK; break; }
    case 'KeyR': if (!tapAttack(S.DIR_DOWN)) Input.pressed |= S.A_RELOAD; break;
    case 'KeyQ': Input.pressed |= S.A_SWAP; Input.ads = false; break;
    case 'KeyX': Input.pressed |= S.A_GRIP; Input.ads = false; break; /* X: turn the gun round to club with it, and back to shoot */
    case 'Digit1': Input.wsel = 1; Input.ads = false; break;
    case 'Digit2': Input.wsel = 2; Input.ads = false; break;
    case 'Digit3': Input.wsel = 3; Input.ads = false; break;
    case 'Digit4': Input.wsel = 4; Input.ads = false; break;
    case 'KeyV': Input.pressed |= S.A_RALLY; break;
    case 'Enter': Input.pressed |= S.A_READY; break;
    case 'KeyY': if (!storyLock()) toggleAuto(); break;
    case 'Backspace': if (!storyLock()) returnToCommander(); e.preventDefault(); break;
  }
});
document.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) Input.keys &= ~KEYMAP[e.code]; Input.shift = e.shiftKey; if (e.code === 'KeyG' && Input.orderMode && performance.now() - (state.gDownT || 0) > 350) closeOrders(); if (e.code === 'KeyZ' && state.zHeld) { state.zHeld = false; state.fpGhost = null; if (fpReady()) fpMove(); } });
// ---------- first-person orders: hold G, aim with the crosshair ----------
state.fpSel = null;
function fpSquads() { const own = ownSquads(); if (!state.fpSel) state.fpSel = own.map(s => s.id); state.fpSel = state.fpSel.filter(id => own.some(s => s.id === id)); return own; }
function openOrders() {
  if (Input.cmdMode || state.replayMode) return; const own = fpSquads(); if (!own.length) { toast('You have no squads left to command'); return; }
  if (!state.fpSel.length) state.fpSel = own.map(s => s.id);
  Input.orderMode = true; Input.lmb = false; Input.rmb = false; $('ordermenu').hidden = false; renderOrderMenu();
}
function fpReady() { if (Input.cmdMode || state.replayMode || !state.sim) return false; if (noOrders()) return false; const own = fpSquads(); if (!own.length) { toast(storyLock() ? 'Chief Wu gives the orders here. Keep your place in the file' : 'You have no squads left to command'); return false; } if (!state.fpSel.length) state.fpSel = own.map(s => s.id); return true; }
function quickSelect(n) { if (Input.cmdMode) return; const own = fpSquads(); if (!own.length) return; if (n === 0 || !own[n - 1]) state.fpSel = own.map(s => s.id); else state.fpSel = [own[n - 1].id]; AUDIO.play('ui'); toast(`Orders to: ${names()}`); }
function fpFollowToggle() { const sim = state.sim; const following = state.fpSel.some(id => sim.squads[id].order === S.ORD_FOLLOW); if (following) { withFpSel(() => order(S.ORD_HOLD)); shout(`${names()}: halt!`); } else { withFpSel(() => order(S.ORD_FOLLOW)); shout(`${names()}: follow me!`); } }
function closeOrders() { if (!Input.orderMode) return; Input.orderMode = false; $('ordermenu').hidden = true; state.fpGhost = null; }
function renderOrderMenu() {
  const own = fpSquads(); const sim = state.sim; const rows = own.map((sq, i) => `<span class="osq${state.fpSel.includes(sq.id) ? ' on' : ''}${sq.routing ? ' rout' : ''}"><kbd>${i + 1}</kbd>${sq.def.name} <small>${sq.aliveCount}/${sq.count}</small></span>`);
  $('osquads').innerHTML = `<span class="osq${state.fpSel.length === own.length ? ' on' : ''}"><kbd>0</kbd>All</span>` + rows.join('');
}
function withFpSel(fn) { const keep = state.selected; state.selected = state.fpSel.slice(); fn(); state.selected = keep; }
function lineCols(n) { return n <= 12 ? n : Math.ceil(n / 2); }
function fpAimPoint() { const r = state.renderer; return r.groundFromScreen(canvas.clientWidth / 2, canvas.clientHeight / 2); }
function fpLayout() {
  const sim = state.sim; const g = fpAimPoint(); if (!g || !state.fpSel.length) return null;
  const sqs = state.fpSel.map(id => sim.squads[id]).filter(q => q && q.alive);
  let W = -4; for (const q of sqs) W += (q.def.yuanyang && q.formation !== S.FORM_COLUMN ? 4.2 : lineCols(q.aliveCount) * S.spacingOf(q.def) * (q.def.skirmish ? 2 : 1)) + 4;
  W = Math.max(4, W); const fy = enemyFacing(g.x, g.z, sqs[0] ? sqs[0].team : 0, Input.yaw); const rx = -Math.cos(fy), rz = Math.sin(fy);
  const keep = state.selected; state.selected = state.fpSel.slice();
  const lay = layoutLine({ x: g.x - rx * W / 2, z: g.z - rz * W / 2 }, { x: g.x + rx * W / 2, z: g.z + rz * W / 2 });
  state.selected = keep; if (lay) lay.facing = fy; return lay; // face the enemy, whichever way you happen to be looking
}
function objBg(c) { const k = Math.min(1, Math.abs(c) / 100); const t = c >= 0 ? [176, 38, 58] : [47, 85, 184]; const g = [90, 84, 74]; return `rgba(${t.map((v, i) => Math.round(g[i] + (v - g[i]) * k)).join(',')},.75)`; }
function useAbility(ids) {
  if (noOrders()) return;
  const sim = state.sim; let any = false, wait = 0;
  for (const id of ids) { const sq = sim.squads[id]; if (!sq || !sq.alive || sq.owner !== state.localIdx) continue; if (sq.routing) continue; if (sq.abT > 0) { wait = Math.max(wait, Math.ceil(sq.abT / 30)); continue; } Input.cmds.push([id, S.ORD_ABILITY, 0, 0, 0, 0]); any = true; }
  if (!ids.length) toast('Select a squad first'); else if (!any) toast(wait ? `Not ready yet · ${wait}s` : 'They cannot do that now'); else AUDIO.play('ui');
}
function callNaval(x, z) {
  if (noOrders()) return;
  const sim = state.sim, me = sim.players[state.localIdx];
  if (sim.phase !== 1) { toast('The fleet waits for the battle to begin'); return; }
  if (me.navalUsed) { toast('Your war junk has already fired its broadside'); return; }
  Input.cmds.push([0, S.ORD_NAVAL, +x.toFixed(2), +z.toFixed(2), 0, 0]); AUDIO.play('ui');
}
function directive(pidx, kind) {
  const sim = state.sim, r = state.renderer; let x = 0, z = 0;
  if (kind === S.DIR_HOLD || kind === S.DIR_FLANK) { let g = null; if (Input.cmdMode) g = { x: r.cmdCam.x, z: r.cmdCam.z }; else g = fpAimPoint(); if (!g) { toast('Look at (or centre the view on) the ground first'); return; } x = g.x; z = g.z; }
  Input.cmds.push([pidx, S.ORD_DIRECTIVE, +x.toFixed(2), +z.toFixed(2), 0, kind]); AUDIO.play('ui');
}
const DIRW = ['Attack', 'Hold', 'Support me', 'Flank'];
function renderAllies() {
  const sim = state.sim, me = sim.players[state.localIdx]; const box = $('allies');
  const al = sim.players.filter(p => p.ai && p.team === me.team);
  if (!al.length || !Input.cmdMode || sim.chaos) { box.hidden = true; return; }
  const html = '<h4>Allied commanders <small>orders go to the point at the centre of your view</small></h4>' + al.map(p => { const men = p.squads.reduce((s, id) => s + sim.squads[id].aliveCount, 0); const hero = sim.units[p.heroId]; const k = p.directive ? p.directive.kind : 0;
    return `<div class="ally${hero && hero.dead ? ' dead' : ''}"><span class="an">${p.name}<small>${men} men${hero && hero.dead ? ' · fallen' : ''}</small></span>${DIRW.map((w, i) => `<button type="button" data-p="${p.idx}" data-k="${i}" class="${k === i ? 'on' : ''}">${w}</button>`).join('')}</div>`; }).join('');
  if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; } box.hidden = false;
}
$('allies').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; directive(+bt.dataset.p, +bt.dataset.k); });
function shout(text) { feed(text, true); AUDIO.play('ui'); }
function names() { const sim = state.sim; const own = fpSquads(); return state.fpSel.length === own.length ? 'Everyone' : state.fpSel.map(id => sim.squads[id].def.name).join(', '); }
function fpMove() { const lay = fpLayout(); if (!lay) { toast('Look at the ground to give a position'); return; } for (const o of lay.out) { if (!o.sq.def.skirmish && o.sq.formation !== S.FORM_LINE) Input.cmds.push([o.sq.id, S.ORD_FORM, 0, 0, 0, S.FORM_LINE]); } for (const o of lay.out) Input.cmds.push([o.sq.id, S.ORD_MOVE, +o.cx.toFixed(2), +o.cz.toFixed(2), Math.round(lay.facing * 1000), o.cols]); shout(`${names()}: form up there!`); if (typeof SPEECH !== 'undefined') SPEECH.orderChain(S.ORD_FORM, state.fpSel.slice()); }
function fpCharge() {
  const sim = state.sim; const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2; const enemy = pickSquad(cx, cy, false); const g = fpAimPoint();
  for (const id of state.fpSel) { const sq = sim.squads[id]; if (!sq || !sq.alive) continue; let tx, tz; if (enemy) { tx = enemy.cx; tz = enemy.cz; } else if (g) { tx = g.x; tz = g.z; } else { const e = nearestEnemySquad(sq); if (!e) continue; tx = e.cx; tz = e.cz; } Input.cmds.push([id, S.ORD_CHARGE, +tx.toFixed(2), +tz.toFixed(2), Math.round(Math.atan2(tx - sq.cx, tz - sq.cz) * 1000), 0]); }
  shout(`${names()}: charge${enemy ? ' the ' + enemy.def.name : ''}!`); if (typeof SPEECH !== 'undefined') SPEECH.orderChain(S.ORD_CHARGE, state.fpSel.slice());
}
function orderKey(c, e) {
  const own = fpSquads();
  const dm = /^Digit(\d)$/.exec(c);
  if (dm) { const n = +dm[1]; if (n === 0) state.fpSel = own.map(s => s.id); else if (own[n - 1]) { const id = own[n - 1].id; if (e.shiftKey || e.ctrlKey) { const i = state.fpSel.indexOf(id); if (i >= 0) state.fpSel.splice(i, 1); else state.fpSel.push(id); } else state.fpSel = [id]; } renderOrderMenu(); AUDIO.play('ui'); return; }
  if (!state.fpSel.length) { toast('Pick a squad with the number keys'); return; }
  switch (c) {
    case 'KeyF': withFpSel(() => order(S.ORD_FOLLOW)); shout(`${names()}: follow me!`); break;
    case 'KeyH': withFpSel(() => order(S.ORD_HOLD)); shout(`${names()}: hold here!`); break;
    case 'KeyZ': withFpSel(() => order(S.ORD_FORM, 0, 0, 0, S.FORM_LINE)); shout(`${names()}: form a line`); break;
    case 'KeyX': withFpSel(() => order(S.ORD_FORM, 0, 0, 0, S.FORM_COLUMN)); shout(`${names()}: column`); break;
    case 'KeyV': withFpSel(() => order(S.ORD_FORM, 0, 0, 0, S.FORM_WEDGE)); shout(`${names()}: wedge`); break;
    case 'KeyB': withFpSel(() => order(S.ORD_FORM, 0, 0, 0, S.FORM_LOOSE)); shout(`${names()}: spread out`); break;
    case 'KeyN': { const sim = state.sim; const on = !state.fpSel.some(id => sim.squads[id].fire); withFpSel(() => toggleFire()); shout(`${names()}: ${on ? 'fire at will' : 'hold your fire'}`); break; }
    case 'KeyU': withFpSel(() => takeControl()); break;
    case 'KeyC': fpCharge(); break;
    case 'KeyQ': useAbility(state.fpSel); break;
    case 'KeyK': { const g = fpAimPoint(); if (g) callNaval(g.x, g.z); else toast('Look at the ground to call the fleet'); break; }
    case 'Escape': closeOrders(); break;
  }
}
window.addEventListener('blur', () => { Input.keys = 0; Input.lmb = false; Input.rmb = false; });
document.addEventListener('contextmenu', (e) => { if (state.screen === 'game') e.preventDefault(); });
document.addEventListener('mousemove', (e) => {
  Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; if (e.movementX || e.movementY) Input.mouseMoved = true;
  if (Input.locked && !Input.cmdMode) {
    const dx = e.movementX || 0, dy = e.movementY || 0;
    const aiming = localHero() && localHero().aiming;
    const s = Input.sens * (aiming ? 0.55 : 1);
    Input.yaw -= dx * s; Input.pitch = Math.max(-1.45, Math.min(1.45, Input.pitch - dy * s));
    Input.accX += dx; Input.accY += dy;
  }
});
const Drag = { btn: -1, sx: 0, sy: 0, x: 0, y: 0, active: false, start: null, ghost: null, line: null };
canvas.addEventListener('mousedown', (e) => {
  if (state.screen !== 'game') return;
  AUDIO.init();
  if (Input.cmdMode) {
    if (e.button === 0 || e.button === 2) { Drag.btn = e.button; Drag.sx = Drag.x = e.clientX; Drag.sy = Drag.y = e.clientY; Drag.active = false; Drag.shift = e.shiftKey; Drag.start = e.button === 2 ? state.renderer.groundFromScreen(e.clientX, e.clientY) : null; Drag.ghost = null; Drag.line = null; }
    return;
  }
  if (!Input.locked) { requestLock(); return; }
  if (Input.orderMode) { if (e.button === 0) fpMove(); else if (e.button === 2) fpCharge(); return; }
  if (e.button === 1) { e.preventDefault(); if (fpReady()) fpMove(); return; }
  if (e.button === 0 && bowMode()) { Input.bowHeld = true; return; }
  if (e.button === 0) { if (gunMode()) Input.pressed |= S.A_FIRE; else { Input.lmb = true; Input.atkDir = slashDir(); } }
  else if (e.button === 2) { if (gunMode()) Input.ads = !Input.ads; else { Input.rmb = true; Input.blockDir = S.DIR_UP; } }
});
document.addEventListener('mouseleave', () => { Input.mouseMoved = false; });
window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) Input.mouseMoved = false; });
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) Input.lmb = false; if (e.button === 2) Input.rmb = false;
  if (e.button === 0 && Input.bowHeld) { Input.bowHeld = false; if (bowMode()) Input.pressed |= S.A_FIRE; }
  if (Drag.btn !== e.button || state.screen !== 'game') return;
  const btn = Drag.btn; Drag.btn = -1;
  if (!Input.cmdMode) return;
  if (btn === 0) {
    if (Drag.active) boxSelect(Math.min(Drag.sx, e.clientX), Math.min(Drag.sy, e.clientY), Math.max(Drag.sx, e.clientX), Math.max(Drag.sy, e.clientY), Drag.shift);
    else cmdSelect(e.clientX, e.clientY, Drag.shift);
  } else if (btn === 2) {
    if (Drag.active && Drag.start) { const g = state.renderer.groundFromScreen(e.clientX, e.clientY); if (g) lineOrder(Drag.start, g); }
    else cmdOrderAt(e.clientX, e.clientY);
  }
  Drag.active = false; Drag.ghost = null; Drag.line = null; $('selbox').hidden = true;
});
document.addEventListener('mousemove', (e) => {
  if (Drag.btn < 0 || !Input.cmdMode) return;
  Drag.x = e.clientX; Drag.y = e.clientY;
  const far = Math.abs(e.clientX - Drag.sx) + Math.abs(e.clientY - Drag.sy) > 8;
  if (Drag.btn === 0) {
    if (far) Drag.active = true;
    if (Drag.active) { const b = $('selbox'); b.hidden = false; b.style.left = Math.min(Drag.sx, e.clientX) + 'px'; b.style.top = Math.min(Drag.sy, e.clientY) + 'px'; b.style.width = Math.abs(e.clientX - Drag.sx) + 'px'; b.style.height = Math.abs(e.clientY - Drag.sy) + 'px'; }
  } else if (Drag.btn === 2 && Drag.start) {
    const g = state.renderer.groundFromScreen(e.clientX, e.clientY);
    if (g && Math.hypot(g.x - Drag.start.x, g.z - Drag.start.z) > 3) { Drag.active = true; const lay = layoutLine(Drag.start, g); Drag.ghost = lay ? lay.ghost : null; Drag.line = [Drag.start.x, Drag.start.z, g.x, g.z]; }
    else { Drag.active = false; Drag.ghost = null; Drag.line = null; }
  }
});
function boxSelect(x0, y0, x1, y1, add) {
  const sim = state.sim; const pt = {}; const found = [];
  for (const sq of ownSquads()) {
    let inside = false;
    for (const uid of sq.unitIds) { const u = sim.units[uid]; if (u.dead) continue; state.renderer.project(u.x, u.y + 1, u.z, pt); if (pt.visible && pt.x >= x0 && pt.x <= x1 && pt.y >= y0 && pt.y <= y1) { inside = true; break; } }
    if (inside) found.push(sq.id);
  }
  if (!add) state.selected = found; else for (const id of found) if (!state.selected.includes(id)) state.selected.push(id);
  if (found.length) AUDIO.play('ui');
}
// Total War style: the dragged line is the formation's front; drag direction sets facing, length sets width.
function layoutLine(a, b) {
  const sim = state.sim; const sqs = state.selected.map(id => sim.squads[id]).filter(sq => sq && sq.alive); if (!sqs.length) return null;
  const dx = b.x - a.x, dz = b.z - a.z; const L = Math.hypot(dx, dz) || 1; const ux = dx / L, uz = dz / L;
  const facing = Math.atan2(dx, dz) + Math.PI / 2;
  sqs.sort((p, q) => ((p.cx - a.x) * ux + (p.cz - a.z) * uz) - ((q.cx - a.x) * ux + (q.cz - a.z) * uz));
  const total = sqs.reduce((s, sq) => s + sq.aliveCount * S.spacingOf(sq.def), 0) || 1;
  let cursor = 0; const out = [], ghost = [];
  for (const sq of sqs) {
    const sp = S.spacingOf(sq.def); const w = L * (sq.aliveCount * sp) / total;
    const cols = sq.def.ai === 'cannon' ? 1 : Math.max(1, Math.min(sq.aliveCount, Math.round(w / sp)));
    const cx = a.x + ux * (cursor + w / 2), cz = a.z + uz * (cursor + w / 2); cursor += w;
    out.push({ sq, cx, cz, cols });
    const fx = Math.sin(facing), fz = Math.cos(facing), rx = -Math.cos(facing), rz = Math.sin(facing);
    // a mandarin-duck team stands in its own 鴛鴦陣 layout (leader, shields, brushes, spears, tridents), not a line
    if (sq.def.yuanyang && sq.formation !== S.FORM_COLUMN && S.YY_SLOT) { sq.unitIds.forEach((uid, i) => { const u = sim.units[uid]; if (!u || u.dead) return; const r = S.YY_SLOT[i % 12], lat = r[0] * 0.92, dep = r[1] * 0.82; ghost.push([cx + rx * lat + fx * dep, cz + rz * lat + fz * dep, facing]); }); }
    else for (let i = 0; i < sq.aliveCount; i++) { const [lat, dep] = S.slotOffset(sq.formation, i, sq.aliveCount, sp, cols); ghost.push([cx + rx * lat + fx * dep, cz + rz * lat + fz * dep, facing]); }
  }
  return { out, facing, ghost };
}
function lineOrder(a, b) {
  if (noOrders()) return;
  const lay = layoutLine(a, b); if (!lay) { toast('Select a squad first'); return; }
  for (const o of lay.out) Input.cmds.push([o.sq.id, S.ORD_MOVE, +o.cx.toFixed(2), +o.cz.toFixed(2), Math.round(lay.facing * 1000), o.cols]);
  AUDIO.play('ui');
}
canvas.addEventListener('wheel', (e) => {
  if (state.screen !== 'game') return; e.preventDefault();
  const mh = localHero();
  if (mh && mh.manE >= 0 && !Input.cmdMode) { Input.pitch = Math.max(-1.45, Math.min(1.45, Input.pitch + (e.deltaY < 0 ? 1 : -1) * 0.0087)); return; } // on a gun the wheel lays it half a degree at a time
  if (Input.cmdMode) { const r = state.renderer; if (r) r.cmdCam.h = Math.max(22, Math.min(200, r.cmdCam.h * (e.deltaY > 0 ? 1.15 : 0.87))); }
  else if (!tapAttack(e.deltaY < 0 ? S.DIR_UP : S.DIR_DOWN)) { Input.pressed |= S.A_SWAP; Input.ads = false; }
}, { passive: false });
function requestLock() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
document.addEventListener('pointerlockchange', () => {
  Input.locked = document.pointerLockElement === canvas;
  if (state.screen === 'game' && !Input.cmdMode) { $('pause').hidden = Input.locked || DEP.open || !!state.zheDlg; pauseLook(); }
  if (!Input.locked) { Input.lmb = false; Input.rmb = false; Input.keys = 0; }
});
// in a story you are one soldier, not a commander: a small, quiet prompt that doesn't cover the scene
function pauseLook() { const pz = $('pause'), M = state.sim && state.sim.mission, story = !!(M && (M.soldier || M.camp)); pz.classList.toggle('story', story);
  const h = pz.querySelector('h2'), p = pz.querySelector('p'); if (story && h.dataset.k !== 's') { h.dataset.k = 's'; h.textContent = 'Click to continue'; p.textContent = ''; } else if (!story && h.dataset.k !== 'c') { h.dataset.k = 'c'; h.textContent = 'Click to take command'; p.innerHTML = 'The battle keeps running while you are away. Press <kbd>O</kbd> any time for the command view.'; } }
$('pause').addEventListener('click', () => { if (state.screen === 'game') requestLock(); });
function storyLock() { const s = state.sim; return !!(s && s.mission && (s.mission.soldier || s.mission.camp)); } // story chapters: no overview, no other men's bodies, no fleets
function toggleCmd(force) {
  closeOrders();
  const want = force === undefined ? !Input.cmdMode : force;
  if (want && storyLock()) { Input.cmdMode = false; $('cmdui').hidden = true; const now = performance.now(); if (now - (state.lockToast || 0) > 3000) { state.lockToast = now; toast('One man in the ranks: no overview here'); } return; }
  Input.cmdMode = want; $('cmdui').hidden = !want;
  if (want) { if (document.pointerLockElement) document.exitPointerLock(); $('pause').hidden = true; const h = localHero(), r = state.renderer; if (h && r) { const sqs = ownSquads(); let ax = h.x, az = h.z; if (sqs.length) { let sx = 0, sz = 0; for (const sq of sqs) { sx += sq.cx; sz += sq.cz; } ax = (h.x + sx / sqs.length) / 2; az = (h.z + sz / sqs.length) / 2; } r.cmdCam.x = ax; r.cmdCam.z = az; r.cmdCam.h = Math.max(r.cmdCam.h, 70); } Input.lmb = false; Input.rmb = false; Input.ads = false; Input.mouseMoved = false; }
  else { requestLock(); const h = localHero(); if (h) { Input.yaw = h.yaw; } }
  updateCmdButtons();
}
// ---------- command mode ----------
function ownSquads() { const sim = state.sim; const p = sim.players[state.localIdx]; return p ? p.squads.map(id => sim.squads[id]).filter(s => s.alive) : []; }
function noOrders() { if (state.sim && state.sim.chaos) { toast('Chaos! No orders here, just fight (O for the command view, then U to jump into any of your men)'); return true; } return false; }
function order(type, x, z, facing, param) {
  if (noOrders()) return;
  const sim = state.sim; if (!sim) return;
  if (!state.selected.length) { toast('Select a squad first'); return; }
  for (const sid of state.selected) { const sq = sim.squads[sid]; if (!sq || !sq.alive) continue; let f = facing; if (f === undefined || f === null) f = sq.facing; Input.cmds.push([sid, type, +(x || 0).toFixed(2), +(z || 0).toFixed(2), Math.round(f * 1000), param | 0]); }
  AUDIO.play('ui'); if (typeof SPEECH !== 'undefined') SPEECH.orderChain(type, state.selected.slice(), param);
}
// the way a line placed at (x, z) should face: toward the enemy, weighted to the nearest companies (fallback when the field is empty)
function enemyFacing(x, z, team, fallback) { const sim = state.sim; let sx = 0, sz = 0, n = 0; for (const e of sim.squads) { if (!e.alive || e.team === team || e.routing || e.inactive) continue; const dx = e.cx - x, dz = e.cz - z, d2 = dx * dx + dz * dz + 25, w = e.aliveCount / (d2 * Math.sqrt(d2)); sx += dx * w; sz += dz * w; n++; } return n && (sx || sz) ? Math.atan2(sx, sz) : fallback; }
function nearestEnemySquad(sq) { const sim = state.sim; let best = null, bd = 1e18; for (const e of sim.squads) { if (!e.alive || e.team === sq.team) continue; const d = (e.cx - sq.cx) ** 2 + (e.cz - sq.cz) ** 2; if (d < bd) { bd = d; best = e; } } return best; }
function orderCharge() {
  if (noOrders()) return;
  const sim = state.sim; if (!state.selected.length) { toast('Select a squad first'); return; }
  for (const sid of state.selected) { const sq = sim.squads[sid]; if (!sq || !sq.alive) continue; const e = nearestEnemySquad(sq); if (!e) continue; Input.cmds.push([sid, S.ORD_CHARGE, +e.cx.toFixed(2), +e.cz.toFixed(2), Math.round(Math.atan2(e.cx - sq.cx, e.cz - sq.cz) * 1000), 0]); }
  AUDIO.play('ui');
}
function toggleFire() { const sim = state.sim; let on = 0; for (const sid of state.selected) { const sq = sim.squads[sid]; if (sq && sq.alive) { on = sq.fire ? 0 : 1; Input.cmds.push([sid, S.ORD_FIRE, 0, 0, 0, on]); } } if (typeof SPEECH !== 'undefined') SPEECH.orderChain(S.ORD_FIRE, state.selected.slice(), on); }
function toggleAuto() { const sim = state.sim; const p = sim.players[state.localIdx]; if (!p) return; Input.cmds.push([0, S.ORD_AUTO, 0, 0, 0, p.auto ? 0 : 1]); toast(p.auto ? 'You command your army' : 'AI general commands your army'); }
function takeControl() {
  const sim = state.sim; if (!state.selected.length) { toast('Select a squad to take control of'); return; }
  for (const sid of state.selected) { const sq = sim.squads[sid]; if (!sq || !sq.alive || sq.type === 'cannon') continue; const uid = sq.unitIds.find(id => !sim.units[id].dead && sim.units[id].ctrl < 0); if (uid !== undefined) { Input.cmds.push([0, S.ORD_CONTROL, 0, 0, 0, uid]); return; } }
  toast('No one in that squad can be controlled');
}
function selectAll() { state.selected = ownSquads().map(s => s.id); }
function returnToCommander() {
  const sim = state.sim; const p = sim.players[state.localIdx]; const c = sim.units[p.commanderId];
  if (!c || c.dead) { toast('Your commander has fallen'); return; }
  if (p.heroId === c.id) { toast('You already are the commander'); return; }
  Input.cmds.push([0, S.ORD_CONTROL, 0, 0, 0, c.id]);
}
function squadScreen(sq, out) { const r = state.renderer; let x = sq.cx, z = sq.cz; if (r.fog && sq.team !== r.localTeam && !r.seenSq[sq.id]) { const ls = r.lastSeen[sq.id]; if (!ls) { out.visible = false; return out; } x = ls.x; z = ls.z; } const y = S.terrainH(x, z) + 2.5; return r.project(x, y, z, out); }
function pickSquad(mx, my, own) {
  const sim = state.sim; const pt = {}; let best = null, bd = 60 * 60; const myTeam = state.sim.players[state.localIdx].team;
  for (const sq of sim.squads) {
    if (!sq.alive) continue; if (own && sq.owner !== state.localIdx) continue; if (!own && sq.team === myTeam) continue;
    squadScreen(sq, pt); if (!pt.visible) continue;
    let d = (pt.x - mx) ** 2 + (pt.y - my) ** 2;
    for (const uid of sq.unitIds) { const u = sim.units[uid]; if (u.dead) continue; state.renderer.project(u.x, u.y + 1, u.z, pt); if (pt.visible) { const du = (pt.x - mx) ** 2 + (pt.y - my) ** 2 + 400; if (du < d) d = du; } }
    if (d < bd) { bd = d; best = sq; }
  }
  return best;
}
function cmdSelect(mx, my, add) {
  const sq = pickSquad(mx, my, true);
  if (!sq) { if (!add) state.selected = []; return; }
  if (add) { const i = state.selected.indexOf(sq.id); if (i >= 0) state.selected.splice(i, 1); else state.selected.push(sq.id); }
  else state.selected = [sq.id];
  AUDIO.play('ui');
}
function cmdOrderAt(mx, my) {
  if (noOrders()) return;
  const sim = state.sim; if (!state.selected.length) { toast('Select a squad first'); return; }
  const enemy = pickSquad(mx, my, false);
  if (enemy) { for (const sid of state.selected) { const sq = sim.squads[sid]; if (!sq || !sq.alive) continue; Input.cmds.push([sid, S.ORD_CHARGE, +enemy.cx.toFixed(2), +enemy.cz.toFixed(2), Math.round(Math.atan2(enemy.cx - sq.cx, enemy.cz - sq.cz) * 1000), 0]); } AUDIO.play('ui'); return; }
  const g = state.renderer.groundFromScreen(mx, my); if (!g) return;
  for (const sid of state.selected) { const sq = sim.squads[sid]; if (!sq || !sq.alive) continue; const f = enemyFacing(g.x, g.z, sq.team, Math.atan2(g.x - sq.cx, g.z - sq.cz)); Input.cmds.push([sid, S.ORD_MOVE, +g.x.toFixed(2), +g.z.toFixed(2), Math.round(f * 1000), 0]); }
  AUDIO.play('ui');
}
$('cmdpanel').addEventListener('click', (e) => {
  const bt = e.target.closest('button'); if (!bt) return; const c = bt.dataset.cmd;
  switch (c) { case 'charge': orderCharge(); break; case 'hold': order(S.ORD_HOLD); break; case 'follow': order(S.ORD_FOLLOW); break; case 'line': order(S.ORD_FORM, 0, 0, 0, S.FORM_LINE); break; case 'column': order(S.ORD_FORM, 0, 0, 0, S.FORM_COLUMN); break; case 'wedge': order(S.ORD_FORM, 0, 0, 0, S.FORM_WEDGE); break; case 'loose': order(S.ORD_FORM, 0, 0, 0, S.FORM_LOOSE); break; case 'fire': toggleFire(); break; case 'all': selectAll(); break; case 'control': takeControl(); break; case 'commander': returnToCommander(); break; case 'auto': toggleAuto(); break; case 'fp': toggleCmd(false); break; case 'ability': useAbility(state.selected); break; case 'naval': toast('Press K with the cursor over the target'); break; }
});
function updateCmdButtons() {
  const sim = state.sim; if (!sim) return; const p = sim.players[state.localIdx];
  $('btnAuto').classList.toggle('on', !!(p && p.auto));
  const anyFire = state.selected.some(sid => sim.squads[sid] && sim.squads[sid].fire);
  $('btnFire').classList.toggle('on', anyFire);
}
const labelPool = [];
function updateLabels() {
  const sim = state.sim, box = $('labels'); let n = 0; const pt = {}; const w = canvas.clientWidth, h = canvas.clientHeight;
  if (Input.cmdMode) for (const sq of sim.squads) {
    if (!sq.alive || sq.inactive) continue; squadScreen(sq, pt); if (!pt.visible || pt.x < -40 || pt.x > w + 40 || pt.y < 0 || pt.y > h) continue;
    let el = labelPool[n]; if (!el) { el = document.createElement('div'); el.className = 'lab'; box.appendChild(el); labelPool[n] = el; }
    n++;
    const own = sq.owner === state.localIdx, mine = sq.team === sim.players[state.localIdx].team;
    const ghost = state.renderer.fog && !mine && !state.renderer.seenSq[sq.id];
    const cls = `lab t${sq.team}${own ? ' own' : ''}${!mine ? ' enemy' : ''}${ghost ? ' ghost' : ''}${state.selected.includes(sq.id) ? ' sel' : ''}`;
    if (el.className !== cls) el.className = cls;
    const txt = ghost ? `${sq.def.name}<small>last seen ${Math.round(state.renderer.time - (state.renderer.lastSeen[sq.id] || { t: 0 }).t)}s ago</small>` : `${sq.def.name}${sq.stars ? `<small class="vet">${'★'.repeat(sq.stars)}</small>` : ''}<small>${sq.aliveCount}/${sq.count}</small>${own && sq.pendAt > sim.tick ? `<small class="m-mid">courier ${Math.ceil((sq.pendAt - sim.tick) / 30)}s</small>` : ''}${own && sq.fat > 60 ? `<small class="m-mid">${sq.fat > 85 ? 'exhausted' : 'winded'}</small>` : ''}${own && (sq.def.ai === 'ranged' || sq.def.ai === 'cannon') && sq.shots < 6 ? `<small class="m-low">${sq.dry ? 'no shot' : 'low shot'}</small>` : ''}${sq.routing ? '<small class="m-rout">ROUT</small>' : (own && moraleWord(sq) !== 'steady' ? `<small class="${moraleCls(sq)}">${moraleWord(sq)}</small>` : '')}`; if (el.dataset.txt !== txt) { el.innerHTML = txt; el.dataset.txt = txt; }
    el.dataset.sq = sq.id; el.style.transform = `translate(${pt.x.toFixed(0)}px, ${pt.y.toFixed(0)}px) translate(-50%, -100%)`; el.hidden = false;
  }
  for (let i = n; i < labelPool.length; i++) labelPool[i].hidden = true;
}
// first-person squad markers: your squads (gold, numbered — these obey you), friends (green ▲), enemies (red ▼)
const markPool = [];
function updateMarks() {
  const sim = state.sim, box = $('fpmarks'); let n = 0; const pt = {}; const w = canvas.clientWidth, h = canvas.clientHeight; const hero = localHero(); const me = sim.players[state.localIdx];
  if (false && !Input.cmdMode && hero && !hero.dead && sim.phase >= 0) { const own = me.squads; const cam = state.renderer.camera.position; // the ▲ / ▼ over other squads is switched off
    for (const sq of sim.squads) { if (!sq.alive || sq.inactive) continue; const mineSq = sq.owner === state.localIdx, ally = sq.team === me.team;
      const d = Math.hypot(sq.cx - cam.x, sq.cz - cam.z); if (mineSq) continue; if (d > (ally ? 110 : 80)) continue; // your own men carry in-world markers (renderer) if (!ally && state.renderer.fog && !state.renderer.seenSq[sq.id]) continue;
      squadScreen(sq, pt); if (!pt.visible || pt.x < 0 || pt.x > w || pt.y < 0 || pt.y > h) continue;
      let el = markPool[n]; if (!el) { el = document.createElement('div'); box.appendChild(el); markPool[n] = el; } n++;
      const idx = own.indexOf(sq.id); const sel = mineSq && (state.fpSel || []).includes(sq.id);
      const cls = 'mk ' + (mineSq ? 'own' + (sel ? ' sel' : '') : ally ? 'ally' : 'foe'); if (el.className !== cls) el.className = cls;
      const html = mineSq ? `${idx + 1}<small>${sq.def.name} ${sq.aliveCount}</small>` : ally ? '▲' : '▼'; if (el._h !== html) { el.innerHTML = html; el._h = html; }
      el.style.transform = `translate(${pt.x.toFixed(0)}px, ${(pt.y - (mineSq ? 6 : 0)).toFixed(0)}px) translate(-50%, -100%)`; el.hidden = false; } }
  for (let i = n; i < markPool.length; i++) markPool[i].hidden = true;
  allyMarks();
}
// fellow players on your side: a tag over each one's own man (name and health), one over each of his companies, and a flag where
// he has sent them, so you can see what your friend is doing and what he has ordered
const allyPool = []; const ORD_TXT = ['moving', 'charging', 'holding', 'following him', 'forming', 'firing', 'under his hand', 'fighting freely', 'ability', 'boats', 'on a directive'];
function allyMarks() {
  const sim = state.sim, R = state.renderer, box = $('fpmarks'); let n = 0; const pt = {}; const w = canvas.clientWidth, h = canvas.clientHeight; const me = sim.players[state.localIdx];
  const put = (cls, html, x, y, z, edge) => { R.project(x, y, z, pt); if (!pt.visible) { if (!edge) return; } let px = pt.x, py = pt.y;
    if (edge) { if (!pt.visible) { px = w - px; py = h - 30; } px = Math.max(40, Math.min(w - 40, px)); py = Math.max(24, Math.min(h - 30, py)); } else if (px < -40 || px > w + 40 || py < 0 || py > h) return;
    let el = allyPool[n]; if (!el) { el = document.createElement('div'); box.appendChild(el); allyPool[n] = el; } n++;
    if (el.className !== cls) el.className = cls; if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.style.transform = `translate(${px.toFixed(0)}px, ${py.toFixed(0)}px) translate(-50%, -100%)`; el.hidden = false; };
  if (me && state.net) for (let i = 0; i < sim.players.length; i++) { const p = sim.players[i]; if (i === state.localIdx || p.ai || p.team !== me.team) continue;
    const nm = escapeHtml((state.peerNames && state.peerNames[i]) || ('Player ' + (i + 1)));
    const hu = sim.units[p.heroId];
    if (hu && !hu.dead) { const hp = Math.max(0, Math.min(1, hu.hp / (hu.def.hp || 100)));
      put('mk friend', `${nm}<i style="display:block;height:3px;margin:2px auto 0;width:44px;background:#0008"><b style="display:block;height:3px;width:${(hp * 100).toFixed(0)}%;background:${hp > 0.5 ? '#7fe07a' : hp > 0.25 ? '#e8c25a' : '#e8584a'}"></b></i>▼`, (hu.px + (hu.x - hu.px) * (R.alpha || 1)), hu.y + 2.35, (hu.pz + (hu.z - hu.pz) * (R.alpha || 1)), true); }
    for (const id of p.squads || []) { const sq = sim.squads[id]; if (!sq || !sq.alive || sq.inactive) continue; const ord = sq.routing ? 'routing' : (ORD_TXT[sq.order] || '');
      const cam = R.camera.position; const far = Math.hypot(sq.cx - cam.x, sq.cz - cam.z); if (!Input.cmdMode && far > 140) continue;
      put('mk friendsq', `${nm} · ${sq.def.name}<small>${sq.aliveCount} · ${ord}</small>`, sq.cx, S.terrainH(sq.cx, sq.cz) + 3.2, sq.cz, false);
      if ((sq.order === 0 || sq.order === 1) && sq.tx !== undefined && Math.hypot(sq.tx - sq.cx, sq.tz - sq.cz) > 4) put('mk friendord', `⚑<small>${nm}: ${sq.order === 1 ? 'charge' : 'move'}</small>`, sq.tx, S.terrainH(sq.tx, sq.tz) + 0.4, sq.tz, false); } }
  for (let i = n; i < allyPool.length; i++) allyPool[i].hidden = true;
}
function cmdCamUpdate(dt) {
  const r = state.renderer; if (!r || !Input.cmdMode) return; const c = r.cmdCam; const sp = c.h * 1.1 * dt;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw);
  if (Input.keys & S.KEY_W) { c.x += fx * sp; c.z += fz * sp; } if (Input.keys & S.KEY_S) { c.x -= fx * sp; c.z -= fz * sp; }
  if (Input.keys & S.KEY_D) { c.x += rx * sp; c.z += rz * sp; } if (Input.keys & S.KEY_A) { c.x -= rx * sp; c.z -= rz * sp; }
  const m = Input.mouse, w = canvas.clientWidth, h = canvas.clientHeight, edge = 14;
  if (!Input.mouseMoved) return;
  if (m.x < edge && m.x >= 0) { c.x -= rx * sp; c.z -= rz * sp; } if (m.x > w - edge && m.x <= w) { c.x += rx * sp; c.z += rz * sp; }
  if (m.y < edge && m.y >= 0) { c.x += fx * sp; c.z += fz * sp; } if (m.y > h - edge && m.y <= h) { c.x -= fx * sp; c.z -= fz * sp; }
  c.x = Math.max(-S.HALF, Math.min(S.HALF, c.x)); c.z = Math.max(-S.HALF, Math.min(S.HALF, c.z));
}
// ---------- game ----------
function startGame(msg, me, net, delay) {
  if (msg.mode === 'beacon') msg = Object.assign({}, msg, { mode: 'campaign', mission: 'beacon' });
  // a story battle: the weapons you chose from your arsenal come with you (solo; the choice rides in the config)
  if (!net && msg.mode === 'campaign' && typeof arsKitFor === 'function' && S.MISSIONS[msg.mission] && S.MISSIONS[msg.mission].soldier) { const wk = arsKitFor(msg.mission); if (wk && msg.players[me | 0]) msg = Object.assign({}, msg, { players: msg.players.map((p, i) => i === (me | 0) ? Object.assign({}, p, { wkit: wk }) : p) }); }
  if (msg.mode === 'siege') msg = Object.assign({}, msg, { mode: 'assault', op: S.OPS[msg.op] && S.OPS[msg.op].siege ? msg.op : 'ningyuan_siege' }); // the Siege menu mode is an assault operation fought over a walled town
  const cfg = { seed: msg.seed, battle: msg.battle || 'field', mode: msg.mode || 'standard', chapter: msg.chapter | 0, scen: msg.scen || 'ningyuan', players: msg.players.map(p => ({ name: p.name, team: p.team, army: p.army, mounted: p.mounted, hclass: p.hclass | 0, veterans: p.veterans, recruits: p.recruits, role: p.role, kit: p.kit, wkit: p.wkit, command: p.command | 0, arms: p.arms || null })) };
  if (msg.soldier) cfg.soldier = msg.soldier; if (msg.mission) cfg.mission = msg.mission; if (msg.op) cfg.op = msg.op; if (msg.camp) cfg.camp = msg.camp;
  msg.players.forEach((p, i) => { if (p.yyRole) cfg.players[i].yyRole = p.yyRole; });
  state.localIdx = me; state.delay = delay; state.peerNames = msg.players.map(p => p.name);
  state.replay = { cfg, inputs: [] }; state.replayMode = false;
  state.sim = new S.Sim(cfg);
  state.peerNames = state.sim.players.map((p, i) => msg.players[i] && state.sim.mode !== 'story' ? msg.players[i].name : p.name);
  $('cmdui').classList.toggle('chaos', state.sim.chaos); $('fporders').classList.toggle('chaos', state.sim.chaos);
  if (state.renderer) { try { state.renderer.renderer.dispose(); } catch (e) { } }
  state.renderer = new RENDER.Renderer(canvas, state.sim, me);
  state.ls = new Lockstep(msg.players.length, me, delay);
  msg.players.forEach((p, i) => { if (p.connected === false) state.ls.disconnect(i); });
  for (const [p, k, d] of state.pendingInputs) state.ls.onRemote(p, k, d); state.pendingInputs = [];
  state.selected = []; state.ended = false; state.acc = 0; state.stalled = false; state.started = true; state.slowT = 0;
  Input.cmdMode = false; Input.keys = 0; Input.lmb = false; Input.rmb = false; Input.ads = false; Input.pressed = 0; Input.cmds = []; Input.bayonet = false;
  const hero = localHero(); if (hero) { Input.yaw = hero.yaw; Input.pitch = 0; state.lastHeroId = hero.id; }
  show('game'); $('cmdui').hidden = true; $('pause').hidden = false; setTimeout(pauseLook, 0); $('vitals').hidden = false; $('army').hidden = false; $('cmdpanel').hidden = false; $('cmdtitle').textContent = 'Command view';
  $('cmdhelp').textContent = 'Left-click or drag a box to select (Shift adds) · Right-click to move, right-drag to lay out a line · Right-click an enemy to charge';
  $('heroName').textContent = cfg.players[me].name; $('feed').innerHTML = '';
  const bd = state.sim ? state.sim.bdef : S.BATTLES[cfg.battle];
  state.beatDone = {}; $('abil').hidden = !state.sim.heroMode; if (state.sim.heroMode) setTimeout(() => storyCard(state.sim.scen.text[0] + '. Z whirlwind · X dragon charge · C iron guard · V war cry · G valor when fury is full.', state.sim.scen.name + ' · Phase I'), 600);
  if (cfg.mode === 'story') { const T = STORY_TEXT[cfg.chapter | 0], side = state.sim.players[me].team; setTimeout(() => storyCard(T.intro[side], `Chapter ${(cfg.chapter | 0) + 1} · ${T.title} · ${T.year}`), 600); } else if (!state.sim.heroMode && cfg.mode !== 'soldier' && !state.sim.mission) toast(`${bd.jp} · ${bd.name} · ${bd.when}`);
  if (cfg.mode === 'soldier' && typeof soldierStart === 'function') soldierStart(msg);
  if (state.sim.mission && typeof missionStart === 'function') missionStart();
  if (cfg.mode === 'duel') setTimeout(() => toast('決鬥 · Duel — first to 5 rounds. Round 1: fight!'), 600);
  if (cfg.mode !== 'story' && cfg.mode !== 'heroes' && cfg.mode !== 'soldier' && cfg.mode !== 'duel' && !state.sim.mission) setTimeout(() => { if (state.screen === 'game' && !state.ended) toast('Deployment: O to place your squads · Enter when ready'); }, 3000);
  state.renderer.resize();
  MUSIC.setMuted(!$('musicIn').checked); MUSIC.play('muster'); MUSIC.setIntensity(0.4);
  requestLock();
}
function collectInput() {
  const hero = localHero(); const gun = gunMode();
  let acts = Input.pressed; Input.pressed = 0;
  if (Input.cmdMode) acts |= S.A_CMD;
  if (!gun) { if (Input.lmb || Input.tapAtk) acts |= S.A_ATK; Input.tapAtk = false; if (Input.rmb) acts |= S.A_BLOCK; acts &= ~S.A_FIRE; }
  else if (bowMode()) { if (Input.bowHeld) acts |= S.A_AIM; }
  else { if (Input.ads) acts |= S.A_AIM; }
  const yawQ = ((Math.round(Input.yaw / (Math.PI * 2) * 65536) % 65536) + 65536) % 65536;
  const pitchQ = Math.round(Input.pitch * 10000);
  const cmds = Input.cmds; Input.cmds = []; const wsel = Input.wsel; Input.wsel = 0;
  return [Input.cmdMode ? 0 : Input.keys, yawQ, pitchQ, acts, Input.atkDir, Input.blockDir, cmds, wsel];
}
function combatLog(text, col) {
  let el = document.getElementById('clog'); if (!el) { el = document.createElement('div'); el.id = 'clog'; el.style.cssText = 'position:fixed;left:16px;bottom:118px;z-index:30;pointer-events:none;font:600 13px/1.35 Georgia,serif;text-shadow:0 1px 2px #000,0 0 6px #000;display:flex;flex-direction:column;align-items:flex-start;gap:1px;max-width:60vw'; document.body.appendChild(el); }
  const ln = document.createElement('div'); ln.textContent = text; ln.style.color = col; ln.style.transition = 'opacity .8s'; el.appendChild(ln); while (el.children.length > 5) el.removeChild(el.firstChild);
  setTimeout(() => { ln.style.opacity = '0'; }, 3800); setTimeout(() => { ln.remove(); }, 4700);
}
function handleEvents(events) {
  const sim = state.sim;
  for (const ev of events) { if (ev.t === 'duelround') { const me = sim.players[state.localIdx]; const won = me && ev.winner === me.team; toast(ev.winner < 0 ? `Round ${ev.round}: both fall · ${ev.score[0]} – ${ev.score[1]}` : `Round ${ev.round} to ${won ? 'you' : 'them'} · ${me && me.team === 1 ? ev.score[1] + ' – ' + ev.score[0] : ev.score[0] + ' – ' + ev.score[1]}`); }
    if (ev.t === 'duelstart') toast(`Round ${ev.round}: fight!`); }
  for (const ev of events) if (ev.t === 'deploy' && ev.p === state.localIdx && ev.rekit) toast(`No ${ev.rekit} left in the fight: you take up their arms in the nearest company`);
  { const me = sim.players[state.localIdx]; for (const ev of events) if (ev.t === 'hit' && me && ev.id === me.heroId && ev.att >= 0) { const a = sim.units[ev.att], h = sim.units[me.heroId]; if (!a || !h) continue;
      const d = Math.hypot(a.x - h.x, a.z - h.z); state.hitDir = { ang: Math.atan2(a.x - h.x, a.z - h.z), t: 2.2 };
      const what = ev.cause === 'melee' ? 'Cut by' : ev.cause === 'arrow' ? 'Arrow from' : ev.cause === 'explosion' ? 'Blast from' : 'Shot by';
      state.hitBy = { text: `${what} ${a.type === 'hero' ? 'an enemy general' : 'a ' + a.def.name.replace(/s$/, '').replace(/men$/, 'man')}${ev.cause === 'melee' ? '' : ` · ${Math.round(d)} m`}${ev.killed ? ' — fatal' : ''}`, t: ev.killed ? 6 : 2.6 }; } }
  { const me = sim.players[state.localIdx]; if (me) for (const ev of events) if (ev.t === 'hit' && ev.dmg >= 1 && ev.id !== ev.att && (ev.att === me.heroId || ev.id === me.heroId)) { /* the battle log, after Bannerlord: what each blow did */
      const v = sim.units[ev.id]; if (!v || v.type === 'horse') continue; const mine = ev.att === me.heroId, d = Math.round(ev.dmg);
      combatLog(mine ? `Delivered ${d} damage${ev.cause === 'headshot' ? ' · head shot' : ''}${ev.killed ? ' · he goes down' : ''}` : `Received ${d} damage`, mine ? (ev.killed ? '#ffd27a' : '#f2ead8') : '#ff8a7a'); } }
  if (sim.real && typeof soldierEvent === 'function') for (const ev of events) soldierEvent(ev);
  if (sim.mission && typeof missionEvent === 'function') for (const ev of events) missionEvent(ev);
  if (sim.sg) for (const ev of events) siegeEvent(ev);
  if (typeof SPEECH !== 'undefined') for (const ev of events) SPEECH.event(ev);
  if (typeof zheEvent === 'function') for (const ev of events) zheEvent(ev);
  for (const ev of events) {
    if (ev.t === 'control' && ev.p === state.localIdx) { const u = sim.units[ev.id]; toast(u.type === 'hero' ? 'Back in the saddle, Commander' : `You take command of a ${u.def.name.replace(/men$/, 'man').replace(/Infantry/, 'infantryman')}`); state.lastHeroId = u.id; Input.ads = false; toggleCmd(false); Input.yaw = u.yaw; }
    else if (ev.t === 'death') {
      const u = sim.units[ev.id];
      if (u.ctrl >= 0 && u.ctrl !== state.localIdx) feed(`${state.peerNames[u.ctrl]} fell`);
      if (ev.killer >= 0) { const k = sim.units[ev.killer]; if (k && k.ctrl === state.localIdx && u.type !== 'horse') feed(`You slew a ${u.def.name.replace(/men$/, 'man').replace(/Infantry/, 'infantryman')}${ev.cause === 'headshot' ? ' — headshot' : ev.cause === 'trample' ? ' under your horse' : ''}`, true); }
    }
    else if (ev.t === 'squaddead') { const sq = sim.squads[ev.sq]; if (sq.owner === state.localIdx) feed(`Your ${sq.def.name} are wiped out`); }
    else if (ev.t === 'end') { state.slowT = 3.2; finish(ev.winner); }
    else if (ev.t === 'battle') { toast('The battle begins'); MUSIC.play(sim.heroMode ? 'siege' : 'battle'); MUSIC.setIntensity(0.6); }
    else if (ev.t === 'rout') { const sq = sim.squads[ev.sq]; if (sq.owner === state.localIdx) feed(`Your ${sq.def.name} are routing!`); else if (sq.team !== sim.players[state.localIdx].team) feed(`Enemy ${sq.def.name} break and run`, true); }
    else if (ev.t === 'rallied') { const sq = sim.squads[ev.sq]; if (sq.owner === state.localIdx) feed(`Your ${sq.def.name} rally`); }
    else if (ev.t === 'rally' && ev.p === state.localIdx) { toast(ev.n ? `Rally! ${ev.n} squad${ev.n === 1 ? '' : 's'} take heart` : 'No one close enough to hear you'); }
    else if (ev.t === 'commanderdown' && sim.heroMode) { if (ev.p !== state.localIdx) feed(`${state.peerNames[ev.p] || sim.players[ev.p].name} has fallen`, sim.players[ev.p].team !== sim.players[state.localIdx].team); }
    else if (ev.t === 'commanderdown') { if (ev.p === state.localIdx) toast('Your commander has fallen. Your army wavers.'); else feed(`${state.peerNames[ev.p]}'s commander has fallen`); }
    else if (ev.t === 'capture') { const o = sim.objectives[ev.obj]; const mine = ev.team === sim.players[state.localIdx].team; feed(`${mine ? 'We hold' : 'The enemy takes'} ${o.name}`, mine); }
    else if (ev.t === 'lost') { const o = sim.objectives[ev.obj]; const mine = ev.team === sim.players[state.localIdx].team; if (mine) feed(`We are losing ${o.name}!`); }
    else if (ev.t === 'captain') { const sq = sim.squads[ev.sq]; if (sq.owner === state.localIdx) feed(`The captain of your ${sq.def.name} is down. Their banner falls`); else if (sq.team !== sim.players[state.localIdx].team) feed(`Enemy ${sq.def.name} lose their captain`, true); }
    else if (ev.t === 'ability') { const sq = sim.squads[ev.sq]; const A = S.ABILITY[ev.kind]; if (sq.owner === state.localIdx) feed(`${sq.def.name}: ${A.name}!`, true); else if (sq.team !== sim.players[state.localIdx].team && (ev.kind === 'kiai' || ev.kind === 'wedge' || ev.kind === 'canister')) feed(`Enemy ${sq.def.name}: ${A.name}`); }
    else if (ev.t === 'navalcall') { const mine = ev.team === sim.players[state.localIdx].team; toast(mine ? 'The war junks open fire. Shells inbound in 4 seconds' : 'Red flare! Enemy war junks firing. Get clear!'); }
    else if (ev.t === 'misfire') { const u = sim.units[ev.id]; if (u && u.ctrl === state.localIdx) toast('Misfire! The powder is damp'); }
    else if (ev.t === 'lightning') { /* the flash says it all */ }
    else if (ev.t === 'hphase') { MUSIC.accent('phase'); storyCard(ev.text, ['Phase I', 'Phase II', 'Phase III'][ev.ph]); }
    else if (ev.t === 'breach') { toast('THE GATE IS BREACHED!'); MUSIC.accent('breach'); }
    else if (ev.t === 'ladderup') { const mine = sim.players[state.localIdx].team === 1; toast(mine ? 'A ladder is up! Over the wall!' : 'Ladder on the wall! Throw it down!'); }
    else if (ev.t === 'ladderdown') feed('A ladder is thrown down, men falling with it', sim.players[state.localIdx].team === 0);
    else if (ev.t === 'ramdown') { const mine = sim.players[state.localIdx].team === 0; toast(mine ? 'The ram is destroyed!' : 'Our ram is burning!'); }
    else if (ev.t === 'oil') feed('Burning oil pours from the walls!', sim.players[state.localIdx].team === 0);
    else if (ev.t === 'streak') { const me = localHero(); if (me && ev.id === me.id) toast(`${ev.n} men fall before you!`); else feed(`${state.peerNames[sim.units[ev.id].ctrl] || 'A champion'} has cut down ${ev.n} men`); }
    else if (ev.t === 'respawn' && ev.p === state.localIdx) { toast('You return to the fight'); }
    else if (ev.t === 'guardcounter') { const me = localHero(); if (me && ev.by === me.id) feed('Countered! Your iron guard staggers the attacker', true); else if (me && ev.att === me.id) feed('Countered! Break an iron guard with a kick (E) or a bomb'); }
    else if (ev.t === 'classpick' && ev.p === state.localIdx) { const h = localHero(); toast(h && !h.dead && h.hclass === ev.c ? `You are now a ${S.HCLASS[ev.c].name}` : `${S.HCLASS[ev.c].name} chosen for your return`); }
    else if (ev.t === 'pickup') { const me = localHero(); if (me && ev.id === me.id) toast('Ginseng and spirit: wounds bound, breath restored'); }
    else if (ev.t === 'fizzle') { const me = localHero(); if (me && ev.id === me.id) toast('The rain soaks the fire lance: it sputters'); }
    else if (ev.t === 'rocketcall') { const mine = ev.team === sim.players[state.localIdx].team; if (!mine) toast('Red flare: fire-arrow rockets incoming!'); }
    else if (ev.t === 'flank') { const sq = sim.squads[ev.sq]; const r = state.renderer; if (sq.team !== sim.players[state.localIdx].team && (!r.fog || r.seenSq[sq.id])) feed(`Enemy ${sq.def.name} swing wide for your flank!`); }
    else if (ev.t === 'reserve') { const sq = sim.squads[ev.sq]; if (sq.team !== sim.players[state.localIdx].team) { if (!state.renderer.fog || state.renderer.seenSq[sq.id]) feed(`The enemy commits his reserve: ${sq.def.name}`); } else if (sq.owner !== state.localIdx) feed(`Allied reserve committed: ${sq.def.name}`, true); }
    else if (ev.t === 'weather') toast({ fog: 'A thick fog rolls in: muskets reach shorter, eyes see less', rain: 'Rain sweeps the field: matchlocks will misfire, fires die', clear: 'The rain passes; powder dries', foglift: 'The fog lifts' }[ev.kind]);
    else if (ev.t === 'raiding') { const mine = ev.team === sim.players[state.localIdx].team; if (mine) toast('Raiders at our supply wagons!'); }
    else if (ev.t === 'wagonburn') { const mine = ev.team === sim.players[state.localIdx].team; if (mine) toast('A supply wagon burns! Powder and shot lost, the men lose heart'); else feed('An enemy supply wagon goes up in flames', true); }
    else if (ev.t === 'wave') { MUSIC.accent('wave'); const mine = ev.team === sim.players[state.localIdx].team; toast(mine ? `Reinforcements! ${ev.name.replace(' (reserve)', '')}'s corps marches onto the field` : `Enemy reinforcements arrive: ${ev.name.replace(' (reserve)', '')}'s corps`); }
    else if (ev.t === 'veteran') { const sq = sim.squads[ev.sq]; if (sq.owner === state.localIdx) feed(`Your ${sq.def.name} are now veterans ${'★'.repeat(ev.stars)}`, true); }
    else if (ev.t === 'courier' && ev.p === state.localIdx && ev.delay > 45) { const now = performance.now(); if (now - (state.courierToast || 0) > 4000) { state.courierToast = now; toast(`Couriers ride out: orders arrive in ${Math.ceil(ev.delay / 30)}s. Stay closer to command faster`); } }
    else if (ev.t === 'evade') { const me = localHero(); if (me && ev.id === me.id) feed('Evaded!', true); }
    else if (ev.t === 'tired') { const me = localHero(); if (me && ev.id === me.id) toast('Out of breath. Back off and recover'); }
    else if (ev.t === 'guardbreak') { const me = localHero(); if (me && ev.id === me.id) feed('Your guard is kicked open!'); }
    else if (ev.t === 'spearwall' && ev.att !== undefined) { const me = localHero(); if (me && ev.att === me.id) feed('Braced spears stop your charge. Dash at their flank or rear'); }
    else if (ev.t === 'warcry' && ev.clash) feed('Clash of war cries! The enemy\'s cry is drowned out', true);
    else if (ev.t === 'directive') { const to = sim.players[ev.to]; if (ev.p === state.localIdx) feed(`${to.name}: "${['We attack!', 'We will hold there.', 'We are with you, sir.', 'Moving to flank!'][ev.kind]}"`, true); }
    else if (ev.t === 'chaos') { const N = ['Both fleets open fire on the field!', 'EARTHQUAKE!', 'A powder wagon explodes!', 'The thunder god walks the field!', `${ev.kind === 4 ? S.FACTION[ev.x ? 1 : 0].name : ''} are seized by battle-fury!`, 'Bloodlust sweeps the field!', 'Fresh thunder-crash bombs for everyone! (4 to throw)']; toast('⚡ ' + N[ev.kind]); }
    else if (ev.t === 'duel') { const a = sim.units[ev.a], b = sim.units[ev.b]; if (ev.p === state.localIdx) toast(`Single combat! ${b.type === 'hero' ? 'The enemy commander' : 'The ' + b.def.name.replace(/men$/, 'man') + ' captain'} accepts. No one will interfere`); else feed(`${state.peerNames[ev.p] || 'A commander'} calls out a challenge`); }
    else if (ev.t === 'duelfail' && ev.p === state.localIdx) toast('No enemy captain in front of you to challenge (look at one within 30 m)');
    else if (ev.t === 'duelend') { const me = sim.players[state.localIdx]; if (ev.team < 0) feed('The duel is broken off'); else if (ev.team === me.team) { toast('Victory in single combat! The enemy line shudders'); } else toast('Our champion has fallen…'); }
    else if (ev.t === 'laststand') { const sq = sim.squads[ev.sq]; if (sq.owner === state.localIdx) feed(`Your ${sq.def.name} make a last stand!`, true); else feed(`${sq.def.name} make a last stand`); }
    else if (ev.t === 'bounty') feed(`A commander has fallen: +${ev.pts} points to ${S.FACTION[ev.team].name}`, ev.team === sim.players[state.localIdx].team);
    else if (ev.t === 'bushido' && ev.p === state.localIdx) toast('VALOR! Fury unleashed. Faster, deadlier, the army takes heart');
    else if (ev.t === 'end') { state.slowT = 3.2; }
    else if (ev.t === 'auto' && ev.p === state.localIdx) updateCmdButtons();
    else if (ev.t === 'order' && ev.p === state.localIdx) updateCmdButtons();
  }
}
function finish(winner) {
  if (state.ended) return; state.ended = true;
  { const me0 = state.sim.players[state.localIdx]; MUSIC.sting(winner === me0.team); }
  const sim = state.sim; const me = sim.players[state.localIdx]; const won = winner === me.team;
  const t = $('resultTitle'); t.textContent = winner === 2 ? 'Mutual ruin' : won ? '勝 · Victory' : '敗 · Defeat'; t.className = winner === 2 ? 'draw' : won ? 'win' : 'lose';
  const alive = sim.teamAlive[me.team].length;
  const byPts = winner !== 2 && sim.teamAlive[0].length && sim.teamAlive[1].length;
  $('resultText').textContent = `${S.FACTION[winner === 2 ? me.team : winner].name} ${byPts ? `take the field on points (${sim.score[0]}–${sim.score[1]})` : 'hold the field'}. You killed ${me.kills} with your own hands; ${alive} of your side still stand. ${Math.round(sim.tick / 30)} seconds of battle.`;
  $('btnNext').hidden = true;
  if (sim.mode === 'story') { const ch = sim.cfg.chapter | 0, T = STORY_TEXT[ch]; $('resultText').textContent = (won ? T.win : T.lose)[me.team] + ' ' + $('resultText').textContent;
    { let lost = 0; const vets = []; for (const id of me.squads) { const q = sim.squads[id]; if (q.alive && q.aliveCount > 0) vets.push({ type: q.type, n: q.aliveCount, xp: q.xp || 0 }); else lost++; }
      const prev = campFor(me.team, ch); const chest = Math.max(300, (prev ? 0 : 0) + (won ? 1000 : 0) + 300 - lost * 120 + Math.round((me.kills || 0) * 15));
      if (won && ch + 1 < STORY_TEXT.length) { saveCampaign({ side: me.team, chapter: ch + 1, veterans: vets, chest }); $('resultText').textContent += ` Your host marches on: ${vets.length} squads, ${vets.reduce((a, v) => a + v.n, 0)} men, ${chest} taels in the war chest for reinforcements.`; } }
    if (won && ch + 1 < STORY_TEXT.length) { saveStory(me.team, ch + 1); state.storyUnlocked = Math.max(state.storyUnlocked || 0, ch + 1); $('btnNext').hidden = false; $('btnNext').textContent = `Chapter ${ch + 2}: ${STORY_TEXT[ch + 1].title} →`; $('btnNext').onclick = () => { try { localStorage.setItem('mingResume', JSON.stringify({ chapter: ch + 1, side: me.team })); } catch (e) { } location.reload(); }; $('btnNext').textContent = `War chest & Chapter ${ch + 2}: ${STORY_TEXT[ch + 1].title} →`; }
    else if (won) $('resultTitle').textContent = '勝 · The war is yours'; }
  if (sim.real && typeof soldierFinish === 'function') soldierFinish(winner);
  if (sim.mission && typeof missionFinish === 'function') missionFinish(winner);
  setTimeout(() => { $('result').hidden = false; $('btnReplay').hidden = !state.replay || state.replay.inputs.length < 60; if (document.pointerLockElement) document.exitPointerLock(); }, 3600);
}
// ---------- replay ----------
function startReplay() {
  MUSIC.play(state.sim && state.sim.heroMode ? 'siege' : 'battle'); MUSIC.setIntensity(0.6);
  const rp = state.replay; if (!rp) return;
  state.replayMode = true; state.replayTick = 0; state.replaySpeed = 1; state.replayPaused = false; state.ended = true;
  state.sim = new S.Sim(rp.cfg);
  if (state.renderer) { try { state.renderer.renderer.dispose(); } catch (e) { } }
  state.renderer = new RENDER.Renderer(canvas, state.sim, state.localIdx);
  state.selected = []; state.acc = 0; Input.cmdMode = true; Input.keys = 0;
  $('result').hidden = true; $('cmdui').hidden = false; $('cmdpanel').hidden = true; $('pause').hidden = true; $('cmdtitle').textContent = 'Replay'; $('crosshair').style.opacity = 0; $('army').hidden = true; $('hint').hidden = true; $('selbox').hidden = true;
  $('cmdhelp').textContent = 'Space pause · 1 2 3 4 speed · WASD pan · wheel zoom · Esc leave';
  state.renderer.resize(); if (document.pointerLockElement) document.exitPointerLock();
  toast('Replay · the whole battle, re-simulated from the recorded inputs');
}
function replayKey(c) {
  if (c === 'Space') state.replayPaused = !state.replayPaused;
  else if (c === 'Digit1') state.replaySpeed = 0.5; else if (c === 'Digit2') state.replaySpeed = 1; else if (c === 'Digit3') state.replaySpeed = 3; else if (c === 'Digit4') state.replaySpeed = 8;
  else if (c === 'Escape') { state.replayMode = false; $('result').hidden = false; $('cmdpanel').hidden = false; $('cmdtitle').textContent = 'Command view'; }
}
function replayFrame(dt) {
  const sim = state.sim, rp = state.replay;
  if (!state.replayPaused) {
    state.acc += dt * state.replaySpeed; let steps = 0;
    while (state.acc >= DT && steps < 24 && state.replayTick < rp.inputs.length) {
      sim.step(rp.inputs[state.replayTick++]); state.renderer.processEvents(sim.events); state.acc -= DT; steps++;
    }
    if (state.replayTick >= rp.inputs.length) state.acc = 0;
  }
  predictHero(ls); cmdCamUpdate(dt);
  state.renderer.render(Math.min(1, state.acc / DT), dt, { mode: 'cmd', yaw: Input.yaw, pitch: Input.pitch, selected: [] });
  if (state.toastT > 0) { state.toastT -= dt; if (state.toastT <= 0) $('toast').classList.remove('show'); }
  state.hudT -= dt;
  if (state.hudT <= 0) { state.hudT = 0.3; const a0 = sim.teamAlive[0].length, a1 = sim.teamAlive[1].length; $('status').innerHTML = `<span class="t0">${S.FACTION[0].jp} ${a0}</span><span class="vs">·</span><span class="t1">${a1} ${S.FACTION[1].jp}</span>`; $('netbox').innerHTML = `replay · ${Math.round(state.replayTick / 30)}s / ${Math.round(rp.inputs.length / 30)}s · ${state.replaySpeed}×${state.replayPaused ? ' · paused' : ''}${state.replayTick >= rp.inputs.length ? ' · end' : ''}`; $('army').innerHTML = ''; $('vitals').hidden = true; }
  updateLabels();
}
$('btnReplay').onclick = () => { AUDIO.init(); startReplay(); };
function feed(text, me) { const f = $('feed'); const d = document.createElement('div'); d.textContent = text; if (me) d.className = 'me'; f.appendChild(d); while (f.children.length > 6) f.removeChild(f.firstChild); setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 9000); }
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); state.toastT = 2.2; }
const DIRN = ['overhead', 'right swing', 'thrust', 'left swing'], BLKN = ['up', 'right', 'down', 'left'], ORDN = ['move', 'charge', 'hold', 'follow', 'form up', 'hold', 'hold', 'hold', 'hold', 'hold', 'hold', 'hold', 'hold', 'hold', 'hold', 'hold'];
function moraleCls(sq) { if (!sq.alive) return ''; if (sq.routing) return 'm-rout'; const m = sq.morale / sq.moraleMax; return m < 0.35 ? 'm-low' : m < 0.6 ? 'm-mid' : ''; }
function moraleWord(sq) { if (sq.routing) return 'routing'; if (sq.def.fearless) return 'fearless'; const m = sq.morale / sq.moraleMax; return m < 0.35 ? 'wavering' : m < 0.6 ? 'shaken' : 'steady'; }
// ---------- screen markers: objectives (lettered circles) and your companies (numbered), pinned to the screen edge when out of view ----------
const MARKS = { el: null, pool: [], v: null };
function helpPrompt(h, u) { // 'E · help him up' beside a downed man, and the progress while you haul him up
  let el = document.getElementById('helpprompt'); if (!el) { el = document.createElement('div'); el.id = 'helpprompt'; document.body.appendChild(el); }
  const sim = state.sim; if (!h || h.dead || !sim) { el.hidden = true; return; }
  const busy = sim.teamAlive[h.team].find(v => v.downed && v.reviveBy === h.id);
  if (busy) { el.hidden = false; el.innerHTML = `<b>扶起</b> getting him up… <i style="--p:${Math.min(100, Math.round(busy.reviveT / 45 * 100))}%"></i>`; return; }
  if (!u || !u.downed) { el.hidden = true; return; }
  const nm = typeof SPEECH !== 'undefined' ? SPEECH.nameOf(u.id) : null; el.hidden = false;
  el.innerHTML = `<kbd>E</kbd> help him up${nm ? ` · <span>${typeof nm === 'string' ? nm : nm.zh + ' ' + nm.en}</span>` : ''}`;
}
function hudMarks() {
  const sim = state.sim, r = state.renderer; if (!MARKS.el) { MARKS.el = document.createElement('div'); MARKS.el.id = 'hudmarks'; document.body.appendChild(MARKS.el); MARKS.v = new THREE.Vector3(); }
  const show = sim && r && state.screen === 'game' && !state.ended && r.lastMode === 'fp' && !(sim.mission && sim.mission.camp) && !(typeof DEP !== 'undefined' && DEP.open);
  let n = 0; const items = [];
  if (show) {
    const me = sim.players[state.localIdx];
    sim.objectives.forEach((o, i) => { if (o.hidden) return; const m = /^([A-Z]) ·/.exec(o.name || ''); const own = o.owner === me.team, foe = o.owner >= 0 && !own; const contested = (o.n0 > 0) && (o.n1 > 0);
      items.push({ x: o.x, z: o.z, y: 2.5, txt: m ? m[1] : sim.mission ? '◆' : 'ABCDEFG'[i], cls: 'obj' + (own ? ' own' : foe ? ' foe' : '') + (contested ? ' hot' : ''), name: (o.name || '').replace(/^[A-Z] · /, ''), always: true }); });
    const sel = state.fpSel || [];
    { const fq = me.soldierSq !== undefined && !(me.squads || []).includes(me.soldierSq) ? sim.squads[me.soldierSq] : null, h = localHero(); // your file, and your own place in it, before you command it
      if (fq && fq.alive && h && !h.dead) { if (Math.hypot(fq.cx - h.x, fq.cz - h.z) > 7) items.push({ x: fq.cx, z: fq.cz, y: 2.4, txt: '伍', cls: 'sq file', always: false });
        if (h.squad === fq.id && h.slotX !== undefined && Math.hypot(h.slotX - h.x, h.slotZ - h.z) > 3) items.push({ x: h.slotX, z: h.slotZ, y: 0.4, txt: '◇', cls: 'place', name: 'your place', always: true }); } }
    { const h = localHero(); let near = null, nd = 2.6; // downed and wounded comrades: a pulsing cross with the bleed-out ring, pinned to the edge when out of view
      if (h) for (const u of sim.teamAlive[me.team]) { if (!u.wounded || u === h) continue; const d = Math.hypot(u.x - h.x, u.z - h.z); if (d > 70) continue;
        { const an = state.renderer && state.renderer.anims && state.renderer.anims[u.id]; if (u.downed && an && an.dw !== undefined && an.dw < 0.95 && !an.dUp) continue; } // the cross appears once he is down, not while he is still falling
        if (u.downed) items.push({ x: u.x, z: u.z, y: 1.3, txt: '✚', cls: 'down' + (u.zfile ? ' file' : '') + (u.reviveBy >= 0 ? ' busy' : ''), always: true, bl: u.downed ? Math.max(0, Math.min(1, u.bleed / (30 * (u.zfile ? 45 : 30)))) : undefined });
        if (!h.dead && d < nd && u.downed) { nd = d; near = u; } }
      helpPrompt(h, near); }
    (me.squads || []).forEach((id, k) => { const q = sim.squads[id]; if (!q || !q.alive || q.inactive) return; const h = localHero(); if (h && Math.hypot(q.cx - h.x, q.cz - h.z) < 6) return; items.push({ x: q.cx, z: q.cz, y: 2.2, txt: String(k + 1), cls: 'sq' + (sel.includes(id) ? ' on' : ''), always: false }); });
  }
  const cam = r ? r.camera : null, W = window.innerWidth, H = window.innerHeight, h = localHero(); const used = { l: [], r: [] };
  for (const it of items) {
    const v = MARKS.v.set(it.x, S.terrainH(it.x, it.z) + it.y, it.z); const cv = v.clone().applyMatrix4(cam.matrixWorldInverse); v.project(cam);
    const behind = cv.z > 0, on = !behind && Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.9;
    if (on && !it.always) continue;
    let el = MARKS.pool[n]; if (!el) { el = document.createElement('div'); el.innerHTML = '<b></b><i></i>'; MARKS.el.appendChild(el); MARKS.pool[n] = el; } n++;
    let sx, sy, edge = '';
    if (on) { sx = (v.x * 0.5 + 0.5) * W; sy = (-v.y * 0.5 + 0.5) * H; }
    else { const right = cv.x > 0; edge = right ? ' edge r' : ' edge l'; sx = right ? W - 34 : 34; const yy = behind ? 0 : Math.max(-0.7, Math.min(0.7, v.y)); sy = (-yy * 0.5 + 0.5) * H; const U = used[right ? 'r' : 'l']; for (let k = 0; k < 8 && U.some(y0 => Math.abs(y0 - sy) < 40); k++) sy += 42; U.push(sy); }
    el.className = 'hm ' + it.cls + edge; el.firstChild.textContent = it.txt; if (it.bl !== undefined) el.style.setProperty('--bl', (it.bl * 360).toFixed(0) + 'deg'); else el.style.removeProperty('--bl');
    const d = h ? Math.round(Math.hypot(it.x - h.x, it.z - h.z)) : 0; el.lastChild.textContent = d > 4 ? d + ' m' : '';
    if (el._k === it.txt + edge && el._x !== undefined && Math.abs(el._x - sx) < 200 && Math.abs(el._y - sy) < 200) { sx = el._x + (sx - el._x) * 0.35; sy = el._y + (sy - el._y) * 0.35; } el._k = it.txt + edge; el._x = sx; el._y = sy; // smooth: company centres move in 30 Hz steps
    el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`; el.style.display = '';
  }
  for (let i = n; i < MARKS.pool.length; i++) MARKS.pool[i].style.display = 'none';
}
// ---------- 攻守城 siege: shouted orders on siege events, interaction prompts and the siege status panel ----------
const SGUI = { el: null, pr: null, t: 0 };
const SG_LINES = {
  ladderUp: [['梯子立住了，上！', "The ladder's up — climb!"], ['梯子上來了！推下去！', 'Ladder on the wall — throw it down!']],
  ladderDown: [['梯子倒了！', "The ladder's down!"], ['推倒了！', 'Down it goes!']],
  oil: [['火油！散開！', 'Burning oil — spread out!'], ['倒油！點火！', 'Pour the oil — fire!']],
  stone: [['頭上！石頭！', 'Above you — stones!'], ['放石頭！', 'Drop the stones!']],
  dock: [['雲車靠城了！上城！', 'The tower is at the wall — over!'], ['敵樓靠上來了！', 'Their tower is against the wall!']],
  breach: [['城門破了！殺進去！', 'The gate is broken — in!'], ['城門破了！守住街口！', 'The gate is down — hold the street!']],
  hole: [['牆鑿穿了！', "We're through the wall!"], ['他們把牆鑿穿了！', "They've holed the wall!"]],
  saltpeter: [['城下起火了！', 'Fire at the foot of the wall!'], ['點硝！', 'Light the saltpeter!']],
  fill: [['壕溝填平了！', 'The ditch is filled!'], ['他們填了壕溝！', "They've filled the ditch!"]],
  engine: [['車毀了！', "We've lost an engine!"], ['砸爛了！', 'Smashed it!']],
  slip: [['冰上滑！抓緊！', 'The ice — hold on!'], null],
};
function sgShout(key, att, ev) { if (typeof SPEECH === 'undefined') return; const L = SG_LINES[key]; const line = L && L[att ? 0 : 1]; if (!line) return; const sim = state.sim, me = sim.players[state.localIdx], h = localHero(); if (!h) return;
  /* the shout comes from a man who is THERE, where it is happening, and only if you are near enough to hear it: nobody calls "drop the stones" while no stones fall near him */
  const ex = ev && ev.x !== undefined ? ev.x : h.x, ez = ev && ev.z !== undefined ? ev.z : h.z; if (Math.hypot(ex - h.x, ez - h.z) > 45) return;
  let best = -1, bd = 14; for (const u of sim.teamAlive[me.team]) { if (u.id === h.id || u.type === 'horse' || u.def.ai === 'cannon') continue; const d = Math.hypot(u.x - ex, u.z - ez); if (d < bd) { bd = d; best = u.id; } }
  if (best >= 0) SPEECH.say(best, line[0], line[1], { prio: 2, loud: true, shout: true, cool: 3 }); }
function siegeEvent(ev) {
  const sim = state.sim, sg = sim.sg; if (!sg) return; const me = sim.players[state.localIdx]; const att = me.team === sg.A;
  if (ev.t === 'sgladder') { sgShout(ev.up ? 'ladderUp' : 'ladderDown', att, ev); if (ev.up && !att) toast('A ladder is up! Get to the top of it and press E to throw it down'); }
  else if (ev.t === 'sgoil') sgShout('oil', att, ev); else if (ev.t === 'sgstone') sgShout('stone', att, ev); else if (ev.t === 'sgdock') { sgShout('dock', att, ev); toast(att ? 'The siege tower is against the wall — its bridge is down' : 'A siege tower has reached the wall!'); }
  else if (ev.t === 'sgbreach') { sgShout('breach', att, ev); toast(att ? 'THE GATE IS BROKEN!' : 'The gate has fallen!'); MUSIC.accent('breach'); }
  else if (ev.t === 'sghole') { sgShout('hole', att, ev); toast(att ? 'The sappers are through the wall!' : 'They have chiselled through the wall!'); }
  else if (ev.t === 'sgsaltpeter') sgShout('saltpeter', att, ev); else if (ev.t === 'sgfill') sgShout('fill', att, ev); else if (ev.t === 'sgengine') { sgShout('engine', att, ev); feed(`${{ ram: 'The covered ram', tower: 'A siege tower', cart: 'A shield cart' }[ev.kind] || 'An engine'} is destroyed`, !att); }
  else if (ev.t === 'sgslip') sgShout('slip', att, ev);
  else if (ev.t === 'sgman') { const h = localHero(); if (h && ev.id === h.id) toast(ev.on ? `Manning the ${ev.kind === 'gun' ? 'gun' : 'bed crossbow'}: aim with the mouse, left click to fire, E to leave it` : 'You leave the emplacement'); }
}
function siegeHUD(dt) {
  const sim = state.sim, sg = sim && sim.sg; if (!SGUI.el) { SGUI.el = document.createElement('div'); SGUI.el.id = 'sgbar'; document.body.appendChild(SGUI.el); SGUI.pr = document.createElement('div'); SGUI.pr.id = 'sgprompt'; document.body.appendChild(SGUI.pr); }
  if (!sg || state.ended || state.screen !== 'game') { SGUI.el.hidden = true; SGUI.pr.hidden = true; return; }
  SGUI.t -= dt; if (SGUI.t > 0) return; SGUI.t = 0.2;
  const W = S.TERR.swall, me = sim.players[state.localIdx], att = me.team === sg.A, h = localHero();
  const bar = (v) => `<i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(0)}%"></i>`;
  let s = `<b>${['一 · The ditch', '二 · The walls', '三 · The gatehouse', '四 · The streets'][Math.min(3, sim.sector)]}</b>`;
  s += `<div class="r"><span>Gate</span><em>${bar(sg.gateHp / sg.gateMax)}</em></div>`;
  for (const e of sg.engines) { if (e.kind === 'cart' && e.cover) continue; s += `<div class="r${e.hp <= 0 ? ' x' : ''}"><span>${{ ram: '衝車 Ram', tower: '雲車 Tower', cart: '洞車 Sap cart' }[e.kind]}${e.docked ? ' · at the wall' : e.atGate ? ' · at the gate' : e.burn > 0 ? ' · burning' : ''}</span><em>${bar(e.hp / e.max)}</em></div>`; }
  s += `<div class="r"><span>Ladders up</span><strong>${sg.lads.filter(L => L.up).length} / ${sg.lads.length}</strong></div>`;
  if (sg.holes.some(L => L.prog > 0 || L.up)) s += `<div class="r"><span>Sapping</span><strong>${sg.holes.map(L => L.up ? 'through' : Math.round(L.prog / 3.2) + '%').join(' · ')}</strong></div>`;
  SGUI.el.innerHTML = s; SGUI.el.hidden = false;
  // what E would do here
  let p = ''; if (h && !h.dead) { if (h.manE >= 0) p = 'E · leave the emplacement · LMB fire';
    else { for (const e of sg.emp) if (e.team === me.team && e.man < 0 && Math.hypot(e.x - h.x, e.z - h.z) < 2.6) { p = `E · man the ${e.kind === 'gun' ? 'gun' : 'bed crossbow (床弩)'}`; break; }
      if (!p) for (const L of sg.lads) { if (Math.abs(L.x - h.x) > 2.4) continue; if (!att && L.up && h.z > W.z0 && h.z < W.z0 + 3.5) { p = 'E · throw the ladder down'; break; } if (att && !L.up && h.z < W.z0 - 0.5 && h.z > W.z0 - 5 && sim.sector >= 1) { p = 'E · help raise the ladder'; break; } } } }
  SGUI.pr.textContent = p; SGUI.pr.hidden = !p;
}
function updateHUD(dt) {
  const sim = state.sim, r = state.renderer; const hero = localHero(); const me = sim.players[state.localIdx];
  if (state.toastT > 0) { state.toastT -= dt; if (state.toastT <= 0) $('toast').classList.remove('show'); }
  { // the red at the edges grows as you lose blood, and beats when you are close to the end; a hit flashes on top
    // health you can read from the screen alone: the red edge creeps in from the first wound, the colour drains,
    // the world darkens and below half it beats like a heart, faster and harder the closer you are to the end
    const hp0 = hero && !hero.dead ? Math.max(0, Math.min(1, 1 - hero.hp / hero.def.hp)) : 0, low = Math.max(0, (hp0 - 0.08) / 0.92);
    const beat = hp0 > 0.5 ? (hp0 - 0.5) * 2 : 0, ph = performance.now() / (520 - beat * 220), pulse = beat * (0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(ph)), 6)) * 0.35;
    const fl = r.hitFlash > 0 || r.imp.blur > 0.02 ? Math.min(1, r.hitFlash * 1.6 + r.imp.blur * 0.4) : 0; $('vignette').style.opacity = Math.max(fl, Math.min(1, low * 0.85 + pulse));
    // near fainting (below about a third): the colour all but goes, the view swims in and out of focus and closes in
    const fa = Math.max(0, (hp0 - 0.65) / 0.35), swim = fa > 0 ? fa * (0.55 + 0.45 * Math.sin(performance.now() / 900)) : 0;
    const cv = $('c'); if (cv && !state.dying) { const k = Math.round(low * 100) / 100, f = k > 0.01 ? `saturate(${Math.max(0.08, 1 - k * 0.7 - fa * 0.25).toFixed(2)}) brightness(${(1 - k * 0.25 - pulse * 0.25 - fa * 0.12).toFixed(2)}) contrast(${(1 + k * 0.12).toFixed(2)})${swim > 0.02 ? ` blur(${(swim * 3.2).toFixed(1)}px)` : ''}` : ''; if (cv._f !== f) { cv.style.filter = f; cv._f = f; } }
    { let t = document.getElementById('faintv'); if (!t) { t = document.createElement('div'); t.id = 'faintv'; t.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,.92) 85%)'; document.body.appendChild(t); }
      const o = (fa * (0.75 + 0.25 * Math.sin(performance.now() / 700))).toFixed(2); if (t._o !== o) { t.style.opacity = o; t._o = o; } } } $('vignette').style.transform = r.imp.blur > 0.02 ? `scale(${1 + r.imp.blur * 0.06})` : '';
  $('parry').style.opacity = r.parryFlash > 0 ? r.parryFlash : 0;
  if (hero && !hero.dead && !Input.cmdMode && sim.phase === 1) { // a horseman bearing down on you: warn in time to dodge or brace
    state.cavT = (state.cavT || 0) - dt; if (state.cavT <= 0) { for (const v of sim.teamAlive[1 - hero.team]) { if (!v.mounted || Math.abs(v.hspeed || 0) < 5.5) continue; const dx = hero.x - v.x, dz = hero.z - v.z, d = Math.hypot(dx, dz); if (d > 28 || d < 3) continue; if ((dx * Math.sin(v.yaw) + dz * Math.cos(v.yaw)) / d < 0.9) continue;
        state.cavT = 5; state.hitDir = { ang: Math.atan2(v.x - hero.x, v.z - hero.z), t: 2 }; state.renderer.hitQ = { text: hero.weapon === 'yari' ? '騎! Horse charging — brace your spear (hold RMB)' : '騎! Horse charging — slide aside (double-tap A or D)', t: 2.2, c: '#ffcf7a' }; AUDIO.play('neigh', v.x, v.y, v.z, 1.2); break; } } }
  { const hd = state.hitDir; if (hd && hd.t > 0 && hero) { hd.t -= dt; $('hitdir').style.opacity = Math.min(1, hd.t); $('hitdir').style.transform = `rotate(${(-(hd.ang - Input.yaw)) * 180 / Math.PI}deg)`; } else $('hitdir').style.opacity = 0;
    const hb = state.hitBy; if (hb && hb.t > 0) { hb.t -= dt; $('hitby').textContent = hb.text; $('hitby').style.opacity = Math.min(1, hb.t); } else $('hitby').style.opacity = 0; }
  if (sim.real && typeof soldierHUD === 'function') soldierHUD(dt); else { $('fallen').hidden = true; }
  if (sim.mission && typeof missionHUD === 'function') missionHUD(dt); else $('mobj').hidden = true;
  depHUD(dt); hudMarks(); siegeHUD(dt);
  if (sim.real && !state.replayMode) { const plain = !me.squads.length; $('cmdpanel').hidden = plain; $('fury').hidden = true; }
  { const bl = $('bombs') && $('bombs').parentNode; if (bl) bl.hidden = true; } // grenades removed
  { const hq = $('hitq'); if (r.hitQ) { hq.textContent = r.hitQ.text; hq.style.color = r.hitQ.c; hq.style.opacity = Math.min(1, r.hitQ.t * 2.5); } else hq.style.opacity = 0;
    { const me = hero; const pb = $('posture');
    if (me && !me.dead && (me.pos > 1 || me.openT > 0)) { pb.hidden = false; const mx = me.champ ? 240 : me.type === 'hero' ? 200 : 100; pb.firstChild.style.width = Math.min(100, me.pos / mx * 100) + '%'; pb.classList.toggle('hot', me.pos / mx > 0.7); } else pb.hidden = true;
    let tg = null, bd = 5; if (me && !me.dead) for (const u of sim.units) { if (u.dead || u.team === me.team || u.type === 'horse') continue; const dx = u.x - me.x, dz = u.z - me.z, d = Math.hypot(dx, dz); if (d < bd && Math.abs(((Math.atan2(dx, dz) - me.yaw + 9.42) % 6.283) - 3.14) < 0.6) { bd = d; tg = u; } }
    const tb = $('tposture'); if (tg && (tg.pos > 1 || tg.openT > 0 || tg.entT > 0)) { tb.hidden = false; const mx = tg.champ ? 240 : tg.type === 'hero' ? 200 : 100; tb.firstChild.style.width = (tg.openT > 0 ? 100 : Math.min(100, tg.pos / mx * 100)) + '%'; tb.classList.toggle('open', tg.openT > 0); tb.lastChild.textContent = tg.openT > 0 ? 'OPEN' : tg.entT > 0 ? 'SNARED' : (tg.role ? tg.role : 'posture'); } else tb.hidden = true; } }
  $('suppress').style.opacity = Input.cmdMode ? 0 : Math.min(0.85, r.suppress);
  $('speedlines').style.opacity = (r.speedLines > 0.01 && !Input.cmdMode) ? r.speedLines : 0;
  const hm = $('hitmark'); hm.style.opacity = r.hitMark > 0 ? Math.min(1, r.hitMark * 4) : 0; hm.classList.toggle('head', r.hitMarkHead);
  if (r.hitMarkPop) { hm.classList.remove('pop', 'kill'); void hm.offsetWidth; hm.classList.add(r.hitMarkPop === 2 ? 'kill' : 'pop'); r.hitMarkPop = 0; }
  const alive = hero && !hero.dead;
  if (alive && !Input.cmdMode) {
    const gun = gunMode(); const cur = Input.currentDir();
    const arrows = $('crosshair').querySelectorAll('.arr');
    arrows.forEach((a, i) => { const d = [S.DIR_UP, S.DIR_DOWN, S.DIR_LEFT, S.DIR_RIGHT][i]; let cls = 'arr ' + ['up', 'down', 'left', 'right'][i]; if (!gun) { if (hero.st === S.ST_WINDUP || hero.st === S.ST_RELEASE) { if (hero.atkDir === d) cls += ' sel atk'; } else if (hero.blocking) { cls += ' sel blk'; } } if (a.className !== cls) a.className = cls; });
    $('crosshair').style.opacity = (hero.aiming || hero.downT > 0) ? 0 : 1;
    $('hud').style.cursor = 'none';
  } else { $('crosshair').style.opacity = 0; }
  // vitals
  if (hero) {
    $('hpFill').style.width = Math.max(0, hero.hp / hero.def.hp * 100).toFixed(1) + '%';
    { // health is one number: green, amber, red; it jumps when it changes
      const hv = Math.max(0, Math.round(hero.hp)), fr = hero.hp / hero.def.hp, ht = $('hpText'); if (ht._v !== hv) { ht.textContent = hv; ht.style.color = fr > 0.6 ? '#9fdc76' : fr > 0.3 ? '#efb24a' : '#f0553f'; if (ht._v !== undefined) { ht.classList.remove('bump', 'up'); void ht.offsetWidth; ht.classList.add(hv < ht._v ? 'bump' : 'up'); } ht._v = hv; } }
    document.body.classList.toggle('storyhud', !!(sim.mission && (sim.mission.soldier || sim.mission.camp)));
    const nm = state.peerNames[state.localIdx] || 'Commander'; const label = hero.type === 'hero' ? nm : `${nm} · ${hero.def.name.replace(/men$/, 'man').replace(/Infantry/, 'infantryman')}`; if ($('heroName').textContent !== label) $('heroName').textContent = label;
    if (hero.kit) { const K = hero.kit, am = (sl, i) => { const W = S.WPN[sl.k]; if (!(W && W.gun) && !(sl.o && (sl.w === 'rifle' || sl.w === 'bow'))) return ''; const n = i === hero.kitI ? hero.ammo : sl.am; return n === undefined ? '' : ` <b>${n}</b>`; };
      const key = hero.dead ? 'x' : 'k' + K.map((s, i) => s.k + (i === hero.kitI ? '*' + hero.ammo : s.am)).join() + (hero.kitSh ? 'S' : '') + hero.weapon;
      if (state.wpnKey !== key) { state.wpnKey = key; $('wpns').innerHTML = hero.dead ? '' : K.map((s, i) => `<span class="${i === hero.kitI ? 'on' : ''}"><kbd>${i + 1}</kbd> ${s.o ? wpnName(hero.kitI === i ? hero : Object.assign({}, hero, { def: hero.baseDef }), s.w) : S.WPN[s.k].n}${am(s, i)}</span>`).join('') + (hero.kitSh ? `<span>🛡 ${hero.team === 1 ? '盾' : '藤牌'}</span>` : ''); } }
    else { const ws = hero.def.weapons || []; const key = hero.dead ? 'x' : ws.join() + hero.weapon + (hero.def.arm || ''); if (state.wpnKey !== key) { state.wpnKey = key; $('wpns').innerHTML = hero.dead ? '' : ws.map(x => `<span class="${x === hero.weapon ? 'on' : ''}">${wpnName(hero, x)}</span>`).join('') + (ws.length > 1 ? '<kbd>Q</kbd>' : ''); } }
    { let sb = document.getElementById('stam'); if (!sb) { sb = document.createElement('div'); sb.id = 'stam'; sb.innerHTML = '<i></i>'; sb.style.cssText = 'position:fixed;left:50%;bottom:86px;width:180px;height:5px;margin-left:-90px;background:rgba(0,0,0,.45);border:1px solid rgba(240,230,210,.25);border-radius:3px;overflow:hidden;pointer-events:none;transition:opacity .4s;z-index:5'; sb.firstChild.style.cssText = 'display:block;height:100%;background:#d9cfb6'; document.body.appendChild(sb); }
      const st = hero.champ ? Math.min(1, Math.max(0, (hero.sta || 0) / 100)) : 1 - Math.min(1, Math.max(0, (hero.fat || 0) / 100)); const show = !hero.dead && !Input.cmdMode && (st < 0.97 || hero.sprint);
      sb.style.opacity = show ? 1 : 0; sb.firstChild.style.width = (st * 100).toFixed(1) + '%'; sb.firstChild.style.background = hero.winded ? '#c0452e' : '#d9cfb6'; }
    const w = hero.weapon; $('weapon').textContent = hero.dead ? 'Fallen' : w === 'rifle' ? (Input.bayonet || hero.club ? (hero.def.rifle && hero.def.rifle.mag > 1 ? 'Three-eyed gun · club (X: shoot)' : 'Musket · club (X: shoot)') : (hero.def.key === 'hero' ? (me.team === 0 ? 'Niaochong musket' : 'Heavy musket') : hero.def.rifle && hero.def.rifle.mag > 1 ? 'Three-eyed gun' : 'Musket')) : w === 'revolver' ? 'Three-eyed hand cannon' : w === 'bow' ? 'Horn bow' : w === 'yari' ? 'Qiang spear' : 'Dao';
    const mounted = hero.mount >= 0 || hero.mounted;
    $('mode').textContent = hero.dead ? 'Commanding from above' : Input.cmdMode ? 'Command view' : mounted ? 'Mounted' : hero.st === S.ST_STUN ? 'Staggered' : hero.counterT > 0 ? 'Counter!' : hero.downT > 0 ? 'Knocked down' : '';
    const g = S.gunOf(hero.def, w);
    if (g) {
      const mag = g.mag || 1; const have = w === 'revolver' ? hero.ammoR : hero.ammo;
      if (bowMode()) { const q = hero.shots === undefined ? '' : ` · ${hero.shots} in the quiver`, d = Math.min(1, (hero.drawT || 0) / 0.8);
        if (hero.st === S.ST_RELOAD) { $('ammoFill').style.width = (hero.stT / Math.max(0.1, hero.reloadT) * 100).toFixed(0) + '%'; $('ammoText').textContent = 'Nocking…' + q; }
        else { $('ammoFill').style.width = (hero.ammo > 0 ? (d > 0 ? d * 100 : 100) : 0).toFixed(0) + '%'; $('ammoText').textContent = (hero.ammo > 0 ? (d > 0 ? (d >= 1 ? 'Full draw · let go' : 'Drawing…') : 'Hold LMB to draw') : 'No arrow') + q; } }
      else if (hero.st === S.ST_RELOAD && hero.reloadT > 0.6) { $('ammoFill').style.width = (hero.stT / hero.reloadT * 100).toFixed(1) + '%'; $('ammoText').textContent = mag > 1 ? `Reloading… ${have}/${mag}` : 'Reloading…'; }
      else { $('ammoFill').style.width = (have / mag * 100).toFixed(0) + '%'; $('ammoText').textContent = mag > 1 ? `${'●'.repeat(have)}${'○'.repeat(mag - have)}${have === 0 ? ' · R reload · X club' : ''}` : (have > 0 ? 'Loaded' : 'Empty · R reload' + (hero.def.weapons.length > 1 ? '' : ' · X club')); }
    } else { $('ammoFill').style.width = (hero.st === S.ST_WINDUP ? Math.min(1, (hero.stT) / 0.28) * 100 : hero.blocking ? 100 : 0).toFixed(0) + '%'; $('ammoText').textContent = hero.st === S.ST_WINDUP ? `Winding up: ${DIRN[hero.atkDir]}` : hero.blocking ? `Blocking ${BLKN[hero.blockDir]}` : hero.st === S.ST_RECOVER ? 'Recovering' : ''; }
    $('dirText').textContent = (!hero.dead && !Input.cmdMode && !gunMode()) ? (hero.weapon === 'yari' ? 'LMB thrust · Shift+W+LMB charge · wheel↑ slam · RMB block · double-tap A/D slide' : 'LMB slash · hold heavy · Shift+W+LMB charge · wheel↑ overhead · R stab · RMB block · double-tap A/D slide') : (me.rallyT > 0 ? `rally in ${Math.ceil(me.rallyT / 30)}s` : 'V · rally');
    empHUD(hero);
    { const fu = $('fury'); const full = me.fury >= S.FURY_MAX; fu.style.setProperty('--f', (me.fury / S.FURY_MAX * 100).toFixed(0) + '%'); fu.classList.toggle('full', full); fu.classList.toggle('on', hero.frenzyT > 0); fu.querySelector('span').textContent = hero.frenzyT > 0 ? `VALOR ${Math.ceil(hero.frenzyT)}s` : full ? 'Valor ready · V' : 'Fury'; $('bombs').textContent = `雷 ${'●'.repeat(me.bombs)}${'○'.repeat(S.BOMBS - me.bombs)} · 4`; }
  }
  { const fo = $('fporders'); const show = alive && !Input.cmdMode && !state.ended && sim.players[state.localIdx].squads.some(id => sim.squads[id].alive);
    if (show) { const own = fpSquads(); if (!state.fpSel.length) state.fpSel = own.map(s => s.id); const all = state.fpSel.length === own.length;
      const html = `<b>Orders →</b> <span class="to">${all ? 'All squads' : names()}</span><span class="sqs">${own.map((q, i) => `<i class="${state.fpSel.includes(q.id) ? 'on' : ''}${q.routing ? ' rout' : ''}">${i + 1}</i>`).join('')}</span><span><kbd>Z</kbd>${state.zHeld ? 'release to place' : 'form up there'}</span><span><kbd>C</kbd>charge</span><span><kbd>F</kbd>${state.fpSel.some(id => sim.squads[id].order === S.ORD_FOLLOW) ? 'halt' : 'follow me'}</span><span><kbd>O</kbd>overview</span><span><kbd>N</kbd>fire</span><span><kbd>B</kbd>ability</span><span><kbd>K</kbd>war junks</span><span><kbd>G</kbd>more</span>`;
      if (fo.dataset.h !== html) { fo.innerHTML = html; fo.dataset.h = html; } }
    fo.hidden = !show || Input.orderMode; }
  // hint
  const hint = $('hint'); let ht = '';
  if (sim.phase === 0) { const left = Math.max(0, Math.ceil((S.DEPLOY_TICKS - sim.tick) / 30)); ht = `Deployment · ${left}s · right-drag squads into the shaded zone · Enter when ready${me.ready ? ' ✓' : ''}`; }
  else if (hero && !hero.dead && !Input.cmdMode) {
    const horse = sim.units[me.horseId];
    if (hero.mount < 0 && !hero.mounted && horse && !horse.dead && horse.rider < 0 && Math.hypot(horse.x - hero.x, horse.z - hero.z) < 3.4) ht = 'E · mount your horse';
    else if (hero.downT > 0) ht = 'You are down';
    else if (sim.pickups && sim.pickups.length && hero.mount < 0 && !(hero.manE >= 0)) { let pk = null, bd = 1.9; for (const p of sim.pickups) { const d = Math.hypot(p.x - hero.x, p.z - hero.z); if (d < bd) { bd = d; pk = p; } }
      if (pk && !sim.units.some(v => v.downed && !v.dead && v.team === hero.team && Math.hypot(v.x - hero.x, v.z - hero.z) < 2.6)) { const W = S.WPN[pk.k]; const full = hero.kit ? hero.kit.length >= 4 : (hero.def.weapons || []).length >= 4; ht = `E · pick up ${W.n}${W.sh ? '' : full ? ' (swap for the one in your hands)' : ''}`; } }
    else if (hero.type !== 'hero' && !(sim.mission && sim.mission.soldier)) { const c = sim.units[me.commanderId]; if (c && !c.dead) ht = 'Backspace · return to your commander'; }
  } else if (hero && hero.dead) ht = (state.sim.mode === 'campaign' ? 'You have fallen. Press P to rejoin the fight with one of your companies' : 'You have fallen. Select a squad and press O, then U, to fight on in their ranks');
  if (!sim.heroMode) { if (ht !== hint.textContent) hint.textContent = ht; hint.hidden = !ht; }
  // periodic panels
  state.hudT -= dt;
  if (state.hudT <= 0) {
    state.hudT = 0.4;
    if (sim.phase === 1 && hero && !state.ended) { let near = 0; for (const v of sim.teamAlive[1 - me.team]) if (Math.abs(v.x - hero.x) + Math.abs(v.z - hero.z) < 40) near++; MUSIC.setIntensity(0.38 + Math.min(1, near / 12) * 0.62); }
    const a0 = sim.teamAlive[0].length, a1 = sim.teamAlive[1].length;
    $('status').innerHTML = `<span class="t0">${S.FACTION[0].jp} ${a0}</span><span class="vs">·</span><span class="t1">${a1} ${S.FACTION[1].jp}</span>`;
    if (sim.mission && sim.mission.beacon && typeof beaconGoal === 'function') $('status').innerHTML = beaconGoal();
    if (sim.mission && sim.mission.soldier && typeof zGoal === 'function') $('status').innerHTML = `<span class="goal">${escapeHtml(zGoal())}</span>`; // the story: no head count, one line of what you should be doing now
    { const ob = sim.objectives.filter(o => !o.hidden); if (ob.length) { const chips = ob.map(o => `<span class="obj ${o.owner === 0 ? 'o0' : o.owner === 1 ? 'o1' : ''}${(o.n0 > 0) !== (o.n1 > 0) && o.owner !== (o.n0 > 0 ? 0 : 1) ? ' cap' : ''}" style="background:${objBg(o.ctrl)}">${o.name}</span>`).join(''); $('objbar').innerHTML = sim.mission && sim.mission.soldier ? '' : sim.heroMode || sim.mission ? chips : `<span class="sc t0">${sim.score[0]}</span>${chips}<span class="sc t1">${sim.score[1]}</span><small>first to ${S.SCORE_WIN}</small>`; $('objbar').hidden = false; } else $('objbar').hidden = true; }
    const rows = []; const mySq = me.squads.map(id => sim.squads[id]);
    rows.push(`<h4>Your army${me.auto ? ' · AI general' : ''}</h4>`);
    for (const sq of mySq) rows.push(`<div class="sqrow${sq.alive ? '' : ' dead'}${state.selected.includes(sq.id) ? ' sel' : ''}${sq.routing ? ' rout' : ''}"><span>${sq.def.name}${sq.stars ? ' <b class="vet">' + '★'.repeat(sq.stars) + '</b>' : ''}${sq.pendAt > sim.tick ? ' <small class="m-mid">⏳' + Math.ceil((sq.pendAt - sim.tick) / 30) + 's</small>' : ''}</span><span>${sq.aliveCount}/${sq.count}</span><span class="ord ${moraleCls(sq)}">${sq.alive ? (sq.routing ? 'ROUTING' : ORDN[sq.order] + (sq.def.ai === 'ranged' && !sq.fire ? ' ·hold fire' : '') + (sq.fat > 85 ? ' ·exhausted' : sq.fat > 60 ? ' ·winded' : '') + ((sq.def.ai === 'ranged' || sq.def.ai === 'cannon') ? (sq.dry ? ' ·no shot' : ' ·' + Math.round(sq.shots) + (sq.supplied ? '+' : '')) : '')) : ''}</span><span class="ab${sq.abOn > 0 ? ' on' : sq.abT > 0 ? '' : ' ready'}">${sq.alive ? (sq.abOn > 0 ? S.ABILITY[sq.ability].name : sq.abT > 0 ? Math.ceil(sq.abT / 30) + 's' : 'Q') : ''}</span></div>`);
    if (sim.waves && sim.waves.length) { const w = sim.waves.find(q => q.team === me.team); rows.push(`<div class="sqrow naval"><span>Reserve corps</span><span></span><span class="ord">${w.released ? 'committed' : `${Math.round(sim.rp[me.team])}/360 · L at 180`}</span><span></span></div>`); }
    rows.push(`<div class="sqrow naval"><span>War junk</span><span></span><span class="ord">${me.navalUsed ? 'spent' : 'K · broadside'}</span><span></span></div>`);
    $('army').innerHTML = rows.join(''); $('army').hidden = sim.heroMode || (sim.real && !me.squads.length) || !!(sim.mission && (sim.mission.camp || sim.mission.soldier)); renderAllies();
    const ls = state.ls; const parts = [`tick ${ls.tick}`];
    if (state.net) { parts.push(`${ls.n} players · ${state.delay * Math.round(DT * 1000)} ms input delay`); if (state.stalled && state.stallT > 0.5) parts.push(`<span class="warn">waiting for ${ls.waitingOn(ls.tick).map(i => state.peerNames[i]).join(', ')}</span>`); if (ls.desync) parts.push(`<span class="bad">DESYNC at tick ${ls.desyncTick}</span>`); } else parts.push('solo · lockstep');
    $('netbox').innerHTML = parts.join(' · ');
  }
  updateLabels(); updateMarks();
}
function stepOnce() {
  const sim = state.sim, ls = state.ls, net = state.net;
  if (!ls.ready(ls.tick)) return false;
  if (net) netTune(ls, net);
  if (ls.needsInput()) { const t0 = ls.tick + ls.delay;
    if (ls.lastQ !== undefined && ls.lastQ < t0 - 1) { const last = ls.local(ls.lastQ); for (let t = ls.lastQ + 1; t < t0; t++) { const f = last ? [last[0], last[1], last[2], last[3] & (S.A_ATK | S.A_BLOCK | S.A_AIM | S.A_CMD), last[4], last[5], [], 0] : 0; ls.get(t)[ls.me] = f; if (net) net.sendInput(t, f, ls.tick); } }
    const inp = collectInput(); const tk = ls.queueLocal(inp); if (net) net.sendInput(tk, inp, ls.tick); }
  const tickInputs = ls.inputsFor(ls.tick); if (state.replay && state.replay.inputs.length < 30 * 60 * 40) state.replay.inputs.push(tickInputs.slice());
  sim.step(tickInputs); ls.advance();
  state.renderer.processEvents(sim.events); handleEvents(sim.events);
  if (ls.tick % 60 === 0 && net) { const h = sim.hash(); net.sendHash(ls.tick, h); ls.recordHash(ls.me, ls.tick, h); }
  return true;
}
// online play: the input delay follows the measured round trip (half of it, plus a margin for jitter) and moves one tick at a time
function netTune(ls, net) {
  const now = performance.now(); if (now - (state.tuneT || 0) < 1500) return; state.tuneT = now;
  const rtt = net.maxRtt(); if (!rtt) return; const want = Math.max(2, Math.min(12, Math.ceil((rtt / 2 + 22) / (DT * 1000)) + 1));
  if (want > ls.delay) ls.delay++; else if (want < ls.delay - 1) ls.delay--; state.delay = ls.delay;
}
// keep every peer's clock in step: a peer running ahead of the others would only stall waiting for their inputs, so it slows a
// touch instead (the slower peer is never asked to speed up past real time)
function netAhead(ls, net) {
  let ahead = 0; const now = performance.now();
  for (const p in net.rtick) { const R = net.rtick[p]; if (!ls.connected[p]) continue; const est = R.k + ((net.rtt[R.id] || 0) / 2 + (now - R.at)) / (DT * 1000); ahead = Math.max(ahead, ls.tick - est); }
  return ahead;
}
// what the local man's own pending inputs will do: in first person the camera moves at once with the keys instead of after the
// input delay (drawing only; the simulation is untouched and catches up to the same place)
function predictHero(ls) {
  const h = localHero(); const R = state.renderer; if (!R) return;
  let ox = 0, oz = 0;
  if (h && !h.dead && state.net && h.mount < 0 && !h.mounted && !h.airborne && !(h.downT > 0) && !(h.dodgeT > 0) && h.st !== S.ST_STUN) {
    const base = h.def.speed * state.sim.zoneSpeed(h.x, h.z, Math.sin(h.yaw), Math.cos(h.yaw)); const cur = Math.hypot(h.mx, h.mz), was = state.predSp || base;
    const k = Math.min(1.2, cur > 0.05 ? cur / Math.max(0.1, was) : 1);
    for (let t = ls.tick; t < ls.tick + ls.delay; t++) { const inp = ls.local(t); if (!inp || !inp[0]) continue; const keys = inp[0], yaw = inp[1] / 65536 * Math.PI * 2;
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw); let mx = 0, mz = 0;
      if (keys & S.KEY_W) { mx += fx; mz += fz; } if (keys & S.KEY_S) { mx -= fx; mz -= fz; } if (keys & S.KEY_D) { mx += rx; mz += rz; } if (keys & S.KEY_A) { mx -= rx; mz -= rz; }
      const l = Math.hypot(mx, mz); if (l < 1e-3) continue; let sp = base; if ((keys & S.KEY_S) && !(keys & S.KEY_W)) sp *= 0.65; if ((keys & S.KEY_SPRINT) && (keys & S.KEY_W) && !(keys & S.KEY_S) && !h.winded) sp *= 1.42;
      ox += mx / l * sp * k * DT; oz += mz / l * sp * k * DT; }
    const pl = Math.hypot(ox, oz); if (pl > 2) { ox *= 2 / pl; oz *= 2 / pl; }
    { let sp = base; const keys = ls.local(ls.tick - 1); if (keys && keys[0] & S.KEY_SPRINT) sp *= 1.42; state.predSp = sp; }
  }
  const P = R.pred || (R.pred = { x: 0, z: 0 }); const a = 1 - Math.exp(-(state.dtF || 0.016) * 30); P.x += (ox - P.x) * a; P.z += (oz - P.z) * a;
}
const DEATH_MS = 3800;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - state.last) / 1000 || 0); state.last = now;
  state.fps = (state.fps || 60) * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
  if (state.screen !== 'game' || !state.sim) return;
  if (state.replayMode) { replayFrame(dt); return; }
  Input.decay(dt);
  if (state.slowT > 0) { state.slowT -= dt; dt *= state.slowT > 0.6 ? 0.25 : 0.25 + (0.6 - state.slowT) / 0.6 * 0.75; }
  const sim = state.sim, ls = state.ls, net = state.net;
  // game speed (solo only): more fixed-length ticks per frame; capped so a slow machine just runs slower
  const spd = state.net ? 1 : (state.speed || 1), maxS = Math.min(48, Math.max(2, Math.ceil(6 * spd)));
  state.dtF = dt; let ndt = dt; if (net && state.ls) { const ah = netAhead(ls, net); if (ah > 1.5) ndt *= ah > 4 ? 0.8 : 0.92; }
  state.acc += ndt * spd; let steps = 0; const tStep = performance.now();
  while (state.acc >= DT && steps < maxS) {
    if (spd > 1 && steps >= 2 && performance.now() - tStep > 14) { state.acc = 0; break; } // fast-forward never starves the frame: a slow machine just gets less speed
    if (!stepOnce()) { state.acc = Math.min(state.acc, DT); state.stalled = true; state.stallT += dt; break; }
    state.stalled = false; state.stallT = 0;
    state.acc -= DT; steps++;
  }
  if (steps >= maxS) state.acc = 0;
  const hero = localHero();
  // your own death, seen through your own eyes: a few seconds of the fall before the command view or the soldier picker
  if (hero && hero.dead) { if (state.deadId !== hero.id) { state.deadId = hero.id; state.deathAt = now; state.deathCam = !Input.cmdMode && !state.ended; if (state.deathCam && AUDIO.shellshock) AUDIO.shellshock(0.75); } } else state.deadId = -1;
  const dying = !!(hero && hero.dead && state.deathCam && !state.ended && now - state.deathAt < DEATH_MS); state.dying = dying;
  { const cv = state.renderer && state.renderer.renderer && state.renderer.renderer.domElement; if (cv) { const k = dying ? Math.min(1, (now - state.deathAt) / DEATH_MS) : 0; const f = k > 0 ? `grayscale(${Math.min(1, k * 1.6).toFixed(2)}) brightness(${(1 - Math.max(0, k - 0.45) * 1.5).toFixed(2)}) contrast(${(1 + k * 0.15).toFixed(2)})` : ''; if (dying) { if (cv._f !== f) { cv.style.filter = f; cv._f = f; } state.deathFilt = true; } else if (state.deathFilt) { cv.style.filter = ''; cv._f = ''; state.deathFilt = false; } } }
  if (hero && hero.dead && !dying && !Input.cmdMode && !state.ended && state.sim.mode !== 'assault') { toggleCmd(true); toast(state.sim.heroMode ? 'You have fallen. You will return in a few moments' : 'You have fallen'); }
  if (hero && !hero.dead && Input.cmdMode && (state.sim.heroMode || state.sim.mode === 'assault' || state.sim.mode === 'duel') && !state.ended && !(typeof DEP !== 'undefined' && DEP.open)) toggleCmd(false);
  if (hero && hero.id !== state.lastHeroId) { state.lastHeroId = hero.id; }
  cmdCamUpdate(dt);
  if (typeof SPEECH !== 'undefined' && SPEECH.pump) SPEECH.pump(dt); // speaker faces are drawn before the frame, never over it
  state.renderer.render(state.acc / DT, dt, { mode: dying ? 'death' : Input.cmdMode || !hero || hero.dead ? 'cmd' : 'fp', deathK: dying ? (now - state.deathAt) / DEATH_MS : 0, yaw: Input.yaw, pitch: Input.pitch, selected: (Input.orderMode || state.zHeld) ? state.fpSel : state.selected, fpSel: state.fpSel, ghost: Drag.active ? Drag.ghost : state.fpGhost, ghostLine: Drag.active ? Drag.line : null });
  if (Input.orderMode || state.zHeld) { state.ordT = (state.ordT || 0) - dt; if (state.ordT <= 0) { state.ordT = 0.08; const lay = fpLayout(); state.fpGhost = lay ? lay.ghost : null; if (Input.orderMode) renderOrderMenu(); } }
  updateHUD(dt); storyTick(); heroHUD(); if (typeof SPEECH !== 'undefined') SPEECH.frame(dt); if (typeof zheHUD === 'function') zheHUD(dt);
}
window.addEventListener('resize', () => { if (state.renderer) state.renderer.resize(); });
window.__boshin = { startGame, state, Input, Drag, boxSelect, layoutLine, handleEvents, finish, stepN: (n) => { for (let i = 0; i < n; i++) if (!stepOnce()) break; } };
document.addEventListener('pointerdown', () => { AUDIO.init(); if (!MUSIC.track && state.screen !== 'game' && $('musicIn').checked) MUSIC.play('menu'); }, { once: false });
$('musicIn').addEventListener('change', () => { MUSIC.setMuted(!$('musicIn').checked); if ($('musicIn').checked && !MUSIC.track) MUSIC.play(state.screen === 'game' ? 'battle' : 'menu'); });
try { const r = JSON.parse(localStorage.getItem('mingResume') || 'null'); if (r) { localStorage.removeItem('mingResume'); state.mode = 'story'; state.chapter = r.chapter; state.faction = r.side; state.storyUnlocked = r.chapter; } } catch (e) { }
renderMenu();
requestAnimationFrame(frame);
})();
