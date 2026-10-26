#!/usr/bin/env python3
"""Atomic exact-string edit for shared files: takes a per-file lock, re-reads the file under the lock,
requires the old text to occur exactly once, writes, releases. Use instead of read-modify-write scripts.
usage: tools/edit.py FILE OLD_FILE NEW_FILE      (old/new text read from files, so quoting is never an issue)
   or: python3 -c "import sys; sys.path.insert(0,'tools'); from edit import edit; edit('src/sim.js', old, new)"
"""
import fcntl, os, sys
def edit(path, old, new, count=1):
    lock = open('/tmp/ming-edit-' + os.path.basename(path) + '.lock', 'w'); fcntl.flock(lock, fcntl.LOCK_EX)
    try:
        s = open(path, encoding='utf-8').read(); n = s.count(old)
        if n != count: raise SystemExit(f'edit: {path}: expected {count} match(es) of old text, found {n} - re-read the file, someone may have changed it')
        tmp = path + '.tmp-edit'; open(tmp, 'w', encoding='utf-8').write(s.replace(old, new)); os.replace(tmp, path)
    finally: fcntl.flock(lock, fcntl.LOCK_UN); lock.close()
if __name__ == '__main__':
    p, o, n = sys.argv[1:4]; edit(p, open(o, encoding='utf-8').read(), open(n, encoding='utf-8').read()); print('ok')
