# Recipe: adopt the kit on an existing project

Goal: after `init` (stack and layers detected, mechanics installed,
nothing overwritten), make the kit live on a project that already has
code. Every choice below is a **`[decision]`**: propose, never decide in
the requester's place (`AGENTS.md`, Conduct section).

**Before `init`: which AI tools?** `init` asks the human which AI tools to
configure (`claude`, `codex`, `cursor`, `gemini`, `copilot`, or `all`) in an
interactive terminal; without a terminal, on a first install, it refuses and
asks for `--tools <list>`; an update keeps the tools already recorded. What
each choice adds to the repository: `codex` adds nothing of its own (it reads
`AGENTS.md`); `claude` adds CLAUDE.md and the .claude/ tree (hooks, agents,
skills); `gemini` adds GEMINI.md and .gemini/settings.json, running the
same hooks; `cursor` adds .cursor/rules/; `copilot` adds
.github/copilot-instructions.md, .github/instructions/ and
.github/hooks/. Choose only the tools the team really uses: each one adds
files to review and to keep current. The choice is the requester's, never the
agent's.

0. **A new project (no code yet, no layer): scope it first.** On an
   empty folder, `init` has already committed the kit itself, on the
   `workstream/kit-installation` branch it created, before enabling the
   hooks (`scopeGate` is `blocking`, so files outside any brief could not be
   committed afterwards): the first workstream starts on a clean tree. It
   does so only on the repository it creates (a first installation on an
   existing repository, or without a git identity, is yours to commit; an
   update commits itself on `workstream/kit-update`). With the
   requester, one `[decision]` at a time: the need and its users, the
   scope of the first version, the stack (hence the layers), the first
   business rules (hence the first `APP` contracts, step 5) and the risk
   level. Write the result into `AGENTS.md` (« The project in 5 lines »),
   `docs/architecture.md` (the map, kept current from then on) and a first
   `README.md`; open intents for what is left. Then declare the layers:
   `drwil init --layers <layers>` (nothing to detect yet) creates each
   layer's `AGENTS.md` and the tools' per-layer instructions; fill them in
   with the stack's conventions (structure, build and test commands) and
   declare the stack's checks (step 3). Then wire the mandatory guarantees
   (step 3 bis): a new project is at 100 % coverage and has its e2e test
   from the start. Last, the first push to the empty remote repository:
   `git push -u origin master` (or `main`), once, from the main branch
   holding your first commit. The branch protection (QUA-017) accepts that
   push only because the remote has no branch yet; after it, every change
   goes through a branch and a pull/merge request, and a second direct
   push is refused (`docs/recipes/working-with-branches.md`).
1. **Re-read the detected stack** (`.drwil/ia-first.json`): layers, tools,
   CI. Correct it if `init` got it wrong. Then **build the map**
   `docs/architecture.md` from the real code (what the application does,
   stack, every code folder with its role), in the `docLang` language
   (absent: the project language), in place of the skeleton `init` wrote: drwil maintains it from then on (its check reports a code folder
   it does not cite). On a project that already had indexed code, `init`
   also wrote the reference brief « existing code »
   (file existing-code.md of `docs/projects/`): its `scope` block lists every code
   file indexed before the kit, and the map's « Existing code » section
   cites their folders with a role « to describe at adoption » — so that the
   first commit, even of a brief alone, passes. Replace those roles with
   the real ones here. The brief then stays: a file a workstream touches
   enters the `scope` block of that workstream's brief, as any code; a
   deleted file leaves its list; the brief is kept as long as it covers a
   file. `init` never rewrites it, an update never creates it and
   `uninstall` leaves it in place.
2. **Fill in the layer `AGENTS.md` files** (one per `layers` entry):
   Context, Test pitfalls, Layer contracts, Style and recipes, Verify —
   from the existing code, not generalities.
3. **Declare the stack's checks** in `.drwil/ia-first.json` → `checks`
   (lint, typecheck, tests, build…): each with a `name` and a `run`, run by
   `node .githooks/run-checks.mjs` and at commit time.
