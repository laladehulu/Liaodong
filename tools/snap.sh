#!/bin/bash
# Snapshot the working tree into git so no agent's work can be lost. Serialised with a lock; safe to call any time.
# usage: tools/snap.sh "<agent>: what changed"
cd "$(dirname "$0")/.." || exit 1
exec 8>/tmp/ming-git.lock; flock -w 60 8 || { echo "snap: lock busy"; exit 1; }
git add -A >/dev/null 2>&1
if git diff --cached --quiet; then echo "snap: nothing new"; exit 0; fi
git -c user.email=qaqaqaaa111@gmail.com -c user.name=laladehulu commit -qm "${1:-snapshot}" && git log --oneline -1
