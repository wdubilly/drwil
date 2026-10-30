# Projet : le feu vert de publication est enregistré par l'outil au lancement, et la fiche de recette signale un squash

**Statut** : cadré le 2026-10-26, élargi le même jour (copies du dépôt des hooks et recettes du gabarit ajoutées au cadrage, sur le oui du demandeur).
**Risque** : HIGH
**Maturité** : prêt (2026-10-30 : gardée telle quelle, à lancer après `docs/projects/journal.md`)
**Intention** : `docs/intentions/cloture-et-attestations.md` (parties « le feu vert de publication enregistré par l'outil au lancement » et « la dernière version d'une fiche fusionnée par squash dans la fiche de recette »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/templates/common/optional/create-release/acceptance-sheet.mjs
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cloture-et-attestations.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .githooks/state-texts.mjs
  - .githooks/state.mjs
  - docs/recipes/create-a-release.md
  - .githooks/acceptance-sheet.mjs
  - .githooks/acceptance-sheet.test.mjs
-->

## 1. Besoin

Deux limites du module optionnel de release.

1. **Feu vert de publication.** La recette de release permet de le donner au
   lancement, en nommant la version, pour qu'une file menée par sous-agents
   publie sans s'arrêter. Mais ce n'est qu'une phrase de la demande, que
   l'agent qui orchestre transmet mot pour mot : rien ne la garde si la session
   change, rien ne l'efface une fois la release faite. La fusion automatique,
   elle, est déjà enregistrée par l'outil au lancement (`auto_merge` dans
   `.drwil/state.json` (si présent)), affichée par le rappel d'état et effacée au retour en
   SCOPING : c'est le modèle à suivre.
2. **Recette après squash.** La fiche de recette (QUA-052) lit chaque fiche de
   chantier juste avant le commit qui l'a supprimée. Avec une fusion par squash,
   ce commit est le squash lui-même : son parent garde la version du cadrage, et
   les critères corrigés pendant le chantier n'apparaissent pas corrigés. Ce
   dépôt ne fait pas de squash (fusion par commit de fusion) ; le kit livré, si.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Le feu vert de publication, donné au lancement par le sondage ou par
  `state.mjs start`, est enregistré dans l'état avec la version nommée, affiché
  par le rappel d'état, et effacé une fois la release créée ou au retour en
  SCOPING ; jamais donné par l'agent seul — contrat à créer
- Une session qui reprend un chantier lit le feu vert dans l'état, pas dans la
  demande — contrat à créer
- Quand la fiche d'un chantier est lue après une fusion par squash, la fiche de
  recette le dit (« version du cadrage, fusion par squash ») au lieu de
  présenter la version du cadrage comme la dernière — contrat à créer

## 2. Hors périmètre

- Lire la fiche au dernier commit de la PR avec `gh` : écarté le 2026-10-26, on
  signale seulement.
- Publier sur npm : le feu vert couvre une release (tag et note), jamais une
  publication npm (recette actuelle).
- Changer le mode de fusion de ce dépôt.

## 3. Contraintes

- Donner le feu vert est une décision d'acceptation : humaine seulement, même
  en mode `agent` (comme l'autorisation de fusion automatique).
- Le champ de l'état suit les règles de `auto_merge` : booléen ou version
  nommée, jamais en SCOPING, validé par `validateState`.
- Les textes existent en français et en anglais.
- Module de release optionnel : sans lui, rien ne change pour un projet.

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. Enregistrer le feu vert dans l'état au lancement, affiché par le rappel,
   effacé une fois la release créée, comme la fusion automatique.
2. Après un squash, signaler dans la fiche de recette « version du cadrage,
   fusion par squash », sans appeler `gh`.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — feu vert enregistré** [IA] : champ de l'état, sondage et `state.mjs start`, rappel d'état, effacement à la création de la release et au retour en SCOPING, recette de release (gabarit) mise à jour ; tests de `.githooks/state.test.mjs` ; contrat et contrôle `tests-qua-<id>` ; ligne « Unreleased » du changelog.
- **Lot 2 — signal de squash** [IA] : `packages/drwil/templates/common/optional/create-release/acceptance-sheet.mjs` détecte la fiche lue après un squash et le dit ; test de `packages/drwil/test/kit.test.mjs` ; contrat et contrôle. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] la lancer après `docs/projects/journal.md` (décision du 2026-10-30 : gardée telle quelle).
