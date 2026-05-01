#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="${1:-}"

if [[ -z "$SQL_FILE" ]]; then
    echo "Использование: ./scripts/run-sql.sh ./scripts/sql/<file>.sql"
    exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
    echo "SQL-файл не найден: $SQL_FILE"
    exit 1
fi

cd "$ROOT_DIR"

docker compose exec -T postgres psql -U "${POSTGRES_USER:-progtest_local}" -d "${POSTGRES_DB:-progtest_local}" -v ON_ERROR_STOP=1 -f - < "$SQL_FILE"
