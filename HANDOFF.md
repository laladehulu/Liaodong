# 遼東 Liaodong — handoff for a collaborating agent

You are joining an ongoing project: a browser game about the Ming–Qing war (1619 onwards), written in plain JavaScript with
three.js r128. It is a **deterministic lockstep** game (30 Hz) so the same build runs identically for every peer.
The owner is a single user who plays the published builds and sends short feedback; another Claude session ("main") is
also working on the code. Read this whole file before you change anything.

Live site: https://laladehulu.github.io/Liaodong/ · source: https://github.com/laladehulu/Liaodong (see sections 7 and 8).

## 1. Editions (all built from the same source by `build.sh`)
| Folder on the site | Flags set in the page | What it is |
|---|---|---|
| `regular/` | none | the base game, ink-print look |
| `realism/` | `MING_REAL`, `MING_XCOMBAT` | film look (PBR, HDR, grade), realism uniforms (`real_gear.js`), swept-blade melee |
| `stylized/` | + `MING_STYLE` | the realism game with toon/painted graphics (`stylized.js`) |
| `battle-experiment/` | `MING_XCOMBAT` | experimental melee only |
| `action-combat/` | `MING_REAL`, `MING_XCOMBAT`, `MING_ACTION` | Dark-Souls-style move-set melee (`action.js`) |
| `speech-layouts/` | — | regular build plus a speech-UI banner (regenerated at publish) |

Local test pages (no CDN): `dist/test.html`, `test-real.html`, `test-style.html`, `test-act.html`.

## 2. Source map (`src/`)
- `dmath.js` — deterministic math (DM trig) used by the sim. **The sim must never use Math.sin/cos/random.**
- `sim_coop.js` — data only: the newer co-op missions (Zhenjiang night raid, grain road, Jinzhou lines, Dalinghe sortie),
  added to `SIM.MISSIONS`. Loaded right after `sim.js` in every edition.
- `sim.js` (~4.4k lines) — the whole simulation: units, squads, AI (`unitAI`, `findTarget`, `cavCharge`, `yyAI` duck team,
  `spearKeep`/`pointWait`, `losClear`), combat (`startWindup`, `updateCombatState`, `sweepHit`, `resolveMeleeHit`,
  `applyDamage`, `fireRifle`), story/campaign missions (`MISSIONS`, `mg` groups, `zDown`/`zRevive` wounded), siege (`sg*`).
  Exported at the bottom (`return { Sim, DEFS, ... }`) as the global `SIM`.
- `render.js` (~3k lines) — three.js renderer (`RENDER`): instanced figures (`drawFigure`, keyframe tables `KF`, viewmodel `VM`),
  gear/uniforms (`gearFor`, `lookGear`, `faceEyes`; part budget `GEAR_K`), particles (`Particles` class: smoke shader),
  events → effects (`processEvents`), ink shadows (`inkShadows`, `inkInit`).
- `anim.js` — render-only spring rig (`ANIM.rig`) and foot planting (`ANIM.feet`).
- `arsenal.js` — story campaigns: weapons you carry off a field are kept in the save; in camp, I opens the arsenal to pick
  up to three for the next battle (sent as `cfg.players[].wkit`, so it is the same on every machine).
- `realism.js`, `stylized.js`, `real_gear.js` — edition-specific renderer patches and uniforms.
- `action.js` — Action-combat edition: 13 committed moves (`MV` table), wraps `startWindup` / `updateCombatState` /
  `unitAI` / `meleeControl` on `SIM.Sim.prototype`; returns early unless `MING_ACTION`.
- `main.js` (+ `career.js`, `zhe.js` story 浙, `jin.js` Jin campaign, `shenji.js` 神機營 campaign, `choices.js` branching
  decisions, `shenji2.js` the 神機營 expansion (Zunhua road, Yongding Gate, Luanzhou, Lengkou + five choices), `deeds.js`,
  `debug.js`) — UI, HUD, input, menus. `build.sh` splices these into `src/_mainfull.js` (generated).
- `audio.js`, `voice.js`, `music.js`, `snd/` + `voice/` (CC0 clips; `snd_data.js`/`voice_data.js` are generated).
- `net.js` — PeerJS lockstep networking. `beacon.js`/`mode_beacon.js` — the 烽火 Hold-the-Beacon mode.
- `01_head.html` — page shell, CSS, menus.

## 3. Build, test, snapshot
```
tools/check.sh                     # node --check every src file, then build.sh (locked); prints the last build size line
node test/test_lockstep.js         # MUST print "3 peers IN SYNC" after any sim change
tools/snap.sh "<you>: what changed" # main session only (its shared tree); on your own clone use plain git commit on agent/<topic>
```
Headless browser for screenshots: playwright-core at `/opt/npm-tools/node_modules/playwright-core`, chromium at
`/opt/pw-browsers/chromium_headless_shell-1243/...` with `--use-angle=swiftshader`. Software rendering: frame timings are
NOT representative of a real GPU, and heavy scenes can crash the tab — keep scenes small.
Story battles can be started headless by writing localStorage `mingZhe` / `mingZheGo` (神機營: `mingShenji` / `mingShenjiGo`).
Since a container restart, `page.screenshot` hangs on WebGL pages: call `renderer.render(...)` inside `page.evaluate` and read
`renderer.renderer.domElement.toDataURL()` instead (one readback per browser; a second one can crash the tab).
`node test/colliders.js test.html grand:field,...` lists drawn building geometry a man could walk into (no sim collider under it).
Publishing (main session only): `tools/pub.sh vN "message"` snapshots, builds every edition into the Pages repo and pushes.

