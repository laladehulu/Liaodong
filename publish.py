import sys, re, os
# usage: python3 publish.py vN [PAGES_DIR]   (PAGES_DIR = the Liaodong folder of a laladehulu.github.io clone)
here = os.path.dirname(os.path.abspath(__file__))
v = sys.argv[1]; D = os.path.join(here, 'dist') + '/'
R = (sys.argv[2] if len(sys.argv) > 2 else os.environ.get('PAGES') or os.path.join(os.path.dirname(here), 'laladehulu.github.io', 'Liaodong')).rstrip('/') + '/'
head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head><body>'
def badge(name): return '<div style="position:fixed;left:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#e8dcc0;background:#1d1814cc;border:1px solid #6a5a44;border-radius:4px;padding:3px 8px;pointer-events:none">遼東 Liaodong · %s · %s</div>' % (name, v)
for src, dst, name in [('index.html', 'regular', 'Regular'), ('real-index.html', 'realism', 'Realism'), ('xc-index.html', 'battle-experiment', 'Battle experiment'), ('style-index.html', 'stylized', 'Stylized'), ('act-index.html', 'action-combat', 'Action combat')]:
    s = open(D + src).read()
    i = s.index('<title>'); pre, body = s[:i], s[i:]   # pre = the edition's flag script + corner tag
    open(R + dst + '/index.html', 'w').write(head + badge(name) + pre + '\n' + body + '\n</body></html>\n')
# the model lab (model/): the blocky rig and its armor, copied whole; Model/ points at it
import shutil
M = os.path.join(here, 'model'); os.makedirs(R + 'model', exist_ok=True)
for f in ['rig.js', 'lab.js', 'man.glb', 'three.min.js', 'GLTFLoader.js', 'SkeletonUtils.js', 'OrbitControls.js']: shutil.copy(os.path.join(M, f), R + 'model/' + f)
ms = open(os.path.join(M, 'index.html')).read(); open(R + 'model/index.html', 'w').write(ms.replace('<body>', '<body>\n' + badge('Model lab'), 1))
os.makedirs(R + 'Model', exist_ok=True); open(R + 'Model/index.html', 'w').write('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=../model/"><a href="../model/">Model lab</a>\n')
p = R + 'index.html'; s = open(p).read()
s = re.sub(r'<span class="seal">v\d+</span>', '<span class="seal">%s</span>' % v, s)
s = s.replace('<span>Film-style lighting, smoke and dust, natural trees. F7 quality · F8 HDR.</span>', '<span>Film-style lighting, smoke and dust, natural trees, with the experimental combat. F7 quality · F8 HDR.</span>')
open(p, 'w').write(s)
print('ok', v)
