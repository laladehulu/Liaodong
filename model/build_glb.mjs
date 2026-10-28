// Builds model/man.glb for the Model/ experiment from Quaternius's Universal Animation Library (CC0 1.0):
// the male mannequin (65-bone humanoid rig) from UAL1, and the clips the game needs from UAL1 and UAL2 (same rig, joints matched by name).
// Run where @gltf-transform/core and /functions (v4) are installed:
//   node build_glb.mjs <UAL1.glb> <UAL2.glb> <out.glb>
// Source: https://quaternius.com/packs/universalanimationlibrary.html (CC0); mirror used: github.com/tilakpatell/tilakverse-assets
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, prune, dedup, resample, unpartition } from '@gltf-transform/functions';
const [a1, a2, out] = process.argv.slice(2);
// every clip the game's states map onto (see model/index.html ANIMS for the mapping)
const KEEP = new Set([
  // UAL1
  'Idle_Loop', 'Idle_LookAround_Loop', 'Idle_Tired_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jog_Bwd_Loop', 'Jog_Left_Loop', 'Jog_Right_Loop',
  'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Crawl_Fwd_Loop', 'Crawl_Idle_Loop', 'Death01', 'Death02', 'Dodge_Left', 'Dodge_Right',
  'Hit_Chest', 'Hit_Head', 'Hit_Shoulder_L', 'Hit_Shoulder_R', 'Hit_Stomach', 'Kick', 'PickUp_Kneeling', 'Roll',
  'Sword_Attack', 'Sword_Attack_Standing', 'Sword_Idle', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Celebration', 'Fixing_Kneeling', 'GroundSit_Idle_Loop',
  'Punch_Jab', 'Push_Loop',
  // UAL2
  'Sword_Block', 'Sword_Light_A', 'Sword_Light_A_Rec', 'Sword_Light_B', 'Sword_Light_B_Rec', 'Sword_Light_C', 'Sword_Light_C_Rec',
  'Sword_Regular_A', 'Sword_Regular_A_Rec', 'Sword_Regular_B', 'Sword_Regular_B_Rec', 'Sword_Regular_C', 'Sword_Regular_Combo',
  'Sword_Heavy_A', 'Sword_Heavy_A_Rec', 'Sword_Heavy_B', 'Sword_Heavy_B_Rec', 'Sword_Heavy_Combo', 'Sword_Light_Combo', 'Sword_Dash', 'Sword_UpperCut',
  'Idle_Shield_Loop', 'Idle_Shield_Break', 'Shield_Dash', 'Shield_OneShot', 'Sprint_Shield_Loop',
  'Bow_Aim_Neutral', 'Bow_Notch', 'Bow_Shoot', 'Hit_Knockback', 'Bandage_Loop', 'KipUp', 'IdleToLay', 'LayToIdle',
  'Walk_Fwd_Loop', 'Walk_Bwd_Loop', 'Walk_L_Loop', 'Walk_R_Loop', 'Turn180_L', 'Melee_Knee', 'OverhandThrow', 'Idle_FoldArms_Loop', 'Yes', 'Surprise',
]);
const io = new NodeIO();
// disposing an Animation leaves its samplers alive, and they hold their keyframe accessors: take the whole clip apart
const killAnim = (a) => { const accs = new Set(); for (const sm of a.listSamplers()) { accs.add(sm.getInput()); accs.add(sm.getOutput()); } for (const c of a.listChannels()) c.dispose(); for (const sm of a.listSamplers()) sm.dispose(); a.dispose(); for (const x of accs) if (x && x.listParents().every(p => p.propertyType === 'Root')) x.dispose(); };
const d1 = await io.read(a1), d2 = await io.read(a2);
const root1 = d1.getRoot(); const names1 = new Set(root1.listAnimations().map(a => a.getName()));
for (const a of d2.getRoot().listAnimations()) if (names1.has(a.getName())) killAnim(a); /* the same name in both: keep UAL1's */
mergeDocuments(d1, d2);
// the merged UAL2 scene brought its own mannequin: point its clips at UAL1's joints (same names), then drop its scene
const byName = new Map(); const first = root1.listScenes()[0];
first.traverse(n => byName.set(n.getName(), n));
const own = new Set(); first.traverse(n => own.add(n));
for (const anim of root1.listAnimations()) for (const ch of anim.listChannels()) { const n = ch.getTargetNode(); if (n && !own.has(n)) { const m = byName.get(n.getName()); if (m) ch.setTargetNode(m); else ch.dispose(); } }
for (const s of root1.listScenes()) if (s !== first) s.dispose();
for (const anim of root1.listAnimations()) if (!KEEP.has(anim.getName())) killAnim(anim);
// bones keep their length and size in every clip: only the root and the pelvis move as well as turn. Dropping the other
// translation and every scale track halves the file (each track is a JSON object as well as its keys)
let dropped = 0;
for (const anim of root1.listAnimations()) for (const ch of anim.listChannels()) { const path = ch.getTargetPath(), nm = ch.getTargetNode() && ch.getTargetNode().getName();
  if (path === 'scale' || (path === 'translation' && nm !== 'root' && nm !== 'pelvis')) { const sm = ch.getSampler(); ch.dispose(); if (sm && sm.listParents().every(p => p.propertyType !== 'AnimationChannel')) { const i = sm.getInput(), o = sm.getOutput(); sm.dispose(); for (const x of [i, o]) if (x && x.listParents().every(p => p.propertyType === 'Root')) x.dispose(); } dropped++; } }
console.log('tracks dropped', dropped);
for (const m of root1.listMeshes()) for (const p of m.listPrimitives()) { const uv1 = p.getAttribute('TEXCOORD_1'); if (uv1) p.setAttribute('TEXCOORD_1', null); }
await d1.transform(prune(), dedup(), resample({ tolerance: 0.0008 }), prune(), unpartition());
// resample leaves the keyframes it replaced in the document, and prune does not catch all of them: drop every accessor nothing uses
let orphans = 0; for (const acc of root1.listAccessors()) { if (acc.listParents().every(p => p === root1)) { acc.dispose(); orphans++; } }
await d1.transform(unpartition());
console.log('orphaned accessors dropped', orphans);
const missing = [...KEEP].filter(n => !root1.listAnimations().some(a => a.getName() === n));
await io.write(out, d1);
console.log('clips', root1.listAnimations().length, 'missing', missing.join(',') || 'none');
