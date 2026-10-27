// Jin choices harness: load choices.js with a fake game around it, then build / pick / end / talk / murmur / dream every
// option of every Jin decision, so no option throws. usage: node test/jchoices.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['dmath.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, Int32Array, Float64Array, Float32Array, JSON, Set, Object, Array }; vm.createContext(ctx); vm.runInContext(src + '\nthis.SIM = SIM;', ctx);
// the roster from jin.js, and the stubs choices.js wraps
const jin = fs.readFileSync(path.join(__dirname, '..', 'src', 'jin.js'), 'utf8');
const JRsrc = jin.slice(jin.indexOf('const JR = ['), jin.indexOf('];', jin.indexOf('const JR = [')) + 2);
const prelude = `${JRsrc}
const $ = () => null; let ZB = null, ZC = null, ZS = null, JS = null; const state = { sim: null, zheDlg: null, screen: 'game' }; const Input = { keys: 0, cmds: [], yaw: 0 };
const AUDIO = { play: () => {} }; const THREE = {}; const SPEECH = { say: () => true };
const jSave = () => {}, localHero = () => null, zCards = (c, d) => d && d(), storyCard = () => {}, requestLock = () => {}, jLoad = () => JS, jFresh = () => JS, jMeRow = () => {}, jIdx = (k) => JR.findIndex(r => r.k === k), jRow = (k) => JR.find(r => r.k === k), jFile = () => [], jDress = () => {}, jGo = () => {};
let startGame = () => {}, zSleep = () => {}, zTalk = () => null, zStart = () => {}, zheFinish = () => {}, zheHUD = () => {}, zSleep2 = () => {}, zCampCfg2 = () => ({ npcs: [] }), zheKeyE = () => {}, jStart = () => {}, jFinish = () => {}, jKeyE = () => {}, jEnd = () => {};
const ZHOOK = {}, JCH = {}, ZR = [], zLoad = () => null, zFresh = () => ({}), zSave = () => {}, zFileK = () => [], zFile2 = () => [], zDress = () => {}, zRow = () => null, zGo = () => {}, ddDD = (S) => (S.dd = S.dd || { rep: {} }), ddBeat = (n, d) => d();
const window = { addEventListener: () => {} }, document = { pointerLockElement: null };
`;
const ch = fs.readFileSync(path.join(__dirname, '..', 'src', 'choices.js'), 'utf8');
vm.runInContext(prelude + ch + '\nthis.__t = { JR, CHD, chCtx: () => ({ c: "jin", S: JS, save: () => {}, R: JR }), setJS: (s) => { JS = s; }, chData, CHBT, chJinVariants, chGot };', ctx);
const T = ctx.__t, S = ctx.SIM;
const fresh = () => { const s = { v: 1, stage: 'c4', name: { zh: '阿克敦', en: 'Akdun' }, alive: {}, fate: {}, bond: {}, talked: {}, flags: {}, me: 'me', joined: {}, seen: {} }; for (const r of T.JR) if (!r.guest) { s.alive[r.k] = true; s.bond[r.k] = 0; } return s; };
const ids = ['j1scout', 'j2gun', 'j3ice', 'j3jetty', 'j4ditch', 'j4leave', 'j4heads'];
let n = 0, fails = 0;
for (const id of ids) {
  const D = T.CHD[id]; if (!D) { console.log('MISSING', id); fails++; continue; }
  const nOpts = D.build(T.chCtx.call(null) && (T.setJS(fresh()), T.chCtx())).opts.length;
  for (let o = 0; o < nOpts; o++) for (const variant of ['full', 'thin']) {
    const s = fresh(); if (variant === 'thin') for (const k of ['lier', 'wangsi', 'manggu', 'bahai', 'alin', 'dabsun', 'ilan', 'anju']) s.alive[k] = false;
    if (id === 'j3ice' && o === 0 && variant === 'thin') s.flags.whipped = 1;
    T.setJS(s); const C = T.chCtx(); T.chData(s);
    try {
      const spec = D.build(C); const opt = spec.opts[o]; if (!opt) continue;
      s.ch[spec.id] = { o }; s.ledger.push({ id: spec.id, o, t: spec.title, pick: opt.led || opt.q }); opt.fx && opt.fx(C);
      for (const l of spec.lines.concat(opt.a || [])) if (!Array.isArray(l) || typeof l[0] !== 'string' || typeof l[1] !== 'string') throw new Error('line not bilingual: ' + JSON.stringify(l));
      // later flags the end/talk lines read
      for (const f of [{}, { lierGone: 1, ahaRan: 1, noMerit: 1 }]) { Object.assign(s.flags, f);
        const e = D.end ? D.end(C, o) : ''; if (typeof e !== 'string') throw new Error('end not a string');
        if (D.dream) D.dream(C, o); if (D.murmur) D.murmur(C, o);
        if (D.talk) for (const r of T.JR) { const t = D.talk(C, r.k, o); if (t && (!t.q || !t.a || t.a.some(l => !l[0] || !l[1]))) throw new Error('bad talk ' + r.k); } }
      n++;
    } catch (e) { fails++; console.log('FAIL', id, o, variant, e.stack.split('\n').slice(0, 2).join(' ')); }
  }
}
// the Abdali variant and the Changshan choice data in the sim itself
T.chJinVariants(); const W = S.MISSIONS.jin1_w; if (!W || !W.phases[3].waves.length) { console.log('FAIL jin1_w'); fails++; }
for (const m of ['jin1_w', 'jin4']) { try { const sim = new S.Sim({ seed: 3, mode: 'campaign', mission: m, players: [{ name: 'me', team: 1 }] }); for (let t = 0; t < 60; t++) sim.step([[0, 0, 0, 0, 0, 0, [], 0]]); if (m === 'jin4') { sim.debugCmd(sim.players[0], 2, (0 << 8) | (0 << 4) | 0); if (sim.mv.chose[0] !== 0) throw new Error('choice not recorded'); } n++; } catch (e) { fails++; console.log('FAIL sim', m, e.stack.split('\n').slice(0, 2).join(' ')); } }
console.log(`jin choices: ${n} cases ok, ${fails} failed`); process.exit(fails ? 1 : 0);
