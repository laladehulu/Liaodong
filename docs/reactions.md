# 功過 · How the story campaigns answer what you did

The three story campaigns (浙兵 · zhe.js, 八旗 · jin.js and 神機營 · shenji.js) keep a record of what *you*
did in each battle and answer it in camp, in the next battle, and on the roll. The code is in `src/deeds.js`,
which is spliced after jin.js and shenji.js and wraps the same entry points that jin.js wraps. It's client-side
and solo-only, so it never changes another player's sim.

Status: ✅ = implemented (iteration), ◻ = catalogue only.

## A. What is tracked (per battle, saved in `save.dd.log`)

| # | Action | How it's detected | Status |
|---|---|---|---|
| 1 | Kills (all) | `death` with `killer` = you | ✅1 |
| 2 | Killing men who were fleeing (cut down a running man) | victim's squad routing or the man fleeing at death | ✅1 |
| 3 | Club kills (gun turned round, `u.club`) | death with you holding `rifle` and `club` | ✅1 |
| 4 | Kick kills | death right after your `kickhit` | ✅1 |
| 5 | Officer and banner kills (a general, Bayara, 巴牙喇, captain) | victim is `hero`, `officer` or `shinsengumi` | ✅1 |
| 6 | Long shots (over 60 m) | your `shot` with a victim, over 60 m | ✅1 |
| 7 | Firing early (神機營: before fifty paces) | your `shot` while no enemy within 75 m | ✅1 |
| 8 | Holding fire to the last | first shot fired with an enemy inside 40 m | ✅1 |
| 9 | Blocks / parries (perfect blocks counted apart) | `block` by you | ✅1 |
| 10 | Getting a comrade on his feet (arm over shoulder) | `zhelp` by you | ✅1 |
| 11 | Reviving a downed comrade | `zrevive` by you | ✅1 |
| 12 | Bringing a man to the aid post | `zaid` by you | ✅1 |
| 13 | Standing over a downed friend under attack | within 2.5 m of a downed file man, enemy within 8 m | ✅1 |
| 14 | Holding your place in the file | within 7 m of your file while the enemy is within 25 m | ✅1 |
| 15 | Running / breaking (臨陣退縮) | over 18 m from the file, moving away, enemy close, unhurt | ✅1 |
| 16 | Breaking and then coming back (rally) | ran, then held again for 20 s | ✅1 |
| 17 | Charging alone / ahead of the line | over 12 m ahead toward the enemy, no file within 10 m | ✅1 |
| 18 | Last man standing in your file | every other file man down or dead while you fight on | ✅1 |
| 19 | Badly hurt (your lowest hp) | sampled | ✅1 |
| 20 | Falling (you die and go on as another man) | `zcarry` | ✅1 |
| 21 | Whom you fought beside the most | seconds within 4 m of each file man while fighting | ✅1 |
| 22 | Wounded comrades you left on the field | at the end: file men wounded, not helped, far from you | ✅1 |
| 23 | Reloading under fire (enemy inside 15 m) | `reload` by you near enemies | ✅1 |
| 24 | Picking things up off the field (banner, weapon) | `pickup` by you | ✅1 |
| 25 | Killing the man who cut down your comrade (avenging) | you kill the killer of a file man within 20 s | ✅1 |
| 26 | Saving a comrade: killing a man who was attacking a downed or hurt file man | victim's last target was a file man | ✅1 |
| 27 | Ladders cleared / pushed off (siege) | `sgladder` near you while you're on the wall | ✅1 |
| 28 | Fighting while badly wounded (under 30% hp, still killing) | kills while hp < 30% | ✅1 |
| 29 | Disobeying the retreat (staying when the phase says go) | phase with `extract`: time spent fighting over 30 m from the exit | ◻ |
| 30 | Taking a prisoner / sparing a man | needs a surrender state in the sim | ◻ |
| 31 | Looting the dead | needs a loot interaction | ◻ |
| 32 | Giving your water | camp interaction | ◻ |
| 33 | Returning to the field for someone (going back for a lost man) | moving away from the exit toward a downed file man in an extract phase | ✅1 |
| 34 | Protecting the levies or refugees | kills near allied non-file troops | ◻ |

