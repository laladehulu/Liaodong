# Claims: who is working where (add a line before you start, remove it when you finish)
- story-ch3: sim.js MISSIONS new key 'nyz' (Ningyuan story), zhe.js new Chapter 3 section appended at end, zhe.js menu Continue hook for ch3
- story-interlude (fork): sim.js MISSIONS.hunz forts/zones + new interlude mission, zhe.js ch1→ch2 flow, ch2 dialogue/intro cards

- story-road (fork): sim.js BATTLES.zroad + planTerrain/genMap zroad lines, MISSIONS roadA/roadB/roadC (inserted before ch3 nyz), setupMission one-line G.n trim hook + Sim.prototype.mTrim at end, zDown soft line; zhe.js new road block appended at end + routing lines in zStart/zheFinish/zMenu begin/INTRO2 end/zSleep2 end2

- combat-loop (fork, took over antibunch+hitreact): sim.js line-fighting section, hitReact/hrTick, unitAI melee block, meleeHit/stamina hooks, render.js hit poses; this.xc only- shenji2 (fork): src/shenji.js (ch4 sj4, ch5 sj5, per-man looks, chief line fallback, cannon FX); minimal render/zhe hooks
- jin-story2 (fork): src/jin.js (jin1-4 fixes, new jin5/jin6/jin7), tiny guarded render hooks (banner colour, kneel)
- main: crawl for downed men (sim woundedAI downed branch)
- beijing fork: sim.js BATTLES.bjgate + planTerrain/genMap bjgate lines; render.js buildBeijing (new prototype) + 1-line call in buildStructures; shenji.js sj2 battle key
