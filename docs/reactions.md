# 功過 · How the story campaigns answer what you did

The three story campaigns (浙兵 · zhe.js, 八旗 · jin.js, 神機營 · shenji.js) keep a record of what *you* did in each
battle and answer it: in camp, in the next battle, in what people say and what lies on your bedroll. The code is
`src/deeds.js`, spliced last into the main script; it wraps the shared story entry points (zheEvent, zheHUD,
zheKeyE, zheFinish, zTalk and the Jin chapter talk tables). It is client-side and story-only (solo), so it never
changes a co-op sim.

Status marks: ✅n = implemented in iteration n · ◻ = backlog.

## A. What the game notices (per battle, `save.dd.log`)

| # | Action | Detected by | Status |
|---|---|---|---|
| 1 | Kills | `death`, killer = you | ✅1 |
| 2 | Cutting down men who were running | victim's squad routing / fleeing | ✅1 |
| 3 | Club kills (gun turned round) | kill while `club` | ✅1 |
| 4 | Kick kills | kill within 0.6 s of your `kickhit` | ✅1 |
| 5 | Officer / Bayara / guard kills | victim hero, officer or shinsengumi | ✅1 |
| 6 | Long shots (over 60 m) | your `shot` hitting a man far off | ✅1 |
| 7 | Firing too early (no enemy inside 75 m) | your `shot` | ✅1 |
| 8 | Holding fire to close range (first shot with enemy inside 40 m) | your first `shot` | ✅1 |
| 9 | Blocks | `block` by you | ✅1 |
| 10 | Getting a comrade up (arm over shoulder) | `zhelp` by you | ✅1 |
| 11 | Reviving a downed comrade | `zrevive` by you | ✅1 |
| 12 | Bringing a man to the aid post | `zaid` by you | ✅1 |
| 13 | Standing over a downed friend with the enemy close | sampled | ✅1 |
| 14 | Holding your place in the file under threat | sampled | ✅1 |
| 15 | Running from the fight | sampled: far from the file, moving away from the enemy, unhurt | ✅1 |
| 16 | Running and then coming back (rally) | sampled | ✅1 |
| 17 | Charging alone, far ahead of the file | sampled | ✅1 |
| 18 | Last man standing in your file | sampled | ✅1 |
| 19 | Badly hurt (lowest hp) | sampled | ✅1 |
| 20 | Falling and going on as another man | `zcarry` | ✅1 |
| 21 | Whom you fought beside | seconds within 4 m of each file man under threat | ✅1 |
| 22 | Wounded comrades left on the field | at the end of the battle | ✅1 |
| 23 | Reloading with the enemy close | `reload` by you | ✅1 |
| 24 | Picking something up off the field | `pickup` by you | ✅1 |
| 25 | Avenging: killing the man who killed a comrade | death bookkeeping | ✅1 |
| 26 | Saving a comrade: killing the man attacking a hurt or downed file man | victim's target | ✅1 |
| 27 | Pushing a ladder off the wall | `sgpush` by you | ✅1 |
| 28 | Fighting on badly wounded (kills under 30% hp) | kill while hurt | ✅1 |
| 29 | Going back for a man while the column falls back (extract phase) | `zhelp` in an extract phase | ✅1 |
| 30 | First kill of the file (first blood) | first kill of the battle by anyone in your file | ✅1 |
| 31 | Shielding: blocks while a downed or hurt comrade is right behind you | `block` + proximity | ✅1 |
| 32 | Kills with the comrade you trust most beside you | kill + beside | ◻ |
| 33 | Taking a prisoner / sparing a man | needs a surrender state | ◻ |
| 34 | Looting the dead | needs a loot interaction | ◻ |
| 35 | Protecting the levies or refugees | kills near allied non-file troops | ◻ |

## B. Brainstorm: ways the world answers (50+), scored

Scores 1–5: **F**un, **P**ersonal, **I**nteractive, **N**ovel, **H**istorical fit, **E**asy (feasibility). Sum ranks the backlog.

