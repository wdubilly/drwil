# Projet : sécuriser le moteur (désinstallation, contrôles non exécutés, barrière de périmètre)

**Statut** : cadré le 2026-10-14 — lots 1 et 2 faits, lots 3 et 4 à faire.
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
- **Lot 3 — contrôles non exécutés** [IA] : `verify` donne déjà `ERROR`
  (`packages/drwil/src/verify.ts`) ; prouver par test que la même règle tient
  au commit, au push et en CI, sinon la corriger. Critère de sortie : un
  contrôle bloquant non exécuté ne produit jamais un succès, à aucun point
  d'entrée.
- **Lot 4 — scope-gate** [IA] : documenter `off`, `warning` et `blocking` ;
  tester l'absence de branche de référence, de trailer `Drwil-Brief`, de
  scope et les erreurs Git, chacune avec un résultat explicite. Critère de
  sortie : tableau des modes dans la doc, un test par cas.

## 7. Reprise

- **Dernier état** (2026-10-14) : lots 1 et 2 faits sur la branche
  `workstream/securiser-le-moteur` (`isSafeManifestPath`,
  `assertSafeManifest` dans `packages/drwil/src/manifest.ts`, 4 tests dans
  `packages/drwil/test/kit.test.mjs`, rouges sans le correctif).
- **Travail non commité** : voir `git status`.
- **Prochaine étape** : [IA] lot 3 (contrôles non exécutés au commit, au
  push et en CI).
