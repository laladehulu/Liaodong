// ===================== 典 · the codex: the people, the soldiers, the fields and the years of the war =====================
// One panel from the menu: who the men in the game were, what each kind of soldier is, where each battlefield is and when,
// and the war year by year (the open world's calendar). Read-only, built from the game's own data plus short lives below.
// what changed lately, newest first (kept short: what a player would want to try)
const CODEX_NEW = [
  ['Last Stand', 'Five fields to hold, a best for each, and three new boons: rattan shields, thunder-crash bombs, hot wine.'],
  ['Story campaigns', 'Camp nights answer more of what you did: a sworn brother, the chief asking your advice, the cook\'s ladle, the night watch, the mood of the fire, the man you left coming back.'],
  ['Story', 'Nine battles now: Ningjin (1627) and the fort on the Daling (1631) between Ningyuan and Songshan.'],
  ['Duels', 'A ladder of five named opponents. Mirror fights are even now (the side that moved first used to land the first blow).'],
  ['Field battles', 'Difficulty against the AI, saved armies, a won–lost record, Quick battle from the menu, and Fight again on the result screen.'],
  ['Assault and Siege', 'The defence can hold now: defenders on their own line fight from cover, and their reserves come up faster.'],
  ['Every battle', 'An after-action report on the result screen, and medals for missions, operations and the Story battles.'],
  ['Path of a Soldier', 'The career\'s battles are fought on their own historical fields.'],
  ['The open world', 'A living town (townsfolk with trades and lives), festivals, trade, the forge, the army, the family, life under the Jin, money and land, office and factions, heirs, weather, and history to 1645. Press J for your journal; your bed can let the days go by.'],
  ['Codex and controls', 'This codex (people, soldiers, fields, years, your record), and F1 anywhere for the controls.'],
];
const CODEX_PEOPLE = [
  ['努爾哈赤', 'Nurhaci', '1559–1626', 'Jin', 'Chieftain of the Jianzhou Jurchens who united the Jurchen tribes, created the banner system and founded the Later Jin in 1616. He declared war on the Ming with the Seven Grievances in 1618, destroyed the Ming armies at Sarhu in 1619 and took Shenyang and Liaoyang in 1621. Ningyuan in 1626 was the first defeat of his life; he died that autumn.'],
  ['皇太極', 'Hong Taiji', '1592–1643', 'Jin', 'Nurhaci\'s eighth son and successor as Khan (1626). He brought Han officials and Han and Mongol banners into the state, renamed the Jurchens Manchus (1635) and proclaimed the Great Qing (1636). He broke through the Wall to the gates of Beijing in 1629 and invaded Korea twice.'],
  ['代善', 'Daišan', '1583–1648', 'Jin', 'Nurhaci\'s second son, one of the four senior beile; he commanded at Sarhu and in the campaigns that followed, and later stood aside for Hong Taiji.'],
  ['多爾袞', 'Dorgon', '1612–1650', 'Jin', 'Hong Taiji\'s half-brother and, after him, regent for the child Shunzhi Emperor. In 1644 he brought the Qing army through the Shanhai Pass with Wu Sangui and took Beijing.'],
  ['李永芳', 'Li Yongfang', 'd. 1634', 'Jin', 'The Ming commander at Fushun who surrendered it to Nurhaci in 1618, the first Ming general to go over. He married a granddaughter of the Khan and led Han troops for the Jin.'],
  ['孔有德', 'Kong Youde', 'd. 1652', 'Jin', 'One of Mao Wenlong\'s officers from Liaodong. In 1631 his troops mutinied at Wuqiao on the march to Dalinghe; after the siege of Dengzhou he went over to the Jin by sea in 1633, bringing Western-style cannon and the men who could cast and fire them.'],
  ['楊鎬', 'Yang Hao', 'd. 1629', 'Ming', 'Military Commissioner for Liaodong who planned the four-column campaign of 1619. Three of the four columns were destroyed one by one at Sarhu, Shangjiaan and Abudali. He was imprisoned and executed in 1629.'],
  ['杜松', 'Du Song', 'd. 1619', 'Ming', 'Commander of the western column in 1619, a brave and impetuous general. He crossed the Hun River ahead of the plan and was killed with most of his column at Sarhu and Jiefan.'],
  ['劉綎', 'Liu Ting', '1558–1619', 'Ming', 'A veteran of the wars in Korea and the southwest, famous for his heavy sword. He led the eastern column through the mountains and was killed at Abudali in the spring of 1619 when the Jin turned on him with their whole army.'],
  ['李如柏', 'Li Rubai', '1553–1621', 'Ming', 'A son of the great Li Chengliang, commander of the southern column in 1619, which withdrew without fighting. Impeached for it, he took his own life in 1621.'],
  ['熊廷弼', 'Xiong Tingbi', '1569–1625', 'Ming', 'Commissioner for Liaodong in 1619–20 and again in 1621–22, who argued for defence before attack. After Guangning was lost in 1622 he was blamed with Wang Huazhen; in the purges of 1625 he was executed and his head sent round the frontier.'],
  ['孫承宗', 'Sun Chengzong', '1563–1638', 'Ming', 'Grand Secretary and tutor of the Tianqi Emperor, who supervised the Liaodong defence in 1622–25 and built the line of forts beyond the Shanhai Pass on which Ningyuan stood. He died defending his home town of Gaoyang against a Qing raid in 1638.'],
  ['袁崇煥', 'Yuan Chonghuan', '1584–1630', 'Ming', 'A jinshi of 1619 from Guangdong who rode alone beyond the Pass to see the ground. He held Ningyuan in 1626 with Western cannon against Nurhaci, and Ningjin in 1627. He executed Mao Wenlong in 1629 and raced to save Beijing that winter; accused of treason, he was put to death by slicing in 1630.'],
  ['滿桂', 'Man Gui', 'd. 1630', 'Ming', 'A Mongol-born Ming general who fought beside Yuan Chonghuan at Ningyuan. He was killed outside Beijing in the winter of 1629–30.'],
  ['祖大壽', 'Zu Dashou', 'd. 1656', 'Ming', 'One of Yuan Chonghuan\'s Liaodong officers. Besieged at Dalinghe in 1631 until his men were eating each other, he surrendered, slipped back to Jinzhou, and finally gave up Jinzhou to the Qing in 1642.'],
  ['毛文龍', 'Mao Wenlong', '1576–1629', 'Ming', 'A Zhejiang adventurer who in 1621 raided Zhenjiang behind the Jin lines and then held Pi Island and the coast (the East River command) with the refugees of Liaodong, a thorn in the Jin side for eight years. Yuan Chonghuan executed him on Shuangdao in 1629.'],
  ['秦良玉', 'Qin Liangyu', '1574–1648', 'Ming', 'A woman general of the Shizhu tusi in Sichuan who led her "White Pole" spearmen for the Ming for forty years. Her brothers Qin Bangping and Qin Minping fought at the Hun River in 1621, where Bangping was killed.'],
  ['陳策', 'Chen Ce', 'd. 1621', 'Ming', 'Commander of the Zhejiang troops in the relief of Shenyang in 1621, killed at the Hun River with Tong Zhongkui and most of the southern soldiers.'],
  ['戚繼光', 'Qi Jiguang', '1528–1588', 'Ming', 'The general who destroyed the coastal pirates of the 1550s with miners and farmers of Yiwu drilled in the mandarin-duck formation, and wrote the drill books the Zhejiang troops still carried in 1619.'],
  ['徐光啟', 'Xu Guangqi', '1562–1633', 'Ming', 'A scholar-official baptised Paul, who translated Euclid with Matteo Ricci (1607), trained new troops at Tongzhou in 1619–21 and argued for buying Portuguese cannon from Macao. He became a Grand Secretary in 1632.'],
  ['魏忠賢', 'Wei Zhongxian', '1568–1627', 'Ming', 'The eunuch who dominated the court of the Tianqi Emperor, purged the Donglin party and had living shrines built to himself. When the Chongzhen Emperor came to the throne in 1627 he was sent away and hanged himself on the road.'],
  ['楊漣', 'Yang Lian', '1572–1625', 'Ming', 'A Donglin censor who in 1624 accused Wei Zhongxian of twenty-four great crimes. He was arrested and died under torture in the Imperial Prison in 1625.'],
  ['朱由檢', 'The Chongzhen Emperor', '1611–1644', 'Ming', 'The last Ming emperor (r. 1627–1644). He destroyed Wei Zhongxian\'s faction but distrusted his generals and changed his ministers fifty times. When Li Zicheng took Beijing he hanged himself on Coal Hill.'],
  ['李自成', 'Li Zicheng', '1606–1645', 'Rebel', 'A former postal courier from Shaanxi who became the greatest of the rebel leaders of the famine years. He took Beijing in the spring of 1644 and proclaimed the Great Shun, was beaten at the Shanhai Pass a few weeks later, and died in flight in 1645.'],
  ['吳三桂', 'Wu Sangui', '1612–1678', 'Ming', 'Commander of the Ming army at the Shanhai Pass in 1644. Caught between Li Zicheng and the Qing, he opened the Pass to Dorgon; he later served the Qing, and rebelled against them in 1673.'],
  ['湯若望', 'Johann Adam Schall von Bell', '1592–1666', 'Jesuit', 'A German Jesuit who reached Beijing in 1623, predicted eclipses better than the Directorate of Astronomy, worked with Xu Guangqi on the Chongzhen calendar and cast cannon for the Ming in its last years. He stayed on under the Qing and headed their astronomical bureau.'],
  ['利瑪竇', 'Matteo Ricci', '1552–1610', 'Jesuit', 'The Italian Jesuit who learned the classics, wore a scholar\'s robes and was allowed to live in Beijing from 1601. His friends among the officials, Xu Guangqi first, carried Western mathematics, maps and later guns into the Ming state.'],
];
function codexOpen(tab) {
  let box = $('codex'); if (!box) { box = document.createElement('div'); box.id = 'codex'; document.body.appendChild(box); const st = document.createElement('style');
    st.textContent = `#codex { position: fixed; inset: 0; z-index: 80; background: rgba(14,12,10,.8); display: flex; align-items: center; justify-content: center; }
#codex .pp { width: min(980px, 95vw); height: min(86vh, 900px); display: flex; flex-direction: column; background: #efe6cf; color: #2a2018; border: 1px solid #8a6a3a; box-shadow: 0 10px 40px #000; font: 14px/1.5 Georgia, serif; }
#codex .hd { display: flex; align-items: center; gap: 6px; padding: 12px 18px 8px; border-bottom: 1px solid #c8b48a; } #codex .hd h3 { margin: 0 12px 0 0; font: 700 20px Georgia, serif; }
#codex .tab { border: 1px solid #b89a6a; background: #f6eedb; color: #2a2018; padding: 3px 10px; cursor: pointer; font: 13px Georgia, serif; } #codex .tab.on { background: #2a2018; color: #f6eedb; } #codex .x { margin-left: auto; }
#codex .bd { overflow: auto; padding: 10px 18px 18px; } #codex .it { padding: 8px 0; border-bottom: 1px solid #d8c8a2; } #codex .it b { font-size: 15px; } #codex .it small { color: #6a5a46; margin-left: 6px; }
#codex .side { display: inline-block; font-size: 11px; padding: 0 5px; margin-left: 6px; border-radius: 3px; background: #e0d2ae; } #codex .yr { font-weight: 700; margin: 12px 0 2px; color: #7a3a1a; }`; document.head.appendChild(st);
    box.addEventListener('mousedown', (e) => { if (e.target === box) box.hidden = true; }); }
  tab = tab || 'people'; const tabs = [['people', '人 · People'], ['units', '兵 · Soldiers'], ['fields', '地 · Battlefields'], ['years', '年 · The years'], ['record', '功 · Your record'], ['new', '新 · What\'s new']];
  let body = '';
  if (tab === 'people') body = CODEX_PEOPLE.map(p => `<div class="it"><b>${p[0]} · ${p[1]}</b><small>${p[2]}</small><span class="side">${p[3]}</span><div>${p[4]}</div></div>`).join('');
  if (tab === 'units') body = [0, 1].map(f => `<div class="yr">${f ? '後金 · The Later Jin' : '大明 · The Ming'}</div>` + S.ROSTER[f].map(k => { const d = S.defFor(k, f); const role = d.gun ? 'machine gun' : d.cannon ? 'artillery' : d.bow ? 'archers' : d.ai === 'ranged' ? 'firearms' : d.mounted ? 'cavalry' : 'foot, hand to hand';
    return `<div class="it"><b>${d.jp} · ${d.name}</b><small>${role} · ${d.count} men · ${d.cost} taels · ${d.hp} hp${d.shield ? ' · shield' : ''}${d.armor ? ' · armoured' : ''}</small><div>${d.desc || ''}</div></div>`; }).join('')).join('');
  if (tab === 'fields') body = Object.keys(S.BATTLES).filter(k => !S.BATTLES[k].hidden && S.BATTLES[k].desc).map(k => { const b = S.BATTLES[k]; return `<div class="it"><b>${b.jp || ''} · ${b.name}</b><small>${b.when || ''}${b.biome ? ' · ' + b.biome : ''}</small><div>${b.desc}</div></div>`; }).join('');
  if (tab === 'years') { const E = (typeof WEV !== 'undefined' ? WEV : []).slice().sort((a, b) => a[0] - b[0]); let y = 0, out = '';
    for (const e of E) { const T = wDate(e[0]); if (T.y !== y) { y = T.y; out += `<div class="yr">${y}</div>`; } out += `<div class="it"><small style="margin:0 8px 0 0">${T.m}/${T.d}</small>${e[3]}<div style="color:#6a5a46;font-size:13px">${e[2]}</div></div>`; }
    body = out + '<p><small>Months are lunar, as people counted them; the game\'s calendar keeps thirty days to the month.</small></p>'; }
  if (tab === 'record') body = codexRecord();
  if (tab === 'new') body = CODEX_NEW.map(n => `<div class="it"><b>${n[0]}</b><div>${n[1]}</div></div>`).join('');
  box.hidden = false; box.innerHTML = `<div class="pp"><div class="hd"><h3>典 · Codex</h3>${tabs.map(t => `<button type="button" class="tab${t[0] === tab ? ' on' : ''}" data-t="${t[0]}">${t[1]}</button>`).join('')}<button type="button" class="tab x">Close</button></div><div class="bd">${body}</div></div>`;
  box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => codexOpen(b.dataset.t)); box.querySelector('.x').onclick = () => { box.hidden = true; };
}
// the codex link sits under the title on the menu
{ const t = document.querySelector('#menu h1') || document.querySelector('#menu .title') || null; const host = $('modeSeg') && $('modeSeg').previousElementSibling;
  if (host) { const a = document.createElement('button'); a.type = 'button'; a.className = 'btn sm'; a.textContent = '典 · Codex · what\'s new'; a.style.cssText = 'float:right;margin-top:-4px'; a.onclick = () => codexOpen(localStorage.getItem('mingSeenNew') === String(CODEX_NEW.length) ? 'people' : (localStorage.setItem('mingSeenNew', String(CODEX_NEW.length)), 'new')); host.appendChild(a); } }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('codex') && !$('codex').hidden) { $('codex').hidden = true; e.stopPropagation(); } }, true);
