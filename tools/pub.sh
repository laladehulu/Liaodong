#!/bin/bash
# usage: tools/pub.sh vN "message"
set -e
V=$1; MSG=$2
cd /home/claude/ming && tools/snap.sh "$V: $MSG" >/dev/null || true
# keep the source on GitHub in step (merge what other agents pushed to main first)
(cd /home/claude/ming && git pull -q --rebase origin main 2>/dev/null; git push -q origin master:main 2>/dev/null) || echo "source push failed"
cd /home/claude/laladehulu.github.io/Liaodong && git stash -q -u 2>/dev/null; git pull -q --rebase; git stash pop -q 2>/dev/null || true; python3 /home/claude/ming/publish.py $V | tail -1
python3 - "$V" <<'PY'
import re,sys
V=sys.argv[1]
old=open('speech-layouts/index.html',encoding='utf-8').read()
i=old.index('<body>')+6; j=old.index('</div>',old.index('</div>',i)+1)+6
banner=re.sub(r'v\d+',V,old[i:j])
reg=open('regular/index.html',encoding='utf-8').read(); k=reg.index('<body>')+6; k2=reg.index('</div>',k)+6
open('speech-layouts/index.html','w',encoding='utf-8').write(reg[:k]+banner+reg[k2:])
PY
git add -A && git commit -qm "$V: $MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AHeLUbXitrrb3Jz1Jn2w3V"
git push -q || (git pull -q --rebase && git push -q)
git log --oneline -1
