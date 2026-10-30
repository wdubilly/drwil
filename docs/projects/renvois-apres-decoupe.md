# Projet : des renvois justes après la découpe de `docs/ia-first.md`, et une recette livrée à jour

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/renvois-apres-decoupe.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/docs/ia-first/*.md
  - docs/ia-first/*.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/renvois-apres-decoupe.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
-->

## 1. Besoin

La découpe de `docs/ia-first.md` en sections courtes (QUA-190) a laissé des renvois qui ne mènent plus à leur
cible quand une section est lue seule : un commentaire de hook qui cite un titre disparu (« Scope gate »), des
renvois relatifs (« section 8 of this document », « below », « above ») qui sortent de leur fichier, et le
contrat de la matrice de compatibilité (QUA-063) qui vise encore le sommaire. Le test des renvois ne lit pas les
hooks, d'où le renvoi mort resté inaperçu. À côté, la recette livrée `docs/recipes/working-with-branches.md` n'a pas la puce
« This folder » (branche créée au lancement, QUA-179) que porte la copie du dépôt : un projet installé ne
l'apprend pas.

## Critères d'acceptation

- Chaque titre de section cité dans un commentaire d'un hook livré (`.githooks/` du gabarit) mène à un titre
  existant de `docs/ia-first/` — `QUA-190`
- Aucun renvoi relatif d'un fichier de `docs/ia-first/` ne sort de ce fichier : ni « this document », ni titre
  cité avec « below » ou « above » absent du même fichier — `QUA-190`
- La recette livrée `docs/recipes/working-with-branches.md` dit qu'un lancement en « This folder » crée `workstream/<fiche>`
  depuis la branche principale à jour, et quand il refuse — `QUA-179`
- QUA-063 vise le fichier qui porte la matrice de compatibilité — `QUA-063`

## Contrats modifiés

- `QUA-190` — ancien critère : « Chaque renvoi du gabarit à `docs/ia-first.md` mène à une section existante :
  … un titre cité dans un document à un titre de section » — raison : les commentaires des hooks livrés et les
  renvois relatifs internes aux sections échappaient à la preuve (validé le 2026-10-30)
- `QUA-179` — ancien critère : périmètre `.githooks/worktree.mjs`, `.githooks/state-transitions.mjs` — raison :
  la recette livrée doit dire ce que fait le lancement, prouvé par un test (validé le 2026-10-30)
- `QUA-063` — ancien critère : « `docs/ia-first.md` porte une matrice… » (Règle, Périmètre, Source de vérité,
  Couvre) — raison : la matrice est dans `docs/ia-first/6-limits-and-tool-compatibility.md` depuis la découpe ;
  la règle ne change pas (validé le 2026-10-30)
- `.githooks/scope-gate.mjs` — une ligne de commentaire remplacée : le renvoi « Scope gate » pointe vers la section de `docs/ia-first/` qui existe, sans changement de comportement (validé par le demandeur le 2026-10-30)
- `QUA-068` — ancien critère : « la matrice de `docs/ia-first.md` dit qu'un chantier s'y lance par `node .githooks/state.mjs start`… » (Règle, Périmètre, Source de vérité) — raison : même correction que QUA-063, la matrice est dans `docs/ia-first/6-limits-and-tool-compatibility.md` depuis la découpe ; la règle ne change pas (validé le 2026-10-30)
- `.drwil/ia-first.json` — `tests-qua-179` rejoue aussi `packages/drwil/test/kit.test.mjs`, devenu un fichier des Tests de QUA-179 (QUA-033 : un contrôle par règle, qui rejoue chaque fichier de ses Tests) ; `tests-qua-063` et `tests-qua-068` se déclenchent aussi sur `docs/ia-first/6-limits-and-tool-compatibility.md`, gabarit et dépôt, où vit la matrice (validé par le demandeur le 2026-10-30)

## 2. Hors périmètre

- Resserrer le contrôle `miroirs-gabarit` (un écart déclaré accepte toute différence) :
  `docs/intentions/miroirs-ecart-declare-trop-large.md`.
- Les renvois des autres documents du kit vers `docs/ia-first.md`, déjà prouvés par QUA-190.
- Réécrire le texte des règles : seuls les renvois changent.

## 3. Contraintes

- Livrable et dépôt : tout se corrige dans le gabarit (`packages/drwil/templates/`), puis `npm run
  installer-depot` ; QUA-063 n'existe que dans le registre du dépôt.
- `.githooks/scope-gate.mjs` fait 186 lignes (plafond 200) : une ligne de commentaire remplacée, sans ajout, pas de
  découpe.
- QUA-063 est attesté par l'humain (`drwil attest`, geste humain) : si le changement de **Couvre** invalide
  l'attestation, la clôture le dit et l'humain la refait ; l'agent ne l'exécute jamais.
- Les tests échouent d'abord contre l'état actuel (renvoi « Scope gate », renvois relatifs, recette sans la
  puce), puis passent après correction.

## 4. Décisions

- 2026-10-30 (demandeur) : correction dans le gabarit puis installation ; QUA-063 côté dépôt.
- 2026-10-30 (demandeur) : QUA-190 étendu aux commentaires des hooks livrés et aux renvois relatifs, prouvé par
  test, plutôt qu'une réécriture unique ou un contrat neuf.
- 2026-10-30 (demandeur) : `miroirs-gabarit` resserré dans une intention séparée.
- 2026-10-30 (demandeur) : QUA-179 étendu à la recette livrée, prouvé par un test du paquet.
- 2026-10-30 (demandeur) : les lots 1 et 2 sont livrés en un seul commit, parce que le pre-commit refuse un commit
  rouge ; le rouge du lot 1 a été constaté avant les corrections.
- 2026-10-30 (demandeur) : périmètre élargi à `.drwil/ia-first.json` (fichier propre au dépôt, sans source au
  gabarit), pour que `tests-qua-179` rejoue `packages/drwil/test/kit.test.mjs` (QUA-033).
- 2026-10-30 (demandeur) : QUA-068 inclus, même correction que QUA-063.

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — les tests d'abord** [IA] : QUA-190 étendu (titres cités dans les hooks livrés, renvois relatifs)
  et test de la recette livrée pour QUA-179, rouges contre l'état actuel ; contrats QUA-190, QUA-179 et
  QUA-063 mis à jour au registre. Critère de sortie : les nouveaux tests échouent pour la bonne raison.
- **Lot 2 — les corrections** [IA] : commentaire de `.githooks/scope-gate.mjs`, renvois des sections réécrits vers le
  fichier exact, puce « This folder » dans la recette du gabarit, installation ; changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` vert, `drwil verify --agent` en `GOVERNANCE: PASS`.
- Les lots 1 et 2 sont livrés en un seul commit (le pre-commit refuse un commit rouge ; voir Décisions).

## 7. Reprise

- **Dernier état** (2026-10-30) : en BUILD, lots 1 et 2 livrés en un seul commit, parce que le pre-commit refuse
  un commit rouge (décision du demandeur). Lot 1 : trois tests ajoutés à `packages/drwil/test/kit.test.mjs`
  (QUA-190 : titres cités dans les commentaires des hooks livrés, renvois relatifs des sections ; QUA-179 : puce
  « This folder » de la recette livrée), constatés rouges pour la bonne raison ; QUA-190, QUA-179, QUA-063 et
  QUA-068 mis à jour au registre. Lot 2 : « Scope barrier » dans l'en-tête de `.githooks/scope-gate.mjs`, renvois
  de `docs/ia-first/1-single-entry-point.md` et `docs/ia-first/7-governance-state.md` vers le fichier exact, puce « This folder » dans la
  recette du gabarit, installation, changelog ; `tests-qua-179` rejoue `packages/drwil/test/kit.test.mjs`.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] clôture.
