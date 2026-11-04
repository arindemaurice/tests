#!/usr/bin/env bash
# Start Love Is Like Coding on Linux / macOS.  Usage: ./run.sh   (then open http://127.0.0.1:5000)
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

export WHATSAPP_NUMBER="${WHATSAPP_NUMBER:-256748808436}"
export PORT="${PORT:-5000}"

if [ "${PRODUCTION:-0}" = "1" ]; then
  exec gunicorn -w 3 -b "0.0.0.0:${PORT}" app:app
else
  echo "Open http://127.0.0.1:${PORT}"
  exec python app.py
fi
