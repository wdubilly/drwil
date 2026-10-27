// Whether a citation is a path (split from check-docs.mjs).

const EXT_RE = /\.(md|mdc|mjs|cjs|js|ts|tsx|jsx|py|sh|json|ya?ml|toml|txt)$/;

// Known prefixes (root + project layers): a citation outside them without a known extension is no path ("minimal/full").
const ROOT_PREFIXES = [
  "docs/",
  ".githooks/",
  ".claude/",
  ".github/",
  ".cursor/",
  ".drwil/",
  "scripts/",
  "AGENTS.md",
  "README.md",
  "INSTALL.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".gitlab-ci.yml",
  ".gitignore",
  ".env.example",
  "docker-compose.yml",
];
export function pathTest(cfg) {
  const knownPrefixes = [...ROOT_PREFIXES, ...(cfg.layers ?? []).map((l) => `${l}/`), ...(cfg.layerPrefixes ?? []).map((p) => `${p}/`)];
  return (s) => {
    if (/^(https?:\/\/|-|\$)/.test(s) || /[<>{}*?|=:@]/.test(s)) return false;
    if (EXT_RE.test(s)) return true;
    return knownPrefixes.some((p) => s.startsWith(p));
  };
}
