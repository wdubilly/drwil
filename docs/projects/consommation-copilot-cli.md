# Projet : la consommation de Copilot CLI est mesurée comme celle de Claude Code

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 1)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/consumption*.mjs
  - .githooks/consumption.mjs
  - .githooks/consumption-log.mjs
  - .githooks/consumption-format.mjs
  - .githooks/consumption-texts.mjs
  - .drwil/ia-first.json
  - .githooks/consumption.test.mjs
  - packages/drwil/src/serve-journal.ts
  - packages/drwil/serve/page.html
  - packages/drwil/test/serve.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/track-consumption-per-increment.md
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/track-consumption-per-increment/SKILL.md
  - .claude/skills/track-consumption-per-increment/SKILL.md
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - .githooks/state-context-texts.mjs
  - docs/intentions/consommation-autres-outils.md
  - README.md
  - packages/drwil/README.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
-->

## 1. Besoin

`.githooks/consumption.mjs` ne lit que les journaux de Claude Code (QUA-042). Avec Copilot CLI il faut aujourd'hui
écrire la ligne à la main (`"source": "estimate"`). Le demandeur veut une mesure pour Copilot CLI qui remonte
comme celle de Claude Code.

## Critères d'acceptation

- Sous Copilot CLI, `node .githooks/consumption.mjs` lit les jetons, le modèle et la durée des sessions locales et
  attribue chaque chantier par sa branche, comme avec Claude Code ; sans journal lisible, il le dit, sans bloquer — `QUA-042`
- `--record <fiche>` écrit la ligne de `.drwil/usage.jsonl` avec `"source"` nommant l'outil ; jamais de contenu de
  message lu ni écrit — `QUA-042`
- Un chantier mené avec les deux outils (commencé sous Claude Code, repris sous Copilot CLI, ou l'inverse) : les
  consommations des deux journaux attribuées à sa branche s'additionnent sur une seule ligne de `.drwil/usage.jsonl`,
  qui nomme chaque outil et sa part ; aucune session comptée deux fois — `QUA-042`
- `drwil serve` montre, pour chaque chantier, la répartition de la consommation par outil (Claude Code, Copilot CLI) ;
  une ligne ancienne sans outil nommé reste comptée et s'affiche « outil inconnu » ; seuls le nom de l'outil et ses
  totaux atteignent l'API, jamais une autre colonne du fichier — `QUA-304`

## Contrats modifiés

- `.githooks/consumption.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/consumption-log.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/consumption-format.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/consumption-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-context-texts.mjs` — texte du rappel CLOSING (QUA-113) : Claude Code et Copilot CLI lus, les autres outils estimés à la main (validé par le demandeur le 2026-11-15)

## 2. Hors périmètre

- Une centralisation hors du dépôt : la remontée reste `.drwil/usage.jsonl`, versionné par dépôt, vu par le tableau de bord.
- Les autres outils (Gemini, Codex, Cursor).
- La répartition par outil dans le tableau de bord statique (`packages/drwil/templates/common/optional/dashboard/dashboard.mjs`) : seul `drwil serve` l'affiche.

## 3. Contraintes

- Décidé le 2026-11-12, le demandeur déléguant la décision : lire les journaux de session locaux de Copilot CLI
  (dossier de sessions de l'utilisateur) en plus de ceux de Claude Code ; centralisation = `.drwil/usage.jsonl` par dépôt.
- Lot 1 : reconnaître d'abord le format réel des journaux de Copilot CLI (champs de jetons, modèle, branche) sur une
  session locale ; si un champ manque (jetons de cache, branche), le dire dans la recette plutôt que l'inventer.
- Plafond de 200 lignes par fichier : le lecteur Copilot va dans un fichier neuf si `.githooks/consumption-log.mjs` approche du plafond.

## 4. Décisions

- 2026-11-12 : source et centralisation tranchées (journaux locaux, fichier par dépôt).
- 2026-11-14 : un chantier mené avec Claude Code et Copilot CLI additionne les deux consommations sur une ligne qui
  nomme chaque outil ; le bloc scope couvre gabarits (motif, un lecteur Copilot dans un
  fichier neuf compris) et copies installées de `consumption*.mjs` (la copie d'un fichier neuf s'ajoute par un commit
  de cadrage séparé) — demande du demandeur.
- 2026-11-15 : les trois limites hors cadre relevées à la fin de BUILD (compétence drwil-usage, rappel CLOSING,
  intention des autres outils) sont traitées dans ce chantier (« Traiter maintenant » au sondage `drwil-limite`) ;
  le bloc scope s'élargit à ces fichiers — demande du demandeur.
- 2026-11-15 : une quatrième limite, quatre textes lus par l'utilisateur (`README.md`, `packages/drwil/README.md`,
  recette `docs/recipes/working-with-branches.md` et son gabarit) qui disent la consommation lue des seuls journaux de Claude Code,
  est traitée dans ce chantier (« Traiter maintenant » au sondage `drwil-limite`) ; documentation seule — demande du demandeur.
- 2026-11-14 : la répartition par outil s'affiche dans `drwil serve` (agrégation `packages/drwil/src/serve-journal.ts`, page
  `serve/page.html`) — demande du demandeur. Le tableau de bord statique (`packages/drwil/templates/common/optional/dashboard/dashboard.mjs`) n'est pas touché.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — lecteur Copilot CLI** [IA] : reconnaître le format, lire jetons, modèle, durée et branche ; tests avec
  des journaux factices. Critère de sortie : tests de `.githooks/consumption.test.mjs` verts.
