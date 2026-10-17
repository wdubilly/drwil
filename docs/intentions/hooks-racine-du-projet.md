# Intention : les hooks de l'outil IA lisent la racine du projet, pas le dossier courant

**Statut** : proposée le 2026-10-16 — défaut constaté en séance.

## Besoin

Les hooks Claude livrés prennent `process.cwd()` pour racine du projet,
avec pour hypothèse « the tool runs the hook with the project folder as
cwd ». Constaté le 2026-10-16 : après un `cd packages/drwil` dans une
commande de l'agent, le dossier courant de la session a suivi ; au
message suivant, le rappel de gouvernance a lu un état absent et annoncé
SCOPING alors que l'état réel était BUILD, et il a écrit
son empreinte dans un dossier `.drwil` parasite créé sous `packages/drwil` (supprimé à la main). Un agent qui
change de dossier reçoit donc une activité fausse, et un lancement par
sondage pourrait chercher `.githooks/state.mjs` au mauvais endroit.

## Existant (vérifié le 2026-10-16)

- `packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs`
  et `packages/drwil/templates/common/tools/claude/.claude/hooks/scope-reminder.mjs` :
  `const ROOT = process.cwd()`.
- Le rappel écrit son empreinte dans `.drwil/reminder.json` (si présent) sous la
  racine qu'on lui donne (`.githooks/state.mjs`).
- Sans effet sur le paquet : `.drwil/` n'est pas dans le champ `files`
  de `packages/drwil/package.json`.

## Questions à trancher

- [décision] Racine prise où : variable d'environnement de l'outil
  (`CLAUDE_PROJECT_DIR`, à vérifier pour Claude Code et Copilot CLI),
  racine git (`git rev-parse --show-toplevel`), ou recherche du
  `.drwil/` le plus proche en remontant ?
- [décision] Les autres hooks livrés (garde des commandes, glossaire des
  identifiants) suivent-ils la même règle dans le même chantier ?
