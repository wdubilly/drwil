# Intention : Copilot CLI lance bien les hooks déclarés avec `${CLAUDE_PROJECT_DIR}`

**Statut** : proposée le 2026-10-17 — limite du chantier « les hooks
trouvent la racine du projet par l'emplacement de leur fichier » (journal
du 2026-10-17).

## Besoin

Les commandes des hooks, dans `.claude/settings.json`, trouvent leur
fichier par `${CLAUDE_PROJECT_DIR}` (par exemple `node
"${CLAUDE_PROJECT_DIR}/.githooks/state.mjs"`). Copilot CLI lit ce même
fichier de réglages (en-tête de `.claude/hooks/prompt-hook.mjs`). Si
Copilot CLI ne remplace pas `${CLAUDE_PROJECT_DIR}`, ou la remplace par
autre chose, ses hooks ne se lancent pas du tout : pas de rappel d'état,
pas de sondage de lancement, pas de garde de cadrage — en silence.

Depuis QUA-044 (les hooks lisent la racine du projet, pas le dossier
courant), un hook lancé trouve la bonne racine par l'emplacement de son
fichier ; reste à savoir s'il est lancé.

## Existant (vérifié le 2026-10-17)

- `.claude/settings.json` : chaque commande de hook commence par
  `node "${CLAUDE_PROJECT_DIR}/…"`.
- Comportement de Copilot CLI face à cette variable : **non vérifié**
  (ni documentation lue, ni essai).

## Questions à trancher

- [décision] Vérifier par un essai réel sous Copilot CLI (hook minimal qui
  écrit un fichier), ou par sa documentation ?
- [décision] Si Copilot ne la remplace pas : chemins relatifs dans les
  commandes (lancées depuis la racine ?), ou une déclaration propre à
  Copilot ?