// 速戰 · Quick battle: one click from the menu to a field battle on a random field, with your saved army (or a random one) against the AI
function quickBattle() { AUDIO.init(); AUDIO.play('ui'); state.mode = 'standard'; const B = Object.keys(S.BATTLES).filter(k => !S.BATTLES[k].hidden && !/^dj/.test(k)); state.battle = B[Math.floor(Math.random() * B.length)];
  const f = state.faction | 0, ros = S.ROSTER[f]; if (!state.army.length || armyCost(state.army) > S.BUDGET || !state.army.every(k => ros.includes(k))) { const a = []; let left = S.BUDGET, guard = 0;
    while (a.length < 7 && guard++ < 60) { const k = ros[Math.floor(Math.random() * ros.length)], c = S.DEFS[k].cost; if (c <= left && !(S.DEFS[k].cannon && a.some(x => S.DEFS[x].cannon))) { a.push(k); left -= c; } } state.army = a; }
  state.aiSlots = []; renderMenu(); soloStart(); }
{ const host = $('modeSeg') && $('modeSeg').previousElementSibling; if (host) { const a = document.createElement('button'); a.type = 'button'; a.className = 'btn sm primary'; a.textContent = '速戰 · Quick battle'; a.title = 'A field battle now: a random field, your army (or a random one), against the AI';
    a.style.cssText = 'float:right;margin:-4px 6px 0 0'; a.onclick = quickBattle; host.appendChild(a); } }

