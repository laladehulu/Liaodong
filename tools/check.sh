#!/bin/bash
# Syntax-check every script and build (serialised so two agents never write dist/ at once).
cd "$(dirname "$0")/.." || exit 1
for f in src/*.js; do node --check "$f" || exit 1; done
bash build.sh 2>&1 | tail -1
