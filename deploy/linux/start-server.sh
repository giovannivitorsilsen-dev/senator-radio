#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../.."
command -v node >/dev/null 2>&1 || { echo "Node.js 18+ non trovato" >&2; exit 1; }
if [ ! -d node_modules/ws ]; then npm install; fi
: "${PORT:=3000}"
export PORT
exec npm start
