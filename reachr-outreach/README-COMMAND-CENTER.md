# Reachr Command Center

The private Command Center is deployed at `https://n8n.wildeautomations.com/reachr-command-center/` through the existing Cloudflare tunnel. Its server runs on the owner's computer at `127.0.0.1:4188` and requires HTTP Basic authentication. The private credential file is passed via `REACHR_DASHBOARD_AUTH_FILE`; it contains a username, random salt, and password hash and is not committed.

The server reads `prospects.json` and `reply-monitor-state.json` at runtime. Those private data files remain outside Git. `command-center-model.mjs` groups confirmed sends by Messenger route, combines recorded outbound and verified inbound messages, and shows uncertain older monitor previews separately. The page lists one conversation per contact, including contacts who have not replied. Private management statuses and notes are stored in `/Users/jackserver/jsw/keys/reachr-command-center-state.json` with local-only file permissions.

The page links to Messenger for the full chat history and for sending replies. Its recorded timeline may be incomplete and does not send messages. The deployed page depends on the owner's computer and Cloudflare tunnel remaining online.

Run `node test-command-center-model.mjs` and `node test-dashboard-data.mjs` to check the conversation grouping and summary calculations. Keep authentication and private data files outside the repository.
