import sys, re
v = sys.argv[1]; D = '/home/claude/ming/dist/'; R = '/home/claude/laladehulu.github.io/Liaodong/'
head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head><body>'
def badge(name): return '<div style="position:fixed;left:10px;bottom:8px;z-index:99;font:600 11px sans-serif;color:#e8dcc0;background:#1d1814cc;border:1px solid #6a5a44;border-radius:4px;padding:3px 8px;pointer-events:none">遼東 Liaodong · %s · %s</div>' % (name, v)
for src, dst, name in [('index.html', 'regular', 'Regular'), ('real-index.html', 'realism', 'Realism'), ('xc-index.html', 'battle-experiment', 'Battle experiment'), ('style-index.html', 'stylized', 'Stylized')]:
    s = open(D + src).read()
    i = s.index('<title>'); pre, body = s[:i], s[i:]   # pre = the edition's flag script + corner tag
    open(R + dst + '/index.html', 'w').write(head + badge(name) + pre + '\n' + body + '\n</body></html>\n')
p = R + 'index.html'; s = open(p).read()
s = re.sub(r'<span class="seal">v\d+</span>', '<span class="seal">%s</span>' % v, s)
s = s.replace('<span>Film-style lighting, smoke and dust, natural trees. F7 quality · F8 HDR.</span>', '<span>Film-style lighting, smoke and dust, natural trees, with the experimental combat. F7 quality · F8 HDR.</span>')
open(p, 'w').write(s)
print('ok', v)
