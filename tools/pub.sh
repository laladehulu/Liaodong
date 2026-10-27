#!/bin/bash
# Publish a version to https://laladehulu.github.io/Liaodong/ and push the source to GitHub.
# usage: tools/pub.sh vN "what changed"
#   PAGES=/path/to/laladehulu.github.io/Liaodong   (default: ../laladehulu.github.io/Liaodong next to this repo)
#   PUB_TRAILER="Co-Authored-By: ..."               (optional lines appended to the Pages commit message)
set -e
V=$1; MSG=$2; [ -n "$V" ] && [ -n "$MSG" ] || { echo 'usage: tools/pub.sh vN "message"'; exit 1; }
SRC=$(cd "$(dirname "$0")/.." && pwd); PAGES=${PAGES:-$(dirname "$SRC")/laladehulu.github.io/Liaodong}
[ -d "$PAGES" ] || { echo "no Pages checkout at $PAGES (git clone https://github.com/laladehulu/laladehulu.github.io next to this repo, or set PAGES)"; exit 1; }
cd "$SRC"
[ -x tools/snap.sh ] && [ "$SRC" = /home/claude/ming ] && { tools/snap.sh "$V: $MSG" >/dev/null || true; }
# the source first: take what others pushed to main, build and test that, then push it
git pull -q --rebase origin main || { echo "rebase onto origin/main failed: resolve it, then run again"; exit 1; }
tools/check.sh | tail -1
node test/test_lockstep.js | tail -1 | grep -q "IN SYNC" || { echo "lockstep test FAILED: not publishing"; exit 1; }
git push -q origin HEAD:main || echo "source push failed (publishing the site anyway)"
# then the site: every edition, the landing page's version seal, the speech-layouts copy
cd "$PAGES" && git stash -q -u 2>/dev/null; git pull -q --rebase; git stash pop -q 2>/dev/null || true
python3 "$SRC/publish.py" "$V" "$PAGES" | tail -1
python3 - "$V" <<'PY'
import re,sys
V=sys.argv[1]
old=open('speech-layouts/index.html',encoding='utf-8').read()
i=old.index('<body>')+6; j=old.index('</div>',old.index('</div>',i)+1)+6
banner=re.sub(r'v\d+',V,old[i:j])
reg=open('regular/index.html',encoding='utf-8').read(); k=reg.index('<body>')+6; k2=reg.index('</div>',k)+6
open('speech-layouts/index.html','w',encoding='utf-8').write(reg[:k]+banner+reg[k2:])
PY
git add -A && git commit -qm "$V: $MSG${PUB_TRAILER:+

$PUB_TRAILER}"
git push -q || (git pull -q --rebase && git push -q)
git log --oneline -1
echo "published $V — live in a minute or two at https://laladehulu.github.io/Liaodong/"
