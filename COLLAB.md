# Working in parallel on the Liaodong game

Several agents edit this tree at the same time. These rules make sure nobody's work is lost.

## The safety net: git
- `/home/claude/ming` is a git repo. Every change can be recovered with `git log -p -- <file>`.
- After every logical change that passes `tools/check.sh`, snapshot with `tools/snap.sh "<agent>: what changed"`. It's locked, so it's safe to call at any time.
- Never run `git checkout`/`git reset`/`git stash`/`git restore` on shared files. Never revert a change you did not make. If something of yours seems lost, find it in `git log` and re-apply it as a fresh edit.

## Editing shared files
- Use exact-string edits only: the Edit tool, or `tools/edit.py` (it locks the file, re-reads it, and requires the old text to match exactly once).
- Never write a whole shared file (Write tool, `cat >`, `open(...,'w')` with content you read earlier) and never restore a backup copy. A whole-file write erases whatever another agent changed since you read it.
- Keep each edit small and anchored on text unique to your area. If an edit fails because the text changed, re-read and re-apply. Don't force it.
- New code: prefer new functions or new files over rewriting existing ones. For example, add `Sim.prototype.x = function…` near the end of sim.js, or a new src file added to build.sh's lists.
- Inline `//` comments: never end a line with a comment and then put code after it on the same line. A comment swallows everything to the end of the line, and this has broken the game twice.

## Claims
- Before working on an area, add a line to `.collab/claims.md`: agent, files, and functions/regions. Remove the line when you finish.
- If you need to change something inside another agent's claimed region, keep the change minimal, and say so in your snapshot message and your final report.

## Building and testing
- `tools/check.sh` syntax-checks every source file and runs `build.sh`. build.sh holds a lock, so two builds never write dist/ at once.
- Keep each test run under 2 minutes, and run long renders in the background.
- Only the main thread publishes to GitHub.
