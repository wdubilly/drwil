// Queue under construction (QUA-037): the human builds the queue by chained single-choice polls, one brief
// per answer, then finishes it; only the poll hook (.claude/hooks/queue-poll.mjs) calls these functions, from the
// human's answer — never the agent, which has no command for it. The draft is `queue_draft` in SCOPING.
import { posix } from "node:path";
import { queueable, scopedBriefs } from "./briefs.mjs";
import { fill } from "./state-texts.mjs";
import { readState, texts } from "./state-validate.mjs";
import { start, writeState } from "./state.mjs";

/** Refusal if the state does not allow building a queue (SCOPING without a queue waiting), else null. */
function notBuildable(root, T) {
  const { state, problems } = readState(root);
  // An invalid state is never overwritten: it would hide it (read as neutral SCOPING).
  if (problems.length || state.activity !== "SCOPING")
    return fill(T.draftNotScoping, problems.length ? problems.join(" ; ") : state.activity);
  return state.queue?.length ? fill(T.draftHasQueue, state.queue.join(", ")) : null;
}

/** Adds `brief` to the queue under construction: a ready, scoped brief, once. `{ code, message }`. */
export function draftAdd(root, brief) {
  const T = texts(root);
  const refused = notBuildable(root, T);
  if (refused) return { code: 1, message: refused };
  const path = posix.normalize(
    String(brief ?? "")
      .trim()
      .replace(/\\/g, "/"),
  );
  if (!scopedBriefs(root).some((b) => b.path === path)) return { code: 1, message: fill(T.startNotScoped, brief) };
  if (!queueable(root, path)) return { code: 1, message: fill(T.queueNotReady, path) };
  const state = readState(root).state;
  const draft = state.queue_draft ?? [];
  if (draft.includes(path)) return { code: 1, message: fill(T.draftDuplicate, path) };
  writeState(root, { ...state, queue_draft: [...draft, path] });
  return { code: 0, message: fill(T.draftAdded, path, [...draft, path].join(", ")) };
}

/** Finishes the queue: starts its head, the rest queued (and the merge the human decided). The draft is then gone. */
export function draftFinish(root, { autoMerge = false } = {}) {
  const T = texts(root);
  const refused = notBuildable(root, T);
  if (refused) return { code: 1, message: refused };
  const [head, ...rest] = readState(root).state.queue_draft ?? [];
  if (!head) return { code: 1, message: T.draftEmpty };
  return start(root, head, { human: true, autoMerge, queue: rest });
}
