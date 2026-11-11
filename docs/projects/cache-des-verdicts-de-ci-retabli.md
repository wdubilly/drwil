# Projet : le cache de verdicts de la CI est de nouveau sauvegardé à chaque fusion

**Statut** : cadré le 2026-11-11 ; décisions D1 à D3 tranchées le 2026-11-11 (0.11.2, chantier 2 sur 8).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cache-verdicts-ci-repli.md` (cause racine relevée le 2026-11-11, voir « Existant » de la fiche)

<!-- scope
files:
  - .github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - .github/scripts/workflows-yaml.test.mjs
  - docs/contracts.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

(Le bloc `scope` couvre le workflow de ce dépôt et son gabarit livré, le test qui lit les workflows, le registre, la
carte de la mécanique du kit et les contrôles de `.drwil/ia-first.json`. La CI GitLab du gabarit télécharge son propre
artefact de verdicts : hors périmètre. Si l'implémentation montre qu'un autre fichier doit changer, l'élargissement
sera un commit séparé.)

## 1. Besoin

La reprise des verdicts en CI (QUA-250) restaure sur une PR les verdicts de la dernière CI de la branche principale.
Cause racine relevée le 2026-11-11 : chaque push sur la branche principale saute tout quand son arbre a déjà été
prouvé par la CI verte de la PR fusionnée (étape « Arbre déjà prouvé… »), **y compris l'étape « Sauvegarder les
verdicts de la branche principale »**. Le dernier cache sauvegardé date du 2026-11-08 (`gh cache list`). Chaque PR
restaure donc, par le préfixe de repli, un cache de plus en plus ancien et rejoue presque tout : 8 minutes pour la PR
#405, qui ne touchait que de la documentation.

Le projet : que la fusion d'une PR sauvegarde, pour le commit de fusion, les verdicts que la CI de cette PR a produits
sur le même arbre, sans qu'une PR relise jamais ses propres verdicts, et que l'âge du cache restauré se voie.

## Critères d'acceptation

- Un push sur la branche principale dont l'arbre est déjà prouvé par la CI verte d'une PR sauvegarde quand même le
  cache de verdicts, sous la clé du commit poussé, à partir des verdicts de cette PR ; l'arbre prouvé et l'arbre poussé
  sont comparés avant toute sauvegarde — contrat à créer
- Une PR ne restaure que des verdicts sauvegardés par la branche principale, jamais ceux d'une PR (même la sienne) —
  `QUA-250`
- Sur une PR, la CI écrit au journal le commit du cache de verdicts restauré et son retard en nombre de commits sur
  la base de la PR, sans bloquer ; l'absence de cache est dite — contrat à créer
- Une PR de documentation seule, ouverte après la fusion d'une PR précédente, ne rejoue pas les contrôles dont les
  fichiers sont inchangés : durée du job `checks` mesurée avant (8 min sur la PR #405) et après, relevée au journal de
  clôture — [humain] `QUA-013`

## Contrats modifiés

(aucun à ce stade ; si la réalisation de D1 modifie `QUA-250`, la puce s'écrit ici sur le oui du demandeur.)

## 2. Hors périmètre

- Les contrôles longs repris tant que leurs fichiers n'ont pas changé : chantier 1 (`docs/projects/controles-rejoues-reduits.md`).
- Le repli par l'API GitHub sur le dernier commit vert (écarté, D2) : une fois les sauvegardes rétablies, le préfixe prend le plus récent cache.
- La CI GitLab du gabarit.
- Le suivi de la durée de la CI et du contexte relu (`docs/intentions/suivi-ci-et-contexte.md`) : chantier à part, à cadrer ensuite.

## 3. Contraintes

- QUA-250 : une PR ne relit jamais un verdict qu'elle a écrit ; seule la branche principale sauvegarde. La sauvegarde du
  push sauté vient des verdicts de la PR fusionnée, jamais lus par cette PR.
- QUA-013 : un verdict n'est repris que sur un arbre et une configuration identiques ; sans arbre identique prouvé, rien n'est sauvegardé et tout est rejoué.
- QUA-018 (dépôt ou livrable) : le workflow est livré ; on édite le gabarit (`packages/drwil/templates/`), puis `npm run installer-depot`, dans le même commit.
- QUA-019 : aucune étape n'est désactivée ni contournée ; une sauvegarde impossible (artefact absent ou expiré) est dite et ne casse pas la CI.

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — qui écrit le cache quand le push est sauté** : le push sauvegarde quand même, à partir des verdicts de la PR
  fusionnée (l'artefact de verdicts de sa CI), clé = sha du push ; jamais lus par la PR elle-même.
  *Alternative écartée* : ne plus sauter l'étape et rejouer les contrôles (annule le gain de QUA-250).
- **D2 — repli** : pas de repli par l'API ; le préfixe suffit une fois D1 en place. *Alternative écartée* : viser le dernier commit vert par l'API.
- **D3 — visibilité** : la CI écrit au journal « cache de verdicts : commit X, N commits de retard », sans blocage.

## 5. Points à trancher

(aucun : D1 à D3 sont tranchées. Le détail technique de D1 — quel artefact porte les verdicts de la PR, retrouvé par le
même chemin que l'artefact d'arbre prouvé (commit de fusion → PR → dernier run vert) — se règle au lot 1.)

## 6. Increments

- **Lot 1 — sauvegarde au push sauté** [IA] : la CI de la PR dépose ses verdicts en artefact avec l'arbre prouvé ; le push
  sauté les retrouve par la même recherche, vérifie l'arbre et sauvegarde sous la clé du sha. Critère de sortie :
  test du workflow vert, contrat créé.
- **Lot 2 — âge du cache restauré** [IA] : après la restauration, une étape écrit le commit du cache et son retard (ou
  son absence). Critère de sortie : test du workflow vert, contrat créé.
- **Lot 3 — gabarit, documentation et mesure** [IA] : même changement dans le gabarit livré, CHANGELOG « Unreleased »
  (anglais), `kit-mechanics.md`, contrats et contrôles de `.drwil/ia-first.json` ; la mesure (cache sauvegardé à la
  première fusion, durée d'une PR de doc suivante) est relevée après la fusion, au journal.

## 7. Reprise

- **Dernier état** (2026-11-11) : fiche cadrée, D1 à D3 tranchées, prête ; rien d'implémenté.
- **Travail non commité** : cette fiche et sa ligne d'index.
- **Prochaine étape** : [IA] lot 1, au lancement de la fiche par le demandeur.
