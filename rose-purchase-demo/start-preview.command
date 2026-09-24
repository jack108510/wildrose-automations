#!/bin/zsh
cd "$(dirname "$0")" || exit 1
python3 site_preview_server.py &
preview_pid=$!
sleep 1
open "http://127.0.0.1:8799/"
wait "$preview_pid"
