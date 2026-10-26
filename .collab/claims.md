# Claims: who is working where (add a line before you start, remove it when you finish)
- story-ch3: sim.js MISSIONS new key 'nyz' (Ningyuan story), zhe.js new Chapter 3 section appended at end, zhe.js menu Continue hook for ch3
- story-interlude (fork): sim.js MISSIONS.hunz forts/zones + new interlude mission, zhe.js ch1→ch2 flow, ch2 dialogue/intro cards

- story-road (fork): sim.js BATTLES.zroad + planTerrain/genMap zroad lines, MISSIONS roadA/roadB/roadC (inserted before ch3 nyz), setupMission one-line G.n trim hook + Sim.prototype.mTrim at end, zDown soft line; zhe.js new road block appended at end + routing lines in zStart/zheFinish/zMenu begin/INTRO2 end/zSleep2 end2
- jin-story (fork): NEW src/jin.js (Jin campaign); build.sh splice line (+jin.js); sim.js MISSIONS new keys jin1..jin4 appended before 'zcamp:' + setupCamp C.type/C.team (2 lines); zhe.js tiny roster hooks (ZB.R/ZC.R in SPEECH.nameOf, zTags, zGrid); render.js+real_gear.js one 'u.look.jin' branch before the Jin switch
- beacon-mode (fork): NEW src/beacon.js (sim side, loaded after sim.js) + NEW src/mode_beacon.js (UI, spliced into _mainfull); one-line hooks: sim.js missionThink top + applyCommand top; main.js startGame mode map + renderMenu fieldPanel; 01_head.html modeSeg button; build.sh script lists; docs/mode_beacon.md

- combat-loop (fork, took over antibunch+hitreact): sim.js line-fighting section, hitReact/hrTick, unitAI melee block, meleeHit/stamina hooks, render.js hit poses; this.xc only