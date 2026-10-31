// Messages of the transitions and of the state validation, in English (QUA-040: the project language).
const RERUN = "run `npx drwil verify --evidence` again";

export const MESSAGES_EN = {
  or: " or ",
  notObject: "state.json must hold a JSON object",
  unknownField: `unknown field "{0}" (the state only holds references)`,
  version: "version: 1 expected",
  unknownActivity: `unknown activity "{0}" (expected: {1})`,
  scopingEmpty: "in SCOPING, no active brief nor request",
  briefRequired: `{0}: active brief required`,
  request: "active_request: string or null expected",
  autoMergeType: "auto_merge: boolean expected",
  autoMergeScoping: "auto_merge: never in SCOPING (no workstream in progress)",
  queueType: "queue: list of briefs expected",
  queueMergeType: "queue_merge: boolean expected",
  parallelType: "parallel: list of briefs expected",
  detourType: "detour: object { origin_brief, origin_branch, branch, stash, human? } expected",
  detourActivity: "detour: only in BUILD",
  detourMove: "detour in progress: resume it first (`node .githooks/detour.mjs resume`), or abandon it to SCOPING",
  reopenedType: "reopened: object { pr, human? } expected (pr: the PR's number)",
  reopenedActivity: "reopened: only from BUILD to CLOSING",
  reopenFrom:
    "reopening refused: activity {0} — a closed workstream whose open PR reveals a defect is reopened from CLOSING; nothing changed",
  reopenDirty: "reopening refused: worktree modified — commit or remove first; nothing changed",
  reopenBranch: "reopening refused: it takes the workstream's branch (neither the main branch nor a detached HEAD); nothing changed",
  reopenUnknown:
    "reopening refused: the state of the PR of {0} is unknown (gh missing, not logged in, or no PR) — a state not established reopens nothing; nothing changed",
  reopenNotOpen:
    "reopening refused: PR #{0} is {1}, not open — a defect after the merge belongs to a new workstream or to routine maintenance; nothing changed",
  reopenNoBrief: "reopening refused: no commit of {1} deletes {0} — nothing to restore; nothing changed",
  reopenAutoMerge:
    "reopening refused: the automatic merge of PR #{0} could not be cancelled (`gh pr merge {0} --disable-auto`) — the branch receives nothing while it is scheduled; nothing else changed",
  reopenCancelledHuman:
    "automatic merge cancelled and NOT scheduled again: the tool never reschedules it by itself (it could merge the faulty code) — it is up to the human to schedule it again, once decided; the state reminder says so again in CLOSING",
  mergeCancelledType: "merge_cancelled: object { pr } expected (pr: the PR number)",
  mergeCancelledActivity: "merge_cancelled: only in CLOSING",
  scopingMergeType: "scoping_merge: object { branch } expected (branch: the branch of the scoping PR)",
  scopingMergeActivity: "scoping_merge: only in SCOPING",
  scopingMergeReminder:
    "Automatic merge of the scoping PR authorised for branch {0} (answer « Automatic merge » to the end-of-scoping poll): once the branch is pushed and its PR open, run `node .githooks/merge-auto.mjs <number>`, which refuses any PR of another branch; follow the PR with `node .githooks/pr-watch.mjs <number>`, run again while it says « green » without « merged », 30 minutes at most in all; never chain the `gh` commands by hand. The authorisation falls when leaving SCOPING; a « Manual merge » or « Continue scoping » answer withdraws it.",
  scopingMergeNotScoping:
    "answer to the end-of-scoping poll ignored: the activity is {0}, not SCOPING — nothing authorised, the state is unchanged",
  scopingMergeBranch:
    "automatic merge of the scoping PR not authorised: the current branch is not a scoping branch (main branch or detached head) — nothing authorised, the state is unchanged",
  scopingMergeAuthorised:
    "automatic merge of the scoping PR authorised for branch {0} (answer « Automatic merge »): once the branch is pushed and its PR open, run `node .githooks/merge-auto.mjs <number>`, then follow the PR with `node .githooks/pr-watch.mjs <number>`; the authorisation holds for this branch only, in SCOPING",
  scopingMergeManual:
    "nothing scheduled (answer « Manual merge »): merging the scoping PR stays a human gesture; `/drwil-start` offers the brief only once the PR is merged",
  scopingMergeContinue:
    "nothing scheduled (answer « Continue scoping »): the PR stays open and the next scopings are committed on the same branch ({0}), one branch, one PR; the poll is asked again at the end of the next scoping",
  reopenCancelled: "automatic merge cancelled: schedule it again after the new closing, like the first time",
  reopenMessage: "Reopening of {0}: defect revealed by PR #{1}",
  reopenCommitFailed: "reopening refused: the commit of the restored brief failed ({0}) — brief removed, state unchanged",
  reopenRestored:
    "brief {0} restored as it was before the closing, in a commit of its own ({1}); its scope widens as usual, in a separate commit",
  reopened: "CLOSING → BUILD (reopening of {0}, PR #{1} open)",
  queueNotReady:
    'start refused: "{0}" cannot enter a queue — it takes a ready brief (maturity « ready », no open [decision], acceptance criteria)',
  queued: "queue: then {0}, started one by one by the agent after each closing and merge (stop: `node .githooks/state.mjs queue stop`)",
  noQueue: "no queue in progress",
  queueStopped: "queue stopped: {0} will not be started; the current workstream goes on",
  since: "since: ISO 8601 timestamp or null expected",
  briefType: "active_brief: brief path or null expected",
  briefPlace: `active_brief: .md brief of {1} expected ("{0}")`,
  briefModel: `active_brief: "{0}" is a model, not a workstream brief`,
  briefMissing: `active_brief: brief "{0}" not found`,
  unreadable: "state.json unreadable (invalid JSON)",
  noEvidence: "no verify evidence: run `npx drwil verify --evidence`",
  evidenceUnreadable: `evidence {0} unreadable: ${RERUN}`,
  noHead: "HEAD commit not found: closing is judged on committed work",
  otherCommit: `evidence {0} produced on another commit than HEAD: ${RERUN}`,
  dirty: `worktree modified (at verify time or since): commit, then ${RERUN}`,
  manual: `MANUAL verdict: a human attests (\`npx drwil attest <ID>\`), then ${RERUN}`,
  failed: `{0} verdict: go back to BUILD (\`node .githooks/state.mjs move BUILD\`) to fix`,
  criteria: `unproven acceptance criteria: {0} — link each to a contract with a check (or an attested Manual contract), then ${RERUN}`,
  noVerdict: `evidence {0} without a known verdict: ${RERUN}`,
  undeclared: `contract(s) modified without declaration: {0} — a regression, or a change to declare in the « Modified contracts » section of the brief (approved by the requester), then ${RERUN}`,
  noCriteria:
    'warning: brief "{0}" has no acceptance criterion — this workstream leaves no non-regression test for the next ones ("Acceptance criteria" section of the brief model)',
  startFrom: `start refused: activity {0} (start from SCOPING, EXPECTATION or REQUEST, or CLOSING once the closing PR is merged)`,
  startClosingBrief: 'start refused: CLOSING and brief {0} is still there — close it first ("Closing" recipe)',
  startClosingOpen:
    "start refused: CLOSING, the closing PR is not merged — wait for the merge (and update the main branch), then start again",
  startClosingUnknown: "start refused: CLOSING, the closing PR's merge is not established",
  settled: "CLOSING → SCOPING: the workstream's pull request is merged",
  settleOpen: "CLOSING: the workstream's pull request is not merged — the state stays CLOSING (back to SCOPING once the merge is seen)",
  settleUnknown: "CLOSING: the workstream's pull request merge is not established — the state stays CLOSING",
  nextOpen:
    "next refused: the previous workstream's pull request is not merged — wait for the merge (and update the main branch), then retry",
  nextUnknown: "next refused: the previous workstream's pull request merge is not established",
  startHuman: "start refused: it is a human decision (`/drwil-start` poll, or interactive terminal)",
  startBusy: "start refused: brief {0} is already active in the worktree {1}",
  startNotScoped: `start refused: "{0}" is not a scoped brief (scope block committed, brief not finished)`,
  startNoCriteria:
    'start refused: brief "{0}" has no acceptance criterion — each one, proven by a contract, becomes the non-regression of the next workstreams ("Acceptance criteria" section of the brief model)',
  closingNoCriteria:
    'closing refused: brief "{0}" has no acceptance criterion — write some, each proven by a contract, then run `drwil verify` again',
  startInvalid: `start refused: {0}`,
  started: `{0} → BUILD (started: {1}){2}`,
  mergeAuthorised: " — automatic merge authorised",
  forbidden: `transition {0} → {1} forbidden (from {0}: {2})`,
  briefOption: "--brief only opens an expectation (SCOPING → EXPECTATION)",
  briefNeeded: "opening an expectation requires --brief <docs/projects/….md>",
  resumed: `previous state invalid, resumed from neutral ({0}); `,
  closingRefused: `closing refused: {0}`,
  closingSignals: "What would make the closing fail, to fix while code can still change (`node .githooks/state.mjs move BUILD`):",
  stillThere: `back to SCOPING refused: {0} says it is done but is still there — condense it into docs/projects/journal.md, delete it and remove its index line ("Closing" recipe)`,
  humanDecision: `{0} → {1} is a human decision: interactive terminal required ("transitions" setting: human)`,
  confirm: `To move from {0} to {1}, type the target activity again ({1}): `,
  confirmRefused: "confirmation refused: state unchanged",
  noBriefs: "(no scoped brief: scope block committed and brief not finished)",
  notReady: ` · not ready: {0} decision(s) to make`,
  refine: " · to refine: review before starting it",
  pick: "Number of the brief to start: ",
  confirmStart: `Start {0}? Type START: `,
  askWorktree: "In a new sibling worktree? Type WORKTREE, otherwise Enter (this folder): ",
  askMerge: "Automatic merge at the end of the workstream? Type MERGE, otherwise Enter: ",
  notConfirmed: "✗ start not confirmed: state unchanged",
  unreadableState: `[drwil] governance state unreadable: {0}`,
  lotNone:
    "no lot chaining: the active brief has no two lots with at least one [IA] ('Increments' section, bullets « **Lot N — title** [IA|human] »)",
  lotActivity: "next lot refused: activity {0} — lots are chained in BUILD",
  lotDirty: "next lot refused: lot {0} is not committed (modified tree, or git state unknown) — commit first; nothing changed",
  lotLast: "next lot refused: lot {0} is the last [IA] lot and it is already done — close the brief",
  lotAdvanced: "lot {0} done → current lot: {1}{2}",
  lotLastDone: "lot {0} done: it is the last [IA] lot, closing is possible{1}",
  lotHumansLeft: "; [human] lot(s) to do, skipped: {0}",
  lotRemaining:
    "closing refused: [IA] lot(s) not done: {0} — chain them one by one, `node .githooks/state.mjs lot next` after each one's commit (the last one too)",
  lotCurrent: "Current lot: {0}",
  lotDone: "[IA] lots done: {0}",
  lotLeft: "[IA] lots left: {0}",
  lotHumans: "[human] lots to do (skipped by the chaining, recalled at closing): {0}",
  lotNothing: "none",
  branchUnmerged:
    "start refused: the current branch {0} is not merged into {1}; merge it, or go back to {1} (`git switch {1}`), then retry; nothing created",
  branchUnknown:
    "start refused: the merge of the current branch {0} is not established ({1}); go back to {2} (`git switch {2}`) or make gh reachable, then retry; nothing created",
  branchDirty:
    "start refused: the working tree has uncommitted changes; commit or stash them (`git stash -u`), then retry; nothing created",
  branchTaken:
    "start refused: branch {0} already exists; switch to it (`git switch {0}`) to resume the workstream, or delete it if stale, then retry; nothing created",
  branchFailed: "start refused: git switch failed ({0}); nothing created",
  branchCreated: "Branch created: {0} (from {1}).{2}",
  branchStale: "\ngit fetch failed: the branch starts from the local branch {0}, possibly behind the remote main branch",
  usage: `usage: node .githooks/state.mjs move <{0}> [--brief <docs/projects/….md>] [--request <text>] | start [<brief>] | lot [next] | reopen | briefs [--json] | reminder`,
};
