# Claims: who is working where (add a line before you start, remove it when you finish)
- story-ch3: sim.js MISSIONS new key 'nyz' (Ningyuan story), zhe.js new Chapter 3 section appended at end, zhe.js menu Continue hook for ch3
- story-interlude (fork): sim.js MISSIONS.hunz forts/zones + new interlude mission, zhe.js ch1→ch2 flow, ch2 dialogue/intro cards

- antibunch (fork): sim.js unitAI melee block (~1380-1420), xcToken, new Sim.prototype.lineAI/attack-space helpers near end; this.xc only
- hitreact (fork): sim.js new Sim.prototype.hitReact/hrTick at end, one-line hooks in meleeHit (flinch line + block line), shot/arrow flinch lines, startWindup guard, per-unit tick line; render.js drawFigure hit-pose offsets + FP viewmodel/cam kick; this.xc only
- story-road (fork): sim.js BATTLES.zroad + planTerrain/genMap zroad lines, MISSIONS roadA/roadB/roadC (inserted before ch3 nyz), setupMission one-line G.n trim hook + Sim.prototype.mTrim at end, zDown soft line; zhe.js new road block appended at end + routing lines in zStart/zheFinish/zMenu begin/INTRO2 end/zSleep2 end2
- stylize fork: new src/stylized.js, build.sh (style outputs), publish.py, Liaodong/index.html card; tiny MING_STYLE guards in realism.js
- shenji (fork): NEW src/shenji.js (spliced in build.sh after zhe.js), sim_missions.js or sim.js new MISSIONS keys sj1/sj2/sj3 + BATTLES keys, small generalising hooks in zhe.js (save key/roster indirection), main menu button
- jin-story (fork): NEW src/jin.js (Jin campaign); build.sh splice line (+jin.js); sim.js MISSIONS new keys jin1..jin4 appended before 'zcamp:' + setupCamp C.type/C.team (2 lines); zhe.js tiny roster hooks (ZB.R/ZC.R in SPEECH.nameOf, zTags, zGrid); render.js+real_gear.js one 'u.look.jin' branch before the Jin switch
- main: assault field cap (sim.js setupMission ass block + assaultThink)
- siegefix (fork): sim.js shot/arrow vs wall boxes, wall-top movement/fall; render.js siege engine interpolation