// 功 · your record: everything this browser remembers of what you did, in every mode
function codexRecord() { const J = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }; const out = []; const mm = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
  const sec = (t, rows) => { out.push(`<div class="yr">${t}</div>`); out.push(rows.length ? rows.map(r => `<div class="it">${r}</div>`).join('') : '<div class="it"><small style="margin:0">Nothing yet.</small></div>'); };
  const rec = J('mingRecord', {}); const nm = { standard: 'Field battles', grand: 'Grand battles', officers: 'Officers', chaos: 'Chaos', heroes: 'Heroes', duel: 'Duels' }, dn = ['Recruit', 'Soldier', 'Veteran', 'Lone banner'];
  sec('戰 · Battles against the AI', Object.keys(rec).sort().map(k => { const [m, d] = k.split(':'); return `<b>${nm[m] || m}</b><small>${dn[+d]}</small> · ${rec[k].w} won, ${rec[k].l} lost`; }));
  const med = J('mingMedals', {}); const MD = ['銅 Recruit', '銀 Soldier', '金 Veteran', '玉 Lone banner'];
  sec('章 · Medals', Object.keys(med).sort().map(k => { const o = med[k]; let t = k; if (/^story:/.test(k)) { const [, c, sd] = k.split(':'); t = `Story ${+c + 1}. ${(STORY_TEXT[+c] || {}).title || ''} (${+sd ? 'Jin' : 'Ming'})`; } else if (/^op:/.test(k)) t = ((S.OPS[k.slice(3)] || {}).title || k); else t = ((S.MISSIONS[k] || {}).title || k); return `<b>${t}</b><small>${MD[o.d]} · best ${mm(o.t)}</small>`; }));
  const rung = +(localStorage.getItem('mingDuelRung') || 0); sec('擂 · The duel ladder', [`${Math.min(rung, 5)} of 5 opponents beaten${rung >= 5 ? ': the ladder is yours' : ''}.`]);
  const sb = []; for (const m of [['field', 'Jiefan Hill'], ['zroad', 'The road village'], ['hakodate', 'The Ningyuan plain'], ['nagaoka', 'The paddies'], ['djzhen', 'Inside Zhenjiang']]) { const v = +(localStorage.getItem('mingStandBest' + (m[0] !== 'field' ? ':' + m[0] : '')) || 0); if (v) sb.push(`<b>${m[1]}</b> · ${v} raids held`); } sec('闖 · Last Stand', sb);
  const camps = [['mingZhe', '浙兵 · The Zhejiang Company'], ['mingShenji', '神機 · The Divine Engine Division'], ['mingJin', '正白 · The Plain White Niru'], ['mingDongjiang', '東江 · The East River']].map(([k, t]) => { const v = J(k, null); return v ? `<b>${t}</b> · begun${v.stage ? ` (at ${String(v.stage).replace(/^c/, 'chapter ')})` : ''}` : null; }).filter(Boolean); sec('記 · The campaigns', camps);
  { const c = J('mingSoldier', null); const RK = ['Recruit', 'Veteran', 'Leader of five', 'Section chief', 'Company officer', 'Captain', 'Major', 'Colonel', 'General'];
    sec('兵 · Path of a Soldier', c ? [`<b>${c.name || ''}</b> · ${RK[c.rank | 0] || 'rank ' + c.rank} · ${c.battles | 0} battles, ${c.kills | 0} killed, merit ${c.merit | 0}${(c.fallen || []).length ? ` · comrades fallen: ${c.fallen.length}` : ''}`] : []); }
  const lives = J('mingLives', []); sec('人間 · Lives lived in the open world', lives.map(h => h.e.slice(0, 1).concat(h.e.filter(x => /^What he came to/.test(x))).join(' ')));
  return out.join(''); }
