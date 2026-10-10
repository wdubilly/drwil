---
name: drwil-lancer
description: Start a chantier with one human gesture — open a poll of the framed sheets; the human's answer, read by the tool, moves governance to REALISATION. Use when the human wants to start implementing a sheet.
---

# Start a chantier (`/drwil-lancer`)

Starting is the human's decision: it is **their answer to the poll**, read by a tool hook
(`.claude/hooks/saisie-drwil.mjs`), that makes the transition — never the agent.

1. List the framed sheets: `node .githooks/etat.mjs fiches --json` (`cadrage` block committed,
   sheet not finished). None: say so and stop.
2. Open **one** poll (Claude Code: `AskUserQuestion`; Copilot CLI: `ask_user`):
   - Claude Code: `header` exactly `drwil-lancer`; one option per sheet, **label = exact path**
     (e.g. `docs/projects/<sheet>.md`), description = title. At most 4 options: the most relevant;
     the human can type another path under "Other".
   - Copilot CLI: `message` starting with `drwil-lancer :`, choices = exact paths.
   - **Recommend** when useful: the advised sheet first, with "(Recommended)" and the reason in
     its **description** — never in the label.
   - **Forbidden**: filling `answers` or a default value (`default`): the hook refuses the poll.
     The human chooses alone.
3. After the answer, read the state again: `node .githooks/etat.mjs`. In REALISATION on the
   chosen sheet: implement. Otherwise: report the refusal as is, without retrying another way.

Without a poll in the tool: give the human the command `node .githooks/etat.mjs lancer`, to run
in an interactive terminal.