| # | Idea | Shape | F | P | I | N | H | E | Σ | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Men talk about specific moments ("you pulled me up by the bridge") | talk | 4 | 5 | 3 | 3 | 4 | 5 | 24 | ✅1 |
| 2 | 功過簿 · the merit roll by your bedroll, readable with E | object/info | 3 | 4 | 3 | 3 | 5 | 5 | 23 | ✅1 |
| 3 | Deeds on the result screen, one short line each | info | 3 | 4 | 1 | 2 | 3 | 5 | 18 | ✅1 |
| 4 | A man who saw you run turns his back / won't talk | systemic/talk | 4 | 5 | 2 | 4 | 4 | 4 | 23 | ✅1 |
| 5 | 慶功 · toast at the fire, choose your reply (modest / boast / for the dead) | scene | 4 | 4 | 4 | 3 | 4 | 4 | 23 | ✅2 |
| 6 | 軍法 · court-martial for running / firing early / leaving a man; choose what to say; 軍棍 beating with counted blows | scene | 5 | 5 | 4 | 4 | 5 | 4 | 27 | ✅2 |
| 7 | 謝 · the man you carried thanks you and offers a keepsake (take / refuse) | scene/object | 4 | 5 | 4 | 3 | 4 | 4 | 24 | ✅2 |
| 8 | 問 · a friend of the man you left confronts you (truth / excuse / silence) | scene | 5 | 5 | 4 | 4 | 4 | 4 | 26 | ✅2 |
| 9 | 綽號 · the file gives you a nickname from your style; the nickname is then shouted in battle | systemic/scene | 5 | 5 | 2 | 4 | 4 | 4 | 24 | ✅2 |
| 10 | Comrades shout your name/nickname after your kills and blocks | in-battle | 4 | 4 | 1 | 3 | 4 | 5 | 21 | ✅3 |
| 11 | "Follow him!" or "Get back in line!" from the chief when you charge ahead, depending on your record | in-battle | 4 | 4 | 2 | 4 | 5 | 4 | 23 | ✅3 |
| 12 | Trust: a file that trusts you holds steadier near you; a file that doesn't wavers | systemic | 4 | 4 | 2 | 5 | 4 | 3 | 22 | ✅3 |
| 13 | The debt: the man you saved shadows you next battle and calls it when he saves you | systemic/in-battle | 5 | 5 | 2 | 5 | 3 | 3 | 23 | ✅3 |
| 14 | The enemy marks a known killer ("that's the one!") and comes for you | in-battle | 4 | 3 | 2 | 4 | 3 | 4 | 20 | ✅3 |
| 15 | A captured banner / officer's 令旗 hung in camp | object | 3 | 3 | 1 | 2 | 4 | 4 | 17 | ✅4 |
| 16 | An empty bedroll kept for the man you got to the aid post, with a gift left on it | object | 4 | 5 | 2 | 4 | 3 | 4 | 22 | ✅4 |
| 17 | 祭 · paper money and incense for the dead you couldn't carry; E to light it; men join you | object/scene | 4 | 5 | 3 | 3 | 5 | 4 | 24 | ✅4 |
| 18 | Scars and bandages on your character after a bad battle | visual | 3 | 4 | 1 | 3 | 3 | 3 | 17 | ✅4 |
| 19 | 家書 · dictate the letter home, choosing lines that come from what you did; a reply comes later | scene | 4 | 5 | 4 | 4 | 4 | 4 | 25 | ✅5 |
| 20 | Rumours: what you did spreads through camp and gets bigger (or meaner) with each telling | info/systemic | 4 | 4 | 2 | 5 | 4 | 4 | 23 | ✅5 |
| 21 | Cross-campaign echoes: a Zhejiang man's deed is told as a story by a Jin bannerman ("the shield man at Abdali who…") | info | 4 | 4 | 1 | 5 | 4 | 4 | 22 | ✅5 |
| 22 | 比武 · a rival challenges you (coward rumour or envy); a short sparring match in camp | scene/playable | 5 | 4 | 5 | 3 | 4 | 3 | 24 | ◻ |
| 23 | Camp game: dice / 象棋 where opponents play scared or cocky depending on your name | playable | 4 | 3 | 5 | 4 | 4 | 2 | 22 | ◻ |
| 24 | Officer's test: a dangerous errand offered to the man with the best (or worst) record | playable | 5 | 4 | 5 | 4 | 4 | 2 | 24 | ◻ |
| 25 | The outing: the man you saved invites you foraging; something goes wrong; you protect him | playable | 5 | 5 | 5 | 4 | 4 | 2 | 25 | ◻ |
| 26 | Night watch shared with the man who trusts you most; what he confesses depends on your record | scene | 4 | 5 | 3 | 4 | 4 | 3 | 23 | ◻ |
| 27 | A letter arrives for a dead man; read it, burn it, or keep it for his family | scene | 4 | 5 | 4 | 4 | 4 | 4 | 25 | ✅5 |
| 28 | Your weapon gets notched and named after its deeds ("Old Notch" 缺口刀) in the HUD and talk | object | 4 | 4 | 1 | 4 | 3 | 4 | 20 | ✅4 |
| 29 | Camp mood: songs after a good fight, silence after a bad one, a fist-fight if someone ran | systemic/visual | 4 | 3 | 1 | 4 | 4 | 4 | 20 | ◻ |
| 30 | The new draft is put next to you on purpose because you are steady (or kept away) | systemic | 3 | 4 | 1 | 4 | 4 | 4 | 20 | ◻ |
| 31 | Men copy you: if you hold fire, the file holds better next time; if you fire early, they do too | systemic | 4 | 3 | 2 | 5 | 4 | 3 | 21 | ◻ |
| 32 | A prisoner you took is brought to you to decide his fate | scene | 5 | 4 | 4 | 4 | 4 | 2 | 23 | ◻ |
| 33 | Villagers or refugees you protected bring food to the fire | scene | 3 | 3 | 2 | 3 | 4 | 3 | 18 | ◻ |
| 34 | Promotion to 伍長 / file chief with a 腰牌; you then give the orders at the next drill | scene/systemic | 4 | 4 | 3 | 3 | 5 | 3 | 22 | ✅2 |
| 35 | Demotion: your 腰牌 taken away in front of the men | scene | 4 | 4 | 2 | 3 | 5 | 4 | 22 | ✅2 |
| 36 | The 連坐 rule: the whole file punished for your running; the men's faces at the fire | scene/systemic | 5 | 5 | 2 | 5 | 5 | 3 | 25 | ✅2 |
| 37 | A man who fears you after he saw you cut down the running keeps his distance in camp and battle | systemic | 4 | 4 | 1 | 5 | 4 | 3 | 21 | ✅1 |
| 38 | A wounded man you left survives and comes back to camp later; the meeting | scene | 5 | 5 | 3 | 5 | 3 | 3 | 24 | ◻ |
| 39 | Sworn brotherhood (結拜) after saving the same man twice or being saved by him | scene | 5 | 5 | 4 | 4 | 4 | 3 | 25 | ◻ |
| 40 | The chief asks your advice before the next battle if your record is good | talk/systemic | 4 | 4 | 4 | 4 | 3 | 4 | 23 | ◻ |
| 41 | Dreams after a hard battle (shame if you abandoned men; grief; fear; home) | playable vignette | 5 | 5 | 3 | 5 | 4 | 2 | 24 | ◻ (backlog by request) |
| 42 | Your kills tallied in the Jin way: ears/heads counted for 軍功, share of spoils; the 巴圖魯 title | scene | 4 | 4 | 3 | 4 | 5 | 4 | 24 | ✅2 |
| 43 | 神機營 silver per head and fines for wasted powder, paid at the pay table | scene | 3 | 3 | 3 | 3 | 5 | 4 | 21 | ✅2 |
| 44 | The cook gives the brave the meat and the cowards the scraps | scene | 3 | 4 | 2 | 4 | 4 | 4 | 21 | ◻ |
| 45 | Children in a village play "you" in a mock battle | scene | 3 | 4 | 1 | 5 | 3 | 2 | 18 | ◻ |
| 46 | A storyteller (說書) in a market town tells a twisted version of your deed | scene | 4 | 4 | 1 | 5 | 4 | 3 | 21 | ◻ |
| 47 | The enemy campaign's camp tells of you by your nickname ("the iron-wall shield man") | echo | 4 | 4 | 1 | 5 | 4 | 4 | 22 | ✅5 |
| 48 | Your squadmates ask you to teach them the trick you did (a parry, a club strike) | talk | 3 | 4 | 3 | 3 | 4 | 4 | 21 | ◻ |
| 49 | A grudge: the man whose friend you left won't cover you in the next fight | systemic | 4 | 5 | 1 | 5 | 4 | 3 | 22 | ◻ |
| 50 | The officer's 令旗 you grabbed is demanded back; return it or keep it | scene | 3 | 3 | 3 | 3 | 4 | 3 | 19 | ◻ |
| 51 | Cups of wine poured at an empty place for each man who died beside you | object | 3 | 5 | 2 | 3 | 5 | 4 | 22 | ◻ |
| 52 | Your hands shake: aim sway grows for a battle after a near death (until a quiet night) | systemic | 3 | 4 | 1 | 5 | 3 | 4 | 20 | ◻ |
| 53 | A prayer at a roadside shrine for the man you saved; he adds a stick of incense too | scene | 3 | 4 | 3 | 3 | 5 | 3 | 21 | ◻ |
| 54 | The file sings a marching song made up about you | scene | 4 | 4 | 1 | 5 | 3 | 3 | 20 | ◻ |
| 55 | You inherit a dead friend's place in the formation and his job (his brush, his shield) | systemic | 4 | 5 | 2 | 4 | 4 | 2 | 21 | ◻ |

## C. Period grounding

- 戚繼光《紀效新書》《練兵實紀》: reward and punishment (賞罰). Merit for kills and for rescuing a comrade (救援同伍); death or the
  軍棍 for retreating without orders (臨陣退縮) and abandoning one's file (失伍); the whole file punished when it fails its leader
  (連坐). Firing before the order is punished.
- 滿洲: 軍功 counted and rewarded with captives and spoils; the title 巴圖魯 (baturu) for bravery; under Nurhaci's laws, men who
  retreated were flogged or executed.
- 神機營: fire only on the signal; wasted powder and firing before the drum punished; silver rewards per head.

## D. Iteration log

(see the end of this file; each iteration adds a short entry)