3 bis. **Wire the mandatory guarantees**: `npx drwil guarantees` (once the
   stack is known; `--dry-run` to preview). For every layer whose stack is
   in its table (Node/TypeScript, Python, Go, JVM), it declares the coverage
   check in `checks`: 100 % on lines, branches, functions and statements —
   as far as the tool measures them, said as is (Go: statements only) — on
   a new project; on an existing project in test debt, the measured level
   as a ratchet (never lowered), 100 % on new or modified code (diff
   coverage) and a non-blocking `[P1]` brief to climb to 100 %. A stack
   outside the table, a tool missing or not launchable, no `e2e` check, an
   incomplete forge (Git, GitHub or GitLab remote, CI replaying the hook's
   checks, protected main branch with required checks and no administrator
   bypass) or a README, « 5 lines » or `docs/features.md` still carrying
   skeleton text: each gets a blocking `[P0]` brief, the only one offered
   by `/drwil-start`, and `drwil verify` is FAIL until it is held. The
   branch protection is set by `npx drwil guarantees --protect` **with the
   requester's agreement** only; on GitHub it also allows the repository's
   auto-merge (« Allow auto-merge »), without which `.githooks/merge-auto.mjs`
   refuses and an « Automatic merge » choice fails at closing. No light profile, no waiver: a file
   exclusion (configuration, entry point…) is declared with its reason in
   `.drwil/ia-first.json` → `guarantees.exclusions` (`{ "layer", "path",
   "reason" }`); one without a reason is refused. Each wired check is cited
   by the project's coverage contract (`catalog:QUA-004`) and its e2e
   contract (`catalog:QUA-020`), so that `drwil verify` replays them.
   Limit: 100 % coverage proves every line is run by a test, not that it is
   correct.
