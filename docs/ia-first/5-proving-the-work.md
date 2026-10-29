# 5. What the agent must prove about its work

Section 5 of the "IA first" description, read on its own. The summary,
`docs/ia-first.md`, gives the file of every section.

- **Test what the user sees**, roles, text and buttons, not implementation
  detail (`AGENTS.md`, Conventions).
- **The end-of-task report is normative** (`AGENTS.md`, Conduct): files
  touched, checks run and their exact results, remaining limits and
  ambiguities. "Present as proven only what a check actually verifies; the
  rest is labeled 'human' or 'not verified'."
- **A failing check is not a constraint to bypass**: it flags a contract,
  to be read before any accommodation.

## `drwil verify`: the work-validation primitive

`drwil verify` is not just an audit: it is what lets you call a piece of
work **verified**. The chain is intent (**Reason**) → explicit requirement
(**Rule**) → proof (**Check**, **Manual**) → verdict, for each contract in
`docs/contracts.md`:

- **Check** names the identifier of a check known to the engine
  (`.githooks/engine.mjs`, the same one the git hooks use; or the `id` of a
  check in `.drwil/ia-first.json` → `checks`). The command is never copied
  into the contract.
- **Manual** describes the part of the proof that stays human.

Status per contract: `PASS` (fully proven by a check), `FAIL` (a check
fails, its cause is shown), `MANUAL` (a human part remains, or a legacy
contract without a check — never counted as PASS; the automated part is
shown separately), `ERROR` (unknown check, missing requirement or proof,
tool unavailable). Every contract is blocking. Overall verdict and exit
code: `GOVERNANCE: PASS` → 0; `GOVERNANCE: FAIL` or `MANUAL REVIEW
REQUIRED` → 1; `VERIFY ERROR` → 2.

Deterministic priority, per contract and for the overall verdict: FAIL >
ERROR > MANUAL > PASS.
Only **blocking** contracts (the default severity) decide the verdict; a
`warning` or `advisory` contract is run and shown without changing the exit
code. A malformed registry stays an `ERROR`, whatever the severity.

**Human attestation** (`drwil attest <ID>`): a `MANUAL` contract whose
automated part passes can receive an explicit human proof. The command first
re-runs the checks the contract cites, announcing each one and its result
(a test suite can take minutes), then shows the contract, its rule and its
automated proof, requires an interactive terminal and typing the contract
identifier (no `--yes`: an agent or a script cannot attest), then writes the
attestation to .drwil/evidence/attestations, versioned so it is reviewed.
The attestation is bound by fingerprint to the human part of the contract
(its rule, **Manual** field and severity) and, separately, to the definition
of each check it covered. A check added later leaves it valid (it must pass
anyway); a changed human part, or a covered check removed or redefined,
makes it stale and the contract is `MANUAL` again. An attestation written
before this rule (version 1) stays bound to the whole contract text.
`ATTESTED` status: distinct from `PASS`, it satisfies the contract;
never attestable: a `PASS`, `FAIL`, `ERROR` or not-applicable contract.

**Validity rule**: an attestation is valid only as long as the object it
attests stays as it was when judged. The object is what the contract declares
it covers, as paths: the **Covers** field lists path patterns between
backticks (``**Covers**: `.github/workflows/*.yml`, `src/auth/**` ``; `*` stays
in a folder, `**` crosses folders, a trailing `/` means the whole folder).
The attestation (version 3) records a fingerprint of the content of every file
matched; a file modified, added, removed or renamed under a pattern, without the
contract being touched, makes the attestation stale: `verify` names the file
and the contract is `MANUAL` again. The fingerprint reads the files themselves
(independent of git, replayable in CI); path order and line endings change
nothing. A pure formatting change counts as a change: there is no safe way to
tell it from a real one. A file outside every pattern leaves the attestation
valid. An attestable contract without **Covers** keeps its attestation (never
dropped for lack of coverage) but `verify` and `doctor` flag it: its
attestation cannot fall when the code it judged changes. An attestation of
version 1 or 2 stays valid as it is; its first renewal passes to version 3.
`drwil attest <ID> --renew` renews on purpose an attestation that is still
valid, from an interactive terminal and retyping the identifier, like any
attestation.

**Business rules**: the output ends with a one-line summary of
the business non-regression — rules proven by a test (a passing contract
with a **Tests** field), proven without a cited test, to complete (a human
part remains) and broken, each broken rule with the workstream it was born
from (**Origin**). A business rule is a contract whose prefix is a business
prefix (`APP` by default; setting `businessPrefixes` of
`.drwil/ia-first.json`, e.g. `["APP", "BIL"]`) or any contract with an
**Origin** field. The rule-by-rule detail (state, cited tests, origin) is in
`drwil verify --json` (`businessRules`) and in the evidence. No business
rule in the registry: no summary line.

## Agent / human workflow

```text
Agent : drwil verify            (or /drwil verify; --agent output)
DRWIL : PASS / FAIL / ERROR / MANUAL
  FAIL   → the agent fixes, then runs drwil verify again
  ERROR  → the agent reports the problem, never claims it is verified
  MANUAL → the agent stops: "Human attestation required."
Human : drwil attest <id>       (in their own terminal, if MANUAL)
Then  : drwil verify
Last  : GOVERNANCE: PASS        (only this verdict counts as validation)
```

The agent produces and verifies proofs; only the human attests. `drwil
attest` refuses any non-interactive environment (agent, script, redirected
input) and has no `--yes` option. drwil does not prove that a human typed
the command: it requires an attestation to be explicit, traceable and
subject to the change review (.drwil/evidence/attestations folder,
versioned).

`drwil verify --evidence` keeps the proof of a run (.drwil/evidence folder,
created on first run,
git-ignored): verdict, timestamp, commit, and per check a summary of its
output, redacted (keys, tokens, `password=…`) so that no secret is ever kept
(SEC-007).

**`verify` is the validation gate: a piece of work is verified by drwil
only if `verify` returns PASS.** `FAIL`: it must be fixed. `MANUAL`: it is
not validated yet — never a deferred success. `ERROR`: drwil cannot
establish the verdict. `verify` is the primitive an agent, a hook or a CI
can build on to enforce this gate; it does not enforce it by itself. Git
hooks do not depend on it: they use the same engine without drwil being
installed.
