# Intention : jouer en CI les formes PowerShell des hooks de repli

**Statut** : proposée le 2026-11-02 — limite du chantier `hooks-sans-dependance-au-shell`.

## Besoin

Les commandes de repli « `node` introuvable » écrites en PowerShell ne sont prouvées par aucun test exécuté : un
défaut de syntaxe ne se verrait que chez un développeur sous Windows.

## Existant (relevé le 2026-11-02)

- Le champ `powershell` du hook de Copilot (`packages/drwil/templates/common/tools/copilot/.github/hooks/drwil.json`)
  teste `Get-Command node` ; il est vérifié comme du texte seulement.
- Les tests qui lancent les commandes `sh` (`packages/drwil/test/claude-hooks.test.mjs`, `packages/drwil/test/kit.test.mjs`) sont
  sautés sous Windows ; la matrice `kit-tests` de `.github/workflows/ia-first.yml` couvre pourtant Linux, macOS et Windows.
- QUA-215 déclare la limite (« humaine »).

## Questions à trancher

- [décision] Jouer la forme PowerShell dans le test, sous Windows seulement (`powershell` ou `pwsh` du runner) ?
- [décision] Sous Linux, `pwsh` est-il installable sur la CI pour jouer aussi cette forme, ou le coût dépasse-t-il le gain ?
- [question] Faut-il aussi jouer sous Windows les commandes `sh` de Claude Code (Git Bash est présent sur les runners) ?
