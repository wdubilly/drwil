# Projet : la consommation de Copilot CLI est mesurée comme celle de Claude Code

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 1)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-log.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-format.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-texts.mjs
  - .githooks/consumption.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/track-consumption-per-increment.md
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
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

## 2. Hors périmètre

- Une centralisation hors du dépôt : la remontée reste `.drwil/usage.jsonl`, versionné par dépôt, vu par le tableau de bord.
- Les autres outils (Gemini, Codex, Cursor).

## 3. Contraintes

- Décidé le 2026-11-12, le demandeur déléguant la décision : lire les journaux de session locaux de Copilot CLI
  (dossier de sessions de l'utilisateur) en plus de ceux de Claude Code ; centralisation = `.drwil/usage.jsonl` par dépôt.
- Lot 1 : reconnaître d'abord le format réel des journaux de Copilot CLI (champs de jetons, modèle, branche) sur une
  session locale ; si un champ manque (jetons de cache, branche), le dire dans la recette plutôt que l'inventer.
- Plafond de 200 lignes par fichier : le lecteur Copilot va dans un fichier neuf si `.githooks/consumption-log.mjs` approche du plafond.

## 4. Décisions

- 2026-11-12 : source et centralisation tranchées (journaux locaux, fichier par dépôt).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — lecteur Copilot CLI** [IA] : reconnaître le format, lire jetons, modèle, durée et branche ; tests avec
  des journaux factices. Critère de sortie : tests de `.githooks/consumption.test.mjs` verts.
- **Lot 2 — enregistrement, recette, contrat** [IA] : `--record` pour Copilot CLI, recette et QUA-042 à jour, architecture et
  `docs/projects/kit-mechanics.md`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.
