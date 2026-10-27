#!/usr/bin/env node
// Starting a workstream from the chat (`/drwil-start`, docs/ia-first.md, "Starting and closing"):
// the human decision is the answer to a poll, read by the tool, never by the model.
// - PreToolUse (poll): refuses a start poll that arrives with an answer already filled in or a
//   default value — the model does not answer in the human's place and preselects nothing (its
//   recommendation goes through the "(Recommended)" label).
// - PostToolUse (poll): reads the human's answer and starts the chosen brief
//   (`.githooks/state.mjs`, the only logic, valid for any tool). A multiple-choice poll queues the
//   chosen briefs, in the order of the poll's options, never in the order of the clicks: the agent
//   starts the next one after each closing (QUA-037).
// The same hooks serve Claude Code and Copilot CLI, which reads this settings file; only the poll
// formats differ. A poll that is not drwil's passes through untouched.
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NOT_NOW_RE, humanAnswer, inPollOrder, mergeAuthorised, parallelChosen, startPoll, worktreeChosen } from "./start-poll.mjs";

export { humanAnswer, inPollOrder, mergeAuthorised, parallelChosen, startPoll, worktreeChosen };

// The folder holding this hook's .claude/, never the current folder: it follows the agent's `cd`.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const TEXTS = {
  fr: {
    refused: "drwil : sondage de lancement refusé — il ne doit contenir ni réponse ni valeur par défaut ; c'est l'humain qui choisit.",
    notNow: "rien n'est lancé (réponse « Pas maintenant ») : l'état est inchangé.",
    noAnswer:
      "aucune réponse lue dans le sondage de lancement : rien n'est lancé, l'état est inchangé. Repli : `node .githooks/state.mjs start` dans un terminal interactif.",
    error: (m) =>
      `erreur au lancement (${m}) : rien n'est lancé, l'état est inchangé. Repli : \`node .githooks/state.mjs start\` dans un terminal interactif.`,
  },
  en: {
    refused: "drwil: start poll refused — it must contain neither an answer nor a default value; the human chooses.",
    notNow: "nothing started (answer « Not now »): the state is unchanged.",
    noAnswer:
      "no answer read in the start poll: nothing started, the state is unchanged. Fallback: `node .githooks/state.mjs start` in an interactive terminal.",
    error: (m) =>
      `error while starting (${m}): nothing started, the state is unchanged. Fallback: \`node .githooks/state.mjs start\` in an interactive terminal.`,
  },
};

/** What the agent reads after the poll: never silent on a drwil start poll. */
function tell(text) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `[drwil] ${text}`,
      },
    }),
  );
}

function language() {
  try {
    return JSON.parse(readFileSync(join(ROOT, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0;
  }
  const poll = startPoll(input);
  if (!poll) return 0;
  const event = input.hook_event_name;
  if (event === "PreToolUse") {
    if (!poll.prefilled) return 0;
    // Exit code 2: the tool blocks the call and gives this message back to the model.
    console.error(TEXTS[language()].refused);
    return 2;
  }
  if (event !== "PostToolUse") return 0;
  const T = TEXTS[language()];
  const choice = humanAnswer(input, poll);
  if (!choice) {
    tell(`✗ ${T.noAnswer}`);
    return 0;
  }
  // Several briefs (multiple choice, labels separated by commas; a brief path never holds one): a queue.
  const chosen = String(choice)
    .split(/,\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
  const [first, ...queue] = inPollOrder(chosen, poll.options);
  if ([first, ...queue].some((c) => NOT_NOW_RE.test(c))) {
    tell(T.notNow);
    return 0;
  }
  try {
    const autoMerge = mergeAuthorised(input, poll);
    // The new folder's state is written by its own start; this folder's state does not change.
    const worktree = async () => await import(pathToFileURL(join(ROOT, ".githooks", "worktree.mjs")).href);
    const r = parallelChosen(input, poll)
      ? await (await worktree()).launchParallel(ROOT, [first, ...queue], { autoMerge })
      : worktreeChosen(input, poll)
        ? await (await worktree()).launchInWorktree(ROOT, first, {
            autoMerge,
            queue,
          })
        : (await import(pathToFileURL(join(ROOT, ".githooks", "state.mjs")).href)).start(ROOT, first, { human: true, autoMerge, queue });
    tell(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  } catch (e) {
    // Never blocks the tool: the state stays unchanged, the Git gate remains; the agent is told why.
    tell(`✗ ${T.error(e?.message ?? String(e))}`);
  }
  return 0;
}

// Real paths on both sides: a project path through a symbolic link (macOS /var → /private/var) must
// still run the hook, not leave it silently idle.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    process.exitCode = await main();
  } catch {
    // An error never blocks the tool: the state stays unchanged, the Git gate remains.
    process.exitCode = 0;
  }
}
