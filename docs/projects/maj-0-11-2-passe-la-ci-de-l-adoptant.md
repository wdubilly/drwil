# Projet : la première mise à jour vers la 0.11.2 passe la CI de l'adoptant

**Statut** : cadré le 2026-11-24.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/guarantees-e2e-tools.ts
  - packages/drwil/src/kit-update.ts
  - packages/drwil/src/doctor-fix.ts
  - packages/drwil/test/mise-a-jour-empreinte.test.mjs
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Essai avant publication, le 2026-11-24 : le tarball de `master` (0.11.2) mis sur `marinade-poulet` (GitLab, kit 0.11.1) par
`npx drwil init` commite sans erreur, mais le pipeline GitLab de la branche pousse rouge au seul contrôle « brief scope » :
`f0d38bf: 1 file(s) outside briefs without a Drwil-Brief trailer` (rejeu local : `node base-checks.mjs --base origin/main`).

Cause relevée : la CI rejoue les contrôles avec les hooks de la branche principale (QUA-113), donc avec le garde de la 0.11.1.
Ce garde ne laisse changer dans `.drwil/ia-first.json` que les réglages recalculés par `init` (QUA-238). Or la mise à jour
resserre dans le même commit les `paths` de `coverage-root` et `coverage-diff-root` (de `["**"]` à `*.js`, `src/**`…,
`repathConfig`, QUA-141) : le garde de `main` refuse le fichier. Tout adoptant en 0.11.1 dont ces contrôles sont encore sur
`["**"]` aurait le même rouge à sa première mise à jour. Les autres contrôles du pipeline passent (e2e compris).

## Critères d'acceptation

- La mise à jour ne resserre pas les `paths` d'un contrôle dans le commit qui installe le garde capable de l'admettre : tant que
  le garde du projet, avant la mise à jour, ne sait pas admettre cette réécriture, `init` laisse les `paths` à `["**"]` et le dit
  dans son compte rendu (« reste à décider » : `drwil doctor --fix` les resserre) — `QUA-238`
- Une fois le garde de la 0.11.2 dans la branche principale, la mise à jour suivante et `drwil doctor --fix` resserrent les `paths`
  comme avant, et le commit passe le garde de la branche principale — `QUA-238`
- Un projet installé en 0.11.1 puis mis à jour avec le tarball de la branche passe `node base-checks.mjs --base origin/main` sur
  le commit de mise à jour (copie jetable de `marinade-poulet`) — `QUA-238`

## Contrats modifiés

- `QUA-238` — ancien critère : « un commit de mise à jour du kit est reconnu par son manifeste » — raison : il ajoute que la
  mise à jour n'écrit pas, dans le commit qui installe le garde, une réécriture de `paths` que le garde du projet avant la
  mise à jour n'admet pas (validé par le demandeur le 2026-11-24)

## 2. Hors périmètre

- Assouplir le garde de la branche principale ou faire juger la CI par le garde de la branche : ce serait ouvrir le contournement
  que QUA-113 ferme.
- Le défaut bash 3.2 du script GitLab (fiche `bash-3-2-du-pipeline-gitlab-livre`).
- Fusionner les deux passes de couverture d'une couche à 100 % (note du 2026-11-24).

## 3. Contraintes

- Reproduire d'abord : un test où une mise à jour d'un projet à garde ancien resserre les `paths` (contre le code actuel) et où
  le garde ancien refuse.
- Le critère « le garde du projet l'admet » se lit sur le projet avant la mise à jour (son `.githooks/scope-gate-kit.mjs` exporte
  `kitPathsOf`), jamais sur la version annoncée.
- Le gain de vitesse annoncé reste acquis : le resserrement arrive à la mise à jour suivante ou par `doctor --fix`.
- La recette réelle est exigée : copie de `marinade-poulet` (kit 0.11.1), tarball de la branche, pas l'original.
- On édite le gabarit et le paquet, puis `npm run installer-depot` (QUA-018). Fiche du dépôt drwil, pas du livrable.

## 4. Décisions

- D1 (2026-11-24, demandeur : « ok go ») : on corrige côté `init`, jamais en assouplissant le garde de `main`.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — le resserrement attend le garde** [IA] : test qui reproduit, puis correctif de `repathConfig`/`finishUpdate`,
  compte rendu, contrat `QUA-238`, ligne « Unreleased » du changelog.
- **Lot 2 — recette réelle** [humain] : tarball de la branche sur une copie de `marinade-poulet`, rejeu du garde de `main`.

## 7. Reprise

- **Dernier état** (2026-11-24) : cadré, rien commencé. Preuve de départ : pipeline GitLab 3110028564 de
  `marinade-poulet` (branche `workstream/kit-update`), contrôle « brief scope ».
- **Prochaine étape** : le lot 1.
