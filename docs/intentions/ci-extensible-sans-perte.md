# Intention : un CI du kit que la mise à jour n'écrase pas

**Statut** : proposée le 2026-10-26.

## Besoin

Sur drwil_dbox (C++/JUCE), la montée en 0.9.0 a remplacé le fichier CI
ia-first.yml : l'étape qui installe la chaîne C++ et les dépendances Linux
de JUCE a disparu, et un job `windows-build` avec elle. Sans cette étape, les
contrôles `cmake` échouent en CI. Le demandeur veut qu'une mise à jour ne
supprime jamais ce qu'un projet a dû ajouter au CI.

## Existant

Relevé dans `packages/drwil/src/drift.ts` le 2026-10-26 : le fichier CI est
rangé avec les mécaniques « sans personnalisation légitime attendue » ;
`resolve-drift` le réécrit à l'identique du gabarit (`.bak` en sauvegarde).
Le gabarit
`packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml`
ne prévoit aucun point d'extension : ni étapes du projet avant
`run-checks`, ni inclusion d'un fichier du projet.

Contournement appliqué à drwil_dbox : le job Windows dans un workflow à part,
l'étape C++ réinjectée dans ia-first.yml (écrasée à la prochaine
`resolve-drift`).

## Questions à trancher

- [décision] Quel point d'extension : réglage de ia-first.json rendu dans
  le gabarit, fichier d'étapes du projet inclus, ou autre ?
- [décision] Le même mécanisme pour GitLab (.gitlab-ci.yml) ?
- [décision] Le contrat de jeu (QUA-113, rejeu avec les hooks de la branche
  principale) doit-il couvrir les étapes ajoutées par le projet ?
