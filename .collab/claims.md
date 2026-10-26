# Claims: who is working where (add a line before you start, remove it when you finish)
- story-ch3: sim.js MISSIONS new key 'nyz' (Ningyuan story), zhe.js new Chapter 3 section appended at end, zhe.js menu Continue hook for ch3
- story-interlude (fork): sim.js MISSIONS.hunz forts/zones + new interlude mission, zhe.js ch1→ch2 flow, ch2 dialogue/intro cards

- story-road (fork): sim.js BATTLES.zroad + planTerrain/genMap zroad lines, MISSIONS roadA/roadB/roadC (inserted before ch3 nyz), setupMission one-line G.n trim hook + Sim.prototype.mTrim at end, zDown soft line; zhe.js new road block appended at end + routing lines in zStart/zheFinish/zMenu begin/INTRO2 end/zSleep2 end2

- combat-loop (fork, took over antibunch+hitreact): sim.js line-fighting section, hitReact/hrTick, unitAI melee block, meleeHit/stamina hooks, render.js hit poses; this.xc only- shenji2 (fork): src/shenji.js (ch4 sj4, ch5 sj5, per-man looks, chief line fallback, cannon FX); minimal render/zhe hooks
- jin-story2 (fork): src/jin.js (jin1-4 fixes, new jin5/jin6/jin7), tiny guarded render hooks (banner colour, kneel)
- beijing fork: sim.js BATTLES.bjgate + planTerrain/genMap bjgate lines; render.js buildBeijing (new prototype) + 1-line call in buildStructures; shenji.js sj2 battle key
- sj-ambush (fork): shenji.js new mission sjamb in <sj-missions> + flow lines; sim.js BATTLES new key 'sjvil' (+planTerrain/genMap lines if needed)
- aidpost (fork): sim.js zCrawl/woundedAI/aiMedic + new Sim.prototype.aidPost/orderlyAI/zAid at wounded section, 1-line unitAI orderly hook; render.js carry viewmodel + aided/carried poses (guarded); main.js/zhe.js goal line + hudMarks aid marker
- model-style (fork): render.js figure geometry (torso/limb/hips geo, drawFigure shoulder/uarm lines), gearFor sl/sr parts, real_gear.js shoulder plates
- grounding (fork): render.js new Renderer.prototype.buildGroundMap (end of file) + 1-line call before toonify, houses/walls sink+plinth and mantlet planks in buildStructures/buildSpecialStructures; realism.js terrain shader ground-map lines + post FXAA; stylized.js terrain ground-map lines + post FXAA
- brush-yy (fork): sim.js resolveMeleeHit brush entangle + block branch, unitAI yy hook (melee branch), new Sim.prototype.brushCatch/yyAI at end; test/zbrush.js
- emplace (fork): sim manE input/fire (siege section), render viewmodel emplacement hands + aim aid, main.js HUD for manning
- music fork: src/music.js (whole module), no sim
- ailoop (fork): sim.js AI fixes: unitAI targeting/ranged keep-range, steerFoot/nav, squad slot follow, mAggro, assaultDirs (not siegeDirs/ningyuan zones, not yuanyang roles)
- deeds (fork, restarted): NEW src/deeds.js (battle-behaviour record + campaign reactions, wraps zheEvent/zheHUD/zheKeyE/zheFinish/zTalk/JCH talk at load), build.sh splice list (+deeds.js), docs/reactions.md
- voice (fork): NEW src/voice.js (+build.sh lists after audio), render.js event switch 1-line VOICE.ev hook, main.js order-shout + credits panel hooks
- turnanim (fork): render.js drawFigure yaw smoothing + turn pose (twist/lean/pivot steps), horse neck lead
- downfall (fork): render.js drawFigure downed/crawl pose transition (dp/oy lines), zdown fall timing
- campLife (fork): sim.js camp NPC think (new Sim.prototype.campThink + 1 hook in unitAI), render.js drawFigure camp pose hook + new campPose fn, props
- melee-anim (fork): render.js POSES/KF attack keyframes, drawFigure attack pose/torso twist, viewmodel swing
- debug (fork): NEW src/debug.js; build.sh splice; sim.js Sim.prototype.mJump + one applyCommand case; tiny hooks main.js/zhe.js/jin.js/shenji.js
- cannonsnd (fork): audio.js cannon/explosion cases + new cannon helpers; render.js 'cannon'/'sgshot'/impact AUDIO lines
- pathing (fork): sim.js navPoint/flowTo + new Sim.prototype.navAstar/navPath/avoid/unstick near end; steerFoot hook; separation push lines
- arsenal (fork): sim.js new Sim.prototype.pk*/kit* at end + small hooks (kill → drop, E chain → pickup, swap/wsel → kit), render pickups, main HUD slots, zhe/jin/shenji arsenal hooks
