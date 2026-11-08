#!/bin/sh
set -e

mkdir -p /data

if [ -n "$AUTH_STATE_BASE64" ]; then
  echo "$AUTH_STATE_BASE64" | base64 -d > /data/storage-state.json
fi

exec node src/index.js
