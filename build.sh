#!/bin/bash
set -e
# one build at a time: parallel agents share dist/
exec 9>/tmp/ming-build.lock; flock -w 300 9
cd "$(dirname "$0")"
mkdir -p dist
# career.js shares main.js's scope: splice it in before main's closing line
python3 -c "m=open('src/main.js').read().rstrip(); assert m.endswith('})();'); open('src/_mainfull.js','w').write(m[:-5]+'\n'+open('src/career.js').read()+'\n'+open('src/zhe.js').read()+''.join('\n'+open(f).read() for f in ['src/jin.js','src/shenji.js','src/mode_beacon.js','src/deeds.js','src/debug.js','src/arsenal.js','src/choices.js','src/shenji2.js'] if __import__('os').path.exists(f))+'\n})();\n')"
python3 - <<'PY'
import base64, glob, os, json
d={os.path.basename(f)[:-4]: base64.b64encode(open(f,'rb').read()).decode() for f in sorted(glob.glob('snd/*.mp3'))}
open('src/snd_data.js','w').write('const SND_DATA = '+json.dumps(d,separators=(',',':'))+';\n')
# soldiers' voice clips (CC0, see voice/CREDITS.txt), grouped by category: pain_3.mp3 -> VOICE_DATA.pain
v={}
for f in sorted(glob.glob('voice/*.mp3')):
  k=os.path.basename(f)[:-4].rsplit('_',1)[0]; v.setdefault(k,[]).append(base64.b64encode(open(f,'rb').read()).decode())
