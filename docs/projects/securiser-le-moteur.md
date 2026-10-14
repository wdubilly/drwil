# Projet : sécuriser le moteur (désinstallation, contrôles non exécutés, barrière de périmètre)

**Statut** : cadré le 2026-10-14 — lots 1, 2, 3a, 3b et 4 faits (2026-10-14), clôture à faire.
**Risque** : HIGH

<!-- scope
files:
  - packages/drwil/src/manifest.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - .github/workflows/ia-first.yml
  - outils/miroirs.json
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - docs/contracts.md
-->

(cadrage provisoire : à confirmer au démarrage de chaque lot.)

## 1. Besoin

Phase 1 de la feuille de route du demandeur (2026-10-14), priorité P0 : ne
jamais déclarer le système sûr quand ses garanties ne sont pas établies.
Relevé dans le code le 2026-10-14 : `removeObsolete` et `uninstall`
(`packages/drwil/src/manifest.ts`) font `join(targetDir, rel)` sans valider
`rel` : un manifeste `.drwil/installed-files.json` (si présent) malveillant (chemin
absolu, `../`, lien symbolique sortant du dépôt) peut faire supprimer un
fichier hors du dépôt, y compris quand l'empreinte concorde.

## 2. Hors périmètre

- Les tests de bout en bout du cycle complet et des contournements
  (`docs/projects/preuves-de-bout-en-bout.md`).
- Le format du manifeste lui-même (`.drwil/install.json` (si présent) : chantier
  « fiabiliser le package »).

## 3. Contraintes

- Contrats concernés : QUA-013 (contrôle non exécuté n'est pas passé),
  QUA-016 (rappel de cadrage), QUA-019 (pas de contournement). Aucun
  contrat du registre ne porte sur la portée des suppressions : à proposer
  au demandeur (nouveau contrat) à la clôture.
- Les fichiers `.githooks/` sont des copies du gabarit : modifier le gabarit
  puis `npm run installer-depot` (QUA-018).
- Un fichier de code reste sous 400 lignes (QUA-001) ; couverture des hooks
  à 100 % (QUA-004).

## 4. Décisions

- **2026-10-14 — Priorité** : ce chantier passe en tête de l'ordre de
  réalisation, avant le catalogue (décidé par le demandeur).

- **2026-10-14 — Chemin refusé** : un chemin dangereux dans le manifeste
  arrête tout `uninstall` et tout `init`, avant la moindre écriture, avec un
  code de sortie non nul (choix de l'agent, à confirmer par le demandeur) ;
  `removeObsolete` ignore en plus tout chemin dangereux.

- **2026-10-14 — Contrôle non exécuté** : au push et en CI, `run-checks`
  échoue dès qu'un contrôle n'a pas tourné, sauf l'audit périmé (simple
  rappel) ; au commit, le report des contrôles hors chemins reste voulu
  (QUA-013). Tranché par le demandeur, qui a retenu l'option la plus sûre.
  Conséquence relevée : les CI livrées (GitHub, GitLab) n'installent pas
  gitleaks, leur contrôle de secrets serait « non exécuté » : elles
  l'installent désormais (lot 3b).
- **2026-10-14 — Raffinement (demandeur : « oui, cette règle »)** : un
  contrôle qui devait tourner et n'a pas pu (outil absent, contrôle différé)
  échoue hors commit. Les états « non configurés » (pas de CI, aucun contrôle
  de projet déclaré, pas de dépôt git, pas de branche de référence) restent
  un avertissement visible hors CI ; en CI ils échouent aussi. Cadrage élargi
  au moteur (`.githooks/engine.mjs`, son test) et à `docs/contracts.md` (champ Tests de
  QUA-013).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — chemins de désinstallation** (fait le 2026-10-14) [IA] : valider chaque chemin du
  manifeste (relatif, sans `..`, canonique, resté sous la racine), traiter
  les liens symboliques, appliquer à `removeObsolete` et à `uninstall`.
  Critère de sortie : tests verts et aucun chemin hors dépôt supprimé.
- **Lot 2 — tests de sécurité négatifs** (fait le 2026-10-14) [IA] : manifeste malveillant,
  empreintes concordantes, `--yes`, chemins absolus, liens symboliques
  sortants. Critère de sortie : chaque cas échoue de façon explicite, test
  rattaché à un contrat.
- **Lot 3a — contrôles non exécutés** [IA] : `verify` donne déjà `ERROR`
  (`packages/drwil/src/verify.ts`) ; `run-checks` termine en succès avec un
  simple avertissement (relevé le 2026-10-14). Le faire échouer au push et en
  CI, message indiquant comment installer l'outil manquant. Critère de
  sortie : un contrôle non exécuté ne produit jamais un succès au push ni en
  CI, tests rouges sans le correctif.
- **Lot 3b — CI livrées** [IA] : installer gitleaks (version épinglée,
  empreinte vérifiée) dans les CI GitHub et GitLab du gabarit, comme le fait
  déjà la CI de ce dépôt. Critère de sortie : le contrôle de secrets tourne
  en CI dans un projet équipé.
- **Lot 4 — scope-gate** (fait le 2026-10-14) [IA] : documenter `off`, `warning` et `blocking` ;
  tester l'absence de branche de référence, de trailer `Drwil-Brief`, de
  scope et les erreurs Git, chacune avec un résultat explicite. Critère de
  sortie : tableau des modes dans la doc, un test par cas.

## 7. Reprise

- **Dernier état** (2026-10-14) : lots 1 à 4 faits (non commités : 3a, 3b, 4) ; lots 1 et 2 sur la branche
  `workstream/securiser-le-moteur` (`isSafeManifestPath`,
  `assertSafeManifest` dans `packages/drwil/src/manifest.ts`, 4 tests dans
  `packages/drwil/test/kit.test.mjs`, rouges sans le correctif).
- **Travail non commité** : voir `git status`.
- **Prochaine étape** : [IA] clôture : verify, attestation humaine, contrat sur la portée des suppressions.
