#!/usr/bin/env bash
set -e

echo "=== DreamARC Render Boot ==="
pwd
ls -la
python --version || true

mkdir -p /var/data

# First deploy only: copy seed DB into persistent disk if disk db missing
if [ ! -f "/var/data/dreamarc.db" ] && [ -f "./seed/dreamarc.db" ]; then
  echo "Seeding DB to /var/data/dreamarc.db"
  cp ./seed/dreamarc.db /var/data/dreamarc.db
fi

echo "Starting uvicorn main:app ..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT}