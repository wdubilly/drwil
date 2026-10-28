// `node .githooks/state.mjs lot [next]` (split from state-cli.mjs): the current lot and the move to the next one.
import { lotLines, lotStatus, nextLot } from "./state-lots.mjs";
import { readState, texts } from "./state-validate.mjs";

/** Prints the lots of the active brief, or moves on to the next one; returns the exit code. */
export function lotCommand(args, root) {
  const read = readState(root);
  if (args[1] === "next") {
    const r = nextLot(root, read);
    if (r.code !== 0) console.error(`✗ ${r.message}`);
    else {
      console.log(`✓ ${r.message}\n${lotLines(root, lotStatus(root, readState(root))).join("\n")}`);
    }
    return r.code;
  }
  const status = lotStatus(root, read);
  console.log(status ? lotLines(root, status).join("\n") : texts(root).lotNone);
  return 0;
}
