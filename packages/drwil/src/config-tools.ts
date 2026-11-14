// Arbres installés selon les outils IA choisis, à part de config.ts : ce fichier, que presque chaque chantier
// touche, ne fait plus tomber l'attestation de QUA-064, qui ne juge que ce choix (QUA-081).

/**
 * Copilot CLI reads .claude/ (settings, hooks, skills) itself: the tree is installed for it too. Gemini CLI
 * runs the same hook scripts (one set for every tool) from its own .gemini/settings.json.
 */
export const usesClaudeTree = (tools: readonly string[]): boolean => ["claude", "copilot", "gemini"].some((t) => tools.includes(t));
