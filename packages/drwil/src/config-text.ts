// Texts rendered into the template, split from config.ts (QUA-001).
// Texts rendered into the template, in English like it: `lang` is the project's language, not the kit's.
export const TEXT = {
  // The project's language, as the AGENTS.md instruction names it to the agent.
  languages: { fr: "French", en: "English" } as Record<string, string>,
  description: "(to describe: what the application does, for whom)",
  layer: (l: string) => `- \`${l}/\` — see \`${l}/AGENTS.md\``,
  noLayer: "No separate layer: the code lives at the repository root.",
  stackNote: "Detected at install time from project files: to be confirmed by the user.",
  stackUndecided: "Not decided. The user chooses it; an AI proposes one and waits for approval before writing application code.",
  ciLine: (f: string) => ` and in CI (\`${f}\`)`,
  dirs: {
    projects: "docs/projects",
    intentions: "docs/intentions",
    recipes: "docs/recipes",
    contracts: "docs/contracts.md",
    index: "docs/projects/pending.md",
  },
};
