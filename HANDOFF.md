# 遼東 Liaodong — handoff for a collaborating agent

You are joining an ongoing project: a browser game about the Ming–Qing war (1619 onwards), written in plain JavaScript with
three.js r128. It is a **deterministic lockstep** game (30 Hz) so the same build runs identically for every peer.
The owner is a single user who plays the published builds and sends short feedback; another Claude session ("main") is
also working on the code. Read this whole file before you change anything.

Live site: https://laladehulu.github.io/Liaodong/ (built HTML only; the source is NOT on GitHub — see "Getting the source").

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
- `sim.js` (~4.3k lines) — the whole simulation: units, squads, AI (`unitAI`, `findTarget`, `cavCharge`, `yyAI` duck team,
  `spearKeep`/`pointWait`, `losClear`), combat (`startWindup`, `updateCombatState`, `sweepHit`, `resolveMeleeHit`,
  `applyDamage`, `fireRifle`), story/campaign missions (`MISSIONS`, `mg` groups, `zDown`/`zRevive` wounded), siege (`sg*`).
  Exported at the bottom (`return { Sim, DEFS, ... }`) as the global `SIM`.
- `render.js` (~3k lines) — three.js renderer (`RENDER`): instanced figures (`drawFigure`, keyframe tables `KF`, viewmodel `VM`),
  gear/uniforms (`gearFor`, `lookGear`, `faceEyes`; part budget `GEAR_K`), particles (`Particles` class: smoke shader),
  events → effects (`processEvents`), ink shadows (`inkShadows`, `inkInit`).
- `anim.js` — render-only spring rig (`ANIM.rig`) and foot planting (`ANIM.feet`).
- `realism.js`, `stylized.js`, `real_gear.js` — edition-specific renderer patches and uniforms.
- `action.js` — Action-combat edition: 13 committed moves (`MV` table), wraps `startWindup` / `updateCombatState` /
  `unitAI` / `meleeControl` on `SIM.Sim.prototype`; returns early unless `MING_ACTION`.
- `main.js` (+ `career.js`, `zhe.js` story 浙, `jin.js` Jin campaign, `shenji.js` 神機營 campaign, `choices.js` branching
  decisions, `deeds.js`, `debug.js`) — UI, HUD, input, menus. `build.sh` splices these into `src/_mainfull.js` (generated).
- `audio.js`, `voice.js`, `music.js`, `snd/` + `voice/` (CC0 clips; `snd_data.js`/`voice_data.js` are generated).
- `net.js` — PeerJS lockstep networking. `beacon.js`/`mode_beacon.js` — the 烽火 Hold-the-Beacon mode.
- `01_head.html` — page shell, CSS, menus.

## 3. Build, test, snapshot
```
tools/check.sh                     # node --check every src file, then build.sh (locked); prints the last build size line
node test/test_lockstep.js         # MUST print "3 peers IN SYNC" after any sim change
tools/snap.sh "<you>: what changed" # git commit of the working tree (locked); do it after every change that passes check
```
Headless browser for screenshots: playwright-core at `/opt/npm-tools/node_modules/playwright-core`, chromium at
`/opt/pw-browsers/chromium_headless_shell-1243/...` with `--use-angle=swiftshader`. Software rendering: frame timings are
NOT representative of a real GPU, and heavy scenes can crash the tab — keep scenes small.
Story battles can be started headless by writing localStorage `mingZhe` / `mingZheGo` (see any test script).

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

## 6. Current state (v89, 27 Oct 2026)
Recent work: smoke shader (rising, sulphur-grey black-powder smoke), Bannerlord-style hit feel (blade drag, blood on blade,
Delivered/Received log), faces with eyes, grimy uniforms, robe flaps on the thighs, spear point-keeping AI, cavalry
charge fixes, LOS for gunners and siege defenders climbing to the rampart, melee spreading/wrap-around, campaign choices
(浙 story: the Jurchen boy, the ravine, Hun River, letter home, ledger), Action-combat edition with 13 moves.

Open items you could take (check with the user/main first):
- **Safari lag**: not yet located. The user can test `?off=feet,rig,smoke,gear,shadows`. Software profiling points at the
  gear instancing (`GEAR_K` slots × every unit, rounded-box geometry, drawn in two passes).
- **Campaign choices** for the Jin campaign (half done in `choices.js`) and the 神機營 campaign (none yet).
- Siege: many defender gunners still stay inside the town; `toRampart` only runs when they have a target out of sight.
- Action combat: player-side tuning, a move list / tutorial card in the HUD, render poses for leap/sweep/bash.

## 7. Getting the source / sending changes back
The source lives only in the main session's workspace. You will be given `liaodong.bundle` (the whole git repo in one
file). To work:
```
git clone liaodong.bundle ming && cd ming && bash build.sh && node test/test_lockstep.js
```
Generated files (`src/_mainfull.js`, `src/snd_data.js`, `src/voice_data.js`, `dist/`) are rebuilt by `build.sh`.
When done, send your work back as patches the user relays to the main session:
```
git format-patch <the commit you started from>..HEAD -o patches/   # one .patch per commit, then zip patches/
```
Keep each commit small and described ("sim: …", "render: …"); the main session applies them with `git am` and publishes.
