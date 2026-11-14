# 人間 · Open world — plan, critique, first slice

## What the user asked
An open world in the late Ming where you live as a person of the time: anything people could do; official rank actually matters;
travel to Beijing; the keju; join the army; no UI, pure open world; the NPC world develops without you. Everything the story
campaigns have (camps, battles, people you know, choices, the dead) the open world should have too.
Choices made: a fixed start (a smith's son in a Liaodong village, spring 1618, the year Fushun falls); first paths deep:
**keju to office**, **join the army**, **court and Beijing**; days pass as you live (a day is minutes; the road takes days).

## Facts the design stands on
- Liaodong had no provincial exam of its own: from Jiajing 10 (1531) its candidates sat the **Shuntian (Beijing) 鄉試**, and
  from Wanli 37 (1609) five Shuntian places were reserved for Liaodong papers, marked 邊 (故宮博物院院刊, 明代遼東進士考述).
- 1618 is 戊午: a 鄉試 year (8th month, Beijing). 1619 己未: 會試 (2nd month) and 殿試 (3rd month) in Beijing — the same
  spring as Sarhu (3rd month, 1619). The exam path and the war collide in the first year.
- The 童試 (county / prefectural / education-commissioner exams) make a 生員; Liaodong's schools were the garrison 儒學
  (Liaoyang had the 遼東都司儒學).
- The war's calendar (Fushun 4/1618, Qinghe 7/1618, Sarhu 3/1619, Kaiyuan 6/1619, Tieling 7/1619, Shenyang and Liaoyang
  3/1621, Guangning 1/1622, Ningyuan 1/1626, Jisi 1629...) and the court's (Wanli dies 7/1620, Taichang's month, Tianqi,
  Wei Zhongxian's rise 1624-27, Chongzhen 8/1627) run whether or not you are there.

## Shape
- **Places**, each a 3D scene built on the existing maps and camp machinery: your village near Liaoyang, Liaoyang city (the
  Regional Commission, the 儒學, the recruiting yard, the market), Shenyang, the Shanhai Pass, Tongzhou, Beijing (the
  Shuntian exam hall 貢院, the Ministry of Personnel, the Meridian Gate). More later (Fushun, Kaiyuan, Guangning, the
  islands...). Places change with history: Fushun is Jin after 4/1618; Liaoyang falls in 1621 and its people with it.
- **Roads**: walk out of a place by its road and the days pass on the road (a short card, no menu): Village↔Liaoyang one
  day, Liaoyang→Shanhai Pass nine, the Pass→Beijing five.
- **The clock**: a day in a place runs ~6 minutes; dusk sends people home; you sleep where you lodge (home, an inn, a
  barracks, the exam cell). The world advances a day at a time: history's events fire on their dates, people move, rise,
  fall and die, prices change, the news travels (people talk about what has happened, a few days late, further away later).
- **People**: real men in their real posts (the Wanli Emperor, Fang Congzhe, Yang Hao, Du Song, Liu Ting, Li Rubai, Ma Lin,
  Xiong Tingbi, Yuan Yingtai, Wang Huazhen, Sun Chengzong, Yuan Chonghuan, Mao Wenlong, Wei Zhongxian, Nurhaci, Hong
  Taiji...) found where history had them, plus the ordinary people of each place (your family, the teacher, the smith's
  customers, clerks, soldiers, innkeepers) with homes, work and a daily round.
- **You**: a name, an age, a family, money (copper cash and silver), learning, arms, health, standing (功名: none → 童生
  → 生員 → 舉人 → 進士) and office or rank (九品..一品; army: 兵 → 小旗 → 總旗 → 百總 → 把總 → 千總...).
  **Rank matters**: who bows to whom (a commoner kneels to an official; a 生員 need not), where you may go (the Regional
  Commission's hall, the exam hall, the Meridian Gate), who will see you, what you may order, what you are paid, and what
  happens to you when things go wrong (a 生員 cannot be beaten in court without being stripped first).
- **No UI**: you see people and things; E on a person talks, E on a thing uses it (the forge, a book, a desk, a bed, a gate,
  a notice board). Words come out of mouths. The only text panels are the conversation and the exam paper. A corner date
  and place appear when you arrive or wake, then fade.
- **Paths, first slice**
  - *Keju*: study (the village teacher, books, the 儒學 in Liaoyang); the 童試 in Liaoyang (2nd-4th month); to Beijing for
    the Shuntian 鄉試 (8th month 1618 for a precocious few; else 1621); the 會試 and 殿試 in Beijing; the exam is sitting
    in a cell and writing (a paper built from real Four Books passages, judged on learning and on how you read them); the
    list (榜) goes up on a wall days later; a jinshi waits on the Ministry of Personnel for a post.
  - *Army*: enlist at the recruiting yard in Liaoyang (1618-19, the levy for Sarhu) or join a passing company; camp life as
    in the story campaigns (your file, its people, the night before); when history's battle comes and you are with that army,
    you fight it with the battle engine (Sarhu, Kaiyuan, the Hun River, Liaoyang...). Heads and conduct raise you; defeat,
    flight, wounds and death are as real as in the campaigns.
  - *Court and Beijing*: officials go to the dawn audience; with rank you may enter, memorialise, be summoned; without it
    you watch from the street. Eunuchs, factions and the Emperor change with the reigns.

## Critique (and what the first slice does about it)
1. *"Anything they can do" has no bottom.* — Build systems, not scripts: places, people with roles and rounds, things you
   can use, a clock and a calendar. Each later "thing to do" is a small addition to those, not a new mode.
2. *A seamless world is beyond this engine* (a field is 300 m). — Places joined by roads, with time passing on the road, is
   faithful to how far everything was (Liaoyang to Beijing was weeks) and costs nothing to load.
3. *History running without you can go flat* (things happen off-screen and you never feel it). — News: every event is
   carried by people with a delay by distance; places visibly change (refugees, troops, a burnt town, new faces in posts).
4. *Rank that only changes a number is not rank.* — It changes bows, doors, who answers you, what you can order and what
   can be done to you; it is visible on your clothes (the official's hat and badge).
5. *"No UI" fights clarity.* — Prompts appear only on what you look at; the conversation panel is the one text panel;
   the exam is a paper on a desk. A journal (J) for those who want it, off by default.
6. *The exam as a quiz is dull.* — The paper is real passages and real orthodox/heterodox readings; learning makes good
   options appear and caps how well you write; the 1618 quota (5 邊 places) makes it a long shot for the first years.
7. *The army path must not replay the story campaigns' text.* — Same machinery (camps, files, battles), different people:
   the open world's file is made up of the people you knew, met and enlisted with.
8. *Scope creep will sink it.* — First slice: 6 places, 40 historical people, the calendar 1618-1621, the three paths to
   their first stage (生員 / 舉人; enlist and fight Sarhu; see the court). Then iterate.
