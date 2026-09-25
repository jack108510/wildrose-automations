# Reachr Command Center

The Command Center is a private operations dashboard deployed at `https://n8n.wildeautomations.com/reachr-command-center/` through the existing Cloudflare tunnel. The server runs on the owner's computer at `127.0.0.1:4188` and requires HTTP Basic authentication on the deployed route. The private credential file is passed via `REACHR_DASHBOARD_AUTH_FILE`; it contains only the username, random salt, and password hash and is not committed.

The server binds to `127.0.0.1` and reads `prospects.json` plus `reply-monitor-state.json` at runtime. Those private data files are intentionally absent from this repository. The page shows confirmed sends and captured reply previews. Its reply composer is a preview only; the queue button is disabled and this server does not send messages. The deployed page depends on the owner's computer and Cloudflare tunnel remaining online.

Run `node test-dashboard-data.mjs` to check the summary calculations. Keep the authentication file outside the repository and never serve this dashboard without access control.
