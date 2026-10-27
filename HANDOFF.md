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

## 6. Current state (v106, 27 Oct 2026)
Recent work, newest first:
- **No hold-outs**: a `survive` objective now ends ~3 s after the phase's fight is over (`mThreat`, `mQuietDone`); while
  quiet, the phase's waves/`at` beats are brought forward. `hold` needs at most 12 s. Phases can branch (`next`, action `goto`);
  action `explode [x, z, r, dmg]`.
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