## 4. Hard rules (each of these has broken the game before)
1. **Determinism.** Sim code uses `this.rng` only (never `Math.random`), DM trig, and must give identical results on every
   peer. Render code may use anything but must never write to the sim.
2. **No code after an inline `//` comment on the same line.** Many lines are long one-liners; a trailing `// comment`
   swallows everything after it. Use `/* ... */` mid-line.
3. **Exact-string edits only** on shared files (Edit tool or `tools/edit.py FILE OLDFILE NEWFILE`). Never rewrite a whole
   shared file from an earlier read; another agent may have changed it.
4. **Never** `git checkout/reset/stash/restore` shared files or revert changes you didn't make.
5. Claim your area in `.collab/claims.md` (agent, files, functions) and release it when done.
6. Only the main session publishes to GitHub Pages.
7. Prefer new functions / new files / prototype wrappers over rewriting existing code (see how `action.js` and `choices.js`
   wrap `SIM.Sim.prototype` methods).
8. GLSL: `smoothstep(a, b, x)` with a > b is undefined — write `1.0 - smoothstep(b, a, x)`.

## 5. The owner's standing preferences
- Ground things in Ming-period sources (紀效新書, 練兵實紀, 武備志, 平番得勝圖 …); say so when no source exists.
- Show before/after images for every visual change.
- Don't remove existing sound effects; no synthetic Chinese speech; no new 0 A.D. assets (CC0 sources are fine, e.g.
  github.com/lavenderdotpet/CC0-Public-Domain-Sounds). The network allowlist only reaches GitHub, npm and pip.
- Don't lower resolution to fix performance — find the expensive thing.
- First-person immersion in tight formation is the core of the game; duels are secondary.

## 6. Current state (v118, 27 Oct 2026)
Recent work, newest first:
- **Melee in the xc editions (v108–v115)**, all gated on `this.xc`: AI swordsmen fight from *measure* (`Sim.prototype.xcMeasure`:
  stop ~0.35 m outside reach, step in with the cut so it lands at ~1.7 m, give the pace back in recovery; tempo, feints, a second
  cut after one that lands, one pace given when crowded then a cut; `u.xcIn` lets the step through the 0.45 movement scale);
  AI wind-ups jittered ±20%. The player's attack button runs **combo chains** (`Sim.prototype.comboDir`, table `CB`): the sim reads the
  fight and picks the cut's side and the chain (連環/雙敵/短打/探/破/追/反); R and wheel-up are thrown in; the last step is heavy
  (`u.cbHeavy`), chained cuts quicker (`u.cbFast`); event `combo` → HUD. Hit reactions follow the blade (`hitReact` reads
  `a.atkDir`), deaths follow the blow (`death` event carries `hdir/heavy/hx/hz`; `Ragdoll.spawn` per-point velocities), hitstop is
  back at its old values (the owner: a freeze is not weight) — weight comes from the blade drag, the camera lurch (`imp.vx/vr`), the
  struck man's reaction and `AUDIO.punch`. Sidestep ~1.4 m, no back-hop (soldier modes). **Strike cue** (`dangerHUD` in main.js,
  `#dangers`): a mark at each attacker's bearing closes on the crosshair through his wind-up, white = parry now; no text.
  Weapon AI: spear files keep their places (`tight`), the file guards its own (findTarget), swordsmen work round the end of a spear
  file (`wall`) and come in off the line of the point (`rushSpear`). Harnesses: `test/zfeel.js` (line fight feel, 8-seed means),
  `test/zduelfeel.js`, `test/zcombo.js`, `test/zspear.js`, `test/zfollow.js`, `test/zmeasure_shot.js` / `test/zreact_shot.js` (frames).
- **HUD/UI (v110–v116)**: deploy picker redraws at once; mid-battle phases are a banner (title + goal) with the text in the feed;
  pennants over friendly AI men (`fcPts`, no mark = enemy); the camera rides your own gun ball / bed-crossbow bolt (`shotCam`);
  first-person order gestures (`renderer.gesture`, set by `shout`); "Your place" row (`yyUI`, `localStorage.mingYyRole`) casts you
  in the duck team; assault spawns are camp/zones only; siege assaults count bows at a third toward the field cap and send blade-only
  waves once the field has enough bows; followers match a sprinting leader (`speedNow`) and stand 5 m behind him.
