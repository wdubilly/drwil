# Intention : un hook modifié se déclare avant le push, et le retour en SCOPING attend la CI

**Statut** : proposée le 2026-10-25 — constatée sur la PR #232 (chantier
« chaque contrôle dit combien de temps il a pris », mené sous Copilot CLI),
troisième occurrence connue après la PR #220 (journal du 2026-10-24).

**Cadrée le 2026-10-25** : `docs/projects/hooks-declares-et-scoping-apres-ci.md`
(questions tranchées par le demandeur : signal à la clôture, retour en
SCOPING après la fusion, rappel du oui du demandeur).

## Besoin

Deux trous, rencontrés ensemble sur la PR #232 :

1. **Un hook modifié n'est signalé qu'en CI.** Le rejeu par la branche
   principale (QUA-113, sur une PR, la CI rejoue les contrôles avec les
   hooks de la branche principale) remet la version de `master` de tout
   fichier de `.githooks/` que la fiche ne déclare pas dans « Contrats
   modifiés ». La PR #232 modifiait `.githooks/engine.mjs` et
   `.githooks/run-checks.mjs` sans les déclarer : rejoués avec les anciens
   hooks et leurs anciens tests, trois contrôles échouaient (QUA-029, les
   tests cités par un contrat existent et portent son ID ; la cohérence
   tests ↔ contrats ; QUA-018, dépôt et gabarit identiques). Rien ne
   l'annonce avant : ni le pre-push, ni `drwil verify`, ni
   `node .githooks/close.mjs --check`. Chaque occurrence a été corrigée
   dans la fiche, jamais à la cause.
2. **Le retour en SCOPING précède la fin de la CI.** La procédure de
   fusion automatique fait revenir en SCOPING dès la fusion programmée.
   Si la CI rougit ensuite, `node .githooks/state.mjs reopen` refuse (il
   n'est permis qu'en CLOSING) : QUA-116 (un chantier clos dont la PR
   révèle un défaut se rouvre sur sa branche) ne peut plus s'appliquer.
   Sur la PR #232, l'agent a aussi annoncé « CI verte » alors que le job
   `checks` (et donc le rejeu) tournait encore.

## Existant (relevé le 2026-10-25)

- `.githooks/base-checks.mjs` : `declarations` lit les fiches touchées par
  `base..HEAD`, une fiche supprimée à sa version d'avant suppression ; un
  fichier de test (même nom, suffixe « .test.mjs ») suit la déclaration de son module.
- Correctif appliqué sur la PR #232 : fiche restaurée avec les deux hooks
  déclarés puis retirée de nouveau, en deux commits ; rejeu local
  (`.githooks/base-checks.mjs` lu sur `master`) puis CI verts, PR fusionnée le
  2026-10-25.
- Le rejeu local se lance en 3 minutes environ
  (copie de `.githooks/base-checks.mjs` lue sur `master`, lancée avec `--base origin/master`).

## Questions à trancher

- [décision] Où signaler un hook modifié non déclaré : à `close.mjs
  --check` et à la clôture (refus), au pre-push, ou par `drwil verify` ?
  Le signal ne demande pas le rejeu complet : comparer les fichiers de
  `.githooks/` modifiés par la branche à la liste déclarée suffit.
- [décision] Le retour en SCOPING attend-il la fin de la CI (suivie par
  `gh`, comme la file de chantiers), ou `reopen` est-il permis depuis
  SCOPING tant que la PR du chantier est ouverte ?
- [décision] Déclarer un hook reste un geste validé par le demandeur
  (QUA-117, un correctif de réouverture qui change les règles du jeu attend le oui de l'humain) :
  le signal le rappelle-t-il, et sous quelle forme ?
