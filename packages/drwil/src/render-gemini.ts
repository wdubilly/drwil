// Form of the Gemini hook commands, split from render.ts (QUA-001). Gemini has one `command` field,
// run by bash on Linux and macOS and by PowerShell on Windows: no launcher is valid in both, so `init`
// picks the form of the platform it runs on (QUA-215). Outside Windows the command goes through the
// `sh` launcher, which says why node is missing; on Windows it stays the plain `node` call.
const LAUNCHER = String.raw`sh \"$GEMINI_PROJECT_DIR/.gemini/hooks/drwil-node.sh\"`;

/** `{{geminiNodeWarn}}` precedes an informative hook (exit 1: a warning), `{{geminiNodeGuard}}` a guard (exit 2: refusal). */
export function geminiNode(platform: string = process.platform): Record<string, string> {
  if (platform === "win32") return { geminiNodeWarn: "node ", geminiNodeGuard: "node " };
  return { geminiNodeWarn: `${LAUNCHER} 1 `, geminiNodeGuard: `${LAUNCHER} 2 ` };
}
