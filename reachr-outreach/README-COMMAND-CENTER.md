# Reachr Command Center

The Command Center is a local operations dashboard. Run `node reachr-dashboard-server.mjs` from this directory and open `http://127.0.0.1:4188/` on the same computer.

The server binds to `127.0.0.1` and reads `prospects.json` plus `reply-monitor-state.json` at runtime. Those private data files are intentionally absent from this repository. The page shows confirmed sends and captured reply previews. Its reply composer is a preview only; the queue button is disabled and this server does not send messages.

Run `node test-dashboard-data.mjs` to check the summary calculations. The dashboard is not intended for public hosting until access control and private data delivery are designed.