open('src/voice_data.js','w').write('const VOICE_DATA = '+json.dumps(v,separators=(',',':'))+';\n')
PY
{
  cat src/01_head.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
  echo '<script>if (typeof THREE === "undefined") document.write("<script src=\"https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js\"><\/script>");</script>'
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js"></script>'
  for f in dmath sim sim_coop sim_maps beacon snd_data voice_data audio voice music net render anim realism stylized real_gear action newmodel _mainfull; do
    echo "<script>"
    cat "src/$f.js"
    echo "</script>"
  done
} > dist/index.html
{
  echo '<!doctype html>'
  echo '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '</head><body>'
  cat dist/index.html
  echo '</body></html>'
} > dist/ming-dynasty-1619.html
# syntax check every script
for f in dmath sim sim_coop sim_maps beacon snd_data voice_data audio voice music net render anim realism stylized real_gear action newmodel _mainfull; do node --check "src/$f.js"; done
echo "built: $(wc -c < dist/index.html) bytes"
# local test build (no CDN)
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>'
  cat src/01_head.html | grep -v 'fonts.googleapis'
  echo '<script src="../test/libs/three.min.js"></script>'
  for f in dmath sim sim_coop sim_maps beacon snd_data voice_data audio voice music net render anim realism stylized real_gear action newmodel _mainfull; do echo "<script>"; cat "src/$f.js"; echo "</script>"; done
  echo '</body></html>'
} > dist/test.html
# experimental combat build: same game with the swept-blade melee, attack tokens and crowd damage cap switched on
python3 - <<'PY'
s = open('dist/ming-dynasty-1619.html').read()
tag = '<script>window.MING_XCOMBAT = 1;</script><div style="position:fixed;right:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#f0d38a;background:#2a1d14cc;border:1px solid #8a6a3c;border-radius:4px;padding:3px 8px;pointer-events:none">實驗 · Experimental combat</div>'
s = s.replace('</head><body>', '</head><body>' + tag, 1)
s = s.replace('<title>', '<title>Experimental Combat · ', 1)
open('dist/experimental-combat.html', 'w').write(s)
PY
echo "experimental: $(wc -c < dist/experimental-combat.html) bytes"
python3 - <<'PY'
s = open('dist/index.html').read()
tag = '<script>window.MING_XCOMBAT = 1;</script><div style="position:fixed;right:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#f0d38a;background:#2a1d14cc;border:1px solid #8a6a3c;border-radius:4px;padding:3px 8px;pointer-events:none">實驗 · Experimental combat</div>'
open('dist/xc-index.html', 'w').write(tag + s.replace('<title>', '<title>Experimental Combat · ', 1))
PY
# realism edition: film look (PBR, HDR + filmic grade, smoke and dust) on the same game
python3 - <<'PY'
s = open('dist/index.html').read()
tag = '<script>window.MING_REAL = 1; window.MING_XCOMBAT = 1;</script><div style="position:fixed;right:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#e8e2d6;background:#1d1b19cc;border:1px solid #6a645a;border-radius:4px;padding:3px 8px;pointer-events:none">寫實 · Realism edition · 實驗 combat</div>'
open('dist/real-index.html', 'w').write(tag + s.replace('<title>', '<title>Realism · ', 1))
f = open('dist/ming-dynasty-1619.html').read()
open('dist/realism-edition.html', 'w').write(f.replace('</head><body>', '</head><body>' + tag, 1).replace('<title>', '<title>Realism · ', 1))
t = open('dist/test.html').read()
open('dist/test-real.html', 'w').write(t.replace('<body>', '<body><script>window.MING_REAL = 1; window.MING_XCOMBAT = 1;</script>', 1))
PY
echo "realism: $(wc -c < dist/real-index.html) bytes"
# stylized edition: the realism edition's game (same flags, same gear, same combat) with clean painted graphics
python3 - <<'PY'
s = open('dist/index.html').read()
tag = '<script>window.MING_REAL = 1; window.MING_XCOMBAT = 1; window.MING_STYLE = 1;</script><div style="position:fixed;right:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#f4ead2;background:#3a2c1ecc;border:1px solid #9a7a4c;border-radius:4px;padding:3px 8px;pointer-events:none">畫 · Stylized edition · 實驗 combat</div>'
open('dist/style-index.html', 'w').write(tag + s.replace('<title>', '<title>Stylized · ', 1))
f = open('dist/ming-dynasty-1619.html').read()
open('dist/stylized-edition.html', 'w').write(f.replace('</head><body>', '</head><body>' + tag, 1).replace('<title>', '<title>Stylized · ', 1))
t = open('dist/test.html').read()
open('dist/test-style.html', 'w').write(t.replace('<body>', '<body><script>window.MING_REAL = 1; window.MING_XCOMBAT = 1; window.MING_STYLE = 1;</script>', 1))
PY
echo "stylized: $(wc -c < dist/style-index.html) bytes"
# action combat edition: the realism edition's game with telegraphed lunges, charges, pike flurries and spin cuts, and their counters
python3 - <<'PY'
s = open('dist/index.html').read()
tag = '<script>window.MING_REAL = 1; window.MING_XCOMBAT = 1; window.MING_ACTION = 1;</script><div style="position:fixed;right:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#ffd9a8;background:#2a1410cc;border:1px solid #9a5a3c;border-radius:4px;padding:3px 8px;pointer-events:none">武 · Action combat (experimental)</div>'
open('dist/act-index.html', 'w').write(tag + s.replace('<title>', '<title>Action Combat · ', 1))
t = open('dist/test.html').read()
open('dist/test-act.html', 'w').write(t.replace('<body>', '<body><script>window.MING_REAL = 1; window.MING_XCOMBAT = 1; window.MING_ACTION = 1;</script>', 1))
PY
echo "action: $(wc -c < dist/act-index.html) bytes"
# new realism edition: the realism edition's game with the new soldier (model/rig.js) for the men near the camera
python3 - <<'PY'
libs = ''.join('<script src="../model/%s"></script>' % f for f in ['GLTFLoader.js', 'SkeletonUtils.js', 'rig.js'])
tag = '<script>window.MING_REAL = 1; window.MING_XCOMBAT = 1; window.MING_NEWMODEL = 1;</script><div style="position:fixed;right:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#f0e2c4;background:#2a2016cc;border:1px solid #7a6444;border-radius:4px;padding:3px 8px;pointer-events:none">New Realism · new soldier model (F6 grime)</div>'
s = open('dist/index.html').read()
s = s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/peerjs', libs + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/peerjs', 1)
open('dist/newreal-index.html', 'w').write(tag + s.replace('<title>', '<title>New Realism · ', 1))
t = open('dist/test.html').read()
t = t.replace('<script src="../test/libs/three.min.js"></script>', '<script src="../test/libs/three.min.js"></script>' + libs, 1)
open('dist/test-newreal.html', 'w').write(t.replace('<body>', '<body><script>window.MING_REAL = 1; window.MING_XCOMBAT = 1; window.MING_NEWMODEL = 1;</script>', 1))
PY
echo "new realism: $(wc -c < dist/newreal-index.html) bytes"
