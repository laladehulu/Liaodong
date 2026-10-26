# Claims: who is working where (add a line before you start, remove it when you finish)
- story-ch3: sim.js MISSIONS new key 'nyz' (Ningyuan story), zhe.js new Chapter 3 section appended at end, zhe.js menu Continue hook for ch3
- story-interlude (fork): sim.js MISSIONS.hunz forts/zones + new interlude mission, zhe.js ch1→ch2 flow, ch2 dialogue/intro cards

- story-road (fork): sim.js BATTLES.zroad + planTerrain/genMap zroad lines, MISSIONS roadA/roadB/roadC (inserted before ch3 nyz), setupMission one-line G.n trim hook + Sim.prototype.mTrim at end, zDown soft line; zhe.js new road block appended at end + routing lines in zStart/zheFinish/zMenu begin/INTRO2 end/zSleep2 end2

- combat-loop (fork, took over antibunch+hitreact): sim.js line-fighting section, hitReact/hrTick, unitAI melee block, meleeHit/stamina hooks, render.js hit poses; this.xc only- shenji2 (fork): src/shenji.js (ch4 sj4, ch5 sj5, per-man looks, chief line fallback, cannon FX); minimal render/zhe hooks
- jin-story2 (fork): src/jin.js (jin1-4 fixes, new jin5/jin6/jin7), tiny guarded render hooks (banner colour, kneel)
- beijing fork: sim.js BATTLES.bjgate + planTerrain/genMap bjgate lines; render.js buildBeijing (new prototype) + 1-line call in buildStructures; shenji.js sj2 battle key
- sj-ambush (fork): shenji.js new mission sjamb in <sj-missions> + flow lines; sim.js BATTLES new key 'sjvil' (+planTerrain/genMap lines if needed)
- aidpost (fork): sim.js zCrawl/woundedAI/aiMedic + new Sim.prototype.aidPost/orderlyAI/zAid at wounded section, 1-line unitAI orderly hook; render.js carry viewmodel + aided/carried poses (guarded); main.js/zhe.js goal line + hudMarks aid marker
- shoulders (fork): render.js drawFigure shoulder/uarm + gear sl/sr parts, real_gear.js shoulder plates
- grounding (fork): render.js new Renderer.prototype.buildGroundMap (end of file) + 1-line call before toonify, houses/walls sink+plinth and mantlet planks in buildStructures/buildSpecialStructures; realism.js terrain shader ground-map lines + post FXAA; stylized.js terrain ground-map lines + post FXAA
- brush-yy (fork): sim.js resolveMeleeHit brush entangle + block branch, unitAI yy hook (melee branch), new Sim.prototype.brushCatch/yyAI at end; test/zbrush.js
- emplace (fork): sim manE input/fire (siege section), render viewmodel emplacement hands + aim aid, main.js HUD for manning
- music fork: src/music.js (whole module), no sim
