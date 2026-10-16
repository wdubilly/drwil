# Projet : la consommation de tokens par chantier, mesurée chez tout projet

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/docs/recipes/track-consumption-per-increment.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/track-consumption-per-increment/SKILL.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/README.md
  - packages/drwil/test/kit.test.mjs
  - .githooks/consumption.test.mjs
  - .githooks/state.test.mjs
  - outils/consommation.mjs
  - outils/consommation.test.mjs
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : le script livré et ses textes, ses recettes, le registre livré
et celui du dépôt, la fiche mécanique (et sa copie), les tests ; les
copies du gabarit sont couvertes par `scopeMirrors` (QUA-035) ; l'outil
propre au dépôt est remplacé par la copie installée.)

## 1. Besoin

Demandé le 2026-10-16, pour le pilote de la 0.6.0 sur 2 ou 3 projets :
savoir ce que coûte un chantier chez eux. La mesure existe, mais seulement
dans ce dépôt (l’outil `consommation` du dépôt, journal du 2026-10-11) : elle lit
les journaux de session de Claude Code, attribue chaque réponse à la
branche du moment (`workstream/<fiche>`, `cadrage/<fiche>`), et donne
tokens (entrée, sortie, cache lu, cache écrit), total pondéré, temps actif
et modèles. La recette livrée, elle, dit qu'aucun script ne peut lire ces
données et demande une estimation à la main : c'est faux pour Claude Code.

Tranche aussi le point ouvert de l'index (« écrire automatiquement la
consommation d'un chantier à sa clôture, lot 2 de la mesure ») : le
pilote est le moment où ces chiffres servent.

## Décisions

- 2026-10-16 (demandeur) : livrer la mesure à tout projet pour le pilote.
- Proposé par l'agent, validé au lancement : la ligne de clôture va dans
  `.drwil/usage.jsonl`, versionné (les chiffres du pilote voyagent avec le
  projet) ; seuls les champs de consommation sont lus, jamais un contenu
  de message ; jamais bloquant.

## Critères d'acceptation

(contrat à créer par ce chantier, avec son champ Origine.)

- Livré à tout projet : `node .githooks/consumption.mjs` donne, par
  chantier (branches `workstream/<fiche>` et `cadrage/<fiche>`
  regroupées), les tokens en quatre catégories, un total pondéré
  indicatif, le temps actif et les modèles, lus dans les journaux de
  session de Claude Code ; il ne lit que les champs de consommation ; sans
  journal, il le dit et sort en succès — `QUA-042`
- Livré à tout projet : à la clôture, `node .githooks/consumption.mjs
  --record <fiche>` ajoute une ligne au format de la recette à
  `.drwil/usage.jsonl`, jamais deux pour le même chantier ; le rappel
  CLOSING et la recette de clôture le demandent ; sans journal lisible
  (autre outil IA), la recette garde l'estimation à la main — `QUA-042`

## 2. Hors périmètre

- La lecture des historiques d'autres outils (Copilot CLI garde sa voie
  `session_store_sql` décrite dans la recette ; Cursor, Codex, Gemini).
- Un coût en euros (les tarifs changent ; le pondéré reste indicatif).
- Le tableau de bord : le module optionnel lit déjà `.drwil/usage.jsonl`.

## 3. Contraintes

- Hooks sans dépendance, gabarit en anglais, messages dans la langue du
  projet ; script autonome hors du moteur (pas un contrôle).
- Les journaux contiennent toute la conversation : n'en extraire que
  `usage`, modèle, horodatage, branche (SEC-007 : rien d'autre n'est
  affiché ni écrit).
- Ce dépôt : l’outil `consommation` et son test sont retirés au profit
  de la copie installée et de `.githooks/consumption.test.mjs` (à créer) ; la carte
  suit (QUA-040).
- Contrats à citer : QUA-040 (carte), QUA-018 (dépôt vs livrable), QUA-001
  (fichier plafonné), QUA-004 (couverture des hooks).

## 4. Lots

- **Lot 1** — le script livré : port anglais et bilingue de l'outil du
  dépôt, regroupement cadrage + chantier, option `--record`, tests à 100 %,
  contrat à créer et son contrôle dédié ; retrait de l'outil du
  dépôt ; carte et fiche mécanique.
- **Lot 2** — le parcours : rappel CLOSING, recettes de clôture et de
  consommation, skill, README du paquet, ligne « Unreleased ».

## Reprise

Rien de commencé.
