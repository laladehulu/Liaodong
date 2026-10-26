// ===== Deterministic battle simulation =====
// Fixed 30 Hz ticks. Everything here must be bit-identical on every peer:
// same seed, same inputs, same order of iteration, no Math.sin/Date/random.
const SIM = (() => {
'use strict';
const { sin, cos, atan2, asin, wrap, clamp, len } = DM;
const PI = Math.PI, TAU = PI * 2, HPI = PI / 2;
const TICK = 30, DT = 1 / 30, HALF = 150, GRAV = 22;

const KEY_W = 1, KEY_S = 2, KEY_A = 4, KEY_D = 8, KEY_SPRINT = 16;
const A_ATK = 1, A_BLOCK = 2, A_FIRE = 4, A_AIM = 8, A_KICK = 16, A_MOUNT = 32, A_JUMP = 64, A_SWAP = 128, A_RELOAD = 256, A_CMD = 512, A_RALLY = 1024, A_READY = 2048, A_THROW = 4096, A_DUEL = 8192;
const BOMBS = 0, FURY_MAX = 100, AIM_RAISE = 0.6;
const A_AB1 = 16384, A_AB2 = 32768, A_AB3 = 65536, A_ULT = 131072, A_DODGE = 262144, A_DASHL = 524288, A_DASHR = 1048576, ORD_CLASS = 11;
const HAB = [{ key: 'whirl', name: 'Whirlwind', cd: 8 }, { key: 'dash', name: 'Dragon charge', cd: 10 }, { key: 'guard', name: 'Iron guard', cd: 12 }, { key: 'cry', name: 'War cry', cd: 25 }];
const DIR_UP = 0, DIR_RIGHT = 1, DIR_DOWN = 2, DIR_LEFT = 3;
const ST_IDLE = 0, ST_WINDUP = 1, ST_RELEASE = 2, ST_RECOVER = 3, ST_STUN = 4, ST_RELOAD = 5, ST_AIM = 6, ST_SWAP = 7, ST_KICK = 8, ST_BURST = 9;
const ORD_MOVE = 0, ORD_CHARGE = 1, ORD_HOLD = 2, ORD_FOLLOW = 3, ORD_FORM = 4, ORD_FIRE = 5, ORD_CONTROL = 6, ORD_AUTO = 7, ORD_ABILITY = 8, ORD_NAVAL = 9, ORD_DIRECTIVE = 10, ORD_WAVE = 12, ORD_SPAWN = 13;
const DIR_ATTACK = 0, DIR_HOLD = 1, DIR_SUPPORT = 2, DIR_FLANK = 3;
const FIRE_CS = 6, SCORE_WIN = 300;
function d2fuse(d) { return d / 13 + 0.3; }
const FORM_LINE = 0, FORM_COLUMN = 1, FORM_WEDGE = 2, FORM_LOOSE = 3;
const BUDGET = 1500;
const RELEASE_T = 0.2, KICK_T = 0.45, SWAP_T = 0.5;
const XCOMBAT = typeof globalThis !== 'undefined' && !!globalThis.MING_XCOMBAT; // experimental combat build
const DEPLOY_TICKS = 30 * 40;
const RALLY_CD = 30 * 40;

// dmg is indexed by attack direction [overhead, right swing, thrust, left swing]
const DEFS = {
  hero:          { name: 'General', jp: '將軍', hp: 280, speed: 4.5, r: 0.38, weapons: ['katana', 'rifle', 'revolver'], reach: 2.3, dmg: [64, 48, 40, 48], windup: 0.3, recover: 0.3, block: 0, hat: 'kabuto', rifle: { dmg: 95, reload: 2.4, range: 170, spread: 0.014, ads: 0.0035, aim: 0, mag: 1 }, revolver: { dmg: 52, mag: 3, cycle: 0.28, reload: 3.6, range: 48, spread: 0.03, ads: 0.011 }, count: 1, cost: 0, mass: 1, morale: 200 },
  samurai:       { name: 'Dao & Shield Infantry', jp: '刀牌手', hp: 130, speed: 4.1, r: 0.38, weapons: ['katana'], reach: 2.2, dmg: [54, 42, 34, 42], windup: 0.5, recover: 0.4, block: 0.5, cost: 240, count: 12, hat: 'kabuto', ai: 'melee', mass: 1, morale: 105, desc: 'Qi Jiguang drill: broad dao blades behind rattan shields. Solid line breakers.' },
  ashigaru:      { name: 'Ming Spearmen', jp: '長槍兵', hp: 85, speed: 4.2, r: 0.36, weapons: ['yari'], reach: 3.0, dmg: [42, 0, 38, 0], windup: 0.55, recover: 0.45, block: 0.2, cost: 160, count: 16, hat: 'jingasa', ai: 'melee', mass: 1, morale: 85, desc: 'Long qiang spears. Cheap and long-reaching, but unarmored and quick to break.' },
  rifle_imp:     { name: 'Niaochong Musketeers', jp: '鳥銃手', hp: 75, speed: 4.0, r: 0.36, weapons: ['rifle', 'katana'], sidearm: true, reach: 2.3, dmg: [38, 30, 32, 30], windup: 0.45, recover: 0.4, block: 0.25, cost: 300, count: 12, hat: 'cap', ai: 'ranged', mass: 1, morale: 95, rifle: { dmg: 60, reload: 4.0, range: 80, spread: 0.032, aim: 0.9, mag: 1 }, desc: 'Bird-beak matchlocks fired in rotating volleys. Accurate, but they hate the rain. Each man carries a 腰刀 sabre and draws it when the enemy closes.' },
  rifle_sho:     { name: 'Ujen Cooha Musketeers', jp: '漢軍銃手', hp: 80, speed: 4.0, r: 0.36, weapons: ['rifle'], reach: 2.3, dmg: [30, 0, 36, 0], windup: 0.5, recover: 0.45, block: 0.1, cost: 300, count: 12, hat: 'kepi', ai: 'ranged', mass: 1, morale: 95, rifle: { dmg: 54, reload: 3.3, range: 75, spread: 0.038, aim: 0.8, mag: 1 }, desc: 'Han Banner "heavy troops" with captured Ming muskets. Fast-loading and steady.' },
  rifle_spencer: { name: 'Three-Eyed Gunners', jp: '三眼銃', hp: 85, speed: 4.2, r: 0.36, weapons: ['rifle'], reach: 2.3, dmg: [30, 0, 36, 0], windup: 0.5, recover: 0.45, block: 0.1, cost: 380, count: 10, hat: 'cap', ai: 'ranged', mass: 1, morale: 110, rifle: { dmg: 52, reload: 0.7, magReload: 6.0, mag: 3, range: 55, spread: 0.06, aim: 0.45 }, desc: 'Three-barreled hand cannons fired one barrel after another, then swung as clubs. A burst of lead, then a long reload.' },
  jinshotai:     { name: 'Shenji Skirmishers', jp: '神機營', hp: 70, speed: 4.6, r: 0.36, weapons: ['rifle'], reach: 2.3, dmg: [30, 0, 36, 0], windup: 0.5, recover: 0.45, block: 0.1, cost: 280, count: 10, hat: 'none', ai: 'ranged', mass: 1, morale: 100, skirmish: true, rifle: { dmg: 58, reload: 3.2, range: 85, spread: 0.022, aim: 0.5, mag: 1 }, desc: 'Divine Engine Division marksmen. Loose order; they shoot on the move.' },
  jigen:         { name: 'Zhanmadao Horse-Cutters', jp: '斬馬刀', hp: 110, speed: 4.6, r: 0.38, weapons: ['katana'], reach: 2.3, dmg: [88, 44, 36, 44], windup: 0.42, recover: 0.5, block: 0.35, cost: 320, count: 10, hat: 'none', ai: 'melee', mass: 1, overhead: 0.7, morale: 120, desc: 'Two-handed horse-cutting blades. One devastating overhead blow.' },
  shinsengumi:   { name: 'Bayara Guard', jp: '巴牙喇', hp: 115, speed: 4.4, r: 0.38, weapons: ['katana'], reach: 2.2, dmg: [48, 38, 34, 38], windup: 0.34, recover: 0.3, block: 0.65, cost: 320, count: 10, hat: 'band', ai: 'melee', mass: 1, morale: 120, desc: "The Khan's elite guard. Fast, disciplined and hard to hit." },
  byakkotai:     { name: 'Khorchin Mongols', jp: '科爾沁', hp: 70, speed: 4.9, r: 0.36, weapons: ['katana'], reach: 2.1, dmg: [44, 36, 30, 36], windup: 0.4, recover: 0.35, block: 0.25, cost: 150, count: 12, hat: 'none', ai: 'melee', mass: 1, morale: 100, fearless: true, desc: 'Mongol allies of the Jin on foot. Cheap and quick, and they never run.' },
  archer:        { name: 'Manchu Archers', jp: '滿洲弓手', hp: 70, speed: 4.3, r: 0.36, weapons: ['bow'], reach: 2.1, dmg: [28, 0, 28, 0], windup: 0.5, recover: 0.45, block: 0.1, cost: 220, count: 12, hat: 'jingasa', ai: 'ranged', mass: 1, morale: 90, bow: { dmg: 40, reload: 3.0, range: 62, aim: 0.6, speed: 33 }, desc: 'Heavy arrows from powerful horn bows, in volleys that arc over your own lines.' },
  cavalry:       { name: 'Guanning Iron Cavalry', jp: '關寧鐵騎', hp: 170, speed: 9.0, r: 0.75, weapons: ['katana'], reach: 2.9, dmg: [60, 48, 40, 48], windup: 0.45, recover: 0.4, block: 0.3, cost: 300, count: 6, hat: 'kabuto', ai: 'melee', mounted: true, mass: 4, morale: 105, desc: "Yuan Chonghuan's armored horsemen. They trample infantry at a gallop." },
  armstrong:     { name: 'Hongyipao', jp: '紅夷大砲', hp: 220, speed: 1.4, r: 1.2, weapons: ['cannon'], reach: 0, dmg: [0, 0, 0, 0], windup: 0, recover: 0, block: 0, cost: 300, count: 1, hat: 'none', ai: 'cannon', mass: 6, morale: 100, cannon: { reload: 9, range: 150, min: 18, speed: 50, type: 'shell' }, desc: '"Red barbarian" heavy cannon cast on European lines. Its shells burst and send men flying.' },
  cannon4:       { name: 'Ujen Cooha Gun', jp: '烏真超哈砲', hp: 220, speed: 1.4, r: 1.2, weapons: ['cannon'], reach: 0, dmg: [0, 0, 0, 0], windup: 0, recover: 0, block: 0, cost: 240, count: 1, hat: 'none', ai: 'cannon', mass: 6, morale: 100, cannon: { reload: 7, range: 130, min: 12, speed: 56, type: 'solid' }, desc: 'Jin heavy guns cast by Han artisans. Round shot that bounces and bowls through the ranks.' },
  gatling:       { name: 'Nest of Bees', jp: '一窩蜂', hp: 200, speed: 1.4, r: 1.1, weapons: ['gatling'], reach: 0, dmg: [0, 0, 0, 0], windup: 0, recover: 0, block: 0, cost: 420, count: 1, hat: 'none', ai: 'cannon', mass: 6, morale: 100, gun: { dmg: 38, burst: 14, rate: 0.11, spread: 0.045, range: 110, min: 0, cooldown: 4.5 }, desc: "Nagaoka's hand-cranked gun. Fourteen rounds in two seconds." },
  ronin:         { name: 'Liaodong Militia', jp: '遼東民兵', hp: 95, speed: 4.8, r: 0.37, weapons: ['katana'], reach: 2.2, dmg: [52, 44, 36, 44], windup: 0.4, recover: 0.35, block: 0.35, cost: 170, count: 10, hat: 'none', ai: 'melee', mass: 1, morale: 75, skirmish: true, desc: 'Frontier farmers with whatever blades they own. Cheap, fast and ragged, and quick to run.' },
  horokutai:     { name: 'Thunder-Crash Bombers', jp: '震天雷', hp: 75, speed: 4.4, r: 0.36, weapons: ['katana'], reach: 2.1, dmg: [40, 32, 28, 32], windup: 0.45, recover: 0.4, block: 0.2, cost: 260, count: 8, hat: 'none', ai: 'melee', mass: 1, morale: 90, bombs: 3, desc: 'Grenadiers with iron thunder-crash bombs. They hurl them into packed ranks, then draw blades.' },
  yuanyang:      { name: 'Mandarin Duck Team', jp: '鴛鴦陣', hp: 120, speed: 4.2, r: 0.37, weapons: ['yari'], reach: 3.3, dmg: [44, 0, 46, 0], windup: 0.45, recover: 0.4, block: 0.3, cost: 360, count: 12, hat: 'none', ai: 'melee', mass: 1, morale: 115, yuanyang: true, desc: 'Qi Jiguang’s twelve: rattan shields in front, wolf-brushes that snare, long spears that kill what the brushes hold, tridents on the flanks.' },
  horse:         { name: 'Horse', jp: '馬', hp: 160, speed: 0, r: 0.7, weapons: [], reach: 0, dmg: [0, 0, 0, 0], windup: 0, recover: 0, block: 0, cost: 0, count: 1, hat: 'none', mass: 4, morale: 100 },
};
DEFS.cannon = DEFS.armstrong;
DEFS.samurai.shield = true;
// roles in a mandarin duck team: leader, 2 rattan shields, 2 wolf-brushes, 4 long spears, 2 tridents, 1 cook
const YY_ROLE = ['lead', 'shield', 'shield', 'brush', 'brush', 'spear', 'spear', 'spear', 'spear', 'trident', 'trident', 'cook'];
const YY_SLOT = [[0, 1.4], [-0.9, 0.9], [0.9, 0.9], [-0.9, -0.6], [0.9, -0.6], [-0.9, -2.0], [0.9, -2.0], [-0.9, -3.3], [0.9, -3.3], [-1.9, -2.6], [1.9, -2.6], [0, -4.6]];
const YYDEF = {};
const YY_PLAY = { brush: ['Wolf-brush (Langxian)', '狼筅手'], shield: ['Rattan Shield', '藤牌手'], spear: ['Duck-team Long Spear', '長槍手'], trident: ['Trident', '鏜鈀手'] }; // the trades a soldier can take up in assault
{ const b = DEFS.yuanyang; const mk = (o) => Object.assign({}, b, o);
  YYDEF.lead = mk({ weapons: ['katana'], reach: 2.2, dmg: [54, 44, 36, 44], block: 0.5, windup: 0.4 });
  YYDEF.shield = mk({ weapons: ['katana'], reach: 2.0, dmg: [40, 34, 30, 34], block: 0.85, shield: true, hp: 150, windup: 0.4 });
  YYDEF.brush = mk({ weapons: ['yari'], reach: 5.0, dmg: [16, 0, 18, 0], block: 0.35, brush: true, windup: 0.4 });
  YYDEF.spear = mk({ weapons: ['yari'], reach: 4.4, dmg: [46, 0, 52, 0], block: 0.15 });
  YYDEF.trident = mk({ weapons: ['yari'], reach: 2.9, dmg: [44, 0, 42, 0], block: 0.4, trident: true });
  YYDEF.cook = mk({ weapons: ['katana'], reach: 2.0, dmg: [34, 28, 24, 28], block: 0.2, hp: 100 }); }
// the Jin side fields the same drill under other banners
const ALT = {
  samurai: { name: 'Armored Bannermen', jp: '甲兵', desc: 'Eight Banners infantry in studded armor coats. Solid line breakers.', shield: false },
  ashigaru: { name: 'Han Banner Spearmen', jp: '漢軍槍兵', desc: 'Han Chinese bannermen with long spears. Cheap and long-reaching, but quick to break.' },
  horokutai: { name: 'Ujen Grenadiers', jp: '烏真超哈', desc: 'Han Banner grenadiers with iron bombs. They hurl them into packed ranks, then draw blades.' },
  ronin: { name: 'Mongol Raiders', jp: '蒙古兵', desc: 'Light Mongol fighters on foot. Cheap, fast, ragged and quick to run.' },
  cavalry: { name: 'Eight Banners Cavalry', jp: '八旗騎兵', desc: 'Manchu horse archers turned shock riders. They trample infantry at a gallop.' },
  hero: { name: 'Beile', jp: '貝勒' },
};
for (const k in ALT) DEFS[k].alt = Object.assign({}, DEFS[k], ALT[k], { alt: null });
// champion classes: four very different ways to turn a battle, each ability with a readable counter
const HCLASS = [
  { key: 'saint', name: 'Sword Saint', jp: '劍聖', desc: 'Balanced duelist with a dao and a musket. Spins, charges, parries.', hp: 1000, speed: 5.2, weapons: ['katana', 'rifle'], dmg: [110, 85, 72, 85], reach: 2.4, windup: 0.26, scale: 1.15,
    abil: [{ key: 'whirl', name: 'Whirlwind', cd: 8, ctr: 'Leap over it, dodge through it, or Iron guard' }, { key: 'dash', name: 'Dragon charge', cd: 10, ctr: 'Sidestep it; braced spears or a guard stop it' }, { key: 'guard', name: 'Iron guard', cd: 12, ctr: 'Kick it (E), throw bombs, or strike from behind' }, { key: 'cry', name: 'War cry', cd: 25, ctr: 'An enemy war cry drowns it out' }] },
  { key: 'spear', name: 'Spear General', jp: '槍將', desc: 'Long reach with the qiang. Sweeps, vaults over lines, plants an impaling spear wall.', hp: 1100, speed: 4.9, weapons: ['yari', 'revolver'], dmg: [100, 0, 95, 0], reach: 3.3, windup: 0.3, scale: 1.18,
    abil: [{ key: 'crescent', name: 'Crescent sweep', cd: 9, ctr: 'Slow to start: leap it or dodge back' }, { key: 'vault', name: 'Pole vault', cd: 11, ctr: 'Dodge from where he will land; guard stuns him' }, { key: 'brace', name: 'Spear wall', cd: 13, ctr: 'Come from the side or rear, or kick it' }, { key: 'banner', name: 'Lord’s banner', cd: 28, ctr: 'An enemy war cry drowns it out' }] },
  { key: 'gunner', name: 'Fire-lance Gunner', jp: '火器手', desc: 'A heavy niaochong and the arsenal of the Ming: fire lance, thunder bombs, smoke and rockets.', hp: 850, speed: 5.1, weapons: ['rifle', 'katana'], dmg: [80, 60, 52, 60], reach: 2.2, windup: 0.28, scale: 1.1, rifle: { dmg: 150, reload: 1.7, range: 160, spread: 0.012, ads: 0.003, aim: 0, mag: 1 },
    abil: [{ key: 'flame', name: 'Fire lance', cd: 7, ctr: 'Stay beyond six paces; rain makes it sputter' }, { key: 'tbomb', name: 'Thunder bomb', cd: 9, ctr: 'Run from the hissing fuse' }, { key: 'smoke', name: 'Smoke screen', cd: 16, ctr: 'Rush into the smoke with a blade' }, { key: 'rockets', name: 'Fire-arrow rockets', cd: 30, ctr: 'Get away from the red flare' }] },
  { key: 'warlord', name: 'Banner Warlord', jp: '旗主', desc: 'A walking fortress with a great blade. Shakes the earth, rides men down, cannot be broken.', hp: 1400, speed: 4.5, weapons: ['katana'], dmg: [130, 95, 80, 95], reach: 2.5, windup: 0.34, scale: 1.25,
    abil: [{ key: 'quake', name: 'Earthshaker', cd: 10, ctr: 'Leap over the shockwave or dodge it' }, { key: 'ironhorse', name: 'Iron-horse rush', cd: 12, ctr: 'Sidestep it; a Spear wall stops it' }, { key: 'unbreak', name: 'Unbreakable', cd: 16, ctr: 'Fire and bombs burn through; outlast it' }, { key: 'rallyb', name: 'Rally the banners', cd: 30, ctr: 'Kill him before he rallies' }] },
];
const CHAMPC = HCLASS.map(c => [0, 1].map(t => { const d = Object.assign({}, DEFS.hero, { name: c.name, jp: c.jp, hp: c.hp, speed: c.speed, weapons: c.weapons, dmg: c.dmg, reach: c.reach, windup: c.windup, recover: 0.24, morale: 400, champ: true, alt: null, hclass: HCLASS.indexOf(c) }); if (c.rifle) d.rifle = c.rifle; return d; }));
const CHAMP = [Object.assign({}, DEFS.hero, { name: 'Ming Champion', jp: '猛將', hp: 760, speed: 5.0, dmg: [95, 72, 62, 72], windup: 0.26, recover: 0.24, morale: 400, champ: true }), Object.assign({}, DEFS.hero, { name: 'Banner Champion', jp: '巴圖魯', hp: 760, speed: 5.0, dmg: [95, 72, 62, 72], windup: 0.26, recover: 0.24, morale: 400, champ: true })];
CHAMP[0].alt = null; CHAMP[1].alt = null;
function defFor(k, t) { const d = DEFS[k]; return (t === 1 && d.alt) ? d.alt : d; }
for (const k in DEFS) if (!DEFS[k].key) DEFS[k].key = k;
const ROSTER = [
  ['yuanyang', 'samurai', 'ashigaru', 'rifle_imp', 'rifle_spencer', 'jinshotai', 'jigen', 'horokutai', 'ronin', 'cavalry', 'armstrong', 'gatling'],
  ['samurai', 'ashigaru', 'rifle_sho', 'archer', 'shinsengumi', 'byakkotai', 'horokutai', 'ronin', 'cavalry', 'cannon4'],
];
const AI_NAMES = [['Yuan Chonghuan', 'Sun Chengzong', 'Mao Wenlong', 'Zu Dashou', 'Lu Xiangsheng'], ['Hong Taiji', 'Daišan', 'Dorgon', 'Ajige', 'Amin']];
const MODES = { standard: { name: 'Field battle' }, grand: { name: 'Grand battle' }, chaos: { name: 'Chaos' }, officers: { name: 'Officers' }, story: { name: 'Story' }, heroes: { name: 'Heroes' }, soldier: { name: 'Path of a Soldier' }, campaign: { name: 'Co-op campaign' }, assault: { name: 'Assault' } };
// 小兵之路: the role a soldier enlists in, by side
const SROLE = [{ musket: 'rifle_imp', spear: 'ashigaru', shield: 'samurai', duck: 'yuanyang', sanyan: 'rifle_spencer', skirm: 'jinshotai', cavalry: 'cavalry', bomber: 'horokutai', militia: 'ronin' },
  { musket: 'rifle_sho', spear: 'ashigaru', shield: 'samurai', archer: 'archer', guard: 'shinsengumi', mongol: 'byakkotai', cavalry: 'cavalry', bomber: 'horokutai', militia: 'ronin' }];
// arms a player can choose: every melee arm rides on an existing fighting style (blade or spear), with its own numbers and tricks
const ARMS = {
  dao: { w: 'katana', zh: '腰刀', en: 'Dao saber', reach: 2.2, dmg: [56, 46, 38, 46], windup: 0.36, recover: 0.32, desc: 'The army saber. Quick, broad, forgiving.' },
  jian: { w: 'katana', zh: '劍', en: 'Jian straight sword', reach: 2.35, dmg: [40, 36, 54, 36], windup: 0.27, recover: 0.25, parry: 0.26, desc: 'Fast, deadly thrusts and the widest parry window. Light cuts.' },
  guandao: { w: 'katana', zh: '偃月刀', en: 'Guandao glaive', reach: 3.1, dmg: [102, 84, 62, 84], windup: 0.62, recover: 0.55, posture: 1.6, big: true, speed: 0.93, desc: 'Huge reach and crushing sweeps, but slow to swing and slow to recover.' },
  mace: { w: 'katana', zh: '鐵鞭', en: 'Iron mace', reach: 1.95, dmg: [62, 54, 42, 54], windup: 0.4, recover: 0.36, crush: 0.4, posture: 1.9, mace: true, desc: 'Short, but it breaks guards: blocked blows still bruise and wreck balance.' },
  qiang: { w: 'yari', zh: '槍', en: 'Qiang spear', reach: 3.35, dmg: [50, 0, 54, 0], windup: 0.38, recover: 0.36, desc: 'Keep them at the tip. Useless once they are inside it.' },
};
const RANGED = {
  niaochong: { w: 'rifle', zh: '鳥銃', en: 'Niaochong musket', p: { rifle: { dmg: 95, reload: 2.4, range: 170, spread: 0.014, ads: 0.0035, aim: 0, mag: 1 } }, desc: 'Long, accurate matchlock.' },
  sanyan: { w: 'revolver', zh: '三眼銃', en: 'Three-eyed gun', p: { revolver: { dmg: 58, mag: 3, cycle: 0.35, reload: 4.2, range: 45, spread: 0.035, ads: 0.014 } }, desc: 'Three quick shots at close range, then a long reload.' },
  xbow: { w: 'bow', zh: '弩', en: 'Crossbow', p: { bow: { dmg: 92, reload: 3.0, range: 110, speed: 74, aim: 0, xbow: true, mag: 1 } }, desc: 'A flat, heavy bolt. Rain does not wet it; armor barely stops it.' },
  bow: { w: 'bow', zh: '弓', en: 'Horn bow', p: { bow: { dmg: 58, reload: 1.1, range: 90, speed: 52, aim: 0, mag: 1 } }, desc: 'Fast shooting. Lead your target and arc the arrow.' },
};
function armUnit(u, arms, mul) {
  if (!arms) return; const d = u.def, n = Object.assign({}, d); const ws = d.weapons.slice();
  let ranged = ws.find(w => w === 'rifle' || w === 'bow' || w === 'revolver') || null, melee = ws.find(w => w === 'katana' || w === 'yari') || null;
  if (arms.ranged === 'none') ranged = null; else if (RANGED[arms.ranged]) { const R = RANGED[arms.ranged]; ranged = R.w; for (const k in R.p) n[k] = Object.assign({}, R.p[k]); }
  if (ARMS[arms.melee]) { const A = ARMS[arms.melee]; melee = A.w; n.reach = A.reach; n.dmg = A.dmg.map(x => x * mul); n.windup = A.windup; n.recover = A.recover; n.parry = A.parry; n.crush = A.crush; n.posture = A.posture; n.big = A.big; n.mace = A.mace; n.arm = arms.melee; if (A.speed) n.speed = d.speed * A.speed; }
  if (arms.shield) { n.shield = true; n.block = Math.max(d.block || 0, 0.6); }
  n.weapons = [ranged, melee].filter((w, i, a) => w && a.indexOf(w) === i); if (!n.weapons.length) n.weapons = ['katana'];
  u.def = n; u.weapon = n.weapons[0]; const g = gunOf(n, u.weapon); u.ammo = g ? (g.mag || 1) : 0; u.ammoR = n.revolver ? n.revolver.mag : 0; u.loaded = !!g; if (ranged && !u.shots) u.shots = 30;
}
const roleType = (r, t) => SROLE[t][r] || SROLE[t].musket || 'samurai';
// Heroes: scripted sieges in phases. Ming (team 0) defends; the Jin (team 1) attack from the south.
const SCEN = {
  ningyuan: { battle: 'hakodate', name: 'Ningyuan, 1626', bridge: [0, 30], gate: [0, 47, 5.2, 1.5, 3.4], ladders: [[-15, 47, 1.5], [15, 47, 1.5]], cover: [[-13, 36.3], [-8.5, 36.3], [-4.5, 36.3], [4.5, 36.3], [8.5, 36.3], [13, 36.3], [-10, 18], [10, 18], [-14, -12], [-7, -12], [7, -12], [14, -12]], citadel: [0, 74, 13], heroSpawn: [[0, 58], [0, -92]], limit: 30 * 60 * 11,
    def: [['Man Gui', A2('samurai ashigaru rifle_spencer jigen'), 0, 20], ['Yuan Chonghuan', A2('armstrong armstrong rifle_imp rifle_imp gatling'), 0, 72], ['Zu Dashou', A2('samurai samurai cavalry ashigaru'), 0, 132]],
    att: [['Nurhaci', A2('samurai samurai shinsengumi archer horokutai'), -40, -100], ['Daišan', A2('ashigaru samurai horokutai archer'), 40, -100], ['Hong Taiji', A2('shinsengumi archer cavalry byakkotai cannon4'), 0, -130]],
    text: ['The outer works: the Ming hold the moat bridge behind their mantlets', 'The walls: ram the south gate and raise the scaling ladders', 'The citadel: the gate has fallen! Fight for the hall'] },
  liaoyang: { battle: 'aizu', name: 'Liaoyang, 1621', gateHp: 7500, bridge: [0, 62], gate: [0, 78, 3.8, 0.8, 2.6], ladders: [[-11, 78, 0.7], [11, 78, 0.7]], cover: [[-12, 69.5], [-7.5, 69.5], [7.5, 69.5], [12, 69.5], [-9, 40], [9, 40], [-15, 20], [-8, 20], [8, 20], [15, 20]], citadel: [0, 94, 12], heroSpawn: [[0, 88], [0, -92]], limit: 30 * 60 * 11,
    def: [['He Tingkui', A2('samurai ashigaru rifle_imp ronin'), 0, 52], ['Yuan Yingtai', A2('rifle_imp rifle_spencer armstrong samurai'), 0, 92]],
    att: [['Nurhaci', A2('samurai shinsengumi archer horokutai'), -45, -100], ['Ajige', A2('samurai ashigaru archer horokutai'), 45, -100], ['Dodo', A2('cavalry cavalry byakkotai archer cannon4'), 0, -130]],
    text: ['The moat: the Jin must seize the bridge over the flooded moat', 'The walls: the ram at the gate, ladders against the ramparts', 'The gate tower: Liaoyang is breached! Hold the tower'] },
};
function A2(s) { return s.split(' '); }
// Story: seven battles of the Ming–Jin wars. Each side lists its commanders; the first is the player's when playing that side.
const A = (s) => s.split(' ');
const STORY = [
  { battle: 'field', ming: [['Du Song', A('samurai rifle_imp ashigaru jigen cavalry')], ['Ma Lin', A('rifle_imp ashigaru samurai rifle_spencer')]],
    jin: [['Nurhaci', A('samurai archer shinsengumi cavalry cavalry')], ['Daišan', A('samurai ashigaru archer cavalry')], ['Hong Taiji', A('shinsengumi archer samurai byakkotai')]] },
  { battle: 'toba', ming: [['Chen Ce', A('samurai samurai rifle_imp jigen ashigaru')], ['Tong Zhongkui', A('rifle_spencer rifle_imp ashigaru horokutai')]],
    jin: [['Hong Taiji', A('samurai archer cavalry shinsengumi')], ['Daišan', A('samurai archer archer cavalry')], ['Amin', A('ashigaru archer byakkotai cavalry')]] },
  { battle: 'aizu', ming: [['Yuan Yingtai', A('rifle_imp rifle_imp samurai ashigaru armstrong')], ['He Tingkui', A('ashigaru ronin rifle_spencer horokutai')]],
    jin: [['Nurhaci', A('samurai shinsengumi archer cavalry cavalry')], ['Ajige', A('samurai ashigaru archer cannon4')], ['Dodo', A('byakkotai archer horokutai cavalry')]] },
  { battle: 'hakodate', ming: [['Yuan Chonghuan', A('armstrong armstrong rifle_imp samurai')], ['Man Gui', A('cavalry cavalry samurai rifle_spencer')], ['Zu Dashou', A('rifle_imp ashigaru samurai gatling')]],
    jin: [['Nurhaci', A('samurai samurai shinsengumi archer cavalry')], ['Daišan', A('samurai ashigaru horokutai archer cannon4')], ['Hong Taiji', A('shinsengumi archer cavalry byakkotai')]] },
  { battle: 'ueno', ming: [['Hong Chengchou', A('samurai rifle_imp rifle_imp armstrong jigen')], ['Cao Bianjiao', A('cavalry samurai ashigaru ronin')]],
    jin: [['Hong Taiji', A('shinsengumi samurai archer cannon4 cavalry')], ['Dorgon', A('samurai archer archer horokutai')], ['Ajige', A('archer ashigaru byakkotai cannon4')]] },
  { battle: 'bonari', ming: [['Wu Sangui', A('cavalry cavalry samurai rifle_imp jigen')], ['Gao Diyuan', A('rifle_imp ashigaru horokutai armstrong')]],
    jin: [['Dorgon', A('shinsengumi samurai cavalry archer cannon4')], ['Ajige', A('samurai archer archer horokutai')], ['Dodo', A('cavalry cavalry byakkotai archer')]] },
  { battle: 'nagaoka', ming: [['Shi Kefa', A('samurai rifle_imp rifle_spencer ronin jigen')], ['Liu Zhaoji', A('ronin ronin ashigaru horokutai')]],
    jin: [['Dodo', A('shinsengumi samurai cavalry cannon4 archer')], ['Ajige', A('samurai archer archer horokutai')], ['Bolo', A('ashigaru archer byakkotai cavalry')]] },
];
const FACTION = [{ name: 'Ming Army', jp: '大明', short: 'Ming' }, { name: 'Later Jin', jp: '後金', short: 'Jin' }];
const BATTLES = {
  field:    { name: 'Sarhu', jp: '薩爾滸', when: 'April 1619', biome: 'autumn', fog: 0, terrain: 0.7, features: ['hill'], desc: 'Jiefan hill with a shrine arch on the crest. Whoever holds the height shoots farther and cuts downhill.' },
  toba:     { name: 'Hun River', jp: '渾河', when: 'March 1621', biome: 'winter', fog: 0.35, terrain: 0.6, features: ['river', 'village'], desc: 'A half-frozen river splits the field outside Shenyang. Two bridges and a shallow ford are the only quick crossings; mist shortens every musket.' },
  ueno:     { name: 'Songshan', jp: '松山', when: 'Summer 1641', biome: 'summer', fog: 0.1, terrain: 0.7, features: ['temple', 'houses'], desc: 'Hong Chengchou\'s men hold a walled temple compound on a raised plateau. Storm the gate or shell it with heavy guns.' },
  nagaoka:  { name: 'Yangzhou', jp: '揚州', when: 'May 1645', biome: 'summer', weather: 'storm', fog: 0.3, terrain: 0.3, features: ['paddies', 'flankriver'], desc: 'Jiangnan rice paddies under a spring thunderstorm. Rain fouls matchlocks, lightning seeks the banners, and one bridge guards the western flank.' },
  aizu:     { name: 'Liaoyang', jp: '遼陽', when: 'April 1621', biome: 'autumn', fog: 0.15, terrain: 0.6, features: ['castle', 'streets'], desc: 'The Liaodong capital: a gate tower on its stone base, ringed by a moat. Fight through the city streets to reach the gate.' },
  hakodate: { name: 'Ningyuan', jp: '寧遠', when: 'February 1626', biome: 'winter', fog: 0.05, terrain: 0.4, features: ['starfort', 'sea'], desc: 'Yuan Chonghuan\'s fortress by the Bohai Sea, its walls bristling with Portuguese-pattern cannon. The sea lies to the east.' },
  abudali:  { name: 'Abudali Pass', jp: '阿布達里岡', when: 'April 1619', biome: 'winter', fog: 0.3, terrain: 0.45, features: ['pass'], hidden: true, desc: 'A narrow valley in the mountains east of Hetu Ala, its slopes thick with pine and late snow.' },
  bjgate:   { name: 'The Guangqu Gate', jp: '廣渠門', when: 'December 1629', biome: 'winter', fog: 0.15, terrain: 0.2, features: ['streets'], hidden: true, desc: 'The suburb outside the outer wall of Beijing. The wall and its gate towers stand behind, too big to see the end of.' },
  zroad:    { name: 'The road', jp: '道', when: '1619', biome: 'winter', fog: 0.2, terrain: 0.3, features: [], hidden: true, desc: 'A cart road through the Liaodong hills, a village by the way.' },
  sjvil:    { name: 'A village east of Tongzhou', jp: '村', when: 'November 1629', biome: 'winter', fog: 0.22, terrain: 0.12, features: [], hidden: true, desc: 'A walled farming village on the Tongzhou road: courtyard houses either side of the street, a well in the middle.' },
  zcamp:    { name: 'Camp', jp: '營', when: '1619', biome: 'night', fog: 0.2, terrain: 0.25, features: [], hidden: true, desc: 'A night camp in the hills.' },
  siegecity: { name: 'Ningyuan (siege)', jp: '寧遠', when: 'February 1626', biome: 'winter', fog: 0.12, terrain: 0.08, features: [], hidden: true, desc: 'A walled town on the frozen coast: ditch, rampart, gatehouse and streets.' },
  bonari:   { name: 'Shanhai Pass', jp: '山海關', when: 'May 1644', biome: 'spring', fog: 0.25, terrain: 0.5, features: ['pass'], desc: 'The First Pass Under Heaven: a narrow gap between steep ridges, blocked by two lines of earthworks. Flanking over the slopes is slow and costly.' },
};
// terrain features (deterministic: only + - * / sqrt and DM trig)
const TERR = { scale: 1, hills: [], plateaus: [], river: null, moat: null, pass: null, sea: null };
function sstep(a, b, x) { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function setTerrain(cfg) { TERR.scale = cfg.scale; TERR.hills = cfg.hills || []; TERR.plateaus = cfg.plateaus || []; TERR.river = cfg.river || null; TERR.moat = cfg.moat || null; TERR.pass = cfg.pass || null; TERR.sea = cfg.sea || null; TERR.swall = cfg.swall || null; TERR.sditch = cfg.sditch || null; buildHeightCache(); }
// height field component: the terrain is sampled once per battle into a grid and read back bilinearly (the analytic
// function is dozens of sin() calls; every unit asks for its height several times a tick)
const HC = { on: false, x0: -192, step: 1, n: 385, h: null };
function buildHeightCache() { HC.on = false; const n = HC.n; if (!HC.h) HC.h = new Float64Array(n * n); const h = HC.h;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = terrainHExact(HC.x0 + i * HC.step, HC.x0 + j * HC.step); HC.on = true; }
function setTerrainScale(s) { setTerrain({ scale: s }); }
// returns how deep in water a point is: 0 dry, 1 river channel, 2 ford/shallows; and bridge flag
function waterAt(x, z) {
  const rv = TERR.river;
  if (rv) {
    const along = rv.axis === 'x' ? x : z, across = rv.axis === 'x' ? z : x;
    const c = rv.c0 + rv.amp * sin(along * rv.freq + rv.ph); const d = across - c; const ad = d < 0 ? -d : d;
    if (ad < rv.w * 0.8) { for (let i = 0; i < rv.bridges.length; i++) { const b = rv.bridges[i]; if (along > b.at - b.hw && along < b.at + b.hw) return b.ford ? 2 : -1; } return 1; }
  }
  const m = TERR.moat;
  if (m) { const dx = x - m.x, dz = z - m.z; const r = Math.sqrt(dx * dx + dz * dz); const ad = r > m.R ? r - m.R : m.R - r; if (ad < m.w * 0.8) { for (let i = 0; i < m.gates.length; i++) { const g = m.gates[i]; if ((x - g[0]) * (x - g[0]) + (z - g[1]) * (z - g[1]) < 36) return -1; } return 1; } }
  if (TERR.sditch) { const r = siegeDitchWater(TERR.sditch, x, z); if (r) return r; }
  if (TERR.sea && x > TERR.sea.x0 + 10) return 1;
  return 0;
}
function terrainH(x, z) {
  if (HC.on) { const fx = (x - HC.x0) / HC.step, fz = (z - HC.x0) / HC.step; let i = Math.floor(fx), j = Math.floor(fz); const n = HC.n;
    if (i >= 0 && j >= 0 && i < n - 1 && j < n - 1) { const tx = fx - i, tz = fz - j, h = HC.h, k = j * n + i; const a = h[k] + (h[k + 1] - h[k]) * tx, b = h[k + n] + (h[k + n + 1] - h[k + n]) * tx; return a + (b - a) * tz; } }
  return terrainHExact(x, z);
}
function terrainHExact(x, z) {
  let h = TERR.scale * (2.2 * sin(x * 0.021 + 0.7) * cos(z * 0.017) + 1.1 * sin(x * 0.047 + 2.1) * sin(z * 0.039 + 0.4) + 0.45 * sin(x * 0.11) * cos(z * 0.09 + 1.2));
  const hs = TERR.hills;
  for (let i = 0; i < hs.length; i++) { const q = hs[i]; const dx = x - q.x, dz = z - q.z; const d2 = dx * dx + dz * dz, r2 = q.r * q.r; if (d2 < r2) { const t = 1 - d2 / r2; h += q.h * t * t * (3 - 2 * t); } }
  const ps = TERR.plateaus;
  for (let i = 0; i < ps.length; i++) { const q = ps[i]; const dx = x - q.x, dz = z - q.z; const d = Math.sqrt(dx * dx + dz * dz); if (d < q.r1) h += q.h * (1 - sstep(q.r0, q.r1, d)); }
  const pa = TERR.pass;
  if (pa) { const ax = x < 0 ? -x : x; const k = sstep(pa.r0, pa.r1, ax); h += pa.h * k * (0.85 + 0.15 * sin(z * 0.07 + (x < 0 ? 1.3 : 4.1))) + 4 * k * sin(z * 0.19 + x * 0.05); }
  const rv = TERR.river;
  if (rv) {
    const along = rv.axis === 'x' ? x : z, across = rv.axis === 'x' ? z : x;
    const c = rv.c0 + rv.amp * sin(along * rv.freq + rv.ph); const d = across - c; const ad = d < 0 ? -d : d;
    if (ad < rv.w) { let depth = rv.depth; for (let i = 0; i < rv.bridges.length; i++) { const b = rv.bridges[i]; if (along > b.at - b.hw - 2 && along < b.at + b.hw + 2) { depth = b.ford ? rv.depth * 0.35 : 0; } } const t = 1 - (ad / rv.w) * (ad / rv.w); h -= depth * t; }
  }
  const m = TERR.moat;
  if (m) { const dx = x - m.x, dz = z - m.z; const r = Math.sqrt(dx * dx + dz * dz); const ad = r > m.R ? r - m.R : m.R - r; if (ad < m.w) { let gate = false; for (let i = 0; i < m.gates.length; i++) { const g = m.gates[i]; if ((x - g[0]) * (x - g[0]) + (z - g[1]) * (z - g[1]) < 49) gate = true; } if (!gate) { const t = 1 - (ad / m.w) * (ad / m.w); h -= m.depth * t; } } }
  if (TERR.swall) h = siegeWallH(TERR.swall, x, z, h);
  if (TERR.sditch) h = siegeDitchH(TERR.sditch, x, z, h);
  const sea = TERR.sea;
  if (sea && x > sea.x0) h -= sea.depth * sstep(sea.x0, sea.x0 + 22, x);
  return h;
}
const ABILITY = {
  kiai:      { name: 'War cry', dur: 300, cd: 1350, desc: 'Faster, harder-hitting and fearless for 10 s' },
  spearwall: { name: 'Spear wall', dur: 450, cd: 1200, desc: 'Brace: charging cavalry is stopped and wounded' },
  aimed:     { name: 'Aimed volley', dur: 360, cd: 1200, desc: 'Steadier aim: tighter, deadlier fire for 12 s' },
  wedge:     { name: 'Wedge charge', dur: 300, cd: 1350, desc: 'Faster gallop and crushing tramples for 10 s' },
  canister:  { name: 'Grapeshot', dur: 450, cd: 900, desc: 'Next shot is a close-range blast of iron balls' },
  sweep:     { name: 'Full swarm', dur: 300, cd: 900, desc: 'Next burst is longer and faster' },
};
function abilityOf(def) { if (def.gun) return 'sweep'; if (def.cannon) return 'canister'; if (def.mounted) return 'wedge'; if (def.ai === 'ranged') return 'aimed'; if (def.weapons[0] === 'yari') return 'spearwall'; return 'kiai'; }
function counterDir(d) { return d === DIR_RIGHT ? DIR_LEFT : d === DIR_LEFT ? DIR_RIGHT : d; }
function weaponDir(weapon, d) {
  if (weapon === 'yari') return d === DIR_UP ? DIR_UP : DIR_DOWN;
  if (weapon === 'rifle' || weapon === 'bow' || weapon === 'revolver') return DIR_DOWN;
  return d;
}
function isGun(def, w) { return (w === 'rifle' && def.rifle) || (w === 'revolver' && def.revolver) || (w === 'bow' && def.bow); }
function gunOf(def, w) { return w === 'rifle' ? def.rifle : w === 'revolver' ? def.revolver : w === 'bow' ? def.bow : null; }
function spacingOf(def) { return def.mounted ? 2.6 : def.ai === 'cannon' ? 4 : 1.4; }
function lineCols(n) { return n <= 12 ? n : Math.ceil(n / 2); }
function squadWidth(def) { return lineCols(def.count) * spacingOf(def) * (def.skirmish ? 2 : 1); }
// returns [lateral, depth] (depth > 0 = forward)
function slotOffset(form, i, n, s, colsOverride) {
  if (colsOverride > 0 && (form === FORM_LINE || form === FORM_LOOSE)) {
    const sp = form === FORM_LOOSE ? s * 2 : s; const cols = Math.min(colsOverride, n); const r = Math.floor(i / cols), c = i % cols;
    return [(c - (cols - 1) / 2) * sp, -r * sp * 1.4];
  }
  if (form === FORM_COLUMN) { const cols = 3; const r = Math.floor(i / cols), c = i % cols; return [(c - (cols - 1) / 2) * s, -r * s * 1.2]; }
  if (form === FORM_WEDGE) { let r = 0; while ((r + 1) * (r + 2) / 2 <= i) r++; const c = i - r * (r + 1) / 2; return [(c - r / 2) * s * 1.3, -r * s * 1.1]; }
  const sp = form === FORM_LOOSE ? s * 2 : s;
  const cols = lineCols(n); const r = Math.floor(i / cols), c = i % cols;
  return [(c - (cols - 1) / 2) * sp, -r * sp * 1.4];
}

class Sim {
  constructor(cfg) {
    this.cfg = cfg; this.seed = cfg.seed | 0; this.rng = new RNG(this.seed);
    this.scen = cfg.mode === 'heroes' ? (SCEN[cfg.scen] || SCEN.ningyuan) : null; this.heroMode = !!this.scen;
    this.battle = cfg.mode === 'campaign' ? (MISSIONS[cfg.mission] || MISSIONS.taizhou).battle : cfg.mode === 'assault' ? (OPS[cfg.op] || OPS.liaoyang).battle : this.scen ? this.scen.battle : cfg.mode === 'story' ? STORY[clamp(cfg.chapter | 0, 0, STORY.length - 1)].battle : BATTLES[cfg.battle] ? cfg.battle : 'field'; this.bdef = BATTLES[this.battle];
    this.solo = (cfg.players || []).length === 1; this.xc = XCOMBAT || !!cfg.xcombat; this.noRout = true; // nobody routs: squads fight on (and beaten mission groups withdraw by script)
    this.mode = MODES[cfg.mode] ? cfg.mode : 'standard'; this.chaos = this.mode === 'chaos'; this.real = this.mode === 'soldier' || this.mode === 'assault'; this.lethal = this.mode === 'soldier';
    this.mission = this.mode === 'campaign' ? (MISSIONS[cfg.mission] || MISSIONS.taizhou) : this.mode === 'assault' ? (OPS[cfg.op] || OPS.liaoyang) : null;
    if (this.mission && this.mission.bdef) this.bdef = Object.assign({}, this.bdef, this.mission.bdef); // a story mission can re-dress a map: another season, rain, another name
    this.layout = this.planTerrain(); setTerrain(this.layout);
    this.rangeMul = 1 - 0.35 * this.bdef.fog;
    this.tick = 0; this.events = []; this.units = []; this.squads = []; this.players = []; this.generals = [];
    this.projectiles = []; this.obstacles = []; this.boxes = []; this.zones = []; this.deco = []; this.winner = -1; this.total = [0, 0];
    this.phase = 0; this.battleTick = 0;
    this.rain = this.bdef.weather === 'storm'; if (this.rain) this.rangeMul *= 0.88;
    this.objectives = (this.layout.objectives || []).map((o, i) => ({ id: i, x: o.x, z: o.z, r: o.r, name: o.name, ctrl: 0, owner: -1 }));
    this.score = [0, 0]; this.navals = []; this.nextBolt = 900; this.duels = [];
    { const W = Math.ceil((HALF * 2) / FIRE_CS); this.fireW = W; this.fuel = new Float32Array(W * W); this.burnT = new Int32Array(W * W); this.fireState = new Uint8Array(W * W); }
    this.cellSize = 4; this.gridW = Math.ceil((HALF * 2 + 10) / this.cellSize); this.gridN = this.gridW * this.gridW;
    this.nearBuf = new Int32Array(2048); this.sph = new Float64Array(40);
    this.teamAlive = [[], []];
    this.orderQ = []; this.waves = []; this.rp = [0, 0]; this.ladders = []; this.pickups = []; this.smokes = []; this.rocketStrikes = [];
    this.genMap();
    if (this.heroMode) { const g = this.scen.gate; this.boxes.push({ x: g[0], z: g[1], hw: g[2], hd: g[3], h: g[4], kind: 'gate' }); const ghp = this.scen.gateHp || 4200; this.gate = { box: this.boxes.length - 1, hp: ghp, max: ghp }; for (const L of this.ladders) for (const q of this.boxes) if (q.kind !== 'gate' && Math.abs(q.z - L.z) < q.hd + 0.5 && L.x > q.x - q.hw - 1.5 && L.x < q.x + q.hw + 1.5) q.lad = L; this.ram = { x: g[0], z: -88, hp: 1800, max: 1800, moving: false, atGate: false, stopZ: g[1] - g[3] - 2.6 }; this.hphase = 0; this.citT = 0; this.homeZ = [150, -150]; }
    this.setupArmies(cfg.players);
    this.initFuel();
    if (this.mode === 'officers') for (const p of this.players) if (!p.ai) for (const id of p.squads) this.squads[id].order = ORD_FOLLOW;
    this.wagons = [];
    if (!this.heroMode && !this.chaos && this.battle !== 'siegecity') for (let t = 0; t < 2; t++) { const zz = t === 0 ? -128 : 128; for (const xx of [-26, 26]) { let x = xx, z = zz; for (let k = 0; k < 8 && (waterAt(x, z) !== 0); k++) z += t === 0 ? 4 : -4; this.wagons.push({ id: this.wagons.length, team: t, x, z, burnt: false, raid: 0 }); } }
    { const wr = new RNG(this.seed ^ 0x77a1); this.wx = { at: 30 * (110 + wr.int(130)), kind: this.rain ? 'clear' : wr.next() < 0.5 ? 'fog' : 'rain', done: !!(this.mission && (this.mission.camp || this.mission.soldier)), lift: 0 }; }
    if (this.vets && this.vets.length && this.players[0]) { // veterans of earlier chapters: their losses and their stars march with them
      const used = {}; this.vets.forEach((v) => { const sid = this.players[0].squads.find(id => !used[id] && this.squads[id].type === v.type); if (sid === undefined) return; used[sid] = 1; const sq = this.squads[sid]; const xp = clamp(v.xp | 0, 0, 200); sq.xp = xp; sq.stars = xp >= 30 ? 3 : xp >= 15 ? 2 : xp >= 6 ? 1 : 0; sq.moraleMax = (sq.def.morale || 100) + sq.stars * 10; sq.morale = sq.moraleMax; sq.veteran = true;
        const keep = clamp(v.n | 0, 1, sq.count); for (let k = keep; k < sq.unitIds.length; k++) { const u = this.units[sq.unitIds[k]]; u.dead = true; u.hp = 0; this.total[u.team]--; } sq.aliveCount = keep; }); }
    if (this.heroMode) { const S2 = this.scen; this.objectives = [{ id: 0, x: S2.bridge[0], z: S2.bridge[1], r: 11, name: 'Moat bridge', ctrl: 100, owner: 0 }, { id: 1, x: S2.citadel[0], z: S2.citadel[1], r: S2.citadel[2], name: 'Citadel', ctrl: 100, owner: 0 }];
      this.phase = 1; this.battleTick = 0; for (const p of this.players) p.ready = true; this.heroDirectives(); }
    if (this.mission) { this.phase = 1; this.battleTick = 0; for (const p of this.players) p.ready = true; }
    if (this.real) { this.phase = 1; this.battleTick = 0; for (const p of this.players) p.ready = true; if (this.lethal) this.tuneReal(); else { for (const u of this.units) u.bombs = 0; for (const p of this.players) p.bombs = 0; } }
    if (this.chaos) { this.objectives.length = 0; this.phase = 1; this.battleTick = 0; this.nextChaos = 30 * 14; for (const p of this.players) { p.auto = true; p.ready = true; } }
    this.head = new Int32Array(this.gridN); this.next = new Int32Array(this.units.length);
    this.obsHead = new Int32Array(this.gridN).fill(-1); this.obsNext = new Int32Array(this.obstacles.length);
    for (let i = 0; i < this.obstacles.length; i++) { const o = this.obstacles[i]; const c = this.cellOf(o.x, o.z); this.obsNext[i] = this.obsHead[c]; this.obsHead[c] = i; }
    // boxes (houses, walls) are registered in every cell they touch, with a one-cell margin
    this.boxCells = new Array(this.gridN).fill(null);
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i]; const cs = this.cellSize, W = this.gridW;
      const x0 = Math.max(0, Math.floor((b.x - b.hw - cs + HALF + 5) / cs)), x1 = Math.min(W - 1, Math.floor((b.x + b.hw + cs + HALF + 5) / cs));
      const z0 = Math.max(0, Math.floor((b.z - b.hd - cs + HALF + 5) / cs)), z1 = Math.min(W - 1, Math.floor((b.z + b.hd + cs + HALF + 5) / cs));
      for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) { const c = cz * W + cx; if (!this.boxCells[c]) this.boxCells[c] = []; this.boxCells[c].push(i); }
    }
    this.buildNav(); this.flowBudget = 4;
  }
  // ---------- map ----------
  planTerrain() {
    const b = this.battle, L = { scale: this.bdef.terrain, hills: [], plateaus: [] };
    const r = new RNG(this.seed ^ 0x1234567);
    if (b === 'field') { L.hills.push({ x: 0, z: 2, r: 72, h: 12 }); L.hills.push({ x: r.range(-150, -110), z: r.range(-40, 40), r: 35, h: 5 }); L.hills.push({ x: r.range(110, 150), z: r.range(-40, 40), r: 35, h: 5 }); }
    if (b === 'toba') L.river = { axis: 'x', c0: 0, amp: 9, freq: 0.019, ph: r.range(0, 6), w: 9, depth: 3.6, bridges: [{ at: -78, hw: 4 }, { at: 74, hw: 4 }, { at: 0, hw: 9, ford: true }] };
    if (b === 'ueno') { const cx = r.range(-25, 25); this.templeX = cx; L.plateaus.push({ x: cx, z: 72, r0: 32, r1: 46, h: 7 }); }
    if (b === 'nagaoka') L.river = { axis: 'z', c0: -105, amp: 10, freq: 0.022, ph: r.range(0, 6), w: 11, depth: 3.2, bridges: [{ at: r.range(-30, 30), hw: 4.5 }] };
    if (b === 'aizu') { L.plateaus.push({ x: 0, z: 96, r0: 21, r1: 27, h: 8 }); L.moat = { x: 0, z: 96, R: 33, w: 5, depth: 2.8, gates: [[0, 63]] }; L.hills.push({ x: -150, z: 40, r: 60, h: 14 }); L.hills.push({ x: 160, z: -20, r: 55, h: 12 }); }
    if (b === 'hakodate') { L.plateaus.push({ x: 0, z: 74, r0: 34, r1: 38, h: 1.6 }); L.moat = { x: 0, z: 74, R: 44, w: 5, depth: 2.6, gates: [[0, 30], [0, 118]] }; L.sea = { x0: 128, depth: 7 }; }
    if (b === 'bonari') L.pass = { r0: 24, r1: 56, h: 30 };
    if (b === 'siegecity') { L.swall = { z0: SG.z0, z1: SG.z1, h: SG.h, gate: SG.gate, ramps: [-60, -12, 12, 60] }; L.sditch = { zc: SG.ditchZ, w: SG.ditchW, depth: 2.6, bridge: SG.gate, fills: SG.fills.map((f, i) => ({ x: f[0], hw: f[1], done: false, key: i ? 'ditchE' : 'ditchW' })) }; }
    if (b === 'abudali') { L.pass = { r0: 15, r1: 46, h: 24 }; L.hills.push({ x: -34, z: 6, r: 30, h: 6 }); L.hills.push({ x: 30, z: -48, r: 26, h: 5 }); }
    if (b === 'sjvil') { L.hills.push({ x: -130, z: 60, r: 70, h: 9 }); L.hills.push({ x: 130, z: -50, r: 70, h: 8 }); }
    if (b === 'zroad') { L.hills.push({ x: -105, z: -30, r: 70, h: 13 }); L.hills.push({ x: 110, z: 50, r: 75, h: 15 }); L.hills.push({ x: -95, z: 110, r: 50, h: 9 }); L.hills.push({ x: 0, z: 70, r: 30, h: 2.5 }); }
    if (b === 'bjgate') { L.hills.push({ x: -170, z: -40, r: 70, h: 5 }); L.hills.push({ x: 170, z: -90, r: 60, h: 4 }); }
    if (b === 'zcamp') { L.hills.push({ x: -90, z: 60, r: 70, h: 14 }); L.hills.push({ x: 100, z: -40, r: 80, h: 16 }); L.hills.push({ x: 0, z: 130, r: 70, h: 12 }); }
    // objectives worth holding
    const O = [];
    if (b === 'field') O.push({ x: 0, z: 4, r: 12, name: 'Jiefan crest' });
    if (b === 'toba') { const rv = L.river; for (const br of rv.bridges) O.push({ x: br.at, z: rv.c0 + rv.amp * sin(br.at * rv.freq + rv.ph), r: 11, name: br.ford ? 'The ford' : (br.at < 0 ? 'West bridge' : 'East bridge') }); }
    if (b === 'ueno') { O.push({ x: this.templeX, z: 50, r: 10, name: 'Mountain gate' }); O.push({ x: this.templeX, z: 80, r: 11, name: 'Main hall' }); }
    if (b === 'nagaoka') { const rv = L.river, br = rv.bridges[0]; O.push({ x: rv.c0 + rv.amp * sin(br.at * rv.freq + rv.ph), z: br.at, r: 11, name: 'Flank bridge' }); O.push({ x: 40, z: 0, r: 13, name: 'Crossroads' }); }
    if (b === 'aizu') { O.push({ x: 0, z: 63, r: 9, name: 'City gate' }); O.push({ x: 0, z: 6, r: 14, name: 'Market quarter' }); }
    if (b === 'hakodate') { O.push({ x: 0, z: 74, r: 13, name: 'Ningyuan citadel' }); O.push({ x: 112, z: -30, r: 12, name: 'Juehua battery' }); }
    if (b === 'bonari') { O.push({ x: 0, z: 32, r: 10, name: 'Outer earthwork' }); O.push({ x: 0, z: 92, r: 12, name: 'The Pass gate' }); }
    L.objectives = O;
    return L;
  }
  inWater(x, z) { return waterAt(x, z) > 0; }
  genMap() {
    const r = new RNG(this.seed ^ 0x5bd1e995); const f = this.bdef.features; const has = (k) => f.indexOf(k) >= 0;
    const keep = []; // {x,z,r} exclusion circles
    const clear = (x, z, rad) => { if (waterAt(x, z) !== 0) return false; for (let i = 0; i < keep.length; i++) if (len(x - keep[i].x, z - keep[i].z) < rad + keep[i].r) return false; return true; };
    const B = this.battle;
    if (B === 'field') { // shrine on the crest
      const sx = 0, sz = 6, syaw = PI; this.deco.push({ kind: 'shrine', x: sx, z: sz, yaw: syaw }); const rx = -cos(syaw), rz = sin(syaw);
      this.obstacles.push({ x: sx + rx * 1.6, z: sz + rz * 1.6, r: 0.35, kind: 2 }); this.obstacles.push({ x: sx - rx * 1.6, z: sz - rz * 1.6, r: 0.35, kind: 2 }); this.obstacles.push({ x: sx + sin(syaw) * 7, z: sz + cos(syaw) * 7, r: 3.2, kind: 3, yaw: syaw });
      keep.push({ x: sx, z: sz, r: 12 });
      for (let i = 0; i < 40; i++) { const a = r.range(0, TAU), d = r.range(28, 60); const x = sin(a) * d, z = 2 + cos(a) * d; if (Math.abs(z) > 30 && Math.abs(x) < 30) continue; if (clear(x, z, 3)) this.obstacles.push({ x, z, r: 0.45, kind: 0, variant: r.next() < 0.6 ? 1 : 0, scale: r.range(0.9, 1.5), rot: r.range(0, TAU) }); }
    }
    if (B === 'toba' || B === 'nagaoka') { const rv = this.layout.river; for (const b of rv.bridges) { const c = rv.c0 + rv.amp * sin(b.at * rv.freq + rv.ph); this.deco.push({ kind: b.ford ? 'ford' : 'bridge', axis: rv.axis, at: b.at, c, hw: b.hw, w: rv.w }); keep.push(rv.axis === 'x' ? { x: b.at, z: c, r: 16 } : { x: c, z: b.at, r: 16 }); } }
    if (B === 'toba') { // village on both banks around the ford road
      this.deco.push({ kind: 'road', x: 0, w: 7 }); this.roadX = 0;
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 13 + r.range(-2, 2), z = side * (26 + (i % 2) * 11) + r.range(-2, 2); if (Math.abs(x) < 6) continue; if (!clear(x, z, 5)) continue; this.boxes.push({ x, z, hw: r.range(2.6, 3.4), hd: r.range(2.2, 2.9), h: r.range(3, 3.6), kind: 'house' }); keep.push({ x, z, r: 6 }); }
    }
    if (B === 'aizu') { // Tsuruga castle: square walls on the stone base, a keep, castle-town blocks below
      const cx = 0, cz = 96, s = 18, wall = (x, z, hw, hd) => this.boxes.push({ x, z, hw, hd, h: 2.4, kind: 'wall' });
      wall(cx - s, cz, 0.7, s); wall(cx + s, cz, 0.7, s); wall(cx, cz + s, s, 0.7); wall(cx - s * 0.6, cz - s, s * 0.4, 0.7); wall(cx + s * 0.6, cz - s, s * 0.4, 0.7);
      this.boxes.push({ x: cx, z: cz + 4, hw: 5, hd: 5, h: 15, kind: 'keep' }); keep.push({ x: cx, z: cz, r: 40 });
      for (let bx = -4; bx <= 4; bx++) for (let bz = -2; bz <= 1; bz++) { if (bx === 0) continue; const x = bx * 24 + r.range(-2, 2), z = bz * 26 + 6 + r.range(-2, 2); if (r.next() < 0.18 || !clear(x, z, 6)) continue; const two = r.next() < 0.5; this.boxes.push({ x: x - (two ? 4 : 0), z, hw: two ? 3.2 : 6, hd: 3.6, h: r.range(3.2, 4), kind: 'house' }); if (two) this.boxes.push({ x: x + 4.5, z: z + r.range(-1, 1), hw: 3.2, hd: 3.4, h: r.range(3, 3.8), kind: 'house' }); keep.push({ x, z, r: 8 }); }
    }
    if (B === 'hakodate') { // Ningyuan: a square brick-walled citadel with gates north and south, inside a moat
      const cx = 0, cz = 74, H = 27;
      for (const side of [-1, 1]) { for (let x = -H; x <= H; x += 3) { if (Math.abs(x) < 5) continue; this.boxes.push({ x: cx + x, z: cz + side * H, hw: 1.5, hd: 1.5, h: 3.2, kind: 'rampart' }); }
        for (let z = -H + 3; z <= H - 3; z += 3) this.boxes.push({ x: cx + side * H, z: cz + z, hw: 1.5, hd: 1.5, h: 3.2, kind: 'rampart' }); }
      this.boxes.push({ x: cx, z: cz + 4, hw: 7, hd: 4.5, h: 5, kind: 'hall' }); keep.push({ x: cx, z: cz, r: 52 });
      this.deco.push({ kind: 'starfort', x: cx, z: cz });
    }
    if (B === 'bonari') { // two lines of breastworks across the pass
      const pal = (x0, x1, z) => { for (let x = x0; x < x1; x += 3) this.boxes.push({ x: x + 1.5, z, hw: 1.5, hd: 0.5, h: 1.5, kind: 'palisade' }); };
      pal(-24, -5, 32); pal(5, 24, 32); pal(-14, 14, 64); pal(-34, -20, 64); pal(20, 34, 64);
      keep.push({ x: 0, z: 32, r: 6 }); keep.push({ x: 0, z: 64, r: 6 });
      for (let i = 0; i < 230; i++) { const side = r.next() < 0.5 ? -1 : 1; const x = side * r.range(30, HALF - 10), z = r.range(-HALF + 10, HALF - 10); if (clear(x, z, 2.5)) this.obstacles.push({ x, z, r: 0.45, kind: 0, variant: r.next() < 0.35 ? 1 : 0, scale: r.range(0.9, 1.6), rot: r.range(0, TAU) }); }
    }
    if (has('shrine')) {
      const sx = r.range(-70, 70), sz = r.range(-35, 35), syaw = r.range(0, TAU);
      this.deco.push({ kind: 'shrine', x: sx, z: sz, yaw: syaw });
      const rx = -cos(syaw), rz = sin(syaw);
      this.obstacles.push({ x: sx + rx * 1.6, z: sz + rz * 1.6, r: 0.35, kind: 2 });
      this.obstacles.push({ x: sx - rx * 1.6, z: sz - rz * 1.6, r: 0.35, kind: 2 });
      this.obstacles.push({ x: sx + sin(syaw) * 7, z: sz + cos(syaw) * 7, r: 3.2, kind: 3, yaw: syaw });
      keep.push({ x: sx, z: sz, r: 12 });
    }
    if (B === 'bjgate') { // the Guangqu Gate suburb: a road out of the gate, low courtyard houses in loose blocks either side, open ground before the gate
      this.deco.push({ kind: 'road', x: 6, w: 8 }); this.roadX = 6; keep.push({ x: 6, z: 50, r: 26 });
      for (let bx = -5; bx <= 5; bx++) for (let bz = -4; bz <= 1; bz++) { const x = 6 + bx * 21 + r.range(-2, 2), z = bz * 24 + 8 + r.range(-3, 3); if (Math.abs(x - 6) < 11 || r.next() < 0.3 || !clear(x, z, 6)) continue;
        const two = r.next() < 0.45; this.boxes.push({ x: x - (two ? 3.6 : 0), z, hw: two ? 3 : 5, hd: 3.2, h: r.range(3, 3.6), kind: 'house' }); if (two) this.boxes.push({ x: x + 4, z: z + r.range(-1, 1), hw: 3, hd: 3, h: r.range(2.8, 3.4), kind: 'house' }); keep.push({ x, z, r: 8 }); }
    }
    if (B === 'sjvil') { // a north-China village: courtyard houses either side of one street, compound walls with gaps for the lanes, a well
      this.deco.push({ kind: 'road', x: 0, w: 5 }); this.roadX = 0;
      const H = [[-8, -18, 3, 3.2], [-8, -4, 3, 3], [-8, 12, 3.2, 3], [-8, 26, 3, 3], [8, -14, 3, 3.2], [8, 2, 3, 3], [8, 18, 3.2, 3], [8, 31, 3, 2.8], [-21, -10, 3, 3.5], [-21, 8, 3.2, 3], [-21, 24, 3, 3], [21, -6, 3, 3], [21, 12, 3.5, 3], [21, 28, 3, 3]];
      for (const [x, z, hw, hd] of H) this.boxes.push({ x, z, hw, hd, h: 3.4, kind: 'house' });
      const W = [[-14.5, 3, 0.3, 4], [14.5, -2, 0.3, 4], [-14.5, 19.5, 0.3, 3], [14.5, 23, 0.3, 3], [-9, 36, 4, 0.3], [9, 39, 4, 0.3], [-27, 14, 0.3, 7], [27, 4, 0.3, 7], [-21, -17, 3.5, 0.3], [21, -12, 3.5, 0.3], [3.2, 7, 0.6, 0.6]];
      for (const [x, z, hw, hd] of W) this.boxes.push({ x, z, hw, hd, h: hw < 1 && hd < 1 ? 0.9 : 2.2, kind: 'wall' });
      keep.push({ x: 0, z: 8, r: 38 }); keep.push({ x: 0, z: -50, r: 10 }); }
    if (B === 'zroad') { this.deco.push({ kind: 'road', x: 0, w: 6 }); this.roadX = 0;
      for (const [x, z, hw, hd] of [[-13, 22, 3.2, 2.6], [-14, 36, 2.8, 2.4], [-24, 30, 3, 2.6], [12.5, 26, 3, 2.5], [13.5, 41, 3.3, 2.7], [23, 33, 2.6, 2.4], [-12.5, 50, 2.6, 2.2]]) { this.boxes.push({ x, z, hw, hd, h: 3.3, kind: 'house' }); keep.push({ x, z, r: 6 }); }
      keep.push({ x: 0, z: 34, r: 16 }); }
    if (has('road')) { const rx = r.range(-30, 30); this.deco.push({ kind: 'road', x: rx, w: 7 }); this.roadX = rx; }
    if (has('temple')) {
      const cx = this.templeX !== undefined ? this.templeX : r.range(-40, 40), cz = 72; this.deco.push({ kind: 'temple', x: cx, z: cz });
      const wall = (x, z, hw, hd) => { this.boxes.push({ x, z, hw, hd, h: 2.6, kind: 'wall' }); };
      wall(cx - 22, cz, 0.6, 20); wall(cx + 22, cz, 0.6, 20); wall(cx, cz + 20, 22, 0.6);
      wall(cx - 13, cz - 20, 9, 0.6); wall(cx + 13, cz - 20, 9, 0.6);
      this.boxes.push({ x: cx, z: cz + 6, hw: 6, hd: 4, h: 4.2, kind: 'hall' });
      keep.push({ x: cx, z: cz, r: 34 });
    }
    if (has('houses')) {
      let made = 0, guard = 0;
      while (made < 11 && guard++ < 300) {
        const x = r.range(-110, 110), z = r.range(-88, 88); const hw = r.range(2.6, 3.6), hd = r.range(2.2, 3);
        if (!clear(x, z, 9)) continue; if (this.roadX !== undefined && Math.abs(x - this.roadX) < 7) continue;
        this.boxes.push({ x, z, hw, hd, h: r.range(3, 3.8), kind: 'house' }); keep.push({ x, z, r: 9 }); made++;
      }
    }
    if (has('walls')) {
      let made = 0, guard = 0;
      while (made < 9 && guard++ < 300) {
        const x = r.range(-120, 120), z = r.range(-85, 85); const horiz = r.next() < 0.5; const L = r.range(5, 9);
        if (!clear(x, z, 8)) continue;
        this.boxes.push({ x, z, hw: horiz ? L : 0.45, hd: horiz ? 0.45 : L, h: 1.6, kind: 'wall' }); keep.push({ x, z, r: 8 }); made++;
      }
    }
    if (has('fences')) {
      let made = 0, guard = 0;
      while (made < 8 && guard++ < 300) {
        const x = r.range(-120, 120), z = r.range(-85, 85); const dir = r.int(2) * HPI; const L = r.range(10, 24);
        if (!clear(x, z, 6)) continue;
        const dx = sin(dir), dz = cos(dir); const n = Math.floor(L / 1.6);
        for (let i = 0; i <= n; i++) this.obstacles.push({ x: x + dx * i * 1.6, z: z + dz * i * 1.6, r: 0.22, kind: 5 });
        this.deco.push({ kind: 'fence', x, z, yaw: dir, len: n * 1.6 }); keep.push({ x: x + dx * L / 2, z: z + dz * L / 2, r: 4 }); made++;
      }
    }
    if (has('paddies')) {
      let made = 0, guard = 0;
      while (made < 14 && guard++ < 400) {
        const x = r.range(-80, 150), z = r.range(-90, 90); const hw = r.range(12, 20), hd = r.range(8, 13);
        if (!clear(x, z, Math.max(hw, hd) + 3)) continue;
        this.zones.push({ x, z, hw, hd, speed: 0.45 }); keep.push({ x, z, r: Math.max(hw, hd) + 3 }); made++;
      }
    }
    // cover: wooden mantlets (pavises) around objectives and across the middle of the field
    const mant = (x, z) => { if (waterAt(x, z) !== 0) return; for (const q of this.boxes) if (Math.abs(q.x - x) < q.hw + 2 && Math.abs(q.z - z) < q.hd + 1.5) return; this.boxes.push({ x, z, hw: 1.15, hd: 0.2, h: 1.35, kind: 'mantlet' }); keep.push({ x, z, r: 2 }); };
    if (this.scen) { for (const c of this.scen.cover) mant(c[0], c[1]); }
    else if (B !== 'abudali' && B !== 'zcamp' && B !== 'siegecity' && B !== 'sjvil') { for (const o of this.layout.objectives || []) for (const sd of [-1, 1]) for (const dx of [-5, 0, 5]) mant(o.x + dx + r.range(-1, 1), o.z + sd * (o.r + 2)); for (let i = 0; i < 14; i++) { const x = r.range(-90, 90), z = r.range(-45, 45); if (clear(x, z, 3)) { mant(x, z); mant(x + 2.6, z + r.range(-0.4, 0.4)); } } }
    if (this.scen) for (const L of this.scen.ladders) this.ladders.push({ x: L[0], z: L[1], hd: L[2], up: false, prog: 0, hp: 0 });
    const treeN = B === 'bonari' ? 30 : B === 'abudali' ? 190 : B === 'zcamp' ? 120 : B === 'nagaoka' ? 70 : this.bdef.biome === 'winter' ? 110 : 150;
    for (let i = 0; i < treeN; i++) {
      const x = r.range(-HALF + 8, HALF - 8), z = r.range(-98, 98);
      if (!clear(x, z, 3)) continue; if (this.roadX !== undefined && Math.abs(x - this.roadX) < 6) continue; if (B === 'bonari' && Math.abs(x) < 26) continue; if (B === 'abudali' && Math.abs(x) < 19) continue; if (B === 'siegecity' && z > -14) continue; if (B === 'zcamp' && len(x, z) < 38) continue; if (B !== 'abudali' && Math.abs(z) > 112 && Math.abs(x) < 70) continue;
      this.obstacles.push({ x, z, r: 0.45, kind: 0, variant: r.next() < 0.45 ? 1 : 0, scale: r.range(0.8, 1.5), rot: r.range(0, TAU) });
    }
    for (let i = 0; i < 38; i++) {
      const x = r.range(-HALF + 8, HALF - 8), z = r.range(-105, 105);
      if (!clear(x, z, 4)) continue; if (B === 'siegecity' && z > -14) continue;
      this.obstacles.push({ x, z, r: r.range(0.7, 2.3), kind: 1, rot: r.range(0, TAU) });
    }
  }
  cellOf(x, z) {
    const cs = this.cellSize, W = this.gridW;
    let cx = Math.floor((x + HALF + 5) / cs), cz = Math.floor((z + HALF + 5) / cs);
    cx = cx < 0 ? 0 : cx >= W ? W - 1 : cx; cz = cz < 0 ? 0 : cz >= W ? W - 1 : cz;
    return cz * W + cx;
  }
  buildGrid() {
    this.head.fill(-1);
    const us = this.units;
    // units added after setup (reinforcements, spawned squads) need room in the cell chains, or the chain is cut and
    // every man filed after them in that cell becomes invisible to blows, pushes and targeting
    if (this.next.length < us.length) this.next = new Int32Array(us.length + 64);
    for (let i = 0; i < us.length; i++) { const u = us[i]; if (u.dead) continue; const c = this.cellOf(u.x, u.z); this.next[i] = this.head[c]; this.head[c] = i; }
  }
  gatherNear(x, z, rad) {
    const cs = this.cellSize, W = this.gridW;
    let cx0 = Math.floor((x - rad + HALF + 5) / cs), cx1 = Math.floor((x + rad + HALF + 5) / cs);
    let cz0 = Math.floor((z - rad + HALF + 5) / cs), cz1 = Math.floor((z + rad + HALF + 5) / cs);
    cx0 = cx0 < 0 ? 0 : cx0; cz0 = cz0 < 0 ? 0 : cz0; cx1 = cx1 >= W ? W - 1 : cx1; cz1 = cz1 >= W ? W - 1 : cz1;
    let n = 0; const out = this.nearBuf;
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      let id = this.head[cz * W + cx];
      while (id >= 0) { if (n < out.length) out[n++] = id; id = this.next[id]; }
    }
    return n;
  }
  zoneSpeed(x, z, dx, dz) { // dx,dz: the way he is going; slopes slow you climbing them, not running down them
    let s = 1; const zs = this.zones; for (let i = 0; i < zs.length; i++) { const q = zs[i]; if (x > q.x - q.hw && x < q.x + q.hw && z > q.z - q.hd && z < q.z + q.hd) { s = q.speed; break; } }
    const w = waterAt(x, z); if (w === 1) s *= 0.3; else if (w === 2) s *= 0.6;
    const gx = terrainH(x + 0.8, z) - terrainH(x - 0.8, z), gz = terrainH(x, z + 0.8) - terrainH(x, z - 0.8); const g = Math.sqrt(gx * gx + gz * gz) / 1.6;
    if (dx === undefined) { if (g > 0.22) s *= 1 - clamp((g - 0.22) * 0.9, 0, 0.62); }
    else { const up = (gx * dx + gz * dz) / (1.6 * (len(dx, dz) || 1)); if (up > 0.22) s *= 1 - clamp((up - 0.22) * 0.9, 0, 0.62); else if (up < -0.6) s *= 0.85; }
    return s;
  }
  // ---------- setup ----------
  randomArmy(t, budget) {
    const ros = ROSTER[t]; const army = []; let b = budget || BUDGET;
    const pick = (k) => { if (DEFS[k].cost <= b) { army.push(k); b -= DEFS[k].cost; } };
    if (t === 1) { pick('archer'); pick('samurai'); pick('archer'); } else { pick(ros[2]); pick('samurai'); pick(ros[2]); }
    let guard = 0;
    while (b >= 150 && guard++ < 30) { let k = ros[this.rng.int(ros.length)]; if (t === 1 && k === 'rifle_sho' && this.rng.next() < 0.85) k = 'archer'; pick(k); }
    return army;
  }
  setupArmies(players) {
    const teams = [[], []];
    players.forEach((p, i) => {
      const army = (p.army || []).filter(k => !!DEFS[k]);
      const pl = { idx: i, name: p.name, team: p.team ? 1 : 0, heroId: -1, horseId: -1, commanderId: -1, auto: false, squads: [], kills: 0, army, mounted: !!p.mounted, ready: false, rallyT: 0, bombs: BOMBS, fury: 0 };
      this.players.push(pl); teams[pl.team].push({ player: pl, army });
    });
    const aiPl = (t, name, army) => { const pl = { idx: this.players.length, name, team: t, heroId: -1, horseId: -1, commanderId: -1, auto: true, ai: true, squads: [], kills: 0, army, mounted: false, ready: true, rallyT: 0, bombs: BOMBS, fury: 0, directive: { kind: DIR_ATTACK, x: 0, z: 0, by: -1 } }; this.players.push(pl); teams[t].push({ player: pl, army }); };
    if (this.heroMode) { // AI generals fight the battle; humans are lone champions
      for (const e of teams[0].concat(teams[1])) { e.army = []; e.player.army = []; }
      const S2 = this.scen; this.placements = [];
      for (const c of S2.def) { aiPl(0, c[0], c[1].slice()); this.placements.push([c[2], c[3], PI]); }
      for (const c of S2.att) { aiPl(1, c[0], c[1].slice()); this.placements.push([c[2], c[3], 0]); }
      for (let t = 0; t < 2; t++) if (!this.players.some(p => !p.ai && p.team === t)) { this.players.push({ idx: this.players.length, name: t === 0 ? 'Qin Liangyu' : 'Ebilun', team: t, heroId: -1, horseId: -1, commanderId: -1, auto: true, ai: true, aiChamp: true, squads: [], kills: 0, army: [], mounted: false, ready: true, rallyT: 0, bombs: BOMBS, fury: 0, directive: { kind: DIR_ATTACK, x: 0, z: 0, by: -1 } }); teams[t].push({ player: this.players[this.players.length - 1], army: [] }); }
      let k = 0;
      for (const p of this.players) { if (!p.ai || p.aiChamp) { const sp = S2.heroSpawn[p.team]; this.placeArmy({ player: p, army: [] }, p.team, sp[0] + (k++ % 3) * 3, sp[1], p.team === 0 ? PI : 0); const h = this.units[p.heroId]; p.hclass = clamp(p.aiChamp ? (p.idx * 3 + p.team) % 4 : ((this.cfg.players[p.idx] && this.cfg.players[p.idx].hclass) | 0), 0, 3); this.setClass(h, p.hclass); h.champ = true; p.respawnT = 0; if (p.aiChamp) h.ctrl = p.idx; } }
      let pi = 0; for (const p of this.players) if (p.ai && !p.aiChamp) { const pl = this.placements[pi++]; this.placeArmy({ player: p, army: p.army }, p.team, pl[0], pl[1], pl[2]); }
      return;
    }
    if (this.mission) { this.setupMission(teams, aiPl); return; }
    if (this.mode === 'soldier') { // every human is one man in the ranks; AI commanders fight the battle around them
      const sc = this.cfg.soldier || {}; for (const e of teams[0].concat(teams[1])) { e.army = []; e.player.army = []; }
      for (let t = 0; t < 2; t++) { const n = clamp((sc.cmds || [3, 3])[t] | 0, 1, 5); for (let k = 0; k < n; k++) { const L = sc.armies && sc.armies[t] && sc.armies[t][k]; aiPl(t, (sc.names && sc.names[t] && sc.names[t][k]) || AI_NAMES[t][k % 5], L ? L.filter(x => DEFS[x]) : this.randomArmy(t, sc.size || 1500)); } }
      for (const p of this.players) if (!p.ai) { const role = roleType((this.cfg.players[p.idx] || {}).role, p.team); const host = this.players.find(q => q.ai && q.team === p.team); if (host.army.indexOf(role) < 0) host.army.unshift(role); }
      for (let t = 0; t < 2; t++) { const list = this.players.filter(q => q.ai && q.team === t), n = list.length; list.forEach((q, i) => this.placeArmy({ player: q, army: q.army }, t, clamp((i - (n - 1) / 2) * 62, -HALF + 40, HALF - 40), t === 0 ? -95 : 95, t === 0 ? 0 : PI)); }
      for (const p of this.players) if (!p.ai) {
        const c = this.cfg.players[p.idx] || {}; const role = roleType(c.role, p.team);
        const sq = this.squads.find(q => q.team === p.team && q.type === role && (q.humans || 0) < 6) || this.squads.find(q => q.team === p.team && q.type === role) || this.squads.find(q => q.team === p.team && !q.def.mounted && q.def.ai !== 'cannon');
        sq.humans = (sq.humans || 0) + 1; p.soldierSq = sq.id; p.auto = false; p.ready = true; p.heroId = -1; p.commanderId = -1; this.possess(p, sq);
        const cmd = clamp(c.command | 0, 0, 12); if (cmd) { // an officer: these squads now answer to the player
          const mine = [sq].concat(this.squads.filter(q => q !== sq && q.team === p.team && q.alive && !q.inactive && q.owner >= 0 && this.players[q.owner].ai).sort((a, b) => len(a.cx - sq.cx, a.cz - sq.cz) - len(b.cx - sq.cx, b.cz - sq.cz))).slice(0, cmd);
          for (const q of mine) { if (q.owner >= 0) { const o = this.players[q.owner]; o.squads = o.squads.filter(id => id !== q.id); } q.owner = p.idx; p.squads.push(q.id); q.order = ORD_HOLD; }
          p.commanderId = p.heroId; }
      }
      return;
    }
    if (this.mode === 'story') {
      const ch = STORY[clamp(this.cfg.chapter | 0, 0, STORY.length - 1)]; const side = this.players[0] ? this.players[0].team : 0; const lists = [ch.ming, ch.jin];
      if (this.players[0]) { const c0 = this.cfg.players[0] || {}; const ros = ROSTER[side]; const vets = (c0.veterans || []).filter(v => v && DEFS[v.type] && ros.indexOf(v.type) >= 0 && (v.n | 0) > 0).slice(0, 10); const rec = (c0.recruits || []).filter(k => DEFS[k] && ros.indexOf(k) >= 0).slice(0, 10 - vets.length);
        this.players[0].army = vets.length || rec.length ? vets.map(v => v.type).concat(rec) : lists[side][0][1].slice(); this.vets = vets; teams[side][0].army = this.players[0].army; this.players[0].name = lists[side][0][0]; }
      for (let t = 0; t < 2; t++) lists[t].forEach((c, i) => { if (t === side && i === 0) return; aiPl(t, c[0], c[1].slice()); });
    }
    if (this.mode === 'officers') { // every human leads a single squad; AI generals bring the rest of the host
      for (let t = 0; t < 2; t++) for (const e of teams[t]) { e.army = e.army.slice(0, 1); e.player.army = e.army; if (!e.army.length) e.army.push(t === 0 ? 'samurai' : 'samurai'); }
      for (let t = 0; t < 2; t++) { const want = teams[t].length ? 2 : 3; for (let k = 0; k < want; k++) aiPl(t, AI_NAMES[t][k % 5], this.randomArmy(t, 1500)); }
    }
    if (this.mode === 'grand') {
      // a war council: AI commanders with their own armies and heroes fill both sides
      const want = [Math.max(3, teams[0].length), Math.max(3, teams[1].length)];
      for (let t = 0; t < 2; t++) { let k = 0; while (teams[t].length < want[t]) {
        const pl = { idx: this.players.length, name: AI_NAMES[t][k++ % 5], team: t, heroId: -1, horseId: -1, commanderId: -1, auto: true, ai: true, squads: [], kills: 0, army: this.randomArmy(t, 1700), mounted: false, ready: true, rallyT: 0, bombs: BOMBS, fury: 0, directive: { kind: DIR_ATTACK, x: 0, z: 0, by: -1 } };
        this.players.push(pl); teams[t].push({ player: pl, army: pl.army }); } }
    }
    for (let t = 0; t < 2; t++) if (!teams[t].length) teams[t].push({ ai: true, army: this.randomArmy(t) });
    const dz = this.chaos ? 42 : 100, sp = this.mode === 'standard' || this.chaos ? 75 : 62;
    for (let t = 0; t < 2; t++) {
      const list = teams[t], n = list.length;
      list.forEach((a, i) => this.placeArmy(a, t, clamp((i - (n - 1) / 2) * sp, -HALF + 40, HALF - 40), t === 0 ? -dz : dz, t === 0 ? 0 : PI));
    }
    this.rp = [0, 0]; this.waves = [];
    if (this.mode === 'grand') for (let t = 0; t < 2; t++) { // a fresh corps waits beyond the field edge
      const pl = { idx: this.players.length, name: AI_NAMES[t][4 - t] + ' (reserve)', team: t, heroId: -1, horseId: -1, commanderId: -1, auto: true, ai: true, squads: [], kills: 0, army: this.randomArmy(t, 1500), mounted: false, ready: true, rallyT: 0, bombs: BOMBS, fury: 0, reserveCorps: true, inactive: true, directive: { kind: DIR_ATTACK, x: 0, z: 0, by: -1 } };
      this.players.push(pl); this.placeArmy({ player: pl, army: pl.army }, t, 0, t === 0 ? -(HALF - 12) : HALF - 12, t === 0 ? 0 : PI);
      for (const id of pl.squads) { const q = this.squads[id]; q.inactive = true; for (const uid of q.unitIds) this.units[uid].inactive = true; }
      for (const uid of [pl.heroId, pl.horseId]) if (uid >= 0) this.units[uid].inactive = true;
      this.waves.push({ team: t, p: pl.idx, released: false }); }
  }
  // take control of a man in the ranks (a new body each life, like a reinforcement wave)
  possess(p, sq, role) {
    const ok = (u) => !u.dead && u.ctrl < 0 && !u.inactive && !u.wounded && !u.camp && u.type !== 'hero' && u.type !== 'horse' && (!role || u.role === role);
    const pick = (q) => { if (!q || !q.alive || q.routing) return null; for (let i = 1; i < q.unitIds.length; i++) { const u = this.units[q.unitIds[i]]; if (ok(u)) return u; } const u0 = this.units[q.unitIds[0]]; return ok(u0) ? u0 : null; };
    let u = pick(sq);
    if (!u && sq) for (const q of this.squads) if (q.team === p.team && q.type === sq.type) { u = pick(q); if (u) { p.soldierSq = q.id; break; } }
    if (!u && role) return this.possess(p, sq);
    if (!u) for (const q of this.squads) if (q.team === p.team && !q.def.mounted && q.def.ai !== 'cannon') { u = pick(q); if (u) { p.soldierSq = q.id; break; } }
    if (!u) return false;
    u.ctrl = p.idx; u.target = -1; u.st = ST_IDLE; u.stT = 0; p.heroId = u.id; if (p.squads.length) p.commanderId = u.id; p.respawnAt = 0;
    const k = (this.cfg.players[p.idx] || {}).kit;
    if (k) { const d = u.def, n = Object.assign({}, d); n.hp = d.hp * (k.hp || 1); n.dmg = d.dmg.map(x => x * (k.melee || 1)); if (d.rifle) n.rifle = Object.assign({}, d.rifle, { reload: d.rifle.reload * (k.reload || 1), spread: d.rifle.spread * (k.aim || 1), ads: (d.rifle.ads || d.rifle.spread * 0.3) * (k.aim || 1) }); if (d.bow) n.bow = Object.assign({}, d.bow, { reload: d.bow.reload * (k.reload || 1) }); u.def = n; u.hp = Math.min(n.hp, u.hp * (k.hp || 1)); }
    if (k && k.arms && this.mode !== 'assault' && !(this.mission && this.mission.soldier)) armUnit(u, k.arms, (k.melee || 1) * (this.tuned ? 1.5 : 1)); // in assault and the story you take up the man's own kit; the menu's blade/shield choice is for your own character
    this.events.push({ t: 'possess', p: p.idx, id: u.id, sq: u.squad });
    return true;
  }
  // realism: muskets kill, take an age to load and scatter at range; blades and arrows are lethal; men are heavier
  tuneReal() {
    const cache = new Map();
    const tune = (d) => { if (cache.has(d)) return cache.get(d); const n = Object.assign({}, d);
      if (d.rifle) n.rifle = Object.assign({}, d.rifle, { dmg: d.rifle.dmg * 1.9, reload: d.rifle.reload * 2.3, magReload: d.rifle.magReload ? d.rifle.magReload * 1.8 : d.rifle.magReload, spread: d.rifle.spread * 1.3 });
      if (d.bow) n.bow = Object.assign({}, d.bow, { dmg: d.bow.dmg * 1.7, reload: d.bow.reload * 1.3 });
      if (d.dmg) n.dmg = d.dmg.map(x => x * 1.5); n.bombs = 0; n.windup = d.windup * 1.12; n.recover = d.recover * 1.1; n.speed = d.speed * (d.mounted ? 0.95 : 0.88);
      cache.set(d, n); return n; };
    for (const u of this.units) { if (u.type !== 'horse' && u.def.ai !== 'cannon') u.def = tune(u.def); u.bombs = 0; }
    for (const p of this.players) p.bombs = 0;
    this.tuned = true;
  }
  soldierThink() { // fallen soldiers rejoin with the next reinforcement wave (every 20 s)
    if (this.mode === 'assault') { for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId]; if ((!h || h.dead) && !p.downAt) { p.downAt = this.tick; p.lives = (p.lives || 0) + 1; this.events.push({ t: 'fallen', p: p.idx, at: this.tick }); } } return; }
    for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId];
      if (h && !h.dead) continue;
      if (!p.respawnAt) { const W = 30 * 20; p.respawnAt = Math.ceil((this.tick + 30 * 8) / W) * W; p.lives = (p.lives || 0) + 1; this.events.push({ t: 'fallen', p: p.idx, at: p.respawnAt }); }
      else if (this.tick >= p.respawnAt) { if (!this.possess(p, this.squads[p.soldierSq])) p.respawnAt = this.tick + 30 * 10; } }
  }
  // ---- assault deployment: pick a soldier type and a place to enter the fight; spawns move up with the front
  deployTypes(team, pidx) { const seen = {}, out = []; const own = this.mode === 'campaign' ? this.coopSquads(team, pidx) : null; for (const q of this.squads) { if (q.team !== team || !q.alive || q.inactive || q.def.ai === 'cannon' || q.type === 'horse') continue; if (own && !own.includes(q.id)) continue;
    if (q.def.yuanyang) { for (const id of q.unitIds) { const u = this.units[id]; if (u.dead || u.ctrl >= 0 || u.inactive || !YY_PLAY[u.role]) continue; const key = q.type + ':' + u.role; if (seen[key] === undefined) { seen[key] = out.length; out.push({ type: q.type, role: u.role, key, n: 0, def: YYDEF[u.role], name: YY_PLAY[u.role][0], jp: YY_PLAY[u.role][1] }); } out[seen[key]].n++; } continue; } // each man of a mandarin duck team is his own trade
    let n = 0; for (const id of q.unitIds) { const u = this.units[id]; if (!u.dead && u.ctrl < 0 && !u.inactive) n++; } if (!n) continue; if (seen[q.type] === undefined) { seen[q.type] = out.length; out.push({ type: q.type, key: q.type, n: 0, def: q.def, name: q.def.name, jp: q.def.jp }); } out[seen[q.type]].n += n; } return out; }
  coopSquads(team, pidx) { // co-op: you rejoin among your own companies, or your allies' once yours are gone
    const ok = (q) => q.team === team && q.alive && !q.inactive && !q.routing && q.def.ai !== 'cannon' && q.unitIds.some(id => { const u = this.units[id]; return !u.dead && u.ctrl < 0 && !u.inactive && u.type !== 'horse'; });
    const mine = this.squads.filter(q => q.owner === pidx && ok(q)).map(q => q.id); return mine.length ? mine : this.squads.filter(ok).map(q => q.id); }
  deploySpawns(team, pidx) {
    if (this.mode === 'campaign') return this.coopSquads(team, pidx).map(id => { const q = this.squads[id]; return { kind: 'sq', sq: q.id, name: q.def.name, type: q.type, x: q.cx, z: q.cz }; });
    const M = this.mission, A = M.attacker, out = []; if (!M || !M.sectors) return out; const zs = (k) => this.missionZone(k); const cen = (keys) => { let x = 0, z = 0; for (const k of keys) { const o = zs(k); x += o.x; z += o.z; } return [x / keys.length, z / keys.length]; };
    const foeIn = (o) => team === 0 ? o.n1 : o.n0;
    if (team === A) {
      let hx = M.attAt[0], hz = M.attAt[1];
      if (this.sector > 0) { const c = cen(M.sectors[this.sector - 1]); const back = Math.sign(M.attAt[1] - c[1]) || -1; hx = c[0]; hz = c[1] + back * 22; }
      out.push({ kind: 'hq', name: this.sector > 0 ? 'Forward camp' : 'Siege camp', x: hx, z: hz });
      for (const k of M.sectors[this.sector] || []) { const o = zs(k); if (o.owner === A) out.push({ kind: 'zone', name: o.name, x: o.x, z: o.z, blocked: foeIn(o) > 0 }); }
    } else {
      const last = M.sectors[M.sectors.length - 1], c = cen(last), back = -(Math.sign(M.attAt[1] - c[1]) || -1);
      out.push({ kind: 'hq', name: 'Citadel', x: c[0], z: clamp(c[1] + back * 20, -HALF + 8, HALF - 8) });
      for (let s = this.sector; s < Math.min(M.sectors.length, this.sector + 2); s++) for (const k of M.sectors[s]) { const o = zs(k); if (o.owner === team) out.push({ kind: 'zone', name: o.name, x: o.x, z: o.z, blocked: foeIn(o) > 0 }); }
    }
    for (const q of this.squads) { if (q.team !== team || !q.alive || q.inactive || q.def.ai === 'cannon' || q.aliveCount < 2) continue; let free = false; for (const id of q.unitIds) { const u = this.units[id]; if (!u.dead && u.ctrl < 0 && !u.inactive) { free = true; break; } } if (free) out.push({ kind: 'sq', sq: q.id, name: q.def.name, type: q.type, x: q.cx, z: q.cz }); }
    return out;
  }
  freeSpot(x, z) { // nearest open ground: not inside a wall, house, palisade or water
    const bad = (px, pz) => { if (Math.abs(px) > HALF - 3 || Math.abs(pz) > HALF - 3) return true; if (this.inWater(px, pz)) return true; if (this.navBlk && this.navBlk[this.navCell(px, pz)]) return true;
      for (const b of this.boxes) { const c = Math.cos(b.rot || 0), sn = Math.sin(b.rot || 0), dx = px - b.x, dz = pz - b.z; const lx = dx * c + dz * sn, lz = -dx * sn + dz * c; if (Math.abs(lx) < b.hw + 0.9 && Math.abs(lz) < b.hd + 0.9) return true; } for (const o of this.obstacles || []) if (len(px - o.x, pz - o.z) < (o.r || 0.5) * (o.scale || 1) + 0.9) return true; return false; };
    if (!bad(x, z)) return [x, z];
    for (let r = 1.5; r <= 36; r += 1.5) for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2 + r * 0.37; const px = x + sin(a) * r, pz = z + cos(a) * r; if (!bad(px, pz)) return [px, pz]; }
    return [x, z];
  }
  deploy(p, si, ti) {
    const sp = this.deploySpawns(p.team, p.idx)[si]; if (!sp || sp.blocked) return false;
    const old = this.units[p.heroId]; const alive = old && !old.dead && old.ctrl === p.idx;
    let sq = null;
    if (sp.kind === 'sq') sq = this.squads[sp.sq];
    else { const T = this.deployTypes(p.team, p.idx)[ti]; if (!T) return false; let bd = 1e18; for (const q of this.squads) { if (q.team !== p.team || q.type !== T.type || !q.alive || q.inactive) continue; if (T.role && !q.unitIds.some(id => { const v = this.units[id]; return !v.dead && v.ctrl < 0 && v.role === T.role; })) continue; const d = len(q.cx - sp.x, q.cz - sp.z); if (d < bd) { bd = d; sq = q; } } }
    if (!sq) return false;
    if (alive) { old.ctrl = -1; old.target = -1; } // hand your old body back to its company
    const T2 = this.deployTypes(p.team, p.idx)[ti]; const role = T2 && T2.type === sq.type ? T2.role : undefined;
    p.heroId = -1; if (!this.possess(p, sq, role)) { if (alive) { old.ctrl = p.idx; p.heroId = old.id; } return false; }
    const u = this.units[p.heroId]; u.hp = u.def.hp; u.fat = 0; u.iframe = 1.2; p.soldierSq = u.squad; p.downAt = 0;
    if (sp.kind !== 'sq') { const k = p.idx % 5; const [x, z] = this.freeSpot(clamp(sp.x + (k - 2) * 2.2, -HALF + 3, HALF - 3), clamp(sp.z + ((k * 7) % 3 - 1) * 2.2, -HALF + 3, HALF - 3));
      u.x = u.px = x; u.z = u.pz = z; u.y = u.py = terrainH(x, z); u.vx = u.vz = u.vy = 0; u.mx = u.mz = 0; u.airborne = false; u.st = ST_IDLE; u.stT = 0; }
    this.events.push({ t: 'deploy', p: p.idx, id: u.id, kind: sp.kind, name: sp.name });
    return true;
  }
  placeArmy(a, t, cx, cz, facing) {
    const owner = a.player ? a.player.idx : -1;
    const rows = [[], [], []], cav = [];
    a.army.forEach(k => { const d = DEFS[k]; if (!d) return; if (d.ai === 'ranged') rows[0].push(k); else if (d.ai === 'cannon') rows[2].push(k); else if (d.mounted) cav.push(k); else rows[1].push(k); });
    if (!rows[0].length && rows[1].length > 1) rows[0].push(rows[1].shift());
    const fx = sin(facing), fz = cos(facing), rx = -cos(facing), rz = sin(facing);
    const rowDepth = [0, -14, -27]; const rowWidth = [0, 0, 0]; const made = [];
    rows.forEach((row, ri) => {
      const widths = row.map(k => squadWidth(DEFS[k]));
      const total = widths.reduce((s, w) => s + w + 6, -6); rowWidth[ri] = total;
      let lat = -total / 2;
      row.forEach((k, i) => {
        const l = lat + widths[i] / 2;
        made.push(this.createSquad(k, t, owner, cx + rx * l + fx * rowDepth[ri], cz + rz * l + fz * rowDepth[ri], facing));
        lat += widths[i] + 6;
      });
    });
    const flank = Math.max(rowWidth[0], rowWidth[1]) / 2 + 14;
    cav.forEach((k, i) => {
      const side = (i % 2 === 0) ? 1 : -1; const l = side * (flank + Math.floor(i / 2) * 18);
      made.push(this.createSquad(k, t, owner, cx + rx * l + fx * rowDepth[1], cz + rz * l + fz * rowDepth[1], facing));
    });
    if (a.player) {
      const hx = cx + fx * 9, hz = cz + fz * 9;
      const hero = this.addUnit('hero', t, owner, -1, hx, hz, facing); hero.def = defFor('hero', t); hero.ctrl = owner; a.player.heroId = hero.id; a.player.commanderId = hero.id;
      { const c = this.cfg.players && this.cfg.players[owner]; if (c && c.arms && !a.player.ai) { const keepRev = hero.def.revolver; armUnit(hero, c.arms, 1.15); if (c.arms.ranged !== 'sanyan' && c.arms.ranged !== 'none' && keepRev && hero.def.weapons.indexOf('revolver') < 0) { hero.def.weapons.push('revolver'); hero.def.revolver = keepRev; } } }
      const horse = this.addUnit('horse', t, owner, -1, hx + rx * 2.2, hz + rz * 2.2, facing); a.player.horseId = horse.id;
      if (a.player.mounted) { hero.mount = horse.id; horse.rider = hero.id; hero.mounted = true; hero.x = horse.x; hero.z = horse.z; }
    } else {
      this.generals.push({ team: t, squadIds: made.map(s => s.id) });
    }
  }
  createSquad(k, team, owner, x, z, facing) {
    const d = defFor(k, team);
    const sq = { id: this.squads.length, type: k, def: d, team, owner, unitIds: [], order: ORD_HOLD, tx: x, tz: z, facing, formation: d.skirmish ? FORM_LOOSE : FORM_LINE, cols: 0, abT: 0, abOn: 0, ability: abilityOf(d), fire: true, cx: x, cz: z, alive: true, count: d.count, aliveCount: d.count, morale: d.morale || 100, moraleMax: d.morale || 100, routing: false, routT: 0 };
    this.squads.push(sq);
    const fx = sin(facing), fz = cos(facing), rx = -cos(facing), rz = sin(facing), s = spacingOf(d);
    for (let i = 0; i < d.count; i++) {
      const [lat, dep] = slotOffset(sq.formation, i, d.count, s);
      const ux = x + rx * lat + fx * dep, uz = z + rz * lat + fz * dep;
      const u = this.addUnit(k, team, owner, sq.id, ux, uz, facing); u.def = d; if (d.yuanyang) { u.role = YY_ROLE[i % 12]; u.def = YYDEF[u.role]; u.hp = u.def.hp; u.weapon = u.def.weapons[0]; } u.slotX = ux; u.slotZ = uz; sq.unitIds.push(u.id);
    }
    if (owner >= 0) this.players[owner].squads.push(sq.id);
    return sq;
  }
  addUnit(type, team, owner, squad, x, z, yaw) {
    const def = DEFS[type];
    const g = def.rifle || def.bow; const mag = g ? (g.mag || 1) : 0;
    const u = {
      id: this.units.length, type, def, team, owner, squad, x, z, y: terrainH(x, z), vx: 0, vz: 0, vy: 0, mx: 0, mz: 0,
      yaw, pitch: 0, hyaw: yaw, hp: def.hp, dead: false,
      st: ST_IDLE, stT: 0, atkDir: 0, blocking: false, blockDir: 0, blockT: 0, relQ: false, swingHit: false, windupId: 0, stunDur: 0,
      flinchT: 0, downT: 0, counterT: 0, kickHit: false, pos: 0, posT: 0, entT: 0, heavy: false, openT: 0, duelWith: -1, frenzyT: 0, throwT: 0,
      bombs: 0, shots: def.cannon ? 22 : def.gun ? 14 : def.bow ? 26 : def.rifle ? (def.rifle.mag > 1 ? 30 : 28) : 0, fat: 0, weapon: def.weapons[0] || '', nextWeapon: '', swapQ: false, ammo: mag, ammoR: def.revolver ? def.revolver.mag : 0, loaded: mag > 0 || def.ai === 'cannon', reloadT: 1, reloadFill: true, aiming: false, aimTarget: -1,
      burst: 0, burstT: 0, fireQ: 0, fireAt: 0,
      target: -1, retT: (this.units.length % 12), lastAttacker: -1, reactKey: -1, blockPend: -1, blockPendDir: 0, blockHold: 0,
      mounted: !!def.mounted, mount: -1, rider: -1, hspeed: 0,
      ctrl: -1, ctrlActive: false, cmdMode: false, atkHeld: false, blockHeld: false,
      walk: 0, speedNow: 0, slotX: x, slotZ: z, airborne: false, mass: def.mass || 1,
      px: x, py: 0, pz: z, pyaw: yaw, phyaw: yaw, deathTick: -1, hitT: 0,
    };
    u.py = u.y;
    if (type !== 'horse') this.total[team]++;
    this.units.push(u);
    return u;
  }
  // ---------- main step ----------
  step(inputs) {
    this.tick++; this.events.length = 0; this.flowBudget = 6;
    const units = this.units;
    for (let i = 0; i < units.length; i++) { const u = units[i]; u.px = u.x; u.py = u.y; u.pz = u.z; u.pyaw = u.yaw; u.phyaw = u.hyaw; }
    this.teamAlive[0].length = 0; this.teamAlive[1].length = 0;
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (!u.dead && u.type !== 'horse') this.teamAlive[u.team].push(u); }
    this.buildGrid();
    for (let i = 0; i < this.players.length; i++) this.applyInput(this.players[i], inputs ? inputs[i] : 0);
    if (this.orderQ.length) { const due = []; for (let i = this.orderQ.length - 1; i >= 0; i--) if (this.orderQ[i].at <= this.tick) { due.push(this.orderQ[i]); this.orderQ.splice(i, 1); } for (let i = due.length - 1; i >= 0; i--) { this.applyCommand(this.players[due[i].p], due[i].c); const sq = this.squads[due[i].c[0] | 0]; if (sq) this.events.push({ t: 'orderarrive', sq: sq.id, p: due[i].p }); } }
    if (this.phase === 0) {
      let allReady = true;
      for (let i = 0; i < this.players.length; i++) if (!this.players[i].ready) allReady = false;
      if (allReady || this.tick >= DEPLOY_TICKS) { this.phase = 1; this.battleTick = this.tick; this.events.push({ t: 'battle' }); }
    }
    for (let i = 0; i < this.squads.length; i++) { const sq = this.squads[i]; if (sq.alive && !sq.inactive && (this.tick + sq.id) % 15 === 0) this.squadThink(sq); }
    if (this.phase === 1 && this.tick % 90 === 0) {
      for (let i = 0; i < this.generals.length; i++) this.generalThink(this.generals[i].team, this.generals[i].squadIds);
      for (let i = 0; i < this.players.length; i++) if (this.players[i].auto && !this.players[i].aiChamp && !this.players[i].inactive) this.generalThink(this.players[i].team, this.players[i].squads, this.players[i]);
    }
    for (let i = 0; i < this.players.length; i++) if (this.players[i].rallyT > 0) this.players[i].rallyT--;
    if (this.chaos) { if (this.tick === 2) this.events.push({ t: 'battle' }); if (this.tick >= this.nextChaos) this.chaosEvent(); if (this.boltBurst > 0 && this.tick % 40 === 0) { this.boltBurst--; this.nextBolt = 0; this.stormThink(); } }
    if (this.phase === 1 && this.tick % 15 === 0 && this.wagons.length) this.wagonThink();
    if (this.phase === 1 && this.wx && !this.wx.done && this.tick - this.battleTick >= this.wx.at) this.weatherChange();
    if (this.phase === 1 && this.wx && this.wx.lift && this.tick >= this.wx.lift) this.weatherLift();
    if (this.phase === 1) { if (this.tick % 15 === 0) { this.objectivesThink(); this.fireThink(); } this.navalThink(); if (this.rain) this.stormThink(); if (this.duels.length) this.duelThink(); if (this.heroMode) this.heroThink(); }
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (!u.dead && !u.inactive) this.updateUnit(u); }
    if (this.xc) this.xcEbb();
    if (this.phase === 1 && this.tick % 3 === 0) this.brushThink();
    if (this.waves.length && this.phase === 1 && this.tick % 15 === 0) this.wavesThink();
    if (this.mission && this.phase === 1 && this.tick % 15 === 0) this.missionThink();
    if (this.real && this.tick % 5 === 0) this.soldierThink();
    this.resolveCollisions();
    this.updateProjectiles();
    if (this.sg) this.siegeTick();
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (!u.dead && u.mount >= 0) { const h = units[u.mount]; u.x = h.x; u.z = h.z; u.y = h.y; u.vy = 0; u.airborne = h.airborne; } }
    if (this.phase === 1 && this.tick % 30 === 0 && this.tick > this.battleTick + 150 && this.winner < 0) this.checkVictory();
  }
  checkVictory() {
    let a0 = 0, a1 = 0;
    for (let i = 0; i < this.teamAlive[0].length; i++) if (this.teamAlive[0][i].def.ai !== 'cannon') a0++;
    for (let i = 0; i < this.teamAlive[1].length; i++) if (this.teamAlive[1][i].def.ai !== 'cannon') a1++;
    if (this.mission) { if (this.mwin !== undefined) this.winner = this.mwin; if (this.winner >= 0) this.events.push({ t: 'end', winner: this.winner }); return; }
    if (a0 === 0 && a1 === 0) this.winner = 2; else if (a0 === 0) this.winner = 1; else if (a1 === 0) this.winner = 0;
    else if (this.heroMode) { if (this.citT >= 30 * 45) this.winner = 1; else if (this.tick >= this.scen.limit) this.winner = 0; }
    else if (this.score[0] >= SCORE_WIN || this.score[1] >= SCORE_WIN) this.winner = this.score[0] >= this.score[1] ? 0 : 1;
    if (this.winner >= 0) this.events.push({ t: 'end', winner: this.winner });
  }
  hash() {
    let h = 2166136261 | 0;
    const mix = (v) => { h = Math.imul(h ^ (v | 0), 16777619); };
    const us = this.units;
    for (let i = 0; i < us.length; i++) { const u = us[i]; mix(Math.round((u.fat || 0) * 4) + u.shots * 1000); mix(Math.round(u.x * 64)); mix(Math.round(u.z * 64)); mix(Math.round(u.y * 64)); mix(Math.round(u.hp)); mix(u.st + (u.dead ? 100 : 0)); }
    for (let i = 0; i < this.squads.length; i++) mix(Math.round(this.squads[i].morale * 4) + (this.squads[i].routing ? 1000 : 0) + (this.squads[i].reserve ? 3000 : 0) + (this.squads[i].resting ? 7000 : 0) + (this.squads[i].focus | 0) * 11);
    mix(this.projectiles.length); mix(this.tick); mix(this.phase); mix(this.score[0]); mix(this.score[1]); mix(this.navals.length); mix(this.duels.length); mix(this.orderQ.length); mix(Math.round((this.rp ? this.rp[0] + this.rp[1] * 7 : 0) * 4)); for (const w of this.waves || []) mix(w.released ? 1 : 0); for (const w of this.wagons || []) mix(w.raid + (w.burnt ? 9999 : 0)); mix(Math.round(this.rangeMul * 1000)); for (const q of this.squads) mix(q.xp || 0); mix(this.nextChaos | 0); if (this.gate) { mix(Math.round(this.gate.hp)); mix(this.hphase); mix(this.citT); mix(Math.round(this.ram.hp)); mix(Math.round(this.ram.z * 16)); mix(this.pickups.length); mix(this.smokes.length); mix(this.rocketStrikes.length); for (let i = 0; i < this.units.length; i += 7) { const q = this.units[i]; mix(Math.round(q.pos) + (q.entT > 0 ? 500 : 0)); } for (const q of this.units) if (q.champ) { mix(q.hclass | 0); mix(Math.round(q.sta || 0)); mix(q.iframe > 0 ? 1 : 0); } for (const L of this.ladders) { mix(L.up ? 1 : 0); mix(Math.round(L.hp)); mix(Math.round(L.prog)); } } for (let i = 0; i < this.players.length; i++) { mix(this.players[i].bombs); mix(this.players[i].fury); }
    for (let i = 0; i < this.objectives.length; i++) mix(Math.round(this.objectives[i].ctrl * 8));
    let nb = 0; for (let i = 0; i < this.fireState.length; i++) if (this.fireState[i] === 1) nb += i; mix(nb);
    return h >>> 0;
  }
  // ---------- player input ----------
  applyInput(p, inp) {
    const u = this.units[p.heroId];
    if (inp && (inp[3] & A_READY)) p.ready = true;
    if (u && !u.dead) {
      if (!inp) { u.ctrlActive = false; u.atkHeld = false; u.blockHeld = false; }
      else {
        const cmdMode = !!(inp[3] & A_CMD);
        u.cmdMode = cmdMode; u.ctrlActive = !cmdMode;
        if (!cmdMode) this.controlUnit(u, inp, p);
        else { u.atkHeld = false; u.blockHeld = false; }
        if ((inp[3] & A_RALLY) && this.phase === 1) { if (u.champ) this.heroAbility(u, 3); else if (p.fury >= FURY_MAX && !cmdMode) this.bushido(p, u); else if (p.rallyT <= 0) this.rally(p, u); }
        // grenades removed from the game
        if (u.champ && !cmdMode && this.phase === 1) { const a = inp[3] | 0; if (a & A_AB1) this.heroAbility(u, 0); if (a & A_AB2) this.heroAbility(u, 1); if (a & A_AB3) this.heroAbility(u, 2); if (a & A_ULT) { if (p.fury >= FURY_MAX) this.bushido(p, u); } }
        if (!cmdMode && (inp[3] & A_DUEL) && this.phase === 1) this.challenge(p, u);
      }
    }
    if (inp && inp[6]) for (let i = 0; i < inp[6].length; i++) this.applyCommand(p, inp[6][i]);
  }
  bushido(p, u) {
    p.fury = 0; u.frenzyT = 10; u.hp = Math.min(u.def.hp, u.hp + u.def.hp * 0.3);
    for (let i = 0; i < p.squads.length; i++) { const sq = this.squads[p.squads[i]]; if (sq.alive && len(sq.cx - u.x, sq.cz - u.z) < 40) { sq.morale = sq.moraleMax; if (sq.routing) this.rallySquad(sq); } }
    const n = this.gatherNear(u.x, u.z, 14); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (const id of ids) { const v = this.units[id]; if (v.dead || v.team === u.team || v.type === 'horse') continue; if (v.squad >= 0 && !this.squads[v.squad].def.fearless) this.squads[v.squad].morale = Math.max(0, this.squads[v.squad].morale - 4); if (len(v.x - u.x, v.z - u.z) < 5 && v.mass < 5) { v.flinchT = Math.max(v.flinchT, 0.6); if (v.st === ST_WINDUP) { v.st = ST_IDLE; v.stT = 0; } } }
    this.events.push({ t: 'bushido', id: u.id, p: p.idx, x: u.x, y: u.y, z: u.z });
  }
  aiThrow(u, tgt) {
    u.bombs--; u.throwT = 2.5; const v = 17; const b = this.ballistic(u, tgt.x + tgt.mx * 1.5, tgt.z + tgt.mz * 1.5, v, 0.12);
    const ca = cos(b.ang); const ox = u.x + sin(b.yaw) * 0.5, oz = u.z + cos(b.yaw) * 0.5, oy = u.y + 1.7;
    this.projectiles.push({ kind: 'bomb', x: ox, y: oy, z: oz, vx: sin(b.yaw) * ca * v, vy: sin(b.ang) * v, vz: cos(b.yaw) * ca * v, team: u.team, owner: u.id, life: 0, hits: 0, fuse: 0.4 + d2fuse(len(tgt.x - u.x, tgt.z - u.z)) });
    this.events.push({ t: 'throw', id: u.id, x: ox, y: oy, z: oz });
  }
  throwBomb(p, u) {
    if (p.bombs <= 0 || (u.throwT || 0) > 0 || u.downT > 0 || u.st === ST_RELOAD || u.st === ST_STUN || u.st === ST_RELEASE) return; p.bombs--; u.throwT = 1.2;
    const cp = cos(u.pitch + 0.25), v = 17; const ox = u.x + sin(u.yaw) * 0.5, oz = u.z + cos(u.yaw) * 0.5, oy = u.y + ((u.mounted || u.mount >= 0) ? 2.4 : 1.7);
    this.projectiles.push({ kind: 'bomb', x: ox, y: oy, z: oz, vx: sin(u.yaw) * cp * v + u.mx * 0.5, vy: sin(u.pitch + 0.25) * v, vz: cos(u.yaw) * cp * v + u.mz * 0.5, team: u.team, owner: u.id, life: 0, hits: 0, fuse: 2.2 });
    this.events.push({ t: 'throw', id: u.id, x: ox, y: oy, z: oz });
  }
  challenge(p, u) {
    if (u.duelWith >= 0 && u.duelWith !== undefined) return;
    let best = null, bs = 1e9; const en = this.teamAlive[1 - u.team];
    for (let i = 0; i < en.length; i++) { const v = en[i]; if (v.type === 'horse' || v.def.ai === 'cannon' || v.downT > 0 || (v.duelWith >= 0 && v.duelWith !== undefined)) continue;
      const isCap = v.type === 'hero' || (v.squad >= 0 && this.squads[v.squad].unitIds[0] === v.id && !this.squads[v.squad].routing); if (!isCap) continue;
      const d = len(v.x - u.x, v.z - u.z); if (d > 30) continue; const a = Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)); if (a > 0.45) continue; const sc = a * 30 + d; if (sc < bs) { bs = sc; best = v; } }
    if (!best) { this.events.push({ t: 'duelfail', p: p.idx }); return; }
    u.duelWith = best.id; best.duelWith = u.id; best.target = u.id; best.retT = 1;
    this.duels.push({ a: u.id, b: best.id, x: (u.x + best.x) / 2, z: (u.z + best.z) / 2, t: this.tick });
    this.events.push({ t: 'duel', a: u.id, b: best.id, p: p.idx, x: (u.x + best.x) / 2, z: (u.z + best.z) / 2 });
  }
  duelThink() {
    for (let i = this.duels.length - 1; i >= 0; i--) {
      const d = this.duels[i], a = this.units[d.a], b = this.units[d.b]; let w = null, l = null, over = false;
      if (a.dead && !b.dead) { w = b; l = a; } else if (b.dead && !a.dead) { w = a; l = b; } else if (a.dead && b.dead) over = true;
      else if (this.tick - d.t > 30 * 50 || len(a.x - d.x, a.z - d.z) > 45 || len(b.x - d.x, b.z - d.z) > 45) over = true;
      if (!w && !over) continue;
      a.duelWith = -1; b.duelWith = -1; this.duels.splice(i, 1);
      if (w) {
        if (l.squad >= 0) { const sq = this.squads[l.squad]; if (!sq.def.fearless) sq.morale = Math.max(0, sq.morale - 55); }
        for (let k = 0; k < this.squads.length; k++) { const sq = this.squads[k]; if (!sq.alive) continue; const dd = len(sq.cx - d.x, sq.cz - d.z); if (dd > 60) continue; if (sq.team === w.team) sq.morale = Math.min(sq.moraleMax, sq.morale + 30); else if (!sq.def.fearless) sq.morale = Math.max(0, sq.morale - 12); }
        this.score[w.team] += 25; if (w.ctrl >= 0) this.players[w.ctrl].fury = FURY_MAX;
      }
      this.events.push({ t: 'duelend', winner: w ? w.id : -1, loser: l ? l.id : -1, team: w ? w.team : -1 });
    }
  }
  rally(p, hero) {
    p.rallyT = RALLY_CD; let n = 0;
    for (let i = 0; i < p.squads.length; i++) {
      const sq = this.squads[p.squads[i]]; if (!sq.alive) continue;
      if (len(sq.cx - hero.x, sq.cz - hero.z) < 32) { sq.morale = Math.min(sq.moraleMax, sq.morale + 40); n++; if (sq.routing && sq.morale > 45) this.rallySquad(sq); }
    }
    this.events.push({ t: 'rally', p: p.idx, x: hero.x, y: hero.y, z: hero.z, n });
  }
  controlUnit(u, inp, p) {
    const keys = inp[0] | 0, a = inp[3] | 0, wsel = inp[7] | 0;
    u.yaw = wrap((inp[1] | 0) * TAU / 65536); u.pitch = clamp((inp[2] | 0) / 10000, -1.45, 1.45);
    if (a & A_MOUNT) this.tryMount(u, p);
    const disabled = u.downT > 0 || u.st === ST_STUN;
    this.heroRegen(u);
    if (u.mount >= 0) this.horseControl(this.units[u.mount], keys, disabled, false);
    else if (u.mounted) this.horseControl(u, keys, disabled, true);
    else this.footControl(u, keys, a, disabled);
    if (disabled) { u.blocking = false; u.atkHeld = !!(a & A_ATK); u.blockHeld = !!(a & A_BLOCK); return; }
    if (u.manE >= 0 && this.sg && this.empControl(u, a)) return;
    // E beside a free piece mans it whatever you were doing (reloading, aiming, mid-swing)
    if ((a & A_KICK) && this.sg && this.phase === 1 && u.mount < 0 && !u.mounted && this.sg.emp.some(e => e.team === u.team && e.man < 0 && len(e.x - u.x, e.z - u.z) < 2.6)) { u.st = ST_IDLE; u.stT = 0; u.aiming = false; u.blocking = false; this.siegeInteract(u); return; }
    const kitH = u.kit ? this.kitInput(u, a, wsel) : false; const ws = kitH ? [u.weapon] : u.def.weapons;
    if ((a & A_SWAP) && ws.length > 1) { u.nextWeapon = ws[(ws.indexOf(u.weapon) + 1) % ws.length]; u.swapQ = true; }
    // a man with only a gun turns it round to fight with it as a club (and back); turning it breaks off a reload
    else if (!kitH && (a & A_SWAP) && ws.length === 1 && u.weapon === 'rifle' && (u.st === ST_IDLE || u.st === ST_RELOAD || u.st === ST_AIM)) { u.club = !u.club; u.aiming = false; u.fireQ = 0; if (u.st !== ST_IDLE) { u.st = ST_IDLE; u.stT = 0; } this.events.push({ t: 'grip', id: u.id, club: u.club }); }
    if (wsel > 0 && wsel <= ws.length) { const w = ws[wsel - 1]; if (w !== u.weapon) { u.nextWeapon = w; u.swapQ = true; } else u.swapQ = false; }
    if (u.swapQ && (u.st === ST_RELOAD || u.st === ST_AIM)) { u.st = ST_IDLE; u.stT = 0; u.aiming = false; } // drawing the other weapon breaks off a reload
    if (u.swapQ && u.st === ST_IDLE) { u.swapQ = false; if (u.nextWeapon && u.nextWeapon !== u.weapon) { u.st = ST_SWAP; u.stT = 0; u.blocking = false; u.aiming = false; } }
    const gun = gunOf(u.def, u.weapon);
    if (gun && this.phase === 1 && u.weapon === 'bow' && !(gun.xbow)) this.heroBow(u, a, gun);
    else if (gun && this.phase === 1) {
      u.aiming = !!(a & A_AIM) && (u.st === ST_IDLE || u.st === ST_RELOAD) && !(a & A_BLOCK); u.aimHold = u.aiming && u.st === ST_IDLE ? (u.aimHold || 0) + DT : 0;
      const have = u.weapon === 'revolver' ? u.ammoR : u.ammo;
      if ((a & A_RELOAD) && u.club) { u.club = false; this.events.push({ t: 'grip', id: u.id, club: false }); }
      if ((a & A_FIRE) && !u.club) u.fireQ = 0.45;
      if (u.fireQ > 0) { u.fireQ -= DT; if (u.st === ST_IDLE) { u.fireQ = 0; if (have > 0) this.fireHeroGun(u, gun); else this.startReload(u, gun.reload, true); } }
      if ((a & A_RELOAD) && u.st === ST_IDLE && have < (gun.mag || 1)) this.startReload(u, gun.reload, true);
    } else u.aiming = false;
    if (this.phase === 1) {
      this.meleeControl(u, a, inp[4] | 0, inp[5] | 0);
      if ((a & A_KICK) && u.st === ST_IDLE && u.mount < 0 && !u.mounted && !this.helpWounded(u) && !(this.sg && this.siegeInteract(u)) && !this.pkTry(u)) { u.st = ST_KICK; u.stT = 0; u.kickHit = false; u.blocking = false; this.events.push({ t: 'kick', id: u.id }); }
    } else { u.atkHeld = !!(a & A_ATK); u.blockHeld = !!(a & A_BLOCK); u.blocking = false; }
  }
  startReload(u, dur, fill) { u.st = ST_RELOAD; u.stT = 0; u.reloadT = dur; u.reloadFill = fill; u.blocking = false; this.events.push({ t: 'reload', id: u.id, dur }); }
  meleeControl(u, a, ad, bd) {
    const atk = !!(a & A_ATK), blk = !!(a & A_BLOCK);
    const atkPressed = atk && !u.atkHeld, blkPressed = blk && !u.blockHeld;
    if (u.st === ST_WINDUP && blkPressed) { u.st = ST_IDLE; u.stT = 0; this.events.push({ t: 'feint', id: u.id }); }
    if (u.champ && atkPressed && u.airborne && !u.plunge && u.flinchT <= 0) { u.plunge = true; u.vy = Math.min(u.vy, -6); u.st = ST_WINDUP; u.stT = 0; u.atkDir = DIR_UP; this.events.push({ t: 'plunge', id: u.id }); u.atkHeld = atk; u.blockHeld = blk; return; }
    if (u.champ && atkPressed && u.dodgeT > 0 && u.dodgeFwd && u.sta >= 10) { u.sta -= 10; u.staT = 0; u.lunge = true; u.blocking = false; u.st = ST_WINDUP; u.stT = 0; u.atkDir = DIR_DOWN; u.windupId++; u.swingHit = false; this.release(u); u.dodgeT = Math.max(u.dodgeT, 0.18); this.events.push({ t: 'lunge', id: u.id, x: u.x, y: u.y, z: u.z }); u.atkHeld = atk; u.blockHeld = blk; return; }
    if (u.champ && atkPressed && u.sta < 8) { if (!u.tiredT || u.tiredT <= 0) { u.tiredT = 0.8; this.events.push({ t: 'tired', id: u.id }); } u.atkHeld = atk; u.blockHeld = blk; return; }
    if (atkPressed && u.flinchT <= 0 && (u.st === ST_IDLE || (u.st === ST_RECOVER && u.stT > u.def.recover * 0.6))) {
      u.blocking = false; if (u.champ) { const chain = this.tick - (u.lastSwing || -999) < 40; u.combo = chain ? (u.combo || 0) + 1 : 0; u.lastSwing = this.tick; u.sta -= 6 + u.combo * 3; u.staT = 0; } this.startWindup(u, weaponDir(u.weapon, ad));
    } else if (blk && u.st !== ST_WINDUP && u.st !== ST_RELEASE && u.st !== ST_KICK && u.st !== ST_SWAP && u.flinchT <= 0 && (u.st === ST_IDLE || u.st === ST_RECOVER || u.st === ST_RELOAD)) {
      if (!u.blocking) { u.blocking = true; u.blockT = 0; u.blockDir = bd; }
      if (u.st === ST_RECOVER) { u.st = ST_IDLE; u.stT = 0; }
    } else if (!blk) u.blocking = false;
    u.atkHeld = atk; u.blockHeld = blk;
  }
  startWindup(u, dir) { if (u.hrT > 0) return; u.wMul = 1;
    if (u.def.brush && dir === DIR_UP) dir = (u.windupId & 1) ? DIR_LEFT : DIR_RIGHT; // the wolf-brush pokes and sweeps side to side; it is never chopped down overhead if (this.xc && u.ctrl < 0 && u.target >= 0) { const t = this.units[u.target]; if (t && t.ctrl >= 0 && !this.players[t.ctrl].ai) u.wMul = 1.3; }
    if (this.xc && u.ctrl >= 0 && !u.champ) { // mashing: each swing in quick succession costs arm; past three in a breath the windups slow and telegraph
      u.spamR = Math.max(0, (u.spamR || 0) - (this.tick - (u.spamTk || 0)) / 45) + 1; u.spamTk = this.tick; u.wMul *= 1 + clamp(u.spamR - 3, 0, 4) * 0.12; }
    u.heavy = false; u.aiHeavy = u.ctrl < 0 && !u.ctrlActive && this.rng.next() < (u.def.overhead ? 0.4 : 0.18); u.st = ST_WINDUP; u.stT = 0; u.atkDir = dir; u.relQ = false; u.windupId++; u.swingHit = false; u.blocking = false; u.aiming = false; this.events.push({ t: 'windup', id: u.id, dir }); }
  footControl(u, keys, a, disabled) {
    if (!u.champ && u.dodgeT > 0) { const k = u.dodgeT / 0.32, sp = (this.real ? 10.5 : 12.5) * (0.55 + 0.75 * k); u.mx = u.dodgeX * sp; u.mz = u.dodgeZ * sp; return; } // a low slide: fast off the mark, bleeding speed // mid-dash: the body is committed
    if (disabled || u.airborne) { u.mx = 0; u.mz = 0; return; }
    const fx = sin(u.yaw), fz = cos(u.yaw), rx = -cos(u.yaw), rz = sin(u.yaw);
    let mx = 0, mz = 0;
    if (keys & KEY_W) { mx += fx; mz += fz; } if (keys & KEY_S) { mx -= fx; mz -= fz; }
    if (keys & KEY_D) { mx += rx; mz += rz; } if (keys & KEY_A) { mx -= rx; mz -= rz; }
    const l = len(mx, mz);
    if (l > 0) {
      let sp = u.def.speed * this.zoneSpeed(u.x, u.z, mx, mz);
      if ((keys & KEY_S) && !(keys & KEY_W)) sp *= 0.65;
      if (u.st === ST_WINDUP || u.st === ST_RELEASE) sp *= 0.7; else if (u.st === ST_STUN) sp = 0;
      if (u.drawT > 0) sp *= 0.55; // a drawn bow: you walk, you don't run
      if (u.blocking) sp *= 0.85; if (u.aiming) sp *= 0.5; if (u.st === ST_RELOAD) sp *= 0.8;
      // sprint: hold Shift while moving forward; burns stamina, and a winded man must get his breath back
      if (u.champ) { if (u.sta < 4) u.winded = true; else if (u.sta > 30) u.winded = false; } else { if ((u.fat || 0) >= 96) u.winded = true; else if ((u.fat || 0) < 55) u.winded = false; }
      u.sprint = !!(keys & KEY_SPRINT) && !!(keys & KEY_W) && !(keys & KEY_S) && !u.winded && !u.blocking && !u.aiming && u.st !== ST_WINDUP && u.st !== ST_RELEASE && u.st !== ST_RELOAD && u.st !== ST_STUN;
      if (u.sprint) { sp *= 1.42; if (u.champ) { u.sta -= 14 * DT; u.staT = 0; } else u.fat = Math.min(100, (u.fat || 0) + 17 * DT); }
      u.mx = mx / l * sp; u.mz = mz / l * sp;
    } else { u.mx = 0; u.mz = 0; u.sprint = false; }
    if ((a & (A_DASHL | A_DASHR)) && !u.airborne) { const sd = (a & A_DASHR) ? 1 : -1; mx = rx * sd; mz = rz * sd; a |= A_DODGE; keys = (keys & ~(KEY_W | KEY_S | KEY_A | KEY_D)) | (sd > 0 ? KEY_D : KEY_A); }
    const l2 = len(mx, mz);
    if (!u.champ && (a & A_DODGE) && !u.airborne && (u.dodgeCd || 0) <= 0 && u.st !== ST_STUN && u.st !== ST_RELEASE) { // a quick sidestep or hop back
      const ddx = l2 > 0 ? mx / l2 : -fx, ddz = l2 > 0 ? mz / l2 : -fz; u.dodgeCd = 0.85; u.dodgeT = 0.32; u.iframe = 0.3; u.dodgeX = ddx; u.dodgeZ = ddz; u.fat = Math.min(100, (u.fat || 0) + 6);
      if (u.st === ST_WINDUP || u.st === ST_RECOVER) { u.st = ST_IDLE; u.stT = 0; } u.blocking = false;
      this.events.push({ t: 'dodge', id: u.id, x: u.x, y: u.y, z: u.z, side: (keys & KEY_A) ? -1 : (keys & KEY_D) ? 1 : 0, back: (keys & KEY_S) ? 1 : 0, fwd: 0 }); return; }
    if (u.champ && (a & A_DODGE) && !u.airborne && u.downT <= 0) { if (l2 > 0) this.champDodge(u, mx / l2, mz / l2, keys); else this.champDodge(u, -fx, -fz, KEY_S); return; }
    if ((a & A_JUMP) && !u.airborne && u.downT <= 0) { if (u.champ) { if (u.sta < 8 || u.st === ST_STUN) return; u.sta -= 8; u.staT = 0; u.vy = 8.4; u.iframe = Math.max(u.iframe || 0, 0.28); u.jumpT = 0; this.events.push({ t: 'leap', id: u.id, x: u.x, y: u.y, z: u.z }); } else u.vy = 6.5; u.y += 0.05; u.airborne = true; u.vx += u.mx * 0.9; u.vz += u.mz * 0.9; }
  }
  horseControl(body, keys, disabled, integrated) {
    const yaw = integrated ? body.hyaw : body.yaw;
    let sp = body.hspeed; const zs = this.zoneSpeed(body.x, body.z, sin(yaw), cos(yaw));
    if (!disabled && (keys & KEY_W)) sp += 5 * DT;
    else if (!disabled && (keys & KEY_S)) sp -= 7 * DT;
    else { if (sp > 0) sp = Math.max(0, sp - 2 * DT); else if (sp < 0) sp = Math.min(0, sp + 3 * DT); }
    sp = clamp(sp, -2.5, 11 * (zs < 1 ? 0.6 : 1));
    let turn = 0;
    if (!disabled) { if (keys & KEY_A) turn = 1; if (keys & KEY_D) turn = -1; }
    const rate = (2.6 - 1.7 * Math.abs(sp) / 11) * DT;
    const nyaw = wrap(yaw + turn * rate);
    if (integrated) body.hyaw = nyaw; else body.yaw = nyaw;
    body.hspeed = sp; body.mx = sin(nyaw) * sp; body.mz = cos(nyaw) * sp;
  }
  tryMount(u, p) {
    if (u.mount >= 0) {
      const h = this.units[u.mount]; h.rider = -1; u.mount = -1; u.mounted = false; h.hspeed = 0; h.mx = 0; h.mz = 0;
      const rx = -cos(h.yaw), rz = sin(h.yaw); u.x = h.x + rx * 1.4; u.z = h.z + rz * 1.4; u.y = terrainH(u.x, u.z);
      this.events.push({ t: 'mount', id: u.id, on: false });
    } else if (u.type === 'hero') {
      const h = this.units[p.horseId];
      if (h && !h.dead && h.rider < 0 && len(h.x - u.x, h.z - u.z) < 3.4) { u.mount = h.id; h.rider = u.id; u.mounted = true; u.x = h.x; u.z = h.z; u.st = ST_IDLE; u.blocking = false; this.events.push({ t: 'mount', id: u.id, on: true }); }
    }
  }
  deployZ(team, z) { return team === 0 ? clamp(z, -HALF + 6, -48) : clamp(z, 48, HALF - 6); }
  applyCommand(p, c) {
    const type = c[1] | 0;
    if (type === 21) { if (this.beaconBuy) this.beaconBuy(p, c[2] | 0); return; }
    if (type === 31) { this.debugCmd(p, c[2] | 0, c[3] | 0); return; }
    if (type === ORD_SPAWN) { if ((this.mode === 'assault' || this.mode === 'campaign') && !p.ai) this.deploy(p, c[0] | 0, c[2] | 0); return; }
    if (this.mode === 'assault' && type === ORD_DIRECTIVE) return; // in an assault you are a soldier: the generals are not yours to command
    if (this.chaos && type !== ORD_CONTROL) return; // no orders in chaos: only body-hopping
    if (this.real && (!p.squads.length || type === ORD_CONTROL || type === ORD_NAVAL || type === ORD_WAVE)) return; // a soldier gives no orders; officers only to their own squads
    if (this.mission && (this.mission.soldier || this.mission.camp) && type !== ORD_SPAWN && (!p.squads.length || type === ORD_CONTROL || type === ORD_NAVAL || type === ORD_WAVE || type === ORD_DIRECTIVE || type === ORD_AUTO)) return; // a story chapter: one man in the ranks; once the file is yours, only its own drill
    if (!c[6] && type >= ORD_MOVE && type <= ORD_FIRE && this.phase === 1) { const sq = this.squads[c[0] | 0];
      if (sq && sq.owner === p.idx && sq.alive) { const h = this.units[p.heroId]; let d = h && !h.dead ? len(h.x - sq.cx, h.z - sq.cz) : 200;
        if (h && !h.dead && h.mount >= 0) d *= 0.8; const delay = 0; // couriers removed: orders take effect immediately
        if (delay > 0) { const cc = c.slice(0, 6); cc[6] = 1; this.orderQ.push({ at: this.tick + delay, p: p.idx, c: cc }); sq.pendAt = this.tick + delay; this.events.push({ t: 'courier', sq: sq.id, p: p.idx, delay }); return; } } }
    if (type === ORD_CLASS && this.heroMode) { const cl = clamp(c[0] | 0, 0, 3); p.nextClass = cl; const h = this.units[p.heroId];
      if (h && !h.dead && len(h.x - this.scen.heroSpawn[p.team][0], h.z - this.scen.heroSpawn[p.team][1]) < 11) { this.setClass(h, cl); p.nextClass = -1; }
      this.events.push({ t: 'classpick', p: p.idx, c: cl }); return; }
    if (this.heroMode) return; // champions give no orders
    if (type === ORD_WAVE) { const w = this.waves.find(q => q.team === p.team && !q.released); if (w && this.rp[p.team] >= 180 && this.phase === 1) this.releaseWave(w, true); return; }
    if (type === ORD_DIRECTIVE) {
      const tp = this.players[c[0] | 0]; if (!tp || !tp.ai || tp.team !== p.team) return;
      tp.directive = { kind: clamp(c[5] | 0, 0, 3), x: clamp(+c[2] || 0, -HALF, HALF), z: clamp(+c[3] || 0, -HALF, HALF), by: p.idx };
      this.events.push({ t: 'directive', p: p.idx, to: tp.idx, kind: tp.directive.kind }); return;
    }
    if (type === ORD_AUTO) { p.auto = !!c[5]; this.events.push({ t: 'auto', p: p.idx, on: p.auto }); return; }
    if (type === ORD_NAVAL) {
      if (p.navalUsed || this.phase !== 1) return; p.navalUsed = true;
      const x = clamp(+c[2] || 0, -HALF, HALF), z = clamp(+c[3] || 0, -HALF, HALF);
      this.navals.push({ x, z, t: this.tick + 120, n: 6, team: p.team });
      this.events.push({ t: 'navalcall', x, z, team: p.team, p: p.idx }); return;
    }
    if (type === ORD_ABILITY) {
      const sq = this.squads[c[0] | 0]; if (!sq || sq.owner !== p.idx || !sq.alive || sq.routing || sq.abT > 0 || this.phase !== 1) return;
      this.useAbility(sq, p.idx); return;
    }
    if (type === ORD_CONTROL) {
      const u = this.units[c[5] | 0]; if (!u || u.dead || u.owner !== p.idx || u.def.ai === 'cannon' || u.type === 'horse' || u.ctrl >= 0) return;
      const old = this.units[p.heroId];
      if (old && !old.dead) { old.ctrl = -1; old.ctrlActive = false; old.cmdMode = false; old.atkHeld = false; old.blockHeld = false; old.blocking = false; old.aiming = false; }
      u.ctrl = p.idx; u.cmdMode = true; u.ctrlActive = false; u.target = -1; p.heroId = u.id;
      this.events.push({ t: 'control', p: p.idx, id: u.id }); return;
    }
    const sq = this.squads[c[0] | 0]; if (!sq || sq.owner !== p.idx || !sq.alive) return;
    let x = clamp(+c[2] || 0, -HALF, HALF), z = clamp(+c[3] || 0, -HALF, HALF); const facing = wrap((c[4] | 0) / 1000);
    if (this.phase === 0 && (type === ORD_MOVE || type === ORD_CHARGE)) {
      z = this.deployZ(sq.team, z); sq.order = ORD_HOLD; sq.tx = x; sq.tz = z; sq.facing = facing; if (type === ORD_MOVE) sq.cols = clamp(c[5] | 0, 0, 40);
      this.placeSquad(sq); this.events.push({ t: 'order', sq: sq.id, type, p: p.idx }); return;
    }
    if (sq.routing && type !== ORD_FORM && type !== ORD_FIRE) return;
    switch (type) {
      case ORD_MOVE: sq.order = ORD_MOVE; sq.tx = x; sq.tz = z; sq.facing = facing; sq.cols = clamp(c[5] | 0, 0, 40); break;
      case ORD_CHARGE: sq.order = ORD_CHARGE; sq.tx = x; sq.tz = z; sq.facing = facing; break;
      case ORD_HOLD: sq.order = ORD_HOLD; sq.tx = sq.cx; sq.tz = sq.cz; break;
      case ORD_FOLLOW: sq.order = ORD_FOLLOW; sq.fAx = undefined; break;
      case ORD_FORM: sq.formation = clamp(c[5] | 0, 0, 3); sq.cols = 0; break;
      case ORD_FIRE: sq.fire = !!c[5]; break;
      default: return;
    }
    this.events.push({ t: 'order', sq: sq.id, type, p: p.idx });
  }
  // teleport a squad onto its slots (deployment phase)
  placeSquad(sq) {
    const units = this.units; let n = 0;
    for (let i = 0; i < sq.unitIds.length; i++) if (!units[sq.unitIds[i]].dead) n++;
    const fx = sin(sq.facing), fz = cos(sq.facing), rx = -cos(sq.facing), rz = sin(sq.facing), s = spacingOf(sq.def);
    let k = 0;
    for (let i = 0; i < sq.unitIds.length; i++) {
      const u = units[sq.unitIds[i]]; if (u.dead) continue;
      let [lat, dep] = slotOffset(sq.formation, k++, n, s, sq.cols); if (sq.def.yuanyang && sq.formation !== FORM_COLUMN) { const r = YY_SLOT[i % 12]; lat = r[0] * 0.92; dep = r[1] * 0.82; }
      u.slotX = clamp(sq.tx + rx * lat + fx * dep, -HALF, HALF); u.slotZ = clamp(sq.tz + rz * lat + fz * dep, -HALF, HALF);
      u.x = u.px = u.slotX; u.z = u.pz = u.slotZ; u.y = u.py = terrainH(u.x, u.z); u.yaw = u.pyaw = sq.facing; u.hyaw = u.phyaw = sq.facing; u.mx = 0; u.mz = 0; u.hspeed = 0;
    }
    sq.cx = sq.tx; sq.cz = sq.tz;
  }
  // ---------- squads & generals ----------
  squadThink(sq) {
    const units = this.units; let n = 0, cx = 0, cz = 0;
    for (let i = 0; i < sq.unitIds.length; i++) { const u = units[sq.unitIds[i]]; if (!u.dead) { n++; cx += u.x; cz += u.z; } }
    sq.aliveCount = n; if (sq.abT > 0) sq.abT -= 15; if (sq.abOn > 0) sq.abOn -= 15;
    { let f = 0, sh = 0, mx = 0; for (let i = 0; i < sq.unitIds.length; i++) { const u = units[sq.unitIds[i]]; if (u.dead) continue; f += u.fat || 0; sh += u.shots; } sq.fat = n ? f / n : 0; sq.shots = n ? sh / n : 0;
      const isR = sq.def.ai === 'ranged' || sq.def.ai === 'cannon'; sq.dry = isR && n > 0 && sh === 0;
      if (isR && n && this.tick % 60 < 15) { let sup = false; const home = sq.team === 0 ? -1 : 1;
        if (sq.owner >= 0) { const h = units[this.players[sq.owner].heroId]; if (h && !h.dead && len(h.x - sq.cx, h.z - sq.cz) < 20) sup = true; }
        for (const w of this.wagons) if (!w.burnt && w.team === sq.team && len(w.x - sq.cx, w.z - sq.cz) < 25) { sup = true; sq.morale = Math.min(sq.moraleMax, sq.morale + 1); }
        if (sup) for (let i = 0; i < sq.unitIds.length; i++) { const u = units[sq.unitIds[i]]; if (!u.dead && u.shots < 30) u.shots += sq.def.cannon || sq.def.gun ? 1 : 2; }
        sq.supplied = sup; } }
    if (n === 0) { sq.alive = false; this.events.push({ t: 'squaddead', sq: sq.id }); return; }
    sq.cx = cx / n; sq.cz = cz / n;
    if (this.phase === 1) this.moraleThink(sq);
    if (sq.order === ORD_FOLLOW) {
      const p = sq.owner >= 0 ? this.players[sq.owner] : null; const hero = p ? units[p.heroId] : null;
      if (hero && !hero.dead) { // hysteresis: the company re-forms only when its leader has actually marched somewhere, not when he turns his head or shuffles about
        if (sq.fAx === undefined || len(hero.x - sq.fAx, hero.z - sq.fAz) > 40) { sq.fAx = hero.x; sq.fAz = hero.z; sq.fH = hero.yaw; sq.tx = hero.x - sin(hero.yaw) * 9; sq.tz = hero.z - cos(hero.yaw) * 9; sq.facing = hero.yaw; }
        const mv = len(hero.x - sq.fAx, hero.z - sq.fAz);
        if (mv > 7) { const hd = atan2(hero.x - sq.fAx, hero.z - sq.fAz); const turn = Math.abs(wrap(hd - sq.fH)); if (turn < 1.2 || mv > 12) sq.fH = hd; sq.fAx = hero.x; sq.fAz = hero.z;
          sq.tx = hero.x - sin(sq.fH) * 9; sq.tz = hero.z - cos(sq.fH) * 9; sq.facing = sq.fH; }
        else if (len(sq.tx - hero.x, sq.tz - hero.z) > 22) { sq.tx = hero.x - sin(sq.fH) * 9; sq.tz = hero.z - cos(sq.fH) * 9; } }
      else sq.order = ORD_HOLD;
    }
    if (sq.order === ORD_MOVE && len(sq.cx - sq.tx, sq.cz - sq.tz) < 2.5) sq.order = ORD_HOLD;
    if (this.xc) this.xcFront(sq);
    if (sq.def.yuanyang) this.yyAnchor(sq, n);
    const fx = sin(sq.facing), fz = cos(sq.facing), rx = -cos(sq.facing), rz = sin(sq.facing), s = spacingOf(sq.def);
    let k = 0;
    // friendly companies given the same ground slide apart instead of merging into one mob
    if ((this.tick + sq.id) % 15 === 0) { let wx = 0, wz = 0; const R0 = 3 + n * 0.45 * s;
      if (sq.order !== ORD_CHARGE) for (const q of this.squads) { if (q === sq || !q.alive || q.inactive || q.team !== sq.team || q.order === ORD_CHARGE) continue; const R1 = 3 + q.aliveCount * 0.45 * spacingOf(q.def);
        const dx = sq.tx - (q.tx + (q.sepX || 0)), dz = sq.tz - (q.tz + (q.sepZ || 0)), d = len(dx, dz), need = (R0 + R1) * 0.5; if (d < need) { const k2 = (need - d) * 0.5; if (d > 0.3) { wx += dx / d * k2; wz += dz / d * k2; } else { wx += rx * k2 * (sq.id > q.id ? 1 : -1); wz += rz * k2 * (sq.id > q.id ? 1 : -1); } } }
      sq.sepX = (sq.sepX || 0) * 0.6 + clamp(wx, -12, 12) * 0.4; sq.sepZ = (sq.sepZ || 0) * 0.6 + clamp(wz, -12, 12) * 0.4; }
    const ox = sq.sepX || 0, oz = sq.sepZ || 0;
    for (let i = 0; i < sq.unitIds.length; i++) {
      const u = units[sq.unitIds[i]]; if (u.dead) continue;
      let [lat, dep] = slotOffset(sq.formation, k++, n, s, sq.cols); if (sq.def.yuanyang && sq.formation !== FORM_COLUMN) { const r = YY_SLOT[i % 12]; lat = r[0] * 0.92; dep = r[1] * 0.82; }
      if (u.restT > this.tick) dep -= 3.4;
      u.slotX = clamp((sq.yyA ? sq.yax : sq.front ? sq.fax : sq.tx) + ox + rx * lat + fx * dep, -HALF, HALF); u.slotZ = clamp((sq.yyA ? sq.yaz : sq.front ? sq.faz : sq.tz) + oz + rz * lat + fz * dep, -HALF, HALF);
      for (const p of this.players) { if (p.ai || p.team !== sq.team) continue; const h = units[p.heroId]; if (!h || h.dead || h === u) continue; const hx = u.slotX - h.x, hz = u.slotZ - h.z, hd = len(hx, hz); if (hd < 1.9) { const e = hd > 0.05 ? 1.9 / hd : 0; u.slotX = h.x + (hd > 0.05 ? hx * e : rx * 1.9); u.slotZ = h.z + (hd > 0.05 ? hz * e : rz * 1.9); } } // leave the player room to move
      if (sq.def.ai === 'ranged' && sq.order === ORD_HOLD) this.coverSlot(u, fx, fz);
    }
  }
  coverSlot(u, fx, fz) {
    const bl = this.boxCells[this.cellOf(u.slotX, u.slotZ)]; if (!bl) return; let best = null, bd = 3.6;
    for (let k = 0; k < bl.length; k++) { const b = this.boxes[bl[k]]; if (b.kind !== 'mantlet') continue; const d = len(b.x - u.slotX, b.z - u.slotZ); if (d < bd) { bd = d; best = b; } }
    if (!best) return; const side = fz >= 0 ? -1 : 1; if (Math.abs(fz) < 0.5) return; if (Math.abs(u.slotX - best.x) > best.hw - 0.35) return;
    u.slotX = best.x + clamp(u.slotX - best.x, -best.hw + 0.35, best.hw - 0.35); u.slotZ = best.z + side * (best.hd + 0.62);
  }
  moraleThink(sq) {
    if (sq.def.fearless || (sq.abOn > 0 && sq.ability === 'kiai')) { sq.morale = sq.moraleMax; return; }
    // nearest enemy squad and local odds
    let ed = 1e9, ecount = 0, fcount = 0, frout = 0, behind = 0;
    for (let i = 0; i < this.squads.length; i++) {
      const s = this.squads[i]; if (!s.alive || s === sq) continue;
      const d = len(s.cx - sq.cx, s.cz - sq.cz);
      if (s.team !== sq.team) {
        if (d < ed) ed = d;
        if (d < 28) { ecount += s.aliveCount; const ang = Math.abs(wrap(atan2(s.cx - sq.cx, s.cz - sq.cz) - sq.facing)); if (ang > 2.1 && d < 14) behind++; }
      } else if (d < 30) { fcount += s.aliveCount; if (s.routing) frout++; }
    }
    let dm = ed > 45 ? 2.6 : 0.5;
    if (sq.owner >= 0) { const p = this.players[sq.owner]; const h = this.units[p.heroId]; if (h && !h.dead && h.type === 'hero' && len(h.x - sq.cx, h.z - sq.cz) < 26) dm += 1.6; }
    if (ecount > 2 * (sq.aliveCount + fcount) && ecount > 6) dm -= 1.6;
    if (behind > 0) dm -= 1.5;
    dm -= Math.min(6, frout * 2);
    if ((sq.fat || 0) > 80) dm -= 0.6; if (sq.dry && ed < 30) dm -= 0.5;
    if (sq.routing) dm = ed > 40 ? 3.2 : -0.5;
    if (sq.lastStand || this.chaos) { sq.morale = sq.moraleMax; return; }
    if (!sq.routing && sq.def.ai === 'melee' && sq.count >= 6 && sq.aliveCount <= 3 && ecount >= 6 && ed < 12) { sq.lastStand = true; sq.morale = sq.moraleMax; this.events.push({ t: 'laststand', sq: sq.id, x: sq.cx, z: sq.cz }); return; }
    sq.morale = clamp(sq.morale + dm, 0, sq.moraleMax);
    if (!sq.routing && sq.morale < 12 && sq.aliveCount <= sq.count * 0.7) this.routSquad(sq);
    else if (sq.routing && sq.morale > 55) this.rallySquad(sq);
  }
  routSquad(sq) {
    if (this.noRout) return; // no routing in multiplayer or on the Path of a Soldier
    sq.routing = true; sq.routT = this.tick; sq.order = ORD_HOLD;
    for (let i = 0; i < sq.unitIds.length; i++) { const u = this.units[sq.unitIds[i]]; if (!u.dead) { u.blocking = false; u.aiming = false; u.target = -1; if (u.st !== ST_RELOAD) { u.st = ST_IDLE; u.stT = 0; } } }
    this.events.push({ t: 'rout', sq: sq.id });
  }
  rallySquad(sq) { sq.routing = false; sq.order = ORD_HOLD; sq.tx = sq.cx; sq.tz = sq.cz; this.events.push({ t: 'rallied', sq: sq.id }); }
  squadLoss(u, cause) {
    if (u.squad < 0) return; const sq = this.squads[u.squad];
    const base = 78 / sq.count; // men hold longer: losses shake a squad, they don't break it at once sq.morale -= base * (cause === 'explosion' || cause === 'trample' || cause === 'solid' ? 1.6 : cause === 'gatling' ? 1.3 : 1);
    if (sq.morale < 0) sq.morale = 0;
  }
  marchTo(squadIds, D, pl) { // no enemy in sight: the companies march in column, one behind another, to the post they were given
    let cx = 0, cz = 0, n = 0; const live = []; for (const id of squadIds) { const q = this.squads[id]; if (!q.alive || q.inactive) continue; cx += q.cx; cz += q.cz; n++; live.push(q); } if (!n) return; cx /= n; cz /= n;
    const far = len(D.x - cx, D.z - cz) > 4; const ang = far ? atan2(D.x - cx, D.z - cz) : live[0].facing; const fx = sin(ang), fz = cos(ang);
    live.sort((a, b) => ((b.cx - cx) * fx + (b.cz - cz) * fz) - ((a.cx - cx) * fx + (a.cz - cz) * fz));
    live.forEach((q, k) => { const tx = clamp(D.x - fx * k * 16, -HALF + 5, HALF - 5), tz = clamp(D.z - fz * k * 16, -HALF + 5, HALF - 5);
      if (len(q.cx - tx, q.cz - tz) > 3) { q.order = ORD_MOVE; q.tx = tx; q.tz = tz; q.facing = ang; } else { if (q.order !== ORD_HOLD) { q.tx = q.cx; q.tz = q.cz; } q.order = ORD_HOLD; q.facing = ang; } });
    const h = pl && pl.ai ? this.units[pl.heroId] : null; if (h && !h.dead) { h.slotX = clamp(D.x - fx * 8, -HALF + 5, HALF - 5); h.slotZ = clamp(D.z - fz * 8, -HALF + 5, HALF - 5); }
  }
  // one facing for a whole general's line at his post: toward the mass of the enemy there, kept steady (re-aimed at most
  // every few seconds and only for a real change), so the line's wings don't swap sides each time a different enemy
  // company happens to be nearest
  dirAng(pl, enemies, px, pz, e) {
    const k = pl.dAng; if (k && Math.abs(k.x - px) < 3 && Math.abs(k.z - pz) < 3 && this.tick - k.t < 150) return k.a;
    let sx = 0, sz = 0, w = 0; for (const q of enemies) { const d = len(q.cx - px, q.cz - pz); if (d > 80) continue; const ww = (q.aliveCount || 1) / (10 + d); sx += q.cx * ww; sz += q.cz * ww; w += ww; }
    let a = w > 0 ? atan2(sx / w - px, sz / w - pz) : atan2(e.cx - px, e.cz - pz);
    if (k && Math.abs(k.x - px) < 3 && Math.abs(k.z - pz) < 3 && Math.abs(wrap(a - k.a)) < 0.6) a = k.a;
    pl.dAng = { x: px, z: pz, a, t: this.tick }; return a;
  }
  generalThink(team, squadIds, pl) {
    const enemies = []; for (let i = 0; i < this.squads.length; i++) { const s = this.squads[i]; if (s.alive && s.team !== team && !s.routing && !s.inactive) enemies.push(s); }
    if (!enemies.length) { for (let i = 0; i < this.squads.length; i++) { const s = this.squads[i]; if (s.alive && s.team !== team && !s.inactive) enemies.push(s); } }
    if (!enemies.length) { if (pl && pl.directive && pl.directive.kind === DIR_HOLD) this.marchTo(squadIds, pl.directive, pl); return; }
    const bt = this.tick - this.battleTick;
    if (pl && pl.ai) { const h = this.units[pl.heroId]; if (h && !h.dead) { let sx = 0, sz = 0, n = 0; for (const id of squadIds) { const q = this.squads[id]; if (q.alive && !q.routing) { sx += q.cx; sz += q.cz; n++; } } if (n) { const back = team === 0 ? -1 : 1; h.slotX = sx / n; h.slotZ = sz / n + back * 12; } } if (false && !pl.navalUsed && pl.idx % 2 === 0 && this.tick - this.battleTick > 30 * 100) { const e = enemies[this.rng.int(enemies.length)]; pl.navalUsed = true; this.navals.push({ x: e.cx, z: e.cz, t: this.tick + 120, n: 6, team }); this.events.push({ t: 'navalcall', x: e.cx, z: e.cz, team, p: pl.idx }); } }
    if (!this.aiNaval) this.aiNaval = [false, false];
    if (false && !this.aiNaval[team] && bt > 30 * 75) { // AI generals no longer call naval barrages let best = null; for (const e of enemies) { if (best && e.aliveCount <= best.aliveCount) continue; let near = false; for (let j = 0; j < this.squads.length; j++) { const s = this.squads[j]; if (s.alive && s.team === team && len(s.cx - e.cx, s.cz - e.cz) < 30) near = true; } if (!near) best = e; }
      if (best) { this.aiNaval[team] = true; this.navals.push({ x: best.cx, z: best.cz, t: this.tick + 120, n: 6, team }); this.events.push({ t: 'navalcall', x: best.cx, z: best.cz, team, p: -1 }); } }
    // a general keeps one fresh melee squad back as a reserve and commits it when the line needs it
    let ax = 0, az = 0, an = 0, waver = false; const home = team === 0 ? -1 : 1;
    for (const id of squadIds) { const q = this.squads[id]; if (!q.alive) continue; ax += q.cx; az += q.cz; an++; if (q.routing || q.morale < q.moraleMax * 0.4) waver = true; }
    if (an) { ax /= an; az /= an; }
    if (!this.chaos && !this.heroMode && squadIds.length >= 4 && !this.reserveSet) this.reserveSet = {};
    if (this.reserveSet && this.reserveSet[team + ':' + squadIds[0]] === undefined && squadIds.length >= 4) { let best = -1, bc = 0; for (const id of squadIds) { const q = this.squads[id]; if (q.def.ai === 'melee' && !q.def.mounted && q.count > bc) { bc = q.count; best = id; } } this.reserveSet[team + ':' + squadIds[0]] = best; if (best >= 0) this.squads[best].reserve = true; }
    for (let i = 0; i < squadIds.length; i++) {
      const sq = this.squads[squadIds[i]]; if (!sq.alive || sq.routing) continue;
      let e = null, bd = 1e18;
      for (let j = 0; j < enemies.length; j++) { const dx = enemies[j].cx - sq.cx, dz = enemies[j].cz - sq.cz; const d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; e = enemies[j]; } }
      const dx = e.cx - sq.cx, dz = e.cz - sq.cz, d = len(dx, dz) || 1; const ang = atan2(dx, dz); const def = sq.def;
      const nx = dx / d, nz = dz / d;
      if (pl && pl.directive && pl.directive.kind !== DIR_ATTACK && !this.chaos) {
        const D = pl.directive; let px = D.x, pz = D.z;
        if (D.kind === DIR_SUPPORT) { const req = this.players[D.by]; const h = req ? this.units[req.heroId] : null; if (h && !h.dead) { px = h.x - sin(h.yaw) * 14; pz = h.z - cos(h.yaw) * 14; } }
        if (D.kind === DIR_FLANK && len(sq.cx - px, sq.cz - pz) < 22) { if (i === 0) pl.directive = { kind: DIR_ATTACK, x: 0, z: 0, by: D.by }; }
        else {
          const close = !pl.fleeing && d < (def.ai === 'ranged' ? 0 : def.mounted ? (pl.aggr ? pl.aggr + 15 : 45) : (pl.aggr || 32)) && D.kind !== DIR_FLANK && !this.navBlockedLine(sq.cx, sq.cz, e.cx, e.cz);
          if (close) { sq.order = ORD_CHARGE; sq.tx = e.cx; sq.tz = e.cz; sq.facing = ang; continue; }
          const eang = this.dirAng(pl, enemies, px, pz, e), rx = -cos(eang), rz = sin(eang), n = squadIds.length;
          const lat = (i - (n - 1) / 2) * (this.mode === 'assault' ? 7 : 20), back = def.ai === 'cannon' ? (pl.standoff ? -70 : -14) : def.mounted ? -8 : (pl.standoff && def.ai === 'ranged' ? -38 : 0);
          const tx = px + rx * lat + sin(eang) * back, tz = pz + rz * lat + cos(eang) * back;
          if (len(sq.cx - tx, sq.cz - tz) > 3) { sq.order = ORD_MOVE; sq.tx = clamp(tx, -HALF + 5, HALF - 5); sq.tz = clamp(tz, -HALF + 5, HALF - 5); sq.facing = eang; }
          else { if (sq.order !== ORD_HOLD) { sq.tx = sq.cx; sq.tz = sq.cz; } sq.order = ORD_HOLD; sq.facing = eang; }
          continue;
        }
      }
      // reserve: wait behind the line until a friend wavers, the enemy comes close, or the battle is well joined
      if (sq.reserve) { const release = waver || d < 38 || bt > 30 * 150; if (release) { sq.reserve = false; this.events.push({ t: 'reserve', sq: sq.id, team }); }
        else { sq.order = ORD_MOVE; sq.tx = clamp(ax, -HALF + 10, HALF - 10); sq.tz = clamp(az + home * 26, -HALF + 10, HALF - 10); sq.facing = ang; if (len(sq.cx - sq.tx, sq.cz - sq.tz) < 4) { sq.order = ORD_HOLD; sq.tx = sq.cx; sq.tz = sq.cz; } continue; } }
      // fall back and rest: a wavering or spent squad pulls out behind the line while the enemy is close
      if (!sq.def.fearless && !this.chaos && (sq.resting || ((sq.morale < sq.moraleMax * 0.38 || (sq.fat || 0) > 88) && d < 30 && sq.aliveCount > 2))) {
        if (!sq.resting) { sq.resting = true; this.events.push({ t: 'fallback', sq: sq.id, team }); }
        if (sq.morale > sq.moraleMax * 0.62 && (sq.fat || 0) < 45) sq.resting = false;
        else { sq.order = ORD_MOVE; sq.tx = clamp(sq.cx - nx * 30, -HALF + 8, HALF - 8); sq.tz = clamp(sq.cz - nz * 30, -HALF + 8, HALF - 8); if (d > 45) { sq.order = ORD_HOLD; sq.tx = sq.cx; sq.tz = sq.cz; } sq.facing = ang; continue; } }
      // focus fire: shooters pick the weakest or most dangerous squad in range
      if (def.ai === 'ranged' || def.ai === 'cannon') { const rr = (def.rifle ? def.rifle.range : def.bow ? def.bow.range : def.cannon ? def.cannon.range : def.gun ? def.gun.range : 60) * this.rangeMul; let fb = -1, fs = 1e18;
        for (const q of enemies) { const dq = len(q.cx - sq.cx, q.cz - sq.cz); if (dq > rr) continue; const threat = (q.order === ORD_CHARGE ? 0.55 : 1) * (q.def.mounted ? 0.7 : 1) * (q.def.cannon || q.def.gun ? 0.8 : 1); const sc = (q.aliveCount / q.count * 60 + q.morale * 0.4 + dq * 0.3) * threat; if (sc < fs) { fs = sc; fb = q.id; } }
        sq.focus = fb; }
      if (sq.abT <= 0) { const k = sq.ability; let go = false;
        if (k === 'aimed') go = d < (def.bow ? def.bow.range : def.rifle.range) * 0.8; else if (k === 'kiai') go = d < 28; else if (k === 'wedge') go = d < 45 && bt > 30 * 22; else if (k === 'canister') go = d < 42; else if (k === 'sweep') go = d < (def.gun ? def.gun.range * 0.8 : 0);
        else if (k === 'spearwall') { for (let j = 0; j < enemies.length; j++) if (enemies[j].def.mounted && len(enemies[j].cx - sq.cx, enemies[j].cz - sq.cz) < 35) go = true; }
        if (go) this.useAbility(sq, -1); }
      if (sq.abOn > 0 && sq.ability === 'spearwall') { sq.facing = ang; continue; }
      if (!def.mounted && def.ai !== 'ranged' && def.ai !== 'cannon' && d >= 75 && this.objectives.length) {
        let ob = null, od = 1e18; for (let j = 0; j < this.objectives.length; j++) { const o = this.objectives[j]; if (o.owner === team && o.ctrl * (team === 0 ? 1 : -1) >= 100) continue; const d2 = (o.x - sq.cx) * (o.x - sq.cx) + (o.z - sq.cz) * (o.z - sq.cz); if (d2 < od) { od = d2; ob = o; } }
        if (ob && od < d * d * 1.4) { sq.order = ORD_MOVE; sq.tx = ob.x; sq.tz = ob.z; sq.facing = atan2(ob.x - sq.cx, ob.z - sq.cz); continue; }
      }
      if (def.ai === 'ranged' && !sq.dry) {
        const want = (def.bow ? def.bow.range : def.rifle.range) * this.rangeMul * 0.62;
        if (d > want + 10) { sq.order = ORD_MOVE; sq.tx = e.cx - nx * want; sq.tz = e.cz - nz * want; sq.facing = ang; }
        else { if (sq.order !== ORD_HOLD) { sq.tx = sq.cx; sq.tz = sq.cz; } sq.order = ORD_HOLD; sq.facing = ang; }
      } else if (def.ai === 'cannon') {
        const rng = def.cannon ? def.cannon.range : def.gun.range;
        if (d > rng * 0.85) { sq.order = ORD_MOVE; sq.tx = e.cx - nx * rng * 0.7; sq.tz = e.cz - nz * rng * 0.7; sq.facing = ang; }
        else { if (sq.order !== ORD_HOLD) { sq.tx = sq.cx; sq.tz = sq.cz; } sq.order = ORD_HOLD; sq.facing = ang; }
      } else if (def.mounted) {
        if (bt < 30 * 22) { sq.order = ORD_HOLD; sq.facing = ang; }
        else {
          // cavalry prefers routing or ranged targets
          let raid = null; for (const w of this.wagons || []) { if (w.burnt || w.team === team) continue; const dw = len(w.x - sq.cx, w.z - sq.cz); if (dw > 150) continue; let guarded = false; for (const q of enemies) if (len(q.cx - w.x, q.cz - w.z) < 30) guarded = true; if (!guarded) { raid = w; break; } }
          if (raid && (sq.id % 3 === 0 || bt > 30 * 100)) { sq.order = ORD_MOVE; sq.tx = raid.x; sq.tz = raid.z; sq.facing = atan2(raid.x - sq.cx, raid.z - sq.cz); continue; }
          let tgt = e; for (let j = 0; j < this.squads.length; j++) { const s = this.squads[j]; if (s.alive && s.team !== team && (s.routing || s.def.ai === 'ranged') && len(s.cx - sq.cx, s.cz - sq.cz) < 110) { tgt = s; break; } }
          const dt2 = len(tgt.cx - sq.cx, tgt.cz - sq.cz), tf = tgt.facing, side = (sq.id % 2) ? 1 : -1;
          const fx2 = sin(tf), fz2 = cos(tf), rx2 = -cos(tf), rz2 = sin(tf);
          if (!sq.flanked && dt2 > 30 && !tgt.routing) { const wx = tgt.cx + rx2 * side * 42 - fx2 * 22, wz = tgt.cz + rz2 * side * 42 - fz2 * 22;
            if (len(sq.cx - wx, sq.cz - wz) > 12) { sq.order = ORD_MOVE; sq.tx = clamp(wx, -HALF + 8, HALF - 8); sq.tz = clamp(wz, -HALF + 8, HALF - 8); sq.facing = atan2(tgt.cx - sq.cx, tgt.cz - sq.cz); continue; } sq.flanked = true; this.events.push({ t: 'flank', sq: sq.id, team }); }
          if (dt2 > 90) sq.flanked = false;
          sq.order = ORD_CHARGE; sq.tx = tgt.cx; sq.tz = tgt.cz; sq.facing = atan2(tgt.cx - sq.cx, tgt.cz - sq.cz);
        }
      } else {
        if (d < 75) { sq.order = ORD_CHARGE; sq.tx = e.cx; sq.tz = e.cz; sq.facing = ang; }
        else { sq.order = ORD_MOVE; sq.tx = e.cx - nx * 52; sq.tz = e.cz - nz * 52; sq.facing = ang; }
      }
    }
  }
  // ---------- unit update ----------
  updateUnit(u) {
    if (u.posT > 0) u.posT -= DT; else if (u.pos > 0) { const slow = u.hp < u.def.hp * 0.4 || (u.fat || 0) > 60; u.pos = Math.max(0, u.pos - DT * (slow ? 9 : 26) * (u.blocking ? 1.5 : 1)); }
    if (u.openT > 0) u.openT -= DT; if (u.entT > 0) { u.entT -= DT; u.mx *= 0.35; u.mz *= 0.35; if (u.st === ST_WINDUP && !u.champ) { u.st = ST_IDLE; u.stT = 0; } }
    if (!u.champ && u.type !== 'horse' && u.def.ai !== 'cannon') { // fatigue: running and fighting tire men out; standing still restores them
      const sp = u.speedNow || 0, fight = u.st === ST_WINDUP || u.st === ST_RELEASE;
      u.fat = clamp((u.fat || 0) + DT * (fight ? 4 : (u.sprint && !u.mounted && !u.airborne) ? 0 : -7), 0, 100); } // only fighting and sprinting tire a man; walking and running let him recover
    if (u.champ) this.champUpdate(u);
    if (u.cryT > 0) u.cryT -= DT;
    if (u.burnT > 0) { u.burnT -= DT; if (this.tick % 10 === 0) this.applyDamage(u, 5, -1, 0, 0, 0, 'fire'); }
    if (u.frenzyT > 0) { u.frenzyT -= DT; u.hp = Math.min(u.def.hp, u.hp + 4 * DT); }
    if (u.throwT > 0) u.throwT -= DT;
    if (u.flinchT > 0) u.flinchT -= DT;
    if (u.counterT > 0) u.counterT -= DT;
    if (u.hitT > 0) u.hitT -= DT;
    if (u.hrA !== undefined) this.hrTick(u);
    if (!u.champ && (u.dodgeT > 0 || u.dodgeCd > 0 || u.iframe > 0)) { if (u.dodgeCd > 0) u.dodgeCd -= DT; if (u.iframe > 0) u.iframe -= DT; if (u.dodgeT > 0) u.dodgeT -= DT; }
    // no knockdowns: every blow that used to floor a man now just staggers him for a moment
    if (u.downT > 0 && u.type !== 'horse') { const k = u.downT; u.downT = 0; if (!u.dead && u.st !== ST_RELOAD) { u.st = ST_STUN; u.stT = 0; u.stunDur = Math.min(0.55, 0.25 + k * 0.15); u.blocking = false; u.aiming = false; } u.mx *= 0.3; u.mz *= 0.3; }
    if (u.downT > 0) { u.downT -= DT; u.blocking = false; u.aiming = false; if (u.st !== ST_RELOAD) { u.st = ST_IDLE; u.stT = 0; } u.mx = 0; u.mz = 0; if (u.mounted || u.type === 'horse') u.hspeed *= 0.8; }
    if (!u.ctrlActive) this.unitAI(u);
    if (!u.ctrlActive && u.mount < 0 && !u.mounted && u.type !== 'horse' && !u.airborne && u.def.ai !== 'cannon') this.steerAround(u);
    this.updateCombatState(u);
    this.integrate(u);
  }
  turnTo(u, want, step) { const d = wrap(want - u.yaw); if (d > step) u.yaw = wrap(u.yaw + step); else if (d < -step) u.yaw = wrap(u.yaw - step); else u.yaw = want; }
  // ---------- navigation: a coarse grid of walls, buildings and deep water, with cached flow fields ----------
  buildNav() {
    const C = 2, W = Math.ceil((HALF * 2) / C); this.navC = C; this.navW = W; const bl = new Uint8Array(W * W); this.navBlk = bl;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const x = -HALF + (i + 0.5) * C, z = -HALF + (j + 0.5) * C; if (waterAt(x, z) === 1) bl[j * W + i] = 1; }
    this.navBoxes(); this.flows = new Map(); this.flowOrder = []; this.navStamp = 0;
  }
  navBoxes() {
    const C = this.navC, W = this.navW, bl = this.navBlk;
    for (let k = 0; k < bl.length; k++) bl[k] &= 1; // keep water, clear structures
    for (const b of this.boxes) { if (b.hw < 0.1 || b.pass || b.kind === 'mantlet') continue; const m = 0.55;
      const i0 = Math.max(0, Math.floor((b.x - b.hw - m + HALF) / C)), i1 = Math.min(W - 1, Math.floor((b.x + b.hw + m + HALF) / C));
      const j0 = Math.max(0, Math.floor((b.z - b.hd - m + HALF) / C)), j1 = Math.min(W - 1, Math.floor((b.z + b.hd + m + HALF) / C));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) bl[j * W + i] |= 2; }
    if (this.sg) this.siegeNav(bl);
    if (this.ladders) for (const L of this.ladders) if (L.up) { for (let z = L.z - L.hd - 1.5; z <= L.z + L.hd + 1.5; z += 1) for (const dx of [-0.8, 0.8]) bl[this.navCell(L.x + dx, z)] &= 1; }
    if (this.flows) { this.flows.clear(); this.flowOrder.length = 0; }
  }
  navCell(x, z) { const C = this.navC, W = this.navW; let i = Math.floor((x + HALF) / C), j = Math.floor((z + HALF) / C); if (i < 0) i = 0; if (j < 0) j = 0; if (i >= W) i = W - 1; if (j >= W) j = W - 1; return j * W + i; }
  navBlockedLine(x0, z0, x1, z1) {
    const d = len(x1 - x0, z1 - z0), n = Math.ceil(d / 1.4); const bl = this.navBlk;
    for (let k = 1; k < n; k++) { const t = k / n; if (bl[this.navCell(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)]) return true; }
    return false;
  }
  flowTo(gx, gz) {
    let g = this.navCell(gx, gz); const W = this.navW, bl = this.navBlk;
    if (bl[g]) { // goal inside a wall: use the nearest open cell
      let best = -1; for (let r = 1; r < 6 && best < 0; r++) for (let dj = -r; dj <= r && best < 0; dj++) for (let di = -r; di <= r; di++) { const gi = (g % W) + di, gj = ((g / W) | 0) + dj; if (gi < 0 || gj < 0 || gi >= W || gj >= W) continue; const c = gj * W + gi; if (!bl[c]) { best = c; break; } } if (best < 0) return null; g = best; }
    let f = this.flows.get(g); if (f) return f;
    if (this.flowBudget <= 0) return null; this.flowBudget--;
    f = new Int32Array(W * W).fill(-1); const q = new Int32Array(W * W); let qh = 0, qt = 0; f[g] = 0; q[qt++] = g;
    while (qh < qt) { const c = q[qh++], ci = c % W, cj = (c / W) | 0, dv = f[c] + 1;
      if (ci > 0 && f[c - 1] < 0 && !bl[c - 1]) { f[c - 1] = dv; q[qt++] = c - 1; } if (ci < W - 1 && f[c + 1] < 0 && !bl[c + 1]) { f[c + 1] = dv; q[qt++] = c + 1; }
      if (cj > 0 && f[c - W] < 0 && !bl[c - W]) { f[c - W] = dv; q[qt++] = c - W; } if (cj < W - 1 && f[c + W] < 0 && !bl[c + W]) { f[c + W] = dv; q[qt++] = c + W; } }
    this.flows.set(g, f); this.flowOrder.push(g); if (this.flowOrder.length > 48) this.flows.delete(this.flowOrder.shift());
    return f;
  }
  // where to walk to reach (gx, gz): straight there if nothing is in the way, otherwise the next cell downhill on the flow field
  navPoint(u, gx, gz) {
    if (!this.navBlk) return null;
    if ((u.navT = (u.navT || 0) - 1) > 0 && u.navGx === gx && u.navGz === gz) return u.navWp;
    u.navT = 8; u.navGx = gx; u.navGz = gz; u.navWp = null;
    if (len(gx - u.x, gz - u.z) < 2 || !this.navBlockedLine(u.x, u.z, gx, gz)) return null;
    const f = this.flowTo(gx, gz); if (!f) return null; const W = this.navW, C = this.navC; let c = this.navCell(u.x, u.z);
    if (f[c] < 0) { // standing in a blocked cell: step to any reachable neighbour
      let best = -1, bd = 1e9; for (const o of [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1]) { const n = c + o; if (n >= 0 && n < f.length && f[n] >= 0 && f[n] < bd) { bd = f[n]; best = n; } } if (best < 0) return null; c = best; }
    // walk down the field a few cells and aim at the farthest one we can see directly
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]], bl = this.navBlk; let cur = c, aim = c;
    for (let step = 0; step < 6; step++) { const ci = cur % W, cj = (cur / W) | 0; let best = cur, bd = f[cur];
      for (let k = 0; k < 8; k++) { const ni = ci + NB[k][0], nj = cj + NB[k][1]; if (ni < 0 || nj < 0 || ni >= W || nj >= W) continue; const n = nj * W + ni; if (f[n] < 0 || f[n] >= bd) continue; if (k >= 4 && (bl[cj * W + ni] || bl[nj * W + ci])) continue; bd = f[n]; best = n; }
      if (best === cur) break; cur = best;
      if (step === 0 || !this.navBlockedLine(u.x, u.z, -HALF + ((cur % W) + 0.5) * C, -HALF + (((cur / W) | 0) + 0.5) * C)) aim = cur; else break; }
    cur = aim;
    u.navWp = [-HALF + ((cur % W) + 0.5) * C, -HALF + (((cur / W) | 0) + 0.5) * C]; return u.navWp;
  }
  steerFoot(u, gx, gz, speed) {
    { const wp = this.navPoint(u, gx, gz); if (wp) { gx = wp[0]; gz = wp[1]; } }
    const dx = gx - u.x, dz = gz - u.z, d = len(dx, dz);
    if (d < 0.01) { u.mx = 0; u.mz = 0; return u.yaw; }
    const sp = Math.min(speed * this.zoneSpeed(u.x, u.z, dx, dz), d * 3); u.mx = dx / d * sp; u.mz = dz / d * sp; return atan2(dx, dz);
  }
  cavSteer(u, gx, gz, desired, keep) { // keep: hold the pace through a turn (a wheel at the gallop) instead of reining in
    desired *= this.fatMul(u);
    { const wp = this.navPoint(u, gx, gz); if (wp) { gx = wp[0]; gz = wp[1]; } }
    const dx = gx - u.x, dz = gz - u.z, d = len(dx, dz);
    const ang = d > 0.01 ? atan2(dx, dz) : u.hyaw;
    const diff = wrap(ang - u.hyaw); const rate = (2.6 - 1.7 * Math.abs(u.hspeed) / 9) * DT;
    if (diff > rate) u.hyaw = wrap(u.hyaw + rate); else if (diff < -rate) u.hyaw = wrap(u.hyaw - rate); else u.hyaw = ang;
    if (Math.abs(diff) > 1.2) desired = Math.min(desired, keep ? 6.5 : 2.5);
    desired *= this.zoneSpeed(u.x, u.z, dx, dz);
    if (u.hspeed < desired) u.hspeed = Math.min(desired, u.hspeed + 6 * DT); else u.hspeed = Math.max(desired, u.hspeed - 8 * DT);
    u.mx = sin(u.hyaw) * u.hspeed; u.mz = cos(u.hyaw) * u.hspeed;
    return ang;
  }
  // A charge is a pass, not a halt: the horseman runs up at full gallop, rides through the enemy line (the men in his path
  // are knocked aside in trample), carries on 26-40 m beyond, wheels about and comes again. If he is stopped in the press
  // (a braced spear, a snare, too many men) he backs out of it rather than standing in the melee to be cut down.
  cavCharge(u, tgt, d) {
    const def = u.def; u.cvT = (u.cvT || 0) + DT; let st = u.cv | 0;
    if (st !== 3 && Math.abs(u.hspeed) < 1.6 && d < 3.6) { u.cvStuck = (u.cvStuck || 0) + DT;
      if (u.cvStuck > 0.7) { const ax = u.x - tgt.x, az = u.z - tgt.z, al = len(ax, az) || 1, sd = (u.id & 1) ? 1 : -1;
        u.cvX = clamp(u.x + (ax / al) * 14 + (az / al) * sd * 6, -HALF + 4, HALF - 4); u.cvZ = clamp(u.z + (az / al) * 14 - (ax / al) * sd * 6, -HALF + 4, HALF - 4); u.cv = st = 3; u.cvT = 0; u.cvStuck = 0; } }
    else u.cvStuck = 0;
    if (st === 0) { // run-up: full gallop straight at him; inside 8 m, fix a point well beyond and ride for it
      if (d < 8) { const fx = (tgt.x - u.x) / (d || 1), fz = (tgt.z - u.z) / (d || 1), far = 26 + this.rng.next() * 14;
        u.cvX = clamp(tgt.x + fx * far, -HALF + 4, HALF - 4); u.cvZ = clamp(tgt.z + fz * far, -HALF + 4, HALF - 4); u.cv = 1; u.cvT = 0; this.cavSteer(u, u.cvX, u.cvZ, def.speed); return; }
      this.cavSteer(u, tgt.x, tgt.z, def.speed); return; }
    if (st === 1) { this.cavSteer(u, u.cvX, u.cvZ, def.speed); if (len(u.cvX - u.x, u.cvZ - u.z) < 6 || u.cvT > 7) { u.cv = 2; u.cvT = 0; } return; }
    if (st === 3) { this.cavSteer(u, u.cvX, u.cvZ, 6, true); if (len(u.cvX - u.x, u.cvZ - u.z) < 4 || u.cvT > 2.6) { u.cv = 2; u.cvT = 0; } return; }
    // wheel: come round at a canter; charge again once facing him with room for a run-up (or give room first)
    const off = Math.abs(wrap(atan2(tgt.x - u.x, tgt.z - u.z) - u.hyaw));
    if (d < 13 && off < 1.0) { const ax = u.x - tgt.x, az = u.z - tgt.z, al = len(ax, az) || 1; u.cvX = clamp(u.x + (ax / al) * 12, -HALF + 4, HALF - 4); u.cvZ = clamp(u.z + (az / al) * 12, -HALF + 4, HALF - 4); u.cv = 3; u.cvT = 0; return; }
    this.cavSteer(u, tgt.x, tgt.z, off < 0.6 ? def.speed : 6.5, true);
    if ((off < 0.5 && d >= 13) || u.cvT > 5) { u.cv = 0; u.cvT = 0; }
  }
  gunRange(def, w, u) { const g = gunOf(def, w); return g ? g.range * this.rangeMul * (u ? 1 + clamp(u.y * 0.02, 0, 0.3) : 1) : 0; }
  findTarget(u, sq) {
    if (this.phase === 0) return -1;
    const order = sq ? sq.order : ORD_HOLD, def = u.def;
    const ranged = isGun(def, u.weapon) && !this.dry(u); const gr = ranged ? this.gunRange(def, u.weapon, u) : 0;
    let range;
    if (u.ctrl >= 0) range = 14;
    else if (order === ORD_CHARGE) range = 170;
    else if (order === ORD_MOVE) range = ranged ? 14 : 6;
    else if (order === ORD_FOLLOW) range = ranged ? gr : 12;
    else range = ranged ? gr : 16;
    if (u.mounted && order !== ORD_MOVE && u.ctrl < 0) range = Math.max(range, 45);
    if (u.duelWith >= 0 && u.duelWith !== undefined) { const o = this.units[u.duelWith]; if (o && !o.dead) return o.id; }
    const enemies = this.teamAlive[1 - u.team]; let best = -1, bd = range * range;
    const eng = (!ranged && !u.mounted) ? this.engaged() : null; // men already swarming a foe make him a worse pick: spread out along the enemy line
    for (let i = 0; i < enemies.length; i++) { const v = enemies[i]; if (v.inactive || (v.duelWith >= 0 && v.duelWith !== undefined)) continue; const dx = v.x - u.x, dz = v.z - u.z; let d2 = dx * dx + dz * dz;
      if (eng) { const n = eng[v.id] - (u.target === v.id ? 1 : 0); if (n >= 3) d2 *= 5; else if (n === 2) d2 *= 2.2; else if (n === 1) d2 *= 1.25; }
      if (this.xc && eng && this.spN && u.spaceOf !== v.id && (this.spN[v.id] || 0) >= this.xcLim(v)) d2 *= 4; // every space round him is taken: look along the line for a free one
      if (this.xc && ranged && v.ctrl >= 0 && !this.players[v.ctrl].ai) { const sh = this.aimedAt(v.id) - (u.target === v.id ? 1 : 0); if (sh >= 3) d2 *= 8; } if ((v.downed || v.noncomb) && this.story) continue; if (v.wounded) d2 *= v.downed ? 40 : 6; if (this.story && v.zfile && ranged) { const sh = this.aimedAt(v.id) - (u.target === v.id ? 1 : 0); if (sh >= 2) d2 *= 4; else if (sh === 1) d2 *= 1.8; } if (v.squad >= 0 && this.squads[v.squad].routing && !u.mounted) d2 *= 1.6; if (sq && sq.focus >= 0 && v.squad === sq.focus && ranged) d2 *= 0.45; if (d2 < bd) { bd = d2; best = v.id; } }
    return best;
  }
  aimedAt(id) { if (this.aimTick !== this.tick) { this.aimTick = this.tick; if (!this.aimN || this.aimN.length < this.units.length) this.aimN = new Int16Array(this.units.length + 64); else this.aimN.fill(0); for (const v of this.units) if (!v.dead && v.target >= 0 && isGun(v.def, v.weapon)) this.aimN[v.target]++; } return this.aimN[id]; }
  engaged() { // how many melee men are on each enemy right now (recomputed once a tick)
    if (this.engTick === this.tick) return this.engN; this.engTick = this.tick;
    if (!this.engN || this.engN.length < this.units.length) this.engN = new Int16Array(this.units.length + 64); else this.engN.fill(0);
    for (const u of this.units) { if (u.dead || u.target < 0 || u.mounted || u.type === 'horse') continue; const v = this.units[u.target]; if (v && !v.dead && Math.abs(v.x - u.x) + Math.abs(v.z - u.z) < 4.5) this.engN[v.id]++; }
    return this.engN;
  }
  aiPickDir(u) {
    const w = u.weapon, r = this.rng.next();
    if (this.xc && w !== 'yari' && w !== 'rifle' && w !== 'bow' && w !== 'revolver') { const n = this.gatherNear(u.x, u.z, 2.2); for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team !== u.team || v.type === 'horse') continue; const rel = Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)); if (rel > 0.35 && rel < 1.4 && len(v.x - u.x, v.z - u.z) < 1.9) return r < 0.55 ? DIR_DOWN : DIR_UP; } }
    if (w === 'yari') return r < 0.6 ? DIR_DOWN : DIR_UP;
    if (w === 'rifle' || w === 'bow' || w === 'revolver') return DIR_DOWN;
    if (u.def.overhead) return r < u.def.overhead ? DIR_UP : (r < 0.85 ? DIR_RIGHT : DIR_LEFT);
    return r < 0.3 ? DIR_UP : r < 0.55 ? DIR_RIGHT : r < 0.8 ? DIR_LEFT : DIR_DOWN;
  }
  aiBlock(u, a) {
    if ((u.st !== ST_IDLE && u.st !== ST_RECOVER) || u.flinchT > 0 || u.blocking || u.blockPend >= 0 || a.st !== ST_WINDUP || u.weapon === 'cannon' || u.weapon === 'gatling' || u.weapon === '') return;
    const dx = u.x - a.x, dz = u.z - a.z, d = len(dx, dz);
    if (d > a.def.reach + 1.4) return;
    if (Math.abs(wrap(atan2(dx, dz) - a.yaw)) > 0.9) return;
    const key = a.id * 100000 + a.windupId; if (u.reactKey === key) return; u.reactKey = key;
    if (u.entT > 0) return;
    // a man who is being hammered by a masher reads him: the more the swings come in a rush, the surer the guard
    const mash = this.xc && a.ctrl >= 0 ? Math.min(0.35, Math.max(0, (a.spamR || 0) - (this.tick - (a.spamTk || 0)) / 45 - 1.5) * 0.1) : 0;
    if (this.rng.next() < u.def.block + mash + (u.squad >= 0 ? (this.squads[u.squad].stars || 0) * 0.05 : 0)) {
      u.blockPend = 0.1 + this.rng.next() * 0.2;
      u.blockPendDir = this.rng.next() < 0.78 ? counterDir(a.atkDir) : this.rng.int(4);
    }
  }
  fleeAI(u, sq) {
    // run from the nearest enemy, else toward the home edge; leave the field at the map edge
    const enemies = this.teamAlive[1 - u.team]; let ex = 0, ez = 0, bd = 80 * 80, found = false;
    for (let i = 0; i < enemies.length; i++) { const v = enemies[i]; const dx = v.x - u.x, dz = v.z - u.z; const d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; ex = v.x; ez = v.z; found = true; } }
    let dx, dz;
    if (found) { dx = u.x - ex; dz = u.z - ez; } else { dx = 0; dz = u.team === 0 ? -1 : 1; }
    const l = len(dx, dz) || 1; dx /= l; dz /= l;
    const homeZ = this.homeZ ? (this.homeZ[u.team] > u.z ? 1 : -1) : (u.team === 0 ? -1 : 1); dz = dz * 0.6 + homeZ * 0.6; dx *= 0.6; const l2 = len(dx, dz) || 1; dx /= l2; dz /= l2;
    const sp = u.def.speed * 1.12 * this.zoneSpeed(u.x, u.z, dx, dz);
    if (u.mounted) this.cavSteer(u, u.x + dx * 20, u.z + dz * 20, u.def.speed); else { u.mx = dx * sp; u.mz = dz * sp; }
    u.target = -1; u.blocking = false; u.aiming = false;
    if (u.st === ST_AIM || u.st === ST_WINDUP) { u.st = ST_IDLE; u.stT = 0; }
    this.turnTo(u, atan2(dx, dz), 9 * DT);
    if (Math.abs(u.z) > HALF - 8 || Math.abs(u.x) > HALF - 8) this.flee(u);
  }
  flee(u) {
    u.dead = true; u.hp = 0; u.deathTick = this.tick; u.mx = 0; u.mz = 0;
    if (u.mount >= 0) { const h = this.units[u.mount]; h.rider = -1; u.mount = -1; }
    this.events.push({ t: 'death', id: u.id, ix: 0, iy: 0, iz: 0, cause: 'fled', killer: -1 });
  }
  unitAI(u) {
    const def = u.def, sq = u.squad >= 0 ? this.squads[u.squad] : null;
    u.atkHeld = false; u.blockHeld = false;
    if (u.camp) { this.campThink(u); return; } // a man at the fire: his own small life (campThink)
    if (u.orderly) { this.orderlyAI(u); return; }
    if (u.wounded) { this.woundedAI(u); return; }
    if (this.story && u.team === this.mission.side && u.ctrl < 0 && !u.mounted && def.ai !== 'cannon' && this.aiMedic(u)) return;
    if (u.restT > this.tick && u.hp < u.def.hp * 0.6) u.hp += u.def.hp * 0.012 * DT * 30 / 30; // catching his breath in the second rank
    if (u.type === 'horse') { this.horseIdle(u); return; }
    if (def.ai === 'cannon') { this.cannonAI(u, sq); return; }
    if (u.downT > 0 || u.airborne) { if (!u.mounted) { u.mx = 0; u.mz = 0; } return; }
    if (sq && sq.routing) { this.fleeAI(u, sq); return; }
    if (--u.retT <= 0) { u.retT = 10 + (u.id % 8); const nt = this.findTarget(u, sq);
      if (nt >= 0 && nt !== u.target) { const v = this.units[nt]; const off = Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)); if (off > 1.6) u.reactT = 0.4 + this.rng.next() * 0.45; else if (off > 0.8) u.reactT = 0.15; }
      u.target = nt; }
    if (u.reactT > 0) { u.reactT -= DT; if (u.st === ST_AIM) { u.st = ST_IDLE; u.stT = 0; } u.mx *= 0.3; u.mz *= 0.3; return; }
    let tgt = u.target >= 0 ? this.units[u.target] : null;
    if (tgt && (tgt.dead || tgt.type === 'horse')) { tgt = null; u.target = -1; }
    const isHero = u.ctrl >= 0, order = sq ? sq.order : ORD_HOLD;
    let wantYaw = u.yaw;
    if ((isHero || def.sidearm) && def.weapons.length > 1 && u.st === ST_IDLE && u.mount < 0) {
      const d = tgt ? len(tgt.x - u.x, tgt.z - u.z) : 99;
      // a musketeer (紀效新書: every 鳥銃手 also carries a 腰刀) draws his sabre only when the enemy is on top of him
      const want = def.sidearm && !isHero ? (u.weapon === 'katana' ? (d > 8 ? 'rifle' : 'katana') : (d < 3.2 ? 'katana' : 'rifle')) : (tgt && d > 6 && u.ammo > 0) ? 'rifle' : 'katana';
      if (u.weapon !== want) { u.st = ST_SWAP; u.stT = 0; u.nextWeapon = want; u.blocking = false; }
    }
    const ranged = isGun(def, u.weapon) && !this.dry(u);
    if (tgt) {
      const dx = tgt.x - u.x, dz = tgt.z - u.z, d = len(dx, dz), ang = atan2(dx, dz);
      const reach = def.reach + (u.mounted ? 0.3 : 0);
      if (ranged && d > 5.5) {
        wantYaw = ang;
        const range = this.gunRange(def, u.weapon, u);
        if (d <= range && (sq ? sq.fire : true)) {
          let inPlace = true; if (!def.skirmish) { if (u.mounted) this.cavSteer(u, u.x, u.z, 0); else { const sdx = u.slotX - u.x, sdz = u.slotZ - u.z, sd = len(sdx, sdz); if (sq && order !== ORD_CHARGE && sd > 1.3 && u.st === ST_IDLE) { this.steerFoot(u, u.slotX, u.slotZ, def.speed * 0.8); inPlace = false; } else { u.mx = 0; u.mz = 0; } } }
          else { const sdx = u.slotX - u.x, sdz = u.slotZ - u.z; if (len(sdx, sdz) > 0.6) this.steerFoot(u, u.slotX, u.slotZ, def.speed * 0.7); else { u.mx = 0; u.mz = 0; } }
          if (!u.mounted && (u.mx !== 0 || u.mz !== 0)) { const my = atan2(u.mx, u.mz), off = Math.abs(wrap(my - ang)), turner = (u.id * 37) % 10 < 7; if (off > 1.9 && len(u.slotX - u.x, u.slotZ - u.z) > (turner ? 1.2 : 4)) wantYaw = my; else if (off > 1.6) { u.mx *= 0.5; u.mz *= 0.5; } } // a long way back to his place: turn and walk it, don't skate backward; a step or two back is a slow backpedal
          if (inPlace && u.st === ST_IDLE && u.ammo > 0 && u.flinchT <= 0 && Math.abs(wrap(ang - u.yaw)) < 0.7) {
            u.st = ST_AIM; u.stT = 0; u.aimTarget = tgt.id; u.blocking = false;
            const g0 = gunOf(def, u.weapon); const aimT = Math.round((g0 ? g0.aim : 0.8) * 30);
            const extra = sq && sq.abOn > 0 && sq.ability === 'aimed' ? 15 : 0;
            if (sq && !def.skirmish) { if (!(sq.volleyAt > this.tick)) { sq.volleyAt = this.tick + aimT + 10 + extra; } const r = this.rng.next(); u.volleyOf = sq.volleyAt; u.fireAt = sq.volleyAt + Math.floor(r * r * 24) + (this.rng.next() < 0.12 ? 12 + this.rng.int(30) : 0); } // a ragged crackle down the line, with the odd slow match hanging fire
            else u.fireAt = this.tick + aimT;
          }
          else if (u.st === ST_IDLE && u.ammo <= 0) this.aiReload(u);
        } else if (order === ORD_CHARGE && u.st !== ST_AIM) { wantYaw = this.steerFoot(u, tgt.x, tgt.z, def.speed); }
        else { wantYaw = this.goSlot(u, sq, ang); }
      } else {
        wantYaw = ang;
        if (false && u.bombs > 0 && !(u.throwT > 0) && d > 9 && d < 24 && u.st === ST_IDLE && u.flinchT <= 0 && this.rng.next() < 0.08) { this.aiThrow(u, tgt); }
        const xfr = this.xc && sq && sq.front && order === ORD_CHARGE && !isHero && !u.mounted; // in contact the line keeps its frontage
        const leash = (!sq || isHero || (order === ORD_CHARGE && !xfr) || u.mounted) ? 1e9 : order === ORD_FOLLOW ? 6 : xfr ? 3 : 4.5;
        const tsd = leash < 1e9 ? len(tgt.x - u.slotX, tgt.z - u.slotZ) : 0;
        const yy = !isHero && !u.mounted && u.role && sq && !sq.routing && sq.def.yuanyang && this.yyAI(u, sq, tgt, d, reach);
        const xl = (!yy && this.xc && !isHero && !u.mounted && !u.champ && u.ctrl < 0 && tsd <= leash + reach) ? this.xcLine(u, sq, tgt, d, reach) : 0; // 1: waiting or breathing, 2: spear keeping his distance
        if (yy) { }
        else if (tsd > leash + reach) { this.goSlot(u, sq, ang); if (u.spaceOf >= 0) u.spaceOf = -1; } // hold the formation: step out only for a foe who comes to the line, rear ranks wait their turn
        else if (xl) { }
        else if (u.mounted) {
          if (u.ctrl < 0) this.cavCharge(u, tgt, d); // shock cavalry: run up, ride through, wheel, come again
          else { const desired = d > 9 ? def.speed : (d > reach ? 4 : 2.5); this.cavSteer(u, tgt.x, tgt.z, desired); }
        } else if (d > reach - 0.5) { const sp = def.speed * (u.st === ST_IDLE ? 1 : 0.6); this.steerFoot(u, tgt.x, tgt.z, sp); }
        else { u.mx = 0; u.mz = 0; }
        if (u.role && sq && !sq.routing && !xl && !yy) { const sd = len(u.slotX - u.x, u.slotZ - u.z); if (sd > 2.2 && d > reach) this.steerFoot(u, u.slotX, u.slotZ, def.speed); else if (d > reach && sd < 2.2) { u.mx *= 0.3; u.mz *= 0.3; } }
        const eager = u.mounted ? 0.35 : u.role === 'spear' && tgt.entT > 0 ? 0.35 : u.role === 'brush' ? 0.2 : u.role === 'shield' ? 0.05 : 0.09;
        if (d <= (u.mounted ? reach + Math.abs(u.hspeed) * 0.4 : reach + 0.3) && Math.abs(tgt.y - u.y) < 2.5 && u.st === ST_IDLE && u.flinchT <= 0 && !u.blocking && u.entT <= 0 && xl !== 1 && !yy && this.rng.next() < eager && this.xcSpaceOk(u, tgt)) { if (this.xcToken(u, tgt)) this.startWindup(u, this.aiPickDir(u)); }
        if (this.xc && u.circleT > 0 && !u.mounted && u.st === ST_IDLE && !xl && !yy) { u.circleT -= DT; const sd = (u.id & 1) ? 1 : -1, nx = dx / (d || 1), nz = dz / (d || 1), keep = reach + 1.1; const rad = (d - keep) * 1.6; u.mx = nx * rad + nz * sd * 1.4; u.mz = nz * rad - nx * sd * 1.4; if (!u.blocking && this.rng.next() < 0.02) { u.blocking = true; u.blockT = 0; u.blockDir = DIR_UP; u.blockHold = 0.5; } }
        this.aiBlock(u, tgt);
      }
    } else {
      if (u.mounted) u.cv = 0;
      wantYaw = this.goSlot(u, sq, u.yaw);
      if (ranged && u.st === ST_IDLE && u.ammo < (gunOf(def, u.weapon).mag || 1) && u.flinchT <= 0) this.aiReload(u);
    }
    if (u.lastAttacker >= 0 && u.lastAttacker !== u.target) { const a = this.units[u.lastAttacker]; if (a && !a.dead) this.aiBlock(u, a); }
    if (u.blocking) { u.blockHold -= DT; if (u.blockHold <= 0) u.blocking = false; }
    if (u.blockPend >= 0) { u.blockPend -= DT; if (u.blockPend <= 0) { u.blockPend = -1; if ((u.st === ST_IDLE || u.st === ST_RECOVER) && u.flinchT <= 0) { u.st = ST_IDLE; u.stT = 0; u.blocking = true; u.blockT = 0; u.blockDir = u.blockPendDir; u.blockHold = 0.75; } } }
    if (!u.mounted) {
      const sm = (u.st === ST_WINDUP || u.st === ST_RELEASE) ? 0.45 : (u.st === ST_AIM && !def.skirmish) || u.st === ST_STUN ? 0 : (u.st === ST_RELOAD) ? 0.6 : 1;
      u.mx *= sm; u.mz *= sm;
    }
    this.turnTo(u, wantYaw, (u.st === ST_AIM ? 2.4 : u.st === ST_WINDUP || u.st === ST_RELEASE ? 3.5 : 6) * DT);
  }
  aiReload(u) {
    const g = gunOf(u.def, u.weapon); if (!g) return;
    const mag = g.mag || 1;
    const jit = 0.85 + this.rng.next() * 0.4; // some men are quicker with powder and rammer than others
    if (u.ammo <= 0) this.startReload(u, (g.magReload || g.reload) * jit, true); else if (u.ammo < mag) this.startReload(u, (g.magReload || g.reload) * jit, true);
  }
  goSlot(u, sq, fallbackYaw) {
    if (!sq && u.ctrl >= 0 && this.players[u.ctrl].ai && !u.mounted && u.mount < 0) { const d = len(u.slotX - u.x, u.slotZ - u.z); if (d > 2) return this.steerFoot(u, u.slotX, u.slotZ, u.def.speed * (d > 10 ? 1 : 0.6)); u.mx = 0; u.mz = 0; return fallbackYaw; }
    if (!sq) { if (u.mounted) this.cavSteer(u, u.x, u.z, 0); else { u.mx = 0; u.mz = 0; } return fallbackYaw; }
    const dx = u.slotX - u.x, dz = u.slotZ - u.z, d = len(dx, dz);
    if (u.mounted) {
      if (d > 1.5) { this.cavSteer(u, u.slotX, u.slotZ, Math.min(u.def.speed, d * 1.2)); return u.hyaw; }
      this.cavSteer(u, u.x, u.z, 0); u.hyaw = sq.facing; return sq.facing;
    }
    if (d > 0.45) return this.steerFoot(u, u.slotX, u.slotZ, u.def.speed);
    u.mx = 0; u.mz = 0; return sq.facing;
  }
  horseIdle(u) {
    if (u.rider >= 0 && this.units[u.rider].ctrlActive) return;
    u.hspeed = u.hspeed > 0 ? Math.max(0, u.hspeed - 3 * DT) : Math.min(0, u.hspeed + 3 * DT);
    u.mx = sin(u.yaw) * u.hspeed; u.mz = cos(u.yaw) * u.hspeed;
  }
  cannonAI(u, sq) {
    if (this.dry(u)) { u.mx = 0; u.mz = 0; return; }
    if (u.downT > 0) return;
    const def = u.def; const c = def.cannon || def.gun;
    if (--u.retT <= 0) {
      u.retT = 30; let best = -1, bd = 1e18;
      if (this.phase === 1) for (let i = 0; i < this.squads.length; i++) { const s = this.squads[i]; if (!s.alive || s.team === u.team) continue; const d = len(s.cx - u.x, s.cz - u.z); if (d >= (c.min || 0) && d <= c.range * this.rangeMul && d < bd) { bd = d; best = s.id; } }
      u.target = best;
    }
    const order = sq ? sq.order : ORD_HOLD;
    if (order === ORD_MOVE || order === ORD_CHARGE || order === ORD_FOLLOW) {
      const dx = u.slotX - u.x, dz = u.slotZ - u.z, d = len(dx, dz);
      if (d > 1) { const want = this.steerFoot(u, u.slotX, u.slotZ, def.speed); this.turnTo(u, want, 1.2 * DT); return; }
    }
    u.mx = 0; u.mz = 0;
    if (u.st === ST_BURST) return;
    if (u.target >= 0) {
      const ts = this.squads[u.target]; if (!ts.alive) { u.target = -1; return; }
      const want = atan2(ts.cx - u.x, ts.cz - u.z); this.turnTo(u, want, (def.gun ? 1.4 : 0.9) * DT);
      if (Math.abs(wrap(u.yaw - want)) < 0.05 && u.st === ST_IDLE) {
        if (def.gun) { u.st = ST_BURST; u.stT = 0; const sw = sq && sq.abOn > 0 && sq.ability === 'sweep'; u.burst = def.gun.burst * (sw ? 2 : 1); u.sweep = sw; if (sw) sq.abOn = 0; u.burstT = 0; this.events.push({ t: 'gatlingstart', id: u.id }); }
        else if (u.loaded && sq && sq.abOn > 0 && sq.ability === 'canister' && this.canister(u, sq)) { }
        else if (u.loaded) this.fireCannon(u, ts.cx, ts.cz); else this.startReload(u, c.reload, true);
      }
    } else if (sq) this.turnTo(u, sq.facing, 0.9 * DT);
  }
  // ---------- combat state machine ----------
  updateCombatState(u) {
    const def = u.def;
    switch (u.st) {
      case ST_WINDUP: {
        u.stT += DT; if (!u.heavy && u.stT > 0.55 && u.weapon !== 'rifle') { u.heavy = true; this.events.push({ t: 'heavy', id: u.id }); }
        if (u.ctrlActive) {
          const minW = (u.counterT > 0 ? 0.08 : 0.28) * (u.champ && u.sta < 15 ? 1.7 : 1);
          if (!u.atkHeld) u.relQ = true;
          if (u.relQ && u.stT >= minW) this.release(u);
          else if (u.stT > 3) this.release(u);
        } else if (u.stT >= def.windup * (u.aiHeavy ? 1.9 : 1) * (u.wMul || 1)) this.release(u);
        break;
      }
      case ST_RELEASE:
        u.stT += DT;
        if (!u.swingHit && u.stT <= RELEASE_T) { if (this.xc && !u.champ && !u.mounted && u.mount < 0) this.sweepHit(u); else this.tryMeleeHit(u); }
        if (u.stT >= RELEASE_T) { u.st = ST_RECOVER; u.stT = 0; }
        break;
      case ST_RECOVER: u.stT += DT; if (u.stT >= def.recover) { u.st = ST_IDLE; u.stT = 0; } break;
      case ST_STUN: u.stT += DT; u.blocking = false; if (u.stT >= u.stunDur) { u.st = ST_IDLE; u.stT = 0; } break;
      case ST_RELOAD: {
        u.stT += DT;
        if (u.stT >= u.reloadT) {
          if (u.reloadFill) {
            if (u.weapon === 'revolver') u.ammoR = def.revolver.mag;
            else if (u.weapon === 'cannon' || u.weapon === 'gatling') u.loaded = true;
            else { const g = gunOf(def, u.weapon); u.ammo = g ? (g.mag || 1) : 0; }
          }
          u.loaded = (u.weapon === 'cannon' || u.weapon === 'gatling') ? u.loaded : u.ammo > 0;
          u.st = ST_IDLE; u.stT = 0;
        }
        break;
      }
      case ST_AIM: {
        u.stT += DT;
        const g = gunOf(def, u.weapon);
        if (!g) { u.st = ST_IDLE; u.stT = 0; break; }
        const at0 = this.units[u.aimTarget]; const off0 = at0 && !at0.dead ? wrap(atan2(at0.x - u.x, at0.z - u.z) - u.yaw) : 0;
        if (this.tick >= (u.fireAt || 0) && u.stT >= Math.max(AIM_RAISE, g.aim * 0.5) && (Math.abs(off0) < 0.14 || u.stT > g.aim + 1.4 || u.weapon === 'bow')) {
          const sqv = u.squad >= 0 ? this.squads[u.squad] : null;
          if (sqv && sqv.volleyAt === u.volleyOf && sqv.volleyShout !== sqv.volleyAt) { sqv.volleyShout = sqv.volleyAt; let n = 0; for (const id of sqv.unitIds) { const m = this.units[id]; if (!m.dead && m.st === ST_AIM) n++; } this.events.push({ t: 'volley', sq: sqv.id, x: sqv.cx, y: terrainH(sqv.cx, sqv.cz) + 1.5, z: sqv.cz, n, bow: u.weapon === 'bow' }); }
          const tgt = this.units[u.aimTarget];
          if (tgt && !tgt.dead) {
            if (u.weapon === 'bow') this.fireArrow(u, tgt);
            else {
              const dx = tgt.x - u.x, dz = tgt.z - u.z, d = len(dx, dz);
              const th = tgt.downT > 0 ? 0.35 : tgt.mounted || tgt.mount >= 0 ? 1.9 : 1.05;
              const sh = u.mounted ? 2.3 : 1.55;
              const dy = (tgt.y + th) - (u.y + sh);
              const yaw = u.yaw + clamp(wrap(atan2(dx, dz) - u.yaw), -0.05, 0.05), pitch = atan2(dy, d);
              // smoothbores scatter: the farther the target, the wider the cone (and nobody aims well at a man who is running)
              let spread = (g.spread + (tgt.speedNow > 1 ? 0.008 : 0)) * (1.35 + d / 55) * (tgt.ctrl >= 0 ? 1.2 : 1); if (tgt.def.skirmish) spread += 0.02; if (u.squad >= 0) spread *= 1 - (this.squads[u.squad].stars || 0) * 0.08;
              const aimed = this.abActive(u, 'aimed'); if (aimed) spread *= 0.5;
              if (this.misfire(u)) this.events.push({ t: 'misfire', id: u.id, x: u.x, y: u.y + 1.5, z: u.z });
              else this.fireRifle(u, yaw, pitch, spread, g.dmg * (aimed ? 1.3 : 1), false, g.range * this.rangeMul);
              u.ammo--;
            }
            this.afterShot(u, g);
          } else { u.st = ST_IDLE; u.stT = 0; }
        }
        break;
      }
      case ST_BURST: {
        u.stT += DT; u.burstT -= DT;
        const g = def.gun;
        if (u.burstT <= 0 && u.burst > 0) {
          u.burstT += g.rate * (u.sweep ? 0.6 : 1); u.burst--;
          const ts = u.target >= 0 ? this.squads[u.target] : null;
          let tgt = null;
          if (ts && ts.alive) { const start = u.burst % ts.unitIds.length; for (let k = 0; k < ts.unitIds.length; k++) { const v = this.units[ts.unitIds[(start + k) % ts.unitIds.length]]; if (!v.dead) { tgt = v; break; } } }
          if (tgt) {
            const dx = tgt.x - u.x, dz = tgt.z - u.z, d = len(dx, dz); const dy = (tgt.y + (tgt.downT > 0 ? 0.35 : 1.0)) - (u.y + 1.1);
            this.fireRifle(u, atan2(dx, dz), atan2(dy, d), g.spread, g.dmg, false, g.range * this.rangeMul, 'gatling');
          }
        }
        if (u.burst <= 0 && u.burstT <= 0) { this.startReload(u, g.cooldown, true); }
        break;
      }
      case ST_SWAP: u.stT += DT; if (u.stT >= SWAP_T) { u.weapon = u.nextWeapon || u.weapon; u.st = ST_IDLE; u.stT = 0; u.aiming = false; u.loaded = u.weapon === 'revolver' ? u.ammoR > 0 : u.ammo > 0; } break;
      case ST_KICK:
        u.stT += DT;
        if (u.stT > 0.15 && !u.kickHit) this.tryKick(u);
        if (u.stT >= KICK_T) { u.st = ST_IDLE; u.stT = 0; }
        break;
    }
    if (u.blocking) u.blockT += DT;
  }
  afterShot(u, g) {
    if (!u.champ && u.type !== 'hero') u.shots = Math.max(0, u.shots - 1);
    u.loaded = u.ammo > 0;
    if (u.ammo > 0) this.startReload(u, g.reload, false); else this.startReload(u, g.magReload || g.reload, true);
  }
  release(u) { u.st = ST_RELEASE; u.stT = 0; u.swingHit = false; this.events.push({ t: 'swing', id: u.id, x: u.x, y: u.y, z: u.z, dir: u.atkDir }); }
  // ---- experimental combat ----
  xcToken(u, tgt) { // only a couple of men can be swinging at the same man; the rest press, circle and wait
    if (!this.xc) return true;
    if (this.atkTick !== this.tick) { this.atkTick = this.tick; if (!this.atkN || this.atkN.length < this.units.length) this.atkN = new Int16Array(this.units.length + 64); else this.atkN.fill(0);
      for (const v of this.units) if (!v.dead && v.target >= 0 && (v.st === ST_WINDUP || v.st === ST_RELEASE)) this.atkN[v.target]++; }
    const human = tgt.ctrl >= 0 && !this.players[tgt.ctrl].ai; const lim = human ? 2 : 3;
    if (this.atkN[tgt.id] >= lim) { u.circleT = 0.5 + this.rng.next() * 0.6; return false; }
    this.atkN[tgt.id]++; return true;
  }
  sweepHit(att) { // the blade travels through its arc tick by tick; the first body or wall it meets stops it
    const dir = att.atkDir, T = clamp(att.stT / RELEASE_T, 0, 1), T0 = clamp((att.stT - DT) / RELEASE_T, 0, 1);
    const R = att.def.reach + (att.lunge ? 0.9 : 0) + (dir === DIR_DOWN ? 0.4 : 0);
    let a0, a1, r0 = 0.35, r1 = R; const SW = 1.15;
    if (dir === DIR_RIGHT) { a0 = -SW + 2 * SW * T0; a1 = -SW + 2 * SW * T; }
    else if (dir === DIR_LEFT) { a0 = SW - 2 * SW * T0; a1 = SW - 2 * SW * T; }
    else if (dir === DIR_UP) { if (!(T0 < 0.5 && T >= 0.5)) return; a0 = -0.3; a1 = 0.3; }
    else { a0 = -0.16; a1 = 0.16; r1 = 0.5 + (R - 0.5) * T; r0 = 0.35; }
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1), sgn = a1 >= a0 ? 1 : -1, slash = dir === DIR_RIGHT || dir === DIR_LEFT;
    const n = this.gatherNear(att.x, att.z, R + 1.2); let best = null, bk = 1e9, brc = 0;
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === att || v.dead || v.inactive || v.id === att.mount) continue; if (v.type === 'horse' && v.rider < 0) continue; if (Math.abs(v.y - att.y) > 2.2) continue;
      const dx = v.x - att.x, dz = v.z - att.z, d = len(dx, dz), br = v.def.r + 0.12; if (d - br > r1 || d + br < r0) continue;
      const rel = wrap(atan2(dx, dz) - att.yaw), hw = d > br ? Math.asin(Math.min(1, br / d)) : PI; if (rel < lo - hw || rel > hi + hw) continue;
      const key = slash ? (rel - a0) * sgn : d; if (key < bk) { bk = key; best = v; brc = clamp(d - br * 0.5, r0, r1); } }
    { const wa = att.yaw + a1, rr = Math.min(r1, R * 0.85), px = att.x + sin(wa) * rr, pz = att.z + cos(wa) * rr; for (const b of this.boxes) if (Math.abs(px - b.x) < b.hw && Math.abs(pz - b.z) < b.hd && b.h > 1.0) { const key = slash ? (a1 - a0) * sgn : rr; if (key <= bk) { att.swingHit = true; att.st = ST_STUN; att.stT = 0; att.stunDur = 0.35; this.events.push({ t: 'obstruct', id: att.id, x: px, y: att.y + 1.2, z: pz }); return; } break; } }
    if (!best) return;
    att.swingHit = true;
    if (best.team === att.team) { att.st = ST_STUN; att.stT = 0; att.stunDur = 0.3; this.events.push({ t: 'obstruct', id: att.id, x: (att.x + best.x) / 2, y: att.y + 1.3, z: (att.z + best.z) / 2 }); return; }
    const f = brc / R; att.xcMul = dir === DIR_DOWN ? 0.6 + 0.5 * T : 0.45 + 0.75 * f;
    this.resolveMeleeHit(att, best); att.xcMul = 0;
  }
  tryMeleeHit(att) {
    const dir = att.atkDir;
    const reach = (att.lunge ? 0.9 : 0) + att.def.reach + (dir === DIR_DOWN ? 0.4 : 0) + (att.mounted || att.mount >= 0 ? 0.4 : 0);
    const arc = dir === DIR_UP ? 0.5 : dir === DIR_DOWN ? 0.3 : 1.05; const horse = att.mounted || att.mount >= 0;
    const n = this.gatherNear(att.x, att.z, reach + 1.5); let best = null, bd = 1e9;
    for (let i = 0; i < n; i++) {
      const v = this.units[this.nearBuf[i]];
      if (v === att || v.dead || v.team === att.team || v.id === att.mount) continue;
      if (v.type === 'horse' && v.rider < 0) continue;
      const dx = v.x - att.x, dz = v.z - att.z, d = len(dx, dz);
      if (d > reach + v.def.r) continue;
      const rel = Math.abs(wrap(atan2(dx, dz) - att.yaw)); if (horse ? (rel < 0.55 || rel > 2.3) : rel > arc) continue; // a rider can only cut down to his sides
      if (Math.abs(v.y - att.y) > 2.6) continue;
      if (d < bd) { bd = d; best = v; }
    }
    if (att.ctrlActive && (dir === DIR_LEFT || dir === DIR_RIGHT)) {
      for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === att || v.dead || v.team !== att.team || v.type === 'horse') continue; const dx = v.x - att.x, dz = v.z - att.z, d = len(dx, dz); if (d > Math.min(reach, 1.9) || d > bd) continue; const side = wrap(atan2(dx, dz) - att.yaw); if (Math.abs(side) < arc && Math.abs(side) > 0.25 && ((dir === DIR_RIGHT) === (side < 0) || Math.abs(side) < 0.6)) { att.swingHit = true; att.st = ST_STUN; att.stT = 0; att.stunDur = 0.3; this.events.push({ t: 'obstruct', id: att.id, x: (att.x + v.x) / 2, y: att.y + 1.3, z: (att.z + v.z) / 2 }); return; } }
      if (best) { let second = null, sd = 1e9; for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === att || v === best || v.dead || v.team === att.team || v.type === 'horse') continue; const dx = v.x - att.x, dz = v.z - att.z, d = len(dx, dz); if (d > reach + v.def.r || Math.abs(wrap(atan2(dx, dz) - att.yaw)) > arc || Math.abs(v.y - att.y) > 2.6) continue; if (d < sd) { sd = d; second = v; } }
        att.swingHit = true; this.resolveMeleeHit(att, best); if (second && !att.dead && att.st === ST_RELEASE) { const dm = att.def.dmg; const keep = dm[dir]; dm[dir] = keep * 0.6; this.resolveMeleeHit(att, second); dm[dir] = keep; } return; }
    }
    if (best) { att.swingHit = true; this.resolveMeleeHit(att, best); }
    else if (att.champ && this.ram && this.ram.hp > 0 && att.team === 0 && len(this.ram.x - att.x, this.ram.z - att.z) < reach + 1.8) { att.swingHit = true; this.damageRam(70, att); }
    else if (att.champ && this.gate && this.gate.hp > 0 && att.team === 1) { const g = this.boxes[this.gate.box]; if (Math.abs(att.x - g.x) < g.hw + reach && Math.abs(att.z - g.z) < g.hd + reach) { att.swingHit = true; this.damageGate(45); this.events.push({ t: 'gatehit', x: att.x, z: att.z }); } }
  }
  resolveMeleeHit(att, def_) {
    const dir = att.atkDir;
    let dmg = (att.def.dmg[dir] || 30) * (1 + clamp((att.y - def_.y) * 0.06, -0.15, 0.25)) * (this.abActive(att, 'kiai') ? 1.2 : 1) * (att.frenzyT > 0 ? 1.5 : 1) * (att.cryT > 0 ? 1.25 : 1) * (att.squad >= 0 && this.squads[att.squad].lastStand ? 1.3 : 1);
    const spd = att.mounted ? Math.abs(att.hspeed) : att.mount >= 0 ? Math.abs(this.units[att.mount].hspeed) : 0;
    dmg *= 1 + spd * 0.05;
    if (att.counterT > 0) { dmg *= 1.3; att.counterT = 0; }
    if (!att.champ) dmg *= 1 - (att.fat || 0) * 0.0025;
    if (att.squad >= 0) dmg *= 1 + (this.squads[att.squad].stars || 0) * 0.06;
    if (att.lunge) dmg *= 1.25; if (att.champ && att.combo >= 2) dmg *= 1.3; if (att.champ && att.sta < 15) dmg *= 0.8;
    if (att.champ && def_.downT > 0 && !def_.champ && def_.type !== 'horse') { dmg = 400; this.events.push({ t: 'execute', id: att.id, x: def_.x, y: def_.y, z: def_.z }); }
    const dx = def_.x - att.x, dz = def_.z - att.z, d = len(dx, dz) || 1, nx = dx / d, nz = dz / d;
    const hx = att.x + nx * (d - def_.def.r), hy = def_.y + (def_.mounted || def_.mount >= 0 ? 1.8 : dir === DIR_UP ? 1.5 : 1.1), hz = att.z + nz * (d - def_.def.r);
    // measure: a spear is deadly at its tip and useless when the enemy is inside it; a blade wants the middle distance
    const R = att.def.reach + (att.lunge ? 0.9 : 0), f = d / R; let q = 'clean', qm = 1;
    if (att.weapon === 'yari') { if (f < 0.45) { q = 'jammed'; qm = 0.5; } else if (f > 0.68) { q = 'tip'; qm = 1.18; } }
    else { if (f > 0.92) { q = 'graze'; qm = 0.7; } else if (f > 0.45 && f < 0.8) { q = 'clean'; qm = 1.1; } }
    dmg *= qm; const heavy = att.heavy; if (heavy) dmg *= 1.45; if (att.xcMul) dmg *= att.xcMul;
    if (this.xc && att.ctrl < 0 && def_.ctrl < 0) dmg *= 0.72; // line against line the killing is slower: clashes, pauses, clashes, not a blender
    if (def_.entT > 0 && att.weapon === 'yari' && !att.def.brush) { dmg *= 2.0; q = 'pinned'; }
    if (def_.openT > 0) { dmg *= 2.2; def_.openT = 0; q = 'deathblow'; }
    const behind = Math.abs(wrap(atan2(att.x - def_.x, att.z - def_.z) - def_.yaw)) > 2.0;
    const canBlock = def_.blocking && def_.entT <= 0 && def_.flinchT <= 0 && def_.downT <= 0 && def_.type !== 'horse' && !behind;
    const shieldBlock = canBlock && def_.def.shield && dir !== DIR_DOWN;
    const omni = def_.ctrlActive; // human players hold one block that covers the front; AI still has to read the direction
    if (canBlock && att.def.brush && def_.type !== 'horse' && (omni || def_.blockDir === counterDir(dir) || shieldBlock)) { // branches can't be parried clean: they wrap the guard
      if (def_.def.shield) { const m = 1 / (def_.mass || 1); def_.vx += nx * 3.4 * m; def_.vz += nz * 3.4 * m; } else this.brushCatch(def_, att, nx, nz, true, hx, hy, hz); /* a shield turns the branches aside; a plain guard gets wrapped */ this.events.push({ t: 'block', x: hx, y: hy, z: hz, perfect: false, by: def_.id, att: att.id, shield: !!def_.def.shield }); att.heavy = false; return; }
    if (canBlock && (omni || def_.blockDir === counterDir(dir) || shieldBlock)) {
      const perfect = def_.blockT < (def_.def.parry || 0.16) * (omni ? 1.15 : 1) && (omni || def_.blockDir === counterDir(dir));
      if (perfect) { // a true parry: the attacker's balance is wrecked and the defender gets the initiative
        att.st = ST_STUN; att.stT = 0; att.stunDur = heavy ? 1.0 : 0.8; def_.counterT = 0.9; this.posture(att, heavy ? 55 : 38, def_);
        this.events.push({ t: 'block', x: hx, y: hy, z: hz, perfect, by: def_.id, att: att.id, heavy }); att.heavy = false; return; }
      if (heavy && !def_.def.shield) { // a heavy blow crushes an ordinary guard: half comes through and the defender reels
        this.posture(def_, dmg * 1.4, att); def_.blocking = false; def_.flinchT = 0.45; this.events.push({ t: 'guardcrush', x: hx, y: hy, z: hz, by: def_.id, att: att.id });
        this.applyDamage(def_, dmg * 0.5, att.id, nx * 2.5, 0, nz * 2.5, 'melee', hx, hy, hz); att.heavy = false; return; }
      att.st = ST_STUN; att.stT = 0; att.stunDur = 0.35; if (this.xc && att.ctrl >= 0 && (att.spamR || 0) > 3) { att.stunDur = 0.6; def_.counterT = Math.max(def_.counterT || 0, 0.6); } this.posture(def_, dmg * (heavy ? 1.6 : 1) * (def_.def.shield ? 0.6 : 1) * (att.def.posture || 1), att); this.posture(att, 6, def_);
      if (att.def.crush) this.applyDamage(def_, dmg * att.def.crush * (def_.def.shield ? 0.6 : 1), att.id, nx * 1.2, 0, nz * 1.2, 'melee', hx, hy, hz);
      if (this.xc) this.hitReact(def_, att, 'block', heavy, true);
      this.events.push({ t: 'block', x: hx, y: hy, z: hz, perfect: false, by: def_.id, att: att.id, shield: !!def_.def.shield }); att.heavy = false; return;
    }
    if ((def_.mounted || def_.type === 'horse' || def_.mount >= 0) && !(att.mounted || att.mount >= 0)) { const hs = def_.type === 'horse' ? def_ : def_.mounted ? def_ : this.units[def_.mount]; const fast = hs && Math.abs(hs.hspeed) > 5; dmg *= fast ? 0.95 : 1.4; if (hs) hs.hspeed *= fast ? 0.85 : 0.35; } // a galloping horseman is a glancing target; a halted one is cut down
    def_.lastAttacker = att.id;
    const kb = (dir === DIR_UP ? 2.2 : 1.6) * (heavy ? 1.8 : 1);
    if (att.def.brush && def_.type !== 'horse') this.brushCatch(def_, att, nx, nz, false, hx, hy, hz);
    this.posture(def_, dmg * (heavy ? 0.9 : 0.45) * (att.def.posture || 1), att);
    this.applyDamage(def_, dmg, att.id, nx * kb, heavy ? 1.2 : 0, nz * kb, 'melee', hx, hy, hz);
    if (!def_.dead && !att.def.brush && !(def_.entT > 0)) { if (this.xc) this.hitReact(def_, att, dir === DIR_DOWN || att.weapon === 'yari' ? 'thrust' : 'cut', heavy, false); else { def_.flinchT = heavy ? 0.6 : 0.35; if (def_.st === ST_WINDUP || def_.st === ST_AIM) { def_.st = ST_IDLE; def_.stT = 0; } } }
    if (att.ctrl >= 0 || def_.ctrl >= 0) this.events.push({ t: 'hitq', att: att.id, def: def_.id, q, heavy, x: hx, y: hy, z: hz });
    att.heavy = false;
  }
  // posture: blocking and being hit wear down balance; when it breaks, the fighter is wide open
  posture(u, amt, by) {
    if (u.dead || u.type === 'horse' || u.def.ai === 'cannon') return; const max = u.champ ? 240 : u.type === 'hero' ? 200 : 100 + (u.squad >= 0 ? (this.squads[u.squad].stars || 0) * 15 : 0);
    u.pos += amt; u.posT = 1.1;
    if (u.pos >= max) { u.pos = 0; u.blocking = false; u.st = ST_STUN; u.stT = 0; u.stunDur = u.champ ? 1.3 : u.entT > 0 ? 0.5 : 1.7; u.entT = 0; u.openT = 1.9; /* a man already held by the brush is not then frozen as well */ this.events.push({ t: 'posturebreak', id: u.id, x: u.x, y: u.y + 1.2, z: u.z, by: by ? by.id : -1 }); }
  }
  tryKick(u) {
    const n = this.gatherNear(u.x, u.z, 3); let best = null, bd = 1e9;
    for (let i = 0; i < n; i++) {
      const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team === u.team || v.type === 'horse') continue;
      const dx = v.x - u.x, dz = v.z - u.z, d = len(dx, dz); if (d > 1.7 + v.def.r || Math.abs(wrap(atan2(dx, dz) - u.yaw)) > 0.55) continue;
      if (d < bd) { bd = d; best = v; }
    }
    if (!best) return;
    u.kickHit = true;
    const dx = best.x - u.x, dz = best.z - u.z, d = len(dx, dz) || 1;
    if (best.guardT > 0) { best.guardT = 0; best.st = ST_STUN; best.stT = 0; best.stunDur = 1.1; this.events.push({ t: 'guardbreak', x: best.x, y: best.y + 1, z: best.z, id: best.id }); }
    else if (best.blocking) { best.blocking = false; best.st = ST_STUN; best.stT = 0; best.stunDur = 0.8; this.events.push({ t: 'kickhit', x: best.x, y: best.y + 1, z: best.z, broke: true }); }
    else { best.flinchT = 0.3; this.events.push({ t: 'kickhit', x: best.x, y: best.y + 1, z: best.z, broke: false }); }
    best.vx += dx / d * 3; best.vz += dz / d * 3; best.lastAttacker = u.id;
  }
  applyDamage(u, dmg, attackerId, ix, iy, iz, cause, hx, hy, hz) {
    if (u.dead || u.inactive) return false; if (dmg > 0) u.hurtTk = this.tick;
    if (u.ctrl >= 0 && this.players[u.ctrl] && this.players[u.ctrl].god) return false; // debug mode: the tester cannot be hurt
    if (this.xc && u.ctrl >= 0 && !this.players[u.ctrl].ai && (cause === 'melee' || cause === 'trample' || cause === 'spear' || cause === 'counter' || cause === 'arrow' || cause === 'shot')) { // no instant deaths in a crowd or under a whole company's volley
      const dec = (this.tick - (u.xcT === undefined ? this.tick : u.xcT)) * DT * 0.3 * u.def.hp; u.xcB = Math.max(0, (u.xcB || 0) - dec); u.xcT = this.tick;
      const room = Math.max(0, u.def.hp * 0.4 - u.xcB); if (dmg > room) dmg = room + (dmg - room) * 0.15;
      if (this.tick < (u.xcGr || 0)) dmg *= 0.35; u.xcB += dmg; u.xcGr = this.tick + 10;
      const a = attackerId >= 0 ? this.units[attackerId] : null; if (a) { const dx = u.x - a.x, dz = u.z - a.z, d = len(dx, dz) || 1; u.vx = (u.vx || 0) + dx / d * 2.2; u.vz = (u.vz || 0) + dz / d * 2.2; } }
    if (this.solo && u.ctrl >= 0 && !this.players[u.ctrl].ai) { // single player: artillery never touches you, and no musket ball kills you outright
      const a = attackerId >= 0 ? this.units[attackerId] : null;
      if (cause === 'solid' || (a && a.def.ai === 'cannon')) return false;
      if (cause === 'shot' || cause === 'trample') dmg = Math.min(dmg, u.def.hp * (cause === 'shot' ? 0.42 : 0.35));
    }
    if ((u.champ || u.ctrl >= 0) && u.iframe > 0 && (cause === 'melee' || cause === 'whirl' || cause === 'dash' || cause === 'counter' || cause === 'plunge' || cause === 'spear')) { this.events.push({ t: 'evade', id: u.id, x: u.x, y: u.y, z: u.z }); return false; }
    if (u.guardT > 0 && cause !== 'explosion' && cause !== 'fire' && cause !== 'lightning' && attackerId >= 0) { const a = this.units[attackerId];
      if (a && Math.abs(wrap(atan2(a.x - u.x, a.z - u.z) - u.yaw)) < 1.4) { dmg *= 0.1; ix *= 0.1; iz *= 0.1; iy = 0;
        if ((cause === 'melee' || cause === 'dash' || cause === 'counter') && len(a.x - u.x, a.z - u.z) < 4.5 && a.type !== 'horse') { a.st = ST_STUN; a.stT = 0; a.stunDur = 1.3; a.blocking = false; a.dashT = 0; this.events.push({ t: 'guardcounter', x: u.x, y: u.y + 1.3, z: u.z, by: u.id, att: a.id }); } } }
    if (u.champ) { u.lastHitTick = this.tick; const a = attackerId >= 0 ? this.units[attackerId] : null; if (a && !a.champ && cause !== 'explosion') dmg *= 0.4; if (u.ironT > 0 && cause !== 'fire' && cause !== 'explosion') { dmg *= 0.3; ix *= 0.2; iz *= 0.2; iy = 0; } }
    if (u.downed && attackerId >= 0 && this.units[attackerId].target !== u.id && dmg < 1e5) return false; // a man on the ground is only finished on purpose, not by a swing meant for someone else
    const mult = u.downT > 0 && !u.downed ? 1.5 : 1;
    u.hp -= dmg * mult; u.hitT = 0.3;
    const m = 1 / u.mass;
    u.vx += ix * m; u.vz += iz * m;
    if (iy > 0 && u.mass < 5) { u.vy += iy * m; u.y += 0.05; u.airborne = true; }
    if (u.ctrl >= 0 && !this.xc && !u.mounted && attackerId >= 0 && (cause === 'melee' || cause === 'shot' || cause === 'arrow' || cause === 'spear')) { const a = this.units[attackerId]; const dx = u.x - a.x, dz = u.z - a.z, d = len(dx, dz) || 1, kb = cause === 'melee' || cause === 'spear' ? 1.8 : 1.1; u.vx += dx / d * kb; u.vz += dz / d * kb; u.flinchT = Math.max(u.flinchT, 0.3); } // a blow that lands staggers you
    this.events.push({ t: 'hit', id: u.id, x: hx === undefined ? u.x : hx, y: hy === undefined ? u.y + 1.1 : hy, z: hz === undefined ? u.z : hz, dmg: dmg * mult, cause, att: attackerId, killed: u.hp <= 0 });
    if (u.hp <= 0 && this.story && this.zDown(u, dmg, cause)) return false;
    if (u.hp <= 0) { this.kill(u, ix * m + (u.mx * 0.3), iy * m + 1.5, iz * m + (u.mz * 0.3), cause, attackerId); return true; }
    if (u.zfile && !u.wounded && u.ctrl < 0 && u.hp < u.def.hp * 0.45 && this.tick >= (u.restCd || 0)) { u.restT = this.tick + 30 * 6; u.restCd = this.tick + 30 * 22; } // a hurt man steps back a rank to catch his breath; the next man takes the front
    return false;
  }
  kill(u, ix, iy, iz, cause, killerId) {
    if (!u.dead) this.pkOnDeath(u);
    u.dead = true; u.hp = 0; u.blocking = false; u.st = ST_IDLE; u.deathTick = this.tick; u.mx = 0; u.mz = 0;
    if (u.rider >= 0) { const r = this.units[u.rider]; r.mount = -1; r.mounted = false; r.downT = Math.max(r.downT, 1.6); r.vy = 3; r.y += 0.05; r.airborne = true; r.vx += ix * 0.5; r.vz += iz * 0.5; u.rider = -1; }
    if (u.mount >= 0) { const h = this.units[u.mount]; h.rider = -1; u.mount = -1; }
    if (killerId >= 0 && this.units[killerId] && this.units[killerId].champ && u.team !== this.units[killerId].team && u.type !== 'horse') { const k = this.units[killerId]; k.hp = Math.min(k.def.hp, k.hp + (u.champ ? 250 : 35)); k.streak = (k.streak || 0) + 1; if (k.streak % 10 === 0) this.events.push({ t: 'streak', id: k.id, n: k.streak }); }
    if (u.champ) u.streak = 0;
    if (this.heroMode && u.type !== 'horse' && (u.champ || (u.squad >= 0 && this.squads[u.squad].unitIds[0] === u.id))) this.pickups.push({ x: u.x, z: u.z, t: this.tick + 30 * 45 });
    if (killerId >= 0) { const k = this.units[killerId]; if (k && k.ctrl >= 0 && k.team !== u.team && u.type !== 'horse') { const pl = this.players[k.ctrl]; pl.kills++; if (k.frenzyT <= 0 || k.frenzyT === undefined) pl.fury = Math.min(FURY_MAX, pl.fury + (cause === 'melee' || cause === 'counter' ? 20 : 12)); } }
    if (this.phase === 1 && u.type !== 'horse' && !this.heroMode) { if (u.type === 'hero') { this.score[1 - u.team] += 40; this.events.push({ t: 'bounty', team: 1 - u.team, pts: 40 }); } else if (u.squad >= 0 && this.squads[u.squad].unitIds[0] === u.id) this.score[1 - u.team] += 10; }
    this.squadLoss(u, cause);
    if (this.rp && u.type !== 'horse') this.rp[1 - u.team] += u.champ || u.type === 'hero' ? 12 : 1.2;
    if (killerId >= 0 && u.type !== 'horse') { const k = this.units[killerId]; if (k && k.squad >= 0 && k.team !== u.team) { const ks = this.squads[k.squad]; ks.xp = (ks.xp || 0) + (u.champ ? 5 : 1); const st = ks.xp >= 30 ? 3 : ks.xp >= 15 ? 2 : ks.xp >= 6 ? 1 : 0;
      if (st > (ks.stars || 0)) { ks.stars = st; ks.moraleMax = (ks.def.morale || 100) + st * 10; ks.morale = Math.min(ks.moraleMax, ks.morale + 15); this.events.push({ t: 'veteran', sq: ks.id, stars: st }); } } }
    if (u.squad >= 0) { const sq = this.squads[u.squad]; if (sq.unitIds[0] === u.id && sq.aliveCount > 1) { if (!sq.def.fearless) sq.morale = Math.max(0, sq.morale - 25); this.events.push({ t: 'captain', sq: sq.id }); } }
    if (u.type === 'hero') { for (let i = 0; i < this.players.length; i++) { const p = this.players[i]; if (p.commanderId === u.id) { for (let k = 0; k < p.squads.length; k++) { const sq = this.squads[p.squads[k]]; if (sq.alive && !sq.def.fearless) sq.morale = Math.max(0, sq.morale - 30); } this.events.push({ t: 'commanderdown', p: p.idx }); } } }
    if (this.mode === 'assault' && u.team === this.mission.attacker && u.type !== 'horse') this.tickets = Math.max(0, this.tickets - 1);
    this.events.push({ t: 'death', id: u.id, ix, iy, iz, cause, killer: killerId });
    if (u.def.ai === 'cannon') this.explode(u.x, u.y + 0.6, u.z, u.team, u.id, 4.5, 90);
  }
  // ---------- ranged ----------
  fireHeroGun(u, g) {
    // a bow def has no spread of its own (its archers aim by 'aim'): without a default every arrow a player loosed flew NaN
    const gsp = g.spread !== undefined ? g.spread : 0.03; let spread = (u.aiming ? (g.ads || gsp * 0.3) : gsp) + (u.speedNow || 0) * 0.004 + (u.mount >= 0 ? 0.008 : 0) + (u.airborne ? 0.03 : 0);
    if (this.real) spread = spread * (1 + 2.2 * Math.max(0, 1 - (u.aimHold || 0) / 1.4)) + u.speedNow * 0.01 + ((u.fat || 0) > 50 ? 0.01 : 0);
    if (u.weapon === 'bow') { const v = g.speed || 50, cp = cos(u.pitch); const ox = u.x + sin(u.yaw) * 0.5, oy = u.y + 1.55, oz = u.z + cos(u.yaw) * 0.5; const sp2 = spread * 0.6;
      const yw = u.yaw + (this.rng.next() - 0.5) * sp2, pt = u.pitch + (this.rng.next() - 0.5) * sp2;
      this.projectiles.push({ kind: 'arrow', x: ox, y: oy, z: oz, vx: sin(yw) * cos(pt) * v, vy: sin(pt) * v, vz: cos(yw) * cos(pt) * v, team: u.team, owner: u.id, life: 0, hits: 0, over: this.overParapet(u) });
      this.events.push({ t: 'arrow', id: u.id, x: ox, y: oy, z: oz }); }
    else if (u.weapon === 'rifle' && this.misfire(u)) this.events.push({ t: 'misfire', id: u.id, x: u.x, y: u.y + 1.5, z: u.z });
    else this.fireRifle(u, u.yaw, u.pitch, spread, g.dmg, true, g.range, u.weapon);
    u.blocking = false;
    if (u.weapon === 'revolver') { u.ammoR--; u.loaded = u.ammoR > 0; this.startReload(u, u.ammoR > 0 ? g.cycle : g.reload, u.ammoR <= 0); }
    else { u.ammo--; this.afterShot(u, g); }
  }
  unitSpheres(u, out) {
    let n = 0; const push = (x, y, z, r, head) => { out[n * 5] = x; out[n * 5 + 1] = y; out[n * 5 + 2] = z; out[n * 5 + 3] = r; out[n * 5 + 4] = head ? 1 : 0; n++; };
    if (u.type === 'horse' || u.mounted) {
      const fx = sin(u.type === 'horse' ? u.yaw : u.hyaw), fz = cos(u.type === 'horse' ? u.yaw : u.hyaw);
      push(u.x - fx * 0.6, u.y + 1.0, u.z - fz * 0.6, 0.55, false); push(u.x, u.y + 1.0, u.z, 0.55, false); push(u.x + fx * 0.6, u.y + 1.15, u.z + fz * 0.6, 0.5, false);
      if (u.mounted) { push(u.x, u.y + 1.65, u.z, 0.34, false); push(u.x, u.y + 2.05, u.z, 0.32, false); push(u.x, u.y + 2.45, u.z, 0.24, true); }
    } else if (u.def.ai === 'cannon') {
      const fx = sin(u.yaw), fz = cos(u.yaw); push(u.x - fx * 0.6, u.y + 0.6, u.z - fz * 0.6, 0.9, false); push(u.x + fx * 0.6, u.y + 0.7, u.z + fz * 0.6, 0.8, false);
    } else if (u.downT > 0) {
      const fx = sin(u.yaw), fz = cos(u.yaw); push(u.x - fx * 0.5, u.y + 0.3, u.z - fz * 0.5, 0.33, false); push(u.x, u.y + 0.3, u.z, 0.33, false); push(u.x + fx * 0.5, u.y + 0.3, u.z + fz * 0.5, 0.33, false);
    } else {
      const b = u.mount >= 0 ? 1.0 : 0;
      push(u.x, u.y + b + 0.45, u.z, 0.35, false); push(u.x, u.y + b + 0.85, u.z, 0.36, false); push(u.x, u.y + b + 1.25, u.z, 0.34, false); push(u.x, u.y + b + 1.63, u.z, 0.24, true);
    }
    return n;
  }
  rayTerrain(ox, oy, oz, dx, dy, dz, maxT) {
    if (dy >= 0 && oy > 5) return -1;
    let prev = 0;
    for (let t = 2; t <= maxT; t += 2) {
      const y = oy + dy * t; if (y < terrainH(ox + dx * t, oz + dz * t)) {
        let a = prev, b = t;
        for (let i = 0; i < 6; i++) { const m = (a + b) * 0.5; if (oy + dy * m < terrainH(ox + dx * m, oz + dz * m)) b = m; else a = m; }
        return (a + b) * 0.5;
      }
      prev = t;
    }
    return -1;
  }
  rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
    const gh = terrainH(b.x, b.z); const minY = gh - 0.5, maxY = gh + b.h;
    let t0 = 0, t1 = maxT;
    const axes = [[ox, dx, b.x - b.hw, b.x + b.hw], [oy, dy, minY, maxY], [oz, dz, b.z - b.hd, b.z + b.hd]];
    for (let i = 0; i < 3; i++) {
      const o = axes[i][0], d = axes[i][1], lo = axes[i][2], hi = axes[i][3];
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
      let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1;
    }
    return t0 > 0 ? t0 : -1;
  }
  fireRifle(u, yaw, pitch, spread, dmg, allowFriendly, range, causeOverride) {
    const r1 = (this.rng.next() * 2 - 1) * spread, r2 = (this.rng.next() * 2 - 1) * spread;
    yaw += r1; pitch += r2;
    const eyeH = u.def.gun ? 1.15 : (u.mounted || u.mount >= 0) ? 2.3 : 1.55;
    const ox = u.x, oy = u.y + eyeH, oz = u.z;
    const cp = cos(pitch); const dx = sin(yaw) * cp, dy = sin(pitch), dz = cos(yaw) * cp;
    const maxT = (range || 100) * 1.3;
    let bestT = maxT, kind = 'none', victim = null, head = false;
    const tg = this.rayTerrain(ox, oy, oz, dx, dy, dz, maxT); if (tg > 0 && tg < bestT) { bestT = tg; kind = 'ground'; }
    const lost = this.smokes && this.smokes.length && this.smokeBlocks(ox, oz, ox + dx * 40, oz + dz * 40) && this.rng.next() < 0.6;
    const us = this.units, sph = this.sph;
    for (let i = 0; i < us.length; i++) {
      const v = us[i]; if (v.dead || v === u || v.id === u.mount) continue;
      if (v.team === u.team && (!allowFriendly || (v.x - u.x) * (v.x - u.x) + (v.z - u.z) * (v.z - u.z) < 9)) continue;
      const lx = v.x - ox, ly = (v.y + 1) - oy, lz = v.z - oz; const tca = lx * dx + ly * dy + lz * dz;
      if (tca < 0 || tca - 3 > bestT) continue;
      const p2 = lx * lx + ly * ly + lz * lz - tca * tca; if (p2 > 12) continue;
      const n = this.unitSpheres(v, sph);
      for (let k = 0; k < n; k++) {
        const sx = sph[k * 5] - ox, sy = sph[k * 5 + 1] - oy, sz = sph[k * 5 + 2] - oz, sr = sph[k * 5 + 3];
        const t = sx * dx + sy * dy + sz * dz; if (t < 0) continue;
        const d2 = sx * sx + sy * sy + sz * sz - t * t; if (d2 > sr * sr) continue;
        const th = Math.sqrt(sr * sr - d2); const hitT = t - th;
        if (hitT < bestT) { bestT = hitT; kind = 'unit'; victim = v; head = sph[k * 5 + 4] > 0; }
      }
    }
    const hd = len(dx, dz);
    if (hd > 1e-6) {
      const ux = dx / hd, uz = dz / hd; const obsList = this.obstacles;
      for (let i = 0; i < obsList.length; i++) {
        const o = obsList[i]; const lx = ox - o.x, lz = oz - o.z; const b = lx * ux + lz * uz; const c = lx * lx + lz * lz - o.r * o.r;
        const disc = b * b - c; if (disc < 0) continue; const t2 = -b - Math.sqrt(disc); if (t2 < 0) continue; const t3 = t2 / hd; if (t3 >= bestT) continue;
        const y = oy + dy * t3; const gh = terrainH(o.x, o.z);
        const top = o.kind === 0 ? gh + 7 : o.kind === 1 ? gh + o.r * 0.9 : o.kind === 2 ? gh + 5 : o.kind === 5 ? gh + 1.2 : gh + 4;
        if (y < gh - 1 || y > top) continue;
        bestT = t3; kind = o.kind === 1 ? 'rock' : o.kind === 0 ? 'tree' : 'wood'; victim = null;
      }
    }
    for (let i = 0; i < this.boxes.length; i++) { if (this.boxes[i].kind === 'sface' && this.overParapet(u)) continue; const t = this.rayBox(ox, oy, oz, dx, dy, dz, this.boxes[i], bestT); if (t > 0 && t < bestT) { bestT = t; kind = this.boxes[i].kind === 'wall' ? 'rock' : 'wood'; victim = null; } }
    if (lost && kind === 'unit') { kind = 'none'; victim = null; }
    if (victim && victim.def.shield && victim.st !== ST_RELEASE && victim.downT <= 0 && Math.abs(wrap(atan2(u.x - victim.x, u.z - victim.z) - victim.yaw)) < 1.0 && this.rng.next() < 0.45) { kind = 'wood'; victim = null; }
    const hx = ox + dx * bestT, hy = oy + dy * bestT, hz = oz + dz * bestT;
    this.events.push({ t: 'shot', from: [ox, oy, oz], to: [hx, hy, hz], dir: [dx, dy, dz], kind, team: u.team, head, shooter: u.id, victim: victim ? victim.id : -1, hero: u.ctrl >= 0, weapon: causeOverride || u.weapon });
    if (victim) {
      const f = (head ? 2.5 : 1) * (1 + clamp((u.y - victim.y) * 0.025, -0.1, 0.2)); victim.lastAttacker = u.id;
      this.applyDamage(victim, dmg * f, u.id, dx * 2.5, 0.3, dz * 2.5, causeOverride === 'gatling' ? 'gatling' : head ? 'headshot' : 'shot', hx, hy, hz);
      if (!victim.dead) { if (this.xc) this.hitReact(victim, u, 'shot', false, false); else { victim.flinchT = Math.max(victim.flinchT, 0.25); if (victim.st === ST_WINDUP || victim.st === ST_AIM) { victim.st = ST_IDLE; victim.stT = 0; } } }
    }
  }
  ballistic(u, tx, tz, v, err, dy) {
    const dx = tx - u.x, dz = tz - u.z; let d = len(dx, dz); if (d < 1) d = 1;
    let x = GRAV * d / (v * v); if (x > 1) x = 1;
    let a0 = 0.5 * asin(x);
    // a real height difference (a wall top, a hill): the low arc that drops dy over d, instead of the flat-ground one
    if (dy !== undefined && (dy > 1.5 || dy < -1.5)) { const v2 = v * v, disc = v2 * v2 - GRAV * (GRAV * d * d + 2 * dy * v2); if (disc >= 0) a0 = atan2(v2 - Math.sqrt(disc), GRAV * d); }
    const ang = a0 + (this.rng.next() - 0.5) * err; const yaw = atan2(dx, dz) + (this.rng.next() - 0.5) * err * 0.8;
    return { ang, yaw, d };
  }
  fireCannon(u, tx, tz) {
    const c = u.def.cannon; const b = this.ballistic(u, tx, tz, c.speed, 0.05);
    const mx = u.x + sin(b.yaw) * 1.5, my = u.y + 1.05, mz = u.z + cos(b.yaw) * 1.5; const ca = cos(b.ang), v = c.speed;
    this.projectiles.push({ kind: c.type, x: mx, y: my, z: mz, vx: sin(b.yaw) * ca * v, vy: sin(b.ang) * v, vz: cos(b.yaw) * ca * v, team: u.team, owner: u.id, life: 0, hits: 0 });
    u.loaded = false; this.startReload(u, c.reload, true);
    this.events.push({ t: 'cannon', id: u.id, x: mx, y: my, z: mz, dx: sin(b.yaw) * ca, dy: sin(b.ang), dz: cos(b.yaw) * ca });
  }
  fireArrow(u, tgt) {
    // an archer leads a marching file, but cannot read a single man's next step: he aims where a player IS, and the
    // arrow is slow enough to see coming, so a man who keeps moving across its path is hard to hit
    const bw = u.def.bow; const human = tgt.ctrl >= 0 && !(this.players[tgt.ctrl] && this.players[tgt.ctrl].ai); const lead = tgt.speedNow > 0.5 && !human ? 0.9 : 0;
    const dd = len(tgt.x - u.x, tgt.z - u.z), sc = (0.035 + dd * 0.0007) * (human && tgt.speedNow > 2 ? 1.8 : 1);
    const b = this.ballistic(u, tgt.x + tgt.mx * lead, tgt.z + tgt.mz * lead, bw.speed, 0.06, (tgt.y + 1) - (u.y + 1.5)); b.yaw += (this.rng.next() - 0.5) * sc * 2; b.ang += (this.rng.next() - 0.5) * sc;
    const ca = cos(b.ang), v = bw.speed; const ox = u.x + sin(b.yaw) * 0.6, oy = u.y + 1.5, oz = u.z + cos(b.yaw) * 0.6;
    this.projectiles.push({ kind: 'arrow', x: ox, y: oy, z: oz, vx: sin(b.yaw) * ca * v, vy: sin(b.ang) * v, vz: cos(b.yaw) * ca * v, team: u.team, owner: u.id, life: 0, hits: 0, over: this.overParapet(u) });
    u.ammo--; this.events.push({ t: 'arrow', id: u.id, x: ox, y: oy, z: oz });
  }
  updateProjectiles() {
    const ps = this.projectiles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; let done = false;
      if (p.kind === 'bomb') {
        p.fuse -= DT; p.vy -= GRAV * DT; p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT; p.x = clamp(p.x, -HALF, HALF); p.z = clamp(p.z, -HALF, HALF);
        const g = terrainH(p.x, p.z) + 0.12; if (p.y < g) { p.y = g; if (p.vy < -2) { p.vy = -p.vy * 0.3; this.events.push({ t: 'bombbounce', x: p.x, y: g, z: p.z }); } else p.vy = 0; p.vx *= 0.55; p.vz *= 0.55; }
        for (let b = 0; b < this.boxes.length; b++) { const bx = this.boxes[b]; if (p.x > bx.x - bx.hw && p.x < bx.x + bx.hw && p.z > bx.z - bx.hd && p.z < bx.z + bx.hd && p.y < terrainH(bx.x, bx.z) + bx.h) { p.x -= p.vx * DT; p.z -= p.vz * DT; p.vx *= -0.4; p.vz *= -0.4; } }
        if (p.fuse <= 0) { this.explode(p.x, p.y, p.z, p.team, -1, 5.5, 140); ps[i] = ps[ps.length - 1]; ps.pop(); }
        continue;
      }
      for (let s = 0; s < 3 && !done; s++) {
        const dt = DT / 3; p.vy -= GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.life += dt;
        const g = terrainH(p.x, p.z);
        // boxes stop everything
        for (let b = 0; b < this.boxes.length && !done; b++) { const bx = this.boxes[b]; if (p.over && bx.kind === 'sface') continue; if (p.x > bx.x - bx.hw && p.x < bx.x + bx.hw && p.z > bx.z - bx.hd && p.z < bx.z + bx.hd && p.y < terrainH(bx.x, bx.z) + bx.h) { if (p.kind === 'shell') this.explode(p.x, p.y, p.z, p.team, p.owner, 7.5, 170); else if (p.kind === 'arrow') this.events.push({ t: 'arrowstick', x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz }); else this.events.push({ t: 'bounce', x: p.x, y: p.y, z: p.z, big: true }); done = true; } }
        if (done) break;
        if (p.y <= g) {
          if (p.kind === 'shell') { this.explode(p.x, g + 0.1, p.z, p.team, p.owner, 7.5, 170); done = true; break; }
          if (p.kind === 'arrow') { this.events.push({ t: 'arrowstick', x: p.x, y: g, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz }); this.ignite(p.x, p.z, 0.025); done = true; break; }
          if (p.bolt) { this.events.push({ t: 'arrowstick', x: p.x, y: g, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz }); done = true; break; }
          // solid shot: bounce while fast, then stop
          const hs = len(p.vx, p.vz);
          if (hs > 9 && p.vy < 0) { p.y = g + 0.15; p.vy = -p.vy * 0.32; p.vx *= 0.72; p.vz *= 0.72; this.events.push({ t: 'bounce', x: p.x, y: g, z: p.z, big: false }); }
          else { done = true; break; }
        }
        if (p.life > 0.25) {
          const rad = p.kind === 'solid' ? 1.1 : p.kind === 'arrow' ? 0.36 : 0.6;
          const n = this.gatherNear(p.x, p.z, 2);
          for (let k = 0; k < n; k++) {
            const v = this.units[this.nearBuf[k]]; if (v.dead || v.id === p.owner) continue;
            if (p.kind === 'arrow' && v.team === p.team) continue;
            if (p.kind === 'solid' && v.lastShotBy === p) continue;
            if (p.bolt && v.team === p.team) continue;
            const h = (v.mounted || v.type === 'horse') ? 1.2 : v.def.ai === 'cannon' ? 0.7 : v.downT > 0 ? 0.3 : 0.9;
            const dx = v.x - p.x, dy = (v.y + h) - p.y, dz = v.z - p.z; const rr = v.def.r + rad;
            if (dx * dx + dz * dz < rr * rr && Math.abs(dy) < 1.3 + v.def.r) {
              if (p.kind === 'shell') { this.explode(p.x, p.y, p.z, p.team, p.owner, 7.5, 170); done = true; break; }
              if (p.kind === 'arrow' && v.def.shield && !v.dead && v.st !== ST_RELEASE && Math.abs(wrap(atan2(p.x - v.x, p.z - v.z) - v.yaw)) < 1.1 && this.rng.next() < 0.75) { this.events.push({ t: 'arrowstick', x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz }); done = true; break; }
              if (p.kind === 'arrow' && v.ctrl >= 0 && !v.dead && (v.iframe > 0 || (v.blocking && Math.abs(wrap(atan2(p.x - v.x, p.z - v.z) - v.yaw)) < 1.2 && this.rng.next() < (v.def.shield ? 1 : 0.8)))) { this.events.push({ t: v.iframe > 0 ? 'evade' : 'arrowstick', id: v.id, x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz }); if (v.iframe <= 0) this.events.push({ t: 'block', x: p.x, y: p.y, z: p.z, perfect: false, by: v.id, att: -1, shield: !!v.def.shield }); done = true; break; } // you can slide under an arrow or turn it on your guard
              if (p.kind === 'arrow' && v.zfile && !v.dead && this.coverShield(v, p)) { this.events.push({ t: 'arrowstick', x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz }); done = true; break; }
              if (p.kind === 'arrow') { v.lastAttacker = p.owner; this.applyDamage(v, (p.dmg || (this.units[p.owner].def.bow || { dmg: 30 }).dmg) * (v.def.ai === 'cannon' ? 0.3 : 1) * (v.ctrl >= 0 && !(this.players[v.ctrl] && this.players[v.ctrl].ai) ? 0.65 : 1), p.owner, p.vx * 0.03, 0, p.vz * 0.03, 'arrow', p.x, p.y, p.z); if (!v.dead) { if (this.xc) this.hitReact(v, this.units[p.owner], 'shot', false, false); else { v.flinchT = Math.max(v.flinchT, 0.25); if (v.st === ST_WINDUP || v.st === ST_AIM) { v.st = ST_IDLE; v.stT = 0; } } } this.events.push({ t: 'arrowhit', x: p.x, y: p.y, z: p.z }); done = true; break; }
              if (p.bolt) { v.lastShotBy = p; p.hits++; this.applyDamage(v, 80, p.owner, p.vx * 0.05, 1, p.vz * 0.05, 'arrow', p.x, p.y, p.z); if (!v.dead && v.mass < 5) v.downT = Math.max(v.downT, 0.8); this.events.push({ t: 'arrowhit', x: p.x, y: p.y, z: p.z }); if (p.hits >= 3) { done = true; break; } continue; }
              // solid shot: bowl through
              const sp = len(p.vx, p.vz) || 1; const nx = p.vx / sp, nz = p.vz / sp;
              v.lastShotBy = p; p.hits++;
              const dmg = 60 + sp * 1.4;
              if (v.mass < 5) { v.downT = Math.max(v.downT, 1.5); v.st = ST_IDLE; v.stT = 0; v.blocking = false; v.aiming = false; }
              this.applyDamage(v, dmg, p.owner, nx * (6 + sp * 0.25), 5 + sp * 0.12, nz * (6 + sp * 0.25), 'solid', p.x, p.y, p.z);
              this.events.push({ t: 'solidhit', x: p.x, y: p.y, z: p.z });
              p.vx *= 0.78; p.vz *= 0.78; p.vy *= 0.6;
              if (len(p.vx, p.vz) < 7) { done = true; break; }
            }
          }
        }
        if (Math.abs(p.x) > HALF + 20 || Math.abs(p.z) > HALF + 20 || p.life > 12) done = true;
      }
      if (done) { ps[i] = ps[ps.length - 1]; ps.pop(); }
    }
  }
  explode(x, y, z, team, ownerId, radius, dmg) {
    if (this.ram && this.ram.hp > 0 && team !== 1 && team !== -1) { const dd = len(x - this.ram.x, z - this.ram.z); if (dd < radius + 1.5) this.damageRam(dmg * 2 * (1 - Math.min(1, dd / (radius + 1.5))), null); }
    if (this.gate && this.gate.hp > 0) { const g = this.boxes[this.gate.box]; const dd = len(x - g.x, z - g.z) - g.hw; if (dd < radius) this.damageGate(dmg * 1.6 * (1 - Math.max(0, dd) / radius)); }
    this.ignite(x, z, 0.55); this.ignite(x + 6, z, 0.25); this.ignite(x - 6, z, 0.25); this.ignite(x, z + 6, 0.25); this.ignite(x, z - 6, 0.25);
    this.events.push({ t: 'explosion', x, y, z, r: radius });
    const n = this.gatherNear(x, z, radius + 1.5);
    const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      const u = this.units[ids[i]]; if (u.dead || u.id === ownerId) continue;
      const dx = u.x - x, dz = u.z - z, dy = (u.y + 0.9) - y; const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const f = 1 - d / radius;
      let nx = dx, nz = dz; const hl = len(nx, nz); if (hl < 0.05) { nx = 1; nz = 0; } else { nx /= hl; nz /= hl; }
      const hv = 15 * f + 2, vv = 11 * f + 2.5;
      if (u.mass < 5) { u.downT = Math.max(u.downT, 1.7); u.st = ST_IDLE; u.stT = 0; u.blocking = false; u.aiming = false; }
      this.applyDamage(u, dmg * f + 8, ownerId, nx * hv, vv, nz * hv, 'explosion');
    }
  }
  // ---------- physics ----------
  integrate(u) {
    if (u.mount >= 0) { u.speedNow = Math.abs(this.units[u.mount].hspeed); u.walk += u.speedNow * DT; return; }
    const ground = terrainH(u.x, u.z);
    if (u.airborne || u.vy > 0) {
      u.vy -= GRAV * DT; u.y += u.vy * DT;
      u.x += u.vx * DT; u.z += u.vz * DT;
      if (u.y <= ground) {
        u.y = ground;
        if (u.vy < -8 && u.def.ai !== 'cannon') { u.downT = Math.max(u.downT, 1.2); this.events.push({ t: 'land', id: u.id, x: u.x, y: u.y, z: u.z, v: -u.vy }); if (u.vy < -13) this.applyDamage(u, (-u.vy - 13) * 2.4, -1, 0, 0, 0, 'fall'); }
        u.vy = 0; u.airborne = false; u.vx *= 0.5; u.vz *= 0.5;
      } else u.airborne = true;
    } else {
      u.y = ground;
      const dec = u.downT > 0 ? 0.9 : 0.8; u.vx *= dec; u.vz *= dec;
      if (u.vx < 0.02 && u.vx > -0.02) u.vx = 0; if (u.vz < 0.02 && u.vz > -0.02) u.vz = 0;
      const mm = u.downT > 0 ? 0 : 1;
      const fm = this.speedBoost(u); u.x += (u.mx * mm * fm + u.vx) * DT; u.z += (u.mz * mm * fm + u.vz) * DT;
    }
    if (u.x > HALF) u.x = HALF; else if (u.x < -HALF) u.x = -HALF;
    if (u.z > HALF) u.z = HALF; else if (u.z < -HALF) u.z = -HALF;
    u.speedNow = (u.mounted || u.type === 'horse') ? Math.abs(u.hspeed) : len(u.mx, u.mz);
    u.walk += u.speedNow * DT;
  }
  resolveCollisions() {
    const us = this.units, cs = this.cellSize, W = this.gridW;
    for (let i = 0; i < us.length; i++) {
      const u = us[i]; if (u.dead || u.mount >= 0) continue;
      const r = u.def.r;
      const cx = Math.floor((u.x + HALF + 5) / cs), cz = Math.floor((u.z + HALF + 5) / cs);
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox, gz = cz + oz; if (gx < 0 || gz < 0 || gx >= W || gz >= W) continue;
        const cell = gz * W + gx;
        let id = this.head[cell];
        while (id >= 0) {
          if (id > i) {
            const v = us[id];
            if (!v.dead && v.mount < 0 && !(u.team === v.team && ((u.ghostT || 0) > 0 || (v.ghostT || 0) > 0))) {
              const dx = v.x - u.x, dz = v.z - u.z, rr = r + v.def.r; const d2 = dx * dx + dz * dz;
              if (d2 < rr * rr && Math.abs(v.y - u.y) < 2) {
                let d = Math.sqrt(d2), nx, nz;
                if (d < 1e-4) { nx = ((id + i) & 1) ? 1 : -1; nz = 0; d = 1e-4; } else { nx = dx / d; nz = dz / d; }
                const pen = rr - d; const tot = u.mass + v.mass;
                const fu = v.mass / tot, fv = u.mass / tot;
                u.x -= nx * pen * fu; u.z -= nz * pen * fu; v.x += nx * pen * fv; v.z += nz * pen * fv;
                if (u.team !== v.team) {
                  const uc = (u.mounted || (u.type === 'horse' && u.rider >= 0)) && u.speedNow > 4.5;
                  const vc = (v.mounted || (v.type === 'horse' && v.rider >= 0)) && v.speedNow > 4.5;
                  if (uc && !v.mounted && v.type !== 'horse' && v.def.ai !== 'cannon') this.trample(u, v, nx, nz);
                  else if (vc && !u.mounted && u.type !== 'horse' && u.def.ai !== 'cannon') this.trample(v, u, -nx, -nz);
                }
              }
            }
          }
          id = this.next[id];
        }
        let oid = this.obsHead[cell];
        while (oid >= 0) {
          const o = this.obstacles[oid]; const dx = u.x - o.x, dz = u.z - o.z, rr = r + o.r; const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr) { let d = Math.sqrt(d2); let nx, nz; if (d < 1e-4) { nx = 1; nz = 0; d = 1e-4; } else { nx = dx / d; nz = dz / d; } const pen = rr - d; u.x += nx * pen; u.z += nz * pen; }
          oid = this.obsNext[oid];
        }
      }
      const bl = this.boxCells[this.cellOf(u.x, u.z)];
      if (bl) for (let k = 0; k < bl.length; k++) {
        const b = this.boxes[bl[k]]; if (b.kind === 'gate' && (u.type === 'hero' || b.hw < 0.1)) continue; if (b.lad && b.lad.up && Math.abs(u.x - b.lad.x) < (b.lad.w || 1.5)) continue;
        const ex = b.hw + r, ez = b.hd + r; const dx = u.x - b.x, dz = u.z - b.z;
        if (b.kind === 'sface' && u.airborne && u.y > terrainH(b.x, b.z) + 0.3) continue;
        if (dx > -ex && dx < ex && dz > -ez && dz < ez) {
          const px = ex - Math.abs(dx), pz = ez - Math.abs(dz);
          if (px < pz) u.x = b.x + (dx < 0 ? -ex : ex); else u.z = b.z + (dz < 0 ? -ez : ez);
        }
      }
    }
  }
  // ---------- champions (Heroes mode) ----------
  setClass(h, c) { h.hclass = c; h.def = CHAMPC[c][h.team]; h.hp = h.def.hp; h.weapon = h.def.weapons[0]; h.ammo = 1; h.loaded = true; h.cd = [0, 0, 0, 0]; h.st = ST_IDLE; h.stT = 0; h.braceT = 0; h.ironT = 0; h.guardT = 0; }
  champDodge(u, dx, dz, keys) {
    if (u.sta < 16 || (u.dodgeCd || 0) > 0 || u.st === ST_STUN || u.st === ST_RELEASE) return;
    u.sta -= 16; u.staT = 0; u.dodgeCd = 0.55; u.dodgeT = 0.34; u.iframe = 0.26; u.dodgeX = dx; u.dodgeZ = dz; u.dodgeFwd = !!(keys & KEY_W) && !(keys & KEY_S);
    if (u.st === ST_WINDUP || u.st === ST_RECOVER) { u.st = ST_IDLE; u.stT = 0; } u.blocking = false;
    const side = (keys & KEY_A) ? -1 : (keys & KEY_D) ? 1 : 0, back = (keys & KEY_S) ? 1 : 0;
    this.events.push({ t: 'dodge', id: u.id, x: u.x, y: u.y, z: u.z, side, back, fwd: u.dodgeFwd ? 1 : 0 });
  }
  champUpdate(u) {
    if (u.sta === undefined) { u.sta = 100; u.staT = 0; }
    u.staT += DT; if (u.staT > 0.35) u.sta = Math.min(100, u.sta + 42 * DT); if (u.sta < -10) u.sta = -10;
    if (u.dodgeCd > 0) u.dodgeCd -= DT; if (u.iframe > 0) u.iframe -= DT; if (u.tiredT > 0) u.tiredT -= DT;
    if (u.dodgeT > 0) { u.dodgeT -= DT; const sp = u.dodgeFwd ? 15 : 12; u.vx = u.dodgeX * sp; u.vz = u.dodgeZ * sp; if (u.dodgeT <= 0) { u.vx *= 0.1; u.vz *= 0.1; u.lunge = false; } }
    if (u.plunge && !u.airborne) { u.plunge = false; this.plungeHit(u); }
    if (u.st === ST_RECOVER && u.combo >= 2 && !u.comboPause) { u.comboPause = true; u.stT -= 0.35; } if (u.st !== ST_RECOVER) u.comboPause = false;
    for (let i = 0; i < 4; i++) if (u.cd[i] > 0) u.cd[i] -= DT;
    if (u.guardT > 0) u.guardT -= DT;
    if (u.spinT > 0) { u.spinT -= DT; if (u.spinT <= 0.3 && !u.spinHit) { u.spinHit = true; this.whirlHit(u); } }
    if (u.dashT > 0) { u.dashT -= DT; const sp = u.ironDash ? 17 : 22; u.vx = sin(u.dashYaw) * sp; u.vz = cos(u.dashYaw) * sp; this.dashHits(u); if (u.dashT <= 0) { u.vx *= 0.15; u.vz *= 0.15; } }
    if (!u.dead && u.hp < u.def.hp && this.tick - (u.lastHitTick || 0) > 30 * 4) u.hp = Math.min(u.def.hp, u.hp + 30 * DT);
    if (!u.dead) { const sp = this.scen.heroSpawn[u.team]; if (len(u.x - sp[0], u.z - sp[1]) < 10) u.hp = Math.min(u.def.hp, u.hp + 90 * DT); }
    for (let i = this.pickups.length - 1; i >= 0; i--) { const q = this.pickups[i]; if (this.tick > q.t) { this.pickups.splice(i, 1); continue; } if (!u.dead && len(q.x - u.x, q.z - u.z) < 1.8) { u.hp = Math.min(u.def.hp, u.hp + 260); u.sta = 100; this.pickups.splice(i, 1); this.events.push({ t: 'pickup', id: u.id, x: q.x, z: q.z }); } }
    if (u.ironT > 0) { u.ironT -= DT; u.downT = 0; if (u.st === ST_STUN) { u.st = ST_IDLE; u.stT = 0; } }
    if (u.braceT > 0) { u.braceT -= DT; this.braceThink(u); }
    if (u.castT > 0) { u.castT -= DT; if (u.castT <= 0) this.castExec(u, u.castK); }
    if (u.ctrl >= 0 && this.players[u.ctrl].aiChamp) this.champAI(u);
  }
  plungeHit(u) {
    const big = u.vault; u.vault = false; u.st = ST_RECOVER; u.stT = -0.25; const n = this.gatherNear(u.x, u.z, big ? 4.2 : 3.2); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b); let hits = 0;
    for (const id of ids) { const v = this.units[id]; if (v.dead || v === u || v.team === u.team || v.type === 'horse') continue; const d = len(v.x - u.x, v.z - u.z); if (d > (big ? 3.7 : 2.8) + v.def.r) continue;
      if (v.iframe > 0 || v.airborne) { this.events.push({ t: 'evade', id: v.id, x: v.x, y: v.y, z: v.z }); continue; }
      if (v.guardT > 0 && Math.abs(wrap(atan2(u.x - v.x, u.z - v.z) - v.yaw)) < 1.4) { u.st = ST_STUN; u.stT = 0; u.stunDur = 1.2; this.events.push({ t: 'guardcounter', x: v.x, y: v.y + 1.3, z: v.z, by: v.id, att: u.id }); return; }
      const nx = (v.x - u.x) / (d || 1), nz = (v.z - u.z) / (d || 1); if (v.mass < 5) { v.downT = Math.max(v.downT, v.champ ? 0.6 : 1.1); v.st = ST_IDLE; v.stT = 0; }
      this.applyDamage(v, (v.champ ? 60 : 90) * (big ? 1.2 : 1), u.id, nx * 6, 3, nz * 6, 'plunge'); hits++; }
    this.events.push({ t: 'slam', id: u.id, x: u.x, y: u.y, z: u.z, hits });
  }
  heroAbility(u, k) {
    if (u.dead || u.downT > 0 || u.st === ST_STUN || u.cd[k] > 0 || u.mount >= 0) return;
    const A = HCLASS[u.hclass | 0].abil[k]; u.cd[k] = A.cd; u.blocking = false; if (u.st !== ST_RECOVER) { u.st = ST_IDLE; u.stT = 0; }
    switch (A.key) {
      case 'whirl': u.spinT = 0.55; u.spinHit = false; break;
      case 'dash': u.dashT = 0.42; u.dashYaw = u.yaw; u.dashHit = []; u.ironDash = false; break;
      case 'guard': u.guardT = 2.0; break;
      case 'cry': this.warCry(u, 26, 9); break;
      case 'crescent': u.castK = 'crescent'; u.castT = 0.32; break;
      case 'vault': u.vy = 10.5; u.y += 0.05; u.airborne = true; u.vx = sin(u.yaw) * 11; u.vz = cos(u.yaw) * 11; u.plunge = true; u.vault = true; u.iframe = 0.5; break;
      case 'brace': u.braceT = 2.6; u.braceHit = []; break;
      case 'banner': this.warCry(u, 36, 12); break;
      case 'flame': u.castK = 'flame'; u.castT = 0.15; break;
      case 'tbomb': { const cp = cos(u.pitch + 0.28), v = 19; const ox = u.x + sin(u.yaw) * 0.5, oz = u.z + cos(u.yaw) * 0.5, oy = u.y + 1.7; this.projectiles.push({ kind: 'bomb', x: ox, y: oy, z: oz, vx: sin(u.yaw) * cp * v, vy: sin(u.pitch + 0.28) * v, vz: cos(u.yaw) * cp * v, team: u.team, owner: u.id, life: 0, hits: 0, fuse: 1.5, big: true }); this.events.push({ t: 'throw', id: u.id, x: ox, y: oy, z: oz }); break; }
      case 'smoke': this.smokes.push({ x: u.x + sin(u.yaw) * 3, z: u.z + cos(u.yaw) * 3, r: 7.5, t: this.tick + 30 * 9 }); break;
      case 'rockets': { let tx, tz; const tg = u.ctrlActive ? null : (u.target >= 0 ? this.units[u.target] : null);
        if (tg) { tx = tg.x; tz = tg.z; } else { const cp = cos(u.pitch), dx = sin(u.yaw) * cp, dy = sin(u.pitch), dz = cos(u.yaw) * cp; let t = this.rayTerrain(u.x, u.y + 1.6, u.z, dx, dy, dz, 90); if (!(t > 0)) t = 45; tx = u.x + dx * t; tz = u.z + dz * t; }
        this.rocketStrikes.push({ x: clamp(tx, -HALF, HALF), z: clamp(tz, -HALF, HALF), t: this.tick + 36, n: 9, team: u.team, owner: u.id }); this.events.push({ t: 'rocketcall', x: tx, z: tz, team: u.team }); break; }
      case 'quake': u.castK = 'quake'; u.castT = 0.42; break;
      case 'ironhorse': u.dashT = 0.5; u.dashYaw = u.yaw; u.dashHit = []; u.ironDash = true; break;
      case 'unbreak': u.ironT = 4.5; break;
      case 'rallyb': { u.hp = Math.min(u.def.hp, u.hp + u.def.hp * 0.3); const n = this.gatherNear(u.x, u.z, 26); for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.dead || v.team !== u.team || v === u || v.type === 'horse') continue; if (len(v.x - u.x, v.z - u.z) > 26) continue; v.hp = Math.min(v.def.hp, v.hp + v.def.hp * (v.champ ? 0.2 : 0.4)); v.cryT = 8; if (v.squad >= 0) { const sq = this.squads[v.squad]; sq.morale = Math.min(sq.moraleMax, sq.morale + 30); if (sq.routing) this.rallySquad(sq); } } this.events.push({ t: 'warcry', id: u.id, x: u.x, y: u.y, z: u.z, team: u.team, clash: false, rally: true }); break; }
    }
    this.events.push({ t: 'hab', id: u.id, k, key: A.key, x: u.x, y: u.y, z: u.z });
  }
  castExec(u, k) {
    if (u.dead || u.downT > 0) return;
    if (k === 'crescent') this.arcHit(u, 5.4, 1.95, 95, 60, 1.0, false, 'whirl');
    else if (k === 'quake') { this.arcHit(u, 6.8, 1.15, 80, 50, 1.4, true, 'whirl'); this.events.push({ t: 'quake', id: u.id, x: u.x, y: u.y, z: u.z, yaw: u.yaw }); }
    else if (k === 'flame') this.flameLance(u);
  }
  arcHit(u, R, arc, dmgS, dmgC, kd, ignoreGuard, cause) {
    const n = this.gatherNear(u.x, u.z, R + 1); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b); let hits = 0;
    for (const id of ids) { const v = this.units[id]; if (v.dead || v === u || v.team === u.team || v.type === 'horse') continue; const d = len(v.x - u.x, v.z - u.z); if (d > R + v.def.r) continue; if (Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)) > arc) continue;
      if (v.champ && (v.airborne || v.iframe > 0)) { this.events.push({ t: 'evade', id: v.id, x: v.x, y: v.y, z: v.z }); continue; }
      if (!ignoreGuard && v.guardT > 0 && Math.abs(wrap(atan2(u.x - v.x, u.z - v.z) - v.yaw)) < 1.4) { u.st = ST_STUN; u.stT = 0; u.stunDur = 1.3; this.events.push({ t: 'guardcounter', x: v.x, y: v.y + 1.3, z: v.z, by: v.id, att: u.id }); return; }
      const nx = (v.x - u.x) / (d || 1), nz = (v.z - u.z) / (d || 1); const blocked = !ignoreGuard && v.blocking && v.downT <= 0;
      if (!blocked && v.mass < 5) { v.downT = Math.max(v.downT, v.champ ? kd * 0.5 : kd); v.st = ST_IDLE; v.stT = 0; v.aiming = false; }
      this.applyDamage(v, (v.champ ? dmgC : dmgS) * (blocked ? 0.3 : 1) * (u.frenzyT > 0 ? 1.4 : 1), u.id, nx * 9, blocked ? 0 : 3.5, nz * 9, cause); hits++; }
    if (this.ram && this.ram.hp > 0 && u.team === 0 && len(this.ram.x - u.x, this.ram.z - u.z) < R) this.damageRam(220, u);
    if (this.gate && this.gate.hp > 0 && u.team === 1) { const g = this.boxes[this.gate.box]; if (Math.abs(u.x - g.x) < g.hw + R * 0.6 && Math.abs(u.z - g.z) < g.hd + R * 0.6) this.damageGate(200); }
    this.events.push({ t: 'whirl', id: u.id, x: u.x, y: u.y, z: u.z, hits, arc });
  }
  flameLance(u) {
    if (this.rain && this.rng.next() < 0.5) { this.events.push({ t: 'fizzle', id: u.id, x: u.x, y: u.y, z: u.z }); return; }
    const R = 6.8, arc = 0.55; const n = this.gatherNear(u.x, u.z, R + 1); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (const id of ids) { const v = this.units[id]; if (v.dead || v === u || v.team === u.team || v.type === 'horse') continue; const d = len(v.x - u.x, v.z - u.z); if (d > R) continue; if (Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)) > arc) continue;
      if (v.champ && v.iframe > 0) { this.events.push({ t: 'evade', id: v.id, x: v.x, y: v.y, z: v.z }); continue; }
      v.burnT = 3; v.flinchT = Math.max(v.flinchT, 0.8); if (v.st === ST_AIM || v.st === ST_WINDUP) { v.st = ST_IDLE; v.stT = 0; } this.applyDamage(v, v.champ ? 40 : 45, u.id, 0, 0, 0, 'fire');
      if (v.squad >= 0 && !this.squads[v.squad].def.fearless) this.squads[v.squad].morale = Math.max(0, this.squads[v.squad].morale - 3); }
    for (let k = 1; k <= 3; k++) this.ignite(u.x + sin(u.yaw) * k * 2, u.z + cos(u.yaw) * k * 2, 0.35);
    this.events.push({ t: 'flame', id: u.id, x: u.x, y: u.y, z: u.z, yaw: u.yaw });
  }
  braceThink(u) {
    if (this.tick % 4) return; const n = this.gatherNear(u.x, u.z, 4.4);
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.dead || v.team === u.team || v.type === 'horse') continue; const d = len(v.x - u.x, v.z - u.z); if (d > 3.8 + v.def.r) continue; if (Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)) > 0.95) continue; if (u.braceHit.indexOf(v.id) >= 0) continue;
      if (v.champ && (v.airborne || v.iframe > 0)) continue; u.braceHit.push(v.id);
      if (v.mass < 5) { v.downT = Math.max(v.downT, v.champ ? 0.8 : 1.2); v.st = ST_IDLE; v.stT = 0; } if (v.dashT > 0) { v.dashT = 0; v.vx = 0; v.vz = 0; v.st = ST_STUN; v.stT = 0; v.stunDur = 1.4; }
      this.applyDamage(v, v.champ ? 60 : 85, u.id, (v.x - u.x) / (d || 1) * 6, 2, (v.z - u.z) / (d || 1) * 6, 'spear'); this.events.push({ t: 'spearwall', x: v.x, y: v.y + 1.2, z: v.z, by: u.id, att: v.id }); }
  }
  smokeBlocks(ox, oz, tx, tz) {
    for (const sm of this.smokes) { if (this.tick > sm.t) continue; const dx = tx - ox, dz = tz - oz, L2 = dx * dx + dz * dz || 1; let k = ((sm.x - ox) * dx + (sm.z - oz) * dz) / L2; k = clamp(k, 0, 1); const qx = ox + dx * k - sm.x, qz = oz + dz * k - sm.z; if (qx * qx + qz * qz < sm.r * sm.r) return true; }
    return false;
  }
  strikesThink() {
    for (let i = this.smokes.length - 1; i >= 0; i--) if (this.tick > this.smokes[i].t) this.smokes.splice(i, 1);
    for (let i = this.rocketStrikes.length - 1; i >= 0; i--) { const r = this.rocketStrikes[i]; if (this.tick < r.t) continue; if ((this.tick - r.t) % 5 === 0) { const x = r.x + (this.rng.next() - 0.5) * 12, z = r.z + (this.rng.next() - 0.5) * 12; this.explode(x, terrainH(x, z) + 0.3, z, r.team, r.owner, 3.4, 75); this.ignite(x, z, 0.4); r.n--; if (r.n <= 0) this.rocketStrikes.splice(i, 1); } }
  }
  whirlHit(u) {
    const n = this.gatherNear(u.x, u.z, 4.2); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b); let hits = 0;
    for (const id of ids) { const v = this.units[id]; if (v.dead || v === u || v.team === u.team || v.type === 'horse') continue; const d = len(v.x - u.x, v.z - u.z); if (d > 3.8 + v.def.r) continue;
      const nx = (v.x - u.x) / (d || 1), nz = (v.z - u.z) / (d || 1);
      if (v.champ && (v.airborne || v.iframe > 0)) { this.events.push({ t: 'evade', id: v.id, x: v.x, y: v.y, z: v.z }); continue; }
      if (v.guardT > 0 && Math.abs(wrap(atan2(u.x - v.x, u.z - v.z) - v.yaw)) < 1.4) { u.st = ST_STUN; u.stT = 0; u.stunDur = 1.4; u.spinT = 0; this.events.push({ t: 'guardcounter', x: v.x, y: v.y + 1.3, z: v.z, by: v.id, att: u.id }); return; }
      const blocked = v.blocking && v.downT <= 0; const dm = (v.champ ? 55 : 80) * (blocked ? 0.3 : 1) * (u.frenzyT > 0 ? 1.4 : 1);
      if (!blocked && v.mass < 5) { v.downT = Math.max(v.downT, v.champ ? 0.5 : 1.0); v.st = ST_IDLE; v.stT = 0; v.aiming = false; }
      this.applyDamage(v, dm, u.id, nx * (blocked ? 3 : 9), blocked ? 0 : 3, nz * (blocked ? 3 : 9), 'whirl'); hits++;
    }
    if (this.gate && this.gate.hp > 0 && u.team === 1) { const g = this.boxes[this.gate.box]; if (Math.abs(u.x - g.x) < g.hw + 3 && Math.abs(u.z - g.z) < g.hd + 3) this.damageGate(220); }
    if (this.ram && this.ram.hp > 0 && u.team === 0 && len(this.ram.x - u.x, this.ram.z - u.z) < 4.8) this.damageRam(260, u);
    if (u.team === 0 && this.ladders) for (const L of this.ladders) if (L.up && Math.abs(u.x - L.x) < 3 && Math.abs(u.z - L.z) < L.hd + 3.5) { L.hp -= 400; if (L.hp <= 0) this.ladderDown(L); }
    this.events.push({ t: 'whirl', id: u.id, x: u.x, y: u.y, z: u.z, hits });
  }
  dashHits(u) {
    const n = this.gatherNear(u.x, u.z, 2.5);
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.dead || v === u || v.team === u.team || v.type === 'horse' || u.dashHit.indexOf(v.id) >= 0) continue; const d = len(v.x - u.x, v.z - u.z); if (d > 1.3 + v.def.r) continue;
      u.dashHit.push(v.id); if (v.champ && (v.iframe > 0 || v.airborne)) { this.events.push({ t: 'evade', id: v.id, x: v.x, y: v.y, z: v.z }); continue; }
      const facing = Math.abs(wrap(atan2(u.x - v.x, u.z - v.z) - v.yaw)) < 0.9;
      // counters: a braced spear or an iron guard stops the charge cold
      if (facing && ((v.weapon === 'yari' && !u.ironDash && v.downT <= 0 && !(v.squad >= 0 && this.squads[v.squad].routing)) || v.guardT > 0 || v.braceT > 0)) {
        u.dashT = 0; u.vx = -sin(u.dashYaw) * 4; u.vz = -cos(u.dashYaw) * 4; u.downT = Math.max(u.downT, v.guardT > 0 ? 1.4 : 1.0);
        this.applyDamage(u, v.guardT > 0 ? 40 : 70, v.id, 0, 0, 0, 'spear'); this.events.push({ t: v.guardT > 0 ? 'guardcounter' : 'spearwall', x: v.x, y: v.y + 1.2, z: v.z, by: v.id, att: u.id }); return; }
      const sx = -cos(u.dashYaw), sz = sin(u.dashYaw); const side = ((v.x - u.x) * sx + (v.z - u.z) * sz) >= 0 ? 1 : -1;
      if (v.mass < 5) { v.downT = Math.max(v.downT, v.champ ? 0.4 : 1.1); v.st = ST_IDLE; v.stT = 0; v.aiming = false; }
      if (u.ironDash) this.applyDamage(v, v.champ ? 35 : 50, u.id, sin(u.dashYaw) * 12, 3, cos(u.dashYaw) * 12, 'dash'); else this.applyDamage(v, v.champ ? 35 : 55, u.id, sx * side * 8 + sin(u.dashYaw) * 4, 3, sz * side * 8 + cos(u.dashYaw) * 4, 'dash');
    }
    if (this.ram && this.ram.hp > 0 && u.team === 0 && len(this.ram.x - u.x, this.ram.z - u.z) < 2.8) { this.damageRam(320, u); u.dashT = 0; u.vx = 0; u.vz = 0; }
    if (this.gate && this.gate.hp > 0 && u.team === 1) { const g = this.boxes[this.gate.box]; if (Math.abs(u.x - g.x) < g.hw + 1.5 && Math.abs(u.z - g.z) < g.hd + 1.5) { this.damageGate(300); u.dashT = 0; u.vx = 0; u.vz = 0; } }
  }
  warCry(u, R, dur) {
    R = R || 26; dur = dur || 9; let clash = false; const n = this.gatherNear(u.x, u.z, R); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (const id of ids) { const v = this.units[id]; if (v.dead || v.type === 'horse') continue; const d = len(v.x - u.x, v.z - u.z); if (d > R) continue;
      if (v.team === u.team) { v.cryT = dur; if (v.squad >= 0) { const sq = this.squads[v.squad]; sq.morale = Math.min(sq.moraleMax, sq.morale + 4); if (sq.routing && sq.morale > 50) this.rallySquad(sq); } }
      else { if (v.cryT > 0) { v.cryT = 0; clash = true; } if (d < 16 && !v.champ) { v.flinchT = Math.max(v.flinchT, 0.6); if (v.squad >= 0 && !this.squads[v.squad].def.fearless) this.squads[v.squad].morale = Math.max(0, this.squads[v.squad].morale - 1.5); } } }
    this.events.push({ t: 'warcry', id: u.id, x: u.x, y: u.y, z: u.z, team: u.team, clash });
  }
  damageGate(dmg) { if (!this.gate || this.gate.hp <= 0) return; this.gate.hp -= dmg; if (this.gate.hp <= 0) { this.gate.hp = 0; const g = this.boxes[this.gate.box]; this.events.push({ t: 'breach', x: g.x, z: g.z }); for (const sq of this.squads) if (sq.alive && !sq.def.fearless) { if (sq.team === 0) sq.morale = Math.max(0, sq.morale - 18); else sq.morale = Math.min(sq.moraleMax, sq.morale + 25); } this.explode(g.x, terrainH(g.x, g.z) + 1, g.z, -1, -1, 6, 90); g.hw = 0.01; g.hd = 0.01; g.h = 0; this.navBoxes(); this.setHPhase(2); } }
  setHPhase(ph) { if (this.hphase >= ph) return; this.hphase = ph; this.events.push({ t: 'hphase', ph, text: this.scen.text[ph] }); this.heroDirectives(); if (ph === 1 && this.gate.hp > 0) for (const sq of this.squads) if (sq.alive && sq.team === 0) { sq.morale = Math.min(sq.moraleMax, sq.morale + 20); } }
  heroDirectives() {
    const S2 = this.scen, g = S2.gate, c = S2.citadel, b = S2.bridge; let di = 0, ai = 0;
    for (const p of this.players) { if (!p.aiChamp) continue; const h = this.units[p.heroId]; const pt = this.hphase === 0 ? [b[0], b[1] + (p.team === 0 ? 3 : -3)] : this.hphase === 1 ? [g[0], g[1] - 3] : [c[0], c[1]]; h.slotX = pt[0]; h.slotZ = pt[1]; }
    for (const p of this.players) { if (!p.ai || p.aiChamp) continue;
      if (p.team === 0) { const i = di++; let pt;
        if (this.hphase === 0) pt = i === 0 ? [b[0], b[1] + 8] : i === 1 ? [c[0], c[1] - 6] : [0, S2.def[2] ? S2.def[2][3] : c[1] + 10];
        else if (this.hphase === 1) { const L = this.ladders[i % 2]; pt = i === 0 ? [b[0], b[1] + 8] : i === 1 && L ? [L.x, L.z + L.hd + 5] : [g[0], g[1] + 9]; }
        else pt = [c[0], c[1] - 2];
        p.directive = { kind: DIR_HOLD, x: pt[0], z: pt[1], by: -1 }; }
      else { const i = ai++; let pt;
        if (this.hphase === 0) pt = i === 2 ? [this.ram.x, this.ram.z + 6] : [b[0] + (i - 1) * 10, b[1] - 6];
        else if (this.hphase === 1) { const L = this.ladders[i]; pt = L && i < 2 ? (L.up ? [L.x, L.z + L.hd + 9] : [L.x, L.z - L.hd - 2.5]) : (this.ram.hp > 0 && !this.ram.atGate ? [this.ram.x, this.ram.z + 5] : [g[0], g[1] - 4]); }
        else pt = [c[0], c[1]];
        p.directive = { kind: this.hphase === 2 ? DIR_FLANK : DIR_HOLD, x: pt[0], z: pt[1], by: -1 }; } }
  }
  heroThink() {
    // respawning champions
    for (const p of this.players) { const h = this.units[p.heroId]; if (!h || !h.champ) continue;
      if (h.dead) { if (!p.respawnT) p.respawnT = this.tick + 30 * 6; else if (this.tick >= p.respawnT) { const sp = this.scen.heroSpawn[p.team]; if (this.hphase === 2 && p.team === 0) sp[1] = this.scen.citadel[1] + 8;
          h.dead = false; if (p.nextClass >= 0 && p.nextClass !== undefined) { this.setClass(h, p.nextClass); p.nextClass = -1; } h.hp = h.def.hp; h.x = sp[0]; h.z = sp[1]; h.y = terrainH(h.x, h.z); h.px = h.x; h.pz = h.z; h.py = h.y; h.vx = 0; h.vz = 0; h.vy = 0; h.downT = 0; h.st = ST_IDLE; h.stT = 0; h.mount = -1; h.mounted = false; h.deathTick = -1; h.guardT = 0; h.dashT = 0; h.spinT = 0; p.respawnT = 0; this.events.push({ t: 'respawn', id: h.id, p: p.idx }); } } }
    this.ramThink(); this.strikesThink();
    if (this.tick % 15 !== 0) return;
    // phase 0 → 1: the attackers take the bridge, or the outer works are gone, or four minutes pass
    if (this.hphase === 0) { const br = this.objectives[0]; let outer = 0; const dp = this.players.find(p => p.ai && !p.aiChamp && p.team === 0); if (dp) for (const id of dp.squads) if (this.squads[id].alive && !this.squads[id].routing) outer++;
      if (br.owner === 1 || outer === 0 || this.tick > 30 * 240) this.setHPhase(1); }
    // sappers: attackers pressed against the gate hack at it
    if (this.gate.hp > 0) { const g = this.boxes[this.gate.box]; let n = 0; const nn = this.gatherNear(g.x, g.z, g.hw + 4);
      for (let i = 0; i < nn; i++) { const v = this.units[this.nearBuf[i]]; if (v.dead || v.team !== 1 || v.type === 'horse' || v.champ) continue; if (Math.abs(v.x - g.x) < g.hw + 2.5 && Math.abs(v.z - g.z) < g.hd + 2.5) n++; }
      if (n && this.hphase >= 1) this.damageGate(n * 5); else if (n && this.hphase === 0) this.damageGate(n * 3); }
    if (this.hphase === 2) { const c = this.objectives[1]; if (c.owner === 1) this.citT += 15; }
    if (this.tick % 90 === 0) this.heroDirectives();
    this.laddersThink(); if (this.tick % 150 === 0) this.oilThink();
  }
  countNear(x, z, r, team) { let n = 0; const nn = this.gatherNear(x, z, r); for (let i = 0; i < nn; i++) { const v = this.units[this.nearBuf[i]]; if (v.dead || v.type === 'horse' || v.team !== team) continue; if (len(v.x - x, v.z - z) <= r) n++; } return n; }
  laddersThink() {
    let changed = false;
    for (const L of this.ladders) {
      const oz = L.z - L.hd - 1.4, iz = L.z + L.hd + 1.4; const a = this.countNear(L.x, oz, 3.5, 1), d = this.countNear(L.x, iz, 4, 0);
      if (!L.up) { if (a >= 3 && this.hphase >= 1) { L.prog += 15 * Math.min(3, a / 3); if (L.prog >= 30 * 7) { L.up = true; L.hp = 700; changed = true; this.events.push({ t: 'ladderup', x: L.x, z: L.z }); this.retarget(); } } else L.prog = Math.max(0, L.prog - 5); }
      else { const ai = this.countNear(L.x, iz, 4, 1); if (d > ai + 1) { L.hp -= (d - ai) * 12; } if (L.hp <= 0) this.ladderDown(L); }
    }
    if (changed) this.navBoxes();
  }
  ladderDown(L) { if (!L.up) return; L.up = false; L.prog = 0; L.hp = 0; const oz = L.z - L.hd - 1.4; const nn = this.gatherNear(L.x, oz, 3); const ids = []; for (let i = 0; i < nn; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (const id of ids) { const v = this.units[id]; if (v.dead || v.team !== 1 || v.champ || len(v.x - L.x, v.z - oz) > 3) continue; v.downT = Math.max(v.downT, 1.2); this.applyDamage(v, 40, -1, 0, 3, -4, 'fall'); if (v.squad >= 0) this.squads[v.squad].morale = Math.max(0, this.squads[v.squad].morale - 6); }
    this.events.push({ t: 'ladderdown', x: L.x, z: L.z }); this.navBoxes(); this.retarget(); }
  retarget() { if (this.tick % 1 === 0) this.heroDirectives(); }
  // the defenders' fire: pots of burning oil and gunpowder rolled onto men crowding the gate or a ladder foot
  oilThink() {
    const g = this.boxes[this.gate.box]; const spots = [];
    if (this.gate.hp > 0) spots.push([g.x, g.z - g.hd - 2.2, g.x, g.z + g.hd + 6]);
    for (const L of this.ladders) spots.push([L.x, L.z - L.hd - 1.8, L.x, L.z + L.hd + 4]);
    for (const sp of spots) { if (this.countNear(sp[0], sp[1], 5, 1) < 4 || this.countNear(sp[2], sp[3], 10, 0) < 1) continue;
      const x = sp[0] + (this.rng.next() - 0.5) * 3, z = sp[1] + (this.rng.next() - 0.5) * 2; const nn = this.gatherNear(x, z, 4.5); const ids = []; for (let i = 0; i < nn; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
      for (const id of ids) { const v = this.units[id]; if (v.dead || v.team !== 1 || v.type === 'horse') continue; const dd = len(v.x - x, v.z - z); if (dd > 4.5) continue; this.applyDamage(v, (v.champ ? 30 : 55) * (1 - dd / 6), -1, 0, 0, 0, 'fire'); if (v.squad >= 0 && !this.squads[v.squad].def.fearless) this.squads[v.squad].morale = Math.max(0, this.squads[v.squad].morale - 4); }
      if (!this.rain) { this.fireState[this.fireCell(x, z)] = 1; this.burnT[this.fireCell(x, z)] = 240; }
      this.events.push({ t: 'oil', x, z }); break; }
  }
  ramThink() {
    const r = this.ram; if (!r || r.hp <= 0) return;
    if (this.tick % 15 === 0) { let att = 0, def = 0; const n = this.gatherNear(r.x, r.z, 14);
      for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.dead || v.type === 'horse') continue; const d = len(v.x - r.x, v.z - r.z); if (d > 14) continue; if (v.team === 1) att++; else { def++; if (d < 3.2 && !v.champ) this.damageRam(5, null); } }
      r.moving = att >= 2 && !(def > att * 2); r.atGate = r.z >= r.stopZ - 0.05;
      if (r.atGate && this.gate.hp > 0) { this.damageGate(24); if (this.tick % 45 === 0) this.events.push({ t: 'ramhit', x: r.x, z: r.stopZ + 2 }); } }
    if (r.moving && !r.atGate && this.phase === 1) r.z = Math.min(r.stopZ, r.z + 2.0 * DT);
  }
  damageRam(dmg, by) { const r = this.ram; if (!r || r.hp <= 0) return; r.hp -= dmg; if (r.hp <= 0) { r.hp = 0; this.events.push({ t: 'ramdown', x: r.x, z: r.z }); for (const sq of this.squads) if (sq.alive && sq.team === 1 && !sq.def.fearless) sq.morale = Math.max(0, sq.morale - 10); this.explode(r.x, terrainH(r.x, r.z) + 1, r.z, -1, -1, 4, 40); } }
  champAI(u) {
    if (u.dead || u.downT > 0 || u.ctrlActive) return;
    const t = u.target >= 0 ? this.units[u.target] : null; if (!t || t.dead) return; const d = len(t.x - u.x, t.z - u.z);
    let near = 0; const n = this.gatherNear(u.x, u.z, 4); for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (!v.dead && v.team !== u.team && v.type !== 'horse') near++; }
    if (t.champ && d < 4.5 && !u.airborne) { const r = this.rng.next();
      if (t.spinT > 0 && r < 0.5) { u.vy = 8.2; u.y += 0.05; u.airborne = true; return; }
      if ((t.st === ST_WINDUP || t.dashT > 0) && r < 0.22 && u.sta >= 20) { const bx = -sin(u.yaw), bz = -cos(u.yaw); const side = this.rng.next() < 0.5 ? 1 : -1; const k = t.dashT > 0 ? 1 : 0; this.champDodge(u, k ? -cos(u.yaw) * side : bx, k ? sin(u.yaw) * side : bz, k ? (side > 0 ? KEY_D : KEY_A) : KEY_S); return; } }
    if (u.cd[0] <= 0 && near >= 3) this.heroAbility(u, 0);
    else if (u.cd[1] <= 0 && d > 5 && d < 11 && this.rng.next() < 0.2) { u.yaw = atan2(t.x - u.x, t.z - u.z); this.heroAbility(u, 1); }
    else if (u.cd[2] <= 0 && t.champ && t.st === ST_WINDUP && d < 4) this.heroAbility(u, 2);
    else if (u.cd[3] <= 0 && near >= 2) this.heroAbility(u, 3);
    const p = this.players[u.ctrl]; if (p.fury >= FURY_MAX) this.bushido(p, u);
  }
  // ---------- abilities ----------
  useAbility(sq, pidx) {
    const k = sq.ability, A = ABILITY[k]; sq.abOn = A.dur; sq.abT = A.cd;
    if (k === 'spearwall') { sq.order = ORD_HOLD; sq.tx = sq.cx; sq.tz = sq.cz; sq.formation = FORM_LINE; sq.cols = 0; }
    if (k === 'kiai') sq.morale = sq.moraleMax;
    this.events.push({ t: 'ability', sq: sq.id, kind: k, p: pidx, x: sq.cx, z: sq.cz });
  }
  abActive(u, k) { if (u.squad < 0) return false; const sq = this.squads[u.squad]; return sq.abOn > 0 && sq.ability === k; }
  dry(u) { return u.shots <= 0 && !u.champ && u.type !== 'hero' && u.ctrl < 0; }
  fatMul(u) { const f = u.fat || 0; return f > 85 ? 0.72 : f > 60 ? 0.86 : 1; }
  speedBoost(u) { return this.speedBoost0(u) * this.fatMul(u); }
  speedBoost0(u) { if (u.dashT > 0) return 1; if (this.sg && this.sgClimb(u)) return 0.5; if (u.flinchT > 0 && u.ctrl >= 0 && !u.mounted) return 0.6; if (u.guardT > 0) return 0.45; if (u.frenzyT > 0) return 1.25; if (u.cryT > 0) return 1.15; if (u.squad < 0) return 1; const sq = this.squads[u.squad]; if (sq.abOn <= 0) return 1; return sq.ability === 'kiai' ? 1.3 : sq.ability === 'wedge' ? 1.2 : 1; }
  canister(u, sq) {
    let best = null, bd = 50 * 50; const en = this.teamAlive[1 - u.team];
    for (let i = 0; i < en.length; i++) { const v = en[i]; const dx = v.x - u.x, dz = v.z - u.z, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; best = v; } }
    if (!best) return false;
    const yaw = atan2(best.x - u.x, best.z - u.z); u.yaw = yaw;
    for (let i = 0; i < 16; i++) this.fireRifle(u, yaw, 0.02, 0.13, 48, false, 55, 'canister');
    this.events.push({ t: 'cannon', id: u.id, x: u.x + sin(yaw) * 1.5, y: u.y + 1.05, z: u.z + cos(yaw) * 1.5, dx: sin(yaw), dy: 0.05, dz: cos(yaw) });
    u.loaded = false; this.startReload(u, u.def.cannon.reload, true); sq.abOn = 0; return true;
  }
  misfire(u) {
    if (!this.rain) return false; const r = u.def.rifle; if (!r) return false;
    const chance = r.mag > 1 ? 0.12 : 0.25; // matchlocks: a wet match or damp pan in every fourth shot
    return this.rng.next() < chance;
  }
  // ---------- objectives ----------
  objectivesThink() {
    for (let i = 0; i < this.objectives.length; i++) {
      const o = this.objectives[i]; if (o.hidden) continue; let n0 = 0, n1 = 0; const n = this.gatherNear(o.x, o.z, o.r);
      for (let k = 0; k < n; k++) { const v = this.units[this.nearBuf[k]]; if (v.dead || v.type === 'horse' || v.downT > 0) continue; if ((v.x - o.x) * (v.x - o.x) + (v.z - o.z) * (v.z - o.z) > o.r * o.r) continue; if (v.squad >= 0 && this.squads[v.squad].routing) continue; if (v.team === 0) n0++; else n1++; }
      o.n0 = n0; o.n1 = n1;
      if ((n0 > 0) !== (n1 > 0)) { const dir = n0 > 0 ? 1 : -1, cnt = n0 + n1; const prev = o.ctrl; o.ctrl = clamp(o.ctrl + dir * Math.min(cnt, 8) * 1.6 * (o.rate || 1), -100, 100);
        if (o.ctrl >= 100 && o.owner !== 0) { o.owner = 0; this.events.push({ t: 'capture', obj: i, team: 0 }); }
        else if (o.ctrl <= -100 && o.owner !== 1) { o.owner = 1; this.events.push({ t: 'capture', obj: i, team: 1 }); }
        else if ((prev > 0) !== (o.ctrl > 0) && o.owner >= 0 && ((o.owner === 0 && o.ctrl < 0) || (o.owner === 1 && o.ctrl > 0))) { this.events.push({ t: 'lost', obj: i, team: o.owner }); o.owner = -1; } }
    }
    if (this.tick % 30 === 0 && !this.heroMode && !this.mission) for (let i = 0; i < this.objectives.length; i++) { const o = this.objectives[i]; if (o.owner >= 0) this.score[o.owner]++; }
  }
  // ---------- naval bombardment ----------
  navalThink() {
    for (let i = this.navals.length - 1; i >= 0; i--) {
      const nv = this.navals[i]; if (this.tick < nv.t) continue;
      if ((this.tick - nv.t) % 12 === 0) {
        const tx = nv.x + (this.rng.next() * 2 - 1) * 15, tz = nv.z + (this.rng.next() * 2 - 1) * 15;
        this.projectiles.push({ kind: 'shell', x: tx - 36.7, y: 110, z: tz, vx: 15, vy: -18, vz: 0, team: nv.team, owner: -1, life: 0.3, hits: 0, naval: true });
        nv.n--; if (nv.n <= 0) this.navals.splice(i, 1);
      }
    }
  }
  // ---------- wildfire ----------
  initFuel() {
    const W = this.fireW, bio = this.bdef.biome; const base = bio === 'autumn' ? 0.8 : bio === 'summer' ? 0.4 : bio === 'spring' ? 0.3 : 0;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = -HALF + (i + 0.5) * FIRE_CS, z = -HALF + (j + 0.5) * FIRE_CS; let f = base;
      if (waterAt(x, z) !== 0 || this.zoneSpeed(x, z) < 0.5) f = 0;
      if (this.roadX !== undefined && Math.abs(x - this.roadX) < 4) f = 0;
      for (let b = 0; b < this.boxes.length; b++) { const q = this.boxes[b]; if ((q.kind === 'house' || q.kind === 'hall' || q.kind === 'palisade') && Math.abs(x - q.x) < q.hw + 3 && Math.abs(z - q.z) < q.hd + 3) f = 3; }
      this.fuel[j * W + i] = f;
    }
  }
  fireCell(x, z) { const i = Math.floor((x + HALF) / FIRE_CS), j = Math.floor((z + HALF) / FIRE_CS); if (i < 0 || j < 0 || i >= this.fireW || j >= this.fireW) return -1; return j * this.fireW + i; }
  ignite(x, z, chance) {
    if (this.rain) return; const c = this.fireCell(x, z); if (c < 0 || this.fireState[c] !== 0 || this.fuel[c] <= 0) return;
    if (this.rng.next() < chance * Math.min(1, this.fuel[c])) { this.fireState[c] = 1; this.burnT[c] = Math.round(330 * Math.min(this.fuel[c], 1.6)) + 150; this.events.push({ t: 'ignite', c, x, z }); }
  }
  fireThink() {
    const W = this.fireW, st = this.fireState; let any = false;
    for (let c = 0; c < st.length; c++) {
      if (st[c] !== 1) continue; any = true; this.burnT[c] -= 15;
      if (this.burnT[c] <= 0) { st[c] = 2; continue; }
      if (this.rain) continue;
      const i = c % W, j = (c / W) | 0; const nb = [[1, 0, 2.2], [-1, 0, 0.7], [0, 1, 1.6], [0, -1, 0.8]]; // the wind blows toward +x, +z
      for (let k = 0; k < 4; k++) { const ii = i + nb[k][0], jj = j + nb[k][1]; if (ii < 0 || jj < 0 || ii >= W || jj >= W) continue; const d = jj * W + ii; if (st[d] !== 0 || this.fuel[d] <= 0) continue; if (this.rng.next() < 0.011 * this.fuel[d] * nb[k][2]) { st[d] = 1; this.burnT[d] = Math.round(330 * Math.min(this.fuel[d], 1.6)) + 150; } }
    }
    if (!any) return;
    const us = this.units;
    for (let k = 0; k < us.length; k++) { const u = us[k]; if (u.dead || u.def.ai === 'cannon') continue; const c = this.fireCell(u.x, u.z); if (c >= 0 && st[c] === 1) { this.applyDamage(u, 4, -1, 0, 0, 0, 'fire'); if (u.squad >= 0 && !this.squads[u.squad].def.fearless) this.squads[u.squad].morale = Math.max(0, this.squads[u.squad].morale - 1.5); } }
  }
  // ---------- reinforcement waves (grand battle) ----------
  wavesThink() {
    for (let i = 0; i < this.objectives.length; i++) { const o = this.objectives[i]; if (o.owner >= 0) this.rp[o.owner] += 0.5; }
    for (let t = 0; t < 2; t++) this.rp[t] += 0.25;
    for (const w of this.waves) { if (w.released) continue; let act = 0, tot = 0; for (const u of this.teamAlive[w.team]) { tot++; if (!u.inactive) act++; }
      if (this.rp[w.team] >= 360 || act < tot * 0.3) this.releaseWave(w, false); }
  }
  releaseWave(w, called) {
    if (w.released) return; w.released = true; const pl = this.players[w.p]; pl.inactive = false;
    for (const id of pl.squads) { const q = this.squads[id]; q.inactive = false; for (const uid of q.unitIds) this.units[uid].inactive = false; q.order = ORD_MOVE; q.tz = q.cz + (w.team === 0 ? 40 : -40); q.tx = q.cx; }
    for (const uid of [pl.heroId, pl.horseId]) if (uid >= 0) this.units[uid].inactive = false;
    this.events.push({ t: 'wave', team: w.team, name: pl.name, called });
  }
  wagonThink() {
    for (const w of this.wagons) { if (w.burnt) continue; const e = this.countNear(w.x, w.z, 7, 1 - w.team), f = this.countNear(w.x, w.z, 12, w.team);
      if (e >= 2 && f === 0) { w.raid += 15; if (w.raid % 60 === 0) this.events.push({ t: 'raiding', wagon: w.id, team: w.team }); } else w.raid = Math.max(0, w.raid - 10);
      if (w.raid >= 30 * 6) { w.burnt = true; this.ignite(w.x, w.z, 1); this.events.push({ t: 'wagonburn', wagon: w.id, team: w.team, x: w.x, z: w.z });
        for (const sq of this.squads) if (sq.alive && sq.team === w.team && !sq.def.fearless) sq.morale = Math.max(0, sq.morale - 12);
        const n = this.gatherNear(w.x, w.z, 30); for (let i = 0; i < n; i++) { const u = this.units[this.nearBuf[i]]; if (!u.dead && u.team === w.team && u.shots > 4) u.shots -= 4; } } }
  }
  // ---------- weather that turns during the battle ----------
  weatherChange() {
    const W = this.wx; W.done = true;
    if (W.kind === 'fog') { this.fogMul = 0.62; this.rangeMul *= 0.7; W.lift = this.tick + 30 * 120; }
    else if (W.kind === 'rain') { this.rain = true; this.rangeMul *= 0.88; W.lift = this.tick + 30 * 150; }
    else if (W.kind === 'clear') { this.rain = false; this.rangeMul /= 0.88; }
    this.events.push({ t: 'weather', kind: W.kind });
  }
  weatherLift() { const W = this.wx; W.lift = 0; if (W.kind === 'fog') { this.fogMul = 1; this.rangeMul /= 0.7; this.events.push({ t: 'weather', kind: 'foglift' }); } else if (W.kind === 'rain') { this.rain = false; this.rangeMul /= 0.88; this.events.push({ t: 'weather', kind: 'clear' }); } }
  // ---------- chaos: the gods and the quartermasters intervene ----------
  chaosEvent() {
    this.nextChaos = this.tick + 30 * (12 + this.rng.int(9));
    const alive = this.teamAlive[0].concat(this.teamAlive[1]); if (!alive.length) return;
    const pick = () => alive[this.rng.int(alive.length)];
    const k = this.rng.int(6); let x = 0, z = 0; const c = pick(); x = c.x; z = c.z;
    if (k === 0) { for (let t = 0; t < 2; t++) { const v = this.teamAlive[t].length ? this.teamAlive[t][this.rng.int(this.teamAlive[t].length)] : c; this.navals.push({ x: v.x, z: v.z, t: this.tick + 120, n: 5, team: 1 - t }); this.events.push({ t: 'navalcall', x: v.x, z: v.z, team: 1 - t, p: -1 }); } }
    else if (k === 1) { for (const u of alive) { if (u.mass < 5 && this.rng.next() < 0.6) { u.downT = Math.max(u.downT, 0.8 + this.rng.next()); u.vy = 2.5; u.airborne = true; u.y += 0.05; } } }
    else if (k === 2) { this.explode(x + (this.rng.next() - 0.5) * 10, terrainH(x, z) + 0.5, z + (this.rng.next() - 0.5) * 10, -1, -1, 12, 220); for (let i = 0; i < 6; i++) this.ignite(x + (this.rng.next() - 0.5) * 24, z + (this.rng.next() - 0.5) * 24, 1); }
    else if (k === 3) { this.boltBurst = 5; }
    else if (k === 4) { const t = this.rng.int(2); x = t; for (const sq of this.squads) if (sq.alive && sq.team === t && sq.def.ai === 'melee') { sq.ability = 'kiai'; sq.abOn = ABILITY.kiai.dur; } }
    else if (k === 5) { for (const u of alive) if (u.type !== 'hero' && u.def.ai !== 'cannon' && this.rng.next() < 0.5) { u.frenzyT = 6; } }
    else if (k === 6) { }
    this.events.push({ t: 'chaos', kind: k, x, z });
  }
  // ---------- thunderstorm ----------
  stormThink() {
    if (this.tick < this.nextBolt) return; this.nextBolt = this.tick + 450 + Math.floor(this.rng.next() * 750);
    const cand = [];
    for (let i = 0; i < this.squads.length; i++) { const sq = this.squads[i]; if (!sq.alive) continue; const cap = this.units[sq.unitIds[0]]; if (!cap.dead && !cap.zfile) cand.push(cap); } // the storm does not pick off the story's own file
    if (!cand.length) return; const t = cand[Math.floor(this.rng.next() * cand.length)];
    const x = t.x, z = t.z, y = terrainH(x, z);
    this.events.push({ t: 'lightning', x, y, z });
    const n = this.gatherNear(x, z, 4); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (const id of ids) { const v = this.units[id]; if (v.dead) continue; const d = len(v.x - x, v.z - z); if (d > 4) continue; v.downT = Math.max(v.downT, 1.2); this.applyDamage(v, 95 * (1 - d / 5), -1, (v.x - x) * 2, 4, (v.z - z) * 2, 'lightning'); }
    if (t.squad >= 0) { const sq = this.squads[t.squad]; if (!sq.def.fearless) sq.morale = Math.max(0, sq.morale - 15); }
  }
  brushThink() { // 狼筅: a horse that runs onto the layered, spiked branches of a wolf-brush is snared and stopped — no swing needed
    for (let t = 0; t < 2; t++) for (const b of this.teamAlive[t]) {
      if (!b.def.brush || b.wounded || b.downT > 0 || b.st === ST_STUN || b.airborne || (b.brushT || 0) > this.tick) continue;
      const sq = b.squad >= 0 ? this.squads[b.squad] : null; if (sq && sq.routing) continue;
      const fx = sin(b.yaw), fz = cos(b.yaw), L = b.def.reach + 0.5;
      for (const v of this.teamAlive[1 - t]) { if (!(v.mounted || (v.type === 'horse' && v.rider >= 0))) continue; const sp = Math.abs(v.hspeed || 0); if (sp < 2.2) continue;
        const dx = v.x - b.x, dz = v.z - b.z, d2 = dx * dx + dz * dz; if (d2 > L * L) continue; const d = Math.sqrt(d2) || 1; if ((dx * fx + dz * fz) / d < 0.5) continue;
        b.brushT = this.tick + 21; v.hspeed *= 0.1; v.mx = 0; v.mz = 0; const rider = v.type === 'horse' ? this.units[v.rider] : v;
        this.applyDamage(v, 12 + sp * 2.5, b.id, fx * 2, 0.4, fz * 2, 'spear', v.x, v.y + 1.4, v.z);
        if (rider && !rider.dead) { rider.st = ST_STUN; rider.stT = 0; rider.stunDur = 0.9; rider.blocking = false; }
        this.events.push({ t: 'brushsnare', x: b.x + fx * L * 0.7, y: b.y + 1.6, z: b.z + fz * L * 0.7, by: b.id, att: v.id }); break; } }
  }
  trample(a, b, nx, nz) {
    const sp0 = a.speedNow, front = -(nx * sin(b.yaw) + nz * cos(b.yaw)); // > 0: the horse comes at b's face
    if (b.iframe > 0 || b.airborne) { if (b.hitT > 0.1) return; b.hitT = 0.4; this.events.push({ t: 'evade', id: b.id, x: b.x, y: b.y, z: b.z }); return; }
    const spearOut = b.weapon === 'yari' && front > 0.3 && b.st !== ST_STUN && (b.def.brush ? !b.wounded : b.ctrlActive ? (b.blocking || b.st === ST_WINDUP || b.st === ST_RELEASE) : (b.squad >= 0 && !this.squads[b.squad].routing && this.squads[b.squad].order === ORD_HOLD));
    if (spearOut && sp0 > 3) { // a braced spear stops a horse dead
      if (b.hitT > 0.1) return; b.hitT = 0.4; const rider = a.rider >= 0 ? this.units[a.rider] : a;
      this.applyDamage(a, 25 + sp0 * 11, b.id, -nx * 3, 1, -nz * 3, 'spear', a.x, a.y + 1.2, a.z); a.hspeed = 0; a.mx = 0; a.mz = 0; if (rider && !rider.dead) { rider.st = ST_STUN; rider.stT = 0; rider.stunDur = 0.9; }
      this.events.push({ t: 'spearwall', x: b.x, y: b.y + 1.2, z: b.z, by: b.id, att: a.id }); return; }
    if (this.abActive(b, 'spearwall') && b.downT <= 0) {
      const dot = -(nx * sin(b.yaw) + nz * cos(b.yaw)); // horse coming from b's front
      if (dot > 0.2) { if (b.hitT > 0.1) return; b.hitT = 0.3; const victim = a; this.applyDamage(victim, 55, b.id, -nx * 4, 1.5, -nz * 4, 'spear', a.x, a.y + 1.2, a.z); a.hspeed = 0; a.mx = 0; a.mz = 0; if (!victim.dead) { victim.downT = Math.max(victim.downT, 0.6); } this.events.push({ t: 'spearwall', x: b.x, y: b.y + 1.2, z: b.z }); return; }
    }
    if (b.hitT > 0.1 && b.downT > 0) return;
    if (b.hitT > 0.25) return; // already bowled aside by this pass
    const sp = a.speedNow; const att = a.rider >= 0 ? a.rider : a.id; const shielded = b.blocking && front > 0.3 && b.def.shield;
    // the horse bowls him aside: a shove off its line (and a little along it), a stagger, sometimes a fall; light damage
    const hy = a.type === 'horse' ? a.yaw : a.hyaw, fx = sin(hy), fz = cos(hy); const side = (b.x - a.x) * fz - (b.z - a.z) * fx >= 0 ? 1 : -1; const sx = fz * side, sz = -fx * side;
    const push = (shielded ? 2.6 : 4.2) * clamp(sp / 8, 0.6, 1.3);
    const killed = this.applyDamage(b, Math.min(sp * 2, 18) * (shielded ? 0.35 : 1) * (this.abActive(a.rider >= 0 ? this.units[a.rider] : a, 'wedge') ? 1.4 : 1), att, sx * push + fx * 1.6, 0.8, sz * push + fz * 1.6, 'trample', b.x, b.y + 1, b.z);
    if (!killed) { b.hitT = 0.4; b.blocking = false; if (b.st === ST_WINDUP || b.st === ST_AIM) { b.st = ST_IDLE; b.stT = 0; }
      if (this.rng.next() < (shielded ? 0.08 : 0.24) * clamp(sp / 8, 0.5, 1.3)) b.downT = Math.max(b.downT, 1.1); else b.flinchT = Math.max(b.flinchT, 0.45);
      if (b.squad >= 0) { const sq = this.squads[b.squad]; if (!sq.def.fearless) sq.morale = Math.max(0, sq.morale - 2.5); } }
    a.hspeed *= shielded ? 0.75 : 0.94; // each man knocked aside costs the horse a little pace; deep, braced ranks still stop it
    this.events.push({ t: 'trample', x: b.x, y: b.y, z: b.z, sx, sz, down: b.downT > 0 });
  }
}
// ===== Scripted battles: the co-op commander campaign and Assault operations =====
// A mission is a real battle with a script on top: AI generals command named groups (some waiting off-field as
// reserves), and the script moves through phases — march, ambush, relief, assault, last stand — releasing streams of
// enemies, showing objectives and ending the mission. Every number is deterministic, so peers stay in lockstep.
const WOKOU = { samurai: ['Wokou swordsmen', '倭刀手'], byakkotai: ['Pirate rabble', '海寇'], archer: ['Wokou archers', '倭弓手'], rifle_sho: ['Wokou arquebusiers', '鐵炮手'], shinsengumi: ["Pirate lord's guard", '親衛'], ashigaru: ['Pirate pikemen', '長槍寇'] };
const MISSIONS = {
  taizhou: {
    title: '台州大捷 · Victory at Taizhou', year: 'Summer 1561', battle: 'nagaoka', side: 0, soloExtra: 'yuanyang',
    brief: 'Japanese pirates and their Chinese allies have landed on the Zhejiang coast. Qi Jiguang\'s new army — miners from Yiwu drilled in the mandarin duck formation — marches to save the villages around Taizhou. You lead a squad in his column.',
    start: [0, -118, 0],
    zones: [{ key: 'cross', x: 40, z: 0, r: 14, name: 'Huaxin crossroads' }, { key: 'village', x: 10, z: 70, r: 20, name: 'Huaxin village', owner: 0 }, { key: 'stockade', x: -58, z: 116, r: 15, name: 'Pirate stockade', owner: 1, rate: 0.6 }],
    forts: [[-2, 62, 3.5, 3, 3.4, 'house'], [22, 64, 3, 3.5, 3.2, 'house'], [-6, 82, 3.5, 3, 3.4, 'house'], [26, 84, 3, 3, 3.2, 'house'], [10, 92, 4, 3, 3.6, 'hall'],
      [-73, 116, 0.5, 15, 2.4, 'palisade'], [-43, 116, 0.5, 15, 2.4, 'palisade'], [-58, 131, 15, 0.5, 2.4, 'palisade'], [-68, 101, 5, 0.5, 2.4, 'palisade'], [-48, 101, 5, 0.5, 2.4, 'palisade'], [-58, 122, 4, 3, 3, 'house']],
    labels: WOKOU,
    groups: {
      qi: { team: 0, name: 'Qi Jiguang', zh: '戚繼光', army: ['yuanyang', 'yuanyang', 'rifle_imp', 'yuanyang'], at: [-24, -132, 0], dir: ['support'] },
      militia: { team: 0, name: 'Huaxin militia', zh: '鄉勇', army: ['ronin', 'ronin'], at: [10, 74, PI], dir: ['hold', 10, 74] },
      amb1: { team: 1, name: 'Ambushers (west)', army: ['byakkotai', 'samurai'], at: [-58, -40, PI / 2], reserve: true },
      amb2: { team: 1, name: 'Ambushers (east)', army: ['byakkotai', 'archer'], at: [78, -34, -PI / 2], reserve: true },
      raid: { team: 1, name: 'Raider captain', zh: '倭首', officer: 3.5, army: ['samurai', 'byakkotai', 'byakkotai', 'archer'], at: [14, 112, PI], reserve: true },
      str1: { team: 1, name: 'Pirate band', army: ['byakkotai', 'samurai'], at: [40, 140, PI], reserve: true },
      str2: { team: 1, name: 'Pirate band', army: ['archer', 'byakkotai'], at: [-10, 140, PI], reserve: true },
      str3: { team: 1, name: 'Pirate band', army: ['samurai', 'archer'], at: [70, 135, PI], reserve: true },
      stk: { team: 1, name: 'Stockade garrison', army: ['archer', 'archer', 'samurai', 'archer'], at: [-58, 120, PI], dir: ['hold', -58, 116] },
      flank: { team: 1, name: 'River pirates', army: ['byakkotai', 'byakkotai', 'samurai'], at: [-88, 30, 0.4], reserve: true },
      king: { team: 1, name: 'Mao Haifeng, the pirate lord', zh: '毛海峰', officer: 6, army: ['shinsengumi', 'shinsengumi', 'archer', 'samurai'], at: [-64, 140, PI], reserve: true, exit: [-140, 140] },
    },
    phases: [
      { title: 'I · The coast road', text: 'March north with Qi Jiguang\'s column to the Huaxin crossroads. The pirates know these paddies better than you do.', show: ['cross'],
        obj: { all: [{ reach: 'cross' }, { defeat: ['amb1', 'amb2'], frac: 0.7 }] }, waves: [[80, 'amb1'], [92, 'amb2']],
        say: [[2, 'Qi Jiguang', 'Keep the duck teams tight on the dikes. A pirate alone is a tiger; in a ditch he is nothing.'], [84, 'Scout', 'Swords in the rice! Both flanks — they were lying in the water!'], [100, 'Qi Jiguang', 'Shields front! Wolf-brushes, snare them! Spears, kill what the brushes hold!']],
        done: [['say', 'Qi Jiguang', 'Good. Now — smoke over Huaxin. They are burning the village.']] },
      { title: 'II · Smoke over Huaxin', text: 'Pirates are plundering Huaxin. Drive them out, cut down their captain, and hold the village while more bands come down from the hills.', show: ['village'], hide: ['cross'],
        start: [['release', 'raid'], ['dir', 'raid', 'hold', 10, 74], ['dir', 'qi', 'hold', 10, 60]],
        obj: { all: [{ officer: 'raid' }, { hold: 'village', t: 75 }] }, waves: [[70, 'str1'], [170, 'str2'], [260, 'str3']],
        say: [[3, 'Village elder', 'They took the grain and the girls are hiding in the temple — please, hurry!'], [72, 'Scout', 'More of them coming down the north road!'], [175, 'Qi Jiguang', 'Hold the village. Let them come to us and die on the duck teams.']],
        done: [['say', 'Qi Jiguang', 'Their nest is the stockade by the river. We end this today.'], ['dir', 'militia', 'hold', 10, 70]] },
      { title: 'III · The stockade', text: 'Storm the pirate stockade on the riverbank. Arquebusiers hold the palisade; expect the river pirates to strike your flank.', show: ['stockade'], hide: ['village'],
        start: [['dir', 'qi', 'hold', -58, 112]],
        obj: { capture: ['stockade'] }, waves: [[110, 'flank']],
        say: [[2, 'Qi Jiguang', 'Muskets, keep their heads down. Duck teams go over the palisade together, not one by one.'], [112, 'Scout', 'Boats on the river — they are landing behind us!']],
        done: [['say', 'Scout', 'The pirate lord himself — Mao Haifeng — he is running for the boats!']] },
      { title: 'IV · The pirate lord', text: 'Mao Haifeng and his guard are breaking out toward the river. Cut him down before he reaches his ships.', start: [['release', 'king'], ['dir', 'king', 'hold', -40, 100]],
        obj: { officer: 'king' }, limit: 420, fail: 'Mao Haifeng reached his ships and escaped to sea.',
        say: [[3, 'Qi Jiguang', 'Do not let him reach the water! His head is worth a thousand of his men!']] },
    ],
    win: 'Taizhou is saved. In nine battles that summer Qi Jiguang\'s army destroyed the pirate bands, and the mandarin duck formation became famous across the empire.',
  },
  ningyuan: {
    title: '寧遠之戰 · The Defense of Ningyuan', year: 'February 1626', battle: 'hakodate', side: 0, soloExtra: 'rifle_imp',
    brief: 'Nurhaci, undefeated in forty years, leads the Eight Banners across the frozen Liao River. Every Ming general has fled except one: Yuan Chonghuan, who stays in Ningyuan with eleven "red barbarian" cannon and swears in blood to hold. You command a company of his garrison.',
    start: [0, 88, PI],
    zones: [{ key: 'village', x: -52, z: -18, r: 18, name: 'Outer village' }, { key: 'sgate', x: 0, z: 30, r: 12, name: 'South gate', owner: 0 }, { key: 'citadel', x: 0, z: 74, r: 16, name: 'Ningyuan citadel', owner: 0, rate: 0.5 }, { key: 'camp', x: 62, z: -98, r: 17, name: 'Jin siege camp', owner: 1, rate: 0.7 }],
    forts: [[-60, -12, 3, 3, 3.2, 'house'], [-42, -26, 3.5, 3, 3.2, 'house'], [-62, -32, 3, 3, 3, 'house'], [-38, -8, 3, 3.5, 3.2, 'house'],
      [47, -98, 0.5, 14, 2, 'palisade'], [77, -98, 0.5, 14, 2, 'palisade'], [62, -112, 14, 0.5, 2, 'palisade'], [62, -96, 4, 3, 2.6, 'house'], [54, -104, 3, 2, 2.4, 'house']],
    groups: {
      yuan: { team: 0, name: 'Yuan Chonghuan', zh: '袁崇煥', army: ['rifle_imp', 'rifle_imp', 'armstrong', 'armstrong', 'samurai', 'armstrong'], at: [0, 76, PI], dir: ['hold', 0, 60] },
      man: { team: 0, name: 'Man Gui', zh: '滿桂', army: ['cavalry', 'cavalry', 'ashigaru'], at: [-30, 100, PI], dir: ['hold', -20, 70] },
      villagers: { team: 0, name: 'Villagers', zh: '百姓', army: ['ronin', 'ronin'], at: [-52, -20, PI], dir: ['hold', -52, -18] },
      camp: { team: 1, name: 'Siege camp guard', army: ['samurai', 'archer', 'ashigaru'], at: [62, -100, PI], dir: ['hold', 62, -98] },
      scouts: { team: 1, name: 'Jin scouts', army: ['cavalry', 'byakkotai', 'cavalry'], at: [-100, -130, 0.4], reserve: true },
      w1: { team: 1, name: 'Bordered Blue Banner', army: ['samurai', 'samurai', 'archer', 'archer', 'cavalry'], at: [-40, -140, 0], reserve: true },
      w2: { team: 1, name: 'Plain Red Banner', army: ['samurai', 'ashigaru', 'archer', 'archer', 'cannon4'], at: [40, -140, 0], reserve: true },
      w3: { team: 1, name: 'Bordered White Banner', army: ['samurai', 'byakkotai', 'byakkotai', 'archer'], at: [-115, -100, 0.7], reserve: true },
      nur: { team: 1, name: 'Nurhaci', zh: '努爾哈赤', officer: 7, wound: 0.45, army: ['shinsengumi', 'shinsengumi', 'samurai', 'cavalry'], at: [0, -140, 0], reserve: true, exit: [0, -150] },
    },
    phases: [
      { title: 'I · Scorched earth', text: 'Yuan Chonghuan has ordered the suburbs burned and the people brought inside the walls. Ride out to the outer village and bring the villagers home before the banners arrive.', show: ['village'],
        start: [['dir', 'man', 'hold', -40, 10]],
        obj: { all: [{ reach: 'village' }, { arrive: 'villagers', zone: 'sgate' }, { defeat: ['scouts'], frac: 0.6 }] }, waves: [[75, 'scouts']],
        at: [[20, ['dir', 'villagers', 'hold', 0, 20]]],
        say: [[2, 'Yuan Chonghuan', 'Leave the Jin nothing: no roof, no grain, no well. Bring every soul inside.'], [78, 'Scout', 'Horsemen on the ice! Jin scouts, coming for the village!']],
        done: [['say', 'Yuan Chonghuan', 'Close the gates. Gunners to the walls.'], ['dir', 'man', 'hold', -20, 66], ['hide', 'village']] },
      { title: 'II · The Eight Banners', text: 'The Jin host arrives. Hold the south gate and the walls; the Hongyipao on the citadel will do the rest. If the citadel falls, Ningyuan falls.', show: ['sgate', 'citadel'],
        start: [['release', 'w1'], ['dir', 'w1', 'hold', 0, 30]],
        obj: { survive: 400, keep: 'citadel' }, waves: [[110, 'w2', ['hold', 0, 30]], [240, 'w3', ['hold', -30, 60]]],
        say: [[3, 'Yuan Chonghuan', 'Let them come close. Then the red cannon speak.'], [112, 'Lookout', 'Plain Red Banner — and they have guns of their own!'], [245, 'Lookout', 'Bordered White on the west wall!'], [330, 'Yuan Chonghuan', 'Hold! The ice is red with them!']],
        done: [['say', 'Lookout', 'The yellow umbrella — it is Nurhaci himself! He leads the last assault!']] },
      { title: 'III · The Khan', text: 'Nurhaci and his Bayara guard throw themselves at the gate. Stop them. A wounded Khan will not stay on the field.', show: ['sgate', 'citadel'],
        start: [['release', 'nur'], ['dir', 'nur', 'hold', 0, 30]],
        obj: { officer: 'nur', keep: 'citadel' },
        say: [[3, 'Yuan Chonghuan', 'Every gun on the yellow umbrella!'], [120, 'Lookout', 'He is still coming!']],
        done: [['say', 'Lookout', 'He is hit! The Khan is hit — they are carrying him back!']] },
      { title: 'IV · Sortie', text: 'The banners waver. Sally out with Man Gui\'s cavalry and burn the Jin siege camp before they recover.', show: ['camp'], hide: ['sgate'],
        start: [['dir', 'man', 'hold', 62, -98], ['dir', 'yuan', 'hold', 0, 40]],
        obj: { capture: ['camp'] },
        say: [[3, 'Man Gui', 'Horses! For once it is our turn to ride them down!']] },
    ],
    win: 'Ningyuan held. Nurhaci, wounded, never recovered and died that autumn. It was the first defeat the Jin had ever suffered.',
  },
  hunriver: {
    title: '渾河血戰 · Blood on the Hun River', year: 'May 1621', battle: 'toba', side: 0, soloExtra: 'ashigaru',
    brief: 'Shenyang is under attack. A relief army of Sichuan "White Pole" spearmen under Qin Bangping and Zhejiang musketeers under Chen Ce marches to save it. You command a company of the relief.',
    start: [10, -112, 0],
    zones: [{ key: 'bridgehead', x: 0, zr: 34, r: 16, name: 'North bank', owner: 1, rate: 0.7 }, { key: 'camp', x: -42, z: -62, r: 22, name: 'Zhejiang camp', owner: 0, rate: 0.5 }, { key: 'guns', x: 60, z: 100, r: 15, name: 'The captured guns', owner: 1, rate: 0.7 }, { key: 'ebridge', x: 74, zr: -20, r: 13, name: 'Road east' }],
    forts: [[-64, -62, 0.5, 14, 1.6, 'palisade'], [-20, -62, 0.5, 14, 1.6, 'palisade'], [-42, -40, 14, 0.5, 1.6, 'palisade'], [-34, -66, 2, 2, 1.4, 'mantlet'], [-50, -58, 2, 2, 1.4, 'mantlet'],
      [52, 112, 6, 0.5, 1.6, 'palisade'], [68, 112, 6, 0.5, 1.6, 'palisade']],
    groups: {
      qin: { team: 0, name: 'Qin Bangping (White Poles)', zh: '秦邦屏', army: ['ashigaru', 'ashigaru', 'ashigaru', 'samurai'], at: [-18, -104, 0], dir: ['support'] },
      chen: { team: 0, name: 'Chen Ce (Zhejiang)', zh: '陳策', army: ['rifle_imp', 'rifle_imp', 'yuanyang', 'armstrong'], at: [-42, -66, 0], dir: ['hold', -42, -60] },
      nb: { team: 1, name: 'Bridgehead guard', army: ['samurai', 'archer', 'archer'], at: [0, 46, PI], dir: ['hold', 0, 40] },
      cav1: { team: 1, name: 'Banner horse', army: ['cavalry', 'cavalry', 'cavalry'], at: [-130, 70, PI], reserve: true },
      inf1: { team: 1, name: 'Plain Yellow Banner', army: ['samurai', 'samurai', 'ashigaru', 'archer'], at: [0, 140, PI], reserve: true },
      guns: { team: 1, name: 'Han Banner gunners', army: ['rifle_sho', 'archer', 'cannon4', 'cannon4'], at: [60, 118, PI], reserve: true },
      ht: { team: 1, name: 'Hong Taiji', zh: '皇太極', officer: 6, army: ['shinsengumi', 'samurai', 'cavalry'], at: [-60, 140, PI], reserve: true },
      cut: { team: 1, name: 'Bordered Yellow Banner', army: ['cavalry', 'samurai', 'byakkotai'], at: [125, -40, -PI / 2], reserve: true },
    },
    phases: [
      { title: 'I · Across the Hun', text: 'Cross the river at the ford with the White Poles and take the north bank. Shenyang lies beyond.', show: ['bridgehead'],
        obj: { capture: ['bridgehead'] },
        say: [[2, 'Qin Bangping', 'Sichuan men do not stop for cold water. Over the ford, spears first!'], [60, 'Chen Ce', 'Our muskets will cover you from the south bank.']],
        done: [['say', 'Messenger', 'General! Shenyang fell yesterday — traitors opened the gates! The whole Jin army is coming out!']] },
      { title: 'II · Shenyang has fallen', text: 'There is nothing left to relieve. Fall back across the river to the Zhejiang camp and hold it against the banners.', show: ['camp'], hide: ['bridgehead'],
        start: [['release', 'cav1'], ['dir', 'qin', 'hold', -42, -50]],
        obj: { all: [{ reach: 'camp' }, { survive: 300 }], keep: 'camp' }, waves: [[50, 'inf1', ['hold', -42, -60]]],
        say: [[3, 'Chen Ce', 'Into the camp! Wagons and palisades — make them pay for every step.'], [55, 'Lookout', 'Yellow banners crossing the ice!'], [200, 'Qin Bangping', 'My spears hold. Do not waste a ball.']],
        done: [['say', 'Lookout', 'Guns! They have dragged our own cannon from Shenyang onto the far bank!']] },
      { title: 'III · The captured guns', text: 'The Jin are turning captured Ming cannon on the camp. Cross back and silence the guns, then deal with Hong Taiji\'s guard.', show: ['guns'],
        start: [['release', 'guns'], ['dir', 'guns', 'hold', 60, 104], ['dir', 'qin', 'hold', 58, 96], ['dir', 'chen', 'hold', 40, 40]],
        obj: { all: [{ capture: ['guns'] }, { defeat: ['guns'], frac: 0.6 }] }, waves: [[100, 'ht', ['hold', 20, 40]]],
        say: [[3, 'Chen Ce', 'Spike those guns or we all die in this camp.'], [104, 'Lookout', 'Hong Taiji\'s guard is coming down the bank!']],
        done: [['say', 'Qin Bangping', 'Enough. We cannot win this field. Get the men out to the east road — my White Poles will hold the rear.']] },
      { title: 'IV · The road east', text: 'Break out to the east road with what is left of your company. The Bordered Yellow Banner is moving to cut you off.', show: ['ebridge'], hide: ['guns', 'camp'],
        start: [['release', 'cut'], ['dir', 'cut', 'hold', 74, -10], ['dir', 'qin', 'hold', 30, -20]],
        obj: { all: [{ reach: 'ebridge' }, { survive: 150 }] }, limit: 480, fail: 'The Jin closed the east road. None of the relief army escaped.',
        say: [[3, 'Qin Bangping', 'Go! Tell them in Sichuan we did not run.'], [60, 'Chen Ce', 'Hold the road open until the wounded are across — then we go!'], [120, 'Chen Ce', 'Almost there — keep the road!']] },
    ],
    win: 'You broke out. Qin Bangping and the White Poles died to the last man on the Hun River; the Jin themselves called it the hardest fight of the war.',
  },

  // ===== 浙兵 · The Zhejiang Company (story campaign): chapter battles you fight as one man in a mandarin duck team =====
  abudali: {
    title: '阿布達里岡 · Abudali Pass', year: 'April 1619', battle: 'abudali', side: 0, soldier: { group: 'liu' }, hidden: true,
    brief: 'Liu Ting\'s eastern column has marched for weeks through the mountains toward Hetu Ala, burning Jin stockades as it goes. Your mandarin duck team marches near the head of the column.',
    start: [0, -100, 0],
    zones: [{ key: 'mouth', x: 0, z: -134, r: 15, name: 'The south gorge' }],
    groups: {
      liu: { team: 0, name: 'Liu Ting', zh: '劉綎', army: ['yuanyang', 'yuanyang', 'rifle_imp', 'yuanyang', 'rifle_imp'], at: [0, -100, 0], dir: ['hold', 0, -64] },
      tusi: { team: 0, name: 'Sichuan and Miao levies', zh: '川黔土兵', army: ['ashigaru', 'ashigaru', 'samurai'], at: [0, -72, 0], dir: ['hold', 0, -40] },
      kang: { team: 0, name: 'Kang Yingqian\'s rearguard', zh: '康應乾', army: ['rifle_imp', 'armstrong', 'ashigaru'], at: [0, -128, 0], dir: ['hold', 0, -112] },
      daisan: { team: 1, name: 'Daišan', zh: '代善', army: ['cavalry', 'samurai', 'samurai', 'archer', 'cavalry'], at: [0, 138, PI], reserve: true },
      hong: { team: 1, name: 'Hong Taiji', zh: '皇太極', army: ['cavalry', 'cavalry', 'samurai', 'samurai', 'byakkotai', 'archer'], at: [-104, 0, PI / 2], reserve: true },
      ridge: { team: 1, name: 'Archers on the east ridge', army: ['archer'], at: [72, -20, -PI / 2], reserve: true, stay: true, dir: ['hold', 34, -24] },
      chase: { team: 1, name: 'Jin horsemen', army: ['cavalry', 'cavalry', 'byakkotai'], at: [-92, -104, PI / 2], reserve: true },
      chase2: { team: 1, name: 'Jin horsemen', army: ['cavalry', 'samurai'], at: [92, -118, -PI / 2], reserve: true },
    },
    phases: [
      { title: '一 · 入谷 · Into the valley', goal: 'March up the valley with your file', text: 'March with the column up the valley toward Hetu Ala. Keep up with your file.',
        obj: { survive: 58 },
        at: [[18, ['dir', 'liu', 'hold', 0, -50]], [34, ['dir', 'liu', 'hold', 0, -32]], [34, ['dir', 'tusi', 'hold', 0, -4]]],
        say: [[2, 'liu', 'Three Jin stockades burned in three days and their villages empty. The slave chief is afraid of us!', '三日連破三寨，奴酋怯矣！'],
          [10, 'chief', 'Keep the file closed up. Mountains like these have eyes.', '跟緊，莫掉隊。這山裏有眼睛。'],
          [24, 'rider', 'From Commander Du Song! He is already before Hetu Ala — he bids you make haste or miss the kill!', '杜總兵已薄赫圖阿拉，請速進兵！'],
          [31, 'liu', 'Du Song takes the Khan\'s head while we crawl through these hills? Double pace! The guns can follow!', '杜松欲獨得首功耶？倍道而進！'],
          [40, 'fang', 'A rider from Du Song, come this way through Jin country? Who let him through the passes?', '杜總兵的人，怎麼從金人地界過來的？'],
          [50, 'chief', 'Double pace, and the guns half a li behind. This is how a column gets cut in pieces.', '倍道而進，砲落後半里……這是找死。']] },
      { title: '二 · 代善 · The first charge', goal: 'Close up behind the levies and hold', text: 'Banners in the pass ahead. The levies at the head of the column take the first shock; the duck teams close up behind them and wait for the gap.', start: [['release', 'daisan'], ['dir', 'liu', 'hold', 0, -36], ['dir', 'tusi', 'hold', 0, -10]],
        obj: { survive: 66 },
        say: [[1, 'lookout', 'Banners in the pass ahead — red, and red bordered in white! Those are no Ming riders!', '前面有旗！紅旗，鑲紅！不是我們的人！'],
          [4, 'liu', 'Levies, hold them! Duck teams, close up behind and be ready!', '土兵頂住！鴛鴦陣隨後待命！'],
          [7, 'chief', 'Shields down! Brushes up! Spears behind me — as Marshal Qi taught us!', '藤牌在前，狼筅次之，長槍隨後！'],
          [52, 'chief', 'They give way! Hold the line — nobody chases!', '他們退了！穩住，不許追！']] },
      { title: '三 · 皇太極 · The ridge', goal: 'Turn and fight off the ridge attack', text: 'A second Jin host comes down the west ridge into the side of the column.', start: [['release', 'hong'], ['release', 'ridge'], ['dir', 'hong', 'attack']],
        obj: { survive: 48 },
        at: [[13, ['kill', 'liu']], [17, ['promote']], [23, ['wound', 3]]],
        say: [[1, 'fang', 'The west ridge — more banners! The rider lied. Du Song is not coming!', '西嶺上還有！那人是假的，杜總兵不會來了！'],
          [6, 'lookout', 'Arrows from the east slope!', '東坡有弓手！'],
          [14, 'soldier', 'General Liu has fallen! Liu Ting is dead!', '劉總兵陣亡了！']] },
      { title: '四 · 突圍 · Break out', goal: 'Get your file out to the south gorge', text: 'The column is broken. Get your file back down the valley to the south gorge, where the Koreans are camped. Leave no one who can still walk.', show: ['mouth'],
        obj: { extract: 'mouth' }, limit: 420, fail: 'The valley closed behind you.',
        waves: [[3, 'chase', ['attack']], [30, 'chase2', ['attack']]],
        say: [[2, 'fang', 'The way we came — the gorge to the south! The Korean camp is beyond it!', '回頭，往南邊的峽口！朝鮮兵在那邊扎營！'],
          [6, 'lookout', 'Horsemen on the west slope — they are cutting the road!', '西坡有馬兵，要斷我們的路！'],
          [32, 'lookout', 'More from the east!', '東邊又來了！']] },
    ],
    win: 'You came out of the pass.',
  },
  // ===== 浙兵 · Chapter Two: the Hun River, spring 1621. The Sichuan White Poles stand north of the bridge, the
  // Zhejiang men in their wagon camp south of it. History says both are destroyed; your task is your own file.
  hunz: {
    title: '渾河 · The Hun River', year: 'Spring 1621', battle: 'toba', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 2,
    brief: 'Shenyang has fallen. The relief army from Liaoyang has come too late: the Sichuan White Poles are across the bridge on the north bank, the Zhejiang men dug in five li south of it. You lead your file in Qi Jin\'s camp.',
    start: [56, -64, 0],
    zones: [{ key: 'sbridge', x: 74, zr: -15, r: 10, name: 'South end of the bridge' }, { key: 'camp', x: 58, z: -62, r: 20, name: 'The Zhejiang camp', owner: 0, rate: 0.5 },
      { key: 'road', x: -88, z: -136, r: 14, name: 'The Liaoyang road' }],
    forts: [[44, -62, 0.5, 12, 1.6, 'palisade'], [72, -62, 0.5, 12, 1.6, 'palisade'], [48.5, -49, 4.5, 0.5, 1.6, 'palisade'], [67.5, -49, 4.5, 0.5, 1.6, 'palisade'], [49, -75, 5, 0.5, 1.5, 'palisade'], [67, -75, 5, 0.5, 1.5, 'palisade'],
      [49.5, -53, 2, 1.1, 1.4, 'mantlet'], [66.5, -53, 2, 1.1, 1.4, 'mantlet']], // a 10 m north gate and an 8 m south gate; the mantlets flank the gate instead of filling it
    groups: {
      zhe: { team: 0, name: 'Qi Jin', zh: '戚金', army: ['yuanyang', 'rifle_imp', 'yuanyang', 'rifle_imp', 'samurai'], at: [58, -64, 0], dir: ['hold', 58, -60], stay: true },
      chen: { team: 0, name: 'Chen Ce', zh: '陳策', army: ['samurai', 'rifle_imp'], at: [70, -40, 0], dir: ['hold', 72, -38] },
      sichuan: { team: 0, name: 'Qin Bangping (White Poles)', zh: '秦邦屏', army: ['ashigaru', 'ashigaru', 'ashigaru', 'ashigaru', 'samurai'], at: [74, 30, 0], dir: ['hold', 74, 32] },
      bayara: { team: 1, name: 'The red Bayara', zh: '紅巴牙喇', army: ['shinsengumi', 'shinsengumi', 'cavalry'], at: [60, 138, PI], reserve: true, stay: true },
      rw: { team: 1, name: 'The right wing', army: ['samurai', 'samurai', 'ashigaru', 'archer', 'cavalry'], at: [100, 138, PI], reserve: true, stay: true },
      guns: { team: 1, name: 'The Shenyang guns', army: ['cannon4', 'rifle_sho'], at: [86, 112, PI], reserve: true, stay: true, dir: ['hold', 86, 92] },
      lw: { team: 1, name: 'The left wing', army: ['samurai', 'samurai', 'archer', 'cavalry'], at: [-30, 130, PI], reserve: true },
      east: { team: 1, name: 'Banners from the east', army: ['samurai', 'archer'], at: [140, -40, -PI / 2], reserve: true },
      night: { team: 1, name: 'Daišan\'s banners', zh: '代善', army: ['shinsengumi', 'samurai', 'samurai', 'cavalry'], at: [140, -110, -PI / 2], reserve: true },
      cut: { team: 1, name: 'Jin horsemen', army: ['cavalry'], at: [-140, -96, PI / 2], reserve: true },
    },
    phases: [
      { title: '一 · 橋北 · North of the bridge', goal: 'Stand to in camp and watch the far bank', text: 'The White Poles have crossed to the north bank. Stand to in the Zhejiang camp with your file and watch the far bank.', show: ['camp'],
        obj: { survive: 66 }, at: [[1, ['promote']]], waves: [[22, 'bayara', ['hold', 74, 34]]],
        say: [[3, 'qi', 'Shenyang fell yesterday. General He and General You are both dead.', '瀋陽昨日已陷，賀總兵、尤副總兵俱死。'],
          [10, 'chen', 'The city is lost. There is nothing left to relieve. We march back to Liaoyang.', '城已陷，救無可救。收兵回遼陽。'],
          [16, 'sichuan', 'If we cannot save Shenyang, what have we been doing here these three years?', '我輩不能救瀋，在此三年何為！'],
          [24, 'lookout', 'Red banners on the far bank — the Khan\'s own guard, riding at the Sichuan camp alone!', '北岸紅旗！巴牙喇單獨衝川營了！'],
          [50, 'lookout', 'They threw them back! The White Poles held!', '打退了！白杆兵頂住了！']] },
      { title: '二 · 白杆 · The White Poles', goal: 'Hold the south end of the bridge', text: 'The Jin right wing comes on in strength. Take your file to the south end of the bridge and keep it open, so that whoever can get back across, can.', show: ['sbridge'],
        start: [['release', 'rw'], ['dir', 'rw', 'hold', 74, 34], ['dir', 'bayara', 'hold', 74, 34]],
        obj: { survive: 80 }, waves: [[28, 'guns', ['hold', 86, 92]]],
        at: [[72, ['kill', 'sichuan']], [74, ['dir', 'sichuan', 'hold', 58, -58]]],
        say: [[3, 'qi', 'Take your file to the bridge. If the Sichuan men must come back, they come back over it.', '帶你的隊到橋頭去。川兵要退，就從這座橋退。'],
          [30, 'lookout', 'Guns on the far bank — they are firing the Shenyang cannon into the Sichuan camp!', '北岸有砲！他們拿瀋陽的大砲轟川營！'],
          [34, 'fang', 'They say Li Yongfang found our gunners among the prisoners and paid them to serve the guns.', '聽說李永芳在俘虜裡找出我們的砲手，賞了銀子讓他們開砲。'],
          [70, 'lookout', 'The white banners are going down on the far bank, one after another.', '北岸的白旗一面一面倒了。'],
          [73, 'lookout', 'Qin Bangping is down! Zhou Dunji is down! The Sichuan men are coming back over the bridge!', '秦邦屏陣亡！周敦吉陣亡！川兵退過橋來了！']] },
      { title: '三 · 車營 · The wagon camp', goal: 'Get back inside the camp and hold the wagons', text: 'The Jin left wing is over the river. Get your file back inside the camp and hold the line of wagons and palisades.', show: ['camp'], hide: ['sbridge'],
        start: [['release', 'lw'], ['dir', 'lw', 'hold', 58, -58], ['dir', 'chen', 'hold', 64, -56], ['dir', 'zhe', 'hold', 58, -60]],
        obj: { survive: 110 }, waves: [[60, 'east', ['hold', 58, -60]]],
        at: [[64, ['wound', 3]]],
        say: [[3, 'qi', 'Wagons together! Muskets to the palisade — let them come onto the guns.', '車並起來！銃手上柵——讓他們撞上來。'],
          [36, 'lookout', 'Shield carts! They are pushing shield carts at the ditch!', '盾車！他們推盾車來填壕了！'],
          [85, 'qi', 'The powder is nearly gone. Spears forward, shields close up!', '火藥快盡了！長槍向前，藤牌靠攏！']] },
      { title: '四 · 夜 · The last stand', goal: 'Take your file and wounded down the Liaoyang road', text: 'Night. The camp cannot hold. Qi Jin orders you out: take your file and your wounded down the Liaoyang road, so that someone lives to tell what happened here.', show: ['road'], hide: ['camp'],
        start: [['release', 'night'], ['dir', 'night', 'hold', 58, -60], ['kill', 'chen'], ['calm', 'bayara', 24], ['calm', 'rw', 24], ['calm', 'lw', 24], ['calm', 'east', 24], ['calm', 'night', 24], ['dir', 'bayara', 'hold', 58, -60], ['dir', 'rw', 'hold', 58, -60], ['dir', 'lw', 'hold', 58, -60], ['dir', 'east', 'hold', 58, -60]],
        obj: { extract: 'road' }, limit: 420, fail: 'The ring closed around the camp.',
        waves: [[14, 'cut', ['hold', -62, -118]]], at: [[15, ['calm', 'cut', 30]], [95, ['kill', 'zhe']]],
        say: [[1, 'lookout', 'The big banner on the east side — it\'s down!', '東邊的大旗倒了！'], [2, 'soldier', 'General Chen Ce is dead!', '陳總兵陣亡了！'],
          [4, 'fang', 'The general who asked about our feet last night...', '昨晚問我們腳冷不冷的那個總兵……'],
          [6, 'qi', 'A man repays his country today, of all days.', '大丈夫報國，就在今日。'],
          [12, 'qi', 'You — take your file and your wounded down the Liaoyang road. Someone must live to tell them what happened here.', '你——帶你的人和傷兵走遼陽大路。總得有人活著，把這裡的事說出去。'],
          [16, 'lookout', 'Horsemen on the road ahead!', '前面路上有馬兵！'],
          [95, 'lookout', 'The drum... listen. The drum has stopped.', '鼓……你聽，鼓停了。'], [96, 'lookout', 'General Qi has fallen!', '戚副將陣亡了！'],
          [100, 'he', 'He sat at our fire last night. He knew our names.', '他昨晚還跟我們烤火。他記得我們的名字。']] },
    ],
    win: 'You got out by the Liaoyang road.',
  },
  // ===== 開原道 · Interlude: the Kaiyuan road, July 1619. Three months after Abudali the survivors are in the Tieling garrison.
  // Kaiyuan is under attack in heavy rain; a relief column goes north from Tieling and is turned back on the road (as the
  // second relief force historically was). Your file holds a rise while the people of Kaiyuan stream south past it.
  kaiyuan: {
    title: '開原道 · The Kaiyuan road', year: 'July 1619', battle: 'field', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'k',
    bdef: { name: 'The Kaiyuan road', jp: '開原道', when: 'July 1619', biome: 'summer', weather: 'storm', fog: 0.3 },
    brief: 'Kaiyuan, the northern anchor of Liaodong, is under attack. A relief column marches north from Tieling in the rain. You lead what is left of your file with it.',
    start: [0, -112, 0],
    zones: [{ key: 'crest', x: 0, z: -10, r: 14, name: 'The rise on the road' }, { key: 'tieling', x: 0, z: -138, r: 14, name: 'The road back to Tieling' }],
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [0, -112, 0], dir: ['hold', 0, -108], stay: true },
      col: { team: 0, name: 'The Tieling column', zh: '鐵嶺援兵', army: ['cavalry', 'rifle_imp', 'samurai', 'rifle_imp'], at: [0, -98, 0], dir: ['hold', 0, -84] },
      folk: { team: 0, name: 'People from Kaiyuan', zh: '開原百姓', army: ['ronin', 'ronin', 'ronin'], at: [-4, 96, PI], reserve: true, stay: true },
      jin1: { team: 1, name: 'Jin horsemen', army: ['cavalry', 'cavalry', 'archer'], at: [-130, 30, PI / 2], reserve: true },
      jin2: { team: 1, name: 'Jin horsemen', army: ['cavalry', 'byakkotai'], at: [130, 0, -PI / 2], reserve: true },
      jin3: { team: 1, name: 'Jin horsemen', army: ['cavalry', 'cavalry', 'byakkotai'], at: [-130, -96, PI / 2], reserve: true },
    },
    phases: [
      { title: '一 · 雨 · North in the rain', goal: 'Lead your file up to the rise', text: 'Lead your file up the road with the column, to the rise where you can see north toward Kaiyuan.', show: ['crest'],
        obj: { all: [{ reach: 'crest' }, { survive: 42 }] },
        at: [[1, ['promote']], [16, ['dir', 'col', 'hold', 0, -40]], [40, ['dir', 'col', 'hold', 0, -16]]],
        say: [[3, 'col', 'Kaiyuan has sent for help twice. The last party that went north never got there. Close up and keep moving.', '開原兩次求援，上回派去的人一個也沒到。跟緊，快走。'],
          [10, 'fang', 'Rain like this, half the matches will be out by noon. Keep your cord under your hat.', '這種雨，不到中午火繩就滅一半。把火繩塞帽子裡。'],
          [24, 'he', 'Three months since the mountains, and we are walking north again.', '從山裡出來才三個月，又往北走了。'],
          [36, 'lookout', 'Smoke — north, under the rain. That is Kaiyuan.', '北邊有煙，雨裡還在燒。那是開原。']] },
      { title: '二 · 百姓 · The people on the road', goal: 'Hold the rise until the people are past', text: 'The people of Kaiyuan are coming down the road. Hold the rise with your file until they are past you, and keep the horsemen off them.', show: ['crest'],
        start: [['release', 'folk'], ['dir', 'folk', 'hold', 0, -136], ['dir', 'col', 'hold', 0, -6]],
        obj: { survive: 80 }, waves: [[18, 'jin1', ['attack']], [44, 'jin2', ['attack']]],
        say: [[3, 'lookout', 'People on the road! Carts, children — the whole town is coming south!', '路上有人！推車的，抱孩子的——整個城的人都往南跑！'],
          [10, 'folk', 'The wall is down on the east side. They are fighting in the streets, house by house.', '東邊城牆塌了。在街上打，一家一家地打。'],
          [16, 'folk', 'The general took his men out of the gate to fight them in the open. After that there was nobody left on the walls.', '總兵帶人出城去打。後來城上就沒人了。'],
          [20, 'lookout', 'Horsemen out of the trees on the left!', '左邊林子裡出來馬兵了！'],
          [24, 'he', 'Stand in front of the carts. They want the people, not us.', '站到車前頭去。他們要的是百姓，不是我們。'],
          [46, 'lookout', 'More on the right!', '右邊也來了！'],
          [62, 'folk', 'Heaven keep you, soldiers. Heaven keep you.', '老天保佑你們，老天保佑。']] },
      { title: '三 · 回鐵嶺 · Back to Tieling', goal: 'Get your file back down the road to Tieling', text: 'The column cannot get through to Kaiyuan, and it is turning back. Get your file down the road toward Tieling — and leave no one who can still walk.', show: ['tieling'], hide: ['crest'],
        start: [['release', 'jin3'], ['dir', 'jin3', 'attack'], ['dir', 'col', 'hold', 0, -138]],
        obj: { extract: 'tieling' }, limit: 360, fail: 'The horsemen closed the road.',
        at: [[9, ['wound', 4]]],
        say: [[2, 'col', 'We cannot get through. Back to Tieling — with the people!', '過不去了！回鐵嶺——帶著百姓走！'],
          [6, 'fang', 'Half a day north to watch it burn, and half a day back.', '走了半天去看它燒，再走半天回來。'],
          [14, 'lookout', 'Riders on the road ahead — they are trying to cut us off!', '前面路上有馬兵——要斷我們的路！']] },
    ],
    win: 'You brought your file back to Tieling.',
  },
  // ===== 道 · On the road (story-road): short scenes between the camps and the battles. Low stakes: the file is knocked
  // down, not killed (soft), the raiders are a handful. The talk on the march is the client's (zhe.js road block); the sim
  // carries the march, the officers' calls and the small fights.
  roadA: {
    title: '寬甸道 · The Kuandian road', year: 'March 1619', battle: 'zroad', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'r', road: 'A', soft: true,
    bdef: { name: 'The Kuandian road', jp: '寬甸道', when: 'March 1619', biome: 'winter', fog: 0.25 },
    brief: 'Liu Ting\'s column climbs north from Kuandian into the Jin hills. You march as a shield man in Chief Wu\'s duck team.',
    start: [0, -124, 0],
    zones: [{ key: 'village', x: 0, z: 32, r: 13, name: 'An empty village' }, { key: 'camp', x: 0, z: 118, r: 14, name: 'The night\'s camp' }],
    labels: { cavalry: ['Jin scouts', '哨騎'] },
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [0, -124, 0], dir: ['hold', 0, -120], stay: true },
      van: { team: 0, name: 'Liu Ting\'s vanguard', zh: '劉綎前鋒', army: ['yuanyang', 'rifle_imp'], at: [0, -96, 0], dir: ['hold', 0, -92], stay: true },
      rear: { team: 0, name: 'The baggage guard', zh: '輜重', army: ['rifle_imp', 'ashigaru'], at: [0, -144, 0], dir: ['hold', 0, -140], stay: true },
      scouts: { team: 1, name: 'Jin scouts', zh: '金哨騎', army: ['cavalry'], n: 4, at: [128, 76, -PI / 2], reserve: true, exit: [148, 90] },
    },
    phases: [
      { title: '一 · 行軍 · On the march', goal: 'March up the road with your file', text: 'The column climbs north through the snow. Keep your place in the file; the drum sets the pace.', show: ['village'],
        start: [['dir', 'van', 'hold', 0, 60], ['dir', 'zhe', 'hold', 0, 28], ['dir', 'rear', 'hold', 0, 2]],
        obj: { reach: 'village' },
        say: [[1, 'chief', 'Drum up. Close the file, shields on the left.', '起鼓。隊伍收緊，藤牌靠左。']] },
      { title: '二 · 空村 · The empty village', goal: 'Fall out by the well and get your water boiled', text: 'The gong: halt. A Jin village beside the road, and not a soul in it. Fall out by the well; nobody drinks it raw.', show: ['village'],
        obj: { survive: 40 },
        say: [[1, 'chief', 'The gong — halt! Fall out where you stand.', '鳴金——停！就地歇息。']] },
      { title: '三 · 哨騎 · Riders on the slope', goal: 'Plant the brushes and drive off the scouts', text: 'Horsemen on the east slope, a handful. Brushes up, spears behind them: let them ride onto the points.', hide: ['village'],
        start: [['release', 'scouts'], ['dir', 'scouts', 'attack'], ['dir', 'zhe', 'hold', 6, 36]],
        obj: { defeat: ['scouts'], frac: 0.7 },
        say: [[1, 'lookout', 'Horsemen on the east slope!', '東邊山坡——馬兵！'], [3, 'chief', 'Brushes up! Spears behind them! Shields, get low!', '狼筅豎起來！長槍在後！藤牌，蹲下！']] },
      { title: '四 · 宿營 · Make camp', goal: 'Follow the column up to the night\'s camp', text: 'The scouts are gone. The column climbs on to a fold in the hills to make camp before dark.', show: ['camp'],
        start: [['dir', 'van', 'hold', 0, 132], ['dir', 'zhe', 'hold', 0, 116], ['dir', 'rear', 'hold', 0, 98]],
        obj: { reach: 'camp' },
        say: [[2, 'chief', 'Drum up. We camp over the next rise.', '起鼓。過了前面那道坡就紮營。']] },
    ],
    win: 'The column made camp in the hills.',
  },
  roadB: {
    title: '遼陽道 · North from Liaoyang', year: 'The third month of 1621', battle: 'zroad', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'r', road: 'B', soft: true,
    bdef: { name: 'North from Liaoyang', jp: '遼陽道', when: 'March 1621', biome: 'winter', fog: 0.3 },
    brief: 'The relief army marches north from Liaoyang toward Shenyang. You lead your file in the column.',
    start: [0, -124, 0],
    zones: [{ key: 'cart', x: 4, z: -30, r: 9, name: 'The powder cart' }, { key: 'camp', x: 0, z: 118, r: 14, name: 'The camp by the Hun River' }],
    forts: [[6, -30, 0.9, 1.7, 1.5, 'cart']],
    labels: { ronin: ['Deserters', '逃兵'] },
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [0, -124, 0], dir: ['hold', 0, -120], stay: true },
      col: { team: 0, name: 'The relief army', zh: '援兵', army: ['rifle_imp', 'samurai'], at: [0, -96, 0], dir: ['hold', 0, -92], stay: true },
      white: { team: 0, name: 'The White Poles', zh: '白杆兵', army: ['ashigaru', 'ashigaru'], at: [0, -146, 0], dir: ['hold', 0, -142], stay: true },
      folk: { team: 0, name: 'People on the road', zh: '流民', army: ['ronin'], n: 7, at: [0, 136, PI], reserve: true, stay: true },
      des: { team: 1, name: 'Deserters', zh: '逃兵', army: ['ronin'], n: 4, at: [-62, 44, PI / 2], reserve: true, exit: [-148, 70] },
    },
    phases: [
      { title: '一 · 北上 · North from Liaoyang', goal: 'Lead your file up the road behind the relief army', text: 'The relief army is on the road north to Shenyang. Your file marches in the middle of the column.', show: ['cart'],
        at: [[1, ['promote']]], start: [['dir', 'col', 'hold', 0, -6], ['dir', 'white', 'hold', 0, -58]],
        obj: { reach: 'cart' } },
      { title: '二 · 陷車 · The cart in the rut', goal: 'Hold by the powder cart while it is dug out', text: 'A powder cart has broken through the frozen crust of the road. The column waits while it is dug out.', show: ['cart'],
        obj: { hold: 'cart', t: 22 },
        say: [[1, 'col', 'The powder cart\'s stuck in the rut! Southern men — lend a hand!', '火藥車陷住了！南兵，過來搭把手！'], [21, 'col', 'Good! You southern men have some muscle.', '好！南兵有力氣。']] },
      { title: '三 · 流民 · People on the road', goal: 'Keep the deserters off the people', text: 'People are coming down the road from the north, the farm villages around Shenyang emptying ahead of the Jin. Not everyone on the road means them well.', hide: ['cart'],
        start: [['release', 'folk'], ['dir', 'folk', 'hold', 0, -140], ['dir', 'col', 'hold', 0, 4]],
        waves: [[12, 'des', ['hold', -4, 26]]],
        obj: { all: [{ survive: 16 }, { defeat: ['des'], frac: 0.75 }] },
        say: [[2, 'lookout', 'People ahead — villagers, running south.', '前面有人——是百姓，往南逃的。'], [12, 'lookout', 'A gang out of the trees — deserters, robbing the people!', '林子裡出來一夥人——是逃兵，在搶百姓！']] },
      { title: '四 · 渾河 · The river', goal: 'March on to the camp by the Hun River', text: 'The road runs on north to the Hun River. Across it, Shenyang.', show: ['camp'],
        start: [['dir', 'col', 'hold', 0, 132], ['dir', 'white', 'hold', 0, 98]],
        obj: { reach: 'camp' } },
    ],
    win: 'The relief army reached the Hun River.',
  },
  roadC: {
    title: '寧遠道 · The road to Ningyuan', year: 'The twelfth month of 1625', battle: 'zroad', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 'r', road: 'C', soft: true,
    bdef: { name: 'The road to Ningyuan', jp: '寧遠道', when: 'Winter 1625', biome: 'night', fog: 0.35 },
    brief: 'Every fort beyond the Pass has been ordered abandoned, except Ningyuan. Your file walks the coast road to it by night.',
    start: [0, -124, 0],
    zones: [{ key: 'post', x: 0, z: 6, r: 12, name: 'The beacon post' }, { key: 'gate', x: 0, z: 122, r: 14, name: 'The gate of Ningyuan' }],
    forts: [[-6, 9, 1.6, 1.6, 3.4, 'wall']],
    labels: { byakkotai: ['Jin scouts', '哨探'] },
    groups: {
      zhe: { team: 0, name: 'Your file', zh: '浙兵', army: ['yuanyang'], at: [0, -124, 0], dir: ['hold', 0, -120], stay: true },
      col: { team: 0, name: 'The Ningyuan garrison', zh: '寧遠兵', army: ['rifle_imp'], at: [0, 14, PI], dir: ['hold', 2, 14], stay: true },
      scouts: { team: 1, name: 'Jin scouts', zh: '哨探', army: ['byakkotai'], n: 5, at: [118, 40, -PI / 2], reserve: true, exit: [148, 50] },
    },
    phases: [
      { title: '一 · 寧遠道 · The coast road', goal: 'Lead your file up the road to the beacon post', text: 'Dusk on the coast road. Every fort beyond the Pass is being emptied on the commissioner\'s orders; you are walking the other way, to Ningyuan.', show: ['post'],
        at: [[1, ['promote']]], obj: { reach: 'post' } },
      { title: '二 · 夜哨 · The picket', goal: 'Stand picket at the beacon post', text: 'Night. Rest under the beacon tower and keep watch toward the hills.', show: ['post'],
        obj: { survive: 46 },
        say: [[1, 'col', 'Rest under the beacon tower. Watches in turn — change every two hours.', '就在這烽墩下歇。輪流守夜，一個時辰一換。'], [14, 'lookout', 'There! Something is moving on the snow!', '那邊！雪地上有東西在動！'], [22, 'lookout', '...Deer. A herd of deer.', '……是鹿。一群鹿。']] },
      { title: '三 · 哨探 · Men in the dark', goal: 'Drive off the Jin scouts', text: 'Not deer this time. A Jin patrol is feeling for the road in the dark.', show: ['post'],
        start: [['release', 'scouts'], ['dir', 'scouts', 'attack']],
        obj: { defeat: ['scouts'], frac: 0.7 },
        say: [[1, 'lookout', 'Not deer this time! Men — Jin scouts!', '這回不是鹿！是人——金人的哨探！']] },
      { title: '四 · 寧遠 · Ningyuan', goal: 'Bring your file in to the gate of Ningyuan', text: 'The scouts have gone back to report. Bring your file in to Ningyuan before the light.', show: ['gate'], hide: ['post'],
        start: [['dir', 'col', 'hold', 0, 128]],
        obj: { reach: 'gate' } },
    ],
    win: 'Your file reached the gate of Ningyuan.',
  },
  // ===== 第三章 · Chapter Three: Ningyuan, the first month of 1626 (story-ch3) =====
  // You lead your file on the west wall of Ningyuan. The siege engines, ladders, saltpeter, oil and guns are the siege
  // system's (siegeInit runs for a story mission with `siege`); the phases follow the Ming record: the camp shelled
  // inside the guns' range, the assault on the walls, the sappers at the wall foot, the guns, the withdrawal.
  nyz: {
    title: '寧遠 · Ningyuan', year: 'The first month of 1626', battle: 'siegecity', side: 0, soldier: { group: 'zhe' }, hidden: true, ch: 3, siege: true, attacker: 1,
    brief: 'Nurhaci has crossed the Liao River with the Eight Banners. Every Ming fort beyond the Pass has been abandoned on orders from the new commissioner, except one: Ningyuan, where Yuan Chonghuan has refused to leave. You lead your file on the west wall.',
    start: [-18, 60, Math.PI],
    zones: [{ key: 'ditchW', x: -28, z: 22, r: 9, name: '壕 · The ditch (west)', rate: 1.6 }, { key: 'ditchE', x: 28, z: 22, r: 9, name: '壕 · The ditch (east)', rate: 1.6 },
      { key: 'wallW', x: -25, z: 43.5, r: 7, name: 'A · Your post: the west wall', owner: 0, rate: 0.35 }, { key: 'wallE', x: 25, z: 43.5, r: 7, name: 'B · The east wall', owner: 0, rate: 0.35 }],
    sectors: [['ditchW', 'ditchE'], ['wallW', 'wallE']],
    groups: {
      zhe: { team: 0, name: 'Your company', army: ['yuanyang', 'rifle_imp'], at: [-18, 60, Math.PI], dir: ['hold', -25, 44.5], stay: true, free: true },
      yuan: { team: 0, name: 'Yuan Chonghuan', zh: '袁崇煥', army: ['samurai'], at: [-7, 45, Math.PI], dir: ['hold', -7, 45], stay: true, free: true, officer: 4 },
      ww: { team: 0, name: 'West wall garrison', army: ['rifle_imp', 'rifle_spencer', 'rifle_imp'], at: [-40, 44, Math.PI] },
      ew: { team: 0, name: 'East wall garrison', army: ['rifle_imp', 'rifle_spencer', 'samurai'], at: [28, 44, Math.PI] },
      gate: { team: 0, name: 'The gate guard', army: ['samurai', 'rifle_imp'], at: [0, 58, Math.PI] },
      camp: { team: 1, name: 'The Jin vanguard camp', army: ['cavalry', 'samurai', 'archer'], exit: [-30, -150], at: [-30, -110, 0], dir: ['hold', -30, -62], stay: true },
      van: { team: 1, name: 'The Bordered banners', army: ['samurai', 'samurai', 'archer', 'archer'], exit: [-40, -150], at: [-40, -96, 0], reserve: true },
      carts: { team: 1, name: 'The shield carts', army: ['samurai', 'ashigaru', 'archer', 'horokutai'], exit: [30, -150], at: [30, -96, 0], reserve: true },
      van2: { team: 1, name: 'The Plain Blue banner', army: ['samurai', 'samurai', 'archer', 'horokutai'], exit: [-10, -150], at: [-10, -104, 0], reserve: true },
      east: { team: 1, name: 'The Mongol auxiliaries', army: ['ronin', 'samurai', 'ashigaru', 'archer'], exit: [40, -150], at: [40, -104, 0], reserve: true },
      sap: { team: 1, name: 'Sappers', zh: '穴城', army: ['ashigaru', 'ashigaru', 'samurai'], exit: [-20, -150], at: [-20, -120, 0], reserve: true },
      guard: { team: 1, name: 'The Khan\'s guard', zh: '巴牙喇', army: ['shinsengumi', 'samurai', 'archer', 'archer'], exit: [0, -150], at: [0, -126, 0], reserve: true },
    },
    phases: [
      { title: '一 · 清野 · Scorched earth', goal: 'Climb the ramp onto the west wall', text: 'The houses outside the walls are ash; the people and the grain are inside. Take your file up the ramp onto the west wall.', show: ['wallW'],
        obj: { all: [{ reach: 'wallW' }, { survive: 44 }] }, at: [[1, ['promote']], [8, ['dir', 'yuan', 'hold', -21, 45]], [36, ['dir', 'yuan', 'hold', 6, 45]], [30, ['dir', 'camp', 'hold', -30, -126]]],
        say: [[3, 'captain', 'Up on the wall, west side. Nobody stays below tonight.', '上城，西面。今晚誰也不許待在下面。'],
          [12, 'yuan', 'Zhejiang men? I am a southerner too. We are a long way from home, the two of us.', '浙兵？我也是南方人。咱們都離家很遠啊。'],
          [18, 'yuan', 'Every fort beyond the Pass has been given up. This one will not be. I have written it in my own blood.', '關外諸城都撤了，這一座不撤。我刺血為書，與此城共存亡。'],
          [25, 'yuan', 'Men who run will be cut down at Shanhai Pass — I have sent the order. So there is nowhere to run. Stand here with me.', '逃到山海關的，一律斬——我已經下了令。所以無處可逃。跟我站在這裡。'],
          [28, 'lookout', 'They\'re making camp out on the plain — close, too close!', '他們在平地上紮營了——太近了！'],
          [33, 'gunner', 'Inside the red cannon\'s reach! Light the match!', '進了紅夷砲的射程了！點火！'],
          [40, 'lookout', 'They\'re pulling the camp back! They didn\'t know how far our guns carry!', '他們拔營往後退了！不知道我們的砲打多遠！']] },
      { title: '二 · 攻城 · The assault', goal: 'Hold the west wall and throw down ladders (E)', text: 'The Jin come on with shield carts and ladders. Hold the west wall: throw down any ladder that goes up (E at its top) and keep your file together.',
        start: [['release', 'van'], ['release', 'carts'], ['dir', 'yuan', 'hold', 0, 50]],
        obj: { survive: 110, keep: 'wallW' }, at: [[34, ['sector', 1, 'fill']], [74, ['wound', 4]]],
        say: [[3, 'captain', 'Shield carts! They\'re filling the ditch!', '盾車！他們在填壕！'],
          [20, 'yuan', 'Let them come close. Muskets and guns, all together when I give the word.', '放近了打。銃砲齊發，聽我號令。'],
          [30, 'lookout', 'They\'re throwing bundles of brushwood into the ditch — it\'s filling!', '他們往壕裡扔柴捆——壕快填平了！'],
          [42, 'lookout', 'Ladders at the wall! Saltpeter at the foot — fire it!', '雲梯靠城了！城下的硝——點！'],
          [60, 'captain', 'Throw the ladders down! Get to the top of them!', '把梯子推下去！上梯頭！']] },
      { title: '三 · 穴城 · Under the wall', goal: 'Hold your post on the wall', text: 'Under their carts, men are chiselling at the foot of the wall where arrows and stones cannot reach them. Hold your post while the wall burns them out.',
        start: [['release', 'sap'], ['release', 'van2']],
        obj: { survive: 110, keep: 'wallW' },
        say: [[4, 'lookout', 'They\'re digging into the wall under the carts! We can\'t hit them from up here!', '他們躲在車底下鑿城！從上面打不著！'],
          [14, 'yuan', 'Bedding! Quilts, straw, oil and powder — roll them up, light them, throw them down!', '把被褥、柴草拿來！澆油裹藥，點著了往下扔！'],
          [40, 'soldier', 'It\'s caught under the cart — they\'re running out!', '燒到車底下了——他們往外跑了！'],
          [75, 'captain', 'The cold\'s on our side. The ground is frozen hard as iron. Let them dig.', '天冷幫我們。地凍得跟鐵一樣。讓他們挖。']] },
      { title: '四 · 紅夷砲 · The red cannon', goal: 'Hold the wall until they break', text: 'The Khan\'s own guard comes at the walls. The guns are firing over your heads. Hold until they break.',
        start: [['release', 'guard'], ['release', 'east'], ['dir', 'yuan', 'hold', -14, 45]],
        obj: { survive: 100, keep: 'wallW' }, at: [[66, ['break', 'guard']], [68, ['break', 'van']], [70, ['break', 'carts']], [72, ['break', 'sap']], [73, ['break', 'van2']], [74, ['break', 'east']], [75, ['break', 'camp']]],
        say: [[3, 'lookout', 'Yellow banners — the Khan\'s guard!', '黃旗！大汗的親兵！'],
          [16, 'gunner', 'Again! Swab it, load it, again!', '再來！洗膛，裝藥，再來！'],
          [58, 'lookout', 'A great chief is hit! They\'re carrying him off wrapped in red cloth!', '打中一個大頭目！他們用紅布裹著抬走了！'],
          [70, 'lookout', 'They\'re pulling back! All along the line, they\'re pulling back!', '退了！整條線都在退！'],
          [84, 'yuan', 'Let them go. Let them go. The city stands.', '讓他們走。讓他們走。城還在。']] },
    ],
    win: 'The Jin fell back from the walls of Ningyuan.',
  },
  // ===== 八旗 · The Plain White Niru (Jin story campaign, jin.js): the same wars from the other side, as one armoured man
  // in a niru of Hong Taiji's Plain White Banner. Chapter One: Abdali, April 1619, from the wooded west ridge.
  jin1: {
    title: '阿布達里岡 · Abdali', year: 'April 1619', battle: 'abudali', side: 1, soldier: { group: 'niru' }, hidden: true, ch: 'j1',
    brief: 'Two days after Sarhu. Du Song\'s column is destroyed and Ma Lin\'s scattered. Liu Ting\'s column is still coming through the eastern mountains, and Hong Taiji\'s banners wait for it on the west ridge above the valley.',
    start: [-92, 14, PI / 2],
    zones: [{ key: 'road', x: 0, z: -98, r: 16, name: 'The road where the southerners stand' }],
    groups: {
      niru: { team: 1, name: 'Tobohui', zh: '托博輝', army: ['samurai'], at: [-80, 16, PI / 2], dir: ['hold', -78, 16], stay: true },
      hong: { team: 1, name: 'Hong Taiji', zh: '皇太極', army: ['cavalry', 'samurai', 'samurai', 'byakkotai', 'archer', 'cavalry', 'samurai'], at: [-106, -8, PI / 2], dir: ['hold', -100, -8], stay: true },
      daisan: { team: 1, name: 'Daišan', zh: '代善', army: ['cavalry', 'samurai', 'samurai', 'archer', 'cavalry'], at: [0, 138, PI], reserve: true },
      ridge: { team: 1, name: 'Archers on the east ridge', army: ['archer'], at: [72, -20, -PI / 2], reserve: true, stay: true, dir: ['hold', 34, -24] },
      liu: { team: 0, name: 'Liu Ting', zh: '劉綎', army: ['rifle_imp', 'ronin'], at: [0, -96, 0], dir: ['hold', 0, -64], stay: true },
      tusi: { team: 0, name: 'Sichuan and Miao levies', zh: '川黔土兵', army: ['ashigaru', 'ronin', 'ashigaru'], at: [0, -72, 0], dir: ['hold', 0, -40], stay: true },
      kang: { team: 0, name: 'Kang Yingqian\'s rearguard', zh: '康應乾', army: ['rifle_imp', 'ashigaru'], at: [0, -128, 0], dir: ['hold', 0, -112], stay: true },
      amin: { team: 1, name: 'Amin', zh: '阿敏', army: ['samurai', 'cavalry', 'samurai'], at: [-104, -70, PI / 2], reserve: true },
      duck: { team: 0, name: 'The Zhejiang duck teams', zh: '浙兵鴛鴦陣', army: ['yuanyang', 'yuanyang', 'yuanyang'], at: [4, -126, 0], dir: ['hold', 0, -114], stay: true, reserve: true },
    },
    phases: [
      { title: '一 · 西嶺 · The west ridge', goal: 'Wait in the trees with your niru', text: 'Hong Taiji\'s banners lie hidden in the woods of the west ridge. Below, Liu Ting\'s column hurries north toward Hetu Ala. Wait with your niru.',
        obj: { survive: 56 },
        at: [[18, ['dir', 'liu', 'hold', 0, -50]], [34, ['dir', 'liu', 'hold', 0, -32]], [34, ['dir', 'tusi', 'hold', 0, -4]]],
        say: [[7, 'niru', 'Down on one knee, and keep your helmets out of the sun. Nobody moves before the conch.', '都跪下，盔別反光。海螺不響，誰也不許動。'],
          [12, 'ulgen', 'The old man under the big standard, that\'s Liu Ting. They say his sword weighs a hundred and twenty jin.', '大纛底下那個老頭就是劉綎。聽說他的刀有一百二十斤。'],
          [16, 'hong', 'Plain White. Whose niru is this?', '正白旗的。這是誰的牛錄？'],
          [21, 'niru', 'Tobohui\'s, my Beile. Every man who can wear armour is here.', '托博輝的，貝勒爺。能披甲的全在這兒。'],
          [26, 'hong', 'Good. When my elder brother strikes the head of that column, you strike its side. Not one breath before.', '好。等我二哥打他的頭，你們打他的腰。早一口氣也不行。'],
          [33, 'muktan', 'The man in Ming red who rode down last night carried Du Song\'s own command arrow.', '昨晚穿紅衣下去的那個人，拿的是杜松自己的令箭。'],
          [38, 'muktan', 'Du Song has been dead three days.', '杜松已經死了三天了。'],
          [44, 'ilan', 'So the old man is hurrying to a feast that\'s already been eaten.', '所以那老頭是趕著去吃一桌早散了的席。'],
          [50, 'sose', 'Their guns are falling behind. The column is stretching like a wet bowstring.', '他們的砲落後了。隊伍拉得跟濕弓弦一樣長。']] },
      { title: '二 · 代善 · The first charge', goal: 'Hold the ridge and watch the pass', text: 'Daišan\'s banners strike the head of the column in the pass. Hold your place on the ridge until the conch.', start: [['release', 'daisan'], ['dir', 'daisan', 'hold', 0, -20]],
        obj: { survive: 60 },
        say: [[1, 'lookout', 'Daišan\'s banners in the pass! Red, and red bordered with white!', '大貝勒的旗進谷了！正紅，鑲紅！'],
          [9, 'ulgen', 'The levies at their head are taking it. Look at them. They\'re holding.', '前頭的土兵頂住了。你看他們，還真頂住了。'],
          [20, 'dabsun', 'Why are we waiting? They\'re fighting down there!', '我們還等什麼？下面打起來了！'],
          [24, 'alin', 'Because a man who goes before the conch loses his head, nephew. Sit down.', '因為海螺沒響就衝的人要掉腦袋，外甥。坐下。'],
          [40, 'niru', 'Tighten your girths. Archers, arrows on the string. Armoured men to the front.', '緊肚帶。弓手搭箭。披甲的站前頭。'],
          [54, 'hong', 'Now. Down the ridge!', '就是現在。下嶺！']] },
      { title: '三 · 下嶺 · Down the ridge', goal: 'Charge down into the column\'s flank', text: 'The conch. Hong Taiji\'s banners pour down the west ridge into the side of the column.', start: [['release', 'ridge'], ['dir', 'hong', 'attack'], ['dir', 'niru', 'attack'], ['dir', 'daisan', 'attack'], ['calm', 'kang', 24], ['calm', 'duck', 16]],
        obj: { survive: 70 },
        at: [[30, ['kill', 'liu']], [42, ['wound', 5]]],
        say: [[1, 'niru', 'Heavy armour in front, archers behind! Hit them before they can turn!', '重甲在前，弓手在後！趁他們還沒轉過身來！'],
          [6, 'ulgen', 'Stay on my shoulder! Cut at the arms, the arms!', '跟緊我的肩膀！砍胳膊，砍胳膊！'],
          [31, 'lookout', 'The big standard is down! Liu Ting is down!', '大纛倒了！劉綎倒了！'],
          [44, 'sose', 'One of ours is down. Get him up, get him up!', '我們的人倒了！扶他起來，快！']] },
      { title: '四 · 鴛鴦陣 · The duck teams', goal: 'Break the duck teams holding the road', text: 'The column is broken, but the southern infantry will not run. Their duck teams have closed up across the road. Break them.', show: ['road'],
        start: [['break', 'liu'], ['break', 'tusi'], ['break', 'kang'], ['release', 'duck'], ['calm', 'duck', 40], ['dir', 'duck', 'hold', 0, -98], ['dir', 'niru', 'attack'], ['dir', 'hong', 'hold', -40, -132], ['dir', 'daisan', 'hold', 34, -132]],
        obj: { defeat: ['duck'], frac: 0.65 }, waves: [[30, 'amin', ['attack']]],
        at: [[10, ['promote']], [75, ['dir', 'hong', 'attack']], [90, ['dir', 'daisan', 'attack']]],
        say: [[2, 'muktan', 'Southerners. They fight in twelves: the shields, then those bamboo things, then the spears.', '南兵。他們十二個人一隊：藤牌在前，竹子在中間，長槍在後。'],
          [6, 'ulgen', 'Don\'t go into the shields. Get round them. The bamboo can\'t turn quickly!', '別往藤牌上撞！繞過去，那竹子轉不快！'],
          [11, 'soldier', 'Ulgen is down! The bošokū is down!', '烏勒根倒了！撥什庫倒了！'],
          [16, 'niru', 'His file is yours now. Bring them in on the left!', '他的人歸你了。從左邊帶上去！'],
          [60, 'lookout', 'They\'re not running. Heaven, they\'re not running.', '他們不跑。老天，他們不跑。'],
          [31, 'lookout', 'Amin\'s banners on the ridge! More of ours coming down!', '二貝勒的旗下嶺了！我們的人來了！']] },
    ],
    win: 'The southern infantry died where they stood. Nothing stood between Liu Ting\'s column and the mountains any more.',
  },
  // Chapter Two: the Hun River, the third month of 1621. Shenyang fell yesterday; a Ming relief army arrived too late and
  // camped on the Hun River: the Sichuan White Poles on the north bank, the Zhejiang men in a wagon camp to the south.
  jin2: {
    title: '渾河 · The Hun River', year: 'The third month of 1621', battle: 'toba', side: 1, soldier: { group: 'niru' }, hidden: true, ch: 'j2',
    brief: 'Shenyang fell yesterday in a single morning. The Ming relief army has come up too late, and will not go away.',
    start: [64, 118, PI],
    zones: [{ key: 'wpcamp', x: 74, z: 32, r: 16, name: 'The White Pole camp' }, { key: 'rally', x: 68, z: 98, r: 14, name: 'The banner: re-form here' },
      { key: 'zcamp', x: 58, z: -62, r: 20, name: 'The southerners\' wagon camp' }],
    forts: [[44, -62, 0.5, 12, 1.6, 'palisade'], [72, -62, 0.5, 12, 1.6, 'palisade'], [48.5, -49, 4.5, 0.5, 1.6, 'palisade'], [67.5, -49, 4.5, 0.5, 1.6, 'palisade'], [49, -75, 5, 0.5, 1.5, 'palisade'], [67, -75, 5, 0.5, 1.5, 'palisade'],
      [49.5, -53, 2, 1.1, 1.4, 'mantlet'], [66.5, -53, 2, 1.1, 1.4, 'mantlet']],
    groups: {
      niru: { team: 1, name: 'Tobohui', zh: '托博輝', army: ['samurai'], at: [64, 118, PI], dir: ['hold', 66, 100], stay: true },
      bayara: { team: 1, name: 'The red Bayara', zh: '紅巴牙喇', army: ['shinsengumi', 'shinsengumi', 'cavalry'], at: [52, 126, PI], dir: ['hold', 56, 104], stay: true },
      white: { team: 1, name: 'The Plain White banner', zh: '正白旗', army: ['samurai', 'samurai', 'archer', 'cavalry'], at: [90, 126, PI], dir: ['hold', 86, 104], stay: true },
      guns: { team: 1, name: 'Li Yongfang\'s gunners', zh: '李永芳', army: ['cannon4', 'cannon4', 'rifle_sho'], at: [92, 116, PI], reserve: true, stay: true, dir: ['hold', 90, 96] },
      yellow: { team: 1, name: 'The Bordered Yellow banner', zh: '鑲黃旗', army: ['samurai', 'samurai', 'archer', 'cavalry', 'samurai', 'shinsengumi'], at: [-30, 130, PI], reserve: true },
      sichuan: { team: 0, name: 'Qin Bangping', zh: '秦邦屏', army: ['ashigaru', 'ashigaru', 'ashigaru', 'samurai', 'ashigaru'], at: [74, 30, 0], dir: ['hold', 74, 32], stay: true },
      zhe: { team: 0, name: 'Qi Jin', zh: '戚金', army: ['yuanyang', 'rifle_imp', 'yuanyang', 'rifle_imp'], at: [58, -64, 0], dir: ['hold', 58, -60], stay: true },
      chen: { team: 0, name: 'Chen Ce', zh: '陳策', army: ['samurai', 'rifle_imp'], at: [70, -40, 0], dir: ['hold', 72, -38], stay: true },
    },
    phases: [
      { title: '一 · 白杆兵 · The White Poles', goal: 'Charge the White Pole camp beside the Bayara', text: 'Across the open ground north of the river stands the camp of the Sichuan White Poles. The Bayara go in first. Your file goes with them.', show: ['wpcamp'],
        start: [['dir', 'niru', 'hold', 72, 40], ['dir', 'bayara', 'hold', 74, 38], ['dir', 'white', 'hold', 84, 40]], obj: { survive: 46 }, at: [[1, ['lead']]],
        say: [[7, 'niru', 'Bošokū! Your file goes in beside the Bayara. Where the red armour goes, you go.', '撥什庫！你的人跟著巴牙喇上。紅甲往哪去，你們就往哪去。'],
          [14, 'muktan', 'Shenyang fell in one morning. These men came too late to save it, and they came anyway.', '瀋陽一個早上就破了。這些人來晚了，可他們還是來了。'],
          [22, 'lookout', 'They\'re not breaking! Long poles with hooks on the ends: they\'re pulling the riders down!', '他們不退！長桿子，頭上帶鉤，把騎兵拉下馬來！'],
          [32, 'sose', 'White-poled spears. Those are Qin Liangyu\'s men, the woman general of Shizhu.', '白杆槍。是石柱那個女將軍秦良玉的兵。'],
          [40, 'niru', 'Back! Back to the banner! Re-form!', '退！退回旗下！重新列隊！']] },
      { title: '二 · 退 · Back to the banner', goal: 'Fall back to the banner and re-form', text: 'The first charge has been thrown back. Pull your file back to the banner and wait for the guns.', show: ['rally'], hide: ['wpcamp'],
        start: [['dir', 'niru', 'hold', 68, 98], ['dir', 'bayara', 'hold', 58, 104], ['dir', 'white', 'hold', 86, 104]], obj: { all: [{ reach: 'rally' }, { survive: 20 }] },
        say: [[3, 'manggu', 'Thrown back. By foot soldiers with sticks.', '被一群拿棍子的步兵打回來了。'],
          [12, 'niru', 'The Khan is sending up the guns. Li Yongfang found Ming gunners among the Shenyang prisoners.', '汗把砲調上來了。李永芳在瀋陽的俘虜裡找出了明朝的砲手。'],
          [20, 'lier', 'Those gunners are Shenyang men. They\'ll fire on their own people, for silver and their lives.', '那些砲手是瀋陽人。為了銀子，為了活命，朝自己人開砲。']] },
      { title: '三 · 砲 · The guns', goal: 'Go in again behind the guns', text: 'The captured Ming cannon fire into the White Pole camp. When it breaks, go in again.', show: ['wpcamp'], hide: ['rally'],
        start: [['release', 'guns'], ['dir', 'guns', 'hold', 90, 92]], obj: { survive: 72 },
        at: [[14, ['dir', 'niru', 'attack']], [14, ['dir', 'bayara', 'attack']], [14, ['dir', 'white', 'attack']], [40, ['wound', 4]], [60, ['kill', 'sichuan']], [66, ['break', 'sichuan']]],
        say: [[2, 'lookout', 'The guns are firing into their camp!', '砲打進他們營裡了！'],
          [13, 'niru', 'Now! In again, while they\'re still picking themselves up!', '趁現在！再衝一次，趁他們還沒爬起來！'],
          [61, 'lookout', 'Their general is down! The white banners are going down!', '他們的將軍倒了！白旗一面一面倒了！']] },
      { title: '四 · 車營 · The wagon camp', goal: 'Cross the river and storm the southerners\' camp', text: 'South of the river the Zhejiang men wait behind their wagons and palisades. Cross over and break the camp.', show: ['zcamp'], hide: ['wpcamp'],
        start: [['release', 'yellow'], ['dir', 'yellow', 'hold', 58, -58], ['dir', 'niru', 'hold', 58, -56], ['dir', 'bayara', 'hold', 60, -56], ['dir', 'white', 'hold', 62, -58], ['calm', 'zhe', 30]],
        obj: { defeat: ['zhe', 'chen'], frac: 0.7 }, at: [[70, ['kill', 'chen']], [95, ['kill', 'zhe']], [100, ['dir', 'niru', 'attack']]],
        say: [[3, 'niru', 'In the wagon camp: southerners. The same kind as at Abdali, two years ago.', '車營裡是南兵。跟兩年前阿布達里岡的一樣。'],
          [7, 'alin', 'Then they know us too.', '那他們也認得我們。'],
          [40, 'lookout', 'They\'re out of powder! They\'re swinging their guns like clubs!', '他們火藥打光了！拿銃當棍子打！'],
          [96, 'lookout', 'Their old general sat by his drum and wouldn\'t move. They\'ve cut him down.', '他們那個老將坐在鼓邊不肯走。被砍倒了。']] },
    ],
    win: 'By nightfall both Ming camps on the Hun River were destroyed. The banners called it the hardest fight of the war.',
  },
  // Chapter Three: Ningyuan, the first month of 1626. The Khan's first defeat, from under the walls: the siege system of
  // the Ming chapter (nyz) seen from the other side; the player's niru is one of the attacking groups siegeDirs drives.
  jin3: {
    title: '寧遠 · Ningyuan', year: 'The first month of 1626', battle: 'siegecity', side: 1, soldier: { group: 'niru' }, hidden: true, ch: 'j3', siege: true, attacker: 1,
    brief: 'Every Ming fort beyond the Pass has been abandoned except one. The Khan has crossed the frozen Liao River to take it.',
    start: [-28, -96, 0],
    zones: [{ key: 'ditchW', x: -28, z: 22, r: 9, name: '壕 · The ditch (west)', rate: 1.6 }, { key: 'ditchE', x: 28, z: 22, r: 9, name: '壕 · The ditch (east)', rate: 1.6 },
      { key: 'wallW', x: -25, z: 43.5, r: 7, name: 'The west wall', owner: 0, rate: 0.35 }, { key: 'wallE', x: 25, z: 43.5, r: 7, name: 'The east wall', owner: 0, rate: 0.35 },
      { key: 'jcamp', x: -30, z: -112, r: 16, name: 'The camp' }],
    sectors: [['ditchW', 'ditchE'], ['wallW', 'wallE']],
    groups: {
      niru: { team: 1, name: 'Tobohui', zh: '托博輝', army: ['samurai'], exit: [-30, -150], at: [-28, -96, 0], dir: ['hold', -28, -70] },
      carts: { team: 1, name: 'The shield carts', army: ['samurai', 'ashigaru', 'archer', 'horokutai'], exit: [30, -150], at: [30, -96, 0] },
      van: { team: 1, name: 'The Plain White banner', army: ['samurai', 'samurai', 'archer', 'archer'], exit: [-40, -150], at: [-40, -104, 0] },
      van2: { team: 1, name: 'The Plain Blue banner', army: ['samurai', 'samurai', 'archer', 'horokutai'], exit: [-10, -150], at: [-10, -104, 0], reserve: true },
      sap: { team: 1, name: 'Sappers', zh: '穴城', army: ['ashigaru', 'ashigaru', 'samurai'], exit: [-20, -150], at: [-20, -120, 0], reserve: true },
      yuan: { team: 0, name: 'Yuan Chonghuan', zh: '袁崇煥', army: ['samurai'], at: [-7, 45, PI], dir: ['hold', -7, 45], stay: true, free: true, officer: 4 },
      ww: { team: 0, name: 'West wall garrison', army: ['rifle_imp', 'rifle_spencer', 'rifle_imp'], at: [-40, 44, PI] },
      ew: { team: 0, name: 'East wall garrison', army: ['rifle_imp', 'rifle_spencer', 'samurai'], at: [28, 44, PI] },
      gate: { team: 0, name: 'The gate guard', army: ['samurai', 'rifle_imp'], at: [0, 58, PI] },
      south: { team: 0, name: 'Southern infantry', army: ['yuanyang', 'rifle_imp'], at: [-18, 60, PI], dir: ['hold', -25, 44.5], stay: true, free: true },
    },
    phases: [
      { title: '一 · 盾車 · The shield carts', goal: 'Advance behind the carts to the ditch', text: 'Ningyuan stands alone beyond the frozen Liao River. Advance behind the shield carts and fill the ditch under the walls.', show: ['ditchW', 'ditchE'],
        obj: { survive: 70 }, at: [[1, ['lead']], [55, ['sector', 1, 'fill']]],
        say: [[7, 'niru', 'Keep behind the carts! Their guns reach farther than any bow.', '躲在車後面！他們的砲比弓射得遠。'],
          [14, 'muktan', 'Every fort beyond the Pass was given up without a fight. Only this one stayed. Yuan Chonghuan.', '山海關外的城都不戰而棄了，只有這一座沒走。袁崇煥。'],
          [20, 'lookout', 'Fire on the wall! The red cannon!', '城上開火了！紅衣砲！'],
          [30, 'alin', 'Thirty years I\'ve followed the Khan. I\'ve never seen guns like these.', '跟了汗三十年，從沒見過這樣的砲。'],
          [45, 'manggu', 'The ditch is filling. Throw the bundles in, quick!', '壕快填平了！快把柴捆扔進去！'],
          [56, 'niru', 'The ditch is filled! Ladders to the wall!', '壕填平了！雲梯上前！']] },
      { title: '二 · 雲梯 · The ladders', goal: 'Raise a ladder at the wall (E) and climb', text: 'The ditch is filled. Get the ladders up against the wall and climb.', hide: ['ditchW', 'ditchE'],
        start: [['release', 'van2']], obj: { survive: 75 }, at: [[50, ['wound', 3]]],
        say: [[3, 'niru', 'Ladders up! Get them up against the wall!', '豎梯子！靠上城牆！'],
          [20, 'lookout', 'They\'re throwing down fire! Bundles of burning straw!', '他們往下扔火！一捆一捆燒著的草！'],
          [40, 'ilan', 'It\'s so cold the blood freezes on the rungs.', '冷得血都凍在梯子上了。'],
          [60, 'sose', 'I can\'t shoot up at them. The parapets cover them.', '我往上射不著，垛口擋著他們。'],
          [66, 'niru', 'Off the ladders! Back under the carts and catch your breath!', '下梯子！退回車底下喘口氣！']] },
      { title: '三 · 鑿城 · Under the wall', goal: 'Hold under the carts while the sappers dig', text: 'The sappers have reached the foot of the wall and are chiselling at the frozen earth under the shield carts. Hold beside them.',
        start: [['release', 'sap']], obj: { survive: 70 },
        say: [[3, 'niru', 'The ground is frozen like iron. Dig anyway!', '地凍得跟鐵一樣。照樣挖！'],
          [20, 'lookout', 'They\'re dropping fire onto the carts! Oil and powder wrapped in quilts!', '他們往車上扔火！被子裹著油和火藥！'],
          [40, 'lier', 'The southerners call that one the ten-thousand-man enemy: a pot of powder that rolls along the ground.', '南邊人管那叫萬人敵，一罐火藥，在地上滾。'],
          [60, 'bahai', 'The cart\'s on fire! Get out from under it!', '車著火了！快從底下出來！']] },
      { title: '四 · 汗 · The Khan', goal: 'Bring your file and wounded back to camp', text: 'Something has happened at the Khan\'s standard. The horns sound the withdrawal. Bring your file back across the plain to the camp, and leave no one who can still walk.', show: ['jcamp'],
        start: [['sector', 2], ['break', 'van'], ['break', 'van2'], ['break', 'carts'], ['break', 'sap'], ['dir', 'niru', 'hold', -30, -110]], obj: { extract: 'jcamp' }, limit: 400, fail: 'The guns found you on the open plain.',
        say: [[1, 'lookout', 'The Khan\'s standard is going back! They\'re carrying someone wrapped in red cloth!', '汗的大纛往後退了！他們用紅布裹著抬一個人！'],
          [6, 'niru', 'The horns! Back to the camp! Carry the wounded!', '號角響了！退回營去！把傷的抬上！'],
          [18, 'muktan', 'Twenty-five years of war, and the Khan has never once turned back from a wall.', '汗打了二十五年仗，從沒在一座城下退過。']] },
    ],
    win: 'You brought your file back across the plain. Behind you the walls of Ningyuan still stood.',
  },
  // Chapter Four: Changshan by the Xiaoling River, the ninth month of 1631. Hong Taiji, Khan now, besieges Dalinghe; the
  // Ming relief army under Zhang Chun forms a wagon camp on a long hill. The Jin bring their own red cannon for the first time.
  jin4: {
    title: '長山 · Changshan', year: 'The ninth month of 1631', battle: 'field', side: 1, soldier: { group: 'niru' }, hidden: true, ch: 'j4',
    bdef: { name: 'Changshan', jp: '長山', when: 'October 1631', biome: 'autumn', fog: 0.1 },
    brief: 'The Khan has walled in Dalinghe and is starving it. A Ming relief army of forty thousand has come up from Jinzhou. Ride out and meet it.',
    start: [0, -112, 0],
    zones: [{ key: 'ford', x: 0, z: -58, r: 16, name: 'The Xiaoling ford' }, { key: 'wagons', x: 0, z: 2, r: 20, name: 'Zhang Chun\'s wagon camp' }],
    forts: [[0, 18, 15, 0.5, 1.6, 'palisade'], [-17, 2, 0.5, 13, 1.6, 'palisade'], [17, 2, 0.5, 13, 1.6, 'palisade'], [-9, -14, 6, 0.5, 1.6, 'palisade'], [9, -14, 6, 0.5, 1.6, 'palisade'],
      [-2.5, -16, 1.6, 1.1, 1.4, 'mantlet'], [2.5, -16, 1.6, 1.1, 1.4, 'mantlet']],
    groups: {
      niru: { team: 1, name: 'Tobohui', zh: '托博輝', army: ['samurai'], at: [-6, -112, 0], dir: ['hold', -6, -96], stay: true },
      hong: { team: 1, name: 'Hong Taiji', zh: '皇太極', army: ['cavalry', 'shinsengumi', 'samurai', 'cavalry'], at: [14, -120, 0], dir: ['hold', 14, -100], stay: true },
      white: { team: 1, name: 'The Plain White banner', zh: '正白旗', army: ['samurai', 'samurai', 'archer', 'cavalry'], at: [-30, -116, 0], dir: ['hold', -30, -98], stay: true },
      ujen: { team: 1, name: 'The Ujen Cooha', zh: '烏真超哈', army: ['cannon4', 'cannon4', 'rifle_sho', 'rifle_sho'], at: [0, -124, 0], reserve: true, stay: true, dir: ['hold', 0, -70] },
      wu: { team: 0, name: 'Wu Xiang\'s cavalry', zh: '吳襄', army: ['cavalry', 'cavalry'], at: [10, -40, PI], dir: ['hold', 6, -70], exit: [60, 150] },
      zhang: { team: 0, name: 'Zhang Chun', zh: '張春', officer: 2.5, wound: 0.35, army: ['rifle_imp', 'samurai', 'rifle_spencer'], at: [0, 4, PI], dir: ['hold', 0, 4], stay: true },
      wagons: { team: 0, name: 'The wagon camp', zh: '車營', army: ['rifle_imp', 'armstrong', 'rifle_imp', 'ashigaru', 'rifle_spencer'], at: [0, -6, PI], dir: ['hold', 0, -8], stay: true },
    },
    phases: [
      { title: '一 · 小凌河 · The Xiaoling River', goal: 'Ride out with the banners to the ford', text: 'The Ming relief army has crossed the Xiaoling River and halted on the long hill beyond. Their cavalry comes out to meet you at the ford.', show: ['ford'],
        obj: { all: [{ reach: 'ford' }, { survive: 40 }] }, at: [[1, ['lead']], [2, ['dir', 'niru', 'hold', -4, -60]], [2, ['dir', 'hong', 'hold', 12, -64]], [2, ['dir', 'white', 'hold', -24, -62]], [32, ['break', 'wu']]],
        say: [[7, 'niru', 'The Khan rides with us today. Show him what the Plain White are.', '今天汗親自出馬。讓他看看正白旗是什麼樣的。'],
          [13, 'hong', 'Their horse first. Wu Xiang\'s men have run from us before. Make them run again.', '先打他們的馬兵。吳襄的人跑過一回，讓他們再跑一回。'],
          [20, 'muktan', 'Forty thousand, they say. Come to save Zu Dashou, who\'s been eating horses inside Dalinghe for a month.', '說是四萬人，來救祖大壽。祖大壽在大凌河城裡吃馬已經吃了一個月了。'],
          [33, 'lookout', 'Their horse is breaking! Wu Xiang is running!', '他們的馬兵散了！吳襄跑了！']] },
      { title: '二 · 車營 · The wagon wall', goal: 'Charge the wagon line on the hill', text: 'The Ming infantry have closed their wagons on the long hill. Go up at them.', show: ['wagons'], hide: ['ford'],
        start: [['dir', 'niru', 'hold', -4, -20], ['dir', 'white', 'hold', -16, -20], ['dir', 'hong', 'hold', 12, -22]], obj: { survive: 55 },
        say: [[3, 'niru', 'Up the hill! Get in among the wagons before they can reload!', '上坡！趁他們裝藥，衝進車陣！'],
          [18, 'lookout', 'Their guns! The whole wagon line is firing!', '開砲了！整條車陣都在打！'],
          [40, 'niru', 'Back! Back down the hill! Wait for our own guns!', '退！退下坡！等我們自己的砲！']] },
      { title: '三 · 風 · Fire and wind', goal: 'Hold below the hill while our guns fire', text: 'For the first time the banners have red cannon of their own, cast in Shenyang and served by Han gunners. Hold below the hill while they fire.',
        start: [['release', 'ujen'], ['dir', 'niru', 'hold', -6, -56], ['dir', 'white', 'hold', -22, -58], ['dir', 'hong', 'hold', 14, -60]], obj: { survive: 66 },
        at: [[20, ['burn', -26, 26, -30]], [40, ['wound', 4]]],
        say: [[3, 'sabu', 'Our guns! Lord Tong\'s guns! Look at them!', '我們的砲！佟大人的砲！你們看！'],
          [10, 'anju', 'My brother died under guns like those, at Ningyuan.', '我哥就是死在這種砲底下的，在寧遠。'],
          [21, 'lookout', 'They\'ve set the grass on fire to drive us off!', '他們放火燒草，要把我們逼退！'],
          [32, 'bater', 'The wind\'s turned. It\'s carrying the fire up the hill, into their own wagons!', '風轉了！火往坡上燒，燒進他們自己的車陣了！'],
          [52, 'niru', 'Their wagons are burning. Get ready.', '他們的車燒起來了。準備。']] },
      { title: '四 · 張春 · Zhang Chun', goal: 'Storm the camp and take Zhang Chun alive', text: 'The wagon line is broken and burning. The Khan wants the Ming commander alive.',
        start: [['dir', 'niru', 'attack'], ['dir', 'white', 'attack'], ['dir', 'hong', 'attack'], ['dir', 'ujen', 'hold', 0, -40]], obj: { all: [{ officer: 'zhang' }, { survive: 25 }] },
        say: [[2, 'hong', 'Take the old man alive. I want to talk with him.', '那個老頭要活的。我要跟他說話。'],
          [30, 'lookout', 'They\'re throwing down their guns!', '他們扔下火器了！']] },
    ],
    win: 'Zhang Chun was taken alive. The relief army was gone, and Dalinghe had no one left to wait for.',
  },
  zcamp: { title: '營 · Camp', year: '', battle: 'zcamp', side: 0, camp: true, hidden: true, brief: '', start: [0, 0, 0], zones: [], groups: {}, phases: [{ title: '營 · Camp', text: '', obj: { never: true } }], win: '' },
};
const OPS = { // Assault: attackers with limited manpower take sectors of fortified points one by one; defenders fall back
  ningyuan_siege: {
    siege: true, title: '寧遠攻守 · The Siege of Ningyuan', year: 'February 1626', battle: 'siegecity', attacker: 1, tickets: 640,
    brief: 'Nurhaci brings the Eight Banners against Ningyuan in the depth of winter. Yuan Chonghuan has burned the suburbs, brought the people inside and mounted Western cannon on the walls. The Jin must fill the ditch, climb or break the walls, take the gatehouse and fight through the streets to the yamen.',
    zones: [{ key: 'ditchW', x: -28, z: 22, r: 13, name: 'A · West ditch', rate: 0.5 }, { key: 'ditchE', x: 28, z: 22, r: 13, name: 'B · East ditch', rate: 0.5 },
      { key: 'wallW', x: -25, z: 43.5, r: 7, name: 'A · West wall', owner: 0, rate: 0.6 }, { key: 'wallE', x: 25, z: 43.5, r: 7, name: 'B · East wall', owner: 0, rate: 0.6 },
      { key: 'gatehouse', x: 0, z: 55, r: 8, name: 'A · The gatehouse', owner: 0, rate: 0.5 },
      { key: 'street', x: -18, z: 80, r: 11, name: 'A · Drum-tower street', owner: 0, rate: 0.5 }, { key: 'yamen', x: 0, z: 112, r: 13, name: 'B · The yamen', owner: 0, rate: 0.4 }],
    forts: [],
    sectors: [['ditchW', 'ditchE'], ['wallW', 'wallE'], ['gatehouse'], ['street', 'yamen']],
    def: [[['rifle_imp', 'rifle_imp', 'armstrong'], -28, 43.6], [['rifle_imp', 'rifle_spencer', 'armstrong'], 28, 43.6], [['samurai', 'ashigaru'], -14, 43.6], [['samurai', 'yuanyang'], 14, 43.6], [['samurai', 'ashigaru', 'rifle_imp'], 0, 58], [['ronin', 'ashigaru'], -18, 82], [['samurai', 'rifle_imp', 'jigen'], 0, 112]],
    defRes: [[['samurai', 'rifle_imp'], 0, 96, 2], [['cavalry', 'samurai'], 0, 124, 3]],
    att: [['samurai', 'samurai', 'archer', 'archer'], ['samurai', 'ashigaru', 'archer', 'horokutai'], ['shinsengumi', 'samurai', 'archer', 'archer'], ['samurai', 'byakkotai', 'archer'], ['samurai', 'samurai', 'archer', 'horokutai'], ['shinsengumi', 'samurai', 'archer']],
    attAt: [0, -122, 0],
  },
  liaoyang: {
    title: '遼陽之戰 · Assault on Liaoyang', year: 'April 1621', battle: 'aizu', attacker: 1, tickets: 520,
    brief: 'The Jin storm Liaoyang, capital of Liaodong. Three lines stand between the banners and the keep: the outer trenches, the market quarter and the city gate.',
    zones: [{ key: 'a1', x: -40, z: -62, r: 12, name: 'A · West trench', owner: 0, rate: 0.55 }, { key: 'b1', x: 40, z: -62, r: 12, name: 'B · East trench', owner: 0, rate: 0.55 },
      { key: 'a2', x: 0, z: 6, r: 14, name: 'A · Market quarter', owner: 0, rate: 0.5 }, { key: 'b2', x: -60, z: 20, r: 12, name: 'B · Drum tower', owner: 0, rate: 0.55 },
      { key: 'a3', x: 0, z: 63, r: 10, name: 'A · City gate', owner: 0, rate: 0.45 }, { key: 'b3', x: 0, z: 96, r: 13, name: 'B · The keep', owner: 0, rate: 0.4 }],
    forts: [[-40, -52, 9, 0.5, 1.4, 'palisade'], [40, -52, 9, 0.5, 1.4, 'palisade'], [-52, -60, 0.5, 6, 1.4, 'palisade'], [52, -60, 0.5, 6, 1.4, 'palisade'], [-34, -66, 2, 1.5, 1.3, 'mantlet'], [34, -66, 2, 1.5, 1.3, 'mantlet'],
      [-60, 26, 3, 3, 4.5, 'keep'], [-10, -6, 6, 0.5, 1.5, 'palisade'], [10, -6, 6, 0.5, 1.5, 'palisade']],
    sectors: [['a1', 'b1'], ['a2', 'b2'], ['a3', 'b3']],
    def: [[['rifle_imp', 'yuanyang', 'samurai'], -40, -58], [['rifle_imp', 'ashigaru', 'samurai'], 40, -58], [['samurai', 'rifle_imp', 'yuanyang'], 0, 10], [['rifle_imp', 'ashigaru'], -60, 20], [['rifle_imp', 'samurai', 'gatling'], 0, 80], [['yuanyang', 'samurai', 'rifle_imp'], 0, 96]],
    defRes: [[['samurai', 'rifle_imp', 'ashigaru'], 0, 30, 1], [['yuanyang', 'rifle_imp', 'samurai'], 0, 110, 2]],
    att: [['samurai', 'samurai', 'archer', 'archer', 'cannon4'], ['samurai', 'ashigaru', 'archer', 'byakkotai'], ['cavalry', 'samurai', 'archer', 'archer'], ['samurai', 'byakkotai', 'archer', 'cannon4'], ['shinsengumi', 'samurai', 'archer', 'archer'], ['samurai', 'samurai', 'byakkotai', 'archer']],
    attAt: [0, -140, 0],
  },
  shanhai: {
    title: '山海關 · The First Pass Under Heaven', year: 'May 1644', battle: 'bonari', attacker: 1, tickets: 480,
    brief: 'Li Zicheng\'s rebels hold Beijing; the Qing banners come down on Shanhai Pass. The pass is narrow: an outer trench line, the earthwork, and the great gate itself.',
    zones: [{ key: 'a1', x: -14, z: -40, r: 11, name: 'A · Trench line', owner: 0, rate: 0.55 }, { key: 'b1', x: 16, z: -34, r: 11, name: 'B · Signal tower', owner: 0, rate: 0.55 },
      { key: 'a2', x: 0, z: 32, r: 11, name: 'A · Outer earthwork', owner: 0, rate: 0.5 },
      { key: 'a3', x: -10, z: 92, r: 11, name: 'A · Pass gate', owner: 0, rate: 0.45 }, { key: 'b3', x: 14, z: 104, r: 10, name: 'B · Gate tower', owner: 0, rate: 0.45 }],
    forts: [[-14, -32, 8, 0.5, 1.4, 'palisade'], [16, -26, 6, 0.5, 1.4, 'palisade'], [16, -40, 2.5, 2.5, 5, 'keep'], [0, 40, 10, 0.6, 1.8, 'palisade'], [-8, 26, 2, 1.5, 1.3, 'mantlet'], [8, 26, 2, 1.5, 1.3, 'mantlet'], [14, 110, 3, 3, 6, 'keep']],
    sectors: [['a1', 'b1'], ['a2'], ['a3', 'b3']],
    def: [[['rifle_imp', 'yuanyang'], -14, -36], [['rifle_spencer', 'samurai'], 16, -32], [['rifle_imp', 'yuanyang', 'samurai'], 0, 36], [['rifle_imp', 'samurai', 'gatling'], -10, 96], [['rifle_imp', 'ashigaru'], 14, 104]],
    defRes: [[['samurai', 'rifle_imp', 'ashigaru'], 0, 60, 1], [['yuanyang', 'rifle_imp', 'samurai'], 0, 118, 2]],
    att: [['samurai', 'samurai', 'archer', 'archer'], ['samurai', 'ashigaru', 'archer', 'cannon4'], ['samurai', 'byakkotai', 'archer', 'archer'], ['shinsengumi', 'samurai', 'archer', 'cannon4'], ['samurai', 'samurai', 'archer', 'byakkotai']],
    attAt: [0, -138, 0],
  },
};
Sim.prototype.missionZone = function (key) { return this.objectives.find(o => o.key === key); };
Sim.prototype.setupMission = function (teams, aiPl) {
  const M = this.mission, ass = this.mode === 'assault'; this.aiNaval = [true, true]; this.mg = {}; this.mv = { ph: -1, t0: 0, hold: 0, said: {}, waves: {}, ats: {} };
  const rz = (x) => { const rv = this.layout.river; return rv && rv.axis === 'x' ? rv.c0 + rv.amp * sin(x * rv.freq + rv.ph) : 0; };
  for (const f of M.forts || []) this.boxes.push({ x: f[0], z: f[1], hw: f[2], hd: f[3], h: f[4], kind: f[5] || 'palisade' });
  this.objectives = (M.zones || []).map((z, i) => ({ id: i, key: z.key, x: z.x, z: z.zr !== undefined ? rz(z.x) + z.zr : z.z, r: z.r, name: z.name, ctrl: z.owner === 1 ? -100 : z.owner === 0 ? 100 : 0, owner: z.owner === undefined ? -1 : z.owner, hidden: true, rate: z.rate || 1 }));
  for (const e of teams[0].concat(teams[1])) { e.army = []; e.player.army = []; }
  const humans = this.players.filter(p => !p.ai);
  if (M.camp) return this.setupCamp(humans);
  const mk = (gid, G) => { aiPl(G.team, G.name, G.army.slice()); const pl = this.players[this.players.length - 1]; pl.gid = gid; this.mg[gid] = { p: pl.idx, G, released: !G.reserve, broken: false }; return pl; };
  if (ass) { // assault: defender garrisons per point, attacker corps that arrive as manpower allows
    const A = M.attacker, D = 1 - A;
    M.def.forEach((d, i) => mk('d' + i, { team: D, name: 'Garrison ' + (i + 1), army: d[0], at: [d[1], d[2], A === 1 ? PI : 0], reserve: i >= M.sectors[0].length + 0 && false }));
    (M.defRes || []).forEach((d, i) => mk('r' + i, { team: D, name: 'Reserve ' + (i + 1), army: d[0], at: [d[1], d[2], A === 1 ? PI : 0], reserve: true, sector: d[3] }));
    M.att.concat(M.att, M.att).forEach((a, i) => mk('a' + i, { team: A, name: AI_NAMES[A][i % 5], army: a, at: [M.attAt[0] + ((i % 3) - 1) * 40, M.attAt[1], M.attAt[2]], reserve: i >= 3 }));
  } else for (const gid in M.groups) mk(gid, M.groups[gid]);
  for (const p of this.players) if (p.ai) { const g = this.mg[p.gid], G = g.G; this.placeArmy({ player: p, army: p.army }, G.team, G.at[0], G.at[1], G.at[2]);
    const lab = G.team === 1 && M.labels; if (lab) for (const id of p.squads) { const q = this.squads[id], L = lab[q.type]; if (!L) continue; const nd = Object.assign({}, q.def, { name: L[0], jp: L[1] }); q.def = nd; for (const uid of q.unitIds) { const u = this.units[uid]; u.def = Object.assign({}, u.def, { name: L[0], jp: L[1] }); } }
    const h = this.units[p.heroId]; if (h && G.officer) { h.def = Object.assign({}, h.def, { hp: h.def.hp * G.officer, name: G.name, dmg: h.def.dmg.map(x => x * 1.4) }); h.hp = h.def.hp; h.officer = true; }
    if (G.n) this.mTrim(p, G.n);
    if (G.reserve) { p.inactive = true; for (const id of p.squads) { const q = this.squads[id]; q.inactive = true; for (const uid of q.unitIds) this.units[uid].inactive = true; } for (const uid of [p.heroId, p.horseId]) if (uid >= 0) this.units[uid].inactive = true; }
    this.mDir(p.gid, G.dir); }
  if (M.soldier) { const cache = new Map(); const tune = (d, k, m) => { if (!cache.has(d)) cache.set(d, Object.assign({}, d, { hp: d.hp * k, dmg: d.dmg ? d.dmg.map(x => x * m) : d.dmg })); return cache.get(d); }; // a story chapter: the Jin at near full strength, their generals no one-man armies
    for (const u of this.units) { if (u.type === 'horse' || u.def.ai === 'cannon' || u.team === M.side) continue; u.def = u.type === 'hero' ? tune(u.def, 0.75, 0.5) : tune(u.def, 0.85, 0.85); u.hp = u.def.hp; } }
  if (!ass && !M.soldier) { // campaign balance: the enemy rank and file are a little softer, your allies a little harder (officers excepted)
    const cache = new Map(); const tune = (d, k, m) => { const key = d; if (!cache.has(key)) cache.set(key, new Map()); const c = cache.get(key); if (!c.has(k)) c.set(k, Object.assign({}, d, { hp: d.hp * k, dmg: d.dmg ? d.dmg.map(x => x * m) : d.dmg })); return c.get(k); };
    for (const u of this.units) { if (u.type === 'horse' || u.officer || u.def.ai === 'cannon') continue; const foe = u.team !== M.side; u.def = foe ? tune(u.def, 0.82, 0.82) : tune(u.def, 1.12, 1.05); u.hp = u.def.hp; } }
  if (M.siege && (ass || M.soldier)) { if (!ass) this.sector = 0; this.siegeInit(); if (!ass) this.sg.emp = this.sg.emp.filter(e => e.team === this.sg.D); } // a story chapter on the walls uses the siege engines too (the Jin of 1626 had no field guns)
  if (ass) { let n = 0; for (const u of this.units) if (u.team === M.attacker && u.type !== 'horse' && u.type !== 'hero') n++; this.tickets = M.tickets || Math.round(n * 0.8);
    this.assaultCap();  for (const o of this.objectives) o.rate *= 0.6; this.sector = 0; M.sectors[0].forEach(k => this.missionZone(k).hidden = false); this.assaultDirs(); this.mv.ph = 0; }
  // humans: in the campaign each leads a squad of the troops they chose (two when alone) and rides with it
  if (M.soldier) { // a story chapter: you are one man in a mandarin duck team of the named group
    const g = this.mg[M.soldier.group], gp = g ? this.players[g.p] : null;
    humans.forEach((p, i) => { const c = this.cfg.players[p.idx] || {}; p.team = M.side; p.auto = false; p.ready = true; p.heroId = -1; p.commanderId = -1; p.squads = [];
      const sq = gp ? gp.squads.map(id => this.squads[id]).filter(q => q.def.yuanyang)[i] || this.squads[gp.squads[0]] : null; p.soldierSq = sq ? sq.id : 0; this.possess(p, sq, c.yyRole || 'shield');
      if (sq) for (const id of sq.unitIds) { const u = this.units[id]; u.def = Object.assign({}, u.def, { hp: u.def.hp * 1.5 }); u.hp = u.def.hp; u.zfile = true; }
      if (c.wkit && c.wkit.length && p.heroId >= 0) this.kitGive(this.units[p.heroId], c.wkit); });
    this.story = true; // your file: hardened Yiwu men, and the story's heart
  } else if (!ass) {
    humans.forEach((p, i) => { const c = this.cfg.players[p.idx] || {}; const t = roleType(c.role, M.side); p.team = M.side; p.army = humans.length === 1 ? [t, M.soloExtra || 'ashigaru'] : [t];
      const s = M.start; const px = s[0] + (i - (humans.length - 1) / 2) * 26; this.placeArmy({ player: p, army: p.army }, M.side, px, s[1], s[2]); p.auto = false; p.ready = true;
      for (const id of p.squads) this.squads[id].order = ORD_FOLLOW;
      p.spareIds = []; for (let k = 0; k < 2; k++) { const q = this.createSquad(t, M.side, -1, clamp(px + (k - 0.5) * 16, -HALF + 6, HALF - 6), clamp(s[1] - sin(s[2] + PI / 2) * 0 - cos(s[2]) * 22, -HALF + 6, HALF - 6), s[2]); q.inactive = true; for (const uid of q.unitIds) this.units[uid].inactive = true; p.spareIds.push(q.id); } p.spare = 2;
      // a growing command: every phase won brings a fresh company to each player's banner
      const pool = M.levy || ['yuanyang', 'rifle_imp', 'cavalry', 'ashigaru', 'samurai'];
      p.levyIds = []; for (let k = 1; k < M.phases.length; k++) { const lt = k === 1 ? t : pool[(k - 2 + i) % pool.length]; const q = this.createSquad(lt, M.side, -1, clamp(px + (k - 2) * 12, -HALF + 6, HALF - 6), clamp(s[1] - cos(s[2]) * 30, -HALF + 6, HALF - 6), s[2]); q.inactive = true; q.levyPh = k; for (const uid of q.unitIds) this.units[uid].inactive = true; p.levyIds.push(q.id); } });
  } else {
    humans.forEach((p) => { const c = this.cfg.players[p.idx] || {}; const want = (c.team | 0) === M.attacker ? M.attacker : 1 - M.attacker; p.team = want; p.auto = false; p.ready = true; p.heroId = -1; p.commanderId = -1;
      const role = roleType(c.role, want); const sq = this.squads.find(q => q.team === want && q.type === role && !q.inactive) || this.squads.find(q => q.team === want && !q.inactive && !q.def.mounted && q.def.ai !== 'cannon');
      p.soldierSq = sq ? sq.id : 0; this.possess(p, sq); });
  }
};
Sim.prototype.mDir = function (gid, dir) {
  const g = this.mg[gid]; if (!g || !dir) return; const p = this.players[g.p]; const k = dir[0];
  if (k === 'support') { const h = this.players.find(q => !q.ai); p.directive = { kind: DIR_SUPPORT, x: 0, z: 0, by: h ? h.idx : 0 }; }
  else if (k === 'hold') p.directive = { kind: DIR_HOLD, x: dir[1], z: dir[2], by: -1 };
  else p.directive = { kind: DIR_ATTACK, x: 0, z: 0, by: -1 };
};
Sim.prototype.mRelease = function (gid) {
  const g = this.mg[gid]; if (!g || g.released) return; g.released = true; const p = this.players[g.p]; p.inactive = false;
  for (const id of p.squads) { const q = this.squads[id]; q.inactive = false; for (const uid of q.unitIds) this.units[uid].inactive = false; }
  for (const uid of [p.heroId, p.horseId]) if (uid >= 0) this.units[uid].inactive = false;
  if (!this.mission.groups || !this.mission.groups[gid] || !this.mission.groups[gid].dir) p.directive = { kind: DIR_ATTACK, x: 0, z: 0, by: -1 };
  if (this.mode === 'assault') this.assaultDirs();
  this.events.push({ t: 'mwave', team: p.team, name: p.name, gid });
};
Sim.prototype.mJoin = function (p, sid, levy) { // an inactive company marches up behind the player's general and takes his orders
  const q = this.squads[sid]; const h = this.units[p.heroId]; q.inactive = false; q.owner = p.idx; p.squads.push(sid); q.order = ORD_FOLLOW;
  const off = levy ? 16 : 10; const bx = h && !h.dead ? h.x - sin(h.yaw) * off : q.cx, bz = h && !h.dead ? h.z - cos(h.yaw) * off : q.cz; let k2 = 0;
  for (const uid of q.unitIds) { const u = this.units[uid]; u.inactive = false; u.owner = p.idx; u.x = u.px = clamp(bx + ((k2 % 4) - 1.5) * 1.6, -HALF + 3, HALF - 3); u.z = u.pz = clamp(bz - Math.floor(k2 / 4) * 1.8, -HALF + 3, HALF - 3); u.y = u.py = terrainH(u.x, u.z); k2++; }
  this.events.push({ t: 'mspare', p: p.idx, sq: sid, levy: !!levy, name: q.def.name });
};
Sim.prototype.mGroupFrac = function (gid) { // fraction of the group's men still fighting
  const g = this.mg[gid]; if (!g) return 0; const p = this.players[g.p]; let a = 0, n = 0; for (const id of p.squads) { const q = this.squads[id]; n += q.count; if (!q.inactive) a += q.aliveCount; else a += q.count; } return n ? a / n : 0;
};
Sim.prototype.mBreak = function (gid) { // a beaten group gives up the field and withdraws (no morale rout needed)
  const g = this.mg[gid]; if (!g || g.broken) return; g.broken = true; const p = this.players[g.p]; const ex = g.G.exit || [g.G.at[0], g.G.team === 1 ? HALF : -HALF];
  p.directive = { kind: DIR_HOLD, x: clamp(ex[0], -HALF + 2, HALF - 2), z: clamp(ex[1], -HALF + 2, HALF - 2), by: -1 }; p.fleeing = true;
  this.events.push({ t: 'mbreak', gid, name: p.name, team: p.team });
};
Sim.prototype.mAct = function (a) {
  if (a[0] === 'release') this.mRelease(a[1]);
  else if (a[0] === 'dir') this.mDir(a[1], a.slice(2));
  else if (a[0] === 'say') this.events.push({ t: 'msay', who: a[1], text: a[2] });
  else if (a[0] === 'show') { const z = this.missionZone(a[1]); if (z) z.hidden = false; }
  else if (a[0] === 'hide') { const z = this.missionZone(a[1]); if (z) z.hidden = true; }
  else if (a[0] === 'kill') { const g = this.mg[a[1]]; if (g) { const h = this.units[this.players[g.p].heroId]; if (h && !h.dead) { h.officer = false; this.applyDamage(h, 1e6, -1, 0, 0, 0, 'arrow'); } this.events.push({ t: 'mkill', gid: a[1], name: g.G.name, zh: g.G.zh || '' }); } }
  else if (a[0] === 'promote') this.zPromote();
  else if (a[0] === 'lead') this.zPromote(true);
  else if (a[0] === 'burn') this.mBurn(a[1], a[2], a[3]);
  else if (a[0] === 'break') this.mBreak(a[1]);
  else if (a[0] === 'calm') { const g = this.mg[a[1]]; if (g) { g.calm = a[2]; const p = this.players[g.p]; if (g.released && !g.broken) p.aggr = a[2]; } }
  else if (a[0] === 'wound') this.zWound(a[1] | 0);
  else if (a[0] === 'sector') { this.sector = a[1] | 0; if (a[2] && this.sg) for (const f of TERR.sditch.fills) if (!f.done) { f.done = true; this.sgRewater(f); this.events.push({ t: 'sgfill', x: f.x, z: TERR.sditch.zc }); } if (this.sg) { this.navBoxes(); this.siegeDirs(); } }
};
// the section chief falls and the file is yours: his squad passes to the man who is left
Sim.prototype.zPromote = function (keep) {
  for (const p of this.players) { if (p.ai) continue; const q = this.squads[p.soldierSq]; if (!q) continue; const chief = this.units[q.unitIds[0]];
    if (!keep && chief && !chief.dead && chief.ctrl < 0) this.applyDamage(chief, 1e6, -1, 0, 0, 0, 'arrow');
    if (q.owner >= 0 && q.owner !== p.idx) { const o = this.players[q.owner]; o.squads = o.squads.filter(id => id !== q.id); }
    q.owner = p.idx; for (const id of q.unitIds) this.units[id].owner = p.idx; if (!p.squads.includes(q.id)) p.squads.push(q.id); q.order = ORD_FOLLOW; p.commanderId = p.heroId;
    this.events.push({ t: 'zpromote', p: p.idx, sq: q.id, chief: chief ? chief.id : -1 }); }
};
// a man of your file is hit and cannot walk: someone has to get him up
// a scripted grass fire along a line (jin.js chapter four): the field's own fire model takes it from there, wind and all
Sim.prototype.mBurn = function (x0, x1, z) {
  if (this.rain || !this.fireState) return; for (let x = x0; x <= x1; x += FIRE_CS * 0.9) { const c = this.fireCell(x, z); if (c < 0) continue; this.fuel[c] = Math.max(this.fuel[c], 1.4); this.fireState[c] = 1; this.burnT[c] = 420; this.events.push({ t: 'ignite', c, x, z }); }
};
Sim.prototype.zWound = function (k) {
  for (const p of this.players) { if (p.ai) continue; const q = this.squads[p.soldierSq]; if (!q) continue; let u = this.units[q.unitIds[k]];
    if (!u || u.dead || u.ctrl >= 0) u = q.unitIds.map(id => this.units[id]).find(v => !v.dead && v.ctrl < 0 && !v.wounded) || null; if (!u) continue;
    u.wounded = true; u.helpedBy = -1; u.hp = Math.max(u.hp, u.def.hp * 0.35); u.st = ST_IDLE; u.stT = 0; u.blocking = false; u.downT = Math.max(u.downT, 1);
    this.events.push({ t: 'zwound', p: p.idx, id: u.id, x: u.x, z: u.z }); }
};
Sim.prototype.helpWounded = function (u) { // E beside a downed or wounded comrade: haul him up, or get his arm over your shoulder
  if (u.dead || u.mounted) return false; let best = null, bd = 2.6;
  for (const v of this.teamAlive[u.team]) { if (!v.wounded || v.aided || v.helpedBy >= 0 || v === u) continue; const d = len(v.x - u.x, v.z - u.z); if (d < bd) { bd = d; best = v; } }
  if (!best) return false;
  if (best.downed) { if (best.reviveBy !== u.id) { best.reviveBy = u.id; best.reviveT = 0; this.events.push({ t: 'zrevive0', id: best.id, by: u.id }); } return true; }
  return false; // walking wounded make their own way after their file for now (no carrying)
};
// story chapters: a man who would die is often only knocked down — bleeding, until someone gets him up or the blood runs out
Sim.prototype.zDown = function (u, dmg, cause) {
  if (u.wounded || u.mounted || u.ctrl >= 0 || u.type === 'horse' || u.type === 'hero' || u.def.ai === 'cannon' || u.team !== this.mission.side) return false;
  if (dmg >= 1e5 || cause === 'explosion' || cause === 'solid' || cause === 'canister' || cause === 'headshot' || cause === 'lightning' || cause === 'fire' || cause === 'fall' || cause === 'bleed') return false; // the script's deaths, and blows no one gets up from
  let chance = 0;
  if (u.zfile) chance = this.mission.soft ? 1 : 0.82;
  else { for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId]; if (h && !h.dead && len(h.x - u.x, h.z - u.z) < 30) chance = 0.22; } }
  if (!chance || this.rng.next() >= chance) return false;
  u.hp = 1; u.wounded = true; u.downed = true; u.helpedBy = -1; u.reviveBy = -1; u.reviveT = 0; u.bleed = 30 * (u.zfile ? (this.mission.soft ? 240 : 45) : 30); u.medic = -1;
  u.st = ST_IDLE; u.stT = 0; u.blocking = false; u.aiming = false; u.target = -1; u.downT = Math.max(u.downT, 1.2); u.mx = 0; u.mz = 0;
  this.events.push({ t: 'zdown', id: u.id, x: u.x, z: u.z, file: !!u.zfile }); return true;
};
Sim.prototype.zRevive = function (u, by) {
  const h = this.units[by]; const limp = this.mv && this.mission && this.mv.ph >= this.mission.phases.length - 1; // in the break-out he can walk, not fight
  u.downed = false; u.reviveBy = -1; u.reviveT = 0; u.bleed = 0; u.downT = 0; u.hp = Math.max(u.hp, u.def.hp * 0.4);
  // (the arm-over-the-shoulder carry is set aside until it is reworked: a man hauled up simply gets up and goes on)
  u.wounded = false; u.helpedBy = -1; u.restT = this.tick + 30 * 5;
  this.events.push({ t: 'zrevive', id: u.id, by, limp: false });
};
// a raid, a picket, a handful of scouts: keep the first n men of a group and send its general and the rest away before the field opens
// ---- weapons on the ground, and the kit a man carries ----
// Every man who falls leaves his weapon (and shield) where he fell. A man you play can pick one up (E, after helping
// the wounded / crewing a piece / a ladder) and carries up to four, switching with 1-4, Q/X or the wheel. Each kind
// brings its own stats; the weapon he started with keeps his own def exactly. All of it is sim state, so lockstep-safe.
const WPN = {
  dao:     { n: '腰刀 Dao', w: 'katana', d: { weapons: ['katana'], reach: 2.2, dmg: [54, 42, 34, 42], windup: 0.45, recover: 0.4, block: 0.45 } },
  jsword:  { n: '順刀 Jin sword', w: 'katana', d: { weapons: ['katana'], reach: 2.2, dmg: [56, 44, 34, 44], windup: 0.42, recover: 0.4, block: 0.4 } },
  spear:   { n: '長槍 Spear', w: 'yari', role: 'spear', two: 1, d: { weapons: ['yari'], reach: 4.4, dmg: [46, 0, 52, 0], windup: 0.5, recover: 0.45, block: 0.15 } },
  qiang:   { n: '槍 Qiang', w: 'yari', two: 1, d: { weapons: ['yari'], reach: 3.0, dmg: [42, 0, 40, 0], windup: 0.5, recover: 0.45, block: 0.2 } },
  brush:   { n: '狼筅 Wolf-brush', w: 'yari', role: 'brush', two: 1, d: { weapons: ['yari'], reach: 5.0, dmg: [16, 0, 18, 0], windup: 0.4, recover: 0.45, block: 0.35, brush: true } },
  trident: { n: '鎲鈀 Trident', w: 'yari', role: 'trident', two: 1, d: { weapons: ['yari'], reach: 2.9, dmg: [44, 0, 42, 0], windup: 0.45, recover: 0.4, block: 0.4, trident: true } },
  musket:  { n: '鳥銃 Musket', w: 'rifle', two: 1, gun: 1, d: { weapons: ['rifle'], reach: 2.3, dmg: [38, 30, 32, 30], windup: 0.45, recover: 0.4, block: 0.2, rifle: DEFS.rifle_imp.rifle } },
  jmusket: { n: '漢軍銃 Jin musket', w: 'rifle', two: 1, gun: 1, d: { weapons: ['rifle'], reach: 2.3, dmg: [32, 0, 36, 0], windup: 0.5, recover: 0.45, block: 0.1, rifle: DEFS.rifle_sho.rifle } },
  sanyan:  { n: '三眼銃 Three-eyed gun', w: 'rifle', two: 1, gun: 1, d: { weapons: ['rifle'], reach: 2.3, dmg: [36, 0, 40, 0], windup: 0.5, recover: 0.45, block: 0.15, rifle: DEFS.rifle_spencer.rifle } },
  bow:     { n: '弓 Bow', w: 'bow', two: 1, gun: 1, d: { weapons: ['bow'], reach: 2.1, dmg: [28, 0, 28, 0], windup: 0.5, recover: 0.45, block: 0.1, bow: Object.assign({}, DEFS.archer.bow, { dmg: DEFS.archer.bow.dmg * 0.9 }) } },
  jbow:    { n: '角弓 Horn bow', w: 'bow', two: 1, gun: 1, d: { weapons: ['bow'], reach: 2.1, dmg: [28, 0, 28, 0], windup: 0.5, recover: 0.45, block: 0.1, bow: DEFS.archer.bow } },
  shield:  { n: '藤牌 Rattan shield', sh: 1 },
  jshield: { n: '盾 Jin shield', sh: 1 },
};
const KIT_MAX = 4, PK_MAX = 60;
// what a man drops: his weapon, by side and trade
function kitKindOf(u, w) {
  w = w || u.weapon; const jin = u.team === 1;
  if (w === 'katana') return jin ? 'jsword' : 'dao';
  if (w === 'yari') return u.def.brush || u.role === 'brush' ? 'brush' : u.def.trident || u.role === 'trident' ? 'trident' : u.def.yuanyang || u.role === 'spear' || u.def.reach >= 4 ? 'spear' : 'qiang';
  if (w === 'rifle') return u.def.rifle && u.def.rifle.mag > 1 ? 'sanyan' : jin ? 'jmusket' : 'musket';
  if (w === 'bow') return u.def.bow && u.def.bow.xbow ? null : jin ? 'jbow' : 'bow';
  return null;
}
Sim.prototype.pkDrop = function (x, z, k, am) {
  if (!k || !WPN[k]) return; const P = this.pickups || (this.pickups = []); this.pkSeq = (this.pkSeq || 0) + 1;
  P.push({ id: this.pkSeq, x, z, k, am: am === undefined ? -1 : am, t: this.tick }); if (P.length > PK_MAX) P.shift();
};
// a man falls: his weapon goes to the ground beside him (horses, guns on carriages and phantom units drop nothing)
Sim.prototype.pkOnDeath = function (u) {
  if (u.type === 'horse' || u.inactive || u.trimmed || u.camp || u.def.ai === 'cannon' || u.def.gun) return;
  const s = (u.id % 7) * 0.9 - 2.7; const ox = cos(u.yaw) * 0.7, oz = -sin(u.yaw) * 0.7;
  if (u.kit) { const sl = u.kit[u.kitI]; if (sl) this.pkDrop(u.x + ox, u.z + oz, sl.k, u.ammo); if (u.kitSh) this.pkDrop(u.x - ox, u.z - oz, u.team === 1 ? 'jshield' : 'shield'); return; }
  this.pkDrop(u.x + ox + s * 0.05, u.z + oz, kitKindOf(u), u.ammo);
  if (u.def.shield && u.weapon === 'katana') this.pkDrop(u.x - ox, u.z - oz, u.team === 1 ? 'jshield' : 'shield');
};
// the kit: slots { k: kind, o: 1 for a weapon of his own def, w: its weapon key, am: rounds in it when stowed }
Sim.prototype.kitInit = function (u) {
  if (u.kit) return; u.baseDef = u.def; u.baseRole = u.role; u.kitSh = false;
  u.kit = (u.def.weapons || []).filter(w => w === 'katana' || w === 'yari' || w === 'rifle' || w === 'bow').map(w => ({ k: kitKindOf(u, w) || 'dao', o: 1, w, am: w === u.weapon ? u.ammo : undefined }));
  if (!u.kit.length) u.kit = [{ k: 'dao', o: 1, w: u.weapon || 'katana' }];
  u.kitI = Math.max(0, u.kit.findIndex(s => s.w === u.weapon));
};
Sim.prototype.kitDef = function (u, sl) {
  let d;
  if (sl.o) d = u.baseDef;
  else { const C = this.kitCache || (this.kitCache = new Map()); let m = C.get(u.baseDef); if (!m) { m = {}; C.set(u.baseDef, m); }
    d = m[sl.k] || (m[sl.k] = Object.assign({}, u.baseDef, { shield: false, brush: false, trident: false, rifle: undefined, bow: undefined, revolver: undefined }, WPN[sl.k].d)); }
  if (u.kitSh && !WPN[sl.k].two && !d.shield) { const C2 = this.kitCache2 || (this.kitCache2 = new Map()); let s = C2.get(d); if (!s) { s = Object.assign({}, d, { shield: true, block: Math.max(d.block || 0, 0.8) }); C2.set(d, s); } d = s; }
  return d;
};
// switch to slot i (an ST_SWAP: the old weapon is stowed, the new one drawn)
Sim.prototype.kitSwitch = function (u, i) {
  if (!u.kit || i === u.kitI || i < 0 || i >= u.kit.length) return false;
  if (!(u.st === ST_IDLE || u.st === ST_RELOAD || u.st === ST_AIM)) return false;
  const cur = u.kit[u.kitI]; if (cur) cur.am = u.ammo;
  const sl = u.kit[i]; u.kitI = i; u.def = this.kitDef(u, sl); const w = sl.o ? sl.w : WPN[sl.k].w;
  u.kitRole = sl.o ? undefined : (WPN[sl.k].role || ''); u.club = false; // his place in the team (u.role) never changes; kitRole only says which long weapon he holds
  const g = gunOf(u.def, w); u.ammo = sl.am !== undefined ? sl.am : g ? (g.mag || 1) : 0; if (g) u.shots = Math.max(u.shots || 0, 20);
  u.nextWeapon = w; u.st = ST_SWAP; u.stT = 0; u.blocking = false; u.aiming = false; u.fireQ = 0;
  this.events.push({ t: 'kitswap', id: u.id, k: sl.k }); return true;
};
// the input: Q/X/wheel cycles, 1-4 picks a slot; returns true when the kit took the input
Sim.prototype.kitInput = function (u, a, wsel) {
  if (!u.kit || u.kit.length < 2) return false;
  if (a & A_SWAP) { this.kitSwitch(u, (u.kitI + 1) % u.kit.length); return true; }
  if (wsel > 0) { if (wsel <= u.kit.length) this.kitSwitch(u, wsel - 1); return true; }
  return false;
};
// E near a weapon on the ground: take it (a full kit swaps it for the one in your hands, which goes to the ground)
Sim.prototype.pkTry = function (u) {
  const P = this.pickups; if (!P || !P.length || u.mount >= 0 || u.mounted) return false;
  let bi = -1, bd = 1.9; for (let i = 0; i < P.length; i++) { const p = P[i]; const d = len(p.x - u.x, p.z - u.z); if (d < bd) { bd = d; bi = i; } }
  if (bi < 0) return false; const p = P[bi]; P.splice(bi, 1); this.kitInit(u);
  const pl = u.ctrl >= 0 ? this.players[u.ctrl] : null; if (pl) { (pl.picked || (pl.picked = [])).push(p.k); }
  if (WPN[p.k].sh) { if (u.kitSh) this.pkDrop(u.x, u.z, p.k === 'shield' ? 'jshield' : 'shield'); u.kitSh = true; u.def = this.kitDef(u, u.kit[u.kitI]); this.events.push({ t: 'pkget', id: u.id, k: p.k }); return true; }
  const nsl = { k: p.k, o: 0, am: p.am >= 0 ? p.am : undefined };
  if (u.kit.length < KIT_MAX) { u.kit.push(nsl); this.kitSwitch(u, u.kit.length - 1); }
  else { const old = u.kit[u.kitI]; this.pkDrop(u.x + 0.4, u.z + 0.4, old.k, u.ammo); const i = u.kitI; u.kit[i] = nsl; u.kitI = -1; this.kitSwitch(u, i); }
  this.events.push({ t: 'pkget', id: u.id, k: p.k }); return true;
};
// a story loadout: the weapons from your arsenal you chose to carry into battle
Sim.prototype.kitGive = function (u, kinds) {
  if (!u || u.dead) return; this.kitInit(u);
  for (const k of kinds) { if (!WPN[k]) continue; if (WPN[k].sh) { u.kitSh = true; continue; } if (u.kit.length >= KIT_MAX || u.kit.some(s => s.k === k)) continue; u.kit.push({ k, o: 0 }); }
  u.def = this.kitDef(u, u.kit[u.kitI]);
};
// assault: however big the manpower pool, no more than about 64 men per side stand on the field at once
Sim.prototype.assaultCap = function () {
  const M = this.mission, A = M.attacker, CAP = M.cap || 64; const size = (p) => { let n = 0; for (const id of p.squads) { const q = this.squads[id]; for (const uid of q.unitIds) if (!this.units[uid].dead) n++; } return n; };
  const groups = (team, res) => Object.keys(this.mg).filter(g => this.mg[g].G.team === team && !!this.mg[g].G.reserve === res).map(g => this.players[this.mg[g].p]);
  const fit = (list, budget) => { const tot = list.reduce((s, p) => s + size(p), 0); if (tot <= budget) return; for (const p of list) { const n = Math.max(4, Math.floor(size(p) * budget / tot)); this.mTrim(p, n, true); } };
  const humanMen = this.players.filter(p => !p.ai && p.team === A).reduce((s, p) => s + size(p), 0), humanDef = this.players.filter(p => !p.ai && p.team !== A).reduce((s, p) => s + size(p), 0);
  // attackers come as many small companies (about a fifth of the field each) so there are enough to fill the ditch,
  // push every engine and climb every ladder at once
  // a siege needs more, smaller companies: one at each ditch, one at the ram, one at each tower
  const per = Math.max(8, Math.round(CAP / 3)); fit(groups(A, false), Math.max(16, CAP - humanMen)); for (const p of groups(A, true)) if (size(p) > per) this.mTrim(p, per, true);
  // the defenders' reserves count against the same field: garrison plus reserves never exceed the cap
  // (an assault needs odds: the attackers field the full cap, the defenders about 70% of it, as before the cap)
  fit(groups(1 - A, false).concat(groups(1 - A, true)), Math.max(16, Math.round(CAP * 0.7) - humanDef));
};
// ---------- getting round things instead of pushing into them ----------
// Every walking AI man looks a few paces ahead along the way he means to go. A tree, rock, stake or the corner of a
// house in his path: he bends his course to pass it on the roomy side, early and smoothly, instead of walking into it
// and being shoved back. A comrade standing in the way, or coming head-on: step round him (head-on, both keep right).
// And if for all that he has hardly moved for half a second while meaning to, he is stuck: he side-steps, re-plans his
// route, and if it keeps happening he squeezes past his own men for a moment. Deterministic: no randomness, ids only.
const AV_C = [0.9397, 0.7660, 0.5000, 0.0872], AV_S = [0.3420, 0.6428, 0.8660, 0.9962]; // cos/sin of 20, 40, 60, 85 degrees
// how far he can walk along (hx, hz) before touching a tree, rock, stake or building (up to L)
Sim.prototype.freeRun = function (u, hx, hz, L) {
  const r = u.def.r; let best = L; const cs = this.cellSize, W = this.gridW; const cx = Math.floor((u.x + HALF + 5) / cs), cz = Math.floor((u.z + HALF + 5) / cs);
  for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) { const gx = cx + ox, gz = cz + oz; if (gx < 0 || gz < 0 || gx >= W || gz >= W) continue;
    let oid = this.obsHead[gz * W + gx];
    while (oid >= 0) { const o = this.obstacles[oid]; oid = this.obsNext[oid]; const rx = o.x - u.x, rz = o.z - u.z, t = rx * hx + rz * hz; if (t < -0.2 || t > best + o.r + r) continue;
      const s = rx * hz - rz * hx, clr = r + o.r + 0.12; if (s >= clr || s <= -clr) continue; const e = t - Math.sqrt(clr * clr - s * s); if (e < best) best = e < 0 ? 0 : e; } }
  for (let t = 0.5; t <= best; t += 0.5) { const px = u.x + hx * t, pz = u.z + hz * t; const bl = this.boxCells[this.cellOf(px, pz)]; if (!bl) continue;
    for (let k = 0; k < bl.length; k++) { const b = this.boxes[bl[k]]; if (b.hw < 0.1 || b.kind === 'gate' || (b.lad && b.lad.up)) continue;
      if (Math.abs(px - b.x) < b.hw + r + 0.08 && Math.abs(pz - b.z) < b.hd + r + 0.08) return t - 0.5; } }
  return best;
};
Sim.prototype.steerAround = function (u) {
  if (u.ghostT > 0) u.ghostT -= DT; if (u.unstickT > 0) u.unstickT -= DT;
  const sp = len(u.mx, u.mz);
  if (sp < 0.35) { u.stkX = u.x; u.stkZ = u.z; u.stkK = this.tick; u.stkN = 0; return; }
  let dx = u.mx / sp, dz = u.mz / sp; const nx = dz, nz = -dx, r = u.def.r; let ax = 0, az = 0;
  // 1+2. trees, rocks, stakes and the faces of houses, walls and palisades: if the way ahead is not clear, try headings
  // fanning out to either side (the side he chose last time first, so he doesn't dither) and take the first clear one
  { const look = clamp(sp * 0.6, 1.6, 3.4);
    if (this.freeRun(u, dx, dz, look) < look) {
      const pref = u.avS || (((u.id >> 1) & 1) ? 1 : -1); let best = 0, bf = -1;
      for (let k = 0; k < 8; k++) { const sg = (k & 1) ? -pref : pref, j = k >> 1; const c = AV_C[j], s = AV_S[j] * sg; const hx = dx * c + nx * s, hz = dz * c + nz * s;
        const f = this.freeRun(u, hx, hz, look); if (f >= look) { best = k; bf = f; break; } if (f > bf + 0.25) { bf = f; best = k; } }
      const sg = (best & 1) ? -pref : pref, j = best >> 1; u.avS = sg; u.avK = this.tick;
      const c = AV_C[j], s = AV_S[j] * sg; ax += dx * c + nx * s - dx; az += dz * c + nz * s - dz;
    } else if (u.avS && this.tick - (u.avK || 0) > 20) u.avS = 0; }
  // 3. a comrade in the way
  { const n = this.gatherNear(u.x, u.z, 1.8); let bt = 1e9, bs = 0, head = false;
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.team !== u.team || v.mount >= 0 || v.type === 'horse') continue;
      const rx = v.x - u.x, rz = v.z - u.z, t = rx * dx + rz * dz; if (t <= 0.05 || t > 1.7) continue; const s = rx * nx + rz * nz, clr = r + v.def.r + 0.05; if (s >= clr || s <= -clr) continue;
      const vv = len(v.mx, v.mz), along = vv > 0.3 ? (v.mx * dx + v.mz * dz) / vv : 0; if (along > 0.6 && vv > sp * 0.6) continue; // he is walking the same way: follow him
      if (t < bt) { bt = t; bs = s; head = along < -0.4; } }
    if (bt < 1e9) { const side = head ? 1 : bs > 0.02 ? -1 : bs < -0.02 ? 1 : ((u.id & 1) ? 1 : -1); const k = 0.9 * (1 - clamp(bt / 1.8, 0, 1)) + 0.25; ax += nx * side * k; az += nz * side * k; } }
  // 4. stuck: meaning to move, hardly moving
  if (u.stkK === undefined || this.tick - u.stkK > 30) { u.stkX = u.x; u.stkZ = u.z; u.stkK = this.tick; u.stkN = 0; }
  else if (this.tick - u.stkK >= 15) { const moved = len(u.x - u.stkX, u.z - u.stkZ), want = sp * 0.5;
    if (moved < want * 0.22) { u.stkN = (u.stkN || 0) + 1; u.unstickT = 0.6; u.unstickS = ((u.id + u.stkN) & 1) ? 1 : -1; u.navT = 0; if (u.stkN >= 2) u.ghostT = 0.7; } else u.stkN = 0;
    u.stkX = u.x; u.stkZ = u.z; u.stkK = this.tick; }
  if (u.unstickT > 0) { ax += nx * u.unstickS * 1.3 - dx * 0.2; az += nz * u.unstickS * 1.3 - dz * 0.2; }
  if (ax === 0 && az === 0) return;
  let fx = dx + ax, fz = dz + az; const fl = len(fx, fz); if (fl < 1e-4) { fx = nx; fz = nz; } else { fx /= fl; fz /= fl; }
  u.mx = fx * sp; u.mz = fz * sp;
};
// a man you play gets his breath and some strength back once he's out of the fight: nobody hurt him for 6 s and no
// enemy within 12 m; he mends about 4% of his health a second, up to full
Sim.prototype.heroRegen = function (u) {
  if (u.dead || u.wounded || u.downed || u.type === 'horse' || u.hp >= u.def.hp) return;
  if (this.tick - (u.hurtTk === undefined ? -1e9 : u.hurtTk) < 30 * 6) return;
  if (this.tick % 15 === u.id % 15) { u.regenOk = true; const n = this.gatherNear(u.x, u.z, 12); for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (!v.dead && v.team !== u.team && v.type !== 'horse' && !v.inactive && len(v.x - u.x, v.z - u.z) < 12) { u.regenOk = false; break; } } }
  if (u.regenOk) u.hp = Math.min(u.def.hp, u.hp + u.def.hp * 0.04 * DT);
};
Sim.prototype.mTrim = function (p, n, keepHero) {
  let k = 0; for (const id of p.squads) { const q = this.squads[id]; const keep = Math.max(0, Math.min(q.unitIds.length, n - k)); q.unitIds.forEach((uid, i) => { if (i < keep) return; const u = this.units[uid]; u.dead = true; u.hp = 0; u.inactive = true; u.trimmed = true; this.total[u.team]--; }); k += keep; q.count = keep; q.aliveCount = keep; if (!keep) q.alive = false; }
  if (!keepHero) for (const uid of [p.heroId, p.horseId]) { const u = uid >= 0 ? this.units[uid] : null; if (u) { u.dead = true; u.hp = 0; u.inactive = true; if (u.type !== 'horse') this.total[u.team]--; } }
};
Sim.prototype.coverShield = function (v, p) { // a rattan shield beside you turns the arrow meant for you
  const src = atan2(-p.vx, -p.vz); const n = this.gatherNear(v.x, v.z, 1.9);
  for (let i = 0; i < n; i++) { const s = this.units[this.nearBuf[i]]; if (s === v || s.dead || s.wounded || s.team !== v.team || !s.def.shield || s.st === ST_STUN) continue; if (Math.abs(wrap(src - s.yaw)) < 1.2) return this.rng.next() < 0.5; }
  return false;
};
// a comrade with no enemy close goes to a downed friend and hauls him up
Sim.prototype.aiMedic = function (u) {
  if (u.medicOf >= 0 && u.medicOf !== undefined) { const v = this.units[u.medicOf];
    const foe = u.target >= 0 ? this.units[u.target] : null; const threat = foe && !foe.dead && len(foe.x - u.x, foe.z - u.z) < 7;
    if (!v || v.dead || !v.downed || threat || (v.reviveBy >= 0 && v.reviveBy !== u.id)) { if (v && v.medic === u.id) v.medic = -1; if (v && v.reviveBy === u.id) v.reviveBy = -1; u.medicOf = -1; return false; }
    const d = len(v.x - u.x, v.z - u.z); if (d > 1.6) { const y = this.steerFoot(u, v.x, v.z, u.def.speed); this.turnTo(u, y, 6 * DT); } else { u.mx = 0; u.mz = 0; if (v.reviveBy < 0) { v.reviveBy = u.id; v.reviveT = 0; this.events.push({ t: 'zrevive0', id: v.id, by: u.id }); } }
    u.blocking = false; if (u.st === ST_AIM) { u.st = ST_IDLE; u.stT = 0; } return true; }
  if ((this.tick + u.id) % 15 !== 0 || u.st !== ST_IDLE) return false;
  let best = null, bd = 12; for (const v of this.teamAlive[u.team]) { if (!v.downed || v.reviveBy >= 0 || (v.medic >= 0 && v.medic !== u.id)) continue; if (!(u.zfile ? v.zfile || u.squad === v.squad : u.squad === v.squad)) continue; const d = len(v.x - u.x, v.z - u.z); if (d < bd) { bd = d; best = v; } }
  if (!best) return false;
  let ed = 1e9; for (const e of this.teamAlive[1 - u.team]) { if (e.inactive) continue; const d = len(e.x - best.x, e.z - best.z); if (d < ed) ed = d; if (ed < 12) break; } if (ed < 12) return false;
  best.medic = u.id; u.medicOf = best.id; return true;
};

// a man down and waiting for help drags himself back toward his own people, slowly, and lies still when the enemy is
// on top of him (playing dead); he stops once a comrade is within reach so whoever comes for him can find him
// ---- camp life: what a man at the fire is doing (client draws it; u.cAct, u.cLook, u.cRise) ----
// activities: 0 stand 1 warm hands 2 drink 3 eat 4 squat 5 sharpen 6 mend 7 sleep 8 stretch 9 talk 10 sentry 11 walk
// 12 feed the fire 13 stir the pot 14 dice 15 pipe. Seated men stay at their place; a few standing men wander.
const CAMP_SEAT = [1, 2, 3, 5, 6, 15, 4, 12, 14, 7], CAMP_STAND = [0, 2, 8, 9, 10, 0, 15];
Sim.prototype.campThink = function (u) {
  const C = this.cfg.camp || {}, rng = this.rng;
  if (u.cAct === undefined) { u.cHx = u.x; u.cHz = u.z; u.cYaw0 = u.yaw; u.cSeat = u.campPose === 'squat'; u.cWander = !u.cSeat && rng.next() < 0.55; u.cT = (30 * (2 + rng.next() * 10)) | 0; u.cAct = u.cSeat ? CAMP_SEAT[(rng.next() * 6) | 0] : 0; u.cLook = 0; u.cRise = 0; u.cMate = -1; }
  u.mx = 0; u.mz = 0; u.target = -1;
  // a man you walk up to looks at you; a seated man close enough to talk to gets up
  let h = null; for (const p of this.players) { if (p.ai) continue; const v = this.units[p.heroId]; if (v && !v.dead) { h = v; break; } }
  if (h) { const dx = u.x - h.x, dz = u.z - h.z, d = len(dx, dz), face = d > 0.01 ? (dx * sin(h.yaw) + dz * cos(h.yaw)) / d : 0;
    const was = u.cLook; u.cLook = d < 2.9 && face > 0.55 ? 1 : d < 1.7 ? 1 : 0; if (u.cLook && !was && u.cAct === 11) { u.cAct = 0; }
    if (u.cAct === 7 && d < 1.5 && face > 0.7) { u.cAct = 1; u.cT = 30 * 15; } // a sleeper you stand over wakes and sits up
    u.cRise = u.cLook && d < 2.2 && u.cAct !== 7 ? 1 : 0;
    // only a man on his feet (or one getting up to talk) turns his body toward you, and not in one jerk; the rest just look
    if (u.cLook && (!u.cSeat || u.cRise) && u.cAct !== 7) { this.turnTo(u, atan2(h.x - u.x, h.z - u.z), 2.2 * DT); return; } }
  if (--u.cT <= 0) { // time for something else
    u.cMate = -1;
    if (u.cSeat) { u.cAct = CAMP_SEAT[(rng.next() * CAMP_SEAT.length) | 0];
      if (u.cAct === 14) { const m = this.campNear(u, 2.4, true); if (m) { u.cMate = m.id; m.cAct = 14; m.cMate = u.id; m.cT = 30 * 20; } else u.cAct = 1; }
      if (u.cAct === 7 && rng.next() < 0.6) u.cAct = 1; // not everyone sleeps
      u.cT = (30 * (u.cAct === 7 ? 40 + rng.next() * 30 : 14 + rng.next() * 22)) | 0; }
    else if (u.cWander && u.cAct !== 11 && rng.next() < 0.6) { // off for a walk: a fire, a tent, a cart, a friend
      const T = []; for (const f of C.fires || []) { const a = rng.next() * 6.283; T.push([f[0] + sin(a) * 2.3, f[1] + cos(a) * 2.3]); }
      for (const t of C.tents || []) T.push([t[0], t[1] + t[3] + 1.4]); for (const p of C.props || []) if (p[0] === 'wagon' || p[0] === 'pot' || p[0] === 'rack' || p[0] === 'cart') T.push([p[1] + 1.2, p[2] + 1.2]);
      for (const v of this.units) if (v.camp && v !== u && !v.cSeat) T.push([v.x + 1.1, v.z + 0.6]);
      T.push([u.cHx, u.cHz]); const t = T[(rng.next() * T.length) | 0]; u.cTx = t[0]; u.cTz = t[1]; u.cAct = 11; u.cT = 30 * 25; }
    else { u.cAct = CAMP_STAND[(rng.next() * CAMP_STAND.length) | 0];
      if (u.cAct === 9) { const m = this.campNear(u, 3.2, false); if (m && m.cAct !== 11) { u.cMate = m.id; if (!m.cSeat && !m.cLook) { m.cAct = 9; m.cMate = u.id; m.cT = 30 * 14; } } else u.cAct = 0; }
      u.cT = (30 * (10 + rng.next() * 18)) | 0;
      // by the pot, a standing man stirs it
      for (const p of C.props || []) if (p[0] === 'pot' && len(p[1] - u.x, p[2] - u.z) < 2.2 && rng.next() < 0.5) { u.cAct = 13; u.cPot = [p[1], p[2]]; } } }
  if (u.cAct === 11) { const d = len(u.cTx - u.x, u.cTz - u.z);
    if (d > 0.6) { const y = this.steerFoot(u, u.cTx, u.cTz, 1.25); this.turnTo(u, y, 3 * DT); }
    else { u.cAct = 9; const m = this.campNear(u, 3, false); if (m) { u.cMate = m.id; if (!m.cSeat && m.cAct !== 11 && !m.cLook) { m.cAct = 9; m.cMate = u.id; m.cT = 30 * 12; } } else { u.cAct = 0; } u.cT = (30 * (8 + rng.next() * 12)) | 0; }
    return; }
  // face: the friend you're talking or playing with, the pot you stir, else the fire (or where you were put)
  let fy = u.cYaw0; const m = u.cMate >= 0 ? this.units[u.cMate] : null;
  if (m && !m.dead) fy = atan2(m.x - u.x, m.z - u.z);
  else if (u.cAct === 13 && u.cPot) fy = atan2(u.cPot[0] - u.x, u.cPot[1] - u.z);
  else if (!u.cSeat && len(u.x - u.cHx, u.z - u.cHz) > 1.5) { let bd = 1e9, bf = null; for (const f of C.fires || []) { const d = len(f[0] - u.x, f[1] - u.z); if (d < bd) { bd = d; bf = f; } } if (bf && bd < 6) fy = atan2(bf[0] - u.x, bf[1] - u.z); }
  this.turnTo(u, fy, 2 * DT);
};
Sim.prototype.campNear = function (u, r, seated) { let best = null, bd = r; for (const v of this.units) { if (!v.camp || v === u || v.dead || !!v.cSeat !== seated) continue; const d = len(v.x - u.x, v.z - u.z); if (d < bd) { bd = d; best = v; } } return best; };
Sim.prototype.zCrawl = function (u) {
  if (this.tick % 6 === u.id % 6) { let best = null, bd = 45, foe = 99, near = false; const n = this.gatherNear(u.x, u.z, 45);
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v === u || v.dead || v.type === 'horse' || v.camp || v.noncomb) continue; const d = len(v.x - u.x, v.z - u.z);
      if (v.team !== u.team) { if (d < foe) foe = d; continue; } if (v.wounded || v.inactive) continue; if (d < 2.4) near = true; const w = d - (v.squad === u.squad ? 6 : 0); if (w < bd) { bd = w; best = v; } }
    // the aid post, when it is about as near as his own people, is where he drags himself
    const A = this.aidPost(), dA = A ? len(A.x - u.x, A.z - u.z) : 1e9, dF = best ? len(best.x - u.x, best.z - u.z) : 1e9;
    u.crawlAid = !!A && dA < 60 && dA < dF * 1.6 + 6; u.crawlTo = u.crawlAid ? -2 : best && !near ? best.id : -1;
    u.crawling = foe > 3.2 && (u.crawlAid || (u.crawlTo >= 0 && !near)); }
  if (!u.crawling) return; let tx, tz; if (u.crawlTo === -2) { const A = this.aidPost(); if (!A) { u.crawling = false; return; } tx = A.x; tz = A.z; if (len(tx - u.x, tz - u.z) < A.r) { this.zAid(u, -1); return; } }
  else { const v = this.units[u.crawlTo]; if (!v || v.dead) { u.crawling = false; return; } tx = v.x; tz = v.z; }
  const dx = tx - u.x, dz = tz - u.z, d = len(dx, dz); if (d < 2.4 && u.crawlTo !== -2) { u.crawling = false; return; }
  const sp = 0.5 * DT; u.x += dx / d * sp; u.z += dz / d * sp; u.y = terrainH(u.x, u.z); this.turnTo(u, atan2(dx, dz), 2 * DT);
};
// ---- the aid post (story battles): a staffed tent behind your own line (the Ming 醫 of the camp, the Jin baggage) ----
// It stands about thirty paces behind your file, away from the enemy, and moves back with the line each phase (or where
// the mission's phase says, phases[i].aid / mission.aid = [x, z]). A wounded man brought or crawling there is handed to
// the orderlies: out of the fight, and alive for the roll call.
Sim.prototype.aidPost = function () {
  const M = this.mission, mv = this.mv; if (!M || !M.soldier || M.camp || !mv || mv.ph < 0) return null;
  if (this.aid && this.aid.ph === mv.ph) return this.aid;
  const side = M.side | 0, P = M.phases[mv.ph] || {}, fix = P.aid || M.aid; let x, z;
  if (fix) { x = fix[0]; z = fix[1]; }
  else { let fx = 0, fz = 0, fn = 0, ex = 0, ez = 0, en = 0; const me = this.players.find(p => !p.ai); const fq = me && me.soldierSq !== undefined ? this.squads[me.soldierSq] : null;
    if (fq && fq.alive) { fx = fq.cx; fz = fq.cz; fn = 1; } else for (const u of this.teamAlive[side]) { if (u.wounded || u.noncomb || u.inactive || u.def.ai === 'cannon') continue; fx += u.x; fz += u.z; fn++; }
    if (fn) { fx /= fn; fz /= fn; } else { fx = M.start[0]; fz = M.start[1]; }
    for (const u of this.teamAlive[1 - side]) { if (u.inactive || len(u.x - fx, u.z - fz) > 140) continue; ex += u.x; ez += u.z; en++; }
    let dx, dz; if (en) { dx = fx - ex / en; dz = fz - ez / en; } else { const y = (M.start[2] || 0) + PI; dx = sin(y); dz = cos(y); }
    const l = len(dx, dz) || 1; dx /= l; dz /= l; x = fx + dx * 30; z = fz + dz * 30;
    for (let k = 0; k < 6 && (waterAt(x, z) > 0 || this.boxes.some(b => Math.abs(x - b.x) < b.hw + 3 && Math.abs(z - b.z) < b.hd + 3)); k++) { x -= dx * 5; z -= dz * 5; } }
  x = clamp(x, -HALF + 12, HALF - 12); z = clamp(z, -HALF + 12, HALF - 12);
  const old = this.aid; this.aid = { ph: mv.ph, x, z, r: 5.5, n: old ? old.n : 0, ord: old ? old.ord : [], name: M.aidName || (side === 1 ? ['輜重', 'the baggage'] : ['醫帳', 'the aid tent']) };
  if (!old) { const t = M.side === 1 ? 'ashigaru' : 'ashigaru'; for (let k = 0; k < 3; k++) { const o = this.addUnit(t, side, -1, -1, x + (k - 1) * 2.2, z + 1.5, 0); o.def = defFor(t, side); o.hp = o.def.hp; o.weapon = ''; o.orderly = true; o.noncomb = true; o.fetch = -1; o.slot = k; this.aid.ord.push(o.id); } }
  // the men already in the tent's care go with it
  for (const u of this.units) if (u.aided && !u.dead) { const k = u.aidSlot | 0; u.x = u.px = x - 3 + (k % 4) * 1.6; u.z = u.pz = z - 2.5 - Math.floor(k / 4) * 2.2; u.y = u.py = terrainH(u.x, u.z); }
  this.events.push({ t: 'aidpost', x, z }); return this.aid;
};
Sim.prototype.zAid = function (u, by) { // handed to the orderlies: laid on a mat in the tent's lee, out of the fight
  const A = this.aidPost(); if (!A) return; const k = A.n++; u.aided = true; u.aidSlot = k; u.wounded = true; u.downed = false; u.helpedBy = -1; u.reviveBy = -1; u.crawling = false; u.noncomb = true; u.bleed = 0; u.medic = -1;
  u.x = u.px = A.x - 3 + (k % 4) * 1.6; u.z = u.pz = A.z - 2.5 - Math.floor(k / 4) * 2.2; u.y = u.py = terrainH(u.x, u.z); u.yaw = PI * 0.5; u.mx = 0; u.mz = 0; u.st = ST_IDLE; u.stT = 0; u.downT = 0.3;
  for (const o of this.units) if (o.orderly && o.fetch === u.id) o.fetch = -1;
  this.events.push({ t: 'zaid', id: u.id, by, x: u.x, z: u.z, file: !!u.zfile });
};
// the orderlies stand at the tent; when a man lies wounded within a short dash of it and no enemy is on him, one goes
// out, gets him up with an arm over his shoulder and walks him back
Sim.prototype.orderlyAI = function (u) {
  u.target = -1; u.blocking = false; u.aiming = false; if (u.st !== ST_IDLE) { u.st = ST_IDLE; u.stT = 0; } const A = this.aidPost(); if (!A) { u.mx = 0; u.mz = 0; return; }
  const go = (x, z, sp) => { const d = len(x - u.x, z - u.z); if (d > 0.6) { const y = this.steerFoot(u, x, z, sp); this.turnTo(u, y, 6 * DT); } else { u.mx = 0; u.mz = 0; } return d; };
  if (u.fetch >= 0) { const v = this.units[u.fetch];
    if (!v || v.dead || v.aided || !v.wounded || (v.helpedBy >= 0 && v.helpedBy !== u.id) || (v.reviveBy >= 0 && v.reviveBy !== u.id)) { if (v && v.helpedBy === u.id) v.helpedBy = -1; u.fetch = -1; }
    else if (v.helpedBy === u.id) { go(A.x, A.z, u.def.speed * 0.55); return; }
    else { if (go(v.x, v.z, u.def.speed * 0.9) < 1.6) { v.downed = false; v.reviveBy = -1; v.crawling = false; v.bleed = 0; v.downT = 0; v.helpedBy = u.id; this.events.push({ t: 'zcollect', id: v.id, by: u.id }); } return; } }
  if ((this.tick + u.id) % 15 === 0) { let best = null, bd = A.r + 18; for (const v of this.teamAlive[u.team]) { if (!v.wounded || v.aided || v.noncomb || v.helpedBy >= 0 || v.reviveBy >= 0 || v.ctrl >= 0) continue; if (this.units.some(o => o.orderly && o !== u && o.fetch === v.id)) continue; const d = len(v.x - A.x, v.z - A.z); if (d < bd) { bd = d; best = v; } }
    if (best) { let ed = 1e9; for (const e of this.teamAlive[1 - u.team]) { if (e.inactive) continue; const d = len(e.x - best.x, e.z - best.z); if (d < ed) ed = d; if (ed < 10) break; } if (ed >= 10) { u.fetch = best.id; return; } } }
  const k = u.slot | 0; go(A.x + (k - 1) * 2.2, A.z + 1.6, u.def.speed * 0.6); if (len(A.x + (k - 1) * 2.2 - u.x, A.z + 1.6 - u.z) < 0.8) this.turnTo(u, u.yaw + 0.01, DT);
};
Sim.prototype.woundedAI = function (u) {
  u.target = -1; u.blocking = false; if (u.st !== ST_IDLE && u.st !== ST_STUN) { u.st = ST_IDLE; u.stT = 0; }
  if (u.aided) { u.mx = 0; u.mz = 0; u.downT = Math.max(u.downT, 0.2); return; }
  if (u.downed) { u.mx = 0; u.mz = 0; u.downT = Math.max(u.downT, 0.2);
    if (u.reviveBy >= 0) { const r = this.units[u.reviveBy]; if (!r || r.dead || r.wounded || len(r.x - u.x, r.z - u.z) > 2.9) { u.reviveBy = -1; u.reviveT = 0; } else if (++u.reviveT >= 45) { this.zRevive(u, r.id); return; } }
    if (--u.bleed <= 0) { u.downed = false; this.kill(u, 0, 0, 0, 'bleed', -1); return; }
    if (u.reviveBy < 0 && u.ctrl < 0) this.zCrawl(u); return; }
  const h = u.helpedBy >= 0 ? this.units[u.helpedBy] : null; if (h && h.dead) u.helpedBy = -1;
  if (u.helpedBy < 0 || !h) { // limps after his own people on his own
    const q = u.squad >= 0 ? this.squads[u.squad] : null; if (q && q.alive && len(q.cx - u.x, q.cz - u.z) > 4) { const y = this.steerFoot(u, q.cx, q.cz, u.def.speed * 0.55); this.turnTo(u, y, 4 * DT); } else { u.mx = 0; u.mz = 0; } return; }
  { const A = this.aidPost(); if (A && len(u.x - A.x, u.z - A.z) < A.r) { this.zAid(u, h.id); return; } }
  // his arm over the helper's shoulder: at the helper's left side, half a pace back, leaning on him
  const bx = h.x - sin(h.yaw) * 0.25 - cos(h.yaw) * 0.55, bz = h.z - cos(h.yaw) * 0.25 + sin(h.yaw) * 0.55, d = len(bx - u.x, bz - u.z);
  if (d > 0.5) { const y = this.steerFoot(u, bx, bz, u.def.speed * (d > 4 ? 0.8 : 0.62)); this.turnTo(u, y, 4 * DT); } else { u.mx = 0; u.mz = 0; this.turnTo(u, h.yaw, 3 * DT); }
};
// a night camp: you, your file around the fire, and the tents
Sim.prototype.setupCamp = function (humans) {
  const C = this.cfg.camp || { npcs: [], tents: [], me: { x: 0, z: 6, yaw: PI, role: 'shield' } };
  for (const t of C.tents || []) this.boxes.push({ x: t[0], z: t[1], hw: t[2], hd: t[3], h: t[4], kind: 'tent' });
  const CT = C.type || 'yuanyang', CTm = C.team | 0; // another campaign's camp: its own unit type and side (jin.js, shenji.js)
  const mk = (role, x, z, yaw) => { const u = this.addUnit(CT, CTm, -1, -1, x, z, yaw); if (CT === 'yuanyang') { u.role = role; u.def = YYDEF[role] || YYDEF.spear; u.hp = u.def.hp; u.weapon = u.def.weapons[0]; } else { u.def = defFor(CT, CTm); u.hp = u.def.hp; u.weapon = u.def.weapons[0]; } return u; };
  humans.forEach((p, i) => { p.team = CTm; p.auto = false; p.ready = true; p.squads = []; const m = C.me; const u = mk(m.role || 'shield', m.x + i * 1.5, m.z, m.yaw); u.owner = p.idx; u.ctrl = p.idx; p.heroId = u.id; p.commanderId = -1; p.respawnAt = 0; });
  for (const n of C.npcs || []) { const u = mk(n.role, n.x, n.z, n.yaw); u.camp = true; u.ci = n.ci; u.campPose = n.pose || 'stand'; }
  this.mv.ph = 0;
};
Sim.prototype.humansIn = function (z) { for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId]; if (h && !h.dead && len(h.x - z.x, h.z - z.z) < z.r + 2) return true; for (const id of p.squads) { const q = this.squads[id]; if (q.alive && len(q.cx - z.x, q.cz - z.z) < z.r + 3) return true; } } return false; };
// evaluate one objective; returns 1 when met, -1 when failed, 0 otherwise
Sim.prototype.mObj = function (o, el) {
  if (o.all) { let ok = 1; for (const s of o.all) { const r = this.mObj(s, el); if (r < 0) return -1; if (r === 0) ok = 0; } if (ok && o.keep === undefined && !o.reach) return 1; if (!ok) return 0; }
  if (o.keep) { const z = this.missionZone(o.keep); if (z && z.owner === 1 - this.mission.side) return -1; }
  if (o.reach) { const z = this.missionZone(o.reach); if (!(z && this.humansIn(z))) return 0; }
  if (o.hold) { const z = this.missionZone(o.hold); const k = 'hold:' + o.hold; if (z.n0 > 0 && z.n1 === 0) this.mv[k] = (this.mv[k] || 0) + 0.5; if ((this.mv[k] || 0) < o.t) return 0; }
  if (o.capture) { for (const k of o.capture) { const z = this.missionZone(k); if (z.owner !== this.mission.side) return 0; } }
  if (o.defeat) { for (const gid of o.defeat) { const g = this.mg[gid]; if (!g || (!g.released && !g.broken)) return 0; if (!g.broken && this.mGroupFrac(gid) > 1 - (o.frac || 0.8)) return 0; } for (const gid of o.defeat) this.mBreak(gid); }
  if (o.officer) { const g = this.mg[o.officer]; if (!g || !g.released) return 0; const h = this.units[this.players[g.p].heroId]; const wound = g.G.wound; if (h && !h.dead && !(wound && h.hp < h.def.hp * wound)) return 0; if (!g.broken) { this.events.push({ t: 'mofficer', name: g.G.name, zh: g.G.zh || '', gid: o.officer, wounded: !!(h && !h.dead) }); this.mBreak(o.officer); } }
  if (o.arrive) { const z = this.missionZone(o.zone), p = this.players[this.mg[o.arrive].p]; let n = 0, a = 0; for (const id of p.squads) { const q = this.squads[id]; if (!q.alive) continue; a++; if (len(q.cx - z.x, q.cz - z.z) < z.r + 8) n++; } if (a === 0) return -1; if (n < a) return 0; }
  if (o.survive) { if (el < o.survive) return 0; }
  if (o.never) return 0;
  if (o.extract) { const z = this.missionZone(o.extract); let ok = false; for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId]; if (h && !h.dead && len(h.x - z.x, h.z - z.z) < z.r + 1) ok = true; } if (!ok) return 0;
    // you are out: wait (up to 20 s) for the men of your file who are still on their feet and coming
    if (this.mv.exT === undefined) { this.mv.exT = this.tick; this.events.push({ t: 'zwait', s: 20 }); }
    if (this.tick - this.mv.exT < 30 * 20) { for (const u of this.units) { if (!u.zfile || u.dead || u.downed || u.ctrl >= 0) continue; if (u.wounded && u.helpedBy < 0) continue; if (len(u.x - z.x, u.z - z.z) > z.r + 10) return 0; } } }
  return 1;
};
Sim.prototype.missionThink = function () {
  const M = this.mission; if (this.mwin !== undefined) return; if (this.mode === 'assault') return this.assaultThink();
  if (M.beacon && this.beaconTick) { this.beaconTick(); if (this.mwin !== undefined) return; }
  const mv = this.mv;
  if (mv.ph < 0) { mv.ph = 0; mv.t0 = this.tick; this.mStart(); }
  if (M.soldier && this.tick % 15 === 0) this.aidPost();
  const P = M.phases[mv.ph], el = (this.tick - mv.t0) / 30;
  for (const [t, gid, dir] of P.waves || []) { const k = mv.ph + ':' + gid; if (!mv.waves[k] && el >= t) { mv.waves[k] = 1; this.mRelease(gid); if (dir) this.mDir(gid, dir); } }
  for (const [t, a] of P.at || []) { const k = mv.ph + ':at:' + t; if (!mv.ats[k] && el >= t) { mv.ats[k] = 1; this.mAct(a); } }
  for (const [t, who, text, zh] of P.say || []) { const k = mv.ph + ':' + t; if (!mv.said[k] && el >= t) { mv.said[k] = 1; this.events.push({ t: 'msay', who, text, zh: zh || '' }); } }
  if (this.tick % 60 === 0) this.mAggro();
  // broken groups melt away at the field's edge
  for (const gid in this.mg) { const g = this.mg[gid]; if (!g.broken) continue; const p = this.players[g.p];
    for (const uid of [p.heroId, p.horseId]) { const h = this.units[uid]; if (!h || h.dead || h.officer) continue; const D = p.directive; if (uid === p.heroId && D) { h.slotX = D.x; h.slotZ = D.z; } if (Math.abs(h.x) > HALF - 14 || Math.abs(h.z) > HALF - 14 || (uid === p.horseId && h.rider < 0)) this.flee(h); }
    for (const id of p.squads) { const q = this.squads[id]; for (const uid of q.unitIds) { const u = this.units[uid]; if (!u.dead && (Math.abs(u.x) > HALF - 12 || Math.abs(u.z) > HALF - 12)) this.flee(u); } } }
  // commanders who fall return to their men; a wiped-out company is replaced from the reserve (twice)
  if (M.soldier) { for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId];
      if (!h || h.dead) { if (!p.respawnT) p.respawnT = this.tick + 30 * 4; else if (this.tick >= p.respawnT) { p.respawnT = 0; const q = this.squads[p.soldierSq]; const mine = q && q.owner === p.idx; p.heroId = -1;
          const ok = this.possess(p, q && q.alive ? q : null) || this.possess(p, this.squads.find(s => s.team === p.team && s.alive && !s.inactive && s.def.ai !== 'cannon'));
          if (!ok) { this.mOver(false, 'There is no one left to carry on.'); return; } if (mine) { p.commanderId = p.heroId; for (const id of p.squads) { const q2 = this.squads[id]; if (q2.alive) { q2.order = ORD_FOLLOW; q2.fAx = undefined; } } } this.events.push({ t: 'zcarry', p: p.idx, id: p.heroId }); } } }
  }
  else for (const p of this.players) { if (p.ai) continue; const h = this.units[p.heroId];
    if (h && h.dead) { if (!p.respawnT) p.respawnT = this.tick + 30 * 10; else if (this.tick >= p.respawnT) { const q = p.squads.map(id => this.squads[id]).find(q => q.alive); const sx = q ? q.cx : M.start[0], sz = q ? q.cz - 6 : M.start[1];
        h.dead = false; h.hp = h.def.hp; h.x = sx; h.z = sz; h.y = terrainH(sx, sz); h.px = h.x; h.pz = h.z; h.py = h.y; h.vx = h.vz = h.vy = 0; h.st = ST_IDLE; h.stT = 0; h.mount = -1; h.mounted = false; h.deathTick = -1; p.respawnT = 0; this.events.push({ t: 'respawn', id: h.id, p: p.idx }); } }
    if (!p.squads.some(id => this.squads[id].alive) && p.spare > 0 && !p.spareT) p.spareT = this.tick + 30 * 8;
    if (p.spareT && this.tick >= p.spareT) { p.spareT = 0; p.spare--; const a = this.players.find(q => q.ai && q.team === M.side && q.squads.some(id => this.squads[id].alive && !this.squads[id].inactive));
      const sid = p.spareIds.shift(); if (sid !== undefined) this.mJoin(p, sid, false); } }
  const lost = false;
  let r = lost ? -1 : this.mObj(P.obj, el);
  if (r === 0 && P.limit && el > P.limit) r = -1;
  if (r < 0) { this.mOver(false, lost ? 'Your companies are gone.' : (P.fail || 'The objective is lost.')); return; }
  if (r > 0) { for (const a of P.done || []) this.mAct(a); for (const k of P.hide || []) this.mAct(['hide', k]); if (mv.ph + 1 >= M.phases.length) { this.mOver(true, M.win); return; } mv.ph++; mv.t0 = this.tick; this.mStart(); }
};
// ---- debug / testing (solo only: travels in the input stream like any order, so it stays deterministic) ----
Sim.prototype.debugCmd = function (p, sub, val) {
  if (this.players.filter(q => !q.ai).length !== 1 || p.ai) return;
  if (sub === 1) { p.god = !!val; this.events.push({ t: 'dbg', what: 'god', v: p.god ? 1 : 0 }); return; }
  if (sub === 0 && this.mission && this.mode !== 'assault' && this.mwin === undefined) this.mJump(val);
};
// skip straight to phase ph: the skipped phases' waves, timed actions and closing actions all happen at once, as
// if they had been played (groups released, the script's deaths applied), then the new phase starts as usual
Sim.prototype.mJump = function (ph) {
  const M = this.mission, mv = this.mv; if (!M || !M.phases || M.camp) return;
  if (mv.ph < 0) { mv.ph = 0; mv.t0 = this.tick; this.mStart(); }
  ph = clamp(ph | 0, 0, M.phases.length); if (ph <= mv.ph) return;
  while (mv.ph < ph) { const P = M.phases[mv.ph];
    for (const [t, gid, dir] of P.waves || []) { const k = mv.ph + ':' + gid; if (!mv.waves[k]) { mv.waves[k] = 1; this.mRelease(gid); if (dir) this.mDir(gid, dir); } }
    for (const [t, a] of P.at || []) { const k = mv.ph + ':at:' + t; if (!mv.ats[k]) { mv.ats[k] = 1; this.mAct(a); } }
    for (const s of P.say || []) mv.said[mv.ph + ':' + s[0]] = 1;
    for (const a of P.done || []) this.mAct(a); for (const k of P.hide || []) this.mAct(['hide', k]);
    if (mv.ph + 1 >= M.phases.length) { this.mOver(true, M.win); return; }
    mv.ph++; mv.t0 = this.tick; this.mStart(); }
  this.events.push({ t: 'dbg', what: 'jump', v: mv.ph });
};
Sim.prototype.mStart = function () { const P = this.mission.phases[this.mv.ph]; for (const k of P.show || []) this.mAct(['show', k]); for (const k of P.hide || []) this.mAct(['hide', k]); for (const a of P.start || []) this.mAct(a); this.events.push({ t: 'mphase', ph: this.mv.ph, title: P.title, text: P.text });
  for (const p of this.players) { if (p.ai || !p.levyIds) continue; const ids = p.levyIds.filter(id => this.squads[id].levyPh === this.mv.ph); p.levyIds = p.levyIds.filter(id => !ids.includes(id)); for (const id of ids) this.mJoin(p, id, true); } };
// enemy generals in the campaign do not sit on ground nobody contests: once their post is quiet they go hunting
Sim.prototype.mAggro = function () {
  const M = this.mission, side = M.side;
  for (const gid in this.mg) { const g = this.mg[gid], p = this.players[g.p]; if (g.G.team === side || !g.released || g.broken || p.fleeing) continue; p.aggr = 55;
    if (!g.G.officer && this.mGroupFrac(gid) < 0.12) { this.mBreak(gid); continue; } // a general with no men left quits the field
    // a scripted 'calm' pins a group to its directive with a short reach (e.g. the Jin busy storming a camp)
    if (g.calm !== undefined) { p.aggr = g.calm; continue; }
    const D = p.directive; if (!D || D.kind !== DIR_HOLD) { g.idle = 0; continue; }
    let gx = 0, gz = 0, gn = 0; for (const id of p.squads) { const q = this.squads[id]; if (q.alive && !q.inactive) { gx += q.cx; gz += q.cz; gn++; } } if (!gn) continue; gx /= gn; gz /= gn;
    let dm = 1e9; for (const q of this.squads) if (q.alive && !q.inactive && q.team === side) dm = Math.min(dm, len(q.cx - gx, q.cz - gz));
    // a post that is a live objective the Ming must take is worth holding; anywhere else is just a place to wait
    const post = this.objectives.find(o => len(o.x - D.x, o.z - D.z) < o.r + 10 && o.owner === g.G.team);
    const arrived = len(gx - D.x, gz - D.z) < 18;
    if ((post && g.G.stay !== false) || g.G.stay) { g.idle = 0; if (dm < 80) p.aggr = 70; continue; }
    if (arrived && dm > 40) g.idle = (g.idle || 0) + 2; else g.idle = 0;
    if (g.idle >= 14) { p.directive = { kind: DIR_ATTACK, x: 0, z: 0, by: -1 }; g.idle = 0; this.events.push({ t: 'mhunt', gid, name: p.name, team: p.team }); }
  }
};
Sim.prototype.mOver = function (won, text) { if (this.mwin !== undefined) return; this.mwin = won ? this.mission.side : 1 - this.mission.side; this.events.push({ t: 'mend', won, text }); };
// ---- assault
Sim.prototype.assaultDirs = function () {
  if (this.mission.siege && this.sg && this.sector <= 1) return this.siegeDirs();
  const M = this.mission, A = M.attacker, keys = M.sectors[this.sector] || []; const zs = keys.map(k => this.missionZone(k)).filter(z => z && z.owner !== A);
  const zt = zs.length ? zs : keys.map(k => this.missionZone(k));
  // a company keeps its point while that point is still a target; only when it falls is the company sent to the
  // least-crowded remaining one (a broken company no longer shifts everyone after it to the other flank)
  const load = {}; for (const gid in this.mg) { const g = this.mg[gid]; if (g.G.team !== A || g.broken) continue; if (g.zk && zt.some(z => z.key === g.zk)) load[g.zk] = (load[g.zk] || 0) + 1; else g.zk = null; }
  for (const gid in this.mg) { const g = this.mg[gid], p = this.players[g.p]; if (g.G.team !== A || g.broken || !zt.length) continue;
    if (!g.zk) { let best = zt[0], bl = 1e9; for (const z of zt) { const l = load[z.key] || 0; if (l < bl) { bl = l; best = z; } } g.zk = best.key; load[g.zk] = bl + 1; }
    const z = zt.find(q => q.key === g.zk); if (z) { p.directive = { kind: DIR_HOLD, x: z.x, z: z.z, by: -1 }; p.standoff = true; } }
  // defenders: garrisons of this sector hold their points; garrisons of lost sectors fall back to the next line
  const D = 1 - A; let j = 0; for (const gid in this.mg) { const g = this.mg[gid], p = this.players[g.p]; if (g.G.team !== D) continue; const di = +gid.slice(1), home = gid[0] === 'd' ? this.missionZone(this.defKey(di)) : null; if (home && home.owner === D) { p.directive = { kind: DIR_HOLD, x: home.x, z: home.z, by: -1 }; continue; } const nz = zt[j++ % zt.length]; if (nz) p.directive = { kind: DIR_HOLD, x: nz.x, z: nz.z, by: -1 }; }
};
Sim.prototype.reviveUnit = function (u, x, z) {
  u.dead = false; u.hp = u.def.hp; u.x = u.px = x; u.z = u.pz = z; u.y = u.py = terrainH(x, z); u.vx = u.vy = u.vz = 0; u.mx = u.mz = 0; u.st = ST_IDLE; u.stT = 0; u.downT = 0; u.flinchT = 0; u.blocking = false; u.aiming = false; u.target = -1; u.deathTick = -1; if (u.hrA !== undefined) { u.hrT = 0; u.hrImm = 0; u.hrA = 9; }
  u.pos = 0; u.entT = 0; u.openT = 0; u.fat = 0; u.shots = Math.max(u.shots || 0, 24); const g = gunOf(u.def, u.weapon); if (g) { u.ammo = g.mag || 1; u.loaded = true; }
  const q = this.squads[u.squad]; if (q) q.alive = true; this.events.push({ t: 'revive', id: u.id });
};
Sim.prototype.defKey = function (di) { const M = this.mission; let k = 0; for (const s of M.sectors) for (const key of s) { if (k === di) return key; k++; } return null; };
Sim.prototype.assaultThink = function () {
  const M = this.mission, A = M.attacker; const keys = M.sectors[this.sector];
  // manpower: every attacking man who falls costs a ticket; reserves march on while tickets last and the line is thin
  let act = 0; for (const u of this.teamAlive[A]) if (!u.inactive && u.type !== 'horse' && u.def.ai !== 'cannon') act++;
  const CAP = M.cap || 64;
  if (act + Math.round(CAP / 3) <= CAP && this.tickets > 0) { const next = Object.keys(this.mg).find(g => this.mg[g].G.team === A && !this.mg[g].released); if (next) { this.mRelease(next); this.assaultDirs(); } }
  // the manpower pool is bigger than the field: fallen attackers come back up the road as fresh men while tickets last
  let revivable = false;
  if (this.tickets > 0 && this.tick % 45 === 0) { let room = Math.min(CAP - act, this.tickets), k = 0;
    for (const u of this.units) { if (room <= 0) break; if (!u.dead || u.inactive || u.trimmed || u.team !== A || u.type === 'horse' || u.type === 'hero' || u.squad < 0 || u.def.ai === 'cannon' || u.ctrl >= 0) continue; revivable = true;
      if (this.tick - (u.deathTick || 0) < 30 * 8) continue; const g = this.mg[this.players[this.squads[u.squad].owner] ? this.players[this.squads[u.squad].owner].gid : ''] ; if (g && !g.released) continue;
      this.reviveUnit(u, clamp(M.attAt[0] + ((k % 6) - 2.5) * 3, -HALF + 4, HALF - 4), clamp(M.attAt[1] + Math.floor(k / 6) * 3 * (A === 1 ? -1 : 1), -HALF + 4, HALF - 4)); k++; room--; } }
  else if (this.tickets > 0) revivable = this.units.some(u => u.dead && !u.inactive && !u.trimmed && u.team === A && u.type !== 'horse' && u.type !== 'hero' && u.squad >= 0 && u.def.ai !== 'cannon');
  if (keys.every(k => this.missionZone(k).owner === A)) {
    this.events.push({ t: 'msector', sector: this.sector, team: A });
    for (const k of keys) this.missionZone(k).hidden = true;
    this.sector++; this.tickets += 80;
    for (const gid in this.mg) { const g = this.mg[gid]; if (g.G.team !== M.attacker && g.G.sector === this.sector) this.mRelease(gid); }
    if (this.sector >= M.sectors.length) { this.mwin = A; this.events.push({ t: 'mend', won: true, text: 'Every line has fallen.', att: A }); return; }
    for (const k of M.sectors[this.sector]) this.missionZone(k).hidden = false;
    this.assaultDirs();
  }
  if (this.tick % 150 === 0) this.assaultDirs();
  if (this.tick % 90 === 0 && this.teamAlive[1 - A].length < Math.min(Math.round(CAP * 0.7), (this.defStart || (this.defStart = this.teamAlive[1 - A].length)) * 0.75)) { const D = 1 - A, nz = this.missionZone((M.sectors[Math.min(this.sector + 1, M.sectors.length - 1)] || keys)[0]) || this.missionZone(keys[0]), fz = A === 1 ? 1 : -1;
    for (const u of this.units) { if (!u.dead || u.trimmed || u.team !== D || u.type === 'horse' || u.type === 'hero' || u.squad < 0 || u.inactive || u.def.ai === 'cannon' || u.ctrl >= 0) continue; if (this.tick - (u.deathTick || 0) < 30 * 25) continue;
      const k = u.id % 9; this.reviveUnit(u, clamp(nz.x + (k % 3 - 1) * 3, -HALF + 4, HALF - 4), clamp(nz.z + fz * (14 + Math.floor(k / 3) * 3), -HALF + 4, HALF - 4)); } }
  const left = Object.keys(this.mg).some(g => this.mg[g].G.team === A && !this.mg[g].released);
  if (this.tickets <= 0 || (act < 8 && !left && !revivable)) { this.mwin = 1 - A; this.events.push({ t: 'mend', won: false, text: 'The attackers have no men left to send.', att: A }); }
};

// ===== 攻守城 · Siege: walls, ditch, ladders, siege towers, covered rams, shield carts, sappers, oil, stones and bed crossbows =====
// A siege is an assault operation (OPS entry with `siege`) fought over a walled town: the line of sectors is ditch → walls →
// gatehouse → streets. Everything here is deterministic (DM trig, this.rng only) so lockstep peers stay in step.
// Layout (south is outside): ditch at z = D.zc, wall face at W.z0, wall top to W.z1, the town and the yamen to the north.
const SG = { z0: 40, z1: 47, h: 6, gate: 4.6, ditchZ: 30, ditchW: 4, ladders: [-32, -18, 18, 32], towers: [-40, 40], holes: [-25, 25], fills: [[-28, 14], [28, 14]],
  bows: [[-52, 44.5], [-9, 44.5], [9, 44.5], [52, 44.5]], guns: [[-70, 44.5], [70, 44.5]], atGuns: [[-30, -48], [30, -48]] };
// the rampart and the ditch in the height field (called from terrainHExact / waterAt; TERR.swall / TERR.sditch set by planTerrain)
function siegeWallH(w, x, z, h) {
  if (z < w.z0 - 0.7 || z > w.z1 + 14.5) return h;
  let k = z >= w.z0 && z <= w.z1 ? 1 : z < w.z0 ? 1 - (w.z0 - z) / 0.7 : 1 - (z - w.z1) / 1.3;
  for (let i = 0; i < w.ramps.length; i++) { const r = w.ramps[i]; if ((x - r < 0 ? r - x : x - r) < 3 && z > w.z1 && z < w.z1 + 14) { const kr = 1 - (z - w.z1) / 14; if (kr > k) k = kr; } }
  if (k <= 0) return h; const ax = x < 0 ? -x : x; if (ax < w.gate) return h; if (ax < w.gate + 0.6) k *= (ax - w.gate) / 0.6;
  return h + w.h * k;
}
function siegeDitchH(d, x, z, h) { const dz = z - d.zc, ad = dz < 0 ? -dz : dz; if (ad >= d.w) return h; const ax = x < 0 ? -x : x; if (ax < d.bridge) return h; const t = 1 - (ad / d.w) * (ad / d.w); return h - d.depth * t; }
function siegeDitchWater(d, x, z) { const dz = z - d.zc, ad = dz < 0 ? -dz : dz; if (ad >= d.w * 0.8) return 0; const ax = x < 0 ? -x : x; if (ax < d.bridge) return -1;
  for (let i = 0; i < d.fills.length; i++) { const f = d.fills[i]; if (f.done && (x - f.x < 0 ? f.x - x : x - f.x) < f.hw) return 2; } return 1; }
// a man on the wall top leans over the parapet in front of him to shoot down at the foot of the wall
// a player's bow: hold to draw (A_AIM while the button is down), let go to loose (A_FIRE). The longer the draw, up to
// about 0.8 s, the faster and harder the arrow; held at full draw past ~2.5 s the arm tires and the aim wavers. After
// each arrow the next is nocked (about 0.8 s). Arrows come from his quiver (u.shots).
Sim.prototype.heroBow = function (u, a, g) {
  const FULL = 0.8, NOCK = 0.8;
  if (u.st === ST_RELOAD || u.st === ST_SWAP || u.st === ST_STUN || u.downT > 0) { u.drawT = 0; u.aiming = false; return; }
  if (u.ammo <= 0) { u.drawT = 0; u.aiming = false; if (u.st === ST_IDLE && (u.shots === undefined || u.shots > 0)) this.startReload(u, NOCK, true); return; }
  const drawing = !!(a & A_AIM) && (u.st === ST_IDLE || u.st === ST_AIM) && !(a & A_BLOCK) && !u.club;
  if (drawing) { if (!u.drawT) this.events.push({ t: 'bowdraw', id: u.id }); u.drawT = (u.drawT || 0) + DT; u.aiming = true; u.aimHold = u.drawT; }
  if ((a & A_FIRE) && (u.drawT || 0) > 0.12) {
    const p = clamp(u.drawT / FULL, 0.3, 1), tire = Math.max(0, u.drawT - 2.5), v = (g.speed || 40) * (0.55 + 0.45 * p);
    let spread = 0.008 + (1 - p) * 0.03 + Math.min(0.06, tire * 0.02) + (u.speedNow || 0) * 0.004 + (u.mount >= 0 ? 0.012 : 0) + (u.airborne ? 0.03 : 0);
    const ox = u.x + sin(u.yaw) * 0.5, oy = u.y + 1.55, oz = u.z + cos(u.yaw) * 0.5;
    const yw = u.yaw + (this.rng.next() - 0.5) * spread, pt = u.pitch + (this.rng.next() - 0.5) * spread;
    this.projectiles.push({ kind: 'arrow', x: ox, y: oy, z: oz, vx: sin(yw) * cos(pt) * v, vy: sin(pt) * v, vz: cos(yw) * cos(pt) * v, team: u.team, owner: u.id, life: 0, hits: 0, dmg: g.dmg * (0.45 + 0.55 * p), over: this.overParapet(u) });
    this.events.push({ t: 'arrow', id: u.id, x: ox, y: oy, z: oz, hero: true, pw: p });
    u.ammo = 0; if (u.shots !== undefined) u.shots = Math.max(0, u.shots - 1); u.drawT = 0; u.aiming = false;
    if (u.shots === undefined || u.shots > 0) this.startReload(u, NOCK, true);
    return;
  }
  if (!drawing) { u.drawT = 0; u.aiming = false; }
};
Sim.prototype.overParapet = function (u) { const W = TERR.swall; if (!this.sg || !W) return false; return u.z > W.z0 + 0.4 && u.z < W.z1 + 0.5 && u.y > W.h - 1.2; };
Sim.prototype.siegeInit = function () {
  const M = this.mission, A = M.attacker, D = 1 - A, W = TERR.swall; const sg = this.sg = { A, D, gateHp: 6000, gateMax: 6000, engines: [], lads: [], emp: [], holes: [], fired: false, oilT: 0, stoneT: 0, slipT: 0, ice: this.bdef.biome === 'winter', sec: -1 };
  // the gate in its passage through the rampart
  this.boxes.push({ x: 0, z: (W.z0 + W.z1) / 2, hw: W.gate, hd: (W.z1 - W.z0) / 2, h: W.h + 0.5, kind: 'sgate' }); sg.gateBox = this.boxes.length - 1;
  // the outer face of the wall: parapet segments, with lanes where a ladder, a tower's bridge or a sapped hole can open a way up
  const lanes = [];
  SG.ladders.forEach((x) => { const L = { kind: 'ladder', x, z: W.z0, hd: 0.5, w: 1.4, up: false, prog: 0, hp: 0 }; sg.lads.push(L); lanes.push(L); });
  SG.towers.forEach((x) => { const L = { kind: 'tower', x, z: W.z0, hd: 0.5, w: 2.4, up: false, prog: 0, hp: 0 }; lanes.push(L); sg.engines.push({ id: sg.engines.length, kind: 'tower', team: A, x, z: -82, lane: x, tz: W.z0 - 3.2, hp: 3600, max: 3600, burn: 0, docked: false, lad: L, push: 0, need: 4 }); });
  SG.holes.forEach((x) => { const L = { kind: 'hole', x, z: W.z0, hd: 0.5, w: 1.4, up: false, prog: 0, hp: 0 }; sg.holes.push(L); lanes.push(L); sg.engines.push({ id: sg.engines.length, kind: 'cart', team: A, x, z: -62, lane: x, tz: W.z0 - 3, hp: 1300, max: 1300, burn: 0, push: 0, need: 2 }); });
  sg.engines.push({ id: sg.engines.length, kind: 'ram', team: A, x: 0, z: -72, lane: 0, tz: W.z0 - 2.9, hp: 2400, max: 2400, burn: 0, atGate: false, push: 0, need: 2 });
  for (const x of [-10, 10]) sg.engines.push({ id: sg.engines.length, kind: 'cart', team: A, x, z: -58, lane: x * 1.2, tz: SG.ditchZ - 6.5, hp: 1300, max: 1300, burn: 0, push: 0, need: 2, cover: true });
  lanes.sort((a, b) => a.x - b.x);
  for (const L of lanes) this.boxes.push({ x: L.x, z: W.z0, hw: L.w, hd: 0.5, h: 1.3, kind: 'sface', lad: L });
  let x0 = -HALF; const gaps = lanes.map(L => [L.x - L.w, L.x + L.w]).concat([[-W.gate - 0.01, W.gate + 0.01]]).sort((a, b) => a[0] - b[0]);
  for (const g of gaps) { if (g[0] > x0 + 0.05) this.boxes.push({ x: (x0 + g[0]) / 2, z: W.z0, hw: (g[0] - x0) / 2, hd: 0.5, h: 1.3, kind: 'sface' }); x0 = g[1]; }
  if (x0 < HALF) this.boxes.push({ x: (x0 + HALF) / 2, z: W.z0, hw: (HALF - x0) / 2, hd: 0.5, h: 1.3, kind: 'sface' });
  // bed crossbows (床弩) and red-barbarian guns on the wall; the besiegers' field guns before it
  for (const e of SG.bows) sg.emp.push({ id: sg.emp.length, kind: 'bow', team: D, x: e[0], z: e[1], yaw: PI, pitch: 0, cd: 30 * 3 + sg.emp.length * 17, man: -1 });
  for (const e of SG.guns) sg.emp.push({ id: sg.emp.length, kind: 'gun', team: D, x: e[0], z: e[1], yaw: PI, pitch: 0, cd: 30 * 5 + sg.emp.length * 23, man: -1 });
  for (const e of SG.atGuns) sg.emp.push({ id: sg.emp.length, kind: 'gun', team: A, x: e[0], z: e[1], yaw: 0, pitch: 0, cd: 30 * 6 + sg.emp.length * 19, man: -1 });
  for (const e of sg.emp) e.y = terrainH(e.x, e.z);
  // the town behind the walls: rows of houses along two streets, leaving the main street and the zones clear
  const r = new RNG(this.seed ^ 0x51e9e);
  for (let z = 64; z < 140; z += 11) for (let x = -120; x <= 120; x += 12) { if (Math.abs(x) < 9 || (z > 74 && z < 86) || len(x - 0, z - 112) < 22 || len(x + 18, z - 80) < 14) continue; if (r.next() < 0.22) continue;
    this.boxes.push({ x: x + r.range(-1.5, 1.5), z: z + r.range(-1, 1), hw: r.range(3, 4.4), hd: r.range(2.6, 3.6), h: r.range(3, 4), kind: 'house' }); }
  sg.secT = 0; this.siegeDirs();
};
// the wall-face lanes that are open (ladder up, tower docked, hole broken) become walkable corridors
Sim.prototype.siegeNav = function (bl) {
  const sg = this.sg, W = TERR.swall; if (!sg) return;
  const open = (L) => { if (!L.up) return; for (let z = W.z0 - 2.5; z <= W.z0 + 2.5; z += 1) for (let dx = -L.w + 0.6; dx <= L.w - 0.6 + 0.01; dx += 0.8) bl[this.navCell(L.x + dx, z)] &= 1; };
  for (const L of sg.lads) open(L); for (const L of sg.holes) open(L); for (const e of sg.engines) if (e.lad) open(e.lad);
  if (sg.gateHp <= 0) for (let z = W.z0 - 1; z <= W.z1 + 1; z += 1) for (let dx = -3; dx <= 3; dx += 1) bl[this.navCell(dx, z)] &= 1;
};
Sim.prototype.sgClimb = function (u) { const sg = this.sg, W = TERR.swall; if (u.z < W.z0 - 2.6 || u.z > W.z0 + 0.8) return false; for (const L of sg.lads) if (L.up && Math.abs(u.x - L.x) < 1.5) return true; return false; };
// every tick: engines meet projectiles, manned emplacements follow their gunner
Sim.prototype.siegeTick = function () {
  const sg = this.sg; if (!sg) return;
  const ps = this.projectiles;
  for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; if (p.kind === 'bomb') continue;
    for (const e of sg.engines) { if (e.hp <= 0 || p.team === e.team) continue; const S = SGE[e.kind]; if (Math.abs(p.x - e.x) > S.hw || Math.abs(p.z - e.z) > S.hd || p.y > terrainH(e.x, e.z) + S.h) continue;
      const dmg = p.kind === 'shell' ? 260 : p.kind === 'solid' ? (p.bolt ? 50 : 180) : 4; this.sgHurt(e, dmg); if (p.kind === 'arrow' && e.kind !== 'cart' && this.rng.next() < 0.04 && !this.rain) e.burn = Math.max(e.burn, 6);
      this.events.push({ t: 'sghit', x: p.x, y: p.y, z: p.z, kind: p.kind, eng: e.kind }); ps[i] = ps[ps.length - 1]; ps.pop(); break; } }
  for (const e of sg.emp) { if (e.cd > 0) e.cd--; if (e.man < 0) continue; const u = this.units[e.man];
    if (!u || u.dead || len(u.x - e.x, u.z - e.z) > 3.2) { e.man = -1; if (u) u.manE = -1; continue; }
    // the piece traverses and elevates toward where its gunner looks, at the speed a crew can lay it; he stands at its breech
    { const bow = e.kind === 'bow', ty = bow ? 2.4 : 1.3, tp = bow ? 1.2 : 0.7; const dy = wrap(u.yaw - e.yaw); e.yaw = wrap(e.yaw + clamp(dy, -ty * DT, ty * DT)); const wp = clamp(u.pitch || 0, -0.5, 0.6); e.pitch = (e.pitch || 0) + clamp(wp - (e.pitch || 0), -tp * DT, tp * DT); }
    const bx = e.x - sin(e.yaw) * 1.2, bz = e.z - cos(e.yaw) * 1.2; u.x = bx; u.z = bz; u.mx = 0; u.mz = 0; u.st = ST_IDLE; u.stT = 0;
    if (u.empFire) { u.empFire = false; if (e.cd <= 0) this.sgFire(e, e.yaw, e.pitch, u.id); } }
  if (this.tick % 15 === 0) this.siegeThink();
};
const SGE = { ram: { hw: 1.5, hd: 3, h: 3.6, sp: 1.5 }, tower: { hw: 2.5, hd: 2.5, h: 9.5, sp: 1.0 }, cart: { hw: 1.7, hd: 0.9, h: 2.6, sp: 1.6 } };
Sim.prototype.sgHurt = function (e, dmg) { if (e.hp <= 0) return; e.hp -= dmg; if (e.hp <= 0) { e.hp = 0; if (e.lad && e.lad.up) { e.lad.up = false; this.navBoxes(); } this.events.push({ t: 'sgengine', kind: e.kind, x: e.x, z: e.z }); for (const sq of this.squads) if (sq.alive && sq.team === e.team && !sq.def.fearless) sq.morale = Math.max(0, sq.morale - 6); } };
Sim.prototype.sgFire = function (e, yaw, pitch, by) {
  const bow = e.kind === 'bow', v = bow ? 62 : 78; e.cd = bow ? 30 * 5 : 30 * 9; e.cdMax = e.cd;
  const cp = cos(pitch), x = e.x + sin(yaw) * 1.6, z = e.z + cos(yaw) * 1.6, y = e.y + (bow ? 1.4 : 1.2);
  // a piece on the wall top fires out through its embrasure, over the parapet in front of it
  this.projectiles.push({ kind: 'solid', bolt: bow, x, y, z, vx: sin(yaw) * cp * v, vy: sin(pitch) * v, vz: cos(yaw) * cp * v, team: e.team, owner: -1, life: 0, hits: 0, over: e.team === this.sg.D });
  this.events.push({ t: 'sgshot', x, y, z, dx: sin(yaw), dz: cos(yaw), gun: !bow, team: e.team, by: by === undefined ? -1 : by, emp: e.id });
};
// a manned piece takes all of its gunner's hands: left click (attack or fire) looses it, E leaves it; his own weapon is
// slung meanwhile, so nothing he carries can fire, aim, reload or be swapped
Sim.prototype.empControl = function (u, a) {
  const e = this.sg.emp[u.manE]; if (!e || e.man !== u.id) { u.manE = -1; return false; }
  u.aiming = false; u.blocking = false; u.fireQ = 0; u.swapQ = false; u.atkHeld = false; u.blockHeld = false; if (u.st !== ST_IDLE) { u.st = ST_IDLE; u.stT = 0; }
  if (this.phase !== 1) return true;
  if (a & (A_FIRE | A_ATK)) u.empFire = true;
  if (a & A_KICK) this.siegeInteract(u);
  return true;
};
// where a shot from this piece at this lay would first strike: the same steps and stops as updateProjectiles (no state changed)
Sim.prototype.sgPredict = function (e, yaw, pitch) {
  const bow = e.kind === 'bow', v = bow ? 62 : 78, cp = cos(pitch); let x = e.x + sin(yaw) * 1.6, z = e.z + cos(yaw) * 1.6, y = e.y + (bow ? 1.4 : 1.2), vx = sin(yaw) * cp * v, vy = sin(pitch) * v, vz = cos(yaw) * cp * v; const over = e.team === this.sg.D, pts = [];
  for (let t = 0; t < 30 * 8; t++) { for (let s = 0; s < 3; s++) { const dt = DT / 3; vy -= GRAV * dt; x += vx * dt; y += vy * dt; z += vz * dt;
      if (Math.abs(x) > HALF || Math.abs(z) > HALF) return { x, y, z, pts, out: true };
      for (const bx of this.boxes) { if (over && bx.kind === 'sface') continue; if (x > bx.x - bx.hw && x < bx.x + bx.hw && z > bx.z - bx.hd && z < bx.z + bx.hd && y < terrainH(bx.x, bx.z) + bx.h) return { x, y, z, pts, box: true }; }
      const g = terrainH(x, z); if (y <= g) return { x, y: g, z, pts }; }
    if (t % 3 === 0) pts.push(x, y, z); }
  return { x, y, z, pts, out: true };
};
// pick a mark for an unmanned emplacement: defenders prefer engines, then the thickest crowd of the enemy
Sim.prototype.sgAim = function (e) {
  let tx = 0, tz = 0, ty = 0, best = 1e18;
  if (e.team === this.sg.D && this.rng.next() < 0.6) for (const g of this.sg.engines) { if (g.hp <= 0) continue; const d = len(g.x - e.x, g.z - e.z); if (d < 125 && d < best) { best = d; tx = g.x; tz = g.z; ty = terrainH(g.x, g.z) + 1.5; } }
  if (best > 1e17) for (const q of this.squads) { if (!q.alive || q.inactive || q.team === e.team) continue; const d = len(q.cx - e.x, q.cz - e.z); if (d < 125 && d > 12 && d - q.aliveCount * 0.6 < best) { best = d - q.aliveCount * 0.6; tx = q.cx; tz = q.cz; ty = terrainH(q.cx, q.cz) + 1; } }
  if (best > 1e17) return false;
  const bow = e.kind === 'bow', v = bow ? 62 : 78, d = len(tx - e.x, tz - e.z), dy = ty - (e.y + 1.3);
  const yaw = atan2(tx - e.x, tz - e.z) + (this.rng.next() - 0.5) * 0.04, pitch = atan2(dy, d) + 0.5 * asin(clamp(GRAV * d / (v * v), -1, 1)) + (this.rng.next() - 0.5) * 0.02;
  e.yaw = yaw; e.pitch = pitch; this.sgFire(e, yaw, pitch); return true;
};
Sim.prototype.sgCount = function (x, z, r, team) { return this.countNear(x, z, r, team); };
// every half second: engines move or burn, ladders rise and fall, the defenders pour oil and drop stones, the gate and the walls give way
Sim.prototype.siegeThink = function () {
  const sg = this.sg, W = TERR.swall, A = sg.A, D = sg.D, M = this.mission; let nav = false;
  if (sg.sec !== this.sector) { sg.sec = this.sector; sg.secT = 0; this.events.push({ t: 'sgstage', stage: this.sector });
    if (this.sector === 1 && !sg.fired && !this.rain) { sg.fired = true; for (let x = -46; x <= 46; x += FIRE_CS * 0.9) { if (Math.abs(x) < 6) continue; const c = this.fireCell(x, W.z0 - 3); if (c < 0) continue; this.fuel[c] = 1.4; this.fireState[c] = 1; this.burnT[c] = 420; } this.events.push({ t: 'sgsaltpeter', z: W.z0 - 3 }); } }
  sg.secT++;
  // the ditch: a ditch zone in attackers' hands is filled with fascines and earth
  for (const f of TERR.sditch.fills) { if (f.done) continue; const z = this.missionZone(f.key); if (z && z.owner === A) { f.done = true; this.sgRewater(f); nav = true; this.events.push({ t: 'sgfill', x: f.x, z: TERR.sditch.zc }); } }
  // engines: pushed by the besiegers behind them, hacked at and burned by the defenders
  for (const e of sg.engines) { if (e.hp <= 0) continue; const S = SGE[e.kind];
    // every engine comes with its own crew sheltering behind it (the men who push it are not the company that escorts
    // it); a badly damaged engine has lost its crew and moves only if soldiers lay hands on it
    const crew = e.hp > e.max * 0.3 ? e.need : 0;
    const pushers = this.sgCount(e.x, e.z - S.hd - 1.5, 6, A) + crew, foes = this.sgCount(e.x, e.z, S.hw + 2.5, D); e.push = pushers; e.crew = crew;
    if (foes) this.sgHurt(e, foes * 5);
    if (e.burn > 0) { e.burn -= 0.5; this.sgHurt(e, e.kind === 'tower' ? 28 : 22); if (this.tick % 45 === 0) this.events.push({ t: 'sgburn', x: e.x, z: e.z, kind: e.kind }); }
    { const c = this.fireCell(e.x, e.z); if (c >= 0 && this.fireState[c] === 1 && e.burn < 2) e.burn = 4; }
    if (e.hp <= 0) continue;
    let tz = e.tz; if (e.kind === 'cart' && e.cover && this.sector >= 1) tz = W.z0 - 7;
    const lane = e.lane, crossing = e.kind !== 'ram' && e.z < TERR.sditch.zc + TERR.sditch.w; const filled = siegeDitchWater(TERR.sditch, lane, TERR.sditch.zc) !== 1;
    if (crossing && !filled) tz = Math.min(tz, TERR.sditch.zc - TERR.sditch.w - S.hd - 0.5);
    const moving = pushers >= e.need && foes <= pushers && e.z < tz - 0.05;
    if (moving) { const st = S.sp * 15 * DT * (pushers >= e.need * 2 ? 1.25 : 1); e.z = Math.min(tz, e.z + st); e.x += clamp(lane - e.x, -st, st); }
    if (e.kind === 'tower' && !e.docked && e.z >= e.tz - 0.05) { e.docked = true; e.lad.up = true; nav = true; this.events.push({ t: 'sgdock', x: e.x, z: e.z }); }
    if (e.kind === 'ram') { e.atGate = e.z >= e.tz - 0.05; if (e.atGate && sg.gateHp > 0 && pushers >= 1) { this.sgGate(26 + (pushers - crew) * 6 + crew * 2); if (this.tick % 45 === 0) this.events.push({ t: 'sgram', x: 0, z: W.z0 }); } }
  }
  // sappers at the shield carts chisel through the wall face
  for (const L of sg.holes) { if (L.up) continue; const n = this.sgCount(L.x, W.z0 - 1.6, 3.5, A); const cart = sg.engines.find(e => e.kind === 'cart' && e.lane === L.x && e.hp > 0 && e.z > W.z0 - 6);
    if (n >= 2 && this.sector >= 1) { L.prog += n * (cart ? 1.6 : 0.6); if (L.prog >= 320) { L.up = true; nav = true; this.events.push({ t: 'sghole', x: L.x, z: W.z0 }); for (const sq of this.squads) if (sq.alive && sq.team === D && !sq.def.fearless) sq.morale = Math.max(0, sq.morale - 8); } } }
  // the gate: men without a ram can only hack at it
  if (sg.gateHp > 0) { const n = this.sgCount(0, W.z0 - 1.5, 4, A); if (n) this.sgGate(n * 2); }
  // scaling ladders: raised by men at the foot (only where the ditch is filled), thrown down by defenders who outnumber the climbers at the top
  for (const L of sg.lads) { const foot = this.sgCount(L.x, W.z0 - 2.4, 3.2, A), top = this.sgCount(L.x, W.z0 + 2, 3.2, D), up = this.sgCount(L.x, W.z0 + 2, 3.2, A);
    const reach = siegeDitchWater(TERR.sditch, L.x, TERR.sditch.zc) !== 1;
    if (!L.up) { if (foot >= 2 && reach && this.sector >= 1) { L.prog += 15 * Math.min(3, foot / 2); if (L.prog >= 30 * 7) { L.up = true; L.hp = 650; nav = true; this.events.push({ t: 'sgladder', x: L.x, z: W.z0, up: true }); } } else L.prog = Math.max(0, L.prog - 5); }
    else { if (top > up + 1) L.hp -= (top - up) * 14; if (L.hp <= 0) { this.sgLadderDown(L); nav = true; } } }
  // ice: in the frozen months the wall face is glazed and the rungs are slick
  if (sg.ice) for (const L of sg.lads) { if (!L.up) continue; const n = this.gatherNear(L.x, W.z0 - 1, 2.5); const ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
    for (const id of ids) { const v = this.units[id]; if (v.dead || v.team !== A || v.mounted || Math.abs(v.x - L.x) > 1.4 || v.z < W.z0 - 2.6 || v.z > W.z0 + 0.6 || v.downT > 0) continue; if (this.rng.next() < 0.03) { v.z = W.z0 - 3.2; v.downT = 1.2; this.applyDamage(v, 18, -1, 0, 0, -2, 'fall'); if (this.tick - sg.slipT > 60) { sg.slipT = this.tick; this.events.push({ t: 'sgslip', x: v.x, z: v.z, id: v.id }); } } } }
  // defenders: burning oil and gunpowder quilts on crowds and engines at the foot of the wall, stones on the ladders
  sg.oilT++; sg.stoneT++;
  if (sg.oilT >= 8) { const s = this.sgSpot(4); if (s) { sg.oilT = 0; this.sgOil(s[0], s[1]); } }
  if (sg.stoneT >= 6) { const s = this.sgSpot(3); if (s) { sg.stoneT = 0; this.sgStone(s[0], s[1]); } }
  // unmanned emplacements fire on their own
  for (const e of sg.emp) if (e.man < 0 && e.cd <= 0) { if (!this.sgAim(e)) e.cd = 30; }
  // the walls are turned once the gate is down
  if (this.sector === 1 && sg.gateHp <= 0) for (const k of M.sectors[1]) { const z = this.missionZone(k); if (z.owner !== A) { z.owner = A; z.ctrl = A === 1 ? -100 : 100; } }
  if (nav) this.navBoxes();
  if (this.tick % 45 === 0 && this.sector <= 1) this.siegeDirs();
};
Sim.prototype.sgRewater = function (f) { const C = this.navC, bl = this.navBlk; for (let x = f.x - f.hw - C; x <= f.x + f.hw + C; x += C * 0.5) for (let z = TERR.sditch.zc - TERR.sditch.w - C; z <= TERR.sditch.zc + TERR.sditch.w + C; z += C * 0.5) { const c = this.navCell(x, z), cx = -HALF + ((c % this.navW) + 0.5) * C, cz = -HALF + (Math.floor(c / this.navW) + 0.5) * C; if (waterAt(cx, cz) === 1) bl[c] |= 1; else bl[c] &= ~1; } };
// the best place along the wall foot for the defenders to drop something: most attackers, with defenders on the wall above
Sim.prototype.sgSpot = function (minN) {
  const W = TERR.swall, sg = this.sg; let best = null, bn = minN - 1;
  for (let x = -60; x <= 60; x += 6) { const n = this.sgCount(x, W.z0 - 2.5, 3.5, sg.A) + (sg.engines.some(e => e.hp > 0 && e.kind !== 'cart' && Math.abs(e.x - x) < 4 && e.z > W.z0 - 9) ? 3 : 0); if (n > bn && this.sgCount(x, W.z0 + 2.5, 9, sg.D) >= 1) { bn = n; best = [x, W.z0 - 2.5]; } }
  return best;
};
Sim.prototype.sgOil = function (x, z) {
  const sg = this.sg, n = this.gatherNear(x, z, 4.5), ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
  for (const id of ids) { const v = this.units[id]; if (v.dead || v.team !== sg.A || v.type === 'horse') continue; const dd = len(v.x - x, v.z - z); if (dd > 4.5) continue; this.applyDamage(v, 52 * (1 - dd / 6), -1, 0, 0, 0, 'fire'); if (v.squad >= 0 && !this.squads[v.squad].def.fearless) this.squads[v.squad].morale = Math.max(0, this.squads[v.squad].morale - 4); }
  for (const e of sg.engines) if (e.hp > 0 && len(e.x - x, e.z - z) < 6) e.burn = Math.max(e.burn, 10);
  if (!this.rain) { const c = this.fireCell(x, z); if (c >= 0) { this.fuel[c] = Math.max(this.fuel[c], 1); this.fireState[c] = 1; this.burnT[c] = 240; } }
  this.events.push({ t: 'sgoil', x, z, y: TERR.swall.h });
};
Sim.prototype.sgStone = function (x, z) {
  const sg = this.sg, n = this.gatherNear(x, z, 3), ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
  for (const id of ids) { const v = this.units[id]; if (v.dead || v.team !== sg.A || v.type === 'horse') continue; const dd = len(v.x - x, v.z - z); if (dd > 3) continue; if (v.mass < 5) { v.downT = Math.max(v.downT, 1); } this.applyDamage(v, 46 * (1 - dd / 4), -1, 0, 0, -3, 'solid'); }
  for (const L of sg.lads) if (L.up && Math.abs(L.x - x) < 3) { L.hp -= 220; if (L.hp <= 0) { this.sgLadderDown(L); this.navBoxes(); } }
  for (const e of sg.engines) if (e.hp > 0 && len(e.x - x, e.z - z) < 4) this.sgHurt(e, 90);
  this.events.push({ t: 'sgstone', x, z, y: TERR.swall.h });
};
Sim.prototype.sgLadderDown = function (L) { const W = TERR.swall; L.up = false; L.prog = 0; L.hp = 0; const n = this.gatherNear(L.x, W.z0 - 1.5, 3), ids = []; for (let i = 0; i < n; i++) ids.push(this.nearBuf[i]); ids.sort((a, b) => a - b);
  for (const id of ids) { const v = this.units[id]; if (v.dead || v.team !== this.sg.A || Math.abs(v.x - L.x) > 1.6 || v.z < W.z0 - 3 || v.z > W.z0 + 0.8) continue; v.z = W.z0 - 3.4; v.downT = Math.max(v.downT, 1.2); this.applyDamage(v, 38, -1, 0, 2, -4, 'fall'); }
  this.events.push({ t: 'sgladder', x: L.x, z: W.z0, up: false }); };
Sim.prototype.sgGate = function (dmg) { const sg = this.sg; if (sg.gateHp <= 0) return; sg.gateHp -= dmg; if (sg.gateHp <= 0) { sg.gateHp = 0; const g = this.boxes[sg.gateBox]; g.hw = 0.01; g.hd = 0.01; g.h = 0; this.navBoxes(); this.events.push({ t: 'sgbreach', x: 0, z: g.z });
    for (const sq of this.squads) if (sq.alive && !sq.def.fearless) { if (sq.team === sg.D) sq.morale = Math.max(0, sq.morale - 15); else sq.morale = Math.min(sq.moraleMax, sq.morale + 20); } } };
// E: man a bed crossbow or a gun, throw a ladder down from the top, or help raise one at the foot
Sim.prototype.siegeInteract = function (u) {
  const sg = this.sg, W = TERR.swall; if (!sg || u.dead || u.mounted) return false;
  if (u.manE >= 0 && sg.emp[u.manE] && sg.emp[u.manE].man === u.id) { sg.emp[u.manE].man = -1; u.manE = -1; this.events.push({ t: 'sgman', id: u.id, on: false }); return true; }
  for (const e of sg.emp) if (e.team === u.team && e.man < 0 && len(e.x - u.x, e.z - u.z) < 2.6) { e.man = u.id; u.manE = e.id; this.events.push({ t: 'sgman', id: u.id, on: true, kind: e.kind }); return true; }
  for (const L of sg.lads) { if (Math.abs(L.x - u.x) > 2.4) continue;
    if (u.team === sg.D && L.up && u.z > W.z0 && u.z < W.z0 + 3.5) { L.hp -= 360; this.events.push({ t: 'sgpush', x: L.x, z: W.z0, id: u.id }); if (L.hp <= 0) { this.sgLadderDown(L); this.navBoxes(); } return true; }
    if (u.team === sg.A && !L.up && u.z < W.z0 - 0.5 && u.z > W.z0 - 5 && this.sector >= 1 && siegeDitchWater(TERR.sditch, L.x, TERR.sditch.zc) !== 1) { L.prog += 70; return true; } }
  return false;
};
// the besiegers' generals: push the engines, raise the ladders where the ditch is filled, then climb; the defenders man the walls
Sim.prototype.siegeDirs = function () {
  const sg = this.sg, M = this.mission, A = sg.A, D = sg.D, W = TERR.swall, s = this.sector;
  const att = Object.keys(this.mg).filter(g => this.mg[g].G.team === A && this.mg[g].released && !this.mg[g].broken);
  const jobs = [];
  const eng = (k) => sg.engines.filter(e => e.kind === k && e.hp > 0);
  // each job has an id, and a company keeps its job while the job exists: nobody marches from one flank to the other
  // every time an engine is hit or a ladder falls
  const ram = eng('ram')[0]; if (ram && !(ram.atGate && sg.gateHp <= 0)) jobs.push([ram.x, ram.z - 5, false, 'ram']);
  eng('tower').forEach((t, i) => jobs.push(t.docked ? [t.x, W.z0 + 2.5, false, 'tw' + t.id] : [t.x, t.z - 5, false, 'tw' + t.id]));
  if (s === 0) { // three lanes: west (its ditch, then its tower), centre (the ram), east; extra companies take the ditches and the carts
    const tw = eng('tower'), lane = (k, t) => { const z = this.missionZone(k); return z.owner !== A || !t ? [z.x, z.z] : [t.x, t.z - 5]; };
    jobs.length = 0; const W0 = lane(M.sectors[0][0], tw.find(t => t.lane < 0)), E0 = lane(M.sectors[0][1], tw.find(t => t.lane > 0));
    jobs.push([W0[0], W0[1], false, 'LW'], ram ? [ram.x, ram.z - 5, false, 'ram'] : [0, TERR.sditch.zc - 8, false, 'LC'], [E0[0], E0[1], false, 'LE']);
    for (const k of M.sectors[0]) { const z = this.missionZone(k); jobs.push([z.x, z.z, false, 'z' + k]); }
    for (const c of eng('cart')) if (c.cover) jobs.push([c.x, c.z - 4, false, 'ct' + c.id]); }
  else { sg.lads.forEach((L, i) => jobs.push(L.up ? [L.x, W.z0 + 2.5, false, 'ld' + i] : [L.x, W.z0 - 3, false, 'ld' + i])); for (const c of eng('cart')) if (!c.cover) jobs.push([c.lane, W.z0 - 2.5, false, 'ct' + c.id]); if (sg.gateHp <= 0) jobs.unshift([0, W.z1 + 6, false, 'gate']); }
  const load = {}; for (const g of att) { const G = this.mg[g]; if (G.jid && G.jsec === s && jobs.some(j => j[3] === G.jid)) load[G.jid] = (load[G.jid] || 0) + 1; else { G.jid = null; G.jsec = s; } }
  att.forEach((g) => { const G = this.mg[g], p = this.players[G.p]; if (!jobs.length) return;
    if (!G.jid) { let best = jobs[0], bl = 1e9; for (const j of jobs) { const l = load[j[3]] || 0; if (l < bl) { bl = l; best = j; } } G.jid = best[3]; load[G.jid] = bl + 1; }
    const j = jobs.find(q => q[3] === G.jid); p.directive = { kind: DIR_HOLD, x: clamp(j[0], -HALF + 3, HALF - 3), z: clamp(j[1], -HALF + 3, HALF - 3), by: -1 }; p.standoff = j[2]; });
  // defenders: the wall garrisons stand on the wall top above the ladders; the rest hold the gatehouse and the town
  const posts = [[-26, 43.6], [26, 43.6], [-14, 43.6], [14, 43.6], [0, W.z1 + 7], [-18, 80], [0, 110]];
  let j = 0; for (const gid in this.mg) { const g = this.mg[gid], p = this.players[g.p]; if (g.G.team !== D || g.broken || g.G.free) continue; const pt = posts[j++ % posts.length]; p.directive = { kind: DIR_HOLD, x: pt[0], z: pt[1], by: -1 }; }
};
// ---- line fighting (realism / experimental combat only) ----
// Every man has only a few fighting spaces round him, in his front arc. Men who can't get one wait a pace or two back
// with their guard up; an engaged company keeps its frontage; the hurt and the blown step back a rank while the next
// man steps up; after a hard exchange both fronts give a step and breathe; spears keep their reach.
Sim.prototype.xcLim = function (v) { return v.ctrl >= 0 && !this.players[v.ctrl].ai ? 2 : 3; };
Sim.prototype.xcSpaces = function () { // spaces held on each man this tick, counted once in unit order
  if (this.spTick === this.tick) return this.spN; this.spTick = this.tick;
  if (!this.spN || this.spN.length < this.units.length + 8) this.spN = new Int16Array(this.units.length + 64); else this.spN.fill(0);
  for (const v of this.units) { if (!(v.spaceOf >= 0)) continue; const t = this.units[v.spaceOf];
    if (v.dead || v.wounded || v.downed || !t || t.dead || v.target !== v.spaceOf) { v.spaceOf = -1; continue; } this.spN[v.spaceOf]++; }
  return this.spN;
};
// a man who reaches a foe by another road (his formation slot, a push) still needs a free space on him to strike
Sim.prototype.xcSpaceOk = function (u, tgt) {
  if (!this.xc || u.ctrl >= 0 || u.mounted || u.champ || u.spaceOf === tgt.id) return true;
  const N = this.xcSpaces(), n = N[tgt.id] || 0; if (n >= this.xcLim(tgt)) return false;
  u.spaceOf = tgt.id; N[tgt.id] = n + 1; return true;
};
Sim.prototype.xcHold = function (u, tgt, d, nx, nz, keep, spd) { // stand off at a distance from the foe, facing him
  const e = d - keep, sp = u.def.speed * spd;
  if (e < -0.25) { const k = Math.min(1, -e); u.mx = -nx * sp * k; u.mz = -nz * sp * k; }
  else if (e > 0.45) { const k = Math.min(1, e * 0.8); u.mx = nx * sp * k; u.mz = nz * sp * k; }
  else { u.mx = 0; u.mz = 0; }
};
Sim.prototype.xcGuard = function (u) { if (!u.blocking && u.st === ST_IDLE && u.flinchT <= 0 && (u.def.shield || this.rng.next() < 0.04)) { u.blocking = true; u.blockT = 0; u.blockDir = DIR_UP; u.blockHold = u.def.shield ? 0.6 : 0.4; } };
Sim.prototype.xcLine = function (u, sq, tgt, d, reach) {
  const N = this.xcSpaces(), dx = tgt.x - u.x, dz = tgt.z - u.z, nx = dx / (d || 1), nz = dz / (d || 1);
  // rank rotation: a hurt or blown man in the front rank gives his place to the man behind (the slot code moves a resting man back a rank)
  if (u.spaceOf >= 0 && d < reach + 1 && (u.hp < u.def.hp * 0.45 || (u.fat || 0) > 75) && this.tick >= (u.restCd || 0) && sq && sq.aliveCount > 3) { u.restT = this.tick + 30 * 5; u.restCd = this.tick + 30 * 20; }
  const resting = u.restT > this.tick, breath = u.breathE > this.tick;
  if (resting || breath) { u.spaceOf = -1; this.xcHold(u, tgt, d, nx, nz, resting ? reach + 3.4 : reach + 1.4, breath ? 0.55 : 0.8); this.xcGuard(u); return 1; }
  if (u.spaceOf === tgt.id && d > reach + 2.8) u.spaceOf = -1;
  if (u.spaceOf !== tgt.id) {
    u.spaceOf = -1;
    if (d < reach + 2.4) {
      const n = N[tgt.id] || 0, lim = this.xcLim(tgt), front = Math.abs(wrap(atan2(u.x - tgt.x, u.z - tgt.z) - tgt.yaw)) < 1.75;
      if (n < lim && (front || n === 0)) { u.spaceOf = tgt.id; N[tgt.id] = n + 1; }
      else { if (u.retT > 5) u.retT = 5; this.xcHold(u, tgt, d, nx, nz, reach + 1.6 + (u.id % 3) * 0.35, 0.7); this.xcGuard(u); return 1; } // the waiting rank: a pace or two back, ready to step in
    }
  }
  if (reach >= 2.9 && d < reach * 0.72 && u.st !== ST_WINDUP && u.st !== ST_RELEASE) { this.xcHold(u, tgt, d, nx, nz, reach - 0.4, 0.6); return 2; } // a spear keeps the point out in front, not the shaft
  return 0;
};
Sim.prototype.xcFront = function (sq) { // a company in contact anchors its front rank on the line between the two bodies instead of on the enemy's centre
  const was = sq.front; sq.front = false;
  if (sq.order !== ORD_CHARGE || sq.def.mounted || sq.def.ai === 'ranged' || sq.def.ai === 'cannon' || sq.routing || sq.aliveCount < 2) return;
  let e = null, bd = 100; for (const q of this.squads) { if (!q.alive || q.inactive || q.team === sq.team || q.def.mounted || q.def.ai === 'cannon') continue; const d2 = (q.cx - sq.cx) * (q.cx - sq.cx) + (q.cz - sq.cz) * (q.cz - sq.cz); if (d2 < bd) { bd = d2; e = q; } }
  if (!e) return; const d = Math.sqrt(bd) || 1, nx = (e.cx - sq.cx) / d, nz = (e.cz - sq.cz) / d, back = clamp(sq.def.reach * 0.5, 1.05, 1.8);
  const ax = (sq.cx + e.cx) * 0.5 - nx * back, az = (sq.cz + e.cz) * 0.5 - nz * back;
  if (was) { sq.fax += (ax - sq.fax) * 0.4; sq.faz += (az - sq.faz) * 0.4; } else { sq.fax = ax; sq.faz = az; }
  sq.facing = atan2(nx, nz); sq.front = true;
};
Sim.prototype.xcBreathe = function (u, k) { // step back and get your wind; scaled by how tired, hurt and shaken he is
  if (!u || u.dead || u.ctrl >= 0 || u.mounted || u.wounded || u.champ || u.type === 'horse' || u.def.ai === 'cannon' || u.breathE > this.tick || this.tick < (u.breathCd || 0)) return;
  const sq = u.squad >= 0 ? this.squads[u.squad] : null, m = sq ? clamp(sq.morale / (sq.moraleMax || 1), 0, 1) : 1;
  const dur = (1.4 + this.rng.next() * 1.4) * k * (1 + (u.fat || 0) / 200 + (1 - u.hp / u.def.hp) * 0.4) * (1.3 - m * 0.3);
  u.breathE = this.tick + Math.round(dur * 30); u.breathCd = u.breathE + Math.round((3 + this.rng.next() * 2.5) * 30); u.xch = 0; u.spaceOf = -1;
};
Sim.prototype.xcEbb = function () { // clash, pause, clash: count the blows each man trades; a hard exchange or a man falling makes both fronts give a step
  const ev = this.events, U = this.units, tk = this.tick;
  const bump = (a, b) => { for (const u of [a, b]) { u.xch = Math.max(0, (u.xch || 0) - (tk - (u.xchT || tk)) * DT * 0.4) + 1; u.xchT = tk; }
    if (a.xch >= 2.6 || b.xch >= 2.6) { this.xcBreathe(a, 1); this.xcBreathe(b, 1); } };
  for (let i = 0; i < ev.length; i++) { const e = ev[i];
    if (e.t === 'hit' && e.att >= 0 && (e.cause === 'melee' || e.cause === 'spear' || e.cause === 'counter')) { const a = U[e.att], v = U[e.id]; if (!a || !v) continue; bump(a, v);
      if (e.killed) { const n = this.gatherNear(v.x, v.z, 4); for (let j = 0; j < n; j++) { const w = U[this.nearBuf[j]]; if (w !== v && !w.dead && len(w.x - v.x, w.z - v.z) < 4 && this.rng.next() < 0.75) this.xcBreathe(w, 0.85); } } }
    else if (e.t === 'block' && e.att >= 0 && e.by >= 0) { const a = U[e.att], v = U[e.by]; if (a && v) bump(a, v); } }
};

// ---- hit reactions (experimental combat only): a short, readable flinch that stops a man attacking, never a lock ----
// six kinds: 0 head snapped back, 1 twisted aside, 2 doubled over, 3 stagger back with arms flung, 4 buckled to one knee, 5 guard driven back.
// Anti-lock: a running reaction is never extended or restarted; when it ends the man has 0.7 s in which further hits hurt but
// cannot stagger him (only a cosmetic flinch); and he is never reeling for more than 0.6 s out of any 2 s.
const HR_IMM = 0.7, HR_WIN = 60, HR_CAP = 0.6;
// ---- 狼筅 · the wolf-brush and the mandarin duck team (紀效新書) ----
// The brush does not kill: its spiked, layered branches catch a man at five metres, shove him back and hold him for a
// moment, and the long spears behind step out and finish him. A man the brush has just let go of can't be caught again
// at once (he tears free), so two brushes can't hold one man forever.
Sim.prototype.brushCatch = function (v, b, nx, nz, blocked, hx, hy, hz) {
  if (v.dead || v.type === 'horse') return;
  const imm = (v.entImm || 0) > this.tick, m = 1 / (v.mass || 1);
  if (imm) { v.vx += nx * 3.4 * m; v.vz += nz * 3.4 * m; return; }
  const dur = v.champ ? 0.35 : blocked ? 0.42 : 0.65;
  v.entT = Math.max(v.entT, dur); v.entImm = this.tick + Math.round((dur + 1.2) * 30); v.entBy = b.id;
  v.vx += nx * (blocked ? 3.5 : 5.5) * m; v.vz += nz * (blocked ? 3.5 : 5.5) * m;
  if (v.st === ST_WINDUP || v.st === ST_AIM) { v.st = ST_IDLE; v.stT = 0; } v.blocking = false;
  if (v.hrT > 0) v.hrT = 0;
  this.posture(v, blocked ? 5 : 8, b);
  this.events.push({ t: 'entangle', id: v.id, by: b.id, blocked: !!blocked, x: hx, y: hy, z: hz });
};
// the duck team fights as one body from its places: the brushes screen and sweep, the spears lunge at what the brushes
// catch and step back, the shields and the leader step up a pace to meet whoever gets through, the tridents guard the
// flanks and finish the fallen. Only a broken team (half gone) falls apart into single fights.
// in contact the duck team does not run onto the enemy: its body stops with the enemy at the end of the brushes and
// presses forward slowly as one, turning to face him; a team cut down to half loses this and fights man to man
Sim.prototype.yyAnchor = function (sq, n) {
  if (n < sq.count * 0.5 || sq.routing || (sq.order !== ORD_CHARGE && sq.order !== ORD_HOLD && sq.order !== ORD_FORM)) { sq.yyA = false; return; }
  let e = null, bd = 13; const m = this.gatherNear(sq.cx, sq.cz, 13);
  for (let i = 0; i < m; i++) { const v = this.units[this.nearBuf[i]]; if (v.team === sq.team || v.dead || v.wounded || v.type === 'horse' || v.inactive) continue; const dv = len(v.x - sq.cx, v.z - sq.cz); if (dv < bd) { bd = dv; e = v; } }
  if (!e) { if (sq.yyA) { sq.yyA = false; } return; }
  const dx = e.x - sq.cx, dz = e.z - sq.cz, l = len(dx, dz) || 1, want = atan2(dx, dz);
  const df = wrap(want - sq.facing), turn = 1.0 * 15 * DT; sq.facing = wrap(sq.facing + clamp(df, -turn, turn));
  const ax = e.x - sin(sq.facing) * 4.6, az = e.z - cos(sq.facing) * 4.6;
  if (!sq.yyA) { sq.yyA = true; sq.yax = sq.cx; sq.yaz = sq.cz; }
  const mx = ax - sq.yax, mz = az - sq.yaz, ml = len(mx, mz), step = 1.3 * 15 * DT; // squadThink runs every 15 ticks: the body moves at about a walking pace
  if (ml > step) { sq.yax += mx / ml * step; sq.yaz += mz / ml * step; } else { sq.yax = ax; sq.yaz = az; }
};
Sim.prototype.yyAI = function (u, sq, tgt, d, reach) {
  const r = u.role; if (!r || r === 'cook' || !sq.def.yuanyang) return false;
  if (sq.aliveCount !== undefined && sq.count && sq.aliveCount < sq.count * 0.5) return false;
  const sx = u.slotX, sz = u.slotZ, sd = len(sx - u.x, sz - u.z), sp = u.def.speed;
  const home = (lim) => { if (sd > lim) this.steerFoot(u, sx, sz, sp * (sd > 3 ? 1 : 0.8)); else { u.mx = 0; u.mz = 0; } };
  const idle = u.st === ST_IDLE && u.flinchT <= 0 && u.entT <= 0 && !(u.hrT > 0);
  if (r === 'spear') {
    if (u.yyL === 1) { const v = this.units[u.yyT];
      if (!v || v.dead || u.st === ST_RECOVER || u.st === ST_STUN || (u.st === ST_IDLE && this.tick - u.yyS > 8)) { u.yyL = 2; u.yyB = this.tick; u.lunge = false; }
      else { u.target = v.id; const dd = len(v.x - u.x, v.z - u.z); if (dd > reach - 0.4) this.steerFoot(u, v.x, v.z, sp * 1.7); else { u.mx = 0; u.mz = 0; } return true; } }
    if (u.yyL === 2) { u.lunge = false; if (sd < 0.6 || this.tick - u.yyB > 75) u.yyL = 0; else { this.steerFoot(u, sx, sz, sp * 1.15); return true; } }
    // notice what the brushes have caught: a held man within a lunge of this spear, at most two spears on one man
    if (idle) { let best = null, bd = reach + 2.4; const n = this.gatherNear(u.x, u.z, reach + 2.6);
      for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.team === u.team || v.dead || !(v.entT > 0.12) || v.type === 'horse') continue; const dv = len(v.x - u.x, v.z - u.z); if (dv >= bd || dv < 1.2) continue;
        let k = 0; for (const id of sq.unitIds) { const w = this.units[id]; if (w !== u && w.yyL === 1 && w.yyT === v.id) k++; } if (k >= 2) continue; best = v; bd = dv; }
      if (best) { u.yyL = 1; u.yyT = best.id; u.yyS = this.tick; u.target = best.id; this.startWindup(u, DIR_DOWN); u.heavy = !!this.xc; u.aiHeavy = false; u.lunge = true;
        const dx = best.x - u.x, dz = best.z - u.z, l = len(dx, dz) || 1; u.vx += dx / l * 5; u.vz += dz / l * 5; this.turnTo(u, atan2(dx, dz), 1);
        this.events.push({ t: 'yylunge', id: u.id, at: best.id }); return true; } }
    home(1.0); if (tgt && idle && d <= reach + 0.2 && this.rng.next() < 0.08) this.startWindup(u, DIR_DOWN); return true;
  }
  if (r === 'brush') { home(1.0);
    if (idle) { let c = null, cd = reach + 1.6, near = 99; const n = this.gatherNear(u.x, u.z, reach + 2);
      for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.team === u.team || v.dead || v.wounded || v.type === 'horse') continue; const dv = len(v.x - u.x, v.z - u.z); if (dv < near) near = dv;
        if (v.entT > 0 || (v.entImm || 0) > this.tick + 8 || dv >= cd || Math.abs(wrap(atan2(v.x - u.x, v.z - u.z) - u.yaw)) > 1.1) continue; c = v; cd = dv; }
      if (c) { u.target = c.id; if (this.rng.next() < 0.45) { const k = (u.id + (this.tick >> 4)) % 3; this.startWindup(u, k === 0 ? DIR_DOWN : k === 1 ? DIR_LEFT : DIR_RIGHT); } }
      else if (tgt && d < 11 && near > reach + 1 && this.tick >= (u.yySw || 0)) { u.yySw = this.tick + 55 + (u.id % 5) * 7; this.startWindup(u, (u.yySw >> 3) & 1 ? DIR_LEFT : DIR_RIGHT); } } // the brush is never still: it sweeps the front of the team
    return true; }
  if (r === 'shield' || r === 'lead') {
    // a man who got past the brushes, close to the spears or the brushes: step up a pace, take him on the shield, cut him
    let lk = null, ld = 99; const n = this.gatherNear(u.x, u.z, 6);
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.team === u.team || v.dead || v.type === 'horse' || v.wounded) continue;
      let near = false; for (const id of sq.unitIds) { const w = this.units[id]; if (w.dead || (w.role !== 'spear' && w.role !== 'brush')) continue; if (len(v.x - w.x, v.z - w.z) < 2.6) { near = true; break; } }
      const dv = len(v.x - u.x, v.z - u.z); if ((near || dv < reach + 0.6) && dv < ld) { ld = dv; lk = v; } }
    if (lk) { u.target = lk.id; if (u.yyCov !== lk.id) { u.yyCov = lk.id; this.events.push({ t: 'yycover', id: u.id, at: lk.id }); }
      const px = lk.x - u.slotX, pz = lk.z - u.slotZ, pl = len(px, pz) || 1, k = Math.min(1.5, pl - reach * 0.6), gx = u.slotX + px / pl * Math.max(0, k), gz = u.slotZ + pz / pl * Math.max(0, k);
      if (len(gx - u.x, gz - u.z) > 0.4) this.steerFoot(u, gx, gz, sp); else { u.mx = 0; u.mz = 0; }
      const open = lk.st === ST_RECOVER || lk.st === ST_STUN || lk.entT > 0 || lk.hrT > 0 || lk.openT > 0;
      if (idle && !u.blocking && ld <= reach + 0.3 && this.rng.next() < (open ? 0.3 : 0.06)) this.startWindup(u, this.aiPickDir(u));
      return true; }
    home(0.8); if (tgt && idle && !u.blocking && d <= reach + 0.2 && this.rng.next() < 0.05) this.startWindup(u, this.aiPickDir(u)); return true;
  }
  if (r === 'trident') {
    // the flanks, and the finishing of whoever the team has caught or knocked down
    let fv = null, fd = 99; const n = this.gatherNear(u.x, u.z, reach + 2);
    for (let i = 0; i < n; i++) { const v = this.units[this.nearBuf[i]]; if (v.team === u.team || v.dead || v.type === 'horse') continue; const dv = len(v.x - u.x, v.z - u.z); if (dv > reach + 1.5) continue; const w = (v.entT > 0 || v.downT > 0 || v.hrT > 0) ? dv - 2 : dv; if (w < fd) { fd = w; fv = v; } }
    if (fv) { u.target = fv.id; const dv = len(fv.x - u.x, fv.z - u.z); const gx = sx + (fv.x - sx) * 0.35, gz = sz + (fv.z - sz) * 0.35; if (dv > reach - 0.3 && len(gx - sx, gz - sz) < 1.5) this.steerFoot(u, gx, gz, sp); else home(1.5);
      if (idle && dv <= reach + 0.2 && this.rng.next() < ((fv.entT > 0 || fv.downT > 0 || fv.hrT > 0) ? 0.35 : 0.08)) this.startWindup(u, DIR_DOWN); return true; }
    home(1.0); return true;
  }
  return false;
};
Sim.prototype.hitReact = function (u, a, kind, heavy, blocked) {
  if (!this.xc || u.dead || u.type === 'horse' || u.def.ai === 'cannon' || u.champ) return false;
  if (u.hrA === undefined) { u.hrT = 0; u.hrImm = 0; u.hrA = 9; u.hrK = 0; u.hrD = 0.3; u.hrS = 1; u.hrL = []; u.hrF = 0; u.hrFS = 1; }
  const sd = a ? wrap(atan2(a.x - u.x, a.z - u.z) - u.yaw) : 0, sgn = sd < 0 ? -1 : 1;
  const flick = () => { if (!blocked) { u.hrF = 0.16; u.hrFS = sgn; } return false; };
  if (u.hrT > 0 || u.hrImm > 0 || u.st === ST_STUN) return flick();
  if (u.mounted || u.mount >= 0 || u.braceT > 0 || u.dashT > 0 || u.guardT > 0 || u.downed || u.wounded) return flick();
  let k, d;
  if (blocked) { k = 5; d = heavy ? 0.2 : 0.15; }
  else if (heavy && u.hp < u.def.hp * 0.35) { k = 4; d = 0.5; }
  else if (heavy) { k = 3; d = 0.45; }
  else { const r = this.rng.next();
    if (kind === 'thrust') k = r < 0.7 ? 2 : 0;
    else if (kind === 'shot') k = r < 0.45 ? 2 : r < 0.75 ? 0 : 1;
    else if (Math.abs(sd) > 0.5) k = r < 0.8 ? 1 : 0;
    else k = r < 0.6 ? 0 : r < 0.85 ? 1 : 2;
    d = k === 2 ? 0.34 : k === 1 ? 0.3 : 0.27; if (kind === 'shot') d *= 0.8; }
  if (u.ctrl >= 0 && !(this.players[u.ctrl] && this.players[u.ctrl].ai)) d *= 0.6;
  // the 2-second budget: never reeling more than HR_CAP seconds out of any HR_WIN ticks
  const t = this.tick; let used = 0; for (const iv of u.hrL) used += Math.max(0, Math.min(iv[1], t) - Math.max(iv[0], t - HR_WIN));
  d = Math.min(d, HR_CAP - used * DT); if (d < 0.1) return flick();
  u.hrT = d; u.hrD = d; u.hrK = k; u.hrS = sgn; u.hrA = 0; u.hrF = 0;
  u.hrL.push([t, t + Math.round(d / DT) + 1]); if (u.hrL.length > 4) u.hrL.shift();
  if (!blocked) { u.flinchT = Math.max(u.flinchT, d); if (u.st === ST_WINDUP || u.st === ST_AIM) { u.st = ST_IDLE; u.stT = 0; } }
  if (k === 3 && a) { const dx = u.x - a.x, dz = u.z - a.z, l = len(dx, dz) || 1; u.vx += dx / l * 1.4; u.vz += dz / l * 1.4; }
  this.events.push({ t: 'hitreact', id: u.id, k });
  return true;
};
Sim.prototype.hrTick = function (u) {
  if (u.hrT > 0) { u.hrT -= DT; if (u.hrT <= 1e-6) { u.hrT = 0; u.hrImm = HR_IMM; } }
  else if (u.hrImm > 0) u.hrImm -= DT;
  if (u.st === ST_STUN) u.hrImm = Math.max(u.hrImm, 0.5);
  if (u.hrF > 0) u.hrF -= DT;
  if (u.hrA < 5) u.hrA += DT;
};
return { Sim, defFor, STORY, DEFS, ROSTER, FACTION, BATTLES, BUDGET, TICK, DT, HALF, DEPLOY_TICKS, RALLY_CD, terrainH, setTerrainScale, TERR, waterAt, slotOffset, YY_SLOT, FORM_COLUMN, WPN, spacingOf, gunOf,
  KEY_W, KEY_S, KEY_A, KEY_D, A_ATK, A_BLOCK, A_FIRE, A_AIM, A_KICK, A_MOUNT, A_JUMP, A_SWAP, A_RELOAD, A_CMD, A_RALLY, A_READY, A_THROW, A_DUEL, AIM_RAISE, A_AB1, A_AB2, A_AB3, A_ULT, A_DODGE, A_DASHL, A_DASHR, KEY_SPRINT, ORD_SPAWN, ORD_CLASS, HCLASS, HAB, SCEN, BOMBS, FURY_MAX, SROLE, ARMS, RANGED, MISSIONS, OPS,
  DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT, ST_IDLE, ST_WINDUP, ST_RELEASE, ST_RECOVER, ST_STUN, ST_RELOAD, ST_AIM, ST_SWAP, ST_KICK, ST_BURST,
  ORD_WAVE, ORD_MOVE, ORD_CHARGE, ORD_HOLD, ORD_FOLLOW, ORD_FORM, ORD_FIRE, ORD_CONTROL, ORD_AUTO, ORD_ABILITY, ORD_NAVAL, ORD_DIRECTIVE, DIR_ATTACK, DIR_HOLD, DIR_SUPPORT, DIR_FLANK, AI_NAMES, MODES, SCORE_WIN, FIRE_CS, abilityOf, ABILITY, FORM_LINE, FORM_COLUMN, FORM_WEDGE, FORM_LOOSE, RELEASE_T, KICK_T, SWAP_T };
})();