4. **Propose the catalog's contracts** (`docs/contracts-catalog.md`) one by
   one, with their typical check: the requester keeps the `[decision]` to
   adopt each or not; on his yes, `npx drwil contracts adopt <ID>` moves it
   (no prefix, catalog proof as `Manual`); a contract of its own, absent from
   the catalog: `npx drwil contracts add [ID]` (skeleton). An adopted contract: its catalog line becomes a section (`## ID — title`, Rule, Scope, Source of truth, Proof, Reason, Check and/or Manual) in the project's registry (`docs/contracts.md`), with its check actually wired up (not a promise):
   - `catalog:QUA-001` (file size): `.githooks/check-file-size.mjs` is
     already shipped by the kit (opt-in) — only needs declaring in
     `checks` with the root and the ceiling chosen by the requester — the kit
     proposes 200 lines (the script's default, without a ceiling, stays 400).
   - `catalog:QUA-014` (contrast): copy
     `templates/common/optional/front-quality/` (see its README) if a
     front end is detected, then declare its two checks.
   - `catalog:QUA-004` (coverage) and `catalog:QUA-020` (e2e): not a choice — mandatory guarantees wired at step 3 bis.
     A new project: 100 % and e2e from the start. An existing project in debt: threshold at the measured level, diff
     coverage at 100 %, ratchet; e2e required too. What the e2e test is for each project shape is defined once, in the
     catalog's « What "end to end" means » section. The e2e check is slow: propose `"runAt": ["ci"]` — played once, by
     the CI of the PR (GitHub) or MR (GitLab), never at commit, at push or in `drwil verify`, which then says
     `GOVERNANCE: PASS (CI pending)`; `--with-ci-checks` replays it locally to reproduce a failure.
   - The catalog's other lines have no ready-made script: propose the
     detected stack's usual tool (lint, typecheck, coverage…).
5. **Write the first business contract**: `docs/contracts.md` ships
   `APP-001`, an example to replace. With the requester (`[decision]`), pick
   the project's most critical business rule, write the test that proves
   it (its name starts with the contract's ID: `APP-001: …`), declare it in
   `checks` with an `id`, cite it as `**Check**`, list its test file(s) as
   `**Tests**` (QUA-029 checks they exist and carry the ID) and remove the
   `**Manual**` field: `drwil verify` then replays it at every workstream.
   **One check per business rule**, filtering its tests by the ID
   (`npm test -- -t "APP-001"`, `pytest -k APP_001`, `go test -run APP001`):
   a single check shared by several contracts (one plain `npm test`) cannot
   say which rule a failure breaks — `drwil verify` reports it as not
   attributable. From then on, each workstream links its acceptance criteria
   to such contracts (`docs/projects/model-brief.md`, « Acceptance
   criteria »): created by the workstream, or reused as they are; a
   contract changed on purpose is declared in the brief (« Modified
   contracts »), otherwise closing is refused.
6. **Verify**: `node .githooks/run-checks.mjs` green, then one commit per
   subject (layer filled in, check declared, contract adopted) — never a
   catch-all commit.
7. **Read the protection level**: `npx drwil doctor` says which of the four
   levels the project really holds, each proved by a check (1 diagnosis
   only, 2 local governance active: hooks wired and `scopeGate` blocking,
   3 CI replaying the hook's checks, 4 forge protection verified, the
   repository's auto-merge allowed on GitHub), « not
   verified » when it could not read the forge, and the command that leads
   to the next level (`--json` included). A new install writes `scopeGate`
   as `blocking`; a project installed before keeps its setting, `warning`
   when it had none — `doctor` shows the command that hardens it, and
   `drwil verify` fails on a non-blocking `scopeGate` once the mandatory
   guarantees are enforced.

## Human attestation in the conversation

For a contract with a remaining human judgment, the agent may run
`npx drwil attest-poll <ID> --tried "What I tried"` (add `--renew` only for
an intentional renewal). Default: Claude Code's `AskUserQuestion`. Use
`--tool copilot` or `--tool gemini` for their native `ask_user`, or
`--tool codex` for `request_user_input`. This prepares
JSON, never an attestation. With drwil installed as a local dependency and
the tool's hooks enabled in a trusted workspace, pass that JSON to
the tool unchanged: one attestation question, no answer, default,
recommendation or extra field. The poll shows the rule, automated results,
human criterion, agent's trial and actual covered paths. The trial is a
declaration, not proof that the agent executed it.

The human alone chooses **Attest** or **Decline**. Claude Code keeps its
session/tool-call correlation. Copilot, Gemini and Codex use the native session
and a visible random nonce bound to the exact question, choices and proof:
no invented native call identifier. Their shared hook allows only one
pending poll per session and reserves/consumes it atomically; the nonce
cannot be rearmed, even in another session or tool. Only the native tool
result supplies the answer. The engine reruns the contract's checks and
compares the exact snapshot before recording the version-4 attestation.
Decline, no answer, a changed proof, replay or age over one hour records
nothing. Prepare a new poll after refusal or expiry; never reuse its JSON.
The agent never supplies the answer, calls the hook directly or writes an
attestation. Session, tool call (Claude), nonce/question hash (portable)
and timestamps trace the hook's gesture, not the human's identity.
The runtime, hooks and local preparation files must be trusted, as for the
Claude adapter: this is not protection against an actor rewriting the hook
and its files. Retain the nonce tombstones in the local evidence directory.
After a hook crash, an occupied session may require inspecting its pending
files and opening a fresh native session; do not fabricate a tool response.

For Codex, review and trust the exact hook definitions with `/hooks` in a
trusted project, keep the `hooks` feature enabled, and use an interactive
root thread with `request_user_input` available (Plan mode in the inspected
0.166.0 source; Default mode depends on `default_mode_request_user_input`).
The adapter also binds the native `tool_use_id`; it accepts only a JSON-string
`tool_response` with one exact `answers["drwil_attest"].answers` choice.
The JSON must be passed unchanged: Codex's general tool guidance recommends
an option by default, but an attestation must never add that recommendation.
Cancelled requests without a native post-event can occupy the session until
expiry. The shared scripts do not install Claude settings, skills or agents
when Codex is selected alone. Native Windows commands remain untried.

These four hook adapters and the dedicated Cursor client below have local
fictitious tests, **not real interactive attestation trials**. See the
compatibility matrix for versions, native formats and remaining prerequisites.
If the hook or local drwil dependency is unavailable, the human uses the unchanged fallback
`npx drwil attest <ID>` in their own interactive terminal. Never substitute
an answer in chat that the agent interprets itself.

### Cursor: dedicated human ACP client

The human chose this extra integration on 2026-11-04: **a different interface**, not guaranteed integration with usual Cursor chat or a guessed hook payload.
Prerequisites: Node, local drwil dependency, updated `init --tools cursor` (shared scripts,
no Claude settings/agents), separately installed `agent`, authenticated by the human with `agent login`.
No new npm dependency or automatic Cursor installation. Opening it can send project context
to Cursor and consume credits: use only an explicitly chosen project and account.

The human runs `npx drwil cursor-acp` in their interactive terminal and types at `Vous :`.
The client launches `agent acp` without a shell, negotiates protocol 1, authenticates
`cursor_login`, creates a new session and forwards typed prompts; it does not resume usual chat.
Tell Cursor to prepare `npx drwil attest-poll <ID> --tool cursor --tried "What I tried"`
and invoke its native question tool with the exact JSON: `title`, question ID/prompt,
option IDs/labels, `allowMultiple: false`. The runtime supplies its native `toolCallId`.
Only the client displays the question and reads numbered human choices, returning `questionId` / `selectedOptionIds`.
Zero, empty/invalid input, EOF and Ctrl-C abandon.
No default, `--yes`, response argument, redirected stdin or model text can confirm; `/quitter` ends between turns, Ctrl-C/EOF stops the running process.

Supported ACP messages: `session/update` displays agent text and accepts other session updates;
`session/request_permission` shows agent-authored title, full structured tool-call details and
offered permission names/kinds for explicit human choice (abandon cancels).
`cursor/update_todos`, `cursor/task`, `cursor/generate_image` are announced by name only.
`cursor/create_plan` is rejected; filesystem/terminal client capabilities are false;
other requests return method-not-found. Unsupported notifications, malformed JSON,
closed sessions, duplicate RPC IDs, server errors and timeouts surface as errors.
One human request at a time, one simple-choice question with 2–10 options.
Limits: frame/buffer 1 MiB, total input 32 MiB, RPC five minutes, session thirty minutes,
prompt 16,000 characters, 100 turns. The RPC deadline precedes shared one-hour expiry.
Cleanup closes child stdin, sends its PID SIGTERM, then SIGKILL after one second if needed.
Runtime stderr is drained without printing possible secrets; RPC/process errors remain visible.

The shared engine binds native session/call, exact question/nonce, proof snapshot and time;
reruns checks and rechecks session activity before writing. Refusal, concurrency, replay,
expiry and changed proof cannot confirm. Client, runtime, local hooks/evidence and terminal
are trusted: TTY/provenance `cursor-poll` are **not strong identity** against a local actor
with PTY/code-write access. The hook's stdin entry refuses Cursor; no answer-supplying CLI
exists. Test UI injection is internal only, never a CLI option. No real trial is claimed.

**Concrete real-trial protocol (human only, still pending):**

1. Build the candidate on this branch with `npm pack ./packages/drwil` (includes the build).
   In a disposable project without sensitive data: `npm install --save-dev <candidate.tgz>`,
   then `npx drwil init --tools cursor`. Record Node/drwil/`agent --version`, OS, date,
   trust/authentication setup; no minimum tested Cursor version is claimed.
2. Add fictitious manual APP-009 (“Fictitious judgment”): rule, manual criterion, one covered
   fictitious file. The agent must not attest or accept real project criteria.
3. Open `npx drwil cursor-acp` yourself; ask for preparation and native question as above.
   Read rule/tests/criterion/trial/paths/choices. First **Decline**; with a fresh nonce,
   **Attest** only on your real judgment. Record session/call/response field without sensitive
   data. Inspect APP-009 in `npx drwil verify --json`; other proofs can still block the global verdict.
4. Change the covered file: MANUAL must return. Test abandon and changed proof while a question
   is open: no new attestation. Reusing the poll must fail; prepare fresh JSON.
5. Date/version/outcomes/readability go in the matrix; errors mean unverified, never permission to invent results or lower criteria.

Out of scope: rewriting existing code to bring it up to standard — `docs/recipes/refactor-without-breaking.md`, run next, contract by contract.
