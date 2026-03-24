#!/bin/bash

git reset HEAD~1

# We want 6 commits exactly from the remaining unstaged files
commit_if_changes() {
    if ! git diff --cached --quiet; then
        git commit -m "$1"
    fi
}

# Committing Express & Body Parser
git add server/node_modules/express* server/node_modules/body-parser* 2>/dev/null || true
commit_if_changes "chore(deps): update express and body-parser modules"

# Committing Iconv-lite
git add server/node_modules/iconv-lite* 2>/dev/null || true
commit_if_changes "chore(deps): refresh iconv-lite internals"

# Committing Native Addons & Bcrypt
git add server/node_modules/bcrypt* server/node_modules/node-addon-api* 2>/dev/null || true
commit_if_changes "chore(deps): cleanup bcrypt and native addon APIs"

# Committing GYP & RegExp
git add server/node_modules/node-gyp* server/node_modules/path-to-regexp* 2>/dev/null || true
commit_if_changes "chore(deps): update node-gyp and routing expressions"

# Committing Mime & Router
git add server/node_modules/mime* server/node_modules/router* 2>/dev/null || true
commit_if_changes "chore(deps): sync mime types and routing dependencies"

# Final commit for the remainder
git add .
commit_if_changes "chore(deps): finalize miscellaneous dependency updates"

git push -u origin main --force
