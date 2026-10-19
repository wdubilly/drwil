# Intention : les commandes `/drwil-*` et le sondage de lancement sous Gemini CLI

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Gemini CLI ne lit pas `.claude/skills/` : ses skills se trouvent sous
`.gemini/skills/` ou `.agents/skills/`, et il a un outil `ask_user` dont le
format diffère de celui de Claude Code et de Copilot. Sous Gemini, un chantier
se lance donc par `node .githooks/state.mjs start` dans un terminal (dit dans la
matrice de `docs/ia-first.md`).

## Existant (vérifié le 2026-10-19)

- Gemini CLI 0.61.0 : hooks `BeforeTool`/`AfterTool` actifs sur `ask_user`
  possibles ; skills sous `.agents/skills/` ; aucune de ces deux voies n'est livrée.

## Questions à trancher

- [décision] Livrer les skills sous `.agents/skills/` (copie du même contenu,
  une source) et un sondage `ask_user` lu par `.claude/hooks/prompt-hook.mjs` ?
