# Projet : une fiche terminée ne reste pas dans docs/projets/

**Statut** : cadré le 2026-10-10 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - .githooks/check-docs.mjs
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/fr/base/docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/en/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/fr/base/docs/projets/modele-fiche-projet.md
  - packages/drwil/templates/en/base/docs/projects/model-project-sheet.md
  - packages/drwil/templates/fr/base/docs/projets/mecanique-ia-first.md
  - packages/drwil/templates/en/base/docs/projects/kit-mechanics.md
-->

(cadrage : la détection d'une fiche terminée, le retour en CADRAGE, le
contrôle documentaire, côté dépôt et côté gabarit — QUA-018 (périmètre
explicite : dépôt drwil vs livrable gabarit) : le défaut touche les deux.)

## 1. Besoin

Décision du demandeur, le 2026-10-10 : une fiche terminée ne doit pas
« polluer » `docs/projets/`. Elle est condensée dans
`docs/projets/journal.md` puis supprimée (recette « Clôturer »).

Constat du même jour : cinq fiches terminées étaient restées en place,
toujours proposées par `/drwil-lancer` (condensées a posteriori, voir le
journal). Rien ne l'empêche : la condensation repose sur la discipline de
l'agent ; check-docs ne fait qu'avertir (QUA-015, cohérence case/statut).

Cause aggravante : la détection d'une fiche « terminée » est floue. Le
motif `STATUT_TERMINE_RE` (en double dans `.githooks/etat.mjs` et
`.githooks/check-docs.mjs`) cherche un mot (« fait », « clos »…)
**n'importe où** dans le statut : « essai réel fait » fait passer
`integration-agent-verify.md` pour terminée ; « lots 1 et 2 faits » ne
compte pas ; « fait (lot 1) » d'une fiche à plusieurs lots compterait.
Durcir un contrôle sur cette détection produirait de faux refus.

Intention :

1. une définition **explicite** de « fiche terminée » ;
2. refuser le retour `CLOTURE → CADRAGE` si la fiche active existe encore
   et se dit terminée (elle aurait dû être condensée) ;
3. une fiche terminée encore présente devient une **erreur** de
   check-docs, plus un avertissement ;
4. régler les deux cas restants : `integration-agent-verify.md`
   (probablement terminée, citée par un commentaire de
   `packages/drwil/test/kit.test.mjs`) et `mecanique-ia-first.md` (fiche
   de référence, pas un chantier, mais proposée au lancement).

## 2. Hors périmètre

- Changer la recette « Clôturer » sur le fond (condenser puis supprimer).
- Les fiches à plusieurs lots : une fiche dont un lot reste ouvert reste
  légitime (la case de l'index est cochée lot par lot).
- Le tableau de bord HTML généré (non suivi par Git).

## 3. Contraintes

- Une seule définition de « terminée », partagée par `.githooks/etat.mjs`
  et `.githooks/check-docs.mjs` (aujourd'hui dupliquée).
- Les fiches existantes doivent passer le nouveau contrôle le jour de sa
  livraison (sinon le commit qui l'introduit est lui-même refusé).
- `mecanique-ia-first.md` doit garder son bloc `cadrage` : c'est lui qui
  laisse la barrière accepter un commit sur `.githooks/` dans un projet
  équipé (QUA-016, rappel de cadrage).

## 4. Décisions

- **2026-10-10 — Une fiche terminée ne reste pas** : elle est condensée
  dans le journal puis supprimée ; empêcher la récidive par le code plutôt
  que par la discipline. [décision utilisateur]
- **2026-10-10 — Marqueur explicite** (point 5) : seul
  `**Statut** : terminé le AAAA-MM-JJ`, en tête du statut, dit qu'une
  fiche est terminée ; documenté dans le modèle de fiche. Fin du mot
  cherché n'importe où. [décision utilisateur]
- **2026-10-10 — Refus au retour en CADRAGE** (point 5) : si la fiche
  active existe encore et porte ce marqueur, `CLOTURE → CADRAGE` est
  refusé, avec la marche à suivre (condenser, supprimer). [décision
  utilisateur]
- **2026-10-10 — `mecanique-ia-first.md` exclue du lancement** (point 5) :
  un statut « référence » reconnu ; elle garde son bloc `cadrage` mais
  n'est plus proposée par `/drwil-lancer` ; copies du gabarit (fr, en)
  ajoutées au cadrage. [décision utilisateur]
- **2026-10-10 — `integration-agent-verify.md` terminée** (point 5) : à
  condenser au lot 2, commentaire de `packages/drwil/test/kit.test.mjs`
  repointé vers le journal. [décision utilisateur]

## Contrats concernés

- **QUA-015** — Chantiers exploitables à froid : l'index et les fiches ne
  listent que le travail restant.
- **QUA-011** — Doc jamais fausse : une fiche qui se dit ouverte alors
  qu'elle est finie, ou l'inverse, est une doc fausse.

## 5. Points à trancher

- ~~Les quatre points~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — détection explicite et contrôles** [IA] : définition unique
  de « terminée » ; refus du retour en CADRAGE ; erreur check-docs ;
  modèle de fiche et recette à jour ; dépôt et gabarit identiques.
  Critère de sortie : tests (fiche terminée présente → refus au retour en
  CADRAGE et erreur check-docs ; fiche à plusieurs lots ouverte → ni l'un
  ni l'autre ; « essai réel fait » n'est plus lu comme terminé) ;
  `node .githooks/run-checks.mjs` et CI verts.
- **Lot 2 — cas restants** [IA] : `integration-agent-verify.md` et
  `mecanique-ia-first.md` selon les décisions. Critère de sortie :
  `/drwil-lancer` ne propose plus que des chantiers réellement ouverts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.
