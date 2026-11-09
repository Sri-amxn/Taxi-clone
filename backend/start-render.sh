#!/bin/sh
set -eu
: "${SECRET_KEY:?Set SECRET_KEY in Render Environment}"
: "${USER_CODE_SECRET:?Set USER_CODE_SECRET in Render Environment}"
if [ "${DEMO_MODE:-0}" = "1" ]; then
  python -m flask --app app init-demo
elif [ -z "${DATABASE_URL:-}" ]; then
  echo 'Set DATABASE_URL for a migrated external database, or DEMO_MODE=1 for disposable SQLite demo storage.' >&2
  exit 1
fi
exec gunicorn --bind "0.0.0.0:${PORT:-10000}" --workers 1 --threads 8 --timeout 120 render_app:app
