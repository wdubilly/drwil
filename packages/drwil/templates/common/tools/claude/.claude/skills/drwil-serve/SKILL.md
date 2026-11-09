---
name: drwil-serve
description: Give the human the link to the project's live, read-only view (drwil serve), starting it if needed. Use when the human runs /drwil-serve, asks for the project's view or its link, or uses a tool that cannot show the link at session start.
---

# The project's live view (`/drwil-serve`)

1. Run `npx drwil serve --welcome` at the project root. It starts the server in the background on
   `127.0.0.1` when it is not running, publishes it on the private network when Tailscale can, and prints one line.
2. Give that line to the human as it is, including what it says about opening the view from a phone. It
   carries no token. Do not open a browser.
3. If the command fails, give its error message as it is.

Never start the server with `--host` on the human's behalf, and never ask for, read, write or repeat
`DRWIL_SERVE_TOKEN` or a link holding a token: outside `127.0.0.1` the human sets that variable in their own
terminal and starts `npx drwil serve --host <address>` there.

## At session start

Offered by `drwil init`, off until the human says yes (`npx drwil init --serve-autostart` or
`--no-serve-autostart` to change the answer). When on, a session-start hook starts the server, on `127.0.0.1` only:

| Tool | Server started | Link shown to the human |
| --- | --- | --- |
| Claude Code | yes | yes, by `systemMessage`, never sent to the model (tried on 2.1.319) |
| Gemini CLI | yes | yes, by `systemMessage` (documented, not tried) |
| Codex | yes | yes, by `systemMessage`, shown as a warning (documented, not tried) |
| Copilot CLI | yes | no channel: it reads only `additionalContext`, so `/drwil-serve` gives the link |
| Cursor | no hook delivered | no channel: run the command of step 1 |
