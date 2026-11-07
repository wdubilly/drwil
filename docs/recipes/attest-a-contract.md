# Recipe: attest a contract

Goal: get the human's judgment on a `MANUAL` contract (verdict
`GOVERNANCE: MANUAL REVIEW REQUIRED`) without the agent ever attesting its
own work. First the attestation poll in the chat; the terminal as fallback.

## 1. The attestation poll in the chat (first)

1. Read the contract (`node .githooks/glossary.mjs --contract <ID>`) and do
   what its **Manual** field asks you to try.
2. Prepare the poll, which records nothing:
   `npx drwil attest-poll <ID> --tried "What I tried"` (add `--renew` only
   for an intentional renewal of a still valid attestation). It prints the
   poll as JSON: rule, automated results, human criterion, your trial and
   the covered paths.
3. Ask it through your tool's poll, passing the JSON **unchanged**: no
   answer filled in, no default, no recommended choice, no extra field or
   question. The hook refuses an altered poll before it is shown.
4. Only the human answers **Attest** or **Decline**. The hook reads the
   answer in the tool's own result, reruns the contract's checks and writes
   the attestation; you never answer, never call the hook, never write in
   `.drwil/evidence/attestations/` (if present).
5. Run `npx drwil verify --agent` again. Declined, unanswered, expired
   (one hour) or refused: prepare a new poll, never reuse the old JSON.

Per tool (the hooks must be installed by `drwil init --tools …` and enabled
in a trusted workspace):

| Tool | Preparation | Poll asked with |
|---|---|---|
| Claude Code | `npx drwil attest-poll <ID> --tried "…"` | `AskUserQuestion`, the JSON as its input |
| Copilot CLI | `… --tool copilot` | `ask_user`, the JSON as its input |
| Gemini CLI | `… --tool gemini` | `ask_user`, the JSON as its input |
| Codex | `… --tool codex` | `request_user_input`, the JSON as its input (hooks reviewed in `/hooks`; never add the option Codex recommends by default) |
| Cursor | `… --tool cursor` | its native question, inside the dedicated client the human opens with `npx drwil cursor-acp` |

Which channels had a real trial, and which only fictitious tests: the
compatibility matrix, "Human attestation parity" in
`docs/ia-first/6-limits-and-tool-compatibility.md`. Their details and
prerequisites: `docs/recipes/adopt-the-kit.md`, "Human attestation in the
conversation".

A subagent does not ask the poll: it stops with the contract ID and the
`attest-poll` command to prepare; the main session asks it.

## 2. The terminal (fallback)

No poll in the tool, hooks unavailable, or the human prefers it: give the
human `npx drwil attest <ID>`, to run in **their own** interactive terminal.
It reruns the checks, shows the contract and asks them to type its ID. Never
run it yourself, never accept an answer typed in the chat instead.