## B. Reaction scenes (camp, staged, with choices)

| # | Scene | Trigger | Status |
|---|---|---|---|
| 1 | 慶功 · The men toast you at the fire, and you choose your reply (modest, boast, honour the dead) | high merit | ✅2 |
| 2 | 軍法 · Court-martial: brought before the officer for running, disobeying, firing early or leaving a man. You choose what to say; the men watch. Then 軍棍 beating (counted blows, screen hits), a fine, or pardon | demerit | ✅2 |
| 3 | 賞 · Promotion / reward: a 腰牌, a cup of wine, silver; the Jin get a share of spoils and the 巴圖魯 title; the 神機營 get a silver reward per the 號令 | big merit, notable kill | ✅2 |
| 4 | 綽號 · A nickname given at the fire through a camp joke; you laugh it off or protest | style-dominant action | ✅2 |
| 5 | 謝 · The man you got up or carried thanks you; he gives a keepsake you can take or refuse | helped / revived / aided | ✅3 |
| 6 | 問 · The friend or brother of a man you left behind confronts you; you choose answer: the truth, an excuse, or silence | left behind | ✅3 |
| 7 | 祭 · A small rite for the dead you couldn't carry: incense and paper money at the edge of camp (an E object); men join | dead of your file | ✅3 |
| 8 | 功過簿 · The roll: a book on a crate by your bedroll. Read it (E) to see every battle's merits, demerits and keepsakes | always | ✅1 |
| 9 | 債 · A debt repaid: the man you saved fights beside you in the next battle and calls it when he saves you | helped before | ✅4 |
| 10 | 比武 · A rival who thinks you're a coward (or who resents your praise) challenges you; accept, refuse or apologise | demerit or big praise | ✅5 |
| 11 | 教 · A new draft asks the veteran (you) to show him the drill; choose what to teach | you've survived two or more battles | ✅5 |
| 12 | 空鋪 · An empty bedroll kept for a man recovering in the aid tent, with a gift left on it | aided man | ✅3 |
| 13 | 家書 · The letter home: you dictate it (choose the lines); a reply comes in a later camp | end of each battle | ✅6 |
| 14 | 旗 · A captured banner or flag hung in camp | picked up a banner, killed an officer | ◻ |
| 15 | 俘 · A prisoner you took is brought to you to decide his fate | needs prisoners | ◻ |
| 16 | 飯 · Villagers or refugees you protected bring food | protecting refugees | ◻ |
| 17 | 疤 · A scar or bandage: your hands and face carry the last battle's wounds | badly hurt | ✅6 |

## C. In-battle reactions

| # | Reaction | Status |
|---|---|---|
| 1 | Comrades shout your name or nickname after your kills and blocks ("好！鐵壁！") | ✅4 |
| 2 | The man you saved stays at your side and calls out when he saves you (the debt) | ✅4 |
| 3 | When you charge ahead, the officer or chief shouts "跟上他！ Follow him!" (with merit), or "回來！ Get back in line!" (with demerit) | ✅4 |
| 4 | Trust carries over: a file that trusts you fights harder near you (morale and steadiness); one that doesn't hangs back and grumbles | ✅4 |
| 5 | The enemy marks a known killer: a "they know you" line, and they come for you | ◻ |
| 6 | Men refuse to follow you if you carry a demerit record (story leadership) | ◻ |

## Period grounding

- 戚繼光《紀效新書》 and 《練兵實紀》: the rules of reward and punishment (賞罰). Merit for kills and for rescuing a comrade (救援同伍). Death or beating with the 軍棍 for retreating without orders (臨陣退縮) and for abandoning one's file (失伍); the whole file punished when its leader is lost (連坐). Firing before the order is punished.
- 滿洲 military merit: 軍功 recorded and rewarded with captives and spoils, and the title 巴圖魯 (baturu) for bravery. Under Nurhaci's laws, those who retreated were executed or flogged (鞭).
- 神機營 regulations: fire only on the signal; misfiring or firing before the drum is punished; rewards in silver per head taken.
