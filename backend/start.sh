#!/usr/bin/env bash
set -e

mkdir -p /var/data

# First deploy only: copy seed DB into persistent disk if disk db missing
if [ ! -f "/var/data/dreamarc.db" ] && [ -f "./seed/dreamarc.db" ]; then
  cp ./seed/dreamarc.db /var/data/dreamarc.db
fi

# Start API
exec uvicorn main:app --host 0.0.0.0 --port ${PORT}