- **Maps (v116–v118, `src/sim_maps.js`)**: ten new battlefields (Sarhu, Songjin, Fushun, Shaling, Dalinghe, Jinzhou, Kaiyuan, Juehua,
  Tieling, Xifengkou) and audit fixes to the old ones; `Sim.prototype.unstickSpawns`; `test/maps_sim.js` must print "all maps ok".
- **No hold-outs**: a `survive` objective now ends ~3 s after the phase's fight is over (`mThreat`, `mQuietDone`); while
  quiet, the phase's waves/`at` beats are brought forward. `hold` needs at most 12 s. Phases can branch (`next`, action `goto`);
  action `explode [x, z, r, dmg]`.
- **Co-op missions** (sim_coop.js) are 5–6 phases each with a `cast` of named men: `say` lines are `[t, who, en, zh, order]`
  (career.js `coopSay` puts them on a man of the group, or of your own company, through SPEECH; `order` shows the key).
  Mission action `['fell', n, why]` drops n men of each player's company (E gets them up); objective `{ rescue: true }`
  waits for them. Assault ops carry `talk[team]` lines fired from `assaultThink` instead of a long brief. `test/zcoop.js`
  runs every co-op mission headless with a bot player (`node test/zcoop.js all <seed> <diff> <players>`).
- **Difficulty** `cfg.diff` 0–3 (Recruit / Soldier / Veteran / Lone banner). Carried in the start message; stored per browser
  (`localStorage.mingDiff`, `diffPref()`, `diffUI()` in career.js). Lone banner drops AI ally groups in co-op unless the
  mission needs them (`arrive`/`officer` targets, `escort: true`).
- 神機營 expansion (shenji2.js), four co-op missions (sim_coop.js), **Duel mode** (`mode: 'duel'`, `duelSetup/duelThink2`).
- Online: adaptive input delay (`netTune`), unordered redundant input channel (net.js `fast`), clock sync (`netAhead`),
  local camera prediction (`predictHero` → `renderer.pred`), TURN relays (Open Relay static auth + PeerJS). Ally player tags,
  order flags and blue lozenges over a friend's men.
- First-person death view (`state.dying`, render mode `'death'`), sprint charging blow (`u.chg`, xcombat editions),
  heavier hit thump (`bodythump`), crossbow/gun emplacement feedback (`empHit`), deploy picker lists every kind (rekit).
- Colliders: keeps sized to their drawn platform, siege inner face/stairs solid (`sinner` boxes), terrain grid snapped to
  the siege wall's drops, houses untangled (`untangleHouses`).

Open items you could take (check with the user/main first):
- Balance the new co-op missions on Veteran / Lone banner (only tested by a passive bot).
- Safari lag: still not located (`?off=feet,rig,smoke,gear,shadows` switches exist).
- Jin campaign choices (half done in `choices.js`).
- Night biome always snows (the Zhenjiang raid is in summer).
- Action combat: move list card, poses for leap/sweep/bash.

## 7. Getting the source / sending changes back
The source is on GitHub: https://github.com/laladehulu/Liaodong (branch `main`). The built game is published separately
to https://laladehulu.github.io/Liaodong/ by the main session (`tools/pub.sh`).
```
git clone https://github.com/laladehulu/Liaodong ming && cd ming && bash build.sh && node test/test_lockstep.js
```
Generated files (`src/_mainfull.js`, `src/snd_data.js`, `src/voice_data.js`, `dist/`) are rebuilt by `build.sh` and not committed.
Work on a branch of your own (`agent/<topic>`), keep each commit small and described ("sim: …", "render: …"), push it and
open a pull request against `main`. The main session merges, rebuilds and publishes. Before you start, and before you push,
`git pull --rebase origin main`: the main session pushes to `main` often.

## 8. Publishing (whoever the owner says is publishing; by default the main session)
The site is the `Liaodong/` folder of a separate repo, https://github.com/laladehulu/laladehulu.github.io (GitHub Pages).
```
git clone https://github.com/laladehulu/laladehulu.github.io      # once, next to your Liaodong clone
cd Liaodong && tools/pub.sh v107 "what changed, in a line"          # the next number after the seal on the landing page
```
`tools/pub.sh` pulls `main` (rebase), builds, refuses to publish if the lockstep test is not IN SYNC, pushes the source to
`main`, then writes all five editions (`regular/`, `realism/`, `stylized/`, `battle-experiment/`, `action-combat/`), the
version seal on the landing page and `speech-layouts/` into the Pages checkout, commits and pushes it. Pages goes live in
one to two minutes. If the Pages checkout is elsewhere, set `PAGES=/path/to/laladehulu.github.io/Liaodong`.
Version numbers: one per publish, never reused; check the seal on https://laladehulu.github.io/Liaodong/ (or
`grep -o 'seal">v[0-9]*' ../laladehulu.github.io/Liaodong/index.html`) and use the next one. Only one agent publishes at a
time: say so in `.collab/claims.md` (`publishing vN`) and remove the line afterwards.
A new edition needs three things: a block in `build.sh` that writes its `dist/*-index.html`, a line in the list in
`publish.py`, and a card on the landing page (`Liaodong/index.html` in the Pages repo).
