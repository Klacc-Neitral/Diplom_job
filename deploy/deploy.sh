#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myapp}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose up -d --build
docker compose ps
docker compose logs --tail=50 flask_app
