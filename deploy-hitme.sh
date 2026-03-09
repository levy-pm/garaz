#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SSH_KEY=/home/problems/.ssh/github_deploy_rsa
SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"

cd "$ROOT_DIR"

before_commit="$(git rev-parse HEAD 2>/dev/null || printf 'missing')"

git -c core.sshCommand="$SSH_COMMAND" pull --ff-only origin main

after_commit="$(git rev-parse HEAD 2>/dev/null || printf 'missing')"
should_restart=0

if [ "$before_commit" != "$after_commit" ] || [ ! -f "$ROOT_DIR/backend/dist/index.js" ] || [ ! -f "$ROOT_DIR/frontend/dist/index.html" ]; then
  should_restart=1
  npm ci --include=dev --prefix backend
  npm ci --include=dev --prefix frontend
  npm run build --prefix backend
  npm run build --prefix frontend
fi

if [ "$should_restart" -eq 1 ]; then
  mkdir -p "$ROOT_DIR/tmp"
  touch "$ROOT_DIR/tmp/restart.txt"
fi
