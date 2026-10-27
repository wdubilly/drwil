// Reading of a shell text for bash-guard.mjs: split into commands, then detection of a skip of the
// git hooks (QUA-114). Pure functions, no file read.

// git options that take the next word as their value (before the subcommand, then for commit).
const GIT_VALUED = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--super-prefix"]);
const COMMIT_VALUED = new Set(["-m", "-F", "-c", "-C", "-t", "--message", "--file", "--author", "--date", "--fixup", "--squash"]);
const CONFIG_WRITE = new Set([
  "--unset",
  "--unset-all",
  "--add",
  "--replace-all",
  "--remove-section",
  "--rename-section",
  "--edit",
  "-e",
  "set",
  "unset",
  "edit",
  "remove-section",
  "rename-section",
]);
const CONFIG_READ = new Set(["--get", "--get-all", "--get-regexp", "--get-urlmatch", "--list", "-l", "get", "list"]);
const CONFIG_VALUED = new Set(["--file", "-f", "--blob", "--type", "--default", "--comment"]);
const HOOKS_KEY = /^core\.hookspath$/i;
const HOOKS_OVERRIDE = /^(?:--config-env=)?core\.hookspath=/i;

/**
 * Commands of a shell text, each one a list of words (quotes removed), and the quoted strings,
 * analysed again as commands (`sh -c "…"`). A linear scan, no regular expression on the whole text.
 * `literal`: a `\` stays in the word, quoted or not (a Windows path, `C:\Users\…`).
 */
export function split(text, literal = false) {
  const commands = [[]];
  const quoted = [];
  let word = null;
  let quote = null;
  let inner = "";
  const end = () => {
    if (word !== null) commands[commands.length - 1].push(word);
    word = null;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === quote) {
        quote = null;
        quoted.push(inner);
        continue;
      }
      const escaped = ch === "\\" && !literal && quote === '"' && i + 1 < text.length;
      const add = escaped ? text[++i] : ch;
      word += add;
      inner += add;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inner = "";
      word = word ?? "";
    } else if (ch === "\\" && !literal && i + 1 < text.length) word = (word ?? "") + text[++i];
    else if (" \t\r".includes(ch)) end();
    else if (";&|\n()`".includes(ch)) {
      end();
      commands.push([]);
    } else word = (word ?? "") + ch;
  }
  end();
  return { commands: commands.filter((c) => c.length), quoted };
}

/** A `git commit` short-flag cluster that holds -n (--no-verify), before any flag taking a value. */
function clusterSkips(arg) {
  if (!/^-[a-zA-Z]+$/.test(arg)) return false;
  for (const letter of arg.slice(1)) {
    if (letter === "n") return true;
    if ("mFcCt".includes(letter)) return false;
  }
  return false;
}

/** Whether one command (its words) skips the git hooks or writes core.hooksPath. */
function commandSkips(words) {
  const at = words.findIndex((w) => /(^|\/)git$/.test(w));
  if (at < 0) return false;
  let i = at + 1;
  for (; i < words.length && words[i].startsWith("-"); i++) {
    if (HOOKS_OVERRIDE.test(words[i]) || HOOKS_OVERRIDE.test(words[i].replace(/^-c/, ""))) return true;
    if (GIT_VALUED.has(words[i]) && HOOKS_OVERRIDE.test(words[i + 1] ?? "")) return true;
    if (GIT_VALUED.has(words[i])) i++;
  }
  const sub = words[i];
  const args = words.slice(i + 1);
  if (args.some((a) => /^--no-veri(?:fy?)?$/.test(a))) return true;
  if (sub === "commit") {
    for (let k = 0; k < args.length && args[k] !== "--"; k++) {
      if (clusterSkips(args[k])) return true;
      if (COMMIT_VALUED.has(args[k])) k++;
    }
  }
  if (sub !== "config") return false;
  if (args.some((a) => CONFIG_WRITE.has(a)) && args.some((a) => HOOKS_KEY.test(a) || a === "core")) return true;
  if (args.some((a) => CONFIG_READ.has(a))) return false;
  const positional = args.filter((a, k) => !a.startsWith("-") && !CONFIG_VALUED.has(args[k - 1]));
  const key = positional.findIndex((a) => HOOKS_KEY.test(a));
  return key >= 0 && positional.length > key + 1;
}

/**
 * Whether a shell command skips the git hooks or writes, removes or overrides core.hooksPath
 * (QUA-114): any command of the text, quoted strings included (`sh -c "…"`, `eval '…'`).
 */
export function skipsHooks(command, depth = 0) {
  if (depth > 3) return false;
  const text = String(command);
  const mentionsHooks = /hookspath/i.test(text);
  // GIT_CONFIG_COUNT/KEY_<n>/VALUE_<n>/PARAMETERS… set a configuration for one command.
  if (mentionsHooks && /\bGIT_CONFIG_\w*=/.test(text)) return true;
  if (mentionsHooks && /\.git[\\/]config\b/.test(text) && /\bsed\s+-i|\btee\b|>/.test(text)) return true;
  const { commands, quoted } = split(text);
  return commands.some(commandSkips) || quoted.some((q) => skipsHooks(q, depth + 1));
}
