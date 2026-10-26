# 烽火 · Hold the Beacon (墩台守望)

A co-op wave-defence mode (1–4 players) on a Liaodong border tower, 1618.

## Candidates considered
1. **夜不收 scout raid**: a small team behind Jin lines, stealth, then extraction. It's novel, but it needs new systems (sight cones, detection, alarms) that don't exist yet. Too risky to do well in one go.
2. **Grain convoy escort**: ox carts on a road under attack. It fits the wagons and road map, but moving carts need new path and collision code, and the loop stays linear.
3. **烽火 · Hold the Beacon**: hold a fortified 墩台 against escalating raid waves, buy men with silver between waves, and light the signal fires that bring the relief. **Chosen.** It reuses almost everything: the mission groups and waves, AI generals, squads and commands, zones and capture, palisades, campaign respawn and spare companies. It adds a real decision loop (fight, then spend and signal), replays well, plays co-op naturally, and has a strong period hook.

## Historical grounding
- The Ming built the Liaodong border wall (遼東邊牆) and lined it with 墩台: solid rammed-earth signal towers held by a handful of 墩軍.
- When raiders were sighted, a tower fired a signal gun and raised smoke by day or fire by night. The number of fires told the next tower down the line how many raiders were coming, and the alarm ran to the garrison towns.
- In 1618 Nurhaci's raids opened the war: Fushun fell in the fourth month, Qinghe in the seventh. The towers on the frontier were the first to meet them.

## Goals
Hold the tower and raise **five fires**. Liaoyang then sends its cavalry. Survive the final assault until the relief rides in, and break it.

## Loop
1. **Lull** (30 s, the first is 40 s): the golden line says *Light the next fire: stand at the stoves*. Stand at the row of five stoves by the north wall for 3 s to light the next one; only one fire can be lit per lull. Spend silver with **I** (the quartermaster): hire spearmen, musketeers, a duck team, three-eyed gunners, iron cavalry, a nest of bees, or mend your men.
2. **Wave**: Jin raiders come from the north, east and west, getting heavier each time (Mongol scouts, then armoured bannermen, horse raids, Bayara and grenadiers). Each kill pays silver, and so does each wave you break. The raiders are a fixed set of bands that come back with fresh men, so the unit count stays bounded. A raid that stalls for 3 minutes draws off. The Jin also take the tower if they stand in it three to one for 20 s.
3. After the 5th fire, the next wave is **the final assault**, led by a Beile. Forty seconds in, the Guanning relief arrives from the south.

## Win and lose
- **Win:** break the final assault.
- **Lose:** the Jin take the tower compound (the zone flips), or 7 regular waves pass and the 5th fire still isn't lit ("no signal reached Liaoyang").

## Controls (on top of the normal campaign controls: F follow, C charge, H hold, O overview)
- **I**: open or close the quartermaster.
- **1–7**: buy while it's open (7 mends your men). **8** (Ready) calls the next raid early once this lull's fire burns. Esc closes it.
- Lighting a fire is just standing at the stoves.

## UI
- A small top-centre beacon bar: five flame pips, silver, and the wave number.
- One golden action line under it, e.g. *Light the 3rd fire at the stoves · 0:21* / *Hold the tower · 14 raiders left*.
- Smoke columns rise from the lit stoves in the 3D scene.

## Co-op
Each player leads their own companies. The silver purse is shared, and anyone can buy (the companies go to the buyer). With 2 or more players, each wave brings an extra raiding party.
