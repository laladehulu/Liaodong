# Model lab

Stylized cut-block soldiers on a full 65-bone rig, with armor that cannot clip.

- `man.glb`: the rig and 80 animations from Quaternius's Universal Animation Library 1 and 2 (CC0), cut down by `build_glb.mjs` (`node build_glb.mjs UAL1.glb UAL2.glb man.glb`, needs @gltf-transform v4). The mannequin mesh in it only lends its skeleton.
- `lab.js`: everything else, built in the page. Each bone carries rigid chamfered blocks (weight 1, so nothing stretches). Armor is the same blocks grown by its thickness, so a covered body block sits strictly inside its armor block on the same bone in every pose. Helmets, the painted faces, hand poses (fist, relaxed, point), spear IK, the pointing charge order and the gait blend are all here.
- `three.min.js`, `GLTFLoader.js`, `SkeletonUtils.js`, `OrbitControls.js`: three.js r128 (MIT).
- Headless check: `python3 -m http.server 8765 -d model` then `node test/model_shot.js test/out 8765`.