- **Lot 2 — enregistrement, recette, contrat** [IA] : `--record` pour Copilot CLI et pour un chantier mené avec les deux
  outils (parts additionnées, chaque outil nommé), répartition par outil dans `drwil serve`, recette et QUA-042 à jour, architecture et
  `docs/projects/kit-mechanics.md`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-15) : lot 1 fait. Format relevé sur les sessions locales de Copilot CLI
  (`~/.copilot/session-state/<session>/events.jsonl`, ou `$COPILOT_HOME/session-state`), toutes les sessions de
  l'utilisateur dans un seul dossier : un événement `session.usage_record` par appel de modèle (`data.usage` :
  `model`, `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `accounting.usageId` unique ; les
  appels d'un sous-agent sont dans le journal du parent, avec `agentId`, sans dossier de session propre) ; la branche et
  le projet viennent du dernier `session.start` (`data.context`) ou `session.context_changed` (`data` :
  `cwd`, `gitRoot`, `branch`). `inputTokens` inclut le cache lu et écrit (les totaux de `session.shutdown` les
  retranchent) : l'entrée sans cache est la différence. Aucun champ manquant (jetons de cache et branche présents).
  `readCopilotLog(texte, racine)` et `copilotFolder(env)` dans `.githooks/consumption-log.mjs` (158 lignes, réexportés par
  `.githooks/consumption.mjs`), même forme de réponse que `readLog` ; tests dans `.githooks/consumption.test.mjs`. `main` ne lit
  pas encore les sessions de Copilot CLI.
- **Lot 2** (2026-11-15) : fait. `main` lit aussi `copilotFolder()` (`--copilot-logs` pour un autre dossier ; un
  journal qui ne cite pas le chemin du projet n'est pas analysé), clés préfixées par l'outil, `aggregateTools` donne la
  part de chaque outil ; `usageLine` écrit `source` (`claude-code-logs`, `copilot-cli-logs`, les deux joints par `+`)
  et `tools` pour un chantier à deux outils. `drwil serve` : `tools` par chantier (`summarizeUsage`), affiché sous
  chaque chantier, contrat QUA-304 et contrôle `tests-qua-304`. Recette, QUA-042, carte, kit-mechanics, changelog à jour.
- **Prochaine étape** : vérifier et clore.
